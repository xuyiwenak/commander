import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card, Row, Col, Button, Typography, Space, Divider,
  Tag, Popconfirm, message, Spin, Switch, InputNumber, Empty,
  Select, Input, Alert,
} from 'antd';
import {
  ReloadOutlined, PlayCircleOutlined, StopOutlined,
  BuildOutlined, SyncOutlined, CodeOutlined,
  RocketOutlined, DeleteOutlined, FileTextOutlined,
  ThunderboltOutlined, CloudServerOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, PauseCircleOutlined,
  EditOutlined, SaveOutlined, ExperimentOutlined,
  FolderOpenOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useAppStore, type AppName } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ── App 元数据 ──

interface AppMeta {
  key: AppName;
  label: string;
  service: string;
  container: string;
  color: string;
}

const APPS: Record<AppName, AppMeta> = {
  mandis: { key: 'mandis', label: 'Mandis 艺术工作室', service: 'mandis_app', container: 'miniapp-mandis', color: '#4DBFB4' },
  begreat: { key: 'begreat', label: 'BeGreat 职业测评', service: 'begreat_app', container: 'miniapp-begreat', color: '#1677ff' },
};

// ── 长操作专用 axios instance ──

const longHttp = axios.create({ timeout: 600000 });
longHttp.interceptors.request.use((config) => {
  const { currentApp } = useAppStore.getState();
  let token: string | null = null;
  const auth = useAuthStore.getState();
  if (currentApp === 'mandis') {
    token = auth.mandisToken ?? localStorage.getItem('mandis_admin_token');
  } else {
    token = auth.begreatToken ?? localStorage.getItem('begreat_admin_token');
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
longHttp.interceptors.response.use(
  (res) => {
    const body = res.data as Record<string, unknown>;
    if (!body.success) throw new Error((body.message as string) ?? 'Request failed');
    return { ...res, data: body.data };
  },
  (err) => Promise.reject(err),
);

// ── component ──

export default function ServerControlPage() {
  const currentApp = useAppStore((s) => s.currentApp);
  const appMeta = APPS[currentApp];

  const [noCache, setNoCache] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [containerStatus, setContainerStatus] = useState<string[]>([]);
  const [logTail, setLogTail] = useState(100);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Nginx 编辑状态 ──
  const [nginxFiles, setNginxFiles] = useState<string[]>([]);
  const [nginxFile, setNginxFile] = useState<string>('');
  const [nginxContent, setNginxContent] = useState('');
  const [nginxOriginal, setNginxOriginal] = useState('');
  const [nginxDirty, setNginxDirty] = useState(false);
  const [nginxSaving, setNginxSaving] = useState(false);
  const [nginxTesting, setNginxTesting] = useState(false);
  const [nginxTestResult, setNginxTestResult] = useState<{ valid: boolean; output: string } | null>(null);

  // 自动滚动
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const appendLog = useCallback((line: string) => {
    setLogs((prev) => [...prev, ...line.split('\n').filter(Boolean)]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  // ── API calls ──

  const fetchStatus = useCallback(async () => {
    try {
      const res = await longHttp.get('/api/admin/system/app/status');
      setContainerStatus((res.data as { lines: string[] }).lines ?? []);
    } catch { /* ignore */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    setFetchingLogs(true);
    try {
      const res = await longHttp.get('/api/admin/system/app/logs', {
        params: { app: currentApp, tail: logTail },
      });
      setLogs((res.data as { lines: string[] }).lines ?? []);
    } catch { message.error('获取日志失败'); }
    finally { setFetchingLogs(false); }
  }, [currentApp, logTail]);

  const fetchNginxFiles = useCallback(async () => {
    try {
      const res = await longHttp.get('/api/admin/system/nginx-config');
      const files = (res.data as { files: string[] }).files ?? [];
      setNginxFiles(files);
      if (files.length > 0 && !nginxFile) setNginxFile(files[0]);
    } catch { /* ignore */ }
  }, [nginxFile]);

  const fetchNginxContent = useCallback(async (file: string) => {
    if (!file) return;
    try {
      const res = await longHttp.get('/api/admin/system/nginx-config', { params: { file } });
      const content = (res.data as { content: string }).content ?? '';
      setNginxContent(content);
      setNginxOriginal(content);
      setNginxDirty(false);
      setNginxTestResult(null);
    } catch { message.error(`读取 ${file} 失败`); }
  }, []);

  useEffect(() => { void fetchStatus(); void fetchNginxFiles(); }, [fetchStatus, fetchNginxFiles]);

  // ── 操作处理 ──

  const runAction = useCallback(async (
    actionLabel: string,
    url: string,
    body?: Record<string, unknown>,
  ) => {
    setLoading(actionLabel);
    clearLogs();
    appendLog(`>>> [${new Date().toLocaleTimeString()}] 开始执行: ${actionLabel}`);
    try {
      const res = await longHttp.post(url, body ?? {});
      const output = (res.data as { output: string }).output ?? '';
      appendLog(output);
      appendLog(`>>> [${new Date().toLocaleTimeString()}] \u2705 ${actionLabel} 完成`);
      message.success(`${actionLabel} 完成`);
      setTimeout(() => { void fetchStatus(); }, 2000);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : String(err);
      appendLog(`>>> [${new Date().toLocaleTimeString()}] \u274c 失败: ${msg}`);
      message.error(`${actionLabel} 失败: ${msg}`);
    } finally { setLoading(null); }
  }, [appendLog, clearLogs, fetchStatus]);

  const handleRestart = useCallback(() => {
    void runAction('普通重启', '/api/admin/system/app/restart', { app: currentApp });
  }, [runAction, currentApp]);

  const handleBuildRestart = useCallback(() => {
    void runAction('编译重启', '/api/admin/system/app/build-restart', { app: currentApp, noCache });
  }, [runAction, currentApp, noCache]);

  const handleStop = useCallback(() => {
    void runAction('停止容器', '/api/admin/system/app/stop', { app: currentApp });
  }, [runAction, currentApp]);

  const handlePrune = useCallback(() => {
    void runAction('清理镜像', '/api/admin/system/prune');
  }, [runAction]);

  // ── Nginx 操作 ──

  const handleNginxTest = useCallback(async () => {
    setNginxTesting(true);
    setNginxTestResult(null);
    try {
      const res = await longHttp.post('/api/admin/system/nginx-test');
      const data = res.data as { valid: boolean; output: string };
      setNginxTestResult(data);
      message[data.valid ? 'success' : 'warning'](data.valid ? 'Nginx 配置语法正确' : 'Nginx 配置有误');
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.message : String(err);
      setNginxTestResult({ valid: false, output: msg });
    } finally { setNginxTesting(false); }
  }, []);

  const handleNginxSave = useCallback(async () => {
    if (!nginxFile || !nginxDirty) return;
    setNginxSaving(true);
    try {
      const res = await longHttp.put('/api/admin/system/nginx-config', { file: nginxFile, content: nginxContent });
      const data = res.data as { saved: boolean; backup: string };
      if (data.saved) {
        setNginxOriginal(nginxContent);
        setNginxDirty(false);
        message.success(`${nginxFile} 已保存（备份: ${data.backup}）`);
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : String(err);
      message.error(`保存失败: ${msg}`);
    } finally { setNginxSaving(false); }
  }, [nginxFile, nginxContent, nginxDirty]);

  const handleNginxReload = useCallback(() => {
    void runAction('Nginx 重载', '/api/admin/system/nginx-reload');
  }, [runAction]);

  const handleNginxFileChange = useCallback((file: string) => {
    setNginxFile(file);
    if (nginxDirty) {
      if (confirm('当前修改未保存，确定切换文件？')) {
        void fetchNginxContent(file);
      } else {
        return;
      }
    }
    void fetchNginxContent(file);
  }, [nginxDirty, fetchNginxContent]);

  // ── 容器状态解析 ──

  const statusLines = containerStatus.length > 1 ? containerStatus.slice(1) : containerStatus;
  const appStatusLine = statusLines.find((l) => l.includes(appMeta.container));
  const isRunning = appStatusLine?.includes('Up') ?? false;
  const isExited = appStatusLine?.includes('Exited') ?? false;

  // ── render ──

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <CloudServerOutlined style={{ marginRight: 8 }} />
          服务器控制台
        </Title>
      </div>

      {/* ── 当前 App 状态条 ── */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 8]} align="middle">
          <Col xs={24} sm={6}>
            <Space>
              <Text strong>当前应用：</Text>
              <Tag color={appMeta.color} style={{ fontSize: 13, padding: '2px 10px' }}>
                {appMeta.label}
              </Tag>
            </Space>
          </Col>
          <Col xs={24} sm={6}>
            <Space>
              <Text strong>状态：</Text>
              {isRunning
                ? <Tag icon={<CheckCircleOutlined />} color="green">运行中</Tag>
                : isExited
                  ? <Tag icon={<PauseCircleOutlined />} color="red">已停止</Tag>
                  : <Tag icon={<ExclamationCircleOutlined />} color="orange">未知</Tag>
              }
            </Space>
          </Col>
          <Col xs={24} sm={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              容器: <Text code>{appMeta.container}</Text>
            </Text>
          </Col>
          <Col xs={24} sm={6}>
            <Button size="small" icon={<SyncOutlined />} onClick={fetchStatus}>
              刷新状态
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ── 第一组：应用控制 ── */}
      <Card
        size="small"
        title={<><ThunderboltOutlined /> 应用控制 — {appMeta.label}</>}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col>
            <Popconfirm
              title={`确定重启 ${appMeta.label}？`}
              description="停止旧容器并用已有镜像重建（不编译代码）"
              onConfirm={handleRestart}
              okText="确定重启"
              cancelText="取消"
            >
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={loading === '普通重启'}
                disabled={loading !== null}
                style={{ background: appMeta.color }}
              >
                普通重启
              </Button>
            </Popconfirm>
          </Col>
          <Col>
            <Popconfirm
              title={`确定编译重启 ${appMeta.label}？`}
              description={noCache
                ? '将强制重新编译镜像（--no-cache），耗时较长（2-8 分钟）'
                : '将重新编译镜像并重建容器（2-8 分钟）'}
              onConfirm={handleBuildRestart}
              okText="确定编译"
              cancelText="取消"
            >
              <Button
                icon={<BuildOutlined />}
                loading={loading === '编译重启'}
                disabled={loading !== null}
              >
                编译重启
              </Button>
            </Popconfirm>
          </Col>
          <Col>
            <Switch
              checked={noCache}
              onChange={setNoCache}
              disabled={loading !== null}
              checkedChildren="no-cache"
              unCheckedChildren="缓存"
              size="small"
            />
          </Col>
          <Col><Divider type="vertical" /></Col>
          <Col>
            <Popconfirm
              title={`确定停止 ${appMeta.label}？`}
              description="容器将被强制停止，服务不可用！"
              onConfirm={handleStop}
              okText="确定停止"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<StopOutlined />}
                loading={loading === '停止容器'}
                disabled={loading !== null}
              >
                停止
              </Button>
            </Popconfirm>
          </Col>
        </Row>
      </Card>

      {/* ── 第二组：Nginx 配置管理 ── */}
      <Card
        size="small"
        title={<><EditOutlined /> Nginx 配置管理</>}
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            {nginxDirty && <Tag color="orange">未保存</Tag>}
            <Button size="small" icon={<FolderOpenOutlined />} onClick={fetchNginxFiles}>
              刷新列表
            </Button>
          </Space>
        }
      >
        <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 12 }}>
          <Col>
            <Text strong>配置文件：</Text>
          </Col>
          <Col>
            <Select
              value={nginxFile}
              onChange={(v) => { void handleNginxFileChange(v); }}
              style={{ width: 200 }}
              loading={nginxFiles.length === 0}
            >
              {nginxFiles.map((f) => (
                <Option key={f} value={f}>{f}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button
              size="small"
              icon={<ExperimentOutlined />}
              onClick={handleNginxTest}
              loading={nginxTesting}
            >
              测试语法
            </Button>
          </Col>
          <Col>
            <Button
              size="small"
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleNginxSave}
              loading={nginxSaving}
              disabled={!nginxDirty}
            >
              保存
            </Button>
          </Col>
          <Col>
            <Popconfirm
              title="确定重载 Nginx？"
              description="将重新加载所有 Nginx 配置"
              onConfirm={handleNginxReload}
              okText="确定重载"
              cancelText="取消"
            >
              <Button
                size="small"
                icon={<RocketOutlined />}
                loading={loading === 'Nginx 重载'}
                disabled={loading !== null}
              >
                重载配置
              </Button>
            </Popconfirm>
          </Col>
        </Row>

        {nginxTestResult && (
          <Alert
            type={nginxTestResult.valid ? 'success' : 'error'}
            message={nginxTestResult.valid ? '配置语法正确' : '配置语法错误'}
            description={
              <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                {nginxTestResult.output}
              </pre>
            }
            style={{ marginBottom: 12 }}
            closable
            onClose={() => setNginxTestResult(null)}
          />
        )}

        <TextArea
          value={nginxContent}
          onChange={(e) => {
            setNginxContent(e.target.value);
            setNginxDirty(e.target.value !== nginxOriginal);
          }}
          rows={16}
          style={{
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 12,
            lineHeight: 1.6,
            background: '#1e1e1e',
            color: '#d4d4d4',
            border: '1px solid #333',
          }}
          spellCheck={false}
        />
      </Card>

      {/* ── 第三组：运维工具 ── */}
      <Card
        size="small"
        title={<><SettingOutlined /> 运维工具</>}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col>
            <Popconfirm
              title="确定清理悬空镜像？"
              onConfirm={handlePrune}
              okText="确定"
              cancelText="取消"
            >
              <Button
                size="small"
                icon={<DeleteOutlined />}
                loading={loading === '清理镜像'}
                disabled={loading !== null}
              >
                清理悬空镜像
              </Button>
            </Popconfirm>
          </Col>
          <Col>
            <Button
              size="small"
              icon={<FileTextOutlined />}
              onClick={fetchLogs}
              loading={fetchingLogs}
              disabled={loading !== null}
            >
              查看容器日志
            </Button>
          </Col>
          <Col>
            <Space>
              <Text style={{ fontSize: 12 }}>行数:</Text>
              <InputNumber
                size="small"
                min={10}
                max={1000}
                value={logTail}
                onChange={(v) => setLogTail(v ?? 100)}
                style={{ width: 70 }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ── 容器状态详情 ── */}
      {containerStatus.length > 0 && (
        <Card size="small" title="容器状态 (docker compose ps)" style={{ marginBottom: 16 }}>
          <pre style={{
            background: '#1e1e1e', color: '#d4d4d4', padding: 12,
            borderRadius: 6, fontSize: 12, margin: 0, overflow: 'auto',
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            maxHeight: 200,
          }}>
            {containerStatus.join('\n')}
          </pre>
        </Card>
      )}

      {/* ── 日志输出面板 ── */}
      <Card
        size="small"
        title={
          <Space>
            <CodeOutlined />
            <span>操作日志</span>
            {loading !== null && <Spin size="small" />}
            {loading !== null && <Text style={{ fontSize: 12 }}>{loading}...</Text>}
          </Space>
        }
        extra={
          <Space>
            <Button size="small" onClick={clearLogs} disabled={loading !== null}>清空</Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchLogs} disabled={loading !== null}>
              刷新日志
            </Button>
          </Space>
        }
      >
        {logs.length === 0 && loading === null ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="点击操作按钮，日志将在此显示"
          />
        ) : (
          <div style={{
            background: '#1e1e1e', color: '#d4d4d4', padding: '12px 16px',
            borderRadius: 6, fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 12, lineHeight: 1.7, maxHeight: 500, overflow: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {logs.map((line, i) => (
              <div
                key={i}
                style={{
                  color: line.startsWith('>>>') ? '#569cd6'
                    : line.includes('error') || line.includes('Error') ? '#f44747'
                    : line.includes('warn') ? '#cca700'
                    : '#d4d4d4',
                }}
              >
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </Card>

      <Paragraph type="secondary" style={{ fontSize: 12, maxWidth: 700 }}>
        💡 提示：编译重启耗时 2-8 分钟。Nginx 配置修改后请先「测试语法」再「重载配置」。
        保存配置会自动备份原文件（.bak.时间戳）。
      </Paragraph>
    </div>
  );
}
