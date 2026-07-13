# Provenance v2 contract

Status: canonical provenance shape frozen by `EAI13-T001`; Data API discovery completed by `EAI13-T004`, followed by the completed pre-v1.3 governance revision `EAI13-T009`. The revision did not change note records, the four-field papers/index envelope, or the exact `2.0.0` producer version.

The executable source of truth is [`site/scripts/lib/provenance-schema.mjs`](../site/scripts/lib/provenance-schema.mjs). Its exported provenance and data-API field dictionaries record every field's type, nullability, default, source, consumers, and migration rule. Fixtures live in [`site/scripts/fixtures/`](../site/scripts/fixtures/).

## Document identity

The derived provenance document has exactly three top-level fields:

| Field | Contract |
|---|---|
| `schema_version` | Producer and repository validator support exactly `2.0.0`. A future schema version needs an explicit validator update. |
| `content_commit` | 40-character lowercase Git SHA of an existing immutable content input snapshot. |
| `notes` | Non-empty array with one unique record per note, ordered by `slug` by the canonical producer. |

T002 migrated the tracked canonical file at `papers/provenance.json` to this same document shape. `content_commit` identifies the existing commit whose `notes/<slug>.md`, local source, and tracked generated-asset bytes match the recorded hashes. It may therefore predate the commit that adds or updates the manifest. It must never claim to be the commit containing that newly written manifest, which would be an unsatisfiable Git SHA self-reference.

T003 enforces a three-way freshness invariant: current HEAD/worktree complete inventory and bytes = manifest paths/hashes = bytes at `content_commit`. Merely proving that an old ancestor still matches an old manifest is insufficient; a note, source, or asset changed after that snapshot must fail until a new snapshot and attestation are supplied.

For the first migration, `5b02c23a3184cc2c2857fd5b6383780714a2f502` is the frozen input snapshot because T001 does not change notes, local paper inputs, or production provenance. Future content edits require a content-snapshot commit followed by a manifest-attestation commit; code-only commits do not force provenance churn.

The schema producer and validator fail closed on every version except exact `2.0.0`. The browser adapter accepts compatible `2.x` envelopes after checking the consumer-required `schema_version`, `content_commit`, and `data` fields, but rejects an unknown major version.

## Note identity

- `slug` is the only stable key and uses lowercase kebab case.
- `note_path` is exactly `notes/<slug>.md`.
- `note_sha256` hashes the raw note bytes.
- `num` is display-only, is not part of provenance identity, and may repeat.

T001 validates path and hash shape. T002/T003 enforce repository existence, symlink traversal, byte/hash matching, the exact 156-record inventory, and deterministic ordering.

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

The migration initialized every record as `UNVERIFIED`. A valid local file hash is machine evidence, not human verification.

## Generated assets

`generated_assets` is always an array. An entry is provenance evidence only when all of these fields are known:

- `kind`: `card`, `inline-scene`, `inline-method`, or `extracted-figure`;
- `tracked`: literal `true`;
- safe repository-relative `path` and byte `sha256`;
- stable `generator` ID and SHA-256 `input_fingerprint`;
- `content_commit` equal to the containing document.

Paths are bound to both kind and note identity: cards live at `site/src/images/cards/<slug>(-<numeric-variant>).webp`, inline assets at `site/src/images/inline/<slug>-scene|method(-<numeric-variant>).webp`, and extracted figures below `papers/<slug>/images/` with a raster image extension. Asset paths are globally unique across the document.

Incomplete or untracked assets are omitted; the migration does not invent a fingerprint. The document records metadata only and never embeds a paper, PDF, image, credential, or local absolute path.

Generated-asset `kind` is an evidence role, not a license, and registration alone cannot prove ownership. The current v2 fields therefore bind all `notes[].generated_assets` to the fail-closed `third-party-paper-materials` / `NOASSERTION` class. `project-generated-images` remains a policy class with no automatic field binding until a separately reviewed rights discriminator exists.

## Public data compatibility

- Keep legacy `/data/papers.json` as a bare array for the complete v1.3 compatibility window.
- `/data/v2/papers.json` and `/data/v2/index.json` both use exactly `schema_version`, `content_commit`, `generated_at`, and `data`; `generated_at` is deterministic build metadata, never content identity.
- `papers.json.data` is the legacy-compatible record array. T009 completed the pre-v1.3 `index.json.data` shape as `papers_endpoint`, `legacy_endpoint`, `deprecation`, `license`, and `provenance`; deprecation remains `{ "status": "supported", "removal_version": null }`.
- `license` binds the exact four asset classes to stable `MIT`, `CC-BY-4.0`, or `NOASSERTION` expressions and existing provenance field names. `NOASSERTION` is not a project license grant.
- `provenance` discovers `EAI-PROVENANCE-2.0.0`, its public process policy, and `/data/v2/provenance.json`. That endpoint is a byte-identical publication of canonical `papers/provenance.json`, so it intentionally keeps the three-field provenance manifest shape rather than the Data API envelope.
- Legacy `/data/index.json.license` retains its original string value; its additive `governance` object mirrors the v2 license/provenance mapping.
- The paper record remains the current 18-field projection: `slug`, `num`, `title`, `topic`, `topicLabel`, `era`, `year`, `venue`, `difficulty`, `tldr`, `wordCount`, `readingMinutes`, `tags`, `url`, `sourcePath`, `status`, `generated_at`, and `content_modified`. Their types, null/default rules, sources, consumers, and migration semantics are frozen in `DATA_API_FIELD_DICTIONARY`.
- Use `slug` as the stable key; `num` remains display-only.
- T001 did not publish either endpoint. T004 completed the paper-data producer/consumer migration. T009 subsequently completed governance discovery and the public provenance endpoint; it did not change the browser paper consumers.

## Validation split

T001 is a pure, side-effect-free shape contract. T002 owns canonical loading and deterministic migration. T003 independently verifies repository inventory, path existence, intermediate symlinks, real hashes, generated-asset bytes, and failure-closed integration with `npm run check`.
