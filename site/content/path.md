---
title: "30-day learning path — 零基础上手具身 AI"
order: 5
intro: "如果你刚来，156 篇太多。这页给你 30 天的具体路径——每天 1-2 篇，30 天后能自信讲出'具身 AI 这一年在干什么'。"
---

## 这页为谁设计

> 你是大一/大二/转方向的本科生，知道 Python 但没接触过具身 AI；你愿意每天花 30-60 分钟系统读一段时间。

如果你符合这两条，按这页走就行。每天的论文已经按"前一篇是后一篇的前置"排好了。

如果你已经懂 transformer，可以跳过 Week 1，从 Week 2 开始。

## Week 1 · 把视觉和语言连起来

具身 AI 的所有模型都建在"视觉 + 语言"的基座上。先把这部分搞清楚。

| Day | 论文 | 学到 |
|---|---|---|
| 1 | [CLIP](/papers/clip/) | 怎么把图和文塞进同一个坐标系 |
| 2 | [BLIP](/papers/blip/) | 自举：弱标注 + 自我清洗 |
| 3 | [BLIP-2](/papers/blip-2/) | Q-Former 桥接冻结的视觉 + 冻结的 LLM |
| 4 | [LLaVA](/papers/llava/) | 一层 MLP 把视觉特征注入 LLM |
| 5 | [Flamingo](/papers/flamingo/) | 交错图文 + Perceiver Resampler |
| 6 | [SigLIP](/papers/siglip/) | sigmoid 损失替换 softmax |
| 7 | 复习 + 看 [Glossary](/glossary/) | 整理自己的术语笔记 |

**Week 1 收获**：你能解释"为什么所有 VLA 都先有一个 VLM"。

## Week 2 · 看懂 VLA 的进化

VLA = 视觉-语言-动作。这周读完你能讲清"机器人怎么从看图直接出关节速度"。

| Day | 论文 | 学到 |
|---|---|---|
| 8 | [RT-1](/papers/rt-1/) | 把动作 token 化，让 transformer 当策略 |
| 9 | [SayCan](/papers/saycan/) | LLM 给候选 + 可行性打分相乘 |
| 10 | [Code-as-Policies](/papers/code-as-policies/) | 让 LLM 直接写 Python 调机器人 API |
| 11 | [RT-2](/papers/rt-2/) | 把网络知识从 VLM 转到 robot policy |
| 12 | [OpenVLA](/papers/openvla/) | 完全开源的 VLA 民主化 |
| 13 | [π0](/papers/pi0/) | VLM + flow matching head 通用基础模型 |
| 14 | 复习 + 看 [VLA topic page](/topics/vla/) | 整理 VLA 路线 |

**Week 2 收获**：你能比较 RT-1/RT-2/OpenVLA/π0 四条不同技术路径。

## Week 3 · 数据、模仿、扩散

VLA 的瓶颈不是模型而是数据。这周读模仿学习 + 扩散策略。

| Day | 论文 | 学到 |
|---|---|---|
| 15 | [DAgger](/papers/dagger/) | 模仿学习的误差累积 + 解决方案 |
| 16 | [ACT/ALOHA](/papers/act-aloha/) | 双臂遥操作 + action chunking |
| 17 | [UMI](/papers/umi/) | 手持夹爪 + GoPro 采野外数据 |
| 18 | [Open X-Embodiment](/papers/open-x-embodiment/) | 22 家机构数据合一 |
| 19 | [Diffusion Policy](/papers/diffusion-policy/) | 把'选动作'变'去噪' |
| 20 | [3D Diffusion Policy](/papers/3d-diffusion-policy/) | 加 3D 点云做眼睛 |
| 21 | 复习 + 看 [Imitation topic](/topics/imitation/) | 整理数据采集思路 |

**Week 3 收获**：你能跟人说清"为什么 Diffusion Policy 在 manipulation 上赢了 transformer"。

## Week 4 · 周边生态

VLA 不是孤岛。这周读世界模型、仿真器、感知扩展。

| Day | 论文 | 学到 |
|---|---|---|
| 22 | [World Models](/papers/world-models-ha/) | 在脑子里预演 |
| 23 | [Dreamer V3](/papers/dreamer-v3/) | 跨域固定超参的世界模型 |
| 24 | [Genie](/papers/genie/) | 从无标签视频学潜在动作 |
| 25 | [Habitat](/papers/habitat/) | 室内仿真器照片级 |
| 26 | [Isaac Gym](/papers/isaac-gym/) | GPU 并行物理仿真 |
| 27 | [ImageBind](/papers/imagebind/) | 六模态通过图像作锚点联通 |
| 28 | [Whisper](/papers/whisper/) | 弱标注 + 大规模 = 零样本 ASR |
| 29-30 | 复习 + 看 [Compare](/compare/) + 写一篇自己的 review | 输出验证收获 |

**Week 4 收获**：你已经具备"读 2026 年新论文 abstract 不发蒙"的能力。

## 30 天后你能做什么

- 读 NeurIPS/CoRL 任意一篇具身 AI 论文，看懂大体在干啥
- 知道自己接下来该深挖哪个分支（按兴趣选 topic）
- 能跟实验室同学讨论 RT-2 vs π0 这种话题
- 能自己挑论文读，不再依赖别人推荐

## 验证：每周末做一次

挑当周读过的 1 篇，关掉笔记尝试给同学/室友讲清楚（< 5 分钟）。讲不通的部分回去重读那部分。

## 卡住怎么办

- **数学公式看不懂** → 去 [Math Primer](/learn/math-primer/) 查符号
- **术语不认识** → 去 [Glossary](/glossary/)
- **想看可视化关系** → 去 [Graph](/graph/)
- **不确定哪篇先读** → 这页就是答案

## 不要做什么

- **不要囤积笔记 app**：你的笔记就是这站，你的标记就是 ✓ 已读
- **不要追新**：30 天内别看微信推送的 2026-08 论文。先读完路径
- **不要跳读**：第 1 周看着简单，但是后面所有内容的根基

---

*◼ End of 30-day path. 走完一遍欢迎回来开第二遍——会比第一遍快很多。*

---

> **想看更详细的路径规划？** 去 [Guide Ch02: 阅读路线图](/guide/ch02-reading-paths/) ——提供 Task 1 / 全景 / 主题跳读三条路径，含时间管理建议和检查点自测。
