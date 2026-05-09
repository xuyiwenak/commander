import SystemMonitor from '@/components/server/SystemMonitor';
import { mandisSystemApi } from '@/api/systemApi';

export default function SystemPage() {
  return <SystemMonitor api={mandisSystemApi} />;
}
