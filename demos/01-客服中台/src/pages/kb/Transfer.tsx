import { useState, useMemo } from 'react';
import { Search, Plus, Upload, Download, MoreHorizontal, Trash2, Eye, Pencil, Power } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import { DataTable, Pagination, type Col } from '../../components/DataTable';
import { StatusBadge, Toolbar, Field, Modal, toast } from '../../components/kit';
import type { SimpleKBItem, KBStatus } from '../../types';

// ─── Mock 数据（17 条真实转人工场景）────────────────────────────────────────────
const INITIAL_DATA: SimpleKBItem[] = [
  { idx: 1,  q: '有人工客服吗',              a: '小云正在为您转接人工，请您稍后~',                                               status: '已生效', updatedAt: '2025-06-10 09:12' },
  { idx: 2,  q: '转人工',                   a: '小云正在为您转接人工，请您稍后~',                                               status: '已生效', updatedAt: '2025-06-10 09:14' },
  { idx: 3,  q: '要人工',                   a: '小云正在为您转接人工，请您稍后~',                                               status: '已生效', updatedAt: '2025-06-10 09:15' },
  { idx: 4,  q: '你解决不了，找个真人',        a: '这就为您接通人工专员，请稍候为您处理~',                                          status: '已生效', updatedAt: '2025-06-11 14:03' },
  { idx: 5,  q: '你没用，换个真人',           a: '这就为您接通人工专员，请稍候为您处理~',                                          status: '已生效', updatedAt: '2025-06-11 14:05' },
  { idx: 6,  q: '投诉',                     a: '已为您优先转接人工客服处理您的诉求，请稍候。',                                      status: '已生效', updatedAt: '2025-06-11 16:22' },
  { idx: 7,  q: '我要投诉客服',              a: '已为您优先转接人工客服处理您的诉求，请稍候。',                                      status: '已生效', updatedAt: '2025-06-11 16:24' },
  { idx: 8,  q: '我要投诉你们',              a: '已为您优先转接人工客服处理您的诉求，请稍候。',                                      status: '已生效', updatedAt: '2025-06-12 10:01' },
  { idx: 9,  q: '我要见你们领导',            a: '正在为您转接高级专员，请稍候，我们会第一时间跟进您的问题。',                         status: '已生效', updatedAt: '2025-06-12 10:33' },
  { idx: 10, q: '我要见主管',               a: '正在为您转接高级专员，请稍候，我们会第一时间跟进您的问题。',                         status: '待发布', updatedAt: '2025-06-13 11:07' },
  { idx: 11, q: '帮我说人话',               a: '这就为您接通人工专员，请稍候为您处理~',                                          status: '已生效', updatedAt: '2025-06-13 15:44' },
  { idx: 12, q: '你是机器人吗',              a: '小云是 AI 助手，正在为您转接人工客服，请稍候~',                                   status: '已生效', updatedAt: '2025-06-14 08:55' },
  { idx: 13, q: '人工服务电话',              a: '人工客服热线：400-800-1234，服务时间 08:00–21:00，转接中请稍候~',                    status: '已生效', updatedAt: '2025-06-14 09:20' },
  { idx: 14, q: '我要上银保监会投诉你们',     a: '已为您优先转接人工客服处理您的诉求，请稍候。',                                      status: '已生效', updatedAt: '2025-06-14 14:10' },
  { idx: 15, q: '联系人工',                 a: '小云正在为您转接人工，请您稍后~',                                               status: '已生效', updatedAt: '2025-06-15 09:00' },
  { idx: 16, q: '机器人解决不了',            a: '这就为您接通人工专员，请稍候为您处理~',                                          status: '待发布', updatedAt: '2025-06-15 10:45' },
  { idx: 17, q: '你听不懂我说什么',          a: '这就为您接通人工专员，请稍候为您处理~',                                          status: '已下线', updatedAt: '2025-06-15 11:30' },
];

const PAGE_SIZE = 10;

export default function Transfer() {
  const [data, setData]                 = useState<SimpleKBItem[]>(INITIAL_DATA);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<KBStatus | '全部'>('全部');
  const [selected, setSelected]         = useState<Set<number>>(new Set());
  const [page, setPage]                 = useState(1);
  const [editing, setEditing]           = useState<SimpleKBItem | null>(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [isNew, setIsNew]               = useState(false);
  const [editQ, setEditQ]               = useState('');
  const [editA, setEditA]               = useState('');
  const [viewItem, setViewItem]         = useState<SimpleKBItem | null>(null);
  const [viewOpen, setViewOpen]         = useState(false);
  const [moreOpen, setMoreOpen]         = useState(false);

  // ─── 过滤 ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return data.filter(r => {
      const matchSearch = !search || r.q.includes(search) || r.a.includes(search);
      const matchStatus = statusFilter === '全部' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter]);

  const pageRows    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allOnPage   = pageRows.length > 0 && pageRows.every(r => selected.has(r.idx));

  // ─── 弹窗 helpers ──────────────────────────────────────────────────────────
  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setEditQ('');
    setEditA('');
    setModalOpen(true);
  };

  const openEdit = (item: SimpleKBItem) => {
    setIsNew(false);
    setEditing(item);
    setEditQ(item.q);
    setEditA(item.a);
    setModalOpen(true);
  };

  const openView = (item: SimpleKBItem) => {
    setViewItem(item);
    setViewOpen(true);
  };

  const saveModal = () => {
    if (!editQ.trim() || !editA.trim()) {
      toast('标准问题和回复不能为空', 'warn');
      return;
    }
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-').slice(0, 16);
    if (isNew) {
      const newItem: SimpleKBItem = {
        idx: Math.max(...data.map(d => d.idx)) + 1,
        q: editQ.trim(),
        a: editA.trim(),
        status: '待发布',
        updatedAt: now,
      };
      setData(prev => [newItem, ...prev]);
      toast('已新增，状态「待发布」，发布后生效', 'success');
    } else if (editing) {
      setData(prev => prev.map(r =>
        r.idx === editing.idx
          ? { ...r, q: editQ.trim(), a: editA.trim(), status: '待发布', updatedAt: now }
          : r
      ));
      toast('已保存，状态已降为「待发布」', 'success');
    }
    setModalOpen(false);
    setPage(1);
  };

  const toggleStatus = (item: SimpleKBItem) => {
    const next: KBStatus = item.status === '已生效' ? '已下线' : '已生效';
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-').slice(0, 16);
    setData(prev => prev.map(r => r.idx === item.idx ? { ...r, status: next, updatedAt: now } : r));
    toast(`「${item.q}」已${next === '已生效' ? '上线' : '下线'}`, 'info');
  };

  const deleteItem = (item: SimpleKBItem) => {
    setData(prev => prev.filter(r => r.idx !== item.idx));
    setSelected(prev => { const s = new Set(prev); s.delete(item.idx); return s; });
    toast(`已删除「${item.q}」`, 'warn');
  };

  const deleteSelected = () => {
    if (!selected.size) return;
    const count = selected.size;
    setData(prev => prev.filter(r => !selected.has(r.idx)));
    setSelected(new Set());
    toast(`已删除 ${count} 条`, 'warn');
  };

  const publish = () => {
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-').slice(0, 16);
    let count = 0;
    setData(prev => prev.map(r => {
      if (r.status === '待发布') { count++; return { ...r, status: '已生效', updatedAt: now }; }
      return r;
    }));
    toast(count ? `已发布 ${count} 条变更 → 生效中` : '暂无待发布内容', count ? 'success' : 'info');
  };

  // ─── 勾选 ─────────────────────────────────────────────────────────────────
  const toggleRow = (idx: number) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  };

  const toggleAll = () => {
    if (allOnPage) {
      setSelected(prev => { const s = new Set(prev); pageRows.forEach(r => s.delete(r.idx)); return s; });
    } else {
      setSelected(prev => { const s = new Set(prev); pageRows.forEach(r => s.add(r.idx)); return s; });
    }
  };

  // ─── 表列定义 ──────────────────────────────────────────────────────────────
  const cols: Col<SimpleKBItem>[] = [
    {
      key: 'check',
      header: '',
      width: 36,
      render: (row) => (
        <input
          type="checkbox"
          checked={selected.has(row.idx)}
          onChange={() => toggleRow(row.idx)}
          onClick={e => e.stopPropagation()}
          style={{ cursor: 'pointer', accentColor: 'var(--gold)' }}
        />
      ),
    },
    {
      key: 'q',
      header: '标准问题',
      width: '26%',
      render: (row) => (
        <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{row.q}</span>
      ),
    },
    {
      key: 'a',
      header: '标准回复',
      render: (row) => (
        <span style={{
          color: 'var(--text-2)', fontSize: 13,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {row.a}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: '更新时间',
      width: 148,
      nowrap: true,
      render: (row) => (
        <span className="tnum" style={{ color: 'var(--text-3)', fontSize: 12 }}>{row.updatedAt}</span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      width: 88,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'ops',
      header: '操作',
      width: 180,
      render: (row) => (
        <div className="row gap-1" onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" onClick={() => openView(row)} title="详情">
            <Eye size={13} />
            <span style={{ marginLeft: 3 }}>详情</span>
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(row)} title="编辑">
            <Pencil size={13} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => toggleStatus(row)}
            title={row.status === '已生效' ? '下线' : '上线'}
            style={{ color: row.status === '已生效' ? 'var(--warning)' : 'var(--success)' }}
          >
            <Power size={13} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => deleteItem(row)}
            title="删除"
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  const effCount  = data.filter(r => r.status === '已生效').length;
  const pendCount = data.filter(r => r.status === '待发布').length;
  const offCount  = data.filter(r => r.status === '已下线').length;

  return (
    <div className="page">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <PageHeader
        title="转人工知识库"
        subtitle={`${data.length} 条 · 命中触发人工坐席转接 · 返回 JSON 标识给在线客服平台`}
        actions={
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm" onClick={openNew}>
              <Plus size={14} />
              <span style={{ marginLeft: 4 }}>+ 新增转人工</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={publish}>
              发布变更
            </button>
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-subtle btn-sm"
                onClick={() => setMoreOpen(v => !v)}
                onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
              >
                更多▾
                <MoreHorizontal size={13} style={{ marginLeft: 3 }} />
              </button>
              {moreOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
                  background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)',
                  borderRadius: 'var(--r-md)', padding: '6px 0', minWidth: 130,
                  boxShadow: '0 8px 24px rgba(0,0,0,.28)',
                }}>
                  {([
                    { icon: <Download size={13} />, label: '导出 Excel' },
                    { icon: <Upload size={13} />,   label: '批量导入' },
                    { icon: <Plus size={13} />,     label: '从模板新建' },
                  ] as const).map(item => (
                    <button
                      key={item.label}
                      className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 14px', gap: 8 }}
                      onClick={() => { setMoreOpen(false); toast(`${item.label}（demo 功能）`, 'info'); }}
                    >
                      {item.icon}
                      <span style={{ fontSize: 13 }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* ─── KPI 摘要条 ──────────────────────────────────────────────── */}
      <div className="row gap-3 wrap reveal" style={{ marginBottom: 20 }}>
        {([
          { label: '已生效', value: effCount,  color: 'var(--success)' },
          { label: '待发布', value: pendCount, color: 'var(--warning)' },
          { label: '已下线', value: offCount,  color: 'var(--text-3)'  },
        ] as const).map(s => (
          <div key={s.label} className="card" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 100 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</span>
            <span className="tnum" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginLeft: 4 }}>{s.value}</span>
          </div>
        ))}
        <div className="card" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>返回格式</span>
          <code style={{ fontSize: 11, background: 'var(--surface-3)', color: 'var(--gold)', padding: '2px 8px', borderRadius: 'var(--r-sm)', fontFamily: 'monospace' }}>
            {`{"action":"transfer","reason":"<q>"}`}
          </code>
        </div>
      </div>

      {/* ─── 工具条 ──────────────────────────────────────────────────── */}
      <Toolbar>
        <div className="input-wrap" style={{ flex: '0 0 260px' }}>
          <Search size={14} className="input-icon" />
          <input
            className="input"
            style={{ paddingLeft: 30 }}
            placeholder="搜索标准问题或回复..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input"
          style={{ flex: '0 0 120px' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as KBStatus | '全部'); setPage(1); }}
        >
          <option value="全部">全部状态</option>
          <option value="已生效">已生效</option>
          <option value="待发布">待发布</option>
          <option value="已下线">已下线</option>
        </select>
      </Toolbar>

      {/* ─── 全选行 ──────────────────────────────────────────────────── */}
      <div className="row gap-2" style={{
        padding: '8px 14px', background: 'var(--surface-2)',
        borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)', marginBottom: 8,
      }}>
        <input
          type="checkbox"
          checked={allOnPage}
          onChange={toggleAll}
          style={{ cursor: 'pointer', accentColor: 'var(--gold)' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          当前页全选
          {selected.size > 0 && (
            <span className="tnum" style={{ color: 'var(--gold)', marginLeft: 6 }}>已选 {selected.size} 条</span>
          )}
        </span>
        {selected.size > 0 && (
          <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={deleteSelected}>
            <Trash2 size={12} />
            <span style={{ marginLeft: 4 }}>批量删除 ({selected.size})</span>
          </button>
        )}
      </div>

      {/* ─── DataTable ───────────────────────────────────────────────── */}
      <div className="card card-pad-0 reveal-1">
        <DataTable<SimpleKBItem>
          cols={cols}
          rows={pageRows}
          rowKey={r => String(r.idx)}
          empty={{ title: '暂无转人工规则', desc: '点击「+ 新增转人工」添加触发规则' }}
          dense
        />
      </div>

      {/* ─── 底部摘要 + 分页 ─────────────────────────────────────────── */}
      <div className="row spread wrap" style={{ marginTop: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          共 <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{filtered.length}</span> 条
          {statusFilter !== '全部' && <span style={{ marginLeft: 4 }}>· 筛选: {statusFilter}</span>}
          {search && <span style={{ marginLeft: 4 }}>· 搜索: "{search}"</span>}
        </span>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </div>

      {/* ─── 编辑 / 新增 Modal ────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isNew ? '新增转人工规则' : '编辑转人工规则'}
        sub={isNew ? '保存后状态为「待发布」，点击「发布变更」后生效' : '编辑后状态将降为「待发布」'}
        width={540}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={saveModal}>{isNew ? '新增' : '保存'}</button>
          </>
        }
      >
        <Field label="标准问题" hint="用户的触发转人工说法，如「转人工」「要真人」等">
          <input
            className="input"
            placeholder="输入标准问题..."
            value={editQ}
            onChange={e => setEditQ(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="标准回复" hint="机器人回复用户后立即触发转人工流程，同时返回 JSON 标识给坐席系统系统">
          <textarea
            className="input"
            rows={3}
            placeholder="输入标准回复..."
            value={editA}
            onChange={e => setEditA(e.target.value)}
            style={{ resize: 'vertical', minHeight: 80 }}
          />
        </Field>
        <div style={{ marginTop: 4, padding: '10px 14px', background: 'var(--surface-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600 }}>返回给坐席系统的 JSON 标识预览</div>
          <code style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'monospace' }}>
            {`{"action":"transfer","reason":"${editQ || '<标准问题>'}"}`}
          </code>
        </div>
      </Modal>

      {/* ─── 详情查看 Modal ──────────────────────────────────────────── */}
      {viewItem && (
        <Modal
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          title="规则详情"
          sub={`#${viewItem.idx} · 最后更新 ${viewItem.updatedAt}`}
          width={500}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setViewOpen(false)}>关闭</button>
              <button className="btn btn-primary" onClick={() => { setViewOpen(false); openEdit(viewItem); }}>编辑</button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, letterSpacing: '0.04em' }}>标准问题</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)' }}>
                {viewItem.q}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, letterSpacing: '0.04em' }}>标准回复</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)', lineHeight: 1.7 }}>
                {viewItem.a}
              </div>
            </div>
            <div className="row gap-3">
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>当前状态</div>
                <StatusBadge status={viewItem.status} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>更新时间</div>
                <span className="tnum" style={{ fontSize: 13, color: 'var(--text-2)' }}>{viewItem.updatedAt}</span>
              </div>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--surface-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>命中时触发的坐席系统 JSON</div>
              <code style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'monospace' }}>
                {`{"action":"transfer","reason":"${viewItem.q}"}`}
              </code>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
