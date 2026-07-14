---
title: "CogACT: A Foundational Vision-Language-Action Model for Synergizing Cognition and Action in Robotic Manipulation"
slug: cogact
topic: vla
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2411.19650"
venue: arXiv
year: 2024
era: frontier
num: 158
generated_at: 2026-07-14
---

# CogACT：给 VLA 分出“想明白”和“动得准”两套本领

> 这是一份面向零基础读者的精读笔记。本文只基于公开 arXiv 论文、项目页与 PDF 抽取文本，不声称本站本地复现了训练或真机实验。

## 一句话讲什么（TL;DR）

CogACT 认为，把大视觉语言模型直接改成“吐动作 token”的 OpenVLA 式做法还不够会动。它把 VLA 拆成两层：VLM 负责看图、读指令、理解任务，专门的 diffusion transformer action module 负责生成连续动作序列。结果是在模拟和真机评测中明显超过同尺寸 OpenVLA，也超过闭源大模型 RT-2-X 的模拟结果。

*所以这一节是想说：CogACT 的核心不是换一个更大的脑，而是承认“看懂”和“动准”是两种能力，需要同一个系统里的不同模块配合。*

## 这是个什么场景

想象桌上有香蕉、柠檬、杯子、碗和一堆干扰物。你对机械臂说：“把香蕉放到黄色盘子上。”机器人先要理解“香蕉”和“黄色盘子”在哪里，再决定夹爪怎么移动、什么时候闭合、放下时姿态怎么稳。如果它只会说“下一步动作 token 是 137”，但不擅长连续轨迹建模，就容易出现看懂了却夹歪、撞偏、放不稳的情况。

OpenVLA 这类模型已经证明：把动作离散成 token，可以复用语言模型的 next-token 训练范式。但真实机械臂动作不是一个词，而是一段平滑轨迹。它有连续数值、多峰选择和时间相关性。比如同样要拿杯子，左绕和右绕都可能正确；手腕旋转也不能突然跳变。

CogACT 处理的正是这个断点：VLM 很像“看懂菜谱的人”，action module 更像“手很稳的厨师”。只让会读菜谱的人直接下锅，能做，但手法未必稳。把理解和动作分工后，系统既保留语言泛化，又把动作生成交给更适合轨迹的模型。

*所以这一节是想说：CogACT 面对的是 VLA 的动作质量瓶颈。它不是否定 OpenVLA，而是在 OpenVLA 后面补一个更专业的动作生成器。*

## 之前的人怎么做的，为什么不够好

第一类是 RT-2 / OpenVLA 路线：把连续动作离散化，再让 VLM 像生成文本一样生成动作 token。优点是简单、统一、容易继承互联网预训练知识；缺点是动作分辨率受 token 化限制，连续控制会变粗。

第二类是 Octo、Diffusion Policy、RDT 这类更重视动作分布的路线。它们擅长生成平滑轨迹，尤其适合多模态动作，但语言和视觉常识不一定像大 VLM 那样强。

第三类是直接接一个小 MLP action head。它实现简单，但很难表达“未来几步连续动作彼此相关”这种结构。论文的消融也显示，MLP 增大后有提升，但同参数量下 transformer action module 更强。

用生活话说，旧路线常在两个极端之间摇摆：要么“脑子很强但手粗”，要么“手法稳但语义弱”。CogACT 想把两边拼起来，但不是随便拼，而是系统比较不同 action module 的结构、规模和推理 ensemble。

*所以这一节是想说：已有 VLA 的短板不只是数据不够，而是动作建模的归纳偏置不合适。*

## 这篇论文的新想法

CogACT 的新意可以压成一句话：**VLM 只负责认知表征，动作序列交给 diffusion transformer 专家来生成。**

这里的 “Cog” 是 cognition，偏“认知”；“ACT” 是 action，偏“动作”。模型先用 VLM 读图和指令，把“我要干什么、目标在哪里、场景有什么约束”压成隐藏状态；随后 action module 以这些隐藏状态为条件，用扩散式轨迹建模生成未来一小段动作。

为什么 diffusion transformer 合适？扩散模型擅长从噪声中一步步还原出合理样本；动作轨迹正好也像一条“合理样本”。Transformer 又擅长处理序列关系，可以捕捉动作之间的时间依赖。两者合起来，比小 MLP 更像一个“动作编舞器”。

```text
图像 + 指令
   │
   ▼
┌────────────────┐
│ VLM cognition  │  看懂物体、目标、语言条件
└───────┬────────┘
        ▼
┌────────────────┐
│ DiT action head│  从噪声还原连续动作块
└───────┬────────┘
        ▼
未来 N 步 7-DoF 机械臂动作
```

*所以这一节是想说：CogACT 把 VLA 从“语言模型顺便吐动作”推进到“语言模型提供条件，动作专家负责轨迹”。*

## 它分几步做的（方法）

### 第 1 步：把动作定义成 7-DoF 末端执行器控制

论文把每个时刻动作写成 `[Δx, Δy, Δz, Δφ, Δθ, Δψ, g]`。前三个是夹爪在空间里的平移，后三个是姿态旋转，`g` 是夹爪开合。人话翻译：机器人每一步不是直接说“拿起香蕉”，而是说“手往右前方挪一点、手腕转一点、夹爪合上”。

### 第 2 步：用 VLM 形成任务条件

VLM 接收视觉观察和语言指令，输出隐藏表征。这里它承担的是“理解”职责：识别目标、定位干扰物、把自然语言变成动作条件。它不用自己完整生成每个连续动作数值。

### 第 3 步：让 diffusion transformer 预测动作块

动作模块不是只预测下一帧，而是预测当前和未来若干步动作。这样模型能看到短期时间结构：夹取前要接近，接近后要闭合，闭合后要抬起。论文比较了 MLP 和不同大小的 diffusion transformer，发现 transformer 随规模变大成功率也有更稳定提升，DiT-Large 在消融中达到最高平均成功率 64.8%。

### 第 4 步：用 adaptive ensemble 稳住推理

真实机器人控制时，模型每一轮都会重新预测一段动作。旧预测和新预测可能重叠，怎么合并很关键。CogACT 设计 adaptive ensemble，用当前预测和历史预测的相似度加权，而不是机械平均。直觉是：如果多次预测都同意某个方向，就更相信它；如果偏差很大，就不要盲目执行旧动作。

### 第 5 步：跨模拟、真机和消融评测

论文在 SIMPLER、Google robot、WidowX、Realman、Franka 等多个设置上评估，还做了 action module 架构、多步预测、CFG scale、ensemble 等消融。评测目的不是只证明“能跑”，而是证明 action module 的设计选择真的影响动作成功率。

```text
训练/评测主线

Open X-Embodiment 预训练
        │
        ▼
各机器人少量微调演示
        │
        ▼
模拟基准 + 真机任务
        │
        ▼
比较 OpenVLA / Octo / RT-2-X / 不同 action head
```

*所以这一节是想说：CogACT 的方法链路是“VLM 条件化 + DiT 动作块 + 自适应合并 + 多平台评测”，核心验证点是动作模块是否真的带来收益。*

## 关键数字（What works）

| 现象 | 论文报告的数字 | 怎么理解 |
|---|---:|---|
| 相比 OpenVLA 的模拟平均成功率 | 超过 35% | 同尺寸 VLA 下，专门动作模块明显提升 |
| 相比 OpenVLA 的真机平均成功率 | 超过 55% | 真机连续控制收益更大 |
| 相比 RT-2-X 的模拟绝对成功率 | +18% | 小于 55B 闭源模型也能赢关键模拟评测 |
| Realman seen task 平均成功率 | OpenVLA 12.1%，CogACT 71.2% | 少量真机微调后差距非常大 |
| Realman unseen generalization | OpenVLA 9.7%，CogACT 58.4% | 新桌面/干扰物下仍能保持动作能力 |
| Action module 消融 | DiT-Large 平均 64.8% | 动作专家随规模增长有可见收益 |
| 真机微调数据 | Realman 391 条演示 | 不是无限数据堆出来，微调数据量较小 |

这些数字都应按论文环境理解：不同机器人、任务集合、随机种子和评估脚本会影响结果。本站没有本地复现，所以这里记录的是论文声称和表格证据。

*所以这一节是想说：CogACT 的优势集中在动作成功率，尤其是真机和泛化设置里。*

## 实验结果说明了什么

第一，VLA 的瓶颈不只是“模型看不懂”。OpenVLA 已经有不错语义能力，但在 Realman 任务里仍被 CogACT 拉开很大差距，说明连续动作建模本身就是核心问题。

第二，动作模块不是随便加一个头就行。论文比较 MLP 和 DiT，显示 transformer 结构更适合动作序列，且大小增加能带来近似可扩展的收益。这给后续 VLA 一个明确提示：action head 是值得认真 scaling 的组件。

第三，真机评测比纯模拟更能暴露问题。真机里有摩擦、延迟、相机噪声、物体滑动和夹爪误差；如果模型只会离散 token，它可能在模拟里看起来可用，但上真机就不稳。CogACT 的真机收益说明它抓住了这个痛点。

*所以这一节是想说：CogACT 的实验把“动作建模是 VLA 独立瓶颈”这件事讲得很清楚。*

## 你应该懂的几个新词

- **Componentized VLA**：组件化 VLA。不是一个大模型包办所有事，而是把认知和动作分成可分析模块。
- **Diffusion Transformer (DiT)**：用 Transformer 做扩散去噪网络。这里不是生成图片，而是生成动作轨迹。
- **Action chunk**：一次预测未来多步动作。好处是动作更连贯，坏处是旧预测可能过期。
- **Adaptive ensemble**：自适应合并多个动作预测，用相似度决定新旧预测的权重。
- **7-DoF action**：机械臂末端的三维位置、三维姿态和夹爪开合，共 7 个控制量。

*所以这一节是想说：读 CogACT 要把注意力放在 action module、action chunk 和 ensemble 这三组动作工程词上。*

## 它有什么搞不定的

第一，它仍然依赖大 VLM 作为认知底座，部署成本不低。相比 TinyVLA / SmolVLA，CogACT 更关注性能和动作质量，不是边缘端轻量路线。

第二，实验虽然覆盖多种机器人，但动作空间主要还是夹爪式机械臂。迁移到灵巧手、移动底盘、腿足机器人时，action module 可能要重新设计。

第三，diffusion transformer 推理通常比简单离散 token 更重。论文用 adaptive ensemble 改善稳定性，但真实低延迟控制里仍要权衡频率、显存和轨迹质量。

第四，论文没有把安全、失败恢复和人类监督作为核心问题。它解决的是“动作更准”，不是完整部署系统。

*所以这一节是想说：CogACT 是强动作模型，不是完整机器人产品。它补了 VLA 的手，但没有解决所有部署问题。*

## 它和别的几篇是什么关系

- 和 [OpenVLA](openvla.md)：OpenVLA 证明开源 VLA 可行；CogACT 证明动作模块不能只靠离散 token。
- 和 [RT-2](rt-2.md)：RT-2 把网页知识带进动作；CogACT 把动作生成拆成更专业的连续模块。
- 和 [Diffusion Policy](diffusion-policy.md)：Diffusion Policy 专注动作分布；CogACT 把扩散动作思想嫁接到大 VLM 条件上。
- 和 [RDT-1B](rdt-1b.md)：两者都重视 diffusion/action expert；CogACT 更强调 VLM cognition 与动作模块的协同。
- 和 [π0](pi0.md)：π0 走流匹配基础模型路线；CogACT 更像 OpenVLA 系列的动作模块升级版。

*所以这一节是想说：CogACT 是 VLA 和 diffusion policy 两条线的会合点。*

## 和本导读的关系

本篇最适合放在 [Ch12: OpenVLA / VLAs / MLA](../guide/ch12-openvla-vlas-mla.md) 后面读。Ch12 先解释端到端 VLA 的主干范式，CogACT 则回答下一步问题：当 VLA 已经能看图听话后，怎样让它更会连续控制？

如果把本站 VLA 主线排成一条链：RT-1/RT-2 负责范式起点，OpenVLA 负责开源基线，CogACT 负责动作模块专业化，π0/π0.5/EO-1 负责进一步的基础模型和数据扩展。这样读会更清楚每篇论文解决的是哪一层瓶颈。

*所以这一节是想说：CogACT 是 OpenVLA 之后理解“动作专家化”的关键补课。*

## 思考题

**Q1：为什么 CogACT 不直接让 VLM 输出连续动作，而要接 diffusion transformer？**

<details>
<summary>提示</summary>

连续动作有多峰、平滑和时间相关性，语言模型的 token 预测不天然擅长这些结构。
</details>

**Q2：如果一个任务主要考物体语义而不是动作精度，CogACT 还会比 OpenVLA 强很多吗？**

<details>
<summary>提示</summary>

不一定。CogACT 的优势来自动作模块；语义瓶颈任务更依赖 VLM 底座和数据。
</details>

**Q3：Action chunk 为什么既有帮助也有风险？**

<details>
<summary>提示</summary>

它让动作连贯，但环境变化后旧 chunk 可能过期，所以需要 ensemble 或频繁重规划。
</details>

**Q4：CogACT 和 Diffusion Policy 的共同点是什么？差异是什么？**

<details>
<summary>提示</summary>

共同点是用扩散思想建模动作；差异是 CogACT 用 VLM 表征作为语言视觉条件。
</details>

**Q5：如果要部署到移动机器人或灵巧手，你首先会检查什么？**

<details>
<summary>提示</summary>

检查动作空间是否仍能用 7-DoF 夹爪表示，action module 是否需要换控制头。
</details>

## 一些好奇心问答（FAQ）

**它是不是 OpenVLA 的替代品？**  
更像升级方向。OpenVLA 是开源基线，CogACT 说明在同类底座上，动作模块专业化能显著提升成功率。

**它是不是比所有 diffusion policy 都强？**  
不能这么说。不同基准和数据设置不同。CogACT 的重点是把 VLM cognition 和 diffusion action 结合，而不是宣称通吃所有控制任务。

**为什么真机提升比模拟提升更显眼？**  
真机有更多连续控制误差，动作模块的收益更容易显现。

**它需要很多真机数据吗？**  
论文的 Realman 微调只用了 391 条演示，但不同机器人和任务会变化，不能把这个数当通用保证。

**读完它下一篇看什么？**  
想看动作基础模型看 [π0](pi0.md) / [RDT-1B](rdt-1b.md)，想看跨本体动作表示看 [Universal Actions](universal-actions.md)。

## 补充理解：为什么这篇值得单独读

CogACT 最适合用来纠正一个常见误解：VLA 不是把视觉语言模型接到机器人上就结束。视觉语言模型擅长回答“这是什么、目标在哪里、指令是什么意思”，但机器人真正失败时，很多时候不是因为没看懂，而是因为动作分布没建好。比如夹爪靠近杯子时，轨迹需要连续、姿态需要平滑、放下前还要避开桌面和干扰物。这些都不是普通文本 token 的强项。CogACT 把动作模块作为可扩展对象来研究，等于告诉我们：未来 VLA 的 scaling 不只发生在语言模型参数量上，也会发生在 action expert 的容量、预测窗口、ensemble 策略和低延迟推理上。读这篇时，不要只记“它比 OpenVLA 高多少”，更要记住它提供了一个分析框架：当一个机器人看懂但动不好时，先检查动作表示、动作生成器和执行时序，而不是立刻归因于视觉或语言理解失败。

落地排查时，这个框架尤其有用。

*所以这一节是想说：CogACT 的长期价值是把 VLA 的问题拆细，让我们知道“手不好”也可以被系统性建模。*

## 如果你想再深入

1. 对照 [OpenVLA](openvla.md) 看离散动作 token 的优缺点。
2. 对照 [Diffusion Policy](diffusion-policy.md) 看扩散动作模型如何处理多峰轨迹。
3. 对照 [RDT-1B](rdt-1b.md) 看更大规模 diffusion foundation model。
4. 关注论文的 action module 消融表，理解 MLP、DiT-small、DiT-large 的差异。
5. 真想复现时，先从 SIMPLER / LIBERO 类仿真基准开始，不要直接跳真机。

## 原文信息

- 标题：CogACT: A Foundational Vision-Language-Action Model for Synergizing Cognition and Action in Robotic Manipulation
- arXiv：<https://arxiv.org/abs/2411.19650>
- 项目页：<https://cogact.github.io/>
- 公开状态：论文称代码和模型见项目页；本站未独立验证可运行性。

```bibtex
@misc{li2024cogact,
  title = {CogACT: A Foundational Vision-Language-Action Model for Synergizing Cognition and Action in Robotic Manipulation},
  author = {Li, Qixiu and others},
  year = {2024},
  eprint = {2411.19650},
  archivePrefix = {arXiv},
  primaryClass = {cs.RO}
}
```

*所以整篇是想说：CogACT 把 VLA 的“脑”和“手”拆开协同，让大模型继续负责语义理解，让 diffusion transformer 负责连续动作质量。*
