"""练习 2 的自检测试。

默认只检查参考答案（CI 也只跑这部分）。检查你自己写的 action_tokens.py：

    LAB_CHECK_MINE=1 python -m pytest -q
"""

from __future__ import annotations

import os

import numpy as np
import pytest

import action_tokens
import action_tokens_solution

IMPLEMENTATIONS = [pytest.param(action_tokens_solution, id="solution")]
if os.environ.get("LAB_CHECK_MINE") == "1":
    IMPLEMENTATIONS.append(pytest.param(action_tokens, id="mine"))


@pytest.fixture(params=IMPLEMENTATIONS)
def impl(request):
    return request.param


@pytest.fixture
def bridge():
    return action_tokens.load_stats("bridge_orig")


def test_bin_width(impl):
    assert impl.bin_width(0.0, 2.56) == pytest.approx(0.01)
    np.testing.assert_allclose(impl.bin_width(np.array([0.0, -1.0]), np.array([1.0, 1.0]), n_bins=4), [0.25, 0.5])


def test_tokens_are_integers_in_range(impl, bridge):
    rng = np.random.default_rng(0)
    actions = rng.uniform(bridge["min"][:6], bridge["max"][:6], size=(1000, 6))
    tokens = impl.discretize(actions, bridge["q01"][:6], bridge["q99"][:6])
    assert tokens.shape == actions.shape
    assert np.issubdtype(tokens.dtype, np.integer)
    assert tokens.min() >= 0 and tokens.max() <= 255


def test_edges_and_clipping(impl):
    assert impl.discretize(np.array([0.0, 0.999, 1.0]), 0.0, 1.0).tolist() == [0, 255, 255]
    assert impl.discretize(np.array([-5.0, 5.0]), 0.0, 1.0).tolist() == [0, 255]


def test_roundtrip_error_is_at_most_half_a_bin(impl, bridge):
    low, high = bridge["q01"][:6], bridge["q99"][:6]
    rng = np.random.default_rng(1)
    actions = rng.uniform(low, high, size=(2000, 6))
    restored = impl.undiscretize(impl.discretize(actions, low, high), low, high)
    assert np.all(np.abs(restored - actions) <= impl.bin_width(low, high) / 2 + 1e-12)


def test_bridge_translation_bins_are_about_a_quarter_millimeter(impl):
    """回答笔记里那个问题：BridgeData V2 平移每档约 0.22/0.32/0.26 毫米，不是 0.04 毫米，也不是 2 毫米。"""
    rows = action_tokens.report(impl=impl)
    widths_mm = [row["bin_width_q01_q99"] * 1000 for row in rows[:3]]
    np.testing.assert_allclose(widths_mm, [0.2228, 0.3225, 0.2588], atol=5e-4)


def test_min_max_bins_are_much_wider(impl):
    """论文改用 q01～q99 的理由：少数极端值会把 min～max 区间撑得很大，每档就粗了。"""
    rows = action_tokens.report(impl=impl)
    for row in rows[:6]:
        assert row["bin_width_min_max"] > 4 * row["bin_width_q01_q99"]


def test_released_code_uses_255_intervals():
    """OpenVLA 官方代码用 np.linspace(-1, 1, 256) 做边界：只有 255 个区间，档宽是区间 / 255。"""
    low, high = np.array([0.0]), np.array([2.55])
    actions = np.linspace(0.0, 2.55, 10001)[:, None]
    error = np.abs(action_tokens.openvla_code_roundtrip(actions, low, high) - actions)
    assert error.max() <= 0.01 / 2 + 1e-9
    assert error.max() > 0.0099 / 2


def test_exercise_starts_unfinished():
    if os.environ.get("LAB_CHECK_MINE") == "1":
        pytest.skip("你已经在检查自己写的版本")
    with pytest.raises(NotImplementedError):
        action_tokens.bin_width(0.0, 1.0)
