/**
 * KnoVault AI — Intent Detection Engine
 * 
 * Detects the user's intent from their message and extracts
 * note references, keywords, and action types.
 * 
 * Future-ready: can be replaced with an ML classifier or embedding-based router.
 */

export type AIIntent =
  | 'summarize_note'
  | 'explain_note'
  | 'search_note'
  | 'open_note'
  | 'favorite_notes'
  | 'list_notes'
  | 'create_note'
  | 'create_reminder'
  | 'create_special_day'
  | 'goal_query'
  | 'project_query'
  | 'productivity_analysis'
  | 'special_days_query'
  | 'reminder_query'
  | 'general_chat';

export interface DetectedIntent {
  intent: AIIntent;
  /** Extracted note title reference (if any) */
  noteReference: string | null;
  /** Extracted keywords for fuzzy search */
  keywords: string[];
  /** Whether the query needs full note content */
  needsNoteContent: boolean;
  /** Whether this is a follow-up to a previous message */
  isFollowUp: boolean;
}

// ── Pattern definitions ──────────────────────────────────────────────

const SUMMARIZE_PATTERNS = [
  /summarize?\s+(my\s+)?(.+?)(\s+note)?$/i,
  /summary\s+of\s+(my\s+)?(.+?)(\s+note)?$/i,
  /give\s+(me\s+)?(a\s+)?summary\s+of\s+(my\s+)?(.+?)(\s+note)?$/i,
  /tldr\s+of\s+(my\s+)?(.+?)(\s+note)?$/i,
];

const EXPLAIN_PATTERNS = [
  /what('s|s|\s+is)\s+(in|inside)\s+(my\s+)?(.+?)(\s+note)?$/i,
  /explain\s+(my\s+)?(.+?)(\s+note)?$/i,
  /tell\s+me\s+about\s+(my\s+)?(.+?)(\s+note)?$/i,
  /show\s+(me\s+)?(my\s+)?(.+?)(\s+note)\s*$/i,
  /what\s+does\s+(my\s+)?(.+?)(\s+note)?\s+(say|contain|have)/i,
  /read\s+(my\s+)?(.+?)(\s+note)?$/i,
];

const SEARCH_PATTERNS = [
  /find\s+(the\s+)?(note|notes)\s+(where|with|containing|that)\s+(.+)/i,
  /search\s+(my\s+)?(notes?\s+)?(for\s+)?(.+)/i,
  /which\s+note\s+(has|contains?|saved?)\s+(.+)/i,
  /where\s+did\s+i\s+(save|write|store|put|keep)\s+(.+)/i,
  /find\s+(.+?)\s+(in\s+my\s+notes|note)/i,
];

const OPEN_PATTERNS = [
  /open\s+(my\s+)?(.+?)(\s+note)?$/i,
  /go\s+to\s+(my\s+)?(.+?)(\s+note)?$/i,
  /navigate\s+to\s+(my\s+)?(.+?)(\s+note)?$/i,
];

const LINK_PATTERNS = [
  /what\s+(link|url|website)\s+(is\s+)?(in|inside)\s+(my\s+)?(.+?)(\s+note)?$/i,
  /show\s+(me\s+)?(the\s+)?(link|url)\s+(in|from)\s+(my\s+)?(.+?)(\s+note)?$/i,
  /find\s+(the\s+)?(link|url)\s+(in|from|inside)\s+(my\s+)?(.+?)(\s+note)?$/i,
];

const FAVORITE_PATTERNS = [
  /\b(fav(ou?rite)?s?)\b.*\bnotes?\b/i,
  /\bnotes?\b.*\b(fav(ou?rite)?s?)\b/i,
  /show\s+(my\s+)?fav(ou?rite)?s?\b/i,
  /what\s+are\s+my\s+fav(ou?rite)?s?\b/i,
  /list\s+(my\s+)?fav(ou?rite)?/i,
];

const GOAL_PATTERNS = [
  /\b(goals?|tasks?|todo|to-do)\b/i,
  /what\s+should\s+i\s+(focus|do|work)\b/i,
  /pending\s+(goals?|tasks?)/i,
  /incomplete\s+(goals?|tasks?)/i,
];

const PROJECT_PATTERNS = [
  /\bprojects?\b/i,
  /\bdeadlines?\b/i,
  /what('s|s|\s+is)\s+due\b/i,
];

const SPECIAL_DAYS_PATTERNS = [
  /\b(birthday|birthdays|anniversary|anniversaries|special\s+day|celebration|festival)\b/i,
  /who\s+has\s+(a\s+)?birthday/i,
  /upcoming\s+(special|important)\s+days?/i,
  /what\s+special\s+days/i,
];

const REMINDER_PATTERNS = [
  /\breminders?\b/i,
  /\bcalendar\s+(event|entry)/i,
  /what('s|s|\s+is)\s+on\s+my\s+calendar/i,
  /upcoming\s+events?/i,
];

const CREATE_REMINDER_PATTERNS = [
  /\bcreate\s+(a\s+)?reminder\b/i,
  /\bremind\s+me\b/i,
  /\bset\s+(a\s+)?reminder\b/i,
  /\badd\s+(a\s+)?reminder\b/i,
];

const CREATE_SPECIAL_DAY_PATTERNS = [
  /\bcreate\s+(a\s+)?(birthday|special\s+day|anniversary)\b/i,
  /\badd\s+(a\s+)?(birthday|special\s+day|anniversary)\b/i,
  /\bsave\s+(a\s+)?(birthday|special\s+day|anniversary)\b/i,
];

const PRODUCTIVITY_PATTERNS = [
  /\b(productivity|performance|progress|stats|statistics|streak)\b/i,
  /how\s+(am\s+i|i\s+am)\s+doing\b/i,
  /analyze\s+(my\s+)?productivity/i,
];

const FOLLOW_UP_PATTERNS = [
  /^(what about|and|also|more|details?|tell me more|elaborate|expand)/i,
  /\b(the\s+)?(second|third|first|last|other)\s+one\b/i,
  /\bwhen\s+is\s+it\b/i,
  /\bthere\b.*\?(what|which|when|where)/i,
  /^(it|that|this|those|these)\b/i,
];

// ── Extract note name from a matched pattern ────────────────────────

function extractNoteNameFromPatterns(message: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      // Walk capture groups from right to left, pick the first meaningful one
      for (let i = match.length - 1; i >= 1; i--) {
        const group = match[i];
        if (group && !['my', 'a', 'the', 'me', 'note', 'notes', 'in', 'inside', 'of'].includes(group.trim().toLowerCase())) {
          // Clean up the extracted name
          let cleaned = group.trim()
            .replace(/\s*note\s*$/i, '')
            .replace(/^(my|the|a)\s+/i, '')
            .trim();
          if (cleaned.length > 0) return cleaned;
        }
      }
    }
  }
  return null;
}

function extractSearchKeywords(message: string): string[] {
  // Remove common stop words and extract meaningful keywords
  const stopWords = new Set([
    'a', 'an', 'the', 'my', 'me', 'i', 'is', 'in', 'inside', 'of', 'to', 'for',
    'what', 'where', 'which', 'who', 'how', 'when', 'do', 'does', 'did', 'have',
    'has', 'had', 'show', 'find', 'search', 'get', 'give', 'tell', 'note', 'notes',
    'can', 'you', 'please', 'about', 'with', 'that', 'this', 'are', 'was', 'were',
    'be', 'been', 'being', 'it', 'its', 'and', 'or', 'but', 'not', 'from', 'at',
    'on', 'by', 'up', 'out', 'if', 'into', 'through', 'during', 'before', 'after',
    'all', 'any', 'some', 'no', 'am', 'there', 'their', 'then', 'than', 'so',
    'summarize', 'summary', 'explain', 'read', 'open', 'go', 'navigate',
  ]);
  
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));
}

// ── Main detection function ──────────────────────────────────────────

export function detectIntent(message: string): DetectedIntent {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // Check for follow-up
  const isFollowUp = FOLLOW_UP_PATTERNS.some(p => p.test(trimmed));

  // ── Link queries (check before explain since they're more specific) ──
  const linkNoteName = extractNoteNameFromPatterns(trimmed, LINK_PATTERNS);
  if (linkNoteName) {
    return {
      intent: 'explain_note',
      noteReference: linkNoteName,
      keywords: extractSearchKeywords(trimmed),
      needsNoteContent: true,
      isFollowUp,
    };
  }

  // ── Summarize ──
  const summarizeNoteName = extractNoteNameFromPatterns(trimmed, SUMMARIZE_PATTERNS);
  if (summarizeNoteName) {
    return {
      intent: 'summarize_note',
      noteReference: summarizeNoteName,
      keywords: extractSearchKeywords(trimmed),
      needsNoteContent: true,
      isFollowUp,
    };
  }

  // ── Explain / read / show note content ──
  const explainNoteName = extractNoteNameFromPatterns(trimmed, EXPLAIN_PATTERNS);
  if (explainNoteName) {
    return {
      intent: 'explain_note',
      noteReference: explainNoteName,
      keywords: extractSearchKeywords(trimmed),
      needsNoteContent: true,
      isFollowUp,
    };
  }

  // ── Open note ──
  const openNoteName = extractNoteNameFromPatterns(trimmed, OPEN_PATTERNS);
  if (openNoteName) {
    return {
      intent: 'open_note',
      noteReference: openNoteName,
      keywords: extractSearchKeywords(trimmed),
      needsNoteContent: false,
      isFollowUp,
    };
  }

  // ── Search notes ──
  if (SEARCH_PATTERNS.some(p => p.test(trimmed))) {
    return {
      intent: 'search_note',
      noteReference: null,
      keywords: extractSearchKeywords(trimmed),
      needsNoteContent: true,
      isFollowUp,
    };
  }

  // ── Favorite notes ──
  if (FAVORITE_PATTERNS.some(p => p.test(trimmed))) {
    return {
      intent: 'favorite_notes',
      noteReference: null,
      keywords: [],
      needsNoteContent: false,
      isFollowUp,
    };
  }

  // ── Create reminder ──
  if (CREATE_REMINDER_PATTERNS.some(p => p.test(trimmed))) {
    return {
      intent: 'create_reminder',
      noteReference: null,
      keywords: extractSearchKeywords(trimmed),
      needsNoteContent: false,
      isFollowUp,
    };
  }

  // ── Create special day ──
  if (CREATE_SPECIAL_DAY_PATTERNS.some(p => p.test(trimmed))) {
    return {
      intent: 'create_special_day',
      noteReference: null,
      keywords: extractSearchKeywords(trimmed),
      needsNoteContent: false,
      isFollowUp,
    };
  }

  // ── Productivity analysis ──
  if (PRODUCTIVITY_PATTERNS.some(p => p.test(trimmed))) {
    return {
      intent: 'productivity_analysis',
      noteReference: null,
      keywords: [],
      needsNoteContent: false,
      isFollowUp,
    };
  }

  // ── Special days ──
  if (SPECIAL_DAYS_PATTERNS.some(p => p.test(trimmed))) {
    return {
      intent: 'special_days_query',
      noteReference: null,
      keywords: [],
      needsNoteContent: false,
      isFollowUp,
    };
  }

  // ── Goal queries ──
  if (GOAL_PATTERNS.some(p => p.test(trimmed))) {
    return {
      intent: 'goal_query',
      noteReference: null,
      keywords: [],
      needsNoteContent: false,
      isFollowUp,
    };
  }

  // ── Project queries ──
  if (PROJECT_PATTERNS.some(p => p.test(trimmed))) {
    return {
      intent: 'project_query',
      noteReference: null,
      keywords: [],
      needsNoteContent: false,
      isFollowUp,
    };
  }

  // ── Reminder queries ──
  if (REMINDER_PATTERNS.some(p => p.test(trimmed))) {
    return {
      intent: 'reminder_query',
      noteReference: null,
      keywords: [],
      needsNoteContent: false,
      isFollowUp,
    };
  }

  // ── General chat fallback ──
  return {
    intent: 'general_chat',
    noteReference: null,
    keywords: extractSearchKeywords(trimmed),
    needsNoteContent: false,
    isFollowUp,
  };
}
