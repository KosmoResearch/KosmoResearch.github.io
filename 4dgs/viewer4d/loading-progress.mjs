// Weight each progressive stage by its decoded byte count. A fallback replaces
// the failed attempt's progress; skipped previews do not count as required data.
export function createLoadingProgress(manifest,{progressive=true}={}){
 const stages=new Map();
 if(progressive)for(const [index,preview] of (manifest.previews||[]).entries())stages.set(index+1,{size:preview.bytes,received:0});
 stages.set('full',{size:manifest.bytes,received:0});
 const snapshot=()=>{
  let received=0,total=0;
  for(const stage of stages.values()){received+=stage.received;total+=stage.size;}
  return{received,total,ratio:total?received/total:0};
 };
 return{
  snapshot,
  update({stage,received,skipped=false}){
   if(skipped)stages.delete(stage);
   else if(stages.has(stage)&&Number.isFinite(received)){
    const current=stages.get(stage);current.received=Math.max(0,Math.min(current.size,received));
   }
   return snapshot();
  }
 };
}
