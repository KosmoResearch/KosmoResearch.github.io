/* Page chrome: active nav link, tabs, figure lightbox, BibTeX copy, back-to-top. */
(function () {
  "use strict";

  // ---------------------------------------------------- active nav link
  var links = Array.prototype.slice.call(document.querySelectorAll(".site-header nav a[href^='#']"));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a, i) { a.classList.toggle("is-active", sections[i] === entry.target); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { if (s) io.observe(s); });
  }

  // --------------------------------------------------------------- tabs
  Array.prototype.forEach.call(document.querySelectorAll("[role='tablist']"), function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll("[role='tab']"));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
        if (j === null) return;
        e.preventDefault();
        select(tabs[(j + tabs.length) % tabs.length], true);
      });
    });
    // Deep links such as #ablation-views open the matching tab.
    var fromHash = tabs.filter(function (t) { return "#" + t.getAttribute("aria-controls") === location.hash; })[0];
    if (fromHash) select(fromHash, false);
  });

  // ----------------------------------------------------------- lightbox
  var box = document.getElementById("lightbox");
  if (box && typeof box.showModal === "function" && window.ZoomPan) {
    var img = box.querySelector("img");
    var cap = box.querySelector("[data-lightbox-caption]");
    var vp = box.querySelector(".lightbox-viewport");
    var level = box.querySelector("[data-zoom-level]");
    var zoom = new window.ZoomPan(vp, [img], {
      maxScale: 8,
      onChange: function (s) { level.textContent = Math.round(s * 100) + "%"; }
    });
    // Inside the dialog, plain wheel zooms too: nothing behind it scrolls.
    vp.addEventListener("wheel", function (e) {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      var r = vp.getBoundingClientRect();
      zoom.zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    box.querySelector("[data-zoom='in']").addEventListener("click", function () { zoom.zoomCenter(1.5); });
    box.querySelector("[data-zoom='out']").addEventListener("click", function () { zoom.zoomCenter(1 / 1.5); });
    box.querySelector("[data-zoom='reset']").addEventListener("click", function () { zoom.reset(); });
    box.querySelector("[data-lightbox-close]").addEventListener("click", function () { box.close(); });
    box.addEventListener("close", function () { img.removeAttribute("src"); });

    Array.prototype.forEach.call(document.querySelectorAll("[data-lightbox]"), function (trigger) {
      trigger.addEventListener("click", function () {
        img.src = trigger.getAttribute("data-lightbox");
        img.alt = trigger.getAttribute("data-lightbox-alt") || "";
        cap.textContent = trigger.getAttribute("data-lightbox-title") || "";
        box.showModal();
        zoom.reset();
        vp.focus();
      });
    });
  } else {
    // No <dialog> support: open the high-resolution file directly.
    Array.prototype.forEach.call(document.querySelectorAll("[data-lightbox]"), function (trigger) {
      trigger.addEventListener("click", function () { window.open(trigger.getAttribute("data-lightbox"), "_blank", "noopener"); });
    });
  }

  // ---------------------------------------------------------- BibTeX copy
  var copyBtn = document.getElementById("copyBibtex");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var code = document.getElementById("bibtexCode").textContent;
      var label = copyBtn.querySelector("span");
      var done = function () {
        label.textContent = "Copied";
        setTimeout(function () { label.textContent = "Copy"; }, 1800);
      };
      var fallback = function () {
        var t = document.createElement("textarea");
        t.value = code;
        document.body.appendChild(t);
        t.select();
        try { document.execCommand("copy"); } catch (e) { /* ignore */ }
        t.remove();
        done();
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(done, fallback);
      else fallback();
    });
  }

  // --------------------------------------------------------- back to top
  var toTop = document.getElementById("toTop");
  if (toTop) {
    window.addEventListener("scroll", function () {
      toTop.classList.toggle("visible", window.scrollY > 350);
    }, { passive: true });
    toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }
})();
