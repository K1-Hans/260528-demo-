import { useState } from 'react';
import {
  GitBranch, GitCommitHorizontal, Plus, Minus, Equal, RotateCcw,
  ShieldCheck, ShieldAlert, TrendingDown, DollarSign, Activity,
  ArrowRightLeft, CircleCheck, Lock, FileCode2,
} from 'lucide-react';
import { PageHeader, Card, SectionTitle } from '../components/ui';
import { StatusBadge, Modal, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cost, sem, areaGradient, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { PROMPT_VERSIONS, PROMPT_DIFF, VERSION_METRICS, appName } from '../lib/mockData';
import type { PromptVersion, DiffLine, PromptStatus } from '../types';

// status → 语义 tone（prod=活着绿 · canary=灰度金黄 · archived=灰）
const STATUS_TONE: Record<PromptStatus, 'good' | 'warn' | 'cost' | 'muted'> = {
  prod: 'good', canary: 'warn', archived: 'muted', draft: 'muted',
};
const STATUS_LABEL: Record<PromptStatus, string> = {
  prod: '生产', canary: '灰度', archived: '归档', draft: '草稿',
};

export default function Prompts() {
  const { hasPermission } = useAuth();
  const versions = PROMPT_VERSIONS;                 // v4→v1（已倒序）
  const prod = versions.find(v => v.status === 'prod');
  const canary = versions.find(v => v.status === 'canary');

  // 选两版对比：base = 旧（左 / 红删基准）· target = 新（右 / 绿增）。默认 v3(base) ↔ v4(target)
  const [baseId, setBaseId] = useState(prod?.id ?? versions[1]?.id);
  const [targetId, setTargetId] = useState(canary?.id ?? versions[0]?.id);
  const baseV = versions.find(v => v.id === baseId)!;
  const targetV = versions.find(v => v.id === targetId)!;

  // 回滚灰度切流状态机
  const [approveOpen, setApproveOpen] = useState(false);
  const [rolledBack, setRolledBack] = useState(false);
  // 双段灰度条：v4 占比（金）随动画 20→0；v3 隐含补满
  const [canaryShare, setCanaryShare] = useState(canary?.canaryPct ?? 20);

  const canApprove = hasPermission('prompt:approve');
  const isStoryPair = baseV.version === 'v3' && targetV.version === 'v4';

  // 点选版本做对比：维持「一新一旧」两选；点已选则忽略，点新版本替换 target，旧则替换 base
  function pickVersion(v: PromptVersion) {
    if (v.id === baseId || v.id === targetId) return;
    const order = versions.map(x => x.id);
    // 较新者（数组靠前）当 target，较旧者当 base
    if (order.indexOf(v.id) < order.indexOf(baseId)) setTargetId(v.id);
    else setBaseId(v.id);
  }

  function confirmRollback() {
    setApproveOpen(false);
    // 触发灰度切流动画：v4 20% → 0%（ProgressBar transition 平滑滑动）
    requestAnimationFrame(() => setCanaryShare(0));
    setRolledBack(true);
    toast(`已回滚到 ${baseV.version} · canary 已下线`, 'success');
  }

  return (
    <div className="page">
      <PageHeader
        title="Prompt 版本库 · diff · 回滚"
        subtitle={`${appName(prod?.app ?? 'svc-assistant')} · prompt 即代码 — 版本树 / 逐版 diff / 上线后指标 / 一键回滚（Owner 审批 + 灰度切流）`}
        actions={
          <div className="row gap-2 wrap">
            <span className="tag tag-mono"><ShieldCheck size={12} style={{ marginRight: 4, color: 'var(--success)' }} />prod={prod?.version}</span>
            <span className="tag tag-mono"><ArrowRightLeft size={12} style={{ marginRight: 4, color: 'var(--warning)' }} />canary={canary?.version} · 灰度 {canaryShare}%</span>
          </div>
        }
      />

      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: '0.92fr 1.42fr', gap: 14, alignItems: 'start' }}>
        {/* ══ 左列：版本树 ══ */}
        <Card className="reveal reveal-2 card-pad-0">
          <div style={{ padding: '16px 16px 0' }}>
            <SectionTitle right={<span className="t-small text-3 tnum">{versions.length} 个版本</span>}>
              <span className="row gap-2"><GitBranch size={13} /> 版本树 · 点选两版对比</span>
            </SectionTitle>
          </div>
          <div className="version-rail" style={{ padding: '4px 16px 16px' }}>
            {versions.map((v, i) => {
              const selected = v.id === baseId || v.id === targetId;
              const role = v.id === targetId ? 'target' : v.id === baseId ? 'base' : null;
              return (
                <button
                  key={v.id}
                  onClick={() => pickVersion(v)}
                  className="vnode reveal"
                  style={{
                    animationDelay: `${80 + i * 40}ms`,
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: selected ? 'var(--surface-2)' : 'transparent',
                    border: '1px solid', borderColor: selected ? 'var(--hairline-strong)' : 'var(--hairline)',
                    borderRadius: 'var(--r-md)', padding: '12px 13px', position: 'relative',
                    boxShadow: selected ? 'var(--elev-1)' : 'none',
                    transition: 'border-color .2s var(--ease), background .2s var(--ease)',
                  }}
                >
                  {/* 时间线节点 + 连线 */}
                  <span style={{
                    position: 'absolute', left: -16, top: 16, width: 9, height: 9, borderRadius: '50%',
                    background: v.status === 'prod' ? 'var(--success)' : v.status === 'canary' ? 'var(--warning)' : 'var(--text-3)',
                    boxShadow: v.status === 'prod' ? '0 0 0 3px color-mix(in srgb, var(--success) 18%, transparent)' : 'none',
                  }} />
                  <div className="spread" style={{ marginBottom: 6 }}>
                    <span className="row gap-2">
                      <span className="mononum" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>{v.version}</span>
                      <StatusBadge status={STATUS_LABEL[v.status]} tone={STATUS_TONE[v.status]} />
                      {v.status === 'canary' && v.canaryPct != null && (
                        <span className="tag tag-mono" style={{ color: 'var(--cost)', borderColor: 'color-mix(in srgb, var(--cost) 30%, transparent)' }}>灰度 {v.canaryPct}%</span>
                      )}
                    </span>
                    {role && (
                      <span className="badge" style={{
                        background: role === 'target' ? 'color-mix(in srgb, var(--success) 16%, transparent)' : 'color-mix(in srgb, var(--c2) 16%, transparent)',
                        color: role === 'target' ? 'var(--success)' : 'var(--c2)',
                      }}>{role === 'target' ? '对比·新' : '对比·旧'}</span>
                    )}
                  </div>
                  <div className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 7 }}>{v.message}</div>
                  <div className="row gap-2 wrap" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    <span className="row gap-1"><GitCommitHorizontal size={11} /> {v.author}</span>
                    <span className="tag-mono">{v.at}</span>
                    <span className="mononum" style={{ marginLeft: 'auto', color: v.status === 'canary' ? 'var(--danger)' : 'var(--text-2)' }}>评分 {v.score.toFixed(3)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ══ 右列：diff + 指标 + 回滚 + 趋势 ══ */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {/* ── 上线后指标卡（选中两版对照）── */}
          <Card className="reveal reveal-2">
            <SectionTitle right={<span className="tag tag-mono"><ArrowRightLeft size={12} style={{ marginRight: 4 }} />{baseV.version} → {targetV.version}</span>}>
              <span className="row gap-2"><Activity size={13} /> 上线后指标 · 逐版对照</span>
            </SectionTitle>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <MetricCompare icon={<CircleCheck size={13} />} label="综合评分" base={baseV.score} target={targetV.score} digits={3} betterWhenHigher />
              <MetricCompare icon={<DollarSign size={13} />} label="成本 / 千次" base={baseV.costPer1k} target={targetV.costPer1k} digits={2} prefix="$" accentTarget="var(--cost)" />
              <MetricCompare icon={<ShieldAlert size={13} />} label="错误率" base={baseV.errRate} target={targetV.errRate} digits={1} suffix="%" />
            </div>
            {isStoryPair && (
              <div className="row gap-2" style={{ marginTop: 12, padding: '9px 11px', borderRadius: 8, background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 22%, transparent)' }}>
                <TrendingDown size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <span className="t-small" style={{ color: 'var(--text-2)' }}>
                  v4 砍了忠实度约束 few-shot，单次 token 是省了，却被忠实度 guard 判失败触发<b style={{ color: 'var(--text-1)' }}>重试</b> — 成本/千次 <b className="mononum" style={{ color: 'var(--cost)' }}>$0.74 → $0.92</b>，评分反降。省 token ≠ 省钱。
                </span>
              </div>
            )}
          </Card>

          {/* ── 并排 diff ── */}
          <Card className="reveal reveal-3 card-pad-0">
            <div style={{ padding: '16px 18px 0' }}>
              <SectionTitle
                right={
                  <span className="row gap-3" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    <span className="row gap-1"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'color-mix(in srgb, var(--danger) 24%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 50%, transparent)' }} /> 删除</span>
                    <span className="row gap-1"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'color-mix(in srgb, var(--success) 22%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 48%, transparent)' }} /> 新增</span>
                  </span>
                }
              >
                <span className="row gap-2"><FileCode2 size={13} /> 系统提示词 diff · <span className="tag-mono text-3">{baseV.version}</span> → <span className="tag-mono" style={{ color: 'var(--cost)' }}>{targetV.version}</span></span>
              </SectionTitle>
            </div>
            <div className="diffbox" style={{ padding: '4px 0 6px' }}>
              {PROMPT_DIFF.map((line, i) => <DiffRow key={i} line={line} num={i + 1} />)}
            </div>
            <div className="t-small text-3" style={{ padding: '0 18px 16px' }}>
              坐实回归来源：v4 删除「忠实度约束 few-shot」+ 移除引用要求，改严格 JSON 输出 — 模型不再被强制引用检索内容。
            </div>
          </Card>

          {/* ── 回滚动作区 ── */}
          <Card className={`reveal reveal-4 ${rolledBack ? 'rb-ok' : ''}`} style={rolledBack ? { borderColor: 'color-mix(in srgb, var(--success) 36%, transparent)' } : undefined}>
            <SectionTitle right={!canApprove ? <span className="row gap-1 t-small" style={{ color: 'var(--text-3)' }}><Lock size={12} /> 需平台负责人审批</span> : undefined}>
              <span className="row gap-2"><RotateCcw size={13} /> 灰度切流 · 回滚控制</span>
            </SectionTitle>

            {/* 双段灰度条：prod（绿）/ canary（金）实时占比 */}
            <div className="spread" style={{ marginBottom: 7 }}>
              <span className="t-small text-2">流量分配</span>
              <span className="mononum t-small">
                <span style={{ color: 'var(--success)' }}>{prod?.version} {100 - canaryShare}%</span>
                <span className="text-3"> · </span>
                <span style={{ color: canaryShare === 0 ? 'var(--text-3)' : 'var(--cost)' }}>{canary?.version} {canaryShare}%</span>
              </span>
            </div>
            <SplitBar canaryPct={canaryShare} />

            {!rolledBack ? (
              <>
                <div className="t-small text-3" style={{ margin: '12px 0 12px', lineHeight: 1.5 }}>
                  回滚将把 <b className="mononum" style={{ color: 'var(--cost)' }}>{canary?.version} 灰度 {canary?.canaryPct}%</b> 下线，<b className="mononum" style={{ color: 'var(--success)' }}>{prod?.version}</b> 接管 100% 流量。属高危操作，需 Owner 双签审批。
                </div>
                <button
                  className="btn btn-danger"
                  disabled={!canApprove}
                  onClick={() => setApproveOpen(true)}
                  style={{ width: '100%', justifyContent: 'center', opacity: canApprove ? 1 : 0.5, cursor: canApprove ? 'pointer' : 'not-allowed' }}
                >
                  <RotateCcw size={14} /> 回滚到 {prod?.version}
                  {!canApprove && <Lock size={13} style={{ marginLeft: 4 }} />}
                </button>
              </>
            ) : (
              <div className="row gap-2" style={{ marginTop: 12, padding: '11px 13px', borderRadius: 9, background: 'color-mix(in srgb, var(--success) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 26%, transparent)' }}>
                <CircleCheck size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span className="t-small" style={{ color: 'var(--text-2)' }}>
                  已回滚到 <b className="mononum" style={{ color: 'var(--success)' }}>{prod?.version}</b> · canary 已下线。错误率回落中 · 成本/千次 <b className="mononum" style={{ color: 'var(--text-1)' }}>$0.92 → $0.74</b>。
                </span>
              </div>
            )}
          </Card>

          {/* ── 上线后指标趋势（真 ECharts · 评分 emerald + 成本金 双轴 · 回归红点）── */}
          <Card className="reveal reveal-5">
            <SectionTitle right={<span className="row gap-3" style={{ fontSize: 11 }}>
              <span className="row gap-1" style={{ color: 'var(--success)' }}><span style={{ width: 12, height: 2, borderRadius: 1, background: 'var(--gold)' }} /> 综合评分</span>
              <span className="row gap-1" style={{ color: 'var(--cost)' }}><span style={{ width: 12, height: 2, borderRadius: 1, background: 'var(--cost)' }} /> 成本/千次</span>
            </span>}>
              <span className="row gap-2"><Activity size={13} /> 上线后指标趋势 · v3 段 → v4 段</span>
            </SectionTitle>
            <Chart height={228} build={() => versionTrendOption()} />
            <div className="t-small text-3" style={{ marginTop: 6 }}>
              切到 v4（金色区）后评分掉头向下、成本/千次抬升，三个红点为忠实度回归命中。
            </div>
          </Card>
        </div>
      </div>

      {/* ══ Owner 审批 Modal ══ */}
      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="回滚审批 · Owner 双签"
        sub="高危变更 — 确认后立即灰度切流，prod 接管全量"
        width={500}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setApproveOpen(false)}>取消</button>
            <button className="btn btn-danger" onClick={confirmRollback}><RotateCcw size={14} /> 确认回滚</button>
          </>
        }
      >
        <div className="col gap-3">
          {/* 回滚摘要 */}
          <div style={{ borderRadius: 10, border: '1px solid var(--hairline)', overflow: 'hidden' }}>
            <ApproveRow label="应用" value={appName(prod?.app ?? 'svc-assistant')} />
            <ApproveRow label="切流前" value={`${canary?.version} canary ${canary?.canaryPct}%  ·  ${prod?.version} ${100 - (canary?.canaryPct ?? 0)}%`} mono />
            <ApproveRow label="切流后" value={`${prod?.version} 100%  ·  ${canary?.version} 下线`} mono highlight />
            <ApproveRow label="触发原因" value="忠实度回归 −11%（v4 删约束 few-shot）" />
            <ApproveRow label="审批人" value="陆衡 · 平台负责人（Owner）" last />
          </div>
          {/* 影响预估 */}
          <div className="row gap-2" style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
            <ShieldCheck size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span className="t-small" style={{ color: 'var(--text-2)' }}>
              预期影响：忠实度回升至 <b className="mononum" style={{ color: 'var(--text-1)' }}>0.90</b> 基线 · 成本/千次回落 <b className="mononum" style={{ color: 'var(--text-1)' }}>$0.92 → $0.74</b> · 重试链路消除。
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── 指标对照小卡（旧 → 新，劣化标红）─────────────────────────────────────────
function MetricCompare({ icon, label, base, target, digits, prefix = '', suffix = '', betterWhenHigher = false, accentTarget }: {
  icon: React.ReactNode; label: string; base: number; target: number; digits: number;
  prefix?: string; suffix?: string; betterWhenHigher?: boolean; accentTarget?: string;
}) {
  const delta = target - base;
  // betterWhenHigher → 升好；否则（成本/错误率）→ 降好
  const worse = betterWhenHigher ? delta < 0 : delta > 0;
  const targetColor = delta === 0 ? 'var(--text-1)' : worse ? 'var(--danger)' : (accentTarget ?? 'var(--success)');
  const fmtV = (v: number) => `${prefix}${v.toFixed(digits)}${suffix}`;
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--surface-2)', padding: '11px 12px' }}>
      <div className="row gap-2" style={{ color: 'var(--text-3)', marginBottom: 8 }}>
        <span style={{ opacity: 0.85 }}>{icon}</span>
        <span className="label" style={{ letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
        <span className="mononum text-3" style={{ fontSize: 14 }}>{fmtV(base)}</span>
        <span className="text-3" style={{ fontSize: 12 }}>→</span>
        <span className="mononum" style={{ fontSize: 20, fontWeight: 700, color: targetColor, letterSpacing: '-0.02em' }}>{fmtV(target)}</span>
      </div>
      <div className="mononum" style={{ fontSize: 11, marginTop: 4, color: worse ? 'var(--danger)' : 'var(--text-3)' }}>
        {delta > 0 ? '+' : ''}{delta.toFixed(digits)}{suffix} vs 旧版
      </div>
    </div>
  );
}

// ── diff 单行（红删 / 绿增 / 中性）─────────────────────────────────────────────
function DiffRow({ line, num }: { line: DiffLine; num: number }) {
  const cfg = {
    del: { bg: 'color-mix(in srgb, var(--danger) 9%, transparent)', bar: 'var(--danger)', sign: <Minus size={12} />, signColor: 'var(--danger)', text: 'var(--text-2)' },
    add: { bg: 'color-mix(in srgb, var(--success) 10%, transparent)', bar: 'var(--success)', sign: <Plus size={12} />, signColor: 'var(--success)', text: 'var(--text-1)' },
    same: { bg: 'transparent', bar: 'transparent', sign: <Equal size={12} />, signColor: 'var(--text-3)', text: 'var(--text-3)' },
  }[line.op];
  return (
    <div
      className="row"
      style={{
        alignItems: 'flex-start', gap: 0, padding: '5px 18px 5px 0',
        background: cfg.bg, borderLeft: `2px solid ${cfg.bar}`,
        fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.5,
      }}
    >
      <span className="text-3" style={{ width: 38, textAlign: 'right', paddingRight: 10, flexShrink: 0, fontSize: 11, opacity: 0.6, userSelect: 'none' }}>{num}</span>
      <span style={{ width: 18, flexShrink: 0, color: cfg.signColor, display: 'inline-flex', justifyContent: 'center', paddingTop: 2 }}>{cfg.sign}</span>
      <span style={{ color: cfg.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minWidth: 0 }}>{line.text}</span>
    </div>
  );
}

// ── 双段灰度条（prod 绿 + canary 金，随回滚动画收缩）──────────────────────────
function SplitBar({ canaryPct }: { canaryPct: number }) {
  const prodPct = 100 - canaryPct;
  return (
    <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--hairline)' }}>
      <div style={{
        width: `${prodPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--bronze), var(--gold-bright))',
        transition: 'width 1.1s cubic-bezier(0.4, 0, 0.2, 1)',
      }} />
      <div style={{
        width: `${canaryPct}%`, height: '100%',
        background: canaryPct === 0 ? 'transparent' : 'repeating-linear-gradient(45deg, var(--cost), var(--cost) 6px, var(--cost-bright) 6px, var(--cost-bright) 12px)',
        transition: 'width 1.1s cubic-bezier(0.4, 0, 0.2, 1)',
      }} />
    </div>
  );
}

// ── 审批摘要行 ────────────────────────────────────────────────────────────────
function ApproveRow({ label, value, mono, highlight, last }: { label: string; value: string; mono?: boolean; highlight?: boolean; last?: boolean }) {
  return (
    <div className="spread" style={{ padding: '10px 13px', borderBottom: last ? 'none' : '1px solid var(--hairline)', background: highlight ? 'color-mix(in srgb, var(--success) 6%, transparent)' : 'transparent', gap: 14 }}>
      <span className="t-small text-3" style={{ flexShrink: 0 }}>{label}</span>
      <span className={`t-small ${mono ? 'mononum' : ''}`} style={{ color: highlight ? 'var(--success)' : 'var(--text-1)', fontWeight: highlight ? 600 : 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── ECharts：版本上线后指标趋势（双轴 · 评分 emerald / 成本 金 · v4 段着色 · 回归红点）──
function versionTrendOption() {
  const pts = VERSION_METRICS;
  const dates = pts.map(p => p.at);
  const v4Start = pts.findIndex(p => p.version === 'v4');
  const scoreData = pts.map(p => +p.score.toFixed(3));
  const costData = pts.map(p => +p.costPer1k.toFixed(2));
  const regressPts = pts
    .map((p, i) => (p.regress ? { coord: [i, +p.score.toFixed(3)], value: p.score.toFixed(3) } : null))
    .filter(Boolean) as { coord: [number, number]; value: string }[];

  return {
    ...baseOption(),
    legend: { show: false },
    grid: { left: 8, right: 8, top: 16, bottom: 22, containLabel: true },
    tooltip: {
      ...(baseOption().tooltip as object),
      trigger: 'axis',
      formatter: (ps: Array<{ axisValue: string; seriesName: string; value: number; dataIndex: number }>) => {
        const ver = pts[ps[0].dataIndex]?.version ?? '';
        const rows = ps.map(p => `${p.seriesName} <b>${p.seriesName.includes('成本') ? '$' : ''}${p.value}</b>`).join('<br/>');
        const reg = pts[ps[0].dataIndex]?.regress ? `<br/><span style="color:${cssVar('--danger')}">● 忠实度回归</span>` : '';
        return `${ps[0].axisValue} · <b>${ver}</b><br/>${rows}${reg}`;
      },
    },
    xAxis: {
      type: 'category', boundaryGap: false, data: dates,
      axisLabel: { ...axisStyle().axisLabel, interval: 1 },
      axisLine: axisStyle().axisLine, axisTick: { show: false }, splitLine: { show: false },
    },
    yAxis: [
      { type: 'value', ...axisStyle(), min: 0.84, max: 0.91, name: '评分', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => v.toFixed(2) } },
      { type: 'value', ...axisStyle(), splitLine: { show: false }, min: 0.6, max: 1.0, position: 'right', name: '$/千次', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => '$' + v.toFixed(2) } },
    ],
    series: [
      // v4 段背景着色（金色 markArea，坐实「切版后劣化」）
      {
        name: '评分', type: 'line', smooth: true, showSymbol: false, yAxisIndex: 0,
        data: scoreData, lineStyle: { color: accent(), width: 2 },
        areaStyle: { color: areaGradient(accent(), 0.16) },
        markArea: v4Start >= 0 ? {
          silent: true,
          itemStyle: { color: 'color-mix(in srgb, ' + cost() + ' 8%, transparent)' },
          data: [[{ xAxis: dates[v4Start] }, { xAxis: dates[dates.length - 1] }]],
        } : undefined,
        markPoint: {
          symbol: 'circle', symbolSize: 8,
          itemStyle: { color: sem('error'), borderColor: cssVar('--surface-1'), borderWidth: 2 },
          label: { show: false },
          data: regressPts,
        },
      },
      {
        name: '成本/千次', type: 'line', smooth: true, showSymbol: false, yAxisIndex: 1,
        data: costData, lineStyle: { color: cost(), width: 1.8, type: 'dashed' },
      },
    ],
    animationDuration: 850, animationEasing: 'cubicOut',
  };
}
