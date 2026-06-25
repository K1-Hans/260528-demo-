import { useMemo, useState } from 'react';
import {
  ShieldAlert, Brain, GitBranch, Database, Sparkles, BadgeCheck,
  ArrowRight, Workflow, RefreshCw, Cpu, Cloud, Gauge, ScrollText, Layers,
} from 'lucide-react';
import { PageHeader, Segmented, Card } from '../../components/ui';
import { Drawer, MeterBar, toast } from '../../components/kit';
import type { AgentNode, EmbedStatus, PipeStageKey } from '../../types';

// ════════════════════════════════════════════════════════════════════════
// 智能体管理 · 多-agent pipeline 只读编排画布 + AI 检索引擎状态
// pipeline：A1 敏感词 → A2 意图/情绪 → 路由决策 → A3 RAG 检索 → LLM 生成 → A4 合规质检
// 各节点挂载真实模型（本地小参 / 云端大模型 / 规则引擎），点节点看详情。
// ════════════════════════════════════════════════════════════════════════

// ─── 画布节点（扩展 AgentNode 加视觉/运行态字段，仅本页用）──────────────────
type Loc = 'local' | 'cloud' | 'rule';
interface CanvasNode extends AgentNode {
  icon: React.ReactNode;
  modelBadge: string;          // 挂载模型徽标短名
  loc: Loc;                    // 本地 / 云端 / 规则引擎
  accent: string;              // 节点强调色（多为合规青，A1/A4 用警示色区分关口）
  metrics: { label: string; value: string }[];   // 详情指标
  io: { in: string; out: string };                // 输入 / 输出契约
}

const C_GOLD = 'var(--gold)';
const C_WARN = 'var(--warning)';
const C_INFO = 'var(--info)';
const C_C3 = 'var(--c3)';

const LOC_META: Record<Loc, { label: string; icon: React.ReactNode; color: string }> = {
  local: { label: '本地部署', icon: <Cpu size={11} />, color: 'var(--c3)' },
  cloud: { label: '云端 API', icon: <Cloud size={11} />, color: 'var(--info)' },
  rule: { label: '规则引擎', icon: <Gauge size={11} />, color: 'var(--text-2)' },
};

// ─── 6 节点 pipeline（真实消金 znkf 编排）─────────────────────────────────────
const NODES: CanvasNode[] = [
  {
    key: 'A1', name: 'A1 · 敏感词检测', desc: '8 类风险词 + 变体扫描，命中即阻断',
    icon: <ShieldAlert size={17} />, modelBadge: 'AC 自动机 · 51 主词', loc: 'rule', accent: C_WARN,
    model: '规则引擎 · Aho-Corasick 多模匹配',
    rules: [
      '8 类风险：投诉维权 / 法律维权 / 金融监管 / 催收相关 / 媒体曝光 / 涉政敏感 / 合规风险 / 扬言轻生',
      '主词 51 个 + 变体 211 个，逐字符 O(n) 扫描',
      '命中「扬言轻生」→ 最高优先级，立即转人工 + 危机话术',
      '命中「投诉/银保监会/起诉」→ 触发安抚 Agent + 强制转人工',
    ],
    metrics: [
      { label: '主词 / 变体', value: '51 / 211' },
      { label: '平均耗时', value: '3 ms' },
      { label: '命中动作', value: '阻断 + 路由' },
    ],
    io: { in: '用户原始 query', out: '风险标记 + 命中类型' },
  },
  {
    key: 'A2', name: 'A2 · 意图 / 情绪', desc: '三级意图分类 + 三档情绪识别',
    icon: <Brain size={17} />, modelBadge: 'Gemma · MoE 小参', loc: 'local', accent: C_GOLD,
    model: 'Gemma MoE 小参数模型（本地推理）',
    rules: [
      '10 一级意图：还款相关 / 申请咨询 / 产品与信息 / 催收相关 / 营销活动 / 费用相关 / 业务办理 / 信息维护 / 批量问题 / 自定义',
      '情绪三档：平稳 calm / 不满 upset / 愤怒 angry',
      'MoE 路由仅激活 ~2 专家，小参低延迟，本地部署不出域',
      '意图置信度 < 0.5 → 标记为「自定义」走兜底问答',
    ],
    metrics: [
      { label: '意图层级', value: '3 级 / 675 场景' },
      { label: '情绪档位', value: 'calm / upset / angry' },
      { label: '平均耗时', value: '48 ms' },
    ],
    io: { in: '已过滤 query', out: '意图 L1-L3 + 情绪 + 置信度' },
  },
  {
    key: 'route', name: '路由决策', desc: '按意图×情绪×置信度选执行 Agent',
    icon: <GitBranch size={17} />, modelBadge: '决策矩阵', loc: 'rule', accent: C_INFO,
    model: '路由决策矩阵（确定性规则）',
    rules: [
      'A1 命中敏感词 → 安抚 Agent + 强制转人工',
      'angry + QA 置信度 < 60% → 纯安抚（soothe）',
      'angry + 置信度 ≥ 60% → 融合（hybrid · 情绪 + 业务）',
      'calm → 问答 Agent → A3 高置信 ≥ 0.88 直通',
      '批量问题意图 → 拆分多轮 / 引导转工单',
    ],
    metrics: [
      { label: '分支策略', value: '4 路由 + 兜底' },
      { label: '直通阈值', value: '≥ 0.88' },
      { label: '平均耗时', value: '< 1 ms' },
    ],
    io: { in: '意图 + 情绪 + 风险标记', out: '路由：qa / soothe / hybrid / transfer' },
  },
  {
    key: 'A3', name: 'A3 · RAG 检索', desc: '语义召回 QA 知识库，高置信直通',
    icon: <Database size={17} />, modelBadge: 'Qwen3 27B · FP8', loc: 'cloud', accent: C_GOLD,
    model: 'Qwen3 27B FP8（QA 改写）· text-embedding-v3 1024 维（向量召回）',
    rules: [
      '向量化：text-embedding-v3，1024 维，知识库 14,029 条全量索引',
      '语义召回 Top-K，余弦相似度排序',
      '高置信 ≥ 0.88 → 直接命中原 QA 答案，跳过 LLM（低成本低延迟）',
      '0.60 ≤ 置信 < 0.88 → 召回内容喂 Qwen3 27B 改写润色',
      '< 0.60 → 判定知识缺口，进入拒识 / 转人工',
    ],
    metrics: [
      { label: '向量维度', value: '1024 维' },
      { label: '知识库规模', value: '14,029 条' },
      { label: '直通阈值', value: '≥ 0.88 命中' },
      { label: '平均耗时', value: '120 ms' },
    ],
    io: { in: '路由后 query + 意图', out: 'Top-K 召回 + 置信度' },
  },
  {
    key: 'llm', name: 'LLM 生成', desc: '召回不足时改写 / 安抚话术生成',
    icon: <Sparkles size={17} />, modelBadge: 'Qwen3 27B · FP8', loc: 'cloud', accent: C_GOLD,
    model: 'Qwen3 27B FP8（生成）',
    rules: [
      '仅在 A3 未直通（置信 < 0.88）时触发，控制 token 成本',
      '严格 Prompt 约束：禁编造费率 / 禁越权承诺 / 锁定品牌话术',
      '安抚场景注入情绪标签，生成共情 + 业务双轨回复',
      '生成结果强制进入 A4 合规质检，不直出用户',
    ],
    metrics: [
      { label: '触发条件', value: '置信 < 0.88' },
      { label: '量化精度', value: 'FP8' },
      { label: '平均耗时', value: '640 ms' },
    ],
    io: { in: '召回上下文 + 情绪 + Prompt', out: '候选回复（未质检）' },
  },
  {
    key: 'A4', name: 'A4 · 合规质检', desc: 'R1-R7 七条红线，违规改写 / 拦截',
    icon: <BadgeCheck size={17} />, modelBadge: 'R1-R7 规则引擎', loc: 'rule', accent: C_C3,
    model: '规则引擎 · R1-R7 合规校验',
    rules: [
      'R1 回复来源校验 · R2 幻觉/瞎编检测 · R3 费率数字检测 · R4 越权承诺检测',
      'R5 敏感信息泄露 · R6 不当建议检测 · R7 安抚话术合规',
      '命中红线 → 改写为合规话术 或 拦截转人工',
      '全过程留痕（判定 / 规则 / 置信度 / 复核人），供合规审计回溯',
    ],
    metrics: [
      { label: '规则条数', value: 'R1 - R7' },
      { label: '处置方式', value: '改写 / 拦截 / 放行' },
      { label: '平均耗时', value: '5 ms' },
    ],
    io: { in: '候选回复', out: '合规终稿 + 留痕（放行 / 改写 / 拦截）' },
  },
];

// ─── 检索引擎 4 态 ────────────────────────────────────────────────────────────
const KB_TOTAL = 14029;
const EMBED_PRESETS: Record<EmbedStatus['phase'], EmbedStatus> = {
  ready: { phase: 'ready', current: KB_TOTAL, total: KB_TOTAL, model: 'text-embedding-v3' },
  incremental: { phase: 'incremental', current: 96, total: 142, model: 'text-embedding-v3' },
  full_rebuild: { phase: 'full_rebuild', current: 8640, total: KB_TOTAL, model: 'text-embedding-v3' },
  failed: { phase: 'failed', current: 11200, total: KB_TOTAL, model: 'text-embedding-v3' },
};

const PHASE_META: Record<EmbedStatus['phase'], { label: string; color: string; pulse: boolean }> = {
  ready: { label: 'AI 检索引擎就绪 · 语义模式', color: 'var(--success)', pulse: true },
  incremental: { label: '增量入库中 · 新增 QA 向量化', color: 'var(--info)', pulse: true },
  full_rebuild: { label: '全量重建中 · 重算全库向量索引', color: 'var(--warning)', pulse: true },
  failed: { label: '向量服务降级 · 已回退关键词匹配', color: 'var(--danger)', pulse: false },
};

function StatusBar({ status, onRebuild }: { status: EmbedStatus; onRebuild: () => void }) {
  const meta = PHASE_META[status.phase];
  const pct = status.total ? (status.current / status.total) * 100 : 0;
  const showMeter = status.phase === 'incremental' || status.phase === 'full_rebuild';
  return (
    <Card className="reveal" style={{ borderColor: `color-mix(in srgb, ${meta.color} 26%, var(--hairline))` }}>
      <div className="row spread wrap gap-3">
        <div className="row gap-3" style={{ minWidth: 0 }}>
          <span
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${meta.color} 32%, transparent)`,
              color: meta.color,
            }}
          >
            <Layers size={16} />
          </span>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-2">
              <span
                className={meta.pulse ? 'dot-pulse' : ''}
                style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{meta.label}</span>
            </div>
            <div className="row gap-2 wrap t-small text-3">
              <span>知识库 <span className="tnum text-2" style={{ fontWeight: 600 }}>{KB_TOTAL.toLocaleString()}</span> 条</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span className="mono">{status.model}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>1024 维</span>
            </div>
          </div>
        </div>
        <button className="btn btn-subtle btn-sm" onClick={onRebuild} style={{ flexShrink: 0 }}>
          <RefreshCw size={13} />重建 AI 索引
        </button>
      </div>

      {showMeter && (
        <div style={{ marginTop: 14 }}>
          <div className="row spread" style={{ marginBottom: 6 }}>
            <span className="t-small text-3">
              {status.phase === 'incremental' ? '增量向量化进度' : '全量重建进度'}
            </span>
            <span className="t-small tnum mono" style={{ color: meta.color }}>
              {status.current.toLocaleString()} / {status.total.toLocaleString()} · {pct.toFixed(0)}%
            </span>
          </div>
          <MeterBar pct={pct} color={meta.color} />
        </div>
      )}

      {status.phase === 'failed' && (
        <div
          className="t-small"
          style={{
            marginTop: 12, padding: '9px 12px', borderRadius: 10,
            background: 'color-mix(in srgb, var(--danger) 9%, transparent)',
            border: '1px solid color-mix(in srgb, var(--danger) 26%, transparent)',
            color: 'var(--text-2)', lineHeight: 1.6,
          }}
        >
          向量化服务连续超时，已自动降级为关键词匹配（语义召回暂不可用，命中率预计下降）。已告警运维，恢复后将增量补齐 {(KB_TOTAL - status.current).toLocaleString()} 条。
        </div>
      )}
    </Card>
  );
}

// ─── 单个节点卡（画布内）──────────────────────────────────────────────────────
function NodeCard({ node, active, delay, onClick }: {
  node: CanvasNode; active: boolean; delay: number; onClick: () => void;
}) {
  const loc = LOC_META[node.loc];
  return (
    <button
      onClick={onClick}
      className="reveal"
      style={{
        animationDelay: `${delay}ms`,
        textAlign: 'left', cursor: 'pointer', width: 196, flexShrink: 0,
        background: 'var(--surface-1)',
        border: `1px solid ${active ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
        borderRadius: 'var(--r-md)', padding: '14px 15px',
        boxShadow: active ? 'var(--elev-2)' : 'var(--elev-1)',
        transition: 'border-color var(--dur-base) var(--ease), box-shadow var(--dur-base) var(--ease), transform var(--dur-base) var(--ease)',
        transform: active ? 'translateY(-2px)' : 'none',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--hairline-strong)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--hairline)'; }}
    >
      <span style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 2, borderRadius: 2, background: node.accent, opacity: active ? 1 : 0.55 }} />
      <div className="row spread" style={{ marginBottom: 10 }}>
        <span
          style={{
            width: 32, height: 32, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `color-mix(in srgb, ${node.accent} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${node.accent} 32%, transparent)`,
            color: node.accent,
          }}
        >
          {node.icon}
        </span>
        <span
          className="row gap-1"
          style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
            background: `color-mix(in srgb, ${loc.color} 12%, transparent)`,
            color: loc.color, border: `1px solid color-mix(in srgb, ${loc.color} 26%, transparent)`,
          }}
        >
          {loc.icon}{loc.label}
        </span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', marginBottom: 5, lineHeight: 1.3 }}>
        {node.name}
      </div>
      <div className="t-small text-3" style={{ lineHeight: 1.5, marginBottom: 10, minHeight: 36 }}>
        {node.desc}
      </div>
      <div
        className="row gap-1 mono"
        style={{
          fontSize: 10.5, padding: '4px 8px', borderRadius: 7,
          background: 'var(--surface-2)', border: '1px solid var(--hairline)',
          color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        <Cpu size={10} style={{ color: node.accent, flexShrink: 0 }} />{node.modelBadge}
      </div>
    </button>
  );
}

// ─── 节点间连接箭头 ───────────────────────────────────────────────────────────
function Connector({ delay }: { delay: number }) {
  return (
    <div className="col reveal" style={{ animationDelay: `${delay}ms`, alignItems: 'center', flexShrink: 0, alignSelf: 'center', gap: 2 }}>
      <div style={{ height: 1.5, width: 26, background: 'linear-gradient(90deg, color-mix(in srgb, var(--gold) 50%, transparent), color-mix(in srgb, var(--gold) 22%, transparent))' }} />
      <ArrowRight size={14} style={{ color: 'color-mix(in srgb, var(--gold) 70%, var(--text-3))', marginTop: -8 }} />
    </div>
  );
}

export default function Agents() {
  const [phase, setPhase] = useState<EmbedStatus['phase']>('ready');
  const [selKey, setSelKey] = useState<PipeStageKey | null>(null);
  const status = EMBED_PRESETS[phase];
  const sel = useMemo(() => NODES.find(n => n.key === selKey) ?? null, [selKey]);

  const onRebuild = () => {
    toast('已提交全量重建任务 · 约 15,000 次 embedding 调用，预计 20 分钟，期间维持当前索引服务', 'info');
    setPhase('full_rebuild');
  };

  return (
    <div className="page">
      <PageHeader
        title="智能体管理"
        subtitle="多-agent pipeline 编排 · 各节点挂载模型与规则 · 只读视图"
        actions={
          <span className="svc-pill row gap-2">
            <Workflow size={13} />6 节点 pipeline
          </span>
        }
      />

      {/* ── AI 检索引擎状态条 ── */}
      <StatusBar status={status} onRebuild={onRebuild} />

      {/* 4 态演示切换 */}
      <div className="row spread wrap gap-3" style={{ margin: '14px 0 22px' }}>
        <span className="t-small text-3">检索引擎状态（演示切换 4 态）</span>
        <Segmented
          options={[
            { value: 'ready', label: '就绪' },
            { value: 'incremental', label: '增量入库中' },
            { value: 'full_rebuild', label: '全量重建中' },
            { value: 'failed', label: '降级失败' },
          ]}
          value={phase}
          onChange={(v: string) => setPhase(v as EmbedStatus['phase'])}
        />
      </div>

      {/* ── Pipeline 编排画布 ── */}
      <Card style={{ overflow: 'hidden' }}>
        <div className="row spread wrap gap-3" style={{ marginBottom: 18 }}>
          <span className="row gap-2 label" style={{ color: 'var(--text-2)' }}>
            <Workflow size={14} style={{ color: 'var(--gold)' }} />Pipeline 编排画布
          </span>
          <span className="t-small text-3">点击任意节点查看挂载模型 / 规则 / 阈值</span>
        </div>

        <div className="row" style={{ overflowX: 'auto', paddingBottom: 6, alignItems: 'stretch' }}>
          {NODES.map((n, i) => (
            <div key={n.key} className="row" style={{ alignItems: 'stretch' }}>
              <NodeCard node={n} active={selKey === n.key} delay={i * 60} onClick={() => setSelKey(n.key)} />
              {i < NODES.length - 1 && <Connector delay={i * 60 + 30} />}
            </div>
          ))}
        </div>

        {/* 图例 */}
        <div className="row gap-4 wrap" style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>
          {(Object.keys(LOC_META) as Loc[]).map(k => (
            <span key={k} className="row gap-2 t-small text-3">
              <span style={{ width: 9, height: 9, borderRadius: 3, background: `color-mix(in srgb, ${LOC_META[k].color} 60%, transparent)`, border: `1px solid ${LOC_META[k].color}` }} />
              {LOC_META[k].label}
            </span>
          ))}
          <span className="t-small text-3" style={{ marginLeft: 'auto' }}>
            敏感词 / 路由 / 合规为确定性关口，意图 / 检索 / 生成为模型节点
          </span>
        </div>
      </Card>

      {/* ── 节点详情抽屉 ── */}
      <Drawer
        open={!!sel}
        onClose={() => setSelKey(null)}
        title={sel?.name ?? ''}
        sub={sel?.desc}
        width={480}
      >
        {sel && (
          <div className="col" style={{ gap: 18 }}>
            {/* 挂载模型 */}
            <div>
              <div className="row gap-2 label" style={{ color: 'var(--text-2)', marginBottom: 9 }}>
                <Cpu size={13} style={{ color: sel.accent }} />挂载模型
              </div>
              <div
                style={{
                  padding: '12px 14px', borderRadius: 'var(--r-md)',
                  background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.5 }}>{sel.model}</div>
                <div className="row gap-2" style={{ marginTop: 8 }}>
                  <span
                    className="row gap-1"
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      background: `color-mix(in srgb, ${LOC_META[sel.loc].color} 12%, transparent)`,
                      color: LOC_META[sel.loc].color,
                      border: `1px solid color-mix(in srgb, ${LOC_META[sel.loc].color} 26%, transparent)`,
                    }}
                  >
                    {LOC_META[sel.loc].icon}{LOC_META[sel.loc].label}
                  </span>
                  <span className="tag mono">{sel.modelBadge}</span>
                </div>
              </div>
            </div>

            {/* 关键指标 */}
            <div>
              <div className="row gap-2 label" style={{ color: 'var(--text-2)', marginBottom: 9 }}>
                <Gauge size={13} style={{ color: sel.accent }} />关键指标
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {sel.metrics.map(m => (
                  <div
                    key={m.label}
                    className="col gap-1"
                    style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}
                  >
                    <span className="t-small text-3">{m.label}</span>
                    <span className="tnum" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 输入 / 输出契约 */}
            <div>
              <div className="row gap-2 label" style={{ color: 'var(--text-2)', marginBottom: 9 }}>
                <ArrowRight size={13} style={{ color: sel.accent }} />输入 / 输出
              </div>
              <div className="col gap-2">
                <div className="row gap-2" style={{ fontSize: 12.5 }}>
                  <span className="tag" style={{ flexShrink: 0 }}>IN</span>
                  <span className="text-2" style={{ lineHeight: 1.5 }}>{sel.io.in}</span>
                </div>
                <div className="row gap-2" style={{ fontSize: 12.5 }}>
                  <span className="tag" style={{ flexShrink: 0, color: sel.accent, borderColor: `color-mix(in srgb, ${sel.accent} 40%, transparent)` }}>OUT</span>
                  <span className="text-2" style={{ lineHeight: 1.5 }}>{sel.io.out}</span>
                </div>
              </div>
            </div>

            {/* 规则 / 阈值 */}
            {sel.rules && sel.rules.length > 0 && (
              <div>
                <div className="row gap-2 label" style={{ color: 'var(--text-2)', marginBottom: 9 }}>
                  <ScrollText size={13} style={{ color: sel.accent }} />规则 / 阈值
                </div>
                <div className="col gap-2">
                  {sel.rules.map((r, j) => (
                    <div
                      key={j}
                      className="row gap-2"
                      style={{
                        fontSize: 12.5, lineHeight: 1.55, padding: '9px 12px', borderRadius: 'var(--r-sm)',
                        background: 'var(--surface-2)', border: '1px solid var(--hairline)', color: 'var(--text-2)',
                      }}
                    >
                      <span style={{ color: sel.accent, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>·</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
