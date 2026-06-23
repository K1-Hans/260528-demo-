import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Search, Download, ThumbsDown, BarChart3 } from 'lucide-react';
import { Card, PageHeader, SectionTitle } from '../../components/ui';
import { DataTable, type Col } from '../../components/DataTable';
import { Toolbar, Modal, MeterBar, toast } from '../../components/kit';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar } from '../../lib/chartTheme';
import { DASH_KPIS, INTENT_TOP10, SELF_TRANSFER_TODAY } from '../../lib/mock/dash';
import { useCountUp, useInView, fmt } from '../../lib/hooks';
import type { Kpi, IntentTopRow } from '../../types';

// ── 近 7 日逐日序列：取自 spark 末 7 位，配真实日期标签（T-7 → T-1）──
const DAY_LABELS = ['06-10', '06-11', '06-12', '06-13', '06-14', '06-15', '06-16'];
function last7(spark: number[] | undefined): number[] {
  const s = spark ?? [];
  return s.slice(Math.max(0, s.length - 7));
}

// ── 点踩 TOP10 问题（近 7 日 · 真实消金高频差评问题）──
interface BadcaseQ { q: string; count: number; l1: string }
const DISLIKE_TOP10: BadcaseQ[] = [
  { q: '提前结清手续费怎么算', count: 4, l1: '费用相关' },
  { q: '逾期会影响征信吗', count: 3, l1: '催收相关' },
  { q: '为什么我的额度被降了', count: 3, l1: '申请咨询' },
  { q: '协商还款怎么申请', count: 2, l1: '还款相关' },
  { q: '结清证明多久能开出来', count: 2, l1: '业务办理' },
  { q: '会员费扣了能退吗', count: 2, l1: '营销活动' },
  { q: '换绑银行卡一直失败', count: 1, l1: '信息维护' },
  { q: '我没借钱为什么催收找我', count: 1, l1: '催收相关' },
  { q: '利息算得对不对', count: 1, l1: '费用相关' },
  { q: '注销账户后还能再申请吗', count: 1, l1: '业务办理' },
  { q: '宽限期内还款算逾期吗', count: 1, l1: '还款相关' },
  { q: '征信报告怎么消除记录', count: 1, l1: '催收相关' },
];

// ── KPI 卡（自定义 · count-up + 日环比 + 周环比 + mini 柱图）──
function KpiCard({ k, i, onOpen }: { k: Kpi; i: number; onOpen: (k: Kpi) => void }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const dp = k.decimals ?? (k.unit === '%' ? 1 : 0);
  const n = useCountUp(k.raw, 950, inView);
  const good = k.tone !== 'bad';                 // 真值取自数据 tone（点踩/转人工/拒识"降为好"已编码）
  const tone = good ? 'var(--success)' : 'var(--danger)';
  const dod = k.change ?? 0;
  const DodIcon = dod === 0 ? Minus : dod > 0 ? TrendingUp : TrendingDown;
  const days = last7(k.spark);
  const dmax = Math.max(...days, 1);

  const miniBar = useMemo(() => () => ({
    ...baseOption(),
    grid: { left: 0, right: 0, top: 4, bottom: 0, containLabel: false },
    tooltip: {
      ...(baseOption().tooltip as object), trigger: 'axis' as const,
      formatter: (p: { dataIndex: number; value: number }[]) =>
        `${DAY_LABELS[p[0].dataIndex]} · ${fmt(p[0].value, dp)}${k.unit ?? ''}`,
    },
    xAxis: { type: 'category', show: false, data: DAY_LABELS, boundaryGap: true },
    yAxis: { type: 'value', show: false, min: Math.min(...days) * 0.94 },
    series: [{
      type: 'bar', data: days, barWidth: '52%',
      itemStyle: {
        color: (p: { dataIndex: number }) => p.dataIndex === days.length - 1 ? cssVar('--gold') : 'var(--surface-3)',
        borderRadius: [3, 3, 0, 0],
      },
      animationDelay: (idx: number) => 120 + idx * 45,
    }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [dmax]);

  return (
    <div
      ref={ref}
      className={`card card-hover reveal reveal-${(i % 6) + 1}`}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
      onClick={() => onOpen(k)}
    >
      <div className="spread" style={{ marginBottom: 9 }}>
        <span className="label">{k.label}</span>
        <BarChart3 size={14} style={{ color: 'var(--text-3)', opacity: 0.6 }} />
      </div>
      <div className="kpi-value tnum" style={{ fontSize: 30 }}>
        {fmt(n, dp)}<span className="kpi-unit">{k.unit}</span>
      </div>
      <div className="row gap-3" style={{ marginTop: 9, alignItems: 'baseline' }}>
        <span className="row gap-1 tnum" style={{ color: tone, fontSize: 12.5, fontWeight: 700 }}>
          <DodIcon size={13} />{dod > 0 ? '+' : ''}{dod}%
          <span className="text-3" style={{ fontWeight: 400, marginLeft: 1 }}>日环比</span>
        </span>
        {k.weekChange !== undefined && (
          <span className="t-small text-3 tnum">
            周 {k.weekChange > 0 ? '+' : ''}{k.weekChange}%
          </span>
        )}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 12, height: 46 }}>
        <Chart build={miniBar} height={42} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [active, setActive] = useState<Kpi | null>(null);
  const [from, setFrom] = useState('2026-06-10');
  const [to, setTo] = useState('2026-06-16');

  const dislikeMax = Math.max(...DISLIKE_TOP10.map(d => d.count));

  // 触发意图占比基数 = TOP10 总次数
  const intentTotal = useMemo(() => INTENT_TOP10.reduce((s, r) => s + r.count, 0), []);

  // 当日自助 vs 转人工（堆叠面积 · 真 ECharts）
  const selfTransfer = useMemo(() => () => {
    const teal = cssVar('--gold'), amber = cssVar('--warning');
    return {
      ...baseOption(),
      tooltip: { trigger: 'axis' as const, ...(baseOption().tooltip as object) },
      legend: { data: ['自助解决', '转人工'], textStyle: { color: cssVar('--text-2'), fontSize: 11 }, right: 0, top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
      grid: { left: 8, right: 12, top: 30, bottom: 6, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: SELF_TRANSFER_TODAY.map(d => d.date), ...axisStyle() },
      yAxis: { type: 'value', ...axisStyle() },
      series: [
        { name: '自助解决', type: 'line', stack: 'total', smooth: true, symbol: 'none', lineStyle: { width: 2, color: teal }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: teal + '4d' }, { offset: 1, color: teal + '00' }] } }, data: SELF_TRANSFER_TODAY.map(d => d.selfService), animationDuration: 900 },
        { name: '转人工', type: 'line', stack: 'total', smooth: true, symbol: 'none', lineStyle: { width: 2, color: amber }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: amber + '42' }, { offset: 1, color: amber + '00' }] } }, data: SELF_TRANSFER_TODAY.map(d => d.transfer), animationDuration: 900 },
      ],
    };
  }, []);

  // 趋势弹窗：选中 KPI 近 7 日柱状
  const trendModal = useMemo(() => () => {
    if (!active) return {};
    const days = last7(active.spark);
    const dp = active.decimals ?? (active.unit === '%' ? 1 : 0);
    const good = active.tone !== 'bad';
    return {
      ...baseOption(),
      tooltip: {
        ...(baseOption().tooltip as object), trigger: 'axis' as const,
        formatter: (p: { dataIndex: number; value: number }[]) =>
          `${DAY_LABELS[p[0].dataIndex]}<br/>${active.label}：<b>${fmt(p[0].value, dp)}${active.unit ?? ''}</b>`,
      },
      grid: { left: 8, right: 14, top: 18, bottom: 6, containLabel: true },
      xAxis: { type: 'category', data: DAY_LABELS, ...axisStyle() },
      yAxis: { type: 'value', ...axisStyle(), axisLabel: { ...((axisStyle() as { axisLabel: object }).axisLabel), formatter: (v: number) => `${fmt(v, dp)}${active.unit ?? ''}` } },
      series: [{
        type: 'bar', data: days, barWidth: '46%',
        itemStyle: {
          color: (pt: { dataIndex: number }) => pt.dataIndex === days.length - 1 ? cssVar('--gold') : (good ? 'color-mix(in srgb, var(--success) 38%, var(--surface-3))' : 'color-mix(in srgb, var(--danger) 32%, var(--surface-3))'),
          borderRadius: [4, 4, 0, 0],
        },
        animationDelay: (idx: number) => idx * 55,
      }],
    };
  }, [active]);

  const cols: Col<IntentTopRow>[] = [
    { key: 'rank', header: '#', width: 52, num: true, render: r => <span className="mono tnum" style={{ color: r.rank <= 3 ? 'var(--gold)' : 'var(--text-3)', fontWeight: 700 }}>{r.rank}</span> },
    { key: 'l1', header: '一级意图', render: r => <span className="tag">{r.l1}</span>, nowrap: true },
    { key: 'l2', header: '二级意图', render: r => <span style={{ color: 'var(--text-2)' }}>{r.l2}</span>, nowrap: true },
    { key: 'l3', header: '三级意图', render: r => <span className="text-3">{r.l3}</span>, nowrap: true },
    {
      key: 'count', header: '次数', width: 180, sortable: true, sortAccessor: r => r.count,
      render: r => (
        <div className="row gap-3" style={{ justifyContent: 'flex-end' }}>
          <span className="tnum" style={{ fontWeight: 700, color: 'var(--text-1)', minWidth: 38, textAlign: 'right' }}>{fmt(r.count)}</span>
          <div style={{ width: 84 }}><MeterBar pct={(r.count / INTENT_TOP10[0].count) * 100} color="var(--gold)" /></div>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="数据看板"
        subtitle="核心指标按天汇总 · 最后更新 2026-06-17 06:00"
        actions={
          <button className="btn btn-subtle" onClick={() => toast('数据已是最新（T-1 日汇总 · 06:00 跑批）', 'info')}>
            <RefreshCw size={14} />刷新
          </button>
        }
      />

      {/* 4 张 KPI 卡 · 点击弹趋势 */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 16 }}>
        {DASH_KPIS.map((k, i) => <KpiCard key={k.label} k={k} i={i} onOpen={setActive} />)}
      </div>

      {/* 触发意图 TOP10 + 点踩 TOP10 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.55fr 1fr', marginBottom: 16 }}>
        <Card className="reveal">
          <SectionTitle right={<span className="t-small text-3 tnum">合计 {fmt(intentTotal)} 次</span>}>触发意图 TOP10</SectionTitle>
          <Toolbar>
            <div className="input-wrap">
              <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 150 }} aria-label="起始日期" />
            </div>
            <span className="text-3" style={{ alignSelf: 'center' }}>—</span>
            <div className="input-wrap">
              <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} style={{ width: 150 }} aria-label="结束日期" />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => toast(`已查询 ${from} 至 ${to} 意图分布`, 'success')}><Search size={13} />查询</button>
            <button className="btn btn-subtle btn-sm" onClick={() => toast('意图 TOP10 已导出为 CSV', 'success')}><Download size={13} />导出</button>
          </Toolbar>
          <DataTable
            cols={cols}
            rows={INTENT_TOP10}
            rowKey={r => String(r.rank)}
            defaultSort={{ key: 'count', dir: 'desc' }}
            empty={{ title: '该时段无意图触发' }}
          />
        </Card>

        <Card className="reveal reveal-2" style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionTitle right={<span className="row gap-1 t-small" style={{ color: 'var(--danger)' }}><ThumbsDown size={12} />近 7 日</span>}>点踩 TOP10 问题</SectionTitle>
          <div className="col" style={{ gap: 1 }}>
            {DISLIKE_TOP10.map((d, i) => (
              <div
                key={d.q}
                className="row spread card-hover"
                style={{ padding: '9px 11px', borderRadius: 9, gap: 12 }}
              >
                <span className="mono tnum text-3" style={{ width: 18, flexShrink: 0, fontSize: 11.5 }}>{i + 1}</span>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: 'underline', textDecorationColor: 'color-mix(in srgb, var(--danger) 55%, transparent)', textUnderlineOffset: 3,
                    }}
                  >{d.q}</div>
                  <div className="t-small text-3" style={{ marginTop: 2 }}>{d.l1}</div>
                </div>
                <span
                  className="tnum"
                  style={{
                    flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--danger)',
                    background: `color-mix(in srgb, var(--danger) ${10 + (d.count / dislikeMax) * 12}%, transparent)`,
                    padding: '2px 9px', borderRadius: 7,
                  }}
                >{d.count} 次</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 当日自助 vs 转人工（真 ECharts）*/}
      <Card className="reveal reveal-3">
        <SectionTitle right={<span className="svc-pill">今日 · 截至 19:00</span>}>当日自助 vs 转人工 · 小时级</SectionTitle>
        <Chart build={selfTransfer} height={260} />
      </Card>

      {/* 趋势弹窗 */}
      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `${active.label} · 近 7 日趋势` : ''}
        sub="按天汇总 · 06-10 至 06-16（T-1）"
        width={560}
      >
        {active && (
          <>
            <div className="row gap-5 wrap" style={{ marginBottom: 16 }}>
              <div>
                <div className="label" style={{ marginBottom: 4 }}>昨日</div>
                <div className="kpi-value tnum" style={{ fontSize: 26 }}>{fmt(active.raw, active.decimals ?? (active.unit === '%' ? 1 : 0))}<span className="kpi-unit">{active.unit}</span></div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 4 }}>日环比</div>
                <div className="tnum" style={{ fontSize: 17, fontWeight: 700, color: active.tone !== 'bad' ? 'var(--success)' : 'var(--danger)' }}>{(active.change ?? 0) > 0 ? '+' : ''}{active.change}%</div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 4 }}>周环比</div>
                <div className="tnum text-2" style={{ fontSize: 17, fontWeight: 700 }}>{(active.weekChange ?? 0) > 0 ? '+' : ''}{active.weekChange}%</div>
              </div>
            </div>
            <Chart build={trendModal} height={240} deps={[active.label]} />
          </>
        )}
      </Modal>
    </div>
  );
}
