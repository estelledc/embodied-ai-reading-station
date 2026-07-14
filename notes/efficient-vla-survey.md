---
title: "A Survey on Efficient Vision-Language-Action Models"
slug: efficient-vla-survey
topic: vla
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2510.24795"
venue: arXiv
year: 2025
era: frontier
num: 177
generated_at: 2026-07-14
---

# Efficient VLA Survey：把 VLA 效率问题拆成模型、训练和数据三条线

> 这是一份面向零基础读者的结构化研究笔记。本文只把公开论文文本和 arXiv 元数据能支持的结论写成事实；本站没有本地训练、仿真或真机复现实验，因此不会把论文中的效率判断写成本站 E4 结果。

## 一句话讲什么（TL;DR）

这篇综述整理 efficient VLA 的研究地图：VLA 要落地到机器人，不能只追求更大模型和更高 benchmark 分数，还要处理实时控制、算力成本和数据采集成本。论文把现有工作归纳为三个核心支柱：Efficient Model Design、Efficient Training、Efficient Data Collection，并用这三条线解释模型压缩、架构改造、训练策略、后训练、数据收集和数据增强如何共同影响部署。

如果只记一个直觉：VLA 效率不是“把模型压小”这么简单，而是模型、训练和数据三处都要省，且不能省到机器人动作变差。

*所以这一节是想说：这篇综述给 efficient VLA 画了一张系统地图。*

## 这是个什么场景

VLA 模型把视觉、语言和动作放进同一个控制链条。这个方向很有吸引力，但真实机器人有硬约束：控制频率不能太低，板载算力不能无限大，数据采集不能一直靠昂贵 teleoperation，训练也不能每次都消耗巨大 GPU 资源。

论文用几个数字说明瓶颈：OpenVLA 预训练消耗 21,500 A100-GPU hours，并使用 64-GPU cluster；π0 需要超过 10,000 hours 的机器人轨迹。这些数字不是为了贬低大模型，而是说明如果每个研究组或每个部署场景都要付出类似成本，VLA 很难成为普遍可用的机器人技术。

```text
VLA 部署瓶颈

模型大       -> 推理慢 / 显存高 / 控制频率低
训练贵       -> 复现难 / 迭代慢 / 门槛高
数据采集贵   -> 场景少 / 本体少 / 长尾少
```

```text
综述的三支柱

[Efficient Model Design]
[Efficient Training]
[Efficient Data Collection]
        │
        ▼
让 VLA 从资源密集原型走向可部署系统
```

这个场景和 Batch 3 的 AC²-VLA、Fast-Slow VLA 很接近，但综述的价值在于它不只看单个方法，而是把“哪里可以省、怎么省、省了会损失什么”系统化。

*所以这一节是想说：效率问题是 VLA 从论文到机器人产品的中间桥。*

## 之前的人怎么做的，为什么不够好

在 VLM 和 LLM 领域，效率已有很多方法：attention 优化、量化、剪枝、蒸馏、小模型、缓存、并行解码、参数高效微调等。直接把这些方法搬到 VLA 上，看起来合理，但论文提醒：VLA 多了动作和物理环境，因此效率优化不能只看语言或视觉指标。

机器人控制要求时间连续和物理可靠。一个语言模型少算一点可能只是回答变差；一个 VLA 少算一点可能让动作轨迹抖动、抓取偏移、长程任务失败。模型压缩若破坏空间细节或动作分布，损失会在真实环境中被放大。

已有 VLA survey 多关注概念、架构、训练方法或应用，很少专门以 efficiency 为主线。本文要补的就是这个缺口：把碎片化的 efficient VLA 方法放到统一 taxonomy 里。

*所以这一节是想说：VLA 效率不能只复用 VLM/LLM 的省算方法，必须带着动作和控制约束重新分类。*

## 这篇论文的新想法

论文的核心贡献不是提出一个新模型，而是提出一个分类框架。它把 efficient VLA 研究分成三根主线：

- Efficient Model Design：通过高效架构、模型压缩、token 优化、并行动作生成等减少推理成本。
- Efficient Training：通过高效预训练、后训练、参数高效微调、RL 或 curriculum 等减少学习成本。
- Efficient Data Collection：通过高效数据采集、增强、合成、利用人类视频或自监督信号等减少数据成本。

这三个支柱覆盖了 model-training-data loop。它提醒我们：如果只压模型，训练仍很贵；如果只优化训练，数据仍稀缺；如果只扩数据，模型可能仍跑不动。真正可部署的 VLA 需要系统协同。

*所以这一节是想说：本文把 efficient VLA 从单点技巧整理成“模型-训练-数据”的闭环问题。*

## 它分几步做的（方法）

### 第 1 步：定义 efficient VLA 的问题边界

论文先把 VLA 的效率瓶颈拆成实时不兼容、计算成本过高、数据采集低效三类。实时不兼容指高延迟和低控制频率难以满足 sub-second control cycles；计算成本过高指预训练和推理需要大量 GPU；数据采集低效指机器人轨迹昂贵、慢且难覆盖长尾。

这一步重要，因为“效率”如果不定义，就容易只看 FLOPs 或参数量。对机器人来说，latency、memory、control frequency、training compute、data hours 都是效率。

### 第 2 步：整理 Efficient Model Design

这一部分包括 efficient architectures 和 model compression。efficient architectures 关注注意力优化、linear-time architecture、efficient masking、KV cache、并行动作 decoding、lightweight components、MoE、hierarchical processing 等。model compression 关注 layer pruning、quantization、token optimization。

```text
Efficient Model Design

架构改造：attention / masking / cache / parallel decoding / hierarchy
模型压缩：pruning / quantization / token optimization
核心问题：少算一点，动作还能不能稳？
```

论文提到 SARA-RT、Long-VLA、OpenVLA-OFT、FlashVLA 等代表方向。这里不需要背每个名字，关键是理解：模型层效率有两类，一类是把结构设计得天然更快，一类是把现有模型剪小压缩。

### 第 3 步：整理 Efficient Training

Efficient Training 覆盖高效预训练和后训练。预训练方面，研究者希望更少计算就把 VLM 迁移到 embodied domain；后训练方面，希望用参数高效微调、action chunking、RL、self-improvement 等方法降低适配成本。

论文指出训练的难点是 scalability versus stability。为了省训练成本，可能冻结 backbone 或压缩 action representation；但这样也可能在 embodiment shift、长程 reasoning 或连续动作上损失稳定性。

### 第 4 步：整理 Efficient Data Collection

Efficient Data Collection 面对的是“机器人数据太贵”。方向包括更高效的 teleoperation、自动采集、数据增强、合成数据、人类视频、egocentric manipulation video、自监督表示，以及从最少真实数据中获得可迁移动作知识。

```text
数据效率路线

真实机器人轨迹少而贵
        │
        ├─ 自动采集 / 更好 teleoperation
        ├─ 合成和增强
        ├─ 人类视频和 egocentric 数据
        └─ 自监督 / latent action
        │
        ▼
更低成本覆盖更多场景
```

### 第 5 步：总结挑战和未来方向

论文最后把挑战分成 model、training、data 三类。Model 端是 compactness 和 expressivity 的矛盾；Training 端是 scalable 和 stable 的矛盾；Data 端是 quality、diversity、accessibility 的矛盾。未来方向包括 adaptive / embodiment-agnostic architectures、hardware-software co-design、federated and continual training、physics-informed objectives、generative data ecosystems。

*所以这一节是想说：综述本身的方法是“定义瓶颈 -> 建 taxonomy -> 分支梳理 -> 提炼 trade-off”。*

## 关键数字

论文用 OpenVLA 和 π0 的成本举例：OpenVLA 预训练消耗 21,500 A100-GPU hours on a 64-GPU cluster；π0 需要 over 10,000 hours of robotic trajectories。这两个数字很好地说明 VLA 的效率问题不是小优化，而是进入门槛和部署规模问题。

论文还强调 real-time incompatibility：当前 VLA 常有 high inference latency 和 insufficient control frequency，和 responsive robotic manipulation 所需的 sub-second control cycles 冲突。

需要注意，这篇是 survey，不是单一 benchmark paper。它的关键数字主要用于说明领域瓶颈和代表方法成本，而不是报告一个统一实验分数。

*所以这一节是想说：本文数字服务于“为什么需要 efficient VLA”这个论证。*

## 实验怎么解读

综述没有像方法论文那样做单一实验表，而是通过 taxonomy 和代表工作比较来形成结论。读这类论文时，不要追问“它自己的 success rate 是多少”，而要追问“它如何组织已有证据”。

第一，模型效率不能只看参数量。小模型如果失去语义 grounding 或动作平滑性，机器人任务会失败。第二，训练效率不能只看 GPU 小时。训练更少也可能带来泛化差、embodiment shift 不稳。第三，数据效率不能只看数据量。数据质量、任务多样性、物理真实性和伦理来源都很重要。

这篇综述真正有用的地方，是为后续读论文提供检查清单。看到一篇 efficient VLA 方法，可以问：它属于 model、training 还是 data？它省了哪种资源？代价是什么？是否只在仿真测过？是否会破坏长程控制或跨本体泛化？

*所以这一节是想说：综述的价值是提供读新论文的坐标系。*

## 术语表

- Efficient VLA：面向低延迟、低显存、低训练成本、低数据成本的 VLA 研究方向。
- Efficient Model Design：通过架构和压缩减少模型推理成本。
- Efficient Training：通过训练策略减少预训练、微调或 RL 成本。
- Efficient Data Collection：通过采集、合成、增强和利用异构数据减少机器人数据成本。
- action chunking：一次预测一段动作，减少逐步推理开销。
- token pruning：删除不重要 token，降低注意力和计算成本。
- quantization：降低数值精度以减少显存和计算。
- hardware-software co-design：模型和硬件一起设计，让部署更高效。

*所以这一节是想说：效率词汇要对应到具体资源，而不是泛泛说“更快”。*

## 局限和边界

第一，survey 的结论依赖作者收集和分类的文献范围。它提供地图，但不是最终裁判。新论文出现后 taxonomy 可能需要更新。

第二，效率指标缺少统一评测。不同论文报告 latency、FLOPs、GPU hours、success rate、data hours，硬件和任务也不同，因此不能简单横向排名。

第三，效率和安全之间可能冲突。量化、剪枝、动作压缩可能影响鲁棒性或隐私；这篇综述主要聚焦 efficiency，安全治理需要和 VLA-Forget、membership inference 等工作一起看。

第四，数据效率路线容易引入偏差。合成数据、人类视频、自动探索都能扩量，但如果物理真实性或任务分布不对，可能导致 sim-to-real 或 human-to-robot gap。

*所以这一节是想说：efficient VLA 是必要方向，但不能只追单一效率指标。*

## 和其他论文的关系

和 AC²-VLA 相比，这篇综述是地图，AC²-VLA 是地图上的具体路线：action-context-aware adaptive computation 属于 model-side efficient inference。

和 Fast-Slow VLA 相比，这篇综述提供“为什么快慢系统重要”的背景。Fast-Slow 把语义推理和实时控制拆频率，属于 model/system design 里的部署效率思路。

和 VLA-Forget 相比，这篇综述更关心资源成本，不直接解决危险行为删除。但部署中两者有关：模型压缩和量化可能影响 unlearning 后行为是否反弹。

和 membership-inference-vla 相比，本文没有系统分析隐私攻击，但它的数据效率方向提醒我们：更多采集和更广数据源会带来更复杂的数据治理责任。

*所以这一节是想说：efficient-vla-survey 是把前后几批部署论文串起来的总地图。*

## 和本站导读的关系

本站导读如果只按模型名字读，很容易变成论文清单。efficient-vla-survey 可以作为“部署约束索引”：读任何 VLA 方法时，都问它在模型、训练、数据三条线中解决了哪一条。

它也适合作为学习路径中的复盘页。读完 OpenVLA、CogACT、AC²-VLA、DuoCore-FS、MoS-VLA 后，再读这篇 survey，可以把零散方法放到同一张表里。

*所以这一节是想说：这篇综述帮助读者从“记论文”转向“按资源瓶颈理解论文”。*

## 思考题

1. 为什么 VLA 的效率不能只用参数量衡量？
2. Efficient Model Design、Efficient Training、Efficient Data Collection 分别解决什么资源瓶颈？
3. 为什么机器人数据采集效率会影响模型泛化？
4. 如果一个方法 latency 降低但 long-horizon success 下降，它还算 efficient 吗？

## FAQ

**Q：efficient VLA 是不是小模型 VLA？**  
A：不完全是。小模型只是 model design 的一种。efficient VLA 还包括训练更省、数据更省、推理更稳、硬件更适配。

**Q：为什么 survey 也值得写 deep-read？**  
A：survey 提供的是知识地图。对新手来说，地图比单点方法更能减少迷路。

**Q：OpenVLA 21,500 A100-GPU hours 是本站复算的吗？**  
A：不是。这里只记录论文中引用的成本数字，用来说明效率瓶颈。

**Q：数据合成能不能直接解决数据瓶颈？**  
A：不能直接。合成数据需要物理真实性、任务多样性和评估闭环，否则可能制造偏差。

## 进一步读什么

- AC²-VLA：action-context-aware adaptive computation。
- EfficientVLA：training-free acceleration and compression。
- OpenVLA-OFT：parallel decoding、action chunking 和 fine-tuning。
- VLA manipulation survey：从结构、数据、训练和评估看整体 VLA。

## 精读补充：怎样用三支柱读后续论文

这篇 survey 的最大用处，是把后续论文都放进三支柱里。看到一个新方法，不要先记名字，而是先问它主要省了什么。省推理时间，大概率属于 Efficient Model Design；省训练 GPU 或微调成本，大概率属于 Efficient Training；省机器人示范、大规模采集或标注成本，大概率属于 Efficient Data Collection。有些方法会跨支柱，比如一个模型既用小 backbone，又用少量示范快速适配，还用人类视频扩数据，这时就要分别看每条线的证据。

第二个问题是“省的代价是什么”。Model Design 里的 pruning、quantization、token pruning、layer skipping，可能带来 latency 降低，但也可能损失空间细节和动作稳定。Training 里的参数高效微调和 RL，可能减少训练成本，但会引入收敛稳定性、reward 设计和 embodiment shift 问题。Data Collection 里的视频数据、合成数据和自动探索，可能扩大覆盖面，但也会带来标注噪声、物理真实性和伦理来源问题。

第三个问题是“证据在哪个层级”。如果论文只报告 FLOPs 降低，还要问 wall-clock latency 有没有降；如果只报告仿真成功率，还要问真实机器人有没有测；如果只报告训练小时减少，还要问泛化和长程任务有没有损失。efficient VLA 的真正目标不是把单个数字变漂亮，而是在机器人约束下保持可用能力。

第四个问题是“是否可复用”。一个效率方法如果强依赖某个硬件、某种动作空间或某个固定任务，迁移价值就有限。survey 提到的未来方向如 adaptive architectures、hardware-software co-design、federated / continual training、generative data ecosystems，都是在回答同一个问题：怎样让效率成为系统能力，而不是一次性的 benchmark trick。

还可以把三支柱当成排查顺序。模型太慢时，先看 Model Design：是否每个控制步都跑完整 backbone，是否有 token 或层级冗余，是否可以缓存。训练太贵时，看 Efficient Training：是否必须全量预训练，是否可以参数高效微调，是否可以用 curriculum 或 meta-learning 减少适配成本。数据太少时，看 Efficient Data Collection：是否可以从人类视频、仿真、自动探索或更好的 teleoperation 中补充覆盖面。

这套顺序也能避免过度优化。比如只为了降低 FLOPs 做剪枝，却没有检查控制频率和 success rate，就可能得到一个“纸面 efficient、机器人不可用”的模型。真正的 efficient VLA 应该同时交代节省了什么资源、牺牲了什么能力、在哪个硬件和任务上验证。

*所以这一节是想说：三支柱不是分类作业，而是一套审查 efficient VLA 论文的问法。*

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：三支柱 taxonomy 是否为 Efficient Model Design、Efficient Training、Efficient Data Collection；OpenVLA 21,500 A100-GPU hours 和 π0 over 10,000 hours trajectories 是否来自原文；future directions 是否对应 adaptive architectures、training paradigms、generative data ecosystems；不要把 survey 的领域判断写成本站实验结果。

## 原文信息

- arXiv: [2510.24795](https://arxiv.org/abs/2510.24795)
- PDF: [https://arxiv.org/pdf/2510.24795](https://arxiv.org/pdf/2510.24795)
- Project: [https://evla-survey.github.io/](https://evla-survey.github.io/)

```bibtex
@article{yu2025efficientvlasurvey,
  title = {A Survey on Efficient Vision-Language-Action Models},
  author = {Yu, Zhaoshu and Wang, Bo and Zeng, Pengpeng and Zhang, Haonan and Zhang, Ji and Wang, Zheng and Gao, Lianli and Song, Jingkuan and Sebe, Nicu and Shen, Heng Tao},
  journal = {arXiv preprint arXiv:2510.24795},
  year = {2025}
}
```
