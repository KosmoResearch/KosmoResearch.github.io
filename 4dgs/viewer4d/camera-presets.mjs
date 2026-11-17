// Presentation framing verified against the scene library. Matrices use the
// player's COLMAP convention (positive depth, image Y pointing down).
// VVC and 4D Lab exports share capture coordinates within their own series.
import {getViewMatrix,invert4} from '../camera-math.mjs';
const vvc=[.9,-.039,.434,0,0,-.996,-.089,0,.436,.08,-.896,0,-.104,1.113,5.762,1];
const lab=[0,.895297159,.445469411,0,-.957769788,-.128088557,.257430293,0,.287536144,-.426657144,.85748857,0,.253819254,-.750313303,14.599867856,1];
export const scenePresets=Object.freeze(Object.fromEntries([
 ...['001_1_seq0','004_1_seq1','006_1_seq1','007_C_wall_surface','008_2_seq1','011_0_seq1','012_0_seq0'].map(id=>['vvc_'+id,{view:vvc,height:812,fx:1159.5880733038064,fy:1164.6601287484507,distance:6}]),
 ...Array.from({length:8},(_,i)=>['4dlab_demo'+(i+1),{view:lab,height:812,fx:5200.697452789081,fy:5196.121666339436,distance:14}]),
 // ACS default view is capture camera cam09 (index 9) of each scene's rig,
 // focal rescaled to 1440x810; orbit distance kept from the framed aim.
 ...[
  ['acs_zhao_solo',950.7023,950.7,3.1916,[.247335,-.217717,.944153,0,.199881,.964934,.170148,0,-.948089,.146635,.282179,0,3.536641,-.742789,2.139235,1]],
  ['acs_boy',950.7023,950.7,3.6724,[.246748,-.217676,.944316,0,.199788,.964939,.170226,0,-.948262,.14666,.281586,0,3.536924,-.742941,2.141166,1]],
  ['acs_qiqi',950.7023,950.7,2.8998,[.246748,-.217676,.944316,0,.199788,.964939,.170226,0,-.948262,.14666,.281586,0,3.536924,-.742941,2.141166,1]],
  ['acs_xixi',950.7023,950.7,3.0658,[.246748,-.217676,.944316,0,.199788,.964939,.170226,0,-.948262,.14666,.281586,0,3.536924,-.742941,2.141166,1]],
  ['acs_two_people',950.7023,950.7,2.9276,[.246748,-.217676,.944316,0,.199788,.964939,.170226,0,-.948262,.14666,.281586,0,3.536924,-.742941,2.141166,1]],
  ['acs_3girl',950.7023,950.7,3.586,[.246748,-.217676,.944316,0,.199788,.964939,.170226,0,-.948262,.14666,.281586,0,3.536924,-.742941,2.141166,1]],
  ['acs_three_people',950.7023,950.7,3.2243,[.246748,-.217676,.944316,0,.199788,.964939,.170226,0,-.948262,.14666,.281586,0,3.536924,-.742941,2.141166,1]],
  ['acs_four_people',950.7023,950.7,3.4603,[.246748,-.217676,.944316,0,.199788,.964939,.170226,0,-.948262,.14666,.281586,0,3.536924,-.742941,2.141166,1]]
 ].map(([id,fx,fy,distance,view])=>[id,{view,height:810,fx,fy,distance}])
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
