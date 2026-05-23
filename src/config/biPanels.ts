import type { AppName } from '@/store/appStore';

export interface BiPanelConfig {
  key: string;
  label: string;
  visible: AppName[];
}

// 声明式面板配置（D8 三层过滤 — 第二层）
// 面板组件在 DashboardPage 中按 visible 过滤渲染
export const BI_PANELS: BiPanelConfig[] = [
  { key: 'apiPerformance', label: 'API 性能',   visible: ['mandis', 'begreat'] },
  { key: 'errorAnalysis',  label: '错误分析',   visible: ['mandis', 'begreat'] },
  { key: 'uploadStats',    label: '上传统计',   visible: ['mandis'] },
  { key: 'qwenCosts',      label: 'Qwen 成本',  visible: ['mandis'] },
  { key: 'hotEndpoints',   label: '热门端点',   visible: ['mandis', 'begreat'] },
  { key: 'dauTrend',       label: 'DAU 趋势',   visible: ['mandis'] },
  { key: 'userFunnel',     label: '用户漏斗',   visible: ['mandis'] },
  { key: 'emotionStats',   label: '情绪分布',   visible: ['mandis'] },
];
