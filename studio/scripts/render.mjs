import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia, renderStill, openBrowser} from '@remotion/renderer';
import {studio, root, readJson, validate, writeReview, active, beatAt, srt, safeInside} from './episode.mjs';
import {muxUserVoice} from './mux-voice.mjs';

const argv=process.argv.slice(2); const has=(key)=>argv.includes(key);
const get=(key,otherwise)=>{const i=argv.indexOf(key);return i>=0?argv[i+1]:otherwise;};
const config=readJson(path.join(root,'local.config.json'));
const chrome=path.resolve(root,config.chrome);
if(!fs.existsSync(chrome))throw new Error('Chrome 渲染程序不存在。请更新 local.config.json 中 chrome 路径；doctor 会检查。');
const episodeFile=get('--episode',path.join(root,'episodes/DEMO/episode.json'));
const ep=readJson(path.resolve(episodeFile));const valid=validate(ep);
if(!valid.ok)throw new Error(valid.errors.join('\n'));
if(has('--templates')&&!has('--all')){}else if(ep.status==='draft'&&!has('--review'))throw new Error('先完成并审核口播/分镜；draft 仅可生成审阅画面。');
const dest=get('--out',path.join(root,'exports',ep.id));
const outputDir=safeInside(root,path.relative(root,path.resolve(dest)));fs.mkdirSync(outputDir,{recursive:true});
const overwrite=has('--overwrite'); const checkOutput=(file)=>{if(fs.existsSync(file)&&!overwrite)throw new Error(`已存在，防止覆盖: ${file}；修订导出请显式加 --overwrite`);};

const serveUrl=await bundle({entryPoint:path.join(studio,'src/index.ts'),publicDir:path.join(studio,'public')});
const browser=await openBrowser('chrome',{browserExecutable:chrome});
const props={episode:ep,silent:has('--silent')||ep.silenceDemo===true,captions:!has('--no-captions')&&ep.burnCaptions};
try{
  const comp=async(id,inputProps)=>selectComposition({serveUrl,id,inputProps,puppeteerInstance:browser,browserExecutable:chrome,timeoutInMilliseconds:120000});
  const still=async(id,file,frame=0,inputProps={})=>{
    checkOutput(file);await renderStill({composition:await comp(id,inputProps),serveUrl,puppeteerInstance:browser,browserExecutable:chrome,output:file,imageFormat:'png',inputProps,frame,timeoutInMilliseconds:120000});console.log('PNG '+file);
  };
  const media=async(id,file,codec='h264',inputProps={})=>{
    checkOutput(file);let last=-1;
    await renderMedia({composition:await comp(id,inputProps),serveUrl,puppeteerInstance:browser,browserExecutable:chrome,outputLocation:file,codec,
      inputProps,concurrency:2,imageFormat:'png',pixelFormat:codec==='vp9'?'yuva420p':codec==='prores'?'yuva444p10le':'yuv420p',
      ...(codec==='prores'?{proResProfile:'4444'}:{crf:codec==='vp9'?20:18}),timeoutInMilliseconds:120000,
      onProgress:p=>{const n=Math.floor(p.progress*10);if(n!==last){last=n;console.log(`${id} ${n*10}%`);}}});console.log('VIDEO '+file);
  };
  if(has('--templates')||has('--all')){
    const dir=path.join(root,'exports/templates');fs.mkdirSync(dir,{recursive:true});
    await media('TemplateGallery',path.join(dir,'猫猫_模板与表情预览.mp4'));
    await media('CatReveal',path.join(dir,'cat-reveal-alpha.webm'),'vp9',{revealSeconds:2.4,expression:'neutral'});
    await media('CatReveal',path.join(dir,'cat-reveal-alpha.mov'),'prores',{revealSeconds:2.4,expression:'neutral'});
    const stages=[['01-outline',20],['02-features',32],['03-body',44],['04-hair',61],['05-rollers',69],['06-complete',78]];
    for(const [name,f] of stages)await still('CatReveal',path.join(dir,name+'.png'),f,{revealSeconds:2.4,expression:'neutral'});
    await still('CatReveal',path.join(dir,'07-surprised.png'),78,{revealSeconds:2.4,expression:'surprised'});
    await still('CatReveal',path.join(dir,'08-proud.png'),78,{revealSeconds:2.4,expression:'proud'});
    await still('IPBoard',path.join(dir,'IP基准总览.png'));
  }
  if(has('--review')||has('--all')){
    const dir=path.join(path.dirname(path.resolve(episodeFile)),'review');writeReview(ep,dir);
    for(const scene of ep.scenes){const range=active(scene,ep.timing==='actual');const beat=scene.beats.at(-1);const key=Math.min(range.end-.15,Math.max(beatAt(beat,ep.timing==='actual')+.6,range.start+.3));await still('Episode',path.join(dir,scene.id+'.png'),Math.round(key*ep.fps),props);}
  }
  if(has('--frames')){
    const frames=get('--frames','').split(',').map(Number);
    if(frames.some(f=>!Number.isInteger(f)||f<0||f>=Math.ceil(ep.duration*ep.fps)))throw new Error('指定帧超出视频时间或不是整数');
    for(const frame of frames)await still('Episode',path.join(outputDir,`frame-${String(frame).padStart(4,'0')}.png`),frame,props);
  }
  if(!has('--templates')||has('--all')){
    if((!has('--review')&&!has('--frames'))||has('--all')){
      const suffix=(props.silent?'无声':'带口播')+(props.captions?'':'_无字幕');
      const videoFile=path.join(outputDir,`${ep.id}_${suffix}.mp4`);
      await media('Episode',videoFile,'h264',props);
      if(ep.voice&&!props.silent)muxUserVoice(ep,videoFile);
      fs.writeFileSync(path.join(outputDir,`${ep.id}.srt`),srt(ep));
      fs.copyFileSync(path.resolve(episodeFile),path.join(outputDir,'episode.snapshot.json'));
    }
  }
}finally{await browser.close({silent:true});}
