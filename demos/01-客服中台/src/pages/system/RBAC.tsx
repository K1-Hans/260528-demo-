import { useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Ban, CheckCircle2, ShieldCheck, Lock, Users } from 'lucide-react';
import { PageHeader, Card, SectionTitle } from '../../components/ui';
import { DataTable, type Col } from '../../components/DataTable';
import { Toolbar, Field, Modal, toast } from '../../components/kit';
import { MOCK_USERS, ROLES, ALL_PERMISSIONS } from '../../lib/mockData';
import type { User, RoleId, PermCategory } from '../../types';

// ─── 本地补充演示账号（让账户表更丰满 · 真实消金岗位）──────────────────────────
const EXTRA_USERS: User[] = [
  { id: 'u-007', name: '陈璐', username: 'chenlu', role: 'knowledge', dept: '知识运营组', lastLogin: '2026-06-16 08:31', status: 'active', createdAt: '2026-04-18 10:05', note: '转人工库 / 寒暄维护' },
  { id: 'u-008', name: '黄锐', username: 'huangrui', role: 'qa_lead', dept: '在线客服三组', lastLogin: '2026-06-15 21:02', status: 'active', createdAt: '2026-04-25 09:30', note: '夜班坐席班长' },
  { id: 'u-009', name: '李文静', username: 'liwj', role: 'compliance', dept: '合规风控部', lastLogin: '2026-06-16 09:20', status: 'active', createdAt: '2026-05-06 14:00', note: '审计导出 / 监管报送' },
  { id: 'u-010', name: '徐航', username: 'xuhang', role: 'knowledge', dept: '知识运营组', lastLogin: '2026-06-13 11:48', status: 'active', createdAt: '2026-05-12 16:40', note: '场景 AB 版本' },
  { id: 'u-011', name: '马蕴', username: 'mayun', role: 'qa_lead', dept: '在线客服二组', lastLogin: '2026-04-30 15:22', status: 'inactive', createdAt: '2026-05-20 13:10', note: '休产假停用' },
  { id: 'u-012', name: '韩烁', username: 'hanshuo', role: 'director', dept: '智能客服运营中心', lastLogin: '2026-06-16 07:55', status: 'active', createdAt: '2026-05-28 10:00', note: '运营副总监 · 备份管理员' },
];

const ROLE_MAP: Record<RoleId, (typeof ROLES)[number]> = Object.fromEntries(
  ROLES.map(r => [r.id, r]),
) as Record<RoleId, (typeof ROLES)[number]>;

const CAT_LABEL: Record<PermCategory, string> = { page: '页面访问', action: '操作权限', data: '数据权限' };

// ─── 角色色徽章 ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: RoleId }) {
  const r = ROLE_MAP[role];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${r.color} 14%, transparent)`, color: r.color }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
      {r.name}
    </span>
  );
}

// ─── 启用 / 禁用状态徽章 ──────────────────────────────────────────────────────
function UserStatusBadge({ status }: { status: User['status'] }) {
  const on = status === 'active';
  const c = on ? 'var(--success)' : 'var(--text-3)';
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, display: 'inline-block' }} />
      {on ? '已启用' : '已禁用'}
    </span>
  );
}

type ModalMode = { kind: 'add' } | { kind: 'edit'; user: User };

interface FormState { username: string; name: string; role: RoleId; status: User['status']; note: string }

const EMPTY_FORM: FormState = { username: '', name: '', role: 'knowledge', status: 'active', note: '' };

export default function RBAC() {
  const [users, setUsers] = useState<User[]>([...MOCK_USERS, ...EXTRA_USERS]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleId | '全部'>('全部');
  const [statusFilter, setStatusFilter] = useState<User['status'] | '全部'>('全部');

  const [modal, setModal] = useState<ModalMode | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // ─── 权限矩阵分组（page → action）────────────────────────────────────────────
  const groupedPerms = useMemo(() => {
    const order: PermCategory[] = ['page', 'action', 'data'];
    return order
      .map(cat => ({ cat, perms: ALL_PERMISSIONS.filter(p => p.category === cat) }))
      .filter(g => g.perms.length > 0);
  }, []);

  // ─── 账户筛选 ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== '全部' && u.role !== roleFilter) return false;
      if (statusFilter !== '全部' && u.status !== statusFilter) return false;
      if (q && !(u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const activeCount = users.filter(u => u.status === 'active').length;

  // ─── 操作 ────────────────────────────────────────────────────────────────────
  const openAdd = () => { setForm(EMPTY_FORM); setModal({ kind: 'add' }); };
  const openEdit = (u: User) => {
    setForm({ username: u.username, name: u.name, role: u.role, status: u.status, note: u.note ?? '' });
    setModal({ kind: 'edit', user: u });
  };

  const saveForm = () => {
    if (!form.username.trim() || !form.name.trim()) { toast('用户名与姓名为必填', 'warn'); return; }
    if (!modal) return;
    if (modal.kind === 'add') {
      if (users.some(u => u.username.toLowerCase() === form.username.trim().toLowerCase())) {
        toast('用户名已存在', 'warn'); return;
      }
      const id = `u-${String(users.length + 1).padStart(3, '0')}`;
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      setUsers(prev => [
        { id, username: form.username.trim(), name: form.name.trim(), role: form.role, status: form.status, note: form.note.trim() || undefined, dept: ROLE_MAP[form.role].name + '组', createdAt: now, lastLogin: '—' },
        ...prev,
      ]);
      toast(`已创建账户「${form.name.trim()}」· 权限即时下发`, 'success');
    } else {
      const target = modal.user;
      setUsers(prev => prev.map(u => u.id === target.id
        ? { ...u, username: form.username.trim(), name: form.name.trim(), role: form.role, status: form.status, note: form.note.trim() || undefined }
        : u));
      toast(`已更新账户「${form.name.trim()}」`, 'success');
    }
    setModal(null);
  };

  const toggleStatus = (u: User) => {
    const next: User['status'] = u.status === 'active' ? 'inactive' : 'active';
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: next } : x));
    toast(next === 'active' ? `已启用「${u.name}」· 重新分配权限` : `已禁用「${u.name}」· 会话立即失效`, next === 'active' ? 'success' : 'warn');
  };

  const removeUser = (u: User) => {
    setUsers(prev => prev.filter(x => x.id !== u.id));
    toast(`已删除账户「${u.name}」`, 'danger');
  };

  // ─── 账户表列 ────────────────────────────────────────────────────────────────
  const cols: Col<User>[] = [
    {
      key: 'id', header: '账号 ID', width: 96, sortable: true, nowrap: true,
      render: u => <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.id}</span>,
    },
    {
      key: 'username', header: '用户名', width: 130, sortable: true,
      render: u => <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-1)', fontWeight: 600 }}>{u.username}</span>,
    },
    {
      key: 'name', header: '姓名', width: 110, sortable: true,
      render: u => (
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="avatar" style={{ width: 24, height: 24, fontSize: 11 }}>{u.name.slice(0, 1)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{u.name}</span>
        </div>
      ),
    },
    {
      key: 'role', header: '角色', width: 132, sortable: true,
      sortAccessor: u => ROLE_MAP[u.role].name,
      render: u => <RoleBadge role={u.role} />,
    },
    {
      key: 'dept', header: '部门', width: 150, nowrap: true,
      render: u => <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{u.dept ?? '—'}</span>,
    },
    {
      key: 'status', header: '状态', width: 100, sortable: true,
      sortAccessor: u => u.status,
      render: u => <UserStatusBadge status={u.status} />,
    },
    {
      key: 'createdAt', header: '创建时间', width: 150, sortable: true, nowrap: true,
      sortAccessor: u => u.createdAt ?? '',
      render: u => <span className="tnum" style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.createdAt ?? '—'}</span>,
    },
    {
      key: 'note', header: '备注', width: 160,
      render: u => <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{u.note ?? '—'}</span>,
    },
    {
      key: 'ops', header: '操作', width: 188,
      render: u => (
        <div className="row gap-1" onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" title="编辑" onClick={() => openEdit(u)}>
            <Pencil size={13} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title={u.status === 'active' ? '禁用' : '启用'}
            onClick={() => toggleStatus(u)}
            style={{ color: u.status === 'active' ? 'var(--warning)' : 'var(--success)' }}
          >
            {u.status === 'active' ? <Ban size={13} /> : <CheckCircle2 size={13} />}
            <span style={{ marginLeft: 3, fontSize: 12 }}>{u.status === 'active' ? '禁用' : '启用'}</span>
          </button>
          <button className="btn btn-ghost btn-sm" title="删除" onClick={() => removeUser(u)} style={{ color: 'var(--danger)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="分权管理"
        subtitle="账号与角色权限 · 4 角色 × 27 权限矩阵 · SSO 对接前 mock"
        actions={<button className="btn btn-primary" onClick={openAdd}><Plus size={15} />新增账户</button>}
      />

      {/* ─── 角色权限矩阵（亮点）────────────────────────────────────────────── */}
      <Card className="reveal" style={{ marginBottom: 18, overflow: 'hidden' }}>
        <SectionTitle right={
          <span className="row gap-1" style={{ fontSize: 12, color: 'var(--text-3)' }}>
            <ShieldCheck size={13} style={{ color: 'var(--gold)' }} />
            {ALL_PERMISSIONS.length} 权限 × {ROLES.length} 角色
          </span>
        }>
          <span className="row gap-2" style={{ alignItems: 'center' }}>
            <Lock size={14} style={{ color: 'var(--gold)' }} />角色权限矩阵
          </span>
        </SectionTitle>

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ width: 240, position: 'sticky', left: 0, background: 'var(--surface-1)', zIndex: 1 }}>权限项</th>
                {ROLES.map(r => (
                  <th key={r.id} style={{ textAlign: 'center', minWidth: 110 }}>
                    <span className="col gap-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span className="row gap-1" style={{ alignItems: 'center' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
                        <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{r.name}</span>
                      </span>
                      <span className="tnum" style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 500 }}>
                        {r.permissions.length} 项
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedPerms.map(group => (
                <FragmentRows key={group.cat} cat={group.cat}>
                  <tr>
                    <td colSpan={ROLES.length + 1} style={{ padding: '9px 14px', background: 'var(--surface-2)' }}>
                      <span className="section-label" style={{ color: 'var(--text-2)', letterSpacing: '0.06em' }}>
                        {CAT_LABEL[group.cat]} · {group.perms.length}
                      </span>
                    </td>
                  </tr>
                  {group.perms.map(perm => (
                    <tr key={perm.key}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--surface-1)', zIndex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{perm.label}</div>
                        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>{perm.key}</div>
                      </td>
                      {ROLES.map(r => {
                        const has = r.permissions.includes(perm.key);
                        return (
                          <td key={r.id} style={{ textAlign: 'center' }}>
                            {has
                              ? <span style={{ color: r.color, fontWeight: 700, fontSize: 14 }}>✓</span>
                              : <span style={{ color: 'var(--text-3)', opacity: 0.5 }}>—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </FragmentRows>
              ))}
            </tbody>
          </table>
        </div>

        {/* 角色说明脚注 */}
        <div className="wrap row gap-2" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>
          {ROLES.map(r => (
            <div key={r.id} className="row gap-2" style={{ alignItems: 'flex-start', flex: '1 1 240px', minWidth: 220 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12.5, color: 'var(--text-1)', fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5, marginTop: 1 }}>{r.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── 账户表 ─────────────────────────────────────────────────────────── */}
      <SectionTitle right={
        <span className="row gap-1" style={{ fontSize: 12, color: 'var(--text-3)' }}>
          <Users size={13} />
          <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{activeCount}</span> 启用
          &nbsp;/&nbsp;
          <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{users.length}</span> 总账户
        </span>
      }>
        账户列表
      </SectionTitle>

      <Toolbar>
        <div className="input-wrap" style={{ flex: '0 0 260px' }}>
          <Search size={14} className="input-icon" />
          <input
            className="input"
            style={{ paddingLeft: 30 }}
            placeholder="搜索用户名 / 姓名..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ flex: '0 0 150px' }}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as RoleId | '全部')}
        >
          <option value="全部">全部角色</option>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select
          className="input"
          style={{ flex: '0 0 130px' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as User['status'] | '全部')}
        >
          <option value="全部">全部状态</option>
          <option value="active">已启用</option>
          <option value="inactive">已禁用</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto', padding: '0 4px' }}>
          命中 <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{filtered.length}</span> 个账户
        </span>
      </Toolbar>

      <div className="card card-pad-0 reveal-1">
        <DataTable<User>
          cols={cols}
          rows={filtered}
          rowKey={u => u.id}
          empty={{ title: '没有匹配的账户', desc: '调整搜索或筛选条件，或点击「新增账户」' }}
          defaultSort={{ key: 'createdAt', dir: 'desc' }}
          dense
        />
      </div>

      {/* ─── infobox：viewer 写操作隐藏 + X-Role 403 ─────────────────────────── */}
      <div
        className="reveal-2"
        style={{
          marginTop: 18, display: 'flex', gap: 12, alignItems: 'flex-start',
          padding: '14px 16px', background: 'var(--surface-2)',
          border: '1px solid var(--hairline)', borderLeft: '3px solid var(--gold)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <ShieldCheck size={18} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
          <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>双层鉴权 · 前端隐藏 + 后端拦截。</span>
          viewer 类角色（如合规专员对知识库、坐席班长对配置）的写操作按钮在前端
          <span style={{ color: 'var(--gold)' }}> 直接隐藏</span>；
          即使绕过 UI 直发请求，网关也会校验 <span className="mono" style={{ color: 'var(--text-1)' }}>X-Role</span> 头与权限位，无权时返回
          <span className="mono" style={{ color: 'var(--danger)' }}> 403 Forbidden</span> 并写入合规审计留痕。
          权限变更（启用 / 禁用 / 改角色）实时下发，目标账户当前会话立即失效。
        </div>
      </div>

      {/* ─── 新增 / 编辑 Modal ──────────────────────────────────────────────── */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.kind === 'edit' ? `编辑账户 · ${modal.user.name}` : '新增账户'}
        sub={modal?.kind === 'edit' ? '修改角色即时重算权限位' : '创建后权限按角色即时下发'}
        width={480}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>取消</button>
            <button className="btn btn-primary" onClick={saveForm}>
              {modal?.kind === 'edit' ? '保存修改' : '创建账户'}
            </button>
          </>
        }
      >
        <Field label="用户名 *" hint="登录账号，唯一，建议姓名拼音">
          <input
            className="input mono"
            placeholder="如 zhangmy"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            autoFocus
          />
        </Field>
        <Field label="姓名 *">
          <input
            className="input"
            placeholder="如 张明远"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <Field label="角色" hint={ROLE_MAP[form.role].description}>
          <select
            className="input"
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value as RoleId }))}
          >
            {ROLES.map(r => <option key={r.id} value={r.id}>{r.name} · {r.permissions.length} 权限</option>)}
          </select>
        </Field>
        <Field label="状态">
          <select
            className="input"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as User['status'] }))}
          >
            <option value="active">已启用</option>
            <option value="inactive">已禁用</option>
          </select>
        </Field>
        <Field label="备注" hint="可选，岗位 / 职责说明">
          <input
            className="input"
            placeholder="如 QA / 场景维护"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          />
        </Field>
      </Modal>
    </div>
  );
}

// 分组行的纯包裹（避免 key 直接挂在 Fragment 上时的 children 限制）
function FragmentRows({ children }: { cat: PermCategory; children: React.ReactNode }) {
  return <>{children}</>;
}
