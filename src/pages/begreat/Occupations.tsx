import { useState } from 'react';
import { Tabs, Typography } from 'antd';
import { BranchesOutlined, ReadOutlined, BarChartOutlined } from '@ant-design/icons';
import OccupationList from './OccupationList';
import QuestionBank from './QuestionBank';
import Norms from './Norms';

const { Title } = Typography;

const TABS = [
  { key: 'occupations', label: '职业列表',  icon: <BranchesOutlined />, content: <OccupationList /> },
  { key: 'questions',   label: '题库管理',  icon: <ReadOutlined />,     content: <QuestionBank /> },
  { key: 'norms',       label: '常模管理',  icon: <BarChartOutlined />, content: <Norms /> },
];

export default function Occupations() {
  const [activeKey, setActiveKey] = useState('occupations');

  return (
    <>
      <Title level={4}>职业管理</Title>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={TABS.map(t => ({
          key:      t.key,
          label:    <span>{t.icon} {t.label}</span>,
          children: t.content,
        }))}
      />
    </>
  );
}
