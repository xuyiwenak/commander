import axios from 'axios';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import type { AppName } from '@/store/appStore';

const APP_BASE: Record<AppName, string> = {
  mandis: '/api',
  begreat: '/begreat-admin',
};

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

export const http = axios.create({ timeout: 15000 });

// Request: 根据 currentApp 切换 baseURL + 注入 token
http.interceptors.request.use((config) => {
  const { currentApp } = useAppStore.getState();

  config.baseURL = APP_BASE[currentApp];

  // 获取对应当前 app 的 token
  let token: string | null = null;
  const auth = useAuthStore.getState();
  if (currentApp === 'mandis') {
    token = auth.mandisToken ?? localStorage.getItem('admin_token');
  } else {
    token = auth.begreatToken ?? localStorage.getItem('admin_token');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: 格式归一化 + 401 处理
http.interceptors.response.use(
  (res) => {
    const app = useAppStore.getState().currentApp;

    if (app === 'mandis') {
      // mandis: { success: true, data: ... }
      const body = res.data as Record<string, unknown>;
      if (!body.success) {
        throw new ApiError((body.code as number) ?? res.status, (body.message as string) ?? 'Request failed');
      }
      return { ...res, data: body.data };
    }

    // begreat: { data: { data: ... } }
    const body = res.data as Record<string, unknown>;
    const inner = (body.data as Record<string, unknown>) ?? {};
    return { ...res, data: inner.data ?? inner };
  },
  (err) => {
    if (err.response?.status === 401) {
      const app = useAppStore.getState().currentApp;
      useAuthStore.getState().clearAuth(app);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
