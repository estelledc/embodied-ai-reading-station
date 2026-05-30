---
title: "LLaVA: Visual Instruction Tuning"
slug: llava
topic: 一. VLM 基座
difficulty: ⭐⭐
status: auto-summary
来源: papers/llava/paper.pdf
generated_at: 2026-05-30
---

# LLaVA: Visual Instruction Tuning

> 这是机器辅助生成的客观摘要笔记。教学版精读笔记由用户按节奏触发后单独成稿。

## 一句话讲什么（TL;DR）
把"看图+按指令回答"做成端到端模型：用 GPT-4 自动造图文指令数据，再训一个能看图聊天的多模态助手。

## 这篇论文要解决什么问题（Why this paper）

想象你下班回家，拍了张冰箱内部照片发给一个 AI 助手，问它："今晚还能凑出一份酸奶燕麦碗吗？"——你期待它真的看图，然后说"还有一盒草莓酸奶和半袋燕麦，可以"。这件事在 2023 年初的开源世界里几乎不存在。

为什么？因为当时的 AI 工具是这样分工的：

- 视觉模型（CLIP、检测器、分割器）虽强，但每个都只解决一个固定任务，**接口僵硬**——你不能用自然语言切换它的"工作模式"。它们像只会做一道菜的厨师。
- 大语言模型（LLM，Large Language Model，大型语言模型）能听懂人话，但**眼盲**——只能处理文字。它像电话客服，听得懂你说什么但看不见你的冰箱。
- 已有的多模态模型（BLIP-2、Flamingo）虽然能"看图说话"，但**没专门用图文指令数据训过**，所以一让它"按指令回答"就退化成机械描述图片：你问"还有酸奶吗"，它回答"图片中有一个白色冰箱"。
- 关键缺口：**没有大规模的"看图+指令+回答"三元组数据**，因为人工标注又贵又难定义。

LLaVA 就是要补上这块：用纯文本 GPT-4 当"老师"自动造数据，把视觉编码器和 LLM 拼起来端到端微调。这是开源世界第一次把"视觉指令微调"（visual instruction tuning）这条路走通。

## 用了什么方法（How）

### 1. GPT-4 当数据厨子（symbolic data generation，符号化数据生成）

类比"把照片翻译成菜谱再让大厨重新创作"：纯文本 GPT-4 看不见图，所以作者先把图片翻译成两类纯文字"骨架"——caption（场景描述，一两句话总结图里有什么）和 bounding box（物体框坐标，告诉 GPT "桌子在画面左下角"）——再把这堆文字喂给 GPT-4，让它假装看到了图，生成三种问答数据：

- **Conversation（多轮对话）**：模拟用户和 AI 你来我往问图里的细节。58K 条。
- **Detailed description（详细描述）**：要求 AI 给出一段完整的图片描述。23K 条。
- **Complex reasoning（复杂推理）**：跨多个物体做逻辑推理，比如"假设这个人现在很饿，他会先去拿什么"。77K 条。

总共 **158K** 条。每种类型作者只手写了几个 seed example（种子样例），剩下全靠 GPT-4 照葫芦画瓢。这一步解决了"没有图文指令数据"的死结。

> 读到这里你可能在想：那模型本身长什么样？为什么 GPT-4 造的数据能直接训别的模型？答案是——架构故意做得极简，让"数据本身的质量"成为决定性变量。

### 2. 极简架构：CLIP + 线性投影 + Vicuna

类比"翻译插头"：你有一台美国电器（CLIP，视觉编码器，把图变成数字向量）和一台欧洲插座（Vicuna，语言模型，只接受词向量），中间需要一个**单层线性矩阵 W**（projection matrix，投影矩阵）当转接头，把视觉向量翻译成 Vicuna 能识别的"伪词向量"。

- **CLIP ViT-L/14**（视觉编码器，OpenAI 开源）把整张图切成网格 patch（小格子），每格输出一个特征向量 Z_v。
- 投影矩阵 **W** 把 Z_v 变成 H_v，维度对齐 Vicuna 的词向量空间。
- 把 H_v 当成"图片说出来的词"插进 Vicuna 的输入序列里。

对比同期方案：Flamingo 用 gated cross-attention（门控交叉注意力，复杂的双流交互），BLIP-2 用 Q-Former（一个独立的小 transformer 当桥梁）。LLaVA 故意只用一个线性层——简单到不可思议，但**正是这个简单让作者能快速做数据消融实验**。

![Architecture](../papers/llava/images/img_031.jpg)

> 读到这你可能在想：训这个怎么训？三个东西（CLIP / W / Vicuna）一起训会不会打架？答案是——分两阶段，每阶段只解冻一部分。

### 3. 两阶段训练（two-stage training）

类比学厨师：先学会"听到'番茄'就拿起番茄"，再练完整的炒菜流程。

- **Stage 1：Pre-training for Feature Alignment（预训练做特征对齐）** → 类比"先让翻译插头学会基本词汇对应"：冻结 CLIP 和 Vicuna，**只训 W**。用 CC3M 筛出来的 595K 图文对，每条当成单轮对话（"描述这张图"→"图里有一只狗在草地上"）。这一步的目的是让 W 学会"图的语言"和"文字的语言"对齐，作者称之为训练一个 compatible visual tokenizer（兼容的视觉分词器）。
- **Stage 2：Fine-tuning End-to-End（端到端微调）** → 类比"再让整个团队配合演练"：CLIP 始终冻结，**解冻 W 和 Vicuna 一起训**。用前面 GPT-4 造的 158K 指令数据。这一步让模型真正学会按指令回答，而不只是描述。

消融发现：跳过 Stage 1 直接做 Stage 2，ScienceQA 掉 5.11 个点。说明对齐阶段不是可有可无的。

### 4. GPT-4 当裁判评测（GPT-4 as judge）

类比"让另一位老师批卷"：同一道题让 LLaVA 看图回答、纯文本 GPT-4 看 ground truth caption（标准描述）回答，再让第三个 GPT-4 给两份答案打 1-10 分并写解释。LLaVA 的得分用相对百分比报告（LLaVA 分数 / GPT-4 分数）。这套范式后来被几乎所有多模态 benchmark 沿用。

## 关键实验结果（What works）

- **LLaVA-Bench (In-the-Wild) 总分 67.3%**——比 BLIP-2 高 29 个点（38.1%→67.3%）、比 OpenFlamingo 高 48 个点（19.1%→67.3%）。这相当于从"勉强能用"跳到"可以日常聊天"。同等规模下指令跟随能力第一次真正与闭源 GPT-4V 拉近距离。
- **复杂推理子项 81.7%**（相对纯文本 GPT-4，后者能看 ground truth caption 这个"作弊优势"）——意思是 LLaVA 看真图做推理，已经接近能看标准答案的 GPT-4。能拿到 80%+ 的相对分，说明指令微调对"推理"这件事真的起作用了。
- **ScienceQA 92.53%**（LLaVA + GPT-4 ensemble 集成）——当年的 SOTA（state-of-the-art，业界最好成绩），击败此前 SOTA MM-CoT_Large（91.68%）。LLaVA 单模型也有 90.92%。这是首次有开源 VLM 在标准学术 benchmark 上赢过专门为该任务设计的方法。
- **消融**：跳过 Stage 1 预训练直接训 ScienceQA 掉 5.11 个点（85.81% vs 90.92%）；7B 参数版本比 13B 掉 1.08 点。这两个数字告诉我们：alignment 阶段不能省，模型规模收益边际递减但仍然存在。

![Ablation](../papers/llava/images/img_033.jpg)

## 我读完后该懂的几个术语

- **Visual Instruction Tuning（视觉指令微调）**：在"图+指令+回答"三元组数据上微调多模态模型，让它学会按人话办事而不是机械描述图片。类比"教学徒不只是认菜，还得听懂'帮我把这道菜咸度调低'"。**出现在标题与全文核心论点**。
- **CLIP ViT-L/14（视觉编码器）**：OpenAI 训的 Vision Transformer，patch 大小 14×14。把图切成马赛克小格子，每格输出一个特征向量。类比"把照片切成几百块拼图，每块单独给一串 DNA 编码"。**出现在 §4.1 Architecture**。
- **Projection Matrix W（投影矩阵）**：单层线性层，把 CLIP 输出的视觉向量映射到 LLM 词向量空间。类比"USB 转 Type-C 转接头"——LLaVA-1 故意只用一层；后续 LLaVA-1.5 升级成 2 层 MLP。**出现在 §4.1 公式 (1)**。
- **Vicuna（语言主干）**：基于 LLaMA、用 ShareGPT 用户对话数据微调的开源 LLM，13B 和 7B 两个尺寸。类比"已经会聊天的兄长"。**出现在 §4.1 选型说明**。
- **LMM (Large Multimodal Model，大型多模态模型)**：跟 LLM 一字之差但多了视觉。LLaVA 是这个词流行的起点之一。**出现在 §1 Introduction 和 §2 Related Work**。
- **In-context Learning Seed Examples（上下文学习种子样例）**：人工写几条样例放进 GPT-4 的 prompt，让它照葫芦画瓢生成更多。类比"先给厨师看两道范例菜，他就懂套路了"。**出现在 §3 数据生成**。
- **Symbolic Representation（符号化表示）**：把图翻译成 caption + bounding box 这种纯文字"骨架"，让纯文本 GPT-4 也能"伪装看到图"。**出现在 §3 第二段**。
- **LLaVA-Bench (In-the-Wild)**：作者自建的评测集，24 张图 60 个问题，覆盖室内外、表情包、绘画、素描，用来测真实世界泛化能力。**出现在 §5.1 评测**。

## 这篇论文的局限 / 我看出的疑点

- **"图当成 patch 袋子"问题**：LLaVA 把图当成无序 patch 集合，不能精细绑定语义。文中举例：冰箱里有酸奶+草莓，问"有草莓味酸奶吗"它会错答 yes，因为它把两个 patch 概念合并了。**用户实际遇到**：购物类问答、医学影像问答这种需要精确属性绑定的场景容易翻车。
- **分辨率与知识覆盖瓶颈**：CLIP ViT-L/14 输入分辨率 224×224，远不够识别招牌、品牌 logo、小字。**用户实际遇到**：拍菜单问"这家店有素食吗"、拍药盒问"成分里有阿司匹林吗"都做不好，需要 OCR + 高分辨率视觉。
- **数据由 GPT-4 自动生成**：质量上限被老师模型卡住，且会继承 GPT-4 的偏见和幻觉，缺乏严格的事实校验。**用户实际遇到**：碰到 GPT-4 也答错的题，LLaVA 大概率跟着错。
- **评测方式自我循环**：用 GPT-4 当裁判评 LLaVA 输出，可能存在系统性偏好（GPT-4 偏爱 GPT-4 风格的答案）。**用户实际遇到**：benchmark 分数高不一定等于真实体验好；后续 MM-Vet、SEED-Bench 等评测就是为了缓解这个问题。

## 与其他 12 篇的关联

- **范式开创：影响后续所有 VLM**——LLaVA 的"CLIP + 投影层 + LLM"成为后续 VLM 的默认架构。OpenVLA、π0、RT-2 这类 VLA（Vision-Language-Action）模型都复用了这套视觉接入方式：先用 CLIP-style encoder 把图变 token，再过一个轻量映射层喂给 LLM。区别只在投影层从 1 层 MLP 升级到 2 层、视觉 encoder 换成更强的 SigLIP/DINOv2。如果说 Transformer 是 LLM 的祖宗，LLaVA 就是开源 VLM 的祖宗。
- **与 SayCan / PaLM-E 的分工对比**——SayCan 是"高层任务规划"层（用 LLM 规划机器人下一步做什么），LLaVA 是"看图聊天"层（让模型能看图回答）。PaLM-E 把两者揉在一起做 embodied reasoning（具身推理）：它的视觉 token 化方案是 LLaVA 的一个工程化变种。LLaVA 提供了 PaLM-E 视觉接入方案的简化开源替代——你可以认为 PaLM-E 是 Google 闭源版的"LLaVA + 机器人"。
- **数据 reformation 思路被广泛复用**——"用强模型造指令数据"这一招，在 RT-2、OpenVLA 的 cotraining（混合训练）数据构造里都能看到影子：用 PaLI / LLaVA-Next 给机器人轨迹数据自动生成自然语言标注，扩展原本只有 action label 的数据集。

## 我建议的阅读顺序

面向零基础读者，这篇论文不要从头读到尾。建议路线：

1. **先读 Abstract（摘要）+ §1 Introduction 第一段** — 知道这篇论文要解决"开源界没有图文指令数据"这个具体问题。**为什么这么读**：先建立动机，避免被后面的公式吓退。
2. **看 Figure 1（架构图，img_031）** — 一眼看清"CLIP → W → Vicuna"三件套。**为什么这么读**：架构图比 30 行公式更快建立心智模型。
3. **跳到 §3 GPT-assisted Visual Instruction Data Generation** — 重点看数据怎么造的、为什么能造（caption + bbox 当符号化骨架）。**为什么这么读**：这是这篇论文真正的创新点，方法部分反而很标准。
4. **读 §4.2 Training（两阶段训练）** — 理解 Stage 1 / Stage 2 各冻结什么、训什么。**为什么这么读**：未来你看任何 VLM 论文都会用类似 recipe，这是"基础工序"。
5. **跳过 §4.1 公式细节**（除非你想自己实现） — 知道是单层线性映射就够了。**为什么这么读**：公式 (1)-(3) 没有出乎意料的地方，时间花在 §3 更值。
6. **快速扫 §5 Experiments 的 Table 4 / Table 5** — 看消融表里"去掉 instruction tuning"和"只用 conversation"分别掉多少分。**为什么这么读**：表格直接告诉你哪些设计选择最重要，比读正文叙述高效。

读完这 6 步大约 40-60 分钟，已经能在和别人讨论 VLM 时报出 LLaVA 的核心思路。

## 为什么值得读 / 不值得读

VLM/VLA 入门**必读**。

- **如果你只能读 1 篇 VLM 论文**：就读它。架构最简、思路最清、消融最充分，是理解"为什么现代多模态助手都长一个样"的最佳起点。
- **如果你能读 3 篇**：LLaVA + BLIP-2 + Flamingo——三种不同的视觉接入方式（线性层 / Q-Former / Cross-attention）让你看清这条路上的设计空间。
- **如果你能读 5 篇**：再加 PaLM-E 和 LLaVA-1.5（如果算它的话）——看 LLaVA 思路怎么扩展到具身和怎么自我迭代。

不值得花太多时间在公式细节上：这篇论文的贡献是**数据 + 工程范式**，不是数学新意。把时间花在动手跑一遍官方 demo（llava-vl.github.io）比抠公式收益高 10 倍。
