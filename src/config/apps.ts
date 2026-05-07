import type { AppName } from '@/store/appStore';

interface AppMeta {
  label: string;
  apiBase: string;
  authPath: string;
  biAppName: string;
}

// 注：apiBase/authPath 仅作文档用途，实际 API 路径已在 client / authStore / adminApi 中显式指定
export const APPS: Record<AppName, AppMeta> = {
  mandis: {
    label: 'Mandis 艺术工作室',
    apiBase: '/api',
    authPath: '/api/login/postPasswordLogin',
    biAppName: 'mandis',
  },
  begreat: {
    label: 'BeGreat 职业测评',
    apiBase: '/begreat-admin',
    authPath: '/begreat-admin/auth/login',
    biAppName: 'begreat',
  },
};
