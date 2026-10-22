/*
 * ZoomPan: wheel / pinch / drag / double-click zoom for stacked image layers.
 * Every target element receives the same transform, so layers stay aligned.
 */
(function () {
  "use strict";

  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };

  function ZoomPan(viewport, targets, options) {
    var opts = options || {};
    this.viewport = viewport;
    this.targets = targets;
    this.maxScale = opts.maxScale || 6;
    this.onChange = opts.onChange || function () {};
    this.onHint = opts.onHint || function () {};
    // Returns true when a drag should be handled elsewhere (e.g. split handle).
    this.canPan = opts.canPan || function () { return true; };
    this.dblclickZoom = opts.dblclickZoom !== false;
    this.onDragUnzoomed = opts.onDragUnzoomed || null;
    this.s = 1;
    this.tx = 0;
    this.ty = 0;
    this.pointers = new Map();
    this.pinch = null;
    this.drag = null;
    this._bind();
    this.apply();
  }

  ZoomPan.prototype.size = function () {
    var r = this.viewport.getBoundingClientRect();
    return { w: r.width, h: r.height, left: r.left, top: r.top };
  };

  ZoomPan.prototype.constrain = function () {
    var sz = this.size();
    this.s = clamp(this.s, 1, this.maxScale);
    this.tx = clamp(this.tx, sz.w - this.s * sz.w, 0);
    this.ty = clamp(this.ty, sz.h - this.s * sz.h, 0);
  };

  ZoomPan.prototype.apply = function () {
    this.constrain();
    var t = "translate(" + this.tx + "px," + this.ty + "px) scale(" + this.s + ")";
    this.targets.forEach(function (el) { el.style.transform = t; });
    this.viewport.classList.toggle("is-zoomed", this.s > 1.001);
    this.onChange(this.s);
  };

  ZoomPan.prototype.zoomAt = function (factor, cx, cy) {
    var next = clamp(this.s * factor, 1, this.maxScale);
    var k = next / this.s;
    this.tx = cx - (cx - this.tx) * k;
    this.ty = cy - (cy - this.ty) * k;
    this.s = next;
    this.apply();
  };

  ZoomPan.prototype.zoomCenter = function (factor) {
    var sz = this.size();
    this.zoomAt(factor, sz.w / 2, sz.h / 2);
  };

  ZoomPan.prototype.reset = function () {
    this.s = 1;
    this.tx = 0;
    this.ty = 0;
    this.apply();
  };

  ZoomPan.prototype._local = function (e) {
    var sz = this.size();
    return { x: e.clientX - sz.left, y: e.clientY - sz.top };
  };

  ZoomPan.prototype._bind = function () {
    var self = this;
    var vp = this.viewport;

    vp.addEventListener("wheel", function (e) {
      if (!(e.ctrlKey || e.metaKey)) {
        self.onHint();
        return; // plain wheel keeps scrolling the page
      }
      e.preventDefault();
      var p = self._local(e);
      self.zoomAt(Math.exp(-e.deltaY * 0.0022), p.x, p.y);
    }, { passive: false });

    vp.addEventListener("dblclick", function (e) {
      if (!self.dblclickZoom || !self.canPan(e)) return;
      var p = self._local(e);
      if (self.s > 1.05) self.reset();
      else self.zoomAt(2.5, p.x, p.y);
    });

    vp.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (!self.canPan(e)) return;
      self.pointers.set(e.pointerId, self._local(e));
      vp.setPointerCapture(e.pointerId);
      if (self.pointers.size === 2) {
        var pts = Array.from(self.pointers.values());
        self.pinch = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          s: self.s
        };
        self.drag = null;
      } else {
        var p = self._local(e);
        self.drag = { x: p.x, y: p.y, tx: self.tx, ty: self.ty, external: false };
        // At 1x there is nothing to pan, so let the owner use the drag
        // (the gallery moves its compare split this way).
        if (self.s <= 1.001 && self.onDragUnzoomed && self.onDragUnzoomed(p.x)) {
          self.drag.external = true;
        } else {
          vp.classList.add("is-panning");
        }
      }
    });

    vp.addEventListener("pointermove", function (e) {
      if (!self.pointers.has(e.pointerId)) return;
      var p = self._local(e);
      self.pointers.set(e.pointerId, p);
      if (self.pinch && self.pointers.size === 2) {
        var pts = Array.from(self.pointers.values());
        var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        var cx = (pts[0].x + pts[1].x) / 2;
        var cy = (pts[0].y + pts[1].y) / 2;
        self.zoomAt((self.pinch.s * dist / self.pinch.dist) / self.s, cx, cy);
      } else if (self.drag) {
        if (self.drag.external) {
          self.onDragUnzoomed(p.x);
        } else {
          self.tx = self.drag.tx + (p.x - self.drag.x);
          self.ty = self.drag.ty + (p.y - self.drag.y);
          self.apply();
        }
      }
    });

    var end = function (e) {
      self.pointers.delete(e.pointerId);
      if (self.pointers.size < 2) self.pinch = null;
      if (self.pointers.size === 0) {
        self.drag = null;
        vp.classList.remove("is-panning");
      }
    };
    vp.addEventListener("pointerup", end);
    vp.addEventListener("pointercancel", end);

    vp.addEventListener("keydown", function (e) {
      var step = 60;
      if (e.key === "+" || e.key === "=") self.zoomCenter(1.25);
      else if (e.key === "-" || e.key === "_") self.zoomCenter(0.8);
      else if (e.key === "0") self.reset();
      else if (self.s > 1.001 && e.key.indexOf("Arrow") === 0) {
        if (e.key === "ArrowLeft") self.tx += step;
        if (e.key === "ArrowRight") self.tx -= step;
        if (e.key === "ArrowUp") self.ty += step;
        if (e.key === "ArrowDown") self.ty -= step;
        self.apply();
      } else return;
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener("resize", function () { self.apply(); });
  };

  window.ZoomPan = ZoomPan;
})();
