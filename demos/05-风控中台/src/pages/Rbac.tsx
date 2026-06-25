// ════════════════════════════════════════════════════════════════════════
// AI 风控中台 · 角色与权限（RBAC 矩阵）perm=rbac:read
// 4 角色 × 权限矩阵 · 分权即职责边界
// ════════════════════════════════════════════════════════════════════════
import { Fragment, useState } from 'react';
import { ShieldCheck, ShieldMinus, Users, Lock, Eye, Edit3, Database } from 'lucide-react';
import { PageHeader, Badge, SectionTitle } from '../components/ui';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import { ROLES, PERMISSIONS } from '../lib/mockData';
import { useAuth } from '../contexts/AuthContext';
import { accent, pass, baseOption, axisStyle, DRAW } from '../lib/chartTheme';

// ─── 分类图标映射 ────────────────────────────────────────────────────────────
const CAT_ICON: Record<string, React.ReactNode> = {
  page: <Eye size={13} />,
  action: <Edit3 size={13} />,
  data: <Database size={13} />,
};

const CAT_LABEL: Record<string, string> = {
  page: '页面访问',
  action: '处置操作',
  data: '数据权限',
};

// ─── 当前角色高亮样式 ────────────────────────────────────────────────────────
const ROLE_COLOR_DIM = (color: string) =>
  `color-mix(in srgb, ${color} 14%, transparent)`;

export default function Rbac() {
  const { hasPermission, currentRole } = useAuth();
  const canView = hasPermission('rbac:read');

  // 按 category 分组权限
  const categories = ['page', 'action', 'data'] as const;
  const grouped = categories.map(cat => ({
    cat,
    perms: PERMISSIONS.filter(p => p.category === cat),
  }));

  // 角色权限数统计（用于图表）
  const roleCounts = ROLES.map(r => r.permissions.length);

  // 选中的角色（用于高亮列）
  const [activeRole, setActiveRole] = useState<string | null>(null);

  // ECharts 各角色权限数对比条形图
  const buildBarOption = () => {
    return {
      ...baseOption(),
      ...DRAW,
      grid: { left: 16, right: 24, top: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        max: PERMISSIONS.length,
        ...axisStyle(),
        splitLine: { show: true, lineStyle: { color: 'var(--hairline)', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: ROLES.map(r => r.enName),
        ...axisStyle(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: 'var(--text-3)',
          fontSize: 11,
          fontFamily: "'Geist Mono','Geist',sans-serif",
        },
      },
      series: [
        {
          type: 'bar',
          data: ROLES.map((r, i) => ({
            value: r.permissions.length,
            itemStyle: {
              color: i === ROLES.findIndex(x => x.id === activeRole)
                ? accent()
                : `color-mix(in srgb, ${accent()} 52%, var(--surface-3))`,
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barMaxWidth: 28,
          label: {
            show: true,
            position: 'right',
            color: 'var(--text-2)',
            fontSize: 12,
            fontFamily: "'Geist Mono',monospace",
            formatter: (p: { value: number }) => `${p.value}项`,
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'none' },
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0];
          return `<span style="font-family:'Geist Mono',monospace">${p.name}: <b>${p.value}</b> 项权限</span>`;
        },
      },
    };
  };

  if (!canView) {
    return (
      <div className="page">
        <PageHeader title="角色与权限" subtitle="当前角色无访问此页面的权限" />
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          <Lock size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>您的角色（{currentRole?.name ?? '未知'}）无权访问角色权限管理页</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="角色与权限"
        subtitle="4 角色 × 权限矩阵 · 分权即职责边界 · 最小特权原则"
        actions={
          <span className="row gap-2">
            <Badge color="var(--success)">
              <ShieldCheck size={12} />实施最小特权
            </Badge>
            <Badge color="var(--gold)">
              <Users size={13} />4 角色 · {PERMISSIONS.length} 权限
            </Badge>
          </span>
        }
      />

      {/* 角色总览卡 × 4 */}
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}
      >
        {ROLES.map((role, i) => {
          const isActive = activeRole === role.id;
          const isCurrent = currentRole?.id === role.id;
          return (
            <div
              key={role.id}
              className="card card-hover reveal"
              style={{
                animationDelay: `${i * 60}ms`,
                cursor: 'pointer',
                border: isActive
                  ? `1px solid color-mix(in srgb, ${role.color} 55%, transparent)`
                  : '1px solid var(--hairline)',
                boxShadow: isActive ? `0 0 0 1px color-mix(in srgb, ${role.color} 18%, transparent), var(--elev-1)` : undefined,
              }}
              onClick={() => setActiveRole(isActive ? null : role.id)}
            >
              {/* 角色色标条 */}
              <div
                style={{
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  background: role.color,
                  margin: '-16px -16px 14px',
                  opacity: isActive ? 1 : 0.55,
                }}
              />
              <div className="row gap-2 spread" style={{ marginBottom: 8 }}>
                <div className="col gap-1">
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
                    {role.name}
                    {isCurrent && (
                      <span className="badge" style={{ marginLeft: 6, fontSize: 10, background: ROLE_COLOR_DIM(role.color), color: role.color }}>
                        当前
                      </span>
                    )}
                  </div>
                  <div className="t-small text-3" style={{ fontFamily: "'Geist Mono',monospace" }}>{role.enName}</div>
                </div>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: ROLE_COLOR_DIM(role.color),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: role.color, flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="t-small text-2" style={{ lineHeight: 1.55, marginBottom: 12 }}>
                {role.description}
              </div>
              <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                <span className="t-small" style={{ color: role.color, fontWeight: 700, fontFamily: "'Geist Mono',monospace" }}>
                  {role.permissions.length}
                </span>
                <span className="t-small text-3">项权限</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 主体：矩阵 + 条形图 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 240px', gap: 12, alignItems: 'start' }}>

        {/* 权限矩阵表 */}
        <Panel
          title="权限矩阵"
          icon={<Lock size={14} style={{ marginRight: 6, color: 'var(--gold)' }} />}
          right={
            <span className="t-small text-3">
              点击角色卡高亮对应列 · 绿点=有权 · 灰线=无权
            </span>
          }
          bodyClass="panel-body-0"
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ tableLayout: 'fixed', minWidth: 680 }}>
              <colgroup>
                <col style={{ width: '28%' }} />
                {ROLES.map(r => (
                  <col key={r.id} style={{ width: `${72 / ROLES.length}%` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingLeft: 16 }}>权限项</th>
                  {ROLES.map(role => (
                    <th
                      key={role.id}
                      style={{
                        textAlign: 'center',
                        cursor: 'pointer',
                        color: activeRole === role.id ? role.color : undefined,
                        background: activeRole === role.id
                          ? ROLE_COLOR_DIM(role.color)
                          : undefined,
                        transition: 'background 0.2s, color 0.2s',
                        padding: '10px 8px',
                      }}
                      onClick={() => setActiveRole(activeRole === role.id ? null : role.id)}
                    >
                      <div style={{ fontWeight: 700, fontSize: 11 }}>{role.name}</div>
                      <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, opacity: 0.6, marginTop: 2 }}>
                        {role.enName}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ cat, perms }) => (
                  <Fragment key={cat}>
                    {/* 分类标题行 */}
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          background: 'var(--surface-2)',
                          padding: '7px 16px',
                          borderTop: '1px solid var(--hairline)',
                          borderBottom: '1px solid var(--hairline)',
                        }}
                      >
                        <span className="row gap-2" style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {CAT_ICON[cat]}
                          {CAT_LABEL[cat]}
                          <span
                            className="badge"
                            style={{
                              fontSize: 10,
                              background: cat === 'action'
                                ? 'color-mix(in srgb, var(--warning) 14%, transparent)'
                                : cat === 'data'
                                  ? 'color-mix(in srgb, var(--info) 14%, transparent)'
                                  : 'color-mix(in srgb, var(--success) 14%, transparent)',
                              color: cat === 'action'
                                ? 'var(--warning)'
                                : cat === 'data'
                                  ? 'var(--info)'
                                  : 'var(--success)',
                            }}
                          >
                            {perms.length}
                          </span>
                        </span>
                      </td>
                    </tr>
                    {perms.map(perm => (
                      <tr key={perm.key}>
                        <td style={{ paddingLeft: 16, paddingRight: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{perm.label}</div>
                          <div className="t-small text-3" style={{ marginTop: 2 }}>{perm.desc}</div>
                        </td>
                        {ROLES.map(role => {
                          const hasPerm = role.permissions.includes(perm.key);
                          const isHighlit = activeRole === role.id;
                          return (
                            <td
                              key={role.id}
                              style={{
                                textAlign: 'center',
                                background: isHighlit
                                  ? hasPerm
                                    ? `color-mix(in srgb, ${role.color} 8%, transparent)`
                                    : `color-mix(in srgb, var(--surface-2) 60%, transparent)`
                                  : undefined,
                                transition: 'background 0.2s',
                              }}
                            >
                              {hasPerm ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    background: `color-mix(in srgb, ${pass()} 16%, transparent)`,
                                    color: 'var(--success)',
                                  }}
                                >
                                  <ShieldCheck size={13} />
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 22,
                                    height: 22,
                                  }}
                                >
                                  <ShieldMinus size={13} style={{ color: 'var(--text-3)', opacity: 0.4 }} />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* 右侧：条形图 + 说明 */}
        <div className="col gap-3">
          <Panel
            title="各角色权限数"
            icon={<Users size={14} style={{ marginRight: 6, color: 'var(--gold)' }} />}
            bodyClass="panel-body"
          >
            <Chart
              build={buildBarOption}
              height={180}
              deps={[activeRole]}
            />
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid var(--hairline)',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {ROLES.map(r => (
                <div key={r.id} className="row gap-1" style={{ alignItems: 'center' }}>
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: r.color, display: 'inline-block', flexShrink: 0,
                    }}
                  />
                  <span className="t-small text-3" style={{ fontSize: 10 }}>{r.enName}</span>
                  <span className="t-small mononum" style={{ fontSize: 10, color: r.color }}>
                    {r.permissions.length}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {/* 权限原则说明 */}
          <Panel
            title="权限设计原则"
            icon={<Lock size={14} style={{ marginRight: 6, color: 'var(--gold)' }} />}
            bodyClass="panel-body"
          >
            <div className="col gap-3">
              <PrincipleItem
                icon={<ShieldCheck size={14} />}
                color="var(--success)"
                title="最小特权"
                desc="每角色仅授予完成本职工作所需最少权限，处置类与查看类严格分离。"
              />
              <PrincipleItem
                icon={<Lock size={14} />}
                color="var(--gold)"
                title="职责分离"
                desc="SAR 上报权只给合规官，策略发布权只给策略管理员，防单人兼任操控风险。"
              />
              <PrincipleItem
                icon={<Eye size={14} />}
                color="var(--warning)"
                title="只读兜底"
                desc="首席风险官全模块只读，保障高管视角完整的同时杜绝误操作。"
              />
              <PrincipleItem
                icon={<Database size={14} />}
                color="var(--info)"
                title="审计可追溯"
                desc="所有处置类操作生成不可篡改审计指纹，满足 EU AI Act 合规要求。"
              />
            </div>
          </Panel>

          {/* 权限分布摘要 */}
          <Panel
            title="权限覆盖摘要"
            icon={<ShieldCheck size={14} style={{ marginRight: 6, color: 'var(--gold)' }} />}
            bodyClass="panel-body"
          >
            <div className="col gap-2">
              {categories.map(cat => {
                const perms = PERMISSIONS.filter(p => p.category === cat);
                return (
                  <div key={cat} className="row spread" style={{ alignItems: 'center' }}>
                    <span className="row gap-1 t-small text-2" style={{ alignItems: 'center' }}>
                      {CAT_ICON[cat]}
                      {CAT_LABEL[cat]}
                    </span>
                    <span className="mononum t-small" style={{ color: 'var(--gold)', fontWeight: 700 }}>
                      {perms.length}
                    </span>
                  </div>
                );
              })}
              <div
                style={{
                  marginTop: 4,
                  paddingTop: 8,
                  borderTop: '1px solid var(--hairline)',
                }}
                className="row spread"
              >
                <span className="t-small text-3">合计</span>
                <span className="mononum t-small" style={{ color: 'var(--text-1)', fontWeight: 700 }}>
                  {PERMISSIONS.length}
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* 底部：角色详情行（颜色 + 完整权限标签云） */}
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}
      >
        {ROLES.map((role, i) => (
          <Panel
            key={role.id}
            title={
              <span className="row gap-2" style={{ alignItems: 'center' }}>
                <span
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: role.color, display: 'inline-block', flexShrink: 0,
                  }}
                />
                {role.name}
              </span>
            }
            bodyClass="panel-body"
            className="reveal"
            style={{ animationDelay: `${i * 60 + 200}ms` }}
          >
            <div
              className="row gap-1"
              style={{ flexWrap: 'wrap', gap: 5 }}
            >
              {role.permissions.map(pk => {
                const perm = PERMISSIONS.find(p => p.key === pk);
                if (!perm) return null;
                const isAction = perm.category === 'action';
                const isData = perm.category === 'data';
                const tagColor = isAction
                  ? 'var(--warning)'
                  : isData
                    ? 'var(--info)'
                    : role.color;
                return (
                  <span
                    key={pk}
                    className="badge"
                    style={{
                      fontSize: 10.5,
                      background: `color-mix(in srgb, ${tagColor} 12%, transparent)`,
                      color: tagColor,
                      padding: '2px 7px',
                      borderRadius: 5,
                    }}
                  >
                    {perm.label}
                  </span>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

// ─── 权限原则条目 ─────────────────────────────────────────────────────────────
function PrincipleItem({ icon, color, title, desc }: {
  icon: React.ReactNode; color: string; title: string; desc: string;
}) {
  return (
    <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
      <div
        style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
          color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 1,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{title}</div>
        <div className="t-small text-3" style={{ lineHeight: 1.55 }}>{desc}</div>
      </div>
    </div>
  );
}
