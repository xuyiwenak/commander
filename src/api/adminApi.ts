import { http } from './client';

// ── 鉴权 (兼容旧 import) ──
export const authApi = {
  login: (username: string, password: string) =>
    http.post('/auth/login', { username, password }),
  me: () =>
    http.get('/auth/me'),
};

// ── 大盘 ──
export const dashboardApi = {
  stats: () => http.get('/dashboard/stats'),
  trend: (days = 7) => http.get(`/dashboard/trend?days=${days}`),
};

// ── 用户 ──
export const usersApi = {
  list: (params: Record<string, unknown>) => http.get('/users', { params }),
  timeline: (openId: string) => http.get(`/users/${openId}/timeline`),
};

// ── 测评 ──
export const sessionsApi = {
  list: (params: Record<string, unknown>) => http.get('/sessions', { params }),
  detail: (sessionId: string) => http.get(`/sessions/${sessionId}`),
  grant: (sessionId: string, grantReason: string) =>
    http.post(`/sessions/${sessionId}/grant`, { grantReason }),
};

// ── 支付 ──
export const paymentsApi = {
  list: (params: Record<string, unknown>) => http.get('/payments', { params }),
  anomalies: () => http.get('/payments/anomalies'),
  fixAnomaly: (sessionId: string, outTradeNo: string, reason: string) =>
    http.post('/payments/fix-anomaly', { sessionId, outTradeNo, reason }),
};

// ── 邀请 ──
export const invitesApi = {
  stats: () => http.get('/invites/stats'),
  list: (params: Record<string, unknown>) => http.get('/invites', { params }),
};

// ── 配置 ──
export const configApi = {
  get: () => http.get('/config'),
  update: (data: Record<string, unknown>) => http.post('/config', data),
  reload: () => http.post('/config/reload'),
};

// ── 职业 ──
export const occupationsApi = {
  list: (params: Record<string, unknown>) => http.get('/occupations', { params }),
  seedPreview: () => http.get('/occupations/seed'),
  seedImport: (reset = false) => http.post(`/occupations/seed${reset ? '?reset=true' : ''}`),
};
