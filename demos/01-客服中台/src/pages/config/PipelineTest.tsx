import { useState, useMemo } from 'react';
import {
  Bot, FileText, FileDown, FolderOpen, Trash2, Plus, Play, Eye,
  Sparkles, Gauge, Clock3, Target, ShieldCheck, ScrollText, Flame,
  Layers, Vote, Scale, CircleCheck, BrainCog, ArrowRight,
} from 'lucide-react';
import { PageHeader, Segmented, SectionTitle } from '../../components/ui';
import { DataTable, type Col } from '../../components/DataTable';
import { Toolbar, Modal, MeterBar, toast } from '../../components/kit';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar } from '../../lib/chartTheme';
import { INTENT_L1 } from '../../lib/mockData';
import type { TestRun, TestCase } from '../../types';

// ════════════════════════════════════════════════════════════════════════
// Pipeline 测试 · 业务用例批量跑全链路 + 三层自动打标分流 + 审核流程
// ════════════════════════════════════════════════════════════════════════

type TabKey = 'prepare' | 'results' | 'flow';
type StrictMode = TestRun['mode'];

// ─── 准备用例 · 真实消金问法（示例消费金融 / 信用贷场景）───────────────────────────
const SEED_CASES: TestCase[] = [
  { id: 'c01', dimension: '还款相关', question: '我这个月手头紧，能不能延期几天还款，会上征信吗' },
  { id: 'c02', dimension: '还款相关', question: '提前结清的话之前多收的利息能退回来吗' },
  { id: 'c03', dimension: '费用相关', question: '我看账单里有个服务费，这个是什么费用，可以减免吗' },
  { id: 'c04', dimension: '费用相关', question: '会员怎么退费，钱多久到账' },
  { id: 'c05', dimension: '申请咨询', question: '我征信有过逾期记录，现在还能申请到额度吗' },
  { id: 'c06', dimension: '产品与信息', question: '信用贷的年化利率到底是多少，是不是套路贷' },
  { id: 'c07', dimension: '催收相关', question: '你们天天给我打电话还打给我家里人，我要投诉到银保监会' },
  { id: 'c08', dimension: '催收相关', question: '已经逾期三个月了，再不还会不会被起诉坐牢' },
  { id: 'c09', dimension: '业务办理', question: '怎么修改每个月的自动还款日期' },
  { id: 'c10', dimension: '信息维护', question: '换了新手机号，绑定的银行卡和预留号码怎么一起改' },
  { id: 'c11', dimension: '营销活动', question: '之前短信说有提额活动，我点进去怎么没有了' },
  { id: 'c12', dimension: '产品与信息', question: '客服几点上班，周末有没有人工' },
  { id: 'c13', dimension: '还款相关', question: '还款失败了显示扣款异常，是不是你们系统问题' },
  { id: 'c14', dimension: '催收相关', question: '我现在没钱真的还不上，能不能协商个性化分期' },
];

const DIMENSIONS = ['全部', ...INTENT_L1] as const;
const GEN_SIZES = [50, 100, 200, 500] as const;

// ─── 测试结果 · 历史运行（对齐真实回归记录）─────────────────────────────────
const RUNS: TestRun[] = [
  { id: 'e2e_v2',          note: 'e2e_v2 · 全链路回归（提示词 v3.2 上线后）', cases: 5,   rounds: 3, manualAcc: 100,  autoAcc: 100,  complianceFlips: 0, markProgress: 100, mode: '严格',  time: '2026-06-16 22:14', p90: 2269 },
  { id: 'accuracy_test',   note: 'accuracy_test · 还款+催收高频问法准确率',   cases: 3,   rounds: 1, manualAcc: 66.7, autoAcc: 66.7, complianceFlips: 1, markProgress: 100, mode: '准确率', time: '2026-06-15 18:40', p90: 1880 },
  { id: 'quick',           note: 'quick · 改完费用类 QA 冒烟一条',           cases: 1,   rounds: 1, manualAcc: 100,  autoAcc: 100,  complianceFlips: 0, markProgress: 100, mode: '冒烟',  time: '2026-06-15 11:02', p90: 1542 },
  { id: 'sample_120',      note: 'sample_120 · 真实日志采样 120 条大盘',     cases: 120, rounds: 1, manualAcc: 89.2, autoAcc: 87.5, complianceFlips: 3, markProgress: 64,  mode: '准确率', time: '2026-06-14 20:31', p90: 2410 },
  { id: 'collection_50',   note: 'collection_50 · 催收红线专项压测',         cases: 50,  rounds: 3, manualAcc: 94.0, autoAcc: 92.0, complianceFlips: 4, markProgress: 100, mode: '严格',  time: '2026-06-13 16:18', p90: 2655 },
  { id: 'llm_rewrite_200', note: 'llm_rewrite_200 · LLM 改写 60% 鲁棒性',    cases: 200, rounds: 1, manualAcc: 85.5, autoAcc: 83.0, complianceFlips: 6, markProgress: 41,  mode: '准确率', time: '2026-06-12 09:55', p90: 2188 },
];

// 三层自动打标分流（规则秒判 / 多模型一致 / 跨厂商裁判）
interface TriageLayer { key: string; name: string; desc: string; icon: typeof Layers; color: string; count: number; acc: number; }
const TRIAGE: TriageLayer[] = [
  { key: 'rule',  name: '规则引擎秒级判定', desc: '关键词 / 必答字段 / 合规红线命中，毫秒级出结论，0 token 成本', icon: Layers, color: '--emerald', count: 78, acc: 99.4 },
  { key: 'multi', name: '多模型一致采信',   desc: '本地 Qwen + GLM 双模型独立打分，结论一致即采信，存疑上抛',     icon: Vote,   color: '--gold',    count: 31, acc: 96.1 },
  { key: 'cross', name: '跨厂商裁判决胜',   desc: 'DeepSeek 作为第三方裁判介入分歧样本，跨厂商背靠背仲裁',         icon: Scale,  color: '--info',    count: 11, acc: 93.7 },
];
const TRIAGE_TOTAL = TRIAGE.reduce((s, t) => s + t.count, 0);   // 120

// 详情 KPI（节省人力 / 节省时间 / 打标准确率）
const SAVE_KPI = [
  { label: '节省人力',   value: '91%',    sub: '120 条仅 11 条需人工复核',        icon: Sparkles, color: '--emerald' },
  { label: '节省时间',   value: '38min',  sub: '自动打标 2.1min vs 人工 40min',   icon: Clock3,   color: '--gold' },
  { label: '打标准确率', value: '97.5%',  sub: '自动判 vs 人工金标一致率',         icon: Target,   color: '--info' },
];

// 4 核心卡
interface CoreCard { label: string; value: string; sub: string; icon: typeof Gauge; tone: string; }
const CORE_CARDS: CoreCard[] = [
  { label: '人工标记进度',    value: '64%',   sub: '77 / 120 条已人工确认',   icon: ScrollText,  tone: '--gold' },
  { label: '人工验证准确率',  value: '89.2%', sub: '人工金标口径下整体表现',   icon: ShieldCheck, tone: '--emerald' },
  { label: '系统自动判准确率', value: '87.5%', sub: '三层分流自动判结论',       icon: Gauge,       tone: '--info' },
  { label: '合规翻转数',      value: '3',     sub: '由「通过」翻转为「拦截」',   icon: Flame,       tone: '--danger' },
];

// 🔥 需优先修复 TOP5
interface FixItem { rank: number; query: string; reason: string; type: string; freq: number; color: string; }
const TOP_FIX: FixItem[] = [
  { rank: 1, query: '逾期了再不还会不会被起诉坐牢', reason: '答非所问 · 未引用真实催收话术，自由发挥触发合规翻转', type: 'C 答非所问', freq: 9, color: '--danger' },
  { rank: 2, query: '这个服务费可以减免吗',         reason: '必答缺失 · 费用减免口径库内无标准答案，模型幻觉编造', type: 'B 必答缺失', freq: 7, color: '--warning' },
  { rank: 3, query: '我要投诉到银保监会',           reason: '合规违反 · 应触发金融监管转人工，却给出安抚式回复',   type: 'A 合规违反', freq: 6, color: '--danger' },
  { rank: 4, query: '年化利率是不是套路贷',         reason: '语气格式 · 回复机械且未正面披露年化区间，体验差',     type: 'E 语气格式', freq: 5, color: '--info' },
  { rank: 5, query: '协商个性化分期怎么弄',         reason: '知识缺失 · 个性化分期流程未入库，命中拒识阈值',       type: 'D 知识缺失', freq: 4, color: '--gold' },
];

// ─── 审核流程 · 5 阶段（Apple 风分步）────────────────────────────────────────
interface FlowStep { no: string; title: string; sub: string; icon: typeof Bot; color: string; points: string[]; }
const FLOW_STEPS: FlowStep[] = [
  {
    no: '①', title: '客服机器人回答', sub: '4 步全链路生成', icon: Bot, color: '--gold',
    points: ['A1 敏感词扫描 · 51 主词 + 211 变体过滤', 'A2 意图识别 → 10 一级意图三级树定位', 'A3 RAG 检索 · QA 12,954 条统一向量召回 Top-K', 'A4 LLM 生成 / 高置信直出 → 小云口吻回复'],
  },
  {
    no: '②', title: '自动评分', sub: '3 AI 判官投票 + 跨厂商决胜', icon: Vote, color: '--info',
    points: ['判官 A 本地 Qwen2.5 · 准确性维度打分', '判官 B 本地 GLM-4 · 合规性维度打分', '判官 C 通义千问 · 语气格式维度打分', 'DeepSeek 跨厂商裁判 · 三票分歧时背靠背决胜'],
  },
  {
    no: '③', title: '业务规则引擎', sub: '硬规则一票否决', icon: Scale, color: '--emerald',
    points: ['必答字段缺失检测（利率 / 还款入口 / 退费口径）', '催收红线词 / 越权承诺 / 虚假宣传硬拦截', '命中规则即覆盖 AI 评分，判定「不通过」'],
  },
  {
    no: '④', title: '失败原因分析', sub: 'A–F 六类归因', icon: Layers, color: '--warning',
    points: ['A 合规违反 · B 必答缺失 · C 答非所问', 'D 知识缺失 · E 语气格式 · F 内域拒识', '逐条打标归因，沉淀为 badcase 与修复工单'],
  },
  {
    no: '⑤', title: '知识补全器', sub: '闭环反哺知识库', icon: BrainCog, color: '--gold',
    points: ['fix_existing 修订既有 QA 标准答案', 'append_variants 追加问法变体提升召回', 'create_new 生成新 QA 草稿 → 待发布审核'],
  },
];

// ─── 页面 ─────────────────────────────────────────────────────────────────────
export default function PipelineTest() {
  const [tab, setTab] = useState<TabKey>('prepare');

  // 准备用例
  const [cases, setCases] = useState<TestCase[]>(SEED_CASES);
  const [dimFilter, setDimFilter] = useState<typeof DIMENSIONS[number]>('全部');
  const [genOpen, setGenOpen] = useState(false);
  const [genSize, setGenSize] = useState<number>(100);
  const [rewritePct, setRewritePct] = useState(40);
  const [genBusy, setGenBusy] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [note, setNote] = useState('');
  const [strict, setStrict] = useState<StrictMode>('准确率');
  const [rounds, setRounds] = useState<1 | 3>(1);
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);

  // 测试结果
  const [detail, setDetail] = useState<TestRun | null>(null);
  const [runs, setRuns] = useState<TestRun[]>(RUNS);

  const filteredCases = useMemo(
    () => (dimFilter === '全部' ? cases : cases.filter(c => c.dimension === dimFilter)),
    [cases, dimFilter],
  );

  const eta = useMemo(() => {
    const sec = Math.round((cases.length * rounds * 2.1) + 4);
    return sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`;
  }, [cases.length, rounds]);

  // 模拟进度条推进
  function tickProgress(set: (n: number) => void, done: () => void) {
    let p = 0;
    const timer = setInterval(() => {
      p += Math.random() * 18 + 7;
      if (p >= 100) { set(100); clearInterval(timer); setTimeout(done, 360); }
      else set(Math.round(p));
    }, 240);
  }

  function startGenerate() {
    setGenBusy(true);
    setGenProgress(0);
    tickProgress(setGenProgress, () => {
      const extra: TestCase[] = Array.from({ length: Math.min(8, Math.round(genSize / 12)) }, (_, i) => {
        const dim = INTENT_L1[(i + cases.length) % INTENT_L1.length];
        return { id: `g${Date.now()}_${i}`, dimension: dim, question: `[AI生成·${dim}] 真实日志改写问法样本 ${i + 1}` };
      });
      setCases(prev => [...prev, ...extra]);
      setGenBusy(false);
      setGenOpen(false);
      toast(`已生成 ${genSize} 条用例（LLM 改写 ${rewritePct}%），预览补充 ${extra.length} 条`, 'success');
    });
  }

  function appendRow() {
    setCases(prev => [...prev, { id: `m${Date.now()}`, dimension: '自定义', question: '' }]);
  }

  function startRun() {
    if (cases.length === 0) { toast('请先准备测试用例', 'warn'); return; }
    setRunning(true);
    setRunProgress(0);
    tickProgress(setRunProgress, () => {
      const acc = +(86 + Math.random() * 12).toFixed(1);
      const fresh: TestRun = {
        id: note.trim() ? note.trim().split(/\s+/)[0] : `run_${runs.length + 1}`,
        note: note.trim() || `临时运行 · ${cases.length} 条 · ${strict}`,
        cases: cases.length, rounds, manualAcc: 0, autoAcc: acc,
        complianceFlips: Math.floor(Math.random() * 4), markProgress: 0, mode: strict,
        time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        p90: Math.round(1800 + Math.random() * 900),
      };
      setRuns(prev => [fresh, ...prev]);
      setRunning(false);
      setNote('');
      toast(`测试完成 · 自动判准确率 ${acc}% · 已写入测试结果`, 'success');
      setTab('results');
    });
  }

  // ── 详情：三层分流横向条形图 ──
  const triageBar = useMemo(() => () => ({
    ...baseOption(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, ...(baseOption().tooltip as object) },
    grid: { left: 8, right: 72, top: 6, bottom: 6, containLabel: true },
    xAxis: { type: 'value' as const, ...axisStyle(), splitLine: { show: false } },
    yAxis: {
      type: 'category' as const, inverse: true, data: TRIAGE.map(t => t.name),
      ...axisStyle(), splitLine: { show: false },
    },
    series: [{
      type: 'bar' as const, barWidth: 18,
      data: TRIAGE.map(t => ({ value: t.count, itemStyle: { color: cssVar(t.color), borderRadius: [0, 5, 5, 0] } })),
      label: {
        show: true, position: 'right' as const, color: cssVar('--text-2'), fontSize: 11.5, fontWeight: 600,
        formatter: (p: { value: number }) => `${p.value} 条 · ${((p.value / TRIAGE_TOTAL) * 100).toFixed(0)}%`,
      },
      animationDuration: 900, animationDelay: (i: number) => i * 110,
    }],
  }), []);

  // ─── 列定义 ───────────────────────────────────────────────────────────────
  const caseCols: Col<TestCase>[] = [
    { key: 'idx', header: '#', width: 52, num: true, render: (_r, i) => <span className="mono tnum text-3" style={{ fontSize: 12 }}>{i + 1}</span> },
    {
      key: 'dimension', header: '维度', width: 116,
      render: r => <span className="tag" style={{ color: 'var(--gold)', borderColor: 'color-mix(in srgb,var(--gold) 28%,var(--hairline))' }}>{r.dimension}</span>,
    },
    {
      key: 'question', header: '测试问题',
      render: r => <span style={{ color: 'var(--text-1)' }}>{r.question || <span className="text-3" style={{ fontStyle: 'italic' }}>（待补充，输入真实消金问法…）</span>}</span>,
    },
    {
      key: 'op', header: '操作', width: 70, align: 'right',
      render: r => (
        <button className="btn btn-icon btn-sm" style={{ color: 'var(--danger)' }}
          onClick={() => setCases(prev => prev.filter(c => c.id !== r.id))}>
          <Trash2 size={13} />
        </button>
      ),
    },
  ];

  const runCols: Col<TestRun>[] = [
    { key: 'time', header: '时间', width: 150, sortable: true, sortAccessor: r => r.time, render: r => <span className="tnum text-3" style={{ fontSize: 12 }}>{r.time}</span> },
    { key: 'note', header: '备注', render: r => <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{r.note}</span> },
    {
      key: 'cases', header: '用例数', width: 86, num: true, sortable: true, sortAccessor: r => r.cases,
      render: r => <span className="mono tnum" style={{ color: 'var(--text-2)' }}>{r.cases}<span className="text-3" style={{ fontSize: 11 }}> ×{r.rounds}</span></span>,
    },
    {
      key: 'manualAcc', header: '人工准确率', width: 108, num: true, sortable: true, sortAccessor: r => r.manualAcc,
      render: r => r.markProgress === 0
        ? <span className="text-3" style={{ fontSize: 12 }}>—</span>
        : <span className="tnum" style={{ color: accColor(r.manualAcc), fontWeight: 600 }}>{r.manualAcc}%</span>,
    },
    {
      key: 'autoAcc', header: '自动判准确率', width: 118, num: true, sortable: true, sortAccessor: r => r.autoAcc,
      render: r => <span className="tnum" style={{ color: accColor(r.autoAcc), fontWeight: 600 }}>{r.autoAcc}%</span>,
    },
    {
      key: 'complianceFlips', header: '合规翻转', width: 88, num: true,
      render: r => <span className="tnum" style={{ color: r.complianceFlips > 0 ? 'var(--danger)' : 'var(--text-3)', fontWeight: r.complianceFlips > 0 ? 600 : 400 }}>{r.complianceFlips}</span>,
    },
    {
      key: 'markProgress', header: '标记进度', width: 134,
      render: r => (
        <div style={{ minWidth: 96 }}>
          <MeterBar pct={r.markProgress} color={r.markProgress >= 100 ? 'var(--emerald)' : 'var(--gold)'} label={`${r.markProgress}%`} />
        </div>
      ),
    },
    {
      key: 'op', header: '操作', width: 132, align: 'right',
      render: r => (
        <span className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-subtle" onClick={e => { e.stopPropagation(); setDetail(r); }}><Eye size={12} />查看</button>
          <button className="btn btn-icon btn-sm" style={{ color: 'var(--danger)' }}
            onClick={e => { e.stopPropagation(); setRuns(prev => prev.filter(x => x.id !== r.id)); toast(`已删除运行「${r.id}」`, 'danger'); }}>
            <Trash2 size={13} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Pipeline 测试"
        subtitle="业务用例批量跑全链路 · 三层自动打标分流 · A/B + 回归"
        actions={
          <Segmented<TabKey>
            options={[{ value: 'prepare', label: '准备用例' }, { value: 'results', label: '测试结果' }, { value: 'flow', label: '审核流程' }]}
            value={tab}
            onChange={v => { setTab(v); if (v !== 'results') setDetail(null); }}
          />
        }
      />

      {tab === 'prepare' && (
        <div className="reveal">
          {/* 工具条 */}
          <Toolbar>
            <button className="btn btn-primary btn-sm row gap-2" onClick={() => setGenOpen(true)}><Bot size={14} />AI 生成用例</button>
            <button className="btn btn-ghost btn-sm row gap-2" onClick={() => toast('已从近 7 日真实会话日志采样 80 条注入预览', 'success')}><ScrollText size={14} />真实日志采样</button>
            <button className="btn btn-ghost btn-sm row gap-2" onClick={() => toast('测试用例 CSV 模板已下载', 'info')}><FileDown size={14} />下载模板</button>
            <button className="btn btn-ghost btn-sm row gap-2" onClick={() => toast('请选择本地 .csv / .xlsx 用例文件', 'info')}><FolderOpen size={14} />选择文件</button>
            <button className="btn btn-subtle btn-sm row gap-2" style={{ marginLeft: 'auto', color: 'var(--danger)' }}
              onClick={() => { setCases([]); toast('已清空全部用例', 'warn'); }}>
              <Trash2 size={14} />清空
            </button>
          </Toolbar>

          {/* 维度筛选 + 计数 */}
          <div className="row spread wrap" style={{ marginBottom: 12 }}>
            <select className="input" style={{ width: 160 }} value={dimFilter} onChange={e => setDimFilter(e.target.value as typeof DIMENSIONS[number])}>
              {DIMENSIONS.map(d => <option key={d} value={d}>{d === '全部' ? '全部维度' : d}</option>)}
            </select>
            <span className="t-small text-3 tnum">用例预览 · 共 <span className="gold" style={{ fontWeight: 700 }}>{cases.length}</span> 条{dimFilter !== '全部' && ` · 当前维度 ${filteredCases.length} 条`}</span>
          </div>

          {/* 用例预览表 */}
          <div className="card card-pad-0 reveal-1" style={{ marginBottom: 16 }}>
            <DataTable<TestCase>
              cols={caseCols}
              rows={filteredCases}
              rowKey={r => r.id}
              empty={{ title: '暂无用例', desc: '用「AI 生成用例」或「真实日志采样」快速准备测试集', icon: <FileText size={34} /> }}
            />
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--hairline)' }}>
              <button className="btn btn-ghost btn-sm row gap-2" onClick={appendRow}><Plus size={14} />追加一行</button>
            </div>
          </div>

          {/* 执行配置卡 */}
          <div className="card reveal-2">
            <SectionTitle right={<span className="t-small text-3 tnum">预计耗时 ETA ≈ <span className="gold" style={{ fontWeight: 700 }}>{eta}</span></span>}>执行配置</SectionTitle>
            <div className="col gap-3">
              <div>
                <label className="label" style={{ display: 'block', marginBottom: 6 }}>本次运行备注</label>
                <input className="input" placeholder="如：collection_50 · 催收红线专项压测" value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>判定严格度</label>
                  <div className="col gap-2">
                    {(['准确率', '冒烟', '严格'] as StrictMode[]).map(m => (
                      <RadioRow key={m} active={strict === m} onClick={() => setStrict(m)} title={m} desc={STRICT_DESC[m]} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>测试轮次</label>
                  <div className="col gap-2">
                    {([1, 3] as const).map(r => (
                      <RadioRow key={r} active={rounds === r} onClick={() => setRounds(r)}
                        title={r === 1 ? '1 轮' : '3 轮'} desc={r === 1 ? '快速验证，单次跑通即出结论' : '同问 3 次取众数，抗 LLM 随机性'} />
                    ))}
                  </div>
                </div>
              </div>

              {running && (
                <div className="reveal" style={{ marginTop: 4 }}>
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <span className="t-small text-2 row gap-2"><span className="dot-pulse" style={{ width: 8, height: 8, background: 'var(--gold)' }} />全链路执行中 · {cases.length} 条 × {rounds} 轮</span>
                    <span className="t-small tnum gold" style={{ fontWeight: 700 }}>{runProgress}%</span>
                  </div>
                  <MeterBar pct={runProgress} />
                </div>
              )}

              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-primary row gap-2" disabled={running} style={running ? { opacity: 0.55, cursor: 'not-allowed' } : undefined} onClick={startRun}>
                  <Play size={14} />{running ? '测试进行中…' : '开始测试'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'results' && !detail && (
        <div className="card card-pad-0 reveal">
          <DataTable<TestRun>
            cols={runCols}
            rows={runs}
            rowKey={r => r.id}
            defaultSort={{ key: 'time', dir: 'desc' }}
            onRow={r => setDetail(r)}
            empty={{ title: '暂无测试结果', desc: '到「准备用例」配置并开始一次测试，结果会出现在这里', icon: <Gauge size={34} /> }}
          />
        </div>
      )}

      {tab === 'results' && detail && (
        <RunDetail run={detail} onBack={() => setDetail(null)} triageBar={triageBar} />
      )}

      {tab === 'flow' && (
        <div className="reveal">
          <div className="card reveal" style={{ marginBottom: 16, background: 'linear-gradient(180deg, color-mix(in srgb,var(--gold) 5%,var(--surface-1)), var(--surface-1))' }}>
            <div className="row gap-2" style={{ marginBottom: 6 }}>
              <ShieldCheck size={16} style={{ color: 'var(--gold)' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>五阶段自动审核闭环</span>
            </div>
            <p className="text-2" style={{ fontSize: 13, lineHeight: 1.65, maxWidth: 760 }}>
              每条测试问题从机器人作答到知识反哺，串行经过 5 道关口：客服回答 → 自动评分 → 业务规则 → 失败归因 → 知识补全。
              三层 AI 判官 + 跨厂商裁判 + 硬规则一票否决，把人工复核压到 9% 以内。
            </p>
          </div>

          <div className="col gap-3">
            {FLOW_STEPS.map((s, i) => (
              <div key={s.no} className={`card card-hover reveal-${Math.min(i + 1, 6)}`}>
                <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: 46, height: 46, borderRadius: 'var(--r-lg)',
                    background: `color-mix(in srgb, var(${s.color}) 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, var(${s.color}) 32%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: `var(${s.color})`,
                  }}>
                    <s.icon size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="row gap-2" style={{ marginBottom: 3 }}>
                      <span className="mono" style={{ fontSize: 17, fontWeight: 700, color: `var(${s.color})` }}>{s.no}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{s.title}</span>
                      <span className="badge" style={{ background: `color-mix(in srgb, var(${s.color}) 12%, transparent)`, color: `var(${s.color})` }}>{s.sub}</span>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, marginTop: 10 }}>
                      {s.points.map(p => (
                        <div key={p} className="row gap-2" style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                          <CircleCheck size={14} style={{ flexShrink: 0, marginTop: 2, color: `color-mix(in srgb, var(${s.color}) 70%, var(--text-3))` }} />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 生成用例 Modal */}
      <Modal
        open={genOpen}
        onClose={() => { if (!genBusy) setGenOpen(false); }}
        title="AI 生成测试用例"
        sub="基于真实会话日志 + 意图三级树，批量合成业务用例"
        width={540}
        footer={
          <>
            <button className="btn btn-ghost btn-sm" disabled={genBusy} onClick={() => setGenOpen(false)}>取消</button>
            <button className="btn btn-primary btn-sm row gap-2" disabled={genBusy} onClick={startGenerate}>
              <Sparkles size={13} />{genBusy ? '生成中…' : '开始生成'}
            </button>
          </>
        }
      >
        <div className="col gap-3">
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 8 }}>生成条数</label>
            <div className="row gap-2 wrap">
              {GEN_SIZES.map(s => (
                <button key={s} className="btn btn-sm" onClick={() => setGenSize(s)}
                  style={{
                    minWidth: 64,
                    background: genSize === s ? 'var(--gold-glow)' : 'var(--surface-2)',
                    color: genSize === s ? 'var(--gold)' : 'var(--text-2)',
                    border: `1px solid ${genSize === s ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
                    fontWeight: 600,
                  }}>
                  {s} 条
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="row spread" style={{ marginBottom: 8 }}>
              <label className="label">LLM 改写比例</label>
              <span className="tnum gold" style={{ fontWeight: 700, fontSize: 13 }}>{rewritePct}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={rewritePct} onChange={e => setRewritePct(+e.target.value)}
              style={{ width: '100%', accentColor: cssVar('--gold') }} />
            <p className="t-small text-3" style={{ marginTop: 6, lineHeight: 1.5 }}>
              改写比例越高，对原始问法的同义改写 / 口语化扰动越强，越能压测模型鲁棒性；0% 为原样回放真实日志。
            </p>
          </div>
          {genBusy && (
            <div className="reveal">
              <div className="row spread" style={{ marginBottom: 6 }}>
                <span className="t-small text-2">合成中 · {genSize} 条 · 改写 {rewritePct}%</span>
                <span className="t-small tnum gold" style={{ fontWeight: 700 }}>{genProgress}%</span>
              </div>
              <MeterBar pct={genProgress} />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 子组件 & 常量
// ════════════════════════════════════════════════════════════════════════
const STRICT_DESC: Record<StrictMode, string> = {
  准确率: '判官多数票通过即算对，宽口径看大盘命中',
  冒烟: '只验链路是否跑通，不深究答案质量',
  严格: '合规 + 必答 + 语气全维度满足才算通过',
};

function accColor(v: number): string {
  if (v >= 95) return 'var(--emerald)';
  if (v >= 80) return 'var(--gold)';
  return 'var(--danger)';
}

function RadioRow({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={onClick} className="row gap-2" style={{
      textAlign: 'left', width: '100%', padding: '9px 12px', borderRadius: 'var(--r-md)',
      background: active ? 'color-mix(in srgb,var(--gold) 8%,var(--surface-2))' : 'var(--surface-2)',
      border: `1px solid ${active ? 'color-mix(in srgb,var(--gold) 36%,var(--hairline))' : 'var(--hairline)'}`,
      cursor: 'pointer', transition: 'all .18s var(--ease)', alignItems: 'flex-start',
    }}>
      <span style={{
        flexShrink: 0, width: 16, height: 16, borderRadius: '50%', marginTop: 1,
        border: `2px solid ${active ? 'var(--gold)' : 'var(--hairline-strong)'}`,
        background: active ? 'var(--gold)' : 'transparent',
        boxShadow: active ? 'inset 0 0 0 2.5px var(--surface-2)' : 'none',
      }} />
      <span className="col" style={{ gap: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--text-1)' : 'var(--text-2)' }}>{title}</span>
        <span className="text-3" style={{ fontSize: 11.5, lineHeight: 1.4 }}>{desc}</span>
      </span>
    </button>
  );
}

// ─── 测试结果详情 ─────────────────────────────────────────────────────────────
function RunDetail({ run, onBack, triageBar }: { run: TestRun; onBack: () => void; triageBar: () => Record<string, unknown> }) {
  return (
    <div className="reveal">
      {/* 面包屑 + 概要 */}
      <div className="row spread wrap" style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm row gap-2" onClick={onBack}><ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />返回结果列表</button>
        <span className="row gap-2 wrap">
          <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{run.mode}</span>
          <span className="t-small text-3 tnum">{run.cases} 条 × {run.rounds} 轮 · P90 {run.p90.toLocaleString('zh-CN')}ms · {run.time}</span>
        </span>
      </div>

      <div className="card reveal" style={{ marginBottom: 16 }}>
        <div className="row spread">
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{run.note}</span>
          <span className="mono t-small text-3">#{run.id}</span>
        </div>
      </div>

      {/* 三层自动打标分流板 */}
      <div className="card reveal-1" style={{ marginBottom: 16 }}>
        <SectionTitle right={<span className="t-small text-3 tnum">{TRIAGE_TOTAL} 条样本三层分流</span>}>三层自动打标分流</SectionTitle>

        {/* 3 KPI */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
          {SAVE_KPI.map(k => (
            <div key={k.label} style={{
              padding: '14px 16px', borderRadius: 'var(--r-lg)',
              background: `color-mix(in srgb, var(${k.color}) 6%, var(--surface-2))`,
              border: `1px solid color-mix(in srgb, var(${k.color}) 18%, var(--hairline))`,
            }}>
              <div className="row gap-2" style={{ marginBottom: 8 }}>
                <k.icon size={15} style={{ color: `var(${k.color})` }} />
                <span className="label">{k.label}</span>
              </div>
              <div className="kpi-value tnum" style={{ color: `var(${k.color})`, fontSize: 26 }}>{k.value}</div>
              <div className="text-3" style={{ fontSize: 11.5, marginTop: 4, lineHeight: 1.4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* 分流条形图 + 各层注解 */}
        <div className="grid" style={{ gridTemplateColumns: '1.35fr 1fr', gap: 18, alignItems: 'center' }}>
          <Chart build={triageBar} height={170} />
          <div className="col gap-2">
            {TRIAGE.map(t => (
              <div key={t.key} className="row gap-2" style={{ alignItems: 'flex-start', padding: '8px 10px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
                <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, var(${t.color}) 14%, transparent)`, color: `var(${t.color})` }}>
                  <t.icon size={14} />
                </span>
                <div className="col" style={{ gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{t.name}</span>
                  <span className="text-3" style={{ fontSize: 11, lineHeight: 1.4 }}>{t.desc}</span>
                  <span className="t-small tnum" style={{ color: `var(${t.color})`, fontWeight: 600 }}>打标准确率 {t.acc}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 核心卡 */}
      <div className="grid reveal-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {CORE_CARDS.map(c => (
          <div key={c.label} className="card card-hover">
            <div className="spread" style={{ marginBottom: 10 }}>
              <span className="label">{c.label}</span>
              <c.icon size={15} style={{ color: `var(${c.tone})`, opacity: 0.8 }} />
            </div>
            <div className="kpi-value tnum" style={{ color: `var(${c.tone})` }}>{c.value}</div>
            <div className="text-3" style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 需优先修复 TOP5 */}
      <div className="card card-pad-0 reveal-3">
        <div className="row gap-2" style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline)' }}>
          <Flame size={16} style={{ color: 'var(--danger)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>需优先修复 TOP 5</span>
          <span className="t-small text-3" style={{ marginLeft: 'auto' }}>按命中频次 × 严重度排序，直接派发知识补全器</span>
        </div>
        <div className="col">
          {TOP_FIX.map((f, i) => (
            <div key={f.rank} className="row gap-3" style={{ padding: '13px 18px', borderBottom: i < TOP_FIX.length - 1 ? '1px solid var(--hairline)' : 'none', alignItems: 'flex-start' }}>
              <span className="mono tnum" style={{
                flexShrink: 0, width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `color-mix(in srgb, var(${f.color}) 14%, transparent)`, color: `var(${f.color})`, fontSize: 13, fontWeight: 700,
              }}>{f.rank}</span>
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="row gap-2 wrap" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>{f.query}</span>
                  <span className="tag" style={{ color: `var(${f.color})`, borderColor: `color-mix(in srgb, var(${f.color}) 28%, var(--hairline))` }}>{f.type}</span>
                </div>
                <div className="text-2" style={{ fontSize: 12, lineHeight: 1.5 }}>{f.reason}</div>
              </div>
              <span className="col" style={{ flexShrink: 0, alignItems: 'flex-end', gap: 2 }}>
                <span className="tnum" style={{ fontSize: 17, fontWeight: 700, color: `var(${f.color})` }}>{f.freq}</span>
                <span className="t-small text-3">次命中</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
