import { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Menu, Button, Avatar, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { APP_THEMES } from '@/config/theme';
import type { AppModule } from '@/app-modules/types';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

type NavItem = Required<MenuProps>['items'][number];

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

interface Props {
  module: AppModule;
}

export default function AppLayout({ module: mod }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { clearAuth, mandisInfo, begreatInfo } = useAuthStore();

  const [menuOpenKeys, setMenuOpenKeys] = useState<string[]>(() =>
    computeOpenKeys(mod.nav, location.pathname)
  );

  // 路由变化时自动展开父级菜单
  useEffect(() => {
    const newOpen = computeOpenKeys(mod.nav, location.pathname);
    if (newOpen.length > 0) {
      setMenuOpenKeys((prev) => Array.from(new Set([...prev, ...newOpen])));
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedKeys = computeSelectedKeys(mod.nav, location.pathname);

  const info = mod.appName === 'mandis' ? mandisInfo : begreatInfo;
  const displayName = info?.nickname ?? info?.account ?? info?.username ?? 'Admin';

  const handleLogout = () => {
    clearAuth(mod.appName);
    void navigate(`/login/${mod.appName}`);
  };

  return (
    <ConfigProvider theme={APP_THEMES[mod.appName]}>
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
            onOpenChange={(keys) => setMenuOpenKeys(keys as string[])}
            items={mod.nav}
            onClick={({ key }) => { if (key.startsWith('/')) void navigate(key); }}
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
            <Text strong style={{ fontSize: 15 }}>{mod.label}</Text>
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
    </ConfigProvider>
  );
}
