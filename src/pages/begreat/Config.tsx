import { useEffect, useState } from 'react';
import { Form, InputNumber, Switch, Select, Button, Card, Alert, message, Typography, Space, Spin } from 'antd';
import { configApi } from '@/api/adminApi';

const { Title, Text } = Typography;

interface RuntimeConfig {
  price_fen: number;
  payment_enabled: boolean;
  dev_openids: string[];
}

export default function Config() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [form] = Form.useForm<RuntimeConfig>();

  const load = () => {
    setLoading(true);
    configApi.get()
      .then(res => {
        const data = (res.data as { data: RuntimeConfig }).data;
        setConfig(data);
        form.setFieldsValue(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (values: RuntimeConfig) => {
    setSaving(true);
    try {
      await configApi.update(values as unknown as Record<string, unknown>);
      void message.success('配置已保存并热加载生效');
      load();
    } catch {
      void message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      await configApi.reload();
      void message.success('热加载成功');
      load();
    } catch {
      void message.error('热加载失败');
    } finally {
      setReloading(false);
    }
  };

  if (loading) return <Spin />;

  return (
    <>
      <Title level={4}>系统配置</Title>

      {config && !config.payment_enabled && (
        <Alert
          type="warning"
          showIcon
          banner
          message="支付已关闭（审核模式）——所有用户可免费查看完整报告"
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={values => void handleSave(values)}>
          <Form.Item label="报告价格（分）" name="price_fen" rules={[{ required: true }]}
            extra="100 分 = ¥1，当前设置为付费价格">
            <InputNumber min={100} max={99900} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="开启支付" name="payment_enabled" valuePropName="checked"
            extra="关闭后所有用户直接视为已付费（上架审核期使用）">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item label="测试白名单 OpenID" name="dev_openids"
            extra="白名单用户跳过每日答题次数限制">
            <Select mode="tags" style={{ width: '100%' }} placeholder="输入 OpenID 后按 Enter 添加" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving}>保存配置</Button>
              <Button onClick={() => void handleReload()} loading={reloading}>手动热加载</Button>
            </Space>
          </Form.Item>
        </Form>

        {config && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前价格：¥{(config.price_fen / 100).toFixed(2)} ·
            白名单：{config.dev_openids.length} 个账号
          </Text>
        )}
      </Card>
    </>
  );
}
