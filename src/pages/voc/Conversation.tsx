import { useMemo, useState } from 'react';
import {
  Mic, Store as StoreIcon, UserRound, Clock, Smile, Meh, Frown,
  Swords, AlertTriangle, Handshake, ArrowRightCircle, Radio,
  Trophy, Percent, MessageSquareQuote, Target, ChevronRight, Sparkles,
} from 'lucide-react';
import { Card, PageHeader, StatCard, SectionTitle, Badge, EmptyState } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM, BRAND_COLORS } from '../../lib/chartTheme';
import { VOC_TRANSCRIPTS } from '../../lib/mockData';
import type { Sentiment, VocTranscript } from '../../types';

// ─── Sentiment design tokens (semantic, all 3 themes) ────────────────────────
const SENTIMENT_VAR: Record<Sentiment, string> = {
  positive: 'var(--success)', neutral: 'var(--text-3)', negative: 'var(--danger)',
};
const SENTIMENT_LABEL: Record<Sentiment, string> = { positive: '正面', neutral: '中性', negative: '负面' };
const SENTIMENT_ICON: Record<Sentiment, React.ReactNode> = {
  positive: <Smile size={12} />, neutral: <Meh size={12} />, negative: <Frown size={12} />,
};

// ─── Extracted conversation intelligence (derived locally per transcript) ─────
// Raw VOC transcripts → 赢单线索. Each insight is keyed to a transcript id.
type Moment = { at: string; kind: 'competitor' | 'objection' | 'commitment' | 'next' | 'open'; text: string };
interface Insight {
  talkRatio: number;          // advisor talk-time share (%) — lower-is-better band 40–55
  competitors: string[];      // brands mentioned by the customer
  objections: string[];       // objection categories raised (价格/续航/智驾/交付…)
  commitments: string[];      // promises the advisor made
  nextSteps: string[];        // agreed next actions
  winScore: number;           // composite 赢单指数 0–100
  moments: Moment[];          // 关键时刻 timeline
}

const INSIGHTS: Record<string, Insight> = {
  t1: {
    talkRatio: 47, competitors: ['问界', '蔚来'], objections: ['价格', '交付'],
    commitments: ['赠送 5,000 元充电权益', '锁定本月交付排产'],
    nextSteps: ['推送 L9 权益包对比表', '48h 内回访促订'],
    winScore: 86,
    moments: [
      { at: '01:12', kind: 'open', text: '客户主动询问三排空间与儿童座椅固定方式' },
      { at: '04:38', kind: 'competitor', text: '提及正在对比问界 M9，关注智驾差异' },
      { at: '07:55', kind: 'objection', text: '对落地价偏高有迟疑，担心权益缩水' },
      { at: '11:20', kind: 'commitment', text: '顾问承诺赠送 5,000 元充电权益' },
      { at: '13:40', kind: 'next', text: '约定 48 小时内回访并出具权益对比表' },
    ],
  },
  t2: {
    talkRatio: 58, competitors: ['问界'], objections: ['智驾', '价格'],
    commitments: ['出具深圳补贴落地价方案'],
    nextSteps: ['发送深圳补贴政策原文', '补贴截止前促单'],
    winScore: 64,
    moments: [
      { at: '00:50', kind: 'competitor', text: '客户开场即对比问界 M7 的城市智驾表现' },
      { at: '03:22', kind: 'objection', text: '认为同配置下价格无明显优势' },
      { at: '05:40', kind: 'commitment', text: '顾问承诺核算深圳补贴后落地价' },
      { at: '08:30', kind: 'next', text: '约定补贴截止前给出最终方案' },
    ],
  },
  t3: {
    talkRatio: 63, competitors: ['蔚来'], objections: ['交付', '服务'],
    commitments: ['销售主管 24h 内致电', '提供书面交付时间'],
    nextSteps: ['升级至门店主管跟进', '安抚情绪+交付确认函'],
    winScore: 41,
    moments: [
      { at: '02:10', kind: 'objection', text: '客户对交付延期一个多月强烈不满' },
      { at: '06:45', kind: 'competitor', text: '提及蔚来交付更快，考虑改单' },
      { at: '10:30', kind: 'open', text: '情绪偏激，要求明确交付承诺' },
      { at: '14:55', kind: 'commitment', text: '顾问承诺主管 24h 内致电安抚' },
      { at: '17:20', kind: 'next', text: '约定提供书面交付时间确认函' },
    ],
  },
  t4: {
    talkRatio: 44, competitors: ['小鹏', '比亚迪'], objections: ['车机', '价格'],
    commitments: ['现场演示车机 OTA 流畅度'],
    nextSteps: ['预约二次深度试驾', '发送 25-30 万配置对比'],
    winScore: 79,
    moments: [
      { at: '00:40', kind: 'open', text: '年轻家庭首购，预算 25-30 万' },
      { at: '03:15', kind: 'competitor', text: '对比小鹏 G6 与比亚迪宋的智能化' },
      { at: '06:05', kind: 'objection', text: '担心车机长期使用是否卡顿' },
      { at: '08:50', kind: 'commitment', text: '顾问现场演示车机 OTA 流畅度' },
      { at: '10:40', kind: 'next', text: '约定周末二次深度试驾' },
    ],
  },
};

const MOMENT_META: Record<Moment['kind'], { label: string; icon: React.ReactNode; color: string }> = {
  competitor: { label: '竞品提及', icon: <Swords size={12} />, color: 'var(--warning)' },
  objection: { label: '异议点', icon: <AlertTriangle size={12} />, color: 'var(--danger)' },
  commitment: { label: '承诺事项', icon: <Handshake size={12} />, color: 'var(--emerald)' },
  next: { label: '下一步', icon: <ArrowRightCircle size={12} />, color: 'var(--gold)' },
  open: { label: '需求挖掘', icon: <MessageSquareQuote size={12} />, color: 'var(--info)' },
};

// ─── Page-level derived analytics ────────────────────────────────────────────
function useConversationStats() {
  return useMemo(() => {
    const ins = VOC_TRANSCRIPTS.map(t => INSIGHTS[t.id]).filter(Boolean);
    const total = VOC_TRANSCRIPTS.length;
    const avgTalk = Math.round(ins.reduce((s, i) => s + i.talkRatio, 0) / ins.length);
    const withComp = ins.filter(i => i.competitors.length > 0).length;
    const compRate = Math.round((withComp / total) * 100);
    // 异议解决率 = 有承诺事项跟进的会话 / 有异议的会话
    const withObj = ins.filter(i => i.objections.length > 0);
    const resolved = withObj.filter(i => i.commitments.length > 0).length;
    const resolveRate = withObj.length ? Math.round((resolved / withObj.length) * 100) : 0;

    const compCounts: Record<string, number> = {};
    const objCounts: Record<string, number> = {};
    for (const i of ins) {
      for (const c of i.competitors) compCounts[c] = (compCounts[c] ?? 0) + 1;
      for (const o of i.objections) objCounts[o] = (objCounts[o] ?? 0) + 1;
    }
    return { total, avgTalk, compRate, resolveRate, compCounts, objCounts };
  }, []);
}

// ─── Charts ──────────────────────────────────────────────────────────────────
const competitorBar = (counts: Record<string, number>) => () => {
  const b = baseOption();
  const entries = Object.entries(counts).sort((a, z) => z[1] - a[1]);
  return {
    ...b,
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}　被提及 <b>${p[0].value}</b> 次` },
    grid: { left: 8, right: 14, top: 16, bottom: 6, containLabel: true },
    xAxis: { type: 'category', data: entries.map(e => e[0]), ...axisStyle(), splitLine: { show: false }, axisLabel: { ...axisStyle().axisLabel, interval: 0 } },
    yAxis: { type: 'value', ...axisStyle(), minInterval: 1 },
    series: [{
      type: 'bar', barWidth: '46%',
      data: entries.map(e => ({ value: e[1], itemStyle: { borderRadius: [5, 5, 0, 0], color: BRAND_COLORS[e[0]] ?? cssVar('--c3') } })),
      label: { show: true, position: 'top', formatter: '{c}', color: cssVar('--text-3'), fontSize: 11, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

const objectionBar = (counts: Record<string, number>) => () => {
  const b = baseOption();
  const entries = Object.entries(counts).sort((a, z) => a[1] - z[1]); // ascending → largest on top
  return {
    ...b,
    grid: { left: 8, right: 44, top: 8, bottom: 6, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}　出现 <b>${p[0].value}</b> 次` },
    xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: entries.map(e => e[0]), ...axisStyle(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...axisStyle().axisLabel, fontSize: 12, color: cssVar('--text-2') } },
    series: [{
      type: 'bar', barWidth: 13,
      data: entries.map(e => ({ value: e[1], itemStyle: { borderRadius: [0, 5, 5, 0], color: cssVar('--danger') } })),
      label: { show: true, position: 'right', formatter: '{c}', color: cssVar('--text-3'), fontSize: 11, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

// ─── Small components ─────────────────────────────────────────────────────────
function SentimentChip({ s }: { s: Sentiment }) {
  const c = SENTIMENT_VAR[s];
  return (
    <span className="chip" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}>
      {SENTIMENT_ICON[s]}{SENTIMENT_LABEL[s]}
    </span>
  );
}

function TalkRatioBar({ ratio }: { ratio: number }) {
  // 健康带：顾问 40–55%。偏高=讲太多，偏低=互动佳。
  const healthy = ratio >= 40 && ratio <= 55;
  const c = healthy ? 'var(--emerald)' : 'var(--warning)';
  return (
    <div className="col gap-1">
      <div className="spread t-small">
        <span className="row gap-1 text-3"><UserRound size={12} />顾问 <b className="tnum" style={{ color: 'var(--text-1)' }}>{ratio}%</b></span>
        <span className="row gap-1 text-3">客户 <b className="tnum" style={{ color: 'var(--text-1)' }}>{100 - ratio}%</b></span>
      </div>
      <div className="row" style={{ height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-3)' }}>
        <div style={{ width: `${ratio}%`, background: c, transition: 'width 0.8s var(--ease)' }} />
        <div style={{ flex: 1, background: 'color-mix(in srgb, var(--gold) 38%, transparent)' }} />
      </div>
      <span className="t-small text-3">{healthy ? '对话节奏健康 · 倾听到位' : ratio > 55 ? '顾问主导偏多 · 建议多倾听' : '客户主导 · 把握成交节奏'}</span>
    </div>
  );
}

function TagList({ items, meta }: { items: string[]; meta: { icon: React.ReactNode; color: string } }) {
  if (!items.length) return <span className="t-small text-3">—</span>;
  return (
    <div className="row gap-1 wrap">
      {items.map(x => (
        <span key={x} className="chip" style={{ background: `color-mix(in srgb, ${meta.color} 13%, transparent)`, color: meta.color, fontSize: 11, padding: '2px 9px' }}>
          {meta.icon}{x}
        </span>
      ))}
    </div>
  );
}

function TranscriptRow({ t, active, onClick }: { t: VocTranscript; active: boolean; onClick: () => void }) {
  const ins = INSIGHTS[t.id];
  const c = SENTIMENT_VAR[t.sentiment];
  return (
    <button
      onClick={onClick}
      className="row gap-3"
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', alignItems: 'flex-start',
        padding: '13px 14px', borderRadius: 'var(--r-md)',
        background: active ? 'var(--surface-2)' : 'transparent',
        border: `1px solid ${active ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
        borderLeft: `3px solid ${c}`,
        transition: 'all var(--dur-base) var(--ease)',
      }}
    >
      <span className="avatar" style={{ width: 34, height: 34, fontSize: 13, marginTop: 1 }}><Mic size={15} /></span>
      <div className="flex-1">
        <div className="row gap-2 wrap" style={{ marginBottom: 4 }}>
          <span className="row gap-1" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
            <StoreIcon size={12} style={{ color: 'var(--text-3)' }} />{t.store}
          </span>
          <span className="tag">{t.model}</span>
        </div>
        <div className="row gap-3 wrap t-small text-3" style={{ marginBottom: 8 }}>
          <span className="row gap-1"><UserRound size={11} />{t.advisor}</span>
          <span className="row gap-1 mono tnum"><Clock size={11} />{t.duration}</span>
          <span className="row gap-1 tnum"><UserRound size={11} />talk {ins.talkRatio}%</span>
        </div>
        <div className="row gap-1 wrap">
          {ins.competitors.length > 0 && (
            <span className="chip" style={{ background: 'color-mix(in srgb, var(--warning) 13%, transparent)', color: 'var(--warning)', fontSize: 11, padding: '2px 8px' }}>
              <Swords size={11} />竞品 {ins.competitors.length}
            </span>
          )}
          {ins.objections.length > 0 && (
            <span className="chip" style={{ background: 'color-mix(in srgb, var(--danger) 13%, transparent)', color: 'var(--danger)', fontSize: 11, padding: '2px 8px' }}>
              <AlertTriangle size={11} />异议 {ins.objections.length}
            </span>
          )}
          {ins.commitments.length > 0 && (
            <span className="chip" style={{ background: 'color-mix(in srgb, var(--emerald) 13%, transparent)', color: 'var(--emerald)', fontSize: 11, padding: '2px 8px' }}>
              <Handshake size={11} />承诺 {ins.commitments.length}
            </span>
          )}
        </div>
      </div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <SentimentChip s={t.sentiment} />
        <span className="row gap-1 tnum" style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
          <Trophy size={11} />{ins.winScore}
        </span>
        <ChevronRight size={15} style={{ color: active ? 'var(--gold)' : 'var(--text-3)', transition: 'color var(--dur-base) var(--ease)' }} />
      </div>
    </button>
  );
}

function PointBlock({ icon, color, title, items }: { icon: React.ReactNode; color: string; title: string; items: string[] }) {
  return (
    <div className="col gap-2" style={{ padding: 13, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
      <span className="row gap-1 label" style={{ color }}>{icon}{title}</span>
      {items.length ? (
        <ul className="col gap-1" style={{ listStyle: 'none' }}>
          {items.map(x => (
            <li key={x} className="row gap-2 t-small" style={{ color: 'var(--text-2)', alignItems: 'flex-start', lineHeight: 1.5 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, marginTop: 7, flexShrink: 0 }} />{x}
            </li>
          ))}
        </ul>
      ) : <span className="t-small text-3">本次会话未涉及</span>}
    </div>
  );
}

function DetailPanel({ t }: { t: VocTranscript }) {
  const ins = INSIGHTS[t.id];
  return (
    <div className="col gap-4 fade-in" key={t.id}>
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-1">
          <span className="row gap-2" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
            <Mic size={15} style={{ color: 'var(--gold)' }} />{t.store}
          </span>
          <span className="row gap-2 t-small text-3">
            <span className="row gap-1"><UserRound size={12} />{t.advisor}</span><span>·</span>
            <span>{t.customer}</span><span>·</span>
            <span className="mono tnum">{t.duration}</span>
          </span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 6 }}>
          <span className="row gap-1 tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
            <Trophy size={13} />赢单指数 {ins.winScore}
          </span>
          <SentimentChip s={t.sentiment} />
        </div>
      </div>

      <div className="col gap-2" style={{ padding: 13, borderRadius: 'var(--r-md)', background: 'var(--gold-glow)', border: '1px solid var(--hairline)' }}>
        <span className="row gap-1 label" style={{ color: 'var(--gold)' }}><Sparkles size={12} />AI 摘要</span>
        <p className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.65 }}>{t.summary}</p>
      </div>

      <div className="col gap-2">
        <span className="label">talk-ratio · 对话占比</span>
        <TalkRatioBar ratio={ins.talkRatio} />
      </div>

      <div>
        <span className="label" style={{ display: 'block', marginBottom: 12 }}>关键时刻 · timeline</span>
        <div className="col" style={{ position: 'relative', paddingLeft: 22 }}>
          <span style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 2, background: 'var(--hairline)' }} />
          {ins.moments.map((m, i) => {
            const meta = MOMENT_META[m.kind];
            return (
              <div key={i} className={`row gap-3 reveal reveal-${Math.min(i + 1, 6)}`} style={{ position: 'relative', paddingBottom: i === ins.moments.length - 1 ? 0 : 14, alignItems: 'flex-start' }}>
                <span style={{ position: 'absolute', left: -22, top: 2, width: 12, height: 12, borderRadius: '50%', background: 'var(--bg-base)', border: `2px solid ${meta.color}`, boxShadow: `0 0 0 3px color-mix(in srgb, ${meta.color} 18%, transparent)` }} />
                <span className="mono tnum t-small" style={{ color: 'var(--text-3)', minWidth: 42, paddingTop: 1 }}>{m.at}</span>
                <div className="flex-1">
                  <span className="row gap-1" style={{ fontSize: 11, fontWeight: 600, color: meta.color, marginBottom: 2 }}>{meta.icon}{meta.label}</span>
                  <span className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>{m.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <span className="label" style={{ display: 'block', marginBottom: 10 }}>提取要点</span>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <PointBlock icon={<Swords size={12} />} color="var(--warning)" title="竞品对比" items={ins.competitors} />
          <PointBlock icon={<AlertTriangle size={12} />} color="var(--danger)" title="异议点" items={ins.objections} />
          <PointBlock icon={<Handshake size={12} />} color="var(--emerald)" title="承诺事项" items={ins.commitments} />
          <PointBlock icon={<ArrowRightCircle size={12} />} color="var(--gold)" title="下一步" items={ins.nextSteps} />
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Conversation() {
  const stats = useConversationStats();
  const [activeId, setActiveId] = useState<string>(VOC_TRANSCRIPTS[0]?.id ?? '');
  const active = VOC_TRANSCRIPTS.find(t => t.id === activeId) ?? null;

  return (
    <div className="page">
      <PageHeader
        title="试驾会话智能"
        subtitle="试驾录音 ASR 转写 → 竞品提及 / 异议 / 承诺 / talk-ratio 抽取，把对话变成赢单线索"
        actions={
          <span className="row gap-2 t-small text-3" style={{ letterSpacing: '0.03em' }}>
            <span className="dot-pulse" style={{ background: 'var(--emerald)' }} />
            会话引擎实时分析 · 仅内部可见
          </span>
        }
      />

      {/* KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(186px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="已分析录音" raw={stats.total} unit="段" icon={<Mic size={16} />} delayClass="reveal-1" />
        <StatCard label="平均 talk-ratio" raw={stats.avgTalk} unit="%" icon={<Percent size={16} />} delayClass="reveal-2" />
        <StatCard label="竞品提及率" raw={stats.compRate} unit="%" icon={<Swords size={16} />} delayClass="reveal-3" />
        <StatCard label="异议解决率" raw={stats.resolveRate} unit="%" icon={<Target size={16} />} delayClass="reveal-4" />
      </div>

      {/* Charts */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
        <Card className="reveal reveal-1">
          <SectionTitle right={<Badge color="var(--warning)">{Object.keys(stats.compCounts).length} 个品牌</Badge>}>竞品提及分布</SectionTitle>
          <Chart build={competitorBar(stats.compCounts)} height={232} />
        </Card>
        <Card className="reveal reveal-2">
          <SectionTitle right={<Badge color="var(--danger)">{Object.keys(stats.objCounts).length} 类</Badge>}>高频异议类型分布</SectionTitle>
          <Chart build={objectionBar(stats.objCounts)} height={232} />
        </Card>
      </div>

      {/* List + Detail */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.15fr', alignItems: 'start' }}>
        <Card className="reveal reveal-3">
          <SectionTitle right={<span className="tnum text-3 t-small">{VOC_TRANSCRIPTS.length} 段</span>}>录音转写列表</SectionTitle>
          <div className="col gap-2">
            {VOC_TRANSCRIPTS.map(t => (
              <TranscriptRow key={t.id} t={t} active={t.id === activeId} onClick={() => setActiveId(t.id)} />
            ))}
            <div className="row gap-2" style={{ color: 'var(--text-3)', fontSize: 11, paddingTop: 2 }}>
              <Radio size={12} /> 点击任意会话查看关键时刻与赢单线索抽取
            </div>
          </div>
        </Card>

        <Card className="reveal reveal-4">
          {active ? <DetailPanel t={active} /> : (
            <EmptyState icon={<Mic size={34} />} title="选择一段会话" desc="左侧点击录音转写以查看深度抽取" />
          )}
        </Card>
      </div>
    </div>
  );
}
