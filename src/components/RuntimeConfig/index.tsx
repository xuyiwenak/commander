import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Spin } from 'antd';
import type { AppName } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { type AppRuntimeConfig, fetchAppRuntimeConfig } from '@/config/runtime';

const APP_NAMES: AppName[] = ['mandis', 'begreat'];

type ConfigMap = Record<AppName, AppRuntimeConfig>;

interface RuntimeConfigCtx {
  configs: ConfigMap | null;
  refetch: () => Promise<void>;
}

const RuntimeConfigContext = createContext<RuntimeConfigCtx>({
  configs: null,
  refetch: async () => {},
});

export function RuntimeConfigProvider({ children }: { children: React.ReactNode }) {
  const [configs, setConfigs] = useState<ConfigMap | null>(null);
  const fetchingRef = useRef(false);

  const load = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const results = await Promise.all(APP_NAMES.map(fetchAppRuntimeConfig));
      const map = Object.fromEntries(
        results.map((cfg) => [cfg.appName, cfg]),
      ) as ConfigMap;
      setConfigs(map);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // 首次加载
  useEffect(() => { void load(); }, [load]);

  // 任意 app 登录后重新拉取，确保加载 Redis 中保存的自定义配置
  useEffect(() => {
    let prevTokens = [
      useAuthStore.getState().mandisToken,
      useAuthStore.getState().begreatToken,
    ] as const;

    return useAuthStore.subscribe(
      (state) => {
        const nextTokens = [state.mandisToken, state.begreatToken] as const;
        const changed = prevTokens[0] !== nextTokens[0] || prevTokens[1] !== nextTokens[1];
        prevTokens = nextTokens;
        if (changed) {
          void load();
        }
      },
    );
  }, [load]);

  const ctx = useMemo(() => ({ configs, refetch: load }), [configs, load]);

  if (!configs) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载配置..." />
      </div>
    );
  }

  return (
    <RuntimeConfigContext.Provider value={ctx}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig(appName: AppName): AppRuntimeConfig {
  const { configs } = useContext(RuntimeConfigContext);
  if (!configs) throw new Error('useRuntimeConfig must be used inside RuntimeConfigProvider');
  return configs[appName];
}

export function useRefetchConfig(): () => Promise<void> {
  return useContext(RuntimeConfigContext).refetch;
}
