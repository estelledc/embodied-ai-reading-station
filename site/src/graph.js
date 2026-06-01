// D3 force-directed graph for paper relationships
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof d3 === "undefined") {
      // d3 still loading, try again shortly
      setTimeout(arguments.callee, 100);
      return;
    }
    init();
  });

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
      })
      .on("mousemove", (e) => {
        const cr = container.getBoundingClientRect();
        tooltip.style.left = (e.clientX - cr.left + 14) + "px";
        tooltip.style.top = (e.clientY - cr.top + 14) + "px";
      })
      .on("mouseleave", () => { tooltip.hidden = true; });

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
      // 按主题分簇：每个 topic 给一个目标 (x,y)
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
  }
})();
