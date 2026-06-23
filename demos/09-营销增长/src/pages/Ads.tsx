import { Fragment, useState } from 'react';
import {
  Zap, Sparkles, BarChart2, Target, Wallet, TrendingUp, ChevronDown, ChevronUp, PauseCircle, Circle, Loader,
} from 'lucide-react';
import { PageHeader, StatCard, SectionTitle } from '../components/ui';
import { Panel, ChannelPill } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, chanColor, cssVar, DRAW } from '../lib/chartTheme';
import { AD_GROUPS, HEAT_CELLS, HEAT_HOURS, HEAT_CHANNELS, ADS_KPIS, CHANNELS, CHANNEL_MAP } from '../lib/mockData';
import type { AdGroup } from '../types';

const KPI_ICONS = [
  <BarChart2 size={16} />,
  <Wallet size={16} />,
  <Target size={16} />,
  <Sparkles size={16} />,
];

// Status metadata for ad groups
const STATUS_META: Record<AdGroup['status'], { label: string; color: string; Icon: typeof Circle }> = {
  live:     { label: '在投', color: 'var(--success)', Icon: Circle },
  learning: { label: '学习中', color: 'var(--info)',    Icon: Loader },
  paused:   { label: '已暂停', color: 'var(--text-3)',  Icon: PauseCircle },
};

export default function Ads() {
  const [expandedId, setExpandedId] = useState<string | null>('a1');
  const [adopted, setAdopted] = useState<Set<string>>(new Set());
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  return (
    <div className="page page-wide">
      <PageHeader
        title="投放控制台"
        subtitle="多渠道预算分配 · 实时调优建议 · 渠道 × 时段转化热力"
        actions={<span className="tag tag-mono"><Zap size={12} style={{ marginRight: 4 }} />实时调优</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {ADS_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      {/* 主体布局：左宽右窄 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, alignItems: 'start' }}>
        {/* 左列：广告组表 + 热力矩阵 */}
        <div className="col gap-4">
          {/* 广告组表 */}
          <Panel
            title={<><TrendingUp size={13} />广告组总览 · 实时调优</>}
            icon={null}
            bodyClass="panel-body"
          >
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>广告组</th>
                  <th style={{ width: '13%' }}>渠道</th>
                  <th style={{ width: '10%' }}>状态</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>预算</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>消耗</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>ROAS</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>CPA</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>转化</th>
                  <th style={{ width: '5%' }} />
                </tr>
              </thead>
              <tbody>
                {AD_GROUPS.map(a => {
                  const isExpanded = expandedId === a.id;
                  const isAdopted = adopted.has(a.id);
                  const isIgnored = ignored.has(a.id);
                  const meta = STATUS_META[a.status];
                  const roasOk = a.roas >= 3.5;

                  return (
                    <Fragment key={a.id}>
                      <tr
                        style={{ cursor: 'pointer', opacity: a.status === 'paused' ? 0.62 : 1 }}
                        onClick={() => setExpandedId(isExpanded ? null : a.id)}
                      >
                        <td>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{a.name}</span>
                          <div className="t-small text-3" style={{ fontSize: 10.5, marginTop: 2 }}>{a.bidStrategy}</div>
                        </td>
                        <td><ChannelPill channel={CHANNEL_MAP[a.channel]} sm /></td>
                        <td>
                          <span className="row gap-1" style={{ fontSize: 11.5, fontWeight: 600, color: meta.color }}>
                            <meta.Icon size={12} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="td-num mononum" style={{ textAlign: 'right', color: 'var(--text-2)' }}>
                          {a.budget} 万
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="mononum" style={{ fontSize: 13, color: 'var(--text-1)' }}>{a.spent} 万</span>
                          <div style={{ marginTop: 3 }}>
                            <div style={{ height: 3, borderRadius: 2, background: 'var(--surface-3)', width: 52, marginLeft: 'auto' }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min((a.spent / a.budget) * 100, 100)}%`,
                                background: 'var(--gold)',
                                borderRadius: 2,
                              }} />
                            </div>
                          </div>
                        </td>
                        <td className="td-num mononum" style={{ textAlign: 'right', fontWeight: 700, color: roasOk ? 'var(--success)' : a.status === 'learning' ? 'var(--warning)' : 'var(--danger)' }}>
                          {a.roas.toFixed(1)}
                        </td>
                        <td className="td-num mononum" style={{ textAlign: 'right', color: 'var(--text-2)' }}>
                          ¥{a.cpa}
                        </td>
                        <td className="td-num mononum" style={{ textAlign: 'right', color: 'var(--text-1)' }}>
                          {a.conv.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>

                      {/* AI 调优建议展开行 */}
                      {isExpanded && a.suggestion && (
                        <tr key={`${a.id}-sugg`}>
                          <td colSpan={9} style={{ paddingTop: 0, paddingBottom: 10 }}>
                            <div style={{
                              background: 'color-mix(in srgb, var(--gold) 8%, transparent)',
                              border: '1px solid color-mix(in srgb, var(--gold) 22%, transparent)',
                              borderRadius: 'var(--r-md)',
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                            }}>
                              <Sparkles size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                              <span style={{ fontSize: 12.5, color: 'var(--text-1)', flex: 1, lineHeight: 1.5 }}>
                                <span style={{ fontWeight: 600, color: 'var(--gold)', marginRight: 6 }}>AI 建议</span>
                                {a.suggestion}
                              </span>
                              {!isAdopted && !isIgnored ? (
                                <div className="row gap-2" style={{ flexShrink: 0 }}>
                                  <button
                                    className="btn btn-ok btn-sm"
                                    onClick={e => { e.stopPropagation(); setAdopted(prev => new Set([...prev, a.id])); }}
                                  >
                                    采纳
                                  </button>
                                  <button
                                    className="btn btn-subtle btn-sm"
                                    onClick={e => { e.stopPropagation(); setIgnored(prev => new Set([...prev, a.id])); }}
                                  >
                                    忽略
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: isAdopted ? 'var(--success)' : 'var(--text-3)', flexShrink: 0 }}>
                                  {isAdopted ? '已采纳' : '已忽略'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          {/* 投放热力矩阵（签名） */}
          <Panel
            title={<><BarChart2 size={13} />渠道 × 时段转化热力</>}
            icon={null}
            right={<span className="label" style={{ fontSize: 11 }}>转化指数 0–100</span>}
            bodyClass="panel-body"
          >
            <Chart
              height={240}
              deps={[]}
              build={() => {
                const ax = axisStyle();
                const acc = accent();
                const surf3 = cssVar('--surface-3');
                const text1 = cssVar('--text-1');

                const data = HEAT_CELLS.map(cell => [
                  HEAT_HOURS.indexOf(cell.hour),
                  HEAT_CHANNELS.indexOf(cell.channel),
                  cell.value,
                ]);

                return {
                  ...baseOption(),
                  ...DRAW,
                  backgroundColor: 'transparent',
                  grid: { left: 8, right: 80, top: 16, bottom: 8, containLabel: true },
                  xAxis: {
                    type: 'category',
                    data: HEAT_HOURS,
                    splitArea: { show: true },
                    ...ax,
                    axisLabel: { ...ax.axisLabel, fontSize: 11 },
                  },
                  yAxis: {
                    type: 'category',
                    data: HEAT_CHANNELS,
                    splitArea: { show: true },
                    ...ax,
                    axisLabel: { ...ax.axisLabel, fontSize: 11 },
                  },
                  visualMap: {
                    min: 0, max: 100,
                    calculable: true,
                    orient: 'vertical',
                    right: 0,
                    top: 'center',
                    itemWidth: 14,
                    itemHeight: 100,
                    textStyle: { color: cssVar('--text-3'), fontSize: 10 },
                    inRange: { color: [surf3, acc] },
                  },
                  series: [{
                    type: 'heatmap',
                    data,
                    label: {
                      show: true,
                      color: text1,
                      fontSize: 10,
                      fontFamily: "'Geist Mono','Geist',monospace",
                    },
                    itemStyle: { borderRadius: 3 },
                    emphasis: {
                      itemStyle: {
                        shadowBlur: 10,
                        shadowColor: acc,
                      },
                    },
                  }],
                };
              }}
            />
          </Panel>
        </div>

        {/* 右列：预算分配环形 + 渠道明细 */}
        <div className="col gap-4">
          {/* 预算分配环形 */}
          <Panel
            title={<><Wallet size={13} />预算分配占比</>}
            icon={null}
            bodyClass="panel-body"
          >
            <Chart
              height={220}
              deps={[]}
              build={() => {
                const pieData = CHANNELS.map(c => ({
                  name: c.name,
                  value: c.spend,
                  itemStyle: { color: chanColor(c.colorVar) },
                }));

                return {
                  ...baseOption(),
                  backgroundColor: 'transparent',
                  tooltip: {
                    trigger: 'item',
                    formatter: (p: { name: string; value: number; percent: number }) =>
                      `${p.name}<br/><span style="font-family:monospace;font-weight:700">${p.value} 万</span> (${p.percent}%)`,
                    backgroundColor: cssVar('--surface-1'),
                    borderColor: cssVar('--hairline'),
                    borderWidth: 1,
                    textStyle: { color: cssVar('--text-1'), fontSize: 12 },
                    extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.18);',
                  },
                  legend: {
                    orient: 'vertical',
                    right: 8,
                    top: 'center',
                    itemWidth: 10,
                    itemHeight: 10,
                    textStyle: { color: cssVar('--text-2'), fontSize: 11 },
                  },
                  series: [{
                    type: 'pie',
                    radius: ['46%', '72%'],
                    center: ['38%', '50%'],
                    data: pieData,
                    label: { show: false },
                    itemStyle: { borderRadius: 4, borderColor: cssVar('--bg-base'), borderWidth: 2 },
                    emphasis: {
                      itemStyle: { shadowBlur: 14, shadowColor: 'rgba(214,51,108,0.28)' },
                      scaleSize: 6,
                    },
                  }],
                };
              }}
            />
          </Panel>

          {/* 渠道效果明细 */}
          <Panel
            title={<><TrendingUp size={13} />渠道效果明细</>}
            icon={null}
            bodyClass="panel-body"
          >
            <SectionTitle right={<span className="label" style={{ fontSize: 10.5 }}>ROAS · CPA</span>}>
              各渠道
            </SectionTitle>
            <div className="col gap-3">
              {CHANNELS.map(c => {
                const roasOk = c.roas >= 3.5;
                const spendPct = Math.round((c.spend / CHANNELS.reduce((s, ch) => s + ch.spend, 0)) * 100);
                return (
                  <div key={c.id} className="metric-card" style={{ padding: '10px 12px' }}>
                    <div className="row spread" style={{ marginBottom: 6 }}>
                      <ChannelPill channel={c} sm />
                      <div className="row gap-3">
                        <span className="mononum" style={{ fontSize: 12, color: roasOk ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                          {c.roas.toFixed(1)}x
                        </span>
                        <span className="mononum t-small text-3" style={{ fontSize: 11 }}>
                          CPA ¥{Math.round(c.spend * 10000 / c.conv)}
                        </span>
                      </div>
                    </div>
                    <div className="row spread" style={{ marginBottom: 5 }}>
                      <span className="t-small text-3" style={{ fontSize: 10.5 }}>{c.spend} 万 · {spendPct}%</span>
                      <span className="mononum t-small text-3" style={{ fontSize: 10.5 }}>{c.conv.toLocaleString()} 转化</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${spendPct}%`,
                        background: chanColor(c.colorVar),
                        borderRadius: 2,
                        transition: 'width 0.8s var(--ease)',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
