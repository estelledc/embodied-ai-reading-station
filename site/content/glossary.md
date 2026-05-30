---
title: 具身智能术语字典
order: 2
intro: 'VLM / VLA / SLAM / CLIP / LoRA... 50+ 术语一句话讲清'
---

读论文笔记遇到看不懂的英文缩写？查这里。

每条只给一句话定义 + 一个日常类比 + 出现在哪几篇 + 想深入读什么。按字母排序，挑了 13 篇笔记里出现频率最高的 ~55 个术语。

## 索引

[A](#a) · [B](#b) · [C](#c) · [D](#d) · [E](#e) · [F](#f) · [G](#g) · [H](#h) · [I](#i) · [K](#k) · [L](#l) · [M](#m) · [N](#n) · [O](#o) · [P](#p) · [Q](#q) · [R](#r) · [S](#s) · [T](#t) · [U](#u) · [V](#v)

---

## A

### Action
- 中文：动作
- 定义：机器人下一步要发出的控制指令（关节角度 / 末端位姿 / 速度等）。
- 类比：你打字时手指按下哪个键。
- 出现：cosmos-policy / mla / openvla / saycan / vlas
- 深入：[Robot Learning lecture (Stanford CS223A)](https://see.stanford.edu/Course/CS223A)

### Affordance
- 中文：可供性 / 行动可能性
- 定义：环境告诉智能体"在这里可以做什么动作"的属性。
- 类比：把手暗示"这里可以拉"，按钮暗示"这里可以按"。
- 出现：saycan
- 深入：[Wikipedia: Affordance](https://en.wikipedia.org/wiki/Affordance)

### ALOHA
- 中文：ALOHA 双臂遥操作平台
- 定义：低成本双臂机器人平台 + 数据采集系统，常作 VLA 训练数据来源。
- 类比：双手版的"教机器人开火锅店"录像棚。
- 出现：openvla / mla
- 深入：[ALOHA project page](https://tonyzhaozh.github.io/aloha/)

### ASR (Automatic Speech Recognition)
- 中文：自动语音识别
- 定义：把语音波形转成文本。
- 类比：你说话，电脑打字员实时打出来。
- 出现：neuralaids / proactive-hearing / vlas
- 深入：[Wikipedia: Speech recognition](https://en.wikipedia.org/wiki/Speech_recognition)

### Attention
- 中文：注意力机制
- 定义：让模型对输入序列里不同位置赋予不同权重再加权求和。
- 类比：读句子时眼睛重点盯关键词。
- 出现：3dshape2vecset / acoustic-swarms / mla / neuralaids / openvla / proactive-hearing / saycan / vlas
- 深入：[The Illustrated Transformer (Jay Alammar)](https://jalammar.github.io/illustrated-transformer/)

## B

### Backbone
- 中文：主干网络
- 定义：模型负责提特征的核心部分，下游任务接小头复用它。
- 类比：一棵树的树干，上面挂不同的"任务枝"。
- 出现：mla / openvla / vlas
- 深入：[Backbone in deep learning (Papers with Code)](https://paperswithcode.com/method/backbone)

### BC (Behavior Cloning)
- 中文：行为克隆
- 定义：直接监督学习人类示范"看到 X → 做 Y"的映射。
- 类比：徒弟照着师傅每一步抄。
- 出现：mla / nlos-mmwave / openvla / saycan
- 深入：[Imitation Learning survey (Osa et al. 2018)](https://arxiv.org/abs/1811.06711)

### BERT
- 中文：BERT 语言模型
- 定义：双向 Transformer 编码器，给文本/序列产稠密向量。
- 类比：把一句话压成一组数字"指纹"。
- 出现：3dshape2vecset / mmclip / openvla / saycan
- 深入：[BERT paper (Devlin 2018)](https://arxiv.org/abs/1810.04805)

### BLIP
- 中文：BLIP 图文模型
- 定义：图文联合预训练模型家族，常作 VLA 的视觉理解模块。
- 类比：升级版的"看图说话"机器人。
- 出现：llava / openvla / vlas
- 深入：[BLIP paper (Li 2022)](https://arxiv.org/abs/2201.12086)

## C

### CLIP (Contrastive Language-Image Pretraining)
- 中文：CLIP 图文对比模型
- 定义：用对比学习把图像和文字塞进同一个向量空间。
- 类比：照片和它的标题在同一张坐标纸上靠得更近。
- 出现：3dshape2vecset / llava / mmclip / nlos-mmwave / openvla / vlas
- 深入：[OpenAI CLIP blog](https://openai.com/research/clip)

### CNN (Convolutional Neural Network)
- 中文：卷积神经网络
- 定义：用滑动窗口提空间局部特征的网络，传统视觉主力。
- 类比：拿放大镜一格格扫描照片找模式。
- 出现：3dshape2vecset / acoustic-swarms / neuralaids / saycan
- 深入：[CS231n CNN notes](https://cs231n.github.io/convolutional-networks/)

### Codebook
- 中文：码本
- 定义：一组离散向量字典，每个输入被量化映射到字典里最近的一个。
- 类比：把所有发型归类到"短发/长发/卷发..."有限几种。
- 出现：mla（隐式）/ vlas（speech token）
- 深入：[VQ-VAE paper (van den Oord 2017)](https://arxiv.org/abs/1711.00937)

## D

### DDPM / DDIM (Denoising Diffusion Probabilistic / Implicit Models)
- 中文：去噪扩散模型 / 确定性采样变体
- 定义：从纯噪声逐步去噪生成数据；DDIM 是更快的确定性采样器。
- 类比：把一团雪花静电慢慢"擦"成清晰图片。
- 出现：3dshape2vecset / mla
- 深入：[What are Diffusion Models? (Lilian Weng)](https://lilianweng.github.io/posts/2021-07-11-diffusion-models/)

### DETR (DEtection TRansformer)
- 中文：基于 Transformer 的目标检测器
- 定义：用 Transformer 端到端做目标检测，替代传统 anchor 流程。
- 类比：让模型"一眼看完整张图"再框物体。
- 出现：3dshape2vecset
- 深入：[DETR paper (Carion 2020)](https://arxiv.org/abs/2005.12872)

### Diffusion
- 中文：扩散模型
- 定义：通过学"如何把噪声还原回数据"来生成图像/动作/3D 形状。
- 类比：先把照片揉成雪花屏，再学倒着把雪花屏揉回照片。
- 出现：3dshape2vecset / cosmos-policy / mla / nlos-mmwave / openvla
- 深入：[Diffusion explained visually (AssemblyAI)](https://www.assemblyai.com/blog/diffusion-models-for-machine-learning-introduction/)

### Doppler
- 中文：多普勒效应
- 定义：物体相对运动会让反射回波频率偏移，由此可测速。
- 类比：救护车开过你身边时鸣笛音调先高后低。
- 出现：mmclip / rf-slam
- 深入：[Wikipedia: Doppler effect](https://en.wikipedia.org/wiki/Doppler_effect)

## E

### EDM (Elucidating Diffusion Models)
- 中文：EDM 扩散框架
- 定义：Karras 等人 2022 年提出的统一扩散模型设计空间，含改进采样器。
- 类比：把各家扩散方法的"调料瓶"摆成一张图，让你按需调配。
- 出现：3dshape2vecset / cosmos-policy
- 深入：[EDM paper (Karras 2022)](https://arxiv.org/abs/2206.00364)

### Embedding
- 中文：嵌入向量
- 定义：把离散输入（词/图块/物体）映射成稠密向量。
- 类比：把"猫"这个字翻译成一组 768 个数字描述它的"猫性"。
- 出现：mmclip / proactive-hearing
- 深入：[Word embeddings (TensorFlow tutorial)](https://www.tensorflow.org/text/guide/word_embeddings)

### Embodied
- 中文：具身的
- 定义：智能体有物理身体，必须和真实/仿真环境交互完成任务。
- 类比：不是只在屏幕里聊天的 AI，是能伸手拿杯子的 AI。
- 出现：cosmos-policy / saycan
- 深入：[Embodied AI workshop](https://embodied-ai.org/)

### Encoder / Decoder
- 中文：编码器 / 解码器
- 定义：编码器把输入压成特征向量，解码器从特征生成输出。
- 类比：压缩成 zip 再解压回文件。
- 出现：3dshape2vecset / acoustic-swarms / cosmos-policy / mla / mmclip / openvla / saycan / vlas
- 深入：[Sequence to sequence intro (Sutskever 2014)](https://arxiv.org/abs/1409.3215)

## F

### FFT (Fast Fourier Transform)
- 中文：快速傅里叶变换
- 定义：把时域信号转成频域成分（频率 / 相位）的高效算法。
- 类比：把一段和弦音拆成"哪些音符以多大音量同时响"。
- 出现：mmclip / neuralaids / nlos-mmwave / proactive-hearing
- 深入：[3Blue1Brown: But what is the Fourier Transform?](https://www.youtube.com/watch?v=spUNpyF58BY)

### FMCW (Frequency-Modulated Continuous Wave) Radar
- 中文：调频连续波雷达
- 定义：连续发频率随时间线性扫描的电磁波，回波频差换算距离与速度。
- 类比：连续吹一声从低到高的口哨，听回声音调差判断墙离多远。
- 出现：mmclip / nlos-mmwave / rf-slam
- 深入：[TI mmWave radar primer](https://www.ti.com/lit/wp/spyy005a/spyy005a.pdf)

### Foundation Model
- 中文：基础模型
- 定义：在海量通用数据上预训练、能迁移到很多下游任务的大模型。
- 类比：上完九年义务教育的"通才"，再去专修任何专业。
- 出现：cosmos-policy / mla / mmclip / openvla / vlas
- 深入：[Stanford CRFM report](https://crfm.stanford.edu/report.html)

### FSDP (Fully Sharded Data Parallel)
- 中文：完全分片数据并行
- 定义：PyTorch 把模型参数/梯度/优化器状态切分到多卡的训练方案。
- 类比：一本太厚的书拆成 8 份，8 个人各保管一段，要用时互相借。
- 出现：llava / openvla
- 深入：[PyTorch FSDP tutorial](https://pytorch.org/tutorials/intermediate/FSDP_tutorial.html)

## G

### Generalization
- 中文：泛化
- 定义：在没见过的数据/场景上仍然能干得好的能力。
- 类比：学会做番茄炒蛋后，换了厨房和锅也能炒。
- 出现：cosmos-policy / mla / mmclip / neuralaids / openvla
- 深入：[Generalization in deep learning (Zhang 2017)](https://arxiv.org/abs/1611.03530)

### GPT (Generative Pre-trained Transformer)
- 中文：GPT 类自回归语言模型
- 定义：用 Transformer 解码器架构、按 token 自左向右生成的语言模型。
- 类比：超级强力的"下一个字预测"输入法。
- 出现：cosmos-policy / llava / openvla / proactive-hearing / saycan / vlas
- 深入：[The Illustrated GPT-2](https://jalammar.github.io/illustrated-gpt2/)

## H

### HAR (Human Activity Recognition)
- 中文：人体行为识别
- 定义：从传感器信号判断人在做什么动作（走 / 坐 / 跌倒 / 挥手）。
- 类比：手表通过加速度判断你"在跑步还是在睡觉"。
- 出现：mmclip
- 深入：[HAR survey (Wang 2019)](https://arxiv.org/abs/1809.08762)

## I

### IMU (Inertial Measurement Unit)
- 中文：惯性测量单元
- 定义：含加速度计 + 陀螺仪（常加磁力计）的传感器，测姿态变化。
- 类比：手机里的"知道自己在转还是在动"的小芯片。
- 出现：acoustic-swarms / neuralaids / nlos-mmwave
- 深入：[Wikipedia: Inertial measurement unit](https://en.wikipedia.org/wiki/Inertial_measurement_unit)

### Inference
- 中文：推理
- 定义：模型训练好之后跑一次前向得出预测的过程。
- 类比：考完试后"考场" → 现在在"做题"阶段。
- 出现：3dshape2vecset / cosmos-policy / mmclip / openvla / vlas
- 深入：[ML inference vs training (NVIDIA blog)](https://blogs.nvidia.com/blog/difference-deep-learning-training-inference-ai/)

## K

### KL Divergence (Kullback-Leibler)
- 中文：KL 散度
- 定义：衡量两个概率分布有多不一样的非对称距离。
- 类比：你猜的硬币正反概率和真实硬币偏多远。
- 出现：3dshape2vecset / mmclip
- 深入：[Wikipedia: KL divergence](https://en.wikipedia.org/wiki/Kullback%E2%80%93Leibler_divergence)

## L

### Latent
- 中文：潜变量 / 潜空间表示
- 定义：模型内部抽象出来、不直接可见的特征向量。
- 类比：人脑里"猫的概念"——你说不出来但能识别。
- 出现：3dshape2vecset / acoustic-swarms / cosmos-policy / mla / openvla
- 深入：[Latent space explained (Towards Data Science)](https://towardsdatascience.com/understanding-latent-space-in-machine-learning-de5a7c687d8d)

### LiDAR (Light Detection And Ranging)
- 中文：激光雷达
- 定义：发射激光脉冲、用回波时间测距得出 3D 点云。
- 类比：用激光"摸"出周围环境的盲人手杖。
- 出现：mmclip / nlos-mmwave / rf-slam
- 深入：[Wikipedia: Lidar](https://en.wikipedia.org/wiki/Lidar)

### LIBERO / CALVIN / DROID
- 中文：常用机器人操作 benchmark / 数据集
- 定义：评测 VLA 在多种厨房 / 桌面操作任务上的标准测试集。
- 类比：机器人版的"高考真题"。
- 出现：openvla / mla / cosmos-policy
- 深入：[DROID dataset](https://droid-dataset.github.io/) · [LIBERO benchmark](https://libero-project.github.io/)

### LLM (Large Language Model)
- 中文：大语言模型
- 定义：参数量在 10 亿+ 的 Transformer 文本模型，如 GPT / Llama。
- 类比：读完互联网的"博学话痨"。
- 出现：acoustic-swarms / cosmos-policy / llava / mla / mmclip / openvla / proactive-hearing / rf-slam / saycan / vlas
- 深入：[A Survey of LLMs (Zhao 2023)](https://arxiv.org/abs/2303.18223)

### LoRA (Low-Rank Adaptation)
- 中文：低秩适配微调
- 定义：冻结大模型主干，只训插入的低秩矩阵实现轻量微调。
- 类比：不动书的正文，只在书页上贴小便条。
- 出现：mmclip / openvla
- 深入：[LoRA paper (Hu 2021)](https://arxiv.org/abs/2106.09685)

### LSTM (Long Short-Term Memory)
- 中文：长短期记忆网络
- 定义：能记长序列依赖的循环神经网络变种，含门控机制。
- 类比：会自己决定"哪段记忆要留要忘"的笔记本。
- 出现：neuralaids / proactive-hearing / vlas
- 深入：[Understanding LSTM Networks (Christopher Olah)](https://colah.github.io/posts/2015-08-Understanding-LSTMs/)

## M

### Manipulation
- 中文：（机器人）操作
- 定义：用机械臂 / 手抓取、移动、旋转物体的任务族。
- 类比：机器人版的"用筷子夹菜"。
- 出现：mla / openvla / saycan / vlas
- 深入：[Robot Manipulation course (MIT 6.4210)](https://manipulation.csail.mit.edu/)

### MDP (Markov Decision Process)
- 中文：马尔可夫决策过程
- 定义：用 (状态, 动作, 转移概率, 奖励) 描述强化学习问题的数学框架。
- 类比：玩棋——当前局面 + 你下一步 → 下一局面 + 得分。
- 出现：cosmos-policy / saycan
- 深入：[Sutton & Barto RL book ch.3](http://incompleteideas.net/book/RLbook2020.pdf)

### Mesh
- 中文：网格
- 定义：用三角面片（顶点 + 拓扑）表示的 3D 物体表面。
- 类比：3D 模型上的"钢丝外壳"。
- 出现：3dshape2vecset / nlos-mmwave
- 深入：[Polygon mesh (Wikipedia)](https://en.wikipedia.org/wiki/Polygon_mesh)

### MLA (Multisensory Language-Action)
- 中文：多感官语言动作模型（本站 mla 论文）
- 定义：让 VLA 同时融合视觉、触觉、点云并预测未来感官状态。
- 类比：机器人不止用眼睛吃饭，还用指尖+距离感+脑补下一口。
- 出现：mla
- 深入：[本站 mla 笔记](/notes/mla.html)

### MLP (Multi-Layer Perceptron)
- 中文：多层感知机
- 定义：最基础的全连接前馈网络，常作各种模型里的"小头"。
- 类比：搭积木里的最小单元方块。
- 出现：3dshape2vecset / mla / openvla / rf-slam / vlas
- 深入：[MLP explained (DeepLearning.ai)](https://www.deeplearning.ai/ai-notes/initialization/index.html)

### mmWave (Millimeter Wave)
- 中文：毫米波
- 定义：30–300 GHz 频段电磁波，常用 60 / 77 GHz 雷达感知。
- 类比：能"看穿"薄墙、雾、烟的隐身视线。
- 出现：mmclip / nlos-mmwave / rf-slam
- 深入：[mmWave overview (TI)](https://www.ti.com/sensors/mmwave-radar/overview.html)

## N

### NLOS (Non-Line-Of-Sight)
- 中文：非视距
- 定义：传感器和目标之间被障碍物挡住，需靠反射 / 散射成像。
- 类比：用墙上的反光看到墙后面的人。
- 出现：mmclip / nlos-mmwave / rf-slam
- 深入：[NLOS imaging review (O'Toole 2018, Nature)](https://www.nature.com/articles/nature25489)

## O

### Octree
- 中文：八叉树
- 定义：把 3D 空间递归切成 8 个子立方体的数据结构。
- 类比：3D 版的地图缩放——大区域看不清就切 8 块继续放大。
- 出现：3dshape2vecset / nlos-mmwave
- 深入：[Wikipedia: Octree](https://en.wikipedia.org/wiki/Octree)

### OOD (Out-Of-Distribution)
- 中文：分布外
- 定义：测试样本来自和训练集不同的数据分布。
- 类比：你只学过中餐，今天给你一道法餐让你做。
- 出现：cosmos-policy / openvla / proactive-hearing
- 深入：[OOD detection survey (Yang 2021)](https://arxiv.org/abs/2110.11334)

## P

### Patch
- 中文：图像块 / 切片
- 定义：把一张图等分成 16×16 等小块，每块当一个 token 喂给 Transformer。
- 类比：把一幅画剪成方块拼图，再让模型读每一块。
- 出现：3dshape2vecset（隐式）/ openvla
- 深入：[ViT paper (Dosovitskiy 2020)](https://arxiv.org/abs/2010.11929)

### Policy
- 中文：策略
- 定义：从观测 → 动作的映射函数，机器人 / RL 智能体的"大脑"。
- 类比：司机的"看到红灯就踩刹车"驾驶习惯总和。
- 出现：3dshape2vecset / acoustic-swarms / cosmos-policy / mla / openvla / saycan
- 深入：[Spinning Up RL: Policies](https://spinningup.openai.com/en/latest/spinningup/rl_intro.html)

### Pose
- 中文：位姿
- 定义：物体的位置 (x,y,z) + 朝向（旋转）合在一起。
- 类比：不仅"杯子在桌上哪儿"，还要"杯口朝哪儿"。
- 出现：nlos-mmwave / rf-slam
- 深入：[Pose (computer vision) — Wikipedia](https://en.wikipedia.org/wiki/Pose_(computer_vision))

### Pretrain / Finetune
- 中文：预训练 / 微调
- 定义：先在大规模通用数据上学（pretrain），再在小规模目标任务上学（finetune）。
- 类比：先上大学，再上岗培训。
- 出现：openvla / vlas / mla 等多数
- 深入：[Transfer learning intro (Sebastian Ruder)](https://ruder.io/transfer-learning/)

## Q

### Quantization (QAT / PTQ)
- 中文：量化（训练时 / 训练后）
- 定义：把 32-bit 浮点权重压成 8-bit / 4-bit 整数，缩体积加速推理。
- 类比：把高清照片转成低分辨率图省存储。
- 出现：neuralaids / openvla
- 深入：[Quantization for neural networks (Krishnamoorthi 2018)](https://arxiv.org/abs/1806.08342)

## R

### Radar
- 中文：雷达
- 定义：发射无线电波、接回波分析目标距离 / 速度 / 形状的传感器。
- 类比：蝙蝠回声定位的电磁版。
- 出现：mmclip / nlos-mmwave / rf-slam
- 深入：[Wikipedia: Radar](https://en.wikipedia.org/wiki/Radar)

### RAG (Retrieval-Augmented Generation)
- 中文：检索增强生成
- 定义：生成前先去外部知识库检索相关片段拼到 prompt 里。
- 类比：写作业前先翻参考书再下笔。
- 出现：vlas
- 深入：[RAG paper (Lewis 2020)](https://arxiv.org/abs/2005.11401)

### RGB / RGB-D
- 中文：彩色图 / 彩色 + 深度图
- 定义：标准 3 通道彩色图像；RGB-D 多一通道每像素到相机的距离。
- 类比：普通照片 vs 带"等高线"的照片。
- 出现：3dshape2vecset / cosmos-policy / mla / nlos-mmwave / openvla / rf-slam / saycan
- 深入：[RGB-D sensor (Wikipedia)](https://en.wikipedia.org/wiki/RGBD_sensor)

### RIR (Room Impulse Response)
- 中文：房间脉冲响应
- 定义：声音从某个声源到某个麦克位置经过墙壁反射后的"传函"。
- 类比：在浴室喊一声会有回声——就是浴室的 RIR 在起作用。
- 出现：acoustic-swarms / proactive-hearing
- 深入：[Wikipedia: Impulse response](https://en.wikipedia.org/wiki/Impulse_response)

### RL (Reinforcement Learning)
- 中文：强化学习
- 定义：智能体通过和环境试错、根据奖励信号调整行为的学习范式。
- 类比：训狗——做对了给零食，做错了不给。
- 出现：cosmos-policy / saycan
- 深入：[Sutton & Barto RL book](http://incompleteideas.net/book/the-book-2nd.html)

### RNN / GRU
- 中文：循环神经网络 / 门控循环单元
- 定义：按时间步循环展开、把隐藏状态传给下一步的序列模型。
- 类比：边读句子边在脑子里维护一个"读到哪"的小本本。
- 出现：neuralaids
- 深入：[Recurrent neural networks (CS230)](https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-recurrent-neural-networks)

## S

### SDF (Signed Distance Function)
- 中文：有符号距离函数
- 定义：3D 函数告诉你每点到最近表面的距离，外正内负。
- 类比：等高线告诉你"到山顶还差几米"，SDF 告诉你"到物体表面还差几米"。
- 出现：3dshape2vecset / nlos-mmwave / rf-slam
- 深入：[SDF intro (Inigo Quilez)](https://iquilezles.org/articles/distfunctions/)

### SFT (Supervised Fine-Tuning)
- 中文：有监督微调
- 定义：用标注好的 (输入, 期望输出) 对在预训练模型上做监督训练。
- 类比：通才大学生考前刷历年真题。
- 出现：mla / vlas
- 深入：[Instruction tuning survey (Zhang 2023)](https://arxiv.org/abs/2308.10792)

### Skill
- 中文：技能
- 定义：可复用的子动作单元（"打开抽屉" / "夹起苹果"），常被高层 LLM 调度。
- 类比：菜谱里的"切丁 / 翻炒 / 装盘"动作模板。
- 出现：openvla / saycan
- 深入：[SayCan paper](https://say-can.github.io/)

### SLAM (Simultaneous Localization And Mapping)
- 中文：同步定位与建图
- 定义：机器人一边建环境地图一边算自己在地图里位置。
- 类比：闭着眼睛走进陌生房间，边摸边画平面图还要知道自己在哪。
- 出现：acoustic-swarms / mla / mmclip / nlos-mmwave / rf-slam
- 深入：[Cyrill Stachniss SLAM lectures](https://www.youtube.com/playlist?list=PLgnQpQtFTOGQrZ4O5QzbIHgl3b1JHimN_)

### SOTA (State Of The Art)
- 中文：当前最好成绩
- 定义：在某个 benchmark 上现存方法里最高分。
- 类比：奥运会上目前为止的世界纪录。
- 出现：3dshape2vecset / acoustic-swarms / cosmos-policy / llava / mla / neuralaids / openvla / proactive-hearing / vlas
- 深入：[Papers with Code SOTA leaderboards](https://paperswithcode.com/sota)

### STFT (Short-Time Fourier Transform)
- 中文：短时傅里叶变换
- 定义：把音频按窗滑动切成短帧再做 FFT，得到时-频谱图。
- 类比：把一首歌切成 1 秒小段，每段画一张"哪些音符在响"的图。
- 出现：neuralaids / proactive-hearing / vlas
- 深入：[STFT explained (Wikipedia)](https://en.wikipedia.org/wiki/Short-time_Fourier_transform)

## T

### Token / Tokenizer
- 中文：词元 / 分词器
- 定义：把文本（或图 / 动作 / 音频）切成离散小单位喂给 Transformer。
- 类比：把句子拆成乐高积木块，模型一块块拼。
- 出现：mla / mmclip / openvla / vlas
- 深入：[Tokenization (HuggingFace course)](https://huggingface.co/learn/nlp-course/chapter6/1)

### Trajectory
- 中文：轨迹
- 定义：机器人在一段时间内的状态/动作序列。
- 类比：跑步 GPS 记录的那条蓝线。
- 出现：rf-slam（隐式多处）/ openvla / mla
- 深入：[Trajectory optimization (Tedrake)](https://underactuated.mit.edu/trajopt.html)

### Transformer
- 中文：Transformer
- 定义：基于自注意力的序列模型架构，是 GPT / BERT / VLA 的共同骨架。
- 类比：每个词都能"互相看一眼"再决定自己怎么变化的会议室。
- 出现：3dshape2vecset / acoustic-swarms / cosmos-policy / llava / mla / mmclip / neuralaids / nlos-mmwave / openvla / vlas
- 深入：[Attention Is All You Need (Vaswani 2017)](https://arxiv.org/abs/1706.03762)

### TTS (Text-To-Speech)
- 中文：语音合成
- 定义：把文字转成自然听感的语音波形。
- 类比：会念课文的电脑播音员。
- 出现：proactive-hearing / vlas
- 深入：[Wikipedia: Speech synthesis](https://en.wikipedia.org/wiki/Speech_synthesis)

## U

### Uncertainty Quantification (UQ)
- 中文：不确定性量化
- 定义：让模型不仅给预测，还给出"我有多确定"的可信度估计。
- 类比：天气预报不只说"会下雨"，还说"概率 70%"。
- 出现：rf-slam
- 深入：[UQ for deep learning (Abdar 2021)](https://arxiv.org/abs/2011.06225)

## V

### VAE (Variational Autoencoder)
- 中文：变分自编码器
- 定义：学一个能采样的连续潜空间的生成模型，编码器输出分布。
- 类比：把所有人脸压进一片"脸地图"，从地图任意点都能解码出一张新脸。
- 出现：3dshape2vecset / cosmos-policy
- 深入：[VAE intro (Kingma 2019 tutorial)](https://arxiv.org/abs/1906.02691)

### VLA (Vision-Language-Action Model)
- 中文：视觉-语言-动作模型
- 定义：吃图像 + 自然语言指令、吐机器人动作 token 的端到端模型。
- 类比：把"看图说话"扩展成"看图听指令再动手"。
- 出现：cosmos-policy / mla / openvla / vlas
- 深入：[OpenVLA paper](https://arxiv.org/abs/2406.09246)

### VLAS (VLA with Speech)
- 中文：带语音的 VLA（本站 vlas 论文）
- 定义：让 VLA 直接吃语音指令而非文本，端到端"听-看-动"。
- 类比：从看字幕的机器人升级成听人话的机器人。
- 出现：vlas
- 深入：[本站 vlas 笔记](/notes/vlas.html)

### VLM (Vision-Language Model)
- 中文：视觉-语言模型
- 定义：联合理解图像和文本的多模态模型，如 LLaVA / GPT-4V。
- 类比：会看图又会聊天的双语助手。
- 出现：3dshape2vecset / llava / mla / mmclip / neuralaids / openvla / proactive-hearing / rf-slam / vlas
- 深入：[VLM survey (Zhang 2024)](https://arxiv.org/abs/2304.00685)

### Voxel
- 中文：体素
- 定义：3D 版的像素——把空间切成等大立方体小格子。
- 类比：我的世界 (Minecraft) 里的方块。
- 出现：3dshape2vecset / nlos-mmwave
- 深入：[Wikipedia: Voxel](https://en.wikipedia.org/wiki/Voxel)

### VQA (Visual Question Answering)
- 中文：视觉问答
- 定义：给一张图 + 一个问题，模型回答问题。
- 类比：考"看图回答问题"的智力测试。
- 出现：llava / openvla / vlas
- 深入：[VQA paper (Antol 2015)](https://arxiv.org/abs/1505.00468)
