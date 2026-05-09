import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Space, Typography, Alert, Spin, message } from 'antd';
import { SaveOutlined, ReloadOutlined, RollbackOutlined } from '@ant-design/icons';
import { useRuntimeConfig, useRefetchConfig } from '@/components/RuntimeConfig';
import { createSystemApi } from '@/api/systemApi';
import { RUNTIME_CONFIG_FALLBACKS, type AppRuntimeConfig } from '@/config/runtime';
import type { AppName } from '@/store/appStore';

const { Title, Text } = Typography;

const EDITOR_STYLE: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 13,
  lineHeight: 1.6,
  resize: 'vertical',
  minHeight: 360,
  width: '100%',
  padding: '12px 16px',
  borderRadius: 8,
  border: '1px solid #2e2e30',
  background: '#111113',
  color: '#f2f2f7',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function RuntimeConfigEditor() {
  const appName   = useLocation().pathname.split('/')[1] as AppName;
  const config    = useRuntimeConfig(appName);
  const refetch   = useRefetchConfig();
  const api       = createSystemApi(appName, config.systemApiBase);

  const [text,    setText]    = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const loadFromServer = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRuntimeConfig() as AppRuntimeConfig;
      setText(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(String(e));
      setText(JSON.stringify(config, null, 2));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadFromServer(); }, [appName]);

  const handleSave = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError('JSON 格式错误，请检查语法');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveRuntimeConfig(parsed) as AppRuntimeConfig;
      setText(JSON.stringify(saved, null, 2));
      await refetch();
      void message.success('配置已更新并重载');
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setText(JSON.stringify(RUNTIME_CONFIG_FALLBACKS[appName], null, 2));
    setError(null);
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>运行时配置</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          修改后点击「保存并重载」，配置立即生效，无需重启服务。
        </Text>
      </div>

      {error && (
        <Alert type="error" message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />
      )}

      <Spin spinning={loading}>
        <textarea
          style={EDITOR_STYLE}
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          spellCheck={false}
        />
      </Spin>

      <Space style={{ marginTop: 16 }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={() => { void handleSave(); }}
        >
          保存并重载
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => { void loadFromServer(); }}
          disabled={loading || saving}
        >
          从服务器读取
        </Button>
        <Button
          icon={<RollbackOutlined />}
          onClick={handleReset}
          disabled={saving}
        >
          重置为默认值
        </Button>
      </Space>
    </div>
  );
}
