import { useState } from 'react';
import { KeyRound, Users, Check, Shield, UserCheck, User } from 'lucide-react';
import { Card, PageHeader, SectionTitle } from '../components/ui';
import { DataTable, type Col } from '../components/DataTable';
import { StatusBadge } from '../components/kit';
import { ROLES, MOCK_USERS, ALL_PERMISSIONS } from '../lib/mockData';
import type { Role, User as UserType, Permission, PermCategory, PermissionKey } from '../types';

// ─── 分组顺序 ──────────────────────────────────────────────────────────────────
const CATEGORY_ORDER: PermCategory[] = ['page', 'action', 'data'];
const CATEGORY_LABELS: Record<PermCategory, string> = {
  page: '页面访问',
  action: '操作权限',
  data: '数据范围',
};

// ─── 角色图标映射 ─────────────────────────────────────────────────────────────
function RoleIcon({ roleId }: { roleId: string }) {
  if (roleId === 'qa_lead') return <Shield size={18} />;
  if (roleId === 'compliance') return <UserCheck size={18} />;
  if (roleId === 'qa') return <KeyRound size={18} />;
  return <User size={18} />;
}

// ─── 演示用户表列（需用 UserType 保持严格类型）──────────────────────────────────
function makeUserCols(roles: Role[]): Col<UserType>[] {
  return [
    { key: 'name', header: '姓名', width: 90 },
    {
      key: 'username', header: '工号', width: 110,
      render: (r: UserType) => <span className="mono">{r.username}</span>,
    },
    {
      key: 'role', header: '角色', width: 120,
      render: (r: UserType) => {
        const role = roles.find((ro: Role) => ro.id === r.role);
        if (!role) return <span className="text-3">—</span>;
        return (
          <span
            className="badge"
            style={{
              background: `color-mix(in srgb, ${role.color} 14%, transparent)`,
              color: role.color,
              fontWeight: 600,
            }}
          >
            {role.name}
          </span>
        );
      },
    },
    {
      key: 'dept', header: '部门', width: 130,
      render: (r: UserType) => <span className="text-2">{r.dept ?? '—'}</span>,
    },
    {
      key: 'status', header: '状态', width: 80,
      render: (r: UserType) => (
        <StatusBadge
          status={r.status === 'active' ? '在职' : '停用'}
          tone={r.status === 'active' ? 'good' : 'muted'}
        />
      ),
    },
    {
      key: 'lastLogin', header: '最后登录', width: 170,
      render: (r: UserType) => (
        <span className="mono text-3" style={{ fontSize: 12 }}>{r.lastLogin ?? '—'}</span>
      ),
    },
  ];
}

export default function RBAC() {
  const [selectedRole, setSelectedRole] = useState<Role>(ROLES[0]);

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: ALL_PERMISSIONS.filter((p: Permission) => p.category === cat),
  }));

  const userCols = makeUserCols(ROLES);

  return (
    <div className="page">
      <PageHeader
        title="角色与权限"
        subtitle="4 角色 × 21 项权限矩阵；导航与操作按角色实时分权，侧栏可见项随角色身份动态调整。"
        actions={
          <div className="row gap-2">
            <KeyRound size={15} style={{ color: 'var(--gold)', opacity: 0.8 }} />
            <span className="t-small text-3">RBAC · 4 角色 · 21 权限</span>
          </div>
        }
      />

      {/* 说明条 */}
      <div
        className="row gap-2 reveal"
        style={{
          background: 'color-mix(in srgb, var(--gold) 7%, transparent)',
          border: '1px solid color-mix(in srgb, var(--gold) 22%, transparent)',
          borderRadius: 'var(--r-sm)',
          padding: '10px 16px',
          marginBottom: 24,
        }}
      >
        <Shield size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <span className="t-small" style={{ color: 'var(--text-2)' }}>
          导航侧栏可见项、操作按钮、数据范围均按角色实时分权；坐席仅可查看本人会话，无法访问团队数据。
        </span>
      </div>

      {/* 两栏主体：左角色卡 + 右权限矩阵 */}
      <div
        className="reveal-1"
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: 20,
          alignItems: 'start',
          marginBottom: 32,
        }}
      >
        {/* 左：4 角色卡 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionTitle right={<span className="mono text-3" style={{ fontSize: 11 }}>4 角色</span>}>
            角色列表
          </SectionTitle>
          {ROLES.map((role: Role) => {
            const isSelected = selectedRole.id === role.id;
            return (
              <Card
                key={role.id}
                hover
                onClick={() => setSelectedRole(role)}
                style={{
                  cursor: 'pointer',
                  border: isSelected
                    ? `1.5px solid ${role.color}`
                    : '1px solid var(--hairline)',
                  boxShadow: isSelected
                    ? `0 0 0 3px color-mix(in srgb, ${role.color} 12%, transparent)`
                    : undefined,
                  transition: 'border 0.18s, box-shadow 0.18s',
                }}
              >
                <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--r-sm)',
                      background: `color-mix(in srgb, ${role.color} 14%, transparent)`,
                      color: role.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <RoleIcon roleId={role.id} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row gap-2" style={{ marginBottom: 4, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 14 }}>{role.name}</span>
                      <span
                        className="badge mono"
                        style={{
                          background: `color-mix(in srgb, ${role.color} 14%, transparent)`,
                          color: role.color,
                          fontSize: 11,
                        }}
                      >
                        {role.permissions.length} 项
                      </span>
                    </div>
                    <div className="t-small text-3" style={{ lineHeight: 1.5 }}>{role.description}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 右：权限矩阵表 */}
        <div>
          <SectionTitle
            right={
              <span className="t-small text-3">
                <span className="mono">✓</span> 有权限 &nbsp;
                <span className="mono">—</span> 无权限
              </span>
            }
          >
            权限矩阵
          </SectionTitle>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ tableLayout: 'fixed', minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ width: 200, textAlign: 'left' }}>权限项</th>
                    {ROLES.map((role: Role) => (
                      <th
                        key={role.id}
                        style={{
                          textAlign: 'center',
                          background: selectedRole.id === role.id
                            ? `color-mix(in srgb, ${role.color} 9%, transparent)`
                            : undefined,
                          color: selectedRole.id === role.id ? role.color : undefined,
                          transition: 'background 0.2s',
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: 13,
                          fontWeight: selectedRole.id === role.id ? 700 : 500,
                        }}
                        onClick={() => setSelectedRole(role)}
                      >
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(group => (
                    <>
                      {/* 分组标头行 */}
                      <tr key={`grp-${group.cat}`}>
                        <td
                          colSpan={5}
                          style={{
                            background: 'var(--surface-2)',
                            padding: '6px 16px',
                            borderTop: '1px solid var(--hairline)',
                            borderBottom: '1px solid var(--hairline)',
                          }}
                        >
                          <span
                            className="label"
                            style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                          >
                            {group.label}
                          </span>
                        </td>
                      </tr>
                      {/* 权限行 */}
                      {group.items.map((perm: Permission) => (
                        <tr key={perm.key}>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-1)', marginBottom: 1 }}>
                              {perm.label}
                            </div>
                            <div className="t-small text-3" style={{ fontSize: 11 }}>{perm.desc}</div>
                          </td>
                          {ROLES.map((role: Role) => {
                            const has = (role.permissions as PermissionKey[]).includes(perm.key);
                            const isHighlighted = selectedRole.id === role.id;
                            return (
                              <td
                                key={role.id}
                                style={{
                                  textAlign: 'center',
                                  background: isHighlighted
                                    ? `color-mix(in srgb, ${role.color} 5%, transparent)`
                                    : undefined,
                                }}
                              >
                                {has ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 22,
                                      height: 22,
                                      borderRadius: '50%',
                                      background: 'color-mix(in srgb, var(--success) 16%, transparent)',
                                    }}
                                  >
                                    <Check size={12} style={{ color: 'var(--success)', strokeWidth: 2.5 }} />
                                  </span>
                                ) : (
                                  <span className="text-3" style={{ fontSize: 16, lineHeight: '1' }}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* 演示用户 DataTable */}
      <div className="reveal-2">
        <SectionTitle
          right={
            <div className="row gap-2">
              <Users size={14} style={{ color: 'var(--text-3)' }} />
              <span className="mono text-3" style={{ fontSize: 11 }}>{MOCK_USERS.length} 用户</span>
            </div>
          }
        >
          演示用户
        </SectionTitle>
        <Card style={{ padding: 0 }}>
          <DataTable<UserType>
            cols={userCols}
            rows={MOCK_USERS}
            rowKey={(r: UserType) => r.id}
            dense
            rowClass={(r: UserType) => r.status === 'inactive' ? 'text-3' : ''}
            empty={{ title: '暂无用户数据' }}
          />
        </Card>
      </div>
    </div>
  );
}
