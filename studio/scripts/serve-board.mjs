import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {root,safeInside} from './episode.mjs';

const id=process.argv[2]??'P001', port=Number(process.argv[3]??3370);
if(!/^[A-Za-z0-9_-]{1,32}$/.test(id)||!Number.isInteger(port)||port<1024||port>65535)throw new Error('无效期号或端口。');
const directory=safeInside(root,`episodes/${id}`);
const home=fs.existsSync(path.join(directory,'review/index.html'))?'review/index.html':'review/review.html';
if(!fs.existsSync(path.join(directory,home)))throw new Error('本期没有分镜审阅页，请先完成分镜。');
const types={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.srt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let file;try{const uri=decodeURIComponent((req.url??'/').split('?')[0]);file=safeInside(directory,uri==='/'?home:uri.replace(/^\/+/,''));}catch{res.writeHead(400);res.end();return;}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});
  if(req.method==='HEAD'){res.end();return;}
  const stream=fs.createReadStream(file);res.once('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已占用，请加 -Port 3371 或其他空闲端口。`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`${id} 分镜审阅：http://127.0.0.1:${port}/${home}\nCtrl+C 停止。`));
