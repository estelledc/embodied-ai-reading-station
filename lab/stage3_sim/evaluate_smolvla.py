"""evaluate_smolvla：把 lerobot-train 训出来的 SmolVLA 放回 PickCubeEnv，测它自己能不能抓起方块。

用法（在 lab/stage3_sim 目录里运行，需要先 `pip install -r ../requirements-vla.txt`）：

    python evaluate_smolvla.py \
        --checkpoint outputs/train/smolvla_pick_cube/checkpoints/last/pretrained_model \
        --episodes 20

检查点目录里要有 config.json、model.safetensors，以及 lerobot-train 一起保存的
policy_preprocessor.json / policy_postprocessor.json（归一化、改名、分词都靠它们）。

注意：评估用的图像尺寸要和录示范时一样（默认 256×256）。
"""

from __future__ import annotations

import argparse

import numpy as np

from evaluate import evaluate


class SmolVLAAgent:
    """把 PickCubeEnv 的观测翻译成 SmolVLA 的输入，再把输出翻译回 4 维动作。"""

    def __init__(self, checkpoint, device="cpu", n_action_steps=10):
        from lerobot.policies.factory import make_pre_post_processors
        from lerobot.policies.smolvla.modeling_smolvla import SmolVLAPolicy

        self.policy = SmolVLAPolicy.from_pretrained(checkpoint)
        # SmolVLA 一次预测 50 步动作；默认要把 50 步全部做完才重新看图。
        # 这个任务一共才十几步，所以评估时每 n_action_steps 步就重新看一次图、重新预测。
        self.policy.config.n_action_steps = n_action_steps
        self.policy.to(device).eval()
        self.preprocessor, self.postprocessor = make_pre_post_processors(
            self.policy.config,
            pretrained_path=checkpoint,
            preprocessor_overrides={"device_processor": {"device": device}},
            postprocessor_overrides={"device_processor": {"device": "cpu"}},
        )

    def reset(self):
        self.policy.reset()

    def __call__(self, obs, task):
        import torch

        frame = {
            "observation.images.front": torch.from_numpy(obs["image"]).permute(2, 0, 1).float() / 255.0,
            "observation.state": torch.from_numpy(np.asarray(obs["state"], dtype=np.float32)),
            "task": task,
        }
        with torch.no_grad():
            action = self.policy.select_action(self.preprocessor(frame))
        action = self.postprocessor(action)
        return action.squeeze(0).cpu().numpy().astype(np.float32)


def main(argv=None):
    parser = argparse.ArgumentParser(description="在 PickCubeEnv 上评估微调后的 SmolVLA")
    parser.add_argument("--checkpoint", required=True, help="…/checkpoints/<步数或 last>/pretrained_model 目录")
    parser.add_argument("--episodes", type=int, default=20)
    parser.add_argument("--seed", type=int, default=1000, help="评估种子从这里开始；和录示范的种子分开，才是没见过的摆放")
    parser.add_argument("--image-size", type=int, nargs=2, default=[256, 256], metavar=("H", "W"))
    parser.add_argument("--n-action-steps", type=int, default=10, help="每做几步动作就重新看图预测一次")
    parser.add_argument("--device", default="cpu", help="有 NVIDIA 显卡就写 cuda")
    args = parser.parse_args(argv)

    agent = SmolVLAAgent(args.checkpoint, device=args.device, n_action_steps=args.n_action_steps)
    result = evaluate(agent, episodes=args.episodes, seed=args.seed, render=True, image_size=tuple(args.image_size))
    for episode in result["per_episode"]:
        status = "成功 success" if episode["success"] else "失败 failure"
        print(f"seed {episode['seed']:4d}  {status}  steps={episode['steps']:3d}  max_lift={episode['max_lift_height'] * 100:5.1f} cm")
    print(f"SmolVLA  成功率 success_rate = {result['success_rate']:.1%} ({result['n_success']}/{result['n_episodes']})")
    return result


if __name__ == "__main__":
    main()
