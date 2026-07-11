import path from "node:path";

export const PROVENANCE_SCHEMA_VERSION = "2.0.0";
export const PROVENANCE_SCHEMA_MAJOR = 2;

const SHA256_RE = /^[a-f0-9]{64}$/;
const GIT_SHA_RE = /^[a-f0-9]{40}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVIEWER_ALIAS_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const GENERATOR_RE = /^[a-z0-9][a-z0-9._/-]{0,127}$/;
const SOURCE_ARTIFACT_TYPES = new Set(["parsed-paper-markdown", "original-pdf"]);
const VERIFICATION_STATUSES = new Set(["UNVERIFIED", "VERIFIED", "BLOCKED"]);
const VERIFICATION_SCOPES = new Set([
  "note",
  "source",
  "note-and-source",
  "generated-assets",
  "full-record",
]);
const GENERATED_ASSET_KINDS = new Set([
  "card",
  "inline-scene",
  "inline-method",
  "extracted-figure",
]);

const NO_DEFAULT = Object.freeze({ kind: "none" });
const NULL_DEFAULT = Object.freeze({ kind: "literal", value: null });
const EMPTY_ARRAY_DEFAULT = Object.freeze({ kind: "literal", value: [] });

function field({ type, nullable, defaultValue, source, consumers, migration, ...extra }) {
  return Object.freeze({
    type,
    nullable,
    default: defaultValue,
    source,
    consumers: Object.freeze([...consumers]),
    migration,
    ...extra,
  });
}

const ALL_PROVENANCE_CONSUMERS = ["provenance-generator", "provenance-validator", "data-api-v2"];

export const PROVENANCE_FIELD_DICTIONARY = Object.freeze({
  schema_version: field({
    type: "semver-string",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "schema constant",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "set to 2.0.0; producer/validator reject every unsupported exact version",
  }),
  content_commit: field({
    type: "40-char-lowercase-git-sha",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "immutable Git commit containing the exact content inputs described by the manifest",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "point at an existing input snapshot commit, then require current content bytes, manifest hashes, and snapshot bytes to remain equal; never claim the self-referential manifest-containing SHA",
    storage: "tracked-input-snapshot-reference",
  }),
  notes: field({
    type: "array<provenance-note>",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "all notes/*.md discovered in slug order",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "one record per note; 46 local and 110 remote at the frozen v1.2 baseline",
  }),
  "notes[].slug": field({
    type: "kebab-case-string",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "note filename",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "stable unique identity; num is display-only and must not be used as identity",
  }),
  "notes[].note_path": field({
    type: "safe-repository-relative-path",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "notes/<slug>.md",
    consumers: ["provenance-generator", "provenance-validator"],
    migration: "derive from slug; filesystem existence and symlink checks belong to the repository gate",
  }),
  "notes[].note_sha256": field({
    type: "64-char-lowercase-sha256",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "raw note bytes",
    consumers: ["provenance-validator", "data-api-v2"],
    migration: "shape is checked by this contract; byte matching belongs to the repository gate",
  }),
  "notes[].source": field({
    type: "remote-or-local-discriminated-union",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "note frontmatter source",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "normalize every source into the explicit remote/local null matrix",
  }),
  "notes[].source.kind": field({
    type: "enum(remote,local)",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "source locator classification",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "HTTPS becomes remote; papers/<slug>/paper.md|pdf becomes local",
  }),
  "notes[].source.url": field({
    type: "credential-free-https-url",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "remote source frontmatter",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "required for remote; explicit null for local",
  }),
  "notes[].source.path": field({
    type: "safe-repository-relative-path",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "local source frontmatter",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "required for local; explicit null for remote",
  }),
  "notes[].source.sha256": field({
    type: "64-char-lowercase-sha256",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "local source bytes",
    consumers: ["provenance-validator", "data-api-v2"],
    migration: "preserve all v1 hashes for local; explicit null for remote",
  }),
  "notes[].source.artifact_type": field({
    type: "enum(parsed-paper-markdown,original-pdf)",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "local source extension",
    consumers: ["provenance-validator", "data-api-v2"],
    migration: "preserve v1 artifact type for local; explicit null for remote",
  }),
  "notes[].human_verification": field({
    type: "verification-state-object",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "explicit public review evidence",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "all migrated records start UNVERIFIED; local hashes are not human verification",
  }),
  "notes[].human_verification.status": field({
    type: "enum(UNVERIFIED,VERIFIED,BLOCKED)",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "review workflow",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "default migrated status is UNVERIFIED",
  }),
  "notes[].human_verification.by": field({
    type: "public-kebab-case-role-or-alias",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "review evidence",
    consumers: ["provenance-validator", "data-api-v2"],
    migration: "required only for VERIFIED; do not publish personal account identifiers",
  }),
  "notes[].human_verification.date": field({
    type: "YYYY-MM-DD",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "review evidence",
    consumers: ["provenance-validator", "data-api-v2"],
    migration: "required only for VERIFIED",
  }),
  "notes[].human_verification.scope": field({
    type: "verification-scope-enum",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "review evidence",
    consumers: ["provenance-validator", "data-api-v2"],
    migration: "required only for VERIFIED",
  }),
  "notes[].human_verification.blocked_reason": field({
    type: "non-empty-string",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "review workflow",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "the only blocked_reason location; required only for BLOCKED",
  }),
  "notes[].generated_assets": field({
    type: "array<generated-asset>",
    nullable: false,
    defaultValue: EMPTY_ARRAY_DEFAULT,
    source: "reproducible asset generator evidence",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "empty until every required evidence field is known; never invent fingerprints",
  }),
  "notes[].generated_assets[].kind": field({
    type: "enum(card,inline-scene,inline-method,extracted-figure)",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "asset role",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "map only complete reproducible asset records",
  }),
  "notes[].generated_assets[].tracked": field({
    type: "literal-true",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "repository tracking state",
    consumers: ["provenance-validator", "data-api-v2"],
    migration: "untracked or incomplete assets are omitted rather than represented as verified evidence",
  }),
  "notes[].generated_assets[].path": field({
    type: "safe-repository-relative-path",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "tracked generated asset",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "include only when the path can be checked without embedding asset bytes",
  }),
  "notes[].generated_assets[].sha256": field({
    type: "64-char-lowercase-sha256",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "tracked generated asset bytes",
    consumers: ["provenance-validator", "data-api-v2"],
    migration: "shape is checked here; byte matching belongs to the repository gate",
  }),
  "notes[].generated_assets[].generator": field({
    type: "stable-generator-id",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "asset generation workflow",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "omit the asset until the generator identity is known",
  }),
  "notes[].generated_assets[].input_fingerprint": field({
    type: "64-char-lowercase-sha256",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "canonical generator inputs",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "omit legacy assets when the input fingerprint cannot be proven",
  }),
  "notes[].generated_assets[].content_commit": field({
    type: "40-char-lowercase-git-sha",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "input snapshot commit containing the tracked generated asset",
    consumers: ALL_PROVENANCE_CONSUMERS,
    migration: "must equal the containing document content_commit",
    storage: "tracked-input-snapshot-reference",
  }),
});

export const PROVENANCE_DOCUMENT_CONTRACT = Object.freeze({
  tracked_path: "papers/provenance.json",
  top_level_fields: Object.freeze(["schema_version", "content_commit", "notes"]),
  content_commit_semantics: "existing ancestor commit containing the exact hashed content inputs",
  freshness_invariant: "current tracked content bytes == manifest hashes == content_commit snapshot bytes",
  update_protocol: Object.freeze([
    "commit changed content inputs as an immutable snapshot",
    "regenerate and attest the tracked manifest in a later commit",
    "verify the complete current inventory and bytes against both the manifest and content_commit before accepting it",
  ]),
});

export const DATA_API_CONTRACT = Object.freeze({
  schema_version: PROVENANCE_SCHEMA_VERSION,
  supported_schema_major: PROVENANCE_SCHEMA_MAJOR,
  legacy_endpoint: "/data/papers.json",
  versioned_papers_endpoint: "/data/v2/papers.json",
  versioned_index_endpoint: "/data/v2/index.json",
  envelope_fields: Object.freeze(["schema_version", "content_commit", "generated_at", "data"]),
  index_data_fields: Object.freeze(["papers_endpoint", "legacy_endpoint", "deprecation"]),
  deprecation_fields: Object.freeze(["status", "removal_version"]),
  deprecation_default: Object.freeze({ status: "supported", removal_version: null }),
  paper_record_fields: Object.freeze([
    "slug", "num", "title", "topic", "topicLabel", "era", "year", "venue", "difficulty",
    "tldr", "wordCount", "readingMinutes", "tags", "url", "sourcePath", "status",
    "generated_at", "content_modified",
  ]),
  stable_key: "slug",
  display_only_fields: Object.freeze(["num"]),
  content_commit_storage: "tracked-input-snapshot-reference",
  generated_at_semantics: "deterministic build timestamp; never a substitute for content_commit",
  compatibility: Object.freeze({
    legacy: "retain the bare array for the complete v1.3 compatibility window",
    producer: "emit exactly 2.0.0 until this validator is deliberately upgraded",
    consumer: "reject unknown major versions and validate required envelope fields",
  }),
});

export const DATA_API_FIELD_DICTIONARY = Object.freeze({
  schema_version: field({
    type: "semver-string",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "provenance schema constant",
    consumers: ["data-api-v2", "browser-data-adapter"],
    migration: "emit 2.0.0; browser adapter rejects an unknown major and validates required fields",
  }),
  content_commit: field({
    type: "40-char-lowercase-git-sha",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "tracked provenance input snapshot reference",
    consumers: ["data-api-v2", "browser-data-adapter", "service-worker-v2"],
    migration: "copy without substituting generated_at or the manifest-containing commit",
    storage: "tracked-input-snapshot-reference",
  }),
  generated_at: field({
    type: "ISO-8601-instant",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "SOURCE_DATE_EPOCH-backed deterministic build metadata",
    consumers: ["data-api-v2", "browser-data-adapter"],
    migration: "retain as build metadata; never use it as content identity",
  }),
  data: field({
    type: "array<legacy-paper-record>|versioned-index-data",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "same canonical paper projection as legacy /data/papers.json, or the versioned index metadata object",
    consumers: ["data-api-v2", "browser-data-adapter"],
    migration: "papers data preserves legacy fields/order; index data names papers, legacy, and deprecation policy",
  }),
  "data[].slug": field({
    type: "string",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "canonical note slug",
    consumers: ["legacy-data-api", "data-api-v2", "browser-data-adapter"],
    migration: "stable identity; preserve exactly from legacy",
  }),
  "data[].num": field({
    type: "number",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "note frontmatter num",
    consumers: ["legacy-data-api", "data-api-v2"],
    migration: "display-only and allowed to repeat; never use as identity or tie-break without slug",
  }),
  "data[].title": field({
    type: "string",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "note frontmatter title",
    consumers: ["legacy-data-api", "data-api-v2", "browser-data-adapter"],
    migration: "preserve exactly from legacy",
  }),
  "data[].topic": field({
    type: "string",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "canonical note topic id",
    consumers: ["legacy-data-api", "data-api-v2", "browser-data-adapter"],
    migration: "preserve exactly from legacy",
  }),
  "data[].topicLabel": field({
    type: "string",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "topics.json label projection",
    consumers: ["legacy-data-api", "data-api-v2", "browser-data-adapter"],
    migration: "preserve exactly and keep aligned with topics.json",
  }),
  "data[].era": field({
    type: "string",
    nullable: false,
    defaultValue: Object.freeze({ kind: "literal", value: "classic" }),
    source: "note era with classic fallback",
    consumers: ["legacy-data-api", "data-api-v2", "browser-data-adapter"],
    migration: "preserve current fallback and ordering semantics",
  }),
  "data[].year": field({
    type: "number",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "source paper publication year",
    consumers: ["legacy-data-api", "data-api-v2"],
    migration: "preserve null for unknown; never substitute build year",
  }),
  "data[].venue": field({
    type: "string",
    nullable: false,
    defaultValue: Object.freeze({ kind: "literal", value: "" }),
    source: "note venue",
    consumers: ["legacy-data-api", "data-api-v2"],
    migration: "preserve the legacy empty-string fallback",
  }),
  "data[].difficulty": field({
    type: "integer",
    nullable: false,
    defaultValue: Object.freeze({ kind: "literal", value: 2 }),
    source: "length of the note difficulty marker",
    consumers: ["legacy-data-api", "data-api-v2", "browser-data-adapter"],
    migration: "preserve the legacy numeric projection",
  }),
  "data[].tldr": field({
    type: "string",
    nullable: false,
    defaultValue: Object.freeze({ kind: "literal", value: "" }),
    source: "canonical note TLDR projection",
    consumers: ["legacy-data-api", "data-api-v2", "browser-data-adapter"],
    migration: "preserve exactly from legacy",
  }),
  "data[].wordCount": field({
    type: "integer",
    nullable: false,
    defaultValue: Object.freeze({ kind: "literal", value: 0 }),
    source: "canonical note word count",
    consumers: ["legacy-data-api", "data-api-v2"],
    migration: "preserve the legacy computed value",
  }),
  "data[].readingMinutes": field({
    type: "number",
    nullable: false,
    defaultValue: Object.freeze({ kind: "literal", value: 0 }),
    source: "canonical note reading time",
    consumers: ["legacy-data-api", "data-api-v2"],
    migration: "preserve the legacy computed value",
  }),
  "data[].tags": field({
    type: "array<string>",
    nullable: false,
    defaultValue: EMPTY_ARRAY_DEFAULT,
    source: "canonical note tags",
    consumers: ["legacy-data-api", "data-api-v2", "browser-data-adapter"],
    migration: "preserve order and values from legacy",
  }),
  "data[].url": field({
    type: "absolute-site-url",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "SITE_URL plus /papers/<slug>/",
    consumers: ["legacy-data-api", "data-api-v2", "browser-data-adapter"],
    migration: "derive through existing site/base URL rules",
  }),
  "data[].sourcePath": field({
    type: "string",
    nullable: false,
    defaultValue: Object.freeze({ kind: "literal", value: "" }),
    source: "canonical source locator projection",
    consumers: ["legacy-data-api", "data-api-v2"],
    migration: "preserve the legacy field name and empty-string fallback",
  }),
  "data[].status": field({
    type: "string",
    nullable: false,
    defaultValue: Object.freeze({ kind: "literal", value: "auto-summary" }),
    source: "note lifecycle status",
    consumers: ["legacy-data-api", "data-api-v2", "browser-data-adapter"],
    migration: "preserve existing lifecycle values and fallback",
  }),
  "data[].generated_at": field({
    type: "YYYY-MM-DD",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "explicit note lifecycle metadata",
    consumers: ["legacy-data-api", "data-api-v2"],
    migration: "preserve null for unknown; never substitute deploy time",
  }),
  "data[].content_modified": field({
    type: "YYYY-MM-DD",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "explicit note lifecycle metadata",
    consumers: ["legacy-data-api", "data-api-v2"],
    migration: "preserve null for unknown; may fall back to the note generated date only",
  }),
  "data.papers_endpoint": field({
    type: "site-base-aware-url",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "versioned data API route",
    consumers: ["data-api-v2", "browser-data-adapter", "service-worker-v2"],
    migration: "point to /data/v2/papers.json through existing base-path rules",
  }),
  "data.legacy_endpoint": field({
    type: "site-base-aware-url",
    nullable: false,
    defaultValue: NO_DEFAULT,
    source: "legacy data API route",
    consumers: ["data-api-v2", "browser-data-adapter"],
    migration: "point to /data/papers.json through existing base-path rules",
  }),
  "data.deprecation": field({
    type: "deprecation-policy-object",
    nullable: false,
    defaultValue: Object.freeze({ kind: "literal", value: Object.freeze({ status: "supported", removal_version: null }) }),
    source: "release compatibility policy",
    consumers: ["data-api-v2", "browser-data-adapter"],
    migration: "keep supported with no removal version for the complete v1.3 window",
  }),
  "data.deprecation.status": field({
    type: "enum(supported,deprecated)",
    nullable: false,
    defaultValue: Object.freeze({ kind: "literal", value: "supported" }),
    source: "release compatibility policy",
    consumers: ["data-api-v2", "browser-data-adapter"],
    migration: "starts supported; changing to deprecated requires an explicit release decision",
  }),
  "data.deprecation.removal_version": field({
    type: "semver-string",
    nullable: true,
    defaultValue: NULL_DEFAULT,
    source: "release compatibility policy",
    consumers: ["data-api-v2", "browser-data-adapter"],
    migration: "explicit null while supported; never infer a removal release",
  }),
});

function addError(errors, errorPath, code, message) {
  errors.push({ path: errorPath, code, message });
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkExactKeys(errors, value, errorPath, expectedKeys) {
  if (!isObject(value)) {
    addError(errors, errorPath, "INVALID_OBJECT", "must be an object");
    return false;
  }
  const expected = new Set(expectedKeys);
  for (const key of expectedKeys) {
    if (!Object.hasOwn(value, key)) addError(errors, `${errorPath}.${key}`, "MISSING_FIELD", "field is required");
  }
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) addError(errors, `${errorPath}.${key}`, "UNKNOWN_FIELD", "field is not part of schema 2.0.0");
  }
  return true;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes("\0")) return false;
  if (value.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return false;
  return path.posix.normalize(value) === value;
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isSafeHttpsUrl(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function generatedAssetPathMatches({ kind, slug, assetPath }) {
  if (typeof assetPath !== "string") return false;
  const numericVariant = "(?:-[1-9][0-9]{2,3})?";
  if (kind === "card") {
    return new RegExp(`^site/src/images/cards/${slug}${numericVariant}\\.webp$`).test(assetPath);
  }
  if (kind === "inline-scene" || kind === "inline-method") {
    const role = kind === "inline-scene" ? "scene" : "method";
    return new RegExp(`^site/src/images/inline/${slug}-${role}${numericVariant}\\.webp$`).test(assetPath);
  }
  if (kind === "extracted-figure") {
    const prefix = `papers/${slug}/images/`;
    return assetPath.startsWith(prefix)
      && assetPath.length > prefix.length
      && /\.(?:png|jpe?g|webp)$/i.test(assetPath);
  }
  return false;
}

function validateSource(source, { errors, slug, errorPath }) {
  if (!checkExactKeys(errors, source, errorPath, ["kind", "url", "path", "sha256", "artifact_type"])) return;
  if (source.kind === "remote") {
    if (!isSafeHttpsUrl(source.url)) addError(errors, `${errorPath}.url`, "INVALID_REMOTE_URL", "remote source must be credential-free HTTPS");
    if (source.path !== null || source.sha256 !== null || source.artifact_type !== null) {
      addError(errors, errorPath, "REMOTE_SOURCE_NULL_MATRIX", "remote source local-only fields must be explicit null");
    }
    return;
  }
  if (source.kind === "local") {
    if (source.url !== null) addError(errors, errorPath, "LOCAL_SOURCE_NULL_MATRIX", "local source url must be explicit null");
    const expectedPath = typeof source.path === "string" && source.path.endsWith(".pdf")
      ? `papers/${slug}/paper.pdf`
      : `papers/${slug}/paper.md`;
    if (!isSafeRelativePath(source.path) || source.path !== expectedPath) {
      addError(errors, `${errorPath}.path`, "INVALID_LOCAL_SOURCE_PATH", "local path must match papers/<slug>/paper.md or paper.pdf");
    }
    if (typeof source.sha256 !== "string" || !SHA256_RE.test(source.sha256)) {
      addError(errors, `${errorPath}.sha256`, "INVALID_SOURCE_SHA256", "local source sha256 must be 64 lowercase hex characters");
    }
    if (!SOURCE_ARTIFACT_TYPES.has(source.artifact_type)) {
      addError(errors, `${errorPath}.artifact_type`, "INVALID_ARTIFACT_TYPE", "local artifact_type is unsupported");
    } else if (
      (source.path?.endsWith(".pdf") && source.artifact_type !== "original-pdf")
      || (source.path?.endsWith(".md") && source.artifact_type !== "parsed-paper-markdown")
    ) {
      addError(errors, `${errorPath}.artifact_type`, "ARTIFACT_TYPE_MISMATCH", "artifact_type must match the local source extension");
    }
    return;
  }
  addError(errors, `${errorPath}.kind`, "INVALID_SOURCE_KIND", "source kind must be remote or local");
}

function validateHumanVerification(verification, { errors, errorPath }) {
  if (!checkExactKeys(errors, verification, errorPath, ["status", "by", "date", "scope", "blocked_reason"])) return;
  if (!VERIFICATION_STATUSES.has(verification.status)) {
    addError(errors, `${errorPath}.status`, "INVALID_VERIFICATION_STATUS", "verification status is unsupported");
    return;
  }

  if (verification.status === "UNVERIFIED") {
    if ([verification.by, verification.date, verification.scope, verification.blocked_reason].some((value) => value !== null)) {
      addError(errors, errorPath, "UNVERIFIED_NULL_MATRIX", "UNVERIFIED evidence fields must be explicit null");
    }
    return;
  }

  if (verification.status === "VERIFIED") {
    if (typeof verification.by !== "string" || !REVIEWER_ALIAS_RE.test(verification.by)) {
      addError(errors, `${errorPath}.by`, "VERIFIED_REQUIRES_BY", "VERIFIED requires a public stable role or alias");
    }
    if (!isValidDate(verification.date)) {
      addError(errors, `${errorPath}.date`, "VERIFIED_REQUIRES_DATE", "VERIFIED requires a valid YYYY-MM-DD date");
    }
    if (!VERIFICATION_SCOPES.has(verification.scope)) {
      addError(errors, `${errorPath}.scope`, "VERIFIED_REQUIRES_SCOPE", "VERIFIED requires a supported scope");
    }
    if (verification.blocked_reason !== null) {
      addError(errors, `${errorPath}.blocked_reason`, "VERIFIED_REASON_MUST_BE_NULL", "VERIFIED blocked_reason must be explicit null");
    }
    return;
  }

  if (typeof verification.blocked_reason !== "string" || !verification.blocked_reason.trim()) {
    addError(errors, `${errorPath}.blocked_reason`, "BLOCKED_REQUIRES_REASON", "BLOCKED requires a non-empty reason");
  }
  if ([verification.by, verification.date, verification.scope].some((value) => value !== null)) {
    addError(errors, errorPath, "BLOCKED_NULL_MATRIX", "BLOCKED reviewer fields must be explicit null");
  }
}

function validateGeneratedAsset(asset, { errors, contentCommit, slug, errorPath }) {
  if (!checkExactKeys(errors, asset, errorPath, [
    "kind",
    "tracked",
    "path",
    "sha256",
    "generator",
    "input_fingerprint",
    "content_commit",
  ])) return;

  if (!GENERATED_ASSET_KINDS.has(asset.kind)) {
    addError(errors, `${errorPath}.kind`, "INVALID_ASSET_KIND", "generated asset kind is unsupported");
  }
  if (asset.tracked !== true) {
    addError(errors, `${errorPath}.tracked`, "ASSET_MUST_BE_TRACKED", "incomplete or untracked assets must be omitted");
  }
  if (!isSafeRelativePath(asset.path)) {
    addError(errors, `${errorPath}.path`, "INVALID_ASSET_PATH", "generated asset path must be repository-relative");
  } else if (!generatedAssetPathMatches({ kind: asset.kind, slug, assetPath: asset.path })) {
    addError(errors, `${errorPath}.path`, "ASSET_PATH_KIND_MISMATCH", "generated asset path must match its kind and note slug");
  }
  if (typeof asset.sha256 !== "string" || !SHA256_RE.test(asset.sha256)) {
    addError(errors, `${errorPath}.sha256`, "TRACKED_ASSET_REQUIRES_SHA256", "tracked generated asset requires a sha256");
  }
  if (typeof asset.generator !== "string" || !GENERATOR_RE.test(asset.generator)) {
    addError(errors, `${errorPath}.generator`, "INVALID_ASSET_GENERATOR", "generated asset requires a stable generator id");
  }
  if (typeof asset.input_fingerprint !== "string" || !SHA256_RE.test(asset.input_fingerprint)) {
    addError(errors, `${errorPath}.input_fingerprint`, "INVALID_INPUT_FINGERPRINT", "generated asset requires a sha256 input fingerprint");
  }
  if (typeof asset.content_commit !== "string" || !GIT_SHA_RE.test(asset.content_commit)) {
    addError(errors, `${errorPath}.content_commit`, "INVALID_ASSET_CONTENT_COMMIT", "generated asset requires a 40-character content commit");
  } else if (asset.content_commit !== contentCommit) {
    addError(errors, `${errorPath}.content_commit`, "ASSET_COMMIT_MISMATCH", "generated asset commit must match the document");
  }
}

export function validateProvenanceRecord(record, { contentCommit, index = 0 } = {}) {
  const errors = [];
  const errorPath = `notes[${index}]`;
  if (!checkExactKeys(errors, record, errorPath, [
    "slug",
    "note_path",
    "note_sha256",
    "source",
    "human_verification",
    "generated_assets",
  ])) return { ok: false, errors };

  if (typeof record.slug !== "string" || !SLUG_RE.test(record.slug)) {
    addError(errors, `${errorPath}.slug`, "INVALID_SLUG", "slug must be lowercase kebab-case");
  }
  if (!isSafeRelativePath(record.note_path) || record.note_path !== `notes/${record.slug}.md`) {
    addError(errors, `${errorPath}.note_path`, "INVALID_NOTE_PATH", "note_path must match notes/<slug>.md");
  }
  if (typeof record.note_sha256 !== "string" || !SHA256_RE.test(record.note_sha256)) {
    addError(errors, `${errorPath}.note_sha256`, "INVALID_NOTE_SHA256", "note_sha256 must be 64 lowercase hex characters");
  }

  validateSource(record.source, { errors, slug: record.slug, errorPath: `${errorPath}.source` });
  validateHumanVerification(record.human_verification, { errors, errorPath: `${errorPath}.human_verification` });

  if (!Array.isArray(record.generated_assets)) {
    addError(errors, `${errorPath}.generated_assets`, "INVALID_GENERATED_ASSETS", "generated_assets must be an array");
  } else {
    const assetPaths = new Set();
    for (const [assetIndex, asset] of record.generated_assets.entries()) {
      validateGeneratedAsset(asset, {
        errors,
        contentCommit,
        slug: record.slug,
        errorPath: `${errorPath}.generated_assets[${assetIndex}]`,
      });
      if (typeof asset?.path === "string") {
        if (assetPaths.has(asset.path)) {
          addError(errors, `${errorPath}.generated_assets[${assetIndex}].path`, "DUPLICATE_ASSET_PATH", "generated asset paths must be unique per note");
        }
        assetPaths.add(asset.path);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateProvenanceDocument(document) {
  const errors = [];
  if (!checkExactKeys(errors, document, "$", ["schema_version", "content_commit", "notes"])) {
    return { ok: false, errors };
  }

  if (document.schema_version !== PROVENANCE_SCHEMA_VERSION) {
    addError(
      errors,
      "$.schema_version",
      "UNSUPPORTED_SCHEMA_VERSION",
      `supported schema version is exactly ${PROVENANCE_SCHEMA_VERSION}`,
    );
  }
  if (typeof document.content_commit !== "string" || !GIT_SHA_RE.test(document.content_commit)) {
    addError(errors, "$.content_commit", "INVALID_CONTENT_COMMIT", "content_commit must be 40 lowercase hex characters");
  }
  if (!Array.isArray(document.notes)) {
    addError(errors, "$.notes", "INVALID_NOTES", "notes must be an array");
    return { ok: false, errors };
  }
  if (document.notes.length === 0) {
    addError(errors, "$.notes", "EMPTY_NOTES", "notes must contain at least one provenance record");
  }

  const slugs = new Set();
  const globalAssetPaths = new Map();
  for (const [index, record] of document.notes.entries()) {
    const result = validateProvenanceRecord(record, { contentCommit: document.content_commit, index });
    errors.push(...result.errors);
    if (typeof record?.slug === "string") {
      if (slugs.has(record.slug)) addError(errors, `notes[${index}].slug`, "DUPLICATE_SLUG", "slug must be unique");
      slugs.add(record.slug);
    }
    if (Array.isArray(record?.generated_assets)) {
      for (const [assetIndex, asset] of record.generated_assets.entries()) {
        if (typeof asset?.path !== "string") continue;
        const firstNoteIndex = globalAssetPaths.get(asset.path);
        if (firstNoteIndex !== undefined && firstNoteIndex !== index) {
          addError(
            errors,
            `notes[${index}].generated_assets[${assetIndex}].path`,
            "DUPLICATE_ASSET_PATH",
            "generated asset path must be unique across the document",
          );
        } else if (firstNoteIndex === undefined) {
          globalAssetPaths.set(asset.path, index);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
