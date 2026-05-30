# 销售策略 AI 工作台 · 高级感设计体系（DESIGN.md）

> 本项目 #1 优先级 = 极强交互审美。本文是全程开发与并行 agent 的**统一设计契约**。任何页面落地前先读本文，任何视觉决策以本文为准。
> 哲学根基：Jobs「把人类文化注入工程，否则就是 no spirit」· Rams「Less but better」· TasteSkill 反 AI-slop。
> 对标：超越 `jieli2026/sales-strategy-ai`（「极夜深绿金」暗色单主题，CSS 进度条无真图表，5 页空占位）。

---

## 1. 高级感关键词（mood vocabulary）

设计这套系统时脑中默念的词，每个组件都要对得起它们：

- **沉稳的指挥感（Quiet Command）** — 作战室的克制权威，不喧哗；信息密集但呼吸感强。
- **精密仪器（Precision Instrument）** — 像高端仪表盘/瑞士机械：刻度精确、数字用等宽对齐、1px 发丝线。
- **克制的奢华（Restrained Luxury）** — 金/铜是稀缺点缀不是涂满；大面积高级中性灰 + 一处恰到好处的光。
- **数据为先（Data-Forward）** — 数字是主角，图表是真的（ECharts），有动态绘制感。
- **编辑式精致（Editorial Refinement）** — Linear/Stripe/Notion 级的排版节奏、网格、留白。
- **丝滑（Buttered）** — 一切过渡有缓动曲线，进场有节奏，绝无生硬跳变。

**反面词（绝不出现）**：廉价、模板感、AI 紫发光、花哨、塞满、生硬、占位糊弄。

---

## 2. 双主题色彩系统（超越点①：原 demo 仅暗色）

默认 **Dark「Command Graphite」**（升级原作气质），并提供 **Light「Studio Porcelain」**（中台后台编辑式高级感，Linear/Stripe 调性）。一键切换，token 同构。

### 2.1 Dark · Command Graphite
```
--bg-sunken:   #07090B
--bg-base:     #0B0D11   /* 冷调石墨，非纯黑 */
--surface-1:   #121620
--surface-2:   #181D28
--surface-3:   #212734
--hairline:    rgba(255,255,255,0.07)
--hairline-strong: rgba(214,188,130,0.20)   /* 金调发丝线 */

--text-1: #ECEEF1   --text-2: #9AA3AF   --text-3: #5C6675   --text-inverse:#0B0D11

/* 稀缺金 + 森林绿（继承原作 DNA，更精炼） */
--gold:        #D6BC82   --gold-bright:#F0DBA6   --bronze:#A8814A   --gold-dim:#3A3320
--emerald:     #34C892   --emerald-deep:#0F5C43  --emerald-dim:#0C2A20
--gold-glow:   rgba(214,188,130,0.12)
```

### 2.2 Light · Studio Porcelain
```
--bg-sunken:   #EEECE6
--bg-base:     #F6F5F1   /* 暖瓷白/骨色，非纯白 */
--surface-1:   #FFFFFF
--surface-2:   #FBFAF7
--surface-3:   #F1EFE9
--hairline:    rgba(20,22,28,0.09)
--hairline-strong: rgba(138,102,47,0.28)

--text-1: #1A1D23   --text-2: #5A636E   --text-3: #8A929C   --text-inverse:#FFFFFF

--gold:        #9A6B2F   --gold-bright:#B5853F   --bronze:#7D5621   --gold-dim:#E8DEC8
--emerald:     #0E7A53   --emerald-deep:#0B5C3E  --emerald-dim:#E3F0E8
--gold-glow:   rgba(154,107,47,0.08)
```

### 2.3 语义色（双主题通用，亮度微调）
```
--success:#2FB87A  --warning:#E0A52E  --danger:#E25563  --info:#3E8FE0
```

### 2.4 数据可视化调色板（ECharts 自定义 theme · 和谐非彩虹）
有序序列 8 色：`金 #D6BC82 · 翡翠 #34C892 · 天青 #5AA2F0 · 暖橙 #E0934A · 玫瑰 #E2666E · 紫晶 #9C8CF0 · 青蓝 #46C5C0 · 灰 #8A929C`
- 单序列默认金；正负 = success/danger；竞品用品牌色（问界#E8913A 华为#CF2020 蔚来#00AAFF 小鹏#3A6AFF 比亚迪#1A8A3A 腾势#6B4FE8 理想#D6BC82）。
- **色彩锁**：每页一个主 accent（金），不在第 7 屏冒出蓝色 CTA。

---

## 3. 排版系统

- **字体**：Latin/UI/数字 = `"Geist","Outfit",system-ui`；CJK = `"PingFang SC","Source Han Sans SC"`；等宽数字 = `"Geist Mono",ui-monospace`。**禁默认 Inter**（TasteSkill 红线）。
- **数字铁律**：所有指标/表格数字开 `font-variant-numeric: tabular-nums`，对齐如仪表。大数字用 mono 或 tabular。
- **类型刻度**（px / line-height / weight / tracking）：
  | token | size | lh | weight | tracking |
  |---|---|---|---|---|
  | display | 34 | 1.1 | 800 | -0.02em |
  | h1 | 24 | 1.25 | 700 | -0.01em |
  | h2 | 19 | 1.3 | 700 | -0.01em |
  | h3 | 16 | 1.4 | 600 | 0 |
  | body | 14 | 1.6 | 400 | 0 |
  | small | 13 | 1.5 | 400 | 0 |
  | label | 11 | 1.4 | 600 | 0.10em uppercase |
- 标签/分区标题 = 11px 字距 0.1em 大写灰（继承原作的 section-title 但更精）。

---

## 4. 间距 · 圆角 · 层级

- **间距**（4px 基准）：4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 72。页面 padding 28–32，卡片 gap 12–16。
- **圆角**：sm 8 · md 12 · lg 16 · xl 22 · pill。卡片默认 14。**禁 `rounded-full` 大容器**（TasteSkill）。
- **层级/阴影**：
  - Light：`--elev-1: 0 1px 2px rgba(20,22,28,.04), 0 2px 8px rgba(20,22,28,.05)`；`--elev-2: 0 8px 28px rgba(20,22,28,.10)`。
  - Dark：靠 surface 提亮 + 发丝线 + 极淡内发光；hover `0 8px 32px rgba(0,0,0,.45)` + border 提亮。
  - 阴影极淡、扩散大、低透明度（minimalist-ui 红线：`shadow-lg` 禁用）。

---

## 5. 动效原则（超越点②：原 demo 几乎无动效）

- **时长**：micro 120ms · base 200ms · enter 320ms · chart-draw 600–900ms。
- **缓动**：默认 `cubic-bezier(0.22, 1, 0.36, 1)`（ease-out-expo 感）；hover `ease`。
- **进场**：页面/分区 mount 时 8–16px 上浮 + 渐显，按序 stagger 40ms；KPI 数字 **count-up**；图表 **draw-in**。
- **微交互**：卡片 hover 抬升 1px + border 提亮 + 极淡光；按钮按压 0.97；nav 切换 active 指示条滑动。
- **页面切换**：路由切换内容区淡入上浮 180ms。
- `@media (prefers-reduced-motion: reduce)` 全部降级为即时。

---

## 6. 数据可视化风格（超越点③：原 demo 只有 CSS 进度条）

统一 ECharts 自定义 theme（透明背景、发丝线网格、tabular 数字、金色 hover 高亮、圆角柱、渐变面积线、无 3D 无阴影滥用）。各模块至少一张真图表：
- 指挥大屏：销售**漏斗**（线索→留资→到店→试驾→订单→交付）、订单/交付**双线趋势**、车型完成率**条形**、区域**热力/地图**、竞争**雷达**。
- 竞品：销量**排名条** + 价格-销量**散点** + 趋势 sparkline。
- 补贴：城市**地图标注** + 金额分布。
- 市场五看：宏观指标卡 + 行业增速线 + 份额饼/旭日。
- VOC：情感**环形**、平台来源**堆叠**、热词**词云/条**、时间舆情线。
- 目标管理：BP vs 实际**子弹图/进度**、月度达成**日历热力**。

---

## 7. 组件标准

- **AppShell**：左侧 220px 侧边栏（深色恒定）+ 顶栏（面包屑 + 全局搜索 + ⌘K 命令面板 + 主题切换 + 通知 + 用户）。超越点④：原作只有侧栏无顶栏。
- **Card**：surface-1 + 14 圆角 + 发丝线 + 20px padding；hover 抬升。
- **StatCard**：label(11 大写) + 大数字(tabular, count-up) + 环比 trend chip + 可选 sparkline。
- **DataTable**：发丝线分隔、表头 11px 大写灰、行 hover、数字右对齐 tabular、可排序、空态优雅。
- **Button**：primary（金渐变描边/实底）· ghost · danger；icon 一律 lucide-react，strokeWidth 1.75 全局统一。
- **Badge/Tag/Chip**：语义色 12% 底 + 实色字。
- **CommandPalette（⌘K）**：跨模块跳转/搜索（超越点⑤）。
- 空态、loading skeleton、hover、focus-visible 全部设计到位，不留毛边。

---

## 8. 反 AI-slop 红线（TasteSkill · 逐条 ship 前自检）

- [ ] 无 AI 紫发光、无随机霓虹渐变（金是唯一 hero accent）
- [ ] 无千篇一律 glassmorphism 涂满（仅顶栏/弹层极淡背板）
- [ ] 数字全 tabular-nums，图表是真 ECharts 不是假 div 条
- [ ] 真实理想汽车业务数据，无 lorem ipsum / "Acme Corp"
- [ ] UI chrome 无 emoji（用 lucide 图标）
- [ ] 文案具体专业，无「赋能/无缝/一站式/next-gen」陈词
- [ ] 一页一 accent 锁定；暖/冷灰不在同页混用
- [ ] 间距走 4px 网格；发丝线统一；圆角统一

---

## 9. 对原 demo 的差异化超越点（验收对照）

| # | 原 demo | 本作 |
|---|---|---|
| 1 | 仅暗色 | **双主题** Dark/Light 一键切换 |
| 2 | CSS 进度条，无真图表 | **ECharts 全套**：漏斗/趋势/雷达/地图/词云/子弹图 |
| 3 | 几乎无动效 | **进场/count-up/draw-in/微交互**全套缓动 |
| 4 | 6 建 + 5 空占位 | **11+ 模块全做** + 新增**用户声音 VOC** |
| 5 | 仅侧栏 | 侧栏 + **顶栏 + ⌘K 命令面板 + 全局搜索 + 主题切换** |
| 6 | 基础排版 | **精密类型刻度 + tabular 数字 + 编辑式留白节奏** |
| 7 | 基础表格/卡片 | 可排序表/空态/skeleton/丰富 hover 态 |
| 8 | 静态登录 | 登录品牌动效 + 角色切换体验 |

**验收标准**：随便打开任一页，第一眼「这比原作贵一个档次」；功能它有的我全有且更深；新增模块自然不突兀。
