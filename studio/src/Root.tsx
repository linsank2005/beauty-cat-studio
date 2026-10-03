import React from 'react';
import {Composition, Still} from 'remotion';
import {EpisodeLoader,loadEpisodeMetadata} from './EpisodeLoader';
import {CatReveal, IPBoard, TemplateGallery} from './Templates';

export const Root:React.FC = () => <>
  <Composition id="CatReveal" component={CatReveal} width={1080} height={1080} fps={30} durationInFrames={96} defaultProps={{revealSeconds:2.4,expression:'neutral' as const}} calculateMetadata={({props})=>({durationInFrames:Math.ceil((props.revealSeconds+.8)*30)})}/>
  <Composition id="TemplateGallery" component={TemplateGallery} width={1920} height={1080} fps={30} durationInFrames={300}/>
  <Still id="IPBoard" component={IPBoard} width={1920} height={1080}/>
  <Composition id="Demo" component={EpisodeLoader} width={1920} height={1080} fps={30} durationInFrames={960} defaultProps={{episodeFile:'episodes/DEMO/episode.json',silent:true,captions:true}} calculateMetadata={loadEpisodeMetadata}/>
  <Composition id="StylePilot12" component={EpisodeLoader} width={1920} height={1080} fps={30} durationInFrames={360} defaultProps={{episodeFile:'episodes/STYLE12/episode.json',silent:true,captions:false}} calculateMetadata={loadEpisodeMetadata}/>
  <Composition id="DemoVoice2K" component={EpisodeLoader} width={2560} height={1440} fps={30} durationInFrames={744} defaultProps={{episodeFile:'episodes/DEMO_V3_2K/episode.json',silent:false,captions:true}} calculateMetadata={loadEpisodeMetadata}/>
  <Composition id="Episode" component={EpisodeLoader} width={1920} height={1080} fps={30} durationInFrames={960} defaultProps={{episodeFile:'episodes/active/episode.json',silent:false,captions:true}} calculateMetadata={loadEpisodeMetadata}/>
</>;
