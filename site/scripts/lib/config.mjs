// Shared build configuration: paths, base URL helpers, reproducible build date.

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SITE = path.resolve(__dirname, "..", "..");
export const ROOT = path.resolve(SITE, "..");
export const NOTES_DIR = path.join(ROOT, "notes");
export const PAPERS_DIR = path.join(ROOT, "papers");
export const GUIDE_DIR = path.join(ROOT, "guide");
export const DIST = path.join(SITE, "dist");

// Base path for GitHub Pages project sites (e.g. <user>.github.io/<REPO>/).
// Override with SITE_BASE="" for root-domain deploys, or any prefix.
// Default empty in dev (npm run serve), filled by GitHub Actions to "/embodied-ai-reading-station".
export const BASE = (process.env.SITE_BASE ?? "").replace(/\/$/, "");
export const url = (p) => BASE + (p.startsWith("/") ? p : `/${p}`);

// Canonical production URL (origin + repo path, no trailing slash).
// Override with SITE_URL for forks / custom-domain deploys.
export const SITE_URL = (process.env.SITE_URL ?? "https://estelledc.github.io/embodied-ai-reading-station").replace(/\/$/, "");
export const SITE_ORIGIN = new URL(SITE_URL).origin;

// 可复现构建：CI 用被构建 commit 的 Unix timestamp 注入 SOURCE_DATE_EPOCH。
// BUILD_DATE 保留为 Date 以兼容现有调用方；GENERATED_AT 明确表示它是构建元数据，
// 不能拿来冒充内容或论文的发布日期。
const sourceDateEpoch = process.env.SOURCE_DATE_EPOCH;
const sourceDateSeconds = sourceDateEpoch === undefined ? null : Number(sourceDateEpoch);
if (sourceDateSeconds !== null && (!Number.isInteger(sourceDateSeconds) || sourceDateSeconds < 0)) {
  throw new Error("SOURCE_DATE_EPOCH must be a non-negative integer Unix timestamp");
}
export const BUILD_DATE = sourceDateSeconds === null
  ? new Date()
  : new Date(sourceDateSeconds * 1000);
export const GENERATED_AT = BUILD_DATE.toISOString();

// Frontmatter dates may be parsed by gray-matter as Date objects or remain ISO strings.
// Return a date-only ISO value for public metadata, and omit invalid/missing values.
export function normalizeContentDate(value) {
  if (value === undefined || value === null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
