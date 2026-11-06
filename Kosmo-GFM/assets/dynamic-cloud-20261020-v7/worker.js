import {parseRenderPack} from './render-pack.js';
self.onmessage=async({data:{url}})=>{try{
 const r=await fetch(url);if(!r.ok)throw Error(`Scene download failed (HTTP ${r.status})`);
 const reader=r.body.getReader(),parts=[];let bytes=0;const size=Number(r.headers.get('content-length'));
 while(true){const x=await reader.read();if(x.done)break;parts.push(x.value);bytes+=x.value.length;self.postMessage({progress:size?bytes/size:0,bytes,label:'compressed scene'});}
 self.postMessage({decoding:true,label:'scene'});
 const received=await new Blob(parts).arrayBuffer();
 const signature=new Uint8Array(received,0,Math.min(2,received.byteLength));
 // Vite serves .gz with Content-Encoding, so fetch may already decompress it.
 // Inspect the bytes to support both Vite and ordinary static file servers.
 const raw=signature[0]===0x1f&&signature[1]===0x8b
   ?await new Response(new Blob([received]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
   :received;
 const {meta,arrays}=parseRenderPack(raw);
 self.postMessage({meta,arrays,dense:arrays},[raw]);
 }catch(error){self.postMessage({error:error.message});}};
