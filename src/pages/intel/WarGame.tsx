import { useMemo, useState } from 'react';
import {
  Swords, Shield, Crosshair, Zap, DollarSign, Package, Network as NetIcon,
  Megaphone, AlertTriangle, Target, ChevronRight, Activity,
} from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, Segmented } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM, BRAND_COLORS } from '../../lib/chartTheme';
import { COMPETITORS } from '../../lib/mockData';

const RED = 'var(--danger)';   // 竞方（红军）
const BLUE = 'var(--info)';    // 我方（蓝军）
const SELF = BRAND_COLORS['理想'];

// ── 战棋场景（本地定义，每个 = 一个竞品动作）─────────────────────────────────
type Lane = 'price' | 'product' | 'channel' | 'marketing';
interface ImpactRow { model: string; orderDelta: number; note: string; } // 订单影响 %（负=承压）
interface Playbook { lane: Lane; redMove: string; blueMove: string; }
interface Scenario {
  id: string;
  brand: string;
  title: string;
  segment: string;
  severity: 'high' | 'mid' | 'low';
  redBrief: string;       // 竞方动作简报
  impacts: ImpactRow[];   // 对我方车型的冲击
  playbook: Playbook[];   // 四车道红蓝对抗
}

const SCENARIOS: Scenario[] = [
  {
    id: 'w1', brand: '问界', title: 'M9 官降 3 万', segment: '大型SUV', severity: 'high',
    redBrief: '问界 M9 限时直降 ¥30,000，叠加华为智驾权益，正面冲击 40-50 万大型增程 SUV，矛头直指理想 L9 基本盘。',
    impacts: [
      { model: 'L9', orderDelta: -14, note: '同价位同品类正面对位，订单承压最大' },
      { model: 'L8', orderDelta: -6, note: '高配用户向下分流部分意向' },
      { model: 'L7', orderDelta: -2, note: '价位错开，间接溢出影响' },
    ],
    playbook: [
      { lane: 'price', redMove: '裸车直降 3 万 + 0 息 24 期', blueMove: 'L9 不跟降，发万元充电桩+保养礼包守住价格刚性' },
      { lane: 'product', redMove: '强推 ADS 3.0 城区智驾', blueMove: '放大六座家庭场景与冰箱彩电心智，错位竞争' },
      { lane: 'channel', redMove: '华为门店高客流引流', blueMove: '直营深度试驾日 + 老车主转介绍加权' },
      { lane: 'marketing', redMove: '智驾技术流种草', blueMove: 'family KOL 全家出行实测，主打空间与安全' },
    ],
  },
  {
    id: 'w2', brand: '小米', title: 'SUV 上市 (YU7)', segment: '中大型SUV', severity: 'high',
    redBrief: '小米首款 SUV 以极致性价比 + 生态卖点高调上市，预售流量爆表，分流 30 万级年轻家庭与科技尝鲜用户。',
    impacts: [
      { model: 'L6', orderDelta: -11, note: '价位与目标人群高度重叠，首当其冲' },
      { model: 'L7', orderDelta: -7, note: '科技尝鲜用户被生态卖点吸引' },
      { model: 'L8', orderDelta: -3, note: '边缘人群轻度分流' },
    ],
    playbook: [
      { lane: 'price', redMove: '入门价下探至 25 万区间', blueMove: 'L6 限时购置补贴贴息，强化落地价透明' },
      { lane: 'product', redMove: '澎湃生态 + 性能参数', blueMove: '增程无续航焦虑 + 成熟家用口碑做差异' },
      { lane: 'channel', redMove: '商超快闪 + 线上预订', blueMove: '门店亲子体验区，主攻已购家庭复购' },
      { lane: 'marketing', redMove: '流量明星 + 米粉势能', blueMove: '真实车主长测内容，对冲首发热度泡沫' },
    ],
  },
  {
    id: 'w3', brand: '蔚来', title: '加电权益升级', segment: '中大型SUV', severity: 'mid',
    redBrief: '蔚来宣布换电站扩容 + 终身免费换电回归，强化补能护城河，瞄准对续航补能焦虑的高端纯电用户。',
    impacts: [
      { model: 'L7', orderDelta: -5, note: '纯电意向用户被补能权益吸引' },
      { model: 'L8', orderDelta: -3, note: '部分高端用户重新评估补能方案' },
      { model: 'L9', orderDelta: -1, note: '增程基本盘稳固，影响有限' },
    ],
    playbook: [
      { lane: 'price', redMove: '权益等价让利约 2 万', blueMove: '不卷补能补贴，主打增程综合用车成本更低' },
      { lane: 'product', redMove: '换电 3 分钟补能体验', blueMove: '增程加油即走，长途无焦虑场景实证' },
      { lane: 'channel', redMove: 'NIO House 体验升级', blueMove: '高速服务区增程长途路演触达' },
      { lane: 'marketing', redMove: '补能生态叙事', blueMove: '冬季/长途真实能耗对比内容反制' },
    ],
  },
  {
    id: 'w4', brand: '比亚迪', title: '汉 L 价格下探', segment: '中大型轿车', severity: 'mid',
    redBrief: '比亚迪汉 L 以 20 万内插混强势下探中大型轿车市场，月销破 1.8 万高歌猛进，挤压增程家用预算盘。',
    impacts: [
      { model: 'L6', orderDelta: -8, note: '预算敏感家庭用户被低价插混吸引' },
      { model: 'L7', orderDelta: -4, note: 'SUV/轿车跨品类轻度分流' },
      { model: 'MEGA', orderDelta: -1, note: '品类差异大，影响微弱' },
    ],
    playbook: [
      { lane: 'price', redMove: '插混下探 20 万以内', blueMove: 'L6 主打 SUV 空间溢价，不进轿车价格战' },
      { lane: 'product', redMove: 'DM-i 超低油耗', blueMove: '大空间 + 增程综合体验做品类区隔' },
      { lane: 'channel', redMove: '海量经销商铺货', blueMove: '直营品质服务体验，强化中高端定位' },
      { lane: 'marketing', redMove: '销量榜单造势', blueMove: '家庭场景口碑沉淀，弱化单纯比价' },
    ],
  },
];

const LANE_META: Record<Lane, { label: string; icon: React.ReactNode }> = {
  price: { label: '价格', icon: <DollarSign size={13} /> },
  product: { label: '产品', icon: <Package size={13} /> },
  channel: { label: '渠道', icon: <NetIcon size={13} /> },
  marketing: { label: '营销', icon: <Megaphone size={13} /> },
};
const LANE_ORDER: Lane[] = ['price', 'product', 'channel', 'marketing'];
const SEV_COLOR = { high: 'var(--danger)', mid: 'var(--warning)', low: 'var(--info)' } as const;
const SEV_LABEL = { high: '高威胁', mid: '中威胁', low: '低威胁' } as const;

// ── chart: 对我方车型订单冲击 (bar) ──────────────────────────────────────────
const impactOption = (sc: Scenario) => {
  const b = baseOption();
  const d = [...sc.impacts].sort((a, x) => a.orderDelta - x.orderDelta);
  return {
    ...b,
    grid: { left: 8, right: 48, top: 8, bottom: 6, containLabel: true },
    tooltip: {
      ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (p: { name: string; value: number }[]) => `${p[0].name}　订单影响 <b>${p[0].value}%</b>`,
    },
    xAxis: { type: 'value', max: 2, min: -16, axisLabel: { formatter: '{value}%', color: cssVar('--text-3'), fontSize: 11 }, splitLine: { lineStyle: { color: cssVar('--hairline'), type: 'dashed' } } },
    yAxis: { type: 'category', data: d.map(x => x.model), ...axisStyle(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...axisStyle().axisLabel, color: cssVar('--text-2'), fontWeight: 600 } },
    series: [{
      type: 'bar', barWidth: 16,
      data: d.map(x => ({ value: x.orderDelta, itemStyle: { color: x.orderDelta < 0 ? RED : 'var(--success)', borderRadius: x.orderDelta < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0] } })),
      label: { show: true, position: 'left', formatter: (p: { value: number }) => `${p.value}%`, color: cssVar('--danger'), fontSize: 11, fontWeight: 700 },
      ...ANIM,
    }],
  };
};

// ── chart: 应对前 / 后 车型竞争力雷达 ────────────────────────────────────────
const radarOption = (sc: Scenario) => {
  const b = baseOption();
  const dims = ['价格力', '产品力', '渠道触达', '营销声量', '用户心智'];
  // 应对前：受冲击削弱；应对后：剧本拉回。确定性派生于场景严重度。
  const sevHit = sc.severity === 'high' ? 22 : sc.severity === 'mid' ? 14 : 8;
  const base = [72, 86, 70, 68, 84];
  const before = base.map((v, i) => Math.max(40, v - sevHit + (i % 2 === 0 ? -4 : 2)));
  const after = base.map((v, i) => Math.min(96, before[i] + sevHit + 6 + (i === 1 ? 4 : 0)));
  return {
    ...b,
    legend: { data: ['应对前', '应对后'], top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 11 } },
    radar: {
      indicator: dims.map(name => ({ name, max: 100 })),
      center: ['50%', '56%'], radius: '64%',
      axisName: { color: cssVar('--text-3'), fontSize: 11 },
      splitLine: { lineStyle: { color: cssVar('--hairline') } },
      splitArea: { show: false }, axisLine: { lineStyle: { color: cssVar('--hairline') } },
    },
    series: [{
      type: 'radar', ...ANIM,
      data: [
        { value: before, name: '应对前', areaStyle: { color: 'rgba(255,107,122,0.16)' }, lineStyle: { color: RED, width: 2, type: 'dashed' }, itemStyle: { color: RED } },
        { value: after, name: '应对后', areaStyle: { color: 'rgba(90,168,255,0.20)' }, lineStyle: { color: BLUE, width: 2 }, itemStyle: { color: BLUE } },
      ],
    }],
  };
};

export default function WarGame() {
  const [activeId, setActiveId] = useState(SCENARIOS[0].id);
  const [chartView, setChartView] = useState<'impact' | 'radar'>('impact');
  const sc = useMemo(() => SCENARIOS.find(s => s.id === activeId) ?? SCENARIOS[0], [activeId]);

  const totalHit = sc.impacts.reduce((s, x) => s + x.orderDelta, 0);
  const worst = [...sc.impacts].sort((a, b) => a.orderDelta - b.orderDelta)[0];

  return (
    <div className="page">
      <PageHeader
        title="竞品战棋推演"
        subtitle="2026年5月 · 模拟竞品动作 → 冲击评估 → 红蓝对抗应对剧本"
        actions={<Badge color="var(--danger)"><Swords size={12} /> 红蓝对抗沙盘 · 推演模式</Badge>}
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: '300px 1fr', alignItems: 'start' }}>
        {/* ── 左：竞品动作选择器 ── */}
        <Card className="card-pad-0 reveal reveal-1" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--hairline)' }}>
            <span className="row gap-2 label"><Crosshair size={13} style={{ color: RED }} />竞方动作推演库</span>
            <p className="t-small text-3" style={{ marginTop: 6, lineHeight: 1.5 }}>选择一个竞品动作，沙盘即时生成冲击评估与应对剧本</p>
          </div>
          <div className="col">
            {SCENARIOS.map((s, i) => {
              const on = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className="col gap-2"
                  style={{
                    textAlign: 'left', padding: '14px 18px', cursor: 'pointer',
                    borderBottom: i < SCENARIOS.length - 1 ? '1px solid var(--hairline)' : 'none',
                    borderLeft: `3px solid ${on ? SEV_COLOR[s.severity] : 'transparent'}`,
                    background: on ? 'var(--surface-2)' : 'transparent',
                    transition: 'background var(--dur-micro) var(--ease), border-color var(--dur-micro) var(--ease)',
                  }}
                >
                  <span className="row spread" style={{ width: '100%' }}>
                    <span className="row gap-2">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: BRAND_COLORS[s.brand] ?? cssVar('--c8'), flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, color: on ? 'var(--text-1)' : 'var(--text-2)', fontSize: 14 }}>{s.brand} · {s.title}</span>
                    </span>
                    <ChevronRight size={14} style={{ color: on ? 'var(--gold)' : 'var(--text-3)', flexShrink: 0 }} />
                  </span>
                  <span className="row gap-2">
                    <span className="tag">{s.segment}</span>
                    <Badge color={SEV_COLOR[s.severity]}>{SEV_LABEL[s.severity]}</Badge>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── 右：推演主体 ── */}
        <div className="col gap-4">
          {/* 冲击评估摘要 */}
          <Card className="reveal reveal-2" key={`brief-${sc.id}`}>
            <div className="fade-in">
              <div className="spread wrap gap-3" style={{ marginBottom: 14 }}>
                <span className="row gap-2">
                  <span className="row" style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb, var(--danger) 14%, transparent)', justifyContent: 'center' }}>
                    <AlertTriangle size={16} style={{ color: RED }} />
                  </span>
                  <span className="t-h3" style={{ color: 'var(--text-1)' }}>冲击评估 · {sc.brand} {sc.title}</span>
                </span>
                <span className="row gap-3">
                  <span className="col" style={{ alignItems: 'flex-end' }}>
                    <span className="label">综合订单影响</span>
                    <span className="kpi-value tnum" style={{ fontSize: 22, color: RED }}>{totalHit}%</span>
                  </span>
                  <div className="divider" style={{ width: 1, height: 34, margin: 0 }} />
                  <span className="col" style={{ alignItems: 'flex-end' }}>
                    <span className="label">最大受冲击</span>
                    <span className="tnum" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{worst.model} {worst.orderDelta}%</span>
                  </span>
                </span>
              </div>
              <p className="t-body text-2" style={{ lineHeight: 1.65, padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', borderLeft: `3px solid ${RED}` }}>{sc.redBrief}</p>
              <div className="row gap-2 wrap" style={{ marginTop: 12 }}>
                {sc.impacts.map(im => (
                  <span key={im.model} className="row gap-2" style={{ padding: '7px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{im.model}</span>
                    <span className="tnum" style={{ fontWeight: 700, color: im.orderDelta < 0 ? RED : 'var(--success)' }}>{im.orderDelta}%</span>
                    <span className="t-small text-3">{im.note}</span>
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* 图表 */}
          <Card className="reveal reveal-3" key={`chart-${sc.id}`}>
            <SectionTitle right={<Segmented value={chartView} onChange={setChartView} options={[{ value: 'impact', label: '订单冲击' }, { value: 'radar', label: '应对前 / 后' }]} />}>
              {chartView === 'impact' ? '对我方车型订单影响（%）' : '车型竞争力 · 应对前 vs 应对后'}
            </SectionTitle>
            <Chart build={() => (chartView === 'impact' ? impactOption(sc) : radarOption(sc))} height={258} deps={[sc.id, chartView]} />
          </Card>

          {/* 红蓝对抗剧本 */}
          <Card className="reveal reveal-4" key={`board-${sc.id}`}>
            <SectionTitle right={
              <span className="row gap-3 t-small">
                <span className="row gap-1" style={{ color: RED }}><span style={{ width: 8, height: 8, borderRadius: 2, background: RED }} />竞方</span>
                <span className="row gap-1" style={{ color: BLUE }}><span style={{ width: 8, height: 8, borderRadius: 2, background: BLUE }} />我方</span>
              </span>
            }>红蓝对抗 · 四车道应对剧本</SectionTitle>
            <div className="col gap-2 fade-in" key={`lanes-${sc.id}`}>
              {LANE_ORDER.map(lane => {
                const pb = sc.playbook.find(p => p.lane === lane);
                if (!pb) return null;
                return (
                  <div key={lane} className="row gap-3" style={{ alignItems: 'stretch' }}>
                    <div className="col" style={{ width: 64, flexShrink: 0, alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text-2)' }}>
                      <span style={{ color: 'var(--gold)' }}>{LANE_META[lane].icon}</span>
                      <span className="label" style={{ fontSize: 10 }}>{LANE_META[lane].label}</span>
                    </div>
                    {/* 红方 */}
                    <div className="row gap-2 flex-1" style={{ padding: '11px 13px', borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 24%, transparent)', alignItems: 'flex-start' }}>
                      <Crosshair size={13} style={{ color: RED, flexShrink: 0, marginTop: 2 }} />
                      <span className="t-small" style={{ color: 'var(--text-1)', lineHeight: 1.5 }}>{pb.redMove}</span>
                    </div>
                    <div className="col" style={{ justifyContent: 'center', flexShrink: 0, color: 'var(--text-3)' }}>
                      <Swords size={14} />
                    </div>
                    {/* 蓝方 */}
                    <div className="row gap-2 flex-1" style={{ padding: '11px 13px', borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--info) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--info) 24%, transparent)', alignItems: 'flex-start' }}>
                      <Shield size={13} style={{ color: BLUE, flexShrink: 0, marginTop: 2 }} />
                      <span className="t-small" style={{ color: 'var(--text-1)', lineHeight: 1.5 }}>{pb.blueMove}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="row gap-2" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hairline)', color: 'var(--text-3)', fontSize: 11 }}>
              <Activity size={12} /> 剧本基于竞品库 + 历史对抗复盘生成，可一键下发区域操盘
              <span className="flex-1" />
              <span className="row gap-1" style={{ color: 'var(--gold)', fontWeight: 600 }}><Target size={12} /> 推荐主攻：{worst.model} 防守 + 错位反制</span>
            </div>
          </Card>

          {/* 竞品态势底栏 */}
          <Card className="reveal reveal-5">
            <SectionTitle right={<span className="t-small text-3">{COMPETITORS.length} 款竞品在册 · 持续监控</span>}>
              <span className="row gap-2"><Zap size={13} style={{ color: 'var(--gold)' }} />当前竞品威胁雷达</span>
            </SectionTitle>
            <div className="row gap-2 wrap">
              {SCENARIOS.map(s => {
                const on = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className="row gap-2 btn"
                    style={{
                      padding: '8px 13px', borderRadius: 'var(--r-pill)',
                      background: on ? 'color-mix(in srgb, var(--danger) 12%, transparent)' : 'var(--surface-2)',
                      border: `1px solid ${on ? 'color-mix(in srgb, var(--danger) 32%, transparent)' : 'var(--hairline)'}`,
                      color: on ? 'var(--text-1)' : 'var(--text-2)',
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLOR[s.severity], flexShrink: 0 }} />
                    {s.brand} {s.title}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
