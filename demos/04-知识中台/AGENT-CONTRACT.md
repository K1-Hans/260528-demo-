# 智库 企业知识中台 · 页面 Agent 契约（必读后再写页）

> 你负责写**一个** `src/pages/*.tsx` 页面。照它写就能编译通过 + 视觉一致。#1 铁律：**极致审美**。
> 这是对标 Glean 的**可信知识层**：编辑式档案馆气质，护城河 = ① 权限感知 ② 可溯源。

## 0. 视觉签名「Indigo Atlas · 靛蓝档案」（一句话记牢）
**暖灰羊皮纸底 + 靛蓝索引色 + 衬线知识正文 + 点阵图谱画布。** 颜色语义：🔵 靛蓝 `var(--gold)` = 索引/可信/选中（唯一 hero accent）· 🟢 绿 `var(--emerald)` = 在你权限内/可溯源 · 🟡 琥珀 `var(--warning)` = 受限锁。**一页一 accent 锁（靛蓝）**。被引用的知识/AI 答案正文用衬线（`className="t-answer"` 或 `serif`）；UI chrome 用 sans。

## 1. 技术栈 / 导入路径（错了就编译失败）
- React 19 + TS + Vite + ECharts 5 + react-router-dom 7 + lucide-react。默认导出一个组件。
- 页面在 `src/pages/` **扁平**目录，导入一律 `../`：`../components/...`、`../lib/...`、`../contexts/...`、`../types`。**不要 `../../`**。
- 全 mock，数据**只从 `../lib/mockData` 取**，类型从 `../types` 取。**禁 lorem / "Acme"**，用既有金融投研业务数据（脱敏：无真实客户名）。

## 2. 权限感知（本 demo 灵魂 · 你的页面也要体现）
- `const { currentRole } = useAuth();` → `currentRole.clearance`（1 公开/2 项目/3 受限/4 机密）。
- `import { canAccess } from '../lib/mockData'` → `canAccess(clearance, item.level)` 判可见。超密级项**显灰锁占位**（`className="locked"` + `lock-chip`）或计入"已过滤 N 条"横幅（`filter-banner` 类），**不要直接删掉不提**。
- 切角色时数据应实时变（从 currentRole.clearance 派生即可，React 自动重渲）。

## 3. 可溯源（共享件，直接用）
`import { AnswerBody, CiteRef, CitationCard, TrustBar, SourceIcon } from '../components/Citation'`
- `<AnswerBody turn={ChatTurn} onActivate={(n)=>...} onJump={(c)=>...} />` — 渲染衬线答案 + 句末 `[n]` 角标，hover 浮溯源卡。
- `<TrustBar count={3} inScope={100} />` — 绿色信任条「X 来源 · 100% 在你权限内」。
- `<SourceIcon source={SourceType} />` — 来源图标。
- `<CitationCard cite={Citation} onJump={...} />` — 溯源卡（缩略+文档名+路径+密级徽标+置信+跳原文）。

## 4. 知识图谱（共享件）
`import GraphCanvas from '../components/GraphCanvas'`
`<GraphCanvas nodes={GRAPH_NODES} edges={GRAPH_EDGES} clearance={clearance} highlightId={id|null} onNodeClick={(node)=>...} height={420} />`
力导向 + 权限灰锁 + 高亮联动，已封装好。知识图谱全屏页直接用它（点节点联动右栏详情）。

## 5. 页面骨架（照抄）
```tsx
import { PageHeader, Card, StatCard, SectionTitle, Badge, EmptyState, ProgressBar } from '../components/ui';
import { StatusBadge, Toolbar, Field, Drawer, Modal, toast } from '../components/kit';
import { DataTable, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, trust, sem, areaGradient, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { XXX } from '../lib/mockData';

export default function PageName() {
  const { currentRole } = useAuth();
  return (
    <div className="page">
      <PageHeader title="标题" subtitle="一句具体专业副标（无赋能/无缝/一站式）" actions={/* 按钮 */} />
      {/* 卡片区：发丝线分区 + 11px 大写灰 SectionTitle；卡片加 className="card reveal reveal-2" */}
    </div>
  );
}
```

## 6. 图表（真 ECharts，禁假 div 条）
`<Chart build={() => OPTION} height={280} deps={[...]} />`，build 闭包内实时读 CSS 变量（主题切换自动重绘）。
- 颜色：主序列 → `accent()`(靛蓝) · 可信/达标 → `trust()`(绿) · 受限/告警 → `sem('restricted')`/`sem('blocked')` · 多序列用调色板默认。
- 趋势细线 + `areaGradient(accent())`；柱用圆角 `itemStyle:{borderRadius:[4,4,0,0]}`；旭日/Treemap/日历热力均真 ECharts。
- `baseOption()`/`axisStyle()` 已配好字体/网格/tooltip。

## 7. 反 AI-slop 红线（ship 前逐条过）
- [ ] 一页一 accent（靛蓝）；绿只给"在权限内/可溯源"、琥珀只给"受限"；**无 AI 紫发光、无霓虹**。
- [ ] 数字 `className="mononum"` 或 `tnum` 对齐；知识/答案正文用衬线 `t-answer`/`serif`。
- [ ] 图表全真 ECharts，零假 div 条；空态用 `EmptyState`。
- [ ] UI chrome 全 lucide 图标，**无 emoji**（受限锁可用 lucide `Lock`）。文案工程化具体。
- [ ] 间距 4px 网格；`.card`；发丝线分区；hover/focus 到位；暗+亮两主题不破（只用 CSS 变量）。

## 8. 你的页面任务
见 spawn prompt。只写指定那一个 `src/pages/*.tsx`，**不要碰**共享文件/其他页面/mockData/types（缺数据在你页面内补 const，但优先用 mockData 既有导出）。
