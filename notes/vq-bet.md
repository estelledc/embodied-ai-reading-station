---
title: "Behavior Generation with Latent Actions (VQ-BeT)"
slug: vq-bet
topic: imitation
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2403.03181"
venue: ICML
year: 2024
era: frontier
num: 63
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

机器人本来要画一条平滑曲线动作，VQ-BeT 让它改成"先选一个动作词、再小修一点"——就像挑表情包再加文字，比硬画曲线更不容易出怪招。

## 这是个什么场景 — 日常类比

你妈让你"去把门打开"，你录了 100 次自己开门的视频想教弟弟。问题是这 100 次每次都不太一样：有时候先伸右手、有时候先扭手腕、有时候顺时针拧、有时候逆时针拧。如果弟弟看完视频去算"所有示范的平均动作"，他会学出一个谁都不像的怪动作——手悬在半空、不左不右地哆嗦。这就是模仿学习的老毛病：同一个起点有好几个合理答案（叫**多模态**），平均一下就变成四不像。

VQ-BeT 换了个思路：先把所有动作风格整理成一本"动作菜单"——比如菜单里有"轻拧""猛拧""先抬手再拧"几道菜。机器人下一步先从菜单里勾一道菜（这一步是"二选一三选一"，不会被平均掉），再根据当前情况把数值微调一下（比如"猛拧但偏左 5 度"）。选菜是离散的所以稳，微调是连续的所以准。

## 之前的人怎么做的 — 3-5 bullet

- **BC（Behavior Cloning）回归 MSE**：把动作当作连续值直接拟合，多模态场景下只能学到平均，得到"四不像"动作。
- **混合高斯（MDN）/能量模型（IBC）**：用多模态分布建模，能表示多种动作，但训练不稳、长 horizon 容易塌缩。
- **BeT（Behavior Transformer，VQ-BeT 的前作）**：先用 k-means 把动作聚类成 K 个 bin，Transformer 预测哪个 bin + 一个连续偏移量。问题是 k-means 是一次性聚类、不可学习、不分层，动作越复杂越糙。
- **Diffusion Policy**：用扩散模型从噪声逐步去噪生成动作，能多模态，但推理要跑很多步、慢。
- **隐式策略 / 自回归连续 Transformer**：直接让 Transformer 出连续值，依然要面对回归的多模态塌缩问题。

## 这篇论文的关键想法

把 BeT 里那个"k-means 聚类 + 偏移量"这一步**整体换成残差 VQ-VAE**。两层关键升级：

1. **VQ 而不是 k-means**：VQ-VAE 的 codebook 是端到端可学的（gradient 通过 straight-through estimator 反传），聚类中心会随训练迁移，比 k-means 一次性硬聚类更贴动作分布。
2. **Residual（残差）而不是单层**：把动作分两步量化——第一层 codebook 编码"粗略动作类别"，第二层 codebook 编码"在第一层之上的精细修正"。这相当于先选"猛拧"，再选"猛拧里的偏左 5 度"。两层离散码的笛卡尔积就提供了远超单层的表达力，又不损失离散性带来的多模态稳定性。

下游 Transformer 头变成"预测两层离散码 + 一个小的连续偏移量"的多任务输出。离散码处理"选哪种风格"，偏移量处理"具体的数值微调"。

## 它怎么做的（方法）— 3-4 段

**阶段一：先编一本动作菜单（训练残差 VQ-VAE）。** 像出版社编菜谱：把厨师做菜的视频切成几秒一段，看哪些动作长得像就归一类。具体做法是把专家示范的动作序列（叫 action chunk，就是连续几步的动作打包成一段）丢给一个叫 VQ-VAE 的网络，它会在一本"码本（codebook）"——也就是动作菜单——里找出最像的那一项；如果还差点意思，就把"差的那部分（残差）"再去第二本码本里查一次，等于"先选大类、再选小调整"。这步只看动作本身，不看机器人当时的环境画面。

等等，先慢一拍——VQ-VAE 是什么？把它想成一台"用菜单代替原始数据"的机器：你给它一段连续数字，它强行把这段数字翻译成菜单里某个固定编号（比如"3 号"）。要训练的就是这本菜单的编号到底代表什么。

**阶段二：教机器人看场景挑菜（训练状态条件的 Transformer）。** 像点餐员看顾客现场情况推荐菜：用一个 GPT 风格的 Transformer，输入是机器人最近几步看到的画面、摸到的东西、之前做过的动作，输出三样东西——第一本菜单选几号（分类）、第二本菜单选几号（分类）、再加一个小数值微调（连续偏移）。前两样用分类损失（cross-entropy），后一样用 MSE。

**阶段三：上菜（推理时组装动作）。** 像把订单交给厨房：Transformer 报出两个菜单编号，去码本里查到对应的向量，加上那个微调数值，再用 VQ-VAE 的解码器还原成真正的连续动作。整个过程一步出结果，不像 Diffusion Policy 要反复"去噪"几十步，**所以推理快很多**（具体倍数需读原文）。

**为什么这样能解决"四不像"？** 因为"选几号菜"是分类题，分类天然可以表示"50% 选 A、50% 选 B"，采样时随机挑一个就好，不会被平均成中间值。微调那一小步只在选定菜之后做精修，不需要承担"表达多种风格"这件难事。

## 实验在做什么

按摘要 + 同期 imitation 工作惯例，VQ-BeT 在以下基准上对照 BC / BeT / Diffusion Policy / IBC：

- **多模态玩具任务**：比如 push-T、blocks-stacking 这种同状态多解法的任务，验证"不会塌成平均"。
- **机械臂仿真**：robomimic / Franka Kitchen 等环境，验证长 horizon 任务成功率。
- **真实机器人**：可能在 xArm / Franka 上做物体操纵，验证 sim-to-real 与速度。

报告指标主要是任务成功率、动作分布覆盖度（多模态保留得好不好）、推理延迟。具体数字需读原文。

## 你应该懂的几个新词 — 4-6 个

- **VQ-VAE（Vector Quantized VAE）**：把 encoder 的连续 latent 强行映射到一个有限的 "码本（codebook）"中最近的那个向量，让 latent 变成离散符号。常用于 DALL-E 早期版本、SoundStream 等"先离散化再用 Transformer 建模"的范式。
- **Residual VQ（残差向量量化）**：把"量化误差"再交给下一层 codebook 量化，多层叠加。来自音频 codec（SoundStream、Encodec），在 VQ-BeT 里搬到动作上。
- **Codebook**：就是字典——一组可学习的向量 [e_1, ..., e_K]，量化时找输入 latent 最近的那个。
- **Straight-Through Estimator (STE)**：量化操作不可导，反传时假装它是恒等函数把梯度直通过去。让 codebook 端到端可训。
- **Action Chunk**：一次预测连续几个 timestep 的动作（比如 8 步），而不是只预测下一步。能减少推理频次、抑制 compounding error，Diffusion Policy / VQ-BeT / ACT 都用。
- **多模态行为塌缩（Mode Collapse / Averaging）**：MSE 回归在多解情况下倾向输出所有解的平均，结果是哪个都不像。这是模仿学习的老大难。

## 它和其他论文什么关系

- **直接前作 BeT**（同组 NYU Lerrel Pinto 团队）：把 k-means 换成 RVQ 是核心增量。BeT 的离散+偏移量框架被 VQ-BeT 完全继承。
- **同期对手 Diffusion Policy**（CMU/Columbia, RSS 2023）：另一条多模态路线。VQ-BeT 主打"和 Diffusion 同样多模态、但推理快几个数量级"。
- **方法源头 VQ-VAE / SoundStream**：把音频/图像里成熟的"离散 latent + Transformer"配方搬到 robot action，是 2023-2024 年一个明显的跨域迁移趋势（参考 RT-2、OpenVLA 也在用 action token 化）。
- **下游 / 后续**：可以看作给 OpenVLA 这类 VLA 模型的 action head 提供了一种替代——不用让大模型直接吐 token，而是把动作量化后让小 Transformer 学。
- **同范式邻居**：[Consistency Policy](consistency-policy.md)（蒸馏 Diffusion Policy 加速）、[ACT](https://arxiv.org/abs/2304.13705)（action chunking with transformers）。

## 我建议这样读 — 3-4 步

1. **先读 BeT 论文的方法部分（10 分钟）**：理解"k-means 离散化 + 偏移量"的双头预测结构。VQ-BeT 是在这个骨架上换零件，不读 BeT 直接读 VQ-BeT 会缺一块拼图。
2. **再读 VQ-VAE 原论文 figure 1 + Residual VQ 在 SoundStream 里的描述**：搞清楚"码本""量化""残差堆叠"三个机制。这些是从音频领域借来的，机器人论文不会重复讲。
3. **回到 VQ-BeT 看 method section**：focus 在"两层 codebook 是怎么联合训的""推理时偏移量怎么用"，对比 BeT 的差异。
4. **看实验表格**：对比 BeT / Diffusion Policy 的成功率与推理时间，理解 trade-off。如果做真实机器人项目，重点看延迟和动作平滑度。

## 为什么值得读

- **方法上"换零件"很经济**：把成熟的 RVQ 搬过来就拿到明显增益，是范式迁移的好例子。学到这个套路你能复用到其它 head（比如把它套在 VLA 的 action head 上）。
- **多模态行为是模仿学习真正的痛点**：Jason 后续要做的视频评价 agent / 操作类 agent 任何"专家轨迹有多解"的场景都会遇到，VQ-BeT 提供了一个"快+稳"的标准答案。
- **和 Diffusion Policy 形成对照**：理解"离散 latent + 单步推理" vs "连续 latent + 多步去噪"的优劣权衡，是当前 imitation 领域必修对照组。
- **实现门槛适中**：不像 Diffusion Policy 需要调一堆 schedule，VQ-BeT 是一个标准 Transformer + 一个标准 VQ-VAE，组合好就行。适合作为新项目的 baseline。
