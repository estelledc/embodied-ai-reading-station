---
title: "A Survey of Language-Conditioned Robot Manipulation"
slug: language-conditioned-manipulation-survey
topic: vla
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2312.10807"
venue: IJRR
year: 2026
era: frontier
num: 197
generated_at: 2026-07-15
---

# A Survey of Language-Conditioned Robot Manipulation：语言如何进入机器人操作系统

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和作者页面能支持的结论；本站没有复现任何被综述论文中的实验，因此不会把原文引用的各类结果写成本站 E4 结果。

## 一句话讲什么（TL;DR）

这篇综述系统整理 language-conditioned robot manipulation，也就是机器人如何根据自然语言完成操作任务。它的核心贡献不是提出一个新 policy，而是给领域建立一套分类框架：语言可以作为 state evaluation、policy condition、cognitive planning/reasoning，也可以进入 unified vision-language-action models。

综述还提出五个横向比较轴：action granularity、data and supervision regimes、system cost and latency、environments and evaluations、task specification。换句话说，它不只问“这篇方法用了 LLM 吗”，还问它输出的是高层技能还是低层控制、数据从哪里来、推理有多慢、在哪些 benchmark 上测、语言和图像/视频任务指定方式如何互补。

如果只记一个直觉：这篇像一张地图，告诉你语言进入机器人系统有四扇门：评价状态、条件化动作、做规划推理、和视觉语言动作统一建模。每扇门的成本、优势和风险都不同。

*所以这一节是想说：这篇综述给语言条件机器人操作提供了结构化地图。*

## 这是个什么场景

让非专家使用机器人，最自然的方式是说话或打字。用户不会写控制程序、设计 reward function，也不想遥操作每一步。他更可能说“把红杯子从厨房台面拿过来”“慢慢把化学品从桌上移到储物区”“如果抽屉卡住就轻一点拉”。语言能表达目标、关系、约束、偏好和安全要求。

但机器人操作不是纯语言问题。语言要落到视觉场景、物体位置、接触力、轨迹、抓取姿态和错误恢复。一个指令可能语义清楚但几何不清楚，也可能规划合理但低层控制失败。

综述的场景就是从宏观上整理这个领域：语言到底在机器人控制循环里扮演什么角色？不同方法的边界在哪里？未来最大挑战是泛化、安全、延迟、数据还是 cross-embodiment？

```text
自然语言进入机器人操作的四个入口

1. language -> state evaluation
2. language -> policy condition
3. language -> cognitive planning / reasoning
4. language -> unified VLA model

同一句话可以是目标、条件、计划，也可以是端到端模型的一部分。
```

*所以这一节是想说：语言条件操作的难点在于语言必须同时连接语义、感知、规划和控制。*

## 之前的人怎么做的，为什么不够好

传统机器人系统用手写规则、遥操作或人工 reward。它们在结构化工厂环境里很有效，但普通用户无法轻松指定新任务，维护成本也高。

早期 language-conditioned 方法把语言当作标签或 goal condition，解决了一部分可用性问题，但往往只适用于固定任务集。语言表达变复杂、对象变新、环境变开放时，模型很容易失效。

LLM/VLM 进入后，系统获得更强的常识和推理能力，但也带来 hallucination、latency、安全和接口不稳定问题。一个 LLM 计划看似合理，可能调用不存在的 skill；一个 VLM 识别看似自信，可能定位错物体；一个 VLA 模型动作流畅，却可能遗忘 VLM 原本的推理能力。

综述认为，不能只按“用了什么大模型”分类。真正重要的是语言在控制循环中承担的功能，以及这个功能对应的工程 trade-off。

*所以这一节是想说：领域需要从方法名和模型规模，转向语言角色和系统边界。*

## 这篇论文的新想法

第一，新想法是四类语言角色。语言可以定义 reward / cost / progress，即 state evaluation；可以直接作为 policy 输入，即 policy condition；可以作为 planning 和 reasoning 的符号媒介；也可以被统一 VLA 模型端到端吸收。

第二，新想法是五个比较轴。action granularity 看输出是 skill、trajectory 还是 low-level control；data regime 看用 expert demos、play data、web data 还是 foundation model annotations；latency 看部署是否实时；evaluation 看 benchmark 和真实验证；task specification 看语言、图像、视频如何互补。

第三，新想法是把 image/video-conditioned manipulation 和 language-conditioned manipulation 放在同一地图里比较。语言擅长高层语义和可编辑约束，图像/视频擅长几何和运动细节。

第四，新想法是把 future directions 聚焦在 generalization capability 和 real-world safety，而不只是列论文。

```text
综述的双层地图

功能层 taxonomy:
  state evaluation / policy condition / planning / unified VLA

工程层 axes:
  action granularity / data / latency / evaluation / task specification

读论文时先问它是哪一类，再问它在哪个轴上付出了什么代价。
```

*所以这一节是想说：综述用功能分类和工程比较两个层次组织领域。*

## 它分几步做的（方法）

### 第 1 步：定义 language-conditioned manipulation

输入是机器人操作领域的大量论文。综述先明确研究对象：机器人根据自然语言理解任务、感知场景、生成动作，并与人类协作。

处理上，它把这个领域和更广的 intuitive task specification 关联起来，包括 image-conditioned 和 video-conditioned manipulation。语言不是唯一接口，而是其中最适合表达抽象目标、关系约束和安全规则的一种接口。

输出是研究范围：语言、视觉、动作、策略学习和规划的交叉地带。

### 第 2 步：按语言在控制循环中的作用分类

第一类是 language for state evaluation。语言被转成 reward、cost、value 或 progress signal，用来评价任务是否接近完成。

第二类是 language as policy condition。语言直接作为 policy 的输入条件，告诉模型要执行什么任务。

第三类是 language for cognitive planning and reasoning。语言作为中间推理媒介，帮助 LLM/VLM 分解任务、生成步骤、检查约束。

第四类是 unified VLA models。语言、视觉和动作被放进统一模型，模型直接从多模态输入生成动作或 latent actions。

输出是一个功能 taxonomy。它比“方法用了 transformer 还是 diffusion”更稳定，因为同一技术可以被放在不同角色中。

### 第 3 步：从五个工程轴比较方法

Action granularity 问：输出是高层技能、轨迹 waypoint，还是低层 torque / velocity？高层技能利于规划，低层控制利于精细接触。

Data and supervision 问：数据来自专家示范、play data、web data、human labels、reward/preference，还是 foundation model 生成？这决定标注成本和泛化。

System cost and latency 问：训练和推理需要多少算力？是否能在真实机器人闭环里实时运行？LLM/VLM 调用可能引入延迟和抖动。

Environments and evaluations 问：方法只在仿真测，还是有真实机器人？benchmark 是否覆盖长程、接触、动态环境和 cross-embodiment？

Task specification 问：语言、目标图像和视频分别承担什么角色？语言高层可编辑，图像/视频几何更精确，混合可能更稳。

### 第 4 步：讨论语言和视觉任务指定的互补

综述指出，image/video-conditioned 方法擅长定义目标几何和运动轨迹，例如插入、折叠、接触丰富任务。语言则擅长低带宽地表达抽象意图、组合关系、否定约束和用户修正。

处理上，论文把两者放进 state evaluation、policy conditioning、planning 三个角色里比较，而不是简单说谁更好。

输出是一个结论：未来很可能是 hybrid task specification。语言说“做什么”和“为什么”，图像/视频说“具体怎么摆、怎么动”。

### 第 5 步：讨论 VLA、world model 和 scaling debate

综述提出几个社区争论：VLA 是否是通用机器人最直接道路？world model 是否能提供鲁棒 planning foresight？模型规模与实时控制之间如何平衡？

处理上，它强调机器人不像纯语言任务，数据不是无限同质的，错误也会造成物理失败。因此单纯 scale 参数和数据不一定足够，还需要结构、物理先验、模块化和安全 interlock。

输出是对“更大模型是否自动解决机器人”的谨慎判断。

### 第 6 步：总结未来挑战

论文把未来方向集中在 generalization 和 real-world safety。泛化包括数据、多任务、lifelong learning、cross-embodiment alignment 和 zero-shot 的边界。安全包括语言歧义、失败恢复、实时性能、网络/通信风险和人机协作。

输出是一组问题清单：不是“有没有 LLM”，而是系统能否在新环境里安全、实时、可恢复地执行语言指令。

*所以这一节是想说：综述的方法是先分类，再横向比较，最后回到泛化和安全两个根问题。*

## 关键数字

| 数字或设置 | 原文语境 | 这说明什么 |
|---|---|---|
| 4 类语言角色 | state evaluation / policy condition / planning / unified VLA | 语言进入控制循环的主要入口 |
| 5 个比较轴 | granularity / data / latency / evaluation / task specification | 方法比较不能只看模型名 |
| 70 页左右 | IJRR survey 体量 | 覆盖面很广，适合作为领域地图 |
| 3 个安全关注 | ambiguity / failure recovery / real-time performance | 语言条件系统的安全挑战 |
| 3 个泛化方向 | data / lifelong learning / cross-embodiment alignment | 未来系统能力增长的关键 |
| <7B vs >100B | 文中 VLA 与 LLM 规模讨论 | 当前 VLA 仍远小于现代 LLM，但机器人数据更难 scale |
| 26x / 20% | 综述引用 OpenVLA-OFT 控制频率和 LIBERO 提升片段 | 部署效率和成功率都重要 |

这些数字来自综述文本和其引用总结，不是本站复现实验。由于综述覆盖大量论文，具体单项结果必须回到被引用原文核验。

*所以这一节是想说：这篇的数字不是实验主角，分类框架才是主角。*

## 实验结果说明了什么

这篇是综述，不做单一新实验。因此“实验结果”应理解为它对领域证据的综合判断。

第一，语言非常适合高层任务表达，但不天然解决几何和接触。语言能说“慢慢”“远离黄色瓶子”“把红杯子放进左抽屉”，但不能精确说明插入角度和接触力。

第二，VLA 是重要方向，但不是纯 scale 就能解决。机器人数据稀缺、物理错误代价高、控制频率要求高，这些都让 embodied scaling 不同于 NLP scaling。

第三，world model 和 future reasoning 有潜力，但预测未来图像昂贵且可能包含无关信息。更紧凑的 latent world representation 是一个趋势。

第四，真实部署需要考虑 latency 和 safety。一个大模型规划很聪明，但如果调用慢、闭环抖动、无法处理异常，就很难部署到真实机器人。

*所以这一节是想说：综述把“语言很强”放进了现实机器人系统的约束里重新审视。*

## 你应该懂的几个新词

- Language-conditioned manipulation：用自然语言指定、约束或辅助机器人操作。
- State evaluation：把状态好坏转成 reward / cost / progress。
- Policy condition：作为策略输入的条件，例如一句任务指令。
- Cognitive planning：用语言做任务分解和推理。
- VLA：Vision-Language-Action，统一视觉、语言和动作。
- Action granularity：动作输出粒度，从技能到低层控制。
- Task specification：任务指定方式，语言、图像、视频都可以是接口。
- Cross-embodiment alignment：不同机器人身体之间共享语义和控制表示。

*所以这一节是想说：这篇的术语是一套读 VLA 论文的坐标系。*

## 它有什么搞不定的

第一，综述无法替代一手实验。它提供地图，但每个方法的实验细节仍要回原论文。

第二，领域发展很快。2026 年后新的 VLA、world model、安全框架可能继续改变分类边界。

第三，分类天然会简化现实系统。很多方法同时使用语言做 condition、planning 和 verification，很难只放进一类。

第四，安全讨论仍偏方向性。具体如何证明真实机器人安全，仍缺统一 benchmark 和认证流程。

第五，跨 embodiment、lifelong learning、real-time control 的实践方案仍未成熟。

*所以这一节是想说：综述提供框架，但真正解决问题还要靠后续具体系统和评估。*

## 它和别的几篇是什么关系

和 `gembench` 相比，这篇是领域总图；GEMBench 是其中 environments and evaluations 轴上的具体 benchmark。

和 `discrete-policy` 相比，这篇解释 action granularity 和 action representation 的大背景；Discrete Policy 是其中一条动作表示路线。

和 `safeembodai` 相比，这篇在 real-world safety 小节提出安全议题；SafeEmbodAI 是针对 LLM-integrated mobile robot 的具体安全框架。

和 `instructvla` 相比，这篇总结了 VLA 中 catastrophic forgetting、MoE、instruction tuning 等趋势；InstructVLA 是具体实现之一。

*所以这一节是想说：这篇综述像目录，Batch 9 其他三篇是目录中的具体条目。*

## 和本导读的关系

这篇非常适合作为本站 VLA / planning / dataset-eval 的中枢笔记。读者可以用它回看之前的论文：OpenVLA 是 policy condition + unified VLA，SayCan 是 cognitive planning，GEMBench 是 evaluation，Discrete Policy 是 action representation，SafeEmbodAI 是 safety layer。

它也能帮助入门者建立提问方式。以后读一篇新论文，不要只问“用了什么模型”，还要问：语言在哪个环节起作用？动作粒度是什么？数据成本是多少？延迟能否闭环？有没有真实评估？安全怎么处理？

*所以这一节是想说：这篇是把碎片化 VLA 论文串成体系的索引。*

## 思考题

**Q1：语言作为 state evaluation 和 policy condition 有什么区别？**

<details>
<summary>提示</summary>

前者评价状态是否接近目标，后者直接作为动作策略输入。
</details>

**Q2：为什么 action granularity 是重要比较轴？**

<details>
<summary>提示</summary>

高层技能利于规划但不精细；低层控制精确但难以长程推理。
</details>

**Q3：语言和视频任务指定谁更强？**

<details>
<summary>提示</summary>

不是谁更强。语言表达逻辑和约束，视频表达几何和动作细节。
</details>

**Q4：为什么 VLA scaling 不能照搬 LLM scaling？**

<details>
<summary>提示</summary>

机器人数据昂贵且异质，物理错误代价高，控制还受实时性约束。
</details>

**Q5：语言条件机器人最大的安全风险是什么？**

<details>
<summary>提示</summary>

语言歧义、LLM 幻觉、失败恢复不足、延迟和外部通信风险都会导致危险动作。
</details>

## 一些好奇心问答（FAQ）

**Q：这篇综述应该从头到尾读吗？**

如果时间有限，先读 abstract、taxonomy、comparative analysis、limitations。之后按需要查具体方法。

**Q：为什么综述也写成 deep-read？**

因为它提供的是框架，不是单篇模型结果。理解框架能提高后续读论文效率。

**Q：VLA 是不是语言条件操作的终点？**

不是。综述认为 VLA 很重要，但仍要解决数据、结构、实时、安全和物理 grounding。

**Q：语言是不是最好的机器人接口？**

语言最适合抽象目标和交互修正，但几何细节常需要图像、视频、点击、gaze 或示范补充。

**Q：这篇最值得记住的一句话是什么？**

读任何 language-conditioned robot paper，都先问语言在控制循环里承担什么功能。

## 如果你想再深入

1. 用四类语言角色重新标注本站已有 VLA 论文。
2. 对比 image/video-conditioned manipulation，看任务指定方式如何互补。
3. 深读 OpenVLA-OFT、InstructVLA、ChatVLA，理解 VLA 如何保留推理能力。
4. 深入安全章节，连接 SafeEmbodAI、VLA-Forget、membership inference 等安全主题。

*所以这一节是想说：这篇综述适合当作长期阅读路线图。*

## 精读补充：用这篇综述反向检查一篇新 VLA 论文

读完这篇综述后，可以把它当作 checklist。遇到一篇新 VLA 论文，不要先问“模型多大”，而是依次问：语言在哪里进入系统？输出动作粒度是什么？数据从哪里来？模型是否实时？实验是否只在仿真？有没有真实机器人、失败恢复和安全分析？

```text
读新论文的五问

1. Language role?
   state evaluation / policy condition / planning / unified VLA
        ->
2. Action granularity?
   skill / trajectory / low-level control
        ->
3. Data regime?
   expert demos / play data / web data / FM-generated labels
        ->
4. Deployment cost?
   latency / memory / closed-loop frequency / edge feasibility
        ->
5. Evaluation validity?
   simulation only / real robot / novel tasks / safety / recovery
```

这个 checklist 的好处是能拆掉很多“看起来很强”的包装。比如一个模型在 demo 视频里表现好，但如果只测了 seen tasks，且没有报告 latency 和失败恢复，那么它的结论范围就应该被收窄。相反，一个模型平均成功率不最高，但明确报告了真实机器人、长程任务、错误恢复和安全约束，可能在工程价值上更扎实。

这也是综述类论文的意义：它不给你一个单点答案，而是给你判断答案边界的工具。

## 原文信息

- arXiv: https://arxiv.org/abs/2312.10807
- PDF: https://arxiv.org/pdf/2312.10807
- Project / paper page: https://www.oiermees.com/publication/langsurvey/

```bibtex
@article{yao2026survey,
  title={A Survey of Language-Conditioned Robot Manipulation},
  author={Yao, Xiangtong and Zhou, Hongkuan and Mees, Oier and Meng, Yuan and Xiao, Ted and Bisk, Yonatan and Oh, Jean and Johns, Edward and Shridhar, Mohit and Shah, Dhruv and Thomason, Jesse and Huang, Kai and Chai, Joyce and Bing, Zhenshan and Knoll, Alois},
  journal={The International Journal of Robotics Research},
  year={2026}
}
```
