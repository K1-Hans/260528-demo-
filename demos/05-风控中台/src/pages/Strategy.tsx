import { useMemo, useState } from 'react';
import {
  Workflow, GitBranch, ShieldX, ShieldAlert, ShieldCheck, Rocket, Undo2,
  Cpu, Bot, Filter, Lock, GitCompareArrows, History, Layers, Boxes, FlaskConical,
} from 'lucide-react';
import { PageHeader, Segmented } from '../components/ui';
import { Panel, DecisionBadge, decVar } from '../components/sig';
import { toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar, accent, block as blockColor } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import type { Strategy, RolloutStage, Decision } from '../types';
import { DECISION_LABEL } from '../types';

// ════════════════════════════════════════════════════════════════════════
// 决策规则 / 策略编排器 · 「规则 + ML 评分 + agentic 调查」三层决策可视化编排
// point of view：策略治理（governance），不是堆 if-else。每条策略 = 版本化、
// 可灰度、可回滚的决策单元；命中即触发三层流水线，agent 层承接复杂可疑件。
// 🔒 脱敏：示例消费金融 / 小云 / 信用贷 / 坐席系统。消金术语保留。
// ════════════════════════════════════════════════════════════════════════

// 三层决策标签（规则层 / ML 层 / agent 层）——每个 IF 条件归属一层，体现编排而非平铺规则
type Layer = 'rule' | 'ml' | 'agent';
const LAYER_META: Record<Layer, { label: string; short: string; color: string; icon: React.ReactNode }> = {
  rule: { label: '规则层 · 确定性硬规则', short: '规则层', color: 'var(--info)', icon: <Filter size={11} /> },
  ml: { label: 'ML 层 · 风险评分模型', short: 'ML 层', color: 'var(--gold)', icon: <Cpu size={11} /> },
  agent: { label: 'agent 层 · 自主调查取证', short: 'agent 层', color: 'var(--emerald)', icon: <Bot size={11} /> },
};

// 每条规则按其字段判定归属层（评分类→ML，调查/取证类→agent，其余→规则）
function layerOf(cond: string): Layer {
  if (/评分|置信度|模型|概率/.test(cond)) return 'ml';
  if (/调查|核查|取证|链路|归集|对手方画像|关系网|资金链/.test(cond)) return 'agent';
  return 'rule';
}

const STATUS_TONE: Record<Strategy['status'], { color: string; bg: string }> = {
  生效中: { color: 'var(--success)', bg: 'var(--success-glow)' },
  灰度中: { color: 'var(--gold)', bg: 'var(--gold-glow)' },
  草稿: { color: 'var(--text-3)', bg: 'var(--surface-3)' },
  已下线: { color: 'var(--text-3)', bg: 'var(--surface-2)' },
};

// ─── mock：6 条策略（各带完整 IF 条件链 · 三层混合）─────────────────────────
const STRATEGIES: Strategy[] = [
  {
    id: 'STR-ATO-014', name: '账户接管实时拦截', scene: '登录 / 改绑 / 大额支用',
    version: 'v3.2', status: '生效中', rollout: 100, hitRate: 0.0186, blockRate: 0.742, action: 'block',
    owner: '策略管理员 · 小云', updatedAt: '2026-06-18 14:22',
    rules: [
      { cond: '设备指纹', op: '=', val: '陌生设备 + 首次出现' },
      { cond: '登录地与常用地', op: '偏移', val: '> 800km / 1h（不可能旅行）' },
      { cond: '行为序列模型评分', op: '>', val: '0.82' },
      { cond: '改绑后即发起支用', op: '=', val: '是（高危组合）' },
    ],
  },
  {
    id: 'STR-CASH-009', name: '套现团伙识别', scene: '信用贷支用 / 收单回流',
    version: 'v2.5', status: '灰度中', rollout: 50, hitRate: 0.0094, blockRate: 0.531, action: 'review',
    owner: '策略管理员 · 小云', updatedAt: '2026-06-19 10:05',
    rules: [
      { cond: '商户类目', op: '∈', val: '虚拟/无实物 高危 MCC' },
      { cond: '快进快出资金链核查', op: '=', val: '支用后 30min 内回流本人' },
      { cond: '关系网团伙置信度', op: '>', val: '0.76（同设备/同 IP 聚集）' },
      { cond: '套现模型评分', op: '>', val: '0.70' },
    ],
  },
  {
    id: 'STR-KYC-021', name: '新客准入风险分级', scene: '注册 / 授信申请',
    version: 'v4.1', status: '生效中', rollout: 100, hitRate: 0.2310, blockRate: 0.118, action: 'review',
    owner: '风险分析师 · 小云', updatedAt: '2026-06-17 09:40',
    rules: [
      { cond: '三要素 / 活体核验', op: '=', val: '通过' },
      { cond: '征信多头借贷', op: '>', val: '近 1 月 6 家机构查询' },
      { cond: '准入信用模型评分', op: '<', val: '0.45（拒）/ 0.45–0.65（复核）' },
      { cond: '名单比对', op: '=', val: '命中 → 转 agent 调查' },
    ],
  },
  {
    id: 'STR-PAY-006', name: '快捷支付限额管控', scene: '银行卡 / 快捷支付',
    version: 'v1.8', status: '生效中', rollout: 100, hitRate: 0.0457, blockRate: 0.286, action: 'review',
    owner: '策略管理员 · 小云', updatedAt: '2026-06-16 16:18',
    rules: [
      { cond: '单笔金额', op: '>', val: '¥20,000' },
      { cond: '日累计笔数', op: '>', val: '8 笔（异常高频）' },
      { cond: '盗刷模型评分', op: '>', val: '0.65' },
      { cond: '收款方风险画像', op: '=', val: '高风险 → 二次验证' },
    ],
  },
  {
    id: 'STR-AML-017', name: 'AML 结构化拆分监测', scene: '账户转账 / 现金存取',
    version: 'v2.0', status: '灰度中', rollout: 10, hitRate: 0.0061, blockRate: 0.408, action: 'review',
    owner: 'AML 合规官 · 小云', updatedAt: '2026-06-19 18:33',
    rules: [
      { cond: '单笔金额', op: '区间', val: '¥45,000 – ¥49,999（贴阈值）' },
      { cond: '单日同类笔数', op: '≥', val: '5 笔（化整为零）' },
      { cond: '资金链核查 · 归集端', op: '=', val: '汇聚至同一收款人' },
      { cond: '拆分模式 agent 调查置信度', op: '>', val: '0.74' },
    ],
  },
  {
    id: 'STR-MULE-003', name: '涉赌涉诈代收账户', scene: '账户转账 / 收款',
    version: 'v1.2', status: '草稿', rollout: 10, hitRate: 0.0039, blockRate: 0.0, action: 'block',
    owner: '风险分析师 · 小云', updatedAt: '2026-06-15 11:50',
    rules: [
      { cond: '入账对手方分散度', op: '>', val: '近 7 日 50+ 个付款人' },
      { cond: '资金留存时长', op: '<', val: '中位 < 5min（过账特征）' },
      { cond: '对手方画像 agent 核查', op: '=', val: '关联涉诈举报' },
      { cond: '代收模型评分', op: '>', val: '0.80' },
    ],
  },
];

// ─── mock：近 14 天「命中量 + 拦截率」发布前后对比（前版 / 新版）──────────────
const DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2026, 5, 6 + i);
  return `${d.getMonth() + 1}/${d.getDate()}`;
});
// 第 7 天发布新版：命中量上行（覆盖更全）、拦截率提升且更稳
const HITS_BEFORE = [1820, 1760, 1905, 1840, 1788, 1920, 1875, 1860, 1810, 1890, 1845, 1798, 1866, 1822];
const HITS_AFTER = [1820, 1760, 1905, 1840, 1788, 1920, 2240, 2310, 2275, 2360, 2298, 2255, 2330, 2288];
const BLOCK_BEFORE = [0.512, 0.498, 0.523, 0.507, 0.495, 0.531, 0.518, 0.504, 0.488, 0.529, 0.515, 0.499, 0.522, 0.508];
const BLOCK_AFTER = [0.512, 0.498, 0.523, 0.507, 0.495, 0.531, 0.642, 0.671, 0.658, 0.689, 0.665, 0.651, 0.683, 0.674];
const RELEASE_IDX = 6; // 第 7 天

const DEC_ICON: Record<Decision, React.ReactNode> = {
  block: <ShieldX size={13} />, review: <ShieldAlert size={13} />, pass: <ShieldCheck size={13} />,
};

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

export default function Strategy() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('strategy:write');
  const [selId, setSelId] = useState<string>(STRATEGIES[0].id);
  const [rollout, setRollout] = useState<RolloutStage>(STRATEGIES[0].rollout);

  const sel = useMemo(() => STRATEGIES.find(s => s.id === selId)!, [selId]);

  const onSelect = (s: Strategy) => { setSelId(s.id); setRollout(s.rollout); };

  const onPublish = () => {
    if (!canWrite) return;
    toast(`「${sel.name}」${sel.version} 已发布至 ${rollout}% 灰度 · 决策链已生效`, 'success');
  };
  const onRollback = () => {
    if (!canWrite) return;
    toast(`「${sel.name}」已一键回滚至上一稳定版 · 流量切回 0%`, 'warn');
  };

  // 统计：各状态策略数（治理总览）
  const counts = useMemo(() => ({
    live: STRATEGIES.filter(s => s.status === '生效中').length,
    gray: STRATEGIES.filter(s => s.status === '灰度中').length,
    draft: STRATEGIES.filter(s => s.status === '草稿').length,
  }), []);

  // 发布前后命中量(bar)×拦截率(line) 双轴
  const compareChart = () => {
    const text3 = cssVar('--text-3');
    const gold = accent();
    const red = blockColor();
    return {
      ...baseOption(),
      grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
      legend: {
        data: ['前版命中量', '新版命中量', '前版拦截率', '新版拦截率'],
        top: 0, left: 0, itemWidth: 11, itemHeight: 8, itemGap: 14,
        textStyle: { color: cssVar('--text-2'), fontSize: 11 },
      },
      tooltip: {
        ...(baseOption().tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' },
        valueFormatter: undefined,
      },
      xAxis: {
        type: 'category', data: DAYS, ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, interval: 1 },
      },
      yAxis: [
        { type: 'value', ...axisStyle(), name: '命中量', nameTextStyle: { color: text3, fontSize: 10, align: 'left' }, splitLine: { show: true, lineStyle: { color: cssVar('--hairline'), type: 'dashed' } } },
        { type: 'value', ...axisStyle(), name: '拦截率', min: 0, max: 1, position: 'right', nameTextStyle: { color: text3, fontSize: 10, align: 'right' }, axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${(v * 100).toFixed(0)}%` }, splitLine: { show: false } },
      ],
      series: [
        {
          name: '前版命中量', type: 'bar', yAxisIndex: 0, data: HITS_BEFORE, barGap: '-100%', barWidth: '46%',
          itemStyle: { color: 'color-mix(in srgb, var(--text-3) 42%, transparent)', borderRadius: [3, 3, 0, 0] }, z: 1,
        },
        {
          name: '新版命中量', type: 'bar', yAxisIndex: 0, data: HITS_AFTER, barWidth: '46%',
          itemStyle: { color: 'color-mix(in srgb, var(--gold) 80%, transparent)', borderRadius: [3, 3, 0, 0] }, z: 2,
        },
        {
          name: '前版拦截率', type: 'line', yAxisIndex: 1, data: BLOCK_BEFORE, smooth: true, symbol: 'none',
          lineStyle: { width: 1.6, color: text3, type: 'dashed' }, z: 3,
        },
        {
          name: '新版拦截率', type: 'line', yAxisIndex: 1, data: BLOCK_AFTER, smooth: true, symbolSize: 5,
          lineStyle: { width: 2.2, color: red }, itemStyle: { color: red },
          markLine: {
            silent: true, symbol: 'none',
            label: { formatter: '新版发布', color: gold, fontSize: 10, position: 'insideEndTop' },
            lineStyle: { color: gold, type: 'dashed', width: 1.4 },
            data: [{ xAxis: RELEASE_IDX }],
          }, z: 4,
        },
      ],
    };
  };

  // 版本对比小卡数据（发布前 vs 当前/新版，取该策略尾日）
  const beforeHit = HITS_BEFORE[13], afterHit = HITS_AFTER[13];
  const beforeBlock = BLOCK_BEFORE[13], afterBlock = BLOCK_AFTER[13];

  const grouped: { layer: Layer; rules: Strategy['rules'] }[] = useMemo(() => {
    const order: Layer[] = ['rule', 'ml', 'agent'];
    return order
      .map(layer => ({ layer, rules: sel.rules.filter(r => layerOf(r.cond) === layer) }))
      .filter(g => g.rules.length > 0);
  }, [sel]);

  return (
    <div className="page page-wide">
      <PageHeader
        title="决策规则 / 策略编排器"
        subtitle="规则 + ML 评分 + agentic 调查 三层决策的可视化编排 · 版本化 · 灰度发布 · 一键回滚"
        actions={
          <div className="row gap-2">
            <span className="row gap-2 t-small text-3" style={{ marginRight: 4 }}>
              <span className="row gap-1"><span className="state-dot state-pass" />生效 <span className="mononum">{counts.live}</span></span>
              <span className="row gap-1"><span className="state-dot" style={{ background: 'var(--gold)' }} />灰度 <span className="mononum">{counts.gray}</span></span>
              <span className="row gap-1"><span className="state-dot" style={{ background: 'var(--text-3)' }} />草稿 <span className="mononum">{counts.draft}</span></span>
            </span>
            <button className="btn btn-ghost btn-sm" disabled={!canWrite} onClick={() => canWrite && toast('已进入策略草拟模式 · 三层条件可拖拽编排', 'info')}>
              <GitBranch size={14} />新建策略
            </button>
          </div>
        }
      />

      {/* 三层决策图例（编排语言，立 governance 叙事） */}
      <Panel
        title="三层决策流水线"
        icon={<Workflow size={13} />}
        right={<span className="t-small text-3">命中策略 → 依次过 规则 / ML / agent 三层 → 汇聚为放行 / 复核 / 拦截</span>}
        style={{ marginBottom: 14 }}
      >
        <div className="row gap-3 wrap" style={{ alignItems: 'stretch' }}>
          {(['rule', 'ml', 'agent'] as Layer[]).map((l, i) => {
            const m = LAYER_META[l];
            const desc = [
              '确定性硬规则：黑白名单、阈值、不可能旅行、设备指纹——毫秒级、零歧义。',
              '风险评分模型：盗刷 / 套现 / 信用 / AML 模型输出 0–1 概率，按分段路由处置。',
              'agentic 调查：复杂可疑件交 agent 自主取证（资金链 / 关系网 / 名单），输出置信度结论。',
            ][i];
            return (
              <div key={l} className="flex-1" style={{ minWidth: 220, padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderLeft: `2px solid ${m.color}` }}>
                <div className="row gap-2" style={{ marginBottom: 6 }}>
                  <span className="badge" style={{ background: `color-mix(in srgb, ${m.color} 14%, transparent)`, color: m.color }}>{m.icon}{m.short}</span>
                  <span className="t-small text-3 mononum">L{i + 1}</span>
                </div>
                <div className="t-small text-2" style={{ lineHeight: 1.55 }}>{desc}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 主区：策略卡列表（左）+ 编排器（右） */}
      <div className="grid" style={{ gridTemplateColumns: '352px 1fr', gap: 14, alignItems: 'start' }}>
        {/* ─── 左：策略卡列表 ─── */}
        <Panel title="策略库" icon={<Boxes size={13} />} right={<span className="t-small text-3 mononum">{STRATEGIES.length} 条</span>} bodyClass="panel-body-0">
          <div className="col">
            {STRATEGIES.map(s => {
              const active = s.id === selId;
              const tone = STATUS_TONE[s.status];
              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s)}
                  style={{
                    textAlign: 'left', width: '100%', cursor: 'pointer',
                    padding: '13px 15px', borderBottom: '1px solid var(--hairline)',
                    background: active ? 'var(--gold-glow)' : 'transparent',
                    borderLeft: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
                    transition: 'background var(--dur-micro) var(--ease)',
                  }}
                >
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: active ? 'var(--gold)' : 'var(--text-1)' }}>{s.name}</span>
                    <span className="badge" style={{ background: tone.bg, color: tone.color }}>{s.status}</span>
                  </div>
                  <div className="row gap-2" style={{ marginBottom: 8 }}>
                    <span className="t-small text-3">{s.scene}</span>
                  </div>
                  <div className="row spread" style={{ alignItems: 'center' }}>
                    <span className="row gap-2">
                      <span className="tag tag-mono">{s.version}</span>
                      <span className="t-small text-3">灰度 <span className="mononum" style={{ color: s.status === '灰度中' ? 'var(--gold)' : 'var(--text-2)' }}>{s.rollout}%</span></span>
                    </span>
                    <span className="row gap-3 t-small">
                      <span className="text-3">命中 <span className="mononum text-2">{pct(s.hitRate)}</span></span>
                      <span className="text-3">拦截 <span className="mononum" style={{ color: decVar(s.action) }}>{pct(s.blockRate)}</span></span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* ─── 右：编排器 + 灰度发布 + 版本对比 ─── */}
        <div className="col gap-4" style={{ minWidth: 0 }}>
          {/* 规则编辑视图：IF 条件链可视化（三层分组） */}
          <Panel
            title="决策链编排"
            icon={<Layers size={13} />}
            right={
              <span className="row gap-2">
                <span className="tag tag-mono">{sel.version}</span>
                <span className="t-small text-3">owner · {sel.owner}</span>
              </span>
            }
            bodyClass="panel-body"
          >
            {/* 顶部：策略元信息 */}
            <div className="row spread wrap gap-3" style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--hairline)' }}>
              <div>
                <div className="row gap-2" style={{ marginBottom: 3 }}>
                  <span className="t-h3" style={{ color: 'var(--text-1)' }}>{sel.name}</span>
                  <span className="badge" style={{ background: STATUS_TONE[sel.status].bg, color: STATUS_TONE[sel.status].color }}>{sel.status}</span>
                </div>
                <div className="t-small text-3">适用场景 · {sel.scene} · 更新于 {sel.updatedAt}</div>
              </div>
              <div className="row gap-2 t-small text-3">
                <span>本策略命中即触发</span>
                <span className="mononum text-2">{sel.rules.length}</span>
                <span>项条件 · 跨</span>
                <span className="mononum text-2">{grouped.length}</span>
                <span>层</span>
              </div>
            </div>

            {/* IF…THEN 条件链：war-grid 画布 + 三层分组条件块 */}
            <div className="war-grid" style={{ borderRadius: 'var(--r-md)', border: '1px solid var(--hairline)', padding: 16 }}>
              <div className="row gap-2" style={{ marginBottom: 12 }}>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--gold)' }}>IF</span>
                <span className="t-small text-3">全部条件命中（AND）· 按层依次求值</span>
              </div>

              <div className="col gap-3">
                {grouped.map((g, gi) => {
                  const m = LAYER_META[g.layer];
                  return (
                    <div key={g.layer}>
                      <div className="row gap-2" style={{ marginBottom: 8 }}>
                        <span className="badge" style={{ background: `color-mix(in srgb, ${m.color} 13%, transparent)`, color: m.color }}>{m.icon}{m.label}</span>
                        <span className="flex-1" style={{ height: 1, background: 'var(--hairline)' }} />
                      </div>
                      <div className="col gap-2" style={{ paddingLeft: 4 }}>
                        {g.rules.map((r, ri) => (
                          <div key={ri} className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                            {(gi > 0 || ri > 0) && (
                              <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', minWidth: 30 }}>AND</span>
                            )}
                            {!(gi > 0 || ri > 0) && <span style={{ minWidth: 30 }} />}
                            {/* 条件块：字段 · 运算符 · 值 */}
                            <div className="row" style={{ flex: 1, minWidth: 0, borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)', background: 'var(--surface-1)', overflow: 'hidden' }}>
                              <span style={{ padding: '7px 11px', fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', borderRight: '1px solid var(--hairline)', whiteSpace: 'nowrap' }}>{r.cond}</span>
                              <span className="mono" style={{ padding: '7px 10px', fontSize: 12, fontWeight: 700, color: m.color, background: `color-mix(in srgb, ${m.color} 8%, transparent)`, borderRight: '1px solid var(--hairline)', whiteSpace: 'nowrap' }}>{r.op}</span>
                              <span className="mono flex-1" style={{ padding: '7px 11px', fontSize: 12, color: 'var(--text-2)' }}>{r.val}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* THEN 动作 */}
              <div className="row gap-2" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--gold)' }}>THEN</span>
                <span
                  className="row gap-2"
                  style={{ padding: '6px 12px', borderRadius: 'var(--r-sm)', background: `color-mix(in srgb, ${decVar(sel.action)} 14%, transparent)`, color: decVar(sel.action), fontSize: 13, fontWeight: 700, border: `1px solid color-mix(in srgb, ${decVar(sel.action)} 32%, transparent)` }}
                >
                  {DEC_ICON[sel.action]}{DECISION_LABEL[sel.action]}
                </span>
                <span className="t-small text-3">并写入决策审计 · 模型版本与策略版本一并固化</span>
              </div>
            </div>
          </Panel>

          {/* 灰度发布控件 + 版本对比 */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
            {/* 灰度发布 */}
            <Panel title="灰度发布" icon={<Rocket size={13} />} bodyClass="panel-body">
              <div className="t-small text-3" style={{ marginBottom: 12, lineHeight: 1.5 }}>
                按 10% → 50% → 100% 阶梯放量，每段观察命中 / 拦截 / 误伤后再推进。出现异常一键回滚至上一稳定版。
              </div>
              <div className="col gap-2" style={{ marginBottom: 14 }}>
                <span className="label">当前灰度比例</span>
                <Segmented<string>
                  value={String(rollout)}
                  onChange={v => canWrite && setRollout(Number(v) as RolloutStage)}
                  options={[{ value: '10', label: '10%' }, { value: '50', label: '50%' }, { value: '100', label: '100%' }]}
                />
                {/* 真比例进度条（非装饰） */}
                <div style={{ marginTop: 4, height: 7, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${rollout}%`, background: rollout === 100 ? 'var(--success)' : 'var(--gold)', borderRadius: 4, transition: 'width 0.7s var(--ease)' }} />
                </div>
                <span className="t-small text-3 mononum">流量切入 {rollout}% · 其余走上一稳定版</span>
              </div>

              <div className="row gap-2">
                <button className="btn btn-primary btn-sm flex-1" disabled={!canWrite} onClick={onPublish}>
                  <Rocket size={14} />发布至 {rollout}%
                </button>
                <button className="btn btn-danger btn-sm" disabled={!canWrite} onClick={onRollback}>
                  <Undo2 size={14} />一键回滚
                </button>
              </div>
              {!canWrite && (
                <div className="row gap-1" style={{ marginTop: 10 }}>
                  <span className="lock-chip"><Lock size={11} />只读</span>
                  <span className="t-small text-3" style={{ lineHeight: 1.5 }}>当前角色无 strategy:write 权限，发布 / 回滚需策略管理员。</span>
                </div>
              )}
            </Panel>

            {/* 版本对比 */}
            <Panel title="版本对比 · 发布前后" icon={<GitCompareArrows size={13} />} bodyClass="panel-body">
              <div className="t-small text-3" style={{ marginBottom: 12, lineHeight: 1.5 }}>
                以上一稳定版为基线，对比近 14 天尾日表现（命中量 / 拦截率）。
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <CompareCard label="命中量 / 日" beforeText={beforeHit.toLocaleString('zh-CN')} afterText={afterHit.toLocaleString('zh-CN')} delta={(afterHit - beforeHit) / beforeHit} good />
                <CompareCard label="拦截率" beforeText={pct(beforeBlock)} afterText={pct(afterBlock)} delta={(afterBlock - beforeBlock) / beforeBlock} good accentAfter={decVar('block')} />
              </div>
              <div className="col gap-2" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                <KvRow label="新版召回提升" value={`覆盖率 +${(((afterHit - beforeHit) / beforeHit) * 100).toFixed(1)}%`} />
                <KvRow label="拦截率提升" value={`+${((afterBlock - beforeBlock) * 100).toFixed(2)} pp`} mono />
                <KvRow label="对照流量" value="上一稳定版 (v 历史)" />
              </div>
            </Panel>
          </div>

          {/* 命中量 × 拦截率 双轴趋势（发布前后对比） */}
          <Panel
            title="命中量 × 拦截率 · 发布前后对比（近 14 天）"
            icon={<FlaskConical size={13} />}
            right={<span className="row gap-2 t-small text-3"><History size={12} />金柱 = 新版命中量 · 红线 = 新版拦截率</span>}
            bodyClass="panel-body"
          >
            <div className="t-small text-3" style={{ marginBottom: 6, lineHeight: 1.5 }}>
              第 7 天上线新版后，命中量上行（条件覆盖更全）且拦截率显著抬升并更平稳——召回与精准同步改善，非以误伤换命中。
            </div>
            <Chart build={compareChart} height={300} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── 小组件 ─────────────────────────────────────────────────────────────
function CompareCard({ label, beforeText, afterText, delta, good, accentAfter }: {
  label: string; beforeText: string; afterText: string; delta: number; good?: boolean; accentAfter?: string;
}) {
  const up = delta >= 0;
  const deltaColor = (good ? up : !up) ? 'var(--success)' : 'var(--danger)';
  return (
    <div style={{ padding: '11px 13px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="row gap-2" style={{ alignItems: 'baseline', marginBottom: 4 }}>
        <span className="mononum" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'line-through' }}>{beforeText}</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>→</span>
        <span className="mononum" style={{ fontSize: 18, fontWeight: 700, color: accentAfter ?? 'var(--text-1)', letterSpacing: '-0.02em' }}>{afterText}</span>
      </div>
      <span className="mononum" style={{ fontSize: 11.5, fontWeight: 600, color: deltaColor }}>
        {up ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(1)}%
      </span>
    </div>
  );
}

function KvRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="row spread">
      <span className="t-small text-3">{label}</span>
      <span className={mono ? 'mononum' : ''} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{value}</span>
    </div>
  );
}
