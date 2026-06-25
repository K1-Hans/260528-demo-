# AI 质检中台 · 页面开发契约（agent 起手必读）

你在为这个 demo 写**一个页面文件**（纯前端 mock，无后端）。这是 Hans 转 B 端 AI 产品的履历级 demo，**审美是第一优先级**，气质对标 Linear / Stripe / 彭博终端 / 审计仪器。

## 0. 视觉签名（本 demo 的灵魂，违反 = 返工）
**「Evidence Dossier · 冷瓷卷宗 / 精密审计感」** —— 一台让监管和法务都信得过的「审计仪器」。冷静、克制、可自证；证据卷宗 + 示波器，不是炫技仪表盘。
> 刻意与 ① 客服（暖象牙 + 衬线）对立：**冷 vs 暖 · sans vs 衬线 · 直角文档 vs 柔和**。别写成暖色或圆润消费级。

## 1. 设计系统（铁律）
- **亮色主场 = 冷瓷白**（`--bg-base #f4f6f8`，实底白卡 + 冷发丝线）；暗场 = 冷板岩（自动，别硬编码颜色，全用 token）。
- **主 accent token 名是 `--gold`，实际渲染为钢蓝 `#2456c8`**（命中/焦点/通过/主操作）。**一页一 accent**，别在同页混多个强调色。
- **质检语义三色（全站统一，别乱用）**：违规 = `--danger`（朱红）、合规 = `--success`（苔绿）、风险待定 = `--warning`（琥珀）。转写违规句红、合规话术绿、风险句琥珀。
- **标题 sans**（`--font-display` 已是无衬线，**禁衬线**——衬线是 ① 客服的签名）。**会话ID / 时间戳 / 时长 / 评分用等宽** `className="mono tnum"`（示波器/证据卷宗感）。
- **matte 扁平 + 直角文档网格**：卡片实底 + 发丝线 + 极淡投影，圆角用 token（偏小）；**禁玻璃涂满 / 禁 AI 紫发光 / 禁霓虹渐变 / 禁 emoji**（UI 图标一律 lucide-react）。
- **数字铁律**：所有指标/表格数字加 `className="tnum"` 或 `style={{fontVariantNumeric:'tabular-nums'}}`。
- **图表全真 ECharts**，禁假 div 进度条冒充图表（占比条用 `MeterBar` OK，趋势/分布/对比/雷达/旭日/热力/漏斗/gauge 必须 ECharts）。
- **文案全消金质检真实场景**，禁 lorem ipsum / 禁「赋能/无缝/一站式」。
- 间距走 4px 网格（8/12/16/20/24）；进场加 `.reveal`（可选 `.reveal-1..6` stagger）；尊重 `prefers-reduced-motion`。

## 2. 复用这些（已存在，直接 import，禁重造）
```ts
import { Card, PageHeader, StatCard, TrendChip, Sparkline, Badge, Segmented, ProgressBar, EmptyState, SectionTitle } from '../../components/ui';
import { DataTable, Pagination, type Col } from '../../components/DataTable';
import { StatusBadge, RiskBadge, Toolbar, Field, Drawer, Modal, MeterBar, toast } from '../../components/kit';
import Chart from '../../components/Chart';              // <Chart build={()=>option} height={260} />
import { baseOption, axisStyle, cssVar, accent } from '../../lib/chartTheme';
import { BRAND, ROLES, MOCK_USERS, BUSINESS_LINES, CHANNELS, COMPLIANCE_TERMS } from '../../lib/mockData';
import { useCountUp, useInView, fmt } from '../../lib/hooks';
import type { /* 你需要的类型 */ } from '../../types';
```
- 可复用 `ConversationTimeline`（`../../components/ConversationTimeline`）做转写气泡时间轴的**视觉参考**，但质检工作台的「逐句违规红/合规绿 + 静默/抢话 + 点句联动评分」更专，旗舰页会自带实现；其它页若要展示对话片段可轻量自写。
- 现成 CSS class：`.page .page-header .page-title .page-subtitle .page-actions .card .card-hover .card-pad-0 .btn .btn-primary/-ghost/-subtle/-sm/-danger/-icon .input .input-wrap .input-icon .badge .tag .chip .label .section-label .tbl .td-num .row .col .spread .wrap .gap-1..6 .grid .flex-1 .tnum .mono .reveal .reveal-1..6 .fade-in .text-1/2/3 .gold .emerald .divider .divider-gold .kpi-value .kpi-unit .avatar .skeleton .dot-pulse .spinner .svc-pill .trend-up/-down`。需要别的用 inline style + `var(--token)`。
- 可用 tokens：`--bg-base --surface-1/2/3 --hairline --hairline-strong --text-1/2/3 --gold --gold-bright --bronze --gold-dim --gold-glow --emerald --success --warning --danger --info --c1..c8 --r-sm/md/lg/xl --space-* --ease`。

## 3. 页面骨架范例
```tsx
export default function X() {
  return (
    <div className="page">
      <PageHeader title="..." subtitle="..." actions={<button className="btn btn-primary">...</button>} />
      {/* KPI 带：StatCard；筛选：Toolbar + input.input + select.input + Segmented；表：DataTable */}
    </div>
  );
}
```
ECharts 范例（统一走项目 theme：透明底 · 发丝线 · tabular · 圆角柱 · 渐变面积 · draw-in）：
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
> `yAxis` 若自定义 `axisLabel.formatter`，必须放在 `...axisStyle()` **之后**。Segmented `onChange` 参数显式标 `(v: string)`。质检语义色用 `cssVar('--danger')`/`cssVar('--success')`/`cssVar('--warning')`。

## 4. 真实数据锚点（保持跨页一致，按需取用；页面自己的 mock 数据写在文件内 const）
- **6 业务线**（`BUSINESS_LINES`）：提前结清 / 注销合规 / 银行卡管理 / 逾期催收 / 产品咨询 / S客户路由。
- **4 渠道**（`CHANNELS`）：通话 / 在线 / 邮件 / Bot。
- **合规必读话术 / 质检术语**（`COMPLIANCE_TERMS`）：年化利率告知 / 冷静期告知 / 个人信息授权 / 逾期后果告知 / 催收红线（禁辱骂威胁、禁联系第三方）/ 承诺越权（禁「保证下款/利息全免」）/ 禁语 / 抢话 / 静默超时。
- **4 角色**（`ROLES` / `MOCK_USERS`）：质检主管 沈括 / 合规官 周慎 / 质检员 林婉清 / 坐席 赵越（+坐席 孙琪/李航 等）。
- **真实量级锚**（保持一致）：今日全量质检 **48,620** 条 · 高风险 **312** · 待复核 **86** · **100% 全量**（vs 传统 1–3% 抽检）· 双录覆盖率目标 **100%**；多-agent 准确率 合规项 **100%** / 客服 **99%** / 电销 **96%**；本地推理较云端 API **月省 ~62%** 成本。
- **真实违规样例文案**（写实，别 lorem）：未告知年化利率（「您这边直接申请就行」漏报 APR）；越权承诺（「我保证您今天一定能下款」）；催收红线（「再不还款就联系您单位同事」）；冷静期未告知。合规话术正例：「本产品年化利率为 X%，借款前请确认还款能力，逾期将影响征信」。
- **品牌**：公司=示例消费金融，产品=信用贷，机器人=小云，客服热线 400-800-1234，服务 08:00–21:00。**🔒 脱敏铁律：禁出现 维小豆/维信/维小贷/百灵/4001601666**，从第一行就用通用名。

## 5. 交付硬要求
- 文件就写在指定 path，`export default function <名>()`，**必须 tsc 编译通过**（严格 TS：无隐式 any、无未用 import/变量、类型对得上 `../../types`）。
- 页面 mock 数据写在文件内 `const`（够丰富、真实、能体现功能；列表类 ≥ 12 行）。
- 空态、hover、筛选、排序、弹窗/抽屉交互按规格做到位；桌面 + 移动两档可看。
- **别碰其他文件**（只写你这一个页面文件）。别改 types/mockData/共享组件（如缺类型，在页面内本地定义 interface）。
- 最终消息只回一句：「✅ 完成 <文件名> · <一句话功能>」，不贴代码。
