"""check_env 必须在什么都没装的机器上也能跑完，并给出每一项的结论。"""

from __future__ import annotations

import check_env


def test_collect_reports_every_item():
    results = check_env.collect()
    names = [item["name"] for item in results]
    assert "Python" in names and "NVIDIA 显卡" in names and "多模态模型 API" in names
    for item in results:
        assert item["status"] in {"ok", "warn", "fail"}
        assert item["detail"]


def test_main_returns_exit_code(capsys):
    code = check_env.main()
    output = capsys.readouterr().out
    assert code in (0, 1)
    assert "Python" in output
