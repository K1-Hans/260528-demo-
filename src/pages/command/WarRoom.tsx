import { useRef, useState } from 'react';
import {
  Radio, Eye, AtSign, Pin, MousePointerClick,
  Send, Target, Truck, TrendingUp, Gauge,
} from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { METRICS, REGIONS, MODEL_PROGRESS, MOCK_USERS } from '../../lib/mockData';
import type { User } from '../../types';
import './WarRoom.css';

// ─── 在线协作者（本地从 MOCK_USERS 取活跃者）────────────────────────────────────
const ACTIVE = MOCK_USERS.filter(u => u.status === 'active');
interface Presence { user: User; viewing: string; color: string; }
const PRESENCE: Presence[] = [
  { user: ACTIVE[0], viewing: '指挥大屏', color: 'var(--gold)' },
  { user: ACTIVE[1], viewing: '车型完成率', color: 'var(--emerald)' },
  { user: ACTIVE[3], viewing: '区域表现', color: 'var(--info)' },
];

const initials = (name: string) => name.slice(0, 2);

// ─── KPI 墙（复用 METRICS，本地放大展示）───────────────────────────────────────
const ICONS: Record<string, React.ReactNode> = {
  本月订单: <Target size={15} />, 本月交付: <Truck size={15} />,
  '市占率(NEV)': <TrendingUp size={15} />, 商机线索: <Gauge size={15} />,
};
const WALL_METRICS = METRICS.filter(m => ICONS[m.label]);

// ─── 区域表现（柱+线，放大）───────────────────────────────────────────────────
const regionOption = () => {
  const b = baseOption();
  return {
    ...b,
    legend: { data: ['订单量', '完成率'], top: 0, right: 0, icon: 'roundRect', itemWidth: 11, itemHeight: 11, textStyle: { color: cssVar('--text-2'), fontSize: 13 } },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: REGIONS.map(r => r.region), ...axisStyle(), splitLine: { show: false }, axisLabel: { ...axisStyle().axisLabel, fontSize: 12 } },
    yAxis: [
      { type: 'value', ...axisStyle() },
      { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: cssVar('--text-3'), fontSize: 12 }, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
    ],
    series: [
      { name: '订单量', type: 'bar', barWidth: '48%', data: REGIONS.map(r => r.orders), itemStyle: { color: cssVar('--c3'), borderRadius: [5, 5, 0, 0] }, ...ANIM },
      { name: '完成率', type: 'line', yAxisIndex: 1, smooth: true, data: REGIONS.map(r => r.completion), lineStyle: { color: cssVar('--gold'), width: 2.5 }, itemStyle: { color: cssVar('--gold') }, symbol: 'circle', symbolSize: 7, ...ANIM },
    ],
  };
};

// ─── 车型完成率（条形，放大）───────────────────────────────────────────────────
const modelOption = () => {
  const b = baseOption();
  const d = MODEL_PROGRESS.map(m => ({ ...m, pct: Math.round((m.actual / m.target) * 100) })).reverse();
  return {
    ...b,
    grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}　完成率 <b>${p[0].value}%</b>` },
    xAxis: { type: 'value', max: 110, axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: d.map(x => x.model), ...axisStyle(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...axisStyle().axisLabel, fontSize: 13 } },
    series: [{
      type: 'bar', barWidth: 16,
      data: d.map(x => ({ value: x.pct, itemStyle: { color: x.color, borderRadius: [0, 5, 5, 0] } })),
      label: { show: true, position: 'right', formatter: '{c}%', color: cssVar('--text-2'), fontSize: 12, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

// ─── 批注/讨论（本地 useState）──────────────────────────────────────────────────
interface Comment {
  id: string; author: string; color: string; text: string;
  mention?: string; pin?: string; time: string;
}
const SEED_COMMENTS: Comment[] = [
  { id: 'c1', author: '张明远', color: 'var(--gold)', text: '华南 L7 完成率只有 78%，离月底还有缺口，这块今天要拍方案。', mention: '刘敏', pin: '区域表现', time: '09:32' },
  { id: 'c2', author: '刘敏', color: 'var(--emerald)', text: '收到，周末试驾邀约已经在加密，预计能补回 8 个点的转化。', mention: '张明远', time: '09:35' },
  { id: 'c3', author: '李晓雨', color: 'var(--info)', text: 'L9 对标问界 M9 的权益包初稿出来了，重点压家庭场景和优先交付。', pin: '车型完成率', time: '09:41' },
  { id: 'c4', author: '陈佳华', color: 'var(--c5)', text: '深圳 ¥12,000 补贴 6/30 截止，建议把华南收单节奏再往前提一周。', mention: '刘敏', pin: '本月订单', time: '09:48' },
];

const MENTION_POOL = ACTIVE.slice(0, 6).map(u => u.name);

export default function WarRoom() {
  const [comments, setComments] = useState<Comment[]>(SEED_COMMENTS);
  const [draft, setDraft] = useState('');
  const [mention, setMention] = useState('');
  const [pin, setPin] = useState('');
  const [annotate, setAnnotate] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const idSeq = useRef(SEED_COMMENTS.length);

  const addComment = () => {
    const text = draft.trim();
    if (!text) return;
    idSeq.current += 1;
    const next: Comment = {
      id: `c${idSeq.current}`,
      author: ACTIVE[0].name,
      color: 'var(--gold)',
      text,
      mention: mention || undefined,
      pin: pin || undefined,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
    setComments(prev => [...prev, next]);
    setDraft('');
    setMention('');
    setPin('');
    setShowMention(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addComment(); }
  };

  return (
    <div className={`page wr-page ${annotate ? 'is-annotate' : ''}`}>
      <PageHeader
        title="作战室"
        subtitle="2026年5月 · 大屏协作 · 实时在线 · 指标批注 · @ 提及讨论"
        actions={
          <div className="row gap-3">
            <Presence />
            <button
              className={`btn ${annotate ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setAnnotate(a => !a)}
              aria-pressed={annotate}
            >
              <MousePointerClick size={14} />{annotate ? '退出标注' : '标注模式'}
            </button>
          </div>
        }
      />

      <div className="grid gap-4 wr-layout" style={{ gridTemplateColumns: '1fr 348px', alignItems: 'start' }}>
        {/* ── LEFT · 大屏 ── */}
        <div className="col gap-4">
          {/* KPI 墙 */}
          <div className="grid wr-wall" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {WALL_METRICS.map((mt, i) => (
              <div key={mt.label} className={`card card-hover wr-kpi reveal reveal-${i + 1}`} data-annot={annotate || undefined}>
                {annotate && <span className="wr-annot-badge"><Pin size={11} />钉</span>}
                <div className="spread" style={{ marginBottom: 10 }}>
                  <span className="label">{mt.label}</span>
                  <span style={{ color: 'var(--gold)', opacity: 0.75 }}>{ICONS[mt.label]}</span>
                </div>
                <div className="wr-kpi-val tnum">{mt.value}<span className="wr-kpi-unit">{mt.unit}</span></div>
                <div className={`row gap-1 tnum t-small ${mt.change >= 0 ? 'trend-up' : 'trend-down'}`} style={{ marginTop: 8, fontWeight: 600 }}>
                  {mt.change >= 0 ? '+' : ''}{mt.change}%
                  <span className="text-3" style={{ fontWeight: 400, marginLeft: 2 }}>环比</span>
                </div>
              </div>
            ))}
          </div>

          {/* 大图表 */}
          <div className="grid gap-4 wr-charts" style={{ gridTemplateColumns: '1.45fr 1fr' }}>
            <Card className={`reveal reveal-3 wr-chart ${annotate ? 'is-annot' : ''}`}>
              <SectionTitle right={<span className="row gap-2 t-small text-3"><span className="dot-pulse" style={{ background: 'var(--emerald)' }} />实时</span>}>
                区域表现 · 订单量 vs 完成率
              </SectionTitle>
              <Chart build={regionOption} height={300} />
            </Card>
            <Card className={`reveal reveal-4 wr-chart ${annotate ? 'is-annot' : ''}`}>
              <SectionTitle right={<Badge color="var(--gold)">5 车型</Badge>}>车型目标完成率</SectionTitle>
              <Chart build={modelOption} height={300} />
            </Card>
          </div>

          <div className="row gap-2 wr-source" style={{ color: 'var(--text-3)', fontSize: 11 }}>
            <Radio size={12} /> 大屏数据实时同步自指标平台 · {PRESENCE.length} 人正在协作查看
          </div>
        </div>

        {/* ── RIGHT · 批注/讨论 ── */}
        <Card className="reveal reveal-2 wr-panel">
          <SectionTitle right={<Badge color="var(--gold)">{comments.length}</Badge>}>批注 / 讨论</SectionTitle>

          <div className="wr-comments">
            {comments.map(c => (
              <div key={c.id} className="wr-comment">
                <span className="avatar wr-avatar" style={{ background: `linear-gradient(135deg, ${c.color}, color-mix(in srgb, ${c.color} 55%, var(--bronze)))` }}>
                  {initials(c.author)}
                </span>
                <div className="flex-1">
                  <div className="row gap-2" style={{ marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{c.author}</span>
                    <span className="tnum t-small text-3">{c.time}</span>
                  </div>
                  <div className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>
                    {c.mention && <span className="wr-mention">@{c.mention}</span>}{c.text}
                  </div>
                  {c.pin && (
                    <span className="wr-pin"><Pin size={10} />钉到「{c.pin}」</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 输入区 */}
          <div className="wr-composer">
            {(mention || pin) && (
              <div className="row gap-2 wrap" style={{ marginBottom: 8 }}>
                {mention && <span className="wr-chip-active" onClick={() => setMention('')}><AtSign size={11} />{mention}</span>}
                {pin && <span className="wr-chip-active" onClick={() => setPin('')}><Pin size={11} />{pin}</span>}
              </div>
            )}
            <textarea
              className="input wr-input"
              placeholder="添加批注… ⌘+Enter 发送"
              value={draft}
              rows={2}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <div className="row spread" style={{ marginTop: 9 }}>
              <div className="row gap-2" style={{ position: 'relative' }}>
                <button className="btn btn-subtle btn-sm" onClick={() => setShowMention(s => !s)} aria-label="提及成员">
                  <AtSign size={13} />@ 提及
                </button>
                <button
                  className={`btn btn-sm ${pin ? 'btn-primary' : 'btn-subtle'}`}
                  onClick={() => setPin(pin ? '' : WALL_METRICS[0].label)}
                  aria-label="钉到指标"
                >
                  <Pin size={13} />钉到指标
                </button>
                {showMention && (
                  <div className="wr-mention-pop">
                    {MENTION_POOL.map(name => (
                      <button key={name} className="wr-mention-item" onClick={() => { setMention(name); setShowMention(false); }}>
                        <span className="avatar wr-avatar-sm">{initials(name)}</span>{name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn btn-primary btn-sm" onClick={addComment} disabled={!draft.trim()}>
                <Send size={13} />发送
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── 在线协作者 presence ────────────────────────────────────────────────────────
function Presence() {
  return (
    <div className="row gap-3 wr-presence">
      <div className="wr-avatars">
        {PRESENCE.map((p, i) => (
          <span
            key={p.user.id}
            className="avatar wr-presence-avatar"
            style={{ zIndex: PRESENCE.length - i, background: `linear-gradient(135deg, ${p.color}, color-mix(in srgb, ${p.color} 55%, var(--bronze)))` }}
            title={`${p.user.name} · 正在查看 ${p.viewing}`}
          >
            {initials(p.user.name)}
            <span className="wr-online-dot" />
          </span>
        ))}
      </div>
      <div className="col" style={{ gap: 2 }}>
        <span className="row gap-2 t-small" style={{ fontWeight: 600, color: 'var(--text-1)' }}>
          <span className="dot-pulse" style={{ background: 'var(--success)' }} />{PRESENCE.length} 人在线
        </span>
        <span className="row gap-1 t-small text-3" style={{ fontSize: 11 }}>
          <Eye size={11} />{PRESENCE[0].user.name} 正在查看 {PRESENCE[0].viewing}
        </span>
      </div>
    </div>
  );
}
