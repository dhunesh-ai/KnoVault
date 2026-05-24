/**
 * Important Day utility functions for KnoVault
 */

export const getMonthDay = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}-${day}`;
};

/**
 * Calculates days remaining until the important day.
 * If recurring, calculates days to the next annual occurrence.
 * If not recurring, calculates days to the exact date.
 */
export const calculateDaysRemaining = (eventDateStr: string, isRecurring = true) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDate = new Date(eventDateStr);
  eventDate.setHours(0, 0, 0, 0);

  if (!isRecurring) {
    const diffTime = eventDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Recurring
  const nextOccur = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  if (nextOccur < today) {
    nextOccur.setFullYear(today.getFullYear() + 1);
  }
  
  const diffTime = nextOccur.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isImportantDayToday = (eventDateStr: string, isRecurring = true) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(eventDateStr);
  eventDate.setHours(0, 0, 0, 0);

  if (!isRecurring) {
    return today.getTime() === eventDate.getTime();
  }

  const todayMD = getMonthDay(today);
  const eventMD = getMonthDay(eventDate);
  return todayMD === eventMD;
};

/**
 * Sorts important days by nearest upcoming occurrence.
 */
export const sortImportantDaysByUpcoming = (importantDays: any[]) => {
  return [...importantDays].sort((a, b) => {
    const dateA = a.date || a.birth_date;
    const isRecA = a.is_recurring !== undefined ? a.is_recurring : true;
    const daysA = calculateDaysRemaining(dateA, isRecA);

    const dateB = b.date || b.birth_date;
    const isRecB = b.is_recurring !== undefined ? b.is_recurring : true;
    const daysB = calculateDaysRemaining(dateB, isRecB);

    if (daysA < 0 && daysB >= 0) return 1;
    if (daysB < 0 && daysA >= 0) return -1;
    return daysA - daysB;
  });
};

// Legacy compatibility
export const isSpecialDayToday = isImportantDayToday;
export const isBirthdayToday = isImportantDayToday;
export const sortSpecialDaysByUpcoming = sortImportantDaysByUpcoming;
export const sortBirthdaysByUpcoming = sortImportantDaysByUpcoming;
