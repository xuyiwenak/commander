import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Button, Typography, Space, Tag,
  Popconfirm, message, Spin, Switch, InputNumber,
  Alert, Tooltip,
  Select,
} from 'antd';
import {
  ReloadOutlined, PlayCircleOutlined, StopOutlined,
  BuildOutlined, SyncOutlined,
  DeleteOutlined, FileTextOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useAppStore, type AppName } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

const { Title, Text } = Typography;

// ── App 元数据 ──
interface AppMeta { key: AppName; label: string; service: string; container: string; }
const APPS: Record<AppName, AppMeta> = {
  mandis: { key: 'mandis', label: 'Mandis 艺术工作室', service: 'mandis_app', container: 'miniapp-mandis' },
  begreat: { key: 'begreat', label: 'BeGreat 职业测评', service: 'begreat_app', container: 'miniapp-begreat' },
};

// ── axios ──
const longHttp = axios.create({ timeout: 600000 });
longHttp.interceptors.request.use((config) => {
  const { currentApp } = useAppStore.getState();
  const auth = useAuthStore.getState();
  const token = currentApp === 'mandis'
    ? (auth.mandisToken ?? localStorage.getItem('mandis_admin_token'))
    : (auth.begreatToken ?? localStorage.getItem('begreat_admin_token'));
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

// ── 类型 ──
interface ContainerInfo { Names: string; Image: string; State: string; Status: string; Ports?: string; }

// ── Apple 风格常量 ──
const CARD_STYLE: React.CSSProperties = {
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: 'none',
};

export default function ServerControlPage() {
  const currentApp = useAppStore((s) => s.currentApp);
  const appMeta = APPS[currentApp];

  const [noCache, setNoCache] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [operationLog, setOperationLog] = useState<string[]>([]);
  const [appLogs, setAppLogs] = useState<string[]>([]);
  const [logTail, setLogTail] = useState(200);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [containerError, setContainerError] = useState<string | null>(null);
  const [_fc, setFetchingContainers] = useState(false);
  // 日志文件选择
  interface LogFileInfo { name: string; type: string; date: string; size: number; }
  const [logFiles, setLogFiles] = useState<LogFileInfo[]>([]);
  const [selectedLogFile, setSelectedLogFile] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [appLogs, operationLog]);

  const appendOpLog = useCallback((line: string) => {
    setOperationLog((prev) => [...prev, ...line.split('\n').filter(Boolean)]);
  }, []);

  // ── 容器状态 ──
  const fetchContainers = useCallback(async () => {
    setFetchingContainers(true);
    setContainerError(null);
    try {
      const res = await longHttp.get('/api/admin/system/containers');
      const data = res.data as { containers?: ContainerInfo[]; error?: string };
      if (data.error) { setContainerError(data.error); setContainers([]); }
      else { setContainers(data.containers ?? []); setContainerError(null); }
    } catch (err: unknown) {
      setContainerError(axios.isAxiosError(err) ? err.message : String(err));
      setContainers([]);
    } finally { setFetchingContainers(false); }
  }, []);

  // ── 日志文件列表 ──
  const fetchLogFiles = useCallback(async () => {
    try {
      const res = await longHttp.get('/api/admin/system/app/log-files');
      const files = (res.data as { files: LogFileInfo[] }).files ?? [];
      setLogFiles(files);
      // 默认选今天的最新 game 日志
      if (!selectedLogFile && files.length > 0) {
        const gameFiles = files.filter((f) => f.type === 'game');
        setSelectedLogFile(gameFiles.length > 0 ? gameFiles[0].name : files[0].name);
      }
    } catch { /* ignore */ }
  }, [selectedLogFile]);

  // ── 应用日志 ──
  const fetchAppLogs = useCallback(async () => {
    setFetchingLogs(true);
    try {
      const params: Record<string, string | number> = { app: currentApp, tail: logTail };
      if (selectedLogFile) params.file = selectedLogFile;
      const res = await longHttp.get('/api/admin/system/app/logs', { params });
      const lines = (res.data as { lines: string[]; error?: string }).lines ?? [];
      const err = (res.data as { error?: string }).error;
      setAppLogs(err ? [`[Error] ${err}`] : lines.length === 0 ? ['(暂无日志)'] : lines);
    } catch (err: unknown) {
      setAppLogs([`[请求失败] ${axios.isAxiosError(err) ? err.message : String(err)}`]);
    } finally { setFetchingLogs(false); }
  }, [currentApp, logTail, selectedLogFile]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => { void fetchAppLogs(); }, 10000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchAppLogs]);

  useEffect(() => { void fetchContainers(); void fetchAppLogs(); void fetchLogFiles(); }, []); // eslint-disable-line
  useEffect(() => { void fetchContainers(); void fetchAppLogs(); void fetchLogFiles(); }, [currentApp]); // eslint-disable-line

  // ── 操作 ──
  const runAction = useCallback(async (label: string, url: string, body?: Record<string, unknown>) => {
    setLoading(label);
    setOperationLog([]);
    appendOpLog(`>>> [${new Date().toLocaleTimeString()}] ${label}`);
    try {
      const res = await longHttp.post(url, body ?? {});
      appendOpLog((res.data as { output: string }).output ?? '');
      appendOpLog(`>>> [${new Date().toLocaleTimeString()}] \u2705 ${label} 完成`);
      message.success(`${label} 完成`);
      setTimeout(() => { void fetchContainers(); void fetchAppLogs(); }, 3000);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as { message?: string })?.message ?? err.message : String(err);
      appendOpLog(`>>> [${new Date().toLocaleTimeString()}] \u274c 失败: ${msg}`);
      message.error(`${label} 失败`);
    } finally { setLoading(null); }
  }, [appendOpLog, fetchContainers, fetchAppLogs]);

  const appContainer = containers.find((c) => c.Names === appMeta.container);
  const isRunning = appContainer?.State === 'running';

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif" }}>

      {/* ── 标题行 ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1d1d1f' }}>
            应用控制台
          </Title>
          <Tag style={{
            fontSize: 12, borderRadius: 20, padding: '0 12px', lineHeight: '22px',
            background: '#f5f5f7', color: '#1d1d1f', border: '1px solid #e5e5e7',
          }}>
            {appMeta.label}
          </Tag>
        </div>
        <Button size="small" icon={<SyncOutlined />} onClick={() => { void fetchContainers(); void fetchAppLogs(); }}
          style={{ borderRadius: 20 }}>
          刷新
        </Button>
      </div>

      {/* ── 状态条 ── */}
      <div style={{
        ...CARD_STYLE,
        padding: '16px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' as const,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isRunning ? '#34c759' : appContainer ? '#ff3b30' : '#aeaeb2',
            display: 'inline-block',
          }} />
          <Text style={{ fontSize: 13, color: '#1d1d1f' }}>
            {appContainer ? (isRunning ? '运行中' : `已停止 (${appContainer.State})`) : '—'}
          </Text>
        </div>
        {appContainer && (
          <>
            <Text type="secondary" style={{ fontSize: 12 }}>{appContainer.Names}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{appContainer.Status}</Text>
            <Tooltip title={appContainer.Image}>
              <Text type="secondary" style={{ fontSize: 12, maxWidth: 200 }} ellipsis>
                {appContainer.Image}
              </Text>
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 12 }}>{appContainer.Ports || '—'}</Text>
          </>
        )}
        <div style={{ flex: 1 }} />
        <Space size={4} wrap>
          {containers.map((c) => (
            <span key={c.Names} style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
              background: c.State === 'running' ? '#34c759' : c.State === 'exited' ? '#ff3b30' : '#aeaeb2',
            }} title={c.Names.replace('bf2ad4a566ef_', '') + ': ' + c.State} />
          ))}
        </Space>
      </div>

      {containerError && (
        <Alert type="error" message={containerError} showIcon style={{ marginBottom: 16, borderRadius: 12 }} closable />
      )}

      {/* ── 控制栏 ── */}
      <div style={{
        ...CARD_STYLE,
        padding: '12px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const,
      }}>
        <Text style={{ fontSize: 12, fontWeight: 600, color: '#86868b', marginRight: 4 }}>容器</Text>
        <Popconfirm title={`重启 ${appMeta.label}？`} onConfirm={() => runAction('普通重启', '/api/admin/system/app/restart', { app: currentApp })} okText="确定" cancelText="取消">
          <Button size="small" icon={<PlayCircleOutlined />} loading={loading === '普通重启'} disabled={loading !== null}
            style={{ borderRadius: 20, fontWeight: 500 }}>
            普通重启
          </Button>
        </Popconfirm>
        <Popconfirm title={`编译重启 ${appMeta.label}？${noCache ? '(--no-cache)' : ''}`} onConfirm={() => runAction('编译重启', '/api/admin/system/app/build-restart', { app: currentApp, noCache })} okText="确定" cancelText="取消">
          <Button size="small" icon={<BuildOutlined />} loading={loading === '编译重启'} disabled={loading !== null}
            style={{ borderRadius: 20 }}>
            编译重启
          </Button>
        </Popconfirm>
        <Switch checked={noCache} onChange={setNoCache} disabled={loading !== null}
          checkedChildren="no-cache" unCheckedChildren="缓存" size="small" />
        <Popconfirm title={`停止 ${appMeta.label}？`} description="服务将不可用" onConfirm={() => runAction('停止容器', '/api/admin/system/app/stop', { app: currentApp })} okText="停止" cancelText="取消" okButtonProps={{ danger: true }}>
          <Button size="small" danger icon={<StopOutlined />} loading={loading === '停止容器'} disabled={loading !== null}
            style={{ borderRadius: 20 }}>
            停止
          </Button>
        </Popconfirm>
        <div style={{ width: 1, height: 20, background: '#e5e5e7', margin: '0 4px' }} />
        <Popconfirm title="清理悬空镜像？" onConfirm={() => runAction('清理镜像', '/api/admin/system/prune')} okText="确定" cancelText="取消">
          <Button size="small" icon={<DeleteOutlined />} loading={loading === '清理镜像'} disabled={loading !== null}
            style={{ borderRadius: 20 }}>
            清理镜像
          </Button>
        </Popconfirm>
      </div>

      {/* ── 日志面板（全宽 + 撑满） ── */}
      <div style={{ ...CARD_STYLE, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Space wrap>
            <FileTextOutlined style={{ color: '#86868b' }} />
            <Text style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>应用日志</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{appMeta.container}</Text>
            <Select
              size="small"
              value={selectedLogFile}
              onChange={(v) => { setSelectedLogFile(v); }}
              style={{ width: 180, borderRadius: 8 }}
              placeholder="选择日志文件"
              popupMatchSelectWidth={false}
            >
              {(() => {
                const types = [...new Set(logFiles.map((f) => f.type))];
                return types.map((type) => ({
                  label: type,
                  options: logFiles.filter((f) => f.type === type).map((f) => ({
                    value: f.name,
                    label: `${f.date}  (${(f.size / 1024).toFixed(1)}KB)`,
                  })),
                }));
              })().map((group) => (
                <Select.OptGroup key={group.label} label={group.label}>
                  {group.options.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Space>
          <Space>
            <Switch checked={autoRefresh} onChange={setAutoRefresh} size="small"
              checkedChildren="自动" unCheckedChildren="手动" />
            <Text style={{ fontSize: 11, color: '#86868b' }}>行数</Text>
            <InputNumber size="small" min={50} max={5000} value={logTail}
              onChange={(v) => setLogTail(v ?? 200)} style={{ width: 65, borderRadius: 8 }} />
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchAppLogs}
              loading={fetchingLogs} disabled={loading !== null} style={{ borderRadius: 20 }}>
              刷新
            </Button>
          </Space>
        </div>
        <div style={{
          background: '#1c1c1e',
          color: '#e5e5e7',
          padding: '16px 20px',
          fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
          fontSize: 12, lineHeight: 1.7,
          height: 'calc(100vh - 420px)',
          minHeight: 400,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {appLogs.length === 0 && fetchingLogs ? (
            <Spin tip="加载中..." style={{ display: 'block', margin: '60px auto' }} />
          ) : appLogs.map((line, i) => (
            <div key={i} style={{
              color: line.startsWith('[Error]') || line.startsWith('[请求失败]') ? '#ff453a'
                : line.includes('ERROR') ? '#ff453a'
                : line.includes('WARN') ? '#ff9f0a'
                : '#e5e5e7',
            }}>
              {line}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* ── 操作日志（执行命令时显示） ── */}
      {operationLog.length > 0 && (
        <div style={{ ...CARD_STYLE, marginTop: 16, overflow: 'hidden' }}>
          <div style={{ padding: '10px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltOutlined style={{ color: '#86868b' }} />
            <Text style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>操作输出</Text>
            {loading && <Spin size="small" />}
          </div>
          <div style={{
            background: '#1c1c1e', color: '#e5e5e7',
            padding: '12px 20px',
            fontFamily: "'SF Mono', 'Menlo', monospace",
            fontSize: 12, lineHeight: 1.6,
            maxHeight: 300, overflow: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {operationLog.map((line, i) => (
              <div key={i} style={{ color: line.startsWith('>>>') ? '#64d2ff' : '#e5e5e7' }}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}