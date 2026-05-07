import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppName = 'mandis' | 'begreat';

interface AppState {
  currentApp: AppName;
  setApp: (app: AppName) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentApp: 'mandis',
      setApp: (app: AppName) => set({ currentApp: app }),
    }),
    { name: 'commander-app' },
  ),
);
