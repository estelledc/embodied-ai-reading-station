import fs from "node:fs";
import path from "node:path";
import { GENERATED_AT, PAPERS_DIR, url } from "./config.mjs";
import { buildGovernanceReferences } from "./governance.mjs";
import { DATA_API_CONTRACT } from "./provenance-schema.mjs";

const CONTENT_COMMIT_RE = /^[0-9a-f]{40}$/;
const DEFAULT_MANIFEST_PATH = path.join(PAPERS_DIR, "provenance.json");

export function loadCanonicalContentCommit({
  manifestPath = DEFAULT_MANIFEST_PATH,
  readFileSync = fs.readFileSync,
} = {}) {
  let document;
  try {
    document = JSON.parse(String(readFileSync(manifestPath, "utf8")));
  } catch {
    throw new Error("canonical provenance document must be readable JSON");
  }

  if (document?.schema_version !== DATA_API_CONTRACT.schema_version) {
    throw new Error(`canonical provenance schema_version must be ${DATA_API_CONTRACT.schema_version}`);
  }
  if (!CONTENT_COMMIT_RE.test(document.content_commit ?? "")) {
    throw new Error("canonical provenance content_commit must be 40 lowercase hexadecimal characters");
  }
  return document.content_commit;
}

export function buildDataApiEnvelopes(papers, {
  contentCommit = loadCanonicalContentCommit(),
  generatedAt = GENERATED_AT,
  route = url,
} = {}) {
  if (!Array.isArray(papers)) {
    throw new TypeError("data API papers must be an array");
  }
  if (!CONTENT_COMMIT_RE.test(contentCommit)) {
    throw new Error("data API content_commit must be 40 lowercase hexadecimal characters");
  }
  const generatedDate = typeof generatedAt === "string" ? new Date(generatedAt) : null;
  if (!generatedDate || Number.isNaN(generatedDate.getTime()) || generatedDate.toISOString() !== generatedAt) {
    throw new Error("data API generated_at must be an ISO-8601 instant");
  }

  const metadata = {
    schema_version: DATA_API_CONTRACT.schema_version,
    content_commit: contentCommit,
    generated_at: generatedAt,
  };
  const governance = buildGovernanceReferences({ route });
  const papersEnvelope = {
    ...metadata,
    data: papers,
  };
  const indexEnvelope = {
    ...metadata,
    data: {
      papers_endpoint: route(DATA_API_CONTRACT.versioned_papers_endpoint),
      legacy_endpoint: route(DATA_API_CONTRACT.legacy_endpoint),
      deprecation: {
        status: DATA_API_CONTRACT.deprecation_default.status,
        removal_version: DATA_API_CONTRACT.deprecation_default.removal_version,
      },
      license: governance.license,
      provenance: governance.provenance,
    },
  };

  return { papersEnvelope, indexEnvelope };
}
