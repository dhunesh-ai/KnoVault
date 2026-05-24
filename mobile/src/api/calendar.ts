import apiClient from './client';

export interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  color: string;
  original_id: number;
  time?: string;
  description?: string;
  notes?: string;
}

export interface CalendarEventsResponse {
  [date: string]: CalendarEvent[];
}

export const calendarApi = {
  // Query Key: ['calendar-events']
  getCalendarEvents: async (month: number, year: number, tzOffset: number = new Date().getTimezoneOffset()) => {
    const url = '/api/calendar/events';
    console.log("[API REQUEST]", url, { month, year, tzOffset });
    const response = await apiClient.get<CalendarEventsResponse>(url, {
      params: { month, year, tz_offset: tzOffset }
    });
    console.log("[API RESPONSE]", url, Object.keys(response.data).length, "dates found");
    return response.data;
  }
};
