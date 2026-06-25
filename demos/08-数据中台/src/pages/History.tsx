import { useMemo, useState } from 'react';
import { Clock, BarChart3, Shield, RotateCcw, TrendingDown, History as HistoryIcon } from 'lucide-react';
import { PageHeader, Segmented, SectionTitle, EmptyState } from '../components/ui';
import { ConfidenceChip, Panel } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cssVar, sem, DRAW } from '../lib/chartTheme';
import { QUERY_HISTORY } from '../lib/mockData';
import { CONFIDENCE_LABEL, type Confidence } from '../types';

// ─── Derived stats from QUERY_HISTORY ────────────────────────────────────────
function useHistoryStats() {
  return useMemo(() => {
    const total = QUERY_HISTORY.length;
    const todayCount = QUERY_HISTORY.filter(r => r.at.startsWith('今天')).length;
    const covered = QUERY_HISTORY.filter(r => r.confidence === 'covered').length;
    const coveredPct = total > 0 ? Math.round((covered / total) * 100) : 0;
    const avgMs = total > 0 ? Math.round(QUERY_HISTORY.reduce((s, r) => s + r.elapsedMs, 0) / total) : 0;
    const refusedCount = QUERY_HISTORY.filter(r => r.confidence === 'refused').length;

    const confCounts: Record<Confidence, number> = { covered: 0, partial: 0, out: 0, refused: 0 };
    QUERY_HISTORY.forEach(r => { confCounts[r.confidence]++; });

    const topRerun = [...QUERY_HISTORY]
      .filter(r => r.rerun > 0)
      .sort((a, b) => b.rerun - a.rerun)
      .slice(0, 6);

    return { todayCount, coveredPct, avgMs, refusedCount, confCounts, topRerun };
  }, []);
}

// ─── Confidence filter options ────────────────────────────────────────────────
type FilterKey = 'all' | Confidence;
const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'covered', label: '已覆盖' },
  { value: 'partial', label: '部分覆盖' },
  { value: 'out', label: '超范围' },
  { value: 'refused', label: '拒答' },
];

// ─── KPI Card (local minimal) ─────────────────────────────────────────────────
function KpiCard({
  label, value, unit, sub, icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div className="row spread" style={{ marginBottom: 10 }}>
        <span className="label">{label}</span>
        <span style={{ color: 'var(--gold)', opacity: 0.72 }}>{icon}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="kpi-value mononum">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {sub && <div className="t-small text-3" style={{ marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function History() {
  const stats = useHistoryStats();
  const [filter, setFilter] = useState<FilterKey>('all');

  const filteredRows = useMemo(
    () => filter === 'all' ? QUERY_HISTORY : QUERY_HISTORY.filter(r => r.confidence === filter),
    [filter],
  );

  return (
    <div className="page page-wide">
      <PageHeader
        title="查询历史"
        subtitle="历史问数记录 · 可信度分布 · 高频复跑 top 榜 · 一键复用"
        actions={
          <span className="tag tag-mono">
            <Clock size={12} style={{ marginRight: 4 }} />
            {QUERY_HISTORY.length} 条历史
          </span>
        }
      />

      {/* ── KPI 行 ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KpiCard
          label="今日查询数"
          value={stats.todayCount}
          unit="条"
          sub="当日新增问数记录"
          icon={<HistoryIcon size={15} />}
        />
        <KpiCard
          label="已覆盖语义层占比"
          value={`${stats.coveredPct}`}
          unit="%"
          sub="命中受治理语义层"
          icon={<Shield size={15} />}
        />
        <KpiCard
          label="平均耗时"
          value={stats.avgMs.toLocaleString()}
          unit="ms"
          sub="含语义解析 + SQL 执行"
          icon={<Clock size={15} />}
        />
        <KpiCard
          label="拒答数"
          value={stats.refusedCount}
          unit="条"
          sub="命中治理策略 / 超范围拒答"
          icon={<TrendingDown size={15} />}
        />
      </div>

      {/* ── 主体 + 右侧副图 ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, alignItems: 'start' }}>

        {/* 左：历史问数表 */}
        <div>
          <div className="row spread" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <SectionTitle>
              历史问数 · {filteredRows.length} 条
            </SectionTitle>
            <Segmented<FilterKey>
              options={FILTER_OPTIONS}
              value={filter}
              onChange={setFilter}
            />
          </div>

          {filteredRows.length === 0 ? (
            <EmptyState
              icon={<HistoryIcon size={40} />}
              title="暂无匹配记录"
              desc="调整可信度筛选器查看其他记录"
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>问题</th>
                    <th style={{ textAlign: 'left' }}>用户</th>
                    <th style={{ textAlign: 'left' }}>角色</th>
                    <th style={{ textAlign: 'left' }}>时间</th>
                    <th style={{ textAlign: 'left' }}>可信度</th>
                    <th style={{ textAlign: 'right' }}>行数</th>
                    <th style={{ textAlign: 'right' }}>耗时 ms</th>
                    <th style={{ textAlign: 'right' }}>复跑</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => (
                    <tr key={row.id}>
                      <td
                        style={{
                          maxWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                          color: 'var(--text-1)',
                        }}
                        title={row.question}
                      >
                        {row.question}
                      </td>
                      <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{row.user}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 0 }}>{row.role}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap' }}>{row.at}</td>
                      <td>
                        <ConfidenceChip level={row.confidence} />
                      </td>
                      <td className="td-num mononum">{row.rows.toLocaleString()}</td>
                      <td className="td-num mononum">{row.elapsedMs.toLocaleString()}</td>
                      <td className="td-num mononum">
                        <span
                          style={{
                            color: row.rerun >= 10 ? 'var(--gold)' : row.rerun >= 5 ? 'var(--text-2)' : 'var(--text-3)',
                            fontWeight: row.rerun >= 10 ? 700 : 400,
                          }}
                        >
                          {row.rerun}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 右：副图面板 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 可信度分布环形饼 */}
          <Panel
            title="可信度分布"
            icon={<BarChart3 size={13} />}
            bodyClass=""
          >
            <div style={{ padding: '0 12px 12px' }}>
              <Chart
                height={210}
                deps={[stats.confCounts.covered, stats.confCounts.partial, stats.confCounts.out, stats.confCounts.refused]}
                build={() => {
                  const coveredColor = cssVar('--conf-covered');
                  const partialColor = cssVar('--conf-partial');
                  const outColor = cssVar('--conf-out');
                  const refusedColor = cssVar('--conf-refused');
                  return {
                    ...baseOption(),
                    backgroundColor: 'transparent',
                    legend: {
                      orient: 'vertical',
                      right: 0,
                      top: 'middle',
                      textStyle: {
                        color: cssVar('--text-2'),
                        fontSize: 11,
                        fontFamily: "'Geist','PingFang SC',sans-serif",
                      },
                      itemWidth: 10,
                      itemHeight: 10,
                      icon: 'circle',
                    },
                    series: [
                      {
                        type: 'pie',
                        radius: ['46%', '72%'],
                        center: ['35%', '50%'],
                        itemStyle: { borderRadius: 4, borderWidth: 2, borderColor: cssVar('--surface-1') },
                        label: { show: false },
                        labelLine: { show: false },
                        emphasis: {
                          label: { show: true, fontSize: 13, fontWeight: 700, color: cssVar('--text-1') },
                        },
                        data: [
                          { value: stats.confCounts.covered, name: CONFIDENCE_LABEL.covered, itemStyle: { color: coveredColor } },
                          { value: stats.confCounts.partial, name: CONFIDENCE_LABEL.partial, itemStyle: { color: partialColor } },
                          { value: stats.confCounts.out, name: CONFIDENCE_LABEL.out, itemStyle: { color: outColor } },
                          { value: stats.confCounts.refused, name: CONFIDENCE_LABEL.refused, itemStyle: { color: refusedColor } },
                        ],
                        ...DRAW,
                      },
                    ],
                  };
                }}
              />
              {/* 图例小结 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '4px 8px',
                  marginTop: 4,
                  paddingTop: 8,
                  borderTop: '1px solid var(--hairline)',
                }}
              >
                {(
                  [
                    ['covered', stats.confCounts.covered],
                    ['partial', stats.confCounts.partial],
                    ['out', stats.confCounts.out],
                    ['refused', stats.confCounts.refused],
                  ] as [Confidence, number][]
                ).map(([level, count]) => (
                  <div key={level} className="row gap-1" style={{ alignItems: 'center', fontSize: 11 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: `var(--conf-${level})`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {level === 'covered' ? '已覆盖' : level === 'partial' ? '部分覆盖' : level === 'out' ? '超范围' : '拒答'}
                    </span>
                    <span className="mononum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* 高频复跑 top 榜 */}
          <Panel
            title="高频复跑 top 榜"
            icon={<RotateCcw size={13} />}
            bodyClass=""
          >
            <div style={{ padding: '0 12px 12px' }}>
              <Chart
                height={190}
                deps={[stats.topRerun.length]}
                build={() => {
                  const ax = axisStyle();
                  const data = stats.topRerun;
                  const maxRerun = Math.max(...data.map(d => d.rerun), 1);
                  return {
                    ...baseOption(),
                    backgroundColor: 'transparent',
                    grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
                    xAxis: {
                      type: 'value',
                      max: maxRerun,
                      ...ax,
                      splitLine: { lineStyle: { color: cssVar('--hairline'), type: 'dashed' } },
                    },
                    yAxis: {
                      type: 'category',
                      data: data.map(d => d.question.length > 10 ? d.question.slice(0, 10) + '…' : d.question),
                      inverse: true,
                      ...ax,
                      axisLabel: {
                        ...ax.axisLabel,
                        fontSize: 10,
                        width: 90,
                        overflow: 'truncate',
                      },
                    },
                    series: [
                      {
                        type: 'bar',
                        barMaxWidth: 14,
                        itemStyle: {
                          color: accent(),
                          borderRadius: [0, 4, 4, 0],
                        },
                        label: {
                          show: true,
                          position: 'right',
                          color: cssVar('--text-3'),
                          fontSize: 10,
                          fontFamily: "'Geist Mono','Geist',sans-serif",
                          formatter: '{c}',
                        },
                        data: data.map(d => ({
                          value: d.rerun,
                          itemStyle: {
                            color: d.confidence === 'covered'
                              ? accent()
                              : d.confidence === 'partial'
                                ? sem('restricted')
                                : cssVar('--conf-out'),
                          },
                        })),
                        ...DRAW,
                      },
                    ],
                  };
                }}
              />
              <div className="t-small text-3" style={{ marginTop: 6, lineHeight: 1.5 }}>
                按被复跑次数降序排列。颜色 = 可信度：蓝=已覆盖 / 琥珀=部分 / 灰=超范围
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
