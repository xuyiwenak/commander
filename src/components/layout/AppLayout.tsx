import { useState } from 'react';
import { Layout, Menu, Button, Avatar, Typography, Segmented } from 'antd';
import {
  DashboardOutlined,
  MonitorOutlined,
  TeamOutlined,
  ImageOutlined,
  MessageOutlined,
  FileTextOutlined,
  PayCircleOutlined,
  WarningOutlined,
  GiftOutlined,
  SettingOutlined,
  BranchesOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore, type AppName } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const COMMON_NAV = [
  { key: '/dashboard',  icon: <DashboardOutlined />, label: 'BI 仪表盘' },
  { key: '/system',     icon: <MonitorOutlined />,    label: '系统监控' },
];

const MANDIS_NAV = [
  { key: '/mandis/users',    icon: <TeamOutlined />,     label: '用户管理' },
  { key: '/mandis/works',    icon: <ImageOutlined />,     label: '作品管理' },
  { key: '/mandis/feedback', icon: <MessageOutlined />,   label: '反馈管理' },
];

const BEGREAT_NAV = [
  { key: '/begreat/sessions',    icon: <FileTextOutlined />,  label: '测评记录' },
  { key: '/begreat/payments',    icon: <PayCircleOutlined />, label: '支付管理' },
  { key: '/begreat/anomalies',   icon: <WarningOutlined />,   label: '掉单修复' },
  { key: '/begreat/invites',     icon: <GiftOutlined />,      label: '邀请裂变' },
  { key: '/begreat/config',      icon: <SettingOutlined />,   label: '系统配置' },
  { key: '/begreat/occupations', icon: <BranchesOutlined />,  label: '职业管理' },
];

const APP_OPTIONS: { label: string; value: AppName }[] = [
  { label: 'Mandis', value: 'mandis' },
  { label: 'BeGreat', value: 'begreat' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentApp, setApp } = useAppStore();
  const { clearAuth, mandisInfo, begreatInfo } = useAuthStore();

  const navItems = [...COMMON_NAV, ...(currentApp === 'mandis' ? MANDIS_NAV : BEGREAT_NAV)];

  const info = currentApp === 'mandis' ? mandisInfo : begreatInfo;
  const displayName = info?.nickname ?? info?.account ?? info?.username ?? 'Admin';

  const handleLogout = () => {
    clearAuth(currentApp);
    void navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ padding: '16px', textAlign: 'center', color: '#fff', fontWeight: 600 }}>
          {collapsed ? 'CMD' : 'Commander'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={navItems}
          onClick={({ key }) => void navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Segmented
            options={APP_OPTIONS}
            value={currentApp}
            onChange={(val) => setApp(val as AppName)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar>{displayName[0]?.toUpperCase()}</Avatar>
            <Text>{displayName}</Text>
            <Button icon={<LogoutOutlined />} type="text" onClick={handleLogout}>退出</Button>
          </div>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
