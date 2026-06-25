# B1 · AI 数据中台 · 页面开发合同（演算台 · Ledger Studio）

> 并行 agent 各写一页时的统一契约。严格复用既有设计系统/组件/token，**不新造设计系统**。

## §0 调性（独立 · 演算台）
- **演算台 · Ledger Studio**：冷中性演算纸（light 主场）+ 细网格 + **等宽 mono 数字** + **演算蓝 `--gold`** hero（唯一装饰强调）。暗副场 Slate Console。
- 灵魂 = **"答不了报错，绝不返回错数"**：每个查询结果带**可信度 4 阶标签**（已覆盖/部分/超范围/拒答）。
- 范式 = 问数 notebook（cell 式），**不是** ④ 知识的自由图谱画布。语义层/血缘走**结构化卡 + 左→右 DAG**，非力导向。
- 延续旗舰 `src/pages/Ask.tsx` 的气质（cell / 可信度 / SQL 块 / 表格 / 演算蓝）。

## §1 反 AI-slop 红线（逐条 ship 前自检）
- [ ] hero 只用演算蓝 `var(--gold)`；可信度走 `--conf-covered/partial/out/refused`；无 AI 紫 / 霓虹 / 玻璃涂满
- [ ] 数字全 tabular（`.mononum` / `.tnum` / `kpi-value` / `td-num`）
- [ ] 图表是**真 ECharts**（`<Chart build={()=>option}/>`），不是假 div 进度条
- [ ] 真实金融业务数据（AUM / 不良率 / CAC / 留存 / 放款），无 lorem / "Acme"
- [ ] UI chrome **无 emoji**，一律 `lucide-react`
- [ ] 文案具体专业，无「赋能 / 无缝 / 一站式 / next-gen」陈词
- [ ] 4px 网格间距；发丝线 `var(--hairline)`；圆角用 `var(--r-*)`
- [ ] 脱敏：机构用「示例银行 / 示例消金」，无真实机构/真客户 PII

## §2 工程约束（违反 = build 红 / 运行时报错）
- 只改你负责的**那一个** `src/pages/X.tsx`，别动别的文件
- import 必须干净无未用
- 列表 `key` 用**稳定 id**（非 index）；`arr.map(x=><>…</>)` 短语法 Fragment **不能带 key**（要 key 用 `<Fragment key>`）
- 不在 `setState` updater 里放 `id++` 副作用；**inline style 不混用 `border` 简写 + `borderLeft/Top` 长写**（全用长写）
- **ECharts canvas 的 `itemStyle.color` 不能吃 `var(--x)`** → 必先 `cssVar('--x')`（从 chartTheme import）预解析再拼 color-mix；图表色一律走 `cssVar()/sem()/accent()`
- 根 `<div className="page page-wide">`；首块 `<PageHeader/>`；RBAC 由 Layout 处理，页面内不判权限

## §3 组件 API（从这些 import）
- `../components/ui`：`PageHeader({title,subtitle,actions})` · `Card` · `StatCard({label,raw,unit,change,spark,decimals,icon})` · `Sparkline({data,color})` · `Segmented<T>({options,value,onChange})` · `ProgressBar({pct,color})` · `Badge` · `EmptyState` · `SectionTitle`
- `../components/kit`：`StatusBadge({status,tone})` · `RiskBadge` · `MeterBar({pct,color,label})` · `Field` · `Drawer` · `Modal` · `toast(msg,type)`
- `../components/sig`：`ConfidenceChip({level})`（可信度 4 阶 · 灵魂）· `Panel({title,icon,right,children,bodyClass})` · `SqlBlock({sql})`（SQL 高亮）
- `../components/Chart` default：`<Chart height deps={[...]} build={()=>echartsOption} />`
- `../lib/chartTheme`：`baseOption()` · `axisStyle()` · `accent()` · `sem('pass'|'review'|'block'|'brand'|'info')` · `areaGradient(color)` · `cssVar('--x')` · `DRAW`
- 数字格式：`.toLocaleString()` + `.mononum`；可信度色 `var(--conf-*)`；语义 pill `.sem-pill.dim/.measure/.entity`；DAG 节点 `.dag-node.src/.model/.metric`；指标卡 `.metric-card`；账本网格 `.ledger-grid`

## §4 数据源（从 `../lib/mockData` import · 严格按 types 字段，别编字段）
- `QUERY_HISTORY: QueryHistoryRow[]`（History）· `SEMANTIC_GROUPS: SemanticEntityGroup[]`（Semantic）
- `LINEAGE_NODES: LineageNode[]` + `LINEAGE_EDGES: LineageEdge[]`（Lineage）
- `GOV_POLICIES: GovPolicy[]` + `GOV_AUDITS: GovAudit[]`（Governance）· `METRICS: MetricDef[]`（Metrics）
- 类型见 `src/types/index.ts`（含 `Confidence` / `CONFIDENCE_LABEL` / `CONFIDENCE_DESC`）

## §5 各页规格
- **History（查询历史）**：历史问数表（QUERY_HISTORY：问题/用户/角色/时间/可信度 ConfidenceChip/行数/耗时/复跑数，数字 tabular 右对齐，可按可信度筛 Segmented）。顶 KPI（今日查询/已覆盖占比/平均耗时/拒答数）。副：可信度分布 ECharts 饼/环 + 高频复跑 top 榜。复用 ConfidenceChip。
- **Semantic（语义层建模）**：左=实体组列表（SEMANTIC_GROUPS：customer/loan/acquisition，每组 coverage 覆盖率条）；中/主=选中实体的字段表（SemanticField：name/sqlName mono/kind 用 `.sem-pill` dim/measure/entity/dataType/desc/governed 已治理徽章）；右/副=语义层覆盖率 ECharts（各实体 coverage 横条）。**结构化卡，非图谱**。
- **Lineage（数据血缘）**：**左→右结构化 DAG**（LINEAGE_NODES 按 layer 0 源→1 明细→2 汇总→3 指标 分列，用 `.dag-node` src/model/metric class + health ok/stale/broken 色；LINEAGE_EDGES 用 SVG 连线连各列节点）。点节点高亮上下游。顶 KPI（节点数/stale 数/平均新鲜度）。强调断流 stale 影响传导（src_loan stale → 不良率 metric stale）。
- **Governance（权限治理）**：主=治理策略表（GOV_POLICIES：resource/field/classification 公开-内部-敏感-机密 分级色/mask 脱敏类型/appliesTo 适用角色/desc）；副=分级分布 ECharts + 访问审计流（GOV_AUDITS：user/action/resource/at，level 色）。强调 GOV-07 拒明细导出（与旗舰拒答呼应）。
- **Metrics（指标库）**：认证指标卡网格（METRICS：name/enName/value 大 mononum/unit/change 环比 chip/Sparkline 趋势/owner/freshness 新鲜度/certified 认证金标准徽章/definition 口径/formula 公式 mono）。顶 KPI（认证指标数/平均新鲜度等）。点卡展开口径+公式+血缘 owner。

## §6 验收
tsc -b 绿 · console 0 报错 · 真 ECharts · 可信度标签贯穿 · 演算蓝 hero · 数字 tabular · 脱敏 · 延续 Ask.tsx 调性。
