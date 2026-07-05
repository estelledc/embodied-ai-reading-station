// markdown.mjs 纯函数单元测试（node:test，零新依赖）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, extractTLDR, extractOutline, rewriteGuideLinks } from "./markdown.mjs";

// --- slugify ----------------------------------------------------------------
test("slugify: 中文保留、空格转连字符、转小写", () => {
  assert.equal(slugify("你好 World"), "你好-world");
  assert.equal(slugify("实验解读"), "实验解读");
});

test("slugify: 特殊字符剔除，全特殊字符时兜底 section", () => {
  assert.equal(slugify("A/B: Test!"), "ab-test");
  assert.equal(slugify("!!!???"), "section");
});

test("slugify: 截断到 50 字符", () => {
  assert.equal(slugify("a".repeat(80)).length, 50);
});

test("slugify: 重复调用稳定（纯函数）", () => {
  const input = "方法：Diffusion Policy 怎么去噪";
  const first = slugify(input);
  for (let i = 0; i < 5; i++) assert.equal(slugify(input), first);
});

// --- extractTLDR ------------------------------------------------------------
test("extractTLDR: 标准「一句话讲什么」小节取第一段实质内容", () => {
  const md = "## 一句话讲什么\n\nCLIP 把图文放进同一坐标系。\n\n## 场景\n\n别的内容";
  assert.equal(extractTLDR(md), "CLIP 把图文放进同一坐标系。");
});

test("extractTLDR: TL;DR 标题变体也识别", () => {
  const md = "## TL;DR\n\nOne sentence summary here.\n\n## Next\n\nother";
  assert.equal(extractTLDR(md), "One sentence summary here.");
});

test("extractTLDR: 缺小节时兜底第一个实质段落", () => {
  const md = "# 标题\n\n> 引用不算\n\n前言段落在这里。\n\n## 方法\n\n正文";
  assert.equal(extractTLDR(md), "前言段落在这里。");
});

test("extractTLDR: 截断到 140 字符", () => {
  const long = "字".repeat(300);
  const md = `## 一句话讲什么\n\n${long}\n`;
  assert.equal(extractTLDR(md).length, 140);
});

// --- extractOutline ---------------------------------------------------------
test("extractOutline: 提取全部 H2，重复标题 id 加序号", () => {
  const md = "## 场景\n\nx\n\n## 方法\n\ny\n\n## 方法\n\nz\n\n### H3 不算\n";
  assert.deepEqual(extractOutline(md), [
    { id: "场景", text: "场景" },
    { id: "方法", text: "方法" },
    { id: "方法-2", text: "方法" },
  ]);
});

test("extractOutline: 无 H2 时返回空数组", () => {
  assert.deepEqual(extractOutline("# 只有 H1\n\n正文而已\n"), []);
});

// --- rewriteGuideLinks --------------------------------------------------------
test("rewriteGuideLinks: ../guide/x.md 重写为站内路径", () => {
  assert.equal(
    rewriteGuideLinks("[Ch01](../guide/ch01-why-embodied-ai.md)"),
    "[Ch01](/guide/ch01-why-embodied-ai/)"
  );
});

test("rewriteGuideLinks: guide/x.md#anchor 保留锚点", () => {
  assert.equal(
    rewriteGuideLinks("[节](guide/ch02-foo.md#some-anchor)"),
    "[节](/guide/ch02-foo/#some-anchor)"
  );
});

test("rewriteGuideLinks: 外链不重写", () => {
  const md = "[外](https://example.com/guide/ch01.md)";
  assert.equal(rewriteGuideLinks(md), md);
});
