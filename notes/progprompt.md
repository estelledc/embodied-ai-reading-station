---
title: "ProgPrompt"
slug: progprompt
topic: planning
difficulty: ⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2209.11302"
venue: ICRA
year: 2023
era: founder
num: 79
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

让大模型像写代码一样做计划：你说"把苹果放冰箱"，它直接吐出一串 Python 调用，机器人照着一行行跑就行。

## 这是个什么场景

你点了一份外卖跑腿，让骑手帮你"顺路把家里的苹果放进冰箱"。骑手第一次进你家，他不知道苹果在桌上还是在袋子里，也不知道冰箱是哪一个、能不能徒手开。

你有两种交代方式：

- **写一段大白话**：『进门，找苹果，放冰箱里』。骑手大概率会在客厅转两圈、对着两个柜门发呆，最后打电话问你"你说的冰箱是哪个"。
- **写一张带勾选框的便签**：先列清楚『家里有这些东西：苹果、冰箱、餐桌』『你能做这些动作：找东西、抓起来、开门、放进去』，再附两个已经填好的示例（比如"把牛奶放冰箱"是怎么一步步勾的）。骑手照着格式抄，不容易跑偏。

ProgPrompt 干的就是第二件事——只不过"骑手"换成了大模型，"便签"换成了一段 Python 代码：函数签名当作可做的动作清单，注释当作环境里有的物体，示例就是几段写好的小程序。这种"先给几个完整例子再让模型续写"的套路，机器学习里叫 **few-shot prompting（少样本提示）**，ProgPrompt 的新意是把它从自然语言搬到了代码格式。

## 之前的人怎么做的 — 3-5 bullet

- **SayCan（2022）**：用 LLM 打分候选动作 + 价值函数（affordance）筛选可行性，但动作池是预先列好的离散选项，LLM 只做选择题，不写程序结构。
- **Inner Monologue（2022）**：让 LLM 在自然语言里"自言自语"，结合环境反馈一步步规划；表达力强但格式松散，下游执行模块要做大量解析。
- **传统 task planning（PDDL）**：用形式化语言写 domain + problem 文件，再调 planner（如 FastDownward）求解。表达精确但需要专家手写 domain，不灵活。
- **直接让 LLM 输出自然语言步骤**：简单粗暴，但模型容易漏前置条件（拿东西前没找到它）、动作粒度不对、调用了环境里不存在的物体。

## 这篇论文的关键想法

核心一句话：**与其让大模型说人话，不如让它写代码**。

把指令换成代码，好处有点像把"口头嘱咐"换成"打勾的清单"：

1. **格式天然防出错**：`grab(apple)` 一看就知道动作叫 `grab`、对象叫 `apple`；换成自然语言"把那个拿起来"，"那个"是哪个就得猜。
2. **注释可以塞背景**：把"屋里有什么"和"能做什么"写成 Python 注释和函数签名，模型续写时会自动参考——因为它在网上读过的代码大部分就长这样。
3. **生成完直接能跑**：输出的是一段程序，下游不用再做"自然语言转动作"的翻译，`exec` 一下或语法树一拆就执行。
4. **`assert` 当随手自检**：在程序里夹一行 `assert("apple" is grabbed)`，相当于让模型每走一步先抬头看一眼"上一步真做完了吗"。

这套思路是后来 **Code as Policies**（Google 同期工作）那一脉的源头之一——把大模型当成一个超强的代码补全器来用。

## 它怎么做的（方法）— 3-4 段

**Prompt 怎么拼。** 想象你给一个新来的助理塞一份 README，最上面写"工具间有这些东西"、再往下写"你被允许做这些操作"、再附两个填好的工单当样板。ProgPrompt 的 prompt 就是这个三段结构：(a) 可用动作的函数签名注释，比如 `# def grab(obj): pass`；(b) 当前环境物体清单 `# objects = ['apple', 'fridge', ...]`；(c) 1~3 个示范任务的完整代码（few-shot examples）。最后留一个新任务的函数头让 LLM 续写函数体。这就是论文里 "Pythonic prompt" 这个名字的由来。

**生成出来怎么跑。** 模型像翻译一样，把"准备早餐"翻成一串 `find / grab / open / putin` 的调用。系统并不真的开 Python 解释器，而是把每个调用对应到机器人或仿真器（VirtualHome、real robot）里事先写好的小动作。如果模型调用了一个屋里没有的东西，或者一个根本没定义的动作，这一步就直接判失败。论文里用的 LLM 是 GPT-3 系列（Codex / text-davinci）。

**闭环 vs 开环 — 等等，先慢一拍。** 这两个词其实就是"做完整套再回头看" vs "做一步看一眼"。开环（open-loop）：模型一次把全部步骤都生成完，机器人照单执行，中间不再问模型。闭环（closed-loop）：每跑一步就把"现在苹果到底在不在手里"这种观察塞回 prompt，让模型基于实际情况决定下一步——多花几次 API 调用，换来出错时能补救。

**怎么算"做得好"。** 三个指标：success rate（任务完成率，最后冰箱里是不是真有苹果）、executability（生成的每一步在环境里合不合法，会不会抓空气）、以及换个新房间或新任务还认不认得。具体数字看原文。

## 实验在做什么

- **环境**：VirtualHome（家庭模拟器，有几百种物体和大量任务模板）+ 真实机器人小规模测试。
- **任务**：日常家务，比如"把咖啡机里的咖啡倒进杯子"、"准备一份三明治"，跨多个房间的物体操作。
- **基线**：自然语言 prompt 的 LLM、SayCan 类的 affordance scoring。
- **关注点**：(1) 切换到 Pythonic 格式后 success rate 涨多少；(2) 给少量 example，能不能泛化到新任务；(3) 闭环 assert 反馈对错误恢复的帮助。

具体百分比需读原文，但定性结论是：Pythonic 提示在可执行性和泛化上明显优于纯自然语言提示。

## 你应该懂的几个新词 — 4-6 个

- **few-shot prompting**：在 prompt 里塞 1~5 个完整示范，让 LLM 通过类比生成新输出。零示范叫 zero-shot。
- **affordance**：动作可行性。例：你不能 `grab` 一座山。SayCan 用 value function 学这个，ProgPrompt 用程序结构 + assert 隐式表达。
- **PDDL（Planning Domain Definition Language）**：经典 AI 规划领域的形式语言，定义 domain（动作模板）+ problem（初始/目标状态）。
- **closed-loop / open-loop planning**：闭环每步看反馈再决定下一步；开环一次出完整计划。
- **embodied agent**：有"身体"的 agent，能在物理或仿真世界里感知和行动，对应 disembodied 的纯文本 agent（如 ChatGPT）。
- **VirtualHome**：3D 家庭仿真环境，常用于 high-level task planning 评估，提供物体库 + 动作 API。

## 它和其他论文什么关系

- **上游灵感**：[saycan](saycan.md)（用 LLM 做 high-level planner 的开山）、Codex / GPT-3 在代码生成上的能力证明。
- **同期姐妹**：[code-as-policies](code-as-policies.md)（Google，把 LLM 输出 Python 直接当 policy 跑，覆盖更细粒度的控制）、[inner-monologue](inner-monologue.md)（自然语言反馈闭环）。
- **下游影响**：后来很多 VLA / VLM-as-planner 工作沿用了"把环境状态序列化成代码上下文"这一招；agent 框架里的 tool use（OpenAI function calling）思想类似。
- **对照组**：[palm-e](palm-e.md) 选择把视觉 token 直接喂进 LLM，避免显式列物体清单；ProgPrompt 是更"轻"的方案，不动模型本体。

## 我建议这样读 — 3-4 步

1. **先看一张 prompt 例子图**（论文 Fig 1 或 Fig 2）。把 Python 注释、函数签名、示范代码这三块对上号，理解"prompt 长什么样"。这一步比读 abstract 重要。
2. **跳到方法的 prompt 模板**那节，搞清楚 `objects = [...]` 和 `assert` 是怎么插进去的。剩下的工程细节先忽略。
3. **看实验里一两个失败 case**：模型为什么会调用不存在的物体？assert 在什么场景下救回了错误？这些案例比 success rate 数字更有信息量。
4. **对比阅读 code-as-policies**：两篇连着看，能体会到"代码即 policy"这个思路的设计空间——粒度可以从 high-level task 一直下沉到 control loop。

## 为什么值得读

ProgPrompt 是 LLM-as-planner 路线里**最早把"代码格式 prompt"系统化**的工作之一。它的贡献不在算法新颖，而在**范式转变**：当你下次要让 LLM 干结构化任务（不只是机器人，包括 agent 工具调用、SQL 生成、配置文件生成），第一反应应该是"能不能把上下文写成它训练过的某种代码方言？"

读完你会获得一个可迁移的设计直觉：**prompt 工程不是修辞，是在给模型选一种它最擅长的'语言'**。这个直觉值 30 分钟。
