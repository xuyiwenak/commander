import { useState, useEffect, useCallback } from 'react';
import { Table, Input, DatePicker, Space, Tag, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { usersApi } from '@/api/adminApi';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface UserRow {
  openId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sessionCount: number;
  paidCount: number;
  latestStatus: string;
}

export default function Users() {
  const [data, setData] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [openIdFilter, setOpenIdFilter] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page, pageSize: 20 };
    if (openIdFilter) params['openId'] = openIdFilter;
    if (dateRange) { params['startDate'] = dateRange[0]; params['endDate'] = dateRange[1]; }

    usersApi.list(params)
      .then(res => {
        const d = (res.data as { data: { total: number; data: UserRow[] } }).data;
        setData(d.data);
        setTotal(d.total);
      })
      .finally(() => setLoading(false));
  }, [page, openIdFilter, dateRange]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: 'OpenID', dataIndex: 'openId', ellipsis: true },
    { title: '首次见到', dataIndex: 'firstSeenAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '最近活跃', dataIndex: 'lastSeenAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '测评次数', dataIndex: 'sessionCount' },
    { title: '付费次数', dataIndex: 'paidCount' },
    { title: '最新状态', dataIndex: 'latestStatus', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '操作',
      render: (_: unknown, row: UserRow) => (
        <Button type="link" onClick={() => void navigate(`/users/${row.openId}`)}>查看时间线</Button>
      ),
    },
  ];

  return (
    <>
      <Title level={4}>用户管理</Title>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="按 OpenID 搜索"
          onSearch={v => { setOpenIdFilter(v); setPage(1); }}
          allowClear
          style={{ width: 260 }}
        />
        <RangePicker
          onChange={v => {
            setDateRange(v ? [v[0]!.format('YYYY-MM-DD'), v[1]!.format('YYYY-MM-DD')] : null);
            setPage(1);
          }}
        />
      </Space>
      <Table
        rowKey="openId"
        dataSource={data}
        columns={columns}
        loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
      />
    </>
  );
}
