import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table, Select, Button, Modal, message, Space, Tag, Typography, Alert,
  Statistic, Row, Col, Card, Upload,
} from 'antd';
import { UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { questionBankApi } from '@/api/adminApi';

const { Text } = Typography;

const PAGE_SIZE = 50;

interface QuestionRow {
  _id: string;
  questionId: string;
  modelType: 'RIASEC' | 'BIG5';
  dimension: string;
  content: string;
  weight: number;
  gender: 'male' | 'female' | 'both';
  ageMin: number;
  ageMax: number;
  isActive: boolean;
  bfiItemNo?: number;
  bfiReverse?: boolean;
  bfiFacet?: string;
}

interface StatRow {
  _id: { modelType: string; isActive: boolean };
  count: number;
}

const MODEL_TYPE_COLORS: Record<string, string> = { BIG5: 'blue', RIASEC: 'purple' };

export default function QuestionBank() {
  const [data, setData] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modelTypeFilter, setModelTypeFilter] = useState<string>('');
  const [dimensionFilter, setDimensionFilter] = useState<string>('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('');
  const [stats, setStats] = useState<StatRow[]>([]);

  const [importOpen, setImportOpen] = useState(false);
  const [resetImport, setResetImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const parsedRef = useRef<unknown[]>([]);

  const loadStats = useCallback(() => {
    questionBankApi.stats()
      .then(res => setStats(res.data as StatRow[]))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page, pageSize: PAGE_SIZE };
    if (modelTypeFilter) params['modelType'] = modelTypeFilter;
    if (dimensionFilter)  params['dimension'] = dimensionFilter;
    if (isActiveFilter !== '') params['isActive'] = isActiveFilter;
    questionBankApi.list(params)
      .then(res => {
        const d = res.data as { total: number; data: QuestionRow[] };
        setData(d.data);
        setTotal(d.total);
      })
      .finally(() => setLoading(false));
  }, [page, modelTypeFilter, dimensionFilter, isActiveFilter]);

  useEffect(() => { load(); loadStats(); }, [load, loadStats]);

  const big5Count  = stats.filter(s => s._id.modelType === 'BIG5'   && s._id.isActive).reduce((a, s) => a + s.count, 0);
  const riasecCount = stats.filter(s => s._id.modelType === 'RIASEC' && s._id.isActive).reduce((a, s) => a + s.count, 0);

  const handleFileChange = ({ fileList: fl }: { fileList: UploadFile[] }) => {
    setFileList(fl.slice(-1));
    if (fl.length === 0) { parsedRef.current = []; return; }
    const file = fl[0].originFileObj as File;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as unknown[];
        if (!Array.isArray(parsed)) { void message.error('JSON 根节点必须是数组'); return; }
        parsedRef.current = parsed;
        void message.success(`已解析 ${parsed.length} 条题目`);
      } catch {
        void message.error('JSON 解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedRef.current.length === 0) {
      void message.warning('请先选择有效的 JSON 文件');
      return;
    }
    setImporting(true);
    try {
      const res    = await questionBankApi.import(parsedRef.current, resetImport);
      const result = res.data as { upserted: number; errors: string[] };
      void message.success(`导入完成：${result.upserted} 条`);
      if (result.errors.length > 0) void message.warning(`${result.errors.length} 条跳过：${result.errors[0]}`);
      setImportOpen(false);
      setFileList([]);
      setResetImport(false);
      parsedRef.current = [];
      load();
      loadStats();
    } catch {
      void message.error('导入失败，请确认 begreat-local 服务已启动');
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    { title: 'BFI#', dataIndex: 'bfiItemNo', width: 60, render: (v?: number) => v ?? '-' },
    {
      title: '模型',
      dataIndex: 'modelType',
      width: 80,
      render: (v: string) => <Tag color={MODEL_TYPE_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    { title: '维度', dataIndex: 'dimension', width: 60 },
    { title: '子维度', dataIndex: 'bfiFacet', width: 100, render: (v?: string) => v ?? '-' },
    {
      title: '题目内容',
      dataIndex: 'content',
      render: (v: string) => (
        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v }}>{v}</Text>
      ),
    },
    {
      title: '反向',
      dataIndex: 'bfiReverse',
      width: 60,
      render: (v?: boolean) => v ? <Tag color="orange">是</Tag> : '-',
    },
    { title: '适用性别', dataIndex: 'gender', width: 80 },
    { title: '权重', dataIndex: 'weight', width: 60 },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 70,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
    },
  ];

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic title="BIG5 激活题目" value={big5Count} />
          </Card>
        </Col>
        <Col>
          <Card size="small">
            <Statistic title="RIASEC 激活题目" value={riasecCount} />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="模型"
          style={{ width: 100 }}
          allowClear
          onChange={v => { setModelTypeFilter(v as string ?? ''); setPage(1); }}
          options={[{ value: 'BIG5', label: 'BIG5' }, { value: 'RIASEC', label: 'RIASEC' }]}
        />
        <Select
          placeholder="维度"
          style={{ width: 90 }}
          allowClear
          onChange={v => { setDimensionFilter(v as string ?? ''); setPage(1); }}
          options={['O','C','E','A','N','R','I','S'].map(d => ({ value: d, label: d }))}
        />
        <Select
          placeholder="状态"
          style={{ width: 90 }}
          allowClear
          onChange={v => { setIsActiveFilter(v as string ?? ''); setPage(1); }}
          options={[{ value: 'true', label: '启用' }, { value: 'false', label: '停用' }]}
        />
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
          导入题库
        </Button>
      </Space>

      <Table
        rowKey="_id"
        dataSource={data}
        columns={columns}
        loading={loading}
        size="small"
        pagination={{ current: page, total, pageSize: PAGE_SIZE, onChange: setPage }}
      />

      <Modal
        title="导入题库"
        open={importOpen}
        onCancel={() => { setImportOpen(false); setFileList([]); setResetImport(false); parsedRef.current = []; }}
        footer={[
          <Button key="cancel" onClick={() => { setImportOpen(false); setFileList([]); setResetImport(false); parsedRef.current = []; }}>取消</Button>,
          <Button key="import" type="primary" loading={importing} onClick={() => void handleImport()}>
            {resetImport ? '清空并导入' : '导入（Upsert）'}
          </Button>,
        ]}
        width={520}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="JSON 格式：数组，每条必须含 questionId / modelType / dimension / content"
          />
          <Upload
            accept=".json"
            beforeUpload={() => false}
            fileList={fileList}
            onChange={handleFileChange}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>选择 JSON 文件</Button>
          </Upload>
          <Space>
            <Text type="secondary">导入模式：</Text>
            <Select
              value={resetImport ? 'reset' : 'upsert'}
              style={{ width: 180 }}
              onChange={v => setResetImport(v === 'reset')}
              options={[
                { value: 'upsert', label: 'Upsert（追加/更新）' },
                { value: 'reset', label: '清空重导（危险）' },
              ]}
            />
          </Space>
          {resetImport && (
            <Alert type="error" showIcon message="清空模式将删除所有现有题目后重新写入，不可撤销！" />
          )}
        </Space>
      </Modal>
    </>
  );
}
