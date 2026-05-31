---
title: "Florence-2: Advancing a Unified Representation for a Variety of Vision Tasks"
slug: florence-2
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2311.06242"
venue: CVPR
year: 2024
era: classic
num: 131
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

Florence-2 把检测、分割、caption、grounding 等十余种视觉任务统一成一个 prompt-to-sequence（提示进、序列出）的 seq2seq 模型；输入是图像 + 任务提示词，输出永远是文字序列（包括坐标、类名、描述都被编码成 token），用一个不算大的模型在多任务上对标专用的大模型。

## 这是个什么场景 — 日常类比

想象一个万能秘书：你给他一张照片，说"圈出所有的猫"，他在照片上画框；你换一句"描述这张图"，他写一段话；你再说"图里红色的车在哪"，他指给你看。

之前的视觉系统更像是专科医生：一个模型只会做检测，另一个只会做分割，第三个只会写图说，每个都得单独训练、单独调用。Florence-2 想做的就是把这些专科医生合成一个全科秘书，**听不同的指令做不同的事，但脑子是同一个**。

更妙的是这个秘书"个头不算大"（参数量比一些大模型小得多），但靠见过的活儿够多够杂，单项都能打。

## 之前的人怎么做的 — 3-5 bullet

- **专用模型路线**：DETR、Mask R-CNN、BLIP 各做各的。检测就是检测、caption 就是 caption，**接口不统一，工程上要拼很多模块**。
- **CLIP / ALIGN 系列**：图文对比学习拿到强 zero-shot 分类和 retrieval，但只擅长"图文对齐"，**不能直接做检测、分割这种密集预测**。
- **Pix2Seq、UniTAB 等统一范式**：把检测/grounding 之类任务也写成"输出 token 序列"，证明可行，但任务覆盖面较窄、数据集没那么大。
- **Flamingo / BLIP-2 / Kosmos 路线**：把视觉接到 LLM 上做 VQA、caption，强在生成，**但密集任务（检测框、像素 mask）不是它们的主场**。
- **大一统但靠大力出奇迹**：堆几十亿参数 + 海量标注。Florence-2 想反其道而行之：**模型不大，但数据广**。

## 这篇论文的关键想法

把所有视觉任务都看成"图像 + 任务提示 → 文字序列"。

- 任务提示是自然语言风格的 prompt，比如 `<CAPTION>` `<OD>`（object detection）`<REFERRING_EXPRESSION_SEGMENTATION>`，模型看到 prompt 就知道该输出什么。
- 输出永远是 token 序列：caption 就是普通文字；检测就是 `<loc_x1><loc_y1><loc_x2><loc_y2> 类名` 这种把坐标也编码进词表的序列；分割是把多边形顶点也编码成 location token。
- 训练数据是作者构造的 **FLD-5B**：约 5.4 亿张图、126M 图像 + 5B 标注（具体数字需读原文核对），覆盖 caption、detection、grounding、OCR、region 等多种任务粒度，用一套数据引擎自动 + 人工生成。
- 整个模型是标准的 vision encoder（DaViT 系）+ 多模态 transformer encoder-decoder，**没有任务特定的 head**，全部走同一个序列输出口。

核心赌注：**当任务接口足够统一、数据足够全的时候，一个相对小（base ~230M、large ~770M 量级，具体数字需读原文）的模型就能在很多任务上接近或超过专用大模型**。

## 它怎么做的（方法）— 3-4 段

**统一的输入输出格式**。输入永远是图 + prompt 两件套。prompt 是一个很短的特殊 token 串，告诉模型"做哪类任务"。输出永远是 token 序列。坐标被离散化为 1000 个 bin，每个 bin 一个 `<loc_i>` token，加进词表。这样目标框就是 4 个 loc token + 类名词；refer-expression 就是先复述短语再给框；分割就是 polygon 顶点序列。**这一步是整个工作的灵魂：把视觉问题翻译成语言问题**。

**模型骨架**。视觉端是 DaViT（Dual Attention Vision Transformer），把图像切 patch 拿到 visual token；多模态部分是一个 transformer encoder-decoder，类似 T5 / BART 的结构。visual token 拼上 prompt token 一起进 encoder，decoder 自回归吐输出 token。结构上没什么花活，**关键不在结构，在于训练目标和数据**。

**FLD-5B 数据引擎**。作者搭了一条流水线：先收集图像，再用现成的强模型（detector、segmenter、caption 模型、grounding 模型）给同一张图打不同粒度的标注，最后用 LLM 重写、合并、检查一致性，构造出 image-level、region-level、pixel-level 三档标注。这套数据是 Florence-2 区别于其他 generalist 模型的核心资产之一。

**训练**。统一目标就是 next-token prediction（下一个 token 预测），所有任务共享同一个 loss。数据多任务混合采样，按 prompt 区分任务。下游可以 zero-shot 直接 prompt，也可以 task-specific fine-tune 进一步刷点。

## 实验在做什么

- **Zero-shot 对比**：在 COCO detection、Flickr30k grounding、ADE20k 等公开 benchmark 上，不微调直接 prompt，看 Florence-2 base/large 与专用模型差多远。
- **Fine-tune 对比**：在每个任务上做 task-specific fine-tune，跟该任务上的 SOTA 比。论文宣称在 RefCOCO、COCO caption 等多个任务上接近或超过专用大模型，**具体数字需读原文表**。
- **小模型 vs 大模型**：用 Florence-2 large（约 770M 量级）对比一些 3B-10B 量级的 generalist VLM（如 Kosmos-2、Flamingo），论证"数据广 > 模型大"。
- **消融**：拆 FLD-5B 不同来源数据、不同任务类型，看缺了哪部分性能掉多少。
- **可视化**：展示 region 级 caption、密集 grounding、segmentation polygon 等多任务输出样例。

## 你应该懂的几个新词 — 4-6 个

- **prompt-to-sequence**：模型用自然语言 prompt 触发任务，所有输出都统一成 token 序列。
- **location token / `<loc_i>`**：把连续坐标（0~1）离散成 1000 个 bin，每个 bin 一个特殊 token，加入词表，让坐标也能"被生成"。
- **DaViT**：Dual Attention Vision Transformer，同时做 spatial 和 channel attention 的视觉骨干。
- **Generalist Vision Model**：通用视觉模型，一套权重做多种任务，对应专用模型（specialist）。
- **Region-level / Pixel-level annotation**：标注的三种粒度——整图（caption）、区域（box + 短语）、像素（mask）。Florence-2 三档全要。
- **Referring Expression Segmentation**：给一句话"穿红衣服坐左边的人"，模型要分割出对应的区域，是 grounding + segmentation 的合体任务。

## 它和其他论文什么关系

- **接 CLIP / Florence (v1)**：Florence v1（2021）是图文对比预训练偏 retrieval；Florence-2 把方向转向 generative + 多任务统一。
- **同期 generalist 视觉模型**：Kosmos-2、Unified-IO、OFA 都是把视觉任务序列化的尝试，**Florence-2 的差异点是更全的任务覆盖 + 更大的多粒度标注数据集 FLD-5B**。
- **VLM for grounding**：与 GLIP、Grounding-DINO 等专门做 open-vocab detection 的工作互相参照，Florence-2 把 detection 当成多任务里的一项处理。
- **后续影响**：很多 embodied / robotics 工作把 Florence-2 当现成的"视觉万能秘书"，需要框就 prompt 框，需要 caption 就 prompt caption；它和 SAM / DINOv2 一起成为下游搭积木的常用底座。
- **对比 BLIP-2 / Flamingo**：那些更偏"视觉接 LLM 做对话/VQA"，Florence-2 偏"视觉任务统一接口"，目标分工不同。

## 我建议这样读 — 3-4 步

1. 先看 Figure 1 + 任务列表，把"prompt → 输出"的几种格式（caption、detection、grounding、segmentation、OCR）摸一遍，这是本文的接口设计核心。
2. 跳到 method 节看 location token 怎么编码，以及 DaViT + encoder-decoder 的整体连接图，**结构本身不复杂，重点是输入输出怎么打包**。
3. 重点读 FLD-5B 一节：数据引擎怎么搭、三档标注怎么生成，这是这篇论文的真护城河。
4. 实验表选两类看：zero-shot 跨任务对比（看接口是否真通用）+ fine-tune 后单任务对比（看小模型能否打过专用大模型）。论文表格密集，挑 2-3 个有代表性的 benchmark 看就够。

## 为什么值得读

- 这是 **"视觉任务接口统一"** 路线里最完整、最有影响力的一篇之一，工程上验证了"小模型 + 广数据 + 统一接口"的可行性。
- 对 embodied / robotics 学习者特别有用：很多任务（看到什么物体、它在哪、给个短语找出对应区域）你都不想再训一个专用模型，直接 prompt Florence-2 就能拿到结构化输出。
- 数据引擎部分是当代 VLM 训练数据构造的范式之一，理解了 FLD-5B 的搭法，再看其他 generalist 模型的数据章会很轻松。
- 局限也明确：偏 2D image-level 任务，时序、3D、动作生成不在其范围；理解它能做什么、不能做什么，对后续选型很关键。
