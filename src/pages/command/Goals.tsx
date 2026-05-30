import { useState } from 'react';
import { Target, TrendingUp, Calendar, Database, FileSpreadsheet } from 'lucide-react';
import { Card, PageHeader, StatCard, SectionTitle, Badge, ProgressBar, Segmented } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { GOALS } from '../../lib/mockData';
import type { GoalRow } from '../../types';

// ─── Derived summary stats ────────────────────────────────────────────────────
const totalBP = GOALS.reduce((s, g) => s + g.bpAnnual, 0);
const totalMonthlyTarget = GOALS.reduce((s, g) => s + g.monthlyTarget, 0);
const totalMonthlyActual = GOALS.reduce((s, g) => s + g.monthlyActual, 0);
const totalYtd = GOALS.reduce((s, g) => s + g.ytd, 0);
const totalYtdTarget = GOALS.reduce((s, g) => s + g.ytdTarget, 0);
const monthlyPct = Math.round((totalMonthlyActual / totalMonthlyTarget) * 100);
const ytdPct = Math.round((totalYtd / totalYtdTarget) * 100);

// ─── Model color map (matching Overview palette) ──────────────────────────────
const MODEL_COLORS: Record<string, string> = {
  L9: '#D6BC82',
  L8: '#5AA2F0',
  L7: '#E25563',
  L6: '#34C892',
  MEGA: '#9C8CF0',
};

// ─── Chart: Monthly target vs actual grouped bars ────────────────────────────
const monthlyBarOption = () => {
  const b = baseOption();
  return {
    ...b,
    legend: {
      data: ['月度目标', '月度实际'],
      top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10,
      textStyle: { color: cssVar('--text-2'), fontSize: 12 },
    },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 14, top: 36, bottom: 6, containLabel: true },
    xAxis: {
      type: 'category',
      data: GOALS.map(g => g.model),
      ...axisStyle(),
      splitLine: { show: false },
    },
    yAxis: { type: 'value', ...axisStyle() },
    series: [
      {
        name: '月度目标',
        type: 'bar',
        barWidth: '32%',
        data: GOALS.map(g => g.monthlyTarget),
        itemStyle: {
          color: cssVar('--surface-3'),
          borderColor: cssVar('--hairline-strong'),
          borderWidth: 1,
          borderRadius: [4, 4, 0, 0],
        },
        ...ANIM,
      },
      {
        name: '月度实际',
        type: 'bar',
        barWidth: '32%',
        data: GOALS.map(g => ({
          value: g.monthlyActual,
          itemStyle: {
            color: MODEL_COLORS[g.model] ?? cssVar('--gold'),
            borderRadius: [4, 4, 0, 0],
          },
        })),
        label: {
          show: true,
          position: 'top',
          formatter: (p: { dataIndex: number }) => {
            const g = GOALS[p.dataIndex];
            return g ? `${Math.round((g.monthlyActual / g.monthlyTarget) * 100)}%` : '';
          },
          color: cssVar('--text-2'),
          fontSize: 11,
          fontWeight: 600,
        },
        ...ANIM,
      },
    ],
  };
};

// ─── Chart: YTD completion horizontal bullet-style bars ──────────────────────
const ytdBarOption = () => {
  const b = baseOption();
  const rows = [...GOALS].reverse();
  return {
    ...b,
    tooltip: {
      ...(b.tooltip as object),
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ seriesName: string; name: string; value: number }>) => {
        const row = GOALS.find(g => g.model === params[0]?.name);
        if (!row) return '';
        const pct = Math.round((row.ytd / row.ytdTarget) * 100);
        return `${params[0].name}<br/>YTD 实际 <b>${row.ytd.toLocaleString()}</b> / 目标 ${row.ytdTarget.toLocaleString()}<br/>完成率 <b>${pct}%</b>`;
      },
    },
    grid: { left: 8, right: 52, top: 8, bottom: 6, containLabel: true },
    xAxis: {
      type: 'value',
      max: (value: { max: number }) => Math.ceil(value.max * 1.15),
      axisLabel: { show: false },
      splitLine: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: rows.map(g => g.model),
      ...axisStyle(),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'YTD 目标',
        type: 'bar',
        barWidth: 14,
        data: rows.map(g => g.ytdTarget),
        itemStyle: {
          color: cssVar('--surface-3'),
          borderColor: cssVar('--hairline-strong'),
          borderWidth: 1,
          borderRadius: [0, 4, 4, 0],
        },
        z: 1,
        ...ANIM,
      },
      {
        name: 'YTD 实际',
        type: 'bar',
        barWidth: 14,
        barGap: '-100%',
        data: rows.map(g => ({
          value: g.ytd,
          itemStyle: {
            color: MODEL_COLORS[g.model] ?? cssVar('--gold'),
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (p: { name: string }) => {
            const row = GOALS.find(g => g.model === p.name);
            return row ? `${Math.round((row.ytd / row.ytdTarget) * 100)}%` : '';
          },
          color: cssVar('--text-2'),
          fontSize: 11,
          fontWeight: 600,
        },
        z: 2,
        ...ANIM,
      },
    ],
  };
};

// ─── Source badge ─────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source: GoalRow['source'] }) {
  if (source === '手工Excel') {
    return (
      <span
        className="row gap-1 badge"
        style={{
          background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
          color: 'var(--warning)',
          fontSize: 11,
        }}
      >
        <FileSpreadsheet size={10} />
        手工 Excel
      </span>
    );
  }
  return (
    <span
      className="row gap-1 badge"
      style={{
        background: 'color-mix(in srgb, var(--emerald) 12%, transparent)',
        color: 'var(--emerald)',
        fontSize: 11,
      }}
    >
      <Database size={10} />
      内部 API
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Goals() {
  const [view, setView] = useState<'monthly' | 'ytd'>('monthly');

  return (
    <div className="page">
      <PageHeader
        title="目标管理"
        subtitle="2026年 · BP 年度目标与月度拆解 · 手工 Excel + 内部 API 双数据源"
        actions={
          <Segmented
            options={[
              { value: 'monthly', label: '月度视图' },
              { value: 'ytd', label: 'YTD 视图' },
            ]}
            value={view}
            onChange={setView}
          />
        }
      />

      {/* ── KPI Row ── */}
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}
      >
        <StatCard
          label="年度 BP 总目标"
          raw={totalBP}
          unit="台"
          icon={<Target size={16} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="本月完成"
          raw={totalMonthlyActual}
          unit="台"
          change={monthlyPct - 100}
          icon={<Calendar size={16} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="本月目标"
          raw={totalMonthlyTarget}
          unit="台"
          icon={<Target size={16} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="YTD 完成率"
          raw={ytdPct}
          unit="%"
          change={ytdPct - 95}
          icon={<TrendingUp size={16} />}
          delayClass="reveal-4"
        />
        <StatCard
          label="YTD 累计交付"
          raw={totalYtd}
          unit="台"
          icon={<TrendingUp size={16} />}
          delayClass="reveal-5"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-4 reveal reveal-3" style={{ gridTemplateColumns: '1.4fr 1fr', marginBottom: 16 }}>
        <Card>
          <SectionTitle right={<Badge color="var(--gold)">{view === 'monthly' ? '本月' : 'YTD'} 各车型</Badge>}>
            {view === 'monthly' ? '月度目标 vs 实际（台）' : 'YTD 子弹图 · 目标完成对比'}
          </SectionTitle>
          {view === 'monthly' ? (
            <Chart build={monthlyBarOption} height={260} />
          ) : (
            <Chart build={ytdBarOption} height={260} />
          )}
        </Card>

        {/* Monthly completion summary donut-ish with radial-like mini stats */}
        <Card className="reveal reveal-4">
          <SectionTitle>本月完成率概览</SectionTitle>
          <div className="col gap-3">
            {GOALS.map(g => {
              const pct = Math.round((g.monthlyActual / g.monthlyTarget) * 100);
              const color = MODEL_COLORS[g.model] ?? 'var(--gold)';
              const good = pct >= 90;
              const risk = pct < 80;
              return (
                <div key={g.model} className="col gap-1">
                  <div className="row spread" style={{ marginBottom: 3 }}>
                    <div className="row gap-2">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{g.model}</span>
                    </div>
                    <div className="row gap-2">
                      <span
                        className="tnum"
                        style={{ fontSize: 13, fontWeight: 700, color: risk ? 'var(--danger)' : good ? 'var(--emerald)' : 'var(--warning)' }}
                      >
                        {pct}%
                      </span>
                      <span className="t-small text-3 tnum">
                        {g.monthlyActual.toLocaleString()} / {g.monthlyTarget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <ProgressBar
                    pct={pct}
                    color={risk ? 'var(--danger)' : good ? color : 'var(--warning)'}
                    height={5}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Detail table ── */}
      <Card className="reveal reveal-5">
        <SectionTitle
          right={
            <div className="row gap-2">
              <span
                className="row gap-1 badge"
                style={{ background: 'color-mix(in srgb, var(--warning) 12%, transparent)', color: 'var(--warning)' }}
              >
                <FileSpreadsheet size={10} />
                手工 Excel ×{GOALS.filter(g => g.source === '手工Excel').length}
              </span>
              <span
                className="row gap-1 badge"
                style={{ background: 'color-mix(in srgb, var(--emerald) 12%, transparent)', color: 'var(--emerald)' }}
              >
                <Database size={10} />
                内部 API ×{GOALS.filter(g => g.source === '内部API').length}
              </span>
            </div>
          }
        >
          车型目标明细
        </SectionTitle>

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>车型</th>
                <th className="td-num">年度 BP</th>
                <th className="td-num">本月目标</th>
                <th className="td-num">本月实际</th>
                <th style={{ width: 160 }}>月度进度</th>
                <th className="td-num">YTD 完成</th>
                <th className="td-num">YTD 目标</th>
                <th style={{ width: 140 }}>YTD 进度</th>
                <th>数据源</th>
              </tr>
            </thead>
            <tbody>
              {GOALS.map((g, idx) => {
                const mPct = Math.round((g.monthlyActual / g.monthlyTarget) * 100);
                const yPct = Math.round((g.ytd / g.ytdTarget) * 100);
                const color = MODEL_COLORS[g.model] ?? 'var(--gold)';
                const mRisk = mPct < 80;
                const mGood = mPct >= 90;
                const yRisk = yPct < 80;
                const yGood = yPct >= 90;
                return (
                  <tr
                    key={g.model}
                    className={`reveal reveal-${Math.min(idx + 1, 6)}`}
                  >
                    <td>
                      <div className="row gap-2">
                        <span
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: color,
                          }}
                        />
                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{g.model}</span>
                      </div>
                    </td>
                    <td className="td-num tnum" style={{ color: 'var(--text-2)' }}>
                      {g.bpAnnual.toLocaleString()}
                    </td>
                    <td className="td-num tnum" style={{ color: 'var(--text-2)' }}>
                      {g.monthlyTarget.toLocaleString()}
                    </td>
                    <td
                      className="td-num tnum"
                      style={{
                        fontWeight: 700,
                        color: mRisk ? 'var(--danger)' : mGood ? 'var(--emerald)' : 'var(--warning)',
                      }}
                    >
                      {g.monthlyActual.toLocaleString()}
                    </td>
                    <td>
                      <div className="col gap-1">
                        <ProgressBar
                          pct={mPct}
                          color={mRisk ? 'var(--danger)' : mGood ? color : 'var(--warning)'}
                          height={5}
                        />
                        <span
                          className="tnum"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: mRisk ? 'var(--danger)' : mGood ? 'var(--emerald)' : 'var(--warning)',
                          }}
                        >
                          {mPct}%
                        </span>
                      </div>
                    </td>
                    <td
                      className="td-num tnum"
                      style={{
                        fontWeight: 700,
                        color: yRisk ? 'var(--danger)' : yGood ? 'var(--emerald)' : 'var(--warning)',
                      }}
                    >
                      {g.ytd.toLocaleString()}
                    </td>
                    <td className="td-num tnum" style={{ color: 'var(--text-2)' }}>
                      {g.ytdTarget.toLocaleString()}
                    </td>
                    <td>
                      <div className="col gap-1">
                        <ProgressBar
                          pct={yPct}
                          color={yRisk ? 'var(--danger)' : yGood ? color : 'var(--warning)'}
                          height={5}
                        />
                        <span
                          className="tnum"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: yRisk ? 'var(--danger)' : yGood ? 'var(--emerald)' : 'var(--warning)',
                          }}
                        >
                          {yPct}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <SourceBadge source={g.source} />
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals row */}
            <tfoot>
              <tr style={{ background: 'var(--surface-2)' }}>
                <td style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  汇总
                </td>
                <td className="td-num tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                  {totalBP.toLocaleString()}
                </td>
                <td className="td-num tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                  {totalMonthlyTarget.toLocaleString()}
                </td>
                <td className="td-num tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                  {totalMonthlyActual.toLocaleString()}
                </td>
                <td>
                  <div className="col gap-1">
                    <ProgressBar
                      pct={monthlyPct}
                      color={monthlyPct < 80 ? 'var(--danger)' : monthlyPct >= 90 ? 'var(--gold)' : 'var(--warning)'}
                      height={5}
                    />
                    <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>
                      {monthlyPct}%
                    </span>
                  </div>
                </td>
                <td className="td-num tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                  {totalYtd.toLocaleString()}
                </td>
                <td className="td-num tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                  {totalYtdTarget.toLocaleString()}
                </td>
                <td>
                  <div className="col gap-1">
                    <ProgressBar
                      pct={ytdPct}
                      color={ytdPct < 80 ? 'var(--danger)' : ytdPct >= 90 ? 'var(--gold)' : 'var(--warning)'}
                      height={5}
                    />
                    <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>
                      {ytdPct}%
                    </span>
                  </div>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
