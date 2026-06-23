import { useMemo, useRef, useState } from 'react';
import { Pause, Play, Activity, MapPin, PieChart, Layers, Cpu, ShieldX, Gauge } from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { Panel, AlertTicker, ThreatStrip, DecisionBadge, ScorePill } from '../components/sig';
import { Drawer } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, areaGradient, cssVar } from '../lib/chartTheme';
import { useInterval, usePrefersReducedMotion, fmt } from '../lib/hooks';
import { CITY_GEO, THREAT_STATS, decisionForScore } from '../lib/mockData';
import type { Txn, Decision, TxnChannel } from '../types';
import { DECISION_LABEL } from '../types';

const CHANNELS: TxnChannel[] = ['银行卡支付', '快捷支付', '账户转账', '信用贷支用', '提现'];
const CITIES = Object.keys(CITY_GEO);
const REASONS: Record<Decision, string[]> = {
  block: ['设备指纹突变 + 异地登录', '账户接管特征命中', '套现团伙资金链关联', '收款人首现 + 整数大额', '夜间高频提现 + 改绑'],
  review: ['新设备首次大额支付', '交易地与常驻地不符', '对手方风险评级中等', '金额超日常 3σ 阈值', '快捷支付限额边缘'],
  pass: ['常用设备 + 常用收款人', '行为画像高度匹配', '小额高频常规消费', '白名单商户结算', '代发工资入账'],
};
const LAYER_TEXT: Record<Decision, { rule: string; ml: string; agent: string }> = {
  block: { rule: '命中规则 R-217：设备指纹突变 AND 金额 > ¥20,000', ml: 'fraud-xgb-0612 评分 0.91（账户接管簇）', agent: 'agent 关联 3 账户共享设备 → 判定套现团伙，建议拦截 + 生成 SAR' },
  review: { rule: '命中规则 R-088：异地交易 AND 新收款人', ml: 'fraud-xgb-0612 评分 0.66（边际可疑）', agent: 'agent 核查历史行为无前科，建议转人工二次验证' },
  pass: { rule: '未命中拦截规则', ml: 'fraud-xgb-0612 评分 0.12（低风险）', agent: 'agent 画像匹配，常规放行' },
};

let SEQ = 480912;
function genTxn(): Txn {
  SEQ += 1;
  const r = Math.random();
  // 偏态：多数放行，少量复核，极少拦截（真实风控分布 · 红只在真风险时亮）
  const score = r < 0.7 ? Math.random() * 0.5 : r < 0.92 ? 0.55 + Math.random() * 0.24 : 0.8 + Math.random() * 0.19;
  const decision = decisionForScore(score);
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const amount = decision === 'block' ? 20000 + Math.floor(Math.random() * 180000) : Math.floor(200 + Math.random() * 40000);
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
  return {
    id: `TXN${SEQ}`, ts, card: `****${1000 + Math.floor(Math.random() * 8999)}`,
    amount, channel, city, score: Number(score.toFixed(2)), decision,
    reason: REASONS[decision][Math.floor(Math.random() * REASONS[decision].length)],
    layers: LAYER_TEXT[decision],
  };
}
const SEED: Txn[] = Array.from({ length: 16 }, genTxn);

export default function Monitoring() {
  const reduced = usePrefersReducedMotion();
  const [txns, setTxns] = useState<Txn[]>(SEED);
  const [paused, setPaused] = useState(false);
  const [sel, setSel] = useState<Txn | null>(null);
  const scoreHistory = useRef<number[]>(SEED.map(t => t.score).reverse());

  // 实时推流：每 ~2s 推入一笔新交易（高分笔红色脉冲）· 尊重 reduce-motion
  useInterval(() => {
    const t = genTxn();
    scoreHistory.current = [...scoreHistory.current, t.score].slice(-40);
    setTxns(prev => [t, ...prev].slice(0, 26));
  }, 2100, !paused && !reduced);

  const counts = useMemo(() => {
    const c = { pass: 0, review: 0, block: 0 } as Record<Decision, number>;
    txns.forEach(t => { c[t.decision]++; });
    return c;
  }, [txns]);

  const tickerItems = useMemo(() => txns.filter(t => t.decision !== 'pass').slice(0, 10).map(t => ({
    text: `${t.city} · ${t.reason}`, mono: `${t.card} ¥${fmt(t.amount)}`, level: t.decision,
  })), [txns]);

  // ① 实时评分时序流（line · 滚动）
  const scoreFlow = () => {
    const data = scoreHistory.current;
    return {
      ...baseOption(),
      grid: { left: 6, right: 10, top: 16, bottom: 6, containLabel: true },
      xAxis: { type: 'category', show: false, data: data.map((_, i) => i), boundaryGap: false },
      yAxis: { type: 'value', min: 0, max: 1, ...axisStyle(), splitNumber: 2 },
      series: [{
        type: 'line', data, smooth: true, symbol: 'none',
        lineStyle: { width: 1.6, color: cssVar('--gold') },
        areaStyle: { color: areaGradient(cssVar('--gold'), 0.2) },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: cssVar('--danger'), type: 'dashed', width: 1, opacity: 0.6 },
          data: [{ yAxis: 0.8 }], label: { formatter: '拦截阈 0.80', color: cssVar('--danger'), fontSize: 10, position: 'insideEndTop' },
        },
        animationDuration: 300,
      }],
    };
  };

  // ② 决策分布环形
  const decisionRing = () => ({
    ...baseOption(),
    tooltip: { ...(baseOption().tooltip as object), trigger: 'item' },
    legend: { bottom: 0, left: 'center', textStyle: { color: cssVar('--text-3'), fontSize: 11 }, itemWidth: 9, itemHeight: 9, icon: 'circle' },
    series: [{
      type: 'pie', radius: ['52%', '74%'], center: ['50%', '44%'], avoidLabelOverlap: true,
      itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2, borderRadius: 4 },
      label: { show: false }, labelLine: { show: false },
      data: [
        { name: '放行', value: counts.pass, itemStyle: { color: cssVar('--success') } },
        { name: '复核', value: counts.review, itemStyle: { color: cssVar('--warning') } },
        { name: '拦截', value: counts.block, itemStyle: { color: cssVar('--danger') } },
      ],
    }],
  });

  // ③ 欺诈地理热点（effectScatter by 经纬度 · 热点脉冲）
  const geoHot = () => {
    const agg = new Map<string, number>();
    txns.forEach(t => { if (t.decision !== 'pass') agg.set(t.city, (agg.get(t.city) ?? 0) + 1); });
    CITIES.forEach(c => { if (!agg.has(c)) agg.set(c, Math.floor(Math.random() * 2)); });
    const pts = Array.from(agg.entries()).map(([city, v]) => ({
      name: city, value: [...CITY_GEO[city], v + 1] as number[],
    }));
    const hot = [...pts].sort((a, b) => (b.value[2] as number) - (a.value[2] as number)).slice(0, 4);
    const common = {
      type: 'scatter' as const,
      encode: { x: 0, y: 1 },
      symbolSize: (val: number[]) => 6 + (val[2] ?? 1) * 4,
    };
    return {
      ...baseOption(),
      tooltip: { ...(baseOption().tooltip as object), formatter: (p: { name: string; value: number[] }) => `${p.name}<br/>可疑/拦截笔数 ${p.value[2]}` },
      grid: { left: 4, right: 4, top: 8, bottom: 4, containLabel: false },
      xAxis: { type: 'value', min: 73, max: 136, show: false },
      yAxis: { type: 'value', min: 17, max: 54, show: false },
      series: [
        { ...common, data: pts, itemStyle: { color: cssVar('--info'), opacity: 0.5 } },
        {
          type: 'effectScatter', encode: { x: 0, y: 1 }, data: hot, rippleEffect: { scale: 3, brushType: 'stroke' },
          symbolSize: (val: number[]) => 8 + (val[2] ?? 1) * 4,
          itemStyle: { color: cssVar('--danger'), shadowBlur: 8, shadowColor: cssVar('--danger') },
          label: { show: true, formatter: '{b}', position: 'right', color: cssVar('--text-2'), fontSize: 10 },
        },
      ],
    };
  };

  const total = txns.length || 1;
  const blockAmt = txns.filter(t => t.decision === 'block').reduce((s, t) => s + t.amount, 0);
  const avgScore = txns.reduce((s, t) => s + t.score, 0) / total;

  const colW = '52px 1fr 88px 56px 96px';

  return (
    <div className="page page-wide">
      <PageHeader
        title="实时反欺诈监控大屏"
        subtitle="交易实时风险评分 · 毫秒级放行 / 复核 / 拦截 · agentic 调查"
        actions={<div className="row gap-2"><span className="live-pulse" /><span className="t-small text-2">风险引擎在线</span></div>}
      />

      <div style={{ marginBottom: 16 }}>
        <AlertTicker items={tickerItems.length ? tickerItems : [{ text: '风险态势平稳 · 暂无高危拦截', level: 'pass' as Decision }]} />
      </div>

      {/* 4 KPI */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard label="今日交易笔数" raw={1284619} unit="笔" change={6.2} icon={<Activity size={16} />} delayClass="reveal-1" spark={[40, 52, 48, 61, 70, 66, 80, 92]} />
        <StatCard label="实时拦截额" raw={blockAmt + 2860000} unit="元" change={18.4} icon={<ShieldX size={16} />} delayClass="reveal-2" spark={[20, 30, 28, 45, 38, 60, 75, 88]} />
        <StatCard label="风险评分均值" raw={avgScore} unit="" decimals={2} change={-3.1} icon={<Gauge size={16} />} delayClass="reveal-3" />
        <StatCard label="agent 自主处置率" raw={85.3} unit="%" change={4.7} icon={<Cpu size={16} />} delayClass="reveal-4" spark={[70, 74, 78, 80, 82, 83, 84, 85]} />
      </div>

      {/* 主区：左 风险流 / 右 地理 + 环形 */}
      <div className="grid" style={{ gridTemplateColumns: '1.45fr 1fr', gap: 14, marginBottom: 16 }}>
        <Panel
          title="实时交易风险流"
          icon={<Activity size={13} />}
          right={
            <button className="btn btn-subtle btn-sm" onClick={() => setPaused(p => !p)}>
              {paused ? <><Play size={12} />继续</> : <><Pause size={12} />暂停</>}
            </button>
          }
          bodyClass="panel-body-0"
        >
          <div style={{ padding: '10px 14px 4px', borderBottom: '1px solid var(--hairline)' }}>
            <div className="label" style={{ marginBottom: 4 }}>评分时序流 · 近 40 笔</div>
            <Chart build={scoreFlow} height={64} deps={[txns.length]} />
          </div>
          <div className="stream" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <div className="stream-row" style={{ gridTemplateColumns: colW, position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10, animation: 'none' }}>
              <span>时间</span><span>交易 / 命中</span><span style={{ textAlign: 'right' }}>金额</span><span style={{ textAlign: 'center' }}>评分</span><span style={{ textAlign: 'center' }}>决策</span>
            </div>
            {txns.map((t, i) => (
              <div
                key={t.id}
                className={`stream-row dec-row dec-${t.decision} ${i === 0 && t.decision === 'block' ? 'flash-block' : ''}`}
                style={{ gridTemplateColumns: colW, cursor: 'pointer' }}
                onClick={() => setSel(t)}
              >
                <span className="mono text-3" style={{ fontSize: 11 }}>{t.ts}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="mono" style={{ color: 'var(--text-1)', fontSize: 11.5 }}>{t.card}</span>
                  <span className="text-3" style={{ display: 'block', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.city} · {t.reason}</span>
                </span>
                <span className="mononum" style={{ textAlign: 'right', color: 'var(--text-1)', fontSize: 12 }}>¥{fmt(t.amount)}</span>
                <span style={{ textAlign: 'center' }}><ScorePill score={t.score} /></span>
                <span style={{ textAlign: 'center' }}><DecisionBadge decision={t.decision} size="sm" /></span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="col gap-3" style={{ minWidth: 0 }}>
          <Panel title="欺诈地理热点" icon={<MapPin size={13} />} right={<span className="t-small text-3">热点城市脉冲</span>}>
            <Chart build={geoHot} height={232} deps={[txns.length]} />
          </Panel>
          <Panel title="实时决策分布" icon={<PieChart size={13} />} right={<span className="mononum t-small text-3">{total} 笔窗口</span>}>
            <Chart build={decisionRing} height={196} deps={[counts.pass, counts.review, counts.block]} />
          </Panel>
        </div>
      </div>

      {/* 威胁态势（市场数据立威） */}
      <div className="section-label row gap-2"><Layers size={13} />全球欺诈威胁态势</div>
      <ThreatStrip stats={THREAT_STATS} />

      {/* 交易三层决策详情抽屉 */}
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `交易 ${sel.id}` : ''} sub={sel ? `${sel.card} · ${sel.channel} · ${sel.city} · ${sel.ts}` : ''} width={460}>
        {sel && (
          <div className="col gap-4">
            <div className="row spread">
              <div>
                <div className="label">交易金额</div>
                <div className="mononum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>¥{fmt(sel.amount)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label">最终决策</div>
                <div className="row gap-2" style={{ marginTop: 4 }}><ScorePill score={sel.score} /><DecisionBadge decision={sel.decision} /></div>
              </div>
            </div>
            <div className="divider" style={{ margin: 0 }} />
            <div className="label">三层决策详情</div>
            {([['规则层', sel.layers!.rule, 'var(--info)'], ['ML 评分层', sel.layers!.ml, 'var(--gold)'], ['Agent 调查层', sel.layers!.agent, 'var(--success)']] as const).map(([k, v, c], i) => (
              <div key={i} className="card" style={{ padding: 13, borderLeft: `2px solid ${c}` }}>
                <div className="row gap-2" style={{ marginBottom: 5 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{k}</span>
                </div>
                <div className="t-small text-2" style={{ lineHeight: 1.6 }}>{v}</div>
              </div>
            ))}
            <div className="card" style={{ padding: 13, background: 'var(--surface-2)' }}>
              <div className="label" style={{ marginBottom: 6 }}>审计指纹 · EU AI Act 可追溯</div>
              <div className="mono t-small text-3" style={{ lineHeight: 1.7 }}>
                决策引擎 risk-engine v3.4<br />策略版本 strategy-v2.3 · 模型 fraud-xgb-0612<br />决策时延 23ms · {DECISION_LABEL[sel.decision]}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
