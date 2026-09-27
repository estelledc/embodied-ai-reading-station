"""练习 1：一张图片在 LLaVA 眼里变成了什么数字？

LLaVA 的"眼睛"是 CLIP ViT-L/14。它不会整张图一起看，而是先把 224×224 的图片切成
边长 14 像素的小方块（patch），每个小方块展平成一串数字，再各自变成一个向量。
这些向量经过 LLaVA 的投影矩阵 W，就成了语言模型能读的"伪词"。

这个练习不需要任何模型，只用 numpy 把"切块"这一步自己做一遍。
请补全下面两个标了 TODO 的函数，然后运行：

    python image_tokens.py                          # 看看输出
    LAB_CHECK_MINE=1 python -m pytest -q            # 用测试检查你写的版本

写不出来再看 image_tokens_solution.py。
"""

from __future__ import annotations

import sys

import numpy as np


def make_test_image(size: int = 224, seed: int = 0) -> np.ndarray:
    """造一张 size×size 的彩色测试图：uint8，形状 (size, size, 3)。

    想用自己的照片，可以先装 pillow，再用 load_image() 读进来。
    """
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:size, 0:size]
    image = np.stack([x * 255 // max(size - 1, 1), y * 255 // max(size - 1, 1), (x + y) % 256], axis=-1)
    noise = rng.integers(0, 16, size=image.shape)
    return np.clip(image + noise, 0, 255).astype(np.uint8)


def load_image(path: str, size: int = 224) -> np.ndarray:
    """读一张自己的图片，缩放成 size×size，返回 uint8 的 (size, size, 3) 数组。需要 `pip install pillow`。"""
    from PIL import Image

    with Image.open(path) as img:
        return np.asarray(img.convert("RGB").resize((size, size)), dtype=np.uint8)


def count_patches(image_size: int, patch_size: int) -> int:
    """TODO：一张 image_size×image_size 的图，切成 patch_size×patch_size 的小方块，一共有多少块？

    例子：count_patches(28, 14) 应该是 4（横 2 块 × 竖 2 块）。
    如果 image_size 不能被 patch_size 整除，抛出 ValueError。
    """
    raise NotImplementedError("请补全 count_patches")


def patchify(image: np.ndarray, patch_size: int) -> np.ndarray:
    """TODO：把形状为 (H, W, 3) 的图切块，返回形状为 (块数, patch_size * patch_size * 3) 的矩阵。

    规则：
    - 块的顺序：从左上角开始，先从左到右，再从上到下（和读书的顺序一样）。
    - 每一块内部：直接用 image[行范围, 列范围, :] 取出来，再 .reshape(-1) 展平。
    - H 或 W 不能被 patch_size 整除时，抛出 ValueError。
    - 返回的 dtype 和输入一样（不要转成小数）。
    """
    raise NotImplementedError("请补全 patchify")


def linear_projection(patches: np.ndarray, out_dim: int, seed: int = 0) -> np.ndarray:
    """把每个 patch（一行数字）乘上同一个随机矩阵，变成 out_dim 维的向量。

    真实的 CLIP 和 LLaVA 里，这个矩阵是训练出来的；这里用随机数只是为了看清"形状怎么变"。
    """
    rng = np.random.default_rng(seed)
    weight = rng.normal(0.0, 0.02, size=(patches.shape[1], out_dim)).astype(np.float32)
    return (patches.astype(np.float32) / 255.0) @ weight


def describe(image: np.ndarray, impl=None, patch_size: int = 14, clip_width: int = 1024, llm_width: int = 5120) -> dict:
    """把"图片 → 小方块 → 向量 → 伪词"每一步的形状整理成一个字典。

    impl 是提供 count_patches / patchify 的模块：默认用本文件（你写的版本）。
    """
    impl = impl or sys.modules[__name__]
    patches = impl.patchify(image, patch_size)
    vision_vectors = linear_projection(patches, clip_width, seed=0)
    pseudo_words = linear_projection(vision_vectors, llm_width, seed=1)
    return {
        "image": image.shape,
        "num_patches": impl.count_patches(image.shape[0], patch_size),
        "patches": patches.shape,
        "vision_vectors": vision_vectors.shape,
        "pseudo_words": pseudo_words.shape,
    }


if __name__ == "__main__":
    shapes = describe(make_test_image())
    print(f"原始图片          {shapes['image']}  ← 224×224 像素，每个像素 3 个颜色值")
    print(f"切成小方块        {shapes['num_patches']} 块")
    print(f"展平后的矩阵      {shapes['patches']}  ← 每行一块：14×14×3 = 588 个数字")
    print(f"每块变成向量      {shapes['vision_vectors']}  ← CLIP ViT-L/14 的向量是 1024 维")
    print(f"投影成 LLM 伪词   {shapes['pseudo_words']}  ← LLaVA-13B 的词向量是 5120 维（7B 是 4096）")
