import axios, { type AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/authStore';
import type { AppName } from '@/store/appStore';

// ── 常量 ──────────────────────────────────────────────────────────────────────

const TIMEOUT_DEFAULT = 15000;
const TIMEOUT_LONG    = 600000;

const BASE_URL: Record<AppName, string> = {
  mandis:  '/api/admin/system',
  begreat: '/begreat-admin/system',
};

// ── token 获取 ────────────────────────────────────────────────────────────────

function getToken(appName: AppName): string | null {
  const auth = useAuthStore.getState();
  if (appName === 'begreat') {
    return auth.begreatToken ?? localStorage.getItem('begreat_admin_token');
  }
  return auth.mandisToken ?? localStorage.getItem('mandis_admin_token');
}

// ── axios 工厂（含统一的 token 注入 + 响应解包） ──────────────────────────────

function createHttp(appName: AppName, timeout = TIMEOUT_DEFAULT): AxiosInstance {
  const instance = axios.create({ timeout });

  instance.interceptors.request.use((config) => {
    const token = getToken(appName);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (res) => {
      const body = res.data as Record<string, unknown>;
      if (!body['success']) throw new Error((body['message'] as string) ?? 'Request failed');
      return { ...res, data: body['data'] };
    },
    (err) => Promise.reject(err),
  );

  return instance;
}

// ── 类型定义 ──────────────────────────────────────────────────────────────────

export interface SystemApi {
  getMetrics:     () => Promise<unknown>;
  getContainers:  () => Promise<unknown>;
  restartContainer: (name: string) => Promise<unknown>;
  appRestart:     (app: AppName) => Promise<unknown>;
  appBuildRestart:(app: AppName, noCache: boolean) => Promise<unknown>;
  appStop:        (app: AppName) => Promise<unknown>;
  appLogs:        (app: AppName, tail: number, file?: string) => Promise<unknown>;
  appLogFiles:    () => Promise<unknown>;
  getNginxConfig: (file?: string) => Promise<unknown>;
  saveNginxConfig:(file: string, content: string) => Promise<unknown>;
  nginxTest:      () => Promise<unknown>;
  nginxReload:    () => Promise<unknown>;
  pruneImages:    () => Promise<unknown>;
}

// ── 工厂函数 ──────────────────────────────────────────────────────────────────

export function createSystemApi(appName: AppName): SystemApi {
  const base    = BASE_URL[appName];
  const http    = createHttp(appName, TIMEOUT_DEFAULT);
  const longHttp = createHttp(appName, TIMEOUT_LONG);

  return {
    getMetrics:      () => http.get(`${base}/metrics`).then((r) => r.data),
    getContainers:   () => http.get(`${base}/containers`).then((r) => r.data),
    restartContainer:(name) => longHttp.post(`${base}/restart`, { name }).then((r) => r.data),
    appRestart:      (app) => longHttp.post(`${base}/app/restart`, { app }).then((r) => r.data),
    appBuildRestart: (app, noCache) => longHttp.post(`${base}/app/build-restart`, { app, noCache }).then((r) => r.data),
    appStop:         (app) => longHttp.post(`${base}/app/stop`, { app }).then((r) => r.data),
    appLogs:         (app, tail, file) =>
      http.get(`${base}/app/logs`, { params: { app, tail, file } }).then((r) => r.data),
    appLogFiles:     () => http.get(`${base}/app/log-files`).then((r) => r.data),
    getNginxConfig:  (file) => http.get(`${base}/nginx-config`, { params: file ? { file } : {} }).then((r) => r.data),
    saveNginxConfig: (file, content) => longHttp.put(`${base}/nginx-config`, { file, content }).then((r) => r.data),
    nginxTest:       () => longHttp.post(`${base}/nginx-test`).then((r) => r.data),
    nginxReload:     () => longHttp.post(`${base}/nginx-reload`).then((r) => r.data),
    pruneImages:     () => longHttp.post(`${base}/prune`).then((r) => r.data),
  };
}

// ── 预构建实例（各模块直接 import 使用） ──────────────────────────────────────

export const mandisSystemApi  = createSystemApi('mandis');
export const begreatSystemApi = createSystemApi('begreat');
