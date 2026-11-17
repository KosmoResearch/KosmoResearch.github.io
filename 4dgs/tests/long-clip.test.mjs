import test from 'node:test';
import assert from 'node:assert/strict';
import {textureLayout} from '../viewer4d/texture-layout.mjs';
import {playbackTime} from '../viewer4d/playback-clock.mjs';
import {half} from '../splatv.mjs';
import {scenePresets} from '../viewer4d/camera-presets.mjs';
const messages=[];
globalThis.self={postMessage:m=>messages.push(m)};
const {initialize,sortFrame}=await import('../viewer4d/fast-worker.mjs');

test('47-second playback crosses 5 seconds, wraps at its own end and ignores negative RAF elapsed time',()=>{
 const duration=46.99695;
 assert.equal(playbackTime(4,1000,3000,1,duration),6);
 assert(Math.abs(playbackTime(duration-.5,1000,2000,1,duration)-.5)<1e-9);
 assert(Math.abs(playbackTime(12,1000,3000,.5,duration)-13)<1e-9);
 assert.equal(playbackTime(0,1000,999,1,duration),0);
 assert.equal(playbackTime(4,1000,3000,1),1,'existing five-second scenes still loop at five');
});

test('40M-record texture layout covers every record across four legal allocations',()=>{
 const count=40070282,width=4096*3,height=Math.ceil(count/4096),layout=textureLayout(width,height,16384);
 assert.equal(layout.slots,4);
 assert(layout.perTexture*layout.slots>=count);
 for(let slot=0;slot<layout.slots;slot++){
  const rows=Math.min(layout.rowsPerSlot,height-slot*layout.rowsPerSlot);
  assert(rows*width*16<=536870912);
  for(const id of [slot*layout.perTexture,Math.min(count-1,(slot+1)*layout.perTexture-1)]){
   const local=id-slot*layout.perTexture,x=local%layout.perRow,y=Math.floor(local/layout.perRow);
   assert(y<rows);assert.equal(slot*layout.perTexture+y*layout.perRow+x,id);
  }
 }
 assert.equal(textureLayout(3072,100,16384).slots,1);
 assert.throws(()=>textureLayout(width,height,8192),/texture size/);
 assert.throws(()=>textureLayout(width,height*2,16384),/texture capacity/);
});

test('long cache keeps exact late lifetimes and stable depth order through reverse seeks',()=>{
 const lives=[[0,47],[12,22],[46,47],[4,6],[27,28],[0,47]];
 const codes=new Map();for(let h=0;h<0x7c00;h++)codes.set(half(h),h);
 const header=new TextEncoder().encode(JSON.stringify({count:lives.length,originalCount:lives.length,timeRange:[0,46.99695],cameras:[]}));
 const buffer=new ArrayBuffer(8+header.length+lives.length*48),v=new DataView(buffer);
 v.setUint32(0,0x4c344753,true);v.setUint32(4,header.length,true);new Uint8Array(buffer,8,header.length).set(header);
 for(let i=0;i<lives.length;i++){
  const b=8+header.length+i*48;
  v.setFloat32(b+8,3+i%2*.25,true);v.setUint32(b+12,0xffffffff,true);
  v.setUint16(b+36,0x7c00,true);v.setUint16(b+38,codes.get(lives[i][0]),true);v.setUint16(b+40,codes.get(lives[i][1]),true);v.setFloat32(b+44,.001,true);
 }
 initialize(buffer);
 const frame={view:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],fx:400,fy:400,width:800,height:600};
 for(const time of [0,5,12,22,27.5,46.5,22.0001,11.9999,5.0001,0,46.99695]){
  sortFrame({...frame,time});
  const m=messages.at(-1),persistent=id=>lives[id][0]===0&&lives[id][1]>=46.99695;
  const expected=lives.flatMap(([lo,hi],id)=>time>=lo&&time<=Math.min(46.99695,hi)?[id]:[])
   .sort((a,b)=>a%2-b%2||Number(persistent(b))-Number(persistent(a))||a-b);
  assert.deepEqual([...m.indices.subarray(0,m.count)],expected,'time '+time);
  assert.equal(m.count,m.visible);
 }
});

test('clean clip resets to the same capture view as the original two-person demo',()=>{
 assert.deepEqual(scenePresets.acs_two_people_47s_clean,scenePresets.acs_two_people);
});
