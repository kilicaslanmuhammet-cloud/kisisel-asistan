/**
 * OpenAI GPT-4 tabanlı AI servisi.
 * claude/ai.ts ile aynı fonksiyon imzalarını paylaşır; features.claudeAI
 * false olduğunda services/ai/index.ts bu modülü kullanır.
 */
import axios from 'axios';
import { Config } from '../../constants/config';
import {
  ChatMessage,
  Task,
  CalendarEvent,
  Mail,
  WeatherData,
  Meeting,
} from '../../types';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

const SYSTEM_PROMPT = `Sen Türkçe konuşan kişisel bir AI asistansın. Kullanıcının günlük hayatını organize etmesine,
verimliliğini artırmasına ve iş-aile-sosyal yaşam dengesini kurmasına yardım ediyorsun.

Özelliklerin:
- Mail özetleme ve kategorileme
- Takvim yönetimi ve optimizasyon
- Görev takibi ve önceliklendirme
- Toplantı transkripti analizi
- Sabah brifing hazırlama
- Proaktif tavsiye verme
- Haftalık özet oluşturma
- Günlük plan optimizasyonu

Her zaman:
- Türkçe yanıt ver
- Kısa ve öz ol ama gerektiğinde detaylı açıkla
- Pratik ve uygulanabilir öneriler sun
- Kullanıcının önceliklerine saygı göster
- Yapıcı ve motive edici ol`;

// Yardımcı: OpenAI chat completion çağrısı yapar
const complete = async (
  messages: { role: string; content: string }[],
  systemPrompt: string = SYSTEM_PROMPT,
  maxTokens = 2048
): Promise<string> => {
  const response = await axios.post(
    `${OPENAI_API_BASE}/chat/completions`,
    {
      model: Config.openai.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${Config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );
  return response.data.choices[0]?.message?.content ?? '';
};

// Genel sohbet
export const sendChatMessage = async (
  messages: ChatMessage[],
  userMessage: string,
  context?: {
    tasks?: Task[];
    events?: CalendarEvent[];
    weather?: WeatherData;
  }
): Promise<string> => {
  const contextStr = context
    ? `\n\nGüncel bağlam:
${context.weather ? `Hava: ${context.weather.description}, ${context.weather.temperature}°C` : ''}
${context.tasks?.length ? `Bekleyen görevler: ${context.tasks.slice(0, 5).map((t) => t.title).join(', ')}` : ''}
${context.events?.length ? `Bugünkü etkinlikler: ${context.events.slice(0, 3).map((e) => e.title).join(', ')}` : ''}`
    : '';

  const history = messages.slice(-20).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  return complete(
    [...history, { role: 'user', content: userMessage }],
    SYSTEM_PROMPT + contextStr
  );
};

// Mail özetleme ve kategorileme
export const summarizeAndCategorizeMails = async (
  mails: { subject: string; from: string; body: string; date: string }[]
): Promise<{ id: number; summary: string; category: string; importance: string }[]> => {
  const mailsText = mails
    .map(
      (m, i) =>
        `${i + 1}. Gönderen: ${m.from}\nKonu: ${m.subject}\nTarih: ${m.date}\nİçerik: ${m.body.substring(0, 500)}`
    )
    .join('\n\n---\n\n');

  const text = await complete(
    [
      {
        role: 'user',
        content: `Aşağıdaki mailleri analiz et ve her biri için:
1. Kısa özet (2-3 cümle)
2. Kategori: aile/is/sosyal/notlar
3. Önem derecesi: düşük/normal/yüksek

Yanıtı JSON formatında ver:
[{"id": 1, "summary": "...", "category": "...", "importance": "..."}]

Mailler:
${mailsText}`,
      },
    ],
    SYSTEM_PROMPT,
    4096
  );

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    console.error('Mail analizi JSON parse hatası');
  }
  return [];
};

// Toplantı özeti
export const analyzeMeeting = async (
  transcript: string,
  duration: number,
  attendees?: string[]
): Promise<{
  summary: string;
  decisions: string[];
  actionItems: string[];
  openQuestions: string[];
}> => {
  const summaryLength =
    duration < 30 ? 'kısa (3-4 cümle)' : duration < 60 ? 'orta (1 paragraf)' : 'detaylı (2-3 paragraf)';

  const text = await complete(
    [
      {
        role: 'user',
        content: `Aşağıdaki toplantı transkriptini analiz et (${duration} dakika, ${attendees?.length || 'bilinmeyen'} katılımcı).

Bölümler:
1. **Genel Özet**: ${summaryLength} özet
2. **Kararlar**: Alınan önemli kararlar (madde madde)
3. **Aksiyon Maddeleri**: Yapılacak işler, sorumlu kişiler ve tarihler
4. **Açık Sorular**: Yanıtsız kalan sorular veya belirsizlikler

JSON formatında yanıt ver:
{
  "summary": "...",
  "decisions": ["...", "..."],
  "actionItems": ["...", "..."],
  "openQuestions": ["...", "..."]
}

Transkript:
${transcript}`,
      },
    ],
    SYSTEM_PROMPT,
    4096
  );

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    console.error('Toplantı analizi parse hatası');
  }

  return { summary: 'Özet oluşturulamadı', decisions: [], actionItems: [], openQuestions: [] };
};

// Sabah brifing
export const generateMorningBriefing = async (data: {
  weather: WeatherData;
  events: CalendarEvent[];
  tasks: Task[];
  mails: Mail[];
  userName: string;
}): Promise<string> => {
  const eventsText = data.events
    .slice(0, 5)
    .map(
      (e) =>
        `- ${e.title} (${new Date(e.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })})`
    )
    .join('\n');

  const tasksText = data.tasks
    .filter((t) => t.status !== 'completed')
    .slice(0, 5)
    .map((t) => `- [${t.priority}] ${t.title}`)
    .join('\n');

  const mailsText = data.mails
    .slice(0, 3)
    .map((m) => `- ${m.subject} (${m.from})`)
    .join('\n');

  return complete(
    [
      {
        role: 'user',
        content: `Bugün ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} için ${data.userName} adlı kullanıcıya samimi, motive edici bir sabah brifing hazırla.

Hava: ${data.weather.description}, ${data.weather.temperature}°C, ${data.weather.city}

Bugünkü etkinlikler:
${eventsText || 'Etkinlik yok'}

Öncelikli görevler:
${tasksText || 'Bekleyen görev yok'}

Önemli mailler:
${mailsText || 'Yeni mail yok'}

Kısa, enerjik ve motivasyonel bir brifing yaz. Günün nasıl geçeceği hakkında pratik ipuçları ver.`,
      },
    ],
    SYSTEM_PROMPT,
    1024
  );
};

// Günlük plan optimizasyonu
export const optimizeDailyPlan = async (data: {
  userInput: string;
  tasks: Task[];
  events: CalendarEvent[];
  weather: WeatherData;
  currentLocation?: string;
  workStartTime: string;
  workEndTime: string;
}): Promise<{
  schedule: Array<{ time: string; duration: number; title: string; type: string; tips?: string }>;
  tips: string[];
  warnings: string[];
}> => {
  const text = await complete(
    [
      {
        role: 'user',
        content: `Kullanıcının bugünkü planını optimize et.

Kullanıcı notu: ${data.userInput}

Mevcut görevler: ${data.tasks.map((t) => `${t.title} (${t.priority})`).join(', ')}
Takvim etkinlikleri: ${data.events
          .map(
            (e) =>
              `${e.title} ${new Date(e.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
          )
          .join(', ')}
Hava durumu: ${data.weather.description}, ${data.weather.temperature}°C
Konum: ${data.currentLocation || 'bilinmiyor'}
Çalışma saatleri: ${data.workStartTime} - ${data.workEndTime}

JSON formatında yanıt ver:
{
  "schedule": [
    {"time": "09:00", "duration": 60, "title": "...", "type": "task/event/break/commute", "tips": "..."}
  ],
  "tips": ["..."],
  "warnings": ["..."]
}`,
      },
    ],
    SYSTEM_PROMPT,
    4096
  );

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    console.error('Plan optimizasyonu parse hatası');
  }

  return { schedule: [], tips: [], warnings: [] };
};

// Proaktif tavsiye
export const generateProactiveAdvice = async (data: {
  habits: any[];
  tasks: Task[];
  completionRate: number;
  category: string;
}): Promise<string> => {
  return complete(
    [
      {
        role: 'user',
        content: `Kullanıcının ${data.category} kategorisindeki verimliliği için proaktif bir tavsiye ver.

Son 30 gün verileri:
- Görev tamamlama oranı: %${data.completionRate}
- Toplam görev: ${data.tasks.length}
- Alışkanlık örüntüleri: ${JSON.stringify(data.habits.slice(0, 5))}

Kısa, pratik ve motivasyonel bir tavsiye ver (2-3 cümle).`,
      },
    ],
    SYSTEM_PROMPT,
    512
  );
};

// Haftalık özet
export const generateWeeklySummary = async (data: {
  tasksCompleted: Task[];
  tasksTotal: Task[];
  meetings: Meeting[];
  habits: any[];
  userName: string;
}): Promise<string> => {
  const completionRate =
    data.tasksTotal.length > 0
      ? Math.round((data.tasksCompleted.length / data.tasksTotal.length) * 100)
      : 0;

  return complete(
    [
      {
        role: 'user',
        content: `${data.userName} için bu haftanın özet raporunu hazırla.

İstatistikler:
- Tamamlanan görevler: ${data.tasksCompleted.length}/${data.tasksTotal.length} (%${completionRate})
- Katıldığı toplantılar: ${data.meetings.length}
- En yoğun kategoriler: ${Object.entries(
          data.tasksTotal.reduce((acc: any, t) => {
            acc[t.category] = (acc[t.category] || 0) + 1;
            return acc;
          }, {})
        )
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 3)
          .map(([cat, count]) => `${cat}: ${count}`)
          .join(', ')}

Başarılar, iyileştirme alanları ve gelecek hafta için öneriler içeren bir özet yaz.`,
      },
    ],
    SYSTEM_PROMPT,
    2048
  );
};

// Sesli komut işleme
export const processVoiceCommand = async (
  command: string,
  context: { tasks: Task[]; events: CalendarEvent[] }
): Promise<{ action: string; data?: any; response: string }> => {
  const text = await complete(
    [
      {
        role: 'user',
        content: `Sesli komut: "${command}"

Mevcut görevler: ${context.tasks.slice(0, 5).map((t) => t.title).join(', ')}
Bugünkü etkinlikler: ${context.events.slice(0, 3).map((e) => e.title).join(', ')}

Komutun ne olduğunu analiz et ve JSON formatında yanıt ver:
{"action": "create_task/complete_task/show_tasks/show_events/search_mail/start_briefing/start_meeting/optimize_plan", "data": {}, "response": "Kullanıcıya söylenecek metin"}`,
      },
    ],
    SYSTEM_PROMPT +
      '\n\nSesli komut işleme modu: Kullanıcının sesli komutunu analiz et ve ne yapmak istediğini anla.',
    1024
  );

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    console.error('Sesli komut parse hatası');
  }

  return { action: 'unknown', response: 'Komutu anlayamadım, tekrar dener misiniz?' };
};
