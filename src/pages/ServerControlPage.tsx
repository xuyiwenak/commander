import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card, Row, Col, Button, Typography, Space, Divider,
  Tag, Popconfirm, message, Spin, Switch, InputNumber, Empty,
  Select, Input, Alert, Descriptions, Badge, Tooltip,
} from 'antd';
import {
  ReloadOutlined, PlayCircleOutlined, StopOutlined,
  BuildOutlined, SyncOutlined, CodeOutlined,
  RocketOutlined, DeleteOutlined, FileTextOutlined,
  ThunderboltOutlined, CloudServerOutlined,
  EditOutlined, SaveOutlined, ExperimentOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined, ClockCircleOutlined,
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

// ── 长操作专用 axios ──
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

// ── 容器状态类型 ──
interface ContainerInfo {
  Names: string;
  Image: string;
  State: string;
  Status: string;
  Ports?: string;
  CreatedAt?: string;
}

// ── component ──

export default function ServerControlPage() {
  const currentApp = useAppStore((s) => s.currentApp);
  const appMeta = APPS[currentApp];

  const [noCache, setNoCache] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [appLogs, setAppLogs] = useState<string[]>([]);
  const [logTail, setLogTail] = useState(100);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── 容器状态 ──
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [containerError, setContainerError] = useState<string | null>(null);
  const [fetchingContainers, setFetchingContainers] = useState(false);

  // ── Nginx 编辑状态 ──
  const [nginxFiles, setNginxFiles] = useState<string[]>([]);
  const [nginxFile, setNginxFile] = useState<string>('');
  const [nginxContent, setNginxContent] = useState('');
  const [nginxOriginal, setNginxOriginal] = useState('');
  const [nginxDirty, setNginxDirty] = useState(false);
  const [nginxSaving, setNginxSaving] = useState(false);
  const [nginxTesting, setNginxTesting] = useState(false);
  const [nginxTestResult, setNginxTestResult] = useState<{ valid: boolean; output: string } | null>(null);
  const [nginxError, setNginxError] = useState<string | null>(null);
  const [nginxLoading, setNginxLoading] = useState(false);

  // 自动滚动
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, appLogs]);

  const appendLog = useCallback((line: string) => {
    setLogs((prev) => [...prev, ...line.split('\n').filter(Boolean)]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  // ── 容器状态 ──

  const fetchContainers = useCallback(async () => {
    setFetchingContainers(true);
    setContainerError(null);
    try {
      const res = await longHttp.get('/api/admin/system/containers');
      const data = res.data as { containers?: ContainerInfo[]; error?: string };
      if (data.error) {
        setContainerError(data.error);
        setContainers([]);
      } else {
        setContainers(data.containers ?? []);
        setContainerError(null);
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.message : String(err);
      setContainerError(msg);
      setContainers([]);
    } finally {
      setFetchingContainers(false);
    }
  }, []);

  // ── 应用日志 ──

  const fetchAppLogs = useCallback(async () => {
    setFetchingLogs(true);
    try {
      const res = await longHttp.get('/api/admin/system/app/logs', {
        params: { app: currentApp, tail: logTail },
      });
      const lines = (res.data as { lines: string[]; error?: string }).lines ?? [];
      const err = (res.data as { error?: string }).error;
      if (err) {
        setAppLogs([`[Error] ${err}`]);
      } else if (lines.length === 0) {
        setAppLogs(['(暂无日志)']);
      } else {
        setAppLogs(lines);
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.message : String(err);
      setAppLogs([`[请求失败] ${msg}`]);
    } finally {
      setFetchingLogs(false);
    }
  }, [currentApp, logTail]);

  // 自动刷新日志
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => { void fetchAppLogs(); }, 10000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchAppLogs]);

  // ── Nginx 配置 ──

  const fetchNginxFiles = useCallback(async () => {
    setNginxLoading(true);
    setNginxError(null);
    try {
      const res = await longHttp.get('/api/admin/system/nginx-config');
      const files = (res.data as { files: string[] }).files ?? [];
      setNginxFiles(files);
      if (files.length > 0 && (!nginxFile || !files.includes(nginxFile))) {
        setNginxFile(files[0]);
        void fetchNginxContent(files[0]);
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.message : String(err);
      setNginxError(`获取文件列表失败: ${msg}`);
    } finally {
      setNginxLoading(false);
    }
  }, [nginxFile]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNginxContent = useCallback(async (file: string) => {
    if (!file) return;
    setNginxLoading(true);
    setNginxError(null);
    try {
      const res = await longHttp.get('/api/admin/system/nginx-config', { params: { file } });
      const content = (res.data as { content: string }).content ?? '';
      setNginxContent(content);
      setNginxOriginal(content);
      setNginxDirty(false);
      setNginxTestResult(null);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : String(err);
      setNginxError(`读取 ${file} 失败: ${msg}`);
    } finally {
      setNginxLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchContainers();
    void fetchAppLogs();
    void fetchNginxFiles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 切换 app 时重新加载
  useEffect(() => {
    void fetchContainers();
    void fetchAppLogs();
  }, [currentApp]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // 刷新状态
      setTimeout(() => {
        void fetchContainers();
        void fetchAppLogs();
      }, 3000);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : String(err);
      appendLog(`>>> [${new Date().toLocaleTimeString()}] \u274c 失败: ${msg}`);
      message.error(`${actionLabel} 失败: ${msg}`);
    } finally { setLoading(null); }
  }, [appendLog, clearLogs, fetchContainers, fetchAppLogs]);

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
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : String(err);
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
    if (nginxDirty && file !== nginxFile) {
      if (!confirm('当前修改未保存，确定切换文件？')) return;
    }
    setNginxFile(file);
    void fetchNginxContent(file);
  }, [nginxDirty, nginxFile, fetchNginxContent]);

  // ── 当前 app 容器信息 ──

  const appContainer = containers.find((c) => c.Names === appMeta.container);
  const isRunning = appContainer?.State === 'running';
  const isExited = appContainer?.State === 'exited';

  // ── render ──

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <CloudServerOutlined style={{ marginRight: 8 }} />
          服务器控制台
          <Tag color={appMeta.color} style={{ marginLeft: 12, fontSize: 13 }}>{appMeta.label}</Tag>
        </Title>
        <Space>
          <Button size="small" icon={<SyncOutlined />} onClick={() => { void fetchContainers(); void fetchAppLogs(); }}>
            刷新全部
          </Button>
        </Space>
      </div>

      {/* ── 第一组：应用状态面板 ── */}
      <Card
        size="small"
        title={<><InfoCircleOutlined /> 应用状态 — {appMeta.label}</>}
        style={{ marginBottom: 16 }}
        extra={
          <Button size="small" icon={<ReloadOutlined />} loading={fetchingContainers}
            onClick={fetchContainers}>
            刷新
          </Button>
        }
      >
        {containerError ? (
          <Alert type="error" message="获取容器状态失败" description={containerError} showIcon />
        ) : !appContainer ? (
          fetchingContainers
            ? <Spin tip="加载中..." />
            : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`未找到容器 ${appMeta.container}`} />
        ) : (
          <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }} bordered>
            <Descriptions.Item label="容器名">
              <Text code>{appContainer.Names}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="运行状态">
              {isRunning
                ? <Badge status="processing" text="运行中" />
                : isExited
                  ? <Badge status="error" text="已停止" />
                  : <Badge status="default" text={appContainer.State} />
              }
            </Descriptions.Item>
            <Descriptions.Item label="运行时长">
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {appContainer.Status || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="镜像">
              <Tooltip title={appContainer.Image}>
                <Text ellipsis style={{ maxWidth: 200 }}>{appContainer.Image}</Text>
              </Tooltip>
            </Descriptions.Item>
            <Descriptions.Item label="端口" span={2}>
              {appContainer.Ports || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}

        {/* 所有容器概览 */}
        {containers.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>全部容器：</Text>
            <Space size={[4, 4]} wrap style={{ marginTop: 4 }}>
              {containers.map((c) => (
                <Tag
                  key={c.Names}
                  color={c.State === 'running' ? 'green' : c.State === 'exited' ? 'red' : 'orange'}
                  style={{ cursor: 'default' }}
                >
                  {c.Names.replace('bf2ad4a566ef_', '')}
                </Tag>
              ))}
            </Space>
          </div>
        )}
      </Card>

      {/* ── 第二组：应用控制 + 日志 ── */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* 控制按钮 */}
        <Col xs={24} lg={10}>
          <Card
            size="small"
            title={<><ThunderboltOutlined /> 应用控制</>}
            style={{ height: '100%' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>容器操作</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Popconfirm
                      title={`确定重启 ${appMeta.label}？`}
                      description="停止旧容器并用已有镜像重建"
                      onConfirm={handleRestart}
                      okText="确定"
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
                    <Popconfirm
                      title={`确定编译重启 ${appMeta.label}？`}
                      description={noCache ? '强制重编译 + 重启（2-8分钟）' : '编译 + 重启（2-8分钟）'}
                      onConfirm={handleBuildRestart}
                      okText="确定"
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
                    <Popconfirm
                      title={`确定停止 ${appMeta.label}？`}
                      description="容器将被强制停止，服务不可用"
                      onConfirm={handleStop}
                      okText="确定停止"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger icon={<StopOutlined />}
                        loading={loading === '停止容器'} disabled={loading !== null}>
                        停止
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              </div>

              <div>
                <Space>
                  <Switch checked={noCache} onChange={setNoCache} disabled={loading !== null}
                    checkedChildren="no-cache" unCheckedChildren="缓存" size="small" />
                  <Text type="secondary" style={{ fontSize: 12 }}>编译时忽略缓存</Text>
                </Space>
              </div>

              <Divider style={{ margin: '4px 0' }} />

              <div>
                <Text strong>运维操作</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Button size="small" icon={<RocketOutlined />}
                      loading={loading === 'Nginx 重载'} disabled={loading !== null}
                      onClick={handleNginxReload}>
                      Nginx 重载
                    </Button>
                    <Popconfirm title="确定清理悬空镜像？" onConfirm={handlePrune}
                      okText="确定" cancelText="取消">
                      <Button size="small" icon={<DeleteOutlined />}
                        loading={loading === '清理镜像'} disabled={loading !== null}>
                        清理镜像
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 应用日志 */}
        <Col xs={24} lg={14}>
          <Card
            size="small"
            title={<><FileTextOutlined /> 应用日志 — {appMeta.container}</>}
            extra={
              <Space>
                <Switch checked={autoRefresh} onChange={setAutoRefresh}
                  checkedChildren="自动刷新" unCheckedChildren="手动" size="small" />
                <Text style={{ fontSize: 12 }}>行数:</Text>
                <InputNumber size="small" min={10} max={1000} value={logTail}
                  onChange={(v) => setLogTail(v ?? 100)} style={{ width: 65 }} />
                <Button size="small" icon={<ReloadOutlined />} onClick={fetchAppLogs}
                  loading={fetchingLogs} disabled={loading !== null}>
                  刷新
                </Button>
              </Space>
            }
          >
            {appLogs.length === 0 && fetchingLogs ? (
              <Spin tip="加载日志..." />
            ) : (
              <div style={{
                background: '#1e1e1e', color: '#d4d4d4', padding: '8px 12px',
                borderRadius: 6, fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: 11, lineHeight: 1.6, maxHeight: 380, overflow: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {appLogs.map((line, i) => (
                  <div key={i} style={{
                    color: line.startsWith('[Error]') || line.startsWith('[请求失败]') ? '#f44747'
                      : line.includes('ERROR') || line.includes('error') ? '#f44747'
                      : line.includes('WARN') ? '#cca700'
                      : '#d4d4d4',
                  }}>
                    {line}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── 第三组：Nginx 配置管理 ── */}
      <Card
        size="small"
        title={<><EditOutlined /> Nginx 配置管理</>}
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            {nginxDirty && <Tag color="orange">未保存</Tag>}
            <Button size="small" icon={<FolderOpenOutlined />} onClick={fetchNginxFiles}
              loading={nginxLoading}>
              刷新列表
            </Button>
          </Space>
        }
      >
        {nginxError && (
          <Alert type="error" message={nginxError} showIcon closable
            onClose={() => setNginxError(null)} style={{ marginBottom: 12 }} />
        )}

        <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 12 }}>
          <Col><Text strong>配置文件：</Text></Col>
          <Col>
            <Select value={nginxFile} onChange={(v) => { handleNginxFileChange(v); }}
              style={{ width: 200 }} loading={nginxLoading && nginxFiles.length === 0}
              notFoundContent={nginxLoading ? <Spin size="small" /> : '无配置文件'}>
              {nginxFiles.map((f) => (<Option key={f} value={f}>{f}</Option>))}
            </Select>
          </Col>
          <Col>
            <Button size="small" icon={<ExperimentOutlined />} onClick={handleNginxTest}
              loading={nginxTesting}>测试语法</Button>
          </Col>
          <Col>
            <Button size="small" type="primary" icon={<SaveOutlined />}
              onClick={handleNginxSave} loading={nginxSaving} disabled={!nginxDirty}>
              保存
            </Button>
          </Col>
          <Col>
            <Button size="small" icon={<RocketOutlined />} onClick={handleNginxReload}
              loading={loading === 'Nginx 重载'} disabled={loading !== null}>
              重载配置
            </Button>
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
            style={{ marginBottom: 12 }} closable
            onClose={() => setNginxTestResult(null)}
          />
        )}

        {nginxContent === '' && !nginxLoading && !nginxError ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择一个配置文件以编辑" />
        ) : nginxLoading ? (
          <Spin tip="加载配置..." style={{ display: 'block', margin: '20px auto' }} />
        ) : (
          <TextArea
            value={nginxContent}
            onChange={(e) => {
              setNginxContent(e.target.value);
              setNginxDirty(e.target.value !== nginxOriginal);
            }}
            rows={16}
            style={{
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              fontSize: 12, lineHeight: 1.6,
              background: '#1e1e1e', color: '#d4d4d4',
              border: '1px solid #333',
            }}
            spellCheck={false}
          />
        )}
      </Card>

      {/* ── 操作日志面板 ── */}
      <Card
        size="small"
        title={
          <Space>
            <CodeOutlined />
            <span>操作日志</span>
            {loading !== null && <Spin size="small" />}
            {loading !== null && <Text style={{ fontSize: 12 }} type="secondary">{loading}...</Text>}
          </Space>
        }
        extra={
          <Button size="small" onClick={clearLogs} disabled={loading !== null}>清空</Button>
        }
      >
        {logs.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击控制按钮，执行日志将在此显示" />
        ) : (
          <div style={{
            background: '#1e1e1e', color: '#d4d4d4', padding: '12px 16px',
            borderRadius: 6, fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 12, lineHeight: 1.7, maxHeight: 400, overflow: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {logs.map((line, i) => (
              <div key={i} style={{
                color: line.startsWith('>>>') ? '#569cd6'
                  : line.includes('error') || line.includes('Error') ? '#f44747'
                  : line.includes('warn') ? '#cca700' : '#d4d4d4',
              }}>
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </Card>

      <Paragraph type="secondary" style={{ fontSize: 12, maxWidth: 800, marginTop: 12 }}>
        💡 提示：编译重启耗时 2-8 分钟。Nginx 配置修改后建议先「测试语法」再「重载配置」。
        保存配置会自动备份（.bak.时间戳）。应用日志支持自动刷新（10秒间隔）。
      </Paragraph>
    </div>
  );
}
