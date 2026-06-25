import { useMemo, useState } from 'react';
import {
  Search, ShieldAlert, ListFilter, Layers,
  BarChart2, ClipboardList, UserCheck, AlertTriangle,
} from 'lucide-react';
import { PageHeader, StatCard, Segmented } from '../components/ui';
import { Panel, ScorePill } from '../components/sig';
import { StatusBadge, toast } from '../components/kit';
import { DataTable, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, block, review, pass, cssVar, DRAW } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import type { ScreeningHit, ScreeningTask, SanctionList } from '../types';

// ════════════════════════════════════════════════════════════════════════
// 名单 / 制裁筛查 · 单查 + 批量 · OFAC / EU / UN / PEP / 央行反洗钱
// 叙事：对客户与对手方实时比对五大名单体系，相似度 ≥ 0.85 自动转人工复核。
// 🔒 脱敏：主体用化名（ZHANG W. / 示例贸易 / 某港口物流等），命中标题体现名单术语。
// ════════════════════════════════════════════════════════════════════════

// ─── 名单来源配色 ──────────────────────────────────────────────────────────
const LIST_COLOR: Record<SanctionList, string> = {
  OFAC: 'var(--danger)',
  EU: 'var(--info)',
  UN: 'var(--warning)',
  PEP: 'var(--gold)',
  央行反洗钱: 'var(--success)',
};

// ─── 候选命中数据（单查模拟结果，含名单术语 + 脱敏主体）──────────────────────
const MOCK_HITS: ScreeningHit[] = [
  {
    id: 'SH-0001', name: 'ZHANG W.', matchName: 'ZHANG WEI',
    list: 'OFAC', similarity: 0.97, country: '伊朗', reason: 'SDN 制裁实体 · 涉及核扩散资金',
    decision: '命中',
  },
  {
    id: 'SH-0002', name: 'ZHANG W.', matchName: 'ZHANG WEIMING',
    list: 'PEP', similarity: 0.89, country: '中国', reason: 'PEP 关联人 · 涉 FATF 高风险地区',
    decision: '疑似',
  },
  {
    id: 'SH-0003', name: 'ZHANG W.', matchName: 'ZHANG WEIFANG',
    list: 'EU', similarity: 0.82, country: '俄罗斯', reason: 'EU 制裁名单 · 涉资产冻结',
    decision: '疑似',
  },
  {
    id: 'SH-0004', name: 'ZHANG W.', matchName: 'CHANG WEI',
    list: 'UN', similarity: 0.71, country: '朝鲜', reason: 'UN 安理会 1718 委员会制裁名单',
    decision: '疑似',
  },
  {
    id: 'SH-0005', name: 'ZHANG W.', matchName: 'ZHANG WEN',
    list: '央行反洗钱', similarity: 0.66, country: '中国', reason: '央行反洗钱关注名单 · 疑似资金通道',
    decision: '疑似',
  },
  {
    id: 'SH-0006', name: 'ZHANG W.', matchName: 'ZHAN GE WEI',
    list: 'OFAC', similarity: 0.61, country: '利比亚', reason: '名称近似 · 国别不符 · 综合判定排除',
    decision: '排除',
  },
  {
    id: 'SH-0007', name: 'ZHANG W.', matchName: 'CHANG WEIQI',
    list: 'EU', similarity: 0.60, country: '土耳其', reason: '音译近似 · 无其他关联信号',
    decision: '排除',
  },
];

// ─── 批量筛查任务列表 ─────────────────────────────────────────────────────────
const MOCK_TASKS: ScreeningTask[] = [
  { id: 'BT-2406-001', name: '示例消费金融 · Q2 存量客户全量筛查', total: 148200, hits: 37, status: '已完成', at: '2026-06-18 09:14' },
  { id: 'BT-2406-002', name: '对手方新增准入批量核查 · 6 月第 3 周', total: 2841, hits: 12, status: '已完成', at: '2026-06-17 14:52' },
  { id: 'BT-2406-003', name: '某港口物流集团 · 贸易融资对手方筛查', total: 412, hits: 4, status: '已完成', at: '2026-06-16 11:30' },
  { id: 'BT-2406-004', name: '信用贷 · 高风险行业新客名单比对', total: 5690, hits: 21, status: '已完成', at: '2026-06-15 16:08' },
  { id: 'BT-2406-005', name: 'Q2 存量客户差异更新 · PEP 专项筛查', total: 32400, hits: 8, status: '进行中', at: '2026-06-20 08:31' },
  { id: 'BT-2406-006', name: '新批次供应链融资对手方 · 全量五大名单', total: 888, hits: 0, status: '进行中', at: '2026-06-20 09:05' },
];

// ─── 相似度直方图数据（分桶 × 命中数量）──────────────────────────────────────
const HIST_BUCKETS = [
  { bin: '0.60–0.65', count: 4, type: '排除' },
  { bin: '0.65–0.70', count: 7, type: '排除' },
  { bin: '0.70–0.75', count: 9, type: '疑似' },
  { bin: '0.75–0.80', count: 11, type: '疑似' },
  { bin: '0.80–0.85', count: 14, type: '疑似' },
  { bin: '0.85–0.90', count: 18, type: '疑似' },
  { bin: '0.90–0.95', count: 12, type: '命中' },
  { bin: '0.95–1.00', count: 6, type: '命中' },
];

// 决策着色映射
const DEC_COLOR: Record<'命中' | '疑似' | '排除', string> = {
  命中: 'var(--danger)',
  疑似: 'var(--warning)',
  排除: 'var(--text-3)',
};
const DEC_TONE: Record<'命中' | '疑似' | '排除', 'bad' | 'warn' | 'muted'> = {
  命中: 'bad',
  疑似: 'warn',
  排除: 'muted',
};

type SearchState = 'idle' | 'searching' | 'done';

export default function Screening() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('screening:read');

  // 单查状态
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [hits, setHits] = useState<ScreeningHit[]>([]);

  // 批量任务分段
  type TaskTab = 'all' | '进行中' | '已完成';
  const [taskTab, setTaskTab] = useState<TaskTab>('all');

  const taskRows = useMemo(() => {
    if (taskTab === 'all') return MOCK_TASKS;
    return MOCK_TASKS.filter(t => t.status === taskTab);
  }, [taskTab]);

  // 单查触发（模拟 300ms 延迟）
  function handleSearch() {
    if (!query.trim()) return;
    setSearchState('searching');
    setHits([]);
    setTimeout(() => {
      setHits(MOCK_HITS);
      setSearchState('done');
    }, 320);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  function handleEscalate(hit: ScreeningHit) {
    toast(`${hit.name} — ${hit.list} 命中已转人工复核队列`, 'danger');
  }

  // 相似度直方图
  function buildHistChart() {
    return {
      ...baseOption(),
      ...DRAW,
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      tooltip: {
        ...(baseOption().tooltip as object),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: { name: string; value: number; seriesName: string }[]) => {
          const p = params[0];
          return `<span style="font-size:12px">${p.name}<br/><b>${p.value}</b> 条候选 · ${p.seriesName}</span>`;
        },
      },
      legend: {
        data: ['命中', '疑似', '排除'],
        top: 0, right: 0, itemWidth: 10, itemHeight: 10, itemGap: 14,
        textStyle: { color: cssVar('--text-2'), fontSize: 11 },
      },
      // 阈值线 (0.85)
      markLine: {},
      xAxis: {
        type: 'category',
        data: HIST_BUCKETS.map(b => b.bin),
        ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, interval: 0, rotate: 22, fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: '候选数量',
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
        ...axisStyle(),
      },
      series: [
        {
          name: '命中',
          type: 'bar',
          stack: 'h',
          data: HIST_BUCKETS.map(b => (b.type === '命中' ? b.count : 0)),
          itemStyle: { color: block(), borderRadius: [0, 0, 0, 0] },
          barWidth: '60%',
        },
        {
          name: '疑似',
          type: 'bar',
          stack: 'h',
          data: HIST_BUCKETS.map(b => (b.type === '疑似' ? b.count : 0)),
          itemStyle: { color: review(), borderRadius: [0, 0, 0, 0] },
        },
        {
          name: '排除',
          type: 'bar',
          stack: 'h',
          data: HIST_BUCKETS.map(b => (b.type === '排除' ? b.count : 0)),
          itemStyle: { color: cssVar('--surface-3'), borderRadius: [3, 3, 0, 0] },
        },
        // 阈值线
        {
          type: 'bar',
          stack: 'threshold-overlay',
          data: HIST_BUCKETS.map(() => 0),
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            lineStyle: { color: accent(), type: 'dashed', width: 1.5, opacity: 0.7 },
            data: [{ name: '复核阈值 0.85', xAxis: 4.5 }],
            label: {
              formatter: '阈值 0.85',
              color: cssVar('--gold'),
              fontSize: 10,
              fontWeight: 600,
            },
          },
        },
      ],
    };
  }

  // 命中列定义
  const hitCols: Col<ScreeningHit>[] = [
    {
      key: 'similarity', header: '相似度', num: true, width: 90, sortable: true,
      sortAccessor: h => h.similarity,
      render: h => <ScorePill score={h.similarity} />,
    },
    {
      key: 'name', header: '查询主体 / 命中名称', width: 200,
      render: h => (
        <div className="col gap-1">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{h.name}</span>
          <span className="t-small text-3">命中：{h.matchName}</span>
        </div>
      ),
    },
    {
      key: 'list', header: '名单来源', width: 120,
      render: h => {
        const c = LIST_COLOR[h.list];
        return (
          <span
            className="badge"
            style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c, fontWeight: 700, letterSpacing: '0.04em', fontSize: 11 }}
          >
            {h.list}
          </span>
        );
      },
    },
    {
      key: 'country', header: '国别', width: 76,
      render: h => <span className="t-small" style={{ color: 'var(--text-2)' }}>{h.country}</span>,
    },
    {
      key: 'reason', header: '命中原因', width: 260,
      render: h => <span className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>{h.reason}</span>,
    },
    {
      key: 'decision', header: '判定', width: 88,
      render: h => <StatusBadge status={h.decision} tone={DEC_TONE[h.decision]} />,
    },
    {
      key: 'act', header: '操作', width: 96,
      render: h => h.decision !== '排除' ? (
        <button
          className="btn btn-danger"
          style={{ fontSize: 11, padding: '3px 10px', opacity: h.decision === '命中' ? 1 : 0.75 }}
          onClick={e => { e.stopPropagation(); handleEscalate(h); }}
        >
          <UserCheck size={11} />转人工
        </button>
      ) : (
        <span className="t-small text-3">—</span>
      ),
    },
  ];

  // 批量任务列定义
  const taskCols: Col<ScreeningTask>[] = [
    {
      key: 'id', header: '任务 ID', width: 130,
      render: t => <span className="mono t-small text-3">{t.id}</span>,
    },
    {
      key: 'name', header: '任务名称', width: 320,
      render: t => <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{t.name}</span>,
    },
    {
      key: 'total', header: '总数', num: true, width: 90, sortable: true,
      sortAccessor: t => t.total,
      render: t => <span className="mononum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{t.total.toLocaleString()}</span>,
    },
    {
      key: 'hits', header: '命中数', num: true, width: 80, sortable: true,
      sortAccessor: t => t.hits,
      render: t => (
        <span className="mononum" style={{ color: t.hits > 0 ? 'var(--danger)' : 'var(--text-3)', fontWeight: 700 }}>
          {t.hits}
        </span>
      ),
    },
    {
      key: 'hitRate', header: '命中率', num: true, width: 78,
      render: t => (
        <span className="mononum t-small" style={{ color: 'var(--text-2)' }}>
          {t.total > 0 ? ((t.hits / t.total) * 100).toFixed(2) : '—'}%
        </span>
      ),
    },
    {
      key: 'status', header: '状态', width: 88,
      render: t => <StatusBadge status={t.status} tone={t.status === '已完成' ? 'good' : 'info'} />,
    },
    {
      key: 'at', header: '时间', width: 140,
      render: t => <span className="mono t-small text-3">{t.at}</span>,
    },
  ];

  if (!canRead) {
    return (
      <div className="page">
        <PageHeader title="名单 / 制裁筛查" subtitle="OFAC / EU / UN / PEP · 实时与批量筛查" />
        <Panel>
          <div className="t-small text-3" style={{ padding: 20 }}>
            当前角色无名单筛查权限（需合规官 / CISO）。
          </div>
        </Panel>
      </div>
    );
  }

  // KPI 快数（本月批量任务汇总）
  const monthTotal = MOCK_TASKS.reduce((s, t) => s + t.total, 0);
  const monthHits = MOCK_TASKS.reduce((s, t) => s + t.hits, 0);

  return (
    <div className="page page-wide">
      <PageHeader
        title="名单 / 制裁筛查"
        subtitle="OFAC · EU · UN · PEP · 央行反洗钱 — 客户与对手方实时比对，相似度 ≥ 0.85 自动转复核"
        actions={
          <span className="row gap-2 t-small text-3">
            <span className="live-pulse" />实时更新 · 五大名单体系
          </span>
        }
      />

      {/* ═══ KPI 行 ═══ */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
        <StatCard label="本月筛查总数" raw={monthTotal} unit="主体" icon={<Search size={14} />} delayClass="reveal" />
        <StatCard label="命中 / 疑似" raw={monthHits} unit="条" icon={<AlertTriangle size={14} />} delayClass="reveal" />
        <StatCard label="批量任务" raw={MOCK_TASKS.length} unit="个" icon={<ClipboardList size={14} />} delayClass="reveal" />
        <StatCard label="命中率" raw={parseFloat(((monthHits / monthTotal) * 100).toFixed(2))} unit="%" decimals={2} icon={<ShieldAlert size={14} />} delayClass="reveal" />
      </div>

      {/* ═══ 单查区 ═══ */}
      <Panel
        title="单一主体实时筛查"
        icon={<Search size={13} />}
        right={
          searchState === 'done' && (
            <span className="t-small text-3 mononum">
              {hits.length} 条候选 · {hits.filter(h => h.decision === '命中').length} 命中
              · {hits.filter(h => h.decision === '疑似').length} 疑似
            </span>
          )
        }
        style={{ marginBottom: 14 }}
      >
        {/* 输入行 */}
        <div className="row gap-3" style={{ marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            <input
              className="inp"
              style={{ paddingLeft: 34, width: '100%' }}
              placeholder="输入姓名 / 机构 / 证件号…（示例：ZHANG W.）"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ minWidth: 88 }}
            onClick={handleSearch}
            disabled={!query.trim() || searchState === 'searching'}
          >
            {searchState === 'searching' ? (
              <span className="row gap-2"><span className="live-pulse" />筛查中</span>
            ) : (
              <span className="row gap-2"><Search size={13} />开始筛查</span>
            )}
          </button>
        </div>

        {/* 候选结果表 */}
        {searchState === 'done' && (
          <DataTable<ScreeningHit>
            cols={hitCols}
            rows={hits}
            rowKey={h => h.id}
            defaultSort={{ key: 'similarity', dir: 'desc' }}
            rowClass={h => h.similarity >= 0.85 ? 'dec-row dec-block' : h.similarity >= 0.7 ? 'dec-row dec-review' : 'dec-row'}
            empty={{ title: '无匹配候选', desc: '调整筛查主体名称重试', icon: <ListFilter size={34} /> }}
          />
        )}

        {searchState === 'idle' && (
          <div className="t-small text-3" style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-3)' }}>
            输入主体名称后点击「开始筛查」，与 OFAC / EU / UN / PEP / 央行反洗钱五大名单实时比对
          </div>
        )}
      </Panel>

      {/* ═══ 中区：相似度分布直方图 ═══ */}
      <Panel
        title="相似度分布直方图"
        icon={<BarChart2 size={13} />}
        right={
          <span className="t-small text-3">
            阈值线 <span className="mononum" style={{ color: 'var(--gold)' }}>0.85</span> 以上自动转复核 · 红 = 命中 · 琥珀 = 疑似 · 灰 = 排除
          </span>
        }
        style={{ marginBottom: 14 }}
      >
        <div className="t-small text-3" style={{ marginBottom: 8, lineHeight: 1.5 }}>
          本月批量筛查候选命中相似度分桶分布（共 <span className="mononum">{HIST_BUCKETS.reduce((s, b) => s + b.count, 0)}</span> 条候选）。
          相似度分桶越靠右，命中确信度越高；0.85 阈值以上须经人工复核方可排除。
        </div>
        <Chart build={buildHistChart} height={260} deps={[]} />

        {/* 阈值说明行 */}
        <div className="row gap-6 wrap" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
          <ThresholdKv label="自动命中阈值" value="≥ 0.90" color="var(--danger)" desc="直接标记命中，转人工复核" />
          <ThresholdKv label="疑似阈值" value="0.70 – 0.90" color="var(--warning)" desc="系统标记疑似，建议复核" />
          <ThresholdKv label="排除阈值" value="< 0.70" color="var(--text-3)" desc="自动排除，存档备查" />
          <ThresholdKv label="名单更新频率" value="T+0 实时" color="var(--success)" desc="五大名单体系同步更新" />
        </div>
      </Panel>

      {/* ═══ 下区：批量任务表 ═══ */}
      <Panel
        title="批量筛查任务"
        icon={<Layers size={13} />}
        right={
          <div className="row gap-3">
            <span className="t-small text-3 mononum">{taskRows.length} 个任务</span>
            <Segmented<TaskTab>
              value={taskTab}
              onChange={setTaskTab}
              options={[
                { value: 'all', label: '全部' },
                { value: '进行中', label: '进行中' },
                { value: '已完成', label: '已完成' },
              ]}
            />
          </div>
        }
        bodyClass="panel-body-0"
      >
        <DataTable<ScreeningTask>
          cols={taskCols}
          rows={taskRows}
          rowKey={t => t.id}
          defaultSort={{ key: 'hits', dir: 'desc' }}
          empty={{ title: '暂无批量任务', desc: '该状态下无任务记录', icon: <ClipboardList size={34} /> }}
        />
      </Panel>
    </div>
  );
}

// ─── 小组件 ─────────────────────────────────────────────────────────────────
function ThresholdKv({ label, value, color, desc }: { label: string; value: string; color: string; desc: string }) {
  return (
    <div className="col gap-1">
      <span className="label">{label}</span>
      <span className="mononum" style={{ fontSize: 15, fontWeight: 700, color, letterSpacing: '-0.01em' }}>{value}</span>
      <span className="t-small text-3">{desc}</span>
    </div>
  );
}
