import AppControlPanel from '@/components/server/AppControlPanel';
import { mandisSystemApi } from '@/api/systemApi';

export default function ServerControlPage() {
  return <AppControlPanel appName="mandis" api={mandisSystemApi} />;
}
