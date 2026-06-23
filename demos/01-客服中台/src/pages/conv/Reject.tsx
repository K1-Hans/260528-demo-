import { useMemo, useState } from 'react';
import { Download, Plus, AlertCircle } from 'lucide-react';
import { PageHeader, StatCard, SectionTitle } from '../../components/ui';
import { DataTable, Pagination, type Col } from '../../components/DataTable';
import { RejectBadge, Toolbar, Modal, toast } from '../../components/kit';
import { INTENT_L1 } from '../../lib/mockData';
import { fmt } from '../../lib/hooks';
import type { Reject, RejectStatus } from '../../types';

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_REJECTS: Reject[] = [
  { id: 'r01', query: '提前结清手续费怎么算', l1: '费用相关', l2: '结清费用', l3: '提前还款', topScore: 0.31, count: 284, lastTime: '2025-06-16 09:12', status: 'pending' },
  { id: 'r02', query: '房贷会查我这个吗', l1: '申请咨询', l2: '征信查询', l3: '房贷影响', topScore: 0.28, count: 197, lastTime: '2025-06-16 11:34', status: 'pending' },
  { id: 'r03', query: '能不能延期一个月', l1: '还款相关', l2: '延期还款', l3: '申请延期', topScore: 0.22, count: 176, lastTime: '2025-06-16 08:55', status: 'added_qa' },
  { id: 'r04', query: '我的优惠券怎么用不了', l1: '营销活动', l2: '优惠券', l3: '使用失败', topScore: 0.19, count: 152, lastTime: '2025-06-15 17:42', status: 'pending' },
  { id: 'r05', query: '利率是多少啊', l1: '产品与信息', l2: '利率查询', l3: '产品利率', topScore: 0.41, count: 143, lastTime: '2025-06-16 10:08', status: 'added_qa' },
  { id: 'r06', query: '自动扣款失败了怎么办', l1: '还款相关', l2: '扣款失败', l3: '处理方式', topScore: 0.17, count: 138, lastTime: '2025-06-15 14:22', status: 'pending' },
  { id: 'r07', query: '我被催收了是不是会影响子女', l1: '催收相关', l2: '催收疑虑', l3: '家人影响', topScore: 0.12, count: 129, lastTime: '2025-06-14 16:11', status: 'pending' },
  { id: 'r08', query: '二次借款额度怎么提升', l1: '申请咨询', l2: '额度提升', l3: '复贷策略', topScore: 0.23, count: 117, lastTime: '2025-06-15 09:30', status: 'ignored' },
  { id: 'r09', query: '账单日是哪天', l1: '还款相关', l2: '账单日查询', l3: '日期确认', topScore: 0.38, count: 104, lastTime: '2025-06-16 13:45', status: 'added_qa' },
  { id: 'r10', query: '逾期之后还能再借吗', l1: '申请咨询', l2: '逾期影响', l3: '复借资格', topScore: 0.09, count: 98, lastTime: '2025-06-15 11:18', status: 'pending' },
  { id: 'r11', query: '可以用别人的银行卡还款吗', l1: '还款相关', l2: '还款方式', l3: '他人代还', topScore: 0.14, count: 87, lastTime: '2025-06-14 08:42', status: 'pending' },
  { id: 'r12', query: '借款记录能删除吗', l1: '信息维护', l2: '记录查询', l3: '历史删除', topScore: 0.08, count: 79, lastTime: '2025-06-13 19:03', status: 'pending' },
  { id: 'r13', query: '有没有减免违约金的政策', l1: '费用相关', l2: '违约金', l3: '减免申请', topScore: 0.11, count: 73, lastTime: '2025-06-15 15:27', status: 'ignored' },
  { id: 'r14', query: '我的合同在哪里看', l1: '业务办理', l2: '合同查阅', l3: '电子合同', topScore: 0.45, count: 68, lastTime: '2025-06-12 10:44', status: 'added_qa' },
  { id: 'r15', query: '还款之后多久能再借', l1: '申请咨询', l2: '复借周期', l3: '等待时间', topScore: 0.27, count: 61, lastTime: '2025-06-14 20:15', status: 'pending' },
  { id: 'r16', query: '分期手续费是固定的还是浮动的', l1: '费用相关', l2: '手续费', l3: '计费规则', topScore: 0.16, count: 54, lastTime: '2025-06-13 14:38', status: 'pending' },
];

type Period = '7d' | 'today' | '30d';
type StatusFilter = 'all' | RejectStatus;

const PERIOD_LABELS: Record<Period, string> = { '7d': '近 7 日', today: '今日', '30d': '近 30 日' };
const STATUS_LABELS: Record<StatusFilter, string> = { all: '全部状态', pending: '待处理', added_qa: '已新增 QA', ignored: '已忽略' };

// ─── 新增 QA Modal ─────────────────────────────────────────────────────────────
function AddQAModal({ row, onClose }: { row: Reject; onClose: () => void }) {
  const [question, setQuestion] = useState(row.query);
  const [answer, setAnswer] = useState('');
  const [l1, setL1] = useState(row.l1);

  function submit() {
    if (!answer.trim()) { toast('请填写标准回答', 'warn'); return; }
    toast(`已新增 QA「${question.slice(0, 12)}…」· 等待发布审核`, 'success');
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="新增至 QA 知识库"
      sub={`来源：拒识记录 · 出现 ${row.count} 次`}
      width={560}
      footer={
        <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>取消</button>
          <button className="btn btn-primary btn-sm" onClick={submit}>提交发布</button>
        </div>
      }
    >
      <div className="col gap-3" style={{ padding: '16px 0' }}>
        <div className="col gap-2">
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.02em' }}>用户问题</label>
          <input
            className="input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
        </div>
        <div className="col gap-2">
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.02em' }}>标准回答 <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea
            className="input"
            rows={4}
            placeholder="输入机器人回答内容，建议简洁口语化……"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>
        <div className="row gap-3">
          <div className="col gap-2 flex-1">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.02em' }}>一级意图</label>
            <select className="input" value={l1} onChange={e => setL1(e.target.value)}>
              {INTENT_L1.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="col gap-2 flex-1">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.02em' }}>二级意图</label>
            <input className="input" defaultValue={row.l2} placeholder="自动回填，可修改" />
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: 'color-mix(in srgb, var(--warning) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 22%, transparent)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--text-2)' }}>
          提交后进入「待发布」状态，由知识运营审核后生效
        </div>
      </div>
    </Modal>
  );
}

// ─── 主页面 ─────────────────────────────────────────────────────────────────────
export default function Reject() {
  const [period, setPeriod] = useState<Period>('7d');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const [addQARow, setAddQARow] = useState<Reject | null>(null);

  // 本地状态模拟操作反馈
  const [overrides, setOverrides] = useState<Record<string, RejectStatus>>({});

  const rows = useMemo(() => {
    return MOCK_REJECTS
      .map(r => overrides[r.id] ? { ...r, status: overrides[r.id] } : r)
      .filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (intentFilter !== 'all' && r.l1 !== intentFilter) return false;
        return true;
      });
  }, [statusFilter, intentFilter, overrides]);

  const pendingCount = useMemo(() => MOCK_REJECTS.filter(r => (overrides[r.id] ?? r.status) === 'pending').length, [overrides]);
  const totalCount7d = rows.reduce((s, r) => s + r.count, 0);
  const addedQACount = MOCK_REJECTS.filter(r => (overrides[r.id] ?? r.status) === 'added_qa').length;

  // period 影响数字展示（mock 差分）
  const periodMultiplier = period === 'today' ? 0.14 : period === '30d' ? 4.3 : 1;
  const displayTotal = Math.round(totalCount7d * periodMultiplier);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  function handleIgnore(row: Reject) {
    setOverrides(o => ({ ...o, [row.id]: 'ignored' }));
    toast(`已忽略「${row.query.slice(0, 12)}…」`, 'info');
  }

  function handleAddQA(row: Reject) {
    setAddQARow(row);
  }

  function handleAddQAClose() {
    if (addQARow) {
      setOverrides(o => ({ ...o, [addQARow.id]: 'added_qa' }));
    }
    setAddQARow(null);
  }

  function handleExport() {
    toast('CSV 已生成，正在下载…', 'success');
  }

  function handleRefill() {
    toast('意图回填任务已触发，后台运行中…', 'info');
  }

  const cols: Col<Reject>[] = [
    {
      key: 'query',
      header: '用户原始问题',
      width: '28%',
      render: row => (
        <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{row.query}</span>
      ),
    },
    {
      key: 'l1',
      header: '一级意图',
      width: '11%',
      render: row => <span className="chip">{row.l1}</span>,
    },
    {
      key: 'l2',
      header: '二级意图',
      width: '11%',
      render: row => <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{row.l2}</span>,
    },
    {
      key: 'l3',
      header: '三级意图',
      width: '10%',
      render: row => <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{row.l3}</span>,
    },
    {
      key: 'count',
      header: '最近发生 / 次数',
      width: '16%',
      sortable: true,
      sortAccessor: r => r.count,
      num: true,
      render: row => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 2 }}>{row.lastTime}</div>
          <div className="tnum" style={{ fontWeight: 700, color: row.count > 150 ? 'var(--danger)' : 'var(--text-1)' }}>
            {fmt(row.count)} 次
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: '状态 / 操作',
      width: '20%',
      render: row => {
        const status = overrides[row.id] ?? row.status;
        if (status === 'added_qa') {
          return <RejectBadge status="added_qa" />;
        }
        if (status === 'ignored') {
          return <RejectBadge status="ignored" />;
        }
        // pending
        return (
          <div className="row gap-2">
            <button
              className="btn btn-primary btn-sm"
              style={{ fontSize: 12, padding: '3px 10px' }}
              onClick={e => { e.stopPropagation(); handleAddQA(row); }}
            >
              <Plus size={12} style={{ marginRight: 3 }} />新增至 QA
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12, padding: '3px 8px', color: 'var(--text-3)' }}
              onClick={e => { e.stopPropagation(); handleIgnore(row); }}
            >
              忽略
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="拒识运营"
        subtitle="未命中知识库的问题聚合 · 找盲区补 QA · 目标拒识率 < 5%"
        actions={
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm" onClick={handleRefill}>意图回填</button>
            <button className="btn btn-ghost btn-sm" onClick={handleExport}>
              <Download size={14} style={{ marginRight: 4 }} />导出 CSV
            </button>
          </div>
        }
      />

      {/* KPI 带 */}
      <div className="row gap-3 wrap reveal" style={{ marginBottom: 20 }}>
        <div
          style={{ flex: '1 1 180px', cursor: 'pointer' }}
          onClick={() => setStatusFilter(s => s === 'pending' ? 'all' : 'pending')}
        >
          <StatCard
            label="昨日拒识次数"
            raw={2847}
            unit="次"
            change={12.4}
            icon={<AlertCircle size={16} />}
            delayClass="reveal-1"
          />
          <div style={{
            marginTop: -8, padding: '6px 14px 10px',
            background: statusFilter === 'pending'
              ? 'color-mix(in srgb, var(--danger) 10%, var(--surface-1))'
              : 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderTop: 'none',
            borderRadius: '0 0 var(--r-md) var(--r-md)',
            fontSize: 12, color: 'var(--danger)', fontWeight: 600,
          }}>
            待处理 {pendingCount} 条
          </div>
        </div>

        <div
          style={{ flex: '1 1 180px', cursor: 'pointer' }}
          onClick={() => setPeriod(p => p === '7d' ? 'today' : '7d')}
        >
          <StatCard
            label="近 7 日拒识问题"
            raw={displayTotal}
            unit="次"
            change={-3.1}
            spark={[420, 380, 310, 390, 355, 298, 284]}
            delayClass="reveal-2"
          />
          <div style={{
            marginTop: -8, padding: '6px 14px 10px',
            background: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderTop: 'none',
            borderRadius: '0 0 var(--r-md) var(--r-md)',
            fontSize: 12, color: 'var(--warning)', fontWeight: 600,
          }}>
            目标拒识率 &lt;5%
          </div>
        </div>

        <div
          style={{ flex: '1 1 180px', cursor: 'pointer' }}
          onClick={() => setStatusFilter(s => s === 'added_qa' ? 'all' : 'added_qa')}
        >
          <StatCard
            label="近 7 日新增 QA"
            raw={addedQACount + 31}
            unit="条"
            change={22.0}
            spark={[2, 3, 5, 8, 6, 7, addedQACount + 5]}
            delayClass="reveal-3"
          />
          <div style={{
            marginTop: -8, padding: '6px 14px 10px',
            background: statusFilter === 'added_qa'
              ? 'color-mix(in srgb, var(--success) 10%, var(--surface-1))'
              : 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderTop: 'none',
            borderRadius: '0 0 var(--r-md) var(--r-md)',
            fontSize: 12, color: 'var(--success)', fontWeight: 600,
          }}>
            来自拒识转化
          </div>
        </div>
      </div>

      {/* 筛选条 */}
      <Toolbar>
        <select
          className="input"
          style={{ width: 120 }}
          value={period}
          onChange={e => { setPeriod(e.target.value as Period); setPage(1); }}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map(k => (
            <option key={k} value={k}>{PERIOD_LABELS[k]}</option>
          ))}
        </select>

        <select
          className="input"
          style={{ width: 140 }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
        >
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(k => (
            <option key={k} value={k}>{STATUS_LABELS[k]}</option>
          ))}
        </select>

        <select
          className="input"
          style={{ width: 150 }}
          value={intentFilter}
          onChange={e => { setIntentFilter(e.target.value); setPage(1); }}
        >
          <option value="all">全部意图</option>
          {INTENT_L1.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </Toolbar>

      {/* 数据表 */}
      <SectionTitle right={
        <span className="text-3" style={{ fontSize: 12 }}>
          共 <span className="tnum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{rows.length}</span> 条 · 按出现次数降序
        </span>
      }>
        拒识问题列表
      </SectionTitle>

      <DataTable<Reject>
        cols={cols}
        rows={paged}
        rowKey={r => r.id}
        defaultSort={{ key: 'count', dir: 'desc' }}
        empty={{ icon: <AlertCircle size={24} />, title: '暂无拒识问题', desc: '知识库覆盖率良好，继续保持' }}
      />

      <Pagination
        page={page}
        total={rows.length}
        pageSize={PAGE_SIZE}
        onPage={setPage}
      />

      {/* 新增 QA Modal */}
      {addQARow && (
        <AddQAModal row={addQARow} onClose={handleAddQAClose} />
      )}
    </div>
  );
}
