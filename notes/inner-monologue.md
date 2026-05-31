---
title: "Inner Monologue: Embodied Reasoning through Planning with Language Models"
slug: inner-monologue
topic: planning
difficulty: ⭐⭐⭐
status: auto-summary
来源: papers/inner-monologue/paper.pdf
venue: CoRL
year: 2022
era: founder
num: 76
generated_at: 2026-05-31
---

# Inner Monologue: Embodied Reasoning through Planning with Language Models

> 这是给"完全没碰过 AI / 机器人"的读者写的版本。专业词第一次出现都会用一两句话讲清，并尽量用日常生活打比方。

## 一句话讲什么（TL;DR）

让机器人在干活时像人一样"自言自语"——把环境看到的、动作成功没成功、人插嘴说什么，都翻成文字喂回 AI 的脑子里，让它边做边改主意。

*所以这一节是想说：这篇论文给机器人装了一个"内心独白"，让它一边做一边想下一步。*

---

## 这是个什么场景

想象你让一个新来的实习生帮你"去茶水间拿一瓶饮料"。一个理想的实习生会这样：

1. 走到茶水间，看一眼："咦，今天没有可乐，只有水和巧克力棒"。
2. 回头问你："你要哪个？"
3. 你说："给我个有咖啡因的"。
4. 他想了想："巧克力棒里有一点，但严格说是糖；水里没有……那这俩都不太对。"
5. 决定先回去问清楚，或换个柜子找。

这个过程里，他**一边走一边看一边想一边问**。**看到 → 想 → 改主意 → 再看**——这就是人类干活的常态。

可在 2022 年，机器人世界里的"会用 AI 帮忙规划"的方案大多是这样的：

- 一开始一次性把任务列成 1-2-3-4 步。
- 闭着眼睛按列表执行。
- 中途撞墙了、东西掉了、人改主意了——它根本不知道，照着原来那张单子往下做。

Inner Monologue 想做的事，就是让机器人**边做边汇报，边汇报边改计划**——和那个理想实习生一样。

*所以这一节是想说：让机器人从"开局列计划，闭眼往前冲"变成"走一步看一步、随时改主意"。*

---

## 之前的人怎么做的，为什么不够好

- **方案 A：传统任务规划（TAMP）**
  类比：每天上班前在纸上写好一份精确到分钟的行程表，路上堵车也不改。**写得很细但完全不抗意外**——一旦真实世界稍微偏一点，整个计划就报废。

- **方案 B：分层强化学习（HRL）**
  类比：上面是经理，下面是工人，经理只发"高层指令"，工人自己想办法。**问题**：经理不会说话也不会读说明书，新任务来了完全不会扩展。

- **方案 C：直接让 LLM 列计划（Huang et al. 2022）**
  类比：你给一个超博学但从没去过你家的朋友打电话，让他口述"怎么做番茄炒蛋"。他会给你一份完美单子——但说完就挂电话了，**之后你切到手、煤气没气、鸡蛋摔了，他都不知道**。

- **方案 D：SayCan**
  类比：博学朋友 + 会做饭的厨师组队。朋友每说一步，厨师都自评"我会不会做这步"，两人投票选最该做的。**进步**：知道自己会不会。**短板**：但厨师不会**回头告诉朋友**"我刚才那步翻车了"，朋友还是闭眼按原计划往下报。

- **共同的核心问题**：LLM 是**单向的**——只发指令不收反馈。机器人的世界本质上随机会失败、人会改主意，**没有反馈环路 = 闭着眼睛干活**。

*所以这一节是想说：之前的方法要么不抗意外，要么就算自评也只是单向输出，从没真正闭环。*

---

## 这篇论文的新想法

**把环境里发生的所有事都翻译成文字塞回 LLM 的提示词里，让 LLM 边读边接着写下一步——形成一个像"内心独白"的连续段落。**

不需要重新训练、不需要新模型、不需要复杂工程，**就是一直把新发生的事拼到 prompt 后面**。

*所以这一节是想说：核心创新就是"什么都用文字塞回去"——简单得令人发指，但没人这样做过。*

---

## 它分几步做的（方法）

整个论文做了三件事：把反馈分类、把反馈翻成文字、让 LLM 接龙写下去。

### 1. 把环境反馈分成三种"嘴"

**类比**

你打游戏，屏幕上有几种提示来源：

- **结算画面**："任务完成 / 失败"——告诉你这一关过没过。
- **小地图**：随时显示周围有什么——你不主动看也会刷新。
- **NPC 对话框**：你按 F 才弹出，它才告诉你信息。

机器人需要的反馈也长这样。

**它在干什么**

论文把所有可以塞回 LLM 的反馈分成三类：

1. **Success（成功检测）**：刚才那一步动作做成了没？输出"True / False"。
2. **Passive Scene（被动场景描述）**：每走一步，自动把周围有啥告诉 AI。比如"我看到可乐、水、巧克力棒"。
3. **Active Scene（主动场景查询）**：AI 自己反问"抽屉是开着的吗？"——人或另一个视觉模型给答复。

> **反馈（feedback）**：环境对机器人动作的回应。摔了一跤是反馈，撞墙了是反馈，人骂你也是反馈。
>
> **检测器（detector）**：一个小模型，专门干一件事，比如"看一眼图判断动作有没有成功"。
>
> **VQA（Visual Question Answering，视觉问答）**：给图 + 一个问题，模型回答这个问题。这里用来当 Active Scene 的回复者。

**为什么这步有用**

- 三类反馈各有强项：成功检测告诉你"这一步成没成"，被动场景告诉你"现在世界长啥样"，主动查询让 AI 在不确定时**主动开口问**。
- 把它们分开可以做对照实验：**哪种反馈最关键？**——后面表 1、2、3 就在回答这件事。

*所以这一节是想说：先把"机器人能拿到的反馈"分成三类，剩下的工作就是让 LLM 同时读懂这三种。*

---

### 2. 让所有反馈都变成"自然语言"，拼进同一段话里

**类比**

公司一群人协作，有人说粤语、有人说四川话、有人写邮件、有人画图。会议室里没法讨论。**老板拍板**：所有信息一律翻译成普通话写在白板上，挨个排队加。

Inner Monologue 就是这个白板：所有视觉模型、所有传感器、所有人类输入，**全部翻成一句英文**，按时间顺序拼进 LLM 的 prompt 里。

**它在干什么**

每走一步，prompt 末尾都会追加几行新东西，看起来像一段连续的剧本：

```
Robot Action: pick up the coke
Success: False
Robot Action: pick up the coke
Success: True
Scene: I see coke in the gripper
Robot Action: bring it to user
```

LLM 看到这个 prompt，自然会接着续写**下一行 Robot Action**——续写就是它在被训练时学过的事。

> **prompt（提示词）**：你给 LLM 看的那一段输入。LLM 是个"文字接龙引擎"，它的任务永远是预测"下一段最合理的文字"。
>
> **few-shot prompting（少样本提示）**：在 prompt 开头放 2-3 个示范例子，LLM 看到例子就照葫芦画瓢。这里没微调任何模型，全靠示范。
>
> **闭环（closed-loop）**：动作执行 → 反馈 → 再决策 → 再动作，构成一个圈。**开环**就是发完指令不管。

**关键设计：所有信息走同一根管道**

- 不搞复杂的多模态融合架构。
- 不训新模型。
- LLM 看到的就是一段越来越长的英文段落。
- 这段段落本身就是机器人的"内心独白"。

**为什么这步有用**

- LLM 本来就最擅长读连续段落、续写下一句——把机器人状态翻成段落是**让 AI 干它最擅长的事**。
- 不需要训练 = 换 LLM、换机器人、换任务都几乎零成本——把 PaLM 换成 InstructGPT，prompt 不用改。
- 这个抽象后来变成具身 AI 的"事实标准"：再后来的 ReAct、Voyager、各种 LLM agent，骨架都是这个。

*所以这一节是想说：只要把世界全部翻译成英文塞进同一段 prompt，LLM 自然会接龙规划下一步。*

---

### 3. 让 LLM 在接龙过程中"想出声"——chain of thought

**类比**

数学题不让你写步骤，直接报答案，你大概率算错。让你"列出过程"，正确率立刻上去。LLM 也一样。

**它在干什么**

在某些任务里，prompt 里特意鼓励 LLM 写出 `Robot thought: ...` 这一行：

```
Robot action: Pick the red block and place it in the purple bowl.
Scene: Completed ['Red block is in purple bowl.']
Robot thought: One more block is needed to be inside the purple bowl.
Robot action: Pick the purple block ...
Scene: The purple block is too heavy to be picked up.
Robot thought: I need to find a lighter block.
Robot action: Pick the blue block ...
```

> **chain of thought（思维链，CoT）**：让模型在给答案前先把推理步骤写出来。Wei et al. 2022 提出，证明这能让 LLM 在数学/推理题上准确率显著提升。
>
> **替代目标（self-proposed goal）**：原计划被堵死时，AI 自己提出一个新的目标。这里 LLM 看到"紫块太重"，自己想出"我要找个轻的"。

**为什么这步有用**

- "想出声"让多个反馈不会被 LLM 直接淹没。它会先**复盘**当前进度，再决定下一步。
- 它涌现了一堆**没在 prompt 里教过的能力**：自己改目标、回答关于场景的问题、识别中文指令、对错别字鲁棒——这些都是在写思考的过程中"顺手学会"的。
- 论文叫这些为 **emergent capabilities**（涌现能力）：没专门教，模型会了。

*所以这一节是想说：让 LLM 写出来"我在想什么"，不仅规划更稳，还冒出一堆没教过的本事。*

---

## 关键数字（What works）

数字本身不重要，重要的是它们告诉你**哪一种反馈最值钱**。

### 数字 1：仿真桌面任务，未见过的"颜色错配 bowl"任务从 0% 涨到 86%

- **怎么算的**：仿真环境里 50 局平均成功率。任务"把方块放到颜色不匹配的碗里"，专门的 CLIPort 模型从来没见过，得 0%。Inner Monologue（Object + Scene 反馈）做到 86%。
- **对比**：CLIPort 0%；只用 Object 62%；Object + Success 76%；Object + Scene **86%**。
- **生活语言**：把训练时根本没出过的题，做到 86 分——证明 LLM 的推理能力**直接搬过来就能用**，不用为新任务重新训练。

### 数字 2：真实抓取任务从 20% → 90%（4.5 倍）

- **怎么算的**：UR5e 机械臂做"3 块堆叠 + 食物分类"两个任务，10 次平均。
- **对比**：单 Object 反馈 20%；Object + Success **90%**。
- **生活语言**：只把"成功检测"加上去，成功率涨 4.5 倍——**最便宜的反馈反而最值钱**。

### 数字 3：在对抗干扰下，移动操控任务 0% → 75%

- **怎么算的**：厨房里 Everyday Robots 做"取饮料、开抽屉"等任务，故意人为弄乱（撞机械臂、把东西移走）。
- **对比**：SayCan 0%；Inner Monologue（Success + Object）**75%**。
- **生活语言**：SayCan 在被人捣乱时直接死给你看，因为它不知道刚才翻车了；Inner Monologue 知道翻车，会重试或换计划。

### 数字 4：总计 120 次评测，30.8% → 60.4%

- **怎么算的**：把所有有/无干扰、所有任务族加在一起平均。
- **对比**：SayCan 30.8%；Inner Monologue **60.4%**——几乎翻倍。
- **生活语言**：在论文设定的最复杂场景（带人为干扰），Inner Monologue 的整体成功率是 SayCan 的两倍。**反馈环路是值钱的工程升级**。

### 数字 5：零训练，零微调

- **怎么算的**：所有 LLM 都用预训练原版（PaLM、InstructGPT），没改一行权重。
- **对比**：传统机器人方法动辄要 $10k+ GPU 时间训练。
- **生活语言**：换 LLM、换任务都不需要重训。这把"具身 AI 实验"门槛压低到**只要会写 prompt**。

### 数字 6：涌现 5 种 prompt 没教过的能力

- **怎么算的**：作者列出了 5 种 prompt 没显式教的行为：换语言（中文）、自定目标、对错别字鲁棒、回答场景问题、对反馈顺序鲁棒。
- **生活语言**：你只教它"按表执行"，它自己学会了"听人改主意 + 主动查询 + 跨语言"。**这是这篇论文最让人惊讶的部分**——LLM 的通用智能可以"漏"到机器人控制里。

*所以这一节是想说：数据告诉我们"加反馈环路 = 翻倍以上的鲁棒性"，且最便宜的成功检测就能带来巨大涨幅。*

---

## 你应该懂的几个新词

> **Embodied AI（具身 AI）**：让 AI 不只是聊天，而是有"身体"——能看、能动、能影响物理世界。机器人是其中一种典型形态。

> **LLM（Large Language Model，大语言模型）**：一个超大的"文字接龙机器"。GPT-3、PaLM 都是。它的本职工作就是看一段文字预测下一段。

> **Inner Monologue（内心独白）**：本文的核心抽象。把环境反馈、人类指令、动作记录全部翻成文字塞进 LLM 的 prompt，让规划过程像一段连续的"自言自语"。

> **Closed-loop / Open-loop（闭环 / 开环）**：闭环 = 边做边收反馈再决策；开环 = 一次发完指令不管。Inner Monologue 是闭环；之前的 LLM-as-planner 是开环。

> **Affordance（可供性）**：一个动作"在当前情况下做不做得到"的概率。SayCan 用价值函数估它。可以理解成机器人对自己的能力自评。

> **Success Detector（成功检测器）**：看一眼图（或读状态）判断"这一步动作做成了没"的小模型。Inner Monologue 把它的输出翻成 True/False 字符串塞回 prompt。

> **Scene Description（场景描述）**：把当前看到的东西用一句话说出来。比如"我看到可乐、水、巧克力棒"。

> **Visual Question Answering（VQA，视觉问答）**：给图 + 问题，模型回答。这里 LLM 主动反问时由 VQA（或人）回答。

> **Few-shot Prompting（少样本提示）**：在 prompt 开头放几个例子，LLM 模仿例子的格式。Inner Monologue **完全靠这个**实现规划，没微调任何模型。

> **Chain of Thought（思维链，CoT）**：让 LLM 写出"我在想什么"的中间步骤，能显著提升推理任务表现。论文在桌面任务里加了这个。

> **Emergent Capabilities（涌现能力）**：模型表现出 prompt 里没显式教过的行为。Inner Monologue 涌现了多语言交互、自定目标、跨指令切换等 5 种能力。

*所以这一节是想说：上面这些词以后看具身 AI / LLM agent 论文都会反复出现，先把它们和生活类比挂钩。*

---

## 它有什么搞不定的

- **场景描述靠人或脚本**：仿真和厨房实验里，scene description 是用脚本或人提供的"oracle"。换到完全自动的视觉模型上，效果会跌。论文承认这是个限制。
- **被低层策略卡死**：哪怕 LLM 推理再聪明，下面的抓取策略不会拧瓶盖，整套系统也拧不开。**Inner Monologue 不能凭空提升机械臂的物理能力。**
- **LLM 偶尔无视反馈**：作者发现有时 LLM "硬刚"——明明 scene 里没那个东西，它还是要去抓。LLM 也会"幻觉"。
- **没有不确定性建模**：所有反馈都是"硬翻译"成肯定句，AI 看不到"这个检测器对自己 60% 自信"。论文留作 future work。

*所以这一节是想说：天花板有两个——感知模型的可靠性 + 低层动作策略的能力，LLM 自己再聪明也跨不过去。*

---

## 它和别的论文是什么关系

- **直接前作：SayCan（2022）**
  SayCan 解决"LLM 不知道自己会不会做"的问题，加了 affordance 自评。但**仍然是开环**——动作做完了不告诉 LLM 结果。Inner Monologue 在 SayCan 上面**补上了反馈环路**。本仓库 [saycan.md](saycan.md) 就是直接前作。

- **方法论亲戚：LLaVA（2023）**
  LLaVA 是"让 LLM 长眼睛"，把视觉编码塞进 LLM。Inner Monologue 走的是另一条路：**不动 LLM 架构，把视觉信息全部翻成英文塞 prompt**。两条路最后都通向"多模态智能"，但 Inner Monologue 的路更轻量，零训练。详见 [llava.md](llava.md)。

- **后继：OpenVLA / VLA 家族**
  到了 2024 年，业界开始把 LLM + 视觉 + 动作**全部塞进一个端到端模型**（Vision-Language-Action）。Inner Monologue 是这条路的"前身"——它证明了**用语言做所有桥梁是可行的**，但还没把动作输出也塞进 LLM。详见 [openvla.md](openvla.md)、[vlas.md](vlas.md)。

- **集合关系**：你可以把"用 LLM 控制机器人"想成一棵进化树。Inner Monologue 是树干上的关键分叉——之前所有方案都开环，从它开始**所有人都做闭环**。

- **因果关系**：
  - **CoT（2022.1）** + **SayCan（2022.4）** → **Inner Monologue（2022.7）**：把"会想"和"会做"合起来。
  - Inner Monologue → **ReAct（2022.10）**：把同一思路推到纯文字 agent 上（搜索引擎 + 思考）。
  - Inner Monologue → **Voyager（2023）**：在 Minecraft 里让 LLM 写代码 + 看反馈，骨架完全照搬。

*所以这一节是想说：Inner Monologue 是"LLM 控机器人"从开环跨到闭环的分水岭，后面的 LLM agent 都长得像它。*

---

## 我建议这样读这篇

零基础读者不要从头读到尾。建议这样走：

1. **看 Figure 1**（2 分钟）：一眼看明白"人 → 机器人 → Scene/Success → 机器人 → ..."的闭环流程。
2. **跳读第 3 节"Sources of Feedback"**（10 分钟）：只看 Success / Passive / Active 三类怎么定义，不要纠结公式（其实没什么公式）。
3. **细读第 4.1 节 + Table 1**（15 分钟）：仿真桌面任务，看 Object / Object+Success / Object+Scene 三档对比，体会"加越多反馈涨越多"。
4. **快速扫第 4.3 节 + Table 3**（10 分钟）：真实厨房机器人，看"对抗干扰"那几行——这里 SayCan 直接 0%，Inner Monologue 75%，最直观。
5. **重点看第 4.4 节"Emergent Capabilities" + Figure 5**（15 分钟）：这是最有趣的部分，看 LLM 自己冒出多语言、自定目标等能力的对话剧本。
6. **跳过附录的 prompts**（除非你想自己实现）：知道思路就行，prompt 工程细节不耽误理解。

读完这 6 步大约 50-60 分钟，已经能在和别人讨论 LLM agent 时讲清这篇的核心贡献。

*所以这一节是想说：这篇精华在"闭环框架 + 涌现能力"，技术细节非常少，重点是看实验和对话剧本。*

---

## 一些好奇心问答

**Q1：这篇有 train 模型吗？**

完全没有。所有 LLM（PaLM、InstructGPT）都是预训练原版，所有视觉模型也是现成的。整篇论文的"代码"基本就是**写 prompt + 把信息拼进 prompt + 调 API**。这也是它影响力大的关键——门槛极低。

**Q2：那为什么要发 CoRL？**

因为它**第一次明确提出"用语言做反馈环路"是一个独立的研究问题**，并系统性地拆出三种反馈、三个机器人环境、对照实验。后来所有 LLM agent 论文都默认这是一个独立的设计维度。

**Q3：Inner Monologue 和 ReAct 啥关系？**

ReAct（2022.10）几乎是 Inner Monologue 的"无身体版"：把"环境反馈"换成"搜索引擎结果"，把"动作"换成"调 API"。骨架完全一样。Inner Monologue 早 3 个月，但因为 ReAct 在 NLP 圈火得更快，很多人误以为是 ReAct 先做的。

**Q4：成功检测器自己也会出错怎么办？**

会，论文承认了：False Negative（明明做对了说没做对）会让机器人无谓重试；False Positive（没做对说做对了）会让 LLM 在错的状态上规划，走得越来越偏。论文没解决这个，只是分析了失败模式。**未来工作之一**就是让反馈带不确定性。

**Q5：为什么仿真和真实机器人用的 LLM 不一样（InstructGPT vs PaLM）？**

作者在三个独立环境里都做了实验，刻意用不同 LLM 证明**方法本身和具体 LLM 无关**。换模型、prompt 微调一下就行。这是论文的鲁棒性证据。

**Q6：能不能让两个 Inner Monologue agent 互相对话？**

论文没做，但理论上可以——两个 LLM 互相把对方的输出当反馈塞进自己的 prompt。后来的 multi-agent 系统（ChatDev、AutoGen）走的就是这条路。

**Q7：中文能直接用吗？**

可以。Figure 5c 展示了 LLM 收到中文指令"请把蓝色方块也放到蓝色的碗里面"后，自动翻译成英文 goal state，再继续规划。这条**没在 prompt 里教**，是涌现能力。

**Q8：能跑在我家机器人上吗？**

如果你有：(1) 一个能调 API 的 LLM（OpenAI / Claude / 本地 Llama 都行）；(2) 一个能识别物体的视觉模型；(3) 一组预训练的低层动作（抓、放、移）。把它们全部翻译成文字接到 prompt 里——就能跑。**核心代码不到 200 行**。

*所以这一节是想说：实操问题（要不要训、能不能换模型、能不能跑中文、能不能在家做）作者基本都想到了，复现门槛很低。*

---

## 如果你想再深入

按"前作 → 同期 → 后继 → 衍生"四类排序：

1. **前作：Huang et al. 2022 "Language Models as Zero-Shot Planners"**（arXiv 2201.07207）— 第一篇用 GPT-3 给机器人列计划的论文。读它能理解 Inner Monologue **多解决了什么**：闭环。
2. **前作：SayCan（arXiv 2204.01691）**— 同一作者团队的直接前身。Inner Monologue 在它上面加了反馈环。本仓库有 [saycan.md](saycan.md) 笔记。
3. **同期：Chain of Thought（arXiv 2201.11903）**— Wei et al. 提出"让 LLM 写思考步骤"。Inner Monologue 在桌面任务里直接复用了这个套路（`Robot thought: ...`）。
4. **后继：ReAct（arXiv 2210.03629）**— "Reasoning + Acting"。把 Inner Monologue 的思路推到纯文字 agent 上。如果你只能读一篇 LLM agent 论文，读这个。
5. **衍生：Voyager（arXiv 2305.16291）**— Minecraft 里的 LLM agent，骨架就是 Inner Monologue + 代码生成。能直观看到"内心独白"在游戏里跑起来什么样。

*所以这一节是想说：把 SayCan + Inner Monologue + ReAct 这三篇连着读，能看清"LLM agent"这个词在 2022 年怎么从开环走到闭环的。*

---

## 最后一个画面

论文 Figure 5c 里有这样一段对话：

```
Human: Put the blocks in the bowls with mismatching colors.
Robot thought: Goal state is ["Yellow block is in the blue bowl.", ...]
Robot action: Pick the yellow block and place it in the blue bowl.
Scene: Completed ["Yellow block is in the blue bowl."]
Robot thought: Blue block is not in the yellow bowl.
Human: 我改变主意了，请把蓝色方块也放到蓝色的碗里面。
Robot thought: Goal state is ["Yellow block is in the blue bowl.", "Blue block is in the blue bowl."]
Robot action: Pick the blue block and place it in the blue bowl.
Scene: Completed ["Yellow block is in the blue bowl.", "Blue block is in the blue bowl."]
Robot thought: I'm done.
```

这一刻，机器人**用中文听懂了人改主意**、**重新写了目标状态**、**完成了任务**——而 prompt 里**没有任何中文示范**，也**没有"中途换目标"的示范**。

整段交互看起来就像两个人在合作做家务。这是 2022 年第一次有论文让人觉得："哦，机器人不再是只会执行预设脚本的机械玩具，它真的在'听懂'。"

*所以最后一节是想说：Inner Monologue 不仅是一个工程方案，更是开启"LLM 给机器人当大脑"这个时代的标志性瞬间。*
