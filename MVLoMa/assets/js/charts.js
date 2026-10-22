/*
 * Charts for the MVLoMa page. Every number is read from the HTML tables
 * (#table-main, #table-runtime), so the tables stay the single source of truth.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }
  function text(parent, str, attrs) {
    var t = el("text", attrs, parent);
    t.textContent = str;
    return t;
  }
  function num(cell) { return parseFloat(cell.textContent.replace(/[^\d.\-]/g, "")); }
  function niceStep(range) { return range <= 12 ? 2 : range <= 30 ? 5 : range <= 80 ? 10 : 20; }

  // ------------------------------------------------------------- tooltip
  var tip = document.createElement("div");
  tip.className = "chart-tooltip";
  tip.setAttribute("role", "status");
  document.body.appendChild(tip);
  function showTip(x, y, build) {
    tip.textContent = "";
    build(tip);
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(window.innerWidth - w - 12, x + 14);
    var top = y - h - 12 < 8 ? y + 16 : y - h - 12;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = top + "px";
    tip.classList.add("visible");
  }
  function hideTip() { tip.classList.remove("visible"); }
  function tipValue(box, str) {
    var v = document.createElement("span");
    v.className = "tt-value";
    v.textContent = str;
    box.appendChild(v);
  }
  function tipRow(box, label, value, color) {
    var row = document.createElement("div");
    row.className = "tt-row";
    if (color) {
      var key = document.createElement("i");
      key.className = "tt-key";
      key.style.background = color;
      row.appendChild(key);
    }
    row.appendChild(document.createTextNode(label + " "));
    var b = document.createElement("b");
    b.textContent = value;
    row.appendChild(b);
    box.appendChild(row);
  }

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  var C_OURS = css("--series-ours") || "#2563eb";
  var C_OTHER = css("--series-other") || "#7c8799";

  function onResize(node, fn) {
    var last = 0;
    var run = function () {
      var w = Math.round(node.clientWidth);
      if (w && w !== last) { last = w; fn(w); }
    };
    if (window.ResizeObserver) new ResizeObserver(run).observe(node);
    else window.addEventListener("resize", run);
    run();
  }

  function bindChips(group, attr, onPick) {
    var chips = Array.prototype.slice.call(document.querySelectorAll(group + " [" + attr + "]"));
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
        onPick(chip.getAttribute(attr));
      });
    });
  }

  // ------------------------------------------- benchmark explorer (Table 1)
  (function benchmarkExplorer() {
    var table = document.getElementById("table-main");
    var host = document.getElementById("benchmarkChart");
    if (!table || !host) return;

    var methods = Array.prototype.slice.call(table.querySelectorAll("tbody tr[data-method]")).map(function (tr) {
      var cells = {};
      Array.prototype.forEach.call(tr.querySelectorAll("td[data-key]"), function (td) {
        cells[td.getAttribute("data-key")] = {
          v: num(td),
          best: !!td.querySelector("strong"),
          second: td.classList.contains("second-best")
        };
      });
      return {
        name: tr.getAttribute("data-method"),
        group: tr.getAttribute("data-group"),
        ours: tr.classList.contains("ours"),
        tr: tr,
        cells: cells
      };
    });
    var groupNames = { "two-view": "Two-view", "multi-view": "Multi-view" };
    var benchNames = { hypersim: "HyperSim", scannetpp: "ScanNet++", mipnerf360: "Mip-NeRF 360", tnt: "Tanks and Temples", average: "four-benchmark macro-average" };
    var pick = { bench: "average", th: "1" };
    // Columns whose dots bunch together get a zoomed axis; the button toggles
    // between the zoomed view and the full range.
    var FOCUS = {
      "hypersim-1": [50, 55], "hypersim-5": [76, 82], "hypersim-10": [82, 88],
      "scannetpp-1": [32, 40], "scannetpp-5": [70, 77], "scannetpp-10": [80, 86],
      "mipnerf360-1": [70, 77], "mipnerf360-5": [92, 95], "mipnerf360-10": [95, 98],
      "tnt-1": [65, 70], "tnt-5": [90, 93], "tnt-10": [94, 97],
      "average-1": [55, 60], "average-5": [80, 86], "average-10": [85, 92]
    };
    var zoomed = false;
    var zoomBtn = document.getElementById("benchmarkZoom");
    var width = 0;
    var svg = el("svg", { class: "chart-svg", role: "img" }, host);
    var marks = [];

    function layout() {
      svg.textContent = "";
      marks = [];
      var narrow = width < 560;
      var left = narrow ? 104 : 160, right = narrow ? 64 : 104;
      var rowH = 34, groupH = 26, top = 8;
      var y = top;
      var rows = [];
      var lastGroup = null;
      methods.forEach(function (m) {
        if (m.group !== lastGroup) {
          rows.push({ type: "group", y: y + 17, label: groupNames[m.group] || m.group });
          y += groupH;
          lastGroup = m.group;
        }
        rows.push({ type: "row", y: y + rowH / 2, m: m });
        y += rowH;
      });
      var axisY = y + 6;
      var height = axisY + 34;
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.setAttribute("width", width);
      svg.setAttribute("height", height);
      var plot = { x0: left, x1: width - right, axisY: axisY };
      svg._plot = plot;
      svg._grid = el("g", {}, svg);
      rows.forEach(function (r) {
        if (r.type === "group") {
          text(svg, r.label, { class: "group-label", x: 0, y: r.y });
          return;
        }
        var g = el("g", { class: "row", tabindex: "0" }, svg);
        el("line", { class: "track", x1: plot.x0, x2: plot.x1, y1: r.y, y2: r.y }, g);
        text(g, r.m.name, { class: "row-label" + (r.m.ours ? " is-ours" : ""), x: 0, y: r.y + 4.5 });
        var mark = el("g", { class: "mark" }, g);
        var dot = el("circle", { class: "mark-dot", r: 6.5, cx: 0, cy: r.y, fill: r.m.ours ? C_OURS : C_OTHER, stroke: "#fff", "stroke-width": 2 }, mark);
        var val = text(mark, "", { class: "value-label" + (r.m.ours ? " is-ours" : ""), x: 12, y: r.y + 4.2 });
        var hit = el("rect", { class: "hit", x: 0, y: r.y - rowH / 2, width: width, height: rowH }, g);
        marks.push({ m: r.m, g: g, mark: mark, dot: dot, val: val, hit: hit });
        var show = function (e) {
          var cell = r.m.cells[pick.bench + "-" + pick.th];
          var all = methods.map(function (o) { return o.cells[pick.bench + "-" + pick.th].v; }).sort(function (a, b) { return b - a; });
          var base = methods.filter(function (o) { return o.name === "LoMa-L"; })[0];
          var bb = e.type === "focus" ? g.getBoundingClientRect() : null;
          showTip(bb ? bb.left + bb.width * 0.6 : e.clientX, bb ? bb.top : e.clientY, function (box) {
            tipValue(box, cell.v.toFixed(2));
            tipRow(box, r.m.name, "", r.m.ours ? C_OURS : C_OTHER);
            tipRow(box, "Rank", "#" + (all.indexOf(cell.v) + 1) + " of " + all.length);
            if (base && base !== r.m) {
              var d = cell.v - base.cells[pick.bench + "-" + pick.th].v;
              tipRow(box, "vs. LoMa-L", (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(2));
            }
          });
          g.classList.add("is-hover");
          r.m.tr.classList.add("is-linked");
        };
        var hide = function () { hideTip(); g.classList.remove("is-hover"); r.m.tr.classList.remove("is-linked"); };
        g.addEventListener("pointermove", show);
        g.addEventListener("pointerleave", hide);
        g.addEventListener("focus", show);
        g.addEventListener("blur", hide);
      });
      update(false);
    }

    // The axis domain and dot values are tweened together frame by frame, so a
    // zoom moves the grid and the dots as one smooth motion.
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var view = null;
    var frameId = 0;
    function lerp(a, b, k) { return a + (b - a) * k; }
    function ease(k) { return (1 - Math.cos(Math.PI * k)) / 2; }

    function update(animate, duration) {
      var key = pick.bench + "-" + pick.th;
      var vals = methods.map(function (m) { return m.cells[key].v; });
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      var step = niceStep(hi - lo + 3);
      var d0 = Math.floor((lo - 1) / step) * step, d1 = Math.ceil((hi + 0.5) / step) * step;
      if (d1 > 100) d1 = 100;
      var focus = FOCUS[key];
      var isZoomed = !!(focus && zoomed);
      if (isZoomed) { d0 = focus[0]; d1 = focus[1]; }
      syncZoomButton(focus);
      var target = {
        d0: d0, d1: d1, vals: vals,
        caption: "AUC@" + pick.th + "° on " + benchNames[pick.bench] +
          (width < 560 ? "" : isZoomed ? " (higher is better; axis zoomed to " + d0 + "–" + d1 + ")" : " (higher is better; axis does not start at 0)")
      };
      marks.forEach(function (mk) {
        var c = mk.m.cells[key];
        mk.text = c.v.toFixed(2) + (c.best && width >= 560 ? " · best" : "");
      });
      svg.setAttribute("aria-label", "Dot plot of AUC@" + pick.th + " degrees on " + benchNames[pick.bench] + " for " + methods.length + " methods.");

      cancelAnimationFrame(frameId);
      var from = view;
      if (!animate || !from || reduceMotion) { view = target; draw(target); return; }
      var dur = duration || 600, t0 = performance.now();
      // Zoom geometrically about the value that keeps its screen position, so
      // the magnification changes at an even pace.
      var s0 = from.d1 - from.d0, s1 = target.d1 - target.d0;
      var fixed = Math.abs(s0 - s1) > 1e-6 ? (from.d0 * s1 - target.d0 * s0) / (s1 - s0) : null;
      (function frame(now) {
        var k = Math.min(1, (now - t0) / dur), e = ease(k);
        var d0, d1;
        if (fixed === null) { d0 = lerp(from.d0, target.d0, e); d1 = lerp(from.d1, target.d1, e); }
        else {
          var r = Math.pow(s1 / s0, e);
          d0 = fixed - (fixed - from.d0) * r; d1 = fixed + (from.d1 - fixed) * r;
        }
        view = {
          d0: d0, d1: d1, caption: target.caption,
          vals: target.vals.map(function (v, i) { return lerp(from.vals[i], v, e); })
        };
        draw(view);
        if (k < 1) frameId = requestAnimationFrame(frame);
      })(t0);
    }

    function draw(s) {
      var p = svg._plot, w = p.x1 - p.x0;
      var ppu = w / (s.d1 - s.d0);
      var x = function (v) { return p.x0 + (v - s.d0) * ppu; };
      var grid = svg._grid;
      grid.textContent = "";
      // Ticks every 1/5/10 points fade in as their spacing grows, so the grid
      // densifies continuously while zooming instead of jumping.
      var fadeFrom = w / 22, fadeTo = w / 12;
      for (var t = Math.ceil(s.d0 - 1e-6); t <= Math.floor(s.d1 + 1e-6); t++) {
        var level = t % 10 === 0 ? 10 : t % 5 === 0 ? 5 : 1;
        var alpha = Math.max(0, Math.min(1, (level * ppu - fadeFrom) / (fadeTo - fadeFrom)));
        if (alpha < .02) continue;
        el("line", { class: "grid", x1: x(t), x2: x(t), y1: 0, y2: p.axisY, opacity: alpha.toFixed(2) }, grid);
        text(grid, String(t), { class: "tick-label", x: x(t), y: p.axisY + 16, "text-anchor": "middle", opacity: alpha.toFixed(2) });
      }
      text(grid, s.caption, { class: "axis-label", x: p.x0 + w / 2, y: p.axisY + 32, "text-anchor": "middle" });
      marks.forEach(function (mk, i) {
        // Values left of a zoomed axis sit on its edge as hollow dots.
        var v = s.vals[i], clipped = v < s.d0 - 1e-6;
        var color = mk.m.ours ? C_OURS : C_OTHER;
        mk.mark.style.transform = "translate(" + Math.max(p.x0, x(v)).toFixed(1) + "px,0)";
        mk.dot.setAttribute("fill", clipped ? "#fff" : color);
        mk.dot.setAttribute("stroke", clipped ? color : "#fff");
        mk.val.textContent = (clipped ? "‹ " : "") + mk.text;
      });
    }

    function syncZoomButton(focus) {
      if (!zoomBtn) return;
      zoomBtn.hidden = !focus;
      if (!focus) return;
      zoomBtn.setAttribute("aria-pressed", String(zoomed));
      zoomBtn.innerHTML = zoomed
        ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12M5 5 2 8l3 3M11 5l3 3-3 3"/></svg>Full range'
        : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h4M10 8h4M3.5 5 6.5 8l-3 3M12.5 5l-3 3 3 3"/></svg>Focus';
    }
    if (zoomBtn) zoomBtn.addEventListener("click", function () {
      zoomed = !zoomed;
      if (io) { io.disconnect(); io = null; }
      update(true, 1200);
    });
    // The chart starts at full range and eases into the zoomed axis the first
    // time it scrolls into view.
    var io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect(); io = null;
        setTimeout(function () { zoomed = true; update(true, 2000); }, 300);
      }, { threshold: 0.6 });
      io.observe(host);
    } else {
      zoomed = true;
    }

    bindChips("#benchmarkBench", "data-bench", function (v) { pick.bench = v; update(true); });
    bindChips("#benchmarkThreshold", "data-th", function (v) { pick.th = v; update(true); });

    // ---- link the chart with Table 1: the plotted column is highlighted,
    // header cells pick what to plot, rows and dots highlight each other.
    function syncChips() {
      Array.prototype.forEach.call(document.querySelectorAll("#benchmarkBench [data-bench]"), function (c) {
        c.setAttribute("aria-pressed", String(c.getAttribute("data-bench") === pick.bench));
      });
      Array.prototype.forEach.call(document.querySelectorAll("#benchmarkThreshold [data-th]"), function (c) {
        c.setAttribute("aria-pressed", String(c.getAttribute("data-th") === pick.th));
      });
    }
    var baseUpdate = update;
    update = function (animate, duration) {
      baseUpdate(animate, duration);
      var key = pick.bench + "-" + pick.th;
      Array.prototype.forEach.call(table.querySelectorAll(".is-active-col"), function (n) { n.classList.remove("is-active-col"); });
      Array.prototype.forEach.call(table.querySelectorAll('[data-key="' + key + '"]'), function (n) { n.classList.add("is-active-col"); });
      Array.prototype.forEach.call(table.querySelectorAll("th[data-bench]"), function (th) {
        th.classList.toggle("is-active-group", th.getAttribute("data-bench") === pick.bench);
      });
    };
    function pickFrom(bench, th, scroll) {
      pick.bench = bench;
      if (th) pick.th = th;
      syncChips();
      update(true);
      if (scroll) host.closest(".chart-card").scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    Array.prototype.forEach.call(table.querySelectorAll("thead th[data-key], thead th[data-bench]"), function (th) {
      var key = th.getAttribute("data-key");
      var bench = key ? key.split("-")[0] : th.getAttribute("data-bench");
      var thr = key ? key.split("-")[1] : null;
      th.tabIndex = 0;
      th.classList.add("is-pickable");
      th.title = "Plot " + benchNames[bench] + (thr ? " AUC@" + thr + "°" : "") + " in the chart above";
      th.addEventListener("click", function () { pickFrom(bench, thr, true); });
      th.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        pickFrom(bench, thr, true);
      });
    });
    methods.forEach(function (m) {
      m.tr.addEventListener("pointerenter", function () {
        marks.forEach(function (mk) { mk.g.classList.toggle("is-hover", mk.m === m); });
        m.tr.classList.add("is-linked");
      });
      m.tr.addEventListener("pointerleave", function () {
        marks.forEach(function (mk) { mk.g.classList.remove("is-hover"); });
        m.tr.classList.remove("is-linked");
      });
    });
    onResize(host, function (w) { width = w; layout(); });
  })();

  // ------------------------------------------- efficiency chart (Table 6)
  (function efficiencyChart() {
    var table = document.getElementById("table-runtime");
    var host = document.getElementById("efficiencyChart");
    if (!table || !host) return;
    var rows = Array.prototype.slice.call(table.querySelectorAll("tbody tr")).map(function (tr) {
      var td = tr.querySelectorAll("td");
      return {
        views: num(td[0]), edges: num(td[1]),
        tPair: num(td[2]), tStar: num(td[3]), tSp: num(td[4]),
        mPair: num(td[5]), mStar: num(td[6]), mSp: num(td[7])
      };
    });
    var metric = "latency";
    var width = 0;
    var svg = el("svg", { class: "chart-svg", role: "img" }, host);

    function draw() {
      svg.textContent = "";
      var lat = metric === "latency";
      var unit = lat ? "ms" : "TFLOPs";
      var pairKey = lat ? "mPair" : "tPair", starKey = lat ? "mStar" : "tStar";
      var yMax = lat ? 500 : 18, yStep = lat ? 100 : 3;
      var narrow = width < 520;
      var m = { l: 46, r: narrow ? 78 : 118, t: 30, b: 44 };
      var height = narrow ? 266 : 306;
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.setAttribute("width", width);
      svg.setAttribute("height", height);
      var x = function (v) { return m.l + (v - 0) / 26 * (width - m.l - m.r); };
      var y = function (v) { return height - m.b - v / yMax * (height - m.t - m.b); };
      for (var t = 0; t <= yMax + 1e-9; t += yStep) {
        el("line", { class: t === 0 ? "baseline" : "grid", x1: m.l, x2: width - m.r, y1: y(t), y2: y(t) }, svg);
        text(svg, String(t), { class: "tick-label", x: m.l - 8, y: y(t) + 4, "text-anchor": "end" });
      }
      rows.forEach(function (r) {
        text(svg, String(r.views), { class: "tick-label", x: x(r.views), y: height - m.b + 17, "text-anchor": "middle" });
      });
      text(svg, "Views in the star (centre + neighbours)", { class: "axis-label", x: m.l + (width - m.l - m.r) / 2, y: height - 6, "text-anchor": "middle" });
      text(svg, lat ? "Latency (ms)" : "Compute (TFLOPs)", { class: "axis-label", x: 0, y: 12 });

      var series = [
        { key: pairKey, name: "Pairwise", color: C_OTHER },
        { key: starKey, name: "Star (ours)", color: C_OURS }
      ];
      series.forEach(function (s) {
        var d = rows.map(function (r, i) { return (i ? "L" : "M") + x(r.views).toFixed(1) + " " + y(r[s.key]).toFixed(1); }).join(" ");
        el("path", { d: d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
        rows.forEach(function (r) {
          el("circle", { cx: x(r.views), cy: y(r[s.key]), r: 4.5, fill: s.color, stroke: "#fff", "stroke-width": 2 }, svg);
        });
        var last = rows[rows.length - 1];
        text(svg, s.name, { class: "value-label", x: x(last.views) + 10, y: y(last[s.key]) - 3 });
        text(svg, last[s.key].toFixed(lat ? 2 : 3) + " " + unit, { class: "tick-label", x: x(last.views) + 10, y: y(last[s.key]) + 12 });
      });

      var cross = el("line", { class: "baseline", y1: m.t, y2: height - m.b, x1: -10, x2: -10, opacity: 0 }, svg);
      var hit = el("rect", { class: "hit", x: m.l, y: m.t, width: width - m.l - m.r, height: height - m.t - m.b, tabindex: "0" }, svg);
      var nearest = function (px) {
        var best = rows[0];
        rows.forEach(function (r) { if (Math.abs(x(r.views) - px) < Math.abs(x(best.views) - px)) best = r; });
        return best;
      };
      var show = function (r, cx, cy) {
        cross.setAttribute("x1", x(r.views));
        cross.setAttribute("x2", x(r.views));
        cross.setAttribute("opacity", 1);
        showTip(cx, cy, function (box) {
          tipValue(box, (lat ? r.mSp : r.tSp).toFixed(2) + "× " + (lat ? "measured" : "theoretical") + " speed-up");
          tipRow(box, r.views + " views · " + r.edges + (r.edges === 1 ? " edge" : " edges"), "");
          tipRow(box, "Pairwise", r[pairKey].toFixed(lat ? 2 : 3) + " " + unit, C_OTHER);
          tipRow(box, "Star", r[starKey].toFixed(lat ? 2 : 3) + " " + unit, C_OURS);
        });
      };
      hit.addEventListener("pointermove", function (e) {
        var bb = svg.getBoundingClientRect();
        show(nearest((e.clientX - bb.left) * (width / bb.width)), e.clientX, e.clientY);
      });
      hit.addEventListener("pointerleave", function () { hideTip(); cross.setAttribute("opacity", 0); });
      var kbd = rows.length - 1;
      hit.addEventListener("focus", function () {
        var bb = hit.getBoundingClientRect();
        show(rows[kbd], bb.left + bb.width / 2, bb.top);
      });
      hit.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        kbd = Math.max(0, Math.min(rows.length - 1, kbd + (e.key === "ArrowRight" ? 1 : -1)));
        var bb = hit.getBoundingClientRect();
        show(rows[kbd], bb.left + (x(rows[kbd].views) - m.l) * (bb.width / (width - m.l - m.r)), bb.top);
      });
      hit.addEventListener("blur", function () { hideTip(); cross.setAttribute("opacity", 0); });
      svg.setAttribute("aria-label", (lat ? "Matcher latency on one A800" : "Theoretical Transformer compute") +
        " for sequential pairwise and star matching at 2, 4, 7, 13 and 25 views.");
    }

    bindChips("#efficiencyMetric", "data-metric", function (v) { metric = v; draw(); });
    onResize(host, function (w) { width = w; draw(); });
  })();
})();
