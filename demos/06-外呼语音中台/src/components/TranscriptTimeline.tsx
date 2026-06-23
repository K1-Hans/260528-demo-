import { useEffect, useRef } from 'react';
import { Bot, User, AlertTriangle, MicOff, Volume2 } from 'lucide-react';
import type { TranscriptTurn, Sentiment } from '../types';
import { SENTIMENT_LABEL } from '../types';

const EMO_COLOR: Record<Sentiment, string> = { pos: 'var(--success)', neu: 'var(--text-3)', neg: 'var(--warning)' };

interface Props {
  turns: TranscriptTurn[];
  streamingId?: string | null;     // 该句显示打字机光标（流式）
  onTurnClick?: (t: TranscriptTurn) => void;
  autoScroll?: boolean;            // 新句滚到底（监控墙流式）
  maxHeight?: number | string;
}

/** 双气泡转写时间轴：AI 翡翠 / 客户灰，意图+情绪 chip，敏感词琥珀高亮。M1 监控墙 / M6 回放复用。 */
export default function TranscriptTimeline({ turns, streamingId, onTurnClick, autoScroll, maxHeight = '100%' }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, autoScroll]);

  return (
    <div className="bubbles" style={{ overflowY: 'auto', maxHeight, paddingRight: 4 }}>
      {turns.map(t => {
        const ai = t.speaker === 'ai';
        return (
          <div
            key={t.id}
            className={`bubble-row ${ai ? 'ai' : 'cust'}`}
            style={{ cursor: onTurnClick ? 'pointer' : 'default' }}
            onClick={onTurnClick ? () => onTurnClick(t) : undefined}
          >
            <span
              className="avatar"
              style={{ width: 24, height: 24, fontSize: 11, flexShrink: 0, alignSelf: 'flex-end', background: ai ? 'linear-gradient(135deg, var(--bronze), var(--gold-bright))' : 'var(--surface-3)', color: ai ? 'var(--accent-ink)' : 'var(--text-2)' }}
            >
              {ai ? <Bot size={13} /> : <User size={13} />}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className={`bubble ${ai ? 'bubble-ai' : 'bubble-cust'} ${t.sensitive ? 'bubble-sensitive' : ''}`}>
                {t.silence
                  ? <span className="row gap-1 text-3" style={{ fontStyle: 'italic' }}><MicOff size={12} />（静默 {t.text}）</span>
                  : <span className={streamingId === t.id ? 'cursor-type' : ''}>{t.text}</span>}
                {t.bargeIn && <span className="row gap-1" style={{ fontSize: 10.5, color: 'var(--info)', marginTop: 3 }}><Volume2 size={11} />客户抢话 · TTS 已打断</span>}
              </div>
              <div className="bubble-meta" style={{ flexDirection: ai ? 'row' : 'row-reverse' }}>
                <span className="mono t-small text-3" style={{ fontSize: 10.5 }}>{t.at}</span>
                {t.intent && <span className="intent-chip">{t.intent}</span>}
                {t.emotion && (
                  <span className="emotion-chip" style={{ background: `color-mix(in srgb, ${EMO_COLOR[t.emotion]} 14%, transparent)`, color: EMO_COLOR[t.emotion] }}>
                    {SENTIMENT_LABEL[t.emotion]}
                  </span>
                )}
                {t.sensitive && <span className="row gap-1" style={{ fontSize: 10.5, color: 'var(--warning)', fontWeight: 600 }}><AlertTriangle size={11} />敏感词</span>}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
