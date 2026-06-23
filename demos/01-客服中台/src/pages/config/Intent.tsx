import { useState, useMemo, useCallback } from 'react';
import { Search, ChevronRight, ChevronDown, FolderOpen, Folder, Hash } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, cssVar, chartPalette } from '../../lib/chartTheme';
import { INTENT_L1 } from '../../lib/mockData';
import type { IntentNode } from '../../types';

// ─── 完整三级意图树 mock ────────────────────────────────────────────────────────
const INTENT_TREE: IntentNode[] = [
  {
    name: '还款相关', count: 3739,
    note: '还款全链路咨询，命中率最高一级意图',
    children: [
      {
        name: '账单信息查询', count: 1421,
        note: '账单详情、历史账单、未结清金额等',
        children: [
          { name: '还款结果查询', count: 412, note: '还款是否到账、到账时效' },
          { name: '还款银行卡查询', count: 318, note: '绑定卡信息、换卡影响' },
          { name: '已结清账单查询', count: 287, note: '历史还款记录、结清证明' },
          { name: '未结清账单查询', count: 404, note: '当前账单金额、到期日' },
        ],
      },
      {
        name: '还款咨询', count: 1057,
        note: '还款方式、渠道、时效等咨询',
        children: [
          { name: '还款方式咨询', count: 389, note: 'APP 还款 / 网银 / 代扣等' },
          { name: '还款时间咨询', count: 276, note: '还款截止日、宽限期' },
          { name: '还款渠道咨询', count: 211, note: '支持哪些银行、平台' },
          { name: '逾期后还款咨询', count: 181, note: '逾期后如何继续还款' },
        ],
      },
      {
        name: '存对公还款', count: 682,
        note: '对公账户还款专项咨询',
        children: [
          { name: '对公账户信息', count: 298, note: '对公收款账号、户名、开户行' },
          { name: '对公还款到账', count: 224, note: '对公还款到账时效' },
          { name: '对公还款凭证', count: 160, note: '汇款回执、到账确认' },
        ],
      },
      {
        name: '提前清贷', count: 579,
        note: '提前全额结清贷款',
        children: [
          { name: '提前清贷条件', count: 218, note: '是否可提前还、最低还款期' },
          { name: '提前清贷费用', count: 201, note: '违约金、手续费计算' },
          { name: '提前清贷流程', count: 160, note: '如何申请提前结清' },
        ],
      },
    ],
  },
  {
    name: '申请咨询', count: 3459,
    note: '贷款申请全流程意图，转化关键路径',
    children: [
      {
        name: '贷款咨询', count: 814,
        note: '一般贷款产品咨询',
        children: [
          { name: '贷款产品介绍', count: 312, note: '信用贷产品特征、利率区间' },
          { name: '申请条件咨询', count: 289, note: '年龄、征信、芝麻分等要求' },
          { name: '贷款合规性咨询', count: 213, note: '借贷合法合规相关咨询' },
        ],
      },
      {
        name: '额度获取咨询', count: 727,
        note: '额度开通、提额、恢复等',
        children: [
          { name: '首次获取额度', count: 298, note: '如何开通贷款额度' },
          { name: '额度提升咨询', count: 241, note: '提额条件、什么时候可提额' },
          { name: '额度恢复咨询', count: 188, note: '额度为何下降、如何恢复' },
        ],
      },
      {
        name: '放款时效', count: 651,
        note: '放款到账时间、工作日等',
        children: [
          { name: '放款到账时效', count: 311, note: '一般多久到账' },
          { name: '非工作日放款', count: 199, note: '节假日是否放款' },
          { name: '加急放款咨询', count: 141, note: '是否有加急渠道' },
        ],
      },
      {
        name: '放款结果', count: 589,
        note: '放款成功/失败原因查询',
        children: [
          { name: '放款成功确认', count: 267, note: '放款是否到账查询' },
          { name: '放款失败原因', count: 211, note: '失败原因、如何重新申请' },
          { name: '放款金额差异', count: 111, note: '到账金额与申请不一致' },
        ],
      },
      {
        name: '贷款解约', count: 391,
        note: '申请阶段撤销、解约',
        children: [
          { name: '放款前解约', count: 219, note: '签约后放款前是否可取消' },
          { name: '解约费用', count: 172, note: '解约是否收费' },
        ],
      },
      {
        name: '预约借款', count: 287,
        note: '预约功能相关咨询',
        children: [
          { name: '预约功能介绍', count: 162, note: '预约借款的含义与流程' },
          { name: '预约取消咨询', count: 125, note: '如何取消已预约' },
        ],
      },
    ],
  },
  {
    name: '产品与信息', count: 852,
    note: '产品功能、规则、账户信息咨询',
    children: [
      {
        name: '产品规则咨询', count: 187,
        note: '费率、期限、还款方式等规则',
        children: [
          { name: '年化利率说明', count: 89, note: 'APR/IRR 计算方式说明' },
          { name: '还款方式说明', count: 98, note: '等额本息 / 等额本金区别' },
        ],
      },
      {
        name: 'APP 功能咨询', count: 156,
        note: '信用贷 APP 操作功能',
        children: [
          { name: 'APP 下载安装', count: 71, note: 'APP 下载渠道、更新版本' },
          { name: 'APP 操作指引', count: 85, note: '功能入口、操作步骤' },
        ],
      },
      {
        name: '征信查询说明', count: 134,
        note: '征信上报规则与查询说明',
        children: [
          { name: '征信上报规则', count: 79, note: '逾期上报时间与内容' },
          { name: '征信查询渠道', count: 55, note: '如何查询本人征信' },
        ],
      },
      {
        name: '会员权益咨询', count: 112,
        note: '会员产品、权益、退费',
        children: [
          { name: '会员权益介绍', count: 64, note: '会员有哪些权益' },
          { name: '会员退费咨询', count: 48, note: '如何申请退费、退费时效' },
        ],
      },
      {
        name: '账户安全咨询', count: 143,
        note: '密码、验证、账号安全',
        children: [
          { name: '忘记密码', count: 88, note: '找回 / 重置密码流程' },
          { name: '账号被冻结', count: 55, note: '解冻方式与原因说明' },
        ],
      },
      {
        name: '人工客服咨询', count: 120,
        note: '转人工时机与服务时间咨询',
        children: [
          { name: '服务时间咨询', count: 67, note: '人工客服上班时间' },
          { name: '如何转人工', count: 53, note: '转人工渠道与方式' },
        ],
      },
    ],
  },
  {
    name: '催收相关', count: 133,
    note: '催收行为合规管控，高风险意图',
    children: [
      {
        name: '协商还款', count: 41,
        note: '申请延期、分期协商',
        children: [
          { name: '申请延期还款', count: 24, note: '能否申请宽限期' },
          { name: '分期协商', count: 17, note: '能否分期偿还逾期款' },
        ],
      },
      {
        name: '投诉催收', count: 32,
        note: '投诉催收人员行为',
        children: [
          { name: '投诉催收频次', count: 19, note: '一天多次来电投诉' },
          { name: '投诉催收态度', count: 13, note: '催收人员言语失当投诉' },
        ],
      },
      {
        name: '核实催收信息', count: 27,
        note: '确认来电/短信是否为官方催收',
        children: [
          { name: '核实来电真实性', count: 16, note: '疑似冒充催收电话' },
          { name: '核实短信真实性', count: 11, note: '短信是否为官方发送' },
        ],
      },
      {
        name: '要求停催', count: 21,
        note: '明确要求停止催收联系',
        children: [
          { name: '要求停止电话', count: 13, note: '拒绝接受催收电话' },
          { name: '要求停止短信', count: 8, note: '拒绝接收催收短信' },
        ],
      },
      {
        name: '特殊场景', count: 12,
        note: '失联 / 特殊困难等特殊催收场景',
        children: [
          { name: '特殊困难申报', count: 7, note: '大病 / 失业等特殊减免申请' },
          { name: '联系人核实', count: 5, note: '紧急联系人咨询' },
        ],
      },
    ],
  },
  {
    name: '营销活动', count: 874,
    note: '活动参与、优惠券、返现等营销咨询',
    children: [
      {
        name: '活动规则咨询', count: 231,
        note: '活动参与条件、时间、奖励',
        children: [
          { name: '活动资格查询', count: 118, note: '我是否满足参与条件' },
          { name: '活动奖励说明', count: 113, note: '奖励金额与到账方式' },
        ],
      },
      {
        name: '优惠券使用', count: 198,
        note: '优惠券领取、使用规则',
        children: [
          { name: '优惠券领取', count: 107, note: '如何领取优惠券' },
          { name: '优惠券使用规则', count: 91, note: '使用条件与有效期' },
        ],
      },
      {
        name: '返现奖励', count: 167,
        note: '返现到账查询与规则',
        children: [
          { name: '返现到账查询', count: 98, note: '返现何时到账' },
          { name: '返现计算规则', count: 69, note: '返现金额如何计算' },
        ],
      },
      {
        name: '推荐有礼', count: 154,
        note: '邀请好友贷款奖励机制',
        children: [
          { name: '邀请码分享', count: 88, note: '如何获取并分享邀请码' },
          { name: '推荐奖励到账', count: 66, note: '好友成功后奖励何时发放' },
        ],
      },
      {
        name: '积分商城', count: 124,
        note: '积分获取与兑换',
        children: [
          { name: '积分获取方式', count: 69, note: '如何获取积分' },
          { name: '积分兑换规则', count: 55, note: '积分如何兑换商品 / 优惠' },
        ],
      },
    ],
  },
  {
    name: '费用相关', count: 181,
    note: '各类费用收取说明与投诉',
    children: [
      {
        name: '利息费用咨询', count: 89,
        note: '利率计算、总利息金额',
        children: [
          { name: '利率计算说明', count: 51, note: '日利率、月利率、年化对比' },
          { name: '总利息金额查询', count: 38, note: '这笔借款总共要还多少利息' },
        ],
      },
      {
        name: '违约金咨询', count: 56,
        note: '逾期罚息、违约金规则',
        children: [
          { name: '逾期罚息计算', count: 32, note: '逾期后每天罚息多少' },
          { name: '违约金减免', count: 24, note: '能否申请减免违约金' },
        ],
      },
      {
        name: '服务费咨询', count: 36,
        note: '会员费、服务费收取说明',
        children: [
          { name: '服务费说明', count: 21, note: '服务费收取标准与时机' },
          { name: '服务费退款', count: 15, note: '服务费能否退还' },
        ],
      },
    ],
  },
  {
    name: '业务办理', count: 233,
    note: '账户证明、合同、征信等业务申请',
    children: [
      {
        name: '结清证明', count: 56,
        note: '贷款结清证明开具',
        children: [
          { name: '申请结清证明', count: 33, note: '如何申请、需要多久' },
          { name: '结清证明用途', count: 23, note: '结清证明可用于哪些场合' },
        ],
      },
      {
        name: '合同调取', count: 48,
        note: '借款合同下载与查询',
        children: [
          { name: '合同下载', count: 29, note: '在哪里查看下载合同' },
          { name: '合同内容咨询', count: 19, note: '合同条款解读' },
        ],
      },
      {
        name: '征信相关业务', count: 41,
        note: '征信异议、修复申请',
        children: [
          { name: '征信异议申请', count: 24, note: '对征信记录有异议如何申请' },
          { name: '征信修复咨询', count: 17, note: '结清后多久消除逾期记录' },
        ],
      },
      {
        name: '账户注销', count: 37,
        note: '注销信用贷账户',
        children: [
          { name: '注销条件查询', count: 21, note: '注销账户需要满足哪些条件' },
          { name: '注销流程咨询', count: 16, note: '如何操作注销' },
        ],
      },
      {
        name: '发票开具', count: 29,
        note: '利息发票、服务费发票',
        children: [
          { name: '发票申请渠道', count: 17, note: '在哪里可以申请发票' },
          { name: '发票开具时效', count: 12, note: '发票多久可以到账' },
        ],
      },
      {
        name: '逾期还款证明', count: 22,
        note: '逾期情况说明证明',
        children: [
          { name: '逾期说明申请', count: 13, note: '需要逾期情况说明怎么办理' },
          { name: '逾期证明用途', count: 9, note: '逾期证明可用于银行贷款申请等' },
        ],
      },
    ],
  },
  {
    name: '信息维护', count: 592,
    note: '绑定卡、资料修改等账户信息管理',
    children: [
      {
        name: '换绑卡', count: 341,
        note: '更换还款/放款银行卡',
        children: [
          { name: '换绑还款卡', count: 198, note: '如何更换还款绑定卡' },
          { name: '换绑放款卡', count: 143, note: '如何更换放款到账卡' },
        ],
      },
      {
        name: '资料信息修改', count: 251,
        note: '手机号、身份证、联系地址等',
        children: [
          { name: '手机号变更', count: 112, note: '如何更换绑定手机号' },
          { name: '身份信息修改', count: 87, note: '身份证地址更新等' },
          { name: '紧急联系人修改', count: 52, note: '如何修改紧急联系人' },
        ],
      },
    ],
  },
  {
    name: '批量问题', count: 1329,
    note: '非特定意图的多问题合并，批量处理',
    children: [
      {
        name: '多意图混合', count: 612,
        note: '单条消息含多个独立意图',
        children: [
          { name: '账单+还款混合', count: 289, note: '同时询问账单和还款方式' },
          { name: '申请+费用混合', count: 201, note: '同时询问申请条件和利率' },
          { name: '其他多意图', count: 122, note: '其他多意图混合场景' },
        ],
      },
      {
        name: '重复追问', count: 447,
        note: '同一问题多次追问',
        children: [
          { name: '等待确认追问', count: 267, note: '未收到回复后重复发送' },
          { name: '不满意追问', count: 180, note: '对回复不满意再次追问' },
        ],
      },
      {
        name: '无效消息', count: 270,
        note: '表情包、乱码、误触等',
        children: [
          { name: '表情包消息', count: 145, note: '纯表情符号，无有效意图' },
          { name: '乱码误触消息', count: 125, note: '键盘乱码或误触发送' },
        ],
      },
    ],
  },
  {
    name: '自定义', count: 1561,
    note: '无法归类的特殊会话，路由至人工或特殊处理',
    children: [
      {
        name: '无效会话', count: 1561,
        note: '连接后无有效发言，超时关闭',
        children: [
          { name: '静默会话', count: 891, note: '接入后未发送任何消息' },
          { name: '测试会话', count: 412, note: '内部测试账号触发' },
          { name: '其他无效', count: 258, note: '其他无法处理的无效场景' },
        ],
      },
    ],
  },
];

// ─── L1 旭日图数据（条数分布）──────────────────────────────────────────────────
const L1_COUNTS: Record<string, number> = {
  还款相关: 3739, 申请咨询: 3459, 产品与信息: 852, 催收相关: 133,
  营销活动: 874, 费用相关: 181, 业务办理: 233, 信息维护: 592,
  批量问题: 1329, 自定义: 1561,
};

// ─── 颜色映射 ─────────────────────────────────────────────────────────────────
const L1_COLORS = [
  '#cf6b43', '#6088b0', '#c89034', '#7e9359',
  '#c77f6a', '#8aa07e', '#b85c3c', '#5f9a93',
  '#b08a4a', '#a87b86',
];

// ─── 工具函数 ──────────────────────────────────────────────────────────────────
function totalLeaves(node: IntentNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + totalLeaves(c), 0);
}

function matchesSearch(node: IntentNode, q: string): boolean {
  if (!q) return true;
  if (node.name.includes(q) || (node.note ?? '').includes(q)) return true;
  return (node.children ?? []).some(c => matchesSearch(c, q));
}

// ─── 单节点行组件 ──────────────────────────────────────────────────────────────
function IntentRow({
  node, depth, open, onToggle, highlight,
}: {
  node: IntentNode; depth: number; open: boolean; onToggle: () => void; highlight: string;
}) {
  const hasChildren = (node.children ?? []).length > 0;
  const indent = depth * 20;

  const name = highlight
    ? node.name.split(highlight).map((part, i, arr) =>
        i < arr.length - 1
          ? <span key={i}>{part}<mark key={`m${i}`} style={{ background: 'color-mix(in srgb, var(--gold) 32%, transparent)', color: 'var(--gold)', padding: '0 1px', borderRadius: 2 }}>{highlight}</mark></span>
          : <span key={i}>{part}</span>
      )
    : node.name;

  return (
    <div
      onClick={hasChildren ? onToggle : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: `7px 16px 7px ${16 + indent}px`,
        cursor: hasChildren ? 'pointer' : 'default',
        borderBottom: '1px solid var(--hairline)',
        background: depth === 0 ? 'var(--surface-1)' : depth === 1 ? 'var(--bg-base)' : 'transparent',
        transition: 'background 0.12s',
      }}
      className={hasChildren ? 'intent-row-hover' : ''}
    >
      {/* 折叠图标 */}
      <span style={{ width: 16, flexShrink: 0, color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
        {hasChildren
          ? (open
            ? <ChevronDown size={13} style={{ color: 'var(--gold)' }} />
            : <ChevronRight size={13} />)
          : <Hash size={10} style={{ opacity: 0.4 }} />}
      </span>

      {/* 文件夹 / 叶图标 */}
      <span style={{ flexShrink: 0, color: depth === 0 ? 'var(--gold)' : depth === 1 ? 'var(--c2)' : 'var(--text-3)' }}>
        {hasChildren
          ? (open ? <FolderOpen size={13} /> : <Folder size={13} />)
          : <span style={{ width: 13 }} />}
      </span>

      {/* 名称 */}
      <span style={{
        fontSize: depth === 0 ? 13 : 12,
        fontWeight: depth === 0 ? 600 : depth === 1 ? 500 : 400,
        color: depth === 0 ? 'var(--text-1)' : 'var(--text-2)',
        flex: 1, minWidth: 0,
      }}>
        {name}
      </span>

      {/* note */}
      {node.note && (
        <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.note}
        </span>
      )}

      {/* 条数 */}
      <span className="tnum" style={{
        fontSize: 12, fontWeight: 600,
        color: depth === 0 ? 'var(--gold)' : 'var(--text-2)',
        minWidth: 48, textAlign: 'right', flexShrink: 0,
      }}>
        {(node.count ?? 0).toLocaleString()}
      </span>

      {/* 深度标签 */}
      <span style={{
        fontSize: 10, padding: '2px 6px', borderRadius: 4,
        background: depth === 0
          ? 'color-mix(in srgb, var(--gold) 14%, transparent)'
          : depth === 1
          ? 'color-mix(in srgb, var(--c2) 12%, transparent)'
          : 'var(--surface-2)',
        color: depth === 0 ? 'var(--gold)' : depth === 1 ? 'var(--c2)' : 'var(--text-3)',
        minWidth: 28, textAlign: 'center', flexShrink: 0,
      }}>
        L{depth + 1}
      </span>
    </div>
  );
}

// ─── 递归树组件 ────────────────────────────────────────────────────────────────
function IntentBranch({
  node, depth, openSet, toggle, search,
}: {
  node: IntentNode; depth: number; openSet: Set<string>; toggle: (key: string) => void; search: string;
}) {
  const key = `${depth}::${node.name}`;
  const isOpen = openSet.has(key);
  const visible = matchesSearch(node, search);
  if (!visible) return null;

  return (
    <>
      <IntentRow node={node} depth={depth} open={isOpen} onToggle={() => toggle(key)} highlight={search} />
      {isOpen && (node.children ?? []).map(child => (
        <IntentBranch key={child.name} node={child} depth={depth + 1} openSet={openSet} toggle={toggle} search={search} />
      ))}
    </>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────
export default function Intent() {
  const [search, setSearch] = useState('');
  const [openSet, setOpenSet] = useState<Set<string>>(() => {
    // 默认展开所有 L1
    return new Set(INTENT_TREE.map(n => `0::${n.name}`));
  });

  const toggle = useCallback((key: string) => {
    setOpenSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // 搜索时自动展开所有含匹配结果的节点
  const effectiveOpenSet = useMemo(() => {
    if (!search) return openSet;
    const expanded = new Set<string>();
    function expand(node: IntentNode, depth: number) {
      const key = `${depth}::${node.name}`;
      if (matchesSearch(node, search)) {
        expanded.add(key);
        (node.children ?? []).forEach(c => expand(c, depth + 1));
      }
    }
    INTENT_TREE.forEach(n => expand(n, 0));
    return expanded;
  }, [search, openSet]);

  // ECharts 旭日图 option
  const sunburstOpt = useMemo(() => () => {
    const palette = chartPalette();
    // 构建 sunburst 数据
    const data = INTENT_TREE.map((l1, i) => ({
      name: l1.name,
      value: l1.count ?? 0,
      itemStyle: { color: L1_COLORS[i] ?? palette[i % palette.length] },
      children: (l1.children ?? []).map((l2, j) => ({
        name: l2.name,
        value: l2.count ?? 0,
        itemStyle: { color: `color-mix(in srgb, ${L1_COLORS[i] ?? palette[i % palette.length]} 55%, transparent)` },
        children: (l2.children ?? []).map(l3 => ({
          name: l3.name,
          value: l3.count ?? 0,
          itemStyle: { color: `color-mix(in srgb, ${L1_COLORS[i] ?? palette[i % palette.length]} 30%, transparent)` },
        })),
        label: { show: j < 3 },
      })),
      label: { show: true },
    }));

    const surface = cssVar('--surface-1');
    const hairline = cssVar('--hairline');
    const text1 = cssVar('--text-1');
    const text2 = cssVar('--text-2');
    const text3 = cssVar('--text-3');
    const font = "'Geist','PingFang SC',system-ui,sans-serif";

    return {
      ...baseOption(),
      tooltip: {
        trigger: 'item',
        backgroundColor: surface,
        borderColor: hairline,
        borderWidth: 1,
        padding: [9, 13],
        textStyle: { color: text1, fontSize: 12, fontFamily: font },
        extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.30);',
        formatter: (p: { name: string; value: number; percent: number }) =>
          `<div style="font-weight:600;color:${text1};margin-bottom:4px">${p.name}</div>` +
          `<div style="color:${text2}">会话量 <span style="color:${cssVar('--gold')};font-weight:700">${p.value.toLocaleString()}</span></div>` +
          `<div style="color:${text3}">占比 ${p.percent?.toFixed(1) ?? '—'}%</div>`,
      },
      series: [
        {
          type: 'sunburst',
          data,
          radius: ['18%', '92%'],
          sort: undefined,
          emphasis: { focus: 'ancestor' },
          label: {
            show: true,
            fontSize: 11,
            color: text1,
            fontFamily: font,
            overflow: 'truncate',
            width: 60,
          },
          levels: [
            {},
            { r0: '18%', r: '42%', label: { fontSize: 12, fontWeight: 600 } },
            { r0: '44%', r: '68%', label: { fontSize: 11 } },
            { r0: '70%', r: '92%', label: { show: false } },
          ],
        },
      ],
    };
  }, []);

  // 统计数据
  const totalL1 = INTENT_L1.length;
  const totalL3 = INTENT_TREE.reduce((s, l1) =>
    s + (l1.children ?? []).reduce((s2, l2) => s2 + (l2.children ?? []).length, 0), 0);
  const totalSessions = Object.values(L1_COUNTS).reduce((s, v) => s + v, 0);

  return (
    <div className="page">
      <style>{`
        .intent-row-hover:hover { background: color-mix(in srgb, var(--gold) 5%, transparent) !important; }
        .intent-tree-wrap { border-radius: var(--r-md); border: 1px solid var(--hairline); overflow: hidden; }
      `}</style>

      <PageHeader
        title="意图分类体系"
        subtitle={`${totalL1} 个一级意图 · ${totalL3} 条三级分类 · 驱动 A2 意图判别路由`}
        actions={
          <div className="row gap-2">
            <div className="input-wrap">
              <Search size={13} className="input-icon" />
              <input
                className="input"
                placeholder="搜索意图名称 / 说明..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 30, width: 220 }}
              />
            </div>
          </div>
        }
      />

      {/* KPI 条 */}
      <div className="row gap-3" style={{ marginBottom: 20 }}>
        {[
          { label: '一级意图', value: totalL1, unit: '个', color: 'var(--gold)' },
          { label: '三级分类', value: totalL3, unit: '条', color: 'var(--c2)' },
          { label: '总会话覆盖', value: totalSessions.toLocaleString(), unit: '次', color: 'var(--emerald)' },
          { label: '最高命中', value: '还款相关', unit: '3,739次', color: 'var(--gold)' },
        ].map(k => (
          <div key={k.label} className="card reveal" style={{ flex: 1, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{k.label}</div>
            <div className="row gap-2 spread" style={{ alignItems: 'flex-end' }}>
              <span className="tnum" style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)', paddingBottom: 2 }}>{k.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 主体：上图下树 布局 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* 旭日图 */}
        <div className="card reveal-1" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px 0', borderBottom: '1px solid var(--hairline)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>会话分布 · 旭日图</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>外环=三级意图 · 中环=二级 · 内环=一级</div>
          </div>
          <Chart build={sunburstOpt} height={360} deps={[]} />
        </div>

        {/* L1 条形图 */}
        <div className="card reveal-2" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px 0', borderBottom: '1px solid var(--hairline)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>一级意图会话量</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>按会话量降序排列</div>
          </div>
          <Chart
            build={useMemo(() => () => {
              const sorted = [...INTENT_TREE].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
              const names = sorted.map(n => n.name);
              const counts = sorted.map(n => n.count ?? 0);
              const colors = sorted.map((n) => L1_COLORS[INTENT_TREE.indexOf(n)] ?? cssVar('--gold'));
              return {
                ...baseOption(),
                grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
                tooltip: {
                  trigger: 'axis',
                  ...(baseOption().tooltip as object),
                  formatter: (p: Array<{ name: string; value: number }>) =>
                    `${p[0].name}: <b>${p[0].value.toLocaleString()}</b> 次`,
                },
                xAxis: {
                  type: 'value',
                  axisLine: { show: false },
                  axisTick: { show: false },
                  axisLabel: { color: cssVar('--text-3'), fontSize: 10 },
                  splitLine: { lineStyle: { color: cssVar('--hairline'), type: 'dashed' } },
                },
                yAxis: {
                  type: 'category',
                  data: names,
                  axisLine: { show: false },
                  axisTick: { show: false },
                  axisLabel: { color: cssVar('--text-2'), fontSize: 11, fontFamily: "'Geist','PingFang SC',sans-serif" },
                },
                series: [{
                  type: 'bar',
                  data: counts.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] } })),
                  barMaxWidth: 24,
                  label: {
                    show: true, position: 'right',
                    color: cssVar('--text-3'), fontSize: 10,
                    formatter: (p: { value: number }) => p.value.toLocaleString(),
                  },
                }],
              };
            }, [])}
            height={360}
          />
        </div>
      </div>

      {/* 三级可折叠树 */}
      <div className="card reveal-3" style={{ padding: 0, overflow: 'hidden' }}>
        {/* 树头 */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', background: 'var(--surface-1)' }}>
          <div className="row gap-3 spread">
            <div className="row gap-3">
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>三级意图分类树</span>
              <span className="badge" style={{ background: 'color-mix(in srgb, var(--gold) 12%, transparent)', color: 'var(--gold)' }}>
                {INTENT_TREE.reduce((s, l1) => s + totalLeaves(l1), 0)} 个叶节点
              </span>
            </div>
            <div className="row gap-2">
              {/* 列头说明 */}
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 8 }}>说明</span>
              <span className="tnum" style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 48, textAlign: 'right' }}>会话量</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 28, textAlign: 'center' }}>层级</span>
            </div>
          </div>
        </div>

        {/* 树体 */}
        <div style={{ maxHeight: 580, overflowY: 'auto' }}>
          {INTENT_TREE.map(node => (
            <IntentBranch
              key={node.name}
              node={node}
              depth={0}
              openSet={effectiveOpenSet}
              toggle={toggle}
              search={search}
            />
          ))}
        </div>

        {/* 树底 */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--hairline)', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            共 <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{totalL1}</span> 个一级 ·
            {' '}<span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>
              {INTENT_TREE.reduce((s, l1) => s + (l1.children ?? []).length, 0)}
            </span> 个二级 ·
            {' '}<span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{totalL3}</span> 个三级意图
            {search && <span style={{ marginLeft: 12, color: 'var(--gold)' }}>· 搜索 "{search}"</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
