# Commander 管理后台

`commander` 是 统一管理后台前端，面向运营、客服与技术支持人员使用。

它提供：

- 运营数据查看（Dashboard / BI）
- 用户与业务记录管理
- 支付与异常订单排查
- 邀请裂变数据查看
- 服务器状态、应用控制与 Nginx 配置管理

## 适用范围
  - BI 仪表盘、系统监控、用户管理、作品管理、反馈管理、服务器管理
  - 数据大盘、用户管理、测评记录、支付管理、掉单修复、邀请裂变、职业管理、系统配置、服务器管理

## 技术栈

- React 19
- TypeScript
- Vite
- Ant Design
- Axios
- Zustand
- React Router

## 项目结构（简版）

```text
commander/
├─ src/
│  ├─ app-modules/          # 多业务模块注册（mandis / begreat）
│  ├─ api/                  # 后台接口封装
│  ├─ components/           # 通用组件与布局
│  ├─ pages/                # 各页面
│  ├─ router.tsx            # 路由入口
│  └─ store/                # 状态管理
├─ public/
├─ dist/                    # 构建产物
└─ vite.config.ts
```

## 本地开发

### 1) 安装依赖

```bash
npm install
```

### 2) 启动开发环境

```bash
npm run dev
```

默认端口：`5175`  
开发代理（见 `vite.config.ts`）：

> 说明：本项目依赖后端服务配合联调，若后端未启动会出现接口请求失败。

## 构建与预览

### 构建

```bash
npm run build
```

### 本地预览构建产物

```bash
npm run preview
```

## 固定部署流程

`commander` 使用单分支 `master` 发布。所有部署统一从项目目录执行：

```bash
./build.sh "feat(scope): describe the change"
```

脚本会依次完成：本地构建、提交并推送源码、服务器同步源码、上传静态资源、
原子更新入口文件以及线上校验。静态目录已经挂载到 Nginx 容器，部署网页不需要重启 Docker 或 reload Nginx。

以下环境变量可覆盖默认部署目标：

```bash
COMMANDER_DEPLOY_HOST=bn
COMMANDER_REMOTE_REPO_DIR=/root/workspace/commander
COMMANDER_REMOTE_DIST_DIR=/root/workspace/commander/dist
COMMANDER_DEPLOY_URL=https://www.starryspark.com.cn/art
COMMANDER_DEPLOY_BRANCH=master
```

## 账号与权限

- 登录入口支持按业务维度区分（Mandis / BeGreat）
- 各业务后台 token 独立存储，避免跨业务鉴权串用
- 非登录接口遇到 `401` 时会自动清理对应 token 并跳转登录页

## 常见问题

- **接口全部 404/超时**
  - 先确认本地代理目标端口对应后端已启动
- **登录后被立即踢回登录页**
  - 检查 token 是否过期，或后端鉴权接口是否正常
- **构建成功但页面空白**
  - 检查静态资源部署路径是否与 Nginx 配置一致

## 维护说明

- 新增业务模块：在 `src/app-modules/` 新建模块并注册到 `src/app-modules/index.ts`
- 新增页面：放入 `src/pages/`，并在对应模块路由中挂载
- 新增接口：在 `src/api/` 扩展并保持统一返回处理方式
