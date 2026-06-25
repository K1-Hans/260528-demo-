import { useCallback, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, Clock, GitFork, Zap } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import { axisStyle, baseOption, cssVar, danger, accent, warn } from '../lib/chartTheme';
import { LINEAGE_EDGES, LINEAGE_NODES } from '../lib/mockData';
import type { LineageNode } from '../types';

// ─── 节点 health → 语义色 ─────────────────────────────────────────────────────
const healthColor = (h: LineageNode['health']): string => {
  if (h === 'ok') return cssVar('--success');
  if (h === 'stale') return cssVar('--warning');
  return cssVar('--danger');
};
const healthLabel: Record<LineageNode['health'], string> = {
  ok: '正常', stale: '数据过期', broken: '断流',
};

// ─── layer 标签 ────────────────────────────────────────────────────────────────
const LAYER_LABELS = ['数据源', '明细层', '汇总层', '指标层'];

// ─── 受影响的断流链路（从 src_loan 向下游传导）─────────────────────────────────
const STALE_CHAIN = new Set(['src_loan', 'mdl_loan', 'met_npl']);

// ─── 节点位置计算（按 layer 分列，列内等距）────────────────────────────────────
type NodePos = { x: number; y: number; w: number; h: number };

const NODE_W = 176;
const NODE_H = 80;
const COL_GAP = 148;
const ROW_GAP = 18;

function calcLayout(nodes: LineageNode[]): Record<string, NodePos> {
  const byLayer: Record<number, LineageNode[]> = {};
  for (const n of nodes) {
    if (!byLayer[n.layer]) byLayer[n.layer] = [];
    byLayer[n.layer].push(n);
  }
  const pos: Record<string, NodePos> = {};
  const maxInCol = Math.max(...Object.values(byLayer).map(a => a.length));
  const totalH = maxInCol * NODE_H + (maxInCol - 1) * ROW_GAP;

  Object.entries(byLayer).forEach(([layer, ns]) => {
    const l = Number(layer);
    const colH = ns.length * NODE_H + (ns.length - 1) * ROW_GAP;
    const startY = (totalH - colH) / 2;
    ns.forEach((n, i) => {
      pos[n.id] = {
        x: l * (NODE_W + COL_GAP),
        y: startY + i * (NODE_H + ROW_GAP),
        w: NODE_W,
        h: NODE_H,
      };
    });
  });
  return pos;
}

// ─── KPI 顶栏 ─────────────────────────────────────────────────────────────────
function kpiData(nodes: LineageNode[]) {
  const staleNodes = nodes.filter(n => n.health === 'stale' || n.health === 'broken');
  const okNodes = nodes.filter(n => n.health === 'ok');
  const avgFresh = Math.round(okNodes.length / Math.max(nodes.length, 1) * 100);
  const brokenCount = nodes.filter(n => n.health === 'broken').length;
  return { total: nodes.length, stale: staleNodes.length, avgFresh, broken: brokenCount };
}

// ─── SVG 连线路径（贝塞尔曲线）───────────────────────────────────────────────
function edgePath(from: NodePos, to: NodePos): string {
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = to.x;
  const y2 = to.y + to.h / 2;
  const cx = (x1 + x2) / 2;
  return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
}

// ─── DAG 节点卡 ──────────────────────────────────────────────────────────────
function DagNode({ node, selected, highlighted, dimmed, onSelect }: {
  node: LineageNode;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}) {
  const isStale = node.health === 'stale' || node.health === 'broken';
  const isChain = STALE_CHAIN.has(node.id);

  const kindClass = node.kind === 'source' ? 'src'
    : node.kind === 'metric' ? 'metric'
    : 'model';

  return (
    <div
      className={`dag-node ${kindClass}${selected ? ' selected' : ''}${isChain && isStale ? ' stale-chain' : ''}`}
      style={{
        opacity: dimmed ? 0.35 : 1,
        transition: 'opacity 0.2s var(--ease), box-shadow 0.2s var(--ease)',
        cursor: 'pointer',
        position: 'relative',
        userSelect: 'none',
      }}
      onClick={() => onSelect(node.id)}
    >
      {/* 健康状态指示点 */}
      <span
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: healthColor(node.health),
          boxShadow: isStale ? `0 0 5px ${healthColor(node.health)}` : 'none',
          transition: 'background 0.2s',
        }}
      />

      {/* 断流警告 */}
      {isChain && isStale && (
        <span
          style={{
            position: 'absolute',
            top: 5,
            left: 5,
            color: cssVar('--warning'),
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <AlertTriangle size={11} />
        </span>
      )}

      <div
        className="dag-node-name"
        style={{
          fontWeight: 600,
          fontSize: 13,
          lineHeight: 1.35,
          marginBottom: 3,
          color: isChain && isStale ? cssVar('--warning') : 'var(--text-1)',
          paddingRight: 14,
          paddingLeft: isChain && isStale ? 16 : 0,
        }}
      >
        {node.name}
      </div>
      <div
        className="dag-node-table"
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: 10,
          color: 'var(--text-3)',
          marginBottom: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {node.table}
      </div>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <Clock size={10} style={{ color: 'var(--text-3)' }} />
        <span
          className="mononum"
          style={{
            fontSize: 10,
            color: isStale ? healthColor(node.health) : 'var(--text-3)',
            fontWeight: isStale ? 600 : 400,
          }}
        >
          {node.freshness}
        </span>
        <span
          className="badge"
          style={{
            fontSize: 9,
            padding: '1px 5px',
            background: `color-mix(in srgb, ${healthColor(node.health)} 14%, transparent)`,
            color: healthColor(node.health),
            marginLeft: 'auto',
          }}
        >
          {healthLabel[node.health]}
        </span>
      </div>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export default function Lineage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const pos = useMemo(() => calcLayout(LINEAGE_NODES), []);
  const kpi = useMemo(() => kpiData(LINEAGE_NODES), []);

  // Collect which nodes are in the selected upstream/downstream path
  const { upstream, downstream } = useMemo(() => {
    if (!selectedId) return { upstream: new Set<string>(), downstream: new Set<string>() };
    const up = new Set<string>();
    const down = new Set<string>();

    const walkUp = (id: string) => {
      LINEAGE_EDGES.filter(e => e.to === id).forEach(e => {
        if (!up.has(e.from)) { up.add(e.from); walkUp(e.from); }
      });
    };
    const walkDown = (id: string) => {
      LINEAGE_EDGES.filter(e => e.from === id).forEach(e => {
        if (!down.has(e.to)) { down.add(e.to); walkDown(e.to); }
      });
    };
    walkUp(selectedId);
    walkDown(selectedId);
    return { upstream: up, downstream: down };
  }, [selectedId]);

  const highlighted = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return new Set([selectedId, ...upstream, ...downstream]);
  }, [selectedId, upstream, downstream]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  // ─── 计算 SVG 画布尺寸 ────────────────────────────────────────────────────
  const svgW = useMemo(() => {
    const maxX = Math.max(...Object.values(pos).map(p => p.x + p.w));
    return maxX + 16;
  }, [pos]);

  const svgH = useMemo(() => {
    const maxY = Math.max(...Object.values(pos).map(p => p.y + p.h));
    return maxY + 16;
  }, [pos]);

  const selectedNode = selectedId ? LINEAGE_NODES.find(n => n.id === selectedId) : null;

  // ─── 健康分布图 (ECharts) ──────────────────────────────────────────────────
  const healthChartBuild = useCallback(() => {
    const okC = cssVar('--success');
    const warnC = cssVar('--warning');
    const dangerC = cssVar('--danger');

    return {
      ...baseOption(),
      backgroundColor: 'transparent',
      legend: { show: false },
      series: [{
        type: 'pie',
        radius: ['55%', '85%'],
        center: ['50%', '52%'],
        label: {
          show: true,
          formatter: '{b}\n{c}',
          fontSize: 11,
          color: cssVar('--text-2'),
          fontFamily: "'Geist','PingFang SC',sans-serif",
        },
        itemStyle: { borderWidth: 2, borderColor: cssVar('--surface-1') },
        data: [
          { name: '正常', value: LINEAGE_NODES.filter(n => n.health === 'ok').length, itemStyle: { color: okC } },
          { name: '过期', value: LINEAGE_NODES.filter(n => n.health === 'stale').length, itemStyle: { color: warnC } },
          { name: '断流', value: LINEAGE_NODES.filter(n => n.health === 'broken').length, itemStyle: { color: dangerC } },
        ],
      }],
    };
  }, []);

  // ─── 新鲜度条形图 (ECharts) ───────────────────────────────────────────────
  const freshnessChartBuild = useCallback(() => {
    const ax = axisStyle();
    const names = LINEAGE_NODES.map(n => n.name);
    // parse freshness to minutes for display
    const freshnessMin = LINEAGE_NODES.map(n => {
      const s = n.freshness;
      if (s.includes('min')) return parseFloat(s);
      if (s.includes('h')) return parseFloat(s) * 60;
      return 60;
    });
    const colors = LINEAGE_NODES.map(n => {
      if (n.health === 'ok') return cssVar('--success');
      if (n.health === 'stale') return cssVar('--warning');
      return cssVar('--danger');
    });

    return {
      ...baseOption(),
      backgroundColor: 'transparent',
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        name: '分钟',
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
        ...ax,
      },
      yAxis: {
        type: 'category',
        data: names,
        ...ax,
        axisLabel: { ...ax.axisLabel, fontSize: 10, width: 90, overflow: 'truncate' },
      },
      series: [{
        type: 'bar',
        barMaxWidth: 14,
        data: freshnessMin.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [0, 3, 3, 0] } })),
        label: {
          show: true,
          position: 'right',
          formatter: (p: { dataIndex: number }) => LINEAGE_NODES[p.dataIndex].freshness,
          fontSize: 10,
          color: cssVar('--text-3'),
          fontFamily: "'Geist Mono','Geist',sans-serif",
        },
      }],
    };
  }, []);

  // ─── 选中节点的上下游列表 ────────────────────────────────────────────────
  const upstreamNodes = selectedId ? LINEAGE_NODES.filter(n => upstream.has(n.id)) : [];
  const downstreamNodes = selectedId ? LINEAGE_NODES.filter(n => downstream.has(n.id)) : [];

  return (
    <div className="page page-wide">
      <PageHeader
        title="数据血缘"
        subtitle="源表 → 明细 → 汇总 → 指标 结构化 DAG · 新鲜度健康 · 断流传导"
        actions={
          <span className="tag tag-mono">
            <GitFork size={12} style={{ marginRight: 4 }} />
            {LINEAGE_NODES.length} 节点 · {LINEAGE_EDGES.length} 连线
          </span>
        }
      />

      {/* KPI 顶栏 */}
      <div
        className="ledger-grid"
        style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}
      >
        <div className="card" style={{ padding: '12px 14px' }}>
          <div className="label" style={{ marginBottom: 6 }}>节点总数</div>
          <div className="kpi-value" style={{ fontSize: 26 }}>
            <span className="mononum">{kpi.total}</span>
            <span className="kpi-unit">个</span>
          </div>
        </div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <div className="label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cssVar('--warning'), display: 'inline-block' }} />
            过期节点
          </div>
          <div className="kpi-value" style={{ fontSize: 26, color: kpi.stale > 0 ? 'var(--warning)' : undefined }}>
            <span className="mononum">{kpi.stale}</span>
            <span className="kpi-unit">个</span>
          </div>
        </div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <div className="label" style={{ marginBottom: 6 }}>
            <Activity size={11} style={{ marginRight: 4, verticalAlign: '-1px' }} />
            正常率
          </div>
          <div className="kpi-value" style={{ fontSize: 26, color: 'var(--gold)' }}>
            <span className="mononum">{kpi.avgFresh}</span>
            <span className="kpi-unit">%</span>
          </div>
        </div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <div className="label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cssVar('--danger'), display: 'inline-block' }} />
            断流节点
          </div>
          <div className="kpi-value" style={{ fontSize: 26, color: kpi.broken > 0 ? 'var(--danger)' : undefined }}>
            <span className="mononum">{kpi.broken}</span>
            <span className="kpi-unit">个</span>
          </div>
        </div>
      </div>

      {/* 断流传导警告 */}
      <div
        className="card"
        style={{
          padding: '10px 14px',
          marginBottom: 16,
          borderLeft: '3px solid var(--warning)',
          background: `color-mix(in srgb, ${warn()} 7%, var(--surface-1))`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <AlertTriangle size={15} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)' }}>断流传导告警</span>
          <span className="t-small text-2" style={{ marginLeft: 8 }}>
            上游 <code style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 3 }}>ods.loan_repay</code>（信贷系统 loan）新鲜度已 6.2h，
            超过刷新阈值，导致下游 <code style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 3 }}>fct_loan_risk</code> 汇总层
            及认证指标「<strong style={{ color: 'var(--warning)' }}>不良率</strong>」均标记为
            <span className="badge" style={{ marginLeft: 4, background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--warning)', fontSize: 10 }}>数据过期</span>。
          </span>
        </div>
      </div>

      {/* 主体：DAG + 侧边信息 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, alignItems: 'start' }}>
        {/* DAG 画布 */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* 列标题 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(4, ${NODE_W}px)`,
              gap: COL_GAP,
              padding: '12px 16px 0',
            }}
          >
            {LAYER_LABELS.map((label, i) => (
              <div
                key={label}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: i === 0 ? 'var(--text-3)' : i === 3 ? 'var(--gold)' : 'var(--text-3)',
                  borderBottom: `2px solid ${i === 3 ? 'var(--gold)' : 'var(--hairline)'}`,
                  paddingBottom: 8,
                  textAlign: 'center',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 相对定位容器：节点 + SVG 连线叠加 */}
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width: svgW + 32,
              height: svgH + 40,
              padding: 16,
            }}
          >
            {/* SVG 连线层（绝对定位，覆盖整个容器） */}
            <svg
              ref={svgRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              <defs>
                <marker id="arrow-ok" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <polygon points="0 0, 7 3.5, 0 7" fill={cssVar('--hairline-strong')} />
                </marker>
                <marker id="arrow-stale" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <polygon points="0 0, 7 3.5, 0 7" fill={warn()} />
                </marker>
                <marker id="arrow-active" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <polygon points="0 0, 7 3.5, 0 7" fill={accent()} />
                </marker>
              </defs>
              {LINEAGE_EDGES.map(e => {
                const fromPos = pos[e.from];
                const toPos = pos[e.to];
                if (!fromPos || !toPos) return null;

                const fromNode = LINEAGE_NODES.find(n => n.id === e.from);
                const toNode = LINEAGE_NODES.find(n => n.id === e.to);

                const isStaleEdge = (fromNode?.health === 'stale' || fromNode?.health === 'broken') &&
                  STALE_CHAIN.has(e.from) && STALE_CHAIN.has(e.to);

                const isHighlighted = highlighted.size > 0 && (highlighted.has(e.from) || highlighted.has(e.to));
                const isDimmed = highlighted.size > 0 && !isHighlighted;

                // offset pos by container padding (16px)
                const fp: NodePos = { ...fromPos, x: fromPos.x + 16, y: fromPos.y + 28 };
                const tp: NodePos = { ...toPos, x: toPos.x + 16, y: toPos.y + 28 };

                const d = edgePath(fp, tp);
                let strokeColor = cssVar('--hairline-strong');
                let markerEnd = 'url(#arrow-ok)';
                let strokeWidth = 1.5;
                let strokeDash = 'none';

                if (isStaleEdge) {
                  strokeColor = warn();
                  markerEnd = 'url(#arrow-stale)';
                  strokeWidth = 2;
                  strokeDash = '5,3';
                }
                if (isHighlighted) {
                  strokeColor = accent();
                  markerEnd = 'url(#arrow-active)';
                  strokeWidth = 2;
                }

                return (
                  <path
                    key={`${e.from}-${e.to}`}
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    markerEnd={markerEnd}
                    opacity={isDimmed ? 0.15 : 1}
                    style={{ transition: 'opacity 0.2s, stroke 0.2s' }}
                  />
                );
              })}
            </svg>

            {/* 节点 */}
            {LINEAGE_NODES.map(node => {
              const p = pos[node.id];
              if (!p) return null;
              const isHighlighted = highlighted.size === 0 || highlighted.has(node.id);
              return (
                <div
                  key={node.id}
                  data-nodeid={node.id}
                  style={{
                    position: 'absolute',
                    left: p.x + 16,
                    top: p.y + 28,
                    width: p.w,
                    height: p.h,
                  }}
                >
                  <DagNode
                    node={node}
                    selected={selectedId === node.id}
                    highlighted={isHighlighted}
                    dimmed={!isHighlighted}
                    onSelect={handleSelect}
                  />
                </div>
              );
            })}
          </div>

          {/* 图例 */}
          <div
            className="row gap-4"
            style={{
              padding: '10px 16px 14px',
              borderTop: '1px solid var(--hairline)',
              flexWrap: 'wrap',
            }}
          >
            {[
              { color: cssVar('--success'), label: '正常' },
              { color: cssVar('--warning'), label: '数据过期（stale）' },
              { color: cssVar('--danger'), label: '断流（broken）' },
            ].map(item => (
              <span key={item.label} className="row gap-1" style={{ fontSize: 11, color: 'var(--text-3)', alignItems: 'center' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                {item.label}
              </span>
            ))}
            <span className="row gap-1" style={{ fontSize: 11, color: 'var(--text-3)', alignItems: 'center' }}>
              <svg width={24} height={8} style={{ overflow: 'visible' }}>
                <line x1={0} y1={4} x2={20} y2={4} stroke={warn()} strokeWidth={1.5} strokeDasharray="4,2" />
              </svg>
              断流传导链路
            </span>
          </div>
        </div>

        {/* 侧边面板 */}
        <div className="col gap-3" style={{ gap: 12 }}>
          {/* 选中节点信息 */}
          {selectedNode ? (
            <Panel
              title={selectedNode.name}
              icon={<Zap size={13} />}
              right={
                <button
                  className="btn btn-subtle btn-sm"
                  onClick={() => setSelectedId(null)}
                  style={{ fontSize: 11 }}
                >
                  取消选中
                </button>
              }
            >
              <div className="col gap-2" style={{ gap: 8 }}>
                <div className="row spread">
                  <span className="label">物理表</span>
                  <code style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)' }}>{selectedNode.table}</code>
                </div>
                <div className="row spread">
                  <span className="label">层级</span>
                  <span className="t-small text-2">{LAYER_LABELS[selectedNode.layer]}</span>
                </div>
                <div className="row spread">
                  <span className="label">新鲜度</span>
                  <span
                    className="mononum"
                    style={{
                      fontSize: 12,
                      color: selectedNode.health !== 'ok' ? healthColor(selectedNode.health) : 'var(--text-2)',
                      fontWeight: selectedNode.health !== 'ok' ? 700 : 400,
                    }}
                  >
                    {selectedNode.freshness}
                  </span>
                </div>
                <div className="row spread">
                  <span className="label">健康</span>
                  <span
                    className="badge"
                    style={{
                      background: `color-mix(in srgb, ${healthColor(selectedNode.health)} 14%, transparent)`,
                      color: healthColor(selectedNode.health),
                    }}
                  >
                    {healthLabel[selectedNode.health]}
                  </span>
                </div>
                <div className="row spread">
                  <span className="label">负责人</span>
                  <span className="t-small text-2">{selectedNode.owner}</span>
                </div>

                {upstreamNodes.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 8, marginTop: 4 }}>
                    <div className="label" style={{ marginBottom: 6 }}>上游依赖 ({upstreamNodes.length})</div>
                    {upstreamNodes.map(n => (
                      <div
                        key={n.id}
                        className="row gap-2"
                        style={{ marginBottom: 4, alignItems: 'center' }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: healthColor(n.health),
                            flexShrink: 0,
                          }}
                        />
                        <span className="t-small text-2">{n.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {downstreamNodes.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 8, marginTop: 4 }}>
                    <div className="label" style={{ marginBottom: 6 }}>下游影响 ({downstreamNodes.length})</div>
                    {downstreamNodes.map(n => (
                      <div
                        key={n.id}
                        className="row gap-2"
                        style={{ marginBottom: 4, alignItems: 'center' }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: healthColor(n.health),
                            flexShrink: 0,
                          }}
                        />
                        <span className="t-small text-2">{n.name}</span>
                        {(n.health === 'stale' || n.health === 'broken') && (
                          <AlertTriangle size={11} style={{ color: healthColor(n.health) }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          ) : (
            <Panel title="血缘分析" icon={<GitFork size={13} />}>
              <div className="t-small text-3" style={{ lineHeight: 1.7 }}>
                点击 DAG 节点查看其<br />上下游依赖链路与影响范围。
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 10px',
                  borderRadius: 'var(--r-md)',
                  background: `color-mix(in srgb, ${danger()} 7%, var(--surface-2))`,
                  borderLeft: '2px solid var(--warning)',
                }}
              >
                <div className="t-small" style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: 3 }}>
                  <AlertTriangle size={11} style={{ marginRight: 4, verticalAlign: '-1px' }} />
                  src_loan 断流传导
                </div>
                <div className="t-small text-3" style={{ lineHeight: 1.5 }}>
                  信贷系统 → fct_loan_risk → 不良率指标，3 节点已标 stale。
                </div>
              </div>
            </Panel>
          )}

          {/* 健康分布图 */}
          <Panel title="健康分布" icon={<Activity size={13} />}>
            <Chart
              height={160}
              deps={[]}
              build={healthChartBuild}
            />
          </Panel>

          {/* 节点新鲜度 */}
          <Panel title="节点新鲜度" icon={<Clock size={13} />}>
            <Chart
              height={200}
              deps={[]}
              build={freshnessChartBuild}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
