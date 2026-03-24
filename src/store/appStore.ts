import { create } from 'zustand';
import {
  Task,
  CalendarEvent,
  Mail,
  ChatMessage,
  WeatherData,
  Meeting,
  LocationState,
  TelegramMessage,
  ProactiveAdvice,
} from '../types';
import { Category } from '../constants/categories';

interface AppState {
  // Görevler
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;

  // Takvim
  events: CalendarEvent[];
  setEvents: (events: CalendarEvent[]) => void;

  // Mailler
  mails: Mail[];
  setMails: (mails: Mail[]) => void;

  // Sohbet
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;

  // Hava durumu
  weather: WeatherData | null;
  setWeather: (weather: WeatherData | null) => void;

  // Toplantılar
  meetings: Meeting[];
  setMeetings: (meetings: Meeting[]) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => void;

  // Konum
  locationState: LocationState;
  setLocationState: (state: Partial<LocationState>) => void;

  // Telegram
  telegramMessages: TelegramMessage[];
  setTelegramMessages: (messages: TelegramMessage[]) => void;

  // Proaktif tavsiyeler
  advice: ProactiveAdvice[];
  setAdvice: (advice: ProactiveAdvice[]) => void;

  // Aktif kategori filtresi
  activeCategory: Category | null;
  setActiveCategory: (category: Category | null) => void;

  // Yükleme durumları
  loadingStates: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;

  // Hata durumları
  errors: Record<string, string>;
  setError: (key: string, error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    })),
  removeTask: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })),

  events: [],
  setEvents: (events) => set({ events }),

  mails: [],
  setMails: (mails) => set({ mails }),

  chatMessages: [],
  setChatMessages: (chatMessages) => set({ chatMessages }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  weather: null,
  setWeather: (weather) => set({ weather }),

  meetings: [],
  setMeetings: (meetings) => set({ meetings }),
  addMeeting: (meeting) =>
    set((state) => ({ meetings: [meeting, ...state.meetings] })),
  updateMeeting: (meetingId, updates) =>
    set((state) => ({
      meetings: state.meetings.map((m) =>
        m.id === meetingId ? { ...m, ...updates } : m
      ),
    })),

  locationState: {
    current: null,
    context: 'other',
  },
  setLocationState: (newState) =>
    set((state) => ({ locationState: { ...state.locationState, ...newState } })),

  telegramMessages: [],
  setTelegramMessages: (telegramMessages) => set({ telegramMessages }),

  advice: [],
  setAdvice: (advice) => set({ advice }),

  activeCategory: null,
  setActiveCategory: (activeCategory) => set({ activeCategory }),

  loadingStates: {},
  setLoading: (key, loading) =>
    set((state) => ({
      loadingStates: { ...state.loadingStates, [key]: loading },
    })),

  errors: {},
  setError: (key, error) =>
    set((state) => ({
      errors: error
        ? { ...state.errors, [key]: error }
        : Object.fromEntries(Object.entries(state.errors).filter(([k]) => k !== key)),
    })),
}));
