---
title: "Tree-Planner"
slug: tree-planner
topic: planning
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2310.08582"
venue: ICLR
year: 2024
era: classic
num: 83
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

Tree-Planner 把 LLM 一次采样得到的多条候选计划合并成一棵"动作树"，让 agent 在执行时可以沿树搜索、回溯，而不是每一步都重新调用 LLM。一次采样多用，省 token、能纠错。

## 这是个什么场景 — 日常类比

想象你周末要做一道复杂的菜。

**朴素做法**：每做一步都打电话问大厨"接下来怎么办？"。每问一次都要 5 块钱话费，而且大厨记不住你之前问过什么，可能给出前后矛盾的指导。

**Tree-Planner 的做法**：一开始让大厨一口气写下 10 个完整菜谱（10 条候选计划）。10 个菜谱里很多步骤是重复的（"先洗菜"几乎都一样），把它们合并成一棵分叉树：根部是共同的开头，越往后分叉越多。

执行时你顺着树走，遇到分叉就挑最像当前情况的那条；某条路走死了（菜烧糊了 / 这步执行失败），就回到上一个分叉点选另一条。整个过程只在一开始打了一次电话。

**embodied agent 场景**：机器人在虚拟厨房里执行 "make breakfast" 这种长序任务，每一步是一个动作（拿杯子 / 倒牛奶 / 打开烤箱）。

## 之前的人怎么做的 — 3-5 bullet

- **Iterative planning（迭代式规划，比如 ReAct、Inner Monologue）**：每一步都让 LLM 看当前状态再决定下一步动作。token 消耗大，而且 LLM 容易"前后失忆"，规划不一致。
- **Plan-and-Execute（先规划后执行，比如经典的 SayCan、ProgPrompt）**：让 LLM 一次性生成完整计划，然后机器人照着执行。问题是计划一旦在中途出错（环境状态和预期不符），没有回退机制。
- **Tree-of-Thought（思维树，2023）**：在推理任务上让 LLM 反复展开树，但每个节点都要再调用 LLM 评分，开销大，而且面向纯推理不是 embodied 任务。
- **Self-consistency（自洽采样）**：多次采样同一问题然后投票，但只用于单步答案，没有把多条计划"结构化合并"。

## 这篇论文的关键想法

核心观察：**LLM 一次采样多条计划，里头大量动作前缀是重复的**。

那为什么不把这些重复前缀合并、把分歧点保留成分叉？这样得到一棵"动作树"——根到任意叶子是一条完整计划，节点合并代表 LLM 对这一步有共识，分叉代表它觉得可以有几种走法。

执行阶段不再调 LLM，而是在这棵树上做 grounded 搜索：环境告诉你当前状态、可执行动作有哪些，你就在树里挑能走的分支。走错了能回溯到上一个分叉。

**收益**：
- LLM 调用从 O(plan length) 降到 O(1)（只有最初采样那次）
- 错误恢复来自树结构本身，不需要 LLM 重新规划
- 一次性采样多样化的计划，提升整体成功率

## 它怎么做的（方法）— 3-4 段

**Step 1：Plan Sampling（计划采样）**
给 LLM 一个 prompt（任务描述 + 环境物体列表 + 可用动作列表 + few-shot 示例），用较高 temperature 采样 N 条完整计划（具体 N 需读原文，一般在 10-50 量级）。每条计划是动作序列，比如 `[walk to kitchen, open fridge, grab milk, ...]`。

**Step 2：Action Tree Construction（动作树构建）**
把 N 条计划合并成 trie（前缀树）：相同前缀共享路径，从分歧点开始分叉。一个节点的子节点数等于在这个状态下计划们提议的不同下一步动作的数量。理论上这棵树最大有 N 条根到叶路径。

**Step 3：Grounded Deciding（落地执行）**
agent 在环境中一步步执行。在每个树节点：
- 拿到环境当前可执行动作列表（grounding，比如 "milk 不在视野里就不能 grab milk"）
- 在该节点的子节点中筛选出可执行的
- 如果有多个可执行子节点，用启发式排序（比如该子节点下挂的计划数量，或语义相似度）选一个
- 执行后进入子节点

**Step 4：Backtracking（回溯）**
执行失败（动作返回 error / 环境反馈不符预期）时，回到当前节点的兄弟节点；如果当前节点的所有兄弟都试过，再退到父节点的兄弟。一直退到能继续往下走的位置。整个回溯过程不调 LLM。

## 实验在做什么

主要在 **VirtualHome**（一个家庭场景虚拟环境，机器人执行做饭、清洁等长序任务）上做。

评估指标：
- **Success Rate（任务完成率）**：机器人最终是否完成了目标
- **Executability（可执行性）**：生成的动作中能被环境接受的比例
- **LLM token cost / call count**：相比 iterative 方法节省了多少

对比基线：iterative planning（如 ReAct）、plan-and-execute（如 ProgPrompt）、单条计划采样。

具体数字（成功率提升、token 节省比例）需读原文。论文一般会在多个任务复杂度（短序 / 长序）上分别报告，并消融 N（采样数量）和回溯策略的影响。

## 你应该懂的几个新词 — 4-6 个

- **Embodied Agent（具身智能体）**：在虚拟或真实环境里有"身体"、能感知和执行动作的 agent。和纯 chatbot 区别在于它的输出会改变环境。
- **Grounding（落地）**：把 LLM 输出的"理论上的动作"对齐到"环境此刻真能执行的动作"。比如 LLM 说 "grab the cup"，但视野里没有 cup，这个动作就 not grounded。
- **Trie（前缀树）**：一种把多个序列合并、共享公共前缀的数据结构。Tree-Planner 的"动作树"本质是动作序列的 trie。
- **Backtracking（回溯）**：搜索算法在走死路时退回上一个分叉重新选择的机制。这里指执行失败时退回树上的上一个节点。
- **VirtualHome**：一个常用的 embodied AI benchmark，提供家庭场景和动作 API（go to / grab / open 等）。
- **Plan-and-Execute vs Iterative Planning**：两种 LLM 规划范式。前者一次给完整计划再执行，后者每步重新规划。Tree-Planner 是介于两者之间的"一次规划但留多条路"。

## 它和其他论文什么关系

- **vs ReAct / Inner Monologue（迭代式）**：Tree-Planner 把 LLM 调用从每步都调降到只调一次，token 省一两个数量级；但代价是初始采样必须足够多样，否则树覆盖不到正确路径。
- **vs SayCan / ProgPrompt（一次性规划）**：Tree-Planner 通过多采样 + 树结构具备了错误恢复能力，而单条计划方法一旦中途出错就完蛋。
- **vs Tree-of-Thought（推理任务）**：思想类似（搜索树），但 ToT 每个节点都要 LLM 打分扩展，Tree-Planner 一开始就把整棵树物化，执行时不再调 LLM。Tree-Planner 是 ToT 思想在 embodied planning 上的"廉价化"。
- **后续影响**：和 LLM-Planner、AdaPlanner 一起被列为 "LLM as Planner" 范式下的代表方法。后续工作（如 2024+ 的一些 hierarchical planning）会进一步把树结构与 world model、value function 结合。

## 我建议这样读 — 3-4 步

1. **先看 Figure 1**（一般是方法总览图）：看清"采样 → 合并成树 → 执行 + 回溯"三段式。这是论文的脊梁，看懂这张图基本就 get 了。
2. **看 Plan Sampling 的 prompt 设计**：理解输入 LLM 的到底是什么（任务描述 / 物体列表 / few-shot），这影响采样质量上限。
3. **看 Grounded Deciding 的具体规则**：在分叉点用什么启发式选下一步？这是工程细节但决定实际效果。
4. **看 ablation**：N 采样多少够？回溯策略消融？这些数据告诉你方法的"敏感点"和实际部署该怎么调。

## 为什么值得读

- **一个清爽的工程 idea**：把"多次采样 + 投票"升级成"多次采样 + 结构化合并"，几乎是即插即用的优化思路，可以套到任何 LLM 规划场景。
- **理解 embodied planning 范式权衡**：通过这篇能清楚看到 iterative / one-shot / tree-based 三类方法各自的代价。
- **后续 follow-up 的起点**：2024+ 很多 LLM agent 工作（搜索 + 规划 + 工具使用）都借鉴了"一次采样多条然后在结构上搜索"的思想，理解这篇是入门钥匙。
- **工程参考价值高**：方法实现起来不复杂（trie 合并 + 简单回溯），适合作为自己第一个 embodied agent 项目的参考实现。
