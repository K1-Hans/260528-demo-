import { useMemo, useState } from 'react';
import { SlidersHorizontal, Boxes, Banknote, Swords, Megaphone, RotateCcw, Shield, TrendingDown, Rocket } from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, TrendChip } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { MODEL_PROGRESS } from '../../lib/mockData';
import './Sandbox.css';

// ─── 基准（本地推导，绝不改 mockData）────────────────────────────────────────
const ORDERS_0 = 8412;     // 本月订单（METRICS 口径）
const ASP_0 = 38.9;        // 终端均价（万）
const MARGIN_0 = 0.18;     // 假设毛利率
const SHARE_0 = 18.2;      // NEV 市占率 %
const REVENUE_0 = ORDERS_0 * ASP_0;          // 万元
const GROSS_0 = REVENUE_0 * MARGIN_0;         // 万元

// 各车型基准订单（按 actual 占比映射到 ORDERS_0）─────────────────────────────
const MODEL_BASE = (() => {
  const sum = MODEL_PROGRESS.reduce((s, m) => s + m.actual, 0);
  return MODEL_PROGRESS.map(m => ({ model: m.model, color: m.color, base: Math.round((m.actual / sum) * ORDERS_0) }));
})();

// ─── 弹性系数（本地定义）─────────────────────────────────────────────────────
// 降价：每降 1% → 订单 +e_price%，但 ASP 同步下降、毛利率受压。
const E_PRICE_VOL = 0.052;   // 价格弹性（销量）
const E_SUBSIDY_VOL = 0.018; // 每 1000 元补贴 → 订单 +1.8%
const E_COMPET = 0.06;       // 竞品每升一档 → 订单 −6%
const E_MKT = 0.035;         // 营销每升一档 → 订单 +3.5%

interface Knobs { price: number; subsidy: number; compet: number; mkt: number; }
const NEUTRAL: Knobs = { price: 0, subsidy: 0, compet: 0, mkt: 0 };

interface Preset { id: string; name: string; desc: string; icon: React.ReactNode; knobs: Knobs; }
const PRESETS: Preset[] = [
  { id: 'defense', name: '价格战防守', desc: '小幅降价 + 加补贴稳住份额', icon: <Shield size={15} />, knobs: { price: 3, subsidy: 5000, compet: 2, mkt: 1 } },
  { id: 'taper', name: '补贴退坡', desc: '补贴回收，承压观察', icon: <TrendingDown size={15} />, knobs: { price: 0, subsidy: -8000, compet: 1, mkt: 0 } },
  { id: 'aggressive', name: '激进抢量', desc: '大幅降价 + 满额营销冲量', icon: <Rocket size={15} />, knobs: { price: 6, subsidy: 8000, compet: 1, mkt: 3 } },
];

interface Result {
  orders: number; revenue: number; gross: number; share: number;
  asp: number; margin: number; factor: number;
}

// 核心模型：把四个旋钮折算成「需求乘子 + 单车经济变化」───────────────────────
function simulate(k: Knobs): Result {
  const lift =
    1 +
    k.price * E_PRICE_VOL +              // 降价拉量
    (k.subsidy / 1000) * E_SUBSIDY_VOL - // 补贴拉量
    k.compet * E_COMPET +                // 竞品冲击减量
    k.mkt * E_MKT;                       // 营销拉量
  const factor = Math.max(0.55, lift);
  const orders = Math.round(ORDERS_0 * factor);

  // ASP 受降价直接侵蚀；补贴由厂端承担也压单车收入（按一半计入）
  const asp = ASP_0 * (1 - k.price / 100) - (k.subsidy / 10000) * 0.5;
  const revenue = Math.round(orders * asp);

  // 毛利率：降价与补贴双重侵蚀，营销小幅增费
  const margin = Math.max(
    0.04,
    MARGIN_0 - k.price * 0.011 - (k.subsidy / 10000) * 0.028 - k.mkt * 0.004,
  );
  const gross = Math.round(revenue * margin);

  // 市占率：随订单相对基准放大，封顶
  const share = Math.max(8, Math.min(30, SHARE_0 * (orders / ORDERS_0) ** 0.55));

  return { orders, revenue, gross, share, asp, margin, factor };
}

const pctDelta = (cur: number, base: number) => Math.round(((cur - base) / base) * 1000) / 10;
const fmt = (n: number) => n.toLocaleString('zh-CN');
// 万元 → 亿元（保留 2 位）
const toYi = (wan: number) => (wan / 10000).toFixed(2);

interface SliderDef {
  key: keyof Knobs; label: string; icon: React.ReactNode;
  min: number; max: number; step: number;
  fmt: (v: number) => string; hint: string;
}
const SLIDERS: SliderDef[] = [
  { key: 'price', label: '降价幅度', icon: <Banknote size={14} />, min: 0, max: 8, step: 0.5, fmt: v => `−${v}%`, hint: '终端让利' },
  { key: 'subsidy', label: '补贴变化', icon: <Megaphone size={14} />, min: -10000, max: 10000, step: 1000, fmt: v => `${v >= 0 ? '+' : ''}${fmt(v)} 元/台`, hint: '厂端补贴' },
  { key: 'compet', label: '竞品上新冲击', icon: <Swords size={14} />, min: 0, max: 3, step: 1, fmt: v => `${['无', '轻', '中', '强'][v]}（${v}档）`, hint: '问界/小米等' },
  { key: 'mkt', label: '营销投放', icon: <SlidersHorizontal size={14} />, min: 0, max: 3, step: 1, fmt: v => `${['基线', '加码', '强投', '满额'][v]}（${v}档）`, hint: '流量+权益' },
];

export default function Sandbox() {
  const [knobs, setKnobs] = useState<Knobs>({ price: 3, subsidy: 5000, compet: 2, mkt: 1 });

  const r = useMemo(() => simulate(knobs), [knobs]);
  const activePreset = PRESETS.find(p => JSON.stringify(p.knobs) === JSON.stringify(knobs))?.id ?? '';
  const isNeutral = JSON.stringify(knobs) === JSON.stringify(NEUTRAL);

  const set = (key: keyof Knobs, v: number) => setKnobs(prev => ({ ...prev, [key]: v }));

  // 派生：各车型情景订单（同一乘子，份额随车型敏感度轻微差异）─────────────────
  const modelScenario = MODEL_BASE.map(m => ({
    ...m,
    scenario: Math.round(m.base * r.factor),
  }));

  // 图表：基准 vs 情景 · 各车型订单（分组柱）+ 总量对比 ─────────────────────────
  const ordersBarOption = () => {
    const b = baseOption();
    const d = modelScenario;
    return {
      ...b,
      legend: {
        data: ['基准订单', '情景预测'], top: 0, right: 0, icon: 'roundRect',
        itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 12 },
      },
      tooltip: {
        ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (p: { name: string; value: number; seriesName: string; marker: string }[]) => {
          const row = d.find(x => x.model === p[0].name);
          const delta = row ? pctDelta(row.scenario, row.base) : 0;
          return `${p[0].name}<br/>${p.map(s => `${s.marker}${s.seriesName} <b>${fmt(s.value)}</b> 台`).join('<br/>')}` +
            `<br/>Δ <b style="color:${delta >= 0 ? cssVar('--success') : cssVar('--danger')}">${delta >= 0 ? '+' : ''}${delta}%</b>`;
        },
      },
      grid: { left: 8, right: 14, top: 36, bottom: 6, containLabel: true },
      xAxis: { type: 'category', data: d.map(x => x.model), ...axisStyle(), splitLine: { show: false } },
      yAxis: { type: 'value', ...axisStyle() },
      series: [
        {
          name: '基准订单', type: 'bar', barWidth: '32%',
          data: d.map(x => x.base),
          itemStyle: { color: cssVar('--surface-3'), borderColor: cssVar('--hairline-strong'), borderWidth: 1, borderRadius: [4, 4, 0, 0] },
          ...ANIM,
        },
        {
          name: '情景预测', type: 'bar', barWidth: '32%',
          data: d.map(x => ({ value: x.scenario, itemStyle: { color: x.color, borderRadius: [4, 4, 0, 0] } })),
          label: {
            show: true, position: 'top',
            formatter: (p: { dataIndex: number }) => {
              const dl = pctDelta(d[p.dataIndex].scenario, d[p.dataIndex].base);
              return `${dl >= 0 ? '+' : ''}${dl}%`;
            },
            color: cssVar('--text-2'), fontSize: 10, fontWeight: 600,
          },
          ...ANIM,
        },
      ],
    };
  };

  const RESULTS = [
    { key: 'orders', label: '预计订单', icon: <Boxes size={15} />, value: fmt(r.orders), unit: '台', delta: pctDelta(r.orders, ORDERS_0), accent: 'var(--gold)' },
    { key: 'revenue', label: '预计营收', icon: <Banknote size={15} />, value: toYi(r.revenue), unit: '亿元', delta: pctDelta(r.revenue, REVENUE_0), accent: 'var(--emerald)' },
    { key: 'gross', label: '预计毛利', icon: <TrendingDown size={15} />, value: toYi(r.gross), unit: '亿元', delta: pctDelta(r.gross, GROSS_0), accent: 'var(--c4)' },
    { key: 'share', label: '预计市占率', icon: <Swords size={15} />, value: r.share.toFixed(1), unit: '%', delta: pctDelta(r.share, SHARE_0), accent: 'var(--c3)' },
  ] as const;

  return (
    <div className="page">
      <PageHeader
        title="What-if 策略沙盘"
        subtitle="2026 EV 价格战 · 降价 / 补贴 / 竞品 / 营销 → 订单·营收·毛利·份额实时推演"
        actions={
          <button className="btn btn-ghost" onClick={() => setKnobs(NEUTRAL)} disabled={isNeutral}>
            <RotateCcw size={14} /> 重置基准
          </button>
        }
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: '380px 1fr', alignItems: 'start' }}>
        {/* ── LEFT · 控制面板 ── */}
        <Card className="reveal reveal-1">
          <SectionTitle right={<Badge color="var(--gold)">决策旋钮</Badge>}>策略组合 · 拖动实时推演</SectionTitle>

          {/* 预设 */}
          <div className="row gap-2 wrap" style={{ marginBottom: 18 }}>
            {PRESETS.map(p => (
              <button
                key={p.id}
                className={`sb-preset ${activePreset === p.id ? 'is-active' : ''}`}
                onClick={() => setKnobs(p.knobs)}
              >
                <span className="row gap-2" style={{ color: activePreset === p.id ? 'var(--gold)' : 'var(--text-1)', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                  {p.icon}{p.name}
                </span>
                <span className="t-small text-3" style={{ display: 'block', lineHeight: 1.4 }}>{p.desc}</span>
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
                    <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{s.fmt(v)}</span>
                  </div>
                  <input
                    type="range"
                    className="sb-slider"
                    min={s.min} max={s.max} step={s.step} value={v}
                    style={{ '--sb-fill': `${fill}%` } as React.CSSProperties}
                    onChange={e => set(s.key, Number(e.target.value))}
                    aria-label={s.label}
                  />
                </div>
              );
            })}
          </div>

          <div className="divider" />
          <div className="row gap-2" style={{ color: 'var(--text-3)', fontSize: 11, lineHeight: 1.5 }}>
            <SlidersHorizontal size={12} style={{ flexShrink: 0, marginTop: 2 }} />
            弹性系数为本地标定（价格 / 补贴 / 竞品 / 营销 → 需求乘子），仅用于策略演示推演。
          </div>
        </Card>

        {/* ── RIGHT · 实时结果 ── */}
        <div className="col gap-4">
          {/* 大数字结果 */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
            {RESULTS.map((res, i) => (
              <Card key={res.key} className={`card-hover reveal reveal-${i + 1}`}>
                <div className="spread" style={{ marginBottom: 12 }}>
                  <span className="label">{res.label}</span>
                  <span style={{ color: res.accent, opacity: 0.75 }}>{res.icon}</span>
                </div>
                <div className="sb-result-num">{res.value}<span className="kpi-unit">{res.unit}</span></div>
                <div className="row spread" style={{ marginTop: 10 }}>
                  <TrendChip change={res.delta} suffix="vs 基准" />
                </div>
              </Card>
            ))}
          </div>

          {/* 实时图表 */}
          <Card className="reveal reveal-3">
            <SectionTitle right={
              <span className="row gap-2 t-small" style={{ color: r.factor >= 1 ? 'var(--success)' : 'var(--danger)' }}>
                <span className="dot-pulse" style={{ background: r.factor >= 1 ? 'var(--success)' : 'var(--danger)' }} />
                需求乘子 ×{r.factor.toFixed(3)}
              </span>
            }>
              基准 vs 情景 · 各车型预计订单（拖动滑块实时重算）
            </SectionTitle>
            <Chart build={ordersBarOption} height={252} deps={[knobs.price, knobs.subsidy, knobs.compet, knobs.mkt]} />
          </Card>

          {/* 对比基准 note */}
          <Card className="reveal reveal-4" style={{ padding: '14px 18px', background: 'var(--surface-2)' }}>
            <div className="row spread wrap gap-3">
              <span className="row gap-2 label">对比基准 · 2026年5月实际</span>
              <div className="row gap-4 wrap t-small text-2">
                <span>订单 <b className="tnum" style={{ color: 'var(--text-1)' }}>{fmt(ORDERS_0)}</b> 台</span>
                <span>营收 <b className="tnum" style={{ color: 'var(--text-1)' }}>{toYi(REVENUE_0)}</b> 亿</span>
                <span>毛利率 <b className="tnum" style={{ color: 'var(--text-1)' }}>{(MARGIN_0 * 100).toFixed(0)}%</b></span>
                <span>市占率 <b className="tnum" style={{ color: 'var(--text-1)' }}>{SHARE_0}%</b></span>
                <span>ASP <b className="tnum" style={{ color: 'var(--text-1)' }}>{ASP_0}</b> 万</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
