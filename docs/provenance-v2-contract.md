# Provenance v2 contract

Status: frozen for `EAI13-T001`. This document defines shape and semantics only. It does not migrate `papers/provenance.json`, publish `/data/v2/`, or change a browser consumer.

The executable source of truth is [`site/scripts/lib/provenance-schema.mjs`](../site/scripts/lib/provenance-schema.mjs). Its exported provenance and data-API field dictionaries record every field's type, nullability, default, source, consumers, and migration rule. Fixtures live in [`site/scripts/fixtures/`](../site/scripts/fixtures/).

## Document identity

The derived provenance document has exactly three top-level fields:

| Field | Contract |
|---|---|
| `schema_version` | Producer and repository validator support exactly `2.0.0`. A future schema version needs an explicit validator update. |
| `content_commit` | 40-character lowercase Git SHA of an existing immutable content input snapshot. |
| `notes` | Non-empty array with one unique record per note, ordered by `slug` by the future producer. |

T002 migrates the tracked canonical file at `papers/provenance.json` to this same document shape. `content_commit` identifies the existing commit whose `notes/<slug>.md`, local source, and tracked generated-asset bytes match the recorded hashes. It may therefore predate the commit that adds or updates the manifest. It must never claim to be the commit containing that newly written manifest, which would be an unsatisfiable Git SHA self-reference.

T003 must enforce a three-way freshness invariant: current HEAD/worktree complete inventory and bytes = manifest paths/hashes = bytes at `content_commit`. Merely proving that an old ancestor still matches an old manifest is insufficient; a note, source, or asset changed after that snapshot must fail until a new snapshot and attestation are supplied.

For the first migration, `5b02c23a3184cc2c2857fd5b6383780714a2f502` is the frozen input snapshot because T001 does not change notes, local paper inputs, or production provenance. Future content edits require a content-snapshot commit followed by a manifest-attestation commit; code-only commits do not force provenance churn.

The schema producer and validator fail closed on every version except exact `2.0.0`. The later browser adapter may accept compatible `2.x` envelopes after checking required fields, but it must reject an unknown major version.

## Note identity

- `slug` is the only stable key and uses lowercase kebab case.
- `note_path` is exactly `notes/<slug>.md`.
- `note_sha256` hashes the raw note bytes.
- `num` is display-only, is not part of provenance identity, and may repeat.

T001 validates path and hash shape. Repository existence, symlink traversal, byte/hash matching, the exact 156-record inventory, and deterministic ordering belong to T002/T003.

## Source union

Every source contains all five fields. Non-applicable fields are explicit `null`.

| `kind` | `url` | `path` | `sha256` | `artifact_type` |
|---|---|---|---|---|
| `remote` | credential-free HTTPS URL | `null` | `null` | `null` |
| `local` | `null` | `papers/<slug>/paper.md` or `paper.pdf` | lowercase SHA-256 | `parsed-paper-markdown` or `original-pdf` matching the extension |

The v1.2 baseline is 46 local and 110 remote notes. Remote URLs already receive protocol and credential checks; v2 adds them to the unified document instead of treating them as unvalidated.

## Human verification

`blocked_reason` exists only at `human_verification.blocked_reason`.

| Status | `by` | `date` | `scope` | `blocked_reason` |
|---|---|---|---|---|
| `UNVERIFIED` | `null` | `null` | `null` | `null` |
| `VERIFIED` | public kebab-case role/alias | `YYYY-MM-DD` | supported scope | `null` |
| `BLOCKED` | `null` | `null` | `null` | non-empty reason |

Migration starts every record as `UNVERIFIED`. A valid local file hash is machine evidence, not human verification.

## Generated assets

`generated_assets` is always an array. An entry is provenance evidence only when all of these fields are known:

- `kind`: `card`, `inline-scene`, `inline-method`, or `extracted-figure`;
- `tracked`: literal `true`;
- safe repository-relative `path` and byte `sha256`;
- stable `generator` ID and SHA-256 `input_fingerprint`;
- `content_commit` equal to the containing document.

Paths are bound to both kind and note identity: cards live at `site/src/images/cards/<slug>(-<numeric-variant>).webp`, inline assets at `site/src/images/inline/<slug>-scene|method(-<numeric-variant>).webp`, and extracted figures below `papers/<slug>/images/` with a raster image extension. Asset paths are globally unique across the document.

Incomplete or untracked assets are omitted; the migration must not invent a fingerprint. The document records metadata only and never embeds a paper, PDF, image, credential, or local absolute path.

## Public data compatibility

- Keep legacy `/data/papers.json` as a bare array for the complete v1.3 compatibility window.
- Publish future `/data/v2/papers.json` and `/data/v2/index.json` endpoints. Both envelopes contain exactly `schema_version`, `content_commit`, `generated_at`, and `data`; `generated_at` is deterministic build metadata, never content identity.
- `papers.json.data` is the legacy-compatible record array. `index.json.data` contains exactly `papers_endpoint`, `legacy_endpoint`, and `deprecation`; deprecation starts as `{ "status": "supported", "removal_version": null }`.
- The paper record remains the current 18-field projection: `slug`, `num`, `title`, `topic`, `topicLabel`, `era`, `year`, `venue`, `difficulty`, `tldr`, `wordCount`, `readingMinutes`, `tags`, `url`, `sourcePath`, `status`, `generated_at`, and `content_modified`. Their types, null/default rules, sources, consumers, and migration semantics are frozen in `DATA_API_FIELD_DICTIONARY`.
- Use `slug` as the stable key; `num` remains display-only.
- T001 does not publish either endpoint. T004 owns producer and consumer changes.

## Validation split

T001 is a pure, side-effect-free shape contract. T002 owns canonical loading and deterministic migration. T003 independently verifies repository inventory, path existence, intermediate symlinks, real hashes, generated-asset bytes, and failure-closed integration with `npm run check`.
