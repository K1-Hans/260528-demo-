# 织流 · AI Agent 编排平台 — 并行开发合同（AGENT-CONTRACT）

> 你是页面开发 agent。本文 + 共享文件是你的唯一合同。**先读 3 个参考文件再动手**：
> `src/pages/Canvas.tsx`（旗舰范例 · 照它的质量与写法）、`src/components/ui.tsx`+`src/components/sig.tsx`+`src/components/kit.tsx`（组件 API）、`src/types/index.ts`+`src/lib/mockData.ts`（数据契约）。
> ⚠️ 你的目标文件已是 stub（`PageHeader` 占位）。**Write 前必先 Read 一次 stub**（harness 要求），再整文件覆盖。

## 设计系统（必须严格遵守）
- **调性**：织流 Circuit Ink 电路墨黑**暗台**（默认 dark，`--bg-base #0A0C10`）+ **电光青 `--gold = #22D3EE`**（唯一 hero accent · 执行中/数据流语义 · 稀缺点缀不涂满）。亮主题 Blueprint Wire 自动跟随 token。
- **范式**：编排层执行态 · 数据密集但呼吸感强 · IDE/仪表盘精密气质。run-state 配色：待运行灰 / 执行中青(=hero) / 完成绿 / 出错红 / 等人审黄。
- **字体**：Geist + Geist Mono（数字）；CJK PingFang。数字一律 `className="mononum"` 或 `tnum`（tabular-nums）。
- **4px 网格**：间距 4/8/12/16/20/24；卡片 padding 14-16，gap 12-14。圆角走 token（`--r-md` 9 / `--r-lg` 12）。
- **动效**：进场 `reveal` + `d1..d4` stagger；KPI count-up（StatCard 自带）；图表 draw-in。

## 反 AI-slop 红线（ship 前逐条过 · 违反 = 返工）
1. **一页一 accent = 电光青**。run-state 用 `--success`(完成绿)/`--warning`(等人审黄)/`--danger`(出错红)/`--gold`(执行中青=hero)/`--text-3`(待运行灰)；序列用 `--c1..c8`。无 AI 紫、无霓虹、无玻璃涂满、无电销红橙。
2. **数字全 tabular**（`mononum`/`tnum`/`td-num`）。
3. **图表全真 ECharts**（用 `<Chart build={()=>option} height deps={[...]} />`），禁假 div 进度条冒充图表（进度条/MeterBar 只用于"占比/成功率/水位"语义）。
4. **ECharts canvas 里颜色一律预解析**：用 `cssVar('--x')`/`accent()`/`chanColor('--cN')`/`runStateColor(s)`/`sem()`，**禁直接写 `'var(--x)'`**（canvas 不认 CSS 变量 → 掉色）。itemStyle/lineStyle/areaStyle/label.color/axisLabel/visualMap 全部预解析。（SVG/DOM 里用 var() 没问题，只有 ECharts canvas 不行。）
5. **inline style 禁混用 `border` 简写 + `borderLeft/Top` 长写**（同一 style 对象内）→ React 运行时报错。要么全简写要么全长写。
6. UI chrome **无 emoji**，图标一律 `lucide-react`（size 13-16，跟随 stroke 默认）。
7. **真实业务文案**（信贷反欺诈 / 投研 / 贷后场景），无 lorem ipsum、无"赋能/无缝/一站式/next-gen"。
8. **脱敏**：用 mockData 现成通用名（示例消金 / 案件 FR-**** / 用户****），无真实机构/品牌/PII。
9. **列表 key 用稳定 id**（非 index）；短语法 Fragment `<>` 不能带 key，要 key 用具体元素或 `<Fragment key>`。
10. **import 必须全部用到**（noUnusedLocals 开），变量同理。build 必须 `npm run build` 绿（`tsc -b && vite build` 零报错）。

## 共享组件 API（直接复用，勿重造）
- `ui.tsx`：`<Card hover>` · `<PageHeader title subtitle actions>` · `<StatCard label raw unit change spark decimals icon delayClass>`(KPI·自带 count-up) · `<TrendChip change>` · `<Sparkline data color>` · `<Badge color>` · `<Segmented options value onChange>` · `<ProgressBar pct color>` · `<EmptyState icon title desc>` · `<SectionTitle right>`。
- `sig.tsx`：`<RunStateChip state showLabel>` · `<NodeTypeIcon type size>` · `<NodeTypeBadge type>` · `<RiskDot risk>` · `<TelePill icon>{…}</TelePill>` · `<Panel title icon right bodyClass>{…}</Panel>`。
- `kit.tsx`：`<StatusBadge status tone>`(tone: good/warn/bad/info/muted) · `<RiskBadge level>` · `<Toolbar>` · `<Field label hint>` · `<Drawer open onClose title sub footer>` · `<Modal …>` · `<MeterBar pct color label>` · `toast(msg, 'success'|'warn'|'danger'|'info')`。
- `Chart.tsx`：`<Chart build={()=>option} height deps={[...]} />`（主题感知，自动重建）。
- `chartTheme.ts`：`cssVar('--x')` · `accent()`(青) · `trust()`(绿) · `runStateColor(s)` · `chanColor('--c1')` · `sem('active'|'done'|'warn'|'error'|'info')` · `baseOption()` · `axisStyle()` · `areaGradient(color,opacity)` · `DRAW`/`ANIM`。
- 签名 CSS 类（theme.css 已定义）：`.tool-card` · `.run-chip`+`.run-idle/running/done/error/wait` · `.tele-pill` · `.gate-row`+`.gate-pass/block` · `.metric-card` · `.tbl`+`.td-num` · `.tag`/`.tag-mono` · `.badge` · `.live-pulse`/`.spinner`/`.dot-pulse`。

## 页面骨架（统一）
```tsx
export default function X() {
  return (
    <div className="page page-wide">
      <PageHeader title="…" subtitle="…" actions={<span className="tag tag-mono">…</span>} />
      {/* KPI 带：4 个 StatCard（用对应 *_KPIS，icon 传 lucide，delayClass d1..d4） */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>…</div>
      {/* 主体：真 ECharts + 表/卡片 + 该页签名交互 + hover/空态 */}
    </div>
  );
}
```

## 3 页逐页 spec（你只写分配给你的那一页）

### Agents（多 Agent 协作 · `agents:read`）— 数据 `AGENTS` `AGENT_MESSAGES` `AGENT_KPIS`
- KPI：AGENT_KPIS（注册 Agent / 今日调用 / 平均成功率 / 协作中）。
- **签名 = Agent 花名册 + 实时协作消息流**：
  - 左 `<Panel title="Agent 花名册">`：AGENTS（5）卡片列表，每张 = name、role、model(`TelePill`)、status(`RunStateChip`)、calls(tnum)、successRate(用 `MeterBar` pct + label)、lastMsg(text-3 一行)。`status==='running'` 的卡片 border 电光青高亮。点选某 agent → 记 selId 高亮其相关消息。
  - 右 `<Panel title="协作消息流">`：AGENT_MESSAGES 时间线，每条 = `from` → (ArrowRight) `to`、content、at。选中 agent 时把 from/to 含它的消息高亮（其余降透明度）。体现 agent 之间状态机式协作。
  - 真 ECharts：各 Agent 调用量（calls）横向条形 **或** 成功率对比条形；柱色 `accent()`/`chanColor('--cN')` 预解析，圆角柱，draw-in。
- 体现"多 agent 分工协作完成一次反欺诈调查"。

### Tools（工具 & MCP 市场 · `tools:read`）— 数据 `TOOLS` `TOOL_KPIS`
- KPI：TOOL_KPIS（已接入工具 / MCP server / 今日调用 / 平均时延）。
- **签名 = 工具 / MCP 市场（marketplace 卡片网格）**：
  - 顶部 `Segmented` 按 kind 筛选：全部 / MCP / 内置(builtin) / API / 模型(llm)。
  - TOOLS（8）→ `.tool-card` 网格（`gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))'`，gap 12）。每张：左上 kind 图标（mcp→`Plug`/builtin→`Box`/api→`Code`/llm→`Sparkles` lucide）+ name + kind `StatusBadge`(mcp=info/builtin=muted/api=good/llm=warn 自定)；category `tag`；desc(text-3)；底部一行 calls(tnum)/latencyMs/successRate(MeterBar 小)。**未接入**（`installed===false`，t7/t8）：卡片降透明 + 右下"一键接入"btn（点击 `toast('已接入 …','success')`）；已接入显示 `StatusBadge('已接入','good')`。
  - 真 ECharts：各工具调用量条形 **或** 按 category 分布环形（doughnut）；色 `chanColor` 预解析。
- 体现"MCP / 内置 / API / 模型 四类可插拔编排"。

### Deploy（发布管理 · `deploy:read`）— 数据 `DEPLOYMENTS` `DEPLOY_KPIS`
- KPI：DEPLOY_KPIS（生产工作流 / 总 QPS / 灰度中 / 平均成功率）。
- **签名 = 发布 / 版本管理（部署表 + 环境/灰度/回滚）**：
  - `<Panel>` 内 `table.tbl`：列 = 工作流 / 版本(`tag-mono`) / 环境(生产=success/灰度=warning/测试=info 的 `Badge` 或 chip) / 状态(live→run-done / paused→run-idle / rollback→run-error 的 `.run-chip`) / endpoint(`mono` text-3) / QPS(td-num) / P95(td-num，`${(p95Ms/1000).toFixed(1)}s`) / 成功率(td-num %) / 部署时间 / 操作。
  - 操作列按状态给按钮：live→「灰度」「回滚」；paused→「发布」。点击 `toast('…','info')`（mock）。数字 `td-num tnum` 右对齐。
  - 真 ECharts：各部署 QPS 条形 **或** 成功率对比条形（生产/灰度并存可视）；色 `accent()`/`runStateColor` 预解析。
  - 可加一行环境分布小环形或 KPI 强调。
- 体现"生产 + 灰度并存、一键回滚"的发布治理。

## 验收（每页自查 · 写完必跑）
`npm run build` 必须绿（`tsc -b && vite build` 零报错）；电光青是唯一 chrome accent；数字 tabular；图表真 ECharts 且 canvas 色已预解析；无 emoji / 无裸 var() 进 canvas / 无 border 简写长写混用 / import 全用到 / 列表 key 稳定。**别动其它页面、共享组件、theme.css、mockData**（只写你那一页）。
