import { useMemo, useState } from 'react';
import {
  Workflow, GitBranch, Cpu, Mic, AudioLines, ScanText, Braces, Sparkles,
  ShieldCheck, Ban, Percent, HeartHandshake, ClipboardCheck, Server, Cloud,
  Gauge, Zap, CircleCheck, Loader, Circle, ArrowRight,
} from 'lucide-react';
import { PageHeader, StatCard, SectionTitle, Card } from '../components/ui';
import { Drawer, MeterBar } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar } from '../lib/chartTheme';

// ════════════════════════════════════════════════════════════════════════
// 多-agent 质检流水线编排 ★（Hans 方案灵魂）
// 按质检规则拆分的多本地智能体并行 → 汇总打分，解决单 agent 准确率瓶颈 + 云端 API 高成本。
// 全 mock，真实消金质检术语，禁 lorem / 禁真名。
// ════════════════════════════════════════════════════════════════════════

type StageStatus = 'done' | 'running' | 'pending';

interface PipeNode {
  key: string;
  name: string;
  role: string;                 // 分工说明
  icon: React.ReactNode;
  status: StageStatus;
  ms: number;                   // 本节点耗时（毫秒）
  accuracy?: number;            // 准确率（%）
  model?: string;               // 推理模型
  deploy: 'local' | 'cloud' | 'edge' | 'infra';
  cloudCost?: number;           // 该环节若走云端 API 月成本（元）
  localCost?: number;           // 该环节本地推理月成本（元）
  detail: string;               // 抽屉内详述
}

// 画布按「列」组织：每列一个阶段，双引擎 / 多子 agent 列内并行多卡
interface PipeColumn {
  key: string;
  title: string;
  kind: 'single' | 'parallel';  // parallel = 列内多卡并行（双引擎 / 子 agent）
  badge?: string;               // 列顶小标（如「并行」）
  nodes: PipeNode[];
}

// ─── 流水线编排数据（采集 → ASR → 结构化 → 双引擎并行 → 多子 agent → 汇总）─────
const COLUMNS: PipeColumn[] = [
  {
    key: 'capture', title: '录音采集', kind: 'single',
    nodes: [{
      key: 'capture', name: '录音采集', role: '通话/在线双录入库', icon: <Mic size={15} />,
      status: 'done', ms: 120, deploy: 'edge', model: '采集网关 · 双录合规',
      detail: '从通话录音、在线会话双路采集原始音频与文本，按金融「双录」要求 100% 全量入库并校验完整性，作为后续质检的证据源。今日入库 48,620 条。',
    }],
  },
  {
    key: 'asr', title: 'ASR 转写 + 说话人分离', kind: 'single',
    nodes: [{
      key: 'asr', name: 'ASR + 说话人分离', role: '语音转文本 · 坐席/客户双轨', icon: <AudioLines size={15} />,
      status: 'done', ms: 1840, accuracy: 96.4, deploy: 'local', model: 'Whisper-L 本地微调 · 金融术语词典',
      cloudCost: 38200, localCost: 11600,
      detail: '本地部署 ASR 模型把通话音频转为文本，并做说话人分离（坐席轨 / 客户轨），识别静默段与重叠（抢话）。金融领域术语经词典微调，转写准确率 96.4%。本地化避免逐分钟云端转写计费。',
    }],
  },
  {
    key: 'struct', title: '文本结构化', kind: 'single',
    nodes: [{
      key: 'struct', name: '文本结构化', role: '意图/实体/情绪/静默/抢话', icon: <Braces size={15} />,
      status: 'done', ms: 760, accuracy: 94.1, deploy: 'local', model: '结构化抽取 · BERT 本地',
      cloudCost: 16400, localCost: 5200,
      detail: '对转写文本做结构化抽取：意图识别、实体抽取（金额/利率/期限）、逐句情绪打分、静默超时与抢话检测，输出结构化事件流喂给下游双引擎与子 agent。',
    }],
  },
  {
    key: 'engine', title: '双引擎并行', kind: 'parallel', badge: '并行',
    nodes: [
      {
        key: 'rule', name: '规则模板引擎', role: '关键词 / 正则 / 必读话术命中', icon: <ScanText size={15} />,
        status: 'running', ms: 210, accuracy: 99.2, deploy: 'local', model: '规则引擎 · 正则 + 词槽',
        cloudCost: 0, localCost: 1800,
        detail: '基于规则模板（关键词、正则、必读话术词槽）做确定性命中：年化利率告知、冷静期告知、禁语黑名单等。高召回、零幻觉、可解释，适合硬合规红线，本地零增量成本。',
      },
      {
        key: 'llm', name: 'LLM 语义评分', role: '语义理解 · 是否完整告知', icon: <Sparkles size={15} />,
        status: 'running', ms: 1320, accuracy: 95.8, deploy: 'local', model: 'Qwen-14B 本地量化 · 质检 prompt',
        cloudCost: 52800, localCost: 14300,
        detail: '本地量化 LLM 对规则覆盖不到的语义项打分，例如「是否完整告知年化利率与逾期后果」「承诺是否越权」。理解上下文与话术变体，补足规则引擎的语义盲区；本地部署较云端大模型 API 月省约 73%。',
      },
    ],
  },
  {
    key: 'agents', title: '多本地子 agent', kind: 'parallel', badge: '4 路并行',
    nodes: [
      {
        key: 'a_compliance', name: '合规 agent', role: '必读话术 · 利率/冷静期告知', icon: <ShieldCheck size={15} />,
        status: 'pending', ms: 540, accuracy: 100, deploy: 'local', model: '合规专用小模型 · 本地',
        cloudCost: 18600, localCost: 6900,
        detail: '专检合规必读项：年化利率告知、冷静期告知、个人信息授权、逾期后果告知。按质检规则单独拆分的本地智能体，规则项准确率 100%，是监管评级的核心防线。',
      },
      {
        key: 'a_ban', name: '禁语 agent', role: '催收红线 · 威胁/辱骂筛查', icon: <Ban size={15} />,
        status: 'pending', ms: 320, accuracy: 99.5, deploy: 'local', model: '禁语分类器 · 本地',
        cloudCost: 9200, localCost: 3100,
        detail: '专检催收红线与禁语：禁辱骂威胁、禁联系第三方（单位/同事）、禁软暴力措辞。命中即触发实时预警拦截。本地推理低延迟，保证通话进行中即时阻断。',
      },
      {
        key: 'a_rate', name: '费率告知 agent', role: 'APR / 费用结构完整性', icon: <Percent size={15} />,
        status: 'pending', ms: 480, accuracy: 97.3, deploy: 'local', model: '费率核验模型 · 本地',
        cloudCost: 11400, localCost: 4200,
        detail: '专核费率告知完整性：年化利率（APR）、服务费、违约金是否如实、完整、前置告知，识别「直接申请就行」式漏报。对接结构化抽取的金额/利率实体做交叉校验。',
      },
      {
        key: 'a_emotion', name: '情绪安抚 agent', role: '客户情绪激化 · 安抚话术', icon: <HeartHandshake size={15} />,
        status: 'pending', ms: 410, accuracy: 96.2, deploy: 'local', model: '情绪识别 + 话术 · 本地',
        cloudCost: 10800, localCost: 3800,
        detail: '专检客户情绪曲线与坐席安抚表现：识别情绪激化拐点，评估坐席是否及时共情、安抚、降级冲突，给出辅导建议话术。电销/催收场景准确率 96.2%。',
      },
    ],
  },
  {
    key: 'merge', title: '汇总评分', kind: 'single',
    nodes: [{
      key: 'merge', name: '汇总 agent', role: '多路结果加权 → 评分卡', icon: <ClipboardCheck size={15} />,
      status: 'pending', ms: 280, accuracy: 98.7, deploy: 'local', model: '汇总编排 · 加权裁决',
      cloudCost: 4600, localCost: 1500,
      detail: '汇总双引擎与各子 agent 的结果，按评分卡权重加权裁决，消解冲突（如规则命中 vs LLM 判定不一致以更严者为准），输出逐项命中的质检评分卡与总分。这是「拆分 → 并行 → 汇总」架构的收口。',
    }],
  },
];

const ALL_NODES: PipeNode[] = COLUMNS.flatMap(c => c.nodes);

// ─── 子 agent 准确率雷达（图表④）────────────────────────────────────────────
const RADAR_AGENTS = [
  { key: 'a_compliance', name: '合规 agent' },
  { key: 'a_ban', name: '禁语 agent' },
  { key: 'a_rate', name: '费率告知 agent' },
  { key: 'a_emotion', name: '情绪安抚 agent' },
] as const;
// 五维：合规项 / 客服 / 电销 / 召回 / 一致性（Hans 真实量级：合规100·客服99·电销96）
const RADAR_DIMS = ['合规项', '客服', '电销', '召回', '一致性'] as const;
const RADAR_DATA: Record<string, number[]> = {
  a_compliance: [100, 99, 96, 98, 99],
  a_ban: [99, 98, 97, 96, 98],
  a_rate: [98, 97, 95, 94, 96],
  a_emotion: [95, 96, 94, 93, 95],
};

// ─── 本地 vs 云端 月成本对比（图表⑤ · 各推理环节双系列柱）────────────────────
const COST_ROWS = ALL_NODES
  .filter(n => (n.cloudCost ?? 0) > 0)
  .map(n => ({ name: n.name.replace(' agent', '').replace(' + 说话人分离', ''), cloud: n.cloudCost ?? 0, local: n.localCost ?? 0 }));

const TOTAL_CLOUD = COST_ROWS.reduce((s, r) => s + r.cloud, 0);
const TOTAL_LOCAL = COST_ROWS.reduce((s, r) => s + r.local, 0);
const SAVE_PCT = Math.round((1 - TOTAL_LOCAL / TOTAL_CLOUD) * 100);
const TOTAL_MS = ALL_NODES.reduce((s, n) => s + n.ms, 0);

// hex(#rrggbb) → rgba 字符串（ECharts canvas 渐变安全，规避 color-mix）
function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length < 6) return hex;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// 状态灯
function StatusDot({ status }: { status: StageStatus }) {
  if (status === 'running') {
    return <span className="dot-pulse" style={{ background: 'var(--gold)' }} />;
  }
  const c = status === 'done' ? 'var(--success)' : 'var(--text-3)';
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block', opacity: status === 'pending' ? 0.55 : 1 }} />;
}

function StatusTag({ status }: { status: StageStatus }) {
  const map: Record<StageStatus, [string, string, React.ReactNode]> = {
    done: ['var(--success)', '已完成', <CircleCheck size={11} key="d" />],
    running: ['var(--gold)', '运行中', <Loader size={11} key="r" />],
    pending: ['var(--text-3)', '待执行', <Circle size={11} key="p" />],
  };
  const [c, t, ic] = map[status];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${c} 13%, transparent)`, color: c }}>
      {ic}{t}
    </span>
  );
}

// 部署标记
function DeployTag({ deploy }: { deploy: PipeNode['deploy'] }) {
  if (deploy === 'cloud') return <span className="tag" style={{ color: 'var(--text-2)' }}><Cloud size={11} style={{ marginRight: 4 }} />云端</span>;
  const label = deploy === 'edge' ? '边缘采集' : deploy === 'infra' ? '基础设施' : '本地推理';
  return <span className="tag" style={{ color: 'var(--gold)', borderColor: 'var(--hairline-strong)' }}><Server size={11} style={{ marginRight: 4 }} />{label}</span>;
}

// ─── 节点卡片 ────────────────────────────────────────────────────────────────
function NodeCard({ node, onOpen }: { node: PipeNode; onOpen: (n: PipeNode) => void }) {
  const accentBorder = node.status === 'running' ? 'var(--hairline-strong)' : 'var(--hairline)';
  return (
    <button
      onClick={() => onOpen(node)}
      className="card card-hover"
      style={{
        textAlign: 'left', cursor: 'pointer', padding: 13, width: 200,
        border: `1px solid ${accentBorder}`,
        boxShadow: node.status === 'running' ? `0 0 0 3px var(--gold-glow), var(--elev-1)` : 'var(--elev-1)',
      }}
    >
      <div className="row spread" style={{ marginBottom: 9 }}>
        <span
          className="row"
          style={{
            width: 30, height: 30, borderRadius: 'var(--r-sm)', justifyContent: 'center',
            background: node.status === 'pending' ? 'var(--surface-2)' : 'var(--gold-glow)',
            color: node.status === 'pending' ? 'var(--text-3)' : 'var(--gold)',
            border: '1px solid var(--hairline)',
          }}
        >
          {node.icon}
        </span>
        <StatusDot status={node.status} />
      </div>
      <div className="t-small" style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{node.name}</div>
      <div className="t-small text-3" style={{ fontSize: 11.5, lineHeight: 1.45, marginBottom: 10, minHeight: 32 }}>{node.role}</div>
      <div className="row spread" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 9 }}>
        <span className="mono tnum text-3" style={{ fontSize: 11 }}>{node.ms} ms</span>
        {node.accuracy !== undefined
          ? <span className="mono tnum" style={{ fontSize: 11.5, fontWeight: 700, color: node.accuracy >= 99 ? 'var(--success)' : 'var(--gold)' }}>{node.accuracy.toFixed(1)}%</span>
          : <span className="t-small text-3" style={{ fontSize: 11 }}>采集</span>}
      </div>
    </button>
  );
}

// 列间连接器（真实 div 连线，非装饰 SVG）
function Connector() {
  return (
    <div className="col" style={{ alignItems: 'center', justifyContent: 'center', alignSelf: 'center', flexShrink: 0, padding: '0 2px' }} aria-hidden>
      <div className="row" style={{ alignItems: 'center' }}>
        <span style={{ width: 16, height: 1.5, background: 'var(--hairline-strong)', display: 'block' }} />
        <ArrowRight size={13} style={{ color: 'var(--gold)', margin: '0 -2px' }} />
      </div>
    </div>
  );
}

// ─── 流程列 ──────────────────────────────────────────────────────────────────
function PipeCol({ col, onOpen }: { col: PipeColumn; onOpen: (n: PipeNode) => void }) {
  const parallel = col.kind === 'parallel';
  return (
    <div className="col" style={{ flexShrink: 0, alignSelf: 'stretch' }}>
      <div className="row gap-2" style={{ marginBottom: 10, minHeight: 20 }}>
        <span className="label" style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>{col.title}</span>
        {col.badge && (
          <span className="chip" style={{ background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: 10.5, padding: '1px 8px' }}>
            <GitBranch size={10} style={{ marginRight: 3 }} />{col.badge}
          </span>
        )}
      </div>
      <div
        className="col gap-3"
        style={{
          flex: 1, justifyContent: 'center',
          ...(parallel ? { padding: '8px 10px', border: '1px dashed var(--hairline-strong)', borderRadius: 'var(--r-lg)', background: 'color-mix(in srgb, var(--gold) 3%, transparent)' } : {}),
        }}
      >
        {col.nodes.map(n => <NodeCard key={n.key} node={n} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

// 本地 vs 云端 综合对比小卡
function CompareCard({ label, icon, local, cloud, unit, better, fmtFn }: {
  label: string; icon: React.ReactNode; local: number; cloud: number; unit: string;
  better: 'low' | 'high'; fmtFn?: (n: number) => string;
}) {
  const f = fmtFn ?? ((n: number) => n.toLocaleString('zh-CN'));
  const localWins = better === 'low' ? local < cloud : local > cloud;
  const ratio = better === 'low' ? local / cloud : cloud / local;
  const deltaPct = Math.round((1 - ratio) * 100);
  return (
    <Card>
      <div className="row spread" style={{ marginBottom: 14 }}>
        <span className="label">{label}</span>
        <span style={{ color: 'var(--gold)', opacity: 0.7 }}>{icon}</span>
      </div>
      <div className="col gap-3">
        <div>
          <div className="row spread" style={{ marginBottom: 5 }}>
            <span className="row gap-1 t-small" style={{ fontWeight: 600, color: 'var(--gold)' }}><Server size={12} />本地推理</span>
            <span className="mono tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>{f(local)}<span className="text-3" style={{ fontWeight: 400, fontSize: 11, marginLeft: 2 }}>{unit}</span></span>
          </div>
          <MeterBar pct={better === 'low' ? 100 - (local / cloud) * 100 : 100} color="var(--gold)" />
        </div>
        <div>
          <div className="row spread" style={{ marginBottom: 5 }}>
            <span className="row gap-1 t-small text-3"><Cloud size={12} />云端 API</span>
            <span className="mono tnum text-2" style={{ fontWeight: 600 }}>{f(cloud)}<span className="text-3" style={{ fontWeight: 400, fontSize: 11, marginLeft: 2 }}>{unit}</span></span>
          </div>
          <MeterBar pct={better === 'low' ? 100 : (local / cloud) * 100} color="var(--text-3)" />
        </div>
      </div>
      <div className="t-small" style={{ marginTop: 12, color: localWins ? 'var(--success)' : 'var(--text-3)', fontWeight: 600 }}>
        本地{better === 'low' ? '省' : '高'} <span className="mono tnum">{Math.abs(deltaPct)}%</span>
      </div>
    </Card>
  );
}

export default function Pipeline() {
  const [active, setActive] = useState<PipeNode | null>(null);
  const runningCount = ALL_NODES.filter(n => n.status === 'running').length;

  // 图表④ 子 agent 准确率雷达
  const radarOpt = useMemo(() => () => {
    const c1 = cssVar('--c1'), c2 = cssVar('--c2'), c3 = cssVar('--c3'), c4 = cssVar('--c4');
    const colors = [c1, c2, c3, c4];
    return {
      ...baseOption(),
      tooltip: { ...(baseOption().tooltip as object) },
      legend: {
        bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10,
        textStyle: { color: cssVar('--text-3'), fontSize: 11 },
        data: RADAR_AGENTS.map(a => a.name),
      },
      radar: {
        center: ['50%', '48%'], radius: '64%',
        indicator: RADAR_DIMS.map(d => ({ name: d, max: 100, min: 88 })),
        axisName: { color: cssVar('--text-2'), fontSize: 11 },
        splitNumber: 4,
        axisLine: { lineStyle: { color: cssVar('--hairline') } },
        splitLine: { lineStyle: { color: cssVar('--hairline') } },
        splitArea: { areaStyle: { color: ['transparent', rgba(cssVar('--c1'), 0.03)] } },
      },
      series: [{
        type: 'radar',
        symbolSize: 4,
        emphasis: { focus: 'series' as const },
        data: RADAR_AGENTS.map((a, i) => ({
          name: a.name,
          value: RADAR_DATA[a.key],
          lineStyle: { color: colors[i], width: 2 },
          itemStyle: { color: colors[i] },
          areaStyle: { color: rgba(colors[i], 0.1) },
        })),
        animationDuration: 900, animationEasing: 'cubicOut' as const,
      }],
    };
  }, []);

  // 图表⑤ 本地 vs 云端 月成本对比柱
  const costOpt = useMemo(() => () => {
    const gold = cssVar('--gold'), goldB = cssVar('--gold-bright'), t3 = cssVar('--text-3');
    return {
      ...baseOption(),
      tooltip: {
        trigger: 'axis', ...(baseOption().tooltip as object),
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: number) => `¥${v.toLocaleString('zh-CN')}/月`,
      },
      legend: {
        top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10,
        textStyle: { color: cssVar('--text-3'), fontSize: 11 },
        data: ['本地推理', '云端 API'],
      },
      grid: { left: 8, right: 12, top: 36, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: COST_ROWS.map(r => r.name), ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, interval: 0, rotate: 24 } },
      yAxis: {
        type: 'value', ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => v >= 1000 ? `${v / 1000}k` : `${v}` },
      },
      series: [
        {
          name: '本地推理', type: 'bar', barWidth: 13, barGap: '20%',
          data: COST_ROWS.map(r => r.local),
          itemStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: goldB }, { offset: 1, color: gold }] }, borderRadius: [3, 3, 0, 0] },
        },
        {
          name: '云端 API', type: 'bar', barWidth: 13,
          data: COST_ROWS.map(r => r.cloud),
          itemStyle: { color: rgba(t3, 0.5), borderRadius: [3, 3, 0, 0] },
        },
      ],
      animationDuration: 800, animationEasing: 'cubicOut' as const,
    };
  }, []);

  return (
    <div className="page">
      <PageHeader
        title="多-agent 质检流水线编排"
        subtitle="按质检规则拆分多本地智能体并行，再汇总打分——破解单 agent 准确率瓶颈与云端 API 高成本"
        actions={
          <>
            <span className="svc-pill row gap-1">
              <span className="dot-pulse" />流水线 {runningCount > 0 ? '运行中' : '就绪'}
            </span>
            <button className="btn btn-ghost btn-sm"><GitBranch size={14} />编排版本 v3</button>
            <button className="btn btn-primary btn-sm"><Workflow size={14} />重新编排</button>
          </>
        }
      />

      {/* KPI 带：Hans 真实战绩量级 */}
      <div className="grid reveal" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <StatCard label="合规项准确率" raw={100} unit="%" decimals={0} change={1.2} icon={<ShieldCheck size={16} />} delayClass="reveal-1" />
        <StatCard label="客服质检准确率" raw={99} unit="%" decimals={0} change={0.8} icon={<ClipboardCheck size={16} />} delayClass="reveal-2" />
        <StatCard label="电销质检准确率" raw={96} unit="%" decimals={0} change={1.5} icon={<Gauge size={16} />} delayClass="reveal-3" />
        <StatCard label="本地推理月省成本" raw={SAVE_PCT} unit="%" decimals={0} change={6.4} icon={<Server size={16} />} delayClass="reveal-4" />
      </div>

      {/* 本地 vs 云端 总览三卡：月成本 / 平均延迟 / 综合准确率 */}
      <div className="grid reveal reveal-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <CompareCard
          label="月推理成本" icon={<Cloud size={16} />}
          local={TOTAL_LOCAL} cloud={TOTAL_CLOUD} unit="元/月" better="low"
          fmtFn={(n) => `¥${n.toLocaleString('zh-CN')}`}
        />
        <CompareCard
          label="单通处理延迟" icon={<Zap size={16} />}
          local={TOTAL_MS} cloud={Math.round(TOTAL_MS * 2.7)} unit="ms" better="low"
        />
        <CompareCard
          label="综合质检准确率" icon={<Gauge size={16} />}
          local={98} cloud={94} unit="%" better="high"
        />
      </div>

      {/* ★ 流程画布 —— 本页灵魂 */}
      <Card className="reveal reveal-3" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
        <div className="spread" style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
          <div className="row gap-2">
            <Workflow size={16} style={{ color: 'var(--gold)' }} />
            <span className="t-h3">质检流水线 · 拆分 → 并行 → 汇总</span>
          </div>
          <div className="row gap-3">
            <span className="row gap-1 t-small text-3"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />已完成</span>
            <span className="row gap-1 t-small text-3"><span className="dot-pulse" />运行中</span>
            <span className="row gap-1 t-small text-3"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-3)', opacity: 0.55, display: 'inline-block' }} />待执行</span>
            <span className="mono tnum text-3" style={{ fontSize: 11.5, borderLeft: '1px solid var(--hairline)', paddingLeft: 12 }}>累计 {TOTAL_MS.toLocaleString('zh-CN')} ms</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto', padding: '22px 20px' }}>
          <div className="row" style={{ alignItems: 'stretch', gap: 0, minWidth: 'max-content' }}>
            {COLUMNS.map((col, i) => (
              <div key={col.key} className="row" style={{ alignItems: 'stretch' }}>
                <PipeCol col={col} onOpen={setActive} />
                {i < COLUMNS.length - 1 && <Connector />}
              </div>
            ))}
          </div>
          <div className="t-small text-3" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--hairline)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <Cpu size={13} style={{ color: 'var(--gold)' }} />
            点击任一节点查看分工、准确率与本地 vs 云端成本对比。双引擎与 4 路子 agent 均跑本地模型并行执行，汇总 agent 加权出评分卡。
          </div>
        </div>
      </Card>

      {/* 图表④ 雷达 + 图表⑤ 成本柱 */}
      <div className="grid reveal reveal-4" style={{ gridTemplateColumns: '1fr 1.15fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <SectionTitle right={<span className="tag" style={{ color: 'var(--gold)', borderColor: 'var(--hairline-strong)' }}>4 子 agent</span>}>
            各子 agent 准确率 · 五维雷达
          </SectionTitle>
          <Chart build={radarOpt} height={300} />
          <div className="t-small text-3" style={{ marginTop: 8, fontSize: 11.5 }}>
            合规 agent 在合规项命中 <span className="mono tnum gold">100%</span>，禁语 / 费率 / 情绪安抚各司其职，整体高于单一通用 agent。
          </div>
        </Card>
        <Card>
          <SectionTitle right={
            <span className="row gap-1 t-small" style={{ color: 'var(--success)', fontWeight: 600 }}>
              <Server size={12} />合计月省 <span className="mono tnum">¥{(TOTAL_CLOUD - TOTAL_LOCAL).toLocaleString('zh-CN')}</span>（{SAVE_PCT}%）
            </span>
          }>
            本地推理 vs 云端 API · 各环节月成本
          </SectionTitle>
          <Chart build={costOpt} height={300} />
          <div className="t-small text-3" style={{ marginTop: 8, fontSize: 11.5 }}>
            云端按 token / 分钟计费随量线性上涨；本地模型一次部署边际成本极低，全量质检越多省得越多。
          </div>
        </Card>
      </div>

      {/* 节点详情抽屉 */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.name ?? ''}
        sub={active?.role}
        width={440}
        footer={<button className="btn btn-ghost btn-sm" onClick={() => setActive(null)}>关闭</button>}
      >
        {active && (
          <div className="col gap-5">
            <div className="row gap-3" style={{ alignItems: 'center' }}>
              <span
                className="row"
                style={{
                  width: 44, height: 44, borderRadius: 'var(--r-md)', justifyContent: 'center',
                  background: 'var(--gold-glow)', color: 'var(--gold)', border: '1px solid var(--hairline-strong)',
                }}
              >
                {active.icon}
              </span>
              <div className="flex-1">
                <div className="row gap-2" style={{ marginBottom: 5 }}>
                  <StatusTag status={active.status} />
                  <DeployTag deploy={active.deploy} />
                </div>
                <div className="t-small text-3 mono">{active.model}</div>
              </div>
            </div>

            <div>
              <div className="section-label">分工说明</div>
              <p className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>{active.detail}</p>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="card" style={{ padding: 14 }}>
                <div className="label" style={{ marginBottom: 8 }}>本节点耗时</div>
                <div className="mono tnum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>{active.ms}<span className="text-3" style={{ fontSize: 12, fontWeight: 400, marginLeft: 3 }}>ms</span></div>
              </div>
              {active.accuracy !== undefined && (
                <div className="card" style={{ padding: 14 }}>
                  <div className="label" style={{ marginBottom: 8 }}>质检准确率</div>
                  <div className="mono tnum" style={{ fontSize: 22, fontWeight: 700, color: active.accuracy >= 99 ? 'var(--success)' : 'var(--gold)' }}>{active.accuracy.toFixed(1)}<span className="text-3" style={{ fontSize: 12, fontWeight: 400, marginLeft: 1 }}>%</span></div>
                </div>
              )}
            </div>

            {active.accuracy !== undefined && (
              <div>
                <div className="section-label">准确率水位</div>
                <MeterBar pct={active.accuracy} color={active.accuracy >= 99 ? 'var(--success)' : 'var(--gold)'} label={`${active.accuracy.toFixed(1)}%`} />
              </div>
            )}

            {(active.cloudCost ?? 0) > 0 ? (
              <div>
                <div className="section-label">本地 vs 云端 月成本</div>
                <div className="col gap-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-lg)', padding: 14 }}>
                  <div className="row spread">
                    <span className="row gap-1 t-small" style={{ fontWeight: 600, color: 'var(--gold)' }}><Server size={13} />本地推理</span>
                    <span className="mono tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>¥{(active.localCost ?? 0).toLocaleString('zh-CN')}<span className="text-3" style={{ fontWeight: 400, fontSize: 11 }}>/月</span></span>
                  </div>
                  <div className="row spread">
                    <span className="row gap-1 t-small text-3"><Cloud size={13} />云端 API</span>
                    <span className="mono tnum text-2" style={{ fontWeight: 600 }}>¥{(active.cloudCost ?? 0).toLocaleString('zh-CN')}<span className="text-3" style={{ fontWeight: 400, fontSize: 11 }}>/月</span></span>
                  </div>
                  <div className="divider" style={{ margin: '2px 0' }} />
                  <div className="row spread">
                    <span className="t-small text-2" style={{ fontWeight: 600 }}>本地月省</span>
                    <span className="mono tnum" style={{ fontWeight: 700, color: 'var(--success)' }}>
                      ¥{((active.cloudCost ?? 0) - (active.localCost ?? 0)).toLocaleString('zh-CN')} · {Math.round((1 - (active.localCost ?? 0) / (active.cloudCost ?? 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="t-small text-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-lg)', padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <Server size={14} style={{ color: 'var(--gold)' }} />
                {active.deploy === 'edge' ? '采集环节走边缘网关，无云端推理计费。' : '规则引擎为确定性匹配，本地零增量推理成本。'}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
