import fs from 'node:fs';
import path from 'node:path';
import {root,studio,readJson,validate,safeInside} from './episode.mjs';

const file=safeInside(root,path.relative(root,path.resolve(process.argv[2]??'episodes/DEMO/episode.json')));
const ep=readJson(file), result=validate(ep);
if(!result.ok)throw new Error(result.errors.join('\n'));
// Preparing Studio must not replace P001's handcrafted storyboard review page.
for(const id of [ep.id,'active']) {
  const directory=path.join(studio,'public/episodes',id);
  fs.mkdirSync(directory,{recursive:true});
  fs.copyFileSync(file,path.join(directory,'episode.json'));
}
console.log(`预览副本已准备：${ep.id}（${ep.timing}）；作者主表和审阅页保留。`);
