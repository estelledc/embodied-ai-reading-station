# RF-Based 3D SLAM Rivaling Vision Approaches

> **状态：stub** — arxiv 上未找到该论文的开放预印本，可能为会议特刊（SIGCOMM/MobiCom/SenSys）。
> 待学长提供 PDF 后用 `lr pdf bundle paper.pdf -o bundle.zip --engine fast` 替换本文件。

## 来自任务描述的摘要（导师下发）

> 本文提出了一种新颖的基于射频信号的 SLAM 系统，利用毫米波雷达实现了媲美视觉基准方案的厘米级高保真 3D 建图。该工作创新性地针对射频信号引入了免训练的"不确定性量化（Uncertainty Quantification）"方法，并将其高效融入空间建图算法中。这为机器人在视觉受限、极端复杂的环境中进行高精度空间定位与环境理解，提供了一条极具前沿价值的射频感知路径。

## 关键概念锚点（读笔记前先理解）

- **SLAM**（Simultaneous Localization and Mapping）：机器人在未知环境同时定位自己 + 建地图。
- **mmWave radar**：60–100 GHz 毫米波雷达。穿透雾、烟、低光，但分辨率低、稀疏。
- **Uncertainty Quantification**：每个测量点带置信度，用于过滤噪声/错点。
- **Training-free**：不需要数据集训练，用物理模型直接推。

## 待补内容

- [ ] 论文 PDF 全文
- [ ] 核心架构图
- [ ] 与视觉 SLAM 的定量对比表
- [ ] 实验环境（什么室内/室外场景）

## 引用线索（debug 用）

- 若是 USTC / Tsinghua / MIT 的工作：搜 "millimeter wave SLAM 3D reconstruction Uncertainty"
- 关注 SIGCOMM '24、MobiCom '24、SenSys '24 proceedings

## 联系学长

- 找张瑞杰或王宁问 PDF / DOI
