import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { useTheme } from '../contexts/ThemeContext';
import { cssVar } from '../lib/chartTheme';
import { canAccess } from '../lib/mockData';
import type { GraphNode, GraphEdge, NodeKind, ClearanceLevel } from '../types';

const KIND_VAR: Record<NodeKind, string> = { person: '--gold', doc: '--c2', topic: '--c5', project: '--c3' };
const KIND_LABEL: Record<NodeKind, string> = { person: '人', doc: '文档', topic: '主题', project: '项目' };

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clearance: ClearanceLevel;       // 当前角色密级（驱动灰锁）
  highlightId?: string | null;     // 高亮该节点 + 邻居（点引用/结果联动）
  onNodeClick?: (node: GraphNode) => void;
  height?: number | string;
  showLockedCount?: (n: number) => void;
}

/** 力导向知识图谱（权限感知：超密级节点灰锁占位，可溯源联动高亮）。 */
export default function GraphCanvas({ nodes, edges, clearance, highlightId, onNodeClick, height = 420 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const { mode } = useTheme();
  // 持最新引用，避免 mount 时注册的 click 句柄捕获到旧 clearance/nodes
  const stateRef = useRef({ nodes, clearance, onNodeClick });
  stateRef.current = { nodes, clearance, onNodeClick };

  // 邻居集合（高亮联动）
  const neighbors = useMemo(() => {
    if (!highlightId) return null;
    const set = new Set<string>([highlightId]);
    edges.forEach(e => { if (e.source === highlightId) set.add(e.target); if (e.target === highlightId) set.add(e.source); });
    return set;
  }, [highlightId, edges]);

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    inst.current.on('click', (p) => {
      const d = p.data as { id?: string } | undefined;
      if (p.dataType === 'node' && d?.id) {
        const { nodes: ns, clearance: cl, onNodeClick: cb } = stateRef.current;
        const n = ns.find(x => x.id === d.id);
        if (n && canAccess(cl, n.level)) cb?.(n);
      }
    });
    return () => { ro.disconnect(); inst.current?.dispose(); inst.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!inst.current) return;
    const text2 = cssVar('--text-2'), text3 = cssVar('--text-3'), hairline = cssVar('--hairline'), locked = cssVar('--text-3');
    const surface = cssVar('--surface-1');

    const data = nodes.map(n => {
      const visible = canAccess(clearance, n.level);
      const dim = neighbors ? !neighbors.has(n.id) : false;
      const base = cssVar(KIND_VAR[n.kind]);
      const isMe = n.id === 'me';
      return {
        id: n.id, name: n.name,
        symbolSize: 12 + n.centrality * 30,
        category: n.kind,
        itemStyle: {
          color: visible ? base : locked,
          opacity: dim ? 0.22 : visible ? 1 : 0.4,
          borderColor: isMe ? cssVar('--gold') : (highlightId === n.id ? cssVar('--gold') : 'transparent'),
          borderWidth: isMe || highlightId === n.id ? 2.5 : 0,
          shadowBlur: highlightId === n.id ? 16 : 0,
          shadowColor: cssVar('--gold-glow'),
        },
        label: {
          show: n.centrality > 0.55 || highlightId === n.id || (neighbors?.has(n.id) ?? false),
          color: dim ? text3 : text2, fontSize: 11, fontFamily: "'Geist',sans-serif",
          formatter: visible ? '{b}' : '🔒',
        },
        symbol: visible ? 'circle' : 'circle',
      };
    });
    // 两端只要有一端可见就画（受限端以灰锁呈现）
    const links = edges.map(e => {
      const dim = neighbors ? !(neighbors.has(e.source) && neighbors.has(e.target)) : false;
      return { source: e.source, target: e.target, lineStyle: { color: hairline, width: 0.6 + e.weight * 0.5, curveness: 0.12, opacity: dim ? 0.25 : 0.7 } };
    });

    inst.current.setOption({
      tooltip: {
        backgroundColor: surface, borderColor: hairline, borderWidth: 1, padding: [8, 12],
        textStyle: { color: cssVar('--text-1'), fontSize: 12 },
        extraCssText: 'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.18);',
        formatter: (p: { dataType?: string; data?: { id?: string } }) => {
          if (p.dataType !== 'node') return '';
          const n = nodes.find(x => x.id === p.data?.id); if (!n) return '';
          const vis = canAccess(clearance, n.level);
          return `<b>${n.name}</b> · ${KIND_LABEL[n.kind]}<br/>${n.detail || ''}<br/>${vis ? '密级 ' + n.level + ' · 可访问' : '<span style="color:' + cssVar('--warning') + '">🔒 密级 ' + n.level + ' · 受限</span>'}`;
        },
      },
      animationDuration: 700,
      series: [{
        type: 'graph', layout: 'force', roam: true, draggable: true,
        force: { repulsion: 200, edgeLength: [50, 150], gravity: 0.09, friction: 0.18 },
        categories: (['person', 'doc', 'topic', 'project'] as NodeKind[]).map(k => ({ name: KIND_LABEL[k] })),
        data, links,
        emphasis: { focus: 'adjacency', label: { show: true }, lineStyle: { width: 2 } },
        lineStyle: { color: hairline, curveness: 0.12 },
        label: { position: 'right' },
        scaleLimit: { min: 0.5, max: 2.5 },
      }],
    }, true);
  }, [mode, nodes, edges, clearance, highlightId, neighbors, onNodeClick]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

export { KIND_VAR, KIND_LABEL };
