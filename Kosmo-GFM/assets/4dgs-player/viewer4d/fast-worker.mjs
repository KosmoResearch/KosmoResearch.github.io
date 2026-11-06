import {half} from '../splatv.mjs';
let positions,velocities,times,factors,radii,alpha,moving,persistent,buckets,meta,ids,depths,depthBits,tempOrder,scores,orderPool;
const boundFloat=new Float32Array(1),boundBits=new Uint32Array(boundFloat.buffer);
function outward(value,up){boundFloat[0]=value;if(up?boundFloat[0]<value:boundFloat[0]>value)boundBits[0]+=((boundFloat[0]>=0)===up)?1:-1;return boundFloat[0];}
const bins=new Uint32Array(65536),starts=new Uint32Array(65536),scoreBins=new Uint32Array(1024);
function initialize(buffer){
 const head=new DataView(buffer),length=head.getUint32(4,true);
 if(head.getUint32(0,true)!==0x4c344753)throw Error('Invalid optimized model');
 meta=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,length)));
 const n=meta.count,src=new DataView(buffer,8+length);
 positions=new Float32Array(n*3);velocities=new Float32Array(n*3);times=new Float32Array(n*4);factors=new Float32Array(n);radii=new Float32Array(n);alpha=new Float32Array(n);moving=new Uint8Array(n);
 const width=3072,height=Math.ceil(n/1024),packed=new Uint32Array(width*height*4),row=new Uint32Array(12),staticIds=[],counts=new Uint32Array(20);
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
  times[k+2]=outward(Math.max(0,times[k+2],times[k]-reach),false);
  times[k+3]=outward(Math.min(5,times[k+3],times[k]+reach),true);
  radii[i]=3.33*Math.sqrt(3*factors[i])*(1+1e-6);
  const lo=times[k+2],hi=times[k+3];
  if(lo<=0&&hi>=5)staticIds.push(i);
  else if(hi>=lo){const a=Math.min(19,Math.floor(lo*4)),b=Math.min(19,Math.floor(hi*4));for(let t=a;t<=b;t++)counts[t]++;}
 }
 persistent=Uint32Array.from(staticIds);buckets=Array.from(counts,c=>new Uint32Array(c));counts.fill(0);
 for(let i=0;i<n;i++){
  const k=i*4,lo=times[k+2],hi=times[k+3];
  if(lo<=0&&hi>=5||hi<lo)continue;
  for(let t=Math.min(19,Math.floor(lo*4));t<=Math.min(19,Math.floor(hi*4));t++)buckets[t][counts[t]++]=i;
 }
 const cap=persistent.length+Math.max(...counts);ids=new Uint32Array(cap);depths=new Float32Array(cap);depthBits=new Uint32Array(depths.buffer);tempOrder=new Uint32Array(cap);scores=new Uint16Array(cap);
 const sample=new Float32Array(Math.min(8192,n)*3);for(let i=0;i<sample.length/3;i++){const at=Math.floor(i*n/(sample.length/3))*3;sample.set(positions.subarray(at,at+3),i*3);}
 self.postMessage({type:'model',meta,width,height,texture:packed,centers:sample,persistent:persistent.length},[packed.buffer,sample.buffer]);
}
function sortFrame({view,time,fx,fy,width,height,budget=Infinity,generation=0}){
 const start=performance.now(),bucket=buckets[Math.max(0,Math.min(19,Math.floor(time*4)))];
 const limited=Number.isFinite(budget);
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
 }};scan(persistent);scan(bucket);
 const target=Math.min(count,budget);let threshold=0,above=0;
 if(target<count){for(let s=1023;s>=0;s--){if(above+scoreBins[s]>=target){threshold=s;break;}above+=scoreBins[s];}}
 let remaining=target-above,available=scoreBins[threshold],kept=0;bins.fill(0);

 for(let i=0;i<count;i++){
  const score=scores[i];if(target<count){if(score<threshold)continue;if(score===threshold){
   // Deterministic spatially scattered quota, avoiding arbitrary prefix truncation.
   const take=((Math.imul(ids[i]^0x9e3779b9,0x85ebca6b)>>>0)/4294967296)<remaining/available;available--;if(!take)continue;remaining--;
  }}
  ids[kept]=ids[i];depths[kept]=depths[i];bins[depthBits[kept]&65535]++;kept++;
 }
 let sum=0;for(let i=0;i<65536;i++){starts[i]=sum;sum+=bins[i];}
 const out=orderPool&&orderPool.byteLength>=kept*4?new Uint32Array(orderPool):new Uint32Array(kept);orderPool=null;
 // Two stable radix passes preserve the full positive float depth precision.
 // A global 16-bit depth range can merge millimeter-separated floor splats.
 for(let i=0;i<kept;i++)tempOrder[starts[depthBits[i]&65535]++]=i;
 bins.fill(0);for(let i=0;i<kept;i++)bins[depthBits[i]>>>16]++;
 sum=0;for(let i=0;i<65536;i++){starts[i]=sum;sum+=bins[i];}
 for(let i=0;i<kept;i++){const at=tempOrder[i];out[starts[depthBits[at]>>>16]++]=ids[at];}
 self.postMessage({type:'order',indices:out,count:kept,visible:count,time,generation,sortMs:performance.now()-start},[out.buffer]);
}
self.onmessage=async({data})=>{try{
 if(data.type==='load'){
  const manifest=data.manifest||await(await fetch(new URL(data.manifestUrl||'./cache/manifest.json', import.meta.url))).json();
  let compressed=typeof DecompressionStream!=='undefined'&&!!manifest.gzipUrl;
  let response=await fetch(new URL(compressed?manifest.gzipUrl:manifest.url, import.meta.url));
  if(!response.ok&&compressed){compressed=false;response=await fetch(new URL(manifest.url, import.meta.url));}
  if(!response.ok)throw Error('Unable to load scene: '+response.status);
  const size=manifest.bytes,array=new Uint8Array(size),stream=compressed&&!response.headers.get('Content-Encoding')?.toLowerCase().includes('gzip')?response.body.pipeThrough(new DecompressionStream('gzip')):response.body,reader=stream.getReader();let at=0,last=0;
  for(;;){const {done,value}=await reader.read();if(done)break;array.set(value,at);at+=value.length;if(performance.now()-last>150){self.postMessage({type:'progress',received:at,size});last=performance.now();}}
  if(at!==size)throw Error('Scene download was incomplete.');self.postMessage({type:'progress',message:'Preparing Gaussian textures and motion…'});initialize(array.buffer);
 }else if(data.type==='sort')sortFrame(data);
 else if(data.type==='recycle')orderPool=data.buffer;
}catch(e){self.postMessage({type:'error',message:e.stack||e.message});}};

export {initialize,sortFrame};
