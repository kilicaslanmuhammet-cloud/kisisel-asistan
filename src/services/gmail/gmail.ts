import axios from 'axios';
import { Mail } from '../../types';
import { getGoogleAccessToken } from '../firebase/auth';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

// Gmail mesajlarını çek
export const fetchGmailMessages = async (maxResults = 20): Promise<Mail[]> => {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error('Gmail erişim tokeni bulunamadı');

  // Önce mesaj ID listesini al
  const listResponse = await axios.get(`${GMAIL_API_BASE}/users/me/messages`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      maxResults,
      labelIds: 'INBOX',
      q: 'is:unread',
    },
  });

  if (!listResponse.data.messages) return [];

  // Her mesajın detayını al
  const messagePromises = listResponse.data.messages
    .slice(0, maxResults)
    .map((msg: { id: string }) => fetchGmailMessage(msg.id, accessToken));

  const messages = await Promise.allSettled(messagePromises);
  return messages
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<Mail>).value);
};

// Tek mesaj detayı
const fetchGmailMessage = async (messageId: string, accessToken: string): Promise<Mail> => {
  const response = await axios.get(`${GMAIL_API_BASE}/users/me/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { format: 'full' },
  });

  const message = response.data;
  const headers = message.payload.headers;

  const getHeader = (name: string) =>
    headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const subject = getHeader('Subject');
  const from = getHeader('From');
  const to = getHeader('To').split(',');
  const date = new Date(getHeader('Date'));

  // Mesaj gövdesini çöz
  const body = extractBody(message.payload);

  return {
    id: message.id,
    from,
    to,
    subject,
    body,
    date,
    isRead: !message.labelIds?.includes('UNREAD'),
    labels: message.labelIds,
    source: 'gmail',
  };
};

// Mesaj gövdesini çıkar
const extractBody = (payload: any): string => {
  if (!payload) return '';

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return '';
};

// Mail gönder
export const sendGmailMessage = async (params: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> => {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error('Gmail erişim tokeni bulunamadı');

  const emailContent = [
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    params.body,
  ].join('\r\n');

  const encodedEmail = Buffer.from(emailContent).toString('base64url');

  await axios.post(
    `${GMAIL_API_BASE}/users/me/messages/send`,
    { raw: encodedEmail },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  return true;
};

// Okundu işaretle
export const markAsRead = async (messageId: string): Promise<void> => {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return;

  await axios.post(
    `${GMAIL_API_BASE}/users/me/messages/${messageId}/modify`,
    { removeLabelIds: ['UNREAD'] },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
};

// Toplantı katılımcılarına özet maili gönder
export const sendMeetingSummaryMail = async (params: {
  attendees: string[];
  meetingTitle: string;
  summary: string;
  decisions: string[];
  actionItems: string[];
}): Promise<void> => {
  const body = `
TOPLANTI ÖZETİ: ${params.meetingTitle}
Tarih: ${new Date().toLocaleDateString('tr-TR')}

📋 ÖZET
${params.summary}

✅ KARARLAR
${params.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

📌 AKSİYON MADDELERİ
${params.actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}

---
Bu özet Kişisel AI Asistan tarafından otomatik oluşturulmuştur.
`;

  for (const attendee of params.attendees) {
    await sendGmailMessage({
      to: attendee,
      subject: `[Toplantı Özeti] ${params.meetingTitle}`,
      body,
    });
  }
};
