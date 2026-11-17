import {half} from '../splatv.mjs';
let positions,velocities,times,factors,radii,alpha,moving,persistent,meta,ids,depths,depthBits,tempOrder,scores,persistentStatic,persistentMoving,staticOrder,staticDepths,dynamicOrder,dynamicDepths,cachedView,cachedProjection;
let modelRevision=0;
let orderPool=[],staticVisibleCount=0;
let TEMPORAL_LEAVES=256,t0=0,t1=5;
let temporalNodes,temporalMask,temporalIds,temporalIndexBytes,cachedTemporalLeaf=-1,cachedTemporalCount=0;
const temporalLeaf=time=>Math.max(0,Math.min(TEMPORAL_LEAVES-1,Math.floor((time-t0)*TEMPORAL_LEAVES/(t1-t0))));
function visitTemporalRange(lo,hi,emit){
 // Inclusive endpoints cover every cell touched by the already outward-rounded
 // lifetime. The original per-record time check still decides final visibility.
 let a=TEMPORAL_LEAVES+temporalLeaf(lo),b=TEMPORAL_LEAVES+temporalLeaf(hi);
 while(a<=b){if(a&1)emit(a++);if(!(b&1))emit(b--);a>>=1;b>>=1;}
}
function temporalCandidates(time){
 const leaf=temporalLeaf(time);
 if(leaf!==cachedTemporalLeaf){
  temporalMask.fill(0);
  for(let node=TEMPORAL_LEAVES+leaf;node;node>>=1){
   const list=temporalNodes[node];for(let a=0;a<list.length;a++){const id=list[a];temporalMask[id>>>5]|=1<<(id&31);}
  }
  // Tree traversal order is not record order. Enumerate set bits in ascending ID
  // order to preserve the original stable ordering of equal float32 depths.
  let count=0;
  for(let w=0;w<temporalMask.length;w++){
   let mask=temporalMask[w];while(mask){const bit=31-Math.clz32(mask&-mask);temporalIds[count++]=(w<<5)+bit;mask&=mask-1;}
  }
  cachedTemporalLeaf=leaf;cachedTemporalCount=count;
 }
 return temporalIds.subarray(0,cachedTemporalCount);
}
const boundFloat=new Float32Array(1),boundBits=new Uint32Array(boundFloat.buffer);
function outward(value,up){boundFloat[0]=value;if(up?boundFloat[0]<value:boundFloat[0]>value)boundBits[0]+=((boundFloat[0]>=0)===up)?1:-1;return boundFloat[0];}
const bins=new Uint32Array(65536),starts=new Uint32Array(65536),scoreBins=new Uint32Array(1024);
function initialize(buffer){
 const head=new DataView(buffer),length=head.getUint32(4,true);
 if(head.getUint32(0,true)!==0x4c344753)throw Error('Invalid optimized model');
 const parsed=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,length)));
 if(!Number.isSafeInteger(parsed.count)||parsed.count<1||8+length+parsed.count*48!==buffer.byteLength)throw Error('Invalid optimized model length');
 meta=parsed;modelRevision++;
 [t0,t1]=meta.timeRange||[0,5];
 if(!Number.isFinite(t0)||!Number.isFinite(t1)||t1<=t0)throw Error('Invalid model time range');
 TEMPORAL_LEAVES=t1-t0>6?64:256;
 const n=meta.count,src=new DataView(buffer,8+length);
 positions=new Float32Array(n*3);velocities=new Float32Array(n*3);times=new Float32Array(n*4);factors=new Float32Array(n);radii=new Float32Array(n);alpha=new Float32Array(n);moving=new Uint8Array(n);
 const perRow=n>16000000?4096:1024,width=perRow*3,height=Math.ceil(n/perRow),packed=new Uint32Array(width*height*4),staticIds=[];
 // Explicit uint32 reads work with the variable-length (unaligned) JSON header.
 for(let i=0;i<n;i++){
  const b=i*48,j=i*3,k=i*4;
  for(let w=0;w<12;w++)packed[i*12+w]=src.getUint32(b+w*4,true);
  for(let a=0;a<3;a++)positions[j+a]=src.getFloat32(b+a*4,true);
  velocities[j]=half(src.getUint16(b+28,true));velocities[j+1]=half(src.getUint16(b+30,true));velocities[j+2]=half(src.getUint16(b+32,true));
  times[k]=half(src.getUint16(b+34,true));times[k+1]=half(src.getUint16(b+36,true));times[k+2]=half(src.getUint16(b+38,true));times[k+3]=half(src.getUint16(b+40,true));
  factors[i]=src.getFloat32(b+44,true);alpha[i]=src.getUint8(b+15)/255;moving[i]=(Math.abs(velocities[j])+Math.abs(velocities[j+1])+Math.abs(velocities[j+2]))>1e-6;
  // Precompute both existing temporal and fragment-alpha cutoffs. Bounds are
  // rounded outwards, so a Float32 store cannot remove a boundary splat.
  const cutoff=Math.max(.02,1/(255*alpha[i]));
  const reach=times[k+1]*Math.sqrt(Math.max(0,-2*Math.log(cutoff)));
  times[k+2]=outward(Math.max(t0,times[k+2],times[k]-reach),false);
  times[k+3]=outward(Math.min(t1,times[k+3],times[k]+reach),true);
  radii[i]=3.33*Math.sqrt(3*factors[i])*(1+1e-6);
  const lo=times[k+2],hi=times[k+3];
  if(lo<=t0&&hi>=t1)staticIds.push(i);
 }
 persistent=Uint32Array.from(staticIds);
 // Only exactly stationary, whole-clip records are reusable across time. Moving
 // background records and short-lived stationary records remain in the hot path.
 let stationaryCount=0;
 for(const i of persistent){const j=i*3;if(velocities[j]===0&&velocities[j+1]===0&&velocities[j+2]===0)stationaryCount++;}
 persistentStatic=new Uint32Array(stationaryCount);persistentMoving=new Uint32Array(persistent.length-stationaryCount);
 let stationaryAt=0,movingAt=0;
 for(const i of persistent){const j=i*3;if(velocities[j]===0&&velocities[j+1]===0&&velocities[j+2]===0)persistentStatic[stationaryAt++]=i;else persistentMoving[movingAt++]=i;}
 staticOrder=null;staticDepths=null;staticVisibleCount=0;cachedView=null;cachedProjection=null;orderPool=[];
 // Store each interval in a disjoint set of tree nodes. This avoids copying
 // long-lived records into every fine bucket. Long clips use fewer leaves
 // to bound index memory; every record still gets an exact lifetime check.
 const counts=new Uint32Array(TEMPORAL_LEAVES*2);
 for(let i=0;i<n;i++){
  const k=i*4,lo=times[k+2],hi=times[k+3];
  if(lo<=t0&&hi>=t1||hi<lo)continue;
  visitTemporalRange(lo,hi,node=>counts[node]++);
 }
 temporalNodes=Array.from(counts,c=>new Uint32Array(c));counts.fill(0);
 for(let i=0;i<n;i++){
  const k=i*4,lo=times[k+2],hi=times[k+3];
  if(lo<=t0&&hi>=t1||hi<lo)continue;
  visitTemporalRange(lo,hi,node=>temporalNodes[node][counts[node]++]=i);
 }
 let maxCandidates=0;
 for(let leaf=TEMPORAL_LEAVES;leaf<TEMPORAL_LEAVES*2;leaf++){
  let count=0;for(let node=leaf;node;node>>=1)count+=temporalNodes[node].length;
  maxCandidates=Math.max(maxCandidates,count);
 }
 temporalMask=new Uint32Array(Math.ceil(n/32));temporalIds=new Uint32Array(maxCandidates);
 temporalIndexBytes=temporalNodes.reduce((sum,list)=>sum+list.byteLength,temporalMask.byteLength+temporalIds.byteLength);
 cachedTemporalLeaf=-1;cachedTemporalCount=0;
 const cap=persistent.length+maxCandidates;ids=new Uint32Array(cap);depths=new Float32Array(cap);depthBits=new Uint32Array(depths.buffer);tempOrder=new Uint32Array(cap);scores=new Uint16Array(cap);const dynamicCap=persistentMoving.length+maxCandidates;dynamicOrder=new Uint32Array(dynamicCap);dynamicDepths=new Float32Array(dynamicCap);
 const sample=new Float32Array(Math.min(8192,n)*3);for(let i=0;i<sample.length/3;i++){const at=Math.floor(i*n/(sample.length/3))*3;sample.set(positions.subarray(at,at+3),i*3);}
 self.postMessage({type:'model',revision:modelRevision,meta,width,height,texture:packed,centers:sample,persistent:persistent.length},[packed.buffer,sample.buffer]);
}
// Sort positive float32 depths using two stable 16-bit radix passes. Optional
// ordered depths let the caller merge independently sorted lists without loss.
function radixSort(kept,out,orderedDepths){
 bins.fill(0);for(let i=0;i<kept;i++)bins[depthBits[i]&65535]++;
 let sum=0;for(let i=0;i<65536;i++){starts[i]=sum;sum+=bins[i];}
 for(let i=0;i<kept;i++)tempOrder[starts[depthBits[i]&65535]++]=i;
 bins.fill(0);let minHigh=65535,maxHigh=0;
 for(let i=0;i<kept;i++){const high=depthBits[i]>>>16;bins[high]++;if(high<minHigh)minHigh=high;if(high>maxHigh)maxHigh=high;}
 sum=0;for(let i=minHigh;i<=maxHigh;i++){starts[i]=sum;sum+=bins[i];}
 for(let i=0;i<kept;i++){const at=tempOrder[i],dest=starts[depthBits[at]>>>16]++;out[dest]=ids[at];if(orderedDepths)orderedDepths[dest]=depths[at];}
}
function sortFrame({view,time,fx,fy,width,height,budget=Infinity,generation=0}){
 const start=performance.now(),bucket=temporalCandidates(time);
 const limited=Number.isFinite(budget),cacheStatic=!limited&&time>=t0&&time<=t1;
 let staticRebuilt=false;
 let count=0;if(limited)scoreBins.fill(0);
 const scan=list=>{for(let a=0;a<list.length;a++){
  const i=list[a],k=i*4,j=i*3,dt=time-times[k],sig=times[k+1];
  if(time<times[k+2]||time>times[k+3])continue;
  const px=positions[j]+velocities[j]*dt,py=positions[j+1]+velocities[j+1]*dt,pz=positions[j+2]+velocities[j+2]*dt;
  const x=view[0]*px+view[4]*py+view[8]*pz+view[12],y=view[1]*px+view[5]*py+view[9]*pz+view[13],z=view[2]*px+view[6]*py+view[10]*pz+view[14];
  const radius=radii[i];
  if(z<=.05||z>500)continue;
  // Expanded frustum retains entire ellipses, including large off-center splats.
  const clipX=z*width/(2*fx),clipY=z*height/(2*fy);
  if(Math.abs(x)>clipX+radius*(1+width/(2*fx))||Math.abs(y)>clipY+radius*(1+height/(2*fy)))continue;
  if(limited){
   const opacity=alpha[i]*Math.exp(-.5*(dt/sig)**2);
   if(opacity<1/255)continue;
   const footprint=factors[i]*fy*fy/Math.max(.01,z*z),importance=footprint*opacity;
   const score=moving[i]?1023:Math.max(0,Math.min(1022,Math.round(500+48*Math.log2(Math.max(1e-12,importance)))));
   scores[count]=score;scoreBins[score]++;
  }
  ids[count]=i;depths[count]=z;count++;
 }};
 if(cacheStatic){
  const projection=[fx,fy,width,height];
  if(!cachedView||view.some((v,i)=>v!==cachedView[i])||projection.some((v,i)=>v!==cachedProjection[i])){
   scan(persistentStatic);
   // Retain capacity while the camera moves. Only the populated prefix is valid.
   if(!staticOrder||staticOrder.length<count){
    const capacity=Math.min(persistentStatic.length,Math.max(count,Math.ceil((staticOrder?.length||0)*1.5)));
    staticOrder=new Uint32Array(capacity);staticDepths=new Float32Array(capacity);
   }
   staticVisibleCount=count;
   radixSort(count,staticOrder,staticDepths);cachedView=Array.from(view);cachedProjection=projection;staticRebuilt=true;
  }
  count=0;scan(persistentMoving);
 }else scan(persistent);
 scan(bucket);
 const target=Math.min(count,budget);let threshold=0,above=0;
 if(target<count){for(let s=1023;s>=0;s--){if(above+scoreBins[s]>=target){threshold=s;break;}above+=scoreBins[s];}}
 let remaining=target-above,available=scoreBins[threshold],kept=count;

 if(target<count){kept=0;for(let i=0;i<count;i++){
  const score=scores[i];if(target<count){if(score<threshold)continue;if(score===threshold){
   // Deterministic spatially scattered quota, avoiding arbitrary prefix truncation.
   const take=((Math.imul(ids[i]^0x9e3779b9,0x85ebca6b)>>>0)/4294967296)<remaining/available;available--;if(!take)continue;remaining--;
  }}
  ids[kept]=ids[i];depths[kept]=depths[i];kept++;
 }}
 const staticCount=cacheStatic?staticVisibleCount:0,total=kept+staticCount;
 const pooled=orderPool.findIndex(buffer=>buffer.byteLength>=total*4);
 const out=pooled<0?new Uint32Array(total):new Uint32Array(orderPool.splice(pooled,1)[0]);
 if(cacheStatic){
  radixSort(kept,dynamicOrder,dynamicDepths);
  let a=0,b=0,dest=0;
  while(a<staticCount&&b<kept){
   const id=dynamicOrder[b],k=id*4;
   // Original stable order: all persistent IDs in ascending record order,
   // followed by temporal-bucket IDs. Preserve it for equal float32 depths.
   const staticFirst=staticDepths[a]<dynamicDepths[b]||(staticDepths[a]===dynamicDepths[b]&&
    (times[k+2]>0||times[k+3]<5||staticOrder[a]<id));
   out[dest++]=staticFirst?staticOrder[a++]:dynamicOrder[b++];
  }
  out.set(staticOrder.subarray(a,staticCount),dest);dest+=staticCount-a;
  out.set(dynamicOrder.subarray(b,kept),dest);
 }else radixSort(kept,out);

 self.postMessage({type:'order',revision:modelRevision,indices:out,count:total,visible:count+staticCount,time,generation,staticCount,staticRebuilt,staticCacheBytes:persistentStatic.byteLength+persistentMoving.byteLength+dynamicOrder.byteLength+dynamicDepths.byteLength+(staticOrder?.byteLength||0)+(staticDepths?.byteLength||0),temporalIndexBytes,sortMs:performance.now()-start},[out.buffer]);
}
async function readModel(manifest,{stage,preview=false}={}){
 const read=async compressed=>{
  self.postMessage({type:'progress',received:0,size:manifest.bytes,stage,preview});
  const response=await fetch(compressed?manifest.gzipUrl:manifest.url);
  if(!response.ok)throw Error('Model request failed: '+response.status);
  const size=manifest.bytes;
  if(!Number.isSafeInteger(size)||size<8)throw Error('Invalid model length');
  const array=new Uint8Array(size),stream=compressed?response.body.pipeThrough(new DecompressionStream('gzip')):response.body;
  const reader=stream.getReader();let at=0,last=0;
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    if(at+value.length>size)throw Error('Model exceeds the length in the manifest');
    array.set(value,at);at+=value.length;
    if(performance.now()-last>150){self.postMessage({type:'progress',received:at,size,stage,preview});last=performance.now();}
   }
  }finally{await reader.cancel().catch(()=>{});}
  if(at!==size)throw Error('Incomplete model download');
  self.postMessage({type:'progress',received:at,size,stage,preview});
  return array.buffer;
 };
 if(typeof DecompressionStream!=='undefined'&&manifest.gzipUrl){
  try{return await read(true);}catch(error){
   if(!manifest.url)throw error;
   self.postMessage({type:'warning',message:'Compressed cache unavailable; loading uncompressed cache',stage});
  }
 }
 if(!manifest.url)throw Error('This browser cannot open compressed models. Please use a recent Chrome, Edge, Firefox, or Safari.');
 return read(false);
}
let loading=false,fullManifest;
async function loadFull(){
 self.postMessage({type:'progress',message:'Loading full detail…',stage:'full',received:0,size:fullManifest.bytes});
 const buffer=await readModel(fullManifest,{stage:'full'});
 self.postMessage({type:'progress',message:'Preparing full textures and temporal index in background…',stage:'full'});
 initialize(buffer);
}
self.onmessage=async({data})=>{try{
 if(data.type==='load'&&!loading){
  loading=true;
  try{
   const manifest=data.manifest||await(await fetch(data.manifestUrl||'/viewer4d/cache/manifest.json')).json();
   fullManifest=manifest;
   // Fetching yields to sort messages, so each installed preview stays interactive
   // while the next stage downloads. Initialization and model replacement are atomic.
   if(data.progressive!==false)for(const [index,preview] of (manifest.previews||[]).entries()){
    try{
     const buffer=await readModel(preview,{stage:index+1,preview:true});
     initialize(buffer);
    }catch(error){
     self.postMessage({type:'progress',stage:index+1,skipped:true});
     self.postMessage({type:'warning',message:'Preview unavailable; loading next stage: '+error.message});
    }
   }
   await loadFull();
  }finally{loading=false;}
 }else if(data.type==='retry'&&fullManifest&&!loading){
  loading=true;try{await loadFull();}finally{loading=false;}
 }else if(data.type==='sort'){
  if(data.revision===undefined||data.revision===modelRevision)sortFrame(data);
  else self.postMessage({type:'stale',generation:data.generation,revision:data.revision});
 }
 // At most two returned buffers, plus one pending and one in flight.
 else if(data.type==='recycle'){orderPool.push(data.buffer);if(orderPool.length>2)orderPool.shift();}
}catch(e){self.postMessage({type:'error',message:e.stack||e.message,recoverable:!!meta?.preview});}};

export {initialize,sortFrame};
