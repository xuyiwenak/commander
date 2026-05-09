import { useState } from 'react';
import { Drawer, Form, Input, Button, App, Space } from 'antd';
import { http } from '@/api/client';
import type { AppName } from '@/store/appStore';

interface Props {
  open: boolean;
  appName: AppName;
  onClose: () => void;
}

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const CHANGE_URL: Record<AppName, string> = {
  mandis:  '/mandis-admin/auth/change-password',
  begreat: '/begreat-admin/auth/change-password',
};

const MIN_PASSWORD_LEN = 8;

export default function ChangePasswordDrawer({ open, appName, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await http.post(CHANGE_URL[appName], {
        currentPassword: values.currentPassword,
        newPassword:     values.newPassword,
      });
      void message.success('密码已更新');
      handleClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '修改失败，请重试';
      void message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title="修改密码"
      placement="right"
      width={380}
      open={open}
      onClose={handleClose}
      styles={{
        header: {
          borderBottom: '1px solid #2e2e30',
          padding: '16px 20px',
          fontSize: 15,
          fontWeight: 600,
        },
        body: { padding: '24px 20px' },
        footer: {
          borderTop: '1px solid #2e2e30',
          padding: '12px 20px',
        },
      }}
      footer={
        <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
          <Button onClick={handleClose} disabled={loading}>取消</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            保存
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        style={{ gap: 0 }}
      >
        <Form.Item
          label="当前密码"
          name="currentPassword"
          rules={[{ required: true, message: '请输入当前密码' }]}
          style={{ marginBottom: 16 }}
        >
          <Input.Password placeholder="输入当前密码" autoComplete="current-password" />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: MIN_PASSWORD_LEN, message: `至少 ${MIN_PASSWORD_LEN} 位` },
          ]}
          style={{ marginBottom: 16 }}
        >
          <Input.Password placeholder={`至少 ${MIN_PASSWORD_LEN} 位`} autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('两次密码不一致'));
              },
            }),
          ]}
          style={{ marginBottom: 0 }}
        >
          <Input.Password placeholder="再次输入新密码" autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
