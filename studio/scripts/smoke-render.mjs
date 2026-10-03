/** Export one second of the already approved demo to verify a fresh installation. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia} from '@remotion/renderer';
import {root,studio,readJson,validate} from './episode.mjs';
import {muxUserVoice} from './mux-voice.mjs';

const ep=readJson(path.join(root,'episodes/DEMO_V3_2K/episode.aligned.json'));
const check=validate(ep);if(!check.ok)throw new Error(check.errors.join('\n'));
const config=readJson(path.join(root,'local.config.json'));
const directory=path.join(root,'exports/.migration-smoke'), file=path.join(directory,'one-second.mp4');
if(fs.existsSync(file))throw new Error('已有安装检查输出，请先移走 exports/.migration-smoke 后重跑。');
fs.mkdirSync(directory,{recursive:true});
const chrome=path.resolve(root,config.chrome);
const serveUrl=await bundle({entryPoint:path.join(studio,'src/index.ts'),publicDir:path.join(studio,'public')});
const browser=await openBrowser('chrome',{browserExecutable:chrome});
const props={episode:ep,silent:false,captions:true};
try {
  const composition=await selectComposition({serveUrl,id:'Episode',inputProps:props,puppeteerInstance:browser,browserExecutable:chrome});
  await renderMedia({serveUrl,composition,inputProps:props,puppeteerInstance:browser,browserExecutable:chrome,outputLocation:file,frameRange:[0,ep.fps-1],codec:'h264',pixelFormat:'yuv420p',imageFormat:'png',concurrency:2});
} finally {await browser.close({silent:true});}
// Exercise the same narration mux as the normal export, trimmed only for this installation check.
muxUserVoice({...ep,duration:1},file);
const probe=spawnSync(config.ffprobe,['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8',windowsHide:true});
if(probe.status!==0)throw new Error(probe.stderr||'ffprobe failed');
const media=JSON.parse(probe.stdout), video=media.streams.find(s=>s.codec_type==='video'), audio=media.streams.find(s=>s.codec_type==='audio');
if(video?.width!==2560||video?.height!==1440||!audio||Math.abs(Number(media.format.duration)-1)>.1)throw new Error('安装检查视频的尺寸、时长或音频不符。');
const decode=spawnSync(config.ffmpeg,['-v','error','-xerror','-i',file,'-f','null','-'],{encoding:'utf8',windowsHide:true});
if(decode.status!==0)throw new Error(decode.stderr||'Full decode failed');
const result={ok:true,kind:'installation smoke check; not a new creative sample or full AV review',file:'exports/.migration-smoke/one-second.mp4',seconds:Number(media.format.duration),width:video.width,height:video.height,fps:video.avg_frame_rate,audioCodec:audio.codec_name,completeDecode:true};
fs.writeFileSync(path.join(directory,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
