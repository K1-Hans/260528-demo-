import { useMemo, useState } from 'react';
import { ClipboardList, Flag, Search, ShieldCheck, TrendingUp } from 'lucide-react';
import { PageHeader, Segmented, StatCard } from '../components/ui';
import { Panel, DecisionBadge } from '../components/sig';
import { DataTable, Pagination, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, pass, review, block } from '../lib/chartTheme';
import { fmt } from '../lib/hooks';
import type { AuditEntry, Decision, RoleId } from '../types';
import { useAuth } from '../contexts/AuthContext';

// ── 页面专属 mock（确定性生成，无 Math.random · ~40 条）──────────────────────
const ACTORS: { name: string; role: RoleId }[] = [
  { name: '张伟 · 示例消费金融', role: 'risk_analyst' },
  { name: '李明 · 示例消费金融', role: 'aml_officer' },
  { name: '王芳 · 示例消费金融', role: 'strategy_admin' },
  { name: '陈静 · 示例消费金融', role: 'ciso' },
  { name: '刘洋 · 示例消费金融', role: 'risk_analyst' },
  { name: '小云系统', role: 'risk_analyst' },
];

const ACTIONS = [
  '人工复核', '策略下发', '账户冻结', 'SAR 上报', '名单命中确认',
  '模型切版', '规则激活', '规则停用', '参数调整', '告警分诊',
  '案件升级', '人工放行', '策略回滚',
];

const TARGETS = [
  '账户 U-88214', '规则 R-217', '模型 fraud-xgb-0614', '策略 S-快捷支付高额',
  '告警 ALT-2024-0881', '案件 CASE-2024-0041', '信用贷账户 C-00512',
  '策略 S-AML-结构化拆分', '名单匹配 SCR-0932', '规则 R-088',
  '账户 U-45601', '模型 credit-lgb-0610', '规则 R-001',
];

const MODEL_VERS = ['fraud-xgb-0614', 'fraud-xgb-0612', 'credit-lgb-0610', 'aml-gb-0601', undefined];
const STRATEGY_VERS = ['S-v2.4.1', 'S-v2.3.9', 'S-v2.4.0', 'S-v2.2.7', undefined];
const DECISIONS: (Decision | undefined)[] = ['pass', 'review', 'block', undefined, undefined, 'pass', 'review'];

// 近 14 日审计量（固定数组，不随机）
const TREND_14D = [312, 298, 341, 327, 356, 388, 401, 376, 349, 362, 418, 443, 427, 461];
const TREND_LABELS = ['6/7','6/8','6/9','6/10','6/11','6/12','6/13','6/14','6/15','6/16','6/17','6/18','6/19','6/20'];

// 动作分布（固定）
const ACTION_DIST: { action: string; count: number }[] = [
  { action: '告警分诊', count: 148 },
  { action: '人工复核', count: 127 },
  { action: '账户冻结', count: 83 },
  { action: '策略下发', count: 61 },
  { action: 'SAR 上报', count: 44 },
  { action: '模型切版', count: 29 },
  { action: '规则激活', count: 22 },
  { action: '人工放行', count: 19 },
  { action: '参数调整', count: 14 },
  { action: '策略回滚', count: 8 },
];

// 确定性生成 40 条审计记录（用 index 作种子）
function genEntry(i: number): AuditEntry {
  const actor = ACTORS[i % ACTORS.length];
  const action = ACTIONS[i % ACTIONS.length];
  const target = TARGETS[i % TARGETS.length];
  const decision = DECISIONS[i % DECISIONS.length];
  const modelVer = MODEL_VERS[i % MODEL_VERS.length];
  const strategyVer = STRATEGY_VERS[i % STRATEGY_VERS.length];
  // flagged：索引能整除 7 或 17，少量异常
  const flagged = i % 7 === 0 || i % 17 === 0;
  // 时间：从 09:02:00 开始每 8 分钟一条
  const totalMin = 9 * 60 + 2 + i * 8;
  const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const m = String(totalMin % 60).padStart(2, '0');
  const s = String((i * 13) % 60).padStart(2, '0');
  return {
    id: `AUD-2024-${String(10000 + i).padStart(5, '0')}`,
    time: `${h}:${m}:${s}`,
    actor: actor.name,
    role: actor.role,
    action,
    target,
    decision,
    modelVer,
    strategyVer,
    flagged,
  };
}

const ALL_ENTRIES: AuditEntry[] = Array.from({ length: 40 }, (_, i) => genEntry(i));

const ROLE_LABEL: Record<RoleId, string> = {
  risk_analyst: '风险分析师',
  aml_officer: 'AML 合规官',
  strategy_admin: '策略管理员',
  ciso: '信息安全官',
};

const PAGE_SIZE = 12;

type ActionFilter = '全部' | string;
type RoleFilter = '全部' | RoleId;
type FlaggedFilter = '全部' | '仅异常';

// ─── KPI ──────────────────────────────────────────────────────────────────────
const KPI_TODAY = { total: 461, blocked: 83, flagged: 8, traceRate: 100 };

export default function AuditLog() {
  const { hasPermission } = useAuth();
  void hasPermission('audit:read');   // 页面访问已由 Layout 拦截，此处仅确认调用合法

  const [actionFilter, setActionFilter] = useState<ActionFilter>('全部');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('全部');
  const [flaggedFilter, setFlaggedFilter] = useState<FlaggedFilter>('全部');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return ALL_ENTRIES.filter(e => {
      if (actionFilter !== '全部' && e.action !== actionFilter) return false;
      if (roleFilter !== '全部' && e.role !== roleFilter) return false;
      if (flaggedFilter === '仅异常' && !e.flagged) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!e.actor.toLowerCase().includes(q) && !e.target.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [actionFilter, roleFilter, flaggedFilter, search]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  function resetPage() { setPage(1); }

  const cols: Col<AuditEntry>[] = [
    {
      key: 'time',
      header: '时间',
      width: 100,
      nowrap: true,
      render: (r) => (
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          {r.flagged && (
            <span style={{
              width: 3, height: 30, borderRadius: 2,
              background: 'var(--danger)', flexShrink: 0, display: 'inline-block',
              marginLeft: -6,
            }} />
          )}
          <span className="mononum" style={{ fontSize: 12, color: r.flagged ? 'var(--danger)' : 'var(--text-2)' }}>{r.time}</span>
        </div>
      ),
    },
    {
      key: 'actor',
      header: '操作人',
      width: 160,
      render: (r) => (
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{r.actor.split(' · ')[0]}</span>
          <div className="t-small text-3" style={{ marginTop: 1 }}>{r.actor.split(' · ')[1] ?? ''}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: '角色',
      width: 110,
      render: (r) => (
        <span
          className="badge"
          style={{
            background: 'color-mix(in srgb, var(--gold) 12%, transparent)',
            color: 'var(--gold)',
            fontSize: 10.5,
          }}
        >
          {ROLE_LABEL[r.role]}
        </span>
      ),
    },
    {
      key: 'action',
      header: '动作',
      width: 110,
      render: (r) => <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{r.action}</span>,
    },
    {
      key: 'target',
      header: '操作对象',
      render: (r) => (
        <span className="mononum" style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.target}</span>
      ),
    },
    {
      key: 'decision',
      header: '决策',
      width: 90,
      align: 'center',
      render: (r) => r.decision
        ? <DecisionBadge decision={r.decision} size="sm" />
        : <span className="text-3" style={{ fontSize: 12 }}>—</span>,
    },
    {
      key: 'modelVer',
      header: '模型版本',
      width: 140,
      render: (r) => r.modelVer
        ? <span className="mononum" style={{ fontSize: 11, color: 'var(--text-2)', letterSpacing: '-0.01em' }}>{r.modelVer}</span>
        : <span className="text-3" style={{ fontSize: 12 }}>—</span>,
    },
    {
      key: 'strategyVer',
      header: '策略版本',
      width: 100,
      render: (r) => r.strategyVer
        ? (
          <span
            className="mononum badge"
            style={{
              fontSize: 10.5,
              background: 'color-mix(in srgb, var(--info) 10%, transparent)',
              color: 'var(--info)',
            }}
          >
            {r.strategyVer}
          </span>
        )
        : <span className="text-3" style={{ fontSize: 12 }}>—</span>,
    },
    {
      key: 'flagged',
      header: '异常标红',
      width: 78,
      align: 'center',
      render: (r) => r.flagged
        ? (
          <span
            className="badge"
            style={{
              background: 'color-mix(in srgb, var(--danger) 14%, transparent)',
              color: 'var(--danger)',
              fontSize: 10.5,
            }}
          >
            <Flag size={10} style={{ marginRight: 3 }} />标红
          </span>
        )
        : <span className="text-3" style={{ fontSize: 12 }}>—</span>,
    },
  ];

  // ── 审计动作分布条形图 ────────────────────────────────────────────────────
  function buildActionBar() {
    const sorted = [...ACTION_DIST].sort((a, b) => a.count - b.count);
    return {
      ...baseOption(),
      grid: { left: 8, right: 20, top: 12, bottom: 8, containLabel: true },
      xAxis: { type: 'value', ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => fmt(v) } },
      yAxis: { type: 'category', data: sorted.map(d => d.action), ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, fontSize: 11 } },
      series: [{
        type: 'bar',
        data: sorted.map((d, i) => ({
          value: d.count,
          itemStyle: {
            color: i >= sorted.length - 3 ? accent() : 'color-mix(in srgb, var(--gold) 45%, var(--surface-3))',
            borderRadius: [0, 3, 3, 0],
          },
        })),
        label: { show: true, position: 'right', fontSize: 11, color: 'var(--text-2)', fontFamily: "'Geist Mono',monospace" },
        animationDuration: 800,
        animationEasing: 'cubicOut' as const,
      }],
    };
  }

  // ── 近 14 日审计量趋势线 ──────────────────────────────────────────────────
  function buildTrend() {
    return {
      ...baseOption(),
      grid: { left: 8, right: 12, top: 24, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: TREND_LABELS, boundaryGap: false, ...axisStyle() },
      yAxis: { type: 'value', min: 270, ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => fmt(v) } },
      series: [{
        type: 'line', data: TREND_14D, smooth: true, symbol: 'circle', symbolSize: 4,
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
        animationDuration: 900,
        animationEasing: 'cubicOut' as const,
      }],
    };
  }

  // ── 决策分布环形图（放行/复核/拦截）───────────────────────────────────────
  function buildDecisionPie() {
    const counts = { pass: 0, review: 0, block: 0 };
    ALL_ENTRIES.forEach(e => { if (e.decision) counts[e.decision]++; });
    return {
      ...baseOption(),
      grid: undefined,
      tooltip: { ...(baseOption().tooltip as object), trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['46%', '72%'],
        center: ['50%', '52%'],
        itemStyle: { borderWidth: 2, borderColor: 'var(--surface-1)' },
        label: { show: true, fontSize: 11, color: 'var(--text-2)', formatter: '{b}\n{c}' },
        data: [
          { name: '放行', value: counts.pass, itemStyle: { color: pass() } },
          { name: '复核', value: counts.review, itemStyle: { color: review() } },
          { name: '拦截', value: counts.block, itemStyle: { color: block() } },
        ],
        animationDuration: 800,
      }],
    };
  }

  const actionOptions: ActionFilter[] = ['全部', ...Array.from(new Set(ALL_ENTRIES.map(e => e.action)))];
  const roleOptions: { value: RoleFilter; label: string }[] = [
    { value: '全部', label: '全部角色' },
    { value: 'risk_analyst', label: '风险分析师' },
    { value: 'aml_officer', label: 'AML 合规官' },
    { value: 'strategy_admin', label: '策略管理员' },
    { value: 'ciso', label: '信息安全官' },
  ];

  return (
    <div className="page page-wide">
      <PageHeader
        title="审计日志"
        subtitle="全链路可追溯 · 决策指纹（模型版本 + 策略版本）· EU AI Act 合规"
        actions={
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
            <span className="t-small" style={{ color: 'var(--success)', fontWeight: 600 }}>可追溯率 100%</span>
          </div>
        }
      />

      {/* KPI 条 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard
          label="今日审计条数"
          raw={KPI_TODAY.total}
          unit="条"
          change={8.2}
          icon={<ClipboardList size={14} />}
          spark={TREND_14D.slice(-7)}
        />
        <StatCard
          label="拦截决策数"
          raw={KPI_TODAY.blocked}
          unit="条"
          change={-3.1}
          icon={<ShieldCheck size={14} />}
        />
        <StatCard
          label="异常标红数"
          raw={KPI_TODAY.flagged}
          unit="条"
          change={2}
          icon={<Flag size={14} />}
          decimals={0}
        />
        <StatCard
          label="可追溯率"
          raw={KPI_TODAY.traceRate}
          unit="%"
          icon={<TrendingUp size={14} />}
          decimals={0}
        />
      </div>

      {/* 主区：上图 + 下表 */}
      <div className="col gap-3">

        {/* 图表行 */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 260px', gap: 12 }}>
          <Panel
            title="近 14 日审计量趋势"
            icon={<TrendingUp size={13} />}
            right={<span className="t-small text-3">2024 · 6/7–6/20</span>}
          >
            <Chart build={buildTrend} height={200} deps={[]} />
          </Panel>

          <Panel
            title="审计动作分布"
            icon={<ClipboardList size={13} />}
            right={<span className="t-small text-3">今日 · 按操作类型</span>}
          >
            <Chart build={buildActionBar} height={200} deps={[]} />
          </Panel>

          <Panel
            title="决策分布"
            icon={<ShieldCheck size={13} />}
            right={<span className="t-small text-3">放行 / 复核 / 拦截</span>}
          >
            <Chart build={buildDecisionPie} height={200} deps={[]} />
          </Panel>
        </div>

        {/* EU AI Act 合规说明卡 */}
        <div className="card" style={{ padding: '12px 16px', borderLeft: '2px solid var(--gold)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <ShieldCheck size={16} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <span className="label" style={{ color: 'var(--gold)', display: 'block', marginBottom: 4 }}>EU AI Act · 决策指纹合规</span>
            <span className="t-small text-2" style={{ lineHeight: 1.7 }}>
              每条有决策记录均落存「<strong>模型版本</strong>」与「<strong>策略版本</strong>」双指纹，满足 EU AI Act Article 12 要求的高风险 AI 系统决策可追溯义务。
              审计日志不可删改，保存周期 ≥ 5 年，支持监管机构按时间段导出原始日志。
              异常操作（如夜间大额账户冻结、策略紧急回滚）自动标红并推送安全官复核队列。
            </span>
          </div>
        </div>

        {/* 筛选工具栏 */}
        <Panel
          title="审计明细"
          icon={<ClipboardList size={13} />}
          right={
            <span className="t-small text-3">
              共 <span className="mononum" style={{ color: 'var(--gold)' }}>{filtered.length}</span> 条
            </span>
          }
          bodyClass="panel-body-0"
        >
          {/* 筛选条 */}
          <div
            className="row gap-2"
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--hairline)',
              flexWrap: 'wrap',
              background: 'var(--surface-2)',
            }}
          >
            {/* 搜索 */}
            <div className="row gap-1" style={{
              border: '1px solid var(--hairline)', borderRadius: 8, padding: '4px 10px',
              background: 'var(--surface-1)', flex: '0 0 200px',
            }}>
              <Search size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="搜索操作人 / 对象 / 日志 ID"
                value={search}
                onChange={e => { setSearch(e.target.value); resetPage(); }}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  fontSize: 12, color: 'var(--text-1)', width: '100%',
                  fontFamily: "'Geist','PingFang SC',sans-serif",
                }}
              />
            </div>

            {/* 动作筛选 */}
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value as ActionFilter); resetPage(); }}
              style={{
                background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 8,
                color: 'var(--text-1)', fontSize: 12, padding: '4px 10px', cursor: 'pointer',
                fontFamily: "'Geist','PingFang SC',sans-serif",
              }}
            >
              {actionOptions.map(a => <option key={a} value={a}>{a === '全部' ? '全部动作' : a}</option>)}
            </select>

            {/* 角色筛选 */}
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value as RoleFilter); resetPage(); }}
              style={{
                background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 8,
                color: 'var(--text-1)', fontSize: 12, padding: '4px 10px', cursor: 'pointer',
                fontFamily: "'Geist','PingFang SC',sans-serif",
              }}
            >
              {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* 异常筛选 Segmented */}
            <Segmented<FlaggedFilter>
              options={[
                { value: '全部', label: '全部' },
                { value: '仅异常', label: '仅异常标红' },
              ]}
              value={flaggedFilter}
              onChange={v => { setFlaggedFilter(v); resetPage(); }}
            />
          </div>

          {/* 数据表 */}
          <DataTable<AuditEntry>
            cols={cols}
            rows={paged}
            rowKey={(r) => r.id}
            dense
            empty={{ title: '无匹配审计记录', desc: '调整筛选条件后重试' }}
          />

          {/* 分页 */}
          <div style={{ padding: '0 14px' }}>
            <Pagination
              page={page}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </div>
        </Panel>

      </div>
    </div>
  );
}
