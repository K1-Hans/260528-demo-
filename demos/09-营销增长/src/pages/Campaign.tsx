import { useMemo, useState } from 'react';
import {
  CalendarRange, Sparkles, Target, Wallet, TrendingUp, ShieldAlert,
  CheckCircle2, XCircle, Clock, ChevronRight,
} from 'lucide-react';
import { PageHeader, StatCard, Segmented } from '../components/ui';
import { Panel, CampaignStatusChip, ChannelPill, RiskDot } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, trust, cssVar, areaGradient, DRAW } from '../lib/chartTheme';
import { CAMPAIGNS, CAMPAIGN_MONTHS, CAMPAIGN_KPIS, CHANNEL_MAP, GATE_ITEMS } from '../lib/mockData';
import type { Campaign, CampaignStatus } from '../types';

type StatusFilter = 'all' | CampaignStatus;
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' }, { value: 'live', label: '在投' },
  { value: 'review', label: '待审' }, { value: 'draft', label: '排期中' }, { value: 'done', label: '已结束' },
];
const KPI_ICONS = [<CalendarRange size={16} />, <Wallet size={16} />, <TrendingUp size={16} />, <Target size={16} />];

const PHASE_CLS: Record<string, string> = { pre: 'lane-seg-pre', main: 'lane-seg-main', post: 'lane-seg-post' };

export default function Campaign() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState('c2');

  const list = useMemo(() => CAMPAIGNS.filter(c => filter === 'all' || c.status === filter), [filter]);
  const selected = CAMPAIGNS.find(c => c.id === selectedId) ?? CAMPAIGNS[0];
  const pendingGates = GATE_ITEMS.filter(g => g.status === 'pending').length;

  return (
    <div className="page page-wide">
      <PageHeader
        title="排期编排台"
        subtitle="全年大促与活动排期一屏掌控 · 预热 / 正式 / 返场分段编排 · 实时进度与 ROAS"
        actions={<span className="tag tag-mono"><Sparkles size={12} style={{ marginRight: 4 }} />增长操盘</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {CAMPAIGN_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 332px', gap: 14, alignItems: 'start' }}>
        {/* 左：排期泳道（签名）+ 选中详情 */}
        <div className="col gap-4">
          <Panel
            title={<><CalendarRange size={13} />2026 年度营销排期</>}
            icon={null}
            right={<Segmented options={FILTERS} value={filter} onChange={setFilter} />}
            bodyClass="panel-body"
          >
            {/* 月份轴 */}
            <div className="row" style={{ marginBottom: 10, paddingLeft: 200 }}>
              <div className="lane-axis flex-1">
                {CAMPAIGN_MONTHS.map(m => <span key={m}>{m}</span>)}
              </div>
            </div>

            {/* 泳道 */}
            <div className="col gap-3">
              {list.map((c, i) => (
                <LaneRow key={c.id} c={c} active={c.id === selectedId} onSelect={() => setSelectedId(c.id)} delay={i} />
              ))}
              {list.length === 0 && <div className="t-small text-3" style={{ padding: '24px 0', textAlign: 'center' }}>该状态下暂无活动</div>}
            </div>

            {/* 图例 */}
            <div className="row gap-4 wrap" style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
              <LegendDot cls="lane-seg-pre" label="预热 / 蓄水" />
              <LegendDot cls="lane-seg-main" label="正式爆发" />
              <LegendDot cls="lane-seg-post" label="返场 / 复购" />
            </div>
          </Panel>

          <CampaignDetail c={selected} />
        </div>

        {/* 右：人审卡点队列（灵魂回扣：Agent 提效 + 关键卡点人审） */}
        <Panel
          title={<><ShieldAlert size={13} />人审卡点队列</>}
          right={<span className="tag" style={{ color: 'var(--warning)' }}>{pendingGates} 待处理</span>}
          style={{ position: 'sticky', top: 0 }}
        >
          <div className="t-small text-3" style={{ marginBottom: 12, lineHeight: 1.5 }}>
            Agent 全链路提效，但合规 / 预算 / 授权等关键决策保留人工卡点 —— 这是 AI 营销可信落地的成熟标志。
          </div>
          <div className="col gap-2">
            {GATE_ITEMS.map(g => <GateRow key={g.id} g={g} />)}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─── 泳道行（签名 · 时间轴上的活动条，分 phase 段）────────────────────────────
function LaneRow({ c, active, onSelect, delay }: { c: Campaign; active: boolean; onSelect: () => void; delay: number }) {
  const span = c.endCol - c.startCol;
  return (
    <div className={`row gap-3 reveal`} style={{ animationDelay: `${delay * 40}ms` }}>
      {/* 标签列 */}
      <button
        onClick={onSelect}
        className="col"
        style={{
          width: 188, flexShrink: 0, alignItems: 'flex-start', gap: 4, textAlign: 'left',
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        }}
      >
        <div className="row gap-2">
          <span style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--gold)' : 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 132 }}>{c.name.split(' · ')[0]}</span>
          <CampaignStatusChip status={c.status} showLabel={false} />
        </div>
        <span className="t-small text-3" style={{ fontSize: 11 }}>{c.brand} · {c.objective}</span>
      </button>

      {/* 轨道 */}
      <div className="lane-track flex-1" onClick={onSelect} style={{ cursor: 'pointer', boxShadow: active ? '0 0 0 1px var(--hairline-strong)' : undefined }}>
        <div className="lane-grid" />
        <div
          className="lane-bar"
          style={{ left: `${(c.startCol / 12) * 100}%`, width: `${(span / 12) * 100}%`, opacity: c.status === 'draft' ? 0.78 : 1 }}
        >
          {c.phases.map(p => {
            const w = ((p.endCol - p.startCol) / span) * 100;
            return (
              <div key={p.kind} className={`lane-seg ${PHASE_CLS[p.kind]}`} style={{ width: `${w}%` }} title={`${p.label}`}>
                {w > 16 ? p.label : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* 右侧 ROAS */}
      <div className="col" style={{ width: 64, flexShrink: 0, alignItems: 'flex-end' }}>
        <span className="mononum" style={{ fontSize: 14, fontWeight: 700, color: c.roas >= c.roasTarget ? 'var(--success)' : c.roas > 0 ? 'var(--warning)' : 'var(--text-3)' }}>
          {c.roas > 0 ? c.roas.toFixed(1) : '—'}
        </span>
        <span className="t-small text-3" style={{ fontSize: 10 }}>ROAS</span>
      </div>
    </div>
  );
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="row gap-2" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
      <span className={`lane-seg ${cls}`} style={{ width: 22, height: 12, borderRadius: 3 }} />{label}
    </span>
  );
}

// ─── 选中活动详情（ROAS 趋势 + 阶段 + 预算）────────────────────────────────────
function CampaignDetail({ c }: { c: Campaign }) {
  const planned = c.status === 'draft' || c.status === 'review';
  return (
    <Panel title={<><Target size={13} />{c.name}</>} right={<CampaignStatusChip status={c.status} />}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <Stat label="预算" value={`${c.budget} 万`} />
        <Stat label="已花费" value={planned ? '—' : `${c.spent.toFixed(1)} 万`} sub={planned ? '未开始' : `${Math.round((c.spent / c.budget) * 100)}% 预算`} />
        <Stat label="转化数" value={c.conv > 0 ? c.conv.toLocaleString() : '—'} />
      </div>

      {/* 预算消耗条 */}
      {!planned && (
        <div style={{ marginBottom: 16 }}>
          <div className="row spread" style={{ marginBottom: 6 }}>
            <span className="label">预算消耗 · 投放进度 {c.progress}%</span>
            <span className="t-small mononum text-2">{c.spent.toFixed(1)} / {c.budget} 万</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${c.progress}%`, background: 'linear-gradient(90deg, var(--gold-bright), var(--bronze))', borderRadius: 4, transition: 'width .8s var(--ease)' }} />
          </div>
        </div>
      )}

      {/* 渠道 */}
      <div className="row gap-2 wrap" style={{ marginBottom: 16 }}>
        <span className="label" style={{ marginRight: 2 }}>投放渠道</span>
        {c.channels.map(ch => <ChannelPill key={ch} channel={CHANNEL_MAP[ch]} sm />)}
      </div>

      {/* ROAS 趋势 */}
      <div className="label" style={{ marginBottom: 4 }}>{planned ? 'ROAS 目标预估' : 'ROAS 近 12 期趋势'}</div>
      <Chart
        height={150}
        deps={[c.id]}
        build={() => {
          const ax = axisStyle();
          const acc = accent();
          return {
            ...baseOption(),
            ...DRAW,
            backgroundColor: 'transparent',
            grid: { left: 8, right: 12, top: 18, bottom: 8, containLabel: true },
            xAxis: { type: 'category', data: c.trend.map((_, i) => `${i + 1}`), ...ax, axisLabel: { ...ax.axisLabel, show: false } },
            yAxis: { type: 'value', ...ax },
            series: [
              {
                type: 'line', smooth: true, data: c.trend, symbol: 'circle', symbolSize: 5,
                lineStyle: { width: 2, color: acc }, itemStyle: { color: acc },
                areaStyle: { color: areaGradient(acc, 0.22) },
                markLine: {
                  silent: true, symbol: 'none',
                  lineStyle: { color: trust(), type: 'dashed', width: 1.5 },
                  data: [{ yAxis: c.roasTarget, label: { formatter: `目标 ${c.roasTarget}`, color: cssVar('--text-3'), fontSize: 10, position: 'insideEndTop' } }],
                },
              },
            ],
          };
        }}
      />
    </Panel>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="metric-card" style={{ padding: '10px 12px' }}>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="mononum" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{value}</div>
      {sub && <div className="t-small text-3" style={{ fontSize: 10.5, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── 人审卡点行 ────────────────────────────────────────────────────────────────
const GATE_ICON = { pending: Clock, approved: CheckCircle2, blocked: XCircle };
const GATE_CLS: Record<string, string> = { pending: '', approved: 'gate-pass', blocked: 'gate-block' };
function GateRow({ g }: { g: typeof GATE_ITEMS[number] }) {
  const Icon = GATE_ICON[g.status];
  const color = g.status === 'approved' ? 'var(--success)' : g.status === 'blocked' ? 'var(--danger)' : 'var(--warning)';
  return (
    <div className={`gate-row ${GATE_CLS[g.status]}`}>
      <Icon size={16} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="row spread gap-2">
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
          <span className="t-small text-3" style={{ fontSize: 10, flexShrink: 0 }}>{g.at}</span>
        </div>
        <div className="row gap-2" style={{ marginTop: 3 }}>
          <span className="tag" style={{ fontSize: 10 }}>{g.kind}</span>
          <RiskDot risk={g.risk} />
        </div>
        <div className="t-small text-3" style={{ fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>{g.detail}</div>
        <div className="row gap-2" style={{ marginTop: 6 }}>
          <span className="t-small" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>触发：{g.agent}</span>
          {g.reviewer && <span className="t-small" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>· 复核：{g.reviewer}</span>}
        </div>
        {g.status === 'pending' && (
          <div className="row gap-2" style={{ marginTop: 8 }}>
            <button className="btn btn-ok btn-sm">通过</button>
            <button className="btn btn-danger btn-sm">驳回</button>
            <button className="btn btn-subtle btn-sm">详情 <ChevronRight size={12} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
