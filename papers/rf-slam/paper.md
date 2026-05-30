# CartoRadar: RF-Based 3D SLAM Rivaling Vision Approaches

> **状态：stub** — 论文 PDF 仅在 ACM Digital Library 提供（DOI: 10.1145/3680207.3723467），需要订阅访问。
> 已尝试：arxiv 无预印本、作者主页（haowenlai.github.io）只放摘要、项目页（waves.seas.upenn.edu/projects/cartoradar）的 Paper 按钮指向 ACM、ACM 直链被 Cloudflare 反爬拦。
> 待 PDF 到手后用 `lr pdf bundle paper.pdf` 替换本文件。

## 已确认的论文信息

- **作者**：Haowen Lai, Zhiwei Zheng, Mingmin Zhao（UPenn Waves Lab）
- **会议**：MobiCom 2025（**Best Artifact Award 🏆**）
- **DOI**：[10.1145/3680207.3723467](https://dl.acm.org/doi/10.1145/3680207.3723467)
- **项目页**：https://waves.seas.upenn.edu/projects/cartoradar/
- **代码**：https://github.com/penn-waves-lab/CartoRadar （含 OccNet 和 Uncertainty 模块源码）
- **Demo 视频**：https://www.youtube.com/watch?v=WRiaRZXQ4gM

## 摘要（来自项目页 + ACM 公开 abstract）

CartoRadar 是一个基于射频信号的 SLAM 系统，用毫米波雷达实现厘米级精度的 3D 建图。核心贡献：

1. **Robust RF Sensing with Uncertainty Quantification**：训练好的学习模型在推理时预测精度会波动；为应对此问题，提出**免训练（training-free）**的不确定性量化方法，专门为 RF 信号设计。
2. **Uncertainty-aware RF-Based SLAM**：把 uncertainty 估计融入 SLAM mapping pass，提出新颖的 implicit occupancy field + 概率学习。

## 量化结果（来自摘要）

- 在 5 栋楼 14 层做评测
- 轨迹误差：**14.1 cm**（比相机基线提升 72.1%）
- 建图精度：**7.4 cm accuracy / 8.1 cm completion**（比 vision 方法分别提升 46.2% / 67.6%）
- 高保真细节：能重建出**玻璃窗**——所有 vision baseline 都漏掉

## 关键概念锚点（读笔记前先理解）

- **SLAM**（Simultaneous Localization and Mapping）：机器人在未知环境同时定位自己 + 建地图
- **mmWave radar**：60–100 GHz 毫米波雷达。穿雾、烟、低光，但分辨率低、数据稀疏
- **Uncertainty Quantification (UQ)**：每个测量点带置信度，用于过滤噪声/错点
- **Training-free**：不需要数据集训练，用物理模型直接推
- **Implicit occupancy field**：用神经网络隐式表示空间占据情况，比体素网格更省内存

## 待补内容（拿到 PDF 后）

- [ ] 完整论文 PDF
- [ ] OccNet 架构图
- [ ] 不确定性量化方法的具体推导
- [ ] 14 层楼数据集分布
- [ ] 与其他 RF SLAM 方法（4DRadarSLAM、PanoRadar、milliMap）的对比表

## 替代阅读（同实验室相关论文）

如果短期拿不到 CartoRadar PDF，**PanoRadar**（同一一作 Haowen Lai，MobiCom 2024 Best Demo）开源充分，是 CartoRadar 的前作，可作为理解他们 RF imaging 思路的入口：

- 标题：Enabling Visual Recognition at Radio Frequency
- 项目页：https://waves.seas.upenn.edu/projects/panoradar/

## 联系学长

带着上面的 DOI 和 abstract 找张瑞杰 / 王宁，看他们能不能用学校机构 VPN 直接下到 PDF。
