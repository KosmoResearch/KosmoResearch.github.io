// Two-pass projection strategy inspired by HS_SplatTV/hybrid.js.
// Evaluation and blending use this viewer's unchanged full-detail kernels.
import {projectionVertex,projectedVertex,fragment} from './fast-shader.mjs?v=4';
const STRIDE=44,CHUNK=1<<20;
export function createProjectedRenderer(gl,indices,quad){
 const resources=[];
 function program(vertex,feedback){
  const p=gl.createProgram();resources.push(['Program',p]);
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
   const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
   if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
   gl.attachShader(p,s);gl.deleteShader(s);
  }
  if(feedback)gl.transformFeedbackVaryings(p,feedback,gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
 }
 const project=program(projectionVertex,['projectedCenterMajor','projectedMinorExtentR','projectedColorGBA']);
 const render=program(projectedVertex);
 const uniforms=p=>Object.fromEntries(['view','viewport','focal','clockTime','classic','splats'].map(k=>[k,gl.getUniformLocation(p,k)]));
 const pu=uniforms(project),ru=uniforms(render);
 const buffer=gl.createBuffer(),feedback=gl.createTransformFeedback(),projectVao=gl.createVertexArray(),renderVao=gl.createVertexArray();
 resources.push(['Buffer',buffer],['TransformFeedback',feedback],['VertexArray',projectVao],['VertexArray',renderVao]);
 gl.bindVertexArray(projectVao);gl.bindBuffer(gl.ARRAY_BUFFER,indices);
 const index=gl.getAttribLocation(project,'index');gl.enableVertexAttribArray(index);gl.vertexAttribIPointer(index,1,gl.UNSIGNED_INT,0,0);
 gl.bindVertexArray(renderVao);gl.bindBuffer(gl.ARRAY_BUFFER,quad);
 const corner=gl.getAttribLocation(render,'corner');gl.enableVertexAttribArray(corner);gl.vertexAttribPointer(corner,2,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(const [name,size,offset] of [['projectedCenterMajor',4,0],['projectedMinorExtentR',4,16],['projectedColorGBA',3,32]]){
  const a=gl.getAttribLocation(render,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,STRIDE,offset);gl.vertexAttribDivisor(a,1);
 }
 let capacity=0,validated=false;
 return {
  get bytes(){return capacity*STRIDE;},
  draw({view,viewport,focal,time,classic,count}){
   if(!count)return;
   if(Math.min(count,CHUNK)>capacity){capacity=Math.min(count,CHUNK);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,capacity*STRIDE,gl.DYNAMIC_COPY);}
   gl.useProgram(project);gl.uniformMatrix4fv(pu.view,false,view);gl.uniform2fv(pu.viewport,viewport);gl.uniform2fv(pu.focal,focal);gl.uniform1f(pu.clockTime,time);gl.uniform1f(pu.classic,classic);gl.uniform1i(pu.splats,0);
   gl.useProgram(render);gl.uniform2fv(ru.viewport,viewport);gl.uniform1f(ru.classic,classic);
   for(let start=0;start<count;start+=capacity){
    const n=Math.min(capacity,count-start);
    gl.useProgram(project);gl.bindVertexArray(projectVao);gl.bindBuffer(gl.ARRAY_BUFFER,indices);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
    gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,start,n);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
    if(!validated){
     const error=gl.getError();if(error!==gl.NO_ERROR)throw Error('Transform Feedback error '+error);
     // Validate actual writes once; unsupported drivers fall back to direct rendering.
     const sample=new Float32Array(Math.min(32,n)*11);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,sample);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,null);
     if(!sample.every(Number.isFinite)||!sample.some(v=>v!==0))throw Error('Transform Feedback returned invalid projection data');
     validated=true;
    }
    gl.useProgram(render);gl.bindVertexArray(renderVao);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,n);
   }
  },
  dispose(){for(const [type,object] of resources)gl['delete'+type](object);}
 };
}
