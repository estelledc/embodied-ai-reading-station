---
title: "Open-H-Embodiment: A Large-Scale Dataset for Enabling Foundation Models in Medical Robotics"
slug: open-h-embodiment
topic: dataset-eval
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2604.21017"
venue: arXiv
year: 2026
era: frontier
num: 184
generated_at: 2026-07-15
---

# Open-H-Embodiment：给医疗机器人做开放跨本体数据底座

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和作者公开链接能支持的结论；本站没有复现医疗机器人训练、仿真或真实手术实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

Open-H-Embodiment 是一个面向 medical robotics 的大规模开放数据集项目。论文报告它包含 119 个 datasets、780 小时 paired video and kinematic data，来自 50+ institutions，覆盖 20 个 healthcare robot platforms、33 task families 和 5 environment types。它的目标是解决医疗机器人 foundation model 缺数据、数据不开放、单本体、单机构的问题。

论文还展示了这个数据集能支撑两个 downstream foundation models：GR00T-H，一个医疗机器人 VLA；Cosmos-H-Surgical-Simulator，一个 action-conditioned surgical world model。GR00T-H 在 SutureBot end-to-end suturing benchmark 中完成 5/20 trials，也就是 25%，而对照模型为 0%；在 29-step ex vivo suturing sequence 中达到约 64% average success。

如果只记一个直觉：Open-H 不是一篇“又一个模型”的论文，而是在给医疗机器人补“公共训练食材”。没有足够开放、多机构、多机器人、多任务的数据，再强模型也很难学会手术场景。

*所以这一节是想说：Open-H 的核心贡献是医疗机器人开放数据基础设施。*

## 这是个什么场景

医疗机器人，尤其手术机器人，有很强的现实价值：减少医生负担、提高精度、扩大医疗服务覆盖。但它也是最难做自动化的机器人场景之一。场景里有软组织、出血、器械遮挡、细小动作、严格安全边界，还涉及隐私和伦理。

通用机器人领域已经有 Open X-Embodiment、DROID、AgiBot 等大规模数据集，推动了 VLA 和 generalist robot policy。但 surgical robotics 长期缺少类似数据基础。很多数据集很小，只来自单个医院、单个机器人、单个任务，很难训练跨平台 foundation model。

Open-H 的场景就是补这个缺口。它想把全球多个机构、多种医疗机器人、多种手术和医疗操作数据组织成统一格式，让研究者可以训练和评估医疗机器人 foundation models。

```text
医疗机器人数据困境

小数据集     单机构     单机器人     不开放
   │          │          │          │
   └──────────┴──────────┴──────────┘
                    ▼
         foundation model 难以泛化
                    ▼
 Open-H: 多机构 + 多本体 + 多任务 + 开放格式
```

医疗机器人和普通桌面机械臂不同。普通 pick-and-place 任务失败可能只是没拿到物体；手术场景失败可能伤害组织、延长手术时间或影响患者安全。因此，数据集不仅要大，还要有清楚边界和可追溯来源。

*所以这一节是想说：医疗机器人最缺的是可共享、可训练、可比较的大规模数据。*

## 之前的人怎么做的，为什么不够好

过去的 surgical robotics 数据集很多是小而专的。论文提到 JIGSAWS 长期是重要 benchmark，但只有约 3 小时 da Vinci demonstrations。SutureBot 提供约 6 小时 end-to-end suturing data，ImitateCholec 有约 20 小时 segmented cholecystectomy demonstrations。这些数据都很有价值，但规模和多样性不足。

另一个问题是 single-embodiment。一个数据集只覆盖 da Vinci 或 dVRK，不代表模型能迁移到 Versius、MIRA、BiTrack、Maestro 或其他平台。医疗机器人硬件差异很大：相机、器械、自由度、控制接口、任务流程都不同。

第三个问题是开放性。医疗数据涉及隐私、合规、机构限制，很多数据很难公开共享。没有开放数据，社区就无法像通用机器人那样共同训练、共同比较、共同复现。

论文也指出，通用 VLA 在 surgical task 上并不天然强。SutureBot benchmark 曾评估 OpenVLA、GR00T-N1、π0 等 general-purpose VLA，结果它们被从 scratch 训练的 multitask ACT policy 明显超过。这说明“通用模型”不自动拥有手术技能，医疗领域需要自己的数据和后训练。

*所以这一节是想说：医疗机器人不是缺模型名字，而是缺足够开放、足够多样的训练数据。*

## 这篇论文的新想法

第一，新想法是 Open-H-Embodiment 数据集本身。论文报告数据集由 119 datasets 构成，总计 780 小时 paired video and kinematic data，来自 50+ institutions，覆盖 20 distinct robot platforms、33 task families、5 environment types。

第二，新想法是跨本体医疗机器人数据。它不只收 da Vinci，也包含 CMR Versius、dVRK、Rob Surgical BiTrack、Virtual Incision MIRA、Moon Surgical Maestro、UR5e、Franka Panda、Kuka Med 14、custom systems 和 simulation 等。

第三，新想法是用数据集训练和验证 foundation models。论文展示 GR00T-H 和 Cosmos-H-Surgical-Simulator，分别对应 policy / VLA 方向和 world model / simulation 方向。

第四，新想法是把数据贡献流程和模型材料一起公开。论文提到 GitHub、Hugging Face dataset、GR00T-H weights、Cosmos-H-Surgical-Simulator weights 等材料入口。对社区来说，数据能不能被使用和持续贡献，和模型结果同样重要。

```text
Open-H 论文结构

Open-H Dataset
  ├─ 119 datasets / 780 hours
  ├─ 50+ institutions
  ├─ 20 healthcare robot platforms
  └─ 33 task families / 5 environment types

Downstream models
  ├─ GR00T-H: surgical VLA / policy
  └─ Cosmos-H-Surgical-Simulator: action-conditioned world model
```

*所以这一节是想说：Open-H 把数据、模型和社区贡献流程绑在一起。*

## 它分几步做的（方法）

### 第 1 步：汇聚多机构医疗机器人数据

输入是来自多个机构、多个机器人平台、多个医疗任务的数据。每份数据可能有不同相机、不同机器人状态、不同任务标签、不同采样率和不同格式。

处理过程是统一整理成 paired video and kinematic data。paired 的意思是视频和机器人运动状态有对应关系，不只是单独的视频。kinematic data 可以理解为机器人关节、器械位置、动作轨迹等运动信息。

输出是一个可用于训练 foundation model 的数据 corpus。它不是只给人看视频，而是给模型学习“看到什么动作”和“机器人实际怎么动”的对应关系。

### 第 2 步：覆盖不同机器人本体和任务族

Open-H 把 robot platforms 分成多类。论文报告 20 个 healthcare robot platforms，覆盖 surgical robotic systems、industrial arms modified for healthcare、flexible endoscope robots、simulated robots、manual instrumentation 等。

任务也不是单一 suturing。它覆盖 prostatectomy、cholecystectomy、hysterectomy、hernia repair 等完整 procedure，也覆盖 suturing、knot tying、tissue manipulation、needle handover、needle pickup 等 subtask。

输入是多种任务粒度；处理是把 procedure-level 和 subtask-level 数据都纳入；输出是一个能支持从短技能到长流程学习的数据集。

### 第 3 步：训练 GR00T-H

GR00T-H 是 healthcare-focused foundational VLA。论文说明它基于 NVIDIA GR00T-N1.6，并在 Open-H dataset 上 post-training。

输入是医疗机器人数据中的视频、状态和任务提示。处理是后训练，让通用 foundation policy 适配 surgical domain。输出是能在 suturing、handover、knot tying 等任务中执行或预测动作的 policy。

在 SutureBot end-to-end suturing benchmark 上，GR00T-H 是唯一完成 full end-to-end task completion 的模型，完成 5/20 trials，也就是 25%。论文还报告在 ex vivo suturing sequence 中达到 64% average success。

### 第 4 步：评估数据效率和跨本体泛化

论文不只看最终成功率，还看 fine-tuning data efficiency。它比较 33% data 和 100% data 下 GR00T-H、ACT、GR00T-N1.6 的表现。论文报告 33% data 时 GR00T-H 已经和 ACT 在 3-task average 上接近，full data 时更明显领先。

跨本体方面，论文在 CMR Versius、Virtual Incision MIRA、dVRK-Si 等平台上验证。输入是不同 robot embodiment；处理是用 Open-H post-training 作为更强初始化；输出是跨平台任务表现提升。

### 第 5 步：训练 Cosmos-H-Surgical-Simulator

Cosmos-H-Surgical-Simulator 是 action-conditioned world model。它基于 Cosmos-Predict 2.5，在 Open-H surgical data mixture 上 fine-tune。

输入是视频帧和 kinematic action trajectory；处理是预测未来视频或生成 surgical simulation rollout；输出是一个能跨九个 robotic platforms 的 surgical video world model。

这一步的意义是：医疗机器人不只需要 policy，还需要能模拟动作后果的世界模型。世界模型可以支持 in silico policy evaluation、synthetic data generation 和 training screening。

### 第 6 步：公开材料和贡献流程

论文强调数据集、模型权重、训练和推理代码等材料入口。对数据集论文来说，这一步不是附属内容，而是核心方法的一部分。只有材料可获取、格式可复用、贡献流程可执行，Open-H 才能成为基础设施。

不过，公开不等于无风险。医疗机器人数据仍涉及隐私、许可证、机构治理、数据偏差和临床安全边界。使用者必须遵守数据集和模型各自的 license 与合规要求。

*所以这一节是想说：Open-H 的方法是“数据汇聚 -> 格式统一 -> 模型后训练 -> 跨本体评估 -> 世界模型 -> 开放生态”。*

## 关键数字

| 数字 | 原文语境 | 这说明什么 |
|---:|---|---|
| 119 | datasets | 数据不是单一来源，而是多集合汇聚 |
| 780 hours | paired video and kinematic data | 规模远大于传统小型 surgical robotics 数据集 |
| 50+ | participating institutions | 多机构降低单一医院偏差 |
| 20 | healthcare robot platforms | 支撑 cross-embodiment 研究 |
| 33 | task families | 覆盖多种医疗机器人任务 |
| 5 | environment types | 从 simulation 到 live clinical procedures |
| 25% | GR00T-H SutureBot end-to-end completion | 5/20 trials，其他对照为 0% |
| 64% | 29-step ex vivo suturing average success | 论文报告的 clinically proximate evaluation |
| 9 | Cosmos-H 跨 robotic platforms | world model 从单一平台扩展到多本体 |
| 65,000 | GR00T-H training steps | 论文补充材料里的训练设置 |

这些数字全部是论文报告，不是本站复现实验。尤其 25% 和 64% 只能写作 paper-reported performance，不能写成本站验证。

*所以这一节是想说：Open-H 的证据重点是数据规模、跨本体覆盖和两个 downstream model 的可行性。*

## 实验结果说明了什么

实验首先说明大规模医疗机器人数据确实能改善 foundation policy。GR00T-H 在 SutureBot 中完成 end-to-end task，而对照模型没有完成；在 out-of-distribution wound configuration 和 lighting change 下也有更好的平均表现。这支持一个判断：通用模型需要医疗领域 post-training 才能处理 surgical domain 的长程任务。

其次，实验说明 Open-H 可以提升 data efficiency。使用更少 fine-tuning data 时，GR00T-H 已经接近或超过一些 baseline；full data 时进一步提升。这对医疗机器人很重要，因为真实标注数据昂贵，不能指望每个医院都收大量本地数据。

第三，Cosmos-H-Surgical-Simulator 说明 Open-H 不只服务 policy，也服务 world model。一个 action-conditioned surgical world model 可以把动作和未来视觉变化连接起来，这对仿真评估、合成数据和训练筛选都有价值。

但实验也暴露边界。25% end-to-end suturing completion 对研究很重要，但离临床可靠性还很远。64% ex vivo subtask average success 说明模型在接近真实组织的环境里有信号，但仍不能用于临床安全声明。

*所以这一节是想说：实验支持 Open-H 作为研究基础设施，但远未证明医疗机器人自动化已经可临床部署。*

## 术语表

- Medical robotics：医疗场景中的机器人，包括手术、超声、内窥镜和辅助操作。
- Paired video and kinematic data：视频和机器人运动状态成对记录的数据。
- Cross-embodiment：跨不同机器人平台或身体结构。
- VLA：Vision-Language-Action model，把视觉、语言和动作连接起来。
- GR00T-H：基于 GR00T-N1.6 后训练的医疗机器人 foundation VLA。
- SutureBot：自主缝合 benchmark。
- Ex vivo：离体组织实验，比如猪皮组织，不是人体临床部署。
- World model：预测动作对未来观察影响的模型。
- Action-conditioned：以动作轨迹作为条件生成或预测未来状态。

*所以这一节是想说：Open-H 的关键词围绕医疗数据、跨本体和手术世界模型。*

## 局限和边界

第一，医疗机器人数据有天然合规边界。即使论文公开数据和模型入口，也不意味着所有数据都能任意商业或临床使用。

第二，数据规模大不等于任务均衡。不同平台、手术类型、机构和任务时长可能分布不均，模型可能偏向高频平台或高频 procedure。

第三，benchmark 成功不等于临床安全。25% end-to-end completion 和 64% ex vivo average success 是研究进展，但不满足临床可靠性要求。

第四，world model 生成视频不等于真实物理完全正确。动作条件视频预测可能视觉合理，但力、接触、组织变形和安全边界仍要单独验证。

第五，跨本体泛化仍受硬件接口影响。不同机器人自由度、控制延迟、器械结构和视觉系统差异很大，不是一个统一 dataset 就能完全消除。

*所以这一节是想说：Open-H 是基础设施突破，但医疗机器人落地仍有强合规和安全门槛。*

## 和其他论文的关系

和 `mimo-embodied` 相比，Open-H 更像数据底座。MiMo 证明跨具身模型可以连接驾驶和机器人，Open-H 证明医疗机器人需要自己的跨本体开放数据。

和 `alanavlm` 相比，Open-H 关注动作和 kinematics，AlanaVLM 关注 egocentric video understanding。一个更接近 policy training，另一个更接近 embodied perception。

和 `embodied-3d-generation-survey` 相比，Open-H 提供真实医疗机器人数据，3D generation survey 讨论如何生成 simulation-ready assets 和 environments。两者都服务模型训练，只是一个来自真实数据，一个来自生成和仿真。

和 `open-x-embodiment` 相比，Open-H 可以看作医疗机器人领域的专门化版本，但医疗数据更敏感、任务更精细、合规约束更强。

*所以这一节是想说：Open-H 是 Batch 6 里最典型的数据基础设施论文。*

## 和本导读的关系

本站前面已经有 Open X-Embodiment、DROID、LeRobot、AgiBot 等数据和工具链笔记。Open-H 把这条线推进到医疗机器人，说明“foundation model 需要开放数据”这个规律在高风险领域同样成立，但实现难度更高。

它适合放在 dataset-eval 主题里，也适合和 VLA、world-model、sim 三类笔记交叉阅读。读者应该重点理解：医疗机器人模型的瓶颈不只是模型架构，而是数据、格式、许可证、机构协作和安全评估。

*所以这一节是想说：Open-H 补齐本站医疗机器人 foundation data 的关键一块。*

## 思考题

1. 为什么医疗机器人比普通桌面机械臂更需要多机构数据？
2. Paired video and kinematic data 为什么比单纯手术视频更有训练价值？
3. GR00T-H 的 25% end-to-end completion 应该如何解读，为什么不能夸大？
4. Cosmos-H-Surgical-Simulator 和 GR00T-H 分别解决什么问题？
5. 如果一个医院想用 Open-H fine-tune 自己的机器人，需要额外验证哪些风险？

## FAQ

**Q：Open-H 是不是一个模型？**
A：核心是数据集和开放生态。论文也展示 GR00T-H 和 Cosmos-H-Surgical-Simulator，但它的基础贡献是数据。

**Q：780 小时是不是全部真实手术视频？**
A：不是。论文说覆盖 5 environment types，从 digital simulation 到 live clinical procedures。具体组成要看原文和数据说明。

**Q：GR00T-H 25% 成功率是不是已经能做手术？**
A：不是。25% 是 SutureBot benchmark 中的研究结果，临床部署需要远高于此的可靠性、安全验证和监管审批。

**Q：本站有没有下载或训练 Open-H？**
A：没有。这里只记录论文报告和公开来源，不做本地训练或医疗数据处理。

## 进一步读什么

- Open X-Embodiment：理解通用机器人开放数据如何推动 VLA。
- LeRobot：理解机器人数据格式和训练工具链。
- SutureBot：理解自主缝合 benchmark。
- Cosmos / world model 笔记：理解 action-conditioned simulator 的意义。

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：119 datasets、780 hours、50+ institutions、20 platforms、33 task families、5 environment types；GR00T-H 是否基于 GR00T-N1.6；SutureBot 5/20 trials = 25%；ex vivo 29-step sequence 64%；Cosmos-H-Surgical-Simulator 是否跨 9 platforms；公开材料链接和 license 是否按原文表述。

## 原文信息

- arXiv: [2604.21017](https://arxiv.org/abs/2604.21017)
- PDF: [https://arxiv.org/pdf/2604.21017](https://arxiv.org/pdf/2604.21017)
- Project: [https://open-h.github.io/open-h-embodiment/](https://open-h.github.io/open-h-embodiment/)
- Repository: [https://github.com/open-h/open-h-embodiment](https://github.com/open-h/open-h-embodiment)

```bibtex
@article{nelson2026openh,
  title = {Open-H-Embodiment: A Large-Scale Dataset for Enabling Foundation Models in Medical Robotics},
  author = {{Open-H-Embodiment Consortium} and Nelson, Nigel and Chen, Juo-Tung and Haworth, Jesse and Chen, Xinhao and others},
  journal = {arXiv preprint arXiv:2604.21017},
  year = {2026}
}
```
