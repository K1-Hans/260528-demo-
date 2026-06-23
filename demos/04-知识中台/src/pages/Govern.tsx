import { useMemo, useState } from 'react';
import {
  ShieldCheck, ScrollText, Search, Ban, Users, FileLock2,
  CheckCircle2, Eye, Minus, Lock, Filter, Download, AlertTriangle,
  ShieldAlert, EyeOff, Stamp, KeyRound, History,
} from 'lucide-react';
import { PageHeader, Card, StatCard, SectionTitle, Badge } from '../components/ui';
import { StatusBadge, Toolbar, toast } from '../components/kit';
import { DataTable, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, trust, sem, areaGradient, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import {
  AUDIT_LOGS, PERM_MATRIX, PERM_DOMAINS, ROLES, GOV_TREND, ACCESS_HEAT,
} from '../lib/mockData';
import type { AuditLog, PermMatrixCell, RoleId } from '../types';

// ─── 权限矩阵单元格表现：full=绿实心 / read=靛蓝描边 / none=灰静默 ─────────────
const ACCESS_META: Record<PermMatrixCell['access'], { label: string; color: string; Icon: typeof CheckCircle2; solid: boolean }> = {
  full: { label: '完全', color: 'var(--emerald)', Icon: CheckCircle2, solid: true },
  read: { label: '只读', color: 'var(--gold)', Icon: Eye, solid: false },
  none: { label: '无权', color: 'var(--text-3)', Icon: Minus, solid: false },
};

function AccessCell({ access }: { access: PermMatrixCell['access'] }) {
  const m = ACCESS_META[access];
  const { Icon } = m;
  return (
    <div
      className="row gap-1"
      title={m.label}
      style={{
        justifyContent: 'center', height: 34, borderRadius: 'var(--r-sm)', fontSize: 11.5, fontWeight: 600,
        color: access === 'none' ? 'var(--text-3)' : access === 'full' ? '#fff' : m.color,
        background: m.solid
          ? m.color
          : access === 'read'
            ? 'color-mix(in srgb, var(--gold) 11%, transparent)'
            : 'var(--surface-2)',
        border: access === 'read' ? '1px solid color-mix(in srgb, var(--gold) 40%, transparent)' : '1px solid transparent',
        opacity: access === 'none' ? 0.6 : 1,
      }}
    >
      <Icon size={13} strokeWidth={access === 'full' ? 2.4 : 2} />
      <span style={{ letterSpacing: '0.02em' }}>{m.label}</span>
    </div>
  );
}

// ─── DLP 策略（4 条，对齐 INTEL i5「受限源二次审批、机密源默认拦截」语境）──────
type DlpPolicy = {
  id: string; name: string; scope: string; action: string;
  Icon: typeof ShieldAlert; status: 'enforcing' | 'monitor'; hits30d: number;
};
const DLP_POLICIES: DlpPolicy[] = [
  { id: 'p1', name: '受限源访问二次审批', scope: '受限风控域', action: '命中受限源触发审批工单，留痕审计', Icon: KeyRound, status: 'enforcing', hits30d: 184 },
  { id: 'p2', name: '机密源默认拦截', scope: '机密交易域', action: '低于机密密级一律拦截，不返回片段', Icon: ShieldAlert, status: 'enforcing', hits30d: 92 },
  { id: 'p3', name: '个人信息自动脱敏', scope: '全域', action: '身份证 / 手机号 / 银行卡输出前打码', Icon: EyeOff, status: 'enforcing', hits30d: 1260 },
  { id: 'p4', name: '外发内容水印', scope: '导出 / 分享', action: '导出文件嵌入用户级隐形水印追溯外泄', Icon: Stamp, status: 'monitor', hits30d: 47 },
];

const ROLE_NAME: Record<RoleId, string> = Object.fromEntries(ROLES.map(r => [r.id, r.name])) as Record<RoleId, string>;
const ROLE_COLOR: Record<RoleId, string> = Object.fromEntries(ROLES.map(r => [r.id, r.color])) as Record<RoleId, string>;
const ACTION_TONE: Record<AuditLog['action'], 'info' | 'good' | 'warn' | 'muted'> = {
  检索: 'info', 问答: 'good', 打开: 'muted', 导出: 'warn',
};
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function Govern() {
  const { currentRole } = useAuth();
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  // ─── 派生 KPI（真实统计，非硬编码）──────────────────────────────────────────
  const totalQueries = useMemo(() => AUDIT_LOGS.reduce((s, l) => s + l.hits, 0), []);
  const totalBlocked = useMemo(() => AUDIT_LOGS.reduce((s, l) => s + l.blocked, 0), []);
  const activeRoles = ROLES.length;

  const actors = useMemo(() => Array.from(new Set(AUDIT_LOGS.map(l => l.actor))), []);
  const filteredLogs = useMemo(
    () => AUDIT_LOGS.filter(l => (actorFilter === 'all' || l.actor === actorFilter) && (!onlyFlagged || l.flagged)),
    [actorFilter, onlyFlagged],
  );

  // ─── 一键追溯：还原该条访问的会话/权限上下文（受限被拦走告警语义）──────────
  const traceLog = (l: AuditLog) => {
    if (l.flagged) {
      toast(`已追溯 · ${l.actor}（${ROLE_NAME[l.role]}）${l.time} 检索「${l.query}」命中 ${l.blocked} 条受限源被拦，上下文已固化留痕`, 'danger');
    } else {
      toast(`已生成访问溯源 · ${l.actor} ${l.time} 「${l.query}」命中 ${l.hits} 条，权限校验通过`, 'info');
    }
  };

  // ─── 审计表列 ───────────────────────────────────────────────────────────────
  const cols: Col<AuditLog>[] = [
    {
      key: 'time', header: '时间', width: 138, sortable: true, nowrap: true,
      render: r => <span className="mononum t-small" style={{ color: 'var(--text-2)' }}>{r.time}</span>,
    },
    {
      key: 'actor', header: '操作者', width: 150, sortable: true,
      render: r => (
        <div className="row gap-2">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ROLE_COLOR[r.role], flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.actor}</span>
          <span className="t-small text-3" style={{ flexShrink: 0 }}>{ROLE_NAME[r.role]}</span>
        </div>
      ),
    },
    {
      key: 'action', header: '动作', width: 78,
      render: r => <StatusBadge status={r.action} tone={ACTION_TONE[r.action]} />,
    },
    {
      key: 'query', header: '检索内容', sortable: true,
      render: r => (
        <span className="row gap-2" style={{ minWidth: 0 }}>
          <Search size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <span className="serif" style={{ color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.query}</span>
        </span>
      ),
    },
    {
      key: 'hits', header: '命中', width: 70, num: true, sortable: true,
      sortAccessor: r => r.hits,
      render: r => <span className="mononum" style={{ color: 'var(--text-2)' }}>{r.hits}</span>,
    },
    {
      key: 'blocked', header: '被拦', width: 78, num: true, sortable: true,
      sortAccessor: r => r.blocked,
      render: r => r.blocked > 0
        ? <span className="row gap-1 mononum" style={{ justifyContent: 'flex-end', color: 'var(--danger)', fontWeight: 700 }}><Lock size={11} />{r.blocked}</span>
        : <span className="mononum text-3">—</span>,
    },
    {
      key: 'flag', header: '', width: 28, align: 'center',
      render: r => r.flagged
        ? <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
        : <CheckCircle2 size={13} style={{ color: 'var(--emerald)', opacity: 0.55 }} />,
    },
    {
      key: 'trace', header: '追溯', width: 76, align: 'center', nowrap: true,
      render: r => (
        <button
          className="btn btn-sm"
          title="还原该次访问的会话与权限上下文"
          style={{
            padding: '3px 9px',
            background: r.flagged ? 'color-mix(in srgb, var(--danger) 11%, transparent)' : 'var(--surface-2)',
            color: r.flagged ? 'var(--danger)' : 'var(--gold)',
            border: `1px solid ${r.flagged ? 'color-mix(in srgb, var(--danger) 34%, transparent)' : 'var(--hairline-strong)'}`,
          }}
          onClick={e => { e.stopPropagation(); traceLog(r); }}
        >
          <History size={12} /> 追溯
        </button>
      ),
    },
  ];

  // ─── ECharts ①：GOV_TREND 每日检索量(靛蓝柱) vs 受限拦截量(红线) 双轴 ────────
  const buildTrend = () => {
    const base = baseOption();
    const ax = axisStyle();
    const ind = accent(); const red = sem('blocked'); const t3 = cssVar('--text-3');
    return {
      ...base,
      grid: { left: 6, right: 6, top: 40, bottom: 6, containLabel: true },
      legend: {
        data: ['检索量', '受限拦截'], top: 4, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10,
        textStyle: { color: t3, fontSize: 11 },
      },
      tooltip: { ...(base.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: GOV_TREND.map(d => d.date), ...ax, axisLabel: { ...ax.axisLabel, interval: 1 } },
      yAxis: [
        { type: 'value', name: '检索量', nameTextStyle: { color: t3, fontSize: 10.5, align: 'left' }, ...ax, splitLine: { lineStyle: { color: cssVar('--hairline'), type: 'dashed' } } },
        { type: 'value', name: '拦截', nameTextStyle: { color: t3, fontSize: 10.5, align: 'right' }, ...ax, splitLine: { show: false }, axisLabel: { ...ax.axisLabel, color: red } },
      ],
      series: [
        {
          name: '检索量', type: 'bar', data: GOV_TREND.map(d => d.queries), barWidth: '52%', yAxisIndex: 0,
          itemStyle: { borderRadius: [4, 4, 0, 0], color: areaGradient(ind, 1) }, z: 1,
          ...{ animationDuration: 800, animationEasing: 'cubicOut', animationDelay: (i: number) => i * 40 },
        },
        {
          name: '受限拦截', type: 'line', data: GOV_TREND.map(d => d.blocked), yAxisIndex: 1, smooth: true,
          symbol: 'circle', symbolSize: 6, lineStyle: { color: red, width: 2 }, itemStyle: { color: red },
          areaStyle: { color: areaGradient(red, 0.16) }, z: 2,
        },
      ],
    };
  };

  // ─── ECharts ②：ACCESS_HEAT 7×24 访问热力日历（靛蓝深浅，工作时段亮）────────
  const buildHeat = () => {
    const base = baseOption();
    const ind = accent(); const t3 = cssVar('--text-3'); const hairline = cssVar('--hairline');
    const maxV = Math.max(...ACCESS_HEAT.map(c => c.value));
    const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}`);
    return {
      ...base,
      grid: { left: 6, right: 14, top: 8, bottom: 52, containLabel: true },
      tooltip: {
        ...(base.tooltip as object), position: 'top',
        formatter: (p: { data: [number, number, number] }) =>
          `${WEEKDAYS[p.data[1]]} ${String(p.data[0]).padStart(2, '0')}:00<br/>访问 <b>${p.data[2]}</b> 次`,
      },
      xAxis: {
        type: 'category', data: hours, splitArea: { show: false },
        axisLine: { lineStyle: { color: hairline } }, axisTick: { show: false },
        axisLabel: { color: t3, fontSize: 10, interval: 2 },
      },
      yAxis: {
        type: 'category', data: WEEKDAYS, splitArea: { show: false },
        axisLine: { lineStyle: { color: hairline } }, axisTick: { show: false },
        axisLabel: { color: t3, fontSize: 10.5 },
      },
      visualMap: {
        min: 0, max: maxV, calculable: false, orient: 'horizontal', left: 'center', bottom: 8,
        itemWidth: 12, itemHeight: 110, text: ['高', '低'], textStyle: { color: t3, fontSize: 10.5 },
        inRange: { color: ['var(--surface-2)', `color-mix(in srgb, ${ind} 38%, transparent)`, ind] },
      },
      series: [{
        name: '访问热力', type: 'heatmap',
        data: ACCESS_HEAT.map(c => [c.hour, c.day, c.value]),
        itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 1.5, borderRadius: 2 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' } },
        progressive: 0, animation: false,
      }],
    };
  };

  return (
    <div className="page" style={{ paddingTop: 18 }}>
      {/* flagged 审计行红底（页面内自包含，特异性高于 .tbl td，不改共享样式）*/}
      <style>{`
        .audit-tbl .tbl tbody tr.flagged-row td { background: color-mix(in srgb, var(--danger) 7%, transparent); }
        .audit-tbl .tbl tbody tr.flagged-row:hover td { background: color-mix(in srgb, var(--danger) 12%, transparent); }
        .audit-tbl .tbl tbody tr.flagged-row td:first-child { box-shadow: inset 2px 0 0 var(--danger); }
        .perm-matrix th, .perm-matrix td { padding: 6px; }
      `}</style>

      <PageHeader
        title="权限治理控制台"
        subtitle="数据域访问控制 · 审计追溯 · DLP 数据防泄漏 —— 把「权限感知」做成可治理后台"
        actions={
          <div className="row gap-2">
            <span className="lock-chip" style={{ color: 'var(--emerald)', background: 'color-mix(in srgb, var(--emerald) 12%, transparent)' }}>
              <ShieldCheck size={12} /> 当前 {currentRole?.name ?? '审计'} · 只读审计
            </span>
            <button className="btn btn-subtle btn-sm"><Download size={13} /> 导出审计报告</button>
          </div>
        }
      />

      {/* ── KPI 条 ── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label="今日检索量" raw={totalQueries} unit="次" change={8.2} icon={<Search size={16} />} delayClass="reveal-1" />
        <StatCard label="受限访问被拦" raw={totalBlocked} unit="次" change={-12.5} icon={<Ban size={16} />} delayClass="reveal-2" />
        <StatCard label="活跃角色" raw={activeRoles} unit="类" icon={<Users size={16} />} delayClass="reveal-3" />
        <StatCard label="DLP 策略" raw={DLP_POLICIES.length} unit="条" icon={<FileLock2 size={16} />} delayClass="reveal-4" />
      </div>

      {/* ── 数据域权限矩阵 ── */}
      <Card className="reveal reveal-2" style={{ marginBottom: 22, padding: 0 }}>
        <div style={{ padding: '16px 18px 12px' }}>
          <SectionTitle right={
            <div className="row gap-3" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
              <span className="row gap-1"><CheckCircle2 size={12} style={{ color: 'var(--emerald)' }} /> 完全</span>
              <span className="row gap-1"><Eye size={12} style={{ color: 'var(--gold)' }} /> 只读</span>
              <span className="row gap-1"><Minus size={12} style={{ color: 'var(--text-3)' }} /> 无权</span>
            </div>
          }>
            <span className="row gap-2"><KeyRound size={13} style={{ color: 'var(--gold)' }} /> 数据域 × 角色 权限矩阵</span>
          </SectionTitle>
        </div>
        <div className="perm-matrix" style={{ overflowX: 'auto', padding: '0 18px 18px' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px 6px', minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: 132 }}>
                  <span className="label">数据域 \ 角色</span>
                </th>
                {ROLES.map(r => (
                  <th key={r.id} style={{ minWidth: 110 }}>
                    <div className="col gap-1" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>{r.name}</span>
                      <span className="lock-chip" style={{ fontSize: 10, padding: '1px 7px', color: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)` }}>
                        <Lock size={9} /> 密级 {r.clearance}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_DOMAINS.map(domain => {
                const restricted = domain.includes('受限') || domain.includes('机密') || domain.includes('审计');
                return (
                  <tr key={domain}>
                    <td style={{ textAlign: 'left' }}>
                      <span className="row gap-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        {restricted
                          ? <Lock size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                          : <FileLock2 size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
                        {domain}
                      </span>
                    </td>
                    {ROLES.map(role => {
                      const cell = PERM_MATRIX.find(c => c.domain === domain && c.role === role.id);
                      return <td key={role.id}><AccessCell access={cell?.access ?? 'none'} /></td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 双图：趋势 + 热力 ── */}
      <div className="grid" style={{ gridTemplateColumns: '1.15fr 1fr', gap: 14, marginBottom: 22 }}>
        <Card className="reveal reveal-3">
          <SectionTitle right={<span className="t-small text-3 mononum">近 14 日</span>}>
            <span className="row gap-2"><ScrollText size={13} style={{ color: 'var(--gold)' }} /> 每日检索量 vs 受限拦截</span>
          </SectionTitle>
          <Chart build={buildTrend} height={262} deps={[]} />
        </Card>
        <Card className="reveal reveal-4">
          <SectionTitle right={<span className="t-small text-3">工作时段访问集中</span>}>
            <span className="row gap-2"><Eye size={13} style={{ color: 'var(--gold)' }} /> 访问热力日历 · 7×24</span>
          </SectionTitle>
          <Chart build={buildHeat} height={262} deps={[]} />
        </Card>
      </div>

      {/* ── DLP 策略列表 ── */}
      <Card className="reveal reveal-4" style={{ marginBottom: 22 }}>
        <SectionTitle right={<Badge color="var(--emerald)">{DLP_POLICIES.filter(p => p.status === 'enforcing').length} 条强制生效</Badge>}>
          <span className="row gap-2"><ShieldAlert size={13} style={{ color: 'var(--gold)' }} /> DLP 数据防泄漏策略</span>
        </SectionTitle>
        <div className="col gap-2">
          {DLP_POLICIES.map(p => {
            const { Icon } = p;
            const enforcing = p.status === 'enforcing';
            return (
              <div
                key={p.id}
                className="row gap-3"
                style={{
                  padding: '13px 15px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)',
                  border: '1px solid var(--hairline)', alignItems: 'center',
                }}
              >
                <span
                  className="row"
                  style={{
                    width: 36, height: 36, borderRadius: 'var(--r-sm)', justifyContent: 'center', flexShrink: 0,
                    background: enforcing ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'var(--surface-3)',
                    color: enforcing ? 'var(--gold)' : 'var(--text-3)',
                  }}
                >
                  <Icon size={17} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row gap-2" style={{ marginBottom: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>{p.name}</span>
                    <span className="lock-chip" style={{ fontSize: 10, color: 'var(--text-3)', background: 'var(--surface-3)' }}>{p.scope}</span>
                  </div>
                  <div className="t-small text-3" style={{ lineHeight: 1.5 }}>{p.action}</div>
                </div>
                <div className="col" style={{ alignItems: 'flex-end', flexShrink: 0, gap: 5 }}>
                  <StatusBadge status={enforcing ? '强制生效' : '监控告警'} tone={enforcing ? 'good' : 'warn'} />
                  <span className="t-small text-3 mononum">30 日命中 {p.hits30d.toLocaleString('zh-CN')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── 审计日志表 ── */}
      <Card className="reveal reveal-5 audit-tbl" style={{ padding: 0 }}>
        <div style={{ padding: '16px 18px 12px' }}>
          <SectionTitle right={
            <span className="t-small text-3">
              共 <b className="mononum" style={{ color: 'var(--text-2)' }}>{filteredLogs.length}</b> 条
              {onlyFlagged && <span style={{ color: 'var(--danger)' }}> · 仅受限被拦</span>}
            </span>
          }>
            <span className="row gap-2"><ScrollText size={13} style={{ color: 'var(--gold)' }} /> 访问审计日志</span>
          </SectionTitle>
          <Toolbar style={{ marginBottom: 0 }}>
            <span className="row gap-1 t-small text-3"><Filter size={13} /> 操作者</span>
            <button
              className="btn btn-sm"
              style={{
                background: actorFilter === 'all' ? 'var(--gold-glow)' : 'var(--surface-2)',
                color: actorFilter === 'all' ? 'var(--gold)' : 'var(--text-2)',
                border: `1px solid ${actorFilter === 'all' ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
              }}
              onClick={() => setActorFilter('all')}
            >全部</button>
            {actors.map(a => (
              <button
                key={a}
                className="btn btn-sm"
                style={{
                  background: actorFilter === a ? 'var(--gold-glow)' : 'var(--surface-2)',
                  color: actorFilter === a ? 'var(--gold)' : 'var(--text-2)',
                  border: `1px solid ${actorFilter === a ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
                }}
                onClick={() => setActorFilter(a)}
              >{a}</button>
            ))}
            <button
              className="btn btn-sm"
              style={{
                marginLeft: 'auto',
                background: onlyFlagged ? 'color-mix(in srgb, var(--danger) 12%, transparent)' : 'var(--surface-2)',
                color: onlyFlagged ? 'var(--danger)' : 'var(--text-2)',
                border: `1px solid ${onlyFlagged ? 'color-mix(in srgb, var(--danger) 38%, transparent)' : 'var(--hairline)'}`,
              }}
              onClick={() => setOnlyFlagged(v => !v)}
            ><AlertTriangle size={13} /> 仅看受限被拦</button>
          </Toolbar>
        </div>
        <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
          <DataTable<AuditLog>
            cols={cols}
            rows={filteredLogs}
            rowKey={r => r.id}
            onRow={traceLog}
            rowClass={r => (r.flagged ? 'flagged-row' : '')}
            defaultSort={{ key: 'time', dir: 'desc' }}
            empty={{ title: '无匹配审计记录', desc: '调整操作者或受限筛选', icon: <ScrollText size={32} /> }}
          />
        </div>
      </Card>
    </div>
  );
}
