# AGENT-CONTRACT · AI 内容审核中台（demo ⑦）

> 并行 agent 按本合同各写一页。地基已由 lead 写好并 build 绿。**严格复用既有 token / 组件，不要新造设计系统。**

## 0. 身份 · 调性 · 范式（差异化双层 · 不可偏离）
- **调性 =「证物灯箱 · Forensic Lightbox」**：冷中性石墨暗主场（`#0B0D11`，纯冷无绿无暖，区别 ⑤⑥）+ **恒定暗媒体审片台**（媒体永远落在中性暗台判定）。气质 = 取证 / 警觉 / 克制。
- **范式 =「审片流水台」**：媒体前置 + 键盘高速 culling（锚 Frame.io / Photo Mechanic / Hive / Checkstep）。旗舰页 `Queue.tsx` 已实现，其它页延续这套媒体前置 + 风险阶语言的气质。
- **唯一装饰 hero = 取证青 `--gold`（值=#2BA8C9）**。风险用 **5 阶语义 ramp**：`--sev-safe / --sev-low / --sev-mid / --sev-high / --sev-critical`。红只做语义（高危/下架），**绝不当 hero**。`--qual` 金仅认证/合规徽章。
- 行业锚定：社交 / UGC 平台。🔒 **脱敏**：平台用「示例社区 / 云直播 / 示例短视频」，发布者「用户****」，**绝不放真实违规内容**；媒体一律安全占位（`sig.mediaUrl()` → picsum 安全图），违规靠叠加框选 + 标签模拟。

## 1. 反 AI-slop 红线（ship 前逐条自检）
- [ ] 无 AI 紫 / 霓虹；hero 只有取证青；风险色走 5 阶 ramp，不乱用
- [ ] 数字全 `font-variant-numeric: tabular-nums`（用 `.mononum` / `.tnum` 类或 StatCard）
- [ ] 图表是真 ECharts（`<Chart build={...}/>`），不是假 div 进度条（小比例可用 `<ProgressBar>`）
- [ ] UI chrome **无 emoji**，一律 lucide-react 图标
- [ ] 真实审核业务文案，无 lorem / "Acme"；文案具体专业，无「赋能/无缝/一站式」陈词
- [ ] 间距走 4px 网格；发丝线 / 圆角统一用 token；`.page.page-wide` 包裹
- [ ] **React 运行时**：列表渲染 key 用稳定 id（非 index）；`arr.map(x => <>…</>)` 短语法**不能带 key** → 要 key 用 `<Fragment key>`；别在 setState updater 里放 `id++` 等副作用；别同对象混用 `border` 简写 + `borderLeft` 长写

## 2. 设计 token 速查（`styles/theme.css`，双主题自动切换）
- 色：`--gold`(取证青hero) `--sev-safe/low/mid/high/critical` `--success/warning/danger/info` `--qual`(认证金) `--text-1/2/3` `--surface-1/2/3` `--hairline(-strong)` `--media-stage`(暗媒体台)
- 图表序列：`--c1..c8`（取证青领衔）
- 间距 `--space-1..18`(4px基) · 圆角 `--r-sm/md/lg/xl/pill` · 缓动 `--ease` · 时长 `--dur-micro/base/enter`
- 工具类：`.page .page-wide .card .card-hover .panel .label .mononum .tnum .reveal(-1..6) .badge .tag .chip .btn(.btn-primary/ghost/subtle/danger/ok/sm/icon) .input .tbl`

## 3. 可用组件（直接 import，勿重造）
- `components/ui`：`Card PageHeader StatCard TrendChip Sparkline Badge Segmented ProgressBar EmptyState SectionTitle`
  - `StatCard({ label, raw:number, unit?, change?, spark?:number[], decimals?, icon?, delayClass? })` —— 自带 count-up + Sparkline
- `components/kit`：`StatusBadge({status,tone:'good'|'warn'|'bad'|'info'|'muted'}) RiskBadge({level:'high'|'mid'|'low'}) Drawer Modal Field Toolbar MeterBar toast(msg,type)`
- `components/sig`（证物灯箱签名件）：
  - `Panel({title,icon,right,children,bodyClass?})` —— 带标题栏窗格（bodyClass 用 `panel-body` 或 `panel-body-0`）
  - `MediaStage({item:ModerationItem, height?, scanning?, allowReveal?, onReveal?})` —— **暗媒体审片台**，按模态分支（文本高亮/音频波形/图视频框选+扫描线/模糊保护）
  - `SeverityBadge({severity, showLabel?})` `ModalityChip({modality})` `VerdictBar({confidence, severity})` `StatLights({lights})` `TimeChip({seconds,countUp?,urgentBelow?})`
  - `mediaUrl(seed, w?, h?)` —— 安全占位图 url
- `components/Chart`：`<Chart build={()=>option} height={280} deps={[...]} />` —— 主题感知 ECharts。option 用 `lib/chartTheme` 的 `baseOption() axisStyle() accent() sem('pass'|'review'|'block'|'brand') areaGradient(color) DRAW` 拼。**透明底、发丝线网格、tabular、圆角柱、无 3D**。
- `components/Waveform`：音频波形（复用）。`components/DataTable`：通用表。

## 4. 数据源（`lib/mockData.ts` + 类型 `types/index.ts`）
- `MODERATION_ITEMS: ModerationItem[]`（12 条，多模态×多风险阶，旗舰已用）
- `MODERATION_POLICIES: ModerationPolicy[]`（10 条策略：code/name/category/severity/threshold/action/auto/basis[]/enabled/hits30d/precision/desc）
- `CATEGORY_STATS / REGION_HEAT / TREND_14D / DISPOSITION_FLOW`（态势大屏用）
- `APPEALS: Appeal[]`（6 条申诉：original/reason/slaHoursLeft/status/aiRecommend/decision）
- `SYNTHETIC_CASES: SyntheticCase[]`（5 条：syntheticProb/verdict/signals[]/hasLabel/frameScores）
- `AUDITOR_ROWS: AuditorRow[]`（6 条：throughput/accuracy/consistency/avgHandleSec/qcSampled·qcPassed/appealReverseRate）
- 类型常量：`SEVERITY_LABEL SEVERITY_CLASS MODALITY_LABEL DISPOSITION_LABEL ITEM_STATUS_LABEL`
- 角色：`ROLES`（moderator李澄 / qa_lead宋桥 / policy_ops韩沐 / compliance沈律）· `MOCK_USERS` · `PERMISSIONS`

## 5. 工程约束
- 每页 `export default function X()`，根 `<div className="page page-wide">…</div>`，首个块 `<PageHeader title subtitle actions?/>`。
- 进场动画用 `.reveal .reveal-1..6`；KPI 用 `StatCard`（自带 count-up）。
- import 干净（无未用，否则 tsc noUnusedLocals 报错）；`tsc -b` 必须绿。改完 lead 会跑全量 build + 真机逐屏验。
- RBAC 已在 Layout 处理（无权访问显 denied），页面内不用再判权限。
- 媒体永远用 `MediaStage` / `mediaUrl` 安全占位，禁直接放真实违规描述。

---

## 6. 每页规格（6 页 · 各写各的）

### `pages/Review.tsx` — 疑难复核工作台（perm review:read · moderator/qa）
升级 / 疑难内容的**深审**（比 Queue 更重证据与判例）。建议布局：左 = 升级队列（取 MODERATION_ITEMS 中 status `escalated`/`removed` + 高 severity）；中 = **大 MediaStage** + 多帧/多证据 + 完整命中策略 + AI 推理要点；右 = **相似判例**（mock 3-4 条历史判决 + 一致性）+ **处置编排**（维持/改判/上报 + 备注 + 留痕时间线）。强调"证据链 + 判例参照"。

### `pages/Policy.tsx` — 策略 / 分类体系（perm policy:read·policy_ops；policy:edit 可改）
`MODERATION_POLICIES` 驱动。左 = 10 类违规**分类体系树/列表**（按 category 分组 + severity 色）；中 = 选中策略详情（阈值 `threshold` + 处置动作 `action` + `auto` 开关 + `basis[]` 多法规徽章 DSA/标识办法/广告法/未保法 用 `.qual-badge`）；右/下 = 策略命中量 `hits30d` 排名条（Chart 横向柱）+ 准确率 `precision`。体现"分类体系 + 阈值 + 多法规基线"。

### `pages/Situation.tsx` — 风险态势大屏（perm situation:read · qa/policy/compliance）· **视觉最炸的一页**
全平台违规态势。建议：顶 KPI 行（今日命中/自动处置率/人审量/申诉率/高危占比）；**真 ECharts 满屏**：① 违规类型分布（`CATEGORY_STATS` 柱/旭日，按 severity 上色）② 14 天趋势（`TREND_14D` flagged/removed/appeal 多线 + 面积）③ 渠道热力（`REGION_HEAT` 柱/热力）④ 处置漏斗（`DISPOSITION_FLOW` 漏斗：AI初筛→自动处置→人审→确认→申诉→撤销）⑤ 审核员一致性（可选雷达/堆叠）。`page-wide` 多窗格大屏感。

### `pages/Appeal.tsx` — 申诉复核闭环（perm appeal:read·compliance/qa；appeal:act 可裁决）
`APPEALS` 驱动。左 = 申诉队列（按 `slaHoursLeft` 紧迫排序，负数=超时红，TimeChip/紧迫色）；中 = 选中申诉：原内容 MediaStage + 用户**申诉理由** + 原处置 `original` + **AI 建议 `aiRecommend`**；右 = 裁决面板（维持原判/撤销恢复/部分调整三按钮 + 备注 + SLA 倒计时 + 闭环留痕）。已裁决项显 reviewer/decision。强调"SLA 闭环 + AI 建议 + 留痕"。

### `pages/Synthetic.tsx` — 合成内容 / deepfake 检测（perm synthetic:read · policy/compliance）
`SYNTHETIC_CASES` 驱动。左 = 检测队列（verdict 三态 genuine/suspect/synthetic 色 + syntheticProb）；中 = 选中：MediaStage + **逐帧合成分**（frameScores 折线/柱 Chart）+ 合成总概率大数字；右 = **取证信号**（signals[]：人脸频域/光照/元数据/眨眼 —— 每条 name+score `MeterBar`/VerdictBar + desc）+ **《标识办法》核验**（hasLabel 是否带 AI 生成标识 → 合规/缺失徽章 `.qual-badge` 或 danger）。强调"取证信号 + 标识合规"。

### `pages/Auditor.tsx` — 审核员效能质检（perm auditor:read · qa）
`AUDITOR_ROWS` 驱动。顶 KPI（团队吞吐/平均准确率/平均一致性/申诉撤销率）；主体 = 审核员**效能表**（DataTable 或自绘：throughput/accuracy/consistency/avgHandleSec/质检 qcPassed·qcSampled/appealReverseRate，数字 tabular 右对齐，准确率/一致性用色阶或 ProgressBar）；副 = 一致性对比（Chart 柱/雷达）+ 质检抽审通过率。强调"质检 + 一致性 + 申诉撤销率（越低越好）"。
