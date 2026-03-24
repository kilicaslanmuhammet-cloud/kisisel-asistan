import { Category } from '../constants/categories';

// Kullanıcı
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  preferences?: UserPreferences;
  createdAt: Date;
}

export interface UserPreferences {
  workStartTime: string; // "09:00"
  workEndTime: string; // "18:00"
  homeLocation?: Location;
  workLocation?: Location;
  categories: Category[];
  notifications: {
    morningBriefing: boolean;
    taskReminders: boolean;
    weeklyReport: boolean;
    briefingTime: string;
  };
  integrations: {
    gmail: boolean;
    outlook: boolean;
    googleCalendar: boolean;
    telegram: boolean;
  };
}

// Konum
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

// Görev
export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: Category;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: Date;
  location?: Location;
  tags?: string[];
  source?: 'manual' | 'meeting' | 'ai' | 'mail' | 'calendar';
  meetingId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Mail
export interface Mail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
  isRead: boolean;
  labels?: string[];
  category?: Category;
  summary?: string;
  source: 'gmail' | 'outlook';
  importance?: 'low' | 'normal' | 'high';
}

// Takvim Etkinliği
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  isAllDay: boolean;
  category?: Category;
  source: 'google' | 'outlook' | 'local';
  meetingLink?: string;
}

// Sohbet Mesajı
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
  isStreaming?: boolean;
  metadata?: {
    tasks?: Task[];
    events?: CalendarEvent[];
    mails?: Mail[];
  };
}

// Toplantı
export interface Meeting {
  id: string;
  userId: string;
  title: string;
  date: Date;
  duration: number; // dakika
  attendees?: string[];
  transcript?: string;
  summary?: string;
  decisions?: string[];
  actionItems?: string[];
  openQuestions?: string[];
  audioFileUri?: string;
  status: 'recording' | 'processing' | 'completed';
  createdAt: Date;
}

// Günlük Plan
export interface DailyPlan {
  id: string;
  userId: string;
  date: Date;
  tasks: Task[];
  events: CalendarEvent[];
  mails: Mail[];
  weather?: WeatherData;
  optimizedSchedule?: ScheduleItem[];
  tips?: string[];
  createdAt: Date;
}

export interface ScheduleItem {
  time: string;
  duration: number; // dakika
  type: 'task' | 'event' | 'commute' | 'break';
  title: string;
  description?: string;
  location?: Location;
  priority?: 'low' | 'medium' | 'high';
}

// Hava Durumu
export interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  city: string;
  forecast?: WeatherForecast[];
}

export interface WeatherForecast {
  date: Date;
  tempMin: number;
  tempMax: number;
  condition: string;
  icon: string;
}

// Telegram Mesajı
export interface TelegramMessage {
  id: number;
  chatId: number;
  from: string;
  text: string;
  date: Date;
  isBot: boolean;
}

// Proaktif Tavsiye
export interface ProactiveAdvice {
  id: string;
  type: 'productivity' | 'health' | 'family' | 'social' | 'general';
  title: string;
  content: string;
  actionable?: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
}

// Haftalık Özet
export interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  tasksCompleted: number;
  tasksTotal: number;
  meetingsAttended: number;
  topCategories: { category: Category; count: number }[];
  achievements: string[];
  improvements: string[];
  aiInsights: string;
}

// Sabah Brifing
export interface MorningBriefing {
  date: Date;
  greeting: string;
  weather: WeatherData;
  todayEvents: CalendarEvent[];
  pendingTasks: Task[];
  importantMails: Mail[];
  tips: string[];
  aiSummary: string;
}

// Konum Bağlamı
export type LocationContext = 'home' | 'work' | 'commute' | 'other';

export interface LocationState {
  current: Location | null;
  context: LocationContext;
  nearbyPlaces?: NearbyPlace[];
}

export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  address: string;
  distance: number;
  rating?: number;
  location: Location;
}
