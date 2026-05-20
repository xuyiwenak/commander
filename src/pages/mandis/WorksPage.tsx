import { useCallback, useEffect, useState } from 'react';
import {
  Button, DatePicker, Descriptions, Divider, Drawer,
  Empty, Image, Input, Select, Skeleton, Space, Table, Tag, Typography,
} from 'antd';
import { ReloadOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { mandisWorksApi } from '@/api/adminApi';

const { RangePicker } = DatePicker;
const { Text, Paragraph, Title } = Typography;

// ── Design tokens (DESIGN.md) ─────────────────────────────────────────────────
const BG_ELEVATED    = '#232325';
const BG_HOVER       = '#2c2c2e';
const BG_CONTAINER   = '#1c1c1e';
const BORDER_COLOR   = '#2e2e30';
const TEXT_PRIMARY   = '#f2f2f7';
const TEXT_SECONDARY = '#8d8d95';
const TEXT_MUTED     = '#52525a';

const STATUS_COLOR: Record<string, string> = {
  published: 'green',
  draft:     'default',
};

const STATUS_LABEL: Record<string, string> = {
  published: '已发布',
  draft:     '草稿',
};

const HEALING_STATUS_COLOR: Record<string, string> = {
  success: 'green',
  pending: 'orange',
  failed:  'red',
};

const HEALING_STATUS_LABEL: Record<string, string> = {
  success: '分析完成',
  pending: '分析中',
  failed:  '分析失败',
};

const PAGE_SIZE = 20; // rows per page

// ── Types ─────────────────────────────────────────────────────────────────────
interface HealingData {
  summary?: string;
  colorAnalysis?: string;
  status?: 'pending' | 'success' | 'failed';
  analyzedAt?: string;
  scores?: Record<string, number>;
  suggestion?: string;
  keyColors?: string[];
  failReason?: string;
}

// Field names match the backend IWork entity exactly
interface Work {
  workId: string;
  desc: string;
  status: string;
  coverUrl?: string;
  authorId: string;
  healing?: Pick<HealingData, 'status' | 'summary'> | null;
  createdAt: string;
}

interface WorkDetail extends Work {
  images?: { url: string; name: string; type: string }[];
  healing?: HealingData | null;
}

interface WorkFilter {
  keyword: string;
  status: string;
  dateRange: [Dayjs, Dayjs] | null;
}

const EMPTY_FILTER: WorkFilter = { keyword: '', status: '', dateRange: null };

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildParams(f: WorkFilter, page: number): Record<string, unknown> {
  // backend uses 'limit', not 'pageSize'
  const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
  if (f.keyword) params.authorId = f.keyword;
  if (f.status)  params.status   = f.status;
  if (f.dateRange) {
    params.startDate = f.dateRange[0].format('YYYY-MM-DD');
    params.endDate   = f.dateRange[1].format('YYYY-MM-DD');
  }
  return params;
}

// ── Skeleton rows (replaces table during initial load) ────────────────────────
function SkeletonRows() {
  return (
    <div>
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 16px',
            borderBottom: `1px solid ${BORDER_COLOR}`,
          }}
        >
          <Skeleton.Avatar active shape="square" size={48}
            style={{ borderRadius: 6, flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
            <Skeleton.Input active size="small" style={{ width: 180 }} />
            <Skeleton.Input active size="small" style={{ width: 96 }} />
            <Skeleton.Input active size="small" style={{ width: 60 }} />
            <Skeleton.Input active size="small" style={{ width: 120, marginLeft: 'auto' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Healing scores grid ───────────────────────────────────────────────────────
function HealingScores({ scores }: { scores: Record<string, number> }) {
  const entries = Object.entries(scores).slice(0, 6);
  if (!entries.length) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        marginTop: 10,
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {entries.map(([key, val], i) => (
        <div
          key={key}
          style={{
            flex: '1 1 calc(33% - 1px)',
            padding: '10px 14px',
            background: BG_ELEVATED,
            borderRight: (i + 1) % 3 !== 0 ? `1px solid ${BORDER_COLOR}` : undefined,
            borderBottom: i < entries.length - 3 ? `1px solid ${BORDER_COLOR}` : undefined,
          }}
        >
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4, letterSpacing: '0.04em' }}>
            {key}
          </div>
          <div
            style={{
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              fontSize: 13,
              fontWeight: 500,
              color: TEXT_PRIMARY,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {typeof val === 'number' ? val.toFixed(2) : String(val)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Drawer body ───────────────────────────────────────────────────────────────
function DrawerBody({
  work, loading, error, onRetry,
}: {
  work: WorkDetail | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Text style={{ color: TEXT_SECONDARY }}>加载失败，请重试</Text>
        <Button type="link" icon={<ReloadOutlined />} onClick={onRetry} style={{ marginLeft: 8 }}>
          重试
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton.Avatar key={i} active shape="square" size={120}
              style={{ borderRadius: 6, width: 120, height: 120, flexShrink: 0 }} />
          ))}
        </div>
        <Skeleton active paragraph={{ rows: 4 }} style={{ marginBottom: 24 }} />
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  if (!work) return null;

  const h = work.healing;

  return (
    <div>
      {!!work.images?.length && (
        <div style={{ marginBottom: 20 }}>
          <Image.PreviewGroup>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {work.images.map((img, i) => (
                <Image key={i} src={img.url} width={120} height={120}
                  style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              ))}
            </div>
          </Image.PreviewGroup>
        </div>
      )}

      <Descriptions
        size="small"
        column={1}
        labelStyle={{ color: TEXT_SECONDARY, width: 76, fontSize: 12 }}
        contentStyle={{ fontSize: 13 }}
      >
        <Descriptions.Item label="用户 ID">
          <Text copyable
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: TEXT_SECONDARY }}>
            {work.authorId}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="作品 ID">
          <Text copyable
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: TEXT_SECONDARY }}>
            {work.workId}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="上传时间">
          {dayjs(work.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
      </Descriptions>

      {work.desc && (
        <>
          <Divider style={{ borderColor: BORDER_COLOR, margin: '16px 0' }} />
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 6, letterSpacing: '0.04em' }}>
            作品描述
          </div>
          <Paragraph style={{ color: TEXT_SECONDARY, fontSize: 13, lineHeight: 1.75, margin: 0 }}>
            {work.desc}
          </Paragraph>
        </>
      )}

      <Divider style={{ borderColor: BORDER_COLOR, margin: '16px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: '0.04em' }}>AI 疗愈分析</span>
        {h?.status && (
          <Tag color={HEALING_STATUS_COLOR[h.status] ?? 'default'} style={{ fontSize: 11, margin: 0 }}>
            {HEALING_STATUS_LABEL[h.status] ?? h.status}
          </Tag>
        )}
      </div>

      {!h ? (
        <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>暂无分析数据</Text>
      ) : h.status === 'failed' ? (
        <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>
          分析失败{h.failReason ? `：${h.failReason}` : ''}
        </Text>
      ) : (
        <>
          {h.summary && (
            <div
              style={{
                padding: '12px 14px',
                background: BG_CONTAINER,
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: 6,
                fontSize: 13,
                lineHeight: 1.75,
                color: TEXT_SECONDARY,
                whiteSpace: 'pre-wrap',
                marginBottom: 10,
              }}
            >
              {h.summary}
            </div>
          )}

          {h.colorAnalysis && (
            <>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4, letterSpacing: '0.04em' }}>
                色彩分析
              </div>
              <Paragraph style={{ color: TEXT_SECONDARY, fontSize: 12, lineHeight: 1.7, margin: '0 0 10px' }}>
                {h.colorAnalysis}
              </Paragraph>
            </>
          )}

          {h.suggestion && (
            <>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4, letterSpacing: '0.04em' }}>
                建议
              </div>
              <Paragraph style={{ color: TEXT_SECONDARY, fontSize: 12, lineHeight: 1.7, margin: '0 0 10px' }}>
                {h.suggestion}
              </Paragraph>
            </>
          )}

          {h.scores && Object.keys(h.scores).length > 0 && (
            <>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4, letterSpacing: '0.04em' }}>
                情绪维度得分
              </div>
              <HealingScores scores={h.scores} />
            </>
          )}

          {h.analyzedAt && (
            <div style={{ marginTop: 8, fontSize: 11, color: TEXT_MUTED, textAlign: 'right' }}>
              分析于 {dayjs(h.analyzedAt).format('YYYY-MM-DD HH:mm')}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorksPage() {
  const [data, setData]             = useState<Work[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [page, setPage]             = useState(1);
  const [filter, setFilter]         = useState<WorkFilter>(EMPTY_FILTER);
  const [draft, setDraft]           = useState<WorkFilter>(EMPTY_FILTER);

  const [selectedId, setSelectedId]               = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen]               = useState(false);
  const [detailWork, setDetailWork]               = useState<WorkDetail | null>(null);
  const [detailLoading, setDetailLoading]         = useState(false);
  const [detailError, setDetailError]             = useState(false);

  const fetchList = useCallback((f: WorkFilter, p: number) => {
    setLoading(true);
    setFetchError(false);
    mandisWorksApi.list(buildParams(f, p))
      .then((r) => {
        const resp = r.data as { list: Work[]; total: number };
        setData(resp.list ?? []);
        setTotal(resp.total ?? 0);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchList(filter, page); }, [fetchList, filter, page]);

  const handleSearch = () => { setFilter({ ...draft }); setPage(1); };
  const handleReset  = () => { setDraft(EMPTY_FILTER); setFilter(EMPTY_FILTER); setPage(1); };

  const loadDetail = (workId: string) => {
    setDetailWork(null);
    setDetailError(false);
    setDetailLoading(true);
    mandisWorksApi.detail(workId)
      .then((r) => setDetailWork(r.data as WorkDetail))
      .catch(() => setDetailError(true))
      .finally(() => setDetailLoading(false));
  };

  const openDetail = (record: Work) => {
    if (selectedId === record.workId) { setDrawerOpen(false); setSelectedId(null); return; }
    setSelectedId(record.workId);
    setDrawerOpen(true);
    loadDetail(record.workId);
  };

  const closeDrawer = () => { setDrawerOpen(false); setSelectedId(null); };
  const handlePageChange = (p: number) => { setPage(p); closeDrawer(); };

  const hasActiveFilter = !!(filter.keyword || filter.status || filter.dateRange);

  const drawerTitle = drawerOpen && detailWork ? (
    <Space size={8}>
      <Text style={{ color: TEXT_PRIMARY, fontSize: 15, fontWeight: 600 }}>
        {detailWork.desc || '（无描述）'}
      </Text>
      <Tag color={STATUS_COLOR[detailWork.status] ?? 'default'} style={{ fontSize: 12 }}>
        {STATUS_LABEL[detailWork.status] ?? detailWork.status}
      </Tag>
    </Space>
  ) : '作品详情';

  const columns = [
    {
      key: 'cover',
      width: 64,
      render: (_: unknown, r: Work) =>
        r.coverUrl
          ? <Image src={r.coverUrl} width={48} height={48} preview={false}
              style={{ objectFit: 'cover', borderRadius: 6, display: 'block' }} />
          : <div style={{ width: 48, height: 48, background: BG_ELEVATED,
              borderRadius: 6, border: `1px solid ${BORDER_COLOR}` }} />,
    },
    {
      title: <span style={{ color: TEXT_SECONDARY, fontSize: 12 }}>描述</span>,
      dataIndex: 'desc',
      ellipsis: true,
    },
    {
      title: <span style={{ color: TEXT_SECONDARY, fontSize: 12 }}>用户 ID</span>,
      dataIndex: 'authorId',
      width: 200,
      ellipsis: true,
      render: (v: string) => (
        <Space size={6}>
          <UserOutlined style={{ color: TEXT_MUTED, fontSize: 12 }} />
          <Text style={{ fontSize: 12, color: TEXT_SECONDARY,
            fontFamily: 'ui-monospace, monospace' }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: <span style={{ color: TEXT_SECONDARY, fontSize: 12 }}>状态</span>,
      dataIndex: 'status',
      width: 88,
      render: (s: string) => (
        <Tag color={STATUS_COLOR[s] ?? 'default'} style={{ fontSize: 12 }}>
          {STATUS_LABEL[s] ?? s}
        </Tag>
      ),
    },
    {
      title: <span style={{ color: TEXT_SECONDARY, fontSize: 12 }}>AI 分析</span>,
      key: 'healing',
      width: 100,
      render: (_: unknown, r: Work) => {
        const hs = r.healing?.status;
        if (!hs || hs === 'pending') return <Text style={{ fontSize: 12, color: TEXT_MUTED }}>—</Text>;
        return (
          <Tag color={HEALING_STATUS_COLOR[hs] ?? 'default'} style={{ fontSize: 11 }}>
            {HEALING_STATUS_LABEL[hs] ?? hs}
          </Tag>
        );
      },
    },
    {
      title: <span style={{ color: TEXT_SECONDARY, fontSize: 12 }}>上传时间</span>,
      dataIndex: 'createdAt',
      width: 148,
      render: (v: string) => (
        <Text style={{ fontSize: 12, color: TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>
          {dayjs(v).format('YYYY-MM-DD HH:mm')}
        </Text>
      ),
    },
  ];

  return (
    <>
      <style>{`
        .works-table .ant-table-row { cursor: pointer; }
        .works-table .ant-table-row:hover .ant-table-cell { background: ${BG_HOVER} !important; }
        .works-table .works-row--active .ant-table-cell  { background: ${BG_HOVER} !important; }
        .works-table .ant-table-cell                     { padding: 10px 12px !important; }
        .works-table .ant-table-thead .ant-table-cell    { padding: 8px 12px !important; }
      `}</style>

      <Title level={4} style={{ marginBottom: 20 }}>作品管理</Title>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="按用户 ID 搜索"
          value={draft.keyword}
          onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))}
          onPressEnter={handleSearch}
          style={{ width: 220 }}
          prefix={<SearchOutlined style={{ color: TEXT_MUTED }} />}
          allowClear
        />
        <Select
          placeholder="状态"
          value={draft.status || undefined}
          onChange={(v) => setDraft((d) => ({ ...d, status: v ?? '' }))}
          allowClear
          style={{ width: 108 }}
          options={[
            { label: '已发布', value: 'published' },
            { label: '草稿',   value: 'draft' },
          ]}
        />
        <RangePicker
          value={draft.dateRange}
          onChange={(v) => setDraft((d) => ({ ...d, dateRange: v as [Dayjs, Dayjs] | null }))}
          placeholder={['开始日期', '结束日期']}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>

      {fetchError ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Text style={{ color: TEXT_SECONDARY }}>加载失败，请重试</Text>
          <Button type="link" icon={<ReloadOutlined />}
            onClick={() => fetchList(filter, page)} style={{ marginLeft: 8 }}>
            重试
          </Button>
        </div>
      ) : loading ? (
        <SkeletonRows />
      ) : data.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: TEXT_SECONDARY }}>
              {hasActiveFilter ? '未找到符合条件的作品' : '暂无作品'}
            </span>
          }
          style={{ padding: '48px 0' }}
        >
          {hasActiveFilter && <Button size="small" onClick={handleReset}>清除筛选</Button>}
        </Empty>
      ) : (
        <Table
          className="works-table"
          rowKey="workId"
          dataSource={data}
          columns={columns}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showTotal: (t) => `共 ${t} 条`,
            onChange: handlePageChange,
            showSizeChanger: false,
          }}
          onRow={(record) => ({
            onClick: () => openDetail(record),
            className: record.workId === selectedId ? 'works-row--active' : undefined,
          })}
        />
      )}

      <Drawer
        open={drawerOpen}
        title={drawerTitle}
        placement="right"
        width={520}
        onClose={closeDrawer}
        destroyOnClose
        styles={{
          header: { borderBottom: `1px solid ${BORDER_COLOR}`, padding: '16px 20px' },
          body:   { padding: '20px 24px', overflowY: 'auto' },
        }}
      >
        <DrawerBody
          work={detailWork}
          loading={detailLoading}
          error={detailError}
          onRetry={() => selectedId && loadDetail(selectedId)}
        />
      </Drawer>
    </>
  );
}
