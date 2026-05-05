import { useState, useEffect, useCallback } from 'react';
import { Table, Select, Input, Space, Tag, Typography, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { paymentsApi } from '@/api/adminApi';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLOR: Record<string, string> = { pending: 'orange', success: 'green', failed: 'red' };
const STATUS_LABEL: Record<string, string> = { pending: '待支付', success: '成功', failed: '失败' };

interface PaymentRow {
  outTradeNo: string;
  sessionId: string;
  openId: string;
  amount: number;
  status: string;
  paidAt?: string;
  createdAt: string;
}

export default function Payments() {
  const [data, setData] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [openIdFilter, setOpenIdFilter] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page, pageSize: 20 };
    if (statusFilter) params['status'] = statusFilter;
    if (openIdFilter) params['openId'] = openIdFilter;
    if (dateRange) { params['startDate'] = dateRange[0]; params['endDate'] = dateRange[1]; }
    paymentsApi.list(params)
      .then(res => {
        const d = (res.data as { data: { total: number; data: PaymentRow[] } }).data;
        setData(d.data);
        setTotal(d.total);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, openIdFilter, dateRange]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: '订单号', dataIndex: 'outTradeNo', ellipsis: true },
    { title: 'Session ID', dataIndex: 'sessionId', ellipsis: true },
    { title: 'OpenID', dataIndex: 'openId', ellipsis: true },
    { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${(v / 100).toFixed(2)}` },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] ?? v}</Tag> },
    { title: '支付时间', dataIndex: 'paidAt', render: (v?: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '创建时间', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
  ];

  return (
    <>
      <Title level={4}>支付记录</Title>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="状态筛选"
          style={{ width: 120 }}
          allowClear
          onChange={v => { setStatusFilter(v as string ?? ''); setPage(1); }}
          options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
        />
        <Input.Search placeholder="按 OpenID" onSearch={v => { setOpenIdFilter(v); setPage(1); }} allowClear style={{ width: 220 }} />
        <RangePicker onChange={v => { setDateRange(v ? [v[0]!.format('YYYY-MM-DD'), v[1]!.format('YYYY-MM-DD')] : null); setPage(1); }} />
      </Space>
      <Table rowKey="outTradeNo" dataSource={data} columns={columns} loading={loading} pagination={{ current: page, total, pageSize: 20, onChange: setPage }} />
    </>
  );
}
