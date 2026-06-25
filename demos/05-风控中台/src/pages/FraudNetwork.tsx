import { useMemo, useState } from 'react';
import {
  Share2, Network, Filter, Users, Fingerprint, Wifi, Banknote,
  CircleDot, GitMerge, ScanSearch, AlertOctagon, Layers, Crosshair,
} from 'lucide-react';
import { PageHeader, Segmented } from '../components/ui';
import { Panel, ScorePill } from '../components/sig';
import { Field } from '../components/kit';
import RiskGraph from '../components/RiskGraph';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar } from '../lib/chartTheme';
import { fmt } from '../lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import type { GraphNode, GraphEdge, NodeKind, RiskLevel, EdgeRelation } from '../types';

// ════════════════════════════════════════════════════════════════════════
// 反欺诈关系网络 · 团伙挖掘（全局视角找团伙，不限单案）
// 全 mock：5 个团伙簇（community 0..4），确定性循环生成 ~96 节点，无随机（防每次渲染变）。
// 簇内边密（共享设备 / 同 IP / 资金归集 / 转账），跨簇少量桥接边（中介代办串联）。
// 🔒 脱敏：示例消费金融 / 小云。术语保留：套现团伙 / 共享设备指纹 / 资金归集 / 快进快出 / 马甲账户 / 中介代办。
// ════════════════════════════════════════════════════════════════════════

// ─── 团伙簇画像（人工设定特征 + 规模，节点/边由此确定性生成）─────────────────
interface Ring {
  c: number;                         // community 编号 0..4
  name: string;                      // 团伙名（业务命名）
  pattern: string;                   // 欺诈模式
  accounts: number;                  // 马甲账户数
  devices: number;                   // 共享设备指纹数
  ips: number;                       // 出口 IP 数
  payees: number;                    // 资金归集收款人数
  cards: number;                     // 绑定卡数
  amount: number;                    // 7 日累计涉案金额（元 · 基准）
  features: string[];                // 共享特征标签
  risk: number;                      // 团伙风险评分 0-1
  prefix: string;                    // 账户尾号前缀（脱敏）
}

const RINGS: Ring[] = [
  { c: 0, name: '套现团伙 · 同设备资金归集', pattern: '共享设备多账户 + 整数大额快进快出', accounts: 9, devices: 2, ips: 2, payees: 2, cards: 6, amount: 4286400, features: ['共享设备指纹', '资金归集', '快进快出', '整数大额'], risk: 0.94, prefix: '88' },
  { c: 1, name: '马甲账户 · 中介代办套件申请', pattern: '设备聚集 + 资料雷同的批量准入欺诈', accounts: 11, devices: 3, ips: 2, payees: 2, cards: 7, amount: 2960000, features: ['共享设备指纹', '资料雷同', '中介代办', '同收款 IP'], risk: 0.88, prefix: '55' },
  { c: 2, name: '可疑资金流 · 多层中转归集', pattern: '多层马甲中转后向同一收款人归集', accounts: 8, devices: 2, ips: 3, payees: 1, cards: 6, amount: 3512000, features: ['多层中转', '资金归集', '同收款人', '夜间交易'], risk: 0.86, prefix: '33' },
  { c: 3, name: '盗刷团伙 · 境外卡测试性小额', pattern: '同出口 IP 批量境外卡测试性盗刷', accounts: 7, devices: 2, ips: 2, payees: 1, cards: 8, amount: 968000, features: ['同 IP 段', '测试性小额', '境外 IP', '高频试卡'], risk: 0.79, prefix: '66' },
  { c: 4, name: '准入欺诈 · 包装资料团办', pattern: '中介代办包装资料的信用贷团伙申请', accounts: 6, devices: 2, ips: 2, payees: 2, cards: 5, amount: 1640000, features: ['资料雷同', '中介代办', '设备聚集'], risk: 0.71, prefix: '21' },
];

// 风险评分 → 节点风险等级
const riskLevel = (score: number): RiskLevel => (score >= 0.8 ? 'high' : score >= 0.55 ? 'mid' : 'low');

// ─── 确定性生成节点 + 边（无 Math.random，循环索引派生）──────────────────────
function buildGraph(rings: Ring[]): { nodes: GraphNode[]; edges: GraphEdge[]; centerIds: string[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const centerIds: string[] = [];

  rings.forEach((r) => {
    const accIds: string[] = [];
    const devIds: string[] = [];
    const ipIds: string[] = [];
    const payeeIds: string[] = [];
    const cardIds: string[] = [];

    // 账户（首个 = 团伙头目 · 中心度最高 + 高危）
    for (let i = 0; i < r.accounts; i++) {
      const id = `r${r.c}-a${i}`;
      const isLeader = i === 0;
      const tail = `${r.prefix}${String(1100 + r.c * 137 + i * 23).slice(-2)}${String(40 + i * 7).slice(-2)}`;
      const cent = isLeader ? 0.86 + (r.c % 3) * 0.03 : 0.28 + ((i * 13) % 40) / 100;
      const score = isLeader ? r.risk : Math.max(0.42, r.risk - 0.18 - ((i * 11) % 22) / 100);
      nodes.push({
        id, name: `账户 ****${tail}`, kind: 'account',
        risk: riskLevel(score), centrality: Number(cent.toFixed(2)), community: r.c,
        detail: isLeader ? `团伙头目 · 7 日归集 ¥${fmt(Math.round(r.amount * 0.42))}` : `马甲账户 · 同簇关联 · 评分 ${score.toFixed(2)}`,
      });
      accIds.push(id);
      if (isLeader) centerIds.push(id);
    }

    // 共享设备指纹
    for (let i = 0; i < r.devices; i++) {
      const id = `r${r.c}-d${i}`;
      nodes.push({
        id, name: `设备 DF-${(r.c * 4 + i + 7).toString(16)}${r.prefix}a`, kind: 'device',
        risk: i === 0 ? 'high' : 'mid', centrality: Number((0.62 - i * 0.12).toFixed(2)), community: r.c,
        detail: `共享设备指纹 · ${Math.max(2, Math.ceil(r.accounts / r.devices))} 账户登录`,
      });
      devIds.push(id);
    }

    // 出口 IP
    for (let i = 0; i < r.ips; i++) {
      const id = `r${r.c}-ip${i}`;
      nodes.push({
        id, name: `IP 113.${r.c * 9 + 11}.x.${40 + i * 17}`, kind: 'ip',
        risk: 'mid', centrality: Number((0.48 - i * 0.1).toFixed(2)), community: r.c,
        detail: `同一出口 IP · 簇内 ${Math.max(2, Math.ceil(r.accounts / r.ips))} 账户`,
      });
      ipIds.push(id);
    }

    // 收款人（资金归集户）
    for (let i = 0; i < r.payees; i++) {
      const id = `r${r.c}-p${i}`;
      const recv = Math.round((r.amount * (i === 0 ? 0.56 : 0.3)));
      nodes.push({
        id, name: i === 0 ? `收款人 ${'周吴郑王李'[r.c]}某` : `收款人 示例商贸${r.c + 1}`, kind: 'payee',
        risk: i === 0 ? 'high' : 'mid', centrality: Number((0.72 - i * 0.14).toFixed(2)), community: r.c,
        detail: `资金归集户 · 收 ¥${fmt(recv)}`,
      });
      payeeIds.push(id);
    }

    // 绑定卡
    for (let i = 0; i < r.cards; i++) {
      const id = `r${r.c}-c${i}`;
      nodes.push({
        id, name: `卡 ****${r.prefix}${String(2200 + i * 31).slice(-2)}`, kind: 'card',
        risk: 'low', centrality: Number((0.2 + ((i * 9) % 18) / 100).toFixed(2)), community: r.c,
        detail: '绑定卡 · 簇内复用',
      });
      cardIds.push(id);
    }

    // ── 簇内边（密）──
    const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];
    // 账户 ↔ 共享设备
    accIds.forEach((a, i) => edges.push({ source: a, target: pick(devIds, i), relation: '共享设备', weight: 1 }));
    // 账户 ↔ 同 IP
    accIds.forEach((a, i) => edges.push({ source: a, target: pick(ipIds, i), relation: '同 IP', weight: 0.8 }));
    // 账户 → 绑定卡（同证件复用）
    accIds.forEach((a, i) => { if (i < cardIds.length) edges.push({ source: a, target: cardIds[i], relation: '同证件', weight: 0.5 }); });
    // 账户 → 收款人（资金归集，金额随簇分配）
    accIds.forEach((a, i) => {
      const amt = Math.round((r.amount / r.accounts) * (1 + ((i * 7) % 5) / 10));
      edges.push({ source: a, target: pick(payeeIds, i), relation: '资金', weight: 0.6 + ((i * 5) % 4) / 10, amount: amt });
    });
    // 马甲账户 → 头目（转账归集）
    for (let i = 1; i < accIds.length; i += 2) {
      edges.push({ source: accIds[i], target: accIds[0], relation: '转账', weight: 0.55, amount: Math.round(r.amount * 0.04) });
    }
  });

  // ── 跨簇桥接边（少量 · 中介代办 / 共用收款人串联团伙）──
  const bridge = (sc: number, tc: number, rel: EdgeRelation, detail: string) => {
    const s = `r${sc}-a0`, t = `r${tc}-p0`;
    edges.push({ source: s, target: t, relation: rel, weight: 0.5, amount: 120000 });
    // 桥接处把跨簇收款人标注
    const node = nodes.find(n => n.id === t);
    if (node && !node.detail?.includes('跨团伙')) node.detail = `${node.detail} · 跨团伙桥接（${detail}）`;
  };
  bridge(0, 1, '同收款人', '共用归集户');
  bridge(1, 4, '资金', '中介代办串联');
  bridge(2, 0, '同收款人', '资金二次归集');
  bridge(3, 2, '转账', '盗刷资金洗出');

  return { nodes, edges, centerIds };
}

const { nodes: ALL_NODES, edges: ALL_EDGES, centerIds: CENTERS } = buildGraph(RINGS);

// 时间窗 → 金额 / 规模缩放系数（纯演示：窗口越短，纳入的活跃账户越少）
const WINDOW_SCALE: Record<string, number> = { '7': 1, '30': 1.34, '90': 1.62 };

const NODE_TOTAL = ALL_NODES.length;

export default function FraudNetwork() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('network:read');

  const [win, setWin] = useState<'7' | '30' | '90'>('30');
  const [minAmount, setMinAmount] = useState('0');
  const [minSize, setMinSize] = useState('0');
  const [activeRing, setActiveRing] = useState<number | null>(0);
  const [highlight, setHighlight] = useState<string | null>(CENTERS[0]);
  const [selId, setSelId] = useState<string | null>(null);

  const scale = WINDOW_SCALE[win];

  // 簇汇总（随时间窗缩放）+ 筛选
  const rings = useMemo(() => {
    return RINGS.map(r => ({
      ...r,
      amountScaled: Math.round(r.amount * scale),
      accountsScaled: Math.round(r.accounts * (win === '7' ? 0.78 : win === '30' ? 1 : 1.18)),
    }));
  }, [scale, win]);

  const minAmt = Number(minAmount);
  const minSz = Number(minSize);
  const passRing = (r: typeof rings[number]) => r.amountScaled >= minAmt && r.accountsScaled >= minSz;
  const visibleRings = rings.filter(passRing);
  const visibleCommunities = useMemo(() => new Set(visibleRings.map(r => r.c)), [visibleRings]);

  // 按筛选过滤图谱节点/边（纯前端）
  const { nodes, edges } = useMemo(() => {
    const ns = ALL_NODES.filter(n => n.community != null && visibleCommunities.has(n.community));
    const idSet = new Set(ns.map(n => n.id));
    const es = ALL_EDGES.filter(e => idSet.has(e.source) && idSet.has(e.target));
    return { nodes: ns, edges: es };
  }, [visibleCommunities]);

  // 团伙规模分布（条形）
  const sizeBar = () => {
    const bo = baseOption();
    return {
      ...bo,
      grid: { left: 6, right: 14, top: 10, bottom: 6, containLabel: true },
      tooltip: {
        ...(bo.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (ps: { name: string; value: number }[]) => `${ps[0].name}<br/>涉及账户 <b>${ps[0].value}</b> 个`,
      },
      xAxis: { type: 'value', ...axisStyle(), splitLine: { show: true, lineStyle: { color: cssVar('--hairline'), type: 'dashed' } } },
      yAxis: {
        type: 'category', ...axisStyle(),
        data: rings.map(r => `簇 ${r.c + 1}`), splitLine: { show: false },
        axisLabel: { color: cssVar('--text-3'), fontSize: 11, fontFamily: "'Geist Mono','Geist',sans-serif" },
      },
      series: [{
        type: 'bar', data: rings.map(r => ({
          value: r.accountsScaled,
          itemStyle: {
            color: passRing(r) ? cssVar(['--c4', '--c1', '--c5', '--c6', '--warning'][r.c % 5]) : cssVar('--surface-3'),
            borderRadius: [0, 3, 3, 0],
            opacity: passRing(r) ? 1 : 0.5,
          },
        })),
        barWidth: 13,
        label: { show: true, position: 'right', color: cssVar('--text-3'), fontSize: 10.5, fontFamily: "'Geist Mono',monospace" },
      }],
      animationDuration: 800, animationEasing: 'cubicOut',
    };
  };

  const selNode = highlight ? ALL_NODES.find(n => n.id === highlight) : null;
  const totalAmount = visibleRings.reduce((s, r) => s + r.amountScaled, 0);
  const totalAccounts = visibleRings.reduce((s, r) => s + r.accountsScaled, 0);

  const RING_COLORS = ['--c4', '--c1', '--c5', '--c6', '--warning'];

  // 点击簇卡 → 高亮该簇头目 + 锁定 activeRing
  const focusRing = (c: number) => {
    setActiveRing(c);
    setHighlight(CENTERS[c]);
    setSelId(null);
  };

  if (!canRead) {
    return (
      <div className="page">
        <PageHeader title="反欺诈关系网络" subtitle="团伙挖掘 · 社区发现 · 力导向全局图谱" />
        <Panel>
          <div className="col" style={{ alignItems: 'center', padding: '72px 20px', color: 'var(--text-3)', gap: 10 }}>
            <AlertOctagon size={28} style={{ opacity: 0.4 }} />
            <div className="t-h3" style={{ color: 'var(--text-2)' }}>无访问权限</div>
            <div className="t-small">关系网络需 network:read 权限（风控分析师 / 合规官 / CISO）</div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="反欺诈关系网络"
        subtitle="全局视角团伙挖掘 · 社区发现按簇着色 · 共享设备 / 同 IP / 资金归集多边融合"
        actions={
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="row gap-1 t-small text-3"><Layers size={13} />识别团伙 <span className="mononum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{RINGS.length}</span></span>
            <span className="row gap-1 t-small text-3"><Network size={13} />节点 <span className="mononum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{NODE_TOTAL}</span></span>
          </div>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 14, alignItems: 'start' }}>
        {/* ── 左：全局力导向图谱 ── */}
        <Panel
          title="团伙关系网络 · 力导向全局图谱"
          icon={<Share2 size={13} />}
          right={
            <span className="row gap-2 t-small text-3">
              <span className="row gap-1"><span className="state-dot" style={{ background: 'var(--danger)' }} />头目</span>
              <span className="row gap-1" style={{ borderLeft: '1px solid var(--hairline)', paddingLeft: 8 }}>金线 = 资金归集</span>
            </span>
          }
          bodyClass="panel-body-0"
        >
          <div className="war-grid" style={{ position: 'relative', borderRadius: '0 0 var(--r-lg) var(--r-lg)', overflow: 'hidden' }}>
            <RiskGraph
              nodes={nodes}
              edges={edges}
              colorBy="community"
              highlightId={highlight}
              onNodeClick={(n) => { setHighlight(n.id); setSelId(n.id); if (n.community != null) setActiveRing(n.community); }}
              height={560}
              repulsion={120}
            />

            {/* 左上：簇图例 */}
            <div className="card" style={{ position: 'absolute', top: 12, left: 12, width: 188, padding: '11px 13px', background: 'var(--glass-bg)', backdropFilter: 'blur(8px)' }}>
              <div className="label" style={{ marginBottom: 8 }}>团伙簇图例</div>
              <div className="col gap-2">
                {rings.map(r => {
                  const on = passRing(r);
                  return (
                    <button
                      key={r.c}
                      onClick={() => focusRing(r.c)}
                      className="row gap-2"
                      style={{
                        background: activeRing === r.c ? 'var(--surface-2)' : 'transparent',
                        border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                        padding: '3px 6px', borderRadius: 6, opacity: on ? 1 : 0.4,
                      }}
                    >
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: cssVar(RING_COLORS[r.c % 5]), flexShrink: 0 }} />
                      <span className="t-small" style={{ color: 'var(--text-2)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>簇 {r.c + 1} · {r.accountsScaled} 户</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 右下：选中节点卡 */}
            {selNode && selId && (
              <div className="card" style={{ position: 'absolute', bottom: 12, right: 12, width: 232, padding: 13, background: 'var(--glass-bg)', backdropFilter: 'blur(8px)' }}>
                <div className="row spread" style={{ marginBottom: 6 }}>
                  <span className="label">选中节点</span>
                  {selNode.community != null && <span className="chip" style={{ background: `color-mix(in srgb, ${cssVar(RING_COLORS[selNode.community % 5])} 16%, transparent)`, color: cssVar(RING_COLORS[selNode.community % 5]), fontSize: 10.5 }}>簇 {selNode.community + 1}</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{selNode.name}</div>
                <div className="t-small text-3" style={{ marginTop: 4, lineHeight: 1.5 }}>{selNode.detail}</div>
                <div className="row spread" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--hairline)' }}>
                  <span className="t-small text-3">中心度</span>
                  <span className="mononum" style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 600 }}>{selNode.centrality.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* 左下：操作提示 */}
            <div className="row gap-1 t-small text-3" style={{ position: 'absolute', bottom: 12, left: 12, padding: '4px 9px', borderRadius: 6, background: 'var(--glass-bg)', backdropFilter: 'blur(6px)' }}>
              <Crosshair size={11} />点击节点高亮 1 跳邻居 · 滚轮缩放 · 拖拽布局
            </div>
          </div>
        </Panel>

        {/* ── 右：筛选 + 簇汇总 + 规模分布 ── */}
        <div className="col gap-3" style={{ position: 'sticky', top: 0 }}>
          {/* 筛选条 */}
          <Panel title="挖掘条件" icon={<Filter size={13} />}>
            <Field label="时间窗">
              <Segmented<'7' | '30' | '90'>
                value={win}
                onChange={setWin}
                options={[{ value: '7', label: '7 日' }, { value: '30', label: '30 日' }, { value: '90', label: '90 日' }]}
              />
            </Field>
            <Field label="最小涉案金额">
              <select className="input" value={minAmount} onChange={e => setMinAmount(e.target.value)}>
                <option value="0">不限</option>
                <option value="1000000">≥ ¥1,000,000</option>
                <option value="2000000">≥ ¥2,000,000</option>
                <option value="3500000">≥ ¥3,500,000</option>
              </select>
            </Field>
            <Field label="最小团伙规模" hint="按簇账户数过滤 · 纯前端联动图谱与下方列表">
              <select className="input" value={minSize} onChange={e => setMinSize(e.target.value)}>
                <option value="0">不限</option>
                <option value="8">≥ 8 个账户</option>
                <option value="10">≥ 10 个账户</option>
                <option value="12">≥ 12 个账户</option>
              </select>
            </Field>
            <div className="row spread" style={{ paddingTop: 4, borderTop: '1px solid var(--hairline)', marginTop: 2 }}>
              <span className="t-small text-3">命中团伙 / 累计金额</span>
              <span className="row gap-2" style={{ alignItems: 'baseline' }}>
                <span className="mononum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>{visibleRings.length}</span>
                <span className="mononum t-small" style={{ color: 'var(--text-2)' }}>¥{fmt(totalAmount)}</span>
              </span>
            </div>
          </Panel>

          {/* 簇汇总卡列表 */}
          <Panel
            title="团伙簇汇总"
            icon={<Users size={13} />}
            right={<span className="row gap-1 t-small text-3"><span className="mononum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{totalAccounts}</span>账户</span>}
            bodyClass="panel-body-0"
          >
            <div className="col">
              {rings.map(r => {
                const on = passRing(r);
                const active = activeRing === r.c;
                return (
                  <button
                    key={r.c}
                    onClick={() => on && focusRing(r.c)}
                    disabled={!on}
                    className="dec-row"
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', border: 'none',
                      cursor: on ? 'pointer' : 'not-allowed', opacity: on ? 1 : 0.42,
                      padding: '12px 13px 12px 14px', borderBottom: '1px solid var(--hairline)',
                      background: active && on ? 'var(--surface-2)' : 'transparent',
                      borderLeft: `2px solid ${active && on ? cssVar(RING_COLORS[r.c % 5]) : 'transparent'}`,
                    }}
                  >
                    <div className="row spread" style={{ marginBottom: 5 }}>
                      <span className="row gap-2">
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: cssVar(RING_COLORS[r.c % 5]), flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>簇 {r.c + 1}</span>
                      </span>
                      <ScorePill score={r.risk} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 7 }}>{r.name}</div>
                    <div className="row gap-3" style={{ marginBottom: 8 }}>
                      <span className="row gap-1 t-small text-3"><Users size={11} /><span className="mononum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{r.accountsScaled}</span>账户</span>
                      <span className="row gap-1 t-small text-3"><Banknote size={11} /><span className="mononum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>¥{fmt(r.amountScaled)}</span></span>
                    </div>
                    <div className="row gap-1 wrap">
                      {r.features.map(f => (
                        <span key={f} className="tag" style={{ fontSize: 10.5 }}>
                          {f === '共享设备指纹' ? <Fingerprint size={10} /> : f === '同收款 IP' || f === '同 IP 段' ? <Wifi size={10} /> : f === '资金归集' ? <GitMerge size={10} /> : <CircleDot size={9} />}
                          {f}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* 团伙规模分布（真 ECharts 条形） */}
          <Panel title="团伙规模分布" icon={<ScanSearch size={13} />} right={<span className="t-small text-3">账户数</span>}>
            <Chart build={sizeBar} height={148} deps={[win, minAmount, minSize]} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
