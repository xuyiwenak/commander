import type { AppName } from '@/store/appStore';

export interface AppRuntimeConfig {
  appName: AppName;
  label: string;
  systemApiBase: string;
  dockerContainerName: string;
  logAutoRefreshIntervalMs: number;
  containerRefreshDelayMs: number;
  defaultLogTail: number;
}

export const RUNTIME_CONFIG_FALLBACKS: Record<AppName, AppRuntimeConfig> = {
  mandis: {
    appName: 'mandis',
    label: 'Mandis 艺术工作室',
    systemApiBase: '/api/mandis-admin/system',
    dockerContainerName: 'art-mandis',
    logAutoRefreshIntervalMs: 10000,
    containerRefreshDelayMs: 3000,
    defaultLogTail: 200,
  },
  begreat: {
    appName: 'begreat',
    label: 'BeGreat 职业测评',
    systemApiBase: '/begreat-admin/system',
    dockerContainerName: 'art-begreat',
    logAutoRefreshIntervalMs: 10000,
    containerRefreshDelayMs: 3000,
    defaultLogTail: 200,
  },
};

export async function fetchAppRuntimeConfig(appName: AppName): Promise<AppRuntimeConfig> {
  const fallback = RUNTIME_CONFIG_FALLBACKS[appName];
  try {
    const token = localStorage.getItem(`${appName}_admin_token`);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${fallback.systemApiBase}/runtime-config`, { headers });
    if (!res.ok) return fallback;
    const body = (await res.json()) as { success: boolean; data: AppRuntimeConfig };
    if (!body.success || !body.data) return fallback;
    return { ...fallback, ...body.data };
  } catch {
    return fallback;
  }
}
