---
title: "What Breaks Embodied AI Security: LLM Vulnerabilities, CPS Flaws, or Something Else?"
slug: embodied-ai-security-cps-survey
topic: planning
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2602.17345"
venue: arXiv
year: 2026
era: frontier
num: 202
generated_at: 2026-07-15
---

# What Breaks Embodied AI Security：具身智能到底坏在哪里

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本和 arXiv 元数据能支持的结论；这篇是安全综述 / position survey，不报告本站复现实验。

## 一句话讲什么（TL;DR）

这篇论文问了一个很关键的问题：具身 AI 的安全问题，到底是 LLM 漏洞、传统 cyber-physical system（CPS）漏洞，还是一种新的系统级失效？作者的答案是：三者都有，但最危险的部分往往来自 perception、reasoning 和 action 被组合到一个闭环后产生的系统级错配。

文本聊天机器人出错，可能只是说错话；LLM 控制机器人出错，可能会把错话变成动作。传统 CPS 也会失败，但它通常关注控制稳定、传感器故障、物理执行；LLM/VLA 系统还多了 prompt injection、跨模态错配、语义正确但物理危险、长链路风险累积等新问题。

如果只记一个直觉：具身安全不能只问“模型有没有越狱”，也不能只问“控制器是否稳定”。它要问整个感知-决策-行动链路中，语言、视觉、物理和时间是否一致。

*所以这一节是想说：具身 AI 安全是系统问题，不是单点 LLM 或单点控制问题。*

## 这是个什么场景

具身 AI 正在从实验室 demo 走向真实环境：自动驾驶、服务机器人、家庭助理、仓库机器人、LLM-driven interactive agents。它们接收语言、图像、传感器和历史状态，生成计划、代码、轨迹或动作。

这带来新的安全边界。攻击者不一定要入侵系统代码，也可能通过一句提示、一张图、一个环境贴纸、一个物体位置变化，让 agent 的内部目标、视觉 grounding 或行动规划偏移。因为 agent 会执行动作，错误会有物理后果。

```text
传统 LLM 安全
  prompt -> text output -> content risk

传统 CPS 安全
  sensor/control -> actuator -> stability risk

Embodied AI 安全
  language + vision + state + memory
        -> planner / policy
        -> physical action
        -> environment changes
        -> next observation
```

论文特别强调，具身系统处于 open, human-shared environments。也就是说，环境中有人、物体会动、状态不完全可见、风险会跨时间累积。这比一次性文本输出复杂得多。

*所以这一节是想说：具身 AI 的攻击面横跨数字输入、物理环境和执行闭环。*

## 之前的人怎么做的，为什么不够好

LLM 安全研究已经讨论了 prompt injection、jailbreak、data poisoning、backdoor、alignment failure 等问题。这些工作很重要，但很多评估停在文本输出：模型是否说了不该说的话，是否泄露信息，是否绕过安全策略。

CPS 安全研究则关注传感器 spoofing、控制稳定、故障检测、形式化安全边界、网络攻击、物理执行风险。这些也很重要，但它们通常没有考虑 LLM/VLA 的语义规划和跨模态 reasoning。

具身 AI 把两类问题绑在一起后，出现新的断裂。例如一个计划在语言上安全，动作上却危险；视觉识别看似正确，但物体接触状态让同一动作产生不同后果；每一步局部安全，长序列组合后却导致风险累积。

因此，只用 LLM filter 或传统控制器都不够。filter 可能看不出物理风险，控制器可能不知道高层意图已经被攻击改变。

*所以这一节是想说：现有 LLM 安全和 CPS 安全各自只覆盖一半，具身闭环中的错配才是关键。*

## 这篇论文的新想法

第一，新想法是三类攻击面。论文把 LLM-based embodied AI 的攻击分为：Semantic & Intent Integrity Attacks、Cross-Modal Consistency and Grounding Attacks、Agent-Environment Interaction Loop Attacks。

第二，新想法是三类系统级 trust assumptions：语义意图是否保持一致，跨模态 grounding 是否一致，agent 与环境闭环是否稳定。

第三，新想法是把安全 gap 写成 embodied AI 特有 insight：semantic correctness does not imply physical safety。语言上合理的动作，不一定满足几何、动力学、接触和任务安全约束。

第四，新想法是行动-后果脱耦。论文总结三类根因：Semantic Gap、Execution Drift、Risk Accumulation。它们解释了为什么决策时看似安全的 action sequence，执行后仍可能产生危险。

```text
三类攻击面

Semantic / Intent
  prompt, goal, plan 被改变

Cross-modal Grounding
  vision-language-action 对不齐

Agent-Environment Loop
  物理环境被操纵，闭环被带偏
```

*所以这一节是想说：本文把安全问题从“输入攻击”提升到“系统信任假设被打破”。*

## 它分几步做的（方法）

### 第 1 步：界定 scope

输入是三类研究传统：LLM security、classical CPS security、embodied AI specific challenges。处理上，作者不把具身安全归因到单一来源，而是比较三者的覆盖边界。

输出是一个核心问题：What actually breaks embodied intelligence? 是语言模型漏洞、CPS flaw，还是系统级交互？论文后续所有分类都围绕这个问题展开。

### 第 2 步：整理 LLM 漏洞在具身 AI 中如何变成物理风险

输入是 LLM/VLA 系统，如 OpenVLA、RT-2 这类把自然语言转成计划或动作的架构。处理上，作者把攻击分成语义意图完整性攻击、跨模态一致性攻击、环境闭环攻击。

语义攻击包括 jailbreak、prompt injection、policy executable attack、BADROBOT 这类利用“语言安全”和“动作安全”错配的攻击。跨模态攻击包括视觉-语言 fusion 中的恶意图片、文本图像组合、对抗扰动。环境闭环攻击则通过物理世界贴纸、物体重排、几何变形等方式让感知和规划失败。

输出是 attack surface map：攻击不只发生在 prompt 字符串，也发生在视觉、环境和动作接口。

### 第 3 步：分析 semantic correctness 和 physical safety 的差距

输入是 LLM 生成的高层计划。处理上，论文指出语义正确只代表目标匹配和逻辑可行，不代表物理可执行。比如“quickly grasp a fragile glass”在语言上合理，但可能因为加速度、摩擦和接触力导致玻璃滑落或破碎。

输出是一个重要判断：具身系统必须把语言计划映射到 kinematic safety、dynamic safety、task safety 三层约束，而不是只检查文字是否安全。

### 第 4 步：解释为什么同一动作在不同状态会有不同后果

输入是控制理论中的状态转移 `s_{t+1} = f(s_t, a_t)`。处理上，论文强调同一个动作 `a` 在不同状态 `s_i` 和 `s_j` 下可能产生完全不同后果。几何、接触模式、材料属性、传感器噪声和动态环境都会改变结果。

输出是 consequence variability：不能把语言动作当成固定含义。比如“push”在轻物体、重物体、桌边、人旁边的风险完全不同。

### 第 5 步：总结行动-后果脱耦的三类根因

输入是系统执行失败案例。处理上，论文把失败归纳为三类。

Semantic Gap：文本知识缺少力、接触、摩擦和中间反馈。Execution Drift：计划基于简化模型，执行时因为感知误差、动态变化和控制延迟偏离。Risk Accumulation：每一步局部安全，但多层约束长期组合后形成全局危险。

输出是一个排查模型：当具身 AI 出错时，不要只问 prompt 或 controller，而要沿语义、执行和时间累积三条线找断点。

### 第 6 步：提出开放挑战和对策

输入是 bias、hallucination、multi-robot coordination、human-factor risk、cognitive-perceptual alignment、filter impossibility、large attack surfaces、irreversible physical harm、protection boundary、policy standards 等问题。

处理上，作者逐项分析挑战和 countermeasures，例如数据去偏、human-in-the-loop、cross-modal adversarial training、formal methods、adaptive safety systems、industry-wide frameworks、certification standards。

输出不是一个单一防御系统，而是一套研究议程：具身 AI 安全需要训练、运行时监控、形式化验证、用户研究和政策标准共同推进。

```text
行动-后果脱耦

LLM plan looks safe
        |
        v
semantic gap
execution drift
risk accumulation
        |
        v
unsafe physical outcome
```

*所以这一节是想说：本文的方法是把攻击、根因和防御边界系统化。*

## 关键数字（What works）

| 原文信息 | 数字 / 结构 | 这说明什么 |
|---|---:|---|
| arXiv PDF | 26 pages | 长篇安全综述 / position survey |
| 攻击大类 | 3 类 | 语义意图、跨模态 grounding、环境闭环 |
| jailbreak variants | 5 类 | executable、safety misalignment、cross-modal、optimization、mobile goal hijack |
| Harmful-RLbench | 25 scenarios | 用于 embodied harmful task testing |
| physical safety pillars | 3 个 | kinematic、dynamic、task safety |
| root causes | 3 类 | semantic gap、execution drift、risk accumulation |
| execution failure modes | 3 类 | control failure、force feedback anomalies、safety boundary breaches |
| open challenge themes | 多项 | bias、hallucination、multi-robot、human-factor、alignment、policy |
| 本站复现 | 0 | 不声称验证攻击或防御效果 |

*所以这一节是想说：论文的强项是分类框架和风险链路，不是新攻击 benchmark。*

## 实验结果说明了什么

这篇论文没有提出一个新模型并报告成功率。它总结已有攻击、防御、benchmark 和系统失败机制，因此“结果”更像一张安全图谱。

从图谱可以得到三个重要结论。

第一，具身 jailbreak 比文本 jailbreak 更危险，因为攻击必须生成可执行物理策略，而不是只诱导有害文本。ROBOPAIR、POEX 等工作关注的就是 harmful intent 到 syntactically valid code/API call 的桥接。

第二，跨模态攻击说明安全输入不再是一个 prompt。视觉、语言、环境文字、物体布局都可能改变 planner context。

第三，很多风险不是攻击者造成的，而是系统自然错配造成的。semantic gap、execution drift 和 risk accumulation 即使没有恶意攻击也会出现。

*所以这一节是想说：具身安全要同时防攻击和防系统自身错配。*

## 你应该懂的几个新词

- **CPS**：Cyber-Physical System，软件控制和物理系统紧密连接的系统，例如机器人、自动车、工业控制。
- **Prompt Injection**：把恶意指令藏进输入，让模型偏离原始系统指令。
- **Jailbreak**：诱导模型绕过安全策略，输出或执行原本不该做的内容。
- **Cross-Modal Consistency**：语言、视觉、动作表示之间是否对齐。
- **Execution Drift**：计划和真实执行逐渐偏离，常由感知误差、动力学简化和环境变化造成。
- **Risk Accumulation**：每一步看似安全，但长时间组合后形成风险。

*所以这一节是想说：具身安全术语都要放回闭环里理解。*

## 它有什么搞不定的

第一，它是综述和立场，不是统一防御方案。它列出 countermeasures，但没有证明某个组合能覆盖所有场景。

第二，很多引用工作来自快速发展的 2025-2026 前沿，benchmark 和术语还可能变化。

第三，物理安全难以完全形式化。真实环境中的人、物、社会规范和任务上下文很难被静态规则穷尽。

第四，filter impossibility 的讨论提醒我们：只靠外部过滤器可能永远不够，但 intrinsic alignment 和实时可验证智能还没有成熟路线。

*所以这一节是想说：本文把问题讲得很清楚，但防御闭环仍是开放研究。*

## 精读补充：用它做排查时的三段式入口

这篇很适合转成工程排查模板。第一段看 semantic layer：用户意图、系统提示、任务分解和中间计划有没有被改变，是否出现“语言上没违规但动作上有风险”的情况。第二段看 grounding layer：目标物体、视觉区域、空间关系、工具状态和动作参数是否真的对齐，是否被图像、环境文字或物体布局带偏。第三段看 execution layer：控制器是否按计划执行，传感器噪声、接触力、环境变化和延迟是否让轨迹漂移。

这三段和普通 bug 排查也相通。不要一看到事故就说“LLM 幻觉”，也不要一看到碰撞就说“控制器有 bug”。具身系统的坏结论常常来自多层小偏差叠加：上层目标有一点歧义，中层 grounding 有一点偏差，下层执行有一点延迟，最后才形成物理风险。本文的价值就是帮我们把“坏了”拆成可观察的层。

真正落地时，还要把这三段变成日志字段：原始指令、解析后的目标、识别到的对象、选择的动作、执行前安全检查、执行后状态差异。没有这些证据，事故复盘只能停留在猜测。

*所以这一节是想说：安全综述不仅能读，还能变成具身系统的分层诊断入口。*

## 它和别的几篇是什么关系

它和 SafeEmbodAI 关系直接。SafeEmbodAI 是一个具体移动机器人安全框架，本文则把更广泛的具身安全攻击面和根因整理出来。

它和 VLA survey 关系是安全补丁。VLA survey 关注模型、数据和架构，本文提醒 VLA 的 vision-language-action 对齐本身就是攻击面。

它和 `causal-world-models-embodied-ai` 也有关。因果世界模型强调预测行动后果，本文则说明如果行动后果预测失败，会产生 semantic gap、execution drift 和 risk accumulation。

*所以这一节是想说：这篇是给 VLA 和 world model 路线补安全边界。*

## 和本导读的关系

本导读中很多系统默认“模型输出动作就是执行动作”。这篇提醒我们，真正部署时中间至少要有安全层、状态验证、物理约束和不确定性处理。

读完它之后，再看任何 LLM/VLA robot demo，都可以用三行检查：意图有没有被劫持？跨模态 grounding 有没有错？环境闭环有没有因为状态变化而漂移？如果三个问题都没回答，demo 就还不能被视为安全部署系统。

*所以这一节是想说：本文是本导读从能力走向可靠部署的重要安全章节。*

## 思考题

**Q1：为什么“模型拒绝说坏话”不等于“机器人不会做坏事”？**

<details>
<summary>提示</summary>

语言安全和动作安全之间可能错配，安全文本仍可能生成不安全代码或轨迹。
</details>

**Q2：跨模态攻击为什么比纯文本攻击更难防？**

<details>
<summary>提示</summary>

prompt 不再只在文本里，也可能藏在图像、环境标识、物体布局和历史状态中。
</details>

**Q3：同一个“push”动作为什么不能固定判断安全？**

<details>
<summary>提示</summary>

看状态、摩擦、质量、位置、旁边是否有人、物体是否在桌边。
</details>

**Q4：Risk Accumulation 和单步安全有什么区别？**

<details>
<summary>提示</summary>

每一步局部看似安全，但长序列和多层约束组合后可能形成全局危险。
</details>

**Q5：如果只能加一个安全机制，你会加在 prompt、planner、controller 还是 runtime monitor？为什么？**

<details>
<summary>提示</summary>

没有唯一答案。关键是说明它覆盖哪类风险，又漏掉哪类风险。
</details>

## 一些好奇心问答（FAQ）

**Q：这篇是不是说 LLM 不该控制机器人？**  
A：不是。它说 LLM/VLA 进入机器人后需要系统级安全，而不是只靠模型内部拒绝策略。

**Q：传统 CPS 安全是不是过时了？**  
A：也不是。控制稳定、传感器安全、形式化约束仍必要，只是它们不能单独覆盖语义和跨模态风险。

**Q：为什么 filter 不够？**  
A：因为物理风险可能隐藏在看似正常的动作序列中，单个输入或单步输出不一定能暴露风险。

*所以这一节是想说：具身安全需要多层防御，而不是一个万能过滤器。*

## 如果你想再深入

1. 读 ROBOPAIR / POEX，理解可执行 jailbreak。
2. 读 BADROBOT，理解语言安全和行动安全错配。
3. 读 SafeEmbodAI，理解移动机器人如何加入 prompting、state 和 validation。
4. 读 conformal prediction / reachability analysis，理解不确定性和形式化安全如何进入机器人。

## 原文信息

- 论文：What Breaks Embodied AI Security: LLM Vulnerabilities, CPS Flaws, or Something Else?
- 链接：https://arxiv.org/abs/2602.17345
- arXiv：2602.17345
- 版本：v1，2026-02-19

```bibtex
@article{ma2026what,
  title={What Breaks Embodied AI Security: LLM Vulnerabilities, CPS Flaws, or Something Else?},
  author={Ma, Boyang and Guo, Hechuan and Lv, Peizhuo and Xu, Minghui and Dai, Xuelong and Zhang, YeChao and Yang, Yijun and Zhang, Yue},
  journal={arXiv preprint arXiv:2602.17345},
  year={2026}
}
```
