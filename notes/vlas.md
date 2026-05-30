---
title: "VLAS: VLA Model With Speech Instructions"
slug: vlas
topic: 四. 多模态
difficulty: ⭐⭐⭐
status: auto-summary
来源: papers/vlas/paper.pdf
generated_at: 2026-05-30
---

# VLAS: VLA Model With Speech Instructions

> 这是机器辅助生成的客观摘要笔记。教学版精读笔记由用户按节奏触发后单独成稿。

## 一句话讲什么（TL;DR）

让机器人直接"听懂"语音指令而不是先转文字，还能从声纹认出说话人是谁，办私人定制的活。

## 这篇论文要解决什么问题（Why this paper）

家用机器人要给人帮忙时，每个人的喜好、东西归属都不一样。"帮我拿杯子"——是张三的绿杯子还是李四的红杯子？

之前的 VLA（Vision-Language-Action，视觉-语言-动作模型）只吃图像 + 文字，要支持语音得先挂一个外挂 ASR（Automatic Speech Recognition，自动语音识别）把语音转成文字。但这样有两个麻烦：

- **整个系统变成两段流水线**，模型变大、计算变多、容易出现误差累积（一段错全段错）
- **转成文字就丢了"语音里的额外信息"**——谁在说话（声纹）、什么情绪、什么语调。"我的杯子"这种话，没声纹就根本不知道谁是"我"。

VLAS 想做的是：让一个端到端模型直接吃**原始语音**，并利用声纹去"对号入座"找私人知识。

## 用了什么方法（How）

![Architecture](../papers/vlas/images/img_026.jpg)

- **基座沿用 LLaVA**（视觉问答里最经典的开源模型）→ 类比：在已经会"看图说话"的人身上加一个"听力训练"，比从零教快得多。它解决了视觉-文本能力的冷启动。
- **Whisper encoder + MLP 投影器把语音塞进 LLM 的语义空间** → 类比：语音先被切成"频谱图条码"（mel-spectrogram），再用一个翻译器（MLP）把条码翻成 LLM 能懂的"词向量方言"。它解决了"语音 token 怎么和文本 token 在同一张桌子上对话"。
- **三阶段训练**（图见下）：阶段一只训 MLP 做语音-文本对齐；阶段二联合训 SQA + VQA 让模型同时会"听问答"和"看问答"，产出 VLAS-Base；阶段三用 CSI（CALVIN with Speech Instructions）数据集做行为克隆，把模型变成机器人策略。→ 类比：先教听写，再教听题答题，最后教听话干活。
- **Voice RAG**（Voice Retrieval-Augmented Generation，语音检索增强生成）→ 类比：进门时门禁先扫脸（提取声纹），然后从档案柜里调出"这位是张三，他的杯子是绿的，他爱把东西放进抽屉"这样的小卡片塞给 LLM 当背景知识。它解决了"指令里只说'我的杯子'，机器人怎么知道是哪个"。
- **动作 token 化**：把连续的 7 维动作（xyz + 三个旋转角 + 夹爪）每维离散成 256 格，复用 LLM 词表里最不常用的 256 个 token 当动作词。→ 类比：让 LLM 把"伸手向左 3cm"也当成一个"汉字"来生成。

![Training stages](../papers/vlas/images/img_042.jpg)

## 关键实验结果（What works）

- **CALVIN ABCD/D，长序列 5 任务平均长度：VLAS-语音 = 3.70 vs VLA+ASR = 3.13** —— 端到端比"VLA+外挂 ASR"显著强，证明端到端避免了误差累积。
- **CALVIN，VLAS-文本 = 3.74 vs VLA-文本 = 3.80** —— 加上语音通道**几乎没拖累**原本的文本任务能力。
- **定制化任务平均成功率：VLAS = 86.5% vs VLA = 19.2% vs VLAS−RAG = 16.0%** —— Voice RAG 是定制化任务的核心，没它直接掉到 16%。
- **LibriSpeech 语音识别 WER：VLAS-Base = 2.79% vs Whisper large-v2 = 2.7%** —— 在通用 ASR 上和当年 SOTA 的 Whisper 持平。

## 我读完后该懂的几个术语

- **VLA**（Vision-Language-Action，视觉-语言-动作模型）—— 让机器人"看图听话出动作"的一体模型。类比：一个又能看监控、又能听对讲、又能直接操纵机械手的工人。
- **ASR**（Automatic Speech Recognition，自动语音识别）—— 语音转文字。类比：会议速记员。本文要做的就是"不用速记员"。
- **Voiceprint / Speaker Identification**（声纹 / 说话人识别）—— 从语音里抽出"这是谁"的特征。类比：听声音认人。
- **RAG**（Retrieval-Augmented Generation，检索增强生成）—— 回答前先去外部数据库找资料再答。类比：考试前先翻参考书。本文是用"声纹"当查询钥匙。
- **LLaVA** —— 经典开源视觉-语言模型，靠 ViT + MLP 投影 + LLaMA 拼起来。类比：本文站在它肩膀上加了一只"耳朵"。
- **CALVIN** —— 长序列机器人操作 benchmark，每个长任务由 5 个连续子任务组成。类比：5 道题串成的考试卷，前一题做错会影响后一题。

## 这篇论文的局限 / 我看出的疑点

- **依赖 TTS 合成的训练语音**（VITS + LibriTTS 1152 种声音）：合成语音和真人语音分布有差距，作者用 10 个真人录音测出来 Len 从 3.70 掉到 3.61，说明 sim-to-real 有损耗，更复杂场景没充分验证。
- **没有历史信息**：作者自己承认在 CALVIN 上落后 RoboFlamingo（3.74 vs 4.09），原因是 RoboFlamingo 有 LSTM policy head，而 VLAS 是无状态前向。这是架构层面的硬伤。
- **Voice RAG 的"个人知识库"是怎么建立、怎么更新的**论文几乎没讲——实际部署中，新用户来了得手动录入档案吗？冷启动问题没回应。

## 与其他 12 篇的关联

- **vs OpenVLA**：都基于 VLM 微调出动作策略，但 OpenVLA 只接受第三人称单视角输入，且不支持语音；论文实测 OpenVLA 在 CALVIN 上表现很差（Len=0.34）。
- **vs RT-2 / Roboflamingo**：同属"VLM 直接生成动作"路线，VLAS 把模态从 (图 + 文) 扩到 (图 + 文 + 语音 + 声纹)，是模态轴的扩展。
- **vs PaLM-E / SayCan**：那两篇是高层任务规划（VLM 编排预定义技能），本文是端到端动作生成，路线不同。

## 为什么值得读 / 不值得读

如果关心**多模态输入扩展**或**机器人个性化**，这是目前少数把"声纹 + RAG"塞进 VLA 的工作，值得读 method 部分。如果只关心 VLA 通用能力上限，它在 CALVIN 上不如 RoboFlamingo，可以略读。
