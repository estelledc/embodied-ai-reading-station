import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DATA_API_CONTRACT,
  DATA_API_FIELD_DICTIONARY,
  PROVENANCE_FIELD_DICTIONARY,
  PROVENANCE_DOCUMENT_CONTRACT,
  PROVENANCE_SCHEMA_VERSION,
  validateProvenanceDocument,
  validateProvenanceRecord,
} from "./provenance-schema.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, "../fixtures");

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
}

function parentAt(value, segments) {
  let current = value;
  for (const segment of segments.slice(0, -1)) current = current[segment];
  return [current, segments.at(-1)];
}

function applyCase(base, invalidCase) {
  const document = structuredClone(base);
  if (invalidCase.operation === "duplicate-note") {
    document.notes.push(structuredClone(document.notes[invalidCase.source_index]));
    return document;
  }
  if (invalidCase.operation === "copy-asset-to-note") {
    document.notes[invalidCase.target_note_index].generated_assets.push(structuredClone(
      document.notes[invalidCase.source_note_index].generated_assets[invalidCase.source_asset_index],
    ));
    return document;
  }
  const [parent, key] = parentAt(document, invalidCase.path);
  if (invalidCase.operation === "delete") delete parent[key];
  else if (invalidCase.operation === "set") parent[key] = invalidCase.value;
  else throw new Error(`unknown fixture operation: ${invalidCase.operation}`);
  return document;
}

test("contract fixtures are valid JSON and retain the legacy v1 shape", () => {
  const v1 = readFixture("provenance-v1.json");
  const valid = readFixture("provenance-v2-valid.json");
  const invalid = readFixture("provenance-v2-invalid.json");

  assert.equal(v1.schema_version, "1.0.0");
  assert.ok(Array.isArray(v1.entries));
  assert.equal(valid.schema_version, PROVENANCE_SCHEMA_VERSION);
  assert.equal(invalid.base_fixture, "provenance-v2-valid.json");
  assert.ok(invalid.cases.length >= 10);
});

test("field dictionary freezes type, null, default, source, consumer, and migration semantics", () => {
  assert.ok(Object.keys(PROVENANCE_FIELD_DICTIONARY).length >= 20);
  for (const [dictionaryName, dictionary] of [
    ["provenance", PROVENANCE_FIELD_DICTIONARY],
    ["data API", DATA_API_FIELD_DICTIONARY],
  ]) {
    for (const [field, definition] of Object.entries(dictionary)) {
      for (const key of ["type", "nullable", "default", "source", "consumers", "migration"]) {
        assert.ok(Object.hasOwn(definition, key), `${dictionaryName}.${field} is missing ${key}`);
      }
      assert.ok(
        Array.isArray(definition.consumers) && definition.consumers.length > 0,
        `${dictionaryName}.${field} needs consumers`,
      );
    }
  }

  assert.equal(PROVENANCE_FIELD_DICTIONARY.content_commit.storage, "tracked-input-snapshot-reference");
  assert.equal(PROVENANCE_DOCUMENT_CONTRACT.tracked_path, "papers/provenance.json");
  assert.deepEqual(PROVENANCE_DOCUMENT_CONTRACT.top_level_fields, ["schema_version", "content_commit", "notes"]);
  assert.match(PROVENANCE_DOCUMENT_CONTRACT.freshness_invariant, /current tracked content bytes/);
  assert.equal(DATA_API_CONTRACT.legacy_endpoint, "/data/papers.json");
  assert.equal(DATA_API_CONTRACT.versioned_papers_endpoint, "/data/v2/papers.json");
  assert.equal(DATA_API_CONTRACT.versioned_index_endpoint, "/data/v2/index.json");
  assert.equal(DATA_API_CONTRACT.versioned_provenance_endpoint, "/data/v2/provenance.json");
  assert.deepEqual(DATA_API_CONTRACT.envelope_fields, ["schema_version", "content_commit", "generated_at", "data"]);
  assert.deepEqual(DATA_API_CONTRACT.index_data_fields, [
    "papers_endpoint", "legacy_endpoint", "deprecation", "license", "provenance",
  ]);
  assert.deepEqual(DATA_API_CONTRACT.license_fields, ["policy_id", "asset_classes", "document", "notice"]);
  assert.deepEqual(DATA_API_CONTRACT.license_asset_class_fields, [
    "id", "license_expression", "reference_url", "project_license_declared", "provenance_fields",
  ]);
  assert.deepEqual(DATA_API_CONTRACT.provenance_reference_fields, [
    "policy_id", "schema_version", "endpoint", "policy",
  ]);
  assert.deepEqual(DATA_API_CONTRACT.deprecation_default, { status: "supported", removal_version: null });
  assert.deepEqual(
    DATA_API_CONTRACT.paper_record_fields,
    [
      "slug", "num", "title", "topic", "topicLabel", "era", "year", "venue", "difficulty",
      "tldr", "wordCount", "readingMinutes", "tags", "url", "sourcePath", "status",
      "generated_at", "content_modified",
    ],
  );
  for (const field of DATA_API_CONTRACT.paper_record_fields) {
    assert.ok(Object.hasOwn(DATA_API_FIELD_DICTIONARY, `data[].${field}`), `missing data[].${field}`);
  }
  for (const field of [
    "data.papers_endpoint",
    "data.legacy_endpoint",
    "data.deprecation",
    "data.deprecation.status",
    "data.deprecation.removal_version",
    "data.license",
    "data.license.policy_id",
    "data.license.asset_classes",
    "data.license.asset_classes[].id",
    "data.license.asset_classes[].license_expression",
    "data.license.asset_classes[].reference_url",
    "data.license.asset_classes[].project_license_declared",
    "data.license.asset_classes[].provenance_fields",
    "data.license.document",
    "data.license.notice",
    "data.provenance",
    "data.provenance.policy_id",
    "data.provenance.schema_version",
    "data.provenance.endpoint",
    "data.provenance.policy",
  ]) {
    assert.ok(Object.hasOwn(DATA_API_FIELD_DICTIONARY, field), `missing ${field}`);
  }
  assert.equal(DATA_API_CONTRACT.stable_key, "slug");
  assert.ok(DATA_API_CONTRACT.display_only_fields.includes("num"));
});

test("valid v2 fixture covers local, remote, verification states, and generated asset evidence", () => {
  const document = readFixture("provenance-v2-valid.json");
  const before = JSON.stringify(document);
  const result = validateProvenanceDocument(document);

  assert.deepEqual(result, { ok: true, errors: [] });
  assert.equal(JSON.stringify(document), before, "validation must be pure");
  assert.deepEqual(new Set(document.notes.map((note) => note.source.kind)), new Set(["local", "remote"]));
  assert.deepEqual(
    new Set(document.notes.map((note) => note.human_verification.status)),
    new Set(["UNVERIFIED", "VERIFIED", "BLOCKED"]),
  );
  assert.ok(document.notes.flatMap((note) => note.generated_assets).every((asset) => asset.tracked === true));

  for (const [index, record] of document.notes.entries()) {
    assert.deepEqual(
      validateProvenanceRecord(record, { contentCommit: document.content_commit, index }),
      { ok: true, errors: [] },
    );
  }

  const shortPublicAlias = structuredClone(document);
  shortPublicAlias.notes[1].human_verification.by = "a";
  assert.equal(validateProvenanceDocument(shortPublicAlias).ok, true);
});

test("invalid fixture matrix fails closed with stable error codes", async (t) => {
  const base = readFixture("provenance-v2-valid.json");
  const { cases } = readFixture("provenance-v2-invalid.json");

  for (const invalidCase of cases) {
    await t.test(invalidCase.name, () => {
      const result = validateProvenanceDocument(applyCase(base, invalidCase));
      assert.equal(result.ok, false);
      assert.ok(
        result.errors.some((error) => error.code === invalidCase.expected_code),
        `${invalidCase.name}: expected ${invalidCase.expected_code}, got ${JSON.stringify(result.errors)}`,
      );
    });
  }
});
