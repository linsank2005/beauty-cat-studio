import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const here=path.dirname(fileURLToPath(import.meta.url)), root=path.resolve(here,'../..');
const review=path.join(here,'review'), boards=path.join(root,'studio/public/episodes/P001/boards');
const require=createRequire(path.join(root,'studio/package.json'));
const {openBrowser}=require('@remotion/renderer');
const ep=JSON.parse(fs.readFileSync(path.join(here,'episode.json'),'utf8'));
const config=JSON.parse(fs.readFileSync(path.join(root,'local.config.json'),'utf8').replace(/^\uFEFF/,''));
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.mkdirSync(boards,{recursive:true});
const arts={}; for(let n=1;n<=8;n++){const name='shot'+String(n).padStart(2,'0')+'.png';arts[name]='data:image/png;base64,'+fs.readFileSync(path.join(review,'art',name)).toString('base64');}
const filters='<filter id="ink" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feGaussianBlur stdDeviation="1.15"/><feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" divisor="1" preserveAlpha="true" edgeMode="duplicate"/><feColorMatrix type="matrix" values="0 0 0 0 0.06  0 0 0 0 0.06  0 0 0 0 0.06  1 1 1 0 0"/><feComponentTransfer><feFuncA type="linear" slope="5" intercept="-0.13"/></feComponentTransfer></filter><filter id="accent" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1.7 -1.7 -1.7 0 1.8"/><feComponentTransfer result="dark"><feFuncA type="linear" slope="3" intercept="-.15"/></feComponentTransfer><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  2 -4 -1 0 0"/><feComponentTransfer result="pink"><feFuncA type="linear" slope="5" intercept="-.1"/></feComponentTransfer><feMerge><feMergeNode in="dark"/><feMergeNode in="pink"/></feMerge></filter>';
const image=(href,extra='')=>'<image href="'+href+'" width="1920" height="1080" '+extra+'/>';
const txt=(x,y,text,size=40,color='#171a20',anchor='start')=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="Microsoft YaHei, sans-serif" font-size="'+size+'" font-weight="700" text-anchor="'+anchor+'">'+esc(text)+'</text>';
const line=(d,color='#181b21',width=6,dash='')=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round" '+(dash?'stroke-dasharray="'+dash+'"':'')+'/>';
const node=(x,y,w,h,label,fill='#fff8ed',sub='')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="12" fill="'+fill+'" stroke="#171a20" stroke-width="5"/>'+txt(x+w/2,y+h/2+(sub?-6:14),label,36,'#171a20','middle')+(sub?txt(x+w/2,y+h/2+32,sub,24,'#3f4b59','middle'):'');
const bladder=(x,y,fill='none')=>'<g transform="translate('+x+' '+y+')">'+line('M55 10 L55 52 M140 10 L140 52')+'<path d="M55 45 C5 60 10 115 62 144 L82 166 L112 166 L136 142 C188 111 190 66 143 45 C116 30 82 32 55 45Z" fill="'+fill+'" stroke="#171a20" stroke-width="6"/>'+line('M82 166 L82 197 M112 166 L112 197')+'</g>';
const gut=(x,y,fill='none')=>'<g transform="translate('+x+' '+y+')"><rect x="10" y="12" width="172" height="175" rx="22" fill="'+fill+'" stroke="#171a20" stroke-width="6"/>'+line('M35 42 H145 Q160 42 160 62 Q160 83 138 83 H54 Q35 83 35 103 Q35 123 55 123 H141 Q160 123 160 145 Q160 163 138 163 H88 V205')+'</g>';

function overlaySvg(names){
 const on=new Set(names);let o='';
 if(on.has('flashback'))o+=txt(58,95,'5分钟前',44);
 if(on.has('stiffen'))o+=line('M310 655 l-36 -31 M327 623 l-15 -45 M1150 650 l35 -28 M1138 618 l18 -45','#2b3037',7);
 if(on.has('rumble'))o+=line('M635 745 q-25 -20 0 -40 q28 -20 0 -40 M1050 720 q28 -22 0 -45 q-24 -20 0 -35','#8b503d',7);
 if(on.has('symptom-outline')||on.has('symptom-color')){
  const filled=on.has('symptom-color');o+=gut(1460,220,filled?'#d3a54b':'none')+txt(1560,482,'便意',42,'#171a20','middle');
  if(filled)o+=bladder(1460,540,'#b2c0cd')+txt(1560,795,'尿意',42,'#171a20','middle');
 }
 if(on.has('surge'))o+=line('M1420 245 Q1380 330 1420 410 M1710 242 Q1750 330 1710 414 M1420 565 Q1380 650 1420 725 M1710 565 Q1750 650 1710 730','#9b583e',6);
 if(on.has('bladder-outline')||on.has('organs-partial')||on.has('organs-full')){
  o+=bladder(1450,130,on.has('bladder-outline')?'none':'#b2c0cd')+txt(1548,370,'膀胱',40,'#171a20','middle');
  if(on.has('organs-partial')||on.has('organs-full'))o+=gut(1450,460,on.has('organs-full')?'#d3a54b':'none')+txt(1548,735,'肠子',40,'#171a20','middle');
  if(on.has('organs-full'))o+=txt(1725,450,'？',70);
 }
 if(on.has('input-outline')||on.has('input-color')){
  const fill=on.has('input-color')?'#ead1a0':'#fff8ed';
  o+=txt(1300,128,'压力警报系统',44,'#171a20','middle')+node(925,190,250,105,'考试 / 面试',fill);
  if(on.has('tension'))o+=txt(1050,337,'紧张 / 焦虑',27,'#4e5866','middle');
  if(on.has('input-link'))o+=line('M1175 240 H1230','#707c87',5,'12 10')+line('M1211 224 l19 16 -19 16','#707c87',5);
  if(on.has('amygdala-outline')||on.has('amygdala-color'))o+=node(1240,173,380,140,on.has('amygdala-color')?'杏仁核':'情绪警报',on.has('amygdala-color')?'#e9bb64':'#fff8ed',on.has('amygdala-color')?'参与警报':'');
  else o+=line('M1320 205 C1355 165 1415 185 1420 225 C1430 272 1380 299 1345 272 C1315 278 1282 245 1320 205Z','#707c87',5);
  if(on.has('alarm'))o+='<path d="M880 698 L880 637 A56 60 0 0 1 992 637 L992 700Z" fill="#bc4a42" fill-opacity=".65"/>'+txt(1425,364,'一级战备',31,'#923d34','middle');
  if(on.has('alert-rays'))o+=line('M1220 188 l-21 -20 M1637 180 l20 -25 M1400 151 l-5 -28','#9b583e',6);
  if(on.has('hypothalamus-outline')||on.has('hypothalamus-color'))o+=node(920,416,295,93,'下丘脑等脑区',on.has('hypothalamus-color')?'#c0cbd5':'#fff8ed');
  if(on.has('sympathetic'))o+=node(1370,416,290,93,'交感神经','#c0cbd5')+line('M1428 314 V389 H1066 V411 M1428 389 H1515 V411','#565f6a',5,'12 9');
  if(on.has('mode'))o+=node(1040,567,525,83,'战斗  或  逃跑',on.has('mode-color')?'#e5ba67':'#fff8ed')+line('M1070 510 V539 H1303 V561 M1515 510 V539 H1303','#565f6a',5,'12 9');
  if(on.has('sympathetic'))o+=txt(1300,705,'简化流程示意 · 多脑区共同参与',22,'#62666b','middle');
 }
 return o;
}

function svgFor(s,l){
 const build=l.reviewBuild, href=arts[build.art], phase=build.phase, a=s.reviewArt; let body='';
 const defs=filters+'<clipPath id="actor"><path d="'+a.actor+'"/></clipPath><clipPath id="body"><path d="'+a.body+'"/></clipPath><clipPath id="face"><path d="M393 683 Q392 632 440 564 Q490 512 567 469 Q627 449 713 440 Q752 466 779 516 Q790 561 781 598 Q733 633 665 661 Q537 719 447 709 Q410 706 393 683Z"/></clipPath>';
 if(phase==='full')body=image(href);
 else {
  body='<rect width="1920" height="1080" fill="#fff9ef"/>'+image(href,'filter="url(#ink)" opacity=".26"')+image(href,'filter="url(#ink)" clip-path="url(#actor)"');
  if(phase==='partial'||phase==='catColor')body+='<path d="'+a.body+'" fill="#fff1d7" fill-opacity=".8"/>'+image(href,'filter="url(#ink)" clip-path="url(#body)"');
  if(phase==='catColor')body+=image(href,'filter="url(#accent)"');
 }
 if(build.overlays.includes('startled'))body+=image(arts['shot08.png'],'clip-path="url(#face)"');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 1920 1080"><defs>'+defs+'</defs>'+body+overlaySvg(build.overlays)+'</svg>';
}

const all=ep.scenes.flatMap(s=>s.beats.map((b,i)=>({s,b,l:s.layers[i]})));
const browser=await openBrowser('chrome',{browserExecutable:path.resolve(root,config.chrome),logLevel:'error'});
const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
const evidence=[];
try{
 await page.setViewport({width:2560,height:1440,deviceScaleFactor:1});
 await page.goto({url:'about:blank',timeout:30000});
 await page.evaluate(async images=>{await Promise.all(images.map(src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=src;})));},Object.values(arts));
 for(const {s,b,l} of all){
  await page.evaluate(async svg=>{document.body.style.cssText='margin:0;background:#fff;overflow:hidden';document.body.innerHTML=svg;await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},svgFor(s,l));
  const snap=await page._client().send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
  const file=path.join(review,'states',b.id+'.png');fs.writeFileSync(file,Buffer.from(snap.value.data,'base64'));fs.copyFileSync(file,path.join(boards,b.id+'.png'));
  evidence.push({event:b.id,at:b.at,narration:b.narrationId,scene:s.id,phase:l.reviewBuild.phase,file:'states/'+b.id+'.png',sha256:sha(file)});
  console.log(b.id+' '+l.reviewBuild.phase+' '+b.at+'s');
 }
 const boardCards=ep.scenes.map(s=>{const last=s.beats.at(-1);const finalState='data:image/png;base64,'+fs.readFileSync(path.join(review,'states',last.id+'.png')).toString('base64');return '<figure><img src="'+finalState+'"><figcaption><b>'+s.id+' '+esc(s.title)+'</b><span>'+s.estimated.start.toFixed(1)+'–'+s.estimated.end.toFixed(1)+'秒 · '+esc(s.reviewArt.expression)+'</span></figcaption></figure>';}).join('');
 await page.setViewport({width:2560,height:1380,deviceScaleFactor:1});
 await page.evaluate(async html=>{document.body.style.cssText='margin:0;background:#efe7d7;color:#17212d;font:32px Microsoft YaHei';document.body.innerHTML=html;await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},'<style>header{padding:42px 55px 18px}h1{font-size:62px;margin:0 0 15px}p{font-size:28px;margin:0}main{display:grid;grid-template-columns:repeat(4,1fr);gap:28px;padding:24px 55px}figure{margin:0;background:#fff9ed;border:2px solid #23303e}figure img{width:100%;aspect-ratio:16/9;object-fit:contain}figcaption{padding:15px 20px}b{display:block;font-size:31px}span{display:block;font-size:22px;margin-top:8px}</style><header><h1>P001 · 开场60秒分镜</h1><p>原稿开头23行 · 8个构图 · 45个视觉事件 · 预计时间／未录音 · 静态审阅</p></header><main>'+boardCards+'</main>');
 const overview=await page._client().send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});fs.writeFileSync(path.join(review,'overview.png'),Buffer.from(overview.value.data,'base64'));
} finally {await browser.close({silent:true});}

const stateMap=new Map(evidence.map(e=>[e.event,e]));
const phaseLabels={ink:'线稿示意',partial:'局部填色',catColor:'人物补色',full:'细节／表演／关系'};
const data=all.map(({s,b,l})=>({...b,scene:s.id,sceneTitle:s.title,pose:s.reviewArt.pose,phase:phaseLabels[l.reviewBuild.phase],image:'states/'+b.id+'.png',text:ep.narration.find(n=>n.id===b.narrationId).text}));
const storyBlocks=ep.scenes.map(s=>'<article id="'+s.id+'"><header><span>'+s.id+' · '+s.estimated.start.toFixed(1)+'–'+s.estimated.end.toFixed(1)+'秒</span><h2>'+esc(s.title)+'</h2></header><p class="voice">'+s.narrationIds.map(id=>esc(ep.narration.find(n=>n.id===id).text)).join('<br>')+'</p><p>'+esc(s.initialState)+'</p><p class="sub">'+esc(s.reviewArt.pose)+'<br>'+esc(s.reviewArt.expression)+'</p><div class="steps">'+s.beats.map((b,i)=>'<button class="card" data-event="'+b.id+'"><img loading="lazy" src="states/'+b.id+'.png" alt="'+esc(b.action)+'"><b>'+b.at.toFixed(1)+'秒 · '+b.id+'</b><span>'+esc(b.action)+'</span></button>').join('')+'</div><details><summary>查看变化作用与录音锚点</summary><table><tr><th>事件／时间</th><th>口播锚点</th><th>画面变化</th><th>作用</th></tr>'+s.beats.map(b=>'<tr><td>'+b.id+'／'+b.at.toFixed(1)+'秒</td><td>'+esc(b.anchor)+'</td><td>'+esc(b.action)+'</td><td>'+esc(b.meaning)+'</td></tr>').join('')+'</table></details><p class="production">'+esc(s.reviewArt.productionStatus)+'</p></article>').join('');
const sourceList=ep.sources.map(s=>'<li>'+esc(s.claim)+' <a href="'+esc(s.url)+'" target="_blank" rel="noreferrer">来源</a><small>'+esc(s.note)+'</small></li>').join('');
const payload=JSON.stringify(data).replace(/</g,'\\u003c');
const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P001｜开场60秒分镜验收</title><style>'+
' *{box-sizing:border-box}body{margin:0;background:#ece5d7;color:#1a2532;font:17px/1.65 "Microsoft YaHei",sans-serif}a{color:#385777}button,input{font:inherit}button{cursor:pointer}main{max-width:1450px;margin:auto;padding:34px 30px 80px}h1{font-size:34px;line-height:1.3;margin:10px 0}h2{font-size:24px;margin:4px 0}h3{font-size:20px}.eyebrow{letter-spacing:1px;font-size:14px;font-weight:700;color:#596577}.intro{max-width:1040px}.chips{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.chips span{padding:4px 11px;background:#ddd3c0;border-radius:3px;font-size:14px}.viewer{background:#1c2835;padding:18px;color:#fff9ed;border-radius:5px}.viewer img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#fff9ed}.toolbar{display:flex;align-items:center;gap:12px;margin:14px 0}.toolbar button{border:1px solid #8491a0;background:#253748;color:#fff;padding:7px 16px;border-radius:3px}input[type=range]{width:100%;accent-color:#dbb36e}.viewer h2{font-size:21px}.viewer p{margin:6px 0}.viewer small{color:#c1cedb}.scene-nav{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}.scene-nav button{border:1px solid #b9aa8e;background:#fff9ed;color:#1a2532;padding:8px 13px}.overview{width:100%;margin:18px 0;border:1px solid #b9aa8e}article{background:#fff9ed;border:1px solid #cabda6;margin-top:26px;padding:25px}article header span{font-size:14px;color:#647182}p.voice{font-size:23px;padding-left:14px;border-left:4px solid #d5ab5b}.sub,.production{font-size:14px;color:#636a71}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:20px 0}.card{padding:0;text-align:left;background:#f6eedc;border:1px solid #bcaf98;color:#1a2532}.card img{display:block;width:100%;aspect-ratio:16/9}.card b,.card span{display:block;padding:5px 12px}.card span{font-size:14px;min-height:60px}summary{cursor:pointer;font-weight:700;padding:8px 0}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:10px;border:1px solid #ccc0ab;vertical-align:top;text-align:left}.notes{padding:24px;background:#e0d7c7;margin-top:25px}.notes small{display:block;color:#657180}li{margin:10px 0}@media(max-width:750px){main{padding:20px 12px}h1{font-size:26px}.steps{grid-template-columns:repeat(2,1fr)}article{padding:17px}.toolbar{flex-wrap:wrap}}@media print{.viewer,.scene-nav{display:none}.steps{grid-template-columns:repeat(3,1fr)}article{break-inside:avoid}details{display:none}}'+
'</style><main><div class="eyebrow">BEAUTY CAT ／ P001 ／ STORYBOARD REVIEW</div><h1>紧张时，刚去过厕所为什么又想去？</h1><p class="intro">先验收开场一分钟。原稿从“你是不是也经历过”到“让身体进入战斗或逃跑模式”为止，文字保留。画面按线稿、局部填色、细节和表演建立；这一页是静态分镜，不是已完成视频。</p><div class="chips"><span>预计 60 秒</span><span>16:9 · 2K 状态图</span><span>8 个构图／45 个事件</span><span>未录音 · 无声</span><span>待你验收</span></div><section class="viewer"><img id="frame" src="states/E01.png" alt="当前分镜"><div class="toolbar"><button id="prev">← 上一步</button><b id="counter"></b><button id="next">下一步 →</button><span id="time"></span></div><input id="scrub" type="range" min="0" max="'+(data.length-1)+'" value="0" aria-label="逐步查看分镜"><h2 id="eventTitle"></h2><p id="voiceLine"></p><small id="intent"></small></section><nav class="scene-nav">'+ep.scenes.map(s=>'<button data-event="'+s.beats[0].id+'">'+s.id+' '+esc(s.title)+'</button>').join('')+'</nav><details><summary>查看八镜总览</summary><img class="overview" src="overview.png" alt="八镜分镜总览"></details>'+storyBlocks+'<section class="notes"><h2>验收时重点看这三件事</h2><ul><li>接卷、撑讲台、捂腹、摊爪、查看警报的动作是否对应口播；表情转折是否容易读清。</li><li>线稿→局部填色→细节的建立顺序是否自然，画完后的关系与反应是否继续讲述。</li><li>成人日常漫画的墨线、灰蓝/赭黄空间与猫的身份是否统一；原稿 N11 是否采用下面的措辞建议。</li></ul><p><b>一处口播建议，尚未应用：</b>“全是因为你的大脑误判了当前的危险局势”可改为“常常是因为你的大脑把当前的压力当成了警报”。原稿和主表当前保留你的原文。</p><p>静态审阅图已制作。线稿来自同一张定稿的同坐标轮廓派生，填色由同坐标区域遮罩示意；正式逐笔路径、透明人物/道具、接卷和迈步的连续动作，待分镜验收后按镜头制作。当前静帧不证明动画流畅度或音画同步。</p><p>所有时间都是预计值。你验收分镜并提供旁白后，再逐句和关键词对齐；语速快时合并次要填色步骤，保留动作接触、结果与反应。本轮没有制作 MP4，也没有编排 CRF 之后的段落。</p><details><summary>本段事实依据与范围</summary><ul>'+sourceList+'</ul></details><p><a href="../episode.json">唯一作者主表 episode.json</a> · <a href="review.md">文字分镜表</a> · <a href="script.txt">本段原文</a> · <a href="estimated.srt">预计时间 SRT</a> · <a href="evidence/generation-record.json">生成提示词与来源</a></p></section></main><script>const frames='+payload+';let index=0;const el=id=>document.getElementById(id);function select(i){index=Math.max(0,Math.min(frames.length-1,i));const f=frames[index];el("frame").src=f.image;el("frame").alt=f.action;el("counter").textContent=(index+1)+" / "+frames.length;el("time").textContent=f.at.toFixed(1)+"秒 · "+f.scene+" · "+f.phase;el("eventTitle").textContent=f.id+" "+f.action;el("voiceLine").textContent=f.narrationId+" ｜ "+f.text;el("intent").textContent="锚点："+f.anchor+" ｜ "+f.meaning;el("scrub").value=index;el("prev").disabled=index===0;el("next").disabled=index===frames.length-1;}el("prev").onclick=()=>select(index-1);el("next").onclick=()=>select(index+1);el("scrub").oninput=e=>select(Number(e.target.value));document.querySelectorAll("[data-event]").forEach(b=>b.onclick=()=>{select(frames.findIndex(f=>f.id===b.dataset.event));el("frame").scrollIntoView({behavior:"smooth",block:"center"});});document.onkeydown=e=>{if(e.target.tagName==="INPUT")return;if(e.key==="ArrowLeft")select(index-1);if(e.key==="ArrowRight")select(index+1);};select(0);</script></html>';
fs.writeFileSync(path.join(review,'index.html'),html);fs.writeFileSync(path.join(review,'review.html'),html);
fs.writeFileSync(path.join(review,'script.txt'),ep.narration.map(n=>n.text).join('\n\n')+'\n');
let md='# P001｜开头60秒分镜审阅\n\n预计60秒 · 尚未录音 · 静态画面 · status=draft\n\n从原稿开头到“让身体进入‘战斗或逃跑’模式”。逐句原文保留，完整原稿位于 P001/口播稿.txt。本轮未制作视频。\n\n[交互审阅页](index.html) · [八镜总览](overview.png)\n\n';
for(const s of ep.scenes){md+='## '+s.id+' '+s.title+'｜'+s.estimated.start.toFixed(1)+'–'+s.estimated.end.toFixed(1)+'秒\n\n'+s.narrationIds.map(id=>ep.narration.find(n=>n.id===id).text).join('\n\n')+'\n\n'+s.initialState+'\n\n姿态：'+s.reviewArt.pose+'\n\n表情：'+s.reviewArt.expression+'\n\n|事件／时间|口播编号与锚点|画面变化|作用|状态图|\n|---|---|---|---|---|\n';for(const b of s.beats)md+='|'+b.id+'／'+b.at.toFixed(1)+'秒|'+b.narrationId+'／'+b.anchor+'|'+b.action+'|'+b.meaning+'|[查看](states/'+b.id+'.png)|\n';md+='\n';}
md+='## 录音前一处建议\n\nN11 原文“全是因为你的大脑误判了当前的危险局势”过于绝对。建议“常常是因为你的大脑把当前的压力当成了警报”。尚未应用，原稿未改。\n\n## 当前阶段\n\n静态画面、线稿/填色阶段与对应表情已画出；轮廓提取和区域遮罩是分镜示意，正式逐笔路径、透明角色/道具、手爪接触前后状态和连续运动待验收后制作。不是已完成动画，也未做音画对齐。继续采用已确认3.0成人漫画风格与固定母版。\n\n'+ep.sources.map(s=>'- '+s.claim+' [来源]('+s.url+')。'+s.note).join('\n')+'\n\n验收后由用户提供旁白，再对齐实际时间与制作视频。\n';
fs.writeFileSync(path.join(review,'review.md'),md);
const stamp=t=>{const v=Math.round(t*1000);return String(Math.floor(v/3600000)).padStart(2,'0')+':'+String(Math.floor(v/60000)%60).padStart(2,'0')+':'+String(Math.floor(v/1000)%60).padStart(2,'0')+','+String(v%1000).padStart(3,'0');};
fs.writeFileSync(path.join(review,'estimated.srt'),ep.narration.map((n,i)=>(i+1)+'\n'+stamp(n.estimated.start)+' --> '+stamp(n.estimated.end)+'\n'+n.text+'\n').join('\n'));
fs.writeFileSync(path.join(review,'captions.json'),JSON.stringify(ep.narration.map(n=>({text:n.text,startMs:Math.round(n.estimated.start*1000),endMs:Math.round(n.estimated.end*1000),timestampMs:null,confidence:null})),null,2));
fs.writeFileSync(path.join(review,'evidence','state-manifest.json'),JSON.stringify({date:'2026-10-02',kind:'still SVG composition screenshots only; not video or continuous motion',episodeSha256:sha(path.join(here,'episode.json')),artHashes:Object.fromEntries(Object.keys(arts).map(a=>[a,sha(path.join(review,'art',a))])),states:evidence},null,2));
fs.copyFileSync(path.join(here,'episode.json'),path.join(root,'studio/public/episodes/P001/episode.json'));
console.log('Ready: '+review+' / '+all.length+' static states; no video generated.');

