import { useMemo } from 'react';
import { Radio, ArrowUpRight, ArrowDownRight, Activity, Zap, ShieldCheck } from 'lucide-react';
import { Card, PageHeader, Sparkline, SectionTitle } from '../../components/ui';
import { MeterBar } from '../../components/kit';
import Chart from '../../components/Chart';
import { useCountUp, useInView, fmt } from '../../lib/hooks';
import { baseOption, axisStyle, cssVar } from '../../lib/chartTheme';
import { HERO, SELF_TRANSFER_TODAY, DUAL_TREND_6M, TARGET_SELF_RATE, PIPE_HEALTH, FLYWHEEL } from '../../lib/mock/dash';
import { CONVERSATIONS } from '../../lib/mock/conv';
import type { Kpi } from '../../types';
import './flywheel.css';

const EMO: Record<string, [string, string]> = { calm: ['var(--success)', '平稳'], upset: ['var(--warning)', '不满'], angry: ['var(--danger)', '愤怒'] };

function HeroStat({ k, i }: { k: Kpi; i: number }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const n = useCountUp(k.raw, 1000, inView);
  const baseline = k.change ? k.raw - k.change : null;
  const down = (k.change ?? 0) < 0;
  return (
    <div ref={ref} className={`card card-hover reveal reveal-${(i % 6) + 1}`} style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 9 }}>{k.label}</div>
      <div className="kpi-value" style={{ fontSize: 27 }}>
        {fmt(n, k.decimals ?? 0)}<span className="kpi-unit">{k.unit}</span>
      </div>
      {baseline !== null ? (
        <div className="row gap-1" style={{ marginTop: 7, fontSize: 11.5, color: 'var(--success)', fontWeight: 600 }}>
          {down ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
          <span className="tnum">基线 {fmt(baseline, k.decimals ?? 0)}{k.unit}</span>
        </div>
      ) : (
        <div style={{ marginTop: 7, fontSize: 11.5, color: 'var(--text-3)' }}>持续优化</div>
      )}
      {k.spark && <div style={{ marginTop: 10 }}><Sparkline data={k.spark} color="var(--gold)" width={120} height={26} /></div>}
    </div>
  );
}

function Flywheel() {
  const R = 118, C = 170;
  const nodes = FLYWHEEL.map((nd, i) => {
    const ang = (-90 + i * (360 / FLYWHEEL.length)) * (Math.PI / 180);
    return { ...nd, x: C + R * Math.cos(ang), y: C + R * Math.sin(ang) };
  });
  return (
    <div className="fw">
      <div className="fw-ring" />
      <div className="fw-track" />
      <div className="fw-dot" /><div className="fw-dot d2" /><div className="fw-dot d3" />
      {nodes.map(nd => (
        <div key={nd.key} className="fw-node" style={{ left: nd.x, top: nd.y }}>
          <div className="fw-node-mark" />
          <div className="fw-node-label">{nd.label}</div>
          <div className="fw-node-val">{nd.value}</div>
        </div>
      ))}
      <div className="fw-center">
        <div className="label" style={{ marginBottom: 4 }}>数据飞轮</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>300<span style={{ color: 'var(--text-3)', margin: '0 4px' }}>→</span><span className="gold">2 万</span></div>
        <div className="t-small text-3" style={{ marginTop: 4 }}>QA 库自驱扩容</div>
      </div>
    </div>
  );
}

export default function Overview() {
  const live = CONVERSATIONS.filter(c => c.status === '进行中').concat(CONVERSATIONS.filter(c => c.status !== '进行中')).slice(0, 5);

  const areaToday = useMemo(() => () => {
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

  const dualTrend = useMemo(() => () => {
    const teal = cssVar('--gold'), amber = cssVar('--warning');
    return {
      ...baseOption(),
      tooltip: { trigger: 'axis' as const, ...(baseOption().tooltip as object) },
      legend: { data: ['自助解决率', '转人工率'], textStyle: { color: cssVar('--text-2'), fontSize: 11 }, right: 0, top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
      grid: { left: 8, right: 14, top: 30, bottom: 6, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: DUAL_TREND_6M.map(d => d.date), ...axisStyle() },
      yAxis: { type: 'value', min: 0, max: 100, ...axisStyle(), axisLabel: { formatter: '{value}%', color: cssVar('--text-3'), fontSize: 11 } },
      series: [
        { name: '自助解决率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: teal }, itemStyle: { color: teal }, data: DUAL_TREND_6M.map(d => d.selfRate), animationDuration: 1000,
          markLine: { silent: true, symbol: 'none', lineStyle: { color: amber, type: 'dashed', width: 1.5 }, label: { formatter: '目标 80.1%', color: cssVar('--text-3'), fontSize: 10, position: 'insideEndTop' }, data: [{ yAxis: TARGET_SELF_RATE }] } },
        { name: '转人工率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: amber }, itemStyle: { color: amber }, data: DUAL_TREND_6M.map(d => d.transferRate), animationDuration: 1000 },
      ],
    };
  }, []);

  return (
    <div className="page">
      <PageHeader
        title="运营总览"
        subtitle="消金客服作战指挥屏 · 智能客服运营系统 · 截至 2026-06-16 09:42 实时"
        actions={<div className="svc-pill row gap-1"><Activity size={13} />系统服务占比 90.11% · 在线</div>}
      />

      {/* 6 大战绩 KPI */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(156px, 1fr))', marginBottom: 16 }}>
        {HERO.map((k, i) => <HeroStat key={k.label} k={k} i={i} />)}
      </div>

      {/* 主区：6 月趋势 + 数据飞轮签名 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.5fr 1fr', marginBottom: 16 }}>
        <Card className="reveal">
          <SectionTitle right={<span className="badge" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>超额达成目标线</span>}>自助率 & 转人工率 · 近 6 月趋势</SectionTitle>
          <Chart build={dualTrend} height={272} />
        </Card>
        <Card className="reveal reveal-2" style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionTitle>数据飞轮闭环</SectionTitle>
          <Flywheel />
          <div className="t-small text-3" style={{ textAlign: 'center', marginTop: 2, lineHeight: 1.6 }}>
            脱敏会话 → 大模型清洗替代人工标注 → 自动生成测试用例 → Badcase 闭环 → QA 库扩容
          </div>
        </Card>
      </div>

      {/* 实时对话流 + 当日 + pipeline 健康 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.2fr 1.1fr 1fr', marginBottom: 16 }}>
        <Card className="reveal" style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionTitle right={<span className="row gap-1 t-small" style={{ color: 'var(--gold)' }}><span className="dot-pulse" />实时</span>}>实时对话流</SectionTitle>
          <div className="col gap-2" style={{ flex: 1 }}>
            {live.map(c => {
              const [ec, el] = EMO[c.emotion];
              return (
                <div key={c.id} className="row gap-3 card-hover" style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--surface-2)' }}>
                  <Radio size={15} style={{ color: c.status === '已转人工' ? 'var(--warning)' : 'var(--gold)', flexShrink: 0 }} />
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="row gap-2"><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{c.customer}</span><span className="tag">{c.intentL1}</span></div>
                    <div className="t-small text-3" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{c.lastMsg}</div>
                  </div>
                  <span className="badge" style={{ background: `color-mix(in srgb, ${ec} 14%, transparent)`, color: ec, flexShrink: 0 }}>{el}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="reveal reveal-2">
          <SectionTitle>当日自助 vs 转人工</SectionTitle>
          <Chart build={areaToday} height={232} />
        </Card>

        <Card className="reveal reveal-3">
          <SectionTitle right={<Zap size={13} style={{ color: 'var(--gold)' }} />}>Pipeline 健康度</SectionTitle>
          <div className="col gap-3" style={{ marginTop: 2 }}>
            {PIPE_HEALTH.map(p => (
              <div key={p.code}>
                <div className="row spread" style={{ marginBottom: 5 }}>
                  <span className="row gap-2"><span className="mono" style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>{p.code}</span><span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{p.stage}</span></span>
                  <span className="row gap-2"><span className="tnum" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>{p.success}%</span><span className="mono t-small text-3 tnum">{p.avgMs}ms</span></span>
                </div>
                <MeterBar pct={p.success} color={p.success >= 99 ? 'var(--success)' : 'var(--gold)'} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 海外对标 */}
      <Card className="reveal" style={{ padding: '16px 20px' }}>
        <div className="row gap-4 wrap" style={{ justifyContent: 'space-between' }}>
          <div className="row gap-2"><ShieldCheck size={15} style={{ color: 'var(--gold)' }} /><span className="label" style={{ color: 'var(--text-2)' }}>海外对标 · 本系统 85.23% 自助率领先同框</span></div>
          <div className="row gap-5 wrap">
            {[['Sierra', 'ARR $200M · outcome-based'], ['Intercom Fin', '平均解决率 67%'], ['Decagon', 'hallucination detector'], ['Gartner', '2026 对话式 AI 省 $800 亿']].map(([n, d]) => (
              <div key={n} className="row gap-2"><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{n}</span><span className="t-small text-3">{d}</span></div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
