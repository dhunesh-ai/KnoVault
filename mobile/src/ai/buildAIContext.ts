/**
 * KnoVault AI — Context Builder
 * 
 * Builds the full productivity context for the AI, including:
 * - Note metadata with content previews
 * - Favorite notes
 * - Daily goals & stats
 * - Active projects & deadlines
 * - Special days
 * - Reminders/calendar
 * 
 * Note: Uses in-memory caching with a 5-minute TTL to ensure
 * sending AI messages is instant (< 200ms) with ZERO pre-send HTTP latency.
 */

import { notesApi } from '../api/notes';
import { goalsApi } from '../api/goals';
import { projectsApi } from '../api/projects';
import { importantDaysApi } from '../api/important_days';
import { remindersApi } from '../api/reminders';

let cachedContext: string | null = null;
let lastBuildTime = 0;
const CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Strip HTML to plain text */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export const invalidateAIContextCache = () => {
  cachedContext = null;
  lastBuildTime = 0;
};

export const buildAIContext = async (forceRefresh = false): Promise<string> => {
  const now = Date.now();
  if (!forceRefresh && cachedContext && now - lastBuildTime < CONTEXT_CACHE_TTL_MS) {
    console.log('[AI Context Builder] Returning cached context (0ms latency)');
    return cachedContext;
  }

  try {
    console.log('[AI Context Builder] Fetching fresh context metadata...');
    const [notes, goals, goalStats, projects, importantDays, reminders] = await Promise.allSettled([
      notesApi.getNotes(),
      goalsApi.getGoals(),
      goalsApi.getGoalStats(),
      projectsApi.getProjects(),
      importantDaysApi.getImportantDays(),
      remindersApi.getUpcomingReminders(15)
    ]);

    let context = "USER PRODUCTIVITY CONTEXT:\n\n";

    // ── Notes Context (with content previews) ──
    if (notes.status === 'fulfilled' && notes.value) {
      const allNotes = notes.value;
      const secureNotesCount = allNotes.filter((n: any) => n.is_secure || n.category === 'Secure').length;
      const nonSecureNotes = allNotes.filter((n: any) => !n.is_secure && n.category !== 'Secure');
      const favoriteNotes = nonSecureNotes.filter((n: any) => n.is_favorite);
      const recentNotes = nonSecureNotes.slice(0, 8);

      context += `NOTES OVERVIEW: ${nonSecureNotes.length} accessible notes, ${secureNotesCount} secure (hidden)\n\n`;

      if (favoriteNotes.length > 0) {
        context += "FAVORITE NOTES:\n";
        favoriteNotes.forEach((n: any) => {
          const preview = n.content ? stripHtml(n.content).substring(0, 120) : 'No content';
          context += `- ⭐ "${n.title}" [${n.category || 'General'}] — ${preview}\n`;
        });
        context += "\n";
      }

      if (recentNotes.length > 0) {
        context += "ALL NOTES (with previews):\n";
        recentNotes.forEach((n: any) => {
          const preview = n.content ? stripHtml(n.content).substring(0, 100) : 'No content';
          const favMark = n.is_favorite ? '⭐' : '';
          context += `- ${favMark}"${n.title}" [${n.category || 'General'}] — ${preview}\n`;
        });
        context += "\n";
      }
    }

    // ── Goals Context ──
    if (goals.status === 'fulfilled' && goals.value) {
      const allGoals = goals.value;
      const pending = allGoals.filter((g: any) => !g.completed);
      const completed = allGoals.filter((g: any) => g.completed);
      
      context += "DAILY GOALS:\n";
      context += `Completed: ${completed.length}, Pending: ${pending.length}\n`;
      if (pending.length > 0) {
        context += "Pending Goals:\n";
        pending.forEach((g: any) => {
          context += `- ☐ ${g.title}\n`;
        });
      }
      if (completed.length > 0) {
        context += "Completed Goals:\n";
        completed.forEach((g: any) => {
          context += `- ☑ ${g.title}\n`;
        });
      }
      context += "\n";
    }

    // ── Productivity Stats ──
    if (goalStats.status === 'fulfilled' && goalStats.value) {
      const stats = goalStats.value;
      context += "PRODUCTIVITY STATS:\n";
      context += `- Today's Completion: ${stats.today_percentage}%\n`;
      context += `- Today: ${stats.today_completed}/${stats.today_total} goals done\n`;
      context += `- Current Streak: ${stats.streak ?? 0} days\n`;
      context += `- All Time: ${stats.all_completed}/${stats.all_total} goals completed\n`;
      context += `- Success Rate: ${stats.success_rate}%\n\n`;
    }

    // ── Projects Context ──
    if (projects.status === 'fulfilled' && projects.value) {
      const allProjects = projects.value;
      const activeProjects = allProjects.filter((p: any) => p.status === 'Active');
      const completedProjects = allProjects.filter((p: any) => p.status === 'Completed');
      
      if (activeProjects.length > 0) {
        context += `ACTIVE PROJECTS (${activeProjects.length}):\n`;
        activeProjects.forEach((p: any) => {
          const deadline = p.deadline ? `Due: ${p.deadline}` : "No deadline";
          const progress = p.progress !== undefined ? `${p.progress}% complete` : "";
          context += `- "${p.title}" — ${deadline} ${progress}\n`;
          if (p.description) {
            context += `  Description: ${p.description.substring(0, 100)}\n`;
          }
        });
        context += "\n";
      }
      
      if (completedProjects.length > 0) {
        context += `Completed Projects: ${completedProjects.length}\n\n`;
      }
    }

    // ── Special Days Context ──
    if (importantDays.status === 'fulfilled' && importantDays.value) {
      const days = importantDays.value;
      if (days.length > 0) {
        context += `UPCOMING SPECIAL DAYS (${days.length}):\n`;
        days.slice(0, 8).forEach((d: any) => {
          context += `- [${d.type}] ${d.title} on ${d.date}`;
          if (d.is_recurring) context += ' (Recurring yearly)';
          context += '\n';
        });
        context += "\n";
      }
    }

    // ── Reminders Context ──
    if (reminders.status === 'fulfilled' && reminders.value) {
      const activeReminders = reminders.value.filter((r: any) => !r.is_completed);
      if (activeReminders.length > 0) {
        context += `UPCOMING REMINDERS (${activeReminders.length}):\n`;
        activeReminders.slice(0, 8).forEach((r: any) => {
          context += `- "${r.title}" at ${r.reminder_date}\n`;
        });
        context += "\n";
      }
    }

    cachedContext = context.trim();
    lastBuildTime = now;
    return cachedContext;
  } catch (error) {
    console.warn("[AI Context Builder] Failed to build complete context", error);
    return cachedContext || "USER PRODUCTIVITY CONTEXT: Ready.";
  }
};
