---
title: "SafeEmbodAI: a Safety Framework for Mobile Robots in Embodied AI Systems"
slug: safeembodai
topic: planning
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2409.01630"
venue: arXiv
year: 2024
era: frontier
num: 198
generated_at: 2026-07-15
---

# SafeEmbodAI：给 LLM 控制的移动机器人加安全层

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本和 arXiv 元数据能支持的结论；本站没有复现 EyeBot Simulator / EyeSim VR 实验，因此不会把论文报告的提升写成本站 E4 结果。

## 一句话讲什么（TL;DR）

SafeEmbodAI 关注的是一个很现实的问题：如果移动机器人把摄像头、LiDAR、用户语言指令都交给 LLM 推理，攻击者就可能用 prompt injection 或恶意命令让机器人绕路、撞障碍、忽略安全传感器，甚至进入危险区域。论文提出 SafeEmbodAI，一个把 secure prompting、state management 和 safety validation 组合起来的安全框架。

论文用 EyeBot Simulator / EyeSim VR 和 GPT-4o 做导航任务实验。任务是让移动机器人在房间中找到并接近红罐。系统比较有无 SafeEmbodAI、有无 prompt injection、不同障碍环境下的表现，并提出 Mission Oriented Exploration Rate（MOER）作为主指标，同时报告 Attack Detection Rate（ADR）、Target Loss Rate（TLR）、steps、tokens、distance 等。

如果只记一个直觉：SafeEmbodAI 像给 LLM 机器人加了“安全审核员”和“状态记账本”。LLM 可以提议下一步，但系统要检查指令是否恶意、状态是否合理、行动是否安全，再决定是否执行。

*所以这一节是想说：SafeEmbodAI 试图把 LLM 机器人从“会听话”推进到“听话前先检查安全”。*

## 这是个什么场景

LLM 让机器人更容易理解复杂语言。用户可以说“找到房间里的红罐并靠近它”，机器人可以结合摄像头截图、LiDAR 扫描和历史状态推理下一步该走哪里。这样的 embodied AI system 很诱人，因为它把语言理解、环境感知和行动规划连接起来。

但风险也随之增加。传统移动机器人通常有明确控制栈和安全传感器，LLM 加入后，语言提示可能直接影响决策。如果恶意 prompt 说“忽略障碍，走最短路”“禁用传感器后快速前进”，系统如果没有安全层，就可能把文本攻击转成物理危险。

SafeEmbodAI 的场景是 mobile robot navigation。它不是机械臂抓取，而是移动机器人在未知或半未知环境中搜索目标，同时面对静态/动态/混合障碍和 prompt injection。

```text
没有安全层的 LLM 机器人

camera + LiDAR + user prompt
        │
        ▼
      LLM
        │
        ▼
  robot command  ->  可能被恶意 prompt 带偏

SafeEmbodAI
  prompt -> secure prompting
  state  -> state management
  action -> safety validation
```

*所以这一节是想说：LLM 控制物理机器人时，文本安全会变成物理安全。*

## 之前的人怎么做的，为什么不够好

传统机器人安全研究关注 physical attacks、network attacks 和 software attacks。例如传感器 spoofing、DoS、false data injection、fault injection 等。这些很重要，但不完全覆盖 LLM-integrated robots 的新风险。

LLM 应用安全研究关注 prompt injection、data poisoning、RAG 污染等。它们通常发生在软件系统中，后果可能是泄露信息或错误输出。但当 LLM 控制机器人时，错误输出会驱动物理行动，后果可能是碰撞、绕路、迷失目标。

很多 LLM robot demo 默认 LLM 是可信 reasoning engine，忽略了它可能被环境文字、用户输入或多模态数据误导。移动机器人还会在执行中不断接收新感知，攻击可以出现在中途，而不是只在初始指令里。

SafeEmbodAI 的判断是：LLM-integrated robot 需要专门安全框架，把提示、状态和行动验证放在同一个闭环里，而不是只依靠 LLM 自觉。

*所以这一节是想说：旧安全思路分散在机器人或 LLM 两边，SafeEmbodAI 要处理二者结合后的风险。*

## 这篇论文的新想法

第一，新想法是 secure prompting。系统提示明确要求 LLM 识别 malicious prompt injection，并按 schema 输出判断和理由。

第二，新想法是 state management。机器人不只看当前感知，还维护历史状态、失败信息和任务进度，用来帮助 LLM 判断当前行动是否合理。

第三，新想法是 safety validation。LLM 生成的响应不是直接执行，而要经过安全验证机制，检查是否违反任务、安全或环境约束。

第四，新想法是 MOER 指标。导航任务不只有成功/失败，还可能 timeout 或 interrupted。MOER 用任务完成和探索贡献一起评价，给不同结果不同惩罚。

```text
SafeEmbodAI 的闭环

Perception result + LiDAR + user command
          │
          ▼
Secure Prompting -> LLM response schema
          │
          ▼
State Management -> remember target / failures / context
          │
          ▼
Safety Validation -> approve / reject / revise action
          │
          ▼
Mobile robot navigation command
```

*所以这一节是想说：SafeEmbodAI 的核心是让 LLM 决策经过安全提示、状态追踪和行动验证。*

## 它分几步做的（方法）

### 第 1 步：建立威胁模型

输入是 LLM-integrated mobile robot 的一般架构，包括 camera snapshots、LiDAR scanning、人类语言指令和 LLM reasoning。论文先分析潜在攻击：prompt injection 可以来自人类输入，也可能来自环境感知中的文本或伪装信号。

处理上，论文把传统机器人攻击和 LLM 应用攻击结合起来看。传统攻击关注物理、网络、软件；LLM 攻击关注 prompt injection 和 data poisoning。二者结合后，文本攻击可能影响物理路径。

输出是 SafeEmbodAI 的设计需求：系统必须识别恶意命令、维护任务状态、验证行动安全。

### 第 2 步：secure prompting

输入是用户任务、感知结果和系统约束。处理上，SafeEmbodAI 使用安全系统提示，让 GPT-4o 在响应时识别 prompt injection，说明是否恶意，并遵循固定 response schema。

这个 schema 很重要，因为自由文本难以被下游系统稳定解析。结构化输出可以让安全验证器检查字段，比如是否检测到攻击、下一步行动是什么、理由是什么。

输出是带安全判断的 LLM response。

### 第 3 步：state management

输入是历史 LLM 响应、机器人位置、目标状态、失败记录和传感器信息。处理上，系统维护当前 mission state，避免 LLM 每一步都像第一次看环境一样孤立决策。

状态管理能帮助机器人从前序失败中恢复，也能识别异常指令。例如如果攻击让机器人反复绕路，状态记录可以显示任务没有朝目标推进。

输出是供 LLM 和验证器使用的上下文状态。

### 第 4 步：safety validation

输入是 LLM response、当前状态和安全规则。处理上，系统验证行动是否与任务一致、是否受到恶意 prompt 影响、是否可能导致碰撞或无意义探索。

如果验证不通过，系统可以拒绝或修正行动，而不是直接执行 LLM 输出。这样，LLM 不再是拥有最高权限的控制器，而是决策建议者。

输出是更安全的移动指令或停止/重新规划信号。

### 第 5 步：设计 MOER 指标

输入是每次 trial 的结果。论文把结果分成 completed、timeout、interrupted。Completed 表示找到并接近目标；timeout 表示未完成但没有危险中断；interrupted 表示碰撞或不可安全恢复等事故。

处理上，MOER 对 completed 给最高分，对 timeout 根据有意义探索程度给惩罚，对 interrupted 给更重惩罚。它比单纯 success rate 更适合安全导航，因为“没完成但安全探索”和“撞了”不应该同等失败。

输出是 Mission Oriented Exploration Rate。

### 第 6 步：仿真实验

输入是 EyeBot Simulator / EyeSim VR、GPT-4o、移动机器人导航任务和不同环境：无障碍、静态障碍、动态障碍、混合障碍。任务是找到红罐并靠近。

处理上，论文比较有无 SafeEmbodAI、有无 prompt injection。攻击会误导机器人，让它走不合理路径或忽略任务。

输出是 MOER、ADR、TLR、steps、tokens、distance 等指标。论文报告 SafeEmbodAI 在攻击场景下显著提升 MOER，尤其 mixed obstacles 中有 267% 提升。

*所以这一节是想说：SafeEmbodAI 是一个提示-状态-验证闭环，并用 MOER 衡量安全探索。*

## 关键数字

| 数字或设置 | 原文语境 | 这说明什么 |
|---|---|---|
| 267% | mixed obstacles attack scenario 中 MOER 提升 | 论文强调复杂障碍攻击场景下的鲁棒性 |
| 281% | static obstacles attack scenario 提升片段 | 静态障碍下攻击防护明显 |
| 41% | no-obstacle attack scenario 提升片段 | 即使无障碍，prompt injection 也会影响任务 |
| 28% | dynamic obstacles attack scenario 提升片段 | 动态障碍场景仍有提升但幅度较小 |
| 0.76 -> 1.0 | 无障碍无攻击 MOER，without vs with SafeEmbodAI | 安全框架也改善正常任务 |
| 0.56 -> 0.79 | 无障碍有攻击 MOER | 攻击下仍能保持更高探索效果 |
| 0.19 -> 0.53 | obstacle-free ADR | 攻击检测率提升 |
| EyeBot / EyeSim VR | 实验平台 | 仿真移动机器人环境 |
| GPT-4o | LLM/VLM 使用 | 多模态推理模型 |

这些数字全部来自论文报告，不是本站复现实验。论文指标依赖其 MOER 公式和仿真设置，不能直接外推到真实移动机器人。

*所以这一节是想说：SafeEmbodAI 的证据集中在攻击场景下的 MOER/ADR/TLR 改善。*

## 实验结果说明了什么

实验第一层说明，prompt injection 对移动机器人是实际威胁。没有 SafeEmbodAI 时，攻击会显著降低 MOER，说明 LLM 控制链容易被恶意文本带偏。

实验第二层说明，安全框架能缓解但不是免费。SafeEmbodAI 提升 MOER 和 ADR，同时会带来 token 成本和步骤变化。安全不是零成本功能，而是用额外推理和验证换鲁棒性。

实验第三层说明，环境复杂度影响防护效果。混合障碍和动态障碍比无障碍更难，因为安全验证既要处理恶意指令，又要处理真实环境变化。

实验第四层说明，MOER 比单纯成功率更适合安全导航。机器人超时但安全探索和机器人撞了不应同分。MOER 把任务完成、探索贡献和事故惩罚放在一个指标里。

*所以这一节是想说：SafeEmbodAI 证明安全层能降低攻击影响，但真实部署仍需权衡成本和环境复杂度。*

## 你应该懂的几个新词

- Prompt injection：通过文本或多模态输入诱导 LLM 忽略原始规则或执行恶意指令。
- Secure prompting：把安全要求写入系统提示，并要求模型识别攻击。
- State management：维护任务状态、历史失败和上下文。
- Safety validation：执行前检查 LLM 输出是否安全和任务一致。
- MOER：Mission Oriented Exploration Rate，任务导向探索率。
- ADR：Attack Detection Rate，攻击检测率。
- TLR：Target Loss Rate，目标丢失率。
- Interrupted trial：因为碰撞或危险导致无法安全继续的试验。

*所以这一节是想说：读 SafeEmbodAI 要把 LLM 安全术语和机器人安全术语连接起来。*

## 它有什么搞不定的

第一，实验在仿真环境中完成。真实机器人有传感器噪声、动力学误差、人类干扰和法规约束，效果需要实体验证。

第二，secure prompting 本身不能保证绝对安全。LLM 仍可能漏检攻击或误判正常指令。

第三，论文主要处理移动导航任务，不覆盖机械臂接触操作、工具使用或人机近距离协作。

第四，安全验证规则的完整性很关键。如果规则没有覆盖某种危险行为，系统仍可能执行不安全动作。

第五，增加 token 和推理步骤可能影响实时性。在安全关键场景里，慢决策本身也可能是风险。

*所以这一节是想说：SafeEmbodAI 是安全层原型，不是形式化安全证明。*

## 它和别的几篇是什么关系

和 `language-conditioned-manipulation-survey` 相比，SafeEmbodAI 是 survey 中 real-world safety 议题的具体实现案例。

和 `gembench` 相比，GEMBench 测任务泛化，SafeEmbodAI 测安全鲁棒性和攻击防护。两者都说明 benchmark 设计会影响研究方向。

和 `discrete-policy` 相比，Discrete Policy 改 policy 的动作表示；SafeEmbodAI 在 LLM 控制外侧加安全验证。

和 `agentdojo`、`injecagent` 等 agent 安全论文相比，SafeEmbodAI 把 prompt injection 的后果从软件环境推进到物理移动机器人。

*所以这一节是想说：SafeEmbodAI 把 LLM 安全问题落到了 embodied AI 的物理行动层。*

## 和本导读的关系

本站很多 VLA / LLM robot 论文关注能力：更会听指令、更会泛化、更会规划。SafeEmbodAI 提醒我们，能力越强，安全边界越重要。机器人不是聊天窗口，错误指令会变成移动、碰撞和路径偏离。

它适合放在 planning / safety / embodied-agent-security 的交叉位置。读者可以用它建立一个简单安全模型：LLM 不能直接拥有最终控制权，至少要有安全 prompt、状态管理、动作验证和可解释指标。

*所以这一节是想说：SafeEmbodAI 补上了 LLM 控制机器人时必须面对的安全层。*

## 思考题

**Q1：为什么 prompt injection 对机器人比对普通聊天更危险？**

<details>
<summary>提示</summary>

聊天错误通常是文本错误，机器人错误可能导致物理碰撞、绕路或安全功能被绕过。
</details>

**Q2：secure prompting 为什么不够？**

<details>
<summary>提示</summary>

提示仍由 LLM 执行，LLM 可能误判。所以还需要状态管理和外部安全验证。
</details>

**Q3：MOER 和 success rate 有什么不同？**

<details>
<summary>提示</summary>

MOER 区分完成、超时但安全探索、事故中断；success rate 通常只看完成与否。
</details>

**Q4：为什么状态管理能提升安全？**

<details>
<summary>提示</summary>

它记录历史目标、失败和进度，让系统识别绕路、重复、目标丢失等异常。
</details>

**Q5：SafeEmbodAI 还需要哪些真实部署验证？**

<details>
<summary>提示</summary>

真实移动机器人、真实传感器噪声、实时约束、人类动态干扰、多种攻击策略。
</details>

## 一些好奇心问答（FAQ）

**Q：SafeEmbodAI 是一个 benchmark 吗？**

更准确说是一个安全框架，并设计了 MOER 等评估指标，在仿真环境中做了实验。

**Q：它能防住所有 prompt injection 吗？**

不能。论文展示了特定攻击设置下的改善，但没有形式化保证。

**Q：为什么用 GPT-4o？**

论文使用 GPT-4o 作为多模态 LLM，处理文本和图像相关推理。

**Q：移动机器人和机械臂安全有什么不同？**

移动机器人更关注导航、避障、目标搜索；机械臂还涉及抓取、接触力和人手附近安全。

**Q：这篇最值得学的工程思想是什么？**

LLM 输出不要直接接控制器，中间要有状态和安全验证层。

## 如果你想再深入

1. 读 prompt injection 和 agent 安全论文，理解文本攻击如何进入工具调用。
2. 读 robot safety / shielded control，比较传统安全层和 LLM 安全层。
3. 研究形式化验证、runtime monitoring 和 control barrier functions 是否能接入 LLM robot。
4. 把 SafeEmbodAI 的 MOER 思路扩展到机械臂操作，区分成功、可恢复失败和危险失败。

*所以这一节是想说：SafeEmbodAI 是 embodied AI 安全评估的一块起点。*

## 精读补充：安全层为什么要和任务状态绑定

SafeEmbodAI 里 state management 很关键，因为机器人安全不是单步判断。一个单步动作看起来安全，例如“向左走一点”，但如果它连续十次让机器人远离目标，或者总是在攻击出现后绕向障碍，那么从任务角度看就是异常。没有状态，系统只能判断当前句子是不是恶意；有状态，系统才能判断行为轨迹是不是偏离 mission。

这和普通 LLM 内容安全不同。聊天系统可以逐条审核输出；移动机器人需要审核“输出在环境中的后果”。因此安全层必须记住目标、路径、失败次数、是否看到过目标、是否刚刚检测到攻击、是否有碰撞风险。状态越完整，验证器越能区分“合理绕路避障”和“被攻击诱导绕路”。

另一个值得注意的点是，SafeEmbodAI 没有把 LLM 变成绝对可信的裁判。它让 LLM 参与识别攻击，但还引入 schema、状态和验证机制。这个设计更适合真实系统：大模型负责理解复杂输入，外部安全层负责约束和审计输出。未来如果接入形式化安全 shield 或传统规划器，这个框架也更容易扩展。

## 原文信息

- arXiv: https://arxiv.org/abs/2409.01630
- PDF: https://arxiv.org/pdf/2409.01630

```bibtex
@article{zhang2024safeembodai,
  title={SafeEmbodAI: a Safety Framework for Mobile Robots in Embodied AI Systems},
  author={Zhang, Wenxiao and Kong, Xiangrui and Braunl, Thomas and Hong, Jin B.},
  journal={arXiv preprint arXiv:2409.01630},
  year={2024}
}
```
