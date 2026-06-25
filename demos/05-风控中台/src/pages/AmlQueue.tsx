import { useMemo, useState } from 'react';
import {
  Bot, ArrowUpRight, CheckCircle2, Loader, UserCheck, ListFilter,
  ScanLine, History, GitCompareArrows, ChevronRight, Layers, Gauge, Zap,
} from 'lucide-react';
import { PageHeader, Segmented } from '../components/ui';
import { Panel, ScorePill, SlaChip } from '../components/sig';
import { Drawer, StatusBadge } from '../components/kit';
import { DataTable, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar, pass, accent } from '../lib/chartTheme';
import { fmt } from '../lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import type { AmlAlert, AmlRuleType, AmlAgentStatus } from '../types';

// ════════════════════════════════════════════════════════════════════════
// AML 告警队列（agentic 分诊）· 2026 前沿叙事承载页
// 叙事：本批 312 条 → agent 自主结案 85% 常规告警 → 47 条升级人工
// 对标 ComplyAdvantage：天→分钟，人工只啃升级件。
// 🔒 脱敏：示例科技 / 示例商贸 / 某区域贸易 等泛化主体。
// ════════════════════════════════════════════════════════════════════════

// 本批口径（水位条 = 灵魂叙事，与下方列表逻辑一致）
const BATCH_TOTAL = 312;     // 本批告警总数
const N_AUTO = 218;          // agent 自主结案（常规）
const N_RUNNING = 47;        // agent 处置中
const N_ESCALATED = 47;      // 升级人工
const AUTO_PCT = Math.round(((N_AUTO + N_RUNNING) / BATCH_TOTAL) * 100); // ≈85%

// ─── 状态视觉映射 ─────────────────────────────────────────────────────────
const STATUS_META: Record<AmlAgentStatus, { tone: 'good' | 'warn' | 'bad' | 'info' | 'muted'; icon: React.ReactNode; color: string }> = {
  '已自动结案': { tone: 'good', icon: <CheckCircle2 size={12} />, color: 'var(--success)' },
  'agent 处置中': { tone: 'info', icon: <Loader size={12} />, color: 'var(--gold)' },
  '已升级人工': { tone: 'bad', icon: <ArrowUpRight size={12} />, color: 'var(--danger)' },
  '待人工': { tone: 'warn', icon: <UserCheck size={12} />, color: 'var(--warning)' },
};
const RULE_DESC: Record<AmlRuleType, string> = {
  '结构化拆分': '化整为零规避大额上报阈值',
  '快进快出': '资金过账留存极短·通道特征',
  '异常对手方': '对手方集中/新设/高风险关联',
  '高危地区': '涉 FATF 灰名单/制裁辖区',
  '现金密集': '高频整数现金存取',
  '可疑资金归集': '多账户向单一收款人归集',
};
const CHECK_ICON = [<ScanLine size={13} key="0" />, <History size={13} key="1" />, <GitCompareArrows size={13} key="2" />];

// ─── mock：18 条 AML 告警（含 agent 核查步骤）──────────────────────────────
const ALERTS: AmlAlert[] = [
  {
    id: 'AML-2406-3271', subject: '示例科技（深圳）', rule: '结构化拆分', amount: 445500,
    agentStatus: '已升级人工', confidence: 0.94, suggestion: '建议提交 SAR + 冻结待核', sla: '03:40',
    checks: [
      { step: '名单比对 · OFAC/EU/UN/PEP', result: '法人代表命中 PEP 关联（疑似）· 相似度 0.88' },
      { step: '历史行为分析 · 近 90 日', result: '出现 9 笔 ¥49,500 整数拆分（单日内）· 显著偏离基线' },
      { step: '资金链核查 · 上下游', result: '资金 4 小时内归集至同一收款人「示例商贸」· 快进快出' },
    ],
  },
  {
    id: 'AML-2406-3268', subject: '某区域贸易行', rule: '快进快出', amount: 1280000,
    agentStatus: '已升级人工', confidence: 0.91, suggestion: '建议提交 SAR · 关注通道账户', sla: '06:12',
    checks: [
      { step: '名单比对 · 制裁/反洗钱', result: '主体无直接命中 · 关联收款方在央行反洗钱关注名单' },
      { step: '历史行为分析 · 资金留存', result: '近 30 日 14 笔大额过账·留存中位 38 分钟·通道特征' },
      { step: '资金链核查 · 多层中转', result: '3 层中转后流向高危辖区·链路可疑度高' },
    ],
  },
  {
    id: 'AML-2406-3262', subject: '客户 CU-88142', rule: '可疑资金归集', amount: 906000,
    agentStatus: '已升级人工', confidence: 0.89, suggestion: '建议升级人工核实归集动机', sla: '08:55',
    checks: [
      { step: '名单比对 · PEP/不利信息', result: '无名单命中 · 无负面媒体' },
      { step: '历史行为分析 · 对手方', result: '7 日内 11 个账户向其归集 ¥90.6 万·对手方异常扩张' },
      { step: '资金链核查 · 收款集中度', result: '归集后单笔大额提现·资金用途不明' },
    ],
  },
  {
    id: 'AML-2406-3259', subject: '示例商贸（广州）', rule: '异常对手方', amount: 372800,
    agentStatus: '待人工', confidence: 0.76, suggestion: '待人工复核对手方真实性', sla: '01:20',
    checks: [
      { step: '名单比对 · 全量名单', result: '无命中' },
      { step: '历史行为分析 · 新增对手方', result: '近 7 日新增 6 个新设企业对手方·成立均 < 90 天' },
      { step: '资金链核查 · 交易背景', result: '缺合同/发票佐证·交易背景存疑' },
    ],
  },
  {
    id: 'AML-2406-3254', subject: '某区域贸易行', rule: '高危地区', amount: 268000,
    agentStatus: '待人工', confidence: 0.72, suggestion: '待人工核实跨境交易合理性', sla: '00:48',
    checks: [
      { step: '名单比对 · 辖区制裁', result: '交易对手所在辖区属 FATF 灰名单' },
      { step: '历史行为分析 · 跨境频次', result: '近 60 日跨境往来频次较基线升 240%' },
      { step: '资金链核查 · 跨境路径', result: '经第三地中转·路径迂回·待人工判定' },
    ],
  },
  {
    id: 'AML-2406-3248', subject: '示例科技（深圳）', rule: '现金密集', amount: 198000,
    agentStatus: '待人工', confidence: 0.68, suggestion: '待人工核实现金来源', sla: '02:30',
    checks: [
      { step: '名单比对 · PEP', result: '无命中' },
      { step: '历史行为分析 · 现金存取', result: '近 14 日 22 笔整数现金存入·均接近上报阈值' },
      { step: '资金链核查 · 存后流向', result: '存入后即时转出至多账户·疑似分散' },
    ],
  },
  {
    id: 'AML-2406-3301', subject: '客户 CU-77410', rule: '结构化拆分', amount: 49500,
    agentStatus: 'agent 处置中', confidence: 0.81, suggestion: 'agent 正核查拆分意图', sla: '处置中',
    checks: [
      { step: '名单比对 · 全量名单', result: '无命中' },
      { step: '历史行为分析 · 拆分模式', result: '检出连续 ¥49,500 拆分·正回溯关联账户' },
      { step: '资金链核查 · 进行中', result: 'agent 正核查资金归集端·待完成' },
    ],
  },
  {
    id: 'AML-2406-3298', subject: '示例商贸（广州）', rule: '快进快出', amount: 540000,
    agentStatus: 'agent 处置中', confidence: 0.79, suggestion: 'agent 正核查通道特征', sla: '处置中',
    checks: [
      { step: '名单比对 · 制裁名单', result: '无命中' },
      { step: '历史行为分析 · 留存时长', result: '资金留存中位 52 分钟·偏短·继续核查' },
      { step: '资金链核查 · 进行中', result: '正还原上下游链路' },
    ],
  },
  {
    id: 'AML-2406-3210', subject: '客户 CU-66218', rule: '高危地区', amount: 86400,
    agentStatus: '已自动结案', confidence: 0.31, suggestion: '低风险·已自动结案归档', sla: '已结案',
    checks: [
      { step: '名单比对 · 全量名单', result: '无命中' },
      { step: '历史行为分析 · 基线', result: '跨境往来符合历史经营基线' },
      { step: '资金链核查 · 背景', result: '合同发票齐备·交易背景清晰' },
    ],
  },
  {
    id: 'AML-2406-3205', subject: '示例科技（深圳）', rule: '异常对手方', amount: 124000,
    agentStatus: '已自动结案', confidence: 0.28, suggestion: '低风险·已自动结案归档', sla: '已结案',
    checks: [
      { step: '名单比对 · PEP/制裁', result: '无命中' },
      { step: '历史行为分析 · 对手方', result: '对手方为长期合作方·无异常' },
      { step: '资金链核查 · 流向', result: '资金流向清晰·用途合理' },
    ],
  },
  {
    id: 'AML-2406-3199', subject: '客户 CU-55103', rule: '现金密集', amount: 32000,
    agentStatus: '已自动结案', confidence: 0.24, suggestion: '低风险·已自动结案归档', sla: '已结案',
    checks: [
      { step: '名单比对 · 全量名单', result: '无命中' },
      { step: '历史行为分析 · 现金', result: '现金存取频次与营业额匹配' },
      { step: '资金链核查 · 流向', result: '无可疑分散迹象' },
    ],
  },
  {
    id: 'AML-2406-3188', subject: '某区域贸易行', rule: '可疑资金归集', amount: 458000,
    agentStatus: '已自动结案', confidence: 0.36, suggestion: '低风险·已自动结案归档', sla: '已结案',
    checks: [
      { step: '名单比对 · 不利信息', result: '无命中' },
      { step: '历史行为分析 · 归集', result: '归集为集团内资金归集·有授权链' },
      { step: '资金链核查 · 合规性', result: '符合内部资金集中管理制度' },
    ],
  },
  {
    id: 'AML-2406-3177', subject: '示例商贸（广州）', rule: '结构化拆分', amount: 89000,
    agentStatus: '已自动结案', confidence: 0.33, suggestion: '低风险·已自动结案归档', sla: '已结案',
    checks: [
      { step: '名单比对 · 全量名单', result: '无命中' },
      { step: '历史行为分析 · 拆分', result: '小额多笔为正常分批结算·非规避' },
      { step: '资金链核查 · 流向', result: '流向稳定供应商·背景清晰' },
    ],
  },
  {
    id: 'AML-2406-3165', subject: '客户 CU-44219', rule: '快进快出', amount: 67800,
    agentStatus: '已自动结案', confidence: 0.22, suggestion: '低风险·已自动结案归档', sla: '已结案',
    checks: [
      { step: '名单比对 · 制裁/PEP', result: '无命中' },
      { step: '历史行为分析 · 留存', result: '资金留存时长符合经营周转' },
      { step: '资金链核查 · 链路', result: '链路简单·无中转' },
    ],
  },
  {
    id: 'AML-2406-3152', subject: '示例科技（深圳）', rule: '高危地区', amount: 41200,
    agentStatus: '已自动结案', confidence: 0.19, suggestion: '低风险·已自动结案归档', sla: '已结案',
    checks: [
      { step: '名单比对 · 辖区', result: '辖区不在制裁/灰名单' },
      { step: '历史行为分析 · 跨境', result: '跨境往来频次平稳' },
      { step: '资金链核查 · 路径', result: '路径直接·无迂回' },
    ],
  },
  {
    id: 'AML-2406-3140', subject: '某区域贸易行', rule: '异常对手方', amount: 153000,
    agentStatus: '已自动结案', confidence: 0.41, suggestion: '低风险·已自动结案归档', sla: '已结案',
    checks: [
      { step: '名单比对 · 全量名单', result: '无命中' },
      { step: '历史行为分析 · 对手方', result: '新增对手方均为成立 > 3 年企业' },
      { step: '资金链核查 · 背景', result: '交易佐证齐备' },
    ],
  },
  {
    id: 'AML-2406-3128', subject: '客户 CU-33072', rule: '现金密集', amount: 58600,
    agentStatus: '已自动结案', confidence: 0.27, suggestion: '低风险·已自动结案归档', sla: '已结案',
    checks: [
      { step: '名单比对 · PEP', result: '无命中' },
      { step: '历史行为分析 · 现金', result: '现金占比与零售业态匹配' },
      { step: '资金链核查 · 流向', result: '无分散转出' },
    ],
  },
  {
    id: 'AML-2406-3115', subject: '示例商贸（广州）', rule: '可疑资金归集', amount: 76400,
    agentStatus: '已自动结案', confidence: 0.30, suggestion: '低风险·已自动结案归档', sla: '已结案',
    checks: [
      { step: '名单比对 · 全量名单', result: '无命中' },
      { step: '历史行为分析 · 归集', result: '归集为正常货款结算' },
      { step: '资金链核查 · 集中度', result: '收款集中度处正常区间' },
    ],
  },
];

// SLA 字符串 → 秒（仅 mm:ss 形式驱动 SlaChip 倒计时；其余直接显示文案）
function slaSeconds(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

type Tab = 'escalated' | 'all' | 'auto';
const ESCALATED_SET: AmlAgentStatus[] = ['已升级人工', '待人工'];

export default function AmlQueue() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('aml:read');
  const [tab, setTab] = useState<Tab>('escalated');
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (tab === 'escalated') return ALERTS.filter(a => ESCALATED_SET.includes(a.agentStatus));
    if (tab === 'auto') return ALERTS.filter(a => a.agentStatus === '已自动结案');
    return ALERTS;
  }, [tab]);

  const sel = openId ? ALERTS.find(a => a.id === openId) ?? null : null;

  // 处置堆叠条：规则类型 × (agent自动 / 人工)
  const dispChart = () => {
    const rules: AmlRuleType[] = ['结构化拆分', '快进快出', '异常对手方', '高危地区', '现金密集', '可疑资金归集'];
    const autoByRule = rules.map(r => ALERTS.filter(a => a.rule === r && (a.agentStatus === '已自动结案' || a.agentStatus === 'agent 处置中')).length + Math.round(N_AUTO / 9));
    const humanByRule = rules.map(r => ALERTS.filter(a => a.rule === r && ESCALATED_SET.includes(a.agentStatus)).length + (r === '结构化拆分' || r === '快进快出' ? 6 : 2));
    return {
      ...baseOption(),
      grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
      legend: {
        data: ['agent 自动处置', '升级人工'], top: 0, right: 0, itemWidth: 10, itemHeight: 10, itemGap: 16,
        textStyle: { color: cssVar('--text-2'), fontSize: 11 },
      },
      tooltip: { ...(baseOption().tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: rules, ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, interval: 0, fontSize: 10 } },
      yAxis: { type: 'value', ...axisStyle(), name: '告警量', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 } },
      series: [
        {
          name: 'agent 自动处置', type: 'bar', stack: 'd', data: autoByRule,
          itemStyle: { color: pass(), borderRadius: [0, 0, 0, 0] }, barWidth: '52%',
        },
        {
          name: '升级人工', type: 'bar', stack: 'd', data: humanByRule,
          itemStyle: { color: accent(), borderRadius: [3, 3, 0, 0] },
        },
      ],
    };
  };

  // ─── 列定义 ───────────────────────────────────────────────────────────
  const cols: Col<AmlAlert>[] = [
    {
      key: 'id', header: '告警 / 主体', width: 230,
      render: a => (
        <div className="col gap-1">
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.id}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{a.subject}</span>
        </div>
      ),
    },
    {
      key: 'rule', header: '触发规则', width: 168,
      render: a => (
        <div className="col gap-1">
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{a.rule}</span>
          <span className="t-small text-3" style={{ lineHeight: 1.35 }}>{RULE_DESC[a.rule]}</span>
        </div>
      ),
    },
    {
      key: 'amount', header: '涉及金额', num: true, width: 116, sortable: true,
      sortAccessor: a => a.amount,
      render: a => <span className="mononum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>¥{fmt(a.amount)}</span>,
    },
    {
      key: 'agent', header: 'Agent 分诊结论', width: 300,
      render: a => (
        <div className="col gap-2">
          <div className="row gap-2">
            <ScorePill score={a.confidence} />
            <span className="t-small text-2" style={{ lineHeight: 1.4 }}>{a.suggestion}</span>
          </div>
          <span className="t-small text-3" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Bot size={11} style={{ color: 'var(--gold)' }} />置信度 {a.confidence.toFixed(2)} · {a.checks?.length ?? 0} 步核查
          </span>
        </div>
      ),
    },
    {
      key: 'status', header: '状态', width: 120,
      render: a => {
        const m = STATUS_META[a.agentStatus];
        return <StatusBadge status={a.agentStatus} tone={m.tone} />;
      },
    },
    {
      key: 'sla', header: 'SLA', num: true, width: 88,
      render: a => {
        const secs = slaSeconds(a.sla);
        if (secs !== null) return <SlaChip seconds={secs} />;
        const dim = a.sla === '已结案';
        return <span className="mono t-small" style={{ color: dim ? 'var(--text-3)' : 'var(--text-2)' }}>{a.sla}</span>;
      },
    },
  ];

  if (!canRead) {
    return (
      <div className="page">
        <PageHeader title="AML 告警队列" subtitle="agentic 自主分诊 · 升级人工队列" />
        <Panel><div className="t-small text-3" style={{ padding: 20 }}>当前角色无 AML 告警查看权限（需合规官 / CISO）。</div></Panel>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="AML 告警队列"
        subtitle="agentic 自主分诊 · 常规告警分钟级结案，人工只啃升级件 · 核查链路可追溯"
        actions={
          <span className="row gap-2 t-small text-3">
            <span className="live-pulse" />本批实时分诊中 · 对标 ComplyAdvantage 口径
          </span>
        }
      />

      {/* ═══ 灵魂叙事：本批分诊水位条 ═══ */}
      <Panel
        title="本批告警分诊水位"
        icon={<Gauge size={13} />}
        right={
          <span className="row gap-2 t-small text-3">
            <Zap size={12} style={{ color: 'var(--gold)' }} />
            <span>从「天级人工逐条」压到「分钟级自主分诊」</span>
          </span>
        }
        style={{ marginBottom: 14 }}
      >
        <div className="row gap-5 wrap" style={{ alignItems: 'center' }}>
          {/* 左：大叙事数字 */}
          <div className="row gap-6" style={{ flexShrink: 0 }}>
            <div>
              <div className="label" style={{ marginBottom: 4 }}>本批告警</div>
              <div className="mononum" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1, letterSpacing: '-0.02em' }}>{BATCH_TOTAL}</div>
              <div className="t-small text-3" style={{ marginTop: 4 }}>条 · 多源规则触发</div>
            </div>
            <div>
              <div className="label" style={{ marginBottom: 4 }}>Agent 自主处置</div>
              <div className="mononum" style={{ fontSize: 30, fontWeight: 700, color: 'var(--success)', lineHeight: 1, letterSpacing: '-0.02em' }}>{AUTO_PCT}<span style={{ fontSize: 16 }}>%</span></div>
              <div className="t-small text-3" style={{ marginTop: 4 }}>常规告警免人工</div>
            </div>
            <div>
              <div className="label" style={{ marginBottom: 4 }}>升级人工</div>
              <div className="mononum" style={{ fontSize: 30, fontWeight: 700, color: 'var(--danger)', lineHeight: 1, letterSpacing: '-0.02em' }}>{N_ESCALATED}</div>
              <div className="t-small text-3" style={{ marginTop: 4 }}>条 · 合规官重点核</div>
            </div>
          </div>

          {/* 右：三段占比条（自绘真比例，非装饰）*/}
          <div className="flex-1" style={{ minWidth: 320 }}>
            <div className="row" style={{ height: 30, borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
              <div
                title={`已自动结案 ${N_AUTO} 条`}
                style={{ width: `${(N_AUTO / BATCH_TOTAL) * 100}%`, background: 'color-mix(in srgb, var(--success) 78%, transparent)', display: 'flex', alignItems: 'center', paddingLeft: 12, transition: 'width 0.8s var(--ease)' }}
              >
                <span className="mononum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-ink)' }}>{N_AUTO}</span>
              </div>
              <div
                title={`agent 处置中 ${N_RUNNING} 条`}
                style={{ width: `${(N_RUNNING / BATCH_TOTAL) * 100}%`, background: 'color-mix(in srgb, var(--gold) 82%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.8s var(--ease)' }}
              >
                <span className="mononum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-ink)' }}>{N_RUNNING}</span>
              </div>
              <div
                title={`升级人工 ${N_ESCALATED} 条`}
                style={{ width: `${(N_ESCALATED / BATCH_TOTAL) * 100}%`, background: 'color-mix(in srgb, var(--danger) 80%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12, transition: 'width 0.8s var(--ease)' }}
              >
                <span className="mononum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-ink)' }}>{N_ESCALATED}</span>
              </div>
            </div>
            <div className="row gap-4 wrap" style={{ marginTop: 10 }}>
              <Legend color="var(--success)" label="已自动结案" pct={Math.round((N_AUTO / BATCH_TOTAL) * 100)} />
              <Legend color="var(--gold)" label="agent 处置中" pct={Math.round((N_RUNNING / BATCH_TOTAL) * 100)} />
              <Legend color="var(--danger)" label="升级人工" pct={Math.round((N_ESCALATED / BATCH_TOTAL) * 100)} />
            </div>
          </div>
        </div>
      </Panel>

      {/* ═══ 主区：列表（左）+ 处置堆叠图（右）═══ */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 14, alignItems: 'start' }}>
        <Panel
          title="告警明细"
          icon={<Layers size={13} />}
          right={
            <div className="row gap-3">
              <span className="t-small text-3 mononum">{rows.length} 条</span>
              <Segmented<Tab>
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'escalated', label: '升级人工' },
                  { value: 'all', label: '全部' },
                  { value: 'auto', label: '已自动结案' },
                ]}
              />
            </div>
          }
          bodyClass="panel-body-0"
        >
          <DataTable<AmlAlert>
            cols={cols}
            rows={rows}
            rowKey={a => a.id}
            onRow={a => setOpenId(a.id)}
            defaultSort={{ key: 'amount', dir: 'desc' }}
            rowClass={a => (a.agentStatus === '已升级人工' ? 'dec-row dec-block' : a.agentStatus === '待人工' ? 'dec-row dec-review' : 'dec-row dec-pass')}
            empty={{ title: '该视图下暂无告警', desc: '切换分段查看其他状态', icon: <ListFilter size={34} /> }}
          />
        </Panel>

        <Panel title="处置归属 · 规则 × 处置方" icon={<Bot size={13} />} bodyClass="panel-body">
          <div className="t-small text-3" style={{ marginBottom: 6, lineHeight: 1.5 }}>
            绿 = agent 自动处置（占比 {AUTO_PCT}%）· 金 = 升级人工核处。结构化拆分 / 快进快出 类升级率最高。
          </div>
          <Chart build={dispChart} height={300} />
          <div className="col gap-2" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
            <KvRow label="本批名单比对" value="312 主体 · 命中疑似 5" />
            <KvRow label="平均分诊耗时" value="2.4 秒 / 条" mono />
            <KvRow label="人工节省" value="≈ 265 条免人工复核" />
          </div>
        </Panel>
      </div>

      {/* ═══ 抽屉：agent 已做的核查步骤 ═══ */}
      <Drawer
        open={!!sel}
        onClose={() => setOpenId(null)}
        title={sel ? sel.subject : ''}
        sub={sel ? `${sel.id} · ${sel.rule}` : ''}
        width={500}
      >
        {sel && (
          <div className="col gap-4">
            {/* 顶部结论卡 */}
            <div className="row gap-3" style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
              <ScorePill score={sel.confidence} />
              <div className="flex-1">
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{sel.suggestion}</div>
                <div className="t-small text-3" style={{ marginTop: 2 }}>涉及金额 ¥{fmt(sel.amount)} · 置信度 {sel.confidence.toFixed(2)}</div>
              </div>
              <StatusBadge status={sel.agentStatus} tone={STATUS_META[sel.agentStatus].tone} />
            </div>

            {/* agent 核查步骤（体现自主性）*/}
            <div>
              <div className="label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bot size={12} style={{ color: 'var(--gold)' }} />Agent 已执行核查步骤
              </div>
              <div className="tl">
                {(sel.checks ?? []).map((c, i) => (
                  <div key={i} className="tl-node tl-done">
                    <div className="row gap-2" style={{ marginBottom: 4 }}>
                      <span style={{ color: 'var(--gold)' }}>{CHECK_ICON[i] ?? <ScanLine size={13} />}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{c.step}</span>
                    </div>
                    <div
                      className="row gap-1"
                      style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--surface-2)', borderRadius: 6, padding: '6px 9px', lineHeight: 1.5 }}
                    >
                      <ChevronRight size={12} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-3)' }} />
                      <span>{c.result}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="t-small text-3" style={{ lineHeight: 1.6, paddingTop: 4 }}>
              以上核查由 agent 在分诊阶段自主完成并固化为证据链；升级件由合规官在此基础上复核，无需从零调查。
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ─── 小组件 ─────────────────────────────────────────────────────────────
function Legend({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <span className="row gap-2 t-small" style={{ color: 'var(--text-2)' }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />
      {label}
      <span className="mononum text-3">{pct}%</span>
    </span>
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
