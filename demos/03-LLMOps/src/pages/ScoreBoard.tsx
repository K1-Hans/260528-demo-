import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid3x3, Radar, ShieldCheck, GitCompareArrows, ArrowRight, ArrowDownRight,
  TriangleAlert, FlaskConical, ScrollText, Scale, FileSearch,
} from 'lucide-react';
import { PageHeader, Card, SectionTitle, TrendChip, Segmented } from '../components/ui';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import {
  SCORE_MATRIX, EVAL_DIMS, EVAL_RUNS, VERSION_RADAR, DATASETS,
} from '../lib/mockData';
import type { EvalDimension, EvalRun } from '../types';

// ── 故事锚点：客服 QA 黄金集 · v3 (prod) vs v4 (canary) · judge=gpt-4o ──
const REGRESS_DIM: EvalDimension = '忠实度';
const MATRIX_ROWS = ['v3 (prod)', 'v4 (canary)', 'gpt-4o', 'claude-3.5', 'Qwen2.5-72B'];

const DIM_ICON: Record<EvalDimension, React.ReactNode> = {
  相关性: <FileSearch size={13} />, 忠实度: <ShieldCheck size={13} />, 有害性: <Scale size={13} />,
  格式合规: <ScrollText size={13} />, 简洁度: <GitCompareArrows size={13} />,
};

export default function ScoreBoard() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [dataset, setDataset] = useState('ds1');
  const [judge, setJudge] = useState('gpt-4o');

  const v3 = EVAL_RUNS.find(r => r.subject === 'v3 (prod)')!;
  const v4 = EVAL_RUNS.find(r => r.subject === 'v4 (canary)')!;
  const overallDelta = +(((v4.overall - v3.overall) / v3.overall) * 100).toFixed(1); // -3.8%
  const faithV3 = v3.dims[REGRESS_DIM];
  const faithV4 = v4.dims[REGRESS_DIM];
  const faithDropPct = Math.round(((faithV4 - faithV3) / faithV3) * 100); // -11

  // 逐维回归明细（v3 → v4）
  const dimRows = EVAL_DIMS.map(dim => {
    const a = v3.dims[dim], b = v4.dims[dim];
    const delta = +(b - a).toFixed(2);
    const pct = +(((b - a) / a) * 100).toFixed(1);
    return { dim, a, b, delta, pct, down: delta < -0.005 };
  });

  return (
    <div className="page">
      <PageHeader
        title="评分看板 · LLM-as-judge"
        subtitle="judge=gpt-4o-as-judge · 数据集=客服 QA 黄金集（320 golden）· 5 维度多版本回归对比"
        actions={
          <div className="row gap-2 wrap">
            <Segmented
              value={dataset}
              onChange={setDataset}
              options={DATASETS.map(d => ({ value: d.id, label: d.name }))}
            />
            <Segmented
              value={judge}
              onChange={setJudge}
              options={[
                { value: 'gpt-4o', label: 'judge · gpt-4o' },
                { value: 'claude-3.5-sonnet', label: 'judge · claude-3.5' },
              ]}
            />
          </div>
        }
      />

      {/* ── 顶部对比卡：v3 (prod) vs v4 (canary) ── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: '1fr 1fr auto', gap: 14, alignItems: 'stretch' }}>
        <VersionScoreCard run={v3} variant="prod" delayClass="reveal-1" />
        <VersionScoreCard run={v4} variant="canary" delta={overallDelta} delayClass="reveal-2" />

        {/* 总分差 — 故事结论钩子 */}
        <Card className="reveal reveal-2" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 232, gap: 10 }}>
          <span className="label">总分回归</span>
          <div className="row gap-2" style={{ alignItems: 'baseline' }}>
            <span className="mononum" style={{ fontSize: 30, fontWeight: 600, color: 'var(--danger)', letterSpacing: '-0.02em' }}>
              {overallDelta}%
            </span>
            <span className="t-small text-3">overall</span>
          </div>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="mononum text-3" style={{ fontSize: 13 }}>{v3.overall.toFixed(3)}</span>
            <ArrowRight size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <span className="mononum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>{v4.overall.toFixed(3)}</span>
          </div>
          <div className="t-small text-3" style={{ lineHeight: 1.5 }}>
            回归集中在 <b style={{ color: 'var(--danger)' }}>{REGRESS_DIM}</b> 维度，非全局退化。
          </div>
        </Card>
      </div>

      {/* ── 主区：左 热力矩阵 / 右 雷达对比 ── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 14, marginTop: 14, alignItems: 'stretch' }}>
        {/* 核心①：评分热力矩阵（标志视觉） */}
        <Card className="reveal reveal-3" style={{ minWidth: 0 }}>
          <SectionTitle
            right={<span className="tag tag-mono">judge=gpt-4o · 范围 0.78–1.00</span>}
          >
            <span className="row gap-2"><Grid3x3 size={13} /> 评分热力矩阵 · 5 版本/模型 × 5 维度</span>
          </SectionTitle>
          <Chart height={336} build={() => heatmapOption()} />
          <div className="row gap-2 wrap" style={{ marginTop: 12, alignItems: 'center' }}>
            <Legend color={cssVar('--danger')} label="低分 · 回归" />
            <Legend color={cssVar('--warning')} label="中位" />
            <Legend color={cssVar('--emerald')} label="高分 · 健康" />
            <span className="t-small text-3" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowDownRight size={13} style={{ color: 'var(--danger)' }} />
              <b style={{ color: 'var(--danger)' }}>v4 (canary) × {REGRESS_DIM}</b> 单元格泛红 = {faithV3.toFixed(2)} → {faithV4.toFixed(2)}
            </span>
          </div>
        </Card>

        {/* 核心②：v3 vs v4 雷达对比 */}
        <Card className="reveal reveal-4" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <SectionTitle
            right={
              <span className="row gap-2">
                <SeriesDot color="var(--emerald)" label="v3" />
                <SeriesDot color="var(--danger)" label="v4" />
              </span>
            }
          >
            <span className="row gap-2"><Radar size={13} /> 版本能力雷达 · v3 vs v4</span>
          </SectionTitle>
          <Chart height={336} build={() => radarOption()} />
          <div className="row gap-2" style={{ marginTop: 'auto', paddingTop: 10 }}>
            <TriangleAlert size={13} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
            <span className="t-small text-2" style={{ lineHeight: 1.5 }}>
              v4 在 <b style={{ color: 'var(--danger)' }}>{REGRESS_DIM}</b> 轴明显内缩，其余维度基本贴合 — 单点塌陷。
            </span>
          </div>
        </Card>
      </div>

      {/* ── 回归对比明细：逐维 v3 → v4 ── */}
      <Card className="reveal reveal-4" style={{ marginTop: 14 }}>
        <SectionTitle right={<span className="tag tag-mono">{v3.dataset} · {EVAL_DIMS.length} 维</span>}>
          <span className="row gap-2"><GitCompareArrows size={13} /> 逐维回归明细 · v3 (prod) → v4 (canary)</span>
        </SectionTitle>

        <div className="col" style={{ gap: 0 }}>
          {/* 表头 */}
          <div
            className="row"
            style={{ padding: '0 0 10px', borderBottom: '1px solid var(--hairline)', color: 'var(--text-3)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
          >
            <span style={{ flex: '0 0 150px' }}>评测维度</span>
            <span style={{ flex: '0 0 96px', textAlign: 'right' }} className="tnum">v3 (prod)</span>
            <span style={{ flex: '0 0 110px', textAlign: 'right' }} className="tnum">v4 (canary)</span>
            <span style={{ flex: '0 0 130px' }} className="row" >&nbsp;变化</span>
            <span style={{ flex: 1, textAlign: 'right' }}>诊断动作</span>
          </div>

          {dimRows.map(r => (
            <div
              key={r.dim}
              className="row dim-row"
              style={{
                padding: '13px 0',
                borderBottom: '1px solid var(--hairline)',
                background: r.down ? 'color-mix(in srgb, var(--danger) 5%, transparent)' : 'transparent',
                marginLeft: r.down ? -10 : 0, marginRight: r.down ? -10 : 0,
                paddingLeft: r.down ? 10 : 0, paddingRight: r.down ? 10 : 0,
                borderRadius: r.down ? 8 : 0,
              }}
            >
              <span className="row gap-2" style={{ flex: '0 0 150px', color: r.down ? 'var(--danger)' : 'var(--text-1)', fontWeight: r.down ? 600 : 500, fontSize: 13 }}>
                <span style={{ opacity: 0.85, display: 'inline-flex' }}>{DIM_ICON[r.dim]}</span>
                {r.dim}
                {r.down && <span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 16%, transparent)', color: 'var(--danger)', marginLeft: 2 }}>回归</span>}
              </span>
              <span className="mononum" style={{ flex: '0 0 96px', textAlign: 'right', fontSize: 14, color: 'var(--text-2)' }}>{r.a.toFixed(2)}</span>
              <span className="mononum" style={{ flex: '0 0 110px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: r.down ? 'var(--danger)' : (r.delta > 0.005 ? 'var(--emerald)' : 'var(--text-1)') }}>{r.b.toFixed(2)}</span>
              <span style={{ flex: '0 0 130px' }} className="row">
                <TrendChip change={r.pct} invert suffix="" />
              </span>
              <span style={{ flex: 1, textAlign: 'right' }}>
                {r.down ? (
                  hasPermission('tracing:read') ? (
                    <button className="btn btn-subtle btn-sm" onClick={() => navigate('/tracing')}>
                      查看失败用例 trace <ArrowRight size={12} />
                    </button>
                  ) : (
                    <span className="t-small text-3">无 trace 查看权限</span>
                  )
                ) : (
                  <span className="t-small text-3" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                    <ShieldCheck size={12} style={{ color: 'var(--emerald)' }} /> 维持基线
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 故事钩子条：结论 + 去 Prompt diff ── */}
      <button
        className="alert-banner reveal reveal-5"
        style={{ marginTop: 14, width: '100%' }}
        onClick={() => navigate('/prompts')}
      >
        <span className="alert-banner-ico"><FlaskConical size={18} /></span>
        <div className="flex-1" style={{ textAlign: 'left', minWidth: 0 }}>
          <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>
              结论 · v4 {REGRESS_DIM}
              <b className="mononum" style={{ color: 'var(--text-1)', margin: '0 4px' }}>{faithV3.toFixed(2)} → {faithV4.toFixed(2)}</b>
              <span className="mononum" style={{ color: 'var(--danger)' }}>（{faithDropPct}%）</span>
            </span>
            <span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 16%, transparent)', color: 'var(--danger)' }}>质量回归</span>
          </div>
          <div className="t-small text-3" style={{ marginTop: 3 }}>
            疑似 v4 prompt 删除「忠实度约束 few-shot」+ 引用要求 → 输出脱离检索内容。去版本库看 v3 ↔ v4 diff 定位根因。
          </div>
        </div>
        <span className="alert-banner-cta">去 Prompt 版本库看 diff <ArrowRight size={14} /></span>
      </button>
    </div>
  );
}

// ── 顶部版本对比卡 ──────────────────────────────────────────────────────────
function VersionScoreCard({ run, variant, delta, delayClass = '' }: {
  run: EvalRun; variant: 'prod' | 'canary'; delta?: number; delayClass?: string;
}) {
  const isCanary = variant === 'canary';
  const tone = isCanary ? 'var(--danger)' : 'var(--emerald)';
  return (
    <Card
      className={`reveal ${delayClass}`}
      style={{
        position: 'relative', overflow: 'hidden',
        borderColor: isCanary ? 'color-mix(in srgb, var(--danger) 36%, var(--hairline))' : 'var(--hairline)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {/* 左侧色脊 */}
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: tone, opacity: isCanary ? 0.9 : 0.7 }} />
      <div className="spread">
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="mono-version" style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            {run.subject.split(' ')[0]}
          </span>
          <span className="badge" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: tone, display: 'inline-block' }} />
            {isCanary ? 'canary · 20% 流量' : 'prod · 80% 流量'}
          </span>
        </div>
        <span className="t-small text-3 tnum">{run.at}</span>
      </div>

      <div className="row spread" style={{ alignItems: 'flex-end' }}>
        <div>
          <span className="label" style={{ display: 'block', marginBottom: 6 }}>综合评分 overall</span>
          <div className="row gap-2" style={{ alignItems: 'baseline' }}>
            <span className="mononum" style={{ fontSize: 38, fontWeight: 600, color: isCanary ? 'var(--danger)' : 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {run.overall.toFixed(3)}
            </span>
            {isCanary && delta !== undefined && (
              <TrendChip change={delta} invert suffix="" />
            )}
          </div>
        </div>
        <ProgressDual value={run.overall} tone={tone} />
      </div>
    </Card>
  );
}

// 双层占比条（满分 1.0 的视觉度量）
function ProgressDual({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="col gap-2" style={{ width: 132 }}>
      <div className="spread">
        <span className="t-small text-3">/ 1.000</span>
        <span className="mononum text-3" style={{ fontSize: 11 }}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value * 100}%`, background: tone, borderRadius: 4, transition: 'width 0.9s var(--ease)' }} />
      </div>
    </div>
  );
}

// 图例点
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="row gap-1" style={{ alignItems: 'center' }}>
      <span style={{ width: 11, height: 11, borderRadius: 3, background: color, display: 'inline-block' }} />
      <span className="t-small text-3">{label}</span>
    </span>
  );
}
function SeriesDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="row gap-1" style={{ alignItems: 'center' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span className="t-small text-3 tnum">{label}</span>
    </span>
  );
}

// ── ECharts builders ────────────────────────────────────────────────────────
// 核心①：全矩阵热力（5 行 × 5 维），低分→红 高分→emerald，v4×忠实度 泛红
function heatmapOption() {
  const rows = MATRIX_ROWS;
  const data: [number, number, number][] = [];
  SCORE_MATRIX.forEach(c => {
    const ri = rows.indexOf(c.row);
    if (ri < 0) return;
    data.push([EVAL_DIMS.indexOf(c.dim), ri, c.score]);
  });
  return {
    ...baseOption(),
    grid: { left: 8, right: 14, top: 10, bottom: 30, containLabel: true },
    tooltip: {
      ...(baseOption().tooltip as object),
      formatter: (p: { value: [number, number, number] }) => {
        const isRegress = rows[p.value[1]] === 'v4 (canary)' && EVAL_DIMS[p.value[0]] === REGRESS_DIM;
        return `${rows[p.value[1]]} · ${EVAL_DIMS[p.value[0]]}<br/><b style="font-size:14px">${p.value[2].toFixed(2)}</b>${isRegress ? `<br/><span style="color:${cssVar('--danger')}">● 忠实度回归源</span>` : ''}`;
      },
    },
    xAxis: {
      type: 'category', data: EVAL_DIMS, position: 'bottom',
      axisLabel: { ...axisStyle().axisLabel, fontSize: 12, color: cssVar('--text-2'), margin: 12 },
      axisLine: { show: false }, axisTick: { show: false }, splitArea: { show: false },
    },
    yAxis: {
      type: 'category', data: rows, inverse: true,
      axisLabel: {
        ...axisStyle().axisLabel, fontFamily: 'Geist Mono, monospace', fontSize: 12, margin: 12,
        color: (v: string) => (v === 'v4 (canary)' ? cssVar('--danger') : v === 'v3 (prod)' ? cssVar('--emerald') : cssVar('--text-2')),
        fontWeight: (v: string) => (v === 'v4 (canary)' || v === 'v3 (prod)' ? 600 : 400),
      },
      axisLine: { show: false }, axisTick: { show: false }, splitArea: { show: false },
    },
    visualMap: {
      min: 0.78, max: 1, show: false,
      inRange: { color: [cssVar('--danger'), cssVar('--warning'), cssVar('--emerald')] },
    },
    series: [{
      type: 'heatmap', data,
      label: {
        show: true,
        formatter: (p: { value: [number, number, number] }) => p.value[2].toFixed(2),
        color: cssVar('--bg-base'), fontSize: 12, fontFamily: 'Geist Mono, monospace', fontWeight: 600,
      },
      itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 4, borderRadius: 6 },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.45)', borderColor: cssVar('--text-3'), borderWidth: 1 } },
    }],
    animationDuration: 760, animationEasing: 'cubicOut',
    animationDelay: (i: number) => i * 22,
  };
}

// 核心②：v3 vs v4 雷达（5 维）— v3 emerald / v4 红，忠实度轴塌陷
function radarOption() {
  const indicators = EVAL_DIMS.map(d => ({
    name: d,
    max: 1,
    min: 0.7, // 收紧下界放大差异（让忠实度塌陷可见）
  }));
  const v3 = VERSION_RADAR.find(s => s.name.startsWith('v3'))!;
  const v4 = VERSION_RADAR.find(s => s.name.startsWith('v4'))!;
  const emeraldC = cssVar('--emerald');
  const dangerC = cssVar('--danger');
  return {
    ...baseOption(),
    tooltip: { ...(baseOption().tooltip as object), trigger: 'item' },
    radar: {
      indicator: indicators,
      center: ['50%', '54%'],
      radius: '66%',
      splitNumber: 4,
      axisName: {
        color: cssVar('--text-2'), fontSize: 12,
        formatter: (name: string) => (name === REGRESS_DIM ? `{r|${name}}` : name),
        rich: { r: { color: dangerC, fontWeight: 700, fontSize: 12 } },
      },
      splitLine: { lineStyle: { color: cssVar('--hairline'), type: 'dashed' } },
      splitArea: { areaStyle: { color: ['transparent', 'color-mix(in srgb, var(--text-3) 3%, transparent)'] } },
      axisLine: { lineStyle: { color: cssVar('--hairline') } },
    },
    series: [{
      type: 'radar',
      symbolSize: 5,
      emphasis: { lineStyle: { width: 3 }, areaStyle: { opacity: 0.28 } },
      data: [
        {
          name: 'v3 (prod)',
          value: EVAL_DIMS.map(d => v3.values[d]),
          lineStyle: { color: emeraldC, width: 2 },
          itemStyle: { color: emeraldC },
          areaStyle: { color: `color-mix(in srgb, ${emeraldC} 16%, transparent)` },
        },
        {
          name: 'v4 (canary)',
          value: EVAL_DIMS.map(d => v4.values[d]),
          lineStyle: { color: dangerC, width: 2 },
          itemStyle: { color: dangerC },
          areaStyle: { color: `color-mix(in srgb, ${dangerC} 14%, transparent)` },
        },
      ],
    }],
    animationDuration: 820, animationEasing: 'cubicOut',
  };
}
