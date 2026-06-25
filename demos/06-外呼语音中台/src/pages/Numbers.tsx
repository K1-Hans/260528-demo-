import { useState } from 'react';
import { Phone, ShieldCheck, BarChart3, Grid3x3, Power } from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { Panel } from '../components/sig';
import { DataTable, type Col } from '../components/DataTable';
import { StatusBadge, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import type { NumberAsset, LineProvider } from '../types';

const REGIONS = ['北京', '上海', '广州', '深圳', '成都', '杭州', '武汉', '西安'];
const INIT_NUMBERS: NumberAsset[] = Array.from({ length: 10 }, (_, i) => {
  const calls = 320 + Math.round(2600 * Math.abs(Math.sin(i * 1.4)));
  const risk = Math.min(92, Math.round(6 + calls / 42 + 16 * Math.abs(Math.cos(i * 0.8))));
  const status = risk >= 70 ? 'risk' : 'healthy';
  return {
    id: `n${i}`, number: `0${21 + (i % 8)}-${6000 + i * 137}****`, region: REGIONS[i % REGIONS.length],
    todayCalls: calls, connectRate: +(72 - risk * 0.3).toFixed(1), riskScore: risk,
    status: status as NumberAsset['status'],
  };
});

const PROVIDERS: LineProvider[] = [
  { id: 'p1', name: '示例云通信', license: '增值电信 B2-2024****', expireAt: '2026-07-15', certified: true, connectRate: 70.2, numbers: 1280 },
  { id: 'p2', name: '示例智联线路', license: '增值电信 B2-2025****', expireAt: '2027-02-28', certified: true, connectRate: 66.8, numbers: 940 },
  { id: 'p3', name: '示例通服', license: '增值电信 B2-2023****', expireAt: '2026-06-30', certified: false, connectRate: 58.4, numbers: 360 },
];

const STATUS_TONE: Record<NumberAsset['status'], 'good' | 'bad' | 'muted'> = { healthy: 'good', risk: 'bad', disabled: 'muted' };
const STATUS_LABEL: Record<NumberAsset['status'], string> = { healthy: '健康', risk: '高风险', disabled: '已停用' };

export default function Numbers() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('numbers:manage');
  const [numbers, setNumbers] = useState(INIT_NUMBERS);

  const disable = (id: string) => {
    setNumbers(ns => ns.map(n => n.id === id ? { ...n, status: 'disabled' } : n));
    toast('已停用高风险号码 · 在呼通话不受影响', 'warn');
  };

  const supplierOpt = () => ({
    ...baseOption(),
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'value', max: 100, ...axisStyle() },
    yAxis: { type: 'category', data: PROVIDERS.map(p => p.name), ...axisStyle() },
    series: [{
      type: 'bar', data: PROVIDERS.map(p => ({ value: p.connectRate, itemStyle: { color: p.certified ? cssVar('--success') : cssVar('--warning') } })),
      barWidth: '46%', itemStyle: { borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: cssVar('--text-2'), fontSize: 11, formatter: '{c}%' },
    }],
  });

  // 利用率热力：号码 × 时段(8 段) 呼量利用率
  const HOURS = ['09', '11', '13', '15', '17', '19', '21'];
  const heatData: [number, number, number][] = [];
  numbers.slice(0, 8).forEach((n, y) => HOURS.forEach((_, x) => {
    heatData.push([x, y, Math.round(20 + 70 * Math.abs(Math.sin(x * 0.7 + y)))]);
  }));
  const heatOpt = () => ({
    ...baseOption(),
    grid: { left: 8, right: 14, top: 8, bottom: 24, containLabel: true },
    tooltip: { ...(baseOption().tooltip as object), formatter: (p: { value: number[] }) => `利用率 ${p.value[2]}%` },
    xAxis: { type: 'category', data: HOURS.map(h => `${h}:00`), splitArea: { show: false }, ...axisStyle() },
    yAxis: { type: 'category', data: numbers.slice(0, 8).map(n => n.number.slice(0, 8)), ...axisStyle() },
    visualMap: { min: 0, max: 100, show: false, inRange: { color: [cssVar('--surface-3'), cssVar('--bronze'), cssVar('--gold')] } },
    series: [{ type: 'heatmap', data: heatData, itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2, borderRadius: 3 } }],
  });

  const cols: Col<NumberAsset>[] = [
    { key: 'number', header: '外显号', render: r => <span className="mono" style={{ color: 'var(--text-1)' }}>{r.number}</span> },
    { key: 'region', header: '归属地', render: r => <span className="tag">{r.region}</span> },
    { key: 'todayCalls', header: '今日呼量', num: true, sortable: true, render: r => <span className="mononum">{r.todayCalls.toLocaleString('zh-CN')}</span> },
    { key: 'connectRate', header: '接通率', num: true, sortable: true, render: r => <span className="mononum">{r.connectRate}%</span> },
    { key: 'riskScore', header: '封号风险', num: true, sortable: true, render: r => <span className="mononum" style={{ color: r.riskScore >= 70 ? 'var(--danger)' : r.riskScore >= 45 ? 'var(--warning)' : 'var(--success)', fontWeight: 700 }}>{r.riskScore}</span> },
    { key: 'status', header: '状态', align: 'center', render: r => <StatusBadge status={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} /> },
    {
      key: 'act', header: '操作', align: 'center', render: r => r.status === 'risk'
        ? <button className="btn btn-danger btn-sm" disabled={!canManage} onClick={() => disable(r.id)}><Power size={12} />停用</button>
        : <span className="t-small text-3">—</span>,
    },
  ];

  const healthy = numbers.filter(n => n.status === 'healthy').length;
  const risky = numbers.filter(n => n.status === 'risk').length;

  return (
    <div className="page page-wide">
      <PageHeader title="号码 / 线路 · 外显号资质管理" subtitle="号码池健康度 · 线路供应商资质 · 外显号报备 — 可靠性参照 Retell AI" />

      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        <StatCard label="在用号码" raw={2580} unit="个" change={1.2} icon={<Phone size={16} />} delayClass="reveal-1" />
        <StatCard label="健康号码占比" raw={(healthy / numbers.length) * 100} unit="%" decimals={1} change={0.6} delayClass="reveal-2" />
        <StatCard label="高风险待处置" raw={risky} unit="个" change={0} icon={<Power size={16} />} delayClass="reveal-3" />
        <StatCard label="线路供应商" raw={PROVIDERS.length} unit="家" delayClass="reveal-4" icon={<ShieldCheck size={16} />} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="线路供应商资质" icon={<ShieldCheck size={13} />}>
          <div className="col gap-3">
            {PROVIDERS.map(p => (
              <div key={p.id} className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
                <div className="row spread" style={{ marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{p.name}</span>
                  {p.certified ? <span className="qual-badge"><ShieldCheck size={11} />合规认证</span> : <StatusBadge status="资质待续期" tone="warn" />}
                </div>
                <div className="row spread">
                  <span className="mono t-small text-3">{p.license} · 至 {p.expireAt}</span>
                  <span className="t-small text-3">接通 <span className="mononum text-1">{p.connectRate}%</span> · {p.numbers} 号</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="供应商接通率对比" icon={<BarChart3 size={13} />}>
          <Chart build={supplierOpt} height={210} />
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
        <Panel title="号码池" icon={<Phone size={13} />} right={<span className="t-small text-3 mononum">{numbers.length} 个 · 高风险可一键停用</span>} bodyClass="panel-body-0">
          <DataTable cols={cols} rows={numbers} rowKey={r => r.id} defaultSort={{ key: 'riskScore', dir: 'desc' }} />
        </Panel>
        <Panel title="号码利用率热力" icon={<Grid3x3 size={13} />} right={<span className="t-small text-3">号码 × 时段</span>}>
          <Chart build={heatOpt} height={250} deps={[numbers.length]} />
        </Panel>
      </div>
    </div>
  );
}
