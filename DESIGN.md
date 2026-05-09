# Design System — Commander

## Theme

Dark. 管理员在室内桌面环境长时间使用，暗色减少视觉疲劳，也让状态色和数据有更强的视觉对比。

Reference: Raycast — 深色哑光底色，精细 1px 边框，极简装饰，强字体层级，iOS 系统色系暖灰调。

## Color

Strategy: Restrained. 中性暖灰占主导，一个 accent 用于主操作和选中态，danger 色仅用于破坏性操作。

| Token            | Hex       | OKLCH 近似值             | 用途                       |
|------------------|-----------|--------------------------|----------------------------|
| bg-base          | #111113   | oklch(10% 0.006 280)     | 全局最底层背景             |
| bg-surface       | #18181a   | oklch(14% 0.007 280)     | 侧边栏、顶栏               |
| bg-container     | #1c1c1e   | oklch(16% 0.007 280)     | 卡片、内容区               |
| bg-elevated      | #232325   | oklch(19% 0.007 280)     | Dropdown、Drawer、Modal     |
| bg-hover         | #2c2c2e   | oklch(23% 0.007 280)     | 悬停态背景                 |
| border           | #2e2e30   | oklch(25% 0.008 280)     | 所有分割线和容器边框       |
| border-strong    | #3a3a3c   | oklch(30% 0.008 280)     | 强调边框、focus 环         |
| text-primary     | #f2f2f7   | oklch(96% 0.005 280)     | 主要文字                   |
| text-secondary   | #8d8d95   | oklch(60% 0.008 280)     | 次要文字、label            |
| text-muted       | #52525a   | oklch(40% 0.008 280)     | placeholder、禁用态        |
| accent-mandis    | #4dbfb4   | oklch(73% 0.092 188)     | Mandis primary 色          |
| accent-begreat   | #7c6af5   | oklch(60% 0.18 285)      | Begreat primary 色         |
| danger           | #f05252   | oklch(60% 0.18 25)       | 退出、删除等危险操作       |

## Typography

Font stack: `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif`

Base size: 13px. Product UI 用较小基础字号换取信息密度。

| Role       | Size  | Weight | Color          |
|------------|-------|--------|----------------|
| heading    | 15px  | 600    | text-primary   |
| body       | 13px  | 400    | text-primary   |
| label      | 12px  | 500    | text-secondary |
| caption    | 11px  | 400    | text-muted     |

## Spacing

4px 基础单位。组件 padding: 12–16px。区块间距: 20–24px。表单行间: 16px。

## Borders & Radius

- 边框: 1px solid border token（暗色下 0.5px 对比不足）
- 圆角: 6px 输入框/按钮，8px 卡片/Drawer，10px 内容区域
- 侧边栏触发器和顶栏之间用 border 而非 shadow 区隔

## Components

### Layout
- Sider 宽 200px，背景 bg-surface，右侧 1px border
- Header 高 52px，背景 bg-surface，底部 1px border
- Content 背景 bg-base，margin 20px，padding 24px，radius 10px，内部 bg-container

### Menu (Sider)
- 背景 bg-surface；选中项 bg-hover + accent 文字
- 图标和文字默认 text-secondary，选中 text-primary
- 父级展开不改变背景色

### 账号区域 (Header 右侧)
- Avatar (24px) + 用户名 + 下拉箭头，整体可点击
- Dropdown: bg-elevated，1px border，radius 8px
- 菜单项高度 32px，hover 时 bg-hover
- 退出登录用 danger 文字色

### ChangePassword Drawer
- 右侧抽屉宽 380px，背景 bg-elevated
- 标题 15px/600，底部 1px border 分割
- 表单: 3 个 Password 输入框，间距 16px
- 底部按钮区: 取消（ghost）+ 保存（primary），右对齐

### Form Inputs (dark)
- 背景 bg-container，边框 border token
- focus: border-color 变为 accent
- placeholder 颜色 text-muted
