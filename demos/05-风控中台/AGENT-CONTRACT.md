# AI 风控中台 · 页面 Agent 契约（必读后再写页）

> 你负责写**一个** `src/pages/*.tsx` 页面。照它写就能编译通过 + 视觉一致。#1 铁律：**极致审美**。
> 这是**风险作战室**（锚 Bloomberg 终端 × SOC 控制室）：深色高密度多窗格、实时跳数、红黑三态盘口。

## 0. 视觉签名「Obsidian Command · 黑曜作战室」（一句话记牢）
**近黑曜石墨底 + 克制金品牌光 + 红/琥珀/绿三态盘口 + 全等宽跳数。** 颜色语义：
- 🟡 克制金 `var(--gold)` = 品牌 / 关键 KPI / 选中 / 焦点（稀缺，不滥用为装饰）
- 🟢 绿 `var(--success)` = 放行 PASS · 🟠 琥珀 `var(--warning)` = 复核 REVIEW · 🔴 红 `var(--danger)` = 拦截 BLOCK
- **红只在真风险出现时点亮**——表格/卡片默认沉稳石墨，绝不做红色氛围背景。**一页一 accent**：金=品牌，红琥绿=数据语义，不混用。

## 1. 技术栈 / 导入路径（错了就编译失败）
- React 19 + TS + Vite + ECharts 5 + react-router-dom 7 + lucide-react。**默认导出一个组件**（`export default function XxxPage()`）。
- 页面在 `src/pages/` **扁平**目录，导入一律单个 `../`：`../components/...`、`../lib/...`、`../contexts/...`、`../types`。**绝不要 `../../`**。
- 全 mock：**你页面专属数据写在本文件顶部 `const`**（用 `../types` 的类型）。共享数据（角色/告警/威胁/城市）从 `../lib/mockData` 取。**禁改 mockData.ts / types / 其他页 / 共享组件**。
- 🔒 **脱敏铁律**：用「示例消费金融 / 小云 / 信用贷 / 坐席系统 / 400-800-1234」。消金术语（还款/逾期/催收/反欺诈/AML/账户接管/套现/快进快出/结构化拆分/PSI/KS）**保留**。禁 lorem / "Acme"。

## 2. 共享组件（直接 import 用，别重造）
```tsx
// 基础件
import { PageHeader, Card, StatCard, Sparkline, TrendChip, Badge, Segmented, ProgressBar, EmptyState, SectionTitle } from '../components/ui';
// 套件
import { StatusBadge, RiskBadge, Toolbar, Field, Drawer, Modal, MeterBar, toast } from '../components/kit';
// 表格（可排序 + 空态 + 分页）
import { DataTable, Pagination, type Col } from '../components/DataTable';
// 图表
import Chart from '../components/Chart';
// 风控签名件 ★
import { Panel, DecisionBadge, DecisionDot, ScorePill, SlaChip, AlertTicker, ThreatStrip, decVar } from '../components/sig';
// 关系图谱（反欺诈网络 / 案件用）
import RiskGraph from '../components/RiskGraph';
```
- **`<Panel title icon right bodyClass>`** = 作战窗格（带标题条的多窗格单元）。多窗格布局首选它，比裸 Card 更"终端"。`bodyClass="panel-body-0"` 去内边距（放表格/图表/列表）。
- **`<DecisionBadge decision="pass|review|block" />`** 三态徽章 · **`<ScorePill score={0.93} />`** 0-1 评分胶囊（自动着色）· **`<DecisionDot decision />`** 行首点 · **`<SlaChip seconds={180} />`** SLA 倒计时。
- **`<StatCard label raw unit change icon spark delayClass decimals />`** KPI（count-up，大数字自动等宽）。
- **`<RiskBadge level="high|mid|low" />`** 风险等级（高危/中风险/低风险）。
- **`<DataTable cols={Col<T>[]} rows rowKey onRow defaultSort />`**：列 `{ key, header, render?, sortable?, num?(右对齐+等宽), align?, width? }`。

## 3. 页面骨架（照抄）
```tsx
import { PageHeader } from '../components/ui';
import { Panel } from '../components/sig';
import { useAuth } from '../contexts/AuthContext';
// ...其余按需

export default function XxxPage() {
  const { hasPermission } = useAuth();          // 需要分权时用
  const canAct = hasPermission('xxx:act');      // 处置类按钮按角色禁用
  return (
    <div className="page">     {/* 大屏多窗格页用 className="page page-wide" */}
      <PageHeader title="标题" subtitle="一句具体专业副标（无赋能/无缝/一站式/智能化陈词）" actions={/* 按钮 */} />
      {/* 多窗格：用 <div className="grid" style={{gridTemplateColumns:'...',gap:14}}> 放 <Panel> */}
    </div>
  );
}
```

## 4. 图表（真 ECharts，禁假 div 进度条）
`<Chart build={() => OPTION} height={280} deps={[...]} />`，build 闭包内**实时读 CSS 变量**（主题切换自动重绘）。
```tsx
import { baseOption, axisStyle, areaGradient, cssVar, pass, review, block, accent, sem } from '../lib/chartTheme';
```
- 颜色：放行→`pass()`(绿) · 复核→`review()`(琥珀) · 拦截→`block()`(红) · 品牌主序列→`accent()`(金) · 多序列用 `baseOption().color` 默认调色板（`--c1..c8`）。直接 `cssVar('--danger')` 也可。
- 趋势细线 `lineStyle:{width:1.6}` + `areaStyle:{color:areaGradient(cssVar('--gold'),0.2)}`；柱圆角 `itemStyle:{borderRadius:[3,3,0,0]}`；双轴/直方/堆叠/桑基/SHAP 双向条均真 ECharts。
- `baseOption()` 已配好字体/网格/tooltip；`axisStyle()` 给坐标轴。坐标轴标签等宽。

## 5. 数字 / 文案纪律
- 所有指标/金额/评分数字加 `className="mononum"`（等宽 tabular）或在表格列 `num: true`。
- 金额带千分位 + 币种：`¥{fmt(n)}`（`import { fmt, fmtMoney } from '../lib/hooks'`）；大额 KPI 用 `fmtMoney(n,{large:true})`。评分两位小数。
- 文案讲门道：结构化拆分 / 快进快出 / 账户接管 / 套现团伙 / PSI 漂移 / KS / SHAP / OFAC·EU·UN·PEP。

## 6. 反 AI-slop 红线（ship 前逐条过）
- [ ] 一页一 accent（金）；红/琥珀/绿严格对应拦截/复核/放行；**无 AI 紫发光、无霓虹、无玻璃涂满**。
- [ ] 数字全 `mononum`/`tnum` 对齐；金额带 ¥ + 千分位；评分两位小数。
- [ ] 图表全真 ECharts，**零假 div 条**；空态用 `<EmptyState>`；loading 用 `.skeleton`。
- [ ] UI chrome 全 **lucide 图标**，**无 emoji**；`strokeWidth` 默认；图标 `size={13~16}`。
- [ ] 间距 4px 网格；窗格用 `<Panel>` 或 `.card`；发丝线分区；hover/focus 到位；**暗(主)+亮两主题都不破**（只用 CSS 变量，绝不硬编码 hex 色值）。

## 7. RBAC（按需）
- `const { hasPermission, currentRole } = useAuth();`
- 处置/写操作按钮：`disabled={!hasPermission('xxx:act'|'xxx:write')}` + 禁用时给原因（小字 `text-3`）。页面级访问已由 Layout 拦截，你只管页面内的动作分权。

## 8. 你的页面任务
见 spawn prompt（含本页职责 + 关键交互 + mock 数据轮廓 + 要画的 ECharts）。**只写指定的那一个 `src/pages/*.tsx`**，页面专属 mock 数据写在文件顶部 const。写完自检第 6 节红线。
