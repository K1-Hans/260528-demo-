import { useState, useMemo } from 'react';
import { Search, Plus, Upload, Download, FileText, History, ChevronDown, ChevronUp, Trash2, Pencil, PlusCircle, MinusCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import { DataTable, type Col } from '../../components/DataTable';
import { RiskBadge, Toolbar, Field, Drawer, Modal, toast } from '../../components/kit';
import Chart from '../../components/Chart';
import { baseOption, cssVar, chartPalette } from '../../lib/chartTheme';
import { RISK_TYPES } from '../../lib/mockData';
import type { SensitiveWord, SWLog, RiskType } from '../../types';

// ─── Mock 敏感词（18 主词 · 覆盖全部 8 类）────────────────────────────────────
const INITIAL_WORDS: SensitiveWord[] = [
  {
    word: '投诉', type: '投诉维权', status: '已启用', updatedAt: '2025-06-10 09:00',
    variants: ['我要投诉', '聚投诉', '我去银保监会投诉', '12315', '投诉你们', '要投诉客服', '向监管部门投诉'],
  },
  {
    word: '维权', type: '投诉维权', status: '已启用', updatedAt: '2025-06-10 09:05',
    variants: ['我要维权', '消费者权益', '消协投诉', '维权到底'],
  },
  {
    word: '起诉', type: '法律维权', status: '已启用', updatedAt: '2025-06-11 10:00',
    variants: ['我要起诉你们', '法庭见', '打官司', '起诉到法院', '提起诉讼'],
  },
  {
    word: '律师函', type: '法律维权', status: '已启用', updatedAt: '2025-06-11 10:30',
    variants: ['发律师函', '让律师联系你', '律师告你'],
  },
  {
    word: '法院', type: '法律维权', status: '已启用', updatedAt: '2025-06-11 11:00',
    variants: ['上法院', '告上法庭', '法律途径', '司法途径'],
  },
  {
    word: '银保监会', type: '金融监管', status: '已启用', updatedAt: '2025-06-12 08:30',
    variants: ['向银保监投诉', 'CBIRC', '金融监管局', '国家金融监督管理总局', '金融监管总局'],
  },
  {
    word: '央行', type: '金融监管', status: '已启用', updatedAt: '2025-06-12 09:00',
    variants: ['人民银行投诉', '向央行举报', '人行投诉', 'PBOC'],
  },
  {
    word: '暴力催收', type: '催收相关', status: '已启用', updatedAt: '2025-06-13 14:00',
    variants: ['恶意催收', '威胁催收', '骚扰家人', '爆通讯录', '催收骚扰'],
  },
  {
    word: '骚扰电话', type: '催收相关', status: '已启用', updatedAt: '2025-06-13 14:30',
    variants: ['一直打电话', '每天打电话', '电话轰炸', '催收电话'],
  },
  {
    word: '315', type: '媒体曝光', status: '已启用', updatedAt: '2025-06-14 09:00',
    variants: ['315晚会', '3·15投诉', '315曝光', '向315举报'],
  },
  {
    word: '曝光', type: '媒体曝光', status: '已启用', updatedAt: '2025-06-14 09:30',
    variants: ['媒体曝光', '网络曝光', '发帖曝光', '微博曝光', '抖音曝光', '知乎曝光'],
  },
  {
    word: '记者', type: '媒体曝光', status: '已启用', updatedAt: '2025-06-14 10:00',
    variants: ['找记者', '找媒体', '上新闻', '联系媒体'],
  },
  {
    word: '政府', type: '涉政敏感', status: '已启用', updatedAt: '2025-06-15 08:00',
    variants: ['找政府', '向政府投诉', '去政府', '信访局'],
  },
  {
    word: '违法', type: '合规风险', status: '已启用', updatedAt: '2025-06-15 09:00',
    variants: ['你们违法', '违规操作', '非法行为', '违法放贷', '涉嫌违法'],
  },
  {
    word: '欺诈', type: '合规风险', status: '已启用', updatedAt: '2025-06-15 09:30',
    variants: ['金融欺诈', '诈骗', '欺骗消费者', '虚假宣传'],
  },
  {
    word: '高利贷', type: '合规风险', status: '已启用', updatedAt: '2025-06-15 10:00',
    variants: ['利率太高', '高息贷款', '砍头息', '违规收费'],
  },
  {
    word: '不想活了', type: '扬言轻生', status: '已启用', updatedAt: '2025-06-15 11:00',
    variants: ['活不下去了', '想死', '轻生', '自杀', '去死', '没有活路'],
  },
  {
    word: '走投无路', type: '扬言轻生', status: '已启用', updatedAt: '2025-06-15 11:30',
    variants: ['活不下去', '逼死我', '逼我去死', '绝望了'],
  },
];

// ─── Mock 操作日志────────────────────────────────────────────────────────────
const INITIAL_LOGS: SWLog[] = [
  { time: '2025-06-15 11:30', action: '新增主词', word: '走投无路', type: '扬言轻生', detail: '新增主词 + 4 个变体', operator: '林婉清' },
  { time: '2025-06-15 10:00', action: '新增主词', word: '高利贷', type: '合规风险', detail: '新增主词 + 3 个变体', operator: '周慎' },
  { time: '2025-06-15 09:30', action: '加变体', word: '欺诈', type: '合规风险', detail: '新增变体「虚假宣传」', operator: '周慎' },
  { time: '2025-06-15 09:00', action: '新增主词', word: '违法', type: '合规风险', detail: '新增主词 + 5 个变体', operator: '周慎' },
  { time: '2025-06-15 08:00', action: '新增主词', word: '政府', type: '涉政敏感', detail: '新增主词 + 4 个变体', operator: '张明远' },
  { time: '2025-06-14 10:00', action: '新增主词', word: '记者', type: '媒体曝光', detail: '新增主词 + 4 个变体', operator: '林婉清' },
  { time: '2025-06-14 09:30', action: '加变体', word: '曝光', type: '媒体曝光', detail: '新增变体「知乎曝光」', operator: '林婉清' },
  { time: '2025-06-14 09:00', action: '新增主词', word: '315', type: '媒体曝光', detail: '新增主词 + 4 个变体', operator: '林婉清' },
  { time: '2025-06-13 14:30', action: '新增主词', word: '骚扰电话', type: '催收相关', detail: '新增主词 + 4 个变体', operator: '赵越' },
  { time: '2025-06-13 14:00', action: '新增主词', word: '暴力催收', type: '催收相关', detail: '新增主词 + 5 个变体', operator: '赵越' },
  { time: '2025-06-12 09:00', action: '新增主词', word: '央行', type: '金融监管', detail: '新增主词 + 4 个变体', operator: '周慎' },
  { time: '2025-06-12 08:30', action: '新增主词', word: '银保监会', type: '金融监管', detail: '新增主词 + 5 个变体', operator: '周慎' },
  { time: '2025-06-11 11:00', action: '新增主词', word: '法院', type: '法律维权', detail: '新增主词 + 4 个变体', operator: '周慎' },
  { time: '2025-06-11 10:30', action: '新增主词', word: '律师函', type: '法律维权', detail: '新增主词 + 3 个变体', operator: '周慎' },
  { time: '2025-06-11 10:00', action: '新增主词', word: '起诉', type: '法律维权', detail: '新增主词 + 5 个变体', operator: '周慎' },
  { time: '2025-06-10 09:30', action: '改类型', word: '投诉', type: '投诉维权', detail: '风险类型由「合规风险」改为「投诉维权」', operator: '张明远' },
  { time: '2025-06-10 09:05', action: '新增主词', word: '维权', type: '投诉维权', detail: '新增主词 + 4 个变体', operator: '林婉清' },
  { time: '2025-06-10 09:00', action: '新增主词', word: '投诉', type: '投诉维权', detail: '新增主词 + 7 个变体', operator: '林婉清' },
];

// ─── 风险类型颜色 token（c1–c8 映射 8 类）──────────────────────────────────────
const RISK_COLOR_VARS: Record<RiskType, string> = {
  投诉维权: '--c1', 法律维权: '--c2', 金融监管: '--c3',
  催收相关: '--c4', 媒体曝光: '--c5', 涉政敏感: '--c6',
  合规风险: '--c7', 扬言轻生: '--danger',
};

export default function Sensitive() {
  const [words, setWords]               = useState<SensitiveWord[]>(INITIAL_WORDS);
  const [logs]                          = useState<SWLog[]>(INITIAL_LOGS);
  const [search, setSearch]             = useState('');
  const [riskFilter, setRiskFilter]     = useState<RiskType | '全部'>('全部');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Drawer: 新增主词
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [newWord, setNewWord]           = useState('');
  const [newType, setNewType]           = useState<RiskType>('投诉维权');
  const [newVariants, setNewVariants]   = useState('');

  // Modal: 编辑
  const [editOpen, setEditOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<SensitiveWord | null>(null);
  const [editType, setEditType]         = useState<RiskType>('投诉维权');
  const [editVariantInput, setEditVariantInput] = useState('');

  // Modal: 操作日志
  const [logOpen, setLogOpen]           = useState(false);

  // ─── 统计 ─────────────────────────────────────────────────────────────────
  const totalVariants = useMemo(() => words.reduce((s, w) => s + w.variants.length, 0), [words]);

  const riskDist = useMemo(() => {
    const map: Record<string, { word: number; variant: number }> = {};
    RISK_TYPES.forEach(rt => { map[rt] = { word: 0, variant: 0 }; });
    words.forEach(w => {
      map[w.type].word += 1;
      map[w.type].variant += w.variants.length;
    });
    return RISK_TYPES.map(rt => ({ type: rt, word: map[rt].word, variant: map[rt].variant }));
  }, [words]);

  // ─── 图表 option ───────────────────────────────────────────────────────────
  const chartBuild = useMemo(() => () => {
    const palette = chartPalette();
    const dangerColor = cssVar('--danger');
    const colors = RISK_TYPES.map((rt, i) =>
      rt === '扬言轻生' ? dangerColor : (palette[i % palette.length] ?? dangerColor)
    );
    return {
      ...baseOption(),
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; data: { variants: number } };
          return `${p.name}<br/>主词 ${p.value} 个 · 变体 ${p.data?.variants ?? 0} 个`;
        },
      },
      series: [{
        type: 'pie',
        radius: ['36%', '72%'],
        roseType: 'area',
        label: {
          show: true,
          fontSize: 11,
          color: cssVar('--text-2'),
          formatter: '{b}\n{c}',
        },
        labelLine: { lineStyle: { color: cssVar('--hairline-strong') } },
        data: riskDist.map((d, i) => ({
          name: d.type,
          value: d.word,
          variants: d.variant,
          itemStyle: { color: colors[i] },
        })),
        animationType: 'expansion',
        animationDuration: 900,
      }],
    };
  }, [riskDist]);

  // ─── 过滤 ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return words.filter(w => {
      const matchRisk = riskFilter === '全部' || w.type === riskFilter;
      const matchSearch = !search
        || w.word.includes(search)
        || w.variants.some(v => v.includes(search));
      return matchRisk && matchSearch;
    });
  }, [words, search, riskFilter]);

  // ─── helpers ──────────────────────────────────────────────────────────────
  const nowStr = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-').slice(0, 16);

  const toggleExpand = (word: string) => {
    setExpandedRows(prev => {
      const s = new Set(prev);
      s.has(word) ? s.delete(word) : s.add(word);
      return s;
    });
  };

  const openEdit = (w: SensitiveWord) => {
    setEditTarget({ ...w, variants: [...w.variants] });
    setEditType(w.type);
    setEditVariantInput('');
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editTarget) return;
    setWords(prev => prev.map(w =>
      w.word === editTarget.word
        ? { ...w, type: editType, variants: editTarget.variants, updatedAt: nowStr() }
        : w
    ));
    toast(`「${editTarget.word}」已更新`, 'success');
    setEditOpen(false);
  };

  const addVariantToEdit = () => {
    const v = editVariantInput.trim();
    if (!v || !editTarget) return;
    if (editTarget.variants.includes(v)) { toast('变体已存在', 'warn'); return; }
    setEditTarget(prev => prev ? { ...prev, variants: [...prev.variants, v] } : prev);
    setEditVariantInput('');
  };

  const removeVariantFromEdit = (variant: string) => {
    setEditTarget(prev => prev ? { ...prev, variants: prev.variants.filter(x => x !== variant) } : prev);
  };

  const deleteWord = (word: string) => {
    setWords(prev => prev.filter(w => w.word !== word));
    setExpandedRows(prev => { const s = new Set(prev); s.delete(word); return s; });
    toast(`已删除主词「${word}」`, 'warn');
  };

  const saveDrawer = () => {
    const w = newWord.trim();
    if (!w) { toast('主词不能为空', 'warn'); return; }
    if (words.some(x => x.word === w)) { toast('主词已存在', 'warn'); return; }
    const variants = newVariants.split('\n').map(v => v.trim()).filter(Boolean);
    const item: SensitiveWord = {
      word: w, type: newType, variants, status: '已启用', updatedAt: nowStr(),
    };
    setWords(prev => [item, ...prev]);
    toast(`已新增主词「${w}」+ ${variants.length} 个变体，实时生效`, 'success');
    setDrawerOpen(false);
    setNewWord('');
    setNewVariants('');
    setNewType('投诉维权');
  };

  // ─── 表列 ─────────────────────────────────────────────────────────────────
  const cols: Col<SensitiveWord>[] = [
    {
      key: 'word',
      header: '主词',
      width: 120,
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>{row.word}</span>
      ),
    },
    {
      key: 'variants',
      header: '变体（OR 匹配）',
      render: (row) => {
        const expanded = expandedRows.has(row.word);
        const PREVIEW  = 3;
        const shown    = expanded ? row.variants : row.variants.slice(0, PREVIEW);
        const extra    = row.variants.length - PREVIEW;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', alignItems: 'center' }}>
            {shown.map(v => (
              <span
                key={v}
                style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-sm)',
                  background: 'var(--surface-3)', color: 'var(--text-2)',
                  border: '1px solid var(--hairline)', whiteSpace: 'nowrap',
                }}
              >
                {v}
              </span>
            ))}
            {!expanded && extra > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '1px 7px', color: 'var(--gold)', minHeight: 20 }}
                onClick={e => { e.stopPropagation(); toggleExpand(row.word); }}
              >
                +{extra}
              </button>
            )}
            {expanded && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '1px 7px', color: 'var(--text-3)', minHeight: 20 }}
                onClick={e => { e.stopPropagation(); toggleExpand(row.word); }}
              >
                收起
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'updatedAt',
      header: '更新时间',
      width: 148,
      nowrap: true,
      render: (row) => (
        <span className="tnum" style={{ color: 'var(--text-3)', fontSize: 12 }}>{row.updatedAt}</span>
      ),
    },
    {
      key: 'type',
      header: '风险类型',
      width: 108,
      render: (row) => <RiskBadge type={row.type} />,
    },
    {
      key: 'ops',
      header: '操作',
      width: 220,
      render: (row) => (
        <div className="row gap-1" onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-ghost btn-sm"
            title={expandedRows.has(row.word) ? '收起变体' : '展开变体'}
            onClick={() => toggleExpand(row.word)}
          >
            {expandedRows.has(row.word) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span style={{ marginLeft: 3, fontSize: 12 }}>变体</span>
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="编辑"
            onClick={() => openEdit(row)}
          >
            <Pencil size={13} />
            <span style={{ marginLeft: 3, fontSize: 12 }}>编辑</span>
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="删主词"
            onClick={() => deleteWord(row.word)}
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  // ─── 日志表列 ─────────────────────────────────────────────────────────────
  const logCols: Col<SWLog>[] = [
    {
      key: 'time', header: '时间', width: 150, nowrap: true,
      render: r => <span className="tnum" style={{ color: 'var(--text-3)', fontSize: 12 }}>{r.time}</span>,
    },
    {
      key: 'action', header: '操作', width: 88,
      render: r => <span style={{ fontWeight: 500, color: 'var(--gold)' }}>{r.action}</span>,
    },
    {
      key: 'word', header: '主词', width: 90,
      render: r => <span style={{ fontWeight: 600 }}>{r.word}</span>,
    },
    {
      key: 'type', header: '风险类型', width: 108,
      render: r => <RiskBadge type={r.type as RiskType} />,
    },
    {
      key: 'detail', header: '明细',
      render: r => <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{r.detail}</span>,
    },
    {
      key: 'operator', header: '操作人', width: 80,
      render: r => <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{r.operator}</span>,
    },
  ];

  return (
    <div className="page">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <PageHeader
        title="敏感词管理"
        subtitle="51 主词 + 211 变体 · 8 类风险标签 · 命中即走安抚 Agent + 转人工 · 实时生效"
        actions={
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setLogOpen(true)}>
              <History size={14} />
              <span style={{ marginLeft: 4 }}>操作日志</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => toast('批量导入（demo 功能）', 'info')}>
              <Upload size={14} />
              <span style={{ marginLeft: 4 }}>批量导入</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => toast('从模板新建（demo 功能）', 'info')}>
              <FileText size={14} />
              <span style={{ marginLeft: 4 }}>模板</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => toast('导出 Excel（demo 功能）', 'info')}>
              <Download size={14} />
              <span style={{ marginLeft: 4 }}>导出</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)}>
              <Plus size={14} />
              <span style={{ marginLeft: 4 }}>+ 新增敏感词</span>
            </button>
          </div>
        }
      />

      {/* ─── 风险类分布图 ────────────────────────────────────────────── */}
      <div className="card reveal" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
        <div className="row spread" style={{ padding: '14px 20px 0', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>风险类分布</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>8 类 · 主词数量玫瑰图</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {riskDist.map(d => (
              <div key={d.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: `var(${RISK_COLOR_VARS[d.type]})`, flexShrink: 0,
                }} />
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.type}</span>
                <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>{d.word}</span>
              </div>
            ))}
          </div>
        </div>
        <Chart build={chartBuild} height={220} deps={[riskDist]} />
      </div>

      {/* ─── 工具条 ──────────────────────────────────────────────────── */}
      <Toolbar>
        <div className="input-wrap" style={{ flex: '0 0 280px' }}>
          <Search size={14} className="input-icon" />
          <input
            className="input"
            style={{ paddingLeft: 30 }}
            placeholder="搜索主词或变体..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ flex: '0 0 140px' }}
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value as RiskType | '全部')}
        >
          <option value="全部">全部风险类型</option>
          {RISK_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto', padding: '0 4px' }}>
          共 <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{words.length}</span> 主词
          &nbsp;/&nbsp;
          <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{totalVariants}</span> 变体
        </span>
      </Toolbar>

      {/* ─── DataTable ───────────────────────────────────────────────── */}
      <div className="card card-pad-0 reveal-1">
        <DataTable<SensitiveWord>
          cols={cols}
          rows={filtered}
          rowKey={r => r.word}
          empty={{ title: '暂无敏感词', desc: '点击「+ 新增敏感词」添加' }}
          dense
        />
      </div>

      {filtered.length > 0 && (
        <div style={{ padding: '10px 4px 0', fontSize: 12, color: 'var(--text-3)' }}>
          {riskFilter !== '全部' && <span>筛选：{riskFilter} · </span>}
          {search && <span>搜索：&quot;{search}&quot; · </span>}
          共 <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{filtered.length}</span> 个主词
        </div>
      )}

      {/* ─── 新增敏感词 Drawer ────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="新增敏感词"
        sub="保存后实时生效 · 命中触发安抚 Agent 并转人工"
        width={480}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDrawerOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={saveDrawer}>保存并生效</button>
          </>
        }
      >
        <Field label="主词 *" hint="命中即触发，支持完全匹配">
          <input
            className="input"
            placeholder="输入主词，如「投诉」「起诉」"
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="风险类型">
          <select
            className="input"
            value={newType}
            onChange={e => setNewType(e.target.value as RiskType)}
          >
            {RISK_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
          </select>
        </Field>
        <Field label="变体（每行一个）" hint="OR 匹配主词，任意命中即触发，留空也可保存">
          <textarea
            className="input"
            rows={6}
            placeholder={'我要投诉\n聚投诉\n12315\n...'}
            value={newVariants}
            onChange={e => setNewVariants(e.target.value)}
            style={{ resize: 'vertical', minHeight: 120, fontFamily: 'inherit' }}
          />
        </Field>
        <div style={{ padding: '10px 14px', background: 'var(--surface-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600 }}>命中后 Agent 动作</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
            1. 安抚 Agent 自动回复情绪缓和话术<br />
            2. Pipeline 标记风险等级并转人工<br />
            3. 坐席端弹出风险提示卡片
          </div>
        </div>
      </Drawer>

      {/* ─── 编辑主词 Modal ───────────────────────────────────────────── */}
      {editTarget && (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title={`编辑「${editTarget.word}」`}
          sub="改风险类型 / 管理变体"
          width={540}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setEditOpen(false)}>关闭</button>
              <button className="btn btn-primary" onClick={saveEdit}>保存</button>
            </>
          }
        >
          <Field label="风险类型">
            <select
              className="input"
              value={editType}
              onChange={e => setEditType(e.target.value as RiskType)}
            >
              {RISK_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
            </select>
          </Field>
          <Field label="变体管理">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {editTarget.variants.map(v => (
                <div
                  key={v}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', background: 'var(--surface-2)',
                    borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)',
                  }}
                >
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)' }}>{v}</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)', padding: '2px 6px', minHeight: 24 }}
                    onClick={() => removeVariantFromEdit(v)}
                    title="删除变体"
                  >
                    <MinusCircle size={13} />
                  </button>
                </div>
              ))}
              {editTarget.variants.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0', textAlign: 'center' }}>暂无变体</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="输入新变体，按 Enter 添加..."
                value={editVariantInput}
                onChange={e => setEditVariantInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVariantToEdit(); } }}
              />
              <button className="btn btn-primary btn-sm" onClick={addVariantToEdit}>
                <PlusCircle size={13} />
                <span style={{ marginLeft: 3 }}>加变体</span>
              </button>
            </div>
          </Field>
        </Modal>
      )}

      {/* ─── 操作日志 Modal ───────────────────────────────────────────── */}
      <Modal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="操作日志"
        sub={`共 ${logs.length} 条记录`}
        width={760}
        footer={<button className="btn btn-ghost" onClick={() => setLogOpen(false)}>关闭</button>}
      >
        <DataTable<SWLog>
          cols={logCols}
          rows={logs}
          rowKey={(_, i) => String(i)}
          empty={{ title: '暂无操作日志' }}
          dense
        />
      </Modal>
    </div>
  );
}
