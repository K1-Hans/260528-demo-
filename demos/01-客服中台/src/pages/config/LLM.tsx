import { useState, useMemo } from 'react';
import { Wifi, WifiOff, Shield, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { Card, PageHeader, SectionTitle } from '../../components/ui';
import { Toolbar, toast } from '../../components/kit';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar } from '../../lib/chartTheme';
import type { LLMProvider, AgentAssign } from '../../types';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PROVIDERS: LLMProvider[] = [
  { id: 'qwen3-local',  name: 'Qwen3-27B-FP8',      model: 'Qwen3-27B-FP8',           status: '就绪',  local: true,  costPer1k: 0,    latencyMs: 320 },
  { id: 'gemma-local',  name: 'Gemma-MoE',           model: 'gemma-3-moe-27b',          status: '就绪',  local: true,  costPer1k: 0,    latencyMs: 410 },
  { id: 'qwen-plus',    name: 'qwen-plus',            model: 'qwen-plus-2025-01-25',     status: '就绪',  local: false, costPer1k: 0.8,  latencyMs: 142 },
  { id: 'embed-v3',     name: 'text-embedding-v3',   model: 'text-embedding-v3',        status: '就绪',  local: false, costPer1k: 0.05, latencyMs: 68  },
  { id: 'deepseek-v3',  name: 'DeepSeek-V3.2',       model: 'deepseek-v3.2-20250101',   status: '就绪',  local: false, costPer1k: 1.33, latencyMs: 195 },
];

const AGENT_ROWS: AgentAssign[] = [
  { agent: 'A2 意图判别',    key: 'a2_intent',  provider: 'qwen3-local', model: 'Qwen3-27B-FP8',         temp: 0.1 },
  { agent: 'A3 QA 生成',    key: 'a3_qa',       provider: 'qwen-plus',   model: 'qwen-plus-2025-01-25',   temp: 0.3 },
  { agent: 'A3 QA 流式',    key: 'a3_stream',   provider: 'qwen3-local', model: 'Qwen3-27B-FP8',         temp: 0.4 },
  { agent: '安抚 Agent',    key: 'soothe',      provider: 'gemma-local', model: 'gemma-3-moe-27b',        temp: 0.7 },
  { agent: 'Embedding 检索', key: 'embedding',  provider: 'embed-v3',    model: 'text-embedding-v3',     temp: 0   },
  { agent: 'L3 分类',       key: 'l3_class',    provider: 'deepseek-v3', model: 'deepseek-v3.2-20250101', temp: 0.0 },
];

const BUBBLE_NODES = [
  { name: 'A2 意图判别',    latencyMs: 320, costPer1k: 0,    callVol: 18400, local: true  },
  { name: 'A3 QA 生成',    latencyMs: 142, costPer1k: 0.8,  callVol: 12600, local: false },
  { name: 'A3 QA 流式',    latencyMs: 340, costPer1k: 0,    callVol: 9800,  local: true  },
  { name: '安抚 Agent',    latencyMs: 410, costPer1k: 0,    callVol: 3200,  local: true  },
  { name: 'Embedding 检索', latencyMs: 68, costPer1k: 0.05, callVol: 47000, local: false },
  { name: 'L3 分类',       latencyMs: 195, costPer1k: 1.33, callVol: 7400,  local: false },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProviderStatusBadge({ status }: { status: LLMProvider['status'] }) {
  const cfg: Record<LLMProvider['status'], { color: string }> = {
    '就绪':   { color: 'var(--success)'  },
    '缺 Key': { color: 'var(--warning)'  },
    '已禁用': { color: 'var(--text-3)'   },
  };
  const { color } = cfg[status];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', marginRight: 4 }} />
      {status}
    </span>
  );
}

function PingIndicator({ result }: { result: 'ok' | 'fail' | null }) {
  if (result === null) return null;
  if (result === 'ok') {
    return (
      <span style={{ color: 'var(--success)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <CheckCircle size={12} /> 通
      </span>
    );
  }
  return (
    <span style={{ color: 'var(--danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
      <XCircle size={12} /> ✗
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LLM() {
  const [pingResults, setPingResults]   = useState<Record<string, 'ok' | 'fail' | null>>({});
  const [pinging, setPinging]           = useState<Record<string, boolean>>({});
  const [agentPings, setAgentPings]     = useState<Record<string, 'ok' | 'fail' | null>>({});
  const [agentPinging, setAgentPinging] = useState<Record<string, boolean>>({});
  const [assignments, setAssignments]   = useState<AgentAssign[]>(AGENT_ROWS);
  const [temperatures, setTemperatures] = useState<Record<string, number>>(
    Object.fromEntries(AGENT_ROWS.map(r => [r.key, r.temp]))
  );

  function pingProvider(id: string) {
    setPinging(p => ({ ...p, [id]: true }));
    const prov = PROVIDERS.find(p => p.id === id);
    const base = prov?.latencyMs ?? 300;
    const ms = base + Math.round(Math.random() * 40 - 20);
    setTimeout(() => {
      const ok = ms < 600;
      setPinging(p => ({ ...p, [id]: false }));
      setPingResults(p => ({ ...p, [id]: ok ? 'ok' : 'fail' }));
      toast(ok ? `✓ ${prov?.name} · ${ms}ms 连通` : `✗ ${prov?.name} 超时`, ok ? 'success' : 'danger');
    }, 600 + Math.random() * 400);
  }

  function pingAgent(key: string) {
    setAgentPinging(p => ({ ...p, [key]: true }));
    const assign = assignments.find(a => a.key === key);
    const prov = PROVIDERS.find(p => p.id === assign?.provider);
    const base = prov?.latencyMs ?? 300;
    const ms = base + Math.round(Math.random() * 60 - 30);
    setTimeout(() => {
      const ok = ms < 600;
      setAgentPinging(p => ({ ...p, [key]: false }));
      setAgentPings(p => ({ ...p, [key]: ok ? 'ok' : 'fail' }));
      toast(ok ? `✓ ${assign?.agent} · ${ms}ms` : `✗ ${assign?.agent} 超时`, ok ? 'success' : 'danger');
    }, 700 + Math.random() * 500);
  }

  function switchProvider(key: string, newProviderId: string) {
    const prov = PROVIDERS.find(p => p.id === newProviderId);
    if (!prov) return;
    setAssignments(prev =>
      prev.map(a => a.key === key ? { ...a, provider: newProviderId, model: prov.model } : a)
    );
  }

  function setTemp(key: string, val: number) {
    setTemperatures(prev => ({ ...prev, [key]: val }));
  }

  const bubbleOpt = useMemo(() => () => {
    const localColor = cssVar('--gold');
    const cloudColor = cssVar('--c3');
    const localData = BUBBLE_NODES.filter(n => n.local).map(
      n => [n.latencyMs, n.costPer1k, Math.max(18, n.callVol / 400), n.name]
    );
    const cloudData = BUBBLE_NODES.filter(n => !n.local).map(
      n => [n.latencyMs, n.costPer1k, Math.max(18, n.callVol / 400), n.name]
    );
    return {
      ...baseOption(),
      legend: {
        data: ['本地私有化', '云端 API'],
        right: 12, top: 4,
        textStyle: { color: cssVar('--text-2'), fontSize: 12, fontFamily: "'Geist','PingFang SC',sans-serif" },
      },
      tooltip: {
        trigger: 'item',
        ...(baseOption().tooltip as object),
        formatter: (params: { data: (string | number)[] }) => {
          const [lat, cost, , name] = params.data;
          const node = BUBBLE_NODES.find(n => n.name === name);
          const vol = node?.callVol ?? 0;
          return `<b style="font-size:13px">${name}</b><br/>延迟 <b>${lat}</b>ms&nbsp;&nbsp;单价 <b>¥${Number(cost).toFixed(3)}</b>/千 tok<br/>月调用 <b>${vol.toLocaleString()}</b> 次`;
        },
      },
      xAxis: {
        name: '延迟 (ms)', nameLocation: 'end',
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 11 },
        type: 'value', min: 0, max: 500,
        ...axisStyle(),
      },
      yAxis: {
        name: '单价 ¥/千 token', nameLocation: 'end',
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 11 },
        type: 'value', min: -0.05, max: 1.6,
        ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `¥${v.toFixed(2)}` },
      },
      series: [
        {
          name: '本地私有化', type: 'scatter',
          data: localData,
          symbolSize: (val: number[]) => val[2],
          itemStyle: { color: localColor, opacity: 0.85, borderColor: localColor, borderWidth: 1.5 },
          label: {
            show: true,
            formatter: (p: { data: (string | number)[] }) => p.data[3] as string,
            position: 'top', color: cssVar('--text-2'), fontSize: 10,
          },
        },
        {
          name: '云端 API', type: 'scatter',
          data: cloudData,
          symbolSize: (val: number[]) => val[2],
          itemStyle: { color: cloudColor, opacity: 0.78, borderColor: cloudColor, borderWidth: 1.5 },
          label: {
            show: true,
            formatter: (p: { data: (string | number)[] }) => p.data[3] as string,
            position: 'top', color: cssVar('--text-2'), fontSize: 10,
          },
        },
      ],
    };
  }, []);

  return (
    <div className="page">
      <PageHeader
        title="LLM 配置"
        subtitle="逐节点定模型 · 本地 / 云端混部 · 成本 × 延迟可视"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => toast('配置已保存', 'success')}>
            保存配置
          </button>
        }
      />

      {/* Provider 概览 */}
      <SectionTitle>Provider 概览</SectionTitle>
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12, marginBottom: 32 }}
      >
        {PROVIDERS.map((prov, i) => (
          <Card
            key={prov.id}
            className={`reveal reveal-${Math.min(i + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6} card-hover`}
            style={{ padding: '16px 18px' }}
          >
            <div className="col gap-2" style={{ height: '100%' }}>
              {/* Header */}
              <div className="row spread" style={{ alignItems: 'flex-start' }}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  {prov.local
                    ? <Shield size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                    : <Wifi    size={14} style={{ color: 'var(--c3)',  flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{prov.name}</span>
                </div>
                <ProviderStatusBadge status={prov.status} />
              </div>

              {/* Model ID */}
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {prov.model}
              </div>

              {/* Stats row */}
              <div className="row gap-4" style={{ marginTop: 4 }}>
                <div className="col gap-1">
                  <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.04em' }}>P50 延迟</span>
                  <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                    {prov.latencyMs}
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>ms</span>
                  </span>
                </div>
                <div className="col gap-1">
                  <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.04em' }}>单价</span>
                  <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: prov.local ? 'var(--gold)' : 'var(--text-1)' }}>
                    {prov.local ? '¥0' : `¥${prov.costPer1k}`}
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>/千 tok</span>
                  </span>
                </div>
              </div>

              {/* Local badge */}
              {prov.local && (
                <span className="badge" style={{ background: 'color-mix(in srgb, var(--gold) 10%, transparent)', color: 'var(--gold)', fontSize: 10, alignSelf: 'flex-start', marginTop: 2 }}>
                  私有化部署 · 数据不出域
                </span>
              )}

              {/* Ping */}
              <div className="row gap-2" style={{ marginTop: 8, alignItems: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => pingProvider(prov.id)}
                  disabled={prov.status !== '就绪' || !!pinging[prov.id]}
                >
                  {pinging[prov.id] ? <span className="dot-pulse" /> : '测连通'}
                </button>
                <PingIndicator result={pingResults[prov.id] ?? null} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Agent 分配表 */}
      <SectionTitle>Agent 节点 · 模型分配</SectionTitle>
      <Card style={{ marginBottom: 32, overflow: 'visible' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ width: '100%', minWidth: 680 }}>
            <thead>
              <tr>
                <th style={{ width: 150 }}>Agent 节点</th>
                <th>当前 Provider</th>
                <th style={{ width: 230 }}>切换为</th>
                <th style={{ width: 120 }}>Temperature</th>
                <th style={{ width: 110 }}>实测连通</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(row => {
                const curProv = PROVIDERS.find(p => p.id === row.provider);
                const temp = temperatures[row.key] ?? row.temp;
                return (
                  <tr key={row.key}>
                    {/* Agent */}
                    <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{row.agent}</td>

                    {/* 当前 Provider */}
                    <td>
                      <div className="col gap-1">
                        <span style={{ fontSize: 13, color: 'var(--text-1)' }}>
                          {curProv?.local && <Shield size={11} style={{ color: 'var(--gold)', marginRight: 4, verticalAlign: 'middle' }} />}
                          {curProv?.name}
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{row.model}</span>
                      </div>
                    </td>

                    {/* 切换下拉 */}
                    <td>
                      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%' }}>
                        <select
                          className="input"
                          style={{ paddingRight: 28, fontSize: 12, appearance: 'none', cursor: 'pointer', width: '100%' }}
                          value={row.provider}
                          onChange={e => switchProvider(row.key, e.target.value)}
                        >
                          {PROVIDERS.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: 'var(--text-3)' }} />
                      </div>
                    </td>

                    {/* Temperature */}
                    <td>
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <input
                          type="range" min={0} max={1} step={0.1}
                          value={temp}
                          onChange={e => setTemp(row.key, parseFloat(e.target.value))}
                          style={{ width: 60, accentColor: 'var(--gold)', cursor: 'pointer' }}
                        />
                        <span className="tnum" style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 24 }}>{temp.toFixed(1)}</span>
                      </div>
                    </td>

                    {/* 实测连通 */}
                    <td>
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, padding: '3px 10px' }}
                          onClick={() => pingAgent(row.key)}
                          disabled={!!agentPinging[row.key]}
                        >
                          {agentPinging[row.key] ? <span className="dot-pulse" /> : '测试'}
                        </button>
                        <PingIndicator result={agentPings[row.key] ?? null} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 失败不回退说明 */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <WifiOff size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            节点失败不做静默降级（按设计）——失败时返回明确错误码，由上游 A1 决策转人工。
          </span>
        </div>
      </Card>

      {/* 成本 × 延迟气泡散点图 */}
      <SectionTitle>成本 × 延迟 · 节点分布图</SectionTitle>
      <Card style={{ marginBottom: 28 }}>
        <Toolbar>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            X = 延迟(ms) · Y = 单价 ¥/千 token · 气泡大小 = 月调用量 · 青 = 本地私有化 · 蓝 = 云端 API
          </span>
        </Toolbar>
        <Chart build={bubbleOpt} height={300} />
      </Card>
    </div>
  );
}
