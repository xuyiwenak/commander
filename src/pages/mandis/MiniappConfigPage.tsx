import { useEffect, useState } from 'react';
import {
  Button, Form, Input, Typography, Alert, Spin, message,
  Divider, Tag, Space,
} from 'antd';
import { SaveOutlined, ReloadOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { mandisMiniappConfigApi, mandisPresetTagsApi } from '@/api/adminApi';

const { Title, Text } = Typography;

const TAG_MAX_COUNT = 10;
const TAG_MAX_LENGTH = 10;

interface UrlFormValues {
  baseUrl: string;
}

export default function MiniappConfigPage() {
  const [form] = Form.useForm<UrlFormValues>();
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlSaving,  setUrlSaving]  = useState(false);
  const [urlError,   setUrlError]   = useState<string | null>(null);

  const [tags,        setTags]        = useState<string[]>([]);
  const [tagInput,    setTagInput]    = useState('');
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsSaving,  setTagsSaving]  = useState(false);
  const [tagsError,   setTagsError]   = useState<string | null>(null);

  const loadUrl = async () => {
    setUrlLoading(true);
    setUrlError(null);
    try {
      const res = await mandisMiniappConfigApi.get();
      form.setFieldsValue({ baseUrl: (res.data as unknown as { baseUrl: string }).baseUrl });
    } catch (e) {
      setUrlError(String(e));
    } finally {
      setUrlLoading(false);
    }
  };

  const loadTags = async () => {
    setTagsLoading(true);
    setTagsError(null);
    try {
      const res = await mandisPresetTagsApi.get();
      setTags((res.data as unknown as { tags: string[] }).tags ?? []);
    } catch (e) {
      setTagsError(String(e));
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => {
    void loadUrl();
    void loadTags();
  }, []);

  const handleSaveUrl = async (values: UrlFormValues) => {
    setUrlSaving(true);
    setUrlError(null);
    try {
      await mandisMiniappConfigApi.save(values.baseUrl);
      void message.success('域名已保存，下次小程序启动时生效');
    } catch (e) {
      setUrlError(String(e));
    } finally {
      setUrlSaving(false);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (trimmed.length > TAG_MAX_LENGTH) {
      void message.warning(`标签最长 ${TAG_MAX_LENGTH} 个字`);
      return;
    }
    if (tags.includes(trimmed)) {
      void message.warning('已存在相同标签');
      return;
    }
    if (tags.length >= TAG_MAX_COUNT) {
      void message.warning(`最多配置 ${TAG_MAX_COUNT} 个标签`);
      return;
    }
    setTags([...tags, trimmed]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSaveTags = async () => {
    setTagsSaving(true);
    setTagsError(null);
    try {
      await mandisPresetTagsApi.save(tags);
      void message.success('便签词汇已保存，下次小程序启动时生效');
    } catch (e) {
      setTagsError(String(e));
    } finally {
      setTagsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      {/* 域名配置 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>小程序域名配置</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          修改后无需重启服务，小程序下次拉取配置时生效（最长 24 小时缓存）。
        </Text>
      </div>

      {urlError && (
        <Alert type="error" message={urlError} style={{ marginBottom: 16 }} closable onClose={() => setUrlError(null)} />
      )}

      <Spin spinning={urlLoading}>
        <Form form={form} layout="vertical" onFinish={(v) => { void handleSaveUrl(v); }}>
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
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={urlSaving}>
              保存
            </Button>
            <Button
              icon={<ReloadOutlined />}
              style={{ marginLeft: 8 }}
              onClick={() => { void loadUrl(); }}
              disabled={urlLoading || urlSaving}
            >
              重新读取
            </Button>
          </Form.Item>
        </Form>
      </Spin>

      <Divider />

      {/* 便签词汇配置 */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>便签词汇配置</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          用户长按展墙作品时可贴的感受标签，最多 {TAG_MAX_COUNT} 个，每个最长 {TAG_MAX_LENGTH} 字。
        </Text>
      </div>

      {tagsError && (
        <Alert type="error" message={tagsError} style={{ marginBottom: 16 }} closable onClose={() => setTagsError(null)} />
      )}

      <Spin spinning={tagsLoading}>
        <div style={{ marginBottom: 16 }}>
          <Space wrap style={{ marginBottom: 12 }}>
            {tags.map((tag) => (
              <Tag
                key={tag}
                closable
                onClose={() => handleRemoveTag(tag)}
                closeIcon={<CloseOutlined />}
                style={{ fontSize: 14, padding: '4px 10px', borderRadius: 20 }}
                color="pink"
              >
                {tag}
              </Tag>
            ))}
            {tags.length === 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>暂无标签，请添加</Text>
            )}
          </Space>

          {tags.length < TAG_MAX_COUNT && (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={tagInput}
                placeholder={`输入标签（最长 ${TAG_MAX_LENGTH} 字）`}
                onChange={(e) => setTagInput(e.target.value)}
                onPressEnter={handleAddTag}
                maxLength={TAG_MAX_LENGTH}
                style={{ maxWidth: 240 }}
              />
              <Button icon={<PlusOutlined />} onClick={handleAddTag}>
                添加
              </Button>
            </Space.Compact>
          )}

          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            已配置 {tags.length} / {TAG_MAX_COUNT} 个
          </Text>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={tagsSaving}
            onClick={() => { void handleSaveTags(); }}
          >
            保存便签
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { void loadTags(); }}
            disabled={tagsLoading || tagsSaving}
          >
            重新读取
          </Button>
        </Space>
      </Spin>
    </div>
  );
}
