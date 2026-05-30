import { useState } from 'react';
import { Globe2, Factory, Swords, Users2, Building2, Sparkles, Quote } from 'lucide-react';
import { Card, PageHeader, SectionTitle, StatCard, Badge } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM, BRAND_COLORS } from '../../lib/chartTheme';
import { MARKET_VIEWS, COMPETITORS } from '../../lib/mockData';

const VIEW_META: Record<string, { icon: React.ReactNode; chartTitle: string; tagline: string }> = {
  macro: { icon: <Globe2 size={17} />, chartTitle: 'NEV 渗透率走势（近 8 月）', tagline: '宏观环境 · 政策与大盘' },
  industry: { icon: <Factory size={17} />, chartTitle: '能源结构销量份额', tagline: '行业格局 · 赛道景气度' },
  competitor: { icon: <Swords size={17} />, chartTitle: '核心竞品月销对比（台）', tagline: '竞争态势 · 对标施压' },
  customer: { icon: <Users2 size={17} />, chartTitle: '舆情情感分布', tagline: '客户心智 · 需求与口碑' },
  self: { icon: <Building2 size={17} />, chartTitle: '车型目标完成率', tagline: '自身经营 · 优势与短板' },
};

// ── 各看 adaptive chart builders（数据本地派生，不改 mockData）─────────────────
const macroChart = () => {
  const b = baseOption();
  const months = ['10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月'];
  const data = [44.8, 46.1, 47.5, 48.2, 48.9, 50.1, 51.2, 52.3];
  const grad = { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(90,168,255,0.30)' }, { offset: 1, color: 'transparent' }] };
  return {
    ...b,
    grid: { left: 8, right: 16, top: 16, bottom: 6, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', formatter: '{b}<br/>渗透率 <b>{c}%</b>' },
    xAxis: { type: 'category', data: months, ...axisStyle(), splitLine: { show: false } },
    yAxis: { type: 'value', min: 40, max: 56, ...axisStyle(), axisLabel: { formatter: '{value}%', color: cssVar('--text-3'), fontSize: 11 } },
    series: [{
      type: 'line', smooth: true, data, symbol: 'circle', symbolSize: 7,
      lineStyle: { width: 3, color: cssVar('--gold') }, itemStyle: { color: cssVar('--gold') },
      areaStyle: { color: grad }, ...ANIM,
    }],
  };
};

const industryChart = () => {
  const b = baseOption();
  return {
    ...b,
    legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: cssVar('--text-2'), fontSize: 11 } },
    tooltip: { ...(b.tooltip as object), trigger: 'item', formatter: '{b}<br/>份额 <b>{d}%</b>' },
    series: [{
      type: 'pie', radius: ['46%', '74%'], center: ['50%', '46%'], avoidLabelOverlap: true,
      itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2, borderRadius: 4 },
      label: { show: false }, emphasis: { scale: true, scaleSize: 6, label: { show: true, formatter: '{b}\n{d}%', color: cssVar('--text-1'), fontSize: 12, fontWeight: 700 } },
      data: [
        { name: '增程', value: 31, itemStyle: { color: cssVar('--c1') } },
        { name: '纯电', value: 44, itemStyle: { color: cssVar('--c3') } },
        { name: '插混', value: 18, itemStyle: { color: cssVar('--c2') } },
        { name: '燃油', value: 7, itemStyle: { color: cssVar('--c8') } },
      ],
      ...ANIM,
    }],
  };
};

const competitorChart = () => {
  const b = baseOption();
  const d = [...COMPETITORS].sort((a, x) => (a.monthlyVolume ?? 0) - (x.monthlyVolume ?? 0)).slice(-7);
  return {
    ...b,
    grid: { left: 8, right: 56, top: 8, bottom: 6, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: d.map(x => `${x.brand} ${x.model}`), ...axisStyle(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...axisStyle().axisLabel, color: cssVar('--text-2') } },
    series: [{
      type: 'bar', barWidth: 14,
      data: d.map(x => ({ value: x.monthlyVolume ?? 0, itemStyle: { color: BRAND_COLORS[x.brand] ?? cssVar('--c8'), borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', formatter: (p: { value: number }) => p.value.toLocaleString('zh-CN'), color: cssVar('--text-3'), fontSize: 11, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

const customerChart = () => {
  const b = baseOption();
  return {
    ...b,
    legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: cssVar('--text-2'), fontSize: 11 } },
    tooltip: { ...(b.tooltip as object), trigger: 'item', formatter: '{b}<br/><b>{d}%</b>（{c}）' },
    series: [{
      type: 'pie', radius: ['46%', '74%'], center: ['50%', '46%'], roseType: 'radius',
      itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2, borderRadius: 4 },
      label: { show: false }, emphasis: { scale: true, scaleSize: 6, label: { show: true, formatter: '{b}\n{d}%', color: cssVar('--text-1'), fontSize: 12, fontWeight: 700 } },
      data: [
        { name: '正面', value: 68, itemStyle: { color: cssVar('--emerald') } },
        { name: '中性', value: 22, itemStyle: { color: cssVar('--c3') } },
        { name: '负面', value: 10, itemStyle: { color: cssVar('--danger') } },
      ],
      ...ANIM,
    }],
  };
};

const selfChart = () => {
  const b = baseOption();
  const d = [
    { model: 'L6', pct: 92, color: cssVar('--c2') },
    { model: 'L9', pct: 96, color: cssVar('--c1') },
    { model: 'L8', pct: 91, color: cssVar('--c3') },
    { model: 'MEGA', pct: 77, color: cssVar('--c6') },
    { model: 'L7', pct: 78, color: cssVar('--c5') },
  ].sort((a, x) => a.pct - x.pct);
  return {
    ...b,
    grid: { left: 8, right: 46, top: 8, bottom: 6, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}　完成率 <b>${p[0].value}%</b>` },
    xAxis: { type: 'value', max: 110, axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: d.map(x => x.model), ...axisStyle(), axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', barWidth: 15,
      data: d.map(x => ({ value: x.pct, itemStyle: { color: x.color, borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', formatter: '{c}%', color: cssVar('--text-2'), fontSize: 11, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

const CHART_BY_KEY: Record<string, () => Record<string, unknown>> = {
  macro: macroChart, industry: industryChart, competitor: competitorChart, customer: customerChart, self: selfChart,
};

export default function Market() {
  const [active, setActive] = useState(MARKET_VIEWS[0].key);
  const view = MARKET_VIEWS.find(v => v.key === active) ?? MARKET_VIEWS[0];
  const meta = VIEW_META[active];
  const activeIdx = MARKET_VIEWS.findIndex(v => v.key === active);

  return (
    <div className="page">
      <PageHeader
        title="市场五看"
        subtitle="看宏观 · 看行业 · 看竞品 · 看客户 · 看自身 — 销售策略标准分析框架"
        actions={<Badge color="var(--gold)"><Sparkles size={12} /> 2026 Q2 · 策略复盘视图</Badge>}
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: '232px 1fr', alignItems: 'start' }}>
        {/* ── 左侧 五看 导航栏 ── */}
        <Card className="card-pad-0 reveal reveal-1" style={{ padding: 8 }}>
          <div className="label" style={{ padding: '10px 12px 8px' }}>五看框架</div>
          <div className="col gap-1">
            {MARKET_VIEWS.map((v, i) => {
              const on = v.key === active;
              return (
                <button
                  key={v.key}
                  onClick={() => setActive(v.key)}
                  className="row gap-3"
                  style={{
                    padding: '11px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: '1px solid transparent', width: '100%',
                    background: on ? 'var(--gold-glow)' : 'transparent',
                    borderColor: on ? 'var(--hairline-strong)' : 'transparent',
                    transition: 'all var(--dur-micro) var(--ease)',
                  }}
                >
                  <span style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: on ? 'linear-gradient(135deg, var(--gold), var(--bronze))' : 'var(--surface-3)',
                    color: on ? 'var(--text-inverse)' : 'var(--text-3)',
                  }}>{VIEW_META[v.key].icon}</span>
                  <span className="col" style={{ gap: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: on ? 'var(--text-1)' : 'var(--text-2)' }}>{v.title}</span>
                    <span className="t-small text-3" style={{ fontSize: 11 }}>0{i + 1} · {VIEW_META[v.key].tagline.split(' · ')[1]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── 右侧 详情面板 ── */}
        <div className="col gap-4" key={active}>
          {/* 洞察卡 */}
          <Card className="reveal reveal-1">
            <div className="row gap-3" style={{ marginBottom: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--gold), var(--bronze))', color: 'var(--text-inverse)', flexShrink: 0 }}>{meta.icon}</span>
              <div>
                <div className="row gap-2">
                  <span className="t-h2" style={{ color: 'var(--text-1)' }}>{view.title}</span>
                  <span className="label" style={{ color: 'var(--gold)' }}>0{activeIdx + 1} / 05</span>
                </div>
                <div className="t-small text-3">{meta.tagline}</div>
              </div>
            </div>
            <div className="row gap-3" style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--surface-2)', borderLeft: '3px solid var(--gold)', alignItems: 'flex-start' }}>
              <Quote size={16} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
              <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text-1)', fontWeight: 500 }}>{view.insight}</p>
            </div>
          </Card>

          {/* 关键指标 */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${view.metrics.length}, 1fr)` }}>
            {view.metrics.map((m, i) => (
              <Card key={m.label} className={`card-hover reveal reveal-${Math.min(i + 2, 6)}`}>
                <div className="label" style={{ marginBottom: 8 }}>{m.label}</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{m.value}</div>
                {m.change !== undefined && (
                  <div className="row gap-1 tnum" style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: m.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {m.change >= 0 ? '▲' : '▼'} {Math.abs(m.change)}{Number.isInteger(m.change) && Math.abs(m.change) > 5 ? '' : 'pt'} <span className="text-3" style={{ fontWeight: 400 }}>环比</span>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* 自适应图表 */}
          <Card className="reveal reveal-3">
            <SectionTitle right={<span className="t-small text-3">{view.title} · 数据视图</span>}>{meta.chartTitle}</SectionTitle>
            <Chart build={CHART_BY_KEY[active]} height={280} deps={[active]} />
          </Card>
        </div>
      </div>
    </div>
  );
}
