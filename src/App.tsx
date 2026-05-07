import { ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAppStore } from '@/store/appStore';
import { APP_THEMES } from '@/config/theme';

export default function App() {
  const currentApp = useAppStore((s) => s.currentApp);

  return (
    <ConfigProvider theme={APP_THEMES[currentApp]}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}
