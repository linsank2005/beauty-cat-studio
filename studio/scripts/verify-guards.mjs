import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,readJson,validate,safeInside} from './episode.mjs';

const demo=readJson(path.join(root,'episodes/DEMO/episode.json'));
const checks=[];
function rejects(name,edit,expected){const ep=structuredClone(demo);edit(ep);const result=validate(ep);assert(!result.ok&&result.errors.some(e=>e.includes(expected)),name);checks.push({name,status:'PASS'});}
assert(validate(demo).ok);
rejects('duplicate narration id',ep=>ep.narration[1].id=ep.narration[0].id,'重复编号');
rejects('scene coverage gap',ep=>ep.scenes[1].estimated.start+=1,'场景有空隙');
rejects('missing material',ep=>ep.scenes[0].layers.find(l=>l.kind==='image').src='props/does-not-exist.svg','缺素材');
rejects('duration exceeds three minutes',ep=>ep.duration=181,'视频时长');
rejects('unsafe image path',ep=>ep.scenes[0].layers.find(l=>l.kind==='image').src='../outside.svg','路径超出目录');
assert.throws(()=>safeInside(root,'../outside'),/路径超出目录/);
const actualFile=path.join(root,'tmp/qa-alignment/episode.aligned.json');
if(fs.existsSync(actualFile)){
  const actual=readJson(actualFile);assert(validate(actual).ok);
  const stale=structuredClone(actual);stale.alignmentSource.scriptSha256='stale';
  assert(validate(stale).errors.some(e=>e.includes('原稿/分镜已修订')));checks.push({name:'stale script blocks actual render',status:'PASS'});
  const wrongAudio=structuredClone(actual);wrongAudio.alignmentSource.audioSha256='wrong';
  assert(validate(wrongAudio).errors.some(e=>e.includes('录音文件已改变')));checks.push({name:'changed audio blocks actual render',status:'PASS'});
  const statusFile=path.join(root,path.dirname(actual.alignmentSource.scriptFile),'alignment/latest-status.json');
  const before=fs.readFileSync(statusFile);
  try{fs.writeFileSync(statusFile,JSON.stringify({status:'failed'}));assert(validate(actual).errors.some(e=>e.includes('最近一次录音对齐失败')));checks.push({name:'latest failed alignment blocks old actual render',status:'PASS'});}
  finally{fs.writeFileSync(statusFile,before);}
}
const result={ok:true,checks};fs.writeFileSync(path.join(root,'docs/verification/guard-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
