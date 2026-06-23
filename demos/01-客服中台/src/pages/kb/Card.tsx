import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Plus, Send, MoreHorizontal, Upload, Download, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import { DataTable, Pagination, type Col } from '../../components/DataTable';
import { StatusBadge, Toolbar, Field, Modal } from '../../components/kit';
import { INTENT_L1 } from '../../lib/mockData';
import type { CardItem, KBStatus } from '../../types';

// ─── 本地扩展类型（卡片库额外字段）──────────────────────────────────────────
type CardRow = CardItem;

// ─── Mock 数据（≥ 16 行，真实消金场景）──────────────────────────────────────
const MOCK_CARDS: CardRow[] = [
  { idx: 1,  q: '我逾期了怎么办',         cardId: '2030888006771101698', cardType: 'multi', scenario: '逾期催收', l1: '催收相关',  l2: '逾期提醒', l3: '逾期处理引导', status: '已生效', updatedAt: '2026-06-15 10:23', group: '逾期类' },
  { idx: 2,  q: '逾期多久会上征信',        cardId: '2030888006771101698', cardType: 'multi', scenario: '逾期催收', l1: '催收相关',  l2: '逾期提醒', l3: '征信上报',     status: '已生效', updatedAt: '2026-06-15 10:23', group: '逾期类' },
  { idx: 3,  q: '逾期了可以申请宽限期吗',   cardId: '2030888006771101698', cardType: 'multi', scenario: '逾期催收', l1: '催收相关',  l2: '逾期提醒', l3: '宽限期申请',   status: '已生效', updatedAt: '2026-06-15 10:23', group: '逾期类' },
  { idx: 4,  q: '逾期罚息怎么算',          cardId: '2030888006771101698', cardType: 'multi', scenario: '逾期催收', l1: '催收相关',  l2: '逾期费用', l3: '罚息计算',     status: '待发布', updatedAt: '2026-06-16 08:11', group: '逾期类' },
  { idx: 5,  q: '我想换一张信用卡',        cardId: '2030888006771201011', cardType: 'single', scenario: '卡片服务', l1: '业务办理', l2: '换卡',    l3: '换卡申请',     status: '已生效', updatedAt: '2026-06-12 14:30' },
  { idx: 6,  q: '如何办理换卡',           cardId: '2030888006771201011', cardType: 'single', scenario: '卡片服务', l1: '业务办理', l2: '换卡',    l3: '换卡申请',     status: '已生效', updatedAt: '2026-06-12 14:30' },
  { idx: 7,  q: '会员中心在哪里',         cardId: '2030888006771301022', cardType: 'single', scenario: '会员权益', l1: '产品与信息', l2: '会员中心', l3: '权益查询',   status: '已生效', updatedAt: '2026-06-10 09:05' },
  { idx: 8,  q: '会员费怎么退',           cardId: '2030888006771301022', cardType: 'single', scenario: '会员权益', l1: '产品与信息', l2: '会员中心', l3: '退费申请',   status: '已生效', updatedAt: '2026-06-10 09:05' },
  { idx: 9,  q: '如何注销账户',           cardId: '2030888006771401033', cardType: 'single', scenario: '账户管理', l1: '信息维护',  l2: '注销账户', l3: '注销申请',   status: '已生效', updatedAt: '2026-06-08 16:42' },
  { idx: 10, q: '注销需要什么条件',        cardId: '2030888006771401033', cardType: 'single', scenario: '账户管理', l1: '信息维护',  l2: '注销账户', l3: '注销条件',   status: '已生效', updatedAt: '2026-06-08 16:42' },
  { idx: 11, q: '还款失败怎么办',         cardId: '2030888006771501044', cardType: 'multi', scenario: '还款问题', l1: '还款相关',  l2: '还款失败', l3: '失败处理',   status: '已生效', updatedAt: '2026-06-14 11:18', group: '还款失败' },
  { idx: 12, q: '还款扣款不成功原因',      cardId: '2030888006771501044', cardType: 'multi', scenario: '还款问题', l1: '还款相关',  l2: '还款失败', l3: '失败原因',   status: '已生效', updatedAt: '2026-06-14 11:18', group: '还款失败' },
  { idx: 13, q: '银行卡余额够但还款失败',   cardId: '2030888006771501044', cardType: 'multi', scenario: '还款问题', l1: '还款相关',  l2: '还款失败', l3: '系统异常',   status: '待发布', updatedAt: '2026-06-16 07:55', group: '还款失败' },
  { idx: 14, q: '怎么申请提前结清',        cardId: '2030888006771601055', cardType: 'single', scenario: '提前结清', l1: '还款相关',  l2: '提前还款', l3: '结清申请',   status: '已生效', updatedAt: '2026-06-11 13:00' },
  { idx: 15, q: '提前结清有手续费吗',      cardId: '2030888006771601055', cardType: 'single', scenario: '提前结清', l1: '还款相关',  l2: '提前还款', l3: '手续费说明', status: '已下线', updatedAt: '2026-06-13 09:22' },
  { idx: 16, q: '额度怎么提升',           cardId: '2030888006771701066', cardType: 'single', scenario: '额度管理', l1: '申请咨询',  l2: '额度提升', l3: '提额条件',   status: '已生效', updatedAt: '2026-06-09 15:50' },
  { idx: 17, q: '怎么查看我的贷款利率',    cardId: '2030888006771801077', cardType: 'single', scenario: '费率查询', l1: '费用相关',  l2: '利率查询', l3: '利率说明',   status: '已生效', updatedAt: '2026-06-07 10:12' },
  { idx: 18, q: '分期手续费怎么算',        cardId: '2030888006771901088', cardType: 'multi', scenario: '分期费用', l1: '费用相关',  l2: '手续费',  l3: '分期费率',   status: '已生效', updatedAt: '2026-06-06 14:35', group: '手续费' },
  { idx: 19, q: '分期之后可以提前还吗',     cardId: '2030888006771901088', cardType: 'multi', scenario: '分期费用', l1: '费用相关',  l2: '手续费',  l3: '提前还分期', status: '已生效', updatedAt: '2026-06-06 14:35', group: '手续费' },
];

// ─── 辅助组件 ────────────────────────────────────────────────────────────────
function L1Badge({ label }: { label: string }) {
  return (
    <span className="badge" style={{ background: 'var(--gold-glow)', color: 'var(--gold)', fontWeight: 600, fontSize: 11 }}>
      {label}
    </span>
  );
}

function AggStatusLine({ items }: { items: CardRow[] }) {
  const eff  = items.filter(r => r.status === '已生效').length;
  const pend = items.filter(r => r.status === '待发布').length;
  const off  = items.filter(r => r.status === '已下线').length;
  return (
    <span className="row gap-2 tnum" style={{ fontSize: 12 }}>
      {eff  > 0 && <span style={{ color: 'var(--success)' }}>✓{eff} 已生效</span>}
      {pend > 0 && <span style={{ color: 'var(--warning)' }}>⏳{pend} 待发布</span>}
      {off  > 0 && <span style={{ color: 'var(--text-3)' }}>●{off} 已下线</span>}
    </span>
  );
}

// ─── 分组结构 ────────────────────────────────────────────────────────────────
interface Group {
  key: string;
  scenario: string;
  cardId: string;
  l1: string;
  items: CardRow[];
}

function buildGroups(rows: CardRow[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const k = `${r.scenario}||${r.cardId}`;
    if (!map.has(k)) map.set(k, { key: k, scenario: r.scenario, cardId: r.cardId, l1: r.l1, items: [] });
    map.get(k)!.items.push(r);
  }
  return Array.from(map.values());
}

// ─── 分组视图组件 ────────────────────────────────────────────────────────────
function GroupTable({ groups, onEdit }: { groups: Group[]; onEdit: (r: CardRow) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (k: string) =>
    setExpanded(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const expandAll   = () => setExpanded(new Set(groups.map(g => g.key)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <div>
      <div className="row gap-2" style={{ marginBottom: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-subtle btn-sm" onClick={expandAll}>全展开</button>
        <button className="btn btn-subtle btn-sm" onClick={collapseAll}>全收起</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 28 }} />
              <th>场景</th>
              <th>卡片 ID</th>
              <th>一级意图</th>
              <th>问法数量</th>
              <th>聚合状态</th>
              <th style={{ width: 110 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => {
              const open = expanded.has(g.key);
              return [
                <tr
                  key={g.key + '-head'}
                  style={{ background: 'color-mix(in srgb, var(--surface-2) 60%, transparent)', cursor: 'pointer' }}
                  onClick={() => toggle(g.key)}
                >
                  <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                    {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </td>
                  <td style={{ fontWeight: 600 }}>{g.scenario}</td>
                  <td><span className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{g.cardId}</span></td>
                  <td><L1Badge label={g.l1} /></td>
                  <td><span className="tnum" style={{ color: 'var(--text-2)', fontSize: 13 }}>{g.items.length} 个问法</span></td>
                  <td><AggStatusLine items={g.items} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-subtle btn-sm" style={{ fontSize: 11 }}>
                      <Plus size={12} style={{ marginRight: 3 }} />添加问法
                    </button>
                  </td>
                </tr>,
                ...(open ? g.items.map((r, ri) => (
                  <tr key={g.key + '-' + ri} style={{ background: 'transparent' }}>
                    <td />
                    <td style={{ paddingLeft: 28, color: 'var(--text-2)', fontSize: 13 }}>{r.q}</td>
                    <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.cardId}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.l2}</td>
                    <td><span className="text-3" style={{ fontSize: 12 }}>{r.l3}</span></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      <div className="row gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(r)}>编辑</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', fontSize: 11 }}>删</button>
                      </div>
                    </td>
                  </tr>
                )) : []),
              ];
            })}
          </tbody>
        </table>
        {groups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 14 }}>暂无卡片数据</div>
        )}
      </div>
    </div>
  );
}

// ─── 主页组件 ────────────────────────────────────────────────────────────────
export default function CardKB() {
  // 筛选
  const [searchQ,      setSearchQ]      = useState('');
  const [searchId,     setSearchId]     = useState('');
  const [searchScene,  setSearchScene]  = useState('');
  const [filterL1,     setFilterL1]     = useState('');
  const [filterL2,     setFilterL2]     = useState('');
  const [filterStatus, setFilterStatus] = useState<KBStatus | ''>('');
  const [groupView,    setGroupView]    = useState(true);

  // 选中
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // 分页
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<CardRow | null>(null);
  const [formQ,     setFormQ]     = useState('');
  const [formId,    setFormId]    = useState('');
  const [formScene, setFormScene] = useState('');
  const [formL1,    setFormL1]    = useState('');

  // 过滤结果
  const filtered = useMemo(() => MOCK_CARDS.filter(r => {
    if (searchQ     && !r.q.includes(searchQ))          return false;
    if (searchId    && !r.cardId.includes(searchId))    return false;
    if (searchScene && !r.scenario.includes(searchScene)) return false;
    if (filterL1    && r.l1 !== filterL1)               return false;
    if (filterL2    && r.l2 !== filterL2)               return false;
    if (filterStatus && r.status !== filterStatus)      return false;
    return true;
  }), [searchQ, searchId, searchScene, filterL1, filterL2, filterStatus]);

  const groups = useMemo(() => buildGroups(filtered), [filtered]);
  const paged  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // 二级意图选项（随 L1 联动）
  const l2Options = useMemo(() => {
    const base = MOCK_CARDS.filter(r => !filterL1 || r.l1 === filterL1);
    return [...new Set(base.map(r => r.l2))];
  }, [filterL1]);

  // 表格列（平铺视图）
  const cols: Col<CardRow>[] = [
    {
      key: 'check', header: '', width: 34,
      render: (row) => (
        <input
          type="checkbox"
          checked={selected.has(row.idx)}
          onChange={e => setSelected(s => {
            const n = new Set(s); e.target.checked ? n.add(row.idx) : n.delete(row.idx); return n;
          })}
          style={{ accentColor: 'var(--gold)' }}
        />
      ),
    },
    { key: 'q', header: '标准问题', render: r => <span style={{ fontWeight: 500 }}>{r.q}</span> },
    {
      key: 'cardId', header: '标准回复（卡片 ID）',
      render: r => <span className="mono" style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.01em' }}>{r.cardId}</span>,
    },
    { key: 'scenario', header: '场景' },
    { key: 'l1', header: '一级意图', render: r => <L1Badge label={r.l1} /> },
    { key: 'l2', header: '二级意图', render: r => <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.l2}</span> },
    { key: 'l3', header: '三级意图', render: r => <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.l3}</span> },
    { key: 'updatedAt', header: '更新时间', render: r => <span className="tnum" style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.updatedAt}</span> },
    { key: 'status', header: '状态', render: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '操作',
      render: (row) => (
        <div className="row gap-1">
          <button className="btn btn-ghost btn-sm">详情</button>
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>编辑</button>
          <button className="btn btn-ghost btn-sm">{row.status === '已生效' ? '下线' : '上线'}</button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
        </div>
      ),
    },
  ];

  function openNew() {
    setEditing(null); setFormQ(''); setFormId(''); setFormScene(''); setFormL1('');
    setModalOpen(true);
  }

  function openEdit(row: CardRow) {
    setEditing(row); setFormQ(row.q); setFormId(row.cardId); setFormScene(row.scenario); setFormL1(row.l1);
    setModalOpen(true);
  }

  return (
    <div className="page">
      <PageHeader
        title="卡片知识库"
        subtitle="530 张富文本卡片 · 命中返回 card_id 给坐席系统渲染"
        actions={
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm"><MoreHorizontal size={15} />&nbsp;更多</button>
            <button className="btn btn-subtle btn-sm"><Upload size={14} style={{ marginRight: 4 }} />导入</button>
            <button className="btn btn-subtle btn-sm"><Download size={14} style={{ marginRight: 4 }} />导出</button>
            <button className="btn btn-ghost" onClick={openNew}><Plus size={15} style={{ marginRight: 4 }} />新增卡片</button>
            <button className="btn btn-primary"><Send size={13} style={{ marginRight: 5 }} />发布变更</button>
          </div>
        }
      />

      {/* 工具条 */}
      <Toolbar>
        <input className="input" placeholder="卡片名称 / 标准问题" value={searchQ}
          onChange={e => { setSearchQ(e.target.value); setPage(1); }} style={{ width: 196, flex: '1 1 160px' }} />
        <input className="input mono" placeholder="卡片 ID" value={searchId}
          onChange={e => { setSearchId(e.target.value); setPage(1); }} style={{ width: 188, fontSize: 12 }} />
        <input className="input" placeholder="场景" value={searchScene}
          onChange={e => { setSearchScene(e.target.value); setPage(1); }} style={{ width: 130 }} />
        <select className="input" style={{ width: 140 }} value={filterL1}
          onChange={e => { setFilterL1(e.target.value); setFilterL2(''); setPage(1); }}>
          <option value="">全部一级意图</option>
          {INTENT_L1.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="input" style={{ width: 140 }} value={filterL2}
          onChange={e => { setFilterL2(e.target.value); setPage(1); }}>
          <option value="">全部二级意图</option>
          {l2Options.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="input" style={{ width: 112 }} value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value as KBStatus | ''); setPage(1); }}>
          <option value="">全部状态</option>
          <option value="已生效">已生效</option>
          <option value="待发布">待发布</option>
          <option value="已下线">已下线</option>
        </select>
        <label className="row gap-1" style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', userSelect: 'none', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={groupView} onChange={e => setGroupView(e.target.checked)}
            style={{ accentColor: 'var(--gold)', width: 'auto' }} />
          分组视图
        </label>
      </Toolbar>

      {/* 结果统计 + 批量操作 */}
      <div className="row gap-2" style={{ marginBottom: 10 }}>
        <span className="tnum" style={{ fontSize: 12, color: 'var(--text-3)' }}>
          共 <strong style={{ color: 'var(--text-1)' }}>{filtered.length}</strong> 条
          · 覆盖 <strong style={{ color: 'var(--gold)' }}>{groups.length}</strong> 个卡片组
        </span>
        {selected.size > 0 && (
          <span className="row gap-2" style={{ marginLeft: 'auto' }}>
            <span className="tnum" style={{ fontSize: 12, color: 'var(--text-3)' }}>已选 {selected.size} 条</span>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>批量下线</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>批量删除</button>
          </span>
        )}
      </div>

      {/* 内容卡 */}
      <div className="card card-pad-0" style={{ marginBottom: 8 }}>
        {groupView ? (
          <div style={{ padding: '16px 20px' }}>
            <GroupTable groups={groups} onEdit={openEdit} />
          </div>
        ) : (
          <>
            <DataTable cols={cols} rows={paged} rowKey={r => String(r.idx)} dense />
            <div style={{ padding: '0 16px' }}>
              <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
          </>
        )}
      </div>

      {/* 新增 / 编辑 Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑卡片问法' : '新增卡片'}
        sub={editing ? `当前卡片 ID：${editing.cardId}` : '填写新问法与对应卡片信息'}
        footer={
          <>
            <button className="btn btn-subtle" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={() => setModalOpen(false)}>
              {editing ? '保存（待发布）' : '创建'}
            </button>
          </>
        }
      >
        <div className="col gap-3">
          <Field label="标准问法">
            <input className="input" value={formQ} onChange={e => setFormQ(e.target.value)}
              placeholder="输入用户问法，如「我逾期了怎么办」" />
          </Field>
          <Field label="卡片 ID" hint="输入已有 card_id 将归入同组；留空自动新建">
            <input className="input mono" value={formId} onChange={e => setFormId(e.target.value)}
              placeholder="如 2030888006771101698" style={{ fontSize: 12 }} />
          </Field>
          <Field label="场景">
            <input className="input" value={formScene} onChange={e => setFormScene(e.target.value)}
              placeholder="如「逾期催收」「还款问题」" />
          </Field>
          <Field label="一级意图">
            <select className="input" value={formL1} onChange={e => setFormL1(e.target.value)}>
              <option value="">请选择</option>
              {INTENT_L1.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
