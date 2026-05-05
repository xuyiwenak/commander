import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timeline, Card, Tag, Button, Spin, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usersApi } from '@/api/adminApi';

const { Title, Text } = Typography;

interface TimelineEvent {
  type: string;
  timestamp: string;
  detail: Record<string, unknown>;
}

const EVENT_CONFIG: Record<string, { label: string; color: string }> = {
  session_start:         { label: '开始测评',   color: 'blue' },
  session_complete:      { label: '完成测评',   color: 'cyan' },
  payment_created:       { label: '发起支付',   color: 'orange' },
  payment_success:       { label: '支付成功',   color: 'green' },
  invite_code_generated: { label: '生成邀请码', color: 'purple' },
  invite_redeemed:       { label: '邀请成功',   color: 'gold' },
  admin_grant:           { label: '管理员解锁', color: 'red' },
};

export default function UserDetail() {
  const { openId } = useParams<{ openId: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!openId) return;
    usersApi.timeline(openId)
      .then(res => setEvents((res.data as { data: { events: TimelineEvent[] } }).data.events))
      .finally(() => setLoading(false));
  }, [openId]);

  return (
    <>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => void navigate('/users')} style={{ marginBottom: 8 }}>
        返回用户列表
      </Button>
      <Title level={4}>用户时间线</Title>
      <Text type="secondary" copyable>{openId}</Text>

      <Card style={{ marginTop: 16 }}>
        {loading ? <Spin /> : (
          <Timeline
            items={events.map(e => {
              const cfg = EVENT_CONFIG[e.type] ?? { label: e.type, color: 'gray' };
              return {
                color: cfg.color,
                children: (
                  <div>
                    <Tag color={cfg.color}>{cfg.label}</Tag>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      {dayjs(e.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                    </Text>
                    <pre style={{ fontSize: 12, marginTop: 4, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                      {JSON.stringify(e.detail, null, 2)}
                    </pre>
                  </div>
                ),
              };
            })}
          />
        )}
        {!loading && events.length === 0 && <Text type="secondary">暂无事件记录</Text>}
      </Card>
    </>
  );
}
