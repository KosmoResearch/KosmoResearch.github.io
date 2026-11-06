export const HISTORY_FRAMES=10;
export const FADE_FRAMES=10;
// Shared smoothstep expression is used directly by the GPU shader and the test oracle.
export const trailFragmentShader=`uniform float frame;uniform float history;uniform float fade;
  varying vec3 vColor;varying float vTime;
  void main(){float age=frame-vTime;if(age<0.||age>=history+fade)discard;
    float alpha=.82*(1.-smoothstep(history,history+fade,age));
    gl_FragColor=vec4(vColor,alpha);
    #include <colorspace_fragment>
  }`;
export function trailDrawRange(counts,frame){
  const cutoff=frame-HISTORY_FRAMES-FADE_FRAMES;
  const start=cutoff>=0?counts[cutoff]:0;
  return {start,count:counts[frame]-start};
}
export function trailOpacity(age){
  if(age<0||age>=HISTORY_FRAMES+FADE_FRAMES)return 0;
  const x=Math.max(0,Math.min(1,(age-HISTORY_FRAMES)/FADE_FRAMES));
  return .82*(1-x*x*(3-2*x));
}
