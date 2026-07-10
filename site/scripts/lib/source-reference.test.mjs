import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateSourceReference } from "./source-reference.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eai-source-"));
  const paperDir = path.join(root, "papers", "demo");
  fs.mkdirSync(paperDir, { recursive: true });
  fs.writeFileSync(path.join(paperDir, "paper.md"), "parsed paper\n");
  return root;
}

test("accepts credential-free HTTPS sources", () => {
  const result = validateSourceReference({
    root: fixture(),
    noteSlug: "demo",
    source: "https://arxiv.org/abs/1234.5678",
  });
  assert.equal(result.ok, true);
  assert.equal(result.kind, "remote");
});

test("rejects unsafe remote protocols and credentials", () => {
  for (const source of [
    "http://example.com/paper",
    "javascript:alert(1)",
    "https://user:pass@example.com/paper",
  ]) {
    assert.equal(validateSourceReference({ root: fixture(), noteSlug: "demo", source }).ok, false);
  }
});

test("requires the exact local source file", () => {
  const root = fixture();
  assert.equal(validateSourceReference({
    root,
    noteSlug: "demo",
    source: "papers/demo/paper.md",
  }).ok, true);
  const missingPdf = validateSourceReference({
    root,
    noteSlug: "demo",
    source: "papers/demo/paper.pdf",
  });
  assert.equal(missingPdf.ok, false);
  assert.match(missingPdf.reason, /does not exist/);
});

test("rejects traversal, slug mismatch, and symlink evidence", () => {
  const root = fixture();
  assert.equal(validateSourceReference({
    root,
    noteSlug: "demo",
    source: "papers/../demo/paper.md",
  }).ok, false);
  assert.equal(validateSourceReference({
    root,
    noteSlug: "other",
    source: "papers/demo/paper.md",
  }).ok, false);
  fs.symlinkSync(path.join(root, "papers", "demo", "paper.md"), path.join(root, "papers", "demo", "linked.md"));
  assert.equal(validateSourceReference({
    root,
    noteSlug: "demo",
    source: "papers/demo/linked.md",
  }).ok, false);
});

test("validates an optional provenance manifest hash", () => {
  const root = fixture();
  const source = "papers/demo/paper.md";
  const valid = validateSourceReference({
    root,
    noteSlug: "demo",
    source,
    manifest: [{
      slug: "demo",
      path: source,
      sha256: "bf03dae418fd884193db6e7b4ea47a6395c92ac397dd91a0dd85501bc76028f1",
    }],
  });
  assert.equal(valid.ok, true);

  const invalid = validateSourceReference({
    root,
    noteSlug: "demo",
    source,
    manifest: [{ slug: "demo", path: source, sha256: "0".repeat(64) }],
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.reason, /hash mismatch/);
});
