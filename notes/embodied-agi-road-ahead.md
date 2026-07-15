---
title: "Toward Embodied AGI: A Review of Embodied AI and the Road Ahead"
slug: embodied-agi-road-ahead
topic: vla
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2505.14235"
venue: arXiv
year: 2025
era: frontier
num: 180
generated_at: 2026-07-14
---

# Toward Embodied AGI：用 L1-L5 给具身通用智能画路线图

> 这是一份面向零基础读者的结构化研究笔记。本文只把公开论文文本和 arXiv 元数据能支持的结论写成事实；本站没有本地训练、仿真或真机复现实验，因此不会把论文中的路线图判断写成本站 E4 结果。

## 一句话讲什么（TL;DR）

这篇综述提出 Embodied AGI 的五级路线图 L1-L5，并用四个能力维度评估当前差距：omnimodal capabilities、humanoid cognitive abilities、real-time responsiveness、generalization。作者认为当前 Embodied AI 大致处在 L1-L2，距离 L3+ 还缺多模态、类人认知、实时响应和开放泛化能力，并提出一个 L3+ robotic brain 的概念框架。

如果只记一个直觉：它不是某个机器人模型论文，而是像自动驾驶 L1-L5 一样，给具身智能从“会做单一任务”到“类人开放任务”画阶段地图。

*所以这一节是想说：这篇论文给 Embodied AGI 提供了评估尺子，而不是提供一个已完成系统。*

## 这是个什么场景

AGI 常被理解为通用人工智能，但很多讨论停在文本或数字世界。Embodied AGI 进一步要求智能体有身体，能在真实世界中感知、行动、互动和学习。机器人不是只要答对问题，还要在物理环境里完成开放任务。

论文提出一个 pragmatic definition：Embodied AGI 是一种 Embodied AI，具备 human-like interaction capabilities，并能以 human-level proficiency 完成 diverse, open-ended real-world tasks。这个定义把 AGI 的“通用”落到真实世界任务和人类互动上。

```text
从 AI 到 Embodied AGI

文本推理
  │
  ▼
多模态理解
  │
  ▼
具身行动
  │
  ▼
开放真实任务 + 类人交互 + 长期学习
```

```text
四个能力维度

1. Omnimodal capabilities
2. Humanoid cognitive abilities
3. Real-time responsiveness
4. Generalization
```

这篇论文适合在读了很多单篇机器人模型后回看。它帮我们问：这些模型到底处在什么阶段？只是能抓一个物体，还是能跨任务、跨环境、实时响应、像人一样和社会关系互动？

*所以这一节是想说：Embodied AGI 把“会做任务”提升到“能在人类世界中通用行动”。*

## 之前的人怎么做的，为什么不够好

已有 Embodied AI 进展很多，例如 LLM、VLM、VLA、omnimodal models、机器人学习和强化学习。但论文认为这些能力仍然不足以达到 L3+。现有系统往往只能处理有限任务、有限环境或有限模态。

比如很多 VLA 能在某些机器人任务上表现强，但它们常常不是全模态；很多模型能理解图像和语言，但不具备精确实时动作执行；很多机器人能完成单一或组合任务，但不能可靠处理开放任务和人类社会互动。

论文指出现有架构和主流学习范式，包括 supervised learning 和 reinforcement learning，在 acquiring human-like behaviors 和 robust generalization 方面仍不足。也就是说，继续堆现有范式不一定直接通向 L3-L5。

*所以这一节是想说：现有 Embodied AI 有明显进步，但离类人通用具身智能还有结构性差距。*

## 这篇论文的新想法

论文最核心的新想法是五级路线图。受自动驾驶分级启发，它把 Embodied AGI 分为 L1 到 L5：

- L1：Single-task completion，能稳定完成单一明确任务。
- L2：Compositional task completion，能组合简单技能完成复合任务。
- L3：Conditional general-purpose task completion，能在一定条件下跨任务、跨环境、实时适应。
- L4：Highly general-purpose robots，能对广泛未见任务保持强泛化。
- L5：All-purpose robots，开放任务中的类人全能目标。

第二个新想法是四维评估：全模态能力、类人认知能力、实时响应能力、泛化能力。路线图不是只看任务成功率，而是看机器人是否能处理更多模态、是否有类人学习和社会理解、是否实时、是否能面对开放环境。

*所以这一节是想说：本文把“通用具身智能”拆成等级和能力维度，使讨论可比较。*

## 它分几步做的（方法）

### 第 1 步：定义 Embodied AGI

论文先给出实用定义：Embodied AGI 要具备类人交互能力，并以人类水平熟练完成多样开放真实任务。这个定义很重要，因为它避免只用“模型参数大”或“benchmark 分数高”来讨论 AGI。

### 第 2 步：提出 L1-L5 路线图

作者借鉴自动驾驶分级，把具身智能划分为五个等级。L1 类似单功能辅助，L2 能组合任务，L3 开始具备条件通用性，L4 是高度通用，L5 是开放任务全能。

```text
Embodied AGI levels

L1: 单一任务
L2: 组合任务
L3: 条件通用任务
L4: 高度通用机器人
L5: 全用途机器人
```

这种分级的好处是能防止“会做一个新任务就叫 AGI”的夸大表述。每一级都有任务范围、泛化和能力要求。

### 第 3 步：用四个维度评估当前状态

四个维度分别是 omnimodal capabilities、humanoid cognitive abilities、real-time responsiveness、generalization。论文认为当前 Embodied AI 大致处在 L1-L2，原因是全模态处理、类人认知、实时响应和开放泛化都还不够。

```text
L3+ 需要的四件事

全模态输入输出
类人认知和社会理解
快速准确的实时行动
跨环境跨任务泛化
```

### 第 4 步：讨论 L3-L5 的关键构件

论文进一步讨论 L3+ 需要什么：更全面的 omnimodal model structure，更强的 streaming input 和 duplex interaction，更接近人类的 social connection understanding、自我意识、procedural memory、memory reconsolidation，以及 physical-oriented training。

这些构件不一定是最终答案，而是作者提出的概念框架，用来描述未来 robotic brain 应该满足什么目标。

### 第 5 步：提出 L3+ robotic brain 概念框架

论文最后提出一个 conceptual framework，包括 omnimodal model structure 和 training paradigm。它强调 streaming、cross-modal alignment、omnimodal understanding、physical-oriented training 等方向。

*所以这一节是想说：论文方法是“定义目标 -> 分级 -> 评估差距 -> 提出 L3+ 构件”。*

## 关键数字

本文最重要的数字是五级路线图和四个能力维度。五级是 L1-L5，四维是 omnimodal capabilities、humanoid cognitive abilities、real-time responsiveness、generalization。

论文还给出一个关键判断：current state of Embodied AI development between Levels 1 and 2 (L1-L2)。这不是严格实验分数，而是作者基于当前文献和能力维度的综述性判断。

此外，论文提到 advancing to L3 requires handling substantially different task categories and exhibiting robust real-time responsiveness。也就是说，L3 的门槛不是只在同一任务族内泛化，而是跨任务类别和实时响应能力都要提升。

*所以这一节是想说：L1-L5 和四维能力是本文的主记忆点。*

## 实验结果说明了什么

这篇论文没有训练一个新模型，也没有做统一机器人实验。它的“结果”是路线图和能力差距分析。作者认为，当前很多系统能达到 L1，部分接近 L2，但尚未达到 L3+。

这个判断对读其他论文很有帮助。比如一篇 VLA 在抓取任务上泛化不错，可能只是 L1 到 L2；一篇导航模型能跨任务和跨本体，但如果没有类人认知或开放任务能力，也不能直接叫 L4 或 L5。

论文还提醒我们，实时响应不是可选项。一个机器人如果每次思考都很慢，即使推理结果正确，也难以在人类环境中交互。未来 L3+ 需要真正支持 multiplexed、omnimodal、streaming 的处理方式。

*所以这一节是想说：论文的结果是给现有 Embodied AI 降温，并指出 L3+ 的具体缺口。*

## 术语表

- Embodied AGI：具备身体并能在真实世界中完成开放任务的通用智能。
- L1-L5：作者提出的五级 Embodied AGI 路线图。
- Omnimodal：不只视觉语言，还包含音频、触觉、力、热、运动等更多模态。
- Humanoid cognitive abilities：类人认知能力，如社会理解、自我意识、程序记忆等。
- Real-time responsiveness：实时响应能力，能快速准确行动和双向交互。
- Generalization：跨环境、跨任务、跨情境泛化。
- Robotic brain：作者提出的 L3+ 机器人认知架构概念。

*所以这一节是想说：本文术语是为了衡量“离类人通用机器人还有多远”。*

## 局限和边界

第一，L1-L5 是作者提出的路线图，不是行业统一标准。它有启发性，但后续可能被修正。

第二，当前状态在 L1-L2 的判断是综述性判断，不是通过统一 benchmark 严格测量得出。

第三，Embodied AGI 涉及硬件、认知、社会、实时系统和学习理论。论文提供框架，但没有解决所有实现问题。

第四，类人认知和自我意识等概念很复杂，工程定义和哲学定义可能不同。读这篇时要把它当研究路线图，而不是已验证理论。

*所以这一节是想说：这篇论文适合定方向，不适合当最终评测标准。*

## 和其他论文的关系

和 mobile-service-robot-foundation-survey 相比，本文更宏观。移动服务机器人综述关注家庭、医院和服务场景的具体约束，本文关注 Embodied AGI 的等级和长期路线。

和 RoboNeuron 相比，本文是目标地图，RoboNeuron 是工程中间层。L3+ 需要机器人系统能稳定接入工具、ROS、VLA 和低层执行，这正是 RoboNeuron 试图解决的一类问题。

和 NavFoM 相比，本文提出“通用具身智能应具备什么”，NavFoM 是 navigation 方向尝试跨任务、跨本体泛化的具体模型。

和 VLA manipulation survey 相比，本文更关注 AGI 层级和类人能力，而不只是现有 VLA 结构和训练分类。

*所以这一节是想说：Batch 5 用这篇论文给后续服务机器人、导航和系统中间层提供上位目标。*

## 和本导读的关系

本站的很多论文可以映射到 L1-L5：单任务控制、复合任务、跨本体泛化、服务机器人、导航基础模型、系统中间层。读这篇后，读者可以开始问每篇论文到底推进了哪个层级。

它也帮助本站避免夸大。一个模型“更强”不等于 Embodied AGI。只有当它在多模态、类人认知、实时响应和开放泛化上都有进展，才更接近 L3+。

*所以这一节是想说：它给本站的论文库加了一把分级尺。*

## 思考题

1. 为什么作者认为当前 Embodied AI 大致在 L1-L2？
2. L3 和 L2 的关键差别是什么？
3. 为什么 omnimodal 不等于简单多加几个传感器？
4. 实时响应为什么是 Embodied AGI 的核心能力，而不是工程优化项？

## FAQ

**Q：L5 是不是已经有明确实现路线？**  
A：没有。L5 是终极目标，论文主要提供路线图和概念框架。

**Q：这篇论文是不是说 AGI 必须是机器人？**  
A：它关注 Embodied AGI，并认为 AGI 常被视为 inherently embodied；但这是论文立场，不是所有 AGI 讨论的唯一观点。

**Q：为什么用自动驾驶分级类比？**  
A：因为自动驾驶 L1-L5 提供了可沟通的阶段框架，能帮助具身智能避免泛泛谈“通用”。

**Q：本站有没有验证 L1-L5？**  
A：没有。这里只记录论文路线图，不把它写成本站评测体系。

## 进一步读什么

- `mobile-service-robot-foundation-survey`：看 Embodied AGI 在服务机器人场景中的约束。
- `embodied-navigation-foundation-model`：看跨任务/跨本体导航模型如何接近 L3 的一部分。
- `roboneuron`：看工程中间层如何支撑 agentic embodied systems。
- `vla-manipulation-survey`：看 VLA 在具身操作中的现有结构。

## 精读补充：L2 到 L3 为什么是关键门槛

这篇论文最值得反复看的不是 L5 这个远大目标，而是 L2 到 L3 的分界。L2 的机器人已经能做组合任务，比如把“拿杯子再放到桌上”拆成抓取、移动、放置。听起来已经很强，但它仍然可能只是在有限任务集合内组合技能。L3 则要求 conditional general-purpose task completion，也就是在一定条件下跨任务类别、跨环境、跨人类指令工作，并且具备 robust real-time responsiveness。

这一步之所以难，是因为组合已知技能和面对新任务不是一回事。组合技能像搭积木，积木形状都知道；新任务则可能需要判断新物体、新社交情境、新失败模式和新动作约束。很多现有机器人在演示中像 L2，但一旦任务类别变化，就会退回到需要人工重新定义动作、重新收集数据或重新调参。

四个能力维度也可以用 L2 到 L3 来理解。Omnimodal capabilities 要求机器人不仅看图听话，还要融合声音、触觉、力、热、位置、人体状态等更丰富信号。Humanoid cognitive abilities 要求它不只是执行命令，还要理解社会关系、程序性记忆和长期经验。Real-time responsiveness 要求它不能“想半分钟再动一下”。Generalization 要求它不只换光照和背景，还能跨任务类别泛化。

论文对当前状态的判断比较克制：大致在 L1-L2。这个判断对学习很有帮助，因为它能防止我们被单篇论文的强标题带偏。一个模型如果只在某类抓取或导航 benchmark 上好，不应该直接被称为 Embodied AGI。它可能只是 L1 或 L2 上的优秀方法。

L3+ robotic brain 的概念框架也不是具体产品设计图，而是需求列表。它要求 omnimodal streaming input、跨模态对齐、物理导向训练、类人认知机制和实时交互。换句话说，未来机器人“大脑”不只是更大的 LLM，而是一个持续感知、持续行动、持续学习、持续和世界校准的系统。

对本站来说，这篇论文可以当成“防夸大工具”。之后读任何新论文，都可以问：它推进的是哪一级？它只提升单任务，还是提升组合任务？它有没有跨任务类别？有没有实时响应？有没有类人认知或长期记忆？这些问题能帮助我们把 hype 拆成可审查的能力维度。

另一个容易忽略的点是，L3 不是“把 L2 做大一点”。L2 可以通过更多技能库、更好的任务分解、更强的提示词工程继续提升，但这些改进仍然可能依赖封闭任务空间。L3 需要机器人在条件约束内识别新任务、判断可行性、主动澄清、失败恢复，并把感知变化及时反馈到行动中。这里的“条件通用”不是无限能力，而是明确边界下的可迁移能力。

这也解释了为什么论文把 real-time responsiveness 单独列出来。桌面聊天系统可以慢几秒，但机器人慢几秒可能已经错过抓取时机，或者在人靠近时没有及时停下。实时性不是把模型部署得更快这么简单，它要求感知、规划、控制和人机交互形成闭环。模型如果只会离线推理路线，仍然很难进入 L3。

因此，L1-L5 分级适合作为阅读索引，而不是打分榜。我们可以用它标注论文贡献：某篇论文可能提升多模态感知，某篇提升跨本体数据，某篇提升中间层 orchestration，某篇提升导航泛化。它们未必单独把系统推到 L3，但可以分别补 L3 所需的拼图。

*所以这一节是想说：L3 才是从技能组合走向条件通用的分水岭，当前大多数工作还没真正跨过去。*

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：L1-L5 定义是否按原文表述；四个能力维度是否为 omnimodal capabilities、humanoid cognitive abilities、real-time responsiveness、generalization；当前状态 L1-L2 的判断是否保留综述边界；L3+ robotic brain 是否写成 conceptual framework 而非已实现系统。

## 原文信息

- arXiv: [2505.14235](https://arxiv.org/abs/2505.14235)
- PDF: [https://arxiv.org/pdf/2505.14235](https://arxiv.org/pdf/2505.14235)

```bibtex
@article{wang2025embodiedagiroadahead,
  title = {Toward Embodied AGI: A Review of Embodied AI and the Road Ahead},
  author = {Wang, Yequan and Sun, Aixin},
  journal = {arXiv preprint arXiv:2505.14235},
  year = {2025}
}
```
