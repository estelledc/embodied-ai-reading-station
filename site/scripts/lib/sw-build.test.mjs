import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatServiceWorkerBuildId,
  loadSiteCommit,
  renderServiceWorker,
} from "./assets.mjs";

const SITE_COMMIT = "abcdef0123456789abcdef0123456789abcdef01";
const BUILD_ID = "20250702234640-abcdef012345";
const SCHEMA_VERSION = "2.0.0";
const CONTENT_COMMIT = "0123456789abcdef0123456789abcdef01234567";
const SOURCE = `
const BUILD_ID = "__EAI_BUILD_ID__";
const DATA_SCHEMA_VERSION = "__EAI_DATA_SCHEMA_VERSION__";
const CONTENT_COMMIT = "__EAI_CONTENT_COMMIT__";
const DATA_CACHE = \`eai-data-\${BUILD_ID}-v\${DATA_SCHEMA_VERSION.split(".")[0]}-\${CONTENT_COMMIT}\`;
`;

function render(source = SOURCE, overrides = {}) {
  return renderServiceWorker(source, {
    buildId: BUILD_ID,
    schemaVersion: SCHEMA_VERSION,
    contentCommit: CONTENT_COMMIT,
    ...overrides,
  });
}

test("service worker renderer injects exact build, schema, and content identities", () => {
  const output = render();

  assert.match(output, /const BUILD_ID = "20250702234640-abcdef012345";/);
  assert.match(output, /const DATA_SCHEMA_VERSION = "2\.0\.0";/);
  assert.match(output, /const CONTENT_COMMIT = "0123456789abcdef0123456789abcdef01234567";/);
  assert.doesNotMatch(output, /__EAI_[A-Z0-9_]+__/);
  assert.match(
    output,
    /eai-data-\$\{BUILD_ID\}-v\$\{DATA_SCHEMA_VERSION\.split\("\."\)\[0\]\}-\$\{CONTENT_COMMIT\}/,
  );
});

test("service worker renderer fails closed when a required sentinel is missing", async (t) => {
  for (const sentinel of [
    "__EAI_BUILD_ID__",
    "__EAI_DATA_SCHEMA_VERSION__",
    "__EAI_CONTENT_COMMIT__",
  ]) {
    await t.test(sentinel, () => {
      assert.throws(
        () => render(SOURCE.replace(sentinel, "missing")),
        new RegExp(`requires one exact sentinel declaration for: .*${sentinel}`),
      );
    });
  }
});

test("service worker renderer rejects commented or duplicate sentinel declarations", () => {
  const declaration = 'const BUILD_ID = "__EAI_BUILD_ID__";';
  assert.throws(
    () => render(SOURCE.replace(
      declaration,
      `// ${declaration}\nconst BUILD_ID = "stale-build";`,
    )),
    /one exact sentinel declaration.*__EAI_BUILD_ID__/,
  );
  assert.throws(
    () => render(`${SOURCE}\n${declaration}`),
    /unreplaced sentinel.*__EAI_BUILD_ID__/,
  );
  assert.throws(
    () => render(SOURCE.replace(
      declaration,
      `/*\n${declaration}\n*/\nconst BUILD_ID = "stale-build";`,
    )),
    /one exact sentinel declaration.*__EAI_BUILD_ID__/,
  );
});

test("service worker renderer rejects malformed build identities", () => {
  for (const buildId of [
    "20250702234640",
    "20250702234640-abcdef01234",
    "20250702234640-ABCDEF012345",
    "20250702T234640-abcdef012345",
    "",
  ]) {
    assert.throws(
      () => render(SOURCE, { buildId }),
      /buildId must be 14 UTC digits plus a 12-character lowercase commit prefix/,
    );
  }
});

test("service worker renderer rejects malformed semantic versions", () => {
  for (const schemaVersion of ["2", "2.0", "02.0.0", "2.0.0.0", "v2.0.0", ""]) {
    assert.throws(() => render(SOURCE, { schemaVersion }), /schemaVersion must be valid semver/);
  }
});

test("service worker renderer rejects malformed content commits", () => {
  for (const contentCommit of [
    "0123456789abcdef0123456789abcdef0123456",
    "0123456789ABCDEF0123456789ABCDEF01234567",
    "HEAD",
    "",
  ]) {
    assert.throws(
      () => render(SOURCE, { contentCommit }),
      /contentCommit must be 40 lowercase hexadecimal characters/,
    );
  }
});

test("service worker renderer rejects any sentinel left unreplaced", () => {
  assert.throws(
    () => render(`${SOURCE}\nconst FUTURE_VALUE = "__EAI_FUTURE_SENTINEL__";`),
    /unreplaced sentinel\(s\): __EAI_FUTURE_SENTINEL__/,
  );
});

test("fixed SOURCE_DATE_EPOCH and site commit map to a deterministic worker", () => {
  const buildId = formatServiceWorkerBuildId(
    new Date(1_751_500_000 * 1000),
    SITE_COMMIT,
  );
  assert.equal(buildId, BUILD_ID);

  const first = render(SOURCE, { buildId });
  const second = render(SOURCE, { buildId });
  assert.equal(first, second);
  assert.throws(
    () => formatServiceWorkerBuildId(new Date("invalid"), SITE_COMMIT),
    /valid Date/,
  );
  assert.throws(
    () => formatServiceWorkerBuildId(new Date(0), "HEAD"),
    /site commit must be 40 lowercase hexadecimal characters/,
  );
});

test("site commit loader reads the exact lowercase HEAD with trace sockets disabled", () => {
  const invocations = [];
  const commit = loadSiteCommit({
    cwd: "/tmp/example",
    environment: {
      PATH: "/usr/bin:/bin",
      GIT_DIR: "/tmp/wrong.git",
      GIT_WORK_TREE: "/tmp/wrong-worktree",
      GIT_TRACE2: "/tmp/trace.sock",
    },
    executor(command, args, options) {
      invocations.push({ command, args, options });
      return args.includes("--show-toplevel") ? "/tmp/example\n" : `${SITE_COMMIT}\n`;
    },
  });

  assert.equal(commit, SITE_COMMIT);
  assert.deepEqual(invocations.map(({ command, args }) => [command, args]), [
    ["git", ["rev-parse", "--show-toplevel"]],
    ["git", ["rev-parse", "HEAD"]],
  ]);
  for (const invocation of invocations) {
    assert.equal(invocation.options.cwd, "/tmp/example");
    assert.equal(invocation.options.env.GIT_DIR, undefined);
    assert.equal(invocation.options.env.GIT_WORK_TREE, undefined);
    assert.equal(invocation.options.env.GIT_TRACE2, "0");
    assert.equal(invocation.options.env.GIT_TRACE2_EVENT, "0");
    assert.equal(invocation.options.env.GIT_TRACE2_PERF, "0");
  }
});

test("site commit loader fails closed for command errors and non-canonical output", () => {
  assert.throws(
    () => loadSiteCommit({ executor() { throw new Error("boom"); } }),
    /must be readable with git rev-parse HEAD/,
  );
  assert.throws(
    () => loadSiteCommit({
      cwd: "/tmp/example",
      executor(command, args) {
        return args.includes("--show-toplevel") ? "/tmp/example\n" : SITE_COMMIT.toUpperCase();
      },
    }),
    /must be 40 lowercase hexadecimal characters/,
  );
  assert.throws(
    () => loadSiteCommit({
      cwd: "/tmp/example",
      executor(command, args) {
        return args.includes("--show-toplevel") ? "/tmp/other\n" : SITE_COMMIT;
      },
    }),
    /must come from the project repository root/,
  );
});
