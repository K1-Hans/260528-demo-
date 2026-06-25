import { useState, useMemo } from 'react';
import { Search, ChevronDown, Plus, Upload, Download, MoreHorizontal, Trash2, Eye, Pencil, Power } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import { DataTable, Pagination, type Col } from '../../components/DataTable';
import { StatusBadge, Toolbar, Field, Modal, toast } from '../../components/kit';
import type { SimpleKBItem, KBStatus } from '../../types';

// ─── Mock 数据（16 条真实寒暄文案）────────────────────────────────────────────
const MOCK_ITEMS: SimpleKBItem[] = [
  { idx: 1,  q: '谢谢你',                    a: '哇，能够解决您的问题是我的荣幸~如有其他问题欢迎随时找小云哦！',                                   status: '已生效', updatedAt: '2025-06-10' },
  { idx: 2,  q: 'hi / hello / 早安',         a: 'Hi~ o(*￣▽￣*)ブ 我是您的在线智能客服小云，有什么可以帮您的呢？',                                   status: '已生效', updatedAt: '2025-06-10' },
  { idx: 3,  q: '客服上班时间',              a: '您好，人工服务时间：08:00—21:00；非工作时间小云继续为您服务哦~',                                    status: '已生效', updatedAt: '2025-06-09' },
  { idx: 4,  q: '走了 / 再见',               a: '小云随时欢迎您的再次访问~祝您生活愉快！(´▽`ʃ♡ƪ)',                                                    status: '已生效', updatedAt: '2025-06-09' },
  { idx: 5,  q: '在吗',                      a: '在的在的，小云一直都在~请问有什么可以帮您？(ﾉ^ヮ^)ﾉ',                                                status: '已生效', updatedAt: '2025-06-08' },
  { idx: 6,  q: '你真棒 / 好厉害',           a: '嘿嘿，小云被夸奖啦~ (*^▽^*) 您的满意就是小云最大的动力！',                                         status: '已生效', updatedAt: '2025-06-08' },
  { idx: 7,  q: '好烦啊 / 服务太差了',       a: '非常抱歉给您带来了不好的体验 >_< 小云已记录您的反馈，我们会加速改进，感谢您的耐心！',              status: '已生效', updatedAt: '2025-06-07' },
  { idx: 8,  q: '你是人还是机器人',          a: '小云是智能客服运营系统~ ≧◡≦ 如果需要转接人工坐席，请说「转人工」，随时为您服务！',                    status: '已生效', updatedAt: '2025-06-07' },
  { idx: 9,  q: '等一下 / 稍等',             a: '好的好的，小云随时在哦，您慢慢来~(っ•‿•)っ',                                                         status: '已生效', updatedAt: '2025-06-06' },
  { idx: 10, q: '节日快乐 / 新年快乐',       a: '节日快乐呀~(ﾉ◕ヮ◕)ﾉ✧ 祝您和家人幸福美满！如需办理业务，小云一直陪着您~',                            status: '已生效', updatedAt: '2025-06-06' },
  { idx: 11, q: '我不高兴',                  a: '嗯嗯，小云听到了 (T_T) 希望可以帮到您，让今天好一点点～有什么我能做的呢？',                          status: '已生效', updatedAt: '2025-06-05' },
  { idx: 12, q: '可以说中文吗',              a: '当然可以呀！小云一直都在说中文哦~ 请问您有什么需要？',                                               status: '已生效', updatedAt: '2025-06-05' },
  { idx: 13, q: '没事了 / 解决了',           a: '太好了！问题顺利解决了，如有其他需要欢迎随时回来找小云~ヾ(≧∇≦*)ゝ',                                  status: '待发布', updatedAt: '2025-06-04' },
  { idx: 14, q: '晚上好 / 晚安',             a: '晚上好呀~有什么可以帮您的嘛？(≧ω≦) 如没其他问题，祝您好梦！',                                       status: '待发布', updatedAt: '2025-06-04' },
  { idx: 15, q: '你好聪明 / 真智能',         a: '哈哈，小云还在不断学习进化中啦~ 感谢您的认可，有问题尽管来找我哦！٩(•̀ᴗ•́و)',                     status: '已下线', updatedAt: '2025-06-03' },
  { idx: 16, q: '可以帮我解决这个问题吗',    a: '当然可以！小云全力以赴~(ง •̀_•́)ง 请描述一下您遇到的具体情况，我来帮您看看！',                      status: '已生效', updatedAt: '2025-06-02' },
];

const STATUS_OPTIONS: (KBStatus | '')[] = ['', '已生效', '待发布', '已下线'];
const PAGE_SIZE = 12;

export default function Chitchat() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<KBStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SimpleKBItem | null>(null);
  const [draftQ, setDraftQ] = useState('');
  const [draftA, setDraftA] = useState('');
  const [rows, setRows] = useState<SimpleKBItem[]>(MOCK_ITEMS);
  const [moreOpen, setMoreOpen] = useState(false);

  // ─── 筛选 + 分页 ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return rows.filter(r =>
      (!kw || r.q.toLowerCase().includes(kw) || r.a.toLowerCase().includes(kw)) &&
      (!statusFilter || r.status === statusFilter)
    );
  }, [rows, search, statusFilter]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every(r => selected.has(r.idx));

  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) pageRows.forEach(r => next.delete(r.idx));
      else pageRows.forEach(r => next.add(r.idx));
      return next;
    });
  }

  function toggleRow(idx: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  // ─── 新增 / 编辑弹窗 ─────────────────────────────────────────────────────
  function openNew() {
    setEditing(null);
    setDraftQ('');
    setDraftA('');
    setModalOpen(true);
  }

  function openEdit(item: SimpleKBItem) {
    setEditing(item);
    setDraftQ(item.q);
    setDraftA(item.a);
    setModalOpen(true);
  }

  function handleSave() {
    if (!draftQ.trim() || !draftA.trim()) {
      toast('标准问题和标准回复不能为空', 'warn');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (editing) {
      setRows(prev =>
        prev.map(r =>
          r.idx === editing.idx
            ? { ...r, q: draftQ.trim(), a: draftA.trim(), status: '待发布' as KBStatus, updatedAt: today }
            : r
        )
      );
      toast('已保存 · 自动降级为「待发布」，发布后生效', 'info');
    } else {
      const newIdx = Math.max(...rows.map(r => r.idx)) + 1;
      setRows(prev => [
        { idx: newIdx, q: draftQ.trim(), a: draftA.trim(), status: '待发布' as KBStatus, updatedAt: today },
        ...prev,
      ]);
      toast('新增成功 · 待发布状态', 'success');
    }
    setModalOpen(false);
  }

  function handleToggleStatus(item: SimpleKBItem) {
    const next: KBStatus = item.status === '已生效' ? '已下线' : '已生效';
    setRows(prev =>
      prev.map(r =>
        r.idx === item.idx
          ? { ...r, status: next, updatedAt: new Date().toISOString().slice(0, 10) }
          : r
      )
    );
    toast(`「${item.q.slice(0, 10)}」已${next}`, next === '已生效' ? 'success' : 'warn');
  }

  function handleDelete(item: SimpleKBItem) {
    setRows(prev => prev.filter(r => r.idx !== item.idx));
    setSelected(prev => { const n = new Set(prev); n.delete(item.idx); return n; });
    toast('已删除', 'danger');
  }

  function handleBatchDelete() {
    setRows(prev => prev.filter(r => !selected.has(r.idx)));
    toast(`已删除 ${selected.size} 条`, 'danger');
    setSelected(new Set());
  }

  function handlePublish() {
    const pending = rows.filter(r => r.status === '待发布').length;
    if (!pending) { toast('暂无待发布条目', 'warn'); return; }
    setRows(prev => prev.map(r => r.status === '待发布' ? { ...r, status: '已生效' as KBStatus } : r));
    toast(`已发布 ${pending} 条变更`, 'success');
  }

  // ─── 表格列定义 ───────────────────────────────────────────────────────────
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
          style={{ accentColor: 'var(--gold)', cursor: 'pointer' }}
        />
      ),
    },
    {
      key: 'q',
      header: '标准问题',
      width: '22%',
      sortable: true,
      sortAccessor: (r) => r.q,
      render: (row) => (
        <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{row.q}</span>
      ),
    },
    {
      key: 'a',
      header: '标准回复',
      render: (row) => (
        <span
          className="text-2"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}
        >
          {row.a}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: '更新时间',
      width: 110,
      nowrap: true,
      sortable: true,
      sortAccessor: (r) => r.updatedAt,
      render: (row) => <span className="text-3 tnum" style={{ fontSize: 12 }}>{row.updatedAt}</span>,
    },
    {
      key: 'status',
      header: '状态',
      width: 90,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '操作',
      width: 158,
      render: (row) => (
        <div className="row gap-1" onClick={e => e.stopPropagation()}>
          <button className="btn btn-subtle btn-sm" onClick={() => openEdit(row)} title="查看详情">
            <Eye size={12} />
          </button>
          <button className="btn btn-subtle btn-sm" onClick={() => openEdit(row)} title="编辑">
            <Pencil size={12} />
          </button>
          <button
            className="btn btn-subtle btn-sm"
            title={row.status === '已生效' ? '下线' : '上线'}
            onClick={() => handleToggleStatus(row)}
          >
            <Power size={12} />
          </button>
          <button className="btn btn-subtle btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(row)} title="删除">
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ];

  const pendingCount = rows.filter(r => r.status === '待发布').length;

  return (
    <div className="page">
      <PageHeader
        title="寒暄知识库"
        subtitle="1,396 条 · 日常问候 / 致谢 / 告别 · 统一向量化检索"
        actions={
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm" onClick={openNew}>
              <Plus size={14} style={{ marginRight: 4 }} />新增寒暄
            </button>
            <button className="btn btn-primary btn-sm" onClick={handlePublish}>
              发布变更
              {pendingCount > 0 && (
                <span
                  className="badge"
                  style={{ marginLeft: 6, background: 'color-mix(in srgb, var(--gold) 20%, transparent)', color: 'var(--gold)', fontSize: 11 }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setMoreOpen(v => !v)}>
                更多<ChevronDown size={12} style={{ marginLeft: 3 }} />
              </button>
              {moreOpen && (
                <div
                  style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 200,
                    background: 'var(--surface-1)', border: '1px solid var(--hairline)',
                    borderRadius: 'var(--r-md)', boxShadow: 'var(--elev-2)', minWidth: 140, padding: '6px 0',
                  }}
                  onMouseLeave={() => setMoreOpen(false)}
                >
                  {[
                    { icon: <Download size={13} />, label: '导出 CSV' },
                    { icon: <Upload size={13} />, label: '批量导入' },
                    { icon: <MoreHorizontal size={13} />, label: '导入模板' },
                  ].map(item => (
                    <button
                      key={item.label}
                      className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 14px', fontSize: 13 }}
                      onClick={() => { setMoreOpen(false); toast(`${item.label} 功能开发中`, 'info'); }}
                    >
                      {item.icon}<span style={{ marginLeft: 8 }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* 工具条 */}
      <Toolbar>
        <div className="input-wrap" style={{ flex: 1, maxWidth: 320 }}>
          <Search size={14} className="input-icon" />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder="搜索问题 / 回复内容…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <select
            className="input"
            style={{ paddingRight: 28, appearance: 'none', minWidth: 110 }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as KBStatus | ''); setPage(1); }}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s || '全部状态'}</option>
            ))}
          </select>
          <ChevronDown
            size={13}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }}
          />
        </div>
      </Toolbar>

      {/* 数据表卡片 */}
      <div className="card card-pad-0 reveal">
        {/* 全选行 */}
        <div className="row" style={{ padding: '10px 16px', borderBottom: '1px solid var(--hairline)', gap: 10 }}>
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={toggleAll}
            style={{ accentColor: 'var(--gold)', cursor: 'pointer' }}
          />
          <span className="text-3" style={{ fontSize: 12 }}>
            {selected.size > 0 ? `已选 ${selected.size} 条` : `共 ${filtered.length.toLocaleString('zh-CN')} 条`}
          </span>
        </div>

        <DataTable<SimpleKBItem>
          cols={cols}
          rows={pageRows}
          rowKey={(r) => String(r.idx)}
          onRow={(r) => openEdit(r)}
          empty={{ title: '暂无寒暄条目', desc: '点击「新增寒暄」添加第一条' }}
          dense
        />

        {/* 底部摘要 + 批量删除 + 分页 */}
        <div style={{ padding: '0 16px 8px' }}>
          <div className="row spread" style={{ paddingTop: 8, borderTop: '1px solid var(--hairline)' }}>
            <div className="row gap-3">
              <span className="text-3" style={{ fontSize: 12 }}>
                {'已生效 '}
                <span className="tnum" style={{ color: 'var(--success)' }}>{rows.filter(r => r.status === '已生效').length}</span>
                {' · 待发布 '}
                <span className="tnum" style={{ color: 'var(--warning)' }}>{rows.filter(r => r.status === '待发布').length}</span>
                {' · 已下线 '}
                <span className="tnum" style={{ color: 'var(--text-3)' }}>{rows.filter(r => r.status === '已下线').length}</span>
              </span>
              {selected.size > 0 && (
                <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)' }} onClick={handleBatchDelete}>
                  <Trash2 size={12} style={{ marginRight: 4 }} />批量删除 ({selected.size})
                </button>
              )}
            </div>
            <Pagination
              page={page}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </div>
        </div>
      </div>

      {/* 编辑 / 新增弹窗 */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑寒暄' : '新增寒暄'}
        sub={editing ? `当前状态：${editing.status}` : '新条目默认为「待发布」状态'}
        width={520}
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>保存</button>
          </>
        }
      >
        <Field label="标准问题" hint="用户可能发送的寒暄问句，支持正斜杠分隔多个触发词">
          <input
            className="input"
            placeholder="例：谢谢你 / 太感谢了"
            value={draftQ}
            onChange={e => setDraftQ(e.target.value)}
          />
        </Field>
        <Field label="标准回复" hint="机器人回复内容，可使用 emoji / 颜文字增强亲切感">
          <textarea
            className="input"
            rows={4}
            placeholder="例：哇，能够解决您的问题是我的荣幸~如有其他问题欢迎随时找小云哦！"
            value={draftA}
            onChange={e => setDraftA(e.target.value)}
            style={{ resize: 'vertical', minHeight: 96 }}
          />
        </Field>
      </Modal>
    </div>
  );
}
