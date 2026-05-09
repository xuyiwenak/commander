import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Space, Spin, Timeline, Tag, Card } from 'antd';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  PayCircleOutlined,
  GiftOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { usersApi } from '@/api/adminApi';

const { Title, Text } = Typography;

const EVENT_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  session_start:           { label: '开始测评',     color: 'blue',   icon: <FileTextOutlined /> },
  session_complete:        { label: '完成测评',     color: 'cyan',   icon: <CheckCircleOutlined /> },
  payment_created:         { label: '发起支付',     color: 'gold',   icon: <PayCircleOutlined /> },
  payment_success:         { label: '支付成功',     color: 'green',  icon: <PayCircleOutlined /> },
  invite_code_generated:   { label: '生成邀请码',   color: 'purple', icon: <GiftOutlined /> },
  invite_redeemed:         { label: '邀请码被使用', color: 'orange', icon: <PlusCircleOutlined /> },
  admin_grant:             { label: '管理员解锁',   color: 'red',    icon: <ToolOutlined /> },
};

interface TimelineEvent {
  type: string;
  timestamp: string;
  detail: Record<string, unknown>;
}

function renderDetail(detail: Record<string, unknown>): React.ReactNode {
  const entries = Object.entries(detail).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return null;
  return (
    <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ marginRight: 16 }}>
          {k}：<Text code style={{ fontSize: 11 }}>{String(v)}</Text>
        </span>
      ))}
    </div>
  );
}

export default function UserDetail() {
  const { openId } = useParams<{ openId: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!openId) return;
    setLoading(true);
    usersApi.timeline(openId)
      .then(res => {
        const d = (res.data as { data: { events: TimelineEvent[] } }).data;
        setEvents(d.events ?? []);
      })
      .finally(() => setLoading(false));
  }, [openId]);

  const paidCount = events.filter(e => e.type === 'payment_success').length;
  const sessionCount = events.filter(e => e.type === 'session_start').length;

  const timelineItems = events.map(e => {
    const meta = EVENT_META[e.type] ?? { label: e.type, color: 'gray', icon: null };
    return {
      color: meta.color,
      dot: meta.icon,
      children: (
        <div>
          <Space size={8}>
            <Text strong>{meta.label}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(e.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            </Text>
          </Space>
          {renderDetail(e.detail)}
        </div>
      ),
    };
  });

  if (loading) return <Spin />;

  return (
    <>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => void navigate('/begreat/users')}>
          返回用户列表
        </Button>
      </Space>

      <Title level={4}>用户行为时间线</Title>

      <Space style={{ marginBottom: 20 }}>
        <Text type="secondary" copyable>{openId}</Text>
        <Tag color="blue">{sessionCount} 次测评</Tag>
        {paidCount > 0 && <Tag color="green">{paidCount} 次付费</Tag>}
      </Space>

      {events.length === 0 ? (
        <Card>
          <Text type="secondary">该用户暂无行为记录</Text>
        </Card>
      ) : (
        <Card>
          <Timeline items={timelineItems} />
        </Card>
      )}
    </>
  );
}
