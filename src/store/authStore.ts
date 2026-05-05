import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminInfo {
  adminId:  string;
  username: string;
}

interface AuthState {
  token:     string | null;
  adminInfo: AdminInfo | null;
  setAuth:   (token: string, adminInfo: AdminInfo) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:     null,
      adminInfo: null,
      setAuth:   (token, adminInfo) => {
        localStorage.setItem('admin_token', token);
        set({ token, adminInfo });
      },
      clearAuth: () => {
        localStorage.removeItem('admin_token');
        set({ token: null, adminInfo: null });
      },
    }),
    { name: 'begreat-admin-auth' }
  )
);
