(() => {
  'use strict';

  const SETTING_OF = { dynamic:'Dynamic', static:'Static', 'dynamic-static':'Dynamic-Static' };

  /* ---------- synchronized multi-video comparison ---------- */
  class VizBlock {
    constructor(root, methods, scenes) {
      this.root = root; this.methods = methods; this.scenes = scenes;
      this.videos = []; this.playing = false; this.raf = 0;
      this.build();
      if (scenes.length) this.select(0);
    }

    build() {
      const multi = this.scenes.some(s => s.setting);
      this.root.innerHTML = `
        <div class="scene-browser">
          <div class="scene-browser-head">
            <div><strong>Choose a sequence</strong><span class="count"></span></div>
          </div>
          <div class="scene-strip" aria-live="polite"></div>
        </div>
        <div class="viz-grid">
          ${this.methods.map((m, i) => `
            <article class="viz-panel${m.cls === 'ours' ? ' is-ours' : ''}">
              <header><span>${m.label}</span>${m.cls === 'ours' ? '<small>Ours</small>' : ''}</header>
              <div class="viz-stage">
                <video muted loop playsinline preload="metadata"></video>
                <button class="viz-zoom" type="button" data-k="${i}" aria-label="Enlarge ${m.label}" title="Enlarge">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M16.5 16.5 21 21"/></svg>
                </button>
              </div>
            </article>`).join('')}
        </div>
        <div class="viz-timeline">
          <button class="timeline-play" type="button" aria-label="Play" disabled>▶</button>
          <input type="range" min="0" max="1000" value="0" step="1" aria-label="Timeline" disabled>
          <span class="tl-label">0.0s / 0.0s</span>
        </div>`;

      this.strip  = this.root.querySelector('.scene-strip');
      this.playBtn = this.root.querySelector('.timeline-play');
      this.slider = this.root.querySelector('input[type=range]');
      this.label  = this.root.querySelector('.tl-label');
      this.videos = [...this.root.querySelectorAll('video')];
      this.root.querySelector('.count').textContent = ` · ${this.scenes.length}`;

      this.renderStrip(this.scenes);
      this.root.querySelectorAll('.viz-zoom').forEach(b =>
        b.addEventListener('click', () => Lightbox.open(this, +b.dataset.k)));
      this.playBtn.addEventListener('click', () => this.toggle());
      this.slider.addEventListener('input', () => {
        const d = this.duration();
        if (!d) return;
        const t = (this.slider.value / 1000) * d;
        this.videos.forEach(v => { if (v.src) v.currentTime = Math.min(t, v.duration || t); });
        this.updateLabel();
      });

      // pause offscreen to save bandwidth/CPU
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => es.forEach(e => {
          if (!e.isIntersecting && this.playing) this.toggle();
        }), { threshold: 0.1 }).observe(this.root);
      }
    }

    renderStrip(list) {
      // few enough scenes -> spread evenly across full width instead of scrolling
      this.strip.classList.toggle('is-fill', list.length > 0 && list.length <= 8);
      this.strip.innerHTML = list.map(s => {
        const i = this.scenes.indexOf(s);
        const badge = s.setting
          ? `<span class="badge ${s.setting}">${SETTING_OF[s.setting] || s.setting}</span>` : '';
        const thumb = s.thumb
          ? `<img class="th" src="${s.thumb}" alt="" loading="lazy" decoding="async">`
          : '<span class="th th-empty"></span>';
        return `<button class="scene-card" data-i="${i}">${thumb}<span class="meta"><span class="nm">${s.label}</span>${badge}</span></button>`;
      }).join('') || '<div style="color:var(--muted);font-size:.8rem;padding:.5rem">No match.</div>';
      this.strip.querySelectorAll('.scene-card').forEach(c =>
        c.addEventListener('click', () => this.select(+c.dataset.i)));
      this.markActive();
    }

    markActive() {
      this.strip.querySelectorAll('.scene-card').forEach(c =>
        c.classList.toggle('active', +c.dataset.i === this.current));
    }

    select(i) {
      this.current = i;
      const scene = this.scenes[i];
      if (!scene) return;
      // a new sequence invalidates whatever is zoomed
      if (Lightbox.block === this) Lightbox.close();
      this.markActive();
      if (this.playing) this.toggle();

      let pending = 0;
      this.videos.forEach((v, k) => {
        const src = scene.videos[this.methods[k].key];
        if (!src) { v.removeAttribute('src'); v.load(); return; }
        pending++;
        v.src = src;
        v.load();
        v.addEventListener('loadedmetadata', () => {
          if (--pending === 0) {
            this.playBtn.disabled = false;
            this.slider.disabled = false;
            this.slider.value = 0;
            this.updateLabel();
            this.toggle();          // autoplay once the set is ready
          }
        }, { once: true });
      });
    }

    duration() {
      return this.videos.reduce((m, v) => Math.max(m, v.duration || 0), 0);
    }

    toggle() {
      this.playing = !this.playing;
      this.playBtn.textContent = this.playing ? '❙❙' : '▶';
      this.playBtn.setAttribute('aria-label', this.playing ? 'Pause' : 'Play');
      if (this.playing) {
        this.videos.forEach(v => { if (v.src) v.play().catch(() => {}); });
        const tick = () => {
          if (!this.playing) return;
          this.sync();
          this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
      } else {
        this.videos.forEach(v => v.pause());
        cancelAnimationFrame(this.raf);
      }
    }

    // keep every panel locked to the longest clip's clock
    sync() {
      const master = this.videos.find(v => v.src && v.readyState >= 2);
      if (!master) return;
      const t = master.currentTime;
      this.videos.forEach(v => {
        if (v === master || !v.src || v.readyState < 2) return;
        const target = v.duration ? t % v.duration : t;
        if (Math.abs(v.currentTime - target) > 0.18) v.currentTime = target;
      });
      const d = this.duration();
      if (d) this.slider.value = Math.round((t / d) * 1000);
      this.updateLabel();
    }

    updateLabel() {
      const d = this.duration();
      const master = this.videos.find(v => v.src && v.readyState >= 1);
      const t = master ? master.currentTime : 0;
      this.label.textContent = `${t.toFixed(1)}s / ${d.toFixed(1)}s`;
    }
  }

  /* ---------- zoom lightbox: one method's current clip, large ---------- */
  const Lightbox = {
    el: null, video: null, caption: null, block: null, k: -1,
    wasPlaying: false, raf: 0,

    mount() {
      if (this.el) return;
      this.el = document.createElement('div');
      this.el.className = 'viz-lightbox';
      this.el.setAttribute('role', 'dialog');
      this.el.setAttribute('aria-modal', 'true');
      this.el.hidden = true;
      this.el.innerHTML = `
        <div class="lb-backdrop" data-close></div>
        <figure class="lb-frame">
          <button class="lb-close" type="button" data-close aria-label="Close">&times;</button>
          <button class="lb-nav lb-prev" type="button" aria-label="Previous method">&#8249;</button>
          <video class="lb-video" muted loop playsinline></video>
          <button class="lb-nav lb-next" type="button" aria-label="Next method">&#8250;</button>
          <figcaption class="lb-caption"></figcaption>
        </figure>`;
      document.body.appendChild(this.el);
      this.video = this.el.querySelector('.lb-video');
      this.caption = this.el.querySelector('.lb-caption');

      this.el.querySelectorAll('[data-close]').forEach(n =>
        n.addEventListener('click', () => this.close()));
      this.el.querySelector('.lb-prev').addEventListener('click', () => this.step(-1));
      this.el.querySelector('.lb-next').addEventListener('click', () => this.step(1));
      addEventListener('keydown', e => {
        if (this.el.hidden) return;
        if (e.key === 'Escape') this.close();
        else if (e.key === 'ArrowLeft') this.step(-1);
        else if (e.key === 'ArrowRight') this.step(1);
      });
    },

    // standalone video (e.g. the hero reel): no method list, no prev/next
    openSolo(video, caption) {
      this.mount();
      this.block = null; this.solo = video;
      this.el.querySelectorAll('.lb-nav').forEach(n => n.hidden = true);
      this.el.querySelector('.lb-frame').classList.remove('is-ours');
      this.caption.innerHTML = caption || '';
      this.el.hidden = false;
      document.body.classList.add('lb-open');
      this.soloWasPlaying = !video.paused;
      video.pause();
      const t = video.currentTime;
      this.video.src = video.currentSrc || video.src;
      this.video.addEventListener('loadedmetadata', () => {
        this.video.currentTime = Math.min(t, this.video.duration || 0);
        this.video.play().catch(() => {});
      }, { once: true });
      this.video.load();
    },

    open(block, k) {
      this.mount();
      this.el.querySelectorAll('.lb-nav').forEach(n => n.hidden = false);
      this.solo = null;
      this.block = block;
      // stop the grid so only one clip decodes while zoomed
      this.wasPlaying = block.playing;
      if (block.playing) block.toggle();
      this.el.hidden = false;
      document.body.classList.add('lb-open');
      this.load(k, block.videos[k] ? block.videos[k].currentTime : 0);
    },

    // show method k, resuming from time t so zooming never loses your place
    load(k, t) {
      this.k = k;
      const src = this.block.videos[k] ? this.block.videos[k].currentSrc || this.block.videos[k].src : '';
      const method = this.block.methods[k];
      const scene = this.block.scenes[this.block.current];
      this.caption.innerHTML = `<strong>${method.label}</strong>`
        + (method.cls === 'ours' ? ' <em>(Ours)</em>' : '')
        + (scene ? ` &middot; ${scene.label}` : '');
      this.el.querySelector('.lb-frame').classList.toggle('is-ours', method.cls === 'ours');

      if (!src) { this.video.removeAttribute('src'); this.video.load(); return; }
      this.video.src = src;
      this.video.addEventListener('loadedmetadata', () => {
        this.video.currentTime = Math.min(t || 0, this.video.duration || 0);
        this.video.play().catch(() => {});
      }, { once: true });
      this.video.load();
    },

    // left/right across methods, keeping the same timestamp for a fair read
    step(d) {
      const n = this.block.methods.length;
      const t = this.video.currentTime;
      let k = this.k;
      for (let i = 0; i < n; i++) {
        k = (k + d + n) % n;
        if (this.block.videos[k] && this.block.videos[k].src) break;
      }
      if (k !== this.k) this.load(k, t);
    },

    close() {
      if (!this.el || this.el.hidden) return;
      // hand the zoomed timestamp back to the grid, then restore playback state
      const t = this.video.currentTime;
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      this.el.hidden = true;
      document.body.classList.remove('lb-open');
      if (this.solo) {
        this.solo.currentTime = this.solo.duration ? t % this.solo.duration : t;
        if (this.soloWasPlaying) this.solo.play().catch(() => {});
        this.solo = null;
      }
      if (this.block) {
        this.block.videos.forEach(v => {
          if (v.src) v.currentTime = v.duration ? t % v.duration : t;
        });
        this.block.updateLabel();
        if (this.wasPlaying && !this.block.playing) this.block.toggle();
      }
    },
  };

  /* ---------- boot ---------- */
  fetch('./scenes.json')
    .then(r => { if (!r.ok) throw new Error(`scenes.json: HTTP ${r.status}`); return r.json(); })
    .then(data => {
      const g = data.groups;
      // benchmark = the three MoRSe-5K settings, tagged so each card shows which split it came from
      const benchmark = [
        ...(g.static || []).map(s => ({ ...s, setting: 'static' })),
        ...(g['dynamic-static'] || []).map(s => ({ ...s, setting: 'dynamic-static' })),
        ...(g.dynamic || []).map(s => ({ ...s, setting: 'dynamic' })),
      ];
      const byGroup = { benchmark, open: g.open || [] };
      document.querySelectorAll('.viz-shell').forEach(el => {
        const scenes = byGroup[el.dataset.group] || [];
        if (scenes.length) new VizBlock(el, data.methods, scenes);
        else el.innerHTML = '<div class="viz-empty">No sequences available.</div>';
      });
    })
    .catch(err => {
      console.error(err);
      document.querySelectorAll('.viz-shell').forEach(el => {
        el.innerHTML = `<div class="viz-empty">Could not load sequences — serve this page over HTTP (e.g. <code>python3 -m http.server</code>).</div>`;
      });
    });

  /* ---------- hero reel: pause + seek + zoom ---------- */
  (() => {
    const v = document.getElementById('heroVideo');
    const play = document.getElementById('heroPlay');
    const zoom = document.getElementById('heroZoom');
    if (!v) return;

    const PAUSE = '\u2759\u2759', PLAY = '\u25B6';
    const paint = () => {
      if (!play) return;
      play.innerHTML = v.paused ? PLAY : PAUSE;
      play.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
      play.title = v.paused ? 'Play' : 'Pause';
    };
    play?.addEventListener('click', () => { v.paused ? v.play().catch(() => {}) : v.pause(); });
    v.addEventListener('play', paint);
    v.addEventListener('pause', paint);
    paint();

    const seek = document.getElementById('heroSeek');
    const time = document.getElementById('heroTime');
    if (seek && time) {
      const fmt = s => {
        s = Math.max(0, Math.floor(s || 0));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      };
      let scrubbing = false;
      const paintTime = () => {
        if (!Number.isFinite(v.duration) || !v.duration) return;
        if (!scrubbing) seek.value = Math.round((v.currentTime / v.duration) * 1000);
        time.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
      };
      seek.addEventListener('input', () => {
        if (!Number.isFinite(v.duration) || !v.duration) return;
        scrubbing = true;
        v.currentTime = (seek.value / 1000) * v.duration;
        time.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
      });
      seek.addEventListener('change', () => { scrubbing = false; });
      ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked', 'play', 'pause']
        .forEach(ev => v.addEventListener(ev, paintTime));
      paintTime();
    }

    zoom?.addEventListener('click', () =>
      Lightbox.openSolo(v, '<strong>MoRSe</strong> &middot; Moving Region Segmentation'));
  })();

  /* ---------- bibtex copy ---------- */
  const copyBtn = document.getElementById('copyBibtex');
  copyBtn?.addEventListener('click', async () => {
    const text = document.getElementById('bibtexCode').textContent;
    const span = copyBtn.querySelector('span');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {}
      ta.remove();
    }
    span.textContent = 'Copied';
    setTimeout(() => { span.textContent = 'Copy'; }, 1600);
  });

  /* ---------- back to top ---------- */
  const toTop = document.getElementById('toTop');
  if (toTop) {
    addEventListener('scroll', () => toTop.classList.toggle('visible', scrollY > 600), { passive: true });
    toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  }
})();
