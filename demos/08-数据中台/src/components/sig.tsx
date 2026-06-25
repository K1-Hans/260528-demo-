import { CheckCircle2, AlertCircle, HelpCircle, XCircle } from 'lucide-react';
import type { Confidence } from '../types';
import { CONFIDENCE_LABEL } from '../types';

// ════ 演算台签名组件（可信度标签 · SQL 透明块 · 窗格）════

const CONF_ICON: Record<Confidence, typeof CheckCircle2> = {
  covered: CheckCircle2, partial: AlertCircle, out: HelpCircle, refused: XCircle,
};

/** 可信度 4 阶标签（灵魂 · 已覆盖/部分/超范围/拒答）。 */
export function ConfidenceChip({ level, showLabel = true }: { level: Confidence; showLabel?: boolean }) {
  const Icon = CONF_ICON[level];
  return (
    <span className={`conf-chip ${level}`}>
      <Icon size={12} />{showLabel && CONFIDENCE_LABEL[level]}
    </span>
  );
}

/** 作战窗格：带标题栏的多窗格单元。 */
export function Panel({ title, icon, right, children, className = '', style, bodyClass = 'panel-body' }: {
  title?: React.ReactNode; icon?: React.ReactNode; right?: React.ReactNode;
  children: React.ReactNode; className?: string; style?: React.CSSProperties; bodyClass?: string;
}) {
  return (
    <div className={`panel ${className}`} style={style}>
      {title && (
        <div className="panel-head">
          <span className="panel-title">{icon}{title}</span>
          {right}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

// SQL 关键词 / 函数（高亮用）
const SQL_KW = /\b(SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|LEFT\s+JOIN|JOIN|ON|AND|OR|AS|DESC|ASC|DISTINCT|IS|NULL|NOT|IN|OVER|HAVING|LIMIT|CASE|WHEN|THEN|ELSE|END)\b/gi;
const SQL_FN = /\b(SUM|COUNT|ROUND|LAG|LEAD|AVG|MIN|MAX|COALESCE|CAST|DATE_TRUNC)\b/gi;

/** SQL 透明块（mono · 关键词/函数/注释高亮，可编辑感）。 */
export function SqlBlock({ sql }: { sql: string }) {
  const lines = sql.split('\n');
  return (
    <pre className="sql-block">
      {lines.map((line, i) => (
        <span key={i}>{highlightLine(line)}{i < lines.length - 1 ? '\n' : ''}</span>
      ))}
    </pre>
  );
}

function highlightLine(line: string): React.ReactNode {
  const ci = line.indexOf('--');
  if (ci >= 0) {
    return <>{hlCode(line.slice(0, ci))}<span className="sql-com">{line.slice(ci)}</span></>;
  }
  return hlCode(line);
}

function hlCode(code: string): React.ReactNode {
  // 先按关键词切分，再对剩余片段标函数
  const out: React.ReactNode[] = [];
  let last = 0; let key = 0; let m: RegExpExecArray | null;
  const re = new RegExp(SQL_KW.source, 'gi');
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out.push(<FnSpan key={key++} text={code.slice(last, m.index)} />);
    out.push(<span key={key++} className="sql-kw">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push(<FnSpan key={key++} text={code.slice(last)} />);
  return <>{out}</>;
}

function FnSpan({ text }: { text: string }): React.ReactNode {
  const out: React.ReactNode[] = [];
  let last = 0; let key = 0; let m: RegExpExecArray | null;
  const re = new RegExp(SQL_FN.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    out.push(<span key={key++} className="sql-fn">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>);
  return <>{out}</>;
}
