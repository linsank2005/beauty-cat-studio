import React, {useId} from 'react';
import {CanvasImage, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import geometry from './cat-geometry.json';
import {WalkingCat, type WalkMotion} from './WalkingCat';

export type CatProps = {
  expression?: 'neutral'|'surprised'|'proud'; view?: 'sit'|'front'|'groom'|'walk';
  draw?: boolean; revealSeconds?: number; width?: number;
  walk?: WalkMotion;
};
const face='M 674 455 Q 796 486 938 462 Q 1000 470 1020 534 Q 1050 610 1000 647 Q 872 726 699 729 Q 619 734 596 695 Q 620 620 635 550 Z';
// Pose-specific face edits keep the lifted-paw pose's jaw, hair and paw untouched.
const groomFace='M 675 492 Q 785 510 939 485 Q 1016 521 1027 566 Q 1050 596 1042 619 Q 1026 647 997 654 Q 875 706 742 735 Q 655 748 623 712 Q 635 622 653 557 Z';
const body='M 409 509 Q 322 584 263 705 Q 222 815 222 898 L 161 1015 L 149 1092 L 688 1128 L 702 779 L 666 719 Q 540 707 471 671 Z';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;

/** Original canonical bitmap is revealed by SVG masks. Expressions replace only the face. */
export const Cat: React.FC<CatProps> = ({expression='neutral',view='sit',draw=false,revealSeconds=2.4,width=800,walk}) => {
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const id=useId().replace(/:/g,'');
  if(view==='walk')return <WalkingCat width={width} walk={walk??{durationSeconds:2.2,distanceX:0,distanceY:0,endScale:1,cycles:5}}/>;
  const t=draw ? frame/(Math.max(0.3,revealSeconds)*fps) : 1;
  const p=(a:number,b:number)=>interpolate(t,[a,b],[0,1],clamp);
  const master=staticFile(view==='front'?'ip/cat-front-neutral.png':view==='groom'?'ip/cat-groom.png':'ip/cat-sit-neutral.png');
  const state=staticFile(`ip/cat-${view==='groom'?'groom':'sit'}-${expression}.png`);
  const hasExpression=expression!=='neutral' && view!=='front';
  const prefix=`cat-${id}`;
  // Full-canvas clipping eliminates negligible generation alpha noise outside the visible character.
  return <div style={{width,height:width,position:'relative'}}>
    <CanvasImage src={master} style={{position:'absolute',width:1,height:1,opacity:0}} />
    {hasExpression ? <CanvasImage src={state} style={{position:'absolute',width:1,height:1,opacity:0}}/>:null}
    <svg width={width} height={width} viewBox="0 0 1254 1254" style={{overflow:'visible'}}>
      <defs>
        <clipPath id={`${prefix}-bounds`}><rect x="130" y="145" width="1060" height="1040"/></clipPath>
        <clipPath id={`${prefix}-face`}><path d={face}/></clipPath>
        <clipPath id={`${prefix}-groom-face`}><path d={groomFace}/></clipPath>
        <clipPath id={`${prefix}-body`}><path d={body}/></clipPath>
        <mask id={`${prefix}-hair`}><rect width="1254" height="1254" fill="white"/><path d={body} fill="black"/><path d={face} fill="black"/></mask>
        <mask id={`${prefix}-outline`}>
          <path d={geometry.silhouette} fill="none" stroke="white" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p(0,.36)}/>
          <path d="M 608 707 Q 757 779 988 668 M 321 671 Q 284 791 295 1018 Q 225 1037 266 1071 Q 381 1122 452 1078 L 479 861 M 563 858 Q 511 1001 544 1062 Q 631 1104 679 1064 Q 689 1033 632 1014 L 654 752" fill="none" stroke="white" strokeWidth="45" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p(.12,.43)}/>
          <rect x="620" y="510" width={p(.22,.44)*420} height="205" fill="white"/>
        </mask>
        <filter id={`${prefix}-ink`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   -2 -2 -2 0 1.65" result="dark"/>
          <feComposite in="dark" in2="SourceAlpha" operator="in"/>
        </filter>
        <filter id={`${prefix}-noPink`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -5 5 0 0 1" result="withoutPink"/>
          <feComposite in="withoutPink" in2="SourceAlpha" operator="in"/>
        </filter>
        <filter id={`${prefix}-pink`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  4 -4 -1 0 0" result="pink"/>
          <feComposite in="pink" in2="SourceAlpha" operator="in"/>
        </filter>
        <mask id={`${prefix}-hair-progress`}>
          <ellipse cx="488" cy="578" rx="165" ry="185" fill="white" opacity={p(.48,.61)}/>
          <ellipse cx="594" cy="330" rx="218" ry="175" fill="white" opacity={p(.57,.70)}/>
          <ellipse cx="814" cy="353" rx="208" ry="169" fill="white" opacity={p(.65,.78)}/>
          <ellipse cx="1030" cy="440" rx="151" ry="221" fill="white" opacity={p(.74,.86)}/>
        </mask>
        <mask id={`${prefix}-pink-progress`}>
          <ellipse cx="523" cy="587" rx="106" ry="113" fill="white" opacity={p(.77,.83)}/>
          <ellipse cx="465" cy="428" rx="87" ry="86" fill="white" opacity={p(.8,.86)}/>
          <ellipse cx="593" cy="328" rx="101" ry="117" fill="white" opacity={p(.83,.89)}/>
          <ellipse cx="827" cy="357" rx="110" ry="127" fill="white" opacity={p(.86,.92)}/>
          <ellipse cx="1004" cy="393" rx="100" ry="103" fill="white" opacity={p(.89,.95)}/>
          <ellipse cx="1050" cy="532" rx="90" ry="89" fill="white" opacity={p(.92,.98)}/>
          <path d={face} fill="white" opacity={p(.94,1)}/><path d={body} fill="white" opacity={p(.94,1)}/>
        </mask>
      </defs>
      <g clipPath={`url(#${prefix}-bounds)`}>
        {t>=1 || view!=='sit' ? <image href={master} width="1254" height="1254"/> : <>
          <image href={master} width="1254" height="1254" filter={`url(#${prefix}-ink)`} mask={`url(#${prefix}-outline)`}/>
          <image href={master} width="1254" height="1254" clipPath={`url(#${prefix}-body)`} opacity={p(.32,.59)} filter={`url(#${prefix}-noPink)`}/>
          <image href={master} width="1254" height="1254" clipPath={`url(#${prefix}-face)`} opacity={p(.27,.43)}/>
          <g mask={`url(#${prefix}-hair-progress)`}>
            <image href={master} width="1254" height="1254" filter={`url(#${prefix}-noPink)`} mask={`url(#${prefix}-hair)`}/>
          </g>
          <image href={master} width="1254" height="1254" filter={`url(#${prefix}-pink)`} mask={`url(#${prefix}-pink-progress)`}/>
          <image href={master} width="1254" height="1254" opacity={p(.93,1)}/>
        </>}
        {hasExpression && t>=.96 ? view==='groom'
          ? <image href={state} width="1254" height="1254" clipPath={`url(#${prefix}-groom-face)`}/>
          : <image href={state} width="1254" height="1254" clipPath={`url(#${prefix}-face)`}/>
        :null}
      </g>
    </svg>
  </div>;
};
