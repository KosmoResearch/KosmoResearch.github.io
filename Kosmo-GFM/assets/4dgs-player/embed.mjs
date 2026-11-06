import { startFast } from './viewer4d/fast.mjs?v=20261102-vvc-restored';
const $ = selector => document.querySelector(selector);
// The supplied engine updates the button's text on play, pause and seeking.
// Keep an accessible label in sync while CSS draws the shared transport icon.
const updatePlayLabel = () => $('#play').setAttribute('aria-label', $('#play').textContent === 'Pause' ? 'Pause sequence' : 'Play sequence');
new MutationObserver(updatePlayLabel).observe($('#play'), { childList: true, characterData: true, subtree: true });
updatePlayLabel();
const params = new URLSearchParams(location.search);
document.documentElement.classList.toggle('embedded', params.get('embed') === '1');
for (const [key, value] of Object.entries({ engine: 'fast', quality: 'full', backend: 'webgl2', model: 'vvc_001_1_seq0', duration: '5', projection: 'scaled', camera: '0', temporal: '0', rate: '1' })) {
  if (!params.has(key)) params.set(key, value);
}
// This web demo always uses the supplied full-quality path.
params.set('engine', 'fast'); params.set('quality', 'full'); params.set('backend', 'webgl2');
history.replaceState(null, '', '?' + params + location.hash);
const fail = message => {
  $('#loading').hidden = false;
  $('#loading strong').textContent = 'Unable to load the scene';
  $('#loading-detail').textContent = message;
  $('.spinner').hidden = true;
  $('#retry').hidden = false;
};
$('#retry').onclick = () => location.reload();
window.addEventListener('error', event => { if (event.message) fail(event.message); });
window.addEventListener('unhandledrejection', event => fail(event.reason?.message || String(event.reason)));
$('#home').onclick = () => window.controls?.home();
// The engine reloads on scene changes, releasing the previous scene's GPU/worker
// memory and applying the new scene's camera preset and default playback rate.
$('#models').replaceChildren();
$('#models').onchange = () => $('#load').click();
$('#fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (error) { fail(error.message); }
};
document.addEventListener('fullscreenchange', () => { $('#fullscreen').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; });
let hostVisible = true, suspended = false, resumePlayback = false;
function syncVisibility() {
  if (!window.setPlaying) return;
  const visible = hostVisible && !document.hidden;
  if (!visible && !suspended) {
    resumePlayback = window.probe?.playing === true;
    suspended = true;
    window.setPlaying(false);
  } else if (visible && suspended) {
    suspended = false;
    if (resumePlayback) window.setPlaying(true);
  }
}
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'gfm-4dgs-visibility') return;
  hostVisible = event.data.visible === true;
  syncVisibility();
});
document.addEventListener('visibilitychange', syncVisibility);
try {
  await startFast(params);
  const selected = $('#models').value;
  for (const [label, prefix] of [['VVC', 'vvc'], ['4D Lab', '4dlab']]) {
    const group = document.createElement('optgroup');
    group.label = label;
    for (const option of [...$('#models').options]) {
      if (option.value.startsWith(prefix)) group.append(option);
    }
    if (group.children.length) $('#models').append(group);
  }
  $('#models').value = selected;
  $('#models').disabled = false;
  syncVisibility();
} catch (error) { fail(error.message); }
const monitor = setInterval(() => {
  const probe = window.probe;
  if (probe?.errors.length) fail(probe.errors.at(-1));
  else if (probe?.ready && probe.renderTime !== undefined) $('#loading').hidden = true;
  else $('#loading-detail').textContent = $('#status').textContent;
}, 250);
window.addEventListener('pagehide', () => clearInterval(monitor), { once: true });
