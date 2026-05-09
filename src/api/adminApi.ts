import { http } from './client';

// ── 鉴权 (begreat-admin) ──
export const authApi = {
  login: (username: string, password: string) =>
    http.post('/begreat-admin/auth/login', { username, password }),
  me: () =>
    http.get('/begreat-admin/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    http.post('/begreat-admin/auth/change-password', { currentPassword, newPassword }),
};

// ── 鉴权 (mandis-admin) ──
export const mandisAuthApi = {
  login: (username: string, password: string) =>
    http.post('/mandis-admin/auth/login', { username, password }),
  me: () =>
    http.get('/mandis-admin/auth/me'),
  initAdmin: (username: string, password: string) =>
    http.post('/mandis-admin/auth/init-admin', { username, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    http.post('/mandis-admin/auth/change-password', { currentPassword, newPassword }),
};

// ── 大盘 ──
export const dashboardApi = {
  stats: () => http.get('/begreat-admin/dashboard/stats'),
  trend: (days = 7) => http.get(`/begreat-admin/dashboard/trend?days=${days}`),
};

// ── 用户 ──
export const usersApi = {
  list: (params: Record<string, unknown>) => http.get('/begreat-admin/users', { params }),
  timeline: (openId: string) => http.get(`/begreat-admin/users/${openId}/timeline`),
};

// ── 测评 ──
export const sessionsApi = {
  list: (params: Record<string, unknown>) => http.get('/begreat-admin/sessions', { params }),
  detail: (sessionId: string) => http.get(`/begreat-admin/sessions/${sessionId}`),
  grant: (sessionId: string, grantReason: string) =>
    http.post(`/begreat-admin/sessions/${sessionId}/grant`, { grantReason }),
};

// ── 支付 ──
export const paymentsApi = {
  list: (params: Record<string, unknown>) => http.get('/begreat-admin/payments', { params }),
  anomalies: () => http.get('/begreat-admin/payments/anomalies'),
  fixAnomaly: (sessionId: string, outTradeNo: string, reason: string) =>
    http.post('/begreat-admin/payments/fix-anomaly', { sessionId, outTradeNo, reason }),
};

// ── 邀请 ──
export const invitesApi = {
  stats: () => http.get('/begreat-admin/invites/stats'),
  list: (params: Record<string, unknown>) => http.get('/begreat-admin/invites', { params }),
};

// ── 配置 ──
export const configApi = {
  get: () => http.get('/begreat-admin/config'),
  update: (data: Record<string, unknown>) => http.post('/begreat-admin/config', data),
  reload: () => http.post('/begreat-admin/config/reload'),
};

// ── 职业 ──
export const occupationsApi = {
  list: (params: Record<string, unknown>) => http.get('/begreat-admin/occupations', { params }),
  seedPreview: () => http.get('/begreat-admin/occupations/seed'),
  seedImport: (reset = false) => http.post(`/begreat-admin/occupations/seed${reset ? '?reset=true' : ''}`),
};

// ── 题库 ──
export const questionBankApi = {
  list:   (params: Record<string, unknown>) => http.get('/begreat-admin/questions', { params }),
  stats:  () => http.get('/begreat-admin/questions/stats'),
  import: (records: unknown[], reset = false) => http.post('/begreat-admin/questions/import', { records, reset }),
};

// ── 常模 ──
export const normsApi = {
  versions: () => http.get('/begreat-admin/norms/versions'),
  list:     (version: string, modelType?: string) =>
    http.get('/begreat-admin/norms', { params: { version, modelType } }),
  update:   (id: string, patch: Record<string, unknown>) => http.put(`/begreat-admin/norms/${id}`, patch),
  activate: (normVersion: string) => http.post('/begreat-admin/norms/activate', { normVersion }),
};
