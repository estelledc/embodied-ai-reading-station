# 本科生科研任务清单

> 来源：`~/Downloads/Undergraduate research task.pdf`（导师 / 学长下发）
> 整理日期：2026-05-30

---

## Task 1：论文精读 + 汇报

### 任务要求
- 把推荐论文都过一遍，挑 **1 篇** 自己最感兴趣的精读
- 精读完后做 PPT，把论文逻辑串联清楚即可
- PPT 不要求华丽，要求：
  - 把论文的 **研究背景 / 研究动机 / 所提方法 / 主要实验结果** 按逻辑串联
  - 篇幅 **10–15 页**
  - **全英文** 展示
- **截止日期：2026 年 6 月 30 日**（原任务书写"6 月 31 日"，系笔误；已按月末 6/30 理解执行，LLaVA deck 已于 6 月完成）

### 推荐论文清单（按主题分组）

#### 一、视觉-语言基座（VLM Foundation）
> 具身智能首先要把视觉特征对齐到语言大模型的语义空间。

- **[2304.08485] Visual Instruction Tuning（LLaVA）**
  构建了把视觉编码器特征投影到 LLM 文本空间的标准微调范式。利用 GPT-4 生成多模态指令数据进行训练，是目前开源 VLA 模型最常用的视觉感知基座。

- **3DShape2VecSet: A 3D Shape Representation for Neural Fields and Generative Diffusion Models**
  把 3D 形状表示为潜在向量集（VecSet），让复杂 3D 几何能适配生成式扩散模型。解决传统 3D 数据格式在计算开销和拓扑表达上的瓶颈，为机器人理解 3D 环境提供高效几何表征基础。

#### 二、高层任务规划（High-Level Planning & Grounding）
> 解决 LLM 纯文本输出与真实物理环境可执行性之间的断层。

- **[2204.01691] Do As I Can, Not As I Say: Grounding Language in Robotic Affordances（SayCan）**
  把机器人任务规划建模为联合概率优化：LLM 评估高层指令的语义连贯性 + 强化学习训练的 Value Function 评估底层动作的物理可执行性（Affordance）。

#### 三、端到端 VLA 模型（End-to-End VLA）
> 把高层规划和低层控制合并，单一网络从多模态输入端到端输出控制指令。

- **[2406.09246] OpenVLA: An Open-Source Vision-Language-Action Model**
  基于 Llama-3 和 SigLIP 的 7B 参数开源模型。提供完整的 VLA 预训练 + LoRA 跨具身（Cross-embodiment）微调 + 推理部署流水线。

#### 四、多模态交互与数据生态（Multimodal Ecology）
> 探索文本之外的交互模态，解决物理机器人训练的数据规模瓶颈。

- **VLAS: Vision-Language-Action Model With Speech Instructions For Customized Robot Manipulation**
  扩展 VLA 输入模态，把声学特征（不是语音转文本）直接与视觉、动作表征对齐和联合训练。

- **MLA: A Multisensory Language-Action Model for Multimodal Understanding and Forecasting in Robotic Manipulation**
  突破传统 VLA 只用 2D 视觉的局限，融合 2D 图像 + 3D 点云 + 触觉（Tactile）信号。提出无编码器（Encoder-free）的多模态对齐机制，直接复用 LLM 作为感知模块整合多源传感器数据，能预测未来的多感官状态。

#### 五、视频生成与世界模型策略（Video Generation & World Model Policy）
> 跳出"动作映射为文本 Token"的 VLA 思路，直接利用视频大模型的物理时空推演能力，把机器人控制重构为"视频预测"问题。

- **[2601.16163] Cosmos Policy: Fine-Tuning Video Models for Visuomotor Control and Planning**
  NVIDIA 的标志性工作。直接把预训练视频生成大模型（Cosmos-Predict2）微调为具身策略。核心机制是 **隐帧注入（Latent Frame Injection）**：把动作、本体状态、未来预期价值（Value）都编码为隐空间帧，无缝嵌入视频扩散过程。既能作为直接策略输出控制，又能在测试阶段做多轨迹预演规划（Test-time Planning）。

#### 六、射频感知与空间建图（RF Perception & Spatial Mapping）
> 跳出纯视觉/激光雷达局限，利用 4D 雷达等射频信号做高鲁棒性 3D 空间建图。

- **RF-Based 3D SLAM Rivaling Vision Approaches**
  基于射频信号的 SLAM 系统，毫米波雷达实现媲美视觉基准方案的厘米级 3D 建图。引入免训练的"不确定性量化（Uncertainty Quantification）"方法。

- **mmCLIP: Boosting mmWave-based Zero-shot HAR via Signal-Text Alignment**
  把 VLM 思想引入射频领域，毫米波雷达信号与自然语言文本空间对齐的对比学习框架，实现零样本人体行为识别（HAR）。

- **Non-Line-of-Sight 3D Object Reconstruction via mmWave Surface Normal Estimation**
  突破视线遮挡（NLOS）场景，毫米波信号穿透反射特性 + 物理模型估算表面法向量（Surface Normal），实现遮挡目标的高保真 3D 几何重建。

#### 七、听觉智能与声学空间交互（Auditory Intelligence & Acoustic Spatial Interaction）

- **[2511.11473] Proactive Hearing Assistants that Isolate Egocentric Conversations**
  可穿戴助听设备的主动式听觉助手，无需用户显式指定目标说话人，自动识别并分离当前交谈对象的声音。利用自我中心双耳音频（Egocentric Binaural Audio）+ 对话轮换（Turn-taking）+ 交互动态。

- **NeuralAids: Wireless Hearables With Programmable Speech AI Accelerators**
  无线助听耳机端侧实时语音 AI 系统。可编程语音 AI 加速器 + 低延迟语音增强网络 + 软硬件协同混合精度量化。证明复杂语音 AI 可以脱离云端/手机侧，直接跑在低功耗可穿戴设备上。

- **Creating speech zones with self-distributing acoustic swarms**
  多个微型无线麦克风机器人组成自分布声学群体。无需外部摄像头/基础设施，通过声学完成厘米级协同定位，形成自组织无线麦克风阵列。结合注意力机制神经网络对 2D 空间中多个并发说话人定位与分离，构建"语音区域（Speech Zones）"。

---

## Task 2：代码任务

### 基础：Robotics manipulation

**项目需求**：复现一份 robotics manipulation，涉及：
- VLM（视觉-语言模型）
- 基本的 robotics manipulation 算法
- 主流机器人仿真环境 **mujoco**

**项目工程**：https://github.com/hangtingLiu/VLM_Grasp_Interactive

### 进阶：VLA for Robotics manipulation

**项目需求**：基于上面已经跑通的 mujoco 仿真环境：
1. 采集数据
2. 微调简单的 VLA 模型
3. 把微调后的 VLA 部署到仿真环境实现物体抓取

**项目教程**：
- LeRobot — Hugging Face 文档
- **SmolVLA**：在 LeRobot 社区数据上训练的高效视觉-语言-动作模型（Hugging Face 文档）

**截止时间**：不固定，按大家考试时间综合定。

---

## 一句话定位

这是一个 **具身智能（Embodied AI）方向** 的科研入门任务：
- Task 1 是 **读论文 + 英文汇报**，覆盖从 VLM 基座 → 任务规划 → 端到端 VLA → 多模态/世界模型/射频/听觉的 7 大主题
- Task 2 是 **动手复现 + 微调 VLA**，从 mujoco 仿真里跑通一个能听指令抓东西的机器人
