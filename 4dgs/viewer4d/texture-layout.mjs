// Keep each GPU allocation below 512 MiB, including padded rows.
export function textureLayout(width,height,maxTextureSize){
 if(!Number.isInteger(width)||width<=0||width%3||!Number.isInteger(height)||height<=0)throw Error('Invalid model texture dimensions');
 const maxRows=Math.min(maxTextureSize,Math.floor(536870912/(width*16)));
 if(width>maxTextureSize||maxRows<1)throw Error('This device does not support the required texture size');
 const slots=Math.ceil(height/maxRows),rowsPerSlot=Math.ceil(height/slots);
 if(slots>4)throw Error('This device does not have enough texture capacity for this model');
 return {slots,rowsPerSlot,perRow:width/3,perTexture:rowsPerSlot*width/3};
}
