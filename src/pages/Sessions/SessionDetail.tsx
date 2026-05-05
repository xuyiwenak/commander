import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Tag, Descriptions, Progress, Modal, Input, message, Spin, Typography, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { sessionsApi } from '@/api/adminApi';

const { Title, Text } = Typography;

const DIM_LABEL: Record<string, string> = { O: '开放性', C: '尽责性', E: '外向性', A: '宜人性', N: '情绪稳定性' };

interface CareerMatch { title: string; matchScore: number }
interface Session {
  sessionId: string;
  openId: string;
  status: string;
  userProfile: { gender: string; age: number };
  createdAt: string;
  paidAt?: string;
  grantedByAdmin?: boolean;
  grantReason?: string;
  result?: {
    personalityLabel?: string;
    freeSummary?: string;
    big5Normalized?: Record<string, number>;
    topCareers?: CareerMatch[];
  };
}

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [grantReason, setGrantReason] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    if (!sessionId) return;
    setLoading(true);
    sessionsApi.detail(sessionId)
      .then(res => setSession((res.data as { data: Session }).data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGrant = async () => {
    if (!sessionId || !grantReason.trim()) return;
    setGranting(true);
    try {
      await sessionsApi.grant(sessionId, grantReason);
      void message.success('解锁成功');
      setModalOpen(false);
      setGrantReason('');
      load();
    } catch {
      void message.error('解锁失败');
    } finally {
      setGranting(false);
    }
  };

  if (loading) return <Spin />;
  if (!session) return <Text type="danger">Session 不存在</Text>;

  const big5 = session.result?.big5Normalized ?? {};

  return (
    <>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => void navigate('/sessions')}>返回列表</Button>
      </Space>
      <Title level={4}>测评详情</Title>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Session ID">{session.sessionId}</Descriptions.Item>
          <Descriptions.Item label="OpenID"><Text copyable>{session.openId}</Text></Descriptions.Item>
          <Descriptions.Item label="状态"><Tag>{session.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="性别/年龄">{session.userProfile.gender === 'male' ? '男' : '女'} {session.userProfile.age}岁</Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(session.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="付费时间">{session.paidAt ? dayjs(session.paidAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
          <Descriptions.Item label="性格标签" span={2}>{session.result?.personalityLabel ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="免费摘要" span={2}>{session.result?.freeSummary ?? '-'}</Descriptions.Item>
          {session.grantedByAdmin && <Descriptions.Item label="管理员解锁原因" span={2}><Tag color="red">{session.grantReason}</Tag></Descriptions.Item>}
        </Descriptions>
      </Card>

      {Object.keys(big5).length > 0 && (
        <Card title="大五人格得分" style={{ marginBottom: 16 }}>
          {Object.entries(big5).map(([dim, score]) => (
            <div key={dim} style={{ marginBottom: 8 }}>
              <Text style={{ display: 'inline-block', width: 80 }}>{DIM_LABEL[dim] ?? dim}</Text>
              <Progress percent={Math.round((score + 3) / 6 * 100)} format={() => score.toFixed(2)} style={{ width: 300, display: 'inline-flex' }} />
            </div>
          ))}
        </Card>
      )}

      {(session.result?.topCareers?.length ?? 0) > 0 && (
        <Card title="职业匹配结果" style={{ marginBottom: 16 }}>
          {session.result!.topCareers!.map((c, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <Text style={{ display: 'inline-block', width: 140 }}>{i + 1}. {c.title}</Text>
              <Progress percent={c.matchScore} style={{ width: 260, display: 'inline-flex' }} />
            </div>
          ))}
        </Card>
      )}

      {session.status !== 'paid' && session.status !== 'in_progress' && (
        <Button type="primary" danger onClick={() => setModalOpen(true)}>
          手动解锁报告
        </Button>
      )}

      <Modal
        title="手动解锁报告"
        open={modalOpen}
        onOk={() => void handleGrant()}
        confirmLoading={granting}
        onCancel={() => { setModalOpen(false); setGrantReason(''); }}
        okText="确认解锁"
      >
        <Text type="secondary">请填写解锁原因（将记录在 session 中）：</Text>
        <Input.TextArea
          rows={3}
          value={grantReason}
          onChange={e => setGrantReason(e.target.value)}
          placeholder="例：用户反馈支付成功但未解锁，客服核实后手动解锁"
          style={{ marginTop: 8 }}
        />
      </Modal>
    </>
  );
}
