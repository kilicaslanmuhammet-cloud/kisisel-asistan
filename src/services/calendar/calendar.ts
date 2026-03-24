import axios from 'axios';
import { CalendarEvent } from '../../types';
import { getGoogleAccessToken } from '../firebase/auth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Bugünkü etkinlikleri çek
export const fetchTodayEvents = async (): Promise<CalendarEvent[]> => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  return fetchCalendarEvents(startOfDay, endOfDay);
};

// Belirli tarih aralığındaki etkinlikleri çek
export const fetchCalendarEvents = async (
  startDate: Date,
  endDate: Date,
  calendarId = 'primary'
): Promise<CalendarEvent[]> => {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error('Calendar erişim tokeni bulunamadı');

  const response = await axios.get(`${CALENDAR_API_BASE}/calendars/${calendarId}/events`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    },
  });

  return (response.data.items || []).map(mapGoogleEventToCalendarEvent);
};

// Haftalık etkinlikleri çek
export const fetchWeekEvents = async (): Promise<CalendarEvent[]> => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return fetchCalendarEvents(startOfWeek, endOfWeek);
};

// Google Calendar etkinliğini uygulama formatına çevir
const mapGoogleEventToCalendarEvent = (event: any): CalendarEvent => {
  const isAllDay = !!event.start?.date;
  const startTime = isAllDay
    ? new Date(event.start.date)
    : new Date(event.start.dateTime);
  const endTime = isAllDay
    ? new Date(event.end.date)
    : new Date(event.end.dateTime);

  return {
    id: event.id,
    title: event.summary || 'Başlıksız',
    description: event.description,
    startTime,
    endTime,
    location: event.location,
    attendees: event.attendees?.map((a: any) => a.email) || [],
    isAllDay,
    source: 'google',
    meetingLink:
      event.hangoutLink ||
      event.conferenceData?.entryPoints?.[0]?.uri,
  };
};

// Etkinlik oluştur
export const createCalendarEvent = async (params: {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  location?: string;
}): Promise<CalendarEvent> => {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error('Calendar erişim tokeni bulunamadı');

  const eventData: any = {
    summary: params.title,
    description: params.description,
    start: { dateTime: params.startTime.toISOString(), timeZone: 'Europe/Istanbul' },
    end: { dateTime: params.endTime.toISOString(), timeZone: 'Europe/Istanbul' },
    location: params.location,
  };

  if (params.attendees?.length) {
    eventData.attendees = params.attendees.map((email) => ({ email }));
  }

  const response = await axios.post(
    `${CALENDAR_API_BASE}/calendars/primary/events`,
    eventData,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  return mapGoogleEventToCalendarEvent(response.data);
};

// Takvim listesini çek
export const fetchCalendarList = async (): Promise<{ id: string; name: string }[]> => {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return [];

  const response = await axios.get(`${CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return (response.data.items || []).map((cal: any) => ({
    id: cal.id,
    name: cal.summary,
  }));
};
