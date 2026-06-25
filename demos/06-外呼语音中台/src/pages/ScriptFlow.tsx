import { Fragment, useMemo, useRef, useState } from 'react';
import {
  Workflow, Play, Square, Lock, MessageSquareText, BrainCircuit, GitBranch,
  Volume2, ClipboardList, UserCog, PhoneOff, GitMerge, Hand, Mic, RotateCcw, Save, Pencil,
} from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel } from '../components/sig';
import { Field, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, cssVar } from '../lib/chartTheme';
import { usePrefersReducedMotion } from '../lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import type { ScriptNode, ScriptNodeKind, ScriptEdge, PathShare } from '../types';
import { SCRIPT_NODE_LABEL } from '../types';

// ════════════════════════════════════════════════════════════════════════
// 话术流编排器（M4）· 信用卡激活回访完整对话树
// 绝对定位节点卡 + SVG 连线（非力导向）· barge-in 打断配置 · 模拟运行走查
// 🔒 脱敏：示例消费金融 / 小云 / 信用贷 / 400-800-1234。克制回访口吻。
// ════════════════════════════════════════════════════════════════════════

// ── 信用卡激活回访 · 对话树节点（画布坐标，单位 px）──────────────────────────
const NODES: ScriptNode[] = [
  {
    id: 'open', kind: 'open', title: '开场 · 身份确认', x: 40, y: 220,
    detail: '您好，这里是示例消费金融客户回访，工号 8801，占用您一分钟，请问是机主本人吗？',
    intents: ['本人确认', '非本人', '稍后回电'],
  },
  {
    id: 'understand', kind: 'understand', title: 'LLM 意图理解', x: 280, y: 220,
    detail: '语义解析客户应答，归一到「已激活 / 未激活 / 拒接回访 / 要求人工」四类意图；置信度 < 0.6 时进入澄清重述。',
    intents: ['已激活', '未激活', '拒接回访', '要求人工'],
  },
  {
    id: 'branch', kind: 'branch', title: '条件分支', x: 540, y: 220,
    detail: '依据意图与账户状态路由：命中敏感词 / 三次未识别 → 优先转人工；勿扰时段命中 → 直接挂机登记。',
    intents: ['已激活', '未激活', '拒接回访', '要求人工'],
  },
  // 分支 1 · 已激活
  {
    id: 'tts-done', kind: 'tts', title: 'TTS · 激活成功告知', x: 820, y: 40,
    detail: '您的信用贷账户已激活成功，本次仅作安全确认，不涉及任何费用。如有疑问可致电客服 400-800-1234。',
  },
  {
    id: 'collect-done', kind: 'collect', title: '采集 · 服务号核对', x: 1080, y: 40,
    detail: '核对预留服务手机号尾号（如 2841）；客户确认后写入回访结论字段。',
    intents: ['号码无误', '需更新'],
  },
  // 分支 2 · 未激活
  {
    id: 'tts-guide', kind: 'tts', title: 'TTS · 激活引导', x: 820, y: 170,
    detail: '检测到账户尚未激活，可在「小云」App 首页 → 我的额度 → 一键激活完成，全程无需费用。',
  },
  {
    id: 'collect-time', kind: 'collect', title: '采集 · 回访意愿', x: 1080, y: 170,
    detail: '询问是否需要后续提醒及方便的回访时段，记录至意向字段（尊重勿扰时段 21:00–09:00）。',
    intents: ['同意提醒', '暂不需要'],
  },
  // 分支 3 · 拒接回访
  {
    id: 'tts-dnd', kind: 'tts', title: 'TTS · 免打扰登记', x: 820, y: 320,
    detail: '好的，已为您登记免打扰，后续不再致电。给您带来打扰非常抱歉，祝您生活愉快。',
  },
  {
    id: 'hangup-dnd', kind: 'hangup', title: '挂机 · 写入勿扰名单', x: 1080, y: 320,
    detail: '结束通话，客户号码写入勿扰名单并触发频控冷却，回访结论标记「拒接回访」。',
  },
  // 分支 4 · 转人工
  {
    id: 'handoff', kind: 'handoff', title: '转人工 · 上下文交接', x: 820, y: 470,
    detail: '非常抱歉，正在为您转接专属人工客服。AI 已生成上下文摘要与已采集字段，坐席可直接带全程上下文接管。',
  },
  {
    id: 'hangup-ok', kind: 'hangup', title: '挂机 · 回访完成', x: 1340, y: 105,
    detail: '感谢您的配合，回访已完成。结论与转写自动归档至通话记录。',
  },
];

const EDGES: ScriptEdge[] = [
  { source: 'open', target: 'understand' },
  { source: 'understand', target: 'branch' },
  { source: 'branch', target: 'tts-done', label: '已激活' },
  { source: 'branch', target: 'tts-guide', label: '未激活' },
  { source: 'branch', target: 'tts-dnd', label: '拒接回访' },
  { source: 'branch', target: 'handoff', label: '要求人工' },
  { source: 'tts-done', target: 'collect-done' },
  { source: 'collect-done', target: 'hangup-ok' },
  { source: 'tts-guide', target: 'collect-time' },
  { source: 'collect-time', target: 'hangup-ok' },
  { source: 'tts-dnd', target: 'hangup-dnd' },
  { source: 'handoff', target: 'hangup-ok' },
];

// 模拟运行走查路径（已激活主路径，一条完整链路）
const SIM_PATH = ['open', 'understand', 'branch', 'tts-done', 'collect-done', 'hangup-ok'];

// 节点画布尺寸（用于 viewBox 计算）
const NODE_W = 196;
const NODE_H = 74;
const CANVAS_W = 1560;
const CANVAS_H = 580;

// 话术路径桑基占比（源 → 各分支 → 结束）
const PATH_LINKS: { source: string; target: string; value: number }[] = [
  { source: '开场', target: '已激活', value: 4180 },
  { source: '开场', target: '未激活', value: 1620 },
  { source: '开场', target: '拒接回访', value: 940 },
  { source: '开场', target: '要求人工', value: 510 },
  { source: '已激活', target: '回访完成', value: 3960 },
  { source: '已激活', target: '号码更新', value: 220 },
  { source: '未激活', target: '回访完成', value: 1180 },
  { source: '未激活', target: '后续提醒', value: 440 },
  { source: '拒接回访', target: '免打扰登记', value: 940 },
  { source: '要求人工', target: '坐席接管', value: 510 },
];
const PATH_NODES = [
  '开场', '已激活', '未激活', '拒接回访', '要求人工',
  '回访完成', '号码更新', '后续提醒', '免打扰登记', '坐席接管',
];

// ── 节点 kind → 语义色 + 图标 ──────────────────────────────────────────────
// 翡翠绿 = 接通/正向流转；金 = 稀缺资质语义（采集合规字段）；琥珀 = 敏感/勿扰；
// 转人工 = info 蓝；挂机 = 中性灰。一页一 accent = 翡翠绿。
const KIND_META: Record<ScriptNodeKind, { color: string; icon: typeof Workflow }> = {
  open: { color: 'var(--gold)', icon: MessageSquareText },
  understand: { color: 'var(--gold)', icon: BrainCircuit },
  branch: { color: 'var(--gold)', icon: GitBranch },
  tts: { color: 'var(--text-2)', icon: Volume2 },
  collect: { color: 'var(--qual)', icon: ClipboardList },
  handoff: { color: 'var(--info)', icon: UserCog },
  hangup: { color: 'var(--text-3)', icon: PhoneOff },
};

// 分支标签 → 语义色（已激活=翡翠 / 未激活=金 / 拒接=琥珀 / 转人工=蓝）
function edgeLabelColor(label?: string): string {
  if (label === '已激活') return 'var(--success)';
  if (label === '未激活') return 'var(--qual)';
  if (label === '拒接回访') return 'var(--warning)';
  if (label === '要求人工') return 'var(--info)';
  return 'var(--text-3)';
}

function nodeById(id: string) { return NODES.find(n => n.id === id)!; }

// 两节点之间的正交贝塞尔连线（出右侧中点 → 入左侧中点）
function edgePath(a: ScriptNode, b: ScriptNode): string {
  const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2;
  const x2 = b.x, y2 = b.y + NODE_H / 2;
  const dx = Math.max(40, (x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export default function ScriptFlow() {
  const reduced = usePrefersReducedMotion();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('script:edit');

  const [selId, setSelId] = useState('branch');
  const [activeNode, setActiveNode] = useState<string | null>(null); // 模拟运行高亮
  const [activeEdge, setActiveEdge] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // barge-in 打断配置
  const [sensitivity, setSensitivity] = useState(62);
  const [bargeTts, setBargeTts] = useState(true);
  const [silenceRetry, setSilenceRetry] = useState(true);

  const sel = useMemo(() => NODES.find(n => n.id === selId) ?? null, [selId]);

  // ── 模拟运行：逐节点高亮一条路径（尊重 reduce-motion）──────────────────────
  function stopSim() {
    if (simTimer.current) { clearInterval(simTimer.current); simTimer.current = null; }
    setRunning(false);
    setActiveNode(null);
    setActiveEdge(null);
  }

  function runSim() {
    if (running) { stopSim(); return; }
    if (reduced) {
      // 降级：直接落到终点，不做逐帧推进
      setActiveNode(SIM_PATH[SIM_PATH.length - 1]);
      setSelId(SIM_PATH[SIM_PATH.length - 1]);
      toast('已按已激活路径走查（动效已按系统偏好关闭）', 'success');
      return;
    }
    setRunning(true);
    let i = 0;
    setActiveNode(SIM_PATH[0]);
    setSelId(SIM_PATH[0]);
    setActiveEdge(null);
    simTimer.current = setInterval(() => {
      i += 1;
      if (i >= SIM_PATH.length) {
        stopSim();
        toast('模拟走查完成 · 已激活 → 回访完成', 'success');
        return;
      }
      setActiveEdge(`${SIM_PATH[i - 1]}__${SIM_PATH[i]}`);
      setActiveNode(SIM_PATH[i]);
      setSelId(SIM_PATH[i]);
    }, 850);
  }

  // ── 桑基图（话术路径走向占比）─────────────────────────────────────────────
  const sankey = () => ({
    ...baseOption(),
    tooltip: {
      ...(baseOption().tooltip as object),
      trigger: 'item',
      formatter: (p: { dataType: string; name: string; value: number }) =>
        p.dataType === 'edge'
          ? `${p.name}<br/>通话量 ${p.value.toLocaleString('zh-CN')}`
          : `${p.name}`,
    },
    series: [{
      type: 'sankey',
      left: 4, right: 92, top: 8, bottom: 8,
      nodeWidth: 12, nodeGap: 12,
      draggable: false,
      emphasis: { focus: 'adjacency' },
      label: { color: cssVar('--text-2'), fontSize: 11, fontFamily: "'Geist','PingFang SC',system-ui" },
      lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.32 },
      itemStyle: { borderWidth: 0, borderRadius: 3 },
      data: PATH_NODES.map(name => ({
        name,
        itemStyle: {
          color:
            name === '开场' ? cssVar('--gold')
              : name === '已激活' || name === '回访完成' ? cssVar('--success')
                : name === '未激活' || name === '号码更新' || name === '后续提醒' ? cssVar('--qual')
                  : name === '拒接回访' || name === '免打扰登记' ? cssVar('--warning')
                    : cssVar('--info'),
        },
      })),
      links: PATH_LINKS,
      animationDuration: 800,
    }],
  });

  return (
    <div className="page page-wide">
      <PageHeader
        title="话术流编排器"
        subtitle="信用卡激活回访 · 可视化对话树 · LLM 意图节点 · barge-in 打断 · 模拟走查"
        actions={
          <div className="row gap-2">
            <span className="qual-badge"><Lock size={11} />{canEdit ? '可编辑' : '只读视图'}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { stopSim(); toast('已重置走查高亮', 'info'); }}>
              <RotateCcw size={13} />重置
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={runSim}
              title={reduced ? '系统已开启减弱动效 · 走查将直接落点' : '逐节点高亮一条对话路径'}
            >
              {running ? <Square size={13} /> : <Play size={13} />}{running ? '停止走查' : '模拟运行'}
            </button>
          </div>
        }
      />

      {/* 主区：左 画布 / 右 属性 + barge-in */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2.1fr) 360px', gap: 14, marginBottom: 14 }}>
        {/* ── 节点画布 ── */}
        <Panel
          title="对话树画布"
          icon={<Workflow size={13} />}
          right={
            <span className="row gap-2 t-small text-3">
              <span className="mononum">{NODES.length} 节点 · {EDGES.length} 连线</span>
              {running && <span className="row gap-1" style={{ color: 'var(--success)' }}><span className="live-pulse" />走查中</span>}
            </span>
          }
          bodyClass="panel-body-0"
        >
          <div className="flow-scroll" style={{ overflow: 'auto', maxHeight: 580 }}>
            <div
              className="flow-canvas"
              style={{
                position: 'relative',
                width: CANVAS_W,
                height: CANVAS_H,
                // 点阵背景（话务作战台 · 非纯色）
                backgroundImage:
                  'radial-gradient(circle, var(--hairline) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
                backgroundPosition: '11px 11px',
              }}
            >
              {/* SVG 连线层（在节点卡下方）*/}
              <svg
                width={CANVAS_W}
                height={CANVAS_H}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
                aria-hidden
              >
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-3)" />
                  </marker>
                  <marker id="arrow-on" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--gold)" />
                  </marker>
                </defs>
                {EDGES.map(e => {
                  const a = nodeById(e.source), b = nodeById(e.target);
                  const on = activeEdge === `${e.source}__${e.target}`;
                  const lc = edgeLabelColor(e.label);
                  const mx = (a.x + NODE_W + b.x) / 2;
                  const my = (a.y + b.y) / 2 + NODE_H / 2;
                  return (
                    <Fragment key={`${e.source}-${e.target}`}>
                      <path
                        d={edgePath(a, b)}
                        fill="none"
                        stroke={on ? 'var(--gold)' : 'var(--hairline-strong)'}
                        strokeWidth={on ? 2.4 : 1.4}
                        markerEnd={on ? 'url(#arrow-on)' : 'url(#arrow)'}
                        style={{ transition: 'stroke .3s var(--ease), stroke-width .3s var(--ease)' }}
                      />
                      {e.label && (
                        <foreignObject x={mx - 38} y={my - 24} width={76} height={20} style={{ overflow: 'visible' }}>
                          <div
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              padding: '1px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 600,
                              whiteSpace: 'nowrap',
                              color: lc,
                              background: `color-mix(in srgb, ${lc} 14%, var(--surface-1))`,
                              border: `1px solid color-mix(in srgb, ${lc} 30%, transparent)`,
                            }}
                          >
                            {e.label}
                          </div>
                        </foreignObject>
                      )}
                    </Fragment>
                  );
                })}
              </svg>

              {/* 节点卡层 */}
              {NODES.map(n => {
                const meta = KIND_META[n.kind];
                const Icon = meta.icon;
                const isSel = n.id === selId;
                const isActive = activeNode === n.id;
                const nodeBorderColor = isActive ? 'var(--gold)' : isSel ? meta.color : 'var(--hairline)';
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelId(n.id)}
                    className="flow-node"
                    style={{
                      position: 'absolute', left: n.x, top: n.y, width: NODE_W,
                      textAlign: 'left', cursor: 'pointer',
                      background: 'var(--surface-1)',
                      borderTop: `1px solid ${nodeBorderColor}`,
                      borderRight: `1px solid ${nodeBorderColor}`,
                      borderBottom: `1px solid ${nodeBorderColor}`,
                      borderLeft: `3px solid ${meta.color}`,
                      borderRadius: 'var(--r-md)',
                      padding: '9px 11px',
                      boxShadow: isActive
                        ? '0 0 0 3px var(--gold-glow), var(--elev-2)'
                        : isSel ? 'var(--elev-2)' : 'var(--elev-1)',
                      transform: isActive ? 'translateY(-2px)' : 'none',
                      transition: 'border-color .25s var(--ease), box-shadow .25s var(--ease), transform .25s var(--ease)',
                    }}
                  >
                    <div className="row gap-2" style={{ marginBottom: 5 }}>
                      <span
                        className="row"
                        style={{
                          width: 22, height: 22, borderRadius: 6, justifyContent: 'center', flexShrink: 0,
                          color: meta.color,
                          background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                        }}
                      >
                        <Icon size={13} />
                      </span>
                      <span className="label" style={{ color: meta.color, letterSpacing: '0.06em' }}>
                        {SCRIPT_NODE_LABEL[n.kind]}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.35 }}>
                      {n.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        {/* ── 右栏：节点属性 + barge-in ── */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {/* 节点属性面板 */}
          <Panel title="节点属性" icon={<Pencil size={13} />} right={sel && <span className="t-small text-3">{SCRIPT_NODE_LABEL[sel.kind]}</span>}>
            {sel && (
              <div className="col gap-3">
                <div className="row gap-2">
                  {(() => { const M = KIND_META[sel.kind]; const I = M.icon; return (
                    <span className="row" style={{ width: 28, height: 28, borderRadius: 8, justifyContent: 'center', color: M.color, background: `color-mix(in srgb, ${M.color} 14%, transparent)` }}>
                      <I size={15} />
                    </span>
                  ); })()}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{sel.title}</div>
                    <div className="t-small text-3 mononum">节点 ID · {sel.id}</div>
                  </div>
                </div>

                <Field label={sel.kind === 'understand' ? 'LLM Prompt' : sel.kind === 'collect' ? '采集话术' : '话术文本'} hint={canEdit ? '编辑后自动校验敏感词与合规口径' : '当前角色为只读视图（需 script:edit 权限）'}>
                  <textarea
                    className="input mono"
                    style={{ minHeight: 92, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', opacity: canEdit ? 1 : 0.85 }}
                    defaultValue={sel.detail}
                    readOnly={!canEdit}
                  />
                </Field>

                {sel.intents && sel.intents.length > 0 && (
                  <div className="col gap-2">
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>可选意图</label>
                    <div className="row wrap gap-2">
                      {sel.intents.map(it => (
                        <span key={it} className="tag" style={{ fontWeight: 600 }}>{it}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="超时 (秒)">
                    <input className="input mononum" type="number" defaultValue={sel.kind === 'understand' ? 8 : 12} readOnly={!canEdit} />
                  </Field>
                  <Field label="最大重试">
                    <input className="input mononum" type="number" defaultValue={sel.kind === 'collect' ? 2 : 1} readOnly={!canEdit} />
                  </Field>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  disabled={!canEdit}
                  onClick={() => toast('节点已保存（演示）', 'success')}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Save size={13} />{canEdit ? '保存节点' : '只读 · 无法保存'}
                </button>
                {!canEdit && <div className="t-small text-3">当前角色无 script:edit 权限，仅可查看话术流配置。</div>}
              </div>
            )}
          </Panel>

          {/* barge-in 打断配置 */}
          <Panel title="barge-in 打断配置" icon={<Hand size={13} />}>
            <div className="col gap-3">
              <div className="col gap-2">
                <div className="spread">
                  <label className="row gap-2" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>
                    <Mic size={13} style={{ color: 'var(--gold)' }} />打断灵敏度
                  </label>
                  <span className="mononum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>{sensitivity}</span>
                </div>
                <input
                  type="range" min={0} max={100} value={sensitivity}
                  onChange={e => setSensitivity(Number(e.target.value))}
                  disabled={!canEdit}
                  style={{ width: '100%', accentColor: 'var(--gold)', cursor: canEdit ? 'pointer' : 'not-allowed' }}
                />
                <div className="spread t-small text-3">
                  <span>迟钝 · 少误打断</span>
                  <span>灵敏 · 抢话即停</span>
                </div>
              </div>

              <div className="divider" style={{ margin: '2px 0' }} />

              <ToggleRow
                label="客户抢话打断 TTS"
                hint="客户开口即暂停播报，转入实时收音"
                on={bargeTts}
                disabled={!canEdit}
                onToggle={() => setBargeTts(v => !v)}
              />
              <ToggleRow
                label="静默兜底重述"
                hint="连续静默 3 秒后自动重述上一轮话术"
                on={silenceRetry}
                disabled={!canEdit}
                onToggle={() => setSilenceRetry(v => !v)}
              />
            </div>
          </Panel>
        </div>
      </div>

      {/* ── 底部：话术路径桑基图 ── */}
      <Panel
        title="话术路径走向占比"
        icon={<GitMerge size={13} />}
        right={<span className="t-small text-3 mononum">近 7 日 · 7,250 通回访</span>}
      >
        <Chart build={sankey} height={300} />
      </Panel>
    </div>
  );
}

// ── 内联开关行（无原生 toggle CSS，自绘语义开关）──────────────────────────────
function ToggleRow({ label, hint, on, disabled, onToggle }: {
  label: string; hint: string; on: boolean; disabled?: boolean; onToggle: () => void;
}) {
  return (
    <div className="spread" style={{ gap: 12, opacity: disabled ? 0.7 : 1 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{label}</div>
        <div className="t-small text-3" style={{ marginTop: 2 }}>{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        disabled={disabled}
        style={{
          flexShrink: 0, width: 40, height: 23, borderRadius: 999, padding: 2,
          border: '1px solid var(--hairline)',
          background: on ? 'var(--gold)' : 'var(--surface-3)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'inline-flex', alignItems: 'center',
          justifyContent: on ? 'flex-end' : 'flex-start',
          transition: 'background .25s var(--ease)',
        }}
      >
        <span
          style={{
            width: 17, height: 17, borderRadius: '50%',
            background: on ? 'var(--accent-ink)' : 'var(--text-3)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
            transition: 'transform .25s var(--ease)',
          }}
        />
      </button>
    </div>
  );
}
