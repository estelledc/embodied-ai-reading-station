// D3 force-directed graph for paper relationships
(function () {
  function tryInit() {
    if (typeof d3 === "undefined") {
      setTimeout(tryInit, 100);
      return;
    }
    init();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryInit);
  } else {
    tryInit();
  }

  function init() {
    const dataEl = document.getElementById("graph-data");
    const container = document.getElementById("graph-container");
    const svgEl = document.getElementById("graph-svg");
    const tooltip = document.getElementById("graph-tooltip");
    const legend = document.getElementById("graph-legend");
    if (!dataEl || !svgEl) return;

    const data = JSON.parse(dataEl.textContent);
    const rect = container.getBoundingClientRect();
    const W = rect.width, H = rect.height;

    // 主题颜色（与 theme.css 的 .timeline-topic 同源）
    const TOPIC_COLORS = {
      "vlm-foundation": "#ed6f5c",
      "planning":       "#e9b94a",
      "vla":            "#6e7448",
      "diffusion-policy": "#9c5a8b",
      "imitation":      "#3e6280",
      "world-model":    "#a87044",
      "multimodal":     "#5e8074",
      "rf":             "#c0796b",
      "auditory":       "#8a8460",
      "dataset-eval":   "#6c6068",
      "sim":            "#7a644a",
    };

    const svg = d3.select(svgEl).attr("viewBox", [0, 0, W, H]);
    const g = svg.append("g");

    svg.call(d3.zoom().scaleExtent([0.3, 4]).on("zoom", (e) => {
      g.attr("transform", e.transform);
    }));

    const linkSel = g.append("g")
      .attr("class", "graph-links")
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke", d => d.kind === "cross-topic" ? "#ed6f5c" : "#3a342a")
      .attr("stroke-opacity", d => d.kind === "cross-topic" ? 0.45 : 0.18)
      .attr("stroke-width", d => d.kind === "cross-topic" ? 1.6 : 0.8)
      .attr("stroke-dasharray", d => d.kind === "cross-topic" ? "3,2" : null);

    const nodeG = g.append("g").attr("class", "graph-nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .on("click", (e, d) => { window.location.href = d.url; })
      .on("mouseenter", (e, d) => {
        tooltip.hidden = false;
        tooltip.innerHTML = `<div class="tt-title">${d.title}</div>
          <div class="tt-meta">${d.topicLabel} · ${d.era} · ${d.year || ""}</div>
          ${d.tldr ? `<div class="tt-tldr">${d.tldr}…</div>` : ""}`;
        // 高亮邻居
        const neighbors = new Set([d.id]);
        for (const l of data.links) {
          if (l.source.id === d.id) neighbors.add(l.target.id);
          if (l.target.id === d.id) neighbors.add(l.source.id);
        }
        nodeG.style("opacity", x => neighbors.has(x.id) ? 1 : 0.18);
        linkSel.style("opacity", l =>
          (l.source.id === d.id || l.target.id === d.id) ? 0.7 : 0.04
        ).style("stroke", l =>
          (l.source.id === d.id || l.target.id === d.id) ? "var(--coral)" : null
        );
      })
      .on("mousemove", (e) => {
        const cr = container.getBoundingClientRect();
        tooltip.style.left = (e.clientX - cr.left + 14) + "px";
        tooltip.style.top = (e.clientY - cr.top + 14) + "px";
      })
      .on("mouseleave", () => {
        tooltip.hidden = true;
        nodeG.style("opacity", 1);
        linkSel.style("opacity", null).style("stroke", null);
      });

    nodeG.append("circle")
      .attr("r", d => 4 + d.difficulty * 1.4)
      .attr("fill", d => TOPIC_COLORS[d.topic] || "#888")
      .attr("stroke", "#efe7d2")
      .attr("stroke-width", 1.2);

    // founder 加金边
    nodeG.filter(d => d.era === "founder")
      .select("circle")
      .attr("stroke", "#e9b94a")
      .attr("stroke-width", 2.4);

    nodeG.append("text")
      .text(d => d.title.length > 18 ? d.title.slice(0, 18) + "…" : d.title)
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 8)
      .attr("dx", d => 4 + d.difficulty * 1.4 + 3)
      .attr("dy", 3)
      .attr("fill", "#3a342a")
      .style("opacity", 0)
      .style("pointer-events", "none");

    // legend hover 高亮
    if (legend) {
      legend.querySelectorAll(".legend-item").forEach(el => {
        const tid = el.dataset.topic;
        el.addEventListener("mouseenter", () => {
          nodeG.style("opacity", d => d.topic === tid ? 1 : 0.15);
          linkSel.style("opacity", l => (l.source.topic === tid && l.target.topic === tid) ? 0.6 : 0.05);
        });
        el.addEventListener("mouseleave", () => {
          nodeG.style("opacity", 1);
          linkSel.style("opacity", null);
        });
      });
    }

    // zoom-in shows labels
    svg.on("dblclick.label", null);
    let labelsOn = false;
    svg.on("dblclick", () => {
      labelsOn = !labelsOn;
      nodeG.selectAll("text").style("opacity", labelsOn ? 1 : 0);
    });

    const sim = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(d => d.kind === "cross-topic" ? 80 : 35).strength(d => d.kind === "cross-topic" ? 0.05 : 0.4))
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collide", d3.forceCollide().radius(d => 8 + d.difficulty * 1.5))
      .force("topicX", d3.forceX(d => W * (0.1 + 0.8 * (Object.keys(TOPIC_COLORS).indexOf(d.topic) / 10))).strength(0.06))
      .force("topicY", d3.forceY(d => H * (0.5 + 0.25 * Math.sin(Object.keys(TOPIC_COLORS).indexOf(d.topic)))).strength(0.06))
      .on("tick", () => {
        linkSel
          .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        nodeG.attr("transform", d => `translate(${d.x},${d.y})`);
      });

    nodeG.call(d3.drag()
      .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    // === 布局切换 ===
    const TOPIC_KEYS = Object.keys(TOPIC_COLORS);
    // cluster 标签层
    const clusterLabels = g.append("g").attr("class", "cluster-labels");

    function applyLayout(layout) {
      data.nodes.forEach(n => { n.fx = null; n.fy = null; });
      // 清空旧标签
      clusterLabels.selectAll("*").remove();
      if (layout === "force") {
        sim.force("topicX", d3.forceX(d => W * (0.1 + 0.8 * (TOPIC_KEYS.indexOf(d.topic) / 10))).strength(0.06));
        sim.force("topicY", d3.forceY(d => H * (0.5 + 0.25 * Math.sin(TOPIC_KEYS.indexOf(d.topic)))).strength(0.06));
        sim.force("center", d3.forceCenter(W / 2, H / 2));
        sim.force("link").strength(d => d.kind === "cross-topic" ? 0.05 : 0.4);
      } else if (layout === "cluster") {
        // 按 topic 分散到圆周排列的 11 个簇
        const cx = W / 2, cy = H / 2;
        const R = Math.min(W, H) * 0.32;
        sim.force("center", null);
        sim.force("topicX", d3.forceX(d => cx + R * Math.cos(2 * Math.PI * TOPIC_KEYS.indexOf(d.topic) / TOPIC_KEYS.length)).strength(0.25));
        sim.force("topicY", d3.forceY(d => cy + R * Math.sin(2 * Math.PI * TOPIC_KEYS.indexOf(d.topic) / TOPIC_KEYS.length)).strength(0.25));
        sim.force("link").strength(d => d.kind === "cross-topic" ? 0.02 : 0.6);
        // 在每个簇中心放标签
        const labelR = R * 1.32;
        TOPIC_KEYS.forEach((topic, i) => {
          const angle = 2 * Math.PI * i / TOPIC_KEYS.length;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);
          // 找该 topic 的中文 label
          const sample = data.nodes.find(n => n.topic === topic);
          const lbl = sample ? sample.topicLabel : topic;
          clusterLabels.append("text")
            .attr("x", lx).attr("y", ly)
            .attr("text-anchor", Math.abs(Math.cos(angle)) < 0.3 ? "middle" : (Math.cos(angle) > 0 ? "start" : "end"))
            .attr("font-family", "var(--font-display)")
            .attr("font-size", 11).attr("font-weight", 800)
            .attr("font-style", "italic")
            .attr("fill", TOPIC_COLORS[topic] || "#666")
            .text(lbl);
        });
      } else if (layout === "timeline") {
        const years = data.nodes.map(n => Number(n.year)).filter(Boolean);
        const minY = Math.min(...years), maxY = Math.max(...years);
        const span = Math.max(1, maxY - minY);
        const padX = 60, padY = 40;
        sim.force("center", null);
        sim.force("topicX", d3.forceX(d => {
          if (!d.year) return W - padX;
          return padX + ((Number(d.year) - minY) / span) * (W - 2 * padX);
        }).strength(0.4));
        // y: 主题分行
        sim.force("topicY", d3.forceY(d => padY + (TOPIC_KEYS.indexOf(d.topic) / (TOPIC_KEYS.length - 1)) * (H - 2 * padY)).strength(0.4));
        sim.force("link").strength(0.02);
        // 画年份刻度
        for (let y = minY; y <= maxY; y++) {
          const x = padX + ((y - minY) / span) * (W - 2 * padX);
          clusterLabels.append("line")
            .attr("x1", x).attr("y1", padY - 8)
            .attr("x2", x).attr("y2", H - padY + 8)
            .attr("stroke", "var(--paper-dark)")
            .attr("stroke-width", 0.5)
            .attr("stroke-dasharray", "2,3");
          clusterLabels.append("text")
            .attr("x", x).attr("y", padY - 14)
            .attr("text-anchor", "middle")
            .attr("font-family", "var(--font-mono)")
            .attr("font-size", 9)
            .attr("fill", "var(--ink-faint)")
            .text(y);
        }
        // 画 topic 行标签（左侧）
        TOPIC_KEYS.forEach((topic, i) => {
          const ly = padY + (i / (TOPIC_KEYS.length - 1)) * (H - 2 * padY);
          const sample = data.nodes.find(n => n.topic === topic);
          const lbl = sample ? sample.topicLabel : topic;
          clusterLabels.append("text")
            .attr("x", padX - 12).attr("y", ly + 3)
            .attr("text-anchor", "end")
            .attr("font-family", "var(--font-mono)")
            .attr("font-size", 9)
            .attr("fill", TOPIC_COLORS[topic] || "#666")
            .text(lbl);
        });
      }
      sim.alpha(1).restart();
    }

    // === URL hash 同步 ===
    function readHash() {
      const h = location.hash.replace(/^#/, "");
      const out = { layout: "force", q: "" };
      if (!h) return out;
      h.split("&").forEach(p => {
        const [k, v] = p.split("=");
        if (k === "layout" && ["force", "cluster", "timeline"].includes(v)) out.layout = v;
        if (k === "q") out.q = decodeURIComponent(v || "");
      });
      return out;
    }
    function writeHash(state) {
      const parts = [];
      if (state.layout && state.layout !== "force") parts.push("layout=" + state.layout);
      if (state.q) parts.push("q=" + encodeURIComponent(state.q));
      const h = parts.length ? "#" + parts.join("&") : "";
      if (location.hash !== h) history.replaceState(null, "", location.pathname + location.search + h);
    }

    const initial = readHash();

    document.querySelectorAll(".gc-btn[data-layout]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".gc-btn[data-layout]").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        applyLayout(btn.dataset.layout);
        const cur = readHash();
        cur.layout = btn.dataset.layout;
        writeHash(cur);
      });
      if (btn.dataset.layout === initial.layout) {
        document.querySelectorAll(".gc-btn[data-layout]").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        applyLayout(initial.layout);
      }
    });

    // === 节点搜索 ===
    const searchInput = document.getElementById("graph-search");
    let countLabel = null;
    if (searchInput) {
      // 加 count label 紧贴 input
      countLabel = document.createElement("span");
      countLabel.className = "gc-count";
      searchInput.after(countLabel);

      if (initial.q) {
        searchInput.value = initial.q;
      }
      let raf = null;
      function applySearch() {
        raf = null;
        const q = searchInput.value.trim().toLowerCase();
        if (!q) {
          nodeG.style("opacity", 1);
          linkSel.style("opacity", null);
          countLabel.textContent = "";
          return;
        }
        const matched = new Set();
        for (const n of data.nodes) {
          if (n.title.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)) matched.add(n.id);
        }
        nodeG.style("opacity", d => matched.has(d.id) ? 1 : 0.1);
        linkSel.style("opacity", l => (matched.has(l.source.id) || matched.has(l.target.id)) ? 0.3 : 0.03);
        countLabel.textContent = `${matched.size} / ${data.nodes.length}`;
      }
      searchInput.addEventListener("input", () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          applySearch();
          const cur = readHash();
          cur.q = searchInput.value.trim();
          writeHash(cur);
        });
      });
      // 初始已有 query → 立即应用
      if (initial.q) applySearch();
    }

    // === 已读节点视觉 ===
    function applyReadState() {
      try {
        const read = new Set(JSON.parse(localStorage.getItem("eaireading.read") || "[]"));
        nodeG.each(function (d) {
          const isRead = read.has(d.id);
          d3.select(this).classed("node-read", isRead);
          d3.select(this).select("circle")
            .attr("stroke", d.era === "founder" ? "#e9b94a" : (isRead ? "#6e7448" : "#efe7d2"))
            .attr("stroke-width", isRead ? 2.6 : (d.era === "founder" ? 2.4 : 1.2))
            .attr("opacity", isRead ? 0.65 : 1);
        });
        // 顶部计数
        const total = data.nodes.length;
        const done = data.nodes.filter(n => read.has(n.id)).length;
        let badge = document.getElementById("graph-read-badge");
        if (!badge) {
          badge = document.createElement("div");
          badge.id = "graph-read-badge";
          badge.className = "graph-read-badge";
          const controls = document.querySelector(".graph-controls");
          if (controls) controls.appendChild(badge);
        }
        badge.textContent = `${done} / ${total} 已读`;
        badge.hidden = done === 0;
      } catch {}
    }
    applyReadState();
    window.addEventListener("eai:read-changed", applyReadState);
    window.addEventListener("storage", (e) => {
      if (e.key === "eaireading.read") applyReadState();
    });
  }
})();
