// Route-specific behavior shared by /next/, /random/, /discover/ and 404.
(function () {
  "use strict";

  function siteBase() {
    const marker = document.querySelector(".search-container[data-base]");
    if (marker) return String(marker.getAttribute("data-base") || "").replace(/\/$/, "");
    const stylesheet = document.querySelector('link[rel="stylesheet"][href*="/styles.css"]');
    if (!stylesheet) return "";
    return String(stylesheet.getAttribute("href") || "").replace(/\/styles\.css(?:\?.*)?$/, "");
  }

  function route(base, pathname) {
    const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return `${base}${path}` || "/";
  }

  function navigate(base, pathname) {
    location.replace(route(base, pathname));
  }

  function jsonData(id) {
    const node = document.getElementById(id);
    if (!node || node.getAttribute("type") !== "application/json") {
      throw new Error(`Missing JSON data block: ${id}`);
    }
    return JSON.parse(node.textContent || "null");
  }

  function readSet({ strict = false } = {}) {
    try {
      const parsed = JSON.parse(localStorage.getItem("eaireading.read") || "[]");
      if (!Array.isArray(parsed)) throw new TypeError("read state must be an array");
      return new Set(parsed.filter(value => typeof value === "string"));
    } catch (error) {
      if (strict) throw error;
      return new Set();
    }
  }

  function initNext(base) {
    try {
      const papers = jsonData("eai-next-data");
      if (!Array.isArray(papers) || papers.length === 0) throw new TypeError("next paper data is empty");
      const read = readSet({ strict: true });
      const unread = papers.filter(paper => !read.has(paper.slug));
      if (unread.length === 0) {
        navigate(base, "/lists/");
        return;
      }

      let pick = null;
      if (read.size === 0) {
        pick = unread.find(paper => paper.slug === "clip") || unread[0];
      } else {
        const byTopic = new Map();
        for (const paper of papers) {
          if (read.has(paper.slug)) byTopic.set(paper.topic, (byTopic.get(paper.topic) || 0) + 1);
        }
        const topics = [...byTopic.keys()].sort((a, b) => byTopic.get(b) - byTopic.get(a));
        const eraOrder = { founder: 0, classic: 1, frontier: 2 };
        for (const topic of topics) {
          const candidates = unread
            .filter(paper => paper.topic === topic)
            .sort((a, b) => (eraOrder[a.era] ?? 1) - (eraOrder[b.era] ?? 1));
          if (candidates.length > 0) {
            pick = candidates[0];
            break;
          }
        }
        if (!pick) pick = unread[0];
      }
      navigate(base, `/papers/${encodeURIComponent(pick.slug)}/`);
    } catch {
      navigate(base, "/");
    }
  }

  function initRandom(base) {
    let slugs;
    try {
      slugs = jsonData("eai-random-data");
      if (!Array.isArray(slugs) || slugs.length === 0) throw new TypeError("random paper data is empty");
    } catch {
      navigate(base, "/");
      return;
    }
    const read = readSet();
    const unread = slugs.filter(slug => !read.has(slug));
    const pool = unread.length > 0 ? unread : slugs;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    navigate(base, `/papers/${encodeURIComponent(pick)}/`);
  }

  function paperCard(paper) {
    const link = document.createElement("a");
    link.className = "ds-link";
    link.href = String(paper.url || "");

    const meta = document.createElement("span");
    meta.className = "ds-meta";
    meta.textContent = `№ ${String(paper.num).padStart(2, "0")} · ${String(paper.topic || "")} · ${String(paper.year || "")}`;

    const title = document.createElement("h3");
    title.className = "ds-title";
    title.textContent = String(paper.title || "").split(":")[0];
    link.append(meta, title);

    if (paper.tldr) {
      const summary = document.createElement("p");
      summary.className = "ds-tldr";
      summary.textContent = `${String(paper.tldr)}…`;
      link.append(summary);
    }
    return link;
  }

  function renderPaper(selector, paper) {
    const container = document.querySelector(selector);
    if (container && paper) container.replaceChildren(paperCard(paper));
  }

  function initDiscover() {
    let papers;
    try {
      papers = jsonData("eai-discover-data");
    } catch {
      return;
    }
    if (!Array.isArray(papers) || papers.length === 0) return;
    const read = readSet();

    const today = new Date();
    const ymd = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const hash = ((ymd * 9301) + 49297) % 233280;
    renderPaper('[data-discover-mode="today"]', papers[hash % papers.length]);

    const shuffled = papers.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const shuffleContainer = document.querySelector('[data-discover-mode="shuffle"]');
    if (shuffleContainer) shuffleContainer.replaceChildren(...shuffled.slice(0, 5).map(paperCard));

    const eraCount = { founder: 0, classic: 0, frontier: 0 };
    for (const paper of papers) {
      if (read.has(paper.slug) && Object.hasOwn(eraCount, paper.era)) eraCount[paper.era] += 1;
    }
    const leastEra = Object.keys(eraCount).sort((a, b) => eraCount[a] - eraCount[b])[0];
    const unreadInEra = papers.filter(paper => paper.era === leastEra && !read.has(paper.slug));
    if (unreadInEra.length > 0) {
      renderPaper('[data-discover-mode="newera"]', unreadInEra[Math.floor(Math.random() * unreadInEra.length)]);
    }

    const seenTopics = new Set(papers.filter(paper => read.has(paper.slug)).map(paper => paper.topic));
    const allTopics = [...new Set(papers.map(paper => paper.topic))];
    const unseenTopics = allTopics.filter(topic => !seenTopics.has(topic));
    const topic = unseenTopics.length > 0
      ? unseenTopics[Math.floor(Math.random() * unseenTopics.length)]
      : allTopics[0];
    const inTopic = papers.filter(paper => paper.topic === topic);
    renderPaper('[data-discover-mode="newtopic"]', inTopic.find(paper => paper.era === "founder") || inTopic[0]);
  }

  function reportDataError(api, error, endpoint) {
    if (api && typeof api.reportError === "function") {
      api.reportError(error, { consumer: "404-suggestions" });
      return;
    }
    const detail = {
      consumer: "404-suggestions",
      code: error && error.code || "DATA_API_UNKNOWN",
      message: error && error.message || "404 推荐数据加载失败。",
      endpoint: error && error.endpoint || endpoint,
      status: Number.isInteger(error && error.status) ? error.status : null,
    };
    console.error(`[EAI data API] 404-suggestions ${detail.code}: ${detail.message}`);
    window.dispatchEvent(new CustomEvent("eai:data-error", { detail }));
  }

  function initNotFound(base) {
    let path = location.pathname;
    if (base && path.startsWith(`${base}/`)) path = path.slice(base.length);
    let segment = path.replace(/\/$/, "").split("/").filter(Boolean).pop() || "";
    try { segment = decodeURIComponent(segment); } catch { /* keep encoded segment */ }
    if (!segment || segment === "404") return;

    const query = segment.replace(/[-_]/g, " ").toLowerCase();
    const endpoint = route(base, "/data/v2/papers.json");
    const api = window.EAI_DATA_API;
    const request = api && typeof api.loadPapers === "function"
      ? api.loadPapers({ base })
      : Promise.reject(Object.assign(new Error("共享浏览器 Data API 适配器未加载。"), {
          code: "DATA_API_ADAPTER_MISSING",
          endpoint,
        }));

    request.then(papers => {
      const scored = papers.map(paper => {
        const slug = String(paper.slug || "");
        const haystack = `${String(paper.title || "")} ${slug}`.toLowerCase();
        let score = 0;
        for (const word of query.split(/\s+/)) {
          if (word && haystack.includes(word)) score += word.length;
        }
        if (slug === segment) score += 100;
        else if (slug.includes(segment) || segment.includes(slug)) score += 50;
        return { paper, score };
      }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
      if (scored.length === 0) return;

      const aside = document.getElementById("eai-404-suggest");
      const list = document.getElementById("eai-404-list");
      if (!aside || !list) return;
      list.replaceChildren();
      for (const { paper } of scored) {
        const item = document.createElement("li");
        item.className = "not-found-suggestion-item";
        const link = document.createElement("a");
        link.className = "not-found-suggestion-link";
        link.href = route(base, `/papers/${encodeURIComponent(paper.slug)}/`);
        link.textContent = String(paper.title || "");
        const meta = document.createElement("span");
        meta.className = "not-found-suggestion-meta";
        meta.textContent = `${String(paper.topic || "")} · ${String(paper.year || "")}`;
        item.append(link, meta);
        list.append(item);
      }
      aside.hidden = false;
    }).catch(error => reportDataError(api, error, endpoint));
  }

  function init() {
    const root = document.querySelector("[data-eai-page-behavior]");
    if (!root) return;
    const base = siteBase();
    switch (root.getAttribute("data-eai-page-behavior")) {
      case "next": initNext(base); break;
      case "random": initRandom(base); break;
      case "discover": initDiscover(); break;
      case "not-found": initNotFound(base); break;
      default: break;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
