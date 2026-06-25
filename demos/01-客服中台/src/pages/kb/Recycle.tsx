import { useState, useMemo } from 'react';
import { RefreshCw, Trash2, Archive } from 'lucide-react';
import { PageHeader, Badge, EmptyState } from '../../components/ui';
import { DataTable, type Col } from '../../components/DataTable';
import { StatusBadge, Toolbar, Modal, toast } from '../../components/kit';

// ─── 本地类型 ─────────────────────────────────────────────────────────────────
type RecycleSource = 'QA' | '卡片' | '转人工' | '寒暄' | '敏感词';

interface RecycleItem {
  id: string;
  source: RecycleSource;
  q: string;
  scenario: string;
  deletedAt: string;
  origIdx: number;
}

// ─── Mock 数据（≥14 行，真实消金问法）───────────────────────────────────────
const MOCK_RECYCLE: RecycleItem[] = [
  { id: 'r001', source: 'QA',   q: '怎么办理分期还款',        scenario: '还款相关',   deletedAt: '2026-06-10 14:22', origIdx: 1024 },
  { id: 'r002', source: 'QA',   q: '逾期了会怎么处理',         scenario: '催收相关',   deletedAt: '2026-06-10 14:23', origIdx: 1089 },
  { id: 'r003', source: 'QA',   q: '提前还款有违约金吗',        scenario: '费用相关',   deletedAt: '2026-06-09 09:45', origIdx: 733  },
  { id: 'r004', source: 'QA',   q: '怎么修改还款日',           scenario: '业务办理',   deletedAt: '2026-06-09 09:46', origIdx: 812  },
  { id: 'r005', source: 'QA',   q: '申请额度需要什么条件',      scenario: '申请咨询',   deletedAt: '2026-06-08 16:31', origIdx: 209  },
  { id: 'r006', source: 'QA',   q: '利率是多少',               scenario: '产品与信息', deletedAt: '2026-06-07 11:17', origIdx: 315  },
  { id: 'r007', source: '卡片', q: '怎么绑定银行卡',           scenario: '信息维护',   deletedAt: '2026-06-07 11:18', origIdx: 88   },
  { id: 'r008', source: '卡片', q: '账单详情怎么查',           scenario: '费用相关',   deletedAt: '2026-06-06 18:02', origIdx: 103  },
  { id: 'r009', source: '转人工', q: '我要投诉',               scenario: '催收相关',   deletedAt: '2026-06-06 10:55', origIdx: 12   },
  { id: 'r010', source: '转人工', q: '你们有人工客服吗',        scenario: '业务办理',   deletedAt: '2026-06-05 09:30', origIdx: 28   },
  { id: 'r011', source: '寒暄', q: '你好，你是机器人吗',        scenario: '寒暄',       deletedAt: '2026-06-05 09:31', origIdx: 301  },
  { id: 'r012', source: '寒暄', q: '几点上班',                 scenario: '寒暄',       deletedAt: '2026-06-04 15:44', origIdx: 356  },
  { id: 'r013', source: '敏感词', q: '聚投诉',                 scenario: '投诉维权',   deletedAt: '2026-06-03 13:20', origIdx: 7    },
  { id: 'r014', source: '敏感词', q: '银保监会投诉',           scenario: '金融监管',   deletedAt: '2026-06-02 16:08', origIdx: 9    },
  { id: 'r015', source: 'QA',   q: '会员怎么退费',             scenario: '费用相关',   deletedAt: '2026-06-01 10:00', origIdx: 1120 },
  { id: 'r016', source: 'QA',   q: '手机号码怎么更换',         scenario: '信息维护',   deletedAt: '2026-05-30 14:33', origIdx: 874  },
];

const SOURCE_COLORS: Record<RecycleSource, string> = {
  'QA':    'var(--gold)',
  '卡片':  'var(--info)',
  '转人工': 'var(--warning)',
  '寒暄':  'var(--emerald)',
  '敏感词': 'var(--danger)',
};

const ALL_SOURCES = ['全部', 'QA', '卡片', '转人工', '寒暄', '敏感词'] as const;

// ─── 统计 chip ────────────────────────────────────────────────────────────────
function SourceChip({ source, count }: { source: RecycleSource; count: number }) {
  return (
    <span
      className="chip tnum"
      style={{
        background: `color-mix(in srgb, ${SOURCE_COLORS[source]} 10%, var(--surface-2))`,
        border: `1px solid color-mix(in srgb, ${SOURCE_COLORS[source]} 25%, var(--hairline))`,
        color: SOURCE_COLORS[source],
        borderRadius: 'var(--r-md)',
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      {source}
      <span style={{ fontVariantNumeric: 'tabular-nums', background: 'var(--surface-3)', borderRadius: 8, padding: '0 6px', fontSize: 11 }}>
        {count}
      </span>
    </span>
  );
}

// ─── 页面 ─────────────────────────────────────────────────────────────────────
export default function Recycle() {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<typeof ALL_SOURCES[number]>('全部');
  const [confirmItem, setConfirmItem] = useState<RecycleItem | null>(null);
  const [items, setItems] = useState<RecycleItem[]>(MOCK_RECYCLE);

  // 过滤
  const filtered = useMemo(() => {
    let rows = items;
    if (sourceFilter !== '全部') rows = rows.filter(r => r.source === sourceFilter);
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      rows = rows.filter(r => r.q.toLowerCase().includes(kw) || r.scenario.toLowerCase().includes(kw));
    }
    return rows;
  }, [items, sourceFilter, search]);

  // 各库统计
  const counts = useMemo(() => {
    const c: Partial<Record<RecycleSource, number>> = {};
    for (const it of items) c[it.source] = (c[it.source] ?? 0) + 1;
    return c;
  }, [items]);

  // 恢复
  function handleRestore(row: RecycleItem) {
    setItems(prev => prev.filter(r => r.id !== row.id));
    toast(`「${row.q}」已恢复至待发布`, 'success');
  }

  // 彻底删除确认
  function handleDeleteConfirmed() {
    if (!confirmItem) return;
    setItems(prev => prev.filter(r => r.id !== confirmItem.id));
    toast(`「${confirmItem.q}」已物理删除，不可恢复`, 'danger');
    setConfirmItem(null);
  }

  const cols: Col<RecycleItem>[] = [
    {
      key: 'source',
      header: '知识库来源',
      width: 110,
      render: row => (
        <Badge color={SOURCE_COLORS[row.source]}>{row.source}</Badge>
      ),
    },
    {
      key: 'q',
      header: '标准问题',
      render: row => (
        <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{row.q}</span>
      ),
    },
    {
      key: 'scenario',
      header: '场景',
      width: 130,
      render: row => <span className="text-2">{row.scenario}</span>,
    },
    {
      key: 'deletedAt',
      header: '下线时间',
      width: 160,
      sortable: true,
      sortAccessor: row => row.deletedAt,
      render: row => <span className="tnum text-3" style={{ fontSize: 12 }}>{row.deletedAt}</span>,
    },
    {
      key: 'origIdx',
      header: '原 index',
      width: 90,
      num: true,
      render: row => (
        <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text-3)' }}>
          #{row.origIdx}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      width: 160,
      align: 'right',
      render: row => (
        <span className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <button
            className="btn btn-sm"
            style={{ color: 'var(--emerald)', border: '1px solid color-mix(in srgb,var(--emerald) 30%,var(--hairline))', background: 'color-mix(in srgb,var(--emerald) 8%,transparent)', fontWeight: 600 }}
            onClick={e => { e.stopPropagation(); handleRestore(row); }}
          >
            恢复
          </button>
          <button
            className="btn btn-sm btn-danger"
            style={{ fontWeight: 600 }}
            onClick={e => { e.stopPropagation(); setConfirmItem(row); }}
          >
            <Trash2 size={12} />
            彻底删除
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="回收站"
        subtitle="软删除归档 · 可恢复（→ 待发布）或彻底删除 · 三层保护防误删"
        actions={
          <button className="btn btn-ghost btn-sm row gap-2" onClick={() => toast('已刷新', 'info')}>
            <RefreshCw size={14} />
            刷新
          </button>
        }
      />

      {/* 各库统计 chips */}
      <div className="row gap-2 wrap reveal" style={{ marginBottom: 20 }}>
        {(Object.entries(counts) as [RecycleSource, number][]).map(([src, cnt]) => (
          <SourceChip key={src} source={src} count={cnt} />
        ))}
        {Object.keys(counts).length === 0 && (
          <span className="text-3" style={{ fontSize: 13 }}>回收站无待清理条目</span>
        )}
      </div>

      {/* 工具条 */}
      <Toolbar>
        <div className="input-wrap" style={{ flex: 1, maxWidth: 320 }}>
          <input
            className="input"
            placeholder="搜索问题 / 场景…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ width: 130 }}
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value as typeof ALL_SOURCES[number])}
        >
          {ALL_SOURCES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Toolbar>

      {/* 数据表 */}
      <div className="card card-pad-0 reveal-1">
        <DataTable<RecycleItem>
          cols={cols}
          rows={filtered}
          rowKey={r => r.id}
          defaultSort={{ key: 'deletedAt', dir: 'desc' }}
          empty={{ title: '回收站为空', desc: '暂无已下线条目，所有知识库内容均处于正常状态', icon: <Archive size={34} /> }}
        />
      </div>

      {/* 彻底删除确认 Modal */}
      <Modal
        open={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        title="确认彻底删除"
        sub="此操作不可撤销，数据将从系统中永久移除"
        width={480}
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmItem(null)}>取消</button>
            <button className="btn btn-sm btn-danger" onClick={handleDeleteConfirmed}>
              <Trash2 size={13} />
              确认物理删除
            </button>
          </>
        }
      >
        {confirmItem && (
          <div className="col gap-3">
            <div
              className="card"
              style={{ background: 'color-mix(in srgb,var(--danger) 6%,var(--surface-2))', border: '1px solid color-mix(in srgb,var(--danger) 20%,var(--hairline))' }}
            >
              <div className="row gap-2" style={{ marginBottom: 8 }}>
                <Badge color={SOURCE_COLORS[confirmItem.source]}>{confirmItem.source}</Badge>
                <span
                  className="mono tnum"
                  style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}
                >
                  #{confirmItem.origIdx}
                </span>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{confirmItem.q}</div>
              <div className="text-3" style={{ fontSize: 12 }}>
                场景：{confirmItem.scenario} · 下线于 {confirmItem.deletedAt}
              </div>
            </div>
            <div
              className="row gap-2"
              style={{ background: 'color-mix(in srgb,var(--danger) 8%,var(--surface-2))', border: '1px solid color-mix(in srgb,var(--danger) 18%,var(--hairline))', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13 }}
            >
              <StatusBadge status="已下线" />
              <span style={{ color: 'var(--text-2)' }}>彻底删除后无法通过任何方式恢复，请谨慎操作。</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
