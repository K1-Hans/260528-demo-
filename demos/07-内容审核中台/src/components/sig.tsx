import { useEffect, useState } from 'react';
import { FileText, Image as ImageIcon, Video, AudioLines, Radio, Eye, ScanLine } from 'lucide-react';
import type { Severity, Modality, ModerationItem } from '../types';
import { SEVERITY_LABEL, SEVERITY_CLASS, MODALITY_LABEL } from '../types';

// ════ 证物灯箱签名组件（媒体审片台 · 框选高亮 · 风险徽章 · 模态 · 置信度）════

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

/** 风险 5 阶徽章（安全/低/中/高/严重）。 */
export function SeverityBadge({ severity, showLabel = true }: { severity: Severity; showLabel?: boolean }) {
  return (
    <span className={`sev-badge ${SEVERITY_CLASS[severity]}`}>
      <span className="sev-dot" />{showLabel && SEVERITY_LABEL[severity]}
    </span>
  );
}

const MOD_ICON: Record<Modality, React.ReactNode> = {
  text: <FileText size={11} />, image: <ImageIcon size={11} />, video: <Video size={11} />,
  audio: <AudioLines size={11} />, live: <Radio size={11} />,
};
/** 模态角标（文本/图片/视频/音频/直播）。 */
export function ModalityChip({ modality }: { modality: Modality }) {
  return <span className="modal-chip">{MOD_ICON[modality]}{MODALITY_LABEL[modality]}</span>;
}

/** AI 判定置信度条。 */
export function VerdictBar({ confidence, severity }: { confidence: number; severity: Severity }) {
  return (
    <div className="verdict-bar">
      <div className="verdict-fill" style={{ width: `${confidence}%`, background: `var(--sev-${severity})` }} />
    </div>
  );
}

/** 顶栏态势灯（积压/时延/高危 三态）。 */
export function StatLights({ lights }: { lights: { key: string; label: string; state: 'on' | 'warn' | 'off' }[] }) {
  return (
    <div className="stat-lights">
      {lights.map(l => (
        <span key={l.key} className={`stat-light ${l.state}`} title={l.label}>
          <span className="dot" />{l.label}
        </span>
      ))}
    </div>
  );
}

/** 安全占位媒体（picsum · 安全风景/物体，绝不放真实违规内容）。 */
export function mediaUrl(seed: string, w = 520, h = 360): string {
  return `https://picsum.photos/seed/${encodeURIComponent('mod-' + seed)}/${w}/${h}`;
}

/** 恒定暗媒体审片台 — 媒体在中性暗台判定 + 违规框选 + 扫描线 + 模糊保护。 */
export function MediaStage({ item, height = 320, scanning = false, allowReveal = true, onReveal }: {
  item: ModerationItem; height?: number; scanning?: boolean; allowReveal?: boolean; onReveal?: () => void;
}) {
  const [revealed, setRevealed] = useState(!item.blur);
  useEffect(() => { setRevealed(!item.blur); }, [item.id, item.blur]);

  const reveal = () => { if (allowReveal) { setRevealed(true); onReveal?.(); } };
  const isVisual = item.modality === 'image' || item.modality === 'video' || item.modality === 'live';

  return (
    <div className={`media-stage ${item.blur && !revealed ? 'media-blur' : 'media-blur revealed'}`}
      style={{ height }} onClick={reveal}>
      {/* 文本审核 */}
      {item.modality === 'text' && (
        <div style={{ padding: '18px 20px', width: '100%', height: '100%', overflow: 'auto', color: 'var(--text-1)', fontSize: 14, lineHeight: 1.7 }}>
          <TextWithHits text={item.text ?? ''} hits={item.textHits ?? []} />
        </div>
      )}

      {/* 音频审核（静态波形 + 违规段标记） */}
      {item.modality === 'audio' && (
        <AudioStage item={item} />
      )}

      {/* 图片 / 视频 / 直播 */}
      {isVisual && (
        <>
          <img src={mediaUrl(item.id)} alt="" loading="lazy" />
          {/* 违规框选 */}
          {(revealed || !item.blur) && item.boxes?.map((b, i) => (
            <div key={i} className={`vio-box ${SEVERITY_CLASS[b.severity]}`}
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}>
              <span className="vio-tag">{b.label} {b.confidence}%</span>
            </div>
          ))}
          {/* 视频时间码刻度 */}
          {item.modality === 'video' && item.duration && (
            <VideoScrubber duration={item.duration} flagFrames={item.flagFrames ?? []} />
          )}
          {scanning && <div className="scan-line" />}
        </>
      )}

      {/* 角标：模态 + 时长 */}
      <div className="media-flag row gap-2">
        <ModalityChip modality={item.modality} />
        {item.duration && <span className="modal-chip mononum">{item.duration}</span>}
        {item.modality === 'live' && (
          <span className="modal-chip" style={{ color: 'var(--danger)' }}><span className="live-pulse" style={{ width: 6, height: 6 }} />LIVE</span>
        )}
      </div>

      {/* 模糊保护遮罩提示 */}
      {item.blur && !revealed && isVisual && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 5, cursor: 'pointer', color: '#fff' }}>
          <Eye size={22} style={{ opacity: 0.85 }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>高危内容已模糊保护 · 点击查看证据</span>
        </div>
      )}
    </div>
  );
}

function TextWithHits({ text, hits }: { text: string; hits: { token: string; severity: Severity }[] }) {
  if (!hits.length) return <>{text}</>;
  // 把命中词包成高亮 span（保序，不重叠简单匹配）
  const parts: React.ReactNode[] = [];
  let rest = text; let key = 0;
  const hitMap = new Map(hits.map(h => [h.token, h.severity]));
  const re = new RegExp(`(${hits.map(h => h.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  rest.split(re).forEach(seg => {
    const sev = hitMap.get(seg);
    if (sev) parts.push(<mark key={key++} className={sev === 'high' || sev === 'critical' ? 'tok-hit' : 'tok-mid'}>{seg}</mark>);
    else parts.push(<span key={key++}>{seg}</span>);
  });
  return <>{parts}</>;
}

function AudioStage({ item }: { item: ModerationItem }) {
  const N = 64;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20 }}>
      <AudioLines size={26} style={{ color: 'var(--gold)' }} />
      <div className="wave" style={{ height: 64, width: '80%', gap: 3 }}>
        {Array.from({ length: N }, (_, i) => {
          const seg = item.audioSegments?.find(s => i / N >= s.from && i / N <= s.to);
          const h = 18 + Math.abs(Math.sin(i * 0.7) * 0.6 + Math.sin(i * 1.9) * 0.4) * 70;
          return <span key={i} className="wave-bar" style={{ height: `${h}%`, transform: 'scaleY(1)', background: seg ? 'var(--sev-high)' : 'var(--gold)' }} />;
        })}
      </div>
      {item.audioSegments?.map((s, i) => (
        <span key={i} className="sev-badge is-high" style={{ fontSize: 10 }}><span className="sev-dot" />命中段 {s.label}</span>
      ))}
    </div>
  );
}

function VideoScrubber({ duration, flagFrames }: { duration: string; flagFrames: number[] }) {
  const total = parseInt(duration.split(':')[0]) * 60 + parseInt(duration.split(':')[1] || '0');
  return (
    <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.18)', zIndex: 3 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '38%', borderRadius: 3, background: 'rgba(255,255,255,0.4)' }} />
      {flagFrames.map((f, i) => (
        <span key={i} title={`违规帧 ${f}s`} style={{ position: 'absolute', top: -3, left: `${total ? (f / total) * 100 : 0}%`, width: 3, height: 12, borderRadius: 2, background: 'var(--sev-high)', boxShadow: '0 0 6px var(--sev-high)' }} />
      ))}
    </div>
  );
}

/** 通话/等待计时 chip（秒 → mm:ss）。 */
export function TimeChip({ seconds, countUp = false, urgentBelow = 0 }: { seconds: number; countUp?: boolean; urgentBelow?: number }) {
  const [s, setS] = useState(seconds);
  useEffect(() => { setS(seconds); }, [seconds]);
  useEffect(() => {
    const id = setInterval(() => setS(v => countUp ? v + 1 : Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [countUp]);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const urgent = !countUp && urgentBelow > 0 && s < urgentBelow;
  const c = !countUp && s <= 0 ? 'var(--danger)' : urgent ? 'var(--warning)' : 'var(--text-2)';
  return <span className="mononum" style={{ fontSize: 12, fontWeight: 600, color: c }}>{!countUp && s <= 0 ? '超时' : `${mm}:${ss}`}</span>;
}

export { ScanLine as ScanLineIcon };
