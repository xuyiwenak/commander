import { useState } from 'react';
import { Card, Form, Input, Button, Segmented, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAppStore, type AppName } from '@/store/appStore';

const { Title } = Typography;

export default function Login() {
  const [app, setApp] = useState<AppName>('mandis');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginMandis, loginBegreat } = useAuthStore();
  const { setApp: setAppStore } = useAppStore();

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    // 必须在登录请求前设置 currentApp，以便 axios 拦截器注入正确的 token
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
          Commander
        </Title>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Segmented
            options={[
              { label: 'Mandis', value: 'mandis' as const },
              { label: 'BeGreat', value: 'begreat' as const },
            ]}
            value={app}
            onChange={(val) => setApp(val as AppName)}
          />
        </div>
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input placeholder={app === 'mandis' ? 'admin 账号' : 'begreat 管理员账号'} />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录 {app === 'mandis' ? 'Mandis' : 'BeGreat'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
