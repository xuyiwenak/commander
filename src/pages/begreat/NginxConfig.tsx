import NginxEditor from '@/components/server/NginxEditor';
import { begreatSystemApi } from '@/api/systemApi';

export default function BegreatNginxConfig() {
  return <NginxEditor api={begreatSystemApi} />;
}
