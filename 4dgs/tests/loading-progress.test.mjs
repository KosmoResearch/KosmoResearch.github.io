import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoadingProgress} from '../viewer4d/loading-progress.mjs';

const manifest={bytes:1000,previews:[{bytes:100},{bytes:200}]};
test('progress weights preview and full stages without counting repeated events twice',()=>{
 const progress=createLoadingProgress(manifest);
 assert.deepEqual(progress.snapshot(),{received:0,total:1300,ratio:0});
 progress.update({stage:1,received:100});
 progress.update({stage:2,received:200});
 progress.update({stage:'full',received:350});
 assert.equal(progress.update({stage:'full',received:350}).ratio,.5);
 assert.equal(progress.update({stage:'full',received:1000}).ratio,1);
});
test('a raw fallback replaces the failed download and skipped previews are excluded',()=>{
 const progress=createLoadingProgress(manifest);
 progress.update({stage:1,received:80});
 assert.equal(progress.update({stage:1,received:0}).received,0);
 progress.update({stage:1,skipped:true});
 progress.update({stage:2,received:200});
 assert.deepEqual(progress.update({stage:'full',received:1000}),{received:1200,total:1200,ratio:1});
});
test('direct full loading excludes previews and safely bounds malformed progress events',()=>{
 const progress=createLoadingProgress(manifest,{progressive:false});
 assert.equal(progress.update({stage:'full',received:500}).ratio,.5);
 assert.equal(progress.update({stage:'full',received:NaN}).ratio,.5);
 assert.equal(progress.update({stage:'full',received:-1}).ratio,0);
 assert.equal(progress.update({stage:'full',received:2000}).ratio,1);
});
