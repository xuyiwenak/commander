import type { RouteObject } from 'react-router-dom';
import type { MenuProps } from 'antd';
import type { AppName } from '@/store/appStore';

type NavItem = Required<MenuProps>['items'][number];

export interface AppModule {
  appName: AppName;
  prefix: string;        // e.g. '/mandis'
  label: string;         // display name in sidebar header
  loginRedirect: string; // target path after login
  nav: NavItem[];        // sidebar items — keys must be absolute paths
  routes: RouteObject[]; // children relative to prefix
}
