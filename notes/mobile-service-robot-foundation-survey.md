---
title: "Embodied AI with Foundation Models for Mobile Service Robots: A Systematic Review"
slug: mobile-service-robot-foundation-survey
topic: vla
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2505.20503"
venue: arXiv
year: 2025
era: frontier
num: 179
generated_at: 2026-07-14
---

# 移动服务机器人综述：Foundation Models 如何走进家庭、医院和服务场景

> 这是一份面向零基础读者的结构化研究笔记。本文只把公开论文文本和 arXiv 元数据能支持的结论写成事实；本站没有本地训练、仿真或真机复现实验，因此不会把论文中的领域判断写成本站 E4 结果。

## 一句话讲什么（TL;DR）

这篇系统综述讨论 foundation models 如何用于 mobile service robots。它把移动服务机器人面临的核心挑战归纳为四类：把自然语言指令翻译成可执行动作、多模态感知、不确定性估计、板载计算约束。论文再分析 LLM、VLM、MLLM 和 VLA 如何分别帮助这些挑战，并把应用场景放到 domestic assistance、healthcare、service automation 里讨论。

如果只记一个直觉：移动服务机器人不像实验台机械臂只在固定桌面抓东西，它要在有人、有噪声、有隐私、有实时限制的环境中服务人，所以 foundation model 的价值和风险都会被放大。

*所以这一节是想说：这篇综述把 Embodied AI 从“模型能力”拉回到“人类环境里的服务机器人”。*

## 这是个什么场景

移动服务机器人是会在真实空间中移动、观察、理解指令并提供服务的机器人。它可能在家里帮老人取药，在医院引导患者，在办公室递送物品，也可能在仓库或公共空间做服务自动化。和单纯聊天系统不同，它要处理真实传感器、真实路径、真实人类互动和真实安全边界。

论文关注 foundation models，包括 LLM、VLM、MLLM、VLA。它们能让机器人更好理解语言、视觉和场景，但机器人不是云端网页应用。移动服务机器人通常有板载算力限制、网络不稳定、隐私敏感场景、动态人群和长时间运行要求。

```text
移动服务机器人场景

家庭 / 医院 / 公共服务空间
        │
        ▼
语言指令 + 多模态传感器 + 人机交互约束
        │
        ▼
Foundation Models 帮助理解、推理、规划和执行
        │
        ▼
但必须满足实时、安全、隐私、资源约束
```

```text
四个核心挑战

1. 语言 -> 可执行机器人动作
2. 多模态感知
3. 不确定性估计
4. 实时板载计算
```

这类场景的难点是“服务”二字。服务机器人面对的是非专家用户，用户会说模糊、口语化、不完整的指令；环境也不是干净 benchmark，而是光照变化、遮挡、背景噪声、人突然走动、物品摆放变化的空间。

*所以这一节是想说：移动服务机器人是 foundation models 真正落地时最容易暴露复杂约束的场景之一。*

## 之前的人怎么做的，为什么不够好

传统移动机器人常靠规则、SLAM、路径规划、目标检测和任务状态机来工作。这些方法在结构化环境中可靠，但遇到自然语言模糊指令、开放物体类别、动态社交互动和长程服务任务时，扩展成本很高。

Foundation models 带来了新可能。LLM 可以解析指令，VLM 可以理解视觉语义，MLLM 可以融合多模态输入，VLA 可以把感知语言直接连接到动作。但论文指出，把这些模型直接放进移动服务机器人并不够。它们可能缺少物理约束意识，可能过度自信，可能算不动，也可能在家庭和医院这类隐私场景中产生数据治理问题。

综述的价值在于不把 foundation model 当成万能答案，而是问它能缓解哪些 challenge，又会引入哪些新的部署和伦理问题。

*所以这一节是想说：旧机器人系统不够灵活，大模型系统也不能直接裸奔进真实服务场景。*

## 这篇论文的新想法

论文声称自己是 first systematic review focused specifically on the integration of foundation models in mobile service robotics。它不是泛泛讲机器人 foundation model，而是把 mobile service robot 作为专门对象，分析家庭、医疗和服务自动化中需要什么能力。

它提出一个统一视角：foundation models 可以贯穿 perception、reasoning、planning、control，但每个环节都要面对移动服务机器人的实际限制。比如语言到动作不只是把句子转成计划，还要处理 ambiguity、physical feasibility、long-horizon continuity。多模态感知不只是图像识别，还要处理空间分辨率、采样频率、传感器噪声和跨模态对齐。

这篇综述还把技术挑战和社会挑战放在一起。家庭和医院环境要求隐私、可解释、可请求澄清、可在人类不确定状态下保守行动。它强调 human-in-the-loop governance，不把安全完全交给模型自发判断。

*所以这一节是想说：本文的新意是按移动服务机器人部署约束重组 foundation model 研究。*

## 它分几步做的（方法）

### 第 1 步：定义 mobile service robot 的四类挑战

论文先从移动服务机器人实际任务出发，列出四个 challenge。第一是 Translation of Natural Language Instructions into Executable Robot Actions。机器人要把“帮我把那个拿过来”这类模糊指令转成目标识别、导航、抓取和递交。

第二是 Multi-modal Perception。服务机器人会接收 RGB、depth、IMU、语音、触觉或其他传感器数据，这些数据采样频率、空间分辨率、噪声模式不同。第三是不确定性估计，机器人必须知道自己何时不确定，并能请求澄清或保守行动。第四是 computational capabilities，板载设备很难实时运行大模型。

### 第 2 步：分析 foundation models 如何对应挑战

Foundation models 可以用共享语义空间缓解语言和视觉对齐问题，用 language-conditioned policies 支持指令跟随，用 multimodal sensor fusion 提升场景理解，用 uncertainty-aware reasoning 改善安全决策，用 efficient model scaling 缓解部署成本。

但每个机会都有边界。LLM 可能产生不可执行计划，VLM 可能在真实动态场景中失效，MLLM 多模态推理可能延迟太高，VLA 可能需要大量机器人数据和强算力。

### 第 3 步：把应用场景分到服务领域

论文重点讨论 domestic assistance、healthcare、service automation。家庭场景强调个性化、隐私和长期适应；医疗场景强调安全、可靠和人机协作；服务自动化强调效率、可扩展和复杂环境。

```text
应用场景 -> 主要约束

家庭辅助     -> 隐私、个性化、长期适应
医疗护理     -> 安全、可靠、澄清、审计
服务自动化   -> 效率、调度、动态人群
```

### 第 4 步：讨论未来研究方向

论文未来方向包括 reliability and lifelong adaptation、privacy-aware and resource-constrained deployment、governance and human-in-the-loop frameworks。这说明作者不只关注模型分数，而是关注机器人在真实人类空间中的长期可信运行。

```text
未来闭环

可靠性 -> 长期适应 -> 隐私保护 -> 资源约束 -> 人类监督
   ▲                                             │
   └────────────── 部署反馈与治理 ───────────────┘
```

*所以这一节是想说：论文方法是用“挑战-模型能力-应用场景-治理方向”来组织移动服务机器人。*

## 关键数字

这篇是 systematic review，不是单一模型 benchmark，所以关键数字主要是分类和范围。论文页数为 46 页，围绕 foundation models in mobile service robotics 展开；它明确列出 4 个核心 challenge，并把应用讨论聚焦 domestic assistance、healthcare、service automation 三类场景。

论文还提到用 OpenAlex 做 publication analysis，查询和过滤与 mobile service robots integrating language, perception, planning, and control 相关工作，并按挑战分组。这说明它不只是主观列举，而试图用文献分布观察研究努力集中在哪里。

这些数字不要被误读成本站复现结果。它们是综述的结构证据，用来说明作者如何组织领域。

*所以这一节是想说：本文的数字服务于系统综述框架，不是机器人实验成功率。*

## 实验结果说明了什么

综述没有提出新机器人系统，因此“实验结果”应理解为文献分析和结构化对比。它说明一个核心事实：移动服务机器人不是只缺一个更强模型，而是同时缺自然语言 grounding、多模态感知、不确定性估计和实时部署能力。

读这篇时要特别注意不确定性。服务机器人如果过度自信，在医院或家庭里会很危险。比如在视觉变差、语音不清或路径受阻时，机器人需要表达不确定、请求澄清或选择保守策略，而不是继续执行看似合理但实际危险的动作。

另一个重要结果是计算约束。很多 foundation model 的能力来自大模型，但移动服务机器人不能总依赖云端：医院和家庭有隐私要求，网络也可能不稳定。边缘部署、模型压缩和资源调度因此不是工程细节，而是能不能服务人的前提。

*所以这一节是想说：综述结果提醒我们，服务机器人落地要同时过语言、感知、不确定性和算力四道门。*

## 术语表

- Mobile Service Robot：在真实人类环境中移动并提供服务的机器人。
- Foundation Model：在大规模数据上训练、可迁移到多个任务的基础模型。
- LLM：大语言模型，主要处理语言和推理。
- VLM：视觉语言模型，处理图像和文本。
- MLLM：多模态大模型，融合更多模态输入。
- VLA：视觉-语言-动作模型，把观察和指令映射到动作。
- HRI：Human-Robot Interaction，人机交互。
- Uncertainty Estimation：估计模型或环境中的不确定性。
- Human-in-the-loop：让人类参与监督、纠错和治理。

*所以这一节是想说：移动服务机器人把 foundation model 术语带进了人机共处场景。*

## 局限和边界

第一，这是综述，不是统一实验。它引用和组织现有工作，不能被当成作者复现了所有服务机器人系统。

第二，移动服务机器人场景很宽。家庭、医院和服务自动化的风险不同，不能把一个场景的结论直接套到另一个场景。

第三，foundation models 的快速发展会让综述具有时间边界。2026 年之后新的 VLA、MLLM、边缘推理方法可能改变部分判断。

第四，论文讨论安全、伦理和治理，但真正部署还需要法规、组织流程、用户研究和长期现场测试。

*所以这一节是想说：这篇综述是地图，不是服务机器人上线许可证。*

## 和其他论文的关系

和 efficient-vla-survey 相比，本文更关注移动服务机器人应用场景，而不是只按模型、训练、数据效率分类。

和 vla-manipulation-survey 相比，本文更强调 mobile service robots 的移动、人机交互和家庭/医院/服务空间，而不是只聚焦操作任务。

和 embodied-agi-road-ahead 相比，本文更落地。Embodied AGI 讲 L1-L5 路线图，本文讲现实服务机器人今天遇到的四类门槛。

和 RoboNeuron 相比，本文提供问题地图，RoboNeuron 提供中间层工程方案。服务机器人要落地，既需要这种综述里的约束分析，也需要 RoboNeuron 这类接口和中间件。

*所以这一节是想说：Batch 5 从“VLA 论文库”扩展到“真实服务机器人系统”。*

## 和本导读的关系

本站导读里很多论文关心模型能力，例如统一 VLA、推理效率、跨本体泛化。这篇综述提醒我们：模型能力最终要面对真实服务场景的四个约束。

它适合放在“应用和部署”章节，作为从研究论文走向真实移动机器人的过渡页。读者读完它后，再看导航、ROS 中间件、边缘部署和安全治理，会更容易理解为什么这些问题重要。

*所以这一节是想说：它把本站的模型主线连接到家庭、医院和服务自动化场景。*

## 思考题

1. 为什么移动服务机器人比固定机械臂更强调 HRI 和不确定性？
2. 语言指令到可执行动作中，最容易出错的环节是什么？
3. 为什么家庭和医院场景不能完全依赖云端大模型？
4. 如果机器人不确定，它应该继续执行、停下、还是请求澄清？为什么？

## FAQ

**Q：这篇综述是不是证明 foundation models 已经能可靠服务老人和病人？**  
A：不是。它总结机会和挑战，不是宣称已有系统可无条件上线。

**Q：为什么移动服务机器人要单独综述？**  
A：因为移动服务机器人比普通机器人多了人机共处、移动导航、长期服务、隐私和边缘计算等约束。

**Q：VLA 在这里是不是唯一方案？**  
A：不是。论文同时讨论 LLM、VLM、MLLM、VLA。VLA 是其中一类连接动作的方案。

**Q：本站有没有复现这些服务机器人系统？**  
A：没有。这里只记录论文报告和综述结构，不写成本站实验结果。

## 进一步读什么

- `embodied-agi-road-ahead`：理解更宏观的 Embodied AGI 分级。
- `roboneuron`：理解如何把 agent/tool 接口接到 ROS 中间层。
- `embodied-navigation-foundation-model`：理解移动场景中 navigation foundation model 的具体例子。
- `efficient-vla-survey`：理解边缘部署和效率约束。

## 精读补充：为什么服务机器人比“会走会说”更难

读这篇综述时，一个很重要的直觉是：移动服务机器人并不是“导航机器人 + 聊天机器人”的简单相加。它要在人的空间里做服务，人的空间有很多机器不喜欢的东西：家具会移动，人会临时改变主意，老人或病人可能说不完整指令，背景里可能有电视声、访客、宠物、反光、遮挡和隐私物品。模型如果只在干净数据集上表现好，到了这种环境里就会暴露短板。

自然语言到动作的转换也不是翻译句子。用户说“把那个拿过来”时，机器人要先知道“那个”指什么，再判断物体是否可抓、路径是否安全、自己是否有权限进入某个房间、拿到后应该递给谁。这个链条里任何一步不确定，都可能影响最终动作。Foundation model 能帮助语义理解，但如果它不知道机器人本体限制，就可能生成看似合理但不可执行的计划。

多模态感知同样不能只理解为“多接几个传感器”。不同传感器有不同延迟和噪声，RGB 图像可能被遮挡，深度图可能缺失，语音可能被噪声污染，IMU 和轮速计可能漂移。早期融合、后期融合和中间融合各有代价；如果不确定性不能沿着感知链条传播，机器人可能会把错误感知当成确定事实。

论文强调不确定性估计，是因为服务机器人最怕“自信地错”。在人机交互中，一个好机器人有时不应该立刻执行，而应该停下来问：“你是指桌上的蓝杯吗？”这种行为看起来不酷，但对家庭和医疗场景很关键。过度追求流畅自动化，反而可能降低安全和信任。

计算约束也不只是省钱问题。医院和家庭场景可能不能把所有视频和语音传到云端，既有隐私原因，也有网络稳定原因。板载模型太大就会延迟高、耗电大、发热高，影响实时控制和长期运行。因此，privacy-aware 和 resource-constrained deployment 在这篇综述里是同一个落地问题的两面。

如果把这篇综述转成检查清单，服务机器人论文至少要回答五个问题：用户指令如何落到动作？多模态感知如何对齐？不确定时如何表达和恢复？模型在哪里运行、延迟多少？人类如何介入和审计？只有这些问题都有边界，foundation model 才真正进入服务机器人，而不是停留在 demo。

*所以这一节是想说：服务机器人难在模型、身体、人和场景同时变化，任何单点强模型都不够。*

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：四个 challenge 的原文表述，domestic assistance / healthcare / service automation 三类应用，OpenAlex 文献分析是否按论文描述呈现，future directions 是否包含 reliability and lifelong adaptation、privacy-aware and resource-constrained deployment、governance and human-in-the-loop frameworks。

## 原文信息

- arXiv: [2505.20503](https://arxiv.org/abs/2505.20503)
- PDF: [https://arxiv.org/pdf/2505.20503](https://arxiv.org/pdf/2505.20503)

```bibtex
@article{lisondra2025mobilefoundationrobots,
  title = {Embodied AI with Foundation Models for Mobile Service Robots: A Systematic Review},
  author = {Lisondra, Matthew and Benhabib, Beno and Nejat, Goldie},
  journal = {arXiv preprint arXiv:2505.20503},
  year = {2025}
}
```
