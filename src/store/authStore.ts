import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { http } from '@/api/client';
import type { AppName } from './appStore';

interface AdminInfo {
  adminId?: string;
  account?: string;
  username?: string;
  nickname?: string;
  level?: number;
}

interface AuthState {
  mandisToken: string | null;
  begreatToken: string | null;
  mandisInfo: AdminInfo | null;
  begreatInfo: AdminInfo | null;

  loginMandis: (account: string, password: string) => Promise<void>;
  loginBegreat: (username: string, password: string) => Promise<void>;
  activeToken: () => string | null;
  activeInfo: () => AdminInfo | null;
  clearAuth: (app?: AppName) => void;
  setAuth: (app: AppName, token: string, info: AdminInfo) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      mandisToken: null,
      begreatToken: null,
      mandisInfo: null,
      begreatInfo: null,

      loginMandis: async (account, password) => {
        const res = await http.post('/api/login/postPasswordLogin', { account, password });
        const token = res.data?.token ?? '';
        const info: AdminInfo = {
          account,
          nickname: account,
          level: 1,
        };
        localStorage.setItem('admin_token', token);
        set({ mandisToken: token, mandisInfo: info });
      },

      loginBegreat: async (username, password) => {
        const res = await http.post('/begreat-admin/auth/login', { username, password });
        const token = res.data?.token ?? '';
        const info: AdminInfo = {
          username,
          adminId: res.data?.adminId,
        };
        localStorage.setItem('admin_token', token);
        set({ begreatToken: token, begreatInfo: info });
      },

      activeToken: () => {
        // 由调用方根据 currentApp 选择，这里提供一个兼容入口
        return get().mandisToken ?? get().begreatToken;
      },

      activeInfo: () => {
        return get().mandisInfo ?? get().begreatInfo;
      },

      clearAuth: (app) => {
        localStorage.removeItem('admin_token');
        if (!app || app === 'mandis') set({ mandisToken: null, mandisInfo: null });
        if (!app || app === 'begreat') set({ begreatToken: null, begreatInfo: null });
      },

      setAuth: (app, token, info) => {
        localStorage.setItem('admin_token', token);
        if (app === 'mandis') set({ mandisToken: token, mandisInfo: info });
        if (app === 'begreat') set({ begreatToken: token, begreatInfo: info });
      },
    }),
    { name: 'commander-auth' },
  ),
);
