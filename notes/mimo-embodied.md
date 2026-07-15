---
title: "MiMo-Embodied: X-Embodied Foundation Model Technical Report"
slug: mimo-embodied
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2511.16518"
venue: arXiv
year: 2025
era: frontier
num: 183
generated_at: 2026-07-15
---

# MiMo-Embodied：把自动驾驶和具身任务放进同一个跨本体基础模型

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和作者仓库可支持的结论；本站没有本地训练、仿真或真机复现实验，因此不会把论文报告的 benchmark 成绩写成本站 E4 结果。

## 一句话讲什么（TL;DR）

MiMo-Embodied 是小米团队发布的 X-Embodied foundation model technical report。它尝试把 autonomous driving 和 embodied AI 放进同一个 vision-language model 里训练，让模型同时处理驾驶场景中的环境感知、状态预测、驾驶规划，以及机器人场景里的 affordance prediction、task planning、spatial understanding。

论文报告 MiMo-Embodied 在 17 个 embodied AI benchmark 和 12 个 autonomous driving benchmark 上取得领先或竞争性结果。核心做法不是简单把数据混在一起，而是从 MiMo-VL 7B base model 出发，分四个阶段训练：embodied AI supervised fine-tuning、autonomous driving supervised fine-tuning、Chain-of-Thought fine-tuning、reinforcement learning fine-tuning。

如果只记一个直觉：这篇论文想证明“车”和“机器人”不是两个完全割裂的世界。它们都需要看懂空间、理解可行动作、做多步规划，只是身体和约束不同。

*所以这一节是想说：MiMo-Embodied 的核心是跨 autonomous driving 与 embodied AI 的统一训练。*

## 这是个什么场景

具身智能里常见两条线：一条是机器人操作、导航、找物、做任务；另一条是自动驾驶，要看道路、理解交通参与者、预测状态、做驾驶规划。它们看起来差别很大：机器人可能在厨房拿杯子，车在城市道路避让行人。但从模型角度看，二者都在做“视觉 + 语言/任务描述 + 空间推理 + 行动决策”。

传统上，这两条线通常分开训练、分开评测、分开优化。机器人模型学 grasping、affordance、室内空间；自动驾驶模型学 lane、traffic light、vehicle status、driving action。这样做很自然，因为数据格式、传感器视角、动作空间和安全约束都不一样。

MiMo-Embodied 选择反过来问：如果模型在驾驶里学到的空间动态、交通因果和安全规划，能不能帮助机器人理解空间和行动？机器人任务里的 object affordance 和 instruction following，又能不能反过来增强驾驶场景中的多模态推理？

```text
两个原本分开的世界

┌─────────────────────┐        ┌─────────────────────┐
│ Embodied AI          │        │ Autonomous Driving   │
│ affordance           │        │ perception           │
│ task planning        │        │ status prediction    │
│ spatial reasoning    │        │ driving planning     │
└──────────┬──────────┘        └──────────┬──────────┘
           │                              │
           └──────────┬───────────────────┘
                      ▼
              MiMo-Embodied
       cross-embodied VLM / reasoning model
```

这篇论文里的 “X-Embodied” 可以理解为“跨不同具身形态”。这里的身体不只是机械臂和移动机器人，也包括自动驾驶车辆这样的 embodied agent。车也有传感器、运动边界、环境规则和安全约束。

*所以这一节是想说：MiMo-Embodied 把自动驾驶也当成具身智能的一部分来统一建模。*

## 之前的人怎么做的，为什么不够好

以前的 VLM/VLA 研究通常只覆盖一类任务。比如一个模型专门做视觉问答，一个模型专门做机器人 affordance，一个模型专门做驾驶场景理解。这样可以把数据、评测和训练目标做得更干净，但代价是跨领域迁移弱。

机器人这边的问题是数据少、场景碎、任务分散。模型可能能回答“杯子在哪里”，却不一定能理解“这个物体能不能被拿起、放在哪里更合适、路径会不会碰撞”。自动驾驶这边的问题是场景动态强、因果约束重，模型不能只识别物体，还要理解速度、行为意图和安全规则。

如果每个领域都从零训练一个模型，很多共享能力会重复学习。比如 spatial relationship、object state、future action、instruction-to-plan 这些能力，本质上都和“人在物理世界中如何行动”有关。MiMo-Embodied 认为这部分可以共享。

但简单拼数据也不够。自动驾驶数据和机器人数据分布差别太大：图像视角不同，任务语言不同，答案格式不同，评价指标不同。如果没有阶段化训练和格式约束，模型可能只学到杂乱相关性，甚至在某个领域被另一个领域的数据干扰。

*所以这一节是想说：旧方法太领域专用，而直接混合数据又容易混乱，MiMo 试图用阶段训练解决这个问题。*

## 这篇论文的新想法

第一，新想法是把 embodied AI 和 autonomous driving 放在同一个模型报告里，而不是只作为两个应用 demo。论文明确说 MiMo-Embodied 是 cross-embodied foundation model，并报告两个领域的 benchmark。

第二，新想法是四阶段训练。它从 MiMo-VL 7B-SFT-2508 checkpoint 出发，先用 embodied AI 数据建立 affordance、task planning、spatial understanding，再加入 autonomous driving 监督数据，再用 generated rationales 做 Chain-of-Thought fine-tuning，最后用 GRPO 做 reinforcement learning fine-tuning。

第三，新想法是评测覆盖面很宽。Embodied AI 侧覆盖 affordance prediction、high-level task planning、spatial understanding；自动驾驶侧覆盖 environmental perception、status prediction、driving planning。论文报告 17 个 embodied AI benchmarks 和 12 个 autonomous driving benchmarks。

第四，新想法是强调 positive transfer。作者不只是说“一个模型能做两类任务”，还强调两个领域通过 multi-stage learning、curated data construction、CoT/RL fine-tuning 互相增强。

```text
MiMo-Embodied 四阶段训练

MiMo-VL 7B base
      │
      ▼
Stage 1: Embodied AI SFT
      │  学 affordance / task planning / spatial understanding
      ▼
Stage 2: Autonomous Driving SFT
      │  学 perception / status prediction / driving planning
      ▼
Stage 3: CoT SFT
      │  加入推理过程，提升复杂问题分解
      ▼
Stage 4: RL fine-tuning
         用 GRPO 进一步对齐任务表现
```

*所以这一节是想说：MiMo 的贡献不只是模型，而是跨领域任务组织和阶段化训练路线。*

## 它分几步做的（方法）

### 第 1 步：从 MiMo-VL 继承视觉语言底座

输入是图像、视频帧或多帧视觉信息，加上文本问题或任务描述。底座使用 MiMo-VL 的 vision encoder 和 language model 组件。论文说明 MiMo-VL 指 7B-SFT-2508 checkpoint，它给 MiMo-Embodied 提供已有的视觉语言对齐和推理能力。

处理过程可以理解为：视觉编码器先把图像变成视觉 token，projection module 把视觉 token 对齐到语言模型能理解的 latent space，语言模型再根据文本指令和视觉上下文输出答案或推理。

输出不是机器人低层动作，而是高层回答、规划、空间判断、可行动作解释等。这一点很重要：MiMo-Embodied 更接近 embodied VLM / reasoning model，不是直接控制电机的 policy。

### 第 2 步：构造 embodied AI 数据

这一阶段的数据覆盖三类能力。Affordance prediction 是判断物体能做什么、哪里可以抓、哪里可以放。High-level task planning 是把抽象目标拆成步骤。Spatial understanding 是理解方向、距离、布局、物体关系。

输入是机器人或具身场景里的图像、问题、语言命令。处理过程是监督微调，让模型把视觉内容和可行动含义连接起来。输出是选择答案、定位点、步骤计划或空间关系判断。

这一步像给模型补“身体常识”。一个普通 VLM 可能知道“杯子在桌上”，但 embodied 模型还要知道杯子可以拿、桌面可以放东西、桌边可能有碰撞风险。

### 第 3 步：加入自动驾驶数据

自动驾驶数据覆盖 environmental perception、status prediction、driving planning。模型需要看道路图像或视频，判断交通元素、车辆状态、未来行为和正确驾驶选择。

这里的关键不是让机器人模型变成驾驶模型，而是让两个领域共享空间动态理解。驾驶任务天然有强因果和安全约束：红灯要停、行人要让、前车慢要减速、并线要判断风险。这些约束也会训练模型更严谨地连接视觉证据和行动解释。

输出可能是选项答案、行为说明、状态预测或驾驶规划。论文附录中有大量自动驾驶 planning 示例，模型会先解释场景，再给出 boxed answer。

### 第 4 步：CoT fine-tuning

Chain-of-Thought fine-tuning 的输入是带推理过程的样本。模型不只学最终答案，也学中间解释：为什么这个物体可交互、为什么这一步要先做、为什么驾驶场景里应该等待。

处理过程是用 generated rationales 做监督。它的价值是让模型在多步任务中少跳步。比如 task planning 里，模型需要知道“先找目标，再接近，再确认可抓，再执行”，而不是直接给一个动作。

输出是更有结构的回答，通常包含 reasoning 和 final answer。这里要注意：CoT 能提升可解释性，但也可能生成看似合理的错误解释，因此不能把解释本身当成事实证明。

### 第 5 步：RL fine-tuning

最后一阶段是 reinforcement learning fine-tuning，论文提到使用 GRPO optimization。直觉上，这是在监督学习之后，用任务反馈进一步压实模型行为。

输入是模型生成的候选回答和任务反馈，处理是按照奖励信号优化，输出是更符合 benchmark 或任务目标的回答分布。它类似考试前的“针对评分规则再训练”，但仍然受限于奖励定义和评测覆盖。

### 第 6 步：跨两大任务族评估

评估分为 embodied AI 和 autonomous driving。Embodied AI 侧看 affordance、planning、spatial；自动驾驶侧看 perception、status、planning。论文报告在多个 benchmark 上超过 open-source、closed-source 或 specialized baselines。

但评估仍主要是 benchmark 和 qualitative examples。它不能自动证明模型在真实机器人或真实道路中安全可靠。尤其自动驾驶与机器人控制都涉及低层执行和安全认证，不能只靠 VLM benchmark。

*所以这一节是想说：MiMo 的方法是“先具身，再驾驶，再推理，再 RL”，目标是让两个具身领域共享空间行动能力。*

## 关键数字

| 数字 | 原文语境 | 这说明什么 |
|---:|---|---|
| 7B | MiMo-VL 7B-SFT-2508 作为 base model | 模型规模属于可公开复用的中等 VLM 量级 |
| 17 | embodied AI benchmarks | 评测覆盖 affordance、planning、spatial 三类能力 |
| 12 | autonomous driving benchmarks | 评测覆盖感知、状态预测、驾驶规划 |
| 4 | training stages | SFT、驾驶 SFT、CoT SFT、RL fine-tuning |
| 3 | embodied AI capability groups | affordance prediction、task planning、spatial understanding |
| 3 | autonomous driving capability groups | environmental perception、status prediction、driving planning |

这些数字全部是论文报告，不是本站复现实验。尤其 “sets new records” 和 “outperforms” 必须回到表格核验具体 benchmark、metric 和 baseline。

*所以这一节是想说：本文的证据重点是覆盖面和跨领域结果，而不是单一指标。*

## 实验结果说明了什么

实验最直接说明的是，跨 embodied AI 与 autonomous driving 的联合训练有可能带来正迁移。MiMo-Embodied 在 affordance prediction benchmark 上表现强，说明模型更会把视觉对象和可行动性连接起来；在 task planning 上表现强，说明模型能处理从目标到步骤的抽象推理；在 spatial understanding 上表现强，说明模型更会理解物理空间关系。

自动驾驶侧结果说明，模型不是只会静态看图，还能处理 status prediction 和 driving planning 这类动态判断。驾驶任务中，模型需要连接交通灯、行人、速度、车辆行为和规则，这对具身推理很有帮助。

不过，benchmark 结果仍不能替代真实部署。一个模型能在驾驶问答里选对“等行人过马路”，不等于它能安全控制真实车辆；能回答“杯子可以抓”，也不等于它能闭环控制机械臂成功抓杯子。MiMo-Embodied 更适合作为高层理解和规划模型，而不是直接执行层。

实验还说明一个趋势：具身基础模型的边界正在扩大。过去我们把 VLA 主要理解为机械臂控制；现在 autonomous driving、navigation、medical robotics、simulation generation 都在被纳入“具身”框架。

*所以这一节是想说：实验支持跨领域具身推理的可能性，但不能越界写成真实控制安全。*

## 术语表

- Cross-embodied：跨不同具身形态，比如机器人、车辆或其他有传感器和行动边界的系统。
- VLM：Vision-Language Model，输入视觉和文字，输出文本回答或推理。
- Affordance prediction：判断物体或场景“可以做什么”，例如哪里能抓、哪里能放。
- Task planning：把目标拆成可执行步骤。
- Spatial understanding：理解方向、距离、布局、前后左右、接触关系。
- Chain-of-Thought：让模型显式生成中间推理过程。
- GRPO：一种强化学习优化方式，论文用于最后阶段 fine-tuning。
- Autonomous driving planning：自动驾驶中的行为选择和理由解释。

*所以这一节是想说：MiMo 的关键词都围绕“跨身体的视觉语言推理”。*

## 局限和边界

第一，MiMo-Embodied 不是低层机器人控制器。它报告的是 VLM 在 embodied AI 和 driving benchmark 上的表现，不能直接等同于真实机器人闭环执行。

第二，自动驾驶与机器人虽然都属于具身系统，但安全标准不同。把驾驶数据加入训练可能提升空间推理，不代表模型满足自动驾驶安全认证。

第三，CoT 解释不一定等于真实因果。模型可能给出流畅理由，但理由是否忠实于视觉证据仍要单独验证。

第四，benchmark 覆盖广不等于开放世界可靠。17 + 12 benchmark 很强，但真实家庭、医院、道路都有长尾情况。

第五，跨领域训练可能带来负迁移。论文强调 positive transfer，但不同任务的答案格式、风险偏好和动作含义可能互相干扰，需要更细的 ablation 才能判断。

*所以这一节是想说：MiMo 是很有野心的跨具身模型，但仍然是高层推理和 benchmark 证据。*

## 和其他论文的关系

和 `navfom` 或 `embodied-navigation-foundation-model` 相比，MiMo-Embodied 更宽。NavFoM 专注导航，MiMo 同时覆盖机器人高层推理和自动驾驶。

和 `open-h-embodiment` 相比，MiMo 更像模型路线，Open-H 更像医疗机器人数据基础设施。一个回答“怎么训练统一模型”，一个回答“医疗机器人缺什么数据”。

和 `alanavlm` 相比，两者都属于 embodied VLM。AlanaVLM 聚焦 egocentric video understanding，MiMo 聚焦跨 embodied AI 与 driving 的多任务模型。

和 `3d-generation-for-embodied-ai` 相比，MiMo 处理的是感知和推理模型，3D generation survey 处理的是仿真资产和环境供给。一个是脑，一个是训练世界。

*所以这一节是想说：MiMo 把 Batch 6 的多个主题连接起来，是跨本体 foundation model 的代表。*

## 和本导读的关系

本站前面的 VLA 笔记多数围绕机器人操作、导航、策略学习。MiMo-Embodied 提醒我们，具身智能也可以包含自动驾驶这样的移动智能体。只要系统有传感器、有行动边界、有真实世界约束，就可以放进 embodied intelligence 的讨论。

它适合和 VLA、导航、world model、dataset-eval 几条线一起读。读者可以用它练习一个重要问题：什么时候“统一模型”真的共享能力，什么时候只是把任务堆在一个模型里？

*所以这一节是想说：MiMo 帮本站从机器人操作扩展到更广义的 embodied agent。*

## 思考题

1. 为什么自动驾驶可以被看作一种 embodied AI，而不只是视觉感知任务？
2. MiMo 的四阶段训练中，哪一步最可能提升复杂推理？哪一步最可能带来任务对齐？
3. Affordance prediction 和 driving planning 有哪些共享能力？
4. 为什么 CoT 解释不能直接当成真实因果证明？
5. 如果把医疗机器人数据加入 MiMo 这种模型，可能带来哪些正迁移和风险？

## FAQ

**Q：MiMo-Embodied 是不是 VLA？**
A：它更像 embodied VLM / reasoning foundation model。它处理视觉、语言、规划和空间推理，但论文不是把它写成低层动作控制 policy。

**Q：它为什么把自动驾驶放进来？**
A：因为自动驾驶也是具身系统：有传感器、行动空间、安全规则和物理世界约束。它能提供动态空间推理和安全规划数据。

**Q：17 个 embodied benchmark 是本站跑的吗？**
A：不是。它们是论文报告的评测结果，本站没有复现。

**Q：这是不是说明一个模型可以直接控制车和机器人？**
A：不是。论文展示高层视觉语言推理能力，真实控制还需要低层控制器、安全系统、实时验证和领域认证。

## 进一步读什么

- `embodied-navigation-foundation-model`：看统一导航基础模型如何处理跨任务、跨本体导航。
- `open-h-embodiment`：看医疗机器人如何用开放数据支撑 foundation model。
- `alanavlm`：看 egocentric video understanding 如何补 embodied VLM。
- `efficient-vla-survey`：看这类模型落地时的效率和部署问题。

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：MiMo-VL 7B-SFT-2508 base model 表述、四阶段训练名称、17 个 embodied AI benchmark、12 个 autonomous driving benchmark、affordance / planning / spatial 三类能力、environmental perception / status prediction / driving planning 三类驾驶能力，以及每个表格中的 SOTA 或 competitive claim 是否按原文表述。

## 原文信息

- arXiv: [2511.16518](https://arxiv.org/abs/2511.16518)
- PDF: [https://arxiv.org/pdf/2511.16518](https://arxiv.org/pdf/2511.16518)
- Code / models: [https://github.com/XiaomiMiMo/MiMo-Embodied](https://github.com/XiaomiMiMo/MiMo-Embodied)

```bibtex
@article{hao2025mimoembodied,
  title = {MiMo-Embodied: X-Embodied Foundation Model Technical Report},
  author = {Hao, Xiaoshuai and Zhou, Lei and Huang, Zhijian and Hou, Zhiwen and Tang, Yingbo and Zhang, Lingfeng and others},
  journal = {arXiv preprint arXiv:2511.16518},
  year = {2025}
}
```
