"""可选：用真实的 CLIP ViT-L/14 验证练习 1 里算出来的形状。

需要 torch 和 transformers（`pip install -r ../requirements-vla.txt` 会一起装上），
第一次运行会从 Hugging Face 下载 openai/clip-vit-large-patch14 的权重，约 1.7 GB。

    python inspect_clip.py                     # 用程序生成的测试图
    python inspect_clip.py --image 我的照片.jpg  # 用你自己的照片（需要 pillow）

LLaVA 的做法（见 LLaVA 官方代码的 mm_vision_select_layer = -2、select_feature = "patch"）：
取 CLIP 倒数第二层的输出，去掉最前面那个 CLS 向量，只留 256 个 patch 向量，
再用投影矩阵 W 把每个 1024 维向量变成语言模型词向量的长度。
"""

from __future__ import annotations

import argparse

import numpy as np

from image_tokens import load_image, make_test_image

MODEL_ID = "openai/clip-vit-large-patch14"


def clip_shapes(image: np.ndarray, llm_width: int = 5120) -> dict:
    import torch
    from transformers import CLIPImageProcessor, CLIPVisionModel

    processor = CLIPImageProcessor.from_pretrained(MODEL_ID)
    model = CLIPVisionModel.from_pretrained(MODEL_ID).eval()
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs, output_hidden_states=True)
        grid = outputs.hidden_states[-2][:, 1:, :]
        projection = torch.nn.Linear(grid.shape[-1], llm_width)  # 随机初始化：LLaVA 里这一层是训练出来的
        pseudo_words = projection(grid)
    return {
        "pixel_values": tuple(inputs["pixel_values"].shape),
        "last_hidden_state": tuple(outputs.last_hidden_state.shape),
        "llava_grid_features": tuple(grid.shape),
        "pseudo_words": tuple(pseudo_words.shape),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="看看真实 CLIP ViT-L/14 把一张图变成了什么形状的数字")
    parser.add_argument("--image", help="你自己的图片路径；不填就用程序生成的测试图")
    parser.add_argument("--llm-width", type=int, default=5120, help="语言模型词向量长度：13B 是 5120，7B 是 4096")
    args = parser.parse_args(argv)

    image = load_image(args.image) if args.image else make_test_image()
    shapes = clip_shapes(image, llm_width=args.llm_width)
    print(f"送进 CLIP 的像素      {shapes['pixel_values']}  ← (批大小, 颜色通道, 高, 宽)")
    print(f"CLIP 最后一层输出     {shapes['last_hidden_state']}  ← 1 个 CLS + 256 个 patch，各 1024 维")
    print(f"LLaVA 取的特征        {shapes['llava_grid_features']}  ← 倒数第二层，去掉 CLS")
    print(f"投影后的伪词          {shapes['pseudo_words']}  ← 和语言模型的词向量一样长")
    return shapes


if __name__ == "__main__":
    main()
