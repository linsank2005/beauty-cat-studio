import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {root, safeInside} from './episode.mjs';

const [id='DEMO_V3_2K', portText='3346'] = process.argv.slice(2);
if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) throw new Error('提供合法期号');
const directory = safeInside(path.join(root,'exports'), id);
const port = Number(portText);
if (!Number.isInteger(port) || port<1024 || port>65535) throw new Error('端口无效');
const mime = {'.mp4':'video/mp4','.html':'text/html; charset=utf-8','.srt':'text/plain; charset=utf-8','.json':'application/json','.png':'image/png'};
http.createServer((req,res)=>{
  let file;
  try { const name=decodeURIComponent((req.url??'/').split('?')[0]); file=safeInside(directory, name==='/'?'index.html':name.replace(/^\/+/,'')); }
  catch { res.writeHead(400); res.end(); return; }
  if (!fs.existsSync(file)||!fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  const size=fs.statSync(file).size;
  let start=0, end=size-1, status=200;
  const range=req.headers.range;
  if(range){
    const m=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(!m){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return;}
    if(m[1]){start=Number(m[1]);end=m[2]?Math.min(size-1,Number(m[2])):size-1;}
    else {start=Math.max(0,size-Number(m[2]));}
    if(start<0||start> end||start>=size){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return;}
    status=206;
  }
  const headers={'Content-Type':mime[path.extname(file)]??'application/octet-stream','Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':'no-cache'};
  if(status===206)headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
  res.writeHead(status,headers);
  if(req.method==='HEAD'){res.end();return;}
  const stream=fs.createReadStream(file,{start,end});
  res.once('close',()=>stream.destroy());
  stream.once('error',()=>res.destroy());
  stream.pipe(res);
}).listen(port,'127.0.0.1',()=>console.log('本机样片播放 http://127.0.0.1:'+port+'/index.html'));

