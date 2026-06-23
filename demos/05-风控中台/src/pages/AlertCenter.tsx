import { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, Filter, ShieldAlert, ShieldX,
  ThumbsDown, ThumbsUp, Users, XCircle, Zap,
} from 'lucide-react';
import { PageHeader, Segmented, StatCard } from '../components/ui';
import { Panel, SlaChip } from '../components/sig';
import { RiskBadge, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, block, pass, review } from '../lib/chartTheme';
import { fmt } from '../lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import type { AlertTicket, RiskLevel } from '../types';

// ── mock 数据（14 条，真实风控场景）──────────────────────────────────────────
const MOCK_TICKETS: AlertTicket[] = [
  {
    id: 'ALT-2024-0881', subject: '小云账户 U-88214', card: '****7732',
    riskTag: '账户接管', level: 'high', amount: 128000, slaLeft: 42,
    stage: '待分诊', channel: '账户转账', createdAt: '09:14:38', feedback: undefined,
  },
  {
    id: 'ALT-2024-0882', subject: '小云账户 U-45601', card: '****3381',
    riskTag: '套现团伙', level: 'high', amount: 340500, slaLeft: 8,
    stage: '处置中', channel: '快捷支付', createdAt: '09:16:02', feedback: undefined,
  },
  {
    id: 'ALT-2024-0883', subject: '示例消费金融 · 信用贷账户 C-00512', card: '****9910',
    riskTag: '结构化拆分', level: 'high', amount: 97600, slaLeft: 580,
    stage: '待分诊', channel: '信用贷支用', createdAt: '09:18:55', feedback: undefined,
  },
  {
    id: 'ALT-2024-0884', subject: '小云账户 U-21038', card: '****5547',
    riskTag: '异常提现', level: 'mid', amount: 23800, slaLeft: 1220,
    stage: '待分诊', channel: '提现', createdAt: '09:21:10', feedback: undefined,
  },
  {
    id: 'ALT-2024-0885', subject: '小云账户 U-67743', card: '****0019',
    riskTag: '盗刷', level: 'high', amount: 56200, slaLeft: 120,
    stage: '处置中', channel: '银行卡支付', createdAt: '09:22:44', feedback: undefined,
  },
  {
    id: 'ALT-2024-0886', subject: '示例消费金融 · 信用贷账户 C-01983', card: '****8864',
    riskTag: '快进快出', level: 'mid', amount: 18400, slaLeft: 2880,
    stage: '已结案', channel: '账户转账', createdAt: '09:25:01', feedback: 'true',
  },
  {
    id: 'ALT-2024-0887', subject: '小云账户 U-30029', card: '****1122',
    riskTag: '账户接管', level: 'high', amount: 210000, slaLeft: 60,
    stage: '处置中', channel: '快捷支付', createdAt: '09:27:18', feedback: undefined,
  },
  {
    id: 'ALT-2024-0888', subject: '小云账户 U-55512', card: '****4430',
    riskTag: '可疑资金归集', level: 'mid', amount: 8900, slaLeft: 3600,
    stage: '已结案', channel: '银行卡支付', createdAt: '09:30:55', feedback: 'false',
  },
  {
    id: 'ALT-2024-0889', subject: '小云账户 U-92017', card: '****6693',
    riskTag: '盗刷', level: 'high', amount: 73100, slaLeft: 33,
    stage: '待分诊', channel: '银行卡支付', createdAt: '09:33:22', feedback: undefined,
  },
  {
    id: 'ALT-2024-0890', subject: '示例消费金融 · 信用贷账户 C-04411', card: '****2271',
    riskTag: '套现团伙', level: 'high', amount: 485000, slaLeft: 0,
    stage: '已结案', channel: '信用贷支用', createdAt: '09:35:07', feedback: 'true',
  },
  {
    id: 'ALT-2024-0891', subject: '小云账户 U-14382', card: '****8803',
    riskTag: '异常提现', level: 'low', amount: 4200, slaLeft: 7200,
    stage: '已结案', channel: '提现', createdAt: '09:38:40', feedback: 'false',
  },
  {
    id: 'ALT-2024-0892', subject: '小云账户 U-77830', card: '****3309',
    riskTag: '结构化拆分', level: 'mid', amount: 66700, slaLeft: 800,
    stage: '待分诊', channel: '账户转账', createdAt: '09:41:12', feedback: undefined,
  },
  {
    id: 'ALT-2024-0893', subject: '示例消费金融 · 信用贷账户 C-09182', card: '****9941',
    riskTag: '盗刷', level: 'high', amount: 94300, slaLeft: 90,
    stage: '处置中', channel: '信用贷支用', createdAt: '09:44:55', feedback: undefined,
  },
  {
    id: 'ALT-2024-0894', subject: '小云账户 U-60031', card: '****7788',
    riskTag: '快进快出', level: 'low', amount: 3100, slaLeft: 5400,
    stage: '已结案', channel: '快捷支付', createdAt: '09:47:23', feedback: 'true',
  },
];

type Stage = '全部' | '待分诊' | '处置中' | '已结案';
type FeedbackVal = 'true' | 'false';
type DisposalKey = 'freeze' | 'verify' | 'manual' | 'pass';

const DISPOSAL_ACTIONS: { key: DisposalKey; label: string; icon: React.ReactNode; tone: string }[] = [
  { key: 'freeze', label: '冻结账户', icon: <ShieldX size={12} />, tone: 'var(--danger)' },
  { key: 'verify', label: '二次验证', icon: <Zap size={12} />, tone: 'var(--warning)' },
  { key: 'manual', label: '转人工', icon: <Users size={12} />, tone: 'var(--info)' },
  { key: 'pass', label: '放行', icon: <CheckCircle2 size={12} />, tone: 'var(--success)' },
];

const ACTION_TOAST: Record<DisposalKey, string> = {
  freeze: '已发起账户冻结指令，冻结完成后自动生成 SAR 草稿',
  verify: '已触发二次验证流程，等待客户完成身份核验',
  manual: '已转入人工复核队列，预计 5 分钟内分配坐席',
  pass: '已放行，交易正常进行，记录审计日志',
};

const LEVEL_ORDER: Record<RiskLevel, number> = { high: 0, mid: 1, low: 2 };

// ── 今日处置统计（右侧栏 KPI）──────────────────────────────────────────────
const DAILY_STATS = {
  total: 247,
  resolved: 198,
  trueCase: 62.3,  // 真案率 %
  avgMinutes: 8.4, // 平均处置时长（分钟）
};

export default function AlertCenter() {
  const { hasPermission } = useAuth();
  const canAct = hasPermission('alert:act');

  const [stage, setStage] = useState<Stage>('全部');
  const [tickets, setTickets] = useState<AlertTicket[]>(MOCK_TICKETS);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 按阶段筛选
  const visible = useMemo(() => {
    const filtered = stage === '全部' ? tickets : tickets.filter(t => t.stage === stage);
    return [...filtered].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.slaLeft - b.slaLeft);
  }, [tickets, stage]);

  // 批量选中
  const allSelected = visible.length > 0 && visible.every(t => selected.has(t.id));
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(visible.map(t => t.id)));
  }
  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // 单条处置
  function handleAction(ticket: AlertTicket, action: DisposalKey) {
    if (!canAct) { toast('当前角色无处置权限（需 alert:act）', 'warn'); return; }
    toast(ACTION_TOAST[action], action === 'freeze' ? 'danger' : action === 'pass' ? 'success' : 'info');
    setTickets(prev => prev.map(t =>
      t.id === ticket.id ? { ...t, stage: action === 'pass' ? '已结案' : '处置中' } : t
    ));
  }

  // 批量处置
  function handleBatch(action: DisposalKey) {
    if (!canAct) { toast('当前角色无处置权限（需 alert:act）', 'warn'); return; }
    if (selected.size === 0) { toast('请先勾选预警工单', 'warn'); return; }
    toast(`已对 ${selected.size} 条工单执行「${DISPOSAL_ACTIONS.find(a => a.key === action)?.label}」`, 'success');
    setTickets(prev => prev.map(t =>
      selected.has(t.id) ? { ...t, stage: action === 'pass' ? '已结案' : '处置中' } : t
    ));
    setSelected(new Set());
  }

  // 反馈回填
  function handleFeedback(ticket: AlertTicket, fb: FeedbackVal) {
    const current = ticket.feedback;
    const next: FeedbackVal | undefined = current === fb ? undefined : fb;
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, feedback: next } : t));
    if (next !== undefined) {
      toast(
        next === 'true' ? '已标记为真案，已回填至模型再训练队列' : '已标记为误报，反馈已推送模型再训练',
        next === 'true' ? 'warn' : 'info',
      );
    }
  }

  // ── 漏斗图（处置流程：预警→分诊→处置→结案）────────────────────────────────
  function buildFunnel() {
    return {
      ...baseOption(),
      grid: undefined,
      tooltip: { ...(baseOption().tooltip as object), trigger: 'item' },
      series: [{
        type: 'funnel',
        width: '72%',
        left: '14%',
        top: 16,
        bottom: 16,
        sort: 'descending',
        gap: 4,
        label: { show: true, position: 'inside', fontSize: 11, color: 'var(--text-inverse)', fontWeight: 600 },
        labelLine: { show: false },
        itemStyle: { borderWidth: 0, borderRadius: 3 },
        data: [
          { name: '预警触发', value: 247, itemStyle: { color: 'var(--c1)' } },
          { name: '已分诊', value: 211, itemStyle: { color: accent() } },
          { name: '处置中', value: 89, itemStyle: { color: review() } },
          { name: '已结案', value: 198, itemStyle: { color: pass() } },
        ],
      }],
    };
  }

  // ── SLA 达成率趋势 sparkline（近 7 日）──────────────────────────────────────
  function buildSlaTrend() {
    const days = ['6/14', '6/15', '6/16', '6/17', '6/18', '6/19', '6/20'];
    const data = [88.2, 91.4, 86.7, 93.1, 90.8, 94.2, 96.1];
    return {
      ...baseOption(),
      grid: { left: 6, right: 8, top: 20, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: days, boundaryGap: false, ...axisStyle() },
      yAxis: { type: 'value', min: 80, max: 100, ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${v}%` } },
      series: [{
        type: 'line', data, smooth: true, symbol: 'circle', symbolSize: 5,
        lineStyle: { width: 1.6, color: accent() },
        itemStyle: { color: accent(), borderColor: 'var(--surface-1)', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'color-mix(in srgb, var(--gold) 22%, transparent)' },
              { offset: 1, color: 'color-mix(in srgb, var(--gold) 0%, transparent)' },
            ],
          },
        },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: 'var(--success)', type: 'dashed', width: 1, opacity: 0.55 },
          data: [{ yAxis: 90 }],
          label: { formatter: 'SLA 目标 90%', color: 'var(--success)', fontSize: 10 },
        },
      }],
    };
  }

  const stageCount = useMemo(() => ({
    '待分诊': tickets.filter(t => t.stage === '待分诊').length,
    '处置中': tickets.filter(t => t.stage === '处置中').length,
    '已结案': tickets.filter(t => t.stage === '已结案').length,
  }), [tickets]);

  return (
    <div className="page page-wide">
      <PageHeader
        title="实时预警处置中心"
        subtitle="高危信号 → 可处置工单 · SLA 倒计时 · 一键处置 · 反馈再训练"
        actions={
          <div className="row gap-2">
            <span className="live-pulse danger" />
            <span className="t-small text-2">
              <span className="mononum" style={{ color: 'var(--danger)', fontWeight: 700 }}>{stageCount['待分诊']}</span>
              <span style={{ marginLeft: 4 }}>条待分诊</span>
            </span>
          </div>
        }
      />

      {/* 顶部分阶段 Segmented + 批量操作 */}
      <div className="row spread" style={{ marginBottom: 14 }}>
        <Segmented<Stage>
          options={[
            { value: '全部', label: `全部（${tickets.length}）` },
            { value: '待分诊', label: `待分诊（${stageCount['待分诊']}）` },
            { value: '处置中', label: `处置中（${stageCount['处置中']}）` },
            { value: '已结案', label: `已结案（${stageCount['已结案']}）` },
          ]}
          value={stage}
          onChange={setStage}
        />
        <div className="row gap-2">
          {selected.size > 0 && (
            <span className="t-small text-3" style={{ marginRight: 4 }}>已选 <span className="mononum" style={{ color: 'var(--gold)' }}>{selected.size}</span> 条</span>
          )}
          {DISPOSAL_ACTIONS.slice(0, 3).map(a => (
            <button
              key={a.key}
              className="btn btn-subtle btn-sm"
              style={{ borderColor: selected.size > 0 ? a.tone : undefined, color: selected.size > 0 ? a.tone : undefined }}
              onClick={() => handleBatch(a.key)}
              disabled={!canAct}
              title={canAct ? `批量${a.label}` : '当前角色无处置权限'}
            >
              {a.icon}批量{a.label}
            </button>
          ))}
          <button className="btn btn-subtle btn-sm" style={{ color: 'var(--text-3)' }}>
            <Filter size={12} />筛选
          </button>
        </div>
      </div>

      {/* 主区：左 工单流 · 右侧栏 漏斗 + KPI + SLA 趋势 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 14 }}>

        {/* 左主：工单流 */}
        <Panel
          title="预警工单"
          icon={<AlertTriangle size={13} />}
          right={<span className="t-small text-3">按风险等级 + SLA 升序排列</span>}
          bodyClass="panel-body-0"
        >
          {/* 列头 */}
          <div className="stream-row" style={{
            gridTemplateColumns: '32px 1fr 88px 68px 80px 1fr 160px 56px',
            position: 'sticky', top: 0, zIndex: 1,
            background: 'var(--surface-2)',
            fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase',
            letterSpacing: '0.06em', fontSize: 10, padding: '8px 14px',
            borderBottom: '1px solid var(--hairline)', animation: 'none',
          }}>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={{ accentColor: 'var(--gold)', cursor: 'pointer', width: 13, height: 13 }}
              />
            </label>
            <span>主体 / 工单号</span>
            <span style={{ textAlign: 'right' }}>金额</span>
            <span style={{ textAlign: 'center' }}>风险</span>
            <span style={{ textAlign: 'center' }}>SLA</span>
            <span>标签 / 渠道</span>
            <span style={{ textAlign: 'center' }}>处置操作</span>
            <span style={{ textAlign: 'center' }}>反馈</span>
          </div>

          {/* 工单列表 */}
          <div style={{ overflowY: 'auto', maxHeight: 560 }}>
            {visible.map((ticket, i) => {
              const isSelected = selected.has(ticket.id);
              const isClosed = ticket.stage === '已结案';
              return (
                <div
                  key={ticket.id}
                  className="stream-row"
                  style={{
                    gridTemplateColumns: '32px 1fr 88px 68px 80px 1fr 160px 56px',
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--hairline)',
                    background: isSelected ? 'color-mix(in srgb, var(--gold) 5%, transparent)' : undefined,
                    opacity: isClosed ? 0.62 : 1,
                    alignItems: 'center',
                    animationDelay: `${i * 30}ms`,
                  }}
                >
                  {/* 复选 */}
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(ticket.id)}
                      style={{ accentColor: 'var(--gold)', cursor: 'pointer', width: 13, height: 13 }}
                    />
                  </label>

                  {/* 主体 + 工单号 */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ticket.subject}
                    </div>
                    <div className="mono t-small text-3" style={{ marginTop: 2 }}>
                      {ticket.id} · 卡尾 {ticket.card} · {ticket.createdAt}
                    </div>
                  </div>

                  {/* 金额 */}
                  <div className="mononum" style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                    ¥{fmt(ticket.amount)}
                  </div>

                  {/* 风险等级 */}
                  <div style={{ textAlign: 'center' }}>
                    <RiskBadge level={ticket.level} />
                  </div>

                  {/* SLA 倒计时 */}
                  <div style={{ textAlign: 'center' }}>
                    {isClosed
                      ? <span className="t-small text-3">—</span>
                      : <SlaChip seconds={ticket.slaLeft} />
                    }
                  </div>

                  {/* 风险标签 + 渠道 */}
                  <div style={{ minWidth: 0 }}>
                    <span
                      className="badge"
                      style={{
                        background: ticket.level === 'high'
                          ? 'color-mix(in srgb, var(--danger) 13%, transparent)'
                          : ticket.level === 'mid'
                            ? 'color-mix(in srgb, var(--warning) 13%, transparent)'
                            : 'color-mix(in srgb, var(--success) 13%, transparent)',
                        color: ticket.level === 'high' ? 'var(--danger)' : ticket.level === 'mid' ? 'var(--warning)' : 'var(--success)',
                      }}
                    >
                      {ticket.riskTag}
                    </span>
                    <div className="t-small text-3" style={{ marginTop: 3 }}>{ticket.channel}</div>
                  </div>

                  {/* 处置按钮组 */}
                  <div className="row gap-1" style={{ justifyContent: 'center', flexWrap: 'nowrap' }}>
                    {isClosed
                      ? (
                        <span
                          className="badge"
                          style={{ background: 'color-mix(in srgb, var(--text-3) 12%, transparent)', color: 'var(--text-3)' }}
                        >
                          已结案
                        </span>
                      )
                      : DISPOSAL_ACTIONS.map(action => (
                        <button
                          key={action.key}
                          className="btn btn-subtle btn-sm"
                          style={{
                            fontSize: 11,
                            padding: '3px 7px',
                            color: action.tone,
                            borderColor: 'var(--hairline)',
                            opacity: canAct ? 1 : 0.45,
                          }}
                          disabled={!canAct}
                          title={canAct ? action.label : '当前角色无处置权限（alert:act）'}
                          onClick={() => handleAction(ticket, action.key)}
                        >
                          {action.icon}
                        </button>
                      ))
                    }
                  </div>

                  {/* 反馈回填 */}
                  <div className="row gap-1" style={{ justifyContent: 'center' }}>
                    {isClosed ? (
                      <>
                        <button
                          className="btn btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            background: ticket.feedback === 'true' ? 'color-mix(in srgb, var(--danger) 16%, transparent)' : 'transparent',
                            color: ticket.feedback === 'true' ? 'var(--danger)' : 'var(--text-3)',
                            border: `1px solid ${ticket.feedback === 'true' ? 'var(--danger)' : 'var(--hairline)'}`,
                          }}
                          onClick={() => handleFeedback(ticket, 'true')}
                          title="标记为真案（喂模型再训练）"
                        >
                          <ThumbsUp size={11} />
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            background: ticket.feedback === 'false' ? 'color-mix(in srgb, var(--success) 16%, transparent)' : 'transparent',
                            color: ticket.feedback === 'false' ? 'var(--success)' : 'var(--text-3)',
                            border: `1px solid ${ticket.feedback === 'false' ? 'var(--success)' : 'var(--hairline)'}`,
                          }}
                          onClick={() => handleFeedback(ticket, 'false')}
                          title="标记为误报（喂模型再训练）"
                        >
                          <ThumbsDown size={11} />
                        </button>
                      </>
                    ) : (
                      <span className="t-small text-3">—</span>
                    )}
                  </div>
                </div>
              );
            })}

            {visible.length === 0 && (
              <div className="col" style={{ alignItems: 'center', justifyContent: 'center', padding: '56px 20px', color: 'var(--text-3)' }}>
                <XCircle size={32} style={{ opacity: 0.25, marginBottom: 12 }} />
                <div style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 600 }}>该阶段暂无预警工单</div>
                <div className="t-small" style={{ marginTop: 4 }}>风险态势平稳，未发现待处置信号</div>
              </div>
            )}
          </div>

          {/* 批量操作浮层（当有选中时显示）*/}
          {selected.size > 0 && (
            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--hairline)',
              background: 'color-mix(in srgb, var(--gold) 5%, var(--surface-2))',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span className="t-small text-2" style={{ flex: 1 }}>
                批量处置 · 已选 <span className="mononum" style={{ color: 'var(--gold)', fontWeight: 700 }}>{selected.size}</span> 条工单
              </span>
              {DISPOSAL_ACTIONS.map(a => (
                <button
                  key={a.key}
                  className="btn btn-sm"
                  style={{ color: a.tone, border: `1px solid ${a.tone}`, background: `color-mix(in srgb, ${a.tone} 10%, transparent)`, fontSize: 12 }}
                  disabled={!canAct}
                  onClick={() => handleBatch(a.key)}
                >
                  {a.icon}{a.label}
                </button>
              ))}
              <button
                className="btn btn-subtle btn-sm"
                onClick={() => setSelected(new Set())}
                style={{ color: 'var(--text-3)' }}
              >
                取消
              </button>
            </div>
          )}
        </Panel>

        {/* 右侧栏 */}
        <div className="col gap-3" style={{ minWidth: 0 }}>

          {/* 今日处置 KPI */}
          <Panel title="今日处置统计" icon={<Clock size={13} />}>
            <div className="col gap-3">
              <StatCard
                label="今日预警总数"
                raw={DAILY_STATS.total}
                unit="条"
                change={12.4}
                icon={<AlertTriangle size={14} />}
                spark={[180, 200, 210, 195, 230, 240, 247]}
              />
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="card" style={{ padding: '12px 14px' }}>
                  <div className="label" style={{ marginBottom: 6 }}>已处置</div>
                  <div className="mononum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>
                    {DAILY_STATS.resolved}
                  </div>
                  <div className="t-small text-3" style={{ marginTop: 3 }}>
                    达成率 <span className="mononum">{((DAILY_STATS.resolved / DAILY_STATS.total) * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="card" style={{ padding: '12px 14px' }}>
                  <div className="label" style={{ marginBottom: 6 }}>真案率</div>
                  <div className="mononum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>
                    {DAILY_STATS.trueCase}%
                  </div>
                  <div className="t-small text-3" style={{ marginTop: 3 }}>昨日 58.9%</div>
                </div>
              </div>
              <div className="card" style={{ padding: '12px 14px' }}>
                <div className="row spread" style={{ marginBottom: 4 }}>
                  <span className="label">平均处置时长</span>
                  <span className="mononum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                    {DAILY_STATS.avgMinutes} 分钟
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (DAILY_STATS.avgMinutes / 15) * 100)}%`,
                    background: 'var(--gold)',
                    borderRadius: 3,
                    transition: 'width 0.8s cubic-bezier(.22,1,.36,1)',
                  }} />
                </div>
                <div className="t-small text-3" style={{ marginTop: 5 }}>目标 ≤ 15 min · 当前达标</div>
              </div>
            </div>
          </Panel>

          {/* 处置漏斗 */}
          <Panel title="处置流程漏斗" icon={<Filter size={13} />} right={<span className="t-small text-3">今日</span>}>
            <Chart build={buildFunnel} height={220} deps={[]} />
          </Panel>

          {/* SLA 达成率 7 日趋势 */}
          <Panel title="SLA 达成率趋势" icon={<ShieldAlert size={13} />} right={<span className="t-small text-3">近 7 日</span>}>
            <Chart build={buildSlaTrend} height={160} deps={[]} />
          </Panel>

          {/* 反馈再训练叙事 */}
          <div className="card" style={{ padding: '14px 16px', borderLeft: '2px solid var(--gold)' }}>
            <div className="label" style={{ marginBottom: 8, color: 'var(--gold)' }}>反馈再训练机制</div>
            <div className="t-small text-2" style={{ lineHeight: 1.7 }}>
              处置后的真案 / 误报标记实时入队，每日凌晨 02:00 批量推送至模型训练流水线，驱动 PSI 监控与 KS/AUC 自动评估。当误报率连续 3 日超阈（FPR &gt; 15%），自动触发模型再训练工单。
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
