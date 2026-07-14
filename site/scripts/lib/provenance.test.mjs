import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadNotes } from "./content.mjs";
import {
  buildProvenanceV2,
  checkProvenanceFile,
  generateProvenanceFile,
  loadCanonicalNotes,
  migrateProvenanceV1ToV2,
  resolveContentCommit,
  serializeProvenanceDocument,
  writeJsonAtomically,
} from "./provenance.mjs";
import { validateProvenanceDocument } from "./provenance-schema.mjs";
import {
  formatProvenanceRepositoryErrors,
  validateProvenanceRepositoryFile,
} from "./provenance-validator.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const BASE_COMMIT = "5b02c23a3184cc2c2857fd5b6383780714a2f502";
const COMMIT_A = "0123456789abcdef0123456789abcdef01234567";
const COMMIT_B = "fedcba9876543210fedcba9876543210fedcba98";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eai-provenance-"));
  fs.mkdirSync(path.join(root, "notes"), { recursive: true });
  fs.mkdirSync(path.join(root, "papers", "demo-local"), { recursive: true });
  const localPaper = "parsed paper\n";
  fs.writeFileSync(path.join(root, "papers", "demo-local", "paper.md"), localPaper);
  fs.writeFileSync(path.join(root, "notes", "demo-local.md"), [
    "---",
    "num: 1",
    "topic: demo",
    "title: Demo Local",
    "来源: papers/demo-local/paper.md",
    "---",
    "# Demo Local",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "notes", "demo-remote.md"), [
    "---",
    "num: 1",
    "topic: demo",
    "title: Demo Remote",
    "来源: https://arxiv.org/abs/1234.5678",
    "---",
    "# Demo Remote",
    "",
  ].join("\n"));
  const v1 = {
    schema_version: "1.0.0",
    algorithm: "sha256",
    entries: [{
      slug: "demo-local",
      path: "papers/demo-local/paper.md",
      sha256: sha256(localPaper),
      artifact_type: "parsed-paper-markdown",
    }],
  };
  return { root, v1 };
}

test("loadCanonicalNotes enumerates every repository note in slug order", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "papers", "provenance.json"), "utf8"));
  const notes = loadCanonicalNotes({ root: REPO_ROOT, previousManifest: manifest, contentCommit: manifest.content_commit ?? COMMIT_A });
  assert.equal(notes.length, 170);
  assert.equal(new Set(notes.map((note) => note.slug)).size, 170);
  assert.deepEqual(notes.map((note) => note.slug), [...notes.map((note) => note.slug)].sort());
  assert.ok(notes.every((note) => /^notes\/[a-z0-9-]+\.md$/.test(note.note_path)));
  assert.ok(notes.every((note) => /^[a-f0-9]{64}$/.test(note.note_sha256)));
  assert.ok(notes.every((note) => (
    note.note_sha256 === sha256(fs.readFileSync(path.join(REPO_ROOT, note.note_path)))
  )));
  assert.equal(notes.filter((note) => note.source.kind === "local").length, 46);
  assert.equal(notes.filter((note) => note.source.kind === "remote").length, 124);
  assert.ok(notes.filter((note) => note.source.kind === "remote").every((note) => (
    note.source.path === null
    && note.source.sha256 === null
    && note.source.artifact_type === null
  )));

  const contentBySlug = new Map(loadNotes().map((note) => [note.slug, note]));
  for (const note of notes) {
    const contentNote = contentBySlug.get(note.slug);
    assert.equal(contentNote.notePath, note.note_path);
    assert.equal(contentNote.noteSha256, note.note_sha256);
    assert.equal(contentNote.sourcePath, note.source.kind === "local" ? note.source.path : note.source.url);
  }
});

test("real migration preserves the frozen 46-entry local evidence set exactly", () => {
  const v1 = JSON.parse(execFileSync("git", ["show", `${BASE_COMMIT}:papers/provenance.json`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }));
  const migrated = migrateProvenanceV1ToV2({ root: REPO_ROOT, v1Manifest: v1, contentCommit: BASE_COMMIT });
  const localEvidence = migrated.notes
    .filter((note) => note.source.kind === "local")
    .map((note) => ({
      slug: note.slug,
      path: note.source.path,
      sha256: note.source.sha256,
      artifact_type: note.source.artifact_type,
    }));
  assert.deepEqual(localEvidence, [...v1.entries].sort((a, b) => a.slug.localeCompare(b.slug, "en")));
});

test("v1 migration preserves local evidence and normalizes all records", () => {
  const { root, v1 } = fixtureRoot();
  const document = migrateProvenanceV1ToV2({ root, v1Manifest: v1, contentCommit: COMMIT_A });

  assert.deepEqual(validateProvenanceDocument(document), { ok: true, errors: [] });
  assert.equal(document.notes.length, 2);
  assert.deepEqual(document.notes.map((note) => note.slug), ["demo-local", "demo-remote"]);
  const local = document.notes.find((note) => note.slug === "demo-local");
  assert.deepEqual(
    { path: local.source.path, sha256: local.source.sha256, artifact_type: local.source.artifact_type },
    { path: v1.entries[0].path, sha256: v1.entries[0].sha256, artifact_type: v1.entries[0].artifact_type },
  );
  assert.equal(document.notes.filter((note) => note.source.kind === "local").length, 1);
  assert.equal(document.notes.filter((note) => note.source.kind === "remote").length, 1);
  assert.ok(document.notes.every((note) => note.human_verification.status === "UNVERIFIED"));
  assert.ok(document.notes.every((note) => note.generated_assets.length === 0));
});

test("same inputs serialize deterministically and v2 rebuild preserves reviewed state", () => {
  const { root, v1 } = fixtureRoot();
  const first = migrateProvenanceV1ToV2({ root, v1Manifest: v1, contentCommit: COMMIT_A });
  const second = migrateProvenanceV1ToV2({ root, v1Manifest: v1, contentCommit: COMMIT_A });
  assert.equal(serializeProvenanceDocument(first), serializeProvenanceDocument(second));

  const reviewed = first.notes.find((note) => note.slug === "demo-remote");
  reviewed.human_verification = {
    status: "VERIFIED",
    by: "a",
    date: "2026-07-11",
    scope: "note-and-source",
    blocked_reason: null,
  };
  reviewed.generated_assets = [{
    kind: "card",
    tracked: true,
    path: "site/src/images/cards/demo-remote.webp",
    sha256: "a".repeat(64),
    generator: "card-generator-v1",
    input_fingerprint: "b".repeat(64),
    content_commit: COMMIT_A,
  }];
  first.notes.reverse();
  const rebuilt = buildProvenanceV2({ root, previousManifest: first, contentCommit: COMMIT_A });
  const rebuiltReviewed = rebuilt.notes.find((note) => note.slug === "demo-remote");
  assert.deepEqual(rebuiltReviewed.human_verification, reviewed.human_verification);
  assert.deepEqual(rebuiltReviewed.generated_assets, reviewed.generated_assets);
  const refreshed = buildProvenanceV2({ root, previousManifest: first, contentCommit: COMMIT_B });
  assert.deepEqual(refreshed.notes.find((note) => note.slug === "demo-remote").generated_assets, [{
    kind: "card",
    tracked: true,
    path: "site/src/images/cards/demo-remote.webp",
    sha256: "a".repeat(64),
    generator: "card-generator-v1",
    input_fingerprint: "b".repeat(64),
    content_commit: COMMIT_B,
  }]);
});

test("content changes cannot reuse a stale snapshot and a new snapshot resets review evidence", () => {
  const { root, v1 } = fixtureRoot();
  const first = migrateProvenanceV1ToV2({ root, v1Manifest: v1, contentCommit: COMMIT_A });
  first.notes.find((note) => note.slug === "demo-remote").human_verification = {
    status: "VERIFIED",
    by: "a",
    date: "2026-07-11",
    scope: "note-and-source",
    blocked_reason: null,
  };
  fs.appendFileSync(path.join(root, "notes", "demo-remote.md"), "changed\n");

  assert.throws(
    () => buildProvenanceV2({ root, previousManifest: first, contentCommit: COMMIT_A }),
    /changed.*content_commit|content_commit.*changed/i,
  );
  const refreshed = buildProvenanceV2({ root, previousManifest: first, contentCommit: COMMIT_B });
  assert.equal(refreshed.notes.find((note) => note.slug === "demo-remote").human_verification.status, "UNVERIFIED");
  assert.deepEqual(refreshed.notes.find((note) => note.slug === "demo-remote").generated_assets, []);
});

test("generator orchestration fails before changing a target with bad legacy evidence", () => {
  const { root, v1 } = fixtureRoot();
  const target = path.join(root, "papers", "provenance.json");
  v1.entries[0].sha256 = "0".repeat(64);
  const original = `${JSON.stringify(v1, null, 2)}\n`;
  fs.writeFileSync(target, original);

  assert.throws(() => generateProvenanceFile({
    root,
    filePath: target,
    env: { PROVENANCE_CONTENT_COMMIT: COMMIT_A },
  }), /hash mismatch/i);
  assert.equal(fs.readFileSync(target, "utf8"), original);
});

test("generator orchestration migrates atomically and check mode makes no write", () => {
  const { root, v1 } = fixtureRoot();
  const target = path.join(root, "papers", "provenance.json");
  fs.writeFileSync(target, `${JSON.stringify(v1, null, 2)}\n`);

  const generated = generateProvenanceFile({
    root,
    filePath: target,
    env: { PROVENANCE_CONTENT_COMMIT: COMMIT_A },
  });
  assert.equal(generated.ok, true);
  assert.equal(generated.document.schema_version, "2.0.0");
  const beforeCheck = fs.readFileSync(target);
  const checked = generateProvenanceFile({ root, filePath: target, checkOnly: true, env: {} });
  assert.equal(checked.ok, true);
  assert.deepEqual(fs.readFileSync(target), beforeCheck);

  fs.appendFileSync(target, " ");
  const driftBytes = fs.readFileSync(target);
  const drift = generateProvenanceFile({ root, filePath: target, checkOnly: true, env: {} });
  assert.equal(drift.ok, false);
  assert.deepEqual(fs.readFileSync(target), driftBytes);
});

test("atomic writer validates first and keeps the target on rename failure", () => {
  const { root, v1 } = fixtureRoot();
  const document = migrateProvenanceV1ToV2({ root, v1Manifest: v1, contentCommit: COMMIT_A });
  const target = path.join(root, "papers", "provenance.json");
  fs.writeFileSync(target, "old\n");

  const invalid = structuredClone(document);
  invalid.content_commit = "invalid";
  assert.throws(() => writeJsonAtomically(target, invalid), /content_commit/i);
  assert.equal(fs.readFileSync(target, "utf8"), "old\n");

  const failingFs = new Proxy(fs, {
    get(value, property) {
      if (property === "renameSync") return () => { throw new Error("rename failed"); };
      return Reflect.get(value, property);
    },
  });
  assert.throws(() => writeJsonAtomically(target, document, { fsImpl: failingFs }), /rename failed/);
  assert.equal(fs.readFileSync(target, "utf8"), "old\n");
  assert.deepEqual(fs.readdirSync(path.dirname(target)).sort(), ["demo-local", "provenance.json"]);

  writeJsonAtomically(target, document);
  assert.equal(fs.readFileSync(target, "utf8"), serializeProvenanceDocument(document));
});

test("atomic writer fsyncs before rename and cleans up an fsync failure", () => {
  const { root, v1 } = fixtureRoot();
  const document = migrateProvenanceV1ToV2({ root, v1Manifest: v1, contentCommit: COMMIT_A });
  const target = path.join(root, "papers", "provenance.json");
  fs.writeFileSync(target, "old\n");
  const calls = [];
  const observedFs = new Proxy(fs, {
    get(value, property) {
      if (["writeFileSync", "fsyncSync", "closeSync", "renameSync"].includes(property)) {
        return (...args) => {
          calls.push(property);
          return Reflect.apply(value[property], value, args);
        };
      }
      return Reflect.get(value, property);
    },
  });
  writeJsonAtomically(target, document, { fsImpl: observedFs });
  assert.deepEqual(calls, ["writeFileSync", "fsyncSync", "closeSync", "renameSync"]);

  fs.writeFileSync(target, "old\n");
  const failingFs = new Proxy(fs, {
    get(value, property) {
      if (property === "fsyncSync") return () => { throw new Error("fsync failed"); };
      return Reflect.get(value, property);
    },
  });
  assert.throws(() => writeJsonAtomically(target, document, { fsImpl: failingFs }), /fsync failed/);
  assert.equal(fs.readFileSync(target, "utf8"), "old\n");
  assert.deepEqual(fs.readdirSync(path.dirname(target)).sort(), ["demo-local", "provenance.json"]);
});

test("check mode compares exact bytes without writing", () => {
  const { root, v1 } = fixtureRoot();
  const document = migrateProvenanceV1ToV2({ root, v1Manifest: v1, contentCommit: COMMIT_A });
  const target = path.join(root, "papers", "provenance.json");
  fs.writeFileSync(target, serializeProvenanceDocument(document));

  assert.equal(checkProvenanceFile(target, document).ok, true);
  fs.appendFileSync(target, " ");
  const driftBytes = fs.readFileSync(target);
  const drift = checkProvenanceFile(target, document);
  assert.equal(drift.ok, false);
  assert.equal(drift.expected_sha256, sha256(serializeProvenanceDocument(document)));
  assert.equal(drift.actual_sha256, sha256(driftBytes));
  assert.deepEqual(fs.readFileSync(target), driftBytes);
});

test("content commit resolution is explicit, stable, and fail closed", () => {
  assert.equal(resolveContentCommit({ root: REPO_ROOT, env: { PROVENANCE_CONTENT_COMMIT: COMMIT_B } }), COMMIT_B);
  assert.equal(resolveContentCommit({
    root: REPO_ROOT,
    env: {},
    existingManifest: { schema_version: "2.0.0", content_commit: COMMIT_A },
  }), COMMIT_A);
  assert.equal(resolveContentCommit({
    root: REPO_ROOT,
    env: {},
    execFileSyncImpl: () => `${COMMIT_B}\n`,
  }), COMMIT_B);
  assert.throws(
    () => resolveContentCommit({ root: REPO_ROOT, env: { PROVENANCE_CONTENT_COMMIT: "HEAD" } }),
    /40 lowercase/i,
  );
});

test("production CLI --check exercises the tracked entry point without writing", () => {
  const target = path.join(REPO_ROOT, "papers", "provenance.json");
  const before = fs.readFileSync(target);
  const output = execFileSync(process.execPath, [path.join(REPO_ROOT, "site", "scripts", "generate-provenance.mjs"), "--check"], {
    cwd: path.join(REPO_ROOT, "site"),
    encoding: "utf8",
  });
  assert.match(output, /papers\/provenance\.json is current \(170 notes\)/);
  assert.deepEqual(fs.readFileSync(target), before);
});

test("tracked generator output passes the independent repository gate", () => {
  const result = validateProvenanceRepositoryFile({ root: REPO_ROOT, expectedNoteCount: 170 });
  assert.equal(result.ok, true, formatProvenanceRepositoryErrors(result.errors));
  assert.deepEqual(result.stats, {
    notes: 170,
    local_sources: 46,
    remote_sources: 124,
    generated_assets: 114,
    checked_paths: 330,
  });
});
