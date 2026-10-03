import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ensureBrowser} from '@remotion/renderer';

const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.dirname(studio), file=path.join(root,'local.config.json');
const config=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const existing=config.chrome?path.resolve(root,config.chrome):null;
process.chdir(studio);
const browser=await ensureBrowser({browserExecutable:existing&&fs.existsSync(existing)?existing:null});
if(!('path' in browser)||!fs.existsSync(browser.path))throw new Error('渲染浏览器下载未完成，请重新运行 setup。');
if(!existing||!fs.existsSync(existing)) {
  const relative=path.relative(root,browser.path);
  config.chrome=relative.startsWith('..')||path.isAbsolute(relative)?browser.path:relative.replaceAll('\\','/');
  fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');
}
console.log('渲染浏览器已就绪。');
