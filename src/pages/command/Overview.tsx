import { useEffect, useState } from 'react';
import { Target, Truck, TrendingUp, Users2, Gauge, Wallet, AlertTriangle, Radio } from 'lucide-react';
import { Card, PageHeader, StatCard, SectionTitle, Badge } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { METRICS, FUNNEL, TREND, MODEL_PROGRESS, REGIONS, ALERTS } from '../../lib/mockData';

const ICONS = [<Target size={16} />, <Truck size={16} />, <TrendingUp size={16} />, <Users2 size={16} />, <Gauge size={16} />, <Wallet size={16} />];

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const s = `2026-05-29 ${t.toLocaleTimeString('zh-CN', { hour12: false })}`;
  return (
    <span className="row gap-2 t-small text-3" style={{ letterSpacing: '0.03em' }}>
      <span className="dot-pulse" style={{ background: 'var(--emerald)' }} />实时更新 · {s}
    </span>
  );
}

const trendOption = () => {
  const b = baseOption();
  const m = TREND.filter(t => t.orders > 0);
  const grad = (c: string) => ({ type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: c }, { offset: 1, color: 'transparent' }] });
  return {
    ...b,
    legend: { data: ['订单', '交付'], top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 12 } },
    tooltip: { ...(b.tooltip as object), trigger: 'axis' },
    grid: { left: 8, right: 14, top: 38, bottom: 6, containLabel: true },
    xAxis: { type: 'category', data: m.map(x => x.date), ...axisStyle(), splitLine: { show: false } },
    yAxis: { type: 'value', ...axisStyle() },
    series: [
      { name: '订单', type: 'line', smooth: true, data: m.map(x => x.orders), symbol: 'circle', symbolSize: 7, lineStyle: { width: 3, color: cssVar('--gold') }, itemStyle: { color: cssVar('--gold') }, areaStyle: { color: grad('rgba(90,168,255,0.30)') }, ...ANIM },
      { name: '交付', type: 'line', smooth: true, data: m.map(x => x.delivery), symbol: 'circle', symbolSize: 7, lineStyle: { width: 3, color: cssVar('--emerald') }, itemStyle: { color: cssVar('--emerald') }, areaStyle: { color: grad('rgba(47,216,192,0.22)') }, ...ANIM },
    ],
  };
};

const funnelOption = () => {
  const b = baseOption();
  const colors = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6'].map(cssVar);
  return {
    ...b,
    tooltip: { ...(b.tooltip as object), trigger: 'item', formatter: '{b}<br/><b>{c}</b>' },
    series: [{
      type: 'funnel', top: 8, bottom: 8, left: '6%', right: '6%', minSize: '28%', maxSize: '100%', sort: 'descending', gap: 3,
      label: { show: true, position: 'inside', color: '#0b0d11', fontWeight: 600, fontSize: 12, formatter: '{b} {c}' },
      labelLine: { show: false }, itemStyle: { borderWidth: 0, borderRadius: 4 },
      emphasis: { label: { fontSize: 13 } },
      data: FUNNEL.map((f, i) => ({ value: f.value, name: f.stage, itemStyle: { color: colors[i] } })),
      ...ANIM,
    }],
  };
};

const modelOption = () => {
  const b = baseOption();
  const d = MODEL_PROGRESS.map(m => ({ ...m, pct: Math.round((m.actual / m.target) * 100) })).reverse();
  return {
    ...b,
    grid: { left: 8, right: 46, top: 8, bottom: 6, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}　完成率 <b>${p[0].value}%</b>` },
    xAxis: { type: 'value', max: 110, axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: d.map(x => x.model), ...axisStyle(), axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', barWidth: 13,
      data: d.map(x => ({ value: x.pct, itemStyle: { color: x.color, borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', formatter: '{c}%', color: cssVar('--text-2'), fontSize: 11, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

const radarOption = () => {
  const b = baseOption();
  return {
    ...b,
    legend: { data: ['理想 L9', '问界 M9'], top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 12 } },
    radar: {
      indicator: [{ name: '空间' }, { name: '智驾' }, { name: '续航' }, { name: '价格力' }, { name: '品牌' }, { name: '服务' }].map(i => ({ ...i, max: 100 })),
      center: ['50%', '56%'], radius: '64%',
      axisName: { color: cssVar('--text-3'), fontSize: 11 },
      splitLine: { lineStyle: { color: cssVar('--hairline') } },
      splitArea: { show: false }, axisLine: { lineStyle: { color: cssVar('--hairline') } },
    },
    series: [{
      type: 'radar', ...ANIM,
      data: [
        { value: [95, 82, 88, 70, 92, 90], name: '理想 L9', areaStyle: { color: 'rgba(90,168,255,0.22)' }, lineStyle: { color: cssVar('--gold'), width: 2 }, itemStyle: { color: cssVar('--gold') } },
        { value: [88, 93, 90, 78, 85, 80], name: '问界 M9', areaStyle: { color: 'rgba(232,145,58,0.14)' }, lineStyle: { color: '#E8913A', width: 2 }, itemStyle: { color: '#E8913A' } },
      ],
    }],
  };
};

const regionOption = () => {
  const b = baseOption();
  return {
    ...b,
    legend: { data: ['订单量', '完成率'], top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 12 } },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 8, top: 38, bottom: 6, containLabel: true },
    xAxis: { type: 'category', data: REGIONS.map(r => r.region), ...axisStyle(), splitLine: { show: false } },
    yAxis: [
      { type: 'value', ...axisStyle() },
      { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: cssVar('--text-3'), fontSize: 11 }, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
    ],
    series: [
      { name: '订单量', type: 'bar', barWidth: '46%', data: REGIONS.map(r => r.orders), itemStyle: { color: cssVar('--c3'), borderRadius: [4, 4, 0, 0] }, ...ANIM },
      { name: '完成率', type: 'line', yAxisIndex: 1, smooth: true, data: REGIONS.map(r => r.completion), lineStyle: { color: cssVar('--gold'), width: 2 }, itemStyle: { color: cssVar('--gold') }, symbol: 'circle', symbolSize: 6, ...ANIM },
    ],
  };
};

const LEVEL = { danger: 'var(--danger)', warn: 'var(--warning)', info: 'var(--info)' } as const;

export default function Overview() {
  return (
    <div className="page">
      <PageHeader title="指挥大屏" subtitle="2026年5月 · 理想汽车销售策略全局视图" actions={<LiveClock />} />

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(186px, 1fr))', gap: 12, marginBottom: 16 }}>
        {METRICS.map((m, i) => (
          <StatCard key={m.label} label={m.label} raw={m.raw} unit={m.unit} change={m.change} spark={m.spark} icon={ICONS[i]} delayClass={`reveal-${Math.min(i + 1, 6)}`} />
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.7fr 1fr', marginBottom: 16 }}>
        <Card className="reveal reveal-1"><SectionTitle>订单 / 交付趋势（台）</SectionTitle><Chart build={trendOption} height={264} /></Card>
        <Card className="reveal reveal-2"><SectionTitle>销售转化漏斗</SectionTitle><Chart build={funnelOption} height={264} /></Card>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
        <Card className="reveal reveal-3"><SectionTitle>车型目标完成率</SectionTitle><Chart build={modelOption} height={232} /></Card>
        <Card className="reveal reveal-4"><SectionTitle>竞争态势 · L9 vs 问界 M9</SectionTitle><Chart build={radarOption} height={232} /></Card>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <Card className="reveal reveal-5"><SectionTitle>区域表现 · 订单量 vs 完成率</SectionTitle><Chart build={regionOption} height={244} /></Card>
        <Card className="reveal reveal-6">
          <SectionTitle right={<Badge color="var(--danger)">{ALERTS.length} 条</Badge>}>风险预警 & 行动提示</SectionTitle>
          <div className="col gap-2">
            {ALERTS.map((a, i) => (
              <div key={i} className="row gap-3" style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', borderLeft: `3px solid ${LEVEL[a.level]}`, alignItems: 'flex-start' }}>
                <AlertTriangle size={14} style={{ color: LEVEL[a.level], flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <div className="row spread" style={{ marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{a.title}</span>
                    <span className="tag" style={{ fontSize: 10 }}>{a.tag}</span>
                  </div>
                  <div className="t-small text-3" style={{ lineHeight: 1.5 }}>{a.msg}</div>
                </div>
              </div>
            ))}
            <div className="row gap-2" style={{ marginTop: 4, color: 'var(--text-3)', fontSize: 11 }}>
              <Radio size={12} /> 预警基于指标平台 + 竞品库 + 补贴库实时计算
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
