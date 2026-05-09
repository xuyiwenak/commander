import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Alert, Typography, Spin } from 'antd';
import { Line } from '@ant-design/plots';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '@/api/adminApi';

const { Title } = Typography;

interface Stats {
  todayNewUsers: number;
  todayCompletedSessions: number;
  todayPaidSessions: number;
  todayRevenue: number;
  totalUsers: number;
  totalPaidSessions: number;
  conversionRate: number;
  anomalyCount: number;
}

interface TrendRow {
  date: string;
  newSessions: number;
  completedSessions: number;
  paidSessions: number;
  revenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([dashboardApi.stats(), dashboardApi.trend(7)])
      .then(([sRes, tRes]) => {
        setStats((sRes.data as { data: Stats }).data);
        setTrend((tRes.data as { data: TrendRow[] }).data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;

  // 展开趋势数据为多系列格式
  const trendData = trend.flatMap(r => [
    { date: r.date, value: r.newSessions,       type: '新增测评' },
    { date: r.date, value: r.completedSessions,  type: '完成测评' },
    { date: r.date, value: r.paidSessions,        type: '付费' },
  ]);

  return (
    <>
      <Title level={4}>数据大盘</Title>

      {stats && stats.anomalyCount > 0 && (
        <Alert
          type="error"
          showIcon
          message={`检测到 ${stats.anomalyCount} 笔掉单（支付成功但报告未解锁）`}
          action={<a onClick={() => void navigate('/begreat/anomalies')}>立即处理</a>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="今日新增用户" value={stats?.todayNewUsers ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="今日完成测评" value={stats?.todayCompletedSessions ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="付费转化率" value={stats?.conversionRate ?? 0} suffix="%" /></Card></Col>
        <Col span={6}><Card><Statistic title="今日收入" value={(stats?.todayRevenue ?? 0) / 100} precision={2} prefix="¥" /></Card></Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card><Statistic title="累计用户" value={stats?.totalUsers ?? 0} /></Card></Col>
        <Col span={8}><Card><Statistic title="累计付费" value={stats?.totalPaidSessions ?? 0} /></Card></Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="当前掉单数"
              value={stats?.anomalyCount ?? 0}
              valueStyle={{ color: (stats?.anomalyCount ?? 0) > 0 ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近 7 天趋势">
        {trendData.length > 0 ? (
          <Line
            data={trendData}
            xField="date"
            yField="value"
            colorField="type"
            height={280}
          />
        ) : <div style={{ textAlign: 'center', color: '#999' }}>暂无数据</div>}
      </Card>
    </>
  );
}
