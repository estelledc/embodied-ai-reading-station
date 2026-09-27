"""练习 2：动作在电脑里长什么样？OpenVLA 怎么把动作变成"单词"？

OpenVLA 每一步输出 7 个数：x/y/z 平移、绕三个轴的旋转、夹爪开合。
论文的做法（papers/openvla/paper.md 第 266–270 行）：
  对每一维，在训练数据的第 1 百分位（q01）和第 99 百分位（q99）之间均分 256 档，
  一个连续的数落在哪一档，就用哪一档的编号（0～255）代替它。

请补全下面三个标了 TODO 的函数，然后运行：

    python action_tokens.py                  # 看 BridgeData V2 上每一档有多宽
    LAB_CHECK_MINE=1 python -m pytest -q     # 用测试检查你写的版本

写不出来再看 action_tokens_solution.py。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

STATS_FILE = Path(__file__).with_name("openvla_norm_stats.json")


def load_stats(dataset: str = "bridge_orig") -> dict:
    """读 OpenVLA 公开的动作统计（q01、q99、min、max ……），返回 numpy 数组组成的字典。"""
    raw = json.loads(STATS_FILE.read_text(encoding="utf-8"))
    stats = {key: np.asarray(value, dtype=np.float64) for key, value in raw["datasets"][dataset].items()}
    stats["names"] = raw["dimension_names"]
    return stats


def bin_width(low, high, n_bins: int = 256):
    """TODO：把区间 [low, high] 均分成 n_bins 档，每一档有多宽？（low、high 可以是数组，逐维计算）"""
    raise NotImplementedError("请补全 bin_width")


def discretize(actions, low, high, n_bins: int = 256):
    """TODO：把连续动作变成 0～n_bins-1 的整数编号（论文的做法）。

    - 先把每个数裁剪到 [low, high] 里（比 low 小的算 low，比 high 大的算 high）；
    - 再算它落在第几档：编号 = floor((a - low) / 档宽)，最大不超过 n_bins - 1；
    - 返回 int64 数组，形状和 actions 一样。
    """
    raise NotImplementedError("请补全 discretize")


def undiscretize(tokens, low, high, n_bins: int = 256):
    """TODO：把编号变回连续的数：返回这一档的中点，low + (编号 + 0.5) × 档宽。"""
    raise NotImplementedError("请补全 undiscretize")


def openvla_code_roundtrip(actions, low, high, n_bins: int = 256):
    """照着 OpenVLA 官方代码（prismatic/vla/action_tokenizer.py）做一遍"编码 → 解码"，拿来和论文的说法对比。

    官方代码先把动作线性映射到 [-1, 1]，再用 np.linspace(-1, 1, n_bins) 生成 n_bins 个边界，
    所以只有 n_bins - 1 个区间、n_bins - 1 个中点；np.digitize 的结果最后被截到这些中点上。
    """
    actions = np.asarray(actions, dtype=np.float64)
    low = np.asarray(low, dtype=np.float64)
    high = np.asarray(high, dtype=np.float64)
    normalized = np.clip(2.0 * (actions - low) / (high - low) - 1.0, -1.0, 1.0)
    edges = np.linspace(-1.0, 1.0, n_bins)
    centers = (edges[:-1] + edges[1:]) / 2.0
    index = np.clip(np.digitize(normalized, edges) - 1, 0, centers.shape[0] - 1)
    return (centers[index] + 1.0) / 2.0 * (high - low) + low


def report(impl=None, dataset: str = "bridge_orig") -> list[dict]:
    """算出每一维的档宽：论文说法（q01～q99 均分 256 档）和"如果用 min～max"两种。"""
    impl = impl or sys.modules[__name__]
    stats = load_stats(dataset)
    by_quantile = impl.bin_width(stats["q01"], stats["q99"])
    by_min_max = impl.bin_width(stats["min"], stats["max"])
    rows = []
    for i, name in enumerate(stats["names"]):
        rows.append(
            {
                "dimension": name,
                "q01": float(stats["q01"][i]),
                "q99": float(stats["q99"][i]),
                "bin_width_q01_q99": float(by_quantile[i]),
                "bin_width_min_max": float(by_min_max[i]),
            }
        )
    return rows


def print_report(rows) -> None:
    print("BridgeData V2（OpenVLA 公开统计）每一档有多宽：")
    print(f"{'维度':<8}{'q01～q99 均分 256 档':>22}{'如果改用 min～max':>20}")
    for row in rows:
        if row["dimension"] in ("x", "y", "z"):
            q, m = row["bin_width_q01_q99"] * 1000, row["bin_width_min_max"] * 1000
            print(f"{row['dimension']:<8}{q:>18.3f} 毫米{m:>16.3f} 毫米")
        elif row["dimension"] == "gripper":
            print(f"{row['dimension']:<8}{'（OpenVLA 不归一化夹爪，这一维只有 0/1）':>36}")
        else:
            q, m = np.degrees(row["bin_width_q01_q99"]), np.degrees(row["bin_width_min_max"])
            print(f"{row['dimension']:<8}{q:>18.3f} 度  {m:>16.3f} 度")


if __name__ == "__main__":
    print_report(report())
