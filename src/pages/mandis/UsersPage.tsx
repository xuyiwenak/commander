import { useEffect, useState } from 'react';
import { Table, Typography } from 'antd';
import { http } from '@/api/client';

const { Title } = Typography;

interface User {
  userId: string; account: string; nickname: string; level: number; createdAt: string;
}

export default function UsersPage() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get('/mandis-admin/users').then((r) => setData((r.data as { list: User[] }).list ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Title level={4}>用户管理</Title>
      <Table dataSource={data} rowKey="userId" loading={loading}
        columns={[
          { title: 'ID', dataIndex: 'userId' },
          { title: '账号', dataIndex: 'account' },
          { title: '昵称', dataIndex: 'nickname' },
          { title: '等级', dataIndex: 'level' },
          { title: '注册时间', dataIndex: 'createdAt' },
        ]} />
    </>
  );
}
