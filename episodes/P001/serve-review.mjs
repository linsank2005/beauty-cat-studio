import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.argv[2]??3348);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid port');
const types={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.srt':'text/plain; charset=utf-8','.png':'image/png'};
http.createServer((req,res)=>{
 let file;try{const uri=decodeURIComponent((req.url??'/').split('?')[0]);file=path.resolve(root,uri==='/'?'review/index.html':uri.replace(/^\/+/,''));const relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('outside');}catch{res.writeHead(400);res.end();return;}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});
 if(req.method==='HEAD'){res.end();return;}
 const stream=fs.createReadStream(file);res.once('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);
}).listen(port,'127.0.0.1',()=>console.log('P001 storyboard http://127.0.0.1:'+port+'/review/index.html'));
