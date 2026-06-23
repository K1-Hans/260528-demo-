import { useState } from 'react';
import { FileSearch, ShieldCheck, AlertTriangle, Gavel, Activity, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, StatCard, Card, SectionTitle, Segmented, ProgressBar } from '../components/ui';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar } from '../lib/chartTheme';
import { ALERTS } from '../lib/mockData';

// ─── mock（真实消金质检量级）───────────────────────────────────────────────
const DAYS = Array.from({ length: 14 }, (_, i) => `06-${String(i + 4).padStart(2, '0')}`);
const PASS_RATE = [92.1, 92.6, 93.0, 92.4, 93.5, 93.1, 93.8, 94.0, 93.6, 94.2, 94.5, 94.1, 94.4, 94.2];
const VIOL_RATE = [3.2, 3.0, 2.8, 3.1, 2.6, 2.7, 2.4, 2.3, 2.5, 2.1, 2.0, 2.2, 1.9, 2.0];

const BIZ = [
  { line: '提前结清', volume: 9120, viol: 1.4 },
  { line: '注销合规', volume: 6240, viol: 2.6 },
  { line: '银行卡管理', volume: 7860, viol: 1.1 },
  { line: '逾期催收', volume: 8430, viol: 4.8 },
  { line: '产品咨询', volume: 11260, viol: 1.8 },
  { line: 'S客户路由', volume: 5710, viol: 3.3 },
];

const VIOL_TYPES = [
  { name: '未告知年化利率', value: 86 },
  { name: '越权承诺', value: 54 },
  { name: '催收红线措辞', value: 47 },
  { name: '服务规范缺失', value: 63 },
  { name: '情绪安抚不足', value: 39 },
  { name: '其他', value: 23 },
];

const COVERAGE = [
  { name: '年化利率告知', pct: 99.2 },
  { name: '冷静期告知', pct: 100 },
  { name: '个人信息授权', pct: 100 },
  { name: '逾期后果告知', pct: 96.4 },
  { name: '催收红线告知', pct: 98.1 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today');

  return (
    <div className="page">
      <PageHeader
        title="质检看板"
        subtitle="100% 全量 AI 质检 · 取代传统 1–3% 人工抽检 · 截至 2026-06-17 09:42 实时"
        actions={
          <Segmented
            value={range}
            onChange={(v: 'today' | 'week' | 'month') => setRange(v)}
            options={[{ value: 'today', label: '今日' }, { value: 'week', label: '本周' }, { value: 'month', label: '本月' }]}
          />
        }
      />

      {/* KPI 带 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard label="今日全量质检" raw={48620} unit="条" change={6.2} spark={[420, 460, 510, 540, 600, 640, 690]} icon={<FileSearch size={16} />} delayClass="reveal-1" />
        <StatCard label="质检合格率" raw={94.2} unit="%" change={0.6} decimals={1} spark={PASS_RATE.slice(-7)} icon={<ShieldCheck size={16} />} delayClass="reveal-2" />
        <StatCard label="违规拦截" raw={312} unit="条" change={-8.4} spark={[58, 52, 49, 44, 40, 37, 31]} icon={<AlertTriangle size={16} />} delayClass="reveal-3" />
        <StatCard label="待复核" raw={86} unit="条" change={-12.0} spark={[120, 112, 104, 98, 92, 88, 86]} icon={<Gavel size={16} />} delayClass="reveal-4" />
        <StatCard label="双录覆盖率" raw={100} unit="%" decimals={0} spark={[100, 100, 100, 100, 100, 100, 100]} icon={<Activity size={16} />} delayClass="reveal-5" />
      </div>

      {/* Row A：合格率/违规率趋势 + 双录 gauge */}
      <div className="grid" style={{ gridTemplateColumns: '1.7fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card className="reveal reveal-2">
          <SectionTitle right={<span className="t-small text-3">近 14 日</span>}>合格率 / 违规率趋势</SectionTitle>
          <Chart height={260} build={() => {
            const gold = cssVar('--gold'); const danger = cssVar('--danger');
            return {
              ...baseOption(),
              tooltip: { trigger: 'axis', ...(baseOption().tooltip as object) },
              legend: { show: true, top: 0, right: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: cssVar('--text-3'), fontSize: 11 } },
              grid: { left: 6, right: 8, top: 30, bottom: 6, containLabel: true },
              xAxis: { type: 'category', boundaryGap: false, data: DAYS, ...axisStyle() },
              yAxis: [
                { type: 'value', min: 88, max: 100, ...axisStyle(), axisLabel: { color: cssVar('--text-3'), fontSize: 11, formatter: '{value}%' } },
                { type: 'value', min: 0, max: 10, ...axisStyle(), splitLine: { show: false }, axisLabel: { color: cssVar('--text-3'), fontSize: 11, formatter: '{value}%' } },
              ],
              series: [
                { name: '合格率', type: 'line', smooth: true, symbol: 'none', data: PASS_RATE, lineStyle: { width: 2, color: gold }, itemStyle: { color: gold }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: gold + '2e' }, { offset: 1, color: gold + '00' }] } }, animationDuration: 900 },
                { name: '违规率', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 1, data: VIOL_RATE, lineStyle: { width: 2, color: danger }, itemStyle: { color: danger }, animationDuration: 900 },
              ],
            };
          }} />
        </Card>

        <Card className="reveal reveal-3">
          <SectionTitle right={<span className="t-small" style={{ color: 'var(--success)' }}>达标</span>}>双录覆盖率</SectionTitle>
          <Chart height={260} build={() => {
            const ok = cssVar('--success');
            return {
              series: [{
                type: 'gauge', startAngle: 220, endAngle: -40, min: 0, max: 100, radius: '92%', center: ['50%', '56%'],
                progress: { show: true, width: 14, itemStyle: { color: ok } },
                axisLine: { lineStyle: { width: 14, color: [[1, cssVar('--surface-3')]] } },
                axisTick: { show: false }, splitLine: { show: false },
                axisLabel: { show: false }, pointer: { show: false },
                anchor: { show: false },
                title: { offsetCenter: [0, '34%'], color: cssVar('--text-3'), fontSize: 12 },
                detail: { valueAnimation: true, offsetCenter: [0, '-4%'], fontSize: 38, fontWeight: 700, color: cssVar('--text-1'), formatter: '{value}%' },
                data: [{ value: 100, name: '监管目标 100%' }],
              }],
            };
          }} />
        </Card>
      </div>

      {/* Row B：业务线质检量&违规率 + 违规类型构成 */}
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card className="reveal reveal-3">
          <SectionTitle right={<span className="t-small text-3">柱=质检量 · 线=违规率</span>}>各业务线质检量 &amp; 违规率</SectionTitle>
          <Chart height={250} build={() => {
            const gold = cssVar('--gold'); const danger = cssVar('--danger');
            return {
              ...baseOption(),
              tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...(baseOption().tooltip as object) },
              grid: { left: 6, right: 8, top: 18, bottom: 6, containLabel: true },
              xAxis: { type: 'category', data: BIZ.map(b => b.line), ...axisStyle(), axisLabel: { color: cssVar('--text-3'), fontSize: 11, interval: 0 } },
              yAxis: [
                { type: 'value', ...axisStyle(), axisLabel: { color: cssVar('--text-3'), fontSize: 11 } },
                { type: 'value', min: 0, max: 8, ...axisStyle(), splitLine: { show: false }, axisLabel: { color: cssVar('--text-3'), fontSize: 11, formatter: '{value}%' } },
              ],
              series: [
                { name: '质检量', type: 'bar', data: BIZ.map(b => b.volume), barWidth: '46%', itemStyle: { color: gold, borderRadius: [4, 4, 0, 0] }, animationDelay: (i: number) => i * 60 },
                { name: '违规率', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 6, data: BIZ.map(b => b.viol), lineStyle: { width: 2, color: danger }, itemStyle: { color: danger } },
              ],
            };
          }} />
        </Card>

        <Card className="reveal reveal-4">
          <SectionTitle right={<span className="t-small text-3">本月</span>}>违规类型构成</SectionTitle>
          <Chart height={250} build={() => ({
            ...baseOption(),
            tooltip: { trigger: 'item', ...(baseOption().tooltip as object), formatter: '{b}: {c} 条 ({d}%)' },
            series: [{
              type: 'pie', radius: ['42%', '70%'], center: ['50%', '52%'], roseType: 'radius',
              itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2, borderRadius: 4 },
              label: { color: cssVar('--text-3'), fontSize: 11 },
              labelLine: { lineStyle: { color: cssVar('--hairline-strong') } },
              data: VIOL_TYPES.map((v, i) => ({ ...v, itemStyle: { color: [cssVar('--danger'), cssVar('--warning'), cssVar('--bronze'), cssVar('--c5'), cssVar('--c7'), cssVar('--text-3')][i] } })),
            }],
          })} />
        </Card>
      </div>

      {/* Row C：实时预警 + 合规话术覆盖率 */}
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <Card className="reveal reveal-4">
          <SectionTitle right={<button className="btn btn-subtle btn-sm" onClick={() => navigate('/alerts')}>实时预警流 <ArrowUpRight size={13} /></button>}>实时质检预警</SectionTitle>
          <div className="col gap-2">
            {ALERTS.map((a, i) => {
              const c = a.level === 'danger' ? 'var(--danger)' : a.level === 'warn' ? 'var(--warning)' : 'var(--info)';
              return (
                <div key={i} className="row gap-3" style={{ padding: '11px 12px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', borderLeft: `2px solid ${c}`, alignItems: 'flex-start' }}>
                  <AlertTriangle size={15} style={{ color: c, flexShrink: 0, marginTop: 1 }} />
                  <div className="flex-1">
                    <div className="spread">
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{a.title}</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.time}</span>
                    </div>
                    <div className="t-small text-3" style={{ marginTop: 3, lineHeight: 1.5 }}>{a.msg}</div>
                  </div>
                  <span className="badge" style={{ background: `color-mix(in srgb, ${c} 13%, transparent)`, color: c, flexShrink: 0 }}>{a.tag}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="reveal reveal-5">
          <SectionTitle right={<button className="btn btn-subtle btn-sm" onClick={() => navigate('/coverage')}>详情 <ArrowUpRight size={13} /></button>}>合规话术覆盖率</SectionTitle>
          <div className="col gap-4" style={{ marginTop: 2 }}>
            {COVERAGE.map(c => {
              const danger = c.pct < 100;
              return (
                <div key={c.name} className="col gap-2">
                  <div className="spread">
                    <span className="t-small" style={{ color: 'var(--text-2)' }}>{c.name}</span>
                    <span className="mono tnum" style={{ fontSize: 12.5, fontWeight: 600, color: danger ? 'var(--danger)' : 'var(--success)' }}>{c.pct}%</span>
                  </div>
                  <ProgressBar pct={c.pct} color={danger ? 'var(--danger)' : 'var(--success)'} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
