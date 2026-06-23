import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { useTheme } from '../contexts/ThemeContext';
import { cssVar } from '../lib/chartTheme';
import type { GraphNode, GraphEdge, NodeKind } from '../types';

// 节点类型 → 色 / 标签 / 形状
const KIND_VAR: Record<NodeKind, string> = {
  account: '--gold', card: '--c5', device: '--c6', ip: '--c7', payee: '--warning', merchant: '--c8',
};
const KIND_LABEL: Record<NodeKind, string> = {
  account: '账户', card: '卡', device: '设备', ip: 'IP', payee: '收款人', merchant: '商户',
};
const KIND_SYMBOL: Record<NodeKind, string> = {
  account: 'circle', card: 'roundRect', device: 'diamond', ip: 'triangle', payee: 'circle', merchant: 'rect',
};
// 边关系 → 线型
const EDGE_DASH: Record<string, number | number[]> = {
  '资金': 0, '转账': 0, '共享设备': [4, 4], '同 IP': [2, 3], '同收款人': [6, 3], '同证件': [1, 3],
};

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightId?: string | null;     // 高亮该节点 + 邻居
  onNodeClick?: (node: GraphNode) => void;
  height?: number | string;
  colorBy?: 'kind' | 'community'; // kind=按实体类型着色 · community=按团伙簇着色
  repulsion?: number;
}

/** 力导向风险关系网络（多类型节点 + 资金/设备/IP 边 · 邻居高亮 · 可拖拽缩放）。 */
export default function RiskGraph({ nodes, edges, highlightId, onNodeClick, height = 440, colorBy = 'kind', repulsion = 220 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const { mode } = useTheme();
  const stateRef = useRef({ nodes, onNodeClick });
  stateRef.current = { nodes, onNodeClick };

  const neighbors = useMemo(() => {
    if (!highlightId) return null;
    const set = new Set<string>([highlightId]);
    edges.forEach(e => { if (e.source === highlightId) set.add(e.target); if (e.target === highlightId) set.add(e.source); });
    return set;
  }, [highlightId, edges]);

  // 社区调色板（团伙簇）
  const communityColors = useMemo(() => ['--c4', '--c1', '--c5', '--c6', '--warning', '--c7', '--c2', '--c8'], []);

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    inst.current.on('click', (p) => {
      const d = p.data as { id?: string } | undefined;
      if (p.dataType === 'node' && d?.id) {
        const { nodes: ns, onNodeClick: cb } = stateRef.current;
        const n = ns.find(x => x.id === d.id);
        if (n) cb?.(n);
      }
    });
    return () => { ro.disconnect(); inst.current?.dispose(); inst.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!inst.current) return;
    const text2 = cssVar('--text-2'), text3 = cssVar('--text-3'), hairline = cssVar('--hairline');
    const surface = cssVar('--surface-1'), danger = cssVar('--danger'), warning = cssVar('--warning'), gold = cssVar('--gold');

    const nodeColor = (n: GraphNode) => {
      if (colorBy === 'community' && n.community != null) return cssVar(communityColors[n.community % communityColors.length]);
      return cssVar(KIND_VAR[n.kind]);
    };
    const riskRing = (n: GraphNode) => n.risk === 'high' ? danger : n.risk === 'mid' ? warning : 'transparent';

    const data = nodes.map(n => {
      const dim = neighbors ? !neighbors.has(n.id) : false;
      const hot = highlightId === n.id;
      const base = nodeColor(n);
      return {
        id: n.id, name: n.name,
        symbol: KIND_SYMBOL[n.kind],
        symbolSize: 14 + n.centrality * 34,
        category: colorBy === 'community' ? (n.community ?? 0) : n.kind,
        itemStyle: {
          color: base,
          opacity: dim ? 0.18 : 1,
          borderColor: hot ? gold : riskRing(n),
          borderWidth: hot ? 3 : (n.risk === 'high' || n.risk === 'mid' ? 2 : 0),
          shadowBlur: hot ? 18 : (n.risk === 'high' ? 10 : 0),
          shadowColor: hot ? cssVar('--gold-glow') : cssVar('--danger-glow'),
        },
        label: {
          show: n.centrality > 0.5 || hot || (neighbors?.has(n.id) ?? false),
          color: dim ? text3 : text2, fontSize: 11, fontFamily: "'Geist',sans-serif",
        },
      };
    });

    const links = edges.map(e => {
      const dim = neighbors ? !(neighbors.has(e.source) && neighbors.has(e.target)) : false;
      const isFund = e.relation === '资金' || e.relation === '转账';
      return {
        source: e.source, target: e.target,
        lineStyle: {
          color: dim ? hairline : (isFund ? gold : cssVar('--hairline-strong')),
          width: isFund ? 0.8 + e.weight * 2.4 : 0.8 + e.weight * 0.8,
          curveness: 0.14,
          opacity: dim ? 0.2 : (isFund ? 0.7 : 0.5),
          type: (EDGE_DASH[e.relation] ?? 0) === 0 ? 'solid' : 'dashed',
        },
      };
    });

    const categories = colorBy === 'community'
      ? Array.from(new Set(nodes.map(n => n.community ?? 0))).sort((a, b) => a - b).map(c => ({ name: `团伙簇 ${c + 1}` }))
      : (Object.keys(KIND_LABEL) as NodeKind[]).map(k => ({ name: KIND_LABEL[k], itemStyle: { color: cssVar(KIND_VAR[k]) } }));

    inst.current.setOption({
      legend: colorBy === 'kind' ? {
        data: (Object.keys(KIND_LABEL) as NodeKind[]).map(k => KIND_LABEL[k]),
        textStyle: { color: text3, fontSize: 11 }, icon: 'circle', itemWidth: 9, itemHeight: 9,
        bottom: 2, left: 'center',
      } : undefined,
      tooltip: {
        backgroundColor: surface, borderColor: hairline, borderWidth: 1, padding: [8, 12],
        textStyle: { color: cssVar('--text-1'), fontSize: 12 },
        extraCssText: 'border-radius:10px;box-shadow:0 12px 36px rgba(0,0,0,.4);',
        formatter: (p: { dataType?: string; data?: { id?: string } }) => {
          if (p.dataType !== 'node') return '';
          const n = nodes.find(x => x.id === p.data?.id); if (!n) return '';
          const riskTxt = n.risk === 'high' ? `<span style="color:${danger}">高危</span>` : n.risk === 'mid' ? `<span style="color:${warning}">中风险</span>` : '低风险';
          return `<b>${n.name}</b> · ${KIND_LABEL[n.kind]}<br/>${n.detail || ''}<br/>风险：${riskTxt}`;
        },
      },
      animationDuration: 700,
      series: [{
        type: 'graph', layout: 'force', roam: true, draggable: true,
        force: { repulsion, edgeLength: [60, 160], gravity: 0.08, friction: 0.16 },
        categories, data, links,
        emphasis: { focus: 'adjacency', label: { show: true }, lineStyle: { width: 3 } },
        lineStyle: { color: hairline, curveness: 0.14 },
        label: { position: 'right' },
        scaleLimit: { min: 0.4, max: 3 },
      }],
    }, true);
  }, [mode, nodes, edges, highlightId, neighbors, colorBy, repulsion, communityColors]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

export { KIND_VAR, KIND_LABEL };
