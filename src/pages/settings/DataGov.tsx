import { useMemo, useState } from 'react';
import {
  Database, ShieldCheck, AlertTriangle, Activity, FileSpreadsheet, Cloud,
  Globe, Mic, GitBranch, ArrowRight, Search,
} from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, Segmented } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import './DataGov.css';

// ─── 来源类型（贴合 brief 数据层）────────────────────────────────────────────
type SourceType = '手工Excel' | '内部API' | '官网抓取' | '录音+社媒';
const SOURCE_META: Record<SourceType, { icon: React.ReactNode; color: string; risk: string }> = {
  '手工Excel': { icon: <FileSpreadsheet size={13} />, color: 'var(--warning)', risk: '人工录入·易滞后' },
  '内部API': { icon: <Cloud size={13} />, color: 'var(--emerald)', risk: '实时·稳定' },
  '官网抓取': { icon: <Globe size={13} />, color: 'var(--c3)', risk: '结构易变·需校验' },
  '录音+社媒': { icon: <Mic size={13} />, color: 'var(--c5)', risk: '非结构化·需清洗' },
};

type Health = 'green' | 'yellow' | 'red';
const HEALTH_META: Record<Health, { color: string; label: string }> = {
  green: { color: 'var(--success)', label: '健康' },
  yellow: { color: 'var(--warning)', label: '关注' },
  red: { color: 'var(--danger)', label: '异常' },
};

interface DataAsset {
  id: string; name: string; source: SourceType; cadence: string;
  lastUpdate: string; freshnessHrs: number; quality: number; anomaly?: string;
}

// ─── 数据资产清单（本地推导，映射 brief 9 个数据源）──────────────────────────
const ASSETS: DataAsset[] = [
  { id: 'a1', name: 'BP 年度目标', source: '手工Excel', cadence: '季度', lastUpdate: '2026-04-01', freshnessHrs: 1392, quality: 82, anomaly: '距上次更新 58 天，超季度阈值' },
  { id: 'a2', name: '经营数据（销量/交付）', source: '手工Excel', cadence: '每日', lastUpdate: '2026-05-29 08:10', freshnessHrs: 6, quality: 88 },
  { id: 'a3', name: '月度目标', source: '内部API', cadence: '实时', lastUpdate: '2026-05-29 13:55', freshnessHrs: 0.3, quality: 97 },
  { id: 'a4', name: '销售漏斗数据', source: '内部API', cadence: '实时', lastUpdate: '2026-05-29 13:50', freshnessHrs: 0.4, quality: 95 },
  { id: 'a5', name: '市场大盘指标', source: '内部API', cadence: '每日', lastUpdate: '2026-05-29 06:00', freshnessHrs: 8, quality: 91 },
  { id: 'a6', name: '竞品订单量', source: '手工Excel', cadence: '每周', lastUpdate: '2026-05-26', freshnessHrs: 78, quality: 74, anomaly: '问界 M9 单周环比跳变 +18%，待人工复核' },
  { id: 'a7', name: '竞品门店分布', source: '官网抓取', cadence: '每周', lastUpdate: '2026-05-28 02:30', freshnessHrs: 35, quality: 79, anomaly: '蔚来官网改版，3 个城市抓取字段缺失' },
  { id: 'a8', name: '用户声音（试驾录音+社媒）', source: '录音+社媒', cadence: '每日', lastUpdate: '2026-05-29 11:20', freshnessHrs: 3, quality: 86 },
  { id: 'a9', name: '地方补贴政策', source: '手工Excel', cadence: '不定期', lastUpdate: '2026-05-18', freshnessHrs: 270, quality: 80, anomaly: '重庆/武汉政策待生效，需人工跟进官方口径' },
];

// 新鲜度判级：依据更新频率给阈值，越界降级 ────────────────────────────────────
function healthOf(a: DataAsset): Health {
  if (a.anomaly && a.quality < 78) return 'red';
  const thresh: Record<string, number> = { 实时: 1, 每日: 24, 每周: 168, 季度: 2160, 不定期: 720 };
  const limit = thresh[a.cadence] ?? 168;
  if (a.freshnessHrs > limit) return a.freshnessHrs > limit * 1.5 ? 'red' : 'yellow';
  return a.quality >= 90 ? 'green' : 'yellow';
}

function freshnessText(hrs: number): string {
  if (hrs < 1) return `${Math.round(hrs * 60)} 分钟前`;
  if (hrs < 48) return `${Math.round(hrs)} 小时前`;
  return `${Math.round(hrs / 24)} 天前`;
}

const ASSETS_H = ASSETS.map(a => ({ ...a, health: healthOf(a) }));

// ─── 血缘：关键指标 ← 上游数据源 ─────────────────────────────────────────────
interface Lineage { metric: string; consumer: string; sources: { name: string; type: SourceType }[]; }
const LINEAGE: Lineage[] = [
  { metric: '指挥大屏 · 目标完成率', consumer: '指挥大屏', sources: [{ name: '月度目标', type: '内部API' }, { name: '经营数据', type: '手工Excel' }] },
  { metric: '转化漏斗诊断', consumer: '漏斗诊断', sources: [{ name: '销售漏斗数据', type: '内部API' }] },
  { metric: '竞争态势雷达', consumer: '竞品监控', sources: [{ name: '竞品订单量', type: '手工Excel' }, { name: '竞品门店分布', type: '官网抓取' }, { name: '市场大盘指标', type: '内部API' }] },
  { metric: '用户声音情感分析', consumer: 'VOC 看板', sources: [{ name: '用户声音', type: '录音+社媒' }] },
  { metric: '补贴落地价测算', consumer: '补贴地图', sources: [{ name: '地方补贴政策', type: '手工Excel' }, { name: '经营数据', type: '手工Excel' }] },
];

export default function DataGov() {
  const [view, setView] = useState<'all' | 'risk'>('all');
  const [query, setQuery] = useState('');

  const total = ASSETS_H.length;
  const healthy = ASSETS_H.filter(a => a.health === 'green').length;
  const abnormal = ASSETS_H.filter(a => a.health === 'red').length;
  const avgFresh = ASSETS_H.reduce((s, a) => s + Math.min(a.freshnessHrs / 24, 30), 0) / total;
  const avgQuality = Math.round(ASSETS_H.reduce((s, a) => s + a.quality, 0) / total);

  const KPIS = [
    { label: '数据源数', value: total, unit: '个', icon: <Database size={14} />, color: 'var(--gold)' },
    { label: '健康源数', value: healthy, unit: '个', icon: <ShieldCheck size={14} />, color: 'var(--success)' },
    { label: '异常源数', value: abnormal, unit: '个', icon: <AlertTriangle size={14} />, color: 'var(--danger)' },
    { label: '平均新鲜度', value: avgFresh.toFixed(1), unit: '天', icon: <Activity size={14} />, color: 'var(--c3)' },
  ];

  const filtered = useMemo(() => {
    const q = query.trim();
    return ASSETS_H.filter(a => {
      const matchView = view === 'all' || a.health !== 'green';
      const matchQuery = !q || a.name.includes(q) || a.source.includes(q);
      return matchView && matchQuery;
    });
  }, [view, query]);

  // ── 来源类型分布饼图 ──
  const sourcePieOption = () => {
    const b = baseOption();
    const counts = (Object.keys(SOURCE_META) as SourceType[]).map(t => ({
      name: t, value: ASSETS_H.filter(a => a.source === t).length, color: SOURCE_META[t].color,
    })).filter(d => d.value > 0);
    return {
      ...b,
      tooltip: { ...(b.tooltip as object), trigger: 'item', formatter: '{b}<br/><b>{c}</b> 个 · {d}%' },
      legend: { bottom: 0, left: 'center', icon: 'roundRect', itemWidth: 9, itemHeight: 9, textStyle: { color: cssVar('--text-2'), fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['46%', '70%'], center: ['50%', '44%'], avoidLabelOverlap: true,
        itemStyle: { borderColor: cssVar('--bg-base'), borderWidth: 3, borderRadius: 5 },
        label: { show: true, position: 'center', formatter: () => `${total}\n数据源`, color: cssVar('--text-2'), fontSize: 11, lineHeight: 18, rich: {} },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 700, color: cssVar('--text-1') } },
        labelLine: { show: false },
        data: counts.map(d => ({ value: d.value, name: d.name, itemStyle: { color: d.color } })),
        ...ANIM,
      }],
    };
  };

  // ── 质量分布柱图（按资产）──
  const qualityBarOption = () => {
    const b = baseOption();
    const d = [...ASSETS_H].sort((x, y) => y.quality - x.quality);
    return {
      ...b,
      tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}<br/>质量分 <b>${p[0].value}</b>` },
      grid: { left: 8, right: 12, top: 14, bottom: 6, containLabel: true },
      xAxis: { type: 'value', max: 100, axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
      yAxis: { type: 'category', data: d.map(x => x.name.length > 8 ? x.name.slice(0, 8) + '…' : x.name).reverse(), ...axisStyle(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: cssVar('--text-3'), fontSize: 10 } },
      series: [{
        type: 'bar', barWidth: 11,
        data: d.map(x => ({ value: x.quality, itemStyle: { color: x.quality >= 90 ? cssVar('--success') : x.quality >= 80 ? cssVar('--warning') : cssVar('--danger'), borderRadius: [0, 4, 4, 0] } })).reverse(),
        label: { show: true, position: 'right', formatter: '{c}', color: cssVar('--text-2'), fontSize: 10, fontWeight: 600 },
        ...ANIM,
      }],
    };
  };

  return (
    <div className="page">
      <PageHeader
        title="数据治理"
        subtitle="数据血缘 · 来源 · 新鲜度 · 质量标记 — 全系统决策的可信度底座"
        actions={<span className="row gap-2 t-small text-3"><span className="dot-pulse" style={{ background: 'var(--emerald)' }} />治理引擎 · 实时巡检中</span>}
      />

      {/* ── KPI row ── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {KPIS.map((k, i) => (
          <Card key={k.label} className={`card-hover reveal reveal-${i + 1}`}>
            <div className="spread" style={{ marginBottom: 10 }}>
              <span className="label">{k.label}</span>
              <span style={{ color: k.color, opacity: 0.7 }}>{k.icon}</span>
            </div>
            <div className="dg-kpi-num" style={{ color: k.color }}>{k.value}<span className="kpi-unit">{k.unit}</span></div>
          </Card>
        ))}
      </div>

      {/* ── charts ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.5fr', marginBottom: 16 }}>
        <Card className="reveal reveal-2"><SectionTitle right={<Badge color="var(--gold)">9 源</Badge>}>来源类型分布</SectionTitle><Chart build={sourcePieOption} height={236} /></Card>
        <Card className="reveal reveal-3"><SectionTitle right={<Badge color={avgQuality >= 85 ? 'var(--success)' : 'var(--warning)'}>均值 {avgQuality}</Badge>}>数据质量分布（按资产）</SectionTitle><Chart build={qualityBarOption} height={236} /></Card>
      </div>

      {/* ── data asset table ── */}
      <Card className="reveal reveal-4" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div className="row gap-3 spread" style={{ padding: '14px 20px', borderBottom: '1px solid var(--hairline)', background: 'var(--surface-2)' }}>
          <div className="row gap-3 flex-1">
            <div className="input-wrap" style={{ maxWidth: 260 }}>
              <Search size={14} className="input-icon" />
              <input className="input" placeholder="搜索资产名或来源…" value={query} onChange={e => setQuery(e.target.value)} style={{ width: 260 }} />
            </div>
            <Segmented
              options={[{ value: 'all', label: '全部资产' }, { value: 'risk', label: '仅异常/关注' }]}
              value={view}
              onChange={setView}
            />
          </div>
          <span className="label" style={{ flexShrink: 0 }}>共 <span className="tnum" style={{ color: 'var(--text-1)' }}>{filtered.length}</span> 项资产</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>数据资产</th>
                <th>来源类型</th>
                <th>更新频率</th>
                <th>最后更新</th>
                <th>新鲜度</th>
                <th className="td-num">质量分</th>
                <th>异常标记</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const sm = SOURCE_META[a.source];
                const hm = HEALTH_META[a.health];
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>{a.name}</div>
                      <div className="t-small text-3" style={{ marginTop: 1 }}>{sm.risk}</div>
                    </td>
                    <td>
                      <span className="dg-src" style={{ background: `color-mix(in srgb, ${sm.color} 13%, transparent)`, color: sm.color, borderColor: `color-mix(in srgb, ${sm.color} 30%, transparent)` }}>
                        {sm.icon}{a.source}
                      </span>
                    </td>
                    <td><span className="t-small text-2">{a.cadence}</span></td>
                    <td><span className="tnum t-small text-3">{a.lastUpdate}</span></td>
                    <td>
                      <span className="row gap-2 t-small" style={{ color: hm.color, fontWeight: 600 }}>
                        <span className="dg-dot" style={{ background: hm.color }} />
                        {freshnessText(a.freshnessHrs)}
                      </span>
                    </td>
                    <td className="td-num">
                      <span className="tnum" style={{ fontWeight: 700, color: a.quality >= 90 ? 'var(--success)' : a.quality >= 80 ? 'var(--text-1)' : 'var(--danger)' }}>{a.quality}</span>
                    </td>
                    <td>
                      {a.anomaly
                        ? <span className="row gap-1" style={{ color: 'var(--danger)', fontSize: 12, lineHeight: 1.4 }}><AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />{a.anomaly}</span>
                        : <span className="t-small" style={{ color: 'var(--success)' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="col" style={{ alignItems: 'center', padding: '48px 20px', color: 'var(--text-3)', gap: 8 }}>
                      <ShieldCheck size={28} strokeWidth={1.25} style={{ opacity: 0.3 }} />
                      <span className="t-small">{view === 'risk' ? '当前无异常或关注资产 · 数据层健康' : '未找到匹配资产'}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── lineage view ── */}
      <Card className="reveal reveal-5">
        <SectionTitle right={<span className="row gap-2 t-small text-3"><GitBranch size={13} />指标 ← 上游来源</span>}>数据血缘 · 决策指标溯源</SectionTitle>
        <div className="col gap-3">
          {LINEAGE.map(l => (
            <div key={l.metric} className="dg-lineage">
              {/* sources */}
              <div className="row gap-2 wrap" style={{ flex: 1, minWidth: 0 }}>
                {l.sources.map(s => {
                  const sm = SOURCE_META[s.type];
                  return (
                    <span key={s.name} className="dg-node" style={{ borderColor: `color-mix(in srgb, ${sm.color} 30%, transparent)` }}>
                      <span style={{ color: sm.color, display: 'inline-flex' }}>{sm.icon}</span>
                      <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{s.name}</span>
                      <span className="t-small" style={{ color: sm.color }}>{s.type}</span>
                    </span>
                  );
                })}
              </div>
              {/* arrow */}
              <ArrowRight size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              {/* consumer metric */}
              <span className="dg-consumer">
                <span className="dot-pulse" style={{ background: 'var(--gold)' }} />
                {l.metric}
              </span>
            </div>
          ))}
        </div>
        <div className="divider" />
        <div className="row gap-4 wrap t-small text-3">
          <span className="row gap-2"><span className="dg-dot" style={{ background: 'var(--success)' }} />健康（新鲜+高质）</span>
          <span className="row gap-2"><span className="dg-dot" style={{ background: 'var(--warning)' }} />关注（临期/中质）</span>
          <span className="row gap-2"><span className="dg-dot" style={{ background: 'var(--danger)' }} />异常（超期/低质/抓取断裂）</span>
          <span style={{ marginLeft: 'auto' }}>血缘断裂或上游异常将逐级标红下游指标，保障决策可信。</span>
        </div>
      </Card>
    </div>
  );
}
