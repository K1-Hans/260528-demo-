# 智能客服运营中台 · 页面开发契约（agent 起手必读）

你在为这个 demo 写**一个页面文件**（纯前端 mock，无后端）。这是 Hans 转 B 端 AI 产品的履历级 demo，**审美是第一优先级**，目标超越一线 SaaS 后台（Linear/Stripe/Bloomberg 终端气质）。

## 1. 设计系统（铁律，违反 = 返工）
- **暗色 Command Graphite + 合规青 teal**。accent token 名是 `--gold`，实际渲染为青色 `#2dd4bf`。一页一 accent，别在同页混多个强调色。
- **matte 克制**：卡片是实底 + 发丝线 + 极淡投影，**禁玻璃涂满 / 禁 AI 紫发光 / 禁霓虹渐变 / 禁 emoji**（UI 图标一律 lucide-react）。
- **数字铁律**：所有指标/表格数字加 `className="tnum"` 或 `style={{fontVariantNumeric:'tabular-nums'}}`。大数字可加 `mono`。
- **图表全真 ECharts**，禁用假 div 进度条冒充图表（占比条用 `MeterBar` 组件 OK，但趋势/分布/对比必须 ECharts）。
- **文案全消金真实场景**，禁 lorem ipsum / 禁占位 "Acme"/ 禁「赋能/无缝/一站式/next-gen」陈词。
- 间距走 4px 网格（8/12/16/20/24）；圆角用 token；进场加 `.reveal`（可选 `.reveal-1..6` stagger）。

## 2. 复用这些（已存在，直接 import，禁重造）
```ts
import { Card, PageHeader, StatCard, TrendChip, Sparkline, Badge, Segmented, ProgressBar, EmptyState, SectionTitle } from '../../components/ui';
import { DataTable, Pagination, type Col } from '../../components/DataTable';
import { StatusBadge, RiskBadge, BadcaseBadge, RejectBadge, Toolbar, Field, Drawer, Modal, MeterBar, toast } from '../../components/kit';
import Chart from '../../components/Chart';              // <Chart build={()=>option} height={260} />
import { baseOption, axisStyle, cssVar, accent } from '../../lib/chartTheme';
import { INTENT_L1, RISK_TYPES, KB_STATUSES, BRAND, ROLES, MOCK_USERS } from '../../lib/mockData';
import { useCountUp, useInView, fmt } from '../../lib/hooks';
import type { /* 你需要的类型 */ } from '../../types';
```
- 还可复用 `ConversationTimeline`（`../../components/ConversationTimeline`，props `messages: ChatMsg[]`）+ `PipelineStages`（`../../components/PipelineStages`，props `stages: PipeStage[]`）。
- 现成 CSS class：`.page .page-header .page-title .page-subtitle .page-actions .card .card-hover .card-pad-0 .btn .btn-primary .btn-ghost .btn-subtle .btn-sm .btn-danger .btn-icon .input .input-wrap .input-icon .badge .tag .chip .label .section-label .tbl .td-num .row .col .spread .wrap .gap-1..6 .grid .flex-1 .tnum .mono .reveal .reveal-1..6 .fade-in .text-1/2/3 .gold .emerald .divider .divider-gold .kpi-value .kpi-unit .avatar .skeleton .dot-pulse .spinner .trend-up .trend-down`。需要别的就 inline style 用 `var(--token)`。
- 可用 tokens：`--bg-base --surface-1/2/3 --hairline --hairline-strong --text-1/2/3 --gold --gold-bright --bronze --gold-dim --gold-glow --emerald --success --warning --danger --info --c1..c8 --r-sm/md/lg/xl --space-* --ease`。

## 3. 页面骨架范例
```tsx
export default function X() {
  return (
    <div className="page">
      <PageHeader title="..." subtitle="..." actions={<button className="btn btn-primary">...</button>} />
      {/* KPI 带：用 StatCard 或自定义 Card；筛选：用 Toolbar + input.input + select.input + Segmented；表：DataTable */}
    </div>
  );
}
```
ECharts 范例：
```tsx
const opt = useMemo(() => () => ({
  ...baseOption(),
  tooltip: { trigger: 'axis', ...(baseOption().tooltip as object) },
  xAxis: { type: 'category', data: rows.map(r=>r.x), ...axisStyle() },
  yAxis: { type: 'value', ...axisStyle() },
  series: [{ type: 'bar', data: rows.map(r=>r.y), itemStyle: { color: cssVar('--gold'), borderRadius: [4,4,0,0] } }],
}), []);
return <Chart build={opt} height={260} />;
```
> 注意：`yAxis` 若要自定义 `axisLabel.formatter`，必须放在 `...axisStyle()` **之后**（否则被覆盖）。Segmented 的 `onChange` 参数显式标 `(v: string)`。

## 4. 真实数据锚点（保持跨页一致，按需取用）
- **10 一级意图**（`INTENT_L1`）：还款相关 / 申请咨询 / 产品与信息 / 催收相关 / 营销活动 / 费用相关 / 业务办理 / 信息维护 / 批量问题 / 自定义。
- **8 风险类**（`RISK_TYPES`）：投诉维权 / 法律维权 / 金融监管 / 催收相关 / 媒体曝光 / 涉政敏感 / 合规风险 / 扬言轻生。
- **真实库规模**：QA 12,954 / 卡片 530 / 寒暄 1,396 / 转人工 149 / 敏感词 51 主词 + 211 变体 / 场景 675。
- **真实 QA 文案样例**：q「怎么还款」a「亲亲~还款可在『信用贷 APP-我的-还款』操作哦」；q「会员怎么退费」a「会员退费可在『我的-会员中心-退费申请』发起，3-5 工作日原路退回」；寒暄 q「客服上班时间」a「人工服务时间 08:00—21:00」；转人工 q「有人工客服」a「小云正在为您转接人工，请您稍后~」。
- **真实敏感词**：主词「投诉」变体「我要投诉/聚投诉/我去银保监会投诉」(投诉维权)；主词「银保监会」(金融监管)；主词「起诉」(法律维权)。
- **真实坐席/角色**：运营总监 张明远 / 知识运营 林婉清 / 合规专员 周慎 / 质检班长 赵越。
- **品牌**：机器人=小云，公司=示例消费金融，产品=信用贷，客服热线 400-800-1234，服务 08:00–21:00。
- **状态机**：KB 条目 已生效/待发布/已下线（用 `StatusBadge`）；编辑 q 自动 demote 到「待发布」（toast 提示）。
- 深度参考（可选 Read）：`/Users/sky4267/Desktop/260528中台系统demo开发/AI中台Demo工厂/深度规格/01b-znkf功能盘点与覆盖映射.md`

## 5. 交付硬要求
- 文件就写在指定 path，`export default function <名>()`，**必须 tsc 编译通过**（严格 TS：无隐式 any、无未用 import/变量、类型对得上 `../../types`）。
- 页面 mock 数据写在文件内 `const`（够丰富、真实、能体现功能；列表类 ≥ 12 行）。
- 空态、hover、筛选、排序、弹窗/抽屉交互按规格做到位。
- **别碰其他文件**（只写你这一个页面文件）。别改 types/mockData/共享组件（如缺类型，在页面内本地定义 interface）。
- 最终消息只回一句：「✅ 完成 <文件名> · <一句话功能>」，不贴代码。
