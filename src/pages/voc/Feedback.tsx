import { useMemo, useState } from 'react';
import {
  Maximize2, BrainCircuit, BatteryCharging, MonitorSmartphone, Truck, Tag,
  Smile, Frown, MessageSquare, Ticket, ArrowRightCircle, CheckCircle2,
  CircleDot, Loader, UserRound, Plus, Inbox, GitPullRequestArrow, Layers,
} from 'lucide-react';
import { Card, PageHeader, StatCard, SectionTitle, Badge, Sparkline, EmptyState } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { VOC_POSTS, VOC_TOPICS } from '../../lib/mockData';
import type { Sentiment } from '../../types';

// ─── Product dimensions — map raw VOC topics → 产品线归类 (derived locally) ────
interface Dimension {
  key: string; label: string; icon: React.ReactNode; owner: string;
  topics: string[];     // VOC_TOPICS.topic values rolled up into this dimension
  models: string[];     // VocPost.model values routed here
  spark: number[];      // 7-day mention trend (derived shape)
}
const DIMENSIONS: Dimension[] = [
  { key: 'space', label: '空间', icon: <Maximize2 size={15} />, owner: '产品·整车架构线', topics: ['空间/家用'], models: [], spark: [38, 42, 40, 47, 52, 49, 56] },
  { key: 'adas', label: '智驾', icon: <BrainCircuit size={15} />, owner: '产品·智能驾驶线', topics: ['智能驾驶'], models: [], spark: [30, 33, 41, 38, 44, 47, 51] },
  { key: 'energy', label: '能耗', icon: <BatteryCharging size={15} />, owner: '产品·动力增程线', topics: ['能耗/续航', '保值率'], models: [], spark: [44, 41, 38, 36, 33, 31, 29] },
  { key: 'hmi', label: '车机', icon: <MonitorSmartphone size={15} />, owner: '产品·智能座舱线', topics: ['车机/系统'], models: [], spark: [18, 22, 25, 24, 28, 31, 34] },
  { key: 'delivery', label: '交付', icon: <Truck size={15} />, owner: '运营·交付履约线', topics: ['交付/服务'], models: [], spark: [20, 24, 28, 31, 30, 33, 36] },
  { key: 'price', label: '价格', icon: <Tag size={15} />, owner: '商务·定价权益线', topics: ['性价比', '操控/底盘'], models: [], spark: [26, 28, 27, 30, 32, 31, 33] },
];

// ─── Sentiment tokens (semantic) ─────────────────────────────────────────────
const SENT_VAR: Record<Sentiment, string> = { positive: 'var(--success)', neutral: 'var(--text-3)', negative: 'var(--danger)' };

// ─── Aggregate pain-points by 产品维度 ────────────────────────────────────────
interface PainPoint extends Dimension {
  mentions: number;
  posPct: number; neuPct: number; negPct: number;
  relatedPosts: number;
}
function usePainPoints() {
  return useMemo<PainPoint[]>(() => {
    return DIMENSIONS.map(dim => {
      const topics = VOC_TOPICS.filter(t => dim.topics.includes(t.topic));
      const mentions = topics.reduce((s, t) => s + t.count, 0);
      const posts = VOC_POSTS.filter(p => dim.topics.includes(p.topic));
      const counts: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 };
      for (const p of posts) counts[p.sentiment] += 1;
      const totalP = posts.length || 1;
      const pct = (n: number) => Math.round((n / totalP) * 100);
      return {
        ...dim, mentions, relatedPosts: posts.length,
        posPct: pct(counts.positive), neuPct: pct(counts.neutral), negPct: pct(counts.negative),
      };
    }).sort((a, z) => z.mentions - a.mentions);
  }, []);
}

// ─── Ticket board (VOC → 产品工单闭环) ────────────────────────────────────────
type TicketStatus = 'todo' | 'doing' | 'done';
interface FeedbackTicket {
  id: string; dimension: string; title: string; owner: string;
  status: TicketStatus; mentions: number; sentiment: Sentiment;
}
const STATUS_FLOW: TicketStatus[] = ['todo', 'doing', 'done'];
const STATUS_META: Record<TicketStatus, { label: string; icon: React.ReactNode; color: string }> = {
  todo: { label: '待处理', icon: <CircleDot size={13} />, color: 'var(--warning)' },
  doing: { label: '处理中', icon: <Loader size={13} />, color: 'var(--info)' },
  done: { label: '已闭环', icon: <CheckCircle2 size={13} />, color: 'var(--emerald)' },
};
const STATUS_NEXT_LABEL: Record<TicketStatus, string | null> = { todo: '开始处理', doing: '标记闭环', done: null };

// Seed tickets already routed from earlier VOC cycles (mock).
const SEED_TICKETS: FeedbackTicket[] = [
  { id: 'fb-001', dimension: '车机', title: '车机导航重规划延迟，OTA 优化系统流畅度', owner: '产品·智能座舱线', status: 'doing', mentions: 520, sentiment: 'negative' },
  { id: 'fb-002', dimension: '交付', title: 'L8 交付延期投诉，建立交付预期管理 SOP', owner: '运营·交付履约线', status: 'doing', mentions: 740, sentiment: 'negative' },
  { id: 'fb-003', dimension: '能耗', title: '增程高速馈电油耗偏高，话术与参数透明化', owner: '产品·动力增程线', status: 'done', mentions: 1180, sentiment: 'neutral' },
  { id: 'fb-004', dimension: '智驾', title: '城市 NOA 体验对标问界，整理迭代路线', owner: '产品·智能驾驶线', status: 'todo', mentions: 1340, sentiment: 'neutral' },
];

// ─── Chart · 痛点维度分布 ─────────────────────────────────────────────────────
const dimensionBar = (points: PainPoint[]) => () => {
  const b = baseOption();
  const d = [...points].sort((a, z) => a.mentions - z.mentions); // ascending → largest on top
  return {
    ...b,
    grid: { left: 8, right: 56, top: 8, bottom: 6, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}　提及 <b>${p[0].value.toLocaleString()}</b>` },
    xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: d.map(x => x.label), ...axisStyle(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...axisStyle().axisLabel, fontSize: 12, color: cssVar('--text-2') } },
    series: [{
      type: 'bar', barWidth: 14,
      data: d.map(x => ({
        value: x.mentions,
        itemStyle: { borderRadius: [0, 5, 5, 0], color: x.negPct >= 50 ? cssVar('--danger') : x.posPct >= 50 ? cssVar('--success') : cssVar('--gold') },
      })),
      label: { show: true, position: 'right', formatter: (p: { value: number }) => p.value.toLocaleString(), color: cssVar('--text-3'), fontSize: 11, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

// ─── Small components ─────────────────────────────────────────────────────────
function SentimentSplit({ pos, neu, neg }: { pos: number; neu: number; neg: number }) {
  const seg = (w: number, c: string) => w > 0 ? <div style={{ width: `${w}%`, background: c, transition: 'width 0.8s var(--ease)' }} /> : null;
  return (
    <div className="col gap-1">
      <div className="row" style={{ height: 7, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-3)' }}>
        {seg(pos, 'var(--success)')}{seg(neu, 'var(--text-3)')}{seg(neg, 'var(--danger)')}
      </div>
      <div className="row gap-3 t-small text-3">
        <span className="row gap-1 tnum"><Smile size={11} style={{ color: 'var(--success)' }} />{pos}%</span>
        <span className="row gap-1 tnum"><Frown size={11} style={{ color: 'var(--danger)' }} />{neg}%</span>
      </div>
    </div>
  );
}

function PainCard({ p, routed, onRoute, delayClass }: {
  p: PainPoint; routed: boolean; onRoute: () => void; delayClass: string;
}) {
  const accent = p.negPct >= 50 ? 'var(--danger)' : p.posPct >= 50 ? 'var(--success)' : 'var(--gold)';
  return (
    <div className={`card card-hover reveal ${delayClass}`} style={{ padding: 16 }}>
      <div className="stripe-top" style={{ background: accent }} />
      <div className="spread" style={{ marginBottom: 12 }}>
        <div className="row gap-2">
          <span className="avatar" style={{ width: 34, height: 34, background: 'var(--surface-3)', color: accent }}>{p.icon}</span>
          <div className="col">
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{p.label}</span>
            <span className="row gap-1 t-small text-3"><Layers size={11} />{p.owner}</span>
          </div>
        </div>
        <Sparkline data={p.spark} color={p.negPct >= 50 ? 'var(--danger)' : 'var(--emerald)'} width={74} height={28} />
      </div>

      <div className="row spread" style={{ marginBottom: 12 }}>
        <div className="col">
          <span className="kpi-value" style={{ fontSize: 24 }}>{p.mentions.toLocaleString()}</span>
          <span className="label" style={{ marginTop: 2 }}>提及量</span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end' }}>
          <span className="row gap-1 tnum" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}><MessageSquare size={13} style={{ color: 'var(--text-3)' }} />{p.relatedPosts}</span>
          <span className="label" style={{ marginTop: 2 }}>关联帖子</span>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <SentimentSplit pos={p.posPct} neu={p.neuPct} neg={p.negPct} />
      </div>

      <button
        className={`btn ${routed ? 'btn-subtle' : 'btn-primary'}`}
        onClick={onRoute}
        disabled={routed}
        style={{ width: '100%' }}
      >
        {routed ? <><CheckCircle2 size={14} />已转工单</> : <><GitPullRequestArrow size={14} />转产品工单</>}
      </button>
    </div>
  );
}

function TicketCard({ t, onAdvance, delayClass }: { t: FeedbackTicket; onAdvance: () => void; delayClass: string }) {
  const c = STATUS_META[t.status].color;
  const nextLabel = STATUS_NEXT_LABEL[t.status];
  return (
    <div className={`reveal ${delayClass}`} style={{ padding: 12, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderLeft: `3px solid ${SENT_VAR[t.sentiment]}` }}>
      <div className="row gap-2" style={{ marginBottom: 8 }}>
        <span className="tag mono" style={{ color: 'var(--text-3)' }}>{t.id}</span>
        <span className="tag" style={{ marginLeft: 'auto' }}>{t.dimension}</span>
      </div>
      <p className="t-small" style={{ color: 'var(--text-1)', fontWeight: 600, lineHeight: 1.5, marginBottom: 10 }}>{t.title}</p>
      <div className="spread">
        <span className="row gap-1 t-small text-3"><UserRound size={11} />{t.owner}</span>
        <span className="row gap-1 tnum t-small text-3"><MessageSquare size={11} />{t.mentions.toLocaleString()}</span>
      </div>
      {nextLabel && (
        <button className="btn btn-ghost btn-sm" onClick={onAdvance} style={{ width: '100%', marginTop: 10, color: c, borderColor: 'var(--hairline)' }}>
          <ArrowRightCircle size={13} />{nextLabel}
        </button>
      )}
    </div>
  );
}

function BoardColumn({ status, tickets, onAdvance }: { status: TicketStatus; tickets: FeedbackTicket[]; onAdvance: (id: string) => void }) {
  const meta = STATUS_META[status];
  return (
    <div className="col gap-3" style={{ padding: 12, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)', minHeight: 180 }}>
      <div className="spread">
        <span className="row gap-2" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
          <span style={{ color: meta.color }}>{meta.icon}</span>{meta.label}
        </span>
        <Badge color={meta.color}>{tickets.length}</Badge>
      </div>
      <div className="col gap-2">
        {tickets.length ? (
          tickets.map((t, i) => <TicketCard key={t.id} t={t} onAdvance={() => onAdvance(t.id)} delayClass={`reveal-${Math.min(i + 1, 6)}`} />)
        ) : (
          <div className="col" style={{ alignItems: 'center', padding: '24px 0', color: 'var(--text-3)', gap: 6 }}>
            <Inbox size={22} style={{ opacity: 0.4 }} />
            <span className="t-small">暂无工单</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Feedback() {
  const points = usePainPoints();
  const [tickets, setTickets] = useState<FeedbackTicket[]>(SEED_TICKETS);
  const [routed, setRouted] = useState<Set<string>>(new Set());

  const routeToTicket = (p: PainPoint) => {
    if (routed.has(p.key)) return;
    const ticket: FeedbackTicket = {
      id: `fb-${String(tickets.length + 1).padStart(3, '0')}`,
      dimension: p.label,
      title: `${p.label}维度舆情痛点 · ${p.mentions.toLocaleString()} 次提及待产品跟进`,
      owner: p.owner,
      status: 'todo',
      mentions: p.mentions,
      sentiment: p.negPct >= 50 ? 'negative' : p.posPct >= 50 ? 'positive' : 'neutral',
    };
    setTickets(prev => [ticket, ...prev]);
    setRouted(prev => new Set(prev).add(p.key));
  };

  const advanceTicket = (id: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== id) return t;
      const idx = STATUS_FLOW.indexOf(t.status);
      const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
      return { ...t, status: next };
    }));
  };

  const closedRate = useMemo(() => {
    const done = tickets.filter(t => t.status === 'done').length;
    return tickets.length ? Math.round((done / tickets.length) * 100) : 0;
  }, [tickets]);

  const totalMentions = useMemo(() => points.reduce((s, p) => s + p.mentions, 0), [points]);
  const topPain = points[0];

  return (
    <div className="page">
      <PageHeader
        title="产品反馈闭环"
        subtitle="舆情痛点 → 产品线归类打标 → 工单闭环，让用户声音真正回流到产品迭代"
        actions={
          <span className="row gap-2 t-small text-3" style={{ letterSpacing: '0.03em' }}>
            <span className="dot-pulse" style={{ background: 'var(--emerald)' }} />
            反馈引擎实时归类 · 近 7 日
          </span>
        }
      />

      {/* KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(186px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="痛点提及总量" raw={totalMentions} unit="次" icon={<MessageSquare size={16} />} delayClass="reveal-1" />
        <StatCard label="产品维度" raw={points.length} unit="个" icon={<Layers size={16} />} delayClass="reveal-2" />
        <StatCard label="进行中工单" raw={tickets.filter(t => t.status !== 'done').length} unit="张" icon={<Ticket size={16} />} delayClass="reveal-3" />
        <StatCard label="工单闭环率" raw={closedRate} unit="%" icon={<CheckCircle2 size={16} />} delayClass="reveal-4" />
      </div>

      {/* Chart + headline pain */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr', marginBottom: 16 }}>
        <Card className="reveal reveal-1">
          <SectionTitle right={<Badge color="var(--gold)">{points.length} 维度</Badge>}>痛点维度分布 · 提及量</SectionTitle>
          <Chart build={dimensionBar(points)} height={236} />
        </Card>
        <Card className="reveal reveal-2">
          <SectionTitle>最高优先级痛点</SectionTitle>
          {topPain && (
            <div className="col gap-3">
              <div className="row gap-3">
                <span className="avatar" style={{ width: 44, height: 44, background: 'var(--surface-3)', color: 'var(--gold)' }}>{topPain.icon}</span>
                <div className="col">
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{topPain.label}</span>
                  <span className="row gap-1 t-small text-3"><Layers size={11} />{topPain.owner}</span>
                </div>
              </div>
              <div className="row spread" style={{ padding: '12px 0', borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}>
                <div className="col"><span className="kpi-value" style={{ fontSize: 22 }}>{topPain.mentions.toLocaleString()}</span><span className="label">提及量</span></div>
                <div className="col" style={{ alignItems: 'flex-end' }}><span className="kpi-value tnum" style={{ fontSize: 22 }}>{topPain.relatedPosts}</span><span className="label">关联帖子</span></div>
              </div>
              <SentimentSplit pos={topPain.posPct} neu={topPain.neuPct} neg={topPain.negPct} />
              <p className="t-small text-3" style={{ lineHeight: 1.6 }}>
                舆情声量最高的产品维度，建议优先归入产品迭代待办，闭环跟进。
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Pain-point cards */}
      <SectionTitle right={<span className="row gap-1 t-small text-3"><GitPullRequestArrow size={12} />点击「转产品工单」流入看板</span>}>
        痛点维度归类打标
      </SectionTitle>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(238px, 1fr))', gap: 14, marginBottom: 24 }}>
        {points.map((p, i) => (
          <PainCard key={p.key} p={p} routed={routed.has(p.key)} onRoute={() => routeToTicket(p)} delayClass={`reveal-${Math.min(i + 1, 6)}`} />
        ))}
      </div>

      {/* Ticket board */}
      <Card className="reveal reveal-5">
        <SectionTitle right={<span className="row gap-2 t-small text-3"><span className="row gap-1"><Ticket size={12} />{tickets.length} 张工单</span><span className="row gap-1"><Plus size={12} />转单即入待处理</span></span>}>
          产品工单看板 · VOC → 产品闭环
        </SectionTitle>
        {tickets.length ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {STATUS_FLOW.map(status => (
              <BoardColumn key={status} status={status} tickets={tickets.filter(t => t.status === status)} onAdvance={advanceTicket} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Ticket size={34} />} title="暂无工单" desc="从上方痛点卡片「转产品工单」开始闭环" />
        )}
      </Card>
    </div>
  );
}
