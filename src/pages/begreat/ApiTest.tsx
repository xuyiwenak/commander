import { useState, useCallback, useRef } from 'react';
import { Typography, Button, Tag, Spin, Tooltip, Progress, message } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { authApi } from '@/api/adminApi';
import type { TestCase, TestSuite, TestFlow, FlowStep, FlowCtx, CaseStatus } from './apiTestCases';
import { TEST_SUITES, TEST_FLOWS } from './apiTestCases';

const { Title, Text } = Typography;

// ── 颜色 token（与 DESIGN.md 对齐）─────────────────────
const C = {
  bgBase:      '#111113',
  bgSurface:   '#18181a',
  bgContainer: '#1c1c1e',
  bgElevated:  '#232325',
  bgHover:     '#2c2c2e',
  border:      '#2e2e30',
  borderStrong:'#3a3a3c',
  textPrimary: '#f2f2f7',
  textSecondary:'#8d8d95',
  textMuted:   '#52525a',
  accent:      '#7c6af5',
  pass:        '#34c759',
  fail:        '#f05252',
  running:     '#ffa726',
};

// ── 运行结果记录 ──────────────────────────────────────
interface CaseResult {
  caseId: string;
  status: CaseStatus;
  elapsedMs: number;
  httpStatus?: number;
  requestBody?: unknown;
  requestParams?: unknown;
  responseData?: unknown;
  errorMessage?: string;
  validateMessage?: string;
}

// ── 原始 axios（不经过 http 拦截器）────────────────────
const raw = axios.create({ timeout: 15000 });

// ── 状态图标 ──────────────────────────────────────────
function StatusIcon({ status }: { status: CaseStatus }) {
  if (status === 'pass')    return <CheckCircleOutlined style={{ color: C.pass }} />;
  if (status === 'fail')    return <CloseCircleOutlined style={{ color: C.fail }} />;
  if (status === 'running') return <Spin size="small" />;
  return <ClockCircleOutlined style={{ color: C.textMuted }} />;
}

function statusColor(status: CaseStatus): string {
  if (status === 'pass')    return C.pass;
  if (status === 'fail')    return C.fail;
  if (status === 'running') return C.running;
  return C.textMuted;
}

function suiteProgress(suite: TestSuite, results: Map<string, CaseResult>): { done: number; pass: number; fail: number } {
  let pass = 0, fail = 0;
  for (const c of suite.cases) {
    const r = results.get(c.id);
    if (r?.status === 'pass') pass++;
    else if (r?.status === 'fail') fail++;
  }
  return { done: pass + fail, pass, fail };
}

function flowProgress(flow: TestFlow, results: Map<string, CaseResult>): { done: number; pass: number; fail: number } {
  let pass = 0, fail = 0;
  for (const s of flow.steps) {
    const r = results.get(s.id);
    if (r?.status === 'pass') pass++;
    else if (r?.status === 'fail') fail++;
  }
  return { done: pass + fail, pass, fail };
}

// ── 主组件 ────────────────────────────────────────────
export default function ApiTest() {
  const [miniappToken, setMiniappToken] = useState('');
  const [tokenOpenId, setTokenOpenId] = useState('');
  const [fetchingToken, setFetchingToken] = useState(false);
  const [results, setResults] = useState<Map<string, CaseResult>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const runningRef = useRef(false);

  const adminToken = localStorage.getItem('begreat_admin_token') ?? '';

  const fetchTestToken = useCallback(async () => {
    setFetchingToken(true);
    try {
      const res = await authApi.getTestMiniappToken();
      const data = res.data as { token: string; openId: string };
      setMiniappToken(data.token);
      setTokenOpenId(data.openId);
      void message.success(`已获取测试 Token，openId: ${data.openId}`);
    } catch (err) {
      const msg = (err as { message?: string }).message ?? '获取失败';
      void message.error(msg.includes('devOpenids') ? '未配置 devOpenids，请先在运行时配置中添加测试 openId' : msg);
    } finally {
      setFetchingToken(false);
    }
  }, []);

  const updateResult = useCallback((result: CaseResult) => {
    setResults(prev => new Map(prev).set(result.caseId, result));
  }, []);

  // 运行流程中的单个步骤，ctx 为前步骤积累的提取值
  const runFlowStep = useCallback(async (
    step: FlowStep,
    ctx: FlowCtx,
  ): Promise<{ ok: boolean; ctx: FlowCtx }> => {
    updateResult({ caseId: step.id, status: 'running', elapsedMs: 0 });

    const token = step.authType === 'admin' ? adminToken
      : step.authType === 'miniapp' ? miniappToken
      : undefined;

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const path = typeof step.path === 'function' ? step.path(ctx) : step.path;
    const body = typeof step.body === 'function' ? step.body(ctx) : step.body;

    const start = Date.now();
    try {
      const res = await raw.request({
        method: step.method,
        url: path,
        headers,
        params: step.params,
        data: body,
        validateStatus: () => true,
      });

      const elapsedMs = Date.now() - start;
      const statusOk = res.status === step.expectedStatus;
      let validateResult = { pass: true, message: '' };
      if (statusOk && step.validate) {
        validateResult = step.validate(res.status, res.data, ctx);
      }

      const pass = statusOk && validateResult.pass;
      updateResult({
        caseId: step.id,
        status: pass ? 'pass' : 'fail',
        elapsedMs,
        httpStatus: res.status,
        requestBody: body,
        requestParams: step.params,
        responseData: res.data,
        errorMessage: !statusOk ? `期望 HTTP ${step.expectedStatus}，实际 ${res.status}` : undefined,
        validateMessage: validateResult.message,
      });

      const nextCtx = pass && step.extract ? { ...ctx, ...step.extract(res.data) } : ctx;
      return { ok: pass, ctx: nextCtx };
    } catch (err) {
      updateResult({
        caseId: step.id,
        status: 'fail',
        elapsedMs: Date.now() - start,
        errorMessage: String((err as Error).message),
      });
      return { ok: false, ctx };
    }
  }, [adminToken, miniappToken, updateResult]);

  // 顺序执行流程的每个步骤，任一步骤失败则停止
  const runFlow = useCallback(async (flow: TestFlow): Promise<void> => {
    let ctx: FlowCtx = {};
    for (const step of flow.steps) {
      const result = await runFlowStep(step, ctx);
      if (!result.ok) break;
      ctx = result.ctx;
    }
  }, [runFlowStep]);

  const runCase = useCallback(async (tc: TestCase): Promise<void> => {
    updateResult({ caseId: tc.id, status: 'running', elapsedMs: 0 });

    const token = tc.authType === 'admin' ? adminToken
      : tc.authType === 'miniapp' ? miniappToken
      : undefined;

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const start = Date.now();
    try {
      const res = await raw.request({
        method: tc.method,
        url: tc.path,
        headers,
        params: tc.params,
        data: tc.body,
        validateStatus: () => true, // 不抛异常，手动检查状态码
      });

      const elapsedMs = Date.now() - start;
      const statusOk = res.status === tc.expectedStatus;
      let validateResult = { pass: true, message: '' };
      if (statusOk && tc.validate) {
        validateResult = tc.validate(res.status, res.data);
      }

      updateResult({
        caseId: tc.id,
        status: statusOk && validateResult.pass ? 'pass' : 'fail',
        elapsedMs,
        httpStatus: res.status,
        requestBody: tc.body,
        requestParams: tc.params,
        responseData: res.data,
        errorMessage: !statusOk
          ? `期望 HTTP ${tc.expectedStatus}，实际 ${res.status}`
          : undefined,
        validateMessage: validateResult.message,
      });
    } catch (err) {
      updateResult({
        caseId: tc.id,
        status: 'fail',
        elapsedMs: Date.now() - start,
        errorMessage: String((err as Error).message),
      });
    }
  }, [adminToken, miniappToken, updateResult]);

  const runSuite = useCallback(async (suite: TestSuite) => {
    for (const tc of suite.cases) {
      await runCase(tc);
    }
  }, [runCase]);

  const runAll = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    for (const suite of TEST_SUITES) {
      await runSuite(suite);
    }
    for (const flow of TEST_FLOWS) {
      await runFlow(flow);
    }
    runningRef.current = false;
  }, [runSuite, runFlow]);

  const clearResults = useCallback(() => {
    setResults(new Map());
    setSelectedId(null);
  }, []);

  const selectedResult = selectedId ? results.get(selectedId) : null;
  const selectedCase = selectedId
    ? TEST_SUITES.flatMap(s => s.cases).find(c => c.id === selectedId)
    : null;
  const selectedStep = selectedId
    ? TEST_FLOWS.flatMap(f => f.steps).find(s => s.id === selectedId)
    : null;

  const totalCases =
    TEST_SUITES.reduce((n, s) => n + s.cases.length, 0) +
    TEST_FLOWS.reduce((n, f) => n + f.steps.length, 0);
  const passCount = [...results.values()].filter(r => r.status === 'pass').length;
  const failCount = [...results.values()].filter(r => r.status === 'fail').length;
  const doneCount = passCount + failCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>

      {/* 顶部工具栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ color: C.textPrimary, margin: 0 }}>接口测试中心</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => void runAll()}
            style={{ background: C.accent, borderColor: C.accent }}
          >
            全部运行
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={clearResults}
            style={{ background: C.bgContainer, borderColor: C.border, color: C.textSecondary }}
          >
            清空结果
          </Button>
        </div>
      </div>

      {/* 进度条（有结果才显示） */}
      {doneCount > 0 && (
        <div style={{
          background: C.bgContainer,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <Progress
            percent={Math.round(doneCount / totalCases * 100)}
            style={{ flex: 1, margin: 0 }}
            strokeColor={failCount > 0 ? C.fail : C.pass}
            trailColor={C.bgHover}
            showInfo={false}
            size="small"
          />
          <Text style={{ color: C.pass, fontSize: 12, whiteSpace: 'nowrap' }}>
            <CheckCircleOutlined /> {passCount} 通过
          </Text>
          {failCount > 0 && (
            <Text style={{ color: C.fail, fontSize: 12, whiteSpace: 'nowrap' }}>
              <CloseCircleOutlined /> {failCount} 失败
            </Text>
          )}
          <Text style={{ color: C.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}>
            共 {totalCases} 个
          </Text>
        </div>
      )}

      {/* Miniapp Token */}
      <div style={{
        background: C.bgContainer,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <Text style={{ color: C.textSecondary, fontSize: 12, flexShrink: 0 }}>用户 Token</Text>
        <Tooltip title={miniappToken ? `openId: ${tokenOpenId || '手动输入'}` : '签发给 devOpenids[0] 配置的测试账号'}>
          <div style={{
            flex: 1,
            background: C.bgElevated,
            border: `1px solid ${miniappToken ? C.accent + '60' : C.border}`,
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            color: miniappToken ? C.textPrimary : C.textMuted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'default',
            minWidth: 0,
          }}>
            {miniappToken || '未设置，点击右侧按钮一键获取'}
          </div>
        </Tooltip>
        {miniappToken && (
          <Button
            size="small"
            onClick={() => { setMiniappToken(''); setTokenOpenId(''); }}
            style={{ background: 'transparent', borderColor: C.border, color: C.textMuted, flexShrink: 0, fontSize: 11 }}
          >
            清除
          </Button>
        )}
        <Button
          size="small"
          icon={fetchingToken ? <Spin size="small" /> : <ThunderboltOutlined />}
          onClick={() => void fetchTestToken()}
          disabled={fetchingToken}
          style={{
            background: C.accent,
            borderColor: C.accent,
            color: '#fff',
            flexShrink: 0,
            fontSize: 12,
          }}
        >
          一键获取
        </Button>
      </div>

      {/* 主体：左右布局 */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* 左侧：测试套件树 */}
        <div style={{
          width: 300,
          flexShrink: 0,
          background: C.bgContainer,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: 'auto',
          padding: '8px 0',
        }}>
          {/* 流程测试区块 */}
          {TEST_FLOWS.map(flow => {
            const { done, pass, fail } = flowProgress(flow, results);
            return (
              <div key={flow.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  gap: 8,
                  background: C.bgElevated,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Tag color="purple" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 5px' }}>流程</Tag>
                      <Text style={{ color: C.textPrimary, fontSize: 12, fontWeight: 600 }}>{flow.name}</Text>
                    </div>
                    {done > 0 ? (
                      <Text style={{ color: fail > 0 ? C.fail : C.pass, fontSize: 11 }}>
                        {pass}/{flow.steps.length} 步通过{fail > 0 ? `，在第 ${pass + 1} 步失败` : ''}
                      </Text>
                    ) : (
                      <Text style={{ color: C.textMuted, fontSize: 11 }}>{flow.steps.length} 步顺序执行</Text>
                    )}
                  </div>
                  <Tooltip title={!miniappToken ? '需要先设置 Miniapp Token' : undefined}>
                    <Button
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => void runFlow(flow)}
                      disabled={!miniappToken}
                      style={{ background: C.bgHover, borderColor: C.border, color: C.accent, fontSize: 11, flexShrink: 0 }}
                    >
                      运行
                    </Button>
                  </Tooltip>
                </div>
                {flow.steps.map(step => {
                  const result = results.get(step.id);
                  const isSelected = selectedId === step.id;
                  return (
                    <div
                      key={step.id}
                      onClick={() => setSelectedId(step.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 14px 7px 24px',
                        cursor: 'pointer',
                        background: isSelected ? `${C.accent}18` : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ flexShrink: 0, fontSize: 12, lineHeight: 1 }}>
                        <StatusIcon status={result?.status ?? 'idle'} />
                      </span>
                      <Text style={{
                        flex: 1, fontSize: 12,
                        color: result ? statusColor(result.status) : C.textSecondary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {step.name}
                      </Text>
                      {result?.elapsedMs != null && result.status !== 'idle' && (
                        <Text style={{ color: C.textMuted, fontSize: 11, flexShrink: 0 }}>{result.elapsedMs}ms</Text>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* 分隔线 */}
          <div style={{ padding: '6px 14px' }}>
            <Text style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>单接口用例</Text>
          </div>

          {TEST_SUITES.map(suite => {
            const { done, pass, fail } = suiteProgress(suite, results);
            const isMiniapp = suite.id.startsWith('miniapp');

            return (
              <div key={suite.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                {/* 套件标题行 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  gap: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: C.textPrimary, fontSize: 12, fontWeight: 600, display: 'block' }}>
                      {suite.name}
                    </Text>
                    {done > 0 && (
                      <Text style={{ color: fail > 0 ? C.fail : C.pass, fontSize: 11 }}>
                        {pass}/{suite.cases.length} 通过{fail > 0 ? `，${fail} 失败` : ''}
                      </Text>
                    )}
                    {done === 0 && (
                      <Text style={{ color: C.textMuted, fontSize: 11 }}>
                        {suite.cases.length} 个用例
                      </Text>
                    )}
                  </div>
                  <Tooltip title={isMiniapp && !miniappToken ? '需要先设置 Miniapp Token' : undefined}>
                    <Button
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => void runSuite(suite)}
                      disabled={isMiniapp && !miniappToken}
                      style={{
                        background: C.bgHover,
                        borderColor: C.border,
                        color: C.accent,
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                    >
                      运行
                    </Button>
                  </Tooltip>
                </div>

                {/* 用例列表 */}
                {suite.cases.map(tc => {
                  const result = results.get(tc.id);
                  const isSelected = selectedId === tc.id;
                  return (
                    <div
                      key={tc.id}
                      onClick={() => {
                        setSelectedId(tc.id);
                        if (!result) void runCase(tc);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 14px 7px 24px',
                        cursor: 'pointer',
                        background: isSelected ? `${C.accent}18` : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ flexShrink: 0, fontSize: 12, lineHeight: 1 }}>
                        <StatusIcon status={result?.status ?? 'idle'} />
                      </span>
                      <Text style={{
                        flex: 1,
                        fontSize: 12,
                        color: result ? statusColor(result.status) : C.textSecondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {tc.name}
                      </Text>
                      {result?.elapsedMs != null && result.status !== 'idle' && (
                        <Text style={{ color: C.textMuted, fontSize: 11, flexShrink: 0 }}>
                          {result.elapsedMs}ms
                        </Text>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 右侧：结果详情 */}
        <div style={{
          flex: 1,
          background: C.bgContainer,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {!selectedCase && !selectedStep && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 8,
            }}>
              <PlayCircleOutlined style={{ fontSize: 32, color: C.textMuted }} />
              <Text style={{ color: C.textMuted, fontSize: 13 }}>点击左侧用例查看详情，或点击「全部运行」</Text>
            </div>
          )}

          {selectedCase && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 用例标题 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {selectedResult && <StatusIcon status={selectedResult.status} />}
                <Title level={5} style={{ color: C.textPrimary, margin: 0 }}>{selectedCase.name}</Title>
                {selectedResult?.elapsedMs != null && selectedResult.status !== 'idle' && (
                  <Tag style={{ background: C.bgHover, borderColor: C.border, color: C.textMuted }}>
                    {selectedResult.elapsedMs} ms
                  </Tag>
                )}
              </div>

              {/* 请求信息 */}
              <DetailSection title="请求">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag color={selectedCase.method === 'GET' ? 'blue' : 'orange'} style={{ margin: 0, fontSize: 11 }}>
                      {selectedCase.method}
                    </Tag>
                    <code style={{ color: C.accent, fontSize: 12 }}>{selectedCase.path}</code>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Tag style={{ background: C.bgHover, borderColor: C.border, color: C.textSecondary, margin: 0, fontSize: 11 }}>
                      auth: {selectedCase.authType}
                    </Tag>
                    <Tag style={{ background: C.bgHover, borderColor: C.border, color: C.textSecondary, margin: 0, fontSize: 11 }}>
                      expect {selectedCase.expectedStatus}
                    </Tag>
                  </div>
                  {selectedCase.params && (
                    <JsonBlock label="Query Params" data={selectedCase.params} />
                  )}
                  {selectedCase.body && (
                    <JsonBlock label="Request Body" data={selectedCase.body} />
                  )}
                </div>
              </DetailSection>

              {/* 响应信息（有结果才显示） */}
              {selectedResult && selectedResult.status !== 'idle' && selectedResult.status !== 'running' && (
                <DetailSection title="响应">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* 状态码 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: C.textSecondary, fontSize: 12 }}>HTTP Status:</Text>
                      <Tag
                        color={selectedResult.httpStatus === selectedCase.expectedStatus ? 'green' : 'red'}
                        style={{ margin: 0 }}
                      >
                        {selectedResult.httpStatus ?? '—'}
                      </Tag>
                    </div>

                    {/* 断言结果 */}
                    {selectedResult.validateMessage && (
                      <div style={{
                        background: C.bgElevated,
                        border: `1px solid ${selectedResult.status === 'pass' ? C.pass : C.fail}22`,
                        borderRadius: 6,
                        padding: '6px 10px',
                      }}>
                        <Text style={{ color: selectedResult.status === 'pass' ? C.pass : C.fail, fontSize: 12 }}>
                          {selectedResult.status === 'pass' ? '✓' : '✗'} {selectedResult.validateMessage}
                        </Text>
                      </div>
                    )}

                    {/* 错误信息 */}
                    {selectedResult.errorMessage && (
                      <div style={{
                        background: '#f0525218',
                        border: `1px solid ${C.fail}33`,
                        borderRadius: 6,
                        padding: '6px 10px',
                      }}>
                        <Text style={{ color: C.fail, fontSize: 12 }}>{selectedResult.errorMessage}</Text>
                      </div>
                    )}

                    {/* 响应体 */}
                    {selectedResult.responseData !== undefined && (
                      <JsonBlock label="Response Body" data={selectedResult.responseData} />
                    )}
                  </div>
                </DetailSection>
              )}

              {selectedResult?.status === 'running' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Spin size="small" />
                  <Text style={{ color: C.textSecondary, fontSize: 12 }}>请求中…</Text>
                </div>
              )}

              {/* 重新运行按钮 */}
              <div>
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={() => void runCase(selectedCase)}
                  size="small"
                  style={{ background: C.bgHover, borderColor: C.border, color: C.accent }}
                >
                  重新运行此用例
                </Button>
              </div>
            </div>
          )}

          {/* 流程步骤详情 */}
          {selectedStep && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {selectedResult && <StatusIcon status={selectedResult.status} />}
                <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>流程步骤</Tag>
                <Title level={5} style={{ color: C.textPrimary, margin: 0 }}>{selectedStep.name}</Title>
                {selectedResult?.elapsedMs != null && selectedResult.status !== 'idle' && (
                  <Tag style={{ background: C.bgHover, borderColor: C.border, color: C.textMuted }}>
                    {selectedResult.elapsedMs} ms
                  </Tag>
                )}
              </div>

              <DetailSection title="请求（运行后显示实际 path/body）">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color={selectedStep.method === 'GET' ? 'blue' : 'orange'} style={{ margin: 0, fontSize: 11 }}>
                    {selectedStep.method}
                  </Tag>
                  <code style={{ color: C.accent, fontSize: 12 }}>
                    {typeof selectedStep.path === 'function' ? '(动态路径，由上一步 sessionId 填入)' : selectedStep.path}
                  </code>
                </div>
                {selectedResult?.requestBody !== undefined && (
                  <div style={{ marginTop: 8 }}>
                    <JsonBlock label="实际 Request Body" data={selectedResult.requestBody} />
                  </div>
                )}
              </DetailSection>

              {selectedResult && selectedResult.status !== 'idle' && selectedResult.status !== 'running' && (
                <DetailSection title="响应">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: C.textSecondary, fontSize: 12 }}>HTTP Status:</Text>
                      <Tag color={selectedResult.httpStatus === selectedStep.expectedStatus ? 'green' : 'red'} style={{ margin: 0 }}>
                        {selectedResult.httpStatus ?? '—'}
                      </Tag>
                    </div>
                    {selectedResult.validateMessage && (
                      <div style={{
                        background: C.bgElevated,
                        border: `1px solid ${selectedResult.status === 'pass' ? C.pass : C.fail}22`,
                        borderRadius: 6,
                        padding: '6px 10px',
                      }}>
                        <Text style={{ color: selectedResult.status === 'pass' ? C.pass : C.fail, fontSize: 12 }}>
                          {selectedResult.status === 'pass' ? '✓' : '✗'} {selectedResult.validateMessage}
                        </Text>
                      </div>
                    )}
                    {selectedResult.errorMessage && (
                      <div style={{ background: '#f0525218', border: `1px solid ${C.fail}33`, borderRadius: 6, padding: '6px 10px' }}>
                        <Text style={{ color: C.fail, fontSize: 12 }}>{selectedResult.errorMessage}</Text>
                      </div>
                    )}
                    {selectedResult.responseData !== undefined && (
                      <JsonBlock label="Response Body" data={selectedResult.responseData} />
                    )}
                  </div>
                </DetailSection>
              )}

              {selectedResult?.status === 'running' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Spin size="small" />
                  <Text style={{ color: C.textSecondary, fontSize: 12 }}>请求中…</Text>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 子组件 ────────────────────────────────────────────
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#18181a',
      border: `1px solid #2e2e30`,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid #2e2e30',
        background: '#232325',
      }}>
        <Text style={{ color: '#8d8d95', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </Text>
      </div>
      <div style={{ padding: '12px 14px' }}>{children}</div>
    </div>
  );
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  const [collapsed, setCollapsed] = useState(true);
  const json = JSON.stringify(data, null, 2);
  const isLong = json.length > 300;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: '#8d8d95', fontSize: 11 }}>{label}</Text>
        {isLong && (
          <Button
            type="link"
            size="small"
            onClick={() => setCollapsed(p => !p)}
            style={{ color: '#7c6af5', padding: 0, fontSize: 11, height: 'auto' }}
          >
            {collapsed ? '展开' : '收起'}
          </Button>
        )}
      </div>
      <pre style={{
        background: '#111113',
        border: '1px solid #2e2e30',
        borderRadius: 6,
        padding: '8px 10px',
        fontSize: 11,
        color: '#f2f2f7',
        margin: 0,
        maxHeight: isLong && collapsed ? 120 : 480,
        overflow: isLong && collapsed ? 'hidden' : 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        lineHeight: 1.6,
      }}>
        {json}
      </pre>
    </div>
  );
}
