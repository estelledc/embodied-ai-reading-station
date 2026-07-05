// content.mjs 纯函数单元测试：inferTags。
import { test } from "node:test";
import assert from "node:assert/strict";
import { inferTags } from "./content.mjs";

test("inferTags: 命中标题与正文关键词", () => {
  const note = {
    title: "Diffusion Policy",
    body: "denoising for robot manipulation with a transformer backbone",
  };
  const tags = inferTags(note);
  assert.ok(tags.includes("diffusion"));
  assert.ok(tags.includes("transformer"));
  assert.ok(tags.includes("manipulation"));
});

test("inferTags: 无关键词命中返回空数组", () => {
  const tags = inferTags({ title: "无关标题", body: "没有任何英文关键词的正文。" });
  assert.deepEqual(tags, []);
});

test("inferTags: body 缺省不抛错", () => {
  const tags = inferTags({ title: "CLIP" });
  assert.ok(Array.isArray(tags));
  assert.ok(tags.includes("vision"));
});

test("inferTags: 最多 6 个 tag", () => {
  const note = {
    title: "kitchen sink",
    body: "diffusion denoising, flow matching, transformer self-attention, mamba SSM, point cloud voxel, LLM language model, visual RGB camera",
  };
  assert.equal(inferTags(note).length, 6);
});
