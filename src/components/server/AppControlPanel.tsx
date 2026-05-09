import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Button, Typography, Space, Tag,
  Popconfirm, message, Spin, Switch, InputNumber,
  Alert, Tooltip, Select,
} from 'antd';
import {
  ReloadOutlined, PlayCircleOutlined, StopOutlined,
  BuildOutlined, SyncOutlined, DeleteOutlined,
  FileTextOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import type { SystemApi } from '@/api/systemApi';
import type { AppName } from '@/store/appStore';
import { useRuntimeConfig } from '@/components/RuntimeConfig';

const { Title, Text } = Typography;

// ── 常量 ──────────────────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: 'none',
};

// ── 类型 ──────────────────────────────────────────────────────────────────────

interface ContainerInfo { Names: string; Image: string; State: string; Status: string; Ports?: string; }
interface LogFileInfo   { name: string; type: string; date: string; size: number; }

// ── 组件 ──────────────────────────────────────────────────────────────────────

interface Props {
  appName: AppName;
  api: SystemApi;
}

export default function AppControlPanel({ appName, api }: Props) {
  const {
    label: appLabel,
    dockerContainerName: appContainer,
    logAutoRefreshIntervalMs: LOG_AUTO_REFRESH_INTERVAL_MS,
    containerRefreshDelayMs:  CONTAINER_REFRESH_DELAY_MS,
    defaultLogTail:           DEFAULT_LOG_TAIL,
  } = useRuntimeConfig(appName);

  const [noCache,    setNoCache]    = useState(false);
  const [loading,    setLoading]    = useState<string | null>(null);
  const [opLog,      setOpLog]      = useState<string[]>([]);
  const [appLogs,    setAppLogs]    = useState<string[]>([]);
  const [logTail,    setLogTail]    = useState(DEFAULT_LOG_TAIL);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [autoRefresh,  setAutoRefresh]  = useState(false);
  const [containers,   setContainers]   = useState<ContainerInfo[]>([]);
  const [containerErr, setContainerErr] = useState<string | null>(null);
  const [logFiles,     setLogFiles]     = useState<LogFileInfo[]>([]);
  const [selectedLog,  setSelectedLog]  = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [appLogs, opLog]);

  const appendOpLog = useCallback((line: string) => {
    setOpLog((prev) => [...prev, ...line.split('\n').filter(Boolean)]);
  }, []);

  const fetchContainers = useCallback(async () => {
    setContainerErr(null);
    try {
      const data = await api.getContainers() as { containers?: ContainerInfo[]; error?: string };
      if (data.error) { setContainerErr(data.error); setContainers([]); }
      else { setContainers(data.containers ?? []); }
    } catch (err) {
      setContainerErr(err instanceof Error ? err.message : String(err));
      setContainers([]);
    }
  }, [api]);

  const fetchLogFiles = useCallback(async () => {
    try {
      const data = await api.appLogFiles() as { files: LogFileInfo[] };
      const files = data.files ?? [];
      setLogFiles(files);
      if (!selectedLog && files.length > 0) {
        const gameFiles = files.filter((f) => f.type === 'game');
        setSelectedLog(gameFiles.length > 0 ? gameFiles[0].name : files[0].name);
      }
    } catch { /* ignore */ }
  }, [api, selectedLog]);

  const fetchAppLogs = useCallback(async () => {
    setFetchingLogs(true);
    try {
      const data = await api.appLogs(appName, logTail, selectedLog || undefined) as { lines?: string[]; error?: string };
      const err  = data.error;
      setAppLogs(err ? [`[Error] ${err}`] : (data.lines ?? []).length === 0 ? ['(暂无日志)'] : (data.lines ?? []));
    } catch (err) {
      setAppLogs([`[请求失败] ${err instanceof Error ? err.message : String(err)}`]);
    } finally { setFetchingLogs(false); }
  }, [api, appName, logTail, selectedLog]);

  useEffect(() => {
    void fetchContainers();
    void fetchAppLogs();
    void fetchLogFiles();
  }, [appName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => { void fetchAppLogs(); }, LOG_AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [autoRefresh, fetchAppLogs]);

  const runAction = useCallback(async (label: string, action: () => Promise<unknown>) => {
    setLoading(label);
    setOpLog([]);
    appendOpLog(`>>> [${new Date().toLocaleTimeString()}] ${label}`);
    try {
      const result = await action();
      appendOpLog((result as { output?: string }).output ?? '');
      appendOpLog(`>>> [${new Date().toLocaleTimeString()}] ✅ ${label} 完成`);
      void message.success(`${label} 完成`);
      setTimeout(() => { void fetchContainers(); void fetchAppLogs(); }, CONTAINER_REFRESH_DELAY_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendOpLog(`>>> [${new Date().toLocaleTimeString()}] ❌ 失败: ${msg}`);
      void message.error(`${label} 失败`);
    } finally { setLoading(null); }
  }, [appendOpLog, fetchContainers, fetchAppLogs]);

  const currentContainer = containers.find((c) => c.Names === appContainer);
  const isRunning        = currentContainer?.State === 'running';

  const logFileGroups = (() => {
    const types = [...new Set(logFiles.map((f) => f.type))];
    return types.map((type) => ({
      label:   type,
      options: logFiles.filter((f) => f.type === type).map((f) => ({
        value: f.name,
        label: `${f.date}  (${(f.size / 1024).toFixed(1)}KB)`,
      })),
    }));
  })();

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif" }}>

      {/* 标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1d1d1f' }}>应用控制台</Title>
          <Tag style={{ fontSize: 12, borderRadius: 20, padding: '0 12px', lineHeight: '22px',
            background: '#f5f5f7', color: '#1d1d1f', border: '1px solid #e5e5e7' }}>
            {appLabel}
          </Tag>
        </div>
        <Button size="small" icon={<SyncOutlined />} onClick={() => { void fetchContainers(); void fetchAppLogs(); }}
          style={{ borderRadius: 20 }}>刷新</Button>
      </div>

      {/* 状态条 */}
      <div style={{ ...CARD_STYLE, padding: '16px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
            background: isRunning ? '#34c759' : currentContainer ? '#ff3b30' : '#aeaeb2',
          }} />
          <Text style={{ fontSize: 13, color: '#1d1d1f' }}>
            {currentContainer ? (isRunning ? '运行中' : `已停止 (${currentContainer.State})`) : '—'}
          </Text>
        </div>
        {currentContainer && (
          <>
            <Text type="secondary" style={{ fontSize: 12 }}>{currentContainer.Names}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{currentContainer.Status}</Text>
            <Tooltip title={currentContainer.Image}>
              <Text type="secondary" style={{ fontSize: 12, maxWidth: 200 }} ellipsis>{currentContainer.Image}</Text>
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 12 }}>{currentContainer.Ports || '—'}</Text>
          </>
        )}
        <div style={{ flex: 1 }} />
        <Space size={4} wrap>
          {containers.map((c) => (
            <span key={c.Names} style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
              background: c.State === 'running' ? '#34c759' : c.State === 'exited' ? '#ff3b30' : '#aeaeb2',
            }} title={`${c.Names}: ${c.State}`} />
          ))}
        </Space>
      </div>

      {containerErr && (
        <Alert type="error" message={containerErr} showIcon style={{ marginBottom: 16, borderRadius: 12 }} closable />
      )}

      {/* 控制栏 */}
      <div style={{ ...CARD_STYLE, padding: '12px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
        <Text style={{ fontSize: 12, fontWeight: 600, color: '#86868b', marginRight: 4 }}>容器</Text>
        <Popconfirm title={`重启 ${appLabel}？`} okText="确定" cancelText="取消"
          onConfirm={() => { void runAction('普通重启', () => api.appRestart(appName)); }}>
          <Button size="small" icon={<PlayCircleOutlined />} loading={loading === '普通重启'}
            disabled={loading !== null} style={{ borderRadius: 20, fontWeight: 500 }}>普通重启</Button>
        </Popconfirm>
        <Popconfirm title={`编译重启 ${appLabel}？${noCache ? ' (--no-cache)' : ''}`} okText="确定" cancelText="取消"
          onConfirm={() => { void runAction('编译重启', () => api.appBuildRestart(appName, noCache)); }}>
          <Button size="small" icon={<BuildOutlined />} loading={loading === '编译重启'}
            disabled={loading !== null} style={{ borderRadius: 20 }}>编译重启</Button>
        </Popconfirm>
        <Switch checked={noCache} onChange={setNoCache} disabled={loading !== null}
          checkedChildren="no-cache" unCheckedChildren="缓存" size="small" />
        <Popconfirm title={`停止 ${appLabel}？`} description="服务将不可用" okText="停止" cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => { void runAction('停止容器', () => api.appStop(appName)); }}>
          <Button size="small" danger icon={<StopOutlined />} loading={loading === '停止容器'}
            disabled={loading !== null} style={{ borderRadius: 20 }}>停止</Button>
        </Popconfirm>
        <div style={{ width: 1, height: 20, background: '#e5e5e7', margin: '0 4px' }} />
        <Popconfirm title="清理悬空镜像？" okText="确定" cancelText="取消"
          onConfirm={() => { void runAction('清理镜像', () => api.pruneImages()); }}>
          <Button size="small" icon={<DeleteOutlined />} loading={loading === '清理镜像'}
            disabled={loading !== null} style={{ borderRadius: 20 }}>清理镜像</Button>
        </Popconfirm>
      </div>

      {/* 日志面板 */}
      <div style={{ ...CARD_STYLE, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Space wrap>
            <FileTextOutlined style={{ color: '#86868b' }} />
            <Text style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>应用日志</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{appContainer}</Text>
            <Select size="small" value={selectedLog} onChange={setSelectedLog}
              style={{ width: 180, borderRadius: 8 }} placeholder="选择日志文件" popupMatchSelectWidth={false}>
              {logFileGroups.map((group) => (
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
              onChange={(v) => setLogTail(v ?? DEFAULT_LOG_TAIL)} style={{ width: 65, borderRadius: 8 }} />
            <Button size="small" icon={<ReloadOutlined />} onClick={() => { void fetchAppLogs(); }}
              loading={fetchingLogs} disabled={loading !== null} style={{ borderRadius: 20 }}>刷新</Button>
          </Space>
        </div>
        <div style={{
          background: '#1c1c1e', color: '#e5e5e7',
          padding: '16px 20px',
          fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
          fontSize: 12, lineHeight: 1.7,
          height: 'calc(100vh - 420px)', minHeight: 400,
          overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {appLogs.length === 0 && fetchingLogs ? (
            <Spin tip="加载中..." style={{ display: 'block', margin: '60px auto' }} />
          ) : appLogs.map((line, i) => (
            <div key={i} style={{
              color: line.startsWith('[Error]') || line.startsWith('[请求失败]') || line.includes('ERROR')
                ? '#ff453a' : line.includes('WARN') ? '#ff9f0a' : '#e5e5e7',
            }}>{line}</div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* 操作输出 */}
      {opLog.length > 0 && (
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
            {opLog.map((line, i) => (
              <div key={i} style={{ color: line.startsWith('>>>') ? '#64d2ff' : '#e5e5e7' }}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
