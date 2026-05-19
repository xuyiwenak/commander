import { useEffect, useState } from 'react';
import { Button, Form, Input, Typography, Alert, Spin, message } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { mandisMiniappConfigApi } from '@/api/adminApi';

const { Title, Text } = Typography;

interface FormValues {
  baseUrl: string;
}

export default function MiniappConfigPage() {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mandisMiniappConfigApi.get();
      form.setFieldsValue({ baseUrl: (res.data as unknown as { baseUrl: string }).baseUrl });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSave = async (values: FormValues) => {
    setSaving(true);
    setError(null);
    try {
      await mandisMiniappConfigApi.save(values.baseUrl);
      void message.success('已保存，下次小程序启动时生效');
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>小程序域名配置</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          修改后无需重启服务，小程序下次拉取配置时生效（最长 24 小时缓存）。
        </Text>
      </div>

      {error && (
        <Alert type="error" message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />
      )}

      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={(v) => { void handleSave(v); }}>
          <Form.Item
            name="baseUrl"
            label="API 域名（baseUrl）"
            rules={[
              { required: true, message: '请输入域名' },
              { type: 'url', message: '请输入合法的 URL，如 https://mandis.example.com' },
            ]}
          >
            <Input placeholder="https://mandis.starryspark.com.cn" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              保存
            </Button>
            <Button
              icon={<ReloadOutlined />}
              style={{ marginLeft: 8 }}
              onClick={() => { void load(); }}
              disabled={loading || saving}
            >
              重新读取
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </div>
  );
}
