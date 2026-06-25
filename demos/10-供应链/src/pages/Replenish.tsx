import { useState } from 'react';
import { Fragment } from 'react';
import {
  ShoppingCart, CheckCircle2, XCircle, FileSearch,
  Bot, Layers, Clock, TrendingUp,
} from 'lucide-react';
import { PageHeader, StatCard, Badge } from '../components/ui';
import { Panel, RiskDot } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, cssVar, accent, DRAW } from '../lib/chartTheme';
import { REPLENISH_ORDERS, REPLENISH_KPIS, GATE_ITEMS } from '../lib/mockData';
import type { GateItem, ReplenishOrder } from '../types';

const KPI_ICONS = [
  <Clock size={16} />,
  <Bot size={16} />,
  <ShoppingCart size={16} />,
  <TrendingUp size={16} />,
];

// Status chip config for replenish orders
const ORDER_STATUS: Record<ReplenishOrder['status'], { label: string; color: string }> = {
  agent_suggested: { label: 'Agent 建议', color: 'var(--info)' },
  pending: { label: '待审核', color: 'var(--warning)' },
  approved: { label: '已批准', color: 'var(--success)' },
  auto_placed: { label: '自动下单', color: 'var(--gold)' },
  rejected: { label: '已驳回', color: 'var(--danger)' },
};

export default function Replenish() {
  const [gateStates, setGateStates] = useState<Record<string, GateItem['status']>>(
    Object.fromEntries(GATE_ITEMS.map(g => [g.id, g.status]))
  );
  const [detailId, setDetailId] = useState<string | null>(null);

  function handleApprove(id: string) {
    setGateStates(prev => ({ ...prev, [id]: 'approved' }));
  }
  function handleReject(id: string) {
    setGateStates(prev => ({ ...prev, [id]: 'blocked' }));
  }
  function handleDetail(id: string) {
    setDetailId(prev => (prev === id ? null : id));
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="补货采购"
        subtitle="Agent 自主决策 + 人审卡点 · 高金额/高风险单据需采购经理确认 · 低风险自动下单留痕"
        actions={<span className="tag tag-mono"><Bot size={12} style={{ marginRight: 4 }} />Agent 决策中台</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {REPLENISH_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'start' }}>
        {/* 左：Agent 卡点队列 + 补货单表 */}
        <div className="col gap-4">
          {/* 签名：Agent 补货卡点队列 */}
          <Panel
            title={<><Bot size={13} />Agent 补货决策卡点</>}
            right={
              <span className="row gap-2">
                <span className="tag" style={{ color: 'var(--warning)' }}>
                  {GATE_ITEMS.filter(g => gateStates[g.id] === 'pending').length} 待审
                </span>
                <span className="tag" style={{ color: 'var(--gold)' }}>
                  {GATE_ITEMS.filter(g => g.status === 'auto').length} 自动
                </span>
              </span>
            }
          >
            <div className="col gap-2">
              {GATE_ITEMS.map(g => {
                const currentStatus = gateStates[g.id];
                const isPass = currentStatus === 'approved';
                const isBlock = currentStatus === 'blocked';
                const isAuto = g.status === 'auto';
                const isPending = currentStatus === 'pending';
                const borderClass = g.risk === 'high' ? 'gate-block' : 'gate-pass';

                return (
                  <Fragment key={g.id}>
                    <div
                      className={`gate-row ${borderClass}`}
                      style={{ opacity: isBlock ? 0.6 : 1 }}
                    >
                      {/* 顶部：标题 + 时间 + 状态 */}
                      <div className="row spread gap-2" style={{ marginBottom: 6 }}>
                        <div className="row gap-2" style={{ minWidth: 0, flex: 1 }}>
                          <Layers size={13} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {g.title}
                          </span>
                        </div>
                        <div className="row gap-2" style={{ flexShrink: 0 }}>
                          <span className="t-small text-3 mononum" style={{ fontSize: 10.5 }}>{g.at}</span>
                          <StatusChip status={currentStatus} />
                        </div>
                      </div>

                      {/* 中部：agent + amount + risk */}
                      <div className="row gap-3" style={{ marginBottom: 6 }}>
                        <span className="row gap-1 t-small" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          <Bot size={11} style={{ color: 'var(--info)' }} />
                          {g.agent}
                        </span>
                        {g.amount && (
                          <span className="mononum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>
                            {g.amount}
                          </span>
                        )}
                        <RiskDot risk={g.risk} />
                        <span className="tag" style={{ fontSize: 10.5 }}>{g.kind}</span>
                      </div>

                      {/* Auto 标注 */}
                      {isAuto && (
                        <div
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11, fontWeight: 600,
                            color: 'var(--gold)',
                            background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
                            border: '1px solid color-mix(in srgb, var(--gold) 24%, transparent)',
                            borderRadius: 6, padding: '3px 10px', marginBottom: 4,
                          }}
                        >
                          <Bot size={11} />
                          Agent 自动下单 · 已留痕
                        </div>
                      )}

                      {/* Pending 操作按钮 */}
                      {isPending && (
                        <div className="row gap-2" style={{ marginTop: 4 }}>
                          <button
                            className="btn btn-sm"
                            style={{ color: 'var(--success)', borderColor: 'color-mix(in srgb, var(--success) 30%, transparent)', background: 'color-mix(in srgb, var(--success) 8%, transparent)' }}
                            onClick={() => handleApprove(g.id)}
                          >
                            <CheckCircle2 size={12} />通过
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ color: 'var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)', background: 'color-mix(in srgb, var(--danger) 8%, transparent)' }}
                            onClick={() => handleReject(g.id)}
                          >
                            <XCircle size={12} />驳回
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ color: detailId === g.id ? 'var(--gold)' : 'var(--text-3)' }}
                            onClick={() => handleDetail(g.id)}
                          >
                            <FileSearch size={12} />详情
                          </button>
                        </div>
                      )}

                      {/* Reviewer info for approved */}
                      {isPass && !isAuto && g.reviewer && (
                        <div className="t-small text-3" style={{ fontSize: 11, marginTop: 4 }}>
                          <CheckCircle2 size={11} style={{ color: 'var(--success)', marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />
                          {g.reviewer} 已确认通过
                        </div>
                      )}
                    </div>

                    {/* 详情展开 */}
                    {detailId === g.id && (
                      <div
                        style={{
                          marginTop: -8,
                          padding: '10px 14px',
                          background: 'var(--surface-2)',
                          borderRadius: '0 0 var(--r-md) var(--r-md)',
                          borderLeft: '2px solid var(--gold)',
                          borderBottom: '1px solid var(--hairline)',
                          borderRight: '1px solid var(--hairline)',
                          fontSize: 12,
                          color: 'var(--text-2)',
                          lineHeight: 1.6,
                        }}
                      >
                        {g.detail}
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </Panel>

          {/* 补货单表 */}
          <Panel
            title={<><ShoppingCart size={13} />补货采购单</>}
            right={<span className="t-small text-3">{REPLENISH_ORDERS.length} 笔</span>}
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>品名</th>
                    <th>供应商</th>
                    <th>目标仓</th>
                    <th className="td-num">数量</th>
                    <th className="td-num">单价</th>
                    <th>触发原因</th>
                    <th className="td-num">置信度</th>
                    <th className="td-num">交期</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {REPLENISH_ORDERS.map(r => {
                    const st = ORDER_STATUS[r.status];
                    return (
                      <tr key={r.id}>
                        <td><span className="tag tag-mono" style={{ fontSize: 10.5 }}>{r.sku}</span></td>
                        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-1)', fontWeight: 500 }}>{r.name}</td>
                        <td className="text-3" style={{ fontSize: 11.5 }}>{r.fromSupplier}</td>
                        <td className="text-3" style={{ fontSize: 11.5 }}>{r.toWarehouse}</td>
                        <td className="td-num mononum">{r.qty.toLocaleString()}</td>
                        <td className="td-num mononum">¥{r.unitCost.toLocaleString()}</td>
                        <td style={{ maxWidth: 160, fontSize: 11.5, color: 'var(--text-2)' }}>{r.reason}</td>
                        <td className="td-num">
                          <span
                            className="mononum"
                            style={{
                              fontWeight: 700,
                              color: r.agentConfidence >= 90 ? 'var(--success)' : r.agentConfidence >= 80 ? 'var(--warning)' : 'var(--danger)',
                            }}
                          >
                            {r.agentConfidence}%
                          </span>
                        </td>
                        <td className="td-num mononum text-3">{r.leadTime}天</td>
                        <td>
                          <Badge color={st.color}>{st.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* 右：补货状态分布环形图 */}
        <div className="col gap-4" style={{ position: 'sticky', top: 0 }}>
          <Panel
            title={<><Layers size={13} />补货状态分布</>}
            right={<span className="t-small text-3">{REPLENISH_ORDERS.length} 单</span>}
          >
            <DonutChart />
          </Panel>

          {/* 决策规则说明 */}
          <Panel title={<><Bot size={13} />Agent 决策规则</>}>
            <div className="col gap-3">
              {DECISION_RULES.map(rule => (
                <div key={rule.id} className="metric-card" style={{ padding: '10px 12px' }}>
                  <div className="row gap-2" style={{ marginBottom: 4 }}>
                    <span
                      style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                        background: rule.color,
                      }}
                    />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{rule.label}</span>
                  </div>
                  <div className="t-small text-3" style={{ fontSize: 11, lineHeight: 1.5, paddingLeft: 16 }}>
                    {rule.desc}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── 补货状态分布环形（真 ECharts · 色全预解析）─────────────────────────────────
function DonutChart() {
  return (
    <Chart
      height={280}
      build={() => {
        const acc = accent();
        const success = cssVar('--success');
        const warning = cssVar('--warning');
        const danger = cssVar('--danger');
        const text1 = cssVar('--text-1');
        const text3 = cssVar('--text-3');

        const data = [
          { value: 3, name: '自动下单', itemStyle: { color: acc } },
          { value: 5, name: '待审核', itemStyle: { color: warning } },
          { value: 4, name: '已批准', itemStyle: { color: success } },
          { value: 2, name: '已驳回', itemStyle: { color: danger } },
        ];

        return {
          ...baseOption(),
          grid: undefined,
          tooltip: {
            ...(baseOption().tooltip as object),
            trigger: 'item',
            formatter: (p: { name: string; value: number; percent: number }) =>
              `${p.name}：<span style="font-weight:700">${p.value} 单</span>（${p.percent.toFixed(1)}%）`,
          },
          legend: {
            orient: 'vertical',
            right: 8,
            top: 'center',
            textStyle: { color: text3, fontSize: 12, fontFamily: "'Geist','PingFang SC',sans-serif" },
          },
          series: [
            {
              type: 'pie',
              radius: ['46%', '72%'],
              center: ['38%', '50%'],
              data,
              label: {
                show: true,
                position: 'center',
                formatter: () => `{v|${data.reduce((s, d) => s + d.value, 0)}}\n{u|单}`,
                rich: {
                  v: { fontSize: 26, fontWeight: 700, color: text1, fontFamily: "'Geist Mono','Geist',sans-serif" },
                  u: { fontSize: 12, color: text3, fontFamily: "'Geist','PingFang SC',sans-serif" },
                },
              },
              emphasis: {
                itemStyle: { shadowBlur: 16, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.4)' },
              },
              ...DRAW,
            },
          ],
        };
      }}
    />
  );
}

// ─── Agent 决策规则数据 ────────────────────────────────────────────────────────
const DECISION_RULES = [
  {
    id: 'auto',
    label: '自动下单',
    color: 'var(--gold)',
    desc: '置信度 ≥ 90% · 金额 < 30 万 · 交期正常 → Agent 自动下单并留痕，无需人工干预',
  },
  {
    id: 'pending',
    label: '人审卡点',
    color: 'var(--warning)',
    desc: '高金额（> 30 万）· 高风险供应商 · 紧急调拨 → 推送采购经理确认后执行',
  },
  {
    id: 'block',
    label: '供应商切换',
    color: 'var(--danger)',
    desc: '供应商切换 / 合规异常 / 断供恢复首单 → 强制人审，不可绕过',
  },
];

// ─── 状态 Chip ────────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: GateItem['status'] }) {
  const map: Record<GateItem['status'], { label: string; color: string }> = {
    pending: { label: '待审', color: 'var(--warning)' },
    approved: { label: '已批', color: 'var(--success)' },
    blocked: { label: '已驳', color: 'var(--danger)' },
    auto: { label: '自动', color: 'var(--gold)' },
  };
  const s = map[status];
  return (
    <span
      style={{
        fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
        color: s.color,
        background: `color-mix(in srgb, ${s.color} 13%, transparent)`,
        border: `1px solid color-mix(in srgb, ${s.color} 24%, transparent)`,
      }}
    >
      {s.label}
    </span>
  );
}
