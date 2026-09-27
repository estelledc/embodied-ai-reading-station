"""PickCubeEnv 的自动化测试。

默认测试都用 render=False，不需要显卡、显示器或任何图形库：

    pytest -q lab/stage3_sim

渲染测试默认跳过；设置 LAB_RENDER=1 才会运行
（没有显示器的 Linux 还要加 MUJOCO_GL=egl 或 MUJOCO_GL=osmesa）：

    LAB_RENDER=1 MUJOCO_GL=egl pytest -q lab/stage3_sim
"""

import json
import os
import sys

import numpy as np
import pytest

from evaluate import RandomPolicy, evaluate
from evaluate import main as evaluate_main
from pick_env import (
    CUBE_HALF_SIZE,
    CUBE_XY_RANGE,
    FINGER_TRAVEL,
    HOME_POSITION,
    MAX_DELTA,
    MIN_CUBE_DISTANCE,
    SUCCESS_HOLD_STEPS,
    SUCCESS_LIFT,
    TASK,
    WORKSPACE_HIGH,
    WORKSPACE_LOW,
    PickCubeEnv,
    check_rendering_backend,
)
from record_demos import main as record_demos_main
from record_demos import record_demos
from scripted_expert import ScriptedExpert

needs_render = pytest.mark.skipif(
    os.environ.get("LAB_RENDER") != "1", reason="设置 LAB_RENDER=1 才运行渲染测试"
)


@pytest.fixture
def env():
    env = PickCubeEnv(render=False)
    yield env
    env.close()


def run_expert_episode(env, seed):
    """用脚本专家跑一个回合，返回 (是否成功, 最后一步的 info)。"""
    expert = ScriptedExpert()
    obs = env.reset(seed=seed)
    while True:
        obs, _, terminated, truncated, info = env.step(expert.act(obs))
        if terminated or truncated:
            return terminated, info


# ----- reset / step 的形状与类型 ---------------------------------------------


def test_reset_returns_expected_obs(env):
    obs = env.reset(seed=0)
    assert set(obs) == {"state", "cube_pos"}  # render=False → 没有 "image"
    assert obs["state"].shape == (4,) and obs["state"].dtype == np.float32
    assert obs["cube_pos"].shape == (3,) and obs["cube_pos"].dtype == np.float32
    np.testing.assert_allclose(obs["state"][:3], HOME_POSITION, atol=1e-3)
    assert obs["state"][3] == pytest.approx(2 * FINGER_TRAVEL, abs=1e-3)  # 夹爪张开
    assert env.task == TASK == "pick up the red cube"


def test_step_returns_expected_types(env):
    env.reset(seed=0)
    obs, reward, terminated, truncated, info = env.step(np.zeros(4, dtype=np.float32))
    assert set(obs) == {"state", "cube_pos"}
    assert obs["state"].shape == (4,) and obs["state"].dtype == np.float32
    assert isinstance(reward, float) and reward == 0.0
    assert terminated is False and truncated is False
    assert info["success"] is False
    assert isinstance(info["cube_height"], float)
    assert info["cube_height"] == pytest.approx(CUBE_HALF_SIZE, abs=1e-3)


def test_step_before_reset_raises():
    env = PickCubeEnv(render=False)
    with pytest.raises(RuntimeError):
        env.step(np.zeros(4))


# ----- 随机摆放 -------------------------------------------------------------


def test_cube_starts_on_table_in_range(env):
    for seed in range(50):
        cube = env.reset(seed=seed)["cube_pos"]
        assert np.all(np.abs(cube[:2]) <= CUBE_XY_RANGE + 1e-4)
        assert cube[2] == pytest.approx(CUBE_HALF_SIZE, abs=1e-3)


def test_distractors_do_not_overlap():
    env = PickCubeEnv(render=False, n_distractors=2)
    for seed in range(50):
        env.reset(seed=seed)
        positions = env.cube_positions()
        assert list(positions) == ["red_cube", "blue_cube", "green_cube"]
        xy = [p[:2] for p in positions.values()]
        for i in range(len(xy)):
            assert np.all(np.abs(xy[i]) <= CUBE_XY_RANGE + 1e-4)
            for j in range(i + 1, len(xy)):
                assert np.linalg.norm(xy[i] - xy[j]) >= MIN_CUBE_DISTANCE - 1e-4
    env.close()


@pytest.mark.parametrize("bad", [-1, 3])
def test_invalid_n_distractors_raises(bad):
    with pytest.raises(ValueError):
        PickCubeEnv(render=False, n_distractors=bad)


# ----- 动作裁剪与工作空间 ----------------------------------------------------


def test_clip_action_limits_values():
    clipped = PickCubeEnv.clip_action([1.0, -1.0, 0.005, 7.0])
    assert clipped.dtype == np.float32
    np.testing.assert_allclose(clipped, [MAX_DELTA, -MAX_DELTA, 0.005, 1.0], rtol=1e-6)
    np.testing.assert_allclose(PickCubeEnv.clip_action([0.0, 0.0, 0.0, -3.0]), [0.0, 0.0, 0.0, 0.0])


def test_large_action_moves_at_most_max_delta(env):
    start = env.reset(seed=0)["state"][:3]
    obs, *_ = env.step([1.0, -1.0, 1.0, 0.0])
    moved = obs["state"][:3] - start
    assert np.all(np.abs(moved) <= MAX_DELTA + 1e-3)
    assert moved[0] > 0.9 * MAX_DELTA
    assert moved[1] < -0.9 * MAX_DELTA
    assert moved[2] > 0.9 * MAX_DELTA


@pytest.mark.parametrize("bad_action", [np.zeros(3), np.zeros(5), [np.nan, 0.0, 0.0, 0.0]])
def test_invalid_action_raises(env, bad_action):
    env.reset(seed=0)
    with pytest.raises(ValueError):
        env.step(bad_action)


def test_gripper_stays_inside_workspace(env):
    env.reset(seed=0)
    for _ in range(20):  # 一直往 (-x, +y, 下) 推
        obs, *_ = env.step([-0.02, 0.02, -0.02, 0.0])
    np.testing.assert_allclose(obs["state"][:3], [WORKSPACE_LOW[0], WORKSPACE_HIGH[1], WORKSPACE_LOW[2]], atol=2e-3)
    for _ in range(30):  # 再一直往 (+x, -y, 上) 推
        obs, *_ = env.step([0.02, -0.02, 0.02, 0.0])
    np.testing.assert_allclose(obs["state"][:3], [WORKSPACE_HIGH[0], WORKSPACE_LOW[1], WORKSPACE_HIGH[2]], atol=2e-3)


def test_gripper_command_opens_and_closes(env):
    env.reset(seed=0)
    for _ in range(3):
        obs, *_ = env.step([0.0, 0.0, 0.0, 1.0])  # 空手闭合
    assert obs["state"][3] < 0.005
    for _ in range(3):
        obs, *_ = env.step([0.0, 0.0, 0.0, 0.4])  # 0.4 < 0.5 → 张开
    assert obs["state"][3] == pytest.approx(2 * FINGER_TRAVEL, abs=0.005)


# ----- 回合结束条件 ---------------------------------------------------------


def test_truncated_at_max_steps():
    env = PickCubeEnv(render=False, max_steps=5)
    env.reset(seed=0)
    for i in range(5):
        _, _, terminated, truncated, _ = env.step(np.zeros(4))
        assert terminated is False
        assert truncated is (i == 4)
    with pytest.raises(RuntimeError):
        env.step(np.zeros(4))  # 回合结束后必须先 reset


def test_reward_and_termination_follow_success(env):
    expert = ScriptedExpert()
    obs = env.reset(seed=0)
    streak = 0
    while True:
        obs, reward, terminated, truncated, info = env.step(expert.act(obs))
        assert reward == (1.0 if info["success"] else 0.0)
        streak = streak + 1 if info["success"] else 0
        assert terminated == (streak >= SUCCESS_HOLD_STEPS)
        if info["success"]:
            assert info["lift_height"] >= SUCCESS_LIFT and info["cube_between_fingers"]
        if terminated or truncated:
            break
    assert terminated and not truncated


# ----- 确定性 ---------------------------------------------------------------


def expert_trajectory(seed, n_distractors):
    env = PickCubeEnv(render=False, n_distractors=n_distractors)
    expert = ScriptedExpert()
    obs = env.reset(seed=seed)
    trajectory = [obs["state"], obs["cube_pos"]]
    while True:
        obs, _, terminated, truncated, _ = env.step(expert.act(obs))
        trajectory += [obs["state"], obs["cube_pos"]]
        if terminated or truncated:
            env.close()
            return np.concatenate(trajectory)


def test_same_seed_gives_identical_trajectory():
    np.testing.assert_array_equal(expert_trajectory(7, 2), expert_trajectory(7, 2))


def test_constructor_seed_matches_reset_seed():
    first = PickCubeEnv(seed=5, render=False).reset()
    second = PickCubeEnv(render=False).reset(seed=5)
    np.testing.assert_array_equal(first["cube_pos"], second["cube_pos"])


def test_different_seeds_give_different_layouts(env):
    first = env.reset(seed=1)["cube_pos"]
    second = env.reset(seed=2)["cube_pos"]
    assert not np.allclose(first, second)


# ----- 脚本专家 -------------------------------------------------------------


def test_scripted_expert_succeeds_on_seeds_0_to_19(env):
    successes = sum(run_expert_episode(env, seed)[0] for seed in range(20))
    assert successes >= 18


def test_scripted_expert_succeeds_with_distractors():
    env = PickCubeEnv(render=False, n_distractors=2)
    successes = sum(run_expert_episode(env, seed)[0] for seed in range(20))
    env.close()
    assert successes >= 18


def test_expert_actions_are_valid(env):
    expert = ScriptedExpert()
    obs = env.reset(seed=3)
    while True:
        action = expert.act(obs)
        assert action.shape == (4,) and action.dtype == np.float32
        assert np.all(np.abs(action[:3]) <= MAX_DELTA + 1e-7)
        assert action[3] in (0.0, 1.0)
        obs, _, terminated, truncated, _ = env.step(action)
        if terminated or truncated:
            break


# ----- 评估与随机基线 --------------------------------------------------------


def test_random_policy_almost_never_succeeds():
    result = evaluate(RandomPolicy(seed=0), episodes=20, seed=0, render=False)
    assert result["n_success"] <= 1


def test_evaluate_expert_result_format():
    result = evaluate(ScriptedExpert(), episodes=20, seed=0, render=False, allow_privileged=True)
    assert set(result) == {"success_rate", "n_success", "n_episodes", "seed_start", "per_episode"}
    assert result["n_episodes"] == 20
    assert [episode["seed"] for episode in result["per_episode"]] == list(range(20))
    assert result["success_rate"] >= 0.9


def test_evaluate_hides_privileged_cube_pos():
    seen_keys = []

    def spy_policy(obs, task):
        seen_keys.append(set(obs))
        assert task == TASK
        return np.zeros(4, dtype=np.float32)

    evaluate(spy_policy, episodes=1, seed=0, render=False, max_steps=3)
    assert seen_keys == [{"state"}] * 3
    with pytest.raises(KeyError):  # 专家必须看 cube_pos，不开 allow_privileged 就拿不到
        evaluate(ScriptedExpert(), episodes=1, seed=0, render=False)


def test_evaluate_cli_prints_success_rate(capsys):
    result = evaluate_main(["--policy", "random", "--episodes", "2", "--max-steps", "10"])
    assert result["n_episodes"] == 2
    assert "success_rate" in capsys.readouterr().out


# ----- 录制示范数据 -----------------------------------------------------------


def test_record_demos_writes_expected_files(tmp_path):
    meta = record_demos(episodes=3, out_dir=tmp_path, seed=0, render=False)
    assert meta["success_count"] == 3
    expected_files = [f"episode_{i:04d}.npz" for i in range(3)] + ["meta.json"]
    assert sorted(p.name for p in tmp_path.iterdir()) == expected_files

    saved_meta = json.loads((tmp_path / "meta.json").read_text(encoding="utf-8"))
    assert saved_meta == meta
    assert saved_meta["fps"] == 10 and saved_meta["task"] == TASK
    assert saved_meta["seeds"] == [0, 1, 2] and saved_meta["failed_seeds"] == []
    assert len(saved_meta["state_semantics"]) == 4 and len(saved_meta["action_semantics"]) == 4

    for episode in saved_meta["episodes"]:
        with np.load(tmp_path / episode["file"]) as data:
            assert set(data.files) == {"states", "actions"}  # render=False → 没有 images
            states, actions = data["states"], data["actions"]
        assert states.shape == (episode["length"], 4) and states.dtype == np.float32
        assert actions.shape == (episode["length"], 4) and actions.dtype == np.float32
        assert np.all(np.abs(actions[:, :3]) <= MAX_DELTA + 1e-7)


def test_record_demos_cli_and_overwrite_protection(tmp_path, capsys):
    out = tmp_path / "demos"
    record_demos_main(["--episodes", "2", "--out", str(out), "--seed", "5", "--no-render"])
    assert "success_rate" in capsys.readouterr().out
    assert sorted(p.name for p in out.iterdir()) == ["episode_0000.npz", "episode_0001.npz", "meta.json"]

    with pytest.raises(FileExistsError):  # 默认不覆盖旧数据
        record_demos_main(["--episodes", "1", "--out", str(out), "--no-render"])

    meta = record_demos_main(["--episodes", "1", "--out", str(out), "--no-render", "--overwrite"])
    assert meta["episodes_attempted"] == 1
    assert sorted(p.name for p in out.iterdir()) == ["episode_0000.npz", "meta.json"]


# ----- 渲染 -----------------------------------------------------------------


def test_headless_linux_without_mujoco_gl_gives_clear_error(monkeypatch):
    """没有显示器又没设 MUJOCO_GL 时，应该得到看得懂的报错，而不是让 Python 直接崩溃。"""
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.delenv("DISPLAY", raising=False)
    monkeypatch.delenv("WAYLAND_DISPLAY", raising=False)
    monkeypatch.delenv("MUJOCO_GL", raising=False)
    with pytest.raises(RuntimeError, match="MUJOCO_GL"):
        PickCubeEnv(render=True)  # 在创建渲染器之前就报错，不会真的去碰图形库
    monkeypatch.setenv("MUJOCO_GL", "egl")
    check_rendering_backend()  # 设置了 egl 就不报错


# 下面两个测试会真的渲染图像，需要 LAB_RENDER=1


@needs_render
def test_rendered_image_is_valid():
    env = PickCubeEnv(render=True, image_size=(96, 128))
    obs = env.reset(seed=0)
    image = obs["image"]
    assert image.shape == (96, 128, 3) and image.dtype == np.uint8
    assert image.std() > 5  # 不是一张纯色图
    red = (image[..., 0] > 120) & (image[..., 1] < 60) & (image[..., 2] < 60)
    assert red.sum() > 5  # 画面里能看到红色方块
    top = env.render("top")
    assert top.shape == (96, 128, 3) and top.std() > 5
    next_obs, *_ = env.step([0.02, 0.0, -0.02, 0.0])
    assert not np.array_equal(next_obs["image"], image)  # 夹爪动了，画面也要变
    env.close()


@needs_render
def test_record_demos_saves_images(tmp_path):
    meta = record_demos(episodes=1, out_dir=tmp_path, seed=0, render=True, image_size=(64, 80))
    episode = meta["episodes"][0]
    with np.load(tmp_path / episode["file"]) as data:
        images = data["images"]
    assert images.shape == (episode["length"], 64, 80, 3)
    assert images.dtype == np.uint8
    assert images.std() > 5
    assert meta["image_size_hw"] == [64, 80] and meta["camera"] == "front"
