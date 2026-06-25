# 链枢 · 供应链/履约中台 — 并行开发合同（AGENT-CONTRACT）

> 你是页面开发 agent。本文 + 共享文件是你的唯一合同。**先读 3 个参考文件再动手**：
> `src/pages/Tower.tsx`(旗舰范例·照它的质量与写法)、`src/components/ui.tsx`+`src/components/sig.tsx`(组件 API)、`src/types/index.ts`+`src/lib/mockData.ts`(数据契约)。

## 设计系统（必须严格遵守）
- **调性**：Steel Tower 钢蓝石板**暗台**（默认 dark，`--bg-base #0E1620`）+ **货运琥珀 `--gold = #F0883E`**（唯一 hero accent · 物流行业本色 · 稀缺点缀不涂满）。亮主题 Blueprint Day 自动跟随 token。
- **范式**：mission-control 控制塔 · 数据密集但呼吸感强 · 工业精密仪表盘气质。
- **字体**：Geist + Geist Mono（数字）；CJK PingFang。数字一律 `className="mononum"` 或 `tnum`（tabular-nums）。
- **4px 网格**：间距 4/8/12/16/20/24；卡片 padding 14-16，gap 12-14。圆角 token（`--r-md` 9 / `--r-lg` 12，工业方正档）。
- **动效**：进场 `reveal` + `d1..d4` stagger；KPI count-up（StatCard 自带）；图表 draw-in（用 `DRAW`）。

## 反 AI-slop 红线（ship 前逐条过 · 违反 = 返工）
1. **一页一 accent = 货运琥珀**。健康 ramp 用 `--success`(正常绿)/`--warning`(预警黄)/`--gold`(缺货橙=hero)/`--danger`(断流红)；序列用 `--c1..c8`。无 AI 紫、无霓虹、无玻璃涂满。
2. **数字全 tabular**（`mononum`/`tnum`）。
3. **图表全真 ECharts**（用 `<Chart build={()=>option} />`），禁假 div 进度条冒充图表（进度条只用于"进度/占比/库存水位"语义）。
4. **ECharts canvas 里颜色一律预解析**：用 `cssVar('--x')`/`accent()`/`healthColor(h)`/`chanColor('--cN')`/`sem()`，**禁直接写 `'var(--x)'`**（canvas 不认 CSS 变量 → 掉色）。itemStyle/lineStyle/areaStyle/label.color/axisLabel/visualMap.inRange 全部预解析。
5. **inline style 禁混用 `border` 简写 + `borderLeft/Top` 长写**（同一 style 对象内）→ React 运行时报错。
6. UI chrome **无 emoji**，图标一律 `lucide-react`。
7. **真实业务文案**，无 lorem ipsum、无"赋能/无缝/一站式"。
8. **脱敏**：仓/门店/供应商只用 mockData 现成通用名（华东区域仓 / 示例供应商 A / 北京门店），无真实雇主/品牌。
9. **列表 key 用稳定 id**（非 index）；短语法 Fragment `<>` 不能带 key，要 key 用 `<Fragment key>` 或具体元素。
10. **import 必须全部用到**（noUnusedLocals 开）。

## 共享组件 API（直接复用，勿重造）
- `ui.tsx`：`<Card hover>` · `<PageHeader title subtitle actions>` · `<StatCard label raw unit change spark decimals icon delayClass>`(KPI·自带count-up) · `<TrendChip change>` · `<Sparkline data color>` · `<Badge color>` · `<Segmented options value onChange>` · `<ProgressBar pct color>` · `<EmptyState icon title desc>` · `<SectionTitle right>`。
- `sig.tsx`：`<Panel title icon right bodyClass>` · `<HealthChip health>` · `<HealthDot health>` · `<RiskDot risk>` · `<TransitPill units sm>` · `<StageTrack stage>`(履约阶段进度)。
- `Chart.tsx`：`<Chart build={()=>option} height deps={[...]} />`（主题感知，自动重建）。
- `chartTheme.ts`：`cssVar('--x')` · `accent()`(琥珀) · `trust()`(绿) · `healthColor('ok'|'watch'|'low'|'broken')` · `chanColor('--c1')` · `sem('active'|'ok'|'warn'|'danger'|'info')` · `baseOption()` · `axisStyle()` · `areaGradient(color,opacity)` · `DRAW`。
- 签名 CSS 类（theme.css 已定义）：`.health-chip/.health-ok|watch|low|broken/.health-dot` · `.node-card/.sel` · `.exc-row/.exc-critical|warn|action|info` · `.whatif-row/.whatif-slider/.ripple-card` · `.stage-track/.stage-dot/.stage-line` · `.transit-pill` · `.metric-card` · `.gate-row/.gate-pass/.gate-block` · `.inv-cell`。

## 页面骨架（统一）
```tsx
export default function X() {
  return (
    <div className="page page-wide">
      <PageHeader title="…" subtitle="…" actions={<span className="tag tag-mono">…</span>} />
      {/* KPI 带：4 个 StatCard（用对应 *_KPIS） */}
      {/* 主体：真 ECharts + 表/卡片 + 该页签名交互 + hover/空态 */}
    </div>
  );
}
```

## 5 页逐页 spec
### Forecast（需求预测 · `forecast:read`）— 数据 `FORECAST_SERIES` `FORECAST_KPIS`
- KPI：FORECAST_KPIS。
- **签名 = 需求预测带置信区间图**：真 ECharts line —— 历史 actual 实线（琥珀 accent），未来 forecast 虚线（lineStyle type:'dashed'），upper/lower 用两条线 + `areaStyle` 填出置信带（用 `areaGradient(accent(),..)` 或半透明）。canvas 色全预解析。
- 左侧 SKU 列表（FORECAST_SERIES 各项：sku/name/category/accuracy/trend），点选切换右侧预测图（deps 传 sku）。
- SKU 卡显示预测准确率（绿/黄）+ 同比 trend（TrendChip）。
- 可加一个"预测 vs 实际偏差"小图或准确率对比条形（chanColor 预解析）。

### WhatIf（What-if 情景模拟 · `whatif:read`）— 数据 `WHATIF_LEVERS` `WHATIF_BASE` `WHATIF_KPIS`
- KPI：WHATIF_KPIS。
- **签名 = 拉杆情景模拟（独有交互）**：用 `.whatif-slider`(range input) 渲染 WHATIF_LEVERS（需求波动/交期/安全库存系数），useState 存各拉杆值；下方 `.ripple-card` 实时显示 WHATIF_BASE 各结果的"基线 → 模拟"涟漪（按拉杆值用简单系数估算 sim：如需求↑→履约率略降、缺货↑、持有成本↑；安全库存↑→缺货↓但占用↑）。模拟值变化用琥珀高亮 + better 方向(up/down)判断变好变坏配色（success/danger）。
- 真 ECharts：基线 vs 模拟对比条形（或双柱），随拉杆联动（deps 传拉杆值），颜色 accent/text-3 预解析。
- 体现"What-if 让计划员在下单前看见涟漪"。

### Inventory（库存健康 · `inventory:read`）— 数据 `HEAT_CELLS` `WAREHOUSES` `CATEGORIES` `INVENTORY_ITEMS` `INVENTORY_KPIS`
- KPI：INVENTORY_KPIS。
- **签名 = 库存健康热力矩阵**：真 ECharts heatmap，xAxis=CATEGORIES, yAxis=WAREHOUSES, data 由 HEAT_CELLS 映射 [catIdx, whIdx, value(可供天数)]；visualMap 分段或连续，**用 healthColor 思路上色**（低天数=缺货橙/红，高=积压黄，正常=绿）——visualMap.inRange.color 用 cssVar 预解析的色阶。tooltip 显示仓/品类/可供天数/健康。
- SKU 库存表（INVENTORY_ITEMS）：table.tbl，列=SKU/品名/仓/库存/安全库存/在途/可供天数/健康(HealthChip)/周转，数字 td-num mononum；缺货/断流行用 HealthChip 标。
- 可加缺货 vs 积压分布小环形。

### Replenish（补货采购 · `replenish:read`）— 数据 `REPLENISH_ORDERS` `REPLENISH_KPIS` `GATE_ITEMS`
- KPI：REPLENISH_KPIS。
- **签名 = Agent 补货决策 + 人审卡点**：GATE_ITEMS 渲染成 `.gate-row`（按 status：pending 待审/approved 通过/blocked/auto 自动；按 risk 左边框色）。pending 项显示 通过/驳回/详情 btn；auto 项标"Agent 自动下单·已留痕"；显示触发 agent + 金额 amount + 置信度。体现"高金额/高风险人审、低风险自动下单"。
- 补货单表（REPLENISH_ORDERS）：SKU/供应商/目标仓/数量/单价/原因/Agent置信度/交期/状态(语义色 chip)。
- 真 ECharts：补货状态分布（环形：自动下单/待审/已批/驳回）或各仓补货量条形，色预解析。

### Supplier（供应商风险 · `supplier:read`）— 数据 `SUPPLIERS` `SUPPLIER_KPIS`
- KPI：SUPPLIER_KPIS。
- **签名 = 供应商风险雷达**：真 ECharts radar —— 选中供应商的 radar 维度（准时交付/质量/财务健康/产能弹性/合规），indicator max 100，琥珀填充；可叠 2 家对比。
- 供应商列表/表（SUPPLIERS）：名称/品类/区域/准时率/质量分/风险分/依赖度/风险等级(HealthChip)，点选切换雷达（deps 传 id）。高风险/断供（riskLevel broken/watch）醒目标注。
- 真 ECharts：风险分布散点（准时率 x 风险分 y，点大小=依赖度，色=riskLevel）或风险排名条形，色 healthColor 预解析。

## 验收（每页自查）
build 必须 `tsc -b && vite build` 绿；console 0 报错；红线 1-10 逐条过；琥珀是唯一 chrome accent；数字 tabular；图表真 ECharts 且 canvas 色已预解析。
