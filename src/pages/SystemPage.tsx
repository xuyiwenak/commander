import { useEffect, useState, useCallback } from 'react';
import {
  Card, Row, Col, Statistic, Table, Tag, Button,
  Typography, Space, message, Spin, Popconfirm, Progress, Empty,
} from 'antd';
import {
  ReloadOutlined, DashboardOutlined,
  CloudServerOutlined, ContainerOutlined, SettingOutlined,
} from '@ant-design/icons';
import { http } from '@/api/client';

const { Title, Text } = Typography;

// ── types ──

interface CpuInfo {
  usage: number;        // 百分比，如 12.3
  cores: number;
  model: string;
  loadAvg: number[];
}

interface MemInfo {
  total: number;        // bytes
  used: number;
  free: number;
  usagePercent: number; // 百分比
}

interface SysInfo {
  uptime: number;
  uptimeStr: string;
  nodeUptime: number;
  nodeUptimeStr: string;
  platform: string;
  hostname: string;
}

interface MetricsData {
  cpu: CpuInfo;
  memory: MemInfo;
  system: SysInfo;
}

interface DockerContainer {
  Names: string;
  Image: string;
  State: string;        // running / exited / ...
  Status: string;
  CreatedAt: string;
  Ports?: string;
}

// ── helpers ──

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

const CPU_COLOR = (usage: number) => (usage > 80 ? '#ff4d4f' : usage > 60 ? '#faad14' : '#52c41a');
const MEM_COLOR = (usage: number) => (usage > 80 ? '#ff4d4f' : usage > 60 ? '#faad14' : '#52c41a');

// ── component ──

export default function SystemPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [metricsRes, containersRes] = await Promise.all([
        http.get('/api/admin/system/metrics'),
        http.get('/api/admin/system/containers'),
      ]);
      setMetrics(metricsRes.data as MetricsData);
      const cdata = containersRes.data as { containers?: DockerContainer[]; error?: string };
      if (cdata.error) {
        setDockerError(cdata.error);
        setContainers([]);
      } else {
        setDockerError(null);
        setContainers(cdata.containers ?? []);
      }
    } catch {
      // silent fail on auto-refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 初次加载 + 每 15 秒刷新
  useEffect(() => {
    void fetchData();
    const timer = setInterval(() => { void fetchData(true); }, 15_000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleRestart = async (name: string) => {
    setRestarting(name);
    try {
      await http.post('/api/admin/system/restart', { name });
      message.success(`${name} 已重启`);
      // 等 3 秒后刷新容器列表
      setTimeout(() => { void fetchData(true); }, 3000);
    } catch {
      message.error(`重启 ${name} 失败`);
    } finally {
      setRestarting(null);
    }
  };

  const handleRefresh = () => { void fetchData(); };

  const cpu = metrics?.cpu;
  const mem = metrics?.memory;
  const sys = metrics?.system;

  // ── container table columns ──

  const containerColumns = [
    {
      title: '容器名', dataIndex: 'Names', key: 'Names',
      render: (n: string) => <Text code>{n}</Text>,
    },
    {
      title: '镜像', dataIndex: 'Image', key: 'Image',
      ellipsis: true,
    },
    {
      title: '状态', dataIndex: 'State', key: 'State',
      render: (s: string, r: DockerContainer) => (
        <Space>
          <Tag color={s === 'running' ? 'green' : s === 'exited' ? 'red' : 'orange'}>
            {s}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.Status}</Text>
        </Space>
      ),
    },
    {
      title: '端口', dataIndex: 'Ports', key: 'Ports',
      ellipsis: true,
      render: (p: string | undefined) => p ? <Text style={{ fontSize: 12 }}>{p}</Text> : '-',
    },
    {
      title: '操作', key: 'actions',
      render: (_: unknown, r: DockerContainer) => (
        <Popconfirm
          title={`确定重启 ${r.Names}？`}
          onConfirm={() => { void handleRestart(r.Names); }}
          okText="重启"
          cancelText="取消"
        >
          <Button
            size="small"
            danger
            loading={restarting === r.Names}
            disabled={restarting !== null}
          >
            重启
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // ── render ──

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />;

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
        <Button icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh} loading={refreshing}>
          刷新
        </Button>
      </div>

      {/* ── 系统资源卡片 ── */}
      {metrics && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="CPU 使用率"
                value={cpu?.usage ?? 0}
                suffix="%"
                prefix={<CloudServerOutlined />}
              />
              <Progress
                percent={cpu?.usage ?? 0}
                showInfo={false}
                strokeColor={CPU_COLOR(cpu?.usage ?? 0)}
                style={{ marginTop: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {cpu?.model?.slice(0, 40)} · {cpu?.cores} 核
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="内存"
                value={mem?.usagePercent ?? 0}
                suffix="%"
                prefix={<SettingOutlined />}
              />
              <Progress
                percent={mem?.usagePercent ?? 0}
                showInfo={false}
                strokeColor={MEM_COLOR(mem?.usagePercent ?? 0)}
                style={{ marginTop: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {mem ? `${formatBytes(mem.used)} / ${formatBytes(mem.total)}` : ''}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="系统运行时间"
                value={sys?.uptimeStr ?? '-'}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Node: {sys?.nodeUptimeStr ?? '-'}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="负载 (1/5/15m)"
                value={cpu?.loadAvg?.[0]?.toFixed(2) ?? '-'}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {cpu?.loadAvg?.[1]?.toFixed(2)} / {cpu?.loadAvg?.[2]?.toFixed(2)}
              </Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* ── Docker 容器 ── */}
      <Card
        title={<><ContainerOutlined style={{ marginRight: 8 }} />Docker 容器</>}
        style={{ marginBottom: 24 }}
      >
        {dockerError ? (
          <Empty description={dockerError} />
        ) : containers.length === 0 ? (
          <Empty description="暂无容器数据" />
        ) : (
          <Table
            dataSource={containers}
            rowKey="Names"
            columns={containerColumns}
            pagination={false}
            size="middle"
          />
        )}
      </Card>
    </>
  );
}
