import { Fragment, useMemo, useState } from 'react';
import {
  Scale, AlertTriangle, CheckCircle2, RotateCcw, SlidersHorizontal,
  Clock, User, MessageSquare, FileCheck, Layers, Bot,
} from 'lucide-react';
import { PageHeader, StatCard, EmptyState } from '../components/ui';
import { Panel, SeverityBadge, ModalityChip, TimeChip, mediaUrl, MediaStage } from '../components/sig';
import { StatusBadge, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, sem, DRAW } from '../lib/chartTheme';
import { APPEALS } from '../lib/mockData';
import {
  DISPOSITION_LABEL,
  type Appeal, type AppealStatus, type ModerationItem,
} from '../types';

// ─── SLA 颜色映射 ─────────────────────────────────────────────────────────────
function slaColor(hrs: number): string {
  if (hrs < 0) return 'var(--danger)';
  if (hrs <= 2) return 'var(--warning)';
  return 'var(--gold)';
}

// ─── 申诉状态 → tone ─────────────────────────────────────────────────────────
function appealTone(status: AppealStatus): 'good' | 'warn' | 'bad' | 'info' | 'muted' {
  if (status === '撤销恢复') return 'good';
  if (status === '维持原判') return 'bad';
  if (status === '部分调整') return 'warn';
  return 'info';
}

// ─── 将 Appeal 映射为最小 ModerationItem 给 MediaStage ──────────────────────
function appealToItem(ap: Appeal): ModerationItem {
  return {
    id: ap.itemId,
    modality: ap.modality,
    severity: 'mid',
    category: ap.category,
    confidence: 80,
    status: 'appealed',
    source: '示例社区 · 申诉内容',
    author: '用户****',
    submittedAt: ap.submittedAt,
    waitSec: 0,
    media: ap.itemId,
    blur: false,
    hits: [],
  };
}

// ─── AI 建议色彩 ───────────────────────────────────────────────────────────────
function aiRecColor(rec: AppealStatus): string {
  if (rec === '撤销恢复') return 'var(--success)';
  if (rec === '维持原判') return 'var(--danger)';
  if (rec === '部分调整') return 'var(--warning)';
  return 'var(--gold)';
}

// ─── SLA 倒计时（小时→分）──────────────────────────────────────────────────────
function SlaCountdown({ hrsLeft }: { hrsLeft: number }) {
  const totalSec = Math.max(0, Math.round(hrsLeft * 3600));
  if (hrsLeft < 0) {
    return (
      <span className="mononum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
        超时 {Math.abs(Math.round(hrsLeft * 60))} 分钟
      </span>
    );
  }
  return <TimeChip seconds={totalSec} urgentBelow={7200} />;
}

export default function Appeal() {
  const [selId, setSelId] = useState<string>(APPEALS[0]?.id ?? '');
  const [decisions, setDecisions] = useState<Record<string, AppealStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState('');

  // 按 slaHoursLeft 紧迫排序（超时在前，然后最小剩余时间）
  const sorted = useMemo(
    () => [...APPEALS].sort((a, b) => a.slaHoursLeft - b.slaHoursLeft),
    [],
  );

  const selected: Appeal | undefined = sorted.find(a => a.id === selId);

  // 当前实际状态（决策覆盖初始状态）
  function effectiveStatus(ap: Appeal): AppealStatus {
    return (decisions[ap.id] as AppealStatus | undefined) ?? ap.status;
  }
  function effectiveDecision(ap: Appeal): string | undefined {
    return notes[ap.id] ?? ap.decision;
  }
  function effectiveReviewer(ap: Appeal): string | undefined {
    if (decisions[ap.id]) return '宋桥（当前用户）';
    return ap.reviewer;
  }

  // 统计数
  const pending = sorted.filter(a => effectiveStatus(a) === '待复核').length;
  const resolved = sorted.filter(a => effectiveStatus(a) !== '待复核').length;
  const overdue = sorted.filter(a => a.slaHoursLeft < 0).length;
  const reverseCount = sorted.filter(a => effectiveStatus(a) === '撤销恢复' || effectiveStatus(a) === '部分调整').length;

  const decide = (verdict: AppealStatus) => {
    if (!selected) return;
    if (effectiveStatus(selected) !== '待复核') {
      toast('该申诉已裁决，如需修改请联系主管', 'warn');
      return;
    }
    const note = noteInput.trim() || defaultNote(verdict);
    setDecisions(prev => ({ ...prev, [selected.id]: verdict }));
    setNotes(prev => ({ ...prev, [selected.id]: note }));
    setNoteInput('');
    const tone = verdict === '撤销恢复' ? 'success' : verdict === '维持原判' ? 'danger' : 'warn';
    toast(`${selected.id} · ${verdict} · 留痕已记录`, tone);
    // 自动跳下一待审
    const nextPending = sorted.find(a => a.id !== selected.id && (decisions[a.id] ?? a.status) === '待复核');
    if (nextPending) setSelId(nextPending.id);
  };

  function defaultNote(v: AppealStatus): string {
    if (v === '撤销恢复') return '复核确认内容符合社区规范，撤销原处置，恢复可见性。';
    if (v === '维持原判') return '复核核实违规属实，维持原处置结论。';
    return '复核认定部分内容存在问题，作出部分调整处置。';
  }

  // SLA 分布 Chart 数据
  const slaChartData = sorted.map(a => ({
    name: a.id,
    value: a.slaHoursLeft,
    status: effectiveStatus(a),
  }));

  return (
    <div className="page page-wide">
      <PageHeader
        title="申诉复核闭环"
        subtitle="用户申诉队列 · 按 SLA 紧迫排序 · AI 建议辅助裁决 · 维持 / 撤销 / 部分调整留痕"
        actions={
          <span className="tag tag-mono">
            <Scale size={12} style={{ marginRight: 4 }} />
            SLA 48h
          </span>
        }
      />

      {/* KPI 行 */}
      <div
        className="grid reveal"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}
      >
        <StatCard label="待复核" raw={pending} icon={<Clock size={15} />} delayClass="reveal-1" />
        <StatCard label="已裁决" raw={resolved} icon={<FileCheck size={15} />} delayClass="reveal-2" />
        <StatCard
          label="SLA 超时"
          raw={overdue}
          icon={<AlertTriangle size={15} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="撤销 / 改判"
          raw={reverseCount}
          unit="件"
          icon={<RotateCcw size={15} />}
          delayClass="reveal-4"
        />
      </div>

      {/* 三栏主区域 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '296px 1fr 330px',
          gap: 12,
          alignItems: 'stretch',
          minHeight: 580,
        }}
      >
        {/* ── 左：申诉队列 ─────────────────────────────────────────────────── */}
        <Panel
          title={<>申诉队列 · {sorted.length}</>}
          icon={<Layers size={13} />}
          bodyClass="panel-body-0"
          style={{ minHeight: 580 }}
        >
          {/* SLA 剩余时间分布迷你图 */}
          <div style={{ borderBottom: '1px solid var(--hairline)', padding: '10px 12px' }}>
            <Chart
              height={72}
              build={() => {
                const base = baseOption();
                const ax = axisStyle();
                return {
                  ...base,
                  backgroundColor: 'transparent',
                  grid: { left: 4, right: 4, top: 6, bottom: 4, containLabel: true },
                  tooltip: {
                    ...(base.tooltip as object),
                    formatter: (p: { name: string; value: number }) =>
                      `${p.name}<br/>SLA 剩余 ${p.value.toFixed(1)}h`,
                  },
                  xAxis: {
                    type: 'category',
                    data: slaChartData.map(d => d.name.replace('AP-', '#')),
                    ...ax,
                    axisLabel: { ...ax.axisLabel, fontSize: 9 },
                  },
                  yAxis: { type: 'value', ...ax, axisLabel: { show: false }, splitLine: { show: false } },
                  series: [{
                    type: 'bar',
                    data: slaChartData.map(d => ({
                      value: Math.max(0.1, d.value),
                      itemStyle: {
                        color: d.value < 0
                          ? sem('block')
                          : d.value <= 2
                          ? sem('review')
                          : accent(),
                        borderRadius: [2, 2, 0, 0],
                      },
                    })),
                    barMaxWidth: 24,
                    ...DRAW,
                  }],
                };
              }}
              deps={[JSON.stringify(decisions)]}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: 10,
              maxHeight: 430,
              overflowY: 'auto',
            }}
          >
            {sorted.map(ap => {
              const status = effectiveStatus(ap);
              const isSel = ap.id === selId;
              const urgentColor = slaColor(ap.slaHoursLeft);
              return (
                <button
                  key={ap.id}
                  className={`film-item ${isSel ? 'sel' : ''}`}
                  style={{
                    borderLeftColor: urgentColor,
                    textAlign: 'left',
                    opacity: status !== '待复核' ? 0.7 : 1,
                  }}
                  onClick={() => setSelId(ap.id)}
                >
                  {/* 缩略图占位 */}
                  <div className="film-thumb">
                    <img
                      src={mediaUrl(ap.itemId, 120, 120)}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="row spread" style={{ gap: 6 }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>
                        {ap.id}
                      </span>
                      <StatusBadge status={status} tone={appealTone(status)} />
                    </div>
                    <div
                      className="t-small"
                      style={{
                        color: 'var(--text-1)',
                        fontWeight: 600,
                        marginTop: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ap.category}
                    </div>
                    <div className="row spread" style={{ marginTop: 5 }}>
                      <ModalityChip modality={ap.modality} />
                      <span className="row gap-1" style={{ color: urgentColor, fontSize: 10, fontWeight: 600 }}>
                        <Clock size={9} />
                        <span className="mononum">
                          {ap.slaHoursLeft < 0
                            ? `超时 ${Math.abs(Math.round(ap.slaHoursLeft * 60))}m`
                            : `${ap.slaHoursLeft.toFixed(1)}h`}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* ── 中：申诉详情 ─────────────────────────────────────────────────── */}
        <Panel
          title="申诉内容核查"
          icon={<MessageSquare size={13} />}
          bodyClass="panel-body"
          style={{ minHeight: 580 }}
        >
          {selected ? (
            <div className="col" style={{ gap: 14, height: '100%' }}>
              {/* 头部：工单 + 原处置 + 申诉状态 */}
              <div className="row spread" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div className="row gap-2">
                  <SeverityBadge severity="mid" showLabel={false} />
                  <span className="t-h3">{selected.category}</span>
                  <span className="tag tag-mono">{selected.itemId}</span>
                </div>
                <div className="row gap-2">
                  <span className="label">原处置</span>
                  <span
                    className="badge"
                    style={{
                      background: 'color-mix(in srgb, var(--danger) 14%, transparent)',
                      color: 'var(--danger)',
                    }}
                  >
                    {DISPOSITION_LABEL[selected.original]}
                  </span>
                  <StatusBadge
                    status={effectiveStatus(selected)}
                    tone={appealTone(effectiveStatus(selected))}
                  />
                </div>
              </div>

              {/* 媒体审片台（证物灯箱签名件 · 按模态分支） */}
              <MediaStage item={appealToItem(selected)} height={220} />

              {/* 申诉理由 */}
              <div className="card" style={{ padding: '12px 14px' }}>
                <div className="row gap-2" style={{ marginBottom: 8 }}>
                  <MessageSquare size={13} style={{ color: 'var(--gold)' }} />
                  <span className="label">用户申诉理由</span>
                  <span className="t-small text-3">提交于 {selected.submittedAt}</span>
                </div>
                <p
                  style={{
                    fontSize: 13.5,
                    color: 'var(--text-1)',
                    lineHeight: 1.75,
                    margin: 0,
                  }}
                >
                  {selected.reason}
                </p>
              </div>

              {/* AI 建议 */}
              <div
                className="card"
                style={{
                  padding: '12px 14px',
                  borderColor: `color-mix(in srgb, ${aiRecColor(selected.aiRecommend)} 40%, var(--hairline))`,
                }}
              >
                <div className="row gap-2" style={{ marginBottom: 6 }}>
                  <Bot size={13} style={{ color: aiRecColor(selected.aiRecommend) }} />
                  <span className="label">AI 复核建议</span>
                </div>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <span
                    className="badge"
                    style={{
                      background: `color-mix(in srgb, ${aiRecColor(selected.aiRecommend)} 16%, transparent)`,
                      color: aiRecColor(selected.aiRecommend),
                      fontSize: 13,
                      fontWeight: 700,
                      padding: '5px 10px',
                    }}
                  >
                    {selected.aiRecommend}
                  </span>
                  <span className="t-small text-3">
                    基于内容再分析 · 语义相似度核验 · 策略库比对
                  </span>
                </div>
              </div>

              {/* 已裁决留痕 */}
              {effectiveStatus(selected) !== '待复核' && (
                <div
                  className="card"
                  style={{
                    padding: '12px 14px',
                    background: 'var(--surface-2)',
                    borderColor: 'var(--hairline-strong)',
                  }}
                >
                  <div className="row gap-2" style={{ marginBottom: 6 }}>
                    <FileCheck size={13} style={{ color: 'var(--success)' }} />
                    <span className="label">裁决留痕</span>
                  </div>
                  <div className="col gap-2">
                    <div className="row gap-2 t-small">
                      <span className="text-3">裁决人</span>
                      <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                        {effectiveReviewer(selected)}
                      </span>
                      <StatusBadge
                        status={effectiveStatus(selected)}
                        tone={appealTone(effectiveStatus(selected))}
                      />
                    </div>
                    {effectiveDecision(selected) && (
                      <p
                        style={{
                          fontSize: 13,
                          color: 'var(--text-2)',
                          lineHeight: 1.65,
                          margin: 0,
                          borderLeft: '2px solid var(--hairline-strong)',
                          paddingLeft: 10,
                        }}
                      >
                        {effectiveDecision(selected)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Scale size={40} />}
              title="请从左侧选择申诉工单"
              desc="点击申诉队列中的条目开始复核"
            />
          )}
        </Panel>

        {/* ── 右：裁决面板 ─────────────────────────────────────────────────── */}
        <Panel
          title="裁决面板"
          icon={<Scale size={13} />}
          style={{ minHeight: 580 }}
        >
          {selected ? (
            <div className="col gap-4" style={{ height: '100%' }}>
              {/* SLA 倒计时 */}
              <div className="card" style={{ padding: '12px 14px' }}>
                <div className="row spread">
                  <span className="label">SLA 剩余</span>
                  <SlaCountdown hrsLeft={selected.slaHoursLeft} />
                </div>
                <div
                  style={{
                    marginTop: 8,
                    height: 4,
                    borderRadius: 2,
                    background: 'var(--surface-3)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(0, Math.min(100, (selected.slaHoursLeft / 48) * 100))}%`,
                      background: slaColor(selected.slaHoursLeft),
                      borderRadius: 2,
                      transition: 'width 0.6s var(--ease)',
                    }}
                  />
                </div>
                <div className="t-small text-3" style={{ marginTop: 5 }}>
                  申诉于 {selected.submittedAt} · 总时限 48h · 超时违规
                </div>
              </div>

              {/* 裁决动作 */}
              {effectiveStatus(selected) === '待复核' ? (
                <>
                  <div>
                    <div className="label" style={{ marginBottom: 10 }}>
                      执行裁决
                    </div>
                    <div className="col gap-2">
                      <VerdictBtn
                        icon={<CheckCircle2 size={15} />}
                        label="维持原判"
                        desc={`保持${DISPOSITION_LABEL[selected.original]}，申诉不成立`}
                        color="var(--danger)"
                        onClick={() => decide('维持原判')}
                      />
                      <VerdictBtn
                        icon={<RotateCcw size={15} />}
                        label="撤销恢复"
                        desc="内容符合规范，撤销处置恢复可见性"
                        color="var(--success)"
                        onClick={() => decide('撤销恢复')}
                      />
                      <VerdictBtn
                        icon={<SlidersHorizontal size={15} />}
                        label="部分调整"
                        desc="调整处置力度，如降级限流或补充标识"
                        color="var(--warning)"
                        onClick={() => decide('部分调整')}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="label" style={{ marginBottom: 8 }}>裁决备注</div>
                    <textarea
                      className="input"
                      rows={4}
                      placeholder="输入复核依据与裁决理由（将随留痕记录存档）…"
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      style={{ resize: 'vertical', fontSize: 13 }}
                    />
                  </div>
                </>
              ) : (
                <div
                  className="card"
                  style={{
                    padding: '14px 14px',
                    background: 'var(--surface-2)',
                    textAlign: 'center',
                  }}
                >
                  <CheckCircle2
                    size={26}
                    style={{ color: 'var(--success)', margin: '0 auto 8px' }}
                  />
                  <div
                    className="t-h3"
                    style={{ color: 'var(--text-1)', marginBottom: 4 }}
                  >
                    已裁决
                  </div>
                  <StatusBadge
                    status={effectiveStatus(selected)}
                    tone={appealTone(effectiveStatus(selected))}
                  />
                </div>
              )}

              {/* 申诉统计 Chart */}
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 8 }}>本批次申诉处置分布</div>
                <Chart
                  height={160}
                  build={() => {
                    const statuses: AppealStatus[] = ['待复核', '撤销恢复', '维持原判', '部分调整'];
                    const counts = statuses.map(
                      s => sorted.filter(a => effectiveStatus(a) === s).length,
                    );
                    const colors = [accent(), sem('pass'), sem('block'), sem('review')];
                    return {
                      ...baseOption(),
                      backgroundColor: 'transparent',
                      tooltip: {
                        ...(baseOption().tooltip as object),
                        trigger: 'item',
                        formatter: '{b}: {c} 件',
                      },
                      series: [{
                        type: 'pie',
                        radius: ['42%', '70%'],
                        center: ['50%', '50%'],
                        data: statuses.map((s, i) => ({
                          name: s,
                          value: counts[i],
                          itemStyle: { color: colors[i], borderRadius: 4 },
                        })).filter(d => d.value > 0),
                        label: { show: true, fontSize: 11, color: 'var(--text-2)' },
                        ...DRAW,
                      }],
                    };
                  }}
                  deps={[JSON.stringify(decisions)]}
                />
              </div>

              {/* 复核记录时间轴 */}
              <div>
                <div className="label" style={{ marginBottom: 8 }}>留痕时间线</div>
                <div className="col gap-2">
                  {sorted
                    .filter(a => effectiveStatus(a) !== '待复核')
                    .slice(0, 3)
                    .map(a => (
                      <Fragment key={a.id}>
                        <div
                          className="card"
                          style={{ padding: '9px 11px', cursor: 'pointer' }}
                          onClick={() => setSelId(a.id)}
                        >
                          <div className="row spread">
                            <span className="mono" style={{ fontSize: 11, color: 'var(--gold)' }}>
                              {a.id}
                            </span>
                            <StatusBadge
                              status={effectiveStatus(a)}
                              tone={appealTone(effectiveStatus(a))}
                            />
                          </div>
                          <div className="t-small text-3" style={{ marginTop: 3 }}>
                            <User size={9} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            {effectiveReviewer(a) ?? '待复核'} · {a.category}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                  {sorted.filter(a => effectiveStatus(a) !== '待复核').length === 0 && (
                    <div className="t-small text-3" style={{ textAlign: 'center', padding: '12px 0' }}>
                      暂无已裁决记录
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Scale size={36} />}
              title="选择申诉开始裁决"
              desc="从左侧队列选中一条申诉"
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

// ─── 裁决按钮 ─────────────────────────────────────────────────────────────────
function VerdictBtn({
  icon, label, desc, color, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      className="row gap-3"
      onClick={onClick}
      style={{
        alignItems: 'flex-start',
        padding: '11px 13px',
        borderRadius: 'var(--r-md)',
        cursor: 'pointer',
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        color,
        transition: 'all var(--dur-micro) var(--ease)',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <span style={{ marginTop: 1 }}>{icon}</span>
      <div className="col gap-1" style={{ flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>{desc}</span>
      </div>
    </button>
  );
}
