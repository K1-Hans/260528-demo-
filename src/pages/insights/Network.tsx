import { useMemo, useState } from 'react';
import {
  Store, MapPin, Swords, Crosshair, Building2, ArrowUpDown,
  TrendingUp, Target, Sparkles, Navigation,
} from 'lucide-react';
import { Card, PageHeader, StatCard, SectionTitle, Badge, Segmented, ProgressBar } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM, BRAND_COLORS } from '../../lib/chartTheme';
import { COMPETITOR_STORES, REGIONS } from '../../lib/mockData';

const fmt = (n: number) => n.toLocaleString('zh-CN');
const SELF = BRAND_COLORS['理想']; // 金色 = 我方品牌锁定色

// ── 城市级派生模型 ───────────────────────────────────────────────────────────
// 仅本地推导：以 COMPETITOR_STORES 的城市为面板，按各城市竞品强度反推我方覆盖。
interface CityRow {
  city: string;
  region: string;
  ours: number;        // 我方门店
  rival: number;       // 竞品门店合计
  rivalBrands: number; // 出现的竞品品牌数
  coverage: number;    // 覆盖率（我方 / 当地市场容量）
  traffic: number;     // 客流指数 0-100
  conversion: number;  // 转化指数 %
  whitespace: boolean; // 覆盖空白（竞品多、我方少）
}

// 城市 → 大区映射（本地常识，无外部依赖）
const CITY_REGION: Record<string, string> = {
  上海: '华东', 杭州: '华东', 深圳: '华南', 广州: '华南',
  北京: '华北', 武汉: '华中', 成都: '西南',
};

const CITY_ROWS: CityRow[] = (() => {
  const cities = Array.from(new Set(COMPETITOR_STORES.map(s => s.city)));
  return cities.map(city => {
    const inCity = COMPETITOR_STORES.filter(s => s.city === city);
    const rival = inCity.reduce((sum, s) => sum + s.count, 0);
    const rivalBrands = inCity.length;
    // 我方门店：以竞品规模为锚，做克制反推（一线足、新一线偏弱），确定性非随机。
    const tier1 = ['上海', '北京', '广州', '深圳'].includes(city);
    const ours = Math.max(6, Math.round(rival * (tier1 ? 0.58 : 0.34)));
    const capacity = rival + ours + Math.round(rival * 0.4); // 估算市场可容纳总量
    const coverage = Math.round((ours / capacity) * 100);
    // 客流指数：城市能级 + 竞品热度；转化：覆盖越足 + 客流越高 → 越高。
    const traffic = Math.min(98, 46 + rival + (tier1 ? 14 : 0) + rivalBrands * 3);
    const conversion = Math.min(46, Math.round(18 + coverage * 0.32 + (traffic - 60) * 0.18));
    const whitespace = coverage < 26 && rival >= 30;
    return { city, region: CITY_REGION[city] ?? '其他', ours, rival, rivalBrands, coverage, traffic, conversion, whitespace };
  });
})();

const OUR_TOTAL = CITY_ROWS.reduce((s, c) => s + c.ours, 0);
const RIVAL_TOTAL = COMPETITOR_STORES.reduce((s, c) => s + c.count, 0);
const COVERED_CITIES = CITY_ROWS.length;
const WHITESPACE_CITIES = CITY_ROWS.filter(c => c.whitespace).length;

// ── 选址机会评分（覆盖缺口 × 客流 × 转化潜力）─────────────────────────────────
interface SiteRec {
  city: string; region: string; score: number; gap: number;
  traffic: number; reason: string; conversion: number; rival: number; ours: number;
}
const SITE_RECS: SiteRec[] = [...CITY_ROWS]
  .map(c => {
    const gap = Math.max(0, c.rival - c.ours);
    const score = Math.round(gap * 1.6 + c.traffic * 0.5 + c.conversion * 0.6);
    const reason = c.whitespace
      ? `竞品 ${c.rival} 店强压、我方仅 ${c.ours} 店，覆盖率 ${c.coverage}% 偏低，客流指数 ${c.traffic} 高位 — 优先补点`
      : `客流指数 ${c.traffic}、转化潜力 ${c.conversion}%，缺口 ${gap} 店，建议加密直营触点`;
    return { city: c.city, region: c.region, score, gap, traffic: c.traffic, conversion: c.conversion, reason, rival: c.rival, ours: c.ours };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 4);

// ── chart: 各城市 我方 vs 竞品 门店数对比 (分组柱) ────────────────────────────
const compareOption = () => {
  const b = baseOption();
  const d = [...CITY_ROWS].sort((a, x) => (x.ours + x.rival) - (a.ours + a.rival));
  return {
    ...b,
    legend: { data: ['理想门店', '竞品门店'], top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 11 } },
    grid: { left: 8, right: 14, top: 34, bottom: 6, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: d.map(x => x.city), ...axisStyle(), splitLine: { show: false } },
    yAxis: { type: 'value', name: '门店数', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle() },
    series: [
      { name: '理想门店', type: 'bar', barWidth: '30%', barGap: '12%', data: d.map(x => x.ours), itemStyle: { color: SELF, borderRadius: [4, 4, 0, 0] }, ...ANIM },
      { name: '竞品门店', type: 'bar', barWidth: '30%', data: d.map(x => x.rival), itemStyle: { color: cssVar('--c8'), borderRadius: [4, 4, 0, 0] }, ...ANIM },
    ],
  };
};

// ── chart: 客流 × 转化 气泡 (size = 门店总数, 空白城市描金) ────────────────────
const bubbleOption = () => {
  const b = baseOption();
  return {
    ...b,
    grid: { left: 8, right: 18, top: 24, bottom: 6, containLabel: true },
    tooltip: {
      ...(b.tooltip as object), trigger: 'item',
      formatter: (p: { data: { name: string; value: number[] } }) =>
        `<b>${p.data.name}</b><br/>客流指数 ${p.data.value[0]}<br/>转化 ${p.data.value[1]}%<br/>门店合计 ${p.data.value[2]}`,
    },
    xAxis: { type: 'value', name: '客流指数', min: 40, max: 100, nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle(), splitLine: { show: true, lineStyle: { color: cssVar('--hairline'), type: 'dashed' } } },
    yAxis: { type: 'value', name: '转化 %', min: 14, max: 48, nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle() },
    series: [{
      type: 'scatter',
      symbolSize: (v: number[]) => Math.max(16, Math.sqrt(v[2]) * 4.4),
      label: { show: true, formatter: (p: { data: { name: string } }) => p.data.name, position: 'top', color: cssVar('--text-3'), fontSize: 10 },
      data: CITY_ROWS.map(c => ({
        name: c.city,
        value: [c.traffic, c.conversion, c.ours + c.rival],
        itemStyle: {
          color: c.whitespace ? SELF : cssVar('--c2'),
          opacity: c.whitespace ? 0.92 : 0.66,
          borderColor: c.whitespace ? cssVar('--gold-bright') : cssVar('--surface-1'),
          borderWidth: c.whitespace ? 2 : 1,
        },
      })),
      ...ANIM,
    }],
  };
};

type SortKey = 'ours' | 'rival' | 'coverage' | 'traffic' | 'conversion';

export default function Network() {
  const [chartView, setChartView] = useState<'compare' | 'bubble'>('compare');
  const [sortKey, setSortKey] = useState<SortKey>('rival');
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    return [...CITY_ROWS].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      return asc ? av - bv : bv - av;
    });
  }, [sortKey, asc]);

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
        title="门店网络优化"
        subtitle="2026年5月 · 客流 × 转化 × 覆盖空白 · 选址建议"
        actions={<Badge color="var(--info)"><Building2 size={12} /> 城市覆盖模型 · 实时推演</Badge>}
      />

      {/* ── KPI 行 ── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="我方门店总数" raw={OUR_TOTAL} unit="家" icon={<Store size={16} />} delayClass="reveal-1" />
        <StatCard label="覆盖城市" raw={COVERED_CITIES} unit="城" icon={<MapPin size={16} />} delayClass="reveal-2" />
        <StatCard label="竞品门店数" raw={RIVAL_TOTAL} unit="家" icon={<Swords size={16} />} delayClass="reveal-3" />
        <StatCard label="覆盖空白城市" raw={WHITESPACE_CITIES} unit="城" icon={<Crosshair size={16} />} delayClass="reveal-4" />
      </div>

      {/* ── 门店对比 / 客流转化图表 ── */}
      <Card className="reveal reveal-2" style={{ marginBottom: 16 }}>
        <SectionTitle right={<Segmented value={chartView} onChange={setChartView} options={[{ value: 'compare', label: '门店对比' }, { value: 'bubble', label: '客流 × 转化' }]} />}>
          {chartView === 'compare' ? '各城市 · 理想 vs 竞品 门店数' : '客流 × 转化分布（气泡 = 门店密度，金色 = 空白机会）'}
        </SectionTitle>
        <Chart build={chartView === 'compare' ? compareOption : bubbleOption} height={300} deps={[chartView]} />
      </Card>

      {/* ── 城市覆盖明细表 ── */}
      <Card className="card-pad-0 reveal reveal-3" style={{ marginBottom: 16 }}>
        <div className="spread wrap gap-3" style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
          <SectionTitle right={<span className="t-small text-3 tnum">{rows.length} 城 · 空白 {WHITESPACE_CITIES} 城待补点</span>}>城市覆盖与机会分析</SectionTitle>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>城市</th>
                <th>大区</th>
                <Th k="ours" label="理想门店" />
                <Th k="rival" label="竞品门店" />
                <Th k="coverage" label="覆盖率" />
                <Th k="traffic" label="客流指数" />
                <Th k="conversion" label="转化" />
                <th>机会标识</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.city}>
                  <td>
                    <span className="row gap-2">
                      <MapPin size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{c.city}</span>
                    </span>
                  </td>
                  <td><span className="tag">{c.region}</span></td>
                  <td className="td-num" style={{ color: 'var(--gold)', fontWeight: 700 }}>{c.ours}</td>
                  <td className="td-num text-2" style={{ fontWeight: 600 }}>{c.rival}</td>
                  <td className="td-num" style={{ minWidth: 120 }}>
                    <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
                      <span style={{ color: 'var(--text-1)', fontWeight: 600, width: 36, textAlign: 'right' }}>{c.coverage}%</span>
                      <span style={{ width: 56 }}><ProgressBar pct={c.coverage} color={c.coverage < 26 ? 'var(--danger)' : c.coverage < 40 ? 'var(--warning)' : 'var(--emerald)'} height={5} /></span>
                    </div>
                  </td>
                  <td className="td-num" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{c.traffic}</td>
                  <td className="td-num text-2" style={{ fontWeight: 600 }}>{c.conversion}%</td>
                  <td>
                    {c.whitespace
                      ? <Badge color="var(--danger)"><Crosshair size={11} /> 覆盖空白</Badge>
                      : c.coverage < 40
                        ? <Badge color="var(--warning)"><Target size={11} /> 加密机会</Badge>
                        : <Badge color="var(--emerald)"><TrendingUp size={11} /> 覆盖充足</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 选址建议 ── */}
      <div className="spread" style={{ marginBottom: 12 }}>
        <span className="row gap-2 label"><Sparkles size={13} style={{ color: 'var(--gold)' }} />智能选址建议 · TOP {SITE_RECS.length} 机会城市</span>
        <span className="t-small text-3">基于覆盖缺口 × 客流 × 转化潜力综合评分</span>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(264px, 1fr))', marginBottom: 16 }}>
        {SITE_RECS.map((s, i) => (
          <Card key={s.city} className={`card-hover reveal reveal-${Math.min(i + 1, 6)}`}>
            <div className="stripe-top" style={{ background: `linear-gradient(90deg, ${SELF}, transparent)` }} />
            <div className="spread" style={{ marginBottom: 12 }}>
              <span className="row gap-2">
                <span className="row" style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--gold-dim)', color: 'var(--gold)', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{s.city}</span>
                <span className="tag">{s.region}</span>
              </span>
              <Navigation size={15} style={{ color: 'var(--gold)', opacity: 0.7 }} />
            </div>
            <div className="row gap-4" style={{ marginBottom: 12 }}>
              <div>
                <div className="label" style={{ marginBottom: 3 }}>机会评分</div>
                <div className="kpi-value" style={{ fontSize: 24, color: 'var(--gold)' }}>{s.score}</div>
              </div>
              <div className="divider" style={{ width: 1, height: 36, margin: 0 }} />
              <div className="col gap-1 flex-1">
                <span className="row spread t-small"><span className="text-3">覆盖缺口</span><span className="tnum text-2" style={{ fontWeight: 600 }}>{s.gap} 店（竞 {s.rival} / 我 {s.ours}）</span></span>
                <span className="row spread t-small"><span className="text-3">客流指数</span><span className="tnum text-2" style={{ fontWeight: 600 }}>{s.traffic}</span></span>
                <span className="row spread t-small"><span className="text-3">转化潜力</span><span className="tnum text-2" style={{ fontWeight: 600 }}>{s.conversion}%</span></span>
              </div>
            </div>
            <div className="t-small text-3" style={{ lineHeight: 1.6, paddingTop: 10, borderTop: '1px solid var(--hairline)' }}>{s.reason}</div>
          </Card>
        ))}
      </div>

      {/* ── 大区订单兜底参照 ── */}
      <Card className="reveal reveal-5">
        <SectionTitle right={<span className="t-small text-3">门店覆盖与区域产出对照</span>}>大区门店投放与订单产出</SectionTitle>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {REGIONS.map(r => (
            <div key={r.region} className="col gap-2" style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
              <span className="row spread">
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.region}</span>
                <span className="tag">{r.completion}%</span>
              </span>
              <span className="kpi-value" style={{ fontSize: 20 }}>{fmt(r.orders)}<span className="kpi-unit">订单</span></span>
              <ProgressBar pct={r.completion} color={r.completion < 80 ? 'var(--warning)' : 'var(--emerald)'} height={5} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
