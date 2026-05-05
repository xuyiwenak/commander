import { createBrowserRouter } from 'react-router-dom';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Users from '@/pages/Users';
import UserDetail from '@/pages/Users/UserDetail';
import Sessions from '@/pages/Sessions';
import SessionDetail from '@/pages/Sessions/SessionDetail';
import Payments from '@/pages/Payments';
import PaymentAnomalies from '@/pages/Payments/Anomalies';
import Invites from '@/pages/Invites';
import Config from '@/pages/Config';
import Occupations from '@/pages/Occupations';

export const router = createBrowserRouter(
  [
    { path: 'login', element: <Login /> },
    {
      path: '',
      element: <AuthGuard><AppLayout /></AuthGuard>,
      children: [
        { index: true, element: <Dashboard /> },
        { path: 'dashboard', element: <Dashboard /> },
        { path: 'users', element: <Users /> },
        { path: 'users/:openId', element: <UserDetail /> },
        { path: 'sessions', element: <Sessions /> },
        { path: 'sessions/:sessionId', element: <SessionDetail /> },
        { path: 'payments', element: <Payments /> },
        { path: 'payments/anomalies', element: <PaymentAnomalies /> },
        { path: 'invites', element: <Invites /> },
        { path: 'config', element: <Config /> },
        { path: 'occupations', element: <Occupations /> },
      ],
    },
  ],
  { basename: '/admin' }
);
