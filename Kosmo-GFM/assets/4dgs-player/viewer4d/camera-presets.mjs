// Presentation framing verified against the scene library. Matrices use the
// player's COLMAP convention (positive depth, image Y pointing down).
// VVC and 4D Lab exports share capture coordinates within their own series.
import {getViewMatrix,invert4} from '../camera-math.mjs';
const vvc=[.9,-.039,.434,0,0,-.996,-.089,0,.436,.08,-.896,0,-.104,1.113,5.762,1];
const lab=[0,.895297159,.445469411,0,-.957769788,-.128088557,.257430293,0,.287536144,-.426657144,.85748857,0,.253819254,-.750313303,14.599867856,1];
export const scenePresets=Object.freeze(Object.fromEntries([
 ...['001_1_seq0','004_1_seq1','006_1_seq1','007_C_wall_surface','008_2_seq1','011_0_seq1','012_0_seq0'].map(id=>['vvc_'+id,{view:vvc,height:812,fx:1159.5880733038064,fy:1164.6601287484507,distance:6}]),
 ...Array.from({length:8},(_,i)=>['4dlab_demo'+(i+1),{view:lab,height:812,fx:5200.697452789081,fy:5196.121666339436,distance:14}])
]));
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const norm=a=>{const n=Math.hypot(...a);return a.map(x=>x/n);};
// The reference UI stores rounded matrices; restore a rigid camera transform.
function rigidView(view){
 const inverse=invert4(view),eye=inverse.slice(12,15);
 const r=norm([view[0],view[4],view[8]]),d0=[view[1],view[5],view[9]];
 const d=norm(d0.map((x,i)=>x-r[i]*dot(d0,r)));
 const f=[r[1]*d[2]-r[2]*d[1],r[2]*d[0]-r[0]*d[2],r[0]*d[1]-r[1]*d[0]];
 return [r[0],d[0],f[0],0,r[1],d[1],f[1],0,r[2],d[2],f[2],0,-dot(eye,r),-dot(eye,d),-dot(eye,f),1];
}
export function initialSceneState(id,camera){
 const preset=scenePresets[id];
 if(preset)return {view:rigidView(preset.view),cameraIndex:0,fx:preset.fx,fy:preset.fy,width:1440,height:preset.height,distance:preset.distance,up:null};
 if(id==='demo_gfm'){
  const view=getViewMatrix(camera);view[12]+=.55;view[13]-=1.1;
  return {view,cameraIndex:0,fx:camera.fx*1.8,fy:camera.fy*1.8,width:camera.width,height:camera.height,distance:6,up:null};
 }
 return null;
}
