import axios from 'axios';

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? '';

export const http = axios.create({
  baseURL: `${BASE_URL}/begreat-admin`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err as Error);
  }
);

// ── 鉴权 ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    http.post<{ data: { token: string } }>('/auth/login', { username, password }),
  me: () =>
    http.get<{ data: { adminId: string; username: string } }>('/auth/me'),
};

// ── 大盘 ─────────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => http.get('/dashboard/stats'),
  trend: (days = 7) => http.get(`/dashboard/trend?days=${days}`),
};

// ── 用户 ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params: Record<string, unknown>) => http.get('/users', { params }),
  timeline: (openId: string) => http.get(`/users/${openId}/timeline`),
};

// ── 测评 ─────────────────────────────────────────────────────────────────────
export const sessionsApi = {
  list: (params: Record<string, unknown>) => http.get('/sessions', { params }),
  detail: (sessionId: string) => http.get(`/sessions/${sessionId}`),
  grant: (sessionId: string, grantReason: string) =>
    http.post(`/sessions/${sessionId}/grant`, { grantReason }),
};

// ── 支付 ─────────────────────────────────────────────────────────────────────
export const paymentsApi = {
  list: (params: Record<string, unknown>) => http.get('/payments', { params }),
  anomalies: () => http.get('/payments/anomalies'),
  fixAnomaly: (sessionId: string, outTradeNo: string, reason: string) =>
    http.post('/payments/fix-anomaly', { sessionId, outTradeNo, reason }),
};

// ── 邀请 ─────────────────────────────────────────────────────────────────────
export const invitesApi = {
  stats: () => http.get('/invites/stats'),
  list: (params: Record<string, unknown>) => http.get('/invites', { params }),
};

// ── 配置 ─────────────────────────────────────────────────────────────────────
export const configApi = {
  get: () => http.get('/config'),
  update: (data: Record<string, unknown>) => http.post('/config', data),
  reload: () => http.post('/config/reload'),
};

// ── 职业 ─────────────────────────────────────────────────────────────────────
export const occupationsApi = {
  list: (params: Record<string, unknown>) => http.get('/occupations', { params }),
  seedPreview: () => http.get('/occupations/seed'),
  seedImport: (reset = false) => http.post(`/occupations/seed${reset ? '?reset=true' : ''}`),
};
