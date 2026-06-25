import { useState } from 'react';
import {
  FileText, MessagesSquare, Folder, BookText, FileSignature, ClipboardList, Ticket, ArrowRight, ShieldCheck,
} from 'lucide-react';
import type { Citation, ChatTurn, SourceType, ClearanceLevel } from '../types';
import { LEVEL_LABEL } from '../types';

export function SourceIcon({ source, size = 15 }: { source: SourceType; size?: number }) {
  const map: Partial<Record<SourceType, React.ReactNode>> = {
    Slack: <MessagesSquare size={size} />, '会议纪要': <ClipboardList size={size} />,
    'Google Drive': <Folder size={size} />, SharePoint: <Folder size={size} />, Box: <Folder size={size} />,
    '内部研报库': <BookText size={size} />, Jira: <Ticket size={size} />, Zendesk: <Ticket size={size} />,
    Salesforce: <FileSignature size={size} />,
  };
  return <>{map[source] ?? <FileText size={size} />}</>;
}

const levelTone = (l: ClearanceLevel) => (l >= 3 ? 'var(--warning)' : l === 2 ? 'var(--info)' : 'var(--success)');

/** 溯源卡片内容（缩略图标 + 文档名 + 路径 + 权限徽标 + 置信度 + 跳原文）。 */
export function CitationCard({ cite, onJump }: { cite: Citation; onJump?: (c: Citation) => void }) {
  return (
    <div className="cite-card">
      <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
        <div className="cite-thumb"><SourceIcon source={cite.source} size={18} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.35 }}>{cite.docName}</div>
          <div className="t-small text-3" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cite.path}</div>
        </div>
      </div>
      <div className="t-small text-2 serif" style={{ marginTop: 9, lineHeight: 1.6, color: 'var(--text-2)' }}>“{cite.snippet}”</div>
      <div className="row gap-2 wrap" style={{ marginTop: 10 }}>
        <span className="src-badge">{cite.source}</span>
        <span className="badge" style={{ background: `color-mix(in srgb, ${levelTone(cite.level)} 14%, transparent)`, color: levelTone(cite.level) }}>密级 {cite.level} · {LEVEL_LABEL[cite.level]}</span>
        <span className="statpill mononum" style={{ color: 'var(--text-3)', fontSize: 11 }}>置信 {(cite.confidence * 100).toFixed(0)}%</span>
      </div>
      <div className="row spread" style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--hairline)' }}>
        <span className="t-small text-3">{cite.author} · {cite.updatedAt}</span>
        <button className="btn btn-subtle btn-sm" onClick={() => onJump?.(cite)}>跳到原文第 {cite.paragraph} 段 <ArrowRight size={12} /></button>
      </div>
    </div>
  );
}

/** 答案句末引用角标 [n]，hover 浮溯源卡片；点击/悬停可联动（onActivate 传 n）。 */
export function CiteRef({ cite, onJump, onActivate }: { cite: Citation; onJump?: (c: Citation) => void; onActivate?: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => { setOpen(true); onActivate?.(cite.n); }}
      onMouseLeave={() => setOpen(false)}>
      <sup className="cite-ref" onClick={() => onActivate?.(cite.n)}>{cite.n}</sup>
      {open && (
        <span style={{ position: 'absolute', bottom: '120%', left: 0, zIndex: 50 }} onMouseEnter={() => setOpen(true)}>
          <CitationCard cite={cite} onJump={onJump} />
        </span>
      )}
    </span>
  );
}

/** 渲染 AI 答案：衬线正文 + 句末内联 [n] 角标。 */
export function AnswerBody({ turn, onJump, onActivate }: { turn: ChatTurn; onJump?: (c: Citation) => void; onActivate?: (n: number) => void }) {
  return (
    <div className="t-answer">
      {turn.segments.map((seg, i) => (
        <span key={i}>
          {seg.text}
          {seg.cites?.map(n => {
            const c = turn.citations.find(x => x.n === n);
            return c ? <CiteRef key={n} cite={c} onJump={onJump} onActivate={onActivate} /> : null;
          })}
        </span>
      ))}
    </div>
  );
}

/** 信任条：X 来源 · 100% 在你的权限内。 */
export function TrustBar({ count, inScope = 100 }: { count: number; inScope?: number }) {
  return (
    <div className="trust-bar">
      <ShieldCheck size={14} />
      <span>{count} 个来源 · {inScope}% 在你的权限内 · 可逐句溯源回原文</span>
    </div>
  );
}
