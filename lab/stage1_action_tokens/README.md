# 阶段 1 · 练习 2：动作在电脑里长什么样？

这是你在 `progress.md` 里写下的第二个问题。OpenVLA 的办法是把机械臂的动作"切成档位"，每一档对应语言模型词表里的一个 token。这个练习让你自己实现这一步，再用 OpenVLA 公开的真实数据统计，算出每一档到底有多宽。

## 背景：一个动作是 7 个数

OpenVLA 在 BridgeData V2 上每一步输出 7 个数：末端在 x、y、z 三个方向上**这一步移动多少**（米）、绕三个轴**这一步转多少**（弧度），以及夹爪开还是合（0 = 合，1 = 开）。

论文（[`papers/openvla/paper.md`](../../papers/openvla/paper.md) 第 266–270 行）的做法：对每一维，在训练数据的第 1 百分位（q01）和第 99 百分位（q99）之间均分 256 档，一个连续的数落在哪一档，就用这一档的编号（0～255）代替它。

`openvla_norm_stats.json` 是从 OpenVLA 随模型发布的配置文件（Hugging Face 上 `openvla/openvla-7b` 的 `config.json`，`norm_stats` 字段）里摘出来的统计值，2026-09-27 下载。

## 你要做什么

1. 打开 `action_tokens.py`，补全三个 `TODO`：`bin_width`（每档多宽）、`discretize`（数 → 编号）、`undiscretize`（编号 → 数）。
2. 运行，看 BridgeData V2 上每一档有多宽：

   ```bash
   cd lab/stage1_action_tokens
   python action_tokens.py
   ```

3. 用测试检查：

   ```bash
   LAB_CHECK_MINE=1 python -m pytest -q
   ```

4. 写不出来再看 `action_tokens_solution.py`。

## 做完以后应该看到

```text
维度            q01～q99 均分 256 档        如果改用 min～max
x                    0.223 毫米           3.194 毫米
y                    0.322 毫米           1.552 毫米
z                    0.259 毫米           1.710 毫米
roll                 0.036 度             1.415 度
pitch                0.038 度             0.833 度
yaw                  0.092 度             2.811 度
```

两个发现：

1. **每一档大约是 0.2–0.3 毫米/步。** 本站的 OpenVLA 笔记原来写"精度约 0.04 毫米"，思考题提示又算成"约 2 毫米"，两个都不对：前者没有出处，后者错在把动作当成了工作空间里的绝对坐标（其实是每一步的位移量）。这条错误的改正见 [PR #54](https://github.com/estelledc/embodied-ai-reading-station/pull/54) 里的核验记录 `docs/verification-log.md`；你刚才亲手算出了正确的数。
2. **为什么用 q01～q99，而不用最小值～最大值？** 看右边一列：少数极端值会把区间撑大 5～40 倍，每一档就粗了同样的倍数。这正是论文说的理由。

## 再往前一步：论文和代码不完全一样

`action_tokens.py` 里的 `openvla_code_roundtrip` 照着 OpenVLA 官方代码（[`prismatic/vla/action_tokenizer.py`](https://github.com/openvla/openvla/blob/main/prismatic/vla/action_tokenizer.py)）做了一遍：它用 `np.linspace(-1, 1, 256)` 生成 256 个**边界**，所以其实只有 **255 个区间**，代码注释里自己也写了这一点。论文说的是"256 个 bin"。差别很小，但这是一个很好的习惯：**论文里的描述要到代码里去核对**。测试 `test_released_code_uses_255_intervals` 验证了这个差别。

## 用自己的话写下来

在 [`../logs/`](../logs/) 里新建一篇记录，回答：

1. 如果一个任务需要 0.1 毫米的精度，256 档够不够？除了"档不够细"，还有什么原因会让 OpenVLA 做不好这种任务？
2. 夹爪那一维为什么不用切 256 档？（提示：看 `openvla_norm_stats.json` 里的 `mask`。）
3. 阶段 3 的仿真场景里，动作是 4 个数 `[dx, dy, dz, gripper]`。它和 OpenVLA 的 7 个数有什么对应关系？夹爪的 0 和 1 的含义一样吗？
