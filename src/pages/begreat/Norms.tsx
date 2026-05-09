import { useState, useEffect, useCallback } from 'react';
import {
  Table, Select, Button, Modal, message, Space, Tag, Typography, Form,
  Input, InputNumber, Alert, Tooltip,
} from 'antd';
import { EditOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { normsApi } from '@/api/adminApi';

const { Text } = Typography;

interface NormRow {
  _id: string;
  normVersion: string;
  source: string;
  instrument: string;
  modelType: 'BIG5' | 'RIASEC';
  dimension: string;
  gender: 'all' | 'male' | 'female';
  ageGroup: string;
  mean: number;
  sd: number;
  sampleSize: number | null;
  isActive: boolean;
  createdAt?: string;
}

const GENDER_LABELS: Record<string, string> = { all: '全部', male: '男', female: '女' };

export default function Norms() {
  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [modelTypeFilter, setModelTypeFilter] = useState<string>('');
  const [data, setData] = useState<NormRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<NormRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ mean: number; sd: number; sampleSize: number | null; source: string; instrument: string }>();

  const [activateOpen, setActivateOpen] = useState(false);
  const [activating, setActivating] = useState(false);

  const loadVersions = useCallback(() => {
    normsApi.versions()
      .then(res => {
        const vs = res.data as string[];
        setVersions(vs);
        if (vs.length > 0 && !selectedVersion) setSelectedVersion(vs[0]);
      })
      .catch(() => {});
  }, [selectedVersion]);

  const loadNorms = useCallback(() => {
    if (!selectedVersion) return;
    setLoading(true);
    normsApi.list(selectedVersion, modelTypeFilter || undefined)
      .then(res => setData(res.data as NormRow[]))
      .catch(() => void message.error('加载常模失败，请确认 begreat-local 服务已启动'))
      .finally(() => setLoading(false));
  }, [selectedVersion, modelTypeFilter]);

  useEffect(() => { loadVersions(); }, [loadVersions]);
  useEffect(() => { loadNorms(); }, [loadNorms]);

  const openEdit = (row: NormRow) => {
    setEditTarget(row);
    form.setFieldsValue({ mean: row.mean, sd: row.sd, sampleSize: row.sampleSize, source: row.source, instrument: row.instrument });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      await normsApi.update(editTarget._id, {
        mean:       values.mean,
        sd:         values.sd,
        sampleSize: values.sampleSize ?? null,
        source:     values.source,
        instrument: values.instrument,
      });
      void message.success('更新成功');
      setEditOpen(false);
      setEditTarget(null);
      loadNorms();
    } catch {
      void message.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedVersion) return;
    setActivating(true);
    try {
      const res    = await normsApi.activate(selectedVersion);
      const result = res.data as { normVersion: string; activated: number };
      void message.success(`已激活版本 ${result.normVersion}（${result.activated} 条）`);
      setActivateOpen(false);
      loadNorms();
    } catch {
      void message.error('激活失败');
    } finally {
      setActivating(false);
    }
  };

  const isCurrentActive = data.length > 0 && data[0].isActive;

  const columns = [
    {
      title: '维度',
      dataIndex: 'dimension',
      width: 60,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: '模型', dataIndex: 'modelType', width: 80 },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 60,
      render: (v: string) => GENDER_LABELS[v] ?? v,
    },
    { title: '年龄段', dataIndex: 'ageGroup', width: 80 },
    {
      title: '均值 (μ)',
      dataIndex: 'mean',
      width: 90,
      render: (v: number) => v.toFixed(4),
    },
    {
      title: '标准差 (σ)',
      dataIndex: 'sd',
      width: 90,
      render: (v: number) => v.toFixed(4),
    },
    {
      title: '样本量',
      dataIndex: 'sampleSize',
      width: 80,
      render: (v: number | null) => v ?? <Text type="secondary">-</Text>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      ellipsis: true,
      render: (v: string) => <Tooltip title={v}><Text style={{ fontSize: 12 }}>{v}</Text></Tooltip>,
    },
    { title: '量表', dataIndex: 'instrument', width: 110 },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 70,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '激活' : '未激活'}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 110,
      render: (v?: string) => v ? new Date(v).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: '操作',
      width: 70,
      render: (_: unknown, row: NormRow) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>编辑</Button>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="选择常模版本"
          style={{ width: 220 }}
          value={selectedVersion || undefined}
          onChange={v => { setSelectedVersion(v as string); }}
          options={versions.map(v => ({ value: v, label: v }))}
        />
        <Select
          placeholder="模型类型"
          style={{ width: 110 }}
          allowClear
          onChange={v => setModelTypeFilter(v as string ?? '')}
          options={[{ value: 'BIG5', label: 'BIG5' }, { value: 'RIASEC', label: 'RIASEC' }]}
        />
        <Button icon={<ReloadOutlined />} onClick={loadNorms}>刷新</Button>
        {selectedVersion && (
          <Button
            type={isCurrentActive ? 'default' : 'primary'}
            icon={<CheckCircleOutlined />}
            onClick={() => setActivateOpen(true)}
            disabled={isCurrentActive}
          >
            {isCurrentActive ? '当前激活版本' : '激活此版本'}
          </Button>
        )}
      </Space>

      {selectedVersion && (
        <Alert
          type={isCurrentActive ? 'success' : 'warning'}
          showIcon
          message={isCurrentActive
            ? `版本 ${selectedVersion} 当前生效中，所有测评使用此常模计算 z 分`
            : `版本 ${selectedVersion} 未激活，点击「激活此版本」使其生效`}
          style={{ marginBottom: 12 }}
        />
      )}

      <Table
        rowKey="_id"
        dataSource={data}
        columns={columns}
        loading={loading}
        size="small"
        pagination={false}
        scroll={{ x: 1000 }}
      />

      {/* 编辑弹窗 */}
      <Modal
        title={editTarget ? `编辑常模：${editTarget.dimension} / ${GENDER_LABELS[editTarget.gender] ?? editTarget.gender} / ${editTarget.ageGroup}` : '编辑常模'}
        open={editOpen}
        onCancel={() => { setEditOpen(false); setEditTarget(null); }}
        onOk={() => void handleSave()}
        confirmLoading={saving}
        okText="保存"
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="均值 (μ)" name="mean" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} step={0.0001} precision={4} />
          </Form.Item>
          <Form.Item label="标准差 (σ)" name="sd" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} step={0.0001} precision={4} min={0.0001} />
          </Form.Item>
          <Form.Item label="样本量（留空表示未知）" name="sampleSize">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="null" />
          </Form.Item>
          <Form.Item label="数据来源" name="source" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="量表版本" name="instrument" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 激活确认 */}
      <Modal
        title="激活常模版本"
        open={activateOpen}
        onCancel={() => setActivateOpen(false)}
        onOk={() => void handleActivate()}
        confirmLoading={activating}
        okText="确认激活"
      >
        <Alert
          type="warning"
          showIcon
          message={`激活后，所有新测评将使用版本「${selectedVersion}」计算 z 分，旧版本自动停用。`}
          style={{ marginBottom: 12 }}
        />
        <Text>确认激活版本：<Text strong>{selectedVersion}</Text>？</Text>
      </Modal>
    </>
  );
}
