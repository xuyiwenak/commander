import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import {
  BarChartOutlined,
  SolutionOutlined,
  UserOutlined,
  FileTextOutlined,
  PayCircleOutlined,
  WarningOutlined,
  GiftOutlined,
  BranchesOutlined,
  SettingOutlined,
  MonitorOutlined,
  CloudServerOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import type { AppModule } from '../types';

const s = (Comp: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<Spin style={{ display: 'block', margin: '40px auto' }} />}>
    <Comp />
  </Suspense>
);

const Dashboard       = lazy(() => import('@/pages/begreat/Dashboard'));
const Users           = lazy(() => import('@/pages/begreat/Users'));
const UserDetail      = lazy(() => import('@/pages/begreat/UserDetail'));
const Sessions        = lazy(() => import('@/pages/begreat/Sessions'));
const SessionDetail   = lazy(() => import('@/pages/begreat/SessionDetail'));
const Payments        = lazy(() => import('@/pages/begreat/Payments'));
const PaymentAnomalies = lazy(() => import('@/pages/begreat/PaymentAnomalies'));
const Invites         = lazy(() => import('@/pages/begreat/Invites'));
const Config          = lazy(() => import('@/pages/begreat/Config'));
const Occupations     = lazy(() => import('@/pages/begreat/Occupations'));
const System          = lazy(() => import('@/pages/begreat/System'));
const ServerControl       = lazy(() => import('@/pages/shared/ServerControl'));
const NginxConfig         = lazy(() => import('@/pages/shared/NginxConfig'));
const RuntimeConfigEditor = lazy(() => import('@/pages/shared/RuntimeConfigEditor'));

export const begreatModule: AppModule = {
  appName: 'begreat',
  prefix: '/begreat',
  label: 'BeGreat 职业测评',
  loginRedirect: '/begreat/dashboard',
  nav: [
    { key: '/begreat/dashboard', icon: <BarChartOutlined />, label: '数据大盘' },
    {
      key: 'begreat-ops',
      icon: <SolutionOutlined />,
      label: '运营支持',
      children: [
        { key: '/begreat/users',     icon: <UserOutlined />,      label: '用户管理' },
        { key: '/begreat/sessions',  icon: <FileTextOutlined />,  label: '测评记录' },
        { key: '/begreat/payments',  icon: <PayCircleOutlined />, label: '支付管理' },
        { key: '/begreat/anomalies', icon: <WarningOutlined />,   label: '掉单修复' },
        { key: '/begreat/invites',   icon: <GiftOutlined />,      label: '邀请裂变' },
      ],
    },
    { key: '/begreat/occupations', icon: <BranchesOutlined />, label: '职业管理' },
    { key: '/begreat/system',      icon: <MonitorOutlined />,  label: '系统监控' },
    {
      key: 'begreat-server',
      icon: <CloudServerOutlined />,
      label: '服务器管理',
      children: [
        { key: '/begreat/server-control',                icon: <CloudServerOutlined />, label: '应用控制台' },
        { key: '/begreat/server-control/nginx',          icon: <CodeOutlined />,        label: 'Nginx 配置' },
        { key: '/begreat/server-control/runtime-config', icon: <SettingOutlined />,     label: '运行时配置' },
      ],
    },
    { key: '/begreat/config', icon: <SettingOutlined />, label: '系统配置' },
  ],
  routes: [
    { path: 'dashboard',              element: s(Dashboard) },
    { path: 'users',                  element: s(Users) },
    { path: 'users/:openId',          element: s(UserDetail) },
    { path: 'sessions',               element: s(Sessions) },
    { path: 'sessions/:sessionId',    element: s(SessionDetail) },
    { path: 'payments',               element: s(Payments) },
    { path: 'anomalies',              element: s(PaymentAnomalies) },
    { path: 'invites',                element: s(Invites) },
    { path: 'config',                 element: s(Config) },
    { path: 'occupations',            element: s(Occupations) },
    { path: 'system',                 element: s(System) },
    { path: 'server-control',                    element: s(ServerControl) },
    { path: 'server-control/nginx',              element: s(NginxConfig) },
    { path: 'server-control/runtime-config',     element: s(RuntimeConfigEditor) },
  ],
};
