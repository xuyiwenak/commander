import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Empty, Skeleton, Alert } from 'antd';
import { Line, Pie } from '@ant-design/plots';
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
  timestamp: string; totalEvents: number; successRate: number; avgDurationMs: number;
}

export default function DashboardPage() {
  const { pathname } = useLocation();
  const currentApp = getModuleByPath(pathname)?.appName ?? 'mandis';
  const [data, setData] = useState<DashboardData | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appName = currentApp;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      http.get('/api/bi/dashboard', { params: { timeRange: '7d', appName } }),
      http.get('/api/bi/trends', { params: { startTime: new Date(Date.now() - 7 * 86400000).toISOString(), endTime: new Date().toISOString(), granularity: 'daily', appName } }),
    ])
      .then(([dRes, tRes]) => {
        if (!cancelled) {
          setData(dRes.data as DashboardData);
          setTrends((tRes.data ?? []) as TrendItem[]);
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
        <Card title="API 性能趋势 (7天)" style={{ marginBottom: 16 }}>
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
            <Card title="上传统计" style={{ marginBottom: 16 }}>
              <Empty description="上传数据需查询原始事件表（后续优化）" />
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
    </>
  );
}
