---
title: "RoboFlamingo"
slug: roboflamingo
topic: planning
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2311.01378"
venue: ICLR
year: 2024
era: classic
num: 82
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

拿一个已经会看图说话的现成大模型当大脑，后面接一只"小手"，就教会机械臂干活——不用从头训。

## 这是个什么场景 — 日常类比

你家厨房里来了一个学霸朋友。他书读得多、眼神好——你指着桌上一堆东西说"把那个红色的小盒子递给我"，他立刻能找到。问题是：他从小不下厨，手生，不知道怎么伸手抓杯子才不打翻、夹爪用多大力气合适。

RoboFlamingo 干的事就是：不再重新培养一个学霸（那太贵了），而是给他戴上一副"机械手手套"（policy head，策略头）。手套里装了个小翻译器，专门把他脑子里的判断（"目标在桌子左前方 30 公分"）翻译成手指关节的具体动作。学霸原本的"看图+听人话"的本事一点不动，只新学一件事：怎么把判断变成动作。这就是这篇论文想证明的——你不需要从零训练 VLA（Vision-Language-Action，能看会听还能动手的大模型），少量机器人数据 + 一个小尾巴就够了。

## 之前的人怎么做的 — 3-5 bullet

- **RT-1 / RT-2**（Google）：从机器人数据从头训练，或者把动作离散化成 token 让 VLM 直接吐出来。优点是端到端，缺点是数据量巨大，复现门槛高。
- **PaLM-E**：把多模态输入塞进 LLM，但主要做高层 planning 而不是低层连续控制。
- **Code as Policies / SayCan**：用 LLM 写代码或选 skill，绕开了"直接输出动作"，但依赖预定义技能库。
- **从零训练的 BC 策略**（如 BC-Z）：视觉编码器 + 简单 MLP，泛化能力受限于数据规模。
- 共同痛点：要么吃数据狠，要么走"语言→技能"间接路线，没充分利用开源 VLM 已经具备的视觉语言能力。

## 这篇论文的关键想法

把"VLM 当 backbone + 小 policy head"做成一种**便宜、可复用的范式**。具体两个关键判断：

1. OpenFlamingo 的视觉语言表征已经够好，机器人任务真正缺的是"动作映射"那一段。
2. 大部分 VLM 参数应该冻住或低成本微调，把可训练参数集中在 policy head 上，这样在 CALVIN 这类 benchmark 上用相对小的算力就能拿到有竞争力的结果。

它的目标不是 SOTA 绝对数值，而是给社区一个"低成本接入 VLA 研究"的开源起点。

## 它怎么做的（方法）— 3-4 段

**Backbone 选型（挑一个现成的学霸）**：与其自己培养一个，不如直接请来一个公认的优等生——OpenFlamingo（开源复刻版 Flamingo）。它的脑子已经组装好了：一只眼睛（视觉编码器，CLIP-ViT 系，专门把图像变成数字特征）、一张嘴（语言模型，LLaMA 系）、还有一座桥把眼睛看到的东西塞给嘴（cross-attention，让语言去"查询"图像信息的注意力机制；perceiver resampler 是把图像信息压缩成少量 token 的小工具）。这一整套就是那个"会看图说话的学霸"，全套打包带走。

**Policy head 设计（给学霸装一只手）**：等等，先慢一拍——hidden state 是什么？简单说，就是大模型读完输入后脑子里的"中间想法"，一长串数字向量，里面已经包含了"图里有什么、用户让我干嘛"。policy head 就是接在这堆"想法"后面的一小段网络，专门把"想法"翻译成机械臂能执行的具体动作（一般是 7 维末端执行器位姿 + 夹爪开合，也可能是离散化的动作 token）。具体 head 内部是 MLP / LSTM / Transformer decoder 哪种，以及动作空间怎么切，需读原文确认。

**训练策略（抄作业式学习）**：训练靠的是 behavior cloning（行为克隆，简称 BC）——给模型一堆"专家这一刻看到了什么 + 那一刻做了什么动作"的配对数据，让它照着抄。具体场地选在 CALVIN 这个带语言指令的桌面操作 benchmark 上：输入是几帧视频 + 一句自然语言指令（比如"打开抽屉"），输出是接下来的动作序列。学霸的脑子大部分冻住不动，只训那座"图像-语言桥"（cross-attention 层）+ 新装上的 policy head（具体冻结策略需读原文）。

**推理流程（实战时怎么跑）**：每一拍把"当前画面 + 任务描述"喂给模型，policy head 直接吐出下一步该怎么动，机器人执行完，再喂下一拍画面，循环往复（这叫闭环控制）。这里和 RT-2 的路线不一样：RT-2 让 VLM 直接生成"动作 token"（把动作当成单词预测），而 RoboFlamingo 倾向于让 head 直接出连续数值的动作（具体细节需读原文）。

## 实验在做什么

- **主战场**：CALVIN benchmark，长程语言指令的桌面操作（开抽屉、推方块、按按钮等组合任务）。
- **核心指标**：完成长链任务的成功率（连续完成 1/2/3/4/5 个子任务的概率），泛化到新场景 / 新指令的能力。
- **对比对象**：从零训练的 baseline（如 HULC、MCIL），以及不冻 backbone 的全量训练版本。
- **消融**：是否冻结 LM、不同 backbone 规模（3B / 9B 等 OpenFlamingo 变体）、policy head 设计选择对效果的影响。
- **结论方向**：证明"VLM + policy head"在 CALVIN 上能打过或追平专门设计的 baseline，且训练成本明显低。具体数字需读原文。

## 你应该懂的几个新词 — 4-6 个

- **Policy head**：策略头。模型主干（VLM）输出表征后，专门把表征映射到动作的最后一段网络。
- **OpenFlamingo**：开源复刻版的 Flamingo（DeepMind 闭源），结构是"视觉编码器 + LLM + cross-attention 桥"，能做图文交错输入。
- **Behavior cloning（BC）**：行为克隆。给定 (观测, 专家动作) 数据对，让模型直接学专家映射，是最朴素的模仿学习。
- **CALVIN**：一个带语言指令的桌面机械臂操作 benchmark，强调长程任务和语言泛化。
- **Cross-attention**：让一个序列（语言）去"查询"另一个序列（视觉 token）相关信息的注意力机制，Flamingo 系靠它把图像信息注入 LM。
- **VLA（Vision-Language-Action）**：把 VLM 扩展成能输出动作的统称，RT-2、OpenVLA、RoboFlamingo 都属于这一类。

## 它和其他论文什么关系

- **承接**：[Flamingo](flamingo.md) / OpenFlamingo 提供 backbone；[CALVIN](calvin.md) 提供评测环境。
- **同期对手**：[RT-2](rt-2.md) 走的是"动作 token 化让 VLM 直接生成"路线，参数和数据都更重；RoboFlamingo 选了更轻量的 head 路线。
- **被启发的后续**：[OpenVLA](openvla.md) 系列把这个思路标准化、规模化；[TinyVLA](tinyvla.md) / [SmolVLA](smolvla.md) 进一步压缩；[π0](pi0.md) 换成 flow-matching 的连续动作输出，是 head 设计的另一支演化。
- **对照思路**：[Diffusion Policy](diffusion-policy.md) 不依赖大 VLM，纯视觉 + diffusion head，可以对比"大 backbone 必要性"。
- 在你的阅读路径里，这是一篇"理解 VLA 范式起点"的关键 classic，先于 OpenVLA 读最合适。

## 我建议这样读 — 3-4 步

1. **先看摘要 + 图 1 架构图**：搞清楚"VLM 在哪、policy head 在哪、什么被冻住"，这是全文骨架。
2. **跳到方法第 3 章，盯 policy head 的具体结构**和动作空间定义；这块是论文的实质贡献。
3. **看 CALVIN 实验表**：重点对比"冻 backbone vs 全量训练"和"不同 backbone 规模"两组消融，理解 cost-performance trade-off。
4. **最后回头看 related work**，把它放进 RT-2 / OpenVLA 这条线里，建立时间序坐标。

## 为什么值得读

- **范式价值**：它是把"开源 VLM + 小 policy head"做成 VLA 标配的早期代表，OpenVLA 等后续工作都建在这个直觉上。读它能理解整条 VLA 路线的"经济版"思路。
- **复现友好**：开源、训练成本相对低，是零基础进入具身操作研究最现实的起点之一。
- **对比锚点**：之后看 RT-2、OpenVLA、π0 时，RoboFlamingo 是天然的"基线参照"，能让你判断后续工作到底改了哪一块、改得值不值。
- **给你的启示**：很多看似要从零训的能力，本质上只是"换个 head"。这种"backbone 复用 + 小尾巴"的思维在很多领域都成立，值得当成方法论记下来。
