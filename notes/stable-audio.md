---
title: "Stable Audio"
slug: stable-audio
topic: auditory
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2402.04825"
venue: ICML
year: 2024
era: frontier
num: 24
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

打几个字描述你想要的声音，AI 就能做出几十秒到一两分钟的高音质音乐或音效，长度还能精确到秒。

## 这是个什么场景 — 日常类比

刷短视频时常会冒出这种念头：这段画面要是配点紧张鼓点就好了，或者"再多 10 秒就刚好踩到镜头切换"。但你不会作曲、也没买曲库——只能去音乐网站翻半天，运气好找到差不多的，运气不好就放弃。再或者你打游戏想要一段"开门吱呀声 + 远处脚步声"的环境音，市面成品要么不够长、要么风格不对。

Stable Audio 解决的就是这件事：你打字描述"电子舞曲，128 BPM，紧张感，47 秒"，它直接给你一段 47 秒的高音质音频，像跟厨师点菜既能说菜名（文本提示）又能指定分量（时长）。"47 秒"这个能精准指定的长度是关键——之前同类工具大多只能做固定 10 秒的小片段，多 1 秒少 1 秒都做不到。

更技术一点的类比：图像生成里 Stable Diffusion 不在像素上画画，而是先把图缩进一个"压缩图"空间里画好再放大；Stable Audio 干同样的事，只不过原始信号是音频波形（每秒 44100 个采样点，一分钟就是 264 万个数）。直接在波形上跑扩散根本跑不动，所以必须先压。

## 之前的人怎么做的 — 3-5 bullet

- **AudioLDM / AudioLDM2**：也是 latent diffusion + 文本条件，但生成的多是 10 秒级固定长度的音效片段，时长不可控，长音乐不行。
- **MusicLM / MusicGen（Meta）**：走 token 路线，把音频离散化成 codec token（类似 SoundStream / EnCodec），再用 Transformer autoregressive 生成；质量好但推理慢，长音频要一个 token 一个 token 蹦。
- **Riffiusion**：把音频转成 mel-spectrogram 图像，直接复用 Stable Diffusion 生图；hack 味重，时长也短。
- **Jukebox（OpenAI, 2020）**：层级化 VQ-VAE + 自回归 Transformer，能生成长音乐，但训练和采样都极慢，质量也不算稳。
- **共同短板**：要么时长短且不可控、要么采样慢、要么采样率低（24 kHz 居多，达不到 CD 质量 44.1 kHz）。

## 这篇论文的关键想法

三个关键动作叠在一起：

1. **专门为音频训的 VAE — 像给乐谱设计一套专用速记法。** 不复用图像那套压缩工具，而是从头训一个专门把 44.1 kHz 立体声波形压到"低帧率潜空间"的 autoencoder（自编码器：编码器负责压、解码器负责还原）。压完之后数据量小很多，扩散模型才跑得动；具体压缩比需读原文确认。
2. **时长作为条件信号 — 像点菜时直接说"分量给我做 47 秒那么大"。** 把"目标输出秒数"和"在原音频里的起止位置"编码成数字喂进去，diffusion model 不再被动接受固定长度，而是知道自己该铺多长的画布。
3. **Diffusion Transformer（DiT 风格）on 1D latent — 像换一种握笔方式，能写更长的字。** 用 Transformer 而不是 U-Net 在 latent 序列上做去噪，这样长序列建模更稳，能撑得住几十秒到 95 秒的输出（业界报道是 95 秒，具体训练时长上限需读原文）。

收益是：一次推理出长音频、时长可控、质量逼近 44.1 kHz CD 级、采样比"一个 token 一个 token 蹦"的自回归模型快很多。

## 它怎么做的（方法）— 3-4 段

**第一步：训 audio VAE — 像招一位专门的"音频压缩员"。** 教一个网络把立体声波形 x 编码成潜变量 z，再解码回 x'，目标函数是重构 loss + 对抗 loss + 多尺度 STFT loss（这套损失组合是音频生成里的常见配方，借鉴自 SoundStream、EnCodec、Descript Audio Codec 这条线）。压完之后 z 的"帧率"远低于原波形采样率，扩散模型才跑得动。注意这里 VAE 是连续潜空间，不是 codec 那种离散 token。

等等，先慢一拍 — VAE 是什么？变分自编码器（Variational Autoencoder），把高维信号压成连续向量、再还原回来；和 codec 路线（把声音切成离散 token 像打字一样发）不同，VAE 给的是连续的"压缩图"，更适合后面的扩散过程在上面"画画"。

**第二步：文本编码器 — 像找一位翻译官，把人话翻成机器读得懂的向量。** 用一个预训练的文本-音频对照模型（论文用的是 CLAP 文本塔之类的对比学习编码器，具体型号需读原文）把 prompt "电子舞曲，128 BPM，渐强 drop" 编码成一组数字（condition embedding）。这组数字通过 cross-attention（交叉注意力）注入扩散主干。

**第三步：时长/位置条件 — 像在裁缝店标"袖长 47 公分"。** 训练时从一段更长的音频里随机截窗口，把"这段窗口在原音频中的起始秒数 + 总秒数"做傅立叶位置编码后拼到 condition 里。推理时你说"我要 60 秒，从 0 开始"，模型就明白要铺满 60 秒；也可以指定"从 10 秒到 50 秒"做局部生成。

**第四步：latent diffusion 主干 — 像在压缩图上一笔一笔擦掉雪花，露出干净画面。** 在 z 上跑标准 diffusion（v-prediction 或 EDM 框架，具体配置需读原文），主干是 1D Diffusion Transformer。推理时 DDIM 类采样器跑几十到上百步出 latent，再过 VAE decoder 还原成波形。整体是"先压、再扩散、再解压"的三明治。

## 实验在做什么

- **文本到音乐 / 文本到音效**：在 AudioCaption、AudioSet、MusicCaps 这类公开 benchmark 上比 FAD（Fréchet Audio Distance）、CLAP score（语义对齐分）、人评分；对照对象是 AudioLDM2、MusicGen 等。
- **时长可控性消融**：验证给定不同 duration 时输出实际秒数是否准确，以及质量是否随时长退化。
- **采样率消融**：44.1 kHz vs 16/24 kHz 对比，证明高采样率确实带来主观音质提升。
- **采样速度**：对比自回归 token 模型，diffusion latent 路线在生成 1 分钟级音频时挂钟时间显著短（具体数字需读原文）。

注意：训练数据来自 AudioSparx 这类授权音频库（这是 Stability AI 当时回应版权质疑的关键卖点之一），不是从 YouTube 乱爬。

## 你应该懂的几个新词 — 4-6 个

- **Latent Diffusion**：不在原始信号空间扩散，而是先用 VAE 压到低维潜空间扩散；图像里 Stable Diffusion 让它出圈。
- **VAE（Variational Autoencoder）**：编码器把信号压成连续向量、解码器还原；和 codec 的离散 token 是不同路线。
- **CLAP**：Contrastive Language-Audio Pretraining，对标 CLIP 但音频版；用来把文本和音频映射到同一语义空间。
- **DiT（Diffusion Transformer）**：去噪主干用 Transformer 而非 U-Net；长序列建模更友好。
- **44.1 kHz / 立体声**：CD 标准采样率（每秒 44100 个采样点）+ 双声道；行业把这当作"听感能过关"的下限。
- **FAD（Fréchet Audio Distance）**：音频生成版的 FID，越低越像真实分布。

## 它和其他论文什么关系

- **上游基石**：Stable Diffusion（图像 latent diffusion 范式）→ 直接搬到音频。
- **VAE/codec 邻居**：SoundStream、EnCodec、Descript Audio Codec——同样的 GAN + STFT loss 训音频压缩，但他们做的是离散 codec 给自回归用，Stable Audio 留连续 latent 给 diffusion 用。
- **同代竞品**：MusicGen（autoregressive token）、AudioLDM2（latent diffusion 但短）、Jukebox（老派层级 VQ）。Stable Audio 的差异点是"长 + 高采样率 + 时长可控"。
- **下游影响**：Stable Audio Open（开源版）、Stable Audio 2（更长 3 分钟、加 audio-to-audio）都在这条线上演化；后来 ElevenLabs、Suno、Udio 等商业产品的技术取向也在向"latent diffusion + Transformer"靠拢。
- **embodied/感知线索**：作为 auditory 主题的 frontier 论文，它代表"声音生成进入可控长序列时代"，对机器人/具身做声音反馈、TTS-non-speech、环境音模拟有间接影响。

## 我建议这样读 — 3-4 步

1. **先听 demo**：去 Stability AI 官博听 Stable Audio 的样例，建立"哦，这质量"的直觉，再读论文不容易迷。
2. **复习 Stable Diffusion 的 latent diffusion 框架**：如果你对图像版的"VAE 编码 → UNet/DiT 去噪 → 解码"路径已经熟，音频版就是把空间换成时间序列，重点看"VAE 是怎么训的"和"时长条件是怎么注入的"。
3. **读方法章节，重点抓三件事**：(a) audio VAE 的损失组合和压缩比；(b) 时长/位置 embedding 怎么 fourier 编码；(c) DiT 的 conditioning 注入方式（cross-attn vs adaLN）。
4. **跳过实验细节，看消融表**：直接看时长可控性 + 采样率 + 与 MusicGen 对比那几张表，理解"它换来了什么、牺牲了什么"。

## 为什么值得读

- **范式信号**：它是把"latent diffusion + Transformer"在音频域做实的代表作，跟着这条路你能看懂后面 Stable Audio 2、AudioBox、Suno 这些产品的内核。
- **工程教科书**：从音频 VAE 训练、loss 组合、CLAP 条件、duration 注入到推理采样，每一块都是音频生成里能直接复用的零件。
- **对 embodied AI 的延伸价值**：机器人/agent 需要"会发声"的能力（环境音模拟、非语音反馈、声学渲染），Stable Audio 的可控时长 latent diffusion 是这条路上的可参考模板。
- **门槛适中**：如果你已经吃下 Stable Diffusion + Transformer + 一点 codec/VAE 知识，读这篇是把已有概念在新模态上重新焊一遍——巩固知识图谱的高 ROI 论文。
