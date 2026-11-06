import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthResponse } from '@/types/api';

interface AuthState {
  user: AuthResponse | null;
  login: (userData: AuthResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (userData) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', userData.token);
        }
        set({ user: userData });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        set({ user: null });
      },
    }),
    {
      name: 'lezzat-auth-storage',
    }
  )
);