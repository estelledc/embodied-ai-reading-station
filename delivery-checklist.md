# Task 1 & Task 2 交付清单

> ⚠️ **历史文档**：本文反映 2026-06-24 时点的状态，其中多数问题已在后续迭代中解决
> （156 篇已全部升级 deep-read，见 [DEEPREAD-BATCH.md](DEEPREAD-BATCH.md)）。
> 现状以 [CHANGELOG.md](CHANGELOG.md) 与 [PLAN-1.0.0.md](PLAN-1.0.0.md) 为准。

> 截止：2026 年 6 月 30 日（research-task.md 原文写"6 月 31 日"，6 月只有 30 天，已按 6/30 理解）
> 最后更新：2026-06-24

---

## Task 1：论文精读 + 10-15 页英文 PPT

### 选题决策矩阵

| # | 论文 | slug | 笔记深度 | guide 覆盖 | deck 有无 | 复用成本 | 个人兴趣 |
|---|------|------|---------|-----------|----------|---------|---------|
| 1 | **LLaVA** | llava | ★★★★★ deep-read | Ch08+Ch09 (3074行) | ✅ 14页完成 | 0（直接交付） | _填写_ |
| 2 | SayCan | saycan | ★★★ auto-summary | Ch10 (1446行) | ❌ | 高（需从零做 deck） | _填写_ |
| 3 | OpenVLA | openvla | ★★★ auto-summary | Ch12 (1248行) | ❌ | 高 | _填写_ |
| 4 | 3DShape2VecSet | 3dshape2vecset | ★★★ auto-summary | Ch18 (1510行) | ❌ | 高 | _填写_ |
| 5 | VLAS | vlas | ★★★ auto-summary | Ch12 (1248行) | ❌ | 高 | _填写_ |
| 6 | MLA | mla | ★★★ auto-summary | Ch12 (1248行) | ❌ | 高 | _填写_ |
| 7 | Cosmos Policy | cosmos-policy | ★★★ auto-summary | Ch15 (1338行) | ❌ | 高 | _填写_ |
| 8 | RF-SLAM | rf-slam | ★★★ auto-summary | Ch19 (1404行) | ❌ | 高 | _填写_ |
| 9 | mmCLIP | mmclip | ★★★ auto-summary | Ch19 (1404行) | ❌ | 高 | _填写_ |
| 10 | NLOS mmWave | nlos-mmwave | ★★★ auto-summary | Ch19 (1404行) | ❌ | 高 | _填写_ |
| 11 | Proactive Hearing | proactive-hearing | ★★★ auto-summary | Ch20 (1496行) | ❌ | 高 | _填写_ |
| 12 | NeuralAids | neuralaids | ★★★ auto-summary | Ch20 (1496行) | ❌ | 高 | _填写_ |
| 13 | Acoustic Swarms | acoustic-swarms | ★★★ auto-summary | Ch20 (1496行) | ❌ | 高 | _填写_ |

**建议**：选 **LLaVA**，理由如下：

1. 唯一一篇有完成度最高的物料（14 页 deck + deep-read 笔记 + 两章导读）
2. deck 已满足要求（14 页，10-15 页范围内；全英文；覆盖研究背景/动机/方法/实验）
3. 距离截止日期仅剩 ~6 天，从零做另一篇的 deck 风险极高

### LLaVA Deck 与 Task 1 要求对照

| 要求 | 状态 | 差距 |
|------|------|------|
| 10-15 页英文 PPT | ✅ 14 页 | — |
| 研究背景 | ✅ slides 2-4 | — |
| 研究动机 | ✅ slide 4 (三个 gaps) | — |
| 所提方法 | ✅ slides 6-8 (Data/Architecture/Training) | — |
| 主要实验结果 | ✅ slide 10 (四个关键数字) | — |
| 全英文 | ✅ 中英双语（右栏全英文） | 汇报时只看右栏即可 |
| PPT 格式 | ⚠️ HTML deck，非 .pptx | 用浏览器全屏演示；或 ⌘P 导出 PDF |

**格式说明**：deck 为 HTML 格式（非 .pptx），浏览器全屏演示或 ⌘P 导出 PDF 均可。

### 若选非 LLaVA 论文

复用 deck 模板的步骤：

1. 复制 `deck/index.html` → `deck/<slug>.html`
2. 修改 `<section class="slide">` 中的内容（14 个 section）
3. 替换架构图 `<img src="llava-arch.jpg">` → 新论文的图
4. 从对应 guide 章节 + notes 笔记提取素材填入
5. 估时：从零填充一篇 ~2-3 天（含精读理解）

---

## Task 2：代码复现

仓库外工作，此处只记链接与状态。

| 阶段 | 项目 | 仓库 | 状态 |
|------|------|------|------|
| 基础 | VLM_Grasp_Interactive 复现 | [GitHub](https://github.com/hangtingLiu/VLM_Grasp_Interactive) | 未开始 |
| 进阶 | SmolVLA 微调 + mujoco 部署 | LeRobot / SmolVLA (HuggingFace) | 未开始 |

截止时间不固定，按考试时间综合定。

---

## 倒计时（假设 6/30 截止）

| 日期 | 剩余 | 建议动作 |
|------|------|---------|
| 6/24 (今天) | 6 天 | 确认选 LLaVA → 过一遍 deck 内容 |
| 6/25 | 5 天 | 准备口头讲稿 |
| 6/26 | 4 天 | 模拟演练 1 次（15 分钟） |
| 6/27-30 | 缓冲 | 按需修改 deck / 备用日 |
