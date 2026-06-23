import { useMemo, useState } from 'react';
import {
  ScrollText, ShieldX, Fingerprint, Gavel, FileSearch, Sparkles,
  Layers, Cpu, Timer, GitBranch, ArrowUpRight, ArrowDownRight, Info,
} from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel, DecisionBadge, ScorePill } from '../components/sig';
import { toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { fmt } from '../lib/hooks';
import type { ShapFeature } from '../types';

// ════════════════════════════════════════════════════════════════════════
// 模型可解释性面板（SHAP · EU AI Act 审计）· 页面专属 mock · 全脱敏
// 合规审计硬通货：每笔被拦截决策都能给出自然语言归因 + SHAP 双向贡献 +
// 可追溯审计指纹（策略版本 / 模型版本 / 决策时延）。
// ════════════════════════════════════════════════════════════════════════

// ─── 被拦截决策（左侧列表 · 点选切换右侧解释）─────────────────────────────
interface BlockedDecision {
  id: string;
  kind: '交易' | '信用贷' | '账户';
  subject: string;          // 脱敏主体
  amount: number;
  channel: string;
  time: string;
  score: number;            // 0-1 欺诈分
  modelVer: string;
  strategyVer: string;
  latencyMs: number;
  summary: string;          // 自然语言归因
  shap: ShapFeature[];      // SHAP 特征贡献（+ 推高风险 / - 降低风险）
}

const DECISIONS: BlockedDecision[] = [
  {
    id: 'DEC-20260620-08841',
    kind: '交易',
    subject: '小云 · 用户 u_8c41·6204',
    amount: 18600,
    channel: '快捷支付 · 收款人首现',
    time: '2026-06-20 03:17:42',
    score: 0.94,
    modelVer: 'fraud-xgb-0612',
    strategyVer: 'strategy-v2.3',
    latencyMs: 23,
    summary:
      '本笔交易被拦截主因：设备指纹突变（贡献 +0.32）、夜间交易（+0.18）、收款人首现（+0.15）；常用设备登录（−0.20）未能抵消上述风险，综合欺诈分 0.94 触发 strategy-v2.3「设备突变 + 夜间大额」硬拦截规则。',
    shap: [
      { feature: '设备指纹突变', value: 1, contribution: 0.32 },
      { feature: '夜间交易（02–05 时）', value: 1, contribution: 0.18 },
      { feature: '收款人首次出现', value: 1, contribution: 0.15 },
      { feature: '近 1h 交易频次', value: 4, contribution: 0.11 },
      { feature: '金额偏离基线', value: 2.3, contribution: 0.09 },
      { feature: '历史无逾期', value: 1, contribution: -0.07 },
      { feature: '实名认证完备', value: 1, contribution: -0.12 },
      { feature: '常用设备登录', value: 0, contribution: -0.20 },
    ],
  },
  {
    id: 'DEC-20260620-08827',
    kind: '信用贷',
    subject: '小云 · 申请 a_3f90·1187',
    amount: 50000,
    channel: '信用贷在线申请',
    time: '2026-06-20 02:54:11',
    score: 0.81,
    modelVer: 'credit-scorecard-v3.4',
    strategyVer: 'strategy-v2.3',
    latencyMs: 41,
    summary:
      '本笔信用贷申请被拒主因：多头借贷（贡献 +0.29）、近 30 天征信硬查询 6 次（+0.21）、收入流水不稳定（+0.14）；公积金连缴 36 月（−0.16）部分缓释，但综合风险分仍达 0.81，落入 E 档（建议拒绝），转人工复核。',
    shap: [
      { feature: '多头借贷（在贷 5 家）', value: 5, contribution: 0.29 },
      { feature: '近 30 天硬查询次数', value: 6, contribution: 0.21 },
      { feature: '收入流水波动率', value: 0.47, contribution: 0.14 },
      { feature: '负债收入比 DTI', value: 0.68, contribution: 0.10 },
      { feature: '申请时段异常', value: 1, contribution: 0.06 },
      { feature: '实名手机在网时长', value: 84, contribution: -0.08 },
      { feature: '公积金连缴月数', value: 36, contribution: -0.16 },
    ],
  },
  {
    id: 'DEC-20260620-08793',
    kind: '账户',
    subject: '小云 · 账户 acc_b210·4471',
    amount: 0,
    channel: '账户接管疑似 · 登录态',
    time: '2026-06-20 01:38:05',
    score: 0.88,
    modelVer: 'app-takeover-lstm-v0.9',
    strategyVer: 'strategy-v2.3',
    latencyMs: 31,
    summary:
      '本次登录被判定账户接管（ATO）疑似主因：异地 IP 跳变（贡献 +0.27）、密码连续重置（+0.19）、新设备指纹（+0.17）；行为序列匹配历史本人（−0.18）部分抵消，综合分 0.88 触发二次活体核验拦截。',
    shap: [
      { feature: '异地 IP 跳变（粤→京）', value: 1, contribution: 0.27 },
      { feature: '24h 内密码重置次数', value: 2, contribution: 0.19 },
      { feature: '新设备指纹', value: 1, contribution: 0.17 },
      { feature: '改绑手机号', value: 1, contribution: 0.13 },
      { feature: '登录时段异常', value: 1, contribution: 0.05 },
      { feature: '常用 WiFi 环境', value: 0, contribution: -0.09 },
      { feature: '行为序列匹配本人', value: 0.62, contribution: -0.18 },
    ],
  },
];

// ─── 全局特征重要度（模型层面 top 特征 · 横向条形）──────────────────────────
const GLOBAL_IMPORTANCE: { feature: string; importance: number }[] = [
  { feature: '设备指纹突变', importance: 0.241 },
  { feature: '多头借贷度', importance: 0.198 },
  { feature: '夜间交易占比', importance: 0.163 },
  { feature: '征信硬查询频次', importance: 0.142 },
  { feature: '收款人首现', importance: 0.118 },
  { feature: '异地 IP 跳变', importance: 0.097 },
  { feature: '金额偏离基线', importance: 0.081 },
  { feature: '负债收入比 DTI', importance: 0.064 },
];

const READINESS = 0.96;        // EU AI Act 高风险 AI 审计就绪度
const KIND_ICON: Record<BlockedDecision['kind'], React.ReactNode> = {
  交易: <ShieldX size={13} />, 信用贷: <FileSearch size={13} />, 账户: <GitBranch size={13} />,
};

export default function Explainability() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('explain:read');   // 页面级访问由 Layout 拦截，此处用于导出动作分权
  const [selId, setSelId] = useState(DECISIONS[0].id);
  const sel = useMemo(() => DECISIONS.find(d => d.id === selId) ?? DECISIONS[0], [selId]);

  // SHAP 排序：贡献绝对值降序（最强归因在上）
  const shapSorted = useMemo(
    () => [...sel.shap].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
    [sel],
  );
  const baseRisk = useMemo(
    () => sel.score - sel.shap.reduce((s, f) => s + f.contribution, 0),
    [sel],
  );

  // ───── ⑬ SHAP 特征贡献度 双向条形（正贡献红/推高、负贡献绿/降低，零线居中）─────
  const shapDivergeBar = () => {
    const pos = cssVar('--danger');
    const neg = cssVar('--success');
    // y 轴自下而上排列 → reverse 使最强归因落在顶部
    const cats = [...shapSorted].reverse();
    return {
      ...baseOption(),
      tooltip: {
        ...(baseOption().tooltip as object), trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`,
      },
      grid: { left: 8, right: 56, top: 14, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value', ...axisStyle(),
        splitNumber: 4,
        axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${v > 0 ? '+' : ''}${v}` },
      },
      yAxis: {
        type: 'category', data: cats.map(f => f.feature), ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, color: cssVar('--text-2'), fontSize: 11.5 },
        axisLine: { show: false }, splitLine: { show: false },
      },
      series: [{
        type: 'bar',
        data: cats.map(f => ({
          value: f.contribution,
          itemStyle: {
            color: f.contribution >= 0 ? pos : neg,
            borderRadius: f.contribution >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3],
          },
        })),
        barWidth: '58%',
        label: {
          show: true, position: 'right',
          formatter: (p: { value: number }) => `${p.value > 0 ? '+' : ''}${p.value.toFixed(2)}`,
          color: cssVar('--text-3'), fontSize: 10.5,
          fontFamily: "'Geist Mono','Geist',sans-serif",
        },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: cssVar('--hairline-strong'), type: 'solid', width: 1 },
          data: [{ xAxis: 0 }], label: { show: false },
        },
        animationDuration: 700, animationDelay: (i: number) => i * 45,
      }],
    };
  };

  // ───── ⑭ 全局特征重要度（横向条形 · 模型层面 top 特征 · 品牌金）─────
  const globalImportanceBar = () => {
    const cats = [...GLOBAL_IMPORTANCE].reverse();
    return {
      ...baseOption(),
      tooltip: {
        ...(baseOption().tooltip as object), trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: number) => v.toFixed(3),
      },
      grid: { left: 8, right: 44, top: 14, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value', ...axisStyle(), max: 0.26, splitNumber: 4,
        axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => v.toFixed(2) },
      },
      yAxis: {
        type: 'category', data: cats.map(f => f.feature), ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, color: cssVar('--text-2'), fontSize: 11.5 },
        axisLine: { show: false }, splitLine: { show: false },
      },
      series: [{
        type: 'bar',
        data: cats.map(f => f.importance),
        barWidth: '56%',
        itemStyle: { color: cssVar('--gold'), borderRadius: [0, 3, 3, 0] },
        label: {
          show: true, position: 'right',
          formatter: (p: { value: number }) => p.value.toFixed(3),
          color: cssVar('--text-3'), fontSize: 10.5,
          fontFamily: "'Geist Mono','Geist',sans-serif",
        },
        animationDuration: 700, animationDelay: (i: number) => i * 45,
      }],
    };
  };

  return (
    <div className="page page-wide">
      <PageHeader
        title="模型可解释性面板"
        subtitle="SHAP 特征贡献归因 · 决策审计指纹 · EU AI Act 高风险 AI 可解释性义务"
      />

      {/* ── 顶部合规水位条：EU AI Act 高风险 AI 审计就绪度 ── */}
      <div
        className="reveal"
        style={{
          display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
          padding: '14px 18px', marginBottom: 16,
          background: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderLeft: '3px solid var(--gold)',
          borderRadius: 'var(--r-md, 12px)',
          boxShadow: 'var(--elev-1)',
        }}
      >
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'color-mix(in srgb, var(--gold) 14%, transparent)',
            color: 'var(--gold)',
          }}
        >
          <Gavel size={19} />
        </span>
        <div style={{ flex: '1 1 360px', minWidth: 280 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.45 }}>
            EU AI Act 高风险 AI（信用评分 / AML 反洗钱）审计就绪度
          </div>
          <div className="t-small text-3" style={{ marginTop: 3 }}>
            2026-08-02 强制生效 · 高风险 AI 须具备可解释性与可追溯性 · 违规最高罚至全球年营收 <span className="mononum">7%</span>
          </div>
        </div>
        <div style={{ flex: '2 1 320px', minWidth: 260 }}>
          <div className="spread" style={{ marginBottom: 6 }}>
            <span className="label">就绪度</span>
            <span className="mononum" style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)', letterSpacing: '-0.02em' }}>
              {(READINESS * 100).toFixed(0)}%
            </span>
          </div>
          <div
            style={{
              height: 8, borderRadius: 999, overflow: 'hidden',
              background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
            }}
          >
            <div
              style={{
                height: '100%', width: `${READINESS * 100}%`, borderRadius: 999,
                background: 'linear-gradient(90deg, var(--bronze), var(--gold) 60%, var(--gold-bright))',
                transition: 'width var(--dur-enter, .32s) var(--ease, ease)',
              }}
            />
          </div>
          <div className="t-small text-3" style={{ marginTop: 6 }}>
            可追溯决策 <span className="mononum" style={{ color: 'var(--text-2)' }}>2.84M</span> 笔 ·
            待补充人工复核记录 <span className="mononum" style={{ color: 'var(--warning)' }}>3</span> 项
          </div>
        </div>
      </div>

      {/* ── 主体：左 决策列表 · 右 SHAP 解释 + 审计指纹 ── */}
      <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 14, alignItems: 'start' }}>

        {/* 左：被拦截决策列表（点选切换） */}
        <Panel title="被拦截决策" icon={<ScrollText size={14} />} bodyClass="panel-body-0"
          right={<span className="t-small text-3 mononum">{DECISIONS.length} 笔待解释</span>}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {DECISIONS.map((d, i) => {
              const active = d.id === selId;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelId(d.id)}
                  className="reveal"
                  style={{
                    textAlign: 'left', cursor: 'pointer', width: '100%',
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--hairline)',
                    borderLeft: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
                    background: active ? 'var(--surface-2)' : 'transparent',
                    animationDelay: `${i * 40}ms`,
                    transition: 'background var(--dur-base, .2s) var(--ease, ease)',
                  }}
                >
                  <div className="spread" style={{ marginBottom: 6 }}>
                    <span className="row gap-2" style={{ alignItems: 'center', color: 'var(--text-2)', fontSize: 11.5, fontWeight: 600 }}>
                      {KIND_ICON[d.kind]}{d.kind}
                    </span>
                    <ScorePill score={d.score} />
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: active ? 'var(--text-1)' : 'var(--text-2)', fontWeight: 600, letterSpacing: '0.01em' }}>
                    {d.id}
                  </div>
                  <div className="t-small text-3" style={{ marginTop: 4 }}>{d.channel}</div>
                  <div className="spread" style={{ marginTop: 7 }}>
                    <span className="t-small text-3 mononum">{d.time.slice(11)}</span>
                    {d.amount > 0
                      ? <span className="mononum" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>¥{fmt(d.amount)}</span>
                      : <span className="t-small text-3">登录态</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* 右：SHAP 解释 + 审计指纹 + 双图 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 决策归因摘要 + 审计指纹卡 */}
          <Panel
            title="决策归因解释"
            icon={<Sparkles size={14} />}
            right={<DecisionBadge decision="block" />}
          >
            <div className="row gap-3" style={{ alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 10 }}>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{sel.id}</span>
              <span className="t-small text-3">{sel.subject}</span>
            </div>

            {/* 自然语言归因（合规可读） */}
            <p style={{ fontSize: 13.5, lineHeight: 1.72, color: 'var(--text-1)', margin: 0 }}>
              {sel.summary}
            </p>

            {/* 风险分构成：基线 → 综合分 */}
            <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              <span className="t-small text-3 row gap-1" style={{ alignItems: 'center' }}>
                <Info size={12} />基线分
                <span className="mononum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{baseRisk.toFixed(2)}</span>
              </span>
              <span className="t-small" style={{ color: 'var(--danger)' }} >
                <ArrowUpRight size={12} style={{ verticalAlign: '-1px' }} /> 正贡献推高
              </span>
              <span className="t-small" style={{ color: 'var(--success)' }}>
                <ArrowDownRight size={12} style={{ verticalAlign: '-1px' }} /> 负贡献缓释
              </span>
              <span className="row gap-1" style={{ alignItems: 'baseline', marginLeft: 'auto' }}>
                <span className="t-small text-3">综合欺诈分</span>
                <span className="mononum" style={{ fontSize: 17, fontWeight: 700, color: 'var(--danger)', letterSpacing: '-0.02em' }}>
                  {sel.score.toFixed(2)}
                </span>
              </span>
            </div>

            <hr className="divider" style={{ margin: '14px 0' }} />

            {/* 审计指纹卡：策略版本 / 模型版本 / 决策时延 */}
            <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 10 }}>
              <Fingerprint size={14} style={{ color: 'var(--gold)' }} />
              <span className="label">审计指纹 · 决策可追溯</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { icon: <Layers size={13} />, label: '决策策略', value: sel.strategyVer, sub: 'IF 条件链版本' },
                { icon: <Cpu size={13} />, label: '评分模型', value: sel.modelVer, sub: '训练快照已留痕' },
                { icon: <Timer size={13} />, label: '决策时延', value: `${sel.latencyMs}ms`, sub: '实时链路 P99 内' },
              ].map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: '11px 13px', borderRadius: 10,
                    background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                  }}
                >
                  <div className="row gap-2" style={{ alignItems: 'center', color: 'var(--text-3)', marginBottom: 7 }}>
                    {f.icon}<span className="label" style={{ color: 'var(--text-3)' }}>{f.label}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '0.01em' }}>
                    {f.value}
                  </div>
                  <div className="t-small text-3" style={{ marginTop: 3 }}>{f.sub}</div>
                </div>
              ))}
            </div>

            <div className="row gap-2" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-subtle btn-sm"
                disabled={!canRead}
                onClick={() => toast(`已生成可解释性审计报告 · ${sel.id} · 含 SHAP 归因 + 决策指纹`, 'success')}
              >
                <FileSearch size={13} />导出审计报告
              </button>
            </div>
          </Panel>

          {/* 双图：⑬ SHAP 双向条形 · ⑭ 全局特征重要度 */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Panel
              title="SHAP 特征贡献度"
              icon={<GitBranch size={14} />}
              right={<span className="t-small text-3">本笔决策 · 红推高 / 绿缓释</span>}
            >
              <Chart build={shapDivergeBar} height={300} deps={[selId]} />
            </Panel>

            <Panel
              title="全局特征重要度"
              icon={<Layers size={14} />}
              right={<span className="t-small text-3">模型层面 Top 特征</span>}
            >
              <Chart build={globalImportanceBar} height={300} deps={[]} />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
