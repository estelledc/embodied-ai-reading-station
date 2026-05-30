# mmCLIP: Boosting mmWave-based Zero-shot HAR via Signal-Text Alignment

> **状态：stub** — arxiv 未收录该论文，疑为 IMWUT/UbiComp 或 SenSys 特刊。
> 待 PDF 拿到后替换本文件。

## 来自任务描述的摘要（导师下发）

> 将视觉-语言大模型（VLM）的核心思想引入射频领域，提出了一种将毫米波雷达信号与自然语言文本空间进行对齐的对比学习框架。该工作打破了传统射频感知高度依赖预定义类别和海量标注数据的局限，通过跨模态语义对齐实现了零样本（Zero-shot）的人体行为识别（HAR）。这为构建能直接理解语言指令的"射频-语言"多模态基座模型提供了重要思路。

## 关键概念锚点

- **CLIP**：OpenAI 2021 年提出的图文对比学习模型，把图像和文字 embed 到同一空间。
- **HAR**（Human Activity Recognition）：识别人在做什么动作（走路、跌倒、做饭...）。
- **Zero-shot**：训练时没见过这个类别，靠语义对齐推断。
- **Signal-Text Alignment**：mmWave 信号 ↔ 文本，类似 CLIP 的图 ↔ 文本。

## 待补内容

- [ ] 论文 PDF
- [ ] 网络架构（信号 encoder + 文本 encoder）
- [ ] 数据集 + 实验结果
- [ ] 与传统 mmWave HAR 的对比

## 联系学长

- 找张瑞杰或王宁问 PDF / DOI
