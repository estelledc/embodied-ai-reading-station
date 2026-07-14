---
title: "VLA-Forget: Vision-Language-Action Unlearning for Embodied Foundation Models"
slug: vla-forget
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2604.03956"
venue: arXiv
year: 2026
era: frontier
num: 175
generated_at: 2026-07-14
---

# VLA-Forget：让机器人模型忘掉危险行为，同时别把正常能力一起忘掉

> 这是一份面向零基础读者的结构化研究笔记。本文只把公开论文文本和 arXiv 元数据能支持的结论写成事实；本站没有本地训练、仿真或真机复现实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

VLA-Forget 研究一个很现实的问题：VLA 模型学到了不安全、错误或隐私敏感的行为后，能不能只删掉这部分行为，同时保留视觉理解、语言 grounding 和正常动作控制能力。它把 VLA unlearning 拆成三件事：targeted forgetting、perceptual preservation、reasoning retention，并在视觉编码器、跨模态 projector 和上层动作生成 transformer block 之间分阶段更新。

如果只记一个直觉：它不是“把模型变弱”，而是像给机器人删掉一条危险肌肉记忆，同时保持眼睛、语言理解和正常动作习惯还能工作。

*所以这一节是想说：VLA-Forget 把安全治理从训练前数据清洗推进到训练后行为移除。*

## 这是个什么场景

想象一个仓库机器人被大量示范训练过。后来我们发现其中一小部分示范有问题：比如把红杯当蓝杯、在不该靠近人的时候靠近人、或者某些轨迹来自不该继续使用的隐私场景。传统做法可能是重新收集数据、重新训练，成本很高；简单 fine-tune 又可能把正常能力也冲掉。

VLA-Forget 面对的是这种“模型已经上线或接近上线，但我们需要删除一小块能力”的场景。对普通语言模型来说，unlearning 常常是忘掉文本知识；对 VLA 来说，知识不是只藏在语言层，它还可能藏在视觉表征、图文对齐、动作 token 和控制习惯里。

```text
有问题的机器人行为
        │
        ▼
[视觉误识别] -- [语言 grounding 错] -- [动作先验错]
        │             │                │
        └────── VLA-Forget 同时处理这些位置 ──────┘
```

```text
目标不是：
  把整个模型洗掉，然后重新训练。

目标是：
  只压制目标行为，同时保留非目标任务、视觉语义和动作接口。
```

这个场景的重要性在于机器人错误会变成物理动作。一个聊天模型说错话需要纠正，一个机器人抓错东西、靠近危险区域或重复错误动作，后果会更直接。因此，部署后的选择性删除能力，是 VLA 安全治理的一部分。

*所以这一节是想说：VLA unlearning 的难点来自“多模态理解 + 真实动作输出”一起耦合。*

## 之前的人怎么做的，为什么不够好

机器学习里已经有 unlearning 方法，例如只更新某些参数、用梯度上升削弱目标样本、用 saliency 找重要权重、用 retain set 保持正常能力。但这些方法多是为单独视觉模型或语言模型设计的。

VLA 不一样。OpenVLA-style policy 通常把图像输入送进视觉编码器，再通过 projector 对齐到语言 backbone，最后用离散 action token 或动作 head 生成机器人动作。错误行为可能来自三个位置：视觉层把物体看错，projector 把视觉和语言对错，动作层把错误关联变成动作习惯。只改一层，可能残留问题；全量改，又可能伤到 retain task。

论文指出常规 unlearning baseline 在 embodied setting 中容易出现两个问题。第一，忘得不够干净，目标行为还有残留。第二，忘得太猛，正常任务成功率和视觉语义也一起下降。对机器人来说，这两种都不好：前者不安全，后者不可用。

*所以这一节是想说：VLA 的“忘记”必须同时考虑忘掉目标、保留视觉、保留推理和动作。*

## 这篇论文的新想法

VLA-Forget 的新意是把 VLA unlearning 写成一个三目标问题，而不是只优化一个“让目标样本 loss 变大”的目标。三目标分别是：

- targeted forgetting：让目标行为被削弱。
- perceptual preservation：别破坏视觉语义和跨模态 specificity。
- reasoning retention：保留正常任务上的 reasoning 和 task success。

方法上，它提出 hybrid unlearning framework：对感知和跨模态部分使用 ratio-aware selective editing，对 reasoning/action 部分使用 layer-selective unlearning。论文还提到用 multi-objective PCGrad stabilization 来缓解 retain、forget、mismatch 等目标之间的梯度冲突。

这个设计像医生做局部手术。不是把病人全身麻木，而是先定位问题组织，再控制切除范围，同时监控其他功能指标。VLA-Forget 的“指标监控”就是 forget set、retain set、perceptual preservation 和 reasoning retention。

*所以这一节是想说：本文的核心不是某一个 trick，而是把 VLA 忘记任务拆成可控的多目标编辑流程。*

## 它分几步做的（方法）

### 第 1 步：定义要忘什么、要保什么

论文把训练后模型面对的数据分成 forget、retain 和 mismatch 相关集合。forget set 对应需要移除的目标行为，retain set 对应正常能力，mismatch set 用来帮助模型区分“不该继续执行的关联”和“仍然应该保留的感知/语言能力”。

这一步很关键，因为 unlearning 不是随便让模型输出变差。假如目标是“不要把红杯当蓝杯”，那模型仍然要认识红杯和蓝杯，也仍然要能抓杯子，只是不能保留那条错误指令到动作的关联。

### 第 2 步：拆开 VLA 的可编辑部位

VLA-Forget 关注 OpenVLA-style policy：视觉 stack、cross-modal projector、language backbone / action-generating transformer blocks。它不是假设所有错误都在同一个层里，而是承认错误可能沿着感知、对齐和动作推理扩散。

```text
OpenVLA-style policy

[image] -> [vision encoder] -> [projector] -> [LLM/action blocks] -> [action tokens]
              │                  │              │
              │                  │              └─ 动作习惯 / 推理
              │                  └─ 图文对齐
              └─ 视觉语义
```

### 第 3 步：在不同部位用不同 unlearning 方式

对视觉和 projector，论文强调 ratio-aware selective editing。直觉是：如果某些参数或表示对目标行为影响很大、对保留能力影响较小，就更适合局部编辑；如果影响面太广，就要谨慎。

对 reasoning/action 层，论文强调 layer-selective unlearning。动作相关错误往往不只是图像误识别，还包括语言指令到动作 token 的映射。因此，上层 action-generating block 需要被纳入编辑，但不能无差别更新所有层。

### 第 4 步：用多目标优化减少互相拉扯

forget 目标希望模型远离目标行为，retain 目标希望模型保持正常行为，perceptual preservation 希望视觉表示不要塌掉。这几个目标天然会互相拉扯。论文使用 projected conflict resolution，也就是 PCGrad 类思路，在目标梯度冲突时做投影，避免一个目标把另一个目标完全抵消。

这一步的直觉是：训练时不是一个教练喊“忘掉”，而是多个教练同时喊“忘掉这块、别忘那块、视觉别坏、动作接口别坏”。PCGrad 像裁判，尽量让这些要求不互相打架。

### 第 5 步：保持 OpenVLA 接口可用

论文强调保持 standard de-tokenization 和 action unnormalization pipeline。也就是说，unlearning 后的模型仍然沿用原来的动作接口，不能变成一个只会在离线指标上好看、但不能接回机器人控制链路的模型。

*所以这一节是想说：VLA-Forget 是“数据集合定义 -> 模块定位 -> 分层编辑 -> 多目标稳定 -> 接口保持”的流程。*

## 关键数字

论文摘要报告了几个核心数字：相对强 unlearning baselines，VLA-Forget 提高 forgetting efficacy 10%，perceptual specificity 保留提升 22%，reasoning 和 task success retention 提升 9%，post-quantization recovery 降低 55%。这些都是论文报告的比较结果，不是本站复现实验。

论文实验包括 OpenVLA-7B，数据/任务涉及 Open X-Embodiment、lerobot/pusht_image，并在正文和附录里讨论 π0-fast 结果。它还报告了 quantization robustness：unlearning 后再做 post-training 8-bit quantization 时，目标行为恢复越少越好；摘要里的 55% 就和这一类 post-quantization recovery 风险有关。

这些数字适合这样理解：VLA-Forget 不只是让模型在 forget set 上表现差，而是要求 forget 以后仍能保留 retain utility 和视觉/推理能力。对部署来说，这比单一 forgetting score 更重要。

*所以这一节是想说：本文数字要按“忘得掉 + 留得住 + 量化后不反弹”三件事一起读。*

## 实验结果说明了什么

实验不是证明 VLA-Forget 已经能解决所有机器人安全问题，而是在证明一个更窄但重要的命题：在 OpenVLA-style VLA 上，分模块、多目标的 unlearning 比单一 baseline 更适合选择性移除行为。

读 Table 1 这类结果时，不要只看 forget-side metric。假如一个 baseline 把模型改到什么都不会，它在某些 forgetting 指标上可能也会很好，但那不是可部署 unlearning。真正有价值的是目标行为被削弱，同时 retain-side task success 和 reasoning 指标还能守住。

读 quantization 结果时，要特别注意部署含义。机器人模型常常需要量化以节省显存和推理成本。如果 unlearning 后一量化，原本忘掉的行为又恢复，那部署风险很高。VLA-Forget 把 post-quantization recovery 也纳入观察，说明它把安全治理放在真实工程链路里考虑。

*所以这一节是想说：实验的重点不是“忘得越多越好”，而是“只忘目标行为，并且部署变换后不反弹”。*

## 术语表

- VLA：Vision-Language-Action，把视觉、语言和动作放在一个策略里。
- unlearning：训练后移除某些数据、行为或关联的影响。
- forget set：希望模型忘掉的目标样本或行为集合。
- retain set：希望模型继续保持能力的正常样本集合。
- projector：把视觉特征对齐到语言模型可处理表示的模块。
- action token：把连续动作离散化后作为 token 预测的表示。
- PCGrad：处理多任务梯度冲突的一类方法。
- post-quantization recovery：量化后被忘掉的行为又恢复的风险。

*所以这一节是想说：本文的关键词都围绕“选择性删除”和“保持机器人接口可用”。*

## 局限和边界

第一，本文结果来自论文设置，不等于本站已经在真实机器人上验证。所有成功率、提升比例和鲁棒性数字都必须保留“论文报告”的边界。

第二，unlearning 的目标定义很关键。现实里什么算 unsafe、privacy-sensitive 或 spurious behavior，需要组织规则、人类审查和任务上下文共同决定。论文提供技术框架，但不能替代安全策略。

第三，VLA-Forget 主要围绕 OpenVLA-style policy 展开。不同 VLA 架构如果动作表示、视觉编码器、语言 backbone 或控制频率不同，直接迁移可能需要重新验证。

第四，unlearning 后的行为是否真的安全，还需要在线评估、分布外测试、长程任务测试和人类复核。离线 forget/retain 指标只是第一层证据。

*所以这一节是想说：VLA-Forget 是很有价值的治理工具，但不能被当成一键安全按钮。*

## 和其他论文的关系

和 AC²-VLA 相比，VLA-Forget 关注安全与治理，不是推理加速。AC²-VLA 问“什么时候可以少算”，VLA-Forget 问“哪些行为必须删除”。两者都服务部署，但约束不同。

和 membership-inference-vla 相比，VLA-Forget 更像防御/修复工具，membership inference 更像风险诊断工具。前者处理模型里不该保留的行为，后者揭示训练数据可能通过动作输出泄漏。

和 efficient-vla-survey 相比，VLA-Forget 不是效率综述，而是补上效率之外的安全维度。一个轻量 VLA 如果记住了隐私轨迹或危险行为，部署仍然有风险。

和 vla-manipulation-survey 相比，VLA-Forget 是快速发展阶段中的一个专题方法。综述帮助我们定位 VLA 的结构和评估维度，VLA-Forget 则提供训练后治理的具体技术路径。

*所以这一节是想说：Batch 4 从“效率/适配”继续推进到“安全、隐私、综述地图”。*

## 和本导读的关系

如果沿着本站导读读 VLA，先理解 RT-2 / OpenVLA 一类模型如何把语言和动作接起来，再读 VLA-Forget 会更顺。因为本文默认读者知道 VLA 有视觉编码器、projector、语言 backbone 和动作 token。

它可以放在导读中的“部署与治理”位置：当模型已经具备通用能力，下一步不只是让它更快、更准，还要让它可控、可撤回、可审计。

*所以这一节是想说：VLA-Forget 是理解 VLA 安全治理的一块拼图。*

## 思考题

1. 为什么 VLA unlearning 不能只更新语言 backbone？
2. 如果一个方法忘得很彻底但 retain task 全崩了，它算不算好的 unlearning？
3. 为什么 post-quantization recovery 对部署很重要？
4. forget set 和 retain set 如果定义错，会带来什么风险？

## FAQ

**Q：VLA-Forget 是不是让机器人忘掉某个物体？**  
A：不一定。它更一般，是忘掉目标行为或关联。比如不是忘掉“杯子”这个概念，而是忘掉某条错误指令到错误动作的关联。

**Q：forgetting efficacy 提升 10% 能不能直接说机器人更安全 10%？**  
A：不能。那是论文实验指标，不等于真实安全事故概率。安全需要更完整的场景评估。

**Q：为什么要保留视觉 specificity？**  
A：因为目标行为可能和正常视觉识别共享表示。如果视觉能力塌掉，模型也许忘了目标，但正常任务也会变差。

**Q：这和删除训练数据一样吗？**  
A：不一样。删除数据是数据层动作，unlearning 是模型层动作。现实中可能两者都需要。

## 进一步读什么

- OpenVLA：理解 OpenVLA-style policy 和 action token 接口。
- 机器学习 unlearning 综述：理解 forget/retain 目标的通用背景。
- membership inference for VLA：理解为什么隐私敏感轨迹会成为 VLA 风险。
- VLA efficiency survey：理解部署时量化、压缩和实时推理为什么会影响安全治理。

## 精读补充：为什么“忘记”在机器人里更难

读 VLA-Forget 时，最容易低估的是“忘记”这个词。日常说忘记，好像只是删除一条记忆；但模型里的记忆不是一行文本，而是大量参数共同形成的行为倾向。对 VLA 来说，这种倾向还会穿过感知、语言和动作三层。比如“看到某种杯子后执行某个错误动作”，可能不是一个单独神经元保存的事实，而是视觉特征、语言 token、历史训练动作和动作解码共同形成的路径。

因此，VLA-Forget 的三目标设计很有必要。targeted forgetting 只回答“目标行为有没有被压下去”；perceptual preservation 回答“模型是否还看得懂世界”；reasoning retention 回答“模型是否还能完成正常任务”。如果只看第一个目标，方法可能退化成破坏模型；如果只看后两个目标，目标行为可能没有真正删除。三者同时存在，才像一个能部署的治理流程。

还有一个容易忽略的点是量化。很多机器人部署不会直接跑训练时的 full precision 模型，而会做 8-bit 或其他压缩。量化会改变参数空间，可能让被压制的行为重新浮现。论文把 post-quantization recovery 写进结果，说明作者关心的是“训练后编辑能否经受部署变换”，这比只在原模型上看 forget score 更接近实际。

最后，这篇论文也提醒我们不要把 unlearning 当成道德或合规的全部。技术上能压制某些行为，不代表组织已经决定了哪些行为应该被压制、谁有权提出删除、删除后如何审计。VLA-Forget 提供的是模型层工具，真正上线还需要数据治理、访问控制、事件记录和人工审核一起配合。

*所以这一节是想说：机器人里的忘记不是删除文件，而是带着感知、推理、动作和部署压缩一起做局部手术。*

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：摘要中的 10%、22%、9%、55% 是否来自同一比较口径；OpenVLA-7B、Open X-Embodiment、lerobot/pusht_image 和 π0-fast 的实验设置是否分别对应正文与附录；PCGrad、ratio-aware selective editing、layer-selective unlearning 是否按论文定义解释；post-quantization recovery 是否只作为论文指标，不写成本站复现结论。

## 原文信息

- arXiv: [2604.03956](https://arxiv.org/abs/2604.03956)
- PDF: [https://arxiv.org/pdf/2604.03956](https://arxiv.org/pdf/2604.03956)
- Code: [https://github.com/raviranjan-ai/VLA-Forget](https://github.com/raviranjan-ai/VLA-Forget)

```bibtex
@article{ranjan2026vlaforget,
  title = {VLA-Forget: Vision-Language-Action Unlearning for Embodied Foundation Models},
  author = {Ranjan, Ravi and Polyzou, Agoritsa},
  journal = {arXiv preprint arXiv:2604.03956},
  year = {2026}
}
```
