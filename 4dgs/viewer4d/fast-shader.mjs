export const vertex=`#version 300 es
precision highp float;
precision highp int;
uniform highp usampler2D splats;
uniform mat4 view;
uniform vec2 viewport,focal;
uniform float clockTime,classic;
in vec2 corner;
in uint index;
out vec2 gaussian;
out vec4 color;
#ifdef PROJECT_ONLY
out vec4 projectedCenterMajor;
out vec4 projectedMinorExtentR;
out vec3 projectedColorGBA;
#endif
void main(){
#ifdef PROJECT_ONLY
 projectedCenterMajor=vec4(0.);projectedMinorExtentR=vec4(0.);projectedColorGBA=vec3(0.,0.,-1.);
#endif
 gl_Position=vec4(0.,0.,2.,1.);color=vec4(0.);
 ivec2 uv=ivec2(int(index%1024u)*3,int(index/1024u));
 uvec4 d=texelFetch(splats,uv+ivec2(2,0),0);
 vec2 vt=unpackHalf2x16(d.x),tl=unpackHalf2x16(d.y),end=unpackHalf2x16(d.z);
 if(clockTime<tl.y||clockTime>end.x)return;
 float dt=clockTime-vt.y;float temporal=exp(-.5*pow(dt/tl.x,2.));if(temporal<.02)return;
 uvec4 a=texelFetch(splats,uv,0),b=texelFetch(splats,uv+ivec2(1,0),0);
 vec3 velocity=vec3(unpackHalf2x16(b.w),vt.x),center=uintBitsToFloat(a.xyz)+velocity*dt;
 vec3 cam=(view*vec4(center,1.)).xyz;if(cam.z<=.05||cam.z>500.)return;
 vec2 c0=unpackHalf2x16(b.x),c1=unpackHalf2x16(b.y),c2=unpackHalf2x16(b.z);
 mat3 cov=mat3(c0.x,c0.y,c1.x,c0.y,c1.y,c2.x,c1.x,c2.x,c2.y)*uintBitsToFloat(d.w);
 vec3 jx=vec3(focal.x/cam.z,0.,-focal.x*cam.x/(cam.z*cam.z));
 vec3 jy=vec3(0.,focal.y/cam.z,-focal.y*cam.y/(cam.z*cam.z));
 vec3 x=transpose(mat3(view))*jx,y=transpose(mat3(view))*jy;
 float xx=dot(x,cov*x),xy=dot(x,cov*y),yy=dot(y,cov*y);
 float before=max(0.,xx*yy-xy*xy);float blur=classic>.5?.075:.3;xx+=blur;yy+=blur;
 float opacity=float(a.w>>24u)/255.*temporal;if(classic<.5)opacity*=sqrt(before/max(1e-12,xx*yy-xy*xy));if(opacity<1./255.)return;
 float mid=.5*(xx+yy),delta=length(vec2(.5*(xx-yy),xy));
 float l1=max(.0001,mid+delta),l2=max(classic>.5?.025:.0001,mid-delta);
 vec2 axis=abs(xy)>1e-8?normalize(vec2(xy,l1-xx)):(xx>=yy?vec2(1.,0.):vec2(0.,1.));
 // Match PlayCanvas's projected-axis cap (its covariance is scaled by 4).
 // Close/off-axis Gaussians otherwise expand without bound as depth tends to zero.
 float axisLimit=.5*min(1024.,min(viewport.x,viewport.y));
 vec2 major=min(sqrt(2.*l1),axisLimit)*axis,minor=min(sqrt(2.*l2),axisLimit)*vec2(axis.y,-axis.x);
 // Tight bounds are solved from the fragment's existing alpha cutoff.
 // No contributing fragment is removed; the classic profile matches PlayCanvas normExp.
 float edge=classic>.5?exp(-4.)+(1.-exp(-4.))/(255.*opacity):1./(255.*opacity);
 float extent=sqrt(max(0.,-log(edge)));
 vec3 rgb=vec3(float(a.w&255u),float((a.w>>8u)&255u),float((a.w>>16u)&255u))/255.;
 vec2 pixelCenter=cam.xy/cam.z*focal;
#ifdef PROJECT_ONLY
 projectedCenterMajor=vec4(pixelCenter,major);
 projectedMinorExtentR=vec4(minor,extent/sqrt(log(255.)),rgb.r);
 projectedColorGBA=vec3(rgb.gb,opacity);
#else
 vec2 localCorner=corner*(extent/sqrt(log(255.)));
 vec2 offset=localCorner.x*major+localCorner.y*minor;
 vec2 pixel=pixelCenter+offset;
 gl_Position=vec4(pixel.x*2./viewport.x,-pixel.y*2./viewport.y,0.,1.);
 gaussian=localCorner;color=vec4(rgb,opacity);
#endif
}`;
export const fragment=`#version 300 es
precision highp float;
in vec2 gaussian;
in vec4 color;
uniform float classic;
out vec4 outputColor;
void main(){float weight=exp(-dot(gaussian,gaussian));if(classic>.5)weight=(weight-exp(-4.))/(1.-exp(-4.));float a=weight*color.a;if(a<1./255.)discard;outputColor=vec4(a*color.rgb,a);}`;

// Same Gaussian evaluation as the direct path, once per sorted instance.
export const projectionVertex=vertex.replace('#version 300 es','#version 300 es\n#define PROJECT_ONLY');
export const projectedVertex=`#version 300 es
precision highp float;
uniform vec2 viewport;
in vec2 corner;
in vec4 projectedCenterMajor,projectedMinorExtentR;
in vec3 projectedColorGBA;
out vec2 gaussian;
out vec4 color;
void main(){
 gl_Position=vec4(0.,0.,2.,1.);gaussian=vec2(0.);color=vec4(0.);
 if(projectedColorGBA.z<0.)return;
 vec2 localCorner=corner*projectedMinorExtentR.z;
 vec2 offset=localCorner.x*projectedCenterMajor.zw+localCorner.y*projectedMinorExtentR.xy;
 vec2 pixel=projectedCenterMajor.xy+offset;
 gl_Position=vec4(pixel.x*2./viewport.x,-pixel.y*2./viewport.y,0.,1.);
 gaussian=localCorner;color=vec4(projectedMinorExtentR.w,projectedColorGBA);
}`;
