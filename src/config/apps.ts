import type { AppName } from '@/store/appStore';

interface AppMeta {
  label: string;
  apiBase: string;
  authPath: string;
  biAppName: string;
}

export const APPS: Record<AppName, AppMeta> = {
  mandis: {
    label: 'Mandis 艺术工作室',
    apiBase: '/api',
    authPath: '/login/postPasswordLogin',
    biAppName: 'mandis',
  },
  begreat: {
    label: 'BeGreat 职业测评',
    apiBase: '/begreat-admin',
    authPath: '/begreat-admin/auth/login',
    biAppName: 'begreat',
  },
};
