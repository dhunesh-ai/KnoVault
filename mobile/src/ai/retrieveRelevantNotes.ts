/**
 * KnoVault AI — Smart Note Retrieval Engine
 * 
 * Intelligently retrieves ONLY the relevant notes for a given user query.
 * Prevents flooding the LLM context with entire database dumps.
 * 
 * Search pipeline:
 *   1. Exact title match
 *   2. Partial / fuzzy title match
 *   3. Content keyword search
 *   4. Tag / category match
 *   5. URL / link search
 * 
 * Future-ready: can be extended with embeddings / vector search.
 */

import { notesApi } from '../api/notes';
import type { Note } from '../types/notes';
import type { DetectedIntent } from './intentDetector';

// ── Helpers ──────────────────────────────────────────────────────────

/** Strip HTML tags to get plain text for search */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize a string for fuzzy matching */
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

/** Calculate a simple similarity score between two normalized strings (0-1) */
function similarityScore(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  
  // Exact match
  if (normA === normB) return 1.0;
  
  // One contains the other
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;
  
  // Word overlap score
  const wordsA = new Set(normA.split(/\s+/));
  const wordsB = new Set(normB.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  
  if (union.size === 0) return 0;
  return intersection.length / union.size;
}

/** Extract URLs from text */
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  return text.match(urlRegex) || [];
}

/** Get searchable plain text from a note */
function getNoteSearchableText(note: Note): string {
  let text = note.title + ' ';
  
  // Standard content
  if (note.content) {
    text += stripHtml(note.content) + ' ';
  }
  if (note.content_html) {
    text += stripHtml(note.content_html) + ' ';
  }
  
  // Checklist items
  if (note.checklist_items?.length) {
    text += note.checklist_items.map(i => i.text).join(' ') + ' ';
  }
  
  // Field notes
  if (note.field_notes?.length) {
    text += note.field_notes.map(f => `${f.label} ${f.value}`).join(' ') + ' ';
  }
  
  // Tags
  if (note.tags?.length) {
    text += note.tags.join(' ') + ' ';
  }
  
  // Category
  if (note.category) {
    text += note.category;
  }
  
  return text;
}

/** Format a single note for AI context injection */
function formatNoteForContext(note: Note, includeFullContent: boolean = true): string {
  let formatted = `\n═══ NOTE: "${note.title}" ═══\n`;
  formatted += `Category: ${note.category || 'General'}\n`;
  formatted += `Type: ${note.note_type}\n`;
  formatted += `Favorite: ${note.is_favorite ? 'Yes ⭐' : 'No'}\n`;
  
  if (note.tags?.length) {
    formatted += `Tags: ${note.tags.join(', ')}\n`;
  }
  
  if (includeFullContent) {
    // Standard note content
    const plainContent = note.content ? stripHtml(note.content) : '';
    if (plainContent) {
      // Limit to 2000 chars to avoid token overflow
      const truncated = plainContent.length > 2000 
        ? plainContent.substring(0, 2000) + '... [truncated]' 
        : plainContent;
      formatted += `\nCONTENT:\n${truncated}\n`;
    }
    
    // Checklist items
    if (note.checklist_items?.length) {
      formatted += '\nCHECKLIST:\n';
      note.checklist_items.forEach(item => {
        formatted += `${item.completed ? '☑' : '☐'} ${item.text}\n`;
      });
    }
    
    // Field notes
    if (note.field_notes?.length) {
      formatted += '\nFIELD DATA:\n';
      note.field_notes.forEach(field => {
        formatted += `${field.label}: ${field.value}\n`;
      });
    }
    
    // Extract and display URLs/links
    const allText = getNoteSearchableText(note);
    const urls = extractUrls(allText);
    if (urls.length > 0) {
      formatted += `\nLINKS FOUND:\n`;
      urls.forEach(url => {
        formatted += `- ${url}\n`;
      });
    }
  }
  
  formatted += `═══════════════════════════\n`;
  return formatted;
}

// ── Search scoring ───────────────────────────────────────────────────

interface ScoredNote {
  note: Note;
  score: number;
  matchReason: string;
}

function scoreNote(note: Note, intent: DetectedIntent): ScoredNote {
  let score = 0;
  let matchReason = '';
  const searchText = getNoteSearchableText(note).toLowerCase();
  
  // ── Title match (highest priority) ──
  if (intent.noteReference) {
    const titleSim = similarityScore(note.title, intent.noteReference);
    if (titleSim >= 0.9) {
      score += 100;
      matchReason = 'exact title match';
    } else if (titleSim >= 0.5) {
      score += 60;
      matchReason = 'partial title match';
    } else if (normalize(note.title).includes(normalize(intent.noteReference))) {
      score += 70;
      matchReason = 'title contains reference';
    }
  }
  
  // ── Keyword content match ──
  if (intent.keywords.length > 0) {
    let keywordHits = 0;
    for (const keyword of intent.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        keywordHits++;
      }
    }
    if (keywordHits > 0) {
      const keywordScore = (keywordHits / intent.keywords.length) * 40;
      score += keywordScore;
      if (!matchReason) matchReason = `${keywordHits} keyword match(es)`;
    }
  }
  
  // ── Bonus: favorite notes get a small boost ──
  if (note.is_favorite) {
    score += 5;
  }
  
  // ── Bonus: recently updated ──
  const daysSinceUpdate = (Date.now() - new Date(note.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 7) {
    score += 3;
  }
  
  return { note, score, matchReason };
}

// ── Main retrieval function ──────────────────────────────────────────

export interface RetrievalResult {
  /** Formatted context string ready to inject into the AI prompt */
  noteContext: string;
  /** Number of notes retrieved */
  retrievedCount: number;
  /** IDs of matched notes (for potential "open" actions) */
  matchedNoteIds: number[];
}

export async function retrieveRelevantNotes(
  intent: DetectedIntent,
  previousNoteContext?: string,
): Promise<RetrievalResult> {
  try {
    // If this is a follow-up and we have previous context, reuse it
    if (intent.isFollowUp && previousNoteContext) {
      return {
        noteContext: previousNoteContext,
        retrievedCount: 0,
        matchedNoteIds: [],
      };
    }
    
    // If intent doesn't need note content, return empty
    if (!intent.needsNoteContent && intent.intent !== 'favorite_notes' && intent.intent !== 'open_note') {
      return { noteContext: '', retrievedCount: 0, matchedNoteIds: [] };
    }
    
    // Fetch all non-secure notes
    const allNotes = await notesApi.getNotes();
    const accessibleNotes = allNotes.filter(n => !n.is_secure && n.category !== 'Secure');
    
    // ── Favorite notes intent ──
    if (intent.intent === 'favorite_notes') {
      const favorites = accessibleNotes.filter(n => n.is_favorite);
      if (favorites.length === 0) {
        return {
          noteContext: '\n[No favorite notes found]\n',
          retrievedCount: 0,
          matchedNoteIds: [],
        };
      }
      let ctx = '\nFAVORITE NOTES WITH CONTENT:\n';
      favorites.forEach(n => {
        ctx += formatNoteForContext(n, true);
      });
      return {
        noteContext: ctx,
        retrievedCount: favorites.length,
        matchedNoteIds: favorites.map(n => n.id),
      };
    }
    
    // ── Score and rank notes ──
    const scored: ScoredNote[] = accessibleNotes
      .map(n => scoreNote(n, intent))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);
    
    // Take top matches (max 3 to keep context manageable)
    const topMatches = scored.slice(0, 3);
    
    if (topMatches.length === 0) {
      // If intent references a note but we found nothing, try broader keyword search
      if (intent.noteReference || intent.keywords.length > 0) {
        const searchTerms = intent.noteReference 
          ? [intent.noteReference, ...intent.keywords]
          : intent.keywords;
        
        // Broad search through all content
        const broadMatches = accessibleNotes.filter(note => {
          const text = getNoteSearchableText(note).toLowerCase();
          return searchTerms.some(term => text.includes(term.toLowerCase()));
        }).slice(0, 3);
        
        if (broadMatches.length > 0) {
          let ctx = '\nRELEVANT NOTES FOUND:\n';
          broadMatches.forEach(n => {
            ctx += formatNoteForContext(n, true);
          });
          return {
            noteContext: ctx,
            retrievedCount: broadMatches.length,
            matchedNoteIds: broadMatches.map(n => n.id),
          };
        }
      }
      
      return {
        noteContext: intent.noteReference
          ? `\n[No note found matching "${intent.noteReference}". Available notes: ${accessibleNotes.map(n => n.title).join(', ')}]\n`
          : '',
        retrievedCount: 0,
        matchedNoteIds: [],
      };
    }
    
    // Build context from top matches
    let ctx = '\nRETRIEVED NOTES:\n';
    topMatches.forEach(({ note, matchReason }) => {
      ctx += formatNoteForContext(note, true);
    });
    
    return {
      noteContext: ctx,
      retrievedCount: topMatches.length,
      matchedNoteIds: topMatches.map(s => s.note.id),
    };
  } catch (error) {
    console.warn('[Note Retrieval] Failed:', error);
    return { noteContext: '', retrievedCount: 0, matchedNoteIds: [] };
  }
}
