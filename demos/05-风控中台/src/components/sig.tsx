import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, TrendingUp } from 'lucide-react';
import type { Decision, ThreatStat } from '../types';
import { DECISION_SHORT } from '../types';

// ════ 风控签名组件（作战室 · 三态盘口 · 实时跳数 · 威胁态势）════

const DEC_VAR: Record<Decision, string> = { pass: 'var(--success)', review: 'var(--warning)', block: 'var(--danger)' };
const DEC_ICON: Record<Decision, React.ReactNode> = {
  pass: <ShieldCheck size={12} />, review: <ShieldAlert size={12} />, block: <ShieldX size={12} />,
};

/** 作战窗格：带标题栏的多窗格单元（Bloomberg 式窗）。 */
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

/** 三态决策徽章（放行/复核/拦截）。 */
export function DecisionBadge({ decision, size = 'md' }: { decision: Decision; size?: 'sm' | 'md' }) {
  const c = DEC_VAR[decision];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c, fontSize: size === 'sm' ? 10.5 : 11, padding: size === 'sm' ? '1px 7px' : '2px 9px' }}>
      {DEC_ICON[decision]}{DECISION_SHORT[decision]}
    </span>
  );
}

/** 三态点（行首小圆点）。 */
export function DecisionDot({ decision }: { decision: Decision }) {
  return <span className="state-dot" style={{ background: DEC_VAR[decision] }} />;
}

/** 风险评分胶囊（0-1 · 两位小数 · 着色）。 */
export function ScorePill({ score }: { score: number }) {
  const dec: Decision = score >= 0.8 ? 'block' : score >= 0.55 ? 'review' : 'pass';
  const c = DEC_VAR[dec];
  return (
    <span className="score-pill" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}>
      {score.toFixed(2)}
    </span>
  );
}

/** decision → CSS var helper（页面取色用）。 */
export function decVar(decision: Decision) { return DEC_VAR[decision]; }

/** SLA 倒计时 chip（秒 → mm:ss，<60s 转红）。 */
export function SlaChip({ seconds }: { seconds: number }) {
  const [s, setS] = useState(seconds);
  useEffect(() => { setS(seconds); }, [seconds]);
  useEffect(() => {
    if (s <= 0) return;
    const id = setInterval(() => setS(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [s]);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const urgent = s < 60;
  const c = s <= 0 ? 'var(--danger)' : urgent ? 'var(--warning)' : 'var(--text-2)';
  return (
    <span className="mononum" style={{ fontSize: 12, fontWeight: 600, color: c }}>
      {s <= 0 ? '超时' : `${mm}:${ss}`}
    </span>
  );
}

/** 告警 ticker（横向滚动瀑布 · hover 暂停）。 */
export function AlertTicker({ items }: { items: { text: string; mono?: string; level?: Decision }[] }) {
  const loop = [...items, ...items];   // 复制一份实现无缝滚动
  return (
    <div className="ticker">
      <span className="ticker-label"><span className="live-pulse danger" />实时拦截</span>
      <div className="ticker-viewport">
        <div className="ticker-track">
          {loop.map((it, i) => (
            <span key={i} className="ticker-item">
              {it.level && <span className="state-dot" style={{ background: DEC_VAR[it.level] }} />}
              {it.mono && <span className="mono" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{it.mono}</span>}
              <span>{it.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 威胁态势条（市场数据立威）。 */
export function ThreatStrip({ stats }: { stats: ThreatStat[] }) {
  return (
    <div className="grid grid-cols-auto" style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12 }}>
      {stats.map((t, i) => (
        <div key={i} className="threat-card reveal" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="label" style={{ marginBottom: 6 }}>{t.label}</div>
          <div className="row gap-2" style={{ alignItems: 'baseline' }}>
            <span className="mononum" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>{t.value}</span>
            {!!t.trend && t.trend > 0 && (
              <span className="row gap-1" style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>
                <TrendingUp size={11} />态势升
              </span>
            )}
          </div>
          <div className="t-small text-3" style={{ marginTop: 3 }}>{t.sub} · 据 {t.source}</div>
        </div>
      ))}
    </div>
  );
}
