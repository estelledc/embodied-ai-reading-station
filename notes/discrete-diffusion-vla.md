---
title: "Discrete Diffusion VLA: Bringing Discrete Diffusion to Action Decoding in Vision-Language-Action Policies"
slug: discrete-diffusion-vla
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2508.20072"
venue: arXiv
year: 2025
era: frontier
num: 166
generated_at: 2026-07-14
---

# Discrete Diffusion VLA：让动作 token 不再只能从左到右生成

> 这是一份面向零基础读者的结构化研究笔记。本文只把公开论文文本和 arXiv 元数据能支持的结论写成事实；本站没有本地训练、仿真或真机复现实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

Discrete Diffusion VLA 把动作生成放回一个统一 transformer 里：视觉、语言和动作都在同一骨干中融合，动作不是 autoregressive 左到右吐 token，而是通过离散扩散从全 mask 的 action chunk 逐步还原。

如果只记一个直觉：它不是在问机器人能不能完成某个固定任务，而是在问能不能把看见、听懂、知道自己是什么身体、再输出动作这几件事，整理成更可扩展的一条路。


*所以这一节是想说：Discrete Diffusion VLA 的价值在于把分散的具身问题压成一个可比较、可继续扩展的建模接口。*

## 这是个什么场景

假设你要写一串 56 个动作数字。AR 模型像排队填表，前一个没填好后一个就受影响；Discrete Diffusion VLA 像拼拼图，先把最容易确定的块放上去，再回头修最不确定的块。对机器人来说，这种先易后难、可回头改的性质很适合动作 chunk。

对初学者来说，这类论文最容易误读成又一个大模型名字。更准确的读法是：它们在给具身 AI 建接口。所谓接口，就是模型和世界之间约好的语言。图像告诉模型世界长什么样，语言告诉模型人想要什么，身体描述告诉模型自己能怎么动，动作空间告诉模型输出该怎么被机器人执行。

```text
读者视角：为什么需要 Discrete Diffusion VLA

旧路线：任务 A 模型 ─┐
        任务 B 模型 ─┼──> 每个任务/身体单独维护，迁移成本高
        任务 C 模型 ─┘

Discrete Diffusion VLA：视觉 + 语言 + 身体约束 + 动作/轨迹
        │
        ▼
统一表示 / 统一解码 / 统一评测
        │
        ▼
更容易比较、复用和继续扩展
```

```text
机制视角：从观察到动作

[图像/视频]   [语言指令]   [身体描述/控制约定]
     │            │              │
     └────────────┴──────────────┘
                  ▼
           多模态上下文表示
                  ▼
          动作或轨迹生成模块
                  ▼
       action chunk / waypoint / trajectory
                  ▼
          仿真评测或真实机器人执行
```

这个场景和纯聊天模型最大区别在于：输出不是一句话，而是会改变世界的动作。聊天模型答错可以重新问，机器人动作错了可能撞到桌子、夹坏物体、走到错误房间。所以论文里的 benchmark、动作表示、控制频率和 Sim2Real 细节，都不是边角料，而是决定结论能不能落地的核心。


*所以这一节是想说：理解 Discrete Diffusion VLA 要先把它放在模型输出会驱动物理世界的场景里，而不是只按普通 VLM 论文读。*

## 之前的人怎么做的，为什么不够好

VLA 的动作头常见两种：一种在 VLM 之外接 MLP 或连续 diffusion head，信息路径被拆开；另一种像 OpenVLA 一样离散化动作并 autoregressive 生成，动作维度必须左到右排队。前者不够统一，后者有顺序瓶颈且早期错误难以修正。

早期路线通常把系统拆成几块：视觉模块负责看，语言模块负责理解，规划器负责拆任务，控制器负责执行。拆开有好处：每块容易调试。但坏处也明显：模块之间要靠人工设计的中间表示传话，一旦换机器人、换任务、换环境，就会出现大量胶水代码。

端到端 VLA 出现后，大家开始把图像、语言和动作放进同一个模型。但第一代端到端路线也有局限：有的只覆盖桌面操作，有的只支持单个 embodiment，有的依赖 autoregressive action token，生成动作时像写句子一样从左到右排队。机器人动作不是普通句子，多个控制维度和未来多个 timestep 往往要一起协调。强行顺序化，可能让本来并行相关的控制量变成脆弱的前缀依赖。

还有一个更工程化的问题：数据和评测不统一。不同论文用不同机器人、不同相机、不同动作维度、不同成功率定义。这样读者很难判断一个方法是真的更强，还是只是换了更容易的任务。第一批新增论文都在不同角度回应这个问题：要么统一模型接口，要么统一平台和 benchmark，要么统一动作生成机制。


*所以这一节是想说：旧方法不够好，不是因为它们没用，而是因为它们太容易被任务、身体和评测方式切碎。*

## 这篇论文的新想法

论文把 continuous controls 先离散成 action tokens，再在 action chunk 上做 discrete diffusion。训练时随机 mask 一部分动作 token，让 transformer 预测原 token；推理时从全 mask 开始，每轮按置信度提交一部分 token，并把不稳定 token 二次 re-mask，直到得到完整动作 chunk。

这件事的关键不在名字，而在取舍。统一模型会带来规模化收益：数据可以混用，模型可以迁移，评测可以并排比较。但统一也会带来优化压力：不同任务的损失函数、动作维度和时间尺度会互相拉扯。论文要证明的就是：这些拉扯可以通过结构设计、训练阶段和解码策略被控制住。

对读者来说，可以用三个问题快速抓住新意：第一，它把什么原本分开的东西合到了一起？第二，它为了合并付出了什么代价？第三，实验是否证明这个代价值得？只要能回答这三个问题，就已经抓住论文主线。


*所以这一节是想说：Discrete Diffusion VLA 的新意是把一个分散工程问题改写成一个统一建模问题，再用实验说明这种统一没有白做。*

## 它分几步做的（方法）

### 第 1 步：离散动作空间

**输入**：位置、姿态、gripper 等连续控制维度沿用 RT/OpenVLA 系列的 256-bin quantile scheme，只离散 1st–99th percentiles 以减少 outlier 影响。

**处理**：这里不要把输入进模型理解成只塞一个张量。具身 AI 的输入通常同时包含画面、语言、身体约束、时间窗口和控制接口。Discrete Diffusion VLA 的设计重点，是把这些异构信息整理成模型能稳定消费的形式，并避免每换一台机器人就重写一套架构。

**输出**：输出不是一句口号，而是更稳定的动作、轨迹、评测数据或系统接口。换成生活类比，这一步像把不同厨房的炉灶、刀具、食材标签统一成一张菜谱。厨师不必每到一个厨房重新学语言，只要知道这口锅多大、火力怎么调、食材在哪里，就能按同一套流程做菜。

### 第 2 步：统一骨干

**输入**：基于 OpenVLA / Prismatic-7B 架构，视觉端使用 SigLIP + DINOv2，语言端使用 Llama 2，动作 token 与图文 token 一起进入 transformer。

**处理**：这里不要把输入进模型理解成只塞一个张量。具身 AI 的输入通常同时包含画面、语言、身体约束、时间窗口和控制接口。Discrete Diffusion VLA 的设计重点，是把这些异构信息整理成模型能稳定消费的形式，并避免每换一台机器人就重写一套架构。

**输出**：输出不是一句口号，而是更稳定的动作、轨迹、评测数据或系统接口。换成生活类比，这一步像把不同厨房的炉灶、刀具、食材标签统一成一张菜谱。厨师不必每到一个厨房重新学语言，只要知道这口锅多大、火力怎么调、食材在哪里，就能按同一套流程做菜。

### 第 3 步：双向动作注意力

**输入**：不同于 causal AR，动作位置使用 bidirectional attention，可以看见所有图文 token 和其他动作位置。

**处理**：这里不要把输入进模型理解成只塞一个张量。具身 AI 的输入通常同时包含画面、语言、身体约束、时间窗口和控制接口。Discrete Diffusion VLA 的设计重点，是把这些异构信息整理成模型能稳定消费的形式，并避免每换一台机器人就重写一套架构。

**输出**：输出不是一句口号，而是更稳定的动作、轨迹、评测数据或系统接口。换成生活类比，这一步像把不同厨房的炉灶、刀具、食材标签统一成一张菜谱。厨师不必每到一个厨房重新学语言，只要知道这口锅多大、火力怎么调、食材在哪里，就能按同一套流程做菜。

### 第 4 步：masked-token 训练

**输入**：采样 mask ratio，把 action chunk 中一部分位置替换为 [MASK]，只在 masked indices 上做 cross-entropy。

**处理**：这里不要把输入进模型理解成只塞一个张量。具身 AI 的输入通常同时包含画面、语言、身体约束、时间窗口和控制接口。Discrete Diffusion VLA 的设计重点，是把这些异构信息整理成模型能稳定消费的形式，并避免每换一台机器人就重写一套架构。

**输出**：输出不是一句口号，而是更稳定的动作、轨迹、评测数据或系统接口。换成生活类比，这一步像把不同厨房的炉灶、刀具、食材标签统一成一张菜谱。厨师不必每到一个厨房重新学语言，只要知道这口锅多大、火力怎么调、食材在哪里，就能按同一套流程做菜。

### 第 5 步：adaptive decoding

**输入**：推理从全 mask 开始，按 confidence 或 confidence gap 排序，先提交高置信 token，剩余保持 mask；secondary re-masking 用阈值和 residual-drop 检查早提交 token。

**处理**：这里不要把输入进模型理解成只塞一个张量。具身 AI 的输入通常同时包含画面、语言、身体约束、时间窗口和控制接口。Discrete Diffusion VLA 的设计重点，是把这些异构信息整理成模型能稳定消费的形式，并避免每换一台机器人就重写一套架构。

**输出**：输出不是一句口号，而是更稳定的动作、轨迹、评测数据或系统接口。换成生活类比，这一步像把不同厨房的炉灶、刀具、食材标签统一成一张菜谱。厨师不必每到一个厨房重新学语言，只要知道这口锅多大、火力怎么调、食材在哪里，就能按同一套流程做菜。

把这些步骤连起来看，方法部分不是一堆模块名，而是一条数据流：先明确身体和任务，再把多模态观察变成上下文，再用动作生成模块输出未来动作，最后通过 benchmark 或真实机器人判断动作是否有用。任何一步模糊，都会让成功率数字失去解释力。

一个常见误区是只盯最后的模型名字。真正影响复现的是输入格式、动作空间、训练阶段、推理频率和评测协议。比如同样叫 VLA，一个模型输出离散 token，另一个输出连续位姿；一个每步重新推理，另一个输出 action chunk；一个能回看修正，另一个只能从左到右生成。这些差异比名字更重要。


*所以这一节是想说：方法部分要按输入、处理、输出的流水线读，才能看懂 Discrete Diffusion VLA 到底改变了哪一环。*

## 关键数字（What works）

| 事实 | 数字 / 状态 | 来源与证据边界 |
|---|---:|---|
| 动作离散 | 256-bin quantile-based scheme；只离散 1st–99th percentiles | Method 3.3 |
| 每步动作 token | Dact = 7：3 translation + 3 rotation + 1 gripper | Method 3.3 |
| LIBERO | 平均 SR 96.3%；Spatial/Object/Goal/Long = 97.2/98.6/97.4/92.0 | Table 1 |
| OpenVLA 对照 | OpenVLA 平均 76.5%；OpenVLA-OFT Discrete 平均 95.5% | Table 1 |
| Google Robot | SimplerEnv-Fractal overall 64.1% | Table 2 |
| WidowX | SimplerEnv-Bridge overall 54.2% | Table 3 |
| 默认 refinement | 12 rounds；cosine mask schedule | Training details |
| chunk size | LIBERO / Fractal 使用 H=8；Bridge 使用 H=3 | Appendix / training details |
| 解码消融 | LIBERO-Goal 从 one-shot parallel 95.6% 到 confidence + secondary remask 97.4% | Table 4 |
| 速度 | 约 3 Hz action chunk generation | Speed-quality discussion |

这些数字要按证据等级理解：它们是论文报告结果，不是本站本地复现结果。本站目前只完成文本研究、站点构建、provenance 和部署验证；没有保存训练日志、模型权重、仿真录像或真机执行 artifact。因此它们只能支持论文声称或公开文本报告，不能支持本站跑通。


*所以这一节是想说：关键数字的价值是帮我们定位论文贡献和边界，而不是把作者报告直接当成自己的实验结论。*

## 实验结果说明了什么

实验覆盖 Franka Panda on LIBERO、Google Robot on SimplerEnv-Fractal 和 WidowX on SimplerEnv-Bridge。最关键的是 matched tokenization 对比：OpenVLA-OFT Discrete 已经很强，Discrete Diffusion VLA 仍从 95.5% 提到 96.3%，说明改进不只是因为换了离散化，而是 easy-first + re-masking 的解码机制确实带来收益。

读这类实验时，建议分三层：第一层看 in-domain 成功率，说明模型有没有学会训练分布内的任务；第二层看 OOD 或新环境，说明它是否真有泛化；第三层看真实机器人或 Sim2Real，说明它是否经得起物理世界的噪声。只看第一层，容易高估方法。

还有一个重要问题：成功率不是唯一答案。一个模型可能平均分高，但在动态抓取、双臂协作或精细控制上很弱。对具身 AI 来说，失败类型往往比平均分更有学习价值，因为它告诉我们下一轮系统应该补感知、补规划、补控制，还是补数据。


*所以这一节是想说：实验结果支持 Discrete Diffusion VLA 的主张，但也提醒我们要按任务类型和证据层级拆开看。*

## 你应该懂的几个新词

- Vision-Language-Action (VLA)：视觉-语言-动作模型。输入图像和指令，输出机器人动作。类比：不是只听懂拿杯子，还要真的伸手去拿。
- Embodiment（身体/本体）：机器人自己的物理形态和控制接口。机械臂、人形机器人、移动底盘都有不同 embodiment。
- Action chunk：一次输出未来多步动作，而不是每个控制周期只预测一步。类比：导航时先规划接下来几步，而不是每走一厘米想一次。
- Sim2Real：从仿真迁移到真实世界。难点是仿真的光照、摩擦、传感器和接触不可能完全等于现实。
- OOD generalization：面对训练时没见过的对象、布局、背景或任务组合仍能工作。
- Provenance：来源证据链。本站用它记录笔记、原文、生成资产和人工核验状态，防止看起来像事实的内容没有出处。


*所以这一节是想说：术语不是为了显得专业，而是为了精确描述模型和真实世界之间的接口。*

## 它有什么搞不定的

- 训练要解决大量 masked infilling 任务，训练复杂度高于直接 AR fine-tuning。
- 离散 bin 会丢失连续精度，尤其对高精度接触和微小姿态调整需要谨慎。
- 多轮 refine 带来额外延迟，3 Hz action chunk generation 对部分高频控制可能仍不够。
- 它仍基于现有 OpenVLA/Prismatic-7B 输入配置，真实多传感器、触觉、力反馈没有被系统纳入。

这些局限并不削弱论文价值，反而说明它站在一个真实问题上。具身 AI 的难点正是：模型能力、数据规模、硬件接口、实时控制、安全约束和评测可信度同时出现。任何论文只解决其中一两项，剩下的问题都要靠后续系统继续补。


*所以这一节是想说：Discrete Diffusion VLA 是前沿推进，不是终局答案；它解决了一个关键断点，也留下了下一批研究问题。*

## 它和别的几篇是什么关系

- 它和 LLaDA-VLA 是同一批扩散式 VLA 方向，但 Discrete Diffusion VLA 更贴近 OpenVLA 统一 transformer 改造。
- 它和 OpenVLA-OFT 的对比最直接：同样离散动作 token，前者 autoregressive 或 OFT，后者用 discrete diffusion 的可回看解码。
- 它和 Diffusion Policy 的共同点是渐进式生成动作，差异是 Diffusion Policy 常在连续动作空间去噪，这篇在离散 action tokens 上去噪。

如果你想把这篇放进本站知识图谱，最自然的读法是：先回到主题 primer 建地基，再读同一方法族的前后代，最后读 benchmark / platform 类论文校准实验边界。不要孤立背论文名，要看它接住了前人哪个问题，又把哪个问题留给后人。


*所以这一节是想说：Discrete Diffusion VLA 最适合和同主题 VLA、扩散策略、数据评测论文连读，而不是单篇孤立记忆。*

## 和本导读的关系

本篇对应导读中的 [Ch04: 技术版图](../guide/ch04-landscape.md)、[Ch12: VLA](../guide/ch12-openvla-vlas-mla.md) 和后续 Sim2Real / benchmark 章节。读它之前，建议至少先知道三件事：VLM 为什么能对齐图文，VLA 为什么要把动作 token 化或连续化，机器人评测为什么必须区分仿真、真实和 OOD。

对当前 40 篇扩展计划来说，Discrete Diffusion VLA 属于第一批，因为它能补上 2025–2026 前沿 VLA 的新分支。第一批不是为了追热点，而是为了把统一 VLA 和扩散式动作解码这两条线先接到站点现有 162 篇图谱上。


*所以这一节是想说：这篇笔记是导读从经典 VLA 走向 2025–2026 前沿路线的桥。*

## 思考题

**Q1：这篇论文最想解决的碎片化具体指什么？**

<details>
<summary>提示</summary>

看它是不是要统一任务、统一身体、统一动作空间，还是统一评测流程。

</details>

**Q2：它的动作表示和 OpenVLA / RT-2 有什么差异？**

<details>
<summary>提示</summary>

比较连续动作、离散 token、flow matching、masked diffusion 或 action chunk。

</details>

**Q3：关键数字里哪个最能说明贡献？哪个最容易被误读？**

<details>
<summary>提示</summary>

高分说明能力，低分或小规模实验说明边界。

</details>

**Q4：如果放到真实家务机器人上，第一处可能失败在哪里？**

<details>
<summary>提示</summary>

想传感器、延迟、接触力、未知物体、长程状态和安全约束。

</details>

**Q5：它和本站已有哪三篇最应该连读？**

<details>
<summary>提示</summary>

优先找同主题 primer 和方法相近的模型。

</details>

**Q6：如果要复现，只能先跑一个最小实验，你会选哪个 benchmark？**

<details>
<summary>提示</summary>

选择最小可跑环境，而不是最大最酷的真机任务。

</details>

## 一些好奇心问答（FAQ）

**Q：这是不是说明端到端 VLA 已经解决机器人了？**

不是。端到端 VLA 让系统更统一，但真实世界还有安全、接触、失败恢复、长程记忆和数据成本。论文成功率越具体，越要看任务范围。

**Q：为什么很多论文都强调 action chunk？**

因为机器人动作有时间连续性。一次只预测一步会频繁调用大模型，慢且容易抖；一次预测一段动作，可以更平滑，也能利用未来几步的相关性。

**Q：为什么本站不把这些成功率写成我们验证了？**

因为验证需要本地或线上 artifact，比如训练日志、模型 checkpoint、评测脚本、视频或真机记录。本文只做公开论文研究和站点部署，证据等级不同。

**Q：读不懂公式怎么办？**

先抓输入、输出和控制流。公式通常是在说明怎么把动作加噪、怎么去噪、怎么计算损失。能用人话复述机制，比逐符号背诵更重要。

## 如果你想再深入

1. 先读本站已有的 rt-1、rt-2、openvla，理解 VLA 基线。
2. 再读 diffusion-policy、pi0、cogact，理解连续动作生成和扩散/流匹配路线。
3. 最后读本篇和同批的扩散式 VLA，比较 autoregressive、continuous diffusion、discrete diffusion 三种动作解码。
4. 真要复现时，优先找官方代码、最小 benchmark 和固定环境，不要一开始就上真机。

## 原文信息

- arXiv: [2508.20072](https://arxiv.org/abs/2508.20072)
- 本站状态：公开来源研究；未做本地训练、仿真或真机复现；human verification 仍应保持 UNVERIFIED，直到逐节人工核验完成。

```bibtex
@misc{discrete_diffusion_vla_2025,
  title = {Discrete Diffusion VLA: Bringing Discrete Diffusion to Action Decoding in Vision-Language-Action Policies},
  year = {2025},
  eprint = {2508.20072},
  archivePrefix = {arXiv},
  primaryClass = {cs.RO},
  note = {Read through Embodied AI: Zero to One},
  url = {https://arxiv.org/abs/2508.20072}
}
```
