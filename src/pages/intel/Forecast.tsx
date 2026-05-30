import { useMemo, useState } from 'react';
import { TrendingUp, Gauge, AlertTriangle, Target, Activity, ArrowUpDown } from 'lucide-react';
import { Card, PageHeader, StatCard, SectionTitle, Badge, ProgressBar, Segmented } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { MODEL_PROGRESS, REGIONS, GOALS } from '../../lib/mockData';

// ─── 预测推导（本地，绝不改 mockData）────────────────────────────────────────
// 口径：本月 5/29，月已过 ~28/31 天 → 当前节奏外推到月末。
const MONTH_DAYS = 31;
const DAYS_ELAPSED = 28;
const PACE = DAYS_ELAPSED / MONTH_DAYS; // 当前已过工期比例

type Scope = 'region' | 'model';
type Risk = 'green' | 'yellow' | 'red';

interface Row {
  name: string;
  target: number;
  current: number;
  projected: number;   // 预计最终完成量（按节奏外推）
  pct: number;         // 预计最终完成率 %
  prob: number;        // 落地概率 %
  gap: number;         // 缺口（目标 - 预计），>0 = 缺口
  risk: Risk;
  color: string;
}

const MODEL_COLORS: Record<string, string> = {
  L9: '#D6BC82', L8: '#5AA2F0', L7: '#E25563', L6: '#34C892', MEGA: '#9C8CF0',
};

// 落地概率：以「当前完成率 / 应达节奏」为核心，节奏越超前概率越高。
// green ≥ 90 / yellow 70–89 / red < 70。
function deriveRow(name: string, target: number, current: number, color: string): Row {
  const curPct = current / target;            // 当前完成率
  const projected = Math.round(current / PACE); // 按节奏外推月末
  const pct = Math.round((projected / target) * 100);
  // 概率 = 节奏达成度（current 相对应达进度）压到 0–100，并向预计完成率轻微回归
  const paceRatio = curPct / PACE;            // 1 = 正好踩节奏
  const probRaw = paceRatio * 92 + (pct - 100) * 0.35;
  const prob = Math.max(28, Math.min(99, Math.round(probRaw)));
  const risk: Risk = prob >= 90 ? 'green' : prob >= 70 ? 'yellow' : 'red';
  const gap = Math.max(0, target - projected);
  return { name, target, current, projected, pct, prob, gap, risk, color };
}

const RISK_COLOR: Record<Risk, string> = {
  green: 'var(--success)', yellow: 'var(--warning)', red: 'var(--danger)',
};
const RISK_LABEL: Record<Risk, string> = { green: '高概率达标', yellow: '存在风险', red: '高风险缺口' };

// 区域目标：REGIONS 只有 orders+completion → 反推目标 = orders / (completion/100)
const REGION_ROWS: Row[] = REGIONS.map((r, i) => {
  const target = Math.round(r.orders / (r.completion / 100));
  return deriveRow(r.region, target, r.orders, ['#5AA2F0', '#E25563', '#34C892', '#D6BC82', '#9C8CF0', '#4FD0E0'][i] ?? '#8A929C');
});

const MODEL_ROWS: Row[] = MODEL_PROGRESS.map(m =>
  deriveRow(m.model, m.target, m.actual, MODEL_COLORS[m.model] ?? m.color),
);

// 周度 commit vs AI 预测（本地推导 ~6 周，对全盘目标线性 vs AI 弧线）─────────────
const TOTAL_TARGET = MODEL_PROGRESS.reduce((s, m) => s + m.target, 0);
const TOTAL_ACTUAL = MODEL_PROGRESS.reduce((s, m) => s + m.actual, 0);
const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6（月末）'];
const COMMIT_LINE = WEEKS.map((_, i) => Math.round((TOTAL_TARGET / 6) * (i + 1)));
// AI 预测：早期略落后，后段冲量，月末落到「预计最终」(< 目标，体现缺口)
const TOTAL_PROJECTED = MODEL_ROWS.reduce((s, r) => s + r.projected, 0);
const AI_CURVE = [0.14, 0.30, 0.47, 0.66, 0.85, 1].map(f => Math.round(TOTAL_PROJECTED * f));

export default function Forecast() {
  const [scope, setScope] = useState<Scope>('region');
  const [asc, setAsc] = useState(false);

  const rowsBase = scope === 'region' ? REGION_ROWS : MODEL_ROWS;

  // KPI 派生
  const avgPct = Math.round(
    (rowsBase.reduce((s, r) => s + r.projected, 0) / rowsBase.reduce((s, r) => s + r.target, 0)) * 100,
  );
  const avgProb = Math.round(rowsBase.reduce((s, r) => s + r.prob, 0) / rowsBase.length);
  const highRisk = rowsBase.filter(r => r.risk === 'red').length;
  const totalGap = rowsBase.reduce((s, r) => s + r.gap, 0);

  // 最差项（缺口最大 + 概率最低）
  const worst = useMemo(
    () => [...rowsBase].sort((a, b) => a.prob - b.prob || b.gap - a.gap)[0],
    [rowsBase],
  );

  const rows = useMemo(
    () => [...rowsBase].sort((a, b) => (asc ? a.prob - b.prob : b.prob - a.prob)),
    [rowsBase, asc],
  );

  // 图表：目标 vs 预计最终（分组柱，预计柱按概率着色）────────────────────────────
  const commitVsAi = () => {
    const b = baseOption();
    const d = rowsBase;
    return {
      ...b,
      legend: {
        data: ['月度目标 (Commit)', 'AI 预计最终'], top: 0, right: 0, icon: 'roundRect',
        itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 12 },
      },
      tooltip: {
        ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (p: { name: string; value: number; seriesName: string; marker: string }[]) => {
          const r = d.find(x => x.name === p[0].name);
          return `${p[0].name}<br/>${p.map(s => `${s.marker}${s.seriesName} <b>${s.value.toLocaleString()}</b>`).join('<br/>')}` +
            (r ? `<br/>落地概率 <b style="color:${RISK_COLOR[r.risk]}">${r.prob}%</b> · 缺口 ${r.gap.toLocaleString()}` : '');
        },
      },
      grid: { left: 8, right: 14, top: 36, bottom: 6, containLabel: true },
      xAxis: { type: 'category', data: d.map(x => x.name), ...axisStyle(), splitLine: { show: false } },
      yAxis: { type: 'value', ...axisStyle() },
      series: [
        {
          name: '月度目标 (Commit)', type: 'bar', barWidth: '34%',
          data: d.map(x => x.target),
          itemStyle: { color: cssVar('--surface-3'), borderColor: cssVar('--hairline-strong'), borderWidth: 1, borderRadius: [4, 4, 0, 0] },
          ...ANIM,
        },
        {
          name: 'AI 预计最终', type: 'bar', barWidth: '34%',
          data: d.map(x => ({ value: x.projected, itemStyle: { color: RISK_COLOR[x.risk], borderRadius: [4, 4, 0, 0] } })),
          label: {
            show: true, position: 'top',
            formatter: (p: { dataIndex: number }) => `${d[p.dataIndex].pct}%`,
            color: cssVar('--text-2'), fontSize: 11, fontWeight: 600,
          },
          ...ANIM,
        },
      ],
    };
  };

  // 图表：周度 commit 直线 vs AI 预测弧线 ───────────────────────────────────────
  const weeklyOption = () => {
    const b = baseOption();
    const grad = (c: string) => ({ type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: c }, { offset: 1, color: 'transparent' }] });
    return {
      ...b,
      legend: {
        data: ['Commit 目标线', 'AI 预测路径'], top: 0, right: 0, icon: 'roundRect',
        itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 12 },
      },
      tooltip: { ...(b.tooltip as object), trigger: 'axis' },
      grid: { left: 8, right: 16, top: 36, bottom: 6, containLabel: true },
      xAxis: { type: 'category', data: WEEKS, ...axisStyle(), splitLine: { show: false }, boundaryGap: false },
      yAxis: { type: 'value', ...axisStyle() },
      series: [
        {
          name: 'Commit 目标线', type: 'line', smooth: false, data: COMMIT_LINE,
          symbol: 'none', lineStyle: { width: 2, type: 'dashed', color: cssVar('--text-3') },
          ...ANIM,
        },
        {
          name: 'AI 预测路径', type: 'line', smooth: true, data: AI_CURVE,
          symbol: 'circle', symbolSize: 7, lineStyle: { width: 3, color: cssVar('--gold') },
          itemStyle: { color: cssVar('--gold') }, areaStyle: { color: grad('rgba(90,168,255,0.26)') },
          markLine: {
            silent: true, symbol: 'none',
            lineStyle: { color: cssVar('--danger'), type: 'dotted', width: 1.5 },
            label: { formatter: '缺口', color: cssVar('--danger'), fontSize: 11, position: 'insideEndTop' },
            data: [[{ xAxis: 'W6（月末）', yAxis: AI_CURVE[5] }, { xAxis: 'W6（月末）', yAxis: COMMIT_LINE[5] }]],
          },
          ...ANIM,
        },
      ],
    };
  };

  return (
    <div className="page">
      <PageHeader
        title="销量预测与缺口预警"
        subtitle="2026年5月 · 基于当前节奏的 AI 月末预测 · 补「只有目标没有预测」短板"
        actions={
          <Segmented
            value={scope}
            onChange={setScope}
            options={[{ value: 'region', label: '按区域' }, { value: 'model', label: '按车型' }]}
          />
        }
      />

      {/* ── KPI Row ── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="本月预计完成率" raw={avgPct} unit="%" change={avgPct - 100} icon={<Target size={16} />} delayClass="reveal-1" />
        <StatCard label="落地概率均值" raw={avgProb} unit="%" icon={<Gauge size={16} />} delayClass="reveal-2" />
        <StatCard label="高风险项数" raw={highRisk} unit="项" icon={<AlertTriangle size={16} />} delayClass="reveal-3" />
        <StatCard label="预计总缺口" raw={totalGap} unit="台" icon={<TrendingUp size={16} />} delayClass="reveal-4" />
      </div>

      {/* ── 最差项焦点 + 周度预测 ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.55fr', marginBottom: 16 }}>
        <Card className="reveal reveal-1" style={{ borderColor: 'color-mix(in srgb, var(--danger) 30%, var(--hairline))' }}>
          <SectionTitle right={<Badge color={RISK_COLOR[worst.risk]}>落地概率 {worst.prob}%</Badge>}>
            最高风险项 · 需立即介入
          </SectionTitle>
          <div className="row gap-3" style={{ marginBottom: 14 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: 'color-mix(in srgb, var(--danger) 14%, transparent)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={19} />
            </span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
                {scope === 'region' ? worst.name : `${worst.name} 车型`}
              </div>
              <div className="t-small text-3">{RISK_LABEL[worst.risk]} · 按当前节奏难达 Commit</div>
            </div>
          </div>
          <div className="col gap-3">
            {[
              { k: '月度目标', v: worst.target.toLocaleString(), c: 'var(--text-2)' },
              { k: '当前完成', v: worst.current.toLocaleString(), c: 'var(--text-1)' },
              { k: 'AI 预计最终', v: worst.projected.toLocaleString(), c: 'var(--danger)' },
              { k: '预计缺口', v: `−${worst.gap.toLocaleString()}`, c: 'var(--danger)' },
            ].map(item => (
              <div key={item.k} className="row spread">
                <span className="t-small text-3">{item.k}</span>
                <span className="tnum" style={{ fontSize: 15, fontWeight: 700, color: item.c }}>{item.v} <span className="text-3" style={{ fontWeight: 400, fontSize: 11 }}>台</span></span>
              </div>
            ))}
            <div className="col gap-1" style={{ marginTop: 2 }}>
              <ProgressBar pct={worst.pct} color="var(--danger)" height={6} />
              <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)' }}>预计完成率 {worst.pct}%</span>
            </div>
          </div>
        </Card>

        <Card className="reveal reveal-2">
          <SectionTitle right={<span className="row gap-2 t-small text-3"><Activity size={13} />全盘 · 台</span>}>
            周度推进 · Commit 目标 vs AI 预测路径
          </SectionTitle>
          <Chart build={weeklyOption} height={256} />
        </Card>
      </div>

      {/* ── 目标 vs 预计 分组柱 ── */}
      <Card className="reveal reveal-3" style={{ marginBottom: 16 }}>
        <SectionTitle right={<Badge color="var(--gold)">{scope === 'region' ? '各区域' : '各车型'} · 概率着色</Badge>}>
          月度目标 (Commit) vs AI 预计最终（柱色 = 落地概率 红/黄/绿）
        </SectionTitle>
        <Chart build={commitVsAi} height={272} deps={[scope]} />
      </Card>

      {/* ── 排名明细表 ── */}
      <Card className="card-pad-0 reveal reveal-4">
        <div className="spread wrap gap-3" style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
          <SectionTitle right={
            <div className="row gap-2">
              <Badge color="var(--success)">绿 ≥90%</Badge>
              <Badge color="var(--warning)">黄 70–89%</Badge>
              <Badge color="var(--danger)">红 &lt;70%</Badge>
            </div>
          }>
            {scope === 'region' ? '区域' : '车型'}预测明细 · 按落地概率排序
          </SectionTitle>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{scope === 'region' ? '区域' : '车型'}</th>
                <th className="td-num">月度目标</th>
                <th className="td-num">当前完成</th>
                <th className="td-num">AI 预计最终</th>
                <th style={{ width: 168 }}>预计完成率</th>
                <th className="td-num" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setAsc(!asc)}>
                  <span className="row gap-1" style={{ justifyContent: 'flex-end', color: 'var(--gold)' }}>
                    落地概率<ArrowUpDown size={11} style={{ opacity: 0.9 }} />
                  </span>
                </th>
                <th className="td-num">预计缺口</th>
                <th>风险标签</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.name} className={`reveal reveal-${Math.min(idx + 1, 6)}`}>
                  <td>
                    <span className="row gap-2">
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.name}</span>
                    </span>
                  </td>
                  <td className="td-num tnum text-2">{r.target.toLocaleString()}</td>
                  <td className="td-num tnum text-2">{r.current.toLocaleString()}</td>
                  <td className="td-num tnum" style={{ fontWeight: 700, color: RISK_COLOR[r.risk] }}>{r.projected.toLocaleString()}</td>
                  <td>
                    <div className="col gap-1">
                      <ProgressBar pct={r.pct} color={RISK_COLOR[r.risk]} height={5} />
                      <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: RISK_COLOR[r.risk] }}>{r.pct}%</span>
                    </div>
                  </td>
                  <td className="td-num">
                    <span className="row gap-1 chip tnum" style={{ justifyContent: 'center', background: `color-mix(in srgb, ${RISK_COLOR[r.risk]} 14%, transparent)`, color: RISK_COLOR[r.risk] }}>
                      {r.prob}%
                    </span>
                  </td>
                  <td className="td-num tnum" style={{ fontWeight: 600, color: r.gap > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                    {r.gap > 0 ? `−${r.gap.toLocaleString()}` : '达标'}
                  </td>
                  <td>
                    <span className="row gap-1" style={{ color: RISK_COLOR[r.risk], fontSize: 12, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: RISK_COLOR[r.risk] }} />
                      {RISK_LABEL[r.risk]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--surface-2)' }}>
                <td style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>汇总</td>
                <td className="td-num tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>{rowsBase.reduce((s, r) => s + r.target, 0).toLocaleString()}</td>
                <td className="td-num tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>{rowsBase.reduce((s, r) => s + r.current, 0).toLocaleString()}</td>
                <td className="td-num tnum" style={{ fontWeight: 700, color: 'var(--text-1)' }}>{rowsBase.reduce((s, r) => s + r.projected, 0).toLocaleString()}</td>
                <td>
                  <div className="col gap-1">
                    <ProgressBar pct={avgPct} color={avgPct < 70 ? 'var(--danger)' : avgPct >= 90 ? 'var(--success)' : 'var(--warning)'} height={5} />
                    <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>{avgPct}%</span>
                  </div>
                </td>
                <td className="td-num tnum" style={{ fontWeight: 700, color: 'var(--gold)' }}>{avgProb}%</td>
                <td className="td-num tnum" style={{ fontWeight: 700, color: 'var(--danger)' }}>−{totalGap.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
