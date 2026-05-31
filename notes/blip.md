---
title: "BLIP: Bootstrapping Language-Image Pre-training for Unified Vision-Language Understanding and Generation"
slug: blip
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary
来源: papers/blip/paper.pdf
venue: ICML
year: 2022
era: classic
num: 127
generated_at: 2026-05-31
---

## TL;DR

一句话：BLIP 把"看懂图"和"给图配文字"两件事塞进同一个模型里训练，再用这个模型给网上脏数据"自己造干净标签"，最后拿干净数据回头再训一遍，结果在检索、配字、问答全线刷新 SOTA。

三个关键贡献：
- **MED**（Multimodal mixture of Encoder-Decoder）：一个模型三种身份切换——纯编码器、看图的文本编码器、看图的文本解码器，三种身份共享大部分参数。
- **CapFilt**（Captioning + Filtering）：用预训练好的模型派生出一个"配字员"和一个"过滤器"，给 1 亿多张网图重新生成 caption 并把脏的扔掉。
- **跨任务通吃**：图文检索、image captioning、VQA、NLVR²、VisDial、零样本视频检索全部 SOTA。

*所以这一节是想说：BLIP 同时治理"模型偏科"和"数据脏乱"两个老毛病，用一个模型 + 一套数据清洗流程把视觉语言预训练带进新阶段。*

---

## 这是个什么场景

视觉语言预训练（Vision-Language Pre-training, VLP）的目标是：让模型在大规模图文对上预训练一次，然后在各种下游任务（搜图、配字、视觉问答……）上都能比从头训练强一截。这就像让一个孩子先广泛阅读海量带插图的书，之后无论考试是"看图说话"还是"看文字找配图"，都能直接上手。

但 2021 年前后业界遇到两个尴尬：

第一个尴尬是模型**偏科**：
- CLIP 这类双塔模型擅长"看图配文"的判别题（图和文字到底配不配？），但让它"看图写一段话"就抓瞎，因为它没有解码器。
- 反过来，纯 encoder-decoder 模型（如 SimVLM）能写文字，但做检索（要算所有图所有文字的两两相似度）效率很低。

第二个尴尬是数据**脏**：
- 大模型饿，需要海量图文对，但人工标注（COCO、Visual Genome）只有几百万对，远远不够。
- 所以大家都从网上爬"图 + alt-text"。问题是网图的 alt-text 经常胡说八道——比如风景照配文"在朋友家门口拍的"，跟图本身完全没关系。
- 之前的应对就是简单的规则过滤，然后靠"数据规模大就行"硬扛。

BLIP 同时瞄准这两个问题。

*所以这一节是想说：图文预训练当时卡在"模型只能干一类活"和"数据脏但没人认真治"两个瓶颈上，BLIP 就是冲着这两件事来的。*

---

## 之前的人怎么做

把同期主流方法按"模型形态 × 数据策略"分成几类：

**模型形态维度**：
- **双塔 encoder（CLIP / ALIGN / ALBEF）**：图一个塔，文一个塔，最后用对比学习对齐。检索快、判别强，但不能生成文字。
- **encoder-decoder（SimVLM / VL-T5）**：图进 encoder，文从 decoder 出来。能配字、能 VQA，但检索时要 N×M 次前向，效率劝退。
- **统一 encoder-decoder（VLP / Unified VLP）**：想兼顾两者，但单一架构在两类任务上都不算最强。

**数据策略维度**：
- **规则过滤**：CC3M / CC12M 用启发式规则筛 alt-text。
- **暴力堆量**：ALIGN 干脆爬 1.8B 图文对，靠"量大噪声平均"硬扛。
- **CLIP 过滤**：LAION 用预训练的 CLIP 给图文打分，相似度太低的扔掉。

BLIP 之前最接近的工作是同组的 **ALBEF**：双 encoder + cross-attention 融合 + ITC + ITM 损失 + momentum distillation。BLIP 直接在 ALBEF 基础上加了两件事——给它接一个解码器（变成 MED），再让 MED 自己反过来清洗数据（CapFilt）。

类比一下：之前是"请最严格的语文老师批改学生作文"（CLIP 过滤），BLIP 干的是"让会写作文的老师亲自重写一遍范文，然后让会判分的老师把烂作文丢掉"。

*所以这一节是想说：BLIP 的家世清楚——架构沿 ALBEF 走，但加了解码器；数据上跳出"规则过滤+暴力堆量"，做了"模型自产自校"的新闭环。*

---

## 新想法

BLIP 的核心 insight 其实可以浓缩成两条：

**Insight 1：理解任务和生成任务不必分两个模型，但需要共享得有讲究。**

文本编码器（理解）和文本解码器（生成）的差别本质上只在 self-attention 是双向还是因果——双向的可以"前后文都看"，因果的只能"看前面预测后面"。其他层（embedding、cross-attention、FFN）功能其实一样，可以共享。共享后参数从 361M 降到 252M，反而效果更好（实验表 3 验证）。

**Insight 2：预训练好的模型本身就是最好的数据清洗工具。**

之前用规则、用 CLIP 过滤，但这些工具都是"外人"。BLIP 想的是：既然预训练模型已经懂图文了，为什么不让它自己当老师？派一个分身去"重写 caption"，再派另一个分身去"判这条 caption 配不配图"。两个分身从同一个母体出来但分别 fine-tune，避免同源偏见（confirmation bias）——表 4 验证了"两个分身共享参数会变差"。

把这两件事拼在一起：MED 让一个模型同时具备"配字"和"判分"能力 → 抽出来当 captioner 和 filter → 清洗网图数据集 → 拿干净数据再训一个新的 MED → 这就是"bootstrapping"（自举）的来源。

类比：你做菜不好吃，先看菜谱（人工标注 COCO）打底学会基本功，然后买一堆便宜但参差不齐的食材（网图 alt-text）。你边做边记笔记修正菜谱，下一轮用这本修正过的菜谱再炒一次——菜会越做越好。

*所以这一节是想说：BLIP 的两大新意是"理解+生成共享同一参数集合"和"模型自产自校数据"，自举循环让数据和模型一起进步。*

---

## 方法分步

### Step 1：搭 MED 架构

MED = 一个图像编码器（ViT）+ 一个文本网络，文本网络可以切换三种模式。

**图像端**：标准 ViT-B/16 或 ViT-L/16，图片切 patch + [CLS] token，输出一串 embedding。

**文本端三种模式**（共享大部分参数，只有 self-attention 不同）：

| 模式 | 用什么 self-attention | 用 cross-attention 吗 | 训练时干什么 |
|------|----------------------|----------------------|--------------|
| Unimodal encoder | 双向 SA | 不用 | ITC 对比学习对齐图文 |
| Image-grounded text encoder | 双向 SA | 用，注入图片信息 | ITM 二分类判图文配不配 |
| Image-grounded text decoder | 因果 SA | 用 | LM 看图写句子 |

每条图文对一次训练时：图像走一次 ViT，文本走三次（每次切一种模式算一种 loss），三种 loss 加起来反向传播。

### Step 2：三种损失同时训

**ITC (Image-Text Contrastive Loss)**：拉近匹配的图文 embedding，推远不匹配的。沿用 ALBEF 的 momentum encoder 和 soft label 设定。
- 人话：让图的特征向量和它配文的特征向量在空间里挨着，不配的离远点。

**ITM (Image-Text Matching Loss)**：二分类 head，输入融合后的多模态 embedding，输出"配 / 不配"。配合 hard negative mining——故意挑那些 ITC 算出来"长得很像但其实不配"的对当负样本，逼模型学细粒度对齐。
- 人话：ITC 是粗筛（特征空间的距离），ITM 是细看（真的看清细节再判断）。

**LM (Language Modeling Loss)**：自回归预测下一个 token 的交叉熵，加 0.1 的 label smoothing。
- 人话：给定图，逐字逐字地把 caption 写出来。

为什么不用 BERT 那种 MLM？因为 LM 训练出的解码器才能直接做 image captioning 这类生成任务。

### Step 3：CapFilt 数据自举

预训练完一轮后：

1. **派出 captioner**：把 image-grounded text decoder 拿出来，在 COCO 上用 LM 损失 fine-tune。给每张网图 $I_w$ 用 nucleus sampling 生成一条新 caption $T_s$。
2. **派出 filter**：把 image-grounded text encoder 拿出来，在 COCO 上用 ITC + ITM 损失 fine-tune。让它对每条 caption 打分，ITM head 判为"不匹配"的就丢掉。
3. **filter 同时审两边**：原始 web 文本 $T_w$ 和合成文本 $T_s$ 都过滤，留下来的合在一起，再加上人工标注的 COCO/VG，组成新数据集 $D'$。
4. **新模型从头训**：拿 $D'$ 重新预训一个新 MED（实验表 13 证明：从老模型继续训反而不如从头训）。

**关键细节**：
- captioner 和 filter 必须**单独 fine-tune**，不共享参数（共享会让 captioner 生成的脏 caption 更不容易被 filter 抓出来——确认偏见）。
- 生成 caption 用 **nucleus sampling**（p=0.9）而非 beam search。beam search 倾向给"最安全"的常见 caption，多样性差；nucleus 采样更"野"，虽然脏的也多（噪声率从 19% 升到 25%），但总体提升更大（表 2）——多样性 > 安全性。

类比：写作文时让 AI"老老实实写最稳的句子"信息量低，让它"放飞一点写得有趣"虽然偶尔翻车但学到的更多。

*所以这一节是想说：方法分两阶段——先把 MED 三模式联合预训，再用预训模型派生 captioner+filter 清洗数据，干净数据回头训新模型。nucleus sampling、参数解耦、从头训这三个细节是关键。*

---

## 关键数字

**模型规模**：
- 图像端：ViT-B/16（86M 参数）或 ViT-L/16（307M 参数）
- 文本端：BERT-base 初始化，~110M 参数
- 共享后总参数：BLIP-Base 约 252M，比不共享的 361M 少近 30%

**数据规模**：
- 14M 设定：COCO + VG + CC3M + CC12M + SBU = 14M 图
- 129M 设定：上面 + LAION（115M，每 epoch 用 1/5）
- 人工标注 vs 网图 = 1.2M : 12.8M（14M 设定下）

**训练成本**：
- 2 个 16-GPU node = 32 卡
- batch size 2880（ViT-B）/ 2400（ViT-L）
- 20 epoch，warmup 到 lr=3e-4 后线性衰减 0.85
- 输入分辨率：预训 224×224，fine-tune 384×384

**性能数字**（vs ALBEF 14M 同等数据）：
- COCO 检索 TR@1：77.6 → 80.6（+3.0）
- COCO 检索 IR@1：60.7 → 63.1（+2.4）
- COCO captioning CIDEr：127.8 → 129.7
- VQA test-dev：75.84 → 77.54（+1.70）
- 零样本视频检索 MSRVTT R@1：18.7 → 43.3（甚至超过被微调的方法 +12.4）

**CapFilt 的具体增益**（14M 设定，ViT-B 表 1）：
- 不用 CapFilt：TR@1 78.4 / IR@1 60.7 / CIDEr 127.8
- 只 captioner：79.7 / 62.0 / 128.9
- 只 filter：79.1 / 61.5 / 128.2
- captioner + filter：80.6 / 63.1 / 129.7

**filter 的过滤率**：约 25%（nucleus + 解耦设定下，表 2）。

*所以这一节是想说：BLIP 用比 SimVLM 少 13 倍的数据、比 LEMON 低很多的输入分辨率，跑出更好的成绩；CapFilt 单独贡献 +1~3 个点，captioner 和 filter 必须配合用才能叠加效益。*

---

## 应该懂的新词

- **VLP (Vision-Language Pre-training)**：视觉语言预训练。先在图文对上预训出通用表示，再 fine-tune 到下游任务。
- **encoder-only / encoder-decoder / decoder-only**：模型只能编码（像 BERT、CLIP）/ 编码后再解码（像 T5、SimVLM）/ 只解码自回归生成（像 GPT）。BLIP 的 MED 是把前两者合并并加生成支路。
- **ITC / ITM / LM**：BLIP 三个 loss。ITC 拉近匹配嵌入；ITM 细粒度二分类；LM 自回归生成。
- **cross-attention vs self-attention**：self-attention 是同一序列内 token 之间互看；cross-attention 是 query 来自一边、key/value 来自另一边（BLIP 里 query 是文本 token，key/value 是图像 patch）。
- **causal self-attention**：因果掩码的 self-attention，每个位置只能看到自己和前面位置——为生成任务必备。
- **Nucleus sampling (top-p sampling)**：解码时只从累计概率 ≥ p 的最小 token 集合里采。比 beam search 多样、比 top-k 自适应。
- **Beam search**：解码时维护 k 条最优候选路径，每步扩展取分数最高的 k 条。倾向"安全平庸"。
- **CIDEr / SPICE / BLEU@4**：image captioning 的评测指标。CIDEr 看 n-gram 共识；SPICE 看场景图语义匹配；BLEU@4 看 4-gram 精确率。
- **R@1 / TR@1 / IR@1**：检索 recall@1，Top-1 命中率。TR 是文搜图（Text-to-image Retrieval，但 BLIP 表里是 image→text），IR 反过来。
- **Bootstrapping（自举）**：用模型当前的能力去改进数据/模型本身，再迭代。和"自蒸馏"、"自训练"是亲戚。
- **Confirmation bias（确认偏见）**：自己 fine-tune 出的 captioner 生成的脏 caption，自己的 filter 反而更难发现——因为它们看世界的方式相似。
- **Hard negative mining**：训练时不随便抽负样本，专挑那些"很容易被搞混"的负样本，逼模型学细节。
- **Momentum encoder**：维护一个参数缓慢移动平均的 encoder 副本，用它产生 soft label，缓解 noisy 数据下的对比学习不稳。

*所以这一节是想说：读 BLIP 至少要熟 VLP、ITC/ITM/LM、cross/causal-attention、nucleus sampling、bootstrapping 这五组词，否则后面的实验讨论看不进去。*

---

## 搞不定的

BLIP 没解决也明说了的问题：

- **没多轮自举**：作者自己点出"多轮 bootstrapping 是未来方向"。BLIP 只做了一轮 captioner→filter→重训。
- **每张图只有一条合成 caption**：可以一图多 caption 进一步扩充语料。
- **没做 captioner/filter 的 ensemble**：训多个版本组合可能更鲁棒。

更宏观的局限：

- **零样本 video 任务靠"丢帧拼序列"**：直接把 8 或 16 帧 ViT 特征拼起来，**完全忽略时序**。video QA / video retrieval 表面 SOTA，但任何强时序需求（动作识别、因果推理）就会暴露。
- **CapFilt 依赖人工标注的 COCO 做 fine-tune**：本质上还是 COCO 的"先验"在驱动。完全没有人标的领域（医学、卫星图）是否能 bootstrap 出干净 caption 是问号。
- **filter 的判定边界是 ITM 二分类**：阈值附近的 caption 可能"半对半错"，简单二分会丢信息。
- **NLVR² 加 web 图收益弱**：作者承认是 web 数据和下游数据的 domain gap 导致——表明 BLIP 不是万能的。
- **没用 vision-only self-supervision**：ViT 是 ImageNet 监督初始化的，没用 MAE 之类的自监督做更强 visual encoder。

后续工作怎么补：
- BLIP-2（同组）：把 LLM 接进来，CapFilt 思路升级成 Q-Former bridging。
- InstructBLIP：再加指令微调，做"会聊天的看图模型"。

*所以这一节是想说：BLIP 是"统一+清洗"的框架级胜利，但视频时序、领域迁移、多轮自举都还是开放问题；后来的 BLIP-2 / LLaVA 系列就是来填这些坑的。*

---

## 与别篇关系

**直接前作（架构和损失继承）**：
- **CLIP (Radford 2021)**：双塔 + ITC 对比学习。BLIP 把它的 ITC 拿来当三个 loss 之一。
- **ALBEF (Li 2021)**：BLIP 的"亲哥"——同一作者团队，双 encoder + cross-attention + ITC + ITM + momentum distillation。BLIP = ALBEF + LM 解码器 + CapFilt。
- **ViT (Dosovitskiy 2021)**：图像 backbone。
- **BERT (Devlin 2019)**：文本 backbone 初始化来源。

**同期对比方法**：
- **SimVLM (Wang 2021)**：encoder-decoder + 1.8B 数据。BLIP 用 1/13 数据超它。
- **ALIGN (Jia 2021)**：1.8B 暴力堆量的代表。BLIP 证明"清洗 100M 比硬堆 1.8B 更香"。
- **VinVL / LEMON / OSCAR**：依赖 object detector 提取 region feature 的旧路线，BLIP 走 detector-free 路线。

**思想关联**：
- **Knowledge Distillation (Hinton 2015) / Self-distillation**：CapFilt 可以看成 VLP 版本的自蒸馏——captioner 用合成 caption 蒸馏知识，filter 用过滤行为蒸馏知识。
- **Noisy Student (Xie 2020)**：用学生模型给伪标签训新学生的自训练，CapFilt 在视觉语言版本上做了类似事。
- **数据增强**：CapFilt 是面向 VLP 的数据增强，与 NLP 里"用 LM 生成增强文本"思路同源但更大胆。

**后续衍生**：
- **BLIP-2 (2023)**：保留 ITC/ITM/LM 三 loss，但把文本侧换成冻结的 LLM，用 Q-Former 做轻量 bridge。
- **InstructBLIP**：BLIP-2 + 指令微调。
- **LLaVA / MiniGPT-4**：受 BLIP 系列启发，但用 GPT-4 / ChatGPT 生成的指令数据。
- **EVA-CLIP / OpenCLIP**：继承 CLIP 思路但用更大数据。

**在 embodied AI / VLA 谱系里的位置**：
- BLIP 不直接做 embodied AI，但它是 RT-2、PaLM-E、π0 等 VLA 的"上游能力来源"——VLA 模型能看图理解任务，根子就在 BLIP/CLIP 这条 vlm-foundation 链上。

*所以这一节是想说：BLIP 是 ALBEF 的直接升级，是 CLIP 的"会写字版本"，也是 BLIP-2/LLaVA 的祖先；理解它就理解了 2022 年前后视觉语言基础模型的拐点。*

---

## 阅读顺序

如果你是入门读者，建议这样啃：

1. **先读 abstract + 图 1**（Captioner + Filter 的总览图）：30 秒抓住"自举数据"这个核心。
2. **跳到 Section 3.1（图 2）**：MED 三种模式 + 三种 loss，这是全文最需要看懂的图。先确认你能区分三个模式的 SA/CA 配置。
3. **回头看 Section 1 Introduction**：作者怎么说"模型偏科"和"数据脏"两个 motivation。
4. **读 Section 3.3（图 3）**：CapFilt 流程，结合图 4 的真实例子（哪些 caption 被 filter 杀掉了）。
5. **跳 Section 4.2 + 表 1**：CapFilt 的 ablation——单独 captioner、单独 filter、两者结合的提升量。
6. **看 Section 4.3 + 表 2**：为什么用 nucleus 而不是 beam search（多样性 > 安全性）。
7. **看 Section 4.4 + 表 3、表 4**：参数共享策略——pre-training 共享，但 captioner/filter 必须解耦。
8. **Section 5 各 SOTA 对比**：可以快速扫，关心数字就盯 14M 那行（公平对比）。
9. **Section 5.6 zero-shot video**：这是最炫的结果但也最有水分（无时序建模）。
10. **Section 6 Additional Ablation**：表 12（不是因为训得久）、表 13（不能从老模型继续训）这两个反向验证。
11. **Section 2 Related Work / 参考文献**：最后看，串联谱系。

**省时优先级**：图 2 + 图 3 + 表 1 + 表 2 + 5.6 这五个地方占信息量的 80%。

**搭配阅读**：
- 先读 ALBEF 论文（理解 BLIP 的起点）
- 再读 BLIP-2 论文（看演进方向）
- 想做 embodied 链路的：读完跳到 Flamingo / PaLM-E。

*所以这一节是想说：先看图 2 + 图 3 抓骨架，再看表 1 + 表 2 信关键 ablation，剩下的对比实验扫一眼即可。*

---

## FAQ

**Q1：MED 算"一个模型"还是"三个模型"？**
答：参数上是一个模型——三种模式共享 embedding、cross-attention、FFN，只有 self-attention 那部分会切换（双向 SA 给 encoder，因果 SA 给 decoder）。所以是"一组参数三个工作模式"，不是三套独立权重。

**Q2：CapFilt 是不是就是数据清洗？为什么要叫"自举"？**
答：因为清洗工具（captioner / filter）不是外人，是从模型自己派生的。模型先用脏数据训出基础能力，用这个能力清洗数据，清洗后的数据再训新模型——能力和数据互相 boost，所以叫 bootstrapping。

**Q3：为什么 captioner 和 filter 要解耦？让一个网络又生成又判断不行吗？**
答：实验上不行（表 4：解耦后效果好且过滤率从 8% 升到 25%）。直觉解释：共享参数会让 captioner 生成的脏 caption 在 filter 看来"自家产的没问题"，confirmation bias 让坏数据混过去。

**Q4：为什么生成 caption 要用 nucleus 而不是 beam search？**
答：beam search 倾向给"最高概率"的安全 caption，结果都是"a man is standing"这种空话，对模型学新东西没增益。nucleus 采样多样性强，虽然噪声率高但 filter 会兜底，最终增益更大（表 2）。

**Q5：为什么不用过滤好的数据"接着训"老模型？**
答：表 13 直接验证了——继续训不如从头训。作者类比知识蒸馏：学生不该从老师那里直接初始化（不然学到的还是老师的偏见），应该重新开始。

**Q6：BLIP 在视频上零样本 SOTA 是怎么做到的，不是说没建模时序吗？**
答：直接抽 8 / 16 帧 ViT 特征拼成长序列喂给 image-grounded text encoder，像处理"很多张图一起"一样。能 work 是因为 MSRVTT/MSVD 这类任务很多帧都长得差不多，时序不关键；但碰到强时序任务（动作分类）就会原形毕露。

**Q7：CapFilt 是不是只能用 COCO 做 fine-tune？换个领域行不行？**
答：论文只在 COCO 上 fine-tune captioner/filter。换领域理论上可行（拿那个领域的少量人标对 fine-tune 就行），但 fine-tune 数据集质量决定了"清洗师傅"的水平上限——这是 BLIP 没回答的问题。

**Q8：BLIP 和 CLIP 到底什么关系？**
答：CLIP 只做 ITC（对比学习）一件事，是 BLIP 的"理解任务子集"。BLIP 在 CLIP 的能力上多加了 ITM（细粒度判别）和 LM（生成），并且补了 CapFilt 数据治理。可以把 BLIP 看成"CLIP + 解码器 + 数据自洁"。

**Q9：BLIP 训练成本贵吗？**
答：32 张 GPU × 20 epoch，batch size ~2880。在 2022 年是中等规模——比 CLIP 的 256 V100 × 12 days 便宜很多（因为数据少 1 个数量级），比 SimVLM-huge 那种 1.8B 数据更便宜。但比 ALBEF 略贵（多了 LM 损失和 CapFilt 重训）。

**Q10：我自己想用 BLIP 做下游任务，从哪开始？**
答：直接用 HuggingFace 的 `Salesforce/blip-*` 系列 checkpoint（image-captioning-base / vqa-base / itm-base）。零样本能用就别 fine-tune；要 fine-tune 看 BLIP 官方仓库 README。如果是新任务，建议先试 BLIP-2，已经默认接 LLM、能力更强。

*所以这一节是想说：MED 本质是"参数共享但模式切换"，CapFilt 本质是"模型自产自校的数据自举"，两者解耦训练 + nucleus 采样 + 从头重训是三个让方法 work 的关键工程细节。*

---

## 延伸阅读

**前作打底**（按读顺序）：
1. CLIP (Radford et al., 2021) — 对比学习对齐图文，BLIP 的 ITC 来源。
2. ViT (Dosovitskiy et al., 2021) — BLIP 图像 backbone。
3. ALBEF (Li et al., 2021) — BLIP 的直接前身，必读。
4. ALIGN (Jia et al., 2021) — 1.8B 暴力堆量代表。

**同期对比**：
- SimVLM (Wang et al., 2021) — encoder-decoder 路线代表。
- VinVL / OSCAR (Zhang/Li et al.) — 依赖 detector 的旧路线。
- LEMON (Hu et al., 2021) — captioning 老 SOTA。

**直系后续**：
- BLIP-2 (Li et al., 2023) — Q-Former + 冻结 LLM。
- InstructBLIP — 指令微调版本。
- Flamingo (Alayrac et al., 2022) — DeepMind 的对手作品，few-shot 多模态。
- LLaVA / MiniGPT-4 — 把 BLIP 思路接到 GPT-4 数据上。

**思想关联**：
- Knowledge Distillation (Hinton et al., 2015) — 自蒸馏鼻祖。
- Noisy Student (Xie et al., 2020) — 自训练 ImageNet 突破。
- CC3M / CC12M / LAION — BLIP 用的预训练数据集，配合 paper 看数据规模。

**embodied AI 链路**（理解 BLIP 在更大图谱里的位置）：
- Flamingo / PaLM-E / RT-2 — 把视觉语言能力接到机器人控制上。
- VC-1 / R3M / Voltron — 机器人专用视觉编码器，但思路上都受 CLIP/BLIP 影响。

**实操**：
- HuggingFace `Salesforce/blip-*` 官方 checkpoint
- 官方仓库：github.com/salesforce/BLIP
- Colab demo：仓库里有 image-captioning / VQA / retrieval 三个 notebook

*所以这一节是想说：把 BLIP 放进"CLIP → ALBEF → BLIP → BLIP-2 → LLaVA / RT-2"这条链里读，能看清整个 vlm-foundation 谱系的传承——以及它最终怎么影响了 embodied AI。*
