import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import {
  DashboardOutlined,
  MonitorOutlined,
  CloudServerOutlined,
  CodeOutlined,
  SettingOutlined,
  TeamOutlined,
  PictureOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import type { AppModule } from '../types';

const s = (Comp: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<Spin style={{ display: 'block', margin: '40px auto' }} />}>
    <Comp />
  </Suspense>
);

const DashboardPage     = lazy(() => import('@/pages/DashboardPage'));
const SystemPage        = lazy(() => import('@/pages/SystemPage'));
const ServerControl       = lazy(() => import('@/pages/shared/ServerControl'));
const NginxConfig         = lazy(() => import('@/pages/shared/NginxConfig'));
const RuntimeConfigEditor = lazy(() => import('@/pages/shared/RuntimeConfigEditor'));
const UsersPage         = lazy(() => import('@/pages/mandis/UsersPage'));
const WorksPage         = lazy(() => import('@/pages/mandis/WorksPage'));
const FeedbackPage      = lazy(() => import('@/pages/mandis/FeedbackPage'));

export const mandisModule: AppModule = {
  appName: 'mandis',
  prefix: '/mandis',
  label: 'Mandis 艺术工作室',
  loginRedirect: '/mandis/dashboard',
  nav: [
    { key: '/mandis/dashboard', icon: <DashboardOutlined />, label: 'BI 仪表盘' },
    { key: '/mandis/system',    icon: <MonitorOutlined />,    label: '系统监控' },
    {
      key: 'mandis-server',
      icon: <CloudServerOutlined />,
      label: '服务器管理',
      children: [
        { key: '/mandis/server-control',               icon: <CloudServerOutlined />, label: '应用控制台' },
        { key: '/mandis/server-control/nginx',         icon: <CodeOutlined />,        label: 'Nginx 配置' },
        { key: '/mandis/server-control/runtime-config', icon: <SettingOutlined />,    label: '运行时配置' },
      ],
    },
    { key: '/mandis/users',    icon: <TeamOutlined />,   label: '用户管理' },
    { key: '/mandis/works',    icon: <PictureOutlined />, label: '作品管理' },
    { key: '/mandis/feedback', icon: <MessageOutlined />, label: '反馈管理' },
  ],
  routes: [
    { path: 'dashboard',          element: s(DashboardPage) },
    { path: 'system',             element: s(SystemPage) },
    { path: 'server-control',                    element: s(ServerControl) },
    { path: 'server-control/nginx',              element: s(NginxConfig) },
    { path: 'server-control/runtime-config',     element: s(RuntimeConfigEditor) },
    { path: 'users',              element: s(UsersPage) },
    { path: 'works',              element: s(WorksPage) },
    { path: 'feedback',           element: s(FeedbackPage) },
  ],
};
