import { useMemo, useState } from 'react';
import {
  Plus, ChevronUp, ChevronDown, Trash2, GripVertical, Save, History,
  ShieldCheck, Sparkles, Regex, Scale, AlertTriangle, CircleCheck,
  Library, ClipboardList, FlaskConical,
} from 'lucide-react';
import { PageHeader, Card, Segmented, SectionTitle, Badge, EmptyState } from '../components/ui';
import { Field, MeterBar, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar } from '../lib/chartTheme';
import type { ScoreEngine, ScoreGroup, ScoreRule } from '../types';

// ════════════════════════════════════════════════════════════════════════
// 5.3 质检评分卡配置器 —— 主管拖拽组合质检项，无需写代码出一张评分卡。
// 左：规则库（分组）→ 中：画布（排序 + 权重滑杆 + 引擎二选一 + LLM prompt）
// 右：实时预览（三组权重合计校验 = 100%，扣分逻辑预览）
// 锚点：示例消费金融 · 信用贷 · 真实消金质检规则（年化利率告知/冷静期/催收红线/禁语…）
// ════════════════════════════════════════════════════════════════════════

// ── 画布项：在 ScoreRule 基础上加可配置态 ──────────────────────────────────
interface CanvasItem extends ScoreRule {
  uid: string;          // 画布内唯一键（同一规则可被加一次）
  enabled: boolean;     // 是否启用（禁用不计入权重）
}

// ── 规则库（≥10 真实消金质检规则，按 合规/服务/主观 三组）─────────────────
const RULE_LIBRARY: ScoreRule[] = [
  // ── 合规必读 ──
  { id: 'r-apr', name: '年化利率告知', group: '合规项', engine: 'llm', weight: 14,
    desc: '是否在借款前完整、清晰告知综合年化利率（APR），禁以"日息/月费率"模糊替代。',
    prompt: '坐席是否在客户确认借款前，主动、完整告知综合年化利率（APR）及其口径？是否存在用日利率/月费率模糊年化的情形？' },
  { id: 'r-cooling', name: '冷静期告知', group: '合规项', engine: 'rule', weight: 8,
    desc: '关键词模板：命中"冷静期/无理由解除/X 日内"等表述视为已告知冷静期权益。' },
  { id: 'r-overdue', name: '逾期后果告知', group: '合规项', engine: 'llm', weight: 12,
    desc: '是否说明逾期将产生罚息、影响征信、纳入失信等后果，且表述不夸大、不恐吓。',
    prompt: '坐席是否如实告知逾期将产生的罚息、征信影响等后果？告知是否客观、未使用恐吓性措辞？' },
  { id: 'r-privacy', name: '个人信息授权', group: '合规项', engine: 'rule', weight: 7,
    desc: '正则模板：匹配"授权查询征信|个人信息.{0,6}收集|同意.{0,4}隐私政策"确认授权已获取。' },
  // ── 禁语 / 红线 ──
  { id: 'r-abuse', name: '辱骂威胁禁语', group: '合规项', engine: 'rule', weight: 10,
    desc: '禁语词库命中即触发：辱骂、人身威胁、"再不还就…"类胁迫措辞（催收红线）。' },
  { id: 'r-thirdparty', name: '联系第三方红线', group: '合规项', engine: 'llm', weight: 9,
    desc: '是否出现以联系单位/同事/家属施压催收的违规话术（爆通讯录红线）。',
    prompt: '坐席是否出现以联系客户单位、同事、亲友等第三方进行施压或催收的表述？' },
  // ── 承诺类 ──
  { id: 'r-promise', name: '越权承诺筛查', group: '合规项', engine: 'llm', weight: 8,
    desc: '是否做出"保证下款/利息全免/包过审"等超出权限的违规承诺。',
    prompt: '坐席是否做出"保证一定下款""利息全免""百分百通过"等超出其权限的承诺？' },
  // ── 服务规范 ──
  { id: 'r-opening', name: '标准开场白', group: '服务项', engine: 'rule', weight: 5,
    desc: '关键词模板：含公司名 + 工号自报 + "请问有什么可以帮您"视为开场白合规。' },
  { id: 'r-verify', name: '身份核验', group: '服务项', engine: 'rule', weight: 6,
    desc: '业务办理前是否完成身份核验（姓名 + 证件后四位 / 短信验证码二选一）。' },
  { id: 'r-fee', name: '费率与还款方式告知', group: '服务项', engine: 'llm', weight: 5,
    desc: '是否说明等额本息/先息后本等还款方式及对应费用，避免误导。',
    prompt: '坐席是否清晰说明还款方式（等额本息/先息后本等）及对应费用结构，无误导性表述？' },
  { id: 'r-closing', name: '规范结束语', group: '服务项', engine: 'rule', weight: 3,
    desc: '关键词模板：含致谢 + 服务热线/服务时间 + 礼貌道别视为结束语合规。' },
  // ── 主观体验 ──
  { id: 'r-emotion', name: '情绪安抚得当', group: '主观项', engine: 'llm', weight: 5,
    desc: '客户情绪激化时坐席是否及时共情、安抚，未对抗、未挂断。',
    prompt: '当客户情绪升高时，坐席是否表现出恰当的共情与安抚，未与客户对抗或单方挂断？' },
  { id: 'r-silence', name: '静默与抢话控制', group: '主观项', engine: 'rule', weight: 3,
    desc: '检测单次静默 > 8s 或坐席抢话（overlap）次数，超阈值扣分。' },
];

// 初始画布（现行 v3.2 现行评分卡：合规为主，权重合计 = 100）
const INITIAL_CANVAS_IDS = [
  'r-apr', 'r-overdue', 'r-abuse', 'r-thirdparty', 'r-promise',
  'r-opening', 'r-verify', 'r-fee', 'r-emotion', 'r-silence',
];

const VERSIONS = [
  { value: 'v3.2', label: 'v3.2 · 现行（2026-06-01 生效）' },
  { value: 'v3.1', label: 'v3.1 · 历史（2026-03-15）' },
  { value: 'v3.0', label: 'v3.0 · 历史（2025-12-20）' },
  { value: 'draft', label: '未命名草稿' },
];

const GROUP_ORDER: ScoreGroup[] = ['合规项', '服务项', '主观项'];
const GROUP_TOKEN: Record<ScoreGroup, string> = { 合规项: '--danger', 服务项: '--gold', 主观项: '--warning' };
const GROUP_HINT: Record<ScoreGroup, string> = {
  合规项: '监管红线 · 漏检直接挂钩消保评级',
  服务项: '服务规范 · 影响坐席服务分',
  主观项: '体验主观项 · 共情 / 节奏',
};

// 引擎徽标
function EngineTag({ engine }: { engine: ScoreEngine }) {
  const isLlm = engine === 'llm';
  const c = isLlm ? 'var(--gold)' : 'var(--text-2)';
  const Icon = isLlm ? Sparkles : Regex;
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${c} 13%, transparent)`, color: c }}>
      <Icon size={11} />{isLlm ? 'LLM 语义项' : '规则模板'}
    </span>
  );
}

export default function Scorecard() {
  const [version, setVersion] = useState('v3.2');
  const [canvas, setCanvas] = useState<CanvasItem[]>(() =>
    INITIAL_CANVAS_IDS.map((id, i) => {
      const r = RULE_LIBRARY.find(x => x.id === id)!;
      return { ...r, uid: `${id}-${i}`, enabled: true };
    }),
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const onCanvasIds = new Set(canvas.map(c => c.id));

  // ── 权重统计（仅启用项计入）─────────────────────────────────────────────
  const activeItems = canvas.filter(c => c.enabled);
  const totalWeight = activeItems.reduce((s, c) => s + c.weight, 0);
  const groupWeights = useMemo(() => {
    const m: Record<ScoreGroup, number> = { 合规项: 0, 服务项: 0, 主观项: 0 };
    activeItems.forEach(c => { m[c.group] += c.weight; });
    return m;
  }, [activeItems]);

  const weightOk = totalWeight === 100;
  const diff = totalWeight - 100;

  // ── 画布操作 ─────────────────────────────────────────────────────────────
  const markDirty = () => setDirty(true);

  const addRule = (rule: ScoreRule) => {
    if (onCanvasIds.has(rule.id)) { toast(`「${rule.name}」已在评分卡中`, 'warn'); return; }
    setCanvas(prev => [...prev, { ...rule, uid: `${rule.id}-${Date.now()}`, enabled: true }]);
    toast(`已添加「${rule.name}」`, 'success');
    markDirty();
  };

  const removeItem = (uid: string) => {
    setCanvas(prev => prev.filter(c => c.uid !== uid));
    setExpanded(e => (e === uid ? null : e));
    markDirty();
  };

  const move = (uid: string, dir: -1 | 1) => {
    setCanvas(prev => {
      const i = prev.findIndex(c => c.uid === uid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    markDirty();
  };

  const setWeight = (uid: string, weight: number) => {
    setCanvas(prev => prev.map(c => (c.uid === uid ? { ...c, weight } : c)));
    markDirty();
  };

  const setEngine = (uid: string, engine: ScoreEngine) => {
    setCanvas(prev => prev.map(c => (c.uid === uid ? { ...c, engine } : c)));
    markDirty();
  };

  const setPrompt = (uid: string, prompt: string) => {
    setCanvas(prev => prev.map(c => (c.uid === uid ? { ...c, prompt } : c)));
    markDirty();
  };

  const toggleEnabled = (uid: string) => {
    setCanvas(prev => prev.map(c => (c.uid === uid ? { ...c, enabled: !c.enabled } : c)));
    markDirty();
  };

  const normalize = () => {
    if (!activeItems.length) return;
    // 等比缩放到合计 100，四舍五入后把余数补到最大权重项
    const factor = 100 / totalWeight;
    let acc = 0;
    const scaled = canvas.map(c => {
      if (!c.enabled) return { ...c };
      const w = Math.max(1, Math.round(c.weight * factor));
      acc += w;
      return { ...c, weight: w };
    });
    const rem = 100 - acc;
    if (rem !== 0) {
      let idx = -1, best = -1;
      scaled.forEach((c, i) => { if (c.enabled && c.weight > best) { best = c.weight; idx = i; } });
      if (idx >= 0) scaled[idx] = { ...scaled[idx], weight: Math.max(1, scaled[idx].weight + rem) };
    }
    setCanvas(scaled);
    markDirty();
    toast('已按比例归一至 100%', 'success');
  };

  const saveDraft = () => {
    toast(weightOk ? `评分卡草稿已保存（${version} · 合计 100%）` : '草稿已保存（权重未达 100%，发布前需校准）', weightOk ? 'success' : 'warn');
    setDirty(false);
  };

  // ── 图表③：评分项权重构成堆叠条（合规/服务/主观三段占比）─────────────────
  const stackOpt = useMemo(() => () => {
    const groups = GROUP_ORDER;
    return {
      ...baseOption(),
      grid: { left: 4, right: 12, top: 8, bottom: 4, containLabel: true },
      tooltip: {
        ...(baseOption().tooltip as object),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: number) => `${v} 分`,
      },
      legend: {
        show: true, bottom: 0, itemWidth: 9, itemHeight: 9, icon: 'roundRect',
        textStyle: { color: cssVar('--text-2'), fontSize: 11 },
        data: groups,
      },
      xAxis: { type: 'value', max: 100, ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: '{value}%' } },
      yAxis: { type: 'category', data: ['权重构成'], ...axisStyle(), splitLine: { show: false } },
      series: groups.map(g => ({
        name: g,
        type: 'bar',
        stack: 'w',
        barWidth: 30,
        emphasis: { focus: 'series' },
        itemStyle: { color: cssVar(GROUP_TOKEN[g]), borderRadius: 2 },
        label: {
          show: groupWeights[g] > 0,
          position: 'inside',
          formatter: groupWeights[g] >= 8 ? `${g.slice(0, 2)} ${groupWeights[g]}` : '',
          color: '#fff', fontSize: 11, fontWeight: 600,
        },
        data: [groupWeights[g]],
        animationDuration: 700,
      })),
    };
  }, [groupWeights]);

  // 规则库按组分桶
  const libByGroup = useMemo(() => {
    const m: Record<ScoreGroup, ScoreRule[]> = { 合规项: [], 服务项: [], 主观项: [] };
    RULE_LIBRARY.forEach(r => m[r.group].push(r));
    return m;
  }, []);

  return (
    <div className="page">
      {/* 局部样式：range 滑杆 + 三栏布局（窄屏由 .grid 媒体查询降单列）*/}
      <style>{`
        .sc-grid { grid-template-columns: 264px minmax(0,1fr) 320px; gap: 16px; align-items: start; }
        @media (max-width: 1180px) { .sc-grid { grid-template-columns: 240px minmax(0,1fr); } .sc-preview { display: none; } }
        .sc-col { display: flex; flex-direction: column; gap: 12px; }
        .sc-rng { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px;
          background: var(--surface-3); outline: none; cursor: pointer; }
        .sc-rng::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%;
          background: var(--gold); border: 2px solid var(--surface-1); box-shadow: 0 1px 4px var(--gold-glow); cursor: grab; }
        .sc-rng::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.08); }
        .sc-rng::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--gold); border: 2px solid var(--surface-1); cursor: grab; }
        .sc-lib-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 11px;
          border: 1px solid var(--hairline); border-radius: var(--r-sm); background: var(--surface-1);
          transition: border-color var(--dur-micro) var(--ease), background var(--dur-micro) var(--ease); }
        .sc-lib-row:hover { border-color: var(--hairline-strong); background: var(--surface-2); }
        .sc-lib-row.on { opacity: .5; }
        .sc-add { flex-shrink: 0; }
        .sc-item { border: 1px solid var(--hairline); border-radius: var(--r-md); background: var(--surface-1); overflow: hidden;
          transition: border-color var(--dur-micro) var(--ease), box-shadow var(--dur-micro) var(--ease); }
        .sc-item:hover { border-color: var(--hairline-strong); box-shadow: var(--elev-1); }
        .sc-item.off { opacity: .55; }
        .sc-ord { display: flex; flex-direction: column; gap: 1px; }
        .sc-ordbtn { width: 22px; height: 17px; display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid var(--hairline); border-radius: 4px; background: var(--surface-2); color: var(--text-3); cursor: pointer; padding: 0; }
        .sc-ordbtn:hover:not(:disabled) { color: var(--gold); border-color: var(--hairline-strong); }
        .sc-ordbtn:disabled { opacity: .35; cursor: not-allowed; }
        .sc-ta { width: 100%; min-height: 62px; resize: vertical; background: var(--surface-2); border: 1px solid var(--hairline);
          border-radius: var(--r-sm); color: var(--text-1); font-size: 12.5px; line-height: 1.55; font-family: inherit; padding: 8px 10px; outline: none; }
        .sc-ta:focus { border-color: var(--gold); background: var(--surface-1); box-shadow: 0 0 0 3px var(--gold-glow); }
        .sc-prevrow { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--hairline); }
        .sc-prevrow:last-child { border-bottom: none; }
        .sc-num { width: 17px; height: 17px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; background: var(--surface-3); color: var(--text-3); flex-shrink: 0; }
      `}</style>

      <PageHeader
        title="质检评分卡配置器"
        subtitle="拖拽组合质检项，无需写代码即可定义一张评分卡 · 规则模板 ‖ LLM 语义项双引擎"
        actions={
          <>
            <div className="input-wrap" style={{ width: 230 }}>
              <History size={14} className="input-icon" />
              <select
                className="input"
                style={{ paddingLeft: 34 }}
                value={version}
                onChange={e => { setVersion(e.target.value); }}
              >
                {VERSIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <button className="btn btn-subtle" onClick={normalize} disabled={!activeItems.length || weightOk}>
              <Scale size={14} />一键归一 100%
            </button>
            <button className="btn btn-primary" onClick={saveDraft}>
              <Save size={14} />保存草稿{dirty && <span style={{ marginLeft: 2 }}>·</span>}
            </button>
          </>
        }
      />

      <div className="grid sc-grid">
        {/* ───────────── 左：规则库 ───────────── */}
        <div className="sc-col">
          <Card style={{ padding: 14 }}>
            <SectionTitle right={<span className="tag tnum">{RULE_LIBRARY.length} 项</span>}>
              <span className="row gap-1"><Library size={13} />规则库</span>
            </SectionTitle>
            <p className="t-small text-3" style={{ marginTop: -6, marginBottom: 12 }}>
              消金质检规则集 · 点「添加」拖入右侧画布
            </p>
            <div className="col gap-4">
              {GROUP_ORDER.map(g => (
                <div key={g} className="col gap-2">
                  <div className="row gap-1" style={{ marginBottom: 2 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: cssVar(GROUP_TOKEN[g]) }} />
                    <span className="label" style={{ letterSpacing: '0.08em' }}>{g}</span>
                    <span className="t-small text-3 tnum">· {libByGroup[g].length}</span>
                  </div>
                  {libByGroup[g].map(r => {
                    const added = onCanvasIds.has(r.id);
                    return (
                      <div key={r.id} className={`sc-lib-row ${added ? 'on' : ''}`}>
                        <div className="flex-1" style={{ minWidth: 0 }}>
                          <div className="row gap-1" style={{ marginBottom: 3 }}>
                            <span className="t-small" style={{ fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                          </div>
                          <EngineTag engine={r.engine} />
                        </div>
                        <button
                          className="btn btn-ghost btn-sm sc-add"
                          onClick={() => addRule(r)}
                          disabled={added}
                          title={added ? '已在评分卡中' : '添加到画布'}
                        >
                          {added ? <CircleCheck size={13} /> : <Plus size={13} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ───────────── 中：评分卡画布 ───────────── */}
        <div className="sc-col">
          <Card style={{ padding: 16 }}>
            <SectionTitle
              right={
                <span className="row gap-2">
                  <span className="tag tnum">{canvas.length} 项 · 启用 {activeItems.length}</span>
                  <Badge color={weightOk ? 'var(--success)' : 'var(--danger)'}>
                    <span className="mono tnum">合计 {totalWeight}%</span>
                  </Badge>
                </span>
              }
            >
              <span className="row gap-1"><ClipboardList size={13} />评分卡画布 · {version}</span>
            </SectionTitle>

            {canvas.length === 0 ? (
              <EmptyState icon={<ClipboardList size={40} />} title="画布为空" desc="从左侧规则库点「添加」，组合出一张评分卡" />
            ) : (
              <div className="col gap-3" style={{ marginTop: 4 }}>
                {canvas.map((it, i) => {
                  const isOpen = expanded === it.uid;
                  const isLlm = it.engine === 'llm';
                  return (
                    <div key={it.uid} className={`sc-item reveal ${it.enabled ? '' : 'off'}`}>
                      <div className="row" style={{ gap: 10, padding: '11px 13px' }}>
                        {/* 排序 */}
                        <div className="row gap-1" style={{ flexShrink: 0 }}>
                          <GripVertical size={14} style={{ color: 'var(--text-3)' }} />
                          <div className="sc-ord">
                            <button className="sc-ordbtn" onClick={() => move(it.uid, -1)} disabled={i === 0} title="上移"><ChevronUp size={12} /></button>
                            <button className="sc-ordbtn" onClick={() => move(it.uid, 1)} disabled={i === canvas.length - 1} title="下移"><ChevronDown size={12} /></button>
                          </div>
                          <span className="sc-num mono">{i + 1}</span>
                        </div>

                        {/* 主体 */}
                        <div className="flex-1" style={{ minWidth: 0 }}>
                          <div className="row gap-2 wrap" style={{ marginBottom: 7 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cssVar(GROUP_TOKEN[it.group]), flexShrink: 0 }} />
                            <span className="t-small" style={{ fontWeight: 600, color: 'var(--text-1)' }}>{it.name}</span>
                            <span className="tag" style={{ fontSize: 10.5 }}>{it.group}</span>
                          </div>

                          <div className="row gap-3 wrap">
                            {/* 权重滑杆 */}
                            <div className="row gap-2" style={{ flex: 1, minWidth: 188 }}>
                              <span className="t-small text-3" style={{ flexShrink: 0 }}>权重</span>
                              <input
                                type="range" className="sc-rng" min={1} max={40} step={1}
                                value={it.weight}
                                disabled={!it.enabled}
                                onChange={e => setWeight(it.uid, Number(e.target.value))}
                              />
                              <span className="mono tnum" style={{ minWidth: 34, textAlign: 'right', fontWeight: 700, color: it.enabled ? 'var(--text-1)' : 'var(--text-3)' }}>{it.weight}%</span>
                            </div>
                            {/* 引擎二选一 */}
                            <Segmented<ScoreEngine>
                              value={it.engine}
                              onChange={(v: ScoreEngine) => setEngine(it.uid, v)}
                              options={[{ value: 'rule', label: '规则模板' }, { value: 'llm', label: 'LLM 语义项' }]}
                            />
                          </div>
                        </div>

                        {/* 右侧操作 */}
                        <div className="row gap-1" style={{ flexShrink: 0 }}>
                          {isLlm && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setExpanded(isOpen ? null : it.uid)}
                              title="编辑 LLM 评分 prompt"
                            >
                              <FlaskConical size={13} />{isOpen ? '收起' : 'Prompt'}
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggleEnabled(it.uid)}
                            title={it.enabled ? '停用（不计入权重）' : '启用'}
                            style={{ color: it.enabled ? 'var(--text-2)' : 'var(--text-3)' }}
                          >
                            {it.enabled ? '启用' : '停用'}
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeItem(it.uid)} title="移除" style={{ color: 'var(--danger)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* LLM Prompt 展开区 */}
                      {isLlm && isOpen && (
                        <div className="fade-in" style={{ padding: '0 13px 13px', borderTop: '1px solid var(--hairline)', marginTop: 2 }}>
                          <div style={{ paddingTop: 11 }}>
                            <Field label="语义评分 Prompt" hint="本地 LLM 子 agent 据此判定该项是否命中并给出扣分依据">
                              <textarea
                                className="sc-ta"
                                value={it.prompt ?? ''}
                                placeholder="例：坐席是否完整告知年化利率与逾期后果？"
                                onChange={e => setPrompt(it.uid, e.target.value)}
                              />
                            </Field>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ───────────── 右：实时预览 ───────────── */}
        <div className="sc-col sc-preview">
          {/* 权重校验 */}
          <Card style={{ padding: 16 }}>
            <SectionTitle><span className="row gap-1"><Scale size={13} />权重校验</span></SectionTitle>
            <div className="col" style={{ alignItems: 'center', padding: '6px 0 12px' }}>
              <div className="mono tnum" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, color: weightOk ? 'var(--success)' : 'var(--danger)', letterSpacing: '-0.02em' }}>
                {totalWeight}%
              </div>
              <div className="t-small" style={{ marginTop: 8, color: weightOk ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {weightOk ? <CircleCheck size={13} /> : <AlertTriangle size={13} />}
                {weightOk ? '三组权重合计达标，可发布' : diff > 0 ? `超出 ${diff}%，需下调` : `不足 ${-diff}%，需补足`}
              </div>
            </div>

            <div className="col gap-3">
              {GROUP_ORDER.map(g => (
                <div key={g} className="col gap-1">
                  <div className="spread">
                    <span className="t-small" style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cssVar(GROUP_TOKEN[g]) }} />{g}
                    </span>
                    <span className="mono tnum t-small" style={{ fontWeight: 700, color: 'var(--text-1)' }}>{groupWeights[g]}%</span>
                  </div>
                  <MeterBar pct={groupWeights[g]} color={cssVar(GROUP_TOKEN[g])} />
                  <span className="t-small text-3" style={{ fontSize: 11 }}>{GROUP_HINT[g]}</span>
                </div>
              ))}
            </div>

            <div className="divider" />
            <SectionTitle>权重构成</SectionTitle>
            <Chart build={stackOpt} height={92} deps={[groupWeights]} />
          </Card>

          {/* 扣分逻辑预览 */}
          <Card style={{ padding: 16 }}>
            <SectionTitle right={<span className="tag tnum">满分 100</span>}>扣分逻辑预览</SectionTitle>
            {activeItems.length === 0 ? (
              <p className="t-small text-3">画布暂无启用项</p>
            ) : (
              <>
                <p className="t-small text-3" style={{ marginTop: -6, marginBottom: 8 }}>
                  命中即按权重满扣 · LLM 项由语义判定，规则项由关键词/正则命中
                </p>
                <div className="col">
                  {[...activeItems]
                    .sort((a, b) => b.weight - a.weight)
                    .map((it, i) => (
                      <div key={it.uid} className="sc-prevrow">
                        <div className="row gap-2" style={{ minWidth: 0 }}>
                          <span className="sc-num mono">{i + 1}</span>
                          <span className="t-small" style={{ color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</span>
                          {it.engine === 'llm'
                            ? <Sparkles size={11} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                            : <Regex size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
                        </div>
                        <span className="mono tnum t-small" style={{ color: 'var(--danger)', fontWeight: 700, flexShrink: 0 }}>−{it.weight}</span>
                      </div>
                    ))}
                </div>
                <div className="divider" />
                <div className="spread">
                  <span className="t-small" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-2)' }}>
                    <ShieldCheck size={13} style={{ color: 'var(--success)' }} />合规项占比
                  </span>
                  <span className="mono tnum t-small" style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                    {totalWeight > 0 ? Math.round((groupWeights['合规项'] / totalWeight) * 100) : 0}%
                  </span>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
