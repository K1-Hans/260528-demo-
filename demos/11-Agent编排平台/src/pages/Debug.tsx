import { useState } from 'react';
import {
  Bug, Play, SkipForward, SkipBack, RotateCcw, CircleDot, Circle,
  Cpu, Coins, Clock, Braces, ArrowRight,
} from 'lucide-react';
import { PageHeader, ProgressBar } from '../components/ui';
import { Panel, NodeTypeIcon, NodeTypeBadge, RunStateChip, TelePill } from '../components/sig';
import { toast } from '../components/kit';
import { FLOW_NODES, RUN_RECORDS } from '../lib/mockData';
import type { RunState } from '../types';

const TRACE = RUN_RECORDS[0].steps;     // 反欺诈调查 run 的逐步 trace

export default function Debug() {
  const [step, setStep] = useState(4);                    // 默认停在 LLM 研判（执行中）
  const [bp, setBp] = useState<Set<string>>(new Set(['n5', 'n7']));

  const nodes = FLOW_NODES;
  const cur = nodes[step];
  const traceFor = (nodeId: string) => TRACE.find(t => t.nodeId === nodeId);

  const effState = (i: number): RunState => {
    if (i < step) return 'done';
    if (i > step) return 'idle';
    return cur.runState === 'wait' ? 'wait' : cur.runState === 'error' ? 'error' : 'running';
  };

  const toggleBp = (id: string) => setBp(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const runToBreakpoint = () => {
    for (let i = step + 1; i < nodes.length; i++) {
      if (bp.has(nodes[i].id)) { setStep(i); toast(`命中断点 · ${nodes[i].name}`, 'warn'); return; }
    }
    setStep(nodes.length - 1);
    toast('已运行到链路末端', 'info');
  };

  const t = traceFor(cur.id);
  const vars: { k: string; v: string; kind: 'id' | 'str' | 'num' }[] = [
    { k: 'node_id', v: cur.id, kind: 'id' },
    { k: 'type', v: cur.type, kind: 'id' },
    ...(cur.model ? [{ k: 'model', v: cur.model, kind: 'str' as const }] : []),
    ...(t?.input ? [{ k: 'input', v: t.input, kind: 'str' as const }] : []),
    ...(cur.io ? [{ k: 'io', v: cur.io, kind: 'str' as const }] : []),
    ...(t?.output ? [{ k: 'output', v: t.output, kind: 'str' as const }] : []),
    ...(cur.tokens ? [{ k: 'tokens', v: String(cur.tokens), kind: 'num' as const }] : []),
    ...(cur.latencyMs ? [{ k: 'latency_ms', v: String(cur.latencyMs), kind: 'num' as const }] : []),
  ];

  return (
    <div className="page page-wide">
      <PageHeader
        title="单步调试"
        subtitle="逐节点单步执行 · 变量检查 · 断点 — 信贷反欺诈调查链路"
        actions={<span className="tag tag-mono">wf-fraud-invest · v2.4</span>}
      />

      {/* 控制条 */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div className="row spread wrap" style={{ gap: 12 }}>
          <div className="row gap-2">
            <button className="btn btn-subtle btn-sm" onClick={() => setStep(0)}><RotateCcw size={13} />重置</button>
            <button className="btn btn-subtle btn-sm" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}><SkipBack size={13} />上一步</button>
            <button className="btn btn-subtle btn-sm" onClick={() => setStep(s => Math.min(nodes.length - 1, s + 1))} disabled={step === nodes.length - 1}><SkipForward size={13} />下一步</button>
            <button className="btn btn-primary btn-sm" onClick={runToBreakpoint}><Play size={13} />运行到断点</button>
          </div>
          <div className="row gap-3" style={{ minWidth: 220, flex: 1, maxWidth: 360 }}>
            <span className="label" style={{ whiteSpace: 'nowrap' }}>进度 {step + 1}/{nodes.length}</span>
            <div style={{ flex: 1 }}><ProgressBar pct={(step / (nodes.length - 1)) * 100} /></div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '340px minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        {/* 执行步骤 */}
        <Panel title="执行步骤" icon={<Bug size={13} />} right={<span className="tag">{bp.size} 断点</span>}>
          <div className="col gap-1">
            {nodes.map((n, i) => {
              const es = effState(i);
              const isCur = i === step;
              return (
                <div
                  key={n.id}
                  className="row gap-2"
                  style={{
                    padding: '9px 10px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                    background: isCur ? 'var(--gold-dim)' : 'transparent',
                    borderLeft: isCur ? '2px solid var(--gold)' : '2px solid transparent',
                  }}
                  onClick={() => setStep(i)}
                >
                  <button
                    className="row"
                    onClick={e => { e.stopPropagation(); toggleBp(n.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: bp.has(n.id) ? 'var(--danger)' : 'var(--text-3)', padding: 0 }}
                    title="切换断点"
                  >
                    {bp.has(n.id) ? <CircleDot size={13} /> : <Circle size={13} />}
                  </button>
                  <NodeTypeIcon type={n.type} size={14} />
                  <span className="flex-1 t-small" style={{ fontWeight: isCur ? 600 : 400, color: isCur ? 'var(--text-1)' : 'var(--text-2)', minWidth: 0 }}>{n.name}</span>
                  <RunStateChip state={es} showLabel={false} />
                </div>
              );
            })}
          </div>
        </Panel>

        {/* 变量检查器 */}
        <div className="col gap-3">
          <Panel
            title="变量检查器"
            icon={<Braces size={13} />}
            right={<RunStateChip state={effState(step)} />}
          >
            <div className="col gap-3">
              <div className="row spread">
                <div className="row gap-2">
                  <NodeTypeIcon type={cur.type} size={16} />
                  <span className="t-h3">{cur.name}</span>
                </div>
                <NodeTypeBadge type={cur.type} />
              </div>

              <div className="row gap-2 wrap">
                {cur.model && <TelePill icon={<Cpu size={10} />}>{cur.model}</TelePill>}
                {cur.tokens ? <TelePill icon={<Coins size={10} />}>{cur.tokens.toLocaleString()} tok</TelePill> : null}
                {cur.latencyMs ? <TelePill icon={<Clock size={10} />}>{cur.latencyMs} ms</TelePill> : null}
              </div>

              {/* 变量 JSON 视图 */}
              <div style={{ background: 'var(--bg-sunken)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
                <div className="mono t-small" style={{ lineHeight: 1.9 }}>
                  <span className="text-3">{'{'}</span>
                  {vars.map((v, i) => (
                    <div key={v.k} style={{ paddingLeft: 16 }}>
                      <span style={{ color: 'var(--info)' }}>"{v.k}"</span>
                      <span className="text-3">: </span>
                      <span style={{ color: v.kind === 'num' ? 'var(--gold)' : v.kind === 'id' ? 'var(--emerald)' : 'var(--text-1)' }}>
                        {v.kind === 'num' ? v.v : `"${v.v}"`}
                      </span>
                      {i < vars.length - 1 && <span className="text-3">,</span>}
                    </div>
                  ))}
                  <span className="text-3">{'}'}</span>
                </div>
              </div>

              {effState(step) === 'running' && (
                <div className="row gap-2" style={{ fontSize: 12, color: 'var(--gold)' }}>
                  <span className="spinner" />当前节点执行中 — 断点暂停，可单步推进
                </div>
              )}
              {effState(step) === 'wait' && (
                <div className="row gap-2" style={{ fontSize: 12, color: 'var(--warning)' }}>
                  <ArrowRight size={13} />命中人审卡点，等待人工放行后继续
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
