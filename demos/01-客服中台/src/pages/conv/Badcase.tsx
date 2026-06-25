import { useMemo, useState } from 'react';
import {
  ThumbsDown, Wrench, RotateCcw, EyeOff, Eye, CheckCircle2, ListChecks,
  Sparkles, MessageSquareWarning, BotMessageSquare,
} from 'lucide-react';
import { Card, PageHeader } from '../../components/ui';
import { DataTable, type Col } from '../../components/DataTable';
import { BadcaseBadge, Toolbar, Drawer, Modal, toast } from '../../components/kit';
import type { Badcase, BadcaseStatus, ReplySource, BadReason } from '../../types';

// ─── 回复来源 tag 配色 ────────────────────────────────────────────────────────
const SRC_TONE: Record<ReplySource, string> = { QA命中: 'var(--info)', LLM生成: 'var(--gold)' };
const REASON_TONE: Record<BadReason, string> = {
  回复不准确: 'var(--danger)', 语气机械: 'var(--warning)', 没有解决: 'var(--c4)', 其他: 'var(--text-3)',
};
const REASONS: BadReason[] = ['回复不准确', '语气机械', '没有解决', '其他'];

// ─── Mock：20 条真实消金 badcase（点踩负反馈聚合）─────────────────────────────
const ROWS: Badcase[] = [
  { id: 'bc01', query: '我晚上 8 点才发工资，逾期会影响征信吗', answer: '逾期可能会影响征信，建议您尽快还款。', replyType: 'LLM生成', reason: '没有解决', l1: '还款相关', l2: '逾期咨询', l3: '征信影响', time: '06-16 21:14', status: 'pending', sessionId: 'sess_8f3a21' },
  { id: 'bc02', query: '提前结清到底要不要手续费', answer: '提前结清可能涉及费用，具体请以合同为准。', replyType: 'QA命中', reason: '回复不准确', l1: '费用相关', l2: '结清费用', l3: '提前结清', time: '06-16 20:52', status: 'pending', sessionId: 'sess_a72b09' },
  { id: 'bc03', query: '我还款一直失败到底怎么回事，急死了', answer: '还款失败请检查银行卡余额。', replyType: 'QA命中', reason: '语气机械', l1: '还款相关', l2: '还款异常', l3: '还款失败', time: '06-16 20:33', status: 'pending', sessionId: 'sess_5d1e88' },
  { id: 'bc04', query: '会员我没开过为什么每个月扣我 9 块', answer: '会员费可在「我的-会员中心」查看。', replyType: 'QA命中', reason: '没有解决', l1: '费用相关', l2: '会员费用', l3: '扣费疑问', time: '06-16 19:48', status: 'pending', sessionId: 'sess_91ae04' },
  { id: 'bc05', query: '你们催收天天打电话给我同事，这合法吗', answer: '关于催收问题，建议您联系人工客服处理。', replyType: 'LLM生成', reason: '没有解决', l1: '催收相关', l2: '催收投诉', l3: '骚扰联系人', time: '06-16 19:21', status: 'pending', sessionId: 'sess_61ff90' },
  { id: 'bc06', query: '额度怎么突然从 2 万降到 5 千了', answer: '额度会根据综合评估动态调整。', replyType: 'LLM生成', reason: '没有解决', l1: '产品与信息', l2: '额度管理', l3: '额度下调', time: '06-16 18:57', status: 'pending', sessionId: 'sess_2af671' },
  { id: 'bc07', query: '分期手续费怎么算的，给我算一下 6 期', answer: '分期手续费按费率计算，具体请见 APP。', replyType: 'LLM生成', reason: '没有解决', l1: '费用相关', l2: '分期费用', l3: '费率计算', time: '06-16 18:30', status: 'pending', sessionId: 'sess_7b13c4' },
  { id: 'bc08', query: '我人在国外能不能还款', answer: '还款可在信用贷 APP 操作。', replyType: 'QA命中', reason: '回复不准确', l1: '还款相关', l2: '还款渠道', l3: '境外还款', time: '06-16 17:55', status: 'pending', sessionId: 'sess_08de5f' },
  { id: 'bc09', query: '为啥别人利率比我低，是不是看人下菜碟', answer: '利率由系统综合评定，感谢理解。', replyType: 'LLM生成', reason: '语气机械', l1: '产品与信息', l2: '利率咨询', l3: '差异化定价', time: '06-16 17:12', status: 'pending', sessionId: 'sess_d3a9b2' },
  { id: 'bc10', query: '改一下我的还款日行不行', answer: '还款日暂不支持自助修改。', replyType: 'QA命中', reason: '没有解决', l1: '业务办理', l2: '还款日', l3: '修改还款日', time: '06-16 16:40', status: 'fixed', sessionId: 'sess_e012ff' },
  { id: 'bc11', query: '我要注销账户，但提示有余额注销不了', answer: '注销需结清全部在贷余额后再操作。', replyType: 'QA命中', reason: '回复不准确', l1: '业务办理', l2: '账户注销', l3: '余额阻断', time: '06-16 16:08', status: 'fixed', sessionId: 'sess_aa71c0' },
  { id: 'bc12', query: '协商还款能不能减免利息我实在还不上', answer: '关于协商还款，请您联系人工客服。', replyType: 'LLM生成', reason: '没有解决', l1: '还款相关', l2: '协商还款', l3: '困境减免', time: '06-16 15:33', status: 'fixed', sessionId: 'sess_3b1c77' },
  { id: 'bc13', query: '客服上班时间是几点到几点', answer: '人工服务时间 08:00—21:00。', replyType: 'QA命中', reason: '其他', l1: '产品与信息', l2: '服务信息', l3: '服务时间', time: '06-16 15:01', status: 'fixed', sessionId: 'sess_77bd13' },
  { id: 'bc14', query: '放款多久到账，我急用钱', answer: '放款通常实时到账，以银行处理为准。', replyType: 'LLM生成', reason: '语气机械', l1: '申请咨询', l2: '放款进度', l3: '到账时效', time: '06-16 14:28', status: 'fixed', sessionId: 'sess_44c2a8' },
  { id: 'bc15', query: '我手机号换了怎么更新预留号码', answer: '预留手机号可在「我的-个人信息」修改。', replyType: 'QA命中', reason: '回复不准确', l1: '信息维护', l2: '联系方式', l3: '换绑手机号', time: '06-16 13:55', status: 'ignored', sessionId: 'sess_5c8e10' },
  { id: 'bc16', query: '今天是几号', answer: '抱歉，暂时无法回答与业务无关的问题。', replyType: 'LLM生成', reason: '其他', l1: '自定义', l2: '闲聊', l3: '无关问题', time: '06-16 13:20', status: 'ignored', sessionId: 'sess_9a0e12' },
  { id: 'bc17', query: '你是不是机器人，我要真人', answer: '小云正在为您转接人工，请您稍后~', replyType: 'QA命中', reason: '其他', l1: '自定义', l2: '转人工', l3: '识别身份', time: '06-16 12:47', status: 'ignored', sessionId: 'sess_b3c2a9' },
  { id: 'bc18', query: '逾期一天会上征信吗有没有宽限期', answer: '逾期可能影响征信，建议尽快处理。', replyType: 'LLM生成', reason: '没有解决', l1: '还款相关', l2: '逾期咨询', l3: '宽限期', time: '06-16 12:13', status: 'pending', sessionId: 'sess_c1d8e7' },
  { id: 'bc19', query: '会员中心退费申请填了三天还没退', answer: '会员退费 3-5 工作日原路退回，请耐心等待。', replyType: 'QA命中', reason: '没有解决', l1: '费用相关', l2: '会员退费', l3: '退费进度', time: '06-16 11:40', status: 'pending', sessionId: 'sess_f0a1b2' },
  { id: 'bc20', query: '征信报告里这笔贷款显示逾期但我没逾期', answer: '征信异议请联系人工客服核实处理。', replyType: 'LLM生成', reason: '回复不准确', l1: '还款相关', l2: '征信异议', l3: '错误标记', time: '06-16 11:05', status: 'pending', sessionId: 'sess_3e9c40' },
];

// 草拟 QA 标准答案建议（演示用根因修复回灌）
const QA_SUGGEST: Record<string, string> = {
  bc01: '亲亲~只要在最终还款日 23:59 前完成扣款即视为按时还款，当天晚 8 点到账不会上报逾期，自然也不影响征信哦。如担心来不及，可提前手动还款（路径：信用贷 APP-我的-还款）。',
  bc02: '亲亲~信用贷提前结清不收取额外手续费，仅需偿还剩余本金及截至结清日的应付利息，已结清部分利息不再计收。可在「信用贷 APP-我的账单-提前结清」查看实时结清金额。',
};

const TYPE_FILTERS: { value: 'all' | BadReason; label: string }[] = [
  { value: 'all', label: '全部类型' }, ...REASONS.map(r => ({ value: r, label: r })),
];

export default function Badcase() {
  const [statusFilter, setStatusFilter] = useState<BadcaseStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | BadReason>('all');
  const [rows, setRows] = useState<Badcase[]>(ROWS);
  const [detail, setDetail] = useState<Badcase | null>(null);
  const [fixing, setFixing] = useState<Badcase | null>(null);
  const [backfilling, setBackfilling] = useState(false);

  const counts = useMemo(() => ({
    total: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    fixed: rows.filter(r => r.status === 'fixed').length,
    ignored: rows.filter(r => r.status === 'ignored').length,
  }), [rows]);

  const filtered = useMemo(() => rows.filter(r =>
    (statusFilter === null || r.status === statusFilter) &&
    (typeFilter === 'all' || r.reason === typeFilter)
  ), [rows, statusFilter, typeFilter]);

  // ─── 状态流转 ──────────────────────────────────────────────────────────────
  const setStatus = (id: string, status: BadcaseStatus) =>
    setRows(rs => rs.map(r => r.id === id ? { ...r, status } : r));

  const markFixed = (bc: Badcase) => {
    setStatus(bc.id, 'fixed'); setDetail(null); setFixing(null);
    toast('已标记已修复 · 该 badcase 已回灌 QA 知识库', 'success');
  };
  const ignore = (bc: Badcase) => { setStatus(bc.id, 'ignored'); setDetail(null); toast('已忽略该 badcase', 'info'); };
  const unignore = (bc: Badcase) => { setStatus(bc.id, 'pending'); toast('已撤销忽略 · 重新进入待处理', 'info'); };
  const openFix = (bc: Badcase) => { setDetail(null); setFixing(bc); };
  const confirmFixQA = (bc: Badcase) => {
    setStatus(bc.id, 'fixed'); setFixing(null);
    toast('草拟 QA 已提交 · 待「知识运营 林婉清」审核发布', 'success');
  };

  // 意图回填（模拟后台异步任务）
  const runBackfill = () => {
    if (backfilling) return;
    setBackfilling(true);
    toast('意图回填任务已提交 · 后台批量补全中…', 'info');
    setTimeout(() => {
      setBackfilling(false);
      toast(`意图回填完成 · ${counts.total} 条 badcase 三级意图已对齐意图树`, 'success');
    }, 2200);
  };

  // ─── KPI 卡（可点筛选）─────────────────────────────────────────────────────
  const kpis: { key: BadcaseStatus | 'total'; label: string; val: number; tone: string; icon: React.ReactNode }[] = [
    { key: 'total', label: 'Badcase 总数', val: counts.total, tone: 'var(--gold)', icon: <ThumbsDown size={16} /> },
    { key: 'pending', label: '待处理', val: counts.pending, tone: 'var(--danger)', icon: <MessageSquareWarning size={16} /> },
    { key: 'fixed', label: '已修复', val: counts.fixed, tone: 'var(--success)', icon: <CheckCircle2 size={16} /> },
    { key: 'ignored', label: '已忽略', val: counts.ignored, tone: 'var(--text-3)', icon: <EyeOff size={16} /> },
  ];
  const isActive = (key: BadcaseStatus | 'total') => key === 'total' ? statusFilter === null : statusFilter === key;
  const clickKpi = (key: BadcaseStatus | 'total') => {
    if (key === 'total') { setStatusFilter(null); return; }
    setStatusFilter(s => s === key ? null : key);
  };

  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s;

  // ─── 表列（10 列）──────────────────────────────────────────────────────────
  const cols: Col<Badcase>[] = [
    { key: 'query', header: '用户原始问题', width: 230, render: r => <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{trunc(r.query, 22)}</span> },
    { key: 'answer', header: '实际回复', width: 200, render: r => <span className="text-3">{trunc(r.answer, 20)}</span> },
    { key: 'replyType', header: '回复来源', width: 92, render: r => <span className="tag" style={{ color: SRC_TONE[r.replyType], borderColor: `color-mix(in srgb, ${SRC_TONE[r.replyType]} 30%, transparent)` }}>{r.replyType}</span> },
    { key: 'reason', header: '问题类型', width: 100, render: r => <span className="badge" style={{ background: `color-mix(in srgb, ${REASON_TONE[r.reason]} 14%, transparent)`, color: REASON_TONE[r.reason] }}>{r.reason}</span> },
    { key: 'l1', header: '一级意图', width: 92, render: r => <span className="t-small text-2">{r.l1}</span> },
    { key: 'l2', header: '二级意图', width: 92, render: r => <span className="t-small text-3">{r.l2}</span> },
    { key: 'l3', header: '三级意图', width: 96, render: r => <span className="t-small text-3">{r.l3}</span> },
    { key: 'time', header: '发生时间', width: 104, sortable: true, sortAccessor: r => r.time, render: r => <span className="mono t-small text-3">{r.time}</span> },
    { key: 'status', header: '处理状态', width: 88, sortable: true, sortAccessor: r => r.status, render: r => <BadcaseBadge status={r.status} /> },
    {
      key: 'op', header: '操作', width: 168, render: r => (
        <span className="row gap-1" onClick={e => e.stopPropagation()}>
          <button className="btn btn-subtle btn-sm" onClick={() => setDetail(r)}>查看</button>
          {r.status === 'pending' && <>
            <button className="btn btn-sm" style={{ background: 'var(--gold-glow)', color: 'var(--gold)', border: '1px solid var(--hairline-strong)' }} onClick={() => openFix(r)}>修复QA</button>
            <button className="btn btn-subtle btn-sm" onClick={() => ignore(r)}>忽略</button>
          </>}
          {r.status === 'ignored' && <button className="btn btn-subtle btn-sm" onClick={() => unignore(r)}><RotateCcw size={12} />撤销忽略</button>}
        </span>
      ),
    },
  ];

  // 详情键值行
  const kv = (label: string, val: React.ReactNode) => (
    <div className="row" style={{ gap: 14, padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}>
      <span className="t-small text-3" style={{ width: 76, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, color: 'var(--text-1)', fontSize: 13.5, lineHeight: 1.55 }}>{val}</span>
    </div>
  );

  return (
    <div className="page">
      <PageHeader
        title="Badcase 运营"
        subtitle="点踩负反馈聚合 · 根因分析 · 快捷修复回灌 QA · badcase→QA→知识库飞轮"
        actions={
          <button className="btn btn-ghost" disabled={backfilling} onClick={runBackfill}>
            {backfilling ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Sparkles size={14} />}
            {backfilling ? '回填中…' : '意图回填'}
          </button>
        }
      />

      {/* 4 紧凑 KPI 卡 · 点击按状态筛选 */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
        {kpis.map((k, i) => {
          const active = isActive(k.key);
          return (
            <Card
              key={k.key}
              onClick={() => clickKpi(k.key)}
              className={`card-hover reveal reveal-${i + 1}`}
              style={{
                cursor: 'pointer',
                borderColor: active ? 'var(--gold)' : undefined,
                boxShadow: active ? '0 0 0 1px var(--gold) inset, 0 0 0 4px var(--gold-glow)' : undefined,
                background: active ? 'color-mix(in srgb, var(--gold) 6%, var(--surface-1))' : undefined,
                transition: 'all .2s var(--ease)',
              }}
            >
              <div className="row spread" style={{ marginBottom: 6 }}>
                <span className="label">{k.label}</span>
                <span style={{ color: active ? 'var(--gold)' : k.tone, opacity: active ? 1 : 0.8 }}>{k.icon}</span>
              </div>
              <div className="kpi-value tnum" style={{ color: active ? 'var(--gold)' : undefined }}>{k.val}</div>
            </Card>
          );
        })}
      </div>

      {/* 筛选条 */}
      <Toolbar>
        <select
          className="input" style={{ minWidth: 132 }} value={statusFilter ?? 'all'}
          onChange={e => setStatusFilter(e.target.value === 'all' ? null : e.target.value as BadcaseStatus)}
        >
          <option value="all">全部状态</option>
          <option value="pending">待处理</option>
          <option value="fixed">已修复</option>
          <option value="ignored">已忽略</option>
        </select>
        <select
          className="input" style={{ minWidth: 132 }} value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as 'all' | BadReason)}
        >
          {TYPE_FILTERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <span className="row gap-1 t-small text-3" style={{ marginLeft: 'auto' }}>
          <ListChecks size={13} />命中 {filtered.length} / {rows.length} 条
        </span>
      </Toolbar>

      {/* DataTable 10 列 */}
      <Card className="reveal card-pad-0">
        <DataTable
          cols={cols}
          rows={filtered}
          rowKey={r => r.id}
          onRow={r => setDetail(r)}
          defaultSort={{ key: 'time', dir: 'desc' }}
          empty={{ icon: <ThumbsDown size={32} />, title: '无匹配 badcase', desc: '调整筛选条件，或当前状态下暂无点踩记录' }}
        />
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Badcase 详情"
        sub={detail ? `${detail.id} · 会话 ${detail.sessionId}` : undefined}
        width={480}
        footer={detail && (
          detail.status === 'pending' ? <>
            <button className="btn btn-subtle" onClick={() => ignore(detail)}><EyeOff size={14} />忽略</button>
            <button className="btn btn-subtle" onClick={() => markFixed(detail)}><CheckCircle2 size={14} />标记已修复</button>
            <button className="btn btn-primary" onClick={() => openFix(detail)}><Wrench size={14} />修复 QA</button>
          </> : detail.status === 'ignored' ? (
            <button className="btn btn-subtle" onClick={() => unignore(detail)}><RotateCcw size={14} />撤销忽略</button>
          ) : (
            <span className="row gap-1 t-small" style={{ color: 'var(--success)' }}><CheckCircle2 size={14} />已修复并回灌 QA</span>
          )
        )}
      >
        {detail && (
          <div className="col" style={{ gap: 16 }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span className="row gap-1 t-small text-3"><Eye size={13} />状态</span>
              <BadcaseBadge status={detail.status} />
              <span className="tag" style={{ color: SRC_TONE[detail.replyType], borderColor: `color-mix(in srgb, ${SRC_TONE[detail.replyType]} 30%, transparent)` }}>{detail.replyType}</span>
            </div>

            {/* 用户问题气泡 */}
            <div>
              <div className="row gap-1 section-label" style={{ marginBottom: 8 }}><MessageSquareWarning size={13} style={{ color: 'var(--danger)' }} />用户问题</div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', padding: '12px 14px', fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6 }}>{detail.query}</div>
            </div>

            {/* 机器人回复气泡 */}
            <div>
              <div className="row gap-1 section-label" style={{ marginBottom: 8 }}><BotMessageSquare size={13} style={{ color: 'var(--gold)' }} />机器人回复（被点踩）</div>
              <div style={{ background: 'color-mix(in srgb, var(--danger) 6%, var(--surface-2))', border: '1px solid color-mix(in srgb, var(--danger) 22%, transparent)', borderRadius: 'var(--r-md)', padding: '12px 14px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{detail.answer}</div>
            </div>

            {/* 结构化字段 */}
            <div>
              {kv('问题类型', <span className="badge" style={{ background: `color-mix(in srgb, ${REASON_TONE[detail.reason]} 14%, transparent)`, color: REASON_TONE[detail.reason] }}>{detail.reason}</span>)}
              {kv('用户意图', <span className="row gap-1 wrap">
                <span className="chip">{detail.l1}</span><span className="text-3">›</span>
                <span className="chip">{detail.l2}</span><span className="text-3">›</span>
                <span className="chip">{detail.l3}</span>
              </span>)}
              {kv('回复来源', detail.replyType)}
              {kv('发生时间', <span className="mono">{detail.time}</span>)}
            </div>
          </div>
        )}
      </Drawer>

      {/* 修复 QA 弹窗（预填草拟 QA） */}
      <Modal
        open={!!fixing}
        onClose={() => setFixing(null)}
        title="修复 QA · 回灌知识库"
        sub={fixing ? `根据 badcase ${fixing.id} 草拟标准 QA，提交质检发布` : undefined}
        width={560}
        footer={fixing && <>
          <button className="btn btn-subtle" onClick={() => setFixing(null)}>取消</button>
          <button className="btn btn-primary" onClick={() => confirmFixQA(fixing)}><Wrench size={14} />提交草拟 QA</button>
        </>}
      >
        {fixing && (
          <div className="col" style={{ gap: 16 }}>
            <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
              <span className="badge" style={{ background: `color-mix(in srgb, ${REASON_TONE[fixing.reason]} 14%, transparent)`, color: REASON_TONE[fixing.reason] }}>{fixing.reason}</span>
              <span className="chip">{fixing.l1}</span>
              <span className="text-3" style={{ fontSize: 12 }}>›</span>
              <span className="chip">{fixing.l2}</span>
            </div>

            <div className="col" style={{ gap: 7 }}>
              <label className="section-label">标准问题（Q）</label>
              <input className="input" defaultValue={fixing.query} style={{ width: '100%' }} />
            </div>

            <div className="col" style={{ gap: 7 }}>
              <label className="section-label">建议回答（A · AI 已根据根因草拟）</label>
              <textarea
                className="input"
                defaultValue={QA_SUGGEST[fixing.id] ?? `亲亲~针对「${fixing.query}」，建议补充准确、有温度的标准答复，避免「${fixing.reason}」问题。请运营据实补全后提交质检。`}
                style={{ width: '100%', minHeight: 132, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
              />
            </div>

            <div className="row gap-2" style={{ padding: '11px 13px', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', alignItems: 'flex-start' }}>
              <Sparkles size={15} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
              <span className="t-small text-3" style={{ lineHeight: 1.6 }}>
                提交后将进入「待发布」，由知识运营 <span className="text-2">林婉清</span> 审核生效，并自动关联本 badcase 形成 <span className="gold">badcase → QA → 知识库</span> 数据飞轮闭环。
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
