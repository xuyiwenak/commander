import { createBrowserRouter } from 'react-router-dom';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import SystemPage from '@/pages/SystemPage';

// 懒加载页面
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

// begreat pages
const BegreatDashboard = () => Lazy(() => import('@/pages/begreat/Dashboard'));
const Sessions = () => Lazy(() => import('@/pages/begreat/Sessions'));
const SessionDetail = () => Lazy(() => import('@/pages/begreat/SessionDetail'));
const Payments = () => Lazy(() => import('@/pages/begreat/Payments'));
const PaymentAnomalies = () => Lazy(() => import('@/pages/begreat/PaymentAnomalies'));
const Invites = () => Lazy(() => import('@/pages/begreat/Invites'));
const Config = () => Lazy(() => import('@/pages/begreat/Config'));
const Occupations = () => Lazy(() => import('@/pages/begreat/Occupations'));

// mandis pages
const MandisUsers = () => Lazy(() => import('@/pages/mandis/UsersPage'));
const MandisWorks = () => Lazy(() => import('@/pages/mandis/WorksPage'));
const MandisFeedback = () => Lazy(() => import('@/pages/mandis/FeedbackPage'));

// BI dashboard
const DashboardPage = () => Lazy(() => import('@/pages/DashboardPage'));

export const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    {
      path: '/',
      element: <AuthGuard><AppLayout /></AuthGuard>,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'system', element: <SystemPage /> },
        // mandis
        { path: 'mandis/users', element: <MandisUsers /> },
        { path: 'mandis/works', element: <MandisWorks /> },
        { path: 'mandis/feedback', element: <MandisFeedback /> },
        // begreat
        { path: 'begreat/dashboard', element: <BegreatDashboard /> },
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
