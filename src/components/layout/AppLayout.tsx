import { useState, useEffect } from 'react';
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
  BarChartOutlined,
  SolutionOutlined,
  UserOutlined,
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
  { key: '/begreat/dashboard', icon: <BarChartOutlined />, label: '数据大盘' },
  {
    key: 'begreat-ops',
    icon: <SolutionOutlined />,
    label: '运营支持',
    children: [
      { key: '/begreat/users',     icon: <UserOutlined />,      label: '用户管理' },
      { key: '/begreat/sessions',  icon: <FileTextOutlined />,  label: '测评记录' },
      { key: '/begreat/payments',  icon: <PayCircleOutlined />, label: '支付管理' },
      { key: '/begreat/anomalies', icon: <WarningOutlined />,   label: '掉单修复' },
      { key: '/begreat/invites',   icon: <GiftOutlined />,      label: '邀请裂变' },
    ],
  },
  { key: '/begreat/occupations', icon: <BranchesOutlined />, label: '职业管理' },
  { key: '/begreat/config',      icon: <SettingOutlined />,  label: '系统配置' },
];

const APP_LABEL: Record<string, string> = {
  mandis: 'Mandis',
  begreat: 'BeGreat',
};

// 从 nav items + pathname 计算应展开的父级 key
function computeOpenKeys(items: NavItem[], pathname: string): string[] {
  return items
    .filter((item: any) =>
      item?.children?.some(
        (child: any) => pathname === child?.key || pathname.startsWith(String(child?.key ?? '___') + '/')
      )
    )
    .map((item: any) => String(item.key));
}

// 从 nav items + pathname 计算选中的叶子 key
function computeSelectedKeys(items: NavItem[], pathname: string): string[] {
  for (const item of items) {
    const i = item as any;
    if (i?.children) {
      const matched = i.children.find(
        (c: any) => pathname === c?.key || pathname.startsWith(String(c?.key ?? '___') + '/')
      );
      if (matched) return [String(matched.key)];
    } else if (pathname === i?.key) {
      return [String(i.key)];
    }
  }
  return [];
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentApp } = useAppStore();
  const { clearAuth, mandisInfo, begreatInfo } = useAuthStore();

  const navItems: NavItem[] = [...COMMON_NAV, ...(currentApp === 'mandis' ? MANDIS_NAV : BEGREAT_NAV)];
  const [menuOpenKeys, setMenuOpenKeys] = useState<string[]>(() =>
    computeOpenKeys(navItems, location.pathname)
  );

  // 切换 app 时重算展开状态
  useEffect(() => {
    const items = [...COMMON_NAV, ...(currentApp === 'mandis' ? MANDIS_NAV : BEGREAT_NAV)];
    setMenuOpenKeys(computeOpenKeys(items, location.pathname));
  }, [currentApp]); // eslint-disable-line react-hooks/exhaustive-deps

  // 路由变化时确保父级自动展开（如从页面内链接跳转到子路由）
  useEffect(() => {
    const newOpen = computeOpenKeys(navItems, location.pathname);
    if (newOpen.length > 0) {
      setMenuOpenKeys(prev => Array.from(new Set([...prev, ...newOpen])));
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedKeys = computeSelectedKeys(navItems, location.pathname);

  const info = currentApp === 'mandis' ? mandisInfo : begreatInfo;
  const displayName = info?.nickname ?? info?.account ?? info?.username ?? 'Admin';

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
          openKeys={menuOpenKeys}
          onOpenChange={keys => setMenuOpenKeys(keys as string[])}
          items={navItems}
          onClick={({ key }) => {
            if (key.startsWith('/')) void navigate(key);
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
