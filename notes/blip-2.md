---
title: "BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models"
slug: blip-2
topic: vlm-foundation
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2301.12597"
venue: ICML
year: 2023
era: classic
num: 126
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

BLIP-2 不动两个大模型——一个负责看图、一个负责说话——只在中间训练一个小"翻译"，就让 AI 学会了看图说话。

## 这是个什么场景 — 日常类比

你出去玩拍了一堆照片，想发朋友圈但懒得自己想文案，于是想让手机帮你"看图配字"。问题是——市面上"看得懂图"的模型（比如 ViT、CLIP）只会把图编成一堆向量，不会说人话；而"会说人话"的大模型（比如 GPT、OPT、FlanT5）只读得懂文字，看不见图。两边都已经被人花了几百万美元训得很厉害了，你不可能为了这一个需求把它们重新烧一遍。

换个生活类比：你雇了一个**只会看画不会说话的画家**和一个**只会写文章但眼睛蒙着的作家**，两位都是大师级，但互相听不懂对方的话。

之前别人解决这个问题，要么把两位大师关起来重新一起培训（端到端训练，烧钱），要么逼作家自己学看画（微调 LLM，作家越来越大就越不愿意动）。

BLIP-2 干的事很省事：雇一个**便宜的小翻译**（Q-Former）站在两人中间，画家和作家原地不动、脑子一点不改，只让小翻译反复练习"怎么把画家看到的画，转述成作家爱听的话"。两位大师加起来几十上百亿参数全部冻住，真正在训练的只有一亿多参数的小翻译——成本一下就降下来了。

## 之前的人怎么做的 — 3-5 bullet

- **端到端联合训练（如 BLIP-1、SimVLM、CoCa）**：图像编码器 + 文本解码器一起训，效果好但训练成本巨大，每出一代新视觉/语言主干都得从头烧一遍。
- **冻结视觉、训练 LLM（如 Frozen、ClipCap）**：让视觉特征通过简单 projector 接进语言模型再 fine-tune LLM。问题是 LLM 越大越不愿意动它，且对齐质量不稳。
- **冻结 LLM、训练视觉适配（如 Flamingo）**：插入 cross-attention 的 Perceiver Resampler 进入 LLM 内层，效果强，但需要在 LLM 内部插入大量新参数，工程成本高。
- **CLIP 类对比学习**：图文对齐能力强，但天然不会生成自然语言描述/对话，做不了 VQA、captioning 这种生成任务。

核心痛点：要么算力贵，要么要侵入式改 LLM 内部，要么只对齐不会生成。

## 这篇论文的关键想法

BLIP-2 的关键洞察可以拆成三层：

第一，**两端都不动**——就像装修房子时不动承重墙，只在中间加一道隔断。视觉编码器和 LLM 全程冻结，参数完全不更新。这样可以无脑替换上游模型——明天 EVA-CLIP 出新版、LLM 换成更强的，不用重训。

第二，**只训中间一个 Q-Former 小模块**——好比给一群人开会派一个"实习生"专门做笔记。Q-Former 内部有一组**可学习的 Query 向量（Query Embeddings，可学习的查询向量）**，数量很少（论文常用 32 个）。这些 Query 像 32 个带着固定问题清单的提问者，通过 cross-attention 反复向冻结的图像特征"问问题"，把一整张图压缩成 32 个语义向量。

等等，先慢一拍——什么叫"可学习的 Query"？想象 32 个一开始什么都不会的小学生，每个人随机被分配一个角度（"图里有人吗""啥颜色为主""在室内还是户外"……），训练过程就是反复让他们去看几亿张图，被打分纠正，慢慢每个人都进化出自己擅长问的那类问题。最后这 32 个人合在一起就能把任何图的"重点"梳理出来。

第三，**两阶段训练**——像学一门外语，先背单词再练写作，不是一上来就让你写论文。第一阶段把 Q-Former 接到视觉编码器上，做表征学习（图文对比 + 图文匹配 + 图像-文本生成三个任务联合）；第二阶段把 Q-Former 输出的 32 个 Query 当作"软 prompt"喂给 LLM，让 LLM 在冻结状态下做生成式预训练。两阶段把对齐和生成解耦，避免一锅炖学不动。

这个设计的妙处：32 个 Query 这个**信息瓶颈**强迫 Q-Former 只把"对语言任务有用的视觉信息"挑出来，过滤掉冗余像素细节，正好是 LLM 想要的输入形式。

## 它怎么做的（方法）— 3-4 段

**Q-Former 的内部结构**。Q-Former 本身是一个轻量 BERT 风格的 Transformer，但有两路输入：一路是可学习的 Query 向量（32 个，每个 768 维左右，具体维度需读原文），另一路是文本 token。Query 之间和 Query↔文本之间走 self-attention，Query↔图像特征走 cross-attention（这是 Query 唯一接触图像的通道）。三种 attention mask 配合三种训练任务切换：ITC（图文对比）、ITM（图文匹配）、ITG（图文生成）。

**第一阶段：表征学习**。冻结视觉编码器（ViT-L 或 EVA-CLIP-g），只训 Q-Former。三任务联合优化：ITC 让 Query 输出和文本表征对齐（类似 CLIP）；ITM 做细粒度的二分类（这对图文是不是匹配）；ITG 让 Q-Former 像 caption 模型一样生成文本。这一阶段后，32 个 Query 已经能从图像里抽出语义化的"摘要"。

**第二阶段：生成式预训练**。把 Q-Former 输出的 32 个 Query 向量过一个 Linear 层投到 LLM 的词嵌入空间，作为前缀（soft prompt）拼到文本 token 前面，喂给冻结的 LLM。LLM 自回归生成图像描述。LLM 这边可以是 decoder-only（OPT 系列）或 encoder-decoder（FlanT5 系列），论文都试过。

**训练数据与算力**。预训练用了 COCO、Visual Genome、CC3M、CC12M、SBU、LAION-400M 子集等图文对，规模约 1.29 亿图文对（具体数字以原文为准）。最大版本 BLIP-2 ViT-g + FlanT5-XXL 总参数约 12B，但**可训练参数只有约 188M**（Q-Former + Linear），训练成本远小于同期端到端方案。

## 实验在做什么

主要看几类任务：

- **Zero-shot VQA（视觉问答，无需任务特定训练）**：在 VQAv2、OK-VQA、GQA 上零样本表现，BLIP-2 比 Flamingo-80B 用更少参数取得更高或相当分数。
- **Image Captioning**：在 NoCaps、COCO Caption 上做 zero-shot 和 fine-tune，刷 SOTA。
- **Image-Text Retrieval**：在 COCO、Flickr30K 上检索任务，用第一阶段的 Q-Former 直接做。
- **Visual Dialog / 指令跟随**：展示了把 BLIP-2 接到指令微调过的 LLM（FlanT5）上能涌现出类对话能力，给后来 InstructBLIP、MiniGPT-4、LLaVA 系列开了路。
- **消融**：拆掉两阶段的某一阶段、改 Query 数量、换 LLM 大小，验证设计选择。

具体分数和图表需读原文。

## 你应该懂的几个新词 — 4-6 个

- **Q-Former（Querying Transformer）**：本文核心模块，靠一组可学习 Query 从冻结图像特征里 cross-attention 抽取语义摘要。
- **可学习 Query（learnable queries）**：一组随机初始化、训练中更新的向量，作用是"代表问题"去问图像。可类比 DETR 的 object queries，但这里问的是语义而不是物体框。
- **冻结（frozen）**：参数 requires_grad=False，前向计算正常但反向传播不更新它们。和 LoRA 不同，BLIP-2 主体两端是真冻结，没插任何可训练适配器。
- **软提示 / soft prompt**：不是离散的文字 prompt，而是直接拼在 LLM embedding 层的连续向量。Q-Former 输出的 32 个向量过 Linear 后就是 soft prompt。
- **ITC / ITM / ITG**：图文对比 / 图文匹配 / 图像到文本生成。三种自监督目标合在一起训 Q-Former。
- **Information bottleneck（信息瓶颈）**：32 个 Query 远少于 ViT 的 patch 数（256-1024+），强制 Q-Former 抽取压缩表征，是 BLIP-2 工作的关键归纳偏置。

## 它和其他论文什么关系

- **上承 BLIP-1**（同作者团队 2022）：BLIP-1 是端到端联合训练，BLIP-2 把"训整个模型"换成"训中间桥梁"，思想跃迁。
- **对标 Flamingo**（DeepMind 2022）：都做"冻结 LLM + 视觉接入"，但 Flamingo 在 LLM 内部插 cross-attention，BLIP-2 只在 LLM 输入端拼 soft prompt，更解耦、更便携。
- **启发后续 VLM 范式**：LLaVA（线性 projector 替代 Q-Former，更简单）、InstructBLIP（BLIP-2 + 指令微调）、MiniGPT-4、Qwen-VL、InternVL 等都是"冻结/部分冻结视觉 + LLM + 中间桥梁"路线，桥梁有的简化为 MLP，有的更复杂，但 BLIP-2 是这一范式的奠基工作之一。
- **与 CLIP/SigLIP 区别**：CLIP 类只学对齐不会生成，BLIP-2 同时具备对齐（第一阶段）和生成（第二阶段）能力。
- **与 LLaVA 对比**：LLaVA 用一个 MLP 直接把 CLIP visual token 映射到 LLM embedding，没有 Query Bottleneck。工程更简单但理论上信息压缩不如 Q-Former 优雅。社区后来更倾向 LLaVA 路线，因为 MLP 简单、scale 起来更好；但 Q-Former 的思路在多帧视频、多模态融合等场景仍有优势。

## 我建议这样读 — 3-4 步

1. **先看图 2 / 图 3 的整体架构**，搞清三个组件（视觉编码器、Q-Former、LLM）和数据流：图像 → 视觉特征 → Q-Former Query 抽取 → Linear → LLM 输入。这一步看懂就抓到 80% 主旨。
2. **再看 Q-Former 内部结构**（论文 Section 3.1 / 3.2）：三种 attention mask 怎么配合三种训练目标，理解为什么 Query 既能对齐又能生成。
3. **跳着看实验**：先看 Table 1（zero-shot VQA 对比 Flamingo），感受参数效率；再看消融（Query 数量、两阶段必要性）。
4. **跟读两篇后续工作做对比**：LLaVA（极简 MLP 桥梁）和 InstructBLIP（BLIP-2 + 指令微调），看 Q-Former 在不同变体里的演化。

## 为什么值得读

- **范式开创**：2023-2024 几乎所有开源 VLM 都在 BLIP-2 的"冻结+桥梁"框架下做变种，读它就是读这一代 VLM 的基因。
- **工程性价比示范**：12B 总参 / 188M 可训参，告诉你"不是所有事都得端到端"。具身智能里把视觉 backbone 和决策 LLM 解耦，思路上和 BLIP-2 一脉相承。
- **信息瓶颈的设计哲学**：32 个 Query 这个朴素设计，是"用约束逼模型抽象"的经典案例，对你设计任何"压缩 + 翻译"模块都有借鉴。
- **承上启下定位**：往前接 BLIP-1、Flamingo、CLIP；往后接 LLaVA、InstructBLIP、Qwen-VL、InternVL、VLA（视觉语言动作模型）。读完它再看后续论文会有"原来都是这棵树长出来的"的爽感。
- **难度适中**：核心思路一句话讲完，但细节（三任务联合、attention mask 设计、两阶段必要性）足够深入，⭐⭐⭐⭐ 难度刚好——不像 CLIP 那么入门，也不像 Flamingo 那么劝退。
