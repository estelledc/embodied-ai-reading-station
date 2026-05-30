---
title: 拓展阅读 — 同领域重要论文
order: 6
intro: '与精读 13 篇互补的 30+ 篇论文 — VLA 主线 / VLM / 世界模型 / 射频 / 听觉，覆盖前传 / 经典 / 2025-2026 最新进展'
---

> 这一页收的是**和我们 13 篇精读笔记互补**的同领域重要论文 — 包括 VLA 鼻祖（RT-1 / RT-2 / PaLM-E）、最新发布（π0 / π0.5 / Helix）、关键数据集（Open X-Embodiment / DROID）、世界模型（DreamerV3 / Genie）、射频前作、听觉基础。

> **怎么用这一页**：先读完 13 篇任意一篇精读笔记，对那个主题有了感觉，再回这页找它的"前传 / 后续 / 竞品"补足。不必从头读到尾。

---

## 一、前传 / 经典基石（VLA 不是凭空冒出来的）

### 1. RT-1：Robotics Transformer for Real-World Control at Scale ⭐⭐⭐
- **作者 / 年份**：Google Robotics, 2022（Brohan et al.）
- **链接**：<https://arxiv.org/abs/2212.06817> （英文，已验证可访问）
- **一句话**：VLA 的"鼻祖"——首次把 Transformer 大规模用在真实机器人控制上，证明"图片+文本 → 离散动作 token"这条路能 scale。
- **和现有 13 篇的互补**：现有的 OpenVLA / VLAS 都是 RT-1 思路的延续；不读 RT-1 就无法理解为什么"动作要 tokenize"成了行业默认。
- **推荐时机**：精读 OpenVLA **之前** 必读，作为"VLA 范式起点"。

### 2. RT-2：Vision-Language-Action Models Transfer Web Knowledge ⭐⭐⭐⭐
- **作者 / 年份**：Google DeepMind, 2023（Brohan et al.）
- **链接**：<https://arxiv.org/abs/2307.15818> （英文，已验证）
- **一句话**：把"网络数据预训练的 VLM"直接微调成机器人策略，得到"涌现的语义推理"——VLA 之所以能引爆社区的转折点论文。
- **互补**：解释了 OpenVLA / Cosmos Policy 为什么都从 VLM 起步而不是从零训。
- **推荐时机**：RT-1 之后立即看；建议和 PaLM-E 合并讨论（两条思路）。

### 3. PaLM-E：An Embodied Multimodal Language Model ⭐⭐⭐⭐
- **作者 / 年份**：Google, 2023（Driess, Xia, Sajjadi et al.）
- **链接**：<https://arxiv.org/abs/2303.03378> （英文，已验证）
- **一句话**：把机器人传感器（图像、状态）当成"另一种 token"塞进 PaLM 大模型，输出文本规划——"具身 LLM"的代表性实现。
- **互补**：和 SayCan 形成对比（SayCan 是"LLM 选动作"，PaLM-E 是"LLM 直接处理传感器"）。
- **推荐时机**：读完 SayCan 后立即看，理解"高层规划"的两条流派。

### 4. Open X-Embodiment：Robotic Learning Datasets and RT-X Models ⭐⭐
- **作者 / 年份**：21 个机构联合, 2023（Padalkar et al.，CoRL 2024 best paper）
- **链接**：<https://arxiv.org/abs/2310.08864> （英文，已验证）
- **一句话**：22 种机器人、527 种技能、160 多万条轨迹的开源数据集——VLA 时代的"ImageNet"。
- **互补**：所有现代 VLA（OpenVLA / π0 / RDT-1B）都基于它训练；理解 VLA 必须知道数据从哪来。
- **推荐时机**：读 OpenVLA **同时**对照看，重点看"数据组成"那张表。

### 5. ACT：Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware ⭐⭐⭐
- **作者 / 年份**：Stanford, 2023（Tony Z. Zhao et al.）
- **链接**：<https://arxiv.org/abs/2304.13705> （英文，已验证；又称 ALOHA / ACT）
- **一句话**：提出"动作分块（Action Chunking）"——一次预测 N 步动作而不是 1 步，配合一台 2 万美元的双臂遥操作平台，开启低成本模仿学习时代。
- **互补**：现有 13 篇都没覆盖"模仿学习 / 数据采集硬件"这条腿；ACT 是后续所有 ALOHA 系列、π0 的 chunking 思想源头。
- **推荐时机**：读 Diffusion Policy **之前** 看，因为 chunking 是后者的前提。

---

## 二、VLA 主线最新发展（2024-2025）

### 6. π0：A Vision-Language-Action Flow Model for General Robot Control ⭐⭐⭐⭐⭐
- **作者 / 年份**：Physical Intelligence, 2024（Kevin Black, Noah Brown, Danny Driess et al.）
- **链接**：<https://arxiv.org/abs/2410.24164> （英文，已验证；引用 1900+）
- **一句话**：第一个用"流匹配（Flow Matching，扩散模型的兄弟）"生成高频连续动作的 VLA，能做叠衣服、装盒子这类复杂灵巧任务。
- **互补**：OpenVLA 输出离散 token，π0 输出连续 chunk——两条 VLA 路线对比的标杆。
- **推荐时机**：精读 OpenVLA 后立即看，做"离散 vs 连续动作"对比。

### 7. π0.5：A VLA Model with Open-World Generalization ⭐⭐⭐⭐⭐
- **作者 / 年份**：Physical Intelligence, 2025-04
- **链接**：<https://arxiv.org/abs/2504.16054> （英文，已验证）
- **一句话**：π0 的升级版，重点解决"训练时没见过的家庭环境"泛化问题——把 VLA 从实验室推向真实家居。
- **互补**：是目前公认 SOTA 的家用 VLA；现有 13 篇都还停留在受控场景。
- **推荐时机**：π0 之后立即看；如果只精读一篇 VLA，建议选 π0.5（最新且涵盖前作思想）。

### 8. FAST：Efficient Action Tokenization for VLA Models ⭐⭐⭐⭐
- **作者 / 年份**：Physical Intelligence, 2025-01
- **链接**：<https://arxiv.org/abs/2501.09747> （英文，已验证；又称 π0-FAST）
- **一句话**：用 DCT（离散余弦变换，相当于把动作信号做"傅里叶压缩"）把动作压成更短的 token，让自回归 VLA 训练快 5 倍。
- **互补**：揭示"动作 token 的具体形态"对训练效率的巨大影响——OpenVLA 没讲清楚的部分。
- **推荐时机**：作为 π0 的配套技术读物。

### 9. Octo：An Open-Source Generalist Robot Policy ⭐⭐⭐
- **作者 / 年份**：UC Berkeley, 2024（Ghosh, Walke, Pertsch et al.）
- **链接**：<https://arxiv.org/abs/2405.12213> （英文，已验证）
- **一句话**：开源版 RT-X——93M 参数的小型 Transformer 策略，在 Open X-Embodiment 上预训练，重点是"易用性"而非性能极限。
- **互补**：作为 OpenVLA 的"小弟版"基线；很多 paper 用 Octo 当对照。
- **推荐时机**：动手跑 demo 时优先选 Octo（VRAM 友好），论文当 OpenVLA 的快速预读。

### 10. Knowledge Insulating VLA Models（π0.5-KI）⭐⭐⭐⭐⭐
- **作者 / 年份**：Physical Intelligence, 2025-05
- **链接**：<https://arxiv.org/abs/2505.23705> （英文，已验证）
- **一句话**：发现 VLA 微调时会"灾难遗忘"VLM 的语言知识，提出"知识隔离"训练方案，让模型既快又强还能保留泛化。
- **互补**：触及 VLA 的核心痛点（Cosmos Policy / OpenVLA 都没正面回答），属于 2025 最新前沿。
- **推荐时机**：读完 π0.5 后看，理解"VLA 工程师每天在 debug 什么"。

---

## 三、策略学习新范式（不走 token 路线）

### 11. Diffusion Policy：Visuomotor Policy Learning via Action Diffusion ⭐⭐⭐⭐
- **作者 / 年份**：Columbia + TRI + MIT, 2023（Cheng Chi, Siyuan Feng, Yilun Du et al.）
- **链接**：<https://arxiv.org/abs/2303.04137> （英文，已验证；RSS 2023 best paper finalist）
- **一句话**：把"机器人动作"当成"图像生成"问题——用扩散模型从噪声里"采样"出动作轨迹，比传统 MLP/MSE 训练稳定 50%+。
- **互补**：现有的 Cosmos Policy 是"视频扩散→动作"，Diffusion Policy 是"直接对动作扩散"——两个扩散流派的源头。
- **推荐时机**：精读首选之一，配合 Cosmos Policy 读完整扩散链条。

### 12. 3D Diffusion Policy（DP3）⭐⭐⭐⭐
- **作者 / 年份**：Stanford + SJTU, 2024（Yanjie Ze, Gu Zhang, Kangning Zhang et al.）
- **链接**：<https://arxiv.org/abs/2403.03954> （英文，已验证）
- **一句话**：把 Diffusion Policy 从 2D 图像扩展到 3D 点云输入，证明 3D 表征能用 1/10 的数据达到同等性能。
- **互补**：和 3DShape2VecSet（现有）形成对照——同一个"3D 表征"问题的两种解法（一个生成、一个控制）。
- **推荐时机**：和 3DShape2VecSet 配对读，建立 "3D 表征 → 控制"完整链路。

### 13. RDT-1B：a Diffusion Foundation Model for Bimanual Manipulation ⭐⭐⭐⭐
- **作者 / 年份**：清华 TSAIL, 2024（Songming Liu, Lingxuan Wu et al.）
- **链接**：<https://arxiv.org/abs/2410.07864> （英文，已验证）
- **一句话**：1B 参数的扩散基座模型，专门解决"双臂动作多模态分布"问题，预训练 + 6K 真机微调即可叠衣服洗碗。
- **互补**：补齐 RDT/π0 这两条 2024 同期路线（RDT 是扩散 Transformer，π0 是流匹配）。
- **推荐时机**：作为 Diffusion Policy 的"放大版"读，对比扩散在小模型 vs 1B 模型上的差异。

### 14. DexVLA：VLM with Plug-In Diffusion Expert ⭐⭐⭐⭐
- **作者 / 年份**：Midea + 华东师大, 2025-02（Jiaming Wen et al.）
- **链接**：<https://arxiv.org/abs/2502.05855> （英文，已验证）
- **一句话**：把"VLM 推理"和"扩散动作专家"解耦——VLM 出意图，专家网络出动作，复杂任务（折衣服）成功率比 OpenVLA 高 30%+。
- **互补**：代表 2025 年"模块化 VLA"思路（不再端到端死磕一个网络）。
- **推荐时机**：读完 OpenVLA 觉得"端到端有点笨"时看，理解工程派的妥协方案。

---

## 四、人形 / 灵巧 / 数据采集（硬件 + 数据生态）

### 15. Mobile ALOHA：Bimanual Mobile Manipulation ⭐⭐⭐
- **作者 / 年份**：Stanford, 2024（Zipeng Fu, Tony Z. Zhao, Chelsea Finn）
- **链接**：<https://arxiv.org/abs/2401.02117> （英文，已验证；网络爆红"做饭机器人"那篇）
- **一句话**：在 ACT 基础上加一台移动底盘 + 全身遥操作，证明"50 条人类示范"就能学会煎虾、擦桌子、用电梯等 7 个家务。
- **互补**：把"模仿学习能做到什么"的下限拉到了大众惊呼级；现有 13 篇都是台面操作。
- **推荐时机**：ACT 后立即看（同一作者延续）；当作"低成本数据采集"故事的高潮。

### 16. ALOHA 2：Enhanced Low-Cost Hardware ⭐
- **作者 / 年份**：Google DeepMind + Stanford, 2024
- **链接**：<https://arxiv.org/abs/2405.02292> （英文，已验证；可只看图片）
- **一句话**：ALOHA 硬件的工程升级版（更稳、更便宜、更易复刻），论文短小但社区影响大。
- **互补**：理解后续 ALOHA Unleashed / RDT-1B 用的硬件平台。
- **推荐时机**：休闲读物，10 分钟扫完即可。

### 17. ALOHA Unleashed：A Simple Recipe for Robot Dexterity ⭐⭐⭐
- **作者 / 年份**：Google DeepMind, 2024（Tony Z. Zhao et al.）
- **链接**：<https://arxiv.org/abs/2410.13126> （英文，已验证）
- **一句话**：用 26000 条人类示范 + 扩散 Transformer 策略，做到了系鞋带、挂衣架、修理玩具这些"以前认为不可能"的任务。
- **互补**：证明"数据规模 + 简单方法"打败"复杂架构"——给 OpenVLA / π0 这种端到端路线背书。
- **推荐时机**：精读完 Diffusion Policy 后看实战放大。

### 18. HumanPlus：Humanoid Shadowing and Imitation from Humans ⭐⭐⭐⭐
- **作者 / 年份**：Stanford, 2024（Zipeng Fu et al.）
- **链接**：<https://arxiv.org/abs/2406.10454> （英文，已验证）
- **一句话**：让人形机器人通过"看人类视频"学习全身动作（打拳、折毛巾），用 RL 在仿真里训出"实时影子模仿"能力。
- **互补**：现有 13 篇全是固定底座 / 单臂；HumanPlus 把视野从机械臂拉到人形整机。
- **推荐时机**：对人形机器人感兴趣时看；门槛较高（涉及 RL + 运动重定向）。

### 19. iDP3 / Generalizable Humanoid Manipulation with 3D Diffusion ⭐⭐⭐⭐
- **作者 / 年份**：Stanford + CMU, 2024（Yanjie Ze et al.；DP3 同作者）
- **链接**：<https://arxiv.org/abs/2410.10803> （英文，已验证）
- **一句话**：把 DP3 用到人形机器人 + 头戴相机第一视角，让 Fourier GR1 在大学校园里到处给人倒水送物。
- **互补**：是 DP3 的"上身"延续；对照看能理解"3D 表征→人形落地"完整链路。
- **推荐时机**：DP3 之后立即看。

### 20. GR00T N1：NVIDIA Open Foundation Model for Humanoids ⭐⭐⭐⭐
- **作者 / 年份**：NVIDIA, 2025-03（Bjorck, Castaneda, Cherniadev et al.）
- **链接**：<https://arxiv.org/abs/2503.14734> （英文，已验证）
- **一句话**：NVIDIA 押注的"通用人形机器人基础模型"——融合真机数据 + 仿真 + AI 生成数据三种来源，开源。
- **互补**：和 Cosmos Policy（现有）同属 NVIDIA 生态，配对看能理解 NVIDIA 的全栈布局。
- **推荐时机**：读 Cosmos Policy 时配套看，理解 NVIDIA 的"数据飞轮"叙事。

---

## 推荐阅读顺序（给入门读者）

**第 0 周：暖身**
- 读现有 13 篇里的 LLaVA + SayCan + OpenVLA 摘要（建立 VLM / 高层 / 端到端三层认知）

**第 1 周：建立 VLA 范式**（4 篇）
- RT-1（鼻祖）→ RT-2（爆点）→ Open X-Embodiment（数据底座）→ OpenVLA（开源版本，已有）

**第 2 周：动作生成的两条路**（3 篇）
- ACT（chunking 思想）→ Diffusion Policy（扩散派起点）→ π0（流匹配 SOTA）

**第 3 周：2025 前沿**（3 篇，挑 1 精读做 PPT）
- π0.5（推荐精读 ✅）/ DexVLA（模块化）/ Knowledge Insulation（训练痛点）

**第 4 周：横向扩展**（按兴趣选）
- 人形：HumanPlus → iDP3 → GR00T N1
- 3D 表征：DP3（和 3DShape2VecSet 配对）
- 数据采集：Mobile ALOHA → ALOHA Unleashed

---

## 已验证可访问性

所有 arxiv 链接均通过 `lr search -s arxiv` 命中并返回 abstract。Physical Intelligence 系列（π0 / π0.5 / FAST / KI）通过 `lr websearch -s scholar` 二次验证（π0 引用 1961 次，链接稳定）。

---

## 名词速查（首次出现解释）

- **VLM（Vision-Language Model）**：能同时看图和读文字、再用文字回答的模型。类比：一个会描述照片的助手。
- **对比学习（contrastive learning）**：让"配对的图和文字"靠近、"不配对的"远离的训练方式。类比：相亲配对，配上的拉手。
- **多模态（multimodal）**：同时处理文字+图像（+音频/视频/3D）。类比：人同时看 + 听 + 摸。
- **point cloud（点云）**：用一堆 3D 坐标点表示物体的方式。类比：扫描激光点出来的"星空"。
- **MoE（Mixture of Experts，混合专家）**：模型里有多个"专家小网络"，每次只激活一部分。类比：医院分科，看牙找牙医。
- **指令微调（instruction tuning）**：用"问题—答案"对再训练，让模型听懂人类指令。类比：把会写字的孩子教成会按要求写作文。

---

## 一、前传：奠定 VLM 整套思路（2021-2023）

### 1. CLIP — 把图像和文字塞进同一空间
- 标题：Learning Transferable Visual Models From Natural Language Supervision (2021)
- 链接：https://arxiv.org/abs/2103.00020
- 一句话：用 4 亿对（图，标题）做对比学习，让"图特征"和"文字特征"在同一向量空间里靠近——VLM 的视觉编码器几乎都从它衍生。
- 与 LLaVA 关系：LLaVA 的 vision encoder 直接用 CLIP-ViT。不读 CLIP 不知道 LLaVA 第 0 层在干什么。
- 难度：⭐⭐⭐
- 推荐时机：读 LLaVA 之前 / 第一篇必读
- 语言：英文

### 2. BLIP — 一个模型同时干"看懂"和"生成描述"
- 标题：BLIP: Bootstrapping Language-Image Pre-training for Unified Vision-Language Understanding and Generation (2022)
- 链接：https://arxiv.org/abs/2201.12086
- 一句话：用 caption 生成器+过滤器自动清洗网络脏数据，统一 understanding（VQA）和 generation（caption）任务。
- 与 LLaVA 关系：BLIP 数据 bootstrapping 思路被后续 LLaVA / MiniGPT 反复借鉴。
- 难度：⭐⭐⭐
- 推荐时机：CLIP 之后
- 语言：英文

### 3. BLIP-2 — 第一次把"冻结的 ViT + 冻结的 LLM"拼起来
- 标题：BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models (2023)
- 链接：https://arxiv.org/abs/2301.12597
- 一句话：用 Q-Former（一个轻量小翻译官模块）把图像特征塞进冻结的 LLM，可训练参数只占百分之几就超过 Flamingo 80B。
- 与 LLaVA 关系：LLaVA 是 BLIP-2 的极简版（把 Q-Former 换成一个 MLP）。读完会发现 LLaVA 是"BLIP-2 砍到底"。
- 难度：⭐⭐⭐⭐
- 推荐时机：LLaVA 论文之前
- 语言：英文

### 4. Flamingo — 任意"图文交错"输入 + few-shot 学习
- 标题：Flamingo: a Visual Language Model for Few-Shot Learning (2022)
- 链接：https://arxiv.org/abs/2204.14198
- 一句话：DeepMind 让 VLM 像 GPT-3 一样"给几个例子就会做新任务"，靠的是 Perceiver Resampler + Cross-Attention 把视觉塞进语言流。
- 与 LLaVA 关系：Flamingo 是闭源版"VLM 之父"，LLaVA 走的是它的开源廉价版路线。
- 难度：⭐⭐⭐⭐
- 推荐时机：BLIP-2 之后；想理解 in-context VLM
- 语言：英文

### 5. MiniGPT-4 — LLaVA 的同期最简对手
- 标题：MiniGPT-4: Enhancing Vision-Language Understanding with Advanced Large Language Models (2023)
- 链接：https://arxiv.org/abs/2304.10592
- 一句话：冻结 ViT + 冻结 Vicuna + 一层投影 = MiniGPT-4，证明"对齐 vision feature 到强 LLM"几乎不需要训练量。
- 与 LLaVA 关系：和 LLaVA 同月出现的双胞胎。读两篇能看到"最少多少东西就能跑出 GPT-4 多模态效果"。
- 难度：⭐⭐
- 推荐时机：LLaVA 之后做对照
- 语言：英文

### 6. Qwen-VL — 中文 VLM 的工业起点
- 标题：Qwen-VL: A Versatile Vision-Language Model for Understanding, Localization, Text Reading, and Beyond (2023)
- 链接：https://arxiv.org/abs/2308.12966
- 一句话：阿里把 Qwen-LLM 加视觉接收器，强调 grounding（指框）+ OCR + 中文，中文 VLM 第一个能用的开源基座。
- 与 LLaVA 关系：训练数据/任务设计比 LLaVA 更重视中文 + grounding，互补。
- 难度：⭐⭐⭐
- 推荐时机：想做中文 / 工业 VLM 时
- 语言：英文（带中文实验结果）

### 7. InternVL — 把视觉编码器也拉到 6B 级
- 标题：InternVL: Scaling up Vision Foundation Models and Aligning for Generic Visual-Linguistic Tasks (2023)
- 链接：https://arxiv.org/abs/2312.14238
- 一句话：上海 AI Lab 把视觉端从 ViT-L（300M）放大到 6B，再分阶段对齐 LLM——证明"视觉端也得跟着 scale"。
- 与 LLaVA 关系：LLaVA 默认用小 ViT-L；InternVL 让你看到换大视觉端能涨多少。
- 难度：⭐⭐⭐⭐
- 推荐时机：LLaVA-1.5 之后想了解 scaling
- 语言：英文

### 8. GPT-4V 系统报告（OpenAI 学术分析版）
- 标题：The Dawn of LMMs: Preliminary Explorations with GPT-4V(ision) (微软研究院技术报告, 2023)
- 链接：https://arxiv.org/abs/2309.17421
- 一句话：166 页用 case study 讲 GPT-4V 能做什么、怎么 prompt 它，不讲架构（OpenAI 没披露）。
- 与 LLaVA 关系：闭源 SOTA 对照标尺；LLaVA-1.5 / NeXT 的 benchmark 经常对比 GPT-4V。
- 难度：⭐⭐（看 case 不看公式）
- 推荐时机：随时翻；想知道"上限是什么样"
- 语言：英文（图文并茂）

---

## 二、LLaVA 系列与同源衍生

### 9. LLaVA-1.5 — "MLP + 简单 prompt = SOTA"的简洁之美
- 标题：Improved Baselines with Visual Instruction Tuning (2023)
- 链接：https://arxiv.org/abs/2310.03744
- 一句话：原版 LLaVA 把 Linear 投影换成两层 MLP、加学术 VQA 数据，1.2M 数据 + 1 天 8×A100 就刷 11 个 benchmark SOTA。
- 与 LLaVA 关系：LLaVA 主线第二代；项目代码默认就是这个。读完原版 LLaVA 必读。
- 难度：⭐⭐⭐
- 推荐时机：紧跟原版 LLaVA
- 语言：英文（短论文，9 页）

### 10. LLaVA-NeXT-Interleave — 多图 / 视频 / 3D 都用"交错图文"统一
- 标题：LLaVA-NeXT-Interleave: Tackling Multi-image, Video, and 3D in Large Multimodal Models (2024)
- 链接：https://arxiv.org/abs/2407.07895
- 一句话：把多图、视频帧、3D 多视图通通展开成"图文交错序列"，一个模型干四种场景。
- 与 LLaVA 关系：LLaVA-NeXT 系列博客的论文版；连接 LLaVA 主线和 3D / video 的桥。
- 难度：⭐⭐⭐
- 推荐时机：LLaVA-1.5 之后；想做视频/多图/3D
- 语言：英文

### 11. LLaVA-OneVision — 单模型同时打 image / multi-image / video
- 标题：LLaVA-OneVision: Easy Visual Task Transfer (2024)
- 链接：https://arxiv.org/abs/2408.03326
- 一句话：把 NeXT 系列博客经验写成正式论文，证明"单图→视频"任务迁移能涌现新能力（如时序推理）。
- 与 LLaVA 关系：LLaVA 主线"统一形态"的当前最完整版本。
- 难度：⭐⭐⭐
- 推荐时机：把 LLaVA 主线读完
- 语言：英文

---

## 三、3D 多模态：把 VLM 思路搬到点云 / 场景

### 12. PointLLM — 点云 + 语言对齐第一篇能 chat 的
- 标题：PointLLM: Empowering Large Language Models to Understand Point Clouds (2023)
- 链接：https://arxiv.org/abs/2308.16911
- 一句话：点云编码器接 LLM，66 万对 point-text 数据训练，模型能看 3D 物体、用自然语言描述。
- 与 LLaVA 关系：架构上就是"LLaVA 把 ViT 换成点云编码器"，最容易看懂的 3D-LLM。
- 难度：⭐⭐⭐
- 推荐时机：进入 3D 方向第一篇
- 语言：英文

### 13. 3D-LLM — 整个 3D 场景作为输入做 QA / Navigation
- 标题：3D-LLM: Injecting the 3D World into Large Language Models (2023, NeurIPS)
- 链接：https://arxiv.org/abs/2307.12981
- 一句话：从多视图 2D 渲染抽 3D 特征注入 LLM，能做 3D QA、3D grounding、任务分解、导航。
- 与 LLaVA 关系：用 2D VLM（包括 LLaVA 风格）做 backbone 转 3D；展示 3D 任务的真实 spectrum。
- 难度：⭐⭐⭐⭐
- 推荐时机：PointLLM 之后；想做具身/导航
- 语言：英文

### 14. Uni3D — 把 2D 预训练直接搬到 3D 点云
- 标题：Uni3D: Exploring Unified 3D Representation at Scale (ICLR 2024)
- 链接：https://arxiv.org/abs/2310.06773
- 一句话：用 2D 预训练 ViT 当点云 backbone 初始化，对齐到 CLIP 文图特征，scale 到 1B 参数刷 3D 各任务 SOTA。
- 与 LLaVA 关系：3D 版"CLIP for 3D"；下游接任何 3D-LLM 当 encoder 用。
- 难度：⭐⭐⭐⭐
- 推荐时机：研究 3D 表示学习
- 语言：英文

### 15. OpenScene — 3D 场景按文字查询，零 3D 标签
- 标题：OpenScene: 3D Scene Understanding with Open Vocabularies (CVPR 2023)
- 链接：https://arxiv.org/abs/2211.15654
- 一句话：把 3D 点的特征和 CLIP 像素特征对齐，用户可以直接输入文字（"沙发""可坐的东西"）查整个房间。
- 与 LLaVA 关系：不是 LLM-style，但展示了"用 CLIP 把 2D 知识蒸到 3D"的核心套路，理解 3D-VLM 思想必读。
- 难度：⭐⭐⭐
- 推荐时机：3D 入门第二/三篇
- 语言：英文

---

## 四、2024-2026 最新开源 / 闭源 VLM

### 16. Qwen2-VL — 任意分辨率 + M-RoPE 三维位置编码
- 标题：Qwen2-VL: Enhancing Vision-Language Model's Perception of the World at Any Resolution (2024)
- 链接：https://arxiv.org/abs/2409.12191
- 一句话：动态分辨率（图像不再 resize 到 224）+ 文/图/视频统一的 M-RoPE，72B 比肩 GPT-4o。
- 与 LLaVA 关系：和 LLaVA-OneVision 同期对手；展示中文社区如何用工程细节超开源对手。
- 难度：⭐⭐⭐⭐
- 推荐时机：想看 2024 SOTA 工程
- 语言：英文

### 17. Qwen2.5-VL — 当前（2025-02）开源工业旗舰
- 标题：Qwen2.5-VL Technical Report (2025)
- 链接：https://arxiv.org/abs/2502.13923
- 一句话：原生动态分辨率 ViT + Window Attention，能精确画 bbox、解析几小时长视频、做 GUI agent。
- 与 LLaVA 关系：开源工业前线"上限"，跟 LLaVA-OneVision 学术路线对照看。
- 难度：⭐⭐⭐⭐
- 推荐时机：想跟最新生产级模型
- 语言：英文

### 18. DeepSeek-VL2 — MoE 架构进 VLM
- 标题：DeepSeek-VL2: Mixture-of-Experts Vision-Language Models for Advanced Multimodal Understanding (2024)
- 链接：https://arxiv.org/abs/2412.10302
- 一句话：动态 tiling 视觉编码 + DeepSeekMoE + MLA 压 KV cache，Tiny/Small/Base 三档每档激活参数仅 1B/2.8B/4.5B 但效果对位 7-13B 密集模型。
- 与 LLaVA 关系：当前唯一开源的 MoE-VLM 工业级；想看"VLM + MoE 怎么搭"必读。
- 难度：⭐⭐⭐⭐
- 推荐时机：研究高效 VLM / MoE
- 语言：英文

### 19. Pixtral 12B — Mistral 系第一款 VLM，原生分辨率 ViT
- 标题：Pixtral 12B (2024)
- 链接：https://arxiv.org/abs/2410.07073
- 一句话：Mistral 自训视觉编码器吃原生分辨率，128K 长上下文塞任意张图，12B 打 Llama-3.2 90B。
- 与 LLaVA 关系：欧美开源阵营对位 Qwen2-VL；展示"不向语言性能让步"的 VLM。
- 难度：⭐⭐⭐
- 推荐时机：开源选型对比时
- 语言：英文

### 20. Llama 3 Herd（含视觉补丁）
- 标题：The Llama 3 Herd of Models (2024)
- 链接：https://arxiv.org/abs/2407.21783
- 一句话：Meta 405B 主报告 92 页，附录详述如何用 compositional 方式给 Llama 3 加视觉/视频/语音（即 Llama-3-V 路线）。
- 与 LLaVA 关系：Meta 自家 VLM 怎么加视觉的官方答案；和 LLaVA 思路相通但工程更厚。
- 难度：⭐⭐⭐⭐⭐（厚）
- 推荐时机：当工具书查；视觉部分集中读附录即可
- 语言：英文

### 21. Gemini 1.5 — 闭源长上下文多模态
- 标题：Gemini 1.5: Unlocking multimodal understanding across millions of tokens of context (2024)
- 链接：https://arxiv.org/abs/2403.05530
- 一句话：Google 把 video/audio/document 全塞进百万 token 上下文，10M token 都能近完美检索。
- 与 LLaVA 关系：闭源对照标杆；想理解长视频 VLM 的天花板
- 难度：⭐⭐⭐
- 推荐时机：选读；做长视频 / 长文档时必看
- 语言：英文

---

## 阅读路线建议（针对零基础读者）

1. **第一周（理解 VLM 基础）**：CLIP → BLIP-2 → LLaVA → LLaVA-1.5
2. **第二周（看不同流派）**：MiniGPT-4 + Flamingo + Qwen-VL（中文流）
3. **第三周（最新工业前线）**：Qwen2-VL → Qwen2.5-VL → DeepSeek-VL2 → Pixtral 任选 2 篇
4. **进入 3D 方向**：OpenScene → PointLLM → 3D-LLM → Uni3D
5. **当工具书翻**：GPT-4V 报告 / Llama 3 / Gemini 1.5

每篇先读 abstract + 看图，再决定要不要精读正文。

---

## 一、世界模型 / 视频生成 + 控制

> 名词解释：**世界模型**——AI 的"想象引擎"。给它当前画面 + 一个动作（"机械臂往左 5cm"），它输出"如果你这样做，下一秒画面长什么样"。和 Cosmos Policy 互补：Cosmos 是"动作策略+视频生成"一体，下面这些是它的前辈或同辈。

### 1. Genie: Generative Interactive Environments (DeepMind, 2024)
- 链接：https://arxiv.org/abs/2402.15391
- 一句话：纯看 20 万小时无标签游戏视频，AI 自己学会"哪些像素对应'按了跳跃键'"，然后给一张静态图就能生成可玩的 2D 游戏世界。
- 和现有论文关系：Cosmos 的"祖父"。证明了"无动作标签也能学动作维度"，是世界模型路线的奠基作。
- 难度：⭐⭐⭐（架构清晰，但需要懂 VQ-VAE）
- 推荐时机：读 Cosmos 之前先看，理解"为什么世界模型可以用视频训练"。

### 2. Genie 2: A Large-Scale Foundation World Model (DeepMind, 2024 blog)
- 链接：https://deepmind.google/discover/blog/genie-2-a-large-scale-foundation-world-model/
- 一句话：Genie 升级到 3D 一致世界——给一张图，能玩出一分钟的 3D 视角连贯探索，物体记忆 / 物理 / NPC 都涌现。
- 和现有论文关系：直接对标 Cosmos World Foundation Model；DeepMind 路线 vs NVIDIA 路线。
- 难度：⭐（只有博客，没放论文，先看图直观感受）
- 推荐时机：读完 Genie 1 后，看博客感受"3D 一致性"是怎么涌现的。

### 3. DreamerV3: Mastering Diverse Domains through World Models (2023)
- 链接：https://arxiv.org/abs/2301.04104
- 一句话：一套超参数同时打过 150+ 种任务（雅达利、Minecraft 钻石、机器人控制）的世界模型 + RL 框架，名词"想象训练"——agent 在"脑内 rollout"里强化学习，不烧真实环境。
- 和现有论文关系：和 Cosmos 互补——Cosmos 重"生成像素"，Dreamer 重"在生成的世界里规划动作"。
- 难度：⭐⭐⭐⭐（RL + 世界模型双门槛）
- 推荐时机：想理解"世界模型怎么和 RL 闭环"时看，读前补 PPO / model-based RL 基本概念。

### 4. DayDreamer: World Models for Physical Robot Learning (2022)
- 链接：https://arxiv.org/abs/2206.14176
- 一句话：把 Dreamer 直接搬上四足机器人 / 抓取臂——真实数据采 1 小时就能学会走路，不要仿真预训练。
- 和现有论文关系：CartoRadar / mmCLIP 是"sensing"，DayDreamer 是"learning"，合起来回答"机器人怎么从感知到决策"。
- 难度：⭐⭐⭐（系统论文，工程细节多）
- 推荐时机：DreamerV3 看懂后看，理解"模拟到真实"的 sim2real 痛点。

### 5. Learning Interactive Real-World Simulators / UniSim (2023)
- 链接：https://arxiv.org/abs/2310.06114
- 一句话：把"互联网上能拿到的所有视频 + 机器人数据 + 模拟数据"统一成一个生成式模拟器，给文本指令就生成"如果你在厨房说'去拿苹果'画面会怎么演化"。
- 和现有论文关系：UniSim 是 Cosmos 的"前夜"，Sora 用于机器人的早期路线图。
- 难度：⭐⭐⭐⭐（涉及 diffusion + 多模态，看 abstract+demo 也行）
- 推荐时机：读完 Genie 后看，对比"游戏域 vs 真实世界"的差异。

### 6. GR00T N1: Open Foundation Model for Generalist Humanoid Robots (NVIDIA, 2025)
- 链接：https://arxiv.org/abs/2503.14734
- 一句话：双系统架构（System 1 快反射 + System 2 慢推理），跨多种人形机器人本体迁移，给指令直接出动作 token。
- 和现有论文关系：NVIDIA 三件套之一（GR00T 策略 / Cosmos 世界 / Isaac 仿真），和你正读的 Cosmos 是兄弟。
- 难度：⭐⭐⭐（实习生友好，重点看双系统设计动机）
- 推荐时机：理解 Cosmos 后立刻读，看清"世界模型 + 策略 + 仿真"全栈协作。

---

## 二、射频 / 毫米波感知

> 名词解释：**毫米波（mmWave）**——波长 1-10mm 的无线电信号，相当于"看不见的雷达"。和摄像头不同：能穿雾穿烟、不怕光照、保护隐私（看不到脸只看到点云轮廓）。**RF**=Radio Frequency 通称。

### 7. Enabling Visual Recognition at Radio Frequency / PanoRadar (Penn, 2024)
- 链接：https://arxiv.org/abs/2405.19516
- 一句话：旋转的 mmWave 雷达 + 神经网络，给出"用电波画的全景照片"——能在烟雾 / 全黑环境下识别物体和人。
- 和现有论文关系：CartoRadar 同实验室前作；CartoRadar 是把它推向"建图 + 定位"。
- 难度：⭐⭐⭐⭐（雷达信号处理 + 深度学习）
- 推荐时机：读 CartoRadar 之前必看，理解"为什么需要旋转"和"高度怎么来"。

### 8. HawkEye: High Resolution mmWave Imaging for Self-Driving Cars (2019)
- 链接：https://arxiv.org/abs/1912.09579
- 一句话：用 GAN 把低分辨率 mmWave 雷达图"补"成接近 LiDAR 的细节，证明"雷达图像可以学着看"。
- 和现有论文关系：mmCLIP / mmNorm 的精神先驱——都是"低质量 RF 信号 + 深度学习 = 接近视觉的感知"。
- 难度：⭐⭐⭐（GAN 基础够）
- 推荐时机：刚接触"RF + 深度学习"组合时第一篇看，建立直观。

### 9. milliMap / See Through Smoke: Robust Indoor Mapping with Low-cost mmWave Radar (2019)
- 链接：https://arxiv.org/abs/1911.00398
- 一句话：单芯片便宜雷达 + 学习算法，在烟雾火灾环境下做出和 LiDAR 一样可用的 2D 地图。
- 和现有论文关系：CartoRadar 室内建图的"前辈"，但只是 2D；CartoRadar 把它升到 3D + 全景。
- 难度：⭐⭐⭐（系统论文，重点看雷达局限和 trick）
- 推荐时机：CartoRadar 看完后回看，对比"7 年间这个方向走了多远"。

### 10. milliEgo: Single-chip mmWave Radar Aided Egomotion Estimation (2020)
- 链接：https://arxiv.org/abs/2006.02266
- 一句话：用 mmWave 雷达 + IMU 估计设备自身的移动轨迹（视觉惯性里程计的电波版），雾天黑天也能用。
- 和现有论文关系：CartoRadar 定位部分的精神同源；这是单芯片版，CartoRadar 是旋转高分辨率版。
- 难度：⭐⭐⭐（需懂 IMU + sensor fusion 基本概念）
- 推荐时机：研究机器人定位（SLAM）时和视觉 SLAM 对比着读。

### 11. WiSee → Fine-grained Finger Gesture Recognition Using WiFi Signals (2021)
- 链接：https://arxiv.org/abs/2106.00857
- 一句话：路由器发的 WiFi 信号穿过你的手时形状会变，AI 学会从这些细微变化识别手指动作（隔墙打字都行）。
- 和现有论文关系：WiSee（华盛顿大学 2013）是开山祖师，无 arXiv 链接；这篇是后续可读版。和 mmWave 不同，WiFi 是商品级硬件 → 普及性强。
- 难度：⭐⭐（信号 + CNN）
- 推荐时机：好奇"无源感知"上限时看，理解"用现有 WiFi 路由器能做啥"。

### 12. RF-Pose 系列：Unsupervised Learning for Human Sensing Using Radio Signals (MIT, 2022)
- 链接：https://arxiv.org/abs/2207.02370
- 一句话：RF 信号 + 自监督学习同时学"穿墙骨骼姿态 + 动作识别 + 重识别"，不需要人工标注。
- 和现有论文关系：MIT Dina Katabi 组的 RF-Pose 路线集大成——Penn PanoRadar 偏建图，MIT 偏人体姿态，两条平行线。
- 难度：⭐⭐⭐⭐（自监督 + RF 双门槛）
- 推荐时机：读完 PanoRadar 后做对照，看清"同样的 RF 输入怎么走两条不同路线"。

### 13. SiWa: See into Walls via Deep UWB Radar (2021)
- 链接：https://arxiv.org/abs/2110.14279
- 一句话：超宽带（UWB）雷达 + 深度学习，能识别墙背后是什么材料、有没有钢筋、有没有缺陷——把"穿墙看物"做成了实用工程。
- 和现有论文关系：CartoRadar 看场景，SiWa 看墙体本身；都是"穿透感知"另一面。
- 难度：⭐⭐⭐（UWB 信号知识可以现学）
- 推荐时机：读完 PanoRadar/CartoRadar，想看"穿墙感知应用边界"时。

---

## 三、听觉 / 双耳音频

> 名词解释：**双耳音频（binaural audio）**——左右耳信号略有不同（时间差 + 强度差），大脑据此判断声音方位。AI 学这个就能"看一眼图就生成有空间感的声音"。

### 14. Conformer: Convolution-augmented Transformer for Speech Recognition (Google, 2020)
- 链接：https://arxiv.org/abs/2005.08100
- 一句话：把 CNN（看局部模式）和 Transformer（看全局依赖）拼在一块，成为 2020-2023 语音识别 SOTA 的标准骨架。
- 和现有论文关系：你看的"听觉 3 篇"如果用了"speech encoder"基本都是 Conformer 后裔。
- 难度：⭐⭐⭐（要懂 Transformer 基本结构）
- 推荐时机：第一次写"语音 → 文本"代码前必看，是 ASR 入门 must-read。

### 15. Whisper: Robust Speech Recognition via Large-Scale Weak Supervision (OpenAI, 2022)
- 链接：https://arxiv.org/abs/2212.04356
- 一句话：68 万小时多语种网络音频 + 标准 Transformer，零样本英语识别打过专门 fine-tune 的模型，开源后成事实标准。
- 和现有论文关系：是当今"先把语音转文字再喂 LLM"流水线里 99% 用的工具；任何"语音 + 大模型"工作的默认前端。
- 难度：⭐⭐（架构非常标准，论文好读）
- 推荐时机：刚学 ASR 时和 Conformer 对比读，看"模型架构 vs 数据规模"哪个更重要。

### 16. SeamlessM4T: Massively Multilingual & Multimodal Machine Translation (Meta, 2023)
- 链接：https://arxiv.org/abs/2308.11596
- 一句话：一个模型同时做语音→文本、文本→语音、语音→语音翻译，覆盖 100+ 语言。
- 和现有论文关系：把 Whisper（识别）和 TTS（合成）合并的下一代尝试；理解"端到端语音翻译"的现状。
- 难度：⭐⭐⭐⭐（系统庞大，建议只看主图 + table 1）
- 推荐时机：做"实时翻译耳机 / 多模态 agent"时看；只想感受规模时跳读 demo 即可。

### 17. Conv-TasNet: Surpassing Ideal TF Magnitude Masking for Speech Separation (2018)
- 链接：https://arxiv.org/abs/1809.07454
- 一句话：把"鸡尾酒会问题"（多人同时说话怎么分开）从频域搬到时域，用一维 CNN 直接处理波形，性能首次超过"理想频谱掩码"上限。
- 和现有论文关系：声源分离（source separation）经典奠基作；"听觉 3 篇"里的分离基线大概率引这篇。
- 难度：⭐⭐⭐（一维卷积 + dilated TCN）
- 推荐时机：学声源分离 / 双耳音频时第一篇，建立"波形直接学"的直觉。

### 18. 2.5D Visual Sound (UT Austin, 2018)
- 链接：https://arxiv.org/abs/1812.04204
- 一句话：给单声道音频 + 视频画面，AI 推出双耳音频——"看视频就能合成空间声"。
- 和现有论文关系：spatial audio learning 的开山作；和 mmCLIP 思路同构（把弱模态升维成强模态）。
- 难度：⭐⭐⭐（U-Net + 多模态）
- 推荐时机：读"听觉 3 篇"前先看，建立"visual + audio 联合训练"直觉。

### 19. Points2Sound: From Mono to Binaural Audio Using 3D Point Cloud Scenes (2021)
- 链接：https://arxiv.org/abs/2104.12462
- 一句话：把视频换成 3D 点云作为空间提示，单声道 → 双耳音频，强调"几何驱动的空间音"。
- 和现有论文关系：把"听觉 + 几何"明确耦合，可以和 CartoRadar 的 3D 几何输出对接，是"用 RF 几何指导音频空间化"潜在结合点。
- 难度：⭐⭐⭐（3D 表示 + 多模态融合）
- 推荐时机：想做"跨模态融合"创新点时看，看完会有实习课题灵感。

### 20. Learning Robust Spatial Representations from Binaural Audio (2025)
- 链接：https://arxiv.org/abs/2508.20914
- 一句话：双耳音频 → 空间表征蒸馏，让模型在嘈杂混响环境下仍能定位声源方向。
- 和现有论文关系：spatial audio 最新进展，和"听觉 3 篇"时间线接近，可作横向对比。
- 难度：⭐⭐⭐⭐（feature distillation + 声学）
- 推荐时机：当你已读"听觉 3 篇"想看 2025 最前沿时翻一翻 abstract。

---

## 阅读路线建议（给自己的实习导航）

**第一周打地基（看 abstract + 看图）**：Genie 1（#1）→ Whisper（#15）→ HawkEye（#8）→ 2.5D Visual Sound（#18）。
建立"世界模型/语音/RF/空间音"四个领域的最小直观。

**第二周对照精读（每个方向各挑一篇深入）**：
- 世界模型：DreamerV3（#3）或 DayDreamer（#4）
- RF：PanoRadar（#7，因和 CartoRadar 同实验室）
- 听觉：Conformer（#14） + Conv-TasNet（#17）任一

**第三周看综合 / 跨领域**：GR00T N1（#6）+ UniSim（#5）+ Points2Sound（#19）。
找"sensing → world model → policy"全栈的接缝处，那是实习生最容易找到课题点的地方。

---

## 名词速查（先读这个）

- **VLA（Vision-Language-Action）模型**：把摄像头看到的画面 + 语言指令 → 直接输出机器人手脚要做的动作。类比：你读"把红色那个杯子拿过来"这句话+看一眼桌面，大脑直接驱动手去抓。
- **具身智能（Embodied AI）**：AI 不只是"在屏幕里"答题，而是装在一个真实身体（手臂/人形）上，要面对物理世界的摩擦、重量、误差。
- **基础模型 / 基座模型（Foundation Model）**：先用海量数据预训练一个大模型，下游各种小任务再微调。GPT 之于文本，π0 / GR00T 之于机器人。
- **Sim2Real**：先在仿真器（电脑里模拟物理世界）里训练，再迁移到真机。类比：先在驾驶模拟器里练车再上路。
- **跨具身（Cross-Embodiment）**：同一个模型能驱动不同形态的机器人（双臂、人形、四足）。

---

## 一、巨头/明星公司里程碑（⭐ 1-2，看新闻就懂）

### 1. Figure AI Helix 发布（2025-02）
- 链接（中文报道）：<https://www.thepaper.cn/newsDetail_forward_30210109>
- 一句话：第一个能让人形机器人的"上半身全部关节"端到端连续控制的 VLA 模型，两台 Helix 机器人能共享同一组权重协作。
- 难度：⭐ 1
- 对小读者意味着：这是"Figure 02 拿陌生家用品"那段刷屏视频背后的模型，把 VLA 从"实验室拿积木"推到了"接近能进家庭"。
- 推荐时机：刚听说"具身智能"这个词时第一篇读，建立直观印象。

### 2. NVIDIA Isaac GR00T N1（2025-03-18 GTC 发布）
- 官方稿：<https://investor.nvidia.com/news/press-release-details/2025/NVIDIA-Announces-Isaac-GR00T-N1--the-Worlds-First-Open-Humanoid-Robot-Foundation-Model--and-Simulation-Frameworks-to-Speed-Robot-Development/default.aspx>
- 中文：<https://view.inews.qq.com/k/20250320A019DD00>
- 一句话：全球首个**开源**的人形机器人基础模型，配套 Newton 物理引擎（NVIDIA + DeepMind + Disney 合作）和 Isaac GR00T Blueprint 合成数据流水线，把"具身智能版 Llama"摆上了桌面。
- 难度：⭐ 2（生态/工具链）
- 对小读者意味着：以前训机器人模型只有大公司玩得起，现在 NVIDIA 把"模型 + 仿真器 + 合成数据"全栈打包开源，研究生也能上手。
- 推荐时机：对"为什么 NVIDIA 是具身智能基础设施王"感兴趣时看。

### 3. 智元 启元大模型 GO-1（2025-03-10）
- 官方：<https://www.zhiyuan-robot.com/article/189/detail/56.html>
- 一句话：国内首个通用具身基座模型，提出 **ViLLA**（Vision-Language-**Latent**-Action）架构——在 VL 和 A 之间加了一个"潜在动作规划器"，可以从人类视频里直接学动作。
- 难度：⭐ 2
- 对小读者意味着：知道国内"稚晖君"创业项目在做什么，以及"为什么人类抖音视频也能拿来训机器人"。
- 推荐时机：想快速了解中国具身智能产业地图时。

### 4. 银河通用 GroceryVLA + 银河太空舱落地（2025-08）
- 央广网：<http://tech.cnr.cn/techgd/20260302/t20260302_527540956.shtml>
- 官方：<https://www.galbot.com/about>
- 一句话：全球首个城市级常态化运营的人形机器人零售终端——北京"银河太空舱"24h 无人超市，由人形机器人自主完成上千 SKU 取货交付，技术路线主打**纯仿真合成数据训练 + 零样本泛化**。
- 难度：⭐ 1
- 对小读者意味着："具身智能能赚钱了吗" 这个问题第一次有了真实门店级答案。
- 推荐时机：和家人聊"机器人能不能进家"时拿出来。

### 5. 星海图 G0 / G0 Plus + 双脑架构（2025-08 / 2026-01）
- 报道：<https://kfqgw.beijing.gov.cn/cxyzkfq/yzal/202509/t20250910_4245529.html>
- 一句话：星海图开源了"具身智能双脑"VLA + 全球首个机器人世界开放数据集；G0 Plus 自称"全球首个开箱即用的 VLA 模型"，硬件 R1 是李飞飞 BEHAVIOR Challenge @NeurIPS 2025 唯一指定双臂本体。
- 难度：⭐ 2
- 对小读者意味着：国内"百亿独角兽"已经有四家（宇树/智元/银河通用/星海图），各自押不同技术路线。
- 推荐时机：想做产业地图对比时。

### 6. 宇树 H1 / G1 量产 + 春晚出圈（2025-02）
- 报道：<https://sd.china.com/m/cjzx/20000936/20250213/25950558.html>
- 一句话：G1 售价 9.9 万人民币，第一次把全尺寸双足人形机器人价格打到"小车级别"；H1 在春晚秧歌舞中出圈，CoRL 2025 Best Paper 也是 BIGAI × Unitree 合作。
- 难度：⭐ 1
- 对小读者意味着：硬件已不是瓶颈，瓶颈在大脑（VLA 模型）。
- 推荐时机：被人问"机器人怎么这么快出圈"时。

---

## 二、关键模型论文（⭐ 3-4，需要点 ML 基础）

### 7. π0：通用机器人 Flow Matching 策略（2024-10，是 2025 一切的起点）
- arXiv：<https://arxiv.org/abs/2410.24164>
- 一句话：Physical Intelligence 首篇通用机器人基础模型论文，把**流匹配（Flow Matching）**——一种比扩散模型更高效的连续生成方法——首次用于机器人动作生成，输出 50Hz 高频连续动作。
- 难度：⭐ 4
- 对小读者意味着：理解"VLA 怎么从输出离散 token 进化到输出连续动作"的关键转折点。
- 推荐时机：读完 OpenVLA 后第二篇精读。

### 8. π0.5：开放世界泛化 + 知识隔离（2025-04 论文，2025-09 开源）
- 解读：<https://blog.csdn.net/Fx_demon/article/details/151399778>
- 一句话：在全新家庭里端到端跑 10-15 分钟长任务（"洗厨房"），核心新招是 **Knowledge Insulation**——把领域专属技能和通用推理模块化解耦，避免微调时灾难性遗忘。
- 难度：⭐ 4
- 对小读者意味着：VLA 第一次真的从"实验室"走进"陌生厨房"。
- 推荐时机：理解"为什么泛化是机器人最难的事"。

### 9. Gemini Robotics 1.5（DeepMind, 2025-09-25）
- 官方：<https://deepmind.google/discover/blog/gemini-robotics-15-brings-ai-agents-into-the-physical-world/>
- arXiv：<https://arxiv.org/abs/2510.03342>
- 一句话：把 Gemini 多模态模型 + ER（Embodied Reasoning）模型组合成"思考+执行"两阶 VLA：先想清步骤、调 Google 搜索拿信息，再交给执行模型动手；支持跨形态，不用按本体单独训。
- 难度：⭐ 4
- 对小读者意味着：第一次出现"机器人会上网查菜谱再做菜"的范式。
- 推荐时机：理解"VLA + Agent" 融合趋势时必读。

### 10. Gemini Robotics（首篇技术报告，2025-03）
- arXiv：<https://arxiv.org/abs/2503.20020>
- 一句话：Gemini Robotics 1.5 的前作，奠定"基于 Gemini VLM + 机器人微调"的整体方案。
- 难度：⭐ 4
- 推荐时机：先读这篇再读 1.5。

### 11. AgiBot World Colosseo（智元开源数据集，2025-03）
- arXiv：<https://arxiv.org/abs/2503.06669>
- 一句话：100 万条轨迹、217 个任务、5 种部署场景的**真机操作数据集**，规模比之前的 RT-1 / OXE 又大一个量级，国内首个开源百万级具身数据集。
- 难度：⭐ 3
- 对小读者意味着：训机器人需要数据"飞轮"，数据集是地基。
- 推荐时机：想了解"机器人界的 ImageNet"时。

### 12. RDT-1B：双手操作的扩散基础模型（2024-10，2025 大量被引）
- arXiv：<https://arxiv.org/abs/2410.07864>
- 一句话：清华团队的 1B 参数 Robotics Diffusion Transformer，专攻**双手协作**——两只机械臂同时干（开瓶/系扣子），是国内最具影响力的开源 VLA 之一。
- 难度：⭐ 4
- 推荐时机：对"为什么双手比单手难得多"好奇时。

### 13. CoRL 2025 Best Paper：腿足力位混合控制（BIGAI × 宇树）
- 解读：<https://blog.csdn.net/2501_93430156/article/details/152791656>
- 一句话：全球首个**力位混合控制**通用策略，让人形/四足在搬运、推门等接触丰富的任务里学会"轻重缓急"，无需外部力传感器。
- 难度：⭐ 4
- 对小读者意味着：机器人不是越用力越好，"温柔接触"是新前沿。
- 推荐时机：看完 H1 跳舞视频后想知道"它怎么不踩到自己脚"。

### 14. MiMo-Embodied：跨自动驾驶 + 具身的统一基座（小米，2025-11）
- arXiv：<https://arxiv.org/abs/2511.16518>
- 一句话：第一个同时打通**自动驾驶 + 具身 AI** 两个领域的开源跨形态基础模型，在 17 个 embodied AI benchmark 上 SOTA。
- 难度：⭐ 4
- 对小读者意味着：未来一辆车 + 一个家务机器人可能共享同一个大脑。
- 推荐时机：理解"为什么车厂都在做机器人"时。

### 15. X-VLA：软提示跨具身 VLA（2025-10）
- arXiv：<https://arxiv.org/abs/2510.10274>
- 一句话：用 NLP 里的 **soft prompt** 思路解决跨机器人差异——给每种机器人发一段"专属嵌入向量"，让一个 transformer 同时驾驭多种本体。
- 难度：⭐ 4
- 推荐时机：对"为什么不同机器人不能共享数据"困惑时。

### 16. Scaling Cross-Embodiment World Models（2025-11）
- arXiv：<https://arxiv.org/abs/2511.01177>
- 一句话：把"世界模型"——预测下一帧画面的视频生成模型——做大做跨形态，发现存在**跨本体不变量**，让动作能在不同机器人间迁移。
- 难度：⭐ 5
- 推荐时机：高阶选读，理解"世界模型 + 机器人"为什么是 2026 年最热方向。

### 17. PhysWorld：从生成视频里学机器人（2025-11）
- arXiv：<https://arxiv.org/abs/2511.07416>
- 一句话：让 Sora / Veo 类视频生成模型先"想象"机器人怎么干活，再用物理世界模型把虚假视频转成可执行动作；零真机示教也能学新任务。
- 难度：⭐ 4
- 对小读者意味着：未来教机器人可能就像写一段 prompt 让 AI 出片。
- 推荐时机：被"AI 生成视频还能干啥"打动时。

### 18. STORM：搜索引导的生成式世界模型（2025-12）
- arXiv：<https://arxiv.org/abs/2512.18477>
- 一句话：把扩散动作生成 + 条件视频预测 + 经典**搜索算法**（像下围棋那样推演未来）三者拼起来做长时序操作。
- 难度：⭐ 5
- 推荐时机：对 AlphaGo 风格搜索能不能用在机器人感兴趣时。

### 19. Robot Trains Robot（自动真机适配，2025-08）
- arXiv：<https://arxiv.org/abs/2508.12252>
- 一句话：让人形机器人在**真实世界**里自动微调强化学习策略——不再纯靠仿真，而是仿真预训练 + 真机持续学。
- 难度：⭐ 3
- 对小读者意味着：解决"仿真好用，一上真机就崩"这个老大难的新方向。

### 20. Humanoid Everyday：开放世界人形操作数据集（2025-10）
- arXiv：<https://arxiv.org/abs/2510.08807>
- 一句话：第一个聚焦**人形机器人 + 日常家务**的大规模数据集，弥补 OXE / DROID 都偏机械臂的空白。
- 难度：⭐ 3
- 推荐时机：对比数据集时和 AgiBot World 一起看。

### 21. AIRoA MoMa：移动操作分层数据集（2025-09）
- arXiv：<https://arxiv.org/abs/2509.25032>
- 一句话：同时含**移动 + 操作**（mobile manipulation）的分层标注数据集，针对"机器人要先走过去再去抓"这种长任务。
- 难度：⭐ 3

### 22. RoboArena：分布式真机评测平台（2025-06）
- arXiv：<https://arxiv.org/abs/2506.18123>
- 一句话：世界各地实验室共同出题、互相用真机跑彼此的策略——给 VLA 做了一个**真实世界版的 LMArena**，避免每家自报家门。
- 难度：⭐ 3
- 对小读者意味着：以后 VLA 论文里"我家最强"会被强制变成"全球榜第几"。

### 23. RIGVid：从生成视频纯模仿做家务（2025-07）
- arXiv：<https://arxiv.org/abs/2507.00990>
- 一句话：完全不要真机示教，仅看 AI 生成的"倒水/擦桌"视频就把动作抽出来落到机械臂上。
- 难度：⭐ 4

### 24. EveryDayVLA：300 美元的 6 自由度 VLA（2025-11）
- arXiv：<https://arxiv.org/abs/2511.05397>
- 一句话：用 300 美元能装出来的桌面机械臂跑 VLA——把"具身 AI 必须烧大钱"的门槛打掉。
- 难度：⭐ 3
- 推荐时机：想在家自己做实验时第一篇读。

---

## 三、Benchmark / Challenge / 综述（⭐ 3）

### 25. BEHAVIOR Challenge @ NeurIPS 2025（李飞飞团队）
- 优胜方案 arXiv：<https://arxiv.org/abs/2512.10071>（Openpi Comet）
- BEHAVIOR-1K 论文：<https://arxiv.org/abs/2403.09227>
- 一句话：1000 项家务、50 个家庭场景、10000 件物品的**长时序家务挑战赛**，2025 年首次大规模评测 VLA 在家庭长任务上的真实水平。
- 难度：⭐ 3
- 对小读者意味着：VLA 在 BEHAVIOR 上的成功率才是"机器人能不能做家务"的真实分数。

### 26. RoboWM-Bench：机器人世界模型 benchmark（2026-04）
- arXiv：<https://arxiv.org/abs/2604.19092>
- 一句话："看着像真的"不等于"物理上对"——首次系统量化视频生成模型在机器人场景的**物理可信度**。
- 难度：⭐ 4

### 27. Vision Language Action Models 系统综述（2025-07）
- arXiv：<https://arxiv.org/abs/2507.10672>
- 一句话：85 页系统综述 VLA 范式从 RT-1 到 π0.5 的演化，含分类法、数据集表格、未来方向。
- 难度：⭐ 3
- 推荐时机：建立全图先读这篇。

### 28. 大型 VLM-based VLA 综述（2025-08）
- arXiv：<https://arxiv.org/abs/2508.13073>
- 一句话：聚焦**基于大 VLM 改造**的 VLA 路线图（OpenVLA / RT-2 / π0 这一脉）。
- 难度：⭐ 3

### 29. 灵巧与具身操作综述（2025-07）
- arXiv：<https://arxiv.org/abs/2507.11840>
- 一句话：从机械编程时代讲到 AI 时代的**灵巧手**操作演进——理解"为什么手最难做"。
- 难度：⭐ 3

### 30. 智源 RoboBrain 2.0 + RoboOS 2.0（2025-07 全面开源）
- 报道：<https://m.jiemian.com/article/13029481.html>
- GitHub：<https://github.com/FlagOpen/RoboBrain>
- 一句话：北京智源开源的"具身大脑 + 跨本体协作 OS"，把单机智能升级为多机集群协作框架。
- 难度：⭐ 3
- 对小读者意味着：未来机器人不一定单打独斗，可能像蚂蚁一样组队。

---

## 阅读路径建议（给零基础读者）

1. **第一周**（建立直觉）：1 → 2 → 3 → 6 → 27
2. **第二周**（看模型怎么演化）：7 → 8 → 9 → 12
3. **第三周**（数据 + 评测）：11 → 25 → 22
4. **第四周**（前沿趋势）：16 → 17 → 14 → 18

---

