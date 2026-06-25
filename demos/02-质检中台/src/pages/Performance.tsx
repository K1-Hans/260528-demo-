// ════════════════════════════════════════════════════════════════════════
// AI 质检中台 · 坐席绩效排行 + 雷达（§5.6）
// 坐席合规/服务画像，定向辅导。
// ════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { Trophy, Radar, TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, PageHeader, StatCard, Sparkline, SectionTitle } from '../components/ui';
import { DataTable, Pagination } from '../components/DataTable';
import type { Col } from '../components/DataTable';
import { StatusBadge, Toolbar } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar, DRAW } from '../lib/chartTheme';
import { fmt } from '../lib/hooks';
import type { AgentPerf } from '../types';

// ─── 本页 mock 数据（≥12 坐席，真实消金质检场景）────────────────────────────
const MOCK_AGENTS: AgentPerf[] = [
  {
    id: 'a01', name: '赵越', team: '客服一部',
    complianceScore: 97.8, serviceScore: 95.2, appealSuccess: 80, inspected: 312,
    trend: [91, 93, 94, 95, 96, 97, 97.8],
    radar: { compliance: 98, empathy: 92, resolve: 95, norm: 97, efficiency: 96 },
  },
  {
    id: 'a02', name: '孙琪', team: '客服二部',
    complianceScore: 96.3, serviceScore: 94.1, appealSuccess: 75, inspected: 278,
    trend: [89, 91, 92, 93, 95, 96, 96.3],
    radar: { compliance: 96, empathy: 95, resolve: 92, norm: 94, efficiency: 91 },
  },
  {
    id: 'a03', name: '李航', team: '客服一部',
    complianceScore: 95.1, serviceScore: 93.8, appealSuccess: 66, inspected: 295,
    trend: [88, 90, 91, 92, 94, 94, 95.1],
    radar: { compliance: 95, empathy: 88, resolve: 93, norm: 95, efficiency: 93 },
  },
  {
    id: 'a04', name: '林婉清', team: '催收部',
    complianceScore: 94.7, serviceScore: 91.5, appealSuccess: 72, inspected: 241,
    trend: [87, 89, 90, 91, 93, 94, 94.7],
    radar: { compliance: 95, empathy: 86, resolve: 91, norm: 96, efficiency: 88 },
  },
  {
    id: 'a05', name: '陈思远', team: '客服二部',
    complianceScore: 93.5, serviceScore: 92.0, appealSuccess: 60, inspected: 263,
    trend: [85, 86, 88, 90, 91, 92, 93.5],
    radar: { compliance: 94, empathy: 90, resolve: 90, norm: 92, efficiency: 90 },
  },
  {
    id: 'a06', name: '王佳慧', team: '客服一部',
    complianceScore: 92.1, serviceScore: 90.3, appealSuccess: 55, inspected: 287,
    trend: [82, 84, 85, 88, 89, 91, 92.1],
    radar: { compliance: 92, empathy: 89, resolve: 88, norm: 91, efficiency: 87 },
  },
  {
    id: 'a07', name: '刘浩然', team: '催收部',
    complianceScore: 89.6, serviceScore: 88.2, appealSuccess: 50, inspected: 198,
    trend: [80, 82, 83, 86, 87, 88, 89.6],
    radar: { compliance: 90, empathy: 82, resolve: 87, norm: 90, efficiency: 85 },
  },
  {
    id: 'a08', name: '张雯', team: '客服三部',
    complianceScore: 88.4, serviceScore: 87.5, appealSuccess: 44, inspected: 215,
    trend: [79, 80, 82, 84, 86, 87, 88.4],
    radar: { compliance: 88, empathy: 87, resolve: 85, norm: 88, efficiency: 83 },
  },
  {
    id: 'a09', name: '周文博', team: '客服三部',
    complianceScore: 86.9, serviceScore: 85.1, appealSuccess: 40, inspected: 204,
    trend: [76, 78, 80, 82, 84, 85, 86.9],
    radar: { compliance: 87, empathy: 83, resolve: 84, norm: 87, efficiency: 81 },
  },
  {
    id: 'a10', name: '吴梦洁', team: '催收部',
    complianceScore: 84.3, serviceScore: 83.7, appealSuccess: 36, inspected: 189,
    trend: [73, 75, 77, 79, 81, 83, 84.3],
    radar: { compliance: 84, empathy: 80, resolve: 82, norm: 85, efficiency: 80 },
  },
  {
    id: 'a11', name: '蒋晓峰', team: '客服三部',
    complianceScore: 81.7, serviceScore: 80.9, appealSuccess: 30, inspected: 175,
    trend: [70, 72, 74, 76, 78, 80, 81.7],
    radar: { compliance: 82, empathy: 78, resolve: 79, norm: 82, efficiency: 78 },
  },
  {
    id: 'a12', name: '赵嘉怡', team: '客服二部',
    complianceScore: 78.5, serviceScore: 77.2, appealSuccess: 25, inspected: 162,
    trend: [65, 68, 70, 72, 74, 76, 78.5],
    radar: { compliance: 79, empathy: 75, resolve: 76, norm: 79, efficiency: 75 },
  },
  {
    id: 'a13', name: '黄天明', team: '催收部',
    complianceScore: 74.2, serviceScore: 73.8, appealSuccess: 20, inspected: 148,
    trend: [60, 63, 65, 68, 70, 72, 74.2],
    radar: { compliance: 74, empathy: 70, resolve: 72, norm: 75, efficiency: 72 },
  },
  {
    id: 'a14', name: '林成', team: '客服一部',
    complianceScore: 71.0, serviceScore: 70.5, appealSuccess: 15, inspected: 135,
    trend: [58, 60, 62, 65, 67, 69, 71.0],
    radar: { compliance: 71, empathy: 68, resolve: 70, norm: 72, efficiency: 70 },
  },
];

const PAGE_SIZE = 8;

const TEAMS = ['全部团队', '客服一部', '客服二部', '客服三部', '催收部'];

// 合规分阈值色
function scoreColor(s: number): string {
  if (s >= 95) return 'var(--success)';
  if (s >= 85) return 'var(--gold)';
  if (s >= 75) return 'var(--warning)';
  return 'var(--danger)';
}

function scoreTone(s: number): 'good' | 'warn' | 'bad' | 'info' {
  if (s >= 95) return 'good';
  if (s >= 85) return 'info';
  if (s >= 75) return 'warn';
  return 'bad';
}

export default function Performance() {
  const [page, setPage] = useState(1);
  const [team, setTeam] = useState('全部团队');
  const [selectedIds, setSelectedIds] = useState<string[]>(['a01']);

  // 筛选 + 分页
  const filtered = useMemo(
    () => MOCK_AGENTS.filter(a => team === '全部团队' || a.team === team),
    [team],
  );
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  // 选中坐席（支持 1–3 名叠加）
  const selectedAgents = useMemo(
    () => MOCK_AGENTS.filter(a => selectedIds.includes(a.id)),
    [selectedIds],
  );

  const toggleSelect = (row: AgentPerf) => {
    setSelectedIds(prev => {
      if (prev.includes(row.id)) return prev.filter(id => id !== row.id);
      if (prev.length >= 3) return [...prev.slice(1), row.id]; // 超过 3 个，滑动窗口
      return [...prev, row.id];
    });
  };

  // ── KPI 汇总
  const avgCompliance = useMemo(
    () => MOCK_AGENTS.reduce((s, a) => s + a.complianceScore, 0) / MOCK_AGENTS.length,
    [],
  );
  const needCoach = useMemo(
    () => MOCK_AGENTS.filter(a => a.complianceScore < 85).length,
    [],
  );
  const avgAppealSuccess = useMemo(
    () => MOCK_AGENTS.reduce((s, a) => s + a.appealSuccess, 0) / MOCK_AGENTS.length,
    [],
  );

  // ── 雷达图 option
  const radarOpt = useMemo(() => () => {
    const DIMS = ['合规', '共情', '解决', '规范', '效率'];
    const palette = [cssVar('--gold'), cssVar('--success'), cssVar('--warning')];
    const series = selectedAgents.map((a, i) => ({
      name: a.name,
      type: 'radar',
      data: [{
        value: [a.radar.compliance, a.radar.empathy, a.radar.resolve, a.radar.norm, a.radar.efficiency],
        name: a.name,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: palette[i] ?? cssVar('--c3') },
        itemStyle: { color: palette[i] ?? cssVar('--c3') },
        areaStyle: { color: `color-mix(in srgb, ${palette[i] ?? cssVar('--c3')} 15%, transparent)` },
      }],
      ...DRAW,
    }));

    return {
      ...baseOption(),
      legend: {
        data: selectedAgents.map(a => a.name),
        textStyle: { color: cssVar('--text-2'), fontSize: 12 },
        top: 4,
        right: 12,
      },
      radar: {
        indicator: DIMS.map(name => ({ name, max: 100 })),
        center: ['50%', '54%'],
        radius: '66%',
        shape: 'polygon',
        splitNumber: 4,
        splitLine: { lineStyle: { color: cssVar('--hairline'), type: 'dashed' } },
        splitArea: { show: false },
        axisName: {
          color: cssVar('--text-2'),
          fontSize: 12,
          fontFamily: "'Geist','PingFang SC',sans-serif",
        },
        axisLine: { lineStyle: { color: cssVar('--hairline') } },
      },
      tooltip: {
        ...(baseOption().tooltip as object),
        trigger: 'item',
      },
      series,
    };
  }, [selectedAgents]);

  // ── 团队合规分分布柱图
  const teamBarOpt = useMemo(() => () => {
    const TEAM_NAMES = ['客服一部', '客服二部', '客服三部', '催收部'];
    const avgs = TEAM_NAMES.map(t => {
      const members = MOCK_AGENTS.filter(a => a.team === t);
      return +(members.reduce((s, a) => s + a.complianceScore, 0) / members.length).toFixed(1);
    });
    const colors = avgs.map(v => scoreColor(v));
    return {
      ...baseOption(),
      tooltip: { ...(baseOption().tooltip as object), trigger: 'axis' },
      xAxis: { type: 'category', data: TEAM_NAMES, ...axisStyle() },
      yAxis: {
        type: 'value',
        min: 60,
        max: 100,
        ...axisStyle(),
        axisLabel: {
          ...(axisStyle().axisLabel as object),
          formatter: (v: number) => `${v}`,
        },
      },
      series: [{
        type: 'bar',
        name: '平均合规分',
        data: avgs.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] } })),
        barMaxWidth: 52,
        label: {
          show: true,
          position: 'top',
          color: cssVar('--text-2'),
          fontSize: 12,
          fontFamily: "'Geist','PingFang SC',sans-serif",
          formatter: (p: { value: number }) => `${p.value}`,
        },
        ...DRAW,
      }],
    };
  }, []);

  // ── DataTable 列定义
  const cols: Col<AgentPerf>[] = [
    {
      key: 'rank',
      header: '排名',
      width: 56,
      align: 'center',
      render: (_row, i) => {
        const rank = (page - 1) * PAGE_SIZE + i + 1;
        const color = rank === 1 ? 'var(--gold)' : rank === 2 ? 'var(--text-2)' : rank === 3 ? 'var(--warning)' : 'var(--text-3)';
        return <span className="mono tnum" style={{ color, fontWeight: rank <= 3 ? 700 : 400 }}>{rank}</span>;
      },
    },
    {
      key: 'name',
      header: '坐席',
      render: (row) => (
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <div className="avatar" style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `color-mix(in srgb, ${scoreColor(row.complianceScore)} 18%, var(--surface-3))`,
            color: scoreColor(row.complianceScore),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>{row.name[0]}</div>
          <span style={{ fontWeight: 500 }}>{row.name}</span>
        </div>
      ),
    },
    {
      key: 'team',
      header: '团队',
      render: (row) => <span className="text-3" style={{ fontSize: 13 }}>{row.team}</span>,
    },
    {
      key: 'complianceScore',
      header: '合规分',
      num: true,
      sortable: true,
      sortAccessor: (r) => r.complianceScore,
      render: (row) => (
        <span className="mono tnum" style={{ color: scoreColor(row.complianceScore), fontWeight: 600 }}>
          {row.complianceScore.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'serviceScore',
      header: '服务分',
      num: true,
      sortable: true,
      sortAccessor: (r) => r.serviceScore,
      render: (row) => (
        <span className="mono tnum" style={{ fontWeight: 500 }}>
          {row.serviceScore.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'appealSuccess',
      header: '申诉成功率',
      num: true,
      sortable: true,
      sortAccessor: (r) => r.appealSuccess,
      render: (row) => (
        <span className="mono tnum">{row.appealSuccess}<span className="text-3" style={{ fontWeight: 400 }}>%</span></span>
      ),
    },
    {
      key: 'inspected',
      header: '质检量',
      num: true,
      sortable: true,
      sortAccessor: (r) => r.inspected,
      render: (row) => <span className="mono tnum">{fmt(row.inspected)}</span>,
    },
    {
      key: 'trend',
      header: '趋势',
      width: 100,
      render: (row) => (
        <Sparkline
          data={row.trend}
          color={row.trend[row.trend.length - 1] >= row.trend[0] ? 'var(--emerald)' : 'var(--danger)'}
          width={80}
          height={28}
        />
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row) => (
        <StatusBadge
          status={row.complianceScore >= 85 ? '达标' : '需辅导'}
          tone={scoreTone(row.complianceScore) === 'good' || scoreTone(row.complianceScore) === 'info' ? 'good' : 'warn'}
        />
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="坐席绩效排行"
        subtitle="坐席合规 / 服务画像 · 定向辅导 · 数据来源：全量 AI 质检结果（每日更新）"
        actions={
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => { /* 导出占位 */ }}>
              <TrendingUp size={14} />
              导出报告
            </button>
          </div>
        }
      />

      {/* ── KPI 带 ─────────────────────────────────────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard
          label="坐席总数"
          raw={MOCK_AGENTS.length}
          unit="人"
          change={2}
          icon={<Users size={16} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="团队平均合规分"
          raw={avgCompliance}
          unit=""
          decimals={1}
          change={1.2}
          spark={[85, 86, 87, 87.5, 88, 88.5, avgCompliance]}
          icon={<CheckCircle size={16} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="申诉成功率"
          raw={avgAppealSuccess}
          unit="%"
          decimals={1}
          change={-0.5}
          icon={<Radar size={16} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="待辅导人数"
          raw={needCoach}
          unit="人"
          change={-1}
          spark={[5, 5, 4, 4, 3, 4, needCoach]}
          icon={<AlertCircle size={16} />}
          delayClass="reveal-4"
        />
      </div>

      {/* ── 主体：排行表 + 雷达并排 ─────────────────────────────────────── */}
      <div className="row gap-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* 左：排行 DataTable */}
        <div className="card" style={{ flex: '1 1 560px', minWidth: 0 }}>
          <div style={{ padding: '16px 16px 0' }}>
            <SectionTitle right={
              <div className="row gap-2">
                <Trophy size={14} style={{ color: 'var(--gold)' }} />
                <span className="text-3" style={{ fontSize: 12 }}>点行选中对比</span>
              </div>
            }>
              坐席排行榜
            </SectionTitle>

            {/* 筛选 */}
            <Toolbar>
              <select
                className="input"
                value={team}
                style={{ minWidth: 120, fontSize: 13 }}
                onChange={e => { setTeam(e.target.value); setPage(1); }}
              >
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span className="text-3 t-small" style={{ marginLeft: 4 }}>
                共 <span className="tnum">{filtered.length}</span> 名坐席
                {selectedIds.length > 0 && (
                  <span style={{ marginLeft: 8, color: 'var(--gold)' }}>
                    · 已选 {selectedIds.length} 名（最多 3）
                  </span>
                )}
              </span>
            </Toolbar>
          </div>

          <DataTable<AgentPerf>
            cols={cols}
            rows={paged}
            rowKey={(r) => r.id}
            onRow={toggleSelect}
            rowClass={(r) => selectedIds.includes(r.id) ? 'row-selected' : ''}
            defaultSort={{ key: 'complianceScore', dir: 'desc' }}
            dense
          />

          <div style={{ padding: '0 16px 12px' }}>
            <Pagination
              page={page}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </div>
        </div>

        {/* 右：雷达 + 团队分布 */}
        <div className="col gap-4" style={{ flex: '1 1 320px', minWidth: 0 }}>

          {/* 五维雷达 */}
          <div className="card">
            <div style={{ padding: '16px 16px 8px' }}>
              <SectionTitle right={
                <span className="text-3 t-small">
                  <Radar size={13} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 4 }} />
                  五维能力对比
                </span>
              }>
                坐席能力雷达
              </SectionTitle>
              {selectedAgents.length === 0 && (
                <p className="text-3 t-small" style={{ marginTop: 4 }}>点击左侧行选中 1–3 名坐席进行叠加对比</p>
              )}
            </div>

            {selectedAgents.length > 0 ? (
              <Chart
                build={radarOpt}
                height={300}
                deps={[selectedIds]}
              />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                <div className="col" style={{ alignItems: 'center', gap: 8 }}>
                  <Radar size={32} style={{ opacity: 0.3 }} />
                  <span className="t-small">请在左侧排行表选中坐席</span>
                </div>
              </div>
            )}

            {/* 图例 & 数值详情 */}
            {selectedAgents.length > 0 && (
              <div style={{ padding: '0 16px 16px' }}>
                <div className="divider" style={{ marginBottom: 12 }} />
                {selectedAgents.map((a, i) => {
                  const palette = ['var(--gold)', 'var(--success)', 'var(--warning)'];
                  const c = palette[i] ?? 'var(--c3)';
                  const dims: [string, keyof typeof a.radar][] = [
                    ['合规', 'compliance'],
                    ['共情', 'empathy'],
                    ['解决', 'resolve'],
                    ['规范', 'norm'],
                    ['效率', 'efficiency'],
                  ];
                  return (
                    <div key={a.id} style={{ marginBottom: i < selectedAgents.length - 1 ? 12 : 0 }}>
                      <div className="row gap-2" style={{ marginBottom: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</span>
                        <span className="text-3 t-small">· {a.team}</span>
                      </div>
                      <div className="row gap-3 wrap" style={{ paddingLeft: 14 }}>
                        {dims.map(([label, key]) => (
                          <div key={key} className="col" style={{ gap: 2, minWidth: 52 }}>
                            <span className="text-3" style={{ fontSize: 11 }}>{label}</span>
                            <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: c }}>
                              {a.radar[key]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 团队合规分布柱图 */}
          <Card className="reveal-4">
            <div style={{ padding: '16px 16px 8px' }}>
              <SectionTitle>团队平均合规分</SectionTitle>
            </div>
            <Chart build={teamBarOpt} height={200} />
            <div style={{ padding: '4px 16px 12px' }}>
              <div className="row gap-3 wrap">
                {[
                  { label: '≥95 优秀', color: 'var(--success)' },
                  { label: '85–95 达标', color: 'var(--gold)' },
                  { label: '75–85 关注', color: 'var(--warning)' },
                  { label: '<75 辅导', color: 'var(--danger)' },
                ].map(item => (
                  <div key={item.label} className="row gap-1" style={{ fontSize: 11, color: 'var(--text-3)', alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── 待辅导预警卡 ─────────────────────────────────────────────────── */}
      {needCoach > 0 && (
        <div className="card reveal" style={{ marginTop: 16, borderLeft: '3px solid var(--warning)' }}>
          <div style={{ padding: '14px 18px' }}>
            <div className="row gap-2 spread">
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <AlertCircle size={15} style={{ color: 'var(--warning)' }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>待辅导坐席</span>
                <span className="badge" style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--warning)' }}>
                  {needCoach} 名合规分低于 85 分
                </span>
              </div>
              <button className="btn btn-subtle btn-sm">安排辅导计划</button>
            </div>
            <div className="row gap-3 wrap" style={{ marginTop: 12 }}>
              {MOCK_AGENTS.filter(a => a.complianceScore < 85).map(a => (
                <div key={a.id} className="row gap-2" style={{
                  padding: '8px 12px',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--hairline)',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'color-mix(in srgb, var(--warning) 16%, var(--surface-3))',
                    color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>{a.name[0]}</div>
                  <div className="col" style={{ gap: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                    <span className="text-3 t-small">{a.team}</span>
                  </div>
                  <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: scoreColor(a.complianceScore), marginLeft: 8 }}>
                    {a.complianceScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
