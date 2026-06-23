import { useMemo, useState } from 'react';
import { Filter, SlidersHorizontal, BarChart3 } from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { Panel } from '../components/sig';
import { DataTable, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar } from '../lib/chartTheme';
import type { FunnelStage, LeadScoreRow, ScoreDim, CampaignScene } from '../types';

const STAGES: FunnelStage[] = [
  { stage: '呼出', value: 8420 }, { stage: '接通', value: 5610 }, { stage: '有效通话', value: 3980 },
  { stage: '意向', value: 1840 }, { stage: '转化 / 回收', value: 1126 },
];
const DIMS: ScoreDim[] = [
  { dim: '接通', weight: 15 }, { dim: '有效沟通', weight: 25 }, { dim: '意向表达', weight: 30 },
  { dim: '字段完整', weight: 20 }, { dim: '无投诉', weight: 10 },
];
const SCENES: CampaignScene[] = ['信用卡激活回访', '逾期 M1 提醒', '理财到期回访', 'NPS 满意度回访', '额度提升告知'];
const FAMILY = ['王', '李', '张', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马'];
const LEADS: LeadScoreRow[] = Array.from({ length: 14 }, (_, i) => {
  const score = Math.round(40 + 58 * Math.abs(Math.sin(i * 1.7)));
  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : 'C';
  const advice = grade === 'A' ? '高意向 · 优先人工跟进' : grade === 'B' ? '中意向 · 短信触达 + 二次外呼' : '低意向 · 入培育池';
  return {
    id: `LD-${2400 + i}`, customer: `${FAMILY[i % FAMILY.length]}${'先女'[i % 2]}士`, scene: SCENES[i % SCENES.length],
    score, grade: grade as 'A' | 'B' | 'C', advice,
    connected: true, effective: score > 55, intent: score > 70,
  };
});
const SCORE_BUCKETS = [
  { range: '0-20', n: 4 }, { range: '20-40', n: 11 }, { range: '40-60', n: 23 },
  { range: '60-80', n: 18 }, { range: '80-100', n: 9 },
];
const GRADE_COLOR: Record<'A' | 'B' | 'C', string> = { A: 'var(--success)', B: 'var(--warning)', C: 'var(--text-3)' };

export default function Funnel() {
  const [weights, setWeights] = useState(DIMS.map(d => d.weight));
  const totalW = weights.reduce((a, b) => a + b, 0);

  // 权重即时重算演示：用权重微调线索评分
  const adjLeads = useMemo(() => {
    const factor = totalW / 100;
    return LEADS.map(l => ({ ...l, score: Math.min(99, Math.round(l.score * factor)) }))
      .sort((a, b) => b.score - a.score);
  }, [totalW]);

  const funnelOpt = () => ({
    ...baseOption(),
    tooltip: { ...(baseOption().tooltip as object), trigger: 'item', formatter: (p: { name: string; value: number }) => `${p.name}<br/>${p.value.toLocaleString('zh-CN')}` },
    series: [{
      type: 'funnel', left: 8, right: 8, top: 8, bottom: 8, minSize: '34%', gap: 3,
      label: { color: cssVar('--text-1'), fontSize: 12, formatter: '{b}\n{c}' },
      itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2 },
      color: [cssVar('--c2'), cssVar('--gold'), cssVar('--c5'), cssVar('--qual'), cssVar('--success')],
      data: STAGES, animationDuration: 700,
    }],
  });

  const distOpt = () => ({
    ...baseOption(),
    grid: { left: 8, right: 14, top: 18, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: SCORE_BUCKETS.map(b => b.range), ...axisStyle() },
    yAxis: { type: 'value', ...axisStyle() },
    series: [{
      type: 'bar', data: SCORE_BUCKETS.map((b, i) => ({ value: b.n, itemStyle: { color: i >= 3 ? cssVar('--success') : i === 2 ? cssVar('--gold') : cssVar('--text-3') } })),
      barWidth: '54%', itemStyle: { borderRadius: [3, 3, 0, 0] },
    }],
  });

  const cols: Col<LeadScoreRow>[] = [
    { key: 'id', header: '线索号', render: r => <span className="mono t-small text-3">{r.id}</span> },
    { key: 'customer', header: '客户', render: r => <span style={{ color: 'var(--text-1)' }}>{r.customer}</span> },
    { key: 'scene', header: '来源场景', render: r => <span className="tag">{r.scene}</span> },
    { key: 'score', header: '评分', num: true, sortable: true, render: r => <span className="mononum" style={{ color: GRADE_COLOR[r.grade], fontWeight: 700 }}>{r.score}</span> },
    { key: 'grade', header: '等级', align: 'center', render: r => <span className="badge" style={{ background: `color-mix(in srgb, ${GRADE_COLOR[r.grade]} 15%, transparent)`, color: GRADE_COLOR[r.grade] }}>{r.grade}</span> },
    { key: 'advice', header: '建议动作', render: r => <span className="t-small text-2">{r.advice}</span> },
  ];

  return (
    <div className="page page-wide">
      <PageHeader title="线索评分与转化漏斗" subtitle="通话结果 → 线索分级 → 漏斗诊断 · 评分维度权重可调即时重算" />

      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        <StatCard label="今日呼出" raw={8420} unit="" change={5.1} icon={<Filter size={16} />} delayClass="reveal-1" />
        <StatCard label="接通率" raw={66.6} unit="%" decimals={1} change={2.3} delayClass="reveal-2" />
        <StatCard label="意向转化率" raw={20.1} unit="%" decimals={1} change={3.8} delayClass="reveal-3" />
        <StatCard label="A 级高意向线索" raw={adjLeads.filter(l => l.grade === 'A').length * 18} unit="" change={9.2} delayClass="reveal-4" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="转化漏斗" icon={<Filter size={13} />} right={<span className="t-small text-3">呼出 → 转化</span>}>
          <Chart build={funnelOpt} height={250} />
        </Panel>
        <Panel title="线索评分分布" icon={<BarChart3 size={13} />}>
          <Chart build={distOpt} height={250} />
        </Panel>
        <Panel title="评分维度权重" icon={<SlidersHorizontal size={13} />} right={<span className="mononum t-small" style={{ color: totalW === 100 ? 'var(--success)' : 'var(--warning)' }}>合计 {totalW}%</span>}>
          <div className="col gap-4">
            {DIMS.map((d, i) => (
              <div key={d.dim}>
                <div className="row spread" style={{ marginBottom: 5 }}>
                  <span className="t-small text-2">{d.dim}</span>
                  <span className="mononum t-small text-1">{weights[i]}%</span>
                </div>
                <input type="range" min={0} max={50} value={weights[i]} className="input" style={{ padding: 0, height: 6, accentColor: 'var(--gold)' }}
                  onChange={e => setWeights(w => w.map((x, j) => j === i ? +e.target.value : x))} />
              </div>
            ))}
            <div className="t-small text-3" style={{ marginTop: 2 }}>拖动权重即时重算右侧线索评分与分级。</div>
          </div>
        </Panel>
      </div>

      <Panel title="线索评分明细" icon={<BarChart3 size={13} />} right={<span className="t-small text-3 mononum">{adjLeads.length} 条 · 按评分降序</span>} bodyClass="panel-body-0">
        <DataTable cols={cols} rows={adjLeads} rowKey={r => r.id} defaultSort={{ key: 'score', dir: 'desc' }} />
      </Panel>
    </div>
  );
}
