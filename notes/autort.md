---
title: "AutoRT: Embodied Foundation Models for Large Scale Orchestration of Robotic Agents"
slug: autort
topic: dataset-eval
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2401.12963"
venue: arXiv
year: 2024
era: frontier
num: 161
generated_at: 2026-07-14
---

# AutoRT：让大模型指挥一队机器人去真实世界采数据

> 本文只整理 AutoRT 论文公开信息。论文里的“机器人部署”指 Google 团队真实机器人数据采集系统；本站没有本地或真机复现实验。

## 一句话讲什么（TL;DR）

AutoRT 不是一个单独的机器人策略，而是一套用 VLM/LLM 编排真实机器人采集数据的系统。VLM 描述场景，LLM 生成任务并做安全/可行性过滤，机器人再通过脚本策略、已有策略或遥操作执行。论文报告 AutoRT 在 4 栋楼、7 个月、20+ 台机器人上收集了 77k 真实机器人 episodes，并用 robot constitution 提升任务安全性。

*所以这一节是想说：AutoRT 的贡献是“规模化真实世界数据采集闭环”，不是单个控制模型刷榜。*

## 这是个什么场景

训练机器人最大的问题之一是缺真实数据。互联网图文模型能爬网页，语音模型能吃海量音频，机器人却不能轻易“爬现实世界”。每条轨迹都要机器人真的走过去、看见东西、执行动作，期间还要保证别撞人、别碰危险物、别把办公室弄乱。

传统采集方式很像人工摄影棚：研究员准备好桌面，写好任务，遥操作机械臂演示。数据质量高，但场景窄、速度慢、扩展难。AutoRT 想把采集变成“机器人外勤队”：一队移动机械臂在办公室、厨房、休息区等真实环境中，由大模型提出可执行任务，人类监督兜底。

这里的关键不是让机器人完全自治，而是让它们在安全边界内多看、多试、多采集。哪怕部分动作由人遥操作，只要任务生成、场景理解、采样调度和安全过滤能自动化，数据规模就能上去。

*所以这一节是想说：AutoRT 把具身 AI 的问题从“训练一个策略”往前推到了“怎么大规模获得真实世界经验”。*

## 之前的人怎么做的，为什么不够好

RT-1 / RT-2 这类工作依赖大量真实机器人数据，但这些数据多来自固定任务和受控环境。这样训练出的策略可以很强，但数据分布容易窄：物体摆放、桌面高度、背景、任务语言都可能偏固定。

模板式任务生成也不够好。比如随机组合动词和物体，会出现“open keyboard”这类不合理任务。任务多样性看似增加，真正可执行的数据反而不多。

完全人工遥操作可以保证可行，但人力成本高。人类还容易重复熟悉任务，导致数据多样性不足。

AutoRT 的思路是把 foundation models 用在数据采集前端：VLM 负责看场景里有什么，LLM 负责提出合理任务并过滤风险，机器人策略负责执行，人类监督负责最后兜底。

*所以这一节是想说：AutoRT 解决的是真实数据采集的效率、多样性和安全约束三角。*

## 这篇论文的新想法

AutoRT 的新想法是：**用大模型当机器人数据采集的调度员，而不是只当机器人控制器。**

它让 VLM 先描述当前场景和物体，LLM 根据场景生成任务，再用 affordance filtering 判断任务是否安全可行。任务通过后，机器人用已有 policy graph 执行：可能是脚本 picking policy，也可能是 RT-2 类策略，也可能由人类 teleop。

最特别的是 robot constitution。它不是法律意义的宪法，而是一组写进 prompt 的规则：机器人不能做哪些事，哪些物体危险，机器人能力边界是什么。LLM 在生成和过滤任务时都要参考这些规则。

```text
真实场景
  │
  ▼
VLM 描述物体和环境
  │
  ▼
LLM 生成候选任务
  │
  ▼
Robot constitution + affordance filtering
  │
  ├─ 拒绝：危险 / 不可行 / 不相关
  └─ 接受
       ▼
机器人策略或遥操作执行
       ▼
保存真实 episode
```

*所以这一节是想说：AutoRT 把 LLM/VLM 放在“采什么数据、能不能采”的决策层。*

## 它分几步做的（方法）

### 第 1 步：机器人进入真实环境并看场景

机器人在办公室、厨房、休息区等自然环境或人工布置环境中移动。它不知道物体位置，需要通过视觉模型识别附近物体和场景。论文提到可使用不同 VLM，如 PaLI 和 FlexCap；FlexCap 的描述更详细，尤其是颜色信息。

### 第 2 步：LLM 根据场景生成任务

LLM 不只是填模板，而是根据 VLM 描述和高层 guidance 生成任务。例如清洁、整理、拿取等。论文把 guided AutoRT、unguided AutoRT 和模板语言进行比较，发现 LLM 生成任务比模板更可行，guidance 能提高相关性。

### 第 3 步：用 affordance 和 constitution 过滤

任务生成后，系统要判断任务是否安全、可行、符合机器人能力。Robot constitution 包含 foundational rules、safety rules、embodiment rules、guidance rules。论文在对抗场景里测试 constitution，显示在生成和过滤两侧都加入规则时，安全任务比例和拒绝危险任务的 recall 更好。

### 第 4 步：用 policy graph 执行

AutoRT 的执行系统用 policy graph 表示。每个节点是一个 subpolicy，可以是移动、抓取、调用 LLM、等待、人类遥操作等。节点之间通过 transition condition 切换。这样系统既能执行动作，也能插入语言模型查询和人工干预。

### 第 5 步：记录 episode 并分析多样性

AutoRT 用视觉 encoder 嵌入 episode，然后用 k-means 距离衡量视觉多样性。论文显示 AutoRT 数据比 RT-1 基线更分散，teleop 数据尤其多样。它还尝试让机器人把 diversity score 说出来，帮助监督者调整环境。

```text
AutoRT 的数据闭环

场景探索 ─► 任务生成 ─► 安全过滤 ─► 执行/遥操作 ─► episode 入库
   ▲                                                     │
   └────────────── 多样性反馈 / 人类监督 / 策略改进 ◄─────┘
```

*所以这一节是想说：AutoRT 的方法不只是“LLM 生成任务”，而是一整套采集、过滤、执行、度量和反馈系统。*

## 关键数字（What works）

| 现象 | 论文报告的数字 | 怎么理解 |
|---|---:|---|
| 部署时间 | 7 个月 | 长周期真实环境采集 |
| 部署规模 | 4 栋楼、20+ 台机器人 | 多地点、多机器人 fleet |
| 采集数据 | 77k real-world episodes | 真实世界机器人数据规模化 |
| 任务可接受基线 | 228/259 = 88% | 原始候选中多数可接受 |
| affordance filtering 后 | 200/214 = 93% acceptable | 过滤提高安全/可行比例 |
| 不合适任务拒绝 | 17/31 = 55% recall | 仍会漏掉危险/不可行任务 |
| 任务可行性 | AutoRT 比模板约 1.5x 更可能可执行 | LLM 常识优于动词+物体模板 |
| RT-1 co-finetune | picking 0%→16.7%，wiping 10%→30% | 数据能带来 modest policy gain |

这些数字说明 AutoRT 确实扩大了真实数据采集，但也提醒我们：LLM 安全过滤不是完美的，仍需要人类监督和物理急停。

*所以这一节是想说：AutoRT 的成功指标是数据规模、多样性和可用性，不是单一任务成功率。*

## 实验结果说明了什么

第一，LLM 生成任务比模板更合理。模板只会机械组合词，LLM 能利用常识避免荒谬任务，也能按 guidance 偏向清洁、园艺等需求。

第二，constitution 有用但不是安全保证。加入规则能提升安全任务比例和危险任务拒绝率，但仍有 unsafe task 通过过滤。论文明确指出这要求人类监督。

第三，AutoRT 数据更丰富但也更难学。数据越多样，每个具体任务的样本可能越少，训练策略时反而更难。论文的 RT-1 co-finetune 带来提升，但提升不是惊人级别。

第四，数据采集和策略训练不能长期分离。论文 limitation 说，AutoRT 假设数据采集和 control policy 相对分离，但最好的系统可能需要二者共同演化：模型弱在哪，就主动采哪类数据。

*所以这一节是想说：AutoRT 是数据飞轮的雏形，但还没完全闭合成自动自我改进系统。*

## 你应该懂的几个新词

- **Robot constitution**：机器人宪法。一组写入 prompt 和过滤逻辑的安全、能力、任务规则。
- **Affordance filtering**：可供性过滤。判断机器人是否能安全合理地执行某任务。
- **Policy graph**：策略图。把移动、抓取、LLM 查询、人类介入等子策略组织成可切换图。
- **Visual diversity**：视觉多样性。用视觉嵌入到聚类中心的距离衡量 episode 是否新颖。
- **Human-in-the-loop**：人在环。人类监督、拒绝危险任务、遥操作或急停。

*所以这一节是想说：AutoRT 的关键词都偏系统部署，而不是单个模型结构。*

## 它有什么搞不定的

第一，采集质量依赖已有 scripted / learned policies。如果底层策略只能做简单任务，AutoRT 生成再多任务也执行不出来。

第二，VLM 到 LLM 的场景描述是信息瓶颈。物体漏检、幻觉、运动模糊、物理属性理解不足都会传到任务生成和过滤阶段。

第三，高多样性带来稀疏学习问题。每个任务样本少、场景变化大，训练控制策略比固定任务数据更难。

第四，prompt 规则不能保证安全。LLM 可能忽略或误解 constitution，所以必须保留人类监督、物理急停和环境清理等工程措施。

*所以这一节是想说：AutoRT 是可扩展数据采集系统，但不是无人看管的机器人自治系统。*

## 它和别的几篇是什么关系

- 和 [RT-1](rt-1.md) / [RT-2](rt-2.md)：AutoRT 解决这些策略所需真实数据怎么继续扩大的问题。
- 和 [Open X-Embodiment](open-x-embodiment.md)：Open X 是多机构数据集合，AutoRT 是主动采集新数据的系统。
- 和 [DROID](droid.md)：DROID 强调人类遥操作跨地点采集，AutoRT 增加 LLM/VLM 任务编排。
- 和 [LeRobot](lerobot.md)：LeRobot 是开源训练/部署工具链，AutoRT 是大规模真实采集系统设计样本。
- 和 [LoHoVLA](lohovla.md)：LoHoVLA 管长程任务执行，AutoRT 管真实世界任务生成和采集。

*所以这一节是想说：AutoRT 是具身 AI 数据飞轮的代表，不是 VLA 架构论文。*

## 和本导读的关系

本篇适合放在 [Ch21: Datasets](../guide/ch21-datasets.md) 和 [Ch10: Planning](../guide/ch10-planning.md) 之间读。Ch21 告诉你数据集为什么重要，AutoRT 告诉你真实数据可以怎样被大模型主动采出来；Ch10 讲 LLM 规划，AutoRT 展示 LLM 在真实采集系统里的调度用法。

它也直接服务本站“从读到做”的后续 Lab 方向：如果未来要设计本地机器人实验，不能只看模型训练命令，还要考虑任务生成、安全过滤、数据多样性和人工监督记录。

*所以这一节是想说：AutoRT 把具身智能从论文模型拉回真实世界运行流程。*

## 思考题

**Q1：为什么 AutoRT 不让 LLM 直接输出机器人低层动作？**

<details>
<summary>提示</summary>

LLM 更适合任务生成和规则推理，低层动作需要现有策略、脚本或人类遥操作保证安全。
</details>

**Q2：Robot constitution 为什么不能替代人类监督？**

<details>
<summary>提示</summary>

Prompt 不是形式化证明，LLM 仍会漏掉危险任务，真实机器人还会遇到传感器和物理异常。
</details>

**Q3：高多样性数据为什么反而更难训练？**

<details>
<summary>提示</summary>

每种任务和场景的样本变少，策略要学更多变化，监督信号更稀疏。
</details>

**Q4：如果你要复刻一个小型 AutoRT，会先做哪三个模块？**

<details>
<summary>提示</summary>

场景描述、任务生成/过滤、执行记录；真机前可先用仿真或手工执行闭环。
</details>

**Q5：AutoRT 和 DROID 的数据采集哲学有什么不同？**

<details>
<summary>提示</summary>

DROID 更强调人类遥操作规模化；AutoRT 强调 foundation models 主动提出任务和指导采集。
</details>

## 一些好奇心问答（FAQ）

**AutoRT 是不是完全自动采集？**  
不是。它包含 autonomous policies，也包含 teleoperation 和人类监督。论文强调 human-in-the-loop 是安全机制。

**77k episodes 都是成功任务吗？**  
论文称收集 77k real robot episodes，具体任务成功和数据用途需按论文细分理解，不应简单等同 77k 条完美演示。

**Robot constitution 是固定规则吗？**  
论文把它放进 prompt 和 filtering 实验中。不同机器人、场地和组织需要不同规则。

**它对训练策略帮助大吗？**  
论文的 co-finetuning 展示了 modest gains，例如 picking 和 wiping 有提升，但 AutoRT 的主要目标是数据规模与多样性。

**它和“全流程部署”有什么关系？**  
它提供了一个真实部署模板：任务生成、过滤、安全、采集、训练反馈都要闭合，而不是只跑模型推理。

## 补充理解：AutoRT 的“部署”不是上线一个模型

AutoRT 最容易被低估的一点是，它把部署看成一套运营系统。真实机器人不是云端 API，请求失败了重试就行；它会移动，会接触物体，会遇到人，也会制造物理后果。因此 AutoRT 的部署包含场地边界、任务边界、对象边界、急停边界和人类监督边界。LLM/VLM 在里面只是提高任务生成和场景理解效率，不能替代这些边界。对我们读论文或做小实验也一样：如果只记录“模型成功率”，看不到任务如何产生、失败如何拒绝、危险如何兜底，就不算真正理解部署。AutoRT 的价值是把数据采集从一次性实验变成可持续流程，让机器人每天进入不同场景，采回多样 episode，再把这些 episode 反哺策略训练。这就是具身智能里最朴素的数据飞轮。

从工程复盘角度看，AutoRT 还提醒我们要把“被拒绝的数据”也记录下来。哪些任务因为危险被拒绝，哪些任务因为机器人能力不足被拒绝，哪些任务因为人类监督者介入而停止，这些负样本本身就是下一轮 constitution、affordance model 和数据采集策略的训练材料。如果只保存成功 episode，系统会看不到自己为什么没有采到某类数据。

所以读 AutoRT 时，可以把它当成一份机器人运营手册：成功数据、失败数据、拒绝理由、人工介入和安全边界同样重要。真正的全流程不是“模型执行一次”，而是“系统知道自己执行了什么、拒绝了什么、为什么拒绝、下一轮该补什么数据”。

这也是它比普通 demo 更接近生产系统的地方。

数据治理本身就是部署能力。

*所以这一节是想说：AutoRT 的部署观是流程优先，模型只是流程里的一个决策组件。*

## 如果你想再深入

1. 读论文 Appendix C 的 guardrails，学习真实机器人部署必须有哪些硬边界。
2. 对比 Table 3 / Table 4，理解 task generation 和 constitution 的不同作用。
3. 关注 visual diversity 的度量方式，想想本地数据采集如何避免重复样本。
4. 设计一个小型“桌面整理任务 constitution”，列出机器人不能碰的物体和能力限制。
5. 把 AutoRT 和 LeRobot 的 record / rollout CLI 对照，思考开源环境下能复刻哪一部分。

## 原文信息

- 标题：AutoRT: Embodied Foundation Models for Large Scale Orchestration of Robotic Agents
- arXiv：<https://arxiv.org/abs/2401.12963>
- 版本：v2, revised 2024-07-02
- 公开状态：论文报告真实机器人部署结果；本站未复现。

```bibtex
@misc{ahn2024autort,
  title = {AutoRT: Embodied Foundation Models for Large Scale Orchestration of Robotic Agents},
  author = {Ahn, Michael and others},
  year = {2024},
  eprint = {2401.12963},
  archivePrefix = {arXiv},
  primaryClass = {cs.RO}
}
```

*所以整篇是想说：AutoRT 把大模型用于真实机器人数据采集的“前台调度和安全过滤”，为具身基础模型的数据飞轮提供了工程样本。*
