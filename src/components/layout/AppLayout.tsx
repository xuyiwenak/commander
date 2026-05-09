import { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Menu, Avatar, Typography, Dropdown, App } from 'antd';
import type { MenuProps } from 'antd';
import { LogoutOutlined, LockOutlined, DownOutlined, UserOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { APP_THEMES } from '@/config/theme';
import type { AppModule } from '@/app-modules/types';
import ChangePasswordDrawer from './ChangePasswordDrawer';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

// ── 菜单工具函数 ──────────────────────────────────────────────────────────────

type NavItem = Required<MenuProps>['items'][number];

function computeOpenKeys(items: NavItem[], pathname: string): string[] {
  return items
    .filter((item: any) =>
      item?.children?.some(
        (child: any) => pathname === child?.key || pathname.startsWith(String(child?.key ?? '___') + '/')
      )
    )
    .map((item: any) => String(item.key));
}

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

// ── 账号下拉菜单 key 常量 ─────────────────────────────────────────────────────

const MENU_KEY_CHANGE_PASSWORD = 'change-password';
const MENU_KEY_LOGOUT           = 'logout';

// ── 颜色常量（与 DESIGN.md 一致） ────────────────────────────────────────────

const COLOR_SURFACE  = '#18181a';
const COLOR_BASE     = '#111113';
const COLOR_BORDER   = '#2e2e30';
const COLOR_ELEVATED = '#232325';
const COLOR_HOVER    = '#2c2c2e';
const COLOR_MUTED    = '#8d8d95';

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  module: AppModule;
}

// ── Component ─────────────────────────────────────────────────────────────────

function AppLayoutInner({ module: mod }: Props) {
  const [collapsed, setCollapsed]                   = useState(false);
  const [pwDrawerOpen, setPwDrawerOpen]             = useState(false);
  const navigate                                    = useNavigate();
  const location                                    = useLocation();
  const { clearAuth, mandisInfo, begreatInfo }      = useAuthStore();

  const [menuOpenKeys, setMenuOpenKeys] = useState<string[]>(() =>
    computeOpenKeys(mod.nav, location.pathname)
  );

  useEffect(() => {
    const newOpen = computeOpenKeys(mod.nav, location.pathname);
    if (newOpen.length > 0) {
      setMenuOpenKeys((prev) => Array.from(new Set([...prev, ...newOpen])));
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedKeys = computeSelectedKeys(mod.nav, location.pathname);
  const info         = mod.appName === 'mandis' ? mandisInfo : begreatInfo;
  const displayName  = info?.nickname ?? info?.account ?? info?.username ?? 'Admin';

  const handleLogout = () => {
    clearAuth(mod.appName);
    void navigate(`/login/${mod.appName}`);
  };

  const accountMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '2px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f2f2f7' }}>{displayName}</div>
          <div style={{ fontSize: 11, color: COLOR_MUTED, marginTop: 1 }}>管理员</div>
        </div>
      ),
      disabled: true,
      style: { cursor: 'default', padding: '8px 12px' },
    },
    { type: 'divider' },
    {
      key: MENU_KEY_CHANGE_PASSWORD,
      icon: <LockOutlined style={{ fontSize: 13 }} />,
      label: '修改密码',
    },
    { type: 'divider' },
    {
      key: MENU_KEY_LOGOUT,
      icon: <LogoutOutlined style={{ fontSize: 13 }} />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleAccountMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === MENU_KEY_CHANGE_PASSWORD) { setPwDrawerOpen(true); return; }
    if (key === MENU_KEY_LOGOUT)           { handleLogout(); }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: COLOR_BASE }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ borderRight: `1px solid ${COLOR_BORDER}` }}
      >
        <div style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 18px',
          borderBottom: `1px solid ${COLOR_BORDER}`,
          color: '#f2f2f7',
          fontWeight: 700,
          fontSize: collapsed ? 13 : 15,
          letterSpacing: '0.02em',
          flexShrink: 0,
        }}>
          {collapsed ? 'C' : 'Commander'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={menuOpenKeys}
          onOpenChange={(keys) => setMenuOpenKeys(keys as string[])}
          items={mod.nav}
          onClick={({ key }) => { if (key.startsWith('/')) void navigate(key); }}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ background: COLOR_BASE }}>
        <Header style={{
          background:   COLOR_SURFACE,
          borderBottom: `1px solid ${COLOR_BORDER}`,
          padding:      '0 20px',
          height:       52,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          flexShrink:   0,
        }}>
          <Text style={{ fontSize: 13, color: COLOR_MUTED, fontWeight: 400 }}>
            {mod.label}
          </Text>

          <Dropdown
            menu={{ items: accountMenuItems, onClick: handleAccountMenuClick }}
            trigger={['click']}
            placement="bottomRight"
            overlayStyle={{
              minWidth: 188,
              background: COLOR_ELEVATED,
              border: `1px solid ${COLOR_BORDER}`,
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display:     'flex',
              alignItems:  'center',
              gap:         8,
              cursor:      'pointer',
              padding:     '4px 8px',
              borderRadius: 6,
              transition:  'background 150ms ease-out',
              userSelect:  'none',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = COLOR_HOVER; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Avatar
                size={24}
                icon={<UserOutlined style={{ fontSize: 12 }} />}
                style={{ background: '#2c2c2e', color: '#8d8d95', flexShrink: 0 }}
              >
                {displayName[0]?.toUpperCase()}
              </Avatar>
              <Text style={{ fontSize: 13, color: '#f2f2f7', lineHeight: 1 }}>
                {displayName}
              </Text>
              <DownOutlined style={{ fontSize: 10, color: COLOR_MUTED }} />
            </div>
          </Dropdown>
        </Header>

        <Content style={{
          margin:       20,
          padding:      24,
          background:   COLOR_BASE,
          borderRadius: 10,
          border:       `1px solid ${COLOR_BORDER}`,
          minHeight:    'calc(100vh - 92px)',
          overflow:     'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>

      <ChangePasswordDrawer
        open={pwDrawerOpen}
        appName={mod.appName}
        onClose={() => setPwDrawerOpen(false)}
      />
    </Layout>
  );
}

export default function AppLayout({ module: mod }: Props) {
  return (
    <ConfigProvider theme={APP_THEMES[mod.appName]}>
      <App>
        <AppLayoutInner module={mod} />
      </App>
    </ConfigProvider>
  );
}
