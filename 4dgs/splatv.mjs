import {readSplatvHeader} from './splatv-header.mjs?v=drop1';
export function half(h) {
 const s=(h&32768)?-1:1,e=(h>>10)&31,m=h&1023;
 return s*(e===0?m*2**-24:e===31?(m?NaN:Infinity):(1+m/1024)*2**(e-15));
}
export function parseSplatv(buffer,limit=Infinity,{decodeMotion=true,allowLegacyPadding=false}={}) {
 const header=readSplatvHeader(buffer,buffer.byteLength,{allowLegacyPadding});
 const entry=header.entries.find(e=>e.meta.type==='splat'),shEntry=header.entries.find(e=>e.meta.type==='sh3');
 const meta=entry.meta,splat=new DataView(buffer,entry.offset,entry.size),sh=shEntry?new DataView(buffer,shEntry.offset,shEntry.size):null;
 const count=header.count;
 const localClock=meta.temporal_windows?.format==='frame-window-local-clock-v4';
 const fps=meta.temporal_windows?.fps||60000/1001;
 const n=Math.min(count,limit),streams=Array.from({length:sh?7:4},()=>new Uint32Array(n*4));
 const centers=new Float32Array(n*3),motion=decodeMotion?new Float32Array(n*16):null;
 for(let i=0;i<n;i++){
  const j=Math.floor(i*count/n);
  for(let k=0;k<16;k++)streams[k>>2][i*4+(k&3)]=splat.getUint32(j*64+k*4,true);
  for(let k=0;k<3;k++)centers[i*3+k]=splat.getFloat32(j*64+k*4,true);
  if(motion){for(let k=0;k<16;k++)motion[i*16+k]=half(splat.getUint16(j*64+32+k*2,true));
   if(localClock)motion[i*16+14]+=half(splat.getUint16(j*64+26,true))/fps;
  }
  if(sh)for(let k=0;k<12;k++)streams[4+(k>>2)][i*4+(k&3)]=sh.getUint32(j*48+k*4,true);
 }
 return {n,count,streams,centers,motion,meta,hasSH:!!sh,warnings:header.warnings};
}
export function evaluateCenters(data,t,out) {
 const {n,centers,motion}=data;
 for(let i=0;i<n;i++){
  const k=i*16,dt=t-motion[k+14],dt2=dt*dt;
  for(let a=0;a<3;a++)out[i*3+a]=centers[i*3+a]+motion[k+a]*dt+motion[k+3+a]*dt2+motion[k+6+a]*dt2*dt;
 }
}
// Conservative temporal buckets: retain every splat whose Gaussian opacity can
// exceed 0.02 at any time in the bucket. No spatial/quality subsampling.
export function temporalIndex(data,step=0.5){
 const [start,end]=data.meta.timeRange||[0,20],buckets=Array.from({length:Math.ceil((end-start)/step)},()=>[]),r=Math.sqrt(-2*Math.log(0.02));
 for(let i=0;i<data.n;i++){
  const k=i*16,c=data.motion[k+14],s=data.motion[k+15];
  if(!Number.isFinite(c)||Number.isNaN(s)||s<=0)continue;
  if(s===Infinity){for(const b of buckets)b.push(i);continue;}
  const lo=Math.max(0,Math.floor((c-r*s-start)/step)),hi=Math.min(buckets.length-1,Math.floor((c+r*s-start)/step));
  for(let b=lo;b<=hi;b++)buckets[b].push(i);
 }
 return {start,end,step,buckets:buckets.map(a=>Uint32Array.from(a)),capacity:Math.max(...buckets.map(a=>a.length))};
}
export function evaluateMappedCenters(data,mapping,t,out){
 for(let j=0;j<mapping.length;j++){
  const i=mapping[j],k=i*16,dt=t-data.motion[k+14],dt2=dt*dt;
  for(let a=0;a<3;a++)out[j*3+a]=data.centers[i*3+a]+data.motion[k+a]*dt+data.motion[k+3+a]*dt2+data.motion[k+6+a]*dt2*dt;
 }
}
