import { useMemo, useState } from 'react';
import {
  Filter, TrendingDown, ArrowRight, Lightbulb, Send, AlertTriangle,
  Target, ChevronRight, Activity, Layers,
} from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, Segmented, ProgressBar } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { FUNNEL } from '../../lib/mockData';

const fmt = (n: number) => n.toLocaleString('zh-CN');

// ─── Region / model filters (mock weighting on the shared funnel) ───────────────
const REGION_OPTS = [
  { value: 'all', label: '全国' },
  { value: 'east', label: '华东' },
  { value: 'south', label: '华南' },
  { value: 'north', label: '华北' },
] as const;
const MODEL_OPTS = [
  { value: 'all', label: '全车型' },
  { value: 'L9', label: 'L9' },
  { value: 'L8', label: 'L8' },
  { value: 'L7', label: 'L7' },
  { value: 'L6', label: 'L6' },
] as const;
type RegionKey = typeof REGION_OPTS[number]['value'];
type ModelKey = typeof MODEL_OPTS[number]['value'];

// scale factor per filter — keeps shape, shifts magnitude (all mock, deterministic)
const REGION_SCALE: Record<RegionKey, number> = { all: 1, east: 0.34, south: 0.18, north: 0.22 };
const MODEL_SCALE: Record<ModelKey, number> = { all: 1, L9: 0.28, L8: 0.24, L7: 0.18, L6: 0.3 };

// ─── Per-stage diagnostics (drop attribution + suggested actions, defined locally) ─
interface Reason { label: string; weight: number }
interface Suggestion { title: string; detail: string; impact: 'high' | 'mid' | 'low' }
interface StageDiag {
  /** stage this transition LANDS on, e.g. 有效留资 = 线索→有效留资 */
  stage: string;
  benchmark: number;  // 行业/历史基准转化率(%)，用于对比本环转化
  reasons: Reason[];
  suggestions: Suggestion[];
}

const DIAG: Record<string, StageDiag> = {
  有效留资: {
    stage: '有效留资', benchmark: 50,
    reasons: [
      { label: '落地页表单字段过多，填写流失', weight: 38 },
      { label: '投放人群与车型定位偏差', weight: 31 },
      { label: '留资后回访时效 > 4h，意向冷却', weight: 19 },
      { label: '活动钩子吸引泛流量，非真实购车意向', weight: 12 },
    ],
    suggestions: [
      { title: '表单瘦身 + 一键授权留资', detail: '将 7 字段精简至 3 字段，接入微信一键授权，预估留资率 +6pt', impact: 'high' },
      { title: '15 分钟首响 SLA', detail: '留资即触发企微自动分配 + 顾问 15 分钟内首电，趁热触达', impact: 'high' },
      { title: '投放人群包校准', detail: '按已成交画像反向优化投放标签，过滤泛流量', impact: 'mid' },
    ],
  },
  到店: {
    stage: '到店', benchmark: 66,
    reasons: [
      { label: '门店距离远 / 预约到店动线不顺', weight: 34 },
      { label: '邀约话术未给到店「钩子」(礼品/权益)', weight: 28 },
      { label: '竞品同步邀约，被截流到店', weight: 24 },
      { label: '周末档期排满，客户错失体验窗口', weight: 14 },
    ],
    suggestions: [
      { title: '到店权益钩子', detail: '到店即赠充电权益 / 周边礼，邀约话术统一前置权益，到店率 +5pt', impact: 'high' },
      { title: '上门试驾补位', detail: '远距离意向客户提供上门试驾，覆盖门店空白半径', impact: 'mid' },
      { title: '竞品截流预警', detail: '识别同时咨询竞品客户，优先排顾问跟进锁定', impact: 'mid' },
    ],
  },
  试驾: {
    stage: '试驾', benchmark: 70,
    reasons: [
      { label: '到店后等待试驾时长 > 20min，体验断点', weight: 33 },
      { label: '试驾车排期紧张 / 热门配置缺车', weight: 29 },
      { label: '顾问未主动引导深度试驾', weight: 23 },
      { label: '客户仅看展车，未进入试驾环节', weight: 15 },
    ],
    suggestions: [
      { title: '试驾车池调度优化', detail: '热门门店增配试驾车，缩短等待，到店试驾率 +7pt', impact: 'high' },
      { title: 'Deep Drive 标准动线', detail: '推行 20 分钟深度试驾 SOP，覆盖家庭场景与智驾体验', impact: 'high' },
      { title: '展厅到试驾衔接话术', detail: '顾问看展即邀试驾，减少「只看不试」流失', impact: 'mid' },
    ],
  },
  下定: {
    stage: '下定', benchmark: 75,
    reasons: [
      { label: '价格异议 / 落地价超预算', weight: 36 },
      { label: '竞品对比中，决策犹豫', weight: 28 },
      { label: '试驾体验未击中核心需求', weight: 21 },
      { label: '补贴政策未落地，等待观望', weight: 15 },
    ],
    suggestions: [
      { title: '落地价权益包临门一脚', detail: '组合补贴+充电桩+优先交付，给出明确落地价，下定率 +8pt', impact: 'high' },
      { title: '竞品对比话术武装', detail: '推送 L 系 vs 问界差异化卖点卡，顾问现场化解对比犹豫', impact: 'high' },
      { title: '补贴落地提醒', detail: '临期补贴客户专项跟进，制造决策紧迫感', impact: 'mid' },
    ],
  },
  交付: {
    stage: '交付', benchmark: 92,
    reasons: [
      { label: '交付排期延期，客户体验受损', weight: 41 },
      { label: '金融 / 上牌资料流转慢', weight: 27 },
      { label: '下定后犹豫期退订', weight: 19 },
      { label: '交付沟通断档，客户焦虑', weight: 13 },
    ],
    suggestions: [
      { title: '交付进度透明化', detail: '下定即推送交付时间轴 + 节点提醒，退订率 -3pt', impact: 'high' },
      { title: '金融上牌一站式代办', detail: '门店协助资料流转，压缩交付周期', impact: 'mid' },
      { title: '犹豫期主动安抚', detail: '下定 48h 内顾问回访，巩固决策信心', impact: 'mid' },
    ],
  },
};

const FIRST_STAGE = FUNNEL[0].stage;

const IMPACT = {
  high: { label: '高', color: 'var(--danger)' },
  mid: { label: '中', color: 'var(--warning)' },
  low: { label: '低', color: 'var(--text-3)' },
} as const;

// ─── Chart: diagnostic funnel (mirrors Overview, with selected-stage highlight) ──
const funnelOption = (values: { stage: string; value: number }[], selected: string, worst: string) => {
  const b = baseOption();
  const colors = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6'].map(cssVar);
  return {
    ...b,
    tooltip: { ...(b.tooltip as object), trigger: 'item', formatter: '{b}<br/><b>{c}</b> 人' },
    series: [{
      type: 'funnel', top: 10, bottom: 10, left: '8%', right: '8%', minSize: '30%', maxSize: '100%',
      sort: 'descending', gap: 4,
      label: {
        show: true, position: 'inside', color: cssVar('--text-inverse'), fontWeight: 700, fontSize: 12,
        formatter: (p: { name: string; value: number }) => `${p.name}  ${fmt(p.value)}`,
      },
      labelLine: { show: false },
      itemStyle: { borderWidth: 0, borderRadius: 5 },
      emphasis: { label: { fontSize: 13 } },
      data: values.map((f, i) => ({
        value: f.value, name: f.stage,
        itemStyle: {
          color: colors[i],
          opacity: f.stage === selected ? 1 : 0.5,
          borderColor: f.stage === worst ? cssVar('--danger') : 'transparent',
          borderWidth: f.stage === worst ? 2 : 0,
          shadowBlur: f.stage === selected ? 16 : 0,
          shadowColor: f.stage === selected ? cssVar('--gold-glow') : 'transparent',
        },
      })),
      ...ANIM,
    }],
  };
};

// ─── Chart: stage-to-stage conversion rate (step line) ──────────────────────────
const convOption = (rates: { label: string; rate: number }[], worstLabel: string) => {
  const b = baseOption();
  return {
    ...b,
    grid: { left: 8, right: 14, top: 30, bottom: 6, containLabel: true },
    tooltip: {
      ...(b.tooltip as object), trigger: 'axis',
      formatter: (p: { name: string; value: number }[]) => `${p[0].name}<br/>转化率 <b>${p[0].value}%</b>`,
    },
    xAxis: { type: 'category', data: rates.map(r => r.label), ...axisStyle(), splitLine: { show: false } },
    yAxis: { type: 'value', max: 100, ...axisStyle(), axisLabel: { formatter: '{value}%', color: cssVar('--text-3'), fontSize: 11 } },
    series: [{
      type: 'line', step: 'middle', smooth: false,
      data: rates.map(r => ({
        value: r.rate,
        itemStyle: { color: r.label === worstLabel ? cssVar('--danger') : cssVar('--gold') },
        symbolSize: r.label === worstLabel ? 11 : 7,
      })),
      lineStyle: { width: 3, color: cssVar('--gold') },
      symbol: 'circle',
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(90,168,255,0.22)' }, { offset: 1, color: 'transparent' }] } },
      label: { show: true, position: 'top', formatter: '{c}%', color: cssVar('--text-2'), fontSize: 11, fontWeight: 600 },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: cssVar('--hairline-strong'), type: 'dashed', width: 1 },
        label: { show: false },
        data: rates.length ? [{ yAxis: Math.round(rates.reduce((s, r) => s + r.rate, 0) / rates.length) }] : [],
      },
      ...ANIM,
    }],
  };
};

export default function FunnelDiag() {
  const [region, setRegion] = useState<RegionKey>('all');
  const [model, setModel] = useState<ModelKey>('all');

  // scaled funnel values (deterministic mock by filter)
  const values = useMemo(() => {
    const k = REGION_SCALE[region] * MODEL_SCALE[model];
    return FUNNEL.map(f => ({ stage: f.stage, value: Math.round(f.value * k) }));
  }, [region, model]);

  // stage-to-stage conversion (each transition LANDS on values[i])
  const transitions = useMemo(() =>
    values.slice(1).map((cur, i) => {
      const prev = values[i];
      const rate = prev.value ? +((cur.value / prev.value) * 100).toFixed(1) : 0;
      const overall = values[0].value ? +((cur.value / values[0].value) * 100).toFixed(1) : 0;
      return { from: prev.stage, to: cur.stage, rate, overall, value: cur.value, prevValue: prev.value };
    }), [values]);

  // worst-converting transition (lowest stage-to-stage rate)
  const worst = useMemo(
    () => transitions.reduce((w, t) => (t.rate < w.rate ? t : w), transitions[0]),
    [transitions],
  );

  const [selected, setSelected] = useState<string>(worst.to);

  // currently selected transition + its diagnostics
  const sel = transitions.find(t => t.to === selected) ?? worst;
  const diag = DIAG[sel.to];
  const prevChange = (() => {
    // mock 环比 derived from rate vs benchmark deviation, deterministic per stage
    const idx = FUNNEL.findIndex(f => f.stage === sel.to);
    const seed = [(-3.2), (-1.8), (-4.1), (-6.4), (-0.9)][idx - 1] ?? -2.0;
    return seed;
  })();

  const convRates = transitions.map(t => ({ label: `${t.from}→${t.to}`, rate: t.rate }));
  const avgRate = convRates.length ? Math.round(convRates.reduce((s, r) => s + r.rate, 0) / convRates.length) : 0;
  const e2e = values[0].value ? +((values[values.length - 1].value / values[0].value) * 100).toFixed(1) : 0;
  const gap = +(sel.rate - diag.benchmark).toFixed(1);

  return (
    <div className="page">
      <PageHeader
        title="漏斗诊断官"
        subtitle="2026年5月 · 逐节点掉点归因 · 卡点定位 · 建议动作直转操盘"
        actions={
          <div className="row gap-2 wrap">
            <span className="row gap-1 t-small text-3"><Filter size={12} />筛选</span>
            <Segmented options={REGION_OPTS.map(o => ({ value: o.value, label: o.label }))} value={region} onChange={setRegion} />
            <Segmented options={MODEL_OPTS.map(o => ({ value: o.value, label: o.label }))} value={model} onChange={setModel} />
          </div>
        }
      />

      {/* ── Summary strip ── */}
      <div className="card reveal reveal-1" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div className="row gap-6 wrap">
          <div className="row gap-2">
            <Layers size={14} style={{ color: 'var(--gold)' }} />
            <span className="t-small text-3">线索总量</span>
            <span className="tnum" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1, letterSpacing: '-0.01em' }}>{fmt(values[0].value)}</span>
          </div>
          <div style={{ height: 24, width: 1, background: 'var(--hairline)' }} />
          <div className="row gap-2">
            <Activity size={14} style={{ color: 'var(--emerald)' }} />
            <span className="t-small text-3">端到端转化</span>
            <span className="tnum" style={{ fontSize: 20, fontWeight: 800, color: 'var(--emerald)', lineHeight: 1, letterSpacing: '-0.01em' }}>{e2e}%</span>
          </div>
          <div style={{ height: 24, width: 1, background: 'var(--hairline)' }} />
          <div className="row gap-2">
            <Target size={14} style={{ color: 'var(--text-2)' }} />
            <span className="t-small text-3">平均环节转化</span>
            <span className="tnum" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-2)', lineHeight: 1, letterSpacing: '-0.01em' }}>{avgRate}%</span>
          </div>
          <Badge color="var(--danger)">
            <TrendingDown size={11} />最大卡点 · {worst.from}→{worst.to} {worst.rate}%
          </Badge>
          <div style={{ marginLeft: 'auto' }} className="row gap-1 text-3 t-small">
            <ChevronRight size={12} />点击漏斗任意环节查看诊断
          </div>
        </div>
      </div>

      {/* ── Funnel (left) + Diagnosis (right) ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.05fr 1fr', marginBottom: 16, alignItems: 'start' }}>
        {/* Funnel + clickable stage rail */}
        <Card className="reveal reveal-2">
          <SectionTitle right={<span className="t-small text-3">点击环节诊断</span>}>销售转化漏斗</SectionTitle>
          <Chart build={() => funnelOption(values, selected, worst.to)} height={258} deps={[region, model, selected, worst.to]} />

          {/* clickable conversion rail between stages */}
          <div className="col gap-1" style={{ marginTop: 8 }}>
            {transitions.map(t => {
              const isWorst = t.to === worst.to;
              const isSel = t.to === selected;
              return (
                <button
                  key={t.to}
                  onClick={() => setSelected(t.to)}
                  className="row spread"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                    background: isSel ? 'var(--surface-2)' : 'transparent',
                    border: `1px solid ${isSel ? 'var(--hairline-strong)' : 'transparent'}`,
                    textAlign: 'left', transition: 'all var(--dur-micro) var(--ease)',
                  }}
                >
                  <span className="row gap-2" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    {t.from}<ArrowRight size={11} style={{ color: 'var(--text-3)' }} />{t.to}
                    {isWorst && <span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 14%, transparent)', color: 'var(--danger)' }}><AlertTriangle size={9} />卡点</span>}
                  </span>
                  <span className="row gap-3">
                    <span style={{ width: 88 }}>
                      <ProgressBar pct={t.rate} color={isWorst ? 'var(--danger)' : 'var(--gold)'} height={5} />
                    </span>
                    <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: isWorst ? 'var(--danger)' : 'var(--text-1)', minWidth: 46, textAlign: 'right' }}>{t.rate}%</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Diagnosis panel for selected transition */}
        <Card className="reveal reveal-3">
          <SectionTitle
            right={
              sel.to === worst.to
                ? <Badge color="var(--danger)"><AlertTriangle size={10} />全局最大卡点</Badge>
                : <Badge color="var(--info)">环节诊断</Badge>
            }
          >
            {sel.from} → {sel.to}
          </SectionTitle>

          {/* metric row */}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
            <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}>
              <div className="label" style={{ marginBottom: 6 }}>本环转化</div>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: sel.to === worst.to ? 'var(--danger)' : 'var(--text-1)', lineHeight: 1 }}>{sel.rate}%</div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}>
              <div className="label" style={{ marginBottom: 6 }}>较基准</div>
              <div className="tnum row gap-1" style={{ fontSize: 22, fontWeight: 800, color: gap < 0 ? 'var(--danger)' : 'var(--success)', lineHeight: 1 }}>
                {gap < 0 ? <TrendingDown size={16} /> : null}{gap > 0 ? '+' : ''}{gap}<span style={{ fontSize: 12 }}>pt</span>
              </div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}>
              <div className="label" style={{ marginBottom: 6 }}>环比</div>
              <div className="tnum row gap-1" style={{ fontSize: 22, fontWeight: 800, color: prevChange < 0 ? 'var(--danger)' : 'var(--success)', lineHeight: 1 }}>
                {prevChange < 0 ? <TrendingDown size={16} /> : null}{prevChange > 0 ? '+' : ''}{prevChange}%
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 6 }} className="row gap-2 t-small text-2">
            <span className="tnum">{fmt(sel.prevValue)}</span>
            <ArrowRight size={12} style={{ color: 'var(--text-3)' }} />
            <span className="tnum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{fmt(sel.value)}</span>
            <span className="text-3">· 流失 {fmt(sel.prevValue - sel.value)} 人（占总量 {sel.overall ? (100 - sel.overall).toFixed(1) : 0}%）</span>
          </div>

          {/* attribution */}
          <div className="divider" />
          <div className="row gap-2" style={{ marginBottom: 12 }}>
            <TrendingDown size={14} style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>掉点归因</span>
            <span className="text-3 t-small">AI 拆解 · 占流失比</span>
          </div>
          <div className="col gap-2">
            {diag.reasons.map(r => (
              <div key={r.label} className="row spread gap-3" style={{ padding: '8px 0' }}>
                <span className="row gap-2 flex-1" style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', opacity: 0.7, flexShrink: 0 }} />
                  {r.label}
                </span>
                <span className="row gap-2" style={{ flexShrink: 0 }}>
                  <span style={{ width: 72 }}><ProgressBar pct={r.weight} color="var(--danger)" height={5} /></span>
                  <span className="tnum text-3" style={{ fontSize: 12, fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{r.weight}%</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Stage conversion trend + Suggested actions ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.1fr', alignItems: 'start' }}>
        <Card className="reveal reveal-4">
          <SectionTitle right={<span className="t-small text-3 tnum">均线 {avgRate}%</span>}>各环节转化率 · 阶梯</SectionTitle>
          <Chart build={() => convOption(convRates, `${worst.from}→${worst.to}`)} height={252} deps={[region, model]} />
        </Card>

        <Card className="reveal reveal-5">
          <SectionTitle right={<Badge color="var(--gold)"><Lightbulb size={11} />{diag.suggestions.length} 条建议</Badge>}>
            建议动作 · {sel.from}→{sel.to}
          </SectionTitle>
          <div className="col gap-3">
            {diag.suggestions.map((s, i) => {
              const ic = IMPACT[s.impact];
              return (
                <div
                  key={s.title}
                  className={`reveal reveal-${Math.min(i + 1, 6)}`}
                  style={{
                    padding: '13px 15px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)',
                    border: '1px solid var(--hairline)', position: 'relative', overflow: 'hidden',
                  }}
                >
                  <div className="stripe-top" style={{ background: `linear-gradient(90deg, var(--gold), transparent)` }} />
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <span className="row gap-2" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                      <Lightbulb size={13} style={{ color: 'var(--gold)' }} />{s.title}
                    </span>
                    <span className="chip" style={{ background: `color-mix(in srgb, ${ic.color} 12%, transparent)`, color: ic.color, fontSize: 11 }}>
                      {ic.label}影响
                    </span>
                  </div>
                  <div className="t-small text-3" style={{ lineHeight: 1.55, marginBottom: 11 }}>{s.detail}</div>
                  <div className="row gap-2">
                    <button className="btn btn-primary btn-sm">
                      <Send size={12} />转操盘动作
                    </button>
                    <button className="btn btn-ghost btn-sm">查看明细</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="row gap-2" style={{ marginTop: 12, color: 'var(--text-3)', fontSize: 11 }}>
            <Activity size={12} />诊断基于漏斗逐环转化 + 历史基准 + 流失归因模型实时计算
          </div>
        </Card>
      </div>
    </div>
  );
}
