import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentApp } = useAppStore();
  const { mandisToken, begreatToken, clearAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  const token = currentApp === 'mandis' ? mandisToken : begreatToken;

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    // mandis 后端没有 /auth/me，只检查 token 存在
    if (currentApp === 'mandis') {
      setValid(true);
      setChecking(false);
      return;
    }
    // begreat 后端验证 token
    import('@/api/client').then(({ http }) => {
      http.get('/begreat-admin/auth/me')
        .then(() => setValid(true))
        .catch(() => clearAuth(currentApp))
        .finally(() => setChecking(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (token && valid) ? <>{children}</> : <Navigate to="/login" replace />;
}
