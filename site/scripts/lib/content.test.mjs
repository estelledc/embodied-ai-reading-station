// content.mjs 纯函数单元测试：inferTags。
import { test } from "node:test";
import assert from "node:assert/strict";
import { PAPERS, comparePaperDisplayOrder, inferTags, loadNotes } from "./content.mjs";

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

test("PAPERS uses slug as the deterministic tie-break for duplicate display numbers", () => {
  const reversedTie = [{ num: 7, slug: "zeta" }, { num: 7, slug: "alpha" }];
  assert.deepEqual(reversedTie.sort(comparePaperDisplayOrder).map((paper) => paper.slug), ["alpha", "zeta"]);
  const sorted = [...PAPERS].sort(comparePaperDisplayOrder);
  assert.deepEqual(PAPERS.map((paper) => paper.slug), sorted.map((paper) => paper.slug));
});

test("loadNotes exposes canonical path, hash, source, and lifecycle fields without changing view shape", () => {
  const notes = loadNotes();
  assert.equal(notes.length, 166);
  assert.ok(notes.every((note) => note.notePath === `notes/${note.slug}.md`));
  assert.ok(notes.every((note) => /^[a-f0-9]{64}$/.test(note.noteSha256)));
  assert.ok(notes.every((note) => typeof note.sourcePath === "string" && note.sourcePath.length > 0));
  assert.ok(notes.every((note) => note.generated_at === null || /^\d{4}-\d{2}-\d{2}$/.test(note.generated_at)));
  assert.ok(notes.every((note) => note.content_modified === null || /^\d{4}-\d{2}-\d{2}$/.test(note.content_modified)));
  assert.equal(notes.find((note) => note.slug === "audiolm").generated_at, "2026-07-01");
});
