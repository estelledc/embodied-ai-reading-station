import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import matter from "gray-matter";
import { validateProvenanceDocument } from "./provenance-schema.mjs";

// 独立的仓库事实门禁：只共享纯 schema，刻意不导入 provenance generator；
// frontmatter locator 也在本模块无 I/O 解析，避免绕过逐段 lstat 的唯一安全读取通道。
const PHASES = ["schema", "current", "snapshot"];
const PHASE_ORDER = new Map(PHASES.map((phase, index) => [phase, index]));
const SAFE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNSAFE_TEXT_RE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const UNSAFE_TEXT_RE_GLOBAL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
const MAX_GIT_OUTPUT = 64 * 1024 * 1024;
const MAX_BLOB_OUTPUT = 256 * 1024 * 1024;
const REGULAR_GIT_MODES = new Set(["100644", "100755"]);
const LOCAL_SOURCE_RE = /^papers\/([^/]+)\/(paper\.(?:md|pdf))$/;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isSafeRepositoryPath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || UNSAFE_TEXT_RE.test(value)) return false;
  if (value.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  const segments = value.split("/");
  return segments.every((segment) => segment && segment !== "." && segment !== "..")
    && path.posix.normalize(value) === value;
}

function sanitizeField(value) {
  return String(value ?? "$unknown")
    .replace(/[^a-zA-Z0-9_$.[\]-]/g, "?")
    .slice(0, 200);
}

function sanitizeMessage(value) {
  return String(value ?? "validation failed").replace(UNSAFE_TEXT_RE_GLOBAL, " ").slice(0, 300);
}

function createState() {
  return {
    errors: [],
    stats: {
      notes: 0,
      local_sources: 0,
      remote_sources: 0,
      generated_assets: 0,
      checked_paths: 0,
    },
  };
}

function addError(state, phase, {
  code,
  field = "$",
  slug = null,
  repoPath = null,
  message,
}) {
  state.errors.push({
    phase,
    code,
    field: sanitizeField(field),
    slug: typeof slug === "string" && SAFE_SLUG_RE.test(slug) ? slug : null,
    repo_path: isSafeRepositoryPath(repoPath) ? repoPath : null,
    message: sanitizeMessage(message),
  });
}

function addPrerequisiteErrors(state) {
  for (const phase of ["current", "snapshot"]) {
    addError(state, phase, {
      code: "PREREQUISITE_FAILED",
      message: "schema validation must pass before repository bytes are inspected",
    });
  }
}

function finalize(state) {
  state.errors.sort((a, b) => (
    (PHASE_ORDER.get(a.phase) ?? 99) - (PHASE_ORDER.get(b.phase) ?? 99)
    || String(a.slug).localeCompare(String(b.slug), "en")
    || a.field.localeCompare(b.field, "en")
    || String(a.repo_path).localeCompare(String(b.repo_path), "en")
    || a.code.localeCompare(b.code, "en")
  ));
  const phases = Object.fromEntries(PHASES.map((phase) => {
    const errors = state.errors.filter((error) => error.phase === phase);
    return [phase, { ok: errors.length === 0, errors }];
  }));
  return {
    ok: state.errors.length === 0,
    errors: state.errors,
    phases,
    stats: state.stats,
  };
}

function inspectRegularFile({ state, phase, rootReal, repoPath, field, slug, fsImpl }) {
  if (!isSafeRepositoryPath(repoPath)) {
    addError(state, phase, {
      code: "INVALID_REPOSITORY_PATH",
      field,
      slug,
      message: "path must be printable and repository-relative",
    });
    return null;
  }

  const segments = repoPath.split("/");
  let current = rootReal;
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fsImpl.lstatSync(current);
    } catch {
      addError(state, phase, {
        code: "PATH_MISSING",
        field,
        slug,
        repoPath,
        message: "declared repository path does not exist",
      });
      return null;
    }
    const final = index === segments.length - 1;
    if (stat.isSymbolicLink()) {
      addError(state, phase, {
        code: final ? "PATH_SYMLINK" : "INTERMEDIATE_SYMLINK",
        field,
        slug,
        repoPath,
        message: final ? "declared file must not be a symlink" : "path contains an intermediate symlink",
      });
      return null;
    }
    if (!final && !stat.isDirectory()) {
      addError(state, phase, {
        code: "PATH_COMPONENT_NOT_DIRECTORY",
        field,
        slug,
        repoPath,
        message: "an intermediate path component is not a directory",
      });
      return null;
    }
    if (final && !stat.isFile()) {
      addError(state, phase, {
        code: "PATH_NOT_REGULAR_FILE",
        field,
        slug,
        repoPath,
        message: "declared path must be a regular file",
      });
      return null;
    }
  }

  let real;
  try {
    real = fsImpl.realpathSync(current);
  } catch {
    addError(state, phase, {
      code: "PATH_REALPATH_FAILED",
      field,
      slug,
      repoPath,
      message: "declared path cannot be resolved safely",
    });
    return null;
  }
  if (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`)) {
    addError(state, phase, {
      code: "PATH_ESCAPES_ROOT",
      field,
      slug,
      repoPath,
      message: "declared path escapes the repository root",
    });
    return null;
  }
  try {
    return fsImpl.readFileSync(current);
  } catch {
    addError(state, phase, {
      code: "PATH_READ_FAILED",
      field,
      slug,
      repoPath,
      message: "declared file cannot be read",
    });
    return null;
  }
}

function inspectRepositoryDirectory({ state, phase, rootReal, repoPath, field, fsImpl }) {
  if (!isSafeRepositoryPath(repoPath)) {
    addError(state, phase, {
      code: "INVALID_REPOSITORY_PATH",
      field,
      message: "directory path must be printable and repository-relative",
    });
    return null;
  }
  let current = rootReal;
  for (const segment of repoPath.split("/")) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fsImpl.lstatSync(current);
    } catch {
      addError(state, phase, {
        code: "PATH_MISSING",
        field,
        repoPath,
        message: "repository directory does not exist",
      });
      return null;
    }
    if (stat.isSymbolicLink()) {
      addError(state, phase, {
        code: "INTERMEDIATE_SYMLINK",
        field,
        repoPath,
        message: "inventory directory must not contain or be a symlink",
      });
      return null;
    }
    if (!stat.isDirectory()) {
      addError(state, phase, {
        code: "PATH_NOT_DIRECTORY",
        field,
        repoPath,
        message: "inventory path must be a directory",
      });
      return null;
    }
  }
  let real;
  try {
    real = fsImpl.realpathSync(current);
  } catch {
    addError(state, phase, {
      code: "PATH_REALPATH_FAILED",
      field,
      repoPath,
      message: "repository directory cannot be resolved safely",
    });
    return null;
  }
  if (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`)) {
    addError(state, phase, {
      code: "PATH_ESCAPES_ROOT",
      field,
      repoPath,
      message: "repository directory escapes the root",
    });
    return null;
  }
  return current;
}

function execGitBuffer(root, args, execFileSyncImpl) {
  const output = execFileSyncImpl("git", args, {
    cwd: root,
    encoding: null,
    maxBuffer: MAX_GIT_OUTPUT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

function execGitText(root, args, execFileSyncImpl) {
  return execGitBuffer(root, args, execFileSyncImpl).toString("utf8").trim();
}

function parseNullList(buffer) {
  return buffer.toString("utf8").split("\0").filter(Boolean);
}

function readGitTree(root, ref, execFileSyncImpl) {
  const output = execGitBuffer(root, ["ls-tree", "-r", "-z", "--full-tree", ref], execFileSyncImpl);
  const tree = new Map();
  for (const row of parseNullList(output)) {
    const tab = row.indexOf("\t");
    if (tab === -1) throw new Error("invalid tree row");
    const [mode, type, oid] = row.slice(0, tab).split(" ");
    tree.set(row.slice(tab + 1), { mode, type, oid });
  }
  return tree;
}

function readGitIndex(root, execFileSyncImpl) {
  const output = execGitBuffer(root, ["ls-files", "--stage", "-z"], execFileSyncImpl);
  const index = new Map();
  for (const row of parseNullList(output)) {
    const tab = row.indexOf("\t");
    if (tab === -1) throw new Error("invalid index row");
    const [mode, oid, stage] = row.slice(0, tab).split(" ");
    const repoPath = row.slice(tab + 1);
    const entries = index.get(repoPath) ?? [];
    entries.push({ mode, oid, stage });
    index.set(repoPath, entries);
  }
  return index;
}

function readGitBlobs(root, oids, spawnSyncImpl) {
  const uniqueOids = [...new Set(oids)];
  if (uniqueOids.length === 0) return new Map();
  const result = spawnSyncImpl("git", ["cat-file", "--batch"], {
    cwd: root,
    input: `${uniqueOids.join("\n")}\n`,
    encoding: null,
    maxBuffer: MAX_BLOB_OUTPUT,
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    throw new Error("git blob batch failed");
  }

  const blobs = new Map();
  let offset = 0;
  for (const requestedOid of uniqueOids) {
    const lineEnd = result.stdout.indexOf(0x0a, offset);
    if (lineEnd === -1) throw new Error("git blob header missing");
    const header = result.stdout.subarray(offset, lineEnd).toString("ascii");
    const headerParts = header.split(" ");
    if (headerParts.length !== 3) throw new Error("invalid git blob header fields");
    const [actualOid, type, sizeText] = headerParts;
    const size = Number(sizeText);
    if (actualOid !== requestedOid || type !== "blob" || !Number.isSafeInteger(size) || size < 0) {
      throw new Error("invalid git blob header");
    }
    const contentStart = lineEnd + 1;
    const contentEnd = contentStart + size;
    if (contentEnd >= result.stdout.length || result.stdout[contentEnd] !== 0x0a) {
      throw new Error("truncated git blob");
    }
    blobs.set(requestedOid, result.stdout.subarray(contentStart, contentEnd));
    offset = contentEnd + 1;
  }
  if (offset !== result.stdout.length) throw new Error("unexpected trailing git blob output");
  return blobs;
}

function compareInventory(state, phase, manifestPaths, actualPaths, {
  missingCode,
  orphanCode,
  label,
}) {
  const manifestSet = new Set(manifestPaths);
  const actualSet = new Set(actualPaths);
  for (const repoPath of actualSet) {
    if (!manifestSet.has(repoPath)) {
      addError(state, phase, {
        code: missingCode,
        repoPath,
        field: "$.notes",
        message: `${label} contains a note without a manifest record`,
      });
    }
  }
  for (const repoPath of manifestSet) {
    if (!actualSet.has(repoPath)) {
      addError(state, phase, {
        code: orphanCode,
        repoPath,
        field: "$.notes",
        message: `manifest contains a note absent from ${label}`,
      });
    }
  }
}

function collectDeclaredFiles(state, document) {
  const declared = new Map();
  function add({ repoPath, expectedHash, kind, slug, field }) {
    const existing = declared.get(repoPath);
    if (existing) {
      addError(state, "current", {
        code: "DECLARED_PATH_COLLISION",
        field,
        slug,
        repoPath,
        message: "one repository path is declared by multiple provenance fields",
      });
      return;
    }
    declared.set(repoPath, { repoPath, expectedHash, kind, slug, field });
  }

  for (const [index, note] of document.notes.entries()) {
    add({
      repoPath: note.note_path,
      expectedHash: note.note_sha256,
      kind: "note",
      slug: note.slug,
      field: `notes[${index}].note_sha256`,
    });
    if (note.source.kind === "local") {
      add({
        repoPath: note.source.path,
        expectedHash: note.source.sha256,
        kind: "source",
        slug: note.slug,
        field: `notes[${index}].source.sha256`,
      });
    }
    for (const [assetIndex, asset] of note.generated_assets.entries()) {
      add({
        repoPath: asset.path,
        expectedHash: asset.sha256,
        kind: "asset",
        slug: note.slug,
        field: `notes[${index}].generated_assets[${assetIndex}].sha256`,
      });
    }
  }
  return declared;
}

function hashMismatchCode(kind) {
  if (kind === "note") return "NOTE_HASH_MISMATCH";
  if (kind === "source") return "SOURCE_HASH_MISMATCH";
  return "ASSET_HASH_MISMATCH";
}

function parseFrontmatterSource(noteSlug, value) {
  if (typeof value !== "string" || !value.trim()) return { ok: false };
  const source = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(source) && !source.startsWith("papers/")) {
    try {
      const url = new URL(source);
      if (url.protocol !== "https:" || url.username || url.password) return { ok: false };
      return { ok: true, kind: "remote", url: url.href };
    } catch {
      return { ok: false };
    }
  }
  const match = LOCAL_SOURCE_RE.exec(source);
  if (!match || match[1] !== noteSlug) return { ok: false };
  return {
    ok: true,
    kind: "local",
    path: source,
    artifact_type: match[2].endsWith(".pdf") ? "original-pdf" : "parsed-paper-markdown",
  };
}

function compareFrontmatterSource(state, { note, index, noteBytes }) {
  let data;
  try {
    data = matter(noteBytes.toString("utf8")).data;
  } catch {
    addError(state, "current", {
      code: "NOTE_FRONTMATTER_INVALID",
      field: `notes[${index}].source`,
      slug: note.slug,
      repoPath: note.note_path,
      message: "note frontmatter cannot be parsed",
    });
    return;
  }
  const sourceValue = String(data["来源"] ?? data.source ?? "").trim();
  const result = parseFrontmatterSource(note.slug, sourceValue);
  if (!result.ok) {
    addError(state, "current", {
      code: "SOURCE_REFERENCE_INVALID",
      field: `notes[${index}].source`,
      slug: note.slug,
      repoPath: note.note_path,
      message: "note frontmatter source is invalid",
    });
    return;
  }
  if (result.kind !== note.source.kind) {
    addError(state, "current", {
      code: "SOURCE_KIND_MISMATCH",
      field: `notes[${index}].source.kind`,
      slug: note.slug,
      repoPath: note.note_path,
      message: "frontmatter and manifest source kinds differ",
    });
    return;
  }
  if (result.kind === "remote" && result.url !== note.source.url) {
    addError(state, "current", {
      code: "SOURCE_LOCATOR_MISMATCH",
      field: `notes[${index}].source.url`,
      slug: note.slug,
      repoPath: note.note_path,
      message: "frontmatter and manifest remote locators differ",
    });
  }
  if (result.kind === "local") {
    if (result.path !== note.source.path || result.artifact_type !== note.source.artifact_type) {
      addError(state, "current", {
        code: "SOURCE_LOCATOR_MISMATCH",
        field: `notes[${index}].source.path`,
        slug: note.slug,
        repoPath: note.note_path,
        message: "frontmatter and manifest local locators differ",
      });
    }
  }
}

export function validateProvenanceRepository({
  root,
  document,
  expectedNoteCount = null,
  canonicalManifest = null,
  fsImpl = fs,
  execFileSyncImpl = execFileSync,
  spawnSyncImpl = spawnSync,
} = {}) {
  const state = createState();
  const schema = validateProvenanceDocument(document);
  if (!schema.ok) {
    for (const error of schema.errors) {
      addError(state, "schema", {
        code: error.code,
        field: error.path,
        message: error.message,
      });
    }
    addPrerequisiteErrors(state);
    return finalize(state);
  }

  let rootReal;
  try {
    rootReal = fsImpl.realpathSync(root);
  } catch {
    addError(state, "current", {
      code: "ROOT_INVALID",
      message: "repository root cannot be resolved",
    });
    addError(state, "snapshot", {
      code: "PREREQUISITE_FAILED",
      message: "repository root must be valid before snapshot validation",
    });
    return finalize(state);
  }

  state.stats.notes = document.notes.length;
  state.stats.local_sources = document.notes.filter((note) => note.source.kind === "local").length;
  state.stats.remote_sources = document.notes.filter((note) => note.source.kind === "remote").length;
  state.stats.generated_assets = document.notes.reduce((count, note) => count + note.generated_assets.length, 0);

  if (expectedNoteCount !== null && document.notes.length !== expectedNoteCount) {
    addError(state, "current", {
      code: "NOTE_COUNT_MISMATCH",
      field: "$.notes",
      message: "manifest note count does not match the frozen repository contract",
    });
  }
  const slugs = document.notes.map((note) => note.slug);
  const sortedSlugs = [...slugs].sort((a, b) => a.localeCompare(b, "en"));
  if (slugs.some((slug, index) => slug !== sortedSlugs[index])) {
    addError(state, "current", {
      code: "NON_DETERMINISTIC_ORDER",
      field: "$.notes",
      message: "manifest notes must be sorted by slug",
    });
  }

  const declared = collectDeclaredFiles(state, document);
  state.stats.checked_paths = declared.size;
  const manifestNotePaths = document.notes.map((note) => note.note_path);
  let currentNotePaths = [];
  const notesDirectory = inspectRepositoryDirectory({
    state,
    phase: "current",
    rootReal,
    repoPath: "notes",
    field: "$.notes",
    fsImpl,
  });
  if (notesDirectory) {
    try {
      currentNotePaths = fsImpl.readdirSync(notesDirectory, { withFileTypes: true })
        .filter((entry) => entry.name.endsWith(".md"))
        .map((entry) => `notes/${entry.name}`);
      compareInventory(state, "current", manifestNotePaths, currentNotePaths, {
        missingCode: "INVENTORY_NOTE_MISSING",
        orphanCode: "INVENTORY_NOTE_ORPHAN",
        label: "current notes inventory",
      });
    } catch {
      addError(state, "current", {
        code: "NOTES_INVENTORY_UNAVAILABLE",
        field: "$.notes",
        message: "current notes inventory cannot be read",
      });
    }
  }

  const currentBytes = new Map();
  for (const item of declared.values()) {
    const bytes = inspectRegularFile({
      state,
      phase: "current",
      rootReal,
      repoPath: item.repoPath,
      field: item.field,
      slug: item.slug,
      fsImpl,
    });
    if (bytes === null) continue;
    currentBytes.set(item.repoPath, bytes);
    if (sha256(bytes) !== item.expectedHash) {
      addError(state, "current", {
        code: hashMismatchCode(item.kind),
        field: item.field,
        slug: item.slug,
        repoPath: item.repoPath,
        message: "current file bytes do not match the manifest hash",
      });
    }
  }
  for (const [index, note] of document.notes.entries()) {
    const noteBytes = currentBytes.get(note.note_path);
    if (noteBytes) compareFrontmatterSource(state, { note, index, noteBytes });
  }

  let gitTop;
  try {
    gitTop = fsImpl.realpathSync(execGitText(rootReal, ["rev-parse", "--show-toplevel"], execFileSyncImpl));
  } catch {
    addError(state, "current", {
      code: "GIT_ROOT_UNAVAILABLE",
      message: "repository Git root cannot be verified",
    });
  }
  if (gitTop && gitTop !== rootReal) {
    addError(state, "current", {
      code: "GIT_ROOT_MISMATCH",
      message: "validation root must equal the Git worktree root",
    });
  }

  let indexEntries = null;
  let manifestIndexEntry = null;
  if (gitTop === rootReal) {
    try {
      indexEntries = readGitIndex(rootReal, execFileSyncImpl);
      for (const item of declared.values()) {
        const entries = indexEntries.get(item.repoPath);
        if (!entries) {
          addError(state, "current", {
            code: "PATH_NOT_TRACKED",
            field: item.field,
            slug: item.slug,
            repoPath: item.repoPath,
            message: "declared path is not tracked in the current index",
          });
        } else if (entries.length !== 1 || entries[0].stage !== "0") {
          addError(state, "current", {
            code: "INDEX_UNMERGED",
            field: item.field,
            slug: item.slug,
            repoPath: item.repoPath,
            message: "declared path must have exactly one stage-0 index entry",
          });
        } else if (!REGULAR_GIT_MODES.has(entries[0].mode)) {
          addError(state, "current", {
            code: "INDEX_PATH_NOT_REGULAR",
            field: item.field,
            slug: item.slug,
            repoPath: item.repoPath,
            message: "declared index path must be a regular Git blob",
          });
        }
      }
      if (canonicalManifest) {
        const entries = indexEntries.get(canonicalManifest.repoPath);
        if (!entries) {
          addError(state, "current", {
            code: "MANIFEST_NOT_TRACKED",
            field: "$",
            repoPath: canonicalManifest.repoPath,
            message: "canonical manifest must be tracked in the current index",
          });
        } else if (entries.length !== 1 || entries[0].stage !== "0") {
          addError(state, "current", {
            code: "MANIFEST_INDEX_UNMERGED",
            field: "$",
            repoPath: canonicalManifest.repoPath,
            message: "canonical manifest must have exactly one stage-0 index entry",
          });
        } else if (!REGULAR_GIT_MODES.has(entries[0].mode)) {
          addError(state, "current", {
            code: "MANIFEST_INDEX_NOT_REGULAR",
            field: "$",
            repoPath: canonicalManifest.repoPath,
            message: "canonical manifest index entry must be a regular Git blob",
          });
        } else {
          [manifestIndexEntry] = entries;
        }
      }
    } catch {
      addError(state, "current", {
        code: "GIT_INDEX_UNAVAILABLE",
        message: "tracked path inventory cannot be read",
      });
    }
  }

  let objectType;
  try {
    objectType = execGitText(rootReal, ["cat-file", "-t", document.content_commit], execFileSyncImpl);
  } catch {
    addError(state, "snapshot", {
      code: "CONTENT_COMMIT_NOT_FOUND",
      field: "$.content_commit",
      message: "content_commit object is unavailable locally",
    });
    return finalize(state);
  }
  if (objectType !== "commit") {
    addError(state, "snapshot", {
      code: "CONTENT_COMMIT_NOT_COMMIT",
      field: "$.content_commit",
      message: "content_commit must identify a Git commit object",
    });
    return finalize(state);
  }
  try {
    execGitBuffer(rootReal, ["merge-base", "--is-ancestor", document.content_commit, "HEAD"], execFileSyncImpl);
  } catch {
    addError(state, "snapshot", {
      code: "CONTENT_COMMIT_NOT_ANCESTOR",
      field: "$.content_commit",
      message: "content_commit must be an ancestor of HEAD",
    });
    return finalize(state);
  }

  let snapshotTree;
  let headTree;
  try {
    snapshotTree = readGitTree(rootReal, document.content_commit, execFileSyncImpl);
    headTree = readGitTree(rootReal, "HEAD", execFileSyncImpl);
  } catch {
    addError(state, "snapshot", {
      code: "GIT_TREE_UNAVAILABLE",
      field: "$.content_commit",
      message: "Git tree inventory cannot be read",
    });
    return finalize(state);
  }
  const topLevelNotes = (tree) => [...tree.keys()].filter((repoPath) => /^notes\/[^/]+\.md$/.test(repoPath));
  compareInventory(state, "snapshot", manifestNotePaths, topLevelNotes(snapshotTree), {
    missingCode: "SNAPSHOT_INVENTORY_NOTE_MISSING",
    orphanCode: "SNAPSHOT_INVENTORY_NOTE_ORPHAN",
    label: "content snapshot",
  });
  compareInventory(state, "snapshot", manifestNotePaths, topLevelNotes(headTree), {
    missingCode: "HEAD_INVENTORY_NOTE_MISSING",
    orphanCode: "HEAD_INVENTORY_NOTE_ORPHAN",
    label: "HEAD tree",
  });

  const manifestIndexNeedsByteCheck = Boolean(canonicalManifest && manifestIndexEntry);

  const snapshotItems = [];
  for (const item of declared.values()) {
    const snapshotEntry = snapshotTree.get(item.repoPath);
    const headEntry = headTree.get(item.repoPath);
    const indexEntry = indexEntries?.get(item.repoPath)?.[0];
    if (!snapshotEntry) {
      addError(state, "snapshot", {
        code: "SNAPSHOT_PATH_MISSING",
        field: item.field,
        slug: item.slug,
        repoPath: item.repoPath,
        message: "declared path is absent from content_commit",
      });
      continue;
    }
    if (snapshotEntry.type !== "blob" || !REGULAR_GIT_MODES.has(snapshotEntry.mode)) {
      addError(state, "snapshot", {
        code: "SNAPSHOT_PATH_NOT_REGULAR",
        field: item.field,
        slug: item.slug,
        repoPath: item.repoPath,
        message: "content_commit path must be a regular Git blob",
      });
      continue;
    }
    if (!headEntry) {
      addError(state, "snapshot", {
        code: "HEAD_PATH_MISSING",
        field: item.field,
        slug: item.slug,
        repoPath: item.repoPath,
        message: "declared path is absent from HEAD",
      });
    } else if (headEntry.type !== "blob" || !REGULAR_GIT_MODES.has(headEntry.mode)) {
      addError(state, "snapshot", {
        code: "HEAD_PATH_NOT_REGULAR",
        field: item.field,
        slug: item.slug,
        repoPath: item.repoPath,
        message: "HEAD path must be a regular Git blob",
      });
    } else if (headEntry.oid !== snapshotEntry.oid) {
      addError(state, "snapshot", {
        code: "HEAD_SNAPSHOT_BLOB_MISMATCH",
        field: item.field,
        slug: item.slug,
        repoPath: item.repoPath,
        message: "HEAD and content_commit contain different bytes",
      });
    }
    if (
      indexEntry?.stage === "0"
      && REGULAR_GIT_MODES.has(indexEntry.mode)
      && headEntry?.type === "blob"
      && REGULAR_GIT_MODES.has(headEntry.mode)
    ) {
      if (indexEntry.mode !== headEntry.mode || indexEntry.mode !== snapshotEntry.mode) {
        addError(state, "current", {
          code: "INDEX_MODE_MISMATCH",
          field: item.field,
          slug: item.slug,
          repoPath: item.repoPath,
          message: "index mode must match HEAD and content_commit",
        });
      }
      if (indexEntry.oid !== headEntry.oid || indexEntry.oid !== snapshotEntry.oid) {
        addError(state, "current", {
          code: "INDEX_BLOB_MISMATCH",
          field: item.field,
          slug: item.slug,
          repoPath: item.repoPath,
          message: "index bytes must match HEAD and content_commit",
        });
      }
    }
    snapshotItems.push({ ...item, oid: snapshotEntry.oid });
  }

  let blobs;
  try {
    const requestedOids = snapshotItems.map((item) => item.oid);
    if (manifestIndexNeedsByteCheck) requestedOids.push(manifestIndexEntry.oid);
    blobs = readGitBlobs(rootReal, requestedOids, spawnSyncImpl);
  } catch {
    if (manifestIndexNeedsByteCheck) {
      addError(state, "current", {
        code: "MANIFEST_INDEX_BLOB_READ_FAILED",
        field: "$",
        repoPath: canonicalManifest.repoPath,
        message: "staged canonical manifest bytes cannot be read safely",
      });
    }
    addError(state, "snapshot", {
      code: "SNAPSHOT_BLOB_READ_FAILED",
      field: "$.content_commit",
      message: "content snapshot blobs cannot be read within the validation limit",
    });
    return finalize(state);
  }
  for (const item of snapshotItems) {
    const bytes = blobs.get(item.oid);
    if (!bytes || sha256(bytes) !== item.expectedHash) {
      addError(state, "snapshot", {
        code: "SNAPSHOT_HASH_MISMATCH",
        field: item.field,
        slug: item.slug,
        repoPath: item.repoPath,
        message: "content_commit bytes do not match the manifest hash",
      });
    }
  }
  if (manifestIndexNeedsByteCheck) {
    const indexBytes = blobs.get(manifestIndexEntry.oid);
    if (!indexBytes || !Buffer.from(canonicalManifest.bytes).equals(indexBytes)) {
      addError(state, "current", {
        code: "MANIFEST_INDEX_BLOB_MISMATCH",
        field: "$",
        repoPath: canonicalManifest.repoPath,
        message: "staged canonical manifest differs from the validated worktree file",
      });
    }
  }
  return finalize(state);
}

export function validateProvenanceRepositoryFile({
  root,
  manifestPath = "papers/provenance.json",
  expectedNoteCount = null,
  fsImpl = fs,
  execFileSyncImpl = execFileSync,
  spawnSyncImpl = spawnSync,
} = {}) {
  const state = createState();
  let rootReal;
  try {
    rootReal = fsImpl.realpathSync(root);
  } catch {
    addError(state, "schema", {
      code: "ROOT_INVALID",
      message: "repository root cannot be resolved",
    });
    addPrerequisiteErrors(state);
    return finalize(state);
  }
  const bytes = inspectRegularFile({
    state,
    phase: "schema",
    rootReal,
    repoPath: manifestPath,
    field: "$",
    slug: null,
    fsImpl,
  });
  if (bytes === null) {
    addPrerequisiteErrors(state);
    return finalize(state);
  }
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch {
    addError(state, "schema", {
      code: "MANIFEST_JSON_INVALID",
      field: "$",
      repoPath: manifestPath,
      message: "provenance manifest is not valid JSON",
    });
    addPrerequisiteErrors(state);
    return finalize(state);
  }
  return validateProvenanceRepository({
    root: rootReal,
    document,
    expectedNoteCount,
    canonicalManifest: { repoPath: manifestPath, bytes },
    fsImpl,
    execFileSyncImpl,
    spawnSyncImpl,
  });
}

export function formatProvenanceRepositoryErrors(errors, { limit = 20 } = {}) {
  const visible = errors.slice(0, limit).map((error) => {
    const parts = [`[${sanitizeField(error.code)}]`, `field=${sanitizeField(error.field)}`];
    if (error.slug) parts.push(`slug=${error.slug}`);
    if (isSafeRepositoryPath(error.repo_path)) parts.push(`path=${error.repo_path}`);
    return `${parts.join(" ")}: ${sanitizeMessage(error.message)}`;
  });
  if (errors.length > limit) visible.push(`[TRUNCATED] ${errors.length - limit} additional validation errors`);
  return visible.join("\n");
}
