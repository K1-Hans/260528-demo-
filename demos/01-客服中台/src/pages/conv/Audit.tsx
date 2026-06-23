import { useMemo, useState } from 'react';
import { ShieldCheck, Download, FileCheck2, Ban, PenLine, Lock } from 'lucide-react';
import { Card, PageHeader, SectionTitle, Segmented } from '../../components/ui';
import { DataTable, type Col } from '../../components/DataTable';
import { toast } from '../../components/kit';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar } from '../../lib/chartTheme';
import type { AuditRow, AuditVerdict, ComplianceRule } from '../../types';

const VERDICT_TONE: Record<AuditVerdict, string> = { 通过: 'var(--success)', 拦截: 'var(--warning)', 改写: 'var(--info)' };

const ROWS: AuditRow[] = [
  { id: 'a1', time: '09:41:03', sessionId: 'sess_8f3a21', customerMsg: '我还款一直失败是怎么回事', aiReply: '亲亲~还款失败通常是绑定银行卡余额不足…', verdict: '通过', confidence: 0.99, reviewer: 'A4 规则引擎' },
  { id: 'a2', time: '09:39:16', sessionId: 'sess_a72b09', customerMsg: '你们再不解决我就投诉到银保监会！', aiReply: '理解您的着急，我会立即为您转接人工…', verdict: '改写', rule: '越权承诺', confidence: 0.94, reviewer: 'A4 + LLM 安全审' },
  { id: 'a3', time: '09:40:13', sessionId: 'sess_5d1e88', customerMsg: '提前结清要手续费吗', aiReply: '建议您在 APP 账单查看实时明细…', verdict: '通过', confidence: 0.97, reviewer: 'A4 规则引擎' },
  { id: 'a4', time: '09:37:55', sessionId: 'sess_3b1c77', customerMsg: '你们利率是不是 0 啊', aiReply: '（原文「年化 0% 无任何费用」）', verdict: '拦截', rule: '利率虚假宣传', confidence: 0.96, reviewer: 'A4 规则引擎' },
  { id: 'a5', time: '09:36:21', sessionId: 'sess_9a0e12', customerMsg: '多久能放款', aiReply: '（原文「保证 2 小时内到账」→ 改写为查询引导）', verdict: '改写', rule: '违规承诺', confidence: 0.92, reviewer: 'A4 + LLM 安全审' },
  { id: 'a6', time: '09:34:08', sessionId: 'sess_77bd13', customerMsg: '注销账户怎么这么麻烦', aiReply: '理解给您带来的不便，注销需确保无在贷余额…', verdict: '通过', confidence: 0.98, reviewer: 'A4 规则引擎' },
  { id: 'a7', time: '09:32:44', sessionId: 'sess_61ff90', customerMsg: '帮我查下我手机号绑定的账户', aiReply: '（原文含手机号回显 138****）', verdict: '拦截', rule: 'PII 泄漏', confidence: 0.95, reviewer: 'A4 规则引擎' },
  { id: 'a8', time: '09:30:56', sessionId: 'sess_91ae04', customerMsg: '会员怎么退费', aiReply: '会员退费可在「我的-会员中心-退费申请」…', verdict: '通过', confidence: 0.99, reviewer: 'A4 规则引擎' },
  { id: 'a9', time: '09:29:31', sessionId: 'sess_44c2a8', customerMsg: '催收老打电话给我家人', aiReply: '非常抱歉给您带来困扰，已记录并优先核实…', verdict: '通过', confidence: 0.97, reviewer: 'A4 + LLM 安全审' },
  { id: 'a10', time: '09:27:19', sessionId: 'sess_08de5f', customerMsg: '我不想还了能不能不还', aiReply: '（原文「可以帮您减免」→ 拦截）', verdict: '拦截', rule: '违规承诺', confidence: 0.93, reviewer: 'A4 规则引擎' },
  { id: 'a11', time: '09:25:02', sessionId: 'sess_7b13c4', customerMsg: '账单分期怎么弄', aiReply: '账单分期可在「我的账单-分期」发起…', verdict: '通过', confidence: 0.98, reviewer: 'A4 规则引擎' },
  { id: 'a12', time: '09:22:48', sessionId: 'sess_2af671', customerMsg: '逾期了会怎么样', aiReply: '逾期可能影响征信，建议尽快处理…（含合规提示）', verdict: '通过', confidence: 0.96, reviewer: 'A4 规则引擎' },
  { id: 'a13', time: '09:20:33', sessionId: 'sess_5c8e10', customerMsg: '客服电话多少', aiReply: '人工服务热线 400-800-1234，服务时间 08:00–21:00', verdict: '通过', confidence: 0.99, reviewer: 'A4 规则引擎' },
  { id: 'a14', time: '09:18:05', sessionId: 'sess_d3a9b2', customerMsg: '能不能帮我催一下放款', aiReply: '（原文「马上给您放 5000」→ 拦截）', verdict: '拦截', rule: '违规承诺', confidence: 0.91, reviewer: 'A4 规则引擎' },
  { id: 'a15', time: '09:15:47', sessionId: 'sess_e012ff', customerMsg: '我要查我的额度', aiReply: '可在 APP 首页顶部查看可用额度…', verdict: '通过', confidence: 0.98, reviewer: 'A4 规则引擎' },
  { id: 'a16', time: '09:12:20', sessionId: 'sess_aa71c0', customerMsg: '你们是不是骗子公司', aiReply: '我们是持牌消费金融机构，很抱歉让您有此顾虑…', verdict: '通过', confidence: 0.95, reviewer: 'A4 + LLM 安全审' },
];

const PASS_TREND = [
  { date: '06-10', rate: 99.8 }, { date: '06-11', rate: 100 }, { date: '06-12', rate: 99.9 },
  { date: '06-13', rate: 100 }, { date: '06-14', rate: 100 }, { date: '06-15', rate: 99.9 }, { date: '06-16', rate: 100 },
];
const BLOCK_DIST: { name: ComplianceRule; value: number }[] = [
  { name: '违规承诺', value: 38 }, { name: '利率虚假宣传', value: 24 }, { name: '越权承诺', value: 19 },
  { name: 'PII 泄漏', value: 11 }, { name: '催收红线', value: 8 }, { name: '幻觉编造', value: 5 },
];

export default function Audit() {
  const [filter, setFilter] = useState<'all' | AuditVerdict>('all');
  const rows = filter === 'all' ? ROWS : ROWS.filter(r => r.verdict === filter);
  const counts = { 通过: ROWS.filter(r => r.verdict === '通过').length, 拦截: ROWS.filter(r => r.verdict === '拦截').length, 改写: ROWS.filter(r => r.verdict === '改写').length };

  const passTrend = useMemo(() => () => ({
    ...baseOption(),
    tooltip: { trigger: 'axis' as const, ...(baseOption().tooltip as object) },
    grid: { left: 8, right: 14, top: 20, bottom: 6, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: PASS_TREND.map(d => d.date), ...axisStyle() },
    yAxis: { type: 'value', min: 95, max: 100, ...axisStyle(), axisLabel: { formatter: '{value}%', color: cssVar('--text-3'), fontSize: 11 } },
    series: [{
      type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: PASS_TREND.map(d => d.rate),
      lineStyle: { width: 2.5, color: cssVar('--danger') }, itemStyle: { color: cssVar('--danger') },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(226,85,95,0.20)' }, { offset: 1, color: 'rgba(226,85,95,0)' }] } },
      markLine: { silent: true, symbol: 'none', lineStyle: { color: cssVar('--text-3'), type: 'dashed', width: 1 }, label: { formatter: '目标 100%', color: cssVar('--text-3'), fontSize: 10 }, data: [{ yAxis: 100 }] },
      animationDuration: 1000,
    }],
  }), []);

  const blockDist = useMemo(() => () => ({
    ...baseOption(),
    tooltip: { trigger: 'item' as const, ...(baseOption().tooltip as object), formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: ['42%', '72%'], center: ['50%', '52%'], roseType: 'radius' as const,
      itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2, borderRadius: 4 },
      label: { color: cssVar('--text-3'), fontSize: 10 },
      data: BLOCK_DIST.map((d, i) => ({ name: d.name, value: d.value, itemStyle: { color: [cssVar('--danger'), cssVar('--warning'), cssVar('--c4'), cssVar('--info'), cssVar('--c6'), cssVar('--c8')][i] } })),
      animationDuration: 900,
    }],
  }), []);

  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s;
  const cols: Col<AuditRow>[] = [
    { key: 'time', header: '时间', width: 80, render: r => <span className="mono t-small text-3">{r.time}</span> },
    { key: 'sessionId', header: '会话 ID', width: 110, render: r => <span className="mono t-small" style={{ color: 'var(--text-2)' }}>{r.sessionId}</span> },
    { key: 'customerMsg', header: '客户消息', render: r => <span style={{ color: 'var(--text-1)' }}>{trunc(r.customerMsg, 20)}</span> },
    { key: 'aiReply', header: 'AI 回复', render: r => <span className="text-3">{trunc(r.aiReply, 24)}</span> },
    { key: 'verdict', header: 'A4 判定', width: 84, render: r => <span className="badge" style={{ background: `color-mix(in srgb, ${VERDICT_TONE[r.verdict]} 14%, transparent)`, color: VERDICT_TONE[r.verdict] }}>{r.verdict}</span> },
    { key: 'rule', header: '触发规则', width: 110, render: r => r.rule ? <span className="tag" style={{ color: 'var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' }}>{r.rule}</span> : <span className="text-3">—</span> },
    { key: 'confidence', header: '置信度', width: 96, num: true, sortable: true, sortAccessor: r => r.confidence, render: r => <span className="mono tnum" style={{ color: 'var(--text-2)' }}>{(r.confidence * 100).toFixed(0)}%</span> },
    { key: 'reviewer', header: '审核 Agent', width: 130, render: r => <span className="t-small text-3">{r.reviewer}</span> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="合规审计中心"
        subtitle="100% AI 输出留痕 · 金融监管零幻觉容忍 · 呼应 EU AI Act 2026.08"
        actions={<button className="btn btn-ghost" onClick={() => toast('审计报告已生成（演示）·audit_20260616.xlsx', 'success')}><Download size={14} />导出审计报告</button>}
      />

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
        {[
          { icon: <Lock size={16} />, label: '输出留痕率', val: '100', unit: '%', tone: 'var(--danger)' },
          { icon: <FileCheck2 size={16} />, label: '今日审计', val: String(ROWS.length * 96), unit: '条', tone: 'var(--success)' },
          { icon: <Ban size={16} />, label: '拦截', val: String(counts.拦截 * 7), unit: '例', tone: 'var(--warning)' },
          { icon: <PenLine size={16} />, label: '改写', val: String(counts.改写 * 7), unit: '例', tone: 'var(--info)' },
        ].map((s, i) => (
          <Card key={i} className={`reveal reveal-${i + 1}`}>
            <div className="row spread" style={{ marginBottom: 8 }}><span className="label">{s.label}</span><span style={{ color: s.tone, opacity: 0.8 }}>{s.icon}</span></div>
            <div className="kpi-value">{s.val}<span className="kpi-unit">{s.unit}</span></div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.6fr 1fr', marginBottom: 16 }}>
        <Card className="reveal"><SectionTitle right={<span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}>近 7 日 ≈ 100%</span>}>合规通过率趋势</SectionTitle><Chart build={passTrend} height={236} /></Card>
        <Card className="reveal reveal-2"><SectionTitle>拦截类型分布</SectionTitle><Chart build={blockDist} height={236} /></Card>
      </div>

      <Card className="reveal card-pad-0">
        <div className="row spread" style={{ padding: '16px 20px' }}>
          <span className="row gap-2"><ShieldCheck size={16} style={{ color: 'var(--danger)' }} /><span className="t-h3">审计流水</span><span className="t-small text-3">不可篡改 · 全程留痕</span></span>
          <Segmented options={[{ value: 'all', label: '全部' }, { value: '通过', label: '通过' }, { value: '拦截', label: '拦截' }, { value: '改写', label: '改写' }]} value={filter} onChange={(v: string) => setFilter(v as 'all' | AuditVerdict)} />
        </div>
        <DataTable cols={cols} rows={rows} rowKey={r => r.id} empty={{ title: '无审计记录' }} />
      </Card>
    </div>
  );
}
