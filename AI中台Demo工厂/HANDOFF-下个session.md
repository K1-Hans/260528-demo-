# 中台系统 demo 开发官 · Session Handoff(①②③⑤⑦⑧ 验收通过 · ④⑥ 自验待终验 · ⑨ 营销增长建设中 · 2026-06-23)

## 身份 · 起手必读 3 份
「中台系统 demo 开发官」(审美第一)。先读:
1. `~/Desktop/260528中台系统demo开发/CLAUDE.md`(操作宪法)
2. `~/Desktop/260528中台系统demo开发/DESIGN.md`(设计契约 + §8 反 slop 红线)
3. `~/Desktop/260528中台系统demo开发/AI中台Demo工厂/00-总规划-全景排序与选型.md`
> ⚠️ 总规划 §58「所有 demo 共用一套底只换 accent」**已作废** —— 见「差异化双层铁律」。

## 任务 · 高审美 mock 中台 demo 矩阵(Hans 转 B 端履历)· **已建 9 个**
- ① AI 客服中台 ✅ **验收通过**(暖象牙暖呼吸 · 实时指挥墙) `demos/01-客服中台` 5181
- ② AI 质检中台 ✅ **验收通过**(冷瓷卷宗 · 案卷台) `demos/02-质检中台` 5182
- ③ LLMOps 运营中台 ✅ **验收通过**(深空示波 · 键盘观测台) `demos/03-LLMOps` 5183
- ④ AI 企业知识中台 🟡 **已交付自验**(靛蓝档案 · 图谱画布) `demos/04-知识中台` 5184 — 本 session 全页复验 console 0,待 Hans 终验
- ⑤ AI 风控中台 ✅ **验收通过**(黑曜盘口 · 风险作战大屏) `demos/05-风控中台` 5185
- ⑥ AI 外呼/语音中台 🟡 **已交付自验**(Operator Midnight · 实时坐席墙) `demos/06-外呼语音中台` 5186 — 本 session 全 11 页复验 + 修了 border 报错 bug,待 Hans 终验
- ⑦ AI 内容审核中台 ✅ **验收通过(2026-06-22「过」)**(证物灯箱 · 审片流水台) `demos/07-内容审核中台` 5187 — 7 页 4 角色,媒体前置键盘 culling
- ⑧ AI 数据中台 ✅ **验收通过(2026-06-23「过」)**(冷演算纸 · 演算蓝 · 问数 Notebook) `demos/08-数据中台` 5188 — 6 页 4 角色,旗舰问数台 4 阶可信度"答不了报错";收口修了 Ask 旗舰图裸 var() 掉色 + index.html title 陈留 ④
- ⑨ AI 营销增长中台 🟠 **建设中(2026-06-23)**(Studio 亮台 · 增长品红 #D6336C · 活动排期编排泳道) `demos/09-营销增长` 5189 — 6 页 4 角色;地基+旗舰 Campaign(排期泳道+人审卡点)done,Studio/Cdp/Ads/Attribution/Assets 并行写中

## 🆕 差异化双层铁律(本项目灵魂 · 每个 demo 像不同产品)
两层都差异化:(1)视觉调性 (2)UX 交互范式(对标一个真实顶级产品的"操作方式")。9 个各异:
- ① 实时指挥墙(锚 Slack/Datadog) · ② 案卷 inbox(锚 Linear/Front) · ③ 键盘观测台 ⌘K+极简rail(锚 Datadog/Grafana) · ④ 图谱画布(锚 Figma/Obsidian/Glean) · ⑤ 风险作战大屏 密集多窗格+红黑盘口(锚 Bloomberg×SOC) · ⑥ 实时坐席墙(卡片墙呼吸+声波+双气泡转写,锚 Dialpad/Genesys) · ⑦ **审片流水台**(媒体前置暗台+框选高亮+取证青扫描+键盘 culling A/R/E/L,锚 Frame.io×Photo Mechanic×Hive/Checkstep) · ⑧ **问数 Notebook**(cell 式问数+4 阶可信度+SQL透明块,锚 Hex/Cortex Analyst) · ⑨ **活动排期编排泳道**(横向时间轴泳道+预热/正式/返场分段+人审卡点队列,锚 Braze/Amplitude/巨量引擎)
- ⚠️ ③⑤⑥⑦ 都暗系:靠**范式 + accent + 签名**区分,非只换底色。⑦ = 冷中性石墨 + 取证青 hero + 风险 5 阶语义 + **恒定暗媒体台**(亮主题下媒体仍在暗台判定 · Lightroom 式)。
- ⚠️ 亮系 ①②④⑧⑨ 靠 accent+范式 区分:① 暖象牙 · ② 冷瓷 · ④ 暖灰纸靛蓝 · ⑧ 冷演算纸演算蓝 · ⑨ = **明亮画廊白 + 增长品红 #D6336C**(唯一亮系暖品红,排期泳道+创意网格,反"墙/大屏/画布/notebook")。

## 五铁律
1. 极致审美 #1(独立调性+范式 · 反 slop:无 AI 紫/霓虹/玻璃涂满/电销红橙 · 数字 tabular · 真 ECharts · 真实业务文案无 lorem · UI 无 emoji 用 lucide · 一页一 accent · 4px 网格)
2. 95% 信心(Plan 后把「调性+范式+IA+配色」一句话同步 Hans 确认再 Build)
3. 逐个交付 + 审阅闸门(真机自验 + 截图 + 问「过吗?」)
4. **交付汇报开头先给可访问地址**(先 curl 确认活着)
5. **UI 决策前先查审美库**(28号 175源 + studio-design MCP)

## 🔒 脱敏铁律
- 消金类(①-⑥):禁 维小豆/维信/维小贷/百灵/4001601666;用 小云/示例消费金融/信用贷/坐席系统/400-800-1234。行业锚(还款/逾期/催收/合规/反欺诈/AML/回访/外呼)保留。
- 内容审核 ⑦(社交/UGC 域):平台用 示例社区/云直播/示例短视频,发布者 用户****,无真人 PII/真实违规内容;媒体一律安全占位(picsum)+ 框选标签模拟违规。

## 工程方法(①-⑦ 验证可复用)
`cp -Rc` 既有脚手架(暗系媒体类用 ⑥/⑤;图谱类用 ④;**token 名沿用 --gold 令共享组件零改,只换 theme.css 值**)→ 删上一 demo 专属页/组件 → lead 亲写 theme/types/mockData/nav/App/Layout/Login/签名件/旗舰 + AGENT-CONTRACT → 生成 stub → 并行 executor agent 各写一页(Workflow 分波≤3 写+反slop审) → **lead 自跑全量 build 收口 + 应用审查官红线** → 真机逐屏验(只留一个 server)→ nohup 交付。

## 踩坑(必看)
1. ⚠️ 交付 server 必 **Bash nohup 常驻**;preview MCP 起的绑工具会话,会话回收/中断就被杀。验证用 preview,交付地址用 nohup。
2. count-up/ECharts 入场 rAF,headless preview 冻在中途(截图显小数)→ 真机 focused 跑满,非 bug。
3. Layout `denied` 判定排除 '/'(交 Home 重定向到角色 landing,否则无总览权限角色卡死)。
4. ⚠️ `arr.map(x=><>…</>)` 短语法 Fragment **不能带 key** → tsc 查不出的运行时 missing-key 报错。用 `<Fragment key>`;流式 setState 里别放 id++ 副作用。lead 真机必查 console。
5. ⚠️ 连改多处 vite HMR 撞中间态卡死 → tsc 绿后 `preview_stop`+`preview_start` 重启;`preview_logs level=error` 看服务端真错。
6. ⚠️ 并发 >3 个 Agent 撞账户会话上限(tokens:0)→ Workflow 分波 ≤3;撞死就主循环亲写。
7. node v25 偶发 EPERM(uv_cwd)→ 重启/干净路径,先 `node -e "process.cwd()"` 不报错再开工。
8. 🆕 ⚠️ **inline `style` 混用 border 简写 + borderLeft/Top 长写** → React 运行时刷「mix shorthand/non-shorthand」报错(tsc 查不出,⑥ ScriptFlow/CallRecords 踩过)。修:全用长写 borderTop/Right/Bottom/Left。
9. 🆕 ⚠️ **ECharts canvas 的 itemStyle.color 不能吃 `var(--x)`**(canvas 2D 无 CSS 自定义属性作用域 → 整串 color-mix 失效,柱子掉色)。必先 `cssVar('--x')` 预解析再拼 color-mix(⑦ Situation 渠道柱踩过)。图表色一律走 cssVar()/sem()/accent()。
10. 🆕 preview `preset:desktop` 会 reset 到 native 窄宽(~255px,截图缩角落)→ 改用显式 `width:1440,height:900`(不传 preset)。
11. 🆕 ⚠️ **preview MCP server 被 kill/重启后,新 server 的浏览器窗口会卡 native 窄宽**(`window.innerWidth` 报 1440 但截图 paint 仍 ~270px 挤左上角,resize 无效)。**第一个 server 截图正常,重启后的不正常**。规避:**一次起对的 server 别 kill**(验证全程复用同一个);若已重启 → 截图无效但 `preview_snapshot`/`preview_eval` 验内容仍可靠(DOM 真是 1440)。⑧ 收口踩过。
12. 🆕 count-up(StatCard) 在 preview/未 focused 窗口被 rAF 节流冻在中途(显小数/0)→ hook 是时间基的,Hans focused 真机跑满,非 bug;验数据正确看 mockData/副标题静态值,别信 preview 冻结的 KPI 数字。

## 现状 = 9 demo 矩阵(①②③⑤⑦⑧ 验收通过 · ④⑥ 自验待终验 · ⑨ 建设中)
各 `npm --prefix demos/0X-... run dev` 起(①5181 ②5182 ③5183 ④5184 ⑤5185 ⑥5186 ⑦5187 ⑧5188 ⑨5189)。launch.json 已含 kefu/zhijian/llmops/zhiku/fengkong/waihu/shenhe/shuju/yingxiao。
**⑨ 营销增长收尾要做**:Workflow 写完 5 页(Studio/Cdp/Ads/Attribution/Assets)后 → lead 跑全量 build 收口 + 红线扫描(裸 var()/border 混用/key/未用 import)+ 真机逐屏验 6 页 4 角色(罗芮 growth→/campaign /cdp · 周野 creative→/studio /assets · 高崎 media→/ads /attribution · 韦珩 cmo→全只读)→ nohup 5189 交付。
**待选下一个(⑨ 之后)**:总规划 8 brief 已建 3 个(B1 数据=⑧,B2 内容审核=⑦,B3 营销=⑨),**剩 4 个**:B4 销售SDR · B5 Agent编排 · B6 RAG评测 · B7 供应链 · B8 HR招聘(注:B4-B8 实为 5 个,B4 销售 SDR 有信誉风险降级)。⚠️ B5/B6 与 ④知识 同域(图谱/检索/溯源)易撞范式;B7 供应链(控制塔+物流地图)/B8 HR(面试间)差异化最干净。

## 起手语(对 Hans)
「接续:中台 demo 矩阵已建 9 个 —— ①②③⑤⑦⑧ 验收通过,④知识 + ⑥外呼 待你终验(④→5184,⑥→5186)。⑨ 营销增长「Studio 亮台·增长品红·排期编排泳道」建设中(→5189)。要终验 ④/⑥ / 收口验 ⑨ / 还是从剩 brief 开新 demo?你说,我先 Plan 同步再动手。」
