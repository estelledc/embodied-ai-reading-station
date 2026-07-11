import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildDataApiEnvelopes,
  loadCanonicalContentCommit,
} from "./data-api.mjs";
import { DATA_API_CONTRACT } from "./provenance-schema.mjs";

const CONTENT_COMMIT = "0123456789abcdef0123456789abcdef01234567";

test("v2 papers/index envelopes share exact metadata and contract field order", () => {
  const papers = [{ slug: "clip", title: "CLIP" }];
  const generatedAt = "2025-07-02T23:46:40.000Z";
  const { papersEnvelope, indexEnvelope } = buildDataApiEnvelopes(papers, {
    contentCommit: CONTENT_COMMIT,
    generatedAt,
    route: value => `/repo${value}`,
  });

  assert.deepEqual(Object.keys(papersEnvelope), DATA_API_CONTRACT.envelope_fields);
  assert.deepEqual(Object.keys(indexEnvelope), DATA_API_CONTRACT.envelope_fields);
  assert.equal(papersEnvelope.schema_version, "2.0.0");
  assert.equal(indexEnvelope.schema_version, "2.0.0");
  assert.equal(papersEnvelope.content_commit, CONTENT_COMMIT);
  assert.equal(indexEnvelope.content_commit, CONTENT_COMMIT);
  assert.equal(papersEnvelope.generated_at, generatedAt);
  assert.equal(indexEnvelope.generated_at, generatedAt);
  assert.strictEqual(papersEnvelope.data, papers);
  assert.deepEqual(indexEnvelope.data, {
    papers_endpoint: "/repo/data/v2/papers.json",
    legacy_endpoint: "/repo/data/papers.json",
    deprecation: {
      status: "supported",
      removal_version: null,
    },
  });
  assert.deepEqual(Object.keys(indexEnvelope.data), DATA_API_CONTRACT.index_data_fields);
  assert.deepEqual(
    Object.keys(indexEnvelope.data.deprecation),
    DATA_API_CONTRACT.deprecation_fields
  );
});

test("content_commit is read from the canonical provenance document", () => {
  let observedPath = null;
  const contentCommit = loadCanonicalContentCommit({
    manifestPath: "/repo/papers/provenance.json",
    readFileSync: file => {
      observedPath = file;
      return JSON.stringify({
        schema_version: "2.0.0",
        content_commit: CONTENT_COMMIT,
        notes: [],
      });
    },
  });

  assert.equal(observedPath, "/repo/papers/provenance.json");
  assert.equal(contentCommit, CONTENT_COMMIT);
});

test("canonical provenance metadata fails closed on schema or commit drift", () => {
  assert.throws(
    () => loadCanonicalContentCommit({
      readFileSync: () => JSON.stringify({
        schema_version: "3.0.0",
        content_commit: CONTENT_COMMIT,
      }),
    }),
    /schema_version/
  );
  assert.throws(
    () => loadCanonicalContentCommit({
      readFileSync: () => JSON.stringify({
        schema_version: "2.0.0",
        content_commit: "HEAD",
      }),
    }),
    /content_commit/
  );
});

test("v2 envelope construction rejects malformed producer inputs", () => {
  assert.throws(
    () => buildDataApiEnvelopes({}, { contentCommit: CONTENT_COMMIT }),
    /papers must be an array/
  );
  assert.throws(
    () => buildDataApiEnvelopes([], { contentCommit: "HEAD" }),
    /content_commit/
  );
  assert.throws(
    () => buildDataApiEnvelopes([], {
      contentCommit: CONTENT_COMMIT,
      generatedAt: "2025-07-02",
    }),
    /generated_at/
  );
});

test("default build metadata and endpoints honor SOURCE_DATE_EPOCH and SITE_BASE", () => {
  const modulePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "data-api.mjs");
  const script = `
    import { buildDataApiEnvelopes } from ${JSON.stringify(modulePath)};
    const result = buildDataApiEnvelopes([], { contentCommit: ${JSON.stringify(CONTENT_COMMIT)} });
    process.stdout.write(JSON.stringify({
      generated_at: result.papersEnvelope.generated_at,
      data: result.indexEnvelope.data,
    }));
  `;
  for (const [siteBase, prefix] of [["", ""], ["/repo", "/repo"]]) {
    const env = {
      ...process.env,
      SOURCE_DATE_EPOCH: "1751500000",
      SITE_BASE: siteBase,
    };
    const result = JSON.parse(execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { env, stdio: ["ignore", "pipe", "pipe"] }
    ).toString());

    assert.equal(result.generated_at, "2025-07-02T23:46:40.000Z");
    assert.equal(result.data.papers_endpoint, `${prefix}/data/v2/papers.json`);
    assert.equal(result.data.legacy_endpoint, `${prefix}/data/papers.json`);
  }
});
