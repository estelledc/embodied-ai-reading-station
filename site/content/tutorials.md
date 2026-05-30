---
title: 实战教程 / 跑得起来的代码
order: 4
intro: '跑得起来的代码 — 按 今晚 / 周末 / 一周 分级的实战清单'
---

读累了想动手？这里是按时间投入排序的实战清单。

每个资源都标了：**中英文 / 时长 / 难度 / 是否需要 GPU / 一句话定位**。读者画像是编程零基础但能照着教程一行一行跑——所以「今晚就能跑」那一栏的东西，开了 Colab 浏览器就行，不用配环境。

---

## 今晚就能跑（< 2h，浏览器打开就跑）

### 1. OpenAI CLIP 官方 Colab：Interacting with CLIP

- **平台**：Google Colab（OpenAI 官方）
- **URL**：https://colab.research.google.com/github/openai/clip/blob/master/notebooks/Interacting_with_CLIP.ipynb
- **语言**：英文（代码注释为主，能跟着跑）
- **时长**：30 分钟
- **难度**：入门
- **GPU**：Colab 免费 T4 够
- **定位**：**第一次跑多模态模型的最低门槛**。把图片和文字 encode 成向量、做 zero-shot 分类。读完 [mmCLIP 笔记](../notes/mmclip.md) 立刻跑这个，体感最强。

### 2. OpenAI CLIP Prompt Engineering for ImageNet

- **平台**：Google Colab（OpenAI 官方）
- **URL**：https://colab.research.google.com/github/openai/CLIP/blob/master/notebooks/Prompt_Engineering_for_ImageNet.ipynb
- **语言**：英文
- **时长**：1 小时
- **难度**：入门
- **GPU**：Colab T4
- **定位**：上一个跑通了再来。看「prompt 怎么写能让 zero-shot 分类涨点」——后面 VLA 论文里 ensemble prompt 的思想都从这来。

### 3. MuJoCo 官方 Python Tutorial

- **平台**：Google Colab（DeepMind 官方）
- **URL**：https://colab.research.google.com/github/google-deepmind/mujoco/blob/main/python/tutorial.ipynb
- **语言**：英文
- **时长**：1.5 小时
- **难度**：入门
- **GPU**：不需要（CPU 即可）
- **定位**：**Task 2 复现 `VLM_Grasp_Interactive` 之前必做**。教 MuJoCo XML 模型怎么定义、怎么 step 仿真、怎么渲染。跑完再看那个 grasp 项目的代码不会蒙。

### 4. SayCan 官方 Colab：SayCan-Robot-Pick-Place

- **平台**：Google Colab（Google Research 官方）
- **URL**：https://github.com/google-research/google-research/tree/master/saycan
- **语言**：英文
- **时长**：1 小时
- **难度**：入门到中级（涉及 PaLM API 调用，可能要换成本地 LLM）
- **GPU**：Colab T4 够
- **定位**：读完 [SayCan 笔记](../notes/saycan.md) 跑这个。看 LLM 怎么对每个机器人 skill 打分、怎么和 affordance 相乘选动作。

### 5. 3Blue1Brown：Neural Networks 系列

- **平台**：YouTube
- **URL**：https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi
- **语言**：英文（YouTube 自动中文字幕质量可用）
- **时长**：约 2 小时（7 集，每集 15-25 分钟）
- **难度**：入门
- **GPU**：不需要（看视频）
- **定位**：神经网络/反向传播/Transformer 的视觉化讲解。**任何具身智能教程开始前都该刷一遍**，尤其第 5-7 集 GPT 和 Attention。

### 6. 跟李沐学 AI · 动手学深度学习 PyTorch 版

- **平台**：B 站
- **URL**：https://www.bilibili.com/video/BV1if4y147hS/
- **语言**：中文
- **时长**：单集 1-2 小时（70+ 集，按需看）
- **难度**：入门到中级
- **GPU**：不需要（视频）；配套 Notebook 需要
- **定位**：**编程零基础学 PyTorch 的中文最佳路径**。建议先刷前 10 集打基础（线性回归 → 多层感知机 → 卷积），再去碰 VLA。配套书：https://zh.d2l.ai/

---

## 周末项目（半天到一天）

### 7. HuggingFace LeRobot 官方教程（Robot Learning: A Tutorial）

- **平台**：HuggingFace Space
- **URL**：https://huggingface.co/spaces/lerobot/robot-learning-tutorial
- **语言**：英文
- **时长**：4-6 小时
- **难度**：中级
- **GPU**：Colab T4 / 本地 8GB+ 即可
- **定位**：**Task 2 主线**。LeRobot 官方 hands-on 课程，教数据格式、teleoperation、训练扩散策略和 ACT。学完能直接读 SmolVLA 代码。

### 8. LeRobot 中文教程（飞书文档）

- **平台**：飞书 Wiki（社区翻译）
- **URL**：https://zihao-ai.feishu.cn/wiki/space/7589642043471924447
- **语言**：中文
- **时长**：2-4 小时（看 SO-ARM101 装配章节可跳）
- **难度**：入门到中级
- **GPU**：跑训练时需要
- **定位**：英文版读不动可以来这里。重点看「训练扩散策略」章节。

### 9. SmolVLA Quick Start（HuggingFace 官方 Blog）

- **平台**：HuggingFace Blog + LeRobot GitHub
- **URL**：https://huggingface.co/blog/smolvla
- **语言**：英文
- **时长**：3-5 小时（含 fine-tune 训练 20k steps）
- **难度**：中级
- **GPU**：单张消费级 GPU（甚至 MacBook M 系列）
- **定位**：450M 的小 VLA，**能在自己电脑上跑通的 VLA 模型**。读完 [OpenVLA 笔记](../notes/openvla.md) 来跑这个体感最好——OpenVLA 7B 跑不动，SmolVLA 跑得动。

### 10. PyBullet Quickstart Guide（官方）

- **平台**：PyBullet 官方文档 + GitHub examples
- **URL**：https://docs.google.com/document/d/10sXEhzFRSnvFcl3XxNGhnD4N2SedqwdAvK3dsihxVUA
- **语言**：英文
- **时长**：4-5 小时
- **难度**：中级
- **GPU**：不需要
- **定位**：MuJoCo 跑通后想换个仿真器对比。PyBullet 安装简单（`pip install pybullet` 就行），机器人 URDF 资源更多。

### 11. CLIP fine-tune your own dataset（社区 Colab）

- **平台**：Google Colab
- **URL**：在 GitHub 搜 `CLIP fine-tune colab`，推荐 OpenCLIP repo 的 `examples/`：https://github.com/mlfoundations/open_clip
- **语言**：英文
- **时长**：4-6 小时
- **难度**：中级
- **GPU**：Colab Pro 或本地 12GB+
- **定位**：用自己的图文对 fine-tune CLIP，理解 contrastive loss 怎么调。

---

## 需要一周深入（多日 + GPU）

### 12. OpenVLA 完整训练 / fine-tune

- **GitHub**：https://github.com/openvla/openvla
- **最后更新**：活跃维护（2025 年 OFT、FAST 更新）
- **状态**：能跑通，issue 区主要是「显存不够」和「数据集格式」类，不是「跑不起来」
- **语言**：英文
- **时长**：1 周（含数据准备 + LoRA fine-tune）
- **难度**：进阶
- **GPU**：LoRA 需要 27GB 单卡（A100 80GB 推荐）；Full fine-tune 需要 8×A100 节点
- **定位**：**配 GPU 服务器后的主线项目**。读 [OpenVLA 笔记](../notes/openvla.md) → 跑 LIBERO benchmark → 在自己数据集上 LoRA fine-tune。

### 13. NVIDIA Cosmos World Foundation Model

- **GitHub**：https://github.com/NVIDIA/Cosmos
- **配套 Tokenizer**：https://github.com/NVIDIA/Cosmos-Tokenizer
- **语言**：英文
- **时长**：1 周（仅 inference + 后训练样例）
- **难度**：进阶
- **GPU**：A100/H100 推荐（4B-14B 多档模型）
- **定位**：读 [Cosmos Policy 笔记](../notes/cosmos-policy.md) 后做。世界模型生成 + 后训练做 Policy，门槛高但前沿。

### 14. LLaVA 官方代码 + 训练

- **GitHub**：https://github.com/haotian-liu/LLaVA（v1.5）/ https://github.com/LLaVA-VL/LLaVA-NeXT（v1.6）
- **语言**：英文
- **时长**：1 周（pre-train + visual instruction tuning）
- **难度**：进阶
- **GPU**：8×A100 推荐做完整训练；推理单卡 24GB 可
- **定位**：读 [LLaVA 笔记](../notes/llava.md) 后做。先用预训练模型推理，再尝试 visual instruction tuning。

### 15. NVIDIA Isaac Lab（仿真大全）

- **官方文档**：https://isaac-sim.github.io/IsaacLab/
- **GitHub**：https://github.com/isaac-sim/IsaacLab
- **语言**：英文（中文社区有 LycheeAI 等 YouTube 频道）
- **时长**：1-2 周入门
- **难度**：进阶
- **GPU**：RTX 30 系以上 / Linux 系统
- **定位**：替代 Isaac Gym 的统一框架，集成 GR00T。MuJoCo 入门后想做 RL + VLA 大规模训练再来。

### 16. Two Minute Papers（背景刷）

- **平台**：YouTube
- **URL**：https://www.youtube.com/@TwoMinutePapers
- **语言**：英文（自动字幕可用）
- **时长**：每集 5-10 分钟，按主题刷
- **难度**：入门
- **GPU**：不需要
- **定位**：跑代码累了换换脑子。机器人 / 生成式 AI / NeRF / Sora 各种新论文 5 分钟梗概，找下一个想读的论文用。

---

## 仓库可用性快速参考

| 论文 | GitHub | 维护状态 | 一句话 |
|------|--------|---------|-------|
| OpenVLA | https://github.com/openvla/openvla | 活跃，2025 年 OFT/FAST 更新 | 能跑，issue 多是显存问题 |
| LeRobot / SmolVLA | https://github.com/huggingface/lerobot | 活跃，24.5k star，2026-04 v0.5.1 | 能跑，HF 官方维护 |
| LLaVA | https://github.com/haotian-liu/LLaVA | 已有 NeXT 版接班，原 repo 略旧 | 能跑，建议直接用 LLaVA-NeXT |
| SayCan | https://github.com/google-research/google-research/tree/master/saycan | 仅 Colab demo，非完整训练码 | 能跑 demo，不能复现训练 |
| Cosmos | https://github.com/NVIDIA/Cosmos | 活跃，2025 年 CES 发布 | 能跑 inference，门槛高 |
| CartoRadar | 未公开（MIT Signal Kinetics 组）| 论文公开，代码未开源 | 不能跑，等开源 |
| 3DShape2VecSet | 论文为主，社区有非官方实现 | - | 跑社区版 |
| MMA / NLOS-mmwave / Acoustic Swarms / RF-SLAM 等硬件论文 | 多数无开源代码 | - | 读论文为主，硬件复现不现实 |

---

## 学习路径建议（编程零基础版）

```
第 1 周：3Blue1Brown 神经网络 → 李沐前 10 集 → CLIP Colab 两个
第 2 周：MuJoCo Tutorial → SayCan Colab → 复现 VLM_Grasp_Interactive（Task 2）
第 3 周：LeRobot 官方教程 → SmolVLA fine-tune
第 4 周+：OpenVLA / Cosmos 看条件
```

不建议跳级：跳过 Colab 直接啃 OpenVLA 训练代码会卡 80% 时间在配环境而不是学概念。

---

## 跑代码遇到坑了？

记到 [problems/](../../../../problems/)；解决方法可复用的话归档到 [learnings/](../../../../learnings/)。仿真环境常见坑、CUDA 版本问题、HuggingFace 下载慢等，都先 grep 已有 problems 看有没有人踩过。
