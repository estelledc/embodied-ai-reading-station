import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import matter from "gray-matter";
import {
  PROVENANCE_SCHEMA_VERSION,
  validateProvenanceDocument,
} from "./provenance-schema.mjs";
import { validateSourceReference } from "./source-reference.mjs";

const GIT_SHA_RE = /^[a-f0-9]{40}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
let tempSequence = 0;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertContentCommit(contentCommit) {
  if (typeof contentCommit !== "string" || !GIT_SHA_RE.test(contentCommit)) {
    throw new Error("content_commit must be exactly 40 lowercase hexadecimal characters");
  }
  return contentCommit;
}

function formatValidationErrors(errors) {
  return errors.map(({ path: errorPath, code, message }) => `${errorPath} [${code}]: ${message}`).join("; ");
}

function defaultVerification() {
  return {
    status: "UNVERIFIED",
    by: null,
    date: null,
    scope: null,
    blocked_reason: null,
  };
}

function sourceArtifactType(sourcePath) {
  return sourcePath.endsWith(".pdf") ? "original-pdf" : "parsed-paper-markdown";
}

function validateV1Manifest(manifest) {
  if (manifest?.schema_version !== "1.0.0") {
    throw new Error("legacy provenance schema_version must be 1.0.0");
  }
  if (manifest.algorithm !== "sha256") {
    throw new Error("legacy provenance algorithm must be sha256");
  }
  if (!Array.isArray(manifest.entries)) {
    throw new Error("legacy provenance entries must be an array");
  }

  const entryKeys = new Set();
  const slugs = new Set();
  for (const [index, entry] of manifest.entries.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`legacy provenance entry ${index} must be an object`);
    }
    const { slug, path: sourcePath, sha256: sourceSha256, artifact_type: artifactType } = entry;
    if (typeof slug !== "string" || !slug) throw new Error(`legacy provenance entry ${index} has invalid slug`);
    if (typeof sourcePath !== "string" || !sourcePath) throw new Error(`legacy provenance entry ${index} has invalid path`);
    if (typeof sourceSha256 !== "string" || !SHA256_RE.test(sourceSha256)) {
      throw new Error(`legacy provenance entry ${index} has invalid hash`);
    }
    if (artifactType !== sourceArtifactType(sourcePath)) {
      throw new Error(`legacy provenance entry ${index} artifact_type does not match its path`);
    }
    const key = `${slug}\0${sourcePath}`;
    if (entryKeys.has(key) || slugs.has(slug)) {
      throw new Error(`legacy provenance contains duplicate entry for ${slug}`);
    }
    entryKeys.add(key);
    slugs.add(slug);
  }
}

function validatePreviousManifest(previousManifest) {
  if (previousManifest?.schema_version === "1.0.0") {
    validateV1Manifest(previousManifest);
    return "v1";
  }
  if (previousManifest?.schema_version === PROVENANCE_SCHEMA_VERSION) {
    const result = validateProvenanceDocument(previousManifest);
    if (!result.ok) throw new Error(`previous provenance is invalid: ${formatValidationErrors(result.errors)}`);
    return "v2";
  }
  throw new Error(`unsupported provenance schema_version: ${String(previousManifest?.schema_version)}`);
}

function normalizeSource({ root, slug, sourceValue, legacyEntries }) {
  const result = validateSourceReference({
    root,
    noteSlug: slug,
    source: sourceValue,
    manifest: sourceValue.startsWith("papers/") && legacyEntries ? legacyEntries : null,
  });
  if (!result.ok) throw new Error(`${slug}: ${result.reason}`);

  if (result.kind === "remote") {
    return {
      kind: "remote",
      url: result.url,
      path: null,
      sha256: null,
      artifact_type: null,
    };
  }
  const legacyEntry = legacyEntries?.find((entry) => entry.slug === slug && entry.path === result.path);
  return {
    kind: "local",
    url: null,
    path: result.path,
    sha256: result.sha256,
    artifact_type: legacyEntry?.artifact_type ?? sourceArtifactType(result.path),
  };
}

function sameRecordInputs(previous, current) {
  return previous.note_path === current.note_path
    && previous.note_sha256 === current.note_sha256
    && JSON.stringify(previous.source) === JSON.stringify(current.source);
}

export function loadCanonicalNotes({ root, previousManifest, contentCommit }) {
  assertContentCommit(contentCommit);
  const previousKind = validatePreviousManifest(previousManifest);
  const legacyEntries = previousKind === "v1" ? previousManifest.entries : null;
  const previousBySlug = previousKind === "v2"
    ? new Map(previousManifest.notes.map((record) => [record.slug, record]))
    : new Map();
  const notesDir = path.join(root, "notes");
  const files = fs.readdirSync(notesDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => ({ name, slug: name.slice(0, -3) }))
    .sort((a, b) => a.slug.localeCompare(b.slug, "en"));
  if (files.length === 0) throw new Error("no canonical notes found under notes/");

  const matchedLegacyEntries = new Set();
  const seenSlugs = new Set();
  const records = files.map(({ name, slug }) => {
    const notePath = `notes/${name}`;
    const raw = fs.readFileSync(path.join(notesDir, name));
    const { data } = matter(raw.toString("utf8"));
    const sourceValue = String(data["来源"] ?? data.source ?? "").trim();
    const source = normalizeSource({ root, slug, sourceValue, legacyEntries });
    if (source.kind === "local" && legacyEntries) matchedLegacyEntries.add(`${slug}\0${source.path}`);

    const record = {
      slug,
      note_path: notePath,
      note_sha256: sha256(raw),
      source,
      human_verification: defaultVerification(),
      generated_assets: [],
    };
    const previous = previousBySlug.get(slug);
    const sameCommit = previousKind === "v2" && previousManifest.content_commit === contentCommit;
    const unchanged = previous ? sameRecordInputs(previous, record) : false;

    if (sameCommit && !unchanged) {
      throw new Error(`${slug}: content changed while reusing content_commit ${contentCommit}`);
    }
    if (unchanged) {
      record.human_verification = structuredClone(previous.human_verification);
      if (sameCommit) record.generated_assets = structuredClone(previous.generated_assets);
    }
    seenSlugs.add(slug);
    return record;
  });

  if (legacyEntries) {
    for (const entry of legacyEntries) {
      const key = `${entry.slug}\0${entry.path}`;
      if (!matchedLegacyEntries.has(key)) {
        throw new Error(`legacy provenance entry is not referenced by a canonical note: ${entry.path}`);
      }
    }
  }
  if (previousKind === "v2" && previousManifest.content_commit === contentCommit) {
    for (const previous of previousManifest.notes) {
      if (!seenSlugs.has(previous.slug)) {
        throw new Error(`${previous.slug}: content changed while reusing content_commit ${contentCommit}`);
      }
    }
  }
  return records;
}

export function buildProvenanceV2({ root, previousManifest, contentCommit }) {
  const document = {
    schema_version: PROVENANCE_SCHEMA_VERSION,
    content_commit: assertContentCommit(contentCommit),
    notes: loadCanonicalNotes({ root, previousManifest, contentCommit }),
  };
  const result = validateProvenanceDocument(document);
  if (!result.ok) throw new Error(`generated provenance is invalid: ${formatValidationErrors(result.errors)}`);
  return document;
}

export function migrateProvenanceV1ToV2({ root, v1Manifest, contentCommit }) {
  validateV1Manifest(v1Manifest);
  return buildProvenanceV2({ root, previousManifest: v1Manifest, contentCommit });
}

export function serializeProvenanceDocument(document) {
  const result = validateProvenanceDocument(document);
  if (!result.ok) throw new Error(`provenance validation failed: ${formatValidationErrors(result.errors)}`);
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function writeJsonAtomically(filePath, document, { fsImpl = fs } = {}) {
  const bytes = serializeProvenanceDocument(document);
  const directory = path.dirname(filePath);
  const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${tempSequence += 1}.tmp`);
  let descriptor = null;
  let renamed = false;
  try {
    descriptor = fsImpl.openSync(tempPath, "wx", 0o600);
    fsImpl.writeFileSync(descriptor, bytes, "utf8");
    fsImpl.fsyncSync(descriptor);
    fsImpl.closeSync(descriptor);
    descriptor = null;
    fsImpl.renameSync(tempPath, filePath);
    renamed = true;
  } catch (error) {
    if (descriptor !== null) {
      try { fsImpl.closeSync(descriptor); } catch { /* preserve the original failure */ }
    }
    if (!renamed) {
      try { fsImpl.unlinkSync(tempPath); } catch { /* the temp file may not exist */ }
    }
    throw error;
  }
  return { sha256: sha256(bytes), bytes: bytes.length };
}

export function checkProvenanceFile(filePath, document, { fsImpl = fs } = {}) {
  const expected = serializeProvenanceDocument(document);
  let actual = null;
  try {
    actual = fsImpl.readFileSync(filePath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const actualBytes = actual === null ? null : Buffer.isBuffer(actual) ? actual : Buffer.from(actual);
  return {
    ok: actualBytes !== null && actualBytes.equals(Buffer.from(expected)),
    expected_sha256: sha256(expected),
    actual_sha256: actualBytes === null ? null : sha256(actualBytes),
  };
}

export function generateProvenanceFile({
  root,
  filePath = path.join(root, "papers", "provenance.json"),
  checkOnly = false,
  env = process.env,
  fsImpl = fs,
  execFileSyncImpl = execFileSync,
} = {}) {
  const existingManifest = JSON.parse(fsImpl.readFileSync(filePath, "utf8"));
  const contentCommit = resolveContentCommit({
    root,
    env,
    existingManifest,
    execFileSyncImpl,
  });
  const document = existingManifest.schema_version === "1.0.0"
    ? migrateProvenanceV1ToV2({ root, v1Manifest: existingManifest, contentCommit })
    : buildProvenanceV2({ root, previousManifest: existingManifest, contentCommit });

  if (checkOnly) {
    return { ...checkProvenanceFile(filePath, document, { fsImpl }), document, contentCommit };
  }
  return {
    ok: true,
    ...writeJsonAtomically(filePath, document, { fsImpl }),
    document,
    contentCommit,
  };
}

export function resolveContentCommit({
  root,
  env = process.env,
  existingManifest = null,
  execFileSyncImpl = execFileSync,
} = {}) {
  let candidate;
  if (env.PROVENANCE_CONTENT_COMMIT !== undefined) {
    candidate = env.PROVENANCE_CONTENT_COMMIT;
  } else if (existingManifest?.schema_version === PROVENANCE_SCHEMA_VERSION) {
    candidate = existingManifest.content_commit;
  } else {
    candidate = execFileSyncImpl("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
  }
  return assertContentCommit(String(candidate).trim());
}
