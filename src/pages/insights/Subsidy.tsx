import { useMemo, useState } from 'react';
import { Search, MapPin, BadgeCheck, Clock, XCircle, Banknote, CalendarRange } from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, StatCard, Segmented, EmptyState } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { SUBSIDIES } from '../../lib/mockData';
import type { SubsidyPolicy } from '../../types';

type Status = SubsidyPolicy['status'];
type Filter = 'all' | Status;

const STATUS_META: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: '生效中', color: 'var(--emerald)', icon: <BadgeCheck size={12} /> },
  upcoming: { label: '即将生效', color: 'var(--warning)', icon: <Clock size={12} /> },
  expired: { label: '已过期', color: 'var(--text-3)', icon: <XCircle size={12} /> },
};

const fmtYuan = (n: number) => `¥${n.toLocaleString('zh-CN')}`;
const fmtRange = (a: string, b: string) => `${a.replace(/-/g, '.').slice(2)} – ${b.replace(/-/g, '.').slice(2)}`;

// ── chart: 各城市补贴金额（条形, 按状态着色, 含最高额浅色叠加）─────────────────
const amountOption = () => {
  const b = baseOption();
  const d = [...SUBSIDIES].sort((a, x) => x.amount - a.amount);
  const colorFor = (s: Status) =>
    s === 'active' ? cssVar('--emerald') : s === 'upcoming' ? cssVar('--warning') : cssVar('--text-3');
  return {
    ...b,
    grid: { left: 8, right: 16, top: 30, bottom: 6, containLabel: true },
    legend: {
      top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10,
      textStyle: { color: cssVar('--text-2'), fontSize: 11 }, data: ['当前补贴', '封顶额度'],
    },
    tooltip: {
      ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (p: { name: string }[]) => {
        const s = d.find(x => x.city === p[0].name);
        if (!s) return '';
        return `${s.city} · ${STATUS_META[s.status].label}<br/>补贴 <b>${fmtYuan(s.amount)}</b><br/>封顶 ${fmtYuan(s.maxAmount)}`;
      },
    },
    xAxis: { type: 'category', data: d.map(x => x.city), ...axisStyle(), splitLine: { show: false } },
    yAxis: { type: 'value', name: '元', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle(), axisLabel: { formatter: (v: number) => `${v / 1000}k`, color: cssVar('--text-3'), fontSize: 11 } },
    series: [
      {
        name: '封顶额度', type: 'bar', barGap: '-100%', barWidth: '48%', z: 1, silent: true,
        data: d.map(x => x.maxAmount), itemStyle: { color: cssVar('--surface-3'), borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '当前补贴', type: 'bar', barWidth: '48%', z: 2,
        data: d.map(x => ({ value: x.amount, itemStyle: { color: colorFor(x.status), borderRadius: [4, 4, 0, 0] } })),
        label: { show: true, position: 'top', formatter: (p: { value: number }) => `${(p.value / 1000).toFixed(0)}k`, color: cssVar('--text-3'), fontSize: 10, fontWeight: 600 },
        ...ANIM,
      },
    ],
  };
};

export default function Subsidy() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const active = SUBSIDIES.filter(s => s.status === 'active');
  const maxSub = SUBSIDIES.reduce((m, s) => Math.max(m, s.maxAmount), 0);
  const avg = Math.round(active.reduce((s, x) => s + x.amount, 0) / (active.length || 1));

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order: Record<Status, number> = { active: 0, upcoming: 1, expired: 2 };
    return SUBSIDIES
      .filter(s => filter === 'all' || s.status === filter)
      .filter(s => !q || `${s.city}${s.province}${s.source}`.toLowerCase().includes(q))
      .sort((a, b) => order[a.status] - order[b.status] || b.amount - a.amount);
  }, [query, filter]);

  return (
    <div className="page">
      <PageHeader
        title="地方补贴政策"
        subtitle="2026年5月 · 各城市新能源购车补贴实时数据库"
        actions={<Badge color="var(--info)"><MapPin size={12} /> 8 城在库 · 政府公开数据</Badge>}
      />

      {/* ── 概览指标 ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 16 }}>
        <StatCard label="生效中城市" raw={active.length} unit="城" icon={<BadgeCheck size={16} />} delayClass="reveal-1" />
        <StatCard label="最高补贴(封顶)" raw={maxSub} decimals={0} unit="元" icon={<Banknote size={16} />} delayClass="reveal-2" />
        <StatCard label="生效补贴均值" raw={avg} decimals={0} unit="元" icon={<CalendarRange size={16} />} delayClass="reveal-3" />
      </div>

      {/* ── 金额分布图 ── */}
      <Card className="reveal reveal-2" style={{ marginBottom: 16 }}>
        <SectionTitle right={
          <span className="row gap-3 t-small text-3">
            <span className="row gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--emerald)' }} />生效</span>
            <span className="row gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--warning)' }} />即将</span>
            <span className="row gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--text-3)' }} />过期</span>
          </span>
        }>各城市补贴金额 · 当前 vs 封顶</SectionTitle>
        <Chart build={amountOption} height={264} />
      </Card>

      {/* ── 搜索 + 筛选 ── */}
      <div className="spread wrap gap-3 reveal reveal-3" style={{ marginBottom: 16 }}>
        <div className="input-wrap" style={{ maxWidth: 280, flex: 1 }}>
          <Search size={14} className="input-icon" />
          <input className="input" placeholder="搜索城市 / 省份 / 来源…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: '全部' },
            { value: 'active', label: '生效中' },
            { value: 'upcoming', label: '即将生效' },
            { value: 'expired', label: '已过期' },
          ]}
        />
      </div>

      {/* ── 政策卡片 ── */}
      {cards.length === 0 ? (
        <Card><EmptyState icon={<Search size={34} />} title="没有匹配的补贴政策" desc="尝试调整搜索关键词或筛选条件" /></Card>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}>
          {cards.map((s: SubsidyPolicy, i) => {
            const meta = STATUS_META[s.status];
            const dim = s.status === 'expired';
            return (
              <Card key={s.id} className={`card-hover reveal reveal-${Math.min(i % 6 + 1, 6)}`} style={{ opacity: dim ? 0.62 : 1 }}>
                <span className="stripe-top" style={{ background: meta.color }} />
                <div className="spread" style={{ marginBottom: 12 }}>
                  <div>
                    <div className="t-h3" style={{ color: 'var(--text-1)' }}>{s.city}</div>
                    <div className="t-small text-3">{s.province}</div>
                  </div>
                  <Badge color={meta.color}>{meta.icon}{meta.label}</Badge>
                </div>

                <div className="row gap-2" style={{ alignItems: 'baseline', marginBottom: 4 }}>
                  <span className="kpi-value" style={{ fontSize: 28, color: dim ? 'var(--text-2)' : 'var(--gold)' }}>{fmtYuan(s.amount)}</span>
                  {s.maxAmount > s.amount && <span className="t-small text-3 tnum">封顶 {fmtYuan(s.maxAmount)}</span>}
                </div>
                <div className="row gap-1 t-small text-3" style={{ marginBottom: 12 }}>
                  <CalendarRange size={12} /> 有效期 {fmtRange(s.validFrom, s.validTo)}
                </div>

                <div className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 12, minHeight: 42 }}>{s.conditions}</div>

                <div className="row gap-1 wrap" style={{ marginBottom: 12 }}>
                  {s.targetModels.map(m => <span key={m} className="tag" style={{ borderColor: 'var(--hairline-strong)' }}>{m}</span>)}
                </div>

                <div className="row spread t-small text-3" style={{ paddingTop: 10, borderTop: '1px solid var(--hairline)' }}>
                  <span className="row gap-1"><MapPin size={11} />{s.source}</span>
                  <span className="tnum">更新 {s.updatedAt.slice(5)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
