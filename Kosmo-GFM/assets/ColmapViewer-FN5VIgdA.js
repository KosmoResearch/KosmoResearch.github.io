import{r as a,j as t}from"./index-B51jHu21.js";import{u as At,_ as Vt,C as gn,a as sn,O as xn}from"./OrbitControls-D0v7RWE9.js";import{R as yn,I as wn,F as Wt,a as Ct,b as Ye,W as vn,B as wt,S as rn,V as F,c as bn,U as $t,d as Ht,e as on,M as Sn,f as et,L as Mn,g as En,h as an,C as jt,i as qt,j as pt}from"./three.module-BR-FzrFF.js";const cn=parseInt(yn.replace(/\D+/g,"")),ln=cn>=125?"uv1":"uv2",Kt=new wt,gt=new F;class Rt extends wn{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const s=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],n=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],i=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(i),this.setAttribute("position",new Wt(s,3)),this.setAttribute("uv",new Wt(n,2))}applyMatrix4(s){const n=this.attributes.instanceStart,i=this.attributes.instanceEnd;return n!==void 0&&(n.applyMatrix4(s),i.applyMatrix4(s),n.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(s){let n;s instanceof Float32Array?n=s:Array.isArray(s)&&(n=new Float32Array(s));const i=new Ct(n,6,1);return this.setAttribute("instanceStart",new Ye(i,3,0)),this.setAttribute("instanceEnd",new Ye(i,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(s,n=3){let i;s instanceof Float32Array?i=s:Array.isArray(s)&&(i=new Float32Array(s));const r=new Ct(i,n*2,1);return this.setAttribute("instanceColorStart",new Ye(r,n,0)),this.setAttribute("instanceColorEnd",new Ye(r,n,n)),this}fromWireframeGeometry(s){return this.setPositions(s.attributes.position.array),this}fromEdgesGeometry(s){return this.setPositions(s.attributes.position.array),this}fromMesh(s){return this.fromWireframeGeometry(new vn(s.geometry)),this}fromLineSegments(s){const n=s.geometry;return this.setPositions(n.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new wt);const s=this.attributes.instanceStart,n=this.attributes.instanceEnd;s!==void 0&&n!==void 0&&(this.boundingBox.setFromBufferAttribute(s),Kt.setFromBufferAttribute(n),this.boundingBox.union(Kt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new rn),this.boundingBox===null&&this.computeBoundingBox();const s=this.attributes.instanceStart,n=this.attributes.instanceEnd;if(s!==void 0&&n!==void 0){const i=this.boundingSphere.center;this.boundingBox.getCenter(i);let r=0;for(let c=0,m=s.count;c<m;c++)gt.fromBufferAttribute(s,c),r=Math.max(r,i.distanceToSquared(gt)),gt.fromBufferAttribute(n,c),r=Math.max(r,i.distanceToSquared(gt));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(s){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(s)}}class fn extends Rt{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(s){const n=s.length-3,i=new Float32Array(2*n);for(let r=0;r<n;r+=3)i[2*r]=s[r],i[2*r+1]=s[r+1],i[2*r+2]=s[r+2],i[2*r+3]=s[r+3],i[2*r+4]=s[r+4],i[2*r+5]=s[r+5];return super.setPositions(i),this}setColors(s,n=3){const i=s.length-n,r=new Float32Array(2*i);if(n===3)for(let c=0;c<i;c+=n)r[2*c]=s[c],r[2*c+1]=s[c+1],r[2*c+2]=s[c+2],r[2*c+3]=s[c+3],r[2*c+4]=s[c+4],r[2*c+5]=s[c+5];else for(let c=0;c<i;c+=n)r[2*c]=s[c],r[2*c+1]=s[c+1],r[2*c+2]=s[c+2],r[2*c+3]=s[c+3],r[2*c+4]=s[c+4],r[2*c+5]=s[c+5],r[2*c+6]=s[c+6],r[2*c+7]=s[c+7];return super.setColors(r,n),this}fromLine(s){const n=s.geometry;return this.setPositions(n.attributes.position.array),this}}class Ft extends bn{constructor(s){super({type:"LineMaterial",uniforms:$t.clone($t.merge([Ht.common,Ht.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new on(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${cn>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(n){this.uniforms.diffuse.value=n}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(n){n===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(n){this.uniforms.linewidth.value=n}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(n){!!n!="USE_DASH"in this.defines&&(this.needsUpdate=!0),n===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(n){this.uniforms.dashScale.value=n}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(n){this.uniforms.dashSize.value=n}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(n){this.uniforms.dashOffset.value=n}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(n){this.uniforms.gapSize.value=n}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(n){this.uniforms.opacity.value=n}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(n){this.uniforms.resolution.value.copy(n)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(n){!!n!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),n===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(s)}}const St=new et,Jt=new F,Xt=new F,de=new et,he=new et,_e=new et,Mt=new F,Et=new En,me=new Mn,Zt=new F,xt=new wt,yt=new rn,Ne=new et;let Ue,Ke;function Qt(e,s,n){return Ne.set(0,0,-s,1).applyMatrix4(e.projectionMatrix),Ne.multiplyScalar(1/Ne.w),Ne.x=Ke/n.width,Ne.y=Ke/n.height,Ne.applyMatrix4(e.projectionMatrixInverse),Ne.multiplyScalar(1/Ne.w),Math.abs(Math.max(Ne.x,Ne.y))}function Ln(e,s){const n=e.matrixWorld,i=e.geometry,r=i.attributes.instanceStart,c=i.attributes.instanceEnd,m=Math.min(i.instanceCount,r.count);for(let d=0,x=m;d<x;d++){me.start.fromBufferAttribute(r,d),me.end.fromBufferAttribute(c,d),me.applyMatrix4(n);const p=new F,j=new F;Ue.distanceSqToSegment(me.start,me.end,j,p),j.distanceTo(p)<Ke*.5&&s.push({point:j,pointOnLine:p,distance:Ue.origin.distanceTo(j),object:e,face:null,faceIndex:d,uv:null,[ln]:null})}}function Cn(e,s,n){const i=s.projectionMatrix,c=e.material.resolution,m=e.matrixWorld,d=e.geometry,x=d.attributes.instanceStart,p=d.attributes.instanceEnd,j=Math.min(d.instanceCount,x.count),h=-s.near;Ue.at(1,_e),_e.w=1,_e.applyMatrix4(s.matrixWorldInverse),_e.applyMatrix4(i),_e.multiplyScalar(1/_e.w),_e.x*=c.x/2,_e.y*=c.y/2,_e.z=0,Mt.copy(_e),Et.multiplyMatrices(s.matrixWorldInverse,m);for(let w=0,O=j;w<O;w++){if(de.fromBufferAttribute(x,w),he.fromBufferAttribute(p,w),de.w=1,he.w=1,de.applyMatrix4(Et),he.applyMatrix4(Et),de.z>h&&he.z>h)continue;if(de.z>h){const b=de.z-he.z,E=(de.z-h)/b;de.lerp(he,E)}else if(he.z>h){const b=he.z-de.z,E=(he.z-h)/b;he.lerp(de,E)}de.applyMatrix4(i),he.applyMatrix4(i),de.multiplyScalar(1/de.w),he.multiplyScalar(1/he.w),de.x*=c.x/2,de.y*=c.y/2,he.x*=c.x/2,he.y*=c.y/2,me.start.copy(de),me.start.z=0,me.end.copy(he),me.end.z=0;const S=me.closestPointToPointParameter(Mt,!0);me.at(S,Zt);const _=an.lerp(de.z,he.z,S),G=_>=-1&&_<=1,f=Mt.distanceTo(Zt)<Ke*.5;if(G&&f){me.start.fromBufferAttribute(x,w),me.end.fromBufferAttribute(p,w),me.start.applyMatrix4(m),me.end.applyMatrix4(m);const b=new F,E=new F;Ue.distanceSqToSegment(me.start,me.end,E,b),n.push({point:E,pointOnLine:b,distance:Ue.origin.distanceTo(E),object:e,face:null,faceIndex:w,uv:null,[ln]:null})}}}class un extends Sn{constructor(s=new Rt,n=new Ft({color:Math.random()*16777215})){super(s,n),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const s=this.geometry,n=s.attributes.instanceStart,i=s.attributes.instanceEnd,r=new Float32Array(2*n.count);for(let m=0,d=0,x=n.count;m<x;m++,d+=2)Jt.fromBufferAttribute(n,m),Xt.fromBufferAttribute(i,m),r[d]=d===0?0:r[d-1],r[d+1]=r[d]+Jt.distanceTo(Xt);const c=new Ct(r,2,1);return s.setAttribute("instanceDistanceStart",new Ye(c,1,0)),s.setAttribute("instanceDistanceEnd",new Ye(c,1,1)),this}raycast(s,n){const i=this.material.worldUnits,r=s.camera;r===null&&!i&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const c=s.params.Line2!==void 0&&s.params.Line2.threshold||0;Ue=s.ray;const m=this.matrixWorld,d=this.geometry,x=this.material;Ke=x.linewidth+c,d.boundingSphere===null&&d.computeBoundingSphere(),yt.copy(d.boundingSphere).applyMatrix4(m);let p;if(i)p=Ke*.5;else{const h=Math.max(r.near,yt.distanceToPoint(Ue.origin));p=Qt(r,h,x.resolution)}if(yt.radius+=p,Ue.intersectsSphere(yt)===!1)return;d.boundingBox===null&&d.computeBoundingBox(),xt.copy(d.boundingBox).applyMatrix4(m);let j;if(i)j=Ke*.5;else{const h=Math.max(r.near,xt.distanceToPoint(Ue.origin));j=Qt(r,h,x.resolution)}xt.expandByScalar(j),Ue.intersectsBox(xt)!==!1&&(i?Ln(this,n):Cn(this,r,n))}onBeforeRender(s){const n=this.material.uniforms;n&&n.resolution&&(s.getViewport(St),this.material.uniforms.resolution.value.set(St.z,St.w))}}class jn extends un{constructor(s=new fn,n=new Ft({color:Math.random()*16777215})){super(s,n),this.isLine2=!0,this.type="Line2"}}const Pn=a.forwardRef(function({points:s,color:n=16777215,vertexColors:i,linewidth:r,lineWidth:c,segments:m,dashed:d,...x},p){var j,h;const w=At(G=>G.size),O=a.useMemo(()=>m?new un:new jn,[m]),[A]=a.useState(()=>new Ft),S=(i==null||(j=i[0])==null?void 0:j.length)===4?4:3,_=a.useMemo(()=>{const G=m?new Rt:new fn,f=s.map(b=>{const E=Array.isArray(b);return b instanceof F||b instanceof et?[b.x,b.y,b.z]:b instanceof on?[b.x,b.y,0]:E&&b.length===3?[b[0],b[1],b[2]]:E&&b.length===2?[b[0],b[1],0]:b});if(G.setPositions(f.flat()),i){n=16777215;const b=i.map(E=>E instanceof jt?E.toArray():E);G.setColors(b.flat(),S)}return G},[s,m,i,S]);return a.useLayoutEffect(()=>{O.computeLineDistances()},[s,O]),a.useLayoutEffect(()=>{d?A.defines.USE_DASH="":delete A.defines.USE_DASH,A.needsUpdate=!0},[d,A]),a.useEffect(()=>()=>{_.dispose(),A.dispose()},[_]),a.createElement("primitive",Vt({object:O,ref:p},x),a.createElement("primitive",{object:_,attach:"geometry"}),a.createElement("primitive",Vt({object:A,attach:"material",color:n,vertexColors:!!i,resolution:[w.width,w.height],linewidth:(h=r??c)!==null&&h!==void 0?h:1,dashed:d,transparent:S===4},x)))});function Ee({ariaLabel:e,value:s,min:n,max:i,step:r,onChange:c,disabled:m=!1}){const[d,x]=a.useState(()=>String(s)),p=a.useRef(!1);a.useEffect(()=>{p.current||x(String(s))},[s]);const j=()=>{p.current=!1;const h=Number(d);if(!Number.isFinite(h)){x(String(s));return}const w=Math.min(i,Math.max(n,h));c(w),x(String(w))};return t.jsx("input",{className:"colmap-number-input","aria-label":e,type:"number",min:n,max:i,step:r,value:d,disabled:m,onFocus:()=>{p.current=!0},onChange:h=>{const w=h.currentTarget.value;x(w);const O=Number(w);w!==""&&Number.isFinite(O)&&c(Math.min(i,Math.max(n,O)))},onBlur:j,onKeyDown:h=>{h.key==="Enter"&&h.currentTarget.blur()}})}const An=e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4,Lt=e=>Math.round(An(e/255)*255),Ot="KOSMOFPK",it=new Map,Pt=new Map,Rn=e=>{Pt.delete(e),it.delete(e)},Ve=async(e,s,n,i)=>{if(it.get(e)==="full"){const d=Pt.get(e);if(d){const x=await d;if(x.byteLength<n+1)throw new Error("Packed scene is truncated");return x.subarray(s,n+1)}it.delete(e)}const r=await fetch(e,{headers:{Range:`bytes=${s}-${n}`},signal:i});if(!r.ok)throw new Error("Packed scene unavailable");const c=new Uint8Array(await r.arrayBuffer()),m=n-s+1;if(r.status===206){if(it.set(e,"range"),c.byteLength!==m)throw new Error("Packed scene range is truncated");return c}if(r.status===200&&(it.set(e,"full"),Pt.set(e,Promise.resolve(c)),c.byteLength>=n+1))return c.subarray(s,n+1);throw new Error("Packed scene range is unavailable")},Fn=async(e,s)=>{const n=await Ve(e,0,11,s);if(new TextDecoder().decode(n.subarray(0,8))!==Ot)throw new Error("Invalid packed scene");const r=new DataView(n.buffer,n.byteOffset,n.byteLength).getUint32(8,!0),c=await Ve(e,12,11+r,s);return{...JSON.parse(new TextDecoder().decode(c)),frameDataOffset:12+r}},On=(e,s)=>{if(!s||!e.frames?.length||e.frames.length<=s)return e;const n=e.frames.slice(0,s),i=Math.max(1,e.segmentsPerCamera||8)*6,r=Math.min(n.length,Math.floor(e.frustums.length/i));return{...e,frames:n,frustums:e.frustums.slice(0,r*i),frustumColors:e.frustumColors?.slice(0,r*i),trajectory:e.trajectory?.slice(0,Math.min(e.trajectory.length,n.length*6)),numImages:Math.min(e.numImages,n.length)}},dn="KOSMOPNT",Yt=e=>{if(e.byteLength<12)throw new Error("Point scene is truncated");const s=new TextDecoder().decode(e.subarray(0,8));if(s!==Ot&&s!==dn)throw new Error("Invalid point scene");const i=12+new DataView(e.buffer,e.byteOffset,e.byteLength).getUint32(8,!0);if(e.byteLength<i)throw new Error("Point scene header is truncated");const r=JSON.parse(new TextDecoder().decode(e.subarray(12,i)));if(!Array.isArray(r.frames))throw new Error("Point scene index is invalid");return{...r,frameDataOffset:i,bytes:e}},_n=e=>e.replace(/\/points-pack\/([^/]+)\.pack(?:$|\?)/,"/points-pack-compact/$1.qpack"),Nn=async(e,s)=>{const n=await Ve(e,0,11,s),i=new TextDecoder().decode(n.subarray(0,8));if(i!==Ot&&i!==dn)throw new Error("Invalid point scene");const r=new DataView(n.buffer,n.byteOffset,n.byteLength).getUint32(8,!0),c=await Ve(e,12,11+r,s),m=JSON.parse(new TextDecoder().decode(c));if(!Array.isArray(m.frames))throw new Error("Point scene index is invalid");return{...m,frameDataOffset:12+r}},Un=async(e,s,n,i)=>{const r=_n(e),c=(r===e?[e]:[r,e]).map(d=>/\/eth3d-[^/]+\.(?:qpack|pack)$/.test(d)?`${d}?v=padding-mask-20261019`:d);let m=new Error("Point scene unavailable");for(const d of c)try{if(i){const S=await Nn(d,n),_=S.frames.slice(0,i),G=_[_.length-1],f=G?.offset!==void 0&&G.byteLength!==void 0?S.frameDataOffset+G.offset+G.byteLength-1:-1;if(f>=S.frameDataOffset){const b=await Ve(d,0,f,n);return s?.(b.byteLength,f+1),{...S,frames:_,frameDataOffset:S.frameDataOffset,bytes:b}}}const x=await fetch(d,{signal:n});if(!x.ok)throw new Error("Point scene unavailable");const p=Number(x.headers.get("content-length")||0);if(!x.body)return Yt(new Uint8Array(await x.arrayBuffer()));const j=x.body.getReader(),h=[];let w=0;for(;;){const{done:S,value:_}=await j.read();if(S)break;_&&(h.push(_),w+=_.byteLength,s?.(w,p))}const O=new Uint8Array(w);let A=0;return h.forEach(S=>{O.set(S,A),A+=S.byteLength}),s?.(w,p||w),Yt(O)}catch(x){if(m=x,n?.aborted)throw x}throw m},hn="KOSMORGB",mn="KOSMOWEB",en=e=>{if(e.byteLength<12)throw new Error("RGB scene is truncated");const s=new TextDecoder().decode(e.subarray(0,8));if(s!==hn&&s!==mn)throw new Error("Invalid RGB scene");const i=12+new DataView(e.buffer,e.byteOffset,e.byteLength).getUint32(8,!0);if(e.byteLength<i)throw new Error("RGB scene header is truncated");const r=JSON.parse(new TextDecoder().decode(e.subarray(12,i)));if(!Array.isArray(r.frames))throw new Error("RGB scene index is invalid");return{...r,payloadOffset:i,bytes:e}},kn=async(e,s)=>{const n=await Ve(e,0,11,s),i=new TextDecoder().decode(n.subarray(0,8));if(i!==hn&&i!==mn)throw new Error("Invalid RGB scene");const r=new DataView(n.buffer,n.byteOffset,n.byteLength).getUint32(8,!0),c=await Ve(e,12,11+r,s),m=JSON.parse(new TextDecoder().decode(c));if(!Array.isArray(m.frames))throw new Error("RGB scene index is invalid");return{...m,payloadOffset:12+r}},tn=async(e,s,n,i)=>{if(i)try{const h=await kn(e,n),w=h.frames.slice(0,i),O=w[w.length-1],A=O?h.payloadOffset+O.offset+O.byteLength-1:-1;if(A>=h.payloadOffset){const S=await Ve(e,0,A,n);return s?.(S.byteLength,A+1),{...h,frames:w,bytes:S}}}catch(h){if(n?.aborted)throw h}const r=await fetch(e,{signal:n});if(!r.ok)throw new Error("RGB scene unavailable");const c=Number(r.headers.get("content-length")||0);if(!r.body){const h=new Uint8Array(await r.arrayBuffer());return s?.(h.byteLength,c||h.byteLength),en(h)}const m=r.body.getReader(),d=[];let x=0;for(;;){const{done:h,value:w}=await m.read();if(h)break;w&&(d.push(w),x+=w.byteLength,s?.(x,c))}const p=new Uint8Array(x);let j=0;return d.forEach(h=>{p.set(h,j),j+=h.byteLength}),s?.(x,c||x),en(p)};function Bn({trajectory:e,forwards:s,follow:n,playing:i,mode:r,autoRotate:c,cameraDistance:m,thirdPersonDistance:d,referenceDistance:x,referenceLookAhead:p,referenceHeight:j,frameIndex:h,smooth:w,manualFrameToken:O}){const A=a.useRef(null),S=a.useRef(0),_=a.useRef(O),{camera:G}=At(),f=a.useMemo(()=>{if(!e?.length)return[];const z=[];for(let q=0;q+2<e.length;q+=6)z.push(new F(e[q],e[q+1],e[q+2]));const I=e.length-3;return I>=0&&z.push(new F(e[I],e[I+1],e[I+2])),z},[e]),b=a.useMemo(()=>{if(f.length<3||w<=0)return f;const z=w*40,I=Math.max(1,Math.round(z*3)),q=[];for(let J=0;J<f.length;J+=1){const te=Math.max(0,J-I),ie=Math.min(f.length-1,J+I),N=new F;let ne=0;for(let K=te;K<=ie;K+=1){const pe=K-J,v=Math.exp(-.5*(pe/z)**2);N.addScaledVector(f[K],v),ne+=v}q.push(N.multiplyScalar(1/Math.max(ne,1e-8)))}return q},[f,w]),E=a.useMemo(()=>{if(!s?.length)return null;const z=[];for(let I=0;I+2<s.length;I+=3)z.push(new F(s[I],s[I+1],s[I+2]));return z},[s]),B=a.useMemo(()=>{if(!E||E.length<3||w<=0)return E;const z=w*40,I=Math.max(1,Math.round(z*3));return E.map((q,J)=>{const te=Math.max(0,J-I),ie=Math.min(E.length-1,J+I),N=new F;let ne=0;for(let K=te;K<=ie;K+=1){const pe=K-J,v=Math.exp(-.5*(pe/z)**2);N.addScaledVector(E[K],v),ne+=v}return N.multiplyScalar(1/Math.max(ne,1e-8)).normalize()})},[E,w]);return a.useEffect(()=>{O!==_.current&&(_.current=O,S.current=.45)},[O]),sn((z,I)=>{const q=S.current>0;if(!n||!i&&!q||r==="Free (Fixed View)"||f.length<2)return;const J=Math.min(Math.max(h,0),f.length-2),te=b[J].clone(),ie=b[Math.min(J+1,b.length-1)].clone();te.applyAxisAngle(new F(0,0,1),Math.PI),ie.applyAxisAngle(new F(0,0,1),Math.PI);const N=B?.[J]?.clone()??ie.sub(te);if(N.applyAxisAngle(new F(0,0,1),Math.PI),N.lengthSq()<1e-8)return;N.normalize();let ne,K;r==="First-Person"?(K=te.clone(),ne=te.clone().addScaledVector(N,m)):r==="Reference Follow (Frustum)"?(K=te.clone().addScaledVector(N,-m*x),K.y+=m*j,ne=te.clone().addScaledVector(N,m*p)):(ne=te.clone().addScaledVector(N,m*.1),K=te.clone().addScaledVector(N,-m*d),K.y+=m*.18);const pe=Math.min(1,I*4);G.position.lerp(K,pe),A.current?(A.current.target.lerp(ne,pe),A.current.update()):G.lookAt(ne),i||(S.current=Math.max(0,S.current-I))}),t.jsx(xn,{ref:A,makeDefault:!0,enableDamping:!0,dampingFactor:.08,autoRotate:!n&&c,autoRotateSpeed:1.5,target:[0,0,0]})}const zn=40;function nn({data:e,frameIndex:s,sourceUrl:n,displayFrame:i=!0,onPreloadProgress:r,onFrameReady:c}){const m=a.useRef(null),d=a.useRef(new Map),x=a.useRef([]),p=a.useRef(null),j=a.useRef(null),h=a.useRef(new Set),w=a.useRef(new Set),O=a.useRef(new Set),A=a.useRef(r),S=a.useRef(c),[_,G]=a.useState(null),[f,b]=a.useState({url:"",status:"loading"}),E=Math.min(Math.max(s,0),Math.max(0,(e.frames?.length||1)-1)),B=e.frames?.[E],z=Math.max(1,e.pixelStride||1),q=n.match(/\/points-pack\/([^/]+)\.pack(?:$|\?)/)?.[1],J=q?n.replace(/\/points-pack\/[^/]+\.pack(?:$|\?)/,`/video-pack-webp/${q}.webppack`):"",te=q?n.replace(/\/points-pack\/[^/]+\.pack(?:$|\?)/,`/video-pack/${q}.rgbpack`):"",ie=v=>`${J}#frame-${v.index}`,N=B?ie(B):"",ne=v=>n.replace(/\/points-pack\/[^/]+\.pack(?:$|\?)/,`/points-frames/${q}/frame-${String(v.index).padStart(5,"0")}.bin`),K=v=>{if(v&&h.current.add(v),!p.current){const X=(W,oe)=>{h.current.forEach(P=>P(W,oe))},M=e.frames?.length;p.current=tn(J,X,j.current?.signal,M).catch(()=>tn(te,X,j.current?.signal,M))}return p.current},pe=v=>{const X=ie(v);let M=d.current.get(X);return M||(M=(async()=>{try{const W=await K(),oe=W,P=oe.frames.find(ae=>ae.index===v.index);if(!P)throw new Error("RGB frame is missing");const se=oe.payloadOffset+P.offset,R=se+P.byteLength;if(W.bytes.byteLength<R)throw new Error("RGB frame is truncated");const U=W.bytes.subarray(se,R);return W.format==="prompt-frame-webp-pack-v1"?{width:P.width,height:P.height,encoded:U}:{width:P.width,height:P.height,colors:U}}catch{const W=ne(v),oe=Math.max(1,(v.width||1)*z),P=Math.max(1,(v.height||1)*z),se=await fetch(W);if(!se.ok)throw new Error("Prompt frame unavailable");const R=new Uint8Array(await se.arrayBuffer());if(R.byteLength<4)throw new Error("Prompt frame is empty");const U=new DataView(R.buffer,R.byteOffset,4).getUint32(0,!0),ae=4+U*3*4;if(R.byteLength<ae+U*3)throw new Error("Prompt frame is truncated");return{width:oe,height:P,colors:new Uint8Array(R.slice(ae,ae+U*3))}}})(),d.current.set(X,M),M.then(()=>{for(x.current.includes(X)||x.current.push(X);x.current.length>zn;){const W=x.current.shift();W&&d.current.delete(W)}}).catch(()=>{d.current.delete(X)})),M};return a.useEffect(()=>{A.current=r},[r]),a.useEffect(()=>{S.current=c},[c]),a.useEffect(()=>{j.current?.abort(),j.current=new AbortController,p.current=null,h.current.clear(),d.current.clear(),x.current=[],w.current.clear(),O.current.clear(),A.current?.(0,0),S.current?.(!1);const v=m.current;v&&(v.width=1,v.height=1,v.getContext("2d")?.clearRect(0,0,1,1))},[n]),a.useEffect(()=>{if(!B||!N){G(null),b({url:N,status:"error"}),S.current?.(!0);return}G(null),b({url:N,status:"loading"}),S.current?.(!1);let v=!0;return pe(B).then(M=>{v&&(G(M),b({url:N,status:"ready"}),S.current?.(!0))}).catch(()=>{v&&(G(null),b({url:N,status:"error"}),S.current?.(!0))}),()=>{v=!1}},[e.pixelStride,B,N,n]),a.useEffect(()=>{const v=e.frames;if(!v?.length||!q)return;let X=!1;const M=v;w.current.size||M.forEach(P=>w.current.add(ie(P)));const W=()=>{const P=w.current.size,se=Array.from(w.current).filter(R=>O.current.has(R)).length;A.current?.(se,P)};return W(),K((P,se)=>{if(X||!se)return;const R=Math.min(M.length,Math.floor(P/se*M.length));A.current?.(R,M.length)}).then(()=>{X||(M.forEach(P=>O.current.add(ie(P))),W())}).catch(()=>{if(X)return;let P=0;const se=async()=>{for(;!X&&P<M.length;){const R=M[P];P+=1;const U=ie(R);try{await pe(R)}catch{}O.current.add(U),W()}};Promise.all([se(),se()])}),()=>{X=!0}},[e.frames,te,q,z,n]),a.useEffect(()=>{const v=m.current;if(!v||!B||!i)return;const X=f.url===N,M=X&&f.status==="ready"?_:null;if(!X||f.status==="loading")return;const W=M?M.width:Math.max(1,B.width||1),oe=M?M.height:Math.max(1,B.height||1);let P=!0;return(async()=>{if(M?.encoded){const k=M.encoded.buffer.slice(M.encoded.byteOffset,M.encoded.byteOffset+M.encoded.byteLength),Z=await createImageBitmap(new Blob([k],{type:"image/webp"}));if(!P){Z.close();return}v.width=W,v.height=oe;const ce=v.getContext("2d");if(!ce){Z.close();return}ce.drawImage(Z,0,0,W,oe),Z.close();return}v.width=W,v.height=oe;const R=v.getContext("2d");if(!R)return;const U=e.frameOffsets?.[E]??e.frames?.slice(0,E).reduce((k,Z)=>k+Z.points,0)??0,ae=M?.colors??(e.colors instanceof Uint8Array?e.colors:Uint8Array.from(e.colors)),tt=M?0:U,nt=Math.min(W*oe,M?Math.floor(ae.length/3):Math.min(B.points,Math.max(0,Math.floor(ae.length/3)-U))),Le=R.createImageData(W,oe);for(let k=0;k<nt;k+=1){const Z=(tt+k)*3,ce=k*4;Le.data[ce]=ae[Z],Le.data[ce+1]=ae[Z+1],Le.data[ce+2]=ae[Z+2],Le.data[ce+3]=255}R.putImageData(Le,0,0)})(),()=>{P=!1}},[e,i,B,f,N,_,E]),t.jsx("div",{className:"colmap-prompt-frame",children:t.jsx("canvas",{ref:m,"aria-label":`Input frame ${B?B.index+1:""}`})})}function Dn({data:e,pointScale:s,adaptivePointSize:n,pointDownsample:i,confidencePercentile:r,cameraScale:c,pointOpacity:m,cameraOpacity:d,cameraLineWidth:x,cameraDownsample:p,showTrajectory:j,autoRotate:h,followTrajectory:w,followPlaying:O,playMode:A,followFrameIndex:S,followSmooth:_,thirdPersonDistance:G,referenceDistance:f,referenceLookAhead:b,referenceHeight:E,voxelize:B,voxelSize:z,pointsVisible:I,initialView:q,manualFrameToken:J}){const te=a.useRef({scene:null,percentile:-1,buffer:null,key:"",cutoffs:[]}),ie=a.useRef(null),N=a.useRef(null),{pointGeometry:ne,cameraLinePoints:K,cameraLineColors:pe,trajectoryGeometry:v,trajectoryPoints:X,trajectoryForwards:M,cameraPosition:W,cameraDistance:oe,gridSize:P}=a.useMemo(()=>{const U=(e.segmentsPerCamera||8)*6,ae=Math.floor(e.frustums.length/U),tt=Array.from({length:ae},(o,g)=>g).filter(o=>o%Math.max(1,p)===0),nt=Math.min(Math.max(S,0),Math.max(0,ae-1)),Le=e.frames?.length?A==="First-Person"?[]:[nt]:tt,k=Le.flatMap(o=>e.frustums.slice(o*U,(o+1)*U)),Z=e.frames?.length?(()=>{const o=new Float32Array(k.length);return Le.forEach((g,L)=>{const $=g/Math.max(1,ae-1)*.82,H=new jt().setHSL($,.78,.5),l=L*U;for(let u=0;u<U;u+=3)o[l+u]=H.r,o[l+u+1]=H.g,o[l+u+2]=H.b}),o})():e.frustumColors?.length===e.frustums.length?Float32Array.from(Le.flatMap(o=>e.frustumColors.slice(o*U,(o+1)*U)),o=>o/255):e.frustumColors?.length?Float32Array.from(e.frustumColors,o=>o/255):null,ce=new wt;let D,Ie;if(e.center&&e.span)D=new F(...e.center),Ie=e.span;else{const o=[0,1,2].map(u=>{const V=[];for(let C=u;C<e.points.length;C+=3)V.push(e.points[C]);return V.sort((C,Y)=>C-Y),V}),g=(u,V)=>u[Math.min(u.length-1,Math.max(0,Math.floor(u.length*V)))],L=o.map(u=>g(u,.01)),$=o.map(u=>g(u,.99));let H=0;for(let u=0;u<e.points.length;u+=3){const V=[e.points[u],e.points[u+1],e.points[u+2]];V.every((C,Y)=>C>=L[Y]&&C<=$[Y])&&(ce.expandByPoint(new F(V[0],V[1],V[2])),H+=1)}for(let u=0;u<k.length;u+=U)ce.expandByPoint(new F(k[u],k[u+1],k[u+2]));if(!H)for(let u=0;u<e.points.length;u+=3)ce.expandByPoint(new F(e.points[u],e.points[u+1],e.points[u+2]));ce.isEmpty()&&ce.setFromCenterAndSize(new F,new F(2,2,2)),D=ce.getCenter(new F);const l=ce.getSize(new F);Ie=Math.max(l.x,l.y,l.z,1)}const ke=e.frames?.length?Math.max(1,Math.ceil(i/Math.max(1,e.pixelStride||1))):1,st=e.frames?.length&&e.frames.every(o=>(o.width||0)>0&&(o.height||0)>0)?e.frames:null,T=e.points instanceof Float32Array?e.points:Float32Array.from(e.points),Ce=e.confidence instanceof Float32Array&&e.confidence.length===e.points.length/3?e.confidence:null,Te=Math.max(1,e.chunkSize||25),Be=e.frames?.length&&e.frames.every(o=>Number.isFinite(o.confidenceCutoff))?e.frames.map(o=>o.confidenceCutoff):null;let be=[];if(!Be&&Ce&&Ce.length&&r>0){const o=te.current;if(o.scene!==e.frames||o.percentile!==r||o.buffer!==Ce.buffer){const L=e.frameOffsets,$=e.frames?.map(C=>C.points)||[],H=[],l=C=>L?.[C]??$.slice(0,C).reduce((Y,Me)=>Y+Me,0),u=C=>L?.[C+1]??l(C)+($[C]||0),V=Math.ceil((e.frames?.length||0)/Te);for(let C=0;C<V;C+=1){const Y=C*Te,Me=Math.min(e.frames?.length||0,Y+Te),$e=l(Y),je=u(Me-1),He=[];for(let ye=$e;ye<je;ye+=1){const fe=Ce[ye];Number.isFinite(fe)&&He.push(fe)}He.sort((ye,fe)=>ye-fe),H.push(He[Math.min(He.length-1,Math.floor(He.length*r/100))]??-1/0)}o.scene=e.frames,o.percentile=r,o.buffer=Ce.buffer,o.cutoffs=H,o.key=H.join(",")}be=o.cutoffs}const We=Be?`saved:${Be.join(",")}`:be.join(","),ct=o=>Be?Be[o]:be.length?be[Math.min(be.length-1,Math.floor(o/Te))]??-1/0:-1/0,lt=(o,g)=>Number.isFinite(o)&&(Be?o>=g:o>g),re=ie.current;let xe=null;if(e.frameOffsets?.length){const o=N.current;if(o&&o.scene===e.frames&&o.buffer===T.buffer&&o.cutoff===We)xe=o.offsets;else{xe=[0];for(let g=0;g<e.frameOffsets.length-1;g+=1){const L=e.frameOffsets[g],$=e.frameOffsets[g+1];let H=0;for(let l=L;l<$;l+=1){const u=l*3,V=Number.isFinite(T[u])&&Number.isFinite(T[u+1])&&Number.isFinite(T[u+2]),C=!Ce||lt(Ce[l],ct(g));V&&C&&(H+=1)}xe.push(xe[xe.length-1]+H)}N.current={scene:e.frames,buffer:T.buffer,cutoff:We,offsets:xe}}}const Ae=re&&re.scene===e.frames&&re.buffer===T.buffer&&re.stride===ke&&re.cutoff===We&&re.voxelize===B&&re.voxelSize===z&&re.center[0]===D.x&&re.center[1]===D.y&&re.center[2]===D.z&&T.length>=re.sourceLength&&(!B||T.length===re.sourceLength),ze=Ae?re.geometry:new qt,rt=xe?.[xe.length-1]??Math.ceil(T.length/(3*ke));let le=Ae?re.positions:new Float32Array(Math.max(1024,rt*3)),Re=Ae?re.colors:new Uint8Array(le.length),Se=Ae?re.count*3:0;const ot=Ae?re.sourceLength:0,ft=o=>{if(le.length>=o)return;const g=new Float32Array(Math.max(o,le.length*2)),L=new Uint8Array(g.length);g.set(le),L.set(Re),le=g,Re=L},Je=B?new Set:null,at=(o,g)=>{const L=Math.floor(o/3);if(!(!Number.isFinite(T[o])||!Number.isFinite(T[o+1])||!Number.isFinite(T[o+2]))&&!(Ce&&!lt(Ce[L],g))){if(Je){const $=`${Math.floor(T[o]/z)},${Math.floor(T[o+1]/z)},${Math.floor(T[o+2]/z)}`;if(Je.has($))return;Je.add($)}ft(Se+3),le[Se]=T[o]-D.x,le[Se+1]=T[o+1]-D.y,le[Se+2]=T[o+2]-D.z,Re[Se]=Lt(e.colors[o]),Re[Se+1]=Lt(e.colors[o+1]),Re[Se+2]=Lt(e.colors[o+2]),Se+=3}};if(st){let o=0;for(const[g,L]of st.entries()){const $=L.width||0,H=L.height||0,l=o+L.points*3;if(l>ot&&o<T.length)for(let u=0;u<H;u+=ke)for(let V=0;V<$;V+=ke){const C=o+(u*$+V)*3;C<T.length&&at(C,ct(g))}if(o=l,o>=T.length)break}}else for(let o=ot;o<T.length;o+=3*ke)at(o,-1/0);const Ge=Math.floor(Se/3),ut=B?Ge:xe?xe[Math.min(xe.length-1,Math.max(0,S+1))]??Ge:Ge;(!Ae||T.length>(re?.sourceLength||0))&&(ze.setAttribute("position",new pt(le,3)),ze.setAttribute("color",new pt(Re,3,!0)),ze.computeBoundingSphere()),ze.setDrawRange(0,Math.min(Ge,ut)),ie.current={scene:e.frames,buffer:T.buffer,sourceLength:T.length,stride:ke,cutoff:We,voxelize:B,voxelSize:z,center:[D.x,D.y,D.z],geometry:ze,positions:le,colors:Re,count:Ge};const Fe=new Float32Array(k.length);for(let o=0;o*U<k.length;o+=1){const g=o*U,L=new F(k[g]-D.x,k[g+1]-D.y,k[g+2]-D.z);let $=0;for(let l=3;l<U&&g+l+2<e.frustums.length;l+=6){const u=new F(k[g+l]-D.x,k[g+l+1]-D.y,k[g+l+2]-D.z);$=Math.max($,u.distanceTo(L))}const H=$>0?Ie*.18/$:1;for(let l=0;l<U&&g+l+2<k.length;l+=3){const u=new F(k[g+l]-D.x,k[g+l+1]-D.y,k[g+l+2]-D.z);u.sub(L).multiplyScalar(c*H).add(L),Fe[g+l]=u.x,Fe[g+l+1]=u.y,Fe[g+l+2]=u.z}}const dt=Array.from({length:Fe.length/3},(o,g)=>[Fe[g*3],Fe[g*3+1],Fe[g*3+2]]),ht=Z?.length===k.length?Array.from({length:Z.length/3},(o,g)=>[Z[g*3],Z[g*3+1],Z[g*3+2]]):void 0,Xe=new qt;let mt=null,Oe=null;if(e.trajectory?.length){const o=e.trajectory,g=j&&e.frames?.length?o.slice(0,Math.min(o.length,Math.max(0,S)*6)):j?o:[],L=new Float32Array(g.length),$=new Float32Array(g.length);for(let l=0;l<g.length;l+=3){L[l]=g[l]-D.x,L[l+1]=g[l+1]-D.y,L[l+2]=g[l+2]-D.z;const u=Math.floor(l/6),V=e.frames?.length?Math.max(1,ae-1):Math.max(1,Math.floor(o.length/6)-1),C=u/V*.82,Y=new jt().setHSL(C,.78,.5);$[l]=Y.r,$[l+1]=Y.g,$[l+2]=Y.b}Xe.setAttribute("position",new pt(L,3)),Xe.setAttribute("color",new pt($,3));const H=new Float32Array(o.length);for(let l=0;l<o.length;l+=3)H[l]=o[l]-D.x,H[l+1]=o[l+1]-D.y,H[l+2]=o[l+2]-D.z;if(mt=H,e.frames?.length&&e.frustums.length>=U){const l=Math.floor(e.frustums.length/U);Oe=new Float32Array(l*3);for(let u=0;u<l;u+=1){const V=u*U,C=new F(e.frustums[V],e.frustums[V+1],e.frustums[V+2]),Y=new F;for(let Me=0;Me<4;Me+=1){const $e=V+3+Me*6;Y.add(new F(e.frustums[$e],e.frustums[$e+1],e.frustums[$e+2]).sub(C))}Y.lengthSq()>1e-8&&Y.normalize(),Oe[u*3]=Y.x,Oe[u*3+1]=Y.y,Oe[u*3+2]=Y.z}}}const De=Ie,bt=q==="top"?[De*.32,De*.94,De*.32]:[De*.62,De*.38,De*.78];return{pointGeometry:ze,cameraLinePoints:dt,cameraLineColors:ht,trajectoryGeometry:Xe,trajectoryPoints:mt,trajectoryForwards:Oe,cameraPosition:bt,cameraDistance:De,gridSize:Ie*2.4}},[p,c,r,e,S,q,A,i,j,B,z]),se=Math.max(P*.004,.012)*s;return t.jsxs(gn,{flat:!0,camera:{position:W,fov:52,near:Math.max(oe*.001,.001),far:Math.max(oe*80,1e3)},onCreated:({camera:R})=>R.lookAt(0,0,0),dpr:[1,1.6],gl:{antialias:!0},children:[t.jsx("color",{attach:"background",args:["#1a1d29"]}),t.jsx("ambientLight",{intensity:1}),t.jsxs("group",{rotation:[0,0,Math.PI],children:[t.jsx("points",{geometry:ne,visible:I,children:t.jsx(In,{basePointSize:se,adaptivePointSize:n,cameraDistance:oe,pointOpacity:m})}),t.jsx(Pn,{visible:I&&!B,points:K,segments:!0,vertexColors:pe,color:pe?"#ffffff":"#ef4444",transparent:!0,opacity:d,lineWidth:x}),v.getAttribute("position")?.count?t.jsx("lineSegments",{visible:I&&!B,geometry:v,children:t.jsx("lineBasicMaterial",{color:"#ffffff",vertexColors:!!e.frames?.length,transparent:!0,opacity:Math.min(1,d+.1)})}):null]}),t.jsx(Bn,{trajectory:X,forwards:M,follow:w,playing:O,mode:A,autoRotate:h,cameraDistance:oe,thirdPersonDistance:G,referenceDistance:f,referenceLookAhead:b,referenceHeight:E,frameIndex:S,smooth:_,manualFrameToken:J})]})}function In({basePointSize:e,adaptivePointSize:s,cameraDistance:n,pointOpacity:i}){const r=a.useRef(null),{camera:c}=At();return sn(()=>{if(!s||!r.current)return;const m=Math.max(c.position.length(),.001),d=Math.max(n*1.18,.001),x=an.clamp(d/m,.45,1.05);r.current.size=e*x}),t.jsx("pointsMaterial",{ref:r,size:e,vertexColors:!0,sizeAttenuation:!0,transparent:i<.999,opacity:i,depthWrite:i>=.999})}function Wn({src:e,sceneLabel:s,processName:n="PoseEngine",processLabel:i="Global BA x1",pointDefaultScale:r=.15,cameraDefaultScale:c=.3,cameraLineDefaultWidth:m=5,defaultPlayMode:d,adaptivePointSize:x=!1,followTrajectory:p=!1,initialView:j="default",maxFrames:h,frameRateDefault:w=10,followSmoothDefault:O=.4,referenceDistanceDefault:A=.12,referenceHeightDefault:S=0}){const[_,G]=a.useState(null),[f,b]=a.useState([]),[E,B]=a.useState(0),[z,I]=a.useState(-1),[q,J]=a.useState(0),[te,ie]=a.useState(!1),[N,ne]=a.useState(!1),[K,pe]=a.useState(0),[v,X]=a.useState(!p),[M,W]=a.useState(null),[oe,P]=a.useState(!1),[se,R]=a.useState(0),[U,ae]=a.useState(r);a.useEffect(()=>{ae(r)},[r]);const[tt,nt]=a.useState(20),[Le,k]=a.useState(c),[Z,ce]=a.useState(!1),[D,Ie]=a.useState(.01),[ke,st]=a.useState(1),[T,Ce]=a.useState(.68),[Te,Be]=a.useState(!0),[be,We]=a.useState(4),[ct,lt]=a.useState(1),[re,xe]=a.useState(m),[Ae,ze]=a.useState(w),rt=d??(p?"Reference Follow (Frustum)":"Free (Fixed View)"),[le,Re]=a.useState(rt),[Se,ot]=a.useState(!0),[ft,Je]=a.useState(O),[at,Ge]=a.useState(.15),[ut,vt]=a.useState(A),[Fe,dt]=a.useState(.05),[ht,Xe]=a.useState(S),[mt,Oe]=a.useState(0),[De,bt]=a.useState(0),o=a.useRef(null),g=a.useRef(new Map);a.useRef(-1);const L=a.useRef(0),$=a.useRef(!1),H=a.useRef(!1),l=a.useRef(new Set);a.useRef(0);const u=a.useRef(null),V=a.useRef({index:-1,count:0,points:new Float32Array,colors:new Uint8Array,sampleStride:-1}),[C,Y]=a.useState(!1),[Me,$e]=a.useState(!1),je=a.useMemo(()=>{try{return new URL(e,window.location.href).toString()}catch{return e}},[e]);a.useMemo(()=>f.map(y=>{const ee=Math.max(1,M?.pixelStride||1),ge=Math.max(1,Math.ceil(be/ee)),ue=y.width||0,we=y.height||0;return ue>0&&we>0?{...y,width:Math.ceil(ue/ge),height:Math.ceil(we/ge),points:Math.ceil(ue/ge)*Math.ceil(we/ge)}:y}),[f,M?.pixelStride,be]),a.useEffect(()=>{const y=()=>Y(document.fullscreenElement===o.current);return document.addEventListener("fullscreenchange",y),()=>document.removeEventListener("fullscreenchange",y)},[]);const He=async()=>{o.current&&(document.fullscreenElement===o.current?await document.exitFullscreen():await o.current.requestFullscreen())};a.useEffect(()=>{let y=!0;const ee=new AbortController;return G(null),W(null),b([]),B(0),I(-1),J(0),ie(!1),ne(!1),pe(0),X(!p),$.current=!1,H.current=!1,u.current=null,g.current.clear(),l.current.clear(),L.current+=1,V.current={index:-1,count:0,points:new Float32Array,colors:new Uint8Array,confidence:void 0,sampleStride:-1},P(!1),R(0),ae(r),nt(20),We(4),lt(1),xe(m),ze(w),Re(rt),ot(!0),Je(O),Ge(.15),vt(A),dt(.05),Xe(S),Oe(0),k(c),ce(!1),Ie(.01),st(1),Ce(.68),Be(!0),(je.endsWith(".pack")?Fn(je,ee.signal):fetch(je,{signal:ee.signal}).then(async ue=>{if(!ue.ok)throw new Error("COLMAP model unavailable");const we=Number(ue.headers.get("content-length")||0);if(!ue.body||!we){const Pe=await ue.json();return y&&R(100),Pe}const Tt=ue.body.getReader(),ve=[];let Q=0;for(;;){const{done:Pe,value:Qe}=await Tt.read();if(Pe)break;Qe&&(ve.push(Qe),Q+=Qe.byteLength,y&&R(Math.min(99,Math.round(Q/we*100))))}const Ze=new Uint8Array(Q);let qe=0;return ve.forEach(Pe=>{Ze.set(Pe,qe),qe+=Pe.byteLength}),y&&R(100),JSON.parse(new TextDecoder().decode(Ze))})).then(ue=>{if(!y)return;R(100);const we=On(ue,h);we.frames?.length?(W(we),b(we.frames),B(0)):G(we)}).catch(()=>{y&&P(!0)}),()=>{y=!1,ee.abort(),Rn(je)}},[c,m,O,p,w,h,r,A,S,rt,je]),a.useEffect(()=>{if(!M||!f.length)return;let y=!0;const ee=new AbortController,ge=++L.current,ue=new Worker(new URL("/Kosmo-GFM/assets/pointSceneWorker-BT4dwWS0.js",import.meta.url),{type:"module"});G(null),I(-1),J(0),ie(!1),ne(!1),R(0),l.current.clear(),u.current=null;const we=ve=>{if(!y||ge!==L.current)return;const Q=ve.data;if(Q.type==="progress"){const Gt=Math.min(f.length,Q.loaded||0);J(Gt),R(Math.min(99,70+Math.round(Gt/Math.max(1,f.length)*30)));return}if(Q.type==="error"||!Q.points||!Q.colors||!Q.frameOffsets||!Q.frames){P(!0);return}const Ze=new Float32Array(Q.points),qe=new Uint8Array(Q.colors),Pe=Q.confidence?new Float32Array(Q.confidence):void 0,Qe={...M,frames:Q.frames,pixelStride:be,points:Ze,colors:qe,confidence:Pe,numPoints:Q.numPoints||Q.frameOffsets[Q.frameOffsets.length-1]||0,frameOffsets:Q.frameOffsets};u.current=Qe,G(Qe),I(f.length-1),J(f.length),ie(!0),R(100)};return ue.addEventListener("message",we),(async()=>{try{const ve=await Un(je,(Ze,qe)=>{if(!y||ge!==L.current)return;const Pe=qe>0?Math.min(1,Ze/qe):0;R(Math.min(70,Math.round(Pe*70))),J(Math.min(f.length,Math.floor(Pe*f.length*.7)))},ee.signal,h);if(!y||ge!==L.current)return;const Q=ve.bytes.buffer;ue.postMessage({buffer:Q,frames:h&&ve.frames?ve.frames.slice(0,h):ve.frames||[],frameDataOffset:ve.frameDataOffset,sourcePixelStride:Math.max(1,ve.pixelStride||M.pixelStride||1),pointDownsample:be,pointFormat:ve.pointFormat,quantMin:ve.quantMin,quantMax:ve.quantMax},[Q])}catch{y&&!ee.signal.aborted&&ge===L.current&&P(!0)}})(),()=>{y=!1,ee.abort(),ue.removeEventListener("message",we),ue.terminate(),L.current+=1,l.current.clear(),u.current=null}},[f,M,h,be,je]),a.useEffect(()=>{if(!N||!te||f.length<2||p&&!v)return;const y=window.setInterval(()=>B(ee=>{const ge=(ee+1)%f.length;return ge===0||z>=ge||l.current.has(ge)?ge:ee}),1e3/Math.max(1,Ae));return()=>window.clearInterval(y)},[te,p,f.length,N,Ae,z,v]);const ye=p&&f.length?f.length:0,fe=!f.length||te&&K>=ye;a.useEffect(()=>{!p||!fe||f.length<2||H.current||(H.current=!0,ne(!0))},[p,f.length,fe]);const _t=f.length?Math.min(100,Math.round(Math.min(f.length,q)/f.length*100)):se,Nt=ye?Math.min(100,Math.round(Math.min(ye,K)/ye*100)):0,Ut=t.jsx("div",{className:"colmap-cache-overlay",role:"status","aria-label":"Loading recognition",children:t.jsxs("div",{className:"colmap-cache-progress",children:[t.jsxs("div",{className:"colmap-cache-progress-row",children:[t.jsx("span",{children:"Loading point cloud"}),t.jsx("strong",{children:f.length?`${Math.min(f.length,q)} / ${f.length}`:`${se}%`}),t.jsx("div",{className:"colmap-loading-track",children:t.jsx("i",{style:{width:`${Math.max(2,_t)}%`}})}),t.jsxs("small",{children:[_t,"%"]})]}),t.jsxs("div",{className:"colmap-cache-progress-row",children:[t.jsx("span",{children:"Loading images"}),t.jsx("strong",{children:ye?`${Math.min(ye,K)} / ${ye}`:"Waiting"}),t.jsx("div",{className:"colmap-loading-track",children:t.jsx("i",{style:{width:`${Math.max(2,Nt)}%`}})}),t.jsx("small",{children:ye?`${Nt}%`:"Waiting"})]})]})}),kt=y=>{!fe||!f.length||(B(Math.min(f.length-1,Math.max(0,y))),Oe(ee=>ee+1))},Bt=y=>{!fe||f.length<2||(B(ee=>(ee+y+f.length)%f.length),Oe(ee=>ee+1))},zt=y=>{pe(ee=>Math.max(ee,y))};if(oe)return t.jsx("div",{className:"colmap-loading",role:"status","aria-label":"Unable to load reconstruction",children:t.jsx("div",{className:"colmap-loading-content",children:t.jsx("span",{children:"Unable to load reconstruction"})})});const pn=je.endsWith(".pack");if(!_&&pn){const y=t.jsx("div",{ref:o,className:"colmap-viewer-shell colmap-points-loading-shell",children:t.jsx("div",{className:"colmap-canvas",children:Ut})});return p?t.jsxs("div",{className:"colmap-prompt-output colmap-prompt-loading",children:[M?t.jsx(nn,{data:M,frameIndex:E,sourceUrl:je,displayFrame:!1,onPreloadProgress:zt,onFrameReady:X}):t.jsx("div",{className:"colmap-prompt-frame colmap-prompt-frame-empty","aria-hidden":"true"}),t.jsx("div",{className:"colmap-prompt-viewer",children:y})]}):y}if(!_)return t.jsx("div",{className:"colmap-loading",role:"status","aria-label":"Loading recognition",children:t.jsxs("div",{className:"colmap-loading-content",children:[t.jsxs("span",{children:["Loading recognition · ",se,"%"]}),t.jsx("div",{className:"colmap-loading-track",children:t.jsx("i",{style:{width:`${Math.max(4,se)}%`}})})]})});const Dt=z>=0?Math.min(E,z):0,It=t.jsxs("div",{ref:o,className:`colmap-viewer-shell${Me?" colmap-info-collapsed":""}`,children:[t.jsx("div",{className:"colmap-canvas",children:t.jsxs("div",{className:"colmap-scene-canvas",children:[t.jsx(Dn,{data:_,pointScale:U,adaptivePointSize:x,pointDownsample:be,confidencePercentile:tt,cameraScale:Le,pointOpacity:ke,cameraOpacity:T,cameraLineWidth:re,cameraDownsample:ct,showTrajectory:Se,autoRotate:Te,followTrajectory:p,followPlaying:N,playMode:le,followFrameIndex:Dt,followSmooth:ft,thirdPersonDistance:at,referenceDistance:ut,referenceLookAhead:Fe,referenceHeight:ht,voxelize:Z,voxelSize:D,pointsVisible:!f.length||fe,initialView:j,manualFrameToken:mt},`${e}-${De}`),f.length>0&&!fe&&Ut,t.jsx("button",{className:"colmap-info-toggle",type:"button",onClick:()=>$e(y=>!y),"aria-expanded":!Me,"aria-label":Me?"Expand side panel":"Collapse side panel",title:Me?"Expand side panel":"Collapse side panel",children:t.jsxs("svg",{viewBox:"0 0 20 20","aria-hidden":"true",children:[t.jsx("rect",{x:"3",y:"3",width:"14",height:"14",rx:"2"}),t.jsx("path",{d:Me?"m11 7-3 3 3 3":"m9 7 3 3-3 3"}),t.jsx("path",{d:"M13.5 3v14"})]})}),t.jsx("button",{className:"colmap-expand",type:"button",onClick:()=>{He()},"aria-label":C?"Exit full screen":"Expand 3D view",title:C?"Exit full screen":"Expand 3D view",children:t.jsx("span",{"aria-hidden":"true",children:C?"⤡":"⤢"})}),f.length>0&&t.jsx("button",{className:`colmap-voxelize${Z?" active":""}`,type:"button",onClick:()=>{ne(!1),ce(y=>!y)},"aria-pressed":Z,"aria-label":Z?"Disable voxelization":"Enable voxelization",title:Z?"Disable voxelization":"Enable voxelization",children:t.jsxs("svg",{viewBox:"0 0 20 20","aria-hidden":"true",children:[t.jsx("path",{d:"m10 1.75 6.5 3.6v9.3L10 18.25 3.5 14.65v-9.3L10 1.75Z"}),t.jsx("path",{d:"M10 1.75v7.1m6.5-3.5L10 8.85l-6.5-3.5M10 8.85v9.4m0-9.4 6.5-3.5M6.3 7.25h7.4M6.3 10.6h7.4"})]})})]})}),t.jsxs("aside",{className:"colmap-info",children:[t.jsxs("dl",{className:"colmap-stats",children:[t.jsxs("div",{children:[t.jsx("dt",{children:"Frames"}),t.jsx("dd",{children:_.numImages.toLocaleString()})]}),!p&&t.jsxs(t.Fragment,{children:[t.jsxs("div",{children:[t.jsx("dt",{children:"Points"}),t.jsx("dd",{children:f.length?_.numPoints.toLocaleString():(_.numPointsTotal||_.numPoints).toLocaleString()})]}),t.jsxs("div",{children:[t.jsx("dt",{children:n}),t.jsx("dd",{children:i})]})]})]}),t.jsxs("details",{className:"colmap-controls",open:!0,children:[t.jsx("summary",{children:"VIEWER SETTINGS"}),t.jsxs("div",{className:`colmap-control-fields${Z?" voxel-mode":""}`,children:[f.length>0&&t.jsxs("div",{className:"colmap-frame-controls",children:[t.jsxs("div",{className:"colmap-frame-heading",children:[t.jsx("span",{children:"Current Frame"}),t.jsx(Ee,{ariaLabel:"Enter current frame",min:1,max:f.length,step:1,value:E+1,disabled:!fe,onChange:y=>kt(y-1)})]}),t.jsx("input",{"aria-label":"Select point-cloud frame",type:"range",min:"0",max:Math.max(0,f.length-1),value:E,disabled:!fe,onChange:y=>kt(Number(y.target.value))}),t.jsxs("div",{className:"colmap-frame-buttons",children:[t.jsx("button",{type:"button",disabled:!fe,onClick:()=>Bt(-1),children:"Previous"}),t.jsx("button",{type:"button",disabled:!fe,onClick:()=>ne(y=>!y),children:N?"Pause":fe?"Play":"Loading"}),t.jsx("button",{type:"button",disabled:!fe,onClick:()=>Bt(1),children:"Next"})]})]}),p&&t.jsxs("label",{className:"colmap-select-control",children:[t.jsx("span",{children:"Playback Mode"}),t.jsxs("select",{value:le,onChange:y=>{Re(y.target.value),Oe(ee=>ee+1)},children:[t.jsx("option",{value:"Free (Fixed View)",children:"Free"}),t.jsx("option",{value:"Reference Follow (Frustum)",children:"Reference Follow"}),t.jsx("option",{value:"Third-Person",children:"Third-Person"})]})]}),f.length>0&&t.jsxs("label",{className:"colmap-select-control",children:[t.jsx("span",{children:"Point-Cloud Downsampling"}),t.jsxs("select",{value:be,onChange:y=>We(Number(y.target.value)),children:[t.jsx("option",{value:"4",children:"4"}),t.jsx("option",{value:"8",children:"8"}),t.jsx("option",{value:"16",children:"16"})]})]}),t.jsxs("label",{className:"colmap-value-control","data-voxel-control":!0,children:[t.jsx("span",{children:"Point Size"}),t.jsx(Ee,{ariaLabel:"Enter point size",min:.001,max:3,step:.001,value:U,onChange:ae})]}),t.jsxs("label",{className:"colmap-value-control",children:[t.jsx("span",{children:"Camera Size"}),t.jsx(Ee,{ariaLabel:"Enter camera size",min:.01,max:3,step:.01,value:Le,onChange:k})]}),f.length>0&&Z&&t.jsxs("label",{className:"colmap-value-control","data-voxel-control":!0,"data-voxel-only":!0,children:[t.jsx("span",{children:"Voxel Size"}),t.jsx(Ee,{ariaLabel:"Enter voxel size",min:.001,max:.1,step:.001,value:D,onChange:Ie})]}),f.length>0&&t.jsxs("label",{className:"colmap-value-control",children:[t.jsx("span",{children:"FPS"}),t.jsx(Ee,{ariaLabel:"Enter FPS",min:1,max:60,step:1,value:Ae,onChange:ze})]}),p&&le!=="Free (Fixed View)"&&t.jsxs("label",{className:"colmap-value-control",children:[t.jsx("span",{children:"Follow Smoothing"}),t.jsx(Ee,{ariaLabel:"Enter follow smoothing",min:0,max:.95,step:.05,value:ft,onChange:Je})]}),p&&le==="Third-Person"&&t.jsxs("label",{className:"colmap-value-control",children:[t.jsx("span",{children:"Third-Person Distance"}),t.jsx(Ee,{ariaLabel:"Enter third-person distance",min:.05,max:1,step:.01,value:at,onChange:Ge})]}),p&&le==="Reference Follow (Frustum)"&&t.jsxs("label",{className:"colmap-value-control",children:[t.jsx("span",{children:"Follow Distance"}),t.jsx(Ee,{ariaLabel:"Enter follow distance",min:0,max:1,step:.01,value:ut,onChange:vt})]}),p&&le==="Reference Follow (Frustum)"&&t.jsxs("label",{className:"colmap-value-control",title:"Scene-span ratio relative to the current trajectory height",children:[t.jsx("span",{children:"Follow Height"}),t.jsx(Ee,{ariaLabel:"Enter follow height",min:-.5,max:1,step:.01,value:ht,onChange:Xe})]}),p&&le==="Reference Follow (Frustum)"&&t.jsxs("label",{className:"colmap-value-control",children:[t.jsx("span",{children:"Look-Ahead Distance"}),t.jsx(Ee,{ariaLabel:"Enter look-ahead distance",min:0,max:1,step:.01,value:Fe,onChange:dt})]}),f.length>0&&t.jsxs("label",{className:"colmap-value-control",children:[t.jsx("span",{children:"Camera Line Width"}),t.jsx(Ee,{ariaLabel:"Enter camera line width",min:.1,max:10,step:.1,value:re,onChange:xe})]}),p&&t.jsxs("label",{className:"colmap-toggle",children:[t.jsx("span",{children:"Show Trajectory"}),t.jsx("input",{type:"checkbox",checked:Se,onChange:y=>ot(y.target.checked)}),t.jsx("output",{children:Se?"ON":"OFF"})]}),!p&&t.jsxs("label",{className:"colmap-value-control",children:[t.jsx("span",{children:"Point Opacity"}),t.jsx(Ee,{ariaLabel:"Enter point opacity",min:.1,max:1,step:.01,value:ke,onChange:st})]}),!p&&t.jsxs("label",{className:"colmap-value-control",children:[t.jsx("span",{children:"Camera Opacity"}),t.jsx(Ee,{ariaLabel:"Enter camera opacity",min:.1,max:1,step:.01,value:T,onChange:Ce})]}),!p&&t.jsxs("label",{className:"colmap-toggle",children:[t.jsx("span",{children:"Auto-Rotate"}),t.jsx("input",{type:"checkbox",checked:Te,onChange:y=>Be(y.target.checked)}),t.jsx("output",{children:Te?"ON":"OFF"})]}),t.jsx("button",{className:"colmap-reset",type:"button",onClick:()=>bt(y=>y+1),children:"Reset View"})]})]})]})]});return p?t.jsxs("div",{className:"colmap-prompt-output",children:[t.jsx(nn,{data:_,frameIndex:Dt,sourceUrl:je,displayFrame:fe,onPreloadProgress:zt,onFrameReady:X}),t.jsx("div",{className:"colmap-prompt-viewer",children:It})]}):It}export{Wn as default};
