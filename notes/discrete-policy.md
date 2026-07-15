---
title: "Discrete Policy: Learning Disentangled Action Space for Multi-Task Robotic Manipulation"
slug: discrete-policy
topic: diffusion-policy
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2409.18707"
venue: ICRA
year: 2025
era: frontier
num: 195
generated_at: 2026-07-15
---

# Discrete Policy：把多任务动作先压成离散 latent code，再生成控制序列

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和项目页能支持的结论；本站没有复现仿真或真实机器人实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

Discrete Policy 处理的是多任务机器人操作里的“动作空间纠缠”问题。一个任务可能有多种成功轨迹，多个任务混在一起训练时，动作分布会变得更复杂、更像几团缠在一起的线。直接用 Behavior Cloning 或 Diffusion Policy 从 observation + language 到 action，模型要同时处理所有任务的多峰动作分布，容易学得不稳定。

论文提出先用 VQ-VAE 把动作序列编码成离散 latent space，也就是一组 codebook 里的离散动作码；再训练 conditional latent diffusion model 根据视觉、语言和状态生成任务相关 latent embedding；最后用 VQ-VAE decoder 把离散码还原成真实动作。这样，policy 不直接在原始动作空间里硬拟合，而是在更容易区分技能和任务的 latent 空间里学习。

如果只记一个直觉：Discrete Policy 像先把复杂动作压成“技能编号”，例如 pick、place、rotate、pull 等相近模式先聚成码，再让模型根据当前任务选择合适的码，最后展开成连续动作。

*所以这一节是想说：Discrete Policy 用离散 latent action space 缓解多任务动作分布纠缠。*

## 这是个什么场景

多任务机器人操作比单任务难很多。单任务时，模型只需要学“在这个场景里怎么完成这个目标”；多任务时，同一套 policy 要同时学开抽屉、叠方块、把杯子立起来、拿网球、双臂协作等动作。不同任务的动作长度、精度、接触模式和可行轨迹都不同。

更麻烦的是，同一个任务也可能有多种正确做法。比如把杯子拿起来，可以从左侧接近，也可以从右侧接近；叠方块可以先修正位姿，也可以直接放置。动作分布是 multimodal 的，不是一条简单平均轨迹。连续动作模型如果把多个模式平均，可能生成“看似折中、实际失败”的动作。

Discrete Policy 的场景就是 multi-task robotic manipulation。论文评估包括仿真和真实机器人，真实机器人又包含单臂 Franka 和双臂 UR5，任务从 5 个增加到 12 个，还覆盖 bimanual setting。

```text
多任务动作分布的直觉

Task A: pick -> place
Task B: rotate -> place
Task C: pull -> open

原始 action space:
  轨迹混在一起，模式互相重叠

离散 latent space:
  code 12: pick-like
  code 27: rotate-like
  code 43: pull-like
```

*所以这一节是想说：多任务难点不是只有任务数量，而是动作模式在连续空间里纠缠。*

## 之前的人怎么做的，为什么不够好

Behavior Cloning 直接学习 observation 到 action 的映射。它简单，但面对多峰动作分布时容易平均化，尤其当多个任务共享同一张桌子、同一类物体但动作意图不同时，模型很难知道应该进入哪种动作模式。

Diffusion Policy 通过生成式建模缓解多峰问题，能从噪声逐步生成动作序列，比普通回归更适合复杂动作。但论文认为，当任务数量增加、短中长 horizon 混合时，直接在原始动作空间 denoise 仍然难，因为任务特定模式没有被显式分离。

ACT、Octo、OpenVLA 等更大或更通用的策略可以利用更多数据和预训练，但它们仍需要处理连续动作空间里的任务混合。对于多任务、跨 embodiment、双臂这类设置，仅靠更大模型不一定解决 latent action disentanglement。

Discrete Policy 的判断是：先把动作序列离散化，有利于技能模式分离；再在 latent space 里做 diffusion，比直接在原始动作空间里生成更容易。

*所以这一节是想说：旧方法直接在动作空间学习，多任务越多，动作模式越难分清。*

## 这篇论文的新想法

第一，新想法是用 VQ-VAE 建立离散动作 latent space。VQ-VAE 的 encoder 把动作序列压成 latent embedding，再通过 codebook 选最近的离散码，decoder 再重建动作。

第二，新想法是把 diffusion 放在 latent space。模型不是直接生成动作，而是从高斯噪声 denoise 出 latent embedding，再映射到 codebook 中的离散动作码。

第三，新想法是 task-specific codes。论文用 t-SNE 可视化显示，不同任务中的相似技能会在 latent space 中更接近，说明离散 code 有助于把动作模式 disentangle。

第四，新想法是跨真实 embodiment 评估。论文不只在仿真上报告，还在单臂 Franka、双臂 UR5 等真实设置中与 Diffusion Policy、ACT、Octo、OpenVLA 等比较。

```text
Discrete Policy 的两阶段训练

Stage 1: VQ-VAE
  action sequence -> encoder -> latent z
  latent z -> nearest codebook entry -> discrete code
  discrete code + language/state -> decoder -> reconstructed action

Stage 2: latent diffusion
  observation + language + noise
       -> denoise in latent space
       -> task-specific latent embedding
       -> codebook lookup
       -> decoder -> action sequence
```

*所以这一节是想说：Discrete Policy 的核心是“离散化动作模式 + latent diffusion 选择模式”。*

## 它分几步做的（方法）

### 第 1 步：准备动作序列和条件输入

输入是机器人 observation、language instruction、proprioceptive states 和一段 action sequence。动作序列不是单个动作点，而是一个 chunk，包含未来若干步控制。

处理上，论文把 action sequence 和相关状态送入 encoder。这样 latent code 不只看某个瞬间动作，还看一段连续行为，比如接近、抓取、抬起、放置。

输出是 continuous latent embedding `z`，它仍然是连续向量，还没有离散化。

### 第 2 步：VQ-VAE 把动作压进 codebook

输入是 encoder 输出的 latent embedding。VQ-VAE 维护一个 codebook，里面有多个离散 embedding。系统会选择距离 `z` 最近的 codebook entry，得到离散 latent embedding。

处理上，训练目标包括 reconstruction loss、codebook loss 和 commitment loss。重建损失要求 decoder 能还原动作；codebook 相关损失要求离散码跟 encoder 输出对齐。

输出是离散动作码和可重建动作的 decoder。直觉上，codebook 是动作模式词典，decoder 是把词典条目翻译回真实机器人动作的模块。

### 第 3 步：冻结 VQ-VAE，训练 latent diffusion

如果随机从 codebook 里选一个码，可能选到和当前任务不匹配的动作。论文因此冻结训练好的 VQ-VAE，再训练 conditional latent diffusion model `H`。

输入是当前 observation、language instruction 和高斯噪声。处理是 DDIM 式 denoising，把噪声逐步还原成任务相关 latent embedding。这个过程发生在 latent space，不是在原始 action space。

输出是 predicted latent embedding `z_h`。它会再进入 bottleneck / codebook lookup，找到最相似的离散码。

### 第 4 步：从离散码重建真实动作

输入是离散 latent embedding、语言指令和机器人状态。VQ-VAE decoder 负责把这个 code 展开成 action sequence。

处理上，decoder 利用语言和状态条件，避免同一个 code 在不同上下文下机械地生成同一动作。比如 pick-like code 在不同对象、不同姿态下仍要生成不同轨迹。

输出是真实机器人动作序列。这里的关键是，生成动作之前已经先选中了一个任务相关的 latent mode。

### 第 5 步：真实机器人和仿真评估

论文评估包含真实单臂 Franka 多任务、双臂 UR5 六任务，以及 BiDexHands、MetaWorld 等仿真 benchmark。真实任务包括 MT-5、MT-12 和 bimanual UR5 setting。

处理上，论文比较 Discrete Policy 和 Diffusion Policy、MT-ACT、BeT、Octo、OpenVLA 等基线。评估指标是 success rate。

输出是论文报告的成功率对比。例如 MT-5 中 Discrete Policy 平均成功率高于 Diffusion Policy 和 OpenVLA；MT-12 中与 Diffusion Policy 的差距扩大。

### 第 6 步：可视化和 ablation

论文用 t-SNE 可视化 latent features。Discrete Policy 的技能聚类更清晰，Diffusion Policy 的特征更碎、更重叠。

ablation 还研究 action chunk size、codebook categories、latent embedding dimensions 等因素。论文观察到增加 codebook capacity 和合适 embedding dimension 有助于成功率，但不是所有增大都单调提升。

输出是一个解释：性能提升不是黑箱，而与 latent space 中技能模式更可分有关。

*所以这一节是想说：Discrete Policy 先学动作词典，再学怎么按语言和视觉选择词典条目。*

## 关键数字

| 数字或设置 | 原文语境 | 这说明什么 |
|---|---|---|
| 5 real-world tasks | MT-5 单臂 Franka 设置 | 小规模多任务真实评估 |
| 12 real-world tasks | MT-12 设置 | 任务数增加后考验更强 |
| 26% higher than Diffusion Policy | arXiv 摘要中 MT-5 真实多任务设置 | 论文报告相对 Diffusion Policy 的平均成功率提升 |
| 15% higher than OpenVLA | 同一设置 | 论文报告相对 OpenVLA 的提升 |
| 32.5% gap | 任务增加到 12 后相对 Diffusion Policy | 多任务复杂度越高，latent space 优势越明显 |
| 84% / 66.3% | 文中 MT-5 / MT-12 平均成功率片段 | 论文报告 Discrete Policy 在真实设置中的表现 |
| >65% vs 37.5% | 双臂 UR5 中 Discrete Policy 与 Diffusion Policy | 双臂多任务中也有差距 |
| 23 tasks | simulation / real-world data 覆盖任务数片段 | 数据覆盖多类型操作 |

这些数字全部来自论文报告，不是本站复现实验。PDF 表格存在抽取错位，精确引用单项任务分数时应回到原 PDF 表格核对。

*所以这一节是想说：论文证据集中在任务数增加时的多任务优势。*

## 实验结果说明了什么

实验第一层说明，离散 latent space 有助于分离技能。t-SNE 中相似技能跨任务聚在一起，说明 codebook 不是随机压缩，而是学到了一些可复用动作模式。

实验第二层说明，直接用 Diffusion Policy 处理多任务会遇到动作分布纠缠。随着任务从 5 增到 12，论文报告 Discrete Policy 相对 Diffusion Policy 的优势扩大，支持“任务越多，先 disentangle 越重要”的判断。

实验第三层说明，这条路线不只适用于单臂。双臂 UR5 结果显示，在更复杂的 bimanual setting 中，Discrete Policy 仍高于 Diffusion Policy、MT-ACT、BeT 等基线。

实验第四层说明，latent codebook 的容量和维度需要调。code 太少会表达不足，code 太多或维度设置不当也可能增加学习难度。这提醒我们：离散化不是免费午餐，codebook 设计本身就是核心工程问题。

*所以这一节是想说：Discrete Policy 的结果支持“在 latent skill space 学多任务 policy”这条路线。*

## 你应该懂的几个新词

- Multimodal action distribution：同一个任务有多种可行动作模式，不是一条平均轨迹。
- VQ-VAE：Vector Quantized VAE，把连续 latent 映射到离散 codebook。
- Codebook：离散向量词典，每个 entry 可以代表一种动作模式。
- Latent diffusion：在 latent space 中做 diffusion denoising，而不是直接生成原始数据。
- Action chunk：一段未来动作序列。
- Disentanglement：把混在一起的因素分开，例如把不同技能模式分开。
- Bimanual manipulation：双臂操作，控制和协调更复杂。

*所以这一节是想说：读懂 Discrete Policy 要先懂 VQ-VAE、codebook 和 latent diffusion。*

## 它有什么搞不定的

第一，离散 code 会带来信息瓶颈。如果 codebook 表达能力不足，细粒度动作可能被压坏。

第二，codebook 需要合适规模。太小不够表达，太大可能难训练、难泛化，还可能失去“离散模式”的清晰性。

第三，论文虽然覆盖多种真实设置，但仍然是在受控任务和数据集内评估。开放家庭场景、动态人类协作和长程任务还需要更多验证。

第四，Discrete Policy 主要处理动作空间纠缠，不直接解决视觉 grounding、任务规划、安全约束或语言歧义。

第五，latent space 的可解释性有限。t-SNE 能显示聚类趋势，但单个 code 的语义仍需要额外分析。

*所以这一节是想说：离散 latent space 很有用，但它是动作建模工具，不是完整通用机器人系统。*

## 它和别的几篇是什么关系

和 `villa-x` 相比，两者都使用 latent action。villa-X 关注从无标签视频学习 latent action，Discrete Policy 关注把多任务真实动作序列压成离散 codebook。

和 `discrete-diffusion-vla` 相比，两者都和“离散”有关，但 Discrete Policy 是动作序列 latent codebook + latent diffusion，Discrete Diffusion VLA 是在 VLA action decoding 中引入离散扩散。

和 `diffusion-policy` 相比，Discrete Policy 不是否定 diffusion，而是把 diffusion 从原始动作空间移到 latent action space。

和 `primitive-skill-diffusion-policy` 相比，primitive skill 是人工或结构化技能层，Discrete Policy 的 skill-like code 是从动作数据中学出的。

*所以这一节是想说：Discrete Policy 是 Batch 9 中“多任务动作空间结构化”的代表。*

## 和本导读的关系

本站之前已经读过 diffusion policy、skill-conditioned policy、latent action 和 VLA 指令微调。Discrete Policy 把这些线索合到一个问题上：当任务越来越多，动作分布越来越乱，policy 是否应该先学一个更结构化的动作空间？

它适合放在 diffusion-policy 和 VLA action representation 之间阅读。读者可以把它当成“动作 tokenization”的一种路线：不一定把动作离散成语言 token，而是用 VQ-VAE 学一套动作词典。

*所以这一节是想说：Discrete Policy 帮助理解 VLA/机器人策略里的动作表示设计。*

## 思考题

**Q1：为什么多任务动作分布比单任务更难学？**

<details>
<summary>提示</summary>

多个任务的动作模式会混在一起，同一 observation 类型下可能对应不同技能和不同 horizon。
</details>

**Q2：VQ-VAE 的 codebook 在这里像什么？**

<details>
<summary>提示</summary>

可以把它想成动作词典，每个 code 是一种被数据学出来的动作模式。
</details>

**Q3：为什么要在 latent space 做 diffusion？**

<details>
<summary>提示</summary>

latent space 更结构化、维度更低、技能模式更可分，denoising 可能比原始动作空间更容易。
</details>

**Q4：离散化会不会损失精度？**

<details>
<summary>提示</summary>

会有风险，所以 decoder、codebook 大小和 embedding 维度都很关键。
</details>

**Q5：Discrete Policy 解决不了哪些问题？**

<details>
<summary>提示</summary>

它主要解决动作空间建模，不直接解决视觉 grounding、规划、安全和长时记忆。
</details>

## 一些好奇心问答（FAQ）

**Q：Discrete Policy 是不是把机器人动作变成文字 token？**

不是。它把动作序列变成离散 latent code，这些 code 不一定有人类可读语义。

**Q：为什么 Diffusion Policy baseline 会被比较？**

因为 Diffusion Policy 是强生成式动作基线，适合多峰动作。Discrete Policy 要证明 latent 离散化能进一步改进。

**Q：codebook 能不能手工设计？**

理论上可以定义技能库，但论文路线是从数据中学 codebook，减少人工技能设计。

**Q：双臂任务为什么重要？**

双臂需要协同、时序和空间约束，比单臂更能考验 latent space 是否分清复杂动作模式。

**Q：这篇最值得学习的工程思想是什么？**

不要把所有任务都塞进原始动作空间硬学；先找一个更适合多任务结构的中间动作表示。

## 如果你想再深入

1. 读 VQ-VAE，理解 codebook 和 commitment loss。
2. 读 Diffusion Policy，理解为什么生成式动作模型适合多峰动作。
3. 读 MT-ACT、Octo、OpenVLA，比较不同 multi-task policy 的动作表示。
4. 观察 t-SNE 可视化，思考“技能聚类”是否真的等价于可解释技能。

*所以这一节是想说：Discrete Policy 是学习多任务动作表示的好入口。*

## 精读补充：为什么“离散”反而可能更适合连续控制

初学者很容易觉得机器人动作是连续的，所以离散化一定会损失信息。这个担心是对的，但不完整。Discrete Policy 离散化的不是每一个低层电机命令，而是一段 action chunk 的 latent representation。也就是说，它不是把连续控制粗暴改成几个按钮，而是先把一段复杂动作压缩成可重建的中间码，再由 decoder 展开回连续动作。

这和人学习动作有点像。我们不会记住每一毫秒肌肉收缩，而会把一段行为概括成“抓起”“旋转”“放下”“拉开”。真正执行时，身体再把这些动作概念变成连续控制。Discrete Policy 的 codebook 就承担类似“动作概念词典”的角色。它的优势在于多任务共享：不同任务里的 pick-like 片段可以靠近同一类 code，减少每个任务都从头学习动作模式的成本。

当然，这也解释了为什么 codebook 不是越离散越好。如果动作码太粗，decoder 无法还原细节；如果动作码太碎，模型又会回到高维连续空间难以泛化的问题。因此这篇论文真正值得关注的不是“离散”这个词，而是它如何在压缩、可分性和可重建之间做平衡。

## 原文信息

- arXiv: https://arxiv.org/abs/2409.18707
- PDF: https://arxiv.org/pdf/2409.18707
- Project: https://discretepolicy.github.io

```bibtex
@inproceedings{wu2025discretepolicy,
  title={Discrete Policy: Learning Disentangled Action Space for Multi-Task Robotic Manipulation},
  author={Wu, Kun and Zhu, Yichen and Li, Jinming and Wen, Junjie and Liu, Ning and Xu, Zhiyuan and Tang, Jian},
  booktitle={IEEE International Conference on Robotics and Automation},
  year={2025}
}
```
