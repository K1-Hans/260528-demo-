import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCountUp, useInView, fmt } from '../lib/hooks';

// ─── Card ───────────────────────────────────────────────────────────────────
export function Card({ children, hover, className = '', style, onClick }: {
  children: React.ReactNode; hover?: boolean; className?: string;
  style?: React.CSSProperties; onClick?: () => void;
}) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

// ─── TrendChip ───────────────────────────────────────────────────────────────
// invert：默认涨=好(绿)；延迟/成本/错误率等「涨=坏」的指标传 invert,涨则显红。
export function TrendChip({ change, suffix = '环比', invert }: { change: number; suffix?: string; invert?: boolean }) {
  const up = change >= 0;
  const good = change === 0 ? null : invert ? !up : up;
  const Icon = change === 0 ? Minus : up ? TrendingUp : TrendingDown;
  const cls = good === null ? 'trend-flat' : good ? 'trend-up' : 'trend-down';
  return (
    <span className={`row gap-1 tnum ${cls}`} style={{ fontSize: 12, fontWeight: 600 }}>
      <Icon size={12} />
      {up ? '+' : ''}{change}%
      {suffix && <span className="text-3" style={{ fontWeight: 400, marginLeft: 2 }}>{suffix}</span>}
    </span>
  );
}

// ─── Sparkline (inline SVG) ──────────────────────────────────────────────────
export function Sparkline({ data, color = 'var(--gold)', width = 88, height = 30 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - 3 - ((v - min) / span) * (height - 6),
  ]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  const id = `sg-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
// accentVar：图标/sparkline 主色（默认信号 emerald；成本卡传 'var(--cost)'）。
// invertTrend：默认「涨=好(绿)/跌=坏(红)」；延迟/成本/错误等「涨=坏」的指标传 true。
export function StatCard({ label, raw, unit, change, spark, decimals, icon, accentVar = 'var(--gold)', invertTrend, delayClass = '' }: {
  label: string; raw: number; unit?: string; change?: number; spark?: number[];
  decimals?: number; icon?: React.ReactNode; accentVar?: string; invertTrend?: boolean; delayClass?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const dp = decimals ?? (unit === '%' || unit === '万' ? 1 : 0);
  const n = useCountUp(raw, 900, inView);
  const sparkColor = spark
    ? (change !== undefined && ((invertTrend && change > 0) || (!invertTrend && change < 0)) ? 'var(--danger)' : accentVar)
    : accentVar;
  return (
    <div ref={ref} className={`card card-hover reveal ${delayClass}`}>
      <div className="spread" style={{ marginBottom: 10 }}>
        <span className="label">{label}</span>
        {icon && <span style={{ color: accentVar, opacity: 0.8 }}>{icon}</span>}
      </div>
      <div className="row spread" style={{ alignItems: 'flex-end' }}>
        <div>
          <div className="kpi-value">{fmt(n, dp)}<span className="kpi-unit">{unit}</span></div>
          {change !== undefined && <div style={{ marginTop: 8 }}><TrendChip change={change} invert={invertTrend} /></div>}
        </div>
        {spark && <Sparkline data={spark} color={sparkColor} />}
      </div>
    </div>
  );
}

// ─── Badge / Tag ─────────────────────────────────────────────────────────────
export function Badge({ children, color = 'var(--gold)' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      {children}
    </span>
  );
}

// ─── SegmentedControl ────────────────────────────────────────────────────────
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="row gap-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)', padding: 3 }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="btn btn-sm"
          style={{
            background: value === o.value ? 'var(--surface-1)' : 'transparent',
            color: value === o.value ? 'var(--text-1)' : 'var(--text-3)',
            border: value === o.value ? '1px solid var(--hairline)' : '1px solid transparent',
            boxShadow: value === o.value ? 'var(--elev-1)' : 'none',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({ pct, color = 'var(--gold)', height = 6 }: { pct: number; color?: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: height / 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: height / 2, transition: 'width 0.8s var(--ease)' }} />
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', justifyContent: 'center', padding: '64px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
      <div style={{ opacity: 0.35, marginBottom: 12 }}>{icon}</div>
      <div className="t-h3" style={{ color: 'var(--text-2)', marginBottom: 4 }}>{title}</div>
      {desc && <div className="t-small">{desc}</div>}
    </div>
  );
}

// ─── SectionTitle ────────────────────────────────────────────────────────────
export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="spread" style={{ marginBottom: 14 }}>
      <span className="label">{children}</span>
      {right}
    </div>
  );
}
