import { useMemo, useState } from 'react';
import {
  ShieldCheck, AlertTriangle, Lock, Eye, List, Activity,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { PageHeader, StatCard, SectionTitle, Badge } from '../components/ui';
import { StatusBadge } from '../components/kit';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar, DRAW } from '../lib/chartTheme';
import { GOV_POLICIES, GOV_AUDITS } from '../lib/mockData';
import type { GovPolicy, GovAudit, AlertLevel } from '../types';

// ─── Classification color helpers ────────────────────────────────────────────
const CLASS_COLORS: Record<GovPolicy['classification'], string> = {
  公开: 'var(--success)',
  内部: 'var(--info)',
  敏感: 'var(--warning)',
  机密: 'var(--danger)',
};

function ClassBadge({ cls }: { cls: GovPolicy['classification'] }) {
  const color = CLASS_COLORS[cls];
  return (
    <span
      className="badge"
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
        fontWeight: 700,
        letterSpacing: '0.01em',
      }}
    >
      {cls}
    </span>
  );
}

// ─── Audit level helpers ──────────────────────────────────────────────────────
const AUDIT_TONE: Record<AlertLevel, 'bad' | 'warn' | 'info'> = {
  danger: 'bad',
  warn: 'warn',
  info: 'info',
};

const AUDIT_DOT: Record<AlertLevel, string> = {
  danger: 'var(--danger)',
  warn: 'var(--warning)',
  info: 'var(--info)',
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Governance() {
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) =>
    setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));

  // KPI 计算
  const totalPolicies = GOV_POLICIES.length;
  const secretFields = GOV_POLICIES.filter((p) => p.classification === '机密').length;
  const todayBlocked = GOV_AUDITS.filter((a) => a.level === 'danger').length;
  const maskedCount = GOV_POLICIES.filter(
    (p) => p.mask !== '无' && p.mask !== '禁止访问',
  ).length;
  const maskCoverage = Math.round((maskedCount / Math.max(totalPolicies, 1)) * 100);

  // 分级分布数据（机密→公开色阶）
  const classDist = useMemo(() => {
    const counts: Record<string, number> = { 公开: 0, 内部: 0, 敏感: 0, 机密: 0 };
    GOV_POLICIES.forEach((p) => { counts[p.classification] += 1; });
    return ['公开', '内部', '敏感', '机密'].map((k) => ({
      name: k,
      value: counts[k] ?? 0,
      cls: k as GovPolicy['classification'],
    }));
  }, []);

  return (
    <div className="page page-wide">
      <PageHeader
        title="权限治理"
        subtitle="行列级字段分级 · 脱敏策略 · 访问审计留痕。GOV-07 任何角色禁机密字段明细导出。"
        actions={
          <span className="tag tag-mono">
            <ShieldCheck size={12} style={{ marginRight: 4 }} />
            合规治理层
          </span>
        }
      />

      {/* KPI 行 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard
          label="治理策略数"
          raw={totalPolicies}
          icon={<List size={14} />}
          delayClass="d1"
        />
        <StatCard
          label="机密字段数"
          raw={secretFields}
          icon={<Lock size={14} />}
          delayClass="d2"
        />
        <StatCard
          label="今日拦截次数"
          raw={todayBlocked}
          icon={<AlertTriangle size={14} />}
          delayClass="d3"
        />
        <StatCard
          label="脱敏覆盖率"
          raw={maskCoverage}
          unit="%"
          icon={<Eye size={14} />}
          delayClass="d4"
        />
      </div>

      {/* GOV-07 重点提示横幅 */}
      {(() => {
        const gov07 = GOV_POLICIES.find((p) => p.id === 'GOV-07');
        if (!gov07) return null;
        return (
          <div
            className="card reveal"
            style={{
              marginBottom: 20,
              padding: '13px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              borderLeft: '3px solid var(--danger)',
              background: 'color-mix(in srgb, var(--danger) 6%, var(--surface-1))',
            }}
          >
            <Lock size={15} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div
                className="row gap-2"
                style={{ marginBottom: 4, alignItems: 'center' }}
              >
                <span
                  className="badge"
                  style={{
                    background: 'color-mix(in srgb, var(--danger) 14%, transparent)',
                    color: 'var(--danger)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                  }}
                >
                  {gov07.id}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                  {gov07.field}
                </span>
                <ClassBadge cls={gov07.classification} />
              </div>
              <div className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
                {gov07.desc}&nbsp;
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                  命中即拒答，按「答不了报错、绝不返回越权数」原则留痕（见问数台 q4）。
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 主体两栏布局 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: 14,
          alignItems: 'start',
        }}
      >
        {/* 左：治理策略表 */}
        <div className="col gap-4">
          <Panel
            title="治理策略表"
            icon={<ShieldCheck size={13} />}
            bodyClass=""
            right={
              <span className="t-small text-3 mononum">{GOV_POLICIES.length} 条策略</span>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>策略 ID</th>
                    <th>资源 / 字段</th>
                    <th style={{ width: 80 }}>分级</th>
                    <th style={{ width: 90 }}>脱敏类型</th>
                    <th>适用角色</th>
                    <th style={{ width: 28 }} />
                  </tr>
                </thead>
                <tbody>
                  {GOV_POLICIES.map((p) => (
                    <PolicyRow
                      key={p.id}
                      policy={p}
                      open={!!openRows[p.id]}
                      onToggle={() => toggleRow(p.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* 右：分级分布图 + 审计流 */}
        <div className="col gap-4">
          {/* 字段分级分布 ECharts */}
          <Panel
            title="字段分级分布"
            icon={<Activity size={13} />}
            bodyClass="panel-body"
          >
            <Chart
              height={180}
              deps={[classDist.map((d) => d.value).join(',')]}
              build={() => {
                const ax = axisStyle();
                // 机密红→公开绿色阶（cssVar 预解析，ECharts itemStyle.color 不能用 var()）
                const colorMap: Record<string, string> = {
                  公开: cssVar('--success'),
                  内部: cssVar('--info'),
                  敏感: cssVar('--warning'),
                  机密: cssVar('--danger'),
                };
                return {
                  ...baseOption(),
                  ...DRAW,
                  backgroundColor: 'transparent',
                  grid: { left: 8, right: 14, top: 16, bottom: 8, containLabel: true },
                  xAxis: {
                    type: 'category',
                    data: classDist.map((d) => d.name),
                    ...ax,
                  },
                  yAxis: {
                    type: 'value',
                    ...ax,
                    minInterval: 1,
                  },
                  series: [
                    {
                      type: 'bar',
                      barMaxWidth: 40,
                      data: classDist.map((d) => ({
                        value: d.value,
                        itemStyle: {
                          color: colorMap[d.name] ?? cssVar('--gold'),
                          borderRadius: [4, 4, 0, 0],
                        },
                      })),
                      label: {
                        show: true,
                        position: 'top',
                        color: cssVar('--text-3'),
                        fontSize: 11,
                        fontFamily: "'Geist Mono','Geist',sans-serif",
                        formatter: '{c}',
                      },
                    },
                  ],
                };
              }}
            />
            {/* 图例 */}
            <div className="row gap-3 wrap" style={{ marginTop: 8 }}>
              {classDist.map((d) => (
                <div key={d.name} className="row gap-1" style={{ alignItems: 'center' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: CLASS_COLORS[d.cls],
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span className="t-small text-3">{d.name}</span>
                  <span className="t-small mononum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {/* 访问审计流 */}
          <Panel
            title="访问审计流"
            icon={<Eye size={13} />}
            bodyClass="panel-body"
            right={
              <span className="t-small text-3 mononum">{GOV_AUDITS.length} 条</span>
            }
          >
            <div className="col gap-1">
              {GOV_AUDITS.map((a) => (
                <AuditRow key={a.id} audit={a} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── PolicyRow ────────────────────────────────────────────────────────────────
function PolicyRow({
  policy: p,
  open,
  onToggle,
}: {
  policy: GovPolicy;
  open: boolean;
  onToggle: () => void;
}) {
  const isGov07 = p.id === 'GOV-07';
  return (
    <>
      <tr
        style={{
          cursor: 'pointer',
          background: isGov07
            ? 'color-mix(in srgb, var(--danger) 5%, transparent)'
            : undefined,
        }}
        onClick={onToggle}
      >
        <td>
          <span
            className="mononum"
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: isGov07 ? 'var(--danger)' : 'var(--text-2)',
              fontWeight: isGov07 ? 700 : 500,
            }}
          >
            {p.id}
          </span>
          {isGov07 && (
            <Lock size={11} style={{ color: 'var(--danger)', marginLeft: 4, verticalAlign: '-1px' }} />
          )}
        </td>
        <td>
          <div style={{ lineHeight: 1.4 }}>
            <span className="t-small" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {p.resource}
            </span>
            <br />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
              {p.field}
            </span>
          </div>
        </td>
        <td>
          <ClassBadge cls={p.classification} />
        </td>
        <td>
          <MaskBadge mask={p.mask} />
        </td>
        <td>
          <div className="row gap-1 wrap">
            {p.appliesTo.length === 0 ? (
              <span className="t-small text-3">全部</span>
            ) : (
              p.appliesTo.map((role) => (
                <Badge key={role} color="var(--info)">
                  {role}
                </Badge>
              ))
            )}
          </div>
        </td>
        <td>
          {open ? (
            <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />
          ) : (
            <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td
            colSpan={6}
            style={{
              padding: '8px 12px 12px 24px',
              background: 'var(--surface-2)',
            }}
          >
            <div className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
              {p.desc}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── MaskBadge ────────────────────────────────────────────────────────────────
function MaskBadge({ mask }: { mask: GovPolicy['mask'] }) {
  const toneMap: Record<GovPolicy['mask'], 'bad' | 'warn' | 'info' | 'muted'> = {
    禁止访问: 'bad',
    掩码: 'warn',
    哈希: 'warn',
    行级过滤: 'info',
    无: 'muted',
  };
  return <StatusBadge status={mask} tone={toneMap[mask]} />;
}

// ─── AuditRow ─────────────────────────────────────────────────────────────────
function AuditRow({ audit: a }: { audit: GovAudit }) {
  const dotColor = AUDIT_DOT[a.level];
  return (
    <div
      className="row gap-3"
      style={{
        padding: '9px 12px',
        borderRadius: 'var(--r-md)',
        background:
          a.level === 'danger'
            ? 'color-mix(in srgb, var(--danger) 5%, transparent)'
            : 'transparent',
        alignItems: 'flex-start',
        borderLeft: `2px solid ${dotColor}`,
      }}
    >
      {/* dot */}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          marginTop: 5,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row gap-2" style={{ marginBottom: 3, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
            {a.user}
          </span>
          <StatusBadge status={a.action} tone={AUDIT_TONE[a.level]} />
        </div>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span
            className="t-small mononum"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
          >
            {a.resource}
          </span>
          <span className="t-small text-3">·</span>
          <span className="t-small mononum" style={{ color: 'var(--text-3)' }}>
            {a.at}
          </span>
        </div>
      </div>
    </div>
  );
}
