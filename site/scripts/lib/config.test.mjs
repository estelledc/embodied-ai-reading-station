// config.mjs url() 单元测试：BASE 为空 / 非空两种场景。
// config.mjs 在模块加载期读 SITE_BASE 环境变量，因此用子进程隔离两种场景。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const configPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "config.mjs");

function urlInEnv(siteBase, input) {
  const env = { ...process.env };
  delete env.SITE_BASE;
  if (siteBase !== null) env.SITE_BASE = siteBase;
  const script = `import { url } from ${JSON.stringify(configPath)}; process.stdout.write(url(${JSON.stringify(input)}));`;
  return execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();
}

function configValueInEnv(sourceDateEpoch, expression) {
  const env = { ...process.env };
  delete env.SOURCE_DATE_EPOCH;
  if (sourceDateEpoch !== null) env.SOURCE_DATE_EPOCH = sourceDateEpoch;
  const script = `import * as config from ${JSON.stringify(configPath)}; process.stdout.write(String(${expression}));`;
  return execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();
}

test("url(): SITE_BASE 未设置时原样返回绝对路径", () => {
  assert.equal(urlInEnv(null, "/papers/clip/"), "/papers/clip/");
});

test("url(): SITE_BASE 未设置时给相对路径补前导斜杠", () => {
  assert.equal(urlInEnv(null, "feed.xml"), "/feed.xml");
});

test("url(): SITE_BASE 非空时加前缀", () => {
  assert.equal(
    urlInEnv("/embodied-ai-reading-station", "/papers/clip/"),
    "/embodied-ai-reading-station/papers/clip/"
  );
});

test("url(): SITE_BASE 末尾斜杠被剥掉，不产生双斜杠", () => {
  assert.equal(urlInEnv("/repo/", "/topics/"), "/repo/topics/");
});

test("GENERATED_AT: SOURCE_DATE_EPOCH 固定构建元数据", () => {
  assert.equal(
    configValueInEnv("1751500000", "config.GENERATED_AT"),
    "2025-07-02T23:46:40.000Z"
  );
});

test("SOURCE_DATE_EPOCH: 非法值 fail closed", () => {
  assert.throws(
    () => configValueInEnv("not-a-timestamp", "config.GENERATED_AT"),
    /SOURCE_DATE_EPOCH must be a non-negative integer Unix timestamp/
  );
});

test("normalizeContentDate: Date 与 ISO string 都归一为日期", async () => {
  const { normalizeContentDate } = await import("./config.mjs");
  assert.equal(normalizeContentDate(new Date("2026-07-01T08:30:00Z")), "2026-07-01");
  assert.equal(normalizeContentDate("2024-02-29"), "2024-02-29");
  assert.equal(normalizeContentDate("not-a-date"), null);
  assert.equal(normalizeContentDate(null), null);
});
