// Website-specific layout only; the renderer and scene pack format stay local.
if (new URLSearchParams(location.search).get('embed') === '1') {
  const $ = id => document.getElementById(id);
  const nav = $('seq-nav');
  const carousel = document.createElement('div');
  carousel.className = 'scene-carousel';
  nav.before(carousel);
  for (const [direction, label, offset] of [['prev', 'Previous scenes', -204], ['next', 'Next scenes', 204]]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `scene-arrow ${direction}`;
    button.setAttribute('aria-label', label);
    button.onclick = () => nav.scrollBy({left: offset, behavior: 'smooth'});
    carousel.append(button);
    if (direction === 'prev') carousel.append(nav);
  }
  nav.addEventListener('wheel', event => {
    if (event.ctrlKey) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? nav.clientWidth : 1;
    const delta = Math.max(-80, Math.min(80, (event.deltaX + event.deltaY) * unit * .8));
    const next = Math.max(0, Math.min(nav.scrollWidth - nav.clientWidth, nav.scrollLeft + delta));
    if (Math.abs(next - nav.scrollLeft) < 1) return;
    event.preventDefault();
    event.stopPropagation();
    nav.scrollLeft = next;
  }, {passive: false});

  const settings = $('settings');
  const playback = document.querySelector('.controls');
  const world = document.querySelector('.world-panel');
  const worldColumn = document.createElement('div');
  worldColumn.className = 'world-column';
  world.before(worldColumn);
  worldColumn.append(world, playback);
  const playbackButtons = document.createElement('div');
  playbackButtons.className = 'playback-buttons';
  const transport = document.createElement('div');
  transport.className = 'playback-transport';
  transport.append($('btn-play'), $('btn-prev'), $('btn-next'));
  playbackButtons.append(transport, $('frame-label'), $('speed'), $('point-count'));
  playback.append($('timeline'), playbackButtons);
  settings.hidden = true;
  document.querySelector('.world-panel').classList.add('panel-collapsed');
  $('btn-settings').hidden = true;
  $('btn-settings').setAttribute('aria-expanded', 'false');
  const tools = document.querySelector('.view-tools');
  tools.append($('btn-fullscreen'));
  const icon = path => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${path}</svg>`;
  $('btn-fullscreen').innerHTML = icon('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>');
  $('btn-fullscreen').setAttribute('aria-label', 'Fullscreen');
  document.querySelector('.pane-title').hidden = true;
  const pointSize = $('point-size');
  pointSize.type = 'number';
  pointSize.setAttribute('aria-label', 'Point size');
  $('timeline').setAttribute('aria-label', 'Current frame');
  // Loading covers the output only. Keep the independent input card blank,
  // and prevent seeking or restarting the previous scene while data changes.
  document.querySelector('.world-viewport').append($('loading'));
  const updateLoading = () => {
    const loading = !$('loading').hidden;
    $('stage').classList.toggle('scene-loading', loading);
    for (const id of ['btn-play', 'btn-prev', 'btn-next', 'timeline', 'speed']) $(id).disabled = loading;
    $('stage').setAttribute('aria-busy', String(loading));
  };
  new MutationObserver(updateLoading).observe($('loading'), {attributes: true, attributeFilter: ['hidden']});
  updateLoading();
  const reportHeight = () => {
    if (!document.fullscreenElement) parent.postMessage({type: 'gfm-dynamic-height', height: Math.ceil($('app').getBoundingClientRect().height)}, location.origin);
  };
  new ResizeObserver(reportHeight).observe($('app'));
  document.addEventListener('fullscreenchange', reportHeight);
  reportHeight();
}
