import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { http } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import type { AppName } from '@/store/appStore';

interface Props {
  appName: AppName;
  children: React.ReactNode;
}

export default function AuthGuard({ appName, children }: Props) {
  const { mandisToken, begreatToken, clearAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  // 从各自的 localStorage key 读取 token，不依赖 currentApp store 状态
  const token =
    appName === 'mandis'
      ? (mandisToken ?? localStorage.getItem('mandis_admin_token'))
      : (begreatToken ?? localStorage.getItem('begreat_admin_token'));

  useEffect(() => {
    let active = true;

    if (!token) {
      setValid(false);
      setChecking(false);
      return;
    }

    // mandis 后端没有 /auth/me，token 存在即视为有效
    if (appName === 'mandis') {
      setValid(true);
      setChecking(false);
      return;
    }

    // begreat 后端验证 token 有效性
    http
      .get('/begreat-admin/auth/me')
      .then(() => { if (active) setValid(true); })
      .catch(() => {
        if (active) {
          setValid(false);
          clearAuth(appName);
        }
      })
      .finally(() => { if (active) setChecking(false); });

    return () => { active = false; };
  }, [appName, token, clearAuth]);

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (token && valid)
    ? <>{children}</>
    : <Navigate to={`/login/${appName}`} replace />;
}
