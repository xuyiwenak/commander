import type { ThemeConfig } from 'antd';
import type { AppName } from '@/store/appStore';

export const APP_THEMES: Record<AppName, ThemeConfig> = {
  mandis: {
    token: {
      colorPrimary: '#4DBFB4',
      colorBgLayout: '#F9F4EF',
      colorTextBase: '#1B3A6B',
      borderRadius: 8,
    },
  },
  begreat: {
    token: {
      colorPrimary: '#1677ff',
      colorBgLayout: '#f5f5f5',
      colorTextBase: '#000000',
      borderRadius: 6,
    },
  },
};
