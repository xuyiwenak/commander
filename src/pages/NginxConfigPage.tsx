import NginxEditor from '@/components/server/NginxEditor';
import { mandisSystemApi } from '@/api/systemApi';

export default function NginxConfigPage() {
  return <NginxEditor api={mandisSystemApi} />;
}
