# Non-Line-of-Sight 3D Object Reconstruction via mmWave Surface Normal Estimation

> **状态：stub** — arxiv 未直接命中（搜到的是光学 NLOS，不是 mmWave 版）。可能是 SIGCOMM/MobiCom 论文。
> 待 PDF 拿到后替换本文件。

## 来自任务描述的摘要（导师下发）

> 突破了传统视觉感知在视线遮挡（NLOS）场景下的盲区，利用毫米波信号的穿透与反射特性对隐藏物体进行 3D 重建。该工作没有停留在生成粗糙的稀疏点云，而是创新性地通过物理模型估算毫米波在物体表面的法向量（Surface Normal），从而实现了对遮挡目标高保真的 3D 几何与拓扑重建。这极大增强了具身设备在非结构化复杂物理环境中的三维空间理解能力。

## 关键概念锚点

- **NLOS**（Non-Line-of-Sight）：目标不在直接视线内（被墙/物体挡住）。
- **Surface Normal**：物体表面每点的法向量，配合反射模型可重建几何。
- **mmWave 穿透特性**：毫米波能穿过塑料、布料、薄墙；金属和水会反射。
- **稀疏点云 vs 高保真重建**：前者只给点的位置，后者带表面拓扑。

## 候选关联工作（从 arxiv 搜到的相邻方向）

- [Wave-Former: Through-Occlusion 3D Reconstruction via Wireless Shape Completion (2025)](https://arxiv.org/abs/2511.14152) — 思路相近，可作对照
- [Occlusion Fields (2022)](https://arxiv.org/abs/2203.08657) — 光学版 NLOS 重建

## 待补内容

- [ ] 论文 PDF
- [ ] 物理模型推导
- [ ] 重建 pipeline 图
- [ ] 实验环境（什么物体被遮挡）

## 联系学长

- 找张瑞杰或王宁问 PDF / DOI
