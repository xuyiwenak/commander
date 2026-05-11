// API 测试用例定义
// 每个 TestCase 对应一次 HTTP 请求 + 断言

export type AuthType = 'admin' | 'miniapp' | 'none';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type CaseStatus = 'idle' | 'running' | 'pass' | 'fail';

// 流程步骤共享的上下文（前一步的提取值传给后一步）
export type FlowCtx = Record<string, unknown>;

// 流程中单个步骤：path/body 支持函数形式以注入 ctx
export interface FlowStep {
  id: string;
  name: string;
  method: HttpMethod;
  path: string | ((ctx: FlowCtx) => string);
  authType: AuthType;
  body?: Record<string, unknown> | ((ctx: FlowCtx) => Record<string, unknown>);
  params?: Record<string, unknown>;
  expectedStatus: number;
  // 从响应中提取字段，存入 ctx 供后续步骤使用
  extract?: (data: unknown) => FlowCtx;
  validate?: (status: number, data: unknown, ctx: FlowCtx) => { pass: boolean; message: string };
}

// 多步顺序流程（每步可依赖前步的 ctx）
export interface TestFlow {
  id: string;
  name: string;
  steps: FlowStep[];
}

export interface TestCase {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  authType: AuthType;
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  expectedStatus: number;
  validate?: (status: number, data: unknown) => { pass: boolean; message: string };
}

export interface TestSuite {
  id: string;
  name: string;
  cases: TestCase[];
}

// ── 辅助断言 ──────────────────────────────────────────
function expectField(data: unknown, field: string): { pass: boolean; message: string } {
  if (data && typeof data === 'object' && field in (data as object)) {
    return { pass: true, message: `字段 "${field}" 存在` };
  }
  return { pass: false, message: `缺少字段 "${field}"` };
}

function expectArray(data: unknown, field: string): { pass: boolean; message: string } {
  const val = (data as Record<string, unknown>)?.[field];
  if (Array.isArray(val)) return { pass: true, message: `"${field}" 是数组，长度 ${val.length}` };
  return { pass: false, message: `"${field}" 不是数组` };
}

// ── 测试套件定义 ──────────────────────────────────────
export const TEST_SUITES: TestSuite[] = [
  {
    id: 'admin-dashboard',
    name: '管理员 · 数据大盘',
    cases: [
      {
        id: 'dashboard-stats',
        name: '大盘统计数据',
        method: 'GET',
        path: '/begreat-admin/dashboard/stats',
        authType: 'admin',
        expectedStatus: 200,
        validate: (_, data) => expectField(data, 'totalUsers'),
      },
      {
        id: 'dashboard-trend-7d',
        name: '注册趋势 (近 7 天)',
        method: 'GET',
        path: '/begreat-admin/dashboard/trend',
        authType: 'admin',
        params: { days: 7 },
        expectedStatus: 200,
        validate: (_, data) => {
          const arr = Array.isArray(data) ? data : (data as Record<string, unknown>)?.trend;
          if (Array.isArray(arr) && arr.length > 0) return { pass: true, message: `返回 ${arr.length} 天趋势` };
          return { pass: false, message: '未返回有效趋势数组' };
        },
      },
      {
        id: 'dashboard-trend-30d',
        name: '注册趋势 (近 30 天)',
        method: 'GET',
        path: '/begreat-admin/dashboard/trend',
        authType: 'admin',
        params: { days: 30 },
        expectedStatus: 200,
      },
    ],
  },

  {
    id: 'admin-users',
    name: '管理员 · 用户管理',
    cases: [
      {
        id: 'users-list',
        name: '用户列表（第 1 页）',
        method: 'GET',
        path: '/begreat-admin/users',
        authType: 'admin',
        params: { page: 1, pageSize: 10 },
        expectedStatus: 200,
        validate: (_, data) => {
          const d = data as Record<string, unknown>;
          if (typeof d?.total === 'number') return { pass: true, message: `共 ${d.total} 名用户` };
          return { pass: false, message: '缺少 total 字段' };
        },
      },
      {
        id: 'users-list-search',
        name: '用户搜索（空关键词）',
        method: 'GET',
        path: '/begreat-admin/users',
        authType: 'admin',
        params: { page: 1, pageSize: 5, keyword: '' },
        expectedStatus: 200,
      },
    ],
  },

  {
    id: 'admin-sessions',
    name: '管理员 · 测评记录',
    cases: [
      {
        id: 'sessions-list',
        name: '测评记录列表',
        method: 'GET',
        path: '/begreat-admin/sessions',
        authType: 'admin',
        params: { page: 1, pageSize: 10 },
        expectedStatus: 200,
        validate: (_, data) => {
          const d = data as Record<string, unknown>;
          if (typeof d?.total === 'number') return { pass: true, message: `共 ${d.total} 条记录` };
          return { pass: false, message: '缺少 total 字段' };
        },
      },
      {
        id: 'sessions-list-paid',
        name: '已付费测评筛选',
        method: 'GET',
        path: '/begreat-admin/sessions',
        authType: 'admin',
        params: { page: 1, pageSize: 10, status: 'paid' },
        expectedStatus: 200,
      },
      {
        id: 'sessions-not-found',
        name: '不存在的 Session (应返回 404)',
        method: 'GET',
        path: '/begreat-admin/sessions/nonexistent-session-id-000',
        authType: 'admin',
        expectedStatus: 404,
      },
    ],
  },

  {
    id: 'admin-questions',
    name: '管理员 · 题库',
    cases: [
      {
        id: 'questions-stats',
        name: '题库统计',
        method: 'GET',
        path: '/begreat-admin/questions/stats',
        authType: 'admin',
        expectedStatus: 200,
        validate: (_, data) => {
          const d = data as Record<string, unknown>;
          if (typeof d?.total === 'number') return { pass: true, message: `共 ${d.total} 道题` };
          return { pass: false, message: '缺少 total 字段' };
        },
      },
      {
        id: 'questions-list',
        name: '题目列表（第 1 页）',
        method: 'GET',
        path: '/begreat-admin/questions',
        authType: 'admin',
        params: { page: 1, pageSize: 10 },
        expectedStatus: 200,
        validate: (_, data) => expectField(data, 'total'),
      },
    ],
  },

  {
    id: 'admin-occupations',
    name: '管理员 · 职业管理',
    cases: [
      {
        id: 'occupations-list',
        name: '职业列表',
        method: 'GET',
        path: '/begreat-admin/occupations',
        authType: 'admin',
        params: { page: 1, pageSize: 20 },
        expectedStatus: 200,
        validate: (_, data) => expectField(data, 'total'),
      },
      {
        id: 'occupations-seed-preview',
        name: '种子职业预览',
        method: 'GET',
        path: '/begreat-admin/occupations/seed',
        authType: 'admin',
        expectedStatus: 200,
      },
    ],
  },

  {
    id: 'admin-norms',
    name: '管理员 · 常模管理',
    cases: [
      {
        id: 'norms-versions',
        name: '常模版本列表',
        method: 'GET',
        path: '/begreat-admin/norms/versions',
        authType: 'admin',
        expectedStatus: 200,
        validate: (_, data) => {
          if (Array.isArray(data)) return { pass: true, message: `共 ${data.length} 个版本` };
          return { pass: false, message: '返回值不是数组' };
        },
      },
      {
        id: 'norms-list',
        name: '常模数据（不传版本）',
        method: 'GET',
        path: '/begreat-admin/norms',
        authType: 'admin',
        expectedStatus: 200,
      },
    ],
  },

  {
    id: 'admin-payments',
    name: '管理员 · 支付管理',
    cases: [
      {
        id: 'payments-list',
        name: '支付记录列表',
        method: 'GET',
        path: '/begreat-admin/payments',
        authType: 'admin',
        params: { page: 1, pageSize: 10 },
        expectedStatus: 200,
        validate: (_, data) => expectField(data, 'total'),
      },
      {
        id: 'payments-anomalies',
        name: '掉单异常列表',
        method: 'GET',
        path: '/begreat-admin/payments/anomalies',
        authType: 'admin',
        expectedStatus: 200,
        validate: (_, data) => expectArray(data, 'anomalies'),
      },
    ],
  },

  {
    id: 'admin-invites',
    name: '管理员 · 邀请裂变',
    cases: [
      {
        id: 'invites-stats',
        name: '邀请统计',
        method: 'GET',
        path: '/begreat-admin/invites/stats',
        authType: 'admin',
        expectedStatus: 200,
      },
      {
        id: 'invites-list',
        name: '邀请记录列表',
        method: 'GET',
        path: '/begreat-admin/invites',
        authType: 'admin',
        params: { page: 1, pageSize: 10 },
        expectedStatus: 200,
      },
    ],
  },

  {
    id: 'admin-auth',
    name: '管理员 · 鉴权',
    cases: [
      {
        id: 'auth-me',
        name: '当前管理员信息',
        method: 'GET',
        path: '/begreat-admin/auth/me',
        authType: 'admin',
        expectedStatus: 200,
        validate: (_, data) => expectField(data, 'username'),
      },
      {
        id: 'auth-no-token',
        name: '无 Token 拒绝访问（应返回 401）',
        method: 'GET',
        path: '/begreat-admin/auth/me',
        authType: 'none',
        expectedStatus: 401,
      },
    ],
  },

  {
    id: 'miniapp-assessment',
    name: '用户接口 · 测评流程',
    cases: [
      {
        id: 'assessment-history',
        name: '测评历史记录',
        method: 'GET',
        path: '/begreat/assessment/history',
        authType: 'miniapp',
        expectedStatus: 200,
        validate: (_, data) => expectArray(data, 'history'),
      },
      {
        id: 'assessment-start-valid',
        name: '发起 BFI2_FREE 测评',
        method: 'POST',
        path: '/begreat/assessment/start',
        authType: 'miniapp',
        body: { gender: 'male', age: 25, assessmentType: 'BFI2_FREE' },
        expectedStatus: 200,
        validate: (_, data) => expectField(data, 'sessionId'),
      },
      {
        id: 'assessment-start-no-gender',
        name: '缺少 gender（应返回 400）',
        method: 'POST',
        path: '/begreat/assessment/start',
        authType: 'miniapp',
        body: { age: 25 },
        expectedStatus: 400,
      },
      {
        id: 'assessment-start-invalid-age',
        name: '年龄超范围（应返回 400）',
        method: 'POST',
        path: '/begreat/assessment/start',
        authType: 'miniapp',
        body: { gender: 'female', age: 10, assessmentType: 'BFI2_FREE' },
        expectedStatus: 400,
      },
    ],
  },
];

// ── 完整测评流程（多步顺序执行）────────────────────────
// 流程说明：
//   Step 1  POST /assessment/start       → 拿到 sessionId + totalQuestions
//   Step 2  POST /assessment/complete/:sessionId  → body 直传全部答案，直接出报告
//   答案策略：全部回答 3（中性），确保合法且覆盖所有题目索引

function makeAnswers(total: number): { index: number; score: number }[] {
  return Array.from({ length: total }, (_, i) => ({ index: i, score: 3 }));
}

export const TEST_FLOWS: TestFlow[] = [
  {
    id: 'flow-bfi2-free',
    name: '20题完整出报告（BFI2_FREE）',
    steps: [
      {
        id: 'flow-bfi2-free-start',
        name: '① 发起 BFI2_FREE 测评',
        method: 'POST',
        path: '/begreat/assessment/start',
        authType: 'miniapp',
        body: { gender: 'male', age: 25, assessmentType: 'BFI2_FREE' },
        expectedStatus: 200,
        extract: (data) => {
          const d = data as Record<string, unknown>;
          return { sessionId: d['sessionId'], totalQuestions: d['totalQuestions'] };
        },
        validate: (_, data) => {
          const d = data as Record<string, unknown>;
          if (d['sessionId'] && d['totalQuestions'] === 20) {
            return { pass: true, message: `sessionId 已生成，共 20 题` };
          }
          return { pass: false, message: `期望 totalQuestions=20，实际：${JSON.stringify(d['totalQuestions'])}` };
        },
      },
      {
        id: 'flow-bfi2-free-complete',
        name: '② 提交全部答案，出报告',
        method: 'POST',
        path: (ctx) => `/begreat/assessment/complete/${ctx['sessionId'] as string}`,
        authType: 'miniapp',
        body: (ctx) => ({ answers: makeAnswers(ctx['totalQuestions'] as number) }),
        expectedStatus: 200,
        validate: (_, data) => {
          const d = data as Record<string, unknown>;
          if (d['personalityLabel'] && d['report']) {
            return { pass: true, message: `报告生成成功，性格标签：${d['personalityLabel']}` };
          }
          return { pass: false, message: `缺少 personalityLabel 或 report 字段` };
        },
      },
    ],
  },

  {
    id: 'flow-bfi2',
    name: '60题完整出报告（BFI2）',
    steps: [
      {
        id: 'flow-bfi2-start',
        name: '① 发起 BFI2 测评',
        method: 'POST',
        path: '/begreat/assessment/start',
        authType: 'miniapp',
        body: { gender: 'female', age: 28, assessmentType: 'BFI2' },
        expectedStatus: 200,
        extract: (data) => {
          const d = data as Record<string, unknown>;
          return { sessionId: d['sessionId'], totalQuestions: d['totalQuestions'] };
        },
        validate: (_, data) => {
          const d = data as Record<string, unknown>;
          if (d['sessionId'] && d['totalQuestions'] === 60) {
            return { pass: true, message: `sessionId 已生成，共 60 题` };
          }
          return { pass: false, message: `期望 totalQuestions=60，实际：${JSON.stringify(d['totalQuestions'])}` };
        },
      },
      {
        id: 'flow-bfi2-complete',
        name: '② 提交全部答案，出报告',
        method: 'POST',
        path: (ctx) => `/begreat/assessment/complete/${ctx['sessionId'] as string}`,
        authType: 'miniapp',
        body: (ctx) => ({ answers: makeAnswers(ctx['totalQuestions'] as number) }),
        expectedStatus: 200,
        validate: (_, data) => {
          const d = data as Record<string, unknown>;
          if (d['personalityLabel'] && d['report'] && d['sessionId']) {
            return { pass: true, message: `报告生成并存档，性格标签：${d['personalityLabel']}` };
          }
          return { pass: false, message: `缺少 personalityLabel、report 或 sessionId` };
        },
      },
    ],
  },
];
