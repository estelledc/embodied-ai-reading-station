"""练习 1 的参考答案。先自己写 image_tokens.py，写不出来再看这里。

运行：python image_tokens_solution.py
"""

from __future__ import annotations

import sys

import numpy as np

import image_tokens


def count_patches(image_size: int, patch_size: int) -> int:
    if image_size % patch_size != 0:
        raise ValueError(f"{image_size} 不能被 {patch_size} 整除")
    per_side = image_size // patch_size
    return per_side * per_side


def patchify(image: np.ndarray, patch_size: int) -> np.ndarray:
    height, width, _ = image.shape
    if height % patch_size != 0 or width % patch_size != 0:
        raise ValueError(f"图片尺寸 {height}×{width} 不能被 {patch_size} 整除")
    rows = []
    for top in range(0, height, patch_size):
        for left in range(0, width, patch_size):
            block = image[top:top + patch_size, left:left + patch_size, :]
            rows.append(block.reshape(-1))
    return np.stack(rows)


if __name__ == "__main__":
    print(image_tokens.describe(image_tokens.make_test_image(), impl=sys.modules[__name__]))
