---
title: "Embodied Navigation Foundation Model"
slug: embodied-navigation-foundation-model
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2509.12129"
venue: arXiv
year: 2025
era: frontier
num: 182
generated_at: 2026-07-14
---

# NavFoM：把不同机器人和不同导航任务放进一个 Navigation Foundation Model

> 这是一份面向零基础读者的结构化研究笔记。本文只把公开论文文本和 arXiv 元数据能支持的结论写成事实；本站没有本地训练、仿真或真机复现实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

Embodied Navigation Foundation Model 提出 NavFoM，一个跨任务、跨本体的导航基础模型。论文报告模型训练在八百万导航样本上，覆盖 quadrupeds、drones、wheeled robots、vehicles，并跨 vision-and-language navigation、object searching、target tracking、autonomous driving 等任务。方法上，它用 Temporal-Viewpoint Indicator tokens 表示时间和摄像头视角，用 Budget-Aware Temporal Sampling 在 token budget 下控制历史观测长度。

如果只记一个直觉：NavFoM 想把“不同机器人怎么导航”统一成一个模型，而不是每种任务、每种身体都训练一套专门导航系统。

*所以这一节是想说：这篇论文把 VLA 泛化从操作扩展到导航。*

## 这是个什么场景

导航是 embodied AI 的基础能力。机器人要根据语言、目标、视觉和自身状态，在真实空间中移动。导航任务形式很多：跟随指令走到某处，寻找某个物体，追踪目标，自动驾驶，甚至无人机飞行。机器人身体也不同：四足、轮式、无人机、车辆、类人机器人。

传统导航模型往往按任务和本体分开设计。一个模型做 VLN-CE，一个做 ObjectNav，一个做 autonomous driving；一个模型假设前向单摄，一个模型假设多摄像头，一个模型只适配某个机器人。这会让导航研究碎片化。

```text
导航碎片化

任务不同：VLN / ObjectNav / Tracking / Driving
身体不同：四足 / 无人机 / 轮式 / 车辆
相机不同：单视角 / 多视角 / 不同安装角
        │
        ▼
NavFoM 目标：一个跨任务、跨本体的导航基础模型
```

```text
NavFoM 输入输出

多视角视频 / 图像 + 语言指令
        │
        ▼
TVI tokens + token sampling + LLM
        │
        ▼
预测导航轨迹 / action token
```

这和操作型 VLA 有相似处：都是从视觉语言到动作。但导航更强调长时间历史、相机视角、轨迹尺度和身体运动差异。

*所以这一节是想说：NavFoM 关注的是“跨身体、跨任务移动”的统一导航能力。*

## 之前的人怎么做的，为什么不够好

论文指出，现有 embodied navigation 多被 narrow task settings 和 embodiment-specific architectures 限制。跨任务方法通常假设相同 camera configuration；跨本体方法则常被限制在特定导航任务里。

这导致一个问题：任务和本体之间缺少统一模型。机器人如果换身体、换相机、换导航任务，模型往往需要重新设计或 fine-tune。与 VLM 在开放视觉语言任务上的零样本泛化相比，embodied navigation 的泛化仍然较窄。

NavFoM 试图补这个缺口：它把不同任务、不同本体、不同相机配置组织到统一架构里，并通过大规模导航样本训练，让模型学习共享导航 priors。

*所以这一节是想说：旧导航模型太任务专用、太身体专用，难以形成基础模型。*

## 这篇论文的新想法

NavFoM 的新意主要有三点。

第一，数据和目标上追求 cross-task / cross-embodiment。论文摘要说训练在 eight million navigation samples 上，覆盖 quadrupeds、drones、wheeled robots、vehicles，任务覆盖 vision-and-language navigation、object searching、target tracking、autonomous driving。

第二，表示上引入 Temporal-Viewpoint Indicator tokens，也就是 TVI tokens。它们把时间信息和摄像头视角信息编码进 token，使模型知道某个 visual token 来自哪个时刻、哪个相机视角。

第三，部署上引入 Budget-Aware Temporal Sampling，简称 BATS。导航视频历史会产生大量视觉 token，直接全部输入会超出 LLM token budget，也会拖慢推理。BATS 用类似 forgetting curve 的采样策略，在预算内保留更有用的历史观测。

*所以这一节是想说：NavFoM 用数据规模、TVI token 和 BATS 同时处理泛化和部署成本。*

## 它分几步做的（方法）

### 第 1 步：统一导航任务形式

论文把导航看成给定多模态观测和语言指令，预测后续 trajectory 来完成任务。这个形式可以覆盖 VLN、ObjectNav、tracking、driving 等不同任务。

不同任务的输出尺度和动作定义会不同，但论文使用 action token / trajectory prediction 的方式把它们放进同一训练框架。

### 第 2 步：用 TVI tokens 表达时间和视角

多视角视频输入有两个难点：模型要知道 token 来自哪个 camera viewpoint，也要知道它属于哪个 timestep。普通视觉 token 自身不携带这些结构信息。

NavFoM 设计 TVI tokens，包含 base、time、angle 等组件。导航任务中会同时使用时间和视角信息；图像 QA、视频 QA、导航的 token organization 不同。

```text
TVI token 解决的问题

visual token 本身不知道：
  它来自哪个相机？
  它来自哪个时间？
  它是当前帧还是历史帧？

TVI token 把这些结构写进输入。
```

### 第 3 步：用 BATS 控制 token budget

导航过程中，视频帧会越来越多，尤其多相机设置下 token 数会爆炸。BATS 通过 budget-aware temporal sampling，在固定 token budget 下采样历史帧。论文提到它受 forgetting curve 启发，既保留近期重要观测，也给更早历史保留一定下界。

```text
BATS 直觉

最新帧：更重要，保留更多细节
历史帧：仍有用，但按预算压缩
多相机：token 更多，更需要采样
```

### 第 4 步：组织多任务训练数据

论文摘要说 eight million navigation samples，正文还提到 collected and processed 12.7 million instances 的更大处理口径。这里需要小心：不同位置可能对应不同统计范围或数据处理阶段。笔记只保留“论文报告”边界，不把两者强行合并。

数据覆盖 indoor navigation、OpenUAV、HM3D-OVON、autonomous driving 等多个方向，并包含 wheeled robots、UAVs、quadrupeds、cars 等本体。

### 第 5 步：在多 benchmark 和真实平台上评估

论文报告在 seven public benchmarks 上达到 state-of-the-art 或 highly competitive performance，并做 real-world experiments，平台包括 humanoid robots、quadrupeds、drones、wheeled robots。

*所以这一节是想说：NavFoM 的方法是“统一任务公式 + TVI 结构 token + BATS 预算采样 + 大规模跨本体训练”。*

## 关键数字

论文摘要报告 NavFoM trained on eight million navigation samples。正文还写到 collect and process 12.7 million instances，并列出多种数据来源和处理设置。两个数字需要保留上下文：8M 是摘要中的 navigation samples，12.7M 是正文数据处理中的 broader training instances 口径。

论文报告任务覆盖 quadrupeds、drones、wheeled robots、vehicles，任务包括 vision-and-language navigation、object searching、target tracking、autonomous driving。它在 seven public benchmarks 上达到 SOTA 或竞争性表现。

具体性能方面，论文报告 VLN-CE RxR 多摄像头设置 SR 从 56.3% 到 64.4%，单摄像头设置从 51.8% 到 57.4%；HM3D-OVON zero-shot setting 达到 45.2% SR，超过 previous fine-tuned SOTA 43.6% SR。BATS 相关设置里，文本提到 token budget 例子如 B=1600、四摄像头下 Btoken=2048 可支持很长历史 T。

这些数字全部是论文报告，不是本站复现实验。

*所以这一节是想说：NavFoM 的核心证据是跨任务、跨本体、大规模数据和多 benchmark 泛化。*

## 实验结果说明了什么

实验说明一个方向：navigation foundation model 可以不只为单一任务或单一机器人服务。NavFoM 在多任务、多本体、多相机配置下评估，说明作者在挑战导航模型的碎片化范式。

VLN-CE RxR 和 HM3D-OVON 的数字说明，统一模型在一些公开 benchmark 上可以达到或超过专门方法。尤其 HM3D-OVON 的 zero-shot 结果，强调了“不做任务专门 fine-tuning”的泛化意义。

BATS 和 TVI token 的实验则说明，导航模型不是简单把视频全塞进 LLM。时间、视角和 token budget 是导航任务独有的结构约束。模型既要记住历史，又不能被历史 token 淹没。

但也要看到边界。导航 benchmark 的成功不等于所有真实世界导航都可靠；真实机器人还会遇到动态障碍、人类社交规范、传感器失效、地图误差和安全要求。

*所以这一节是想说：NavFoM 推动了统一导航模型，但真实部署仍要单独验证。*

## 术语表

- NavFoM：Navigation Foundation Model，本文提出的导航基础模型。
- Cross-task：跨不同导航任务。
- Cross-embodiment：跨不同机器人身体。
- TVI tokens：Temporal-Viewpoint Indicator tokens，表示时间和视角。
- BATS：Budget-Aware Temporal Sampling，在 token budget 下采样历史视觉 token。
- VLN-CE：Vision-and-Language Navigation in Continuous Environments。
- ObjectNav：对象目标导航。
- HM3D-OVON：开放词汇对象导航 benchmark。
- Action token：用于表示轨迹或动作的 token。

*所以这一节是想说：NavFoM 的关键词都围绕“统一导航输入结构”。*

## 局限和边界

第一，NavFoM 仍然是论文报告的模型和实验，不是本站运行过的导航系统。

第二，数据规模口径需要小心。摘要 8M navigation samples 和正文 12.7M instances 可能对应不同处理范围，不能混写。

第三，导航成功率受 benchmark、传感器、控制器和真实环境强烈影响。公开 benchmark SOTA 不等于真实部署安全。

第四，跨本体训练不等于所有身体都无缝泛化。机器人动力学、传感器布局、执行延迟、控制接口都可能成为新瓶颈。

*所以这一节是想说：NavFoM 是导航基础模型的重要尝试，但不是万能导航大脑。*

## 和其他论文的关系

和 embodied-agi-road-ahead 相比，NavFoM 可看作 L3 部分能力的具体尝试：跨任务、跨本体、一定实时约束下的导航泛化。

和 mobile-service-robot-foundation-survey 相比，NavFoM 是移动服务机器人需要的核心能力之一。服务机器人要在家庭和医院服务，导航 foundation model 是底座之一。

和 RoboNeuron 相比，NavFoM 是模型，RoboNeuron 是中间层。一个负责怎么导航，一个负责怎么接入 ROS2 和 agent tools。

和 VLA 操作论文相比，NavFoM 把“视觉语言动作”从机械臂操作拓展到空间移动。动作不再只是夹爪或末端轨迹，而是跨空间的导航路径。

*所以这一节是想说：NavFoM 把 Batch 5 的应用和系统主题落到导航基础能力上。*

## 和本导读的关系

本站前面很多 VLA 笔记关注 manipulation。NavFoM 提醒我们，具身智能不仅要动手，还要会移动、找目标、跟踪目标、理解路径和相机视角。

它适合放在“导航和移动本体”章节，也可以和服务机器人综述一起读：服务机器人在真实环境中服务人，首先要稳定导航。

*所以这一节是想说：它补齐本站从操作到导航的一条关键分支。*

## 思考题

1. 为什么跨任务导航和跨本体导航不能只靠一个固定相机设置？
2. TVI tokens 解决了哪些普通 visual tokens 缺失的信息？
3. BATS 为什么比保留全部历史帧更适合真实部署？
4. 为什么 zero-shot ObjectNav 结果不能直接等同真实家庭导航安全？

## FAQ

**Q：NavFoM 是不是一个 VLA？**  
A：它是导航基础模型，使用视觉、语言和动作/轨迹预测，和 VLA 思路高度相关，但专门面向 navigation。

**Q：8M 和 12.7M 哪个是正确数据量？**  
A：两者都来自论文不同位置。笔记保留上下文：摘要说 8M navigation samples，正文提到 12.7M processed instances。

**Q：TVI token 是不是位置编码？**  
A：它类似结构标识，专门表达时间和摄像头视角，比普通序列位置更贴近导航输入。

**Q：本站有没有跑真实机器人导航？**  
A：没有。这里只记录论文报告，不把成功率写成本站实验。

## 进一步读什么

- Uni-Navid / NaVid：理解 generalist navigation 的前序工作。
- VLN-CE / RxR / HM3D-OVON：理解论文评估 benchmark。
- mobile service robot survey：理解导航在服务机器人中的位置。
- RoboNeuron：理解导航模型如何进入 ROS2/agent 系统。

## 精读补充：为什么导航基础模型不能只靠更长视频上下文

读 NavFoM 时，最容易产生的误解是：既然导航需要历史，那是不是把更多视频帧喂给大模型就行。论文的 TVI tokens 和 BATS 恰好说明事情没有这么简单。导航历史不是普通视频摘要，它同时包含“什么时候看到”“从哪个视角看到”“机器人当时处在什么运动状态”“这个信息现在还是否有用”。如果只把历史帧按时间顺序堆起来，模型可能知道画面内容，却不知道这些内容和当前行动的空间关系。

TVI tokens 的价值就在这里。多摄像头机器人不是一个“更宽的视频”，而是多个安装角度不同、视野重叠程度不同、时间同步程度不同的传感器集合。前视相机看到门，侧视相机看到墙，后视相机看到刚走过的走廊；这些画面都可能有用，但意义完全不同。TVI tokens 把时间和 viewpoint 作为结构信息交给模型，相当于告诉模型：这个 token 不是孤立图片 patch，而是某个时刻、某个方向的观测。

BATS 则解决另一个问题：真实导航不能无限记忆。机器人走得越久，历史帧越多；多摄像头越多，token 增长越快。保留全部历史会拖慢推理、挤占上下文窗口，也可能让模型被过时信息干扰。比如十分钟前看到的椅子，对当前转弯可能已经没用；但五秒前看到的门把手，可能决定下一步是否应该靠近。BATS 的直觉是：近期信息通常更密，远期信息也保留一些锚点，但必须服从 token budget。

这里要把“更大数据”和“更好结构”分开理解。论文报告的 eight million navigation samples 说明作者在数据规模上做了统一训练；正文里的 12.7 million processed instances 说明数据处理口径更大。但如果没有 TVI 和 BATS 这种结构设计，大规模数据也可能学到的是混乱输入分布：不同任务、不同本体、不同相机设置被硬塞到一起，模型未必知道哪些差异重要。

Cross-embodiment 也不是一句口号。四足机器人、无人机、轮式机器人和车辆的动作空间、视角高度、运动惯性、安全约束都不同。一个四足机器人可以原地转身，无人机可以改变高度，车辆受道路和转弯半径约束。NavFoM 把这些任务放入统一模型，真正挑战的是“哪些导航知识是共享的，哪些必须保留本体差异”。这也是它比单一 VLN 或 ObjectNav 模型更有研究价值的地方。

不过，统一模型不等于统一控制器。导航 foundation model 可以输出轨迹或 action token，但真实机器人还需要底层控制、避障、安全停止、定位、地图或局部感知模块配合。尤其在家庭、医院、校园这类开放环境里，动态行人、透明玻璃、狭窄通道、突发障碍都可能让 benchmark 成功率失效。论文的 real-world experiments 提供了重要信号，但仍不能替代具体部署场景的安全验证。

对本站读者来说，NavFoM 最重要的启发是：具身智能的 foundation model 不只发生在机械臂操作里。移动本体同样需要基础模型，而且它的核心难题是时间、空间、视角和身体差异。读完这篇后，再看服务机器人或 Embodied AGI 路线图，就能更清楚地问：机器人是不是只会局部动作，还是能在空间中长期、稳定、可解释地行动？

*所以这一节是想说：NavFoM 的关键不只是更多导航数据，而是把时间、视角、预算和本体差异结构化。*

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：8M navigation samples、12.7M instances、四类本体、四类任务、TVI token 组成、BATS token budget 逻辑、VLN-CE RxR 56.3→64.4 / 51.8→57.4、HM3D-OVON 45.2 vs 43.6 是否均来自原文对应段落和表格。

## 原文信息

- arXiv: [2509.12129](https://arxiv.org/abs/2509.12129)
- PDF: [https://arxiv.org/pdf/2509.12129](https://arxiv.org/pdf/2509.12129)
- Project: [https://pku-epic.github.io/NavFoM-Web/](https://pku-epic.github.io/NavFoM-Web/)

```bibtex
@article{zhang2025navfom,
  title = {Embodied Navigation Foundation Model},
  author = {Zhang, Jiazhao and Li, Anqi and Qi, Yunpeng and Li, Minghan and Liu, Jiahang and Wang, Shaoan and Liu, Haoran and Zhou, Gengze and Wu, Yuze and Li, Xingxing and Fan, Yuxin and Li, Wenjun and Chen, Zhibo and Gao, Fei and Wu, Qi and Zhang, Zhizheng and Wang, He},
  journal = {arXiv preprint arXiv:2509.12129},
  year = {2025}
}
```
