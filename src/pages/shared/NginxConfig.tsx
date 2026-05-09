import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import NginxEditor from '@/components/server/NginxEditor';
import { createSystemApi } from '@/api/systemApi';
import type { AppName } from '@/store/appStore';

export default function NginxConfig() {
  const appName = useLocation().pathname.split('/')[1] as AppName;
  const api = useMemo(() => createSystemApi(appName), [appName]);
  return <NginxEditor api={api} />;
}
