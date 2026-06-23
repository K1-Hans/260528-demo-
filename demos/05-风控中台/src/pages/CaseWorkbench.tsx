import { useMemo, useState } from 'react';
import {
  Share2, Workflow, FileText, Snowflake, Bot, Search, GitMerge, ScanFace,
  Lightbulb, ShieldX, FileCheck2, ChevronRight, CircleDot,
} from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel, ScorePill } from '../components/sig';
import { RiskBadge, toast } from '../components/kit';
import RiskGraph from '../components/RiskGraph';
import Chart from '../components/Chart';
import { baseOption, cssVar } from '../lib/chartTheme';
import { fmt } from '../lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import type { RiskCase, GraphNode, GraphEdge, SankeyLink, AgentStep, RiskLevel } from '../types';

// ─── 案件队列（按风险降序）────────────────────────────────────────────────
const CASES: RiskCase[] = [
  { id: 'CASE-2406-0192', title: '套现团伙 · 同设备多账户资金归集', subject: '账户 ****8842 等 3 户', type: '套现团伙', level: 'high', amount: 1826400, score: 0.93, status: '调查中', openedAt: '09:42', signals: ['共享设备指纹', '快进快出', '整数大额', '收款人归集'] },
  { id: 'CASE-2406-0188', title: '账户接管 · 异地登录改绑后大额提现', subject: '客户 CU-7741 · 卡 ****4821', type: '账户接管', level: 'high', amount: 358000, score: 0.94, status: '待调查', openedAt: '09:18', signals: ['异地登录', '改绑手机', '大额提现'] },
  { id: 'CASE-2406-0181', title: '可疑资金流 · 多层中转快进快出', subject: '账户 ****3307', type: '可疑资金流', level: 'high', amount: 920000, score: 0.86, status: '待调查', openedAt: '08:51', signals: ['多层中转', '快进快出', '夜间交易'] },
  { id: 'CASE-2406-0174', title: '盗刷 · 境外卡测试性小额连续', subject: '卡 ****6610', type: '盗刷', level: 'mid', amount: 47800, score: 0.71, status: '调查中', openedAt: '08:30', signals: ['测试性小额', '境外 IP', '高频'] },
  { id: 'CASE-2406-0169', title: '新客准入 · 信用贷套件团伙申请', subject: '申请批次 BT-552', type: '准入欺诈', level: 'mid', amount: 660000, score: 0.68, status: '待调查', openedAt: '昨天', signals: ['设备聚集', '资料雷同', '中介特征'] },
  { id: 'CASE-2406-0151', title: '可疑对手方 · 高危地区频繁往来', subject: '账户 ****1190', type: '可疑资金流', level: 'low', amount: 128000, score: 0.52, status: '已处置', openedAt: '昨天', signals: ['高危地区', '对手方集中'] },
];

// ─── 选中案件的关系图谱（套现团伙）──────────────────────────────────────────
const NODES: GraphNode[] = [
  { id: 'a1', name: '账户 ****8842', kind: 'account', risk: 'high', centrality: 0.95, detail: '主体账户 · 7 日支用 ¥86 万' },
  { id: 'a2', name: '账户 ****5527', kind: 'account', risk: 'high', centrality: 0.8, detail: '关联账户 · 同设备登录' },
  { id: 'a3', name: '账户 ****9013', kind: 'account', risk: 'high', centrality: 0.78, detail: '关联账户 · 同设备登录' },
  { id: 'a4', name: '账户 ****2240', kind: 'account', risk: 'mid', centrality: 0.5, detail: '疑似马甲账户' },
  { id: 'd1', name: '设备 DF-7c2a', kind: 'device', risk: 'high', centrality: 0.9, detail: '共享设备指纹 · 3 账户登录' },
  { id: 'ip1', name: 'IP 113.x.x.88', kind: 'ip', risk: 'mid', centrality: 0.6, detail: '同一出口 IP' },
  { id: 'c1', name: '卡 ****8842', kind: 'card', risk: 'mid', centrality: 0.42, detail: '绑定卡' },
  { id: 'c2', name: '卡 ****5527', kind: 'card', risk: 'low', centrality: 0.35, detail: '绑定卡' },
  { id: 'p1', name: '收款人 周某', kind: 'payee', risk: 'high', centrality: 0.85, detail: '资金归集户 · 收 ¥112 万' },
  { id: 'p2', name: '收款人 示例商贸', kind: 'payee', risk: 'mid', centrality: 0.55, detail: '收 ¥70.6 万' },
  { id: 'm1', name: '商户 POS-3391', kind: 'merchant', risk: 'mid', centrality: 0.4, detail: '套现疑似商户' },
];
const EDGES: GraphEdge[] = [
  { source: 'a1', target: 'd1', relation: '共享设备', weight: 1 },
  { source: 'a2', target: 'd1', relation: '共享设备', weight: 1 },
  { source: 'a3', target: 'd1', relation: '共享设备', weight: 1 },
  { source: 'a1', target: 'ip1', relation: '同 IP', weight: 0.8 },
  { source: 'a2', target: 'ip1', relation: '同 IP', weight: 0.8 },
  { source: 'a4', target: 'ip1', relation: '同 IP', weight: 0.6 },
  { source: 'a1', target: 'c1', relation: '同证件', weight: 0.5 },
  { source: 'a2', target: 'c2', relation: '同证件', weight: 0.5 },
  { source: 'a1', target: 'p1', relation: '资金', weight: 1, amount: 620000 },
  { source: 'a2', target: 'p1', relation: '资金', weight: 0.8, amount: 500000 },
  { source: 'a3', target: 'p2', relation: '资金', weight: 0.7, amount: 706400 },
  { source: 'a4', target: 'a1', relation: '转账', weight: 0.6, amount: 180000 },
  { source: 'c1', target: 'm1', relation: '资金', weight: 0.5, amount: 240000 },
];
const SANKEY_NODES = [
  { name: '账户 ****8842' }, { name: '账户 ****5527' }, { name: '账户 ****9013' }, { name: '账户 ****2240' },
  { name: '中转 POS-3391' }, { name: '收款人 周某' }, { name: '收款人 示例商贸' },
];
const SANKEY_LINKS: SankeyLink[] = [
  { source: '账户 ****2240', target: '账户 ****8842', value: 180000 },
  { source: '账户 ****8842', target: '中转 POS-3391', value: 240000 },
  { source: '账户 ****8842', target: '收款人 周某', value: 380000 },
  { source: '账户 ****5527', target: '收款人 周某', value: 500000 },
  { source: '中转 POS-3391', target: '收款人 周某', value: 240000 },
  { source: '账户 ****9013', target: '收款人 示例商贸', value: 706400 },
];

const STEPS: AgentStep[] = [
  { id: 's1', kind: 'retrieve', title: '拉取主体全景', detail: '检索账户 ****8842 近 30 日交易、设备、IP、关联实体共 142 条', ms: 380, status: 'done', evidence: '关联实体 11 个 · 交易 142 笔' },
  { id: 's2', kind: 'correlate', title: '关联关系挖掘', detail: '发现 3 个账户共享设备指纹 DF-7c2a，且 09:00–11:00 集中登录', ms: 520, status: 'done', evidence: '共享设备 1 · 关联账户 3' },
  { id: 's3', kind: 'match', title: '团伙特征命中', detail: '命中套现团伙特征库：同设备多账户 + 资金快进快出 + 整数大额归集', ms: 240, status: 'done', evidence: '匹配度 0.91 · 特征 4/5' },
  { id: 's4', kind: 'reason', title: '资金链推理', detail: '3 账户 7 日内向「周某 / 示例商贸」归集 ¥182.6 万，单笔留存 < 4 小时（快进快出）', ms: 610, status: 'done', evidence: '资金归集 ¥1,826,400 · 留存中位 3.2h' },
  { id: 's5', kind: 'decide', title: '决策建议', detail: '综合风险评分 0.93，判定套现团伙，建议拦截在途交易 + 冻结 3 账户 + 生成 SAR', ms: 180, status: 'block', evidence: '评分 0.93 · 建议拦截 + SAR' },
  { id: 's6', kind: 'report', title: 'SAR 草稿预填', detail: 'agent 已自动预填可疑交易报告主体、可疑模式叙述、关联交易明细，待合规官复核', ms: 920, status: 'done', evidence: 'SAR 草稿就绪 · 待复核上报' },
];
const STEP_ICON: Record<string, React.ReactNode> = {
  retrieve: <Search size={13} />, correlate: <GitMerge size={13} />, match: <ScanFace size={13} />,
  reason: <Lightbulb size={13} />, decide: <ShieldX size={13} />, report: <FileCheck2 size={13} />,
};
const LEVEL_TONE: Record<RiskLevel, string> = { high: 'var(--danger)', mid: 'var(--warning)', low: 'var(--text-3)' };

export default function CaseWorkbench() {
  const { hasPermission } = useAuth();
  const canAct = hasPermission('case:act');
  const [selId, setSelId] = useState(CASES[0].id);
  const [view, setView] = useState<'graph' | 'sankey'>('graph');
  const [highlight, setHighlight] = useState<string | null>('a1');
  const sel = CASES.find(c => c.id === selId)!;

  const sankey = () => ({
    ...baseOption(),
    tooltip: { ...(baseOption().tooltip as object), trigger: 'item', formatter: (p: { dataType?: string; data?: { value?: number; source?: string; target?: string } }) =>
      p.dataType === 'edge' ? `${p.data?.source} → ${p.data?.target}<br/>¥${fmt(p.data?.value ?? 0)}` : '' },
    series: [{
      type: 'sankey', left: 8, right: 110, top: 12, bottom: 12,
      data: SANKEY_NODES, links: SANKEY_LINKS,
      nodeWidth: 14, nodeGap: 14,
      itemStyle: { color: cssVar('--gold'), borderColor: 'transparent' },
      lineStyle: { color: 'gradient', opacity: 0.32, curveness: 0.5 },
      label: { color: cssVar('--text-2'), fontSize: 11, fontFamily: "'Geist',sans-serif" },
      emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.55 } },
    }],
  });

  const selNode = highlight ? NODES.find(n => n.id === highlight) : null;

  return (
    <div className="page page-wide">
      <PageHeader title="案件调查工作台" subtitle="单案件 360° · 关系图谱 + 资金流向 + agent 调查 → 一键生成 SAR" />

      <div className="grid" style={{ gridTemplateColumns: '288px 1fr 340px', gap: 14, alignItems: 'start' }}>
        {/* 左：案件队列 */}
        <Panel title="案件队列" icon={<CircleDot size={13} />} right={<span className="t-small text-3 mononum">{CASES.length}</span>} bodyClass="panel-body-0" style={{ maxHeight: 720 }}>
          <div style={{ overflowY: 'auto' }}>
            {CASES.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelId(c.id); setHighlight('a1'); }}
                className="dec-row"
                style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '11px 13px 11px 15px', borderBottom: '1px solid var(--hairline)',
                  background: c.id === selId ? 'var(--surface-2)' : 'transparent', border: 'none',
                  borderLeft: `2px solid ${c.id === selId ? LEVEL_TONE[c.level] : 'transparent'}`,
                }}
              >
                <div className="row spread" style={{ marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{c.id}</span>
                  <RiskBadge level={c.level} />
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.4, marginBottom: 5 }}>{c.title}</div>
                <div className="row spread">
                  <span className="t-small text-3">{c.type} · {c.openedAt}</span>
                  <span className="mononum" style={{ fontSize: 11.5, color: 'var(--text-2)' }}>¥{fmt(c.amount)}</span>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* 中：关系图谱 / 资金桑基 */}
        <Panel
          title={view === 'graph' ? '关系网络 · 力导向' : '资金流向 · 桑基图'}
          icon={view === 'graph' ? <Share2 size={13} /> : <Workflow size={13} />}
          right={
            <div className="row gap-1" style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)', padding: 3 }}>
              <button className="btn btn-sm" style={{ background: view === 'graph' ? 'var(--surface-3)' : 'transparent', color: view === 'graph' ? 'var(--text-1)' : 'var(--text-3)', border: 'none' }} onClick={() => setView('graph')}><Share2 size={12} />图谱</button>
              <button className="btn btn-sm" style={{ background: view === 'sankey' ? 'var(--surface-3)' : 'transparent', color: view === 'sankey' ? 'var(--text-1)' : 'var(--text-3)', border: 'none' }} onClick={() => setView('sankey')}><Workflow size={12} />资金链</button>
            </div>
          }
          bodyClass="panel-body-0"
        >
          {view === 'graph' ? (
            <div className="war-grid" style={{ position: 'relative' }}>
              <RiskGraph nodes={NODES} edges={EDGES} highlightId={highlight} onNodeClick={(n) => setHighlight(n.id)} height={460} />
              {selNode && (
                <div className="card" style={{ position: 'absolute', top: 12, left: 12, width: 210, padding: 12, background: 'var(--glass-bg)', backdropFilter: 'blur(8px)' }}>
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <span className="label">选中节点</span>
                    {selNode.risk && <RiskBadge level={selNode.risk} />}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{selNode.name}</div>
                  <div className="t-small text-3" style={{ marginTop: 4, lineHeight: 1.5 }}>{selNode.detail}</div>
                  <div className="t-small text-3" style={{ marginTop: 6 }}>点击节点高亮 1 跳邻居 · 可拖拽 / 缩放</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '8px 6px' }}><Chart build={sankey} height={460} /></div>
          )}
        </Panel>

        {/* 右：agent 调查时间线 + SAR */}
        <Panel title="Agent 调查纪要" icon={<Bot size={13} />} right={<span className="badge" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>已完成</span>} bodyClass="panel-body" style={{ maxHeight: 720, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="row gap-2" style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}>
            <ScorePill score={sel.score} />
            <div className="flex-1">
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{sel.type}</div>
              <div className="t-small text-3">{sel.subject}</div>
            </div>
            <span className="mono t-small text-3">8 分钟串案</span>
          </div>

          <div className="tl" style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            {STEPS.map(s => (
              <div key={s.id} className={`tl-node ${s.status === 'block' ? 'tl-block' : 'tl-done'}`}>
                <div className="row gap-2" style={{ marginBottom: 3 }}>
                  <span style={{ color: s.status === 'block' ? 'var(--danger)' : 'var(--gold)' }}>{STEP_ICON[s.kind]}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{s.title}</span>
                  <span className="mono t-small text-3">{s.ms}ms</span>
                </div>
                <div className="t-small text-2" style={{ lineHeight: 1.55, marginBottom: 6 }}>{s.detail}</div>
                {s.evidence && (
                  <div className="row gap-1" style={{ fontSize: 11, color: s.status === 'block' ? 'var(--danger)' : 'var(--text-3)', background: 'var(--surface-2)', borderRadius: 6, padding: '4px 8px', display: 'inline-flex' }}>
                    <ChevronRight size={11} /><span className="mono">{s.evidence}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="col gap-2" style={{ paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={!canAct} onClick={() => toast('SAR 报告草稿已生成 · 已转合规官复核队列', 'success')}>
              <FileText size={14} />一键生成 SAR 报告
            </button>
            <div className="row gap-2">
              <button className="btn btn-danger flex-1" disabled={!canAct} onClick={() => toast('已冻结 3 个关联账户 · 已拦截在途交易', 'danger')}><Snowflake size={13} />冻结账户</button>
              <button className="btn btn-subtle flex-1" disabled={!canAct} onClick={() => toast('已转人工二次核实', 'warn')}>转人工</button>
            </div>
            {!canAct && <div className="t-small text-3" style={{ textAlign: 'center' }}>当前角色无处置权限（需风控分析师 / 合规官）</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
