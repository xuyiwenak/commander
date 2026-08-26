import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Segmented,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  DesktopOutlined,
  MailOutlined,
  MobileOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  mandisEmailConfigApi,
  type EmailConfigResponse,
  type EmailProviderStatus,
  type EmailTemplateContent,
  type EmailTemplateInput,
  type EmailTemplateLocale,
  type EmailTemplateView,
} from '@/api/adminApi';
import './EmailConfigPage.css';

const { Paragraph, Text, Title } = Typography;
const TEST_CODE = '275168';
const SUBJECT_MAX_LENGTH = 120;
const TEXT_MAX_LENGTH = 500;

interface TemplateFieldsProps {
  locale: 'zhCn' | 'en';
}

interface PreviewProps {
  content: EmailTemplateContent;
  template: EmailTemplateInput;
  mode: 'desktop' | 'mobile';
}

interface HeaderProps {
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  onToggleTest: () => void;
}

interface TestBarProps {
  email: string;
  testing: boolean;
  onEmailChange: (email: string) => void;
  onSend: () => void;
}

function TemplateFields({ locale }: TemplateFieldsProps) {
  return (
    <div className="email-fields">
      <Form.Item name={[locale, 'subject']} label="邮件主题" rules={[{ required: true }]}>
        <Input showCount maxLength={SUBJECT_MAX_LENGTH} />
      </Form.Item>
      <Form.Item name={[locale, 'title']} label="邮件标题" rules={[{ required: true }]}>
        <Input showCount maxLength={SUBJECT_MAX_LENGTH} />
      </Form.Item>
      <Form.Item name={[locale, 'body']} label="正文说明" rules={[{ required: true }]}>
        <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} showCount maxLength={TEXT_MAX_LENGTH} />
      </Form.Item>
      <div className="email-code-variable">
        <Tag color="cyan">{'{{code}}'}</Tag>
        <Text type="secondary">受保护的验证码变量，发送时自动替换</Text>
      </div>
      <Form.Item name={[locale, 'expiryText']} label="有效期提示" rules={[{ required: true }]}>
        <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} showCount maxLength={TEXT_MAX_LENGTH} />
      </Form.Item>
      <Form.Item name={[locale, 'securityText']} label="安全提醒" rules={[{ required: true }]}>
        <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} showCount maxLength={TEXT_MAX_LENGTH} />
      </Form.Item>
      <Form.Item name={[locale, 'footer']} label="页脚" rules={[{ required: true }]}>
        <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} showCount maxLength={TEXT_MAX_LENGTH} />
      </Form.Item>
    </div>
  );
}

function StyleFields() {
  return (
    <div className="email-style-fields">
      <Title level={5}>格式</Title>
      <Row gutter={12}>
        <Col xs={12} sm={6}>
          <Form.Item name={['style', 'brandColor']} label="品牌色" rules={[{ required: true }]}>
            <Input type="color" className="email-color-input" />
          </Form.Item>
        </Col>
        <Col xs={12} sm={6}>
          <Form.Item name={['style', 'backgroundColor']} label="背景色" rules={[{ required: true }]}>
            <Input type="color" className="email-color-input" />
          </Form.Item>
        </Col>
        <Col xs={12} sm={6}>
          <Form.Item name={['style', 'codeFontSize']} label="验证码字号" rules={[{ required: true }]}>
            <InputNumber min={28} max={56} addonAfter="px" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={12} sm={6}>
          <Form.Item name={['style', 'textAlign']} label="正文对齐" rules={[{ required: true }]}>
            <Segmented block options={[{ label: '左对齐', value: 'left' }, { label: '居中', value: 'center' }]} />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}

function EmailPreview({ content, template, mode }: PreviewProps) {
  const previewStyle = {
    backgroundColor: template.style.backgroundColor,
    textAlign: template.style.textAlign,
  } as const;
  const codeStyle = {
    color: template.style.brandColor,
    backgroundColor: template.style.backgroundColor,
    fontSize: template.style.codeFontSize,
  };
  return (
    <div className={`email-preview-frame is-${mode}`} style={previewStyle}>
      <article className="email-preview-message">
        <div className="email-preview-accent" style={{ backgroundColor: template.style.brandColor }} />
        <div className="email-preview-body">
          <Text strong style={{ color: template.style.brandColor }}>原色有感</Text>
          <Title level={2}>{content.title}</Title>
          <Paragraph>{content.body}</Paragraph>
          <div className="email-preview-code" style={codeStyle}>{TEST_CODE}</div>
          <Paragraph>{content.expiryText}</Paragraph>
          <Paragraph type="secondary">{content.securityText}</Paragraph>
          <div className="email-preview-divider" />
          <Text type="secondary">{content.footer}</Text>
        </div>
      </article>
    </div>
  );
}

function ProviderSummary({ provider }: { provider: EmailProviderStatus }) {
  return (
    <div className="email-provider-summary">
      <span><Text type="secondary">发信地址</Text> {provider.accountName || '未配置'}</span>
      <span><Text type="secondary">区域</Text> {provider.regionId}</span>
      <Tag color={provider.configured ? 'success' : 'warning'} icon={provider.configured ? <CheckCircleOutlined /> : undefined}>
        {provider.configured ? '配置正常' : '配置不完整'}
      </Tag>
    </div>
  );
}

function useEmailConfigData(form: ReturnType<typeof Form.useForm<EmailTemplateInput>>[0]) {
  const [draft, setDraft] = useState<EmailTemplateView | null>(null);
  const [provider, setProvider] = useState<EmailProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const applyData = useCallback((data: EmailConfigResponse) => {
    form.setFieldsValue(data.template);
    setDraft(data.template);
    setProvider(data.provider);
  }, [form]);
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mandisEmailConfigApi.get();
      applyData(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '邮件配置加载失败');
    } finally {
      setLoading(false);
    }
  }, [applyData]);
  // Initial remote state must be loaded after the form instance is available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadConfig(); }, [loadConfig]);
  return { draft, provider, loading, error, setDraft, setError };
}

function useTemplateActions(
  form: ReturnType<typeof Form.useForm<EmailTemplateInput>>[0],
  setDraft: (template: EmailTemplateView) => void,
) {
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const response = await mandisEmailConfigApi.save(values);
      setDraft(response.data.template);
      void message.success('邮件模板已保存并立即生效');
    } catch (saveError) {
      void message.error(saveError instanceof Error ? saveError.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };
  const handleReset = async () => {
    setSaving(true);
    try {
      const response = await mandisEmailConfigApi.reset();
      form.setFieldsValue(response.data.template);
      setDraft(response.data.template);
      void message.success('已恢复默认模板');
    } catch (resetError) {
      void message.error(resetError instanceof Error ? resetError.message : '恢复失败');
    } finally {
      setSaving(false);
    }
  };
  return { saving, handleSave, handleReset };
}

function useTestSender(
  form: ReturnType<typeof Form.useForm<EmailTemplateInput>>[0],
  locale: EmailTemplateLocale,
) {
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const handleTest = async () => {
    const values = await form.validateFields();
    if (!testEmail.trim()) return void message.warning('请输入测试邮箱');
    setTesting(true);
    try {
      await mandisEmailConfigApi.test(testEmail.trim(), locale, values);
      void message.success('测试邮件已发送，请检查收件箱');
    } catch (testError) {
      void message.error(testError instanceof Error ? testError.message : '测试邮件发送失败');
    } finally {
      setTesting(false);
    }
  };
  return { testEmail, testing, setTestEmail, handleTest };
}

function EmailConfigHeader({ saving, onSave, onReset, onToggleTest }: HeaderProps) {
  return (
    <header className="email-config-header">
      <div>
        <Title level={3}>邮件配置</Title>
        <Text type="secondary">编辑验证码邮件的中英文内容与显示格式，保存后立即生效。</Text>
      </div>
      <Space wrap>
        <Button icon={<SendOutlined />} onClick={onToggleTest}>发送测试邮件</Button>
        <Popconfirm title="恢复默认模板？" description="当前模板将被默认内容覆盖。" onConfirm={onReset}>
          <Button icon={<ReloadOutlined />} disabled={saving}>恢复默认</Button>
        </Popconfirm>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>保存并生效</Button>
      </Space>
    </header>
  );
}

function TestEmailBar({ email, testing, onEmailChange, onSend }: TestBarProps) {
  return (
    <div className="email-test-bar">
      <MailOutlined />
      <Input
        type="email"
        value={email}
        placeholder="输入接收测试邮件的邮箱"
        onChange={(event) => onEmailChange(event.target.value)}
        onPressEnter={onSend}
      />
      <Button type="primary" loading={testing} onClick={onSend}>发送当前预览</Button>
    </div>
  );
}

function EmailEditor({ form, locale, onLocaleChange, onChange }: {
  form: ReturnType<typeof Form.useForm<EmailTemplateInput>>[0];
  locale: EmailTemplateLocale;
  onLocaleChange: (locale: EmailTemplateLocale) => void;
  onChange: (values: EmailTemplateInput) => void;
}) {
  const items = [
    { key: 'zh-CN', label: '中文模板', children: <TemplateFields locale="zhCn" /> },
    { key: 'en', label: 'English', children: <TemplateFields locale="en" /> },
  ];
  return (
    <section className="email-editor-panel" aria-label="邮件模板编辑器">
      <Form form={form} layout="vertical" onValuesChange={(_changed, values) => onChange(values)}>
        <Tabs activeKey={locale} onChange={(key) => onLocaleChange(key as EmailTemplateLocale)} items={items} />
        <StyleFields />
      </Form>
    </section>
  );
}

function PreviewPanel({ content, template, mode, onModeChange }: PreviewProps & {
  onModeChange: (mode: 'desktop' | 'mobile') => void;
}) {
  const options = [
    { label: '桌面端', value: 'desktop', icon: <DesktopOutlined /> },
    { label: '移动端', value: 'mobile', icon: <MobileOutlined /> },
  ];
  return (
    <section className="email-preview-panel" aria-label="邮件实时预览">
      <div className="email-preview-toolbar">
        <div><Title level={4}>实时预览</Title><Text type="secondary">测试验证码 {TEST_CODE}</Text></div>
        <Segmented value={mode} onChange={(value) => onModeChange(value as 'desktop' | 'mobile')} options={options} />
      </div>
      <EmailPreview content={content} template={template} mode={mode} />
    </section>
  );
}

export default function EmailConfigPage() {
  const [form] = Form.useForm<EmailTemplateInput>();
  const [locale, setLocale] = useState<EmailTemplateLocale>('zh-CN');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [testOpen, setTestOpen] = useState(false);
  const config = useEmailConfigData(form);
  const actions = useTemplateActions(form, config.setDraft);
  const test = useTestSender(form, locale);
  if (config.loading) return <Skeleton active paragraph={{ rows: 12 }} />;
  if (!config.draft || !config.provider) {
    return <Alert type="error" showIcon message={config.error ?? '邮件配置不可用'} />;
  }
  const activeContent = locale === 'en' ? config.draft.en : config.draft.zhCn;
  return (
    <div className="email-config-page">
      <EmailConfigHeader
        saving={actions.saving}
        onSave={() => { void actions.handleSave(); }}
        onReset={() => { void actions.handleReset(); }}
        onToggleTest={() => setTestOpen((open) => !open)}
      />
      <ProviderSummary provider={config.provider} />
      {config.error && <Alert type="error" showIcon closable message={config.error} onClose={() => config.setError(null)} />}
      {testOpen && <TestEmailBar email={test.testEmail} testing={test.testing} onEmailChange={test.setTestEmail} onSend={() => { void test.handleTest(); }} />}
      <div className="email-config-layout">
        <EmailEditor
          form={form}
          locale={locale}
          onLocaleChange={setLocale}
          onChange={(values) => config.setDraft((current) => ({ ...current!, ...values }))}
        />
        <PreviewPanel
          content={activeContent}
          template={config.draft}
          mode={previewMode}
          onModeChange={setPreviewMode}
        />
      </div>
    </div>
  );
}
