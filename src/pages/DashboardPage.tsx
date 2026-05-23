import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Empty, Skeleton, Alert, Progress } from 'antd';
import { Line, Pie, Column } from '@ant-design/plots';
import { useLocation } from 'react-router-dom';
import { http } from '@/api/client';
import { getModuleByPath } from '@/app-modules';
import { BI_PANELS } from '@/config/biPanels';

const { Title } = Typography;

interface DashboardData {
  overview: { totalEvents: number; totalUsers: number; successRate: number; avgResponseTime: number };
  qwenCosts: { totalCost: number; totalTokens: number; trend: string; breakdown: Array<{ model?: string; period?: string; tokens: number; cost: number; requests: number }> };
  topErrors: Array<{ errorCode: string; count: number; rate: number }>;
  recentActivity: Array<{ timestamp: string; totalEvents: number }>;
}

interface TrendItem {
  timestamp: string; totalEvents: number; successRate: number; avgDurationMs: number; uniqueUsers?: number;
}

interface FunnelData {
  registered: number; uploaded: number; analyzed: number;
}

interface UploadStats {
  totalUploads: number; totalBytes: number; avgBytes: number;
  contentTypes: Array<{ type: string; count: number; bytes: number }>;
}

interface EmotionStats {
  dimensionAvgs: Array<{ key: string; label: string; avg: number }>;
  dominantDistribution: Array<{ key: string; label: string; count: number }>;
}

export default function DashboardPage() {
  const { pathname } = useLocation();
  const currentApp = getModuleByPath(pathname)?.appName ?? 'mandis';
  const [data, setData] = useState<DashboardData | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [emotionStats, setEmotionStats] = useState<EmotionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appName = currentApp;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const now = new Date().toISOString();

    Promise.all([
      http.get('/api/bi/dashboard', { params: { timeRange: '7d', appName } }),
      http.get('/api/bi/trends', { params: { startTime: thirtyDaysAgo, endTime: now, granularity: 'daily', appName, metrics: ['totalEvents', 'successRate', 'avgDurationMs', 'uniqueUsers'] } }),
      http.get('/api/bi/funnel', { params: { startTime: thirtyDaysAgo, endTime: now, appName } }),
      http.get('/api/bi/upload-stats', { params: { startTime: thirtyDaysAgo, endTime: now, appName } }),
      http.get('/api/bi/emotion-stats', { params: { startTime: thirtyDaysAgo, endTime: now } }),
    ])
      .then(([dRes, tRes, fRes, uRes, eRes]) => {
        if (!cancelled) {
          setData(dRes.data as DashboardData);
          setTrends((tRes.data ?? []) as TrendItem[]);
          setFunnel(fRes.data as FunnelData ?? null);
          setUploadStats(uRes.data as UploadStats ?? null);
          setEmotionStats(eRes.data as EmotionStats ?? null);
          setError(null);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    const timer = setInterval(() => {
      http.get('/api/bi/dashboard', { params: { timeRange: '7d', appName } })
        .then((dRes) => { if (!cancelled) setData(dRes.data as DashboardData); })
        .catch(() => {});
    }, 60_000);

    return () => { cancelled = true; clearInterval(timer); };
  }, [appName]);

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (error) {
    return (
      <Alert type="info" message="系统监控数据收集中，请稍后刷新"
        description={error}
        style={{ marginBottom: 16 }} />
    );
  }

  const overview = data?.overview;
  const panelVisible = BI_PANELS.filter((p) => p.visible.includes(currentApp));

  const trendLineData = trends.map((t) => [
    { timestamp: t.timestamp.slice(0, 10), value: t.totalEvents, type: '事件量' },
    { timestamp: t.timestamp.slice(0, 10), value: Math.round(t.successRate * 100), type: '成功率(%)' },
  ]).flat();

  const dauLineData = trends
    .filter((t) => (t.uniqueUsers ?? 0) > 0)
    .map((t) => ({ date: t.timestamp.slice(0, 10), dau: t.uniqueUsers ?? 0 }));

  const costPieData = (data?.qwenCosts?.breakdown ?? []).map((b) => ({
    type: b.model ?? b.period ?? 'unknown',
    value: b.cost,
  }));

  return (
    <>
      <Title level={4}>BI 仪表盘 — {currentApp === 'mandis' ? 'Mandis' : 'BeGreat'}</Title>

      {/* 概览卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="总事件数" value={overview?.totalEvents ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="活跃用户" value={overview?.totalUsers ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="成功率" value={((overview?.successRate ?? 0) * 100).toFixed(1)} suffix="%" /></Card></Col>
        <Col span={6}><Card><Statistic title="平均响应" value={Math.round(overview?.avgResponseTime ?? 0)} suffix="ms" /></Card></Col>
      </Row>

      {/* 趋势图 (公共) */}
      {panelVisible.some((p) => p.key === 'apiPerformance') && (
        <Card title="API 性能趋势 (30天)" style={{ marginBottom: 16 }}>
          {trendLineData.length > 0 ? (
            <Line data={trendLineData} xField="timestamp" yField="value" colorField="type" height={260} />
          ) : <Empty description="暂无数据" />}
        </Card>
      )}

      <Row gutter={16}>
        {/* 错误分析 (公共) */}
        {panelVisible.some((p) => p.key === 'errorAnalysis') && (
          <Col span={12}>
            <Card title="错误 Top 5" style={{ marginBottom: 16 }}>
              {(data?.topErrors?.length ?? 0) > 0 ? (
                <Table
                  dataSource={data?.topErrors ?? []}
                  rowKey="errorCode"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: '错误码', dataIndex: 'errorCode' },
                    { title: '次数', dataIndex: 'count' },
                    { title: '占比', dataIndex: 'rate', render: (v: number) => `${(v * 100).toFixed(1)}%` },
                  ]}
                />
              ) : <Empty description="无错误记录" />}
            </Card>
          </Col>
        )}

        {/* Qwen 成本 (mandis 专属) */}
        {panelVisible.some((p) => p.key === 'qwenCosts') && (
          <Col span={12}>
            <Card title="Qwen 成本" style={{ marginBottom: 16 }}>
              {(data?.qwenCosts?.totalCost ?? 0) > 0 ? (
                <>
                  <Row gutter={16} style={{ marginBottom: 12 }}>
                    <Col span={12}><Statistic title="总成本" value={data?.qwenCosts?.totalCost.toFixed(2) ?? 0} prefix="¥" /></Col>
                    <Col span={12}><Statistic title="总 Token" value={data?.qwenCosts?.totalTokens?.toLocaleString() ?? 0} /></Col>
                  </Row>
                  {costPieData.length > 0 && <Pie data={costPieData} angleField="value" colorField="type" height={180} />}
                </>
              ) : <Empty description="当前应用无 AI 分析数据" />}
            </Card>
          </Col>
        )}

        {/* 上传统计 (mandis 专属) */}
        {panelVisible.some((p) => p.key === 'uploadStats') && (
          <Col span={12}>
            <Card title="上传统计 (30天)" style={{ marginBottom: 16 }}>
              {(uploadStats?.totalUploads ?? 0) > 0 ? (
                <>
                  <Row gutter={16} style={{ marginBottom: 12 }}>
                    <Col span={8}><Statistic title="总上传数" value={uploadStats?.totalUploads ?? 0} /></Col>
                    <Col span={8}><Statistic title="总大小" value={((uploadStats?.totalBytes ?? 0) / 1048576).toFixed(1)} suffix="MB" /></Col>
                    <Col span={8}><Statistic title="平均大小" value={((uploadStats?.avgBytes ?? 0) / 1024).toFixed(0)} suffix="KB" /></Col>
                  </Row>
                  <Table
                    dataSource={uploadStats?.contentTypes ?? []}
                    rowKey="type"
                    pagination={false}
                    size="small"
                    columns={[
                      { title: '文件类型', dataIndex: 'type' },
                      { title: '数量', dataIndex: 'count' },
                      { title: '占比', key: 'ratio', render: (_: unknown, row: { count: number }) => `${uploadStats?.totalUploads ? ((row.count / uploadStats.totalUploads) * 100).toFixed(1) : 0}%` },
                    ]}
                  />
                </>
              ) : <Empty description="暂无上传数据" />}
            </Card>
          </Col>
        )}

        {/* 热门端点 (公共) */}
        {panelVisible.some((p) => p.key === 'hotEndpoints') && (
          <Col span={12}>
            <Card title="热门端点" style={{ marginBottom: 16 }}>
              <Empty description="端点排行需查询原始事件表（后续优化）" />
            </Card>
          </Col>
        )}
      </Row>

      {/* 用户漏斗 (mandis 专属) */}
      {panelVisible.some((p) => p.key === 'userFunnel') && (
        <Card title="用户行为漏斗 (30天)" style={{ marginBottom: 16 }}>
          {funnel && (funnel.registered + funnel.uploaded + funnel.analyzed) > 0 ? (() => {
            const uploadRate = funnel.registered ? ((funnel.uploaded / funnel.registered) * 100).toFixed(1) : '0';
            const analyzeRate = funnel.uploaded ? ((funnel.analyzed / funnel.uploaded) * 100).toFixed(1) : '0';
            return (
              <Row gutter={24} align="middle">
                <Col span={6}>
                  <Statistic title="新注册用户" value={funnel.registered} />
                  <Progress percent={100} showInfo={false} strokeColor="#4DBFB4" />
                </Col>
                <Col span={2} style={{ textAlign: 'center', color: '#8d8d95' }}>→ {uploadRate}%</Col>
                <Col span={6}>
                  <Statistic title="上传作品" value={funnel.uploaded} />
                  <Progress percent={funnel.registered ? Math.round(funnel.uploaded / funnel.registered * 100) : 0} showInfo={false} strokeColor="#C8529A" />
                </Col>
                <Col span={2} style={{ textAlign: 'center', color: '#8d8d95' }}>→ {analyzeRate}%</Col>
                <Col span={6}>
                  <Statistic title="AI 分析完成" value={funnel.analyzed} />
                  <Progress percent={funnel.registered ? Math.round(funnel.analyzed / funnel.registered * 100) : 0} showInfo={false} strokeColor="#1B3A6B" />
                </Col>
              </Row>
            );
          })() : <Empty description="暂无漏斗数据" />}
        </Card>
      )}

      {/* DAU 趋势 (mandis 专属) */}
      {panelVisible.some((p) => p.key === 'dauTrend') && (
        <Card title="DAU 趋势 (30天)" style={{ marginBottom: 16 }}>
          {dauLineData.length > 0 ? (
            <Line data={dauLineData} xField="date" yField="dau" height={260} />
          ) : <Empty description="暂无活跃用户数据" />}
        </Card>
      )}

      {/* 情绪分布 (mandis 专属) */}
      {panelVisible.some((p) => p.key === 'emotionStats') && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={14}>
            <Card title="情绪维度均值 (30天)">
              {(emotionStats?.dimensionAvgs.some((d) => d.avg > 0)) ? (
                <Column
                  data={emotionStats?.dimensionAvgs ?? []}
                  xField="label"
                  yField="avg"
                  height={260}
                  axis={{ y: { max: 100 } }}
                />
              ) : <Empty description="暂无情绪分析数据" />}
            </Card>
          </Col>
          <Col span={10}>
            <Card title="主导情绪分布 (30天)">
              {(emotionStats?.dominantDistribution.length ?? 0) > 0 ? (
                <Pie
                  data={emotionStats?.dominantDistribution ?? []}
                  angleField="count"
                  colorField="label"
                  height={260}
                />
              ) : <Empty description="暂无情绪分析数据" />}
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
}
