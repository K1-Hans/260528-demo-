import { ShieldAlert, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ChatMsg } from '../types';
import './pipeline.css';

/** 对话气泡时间轴。客户(user)右 · 小云(bot)左；A4 拦截气泡转琥珀 + 拦截原因。
 *  质检 / 外呼 demo 可复用。 */
export function ConversationTimeline({ messages, compact }: { messages: ChatMsg[]; compact?: boolean }) {
  return (
    <div className="conv" style={{ gap: compact ? 10 : 14 }}>
      {messages.map(m => m.role === 'user' ? (
        <div key={m.id} className="conv-row conv-row-user">
          <div className="conv-bubble conv-user">{m.text}</div>
          <div className="conv-av conv-av-user">客</div>
        </div>
      ) : (
        <div key={m.id} className="conv-row">
          <div className="conv-av conv-av-bot">云</div>
          <div style={{ minWidth: 0 }}>
            <div className={`conv-bubble conv-bot ${m.blocked ? 'conv-blocked' : ''}`}>
              {m.blocked && (
                <div className="row gap-1" style={{ color: 'var(--warning)', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  <ShieldAlert size={13} /> A4 合规拦截 · {m.blockReason}
                </div>
              )}
              {m.text}
            </div>
            <div className="conv-meta">
              <span>{m.time}</span>
              {m.source && <span className="tag" style={{ padding: '1px 7px' }}>{m.source}</span>}
              {m.tokens !== undefined && <span className="mono tnum text-3">{m.tokens} tok</span>}
              {m.thumb === 'down' && <ThumbsDown size={12} style={{ color: 'var(--danger)' }} />}
              {m.thumb === 'up' && <ThumbsUp size={12} style={{ color: 'var(--success)' }} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
