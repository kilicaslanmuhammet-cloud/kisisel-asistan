// API Anahtarları ve Konfigürasyon
// Bu değerleri .env dosyasında veya Expo SecureStore'da saklayın

export const Config = {
  // Firebase
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  },

  // Google OAuth
  google: {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'profile',
      'email',
    ],
  },

  // Anthropic Claude
  anthropic: {
    apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
    model: 'claude-opus-4-6',
  },

  // OpenAI Whisper
  openai: {
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
    whisperModel: 'whisper-1',
  },

  // Telegram Bot
  telegram: {
    botToken: process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN || '',
    apiUrl: 'https://api.telegram.org/bot',
  },

  // Microsoft Graph (Outlook)
  microsoft: {
    clientId: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '',
    tenantId: process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID || 'common',
    scopes: ['Mail.Read', 'Calendars.Read', 'User.Read'],
  },

  // Google Maps
  googleMaps: {
    apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  },

  // OpenWeather
  weather: {
    apiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || '',
    baseUrl: 'https://api.openweathermap.org/data/2.5',
  },
};

export const APP_VERSION = '1.0.0';
export const MAX_CONVERSATION_HISTORY = 50;
export const BRIEFING_HOUR = 7; // 07:00 sabah brifing
export const WEEKLY_SUMMARY_DAY = 0; // Pazar = 0
