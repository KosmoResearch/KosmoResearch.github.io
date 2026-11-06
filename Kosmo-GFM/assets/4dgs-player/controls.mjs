import {initialSceneState} from './viewer4d/camera-framing.mjs?v=20261029-vvc-close';
import {getViewMatrix,invert4,translate4,rotate4} from './camera-math.mjs';
// Keep the original viewer's COLMAP camera convention; convert only at the
// PlayCanvas boundary. This preserves pointer directions and key semantics.
export function installControls(pc,canvas,entity,data,onCamera){
 const axes=[[0,-1,0],[0,1,0],[0,0,-1],[0,0,1],[-1,0,0],[1,0,0]];
 const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);},dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const sceneId=data.meta.sceneId||new URLSearchParams(location.search).get('model')||document.querySelector('#models').value;
 const clamp=d=>Math.max(.2,Math.min(200,d)),key='splatv-up:'+sceneId;
 let jump=0;
 let ci=Number(new URLSearchParams(location.search).get('camera')||0);if(!data.meta.cameras[ci])ci=0;
 let cam=data.meta.cameras[ci],view=getViewMatrix(cam),distance=4,up=[0,-1,0],choice=null,zoomAccum=0;
 try{const n=Number.parseInt(localStorage.getItem(key),10);if(n>=0&&n<6)choice=n;}catch{}
 const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 for(let i=0;i<data.n;i++)for(let a=0;a<3;a++){const v=data.centers[i*3+a];if(Number.isFinite(v)){bounds.min[a]=Math.min(bounds.min[a],v);bounds.max[a]=Math.max(bounds.max[a],v);}}
 const sync=()=>{const v=norm([-view[1],-view[5],-view[9]]);let a=0;for(let i=1;i<3;i++)if(Math.abs(v[i])>Math.abs(v[a]))a=i;up=Math.abs(v[a])>.9?[0,1,2].map(i=>i===a?Math.sign(v[a]):0):v;};sync();
 const camUp=()=>[-cam.rotation[0][1],-cam.rotation[1][1],-cam.rotation[2][1]];
 const resolvedUp=()=>choice===null?camUp():axes[choice];
 const apply=()=>{let inv=invert4(view);if(jump){inv=translate4(inv,0,-jump,0);inv=rotate4(inv,-.1*jump,1,0,0);}const m=new pc.Mat4();m.set([inv[0],inv[1],inv[2],0,-inv[4],-inv[5],-inv[6],0,-inv[8],-inv[9],-inv[10],0,inv[12],inv[13],inv[14],1]);entity.setPosition(inv[12],inv[13],inv[14]);entity.setRotation(new pc.Quat().setFromMat4(m));};
 const frame=()=>{const u=norm(resolvedUp()),f0=cam.rotation.map(row=>row[2]);let f=norm(f0.map((x,a)=>x-u[a]*dot(f0,u)));if(Math.hypot(...cross(f,u))<.001)f=norm(cross(u,[u[1],u[2],u[0]]));const right=norm(cross(f,u)),down=cross(f,right),center=bounds.min.map((x,a)=>(x+bounds.max[a])/2);let hr=0,hd=0,hf=0;
  for(let c=0;c<8;c++){const p=center.map((x,a)=>(((c>>a)&1)?bounds.max[a]:bounds.min[a])-x);hr=Math.max(hr,Math.abs(dot(p,right)));hd=Math.max(hd,Math.abs(dot(p,down)));hf=Math.max(hf,Math.abs(dot(p,f)));}
  distance=clamp(Math.max(hr*cam.fx*canvas.clientHeight/cam.height/(canvas.clientWidth/2),hd*cam.fy/cam.height*2)*1.15+hf);const eye=center.map((x,a)=>x-f[a]*distance);view=invert4([...right,0,...down,0,...f,0,...eye,1]);sync();apply();window.probe.up=choice===null?'auto':axes[choice];};
 const orbit=(dx,dy)=>{const inv=invert4(view),axis=[0,4,8].map(i=>inv[i]*up[0]+inv[i+1]*up[1]+inv[i+2]*up[2]);const yaw=-Math.PI*dx/canvas.clientHeight;let pitch=-Math.PI*dy/canvas.clientHeight;const amp=Math.hypot(axis[2],axis[1]),limit=Math.sin(89*Math.PI/180);if(amp>limit){const phi=Math.atan2(axis[2],-axis[1]),b=Math.asin(limit/amp);pitch=Math.max(-b-phi,Math.min(b-phi,pitch));}let next=translate4(inv,0,0,distance);next=rotate4(next,yaw,...axis);next=rotate4(next,pitch,1,0,0);view=invert4(translate4(next,0,0,-distance));apply();};
 const pan=(dx,dy)=>{view=invert4(translate4(invert4(view),-dx*distance/(cam.fx*canvas.clientHeight/cam.height),-dy*distance/(cam.fy*canvas.clientHeight/cam.height),0));apply();};
 const zoom=f=>{const next=clamp(distance*f);view=invert4(translate4(invert4(view),0,0,distance-next));distance=next;apply();};
 const keys=new Set();let carousel=false;
 const select=n=>{ci=(n+data.meta.cameras.length)%data.meta.cameras.length;if(ci===0&&home){restoreHome();return;}cam=data.meta.cameras[ci];view=getViewMatrix(cam);distance=4;sync();onCamera(cam);apply();window.probe.cameraIndex=ci;};
 window.addEventListener('keydown',e=>{if(e.target.isContentEditable||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;keys.add(e.code);carousel=false;document.querySelector('#orbit').checked=false;
  if(e.code==='KeyF'||e.key.toLowerCase()==='f'){if(e.repeat)return;if(e.shiftKey)choice=null;else{const current=norm(resolvedUp()),start=choice??axes.findIndex(v=>dot(v,current)>.9);choice=(start+1)%6;}try{if(choice===null)localStorage.removeItem(key);else localStorage.setItem(key,String(choice));}catch{}frame();}
  if(e.code==='KeyR')frame();if(/^\d$/.test(e.key)&&data.meta.cameras[Number(e.key)])select(Number(e.key));if(['-','_'].includes(e.key))select(ci-1);if(['+','='].includes(e.key))select(ci+1);if(e.code==='KeyP')carousel=true;
  if(e.code==='KeyV')location.hash=JSON.stringify(view.map(x=>Math.round(x*100)/100));if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
 const pointers=new Map();let mode=0,pinch=0,px=0,py=0;
 const anchor=()=>{const[a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);px=(a.x+b.x)/2;py=(a.y+b.y)/2;};
 canvas.tabIndex=0;canvas.style.touchAction='none';canvas.oncontextmenu=e=>e.preventDefault();
 canvas.onpointerdown=e=>{e.preventDefault();canvas.focus({preventScroll:true});carousel=false;document.querySelector('#orbit').checked=false;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)mode=e.pointerType==='mouse'&&(e.button!==0||e.shiftKey||e.ctrlKey||e.metaKey)?2:1;else if(pointers.size===2)anchor();};
 const end=e=>{pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(pointers.size===2)anchor();if(pointers.size===1)mode=1;if(!pointers.size)mode=0;};
 canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onlostpointercapture=end;
 canvas.onpointermove=e=>{const p=pointers.get(e.pointerId);if(!p)return;if(e.pointerType==='mouse'&&!e.buttons){end(e);return;}const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(pointers.size===1)(mode===2?pan:orbit)(dx,dy);else if(pointers.size===2){const[a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y),x=(a.x+b.x)/2,y=(a.y+b.y)/2;pan(x-px,y-py);if(pinch&&d)zoom(pinch/d);pinch=d;px=x;py=y;}};
 canvas.onwheel=e=>{e.preventDefault();carousel=false;const scale=e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1;if(e.shiftKey)pan(-e.deltaX*scale,-e.deltaY*scale);else zoomAccum+=e.deltaY*scale*.001;};
 const home=new URLSearchParams(location.search).has('roll')?null:initialSceneState(sceneId,data.meta.cameras[0]);
 const restoreHome=()=>{if(home){ci=home.cameraIndex;cam={...data.meta.cameras[ci],fx:home.fx,fy:home.fy,width:home.width,height:home.height,position:invert4(home.view).slice(12,15),rotation:[home.view.slice(0,3),home.view.slice(4,7),home.view.slice(8,11)]};view=[...home.view];distance=home.distance;choice=null;}else{ci=0;cam=data.meta.cameras[0];view=getViewMatrix(cam);distance=4;}zoomAccum=0;keys.clear();carousel=false;jump=0;document.querySelector('#orbit').checked=false;sync();onCamera(cam);apply();window.probe.cameraIndex=ci;window.probe.cameraPreset=home?sceneId:null;};
 if(!new URLSearchParams(location.search).has('camera')||new URLSearchParams(location.search).get('camera')==='0')restoreHome();
 if(location.hash){try{const shared=JSON.parse(decodeURIComponent(location.hash.slice(1)));if(Array.isArray(shared)&&shared.length===16&&shared.every(Number.isFinite)){view=shared;sync();}}catch{}}
 apply();return {update(dt){if(zoomAccum){const step=Math.abs(zoomAccum)<1e-4?zoomAccum:zoomAccum*(1-Math.pow(.75,Math.min(100,dt*1000)/16));zoom(Math.exp(step));zoomAccum-=step;}
  const shift=keys.has('ShiftLeft')||keys.has('ShiftRight');let inv=invert4(view),changed=false;const move=(x,y,z)=>{inv=translate4(inv,x,y,z);changed=true;},turn=(v,x,y,z)=>{inv=rotate4(inv,v,x,y,z);changed=true;};
  if(keys.has('ArrowUp')){move(0,shift?-.03:0,shift?0:.1);if(!shift)distance=clamp(distance-.1);}if(keys.has('ArrowDown')){move(0,shift?.03:0,shift?0:-.1);if(!shift)distance=clamp(distance+.1);}if(keys.has('ArrowLeft'))move(-.03,0,0);if(keys.has('ArrowRight'))move(.03,0,0);
  for(const[k,v,x,y,z]of[['KeyA',-.01,0,1,0],['KeyD',.01,0,1,0],['KeyW',.005,1,0,0],['KeyS',-.005,1,0,0],['KeyQ',.01,0,0,1],['KeyE',-.01,0,0,1]])if(keys.has(k))turn(v,x,y,z);
  if(keys.has('BracketLeft')||keys.has('BracketRight')){const f=keys.has('BracketLeft')?1/1.01:1.01;cam={...cam,fx:cam.fx*f,fy:cam.fy*f};onCamera(cam);move(0,0,f<1?.1:-.1);distance=clamp(distance+(f<1?-.1:.1));}
  if(changed){view=invert4(inv);apply();}const step=canvas.clientHeight*.016;if(['KeyJ','KeyK','KeyL','KeyI'].some(k=>keys.has(k)))orbit((keys.has('KeyL')?step:0)-(keys.has('KeyJ')?step:0),(keys.has('KeyK')?step:0)-(keys.has('KeyI')?step:0));if(carousel||document.querySelector('#orbit').checked)orbit(dt*canvas.clientHeight*.03,0);const nextJump=Math.max(0,Math.min(1,jump+(keys.has('Space')?.05:-.05)));if(nextJump!==jump){jump=nextJump;apply();}
 },frame,select,home:restoreHome,setState(state){
  if(!state||!Array.isArray(state.view)||state.view.length!==16||!state.view.every(Number.isFinite))throw Error('Invalid shared camera');
  const index=Number.isInteger(state.cameraIndex)&&data.meta.cameras[state.cameraIndex]?state.cameraIndex:ci;
  ci=index;cam={...data.meta.cameras[ci]};
  for(const k of ['fx','fy','width','height'])if(Number.isFinite(state[k])&&state[k]>0)cam[k]=state[k];
  view=[...state.view];distance=clamp(state.distance||4);choice=state.up===null?null:state.up;zoomAccum=0;keys.clear();carousel=false;jump=state.jump||0;
  sync();onCamera(cam);apply();
 },getState:()=>({view:[...view],distance,up:choice,cameraIndex:ci,fx:cam.fx,fy:cam.fy,width:cam.width,height:cam.height,jump})};
}
