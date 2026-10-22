/*
 * Star-matching gallery: scene browser, dataset filter, zoom & pan and
 * fullscreen. Scene metadata lives on the .scene-card buttons in
 * index.html (single source of truth).
 */
(function () {
  "use strict";

  var root = document.getElementById("gallery");
  if (!root || !window.ZoomPan) return;

  var $ = function (sel) { return root.querySelector(sel); };
  var cards = Array.prototype.slice.call(root.querySelectorAll(".scene-card"));
  var chips = Array.prototype.slice.call(root.querySelectorAll(".scene-filters .chip"));
  var shell = $("#galleryShell");
  var strip = $("#sceneStrip");
  var wrap = $("#viewerWrap");
  var image = $("#matchImage");
  var empty = $("#viewerEmpty");
  var fullscreenBtn = $("#viewerFullscreen");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var current = null;
  var token = 0;

  var zoom = new window.ZoomPan(wrap, [image], {
    maxScale: 6,
    dblclickZoom: false,
    canPan: function (e) { return !e.target.closest(".viewer-controls"); }
  });

  function src(id) { return "figures/gallery/" + id + "_match.jpg"; }
  function visibleCards() { return cards.filter(function (c) { return !c.hidden; }); }

  function describe(card) {
    return card.getAttribute("data-dataset") + " · " + card.getAttribute("data-title");
  }

  function loadScene(card) {
    if (!card) return;
    var id = card.getAttribute("data-scene");
    var mine = ++token;
    current = card;
    cards.forEach(function (c) { c.setAttribute("aria-pressed", String(c === card)); });
    wrap.classList.add("is-loading");

    var probe = new Image();
    probe.onload = function () {
      if (mine !== token) return;
      image.src = src(id);
      image.alt = "Star-matching result for " + describe(card) + ".";
      zoom.reset();
      empty.classList.add("hidden");
      empty.classList.remove("error");
      wrap.classList.remove("is-loading");
      var next = neighbour(1);
      if (next) new Image().src = src(next.getAttribute("data-scene"));
    };
    probe.onerror = function () {
      if (mine !== token) return;
      empty.classList.remove("hidden");
      empty.classList.add("error");
      empty.querySelector("strong").textContent = "Unable to load this star";
      empty.querySelector("p").textContent = "Check that " + src(id) + " exists.";
    };
    probe.src = src(id);
    card.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }

  function neighbour(step) {
    var list = visibleCards();
    if (!list.length) return null;
    var i = list.indexOf(current);
    return list[(i + step + list.length) % list.length];
  }

  cards.forEach(function (card) {
    card.addEventListener("click", function () { loadScene(card); });
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var filter = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      cards.forEach(function (c) {
        c.hidden = filter !== "all" && c.getAttribute("data-dataset") !== filter;
      });
      strip.scrollLeft = 0;
      if (!current || current.hidden) loadScene(visibleCards()[0]);
    });
  });

  // While the pointer is over the thumbnail strip the mouse wheel only scrolls
  // the strip sideways; at either end it stops instead of scrolling the page.
  strip.addEventListener("wheel", function (e) {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (strip.scrollWidth <= strip.clientWidth) return;
    e.preventDefault();
    strip.scrollLeft += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
  }, { passive: false });

  wrap.addEventListener("keydown", function (e) {
    if (e.defaultPrevented) return;
    if (e.key === "ArrowLeft") loadScene(neighbour(-1));
    else if (e.key === "ArrowRight") loadScene(neighbour(1));
    else return;
    e.preventDefault();
  });

  if (!shell.requestFullscreen) fullscreenBtn.hidden = true;
  fullscreenBtn.addEventListener("click", function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else shell.requestFullscreen().catch(function () {});
  });
  document.addEventListener("fullscreenchange", function () {
    fullscreenBtn.setAttribute("aria-label", document.fullscreenElement === shell ? "Exit fullscreen" : "Fullscreen");
    zoom.reset();
  });

  loadScene(cards.filter(function (c) { return c.getAttribute("aria-pressed") === "true"; })[0] || cards[0]);
})();
