import { useMemo, useState } from 'react';
import {
  Sparkles, Send, Pin, RotateCcw, Code2, ChevronDown, ChevronRight,
  CornerDownRight, Layers, ShieldCheck, BarChart3,
} from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel, ConfidenceChip, SqlBlock } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cssVar, DRAW } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { QUERY_CELLS } from '../lib/mockData';
import { CONFIDENCE_DESC, type QueryCell } from '../types';

const SUGGESTIONS = [
  '上季度各分行的 AUM 和环比增速',
  '近 12 月信用贷不良率趋势',
  '各渠道获客成本与 30 日留存',
  '私行客户 AUM 集中度 top10',
];

export default function Ask() {
  const { user, hasPermission } = useAuth();
  const canRun = hasPermission('ask:run');
  const [cells, setCells] = useState<QueryCell[]>(QUERY_CELLS);
  const [draft, setDraft] = useState('');
  const [openSql, setOpenSql] = useState<Record<string, boolean>>({});

  const pinned = useMemo(() => cells.filter(c => c.pinned), [cells]);
  const coverage = Math.round((cells.filter(c => c.confidence === 'covered').length / Math.max(cells.length, 1)) * 100);

  const ask = (q: string) => {
    const question = q.trim();
    if (!question || !canRun) return;
    // mock：新问题生成一条「已覆盖」可信查询（演示用，复用 q1 结果骨架）
    const template = QUERY_CELLS[0];
    const cell: QueryCell = {
      ...template,
      id: 'q-' + question.slice(0, 4) + cells.length,
      question, user: user?.name ?? '分析师', at: '刚刚', pinned: false, elapsedMs: 760,
    };
    setCells(prev => [cell, ...prev]);
    setDraft('');
  };

  const togglePin = (id: string) => setCells(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));

  return (
    <div className="page page-wide">
      <PageHeader
        title="问数台"
        subtitle="自然语言问数 → 生成确定性 SQL → 可信结果。答不了报错，绝不静默返回错数。"
        actions={<span className="tag tag-mono"><Sparkles size={12} style={{ marginRight: 4 }} />语义层驱动</span>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, alignItems: 'start' }}>
        {/* 左：问数 notebook */}
        <div className="col gap-4">
          {/* 问数输入 */}
          <div className="card" style={{ padding: 14 }}>
            <div className="input-wrap">
              <Sparkles size={15} className="input-icon" style={{ color: 'var(--gold)' }} />
              <input
                className="input"
                style={{ paddingRight: 92, height: 44, fontSize: 14 }}
                placeholder={canRun ? '用大白话问数，如「上季度各分行 AUM 和增速」…' : '当前角色为只读视角，无问数权限'}
                value={draft}
                disabled={!canRun}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') ask(draft); }}
              />
              <button
                className="btn btn-primary btn-sm"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                disabled={!canRun || !draft.trim()}
                onClick={() => ask(draft)}
              >
                <Send size={13} />提问
              </button>
            </div>
            <div className="row gap-2 wrap" style={{ marginTop: 10 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} className="tag" style={{ cursor: 'pointer' }} onClick={() => ask(s)}>
                  <CornerDownRight size={11} style={{ marginRight: 4, color: 'var(--text-3)' }} />{s}
                </button>
              ))}
            </div>
          </div>

          {/* notebook cells */}
          {cells.map((c, idx) => (
            <NotebookCell
              key={c.id}
              cell={c}
              active={idx === 0}
              sqlOpen={openSql[c.id] ?? (idx === 0)}
              onToggleSql={() => setOpenSql(s => ({ ...s, [c.id]: !(s[c.id] ?? (idx === 0)) }))}
              onPin={() => togglePin(c.id)}
              onRerun={() => ask(c.question)}
            />
          ))}
        </div>

        {/* 右：看板 + 覆盖率 */}
        <div className="col gap-4">
          <Panel title="语义层覆盖" icon={<ShieldCheck size={13} />}>
            <div className="row spread" style={{ marginBottom: 8 }}>
              <span className="label">问数已覆盖</span>
              <span className="mononum" style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{coverage}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${coverage}%`, background: 'var(--gold)', borderRadius: 3, transition: 'width .6s var(--ease)' }} />
            </div>
            <div className="t-small text-3" style={{ marginTop: 10, lineHeight: 1.6 }}>
              已覆盖 = 命中受治理语义层，结果确定可溯源。其余走 text-to-SQL 或直接拒答。
            </div>
          </Panel>

          <Panel title={<>已 Pin 看板 · {pinned.length}</>} icon={<Pin size={13} />} bodyClass="panel-body">
            {pinned.length ? (
              <div className="col gap-2">
                {pinned.map(c => (
                  <div key={c.id} className="sem-card">
                    <div className="row gap-2" style={{ marginBottom: 5 }}>
                      <ConfidenceChip level={c.confidence} showLabel={false} />
                      <BarChart3 size={12} style={{ color: 'var(--text-3)' }} />
                    </div>
                    <div className="t-small" style={{ color: 'var(--text-1)', fontWeight: 600, lineHeight: 1.4 }}>{c.question}</div>
                    {c.result?.summary && <div className="t-small text-3" style={{ marginTop: 3 }}>{c.result.summary}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="t-small text-3" style={{ textAlign: 'center', padding: 20 }}>暂无 Pin 的查询</div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function NotebookCell({ cell, active, sqlOpen, onToggleSql, onPin, onRerun }: {
  cell: QueryCell; active: boolean; sqlOpen: boolean; onToggleSql: () => void; onPin: () => void; onRerun: () => void;
}) {
  const c = cell;
  const refused = c.confidence === 'refused';
  return (
    <div className={`nb-cell reveal ${active ? 'active' : ''}`}>
      {/* 问题 */}
      <div className="nb-prompt">
        <div className="avatar" style={{ width: 26, height: 26, fontSize: 11, flexShrink: 0 }}>{c.user[0]}</div>
        <div className="flex-1">
          <div className="nb-prompt-q">{c.question}</div>
          <div className="row gap-2" style={{ marginTop: 4 }}>
            <span className="t-small text-3 mononum">{c.at}</span>
            <span className="t-small text-3">·</span>
            <span className="t-small text-3 mononum">{c.elapsedMs}ms</span>
          </div>
        </div>
        <ConfidenceChip level={c.confidence} />
      </div>

      <div className="nb-body col gap-3">
        {/* 拒答态 */}
        {refused ? (
          <div className="card" style={{ padding: '12px 14px', background: 'var(--conf-refused-dim)', border: '1px solid color-mix(in srgb, var(--conf-refused) 30%, transparent)' }}>
            <div className="row gap-2" style={{ marginBottom: 6 }}>
              <ShieldCheck size={14} style={{ color: 'var(--conf-refused)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--conf-refused)' }}>已拒答 · 不返回可能错误/越权的数字</span>
            </div>
            <div className="t-small text-2" style={{ lineHeight: 1.6 }}>{c.refusedReason}</div>
          </div>
        ) : (
          <>
            {/* 可信度说明 */}
            <div className="t-small text-3" style={{ lineHeight: 1.6 }}>{CONFIDENCE_DESC[c.confidence]}</div>

            {/* 结果 */}
            {c.result && c.result.chart === 'kpi' && c.result.rows.length > 0 && (
              <div className="row gap-3" style={{ alignItems: 'baseline' }}>
                <span className="kpi-value" style={{ fontSize: 32 }}>{Number(c.result.rows[0][0]).toLocaleString()}</span>
                <span className="t-small text-2">{c.result.columns[0]?.label}</span>
              </div>
            )}
            {c.result?.chartData && c.result.chart === 'bar' && (
              <Chart
                height={208}
                deps={[c.id]}
                build={() => {
                  const ax = axisStyle();
                  const data = c.result!.chartData!;
                  return {
                    ...baseOption(),
                    ...DRAW,
                    backgroundColor: 'transparent',
                    grid: { left: 8, right: 14, top: 16, bottom: 8, containLabel: true },
                    xAxis: { type: 'category', data: data.map(d => d.name), ...ax },
                    yAxis: { type: 'value', ...ax },
                    series: [{
                      type: 'bar', barMaxWidth: 30,
                      itemStyle: { color: accent(), borderRadius: [4, 4, 0, 0] },
                      label: { show: true, position: 'top', color: cssVar('--text-3'), fontSize: 10, fontFamily: "'Geist Mono','Geist',sans-serif" },
                      data: data.map(d => d.value),
                    }],
                  };
                }}
              />
            )}
            {/* 数据表 */}
            {c.result && c.result.rows.length > 0 && c.result.chart !== 'kpi' && c.result.columns.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead><tr>{c.result.columns.map(col => <th key={col.key} style={{ textAlign: col.type === 'measure' ? 'right' : 'left' }}>{col.label}</th>)}</tr></thead>
                  <tbody>
                    {c.result.rows.slice(0, 6).map((row, ri) => (
                      <tr key={ri}>{row.map((v, ci) => <td key={ci} className={c.result!.columns[ci]?.type === 'measure' ? 'td-num' : ''}>{typeof v === 'number' ? v.toLocaleString() : v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {c.result?.summary && (
              <div className="t-small" style={{ color: 'var(--text-1)', lineHeight: 1.6, padding: '8px 11px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', borderLeft: '2px solid var(--gold)' }}>
                {c.result.summary}
              </div>
            )}
          </>
        )}

        {/* 命中语义层字段 */}
        {c.semanticRefs.length > 0 && (
          <div className="row gap-2 wrap">
            <span className="label" style={{ marginRight: 2 }}><Layers size={11} style={{ marginRight: 3, verticalAlign: '-1px' }} />命中语义层</span>
            {c.semanticRefs.map(r => (
              <span key={r.field} className={`sem-pill ${r.kind === 'measure' ? 'measure' : r.kind === 'entity' ? 'entity' : 'dim'}`}>{r.entity}.{r.field}</span>
            ))}
          </div>
        )}

        {/* SQL 透明块 */}
        <div>
          <button className="btn btn-subtle btn-sm" onClick={onToggleSql}>
            <Code2 size={13} />{sqlOpen ? '收起 SQL' : '查看生成的 SQL'}{sqlOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {sqlOpen && <div style={{ marginTop: 8 }}><SqlBlock sql={c.sql} /></div>}
        </div>

        {/* 追问 + 动作 */}
        <div className="row spread wrap gap-2" style={{ paddingTop: 6, borderTop: '1px solid var(--hairline)' }}>
          <div className="row gap-2 wrap">
            {c.followups?.map(f => (
              <button key={f} className="tag" style={{ cursor: 'pointer', color: 'var(--gold)', borderColor: 'var(--hairline-strong)' }} onClick={onRerun}>
                <CornerDownRight size={11} style={{ marginRight: 3 }} />{f}
              </button>
            ))}
          </div>
          {!refused && (
            <div className="row gap-2">
              <button className="btn btn-subtle btn-sm" onClick={onRerun}><RotateCcw size={12} />复跑</button>
              <button className={`btn btn-sm ${c.pinned ? 'btn-ok' : 'btn-subtle'}`} onClick={onPin}><Pin size={12} />{c.pinned ? '已 Pin' : 'Pin 看板'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
