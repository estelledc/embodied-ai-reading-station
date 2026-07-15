---
title: "Learning Diffusion Policy from Primitive Skills for Robot Manipulation"
slug: primitive-skill-diffusion-policy
topic: diffusion-policy
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2601.01948"
venue: arXiv
year: 2026
era: frontier
num: 189
generated_at: 2026-07-15
---

# SDP：在高层语言和低层动作之间加一层可解释 primitive skills

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和公开摘要能支持的结论；本站没有复现 CALVIN、LIBERO 或真实机器人实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

Learning Diffusion Policy from Primitive Skills for Robot Manipulation 提出 Skill-conditioned Diffusion Policy，简称 SDP。它认为很多 diffusion policy 直接从高层语言指令生成短期动作，会出现粒度错位：语言说“把柠檬放进锅里”，但机器人每一刻真正要做的是 move up、move down、open gripper、close gripper 这类短程基础动作。

SDP 抽象出八个 reusable primitive skills，并用 VLM 从视觉观察和语言指令中提取离散表示，再通过 lightweight router 为每个状态选择一个 primitive skill。之后，skill-conditioned diffusion policy 根据选中的 skill 生成 skill-aligned actions。论文报告 SDP 在 CALVIN、LIBERO 和真实机器人任务上超过 SOTA baseline，例如 CALVIN ABC→D 五连任务成功率 76.9%，LIBERO 平均成功率 96.9%。

如果只记一个直觉：SDP 给机器人加了一层“动作短语”。人说的是完整任务，低层 policy 输出的是关节动作，中间用“打开夹爪、向上移动、旋转”这类 primitive skills 对齐。

*所以这一节是想说：SDP 用可解释 primitive skills 缓解语言指令和低层动作之间的粒度错位。*

## 这是个什么场景

机器人操作任务常常是长程组合任务。比如 “Pick up the lemon and put it into the yellow pan” 看起来是一句话，但实际包含接近、下移、张开夹爪、闭合夹爪、抬起、移动、放下等多个短动作。

普通 diffusion policy 可以生成动作序列，但如果它只接收全局高层指令，就要自己隐式学会这些短动作阶段。模型可能知道最终目标，却在某一刻不知道该闭夹爪还是移动，导致 action generation misalignment。

SDP 的场景就是把复杂任务拆成更短、更可解释、更可复用的 primitive skills。它不是让人手写完整任务程序，而是让模型动态选择当前状态该用哪个技能。

```text
高层任务和低层动作之间的粒度差

High-level instruction:
  "Pick up the lemon and put it into the yellow pan"
        │
        ▼
Primitive skill sequence:
  move down -> open gripper -> close gripper -> move up -> translate -> move down
        │
        ▼
Low-level actions:
  continuous robot control signals
```

*所以这一节是想说：长程操作需要中间层，否则语言和动作粒度差太大。*

## 之前的人怎么做的，为什么不够好

原始 diffusion policy 从视觉观察和动作示范中学习动作分布，对单任务或短程控制很强。但在多任务语言条件操作中，模型需要把高层语言直接映射到低层动作，这很难。

一些方法加入语言 encoder，把 instruction embedding 和 noisy action sequence 一起输入 diffusion policy。这样能处理更多任务，但语言 embedding 往往太粗，不一定告诉模型当前时刻应该做哪个短动作。

还有一些 VLA 或 multitask policy 学隐式技能表示。隐式表示可能有效，但很难解释和调试。机器人失败时，我们不知道它是“没理解任务”，还是“选错了当前技能”，还是“低层动作生成错了”。

SDP 的判断是：primitive skills 应该显式出现。它们既能被人理解，又能作为 action generation 的条件，让 diffusion policy 更稳定地产生 skill-consistent behavior。

*所以这一节是想说：旧方法把技能藏在模型里，SDP 想把技能显式拿出来。*

## 这篇论文的新想法

第一，新想法是八个 reusable primitive skills。论文列出 roll、yaw、open the gripper、move up、translate、close the gripper、move down、rotate。这些是跨任务共享的短程 manipulations。

第二，新想法是 lightweight router。模型从视觉观察和高层语言指令中提取 representation，然后 router 选择当前状态最合适的 primitive skill。

第三，新想法是 skill-conditioned diffusion policy。选中的 skill 不只是标签，而是参与 action generation。论文设计 skill-dependent FFN layer，用 skill embedding 动态影响 diffusion policy。

第四，新想法是可解释性。每个状态分配一个 primitive skill，研究者可以检查机器人当前“以为自己在做什么”。这比完全端到端的隐式控制更容易分析。

```text
SDP 框架

Visual observations + language instruction
          │
          ▼
VLM / representation encoder
          │
          ▼
Lightweight router selects primitive skill
          │
          ▼
Skill-conditioned diffusion policy
          │
          ▼
Skill-aligned continuous actions
```

*所以这一节是想说：SDP 把 skill selection 和 diffusion action generation 组合成一个层次化但可训练的系统。*

## 它分几步做的（方法）

### 第 1 步：定义 primitive skill set

输入是多种 robot manipulation tasks。作者观察这些任务可以拆成基础短动作，于是定义八个 primitive skills：roll、yaw、open the gripper、close the gripper、move up、move down、translate、rotate。

处理过程是把高层任务的连续控制过程看成 primitive skill 序列。输出是一个共享 skill set。这个 set 不绑定某个具体任务，而是跨任务复用。

这一步的价值是提供中间语言。人能理解这些 skill，模型也可以用它们作为条件，降低直接从 task instruction 到 action 的难度。

### 第 2 步：用 compositional prompt ensemble 构造 skill embeddings

论文使用统一模板，例如 “the robot arm is going to {skill}”。每个 primitive skill 都放进这个模板，经过 CLIP text encoder 和 MLP，得到 skill prompt embeddings。

输入是八个 skill 文本。处理是 text encoding 和 MLP projection。输出是八个 skill embeddings，供 router 和 diffusion policy 使用。

这一步让 skill 不只是字符串，而是进入模型计算图的向量表示。

### 第 3 步：从视觉和语言中提取状态表示

输入包括 static camera、wrist camera 等视觉观察，以及高层语言指令。模型使用 vision-language model 提取 discrete representations 或 multimodal representations。

处理过程是编码视觉和语言上下文，得到当前状态的综合表示。输出是 router 可以判断的 state representation。

这一步解决“当前该做什么”的信息来源。仅看语言不够，因为同一句任务在不同阶段要做不同 skill；仅看图像也不够，因为不知道目标。

### 第 4 步：router 为每个状态选择 primitive skill

Lightweight router network 输入 state representation，输出八个 primitive skills 的 importance scores。最终通过 top-1 selection 选择当前状态的 desired primitive skill。

处理过程是动态 skill assignment。输出是一个具体 skill，比如 close gripper 或 move up。

这一步是 SDP 的决策中间层。它把长程任务拆成一连串状态相关的 skill choices。

### 第 5 步：skill-dependent FFN 影响 diffusion policy

选中的 skill embedding 会进入 diffusion policy。论文引入 skill-dependent feed-forward network layer，类似 LoRA-like 动态参数化，让 diffusion policy 根据 skill 调整动作生成。

输入是 noisy actions、observation features、skill embedding。处理是 diffusion denoising，同时用 skill-conditioned layer 调整中间表示。输出是 continuous actions。

这一步让 skill 真正影响低层动作，而不只是附在输入里的标签。比如 open gripper 和 move down 对同一视觉状态应该产生完全不同动作。

### 第 6 步：在 CALVIN、LIBERO 和真实机器人上评估

CALVIN 测长程语言条件操作，尤其 ABC→D zero-shot generalization。LIBERO 包含 Spatial、Object、Goal、Long 四类 task suites。真实机器人实验则检验 sim-to-real 和视觉干扰下的表现。

论文报告 SDP 在 CALVIN ABC→D 五连任务成功率 76.9%，超过 MoDE 14.5%、UniVLA 20.4%；LIBERO 平均成功率 96.9%，超过 MDT 13.4%、UniVLA 4.4%，且是唯一在 LIBERO-Long 超过 90% 的方法。

这些结果说明 primitive skill 作为中间层能提升长程组合和多任务泛化，但所有数字仍是论文报告。

*所以这一节是想说：SDP 的方法是“选当前 primitive skill，再让 diffusion policy 按 skill 生成动作”。*

## 关键数字

| 数字 | 原文语境 | 这说明什么 |
|---:|---|---|
| 8 | reusable primitive skills | 技能中间层规模 |
| 4 | SDP 生成动作使用的 denoising steps | 少于一些 diffusion baseline 的 10 steps |
| 76.9% | CALVIN ABC→D 五连任务成功率 | 论文报告 zero-shot generalization 强 |
| 14.5% | 相比 MoDE 的提升 | CALVIN ABC→D 设置 |
| 20.4% | 相比 UniVLA 的提升 | CALVIN ABC→D 设置 |
| 96.9% | LIBERO 四套件平均成功率 | 论文报告多任务表现 |
| 13.4% | 相比 MDT 的 LIBERO 平均提升 | baseline 对比 |
| 4.4% | 相比 UniVLA 的 LIBERO 平均提升 | baseline 对比 |

这些数字全部是论文报告，不是本站复现实验。后续人工核验应回到 Table 1、Table 2 和真实机器人图表逐项确认。

*所以这一节是想说：SDP 的证据集中在 CALVIN/LIBERO 长程和多任务成功率。*

## 实验结果说明了什么

实验说明 primitive skills 对长程任务有帮助。CALVIN 要连续完成多个 instruction，如果每一步都从高层语言直接生成动作，模型容易漂移；SDP 用 skill sequence 给动作生成提供更细粒度约束。

LIBERO 结果说明，skill-conditioned policy 不只适合一个 benchmark。Spatial、Object、Goal、Long 四类任务对空间关系、对象变化、目标变化和长程组合都有要求，SDP 的平均成功率高说明中间 skill 有泛化价值。

Ablation 结果也重要。论文报告 skill-dependent FFN、explicit skill abstraction、compositional prompt ensemble 都有贡献。也就是说，不只是“随便加个 skill label”就有效，skill 如何进入 diffusion policy 很关键。

真实机器人实验说明，primitive skill abstraction 对部署有实际意义。可解释技能使得人可以更容易观察机器人当前阶段是否合理。

更重要的是，SDP 把失败原因变得更可定位。端到端 policy 失败时，我们只知道动作错了，却很难知道模型内部阶段是否正确。引入 primitive skill 后，可以先看 router 是否选错技能，再看 diffusion policy 是否在正确技能下生成了错误轨迹。前者是阶段理解问题，后者是低层控制问题。

这种可分解性对长程任务尤其有价值。比如同样是“把物体放进容器”，失败可能发生在接近、抓取、抬起、移动、释放任一阶段。Primitive skill 序列能作为一种轻量任务进度条，让研究者更容易发现任务在哪个阶段偏离，也更容易针对性收集数据或调模型。

*所以这一节是想说：实验支持“技能中间层”能缓解语言到动作的粒度错位。*

## 术语表

- Primitive skill：短程、细粒度、可复用的基础操作，如 move up、close gripper。
- Skill-conditioned diffusion policy：以 skill 作为条件生成动作的 diffusion policy。
- Router network：根据当前视觉和语言状态选择 skill 的轻量网络。
- Skill-dependent FFN：根据 skill embedding 动态影响 diffusion policy 的前馈层。
- CALVIN：长程语言条件机器人操作 benchmark。
- LIBERO：测试知识迁移和多任务机器人操作的 benchmark。
- LoRA-like：类似低秩适配的参数调制思想。

*所以这一节是想说：SDP 的关键词是 primitive skill、router 和 skill-conditioned denoising。*

## 局限和边界

第一，八个 primitive skills 是否足够覆盖所有真实任务仍不确定。复杂接触、双臂协作、工具使用可能需要更丰富 skill set。

第二，router 选错 skill 会直接影响动作生成。如果当前应该 close gripper，却选成 translate，policy 会产生错动作。

第三，primitive skill 的可解释性不等于安全性。人能看懂 skill，不代表动作一定安全。

第四，CALVIN/LIBERO 是重要 benchmark，但真实环境中物体、光照、传感器和动力学差异更大。

第五，SDP 仍依赖示范数据和 diffusion policy 能力。没有足够数据的技能，不能靠 skill 名字凭空学会。

第六，skill assignment 也可能受视觉遮挡影响。如果关键物体被挡住，router 可能无法判断当前阶段，低层 policy 即使能力足够也会接到错误条件。

因此真实系统通常还需要失败检测、重新观察和人工接管，而不是只依赖一次 skill 选择。

*所以这一节是想说：SDP 给了更好的中间层，但 skill set、router 和真实部署仍要验证。*

## 和其他论文的关系

和 `disco-diffusion-policy` 相比，SDP 用 primitive skills 作为中间层，DISCO 用 VLM-generated keyframes 作为中间层。

和 `time-unified-diffusion-policy` 相比，SDP 关注 task/action granularity，TUDP 关注 denoising efficiency。

和 `trace-focused-diffusion-policy` 相比，SDP 用当前 skill disambiguate action，TF-DP 用历史 trace disambiguate long-horizon stage。

和原始 `diffusion-policy` 相比，SDP 把高层 instruction 到动作的映射拆成更可解释的 skill-conditioned generation。

*所以这一节是想说：SDP 是 Batch 7 里“技能层次化 diffusion policy”的代表。*

## 和本导读的关系

本站学习 diffusion policy 时，容易把 policy 看成一个黑盒：输入图像和语言，输出动作。SDP 提醒我们，中间表示很重要。可解释 primitive skills 能降低黑盒程度，也能帮助 debugging。

它适合和 imitation learning、VLA、skill learning、hierarchical policy 一起读。读者可以思考：未来通用机器人是不是需要一套可学习、可组合、可解释的 skill vocabulary？

*所以这一节是想说：SDP 让 diffusion policy 更接近可解释的长程操作系统。*

## 思考题

1. 为什么高层语言指令直接生成短期动作容易粒度错位？
2. 八个 primitive skills 为什么能跨任务复用？
3. Router network 需要同时看视觉和语言，原因是什么？
4. Skill-dependent FFN 比简单拼接 skill embedding 可能强在哪里？
5. 如果一个任务需要“擦拭”或“扭瓶盖”，现有 skill set 是否足够？

## FAQ

**Q：SDP 是不是手写规则系统？**
A：不是。Primitive skills 是显式中间层，但 router 和 skill-conditioned diffusion policy 都是学习得到的。

**Q：八个 skill 是机器人最终动作吗？**
A：不是。它们是短程语义动作类别，最终仍由 diffusion policy 生成连续控制信号。

**Q：96.9% 是本站复现的吗？**
A：不是。它是论文在 LIBERO 上报告的平均成功率。

**Q：可解释 skill 是否保证机器人安全？**
A：不保证。它只提高可观察性和结构性，安全仍需要约束、监控和验证。

## 进一步读什么

- `diffusion-policy`：理解动作扩散基础。
- CALVIN / LIBERO：理解长程语言条件操作 benchmark。
- MoDE / MDT：理解 diffusion policy 的多任务和 transformer baseline。
- `trace-focused-diffusion-policy`：比较 skill condition 和 trace condition。

## 精读补充：primitive skill 为什么既是能力层，也是调试层

SDP 的 primitive skill 不只是为了提高成功率，也是在给机器人行为加一个可检查的中间状态。端到端 policy 失败时，我们通常只能看到动作错了，却不知道模型内部为什么错。引入 skill 后，失败可以拆成两类：router 是否选错 skill，或者 diffusion policy 是否在正确 skill 下生成了错误动作。

这种可分解性对长程任务很重要。比如机器人把柠檬放进锅里失败，可能是“应该 close gripper 时还在 translate”，也可能是“close gripper 已经选对，但夹爪轨迹太偏”。前者是阶段理解问题，后者是低层控制问题。Primitive skill 让这两个问题更容易分开诊断。

不过，primitive skill 也会带来抽象边界。八个技能听起来通用，但真实世界的动作远比八类丰富。擦拭、插入、旋拧、拉链、柔性物体操作都可能需要更细或不同的 skill vocabulary。如果 skill set 太粗，router 即使选对也无法给 policy 足够指导；如果 skill set 太细，router 学习会变难。

因此，SDP 的更大启发不是“八个技能就是最终答案”，而是“语言到动作之间应该有可学习、可解释、可组合的中间层”。未来系统可能自动发现 skill，也可能允许人类定义一部分技能，再让模型学习组合。

*所以这一节是想说：primitive skills 同时提升动作条件、长程分解和失败可诊断性。*

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：八个 primitive skills 的原文名称；CPE 模板；router top-1 selection；skill-dependent FFN 设计；CALVIN ABC→D 76.9%、MoDE +14.5%、UniVLA +20.4%；LIBERO 96.9%、MDT +13.4%、UniVLA +4.4%；真实机器人任务设置。

## 原文信息

- arXiv: [2601.01948](https://arxiv.org/abs/2601.01948)
- PDF: [https://arxiv.org/pdf/2601.01948](https://arxiv.org/pdf/2601.01948)

```bibtex
@article{gu2026primitiveskills,
  title = {Learning Diffusion Policy from Primitive Skills for Robot Manipulation},
  author = {Gu, Zhihao and Yang, Ming and Zou, Difan and Xu, Dong},
  journal = {arXiv preprint arXiv:2601.01948},
  year = {2026}
}
```
