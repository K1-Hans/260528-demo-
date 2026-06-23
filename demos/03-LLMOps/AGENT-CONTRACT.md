# 云枢 LLMOps 运营中台 · 页面 Agent 契约（必读后再写页）

> 你负责写**一个** `src/pages/*.tsx` 页面。本文是统一契约：照它写就能编译通过 + 视觉一致。
> #1 铁律：**极致审美**。这是 Datadog/Linear 级**深色工程控制台**，不是消费级 SaaS。

## 0. 视觉签名「深空示波台 · Telemetry Graphite」（一句话记牢）
**深色作战室 · 颜色只为状态服务**：🟢 翡翠绿 `var(--gold)` = 活着/在线/健康（唯一 hero accent）· 🟡 金 `var(--cost)` = 花钱（**只**给成本/选中实验，稀缺）· 🔴 红 `var(--danger)` = 出事了（告警/质量回归/错误）。数字即示波器读数：一律等宽 + tabular。**一页一 accent 锁**。

## 1. 技术栈 / 导入路径（错了就编译失败）
- React 19 + TS + Vite + ECharts 5 + react-router-dom 7 + lucide-react。默认导出一个组件。
- 页面在 `src/pages/` **扁平**目录，导入一律 `../`：`../components/...`、`../lib/...`、`../contexts/...`、`../types`。**不要写 `../../`**。
- 全 mock，数据**只从 `../lib/mockData` 取**，类型从 `../types` 取。**禁造 lorem / "Acme"**，用既有真实业务数据。

## 2. 页面骨架（照抄结构）
```tsx
import { PageHeader, Card, StatCard, SectionTitle, Badge, EmptyState } from '../components/ui';
import { StatusBadge, Toolbar, Field, Drawer, Modal, toast } from '../components/kit';
import { DataTable, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cost, sem, areaGradient } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { XXX } from '../lib/mockData';

export default function PageName() {
  const { hasPermission } = useAuth();
  return (
    <div className="page">
      <PageHeader title="页面标题" subtitle="一句工程化副标题（具体专业，无赋能/无缝/一站式）" actions={/* 按钮 */} />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {/* StatCard 自带 count-up；成本卡传 accentVar="var(--cost)"，延迟/成本/错误传 invertTrend */}
      </div>
      {/* 卡片区：发丝线分区 + 11px 大写灰 SectionTitle */}
    </div>
  );
}
```
- 进场动画：卡片加 `className="card reveal reveal-2"`（reveal-1..6 递增 stagger）。
- 标题用 `<SectionTitle>分区名</SectionTitle>`（自动 11px 大写灰）。窄屏：多列网格请加 `className="grid grid-cols-auto"` 或在 760px 下自然降单列。

## 3. 共享组件清单（直接用，别重造）
**ui.tsx**：`Card`(hover) · `PageHeader{title,subtitle,actions}` · `StatCard{label,raw,unit,change,spark,decimals,icon,accentVar,invertTrend}`（KPI count-up）· `TrendChip{change,invert}` · `Sparkline{data,color}` · `Badge{color}` · `Segmented{options,value,onChange}` · `ProgressBar{pct,color}` · `EmptyState{icon,title,desc}` · `SectionTitle{children,right}`。
**kit.tsx**：`StatusBadge{status,tone}`（tone: good/warn/bad/info/cost/muted）· `Toolbar` · `Field{label}` · `Drawer{open,onClose,title,sub,width,footer}` · `Modal{...}` · `MeterBar{pct,color,label}` · `toast(msg,type)`。
**DataTable.tsx**：`<DataTable cols rows rowKey onRow empty defaultSort dense />`，`Col<T>={key,header,render?,sortAccessor?,sortable?,num?(等宽右对齐),align?,width?,nowrap?}`；配 `<Pagination page total pageSize onPage />`。
**hooks.ts**：`useCountUp(target,dur,start)` · `useInView()` · `fmt(n,digits)`。

## 4. 图表（真 ECharts，禁假 div 进度条）
用 `<Chart build={() => OPTION} height={280} deps={[依赖]} />`。`build` 闭包内**实时读 CSS 变量**（主题切换自动重绘）。
```tsx
build={() => ({
  ...baseOption(),
  xAxis: { type: 'category', data: [...], ...axisStyle() },
  yAxis: { type: 'value', ...axisStyle() },
  series: [{ type: 'line', smooth: true, data: [...], lineStyle: { color: accent(), width: 2 },
             areaStyle: { color: areaGradient(accent()) }, showSymbol: false }],
})}
```
- 颜色规则：健康/主序列 → `accent()`(emerald) · 成本序列 → `cost()`(金) · 错误/回归 → `sem('error')`(红) · p95/次序列 → `var(--c2)`(蓝) · 多序列 → 用调色板默认。
- 趋势用**细线 + 渐变面积**（`areaGradient`），不用粗柱；柱状用圆角 `itemStyle:{borderRadius:[4,4,0,0]}`。
- tooltip/grid/字体已在 `baseOption()` 配好（等宽数字）。draw-in 动画默认开。
- `cssVar('--c2')` 等可从 `../lib/chartTheme` 导入 `cssVar` 取任意 token 色。

## 5. RBAC（页面级已由 Layout 拦截；你只管动作级）
- 页面能进 = 已有权限，不用再判页面级。**动作级**才判：如「回滚」「设预算」按钮用 `hasPermission('prompt:approve')` / `'cost:manage'` 控制可见或禁用。
- 关键权限：`prompt:approve`=Owner 回滚审批 · `cost:manage`=Owner/FinOps 设预算 · `tracing:write`=加测试集 · `eval:write`=运行评测 · `annotation:write`=打分。

## 6. 反 AI-slop 红线（ship 前逐条过）
- [ ] 一页一 accent（emerald）；金只给成本、红只给告警/回归；**无 AI 紫发光、无霓虹渐变**。
- [ ] 所有延迟/token/$/评分 → `className="mononum"`（等宽 tabular）或 `tnum`，小数位对齐。
- [ ] 图表全真 ECharts，零假 div 条。空态用 `EmptyState`。
- [ ] UI chrome 全 lucide 图标，**无 emoji**。文案工程化具体（"p95 延迟""忠实度回归""灰度 20%""成本/千次调用"）。
- [ ] 间距走 4px 网格；卡片 `.card`；发丝线分区；hover/focus 态到位。
- [ ] 暗+亮两主题都不破（用 CSS 变量，别硬编码颜色）。

## 7. 你的页面任务
见下方派发段落（spawn prompt 内）。严格只写指定的那一个 `src/pages/*.tsx` 文件，不要碰共享文件 / 其他页面 / mockData / types（缺数据在你页面内补 const，但优先用 mockData 既有导出）。
