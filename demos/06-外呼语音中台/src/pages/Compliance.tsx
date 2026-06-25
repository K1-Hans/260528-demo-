import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Ban, AudioLines, Hash, FileLock2, Radar as RadarIcon, AreaChart, ScatterChart as ScatterIcon } from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { Panel } from '../components/sig';
import { DataTable, type Col } from '../components/DataTable';
import { StatusBadge, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, areaGradient, cssVar } from '../lib/chartTheme';
import { fmt } from '../lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import type { FreqStat, SensitiveWord, ComplianceEvent, ComplianceRadar, InterceptTrend } from '../types';

// ─── 页面专属 mock ──────────────────────────────────────────────────────────
const FREQ: FreqStat[] = [
  { label: '单客户日触达', used: 1, cap: 1 },
  { label: '单客户周触达', used: 2, cap: 3 },
  { label: '今日活动配额', used: 6840, cap: 10000 },
];
const QUOTA_USED = 68;   // 今日配额已用 %

const WORDS: SensitiveWord[] = [
  { word: '投诉', category: '投诉', hits: 18, action: '转人工' },
  { word: '银保监 / 监管举报', category: '投诉', hits: 7, action: '转人工' },
  { word: '高收益 / 稳赚不赔', category: '诱导', hits: 9, action: '挂断' },
  { word: '威胁 / 上门', category: '违禁', hits: 3, action: '封活动' },
  { word: '加微信 / 私下转账', category: '违禁', hits: 5, action: '挂断' },
  { word: '骚扰 / 别再打', category: '骚扰', hits: 5, action: '警告' },
];
const ACTION_TONE: Record<SensitiveWord['action'], 'good' | 'warn' | 'bad' | 'info'> = { 警告: 'info', 转人工: 'warn', 挂断: 'warn', 封活动: 'bad' };

const QUALS = [
  { name: '增值电信业务经营许可证', code: 'B2-2025****', expire: '2027-03-18', ok: true },
  { name: '外显号 021-6098 报备', code: '工信部备 2026****', expire: '2026-09-30', ok: true },
  { name: '线路供应商「示例云通信」资质', code: 'SP-2024****', expire: '2026-07-15', ok: false },
];

const EVENTS: ComplianceEvent[] = [
  { id: 'c1', type: '敏感词命中', detail: '坐席 #B12 · 138****2841 触发「投诉」→ 自动转人工', at: '刚刚', level: 'warn' },
  { id: 'c2', type: '号码风险', detail: '外显号 021-6098**** 封号风险升至 78 分 → 建议停用', at: '7 分钟前', level: 'danger' },
  { id: 'c3', type: '勿扰拦截', detail: '逾期 M1 提醒 · 312 通命中 21:00 后勿扰时段 → 顺延次日', at: '23 分钟前', level: 'warn' },
  { id: 'c4', type: '频控拦截', detail: '北京 138****9920 命中单客户日触达上限 → 本次拦截', at: '31 分钟前', level: 'warn' },
  { id: 'c5', type: '资质临期', detail: '线路供应商「示例云通信」资质 2026-07-15 到期 → 请提前续期', at: '1 小时前', level: 'info' },
];

const RADAR: ComplianceRadar[] = [
  { dim: '频控合规', value: 96 }, { dim: '敏感词拦截', value: 92 }, { dim: '资质有效', value: 88 },
  { dim: '号码健康', value: 84 }, { dim: '投诉率控制', value: 90 },
];
const TREND: InterceptTrend[] = Array.from({ length: 14 }, (_, i) => ({
  date: `06-${String(i + 7).padStart(2, '0')}`,
  freq: 70 + Math.round(40 * Math.abs(Math.sin(i * 0.6))),
  dnd: 14 + Math.round(22 * Math.abs(Math.sin(i * 0.5 + 1))),
  sensitive: 2 + Math.round(6 * Math.abs(Math.sin(i * 0.8 + 2))),
}));
// 号码健康散点 [呼叫量, 封号风险, 名称]
const SCATTER = Array.from({ length: 22 }, (_, i) => {
  const calls = 200 + Math.round(2800 * Math.abs(Math.sin(i * 1.3)));
  const risk = Math.min(95, Math.round(8 + calls / 40 + 18 * Math.abs(Math.cos(i * 0.9))));
  return [calls, risk];
});

export default function Compliance() {
  const { hasPermission } = useAuth();
  const canAct = hasPermission('compliance:act');
  const [frozen, setFrozen] = useState(false);

  const radarOpt = () => ({
    ...baseOption(),
    radar: {
      indicator: RADAR.map(r => ({ name: r.dim, max: 100 })),
      radius: '66%', center: ['50%', '54%'],
      axisName: { color: cssVar('--text-3'), fontSize: 11 },
      splitLine: { lineStyle: { color: cssVar('--hairline') } },
      axisLine: { lineStyle: { color: cssVar('--hairline') } },
      splitArea: { areaStyle: { color: ['transparent', 'color-mix(in srgb, var(--gold) 4%, transparent)'] } },
    },
    series: [{
      type: 'radar', data: [{
        value: RADAR.map(r => r.value), name: '合规水位',
        areaStyle: { color: 'color-mix(in srgb, var(--gold) 18%, transparent)' },
        lineStyle: { color: cssVar('--gold'), width: 2 }, itemStyle: { color: cssVar('--gold') },
      }],
    }],
  });

  const trendOpt = () => ({
    ...baseOption(),
    legend: { bottom: 0, textStyle: { color: cssVar('--text-3'), fontSize: 11 }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
    grid: { left: 8, right: 16, top: 18, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: TREND.map(t => t.date), ...axisStyle() },
    yAxis: { type: 'value', ...axisStyle() },
    series: [
      { name: '频控拦截', type: 'line', stack: 'x', smooth: true, symbol: 'none', data: TREND.map(t => t.freq), lineStyle: { width: 1.4, color: cssVar('--gold') }, areaStyle: { color: areaGradient(cssVar('--gold'), 0.22) } },
      { name: '勿扰拦截', type: 'line', stack: 'x', smooth: true, symbol: 'none', data: TREND.map(t => t.dnd), lineStyle: { width: 1.4, color: cssVar('--warning') }, areaStyle: { color: areaGradient(cssVar('--warning'), 0.22) } },
      { name: '敏感词命中', type: 'line', stack: 'x', smooth: true, symbol: 'none', data: TREND.map(t => t.sensitive), lineStyle: { width: 1.4, color: cssVar('--danger') }, areaStyle: { color: areaGradient(cssVar('--danger'), 0.22) } },
    ],
  });

  const scatterOpt = () => ({
    ...baseOption(),
    grid: { left: 8, right: 16, top: 18, bottom: 28, containLabel: true },
    xAxis: { type: 'value', name: '今日呼量', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle() },
    yAxis: { type: 'value', name: '封号风险', max: 100, nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle() },
    tooltip: { ...(baseOption().tooltip as object), formatter: (p: { value: number[] }) => `呼量 ${p.value[0]}<br/>封号风险 ${p.value[1]}` },
    series: [{
      type: 'scatter', data: SCATTER,
      symbolSize: (v: number[]) => 7 + v[1] / 10,
      itemStyle: { color: (p: { value: number[] }) => p.value[1] >= 70 ? cssVar('--danger') : p.value[1] >= 45 ? cssVar('--warning') : cssVar('--success'), opacity: 0.82 },
      markLine: { silent: true, symbol: 'none', lineStyle: { color: cssVar('--danger'), type: 'dashed', opacity: 0.6 }, data: [{ yAxis: 70 }], label: { formatter: '风险阈 70', color: cssVar('--danger'), fontSize: 10 } },
    }],
  });

  const wordCols: Col<SensitiveWord>[] = [
    { key: 'word', header: '敏感词 / 骚扰词', render: r => <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{r.word}</span> },
    { key: 'category', header: '类别', render: r => <span className="tag">{r.category}</span> },
    { key: 'hits', header: '本月命中', num: true, sortable: true, render: r => <span className="mononum">{r.hits}</span> },
    { key: 'action', header: '触发动作', render: r => <StatusBadge status={r.action} tone={ACTION_TONE[r.action]} /> },
  ];

  return (
    <div className="page page-wide">
      <PageHeader
        title="合规与质检中心"
        subtitle="把「不被罚 · 不封号 · 可追溯」做成产品 — 频控 / 敏感词 / 资质 / 录音留痕"
        actions={
          <button className="btn btn-danger" disabled={!canAct || frozen} onClick={() => { setFrozen(true); toast('已封停违规活动 · 在呼通话安全挂断 · 已生成审计流水', 'danger'); }}>
            <Ban size={14} />{frozen ? '已封停违规活动' : '一键封停违规活动'}
          </button>
        }
      />

      {/* 立威背景条 */}
      <div className="card reveal" style={{ marginBottom: 14, borderLeft: '2px solid var(--gold)', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <ShieldCheck size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <div className="t-small text-2" style={{ lineHeight: 1.6 }}>
          工信部累计处罚违规外呼企业 <b className="gold mononum">&gt;1,500</b> 家（骚扰 / 数据泄露 / 线路违规），市面 <b className="gold mononum">&gt;40%</b> 产品存在参数虚标 / 高封号率 / 资质缺失。本中台将合规频控、外呼资质、录音留痕做成一等公民。
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        <StatCard label="本月频控拦截" raw={1284} unit="次" change={8.2} icon={<ShieldCheck size={16} />} delayClass="reveal-1" />
        <StatCard label="勿扰时段拦截" raw={312} unit="次" change={-4.1} icon={<ShieldAlert size={16} />} delayClass="reveal-2" />
        <StatCard label="敏感词命中" raw={47} unit="次" change={-12.6} icon={<AudioLines size={16} />} delayClass="reveal-3" />
        <StatCard label="号码风险预警" raw={3} unit="条" change={0} icon={<Hash size={16} />} delayClass="reveal-4" />
      </div>

      {/* 频控仪表 + 合规雷达 + 资质台账 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="频控仪表" icon={<ShieldCheck size={13} />}>
          <div className="col" style={{ alignItems: 'center', marginBottom: 12 }}>
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface-3)" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--gold)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${QUOTA_USED * 3.14} 314`} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mononum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>{QUOTA_USED}%</span>
                <span className="t-small text-3">今日配额已用</span>
              </div>
            </div>
          </div>
          <div className="col gap-3">
            {FREQ.map((f, i) => (
              <div key={i}>
                <div className="row spread" style={{ marginBottom: 4 }}>
                  <span className="t-small text-2">{f.label}</span>
                  <span className="mononum t-small text-3">{fmt(f.used)} / {fmt(f.cap)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (f.used / f.cap) * 100)}%`, background: f.used >= f.cap ? 'var(--warning)' : 'var(--success)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="合规风险雷达" icon={<RadarIcon size={13} />}>
          <Chart build={radarOpt} height={236} />
        </Panel>

        <Panel title="外呼资质与外显号台账" icon={<FileLock2 size={13} />}>
          <div className="col gap-3">
            {QUALS.map((q, i) => (
              <div key={i} className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
                <div className="row spread" style={{ marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{q.name}</span>
                  {q.ok
                    ? <span className="qual-badge"><ShieldCheck size={11} />有效</span>
                    : <StatusBadge status="临期" tone="warn" />}
                </div>
                <div className="row spread">
                  <span className="mono t-small text-3">{q.code}</span>
                  <span className="mono t-small" style={{ color: q.ok ? 'var(--text-3)' : 'var(--warning)' }}>至 {q.expire}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* 违规拦截趋势 + 号码健康散点 */}
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="违规拦截趋势" icon={<AreaChart size={13} />} right={<span className="t-small text-3">近 14 天 · 堆叠</span>}>
          <Chart build={trendOpt} height={250} />
        </Panel>
        <Panel title="号码健康分布" icon={<ScatterIcon size={13} />} right={<span className="t-small text-3">呼量 × 封号风险</span>}>
          <Chart build={scatterOpt} height={250} />
        </Panel>
      </div>

      {/* 敏感词库 + 违规事件流 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Panel title="敏感词 / 骚扰词库" icon={<AudioLines size={13} />} right={<span className="t-small text-3">命中即触发动作</span>} bodyClass="panel-body-0">
          <DataTable cols={wordCols} rows={WORDS} rowKey={r => r.word} defaultSort={{ key: 'hits', dir: 'desc' }} />
        </Panel>
        <Panel title="违规自动拦截事件流" icon={<ShieldAlert size={13} />} right={<span className="row gap-2"><span className="live-pulse" /><span className="t-small text-3">实时</span></span>} bodyClass="panel-body-0">
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {EVENTS.map(e => (
              <div key={e.id} className="event-row">
                <span className="state-dot" style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: e.level === 'danger' ? 'var(--danger)' : e.level === 'warn' ? 'var(--warning)' : 'var(--info)' }} />
                <span className="tag" style={{ flexShrink: 0 }}>{e.type}</span>
                <span style={{ flex: 1, color: 'var(--text-2)', fontSize: 12 }}>{e.detail}</span>
                <span className="mono t-small text-3" style={{ flexShrink: 0 }}>{e.at}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
