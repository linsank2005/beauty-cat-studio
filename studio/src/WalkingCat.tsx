import React, {useId} from 'react';
import {CanvasImage, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export type WalkMotion = {
  durationSeconds: number; distanceX: number; distanceY: number;
  endScale: number; cycles: number;
};

/** One fixed pose with a smooth, local deformation field for alternating feet. */
export const WalkingCat: React.FC<{width:number;walk:WalkMotion}> = ({width,walk}) => {
  const frame=useCurrentFrame();const {fps}=useVideoConfig();
  const id=useId().replace(/:/g,'');const src=staticFile('ip/cat-walk-back.png');
  const age=frame/fps;const p=Math.min(1,Math.max(0,age/walk.durationSeconds));
  // Short acceleration, then a steady route. The half-period lift alternates feet.
  const travel=(p<.12?p*p/.24:p-.06)/.94;
  const phase=p*walk.cycles*Math.PI*2;
  const weight=Math.sin(phase);
  const leftLift=-38*Math.max(0,Math.sin(phase));
  const rightLift=-38*Math.max(0,-Math.sin(phase));
  const scale=1+(walk.endScale-1)*travel;
  // Continuous fields preserve the ink contours at the leg/hip joints. Positive
  // map offsets sample the source in the opposite direction to the desired move.
  const color=(dx:number,dy:number)=>`rgb(${Math.round(128-dx*255/180)},${Math.round(128-dy*255/180)},128)`;
  const mapSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="1754" height="1754" viewBox="-250 -250 1754 1754"><defs>${[
    ['left',color(-46*weight,leftLift)],
    ['right',color(46*weight,rightLift)]
  ].map(([name,c])=>`<radialGradient id="${name}"><stop offset="0" stop-color="${c}"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="rgb(128,128,128)"/></radialGradient>`).join('')}</defs><rect x="-250" y="-250" width="1754" height="1754" fill="rgb(128,128,128)"/><ellipse cx="440" cy="1115" rx="180" ry="150" fill="url(#left)"/><ellipse cx="805" cy="1120" rx="180" ry="150" fill="url(#right)"/></svg>`;
  const mapSrc=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(mapSvg)}`;
  return <div style={{width,height:width,position:'relative',overflow:'visible'}}>
    <CanvasImage src={src} style={{position:'absolute',width:1,height:1,opacity:0}}/>
    <CanvasImage src={mapSrc} style={{position:'absolute',width:1,height:1,opacity:0}}/>
    <div style={{width,height:width,transformOrigin:'50% 94%',
      transform:`translate(${walk.distanceX*travel}px,${walk.distanceY*travel}px) scale(${scale})`}}>
      <svg width={width} height={width} viewBox="0 0 1254 1254" style={{overflow:'visible'}}>
        <defs>
          <filter id={`${id}-gait`} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
            <feImage href={mapSrc} x="-250" y="-250" width="1754" height="1754" result="motion"/>
            <feDisplacementMap in="SourceGraphic" in2="motion" scale="180" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
        <ellipse cx="627" cy="1183" rx={210-25*Math.abs(weight)} ry="21" fill="#252d35" opacity=".18"/>
        <g transform={`rotate(${3.5*weight} 635 1070)`}>
          <image href={src} width="1254" height="1254" filter={`url(#${id}-gait)`}/>
        </g>
      </svg>
    </div>
  </div>;
};
