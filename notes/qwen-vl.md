---
title: "Qwen-VL: A Versatile Vision-Language Model for Understanding, Localization, Text Reading, and Beyond"
slug: qwen-vl
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2308.12966"
venue: arXiv
year: 2023
era: classic
num: 135
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

给会聊天的 AI 戴副眼镜：一次学会看图、念中英文招牌、用框指出物体、还能多轮聊天。这就是阿里 2023 年开源的 Qwen-VL。

## 这是个什么场景 — 日常类比

想象你出国旅游，请了个中英文都会的导游，但他眼睛被蒙着——你只能用嘴跟他描述眼前的东西，他再回答你。这其实就是纯文本大语言模型（LLM）的状态：会聊天，但看不见。

Qwen-VL 干的事就是：**给这个导游摘掉眼罩，配一副眼镜（视觉编码器，Vision Encoder）**。摘了眼罩之后，导游不光能聊天，还能：

- 你把菜单举到他面前，他能念出上面写的中英文菜名（OCR，光学字符识别）
- 你说"图里那个穿红衣服的小孩在哪？"，他能用手指框出来（grounding，视觉定位）
- 你接着追问"那他旁边那只狗呢？"，他还记得刚才聊过什么（多轮对话）

之前那一代（LLaVA / BLIP-2）的眼镜很糊，导游基本只能讲"这里有只猫坐在沙发上"这种大概描述，念不清招牌，也没法精确指物。Qwen-VL 想做的就是把这副眼镜升级，让一个模型同时把这几件事都办了。

## 之前的人怎么做的 — 3-5 bullet

- **CLIP 路线（2021）**：图文对齐，但只能算"匹配度"，不能生成长句子。
- **BLIP / BLIP-2 路线（2022-2023）**：用 Q-Former 把视觉特征压缩成几十个 token 喂给 LLM，能生成描述但 grounding 弱、OCR 弱。
- **LLaVA 路线（2023）**：MLP 投影 + 指令微调，生成能力强但中文支持差，不会输出坐标框。
- **Flamingo（2022）**：cross-attention 插进 LLM 每一层，参数大、闭源、不支持中文。
- 共性短板：要么不会"指物体"（grounding），要么不会读图里的中文字，要么是英文私有模型。

## 这篇论文的关键想法

把上面四类能力**合到一个模型**里，而不是为每种任务训一个专门模型。具体三个押注：

1. **主干换成 Qwen-7B**：天然支持中英双语，解决中文 VLM 真空。
2. **视觉端用 ViT-bigG（OpenCLIP）+ 一个轻量"位置感知"的视觉-语言适配器**：让视觉 token 既保留空间信息又压缩到可控数量（具体压缩比需读原文）。
3. **三阶段训练范式**：先大规模预训练打基础，再多任务预训练加 OCR/grounding/caption 等结构化任务，最后指令微调出 Qwen-VL-Chat 对话版本。

最关键的设计是**把 grounding 当作一种文本任务**：模型直接输出 `<box>(x1,y1),(x2,y2)</box>` 这种特殊 token，不用额外检测头。这是把"会指物"塞进语言模型的简洁路线。

## 它怎么做的（方法）— 3-4 段

**架构层（搭班子）**。就像开一家做图文翻译的店，老板要凑齐三个人：一个摄影师（视觉编码器 ViT-bigG，约 1.9B 参数，从 OpenCLIP 初始化）负责看图；一个翻译（Qwen-7B 语言模型）负责说话；中间还要一个传话员（视觉-语言适配器，VL Adapter），把摄影师拍的几百张小碎片整理成 256 张关键照片再递给翻译。这个传话员用的是一组"可学习的提问卡 + cross-attention（交叉注意力）"，简化版的 Q-Former 思路，传话时还会附上 2D 位置编码（"这张照片是图的第几行第几列"），别让翻译忘了空间关系。

等等，先慢一拍 — **patch token 是什么？** ViT 把一张图切成 14×14 的小方格（patch），每格变成一个 token（数字向量）。一张图就有几百个 token。直接全塞给 LLM 太贵，所以才需要传话员压缩成 256 个。

**第一阶段：预训练（让摄影师学会跟翻译对暗号）**。新员工入职先磨合：用约 14 亿（1.4B）图文对当训练材料，把翻译（LLM）锁起来不动，只让摄影师和传话员练习——看图配文配多了，他们俩就学会用翻译听得懂的"语言"递信息。低分辨率 224×224（先用小图练，省算力）。

**第二阶段：多任务预训练（同时教七门手艺）**。这是 Qwen-VL 多才多艺的关键一步：让整个店同时接七种活——给图配描述、看图回答问题（VQA）、带框描述（grounded captioning）、按描述找框（referring expression comprehension）、念图里的字（OCR）、纯文字聊天、带框问答。聪明之处在于：**所有任务都改写成同一种格式** `<输入><任务标签><输出>`，让翻译用同一套语法学全部七门手艺。分辨率升到 448×448（看更清楚）。

**第三阶段：指令微调（学会礼貌聊天，造出 Qwen-VL-Chat）**。前两步学的是技能，第三步学的是"礼貌"——用约 35 万（具体数字需读原文）多模态指令 + 多轮对话数据再练一遍，让模型学会按人类指令来回答、能接住第二轮第三轮追问。基础版叫 Qwen-VL，会聊天的版本叫 Qwen-VL-Chat。

## 实验在做什么

涉及的 benchmark 大致涵盖四类：

- **通用 VQA**：VQAv2、OKVQA、GQA 等。
- **图文检索 / caption**：Flickr30K、NoCaps 等。
- **OCR / 文本图像理解**：TextVQA、DocVQA、ChartQA、AI2D 等。
- **Grounding / Referring**：RefCOCO、RefCOCO+、RefCOCOg。

公开论调是 Qwen-VL 在多个上面接近或超过当时同尺寸开源 VLM（如 LLaVA-1.5、InstructBLIP），尤其在中文场景和 grounding 任务上是开源里少有的可用方案。具体数字需读原文 / 阿里官方 README。

值得注意的是：实验同时报告**零样本**（zero-shot）和**有指令微调**两套结果，论文也讨论了多轮对话的鲁棒性（Qwen-VL-Chat）。

## 你应该懂的几个新词 — 4-6 个

- **VLM（Vision-Language Model）**：能同时处理图像和语言的模型；既不是纯 CLIP（只对齐），也不是纯文本 LLM。
- **Grounding（视觉定位）**：模型不仅说出"猫在哪"，还要给出像素坐标框。Qwen-VL 直接让 LLM 输出 `<box>` 文本 token 实现。
- **Referring Expression Comprehension**：根据一句话（"穿红衣服的女孩"）在图里框出对应物体，是 grounding 的反向版本。
- **视觉-语言适配器（VL Adapter）**：连接视觉编码器和 LLM 的中间模块。Qwen-VL 用的是带可学习 query 的 cross-attention，把可变数量的 patch token 压成固定 256 个。
- **OCR（Optical Character Recognition）**：让模型读图里的文字。中文 OCR 因为字符多、字形复杂，比英文难，Qwen-VL 是早期开源里中文 OCR 较强的。
- **三阶段训练（Three-stage Training）**：预训练 → 多任务预训练 → 指令微调。这种范式后来被很多 VLM（如 InternVL、MiniCPM-V）继承。

## 它和其他论文什么关系

- **上游**：BLIP-2（Q-Former 思路）、CLIP / OpenCLIP（ViT-bigG 视觉编码器来源）、LLaVA（指令微调范式）、Flamingo（多模态预训练目标）。
- **同期**：LLaVA-1.5、InstructBLIP、CogVLM、MiniGPT-4 — 都在 2023 年探索"LLM + 视觉"，Qwen-VL 的差异点是**中英双语 + grounding + OCR 三合一**。
- **下游**：Qwen-VL 系列后续演进到 Qwen-VL-Plus / Qwen-VL-Max（闭源更强版本）以及 2024 年的 Qwen2-VL（动态分辨率 + 视频）。也启发了国内一批中文 VLM。
- **对具身（embodied）研究的关系**：作为通用 VLM，可以当 high-level planner 或感知前端（看图 → 出指令）；但它本身没接动作空间，要跟 RT-2 / OpenVLA 那条线区分。

## 我建议这样读 — 3-4 步

1. **先看架构图**（论文 Figure 1）：搞清楚 ViT → VL Adapter → Qwen-7B 的数据流，以及 256 个视觉 token 怎么来的。
2. **跳到第 3 节"三阶段训练"**：每一阶段冻结/解冻了什么、数据规模、分辨率变化。这是方法论核心。
3. **看 grounding 怎么"文本化"**：找论文里 `<box>` token 的定义和示例，理解"为什么不用检测头也能定位"。
4. （可选）**对照 LLaVA / BLIP-2 论文**：体会"压缩视觉 token + 指令微调"这个共性范式，以及 Qwen-VL 在 grounding/OCR 上的额外动作。

## 为什么值得读

- 中文社区第一个能打的开源通用 VLM，之后所有"做中文多模态 demo"几乎都绕不开它。
- **三阶段训练 + 任务文本化** 这套范式被后续大量复用，读它就懂了 2023-2024 中文 VLM 的主流套路。
- **Grounding 当文本任务** 是把检测能力"塞进 LLM"的优雅做法，对理解后来视觉 agent / 具身规划器（让 VLM 输出操作坐标）很有启发。
- 工程价值高：模型权重开源、推理脚本完整，是搭中文多模态 baseline 的现成起点。
