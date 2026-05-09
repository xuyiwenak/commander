import { createBrowserRouter } from 'react-router-dom';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import SystemPage from '@/pages/SystemPage';

import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

const Lazy = (imp: () => Promise<{ default: React.ComponentType }>) => {
  const Comp = lazy(imp);
  return (
    <Suspense fallback={<Spin style={{ display: 'block', margin: '40px auto' }} />}>
      <Comp />
    </Suspense>
  );
};

const BegreatDashboard = () => Lazy(() => import('@/pages/begreat/Dashboard'));
const BegreatUsers = () => Lazy(() => import('@/pages/begreat/Users'));
const BegreatUserDetail = () => Lazy(() => import('@/pages/begreat/UserDetail'));
const Sessions = () => Lazy(() => import('@/pages/begreat/Sessions'));
const SessionDetail = () => Lazy(() => import('@/pages/begreat/SessionDetail'));
const Payments = () => Lazy(() => import('@/pages/begreat/Payments'));
const PaymentAnomalies = () => Lazy(() => import('@/pages/begreat/PaymentAnomalies'));
const Invites = () => Lazy(() => import('@/pages/begreat/Invites'));
const Config = () => Lazy(() => import('@/pages/begreat/Config'));
const Occupations = () => Lazy(() => import('@/pages/begreat/Occupations'));

const MandisUsers = () => Lazy(() => import('@/pages/mandis/UsersPage'));
const MandisWorks = () => Lazy(() => import('@/pages/mandis/WorksPage'));
const MandisFeedback = () => Lazy(() => import('@/pages/mandis/FeedbackPage'));

const DashboardPage = () => Lazy(() => import('@/pages/DashboardPage'));
const ServerControlPage = () => Lazy(() => import('@/pages/ServerControlPage'));
const NginxConfigPage = () => Lazy(() => import('@/pages/NginxConfigPage'));

export const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    { path: '/login/:app', element: <Login /> },
    {
      path: '/',
      element: <AuthGuard><AppLayout /></AuthGuard>,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'system', element: <SystemPage /> },
        { path: 'server-control', element: <ServerControlPage /> },
        { path: 'server-control/nginx', element: <NginxConfigPage /> },
        { path: 'mandis/users', element: <MandisUsers /> },
        { path: 'mandis/works', element: <MandisWorks /> },
        { path: 'mandis/feedback', element: <MandisFeedback /> },
        { path: 'begreat/dashboard', element: <BegreatDashboard /> },
        { path: 'begreat/users', element: <BegreatUsers /> },
        { path: 'begreat/users/:openId', element: <BegreatUserDetail /> },
        { path: 'begreat/sessions', element: <Sessions /> },
        { path: 'begreat/sessions/:sessionId', element: <SessionDetail /> },
        { path: 'begreat/payments', element: <Payments /> },
        { path: 'begreat/anomalies', element: <PaymentAnomalies /> },
        { path: 'begreat/invites', element: <Invites /> },
        { path: 'begreat/config', element: <Config /> },
        { path: 'begreat/occupations', element: <Occupations /> },
      ],
    },
  ],
);