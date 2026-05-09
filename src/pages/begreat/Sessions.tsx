import { useState, useEffect, useCallback } from 'react';
import { Table, Select, Input, Space, Tag, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { sessionsApi } from '@/api/adminApi';

const { Title } = Typography;

const STATUS_COLOR: Record<string, string> = {
  in_progress:     'default',
  completed:       'blue',
  paid:            'green',
  invite_unlocked: 'orange',
};

const STATUS_LABEL: Record<string, string> = {
  in_progress:     '进行中',
  completed:       '已完成',
  paid:            '已付费',
  invite_unlocked: '邀请解锁',
};

interface SessionRow {
  sessionId: string;
  openId: string;
  status: string;
  assessmentType: string;
  userProfile: { gender: string; age: number };
  result?: { personalityLabel?: string };
  createdAt: string;
  paidAt?: string;
  grantedByAdmin?: boolean;
}

export default function Sessions() {
  const [data, setData] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [openIdFilter, setOpenIdFilter] = useState('');
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page, pageSize: 20 };
    if (statusFilter.length) params['status'] = statusFilter.join(',');
    if (openIdFilter) params['openId'] = openIdFilter;
    sessionsApi.list(params)
      .then(res => {
        const d = (res.data as { data: { total: number; data: SessionRow[] } }).data;
        setData(d.data);
        setTotal(d.total);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, openIdFilter]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: 'Session ID', dataIndex: 'sessionId', ellipsis: true },
    { title: 'OpenID', dataIndex: 'openId', ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] ?? v}</Tag> },
    { title: '性格标签', render: (_: unknown, r: SessionRow) => r.result?.personalityLabel ?? '-' },
    { title: '性别/年龄', render: (_: unknown, r: SessionRow) => `${r.userProfile.gender === 'male' ? '男' : '女'} ${r.userProfile.age}岁` },
    { title: '创建时间', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '管理员解锁', dataIndex: 'grantedByAdmin', render: (v: boolean) => v ? <Tag color="red">是</Tag> : '-' },
    {
      title: '操作',
      render: (_: unknown, r: SessionRow) => (
        <Button type="link" onClick={() => void navigate(`/begreat/sessions/${r.sessionId}`)}>详情</Button>
      ),
    },
  ];

  return (
    <>
      <Title level={4}>测评记录</Title>
      <Space style={{ marginBottom: 16 }}>
        <Select
          mode="multiple"
          placeholder="状态筛选"
          style={{ width: 260 }}
          onChange={v => { setStatusFilter(v as string[]); setPage(1); }}
          options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          allowClear
        />
        <Input.Search
          placeholder="按 OpenID 搜索"
          onSearch={v => { setOpenIdFilter(v); setPage(1); }}
          allowClear
          style={{ width: 240 }}
        />
      </Space>
      <Table
        rowKey="sessionId"
        dataSource={data}
        columns={columns}
        loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
      />
    </>
  );
}
