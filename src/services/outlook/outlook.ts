import axios from 'axios';
import { Mail, CalendarEvent } from '../../types';
import * as SecureStore from 'expo-secure-store';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com';
const SECURE_STORE_KEY = 'microsoft_access_token';

// Outlook maillerini çek
export const fetchOutlookMessages = async (maxResults = 20): Promise<Mail[]> => {
  const accessToken = await getMicrosoftAccessToken();
  if (!accessToken) throw new Error('Microsoft erişim tokeni bulunamadı');

  const response = await axios.get(`${GRAPH_API_BASE}/me/messages`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      $top: maxResults,
      $filter: 'isRead eq false',
      $select: 'id,subject,from,toRecipients,body,receivedDateTime,importance,isRead',
      $orderby: 'receivedDateTime desc',
    },
  });

  return (response.data.value || []).map(mapOutlookMessageToMail);
};

// Outlook mesajını uygulama formatına çevir
const mapOutlookMessageToMail = (message: any): Mail => ({
  id: message.id,
  from: message.from?.emailAddress?.address || '',
  to: message.toRecipients?.map((r: any) => r.emailAddress.address) || [],
  subject: message.subject || '',
  body: message.body?.content || '',
  date: new Date(message.receivedDateTime),
  isRead: message.isRead,
  source: 'outlook',
  importance: message.importance === 'high' ? 'high' : message.importance === 'low' ? 'low' : 'normal',
});

// Outlook takvim etkinlikleri
export const fetchOutlookCalendarEvents = async (
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> => {
  const accessToken = await getMicrosoftAccessToken();
  if (!accessToken) throw new Error('Microsoft erişim tokeni bulunamadı');

  const response = await axios.get(`${GRAPH_API_BASE}/me/calendarView`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      $select: 'id,subject,start,end,location,attendees,bodyPreview,onlineMeeting',
      $orderby: 'start/dateTime',
      $top: 50,
    },
  });

  return (response.data.value || []).map(mapOutlookEventToCalendarEvent);
};

// Outlook etkinliğini uygulama formatına çevir
const mapOutlookEventToCalendarEvent = (event: any): CalendarEvent => ({
  id: event.id,
  title: event.subject || 'Başlıksız',
  description: event.bodyPreview,
  startTime: new Date(event.start.dateTime),
  endTime: new Date(event.end.dateTime),
  location: event.location?.displayName,
  attendees: event.attendees?.map((a: any) => a.emailAddress.address) || [],
  isAllDay: false,
  source: 'outlook',
  meetingLink: event.onlineMeeting?.joinUrl,
});

// Microsoft Access Token yönetimi (basit implementasyon)
const getMicrosoftAccessToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SECURE_STORE_KEY);
  } catch {
    return null;
  }
};

export const saveMicrosoftAccessToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(SECURE_STORE_KEY, token);
};

export const clearMicrosoftAccessToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
};
