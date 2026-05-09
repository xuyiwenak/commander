import { useState, useEffect, useCallback } from 'react';
import { Table, Input, DatePicker, Space, Tag, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { usersApi } from '@/api/adminApi';

const { Title } = Typography;
const { RangePicker } = DatePicker;

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
    if (dateRange) {
      params['startDate'] = dateRange[0];
      params['endDate'] = dateRange[1];
    }
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
    {
      title: 'OpenID',
      dataIndex: 'openId',
      ellipsis: true,
      render: (v: string) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => void navigate(`/begreat/users/${v}`)}>
          {v}
        </Button>
      ),
    },
    { title: '测评次数', dataIndex: 'sessionCount', width: 90 },
    {
      title: '付费次数',
      dataIndex: 'paidCount',
      width: 90,
      render: (v: number) => v > 0 ? <Tag color="green">{v}</Tag> : <span style={{ color: '#999' }}>0</span>,
    },
    {
      title: '最新状态',
      dataIndex: 'latestStatus',
      width: 110,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: '首次见到',
      dataIndex: 'firstSeenAt',
      width: 150,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '最近活动',
      dataIndex: 'lastSeenAt',
      width: 150,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 90,
      render: (_: unknown, r: UserRow) => (
        <Button type="link" size="small" onClick={() => void navigate(`/begreat/users/${r.openId}`)}>
          行为时间线
        </Button>
      ),
    },
  ];

  return (
    <>
      <Title level={4}>用户管理</Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="按 OpenID 搜索"
          onSearch={v => { setOpenIdFilter(v); setPage(1); }}
          allowClear
          style={{ width: 280 }}
        />
        <RangePicker
          placeholder={['首次见到 起', '首次见到 止']}
          onChange={v => {
            if (v && v[0] && v[1]) {
              setDateRange([v[0].format('YYYY-MM-DD'), v[1].format('YYYY-MM-DD')]);
            } else {
              setDateRange(null);
            }
            setPage(1);
          }}
        />
      </Space>
      <Table
        rowKey="openId"
        dataSource={data}
        columns={columns}
        loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 位用户` }}
      />
    </>
  );
}
