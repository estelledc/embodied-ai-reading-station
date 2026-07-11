import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPaperJsonLd } from "./papers.mjs";
import { buildFeed, contentDatesForNote } from "./seo.mjs";

test("content dates prefer explicit note lifecycle metadata", () => {
  assert.deepEqual(contentDatesForNote({
    generated_at: "2026-06-25T09:30:00Z",
    content_modified: "2026-07-02",
  }), {
    generatedAt: "2026-06-25",
    contentModified: "2026-07-02",
  });
});

test("content dates load existing generated_at frontmatter without deploy fallback", () => {
  assert.deepEqual(contentDatesForNote({ slug: "clip" }), {
    generatedAt: "2026-06-25",
    contentModified: "2026-06-25",
  });
  assert.deepEqual(contentDatesForNote({ slug: "does-not-exist" }), {
    generatedAt: null,
    contentModified: null,
  });
});

test("paper JSON-LD separates note lifecycle from source paper publication year", () => {
  const jsonLd = buildPaperJsonLd({
    slug: "example",
    title: "Example Paper",
    tldr: "A readable note.",
    topic: "vlm-foundation",
    topicLabel: "VLM Foundations",
    era: "classic",
    venue: "TestConf",
    year: 2021,
    generated_at: "2026-06-25",
    content_modified: "2026-07-02",
  }, "https://example.test/example.webp");

  const article = jsonLd["@graph"][0];
  const person = jsonLd["@graph"][1];
  assert.equal(article.datePublished, "2026-06-25");
  assert.equal(article.dateModified, "2026-07-02");
  assert.equal(article.about.datePublished, "2021-01-01");
  assert.equal(article.author["@id"], "https://estelledc.github.io/#person");
  assert.equal(person.name, "Jason Xun");
});

test("paper JSON-LD omits unknown content dates instead of using build time", () => {
  const article = buildPaperJsonLd({
    slug: "does-not-exist",
    title: "Unknown Lifecycle",
    topic: "vlm-foundation",
    topicLabel: "VLM Foundations",
  }, "https://example.test/example.webp")["@graph"][0];

  assert.equal(Object.hasOwn(article, "datePublished"), false);
  assert.equal(Object.hasOwn(article, "dateModified"), false);
});

test("Atom entry updated time comes from content metadata", () => {
  const feed = buildFeed([], [{
    slug: "example",
    num: 1,
    title: "Example",
    topicLabel: "VLM Foundations",
    status: "deep-read",
    generated_at: "2026-06-25",
    content_modified: "2026-07-02",
  }]);

  assert.match(feed, /<updated>2026-07-02T00:00:00\.000Z<\/updated>/);
  assert.match(feed, /<author><name>Jason Xun<\/name><\/author>/);
  assert.doesNotMatch(feed, /<author><name>Jason<\/name><\/author>/);
});
