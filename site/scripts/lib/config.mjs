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

// 可复现构建：设置 SOURCE_DATE_EPOCH（秒）可固定所有产物内的构建时间戳
export const BUILD_DATE = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
  : new Date();
