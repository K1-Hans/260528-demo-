import { useState, useRef, useLayoutEffect } from 'react';
import {
  Workflow as WfIcon, Play, Activity, Clock, CheckCircle2, GitBranch,
  Cpu, Coins, UserCheck, ArrowRight, Boxes, Circle,
} from 'lucide-react';
import { PageHeader, StatCard, Segmented, EmptyState } from '../components/ui';
import { Panel, RunStateChip, NodeTypeIcon, NodeTypeBadge, TelePill, RiskDot } from '../components/sig';
import {
  FLOW_NODES, FLOW_EDGES, WORKFLOW_LIST, FLOW_KPIS, GATE_ITEMS,
} from '../lib/mockData';
import { RUN_STATE_LABEL } from '../types';

const KPI_ICONS = [<WfIcon size={16} />, <Activity size={16} />, <Clock size={16} />, <CheckCircle2 size={16} />];

/** 测量画布像素尺寸，令 SVG 连线坐标精确不拉伸。 */
function useBoxSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const GATE_META = {
  pending: { cls: '', label: '待人审', color: 'var(--warning)' },
  approved: { cls: 'gate-pass', label: '已放行', color: 'var(--success)' },
  blocked: { cls: 'gate-block', label: '已拦截', color: 'var(--danger)' },
  auto: { cls: 'gate-pass', label: '自动结论', color: 'var(--success)' },
} as const;

export default function Canvas() {
  const [selId, setSelId] = useState('n5');               // 默认选中正在执行的 LLM 研判节点
  const [filter, setFilter] = useState<'all' | 'running'>('all');
  const [boxRef, size] = useBoxSize();

  const sel = FLOW_NODES.find(n => n.id === selId) ?? null;
  const center = (id: string) => {
    const n = FLOW_NODES.find(x => x.id === id);
    return n ? { x: (n.x / 100) * size.w, y: (n.y / 100) * size.h } : { x: 0, y: 0 };
  };
  const edgePath = (s: string, t: string) => {
    const a = center(s), b = center(t);
    const dx = Math.max(36, Math.abs(b.x - a.x) * 0.5);
    return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
  };
  const edgeCls = (st: string) => st === 'active' ? 'flow-edge flow-edge-active' : st === 'done' ? 'flow-edge flow-edge-done' : 'flow-edge';

  const runningNode = FLOW_NODES.find(n => n.runState === 'running');
  const visibleNodes = filter === 'running'
    ? FLOW_NODES.filter(n => n.runState === 'running' || n.runState === 'wait')
    : FLOW_NODES;
  const pendingGates = GATE_ITEMS.filter(g => g.status === 'pending').length;

  return (
    <div className="page page-wide">
      <PageHeader
        title="编排画布"
        subtitle="信贷反欺诈调查 Agent 工作流 · v2.4 · 实时执行态"
        actions={
          <>
            <span className="tag tag-mono">wf-fraud-invest</span>
            <span className="row gap-2" style={{ padding: '6px 11px', borderRadius: 'var(--r-sm)', background: 'var(--gold-dim)', color: 'var(--gold)', fontSize: 12, fontWeight: 600 }}>
              <span className="live-pulse" />执行中 · {runningNode?.name}
            </span>
            <button className="btn btn-primary"><Play size={14} />运行</button>
          </>
        }
      />

      {/* KPI 带 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {FLOW_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      {/* 主体：画布 + 右侧检查器 */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 322px', gap: 14, alignItems: 'start' }}>
        <div className="col gap-3">
          <Panel
            title="编排画布 · 反欺诈调查链路"
            icon={<WfIcon size={13} />}
            bodyClass="panel-body-0"
            right={
              <Segmented
                options={[{ value: 'all', label: '全链路' }, { value: 'running', label: '执行焦点' }]}
                value={filter}
                onChange={setFilter}
              />
            }
          >
            <div className="dag-canvas reveal" ref={boxRef} style={{ height: 472 }}>
              {/* SVG 连线层 */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                {size.w > 0 && FLOW_EDGES.map(e => (
                  <path key={`${e.source}-${e.target}`} className={edgeCls(e.state)} d={edgePath(e.source, e.target)} />
                ))}
              </svg>
              {/* 节点层 */}
              {visibleNodes.map(n => (
                <div
                  key={n.id}
                  className={`flow-node run-${n.runState} ${selId === n.id ? 'sel' : ''}`}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  onClick={() => setSelId(n.id)}
                >
                  <div className="flow-node-head">
                    <NodeTypeIcon type={n.type} size={13} />
                    <span className="flow-node-name">{n.name}</span>
                  </div>
                  <div className="row spread" style={{ gap: 8 }}>
                    <NodeTypeBadge type={n.type} />
                    <RunStateChip state={n.runState} showLabel={false} />
                  </div>
                </div>
              ))}
              {/* 图例 */}
              <div className="row gap-3 wrap" style={{ position: 'absolute', left: 14, bottom: 12, zIndex: 3, padding: '7px 12px', background: 'var(--glass-bg)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)' }}>
                {(['running', 'done', 'wait', 'error', 'idle'] as const).map(s => (
                  <span key={s} className="row gap-1" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    <span className={`run-chip run-${s}`} style={{ padding: 3, borderRadius: 5 }}><Circle size={7} /></span>
                    {RUN_STATE_LABEL[s]}
                  </span>
                ))}
              </div>
            </div>
          </Panel>

          {/* 人审卡点队列 */}
          <Panel
            title="人审卡点队列 · Human-in-loop"
            icon={<UserCheck size={13} />}
            right={<span className="tag" style={{ color: 'var(--warning)' }}>{pendingGates} 待处理</span>}
          >
            <div className="col gap-2">
              {GATE_ITEMS.map(g => {
                const m = GATE_META[g.status];
                return (
                  <div key={g.id} className={`gate-row ${m.cls}`}>
                    <div className="flex-1 col gap-1" style={{ minWidth: 0 }}>
                      <div className="row spread gap-2">
                        <span className="t-small" style={{ fontWeight: 600, color: 'var(--text-1)' }}>{g.title}</span>
                        <RiskDot risk={g.risk} />
                      </div>
                      <span className="t-small text-3" style={{ lineHeight: 1.5 }}>{g.detail}</span>
                      <div className="row gap-2" style={{ marginTop: 2 }}>
                        <span className="tele-pill"><Boxes size={10} />{g.workflow}</span>
                        <span className="tele-pill"><Cpu size={10} />{g.agent}</span>
                        <span className="text-3" style={{ fontSize: 11 }}>{g.at}</span>
                      </div>
                    </div>
                    <div className="col gap-1" style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{m.label}</span>
                      {g.status === 'pending' && (
                        <div className="row gap-1">
                          <button className="btn btn-ok btn-sm">放行</button>
                          <button className="btn btn-danger btn-sm">驳回</button>
                        </div>
                      )}
                      {g.reviewer && <span className="text-3" style={{ fontSize: 11 }}>审 · {g.reviewer}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* 右侧：节点检查器 + 工作流列表 */}
        <div className="col gap-3">
          <Panel title="节点详情" icon={<Cpu size={13} />}>
            {sel ? (
              <div className="col gap-3">
                <div className="col gap-2">
                  <div className="row spread">
                    <span className="t-h3">{sel.name}</span>
                    <RunStateChip state={sel.runState} />
                  </div>
                  <NodeTypeBadge type={sel.type} />
                </div>
                <div className="divider" style={{ margin: '2px 0' }} />
                <div className="row gap-2 wrap">
                  {sel.model && <span className="tele-pill"><Cpu size={10} />{sel.model}</span>}
                  {sel.tokens !== undefined && sel.tokens > 0 && <span className="tele-pill"><Coins size={10} />{sel.tokens.toLocaleString()} tok</span>}
                  {sel.latencyMs !== undefined && <span className="tele-pill"><Clock size={10} />{sel.latencyMs} ms</span>}
                </div>
                {sel.io && (
                  <div className="col gap-1">
                    <span className="label">输入 / 输出</span>
                    <div className="mono t-small" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                      {sel.io}
                    </div>
                  </div>
                )}
                {sel.runState === 'running' && (
                  <div className="row gap-2" style={{ fontSize: 12, color: 'var(--gold)' }}>
                    <span className="spinner" />正在生成研判结论…
                  </div>
                )}
              </div>
            ) : (
              <EmptyState icon={<Cpu size={30} />} title="未选中节点" desc="点击画布上的节点查看执行详情" />
            )}
          </Panel>

          <Panel title="工作流" icon={<GitBranch size={13} />} right={<span className="tag">{WORKFLOW_LIST.length} 个</span>}>
            <div className="col gap-2">
              {WORKFLOW_LIST.map(wf => (
                <div key={wf.id} className="card card-hover" style={{ padding: 12 }}>
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <span className="t-small" style={{ fontWeight: 600, color: 'var(--text-1)' }}>{wf.name}</span>
                    <span className={`run-chip ${wf.status === 'running' ? 'run-running' : wf.status === 'live' ? 'run-done' : 'run-idle'}`}>
                      {wf.status === 'running' ? '运行中' : wf.status === 'live' ? '已上线' : '草稿'}
                    </span>
                  </div>
                  <div className="row gap-3" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    <span className="row gap-1"><Boxes size={11} />{wf.nodes} 节点</span>
                    <span className="row gap-1 tnum"><ArrowRight size={11} />7 日 {wf.runs7d.toLocaleString()} 次</span>
                    <span className="tag" style={{ padding: '0 6px' }}>{wf.vertical}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
