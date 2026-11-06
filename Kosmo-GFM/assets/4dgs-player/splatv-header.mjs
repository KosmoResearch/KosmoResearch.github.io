// Header-only validation can run before storing a local File or allocating GPU data.
export function readSplatvHeader(prefix,totalSize=prefix.byteLength,{allowLegacyPadding=false}={}){
 if(prefix.byteLength<8)throw Error('splatv 文件头不完整');
 const view=new DataView(prefix);if(view.getUint32(0,true)!==0x674b)throw Error('Invalid splatv magic：不是有效的 splatv 文件');
 const length=view.getUint32(4,true);if(!length||length>1048576||8+length>prefix.byteLength||8+length>totalSize)throw Error('splatv 文件头长度无效');
 let chunks;try{chunks=JSON.parse(new TextDecoder().decode(new Uint8Array(prefix,8,length)));}catch{throw Error('splatv 文件头 JSON 无效');}
 if(!Array.isArray(chunks)||!chunks.length)throw Error('splatv 没有数据块');
 let offset=8+length;const entries=[],warnings=[];
 for(const raw of chunks){
  if(!raw||!Number.isSafeInteger(raw.size)||raw.size<0)throw Error('splatv 数据块长度无效');
  const meta={...raw};let size=meta.size;
  if(offset+size>totalSize){
   const remaining=totalSize-offset,row=meta.texwidth*16;
   // Legacy exporter declares a padded texture but writes only complete 64-byte records.
   // Accept only a single, count-less splat chunk with a missing final-row padding tail.
   const legacy=allowLegacyPadding&&chunks.length===1&&meta.type==='splat'&&meta.count===undefined&&Number.isSafeInteger(meta.texwidth)&&meta.texwidth>0&&meta.texwidth%4===0&&Number.isSafeInteger(meta.texheight)&&meta.texheight>0&&size===row*meta.texheight&&remaining>0&&remaining%64===0&&Math.ceil(remaining/row)===meta.texheight;
   if(!legacy)throw Error('Truncated splatv chunk：文件数据不完整');
   size=remaining;meta.size=size;meta.count=size/64;warnings.push('已兼容旧导出格式的行末补齐长度');
  }
  if(meta.type==='splat'||meta.type==='sh3'){
   const record=meta.type==='splat'?64:48;
   if(size%record!==0)throw Error('splatv 包含不完整的高斯记录');
   if(meta.count!==undefined&&(!Number.isSafeInteger(meta.count)||meta.count<=0||meta.count>size/record))throw Error('splatv 高斯数量与数据长度不符');
  }
  entries.push({meta,offset,size});offset+=size;
 }
 const splat=entries.find(e=>e.meta.type==='splat'),sh=entries.find(e=>e.meta.type==='sh3');
 if(!splat)throw Error('Missing splat chunk');
 if(splat.meta.timeRange!==undefined&&(!Array.isArray(splat.meta.timeRange)||splat.meta.timeRange.length!==2||!splat.meta.timeRange.every(Number.isFinite)||splat.meta.timeRange[1]<=splat.meta.timeRange[0]))throw Error('splatv Play时间范围无效');
 const count=splat.meta.count??splat.size/64;if(!count)throw Error('splatv 没有可显示的高斯');
 if(sh&&(sh.size<count*48||(sh.meta.count!==undefined&&sh.meta.count!==count)))throw Error('SH3 数据与高斯数量不匹配');
 return{entries,meta:splat.meta,count,warnings};
}
