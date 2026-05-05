import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Spin } from 'antd';
import dayjs from 'dayjs';
import { invitesApi } from '@/api/adminApi';

const { Title } = Typography;

interface InviteStats {
  totalInviteCodes: number;
  totalRedeemed: number;
  totalUnlocked: number;
  conversionRate: number;
  topInviters: { openId: string; redeemCount: number }[];
}

interface InviteRow {
  code: string;
  openId: string;
  totalInvited: number;
  createdAt: string;
}

export default function Invites() {
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [list, setList] = useState<InviteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invitesApi.stats()
      .then(res => setStats((res.data as { data: InviteStats }).data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    invitesApi.list({ page, pageSize: 20 })
      .then(res => {
        const d = (res.data as { data: { total: number; data: InviteRow[] } }).data;
        setList(d.data);
        setTotal(d.total);
      });
  }, [page]);

  const columns = [
    { title: '邀请码', dataIndex: 'code' },
    { title: '邀请人 OpenID', dataIndex: 'openId', ellipsis: true },
    { title: '邀请成功次数', dataIndex: 'totalInvited' },
    { title: '生成时间', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
  ];

  if (loading) return <Spin />;

  return (
    <>
      <Title level={4}>邀请裂变</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="总邀请码数" value={stats?.totalInviteCodes ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="成功兑换次数" value={stats?.totalRedeemed ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="邀请解锁报告" value={stats?.totalUnlocked ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="兑换率" value={stats?.conversionRate ?? 0} suffix="%" /></Card></Col>
      </Row>
      <Table rowKey="code" dataSource={list} columns={columns} pagination={{ current: page, total, pageSize: 20, onChange: setPage }} />
    </>
  );
}
