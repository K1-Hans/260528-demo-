import { useState, useMemo } from 'react';
import {
  Card, PageHeader, StatCard, SectionTitle,
} from '../components/ui';
import { DataTable, Pagination, type Col } from '../components/DataTable';
import { RiskBadge, StatusBadge, Toolbar, Drawer } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, cssVar, DRAW } from '../lib/chartTheme';
import { BUSINESS_LINES, CHANNELS } from '../lib/mockData';
import type { InspectionRecord, BusinessLine, Channel, RiskLevel, Emotion, InspectionStatus } from '../types';
import {
  ShieldCheck, Search, Download, ExternalLink, AlertTriangle,
  Clock, MessageSquare, Phone,
} from 'lucide-react';

// ─── 页面内 mock ───────────────────────────────────────────────────────────────
const EMOTION_LABEL: Record<Emotion, string> = {
  calm: '平静', happy: '满意', upset: '不满', angry: '激动',
};
const STATUS_META: Record<InspectionStatus, { label: string; tone: 'good' | 'warn' | 'bad' | 'info' | 'muted' }> = {
  ai_done:        { label: 'AI 完成', tone: 'good' },
  pending_review: { label: '待复核', tone: 'warn' },
  reviewed:       { label: '已复核', tone: 'good' },
  appealing:      { label: '申诉中', tone: 'info' },
  archived:       { label: '已归档', tone: 'muted' },
};

const MOCK_RECORDS: InspectionRecord[] = [
  { id: 'r01', sessionId: 'QC-2026061701523', agent: '赵越',   agentId: 'u4', businessLine: '逾期催收',   channel: '通话', totalScore: 52, violations: 3, emotionPeak: 'angry',  durationSec: 480, status: 'pending_review', risk: 'high', time: '2026-06-17 09:12' },
  { id: 'r02', sessionId: 'QC-2026061701498', agent: '孙琪',   agentId: 'u5', businessLine: '产品咨询',   channel: '在线', totalScore: 91, violations: 0, emotionPeak: 'calm',   durationSec: 212, status: 'ai_done',        risk: 'low',  time: '2026-06-17 09:08' },
  { id: 'r03', sessionId: 'QC-2026061701467', agent: '李明',   agentId: 'u7', businessLine: '提前结清',   channel: '通话', totalScore: 78, violations: 1, emotionPeak: 'upset',  durationSec: 337, status: 'ai_done',        risk: 'mid',  time: '2026-06-17 09:01' },
  { id: 'r04', sessionId: 'QC-2026061701445', agent: '王芳',   agentId: 'u8', businessLine: '注销合规',   channel: '在线', totalScore: 88, violations: 0, emotionPeak: 'calm',   durationSec: 195, status: 'ai_done',        risk: 'low',  time: '2026-06-17 08:55' },
  { id: 'r05', sessionId: 'QC-2026061701412', agent: '赵越',   agentId: 'u4', businessLine: '银行卡管理', channel: '通话', totalScore: 64, violations: 2, emotionPeak: 'upset',  durationSec: 291, status: 'reviewed',       risk: 'mid',  time: '2026-06-17 08:48' },
  { id: 'r06', sessionId: 'QC-2026061701388', agent: '张晨',   agentId: 'u9', businessLine: 'S客户路由',  channel: 'Bot',  totalScore: 95, violations: 0, emotionPeak: 'calm',   durationSec: 88,  status: 'ai_done',        risk: 'low',  time: '2026-06-17 08:44' },
  { id: 'r07', sessionId: 'QC-2026061701356', agent: '刘静',   agentId: 'u10',businessLine: '逾期催收',   channel: '通话', totalScore: 43, violations: 4, emotionPeak: 'angry',  durationSec: 623, status: 'pending_review', risk: 'high', time: '2026-06-17 08:39' },
  { id: 'r08', sessionId: 'QC-2026061701321', agent: '陈浩',   agentId: 'u11',businessLine: '产品咨询',   channel: '邮件', totalScore: 82, violations: 1, emotionPeak: 'calm',   durationSec: 0,   status: 'ai_done',        risk: 'low',  time: '2026-06-17 08:33' },
  { id: 'r09', sessionId: 'QC-2026061701299', agent: '孙琪',   agentId: 'u5', businessLine: '提前结清',   channel: '在线', totalScore: 71, violations: 1, emotionPeak: 'upset',  durationSec: 268, status: 'ai_done',        risk: 'mid',  time: '2026-06-17 08:27' },
  { id: 'r10', sessionId: 'QC-2026061701274', agent: '王芳',   agentId: 'u8', businessLine: '注销合规',   channel: '通话', totalScore: 55, violations: 2, emotionPeak: 'angry',  durationSec: 415, status: 'pending_review', risk: 'high', time: '2026-06-17 08:21' },
  { id: 'r11', sessionId: 'QC-2026061701248', agent: '李明',   agentId: 'u7', businessLine: '银行卡管理', channel: 'Bot',  totalScore: 97, violations: 0, emotionPeak: 'happy',  durationSec: 72,  status: 'ai_done',        risk: 'low',  time: '2026-06-17 08:18' },
  { id: 'r12', sessionId: 'QC-2026061701201', agent: '张晨',   agentId: 'u9', businessLine: '逾期催收',   channel: '通话', totalScore: 48, violations: 3, emotionPeak: 'angry',  durationSec: 542, status: 'reviewed',       risk: 'high', time: '2026-06-17 08:14' },
  { id: 'r13', sessionId: 'QC-2026061701183', agent: '刘静',   agentId: 'u10',businessLine: 'S客户路由',  channel: '在线', totalScore: 86, violations: 0, emotionPeak: 'calm',   durationSec: 134, status: 'ai_done',        risk: 'low',  time: '2026-06-17 08:09' },
  { id: 'r14', sessionId: 'QC-2026061701155', agent: '赵越',   agentId: 'u4', businessLine: '产品咨询',   channel: '通话', totalScore: 73, violations: 1, emotionPeak: 'calm',   durationSec: 310, status: 'appealing',      risk: 'mid',  time: '2026-06-17 08:05' },
  { id: 'r15', sessionId: 'QC-2026061701132', agent: '陈浩',   agentId: 'u11',businessLine: '提前结清',   channel: '在线', totalScore: 90, violations: 0, emotionPeak: 'happy',  durationSec: 188, status: 'ai_done',        risk: 'low',  time: '2026-06-17 08:01' },
  { id: 'r16', sessionId: 'QC-2026061701098', agent: '王芳',   agentId: 'u8', businessLine: '逾期催收',   channel: '通话', totalScore: 39, violations: 5, emotionPeak: 'angry',  durationSec: 718, status: 'pending_review', risk: 'high', time: '2026-06-17 07:58' },
];

// 每条会话对应的违规/详情文案（抽屉用）
interface SessionDetail {
  summary: string;
  violations: string[];
  scoreItems: { name: string; hit: boolean; deduction: number }[];
}

const SESSION_DETAILS: Record<string, SessionDetail> = {
  'QC-2026061701523': {
    summary: '逾期催收通话，催收人员出现威胁性措辞，客户情绪激化至激动，含禁语 3 处，年化利率未告知。',
    violations: ['催收红线：「再不还款就联系您单位同事」', '禁语命中：含威胁性措辞 2 处', '年化利率告知缺失'],
    scoreItems: [
      { name: '年化利率告知', hit: false, deduction: 20 },
      { name: '催收红线合规', hit: false, deduction: 25 },
      { name: '禁语筛查', hit: false, deduction: 3 },
      { name: '冷静期告知', hit: true, deduction: 0 },
      { name: '服务态度', hit: true, deduction: 0 },
    ],
  },
  'QC-2026061701356': {
    summary: '逾期催收通话时长 10 分钟，发现 4 处违规：禁语、承诺越权、未告知逾期后果、情绪安抚不足。',
    violations: ['禁语命中：「我保证今天一定让你过」', '承诺越权：保证下款', '逾期后果告知缺失', '情绪安抚评分不足'],
    scoreItems: [
      { name: '年化利率告知', hit: true, deduction: 0 },
      { name: '逾期后果告知', hit: false, deduction: 15 },
      { name: '承诺越权检测', hit: false, deduction: 20 },
      { name: '禁语筛查', hit: false, deduction: 12 },
      { name: '情绪安抚合规', hit: false, deduction: 10 },
    ],
  },
  'QC-2026061701274': {
    summary: '注销合规通话，未完整告知注销流程，客户情绪激动，含越权承诺。',
    violations: ['冷静期告知缺失', '承诺越权：「我保证给您办理成功」'],
    scoreItems: [
      { name: '冷静期告知', hit: false, deduction: 20 },
      { name: '承诺越权检测', hit: false, deduction: 25 },
      { name: '个人信息授权', hit: true, deduction: 0 },
      { name: '年化利率告知', hit: true, deduction: 0 },
    ],
  },
  'QC-2026061701098': {
    summary: '逾期催收通话超 12 分钟，出现 5 处严重违规，是今日最高风险会话。',
    violations: ['禁语命中 3 处（威胁+辱骂）', '催收红线：联系第三方', '承诺越权', '年化利率未告知', '逾期后果告知缺失'],
    scoreItems: [
      { name: '催收红线合规', hit: false, deduction: 30 },
      { name: '禁语筛查', hit: false, deduction: 15 },
      { name: '承诺越权检测', hit: false, deduction: 10 },
      { name: '年化利率告知', hit: false, deduction: 3 },
      { name: '逾期后果告知', hit: false, deduction: 3 },
    ],
  },
};

// 默认抽屉详情（通用）
function getDetail(record: InspectionRecord): SessionDetail {
  return SESSION_DETAILS[record.sessionId] ?? {
    summary: `${record.businessLine}${record.channel === '通话' ? '通话' : '会话'}，质检完成，共命中 ${record.violations} 处违规，总分 ${record.totalScore} 分。`,
    violations: record.violations > 0
      ? ['年化利率告知缺失'].slice(0, record.violations)
      : [],
    scoreItems: [
      { name: '年化利率告知', hit: record.totalScore >= 80, deduction: record.totalScore >= 80 ? 0 : 10 },
      { name: '冷静期告知', hit: record.violations === 0, deduction: 0 },
      { name: '禁语筛查', hit: true, deduction: 0 },
      { name: '服务态度', hit: true, deduction: 0 },
    ],
  };
}

// ─── 旭日图 option ──────────────────────────────────────────────────────────────
function buildSunburstOption() {
  const danger  = cssVar('--danger');
  const warning = cssVar('--warning');
  const success = cssVar('--success');
  const text1   = cssVar('--text-1');
  const text3   = cssVar('--text-3');
  const surface = cssVar('--surface-1');
  const hairline= cssVar('--hairline');
  const font    = "'Geist','PingFang SC',system-ui,sans-serif";

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: surface,
      borderColor: hairline,
      borderWidth: 1,
      padding: [9, 13],
      textStyle: { color: text1, fontSize: 12, fontFamily: font },
      extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.25);',
      formatter: (params: { name: string; value: number; treePathInfo?: { name: string }[] }) => {
        const path = params.treePathInfo?.map((n) => n.name).filter(Boolean).join(' › ') ?? params.name;
        return `<b>${params.name}</b><br/>${path}<br/>会话数：${params.value}`;
      },
    },
    series: [
      {
        type: 'sunburst',
        radius: ['18%', '88%'],
        center: ['50%', '50%'],
        nodeClick: false,
        ...DRAW,
        label: {
          fontSize: 11,
          fontFamily: font,
          color: text1,
          rotate: 'radial' as const,
          minAngle: 10,
        },
        itemStyle: { borderWidth: 2, borderColor: surface },
        levels: [
          {},
          {
            r0: '18%', r: '48%',
            label: { rotate: 0, fontSize: 12, fontWeight: 600, color: text1 },
            itemStyle: { borderWidth: 3 },
          },
          {
            r0: '50%', r: '88%',
            label: { fontSize: 10, color: text3 },
          },
        ],
        data: [
          {
            name: '逾期催收',
            itemStyle: { color: `color-mix(in srgb, ${danger} 28%, transparent)` },
            children: [
              { name: '高危', value: 108, itemStyle: { color: danger } },
              { name: '中风险', value: 59,  itemStyle: { color: `color-mix(in srgb, ${danger} 65%, ${warning})` } },
              { name: '低风险', value: 43,  itemStyle: { color: warning } },
            ],
          },
          {
            name: '产品咨询',
            itemStyle: { color: `color-mix(in srgb, ${success} 28%, transparent)` },
            children: [
              { name: '高危', value: 12,  itemStyle: { color: danger } },
              { name: '中风险', value: 38, itemStyle: { color: warning } },
              { name: '低风险', value: 187,itemStyle: { color: success } },
            ],
          },
          {
            name: '提前结清',
            itemStyle: { color: `color-mix(in srgb, ${warning} 28%, transparent)` },
            children: [
              { name: '高危', value: 28,  itemStyle: { color: danger } },
              { name: '中风险', value: 71, itemStyle: { color: warning } },
              { name: '低风险', value: 112,itemStyle: { color: success } },
            ],
          },
          {
            name: '注销合规',
            itemStyle: { color: `color-mix(in srgb, ${warning} 20%, transparent)` },
            children: [
              { name: '高危', value: 44,  itemStyle: { color: danger } },
              { name: '中风险', value: 63, itemStyle: { color: warning } },
              { name: '低风险', value: 89, itemStyle: { color: success } },
            ],
          },
          {
            name: '银行卡管理',
            itemStyle: { color: `color-mix(in srgb, ${success} 20%, transparent)` },
            children: [
              { name: '高危', value: 18,  itemStyle: { color: danger } },
              { name: '中风险', value: 42, itemStyle: { color: warning } },
              { name: '低风险', value: 201,itemStyle: { color: success } },
            ],
          },
          {
            name: 'S客户路由',
            itemStyle: { color: `color-mix(in srgb, ${success} 36%, transparent)` },
            children: [
              { name: '高危', value: 5,   itemStyle: { color: danger } },
              { name: '中风险', value: 22, itemStyle: { color: warning } },
              { name: '低风险', value: 218,itemStyle: { color: success } },
            ],
          },
        ],
      },
    ],
  };
}

// ─── 主组件 ────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

type RiskFilter = 'all' | 'high' | 'mid' | 'low';

const RISK_OPTIONS: { value: RiskFilter; label: string }[] = [
  { value: 'all', label: '全部风险' },
  { value: 'high', label: '高危' },
  { value: 'mid', label: '中风险' },
  { value: 'low', label: '低风险' },
];

function fmtDuration(sec: number): string {
  if (sec === 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtScore(n: number): string {
  return n.toFixed(0);
}

const CHANNEL_ICON = {
  通话: Phone,
  在线: MessageSquare,
  邮件: MessageSquare,
  Bot: MessageSquare,
} as const;

export default function List() {
  const [bizFilter, setBizFilter]     = useState<'' | BusinessLine>('');
  const [chFilter,  setChFilter]      = useState<'' | Channel>('');
  const [riskFilter, setRiskFilter]   = useState<RiskFilter>('all');
  const [search,    setSearch]        = useState('');
  const [page,      setPage]          = useState(1);
  const [drawerRec, setDrawerRec]     = useState<InspectionRecord | null>(null);

  // ─── 筛选 ────
  const filtered = useMemo(() => {
    let rows = MOCK_RECORDS;
    if (bizFilter)               rows = rows.filter(r => r.businessLine === bizFilter);
    if (chFilter)                rows = rows.filter(r => r.channel === chFilter);
    if (riskFilter !== 'all')    rows = rows.filter(r => r.risk === riskFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        r.sessionId.toLowerCase().includes(q) ||
        r.agent.toLowerCase().includes(q) ||
        r.businessLine.includes(q),
      );
    }
    return rows;
  }, [bizFilter, chFilter, riskFilter, search]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // 重置页码
  const resetPage = () => setPage(1);

  // ─── 列定义 ──────────────────────────────────────────────────────────────────
  const cols: Col<InspectionRecord>[] = [
    {
      key: 'sessionId',
      header: '会话 ID',
      width: 180,
      render: r => <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.sessionId}</span>,
    },
    {
      key: 'agent',
      header: '坐席',
      width: 80,
      render: r => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 24, height: 24, borderRadius: 4, background: 'var(--gold-dim)', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
            {r.agent[0]}
          </span>
          {r.agent}
        </span>
      ),
    },
    {
      key: 'businessLine',
      header: '业务线',
      width: 100,
      render: r => <span className="svc-pill">{r.businessLine}</span>,
      sortable: true,
      sortAccessor: r => r.businessLine,
    },
    {
      key: 'channel',
      header: '渠道',
      width: 72,
      render: r => {
        const Icon = CHANNEL_ICON[r.channel] ?? MessageSquare;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2)', fontSize: 12 }}>
            <Icon size={13} style={{ opacity: 0.65 }} />
            {r.channel}
          </span>
        );
      },
    },
    {
      key: 'totalScore',
      header: '总分',
      num: true,
      width: 64,
      sortable: true,
      sortAccessor: r => r.totalScore,
      render: r => {
        const color = r.totalScore >= 80
          ? 'var(--success)'
          : r.totalScore >= 60
          ? 'var(--warning)'
          : 'var(--danger)';
        return (
          <span className="mono tnum" style={{ fontWeight: 700, color, fontSize: 14 }}>
            {fmtScore(r.totalScore)}
          </span>
        );
      },
    },
    {
      key: 'violations',
      header: '违规项',
      num: true,
      width: 64,
      sortable: true,
      sortAccessor: r => r.violations,
      render: r => r.violations > 0
        ? <span className="tnum" style={{ color: 'var(--danger)', fontWeight: 600 }}>{r.violations}</span>
        : <span className="tnum" style={{ color: 'var(--success)' }}>0</span>,
    },
    {
      key: 'emotionPeak',
      header: '情绪峰值',
      width: 80,
      render: r => {
        const color = r.emotionPeak === 'angry'
          ? 'var(--danger)'
          : r.emotionPeak === 'upset'
          ? 'var(--warning)'
          : r.emotionPeak === 'happy'
          ? 'var(--success)'
          : 'var(--text-3)';
        return (
          <span style={{ color, fontSize: 12 }}>{EMOTION_LABEL[r.emotionPeak]}</span>
        );
      },
    },
    {
      key: 'risk',
      header: '风险等级',
      width: 90,
      sortable: true,
      sortAccessor: r => r.risk === 'high' ? 0 : r.risk === 'mid' ? 1 : 2,
      render: r => <RiskBadge level={r.risk as RiskLevel} />,
    },
    {
      key: 'status',
      header: '状态',
      width: 90,
      render: r => {
        const meta = STATUS_META[r.status];
        return <StatusBadge status={meta.label} tone={meta.tone} />;
      },
    },
    {
      key: 'durationSec',
      header: '时长',
      num: true,
      width: 60,
      render: r => <span className="mono tnum" style={{ fontSize: 12 }}>{fmtDuration(r.durationSec)}</span>,
    },
    {
      key: 'time',
      header: '质检时间',
      width: 130,
      render: r => <span className="mono tnum" style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.time}</span>,
    },
  ];

  // ─── 抽屉内容 ────────────────────────────────────────────────────────────────
  const detail = drawerRec ? getDetail(drawerRec) : null;

  return (
    <div className="page">
      <PageHeader
        title="全量对话/通话列表"
        subtitle="100% 全量 AI 质检结果 · 取代传统 1–3% 人工抽检 · 今日截至当前"
        actions={
          <button className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} />
            导出
          </button>
        }
      />

      {/* ─── KPI 带 ─────────────────────────────────────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard
          label="今日全量质检"
          raw={48620}
          unit="条"
          change={12}
          spark={[38200, 41300, 43800, 45200, 46900, 47100, 48620]}
          icon={<ShieldCheck size={18} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="高风险会话"
          raw={312}
          unit="条"
          change={-8}
          spark={[290, 340, 315, 380, 298, 322, 312]}
          icon={<AlertTriangle size={18} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="待复核"
          raw={86}
          unit="条"
          change={4}
          spark={[70, 78, 65, 90, 82, 88, 86]}
          delayClass="reveal-3"
        />
        <StatCard
          label="平均质检分"
          raw={83.6}
          unit="分"
          decimals={1}
          change={2}
          spark={[79.2, 80.5, 81.1, 82.3, 83.0, 83.4, 83.6]}
          delayClass="reveal-4"
        />
      </div>

      {/* ─── 旭日图 风险分布 ──────────────────────────────────────────────── */}
      <Card className="reveal-5" style={{ marginBottom: 24, padding: 20 }}>
        <SectionTitle
          right={
            <span className="t-small text-3">
              业务线 → 风险等级三层分布 · 今日 48,620 条
            </span>
          }
        >
          风险分布（旭日图）
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, alignItems: 'center' }}>
          <Chart build={buildSunburstOption} height={320} />
          <div style={{ padding: '0 24px' }}>
            <div className="col" style={{ gap: 12 }}>
              {[
                { label: '高危', color: 'var(--danger)', count: 215, pct: 69 },
                { label: '中风险', color: 'var(--warning)', count: 295, pct: 95 },
                { label: '低风险', color: 'var(--success)', count: 850, pct: 100 },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                  <span style={{ minWidth: 56, fontSize: 13, color: 'var(--text-2)' }}>{item.label}</span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 3 }} />
                  </div>
                  <span className="tnum" style={{ minWidth: 36, textAlign: 'right', fontSize: 12, color: item.color, fontWeight: 600 }}>{item.count}</span>
                </div>
              ))}
              <div className="divider" style={{ margin: '4px 0' }} />
              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                <div>合规项 AI 准确率 <span style={{ color: 'var(--success)', fontWeight: 700 }}>100%</span></div>
                <div>客服质检准确率 <span style={{ fontWeight: 700 }}>99%</span></div>
                <div>电销质检准确率 <span style={{ fontWeight: 700 }}>96%</span></div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── 筛选 Toolbar ─────────────────────────────────────────────────── */}
      <Card className="reveal-6" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <Toolbar>
          {/* 搜索 */}
          <div className="input-wrap input-icon" style={{ flex: 1, minWidth: 200, maxWidth: 280 }}>
            <Search size={14} className="input-icon-el" style={{ color: 'var(--text-3)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="搜索会话 ID / 坐席…"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
            />
          </div>

          {/* 业务线 */}
          <select
            className="input"
            style={{ minWidth: 120 }}
            value={bizFilter}
            onChange={e => { setBizFilter(e.target.value as '' | BusinessLine); resetPage(); }}
          >
            <option value="">全部业务线</option>
            {BUSINESS_LINES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          {/* 渠道 */}
          <select
            className="input"
            style={{ minWidth: 96 }}
            value={chFilter}
            onChange={e => { setChFilter(e.target.value as '' | Channel); resetPage(); }}
          >
            <option value="">全部渠道</option>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* 风险 Segmented */}
          <div className="row gap-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)', padding: 3 }}>
            {RISK_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => { setRiskFilter(o.value); resetPage(); }}
                className="btn btn-sm"
                style={{
                  background: riskFilter === o.value ? 'var(--surface-1)' : 'transparent',
                  color: riskFilter === o.value
                    ? o.value === 'high' ? 'var(--danger)' : o.value === 'mid' ? 'var(--warning)' : o.value === 'low' ? 'var(--success)' : 'var(--text-1)'
                    : 'var(--text-3)',
                  border: riskFilter === o.value ? '1px solid var(--hairline)' : '1px solid transparent',
                  boxShadow: riskFilter === o.value ? 'var(--elev-1)' : 'none',
                  fontWeight: riskFilter === o.value ? 600 : 400,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* 条数统计 */}
          <span className="t-small text-3 tnum" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
            {filtered.length.toLocaleString('zh-CN')} 条
          </span>
        </Toolbar>

        {/* ─── 数据表 ─── */}
        <DataTable
          cols={cols}
          rows={pageRows}
          rowKey={r => r.id}
          onRow={r => setDrawerRec(r)}
          empty={{ title: '暂无质检记录', desc: '调整筛选条件后重试', icon: <Clock size={34} /> }}
          defaultSort={{ key: 'time', dir: 'desc' }}
        />

        <Pagination
          page={page}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      </Card>

      {/* ─── 会话详情抽屉 ─────────────────────────────────────────────────── */}
      {drawerRec && detail && (
        <Drawer
          open={!!drawerRec}
          onClose={() => setDrawerRec(null)}
          title={`会话 ${drawerRec.sessionId}`}
          sub={`${drawerRec.businessLine} · ${drawerRec.channel} · ${drawerRec.agent} · ${drawerRec.time}`}
          width={500}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setDrawerRec(null)}>关闭</button>
              <button
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  setDrawerRec(null);
                }}
              >
                <ExternalLink size={13} />
                进入质检工作台
              </button>
            </>
          }
        >
          {/* 会话基本信息 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: '坐席', value: drawerRec.agent },
              { label: '业务线', value: drawerRec.businessLine },
              { label: '渠道', value: drawerRec.channel },
              { label: '通话时长', value: fmtDuration(drawerRec.durationSec) },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
                <div className="t-small text-3" style={{ marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* 总分 + 风险 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)', padding: '14px 16px' }}>
            <div>
              <div className="t-small text-3" style={{ marginBottom: 2 }}>质检总分</div>
              <div
                className="mono tnum"
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: drawerRec.totalScore >= 80 ? 'var(--success)' : drawerRec.totalScore >= 60 ? 'var(--warning)' : 'var(--danger)',
                  lineHeight: 1,
                }}
              >
                {drawerRec.totalScore}
              </div>
            </div>
            <div className="divider" style={{ width: 1, height: 40, margin: 0 }} />
            <div>
              <div className="t-small text-3" style={{ marginBottom: 6 }}>风险等级</div>
              <RiskBadge level={drawerRec.risk as RiskLevel} />
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div className="t-small text-3" style={{ marginBottom: 6 }}>状态</div>
              <StatusBadge status={STATUS_META[drawerRec.status].label} tone={STATUS_META[drawerRec.status].tone} />
            </div>
          </div>

          {/* 摘要 */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>会话摘要</div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>{detail.summary}</p>
          </div>

          {/* 命中违规项 */}
          {detail.violations.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="section-label" style={{ marginBottom: 8, color: 'var(--danger)' }}>
                命中违规项（{detail.violations.length}）
              </div>
              <div className="col" style={{ gap: 6 }}>
                {detail.violations.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      background: 'color-mix(in srgb, var(--danger) 7%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)',
                      borderLeft: '3px solid var(--danger)',
                      borderRadius: 'var(--r-sm)',
                      padding: '8px 12px',
                      fontSize: 12,
                      color: 'var(--text-1)',
                    }}
                  >
                    <AlertTriangle size={13} style={{ color: 'var(--danger)', marginTop: 1, flexShrink: 0 }} />
                    {v}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 评分项命中 */}
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>质检评分项</div>
            <div className="col" style={{ gap: 4 }}>
              {detail.scoreItems.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--surface-2)',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--hairline)',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 1, background: item.hit ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }} />
                    {item.name}
                  </div>
                  <span style={{ color: item.hit ? 'var(--success)' : 'var(--danger)', fontWeight: 600, fontSize: 12 }}>
                    {item.hit ? '✓ 通过' : `−${item.deduction} 分`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
