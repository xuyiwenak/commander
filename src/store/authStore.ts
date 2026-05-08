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

// D3 双 Token 鉴权：各 app 使用独立 localStorage key，互不污染
const TOKEN_KEY: Record<AppName, string> = {
  mandis: 'mandis_admin_token',
  begreat: 'begreat_admin_token',
};

function setTokenFallback(app: AppName, token: string): void {
  localStorage.setItem(TOKEN_KEY[app], token);
}

function removeTokenFallback(app: AppName): void {
  localStorage.removeItem(TOKEN_KEY[app]);
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
        setTokenFallback('mandis', token);
        set({ mandisToken: token, mandisInfo: info });
      },

      loginBegreat: async (username, password) => {
        const res = await http.post('/begreat-admin/auth/login', { username, password });
        const token = res.data?.token ?? '';
        const info: AdminInfo = {
          username,
          adminId: res.data?.adminId,
        };
        setTokenFallback('begreat', token);
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
        if (!app || app === 'mandis') {
          removeTokenFallback('mandis');
          set({ mandisToken: null, mandisInfo: null });
        }
        if (!app || app === 'begreat') {
          removeTokenFallback('begreat');
          set({ begreatToken: null, begreatInfo: null });
        }
      },

      setAuth: (app, token, info) => {
        setTokenFallback(app, token);
        if (app === 'mandis') set({ mandisToken: token, mandisInfo: info });
        if (app === 'begreat') set({ begreatToken: token, begreatInfo: info });
      },
    }),
    { name: 'commander-auth' },
  ),
);
