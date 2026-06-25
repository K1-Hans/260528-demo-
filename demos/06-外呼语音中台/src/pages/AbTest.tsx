import { useState } from 'react';
import { FlaskConical, Check, BarChart3, TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel } from '../components/sig';
import { StatusBadge, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, areaGradient, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import type { AbVariant, AbTrendPoint } from '../types';

const VARIANTS: AbVariant[] = [
  {
    id: 'A', name: 'A 版 · 原话术',
    opening: '您好，这里是示例消费金融客户回访，占用您一分钟做个激活确认。',
    objection: '客户拒接 → 直接致歉挂机，标记次日重拨。',
    connectRate: 64.2, intentRate: 17.8, convRate: 11.0, sample: 4210,
  },
  {
    id: 'B', name: 'B 版 · 优化话术',
    opening: '王先生您好，示例消费金融为您做个一分钟安全确认，不涉及任何费用，方便吗？',
    objection: '客户拒接 → 先共情「不耽误您」，给出短信确认替代方案，再礼貌结束。',
    connectRate: 71.5, intentRate: 22.4, convRate: 14.6, sample: 4198,
  },
];
const TREND: AbTrendPoint[] = Array.from({ length: 14 }, (_, i) => ({
  date: `06-${String(i + 7).padStart(2, '0')}`,
  a: 9.5 + 2 * Math.abs(Math.sin(i * 0.5)),
  b: 11 + 3.4 * Math.abs(Math.sin(i * 0.5 + 0.6)),
}));

export default function AbTest() {
  const { hasPermission } = useAuth();
  const canAct = hasPermission('abtest:read');
  const [adopted, setAdopted] = useState(false);
  const winner = VARIANTS[1];

  const groupOpt = () => ({
    ...baseOption(),
    legend: { bottom: 0, textStyle: { color: cssVar('--text-3'), fontSize: 11 }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
    grid: { left: 8, right: 14, top: 18, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: ['接通率', '意向率', '转化率'], ...axisStyle() },
    yAxis: { type: 'value', max: 80, ...axisStyle() },
    series: [
      { name: 'A 版', type: 'bar', data: [VARIANTS[0].connectRate, VARIANTS[0].intentRate, VARIANTS[0].convRate], barWidth: '26%', itemStyle: { color: cssVar('--text-3'), borderRadius: [3, 3, 0, 0] } },
      { name: 'B 版', type: 'bar', data: [VARIANTS[1].connectRate, VARIANTS[1].intentRate, VARIANTS[1].convRate], barWidth: '26%', itemStyle: { color: cssVar('--gold'), borderRadius: [3, 3, 0, 0] } },
    ],
  });

  const trendOpt = () => ({
    ...baseOption(),
    legend: { bottom: 0, textStyle: { color: cssVar('--text-3'), fontSize: 11 }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
    grid: { left: 8, right: 14, top: 18, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: TREND.map(t => t.date), ...axisStyle() },
    yAxis: { type: 'value', name: '转化率%', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle() },
    series: [
      { name: 'A 版转化率', type: 'line', smooth: true, symbol: 'none', data: TREND.map(t => +t.a.toFixed(1)), lineStyle: { width: 1.6, color: cssVar('--text-3') } },
      { name: 'B 版转化率', type: 'line', smooth: true, symbol: 'none', data: TREND.map(t => +t.b.toFixed(1)), lineStyle: { width: 2, color: cssVar('--gold') }, areaStyle: { color: areaGradient(cssVar('--gold'), 0.18) } },
    ],
  });

  return (
    <div className="page page-wide">
      <PageHeader
        title="数据回流 · 话术 A/B"
        subtitle="通话数据回流驱动话术迭代 · 开场白 / 异议处理对比 · 显著性判定"
        actions={
          <button className="btn btn-primary" disabled={!canAct || adopted} onClick={() => { setAdopted(true); toast('已采纳 B 版获胜话术 · 全量灰度发布', 'success'); }}>
            <Check size={14} />{adopted ? '已采纳 B 版' : '采纳获胜版（B 版）'}
          </button>
        }
      />

      {/* 显著性 + 对比并排 */}
      <div className="card reveal" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
        <FlaskConical size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <div className="flex-1 t-small text-2">
          实验运行 14 天，累计样本 <b className="mononum text-1">8,408</b> 通。<b className="gold">B 版</b>转化率 <b className="mononum ok">14.6%</b> vs A 版 <b className="mononum">11.0%</b>，提升 <b className="ok mononum">+32.7%</b>。
        </div>
        <StatusBadge status="置信度 95% · 显著" tone="good" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {VARIANTS.map(v => (
          <Panel key={v.id} title={v.name} icon={<FlaskConical size={13} />} right={v.id === 'B' && <span className="qual-badge"><Check size={11} />获胜</span>}>
            <div className="col gap-3">
              <div>
                <div className="label" style={{ marginBottom: 5 }}>开场白</div>
                <div className="t-small" style={{ lineHeight: 1.6, padding: '8px 11px', borderRadius: 'var(--r-sm)', background: v.id === 'B' ? 'color-mix(in srgb, var(--success) 8%, var(--surface-2))' : 'var(--surface-2)', border: `1px solid ${v.id === 'B' ? 'color-mix(in srgb, var(--success) 26%, transparent)' : 'var(--hairline)'}`, color: 'var(--text-1)' }}>{v.opening}</div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 5 }}>异议处理</div>
                <div className="t-small" style={{ lineHeight: 1.6, padding: '8px 11px', borderRadius: 'var(--r-sm)', background: v.id === 'B' ? 'color-mix(in srgb, var(--success) 8%, var(--surface-2))' : 'var(--surface-2)', border: `1px solid ${v.id === 'B' ? 'color-mix(in srgb, var(--success) 26%, transparent)' : 'var(--hairline)'}`, color: 'var(--text-1)' }}>{v.objection}</div>
              </div>
              <div className="row spread" style={{ paddingTop: 4 }}>
                <span className="t-small text-3">接通 <span className="mononum text-1">{v.connectRate}%</span></span>
                <span className="t-small text-3">意向 <span className="mononum text-1">{v.intentRate}%</span></span>
                <span className="t-small text-3">转化 <span className="mononum" style={{ color: v.id === 'B' ? 'var(--success)' : 'var(--text-1)', fontWeight: 700 }}>{v.convRate}%</span></span>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.3fr', gap: 14 }}>
        <Panel title="A/B 指标分组对比" icon={<BarChart3 size={13} />}>
          <Chart build={groupOpt} height={236} />
        </Panel>
        <Panel title="多版本转化趋势" icon={<TrendingUp size={13} />} right={<span className="t-small text-3">近 14 天</span>}>
          <Chart build={trendOpt} height={236} />
        </Panel>
      </div>
    </div>
  );
}
