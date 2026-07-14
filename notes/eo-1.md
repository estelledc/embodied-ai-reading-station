---
title: "EO-1: Interleaved Vision-Text-Action Pretraining for General Robot Control"
slug: eo-1
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2508.21112"
venue: arXiv
year: 2025
era: frontier
num: 162
generated_at: 2026-07-14
---

# EO-1：把看、说、想、动交错放进同一个训练序列

> 本文基于 EO-1 / EO-Robotics 公开 arXiv 论文整理。论文声称开源模型、代码和数据组件；本站未独立验证下载、训练或真机部署。

## 一句话讲什么（TL;DR）

EO-1 认为，机器人不能只在最后一步输出动作；真实交互里，人会边看、边想、边说出中间判断、边行动。它提出 EO-Robotics：3B 的 EO-1 模型、EO-Data1.5M 数据集和 EO-Bench 评测，把 image、text、video、action 交错成同一条序列训练。模型同时用文本自回归和连续动作 flow matching，在 LIBERO、SimplerEnv、EO-Bench 和真机任务中报告强于多个 VLA / VLM 基线。

*所以这一节是想说：EO-1 的关键词是 interleaved，不是把图文和动作分开训练，而是让推理和行动在同一序列里互相影响。*

## 这是个什么场景

你让机器人做早餐三明治，它不能只看到第一帧就连续输出动作。它需要观察面包在哪里，判断火腿是否已经放好，决定下一步拿生菜，动作后再看状态是否变化。这个过程像人做事：眼睛看，脑子判断，手动一下，再看结果，再改计划。

很多 VLA 把动作放在输出序列最后：模型先处理图像和文本，然后吐动作。这在简单抓取里可以，但对开放世界任务不够自然。真实机器人交互里，视觉、语言、视频和动作是交错的：动作改变世界，新的世界又影响下一步推理。

EO-1 试图把这种“边想边动”的结构写进训练数据。它不只训练“图像+指令 -> 动作”，还训练“图像/视频 + 问答 + 中间推理 + 动作”的交错样本，让模型同时学 embodied reasoning 和 robot control。

*所以这一节是想说：EO-1 处理的是开放世界机器人中 reasoning 和 action 相互反馈的问题。*

## 之前的人怎么做的，为什么不够好

第一类是自回归 VLA，例如 RT-2、OpenVLA、FAST 类动作 token 路线。它们容易继承 VLM 知识，但连续动作精度和高频控制会受离散 token 限制。

第二类是 diffusion / flow action expert，例如 π0、RDT、CogACT 等。它们更擅长连续动作，但如果动作专家和语言视觉主干连接不好，可能出现知识保持、训练效率和指令跟随问题。

第三类是 co-training：把 web 图文数据和机器人数据一起训练，防止 VLM 常识被机器人数据冲掉。但许多 co-training 仍把 image-text 和 robot episode 分开处理，没有充分表达“推理指导行动、行动结果反过来影响推理”的时间关系。

EO-1 的判断是：不是只缺更多数据，而是缺“交错的数据形态”。如果训练样本永远把视觉、文本、动作分开，模型就难学到开放世界交互里跨模态的因果顺序。

*所以这一节是想说：EO-1 站在 OpenVLA、π0 和 co-training 之后，进一步追问训练序列本身是不是太分离。*

## 这篇论文的新想法

EO-1 的新想法是：**用一个 decoder-only transformer 同时处理 image、text、video、action，并把文本自回归和动作 flow matching 放在同一共享主干里。**

这像把机器人训练从“看题后直接填答案”变成“保留完整解题草稿”。草稿里有图像观察、空间问答、任务规划、动作执行和执行后状态。模型不只是学答案，还学中间因果链。

论文提出 EO-Data1.5M：超过 150 万条强调 interleaved vision-text-action comprehension 的样本。数据来自 web vision-language data 和真实 robot episodes，再由 VLM 与人工标注构造物理常识、任务规划、物体定位、affordance pointing、多视角对应等问答。

```text
EO-1 训练序列示意

图像/视频帧 → 空间问答 → 任务计划 → 动作片段 → 新观察 → 下一轮推理
      │          │          │          │          │
      └──────────┴──────────┴──────────┴──────────┘
                   shared decoder-only transformer
```

*所以这一节是想说：EO-1 把机器人动作和 embodied reasoning 统一成交错序列，而不是两个互不相干的训练任务。*

## 它分几步做的（方法）

### 第 1 步：构造 EO-Data1.5M

论文先整合 web vision-language data 和 real robot episodes。真实机器人 episode 天然包含时间、动作和物理连续性；再通过 VLM 与人工标注加入 embodied QA，包括物理常识、空间关系、任务规划、对象定位、可供性点选、多视角对应等。

### 第 2 步：把 QA 和动作按时间顺序交错

传统数据可能是一条图文问答，或者一段机器人轨迹。EO-1 把它们按时间连接：某个时刻看到图像，问一个关于空间或任务的问题，接着有动作，再进入下一时刻。论文还设计了三种 flexible interleaved formats，使 reasoning QA 能随机关联到机器人动作序列里。

### 第 3 步：统一模型架构

EO-1 使用单个 decoder-only transformer，建立在预训练 VLM 上，继承视觉语言知识。它增加两个 MLP 来编码和解码连续机器人动作，但尽量避免像某些 VLA 那样引入过多 action-specific bottleneck。

### 第 4 步：混合训练目标

文本部分用 next-token prediction，自回归预测下一个文字 token；动作部分用 flow matching denoising，从噪声连续动作还原到真实动作。人话说：文字像写句子，动作像把一团随机轨迹拉回合理轨迹。

### 第 5 步：多维度评测

EO-1 不只测控制，还测 embodied reasoning。评测包括 RoboVQA、ERQA、EO-Bench、LIBERO、SimplerEnv 和真机多平台任务。这样可以同时检查它是否会理解空间、会推理任务、会执行动作。

```text
训练目标

text token:  自回归预测下一个词
action:      flow matching 生成连续动作
shared:      同一主干捕捉视觉-语言-动作依赖
```

*所以这一节是想说：EO-1 的方法是数据交错、架构统一、目标混合，三者一起支撑 reasoning-action 协同。*

## 关键数字（What works）

| 现象 | 论文报告的数字 | 怎么理解 |
|---|---:|---|
| 模型规模 | 3B | 比 7B VLA 更小，但强调统一建模 |
| EO-Data1.5M | 1.5M samples / 1.0B tokens | 交错具身数据核心资产 |
| 总数据 | 260.6M samples / 135.4B tokens | 包含多模态和机器人数据 |
| EO-Bench | 700 multiple-choice VQA tasks | 评估空间、状态、物理常识和任务推理 |
| RoboVQA | EO-1 BLEU-4 58.5，GPT-4o 47.2 | 具身 VQA 上高于闭源强基线 |
| LIBERO overall | EO-1 98.2% | 论文报告强于 OpenVLA-OFT、π0、GR00T N1 |
| SimplerEnv | WidowX 72.7%、Google-VM 76.5%、Google-VA 63.0% | 视觉分布变化下控制表现 |
| 真机平均完成 | EO-1 86.0%，π0 68.0%，GR00T-N1.5 71.0%，Fast 43.0% | 论文报告多平台真机任务优势 |

这些数字很亮眼，但要谨慎读：EO-1 是 2025 之后的 frontier 报告，部分基线和数据设置非常新，本站没有独立复验。

*所以这一节是想说：EO-1 的数字同时覆盖 reasoning 和 control，它想证明交错训练不是只提高问答，也提高动作。*

## 实验结果说明了什么

第一，embodied reasoning 需要专门评测。主流 VLM 在普通图文任务强，不代表能理解机器人视角下的空间、可供性和任务状态。EO-Bench 的设计就是为了暴露这个差距。

第二，连续动作不能只靠离散自回归。论文表格显示 EO-1 fast（纯或偏自回归）在 LIBERO overall 为 88.0%，EO-1 base 为 98.2%，说明加入 flow matching 对动作精度有明显帮助。

第三，交错数据比普通 instruction data 更对口。论文指出，加入 generic instruction-following 数据可能让表现下降，因为它强化语言先验却削弱物理 grounding；真正有用的是和动作、状态、空间关系对齐的多模态数据。

第四，数据规模和格式同时重要。EO-Data1.5M 不只是“大”，还把 QA、视频、动作按 temporal order 组织起来。这个格式让模型学到“行动会改变下一轮观察”。

*所以这一节是想说：EO-1 的实验支持一个判断：机器人基础模型需要任务对齐的交错具身数据，而不是简单混入更多图文指令。*

## 你应该懂的几个新词

- **Interleaved pretraining**：交错预训练。把多种模态按真实交互顺序混在同一训练序列中。
- **Flow matching**：流匹配。学习从噪声分布连续流向真实动作分布，比离散 token 更适合连续控制。
- **Embodied reasoning**：具身推理。围绕空间、物理、状态变化和任务可供性的推理。
- **EO-Bench**：论文提出的具身推理评测，包含物理常识、空间理解、状态估计、任务推理。
- **Mixed-modality dataset**：混合模态数据集，不只是图文，还包含视频、动作和机器人轨迹。

*所以这一节是想说：EO-1 的新词集中在“交错数据”和“推理-动作统一训练”。*

## 它有什么搞不定的

第一，论文自己也说未来还要增强导航、避障、失败检测、人类意图识别和人机协作。也就是说，EO-1 仍主要围绕操作和具身推理，完整家庭服务还没解决。

第二，统一架构可能带来推理效率问题。EO-1 希望未来探索更高效的统一模型或异步推理 pipeline，说明当前“同时 reasoning 和 action”的系统还需要工程优化。

第三，数据构造复杂。EO-Data1.5M 依赖 VLM 和人工标注构造高质量 interleaved QA，不是随便把轨迹拼接就能得到。

第四，通用数据并非都有效。论文指出 generic instruction-following 数据可能伤害物理 grounding，这意味着数据治理比“越多越好”更重要。

*所以这一节是想说：EO-1 的方向很强，但真正难点在高质量交错数据和高效部署。*

## 它和别的几篇是什么关系

- 和 [OpenVLA](openvla.md)：OpenVLA 是开源 VLA 基线，EO-1 更强调交错 reasoning-action 训练。
- 和 [π0](pi0.md) / [π0.5](pi05.md)：π 系列重视 flow matching 和 co-training，EO-1 把 interleaved QA/action 数据进一步中心化。
- 和 [CogACT](cogact.md)：CogACT 把 cognition 与 action 模块化，EO-1 试图在同一共享主干中统一 reasoning 和 action。
- 和 [LoHoVLA](lohovla.md)：LoHoVLA 显式生成 sub-task，EO-1 用更大规模交错数据学习推理-行动关系。
- 和 [AutoRT](autort.md)：AutoRT 关注真实数据怎么采，EO-1 关注采来的数据怎样组织成模型可学的交错序列。

*所以这一节是想说：EO-1 可以看作 2025 年 VLA/co-training/flow matching/数据工程几条线的汇合。*

## 和本导读的关系

本篇对接 [Ch12: OpenVLA / VLAs / MLA](../guide/ch12-openvla-vlas-mla.md)、[Ch21: Datasets](../guide/ch21-datasets.md) 和 [Ch15: World Models](../guide/ch15-world-models.md)。它既是 VLA 架构论文，也是数据范式论文，还带有世界状态推理色彩。

如果你已经读过 OpenVLA、π0、CogACT，再读 EO-1 会看到一个趋势：机器人基础模型不再满足于“看图+指令 -> 动作”，而是在训练数据里显式加入状态、推理、视频和动作的因果顺序。

*所以这一节是想说：EO-1 是理解 frontier VLA 从动作模型走向 embodied foundation model 的关键节点。*

## 思考题

**Q1：为什么 EO-1 要把 QA 和动作交错，而不是分别训练一个 VQA 模型和一个 policy？**

<details>
<summary>提示</summary>

真实交互中推理和行动相互影响。分开训练可能学不到动作改变世界、世界再影响推理的因果链。
</details>

**Q2：为什么 generic instruction-following 数据可能伤害机器人控制？**

<details>
<summary>提示</summary>

它可能增强语言模式，却没有物理 grounding，模型会更会说但不一定更会动。
</details>

**Q3：EO-1 的 flow matching 和 OpenVLA 的动作 token 最大差别是什么？**

<details>
<summary>提示</summary>

前者生成连续动作轨迹，后者把动作离散成 token；连续控制精度和推理速度取舍不同。
</details>

**Q4：EO-Bench 为什么不是普通 VQA benchmark？**

<details>
<summary>提示</summary>

它围绕机器人视角、空间关系、状态估计和任务推理，而不是普通图片问答。
</details>

**Q5：如果你要构建一个小型 EO-Data，最难的是哪一步？**

<details>
<summary>提示</summary>

高质量地把观察、任务推理、动作和后续状态按时间对齐，并确保标注真的对应物理变化。
</details>

## 一些好奇心问答（FAQ）

**EO-1 是不是只靠 3B 就赢所有大模型？**  
不能这么读。论文比较的是特定 embodied reasoning 和 robot control 设置，且 EO-1 有专门交错具身数据。

**它和 π0 谁更重要？**  
两者关注点不同。π0 是流匹配 VLA 基础模型代表，EO-1 更强调 interleaved reasoning-action 数据和统一训练。

**EO-Data1.5M 是不是纯机器人轨迹？**  
不是。它是 interleaved embodied data，包含视觉、文本、视频、动作和问答监督。

**为什么要有 EO-Bench？**  
因为普通 VQA 无法衡量机器人需要的空间、状态和任务推理能力。

**读完后下一步看什么？**  
可以回看 [AutoRT](autort.md)，思考 EO-Data 这类数据从哪里来；再看 [LeRobot](lerobot.md)，思考开源工具链如何承接训练和部署。

## 补充理解：为什么“交错”比“混合”更强

EO-1 里的 interleaved 不是简单混合数据。简单混合像把语文卷、数学卷和体育成绩放进同一个文件夹，模型知道这些东西都存在，但不一定知道它们之间的先后因果。交错数据更像一份带时间线的实验记录：先看到桌面，模型回答目标在哪里；再执行一个动作；动作后桌面变化，模型再判断任务是否完成。这个顺序让模型学到“动作会改变观察，观察又改变下一步计划”。如果训练数据没有这个顺序，模型可能会变成两套能力的拼装：问答时会说，控制时会动，但说和动之间没有真正闭环。EO-1 的重要启发是，未来机器人数据集不应只存帧和动作，还应存中间解释、状态判断、失败原因和下一步计划。

这也解释了为什么普通 instruction tuning 不一定帮机器人。很多指令数据只教模型如何回答人类问题，却没有告诉它回答之后世界会如何变化。机器人学习需要的是“回答和动作共同改变状态”的监督。换句话说，EO-1 要训练的不是聊天助手，而是能把语言理解嵌入物理时间线的行动模型。

如果未来要做小规模复刻，可以先不追求 1.5M 样本，而是把少量高质量 episode 做成“观察、解释、动作、再观察”的结构。数据少时，结构正确比数量堆叠更重要；否则模型只会学到零散技能，难以形成闭环推理。

这也是 EO-1 对小团队最实际的启发：先把记录格式设计对，再考虑扩大数据量。

结构化日志会决定模型能学到什么。

```text
非交错混合：                 交错记录：
┌──────┐ ┌──────┐            ┌──────┐
│ 图文 │ │ 动作 │            │ 观察 │
└──────┘ └──────┘            └──┬───┘
彼此并排，关系弱                 ▼
                              ┌──────┐
                              │ 推理 │
                              └──┬───┘
                                 ▼
                              ┌──────┐
                              │ 动作 │
                              └──┬───┘
                                 ▼
                              新观察
```

*所以这一节是想说：EO-1 的关键不是数据种类多，而是把多模态数据按交互因果顺序排起来。*

## 如果你想再深入

1. 对照论文 Table 6，区分 multimodal data、robot data 和 interleaved data 的规模。
2. 看 Table 2，理解 EO-Bench 的四类具身推理指标。
3. 看 Table 3 / 4，把 LIBERO 和 SimplerEnv 结果与 OpenVLA、π0、GR00T 对齐比较。
4. 对比 “EO-1 base / fast / interleaved”，理解架构和数据分别贡献什么。
5. 真要工程落地，先考虑如何记录动作前后的视觉状态和任务解释，而不是只存动作轨迹。

## 原文信息

- 标题：EO-1: Interleaved Vision-Text-Action Pretraining for General Robot Control
- arXiv：<https://arxiv.org/abs/2508.21112>
- 相关资产：EO-Robotics、EO-Data1.5M、EO-Bench。
- 公开状态：论文称 fully open-sourced；本站未独立验证模型、代码和数据可获取性。

```bibtex
@misc{eo12025interleaved,
  title = {EO-1: Interleaved Vision-Text-Action Pretraining for General Robot Control},
  year = {2025},
  eprint = {2508.21112},
  archivePrefix = {arXiv},
  primaryClass = {cs.RO}
}
```

*所以整篇是想说：EO-1 把 VLA 推向“推理和行动交错训练”的阶段，说明未来具身基础模型的数据格式会和模型结构一样关键。*
