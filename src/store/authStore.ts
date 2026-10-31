import { create } from 'zustand';
import type { User, UserRole } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initAuth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<User>;
  quickSwitchRole: (role: UserRole) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initAuth: async () => {
    try {
      set({ isLoading: true });
      const user = await authService.getStoredSession();
      if (user) {
        set({ user, isAuthenticated: true, error: null });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch (err: any) {
      console.error('Auth initialization error:', err);
      set({ user: null, isAuthenticated: false, error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, pass) => {
    try {
      set({ isLoading: true, error: null });
      const user = await authService.login(email, pass);
      set({ user, isAuthenticated: true, error: null });
      return user;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  quickSwitchRole: async (role: UserRole) => {
    try {
      set({ isLoading: true, error: null });
      const user = await authService.quickDemoLogin(role);
      set({ user, isAuthenticated: true, error: null });
      return user;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const { user } = get();
    await authService.logout(user);
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
