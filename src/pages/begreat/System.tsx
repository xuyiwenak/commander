import SystemMonitor from '@/components/server/SystemMonitor';
import { begreatSystemApi } from '@/api/systemApi';

export default function BegreatSystem() {
  return <SystemMonitor api={begreatSystemApi} />;
}
