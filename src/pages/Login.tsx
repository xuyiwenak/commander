import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAppStore, type AppName } from '@/store/appStore';

const { Title } = Typography;

const APP_CONFIG: Record<AppName, { title: string; label: string }> = {
  mandis: { title: 'Mandis 艺术工作室', label: 'Mandis' },
  begreat: { title: 'BeGreat 职业测评', label: 'BeGreat' },
};

function resolveApp(param?: string): AppName {
  if (param === 'begreat') return 'begreat';
  return 'mandis';
}

export default function Login() {
  const { app: appParam } = useParams<{ app?: string }>();
  const app = resolveApp(appParam);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginMandis, loginBegreat } = useAuthStore();
  const { setApp: setAppStore } = useAppStore();
  const cfg = APP_CONFIG[app];

  // 无 app 参数时重定向到 /login/mandis
  useEffect(() => {
    if (!appParam) {
      navigate('/login/mandis', { replace: true });
    }
  }, [appParam, navigate]);

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    setAppStore(app);
    try {
      if (app === 'mandis') {
        await loginMandis(values.username, values.password);
      } else {
        await loginBegreat(values.username, values.password);
      }
      void navigate('/dashboard');
    } catch {
      message.error('登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: '#f5f5f5',
    }}>
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          {cfg.title}
        </Title>
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input placeholder={app === 'mandis' ? 'admin 账号' : 'begreat 管理员账号'} />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录 {cfg.label}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
