import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, Pause, ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, Cpu, FileCheck2,
  Mic, AudioLines, GitBranch, Boxes, Gauge as GaugeIcon, ArrowUpRight,
} from 'lucide-react';
import { PageHeader, Card, SectionTitle, Badge } from '../components/ui';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar } from '../lib/chartTheme';

// ─── 本页类型（局部）──────────────────────────────────────────────────────
type Speaker = 'agent' | 'customer';
type SegKind = 'normal' | 'violation' | 'compliant' | 'risk' | 'silence' | 'overlap';
interface Seg { id: string; speaker: Speaker; text: string; start: number; end: number; kind: SegKind; itemId?: string; tag?: string; }
type Engine = 'rule' | 'llm';
type Group = '合规项' | '服务项' | '主观项';
interface Item { id: string; name: string; group: Group; engine: Engine; weight: number; hit: boolean; deduction: number; evidence?: string; segId?: string; }
interface Stage { key: string; name: string; icon: React.ReactNode; ms: number; }

// ─── mock：一通「逾期催收」通话的全量质检（真实消金违规场景）──────────────
const SESSION = { id: 'QC-20260617-0832', agent: '赵越', team: '客服一部', customer: '客户 尾号 6271', biz: '逾期催收', channel: '通话', duration: 188, score: 63 };

const STAGES: Stage[] = [
  { key: 's1', name: '录音采集', icon: <Mic size={14} />, ms: 12 },
  { key: 's2', name: 'ASR + 说话人分离', icon: <AudioLines size={14} />, ms: 1840 },
  { key: 's3', name: '文本结构化', icon: <FileCheck2 size={14} />, ms: 320 },
  { key: 's4', name: '双引擎并行', icon: <GitBranch size={14} />, ms: 760 },
  { key: 's5', name: '多子-agent 评分', icon: <Boxes size={14} />, ms: 540 },
  { key: 's6', name: '汇总评分', icon: <Cpu size={14} />, ms: 90 },
];

const SEGS: Seg[] = [
  { id: 'g1', speaker: 'agent', text: '您好，这边是示例消费金融信用贷客服中心，工号 8842，请问是 X 先生本人吗？', start: 0, end: 8, kind: 'compliant', itemId: 'i7', tag: '开场白规范' },
  { id: 'g2', speaker: 'customer', text: '是我，什么事？', start: 8, end: 11, kind: 'normal' },
  { id: 'g3', speaker: 'agent', text: '为核实身份，麻烦提供下您的姓名和身份证后四位。', start: 11, end: 16, kind: 'compliant', itemId: 'i8', tag: '身份核验' },
  { id: 'g4', speaker: 'customer', text: '（报上信息）行了你说吧。', start: 16, end: 20, kind: 'normal' },
  { id: 'g5', speaker: 'agent', text: '您这笔信用贷已逾期 18 天，今天联系您是想确认下还款安排。', start: 20, end: 27, kind: 'normal' },
  { id: 'g6', speaker: 'customer', text: '我最近手头紧，能不能少还点？利息到底多少啊？', start: 27, end: 33, kind: 'normal' },
  { id: 'g7', speaker: 'agent', text: '您直接在 APP 申请就行，额度下来就知道了，利息不高的。', start: 33, end: 40, kind: 'violation', itemId: 'i1', tag: '未告知年化利率' },
  { id: 'g8', speaker: 'customer', text: '到底多少你倒是说清楚！', start: 40, end: 44, kind: 'risk', tag: '情绪上升' },
  { id: 'g9', speaker: 'agent', text: '（静默）', start: 44, end: 53, kind: 'silence', tag: '静默 9s' },
  { id: 'g10', speaker: 'agent', text: '您放心，只要今天还，我保证给您把这部分利息全免了。', start: 53, end: 60, kind: 'violation', itemId: 'i2', tag: '越权承诺' },
  { id: 'g11', speaker: 'customer', text: '那不还会怎样——', start: 60, end: 63, kind: 'normal' },
  { id: 'g12', speaker: 'agent', text: '再不还款我们就只能联系您单位同事了，影响多不好。', start: 62, end: 69, kind: 'violation', itemId: 'i3', tag: '催收红线' },
  { id: 'g13', speaker: 'customer', text: '你这是威胁我？！', start: 69, end: 73, kind: 'risk', tag: '情绪激化' },
  { id: 'g14', speaker: 'agent', text: '先生别激动，我理解您的难处，我们一起看个最合适的方案好吗。', start: 73, end: 82, kind: 'compliant', itemId: 'i9', tag: '情绪安抚' },
  { id: 'g15', speaker: 'agent', text: '感谢您的耐心，后续我会短信发您还款指引，祝您生活愉快。', start: 82, end: 90, kind: 'compliant', itemId: 'i10', tag: '结束语规范' },
];

const ITEMS: Item[] = [
  { id: 'i1', name: '年化利率告知', group: '合规项', engine: 'llm', weight: 15, hit: false, deduction: 15, evidence: '“您直接在 APP 申请就行……利息不高的” — 全程未明示年化利率（APR）', segId: 'g7' },
  { id: 'i2', name: '禁越权承诺', group: '合规项', engine: 'rule', weight: 10, hit: false, deduction: 10, evidence: '“我保证给您把这部分利息全免了” — 命中禁语「保证/全免」', segId: 'g10' },
  { id: 'i3', name: '催收红线（禁威胁/第三方）', group: '合规项', engine: 'llm', weight: 12, hit: false, deduction: 12, evidence: '“再不还款就联系您单位同事” — 违反催收红线，涉第三方施压', segId: 'g12' },
  { id: 'i4', name: '逾期后果告知', group: '合规项', engine: 'rule', weight: 6, hit: true, deduction: 0 },
  { id: 'i5', name: '个人信息授权', group: '合规项', engine: 'rule', weight: 6, hit: true, deduction: 0 },
  { id: 'i6', name: '冷静期/还款方式告知', group: '合规项', engine: 'rule', weight: 5, hit: true, deduction: 0 },
  { id: 'i7', name: '开场白与机构表明', group: '服务项', engine: 'rule', weight: 8, hit: true, deduction: 0, segId: 'g1' },
  { id: 'i8', name: '身份核验', group: '服务项', engine: 'rule', weight: 8, hit: true, deduction: 0, segId: 'g3' },
  { id: 'i9', name: '情绪安抚', group: '主观项', engine: 'llm', weight: 5, hit: false, deduction: 5, evidence: '客户情绪激化后安抚滞后，静默 9s 未及时回应', segId: 'g14' },
  { id: 'i10', name: '结束语规范', group: '服务项', engine: 'rule', weight: 6, hit: true, deduction: 0, segId: 'g15' },
];

const EMO = Array.from({ length: 19 }, (_, i) => {
  const sec = i * 10;
  // 客户情绪强度（越高越激动），坐席相对平稳
  const cust = [20, 24, 28, 30, 46, 70, 58, 82, 88, 60][Math.min(Math.floor(sec / 19), 9)] ?? 40;
  const agent = [30, 30, 32, 34, 36, 42, 40, 46, 44, 38][Math.min(Math.floor(sec / 19), 9)] ?? 35;
  return { sec, cust, agent };
});

const KIND_STYLE: Record<SegKind, { bar: string; bg: string; label?: string }> = {
  normal: { bar: 'transparent', bg: 'var(--surface-2)' },
  violation: { bar: 'var(--danger)', bg: 'color-mix(in srgb, var(--danger) 9%, var(--surface-1))', label: '违规' },
  compliant: { bar: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 9%, var(--surface-1))', label: '合规' },
  risk: { bar: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 9%, var(--surface-1))', label: '风险' },
  silence: { bar: 'var(--text-3)', bg: 'var(--surface-3)', label: '静默' },
  overlap: { bar: 'var(--info)', bg: 'color-mix(in srgb, var(--info) 9%, var(--surface-1))', label: '抢话' },
};

const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const GROUPS: Group[] = ['合规项', '服务项', '主观项'];

export default function Workbench() {
  const [cur, setCur] = useState(0);            // 当前游标（秒）
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);   // 选中评分项
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setCur(c => (c >= SESSION.duration ? (setPlaying(false), 0) : c + 1)), 130);
    return () => clearInterval(t);
  }, [playing]);

  const curSeg = useMemo(() => SEGS.find(s => cur >= s.start && cur < s.end), [cur]);
  const onSeg = (s: Seg) => { setCur(s.start); if (s.itemId) setSel(s.itemId); };
  const scoreTone = SESSION.score >= 85 ? 'var(--success)' : SESSION.score >= 70 ? 'var(--warning)' : 'var(--danger)';
  const totalDed = ITEMS.reduce((a, b) => a + b.deduction, 0);
  const violCount = ITEMS.filter(i => !i.hit).length;

  return (
    <div className="page" style={{ maxWidth: 1600 }}>
      <PageHeader
        title="质检工作台"
        subtitle={`逐句可解释的 100% 全量质检 · 拖动游标，转写 ↔ 评分卡 ↔ 情感曲线三处联动`}
        actions={<><Badge color="var(--danger)">高风险通话</Badge><button className="btn btn-subtle btn-sm">下一条待复核 <ArrowUpRight size={13} /></button></>}
      />

      {/* ── 多-agent 流水线状态条 ── */}
      <Card className="reveal" style={{ marginBottom: 14, padding: '13px 18px' }}>
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            {STAGES.map((st, i) => (
              <div key={st.key} className="row gap-2">
                <div className="row gap-2" style={{ padding: '5px 11px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
                  <span style={{ color: 'var(--success)', display: 'flex' }}>{st.icon}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{st.name}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{st.ms}ms</span>
                  <ShieldCheck size={12} style={{ color: 'var(--success)' }} />
                </div>
                {i < STAGES.length - 1 && <ChevronDown size={13} style={{ color: 'var(--text-3)', transform: 'rotate(-90deg)' }} />}
              </div>
            ))}
          </div>
          <button className="btn btn-subtle btn-sm" onClick={() => window.location.assign('/pipeline')} style={{ flexShrink: 0 }}>
            查看流水线 <ArrowUpRight size={13} />
          </button>
        </div>
      </Card>

      {/* ── 会话头 + 播放器 ── */}
      <Card className="reveal reveal-1" style={{ marginBottom: 14, padding: '14px 18px' }}>
        <div className="row wrap gap-4" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{SESSION.id}</span>
            <span className="t-small text-3">坐席 <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{SESSION.agent}</b> · {SESSION.team}</span>
            <span className="t-small text-3">{SESSION.customer}</span>
            <span className="tag">{SESSION.biz}</span>
            <span className="tag">{SESSION.channel}</span>
          </div>
          <div className="row gap-3" style={{ flex: 1, minWidth: 280, maxWidth: 560 }}>
            <button className="btn btn-primary btn-icon" onClick={() => setPlaying(p => !p)} aria-label={playing ? '暂停' : '播放'}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 38 }}>{fmtT(cur)}</span>
            <input type="range" min={0} max={SESSION.duration} value={cur} step={1} onChange={e => setCur(+e.target.value)}
              style={{ flex: 1, accentColor: 'var(--gold)' }} aria-label="音频游标" />
            <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 38 }}>{fmtT(SESSION.duration)}</span>
          </div>
        </div>
      </Card>

      {/* ── 主体三栏：转写 ↔ 评分卡 ── */}
      <div className="grid" style={{ gridTemplateColumns: '1.35fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* 左：转写时间轴 */}
        <Card className="reveal reveal-2 card-pad-0" style={{ display: 'flex', flexDirection: 'column', maxHeight: 560 }}>
          <div className="spread" style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline)' }}>
            <span className="label">转写时间轴 · 逐句质检</span>
            <div className="row gap-3">
              <Legend c="var(--danger)" t="违规" /><Legend c="var(--success)" t="合规" /><Legend c="var(--warning)" t="风险" />
            </div>
          </div>
          <div ref={listRef} style={{ overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SEGS.map(s => {
              const ks = KIND_STYLE[s.kind];
              const active = curSeg?.id === s.id;
              const isAgent = s.speaker === 'agent';
              return (
                <div key={s.id} onClick={() => onSeg(s)}
                  style={{ display: 'flex', flexDirection: isAgent ? 'row' : 'row-reverse', gap: 9, cursor: 'pointer' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: isAgent ? 'linear-gradient(135deg,var(--bronze),var(--gold-bright))' : 'var(--surface-3)', color: isAgent ? 'var(--accent-ink)' : 'var(--text-2)', border: isAgent ? 'none' : '1px solid var(--hairline)' }}>
                    {isAgent ? '坐' : '客'}
                  </div>
                  <div style={{ maxWidth: '78%', borderRadius: 'var(--r-md)', borderLeft: isAgent ? `2px solid ${ks.bar}` : 'none', borderRight: !isAgent ? `2px solid ${ks.bar}` : 'none', background: ks.bg, padding: '9px 12px', boxShadow: active ? `0 0 0 2px ${ks.bar === 'transparent' ? 'var(--hairline-strong)' : ks.bar}` : 'none', transition: 'box-shadow .2s var(--ease)' }}>
                    <div className="row gap-2" style={{ marginBottom: 3, justifyContent: isAgent ? 'flex-start' : 'flex-end' }}>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{fmtT(s.start)}</span>
                      {ks.label && s.kind !== 'normal' && <span className="badge" style={{ background: `color-mix(in srgb, ${ks.bar} 15%, transparent)`, color: ks.bar }}>{s.tag ?? ks.label}</span>}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: s.kind === 'silence' ? 'var(--text-3)' : 'var(--text-1)', fontStyle: s.kind === 'silence' ? 'italic' : 'normal' }}>{s.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 右：评分卡 */}
        <Card className="reveal reveal-3 card-pad-0" style={{ display: 'flex', flexDirection: 'column', maxHeight: 560 }}>
          <div className="row gap-4" style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline)', alignItems: 'center' }}>
            <div style={{ width: 86, height: 86, flexShrink: 0 }}>
              <Chart height={86} build={() => ({
                series: [{
                  type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100, radius: '100%', center: ['50%', '52%'],
                  progress: { show: true, width: 7, itemStyle: { color: scoreTone } },
                  axisLine: { lineStyle: { width: 7, color: [[1, cssVar('--surface-3')]] } },
                  axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, pointer: { show: false }, anchor: { show: false },
                  detail: { offsetCenter: [0, 0], fontSize: 22, fontWeight: 700, color: cssVar('--text-1'), formatter: '{value}' },
                  data: [{ value: SESSION.score }],
                }],
              })} />
            </div>
            <div className="flex-1">
              <div className="label" style={{ marginBottom: 4 }}>质检总分</div>
              <div className="row gap-2 wrap">
                <span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 13%, transparent)', color: 'var(--danger)' }}><ShieldAlert size={11} /> {violCount} 项未达标</span>
                <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>扣 {totalDed} 分</span>
              </div>
              <div className="t-small text-3" style={{ marginTop: 6 }}>命中违规即定位转写原句，可申诉</div>
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: '12px 14px' }}>
            {GROUPS.map(g => (
              <div key={g} style={{ marginBottom: 12 }}>
                <div className="section-label" style={{ marginBottom: 8 }}>{g}</div>
                <div className="col gap-2">
                  {ITEMS.filter(i => i.group === g).map(it => {
                    const active = sel === it.id;
                    return (
                      <div key={it.id} onClick={() => { setSel(it.id); const sg = SEGS.find(s => s.id === it.segId); if (sg) setCur(sg.start); }}
                        style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', border: `1px solid ${active ? 'var(--hairline-strong)' : 'var(--hairline)'}`, background: active ? 'var(--surface-2)' : 'var(--surface-1)', cursor: 'pointer', transition: 'all .15s var(--ease)' }}>
                        <div className="spread">
                          <div className="row gap-2">
                            {it.hit
                              ? <ShieldCheck size={15} style={{ color: 'var(--success)' }} />
                              : <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />}
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{it.name}</span>
                            <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', fontSize: 10 }}>{it.engine === 'llm' ? 'LLM 语义' : '规则'}</span>
                          </div>
                          <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: it.hit ? 'var(--success)' : 'var(--danger)' }}>{it.hit ? `+${it.weight}` : `-${it.deduction}`}</span>
                        </div>
                        {!it.hit && active && it.evidence && (
                          <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb, var(--danger) 7%, var(--surface-2))', borderLeft: '2px solid var(--danger)' }}>
                            <div className="label" style={{ color: 'var(--danger)', marginBottom: 3 }}>证据原句</div>
                            <div className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>{it.evidence}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── 情感 / 静默曲线（游标同步）── */}
      <Card className="reveal reveal-4">
        <SectionTitle right={<span className="t-small text-3 mono">游标 {fmtT(cur)}</span>}>情感曲线 · 坐席 / 客户情绪强度</SectionTitle>
        <Chart height={180} deps={[cur]} build={() => {
          const danger = cssVar('--danger'); const gold = cssVar('--gold');
          return {
            ...baseOption(),
            tooltip: { trigger: 'axis', ...(baseOption().tooltip as object) },
            legend: { show: true, top: 0, right: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: cssVar('--text-3'), fontSize: 11 } },
            grid: { left: 6, right: 10, top: 28, bottom: 6, containLabel: true },
            xAxis: { type: 'category', boundaryGap: false, data: EMO.map(e => fmtT(e.sec)), ...axisStyle() },
            yAxis: { type: 'value', min: 0, max: 100, ...axisStyle(), axisLabel: { color: cssVar('--text-3'), fontSize: 11 } },
            series: [
              { name: '客户', type: 'line', smooth: true, symbol: 'none', data: EMO.map(e => e.cust), lineStyle: { width: 2, color: danger }, itemStyle: { color: danger }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: danger + '26' }, { offset: 1, color: danger + '00' }] } },
                markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: cssVar('--gold'), width: 1.5, type: 'solid' }, data: [{ xAxis: Math.min(EMO.length - 1, Math.round(cur / 10)) }] } },
              { name: '坐席', type: 'line', smooth: true, symbol: 'none', data: EMO.map(e => e.agent), lineStyle: { width: 2, color: gold }, itemStyle: { color: gold } },
            ],
          };
        }} />
      </Card>
    </div>
  );
}

function Legend({ c, t }: { c: string; t: string }) {
  return <span className="row gap-1" style={{ fontSize: 11, color: 'var(--text-3)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{t}</span>;
}
