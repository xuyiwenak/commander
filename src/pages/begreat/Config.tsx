import { useEffect, useState } from 'react';
import {
  Form, InputNumber, Switch, Select, Input,
  Button, Card, Alert, message, Typography, Space, Spin, Divider,
} from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { configApi } from '@/api/adminApi';

const { Title, Text } = Typography;

interface OssImages {
  share_home: string;
  share_home_timeline: string;
  wxacode: string;
}

interface RuntimeConfig {
  price_fen: number;
  payment_enabled: boolean;
  dev_openids: string[];
  oss_images: OssImages;
}

const PRICE_LABEL: Record<number, string> = {
  2900: '¥29',
  1900: '¥19',
  9900: '¥99',
};

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
      .catch(() => { void message.error('加载配置失败'); })
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

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;

  const priceFen = config?.price_fen ?? 0;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>系统配置</Title>
        <Button icon={<ReloadOutlined />} onClick={() => void handleReload()} loading={reloading}>
          热加载
        </Button>
      </div>

      {config && !config.payment_enabled && (
        <Alert
          type="warning"
          showIcon
          banner
          message="支付已关闭（审核模式）——所有用户可免费查看完整报告"
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={values => void handleSave(values)}>
        {/* ── 支付配置 ── */}
        <Card
          title="支付配置"
          style={{ maxWidth: 600, marginBottom: 16 }}
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              当前价格：¥{(priceFen / 100).toFixed(2)}
              {PRICE_LABEL[priceFen] ? `（${PRICE_LABEL[priceFen]}）` : ''}
            </Text>
          }
        >
          <Form.Item
            label="报告价格（分）"
            name="price_fen"
            rules={[{ required: true, message: '必填' }]}
            extra="100 分 = ¥1，范围 ¥1 ～ ¥999"
          >
            <InputNumber min={100} max={99900} step={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="开启支付"
            name="payment_enabled"
            valuePropName="checked"
            extra="关闭后所有用户直接视为已付费，用于上架审核期"
          >
            <Switch checkedChildren="已开启" unCheckedChildren="已关闭" />
          </Form.Item>
        </Card>

        {/* ── 开发者白名单 ── */}
        <Card title="开发者白名单" style={{ maxWidth: 600, marginBottom: 16 }}>
          <Form.Item
            label="测试 OpenID"
            name="dev_openids"
            extra="白名单用户跳过每日答题次数限制，输入 OpenID 后按 Enter 添加"
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="输入 OpenID 后按 Enter"
              tokenSeparators={[',']}
            />
          </Form.Item>
        </Card>

        {/* ── OSS 图片 ── */}
        <Card title="OSS 图片地址" style={{ maxWidth: 600, marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
            填写 OSS 签名 URL（长期有效）。修改后点保存即可热加载，无需重启容器。
          </Text>

          <Form.Item label="分享首页图" name={['oss_images', 'share_home']}>
            <Input placeholder="https://..." allowClear />
          </Form.Item>

          <Form.Item label="分享朋友圈图" name={['oss_images', 'share_home_timeline']}>
            <Input placeholder="https://..." allowClear />
          </Form.Item>

          <Form.Item label="小程序码" name={['oss_images', 'wxacode']}>
            <Input placeholder="https://..." allowClear />
          </Form.Item>
        </Card>

        <Divider />

        <Space>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            保存配置
          </Button>
          <Button onClick={() => form.resetFields()}>重置</Button>
        </Space>
      </Form>
    </>
  );
}
