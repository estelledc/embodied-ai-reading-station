---
title: "SmolVLA"
slug: smolvla
topic: imitation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2506.01844"
venue: arXiv
year: 2025
era: frontier
num: 61
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

SmolVLA 是 Hugging Face 推出的一个**小型 VLA**（Vision-Language-Action 模型，能把"看到什么 + 听到什么指令"翻译成"机械臂怎么动"的端到端模型）。它的卖点是：参数量压到百万到亿级这个量级，**消费级 GPU 也能训练**，而且训练数据用的是 Hugging Face 社区贡献的公开示范（demonstration），不依赖某家大厂的独有数据。

## 这是个什么场景 — 日常类比

想象你在教一个新员工做"按指令收拾桌面"——你说"把红色的杯子放进抽屉"，他要看见杯子、理解话、然后伸手去做。这三步在机器人里就是 vision、language、action。

过去训练这种"看-说-做"模型的玩家像米其林大厨，要后厨（数据中心）、要食材（自家私有数据）、要时间（几周到几个月）。SmolVLA 像一台**家用小烤箱**：买得起、放得下、用社区菜谱（公开数据集）也能烤出能吃的面包。它不追求最好吃，但追求"普通人在家也能复现"。

## 之前的人怎么做的 — 3-5 bullet

- **RT-2（Google 2023）**：把大型 VLM（视觉语言模型）直接微调成 VLA，55B 参数级别，需要 Google 内部 TPU 集群，社区无法复现
- **OpenVLA（2024）**：开源化的尝试，7B 参数，但训练仍需要多卡 A100，门槛高
- **Octo / RT-1 系列**：参数较小但架构复杂，预训练数据也封闭（多依赖 Open X-Embodiment 等聚合数据集）
- **共同痛点**：模型大 → 推理慢、训练贵、社区难复现；私有数据 → 没法在自家机械臂上做迁移

## 这篇论文的关键想法

核心赌注：**"小而精 + 社区数据"在机器人这个具身领域也能 work**。

具体做了三件事（基于摘要推断，具体细节需读原文）：
1. **架构压缩**：用蒸馏 / 共享主干 / 跳层等技巧把 VLA 压到能在单张消费级 GPU（如 RTX 4090）上跑训练和推理
2. **数据民主化**：训练数据全部用 LeRobot 等社区平台公开发布的示范片段，**不掺私有数据**
3. **保持可用性**：在标准基准（如 LIBERO 或自建任务）上验证小模型也能完成抓取、放置、按指令操作等任务

## 它怎么做的（方法）— 3-4 段

**整体架构**（推断）。SmolVLA 大概率沿用主流 VLA 范式：一个**视觉编码器**（vision encoder，把图像变成 token）+ 一个**语言编码器**（language encoder，把指令变成 token）+ 一个**动作解码器**（action decoder，输出每一时刻的关节角度或末端位姿）。Hugging Face 已有 SmolLM、SmolVLM 系列做语言和视觉这块的小模型积累，SmolVLA 是把这条路径延伸到 action 这一维。

**参数压缩**。具体到怎么"小"，常见手段是：用蒸馏从大 VLM 教师模型（teacher）学到一个 student；冻结视觉/语言主干只训 action head；或者用 MoE-like 路由稀疏激活。具体哪种组合需读原文。

**Action 输出**。VLA 输出动作有两条主流路：一是把动作离散化成 token（像生成文字一样生成动作），二是用 diffusion / flow matching 等连续生成。SmolVLA 走的是哪条，论文里应该有详细对比。

**训练数据 pipeline**。社区数据来自 LeRobot Hub 上各种小型机械臂（SO-100、Koch arm 等）记录的人类遥操作片段。论文应该会讲怎么清洗、对齐相机视角、统一动作空间这些"脏活"。

## 实验在做什么

基于 VLA 论文常见的实验套路（具体数字需读原文）：
- **Sim 基准**：LIBERO / Meta-World / RoboCasa 等仿真环境，对比 OpenVLA、RT-2 看任务成功率
- **真机迁移**：在 SO-100 等社区低成本机械臂上跑 pick-and-place、按指令抓取等任务，看 zero-shot 和 few-shot 表现
- **scaling 曲线**：参数量从更小到目标尺寸，看性能-参数曲线在什么位置开始 plateau（饱和）
- **消融**：去掉社区数据、换主干、改 action head 等，看每一项对最终性能的贡献

关键看点：**"小到什么程度还能 work"**——这是社区想知道的核心问题。

## 你应该懂的几个新词 — 4-6 个

- **VLA（Vision-Language-Action）**：把"看 + 听指令 + 做动作"端到端学进一个模型，是 2023 年后机器人领域的主流范式
- **示范数据（demonstration）**：人类通过遥操作（teleoperation）操控机械臂完成任务录下来的（图像，指令，动作）三元组，是模仿学习（imitation learning）的食材
- **Action token / action chunk**：把连续的关节角度切成离散 token 或固定长度的小段（chunk），让模型可以像生成文字那样生成动作
- **Flow matching / diffusion policy**：用扩散模型类的连续生成方法直接输出动作向量，绕开离散化损失
- **LeRobot**：Hugging Face 维护的开源机器人学习库 + 数据 hub，是 SmolVLA 的"数据来源 + 部署框架"
- **消费级 GPU**：相对于 H100/A100 这种数据中心卡，指 RTX 4090/3090 这类个人能买到的卡，显存 24GB 左右

## 它和其他论文什么关系

- **延续 OpenVLA / RT-2 的 VLA 范式**，不是另起炉灶
- **跟 SmolLM、SmolVLM 是同一个"Smol 家族"**，Hugging Face 把"小模型也能 work"这条主线从 NLP 扩到 vision 再扩到 robotics
- **跟 LeRobot 项目深度绑定**：SmolVLA 既是 LeRobot 的"旗舰模型"，也是 LeRobot 数据集的"消费者"，互相成就
- **对照 π0、Pi-0.5、RDT-1B 等大型 VLA**：那条路线追求 SOTA，SmolVLA 这条路线追求 accessibility（可及性）
- **可以看作 ALOHA / DexCap 等廉价硬件路线在"模型侧"的呼应**：硬件已经下沉，模型也得下沉，整套 stack 才能真正进入社区

## 我建议这样读 — 3-4 步

1. **先看 LeRobot 的 README 和 SmolVLA 模型卡**（Hugging Face Hub），用 5 分钟搞清楚它实际在哪种机械臂、哪些任务上跑
2. **读论文的 method 章节**，重点回答三个问题：参数压到多少、用了什么蒸馏/压缩技巧、action 是离散还是连续输出
3. **看实验里跟 OpenVLA 的对比**，特别是"小模型在哪些任务上 gap 还是大、哪些已经追平"——这告诉你小模型当前的边界
4. **（可选）clone LeRobot repo 跑一遍 inference**，亲手感受一下"在自己 GPU 上能不能转起来"，这是这篇论文最大的实践价值

## 为什么值得读

- **零基础上手具身 AI 的最佳入口之一**：你不需要 8 卡 H100 才能开始玩 VLA，单卡就行
- **代表"机器人模型平民化"的拐点**：类似 NLP 领域 Llama / Mistral 让本地推理成为可能
- **方法论本身可迁移**：怎么把大模型蒸馏 + 用社区数据训出可用小模型，这套思路对其他领域也有借鉴
- **跟硬件社区共振**：SO-100 一两千块就能搭起来，加上 SmolVLA，"在家训练自己的机器人"第一次在普通人预算内可达
