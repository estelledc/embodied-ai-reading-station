import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("agent progression is bounded and single-writer", () => {
  const agents = read("AGENTS.md");

  assert.match(
    agents,
    /objective[\s\S]*scope[\s\S]*acceptance_checks[\s\S]*budget[\s\S]*external_outcome[\s\S]*stop_conditions/,
  );
  assert.match(agents, /最多 3 个切片/);
  assert.match(agents, /120 分钟/);
  assert.match(agents, /同时只允许 1 个可写切片/);
  assert.match(agents, /不需要逐片重新确认/);
  assert.match(agents, /连续 3 个 agent 批次没有 external delta/);
  assert.match(agents, /commit、push、创建 PR、merge 和 deploy 是不同动作/);
  assert.match(agents, /连续 campaign/);
  assert.match(agents, /12 个 run 或 24 小时/);
  assert.match(agents, /自动开启下一 run/);
  assert.match(agents, /一个“agent 批次”指一个完成验收并写入 checkpoint 的 run/);
});

test("the operations index does not turn the roadmap into an autonomous queue", () => {
  const operations = read("docs/operations-index.md");
  const plan = read("PLAN-1.3.md");

  assert.match(operations, /唯一的活动操作入口/);
  assert.match(operations, /集成收口/);
  assert.match(operations, /不直接进入 PLAN 的 Batch 8 Lab、Batch 9 核验/);
  assert.match(operations, /verify -> checkpoint -> check campaign gates -> auto-start next run or handoff/);
  assert.match(plan, /不是自动执行队列/);
  assert.match(plan, /run contract/);
});

test("handoff records lifecycle fields for an explicit bounded campaign", () => {
  const handoff = read("SESSION-HANDOFF.md");

  for (const field of [
    "status",
    "scope",
    "activated_by",
    "review_after",
    "total_budget",
    "external_outcome",
    "superseded_by",
    "start_ref",
  ]) {
    assert.match(handoff, new RegExp(`^${field}:`, "m"));
  }
  assert.match(handoff, /start_ref: [0-9a-f]{40}/);
  assert.match(handoff, /^status: active_campaign/m);
  assert.match(handoff, /run budget/);
  assert.match(handoff, /stop_conditions/);
  assert.match(handoff, /源实现锚点/);
  assert.match(handoff, /下一条命令/);
  assert.match(handoff, /禁止 force push/);
});

test("deep-read remains an explicit opt-in workflow with portable paths", () => {
  const deepRead = read("AGENT-DEEPREAD.md");

  assert.match(deepRead, /显式 opt-in/);
  assert.match(deepRead, /不是默认持续推进入口/);
  assert.doesNotMatch(deepRead, /\/Users\//);
});
