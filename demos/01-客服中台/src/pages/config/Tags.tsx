import { useState, useMemo } from 'react';
import { RefreshCw, Tag, ExternalLink } from 'lucide-react';
import { Card, PageHeader, Badge } from '../../components/ui';
import { DataTable, type Col } from '../../components/DataTable';
import { Toolbar, toast } from '../../components/kit';
import type { TagDef } from '../../types';

// ─── Mock 数据（14 条真实消金客群标签）────────────────────────────────────────
const MOCK_TAGS: TagDef[] = [
  { id: 'normal',         name: '正常用户',   group: '客群',   sourceStatus: '已启用' },
  { id: 'vip',            name: 'VIP 用户',   group: '客群',   sourceStatus: '已启用' },
  { id: 'new_user',       name: '新用户',     group: '客群',   sourceStatus: '已启用' },
  { id: 'overdue',        name: '逾期用户',   group: '客群',   sourceStatus: '已启用' },
  { id: 'complaint',      name: '投诉用户',   group: '风控',   sourceStatus: '已启用' },
  { id: 'high_risk',      name: '高风险用户', group: '风控',   sourceStatus: '已启用' },
  { id: 'blacklist',      name: '黑名单',     group: '风控',   sourceStatus: '已启用' },
  { id: 'whitelist',      name: '白名单',     group: '风控',   sourceStatus: '已启用' },
  { id: 'first_loan',     name: '首贷用户',   group: '生命周期', sourceStatus: '已启用' },
  { id: 'repeat_loan',    name: '复贷用户',   group: '生命周期', sourceStatus: '已启用' },
  { id: 'dormant',        name: '沉睡唤醒',   group: '生命周期', sourceStatus: '已启用' },
  { id: 'near_due',       name: '临期用户',   group: '生命周期', sourceStatus: '已启用' },
  { id: 'settled',        name: '已结清',     group: '生命周期', sourceStatus: '已停用' },
  { id: 'negotiating',    name: '协商中',     group: '生命周期', sourceStatus: '已启用' },
];

const GROUPS = ['全部', '客群', '风控', '生命周期'] as const;
type GroupFilter = typeof GROUPS[number];

const GROUP_COLOR: Record<string, string> = {
  客群:   'var(--gold)',
  风控:   'var(--danger)',
  生命周期: 'var(--emerald)',
};

export default function Tags() {
  const [search, setSearch]       = useState('');
  const [group, setGroup]         = useState<GroupFilter>('全部');
  const [syncing, setSyncing]     = useState(false);

  // 分组计数
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tag of MOCK_TAGS) {
      counts[tag.group] = (counts[tag.group] ?? 0) + 1;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_TAGS.filter(t => {
      const matchGroup = group === '全部' || t.group === group;
      const matchSearch = !q || t.id.includes(q) || t.name.includes(q);
      return matchGroup && matchSearch;
    });
  }, [search, group]);

  const handleSync = () => {
    if (syncing) return;
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast(`已从客服系统同步 ${MOCK_TAGS.length} 个标签`, 'success');
    }, 1200);
  };

  const cols: Col<TagDef>[] = [
    {
      key: 'id',
      header: '标签 ID',
      sortable: true,
      sortAccessor: r => r.id,
      render: r => (
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)', letterSpacing: '0.03em' }}>
          {r.id}
        </span>
      ),
    },
    {
      key: 'name',
      header: '标签名称',
      sortable: true,
      sortAccessor: r => r.name,
      render: r => (
        <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{r.name}</span>
      ),
    },
    {
      key: 'group',
      header: '分组',
      render: r => (
        <span
          className="badge"
          style={{
            background: `color-mix(in srgb, ${GROUP_COLOR[r.group] ?? 'var(--gold)'} 12%, transparent)`,
            color: GROUP_COLOR[r.group] ?? 'var(--gold)',
          }}
        >
          {r.group}
        </span>
      ),
    },
    {
      key: 'sourceStatus',
      header: '来源状态',
      render: r => {
        const active = r.sourceStatus === '已启用';
        const color  = active ? 'var(--success)' : 'var(--text-3)';
        return (
          <span className="row gap-1" style={{ color, fontSize: 12, fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', marginTop: 1 }} />
            {r.sourceStatus}
          </span>
        );
      },
    },
  ];

  return (
    <div className="page">
      {/* ─── 页头 ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title="标签管理"
        subtitle="来源：客服系统统一管理 · 只读同步 · 供问题场景多版本 A/B 路由引用"
        actions={
          <div className="row gap-2">
            <Badge color="var(--text-3)">只读 · 来源 客服系统</Badge>
            <button
              className="btn btn-primary btn-sm row gap-1"
              onClick={handleSync}
              disabled={syncing}
              style={{ opacity: syncing ? 0.7 : 1 }}
            >
              <RefreshCw size={13} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />
              同步标签
            </button>
          </div>
        }
      />

      {/* ─── 分组计数 chip 行 ──────────────────────────────────────────────── */}
      <div className="row gap-2 wrap reveal" style={{ marginBottom: 16 }}>
        {(['客群', '风控', '生命周期'] as const).map(g => (
          <span
            key={g}
            className="chip"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: `color-mix(in srgb, ${GROUP_COLOR[g]} 10%, var(--surface-2))`,
              border: `1px solid color-mix(in srgb, ${GROUP_COLOR[g]} 20%, var(--hairline))`,
              fontSize: 12, fontWeight: 500, color: GROUP_COLOR[g],
            }}
          >
            <Tag size={11} />
            {g}
            <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>
              {groupCounts[g] ?? 0}
            </span>
          </span>
        ))}
        <span className="text-3" style={{ fontSize: 12, marginLeft: 4, alignSelf: 'center' }}>
          共 <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{MOCK_TAGS.length}</span> 个标签
        </span>
      </div>

      {/* ─── 工具条 ───────────────────────────────────────────────────────── */}
      <Toolbar>
        <div className="input-wrap" style={{ width: 264 }}>
          <input
            className="input"
            placeholder="搜索标签 ID / 名称"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          value={group}
          onChange={e => setGroup(e.target.value as GroupFilter)}
          style={{ width: 160 }}
        >
          {GROUPS.map(g => (
            <option key={g} value={g}>
              {g === '全部' ? `全部分组` : g}{g !== '全部' ? ` (${groupCounts[g] ?? 0})` : ''}
            </option>
          ))}
        </select>
        <span className="text-3 tnum" style={{ fontSize: 12, alignSelf: 'center', marginLeft: 4 }}>
          {filtered.length} / {MOCK_TAGS.length} 条
        </span>
      </Toolbar>

      {/* ─── 只读说明 infobox ─────────────────────────────────────────────── */}
      <Card
        className="reveal reveal-1"
        style={{
          marginBottom: 16,
          background: 'color-mix(in srgb, var(--info) 6%, var(--surface-1))',
          border: '1px solid color-mix(in srgb, var(--info) 18%, var(--hairline))',
          padding: '12px 16px',
        }}
      >
        <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
          <Tag size={15} style={{ color: 'var(--info)', marginTop: 1, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
              标签由<strong style={{ color: 'var(--text-1)' }}>客服系统统一维护</strong>，本中台同步展示；如需新增、停用标签，请前往客服系统操作后重新同步。
            </div>
            <div style={{ marginTop: 6 }}>
              <span
                className="row gap-1"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: 'var(--gold)', cursor: 'pointer',
                  fontWeight: 500,
                  textDecoration: 'underline', textUnderlineOffset: 3,
                }}
                onClick={() => toast('正在跳转至客服系统…', 'info')}
              >
                打开客服系统
                <ExternalLink size={11} />
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── 数据表 ───────────────────────────────────────────────────────── */}
      <Card className="card-pad-0 reveal reveal-2">
        <DataTable<TagDef>
          cols={cols}
          rows={filtered}
          rowKey={r => r.id}
          empty={{ title: '未找到匹配标签', desc: '请调整搜索关键词或分组筛选' }}
          defaultSort={{ key: 'id', dir: 'asc' }}
        />
      </Card>

      {/* ─── 旋转动画 keyframe（inline，轻量）────────────────────────────── */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
