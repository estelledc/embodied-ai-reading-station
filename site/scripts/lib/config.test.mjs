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
  return execFileSync(process.execPath, ["--input-type=module", "-e", script], { env }).toString();
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
