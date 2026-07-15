---
title: "villa-X: Enhancing Latent Action Modeling in Vision-Language-Action Models"
slug: villa-x
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2507.23682"
venue: arXiv
year: 2025
era: frontier
num: 193
generated_at: 2026-07-15
---

# villa-X：把视频里的“隐动作”变成 VLA 预训练信号

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和项目页能支持的结论；本站没有复现 SIMPLER、LIBERO 或真实机器人实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

villa-X 的问题是：VLA 模型很想从海量视频中学习动作，但视频通常没有机器人 action labels。人类视频、互联网视频和不同机器人 embodiment 的视频里都有“发生了什么变化”，却没有统一的 7D 末端执行器动作。villa-X 提出 Vision-Language-Latent-Action（ViLLA）框架，把相邻帧之间的视觉变化压成 latent action，再用这些 latent actions 辅助 VLA 预训练和控制。

论文的关键不是简单加一个 latent token，而是改进 latent action modeling：加入额外 proprioceptive forward dynamics model、使用 embodiment context、设计 latent action expert，让模型能从 human/robot videos 学到更通用的动作中间表示。实验覆盖 SIMPLER、LIBERO、Realman gripper 和 Xarm + XHand dexterous hand。

如果只记一个直觉：villa-X 像给视频加了“动作字幕”。这些字幕不是人写的“向左移动 3 厘米”，而是模型学出来的 latent codes，表示从上一帧到下一帧发生了什么可操作变化。

*所以这一节是想说：villa-X 用 latent action 把无动作标签视频变成 VLA 可用的预训练材料。*

## 这是个什么场景

机器人数据最大的问题是贵。真实机器人轨迹需要硬件、遥操作、校准和安全检查；不同机器人手臂的动作空间还不一样。相比之下，视频便宜得多：人类演示视频、机器人视频、互联网操作视频都能显示物体如何变化。

但视频没有直接的 robot action。对一个机械臂来说，action 可能是末端位姿增量和 gripper 开合；对灵巧手来说，action 可能是几十维关节控制；对人类视频来说，根本没有机器人控制量。如何从这些异构视频中学到“动作”？

latent action 的想法是：不强行把所有视频变成同一种真实动作，而是学一个中间 code，表示视觉状态变化。这个 code 可以帮助 VLA 预测下一步、理解运动语义、再通过具体机器人 decoder 转成可执行动作。

```text
普通机器人轨迹:
  image_t + language + robot_action_t -> policy

大量无标签视频:
  image_t + image_{t+1}
        │
        ▼
  latent action z_t  (视觉变化的动作字幕)
        │
        ▼
  VLA pretraining / latent action expert
```

*所以这一节是想说：villa-X 面向的是“视频很多、动作标签很少且 embodiment 不统一”的 VLA 预训练问题。*

## 之前的人怎么做的，为什么不够好

第一，直接用机器人 action labels 训练 VLA，数据质量高但规模有限。Open X-Embodiment、Bridge、DROID 等数据集很重要，但覆盖不了所有对象、任务和 embodiment。

第二，用视频预训练视觉或世界模型，可以学到物体变化，但不一定形成可用于控制的动作表示。模型可能知道“杯子移动了”，却不知道怎样让机器人移动杯子。

第三，已有 latent action 方法往往把视觉变化压成 code，却没有充分利用 proprioception 和 embodiment context。不同机器人看到相同视觉变化时，需要不同控制方式；同一 latent action 在不同 embodiment 下也可能对应不同真实 action。

第四，直接把 human video 和 robot video 混在一起很难。如果没有结构化 latent action，模型容易只学外观和背景，而不是可迁移的运动语义。

villa-X 的判断是：要让视频成为 VLA 预训练燃料，latent action 必须更有结构、更贴近真实动作、更能区分 embodiment。

*所以这一节是想说：旧方法要么太依赖机器人标签，要么 latent action 不够可控可迁移。*

## 这篇论文的新想法

第一，新想法是 ViLLA：Vision-Language-Latent-Action。它在视觉、语言和真实动作之间加一个 latent action 层，让视频变化先变成中间动作语义。

第二，新想法是 improved latent action model。论文引入 extra proprio FDM，把 latent actions 和真实机器人 proprio/action dynamics 连接起来。这样 latent code 不只是视觉压缩，而和可执行控制更相关。

第三，新想法是 embodiment context。模型显式知道当前 embodiment，避免把不同机器人或人类视频的动作混成一个无上下文 code。

第四，新想法是 latent action expert。VLA policy 不只是看语言和图像，还能利用 latent action 序列做 planning / control。论文在 SIMPLER、LIBERO、真实机器人上验证这个 expert 的作用。

```text
villa-X 的核心分层

video frames + language
        │
        ▼
Latent Action Model
        │  输出视觉变化的 latent actions
        ▼
VLA pretraining with latent actions
        │
        ▼
Latent Action Expert + robot-specific decoder
        │
        ▼
real robot action
```

*所以这一节是想说：villa-X 把 latent action 做成连接视频预训练和机器人控制的中间层。*

## 它分几步做的（方法）

### 第 1 步：从相邻帧学习 latent action

输入是视频片段、语言描述和相邻视觉帧。Latent Action Model 观察从 `image_t` 到 `image_{t+1}` 的变化，把这种变化编码成 discrete 或 continuous latent action。

处理上，模型不是只做图像重建，而是关注“什么变化可以被动作解释”。比如物体位置改变、夹爪接近、杯子被拿起，都可以成为 latent action 的语义。

输出是 latent action tokens。这些 tokens 不是具体机器人控制量，而是动作语义的中间表示。

### 第 2 步：用 proprioceptive FDM 让 latent action 更像可执行动作

输入是机器人 proprioception、真实 action 和 latent action。FDM 可以理解成 forward dynamics model，预测执行某动作后状态会怎样变化。

处理上，villa-X 加入 extra proprio FDM，把 latent action 与机器人本体状态变化对齐。这样 latent code 不只解释像素变化，也被迫包含对机器人控制有用的信息。

输出是更高质量 latent action。论文在 LIBERO 上用 L1 loss 等方式评估 latent action 质量，说明改进 LAM 学到的表示更接近可控制运动。

### 第 3 步：加入 embodiment context

输入是视频、latent action 和 embodiment 信息。embodiment 可以理解为“这是谁的身体”：Google Robot、WidowX、Realman gripper、XHand dexterous hand 或人类手。

处理上，模型把 embodiment context 作为条件，让同一视觉变化在不同身体上有不同解释。比如“抓起物体”对夹爪和灵巧手来说动作细节不同。

输出是更可迁移的 latent action 表示。论文认为这个设计对跨 embodiment 学习很关键。

### 第 4 步：用 latent action 预训练 VLA

输入是图像、语言、latent actions 和可用的真实机器人数据。处理上，VLA 不只学习从语言到 action，还学习如何利用 latent actions 作为中间计划。

输出是一个带 latent action expert 的 policy。它可以在执行时先生成或利用 latent action，再转成真实动作。

这一步类似让模型先学“动作草图”，再学“具体控制”。动作草图来自大量视频，因此比只看机器人动作标签更丰富。

### 第 5 步：在 simulation benchmark 上评估

输入是 SIMPLER 和 LIBERO。SIMPLER 覆盖 Google Robot 和 WidowX 的多任务设置；LIBERO 有 Spatial、Object、Goal、Long 四个 suite。

处理上，论文比较 villa-X、去掉 latent 的 ablation，以及 OpenVLA、GR00T、Octo、RT-1-X、SpatialVLA 等 baselines。

输出是成功率表。论文报告 villa-X 在 SIMPLER 的 Google robot 平均成功率 77.7%、WidowX 平均 62.5%，LIBERO 四个 suite 也优于对照。

### 第 6 步：在真实机器人上评估

输入是两类真实平台：Realman RM75 + gripper，以及 Xarm + 12-DoF XHand。Realman 评估 Pick-in、Pick-out、Stack、Unstack、Push；XHand 评估 pick-and-place、cube stacking、cup upright placement、water pouring、ball flicking。

处理上，Realman 使用 375 teleoperated trajectories，XHand 使用 4000 trajectories、13 task categories。模型和 baselines 在相同位置、光照或任务设置下比较。

输出是论文报告的真实机器人成功率。重点不是单个数字多高，而是 latent action 在夹爪和灵巧手两种 embodiment 上都有增益。

### 第 7 步：分析 latent action 的边界

论文也承认，latent action 还不能完全替代高层语言理解。它主要解释视觉变化和动作语义，但复杂任务仍需要语言、记忆、规划和环境约束。

输出是方法边界：villa-X 是一种让视频数据更有用的预训练范式，不是单独解决所有 VLA 泛化问题。

*所以这一节是想说：villa-X 的方法链是视频变化 -> latent action -> VLA 预训练 -> robot-specific control。*

## 关键数字

| 数字或设置 | 原文语境 | 这说明什么 |
|---|---|---|
| 77.7% | SIMPLER Google robot 平均成功率 | 论文报告 full model 最高 |
| 62.5% | SIMPLER WidowX 平均成功率 | 跨平台也有提升 |
| 8 SIMPLER tasks | visual matching setting | 覆盖 Google Robot 和 WidowX |
| 300 / 240 / 216 / 108 trials | Google Robot 各类任务 rollout 数 | 评估规模较细 |
| 240 rollouts per WidowX task | WidowX 任务评估设置 | 每任务重复测试 |
| 375 trajectories | Realman gripper fine-tuning set | 真实夹爪数据规模 |
| 4000 trajectories / 13 categories | XHand Dataset | 灵巧手真实数据更大 |
| 12-DoF XHand | dexterous hand 设置 | 跨 embodiment 难度更高 |
| 4 LIBERO suites | Spatial/Object/Goal/Long | 测多任务和泛化 |

这些数字全部来自论文报告，不是本站复现实验。villa-X 的 PDF 中表格较多，后续人工审计应重点核验 Table 2、Table 3、Table 4、Table 9。

*所以这一节是想说：villa-X 的证据重点在多 benchmark 和两类真实机器人。*

## 实验结果说明了什么

第一，latent action 确实提供了额外信息。论文中去掉 latent 的 ablation 表现更低，说明视频变化表示不是装饰，而是帮助 policy 理解动作过程。

第二，人类视频和机器人视频的混合有价值。villa-X 能利用 unlabelled video，这对 VLA 很关键，因为机器人 action labels 永远比视频稀缺。

第三，embodiment context 有意义。不同机器人身体不同，模型需要知道“谁在执行”。没有这个上下文，latent action 可能变成模糊平均。

第四，真实机器人验证比只在仿真更有说服力。Realman gripper 和 XHand 代表两种不同控制难度，后者尤其考验 dexterous manipulation 和 embodiment transfer。

第五，实验仍不能证明“通用”。任务、平台、数据集都有边界。villa-X 说明 latent action 是有前途的中间层，但还需要更多开放世界验证。

*所以这一节是想说：villa-X 的实验支持 latent action 是 VLA 扩数据的重要路线。*

## 你应该懂的几个新词

- Latent action：模型学出的隐式动作表示，不直接等于机器人控制量。
- ViLLA：Vision-Language-Latent-Action，把 latent action 放进 VLA 框架。
- Forward dynamics model：预测动作导致状态如何变化的模型。
- Proprioception：机器人自身状态，例如关节角、末端位置、夹爪状态。
- Embodiment：身体形态和动作空间，例如夹爪、灵巧手、人手。
- SIMPLER：用于评估真实风格机器人操作泛化的仿真 benchmark。
- LIBERO：机器人多任务和 lifelong learning benchmark。
- Dexterous hand：多自由度灵巧手，比普通夹爪控制复杂。

*所以这一节是想说：villa-X 的关键词是 latent action、proprioception 和 embodiment。*

## 它有什么搞不定的

第一，latent action 可解释性有限。它比真实 action 更抽象，但不一定能被人直接读懂。

第二，视频中的变化不总是由可控动作导致。摄像机运动、遮挡、物体弹跳都可能让 latent action 学到混杂信号。

第三，跨 embodiment 仍很难。夹爪、灵巧手和人手虽然都能“抓”，但接触力、轨迹和控制维度差异很大。

第四，真实机器人实验仍在受控任务中进行。开放家庭环境、未知物体和长程规划还没有被充分覆盖。

第五，latent action 主要增强动作表示，不替代安全、碰撞检测、任务规划和失败恢复。

*所以这一节是想说：villa-X 解决数据表示问题，但不直接解决所有控制问题。*

## 它和别的几篇是什么关系

和 `gaze2act` 相比，villa-X 不依赖人的 gaze，而是从视频中学隐动作。Gaze2Act 关注在线人机意图，villa-X 关注离线视频预训练。

和 `lacy` 相比，villa-X 的循环不是语言-动作解释，而是视觉变化-隐动作-真实控制。LACY 强调语义一致性，villa-X 强调运动表示。

和 `instructvla` 相比，villa-X 更偏动作中间层；InstructVLA 更偏 instruction tuning、reasoning 和 action expert。

和 Batch 7 的 trace-focused diffusion policy 相比，两者都关心动作历史或中间表示，但 villa-X 更强调从无标签视频中学习 latent actions。

*所以这一节是想说：villa-X 是 Batch 8 里视频预训练和跨 embodiment 的代表。*

## 和本导读的关系

本导读里很多 VLA 论文都绕不开数据问题：动作数据贵、机器人身体不同、语言表达多样。villa-X 提供了一条路线：不要只盯带 action labels 的机器人轨迹，而要把视频变化本身变成可训练的动作线索。

这篇也适合放在“世界模型 / latent representation / VLA pretraining”之间阅读。它帮助读者理解为什么很多前沿 VLA 都在找中间表示：trajectory、keypoint、skill、latent action、trace，本质上都是把复杂连续控制压成更可学习的结构。

*所以这一节是想说：villa-X 让读者看到 VLA 如何借助 latent action 吃进更多视频数据。*

## 思考题

**Q1：为什么视频很多但不能直接当机器人 action 数据？**

<details>
<summary>提示</summary>

视频只有图像变化，通常没有机器人关节、末端位姿或 gripper 命令。不同身体的动作空间也不同。
</details>

**Q2：latent action 和真实 action 有什么区别？**

<details>
<summary>提示</summary>

真实 action 是可执行控制量，latent action 是模型学出的中间表示，描述视觉变化或动作语义。
</details>

**Q3：为什么需要 embodiment context？**

<details>
<summary>提示</summary>

同样“拿起杯子”，夹爪、灵巧手、人手的执行方式不同。模型必须知道是哪种身体。
</details>

**Q4：proprioceptive FDM 为什么有帮助？**

<details>
<summary>提示</summary>

它把 latent action 和机器人自身状态变化连接起来，避免 latent action 只学到像素变化。
</details>

**Q5：villa-X 的真实机器人实验为什么比纯仿真更重要？**

<details>
<summary>提示</summary>

latent action 如果只在仿真有效，可能只是 benchmark 特化。真实夹爪和灵巧手能检验跨平台信号。
</details>

## 一些好奇心问答（FAQ）

**Q：latent action 是不是类似“动作标签”？**

有点像，但它不是人工定义的标签，而是模型从视觉变化中学出的 code。

**Q：villa-X 能直接从 YouTube 学机器人吗？**

论文方向上接近这个目标，但真实情况还需要处理视角、噪声、物体、身体差异和安全问题。

**Q：为什么不用语言描述每个视频动作？**

语言描述成本高，而且不够精确。latent action 可以从帧间变化自动学习更密集的动作线索。

**Q：这篇和 world model 是一类吗？**

相关但不完全相同。world model 预测世界状态，villa-X 更强调把视觉变化压成可用于 VLA 控制的 latent action。

**Q：最值得学习的工程思想是什么？**

把“无动作标签视频”转化为“有 latent action 的训练材料”，再用 embodiment context 对齐不同机器人。

## 如果你想再深入

1. 读 LAPA、MoTo 等 latent action / video policy work，比较不同 latent action 学法。
2. 读 SIMPLER 和 LIBERO benchmark，理解 villa-X 的实验设置。
3. 读 OpenVLA、GR00T、Octo，比较 action labels 驱动的 VLA 训练。
4. 研究 embodiment transfer，思考同一动作语义如何映射到不同身体。

*所以这一节是想说：villa-X 是理解视频预训练如何进入 VLA 的关键案例。*

## 精读补充：为什么 latent action 不是“换个名字的特征”

读 villa-X 时最容易误会的是把 latent action 当成普通 visual feature。普通视觉特征回答“图里有什么”，latent action 更接近回答“状态为什么会从上一帧变成下一帧”。这两个问题很不一样。比如桌上有一个红色方块，视觉特征会编码颜色、边缘和位置；latent action 要编码的是方块被推了、夹爪靠近了、还是摄像机动了。只有后者才接近机器人能学习的操作因果。

这也是 villa-X 加 proprioceptive FDM 和 embodiment context 的原因。没有 proprioception，latent action 可能只学到像素变化；没有 embodiment，latent action 可能不知道这种变化由哪种身体产生。把这两个条件加进去后，latent action 才更像“可被某个机器人身体执行或解释的动作草图”。所以 villa-X 的贡献不只是多一个 token，而是把 token 绑定到视频变化、身体形态和控制结果之间。

对初学者来说，可以把它和自然语言里的“动词”类比。名词告诉你场景里有什么，动词告诉你发生了什么。但机器人需要的动词还要更具体：谁动、怎么动、动完状态怎样。latent action 就是在尝试学习这种跨视频、跨身体的操作动词。

## 原文信息

- arXiv: https://arxiv.org/abs/2507.23682
- PDF: https://arxiv.org/pdf/2507.23682
- Project: https://microsoft.github.io/villa-x/

```bibtex
@article{chen2025villax,
  title={villa-X: Enhancing Latent Action Modeling in Vision-Language-Action Models},
  author={Chen, Xiaoyu and Wei, Hangxing and Zhang, Pushi and Zhang, Chuheng and Wang, Kaixin and Guo, Yanjiang and others},
  journal={arXiv preprint arXiv:2507.23682},
  year={2025}
}
```
