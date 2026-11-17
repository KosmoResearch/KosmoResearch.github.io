import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'test-results');await fs.mkdir(output,{recursive:true});
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog/models.json'),'utf8'));
const prefix='/4dgs/';
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith(prefix)){res.writeHead(404).end();return;}
  const relative=decodeURIComponent(u.pathname.slice(prefix.length))||'index.html';
  if(relative.startsWith('__test-assets/')&&process.env.ASSET_ROOT){
   const assetRoot=path.resolve(process.env.ASSET_ROOT),asset=path.resolve(assetRoot,relative.slice('__test-assets/'.length));
   if(!asset.startsWith(assetRoot+path.sep)){res.writeHead(403).end();return;}
   const size=(await fs.stat(asset)).size;
   res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':size,'Access-Control-Allow-Origin':'*'});
   const input=createReadStream(asset,{highWaterMark:256*1024});
   res.on('close',()=>input.destroy());
   for await(const chunk of input){if(res.destroyed)break;res.write(chunk);if(process.env.THROTTLE_ASSETS)await delay(18);}
   res.end();return;
  }
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(content);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}${prefix}`;
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/usr/bin/google-chrome',headless:true,dumpio:!!process.env.DEBUG_BROWSER,
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={base,mode:process.env.ASSET_ROOT?'local immutable HF asset mirror':'real HF',coarse:[],full:[]};
const wait=(page,fn,arg)=>page.waitForFunction(fn,arg,{timeout:180000});
async function setup(coarseOnly=false){
 const context=await browser.newContext({viewport:{width:1100,height:760}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('crash',()=>console.error('Page crashed',page.url()));
 page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base)&&!r.url().endsWith('/favicon.ico'))errors.push(r.status()+' '+r.url());});
 if(process.env.ASSET_ROOT)await context.route('https://huggingface.co/datasets/KosmoResearch/Kosmo-GFM/resolve/**',async route=>{
  const relative=route.request().url().split('/4dgs-player/')[1];assert(relative);
  if(coarseOnly&&!relative.includes('preview-32768'))return route.abort();
  await route.fulfill({status:307,headers:{'Access-Control-Allow-Origin':'*',Location:base+'__test-assets/'+relative}});
 });
 return {context,page,errors};
}
try{
 for(const model of ['full','vvc'].includes(process.env.CHECK_MODE)?[]:catalog.filter(model=>model.cache.previews?.length)){
  console.log('Preview',model.id);
  const {context,page,errors}=await setup(true);
  await page.goto(base+'?model='+model.id+'&paused=1&time=2.5');
  await wait(page,()=>window.probe?.renderTime===2.5);
  const state=await page.evaluate(()=>({model:probe.model,preview:probe.preview,quality:probe.quality,rate:probe.playbackRate,renderer:probe.renderer,resolution:probe.resolution,errors:probe.errors}));
  assert.equal(state.model,model.id);assert.equal(state.quality,'full');assert.equal(state.rate,1);assert.deepEqual(state.errors,[]);assert.deepEqual(errors,[]);
  report.coarse.push(state);await context.close();
 }
 const fullModels=catalog.filter(model=>['acs_zhao_solo','acs_two_people','vvc_001_1_seq0'].includes(model.id));
 for(const model of fullModels.filter(model=>process.env.CHECK_MODE!=='vvc'||model.id.startsWith('vvc_'))){
  const id=model.id;
  console.log('Full model',id);
  const {context,page,errors}=await setup();
  await page.goto(base+'?model='+id+'&paused=1&time=2.5');
  if(process.env.THROTTLE_ASSETS){
   await wait(page,()=>window.probe&&!probe.fullReady&&probe.downloadProgress?.ratio>.35&&probe.downloadProgress?.ratio<.9);
   assert.equal(await page.locator('#loading').isVisible(),true);
   const percent=Number(await page.locator('#load-progress').getAttribute('aria-valuenow'));
   assert(percent>0&&percent<100);
   await page.screenshot({path:path.join(output,id+'-loading.png')});
  }
  await wait(page,()=>window.probe?.fullReady&&probe.renderTime===2.5);
  await page.waitForTimeout(800);assert.equal(await page.locator('#loading').isVisible(),false);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert(!/\p{Script=Han}/u.test(await page.locator('body').textContent()),'all UI text must be English');
  assert.equal(await page.evaluate(()=>probe.sampled),false);
  assert.equal(await page.evaluate(()=>probe.lodBudget===Infinity),true);
  assert.deepEqual(await page.evaluate(()=>probe.resolution),await page.evaluate(()=>[view.clientWidth,view.clientHeight]));
  for(const time of [.1,4.9,2.5]){await page.evaluate(t=>setTime(t),time);await wait(page,t=>probe.renderTime===t,time);}
  const camera=await page.evaluate(()=>controls.getState());const box=await page.locator('canvas').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+40,box.y+box.height/2+15,{steps:4});await page.mouse.up();
  assert.notDeepEqual(await page.evaluate(()=>controls.getState()),camera);
  await page.locator('#home').click();assert.deepEqual(await page.evaluate(()=>controls.getState()),camera);
  const start=await page.evaluate(()=>{setTime(0);setPlaybackRate(.5);setPlaying(true);return {now:performance.now()};});
  await wait(page,now=>probe.playbackWallTime>=now+1500,start.now);
  const end=await page.evaluate(()=>({time:probe.time,now:probe.playbackWallTime}));
  const elapsed=(end.now-start.now)/1000;
  const delta=end.time+5*Math.round((elapsed*.5-end.time)/5);const clockRate=delta/elapsed;
  assert(Math.abs(clockRate-.5)<.08,'half-speed clock '+JSON.stringify({clockRate,start,end,elapsed}));
  await page.evaluate(()=>{setTime(2.5);controls.home();});await wait(page,()=>probe.renderTime===2.5);
  await page.waitForTimeout(500);const frames=await page.evaluate(()=>probe.renderedFrames);await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>probe.renderedFrames),frames);
  const pixels=PNG.sync.read(await page.locator('canvas').screenshot({path:path.join(output,id+'-canvas.png')})).data;
  await page.screenshot({path:path.join(output,id+'-page.png')});
  const state=await page.evaluate(()=>({model:probe.model,renderer:probe.renderer,resolution:probe.resolution,quality:probe.quality,sampled:probe.sampled,stages:probe.loadedStages,workerMs:probe.sortMs.at(-1),errors:probe.errors}));
  assert.deepEqual(state.errors,[]);assert.deepEqual(errors,[]);await context.close();
  let pixelEquality;
  if(process.env.REFERENCE_URL){
   const reference=await browser.newContext({viewport:{width:1100,height:760}}),baseline=await reference.newPage();
   await baseline.goto(process.env.REFERENCE_URL+'?model='+id+'&paused=1&quality=full&time=2.5&progressive=0');
   await wait(baseline,()=>window.probe?.fullReady&&probe.renderTime===2.5);
   const expected=PNG.sync.read(await baseline.locator('canvas').screenshot()).data;
   assert.deepEqual(pixels,expected,'full canvas must match the existing LAN renderer');pixelEquality=true;await reference.close();
  }
  report.full.push({...state,clockRate,pausePassed:true,cameraPassed:true,seekPassed:true,pixelEquality});
  await fs.writeFile(path.join(output,'browser.json'),JSON.stringify(report,null,2));
  console.log('Passed',id);
 }
 report.passed=true;await fs.writeFile(path.join(output,'browser.json'),JSON.stringify(report,null,2));
 console.log('Browser checks passed');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
