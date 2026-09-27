"""练习 1 的自检测试。

默认只检查参考答案（CI 也只跑这部分）。检查你自己写的 image_tokens.py：

    LAB_CHECK_MINE=1 python -m pytest -q

真实 CLIP 的测试需要 torch + transformers 和约 1.7 GB 权重，默认跳过；想跑就加 LAB_SLOW=1。
"""

from __future__ import annotations

import os

import numpy as np
import pytest

import image_tokens
import image_tokens_solution

IMPLEMENTATIONS = [pytest.param(image_tokens_solution, id="solution")]
if os.environ.get("LAB_CHECK_MINE") == "1":
    IMPLEMENTATIONS.append(pytest.param(image_tokens, id="mine"))


@pytest.fixture(params=IMPLEMENTATIONS)
def impl(request):
    return request.param


@pytest.mark.parametrize(
    ("image_size", "patch_size", "expected"),
    [(28, 14, 4), (224, 14, 256), (336, 14, 576), (224, 32, 49)],
)
def test_count_patches(impl, image_size, patch_size, expected):
    assert impl.count_patches(image_size, patch_size) == expected


def test_count_patches_rejects_uneven_split(impl):
    with pytest.raises(ValueError):
        impl.count_patches(225, 14)


def test_patchify_shape_and_dtype(impl):
    image = image_tokens.make_test_image(224)
    patches = impl.patchify(image, 14)
    assert patches.shape == (256, 14 * 14 * 3)
    assert patches.dtype == np.uint8


def test_patchify_reading_order(impl):
    image = image_tokens.make_test_image(224)
    patches = impl.patchify(image, 14)
    np.testing.assert_array_equal(patches[0], image[0:14, 0:14].reshape(-1))
    np.testing.assert_array_equal(patches[1], image[0:14, 14:28].reshape(-1))
    np.testing.assert_array_equal(patches[16], image[14:28, 0:14].reshape(-1))
    np.testing.assert_array_equal(patches[255], image[210:224, 210:224].reshape(-1))


def test_patches_can_be_put_back_together(impl):
    image = image_tokens.make_test_image(56, seed=3)
    patches = impl.patchify(image, 14)
    rebuilt = patches.reshape(4, 4, 14, 14, 3).transpose(0, 2, 1, 3, 4).reshape(56, 56, 3)
    np.testing.assert_array_equal(rebuilt, image)


def test_patchify_rejects_uneven_split(impl):
    with pytest.raises(ValueError):
        impl.patchify(image_tokens.make_test_image(30), 14)


def test_describe_matches_llava_shapes(impl):
    shapes = image_tokens.describe(image_tokens.make_test_image(), impl=impl)
    assert shapes["num_patches"] == 256
    assert shapes["patches"] == (256, 588)
    assert shapes["vision_vectors"] == (256, 1024)
    assert shapes["pseudo_words"] == (256, 5120)


def test_exercise_starts_unfinished():
    """练习文件里的 TODO 必须留给学习者自己写。"""
    if os.environ.get("LAB_CHECK_MINE") == "1":
        pytest.skip("你已经在检查自己写的版本")
    with pytest.raises(NotImplementedError):
        image_tokens.count_patches(224, 14)


@pytest.mark.skipif(os.environ.get("LAB_SLOW") != "1", reason="需要 torch + transformers 和约 1.7 GB 的 CLIP 权重；设 LAB_SLOW=1 再跑")
def test_real_clip_shapes():
    pytest.importorskip("torch")
    pytest.importorskip("transformers")
    import inspect_clip

    shapes = inspect_clip.clip_shapes(image_tokens.make_test_image())
    assert shapes["pixel_values"] == (1, 3, 224, 224)
    assert shapes["last_hidden_state"] == (1, 257, 1024)
    assert shapes["llava_grid_features"] == (1, 256, 1024)
    assert shapes["pseudo_words"] == (1, 256, 5120)
