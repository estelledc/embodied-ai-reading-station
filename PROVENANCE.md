# Provenance policy

`EAI-PROVENANCE-2.0.0` is the repository's provenance policy. The canonical machine document is `papers/provenance.json`; its exact schema version is `2.0.0`, and the public build copies the same bytes to `data/v2/provenance.json`.

This document describes process and field meaning only. It does not embed paper text, PDFs, image bytes, credentials, or device-specific paths.

## Stable identity and evidence

- `slug` is the stable note key; display numbers are not identities.
- `note_path` and `note_sha256` bind each project note to repository bytes.
- `source` is a remote/local discriminated union. Local source hashes prove byte identity, not permission or human review.
- `human_verification` distinguishes `UNVERIFIED`, `VERIFIED`, and `BLOCKED`; each state has fail-closed evidence requirements.
- `generated_assets` stores only kind, tracked repository-relative path, SHA-256, generator ID, input fingerprint, and the same content snapshot commit. It never stores asset bytes.
- `content_commit` identifies an existing immutable content-input snapshot. `generated_at` is deterministic build metadata and is never a content identity.

Content inputs are updated in two stages: first commit the changed input bytes as an immutable snapshot; then generate and validate the manifest in a later commit against both the current tree and that snapshot. Generator failure must not partially overwrite the canonical manifest.

## Rights mapping

The `EAI-LICENSE-MAP-1.0.0` classes in [NOTICE.md](NOTICE.md) bind to existing provenance v2 fields:

| Stable asset class | Provenance binding | Rights boundary |
|---|---|---|
| `project-code` | Outside the note provenance document | `MIT`; see [LICENSE](LICENSE). |
| `project-notes` | `notes[].note_path`, `notes[].note_sha256` | Project declaration: `CC-BY-4.0`. |
| `project-generated-images` | No current provenance v2 field proves licensable rights | Policy declaration: `CC-BY-4.0`; no asset is machine-bound to this class yet. |
| `third-party-paper-materials` | `notes[].source`, `notes[].generated_assets` | Fail-closed default: `NOASSERTION`; source-specific terms control. |

The generated-asset `kind` is an evidence role, not a license, and the existing generator/fingerprint fields do not prove copyright ownership. In particular, an extracted figure remains third-party material even when it is represented by a generated-asset record. Until a separately reviewed rights binding exists, every generated-asset record falls back to `third-party-paper-materials`; it must not inherit the project CC declaration.

## Current boundary

At T009 implementation time, the canonical manifest contained zero generated-asset records. That is a historical baseline, not a permanent counter. Existing site images therefore must not be described as fully registered or license-verified by provenance; the rendered About page derives the live count from the canonical manifest.

The build gate validates schema, current bytes, the content snapshot, document links, public copies, mapping consistency, and binary changes after the accepted review baseline `5b02c23a3184cc2c2857fd5b6383780714a2f502`. Until the schema gains a separately reviewed rights discriminator, every added or modified binary fails closed even if path and hash provenance exist. Changing this baseline or opening an exception requires an explicit governance-contract review; deletion remains allowed.

These gates cannot establish authorship, copyright ownership, source permissions, or production deployment status; those remain `UNVERIFIED_OWNER_OR_LEGAL` or `UNVERIFIED_RUNTIME` until supported by independent evidence.
