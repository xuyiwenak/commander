import { useState } from 'react';
import { Layout, Menu, Button, Avatar, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  MonitorOutlined,
  TeamOutlined,
  PictureOutlined,
  MessageOutlined,
  FileTextOutlined,
  PayCircleOutlined,
  WarningOutlined,
  GiftOutlined,
  SettingOutlined,
  BranchesOutlined,
  LogoutOutlined,
  CloudServerOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

type NavItem = Required<MenuProps>['items'][number];

const COMMON_NAV: NavItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'BI 仪表盘' },
  { key: '/system',    icon: <MonitorOutlined />,    label: '系统监控' },
  {
    key: 'server-group',
    icon: <CloudServerOutlined />,
    label: '服务器管理',
    children: [
      { key: '/server-control',       icon: <CloudServerOutlined />, label: '应用控制台' },
      { key: '/server-control/nginx', icon: <CodeOutlined />,        label: 'Nginx 配置' },
    ],
  },
];

const MANDIS_NAV: NavItem[] = [
  { key: '/mandis/users',    icon: <TeamOutlined />,    label: '用户管理' },
  { key: '/mandis/works',    icon: <PictureOutlined />,  label: '作品管理' },
  { key: '/mandis/feedback', icon: <MessageOutlined />,  label: '反馈管理' },
];

const BEGREAT_NAV: NavItem[] = [
  { key: '/begreat/sessions',    icon: <FileTextOutlined />,  label: '测评记录' },
  { key: '/begreat/payments',    icon: <PayCircleOutlined />, label: '支付管理' },
  { key: '/begreat/anomalies',   icon: <WarningOutlined />,   label: '掉单修复' },
  { key: '/begreat/invites',     icon: <GiftOutlined />,      label: '邀请裂变' },
  { key: '/begreat/config',      icon: <SettingOutlined />,   label: '系统配置' },
  { key: '/begreat/occupations', icon: <BranchesOutlined />,  label: '职业管理' },
];

const APP_LABEL: Record<string, string> = {
  mandis: 'Mandis',
  begreat: 'BeGreat',
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentApp } = useAppStore();
  const { clearAuth, mandisInfo, begreatInfo } = useAuthStore();

  const navItems: NavItem[] = [...COMMON_NAV, ...(currentApp === 'mandis' ? MANDIS_NAV : BEGREAT_NAV)];

  const info = currentApp === 'mandis' ? mandisInfo : begreatInfo;
  const displayName = info?.nickname ?? info?.account ?? info?.username ?? 'Admin';

  // 计算选中的 key：如果有子菜单匹配，展开父菜单并选中子项
  const selectedKeys = [location.pathname];
  const openKeys = COMMON_NAV
    .filter((item: any) => item && 'children' in item && item.children?.some((child: any) => child?.key === location.pathname))
    .map((item: any) => item.key);

  const handleLogout = () => {
    clearAuth(currentApp);
    void navigate(`/login/${currentApp}`);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{
          padding: '18px 16px', textAlign: 'center',
          color: '#fff', fontWeight: 700, fontSize: collapsed ? 14 : 18,
          letterSpacing: collapsed ? 0 : 1,
        }}>
          {collapsed ? 'CMD' : 'Commander'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          items={navItems}
          onClick={({ key }) => {
            if (!key.includes('server-group')) void navigate(key);
          }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          height: 52,
        }}>
          <Text strong style={{ fontSize: 15 }}>{APP_LABEL[currentApp]}</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={28}>{displayName[0]?.toUpperCase()}</Avatar>
            <Text style={{ fontSize: 13 }}>{displayName}</Text>
            <Button icon={<LogoutOutlined />} type="text" size="small" onClick={handleLogout}>退出</Button>
          </div>
        </Header>
        <Content style={{
          margin: 20, padding: 28,
          background: '#f5f5f7', borderRadius: 12,
          minHeight: 'calc(100vh - 92px)',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}