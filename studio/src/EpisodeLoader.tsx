import React from 'react';
import {AbsoluteFill, staticFile, type CalculateMetadataFunction} from 'remotion';
import {Episode} from './Episode';
import type {EpisodeData} from './types';

export type LoadedEpisodeProps={episodeFile:string;episode?:EpisodeData;silent:boolean;captions:boolean};
export const loadEpisodeMetadata:CalculateMetadataFunction<LoadedEpisodeProps>=async({props})=>{
  const episode=props.episode??await fetch(staticFile(props.episodeFile)).then(async r=>{
    if(!r.ok)throw new Error(`未找到主表预览副本：${props.episodeFile}；先生成该期 review。`);
    return await r.json() as EpisodeData;
  });
  if(!episode)throw new Error('主表预览副本为空，请重新生成该期 review。');
  return {fps:episode.fps,width:episode.width,height:episode.height,durationInFrames:Math.ceil(episode.duration*episode.fps),props:{...props,episode}};
};
export const EpisodeLoader:React.FC<LoadedEpisodeProps>=({episode,silent,captions})=>episode?
  <Episode episode={episode} silent={silent} captions={captions}/>:
  <AbsoluteFill style={{background:'#fff8f1',justifyContent:'center',alignItems:'center'}}>读取本期主表…</AbsoluteFill>;
