import React from 'react';
import {AbsoluteFill, Interactive, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cat} from './Cat';

export type RevealProps={revealSeconds:number;expression:'neutral'|'surprised'|'proud';background?:string};
export const CatReveal:React.FC<RevealProps> = ({revealSeconds=2.4,expression='neutral',background}) => <AbsoluteFill style={{backgroundColor:background,alignItems:'center',justifyContent:'center'}}>
  <Cat width={1080} draw revealSeconds={revealSeconds} expression={expression}/>
</AbsoluteFill>;

export const TemplateGallery:React.FC = () => {
  const f=useCurrentFrame(); const {fps}=useVideoConfig();
  return <AbsoluteFill style={{background:'#fff8f1',fontFamily:'Microsoft YaHei, sans-serif'}}>
    <Interactive.Div name="标题" style={{position:'absolute',top:70,left:100,fontSize:72,fontWeight:800,color:'#282222'}}>粉猫 · 从一笔到一只猫</Interactive.Div>
    <div style={{position:'absolute',left:100,top:180}}><Cat width={830} draw revealSeconds={2.4} expression={f>=3.4*fps&&f<6.5*fps?'surprised':f>=6.5*fps?'proud':'neutral'}/></div>
    <Interactive.Div name="模板说明" style={{position:'absolute',left:1060,top:270,width:730,fontSize:53,fontWeight:700,lineHeight:1.8,color:'#292322'}}>
      {f<2.4*fps?'轮廓 → 局部填色\n卷发 → 卷发器':f<6.5*fps?'同一张母版，逐步补全\n表情切换，身体保持不变':'首次登场可用模板\n后续画面用内容推进'}
    </Interactive.Div>
    <Interactive.Div name="表情说明" style={{position:'absolute',left:1060,top:670,fontSize:46,color:'#ae4b6b'}}>坐姿基准 / 惊讶 / 得意</Interactive.Div>
  </AbsoluteFill>;
};

export const IPBoard:React.FC = () => <AbsoluteFill style={{background:'#fff8f1',fontFamily:'Microsoft YaHei, sans-serif'}}>
  <div style={{position:'absolute',left:85,top:55,fontSize:70,fontWeight:800,color:'#252020'}}>粉猫 IP 基准 V1</div>
  <div style={{position:'absolute',left:70,top:185}}><Cat width={550} view="front"/></div>
  <div style={{position:'absolute',left:655,top:185}}><Cat width={550}/></div>
  <div style={{position:'absolute',left:1240,top:185}}><Cat width={550} expression="proud"/></div>
  <div style={{position:'absolute',left:90,top:810,fontSize:44,color:'#36302d',lineHeight:1.65}}>奶油白胖软身体 · 黑色卷发 · 粉色卷发器 · 粗线条手绘质感<br/>角色个性：慵懒、嘴硬、会吐槽；惊讶和得意是演出状态。</div>
</AbsoluteFill>;
