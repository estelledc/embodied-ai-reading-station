// 阅读进度追踪 — localStorage based, 完全前端
(function () {
  const KEY = "eaireading.read";
  const TS_KEY = "eaireading.readts";
  const LEGACY_PROGRESS_KEY = "eaireading.syllabus";
  const LEGACY_GUIDE_TS_KEY = "eaireading.syllabusTs";
  const PATH_KEY = "eaireading.path.days.v1";
  const GUIDE_KEY = "eaireading.guide.chapters.v1";
  const GUIDE_TS_KEY = "eaireading.guide.chapterTs.v1";
  const PROGRESS_MIGRATION_KEY = "eaireading.progress.split.v1";
  const SEARCH_HISTORY_KEY = "eaireading.searches";
  const STATE_SCHEMA_VERSION = 1;
  const RECOVERY_PREFIX = "eaireading.recovery.";
  const PRE_IMPORT_BACKUP_KEY = `${RECOVERY_PREFIX}pre-import.v1`;
  const DAILY_GOAL_KEY = "eaireading.dailygoal";
  const TIMING_KEY = "eaireading.timing";
  const PATH_DAY_COUNT = 30;
  const GUIDE_CHAPTER_COUNT = 22;
  const recoveryMessages = [];

  function parseJson(raw, fallback) {
    try { return raw == null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  }

  function readStorageJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      try { return JSON.parse(raw); }
      catch {
        const safeKey = key.replace(/[^a-z0-9._-]/gi, "_");
        const backupKey = `${RECOVERY_PREFIX}${Date.now()}.${safeKey}`;
        try {
          localStorage.setItem(backupKey, raw);
          localStorage.setItem(key, JSON.stringify(fallback));
          recoveryMessages.push(`${key} 数据损坏，已备份并恢复为空值。`);
        } catch {}
        return fallback;
      }
    } catch { return fallback; }
  }

  function normalizeReadSlugs(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.filter(value => (
      typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,119}$/i.test(value)
    )))].sort();
  }

  function normalizeTimestampMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result = {};
    for (const [key, rawTimestamp] of Object.entries(value)) {
      if (!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(key)) continue;
      const timestamp = Number(rawTimestamp);
      if (Number.isFinite(timestamp) && timestamp > 0) result[key] = timestamp;
    }
    return result;
  }

  function normalizeSearchHistory(values) {
    if (!Array.isArray(values)) return [];
    const seen = new Set();
    const result = [];
    for (const item of values) {
      const q = typeof item?.q === "string" ? [...item.q.trim()].slice(0, 200).join("") : "";
      if (q.length < 2 || /[\u0000-\u001f\u007f]/.test(q) || seen.has(q)) continue;
      seen.add(q);
      result.push({ q, t: Number.isFinite(Number(item.t)) ? Number(item.t) : 0 });
      if (result.length === 5) break;
    }
    return result;
  }

  function normalizeTiming(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result = {};
    for (const [slug, timing] of Object.entries(value)) {
      if (!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(slug) || !timing || typeof timing !== "object") continue;
      const seconds = Number(timing.seconds);
      const wordCount = Number(timing.wordCount);
      if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(wordCount) || wordCount < 0) continue;
      result[slug] = { seconds, wordCount };
    }
    return result;
  }

  function normalizePathDays(values) {
    if (!Array.isArray(values)) return [];
    const days = new Set();
    for (const value of values) {
      const day = typeof value === "number"
        ? value
        : typeof value === "string" && /^\d+$/.test(value.trim())
          ? Number(value)
          : NaN;
      if (Number.isInteger(day) && day >= 1 && day <= PATH_DAY_COUNT) days.add(day);
    }
    return [...days].sort((a, b) => a - b);
  }

  function guideChapterId(value) {
    if (typeof value === "number" || /^\d+$/.test(String(value).trim())) {
      const id = Number(value);
      return Number.isInteger(id) && id >= 1 && id <= GUIDE_CHAPTER_COUNT ? id : null;
    }
    const match = String(value).match(/^ch(\d{2})(?:-|$)/);
    if (!match) return null;
    const id = Number(match[1]);
    return id >= 1 && id <= GUIDE_CHAPTER_COUNT ? id : null;
  }

  function normalizeGuideChapters(values) {
    if (!Array.isArray(values)) return [];
    const chapters = new Set();
    for (const value of values) {
      const id = guideChapterId(value);
      if (id !== null) chapters.add(id);
    }
    return [...chapters].sort((a, b) => a - b);
  }

  function normalizeGuideTimestamps(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const timestamps = {};
    for (const [key, rawTimestamp] of Object.entries(value)) {
      const id = guideChapterId(key);
      const timestamp = Number(rawTimestamp);
      if (id === null || !Number.isFinite(timestamp) || timestamp <= 0) continue;
      timestamps[id] = Math.max(timestamps[id] || 0, timestamp);
    }
    return timestamps;
  }

  // v1.2: split the legacy mixed syllabus array into independent namespaces.
  // Keep legacy keys read-only for one release so users can roll back without losing old state.
  function migrateProgressState() {
    try {
      if (localStorage.getItem(PROGRESS_MIGRATION_KEY) === "1") return;
      const legacy = readStorageJson(LEGACY_PROGRESS_KEY, []);

      if (localStorage.getItem(PATH_KEY) === null) {
        localStorage.setItem(PATH_KEY, JSON.stringify(normalizePathDays(legacy)));
      }
      if (localStorage.getItem(GUIDE_KEY) === null) {
        const legacyGuideSlugs = Array.isArray(legacy)
          ? legacy.filter(value => typeof value === "string" && /^ch\d{2}(?:-|$)/.test(value))
          : [];
        localStorage.setItem(GUIDE_KEY, JSON.stringify(normalizeGuideChapters(legacyGuideSlugs)));
      }
      if (localStorage.getItem(GUIDE_TS_KEY) === null) {
        const legacyTimestamps = readStorageJson(LEGACY_GUIDE_TS_KEY, {});
        localStorage.setItem(GUIDE_TS_KEY, JSON.stringify(normalizeGuideTimestamps(legacyTimestamps)));
      }
      localStorage.setItem(PROGRESS_MIGRATION_KEY, "1");
    } catch {
      // localStorage may be unavailable (privacy mode / quota). The page should still render.
    }
  }

  migrateProgressState();

  function load() {
    return new Set(normalizeReadSlugs(readStorageJson(KEY, [])));
  }
  function save(set) {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  }
  function loadTs() {
    return normalizeTimestampMap(readStorageJson(TS_KEY, {}));
  }
  function saveTs(o) {
    localStorage.setItem(TS_KEY, JSON.stringify(o));
  }

  function dayKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function computeStreak() {
    const ts = loadTs();
    const days = new Set(Object.values(ts).map(dayKey));
    if (days.size === 0) return { streak: 0, week: 0, month: 0, today: 0 };
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      if (days.has(dayKey(d))) streak++;
      else if (i === 0) continue; // today not yet read is OK, streak still counts from yesterday
      else break;
    }
    const weekAgo = today.getTime() - 7 * 86400000;
    const monthAgo = today.getTime() - 30 * 86400000;
    const todayKey = dayKey(today);
    let week = 0, month = 0, todayCount = 0;
    for (const t of Object.values(ts)) {
      if (t >= weekAgo) week++;
      if (t >= monthAgo) month++;
      if (dayKey(t) === todayKey) todayCount++;
    }
    return { streak, week, month, today: todayCount };
  }

  window.EAI_READ = {
    has(slug) { return load().has(slug); },
    list() { return [...load()]; },
    count() { return load().size; },
    streak() { return computeStreak(); },
    mark(slug) {
      const s = load(); s.add(slug); save(s);
      const t = loadTs(); t[slug] = Date.now(); saveTs(t);
      this._notify();
    },
    unmark(slug) {
      const s = load(); s.delete(slug); save(s);
      const t = loadTs(); delete t[slug]; saveTs(t);
      this._notify();
    },
    toggle(slug) {
      this.has(slug) ? this.unmark(slug) : this.mark(slug);
    },
    _notify() {
      window.dispatchEvent(new CustomEvent("eai:read-changed", {
        detail: { count: this.count(), list: this.list() }
      }));
    },
  };

  function loadPath() {
    return new Set(normalizePathDays(readStorageJson(PATH_KEY, [])));
  }
  function savePath(set) {
    localStorage.setItem(PATH_KEY, JSON.stringify(normalizePathDays([...set])));
  }

  window.EAI_PATH = {
    has(day) { return loadPath().has(Number(day)); },
    list() { return [...loadPath()]; },
    count() { return loadPath().size; },
    mark(day) {
      const normalized = normalizePathDays([day]);
      if (!normalized.length) return;
      const set = loadPath(); set.add(normalized[0]); savePath(set);
      this._notify();
    },
    unmark(day) {
      const normalized = normalizePathDays([day]);
      if (!normalized.length) return;
      const set = loadPath(); set.delete(normalized[0]); savePath(set);
      this._notify();
    },
    toggle(day) {
      this.has(day) ? this.unmark(day) : this.mark(day);
    },
    _notify() {
      window.dispatchEvent(new CustomEvent("eai:path-changed", {
        detail: { count: this.count(), list: this.list() }
      }));
    },
  };

  function normalizedDailyGoal(value) {
    const goal = Number(value);
    return Number.isInteger(goal) && goal >= 1 && goal <= 10 ? goal : null;
  }

  function stateSnapshot() {
    return {
      schema_version: STATE_SCHEMA_VERSION,
      state: {
        read: normalizeReadSlugs([...load()]),
        read_timestamps: loadTs(),
        daily_goal: normalizedDailyGoal(localStorage.getItem(DAILY_GOAL_KEY)),
        timing: normalizeTiming(readStorageJson(TIMING_KEY, {})),
        path_days: normalizePathDays(readStorageJson(PATH_KEY, [])),
        guide_chapters: normalizeGuideChapters(readStorageJson(GUIDE_KEY, [])),
        guide_chapter_timestamps: normalizeGuideTimestamps(readStorageJson(GUIDE_TS_KEY, {})),
        searches: normalizeSearchHistory(readStorageJson(SEARCH_HISTORY_KEY, [])),
      },
    };
  }

  const VERSIONED_STATE_FIELDS = new Set([
    "read",
    "read_timestamps",
    "daily_goal",
    "timing",
    "path_days",
    "guide_chapters",
    "guide_chapter_timestamps",
    "searches",
  ]);
  const LEGACY_IMPORT_KEYS = new Set([
    KEY,
    TS_KEY,
    DAILY_GOAL_KEY,
    TIMING_KEY,
    LEGACY_PROGRESS_KEY,
    LEGACY_GUIDE_TS_KEY,
    SEARCH_HISTORY_KEY,
  ]);

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function decodeImportValue(value, label) {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); }
    catch { throw new Error(`${label} 不是有效 JSON`); }
  }

  function importArray(value, label) {
    const decoded = decodeImportValue(value, label);
    if (!Array.isArray(decoded)) throw new Error(`${label} 必须是数组`);
    return decoded;
  }

  function importObjectValue(value, label) {
    const decoded = decodeImportValue(value, label);
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
      throw new Error(`${label} 必须是对象`);
    }
    return decoded;
  }

  function importDailyGoal(value, label) {
    const decoded = decodeImportValue(value, label);
    if (decoded === null) return null;
    const goal = normalizedDailyGoal(decoded);
    if (goal === null) throw new Error(`${label} 必须是 1–10 的整数或 null`);
    return String(goal);
  }

  function jsonOperation(operations, key, value) {
    operations.set(key, JSON.stringify(value));
  }

  function prepareVersionedImport(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      throw new Error("进度备份缺少 state 对象");
    }
    const fields = Object.keys(state);
    const unknown = fields.filter(field => !VERSIONED_STATE_FIELDS.has(field));
    if (unknown.length) throw new Error(`进度备份包含未知字段：${unknown.join(", ")}`);
    if (!fields.length) throw new Error("进度备份 state 不能为空");

    const operations = new Map();
    if (hasOwn(state, "read")) {
      jsonOperation(operations, KEY, normalizeReadSlugs(importArray(state.read, "state.read")));
    }
    if (hasOwn(state, "read_timestamps")) {
      jsonOperation(operations, TS_KEY, normalizeTimestampMap(importObjectValue(state.read_timestamps, "state.read_timestamps")));
    }
    if (hasOwn(state, "daily_goal")) {
      operations.set(DAILY_GOAL_KEY, importDailyGoal(state.daily_goal, "state.daily_goal"));
    }
    if (hasOwn(state, "timing")) {
      jsonOperation(operations, TIMING_KEY, normalizeTiming(importObjectValue(state.timing, "state.timing")));
    }
    if (hasOwn(state, "path_days")) {
      jsonOperation(operations, PATH_KEY, normalizePathDays(importArray(state.path_days, "state.path_days")));
      operations.set(PROGRESS_MIGRATION_KEY, "1");
    }
    if (hasOwn(state, "guide_chapters")) {
      jsonOperation(operations, GUIDE_KEY, normalizeGuideChapters(importArray(state.guide_chapters, "state.guide_chapters")));
      operations.set(PROGRESS_MIGRATION_KEY, "1");
    }
    if (hasOwn(state, "guide_chapter_timestamps")) {
      jsonOperation(operations, GUIDE_TS_KEY, normalizeGuideTimestamps(importObjectValue(state.guide_chapter_timestamps, "state.guide_chapter_timestamps")));
      operations.set(PROGRESS_MIGRATION_KEY, "1");
    }
    if (hasOwn(state, "searches")) {
      jsonOperation(operations, SEARCH_HISTORY_KEY, normalizeSearchHistory(importArray(state.searches, "state.searches")));
    }
    return operations;
  }

  function prepareLegacyImport(payload) {
    const knownKeys = [...LEGACY_IMPORT_KEYS].filter(key => hasOwn(payload, key));
    if (!knownKeys.length) throw new Error("旧版进度备份不含任何已知状态字段");

    const operations = new Map();
    if (hasOwn(payload, KEY)) {
      jsonOperation(operations, KEY, normalizeReadSlugs(importArray(payload[KEY], KEY)));
    }
    if (hasOwn(payload, TS_KEY)) {
      jsonOperation(operations, TS_KEY, normalizeTimestampMap(importObjectValue(payload[TS_KEY], TS_KEY)));
    }
    if (hasOwn(payload, DAILY_GOAL_KEY)) {
      operations.set(DAILY_GOAL_KEY, importDailyGoal(payload[DAILY_GOAL_KEY], DAILY_GOAL_KEY));
    }
    if (hasOwn(payload, TIMING_KEY)) {
      jsonOperation(operations, TIMING_KEY, normalizeTiming(importObjectValue(payload[TIMING_KEY], TIMING_KEY)));
    }
    if (hasOwn(payload, LEGACY_PROGRESS_KEY)) {
      const mixedProgress = importArray(payload[LEGACY_PROGRESS_KEY], LEGACY_PROGRESS_KEY);
      const guideValues = mixedProgress.filter(value => (
        typeof value === "string" && /^ch\d{2}(?:-|$)/.test(value)
      ));
      jsonOperation(operations, PATH_KEY, normalizePathDays(mixedProgress));
      jsonOperation(operations, GUIDE_KEY, normalizeGuideChapters(guideValues));
      operations.set(PROGRESS_MIGRATION_KEY, "1");
    }
    if (hasOwn(payload, LEGACY_GUIDE_TS_KEY)) {
      jsonOperation(operations, GUIDE_TS_KEY, normalizeGuideTimestamps(importObjectValue(payload[LEGACY_GUIDE_TS_KEY], LEGACY_GUIDE_TS_KEY)));
      operations.set(PROGRESS_MIGRATION_KEY, "1");
    }
    if (hasOwn(payload, SEARCH_HISTORY_KEY)) {
      jsonOperation(operations, SEARCH_HISTORY_KEY, normalizeSearchHistory(importArray(payload[SEARCH_HISTORY_KEY], SEARCH_HISTORY_KEY)));
    }
    return operations;
  }

  function prepareImport(input) {
    let payload;
    try { payload = typeof input === "string" ? JSON.parse(input) : input; }
    catch { throw new Error("进度备份不是有效 JSON"); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("进度备份必须是 JSON 对象");
    }
    if (payload.schema_version != null && payload.schema_version !== STATE_SCHEMA_VERSION) {
      throw new Error(`不支持的进度备份版本：${payload.schema_version}`);
    }
    return payload.schema_version === STATE_SCHEMA_VERSION
      ? prepareVersionedImport(payload.state)
      : prepareLegacyImport(payload);
  }

  function applyStorageTransaction(operations, { backupPayload = null, consumeBackup = false } = {}) {
    const writes = [];
    if (backupPayload) writes.push([PRE_IMPORT_BACKUP_KEY, JSON.stringify(backupPayload)]);
    writes.push(...operations);
    if (consumeBackup) writes.push([PRE_IMPORT_BACKUP_KEY, null]);

    const originals = new Map();
    for (const [key] of writes) {
      if (!originals.has(key)) originals.set(key, localStorage.getItem(key));
    }
    const applied = [];
    try {
      for (const [key, value] of writes) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
        applied.push(key);
      }
    } catch (error) {
      const appliedKeys = [...new Set(applied)];
      const rollbackErrors = [];
      for (const key of appliedKeys.filter(key => originals.get(key) === null).reverse()) {
        try { localStorage.removeItem(key); }
        catch (rollbackError) { rollbackErrors.push(rollbackError); }
      }
      for (const key of appliedKeys.filter(key => originals.get(key) !== null).reverse()) {
        try { localStorage.setItem(key, originals.get(key)); }
        catch (rollbackError) { rollbackErrors.push(rollbackError); }
      }
      if (rollbackErrors.length) {
        throw new Error(`导入失败且自动回滚不完整：${error.message || error}`);
      }
      throw new Error(`导入失败，原状态已恢复：${error.message || error}`);
    }
  }

  function notifyStateChange() {
    window.EAI_READ._notify();
    window.EAI_PATH._notify();
    window.EAI_GUIDE?._notify();
    window.dispatchEvent(new CustomEvent("eai:state-changed"));
  }

  function importStateObject(input) {
    const operations = prepareImport(input);
    const backup = stateSnapshot();
    applyStorageTransaction(operations, { backupPayload: backup });
    notifyStateChange();
    return stateSnapshot();
  }

  function lastImportBackup() {
    const raw = localStorage.getItem(PRE_IMPORT_BACKUP_KEY);
    if (raw === null) return null;
    try {
      const backup = JSON.parse(raw);
      prepareImport(backup);
      return backup;
    } catch {
      throw new Error("最近一次导入前的自动备份已损坏");
    }
  }

  function restoreLastImport() {
    const backup = lastImportBackup();
    if (!backup) throw new Error("没有可恢复的导入前备份");
    const operations = prepareImport(backup);
    applyStorageTransaction(operations, { consumeBackup: true });
    notifyStateChange();
    return stateSnapshot();
  }

  const RESET_KEYS = {
    read: [KEY, TS_KEY, DAILY_GOAL_KEY, TIMING_KEY],
    path: [PATH_KEY],
    guide: [GUIDE_KEY, GUIDE_TS_KEY],
    search: [SEARCH_HISTORY_KEY],
  };

  function resetState(surface) {
    const keys = surface === "all"
      ? [...new Set([
          ...Object.values(RESET_KEYS).flat(),
          LEGACY_PROGRESS_KEY,
          LEGACY_GUIDE_TS_KEY,
          PROGRESS_MIGRATION_KEY,
          PRE_IMPORT_BACKUP_KEY,
        ])]
      : RESET_KEYS[surface];
    if (!keys) throw new Error(`未知进度范围：${surface}`);
    for (const key of keys) localStorage.removeItem(key);
    notifyStateChange();
  }

  window.EAI_STATE = {
    schemaVersion: STATE_SCHEMA_VERSION,
    exportObject: stateSnapshot,
    exportText() { return `${JSON.stringify(stateSnapshot(), null, 2)}\n`; },
    importObject: importStateObject,
    importText(text) { return importStateObject(text); },
    hasImportBackup() {
      try { return localStorage.getItem(PRE_IMPORT_BACKUP_KEY) !== null; }
      catch { return false; }
    },
    lastImportBackup,
    restoreLastImport,
    reset: resetState,
  };

  // 共享 papers.json 加载器：优先用 inline JSON（向后兼容），否则 fetch /data/papers.json
  let _papersCache = null;
  let _papersPromise = null;
  function loadPapers() {
    if (_papersCache) return Promise.resolve(_papersCache);
    if (_papersPromise) return _papersPromise;
    // 尝试读 inline data island
    const inline = document.getElementById("eai-papers-data");
    if (inline) {
      try {
        _papersCache = JSON.parse(inline.textContent);
        return Promise.resolve(_papersCache);
      } catch {}
    }
    // fallback：fetch /data/papers.json (相对 base path)
    const stylesLink = document.querySelector('link[href*="/styles.css"]');
    const base = stylesLink ? stylesLink.getAttribute("href").replace(/\/styles\.css$/, "") : "";
    _papersPromise = fetch(base + "/data/papers.json")
      .then(r => r.json())
      .then(d => { _papersCache = d; return d; })
      .catch(() => { _papersCache = []; return []; });
    return _papersPromise;
  }
  // 在 idle 时预加载（不阻塞首屏）
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => loadPapers(), { timeout: 3000 });
  } else {
    setTimeout(() => loadPapers(), 1500);
  }

  // 跨 tab 同步：监听其他 tab 的 storage 写入
  const SYNCED_KEYS = new Set([
    "eaireading.read",
    "eaireading.readts",
    "eaireading.dailygoal",
    "eaireading.timing",
  ]);
  window.addEventListener("storage", (e) => {
    if (e.key && SYNCED_KEYS.has(e.key)) {
      window.EAI_READ._notify();
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key === PATH_KEY) window.EAI_PATH._notify();
  });

  function bindButton(btn) {
    const slug = btn.dataset.slug;
    if (!slug) return;
    function render() {
      const isRead = window.EAI_READ.has(slug);
      btn.classList.toggle("is-read", isRead);
      btn.textContent = isRead ? "✓ 已读" : "标记已读";
      btn.setAttribute("aria-pressed", isRead ? "true" : "false");
    }
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.EAI_READ.toggle(slug);
      render();
    });
    render();
    window.addEventListener("eai:read-changed", render);
  }

  function bindCards() {
    document.querySelectorAll("[data-slug]").forEach(card => {
      const slug = card.dataset.slug;
      if (!slug || card.tagName === "BUTTON") return;
      // pn-card 用 pn-card-read 不要用 eai-card-read（避免角标重叠）
      const isPnCard = card.classList.contains("pn-card");
      function render() {
        if (isPnCard) {
          card.classList.toggle("pn-card-read", window.EAI_READ.has(slug));
        } else {
          card.classList.toggle("eai-card-read", window.EAI_READ.has(slug));
        }
      }
      render();
      window.addEventListener("eai:read-changed", render);
    });
  }

  function bindStats() {
    const el = document.querySelector("[data-eai-read-count]");
    if (el) {
      const root = el.closest(".stat-cell");
      const renderCount = () => {
        const n = window.EAI_READ.count();
        el.textContent = n;
        if (root) root.style.opacity = n > 0 ? "1" : "0.55";
      };
      renderCount();
      window.addEventListener("eai:read-changed", renderCount);
    }

    const exportBtn = document.getElementById("eai-streak-export");
    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        const papers = await loadPapers();
        if (!papers.length) return;
        const read = load();
        const ts = loadTs();
        const readPapers = papers.filter(p => read.has(p.slug))
          .sort((a, b) => (ts[b.slug] || 0) - (ts[a.slug] || 0));
        const today = new Date().toISOString().slice(0, 10);
        let md = `# 我的具身 AI 论文阅读清单\n\n`;
        md += `> Exported from Embodied AI: Zero to One · ${today}\n`;
        md += `> 已读 ${readPapers.length} 篇 / 共 ${papers.length} 篇\n\n`;
        const byTopic = new Map();
        for (const p of readPapers) {
          if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
          byTopic.get(p.topic).push(p);
        }
        for (const [topic, ps] of byTopic) {
          md += `## ${topic}\n\n`;
          for (const p of ps) {
            const date = ts[p.slug] ? new Date(ts[p.slug]).toISOString().slice(0, 10) : "";
            md += `- [№ ${String(p.num).padStart(2, "0")} · ${p.title}](${p.url}) — ${p.tldr || ""}${date ? ` *(读于 ${date})*` : ""}\n`;
          }
          md += "\n";
        }
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `eai-reading-list-${today}.md`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // 每日目标
    const goalKey = "eaireading.dailygoal";
    const goalBtn = document.getElementById("eai-set-goal");
    if (goalBtn) {
      goalBtn.addEventListener("click", () => {
        const cur = parseInt(localStorage.getItem(goalKey) || "0", 10);
        const v = prompt("每天想读多少篇？(1-10，输 0 取消)", cur || "1");
        if (v === null) return;
        const n = Math.max(0, Math.min(10, parseInt(v, 10) || 0));
        if (n === 0) localStorage.removeItem(goalKey);
        else localStorage.setItem(goalKey, String(n));
        window.EAI_READ._notify();
      });
    }

    const streakBox = document.getElementById("eai-streak-box");
    if (streakBox) {
      const renderStreak = () => {
        const s = window.EAI_READ.streak();
        const total = window.EAI_READ.count();
        if (total === 0) {
          streakBox.hidden = true;
          return;
        }
        streakBox.hidden = false;
        streakBox.querySelector("[data-streak-days]").textContent = s.streak;
        streakBox.querySelector("[data-streak-today]").textContent = s.today;
        streakBox.querySelector("[data-streak-week]").textContent = s.week;
        streakBox.querySelector("[data-streak-month]").textContent = s.month;
        const flame = streakBox.querySelector(".streak-flame");
        if (flame) {
          flame.textContent = s.streak >= 7 ? "🔥🔥🔥" : s.streak >= 3 ? "🔥🔥" : s.streak >= 1 ? "🔥" : "·";
        }
        // 每日目标 vs 今日
        const goal = parseInt(localStorage.getItem("eaireading.dailygoal") || "0", 10);
        const goalEl = streakBox.querySelector(".streak-goal");
        if (goalEl) {
          if (goal > 0) {
            const ok = s.today >= goal;
            goalEl.hidden = false;
            goalEl.textContent = `${ok ? "✓" : "·"} 今日 ${s.today}/${goal}`;
            goalEl.style.color = ok ? "var(--olive)" : "var(--ink-faint)";
          } else {
            goalEl.hidden = true;
          }
        }
      };
      renderStreak();
      window.addEventListener("eai:read-changed", renderStreak);
    }
  }

  function bindNextPick() {
    const aside = document.getElementById("eai-next-pick");
    if (!aside) return;
    let papers = [];
    loadPapers().then(d => { papers = d; render(); });

    function render() {
      if (!papers.length) return;
      const read = load();
      const unread = papers.filter(p => !read.has(p.slug));
      if (unread.length === 0) {
        aside.hidden = true;
        return;
      }
      // 推荐策略：
      // 1) 优先推同主题序列（已读最多的主题里挑下一篇）
      // 2) 否则按 era + difficulty 升序挑入门 (founder, 难度低)
      // 3) 全新读者 → 推荐 CLIP（vlm-foundation 起点）
      let pick = null;
      let reason = "";
      if (read.size === 0) {
        pick = unread.find(p => p.slug === "clip") || unread.find(p => p.era === "founder") || unread[0];
        reason = "从这里开始入门";
      } else {
        const byTopic = new Map();
        for (const p of papers) {
          if (!read.has(p.slug)) continue;
          byTopic.set(p.topic, (byTopic.get(p.topic) || 0) + 1);
        }
        const topicsByCount = [...byTopic.entries()].sort((a, b) => b[1] - a[1]);
        for (const [topic] of topicsByCount) {
          const candidates = unread.filter(p => p.topic === topic);
          if (candidates.length) {
            const eraOrder = { founder: 0, classic: 1, frontier: 2 };
            candidates.sort((a, b) => (eraOrder[a.era] ?? 1) - (eraOrder[b.era] ?? 1));
            pick = candidates[0];
            reason = `继续 · ${topic}`;
            break;
          }
        }
        if (!pick) {
          pick = unread.sort((a, b) => {
            const eraOrder = { founder: 0, classic: 1, frontier: 2 };
            const ea = (eraOrder[a.era] ?? 1) - (eraOrder[b.era] ?? 1);
            return ea !== 0 ? ea : a.difficulty - b.difficulty;
          })[0];
          reason = "新主题 · 入门难度";
        }
      }

      const link = aside.querySelector(".next-pick-card");
      link.href = pick.url;
      aside.querySelector(".next-pick-num").textContent = `№ ${String(pick.num).padStart(2, "0")}`;
      aside.querySelector(".next-pick-topic").textContent = pick.topic;
      aside.querySelector(".next-pick-title").textContent = pick.title;
      aside.querySelector(".next-pick-tldr").textContent = pick.tldr || "";
      aside.querySelector(".next-pick-difficulty").textContent = "★".repeat(Math.max(1, pick.difficulty));
      aside.querySelector(".next-pick-reason").textContent = reason;
      aside.hidden = false;
    }
    render();
    window.addEventListener("eai:read-changed", render);
  }

  function bindAutoMarkOnScroll() {
    // 在论文页：当 endmark ◼ 进入视口时自动标记已读（如果还没）
    const endmark = document.querySelector(".note-content .endmark");
    if (!endmark) return;
    const btn = document.querySelector(".read-btn[data-slug]");
    if (!btn) return;
    const slug = btn.dataset.slug;
    if (!slug || window.EAI_READ.has(slug)) return;
    let triggered = false;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !triggered) {
          triggered = true;
          window.EAI_READ.mark(slug);
          // 显示 toast，含撤销 + 下一篇
          const toast = document.createElement("div");
          toast.className = "auto-mark-toast";
          // 计算 base
          const stylesLink = document.querySelector('link[href*="/styles.css"]');
          const base = stylesLink ? stylesLink.getAttribute("href").replace(/\/styles\.css$/, "") : "";
          toast.innerHTML = `✓ 已读 <button type="button" aria-label="撤销">撤销</button> <a href="${base}/next/" class="amt-next">下一篇 →</a>`;
          document.body.appendChild(toast);
          requestAnimationFrame(() => toast.classList.add("show"));
          const undoBtn = toast.querySelector("button");
          undoBtn.addEventListener("click", () => {
            window.EAI_READ.unmark(slug);
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
          });
          setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
          }, 5000);
          obs.disconnect();
        }
      }
    }, { threshold: 0.5 });
    obs.observe(endmark);
  }

  function bindReadingLists() {
    const sections = document.querySelectorAll(".reading-list[data-list-slugs]");
    if (!sections.length) return;
    function render() {
      const read = load();
      for (const sec of sections) {
        const slugs = (sec.dataset.listSlugs || "").split(",").filter(Boolean);
        const total = slugs.length;
        if (!total) continue;
        const done = slugs.filter(s => read.has(s)).length;
        const wrap = sec.querySelector(".rl-progress");
        if (!wrap) continue;
        if (done > 0) {
          wrap.hidden = false;
          const fill = wrap.querySelector(".rl-progress-fill");
          const text = wrap.querySelector(".rl-progress-text");
          fill.style.width = (done / total * 100) + "%";
          text.textContent = `${done} / ${total} 已读`;
        } else {
          wrap.hidden = true;
        }
        // 已读 item 视觉
        sec.querySelectorAll(".primer-item[data-slug]").forEach(item => {
          item.classList.toggle("primer-item-read", read.has(item.dataset.slug));
        });
      }
    }
    render();
    window.addEventListener("eai:read-changed", render);
  }

  function showStateMessage(message, { error = false } = {}) {
    if (!document.body || !message) return;
    const toast = document.createElement("div");
    toast.className = "auto-mark-toast show";
    toast.setAttribute("role", error ? "alert" : "status");
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  function showRecoveryMessages() {
    if (!recoveryMessages.length) return;
    showStateMessage(recoveryMessages.join(" "), { error: true });
    recoveryMessages.length = 0;
  }

  function downloadStateBackup() {
    const blob = new Blob([window.EAI_STATE.exportText()], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `eai-progress-v${STATE_SCHEMA_VERSION}-${new Date().toISOString().slice(0, 10)}.json`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  function bindStateControls() {
    const exportButton = document.getElementById("eai-state-export");
    const importButton = document.getElementById("eai-state-import");
    const importFile = document.getElementById("eai-state-import-file");
    const restoreButton = document.getElementById("eai-state-restore-import");
    function renderRestoreButton() {
      if (restoreButton) restoreButton.hidden = !window.EAI_STATE.hasImportBackup();
    }
    exportButton?.addEventListener("click", () => {
      downloadStateBackup();
      showStateMessage("进度备份已导出。");
    });
    importButton?.addEventListener("click", () => importFile?.click());
    importFile?.addEventListener("change", async () => {
      const file = importFile.files?.[0];
      if (!file) return;
      const promptText = "导入将覆盖当前状态中备份文件包含的进度。现有状态会先自动备份，可用“撤销最近导入”恢复。继续导入？";
      if (typeof window.confirm === "function" && !window.confirm(promptText)) {
        importFile.value = "";
        return;
      }
      try {
        window.EAI_STATE.importText(await file.text());
        renderRestoreButton();
        showStateMessage("进度备份已导入；原状态已自动备份，可撤销。");
      } catch (error) {
        showStateMessage(`导入失败：${error.message}`, { error: true });
      } finally {
        importFile.value = "";
      }
    });
    restoreButton?.addEventListener("click", () => {
      const promptText = "用最近一次导入前的自动备份覆盖当前状态？";
      if (typeof window.confirm === "function" && !window.confirm(promptText)) return;
      try {
        window.EAI_STATE.restoreLastImport();
        renderRestoreButton();
        showStateMessage("已恢复到最近一次导入前的状态。");
      } catch (error) {
        showStateMessage(`恢复失败：${error.message}`, { error: true });
      }
    });
    renderRestoreButton();

    const resets = [
      ["eai-state-reset-path", "path", "只清空 30 天核心进度？Guide 和论文已读状态会保留。"],
      ["eai-state-reset-guide", "guide", "只清空 Guide 章节进度？路径和论文已读状态会保留。"],
      ["eai-state-reset-all", "all", "清空全部阅读进度、目标、搜索历史和计时数据？此操作不可撤销。"],
    ];
    for (const [id, surface, promptText] of resets) {
      document.getElementById(id)?.addEventListener("click", () => {
        if (typeof window.confirm === "function" && !window.confirm(promptText)) return;
        window.EAI_STATE.reset(surface);
        renderRestoreButton();
        showStateMessage(surface === "all" ? "全部本地进度已清空。" : `${surface} 进度已清空。`);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".read-btn[data-slug]").forEach(bindButton);
    bindCards();
    bindStats();
    bindNextPick();
    bindAutoMarkOnScroll();
    bindReadingLists();
    bindTopicProgress();
    bindMyStats();
    bindDailyPick();
    bindPathSyllabus();
    bindGuideButton();
    bindGuideCards();
    bindGuideStats();
    bindStateControls();
    showRecoveryMessages();
  });

  function bindDailyPick() {
    const el = document.getElementById("eai-daily-pick");
    if (!el) return;
    loadPapers().then(papers => {
      if (papers.length === 0) return;
      renderDailyPick(el, papers);
    });
  }

  function renderDailyPick(el, papers) {
    // 从今日日期生成 hash
    const today = new Date();
    const ymd = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    // simple hash
    let h = ymd;
    h = ((h * 9301) + 49297) % 233280;
    let idx = h % papers.length;
    // 跳过已读：从 idx 顺序往后找第一个未读
    const read = load();
    let attempts = 0;
    while (read.has(papers[idx].slug) && attempts < papers.length) {
      idx = (idx + 1) % papers.length;
      attempts++;
    }
    const p = papers[idx];

    el.querySelector(".dp-card").href = p.url;
    el.querySelector(".dp-num").textContent = `№ ${String(p.num).padStart(2, "0")}`;
    el.querySelector(".dp-topic").textContent = p.topic;
    el.querySelector(".dp-title").textContent = p.title;
    el.querySelector(".dp-tldr").textContent = p.tldr || "";
    el.querySelector(".dp-difficulty").textContent = "★".repeat(p.difficulty || 2);
    const dateStr = today.toISOString().slice(0, 10);
    el.querySelector(".dp-date").textContent = dateStr;
    el.hidden = false;
  }

  function bindMyStats() {
    const sec = document.getElementById("eai-my-stats");
    if (!sec) return;
    let papers = [];
    loadPapers().then(d => { papers = d; render(); });

    function render() {
      if (!papers.length) return;
      const read = load();
      if (read.size === 0) {
        sec.hidden = true;
        return;
      }
      sec.hidden = false;
      const readPapers = papers.filter(p => read.has(p.slug));
      // 已读字数：直接累加 wordCount（如果存在），否则按 4000 估算
      const totalWords = readPapers.reduce((s, p) => s + (p.wordCount || 4000), 0);
      const pct = Math.round(readPapers.length / papers.length * 100);
      const streakInfo = computeStreak();
      sec.querySelector("[data-my-read]").textContent = readPapers.length;
      sec.querySelector("[data-my-streak]").textContent = streakInfo.streak;
      sec.querySelector("[data-my-words]").textContent = totalWords.toLocaleString();
      sec.querySelector("[data-my-pct]").textContent = pct + "%";

      // 里程碑徽章（10/30/50/100）
      const MILESTONES = [
        { count: 10, label: "Starter", icon: "✦", desc: "读完 10 篇，开始入门" },
        { count: 30, label: "Reader", icon: "✦✦", desc: "读完 30 篇，主题感建立" },
        { count: 50, label: "Scholar", icon: "✦✦✦", desc: "读完 50 篇，能跨主题对比了" },
        { count: 100, label: "Maven", icon: "★", desc: "读完 100 篇，已经是行家" },
      ];
      let badgeRow = sec.querySelector(".milestone-row");
      if (!badgeRow) {
        badgeRow = document.createElement("div");
        badgeRow.className = "milestone-row";
        const bigStats = sec.querySelector(".big-stats");
        if (bigStats) bigStats.after(badgeRow);
      }
      const earned = MILESTONES.filter(m => readPapers.length >= m.count);
      badgeRow.innerHTML = MILESTONES.map(m => {
        const ok = readPapers.length >= m.count;
        return `<div class="ms-badge ${ok ? 'ms-earned' : 'ms-locked'}">
          <span class="ms-icon">${ok ? m.icon : '○'}</span>
          <span class="ms-label">${m.label}</span>
          <span class="ms-count">${m.count}</span>
          ${ok ? `<span class="ms-desc">${m.desc}</span>` : ""}
        </div>`;
      }).join("");

      // 完成度 100% 时显示庆祝徽章
      let medal = sec.querySelector(".completion-medal");
      if (pct >= 100 && !medal) {
        medal = document.createElement("aside");
        medal.className = "completion-medal";
        medal.innerHTML = `
          <div class="cm-icon">★</div>
          <div class="cm-body">
            <div class="cm-eyebrow">CONGRATULATIONS</div>
            <h3 class="cm-title">读完 ${papers.length} 篇了。</h3>
            <p class="cm-text">你刚刚完成 ${papers.reduce((s, p) => s + (p.wordCount || 0), 0).toLocaleString()} 字的具身智能 reading marathon。打开 <a href="${(document.querySelector('link[href*="/styles.css"]')?.getAttribute("href") || "").replace(/\/styles\.css$/, "")}/lists/">/lists/</a> 开始重读你最感兴趣的方向。</p>
          </div>
        `;
        sec.insertBefore(medal, sec.querySelector(".big-stats").nextSibling);
      } else if (pct < 100 && medal) {
        medal.remove();
      }

      // 个人阅读速度估算
      try {
        const timing = JSON.parse(localStorage.getItem("eaireading.timing") || "{}");
        let totalSec = 0, totalWc = 0;
        for (const slug of Object.keys(timing)) {
          const t = timing[slug];
          if (t.seconds > 30 && t.wordCount > 100) {
            totalSec += t.seconds;
            totalWc += t.wordCount;
          }
        }
        const speedEl = sec.querySelector("[data-my-speed]");
        if (speedEl && totalSec > 60) {
          const wpm = Math.round((totalWc / totalSec) * 60);
          speedEl.textContent = wpm;
          speedEl.parentElement.style.opacity = "1";
        } else if (speedEl) {
          speedEl.textContent = "—";
          speedEl.parentElement.style.opacity = "0.45";
        }
      } catch {}
      // 按 topic 分布
      const topicCount = new Map();
      for (const p of readPapers) topicCount.set(p.topic, (topicCount.get(p.topic) || 0) + 1);
      const sorted = [...topicCount.entries()].sort((a, b) => b[1] - a[1]);
      const max = Math.max(...topicCount.values(), 1);
      const wrap = sec.querySelector("[data-my-topic-bars]");
      wrap.innerHTML = sorted.map(([topic, count]) => `
        <div class="stats-row">
          <span class="stats-label">${topic}</span>
          <div class="vbar"><div class="vbar-fill" style="width:${count / max * 100}%"></div><span class="vbar-num">${count}</span></div>
        </div>
      `).join("");

      // 盲点：用户读过的主题 vs 全部主题
      const allTopics = new Set(papers.map(p => p.topic));
      const seenTopics = new Set(readPapers.map(p => p.topic));
      const blind = [...allTopics].filter(t => !seenTopics.has(t));
      const blindBox = sec.querySelector("[data-my-blindspot]");
      const blindList = sec.querySelector("[data-mb-list]");
      if (blind.length > 0 && readPapers.length >= 3 && blindBox && blindList) {
        // 给每个盲点主题挑一篇 founder（如果没有就第一篇）
        blindList.innerHTML = blind.slice(0, 3).map(topic => {
          const inT = papers.filter(p => p.topic === topic);
          const founder = inT.find(p => p.era === "founder") || inT[0];
          return `<li><a href="${founder.url}"><strong>${topic}</strong> · 起点 → ${founder.title.split(":")[0]}</a></li>`;
        }).join("");
        blindBox.hidden = false;
      } else if (blindBox) {
        blindBox.hidden = true;
      }
    }
    render();
    window.addEventListener("eai:read-changed", render);
  }

  function bindTopicProgress() {
    const el = document.querySelector(".topic-progress[data-topic-slugs]");
    if (!el) return;
    function render() {
      const slugs = (el.dataset.topicSlugs || "").split(",").filter(Boolean);
      const read = load();
      const done = slugs.filter(s => read.has(s)).length;
      const total = slugs.length;
      if (done > 0) {
        el.hidden = false;
        el.querySelector("[data-tp-done]").textContent = done;
        el.querySelector(".tp-fill").style.width = (total ? (done / total * 100) : 0) + "%";
      } else {
        el.hidden = true;
      }
    }
    render();
    window.addEventListener("eai:read-changed", render);
  }

  function bindPathSyllabus() {
    const checkboxes = [...document.querySelectorAll(".syl-check[data-syl-day]")];
    if (!checkboxes.length) return;
    const fill = document.querySelector(".syl-fill");
    const count = document.querySelector("[data-syl-done]");

    function render() {
      const done = new Set(window.EAI_PATH.list());
      for (const checkbox of checkboxes) {
        const day = Number(checkbox.dataset.sylDay);
        checkbox.checked = done.has(day);
        checkbox.closest(".syl-day")?.classList.toggle("syl-done", checkbox.checked);
      }
      if (fill) fill.style.width = (done.size / PATH_DAY_COUNT * 100) + "%";
      if (count) count.textContent = done.size;
    }

    for (const checkbox of checkboxes) {
      checkbox.addEventListener("change", () => {
        const day = Number(checkbox.dataset.sylDay);
        if (checkbox.checked) window.EAI_PATH.mark(day);
        else window.EAI_PATH.unmark(day);
      });
    }
    render();
    window.addEventListener("eai:path-changed", render);
  }

  // === Guide 章节进度追踪 ===
  function loadGuide() {
    return new Set(normalizeGuideChapters(readStorageJson(GUIDE_KEY, [])));
  }
  function saveGuide(set) {
    localStorage.setItem(GUIDE_KEY, JSON.stringify(normalizeGuideChapters([...set])));
  }
  function loadGuideTs() {
    return normalizeGuideTimestamps(readStorageJson(GUIDE_TS_KEY, {}));
  }
  function saveGuideTs(o) {
    localStorage.setItem(GUIDE_TS_KEY, JSON.stringify(o));
  }

  window.EAI_GUIDE = {
    has(slug) {
      const id = guideChapterId(slug);
      return id !== null && loadGuide().has(id);
    },
    list() { return [...loadGuide()]; },
    count() { return loadGuide().size; },
    mark(slug) {
      const id = guideChapterId(slug);
      if (id === null) return;
      const s = loadGuide(); s.add(id); saveGuide(s);
      const t = loadGuideTs(); t[id] = Date.now(); saveGuideTs(t);
      this._notify();
    },
    unmark(slug) {
      const id = guideChapterId(slug);
      if (id === null) return;
      const s = loadGuide(); s.delete(id); saveGuide(s);
      const t = loadGuideTs(); delete t[id]; saveGuideTs(t);
      this._notify();
    },
    toggle(slug) {
      this.has(slug) ? this.unmark(slug) : this.mark(slug);
    },
    _notify() {
      window.dispatchEvent(new CustomEvent("eai:guide-changed", {
        detail: { count: this.count(), list: this.list() }
      }));
    },
  };

  // Sync guide progress across tabs
  const GUIDE_SYNCED = new Set([GUIDE_KEY, GUIDE_TS_KEY]);
  window.addEventListener("storage", (e) => {
    if (e.key && GUIDE_SYNCED.has(e.key)) {
      window.EAI_GUIDE._notify();
    }
  });

  function bindGuideButton() {
    document.querySelectorAll(".guide-done-btn[data-guide-slug]").forEach(btn => {
      const slug = btn.dataset.guideSlug;
      if (!slug) return;
      function render() {
        const done = window.EAI_GUIDE.has(slug);
        btn.classList.toggle("is-done", done);
        btn.textContent = done ? "✓ 已完成" : "标记本章已完成";
        btn.setAttribute("aria-pressed", done ? "true" : "false");
        btn.style.background = done ? "var(--coral)" : "transparent";
        btn.style.color = done ? "#fff" : "var(--coral)";
      }
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        window.EAI_GUIDE.toggle(slug);
      });
      render();
      window.addEventListener("eai:guide-changed", render);
    });
  }

  function bindGuideCards() {
    // Add completion badges to guide index chapter cards
    document.querySelectorAll(".guide-part .paper-card").forEach(card => {
      const link = card.querySelector("h3 a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      const m = href.match(/\/guide\/(ch\d+[^/]*)\//);
      if (!m) return;
      const slug = m[1];
      // Insert badge element
      let badge = card.querySelector(".guide-done-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "guide-done-badge";
        badge.style.cssText = "position:absolute;top:0.5rem;right:0.5rem;font-size:0.85rem;color:var(--coral);opacity:0;transition:opacity 0.2s";
        badge.textContent = "✓";
        card.style.position = "relative";
        card.appendChild(badge);
      }
      function render() {
        const done = window.EAI_GUIDE.has(slug);
        badge.style.opacity = done ? "1" : "0";
        card.style.borderLeft = done ? "3px solid var(--coral)" : "";
      }
      render();
      window.addEventListener("eai:guide-changed", render);
    });
  }

  function bindGuideStats() {
    // Update guide progress counter on homepage
    const el = document.querySelector("[data-eai-guide-count]");
    if (!el) return;
    function render() {
      el.textContent = window.EAI_GUIDE.count();
    }
    render();
    window.addEventListener("eai:guide-changed", render);
  }
})();
