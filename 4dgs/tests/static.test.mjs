import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('all eight ACS scenes have complete public HF stages and no local model paths',()=>{
 const catalog=JSON.parse(read('catalog/models.json'));
 assert.equal(catalog.length,8);assert.equal(catalog[0].id,'acs_zhao_solo');
 for(const model of catalog){
  assert(model.id.startsWith('acs_'));assert.equal(model.originalAvailable,false);
  assert.equal(model.cache.previews.length,2);
  assert.equal(model.cache.url,undefined,'uncompressed full models stay local');
  for(const stage of [model.cache,...model.cache.previews])for(const [key,length] of [['url','bytes'],['gzipUrl','gzipBytes']]){
   if(key==='url'&&stage===model.cache)continue;
   const url=new URL(stage[key]);assert.equal(url.origin,'https://huggingface.co');
   assert(url.pathname.startsWith('/datasets/KosmoResearch/Kosmo-GFM/resolve/main/website-assets/20261117/4dgs-player/'));
   assert(url.pathname.split('/').at(-1).startsWith(model.id+'.'));assert(stage[length]>0);
  }
 }
 assert(!read('catalog/models.json').includes('/home/'));assert(!fs.existsSync(path.join(root,'viewer4d/cache')));
});

test('runtime imports and Worker work below a GitHub project subpath',()=>{
 const queue=['viewer4d/ui.mjs','viewer4d/fast.mjs','viewer4d/fast-worker.mjs'];const seen=new Set();
 const imports=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g;
 while(queue.length){
  const name=queue.pop();if(seen.has(name))continue;seen.add(name);
  const text=read(name);assert(!text.includes('/api/models'));assert(!text.includes('/api/videos'));
  for(const match of text.matchAll(imports)){
   const specifier=match[1];assert(specifier.startsWith('.'),name+': '+specifier);
   const relative=path.posix.normalize(path.posix.join(path.posix.dirname(name),specifier.split('?')[0]));
   assert(fs.existsSync(path.join(root,relative)),relative);queue.push(relative);
  }
 }
 assert(seen.size>20);
 assert(read('viewer4d/fast.mjs').includes("new Worker(new URL('./fast-worker.mjs"));
 const html=read('index.html');assert(!/(?:src|href)="\//.test(html));
 assert(fs.existsSync(path.join(root,'.nojekyll')));
});

test('entry starts the complete fast renderer and leaves video extension available',()=>{
 assert(read('viewer4d/ui.mjs').includes("q.set('engine','fast')"));
 assert(read('viewer4d/ui.mjs').includes("q.set('quality','full')"));
 assert(read('viewer4d/ui.mjs').includes("model:'acs_zhao_solo'"));
 assert(read('viewer4d/ui.mjs').includes("rate:'1'"));
 assert.deepEqual(JSON.parse(read('catalog/videos.json')),[]);
 assert(read('index.html').includes('preload="metadata"'));
});
