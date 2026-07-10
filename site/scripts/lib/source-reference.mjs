import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LOCAL_SOURCE_RE = /^papers\/([^/]+)\/(paper\.(?:md|pdf))$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

function fail(reason, extra = {}) {
  return { ok: false, reason, ...extra };
}

function fileSha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function validateSourceReference({ root, noteSlug, source, manifest = null }) {
  if (typeof source !== "string" || !source.trim()) return fail("source is empty");
  const value = source.trim();

  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith("papers/")) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return fail("source URL is invalid");
    }
    if (url.protocol !== "https:") return fail("remote source must use HTTPS");
    if (url.username || url.password) return fail("remote source must not include credentials");
    return { ok: true, kind: "remote", url: url.href };
  }

  const match = LOCAL_SOURCE_RE.exec(value);
  if (!match) return fail("local source must be papers/<slug>/paper.md or paper.pdf");
  if (match[1] !== noteSlug) return fail(`local source slug ${match[1]} does not match note ${noteSlug}`);

  const rootPath = path.resolve(root);
  const filePath = path.resolve(rootPath, ...value.split("/"));
  if (filePath !== rootPath && !filePath.startsWith(`${rootPath}${path.sep}`)) {
    return fail("local source escapes repository root");
  }

  let stat;
  try {
    stat = fs.lstatSync(filePath);
  } catch {
    return fail(`local source does not exist: ${value}`);
  }
  if (stat.isSymbolicLink()) return fail(`local source must not be a symlink: ${value}`);
  if (!stat.isFile()) return fail(`local source is not a regular file: ${value}`);

  const sha256 = fileSha256(filePath);
  if (manifest !== null) {
    if (!Array.isArray(manifest)) return fail("provenance manifest must be an array");
    const entry = manifest.find((item) => item?.slug === noteSlug && item?.path === value);
    if (!entry) return fail(`provenance manifest is missing ${value}`);
    if (typeof entry.sha256 !== "string" || !SHA256_RE.test(entry.sha256)) {
      return fail(`provenance manifest has invalid hash for ${value}`);
    }
    if (entry.sha256 !== sha256) return fail(`provenance hash mismatch for ${value}`);
  }

  return { ok: true, kind: "local", path: value, sha256 };
}

export function buildLocalProvenanceEntry({ root, noteSlug, source }) {
  const result = validateSourceReference({ root, noteSlug, source });
  if (!result.ok || result.kind !== "local") {
    throw new Error(result.reason || `${source} is not a local source`);
  }
  return {
    slug: noteSlug,
    path: result.path,
    sha256: result.sha256,
    artifact_type: result.path.endsWith(".pdf") ? "original-pdf" : "parsed-paper-markdown",
  };
}
