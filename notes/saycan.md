---
title: "SayCan: Do As I Can, Not As I Say"
slug: saycan
topic: 二. 任务规划
difficulty: ⭐⭐
status: auto-summary
来源: papers/saycan/paper.pdf
generated_at: 2026-05-30
---

# SayCan: Do As I Can, Not As I Say

> 这是机器辅助生成的客观摘要笔记。教学版精读笔记由用户按节奏触发后单独成稿。

## 一句话讲什么（TL;DR）

让大语言模型当"嘴和脑"出主意，机器人技能的 value function 当"手和眼"打分，两者相乘选下一步动作。

## 这篇论文要解决什么问题（Why this paper）

现实里的麻烦：你跟机器人说"我把饮料洒了，能帮帮我吗？"，希望它去拿海绵擦干净。但机器人不知道"洒了"和"擦"该怎么对应到自己的动作。

如果直接问大语言模型（LLM），它能给一段挺合理的话，比如"你可以用吸尘器吸一下"——可问题是这台厨房机器人根本没有吸尘器，也不会用。LLM 知道世界常识，却没有手、没有眼睛，不知道当前场景里有什么、自己能做什么。

之前的方法要么（1）只用 LLM 生成文本，没法保证生成的步骤机器人真的能执行；要么（2）只用强化学习的低层策略，听不懂"帮我从锻炼后恢复"这种抽象指令。SayCan 想把这两边的优点拼起来。

## 用了什么方法（How）

- **Say（任务相关性）**：让 LLM 给每个候选技能描述（如"pick up the sponge"）打一个"这一步对完成指令有多大帮助"的分数 p(ℓ_π | i)。类比：问一个见多识广的朋友"擦桌子第一步该干嘛"，他列出可能的步骤并标出哪个最像下一步。
- **Can（环境可行性）**：每个低层技能配一个 value function（用强化学习 TD 训出来），输出"在当前场景下这个技能能成功执行的概率"p(c_π | s, ℓ_π)。类比：你的手在面前摸一圈，告诉你"海绵就在右手边，能拿到"或者"周围啥都没有，别想了"。
- **乘起来选最优**：两个概率相乘 p(c_π|s,ℓ_π) · p(ℓ_π|i)，选乘积最大的技能执行。类比：朋友给的建议要靠谱（Say 高），自己也得真做得到（Can 高），两个都高才下手。
- **迭代规划**：选完一个技能就把它追加到 prompt 里，再问下一步，直到 LLM 输出"done"。类比：做菜照着步骤一步一步来，每做完一步翻菜谱看下一句。
- **技能怎么来**：用行为克隆（BC-Z）训"做"，用强化学习（MT-Opt）训"判断能不能做"。BC 学动作更稳，RL 的 value function 才是用来打 affordance 分数的关键。

![SayCan 整体流程](../papers/saycan/images/img_004.jpg)

![Value function 在不同场景下打分](../papers/saycan/images/img_014.jpg)

## 关键实验结果（What works）

- **101 条指令、PaLM-SayCan 在 mock 厨房**：plan 成功率 84%，execution 成功率 74%。说明大部分时候它能选对步骤、并真的把任务做完。
- **真实办公室厨房**：plan 81%、execution 60%，比 mock 环境只掉了 3%/14%，泛化还可以。
- **去掉 value function（No VF）→ plan 67%；用生成式 LLM 投影到最近技能（Generative）→ 74%**，都明显低于 SayCan 的 84%。说明"Can"那一半是必需的，不是装饰。
- **换成更弱的 LLM（FLAN 137B）**：plan 70%、execution 61%，比 PaLM 540B 低了一截。结论：把 LLM 升级，机器人也跟着变强——这是论文最有意思的"两个领域共同进步"的结论。

## 我读完后该懂的几个术语

- **Affordance**（可供性）：环境给"动作"提供的可能性。类比：门把手对你"招手"说"我可以被转动"。论文里用 value function 来量化这个东西。
- **Value function / Q-function**（价值函数）：在状态 s 执行技能 π 能获得未来累计回报的期望。类比：玩游戏每个位置上方飘着的"血量回收预测"。
- **Grounding**（落地 / 接地）：把抽象的语言对应到具体物理世界的物体和动作。类比：把"再来一杯"翻译成"具体走到吧台、拿起杯子、装水"。
- **LLM scoring mode**（打分模式）：不让 LLM 自由生成文本，而是给一组候选答案让它输出每个的概率。类比：选择题让你打勾，而不是让你自由作文。
- **Behavioral Cloning (BC)**：用人类演示数据监督学习动作。类比：徒弟看师傅做菜，把每一刀都模仿下来。
- **Chain-of-Thought (CoT)**：让 LLM 在给出最终答案前先写一段"解释"。论文发现这能让 SayCan 处理"不要苹果，给我别的零食"这种带否定的复杂指令。

## 这篇论文的局限 / 我看出的疑点

- **闭环反馈缺失**：SayCan 只在每一步开始时查一次 value function，技能中途失败或场景变化它感觉不到。后续工作 Inner Monologue 才补上这点。
- **技能库即上限**：能做什么完全取决于预训练的低层技能集合。论文坦诚这是"主要瓶颈"——长程任务里 65% 的错来自 LLM、35% 来自 affordance 误判。
- **value function 标定靠人手调**：每个技能的 v_min/v_max 是手动设定的（如 pick 用 0.2/0.5 截断），不是端到端学出来的，迁移到新场景需要重调。
- **否定和歧义指令容易出错**：vanilla SayCan 处理"bring me a snack that isn't an apple"会失败，要靠 CoT prompting 兜底。

## 与其他 12 篇的关联

- **和 RT-1 / RT-2（同组后续工作）**：SayCan 是"高层 LLM 规划 + 低层独立技能"的两段式；RT-2 把规划和控制合到一个 VLA 模型里，少了 SayCan 这种显式分解，但失去了可解释性。
- **和 Inner Monologue（论文里点名的后续）**：Inner Monologue 在 SayCan 基础上把成功检测、场景描述、人类反馈塞回 LLM，做成闭环。
- **和 OpenVLA 这类 VLA 主线**：SayCan 走的是"语言负责思考、动作模型负责手脚"路线；VLA 走的是"端到端从图+语言直接出动作"。SayCan 的 affordance 思路常被引用作为"为什么需要 grounding"的论据。

## 为什么值得读 / 不值得读

任务规划方向必读。它把"LLM 当 planner"这件事第一次系统化做出来，affordance 乘法这个组合简洁到可以画在一张餐巾纸上，是后来 embodied agent 论文（Inner Monologue、Code as Policies、PaLM-E）共同的起点。如果你只看 VLA 端到端那条线可以略读，但理解它对看懂"为什么 VLA 也要解决 grounding"很有帮助。
