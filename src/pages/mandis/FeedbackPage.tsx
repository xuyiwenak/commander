import { useEffect, useState } from 'react';
import { Table, Tag, Typography } from 'antd';
import { http } from '@/api/client';

const { Title } = Typography;

interface Feedback {
  _id: string; userId: string; title: string; content: string; status: string; createdAt: string;
}

export default function FeedbackPage() {
  const [data, setData] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get('/api/admin/feedback').then((r) => setData((r.data as { list: Feedback[] }).list ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Title level={4}>反馈管理</Title>
      <Table dataSource={data} rowKey="_id" loading={loading}
        columns={[
          { title: '用户ID', dataIndex: 'userId' },
          { title: '标题', dataIndex: 'title' },
          { title: '内容', dataIndex: 'content', ellipsis: true },
          { title: '状态', dataIndex: 'status', render: (s: string) => {
            const color = s === 'resolved' ? 'green' : s === 'pending' ? 'orange' : 'blue';
            return <Tag color={color}>{s}</Tag>;
          }},
          { title: '时间', dataIndex: 'createdAt' },
        ]} />
    </>
  );
}
