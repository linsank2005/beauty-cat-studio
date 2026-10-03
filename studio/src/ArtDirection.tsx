import React, {useId} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {activeTime, type Layer, type Scene} from './types';

const ink='#493d38';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const grain=Array.from({length:78},(_,i)=>({x:(i*53+17)%173,y:(i*97+31)%157,r:.3+(i%4)*.23}));

const Window:React.FC=()=> <g stroke='#b8b7a7' strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
  <path d="M153 121 Q299 111 439 120 L442 407 Q293 415 157 406 Z" fill="#e7ece0"/>
  <path d="M175 140 L419 142 L420 389 L178 390 Z" fill="#f8f6e8"/>
  <path d="M298 143 L300 390 M178 259 Q291 254 419 260" fill="none"/>
  <path d="M142 114 Q173 177 142 365 L184 414 Q198 287 177 123 M449 115 Q413 200 448 353 L404 406 Q394 272 413 119" fill="#ead8d2" stroke="#d1b6ad"/>
  <path d="M150 137 Q169 221 156 311 M433 136 Q414 232 431 311" fill="none" opacity=".55"/>
</g>;

/** Optional art direction stays behind the authored layers, using their real timing. */
export const PaperBackdrop:React.FC<{scene:Scene;actual:boolean}>=({scene,actual})=>{
  const f=useCurrentFrame(); const {fps}=useVideoConfig(); const uid=useId().replace(/:/g,'');
  const art=scene.art;
  if(!art)return null;
  const entry=art.appearAt?scene.beats.find(b=>b.id===art.appearAt):undefined;
  const entryTime=entry?(actual&&entry.actualAt!==undefined?entry.actualAt:entry.at)-activeTime(scene,actual).start:0;
  const age=f/fps-entryTime;
  // In the opening, the original drawing remains untouched through 2.4 seconds.
  if(age<=0&&entry)return null;
  const variant=art.variant; const room=variant==='vanity'||variant==='exit';
  return <svg width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden style={{position:'absolute',inset:0,pointerEvents:'none',opacity:entry?interpolate(age,[0,art.fadeSeconds??.8],[0,1],clamp):1}}>
    <defs>
      <pattern id={`${uid}-paper`} width="173" height="157" patternUnits="userSpaceOnUse">
        {grain.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#725f4e" opacity={.08+(i%3)*.035}/>)}
        <path d="M28 36 l4 -1 M116 97 l3 1 M77 143 l4 -2" stroke="#8a7764" strokeWidth=".8" opacity=".10"/>
      </pattern>
      <filter id={`${uid}-shadow`} x="-20%" y="-100%" width="140%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <path d="M0 0 H1920 V1080 H0 Z" fill="#faf6ed"/>
    {variant==='vanity'?<>
      <path d="M1009 111 Q1210 60 1740 99 Q1852 331 1809 691 Q1706 845 1066 819 Q1034 542 1009 111Z" fill="#f1e5df"/>
      <Window/>
      <path d="M198 427 L423 421 L742 857 L520 877 Z" fill="#f4ebd6" opacity=".62"/>
      <path d="M141 876 Q601 907 943 878 Q1357 856 1800 880 L1884 1040 H41 Z" fill="#eae2d5" opacity=".61"/>
      <path d="M102 879 Q541 887 1009 876 M1101 879 Q1444 886 1812 878" fill="none" stroke="#b9ae9e" strokeWidth="3" opacity=".48"/>
      <path d="M202 891 Q490 850 872 895 Q582 946 230 920 Z" fill="#e3d4ce" opacity=".65"/>
      <path d="M243 905 Q532 889 826 906 M318 915 Q548 900 733 916" stroke="#c4aea6" strokeWidth="2.5" fill="none" opacity=".45"/>
    </>:null}
    {variant==='thoughts'?<>
      <path d="M873 188 Q894 111 1040 157 Q1197 94 1355 158 Q1538 111 1695 175 Q1818 236 1804 429 Q1861 642 1741 868 Q1467 918 1149 874 Q899 918 825 745 Q776 462 873 188 Z" fill="#f1e4e2"/>
      <path d="M872 188 Q903 122 1021 155 M1621 151 Q1799 149 1805 332 M1737 870 Q1536 906 1425 890" fill="none" stroke="#cab6af" strokeWidth="3" opacity=".65"/>
      <circle cx="794" cy="414" r="22" fill="#f1e4e2"/><circle cx="767" cy="465" r="13" fill="#f1e4e2"/><circle cx="749" cy="508" r="7" fill="#f1e4e2"/>
      <path d="M132 865 Q466 834 770 878 Q477 906 144 887 Z" fill="#e2dfd4" opacity=".6"/>
    </>:null}
    {variant==='compare'?<>
      <path d="M95 203 Q317 189 636 202 L649 822 Q357 840 90 820 Z" fill="#e9ece1"/>
      <path d="M1265 201 Q1561 184 1816 205 L1829 821 Q1550 842 1260 819 Z" fill="#f0e0d9"/>
      <path d="M97 812 Q337 825 632 813 M1277 813 Q1529 824 1815 810" fill="none" stroke="#b4a897" strokeWidth="3"/>
      <path d="M955 134 Q926 166 964 195 M927 191 Q956 198 985 188" stroke="#b39c8c" strokeWidth="3.5" fill="none"/>
    </>:null}
    {variant==='focus'?<>
      <path d="M100 211 Q313 90 633 173 Q901 267 879 604 Q900 781 791 889 Q477 940 148 891 Q74 717 100 211 Z" fill="#efe1da"/>
      <path d="M1027 242 Q1222 193 1729 237 L1790 730 Q1505 790 1078 729 Z" fill="#e9ecdf"/>
      <path d="M1070 825 Q1370 836 1723 821" stroke="#b5b9a6" strokeWidth="2.7" fill="none"/>
      <path d="M141 904 Q516 924 909 899" stroke="#c5b2a7" strokeWidth="3" fill="none"/>
    </>:null}
    {variant==='exit'?<>
      <path d="M1097 125 Q1441 69 1776 120 L1811 866 Q1609 920 1095 881 Z" fill="#f4ead6"/>
      <path d="M1115 203 L1803 687 L1780 875 L1034 870 Z" fill="#faefdb"/>
      <path d="M115 876 Q569 895 925 877 Q1394 860 1815 879 L1880 1046 H42 Z" fill="#e8e0d3" opacity=".62"/>
      <path d="M111 879 Q547 887 945 878 M1137 879 Q1444 889 1814 880" stroke="#b9ae9e" strokeWidth="3" fill="none" opacity=".52"/>
      <path d="M211 892 Q499 858 881 896 Q658 928 238 915Z" fill="#e2d2c9" opacity=".52"/>
    </>:null}
    {/* Ground contact is anchored to the actual cat pose, rather than a floating sticker. */}
    {scene.layers.filter(l=>l.kind==='cat').map(l=>{
      const w=l.width??800;const y=l.y+w*(l.view==='groom'?.918:l.view==='front'?.90:.884);
      return <ellipse key={l.id} cx={l.x+w*.365} cy={y} rx={w*.25} ry={room?15:12} fill="#665747" opacity=".12" filter={`url(#${uid}-shadow)`}/>;
    })}
    <rect width="1920" height="1080" fill={`url(#${uid}-paper)`}/>
    {/* Caption paper and a restrained handmade frame provide a shared visual grammar. */}
    <path d="M44 938 Q937 931 1875 937 L1880 1041 H42Z" fill="#faf6ed" opacity=".92"/>
    <path d="M39 35 Q816 24 1882 35 L1887 1045 Q1045 1052 37 1043 Z" fill="none" stroke={ink} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" opacity=".82"/>
    <path d="M48 43 Q338 37 673 42 M1879 451 L1880 832 M171 1039 Q620 1047 936 1040" fill="none" stroke={ink} strokeWidth="1.7" opacity=".28"/>
    <path d="M65 58 q18 -19 32 1 q14 20 -3 27 q-19 9 -22 -9 q-3 -14 10 -16" fill="none" stroke="#ac6f7e" strokeWidth="3" strokeLinecap="round"/>
  </svg>;
};

const Doodle:React.FC<{kind:Layer['doodle']}>=({kind})=> <g stroke={ink} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
  {kind==='roller'?<><path d="M12 17 Q29 8 43 13 L53 44 Q43 55 24 53Z" fill="#d6a0ab"/><ellipse cx="22" cy="34" rx="10" ry="18"/><ellipse cx="46" cy="33" rx="9" ry="17"/><path d="M18 23 L44 20 M22 42 L48 40" strokeWidth="2.2"/></>:null}
  {kind==='moon'?<><path d="M42 8 Q7 10 12 37 Q19 65 49 47 Q25 49 24 30 Q24 14 42 8Z" fill="#d1c091"/><path d="M41 62 h1 M54 58 h1 M24 63 h1" strokeWidth="4"/></>:null}
  {kind==='shirt'?<path d="M22 13 L8 20 L3 35 L16 40 L18 60 L49 60 L49 40 L61 35 L55 21 L41 13 Q32 24 22 13Z" fill="#bfc9b6"/>:null}
  {kind==='nail'?<><path d="M24 60 L15 43 L19 29 Q25 29 28 37 L26 15 Q26 8 31 12 L35 31 L35 8 Q39 3 42 9 L43 32 L46 13 Q50 10 53 14 L51 37 L55 26 Q61 22 62 29 L57 57Z" fill="#e2c2b6"/><path d="M27 15 l3 1 M37 10 h3 M48 16 h3" strokeWidth="2.5"/></>:null}
  {kind==='brow'?<><path d="M6 33 Q31 4 60 32 Q29 16 7 40Z" fill="#6a5447"/><path d="M11 48 Q31 36 55 47 M27 42 l-1 6 M35 42 v6"/></>:null}
  {kind==='shoe'?<><path d="M12 24 Q26 35 36 23 L49 42 Q66 47 62 57 L8 58 Q3 50 12 24Z" fill="#d7b8a5"/><path d="M10 50 L59 50 M35 32 l9 -3 M39 39 l10 -3" strokeWidth="2.5"/></>:null}
  {kind==='bag'?<><path d="M10 25 L55 23 L61 62 L5 60Z" fill="#d8ccb0"/><path d="M21 26 Q16 4 32 7 Q47 9 44 25 M13 32 L16 51"/></>:null}
  {kind==='redo'?<><path d="M52 26 Q46 7 26 10 Q8 13 9 35 Q10 57 36 57 Q48 55 54 45"/><path d="M42 25 L56 29 L57 15" fill="#d5a0ad"/><path d="M33 25 v15 M26 33 h14" strokeWidth="3"/></>:null}
</g>;

export const PaperNote:React.FC<{layer:Layer}>=({layer})=>{
  const id=useId().replace(/:/g,''); const w=layer.width??380;const h=layer.height??120;
  const fill=layer.fill??'#fffaf0';const n=layer.noteIndex??0;const skew=(n%3)-1;
  const d=`M 8 9 Q ${w*.4} ${3+skew*2} ${w-29} 8 L ${w-7} 28 L ${w-9} ${h-11} Q ${w*.55} ${h-4} 8 ${h-9} Z`;
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
    <defs><pattern id={`${id}-grain`} width="45" height="43" patternUnits="userSpaceOnUse"><path d="M3 9 l6 -1 M28 31 l5 1 M17 17 l3 -1" stroke={ink} strokeWidth=".6" opacity=".1"/><circle cx="34" cy="7" r=".6" fill={ink} opacity=".13"/></pattern></defs>
    <path d={d} fill="#7b6758" opacity=".06" transform="translate(4 5)"/>
    <path d={d} fill={fill} stroke={layer.color??ink} strokeWidth={layer.strokeWidth??3.5} strokeLinejoin="round"/>
    <path d={d} fill={`url(#${id}-grain)`}/>
    <path d={`M${w-29} 9 L${w-31} 29 L${w-7} 28`} fill="#e0d2bc" fillOpacity=".47" stroke={ink} strokeWidth="1.5"/>
    <path d={`M18 ${h-16} Q${w*.35} ${h-11} ${w*.68} ${h-15}`} fill="none" stroke={ink} strokeWidth="1" opacity=".25"/>
    {layer.doodle?<g transform={`translate(24 ${h/2-30})`}><Doodle kind={layer.doodle}/></g>:null}
    {n>0?<text x={w-48} y="35" fill="#a58a7c" fontSize="22" fontFamily="KaiTi, sans-serif">{String(n).padStart(2,'0')}</text>:null}
  </svg>;
};
