import { CircleDot, FileEdit, PauseCircle, CheckCircle2, Clock, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import type { CampaignStatus, Compliance, Channel } from '../types';
import { CAMPAIGN_STATUS_LABEL, COMPLIANCE_LABEL } from '../types';

// ════ 增势 签名组件（活动状态 chip · 渠道 pill · 合规标 · 风险点 · 通用窗格）════

const STATUS_META: Record<CampaignStatus, { cls: string; Icon: typeof CircleDot }> = {
  live: { cls: 'cmp-live', Icon: CircleDot },
  draft: { cls: 'cmp-draft', Icon: FileEdit },
  paused: { cls: 'cmp-paused', Icon: PauseCircle },
  done: { cls: 'cmp-done', Icon: CheckCircle2 },
  review: { cls: 'cmp-review', Icon: Clock },
};

/** 活动状态 chip（在投/草稿/暂停/已结束/待审）。 */
export function CampaignStatusChip({ status, showLabel = true }: { status: CampaignStatus; showLabel?: boolean }) {
  const { cls, Icon } = STATUS_META[status];
  return (
    <span className={`cmp-chip ${cls}`}>
      <Icon size={11} />{showLabel && CAMPAIGN_STATUS_LABEL[status]}
    </span>
  );
}

/** 渠道 pill（带品牌点色）。 */
export function ChannelPill({ channel, sm }: { channel: Channel; sm?: boolean }) {
  return (
    <span className="channel-pill" style={sm ? { padding: '2px 8px', fontSize: 11 } : undefined}>
      <span className="channel-dot" style={{ background: `var(${channel.colorVar})` }} />
      {channel.name}
    </span>
  );
}

const COMPLIANCE_META: Record<Compliance, { cls: string; Icon: typeof ShieldCheck; color: string }> = {
  pass: { cls: 'compliance-pass', Icon: ShieldCheck, color: 'var(--success)' },
  warn: { cls: 'compliance-warn', Icon: ShieldAlert, color: 'var(--warning)' },
  block: { cls: 'compliance-block', Icon: ShieldX, color: 'var(--danger)' },
};

/** 品牌合规角标（覆盖在创意缩略图上）。 */
export function ComplianceBadge({ level }: { level: Compliance }) {
  const { cls, Icon } = COMPLIANCE_META[level];
  return (
    <span className={`creative-compliance ${cls}`}>
      <Icon size={11} />{COMPLIANCE_LABEL[level]}
    </span>
  );
}

/** 品牌合规内联标（用于表格/列表，非覆盖）。 */
export function ComplianceTag({ level }: { level: Compliance }) {
  const { Icon, color } = COMPLIANCE_META[level];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      <Icon size={11} />{COMPLIANCE_LABEL[level]}
    </span>
  );
}

/** 风险点（high/mid/low）。 */
export function RiskDot({ risk }: { risk: 'high' | 'mid' | 'low' }) {
  const color = risk === 'high' ? 'var(--danger)' : risk === 'mid' ? 'var(--warning)' : 'var(--success)';
  const label = risk === 'high' ? '高风险' : risk === 'mid' ? '中风险' : '低风险';
  return (
    <span className="row gap-1" style={{ fontSize: 11, fontWeight: 600, color }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{label}
    </span>
  );
}

/** 通用窗格：带标题栏的多窗格单元。 */
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
