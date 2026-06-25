import { useState } from 'react';
import { Check, ShieldAlert, Circle, ChevronDown } from 'lucide-react';
import type { PipeStage } from '../types';
import { MeterBar } from './kit';
import './pipeline.css';

const TONE: Record<PipeStage['status'], string> = {
  pass: 'var(--gold)', block: 'var(--warning)', pending: 'var(--text-3)', active: 'var(--gold-bright)',
};

function StageIcon({ s }: { s: PipeStage['status'] }) {
  if (s === 'pass') return <Check size={13} />;
  if (s === 'block') return <ShieldAlert size={13} />;
  if (s === 'active') return <span className="dot-pulse" style={{ width: 8, height: 8 }} />;
  return <Circle size={12} />;
}

/** A1→A4 多-agent pipeline 逐级点亮（实时对话台右栏核心差异点）。 */
export function PipelineStages({ stages, defaultOpen }: { stages: PipeStage[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState<Set<string>>(new Set(defaultOpen ? stages.map(s => s.key) : []));
  const toggle = (k: string) => setOpen(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="pipe">
      {stages.map((st, i) => {
        const tone = TONE[st.status];
        const isOpen = open.has(st.key);
        const hasDetail = !!(st.detail || st.tags?.length || st.hits?.length || st.confidence !== undefined);
        return (
          <div key={st.key} className={`pipe-stage ${st.status === 'active' ? 'pipe-active' : ''}`}>
            {i < stages.length - 1 && <span className="pipe-line" style={{ background: st.status === 'pending' ? 'var(--hairline)' : 'color-mix(in srgb, var(--gold) 40%, transparent)' }} />}
            <button className="pipe-head" onClick={() => hasDetail && toggle(st.key)} style={{ cursor: hasDetail ? 'pointer' : 'default' }}>
              <span className="pipe-node" style={{ background: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone, borderColor: `color-mix(in srgb, ${tone} 40%, transparent)` }}>
                <StageIcon s={st.status} />
              </span>
              <span className="flex-1" style={{ textAlign: 'left' }}>
                <span className="row gap-2">
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{st.name}</span>
                  {st.status === 'block' && <span className="badge" style={{ background: 'color-mix(in srgb, var(--warning) 16%, transparent)', color: 'var(--warning)' }}>拦截</span>}
                </span>
                {st.tags && st.tags.length > 0 && <span className="row gap-1 wrap" style={{ marginTop: 4 }}>{st.tags.map(t => <span key={t} className="tag">{t}</span>)}</span>}
              </span>
              <span className="row gap-2" style={{ flexShrink: 0 }}>
                {st.ms > 0 && <span className="mono t-small text-3 tnum">{st.ms}ms</span>}
                {hasDetail && <ChevronDown size={13} style={{ color: 'var(--text-3)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
              </span>
            </button>
            {isOpen && hasDetail && (
              <div className="pipe-detail">
                {st.detail && <div className="t-small text-2" style={{ marginBottom: st.hits?.length ? 10 : 0 }}>{st.detail}</div>}
                {st.confidence !== undefined && (
                  <div style={{ marginBottom: st.hits?.length ? 10 : 0 }}>
                    <div className="row spread" style={{ marginBottom: 5 }}><span className="t-small text-3">置信度</span><span className="t-small tnum" style={{ color: 'var(--gold)' }}>{(st.confidence * 100).toFixed(0)}%</span></div>
                    <MeterBar pct={st.confidence * 100} />
                  </div>
                )}
                {st.hits && st.hits.length > 0 && (
                  <div className="col gap-2">
                    <span className="label">Top-{st.hits.length} 召回</span>
                    {st.hits.map((h, j) => (
                      <div key={j} className="row spread" style={{ fontSize: 12.5, padding: '6px 9px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--hairline)' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{h.q}</span>
                        <span className="mono tnum" style={{ flexShrink: 0, marginLeft: 8, color: h.score >= 0.88 ? 'var(--gold)' : 'var(--text-3)' }}>{h.score.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
