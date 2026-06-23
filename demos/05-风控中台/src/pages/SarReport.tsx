import { useState } from 'react';
import {
  FileText, ShieldAlert, Cpu, User, Building2,
  Clock, CheckCircle2, Send, Save, ChevronRight,
  AlertTriangle, BarChart2, ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel, ScorePill } from '../components/sig';
import { toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, block as blockColor, review as reviewColor } from '../lib/chartTheme';
import { fmt } from '../lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import type { SarField, SarStatus } from '../types';

// ════════════════════════════════════════════════════════════════════════
// SAR 可疑交易报告生成
// 叙事：Agent 把调查从「天级人工整理」压到「分钟级自动预填」，合规官只做最终判断。
// 🔒 脱敏：示例消费金融 / 周某 / 示例商贸 / 账号 ****8842
// ════════════════════════════════════════════════════════════════════════

// ─── 案件主信息 ──────────────────────────────────────────────────────────
const CASE = {
  id: 'CASE-2406-0371',
  title: '套现团伙可疑资金归集',
  subject: '周某（账号 ****8842）',
  idNo: '3201**********5478',
  openedAt: '2026-06-18 14:22',
  type: '套现团伙 · 可疑资金归集',
  amount: 1826000,      // ¥182.6 万
  score: 0.94,
  signals: ['结构化拆分', '快进快出', '共享设备指纹', '高频整数交易', '可疑资金归集'],
  agentConclusion:
    'Agent 综合分析：主体账号 ****8842 与关联账户 ****2271、****5904、****0619 在 2026-06-11 至 06-18 期间形成「分散归集」模式——三个关联账户以每笔 ¥49,500 整数额度进行结构化拆分入账，累计 37 笔，资金在 4–6 小时内通过账号 ****8842 快速归集至收款方「示例商贸（广州）」，设备指纹核查发现 4 账户共享同一移动设备（设备 ID: DEV-8B2C），高度疑似套现团伙协同操作。命中可疑模式 5 项，综合置信度 0.94，建议提交 SAR 并上报银行反洗钱系统。',
};

// ─── 关联账户 ──────────────────────────────────────────────────────────
const RELATED_ACCOUNTS = [
  { id: 'ACC-****2271', name: '示例商贸（广州）', role: '关联账户 A', txnCount: 13, totalIn: 636500, devMatch: true },
  { id: 'ACC-****5904', name: '张某（个人）', role: '关联账户 B', txnCount: 12, totalIn: 594000, devMatch: true },
  { id: 'ACC-****0619', name: '林某（个人）', role: '关联账户 C', txnCount: 12, totalIn: 595500, devMatch: true },
];

// ─── 关联交易明细 ─────────────────────────────────────────────────────
const TRANSACTIONS = [
  { id: 'TXN-20260618-0031', ts: '06-18 09:14', from: 'ACC-****2271', to: '****8842', amount: 49500, pattern: '结构化拆分' },
  { id: 'TXN-20260618-0042', ts: '06-18 09:28', from: 'ACC-****5904', to: '****8842', amount: 49500, pattern: '结构化拆分' },
  { id: 'TXN-20260618-0057', ts: '06-18 10:02', from: 'ACC-****0619', to: '****8842', amount: 49500, pattern: '结构化拆分' },
  { id: 'TXN-20260618-0081', ts: '06-18 10:17', from: 'ACC-****2271', to: '****8842', amount: 49500, pattern: '结构化拆分' },
  { id: 'TXN-20260618-0094', ts: '06-18 11:48', from: '****8842',    to: '示例商贸（广州）', amount: 396000, pattern: '快进快出' },
  { id: 'TXN-20260617-2219', ts: '06-17 14:33', from: 'ACC-****5904', to: '****8842', amount: 49500, pattern: '结构化拆分' },
  { id: 'TXN-20260617-2238', ts: '06-17 14:51', from: 'ACC-****0619', to: '****8842', amount: 49500, pattern: '结构化拆分' },
  { id: 'TXN-20260617-2261', ts: '06-17 16:10', from: '****8842',    to: '示例商贸（广州）', amount: 297000, pattern: '快进快出' },
];

// ─── SAR 字段（agent 预填 · 支持编辑后变为 human）──────────────────────
const INITIAL_FIELDS: SarField[] = [
  {
    key: 'entity',
    label: '报告主体',
    value: '示例消费金融股份有限公司',
    source: 'ai',
  },
  {
    key: 'subject_name',
    label: '可疑主体姓名',
    value: '周某',
    source: 'ai',
  },
  {
    key: 'subject_id',
    label: '主体证件号',
    value: '3201**********5478',
    source: 'ai',
  },
  {
    key: 'suspect_pattern',
    label: '可疑模式叙述',
    value:
      '自 2026-06-11 起至 2026-06-18，周某名下账号 ****8842 与三个关联账户（****2271、****5904、****0619）形成结构化拆分 + 快进快出的复合可疑模式。具体表现为：三关联账户以每笔 ¥49,500 整数额度（低于人民银行 ¥50,000 大额申报阈值）分散入账，共计 37 笔，累计金额 ¥182.6 万；资金在 4–6 小时内经账号 ****8842 快速归集并转出至收款方「示例商贸（广州）」，过账留存时长极短，呈现通道账户特征。设备指纹核查显示四账户共享移动设备（DEV-8B2C），高度疑似同一控制主体协同操作。上述行为命中可疑交易报告指引中「化整为零规避申报阈值」及「资金快速过账」两类可疑情形。',
    source: 'ai',
    multiline: true,
  },
  {
    key: 'txn_summary',
    label: '关联交易明细摘要',
    value: '涉及账户 4 个（主账户 1 + 关联账户 3），交易笔数 37 笔，累计可疑金额 ¥1,826,000，交易时段 2026-06-11 至 2026-06-18，资金最终流向：示例商贸（广州）',
    source: 'ai',
  },
  {
    key: 'suspect_amount',
    label: '可疑金额（元）',
    value: '1,826,000',
    source: 'ai',
  },
  {
    key: 'suggested_action',
    label: '建议措施',
    value: '建议立即上报银行反洗钱系统，同步通知合规委员会；对账号 ****8842 及三关联账户实施临时冻结待核；配合监管机构要求提供完整交易流水及设备指纹记录。',
    source: 'ai',
    multiline: true,
  },
  {
    key: 'report_to',
    label: '上报机构',
    value: '中国人民银行反洗钱监测分析中心（CAMS）',
    source: 'ai',
  },
];

// ─── 交易时间分布（ECharts · 每日归集金额）──────────────────────────
const TX_DATE_DATA = [
  { date: '06-11', collect: 297000, passthrough: 264000 },
  { date: '06-12', collect: 247500, passthrough: 198000 },
  { date: '06-13', collect: 148500, passthrough: 148500 },
  { date: '06-14', collect: 198000, passthrough: 198000 },
  { date: '06-15', collect: 0,      passthrough: 0 },
  { date: '06-16', collect: 99000,  passthrough: 99000 },
  { date: '06-17', collect: 346500, passthrough: 297000 },
  { date: '06-18', collect: 594000, passthrough: 396000 },
];

// ─── 状态机步骤 ───────────────────────────────────────────────────────
const STATUS_STEPS: { value: SarStatus; label: string; icon: React.ReactNode }[] = [
  { value: '草稿',   label: '草稿',   icon: <FileText size={13} /> },
  { value: '复核中', label: '复核中', icon: <ShieldAlert size={13} /> },
  { value: '已上报', label: '已上报', icon: <CheckCircle2 size={13} /> },
];

export default function SarReport() {
  const { hasPermission } = useAuth();
  const canRead  = hasPermission('sar:read');
  const canWrite = hasPermission('sar:write');

  const [status, setStatus] = useState<SarStatus>('草稿');
  const [fields, setFields]   = useState<SarField[]>(INITIAL_FIELDS);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue,  setEditValue]  = useState('');

  // 权限无 sar:read
  if (!canRead) {
    return (
      <div className="page">
        <PageHeader title="SAR 可疑交易报告" subtitle="当前角色无 SAR 查看权限（需合规官 / CISO）。" />
      </div>
    );
  }

  // 编辑字段 → 徽标变 human
  function startEdit(f: SarField) {
    setEditingKey(f.key);
    setEditValue(f.value);
  }
  function commitEdit(key: string) {
    setFields(prev => prev.map(f => f.key === key ? { ...f, value: editValue, source: 'human' } : f));
    setEditingKey(null);
  }
  function cancelEdit() {
    setEditingKey(null);
  }

  // 状态流转
  const statusIdx = STATUS_STEPS.findIndex(s => s.value === status);

  function handleSaveDraft() {
    toast('草稿已保存', 'info');
  }
  function handleSubmitReview() {
    if (!canWrite) { toast('无权限：需要 sar:write', 'danger'); return; }
    setStatus('复核中');
    toast('已提交复核，等待合规官审核', 'success');
  }
  function handleConfirmReport() {
    if (!canWrite) { toast('无权限：需要 sar:write', 'danger'); return; }
    setStatus('已上报');
    toast('SAR 已确认上报至 CAMS', 'success');
  }

  // ─── 交易分布图 build ─────────────────────────────────────────────
  function buildTxChart() {
    const dates = TX_DATE_DATA.map(d => d.date);
    const collectData = TX_DATE_DATA.map(d => d.collect);
    const passData    = TX_DATE_DATA.map(d => d.passthrough);
    return {
      ...baseOption(),
      grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true },
      legend: {
        data: ['归集入账', '转出过账'], top: 4, right: 0, itemWidth: 9, itemHeight: 9, itemGap: 14,
        textStyle: { fontSize: 11 },
      },
      tooltip: { ...(baseOption().tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: dates, ...axisStyle() },
      yAxis: { type: 'value', ...axisStyle(), name: '金额（元）', nameTextStyle: { fontSize: 10 } },
      series: [
        {
          name: '归集入账', type: 'bar', stack: 'tx', data: collectData,
          itemStyle: { color: reviewColor(), borderRadius: [0, 0, 0, 0] }, barWidth: '55%',
        },
        {
          name: '转出过账', type: 'bar', stack: 'tx', data: passData,
          itemStyle: { color: blockColor(), borderRadius: [3, 3, 0, 0] },
        },
      ],
    };
  }

  // ─── 命中模式标签色 ──────────────────────────────────────────────
  const SIGNAL_COLOR: Record<string, string> = {
    '结构化拆分': 'var(--danger)',
    '快进快出': 'var(--danger)',
    '共享设备指纹': 'var(--warning)',
    '高频整数交易': 'var(--warning)',
    '可疑资金归集': 'var(--danger)',
  };

  const humanCount = fields.filter(f => f.source === 'human').length;

  return (
    <div className="page page-wide">
      <PageHeader
        title="SAR 可疑交易报告"
        subtitle="Agent 把调查从天级人工整理压到分钟级预填 · 合规官审改后一键上报 CAMS"
        actions={
          <div className="row gap-3">
            <span className="row gap-2 t-small text-3">
              <Cpu size={12} style={{ color: 'var(--gold)' }} />
              <span>Agent 预填 {fields.length} 字段</span>
            </span>
            {humanCount > 0 && (
              <span className="row gap-2 t-small" style={{ color: 'var(--success)' }}>
                <User size={12} />
                <span>人工已核 {humanCount} 项</span>
              </span>
            )}
          </div>
        }
      />

      {/* ═══ 顶部状态流转 ═══ */}
      <div
        className="card"
        style={{ marginBottom: 14, padding: '14px 20px' }}
      >
        <div className="row" style={{ alignItems: 'center', gap: 0 }}>
          {STATUS_STEPS.map((step, i) => {
            const isActive  = i === statusIdx;
            const isDone    = i < statusIdx;
            const color = isDone
              ? 'var(--success)'
              : isActive
              ? 'var(--gold)'
              : 'var(--text-3)';
            return (
              <div key={step.value} className="row" style={{ flex: 1, alignItems: 'center' }}>
                {/* 节点 */}
                <div className="row gap-2" style={{ alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: isDone
                      ? 'color-mix(in srgb, var(--success) 18%, transparent)'
                      : isActive
                      ? 'color-mix(in srgb, var(--gold) 18%, transparent)'
                      : 'var(--surface-2)',
                    border: `2px solid ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color, flexShrink: 0,
                    transition: 'all 0.3s var(--ease)',
                  }}>
                    {step.icon}
                  </div>
                  <div className="col" style={{ gap: 1 }}>
                    <span style={{
                      fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--text-1)' : isDone ? 'var(--success)' : 'var(--text-3)',
                    }}>
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="t-small text-3">当前阶段</span>
                    )}
                  </div>
                </div>
                {/* 连接线 */}
                {i < STATUS_STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2,
                    background: i < statusIdx
                      ? 'var(--success)'
                      : 'var(--hairline)',
                    margin: '0 8px',
                    transition: 'background 0.4s var(--ease)',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ 主区两栏 ═══ */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 580px', gap: 14, alignItems: 'start' }}>

        {/* ── 左栏：案件证据摘要 ── */}
        <div className="col gap-3">

          {/* 主体信息 */}
          <Panel
            title="案件主体"
            icon={<User size={13} />}
            right={<ScorePill score={CASE.score} />}
          >
            <div className="col gap-3">
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <KvBlock label="案件编号"  value={CASE.id} mono />
                <KvBlock label="案件类型"  value={CASE.type} />
                <KvBlock label="可疑主体"  value={CASE.subject} />
                <KvBlock label="证件号码"  value={CASE.idNo} mono />
                <KvBlock label="立案时间"  value={CASE.openedAt} />
                <KvBlock
                  label="可疑金额"
                  value={`¥${fmt(CASE.amount)}`}
                  mono
                  valueColor="var(--danger)"
                />
              </div>
            </div>
          </Panel>

          {/* 命中可疑模式 */}
          <Panel title="命中可疑模式" icon={<AlertTriangle size={13} />}>
            <div className="row gap-2 wrap">
              {CASE.signals.map(s => (
                <span
                  key={s}
                  className="badge"
                  style={{
                    background: `color-mix(in srgb, ${SIGNAL_COLOR[s] ?? 'var(--warning)'} 14%, transparent)`,
                    color: SIGNAL_COLOR[s] ?? 'var(--warning)',
                    fontSize: 11.5, fontWeight: 600,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </Panel>

          {/* 关联账户 */}
          <Panel title="关联账户" icon={<Building2 size={13} />} bodyClass="panel-body-0">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                  {['账户 ID', '名称', '角色', '交易笔数', '归集金额', '设备共享'].map(h => (
                    <th key={h} className="label" style={{ padding: '8px 14px', textAlign: h === '归集金额' || h === '交易笔数' ? 'right' : 'left', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RELATED_ACCOUNTS.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{ borderBottom: '1px solid var(--hairline)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}
                  >
                    <td className="mono" style={{ padding: '9px 14px', color: 'var(--text-3)', fontSize: 11.5 }}>{a.id}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: 'var(--text-1)' }}>{a.name}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-2)' }}>{a.role}</td>
                    <td className="mononum" style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--text-1)', fontWeight: 600 }}>{a.txnCount}</td>
                    <td className="mononum" style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--danger)', fontWeight: 700 }}>¥{fmt(a.totalIn)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                      {a.devMatch
                        ? <span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 14%, transparent)', color: 'var(--danger)' }}>命中</span>
                        : <span className="badge" style={{ background: 'color-mix(in srgb, var(--text-3) 10%, transparent)', color: 'var(--text-3)' }}>—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {/* 交易时间分布图 */}
          <Panel title="关联交易时间分布" icon={<BarChart2 size={13} />} right={
            <span className="t-small text-3">06-11 至 06-18 · 逐日归集 vs 转出</span>
          }>
            <div className="t-small text-3" style={{ marginBottom: 8, lineHeight: 1.5 }}>
              琥珀 = 归集入账 · 红 = 快速转出过账。06-18 当日归集金额激增，为触发上报阈值关键节点。
            </div>
            <Chart build={buildTxChart} height={188} deps={[]} />
          </Panel>

          {/* Agent 调查结论 */}
          <Panel title="Agent 调查结论" icon={<Cpu size={13} />} right={
            <span className="row gap-2">
              <span className="live-pulse" />
              <span className="t-small text-3">置信度 0.94</span>
            </span>
          }>
            <div
              style={{
                fontSize: 13, lineHeight: 1.75, color: 'var(--text-2)',
                padding: '4px 0',
                borderLeft: '2px solid var(--gold)',
                paddingLeft: 14,
              }}
            >
              {CASE.agentConclusion}
            </div>
            <div
              className="row gap-3"
              style={{
                marginTop: 14, padding: '10px 12px',
                borderRadius: 'var(--r-sm)',
                background: 'var(--surface-2)',
                border: '1px solid var(--hairline)',
              }}
            >
              <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid var(--hairline)', paddingRight: 12 }}>
                <div className="mononum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)', lineHeight: 1 }}>37</div>
                <div className="label" style={{ marginTop: 3 }}>可疑笔数</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid var(--hairline)', paddingRight: 12 }}>
                <div className="mononum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)', lineHeight: 1 }}>4</div>
                <div className="label" style={{ marginTop: 3 }}>关联账户</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid var(--hairline)', paddingRight: 12 }}>
                <div className="mononum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)', lineHeight: 1 }}>8</div>
                <div className="label" style={{ marginTop: 3 }}>调查天数</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div className="mononum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>3.2<span style={{ fontSize: 13 }}>分钟</span></div>
                <div className="label" style={{ marginTop: 3 }}>Agent 用时</div>
              </div>
            </div>
          </Panel>
        </div>

        {/* ── 右栏：SAR 表单 ── */}
        <div className="col gap-3">
          <Panel
            title="SAR 自动预填表单"
            icon={<FileText size={13} />}
            right={
              <div className="row gap-2">
                <span className="ai-badge"><Cpu size={10} />AI 草拟</span>
                {humanCount > 0 && <span className="human-badge"><User size={10} />已核 {humanCount}</span>}
              </div>
            }
          >
            <div className="col gap-0">
              {fields.map((f, i) => (
                <div
                  key={f.key}
                  style={{
                    borderBottom: i < fields.length - 1 ? '1px solid var(--hairline)' : 'none',
                    padding: '12px 0',
                  }}
                >
                  {/* 字段标题行 */}
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                      <span className="label">{f.label}</span>
                      {f.source === 'ai'
                        ? <span className="ai-badge"><Cpu size={10} />AI 草拟</span>
                        : <span className="human-badge"><User size={10} />人工已核</span>
                      }
                    </div>
                    {editingKey !== f.key && status !== '已上报' && (
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11, padding: '2px 10px', color: 'var(--gold)', border: '1px solid var(--hairline-strong)', background: 'transparent' }}
                        onClick={() => startEdit(f)}
                      >
                        编辑
                      </button>
                    )}
                  </div>

                  {/* 编辑态 */}
                  {editingKey === f.key ? (
                    <div className="col gap-2">
                      {f.multiline ? (
                        <textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          rows={6}
                          style={{
                            width: '100%', resize: 'vertical',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--hairline-strong)',
                            borderRadius: 'var(--r-sm)',
                            color: 'var(--text-1)',
                            fontFamily: 'inherit', fontSize: 13,
                            lineHeight: 1.7, padding: '9px 12px',
                            outline: 'none',
                          }}
                          autoFocus
                        />
                      ) : (
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          style={{
                            width: '100%',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--hairline-strong)',
                            borderRadius: 'var(--r-sm)',
                            color: 'var(--text-1)',
                            fontFamily: 'inherit', fontSize: 13,
                            padding: '8px 12px',
                            outline: 'none',
                          }}
                          autoFocus
                        />
                      )}
                      <div className="row gap-2">
                        <button
                          className="btn btn-sm"
                          style={{ background: accent(), color: 'var(--text-inverse)', fontWeight: 600, border: 'none' }}
                          onClick={() => commitEdit(f.key)}
                        >
                          确认
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--hairline)' }}
                          onClick={cancelEdit}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 只读态 */
                    <div
                      style={{
                        fontSize: 13, lineHeight: f.multiline ? 1.75 : 1.5,
                        color: 'var(--text-1)',
                        fontFamily: f.key === 'subject_id' || f.key === 'suspect_amount' ? 'var(--font-mono)' : 'inherit',
                        fontVariantNumeric: f.key === 'suspect_amount' ? 'tabular-nums' : 'normal',
                        whiteSpace: f.multiline ? 'pre-wrap' : 'normal',
                        cursor: status !== '已上报' ? 'text' : 'default',
                        padding: '2px 0',
                      }}
                      onClick={() => status !== '已上报' && startEdit(f)}
                    >
                      {f.key === 'suspect_amount'
                        ? <span className="mononum" style={{ color: 'var(--danger)', fontWeight: 700 }}>¥{f.value}</span>
                        : f.value
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* 关联交易明细（精简）*/}
          <Panel title="关联交易明细" icon={<ArrowRight size={13} />} bodyClass="panel-body-0">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                  {['时间', '转出方', '转入方', '金额', '模式'].map(h => (
                    <th key={h} className="label" style={{ padding: '7px 12px', textAlign: h === '金额' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TRANSACTIONS.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--hairline)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                    <td className="mono" style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 11 }}>{t.ts}</td>
                    <td className="mono" style={{ padding: '8px 12px', fontSize: 11.5, color: 'var(--text-2)' }}>{t.from}</td>
                    <td className="mono" style={{ padding: '8px 12px', fontSize: 11.5, color: 'var(--text-2)' }}>{t.to}</td>
                    <td className="mononum" style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: t.pattern === '快进快出' ? 'var(--danger)' : 'var(--warning)' }}>
                      ¥{fmt(t.amount)}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        className="badge"
                        style={{
                          background: `color-mix(in srgb, ${t.pattern === '快进快出' ? 'var(--danger)' : 'var(--warning)'} 13%, transparent)`,
                          color: t.pattern === '快进快出' ? 'var(--danger)' : 'var(--warning)',
                          fontSize: 10.5,
                        }}
                      >
                        {t.pattern}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {/* 底部操作按钮区 */}
          <div
            className="card row gap-3"
            style={{ padding: '14px 16px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
          >
            {/* 左：权限说明 */}
            <div className="col gap-1">
              {canWrite
                ? <span className="row gap-1 t-small" style={{ color: 'var(--success)' }}><CheckCircle2 size={12} />具备 sar:write 权限，可提交与上报</span>
                : <span className="row gap-1 t-small" style={{ color: 'var(--warning)' }}><AlertTriangle size={12} />当前角色仅可查阅，提交需 sar:write</span>
              }
              <span className="t-small text-3">
                {status === '草稿' && `草稿 · AI 预填 ${fields.length} 字段 · 人工已核 ${humanCount} 项`}
                {status === '复核中' && '复核中 · 等待合规委员会审核'}
                {status === '已上报' && '已上报至 CAMS · 流程完结'}
              </span>
            </div>

            {/* 右：按钮组 */}
            <div className="row gap-2">
              <button
                className="btn btn-sm row gap-1"
                style={{ border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--text-2)', padding: '7px 14px' }}
                onClick={handleSaveDraft}
                disabled={status === '已上报'}
              >
                <Save size={13} />保存草稿
              </button>
              <button
                className="btn btn-sm row gap-1"
                style={{
                  border: '1px solid var(--hairline-strong)',
                  background: 'color-mix(in srgb, var(--warning) 16%, transparent)',
                  color: 'var(--warning)',
                  padding: '7px 14px',
                  opacity: (!canWrite || status !== '草稿') ? 0.42 : 1,
                  cursor: (!canWrite || status !== '草稿') ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSubmitReview}
                disabled={!canWrite || status !== '草稿'}
              >
                <ChevronRight size={13} />提交复核
              </button>
              <button
                className="btn btn-sm row gap-1"
                style={{
                  border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
                  background: 'color-mix(in srgb, var(--danger) 18%, transparent)',
                  color: 'var(--danger)',
                  fontWeight: 700,
                  padding: '7px 16px',
                  opacity: (!canWrite || status !== '复核中') ? 0.42 : 1,
                  cursor: (!canWrite || status !== '复核中') ? 'not-allowed' : 'pointer',
                }}
                onClick={handleConfirmReport}
                disabled={!canWrite || status !== '复核中'}
              >
                <Send size={13} />确认上报
              </button>
            </div>
          </div>

          {/* 时间线：状态变更记录 */}
          <Panel title="流程记录" icon={<Clock size={13} />}>
            <div className="tl">
              <div className="tl-node tl-done">
                <div className="row gap-2" style={{ marginBottom: 3 }}>
                  <Cpu size={12} style={{ color: 'var(--gold)' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>Agent 自动调查并生成草稿</span>
                </div>
                <div className="t-small text-3">2026-06-18 14:22 · 7 个字段 AI 预填 · 耗时 3.2 分钟</div>
              </div>
              <div className={`tl-node ${status !== '草稿' ? 'tl-done' : ''}`}>
                <div className="row gap-2" style={{ marginBottom: 3 }}>
                  <User size={12} style={{ color: status !== '草稿' ? 'var(--gold)' : 'var(--text-3)' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: status !== '草稿' ? 'var(--text-1)' : 'var(--text-3)' }}>合规官审阅并提交复核</span>
                </div>
                <div className="t-small text-3">
                  {status !== '草稿' ? '2026-06-18 · 已提交复核' : '待操作'}
                </div>
              </div>
              <div className={`tl-node ${status === '已上报' ? 'tl-done' : ''}`}>
                <div className="row gap-2" style={{ marginBottom: 3 }}>
                  <Send size={12} style={{ color: status === '已上报' ? 'var(--gold)' : 'var(--text-3)' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: status === '已上报' ? 'var(--text-1)' : 'var(--text-3)' }}>上报至 CAMS</span>
                </div>
                <div className="t-small text-3">
                  {status === '已上报' ? '2026-06-18 · 已上报中国人民银行反洗钱监测分析中心' : '待完成复核后上报'}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── 局部小组件 ──────────────────────────────────────────────────────
function KvBlock({
  label, value, mono, valueColor,
}: {
  label: string; value: string; mono?: boolean; valueColor?: string;
}) {
  return (
    <div className="col gap-1">
      <span className="label">{label}</span>
      <span
        className={mono ? 'mononum' : ''}
        style={{ fontSize: 13, fontWeight: 600, color: valueColor ?? 'var(--text-1)', lineHeight: 1.4 }}
      >
        {value}
      </span>
    </div>
  );
}
