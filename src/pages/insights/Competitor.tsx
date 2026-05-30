import { useMemo, useState } from 'react';
import { Crown, Search, ArrowUpDown, Store, FileSpreadsheet, Globe } from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, TrendChip, Sparkline, Segmented } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM, BRAND_COLORS } from '../../lib/chartTheme';
import { COMPETITORS, COMPETITOR_STORES } from '../../lib/mockData';
import type { CompetitorModel } from '../../types';

const fmtVol = (n: number) => n.toLocaleString('zh-CN');
const brandColor = (b: string) => BRAND_COLORS[b] ?? cssVar('--c8');

// ── derived: segment options + brand ranking ─────────────────────────────────
const SEGMENTS = ['全部', ...Array.from(new Set(COMPETITORS.map(c => c.segment)))];
type SortKey = 'monthlyVolume' | 'price' | 'range' | 'trendPct';

// ── chart: 竞品月销排名（horizontal bar, 品牌色）──────────────────────────────
const rankOption = () => {
  const b = baseOption();
  const d = [...COMPETITORS]
    .sort((a, x) => (a.monthlyVolume ?? 0) - (x.monthlyVolume ?? 0));
  return {
    ...b,
    grid: { left: 8, right: 58, top: 8, bottom: 6, containLabel: true },
    tooltip: {
      ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (p: { name: string; value: number; marker: string }[]) =>
        `${p[0].name}<br/>${p[0].marker}月销 <b>${fmtVol(p[0].value)}</b> 台`,
    },
    xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: {
      type: 'category', data: d.map(x => `${x.brand} ${x.model}`), ...axisStyle(),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { ...axisStyle().axisLabel, color: cssVar('--text-2') },
    },
    series: [{
      type: 'bar', barWidth: 13,
      data: d.map(x => ({ value: x.monthlyVolume ?? 0, itemStyle: { color: brandColor(x.brand), borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', formatter: (p: { value: number }) => fmtVol(p.value), color: cssVar('--text-3'), fontSize: 11, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

// ── chart: 价格-销量 散点（气泡 = 续航）───────────────────────────────────────
const scatterOption = () => {
  const b = baseOption();
  const byBrand = Array.from(new Set(COMPETITORS.map(c => c.brand)));
  return {
    ...b,
    legend: { data: byBrand, top: 0, right: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: cssVar('--text-2'), fontSize: 11 } },
    grid: { left: 8, right: 14, top: 34, bottom: 6, containLabel: true },
    tooltip: {
      ...(b.tooltip as object), trigger: 'item',
      formatter: (p: { data: { name: string; value: number[] } }) =>
        `<b>${p.data.name}</b><br/>价格 ${(p.data.value[0] / 10000).toFixed(1)} 万<br/>月销 ${fmtVol(p.data.value[1])} 台<br/>续航 ${p.data.value[2]} km`,
    },
    xAxis: { type: 'value', name: '价格(万)', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle(), axisLabel: { formatter: (v: number) => (v / 10000).toFixed(0), color: cssVar('--text-3'), fontSize: 11 }, splitLine: { show: true, lineStyle: { color: cssVar('--hairline'), type: 'dashed' } } },
    yAxis: { type: 'value', name: '月销(台)', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle() },
    series: byBrand.map(brand => ({
      name: brand, type: 'scatter', symbolSize: (v: number[]) => Math.max(12, Math.sqrt(v[2]) * 0.9),
      itemStyle: { color: brandColor(brand), opacity: 0.85, borderColor: cssVar('--surface-1'), borderWidth: 1 },
      data: COMPETITORS.filter(c => c.brand === brand).map(c => ({ name: `${c.brand} ${c.model}`, value: [c.price, c.monthlyVolume ?? 0, c.range ?? 0] })),
      ...ANIM,
    })),
  };
};

// ── chart: 竞品门店分布（堆叠条形 by city × brand）────────────────────────────
const storeOption = () => {
  const b = baseOption();
  const cities = Array.from(new Set(COMPETITOR_STORES.map(s => s.city)));
  const brands = Array.from(new Set(COMPETITOR_STORES.map(s => s.brand)));
  return {
    ...b,
    legend: { data: brands, top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 11 } },
    grid: { left: 8, right: 12, top: 34, bottom: 6, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: cities, ...axisStyle(), splitLine: { show: false } },
    yAxis: { type: 'value', name: '门店数', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle() },
    series: brands.map(brand => ({
      name: brand, type: 'bar', stack: 'total', barWidth: '52%',
      itemStyle: { color: brandColor(brand), borderRadius: [3, 3, 0, 0] },
      data: cities.map(city => COMPETITOR_STORES.find(s => s.city === city && s.brand === brand)?.count ?? 0),
      ...ANIM,
    })),
  };
};

function BrandDot({ brand }: { brand: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: brandColor(brand), display: 'inline-block', flexShrink: 0, boxShadow: `0 0 0 3px color-mix(in srgb, ${brandColor(brand)} 18%, transparent)` }} />;
}

export default function Competitor() {
  const [chartView, setChartView] = useState<'rank' | 'scatter'>('rank');
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('全部');
  const [sortKey, setSortKey] = useState<SortKey>('monthlyVolume');
  const [asc, setAsc] = useState(false);

  // TOP 3 by volume
  const top3 = useMemo(
    () => [...COMPETITORS].sort((a, b) => (b.monthlyVolume ?? 0) - (a.monthlyVolume ?? 0)).slice(0, 3),
    [],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMPETITORS
      .filter(c => segment === '全部' || c.segment === segment)
      .filter(c => !q || `${c.brand}${c.model}`.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q)))
      .sort((a, b) => {
        const av = (a[sortKey] ?? 0) as number, bv = (b[sortKey] ?? 0) as number;
        return asc ? av - bv : bv - av;
      });
  }, [query, segment, sortKey, asc]);

  const totalVol = COMPETITORS.reduce((s, c) => s + (c.monthlyVolume ?? 0), 0);
  const storeTotal = COMPETITOR_STORES.reduce((s, x) => s + x.count, 0);
  const storeNew = COMPETITOR_STORES.reduce((s, x) => s + x.newThisMonth, 0);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setAsc(!asc); else { setSortKey(k); setAsc(false); } };
  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="td-num" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(k)}>
      <span className="row gap-1" style={{ justifyContent: 'flex-end', color: sortKey === k ? 'var(--gold)' : undefined }}>
        {label}<ArrowUpDown size={11} style={{ opacity: sortKey === k ? 0.9 : 0.35 }} />
      </span>
    </th>
  );

  return (
    <div className="page">
      <PageHeader
        title="竞品数据看板"
        subtitle="2026年5月 · 主要竞品销量 / 价格 / 续航 / 门店监控"
        actions={<Badge color="var(--info)"><FileSpreadsheet size={12} /> 销量数据 · 手工Excel</Badge>}
      />

      {/* ── 销量 TOP ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 16 }}>
        {top3.map((c, i) => (
          <Card key={c.id} className={`card-hover reveal reveal-${i + 1}`}>
            <div className="spread" style={{ marginBottom: 10 }}>
              <span className="row gap-2 label"><Crown size={13} style={{ color: 'var(--gold)' }} />销量 TOP {i + 1}</span>
              <BrandDot brand={c.brand} />
            </div>
            <div className="row spread" style={{ alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{c.brand} {c.model}</div>
                <div className="kpi-value" style={{ fontSize: 26 }}>{fmtVol(c.monthlyVolume ?? 0)}<span className="kpi-unit">台/月</span></div>
                <div style={{ marginTop: 8 }}><TrendChip change={c.trendPct ?? 0} /></div>
              </div>
              <Sparkline data={c.spark ?? []} color={brandColor(c.brand)} />
            </div>
          </Card>
        ))}
      </div>

      {/* ── 排名/散点图表 ── */}
      <Card className="reveal reveal-2" style={{ marginBottom: 16 }}>
        <SectionTitle right={<Segmented value={chartView} onChange={setChartView} options={[{ value: 'rank', label: '月销排名' }, { value: 'scatter', label: '价格 × 销量' }]} />}>
          {chartView === 'rank' ? '竞品月销排名（台）' : '价格-销量分布（气泡 = 续航）'}
        </SectionTitle>
        <Chart build={chartView === 'rank' ? rankOption : scatterOption} height={300} deps={[chartView]} />
      </Card>

      {/* ── 竞品明细表 ── */}
      <Card className="card-pad-0 reveal reveal-3" style={{ marginBottom: 16 }}>
        <div className="spread wrap gap-3" style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
          <SectionTitle right={<span className="t-small text-3 tnum">{rows.length} 款 · 合计 {fmtVol(totalVol)} 台/月</span>}>竞品车型明细</SectionTitle>
        </div>
        <div className="spread wrap gap-3" style={{ padding: '12px 20px' }}>
          <div className="input-wrap" style={{ maxWidth: 260, flex: 1 }}>
            <Search size={14} className="input-icon" />
            <input className="input" placeholder="搜索品牌 / 车型 / 标签…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <Segmented value={segment} onChange={setSegment} options={SEGMENTS.map(s => ({ value: s, label: s }))} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>车型</th>
                <th>细分市场</th>
                <Th k="price" label="官方价(万)" />
                <Th k="range" label="续航(km)" />
                <Th k="monthlyVolume" label="月销(台)" />
                <Th k="trendPct" label="环比" />
                <th style={{ textAlign: 'center' }}>近6月趋势</th>
                <th>标签</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c: CompetitorModel) => (
                <tr key={c.id}>
                  <td>
                    <span className="row gap-2">
                      <BrandDot brand={c.brand} />
                      <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{c.brand}</span>
                      <span className="text-2">{c.model}</span>
                    </span>
                  </td>
                  <td><span className="tag">{c.segment}</span></td>
                  <td className="td-num" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{((c.price) / 10000).toFixed(1)}</td>
                  <td className="td-num">{c.range ?? '—'}</td>
                  <td className="td-num" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{fmtVol(c.monthlyVolume ?? 0)}</td>
                  <td className="td-num"><span className="row" style={{ justifyContent: 'flex-end' }}><TrendChip change={c.trendPct ?? 0} suffix="" /></span></td>
                  <td><span className="row" style={{ justifyContent: 'center' }}><Sparkline data={c.spark ?? []} width={72} height={24} color={brandColor(c.brand)} /></span></td>
                  <td><span className="row gap-1 wrap">{c.tags.map(t => <span key={t} className="tag">{t}</span>)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 竞品门店（官网抓取）── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <Card className="reveal reveal-4">
          <SectionTitle right={<Badge color="var(--emerald)"><Globe size={12} /> 官网抓取 · 自动更新</Badge>}>竞品门店分布 · 各城市</SectionTitle>
          <Chart build={storeOption} height={240} />
        </Card>
        <Card className="reveal reveal-5">
          <SectionTitle right={<span className="row gap-2 t-small text-3"><Store size={13} />共 {storeTotal} 店 · 本月新增 {storeNew}</span>}>门店明细</SectionTitle>
          <div className="col gap-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
            {[...COMPETITOR_STORES].sort((a, b) => b.count - a.count).map(s => (
              <div key={s.id} className="row spread" style={{ padding: '9px 12px', borderRadius: 10, background: 'var(--surface-2)' }}>
                <span className="row gap-2">
                  <BrandDot brand={s.brand} />
                  <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{s.brand}</span>
                  <span className="text-3 t-small">· {s.city}</span>
                </span>
                <span className="row gap-3">
                  {s.newThisMonth > 0 && <Badge color="var(--emerald)">+{s.newThisMonth} 新店</Badge>}
                  <span className="tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>{s.count}<span className="text-3" style={{ fontWeight: 400, fontSize: 11, marginLeft: 2 }}>店</span></span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
