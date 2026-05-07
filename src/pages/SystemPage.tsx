import { Card, Typography } from 'antd';

const { Title } = Typography;

export default function SystemPage() {
  return (
    <>
      <Title level={4}>系统监控</Title>
      <Card>
        <p>系统监控功能将在后续版本中接入 Prometheus / Docker Stats。</p>
        <p>当前可通过服务器 SSH 查看实时状态。</p>
      </Card>
    </>
  );
}
