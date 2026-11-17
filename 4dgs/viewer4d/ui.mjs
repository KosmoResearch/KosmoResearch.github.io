const $=s=>document.querySelector(s);
const q=new URLSearchParams(location.search);
q.set('engine','fast');q.set('backend','webgl2');
if(!q.has('quality'))q.set('quality','full');
if(!q.has('engine')){q.set('engine','fast');q.set('quality','full');q.set('backend','webgl2');}
if(q.get('engine')==='legacy')q.set('centers','worker');
if(q.get('engine')==='fast')q.set('backend','webgl2');
if(q.get('engine')==='legacy'&&q.get('quality')==='auto')q.set('quality','full');
for(const [key,value] of Object.entries({model:'acs_zhao_solo',backend:'webgpu',quality:'full',duration:'5',projection:'scaled',camera:'0',temporal:'0',rate:'1'}))if(!q.has(key))q.set(key,value);
if(q.get('model')==='demo_gfm'){q.set('model','acs_zhao_solo');q.delete('roll');q.set('camera','0');history.replaceState(null,'','?'+q);}else history.replaceState(null,'','?'+q+location.hash);
let activeScene=q.get('model')||'acs_zhao_solo',sceneChips=[];
const paintScenes=()=>sceneChips.forEach(chip=>chip.dataset.model===activeScene?chip.setAttribute('aria-current','page'):chip.removeAttribute('aria-current'));
window.setActiveScene=id=>{activeScene=id;paintScenes();};
const chooseScene=id=>{
 const params=new URLSearchParams(location.search);
 params.set('model',id);params.set('rate','1');params.delete('roll');params.delete('local');params.delete('duration');params.set('camera','0');params.set('time','0');
 $('#loading').hidden=false;$('#loading .spinner').style.display='';
 $('#loading strong').textContent='Opening dynamic scene';$('#loading-detail').textContent='Switching to '+id;
 location.href='?'+params;
};
const sceneTitle=model=>model.id==='demo_gfm'?'Demo GFM':model.id.startsWith('4dlab_demo')?'Demo '+model.id.slice(10):model.name.split('·')[0].trim();
const groupTitle=id=>id.startsWith('acs_')?'ACS / DYNAMIC CAPTURE':id.startsWith('4dlab')?'4D LAB / DYNAMIC CAPTURE':id.startsWith('vvc')?'VVC / VOLUMETRIC VIDEO':id.startsWith('selfcap_')?'SELFCAP / DYNAMIC CAPTURE':'LOCAL / DYNAMIC SCENE';
const sceneGroup=id=>id.startsWith('acs_')?'acs':id.startsWith('4dlab')?'4dlab':id.startsWith('vvc')?'vvc':id.startsWith('selfcap_')?'selfcap':'default';
const sceneRank=id=>id.startsWith('acs_')?0:id.startsWith('vvc')?1:2;
const videos=await fetch(new URL('../catalog/videos.json',import.meta.url)).then(r=>r.json()).catch(()=>[]);
const videoById=new Map(videos.map(v=>[v.id,v]));
const renderVideos=()=>{
 if(!videos.length)return;
 const group=document.createElement('div');group.className='scene-group';
 const label=document.createElement('span');label.className='scene-group-label';label.textContent='Videos';group.append(label);
 for(const v of videos){
  const chip=document.createElement('button');chip.type='button';chip.className='scene-chip';chip.dataset.model=v.id;
  const number=document.createElement('span');number.className='scene-number';number.textContent='▶';
  const copy=document.createElement('span');copy.className='scene-copy';const name=document.createElement('strong');name.textContent=v.name;
  const info=document.createElement('small');info.textContent='MP4 video · '+(v.size/1e6).toFixed(0)+' MB';copy.append(name,info);
  const arrow=document.createElement('span');arrow.className='scene-arrow';arrow.textContent='↗';chip.append(number,copy,arrow);chip.title=v.name;
  chip.addEventListener('click',()=>{history.replaceState(null,'','?model='+encodeURIComponent(v.id));showVideo(v.id);});group.append(chip);sceneChips.push(chip);
 }
 $('#scene-list').append(group);
};
let videoActive=false;
const showVideo=id=>{
 const v=videoById.get(id);if(!v)return;
 videoActive=true;window.setPlaying?.(false);
 window.setActiveScene(id);
 $('#scene-name').textContent=v.name;$('#scene-group').textContent='VIDEO / DEMO';
 $('#loading').hidden=true;$('#refinement').hidden=true;$('#view').hidden=true;$('#status').style.display='none';
 const player=$('#video-player');player.hidden=false;player.src=v.url;player.play().catch(()=>{});
 const badge=document.querySelector('.stage-badge');badge.textContent='';const dot=document.createElement('span');dot.className='dot';badge.append(dot,'Video playback');
 $('#render-state').textContent='Video playback';$('#fps').textContent='';
 const footer=document.querySelector('footer');if(footer)footer.hidden=true;
 document.title=v.name+' · 4DGS';
};
fetch(new URL('../catalog/models.json',import.meta.url)).then(response=>response.json()).then(entries=>{
 const models=entries.filter(model=>model.id!=='demo_gfm').sort((a,b)=>sceneRank(a.id)-sceneRank(b.id));
 const list=$('#scene-list');$('#scene-count').textContent=(models.length+videos.length)+' available';window.sceneCatalog=models;
 const selected=models.find(m=>m.id===activeScene);if(selected){$('#scene-name').textContent=sceneTitle(selected);$('#scene-group').textContent=groupTitle(selected.id);}
 for(const [key,title] of [['acs','ACS'],['vvc','VVC'],['4dlab','4D Lab'],['selfcap','SelfCap'],['default','Other']]){
  const members=models.filter(model=>sceneGroup(model.id)===key);
  if(!members.length)continue;
  const group=document.createElement('div');group.className='scene-group';
  const label=document.createElement('span');label.className='scene-group-label';label.textContent=title;group.append(label);
  for(const model of members){
   const chip=document.createElement('button');chip.type='button';chip.className='scene-chip';chip.dataset.model=model.id;
   const number=document.createElement('span');number.className='scene-number';number.textContent=String(models.indexOf(model)+1).padStart(2,'0');const copy=document.createElement('span');copy.className='scene-copy';const name=document.createElement('strong');name.textContent=sceneTitle(model);const info=document.createElement('small');info.textContent=(model.cache?'4DGS · 5 s':'Original model')+' · '+(model.size/1e6).toFixed(0)+' MB';copy.append(name,info);const arrow=document.createElement('span');arrow.className='scene-arrow';arrow.textContent='↗';chip.append(number,copy,arrow);chip.title=model.name||model.id;
   chip.addEventListener('click',()=>chooseScene(model.id));group.append(chip);sceneChips.push(chip);
  }
  list.append(group);
 }
 renderVideos();
 paintScenes();$('#scene-search').dispatchEvent(new Event('input'));
 requestAnimationFrame(()=>sceneChips.find(chip=>chip.dataset.model===activeScene)?.scrollIntoView({block:'nearest',inline:'center'}));
}).catch(()=>{});
$('#clip-duration').value=q.get('duration');
$('#settings-toggle').onclick=()=>{$('#settings').hidden=!$('#settings').hidden;$('#settings-toggle').setAttribute('aria-expanded',String(!$('#settings').hidden));};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#settings').hidden=true;$('#settings-toggle').setAttribute('aria-expanded','false');}});
 document.addEventListener('pointerdown',e=>{if(!$('#settings').hidden&&!$('#settings').contains(e.target)&&!$('#settings-toggle').contains(e.target)){$('#settings').hidden=true;$('#settings-toggle').setAttribute('aria-expanded','false');}});
$('#stats-toggle').onclick=()=>{const show=$('#status').style.display!=='block';$('#status').style.display=show?'block':'none';$('#stats-toggle').setAttribute('aria-expanded',String(show));};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#stage').requestFullscreen();}catch(e){$('#status').style.display='block';$('#status').textContent=e.message;}};
$('#home').onclick=()=>{window.controls?.home();history.replaceState(null,'',location.pathname+location.search);};
let toastTimer;const notify=message=>{$('#notification').textContent=message;$('#notification').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#notification').hidden=true,2800);};
$('#share').onclick=async()=>{const url=new URL(location.href);const state=window.controls?.getState();if(state)url.hash=JSON.stringify(state.view);try{await navigator.clipboard.writeText(url.href);notify('Scene and view link copied');}catch{window.prompt('Copy scene and view link',url.href);}};
$('#scene-search').oninput=e=>{const term=e.target.value.trim().toLowerCase();for(const chip of sceneChips)chip.hidden=!(chip.textContent+' '+chip.dataset.model).toLowerCase().includes(term);for(const group of document.querySelectorAll('.scene-group'))group.hidden=![...group.querySelectorAll('.scene-chip')].some(chip=>!chip.hidden);$('#no-scenes').hidden=sceneChips.some(chip=>!chip.hidden);};
$('#clip-duration').onchange=e=>{const seconds=Number(e.target.value);if(!Number.isFinite(seconds)||seconds<=0||seconds>3600){e.target.value=q.get('duration');return;}const params=new URLSearchParams(location.search);params.set('duration',String(seconds));location.search=params;};
let fatalError=false;
const error=message=>{fatalError=true;$('#loading').hidden=false;$('#loading-detail').textContent=message;$('#loading .spinner').style.display='none';$('#load-percent').textContent='!';$('#load-progress').removeAttribute('aria-valuenow');$('#load-progress').setAttribute('aria-valuetext','Unable to load scene');$('#loading strong').textContent='Unable to load scene';$('#loading-hint').hidden=true;$('#settings').hidden=false;};
window.addEventListener('error',e=>{if(e.message)error(e.message);});
window.addEventListener('unhandledrejection',e=>error(e.reason?.message||String(e.reason)));
if(videoById.has(activeScene)){showVideo(activeScene);}else try{
 const {startFast}=await import('./fast.mjs?v=20261117-progress1');await startFast(q);
}catch(e){error(e.message);}
let shown=false,completedAt=0;
$('#refinement-retry').onclick=()=>window.retryFullModel?.();
const updatePlaybackUI=()=>{
 if(videoActive||fatalError)return;
 const p=window.probe;
 if(p?.errors.length){error(p.errors.at(-1));return;}
 const hasFrame=!!(p?.ready||p?.renderedFrames);
 if(p?.fullReady&&!completedAt)completedAt=performance.now();
 $('#loading').hidden=!!(p?.loadError||(completedAt&&performance.now()-completedAt>450));
 $('#loading').classList.toggle('is-preview',hasFrame);
 const percent=p?.fullReady?100:Math.min(99,Math.floor((p?.downloadProgress?.ratio||0)*100));
 $('#load-percent').textContent=percent+'%';
 $('#load-progress-arc').style.strokeDashoffset=String(100-percent);
 $('#load-progress').setAttribute('aria-valuenow',String(percent));
 const label=p?.fullReady?'Ready':p?.loadStage==='full'?(p?.downloadProgress?.ratio>=1?'Preparing scene':'Loading full detail'):'Loading preview';
 $('#loading strong').textContent=label;
 $('#load-progress').setAttribute('aria-valuetext',label+' · '+percent+'%');
 $('#loading-detail').textContent=p?.fullReady?'Full detail ready':hasFrame?'You can explore while loading':p?.downloadProgress?.total?'Opening dynamic scene':$('#status').textContent||'Initializing GPU…';
 $('#loading-hint').hidden=hasFrame;
 if(p?.ready||p?.renderedFrames){
  $('#stage').setAttribute('aria-busy','false');$('#render-state').textContent=p.preview?'Preview · Free view':p.playing===false?'Paused · Free view':'Live rendering · Free view';
  const selected=window.sceneCatalog?.find(m=>m.id===(p.model||activeScene));if(selected){$('#scene-name').textContent=sceneTitle(selected);$('#scene-group').textContent=groupTitle(selected.id);}
  $('#total').textContent=Number($('#time').max).toFixed(2)+'s';
  const frames=p.frames.slice(-60),mean=frames.reduce((a,b)=>a+b,0)/frames.length;
  $('#fps').textContent=p.playing===false?'Paused':mean?`${(1000/mean).toFixed(0)} FPS`:'';
  $('#backend-label').textContent=p.optimized?`${p.backend} · ${(p.activeCount||0).toLocaleString()} drawn · ${p.preview?'Loading preview':p.quality==='auto'?'Adaptive detail':p.sampled?'Preview detail':'Full detail'}`:`${p.backend} · ${p.count.toLocaleString()} Gaussians${p.sampled?' · Sampled preview':' · Full model'}`;
  const refining=p.optimized&&!p.fullReady;
  $('#refinement').hidden=!refining;
  if(refining){
   const ratio=p.downloadProgress?.ratio??(p.loadSize?Math.min(1,(p.loadReceived||0)/p.loadSize):0);
   $('#refinement-label').textContent=p.loadError?'Full detail failed to load · Showing preview':p.loadStage==='full'?'Preview ready · Loading full detail '+Math.floor(ratio*100)+'%':'Preview ready · Improving detail';
   $('#refinement-bar').value=ratio;$('#refinement-retry').hidden=!p.loadError;
  }
  if(!shown){shown=true;document.title=$('#scene-name').textContent+' · 4DGS';}
 }
};
setInterval(updatePlaybackUI,250);
window.addEventListener('render-ready',updatePlaybackUI);
window.addEventListener('load-progress',updatePlaybackUI);
