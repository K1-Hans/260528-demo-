import { useMemo, useState } from 'react';
import {
  Radar, Network, Truck, AlertTriangle, ShieldAlert, CheckCircle2,
  Factory, Warehouse, Store, Boxes,
} from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { Panel, HealthDot, HealthChip, StageTrack } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, cssVar, accent, healthColor, DRAW } from '../lib/chartTheme';
import {
  NETWORK_NODES, NETWORK_EDGES, SHIPMENTS, EXCEPTIONS, TOWER_KPIS,
} from '../lib/mockData';
import { NODE_KIND_LABEL, type NetworkNode, type NodeKind, type ExceptionItem } from '../types';

const KPI_ICONS = [<CheckCircle2 size={16} />, <Truck size={16} />, <Boxes size={16} />, <ShieldAlert size={16} />];
const KIND_ICON: Record<NodeKind, typeof Factory> = { supplier: Factory, hub: Warehouse, rdc: Warehouse, store: Store };
const EDGE_STATUS_VAR: Record<string, string> = { normal: '--gold', delayed: '--warning', congested: '--danger' };

export default function Tower() {
  const [selId, setSelId] = useState('hub1');
  const sel = NETWORK_NODES.find(n => n.id === selId) ?? NETWORK_NODES[0];
  const byKind = useMemo(() => {
    const g: Record<NodeKind, NetworkNode[]> = { supplier: [], hub: [], rdc: [], store: [] };
    NETWORK_NODES.forEach(n => g[n.kind].push(n));
    return g;
  }, []);

  return (
    <div className="page page-wide">
      <PageHeader
        title="供应链控制塔"
        subtitle="供应商 → 中心仓 → 区域仓 → 门店 端到端履约网络 · 在途货流实时 · 异常预警一屏掌控"
        actions={<span className="tag tag-mono"><Radar size={12} style={{ marginRight: 4 }} />实时网络</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {TOWER_KPIS.map((k, i) => <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'start' }}>
        {/* 左：网络流向地图（签名）+ 节点状态 */}
        <div className="col gap-4">
          <Panel title={<><Network size={13} />端到端履约网络 · 在途货流</>} right={<MapLegend />}>
            <NetworkMap selId={selId} onSelect={setSelId} />
          </Panel>

          {/* 节点状态（按层 · 点选联动） */}
          <Panel title={<><Warehouse size={13} />网络节点状态</>} right={<span className="t-small text-3">{NETWORK_NODES.length} 个节点</span>}>
            <div className="col gap-3">
              {(['supplier', 'hub', 'rdc', 'store'] as NodeKind[]).map(kind => (
                <div key={kind}>
                  <div className="label" style={{ marginBottom: 7 }}>{NODE_KIND_LABEL[kind]}（{byKind[kind].length}）</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 8 }}>
                    {byKind[kind].map(n => (
                      <button key={n.id} className={`node-card ${n.id === selId ? 'sel' : ''}`} onClick={() => setSelId(n.id)} style={{ textAlign: 'left' }}>
                        <div className="row gap-2" style={{ marginBottom: 4 }}>
                          <HealthDot health={n.health} />
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</span>
                        </div>
                        <div className="row spread">
                          <span className="t-small text-3" style={{ fontSize: 10.5 }}>履约 <span className="mononum" style={{ color: n.fillRate >= 95 ? 'var(--success)' : n.fillRate >= 88 ? 'var(--warning)' : 'var(--danger)' }}>{n.fillRate.toFixed(1)}%</span></span>
                          <span className="mononum text-3" style={{ fontSize: 10.5 }}>{(n.throughput / 1000).toFixed(1)}k/日</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* 右：异常流 + 在途履约 */}
        <div className="col gap-4" style={{ position: 'sticky', top: 0 }}>
          <Panel title={<><AlertTriangle size={13} />异常预警流</>} right={<span className="tag" style={{ color: 'var(--danger)' }}>{EXCEPTIONS.filter(e => e.kind === 'critical').length} 紧急</span>}>
            <div className="col gap-2">
              {EXCEPTIONS.map(e => <ExcRow key={e.id} e={e} />)}
            </div>
          </Panel>

          <Panel title={<><Truck size={13} />在途履约</>} right={<span className="t-small text-3">{SHIPMENTS.length} 笔</span>}>
            <div className="col gap-3">
              {SHIPMENTS.map(s => (
                <div key={s.id} className="metric-card" style={{ padding: '10px 12px' }}>
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.route}</span>
                    <span className="t-small mononum" style={{ fontSize: 10.5, color: s.status === 'delayed' ? 'var(--danger)' : s.status === 'arrived' ? 'var(--success)' : 'var(--text-2)', flexShrink: 0 }}>{s.eta}</span>
                  </div>
                  <StageTrack stage={s.stage} />
                  <div className="t-small text-3" style={{ fontSize: 10.5, marginTop: 6 }}>{s.units.toLocaleString()} 件</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── 网络流向地图（签名 · scatter 节点 + lines 流动货流，钢蓝暗底琥珀路由）──────────
function NetworkMap({ selId, onSelect }: { selId: string; onSelect: (id: string) => void }) {
  void selId; void onSelect; // 点选走下方节点卡（canvas 只读可视）
  return (
    <Chart
      height={384}
      deps={[selId]}
      build={() => {
        const acc = accent();
        const text3 = cssVar('--text-3');
        const nodeMap = Object.fromEntries(NETWORK_NODES.map(n => [n.id, n]));
        const kindSize: Record<NodeKind, number> = { supplier: 26, hub: 34, rdc: 24, store: 16 };
        const nodeData = NETWORK_NODES.map(n => ({
          value: [n.x, n.y],
          name: n.name,
          symbolSize: kindSize[n.kind],
          itemStyle: {
            color: healthColor(n.health),
            borderColor: n.id === selId ? acc : cssVar('--surface-1'),
            borderWidth: n.id === selId ? 3 : 2,
            shadowBlur: n.health === 'broken' ? 16 : 8,
            shadowColor: healthColor(n.health),
          },
          label: {
            show: true, position: 'bottom', distance: 6,
            formatter: n.name.replace(/^示例供应商 ([A-Z]).*/, '供应商$1').replace(/ · .*/, '').slice(0, 6),
            color: text3, fontSize: 9.5, fontFamily: "'Geist','PingFang SC',sans-serif",
          },
        }));
        const lineData = NETWORK_EDGES.map(e => {
          const s = nodeMap[e.source], t = nodeMap[e.target];
          const c = cssVar(EDGE_STATUS_VAR[e.status]);
          return {
            coords: [[s.x, s.y], [t.x, t.y]],
            lineStyle: { color: c, width: Math.max(1, Math.min(4, e.volume / 2400)), opacity: e.status === 'normal' ? 0.34 : 0.6, curveness: 0.18 },
          };
        });
        return {
          ...baseOption(),
          grid: { left: 12, right: 12, top: 16, bottom: 22 },
          xAxis: { type: 'value', min: 0, max: 100, show: false },
          yAxis: { type: 'value', min: 0, max: 100, show: false, inverse: true },
          tooltip: { ...(baseOption().tooltip as object), trigger: 'item', formatter: (p: { data?: { name?: string } }) => p?.data?.name ?? '' },
          series: [
            {
              type: 'lines', coordinateSystem: 'cartesian2d', polyline: false, data: lineData, zlevel: 1,
              effect: { show: true, period: 5, trailLength: 0.6, symbol: 'arrow', symbolSize: 5, color: acc },
              ...DRAW,
            },
            {
              type: 'scatter', coordinateSystem: 'cartesian2d', data: nodeData, zlevel: 2,
              emphasis: { scale: 1.2 }, ...DRAW,
            },
          ],
        };
      }}
    />
  );
}

function MapLegend() {
  const kinds: { k: NodeKind; label: string }[] = [
    { k: 'supplier', label: '供应商' }, { k: 'hub', label: '中心仓' }, { k: 'rdc', label: '区域仓' }, { k: 'store', label: '门店' },
  ];
  return (
    <div className="row gap-3 wrap">
      {kinds.map(({ k, label }) => {
        const Icon = KIND_ICON[k];
        return <span key={k} className="row gap-1 t-small text-3" style={{ fontSize: 10.5 }}><Icon size={11} />{label}</span>;
      })}
      <span className="row gap-1 t-small text-3" style={{ fontSize: 10.5 }}><span className="health-dot" style={{ background: 'var(--gold)' }} />在途货流</span>
    </div>
  );
}

const EXC_ICON = { critical: ShieldAlert, warn: AlertTriangle, action: Truck, info: CheckCircle2 };
function ExcRow({ e }: { e: ExceptionItem }) {
  const Icon = EXC_ICON[e.kind];
  const color = e.kind === 'critical' ? 'var(--danger)' : e.kind === 'warn' ? 'var(--warning)' : e.kind === 'action' ? 'var(--gold)' : 'var(--info)';
  return (
    <div className={`exc-row exc-${e.kind}`}>
      <Icon size={15} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="row spread gap-2">
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{e.title}</span>
          <span className="t-small text-3" style={{ fontSize: 10, flexShrink: 0 }}>{e.at}</span>
        </div>
        <div className="t-small text-3" style={{ fontSize: 11, marginTop: 3, lineHeight: 1.5 }}>{e.detail}</div>
        <div className="row gap-2" style={{ marginTop: 5 }}>
          <span className="tag" style={{ fontSize: 10 }}>{e.node}</span>
          <span className="t-small" style={{ fontSize: 10, color }}>{e.impact}</span>
        </div>
      </div>
    </div>
  );
}
