import { useEffect } from 'react';
import { X } from 'lucide-react';

// ─── 状态徽章（通用：传 status 文案 + tone 语义色）──────────────────────────
export function StatusBadge({ status, tone = 'muted' }: { status: string; tone?: 'good' | 'warn' | 'bad' | 'info' | 'muted' }) {
  const c = { good: 'var(--success)', warn: 'var(--warning)', bad: 'var(--danger)', info: 'var(--gold)', muted: 'var(--text-3)' }[tone];
  return <span className="badge" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, display: 'inline-block' }} />{status}
  </span>;
}

// ─── 风险等级徽章（质检：高危 / 中风险 / 低风险）─────────────────────────────
export function RiskBadge({ level }: { level: 'high' | 'mid' | 'low' }) {
  const map = { high: ['var(--danger)', '高危'], mid: ['var(--warning)', '中风险'], low: ['var(--success)', '低风险'] } as const;
  const [c, t] = map[level];
  return <span className="badge" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}>{t}</span>;
}

// ─── 工具条 / 筛选条 ─────────────────────────────────────────────────────────
export function Toolbar({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="row gap-2 wrap" style={{ marginBottom: 14, ...style }}>{children}</div>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="col gap-2" style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.02em' }}>{label}</label>
      {children}
      {hint && <span className="t-small text-3">{hint}</span>}
    </div>
  );
}

// ─── 抽屉（右侧滑入）─────────────────────────────────────────────────────────
export function Drawer({ open, onClose, title, sub, width = 460, children, footer }: {
  open: boolean; onClose: () => void; title: string; sub?: string; width?: number;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ovl" onClick={onClose}>
      <div className="drawer" style={{ width }} onClick={e => e.stopPropagation()}>
        <div className="row spread" style={{ padding: '18px 20px', borderBottom: '1px solid var(--hairline)' }}>
          <div><div className="t-h3">{title}</div>{sub && <div className="t-small text-3" style={{ marginTop: 2 }}>{sub}</div>}</div>
          <button className="icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
        {footer && <div className="row gap-2" style={{ padding: '14px 20px', borderTop: '1px solid var(--hairline)', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── 弹窗（居中）─────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, sub, width = 520, children, footer }: {
  open: boolean; onClose: () => void; title: string; sub?: string; width?: number;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ovl ovl-center" onClick={onClose}>
      <div className="modal" style={{ width }} onClick={e => e.stopPropagation()}>
        <div className="row spread" style={{ padding: '18px 22px', borderBottom: '1px solid var(--hairline)' }}>
          <div><div className="t-h3">{title}</div>{sub && <div className="t-small text-3" style={{ marginTop: 2 }}>{sub}</div>}</div>
          <button className="icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div style={{ maxHeight: '64vh', overflowY: 'auto', padding: 22 }}>{children}</div>
        {footer && <div className="row gap-2" style={{ padding: '14px 22px', borderTop: '1px solid var(--hairline)', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── 置信度 / 占比条（真比例，非装饰）────────────────────────────────────────
export function MeterBar({ pct, color = 'var(--gold)', label }: { pct: number; color?: string; label?: string }) {
  return (
    <div className="row gap-2">
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 3, transition: 'width 0.7s var(--ease)' }} />
      </div>
      {label && <span className="t-small text-3 tnum" style={{ minWidth: 42, textAlign: 'right' }}>{label}</span>}
    </div>
  );
}

// ─── 轻量 toast（模块级，自挂载；agent 页直接 import { toast }）──────────────
let host: HTMLDivElement | null = null;
export function toast(msg: string, type: 'success' | 'warn' | 'danger' | 'info' = 'info') {
  if (typeof document === 'undefined') return;
  if (!host) {
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:flex-end;';
    document.body.appendChild(host);
  }
  const tone = { success: 'var(--success)', warn: 'var(--warning)', danger: 'var(--danger)', info: 'var(--gold)' }[type];
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `background:var(--surface-1);color:var(--text-1);border:1px solid var(--hairline-strong);border-left:3px solid ${tone};border-radius:10px;padding:11px 16px;font-size:13px;font-weight:500;box-shadow:var(--elev-2);max-width:340px;opacity:0;transform:translateY(8px);transition:all .25s cubic-bezier(.22,1,.36,1);`;
  host.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; setTimeout(() => el.remove(), 260); }, 2400);
}
