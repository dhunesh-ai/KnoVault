/**
 * KnoVault AI — Predefined & Context-Aware Suggestion Chips
 *
 * Static base suggestions are ALWAYS visible.
 * Dynamic builders generate context-aware chips from live app data.
 */

// ── Icons mapped by chip category (Ionicons names) ──────────────────
export const CHIP_ICONS: Record<string, string> = {
  focus:        'compass-outline',
  productivity: 'bulb-outline',
  tasks:        'checkbox-outline',
  notes:        'document-text-outline',
  deadlines:    'alarm-outline',
  reminders:    'notifications-outline',
  goals:        'trophy-outline',
  birthdays:    'gift-outline',
  schedule:     'calendar-outline',
  organise:     'grid-outline',
  ideas:        'sparkles-outline',
  plan:         'map-outline',
  priority:     'flag-outline',
};

// ── Static base suggestions (ALWAYS shown) ──────────────────────────
export interface AISuggestion {
  id: string;
  label: string;
  icon: string;
  /** Category used for deduplication */
  category: string;
}

export const BASE_SUGGESTIONS: AISuggestion[] = [
  { id: 'favorites',    label: 'Show my favorites',             icon: CHIP_ICONS.notes,        category: 'favorites' },
  { id: 'productivity', label: 'Analyze my productivity',       icon: CHIP_ICONS.productivity, category: 'productivity' },
  { id: 'deadlines',    label: 'Upcoming deadlines',            icon: CHIP_ICONS.deadlines,    category: 'deadlines' },
  { id: 'focus',        label: 'Today\'s focus',                icon: CHIP_ICONS.focus,        category: 'focus' },
];

// ── Dynamic chip generators ─────────────────────────────────────────
export interface AppContextCounts {
  pendingGoals: number;
  upcomingReminders: number;
  upcomingBirthdays: number;
  recentNotes: number;
}

/**
 * Generate context-aware suggestion chips.
 * Returns ONLY relevant chips — e.g. no birthday chip when count is 0.
 */
export function buildDynamicSuggestions(ctx: AppContextCounts): AISuggestion[] {
  const dynamic: AISuggestion[] = [];

  // ── Goal-aware chips ──────────────────────────────────────────────
  if (ctx.pendingGoals > 0) {
    dynamic.push({
      id: 'goals',
      label: 'Help me finish my pending goals',
      icon: CHIP_ICONS.goals,
      category: 'goals',
    });
    dynamic.push({
      id: 'priority',
      label: 'Which task is highest priority?',
      icon: CHIP_ICONS.priority,
      category: 'priority',
    });
  } else {
    dynamic.push({
      id: 'plan',
      label: 'Help me plan my day',
      icon: CHIP_ICONS.plan,
      category: 'plan',
    });
  }

  // ── Reminder-aware chips ──────────────────────────────────────────
  if (ctx.upcomingReminders > 0) {
    dynamic.push({
      id: 'reminders',
      label: 'What reminders are upcoming?',
      icon: CHIP_ICONS.reminders,
      category: 'reminders',
    });
    dynamic.push({
      id: 'schedule',
      label: 'Organize my schedule',
      icon: CHIP_ICONS.schedule,
      category: 'schedule',
    });
  }

  // ── Birthday-aware chips ──────────────────────────────────────────
  if (ctx.upcomingBirthdays > 0) {
    dynamic.push({
      id: 'birthdays',
      label: 'Who has birthdays coming up?',
      icon: CHIP_ICONS.birthdays,
      category: 'birthdays',
    });
  }

  // ── Note-aware chips ──────────────────────────────────────────────
  if (ctx.recentNotes > 3) {
    dynamic.push({
      id: 'ideas',
      label: 'Find important ideas from my notes',
      icon: CHIP_ICONS.ideas,
      category: 'ideas',
    });
  }

  // console.log(`[DYNAMIC AI SUGGESTIONS GENERATED] ${dynamic.length} dynamic chips from context:`, ctx);
  return dynamic;
}

/**
 * Merge base + dynamic suggestions. De-duplicate by category, cap to maxVisible.
 * Base suggestions ALWAYS come first and are never filtered out.
 */
export function getMergedSuggestions(
  ctx: AppContextCounts,
  maxVisible: number = 8,
): AISuggestion[] {
  const dynamic = buildDynamicSuggestions(ctx);
  const all = [...BASE_SUGGESTIONS, ...dynamic];

  // De-duplicate by category (first occurrence wins)
  const seen = new Set<string>();
  const unique = all.filter((s) => {
    if (seen.has(s.category)) return false;
    seen.add(s.category);
    return true;
  });

  // console.log(`[AI SUGGESTIONS GENERATED] Total: ${unique.length}, Shown: ${Math.min(unique.length, maxVisible)}`);
  return unique.slice(0, maxVisible);
}
