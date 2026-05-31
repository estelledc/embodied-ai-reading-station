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

ProgPrompt 把"机器人能做的动作"和"环境里有什么物体"都写成 Python 代码片段（伪函数 + 注释），喂给大语言模型（LLM, Large Language Model），让它**像续写程序一样**生成任务计划。结果就是：你说"把苹果放冰箱"，模型不是输出一段自然语言步骤，而是直接吐出一段 Python 调用序列 `find("apple"); grab("apple"); open("fridge"); putin("apple", "fridge")`。

## 这是个什么场景 — 日常类比

想象你雇了一个临时帮厨，他来自一家完全不一样的餐厅，不熟悉你厨房的布局，也不知道你有哪些工具。

- 普通做法：你写一段中文菜谱，他对着翻译，但碰到"切丁"具体用哪把刀、放哪块砧板还得反复问你。
- ProgPrompt 的做法：你先递给他一张**纸条**，纸条最上面用代码格式列出"我家有这些工具：刀 A、砧板 B、电饭煲 C"和"你能做这些动作：切、煮、装盘"，然后给两个**示例菜谱**已经写成代码了。再让他写新菜谱，他自然会照葫芦画瓢，用同样的代码风格写。

LLM 就是那个帮厨。Python 注释和函数签名就是那张纸条。这种"写半截让模型补全"的范式叫 **few-shot prompting（少样本提示）**，ProgPrompt 把它从自然语言搬到了代码空间。

## 之前的人怎么做的 — 3-5 bullet

- **SayCan（2022）**：用 LLM 打分候选动作 + 价值函数（affordance）筛选可行性，但动作池是预先列好的离散选项，LLM 只做选择题，不写程序结构。
- **Inner Monologue（2022）**：让 LLM 在自然语言里"自言自语"，结合环境反馈一步步规划；表达力强但格式松散，下游执行模块要做大量解析。
- **传统 task planning（PDDL）**：用形式化语言写 domain + problem 文件，再调 planner（如 FastDownward）求解。表达精确但需要专家手写 domain，不灵活。
- **直接让 LLM 输出自然语言步骤**：简单粗暴，但模型容易漏前置条件（拿东西前没找到它）、动作粒度不对、调用了环境里不存在的物体。

## 这篇论文的关键想法

核心一句话：**用编程语言的语法去约束 LLM 的输出空间**。

为什么用代码而不是自然语言？

1. **结构化天然带类型检查**：`grab(apple)` 一看就知道参数是物体名；自然语言"拿那个东西"指代不清。
2. **注释可以列举上下文**：把环境里的物体清单和可用动作 API 写成 Python 注释 + 函数签名，模型续写时会"参考"这些信息（因为训练语料里大量代码就是这种风格）。
3. **可执行性强**：输出直接是程序，下游 parser 只要 `exec` 或者 AST 解析即可，不需要 NLU 模块翻译意图。
4. **assertion 当成"反思"机制**：在生成的程序里插入 `assert("apple" is grabbed)` 这种断言，让 LLM 在写下一步前先"自检"环境状态，相当于轻量的闭环。

这是后续 **Code as Policies**（同期 Google）那一脉的源头之一，把 LLM 当代码补全器用。

## 它怎么做的（方法）— 3-4 段

**Prompt 的组装。** 一个完整 prompt 包含三块：(a) 可用动作的 Python 函数签名注释，比如 `# def grab(obj): pass`；(b) 当前环境里的物体列表，写成 `# objects = ['apple', 'fridge', ...]`；(c) 1~3 个示范任务的完整代码（few-shot examples）。最后留一个新任务名 + 函数名让 LLM 续写函数体。这就是"Pythonic prompt"这个名字的由来。

**生成与执行。** LLM（论文用 GPT-3 系列 Codex / text-davinci）输出一段 Python 函数体，里面是动作调用序列。系统不真的跑 Python，而是把每个调用映射到机器人 / 仿真器（VirtualHome、real robot）的 primitive。如果调用了不存在的物体或动作，就当作执行失败。

**闭环 vs 开环。** 论文区分两种模式。开环（open-loop）：一次性生成全部步骤再执行。闭环：在 prompt 里加 `assert` 断言 + state-feedback 注释，每执行一步把环境观察反馈回去，LLM 据此决定继续还是 recover。闭环对扰动更鲁棒，但调用 LLM 次数变多。

**评估指标。** 主要看 success rate（任务完成率）、executability（生成的代码每一步是否在环境里合法）、以及对未见物体 / 未见任务的泛化。具体数字需读原文。

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
