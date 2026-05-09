import { theme as antTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import type { AppName } from '@/store/appStore';

// ── 暗色基础 token（Raycast 风格，暖灰调，非冷蓝） ──────────────────────────

const DARK_BASE = {
  colorBgBase:       '#1c1c1e',
  colorBgLayout:     '#111113',
  colorBgContainer:  '#1c1c1e',
  colorBgElevated:   '#232325',
  colorBorder:       '#2e2e30',
  colorBorderSecondary: '#252527',
  colorText:         '#f2f2f7',
  colorTextSecondary: '#8d8d95',
  colorTextTertiary: '#52525a',
  colorTextQuaternary: '#3a3a3c',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif',
  fontSize: 13,
  borderRadius: 8,
  borderRadiusSM: 6,
  borderRadiusLG: 10,
  lineHeight: 1.5,
  controlHeight: 32,
  controlHeightSM: 26,
};

const SIDER_MENU = {
  darkItemBg:        '#18181a',
  darkItemHoverBg:   '#2c2c2e',
  darkItemSelectedBg:'#2c2c2e',
  darkSubMenuItemBg: '#141416',
  darkItemColor:     '#8d8d95',
  darkItemHoverColor:'#f2f2f7',
  darkGroupTitleColor:'#52525a',
};

export const APP_THEMES: Record<AppName, ThemeConfig> = {
  mandis: {
    algorithm: antTheme.darkAlgorithm,
    token: {
      ...DARK_BASE,
      colorPrimary: '#4dbfb4',
    },
    components: {
      Layout: {
        siderBg: '#18181a',
        headerBg: '#18181a',
        bodyBg:   '#111113',
        triggerBg:'#232325',
        triggerColor: '#8d8d95',
      },
      Menu: {
        ...SIDER_MENU,
        darkItemSelectedColor: '#4dbfb4',
      },
      Drawer: {
        colorBgElevated: '#232325',
      },
      Dropdown: {
        colorBgElevated: '#232325',
        controlItemBgHover: '#2c2c2e',
      },
    },
  },

  begreat: {
    algorithm: antTheme.darkAlgorithm,
    token: {
      ...DARK_BASE,
      colorPrimary: '#7c6af5',
    },
    components: {
      Layout: {
        siderBg: '#18181a',
        headerBg: '#18181a',
        bodyBg:   '#111113',
        triggerBg:'#232325',
        triggerColor: '#8d8d95',
      },
      Menu: {
        ...SIDER_MENU,
        darkItemSelectedColor: '#7c6af5',
      },
      Drawer: {
        colorBgElevated: '#232325',
      },
      Dropdown: {
        colorBgElevated: '#232325',
        controlItemBgHover: '#2c2c2e',
      },
    },
  },
};
