import { useState } from 'react';
import { Plug, Box, Code, Sparkles, Package } from 'lucide-react';
import { PageHeader, StatCard, Segmented } from '../components/ui';
import { Panel } from '../components/sig';
import { StatusBadge, MeterBar, toast } from '../components/kit';
import Chart from '../components/Chart';
import { TOOLS, TOOL_KPIS } from '../lib/mockData';
import type { ToolKind } from '../types';
import {
  baseOption, axisStyle, chanColor, accent, DRAW,
} from '../lib/chartTheme';

const KPI_ICONS = [
  <Package size={16} />,
  <Plug size={16} />,
  <Code size={16} />,
  <Sparkles size={16} />,
];

type FilterKind = 'all' | ToolKind;

const FILTER_OPTIONS: { value: FilterKind; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'mcp', label: 'MCP' },
  { value: 'builtin', label: '内置' },
  { value: 'api', label: 'API' },
  { value: 'llm', label: '模型' },
];

function kindIcon(kind: ToolKind) {
  if (kind === 'mcp') return <Plug size={15} />;
  if (kind === 'builtin') return <Box size={15} />;
  if (kind === 'api') return <Code size={15} />;
  return <Sparkles size={15} />;
}

function kindTone(kind: ToolKind): 'good' | 'warn' | 'bad' | 'info' | 'muted' {
  if (kind === 'mcp') return 'info';
  if (kind === 'builtin') return 'muted';
  if (kind === 'api') return 'good';
  return 'warn';
}

function kindLabel(kind: ToolKind): string {
  if (kind === 'mcp') return 'MCP';
  if (kind === 'builtin') return '内置';
  if (kind === 'api') return 'API';
  return '模型';
}

export default function Tools() {
  const [filter, setFilter] = useState<FilterKind>('all');
  const [installedIds, setInstalledIds] = useState<Set<string>>(
    new Set(TOOLS.filter(t => t.installed).map(t => t.id))
  );

  const visible = filter === 'all' ? TOOLS : TOOLS.filter(t => t.kind === filter);

  function handleInstall(id: string, name: string) {
    setInstalledIds(prev => new Set([...prev, id]));
    toast(`已接入 ${name}`, 'success');
  }

  // Chart: category doughnut distribution
  function buildChart() {
    const cats = Array.from(new Set(TOOLS.map(t => t.category)));
    const catData = cats.map(cat => {
      const tools = TOOLS.filter(t => t.category === cat);
      const total = tools.reduce((s, t) => s + t.calls, 0);
      return { name: cat, value: total };
    }).filter(d => d.value > 0);

    const colors = [
      chanColor('--c1'),
      chanColor('--c2'),
      chanColor('--c3'),
      chanColor('--c4'),
      accent(),
    ];

    const base = baseOption();
    return {
      ...base,
      color: colors,
      tooltip: {
        ...(base.tooltip as Record<string, unknown>),
        trigger: 'item',
        formatter: '{b}: {c} 次 ({d}%)',
      },
      legend: {
        orient: 'vertical' as const,
        right: 16,
        top: 'center',
        textStyle: {
          color: (base.textStyle as Record<string, unknown>).color,
          fontSize: 12,
          fontFamily: "'Geist','PingFang SC',sans-serif",
        },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [{
        name: '调用量',
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['38%', '50%'],
        data: catData,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderRadius: 5, borderColor: 'transparent', borderWidth: 2 },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: accent() + '55' } },
        ...DRAW,
      }],
    };
  }

  // Chart: per-tool call volume bar
  function buildBarChart() {
    const installed = TOOLS.filter(t => t.calls > 0);
    const names = installed.map(t => t.name);
    const values = installed.map(t => t.calls);
    const colors = installed.map((_, i) => {
      const keys = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'];
      return chanColor(keys[i % keys.length]);
    });

    const base = baseOption();
    const axis = axisStyle();
    return {
      ...base,
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        ...(base.tooltip as Record<string, unknown>),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown[]) => {
          const p = (params as Array<{ name: string; value: number }>)[0];
          return `${p.name}<br/>调用量：<b>${p.value.toLocaleString()}</b> 次`;
        },
      },
      xAxis: {
        type: 'value' as const,
        ...axis,
        axisLabel: { ...axis.axisLabel, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) },
      },
      yAxis: {
        type: 'category' as const,
        data: names,
        ...axis,
        axisLabel: { ...axis.axisLabel, fontSize: 11 },
      },
      series: [{
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] },
        })),
        barMaxWidth: 22,
        emphasis: { itemStyle: { opacity: 0.82 } },
        ...DRAW,
      }],
    };
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="工具 & MCP 市场"
        subtitle="MCP / 内置 / API / 模型 四类可插拔编排"
        actions={<span className="tag tag-mono">tools:read</span>}
      />

      {/* KPI 带 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {TOOL_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      {/* 主体：图表区 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="调用量分布 · 按工具" icon={<Code size={13} />}>
          <Chart build={buildBarChart} height={220} deps={[]} />
        </Panel>
        <Panel title="调用量分布 · 按类别" icon={<Plug size={13} />}>
          <Chart build={buildChart} height={220} deps={[]} />
        </Panel>
      </div>

      {/* 工具卡片市场 */}
      <Panel
        title="工具市场"
        icon={<Box size={13} />}
        right={
          <Segmented
            options={FILTER_OPTIONS}
            value={filter}
            onChange={setFilter}
          />
        }
      >
        <div
          className="grid reveal"
          style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}
        >
          {visible.map(tool => {
            const isInstalled = installedIds.has(tool.id);
            return (
              <div
                key={tool.id}
                className="tool-card"
                style={{ opacity: isInstalled ? 1 : 0.55, transition: 'opacity 0.3s var(--ease)' }}
              >
                {/* Card header */}
                <div className="row spread" style={{ marginBottom: 8 }}>
                  <div className="row gap-2" style={{ minWidth: 0 }}>
                    <span style={{ color: 'var(--gold)', flexShrink: 0 }}>
                      {kindIcon(tool.kind)}
                    </span>
                    <span className="t-small" style={{ fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tool.name}
                    </span>
                  </div>
                  <StatusBadge status={kindLabel(tool.kind)} tone={kindTone(tool.kind)} />
                </div>

                {/* Category tag */}
                <div style={{ marginBottom: 8 }}>
                  <span className="tag">{tool.category}</span>
                </div>

                {/* Description */}
                <p className="t-small text-3" style={{ lineHeight: 1.6, marginBottom: 12, minHeight: 38 }}>
                  {tool.desc}
                </p>

                {/* Metrics */}
                <div className="col gap-2" style={{ marginBottom: 12 }}>
                  <div className="row spread" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    <span>调用量</span>
                    <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                      {tool.calls > 0 ? tool.calls.toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="row spread" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    <span>时延</span>
                    <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                      {tool.latencyMs > 0 ? `${tool.latencyMs} ms` : '—'}
                    </span>
                  </div>
                  {tool.successRate > 0 && (
                    <MeterBar
                      pct={tool.successRate}
                      color="var(--success)"
                      label={`${tool.successRate.toFixed(1)}%`}
                    />
                  )}
                </div>

                {/* Footer */}
                <div className="row spread" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 10 }}>
                  {isInstalled ? (
                    <StatusBadge status="已接入" tone="good" />
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleInstall(tool.id, tool.name)}
                    >
                      一键接入
                    </button>
                  )}
                  {tool.calls > 0 && (
                    <span className="t-small text-3 tnum">
                      今日 {tool.calls.toLocaleString()} 次
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
