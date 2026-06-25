import { useMemo, useState, Fragment } from 'react';
import {
  Users, Target, GitMerge, MessageSquareOff, ShieldCheck,
  ChevronUp, ChevronDown, Minus,
} from 'lucide-react';
import { PageHeader, StatCard, ProgressBar, SectionTitle } from '../components/ui';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, sem, DRAW, cssVar } from '../lib/chartTheme';
import { AUDITOR_ROWS } from '../lib/mockData';
import type { AuditorRow } from '../types';

// ─── 小工具 ─────────────────────────────────────────────────────────────────

/** 根据准确率 / 一致性着色（高 = 取证青，低 = 危险） */
function ratePct(v: number): string {
  if (v >= 97) return 'var(--gold)';
  if (v >= 94) return 'var(--success)';
  if (v >= 90) return 'var(--warning)';
  return 'var(--danger)';
}

/** 申诉撤销率着色（越低越好） */
function appealColor(v: number): string {
  if (v <= 2) return 'var(--success)';
  if (v <= 3.5) return 'var(--warning)';
  return 'var(--danger)';
}

type SortKey = 'throughput' | 'accuracy' | 'consistency' | 'avgHandleSec' | 'qcRate' | 'appealReverseRate';
type SortDir = 'asc' | 'desc';

// ─── 主页面 ─────────────────────────────────────────────────────────────────

export default function Auditor() {
  const [sortKey, setSortKey] = useState<SortKey>('throughput');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const rows = useMemo(() => {
    return [...AUDITOR_ROWS].sort((a, b) => {
      const av = getDerivedValue(a, sortKey);
      const bv = getDerivedValue(b, sortKey);
      const diff = av - bv;
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  // KPI 聚合
  const totalThroughput = AUDITOR_ROWS.reduce((s, r) => s + r.throughput, 0);
  const avgAccuracy = avg(AUDITOR_ROWS.map(r => r.accuracy));
  const avgConsistency = avg(AUDITOR_ROWS.map(r => r.consistency));
  const avgAppeal = avg(AUDITOR_ROWS.map(r => r.appealReverseRate));

  // 质检通过率（全团队汇总）
  const totalQcSampled = AUDITOR_ROWS.reduce((s, r) => s + r.qcSampled, 0);
  const totalQcPassed = AUDITOR_ROWS.reduce((s, r) => s + r.qcPassed, 0);
  const teamQcRate = totalQcSampled > 0 ? (totalQcPassed / totalQcSampled) * 100 : 0;

  // 图表数据
  const names = AUDITOR_ROWS.map(r => r.name);

  return (
    <div className="page page-wide">
      <PageHeader
        title="审核员效能质检"
        subtitle="吞吐量 / 准确率 / 一致性 / 质检抽审 / 申诉撤销率 — 质检主管视角，申诉撤销率越低越好"
      />

      {/* KPI 条 */}
      <div className="grid reveal" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard
          label="团队今日吞吐"
          raw={totalThroughput}
          unit=" 件"
          icon={<Users size={15} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="平均质检准确率"
          raw={avgAccuracy}
          unit="%"
          decimals={1}
          icon={<Target size={15} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="平均团队一致性"
          raw={avgConsistency}
          unit="%"
          decimals={1}
          icon={<GitMerge size={15} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="申诉撤销率均值"
          raw={avgAppeal}
          unit="%"
          decimals={1}
          icon={<MessageSquareOff size={15} />}
          delayClass="reveal-4"
        />
        <StatCard
          label="质检抽审通过率"
          raw={teamQcRate}
          unit="%"
          decimals={1}
          icon={<ShieldCheck size={15} />}
          delayClass="reveal-5"
        />
      </div>

      {/* 主体：效能表 + 右侧图表 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 364px', gap: 12, alignItems: 'start' }}>

        {/* 左：效能表 */}
        <Panel title="审核员效能明细" icon={<Users size={13} />} bodyClass="panel-body-0">
          <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th label="审核员" sortKey={null} cur={sortKey} dir={sortDir} onSort={handleSort} align="left" />
                <Th label="组别" sortKey={null} cur={sortKey} dir={sortDir} onSort={handleSort} align="left" />
                <Th label="今日吞吐" sortKey="throughput" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="准确率" sortKey="accuracy" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="团队一致性" sortKey="consistency" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="均处置时长" sortKey="avgHandleSec" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="质检抽审" sortKey="qcRate" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="申诉撤销率" sortKey="appealReverseRate" cur={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const qcRate = row.qcSampled > 0 ? (row.qcPassed / row.qcSampled) * 100 : 0;
                return (
                  <Fragment key={row.id}>
                    <tr style={{ borderBottom: '1px solid var(--hairline)', transition: 'background var(--dur-micro)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* 审核员 */}
                      <td style={{ padding: '10px 14px', color: 'var(--text-1)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {row.name}
                      </td>
                      {/* 组别 */}
                      <td style={{ padding: '10px 14px' }}>
                        <span className="badge" style={{ background: 'color-mix(in srgb,var(--gold) 10%,transparent)', color: 'var(--text-2)', fontSize: 11 }}>
                          {row.team}
                        </span>
                      </td>
                      {/* 吞吐 */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <span className="mononum" style={{ color: 'var(--text-1)', fontWeight: 700 }}>{row.throughput.toLocaleString()}</span>
                        <span className="t-small text-3" style={{ marginLeft: 3 }}>件</span>
                      </td>
                      {/* 准确率 */}
                      <td style={{ padding: '10px 14px', minWidth: 130 }}>
                        <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
                          <span className="mononum" style={{ color: ratePct(row.accuracy), fontWeight: 700, minWidth: 44, textAlign: 'right' }}>
                            {row.accuracy.toFixed(1)}%
                          </span>
                          <ProgressBar pct={row.accuracy} color={ratePct(row.accuracy)} height={4} />
                        </div>
                      </td>
                      {/* 一致性 */}
                      <td style={{ padding: '10px 14px', minWidth: 130 }}>
                        <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
                          <span className="mononum" style={{ color: ratePct(row.consistency), fontWeight: 700, minWidth: 44, textAlign: 'right' }}>
                            {row.consistency.toFixed(1)}%
                          </span>
                          <ProgressBar pct={row.consistency} color={ratePct(row.consistency)} height={4} />
                        </div>
                      </td>
                      {/* 均处置时长 */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <span className="mononum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{row.avgHandleSec}s</span>
                      </td>
                      {/* 质检抽审 */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <span className="mononum" style={{ color: 'var(--text-2)' }}>
                          <span style={{ color: 'var(--success)', fontWeight: 700 }}>{row.qcPassed}</span>
                          <span className="text-3"> / {row.qcSampled}</span>
                        </span>
                        <div style={{ marginTop: 4 }}>
                          <ProgressBar pct={qcRate} color={qcRate >= 95 ? 'var(--success)' : qcRate >= 88 ? 'var(--warning)' : 'var(--danger)'} height={3} />
                        </div>
                      </td>
                      {/* 申诉撤销率 */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <span className="mononum" style={{ color: appealColor(row.appealReverseRate), fontWeight: 700 }}>
                          {row.appealReverseRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {/* 图例说明 */}
          <div className="row gap-4 wrap" style={{ padding: '10px 14px', borderTop: '1px solid var(--hairline)', marginTop: 0 }}>
            <LegendDot color="var(--gold)" label="≥97% 达优" />
            <LegendDot color="var(--success)" label="≥94% 合格" />
            <LegendDot color="var(--warning)" label="≥90% 待提升" />
            <LegendDot color="var(--danger)" label="<90% 预警" />
            <span className="t-small text-3" style={{ marginLeft: 'auto' }}>申诉撤销率越低越好，≤2% 为优</span>
          </div>
        </Panel>

        {/* 右侧图表 */}
        <div className="col gap-3">

          {/* 一致性对比柱状图 */}
          <Panel title="团队一致性对比" icon={<GitMerge size={13} />} bodyClass="panel-body">
            <Chart
              height={210}
              deps={[names]}
              build={() => ({
                ...baseOption(),
                ...DRAW,
                backgroundColor: 'transparent',
                xAxis: {
                  type: 'category',
                  data: AUDITOR_ROWS.map(r => r.name),
                  ...axisStyle(),
                },
                yAxis: {
                  type: 'value',
                  min: 88,
                  max: 100,
                  ...axisStyle(),
                  axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${v}%` },
                },
                series: [
                  {
                    name: '准确率',
                    type: 'bar',
                    barWidth: 12,
                    barGap: '20%',
                    itemStyle: { borderRadius: [3, 3, 0, 0], color: accent() },
                    data: AUDITOR_ROWS.map(r => r.accuracy),
                  },
                  {
                    name: '一致性',
                    type: 'bar',
                    barWidth: 12,
                    barGap: '20%',
                    itemStyle: { borderRadius: [3, 3, 0, 0], color: sem('pass') },
                    data: AUDITOR_ROWS.map(r => r.consistency),
                  },
                ],
                legend: {
                  top: 0,
                  right: 0,
                  textStyle: { color: cssVar('--text-3'), fontSize: 11 },
                  itemWidth: 10,
                  itemHeight: 10,
                },
                tooltip: { ...(baseOption() as any).tooltip, trigger: 'axis' },
              })}
            />
          </Panel>

          {/* 质检抽审通过率 */}
          <Panel title="质检抽审通过率" icon={<ShieldCheck size={13} />} bodyClass="panel-body">
            <Chart
              height={200}
              deps={[names]}
              build={() => {
                const qcRates = AUDITOR_ROWS.map(r =>
                  r.qcSampled > 0 ? +((r.qcPassed / r.qcSampled) * 100).toFixed(1) : 0,
                );
                return {
                  ...baseOption(),
                  ...DRAW,
                  backgroundColor: 'transparent',
                  xAxis: {
                    type: 'category',
                    data: AUDITOR_ROWS.map(r => r.name),
                    ...axisStyle(),
                  },
                  yAxis: {
                    type: 'value',
                    min: 90,
                    max: 101,
                    ...axisStyle(),
                    axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${v}%` },
                  },
                  series: [
                    {
                      name: '通过率',
                      type: 'bar',
                      barWidth: 18,
                      itemStyle: {
                        borderRadius: [4, 4, 0, 0],
                        color: (params: { value: number }) =>
                          params.value >= 97
                            ? sem('pass')
                            : params.value >= 93
                            ? sem('review')
                            : sem('block'),
                      },
                      label: {
                        show: true,
                        position: 'top',
                        formatter: (p: { value: number }) => `${p.value}%`,
                        color: cssVar('--text-3'),
                        fontSize: 11,
                        fontFamily: "'Geist Mono',monospace",
                      },
                      data: qcRates,
                    },
                  ],
                  tooltip: { ...(baseOption() as any).tooltip, trigger: 'axis' },
                };
              }}
            />
          </Panel>

          {/* 申诉撤销率雷达概览 */}
          <Panel title="申诉撤销率分布" icon={<MessageSquareOff size={13} />} bodyClass="panel-body">
            <SectionTitle right={<span className="t-small text-3">越低越好</span>}>逐员申诉撤销率</SectionTitle>
            <div className="col gap-2">
              {[...AUDITOR_ROWS]
                .sort((a, b) => a.appealReverseRate - b.appealReverseRate)
                .map(row => (
                  <Fragment key={row.id}>
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                      <span style={{ minWidth: 36, fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{row.name}</span>
                      <div style={{ flex: 1 }}>
                        <ProgressBar
                          pct={(row.appealReverseRate / 6) * 100}
                          color={appealColor(row.appealReverseRate)}
                          height={5}
                        />
                      </div>
                      <span className="mononum" style={{ minWidth: 38, textAlign: 'right', fontSize: 12, color: appealColor(row.appealReverseRate), fontWeight: 700 }}>
                        {row.appealReverseRate.toFixed(1)}%
                      </span>
                    </div>
                  </Fragment>
                ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── 辅助组件 ─────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function getDerivedValue(row: AuditorRow, key: SortKey): number {
  if (key === 'qcRate') return row.qcSampled > 0 ? row.qcPassed / row.qcSampled : 0;
  return row[key];
}

function Th({
  label, sortKey, cur, dir, onSort, align = 'right',
}: {
  label: string;
  sortKey: SortKey | null;
  cur: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sortKey !== null && cur === sortKey;
  return (
    <th
      onClick={sortKey ? () => onSort(sortKey) : undefined}
      style={{
        padding: '9px 14px',
        textAlign: align,
        fontSize: 11,
        fontWeight: 600,
        color: active ? 'var(--gold)' : 'var(--text-3)',
        letterSpacing: '0.04em',
        cursor: sortKey ? 'pointer' : 'default',
        borderBottom: '1px solid var(--hairline-strong)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span className="row gap-1" style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {label}
        {sortKey && (
          active
            ? dir === 'desc'
              ? <ChevronDown size={11} style={{ color: 'var(--gold)' }} />
              : <ChevronUp size={11} style={{ color: 'var(--gold)' }} />
            : <Minus size={10} style={{ opacity: 0.3 }} />
        )}
      </span>
    </th>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="row gap-1 t-small text-3">
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
}
