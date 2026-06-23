import { useEffect, useState } from 'react';
import {
  Activity, Gauge, AlertTriangle, Zap, Database,
  CheckCircle2, Clock, BarChart3,
} from 'lucide-react';
import { PageHeader, StatCard, Card, SectionTitle } from '../components/ui';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, sem, areaGradient, cssVar } from '../lib/chartTheme';
import { MONITOR_SERIES } from '../lib/mockData';
import type { MonitorPoint } from '../types';

// ── 衍生数据 ──────────────────────────────────────────────────────────────────
const mon = MONITOR_SERIES;
const latest: MonitorPoint = mon[mon.length - 1];
const xLabels = mon.map((p, i) => (i % 12 === 0 ? p.t : ''));
// 错误率抬升区间标注端点
const ERR_SPIKE_START = mon[48].t;
const ERR_SPIKE_END = mon[56].t;

// ── 底部小卡数据 ──────────────────────────────────────────────────────────────
const MINI_STATS = [
  { label: '当前并发连接', value: '2,481', icon: <Activity size={14} /> },
  { label: '今日总调用', value: '1,842,060', icon: <BarChart3 size={14} /> },
  { label: '平均 tokens/req', value: '1,382', icon: <Zap size={14} /> },
  { label: '模型上行带宽', value: '38.2 MB/s', icon: <Database size={14} /> },
  { label: '缓存节省成本', value: '$312', icon: <CheckCircle2 size={14} /> },
  { label: '最近错误时间', value: '14:27:33', icon: <AlertTriangle size={14} /> },
];

// ── ECharts builders ──────────────────────────────────────────────────────────

function buildQpsErrOption(data: MonitorPoint[]) {
  return {
    ...baseOption(),
    legend: {
      show: true, right: 0, top: 0, itemWidth: 10, itemHeight: 10,
      textStyle: { color: cssVar('--text-3'), fontSize: 11 },
      data: ['QPS', '错误率 %'],
    },
    grid: { left: 8, right: 8, top: 28, bottom: 22, containLabel: true },
    tooltip: { ...(baseOption().tooltip as object), trigger: 'axis' },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(p => p.t),
      axisLabel: {
        ...axisStyle().axisLabel,
        interval: (_i: number, v: string) => xLabels[data.findIndex(p => p.t === v)] !== '',
        formatter: (_v: string, i: number) => xLabels[i] || '',
      },
      axisLine: axisStyle().axisLine,
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: [
      { type: 'value', ...axisStyle(), name: 'QPS', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, position: 'left' },
      {
        type: 'value', ...axisStyle(),
        splitLine: { show: false },
        max: 8,
        name: '错误率%',
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
        position: 'right',
        axisLabel: { ...axisStyle().axisLabel, formatter: '{value}%' },
      },
    ],
    series: [
      {
        name: 'QPS',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: data.map(p => p.qps),
        lineStyle: { color: accent(), width: 2 },
        areaStyle: { color: areaGradient(accent(), 0.22) },
        yAxisIndex: 0,
      },
      {
        name: '错误率 %',
        type: 'line',
        smooth: true,
        showSymbol: false,
        yAxisIndex: 1,
        data: data.map(p => p.errRate),
        lineStyle: { color: sem('error'), width: 1.8 },
        markArea: {
          silent: true,
          itemStyle: { color: `color-mix(in srgb, ${sem('error')} 9%, transparent)` },
          data: [[{ xAxis: ERR_SPIKE_START }, { xAxis: ERR_SPIKE_END }]],
          label: {
            show: true,
            position: 'insideTopLeft',
            color: sem('error'),
            fontSize: 10,
            formatter: 'v4 canary 错误率抬升',
            fontFamily: "'Geist Mono',ui-monospace,monospace",
          },
        },
      },
    ],
    animationDuration: 800,
    animationEasing: 'cubicOut',
  };
}

function buildCacheTokenOption(data: MonitorPoint[]) {
  const blue = cssVar('--c2');
  const dim = cssVar('--c8');
  return {
    ...baseOption(),
    legend: {
      show: true, right: 0, top: 0, itemWidth: 10, itemHeight: 10,
      textStyle: { color: cssVar('--text-3'), fontSize: 11 },
      data: ['缓存命中 %', '缓存未命中 %', 'Tokens/s (K)'],
    },
    grid: { left: 8, right: 8, top: 28, bottom: 22, containLabel: true },
    tooltip: { ...(baseOption().tooltip as object), trigger: 'axis' },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(p => p.t),
      axisLabel: {
        ...axisStyle().axisLabel,
        interval: (_i: number, v: string) => xLabels[data.findIndex(p => p.t === v)] !== '',
        formatter: (_v: string, i: number) => xLabels[i] || '',
      },
      axisLine: axisStyle().axisLine,
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: 'value', ...axisStyle(),
        max: 100,
        name: '占比 %',
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
        position: 'left',
        axisLabel: { ...axisStyle().axisLabel, formatter: '{value}%' },
      },
      {
        type: 'value', ...axisStyle(),
        splitLine: { show: false },
        name: 'Tokens K',
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
        position: 'right',
        axisLabel: { ...axisStyle().axisLabel, formatter: '{value}K' },
      },
    ],
    series: [
      {
        name: '缓存命中 %',
        type: 'line',
        stack: 'cache',
        smooth: true,
        showSymbol: false,
        data: data.map(p => p.cacheHit),
        lineStyle: { color: accent(), width: 1.5 },
        areaStyle: { color: areaGradient(accent(), 0.32), opacity: 1 },
        yAxisIndex: 0,
      },
      {
        name: '缓存未命中 %',
        type: 'line',
        stack: 'cache',
        smooth: true,
        showSymbol: false,
        data: data.map(p => +(100 - p.cacheHit).toFixed(1)),
        lineStyle: { color: dim, width: 1.5 },
        areaStyle: { color: areaGradient(dim, 0.18), opacity: 1 },
        yAxisIndex: 0,
      },
      {
        name: 'Tokens/s (K)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: data.map(p => p.tokensK),
        lineStyle: { color: blue, width: 1.8, type: 'dashed' },
        yAxisIndex: 1,
      },
    ],
    animationDuration: 800,
    animationEasing: 'cubicOut',
  };
}

// ── 组件 ──────────────────────────────────────────────────────────────────────
export default function Monitoring() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // KPI 取最新点
  const qps = latest.qps;
  const p95 = latest.p95;
  const p50 = latest.p50;
  const errRate = latest.errRate;
  const cacheHit = latest.cacheHit;

  // spark 取近 16 点
  const spark16 = <K extends keyof MonitorPoint>(key: K) =>
    mon.slice(-16).map(p => p[key] as number);

  return (
    <div className="page">
      <PageHeader
        title="在线监控"
        subtitle="秒级脉搏仪 — QPS · p95/p50 延迟 · 错误率 · 缓存命中 · token 吞吐"
        actions={
          <span className="live-pill">
            <span className="live-dot" />
            实时 · 5s&nbsp;
            <span className="mononum" style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {elapsed}s 前更新
            </span>
          </span>
        }
      />

      {/* ── KPI 条 ── */}
      <div
        className="grid grid-cols-auto"
        style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginTop: 14 }}
      >
        <StatCard
          label="在线 QPS"
          raw={qps}
          unit=""
          change={4.2}
          spark={spark16('qps')}
          icon={<Activity size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-1"
        />
        <StatCard
          label="p95 延迟"
          raw={p95}
          unit="ms"
          change={7.5}
          spark={spark16('p95')}
          icon={<Clock size={15} />}
          accentVar="var(--gold)"
          invertTrend
          delayClass="reveal-2"
        />
        <StatCard
          label="p50 延迟"
          raw={p50}
          unit="ms"
          change={2.8}
          spark={spark16('p50')}
          icon={<Gauge size={15} />}
          accentVar="var(--gold)"
          invertTrend
          delayClass="reveal-3"
        />
        <StatCard
          label="错误率"
          raw={errRate}
          unit="%"
          decimals={2}
          change={3.2}
          spark={spark16('errRate')}
          icon={<AlertTriangle size={15} />}
          accentVar="var(--gold)"
          invertTrend
          delayClass="reveal-4"
        />
        <StatCard
          label="缓存命中率"
          raw={cacheHit}
          unit="%"
          decimals={1}
          change={2.1}
          spark={spark16('cacheHit')}
          icon={<Database size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-5"
        />
      </div>

      {/* ── 主图区 ── */}
      <div
        className="grid grid-cols-auto"
        style={{ gridTemplateColumns: '1fr', gap: 14, marginTop: 14 }}
      >
        {/* 大图①：QPS / 错误率 双轴时序 */}
        <Card className="reveal reveal-2">
          <SectionTitle
            right={
              <span className="live-pill" style={{ fontSize: 11 }}>
                <span className="live-dot" />近 6h · 72 点 · 5min/格
              </span>
            }
          >
            <span className="row gap-2">
              <Activity size={13} />
              QPS · 错误率 — 双轴时序（红区 = v4 canary 错误率抬升）
            </span>
          </SectionTitle>
          <Chart
            height={260}
            deps={[]}
            build={() => buildQpsErrOption(mon)}
          />
          <div
            className="row gap-2"
            style={{
              marginTop: 10,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
            }}
          >
            <AlertTriangle size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span className="t-small text-2">
              红色标注区间（约 4h–5h 内）为 v4 canary 引发的错误率抬升，
              峰值达 <span className="mononum" style={{ color: 'var(--danger)' }}>4.8%</span>，
              同期 QPS 未下降 — 问题源于重试放大而非流量骤升。
            </span>
          </div>
        </Card>

        {/* 大图②：缓存命中 + token 吞吐堆叠面积 */}
        <Card className="reveal reveal-3">
          <SectionTitle
            right={
              <span className="t-small text-3" style={{ fontFamily: "'Geist Mono',monospace" }}>
                命中率均值 <span className="mononum" style={{ color: 'var(--gold)' }}>
                  {(mon.reduce((s, p) => s + p.cacheHit, 0) / mon.length).toFixed(1)}%
                </span>
              </span>
            }
          >
            <span className="row gap-2">
              <Database size={13} />
              缓存命中率 · token 吞吐 — 省钱杠杆可视化
            </span>
          </SectionTitle>
          <Chart
            height={240}
            deps={[]}
            build={() => buildCacheTokenOption(mon)}
          />
          <div
            className="row gap-2"
            style={{
              marginTop: 10,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
            }}
          >
            <Zap size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
            <span className="t-small text-2">
              绿色面积 = 缓存节省的推理调用；
              Token 吞吐（虚线）趋势与未命中面积正相关 —
              命中率每升 <span className="mononum">1%</span> 约节省
              <span className="mononum" style={{ color: 'var(--cost)' }}> $8–12/h</span>。
            </span>
          </div>
        </Card>
      </div>

      {/* ── 底部小卡片行 ── */}
      <div style={{ marginTop: 14 }}>
        <SectionTitle>实时系统快照</SectionTitle>
        <div
          className="grid grid-cols-auto"
          style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginTop: 8 }}
        >
          {MINI_STATS.map((s, i) => (
            <Card
              key={s.label}
              className={`reveal reveal-${Math.min(i + 1, 6)}`}
              style={{ padding: '12px 14px' }}
            >
              <div className="row gap-2" style={{ marginBottom: 6, color: 'var(--text-3)' }}>
                {s.icon}
                <span className="t-small text-3" style={{ fontSize: 10 }}>{s.label}</span>
              </div>
              <div
                className="mononum"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-1)',
                  letterSpacing: '-0.5px',
                }}
              >
                {s.value}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
