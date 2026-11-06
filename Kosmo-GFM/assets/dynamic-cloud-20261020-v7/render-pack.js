const TYPES={Float32Array,Uint8Array,Int32Array,Float64Array};
export function parseRenderPack(buffer){
 const bytes=new Uint8Array(buffer),v=new DataView(buffer);
 if(bytes.length<12||new TextDecoder().decode(bytes.subarray(0,8))!=='GFMVIEW1')throw Error('Invalid scene signature');
 const n=v.getUint32(8,true);if(n>1024*1024||12+n>bytes.length)throw Error('Invalid scene header');
 const h=JSON.parse(new TextDecoder().decode(bytes.subarray(12,12+n))),start=12+n+(4-n%4)%4;
 if(h.version!==1||!Array.isArray(h.sections))throw Error('Unsupported scene version');
 const arrays={};let end=0;
 for(const s of h.sections){const Type=TYPES[s.type];if(!Type||s.shuffle4||!Number.isSafeInteger(s.offset)||!Number.isSafeInteger(s.length)||s.length<0||s.offset<end||s.bytes!==s.length*Type.BYTES_PER_ELEMENT||start+s.offset+s.bytes>bytes.length||(start+s.offset)%Type.BYTES_PER_ELEMENT||arrays[s.name])throw Error('Invalid scene section');
 arrays[s.name]={data:new Type(buffer,start+s.offset,s.length),shape:s.name.endsWith('_xyz')||s.name.endsWith('_rgb')?[s.length/3,3]:[s.length]};end=s.offset+s.bytes;}
 const m=h.meta,T=m.num_frames,d=arrays;
 for(const k of ['static','dynamic','sky'])if(!d[k+'_xyz']||!d[k+'_rgb']||d[k+'_xyz'].data.length%3||d[k+'_rgb'].data.length!==d[k+'_xyz'].data.length)throw Error('Invalid cloud');
 for(const k of ['dynamic','sky']){const o=d[k+'_offsets']?.data;if(o?.length!==T+1||o[0]!==0||o[T]!==d[k+'_xyz'].shape[0])throw Error('Invalid frame ranges');for(let t=0;t<T;t++)if(o[t]<0||o[t]>o[t+1])throw Error('Unordered frame ranges');}
 if(!T||m.frames.length!==T||d.pred_w2c?.data.length!==T*16||d.pred_K?.data.length!==T*9||d.trail_position?.data.length!==d.trail_color?.data.length||d.trail_position.data.length!==d.trail_time?.data.length*3||d.trail_frame_counts?.data.length!==T)throw Error('Incomplete scene');
 let last=0;for(const count of d.trail_frame_counts.data){if(count<last||count%2||count>d.trail_time.data.length)throw Error('Invalid trail ranges');last=count;}
 if(last!==d.trail_time.data.length)throw Error('Incomplete trails');
 for(const key of ['focusBounds','defaultBounds'])if(m[key]?.center.length!==3||!m[key].center.every(Number.isFinite)||!(m[key].radius>0))throw Error('Invalid view bounds');
 if(!(m.objectPitch>0)||m.fixedTrackCount!==2048)throw Error('Invalid render metadata');
 return {meta:m,arrays};
}
