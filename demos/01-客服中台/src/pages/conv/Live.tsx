import { useState } from 'react';
import { Radio, Send, UserCheck, ShieldAlert, GitBranch, Workflow } from 'lucide-react';
import { PageHeader, Segmented } from '../../components/ui';
import { toast } from '../../components/kit';
import { ConversationTimeline } from '../../components/ConversationTimeline';
import { PipelineStages } from '../../components/PipelineStages';
import { useAuth } from '../../contexts/AuthContext';
import { CONVERSATIONS } from '../../lib/mock/conv';
import type { Conversation } from '../../types';

const EMO: Record<string, [string, string]> = { calm: ['var(--success)', '平稳'], upset: ['var(--warning)', '不满'], angry: ['var(--danger)', '愤怒'] };
const ROUTE_LABEL: Record<string, string> = { qa: '问答', soothe: '安抚', hybrid: '融合', transfer: '转人工' };

const A4_RULES = [
  ['R1', '回复来源校验'], ['R2', '幻觉 · 瞎编检测'], ['R3', '费率数字检测'], ['R4', '越权承诺检测'],
  ['R5', '敏感信息泄露'], ['R6', '不当建议检测'], ['R7', '安抚话术合规'],
];

export default function Live() {
  const { hasPermission } = useAuth();
  const [sel, setSel] = useState<Conversation>(CONVERSATIONS[0]);
  const [autoOpen, setAutoOpen] = useState(true);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const canTakeover = hasPermission('conv:takeover');
  const [ec, el] = EMO[sel.emotion];
  const isTaken = taken.has(sel.id);

  return (
    <div className="page" style={{ paddingBottom: 16 }}>
      <PageHeader
        title="实时对话台"
        subtitle="多-agent pipeline 实时可视化 · 测试模式不写入生产埋点"
        actions={<div className="row gap-2"><span className="badge" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}><span className="dot-pulse" style={{ marginRight: 4 }} />{CONVERSATIONS.filter(c => c.status === '进行中').length} 会话进行中</span></div>}
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: '276px 1fr 360px', height: 'calc(100vh - 172px)' }}>
        {/* 左：会话流 */}
        <div className="card card-pad-0" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="label" style={{ padding: '14px 16px 10px' }}>会话流 · {CONVERSATIONS.length}</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
            {CONVERSATIONS.map(c => {
              const [cec] = EMO[c.emotion];
              const active = c.id === sel.id;
              return (
                <button key={c.id} onClick={() => setSel(c)} className="col gap-1" style={{ width: '100%', textAlign: 'left', padding: '10px 11px', marginBottom: 4, borderRadius: 10, border: `1px solid ${active ? 'var(--hairline-strong)' : 'transparent'}`, background: active ? 'var(--gold-glow)' : 'transparent', cursor: 'pointer', transition: 'all .12s' }}>
                  <div className="row spread">
                    <span className="row gap-2"><Radio size={13} style={{ color: c.status === '已转人工' ? 'var(--warning)' : 'var(--gold)' }} /><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{c.customer}</span></span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cec }} />
                  </div>
                  <div className="t-small text-3" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{c.lastMsg}</div>
                  <div className="row gap-1"><span className="tag">{c.intentL1}</span><span className="tag">{ROUTE_LABEL[c.route]}</span></div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 中：对话气泡 */}
        <div className="card card-pad-0" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="row spread" style={{ padding: '13px 18px', borderBottom: '1px solid var(--hairline)' }}>
            <div>
              <div className="row gap-2"><span className="t-h3">{sel.customer}</span><span className="tag">{sel.channel}</span></div>
              <div className="row gap-2" style={{ marginTop: 4 }}>
                <span className="tag">{sel.intentL1}</span>
                <span className="badge" style={{ background: `color-mix(in srgb, ${ec} 14%, transparent)`, color: ec }}>{el}</span>
                <span className="t-small text-3">会话 {sel.sessionId} · {sel.startedAt}</span>
              </div>
            </div>
            {(sel.status === '已转人工' || isTaken) ? (
              <span className="badge" style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--warning)' }}><UserCheck size={12} style={{ marginRight: 3 }} />已转人工</span>
            ) : canTakeover ? (
              <button className="btn btn-subtle btn-sm" onClick={() => { setTaken(s => new Set(s).add(sel.id)); toast('已接管会话，转坐席人工处理', 'success'); }}><UserCheck size={13} />接管</button>
            ) : null}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
            <ConversationTimeline messages={sel.messages} />
          </div>
          <div className="row gap-2" style={{ padding: '12px 16px', borderTop: '1px solid var(--hairline)' }}>
            <input className="input" placeholder="测试模式输入（演示）…" disabled />
            <button className="btn btn-primary" disabled><Send size={14} />发送</button>
          </div>
        </div>

        {/* 右：Pipeline + 合规规则 */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: 14 }}>
          <div className="card">
            <div className="row spread" style={{ marginBottom: 12 }}>
              <span className="row gap-2 label" style={{ color: 'var(--text-2)' }}><Workflow size={14} style={{ color: 'var(--gold)' }} />Agent Pipeline</span>
              <Segmented options={[{ value: 'on', label: '展开' }, { value: 'off', label: '收起' }]} value={autoOpen ? 'on' : 'off'} onChange={(v: string) => setAutoOpen(v === 'on')} />
            </div>
            <PipelineStages key={sel.id + (autoOpen ? '1' : '0')} stages={sel.pipeline} defaultOpen={autoOpen} />
          </div>

          <div className="card">
            <div className="row gap-2 label" style={{ color: 'var(--text-2)', marginBottom: 10 }}><ShieldAlert size={14} style={{ color: 'var(--gold)' }} />A4 合规质检规则</div>
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {A4_RULES.map(([r, t]) => (
                <div key={r} className="row gap-2" style={{ fontSize: 12, padding: '6px 8px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
                  <span className="mono" style={{ color: 'var(--gold)', fontWeight: 700 }}>{r}</span><span className="text-2">{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: 'var(--surface-2)' }}>
            <div className="row gap-2 label" style={{ color: 'var(--text-2)', marginBottom: 8 }}><GitBranch size={14} style={{ color: 'var(--gold)' }} />路由规则</div>
            <div className="col gap-2 t-small text-3" style={{ lineHeight: 1.6 }}>
              <div>· A1 敏感词命中 → <span className="gold">安抚 Agent + 强制转人工</span></div>
              <div>· angry + QA 置信度 &lt; 60% → 纯安抚</div>
              <div>· angry + 置信度 ≥ 60% → <span className="gold">hybrid 融合</span>（情绪 + 业务）</div>
              <div>· calm → 问答 Agent → A3 高置信 ≥ 0.88 直通</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
