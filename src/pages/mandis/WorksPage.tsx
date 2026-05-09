import { useEffect, useState } from 'react';
import { Table, Tag, Typography } from 'antd';
import { http } from '@/api/client';

const { Title } = Typography;

interface Work {
  workId: string; title: string; status: string; createdAt: string;
}

export default function WorksPage() {
  const [data, setData] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get('/mandis-admin/works').then((r) => setData((r.data as { list: Work[] }).list ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Title level={4}>作品管理</Title>
      <Table dataSource={data} rowKey="workId" loading={loading}
        columns={[
          { title: 'ID', dataIndex: 'workId' },
          { title: '标题', dataIndex: 'title' },
          { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={s === 'published' ? 'green' : 'default'}>{s}</Tag> },
          { title: '创建时间', dataIndex: 'createdAt' },
        ]} />
    </>
  );
}
