import { useState } from 'react';
import {
  FlaskConical, Play, Trophy, TrendingDown, TrendingUp, Loader2,
  DollarSign, Timer, Gauge, CheckCircle2, Clock, PauseCircle,
} from 'lucide-react';
import { PageHeader, Card, StatCard, SectionTitle, Badge, Segmented } from '../components/ui';
import { StatusBadge } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cost, sem, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import {
  EXPERIMENTS, PLAYGROUND_INPUT, PLAYGROUND_RESULTS, appName,
} from '../lib/mockData';
import type { Experiment, PlaygroundResult } from '../types';

// ── 实验 status 元数据 ──────────────────────────────────────────────────────
const STATUS_META: Record<Experiment['status'], { tone: 'good' | 'warn' | 'muted'; label: string; Icon: React.ElementType }> = {
  running: { tone: 'good', label: '进行中', Icon: Clock },
  concluded: { tone: 'muted', label: '已结论', Icon: CheckCircle2 },
  paused: { tone: 'warn', label: '已暂停', Icon: PauseCircle },
};

// ── 指标三元组（score/cost/p95）比较辅助 ─────────────────────────────────────
type MetricKey = 'score' | 'cost' | 'p95';
function metricColor(exp: Experiment, key: MetricKey): { a: string; b: string } {
  const aVal = key === 'score' ? exp.scoreA : key === 'cost' ? exp.costA : exp.p95A;
  const bVal = key === 'score' ? exp.scoreB : key === 'cost' ? exp.costB : exp.p95B;
  // score 越高越好，cost/p95 越低越好
  const bBetter = key === 'score' ? bVal > aVal : bVal < aVal;
  const aBetter = key === 'score' ? aVal > bVal : aVal < bVal;
  return {
    a: aBetter ? cssVar('--emerald') : bBetter ? cssVar('--danger') : cssVar('--text-3'),
    b: bBetter ? cssVar('--emerald') : aBetter ? cssVar('--danger') : cssVar('--text-3'),
  };
}

function diffStr(a: number, b: number, _positive?: boolean): string {
  const d = b - a;
  const pct = a !== 0 ? ((d / a) * 100) : 0;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

// ── 实验卡 ──────────────────────────────────────────────────────────────────
function ExperimentCard({ exp, selected, onSelect }: {
  exp: Experiment; selected: boolean; onSelect: () => void;
}) {
  const meta = STATUS_META[exp.status];
  const scoreC = metricColor(exp, 'score');
  const costC = metricColor(exp, 'cost');
  const p95C = metricColor(exp, 'p95');

  return (
    <Card
      hover
      onClick={onSelect}
      className="reveal"
      style={{
        cursor: 'pointer',
        border: selected ? `1px solid ${cssVar('--emerald')}` : '1px solid var(--hairline)',
        transition: 'border-color 0.2s var(--ease)',
      }}
    >
      {/* 头部：名称 + status + app + 开始时间 */}
      <div className="spread" style={{ marginBottom: 12 }}>
        <div className="col gap-1">
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span style={{ fontWeight: 650, fontSize: 14, color: 'var(--text-1)' }}>{exp.name}</span>
            <StatusBadge status={meta.label} tone={meta.tone} />
          </div>
          <div className="row gap-2" style={{ marginTop: 2 }}>
            <span className="tag">{appName(exp.app)}</span>
            <span className="t-small text-3">始于 {exp.startedAt}</span>
          </div>
        </div>
        {exp.winner && (
          <div className="row gap-1" style={{ alignItems: 'center', color: 'var(--emerald)', fontSize: 12, fontWeight: 600 }}>
            <Trophy size={12} />
            <span className="mononum">{exp.winner === 'A' ? exp.armA : exp.armB} 胜</span>
          </div>
        )}
      </div>

      {/* A/B 流量分配 */}
      <div className="row gap-2" style={{ marginBottom: 12 }}>
        <div style={{ flex: exp.trafficA, background: `color-mix(in srgb, ${accent()} 20%, transparent)`, height: 5, borderRadius: 3 }} />
        <div style={{ flex: exp.trafficB, background: `color-mix(in srgb, var(--c2) 30%, transparent)`, height: 5, borderRadius: 3 }} />
      </div>
      <div className="row spread t-small text-3 mononum" style={{ marginBottom: 14, marginTop: -8 }}>
        <span>A({exp.armA}) {exp.trafficA}%</span>
        <span>B({exp.armB}) {exp.trafficB}%</span>
      </div>

      {/* 三指标并排 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {/* 评分 */}
        <div className="col gap-1" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8 }}>
          <div className="t-small text-3" style={{ marginBottom: 4 }}>评分</div>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="mononum" style={{ fontSize: 13, fontWeight: 600, color: scoreC.a }}>{exp.scoreA.toFixed(3)}</span>
            <span className="t-small text-3">/</span>
            <span className="mononum" style={{ fontSize: 13, fontWeight: 600, color: scoreC.b }}>{exp.scoreB.toFixed(3)}</span>
          </div>
          <div className="t-small mononum" style={{ color: 'var(--text-3)' }}>
            B {diffStr(exp.scoreA, exp.scoreB, true)}
          </div>
        </div>
        {/* 成本/千次 */}
        <div className="col gap-1" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8 }}>
          <div className="t-small text-3" style={{ marginBottom: 4 }}>成本/千次</div>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="mononum" style={{ fontSize: 13, fontWeight: 600, color: costC.a }}>${exp.costA.toFixed(2)}</span>
            <span className="t-small text-3">/</span>
            <span className="mononum" style={{ fontSize: 13, fontWeight: 600, color: costC.b }}>${exp.costB.toFixed(2)}</span>
          </div>
          <div className="t-small mononum" style={{ color: 'var(--text-3)' }}>
            B {diffStr(exp.costA, exp.costB, false)}
          </div>
        </div>
        {/* p95 */}
        <div className="col gap-1" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8 }}>
          <div className="t-small text-3" style={{ marginBottom: 4 }}>p95 延迟</div>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="mononum" style={{ fontSize: 13, fontWeight: 600, color: p95C.a }}>{exp.p95A}ms</span>
            <span className="t-small text-3">/</span>
            <span className="mononum" style={{ fontSize: 13, fontWeight: 600, color: p95C.b }}>{exp.p95B}ms</span>
          </div>
          <div className="t-small mononum" style={{ color: 'var(--text-3)' }}>
            B {diffStr(exp.p95A, exp.p95B, false)}
          </div>
        </div>
      </div>

      {/* 显著性 */}
      <div className="spread" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--hairline)' }}>
        <span className="t-small text-3">统计显著性</span>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="mononum" style={{ fontSize: 13, fontWeight: 600, color: exp.significance >= 0.95 ? cssVar('--emerald') : 'var(--text-2)' }}>
            {(exp.significance * 100).toFixed(0)}%
          </span>
          {exp.significance >= 0.95 && (
            <Badge color="var(--emerald)">显著</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Playground 输出卡 ─────────────────────────────────────────────────────────
function PlaygroundCard({ result, loading }: { result: PlaygroundResult; loading: boolean }) {
  const isA = result.arm === 'A';
  const accentC = isA ? accent() : cssVar('--c2');
  return (
    <div className="col" style={{ flex: 1 }}>
      {/* 臂头部 */}
      <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: `color-mix(in srgb, ${accentC} 20%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: accentC }}>{result.arm}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{result.version}</span>
        <StatusBadge status={isA ? 'prod' : 'canary'} tone={isA ? 'good' : 'warn'} />
      </div>

      {/* 输出内容 */}
      <div style={{
        flex: 1,
        background: 'var(--surface-2)',
        border: '1px solid var(--hairline)',
        borderRadius: 10,
        padding: '12px 14px',
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        fontSize: 12.5,
        lineHeight: 1.7,
        color: 'var(--text-1)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        minHeight: 140,
        position: 'relative',
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', position: 'absolute', inset: 0, justifyContent: 'center' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span>推理中…</span>
          </div>
        ) : result.output}
      </div>

      {/* 角标指标 */}
      <div className="row gap-2" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <span className="statpill">
          <Gauge size={10} /> tokens <b className="mononum">{result.tokens}</b>
        </span>
        <span className="statpill">
          <Timer size={10} /> <b className="mononum">{result.latencyMs}ms</b>
        </span>
        <span className="statpill cost">
          <DollarSign size={10} /> <b className="mononum cost">${result.costUsd.toFixed(4)}</b>
        </span>
      </div>
    </div>
  );
}

// ── 分组柱 ECharts builder ──────────────────────────────────────────────────
function buildBarOption(exp: Experiment) {
  const metrics: Array<{ label: string; a: number; b: number; positive: boolean; unit: string }> = [
    { label: '综合评分', a: exp.scoreA, b: exp.scoreB, positive: true, unit: '' },
    { label: '成本/千次($)', a: exp.costA, b: exp.costB, positive: false, unit: '$' },
    { label: 'p95 延迟(ms)', a: exp.p95A, b: exp.p95B, positive: false, unit: 'ms' },
  ];

  const bColors = metrics.map(m => {
    const bBetter = m.positive ? m.b > m.a : m.b < m.a;
    return bBetter ? cssVar('--emerald') : cssVar('--danger');
  });
  const aColors = metrics.map(m => {
    const aBetter = m.positive ? m.a > m.b : m.a < m.b;
    return aBetter ? accent() : `color-mix(in srgb, ${accent()} 48%, transparent)`;
  });

  return {
    ...baseOption(),
    legend: {
      show: true, top: 0, right: 0,
      data: [exp.armA, exp.armB],
      itemWidth: 10, itemHeight: 10,
      textStyle: { color: cssVar('--text-3'), fontSize: 11 },
    },
    grid: { left: 8, right: 8, top: 28, bottom: 16, containLabel: true },
    tooltip: {
      ...(baseOption().tooltip as object),
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    xAxis: {
      type: 'category',
      data: metrics.map(m => m.label),
      ...axisStyle(),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      ...axisStyle(),
      scale: true,
    },
    series: [
      {
        name: exp.armA,
        type: 'bar',
        barWidth: 32,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (p: { dataIndex: number }) => aColors[p.dataIndex],
        },
        data: metrics.map(m => m.a),
        animationDelay: (i: number) => i * 80,
      },
      {
        name: exp.armB,
        type: 'bar',
        barWidth: 32,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (p: { dataIndex: number }) => bColors[p.dataIndex],
        },
        data: metrics.map(m => m.b),
        animationDelay: (i: number) => i * 80 + 40,
      },
    ],
    animationDuration: 700,
    animationEasing: 'cubicOut',
  };
}

// ── 主页面 ──────────────────────────────────────────────────────────────────
export default function Experiments() {
  useAuth(); // hook 保持一致（hasPermission 本页暂不用动作级判断）

  const [selectedId, setSelectedId] = useState<string>(EXPERIMENTS[0].id);
  const [playInput, setPlayInput] = useState(PLAYGROUND_INPUT);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlaygroundResult[]>(PLAYGROUND_RESULTS);
  const [activeTab, setActiveTab] = useState<'experiments' | 'playground'>('experiments');

  const selectedExp = EXPERIMENTS.find(e => e.id === selectedId) ?? EXPERIMENTS[0];

  const runningCount = EXPERIMENTS.filter(e => e.status === 'running').length;
  const concludedCount = EXPERIMENTS.filter(e => e.status === 'concluded').length;

  // 累计节省：对比 A/B 实验，B 更便宜时的差值 × 假设千次调用节省
  const savedCost = EXPERIMENTS.reduce((acc, e) => {
    const cheaper = Math.min(e.costA, e.costB);
    const more = Math.max(e.costA, e.costB);
    return acc + (more - cheaper);
  }, 0);

  // 全部实验最高显著性
  const maxSig = Math.max(...EXPERIMENTS.map(e => e.significance));

  function handleRun() {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      setResults(PLAYGROUND_RESULTS);
      setLoading(false);
    }, 800);
  }

  return (
    <div className="page">
      <PageHeader
        title="A-B 实验 & Playground"
        subtitle="上线前对照 prompt/模型差异 · 实时试跑 · 统计显著性验证后再全量"
        actions={
          <div className="row gap-2">
            <Segmented
              options={[
                { value: 'experiments', label: '实验列表' },
                { value: 'playground', label: 'Playground' },
              ]}
              value={activeTab}
              onChange={(v) => setActiveTab(v as typeof activeTab)}
            />
          </div>
        }
      />

      {/* ── KPI 条 ── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 14 }}>
        <StatCard
          label="进行中实验"
          raw={runningCount}
          icon={<FlaskConical size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-1"
        />
        <StatCard
          label="已结论实验"
          raw={concludedCount}
          icon={<CheckCircle2 size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-2"
        />
        <StatCard
          label="累计可节省/千次"
          raw={savedCost}
          unit="$"
          decimals={2}
          icon={<DollarSign size={15} />}
          accentVar="var(--cost)"
          delayClass="reveal-3"
        />
        <StatCard
          label="最高统计置信"
          raw={maxSig * 100}
          unit="%"
          decimals={0}
          icon={<Gauge size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-4"
        />
      </div>

      {/* ── 实验列表 Tab ── */}
      {activeTab === 'experiments' && (
        <div style={{ marginTop: 14 }}>
          {/* 实验卡列表 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, marginBottom: 14 }}>
            {EXPERIMENTS.map((exp) => (
              <ExperimentCard
                key={exp.id}
                exp={exp}
                selected={exp.id === selectedId}
                onSelect={() => setSelectedId(exp.id)}
              />
            ))}
          </div>

          {/* 累计指标对比柱状图 */}
          <Card className="reveal reveal-3">
            <SectionTitle
              right={
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className="t-small text-3">当前对比</span>
                  <div className="row gap-1">
                    {EXPERIMENTS.map(e => (
                      <button
                        key={e.id}
                        onClick={() => setSelectedId(e.id)}
                        className="btn btn-sm"
                        style={{
                          background: e.id === selectedId ? 'var(--surface-3)' : 'transparent',
                          color: e.id === selectedId ? 'var(--text-1)' : 'var(--text-3)',
                          border: e.id === selectedId ? '1px solid var(--hairline-strong)' : '1px solid transparent',
                          fontSize: 11,
                          padding: '3px 9px',
                        }}
                      >
                        {e.name.slice(0, 8)}…
                      </button>
                    ))}
                  </div>
                </div>
              }
            >
              <span className="row gap-2">
                <FlaskConical size={13} />
                {selectedExp.name} · A vs B 三维对比柱
              </span>
            </SectionTitle>

            {/* 指标含义说明 */}
            <div className="row gap-3" style={{ marginBottom: 10 }}>
              <div className="row gap-1 t-small text-3" style={{ alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: accent(), display: 'inline-block' }} />
                {selectedExp.armA}（A 臂）
              </div>
              <div className="row gap-1 t-small text-3" style={{ alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: cssVar('--emerald'), display: 'inline-block' }} />
                {selectedExp.armB}（B 臂·胜）
                <span style={{ color: 'var(--danger)', marginLeft: 4 }}>红 = 劣</span>
              </div>
            </div>

            <Chart
              height={260}
              deps={[selectedId]}
              build={() => buildBarOption(selectedExp)}
            />

            {/* 洞察行 */}
            <div
              className="row gap-2"
              style={{ marginTop: 12, padding: '9px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}
            >
              {selectedExp.scoreB < selectedExp.scoreA ? (
                <TrendingDown size={13} style={{ color: sem('error'), flexShrink: 0 }} />
              ) : (
                <TrendingUp size={13} style={{ color: cssVar('--emerald'), flexShrink: 0 }} />
              )}
              <span className="t-small text-2">
                B 臂（{selectedExp.armB}）评分{' '}
                <b className="mononum" style={{ color: selectedExp.scoreB < selectedExp.scoreA ? sem('error') : cssVar('--emerald') }}>
                  {selectedExp.scoreA.toFixed(3)} → {selectedExp.scoreB.toFixed(3)}
                </b>
                ，成本{' '}
                <b className="mononum" style={{ color: selectedExp.costB < selectedExp.costA ? cssVar('--emerald') : cost() }}>
                  ${selectedExp.costA.toFixed(2)} → ${selectedExp.costB.toFixed(2)}
                </b>
                ，显著性{' '}
                <b className="mononum" style={{ color: selectedExp.significance >= 0.95 ? cssVar('--emerald') : 'var(--text-2)' }}>
                  {(selectedExp.significance * 100).toFixed(0)}%
                </b>
                {selectedExp.significance >= 0.95 ? '（显著）' : '（未达 95%）'}。
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* ── Playground Tab ── */}
      {activeTab === 'playground' && (
        <div style={{ marginTop: 14 }}>
          <Card className="reveal reveal-2">
            <SectionTitle>
              <span className="row gap-2"><Play size={13} /> Playground · 实时双臂对比试跑</span>
            </SectionTitle>

            {/* 输入框 */}
            <div className="col gap-2" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.02em' }}>
                输入（同一 Query 分发两臂）
              </label>
              <div className="row gap-2">
                <input
                  value={playInput}
                  onChange={e => setPlayInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 9,
                    padding: '9px 13px',
                    fontSize: 13,
                    color: 'var(--text-1)',
                    fontFamily: 'inherit',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  placeholder="输入问题…"
                  onFocus={e => (e.target.style.borderColor = accent())}
                  onBlur={e => (e.target.style.borderColor = 'var(--hairline)')}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleRun}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                >
                  {loading ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Play size={14} />
                  )}
                  {loading ? '推理中…' : '运行双臂'}
                </button>
              </div>
            </div>

            {/* 双栏输出 */}
            <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
              {results.map(r => (
                <PlaygroundCard key={r.arm} result={r} loading={loading} />
              ))}
            </div>

            {/* 对比注释 */}
            {!loading && (
              <div className="row gap-3" style={{ marginTop: 16, flexWrap: 'wrap' }}>
                <div style={{ padding: '9px 13px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--hairline)', flex: 1, minWidth: 220 }}>
                  <div className="t-small" style={{ color: 'var(--text-2)', marginBottom: 4, fontWeight: 600 }}>
                    A（v3 prod）输出特征
                  </div>
                  <div className="t-small text-3">
                    完整答复 + 条款引用 [3]，带步骤建议；tokens{' '}
                    <span className="mononum">{results[0]?.tokens}</span>，延迟{' '}
                    <span className="mononum">{results[0]?.latencyMs}ms</span>。
                  </div>
                </div>
                <div style={{ padding: '9px 13px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--hairline)', flex: 1, minWidth: 220 }}>
                  <div className="t-small" style={{ color: 'var(--text-2)', marginBottom: 4, fontWeight: 600 }}>
                    B（v4 canary）输出特征
                  </div>
                  <div className="t-small text-3">
                    严格 JSON，答案砍短，无引用；tokens{' '}
                    <span className="mononum">{results[1]?.tokens}</span>（省{' '}
                    <span className="mononum" style={{ color: cssVar('--emerald') }}>
                      {results[0] && results[1] ? results[0].tokens - results[1].tokens : 0}
                    </span>
                    ），但忠实度回归 −11%。
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CSS for spinner */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
