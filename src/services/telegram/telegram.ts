import axios from 'axios';
import { Config } from '../../constants/config';
import { TelegramMessage } from '../../types';

const BOT_API_BASE = `${Config.telegram.apiUrl}${Config.telegram.botToken}`;

let lastUpdateId = 0;

// Telegram mesajlarını çek (polling)
export const fetchTelegramMessages = async (): Promise<TelegramMessage[]> => {
  try {
    const response = await axios.get(`${BOT_API_BASE}/getUpdates`, {
      params: {
        offset: lastUpdateId + 1,
        limit: 20,
        timeout: 0,
      },
    });

    if (!response.data.ok || !response.data.result.length) return [];

    const messages: TelegramMessage[] = [];
    for (const update of response.data.result) {
      if (update.update_id > lastUpdateId) {
        lastUpdateId = update.update_id;
      }

      if (update.message) {
        messages.push({
          id: update.message.message_id,
          chatId: update.message.chat.id,
          from: update.message.from?.first_name || 'Bilinmeyen',
          text: update.message.text || '',
          date: new Date(update.message.date * 1000),
          isBot: update.message.from?.is_bot || false,
        });
      }
    }

    return messages;
  } catch (error) {
    console.error('Telegram mesajları alınamadı:', error);
    return [];
  }
};

// Telegram mesajı gönder
export const sendTelegramMessage = async (
  chatId: number,
  text: string,
  options?: {
    parseMode?: 'Markdown' | 'HTML';
    replyToMessageId?: number;
  }
): Promise<boolean> => {
  try {
    await axios.post(`${BOT_API_BASE}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode,
      reply_to_message_id: options?.replyToMessageId,
    });
    return true;
  } catch (error) {
    console.error('Telegram mesajı gönderilemedi:', error);
    return false;
  }
};

// Günlük brifing bildirimi gönder
export const sendDailyBriefingNotification = async (
  chatId: number,
  briefing: string
): Promise<void> => {
  const formattedBriefing = `🌅 *Sabah Brifing* - ${new Date().toLocaleDateString('tr-TR')}\n\n${briefing}`;
  await sendTelegramMessage(chatId, formattedBriefing, { parseMode: 'Markdown' });
};

// Görev hatırlatıcısı gönder
export const sendTaskReminder = async (
  chatId: number,
  taskTitle: string,
  dueDate?: Date
): Promise<void> => {
  const dueDateStr = dueDate
    ? ` - Son tarih: ${dueDate.toLocaleDateString('tr-TR')}`
    : '';
  await sendTelegramMessage(
    chatId,
    `📌 *Görev Hatırlatma*\n\n${taskTitle}${dueDateStr}`,
    { parseMode: 'Markdown' }
  );
};

// Bot bilgisi al
export const getBotInfo = async (): Promise<{ username: string; name: string } | null> => {
  try {
    const response = await axios.get(`${BOT_API_BASE}/getMe`);
    if (response.data.ok) {
      return {
        username: response.data.result.username,
        name: response.data.result.first_name,
      };
    }
    return null;
  } catch {
    return null;
  }
};

// Webhook kur (opsiyonel)
export const setWebhook = async (url: string): Promise<boolean> => {
  try {
    const response = await axios.post(`${BOT_API_BASE}/setWebhook`, { url });
    return response.data.ok;
  } catch {
    return false;
  }
};
