import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import AppControlPanel from '@/components/server/AppControlPanel';
import { createSystemApi } from '@/api/systemApi';
import type { AppName } from '@/store/appStore';

export default function ServerControl() {
  const appName = useLocation().pathname.split('/')[1] as AppName;
  const api = useMemo(() => createSystemApi(appName), [appName]);
  return <AppControlPanel appName={appName} api={api} />;
}
