import { useState } from 'react';
import { Layout, Menu, Button, Avatar, Typography } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  FileTextOutlined,
  PayCircleOutlined,
  GiftOutlined,
  SettingOutlined,
  BranchesOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const MENU_ITEMS = [
  { key: '/dashboard',          icon: <DashboardOutlined />,  label: '数据大盘' },
  { key: '/users',              icon: <TeamOutlined />,        label: '用户管理' },
  { key: '/sessions',           icon: <FileTextOutlined />,    label: '测评记录' },
  { key: '/payments',           icon: <PayCircleOutlined />,   label: '支付管理' },
  { key: '/payments/anomalies', icon: <PayCircleOutlined />,   label: '掉单修复' },
  { key: '/invites',            icon: <GiftOutlined />,        label: '邀请裂变' },
  { key: '/config',             icon: <SettingOutlined />,     label: '系统配置' },
  { key: '/occupations',        icon: <BranchesOutlined />,    label: '职业管理' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { adminInfo, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    void navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ padding: '16px', textAlign: 'center', color: '#fff', fontWeight: 600 }}>
          {collapsed ? 'BG' : 'Begreat Admin'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={MENU_ITEMS}
          onClick={({ key }) => void navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <Avatar>{adminInfo?.username?.[0]?.toUpperCase()}</Avatar>
          <Text>{adminInfo?.username}</Text>
          <Button icon={<LogoutOutlined />} type="text" onClick={handleLogout}>退出</Button>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
