---
title: "A call for embodied AI"
slug: call-for-embodied-ai
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2402.03824"
venue: ICML
year: 2024
era: frontier
num: 200
generated_at: 2026-07-15
---

# A call for embodied AI：为什么 AGI 不能只待在文本里

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本和 arXiv 元数据能支持的结论；这篇是 ICML 2024 position paper，不报告本站复现实验。

## 一句话讲什么（TL;DR）

这篇论文提出一个很直接的立场：如果 AI 想走向真正的 general intelligence，不能只靠静态文本数据和离线训练，而要进入 Embodied AI，也就是让智能体拥有感知、行动、记忆和学习能力，在环境中持续互动并从反馈中成长。

作者不是否定 LLM，而是说 LLM 更像“心智中的语言推理部分”。真正智能体还需要身体和环境：它要感知世界、采取行动、记住经历、根据反馈更新自己。就像人不是靠读完整个互联网学会走路和拿杯子，而是通过主动探索、犯错、修正、再尝试来建立理解。

如果只记一个直觉：LLM 像一个读过很多书的人，但 embodied AI 像一个会看、会动、会记、会试错的人。论文呼吁把 AI 从“静态互联网学习”推进到“动态环境学习”。

*所以这一节是想说：这篇论文的核心主张是，通用智能必须重新把身体、行动和经验放回系统。*

## 这是个什么场景

过去几年，LLM 让人看到 AI 在语言、推理和知识组合上的巨大进展。但作者认为，LLM 仍然主要生活在 linguistic-symbolic domain：输入是文本，输出也是文本，训练数据是工程师收集和整理好的静态语料。它可以描述世界，却很少直接承受行动后果。

Embodied AI 的场景更广。它可以是机器人，也可以是网络路由器、推荐系统、混合现实助手，甚至是任何能够感知环境、影响环境、从反馈中学习的系统。作者特别强调：embodiment 不一定只有视觉，也不一定只有机器人。嗅觉、触觉、电磁信号、网络流量都可以成为某种“身体感知”。

```text
Internet AI / 静态学习
  collected dataset -> model training -> response

Embodied AI / 动态学习
  perception -> action -> environment response
       ^              |
       |              v
     memory <----- learning
```

论文把当代 AI 的缺口放在一个更长的认知科学传统里：embodied cognition、4E cognition、TAME framework、Brooks 的行为机器人、Held & Hein 的小猫 carousel 实验。共同指向一个观点：理解不是只在脑内符号运算中产生，而是在身体和环境的耦合里产生。

*所以这一节是想说：本文把 embodied AI 从“机器人技术路线”扩展成“智能如何形成”的问题。*

## 之前的人怎么做的，为什么不够好

当前主流 foundation model 很擅长从静态数据中学习统计规律。监督学习假设数据来自固定分布，训练过程和数据生成过程相对分离。这套理论支撑了图像分类、语言建模和很多互联网产品。

但具身智能不满足这个假设。agent 的行动会改变环境，环境变化又会改变下一轮数据。比如推荐系统会影响用户点击，用户点击又成为下一轮训练数据；机器人把椅子挪走后，房间状态已经变了；服务机器人如果错误理解用户，用户的下一句话也会被这次错误影响。

LLM 的另一个限制是缺少因果和体验。论文指出，自回归 LLM 主要学习上下文相关和序列相关，而不是为理解行动后果而设计。它可以说“杯子会掉”，但不一定通过真实或模拟互动建立了重量、摩擦、接触和失败恢复的经验。

所以作者认为，继续扩大静态数据和参数不是唯一答案。AGI 需要一种新学习理论，能够解释互动式数据收集、非平稳环境、个体化经验、主动探索和长期记忆。

*所以这一节是想说：传统静态学习理论解释不了 agent 通过行动改变自己数据来源的过程。*

## 这篇论文的新想法

第一，新想法是给 embodied AI 一个宽定义：E-AI agent 是被绑定到环境中、观察环境、与环境互动并从真实世界或符号世界中持续学习的 AI agent。它要优先保持自身存在和与人类的绑定，并在互动中学习 truth value。

第二，新想法是把 embodied agent 拆成四个组件：perception、action、memory、learning。这个拆法非常适合零基础读者，因为它把抽象智能落到四个可问的问题：它看见什么？它能做什么？它记住什么？它怎么变得更好？

第三，新想法是说明 E-AI 的挑战不只是“造一个机器人”。它需要新学习理论、处理噪声和不确定性、使用模拟器、与人交互、泛化到新情境、解决硬件约束，还要考虑伦理和对齐。

第四，新想法是把 alignment 视为 procedural、perspectival、evolutionary 的过程。也就是说，对齐不只是给模型写几条规则，而是让 agent 在长期互动中学会和人类价值共处。

```text
论文提出的 embodied agent 四组件

Perception
  raw sensors -> internal representation

Action
  choose what to do -> execute how to do

Memory
  working / short-term / long-term / episodic

Learning
  continuous interaction -> model update
```

*所以这一节是想说：本文把具身智能拆成一个可工程化但仍开放的认知架构。*

## 它分几步做的（方法）

### 第 1 步：重新定义 embodiment

输入是哲学、认知科学、机器人和现代 AI 的不同 embodiment 传统。处理上，作者把 embodiment 从“机器人有身体”扩展为“agent 与环境之间存在持续感知-行动耦合”。这个定义允许视觉机器人，也允许不靠视觉的生物、网络系统或符号世界 agent。

输出是一个宽广的 E-AI 概念：只要系统能感知环境、行动影响环境、从反馈中学习，它就可以被视作某种 embodied agent。

### 第 2 步：比较 LLM、SMAI 和 E-AI

输入是两类商业 AI：LLM 和 Social Media Content AI Recommendation Systems（SMAI）。处理上，作者指出 LLM 主要在文本域中生成 likely tokens，而 SMAI 更接近 embodiment，因为它有清晰目标、持续从用户互动收集数据、会个体化并影响下一轮环境。

输出不是说推荐系统更“好”，而是说明：越能长期互动、影响环境、收集反馈的系统，越接近 embodied dynamics，也越需要认真讨论对齐和风险。

### 第 3 步：论证为什么 embodiment 是 AGI 的必要方向

输入是认知发展证据和现代 AI 经验。论文提到 Held & Hein 的 carousel kitten 实验：主动控制移动的小猫比被动观察的小猫获得更好的感知运动能力。这被用来说明，主动行动对学习世界结构很重要。

处理上，作者反对“只要静态数据和算力足够就能到 AGI”的简单缩放观点。人类和动物通过连续经验学习，不是从打乱的静态样本中被动学习。

输出是本文立场：AGI 需要 agent 在环境中主动收集多模态经验，通过行动和反馈形成理解。

### 第 4 步：搭建四组件架构

输入是 embodied agent 需要解决的实际功能。处理上，作者把系统分成 perception、action、memory、learning。

Perception 把传感器数据转成内部表示。Action 包含选择做什么和如何执行。Memory 包括工作记忆、短期记忆、长期记忆、情景记忆，不一定都以显式文本形式存在。Learning 则负责从持续互动中更新模型，面对非平稳环境和灾难性遗忘。

输出是一个最小认知架构。它不规定某个模型架构，但告诉我们一个 embodied agent 少了哪块会不完整。

### 第 5 步：列出挑战和研究议程

输入是 E-AI 的真实部署条件。处理上，作者讨论六类挑战：新学习理论、噪声与不确定性、模拟器和 reality gap、人机互动、泛化、硬件约束。

输出是一张路线图：E-AI 不只是 VLM 或机器人控制，而是学习理论、模拟、硬件、HRI、伦理和对齐共同构成的长期研究方向。

```text
从静态模型到具身 agent 的缺口

static dataset
   -> good language model
   -> still missing:
      - active data collection
      - causal feedback
      - episodic memory
      - sensor/action noise
      - human interaction
      - hardware constraints
```

*所以这一节是想说：这篇论文的方法是提出一套具身智能的概念架构和挑战清单。*

## 关键数字（What works）

| 原文信息 | 数字 / 结构 | 这说明什么 |
|---|---:|---|
| ICML position paper | 2024 | 论文目标是提出立场和研究路线 |
| arXiv PDF | 17 pages | 内容以概念论证为主 |
| E-AI 核心组件 | 4 个 | Perception、Action、Memory、Learning |
| 4E cognition | 4 个 E | Embodied、Enactive、Embedded、Extended |
| 挑战方向 | 6 类左右 | 学习理论、噪声、模拟器、人机互动、泛化、硬件 |
| 本站复现 | 0 | 不声称验证论文立场 |

*所以这一节是想说：本文的关键输出是结构化概念，而不是实验曲线。*

## 实验结果说明了什么

这篇论文没有训练模型，也没有做 benchmark 实验。它引用认知科学、机器人和机器学习文献来支撑一个 position：真正通用智能需要在世界中互动，不能只从静态语料中学习。

这并不削弱它的价值。对本项目来说，它提供了一个顶层检查框架：如果一篇新论文声称做 embodied AI，我们可以问它是否覆盖了 perception、action、memory、learning；它是否处理主动探索和反馈；它是否考虑噪声、不确定性、人机互动和现实部署；它是否只是把 LLM 接到机器人 API 上。

*所以这一节是想说：本文不是 SOTA 论文，而是帮我们定义“什么才算更完整的具身智能”。*

## 你应该懂的几个新词

- **Embodied AI**：处在环境中、能感知、能行动、能从反馈中学习的 AI。日常类比是“住在世界里的人”，不是“只读说明书的人”。
- **Sensorimotor Coupling**：感知和行动互相影响。你动一下，看到的新信息会改变下一步动作。
- **4E Cognition**：embodied、enactive、embedded、extended 四个认知科学概念，强调认知离不开身体、行动、环境和外部工具。
- **Episodic Memory**：情景记忆，保存具体经历，而不只是抽象知识。
- **Reality Gap**：模拟器和真实世界之间的差距。仿真里会的策略，真实环境可能失败。

*所以这一节是想说：这篇论文的术语都在帮我们从“模型”转向“agent”。*

## 它有什么搞不定的

第一，它的 definition 很宽。宽定义能覆盖更多系统，但也可能让 E-AI 边界变模糊。推荐系统、路由器和机器人都算 embodied 时，工程评价标准会很不一样。

第二，它没有提供新算法。Perception、Action、Memory、Learning 是必要模块，但每个模块如何实现、如何联合训练、如何验证，还需要后续研究。

第三，它对安全和对齐提出方向，但还没有形成可执行门禁。长期互动可能带来更自然对齐，也可能带来更强操控、依赖和反馈放大。

第四，它强调模拟器重要，但 reality gap 仍是难题。模拟器可以加速训练，却不能完全替代真实世界反馈。

*所以这一节是想说：这篇论文像宣言，强在定方向，弱在没有工程闭环。*

## 精读补充：读这篇时要特别分清的边界

这篇最容易被误读成“只要有身体就更智能”。更准确的理解是：身体本身不是魔法，闭环才是关键。一个机械臂如果只重复固定脚本，不根据传感器反馈改变行为，它虽然有物理身体，但智能层面仍然很弱。反过来，一个推荐系统没有机械身体，却会持续观察用户、改变信息环境、根据反馈更新目标，因此作者认为它在某些维度更接近 embodied dynamics。

另一个边界是“互动学习”和“随便在线学习”不同。E-AI 需要从环境反馈中成长，但这不意味着系统可以无约束地在真实世界试错。真正的工程路线要在模拟器、人工监督、安全边界和长期记忆之间找平衡。对机器人尤其如此：一次错误动作可能损坏物体或伤人，所以 embodied learning 必须和安全验证一起设计。

*所以这一节是想说：本文强调 embodiment，不是浪漫化身体，而是强调可控、可学习的感知-行动闭环。*

## 它和别的几篇是什么关系

它和 `causal-world-models-embodied-ai` 关系紧密。Call for Embodied AI 说 AGI 需要身体和互动；因果世界模型那篇说互动之后需要一个能预测行动后果的内部模型。

它和 RT-2 / PaLM-E / Gato 的关系是上位视角。这些系统把语言、视觉或动作连接起来，本文会问：它们有没有持续记忆？有没有主动学习？有没有从环境反馈更新自己？

它和社会媒体推荐系统的关系也有启发。作者用 SMAI 说明，长期互动系统会塑造用户和环境，因此风险和对齐不能只看单次输出。

*所以这一节是想说：这篇是 embodied AI 的概念总论，其他系统论文可以放到它的四组件框架里检查。*

## 和本导读的关系

本导读前面大量论文关注 VLA、world model、diffusion policy、dataset 和 benchmark。读完这些技术后，很容易以为具身智能只是“更大的模型 + 更多机器人数据”。这篇提醒我们：具身智能还涉及主动数据、持续学习、长期记忆、行动反馈、人机关系和硬件。

建议把它作为 Batch 10 的入门总论，再读 [The Essential Role of Causality in Foundation World Models](../papers/causal-world-models-embodied-ai/) 和 [Toward General-Purpose Robots via Foundation Models](../papers/robotics-foundation-models-survey/)。前者回答内部世界模型，后者回答 robotics foundation model 的工程地图。

*所以这一节是想说：这篇帮助我们把具身智能从模型榜单提升到 agent 架构。*

## 思考题

**Q1：为什么 LLM 不能直接等同于 embodied agent？**

<details>
<summary>提示</summary>

LLM 擅长语言推理，但是否有真实感知、行动后果、长期情景记忆和持续互动学习？
</details>

**Q2：推荐系统为什么被作者拿来和 embodied AI 比较？**

<details>
<summary>提示</summary>

它会根据用户反馈更新，也会影响下一轮用户行为和数据分布。
</details>

**Q3：perception 和 action 为什么必须成对出现？**

<details>
<summary>提示</summary>

只看不动无法验证行动后果；只动不看无法根据反馈修正。
</details>

**Q4：为什么静态监督学习理论不够解释 E-AI？**

<details>
<summary>提示</summary>

监督学习假设数据分布相对固定，但 agent 的行动会改变下一轮数据。
</details>

**Q5：现实部署中最容易被忽略的是哪一类挑战？**

<details>
<summary>提示</summary>

可以从噪声、不确定性、人类互动、硬件算力和 reality gap 中选一个，说明它为什么会在 demo 后暴露。
</details>

## 一些好奇心问答（FAQ）

**Q：Embodied AI 一定要有机器人身体吗？**
A：按这篇论文的宽定义，不一定。关键是 agent 是否被绑定到环境中，能感知、行动并从反馈中学习。

**Q：那 LLM 加摄像头就是 E-AI 吗？**
A：还不够。摄像头只补 perception，仍要看是否有行动、记忆、持续学习和环境反馈。

**Q：这篇为什么说对齐可能是 procedural？**
A：因为长期互动系统的价值学习可能来自过程中的反馈、关系和视角，而不是一次性写死规则。

*所以这一节是想说：Embodied AI 的关键不是外形，而是闭环。*

## 如果你想再深入

1. 读 Brooks 的行为机器人思想，理解“intelligence without representation”的历史背景。
2. 读 4E cognition 的入门材料，理解身体和环境为什么进入认知。
3. 读 continual learning 和 catastrophic forgetting，理解长期学习为什么难。
4. 读 HRI 和 alignment 文献，理解人与具身 agent 的互动风险。

## 原文信息

- 论文：A call for embodied AI
- 链接：https://arxiv.org/abs/2402.03824
- arXiv：2402.03824
- 版本：v4，2024-09-13 更新
- 发表：ICML 2024 Position Paper Track，PMLR 235:39493-39508

```bibtex
@inproceedings{paolo2024call,
  title={A call for embodied AI},
  author={Paolo, Giuseppe and Gonzalez-Billandon, Jonas and Kegl, Balazs},
  booktitle={Proceedings of the International Conference on Machine Learning},
  pages={39493--39508},
  year={2024}
}
```
