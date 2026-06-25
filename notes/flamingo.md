---
title: "Flamingo: a Visual Language Model for Few-Shot Learning"
slug: flamingo
topic: vlm-foundation
difficulty: "\u2B50\u2B50\u2B50\u2B50"
status: deep-read
来源: papers/flamingo/paper.pdf
venue: NeurIPS
year: 2022
era: founder
num: 125
generated_at: 2026-06-25
---

# Flamingo: a Visual Language Model for Few-Shot Learning

> 这是一份给"完全没接触过 AI"的读者看的精读笔记。语言尽量像聊天，公式全部翻译成人话。

## 一句话讲什么（TL;DR）

教一个会聊天的 AI 也学会看图，给它看两三个示范，它就能照着做新题。

*所以这一节是想说：Flamingo 是一个"看几个示范就会做新看图题"的 AI。*

---

## 这是个什么场景

想象你第一次去朋友家吃饭，看他怎么用筷子夹一种没见过的小菜：第一筷他夹了块豆腐蘸了酱，第二筷夹了块鱼也蘸了酱。第三道菜端上来，你不用问，自己就会蘸酱了。

人类就是这样——**看两三个例子，规则就懂了**。

GPT-3 在 2020 年第一次让 AI 也学会了这招：你在对话里给它三五个"问 - 答"示范，它就照着规则答下一题，**不用重新训练**。这种本事有个名字叫**少样本学习（few-shot learning）**。

但到 2022 年初，**会看图的 AI 还做不到这件事**。比如你想让 AI 学会"看 X 光片写诊断"，常规做法是攒几千上万张标注片子，再花几小时甚至几天去训练。换一个任务（比如换成 CT 片），整套流程重来。这就像每学一道新菜都得重新拜师三个月。

Flamingo 想做的就是：**给"会看图的 AI"也装上 GPT-3 那种"看几个示范就会"的能力**。你在提示词里贴几张（图，答案）示范，再丢一张新图，它就照葫芦画瓢。

*所以这一节是想说：Flamingo 把"看几个例子就能学新任务"的能力，第一次带到了图像 + 视频领域。*

---

## 之前的人怎么做的，为什么不够好

- **方案 A：先大规模预训练，再针对每个任务专门微调**。问题是每个任务都要几千几万张人工标注，调超参也很折磨。换 16 个任务就要折腾 16 次。
- **方案 B：[CLIP](clip.md) 这类对比学习模型**。它能把图和文字对齐，但只能"算相似度"——只能做封闭选择题（"这张图是猫还是狗"），不会写描述、答开放问题。
- **方案 C：早期视觉 + 语言生成模型**（如 VisualBERT、SimVLM）。能生成文字，但没在"低数据"模式下表现好；没几张例子它就两眼一抹黑。
- **方案 D：把现成 LLM 拿来 + 接图**。已经有人尝试冻结大语言模型再接视觉编码器，但**没人能同时处理"图文穿插"的长序列**——也就是像网页那样，文字、图、文字、图交替出现的格式。
- **核心难题**：要让模型能"看几个示范学会新任务"，输入必须是**任意长度的图文交错序列**——这正是当时所有视觉模型不擅长的格式。

*所以这一节是想说：现有方法要么得为每个新任务重练，要么不会写文字，要么处理不了图文交错的提示。*

---

## 这篇论文的新想法

**把一个超强的纯文字 LLM 冻死不动，再插几层"专门接眼睛的中转层"，让它接受任意长度的图文混合输入；然后只在网页爬下来的图文海里训这些新层。**

听起来三件事，本质上一句话：**已经训好的部件不要动，只在中间加桥**。

*所以这一节是想说：核心创新是"冻结现成模型 + 学一组桥接层"，让 LLM 长出眼睛但不忘记自己原本会的语言能力。*

---

## 它分几步做的（方法）

把整件事想成"给一位写作大师配一位看图助理"，要让两人合作顺畅，得做 4 件事：

1. 把一张图压成几十个"视觉关键词"（不然信息太多，主笔顾不过来）；
2. 在大师写每段之前，让助理偷偷递个小纸条（视觉信息塞进语言模型）；
3. 规定助理只参考"离这段最近的那张图"（处理图文交错序列）；
4. 拿"互联网这本巨型绘本"当训练教材（网页规模图文数据）。

下面一项一项展开。

### Step 1. Vision Encoder + Perceiver Resampler：把一张大图压成 64 个"视觉词"

**类比**

你拍了一张 4000 万像素的高清照片要发给朋友讲故事。如果直接丢原始像素，对方手机存储和注意力都受不了。你会怎么办？先压成一张缩略图，再挑几句关键的话说："蓝天、雪山、有人在滑雪。"

Flamingo 干的事就是这个"压缩"动作，分两步。

**它在干什么**

1. **第一步——视觉编码器（Vision Encoder）**：用一个已经训好的 NFNet-F6 模型把图片处理成一张二维特征网格（比如 14x14 个特征点），每个点是一串数字。视频就按 1 帧/秒抽帧，每帧单独过编码器，再加上"这是第几帧"的时间标记。
2. **第二步——Perceiver Resampler**：图特征数量是变的（一张图 196 个，一段视频可能上千个）；但下游 LLM 想要"输入个数固定"。Perceiver Resampler 学了 64 个**可学习的查询向量（learned queries）**，让它们去"问"那一堆视觉特征："你们里有什么重要的？"，然后吐出固定的 64 个视觉 token。

> **特征（feature）**：神经网络对图片提炼出的一串数字摘要，类似"这块区域有边缘、有红色、纹理粗糙"。
>
> **token**：模型看世界的最小单位，文字里是一个词或子词，视觉这边就是一小块图的数字摘要。
>
> **Perceiver**：DeepMind 自家的一种通用架构，用少量"提问向量"去关注海量输入，能把变长输入压成定长输出。
>
> **可学习查询（learned query）**：这 64 个向量不是从图里来的，是模型一开始随便初始化、然后在训练里慢慢学出来的"问题模板"。可以想成一组面试官，每个面试官有自己擅长追问的方面。

**为什么这步有用**

- 视觉特征数量爆炸，直接丢给 LLM 算不动。压成 64 个 token，**计算量随后续注意力变成常数级**。
- 用 Perceiver 比简单 MLP 或 Transformer 更聪明：消融实验里它比同等参数的 Transformer 高 4 分、比 MLP 高 4.1 分。

**Perceiver Resampler 和 [BLIP](blip.md) Q-Former 的对比**

两者都是"变长视觉特征 -> 定长 token"的压缩桥梁，但设计不同：

| 维度 | Perceiver Resampler（Flamingo） | Q-Former（BLIP-2） |
|------|------|------|
| 查询数量 | 64 个 learned queries | 32 个 learned queries |
| 参数来源 | 从零训练 | 用 BERT-base 初始化 |
| 注意力方向 | queries cross-attend 视觉特征 | 双向：queries 既 self-attend 也 cross-attend |
| 额外损失 | 无，只靠下游 LM loss 训 | 三阶段预训练（ITC + ITG + ITM） |
| 效果 | 泛化好但需要大 LLM 加持 | 轻量也能出好结果 |

核心区别：Perceiver Resampler 更"简单粗暴"——全靠下游生成 loss 驱动 queries 学到什么该保留什么；Q-Former 多了对比学习信号，让 queries 学得更快但也更复杂。

*所以这一节是想说：先把图（甚至视频）通过一个固定大小的"压缩瓶颈"变成 64 个统一规格的视觉词，方便后面塞进语言模型。*

---

### Step 2. GATED XATTN-DENSE：在冻结 LLM 中间插"看图开关"

**类比**

你公司里有一位资深主笔，文章写得极好，但不能让他重新培训——重练成本太高，还会把原本的写作风格搞乱。怎么让他写带配图的文章？

> 在他写每一段之前，安排一位"图片研究员"先把图看懂，提炼出几个要点。研究员一开始只是悄悄递纸条——主笔可以选择看不看。等磨合一段时间后，研究员的纸条越来越准，主笔自然越来越依赖。

Flamingo 给冻结的 70B Chinchilla 语言模型，每隔几层插入一个**门控交叉注意力层（GATED XATTN-DENSE）**——这就是那位"图片研究员"。

**它在干什么**

1. 原本的语言模型每一层包含两个动作：自注意力（看自己之前的文字）+ 前馈网络（再加工一下）。
2. Flamingo 在某些层之前**新插入一对小模块**：
   - **交叉注意力（cross-attention）**：让文字 token 去"问"那 64 个视觉 token——"我现在写这个词，跟图里哪部分有关？"
   - 紧跟一个前馈网络再加工一下。
3. 关键的"开关"在于**tanh 门控**：新插入模块的输出乘以 `tanh(alpha)` 才加回主干，**alpha 初始化为 0**。

> **自注意力（self-attention）**：Transformer 的核心动作，每个 token 都看一眼序列里其他所有 token，再决定自己怎么更新。
>
> **交叉注意力（cross-attention）**：和上面类似，但问的对象是另一套 token——这里就是文字 token 去问视觉 token。
>
> **前馈网络（FFN/dense）**：一层简单的"非线性数字加工"，把每个 token 的数字进一步变换。
>
> **门控（gating）**：在输出上乘一个 0~1 之间的开关因子，开关 0 时这条支路完全没贡献，开关 1 时全力输出。tanh 初始化为 0 意味着开关一开始全闭。
>
> **冻结（freeze）**：训练时这部分参数完全不更新。Flamingo 把视觉编码器和 LLM 都冻死，只训中间桥。

**关键公式翻译成人话**

```
y = LM_layer(x) + tanh(alpha) * CrossAttn(x, vision_tokens)
```

人话：**新答案 = 原本 LLM 的回答 + 一个开关 x "看图后想再加上的那部分"**。开关初始为 0，意味着模型刚开始训练时**完全等同于一个看不见图的纯文本 LLM**——这保证训练稳定不崩。

**插入频率的工程 trade-off**

论文测了"每层都插"vs"每 N 层插一次"：

| 插入策略 | 4-shot 平均分 | 训练速度 |
|----------|-------------|----------|
| 每层都插 | 70.7（最高） | 1x（最慢） |
| 每 4 层插一次 | 68.8（-1.9） | 1.66x（快 66%） |
| 每 8 层插一次 | 67.2（-3.5） | 更快 |

最终选择：Flamingo-80B 每 7 层插一次（工程上的甜蜜点）；Flamingo-3B/9B 每 1 或 4 层。这告诉我们**不一定所有层都需要视觉信息**——底层处理语法/句法，只有高层需要融入语义。

**为什么这步有用**

- 不动 LLM 原本的参数 = 不会"灾难性遗忘"。消融显示：如果允许 LLM 跟着一起训，整体分数掉 8 分；从头训更糟，掉 12.9 分。
- 0 初始化 tanh 门控 = 训练初期模型表现等同原 LLM，慢慢让视觉信号渗透进来。去掉这个门控，分数掉 4.2 分而且经常训崩。
- 这种"插楼层"的做法保留了 LLM 的所有先验，又给了它读图的通道。

**和其他桥接方案的对比**

| 方案 | 代表 | 做法 | 分数 |
|------|------|------|------|
| GATED XATTN-DENSE | Flamingo | 门控 cross-attn + FFN 新层 | 70.7 |
| VANILLA XATTN | - | 不带 tanh gating 的 cross-attn | 66.9 |
| GRAFTING | Limber (2022) | 把视觉 token 直接拼在文字前面 | 63.1 |
| 线性投影 | LLaVA (后来) | 一个 MLP 把视觉映射到 LLM 空间 | - |

GRAFTING 为什么差？因为把视觉 token 当"文字"拼进去，LLM 没有机制区分"这是图还是字"——所有 token 走同一条自注意力，信噪比低。GATED XATTN-DENSE 专门开了一条"视觉专线"。

*所以这一节是想说：与其重训整个 LLM，不如在它中间插几层"会看图的小开关"，开关一开始全闭，训练里慢慢拧开，既稳定又不丢原本的语言能力。*

---

### Step 3. Per-image attention masking：处理任意长度的图文交错序列

**类比**

你在读一本图文并茂的小说，每段文字旁边有插图。你读到某一段时，脑子里"主要参考"的是**这一段对应的那张图**——虽然之前所有插图也都看过、都能记住，但当下注意力主要给最近这张。

Flamingo 模型读图文序列也用同一种规则。

**它在干什么**

- 训练样本是从网页上抓来的"文字、图、文字、图、文字......"长序列。
- 对每个文字 token，**只让它通过交叉注意力直接看"它之前最近的那一张图"**——不是所有图。
- 但因为 LLM 内部的自注意力还在工作，文字之间的依赖完全保留——**通过文字串联，模型间接知道前面所有图的内容**。

**具体的 masking 机制**

假设一条训练序列长这样：

```
[图A] 文字段1 [图B] 文字段2 [图C] 文字段3
```

那么在 cross-attention 中：
- 文字段1 的所有 token 只 attend 图A 的 64 个视觉 token
- 文字段2 的所有 token 只 attend 图B 的 64 个视觉 token
- 文字段3 的所有 token 只 attend 图C 的 64 个视觉 token

但在 LLM 的 self-attention 中：文字段3 可以看到段2 和段1 的**文字 hidden states**——通过文字间接获得了图A 和图B 的信息。

**为什么不让每段文字看所有图？**

论文做了消融——让文字直接看之前所有图反而更差。原因是：

1. **梯度冲突**：多张图的梯度信号叠加，优化更难收敛
2. **计算量**：32 张图 x 64 token = 2048 个 KV 要 attend，训练速度暴跌
3. **信号稀释**：大多数文字只跟最近的图相关，看太多图等于噪声

**这设计带来的泛化魔法**

因为每段文字只看"最近一张图"的 64 个 token，cross-attention 的复杂度跟"总共有几张图"无关——**序列里塞 5 张图和 32 张图，每段文字的计算量完全一样**。所以：

- 训练时每条样本只放最多 5 张图（M3W 限制）
- 推理时直接塞 32 张图做 32-shot few-shot，模型毫无压力

这种"训少推多"的泛化能力是 Flamingo 的招牌卖点。

*所以这一节是想说：每段文字只直接看最近一张图，但靠文字之间的连接间接获取所有图的信息，这种节制的设计反而让模型能处理远超训练长度的图文序列。*

---

### Step 4. M3W + ALIGN + LTIP + VTP：在网页爬来的图文海里训练

**类比**

教小孩学语言，最有效的不是给他一堆"看图填空"的卡片，而是让他翻一本本绘本——文字和图自然交错，故事连贯。Flamingo 用的训练材料就是"互联网这本巨型绘本"。

**它在干什么**

Flamingo 在四种数据上同时训练，每种数据有自己的损失权重：

| 数据集 | 类型 | 规模 | 来源 |
|--------|------|------|------|
| M3W (MultiModal MassiveWeb) | 图文交错 | 4300 万网页 | HTML DOM 定位图在文字中的位置 |
| ALIGN | 图文对 | 18 亿对 | 图片 + alt-text |
| LTIP (Long Text & Image Pairs) | 高质量图文对 | 3.12 亿对 | 自行收集，描述更长 |
| VTP (Video & Text Pairs) | 视频文本对 | 2700 万段（均约 22s） | 视频 + 句子描述 |

> **alt-text**：HTML 里给图片配的文字说明，本来给视障读者用的。
>
> **DOM**：浏览器把网页解析成的元素树，能告诉你"这张图在哪段文字之间"。
>
> **多目标训练（multi-objective）**：四种数据各算一个 loss，加权求和，反向传播一次更新参数。

**M3W 的处理细节**

原始网页很乱（广告、导航栏、不相关图片），Flamingo 怎么把它变成训练数据？

1. 从 HTML DOM 里提取图片和文字的位置关系
2. 在图片位置插入 `<image>` 占位符，段落结束加 `<EOC>` (end of chunk)
3. 每文档采样 L=256 tokens + 最多 N=5 张图
4. 图片必须满足最小尺寸 + 不是 logo/icon

这样产出的序列天然保持了"文字——图——文字——图"的交错结构。

**训练策略：梯度累加 vs 轮流**

四种数据怎么混合？论文比了两种：

- **轮流（round-robin）**：一个 batch 用 M3W，下个 batch 用 ALIGN，再下个用 LTIP...
- **梯度累加（gradient accumulation）**：一个大 step 里四种数据各跑一遍，梯度加起来一次更新

结果：梯度累加赢了 7.8 分。因为轮流会导致一种数据的梯度还没消化，就被另一种覆盖——相当于四个老师同时教一个学生，但每次只让一个老师说话，学生来不及整合。

**数据消融揭示的真相**

| 去掉什么 | 分数变化 | 启示 |
|----------|----------|------|
| 去掉 M3W | -17.3% | 少样本能力的命根 |
| 去掉 ALIGN + LTIP | -9.8% | 图文对补充细粒度对齐 |
| 去掉 VTP | 所有视频任务变差 | 视频理解离不开视频数据 |
| 用 LAION 替代自有 ITP | 略降 | 高质量长描述 > 纯量大 |

**最核心的发现**：去掉 M3W 比去掉图文对伤害大将近一倍。这说明**少样本能力不是靠"看很多图文对"获得的，而是靠训练"图文交错序列"这种结构获得的**。

*所以这一节是想说：Flamingo 的少样本能力不是模型架构变出来的，是训练数据"图文交错"的结构带出来的。架构只是让模型能消化这种结构。*

---

### 完整数据流总结

```
输入序列：[图1] 文字1 [图2] 文字2 ... [图N] 文字N [新图] ?
                |          |                |        |
                v          v                v        v
         NFNet-F6    NFNet-F6         NFNet-F6   NFNet-F6
         (冻结)      (冻结)           (冻结)     (冻结)
                |          |                |        |
                v          v                v        v
         Perceiver   Perceiver        Perceiver  Perceiver
         Resampler   Resampler        Resampler  Resampler
         (64 token)  (64 token)       (64 token) (64 token)
                |          |                |        |
                +----------+----------------+--------+
                |
                v
        冻结 Chinchilla LLM (70B)
        + 每 N 层插入 GATED XATTN-DENSE
        (per-image masking: 每段文字只看最近的图)
                |
                v
          自回归输出答案
```

可训练参数只有：Perceiver Resampler + GATED XATTN-DENSE 层（约占总参数的 2%）。

**参数冻结策略的深层原因**

为什么"只训 2% 参数"反而比"全部训"效果好？这违反直觉，但道理很清楚：

1. **LLM 的语言先验是最贵的资产**。Chinchilla-70B 在 1.4 万亿 token 上训了几周才获得的语言能力，如果在相对小的视觉数据上微调，参数会向"图像描述"偏移，把"常识推理""逻辑链""代码理解"这些能力覆盖掉。
2. **Vision Encoder 的对比学习特征已经足够好**。NFNet-F6 通过 ALIGN 式对比学习训出来的特征本身就是通用的视觉表征，不需要针对下游任务再调。消融表显示换成更好的 vision encoder（NFNet-F6 vs F0）涨 8 分——说明视觉特征质量很重要，但不需要在 Flamingo 训练中再优化。
3. **桥接层的参数效率极高**。Perceiver Resampler 约 200M 参数 + 所有 GATED XATTN-DENSE 层加起来约 1.5B——相比 80B 总参数只有 ~2%，但它们是"连接两个已经训好的世界"的最小公约模块。

这个设计启发了后续整个"适配器（adapter）"范式——LoRA、QLoRA 等参数高效微调方法，本质上都是"冻大部分、只训桥"的 Flamingo 哲学的推广。

*所以这一节是想说：整个方法就是"冻结的眼睛 + 压缩桥 + 冻结的大脑 + 看图开关"，只训开关和桥。2% 参数撬动 98% 能力，这是 Flamingo 最优雅的设计。*

---

## 关键数字（What works）

数字本身不重要，重要的是它们告诉你"哪个设计选择真的关键"。

| # | 数字 | 怎么算的 | 对比 | 人话 |
|---|------|----------|------|------|
| 1 | 16 个任务 32-shot 全部 few-shot SOTA | 用一个 Flamingo-80B 模型，不改权重，在 16 个 benchmark 上各给 32 个示范 | 之前没人能用一个模型扫这么多少样本榜 | 一个模型、不动权重、看 32 个示范就刷穿 16 个榜 |
| 2 | 6/16 个任务超过满量微调 SOTA | 32 个示范 vs 别人用几万~几十万标注数据 | 传统方法用了约 1000 倍更多任务专属数据 | 32 道题考生干赢了刷几万道题的题海选手 |
| 3 | 去掉 M3W -> 分数掉 17% | 消融实验，70.7 -> 53.4 | 图文交错数据是少样本能力的根 | 少了"绘本式"训练数据，什么架构都救不回来 |
| 4 | 训练放 5 张图，推理可塞 32 张 | M3W 训练样本最多 5 张图，评测给 32 张 | 典型 Transformer 超出训练长度就崩 | per-image masking 让"训少推多"成为可能 |
| 5 | 3B -> 9B -> 80B 分数单调上升 | 三档参数版本，越大越好 | 与 GPT-3 scaling 现象一致 | 脑容量越大、能从越多示范里学到越多 |
| 6 | 冻结 LLM vs 微调 -> 差 8%；从头训 -> 差 12.9% | 消融表第 (viii) 行 | 冻结 70.7，微调 62.7，从头训 57.8 | 把训好的部件碰都不碰，反而最好 |

*所以这一节是想说：数据告诉我们决定胜负的两件事——图文交错训练数据、以及对预训练 LLM 的"绝不动"克制。*

---

## 实验结果说明了什么

论文跑了 16 个任务（5 个 dev + 11 个 held-out），三种评测模式（zero-shot / few-shot / fine-tune），还有一张大消融表。下面按"结论先行"展开。

**结论 1：few-shot 能力是真的，不是 cherry-pick**

在 11 个"hold-out"测试集（模型设计过程中从未看过的任务）上，Flamingo-80B 32-shot 依然全面领先。这排除了"在 dev set 上调超参调出来"的怀疑。

**结论 2：scaling 对 few-shot 格外重要**

| 模型 | COCO CIDEr 0-shot | 4-shot | 32-shot |
|------|-------------------|--------|---------|
| Flamingo-3B | 73.0 | 85.0 | 99.0 |
| Flamingo-9B | 79.4 | 93.1 | 106.3 |
| Flamingo-80B | 84.3 | 103.2 | 113.8 |

两个观察：(1) 大模型每一档都更强；(2) 大模型从 0-shot 到 32-shot 的增益更大（80B 涨 29.5，3B 只涨 26.0）。这说明**模型越大，越能从更多示范中提取规律**——in-context learning 是一种涌现能力。

**结论 3：M3W 是少样本能力的唯一来源**

去掉 M3W 后（只剩图文对和视频对），分数从 70.7 暴跌到 53.4。而去掉图文对只掉到 60.9。结论：图文对教模型"看图说话"，但只有图文交错序列教模型"从示范中学习模式"。

**结论 4：冻结胜过微调，违反直觉但原因清晰**

大家直觉认为"让 LLM 也跟着学"应该更好。但实验打脸——微调 LLM 反而掉 8 分。原因是**灾难性遗忘**：LLM 微调时把原本记住的语言规律和世界知识覆盖了。冻结相当于"只加新知识，不覆盖旧知识"。

**结论 5：fine-tune 模式下也能 SOTA**

当给 Flamingo 全量数据做 fine-tune 时（解冻所有参数），它在 VQAv2 (82.0)、VATEX、VizWiz、MSRVTTQA、HatefulMemes 上创下新 SOTA——说明架构本身也很强，不只是靠 few-shot 这个评测模式讨巧。

**结论 6：工程 trade-off 实用价值极高**

消融表第 (v) 行："每 4 层插一次 cross-attention"只掉 1.9 分但快了 66%。这意味着部署时可以用轻量版，实际损失微乎其微。这个发现对后续所有 VLM 的工程化都有指导意义。

*所以这一节是想说：实验证明了三件事——图文交错数据是少样本之源、冻结 LLM 是正确策略、架构可以在"效果-效率"之间灵活取舍。*

---

## 你应该懂的几个新词

> **VLM（Vision Language Model，视觉语言模型）**：既能看图又能写字的 AI。Flamingo 是早期的代表性 VLM 之一。

> **LLM（Large Language Model，大语言模型）**：只懂文字的大模型，比如 GPT-3、Chinchilla。Flamingo 用 Chinchilla-70B 当语言主干。

> **few-shot learning（少样本学习）**：在提示里给几个"问 - 答"示范，让模型直接在推理时学会新任务，不调权重。Flamingo 把这套思路从文本搬到视觉。

> **in-context learning（上下文学习）**：few-shot 的具体形式——例子写在 prompt 里，模型在生成时一边看示范一边照做。

> **zero-shot / few-shot / fine-tune**：分别是"不给例子"、"给几个例子"、"给上千例子并改权重"三档。Flamingo 主打前两档。

> **Perceiver Resampler**：Flamingo 的视觉压缩模块。用 64 个可学习查询去提取定长视觉 token。

> **GATED XATTN-DENSE**：Flamingo 的桥接模块。在冻结 LLM 中间插入的"门控交叉注意力 + 前馈层"，初始关闭、慢慢拧开。

> **cross-attention（交叉注意力）**：让一组 token 去关注另一组 token 的注意力机制。Flamingo 用它让文字看视觉。

> **frozen / catastrophic forgetting（冻结 / 灾难性遗忘）**：训练时不动某些参数叫冻结。如果让已经学好的模型跟着新任务一起训，它会"忘掉"原本会的能力——这就是灾难性遗忘。

> **interleaved image-text data（图文交错数据）**：网页那种"文字、图、文字、图"交替的序列。Flamingo 的少样本能力直接来自训练这种数据。

> **M3W**：DeepMind 自己从 4300 万网页爬的图文交错训练集，是 Flamingo 的招牌数据。

> **autoregressive generation（自回归生成）**：一字一字往外蹦，每个字依赖前面所有字。Flamingo 输出文字就是这种方式。

> **tanh gating（tanh 门控）**：用 tanh(alpha) 作为开关因子（alpha 初始化为 0），让新插入的模块从"完全沉默"慢慢学会"该发多大声"。

*所以这一节是想说：上面这十几个词以后看任何 VLM 论文都会反复出现，先把它们和生活类比挂钩。*

---

## 它有什么搞不定的

Flamingo 不是万能的，论文自己也老实交代了：

- **继承 LLM 的毛病**：会幻觉、会瞎编、对超长序列泛化差。LLM 怎么翻车，Flamingo 就怎么翻车。
- **在分类任务上不如对比模型（[CLIP](clip.md)）**：CLIP 直接为图文检索优化，分类是它的特长。Flamingo 走开放生成路线，分类反而吃亏。
- **in-context learning 对示范敏感**：示范的顺序、措辞、内容都会大幅影响结果；而且 shot 数往大了堆，推理算力直线上升、效果增益却放缓。
- **闭源**：Flamingo 模型权重和 M3W 数据都没开放。开源界后来有 OpenFlamingo 复现，但效果差一截。
- **只能 1 FPS 采帧**：视频理解限于粗粒度时间尺度，快速动作或细微时序变化容易漏掉。对比后来的 VideoLLM 系列能处理更密集帧率。
- **推理成本随 shot 数线性增长**：32-shot 意味着 32 张图的 64 token 都在 KV cache 里，显存和延迟翻倍。实际部署中 4-8 shot 更经济。

*所以这一节是想说：Flamingo 在"开放、灵活、少样本"上很强，但在精确分类、对 prompt 鲁棒性、可复现性、视频细粒度理解上有硬伤。*

---

## 它和别的论文是什么关系

- **时间轴上的位置**：[CLIP](clip.md)（2021，对比学习）-> **Flamingo（2022，图文交错 + few-shot）** -> [BLIP-2](blip.md)（2023.1，Q-Former）-> LLaVA（2023.4，开源指令微调）-> 后续 Qwen-VL / InternVL 等。
- **和 [CLIP](clip.md) 的关系**：CLIP 是 Flamingo 的"眼睛预训练方式"——Flamingo 自己的 NFNet-F6 也用对比损失训练。但 CLIP 只能做分类/检索，Flamingo 接 LLM 后能开放生成。
- **和 LLaVA 的关系**：两者哲学相反。
  - **LLaVA**：用 GPT-4 造指令数据，模型架构极简（一层线性投影），靠"练习题"取胜，开源便宜。
  - **Flamingo**：架构精巧（Perceiver Resampler + GATED XATTN-DENSE），训练数据是网页原矿（M3W），靠"训练数据结构"取胜，闭源昂贵。
  - LLaVA 论文里 OpenFlamingo 在它的评测集上只有 19.1 分，LLaVA 是 67.3——但那是"指令跟随"赛道，Flamingo 主打的是"few-shot 适应新任务"，赛道不同。
- **和 [BLIP](blip.md)/BLIP-2 的关系**：BLIP-2 的 Q-Former 是 Perceiver Resampler 的"升级版"——加了对比学习信号让 queries 学得更快。两者放一起读最能看清"桥接模块"的设计空间。
- **和 [RT-2](rt-2.md)、[OpenVLA](openvla.md) 的关系**：Flamingo 把 "在 LLM 中插入冻结模块 + 跨模态条件化" 这套范式立住了；后来的具身 VLA 模型直接借鉴——把"视觉 + 文字 -> 文字"换成"视觉 + 指令 -> 动作 token"。可以说 Flamingo 是 VLA 模型的精神祖父。
- **集合关系**：Flamingo 属于"冻结 LLM + 桥接模块"路线的奠基者；LLaVA、BLIP-2 都是这条路线后续的不同变体。

*所以这一节是想说：Flamingo 是"冻结 LLM 接眼睛"路线的奠基论文，后来开源世界的 LLaVA 等是它的精简版后裔。*

---

## 和本导读的关系

本导读系列关注"从看懂到能动"的 AI 路线。Flamingo 在其中的位置：

**向上连接（Flamingo 站在谁的肩膀上）**：
- [CLIP](clip.md)：提供了"用对比学习训视觉编码器"的方法论，Flamingo 的 NFNet-F6 用同样思路训练
- GPT-3：证明了 in-context learning 的存在，Flamingo 把它搬到视觉

**向下辐射（谁站在 Flamingo 的肩膀上）**：
- [BLIP-2](blip.md)：Q-Former 是 Perceiver Resampler 的进化，更轻量也更易训
- LLaVA：简化了桥接（一层投影），但继承了"冻结 LLM 接视觉"的核心哲学
- [RT-2](rt-2.md)：把 VLM 架构搬到机器人——输出从"文字"变成"动作 token"
- [OpenVLA](openvla.md)：开源的 VLA，直接继承了"视觉 -> 压缩 -> 冻结 LLM -> 生成"的数据流

**核心贡献给路线图**：
Flamingo 证明了"不需要动已有模型，只加桥就能获得新能力"这个范式。这个思想后来成了具身 AI 的基础假设——与其从头训一个看-想-做一体的巨型模型，不如把"看"、"想"、"做"各自训好再用桥连接。

*所以这一节是想说：Flamingo 奠定了"模块化 + 桥接"的 VLM 范式，这个范式一路延伸到了具身 AI 领域。*

---

## 思考题

用来检验你是否真的理解了这篇论文的核心，而不只是"看过了"。

**Q1：为什么 Flamingo 选择冻结 LLM 而不是微调？如果微调，可能出现什么问题？**

<details>
<summary>参考思路</summary>

冻结 LLM 是为了避免灾难性遗忘——LLM 花了巨大算力学会的语言能力和世界知识，一旦在视觉数据上微调，这些知识就会被覆盖。消融实验证明：微调 LLM 掉 8 分，从头训掉 12.9 分。冻结保证了"只加新能力，不损旧能力"。
</details>

**Q2：M3W 数据被去掉后分数掉 17%，而去掉图文对只掉 10%。这说明 few-shot 能力的来源是什么？**

<details>
<summary>参考思路</summary>

Few-shot 能力来自"图文交错序列"这种训练数据结构，而非简单的图文配对。M3W 的网页数据天然是"图-文-图-文"交替的，模型在这种数据上学会了"看前面的图文示范 -> 照着模式回答新问题"。图文对只教模型"看图说话"，不教它"从示范中提取模式"。
</details>

**Q3：Perceiver Resampler 输出固定 64 个 token，如果改成 16 个或 256 个会怎样？**

<details>
<summary>参考思路</summary>

16 个 token：信息压缩太狠，细节丢失，精细视觉任务（如 VQA 需要读图中文字）会变差。256 个 token：信息更完整，但 cross-attention 计算量翻 4 倍，32-shot 推理时 KV cache 爆炸。64 是精度和效率的平衡点。论文选 64 不是拍脑袋——Perceiver 架构的 latent bottleneck 设计就是为了找这个甜蜜点。
</details>

**Q4：tanh 门控初始化为 0 的设计，和"残差连接"有什么关系？为什么不用 sigmoid？**

<details>
<summary>参考思路</summary>

残差连接是 `y = x + F(x)`，tanh 门控是 `y = x + tanh(alpha) * F(x)`。当 alpha=0 时 tanh(0)=0，所以 `y = x`——新模块完全不贡献，模型等同于原始 LLM。这保证初始化就是一个"合法解"（原 LLM 已经能工作），训练从好的起点出发。用 sigmoid 的话，sigmoid(0)=0.5，初始化时新模块就有 50% 贡献，会扰乱原 LLM 的输出。
</details>

**Q5：Flamingo 训练时每序列只放 5 张图，推理时为什么能放 32 张而不崩？**

<details>
<summary>参考思路</summary>

因为 per-image cross-attention masking——每段文字只 attend 最近一张图的 64 个 token。无论序列中有 5 张图还是 32 张图，每段文字的 cross-attention 计算量完全相同。多出来的图的信息通过 LLM self-attention 在文字之间间接传递。所以"图的总数"不会改变任何层的计算行为。
</details>

**Q6：如果你要复现一个"穷人版 Flamingo"（单卡 24G），会砍哪些设计？保留哪些？**

<details>
<summary>参考思路</summary>

必须保留：(1) 冻结 LLM（核心设计哲学）；(2) per-image cross-attention masking（few-shot 泛化的保证）；(3) 图文交错训练数据结构。可以砍：(1) NFNet-F6 换成 CLIP ViT-B（小但仍有效）；(2) Perceiver Resampler 换成简单 MLP（掉 4 分但省参数）；(3) LLM 从 70B 换成 7B；(4) 每 8 层插一次 cross-attention。这基本就是 OpenFlamingo 走的路线。
</details>

**Q7：Flamingo 和 GPT-4V 的最大区别是什么？两者的设计哲学有何不同？**

<details>
<summary>参考思路</summary>

Flamingo 是"后装外挂"——先有训好的 LLM，再插入视觉桥接模块，LLM 参数不动。GPT-4V（推测）是"原生多模态"——从预训练阶段就同时看图和文字，视觉不是后加的而是"生来就有的感官"。Flamingo 的优势是模块化、可复用；劣势是视觉和语言的融合深度有限（只通过 cross-attention 交互，不如原生融合紧密）。GPT-4V 融合更深但训练成本极高且不透明。
</details>

---

## 一些好奇心问答（FAQ）

**Q1：Flamingo 多大？我自己电脑能跑吗？**

最大版本 Flamingo-80B（800 亿参数），需要数十张高端 GPU。完全跑不动。社区有 OpenFlamingo（基于 LLaMA），最小 3B 版本可以在单卡 24GB 上跑推理。

**Q2：模型权重和 M3W 数据能下载吗？**

不能。Flamingo 是闭源的——DeepMind 出于安全和数据合规考虑没开放。要复现，看 OpenFlamingo（LAION 团队基于公开 LAION 和 Multimodal C4 复现的版本）。

**Q3：为什么要专门做 Perceiver Resampler，不能直接把 196 个视觉特征丢给 LLM？**

可以，但代价大。LLM 的交叉注意力计算量正比于视觉 token 数 x 文字 token 数。32-shot 提示里每张图 196 个特征，乘以 32 张图 + 千字文本，算力爆炸。压成 64 个，计算变常数级。消融也证明 Perceiver 比同等参数的 Transformer/MLP 都好。

**Q4：tanh 门控为什么初始化为 0？**

为了"训练初期模型 = 原始 LLM"。这样训练第一步绝不会因为"还没学会怎么看图"就把 LLM 的能力搅乱。慢慢拧开开关，模型自己决定吸收多少视觉信号。这是个**数值稳定性 + 初始化即合法解**的双重设计。

**Q5：训练时只放 5 张图，推理时怎么能塞 32 张？**

关键在 per-image cross-attention masking——每段文字只直接看最近一张图，所以"图的总数"不会拉爆 attention 矩阵。文字之间的依赖通过 LLM 自注意力保留下来，间接看到所有图。这种节制让序列长度可以远超训练时见过的范围。

**Q6：Flamingo 和 GPT-4V / Gemini 的关系？**

Flamingo 的"冻结 LLM + 视觉桥接"是当代 VLM 的范式起点。GPT-4V 和 Gemini 的具体架构没公开，但学界普遍认为思路一脉相承——可能用更复杂的桥接、更大的数据、原生多模态预训练。Flamingo 算 VLM 时代的"祖师爷"之一。

**Q7：能用 Flamingo 做机器人控制吗？**

论文本身没做。但 Flamingo 之后，PaLM-E、[RT-2](rt-2.md)、[OpenVLA](openvla.md) 等具身模型直接借鉴了这套范式——把"视觉 + 文字 -> 文字"换成"视觉 + 指令 -> 动作 token"。可以说 Flamingo 是 VLA（Vision-Language-Action）模型的精神祖父。

**Q8：32-shot 推理慢吗？**

慢，而且贵。in-context learning 的代价是每次推理都要带着所有示范一起算 attention，shot 数翻倍，时间和显存都涨。论文也承认这是局限——所以"应用部署里 4-8 shot 通常更经济"。

*所以这一节是想说：Flamingo 是 VLM 范式的起点；它的设计选择（压缩、门控、冻结）影响了后续所有 VLM 和 VLA 模型。*

---

## 如果你想再深入

按"前传 - 同期对手 - 续作 - 衍生方向"四类排序：

1. **前传：[CLIP](clip.md)（2021）** — 对比学习训练的视觉编码器是 Flamingo "眼睛"的训练方式，也是后来所有 VLM 的视觉底座。
2. **前传：Chinchilla（2022）** — Flamingo 的语言主干就是冻结的 Chinchilla-70B。理解它的训练规律有助于理解 Flamingo 怎么 scale。
3. **同期对手：[BLIP-2](blip.md)（2023.1）** — 用 Q-Former 做视觉 -> 文本桥接，比 Flamingo 的 GATED XATTN-DENSE 更轻量。两者放一起读最能看清"桥接模块"的设计空间。
4. **续作：OpenFlamingo（2023）** — 社区基于 LLaMA + LAION 数据的开源复现版，效果比原版差但能拿来玩。
5. **续作/衍生：LLaVA（2023.4）** — 开源 VLM 的另一条路（指令微调路线），是 Flamingo 哲学的反面。
6. **衍生：[RT-2](rt-2.md) / [OpenVLA](openvla.md) / PaLM-E** — Flamingo 范式被搬到具身领域：视觉 + 指令 -> 动作 token。

*所以这一节是想说：把 Flamingo + [CLIP](clip.md) + LLaVA + [BLIP](blip.md) 这四篇连起来读，就能看清 2021-2023 年 VLM 的全部主路线。*

---

## 原文信息

- **标题**：Flamingo: a Visual Language Model for Few-Shot Learning
- **作者**：Jean-Baptiste Alayrac, Jeff Donahue, Pauline Luc, Antoine Miech, Iain Barr, Yana Hasson, Karel Lenc, Arthur Mensch, Katie Millican, Malcolm Reynolds, Roman Ring, Eliza Rutherford, ... Karen Simonyan (DeepMind)
- **发表**：NeurIPS 2022
- **链接**：https://arxiv.org/abs/2204.14198

```bibtex
@inproceedings{alayrac2022flamingo,
  title={Flamingo: a Visual Language Model for Few-Shot Learning},
  author={Alayrac, Jean-Baptiste and Donahue, Jeff and Luc, Pauline and Miech, Antoine and Barr, Iain and Hasson, Yana and Lenc, Karel and Mensch, Arthur and Millican, Katie and Reynolds, Malcolm and Ring, Roman and Rutherford, Eliza and Cabi, Serkan and Han, Tengda and Gong, Zhitao and Samangooei, Sina and Monteiro, Marianne and Menick, Jacob and Borgeaud, Sebastian and Brock, Andrew and Nematzadeh, Aida and Sharifzadeh, Sahand and Bi{\'n}kowski, Miko{\l}aj and Barreira, Ricardo and Vinyals, Oriol and Zisserman, Andrew and Simonyan, Karen},
  booktitle={Advances in Neural Information Processing Systems},
  volume={35},
  year={2022}
}
```
