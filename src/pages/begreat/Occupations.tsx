import { useState, useEffect, useCallback } from 'react';
import { Table, Select, Button, Modal, message, Space, Tag, Typography, Alert } from 'antd';
import { occupationsApi } from '@/api/adminApi';

const { Title, Text } = Typography;

interface OccupationRow {
  code: string;
  title: string;
  isActive: boolean;
  requiredBig5: Record<string, number>;
  industry?: { primary: string };
}

interface SeedPreview {
  count: number;
  records: unknown[];
}

export default function Occupations() {
  const [data, setData] = useState<OccupationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isActiveFilter, setIsActiveFilter] = useState<string>('');
  const [preview, setPreview] = useState<SeedPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page, pageSize: 50 };
    if (isActiveFilter !== '') params['isActive'] = isActiveFilter;
    occupationsApi.list(params)
      .then(res => {
        const d = (res.data as { data: { total: number; data: OccupationRow[] } }).data;
        setData(d.data);
        setTotal(d.total);
      })
      .finally(() => setLoading(false));
  }, [page, isActiveFilter]);

  useEffect(() => { load(); }, [load]);

  const handlePreview = () => {
    occupationsApi.seedPreview()
      .then(res => {
        setPreview((res.data as { data: SeedPreview }).data);
        setPreviewOpen(true);
      })
      .catch(() => void message.error('seed 文件不存在或格式错误'));
  };

  const handleImport = async (reset: boolean) => {
    setImporting(true);
    try {
      const res = await occupationsApi.seedImport(reset);
      const result = (res.data as { data: { upserted: number; errors: string[] } }).data;
      void message.success(`导入完成：${result.upserted} 条`);
      if (result.errors.length > 0) void message.warning(`${result.errors.length} 条跳过：${result.errors[0]}`);
      setPreviewOpen(false);
      setResetConfirmOpen(false);
      load();
    } catch {
      void message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 80 },
    { title: '职业名称', dataIndex: 'title' },
    { title: '行业', render: (_: unknown, r: OccupationRow) => r.industry?.primary ?? '-' },
    { title: '状态', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '激活' : '停用'}</Tag> },
    {
      title: '五维要求',
      render: (_: unknown, r: OccupationRow) => (
        <Text style={{ fontSize: 12 }}>
          {Object.entries(r.requiredBig5 ?? {}).map(([k, v]) => `${k}:${v}`).join(' ')}
        </Text>
      ),
    },
  ];

  return (
    <>
      <Title level={4}>职业管理</Title>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="状态筛选"
          style={{ width: 120 }}
          allowClear
          onChange={v => { setIsActiveFilter(v as string ?? ''); setPage(1); }}
          options={[{ value: 'true', label: '激活' }, { value: 'false', label: '停用' }]}
        />
        <Button onClick={handlePreview}>预览 Seed 文件</Button>
        <Button danger onClick={() => setResetConfirmOpen(true)}>清空重导</Button>
      </Space>

      <Table rowKey="code" dataSource={data} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 50, onChange: setPage }} />

      {/* Seed 预览弹窗 */}
      <Modal
        title={`Seed 文件预览（共 ${preview?.count ?? 0} 条）`}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setPreviewOpen(false)}>取消</Button>,
          <Button key="import" type="primary" loading={importing} onClick={() => void handleImport(false)}>确认导入（Upsert）</Button>,
        ]}
        width={600}
      >
        <Text type="secondary">以下为 seed 文件中的前5条数据预览，确认后点击导入：</Text>
        <pre style={{ maxHeight: 300, overflow: 'auto', fontSize: 12, background: '#f5f5f5', padding: 8, marginTop: 8 }}>
          {JSON.stringify(preview?.records?.slice(0, 5), null, 2)}
        </pre>
      </Modal>

      {/* 清空重导二次确认 */}
      <Modal
        title="清空重导确认"
        open={resetConfirmOpen}
        onCancel={() => setResetConfirmOpen(false)}
        onOk={() => void handleImport(true)}
        confirmLoading={importing}
        okText="确认清空重导"
        okButtonProps={{ danger: true }}
      >
        <Alert type="error" showIcon message="此操作将清空所有职业数据后重新导入 seed 文件，不可撤销！" style={{ marginBottom: 12 }} />
        <Text>请确认 seed 文件已准备好，再执行此操作。</Text>
      </Modal>
    </>
  );
}
