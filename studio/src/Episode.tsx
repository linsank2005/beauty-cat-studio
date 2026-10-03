import React from 'react';
import {AbsoluteFill, CanvasImage, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import type {Caption} from '@remotion/captions';
import {Cat} from './Cat';
import {PaperBackdrop, PaperNote} from './ArtDirection';
import {activeTime, type Beat, type EpisodeProps, type Layer, type Scene} from './types';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const beatTime=(beat:Beat,actual:boolean)=>actual&&beat.actualAt!==undefined?beat.actualAt:beat.at;

const ArtLayer: React.FC<{layer:Layer;scene:Scene;actual:boolean}> = ({layer,scene,actual}) => {
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const time=frame/fps;
  const lookup=(id:string)=>beatTime(scene.beats.find(x=>x.id===id)!,actual)-activeTime(scene,actual).start;
  const start=lookup(layer.showAt); const end=layer.hideAt?lookup(layer.hideAt):Number.POSITIVE_INFINITY;
  const duration=layer.revealSeconds??.45;
  const age=time-start;
  if(age<0 || time>=end) return null;
  const from=Math.round(start*fps);
  const motion=[{at:layer.showAt,x:layer.x,y:layer.y,rotation:layer.rotation??0},...(layer.motion??[])];
  const move=(key:'x'|'y'|'rotation',fallback:number)=>motion.length>1 ? interpolate(time,motion.map(v=>lookup(v.at)),motion.map(v=>v[key]??fallback),{...clamp,...(layer.motionEasing==='smooth'?{easing:Easing.bezier(.35,0,.2,1)}:{})}) : fallback;
  const expr=[...(layer.reactions??[])].reverse().find(x=>time>=lookup(x.at))?.expression??layer.expression??'neutral';
  return <div style={{position:'absolute',left:move('x',layer.x),top:move('y',layer.y),width:layer.width,height:layer.height,
    rotate:`${move('rotation',layer.rotation??0)}deg`,
    opacity:(layer.reveal==='fade'?interpolate(age,[0,duration],[0,1],clamp):1)*(layer.fadeOutSeconds&&Number.isFinite(end)?interpolate(time,[end-layer.fadeOutSeconds,end],[1,0],clamp):1),
    scale:layer.reveal==='pop'?interpolate(age,[0,duration*.6,duration],[.72,1.04,1],clamp):1,
    translate:layer.reveal==='pop'?`0px ${interpolate(age,[0,duration],[20,0],clamp)}px`:'0px 0px',
    transformOrigin:layer.transformOrigin??'center center',clipPath:layer.clipPath}}>
    {layer.kind==='cat' ? <Sequence from={from} layout="none" name={layer.id}><Cat width={layer.width??800} expression={expr} view={layer.view} walk={layer.walk} draw={layer.reveal==='draw'} revealSeconds={layer.revealSeconds??2.4}/></Sequence>:null}
    {layer.kind==='image' ? layer.sourceRect ? <div style={{position:'relative',width:layer.width,height:layer.height??layer.sourceRect.height*(layer.width??layer.sourceRect.width)/layer.sourceRect.width,overflow:'hidden',clipPath:layer.reveal==='wipe'?`inset(0 ${100-interpolate(age,[0,duration],[0,100],clamp)}% 0 0)`:'none'}}>
      <CanvasImage src={staticFile(layer.src!)} style={{position:'absolute',left:-layer.sourceRect.x*(layer.width??layer.sourceRect.width)/layer.sourceRect.width,top:-layer.sourceRect.y*(layer.height??layer.sourceRect.height*(layer.width??layer.sourceRect.width)/layer.sourceRect.width)/layer.sourceRect.height,width:layer.sourceRect.sourceWidth*(layer.width??layer.sourceRect.width)/layer.sourceRect.width,height:layer.sourceRect.sourceHeight*(layer.height??layer.sourceRect.height*(layer.width??layer.sourceRect.width)/layer.sourceRect.width)/layer.sourceRect.height}}/>
    </div> : <CanvasImage src={staticFile(layer.src!)} style={{width:layer.width,height:layer.height,objectFit:'contain',clipPath:layer.reveal==='wipe'?`inset(0 ${100-interpolate(age,[0,duration],[0,100],clamp)}% 0 0)`:'none'}}/>:null}
    {layer.kind==='text' ? <div style={{fontSize:layer.fontSize??64,fontWeight:layer.fontWeight??800,color:layer.color??'#242020',lineHeight:1.28,whiteSpace:'pre-line',textAlign:'center',fontFamily:layer.fontFamily??'Microsoft YaHei, sans-serif',letterSpacing:layer.letterSpacing??0}}>{layer.text}</div>:null}
    {layer.kind==='path' ? <svg width={layer.width??1920} height={layer.height??1080} viewBox={`0 0 ${layer.width??1920} ${layer.height??1080}`}><path d={layer.path} fill={layer.fill??'none'} stroke={layer.color??'#292322'} strokeWidth={layer.strokeWidth??9} strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray={layer.reveal==='draw'?1:undefined} strokeDashoffset={layer.reveal==='draw'?1-interpolate(age,[0,duration],[0,1],clamp):undefined}/></svg>:null}
    {layer.kind==='shape' ? layer.shape==='note'?<PaperNote layer={layer}/>:<svg width={layer.width} height={layer.height}><g fill={layer.fill??'#F1BCD0'} stroke={layer.color??'#282222'} strokeWidth={layer.strokeWidth??7}>{layer.shape==='ellipse'?<ellipse cx={(layer.width??100)/2} cy={(layer.height??100)/2} rx={(layer.width??100)/2-8} ry={(layer.height??100)/2-8}/>:<rect x="4" y="4" width={(layer.width??100)-8} height={(layer.height??100)-8} rx={layer.radius??16}/>}</g></svg>:null}
  </div>;
};

export const SceneView:React.FC<{scene:Scene;actual:boolean}> = ({scene,actual}) => {
  const frame=useCurrentFrame(); const {fps}=useVideoConfig();
  const keys=scene.camera??[];
  const times=keys.map(k=>beatTime(scene.beats.find(b=>b.id===k.at)!,actual)-activeTime(scene,actual).start);
  const camera=(key:'x'|'y'|'scale',fallback:number)=>keys.length>1?interpolate(frame/fps,times,keys.map(k=>k[key]),{...clamp,easing:Easing.bezier(.35,0,.2,1)}):keys[0]?.[key]??fallback;
  return <AbsoluteFill style={{background:scene.background,overflow:'hidden'}}>
    <AbsoluteFill style={{scale:camera('scale',1),translate:`${camera('x',0)}px ${camera('y',0)}px`,transformOrigin:'0 0'}}>
      <PaperBackdrop scene={scene} actual={actual}/>
      {/* One episode.json deliberately owns this shared layer template. */}
      {scene.layers.map(layer=><ArtLayer key={layer.id} layer={layer} scene={scene} actual={actual}/>)}
    </AbsoluteFill>
  </AbsoluteFill>;
};

const SceneEntrance:React.FC<{scene:Scene;actual:boolean}>=({scene,actual})=>{
  const frame=useCurrentFrame();const {fps}=useVideoConfig();
  return <AbsoluteFill style={{opacity:scene.transitionInSeconds?interpolate(frame,[0,scene.transitionInSeconds*fps],[0,1],clamp):1}}><SceneView scene={scene} actual={actual}/></AbsoluteFill>;
};

export const Episode:React.FC<EpisodeProps> = ({episode,silent=false,captions=episode.burnCaptions}) => {
  const frame=useCurrentFrame(); const {fps,width,height}=useVideoConfig(); const actual=episode.timing==='actual';
  const designWidth=episode.designWidth??episode.width;const designHeight=episode.designHeight??episode.height;
  const cue:Caption[]=episode.narration.map(n=>({text:n.text,startMs:activeTime(n,actual).start*1000,endMs:activeTime(n,actual).end*1000,timestampMs:null,confidence:null}));
  const current=cue.find(c=>frame/fps*1000>=c.startMs&&frame/fps*1000<c.endMs);
  return <AbsoluteFill style={{background:'#fff8f1',fontFamily:'Microsoft YaHei, sans-serif',overflow:'hidden'}}>
    <AbsoluteFill style={{width:designWidth,height:designHeight,scale:`${width/designWidth} ${height/designHeight}`,transformOrigin:'0 0'}}>
    {episode.scenes.map((scene,index)=>{
      const range=activeTime(scene,actual); const from=Math.round(range.start*fps);
      const until=index===episode.scenes.length-1?Math.ceil(range.end*fps):Math.round(range.end*fps);
      const tail=Math.round((episode.scenes[index+1]?.transitionInSeconds??0)*fps);
      return <Sequence key={scene.id} from={from} durationInFrames={until-from+tail} name={scene.id+' '+scene.title}><SceneEntrance scene={scene} actual={actual}/></Sequence>;
    })}
    {episode.voice&&!silent?<Audio src={staticFile(episode.voice)} volume={1}/>:null}
    {captions&&current?<div style={{position:'absolute',left:110,right:110,bottom:55,textAlign:'center',color:'#222020',fontSize:54,fontWeight:800,lineHeight:1.35,WebkitTextStroke:'7px #fff8f1',paintOrder:'stroke fill',whiteSpace:'pre-line'}}>{current.text}</div>:null}
    </AbsoluteFill>
  </AbsoluteFill>;
};
