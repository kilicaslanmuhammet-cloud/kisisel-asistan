import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  googleAccessToken: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setGoogleAccessToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  googleAccessToken: null,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setGoogleAccessToken: (googleAccessToken) => set({ googleAccessToken }),
  logout: () => set({ user: null, isAuthenticated: false, googleAccessToken: null }),
}));
