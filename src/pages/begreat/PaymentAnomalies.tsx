import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Input, message, Tag, Alert, Typography, Space } from 'antd';
import dayjs from 'dayjs';
import { paymentsApi } from '@/api/adminApi';

const { Title, Text } = Typography;

interface AnomalyRow {
  outTradeNo: string;
  sessionId: string;
  openId: string;
  amount: number;
  paidAt: string;
  sessionStatus: string;
}

export default function PaymentAnomalies() {
  const [data, setData] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [selected, setSelected] = useState<AnomalyRow | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    paymentsApi.anomalies()
      .then(res => setData((res.data as { data: { data: AnomalyRow[] } }).data.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFix = async () => {
    if (!selected || !reason.trim()) return;
    setFixing(true);
    try {
      await paymentsApi.fixAnomaly(selected.sessionId, selected.outTradeNo, reason);
      void message.success('掉单已修复，报告已解锁');
      setData(prev => prev.filter(r => r.sessionId !== selected.sessionId));
      setSelected(null);
      setReason('');
    } catch {
      void message.error('修复失败，请检查数据');
    } finally {
      setFixing(false);
    }
  };

  const columns = [
    { title: '订单号', dataIndex: 'outTradeNo', ellipsis: true },
    { title: 'Session ID', dataIndex: 'sessionId', ellipsis: true },
    { title: 'OpenID', dataIndex: 'openId', ellipsis: true },
    { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${(v / 100).toFixed(2)}` },
    { title: '支付时间', dataIndex: 'paidAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: 'Session 当前状态', dataIndex: 'sessionStatus', render: (v: string) => <Tag color="orange">{v}</Tag> },
    {
      title: '操作',
      render: (_: unknown, row: AnomalyRow) => (
        <Button type="primary" danger size="small" onClick={() => { setSelected(row); setReason(''); }}>
          修复掉单
        </Button>
      ),
    },
  ];

  return (
    <>
      <Title level={4}>掉单检测与修复</Title>

      {data.length === 0 && !loading && (
        <Alert type="success" message="当前无掉单，所有支付记录均已正常解锁" showIcon style={{ marginBottom: 16 }} />
      )}

      {data.length > 0 && (
        <Alert
          type="error"
          showIcon
          message={`发现 ${data.length} 笔掉单——支付成功但报告未解锁`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table rowKey="sessionId" dataSource={data} columns={columns} loading={loading} pagination={false} />

      <Modal
        title="确认修复掉单"
        open={!!selected}
        onOk={() => void handleFix()}
        confirmLoading={fixing}
        onCancel={() => { setSelected(null); setReason(''); }}
        okText="确认修复"
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>订单号：<Text strong>{selected?.outTradeNo}</Text></Text>
          <Text>Session：<Text strong>{selected?.sessionId}</Text></Text>
          <Text>金额：<Text strong>¥{((selected?.amount ?? 0) / 100).toFixed(2)}</Text></Text>
          <Text type="secondary" style={{ marginTop: 8 }}>修复原因（必填，将记录在 session 中）：</Text>
          <Input.TextArea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="例：用户反馈已扣款但报告未解锁，核实微信支付后台后确认支付成功，执行修复"
          />
        </Space>
      </Modal>
    </>
  );
}
