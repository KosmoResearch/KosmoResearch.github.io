import {vertex,fragment} from './fast-shader.mjs?v=4';
import {installControls} from '../controls.mjs?v=20261029-vvc-close';
import {playbackTime} from './playback-clock.mjs';
import {createProjectedRenderer} from './fast-projection.mjs?v=1';
const $=s=>document.querySelector(s);
export async function startFast(q){
 const canvas=$('canvas'),status=$('#status');
 const probe=window.probe={ready:false,errors:[],frames:[],sortMs:[],gpuMs:[],centerSyncMs:[],backend:'webgl2',optimized:true,quality:q.get('quality'),sampled:false,playing:q.get('paused')!=='1'};
 const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,powerPreference:'high-performance'});
 if(!gl)throw Error('WebGL2 is unavailable. Enable browser hardware acceleration.');
 const renderer=gl.getExtension('WEBGL_debug_renderer_info');probe.renderer=gl.getParameter(renderer?.UNMASKED_RENDERER_WEBGL||gl.RENDERER);
 const program=gl.createProgram();
 for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(program,s);}
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.ONE_MINUS_DST_ALPHA,gl.ONE,gl.ONE_MINUS_DST_ALPHA,gl.ONE);gl.clearColor(0,0,0,0);
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);
 const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);const r=Math.sqrt(Math.log(255));gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-r,-r,r,-r,-r,r,r,r]),gl.STATIC_DRAW);
 const a=gl.getAttribLocation(program,'corner');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 const indices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,indices);gl.bufferData(gl.ARRAY_BUFFER,4,gl.DYNAMIC_DRAW);
 const ai=gl.getAttribLocation(program,'index');gl.enableVertexAttribArray(ai);gl.vertexAttribIPointer(ai,1,gl.UNSIGNED_INT,0,0);gl.vertexAttribDivisor(ai,1);
 const u=Object.fromEntries(['view','viewport','focal','clockTime','splats'].map(k=>[k,gl.getUniformLocation(program,k)]));
 gl.uniform1i(u.splats,0);gl.uniform1f(gl.getUniformLocation(program,'classic'),q.get('quality')==='full'?1:0);
 const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
 let projected=null;probe.pipeline='direct';
 if(q.get('pipeline')==='projected'){
  try{projected=createProjectedRenderer(gl,indices,quad);probe.pipeline='projected';}
  catch(e){probe.projectionFallback=e.message;console.warn('Projection cache unavailable; using direct rendering',e);}
 }
 const gpuTimer=q.has('profile')?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null,pendingGpu=[];
 const models=(await(await fetch(new URL('./models.json', import.meta.url))).json()).filter(model=>model.id!=='demo_gfm').sort((a,b)=>Number(b.id.startsWith('vvc'))-Number(a.id.startsWith('vvc')));for(const m of models)$('#models').add(new Option(m.name,m.id));
 const model=models.find(m=>m.id===(q.get('model')||'vvc_001_1_seq0'))||models.find(m=>m.id==='vvc_001_1_seq0')||models[0];
 if(!model)throw Error('No scenes are available.');
 if(!model.cache)throw Error('模型「'+(model.name||model.id)+'」has no optimized scene cache.');
 $('#models').value=model.id;
window.setActiveScene?.(model.id);
 if(q.get('model')!==model.id){q.set('model',model.id);history.replaceState(null,'','?'+q+location.hash);}
 probe.model=model.id;probe.localFile=model.file||model.id;
 $('#scene-name').textContent=model.file||model.name||model.id;
 document.title=(model.file||model.id)+' · Local 4D';
 $('#clip-duration').disabled=true;$('#clip-duration').title='This scene contains 5 seconds of motion.';
 if(model.originalAvailable===false){$('#backend option[value=webgpu]').disabled=true;$('#open-file').hidden=true;}
 $('#backend').value='webgl2';$('#quality').value=q.get('quality')||'auto';$('#temporal').checked=true;$('#temporal').disabled=true;$('#correct').checked=true;$('#correct').disabled=true;
 $('#load').onclick=()=>{const params=new URLSearchParams(location.search);params.set('model',$('#models').value);params.set('quality',$('#quality').value);params.set('backend',$('#backend').value);params.set('engine',$('#backend').value==='webgpu'?'legacy':'fast');if(params.get('model')!==model.id){params.set('rate','1');params.delete('roll');params.set('camera','0');params.set('time','0');location.href='?'+params;}else location.search=params;};
 $('#open-file').onclick=()=>{const params=new URLSearchParams(location.search);params.set('engine','legacy');params.set('quality','full');location.search=params;};
 const worker=new Worker(new URL('./fast-worker.mjs?v=20261028-static', import.meta.url),{type:'module'});
 const pc=await import('./playcanvas.mjs');
 let controls,cam,t=Number(q.get('time')||0),playing=q.get('paused')!=='1',epoch=performance.now(),timeAtPlay=t,last=0,lastSort=0,busy=false,count=0,generation=0,expected=0,meta;
 let drawInvalidated=true,lastDrawView=null;
 let requestedView=null,requestedTime=-Infinity,requestedBudget=0,requestedWidth=0,requestedGeneration=-1;
 const fullDetail=q.get('quality')==='full';
 let pixelBudget=fullDetail?Infinity:q.get('quality')==='low'?350000:700000,lodBudget=q.get('quality')==='full'?Infinity:q.get('quality')==='low'?220000:q.get('quality')==='balanced'?650000:450000;
 const auto=q.get('quality')==='auto';let qualityLast=0,drawMs=[],lastUI=0,firstDraw=false;
 const resize=()=>{drawInvalidated=true;const scale=fullDetail?1:Math.min(1,Math.sqrt(pixelBudget/(canvas.clientWidth*canvas.clientHeight)),1280/Math.max(canvas.clientWidth,canvas.clientHeight));canvas.width=Math.max(1,Math.round(canvas.clientWidth*scale));canvas.height=Math.max(1,Math.round(canvas.clientHeight*scale));gl.viewport(0,0,canvas.width,canvas.height);probe.renderScale=scale;probe.resolution=[canvas.width,canvas.height];};resize();window.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);
 const seek=value=>{t=Math.max(0,Math.min(5,value));playing=false;probe.playing=false;drawInvalidated=true;generation++;$('#play').textContent='Play';$('#clock').textContent=t.toFixed(2)+'s';lastSort=-Infinity;};
 $('#time').oninput=()=>seek(Number($('#time').value));$('#time').min=0;$('#time').max=5;
 $('#play').onclick=()=>{playing=!playing;probe.playing=playing;drawInvalidated=true;last=0;epoch=performance.now();timeAtPlay=t;$('#play').textContent=playing?'Pause':'Play';};$('#play').textContent=playing?'Pause':'Play';
 window.setTime=seek;window.setPlaying=value=>{playing=value;probe.playing=playing;drawInvalidated=true;last=0;epoch=performance.now();timeAtPlay=t;$('#play').textContent=playing?'Pause':'Play';};
 let rate=Number(q.get('rate')||1);if(![.25,.5,.75,1].includes(rate))rate=1;
 $('#speed').value=String(rate);probe.playbackRate=rate;
 const setRate=value=>{const now=performance.now();if(playing)t=playbackTime(timeAtPlay,epoch,now,rate);rate=Number(value);if(![.25,.5,.75,1].includes(rate))rate=1;epoch=now;timeAtPlay=t;probe.playbackRate=rate;$('#speed').value=String(rate);q.set('rate',String(rate));history.replaceState(null,'','?'+q+location.hash);};
 $('#speed').onchange=e=>setRate(e.target.value);window.setPlaybackRate=setRate;
 const start=performance.now();
 const sort=now=>{if(busy||!controls)return;busy=true;expected=generation;lastSort=now;const state=controls.getState();
 if(requestedView&&Math.abs(t-requestedTime)<.02&&requestedBudget===lodBudget&&requestedWidth===canvas.width&&requestedGeneration===generation&&state.view.every((v,i)=>Math.abs(v-requestedView[i])<1e-5)){busy=false;return;}
 requestedView=state.view;requestedTime=t;requestedBudget=lodBudget;requestedWidth=canvas.width;requestedGeneration=generation;
 worker.postMessage({type:'sort',view:state.view,time:t,fx:cam.fx*canvas.height/cam.height,fy:cam.fy*canvas.height/cam.height,width:canvas.width,height:canvas.height,budget:lodBudget,generation});};
 worker.onerror=e=>{probe.errors.push(e.message);status.textContent='Worker failed: '+e.message;};
 worker.onmessage=({data:m})=>{
  if(m.type==='error'){probe.errors.push(m.message);status.textContent=m.message;return;}
  if(m.type==='progress'){status.textContent=m.message||`Loading scene ${Math.round(m.received/m.size*100)}% · ${(m.received/1e6).toFixed(0)} / ${(m.size/1e6).toFixed(0)} MB`;return;}
  if(m.type==='model'){
   meta=m.meta;probe.originalCount=meta.originalCount;probe.count=meta.count;probe.capacity=meta.count;probe.loadMs=performance.now()-start;probe.bytes=meta.count*48;
   if(m.width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||m.height>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('This device does not support the required texture size.');
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32UI,m.width,m.height,0,gl.RGBA_INTEGER,gl.UNSIGNED_INT,m.texture);
   const modelRoll=Number.isFinite(model.roll)?model.roll:-90,angle=Number(q.has('roll')?q.get('roll'):modelRoll)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
   const cameras=meta.cameras.map(cam=>({...cam,...(Math.abs(c)<1e-6?{width:cam.height,height:cam.width,fx:cam.fy,fy:cam.fx}:{}),rotation:cam.rotation.map(([x,y,z])=>[x*c+y*s,-x*s+y*c,z])}));
   cam=cameras[Number(q.get('camera')||0)]||cameras[0];
   const entity=new pc.Entity('camera');const data={n:m.centers.length/3,centers:m.centers,meta:{...meta,cameras,sceneId:model.id}};
   controls=installControls(pc,canvas,entity,data,next=>{cam=next;});window.controls=controls;window.probeCamera=entity;probe.camera=cam;
   status.textContent='Preparing the first frame…';epoch=performance.now();timeAtPlay=t;sort(performance.now());return;
  }
  if(m.type==='order'){
   busy=false;
   if(m.generation===generation){gl.bindBuffer(gl.ARRAY_BUFFER,indices);gl.bufferData(gl.ARRAY_BUFFER,m.indices.subarray(0,m.count),gl.DYNAMIC_DRAW);count=m.count;drawInvalidated=true;probe.activeCount=count;probe.visibleCount=m.visible;probe.sampled=count<m.visible;probe.sortTime=m.time;probe.sortMs.push(m.sortMs);if(probe.sortMs.length>300)probe.sortMs.shift();probe.ready=true;}
   worker.postMessage({type:'recycle',buffer:m.indices.buffer},[m.indices.buffer]);
  }
 };
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();probe.errors.push('WebGL context lost. Reload the player.');});
 worker.postMessage({type:'load',manifest:model.cache});
 function frame(now){
  requestAnimationFrame(frame);
  if(gpuTimer){while(pendingGpu.length&&gl.getQueryParameter(pendingGpu[0],gl.QUERY_RESULT_AVAILABLE)){const query=pendingGpu.shift();if(!gl.getParameter(gpuTimer.GPU_DISJOINT_EXT)){probe.gpuMs.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);if(probe.gpuMs.length>600)probe.gpuMs.shift();}gl.deleteQuery(query);}}
  if(!controls)return;
  if(playing)t=playbackTime(timeAtPlay,epoch,now,rate);
  const delta=last?Math.min(.1,(now-last)/1000):.016;controls.update(delta);
  probe.time=t;probe.playbackWallTime=now;probe.playing=playing;probe.lodBudget=lodBudget;probe.pixelBudget=pixelBudget;probe.playbackRate=rate;
  if(probe.ready){
   const stateView=controls.getState().view;
   const cameraChanged=!lastDrawView||stateView.some((v,i)=>Math.abs(v-lastDrawView[i])>=1e-8);
   if(drawInvalidated||cameraChanged){
    drawInvalidated=false;lastDrawView=stateView;
    if(last&&playing){probe.frames.push(now-last);drawMs.push(now-last);if(probe.frames.length>600)probe.frames.shift();if(drawMs.length>120)drawMs.shift();}last=now;
    // The visible set, depth order, positions and opacity must describe ONE instant.
    // Advancing only the shader clock reuses an old lifetime-filtered set, dropping
    // newly active short-lived hand/face splats and blending them in an old order.
    const renderTime=probe.sortTime;
    const focal=[cam.fx*canvas.height/cam.height,cam.fy*canvas.height/cam.height],viewport=[canvas.width,canvas.height];
    const gpuQuery=gpuTimer&&pendingGpu.length<8?gl.createQuery():null;
    if(gpuQuery)gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT,gpuQuery);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if(projected){
     try{projected.draw({view:stateView,viewport,focal,time:renderTime,classic:fullDetail?1:0,count});probe.projectionBytes=projected.bytes;}
     catch(e){probe.projectionFallback=e.message;console.warn('Projection cache failed; using direct rendering',e);projected.dispose();projected=null;probe.pipeline='direct';gl.disable(gl.RASTERIZER_DISCARD);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.clear(gl.COLOR_BUFFER_BIT);}
    }
    if(!projected){gl.useProgram(program);gl.bindVertexArray(vao);gl.uniformMatrix4fv(u.view,false,stateView);gl.uniform2fv(u.viewport,viewport);gl.uniform2fv(u.focal,focal);gl.uniform1f(u.clockTime,renderTime);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,count);}
    if(gpuQuery){gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);pendingGpu.push(gpuQuery);}

    probe.renderTime=renderTime;probe.renderedFrames=(probe.renderedFrames||0)+1;
    if(!firstDraw){firstDraw=true;probe.firstFrameMs=performance.now()-start;}
   }
   if(now-qualityLast>2000&&drawMs.length>40){
    qualityLast=now;const avg=drawMs.reduce((a,b)=>a+b,0)/drawMs.length;
    if(auto&&playing&&avg>38){lodBudget=Math.max(160000,Math.round(lodBudget*.8));pixelBudget=Math.max(300000,pixelBudget*.85);resize();}
    else if(auto&&playing&&avg<22&&lodBudget<650000){lodBudget=Math.min(650000,Math.round(lodBudget*1.1));pixelBudget=Math.min(900000,pixelBudget*1.05);resize();}
   }
   if(now-lastUI>250){lastUI=now;$('#time').value=t;$('#clock').textContent=t.toFixed(2)+'s';const f=probe.frames.slice(-120),sorted=[...f].sort((a,b)=>a-b),mean=f.reduce((a,b)=>a+b,0)/f.length;
    probe.frameAge=Math.abs(t-probe.renderTime)>2.5?Math.abs(t-probe.renderTime)-5:t-probe.renderTime;
    status.textContent=`WebGL2 · Worker temporal filtering and sorting · Linear motion\n${(1000/mean).toFixed(1)} draw FPS · P95 ${(sorted[Math.floor(sorted.length*.95)]||0).toFixed(1)} ms · ${canvas.width}×${canvas.height}\nDrawn ${count.toLocaleString()} / visible ${(probe.visibleCount||0).toLocaleString()} / source ${meta.originalCount.toLocaleString()}\nWorker ${(probe.sortMs.at(-1)||0).toFixed(1)} ms · ${auto?'Adaptive detail':fullDetail?'Full detail · native resolution':'Preview detail'} · ${rate}× · loaded ${(probe.loadMs/1000).toFixed(2)}s\n${projected?'Two-stage projection':'Direct projection'} · Synchronized motion\nGPU: ${probe.renderer}`;
   }
  }
  // One outstanding request; do not skip this when a completed frame is reused.
  if(now-lastSort>33)sort(now);
 }

 requestAnimationFrame(frame);
 window.addEventListener('pagehide',()=>worker.terminate(),{once:true});
}
