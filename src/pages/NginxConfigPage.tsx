import { useState, useCallback, useEffect } from 'react';
import {
  Button, Typography, Select, Input, Alert,
  Tag, message, Spin, Empty, Popconfirm,
} from 'antd';
import {
  SaveOutlined, ExperimentOutlined, RocketOutlined,
  FolderOpenOutlined, EditOutlined, ReloadOutlined, CloudServerOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ── axios ──
const api = axios.create({ timeout: 600000 });
api.interceptors.request.use((config) => {
  const auth = useAuthStore.getState();
  const token = auth.mandisToken ?? localStorage.getItem('mandis_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (res) => {
    const body = res.data as Record<string, unknown>;
    if (!body.success) throw new Error((body.message as string) ?? 'Request failed');
    return { ...res, data: body.data };
  },
  (err) => Promise.reject(err),
);

const CARD_STYLE: React.CSSProperties = {
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: 'none',
};

export default function NginxConfigPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [file, setFile] = useState('');
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; output: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/system/nginx-config');
      const list = (res.data as { files: string[] }).files ?? [];
      setFiles(list);
      if (list.length && (!file || !list.includes(file))) {
        setFile(list[0]);
        void loadContent(list[0]);
      }
    } catch (err: unknown) {
      setError(`获取文件列表失败: ${axios.isAxiosError(err) ? err.message : String(err)}`);
    } finally { setLoading(false); }
  }, [file]); // eslint-disable-line

  const loadContent = useCallback(async (f: string) => {
    if (!f) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/system/nginx-config', { params: { file: f } });
      const c = (res.data as { content: string }).content ?? '';
      setContent(c);
      setOriginal(c);
      setDirty(false);
      setTestResult(null);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as { message?: string })?.message ?? err.message : String(err);
      setError(`读取失败: ${msg}`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchFiles(); }, []); // eslint-disable-line

  const handleFileChange = (f: string) => {
    if (dirty && f !== file && !confirm('未保存的修改将丢失，确定切换？')) return;
    setFile(f);
    void loadContent(f);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/api/admin/system/nginx-test');
      const data = res.data as { valid: boolean; output: string };
      setTestResult(data);
      message[data.valid ? 'success' : 'warning'](data.valid ? '语法正确' : '语法错误');
    } catch (err: unknown) {
      setTestResult({ valid: false, output: axios.isAxiosError(err) ? err.message : String(err) });
    } finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (!file || !dirty) return;
    setSaving(true);
    try {
      const res = await api.put('/api/admin/system/nginx-config', { file, content });
      const data = res.data as { saved: boolean; backup: string };
      setOriginal(content);
      setDirty(false);
      message.success(`已保存 (备份: ${data.backup})`);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as { message?: string })?.message ?? err.message : String(err);
      message.error(`保存失败: ${msg}`);
    } finally { setSaving(false); }
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      await api.post('/api/admin/system/nginx-reload');
      message.success('Nginx 已重载');
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as { message?: string })?.message ?? err.message : String(err);
      message.error(`重载失败: ${msg}`);
    } finally { setReloading(false); }
  };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif" }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1d1d1f' }}>
          <CloudServerOutlined style={{ marginRight: 8 }} />
          Nginx 配置
        </Title>
        <Button size="small" icon={<ReloadOutlined />} onClick={fetchFiles} loading={loading}
          style={{ borderRadius: 20 }}>
          刷新
        </Button>
      </div>

      {error && (
        <Alert type="error" message={error} showIcon closable onClose={() => setError(null)}
          style={{ marginBottom: 16, borderRadius: 12 }} />
      )}

      {/* ── 工具栏 ── */}
      <div style={{ ...CARD_STYLE, padding: '12px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
        <Text style={{ fontSize: 12, fontWeight: 600, color: '#86868b' }}>文件</Text>
        <Select value={file} onChange={(v) => handleFileChange(v)} style={{ width: 200, borderRadius: 8 }}
          loading={loading && files.length === 0}
          notFoundContent={loading ? <Spin size="small" /> : '无配置文件'}>
          {files.map((f) => (<Option key={f} value={f}>{f}</Option>))}
        </Select>
        <Button size="small" icon={<FolderOpenOutlined />} onClick={fetchFiles} loading={loading}
          style={{ borderRadius: 20 }}>刷新列表</Button>
        <div style={{ width: 1, height: 20, background: '#e5e5e7', margin: '0 4px' }} />
        <Button size="small" icon={<ExperimentOutlined />} onClick={handleTest} loading={testing}
          style={{ borderRadius: 20 }}>测试语法</Button>
        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSave}
          loading={saving} disabled={!dirty} style={{ borderRadius: 20 }}>
          保存
        </Button>
        <Popconfirm title="重载 Nginx？" onConfirm={handleReload} okText="确定" cancelText="取消">
          <Button size="small" icon={<RocketOutlined />} loading={reloading}
            style={{ borderRadius: 20 }}>重载</Button>
        </Popconfirm>
        {dirty && <Tag color="orange" style={{ borderRadius: 20 }}>未保存</Tag>}
      </div>

      {/* ── 测试结果 ── */}
      {testResult && (
        <Alert
          type={testResult.valid ? 'success' : 'error'}
          message={testResult.valid ? '配置语法正确' : '配置语法错误'}
          description={
            <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto',
              fontFamily: "'SF Mono', 'Menlo', monospace" }}>
              {testResult.output}
            </pre>
          }
          style={{ marginBottom: 16, borderRadius: 12 }} closable
          onClose={() => setTestResult(null)}
        />
      )}

      {/* ── 编辑器 ── */}
      <div style={{ ...CARD_STYLE, overflow: 'hidden' }}>
        <div style={{
          padding: '10px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <EditOutlined style={{ color: '#86868b' }} />
          <Text style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{file || '选择文件'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {dirty ? '· 已修改' : content ? `· ${content.split('\n').length} 行` : ''}
          </Text>
        </div>
        {!file && !loading ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择一个配置文件" style={{ padding: 40 }} />
        ) : loading ? (
          <Spin tip="加载中..." style={{ display: 'block', margin: '60px auto', padding: 40 }} />
        ) : (
          <TextArea
            value={content}
            onChange={(e) => { setContent(e.target.value); setDirty(e.target.value !== original); }}
            style={{
              fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
              fontSize: 13, lineHeight: 1.7,
              background: '#1c1c1e', color: '#e5e5e7',
              border: 'none', borderRadius: 0, resize: 'vertical',
              minHeight: 'calc(100vh - 380px)',
              padding: '20px 24px',
            }}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}