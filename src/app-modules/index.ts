import { mandisModule } from './mandis';
import { begreatModule } from './begreat';
import type { AppModule } from './types';

export type { AppModule };

// 在这里注册所有 app 模块。新增 app 只需：
// 1. 新建 src/app-modules/<appName>/index.tsx
// 2. 在此处 import 并加入 APP_MODULES
export const APP_MODULES: AppModule[] = [mandisModule, begreatModule];

export function getModuleByApp(appName: string): AppModule | undefined {
  return APP_MODULES.find((m) => m.appName === appName);
}

export function getModuleByPath(pathname: string): AppModule | undefined {
  return APP_MODULES.find((m) => pathname === m.prefix || pathname.startsWith(m.prefix + '/'));
}
