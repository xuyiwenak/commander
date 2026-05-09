import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import { APP_MODULES } from '@/app-modules';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/mandis/dashboard" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/login/:app', element: <Login /> },

  // 每个 app 模块自动注册为独立路由树
  ...APP_MODULES.map((mod) => ({
    path: mod.prefix,
    element: (
      <AuthGuard appName={mod.appName}>
        <AppLayout module={mod} />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to={mod.loginRedirect} replace /> },
      ...mod.routes,
    ],
  })),
]);
