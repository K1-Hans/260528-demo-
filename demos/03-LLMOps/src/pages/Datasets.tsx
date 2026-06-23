import { useState, useRef, useEffect } from 'react';
import {
  Database, FlaskConical, Star, BarChart3,
  Play, CheckCircle2, PlusCircle,
} from 'lucide-react';
import { PageHeader, Card, StatCard, SectionTitle, Badge, EmptyState, ProgressBar } from '../components/ui';
import { StatusBadge, toast } from '../components/kit';
import { DataTable, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, sem, cssVar, areaGradient, DRAW } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { DATASETS, EVAL_CASES, appName } from '../lib/mockData';
import type { Dataset, EvalCase, DatasetSource } from '../types';

// ─── 来源 tone 映射 ────────────────────────────────────────────────────────────
const SOURCE_TONE: Record<DatasetSource, 'info' | 'good' | 'muted'> = {
  '线上trace沉淀': 'info',
  '人工构造': 'good',
  '混合': 'muted',
};

// ─── KPI 计算 ─────────────────────────────────────────────────────────────────
const totalDatasets = DATASETS.length;
const totalCases = DATASETS.reduce((s, d) => s + d.cases, 0);
const totalGolden = DATASETS.reduce((s, d) => s + d.golden, 0);
const scored = DATASETS.filter(d => d.lastRunScore !== undefined);
const avgScore = scored.length
  ? scored.reduce((s, d) => s + (d.lastRunScore ?? 0), 0) / scored.length
  : 0;

// ─── 来源分布聚合 ─────────────────────────────────────────────────────────────
const sourceCounts: Record<string, number> = {};
for (const d of DATASETS) {
  sourceCounts[d.source] = (sourceCounts[d.source] ?? 0) + 1;
}
const pieData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));

// ─── ECharts builders ─────────────────────────────────────────────────────────
function buildSourcePie() {
  const colors = [cssVar('--c2'), accent(), cssVar('--c5')];
  return {
    ...baseOption(),
    tooltip: {
      ...(baseOption().tooltip as object),
      formatter: (p: { name: string; value: number; percent: number }) =>
        `<b>${p.name}</b><br/>数据集 ${p.value} 个 · ${p.percent}%`,
    },
    legend: {
      orient: 'vertical',
      right: 12,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: cssVar('--text-2'), fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['44%', '68%'],
        center: ['36%', '50%'],
        data: pieData.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: colors[i % colors.length], borderRadius: 4 },
        })),
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.4)' },
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 700,
            color: cssVar('--text-1'),
          },
        },
        ...DRAW,
      },
    ],
  };
}

function buildScoreBar(datasets: Dataset[]) {
  const names = datasets.map(d => d.name);
  const scores = datasets.map(d => d.lastRunScore ?? null);
  const warnColor = sem('warn');
  const okColor = accent();
  return {
    ...baseOption(),
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...(baseOption().tooltip as object),
      formatter: (p: { name: string; value: number | null }) =>
        p.value === null
          ? `${p.name}<br/>暂无评测`
          : `<b>${p.name}</b><br/>最近跑分 <b>${(p.value as number).toFixed(2)}</b>`,
    },
    xAxis: {
      type: 'value',
      min: 0.7,
      max: 1,
      ...axisStyle(),
      axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => v.toFixed(2) },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: names,
      ...axisStyle(),
      axisLabel: {
        ...axisStyle().axisLabel,
        width: 100,
        overflow: 'truncate',
        fontSize: 11,
      },
    },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        data: scores.map(s => ({
          value: s,
          itemStyle: {
            color: s !== null && s < 0.85 ? warnColor : okColor,
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (p: { value: number | null }) =>
            p.value !== null ? (p.value as number).toFixed(2) : '—',
          color: cssVar('--text-3'),
          fontSize: 10,
          fontFamily: 'Geist Mono, monospace',
        },
        areaStyle: { color: areaGradient(okColor, 0.2) },
        ...DRAW,
      },
    ],
  };
}

// ─── 评测进度 hook ────────────────────────────────────────────────────────────
function useEvalRunner() {
  const [pct, setPct] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (running) return;
    setPct(0);
    setDone(false);
    setRunning(true);
  };

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      setPct(p => {
        const next = p + Math.random() * 8 + 4;
        if (next >= 100) {
          clearInterval(timer.current!);
          setRunning(false);
          setDone(true);
          toast('评测完成 · 结果已写入评分看板', 'success');
          return 100;
        }
        return next;
      });
    }, 220);
    return () => clearInterval(timer.current!);
  }, [running]);

  const reset = () => {
    setPct(0);
    setDone(false);
    setRunning(false);
  };

  return { pct, running, done, start, reset };
}

// ─── 列定义 ──────────────────────────────────────────────────────────────────
const COLS: Col<Dataset>[] = [
  {
    key: 'name',
    header: '数据集',
    width: 190,
    render: (d) => (
      <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{d.name}</span>
    ),
  },
  {
    key: 'app',
    header: '应用',
    render: (d) => (
      <Badge color="var(--c2)">{appName(d.app)}</Badge>
    ),
  },
  {
    key: 'source',
    header: '来源',
    render: (d) => (
      <StatusBadge status={d.source} tone={SOURCE_TONE[d.source]} />
    ),
  },
  {
    key: 'cases',
    header: '用例数',
    num: true,
    sortable: true,
    sortAccessor: (d) => d.cases,
    render: (d) => <span className="mononum">{d.cases.toLocaleString('zh-CN')}</span>,
  },
  {
    key: 'golden',
    header: '黄金集',
    num: true,
    sortable: true,
    sortAccessor: (d) => d.golden,
    render: (d) => <span className="mononum">{d.golden.toLocaleString('zh-CN')}</span>,
  },
  {
    key: 'lastRunScore',
    header: '最近跑分',
    num: true,
    sortable: true,
    sortAccessor: (d) => d.lastRunScore ?? -1,
    render: (d) =>
      d.lastRunScore !== undefined ? (
        <span
          className="mononum"
          style={{
            color:
              d.lastRunScore < 0.85 ? 'var(--warning)' : 'var(--success)',
            fontWeight: 600,
          }}
        >
          {d.lastRunScore.toFixed(2)}
        </span>
      ) : (
        <span className="text-3">—</span>
      ),
  },
  {
    key: 'lastRunAt',
    header: '最近运行',
    nowrap: true,
    render: (d) => (
      <span className="t-small text-3">{d.lastRunAt ?? '—'}</span>
    ),
  },
];

// ─── 用例列定义 ──────────────────────────────────────────────────────────────
const CASE_COLS: Col<EvalCase>[] = [
  {
    key: 'input',
    header: '输入',
    width: '40%',
    render: (c) => (
      <span style={{ color: 'var(--text-1)', fontSize: 13 }}>{c.input}</span>
    ),
  },
  {
    key: 'expected',
    header: '期望输出',
    width: '40%',
    render: (c) => (
      <span className="t-small text-2">{c.expected ?? '—'}</span>
    ),
  },
  {
    key: 'tags',
    header: '标签',
    render: (c) => (
      <div className="row gap-1 wrap">
        {c.tags.map(t => (
          <Badge key={t} color="var(--c5)">{t}</Badge>
        ))}
      </div>
    ),
  },
];

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function Datasets() {
  const { hasPermission } = useAuth();
  const [selected, setSelected] = useState<Dataset | null>(DATASETS[0]);
  const { pct, running, done, start, reset } = useEvalRunner();

  const canEval = hasPermission('eval:write');

  return (
    <div className="page">
      <PageHeader
        title="Eval 数据集"
        subtitle="线上 trace 沉淀 + 人工构造 · 驱动离线评测与质量回归检测"
        actions={
          <button
            className="btn btn-subtle btn-sm row gap-1"
            onClick={() => toast('新建数据集功能即将上线', 'info')}
          >
            <PlusCircle size={14} />
            新建数据集
          </button>
        }
      />

      {/* ── KPI 条 ── */}
      <div
        className="grid grid-cols-auto"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 4 }}
      >
        <StatCard
          label="数据集总数"
          raw={totalDatasets}
          icon={<Database size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-1"
        />
        <StatCard
          label="总用例数"
          raw={totalCases}
          icon={<FlaskConical size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-2"
        />
        <StatCard
          label="黄金集用例"
          raw={totalGolden}
          icon={<Star size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-3"
        />
        <StatCard
          label="平均最近跑分"
          raw={avgScore}
          decimals={2}
          icon={<BarChart3 size={15} />}
          accentVar="var(--gold)"
          invertTrend={false}
          delayClass="reveal-4"
        />
      </div>

      {/* ── 主区：左 数据集列表 / 右 详情 ── */}
      <div
        className="grid grid-cols-auto"
        style={{ gridTemplateColumns: '1.35fr 1fr', gap: 14, marginTop: 14, alignItems: 'start' }}
      >
        {/* 左列：数据集表 + 图表 */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {/* 数据集列表 */}
          <Card className="reveal reveal-2">
            <SectionTitle>
              <span className="row gap-2">
                <Database size={13} />
                数据集列表
              </span>
            </SectionTitle>
            <DataTable<Dataset>
              cols={COLS}
              rows={DATASETS}
              rowKey={(d) => d.id}
              onRow={(d) => setSelected(d)}
              rowClass={(d) =>
                selected?.id === d.id ? 'row-selected' : ''
              }
              defaultSort={{ key: 'cases', dir: 'desc' }}
              dense
              empty={{ title: '暂无数据集', desc: '请先创建或接入数据集', icon: <Database size={32} /> }}
            />
          </Card>

          {/* 图表区 */}
          <div
            className="grid grid-cols-auto"
            style={{ gridTemplateColumns: '1fr 1.2fr', gap: 14 }}
          >
            {/* 来源分布饼图 */}
            <Card className="reveal reveal-3">
              <SectionTitle>
                <span className="row gap-2">
                  <BarChart3 size={13} />
                  数据集来源分布
                </span>
              </SectionTitle>
              <Chart
                build={buildSourcePie}
                height={200}
                deps={[]}
              />
            </Card>

            {/* 最近跑分对比柱 */}
            <Card className="reveal reveal-4">
              <SectionTitle>
                <span className="row gap-2">
                  <FlaskConical size={13} />
                  各数据集最近跑分
                </span>
              </SectionTitle>
              <Chart
                build={() => buildScoreBar(DATASETS)}
                height={200}
                deps={[]}
              />
              <div className="t-small text-3" style={{ marginTop: 6 }}>
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>■</span>{' '}
                分值低于 0.85 标橙色警示
              </div>
            </Card>
          </div>
        </div>

        {/* 右列：详情 */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {selected ? (
            <>
              {/* 数据集信息卡 */}
              <Card className="reveal reveal-2">
                <SectionTitle
                  right={
                    <button
                      className="btn btn-sm row gap-1"
                      style={{
                        background: canEval && !running ? 'var(--gold-glow)' : 'var(--surface-3)',
                        color: canEval && !running ? 'var(--gold)' : 'var(--text-3)',
                        border: `1px solid ${canEval && !running ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
                        cursor: canEval && !running ? 'pointer' : 'not-allowed',
                        opacity: canEval ? 1 : 0.45,
                      }}
                      disabled={!canEval || running}
                      onClick={canEval && !running ? (done ? reset : start) : undefined}
                      title={canEval ? undefined : '需要 eval:write 权限'}
                    >
                      {done ? (
                        <>
                          <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                          评测完成
                        </>
                      ) : (
                        <>
                          <Play size={13} />
                          {running ? '评测中…' : '运行评测'}
                        </>
                      )}
                    </button>
                  }
                >
                  <span className="row gap-2">
                    <FlaskConical size={13} />
                    数据集详情
                  </span>
                </SectionTitle>

                {/* 进度条（running 时展示） */}
                {(running || done) && (
                  <div style={{ marginBottom: 14 }}>
                    <div
                      className="row spread t-small text-3"
                      style={{ marginBottom: 6 }}
                    >
                      <span>{done ? '评测完成' : `评测进行中 · judge = gpt-4o`}</span>
                      <span className="mononum">{Math.round(pct)}%</span>
                    </div>
                    <ProgressBar
                      pct={pct}
                      color={done ? 'var(--success)' : 'var(--gold)'}
                      height={6}
                    />
                  </div>
                )}

                {/* 基础属性网格 */}
                <div
                  className="grid"
                  style={{ gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 4 }}
                >
                  {[
                    { label: '名称', val: selected.name },
                    { label: '应用', val: appName(selected.app) },
                    { label: '用例数', val: selected.cases.toLocaleString('zh-CN'), mono: true },
                    { label: '黄金集', val: selected.golden.toLocaleString('zh-CN'), mono: true },
                    {
                      label: '最近跑分',
                      val: selected.lastRunScore !== undefined
                        ? selected.lastRunScore.toFixed(2)
                        : '—',
                      mono: true,
                      warn: selected.lastRunScore !== undefined && selected.lastRunScore < 0.85,
                    },
                    { label: '最近运行', val: selected.lastRunAt ?? '—' },
                  ].map(({ label, val, mono, warn }) => (
                    <div key={label} className="col gap-1">
                      <span
                        className="t-small text-3"
                        style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10 }}
                      >
                        {label}
                      </span>
                      <span
                        className={mono ? 'mononum' : ''}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: warn ? 'var(--warning)' : 'var(--text-1)',
                        }}
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 来源徽章 */}
                <div className="row gap-2" style={{ marginTop: 10 }}>
                  <span className="t-small text-3">来源</span>
                  <StatusBadge
                    status={selected.source}
                    tone={SOURCE_TONE[selected.source]}
                  />
                </div>
              </Card>

              {/* 用例列表 */}
              <Card className="reveal reveal-3">
                <SectionTitle>
                  <span className="row gap-2">
                    <Star size={13} />
                    示例用例（{EVAL_CASES.length} 条）
                  </span>
                </SectionTitle>
                {EVAL_CASES.length > 0 ? (
                  <DataTable<EvalCase>
                    cols={CASE_COLS}
                    rows={EVAL_CASES}
                    rowKey={(c) => c.id}
                    dense
                    empty={{
                      title: '暂无用例',
                      desc: '该数据集尚未录入评测用例',
                      icon: <FlaskConical size={28} />,
                    }}
                  />
                ) : (
                  <EmptyState
                    icon={<FlaskConical size={32} />}
                    title="暂无用例"
                    desc="该数据集尚未录入评测用例"
                  />
                )}
              </Card>
            </>
          ) : (
            <Card className="reveal reveal-2">
              <EmptyState
                icon={<Database size={36} />}
                title="点击左侧数据集查看详情"
                desc="选中后可查看用例、运行评测"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
