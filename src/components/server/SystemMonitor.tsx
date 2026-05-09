import { useEffect, useState, useCallback } from 'react';
import {
  Card, Row, Col, Statistic, Table, Tag, Button,
  Typography, Space, message, Spin, Popconfirm, Progress, Empty,
} from 'antd';
import {
  ReloadOutlined, DashboardOutlined,
  CloudServerOutlined, ContainerOutlined, SettingOutlined,
} from '@ant-design/icons';
import type { SystemApi } from '@/api/systemApi';

const { Title, Text } = Typography;

// ── 常量 ──────────────────────────────────────────────────────────────────────

const AUTO_REFRESH_INTERVAL_MS = 15000;
const CPU_WARN_THRESHOLD  = 60;
const CPU_ERROR_THRESHOLD = 80;
const MEM_WARN_THRESHOLD  = 60;
const MEM_ERROR_THRESHOLD = 80;

// ── 类型 ──────────────────────────────────────────────────────────────────────

interface CpuInfo    { usage: number; cores: number; model: string; loadAvg: number[]; }
interface MemInfo    { total: number; used: number; free: number; usagePercent: number; }
interface SysInfo    { uptime: number; uptimeStr: string; nodeUptime: number; nodeUptimeStr: string; platform: string; hostname: string; }
interface MetricsData { cpu: CpuInfo; memory: MemInfo; system: SysInfo; }
interface DockerContainer { Names: string; Image: string; State: string; Status: string; CreatedAt: string; Ports?: string; }

// ── helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  const GB = 1_073_741_824;
  const MB = 1_048_576;
  const KB = 1_024;
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(0)} MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(0)} KB`;
  return `${bytes} B`;
}

const cpuColor = (usage: number) => (usage > CPU_ERROR_THRESHOLD ? '#ff4d4f' : usage > CPU_WARN_THRESHOLD ? '#faad14' : '#52c41a');
const memColor = (usage: number) => (usage > MEM_ERROR_THRESHOLD ? '#ff4d4f' : usage > MEM_WARN_THRESHOLD ? '#faad14' : '#52c41a');

// ── 组件 ──────────────────────────────────────────────────────────────────────

interface Props { api: SystemApi; }

export default function SystemMonitor({ api }: Props) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [metricsData, containersData] = await Promise.all([
        api.getMetrics(),
        api.getContainers(),
      ]);
      setMetrics(metricsData as MetricsData);
      const cdata = containersData as { containers?: DockerContainer[]; error?: string };
      if (cdata.error) {
        setDockerError(cdata.error);
        setContainers([]);
      } else {
        setDockerError(null);
        setContainers(cdata.containers ?? []);
      }
    } catch { /* silent fail on auto-refresh */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    void fetchData();
    const timer = setInterval(() => { void fetchData(true); }, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleRestart = async (name: string) => {
    setRestarting(name);
    try {
      await api.restartContainer(name);
      void message.success(`${name} 已重启`);
      setTimeout(() => { void fetchData(true); }, 3000);
    } catch {
      void message.error(`重启 ${name} 失败`);
    } finally { setRestarting(null); }
  };

  const containerColumns = [
    { title: '容器名', dataIndex: 'Names', key: 'Names', render: (n: string) => <Text code>{n}</Text> },
    { title: '镜像', dataIndex: 'Image', key: 'Image', ellipsis: true },
    {
      title: '状态', dataIndex: 'State', key: 'State',
      render: (s: string, r: DockerContainer) => (
        <Space>
          <Tag color={s === 'running' ? 'green' : s === 'exited' ? 'red' : 'orange'}>{s}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.Status}</Text>
        </Space>
      ),
    },
    {
      title: '端口', dataIndex: 'Ports', key: 'Ports', ellipsis: true,
      render: (p?: string) => p ? <Text style={{ fontSize: 12 }}>{p}</Text> : '-',
    },
    {
      title: '操作', key: 'actions',
      render: (_: unknown, r: DockerContainer) => (
        <Popconfirm title={`确定重启 ${r.Names}？`} onConfirm={() => { void handleRestart(r.Names); }} okText="重启" cancelText="取消">
          <Button size="small" danger loading={restarting === r.Names} disabled={restarting !== null}>重启</Button>
        </Popconfirm>
      ),
    },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />;

  const cpu = metrics?.cpu;
  const mem = metrics?.memory;
  const sys = metrics?.system;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <DashboardOutlined style={{ marginRight: 8 }} />
          系统监控
          {sys && (
            <Text type="secondary" style={{ fontSize: 14, marginLeft: 16, fontWeight: 400 }}>
              {sys.hostname} · {sys.platform}
            </Text>
          )}
        </Title>
        <Button icon={<ReloadOutlined />} onClick={() => { void fetchData(); }} loading={refreshing}>刷新</Button>
      </div>

      {metrics && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="CPU 使用率" value={cpu?.usage ?? 0} suffix="%" prefix={<CloudServerOutlined />} />
              <Progress percent={cpu?.usage ?? 0} showInfo={false} strokeColor={cpuColor(cpu?.usage ?? 0)} style={{ marginTop: 8 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>{cpu?.model?.slice(0, 40)} · {cpu?.cores} 核</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="内存" value={mem?.usagePercent ?? 0} suffix="%" prefix={<SettingOutlined />} />
              <Progress percent={mem?.usagePercent ?? 0} showInfo={false} strokeColor={memColor(mem?.usagePercent ?? 0)} style={{ marginTop: 8 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {mem ? `${formatBytes(mem.used)} / ${formatBytes(mem.total)}` : ''}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="系统运行时间" value={sys?.uptimeStr ?? '-'} />
              <Text type="secondary" style={{ fontSize: 12 }}>Node: {sys?.nodeUptimeStr ?? '-'}</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="负载 (1/5/15m)" value={cpu?.loadAvg?.[0]?.toFixed(2) ?? '-'} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {cpu?.loadAvg?.[1]?.toFixed(2)} / {cpu?.loadAvg?.[2]?.toFixed(2)}
              </Text>
            </Card>
          </Col>
        </Row>
      )}

      <Card title={<><ContainerOutlined style={{ marginRight: 8 }} />Docker 容器</>}>
        {dockerError ? (
          <Empty description={dockerError} />
        ) : containers.length === 0 ? (
          <Empty description="暂无容器数据" />
        ) : (
          <Table dataSource={containers} rowKey="Names" columns={containerColumns} pagination={false} size="middle" />
        )}
      </Card>
    </>
  );
}
