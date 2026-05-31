---
title: "LLM+P: Empowering LLMs with Optimal Planning"
slug: llm-plus-p
topic: planning
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2304.11477"
venue: arXiv
year: 2023
era: founder
num: 77
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

LLM+P 让大语言模型（LLM）只做"翻译"这件事——把人类口头描述的任务翻译成 PDDL（Planning Domain Definition Language，规划领域定义语言）这种机器看得懂的形式化语言，然后交给一个**经典规划器**（classical planner）去算最优解，最后再让 LLM 把答案翻译回自然语言。一句话：LLM 当翻译，传统规划器当大脑。

## 这是个什么场景 — 日常类比

想象你让一个外国朋友帮你订一趟最便宜的转机航班。

- 你只会说中文，他只会说英文，但他认识一个航班调度系统（只接受 SQL）
- 你用中文告诉他"我要从北京去纽约，预算 5000，不能在芝加哥转机"
- 他把这段话翻译成 SQL 查询，扔进调度系统
- 调度系统返回一个最优航班组合
- 他再把结果翻译成中文告诉你

这里"外国朋友"就是 LLM，"调度系统"就是经典规划器，"SQL"就是 PDDL。LLM 自己不会算最优航班，但它会做语言之间的转换。

## 之前的人怎么做的 — 3-5 bullet

- **纯 LLM 规划**：让 LLM 直接生成动作序列（"先拿杯子，再倒水，再喝"）。问题：步数一多就胡说，不保证可达目标，也不保证最优
- **链式思考（CoT, Chain-of-Thought）**：让 LLM 分步推理。在简单问题上效果不错，但在 Blocksworld 这种需要多步搜索的经典规划任务上仍会失败
- **强化学习（RL）规划器**：训练专门的策略网络。问题是泛化差，换个领域就要重训
- **经典规划器（如 Fast Downward）**：算法保证完备性和最优性，但**只接受 PDDL 输入**——而把人类需求写成 PDDL 是专家活
- 此前一直没人桥接"自然语言 → PDDL"这一关，所以经典规划器没法被普通用户用起来

## 这篇论文的关键想法

把 LLM 当作"自然语言 ↔ PDDL"的翻译层，而不是规划器本身。

核心洞察：LLM 在**符号生成**（写代码、写格式化文本）这件事上比在**长程推理**上更可靠。所以与其让它做它不擅长的事（一步步推规划路径），不如让它做它擅长的事（生成符合语法的 PDDL 文件），把推理交给保证正确性的工具。

这是一个典型的 **neuro-symbolic**（神经-符号混合）思路：神经网络负责模糊的语言理解，符号系统负责精确的逻辑搜索。

## 它怎么做的（方法）— 3-4 段

**第一步：领域文件（domain file）固定，问题文件（problem file）由 LLM 生成。** PDDL 把规划分两部分：domain 描述这个世界有什么动作（比如 pick-up、stack），problem 描述当前初始状态和目标状态。论文假设 domain 文件由人类领域专家提前写好（一个领域写一次），LLM 只负责把每次新任务的自然语言描述翻译成 problem 文件。

**第二步：少样本提示（few-shot prompting）做翻译。** 给 LLM 一个例子（自然语言任务 + 对应的 PDDL problem 文件），然后让它对新任务照葫芦画瓢。这里 LLM 不需要理解规划本身，只需要做"模式匹配 + 填空"。

**第三步：调用经典规划器求解。** 把 LLM 生成的 problem.pddl 和人写的 domain.pddl 一起送给 Fast Downward 或类似的规划器，得到一个保证最优（或满足某种最优性准则）的动作序列。

**第四步：把动作序列翻译回自然语言。** 再让 LLM 把 `(pick-up A) (stack A B)` 这种符号序列读回成人话："先把积木 A 拿起来，然后放到 B 上。" 整个流程对用户透明——他只看到自然语言进、自然语言出。

## 实验在做什么

- **测试领域**：覆盖经典规划基准（Blocksworld 积木世界、Barman 调酒师、Termes 蚂蚁建塔等）和一些机器人任务（Tyreworld、Floortile 等）
- **比较对象**：纯 LLM（GPT-4 直接生成动作序列）、CoT 提示
- **指标**：成功率（生成的计划能否真的达到目标）、最优性（步数是否最少）
- **核心结论**：LLM+P 在所有需要长程规划的任务上几乎全胜，纯 LLM 经常在 5+ 步任务就失败；具体准确率提升数字需读原文
- **失败模式**：LLM 偶尔会在 PDDL 翻译时漏掉一两个谓词（predicate）或写错对象名，这时整个 pipeline 就废掉。论文也讨论了这种翻译误差

## 你应该懂的几个新词 — 4-6 个

- **PDDL（Planning Domain Definition Language）**：规划领域的"标准格式"，1998 年起作为规划比赛的统一输入语言。分 domain（世界规则）和 problem（具体任务）
- **classical planning（经典规划）**：完全可观察、确定性、离散动作的规划问题。Blocksworld 是教科书例子
- **domain file / problem file**：domain 写一次描述世界（有哪些谓词、动作、前置条件、效果），problem 每次写描述当前任务（初始状态 + 目标）
- **Fast Downward**：开源经典规划器，工业界标杆。给它合法的 PDDL 它就能返回最优计划
- **neuro-symbolic**：神经网络 + 符号系统混合架构。这篇是非常清晰的一个例子
- **few-shot prompting**：在提示里塞几个示例（典型 1-3 个），让 LLM 模仿生成。无需 fine-tune

## 它和其他论文什么关系

- **与 SayCan / Inner Monologue 等"LLM 直接当 planner"路线对比**：LLM+P 走的是相反方向——不让 LLM 做规划，只让它做翻译。立场更"谦虚"
- **与 Code as Policies 一脉**：都是"LLM 生成结构化语言（代码 / PDDL），交给底层执行"的思路。CaP 生成 Python，LLM+P 生成 PDDL
- **后续工作**：启发了 LLM-DP、PDDLego、AutoTAMP 等一系列"LLM + 形式化规划"工作。也是后来 task-and-motion-planning（TAMP）社区把 LLM 接入的范本
- **对比 ReAct**：ReAct 让 LLM 边推理边交互；LLM+P 是"一次性翻译完，规划器搞定"，更适合静态、目标明确的任务

## 我建议这样读 — 3-4 步

1. **先理解 PDDL 长什么样**：去找一个 Blocksworld 的 domain.pddl + problem.pddl 例子读 5 分钟，知道 `(:predicates ...)` 和 `(:action ...)` 是什么
2. **跳着读论文 Section 3-4**：看清楚 prompt 模板和 pipeline 流程图，理解 LLM 输入输出的具体边界
3. **跑一遍 demo**：作者放了 GitHub 仓库（搜 LLM-Planner / LLM+P），跑一个 Blocksworld 例子，亲眼看到自然语言变成 PDDL 又变回自然语言
4. **思考它的限制**：domain 文件还是人写的；如果用户描述的任务超出 domain 表达能力（比如涉及概率、连续值），整套架构就不适用

## 为什么值得读

- **方法论价值**：示范了"扬长避短"的混合架构思路——遇到 LLM 不擅长的任务，先想想能不能让它只做擅长的部分
- **历史定位**：embodied AI / agent 领域 2023 年中期最重要的"LLM + 经典工具"代表作之一，被后续大量工作引用
- **对零基础读者友好**：论文短、思路清晰、不需要懂深度学习细节，读完就能讲清楚 neuro-symbolic 是什么
- **批判性视角**：也能让你看到 LLM "看起来全能"背后的真实边界——它在严肃规划上靠不住，需要外接计算器
