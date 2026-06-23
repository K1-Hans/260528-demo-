import { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert, Scale, Clock, FileSearch, MessageSquare, CheckCircle2,
  AlertTriangle, RotateCcw, ArrowUpCircle, BookOpen, Link2,
  ChevronRight, Gavel, Eye, EyeOff,
} from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel, SeverityBadge, ModalityChip, VerdictBar, MediaStage, TimeChip } from '../components/sig';
import { StatusBadge, MeterBar, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, sem, DRAW } from '../lib/chartTheme';
import { MODERATION_ITEMS, MODERATION_POLICIES } from '../lib/mockData';
import { SEVERITY_LABEL, DISPOSITION_LABEL, type ModerationItem, type Severity } from '../types';

// ─── 升级队列：status escalated/removed + severity high/critical ────────────
const SEV_ORDER: Record<Severity, number> = { critical: 0, high: 1, mid: 2, low: 3, safe: 4 };

const ESCALATED = MODERATION_ITEMS
  .filter(it => (it.status === 'escalated' || it.status === 'removed') &&
    (it.severity === 'critical' || it.severity === 'high'))
  .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.waitSec - a.waitSec);

// 补充 pending 中高危（让队列更丰富）
const HIGH_PENDING = MODERATION_ITEMS.filter(
  it => it.status === 'pending' && (it.severity === 'critical' || it.severity === 'high'),
);
const QUEUE_ITEMS: ModerationItem[] = [...ESCALATED, ...HIGH_PENDING];

// ─── Mock 历史判例（3-4 条）────────────────────────────────────────────────────
interface PrecedentCase {
  id: string;
  date: string;
  category: string;
  severity: Severity;
  verdict: '维持下架' | '维持限流' | '维持升级' | '改判通过';
  reviewer: string;
  basis: string;
  similarity: number;   // 0-100
}

const PRECEDENTS: PrecedentCase[] = [
  {
    id: 'RV-2406-7610', date: '06-18', category: '暴力血腥', severity: 'critical',
    verdict: '维持下架', reviewer: '陈屿',
    basis: '真实暴力场景 · V-VIO-01 命中 92% · 确认违规，留痕处置',
    similarity: 94,
  },
  {
    id: 'RV-2406-7542', date: '06-15', category: '未成年保护', severity: 'high',
    verdict: '维持升级', reviewer: '宋桥',
    basis: '疑似未成年出镜 · L-MIN-01 命中 80% · 上报专项核查组',
    similarity: 88,
  },
  {
    id: 'RV-2406-7389', date: '06-11', category: '暴力血腥', severity: 'high',
    verdict: '改判通过', reviewer: '林岚',
    basis: '经逐帧核查为影视剧截图 · 综合判定合规内容',
    similarity: 71,
  },
  {
    id: 'RV-2406-7201', date: '06-07', category: 'AI 合成伪造', severity: 'high',
    verdict: '维持限流', reviewer: '李澄',
    basis: '人脸深度伪造确认 · 未补标识 · 限流并要求标注',
    similarity: 65,
  },
];

// ─── 处置留痕时间线条目 ────────────────────────────────────────────────────────
interface TimelineEntry {
  id: string;
  time: string;
  actor: string;
  action: string;
  note?: string;
}

function buildTimeline(item: ModerationItem): TimelineEntry[] {
  const base: TimelineEntry[] = [
    { id: 't1', time: item.submittedAt, actor: 'AI 引擎', action: `内容命中 ${item.category} · AI 置信 ${item.confidence}%` },
    { id: 't2', time: item.submittedAt, actor: '自动调度', action: `严重度 ${SEVERITY_LABEL[item.severity]} · 升级疑难复核队列` },
  ];
  if (item.reviewer) {
    base.push({ id: 't3', time: '14:22', actor: item.reviewer, action: `一审处置：${DISPOSITION_LABEL[item.disposed ?? 'escalate']} · 标记疑难上送` });
  }
  base.push({ id: 't4', time: '—', actor: '复核队列', action: '等待二审深审 · 证据链核查中', note: '当前状态' });
  return base;
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function Review() {
  const [selId, setSelId] = useState<string>(QUEUE_ITEMS[0]?.id ?? '');
  const [reveal, setReveal] = useState(false);
  const [remark, setRemark] = useState('');
  const [disposition, setDisposition] = useState<'maintain' | 'overturn' | 'escalate' | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, string>>({});

  const selected = QUEUE_ITEMS.find(it => it.id === selId) ?? QUEUE_ITEMS[0];
  const policies = useMemo(
    () => selected ? MODERATION_POLICIES.filter(p => selected.hits.some(h => h.code === p.code)) : [],
    [selected],
  );
  const timeline = useMemo(() => (selected ? buildTimeline(selected) : []), [selected]);

  useEffect(() => { setReveal(false); setRemark(''); setDisposition(null); }, [selId]);

  const handleSubmit = () => {
    if (!disposition || !selected) return;
    const label = { maintain: '维持原判', overturn: '改判通过', escalate: '上报专项组' }[disposition];
    const entry = `${label}${remark ? ` · ${remark}` : ''}`;
    setSubmitted(prev => ({ ...prev, [selected.id]: entry }));
    toast(`${selected.id} 处置已提交：${label}`, disposition === 'overturn' ? 'success' : disposition === 'maintain' ? 'warn' : 'info');
    setDisposition(null);
    setRemark('');
  };

  // ECharts：命中策略置信度横向柱
  const policyChartOption = useMemo(() => {
    const hits = selected?.hits ?? [];
    return () => ({
      ...baseOption(),
      grid: { left: 8, right: 60, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'none' } },
      xAxis: { type: 'value', max: 100, ...axisStyle(), axisLabel: { show: false }, splitLine: { show: false } },
      yAxis: {
        type: 'category',
        data: hits.map(h => h.name),
        ...axisStyle(),
        axisLabel: { color: 'var(--text-3)', fontSize: 11, width: 120, overflow: 'truncate' as const },
      },
      series: [{
        type: 'bar',
        barMaxWidth: 16,
        data: hits.map(h => ({
          value: h.confidence,
          itemStyle: { color: accent(), borderRadius: [0, 8, 8, 0] },
        })),
        label: { show: true, position: 'right', color: 'var(--text-2)', fontSize: 11, fontFamily: "'Geist Mono',monospace", formatter: '{c}%' },
        ...DRAW,
      }],
    });
  }, [selected]);

  const verdictColor = (v: PrecedentCase['verdict']) => {
    if (v === '改判通过') return 'var(--success)';
    if (v === '维持下架') return 'var(--danger)';
    if (v === '维持升级') return 'var(--warning)';
    return 'var(--gold)';
  };

  return (
    <div className="page page-wide">
      <PageHeader
        title="疑难复核工作台"
        subtitle="升级 / 疑难内容深审 · 证据链核查 + 命中策略比对 + 历史判例参照 + 处置留痕"
        actions={
          <div className="row gap-2">
            <span className="tag"><ShieldAlert size={12} style={{ marginRight: 4 }} />升级队列 {QUEUE_ITEMS.length}</span>
            <StatusBadge status="人工深审" tone="warn" />
          </div>
        }
      />

      {/* 三栏布局 */}
      <div style={{ display: 'grid', gridTemplateColumns: '288px 1fr 360px', gap: 12, alignItems: 'stretch', minHeight: 640 }}>

        {/* ── 左：升级队列 ─────────────────────────────────────────────────── */}
        <Panel
          title={<>升级队列 · {QUEUE_ITEMS.length}</>}
          icon={<ShieldAlert size={13} />}
          bodyClass="panel-body-0"
          style={{ minHeight: 640 }}
        >
          <div style={{ padding: '8px 10px', maxHeight: 570, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {QUEUE_ITEMS.map(it => {
              const isDone = Boolean(submitted[it.id]);
              return (
                <button
                  key={it.id}
                  onClick={() => setSelId(it.id)}
                  className={`film-item ${it.id === selected?.id ? 'sel' : ''}`}
                  style={{ borderLeftColor: `var(--sev-${it.severity})`, textAlign: 'left', opacity: isDone ? 0.45 : 1 }}
                >
                  <div className="col" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                    <div className="row spread" style={{ gap: 6 }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>
                        {it.id.replace('RV-2406-', '#')}
                      </span>
                      <SeverityBadge severity={it.severity} showLabel={false} />
                    </div>
                    <div className="t-small" style={{ color: 'var(--text-1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.category}
                    </div>
                    <div className="row spread" style={{ gap: 4 }}>
                      <ModalityChip modality={it.modality} />
                      {isDone
                        ? <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>已处置</span>
                        : <span className="mononum" style={{ fontSize: 10, color: 'var(--text-3)' }}>AI {it.confidence}%</span>
                      }
                    </div>
                    <div className="row gap-2 t-small" style={{ color: 'var(--text-3)', marginTop: 1 }}>
                      <span>{it.source}</span>
                      <span className="row gap-1">
                        <Clock size={10} />
                        <TimeChip seconds={it.waitSec} countUp />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* ── 中：证物深审台 ─────────────────────────────────────────────────── */}
        <div className="col" style={{ gap: 12, minHeight: 640 }}>
          {selected ? (
            <>
              {/* 标题行 */}
              <div className="row spread reveal">
                <div className="row gap-2">
                  <SeverityBadge severity={selected.severity} />
                  <span className="t-h3">{selected.category}</span>
                  <ModalityChip modality={selected.modality} />
                </div>
                <div className="row gap-2">
                  <span className="tag tag-mono">{selected.id}</span>
                  <button
                    className="btn btn-subtle btn-sm"
                    onClick={() => setReveal(v => !v)}
                  >
                    {reveal || !selected.blur ? <EyeOff size={13} /> : <Eye size={13} />}
                    {selected.blur ? (reveal ? '模糊' : '查看证据') : '清晰'}
                  </button>
                </div>
              </div>

              {/* 大媒体台 */}
              <Panel
                title="证物媒体台"
                icon={<Eye size={13} />}
                bodyClass="panel-body-0"
                style={{ flex: '0 0 auto' }}
              >
                <MediaStage
                  item={reveal ? { ...selected, blur: false } : selected}
                  height={288}
                  scanning
                  allowReveal
                  onReveal={() => setReveal(true)}
                />
                {/* 多帧 / 违规帧时间码 */}
                {selected.flagFrames && selected.flagFrames.length > 0 && (
                  <div className="row gap-3" style={{ padding: '8px 14px', borderTop: '1px solid var(--hairline)', flexWrap: 'wrap' }}>
                    <span className="label" style={{ margin: 0 }}>违规帧</span>
                    {selected.flagFrames.map(f => (
                      <span key={f} className="chip mononum" style={{ fontSize: 11, background: 'color-mix(in srgb, var(--sev-high) 14%, transparent)', color: 'var(--sev-high)' }}>
                        {f}s
                      </span>
                    ))}
                  </div>
                )}
                {/* 来源信息 */}
                <div className="row gap-4 t-small text-3 wrap" style={{ padding: '8px 14px', borderTop: '1px solid var(--hairline)' }}>
                  <span>来源 <span className="text-2" style={{ fontWeight: 600 }}>{selected.source}</span></span>
                  <span>发布者 <span className="text-2 mono">{selected.author}</span></span>
                  <span>入列 <span className="text-2 mononum">{selected.submittedAt}</span></span>
                </div>
              </Panel>

              {/* 完整命中策略 */}
              <Panel title="命中策略 · 全量分析" icon={<FileSearch size={13} />} bodyClass="panel-body">
                {/* 主判定置信度 */}
                <div className="row spread" style={{ marginBottom: 10 }}>
                  <div>
                    <div className="label" style={{ marginBottom: 4 }}>主判定置信度</div>
                    <div className="row gap-2" style={{ alignItems: 'baseline' }}>
                      <span className={`mononum sev-${selected.severity}`} style={{ fontSize: 22, fontWeight: 700 }}>{selected.confidence}%</span>
                      <span className="t-small text-3">· {SEVERITY_LABEL[selected.severity]}</span>
                    </div>
                  </div>
                  <VerdictBar confidence={selected.confidence} severity={selected.severity} />
                </div>

                {/* 命中策略横柱 ECharts */}
                {selected.hits.length > 0 && (
                  <Chart
                    build={policyChartOption}
                    height={Math.max(80, selected.hits.length * 40)}
                    deps={[selected.id]}
                  />
                )}

                {/* 策略详情卡 */}
                <div className="col gap-2" style={{ marginTop: 10 }}>
                  {selected.hits.map(h => {
                    const pol = policies.find(p => p.code === h.code);
                    return (
                      <div key={h.code} className="card" style={{ padding: '10px 12px' }}>
                        <div className="row spread" style={{ marginBottom: 5 }}>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--gold)' }}>{h.code}</span>
                          <span className="mononum t-small" style={{ color: `var(--sev-${selected.severity})`, fontWeight: 700 }}>{h.confidence}%</span>
                        </div>
                        <div className="t-small" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{h.name}</div>
                        {pol && (
                          <div className="t-small text-3" style={{ marginTop: 4, lineHeight: 1.5 }}>
                            处置阈值 {pol.threshold}% · 策略动作 {pol.action === 'remove' ? '下架' : pol.action === 'limit' ? '限流' : pol.action === 'escalate' ? '升级人审' : pol.action} · {pol.auto ? '自动' : '人审'}
                          </div>
                        )}
                        <div style={{ marginTop: 6 }}>
                          <MeterBar pct={h.confidence} color={sem('block')} label={`${h.confidence}%`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI 推理要点 */}
                <div className="card" style={{ padding: '10px 12px', marginTop: 8, background: 'var(--surface-2)', borderLeft: '2px solid var(--gold)' }}>
                  <div className="label" style={{ marginBottom: 6 }}>AI 推理要点</div>
                  <ul className="t-small text-2 col gap-2" style={{ margin: 0, paddingLeft: 14, listStyle: 'disc' }}>
                    <li>模型综合 {selected.hits.length} 条策略交叉命中，综合判定 <span className={`sev-${selected.severity}`} style={{ fontWeight: 600 }}>{SEVERITY_LABEL[selected.severity]}</span></li>
                    {selected.aiSynthetic !== undefined && (
                      <li>检出 AI 合成痕迹，合成概率 <span className="mononum sev-high">{selected.aiSynthetic}%</span>，建议送合成检测复核</li>
                    )}
                    {selected.boxes && selected.boxes.length > 0 && (
                      <li>定位 {selected.boxes.length} 处违规区域，最高置信 <span className="mononum">{Math.max(...selected.boxes.map(b => b.confidence))}%</span></li>
                    )}
                    {selected.flagFrames && selected.flagFrames.length > 0 && (
                      <li>视频帧分析命中 {selected.flagFrames.length} 个违规时间节点，需人工逐帧核验</li>
                    )}
                    <li>建议对照历史同类判例，确认处置一致性后提交</li>
                  </ul>
                </div>
              </Panel>
            </>
          ) : (
            <div className="card col" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--text-3)', gap: 10 }}>
              <CheckCircle2 size={40} style={{ color: 'var(--sev-safe)', opacity: 0.5 }} />
              <span className="t-h3 text-2">升级队列已清空</span>
            </div>
          )}
        </div>

        {/* ── 右：判例 + 处置编排 ───────────────────────────────────────────── */}
        <div className="col" style={{ gap: 12, minHeight: 640 }}>

          {/* 相似历史判例 */}
          <Panel title="相似历史判例" icon={<BookOpen size={13} />} bodyClass="panel-body" style={{ flex: '0 0 auto' }}>
            <div className="col gap-3">
              {PRECEDENTS.map(p => (
                <div key={p.id} className="card card-hover" style={{ padding: '10px 12px', cursor: 'default' }}>
                  <div className="row spread" style={{ marginBottom: 5 }}>
                    <div className="row gap-2">
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{p.id.replace('RV-2406-', '#')}</span>
                      <SeverityBadge severity={p.severity} showLabel={false} />
                    </div>
                    <span className="mononum t-small" style={{ color: 'var(--gold)' }}>相似度 {p.similarity}%</span>
                  </div>
                  <div className="row spread" style={{ marginBottom: 4 }}>
                    <span className="t-small" style={{ fontWeight: 600, color: 'var(--text-1)' }}>{p.category}</span>
                    <span className="t-small" style={{ color: verdictColor(p.verdict), fontWeight: 600 }}>{p.verdict}</span>
                  </div>
                  <MeterBar pct={p.similarity} color={accent()} />
                  <div className="t-small text-3" style={{ marginTop: 6, lineHeight: 1.5 }}>{p.basis}</div>
                  <div className="row spread" style={{ marginTop: 5 }}>
                    <span className="t-small text-3">{p.date} · {p.reviewer}</span>
                    <span className="row gap-1 t-small" style={{ color: 'var(--text-3)' }}>
                      <Link2 size={10} />
                      <span>引用</span>
                      <ChevronRight size={10} />
                    </span>
                  </div>
                </div>
              ))}
              {/* 一致性说明 */}
              <div className="card" style={{ padding: '9px 12px', background: 'var(--surface-2)' }}>
                <div className="label" style={{ marginBottom: 4 }}>判例一致性</div>
                <div className="t-small text-2">4 条同类历史判例中，3 条维持升级/下架，1 条改判通过（6-11 · 影视截图）。当前内容若为真实违规，建议维持。</div>
              </div>
            </div>
          </Panel>

          {/* 处置编排面板 */}
          <Panel
            title="处置编排"
            icon={<Gavel size={13} />}
            bodyClass="panel-body"
            style={{ flex: 1 }}
            right={
              selected && submitted[selected.id]
                ? <StatusBadge status="已提交" tone="good" />
                : undefined
            }
          >
            {selected ? (
              submitted[selected.id] ? (
                <div className="col" style={{ alignItems: 'center', gap: 10, padding: '20px 0', textAlign: 'center' }}>
                  <CheckCircle2 size={32} style={{ color: 'var(--success)' }} />
                  <span className="t-small" style={{ color: 'var(--text-2)', fontWeight: 600 }}>处置已提交</span>
                  <span className="t-small text-3">{submitted[selected.id]}</span>
                </div>
              ) : (
                <div className="col gap-4">
                  {/* 三处置按钮 */}
                  <div>
                    <div className="label" style={{ marginBottom: 8 }}>复核决定</div>
                    <div className="col gap-2">
                      <DispositionBtn
                        icon={<Scale size={14} />}
                        label="维持原判"
                        desc="确认违规，原处置结论有效，留痕记录"
                        tone="warn"
                        active={disposition === 'maintain'}
                        onClick={() => setDisposition(d => d === 'maintain' ? null : 'maintain')}
                      />
                      <DispositionBtn
                        icon={<RotateCcw size={14} />}
                        label="改判通过"
                        desc="复核认定内容合规，撤销原处置，需填写改判理由"
                        tone="ok"
                        active={disposition === 'overturn'}
                        onClick={() => setDisposition(d => d === 'overturn' ? null : 'overturn')}
                      />
                      <DispositionBtn
                        icon={<ArrowUpCircle size={14} />}
                        label="上报专项组"
                        desc="内容涉及特殊类型，需专项合规或执法协查"
                        tone="info"
                        active={disposition === 'escalate'}
                        onClick={() => setDisposition(d => d === 'escalate' ? null : 'escalate')}
                      />
                    </div>
                  </div>

                  {/* 备注 */}
                  <div>
                    <div className="label" style={{ marginBottom: 6 }}>
                      <MessageSquare size={11} style={{ marginRight: 4 }} />
                      审核备注{disposition === 'overturn' && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*必填</span>}
                    </div>
                    <textarea
                      className="input"
                      placeholder="记录复核依据、证据参考、判例引用等（选填）"
                      rows={3}
                      value={remark}
                      onChange={e => setRemark(e.target.value)}
                      style={{ width: '100%', resize: 'none', fontSize: 13, lineHeight: 1.6 }}
                    />
                  </div>

                  {/* 提交按钮 */}
                  <button
                    className="btn btn-primary"
                    disabled={!disposition || (disposition === 'overturn' && !remark.trim())}
                    onClick={handleSubmit}
                    style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                  >
                    <Gavel size={14} />
                    提交处置 · 留痕归档
                  </button>
                </div>
              )
            ) : (
              <div className="t-small text-3" style={{ textAlign: 'center', padding: 24 }}>请选择待复核项</div>
            )}
          </Panel>

          {/* 处置留痕时间线 */}
          {selected && (
            <Panel title="处置留痕时间线" icon={<Clock size={13} />} bodyClass="panel-body">
              <div className="col gap-0">
                {timeline.map((entry, idx) => (
                  <div key={entry.id} style={{ display: 'flex', gap: 12, paddingBottom: idx < timeline.length - 1 ? 14 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: entry.note ? 'var(--gold)' : 'var(--text-3)',
                        border: entry.note ? '2px solid var(--gold)' : '2px solid var(--surface-3)',
                        marginTop: 2, flexShrink: 0,
                      }} />
                      {idx < timeline.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: 'var(--hairline)', marginTop: 3 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: idx < timeline.length - 1 ? 0 : 0 }}>
                      <div className="row gap-2" style={{ marginBottom: 2 }}>
                        <span className="mononum" style={{ fontSize: 11, color: 'var(--text-3)' }}>{entry.time}</span>
                        <span className="t-small" style={{ fontWeight: 600, color: 'var(--gold)' }}>{entry.actor}</span>
                        {entry.note && <StatusBadge status={entry.note} tone="info" />}
                      </div>
                      <div className="t-small text-2" style={{ lineHeight: 1.5 }}>{entry.action}</div>
                    </div>
                  </div>
                ))}
                {submitted[selected.id] && (
                  <div style={{ display: 'flex', gap: 12, paddingTop: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', border: '2px solid var(--success)', marginTop: 2 }} />
                    </div>
                    <div>
                      <div className="row gap-2" style={{ marginBottom: 2 }}>
                        <span className="mononum" style={{ fontSize: 11, color: 'var(--text-3)' }}>刚刚</span>
                        <span className="t-small" style={{ fontWeight: 600, color: 'var(--success)' }}>复核完成</span>
                      </div>
                      <div className="t-small text-2" style={{ lineHeight: 1.5 }}>{submitted[selected.id]}</div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 处置按钮 ─────────────────────────────────────────────────────────────────
function DispositionBtn({ icon, label, desc, tone, active, onClick }: {
  icon: React.ReactNode; label: string; desc: string;
  tone: 'ok' | 'warn' | 'info'; active: boolean; onClick: () => void;
}) {
  const colorMap = {
    ok: 'var(--success)',
    warn: 'var(--warning)',
    info: 'var(--gold)',
  };
  const c = colorMap[tone];
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
        borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left', width: '100%',
        background: active ? `color-mix(in srgb, ${c} 14%, transparent)` : 'var(--surface-2)',
        border: `1px solid ${active ? `color-mix(in srgb, ${c} 42%, transparent)` : 'var(--hairline)'}`,
        color: active ? c : 'var(--text-2)',
        transition: 'all 0.18s var(--ease)',
      }}
    >
      <span style={{ color: c, marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div className="t-small" style={{ color: 'var(--text-3)', fontWeight: 400, lineHeight: 1.45 }}>{desc}</div>
      </div>
      {active && (
        <span style={{ marginLeft: 'auto', flexShrink: 0, marginTop: 2 }}>
          <AlertTriangle size={13} style={{ color: c }} />
        </span>
      )}
    </button>
  );
}
