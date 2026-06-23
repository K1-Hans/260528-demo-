import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from './ui';
import { Inbox } from 'lucide-react';

export interface Col<T> {
  key: string;
  header: string;
  render?: (row: T, i: number) => React.ReactNode;
  sortAccessor?: (row: T) => number | string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  num?: boolean;        // tabular-nums + right align
  nowrap?: boolean;
}

interface Props<T> {
  cols: Col<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  onRow?: (row: T) => void;
  empty?: { title: string; desc?: string; icon?: React.ReactNode };
  rowClass?: (row: T) => string;
  dense?: boolean;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
}

/** 发丝线数据表 · 可排序 · hover · 空态。中台 KB / 运营页统一用它。 */
export function DataTable<T>({ cols, rows, rowKey, onRow, empty, rowClass, dense, defaultSort }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = cols.find(c => c.key === sort.key);
    if (!col) return rows;
    const acc = col.sortAccessor ?? ((r: T) => (r as Record<string, unknown>)[col.key] as number | string);
    const out = [...rows].sort((a, b) => {
      const va = acc(a), vb = acc(b);
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va).localeCompare(String(vb), 'zh-CN');
    });
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [rows, sort, cols]);

  const toggleSort = (key: string) => setSort(s =>
    s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead>
          <tr>
            {cols.map(c => (
              <th
                key={c.key}
                style={{ width: c.width, textAlign: c.num ? 'right' : c.align, cursor: c.sortable ? 'pointer' : undefined, userSelect: 'none' }}
                onClick={c.sortable ? () => toggleSort(c.key) : undefined}
              >
                <span className="row gap-1" style={{ display: 'inline-flex', justifyContent: c.num ? 'flex-end' : undefined }}>
                  {c.header}
                  {c.sortable && (sort?.key === c.key
                    ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                    : <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              className={rowClass?.(row)}
              style={{ cursor: onRow ? 'pointer' : undefined }}
              onClick={onRow ? () => onRow(row) : undefined}
            >
              {cols.map(c => (
                <td
                  key={c.key}
                  className={c.num ? 'td-num' : ''}
                  style={{ textAlign: c.align, whiteSpace: c.nowrap ? 'nowrap' : undefined, padding: dense ? '8px 14px' : undefined }}
                >
                  {c.render ? c.render(row, i) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <EmptyState icon={empty?.icon ?? <Inbox size={34} />} title={empty?.title ?? '暂无数据'} desc={empty?.desc} />
      )}
    </div>
  );
}

/** 分页器（省略号 + 首尾页）。 */
export function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const around = (p: number) => p >= page - 1 && p <= page + 1;
  const nums: (number | '...')[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || around(p)) nums.push(p);
    else if (nums[nums.length - 1] !== '...') nums.push('...');
  }
  return (
    <div className="row gap-2" style={{ justifyContent: 'flex-end', padding: '14px 4px 2px' }}>
      <span className="t-small text-3 tnum" style={{ marginRight: 'auto' }}>共 {total.toLocaleString('zh-CN')} 条 · 第 {page}/{pages} 页</span>
      <button className="btn btn-subtle btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /></button>
      {nums.map((n, i) => n === '...'
        ? <span key={`e${i}`} className="text-3" style={{ padding: '0 4px' }}>…</span>
        : <button key={n} className="btn btn-sm" style={{ background: n === page ? 'var(--gold-glow)' : 'var(--surface-2)', color: n === page ? 'var(--gold)' : 'var(--text-2)', border: `1px solid ${n === page ? 'var(--hairline-strong)' : 'var(--hairline)'}`, minWidth: 30 }} onClick={() => onPage(n)}>{n}</button>)}
      <button className="btn btn-subtle btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={14} /></button>
    </div>
  );
}
