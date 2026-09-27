"""练习 2 的参考答案。先自己写 action_tokens.py，写不出来再看这里。

运行：python action_tokens_solution.py
"""

from __future__ import annotations

import sys

import numpy as np

import action_tokens


def bin_width(low, high, n_bins: int = 256):
    return (np.asarray(high, dtype=np.float64) - np.asarray(low, dtype=np.float64)) / n_bins


def discretize(actions, low, high, n_bins: int = 256):
    actions = np.asarray(actions, dtype=np.float64)
    low = np.asarray(low, dtype=np.float64)
    high = np.asarray(high, dtype=np.float64)
    clipped = np.clip(actions, low, high)
    tokens = np.floor((clipped - low) / bin_width(low, high, n_bins)).astype(np.int64)
    return np.clip(tokens, 0, n_bins - 1)


def undiscretize(tokens, low, high, n_bins: int = 256):
    low = np.asarray(low, dtype=np.float64)
    return low + (np.asarray(tokens, dtype=np.float64) + 0.5) * bin_width(low, high, n_bins)


if __name__ == "__main__":
    action_tokens.print_report(action_tokens.report(impl=sys.modules[__name__]))
