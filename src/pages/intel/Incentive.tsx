import { useMemo, useState } from 'react';
import {
  SlidersHorizontal, Percent, Layers, Banknote, RotateCcw, TrendingUp,
  TrendingDown, Coins, Gauge, Shield, Rocket, Scale,
} from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, TrendChip } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { MODEL_PROGRESS, GOALS, METRICS } from '../../lib/mockData';
import { fmt } from '../../lib/hooks';
import './Incentive.css';

// ─── 基准（本地推导，绝不改 mockData）────────────────────────────────────────
// 本月经销商口径基准：以 GOALS 月度目标合计为达成基线，METRICS 终端均价/毛利率为单车经济。
const TARGET_0 = GOALS.reduce((s, g) => s + g.monthlyTarget, 0);   // 月度目标合计（台）
const BASE_SALES = GOALS.reduce((s, g) => s + g.monthlyActual, 0); // 当前实际合计（台）
const ASP_YUAN = (METRICS.find(m => m.label === '终端均价')?.raw ?? 38.9) * 10000; // 终端均价（元）
const GROSS_MARGIN_0 = 0.18;                       // 单车毛利率（基准）
const GROSS_PER_CAR_0 = ASP_YUAN * GROSS_MARGIN_0; // 单车毛利（元）

// ─── 弹性系数（本地标定）─────────────────────────────────────────────────────
// 经销商激励 → 渠道推力 → 增量销量；同时侵蚀单车毛利。
const E_REBATE_VOL = 0.038;   // 返利率每 +1% → 销量 +3.8%（渠道推力弹性）
const E_TIER_VOL = 0.021;     // 阶梯达成奖每升 1 档 → 销量 +2.1%
const E_SUBSIDY_VOL = 0.016;  // 单车终端补贴每 +1000 元 → 销量 +1.6%
const TIER_MAX = 3;           // 阶梯档位上限

interface Knobs { rebate: number; tier: number; subsidy: number; }
const NEUTRAL: Knobs = { rebate: 0, tier: 0, subsidy: 0 };

interface Preset { id: string; name: string; desc: string; icon: React.ReactNode; knobs: Knobs; }
const PRESETS: Preset[] = [
  { id: 'steady', name: '稳健保利', desc: '低返利 + 一档达成奖，守毛利', icon: <Shield size={15} />, knobs: { rebate: 1.5, tier: 1, subsidy: 2000 } },
  { id: 'tier', name: '阶梯冲量', desc: '中返利 + 顶档奖，激励达标', icon: <Scale size={15} />, knobs: { rebate: 3, tier: 3, subsidy: 4000 } },
  { id: 'blitz', name: '终端抢量', desc: '高返利 + 满补贴，毛利换份额', icon: <Rocket size={15} />, knobs: { rebate: 5, tier: 2, subsidy: 8000 } },
];

interface Result {
  sales: number; salesLift: number; achieve: number;
  grossPerCar: number; grossErosion: number;
  spendRebate: number; spendTier: number; spendSubsidy: number; spendTotal: number;
  incrGross: number; roi: number; liftFactor: number;
}

// 核心模型：三旋钮 → 销量乘子 + 单车毛利侵蚀 + 激励投入 → ROI ───────────────
function simulate(k: Knobs): Result {
  const liftFactor =
    1 +
    k.rebate * E_REBATE_VOL +
    k.tier * E_TIER_VOL +
    (k.subsidy / 1000) * E_SUBSIDY_VOL;
  const sales = Math.round(BASE_SALES * liftFactor);
  const salesLift = sales - BASE_SALES;
  const achieve = (sales / TARGET_0) * 100;

  // 单车毛利侵蚀：返利按终端价计提 + 终端补贴直接让利（厂端承担一半）
  const grossPerCar = Math.max(
    0,
    GROSS_PER_CAR_0 - ASP_YUAN * (k.rebate / 100) - k.subsidy * 0.5,
  );
  const grossErosion = GROSS_PER_CAR_0 - grossPerCar; // 单车毛利损失（元）

  // 激励总投入（元）：返利 + 阶梯奖（固定额/台）+ 终端补贴，仅按本月销量计提
  const spendRebate = sales * ASP_YUAN * (k.rebate / 100);
  const spendTier = sales * k.tier * 1500;       // 每档 1500 元/台达成奖
  const spendSubsidy = sales * k.subsidy * 0.5;  // 厂端补贴承担一半
  const spendTotal = spendRebate + spendTier + spendSubsidy;

  // 增量毛利 = 增量销量 × 激励后单车毛利
  const incrGross = salesLift * grossPerCar;
  const roi = spendTotal > 0 ? incrGross / spendTotal : 0;

  return {
    sales, salesLift, achieve, grossPerCar, grossErosion,
    spendRebate, spendTier, spendSubsidy, spendTotal, incrGross, roi, liftFactor,
  };
}

const toWan = (yuan: number) => yuan / 10000;            // 元 → 万
const fmtWan = (yuan: number) => fmt(Math.round(toWan(yuan))); // 元 → 万（整数）

interface SliderDef {
  key: keyof Knobs; label: string; icon: React.ReactNode;
  min: number; max: number; step: number;
  fmt: (v: number) => string; hint: string;
}
const SLIDERS: SliderDef[] = [
  { key: 'rebate', label: '返利率', icon: <Percent size={14} />, min: 0, max: 6, step: 0.5, fmt: v => `${v}%`, hint: '按终端价计提' },
  { key: 'tier', label: '阶梯目标达成奖', icon: <Layers size={14} />, min: 0, max: TIER_MAX, step: 1, fmt: v => `${['无', '一档', '二档', '三档'][v]}（${fmt(v * 1500)} 元/台）`, hint: '达标返奖' },
  { key: 'subsidy', label: '单车终端补贴', icon: <Banknote size={14} />, min: 0, max: 10000, step: 1000, fmt: v => `${fmt(v)} 元/台`, hint: '厂端承担半数' },
];

export default function Incentive() {
  const [knobs, setKnobs] = useState<Knobs>({ rebate: 3, tier: 2, subsidy: 4000 });

  const r = useMemo(() => simulate(knobs), [knobs]);
  const base = useMemo(() => simulate(NEUTRAL), []);
  const activePreset = PRESETS.find(p => JSON.stringify(p.knobs) === JSON.stringify(knobs))?.id ?? '';
  const isNeutral = JSON.stringify(knobs) === JSON.stringify(NEUTRAL);
  const set = (key: keyof Knobs, v: number) => setKnobs(prev => ({ ...prev, [key]: v }));

  // ── 敏感度曲线：返利率 0→6% 扫描，输出 销量提升 & 单车毛利（固定当前阶梯/补贴）──
  const sweepOption = () => {
    const b = baseOption();
    const steps = Array.from({ length: 13 }, (_, i) => i * 0.5); // 0 .. 6
    const pts = steps.map(rb => simulate({ ...knobs, rebate: rb }));
    return {
      ...b,
      legend: {
        data: ['销量提升', '单车毛利'], top: 0, right: 0, icon: 'roundRect',
        itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 12 },
      },
      tooltip: {
        ...(b.tooltip as object), trigger: 'axis',
        formatter: (p: { axisValue: string; marker: string; seriesName: string; value: number }[]) =>
          `返利率 ${p[0].axisValue}<br/>` +
          p.map(s => `${s.marker}${s.seriesName} <b>${s.seriesName === '销量提升' ? fmt(s.value) + ' 台' : fmt(s.value) + ' 元'}</b>`).join('<br/>'),
      },
      grid: { left: 8, right: 14, top: 38, bottom: 6, containLabel: true },
      xAxis: { type: 'category', data: steps.map(s => `${s}%`), ...axisStyle(), splitLine: { show: false } },
      yAxis: [
        { type: 'value', name: '增量台', ...axisStyle(), nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 } },
        { type: 'value', name: '单车毛利(元)', position: 'right', axisLabel: { color: cssVar('--text-3'), fontSize: 11 }, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false }, nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 } },
      ],
      series: [
        {
          name: '销量提升', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
          data: pts.map(p => p.salesLift),
          lineStyle: { width: 3, color: cssVar('--gold') }, itemStyle: { color: cssVar('--gold') },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(90,168,255,0.28)' }, { offset: 1, color: 'transparent' }] } },
          ...ANIM,
        },
        {
          name: '单车毛利', type: 'line', smooth: true, yAxisIndex: 1, symbol: 'circle', symbolSize: 6,
          data: pts.map(p => Math.round(p.grossPerCar)),
          lineStyle: { width: 3, color: cssVar('--danger') }, itemStyle: { color: cssVar('--danger') },
          ...ANIM,
        },
      ],
    };
  };

  const profit = r.incrGross >= r.spendTotal;

  const RESULTS = [
    { key: 'lift', label: '预计销量提升', icon: <TrendingUp size={15} />, value: fmt(r.salesLift), unit: '台', delta: Math.round(((r.sales - base.sales) / base.sales) * 1000) / 10, accent: 'var(--gold)' },
    { key: 'erosion', label: '单车毛利侵蚀', icon: <TrendingDown size={15} />, value: fmt(Math.round(r.grossErosion)), unit: '元/台', delta: -(Math.round((r.grossErosion / GROSS_PER_CAR_0) * 1000) / 10), accent: 'var(--danger)' },
    { key: 'spend', label: '激励总投入', icon: <Coins size={15} />, value: fmtWan(r.spendTotal), unit: '万元', delta: base.spendTotal > 0 ? Math.round(((r.spendTotal - base.spendTotal) / base.spendTotal) * 1000) / 10 : 0, accent: 'var(--c4)' },
    { key: 'roi', label: 'ROI · 增量毛利÷投入', icon: <Gauge size={15} />, value: r.roi.toFixed(2), unit: '×', delta: 0, accent: r.roi >= 1 ? 'var(--success)' : 'var(--danger)' },
  ] as const;

  return (
    <div className="page">
      <PageHeader
        title="激励 / 返利测算"
        subtitle="经销商激励建模 · 返利率 / 阶梯达成奖 / 终端补贴 → 销量·毛利·投入·ROI 实时推演"
        actions={
          <button className="btn btn-ghost" onClick={() => setKnobs(NEUTRAL)} disabled={isNeutral}>
            <RotateCcw size={14} /> 重置基准
          </button>
        }
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: '380px 1fr', alignItems: 'start' }}>
        {/* ── LEFT · 控制面板 ── */}
        <Card className="reveal reveal-1">
          <SectionTitle right={<Badge color="var(--gold)">激励旋钮</Badge>}>激励方案 · 拖动实时测算</SectionTitle>

          {/* 预设方案 */}
          <div className="col gap-2" style={{ marginBottom: 18 }}>
            {PRESETS.map(p => (
              <button
                key={p.id}
                className={`inc-preset ${activePreset === p.id ? 'is-active' : ''}`}
                onClick={() => setKnobs(p.knobs)}
              >
                <span className="row gap-2" style={{ color: activePreset === p.id ? 'var(--gold)' : 'var(--text-1)', fontWeight: 700, fontSize: 13 }}>
                  {p.icon}{p.name}
                </span>
                <span className="t-small text-3" style={{ display: 'block', lineHeight: 1.4, marginTop: 2 }}>{p.desc}</span>
              </button>
            ))}
          </div>

          <div className="divider" />

          {/* 滑块 */}
          <div className="col gap-5">
            {SLIDERS.map(s => {
              const v = knobs[s.key];
              const fill = ((v - s.min) / (s.max - s.min)) * 100;
              return (
                <div key={s.key} className="col gap-2">
                  <div className="row spread">
                    <span className="row gap-2" style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--gold)' }}>{s.icon}</span>{s.label}
                      <span className="tag" style={{ fontSize: 10 }}>{s.hint}</span>
                    </span>
                    <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{s.fmt(v)}</span>
                  </div>
                  <input
                    type="range"
                    className="inc-slider"
                    min={s.min} max={s.max} step={s.step} value={v}
                    style={{ '--inc-fill': `${fill}%` } as React.CSSProperties}
                    onChange={e => set(s.key, Number(e.target.value))}
                    aria-label={s.label}
                  />
                </div>
              );
            })}
          </div>

          <div className="divider" />

          {/* 投入拆解 */}
          <div className="col gap-2">
            <span className="label" style={{ marginBottom: 2 }}>激励投入拆解（万元）</span>
            {[
              { label: '返利计提', v: r.spendRebate, color: 'var(--gold)' },
              { label: '阶梯达成奖', v: r.spendTier, color: 'var(--c3)' },
              { label: '终端补贴(厂端)', v: r.spendSubsidy, color: 'var(--c4)' },
            ].map(item => {
              const pct = r.spendTotal > 0 ? (item.v / r.spendTotal) * 100 : 0;
              return (
                <div key={item.label} className="col gap-1">
                  <div className="row spread t-small">
                    <span className="text-2">{item.label}</span>
                    <span className="tnum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{fmtWan(item.v)} 万</span>
                  </div>
                  <div className="inc-bar"><div className="inc-bar-fill" style={{ width: `${pct}%`, background: item.color }} /></div>
                </div>
              );
            })}
          </div>

          <div className="divider" />
          <div className="row gap-2" style={{ color: 'var(--text-3)', fontSize: 11, lineHeight: 1.5 }}>
            <SlidersHorizontal size={12} style={{ flexShrink: 0, marginTop: 2 }} />
            弹性系数为本地标定（返利 / 阶梯 / 补贴 → 渠道推力乘子），仅用于激励方案演示推演。
          </div>
        </Card>

        {/* ── RIGHT · 实时结果 ── */}
        <div className="col gap-4">
          {/* 大数字结果 */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(196px, 1fr))', gap: 16 }}>
            {RESULTS.map((res, i) => (
              <Card key={res.key} className={`card-hover reveal reveal-${i + 1}`}>
                <div className="spread" style={{ marginBottom: 12 }}>
                  <span className="label">{res.label}</span>
                  <span style={{ color: res.accent, opacity: 0.75 }}>{res.icon}</span>
                </div>
                <div className="inc-result-num" style={res.key === 'roi' ? { color: res.accent } : undefined}>
                  {res.value}<span className="kpi-unit">{res.unit}</span>
                </div>
                <div className="row spread" style={{ marginTop: 10 }}>
                  {res.key === 'roi'
                    ? <span className={`row gap-1 t-small ${r.roi >= 1 ? 'trend-up' : 'trend-down'}`} style={{ fontWeight: 600 }}>{r.roi >= 1 ? '激励高效 · 毛利覆盖投入' : '激励侵蚀 · 投入超毛利'}</span>
                    : <TrendChip change={res.delta} suffix="vs 无激励" />}
                </div>
              </Card>
            ))}
          </div>

          {/* 敏感度图表 */}
          <Card className="reveal reveal-3">
            <SectionTitle right={
              <span className="row gap-2 t-small" style={{ color: profit ? 'var(--success)' : 'var(--danger)' }}>
                <span className="dot-pulse" style={{ background: profit ? 'var(--success)' : 'var(--danger)' }} />
                推力乘子 ×{r.liftFactor.toFixed(3)}
              </span>
            }>
              返利率敏感度 · 销量提升 vs 单车毛利（当前阶梯/补贴固定，拖动实时重算）
            </SectionTitle>
            <Chart build={sweepOption} height={252} deps={[knobs.rebate, knobs.tier, knobs.subsidy]} />
          </Card>

          {/* 投入产出平衡卡 */}
          <Card className="reveal reveal-4" style={{ padding: '16px 20px', background: 'var(--surface-2)' }}>
            <div className="row spread wrap gap-3">
              <span className="row gap-2">
                <Scale size={15} style={{ color: profit ? 'var(--success)' : 'var(--danger)' }} />
                <span className="label">投入产出平衡 · 增量毛利 vs 激励投入</span>
              </span>
              <div className="row gap-4 wrap t-small text-2">
                <span>增量毛利 <b className="tnum" style={{ color: 'var(--success)' }}>{fmtWan(r.incrGross)}</b> 万</span>
                <span>激励投入 <b className="tnum" style={{ color: 'var(--danger)' }}>{fmtWan(r.spendTotal)}</b> 万</span>
                <span>净额 <b className="tnum" style={{ color: profit ? 'var(--success)' : 'var(--danger)' }}>{r.incrGross - r.spendTotal >= 0 ? '+' : ''}{fmtWan(r.incrGross - r.spendTotal)}</b> 万</span>
                <span>目标达成 <b className="tnum" style={{ color: 'var(--text-1)' }}>{r.achieve.toFixed(0)}%</b></span>
              </div>
            </div>
            <div className="inc-balance">
              <div className="inc-balance-fill" style={{ width: `${Math.min((r.incrGross / Math.max(r.spendTotal, 1)) * 50, 100)}%`, background: profit ? 'var(--success)' : 'var(--danger)' }} />
              <span className="inc-balance-mid" />
            </div>
            <div className="row spread t-small text-3" style={{ marginTop: 4 }}>
              <span>对比基准 · {fmt(MODEL_PROGRESS.length)} 车型月度目标合计 {fmt(TARGET_0)} 台 / 当前 {fmt(BASE_SALES)} 台</span>
              <span>盈亏平衡线 ROI = 1.00×</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
