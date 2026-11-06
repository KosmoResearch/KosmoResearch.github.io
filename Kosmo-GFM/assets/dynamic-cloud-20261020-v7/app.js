import * as THREE from 'three';
import {HISTORY_FRAMES,FADE_FRAMES,trailFragmentShader,trailDrawRange} from './trajectory-window.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js?v=20261104-fine-zoom';

const $ = id => document.getElementById(id);
const DATA_ROOT = new URL("https://huggingface.co/datasets/KosmoResearch/Kosmo-GFM/resolve/a985fdda9d0dcab8ddc90f413fe8f41c94630cc7/website-assets/20261106/dynamic-cloud-20261020-v7/data/", location.href);
const LABELS = {
  'ssdb_handgame':['Studio · Hand game','Captured · hand interaction'],
  'ssdb_crossing':['Studio · Crossing','Captured · crossing and turning'],
  'ssdb_crouch':['Studio · Crouch','Captured · footwork and crouch'],
  'ssdb_duet':['Studio · Duet','Captured · multi-view'],
  'ssdb_solo':['Studio · Solo','Captured · multi-view'],
  'horsejump-high':['Horse jump','Articulated motion'], 'dog':['Dog','Non-rigid motion'],
  'car-roundabout':['Roundabout','Object & camera motion'], 'bike-packing':['Bike packing','Multiple objects'],
  'blackswan':['Black swan','Smooth motion'],
  'parkour':['Parkour','Articulated motion'], 'rollerblade':['Rollerblade','Fast motion'],
  'drift-chicane':['Drift chicane','Object & camera motion'], 'hockey':['Hockey','Fast articulated motion'],
  'breakdance':['Breakdance','Non-rigid motion'], 'horsejump-low':['Horse jump · low','Articulated motion'],
  'train':['Train','Large object motion'],
};
const state = {cur:null, manifest:null, index:0, frame:0, playing:false, trackIds:[], visible:true, speed:.5, dirty:true, reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embedded');
let loadToken = 0, worker = null, loadAbort = null, resizeRgb = () => {}, toastTimer;
const c2 = $('canvas-2d'), ctx = c2.getContext('2d');
let renderer;
try {renderer = new THREE.WebGLRenderer({canvas:$('canvas-3d'),antialias:true,alpha:false,powerPreference:'high-performance'});}
catch(error) {$('loading-text').textContent='3D rendering is unavailable'; $('loading-detail').textContent='Enable WebGL in your browser to explore the scene.'; throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x151b28,1);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45,1,.001,100);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .09;
controls.zoomSpeed = .5;
controls.addEventListener('change',()=>{state.dirty=true;});
const root = new THREE.Group(); scene.add(root);
let cloud = null, objectCloud = null, skyCloud = null, cameraPath = null, trailMesh = null, framePlane = null;
const trailUniforms = {frame:{value:0},history:{value:HISTORY_FRAMES},fade:{value:FADE_FRAMES}};
const trailMaterial = new THREE.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,uniforms:trailUniforms,
  vertexShader:`attribute vec3 color;attribute float time;varying vec3 vColor;varying float vTime;
    void main(){vColor=color;vTime=time;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:trailFragmentShader});
const world = document.querySelector('.world-viewport');
new ResizeObserver(()=>{const w=world.clientWidth,h=world.clientHeight;if(w<2||h<2)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();state.dirty=true;}).observe(world);
new ResizeObserver(()=>resizeRgb()).observe($('rgb-wrap'));

function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2200);}
function clearScene(){
  while(root.children.length){const obj=root.children[0];root.remove(obj);obj.geometry?.dispose();if(obj.material!==trailMaterial){obj.material?.map?.dispose();obj.material?.dispose();}}
  cloud=objectCloud=skyCloud=cameraPath=trailMesh=framePlane=null;
  if(state.cur)for(const image of state.cur.frames)image?.close?.();
}
function trackBounds(){const c=state.cur,b=c.meta.frameFocusBounds?.[state.frame]||c.meta.focusBounds;return {center:new THREE.Vector3(...b.center),radius:b.radius};}
function resetView(focus=false){
  const c=state.cur;if(!c)return;
  // Reset frames the subject's motion region, not the much larger background.
  // Focus keeps its tighter, current-frame framing where available.
  const b=focus?trackBounds():{center:new THREE.Vector3(...c.meta.focusBounds.center),radius:c.meta.focusBounds.radius};
  const r=b.radius,sceneRadius=Math.max(c.bounds.radius,r);
  controls.target.copy(b.center);
  const direction=c.meta.frameFocusBounds?new THREE.Vector3().setFromMatrixPosition(cameraToWorld(state.frame)).sub(b.center).normalize():new THREE.Vector3(.35,.5,1.15).normalize();
  const verticalHalfFov=THREE.MathUtils.degToRad(camera.getEffectiveFOV()/2);
  const horizontalHalfFov=Math.atan(Math.tan(verticalHalfFov)*camera.aspect);
  const distance=r/Math.sin(Math.min(verticalHalfFov,horizontalHalfFov))*1.05;
  camera.position.copy(b.center).addScaledVector(direction,distance);
  camera.near=Math.max(r/1000,1e-6);camera.far=Math.max(sceneRadius*150,(c.meta.dense_reconstruction?.sky_depth||0)*5);
  camera.updateProjectionMatrix();controls.minDistance=r*.1;controls.maxDistance=sceneRadius*40;controls.update();state.dirty=true;
}
function cameraToWorld(t){const c=state.cur;const e=new THREE.Matrix4().fromArray(c.w2c.slice(t*16,t*16+16)).transpose().invert();const flip=new THREE.Matrix4().makeScale(1,-1,-1);return flip.clone().multiply(e).multiply(flip);}
const linearRgb = Float32Array.from({length:256},(_,i)=>{const x=i/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
function densePoints(xyz,rgb,size,spacing,roundPoints=false){
  const color=new Float32Array(rgb.length);for(let i=0;i<rgb.length;i++)color[i]=linearRgb[rgb[i]];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(xyz,3));g.setAttribute('color',new THREE.BufferAttribute(color,3));
  const material=new THREE.PointsMaterial({size:size*spacing,sizeAttenuation:true,vertexColors:true,depthWrite:true});
  // Physical point spacing gives depth cues; clamp prevents oversized near splats.
  material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>').replace('#include <logdepthbuf_vertex>', 'gl_PointSize=clamp(gl_PointSize,.65,6.0);\n#include <logdepthbuf_vertex>');};
  if(roundPoints){
    const baseCompile=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{
      baseCompile(shader);
      shader.vertexShader=shader.vertexShader.replace('clamp(gl_PointSize,.65,6.0)','clamp(gl_PointSize,.65,5.0)');
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif(length(gl_PointCoord-vec2(.5))>.5) discard;');
    };
    material.customProgramCacheKey=()=> 'current-object-round-v1';
  }
  const points=new THREE.Points(g,material);points.userData.spacing=spacing;
  points.scale.set(1,-1,-1);points.frustumCulled=false;return points;
}
function buildWorld(){
  const c=state.cur;
  const size=Number($('point-size').value);
  if(c.dense){
    const d=c.dense;
    const spacing=c.meta.dense_reconstruction.voxel_size*1.6;
    cloud=densePoints(d.static_xyz.data,d.static_rgb.data,size,spacing);
    c.objectPitch=c.meta.objectPitch;
    objectCloud=densePoints(d.dynamic_xyz.data,d.dynamic_rgb.data,size*1.25,c.objectPitch*(c.meta.dynamic_rendering?.point_spacing_factor||3.2),!!c.meta.dynamic_rendering?.round_points);
    $('cloud-summary').dataset.objectPointPitch=String(c.objectPitch);
    objectCloud.geometry.setDrawRange(0,0);root.add(cloud,objectCloud);
    if(d.sky_xyz){
      skyCloud=densePoints(d.sky_xyz.data,d.sky_rgb.data,1,1);
      skyCloud.material.dispose();skyCloud.material=new THREE.PointsMaterial({size:2.2,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.26,depthWrite:false});
      skyCloud.renderOrder=-1;skyCloud.geometry.setDrawRange(0,0);root.add(skyCloud);
    }
  }
  c.bounds={center:new THREE.Vector3(...c.meta.defaultBounds.center),radius:c.meta.defaultBounds.radius};
  const path=[];for(let t=1;t<c.T;t++){const a=new THREE.Vector3().setFromMatrixPosition(cameraToWorld(t-1)),b=new THREE.Vector3().setFromMatrixPosition(cameraToWorld(t));path.push(...a.toArray(),...b.toArray());}
  cameraPath=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(path,3)),new THREE.LineBasicMaterial({color:0x7498d4,transparent:true,opacity:.5}));root.add(cameraPath);
  const planeCanvas=document.createElement('canvas');planeCanvas.width=c.W;planeCanvas.height=c.H;c.planeCanvas=planeCanvas;c.planeCtx=planeCanvas.getContext('2d');
  const texture=new THREE.CanvasTexture(planeCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  framePlane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,opacity:.65}));framePlane.matrixAutoUpdate=false;root.add(framePlane);
  applyToggles();
}
function applyToggles(){if(trailMesh)trailMesh.visible=$('show-trails').checked;if(skyCloud)skyCloud.visible=$('show-cloud').checked&&$('show-sky').checked;if(cloud)cloud.visible=$('show-cloud').checked;if(objectCloud)objectCloud.visible=$('show-objects').checked;if(cameraPath)cameraPath.visible=$('show-cameras').checked;if(framePlane)framePlane.visible=$('show-cameras').checked;state.dirty=true;}
function buildTrails(){
  if(trailMesh){root.remove(trailMesh);trailMesh.geometry.dispose();trailMesh=null;}
  const c=state.cur;if(!c)return;const data={position:c.dense.trail_position.data,color:c.dense.trail_color.data,time:c.dense.trail_time.data,counts:c.dense.trail_frame_counts.data},g=new THREE.BufferGeometry();
  for(const [name,array,n] of [['position',data.position,3],['color',data.color,3],['time',data.time,1]])g.setAttribute(name,new THREE.BufferAttribute(array,n));
  c.trailFrameCounts=data.counts;g.setDrawRange(0,0);trailMesh=new THREE.LineSegments(g,trailMaterial);trailMesh.frustumCulled=false;root.add(trailMesh);
  applyToggles();$('point-count').textContent=`${state.trackIds.length.toLocaleString()} tracks`;$('point-count').dataset.trackCount=String(state.trackIds.length);updateFrame();
}
function fixedTracks(){const c=state.cur;if(!c)return;state.trackIds=Array.from({length:c.meta.fixedTrackCount},(_,i)=>i);buildTrails();}
function drawRgb(){const c=state.cur;if(!c)return;ctx.clearRect(0,0,c.W,c.H);ctx.drawImage(c.frames[state.frame],0,0,c.W,c.H);}
function updateFrame(){
  const c=state.cur;if(!c)return;state.dirty=true;const f=state.frame;trailUniforms.frame.value=f;
  if(c.dense&&objectCloud){
    const offsets=c.dense.dynamic_offsets.data,start=offsets[f],count=offsets[f+1]-start;
    if(skyCloud){const skyOffsets=c.dense.sky_offsets.data;skyCloud.geometry.setDrawRange(skyOffsets[f],skyOffsets[f+1]-skyOffsets[f]);$('cloud-summary').dataset.skyCount=String(skyOffsets[f+1]-skyOffsets[f]);}
    // Replacement, never accumulation: this draw range contains one frame only.
    objectCloud.geometry.setDrawRange(start,count);
    const staticCount=$('show-cloud').checked?c.dense.static_xyz.shape[0]:0;
    const dynamicCount=$('show-objects').checked?count:0;
    $('cloud-summary').textContent=`${staticCount.toLocaleString()} static · ${dynamicCount.toLocaleString()} current`;
    $('cloud-summary').dataset.scene=c.name;$('cloud-summary').dataset.voxel=String(c.meta.dense_reconstruction?.voxel_size||0);$('cloud-summary').dataset.frame=String(f);$('cloud-summary').dataset.dynamicStart=String(start);$('cloud-summary').dataset.dynamicCount=String(count);
  }else $('cloud-summary').textContent='';
  drawRgb();if(trailMesh){const range=trailDrawRange(c.trailFrameCounts,f);trailMesh.geometry.setDrawRange(range.start,range.count);const info=$('point-count');info.dataset.visibleSegments=String(range.count/2);info.dataset.trailStart=String(range.start);info.dataset.historyFrames=String(HISTORY_FRAMES);info.dataset.fadeFrames=String(FADE_FRAMES);info.dataset.oldestTrailFrame=String(Math.max(0,f-HISTORY_FRAMES-FADE_FRAMES));}
  if(framePlane&&$('show-cameras').checked){c.planeCtx.drawImage(c.frames[f],0,0,c.W,c.H);framePlane.material.map.needsUpdate=true;const k=c.K.slice(f*9,f*9+9),d=c.bounds.radius*.17;const sx=d*c.Win/k[0],sy=d*c.Hin/k[4];const tx=d*(c.Win/2-k[2])/k[0],ty=-d*(c.Hin/2-k[5])/k[4];const m=new THREE.Matrix4().makeTranslation(tx,ty,-d);m.scale(new THREE.Vector3(sx,sy,1));framePlane.matrix.multiplyMatrices(cameraToWorld(f),m);framePlane.matrixWorldNeedsUpdate=true;}
  $('timeline').value=f;$('frame-label').textContent=`Frame ${f+1} / ${c.T}`;
}
function setFrame(f){if(!state.cur)return;state.frame=Math.max(0,Math.min(state.cur.T-1,f));updateFrame();}
function play(value){state.playing=value&&!!state.cur;$('btn-play').textContent=state.playing?'Ⅱ':'▶';$('btn-play').setAttribute('aria-label',state.playing?'Pause sequence':'Play sequence');if(state.playing&&state.frame===state.cur.T-1)setFrame(0);lastTs=performance.now();clock=state.cur?.times[state.frame]||0;updateFrame();}
function image(url,signal){return fetch(url,{signal}).then(r=>{if(!r.ok)throw Error(`Frame load failed: ${r.status}`);return r.blob();}).then(b=>createImageBitmap(b));}
async function loadFrames(base,names,signal,token,meta){const frames=new Array(names.length);let next=0,done=0;
  if(meta.atlases){
    try{await Promise.all(Array.from({length:3},async()=>{while(next<meta.atlases.length){const atlas=meta.atlases[next++];const bitmap=await image(new URL(atlas.file,base),signal);try{for(let j=0;j<atlas.count;j++){const frame=await createImageBitmap(bitmap,(j%atlas.cols)*meta.atlas_width,Math.floor(j/atlas.cols)*meta.atlas_height,meta.atlas_width,meta.atlas_height);if(signal.aborted){frame.close();throw new DOMException('Aborted','AbortError');}frames[atlas.start+j]=frame;done++;}if(token===loadToken){$('loading-text').textContent=`Preparing video · ${done} / ${names.length}`;$('load-progress').value=75+25*done/names.length;}}finally{bitmap.close();}}}));return frames;}
    catch(error){for(const f of frames)f?.close();throw error;}
  }
  try {await Promise.all(Array.from({length:6},async()=>{while(next<names.length){const i=next++;const frame=await image(new URL('frames/'+names[i],base),signal);if(signal.aborted){frame.close();throw new DOMException('Aborted','AbortError');}frames[i]=frame;done++;if(token===loadToken){$('loading-text').textContent=`Preparing video · ${done} / ${names.length}`;$('load-progress').value=75+25*done/names.length;}}}));return frames;}
  catch(error){for(const f of frames)f?.close();throw error;}
}
async function loadArrays(url,token,signal){return new Promise((resolve,reject)=>{
  const w=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});worker=w;
  const aborted=()=>{w.terminate();reject(new DOMException('Aborted','AbortError'));};signal.addEventListener('abort',aborted,{once:true});
  const finish=()=>{signal.removeEventListener('abort',aborted);w.terminate();};
  w.onmessage=({data})=>{
    if(token!==loadToken){w.terminate();reject(new DOMException('Aborted','AbortError'));return;}
    if(data.error){finish();reject(Error(data.error));}
    else if(data.arrays){finish();resolve({arrays:data.arrays,dense:data.dense,meta:data.meta});}
    else if(data.decoding){$('loading-text').textContent=`Decoding ${data.label}`;}
    else{$('loading-text').textContent=`Loading ${data.label} · ${(data.bytes/1e6).toFixed(1)} MB`;$('load-progress').value=(data.progress||0)*70;}
  };
  w.onerror=e=>{finish();reject(Error(e.message||'Scene decoder unavailable'));};
  w.postMessage({url:String(url)});
});}
async function json(url,signal){const r=await fetch(url,{signal});if(!r.ok)throw Error(`HTTP ${r.status}: ${url}`);return r.json();}
async function loadSequence(index){
  const token=++loadToken;loadAbort?.abort();worker?.terminate();loadAbort=new AbortController();const signal=loadAbort.signal;
  play(false);state.index=index;$('scene-picker').value=String(index);$('loading').hidden=false;$('btn-retry').hidden=true;$('load-progress').value=0;
  const entry=state.manifest.sequences[index],base=new URL(entry.name+'/',DATA_ROOT);$('loading-poster').src=new URL(entry.thumb,DATA_ROOT);$('loading-text').textContent='Loading scene';$('loading-detail').textContent='Precomputed 3D tracks · explore from any viewpoint';
  document.querySelectorAll('.scene-card').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',i===index?'true':'false');if(i===index)b.scrollIntoView({block:'nearest',inline:'nearest'});});
  let frames=null;
  try{const meta=await json(new URL('meta.json',base),signal);
    const jobs=await Promise.allSettled([loadArrays(new URL(entry.render,DATA_ROOT),token,signal),loadFrames(base,meta.frames,signal,token,meta)]);
    const decoded=jobs[0].status==='fulfilled'?jobs[0].value:null;frames=jobs[1].status==='fulfilled'?jobs[1].value:null;
    const failed=jobs.find(x=>x.status==='rejected');if(failed)throw failed.reason;
    if(token!==loadToken){frames.forEach(f=>f.close());return;}
    const {arrays:a,dense,meta:packedMeta}=decoded;
    if(packedMeta.sequence!==entry.name||packedMeta.num_frames!==meta.num_frames)throw Error('Scene metadata mismatch');
    document.body.classList.toggle('studio-input',entry.name.startsWith('ssdb_'));clearScene();const take=k=>a[k].data;state.cur={name:entry.name,T:meta.num_frames,W:meta.width,H:meta.height,Win:meta.query_grid[0],Hin:meta.query_grid[1],w2c:take('pred_w2c'),K:take('pred_K'),frames,meta:packedMeta,dense,times:meta.timestamps?meta.timestamps.map(t=>t-meta.timestamps[0]):Array.from({length:meta.num_frames},(_,i)=>i/(meta.fps||25))};frames=null;
    const c=state.cur;c2.width=c.W;c2.height=c.H;resizeRgb=()=>{const box=$('rgb-wrap'),s=Math.min(box.clientWidth/c.W,box.clientHeight/c.H);c2.style.width="100%";c2.style.height="100%";};resizeRgb();
    state.frame=0;$('btn-focus').textContent=c.meta.frameFocusBounds?'Focus object':'Focus tracks';$('btn-focus').title=c.meta.frameFocusBounds?'Focus current-frame object':'Focus trajectory region';$('timeline').max=c.T-1;$('scene-name').textContent=LABELS[c.name]?.[0]||c.name;$('scene-tag').textContent=LABELS[c.name]?.[1]||'3D motion';buildWorld();fixedTracks();resetView(false);$('loading').hidden=true;
    if(!state.reduced)play(true);else updateFrame();
  }catch(error){frames?.forEach(f=>f.close());if(token!==loadToken||error.name==='AbortError')return;console.error(error);$('loading-text').textContent='This scene could not be loaded';$('loading-detail').textContent=error.message;$('btn-retry').hidden=false;}
}

let lastTs=performance.now(),clock=0;
function tick(ts){requestAnimationFrame(tick);const dt=Math.min((ts-lastTs)/1000,.1);lastTs=ts;if(!state.visible||document.hidden)return;
  if(state.cur&&state.playing){clock+=dt*state.speed;const times=state.cur.times;let f=state.frame;while(f<times.length-1&&times[f+1]<=clock)f++;if(f!==state.frame)setFrame(f);if(clock>times[times.length-1]+.4){clock=times[0];setFrame(0);}}
  controls.update();if(state.dirty){renderer.render(scene,camera);state.dirty=false;}
}requestAnimationFrame(tick);
new IntersectionObserver(entries=>{state.visible=entries[0].isIntersecting;lastTs=performance.now();},{threshold:0}).observe($('stage'));
$('btn-play').onclick=()=>play(!state.playing);$('btn-prev').onclick=()=>{play(false);setFrame(state.frame-1);};$('btn-next').onclick=()=>{play(false);setFrame(state.frame+1);};
$('timeline').oninput=e=>{const frame=Number(e.target.value);play(false);setFrame(frame);};$('speed').onchange=e=>{state.speed=Number(e.target.value);};
$('btn-reset').onclick=()=>resetView(false);$('btn-focus').onclick=()=>resetView(true);
$('btn-settings').onclick=()=>{$('settings').hidden=!$('settings').hidden;$('btn-settings').setAttribute('aria-expanded',$('settings').hidden?'false':'true');$('btn-settings').setAttribute('aria-label',$('settings').hidden?'Expand side panel':'Collapse side panel');document.querySelector('.world-panel').classList.toggle('panel-collapsed',$('settings').hidden);};
for(const id of ['show-cloud','show-objects','show-cameras','show-sky','show-trails'])$(id).onchange=()=>{applyToggles();updateFrame();};
$('point-size').oninput=e=>{if(cloud)cloud.material.size=Number(e.target.value)*(cloud.userData.spacing||1);if(objectCloud)objectCloud.material.size=Number(e.target.value)*1.25*(objectCloud.userData.spacing||1);state.dirty=true;};
$('btn-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.demo').requestFullscreen();}catch{toast('Fullscreen is unavailable in this embed.');}};
$('btn-retry').onclick=()=>loadSequence(state.index);$('scene-picker').onchange=e=>loadSequence(Number(e.target.value));
document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();play(!state.playing);}if(e.code==='ArrowLeft'){play(false);setFrame(state.frame-1);}if(e.code==='ArrowRight'){play(false);setFrame(state.frame+1);}});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();play(false);toast('3D graphics paused. Reload this page to restore the scene.');});
async function init(){try{state.manifest=await json(new URL('manifest.json?v=20261022-crossing-first',DATA_ROOT));for(const [i,entry]of state.manifest.sequences.entries()){const b=document.createElement('button');b.className='scene-card';b.setAttribute('aria-label',LABELS[entry.name]?.[0]||entry.name);const img=document.createElement('img');img.src=new URL(entry.thumb,DATA_ROOT);img.alt='';img.loading='lazy';const span=document.createElement('span');span.textContent=LABELS[entry.name]?.[0]||entry.name;b.append(img,span);b.onclick=()=>{if(state.index!==i)loadSequence(i);};$('seq-nav').append(b);const option=document.createElement('option');option.value=String(i);option.textContent=LABELS[entry.name]?.[0]||entry.name;$('scene-picker').append(option);}const requested=new URLSearchParams(location.search).get('scene');const initial=Math.max(0,state.manifest.sequences.findIndex(s=>s.name===requested));await loadSequence(initial);}catch(error){$('loading-text').textContent='Demo data is not available yet';$('loading-detail').textContent=error.message;$('btn-retry').hidden=false;$('btn-retry').onclick=init;}}
init();
