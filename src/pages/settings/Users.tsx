import { useState, useMemo } from 'react';
import { UserPlus, Search, MoreVertical, Users2, UserCheck, ShieldCheck, Eye } from 'lucide-react';
import { Card, PageHeader, Badge, SectionTitle } from '../../components/ui';
import { MOCK_USERS, ROLES } from '../../lib/mockData';
import type { RoleId } from '../../types';

// ─── helpers ─────────────────────────────────────────────────────────────────
function roleById(id: RoleId) {
  return ROLES.find(r => r.id === id)!;
}

function initials(name: string) {
  return name.slice(0, 2);
}

function scope(u: (typeof MOCK_USERS)[0]): string {
  if (u.models && u.models.length) return u.models.join(' · ');
  if (u.region) return u.region;
  return '全域';
}

const ROLE_OPTIONS: { value: '' | RoleId; label: string }[] = [
  { value: '', label: '全部角色' },
  { value: 'director', label: '策略总监' },
  { value: 'analyst', label: '策略分析师' },
  { value: 'regional_sales', label: '区域销售' },
  { value: 'viewer', label: '访客/只读' },
];

// ─── stat mini-cards ──────────────────────────────────────────────────────────
function UserStatCards() {
  const total = MOCK_USERS.length;
  const active = MOCK_USERS.filter(u => u.status === 'active').length;
  const byRole = ROLES.map(r => ({ ...r, count: MOCK_USERS.filter(u => u.role === r.id).length }));

  const stats = [
    { label: '总用户数', value: total, icon: <Users2 size={14} />, color: 'var(--gold)' },
    { label: '活跃用户', value: active, icon: <UserCheck size={14} />, color: 'var(--emerald)' },
    ...byRole.map(r => ({ label: r.name, value: r.count, icon: null, color: r.color })),
  ];

  return (
    <div className="row wrap gap-3" style={{ marginBottom: 20 }}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`reveal reveal-${Math.min(i + 1, 6)}`}
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 130,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="label">{s.label}</span>
            <span
              className="tnum"
              style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.01em', lineHeight: 1 }}
            >
              {s.value}
            </span>
          </div>
          {s.icon && <span style={{ color: s.color, opacity: 0.5, marginLeft: 'auto' }}>{s.icon}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── avatar cell ──────────────────────────────────────────────────────────────
function AvatarCell({ name, dept }: { name: string; dept?: string }) {
  return (
    <div className="row gap-3">
      <div
        className="avatar"
        style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}
      >
        {initials(name)}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>{name}</div>
        {dept && <div className="t-small text-3" style={{ lineHeight: 1.3, marginTop: 1 }}>{dept}</div>}
      </div>
    </div>
  );
}

// ─── status chip ─────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: 'active' | 'inactive' }) {
  const isActive = status === 'active';
  return (
    <span
      className="row gap-1"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 'var(--r-pill)',
        fontSize: 11,
        fontWeight: 600,
        background: isActive
          ? 'color-mix(in srgb, var(--emerald) 12%, transparent)'
          : 'color-mix(in srgb, var(--text-3) 10%, transparent)',
        color: isActive ? 'var(--emerald)' : 'var(--text-3)',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      {isActive ? '活跃' : '停用'}
    </span>
  );
}

// ─── main component ──────────────────────────────────────────────────────────
export default function Users() {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | RoleId>('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_USERS.filter(u => {
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchQuery = !q || u.name.includes(q) || u.email.toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  }, [query, roleFilter]);

  return (
    <div className="page">
      <PageHeader
        title="用户管理"
        subtitle="系统账号、角色分配与数据权限"
        actions={
          <button className="btn btn-primary reveal reveal-1" style={{ gap: 6 }}>
            <UserPlus size={14} strokeWidth={2} />
            新增用户
          </button>
        }
      />

      <UserStatCards />

      <Card className="reveal reveal-2" style={{ padding: 0, overflow: 'hidden' }}>
        {/* filter bar */}
        <div
          className="row gap-3 spread"
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--hairline)',
            background: 'var(--surface-2)',
          }}
        >
          <div className="row gap-3 flex-1">
            <div className="input-wrap" style={{ maxWidth: 280 }}>
              <Search size={14} className="input-icon" />
              <input
                className="input"
                placeholder="搜索姓名或邮箱…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ width: 280 }}
              />
            </div>
            <select
              className="input"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as '' | RoleId)}
              style={{ width: 140 }}
            >
              {ROLE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <span className="label" style={{ flexShrink: 0 }}>
            共 <span className="tnum" style={{ color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>{filtered.length}</span> 位用户
          </span>
        </div>

        {/* table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>姓名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>负责范围</th>
                <th>最后登录</th>
                <th>状态</th>
                <th style={{ width: 48 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const role = roleById(u.role);
                return (
                  <tr key={u.id}>
                    <td>
                      <AvatarCell name={u.name} dept={u.dept} />
                    </td>
                    <td>
                      <span className="mono t-small" style={{ color: 'var(--text-3)', letterSpacing: '0.01em' }}>
                        {u.email}
                      </span>
                    </td>
                    <td>
                      <Badge color={role.color}>{role.name}</Badge>
                    </td>
                    <td>
                      <span className="t-small" style={{ color: 'var(--text-2)' }}>
                        {scope(u)}
                      </span>
                    </td>
                    <td>
                      <span className="tnum t-small text-3">{u.lastLogin ?? '—'}</span>
                    </td>
                    <td>
                      <StatusChip status={u.status} />
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{ padding: 6, borderColor: 'transparent' }}
                        title="更多操作"
                      >
                        <MoreVertical size={14} strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div
                      className="col"
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '48px 20px',
                        color: 'var(--text-3)',
                        gap: 8,
                      }}
                    >
                      <Eye size={28} strokeWidth={1.25} style={{ opacity: 0.3 }} />
                      <span className="t-small">未找到匹配用户</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* role legend */}
      <div className="row gap-4 wrap reveal reveal-3" style={{ marginTop: 16 }}>
        <span className="label" style={{ marginRight: 4 }}>角色说明</span>
        {ROLES.map(r => (
          <div key={r.id} className="row gap-2" style={{ fontSize: 12, color: 'var(--text-2)' }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: r.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 600, color: r.color }}>{r.name}</span>
            <span className="text-3">— {r.description}</span>
          </div>
        ))}
      </div>

      {/* bottom description row */}
      <div className="row gap-2 reveal reveal-4" style={{ marginTop: 12 }}>
        <ShieldCheck size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <span className="t-small text-3">权限由角色继承，如需精细化授权请前往「角色权限管理」配置</span>
      </div>
    </div>
  );
}
