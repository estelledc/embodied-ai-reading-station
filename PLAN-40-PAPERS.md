# 40 篇新论文 / 10 批推进计划

> 创建日期：2026-07-14
> 范围：在不放宽 deep-read、provenance v2、Data API、生成资产和 Pages 门禁的前提下，分 10 批新增 40 篇 embodied AI 论文研究笔记。每批 4 篇，独立 PR / 独立部署 / 独立线上冒烟。

## 执行合同

- 每批先去重，再读取 arXiv / PDF / 项目页等一手来源。
- 每篇必须满足 AGENT-DEEPREAD.md 的结构：TL;DR、场景、前人局限、方法、关键数字、实验、术语、局限、关系、导读关系、思考题、FAQ、原文信息。
- 公开成功率只写成论文报告，不写成本站复现实验。
- 每批必须刷新 papers/provenance.json、生成 card / inline 资产与 portable receipt，并跑 root/repo 双 base 构建检查。
- 每批完成后更新 SESSION-HANDOFF.md，记录 PR、部署和线上冒烟证据。

## 10 批候选

| 批次 | 序号 | slug | 论文 | 一手来源 | 状态 |
|---:|---:|---|---|---|---|
| 1 | 1 | qwen-vla | Qwen-VLA: Unifying Vision-Language-Action Modeling across Tasks, Environments, and Robot Embodiments | https://arxiv.org/abs/2605.30280 | 已部署 |
| 1 | 2 | realmirror | RealMirror: A Comprehensive, Open-Source Vision-Language-Action Platform for Embodied AI | https://arxiv.org/abs/2509.14687 | 已部署 |
| 1 | 3 | llada-vla | LLaDA-VLA: Vision Language Diffusion Action Models | https://arxiv.org/abs/2509.06932 | 已部署 |
| 1 | 4 | discrete-diffusion-vla | Discrete Diffusion VLA: Bringing Discrete Diffusion to Action Decoding in Vision-Language-Action Policies | https://arxiv.org/abs/2508.20072 | 已部署 |
| 2 | 1 | vlaser | Vlaser: Vision-Language-Action Model with Synergistic Embodied Reasoning | https://arxiv.org/abs/2510.11027 | 已部署 |
| 2 | 2 | x-vla | X-VLA: Soft-Prompted Transformer as Scalable Cross-Embodiment Vision-Language-Action Model | https://arxiv.org/abs/2510.10274 | 已部署 |
| 2 | 3 | et-vla | Embodiment Transfer Learning for Vision-Language-Action Models | https://arxiv.org/abs/2511.01224 | 已部署 |
| 2 | 4 | himoe-vla | HiMoE-VLA: Hierarchical Mixture-of-Experts for Generalist Vision-Language-Action Policies | https://arxiv.org/abs/2512.05693 | 已部署 |
| 3 | 1 | green-vla | Green-VLA: Staged Vision-Language-Action Model for Generalist Robots | https://arxiv.org/abs/2602.00919 | 已部署 |
| 3 | 2 | ac2-vla | AC^2-VLA: Action-Context-Aware Adaptive Computation in Vision-Language-Action Models for Efficient Robotic Manipulation | https://arxiv.org/abs/2601.19634 | 已部署 |
| 3 | 3 | mos-vla | MoS-VLA: A Vision-Language-Action Model with One-Shot Skill Adaptation | https://arxiv.org/abs/2510.16617 | 已部署 |
| 3 | 4 | fast-slow-vla | Asynchronous Fast-Slow Vision-Language-Action Policies for Whole-Body Robotic Manipulation | https://arxiv.org/abs/2512.20188 | 已部署 |
| 4 | 1 | vla-forget | VLA-Forget: Vision-Language-Action Unlearning for Embodied Foundation Models | https://arxiv.org/abs/2604.03956 | 来源已锁定 |
| 4 | 2 | membership-inference-vla | Membership Inference Attacks on Vision-Language-Action Models | https://arxiv.org/abs/2605.07088 | 来源已锁定 |
| 4 | 3 | efficient-vla-survey | A Survey on Efficient Vision-Language-Action Models | https://arxiv.org/abs/2510.24795 | 来源已锁定 |
| 4 | 4 | vla-manipulation-survey | Survey of Vision-Language-Action Models for Embodied Manipulation | https://arxiv.org/abs/2508.15201 | 来源已锁定 |
| 5 | 1 | mobile-service-robot-foundation-survey | mobile-service-robot-foundation-survey | 待检索一手来源 | 候选，执行前复核 |
| 5 | 2 | embodied-agi-road-ahead | embodied-agi-road-ahead | 待检索一手来源 | 候选，执行前复核 |
| 5 | 3 | roboneuron | roboneuron | 待检索一手来源 | 候选，执行前复核 |
| 5 | 4 | embodied-navigation-foundation-model | embodied-navigation-foundation-model | 待检索一手来源 | 候选，执行前复核 |
| 6 | 1 | mimo-embodied | mimo-embodied | 待检索一手来源 | 候选，执行前复核 |
| 6 | 2 | open-h-embodiment | open-h-embodiment | 待检索一手来源 | 候选，执行前复核 |
| 6 | 3 | alanavlm | alanavlm | 待检索一手来源 | 候选，执行前复核 |
| 6 | 4 | embodied-3d-generation-survey | embodied-3d-generation-survey | 待检索一手来源 | 候选，执行前复核 |
| 7 | 1 | disco-diffusion-policy | disco-diffusion-policy | 待检索一手来源 | 候选，执行前复核 |
| 7 | 2 | time-unified-diffusion-policy | time-unified-diffusion-policy | 待检索一手来源 | 候选，执行前复核 |
| 7 | 3 | primitive-skill-diffusion-policy | primitive-skill-diffusion-policy | 待检索一手来源 | 候选，执行前复核 |
| 7 | 4 | trace-focused-diffusion-policy | trace-focused-diffusion-policy | 待检索一手来源 | 候选，执行前复核 |
| 8 | 1 | gaze2act | gaze2act | 待检索一手来源 | 候选，执行前复核 |
| 8 | 2 | lacy | lacy | 待检索一手来源 | 候选，执行前复核 |
| 8 | 3 | villa-x | villa-x | 待检索一手来源 | 候选，执行前复核 |
| 8 | 4 | instructvla | instructvla | 待检索一手来源 | 候选，执行前复核 |
| 9 | 1 | discrete-policy | discrete-policy | 待检索一手来源 | 候选，执行前复核 |
| 9 | 2 | gembench | gembench | 待检索一手来源 | 候选，执行前复核 |
| 9 | 3 | language-conditioned-manipulation-survey | language-conditioned-manipulation-survey | 待检索一手来源 | 候选，执行前复核 |
| 9 | 4 | safeembodai | safeembodai | 待检索一手来源 | 候选，执行前复核 |
| 10 | 1 | causal-world-models-embodied-ai | causal-world-models-embodied-ai | 待检索一手来源 | 候选，执行前复核 |
| 10 | 2 | call-for-embodied-ai | call-for-embodied-ai | 待检索一手来源 | 候选，执行前复核 |
| 10 | 3 | robotics-foundation-models-survey | robotics-foundation-models-survey | 待检索一手来源 | 候选，执行前复核 |
| 10 | 4 | cyberspace-physical-world-survey | cyberspace-physical-world-survey | 待检索一手来源 | 候选，执行前复核 |

## 本轮验收命令

~~~bash
PATH="/opt/homebrew/bin:$PATH" npm run test:unit
PATH="/opt/homebrew/bin:$PATH" npm run build
PATH="/opt/homebrew/bin:$PATH" npm run check
PATH="/opt/homebrew/bin:$PATH" SITE_BASE=/embodied-ai-reading-station npm run build
PATH="/opt/homebrew/bin:$PATH" npm run check
git diff --check
~~~
