# 增势 · 营销增长中台 — 并行开发合同（AGENT-CONTRACT）

> 你是页面开发 agent。本文 + 共享文件是你的唯一合同。**先读 3 个参考文件再动手**：
> `src/pages/Campaign.tsx`(旗舰范例·照它的质量与写法)、`src/components/ui.tsx`+`src/components/sig.tsx`(组件 API)、`src/types/index.ts`+`src/lib/mockData.ts`(数据契约)。

## 设计系统（必须严格遵守）
- **调性**：Studio White 亮台（默认 light，`--bg-base #F7F7F9` 画廊白）+ **增长品红 `--gold = #D6336C`**（唯一 hero accent · 稀缺点缀不涂满）。Dark 主题自动跟随 token。
- **范式**：营销操盘 · 数据密集但呼吸感强 · 编辑式精致（Linear/Stripe 级排版节奏）。
- **字体**：Geist + Geist Mono（数字）；CJK PingFang。数字一律 `className="mononum"` 或 `tnum`（tabular-nums）。
- **4px 网格**：间距 4/8/12/16/20/24；卡片 padding 14-16，gap 12-14。圆角用 token（`--r-md` 10 / `--r-lg` 13）。
- **动效**：进场 `reveal` + `d1..d4` stagger；KPI count-up（StatCard 自带）；图表 draw-in（用 `DRAW`）。

## 反 AI-slop 红线（ship 前逐条过 · 违反 = 返工）
1. **一页一 accent = 品红**。语义色仅 success(绿)/warning(琥珀)/danger(红)/info(蓝)；渠道用 `--c1..c8` 编码。无 AI 紫、无霓虹、无玻璃涂满。
2. **数字全 tabular**（`mononum`/`tnum`）。
3. **图表全真 ECharts**（用 `<Chart build={()=>option} />`），禁假 div 进度条冒充图表（进度条只用于"进度/占比"语义，不冒充数据图）。
4. **ECharts canvas 里颜色一律 `cssVar('--x')` 预解析**，禁直接写 `'var(--x)'`（canvas 不认 CSS 变量 → 掉色）。itemStyle/lineStyle/areaStyle/label.color/axisLabel 全部走 `cssVar()`/`accent()`/`chanColor()`/`sem()`。
5. **inline style 禁混用 `border` 简写 + `borderLeft/Top` 长写**（同一 style 对象内）→ React 运行时报错。要么全简写要么全长写。
6. UI chrome **无 emoji**，图标一律 `lucide-react`（strokeWidth 默认）。
7. **真实业务文案**，无 lorem ipsum、无"赋能/无缝/一站式/next-gen"。
8. **脱敏**：品牌只用 mockData 里的 焕颜/轻盐/森野优选/优品惠 等通用名，用户 用户****，无真实电商/雇主名。图片用 mockData 里的 picsum 占位 URL（`creative.thumb`/`asset.thumb`）。
9. **列表 key 用稳定 id**（非 index）；`arr.map(x => <>…</>)` 短语法 Fragment 不能带 key，要 key 用 `<Fragment key>` 或具体元素。
10. **import 必须全部用到**（noUnusedLocals 开），写完自查无未用 import。

## 共享组件 API（直接复用，勿重造）
- `ui.tsx`：`<Card hover>` · `<PageHeader title subtitle actions>` · `<StatCard label raw unit change spark decimals icon delayClass>`(KPI·自带count-up) · `<TrendChip change>` · `<Sparkline data color>` · `<Badge color>` · `<Segmented options value onChange>` · `<ProgressBar pct color>` · `<EmptyState icon title desc>` · `<SectionTitle right>`。
- `sig.tsx`：`<Panel title icon right bodyClass>` · `<CampaignStatusChip status>` · `<ChannelPill channel sm>` · `<ComplianceBadge level>`(缩略图覆盖角标) · `<ComplianceTag level>`(内联) · `<RiskDot risk>`。
- `Chart.tsx`：`<Chart build={()=>option} height deps={[...]} />`（主题感知，自动重建）。
- `chartTheme.ts`：`cssVar('--x')` · `accent()`(品红) · `trust()`(绿) · `chanColor('--c1')` · `sem('growth'|'up'|'warn'|'down'|'info')` · `baseOption()` · `axisStyle()` · `areaGradient(color,opacity)` · `DRAW` · `ANIM` · `chartPalette()`。
- 签名 CSS 类（theme.css 已定义）：`.lane-track/.lane-bar/.lane-seg-pre|main|post` · `.creative-card/.creative-thumb/.creative-thumb-sq/.creative-meta/.creative-compliance/.creative-gen-badge` · `.channel-pill/.channel-dot` · `.rule-row/.rule-conj` · `.gate-row/.gate-pass/.gate-block` · `.metric-card` · `.asset-tile` · `.cmp-chip`。

## 页面骨架（统一）
```tsx
export default function X() {
  return (
    <div className="page page-wide">
      <PageHeader title="…" subtitle="…" actions={<span className="tag tag-mono">…</span>} />
      {/* KPI 带：4 个 StatCard */}
      {/* 主体：真 ECharts + 数据表/卡片网格 + 签名交互 */}
    </div>
  );
}
```
每页必须有：① PageHeader ② 4 个 KPI（StatCard，数据用 mockData 的 *_KPIS）③ 至少 1 个真 ECharts ④ 该页签名交互（见下）⑤ 空态/hover 考虑到。

## 5 页逐页 spec
### Studio（创意工坊 · `studio:read`）— 数据 `CREATIVES` `STUDIO_KPIS` `CHANNEL_MAP`
- KPI：STUDIO_KPIS（本月生成/AI占比/合规通过率/待复核）。
- **签名 = 创意缩略图网格**（`.creative-card` + `<img className="creative-thumb">` 用 `c.thumb`，wide 比例用 `creative-thumb`，sq 用 `creative-thumb creative-thumb-sq`），右上 `<ComplianceBadge level={c.compliance}>`，左上 AI 生成角标（`.creative-gen-badge`，`c.genBy==='ai'` 显示 `model`）。卡下 meta：标题 + 渠道 pill + CTR。
- 左侧或顶部：多模态生成入口（一个"输入 prompt → 生成"的 mock 面板，含风格/比例/渠道选择 + 生成按钮，纯展示）。
- 合规筛选 Segmented（全部/合规/待复核/驳回）。点驳回的卡显示 `complianceNote`（如"极限低价"违反广告法）——体现品牌合规校验。
- 至少 1 真 ECharts：各渠道素材产量或 CTR 对比条形（用 chanColor 编码）。

### Cdp（人群圈选 · `cdp:read`）— 数据 `SEGMENTS` `SEGMENT_SUNBURST` `CDP_KPIS`
- KPI：CDP_KPIS。
- **签名 = 结构化条件构建器（rule-stack，非画布）**：选中人群左侧展示 `.rule-row` 列表（字段/操作符/值 + `.rule-conj` 显示 AND/OR），下方"预估覆盖人数"实时数字 + 可触达率 ProgressBar。**严禁做成自由拖拽图谱画布**（那是 ④ 知识中台，撞车）。
- 人群列表（左侧可选）：SEGMENTS 各项（名称/规模/来源/更新时间/reach）。
- **真 ECharts 旭日图**（sunburst）用 `SEGMENT_SUNBURST`，节点色用 `chanColor(node.colorVar)` 预解析。
- 顶部 NL 建群入口（mock 输入框"用大白话描述人群"→ 生成规则）。

### Ads（投放控制台 · `ads:read`）— 数据 `AD_GROUPS` `HEAT_CELLS` `HEAT_HOURS` `HEAT_CHANNELS` `ADS_KPIS` `CHANNELS`
- KPI：ADS_KPIS。
- **签名 = 投放热力矩阵**：真 ECharts heatmap（渠道 × 时段，`HEAT_CELLS`），visualMap 用品红→浅色阶（`accent()` 预解析）。
- 广告组表（`AD_GROUPS`）：DataTable 风格，列=广告组/渠道(ChannelPill)/状态/预算/消耗/ROAS/CPA/转化；每行带 **AI 调优建议**（`suggestion`，品红高亮 icon）；可"采纳/忽略"按钮。状态 learning/paused 用语义色。
- 预算分配：各渠道预算占比（真 ECharts 饼/环形 或横向堆叠，CHANNELS spend）。
- 体现"实时调优"：ROAS 超目标的组建议加预算，低于阈值的已暂停。

### Attribution（归因 ROI · `attribution:read`）— 数据 `SANKEY_NODES` `SANKEY_LINKS` `FUNNEL_STAGES` `ATTR_CHANNEL_COMPARE` `ATTRIBUTION_MODELS` `EXPERIMENTS` `ATTR_KPIS`
- KPI：ATTR_KPIS。
- **签名 = 多触点归因桑基图**：真 ECharts sankey（`SANKEY_NODES`/`SANKEY_LINKS`），节点色 `chanColor(node.colorVar)` 预解析，触点流向 加购→首单→复购。
- 归因模型切换 Segmented（`ATTRIBUTION_MODELS`：末次/首次/线性/时间衰减/DDA），切换时"末次 vs DDA"渠道贡献对比条形（`ATTR_CHANNEL_COMPARE`，体现末次高估直效、DDA 还原种草价值）。
- 真 ECharts 转化漏斗（`FUNNEL_STAGES`）。
- A/B 实验卡（`EXPERIMENTS`）：变体 CVR 对比 + lift + 置信度，winner 高亮。

### Assets（资产库 · `assets:read`）— 数据 `ASSETS` `ASSET_KPIS`
- KPI：ASSET_KPIS。
- **签名 = 资产网格**（`.asset-tile` + 缩略图 `a.thumb`）：按类型筛选（图片/视频/文案/模板/Logo）Segmented；卡显示 名称/标签 tag/复用次数/大小/合规（ComplianceTag）。
- 真 ECharts：资产类型分布（环形/条形）或复用 TOP 榜。
- 列表/网格切换；hover 显示操作（复用/下载，纯展示）；空态优雅。

## 验收（每页自查）
build 必须 `tsc -b && vite build` 绿；console 0 报错；红线 1-10 逐条过；品红是唯一 chrome accent；数字 tabular；图表真 ECharts 且 canvas 色已 cssVar 预解析。
