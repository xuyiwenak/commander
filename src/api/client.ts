import axios from 'axios';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

export const http = axios.create({ timeout: 15000 });

// Request: 注入 token（不再动态设置 baseURL，所有 API 路径使用显式全路径）
http.interceptors.request.use((config) => {
  const { currentApp } = useAppStore.getState();

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
