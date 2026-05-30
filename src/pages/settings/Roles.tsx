import { useState } from 'react';
import { Shield, Edit2, Trash2, Check, Layout, Zap, Database } from 'lucide-react';
import { Card, PageHeader, Badge, SectionTitle } from '../../components/ui';
import { ROLES, ALL_PERMISSIONS } from '../../lib/mockData';
import type { PermCategory } from '../../types';

// ─── category config ─────────────────────────────────────────────────────────
const CAT_META: Record<PermCategory, { label: string; color: string; icon: React.ReactNode }> = {
  page: { label: '页面权限', color: 'var(--info)', icon: <Layout size={12} strokeWidth={2} /> },
  action: { label: '操作权限', color: 'var(--warning)', icon: <Zap size={12} strokeWidth={2} /> },
  data: { label: '数据权限', color: 'var(--emerald)', icon: <Database size={12} strokeWidth={2} /> },
};

// ─── permission cell ──────────────────────────────────────────────────────────
function PermCell({
  label,
  desc,
  granted,
}: {
  label: string;
  desc: string;
  granted: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--r-sm)',
        background: granted ? 'color-mix(in srgb, var(--warning) 7%, transparent)' : 'transparent',
        border: `1px solid ${granted ? 'color-mix(in srgb, var(--warning) 22%, transparent)' : 'var(--hairline)'}`,
        opacity: granted ? 1 : 0.45,
        transition: 'all var(--dur-micro) var(--ease)',
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `1.5px solid ${granted ? 'var(--warning)' : 'var(--hairline-strong)'}`,
          background: granted ? 'color-mix(in srgb, var(--warning) 18%, transparent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {granted && <Check size={11} strokeWidth={2.5} style={{ color: 'var(--warning)' }} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>{label}</div>
        <div className="t-small text-3" style={{ marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  );
}

// ─── permission group ─────────────────────────────────────────────────────────
function PermGroup({
  category,
  grantedKeys,
}: {
  category: PermCategory;
  grantedKeys: Set<string>;
}) {
  const meta = CAT_META[category];
  const perms = ALL_PERMISSIONS.filter(p => p.category === category);
  const grantedCount = perms.filter(p => grantedKeys.has(p.key)).length;

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="row gap-2 spread" style={{ marginBottom: 10 }}>
        <div className="row gap-2">
          <span style={{ color: meta.color }}>{meta.icon}</span>
          <span className="label" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <span
          className="tnum"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: meta.color,
            background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
            padding: '1px 7px',
            borderRadius: 'var(--r-pill)',
          }}
        >
          {grantedCount}/{perms.length}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 8,
        }}
      >
        {perms.map(p => (
          <PermCell
            key={p.key}
            label={p.label}
            desc={p.desc}
            granted={grantedKeys.has(p.key)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── role card (left panel) ───────────────────────────────────────────────────
function RoleCard({
  role,
  active,
  onClick,
}: {
  role: (typeof ROLES)[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: active ? `color-mix(in srgb, ${role.color} 10%, var(--surface-2))` : 'var(--surface-2)',
        border: `1.5px solid ${active ? `color-mix(in srgb, ${role.color} 45%, transparent)` : 'var(--hairline)'}`,
        borderRadius: 'var(--r-md)',
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'all var(--dur-micro) var(--ease)',
        outline: 'none',
      }}
      onMouseEnter={e => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.borderColor = `color-mix(in srgb, ${role.color} 30%, transparent)`;
      }}
      onMouseLeave={e => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--hairline)';
      }}
    >
      <div className="row gap-2 spread">
        <div className="row gap-2">
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: role.color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: active ? role.color : 'var(--text-1)' }}>
            {role.name}
          </span>
        </div>
        <span
          className="tnum"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: role.color,
            background: `color-mix(in srgb, ${role.color} 12%, transparent)`,
            padding: '1px 7px',
            borderRadius: 'var(--r-pill)',
          }}
        >
          {role.permissions.length} 项
        </span>
      </div>
      <p
        className="t-small"
        style={{
          color: 'var(--text-3)',
          marginTop: 6,
          lineHeight: 1.5,
        }}
      >
        {role.description}
      </p>
    </button>
  );
}

// ─── main component ──────────────────────────────────────────────────────────
export default function Roles() {
  const [selectedId, setSelectedId] = useState(ROLES[0].id);
  const selected = ROLES.find(r => r.id === selectedId)!;
  const grantedKeys = new Set(selected.permissions as string[]);

  const categories: PermCategory[] = ['page', 'action', 'data'];

  return (
    <div className="page">
      <PageHeader
        title="角色权限管理"
        subtitle="RBAC 角色定义与权限矩阵配置"
      />

      <div
        className="reveal"
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* ── left: role list ── */}
        <div className="col gap-3">
          <SectionTitle>角色列表</SectionTitle>
          {ROLES.map((r, i) => (
            <div key={r.id} className={`reveal reveal-${Math.min(i + 1, 6)}`}>
              <RoleCard
                role={r}
                active={r.id === selectedId}
                onClick={() => setSelectedId(r.id)}
              />
            </div>
          ))}

          <div
            className="reveal reveal-5"
            style={{
              marginTop: 4,
              padding: '10px 14px',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-2)',
              border: '1px dashed var(--hairline-strong)',
              cursor: 'not-allowed',
              opacity: 0.5,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-3)',
              textAlign: 'center',
              letterSpacing: '0.04em',
            }}
          >
            + 新增角色（即将开放）
          </div>
        </div>

        {/* ── right: detail + matrix ── */}
        <div className="col gap-4">
          {/* role header card */}
          <Card className="reveal reveal-1">
            <div className="spread">
              <div className="row gap-3">
                <Shield
                  size={22}
                  strokeWidth={1.75}
                  style={{ color: selected.color, flexShrink: 0 }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: selected.color,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                    }}
                  >
                    {selected.name}
                  </div>
                  <div className="t-small text-3" style={{ marginTop: 3 }}>
                    {selected.description}
                  </div>
                </div>
              </div>
              <div className="row gap-2">
                <button className="btn btn-ghost btn-sm row gap-1">
                  <Edit2 size={12} strokeWidth={1.75} />
                  编辑
                </button>
                {selected.id !== 'director' && (
                  <button className="btn btn-danger btn-sm row gap-1">
                    <Trash2 size={12} strokeWidth={1.75} />
                    删除
                  </button>
                )}
              </div>
            </div>

            {/* summary chips */}
            <div className="row gap-2 wrap" style={{ marginTop: 14 }}>
              {categories.map(cat => {
                const meta = CAT_META[cat];
                const perms = ALL_PERMISSIONS.filter(p => p.category === cat);
                const granted = perms.filter(p => grantedKeys.has(p.key)).length;
                return (
                  <span
                    key={cat}
                    className="row gap-1"
                    style={{
                      padding: '3px 10px',
                      borderRadius: 'var(--r-pill)',
                      background: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${meta.color} 25%, transparent)`,
                      fontSize: 11,
                      fontWeight: 600,
                      color: meta.color,
                      gap: 5,
                    }}
                  >
                    {meta.icon}
                    {meta.label}
                    <span className="tnum">{granted}/{perms.length}</span>
                  </span>
                );
              })}
              <span className="t-small text-3" style={{ marginLeft: 4 }}>
                共 <span className="tnum" style={{ color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>{selected.permissions.length}</span> / {ALL_PERMISSIONS.length} 项权限
              </span>
            </div>
          </Card>

          {/* permission matrix */}
          <Card className="reveal reveal-2">
            <SectionTitle>权限矩阵</SectionTitle>
            {categories.map(cat => (
              <PermGroup key={cat} category={cat} grantedKeys={grantedKeys} />
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
