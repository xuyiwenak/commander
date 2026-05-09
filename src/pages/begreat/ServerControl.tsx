import AppControlPanel from '@/components/server/AppControlPanel';
import { begreatSystemApi } from '@/api/systemApi';

export default function BegreatServerControl() {
  return <AppControlPanel appName="begreat" api={begreatSystemApi} />;
}
