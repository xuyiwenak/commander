import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import type { AppName } from '@/store/appStore';

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

export const http = axios.create({ timeout: 15000 });

function isBegreatUrl(url: string): boolean {
  return url.startsWith('/begreat-admin');
}


// Request: 根据 URL 前缀注入对应 token，避免依赖 currentApp 状态造成 token 注入错误
http.interceptors.request.use((config) => {
  const url = config.url ?? '';
  const auth = useAuthStore.getState();

  const token = isBegreatUrl(url)
    ? (auth.begreatToken ?? localStorage.getItem('begreat_admin_token'))
    : (auth.mandisToken ?? localStorage.getItem('mandis_admin_token'));

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: 格式归一化 + 401 处理（同样基于 URL 前缀，不依赖 currentApp）
http.interceptors.response.use(
  (res) => {
    const url = (res.config?.url as string) ?? '';

    if (isBegreatUrl(url)) {
      // begreat: { code, success, data: { data: ... } }
      const body = res.data as Record<string, unknown>;
      const inner = (body.data as Record<string, unknown>) ?? {};
      return { ...res, data: inner.data ?? inner };
    }

    // mandis / mandis-admin: { success: true, data: ... }
    const body = res.data as Record<string, unknown>;
    if (!body.success) {
      throw new ApiError((body.code as number) ?? res.status, (body.message as string) ?? 'Request failed');
    }
    return { ...res, data: body.data };
  },
  (err) => {
    const url = (err.config?.url as string) ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/init-admin');
    if (err.response?.status === 401 && !isAuthEndpoint) {
      const app: AppName = isBegreatUrl(url) ? 'begreat' : 'mandis';
      useAuthStore.getState().clearAuth(app);
      window.location.href = `/login/${app}`;
    }
    return Promise.reject(err);
  },
);
