import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const root=path.resolve(studio,'..');
export const readJson=(file)=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
export const active=(entry,actual)=>actual&&entry.actual?entry.actual:entry.estimated;
export const beatAt=(beat,actual)=>actual&&Number.isFinite(beat.actualAt)?beat.actualAt:beat.at;
export const safeInside=(base,relative)=>{
  const dest=path.resolve(base,relative); const rel=path.relative(base,dest);
  if(rel.startsWith('..')||path.isAbsolute(rel))throw new Error(`路径超出目录: ${relative}`);
  return dest;
};

export function validate(ep,{checkAssets=true}={}) {
  const errors=[],warnings=[]; const check=(ok,msg)=>{if(!ok)errors.push(msg);};
  const actual=ep.timing==='actual';
  check(ep.schemaVersion===1,'schemaVersion 必须为 1');
  check(/^[A-Za-z0-9_-]{1,32}$/.test(ep.id??''),'id 使用 1—32 位英文、数字、短横线或下划线');
  check(['draft','approved','aligned'].includes(ep.status),'未知状态');
  check(['estimated','actual'].includes(ep.timing),'timing 必须为 estimated 或 actual');
  check(ep.fps===30,'当前制作基准是 30fps');
  check((ep.width===1920&&ep.height===1080)||(ep.width===2560&&ep.height===1440),'当前模板支持 1920×1080 或 2560×1440 横版；竖版需重新编排');
  const designWidth=ep.designWidth??ep.width,designHeight=ep.designHeight??ep.height;
  check(Number.isFinite(designWidth)&&designWidth>0&&Number.isFinite(designHeight)&&designHeight>0&&Math.abs(designWidth/designHeight-ep.width/ep.height)<.001,'构图坐标必须与输出画幅同宽高比');
  check(Number.isFinite(ep.duration)&&ep.duration>0&&ep.duration<=180,'视频时长必须在 0—180 秒');
  check(ep.narration?.length>0,'先补全口播'); check(ep.scenes?.length>0,'先补全分镜');
  const ns=ep.narration??[], scenes=ep.scenes??[]; const ids=new Set();
  const register=(id)=>{check(typeof id==='string'&&id.length>0, '编号不能为空');check(!ids.has(id),`重复编号: ${id}`);ids.add(id);};
  let prevN=0;
  const narrativeMap=new Map(ns.map(n=>[n.id,n])); const sceneUse=new Map();
  for(const n of ns) {
    register(n.id);check(typeof n.text==='string'&&n.text.trim().length>0,`${n.id} 缺口播`);
    if(actual)check(Boolean(n.actual),`${n.id} 缺实际时间`);
    const r=active(n,actual)??{};
    check(Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start,`${n.id} 时间无效`);
    check(r.start>=prevN-.025&&r.end<=ep.duration+.025,`${n.id} 与前句重叠或越界`);prevN=r.end;
    if((n.text??'').replace(/[\s，。！？、：；]/g,'').length>30)warnings.push(`${n.id} 字幕偏长，建议拆成更短的可录单元`);
  }
  let end=0;
  for(const s of scenes) {
    register(s.id);if(actual)check(Boolean(s.actual),`${s.id} 缺实际时间`);
    const r=active(s,actual)??{};
    check(Math.abs(r.start-end)<=1/ep.fps+.001,`${s.id} 场景有空隙或重叠`);end=r.end;
    check(Number.isFinite(r.start)&&r.end>r.start&&r.end<=ep.duration+.025,`${s.id} 场景时间无效`);
    check(s.layers?.length>0,`${s.id} 没有画面`);
    check(s.beats?.length>0,`${s.id} 没有信息事件`);
    const beats=new Map((s.beats??[]).map(b=>[b.id,b])); let last=r.start;
    if(s.transitionInSeconds!==undefined)check(Number.isFinite(s.transitionInSeconds)&&s.transitionInSeconds>=0&&s.transitionInSeconds<r.end-r.start,`${s.id} 转场长度无效`);
    let lastCamera=-Infinity;
    for(const camera of s.camera??[]){check(beats.has(camera.at),`${s.id} camera 引用未知事件`);check([camera.x,camera.y,camera.scale].every(Number.isFinite)&&camera.scale>0,`${s.id} camera 参数无效`);if(beats.has(camera.at)){const t=beatAt(beats.get(camera.at),actual);check(t>lastCamera,`${s.id} camera 时间必须递增`);lastCamera=t;}}
    if(s.art){check(['vanity','thoughts','compare','focus','exit'].includes(s.art.variant),`${s.id} 未知场景美术基底`);if(s.art.appearAt)check(beats.has(s.art.appearAt),`${s.id} 美术基底引用未知事件`);}
    for(const nid of s.narrationIds??[]){check(narrativeMap.has(nid),`${s.id} 未知口播 ${nid}`);sceneUse.set(nid,(sceneUse.get(nid)??0)+1);}
    for(const b of s.beats??[]) {
      register(b.id);const n=narrativeMap.get(b.narrationId);const at=beatAt(b,actual);
      check(Boolean(n),`${b.id} 未知口播 ${b.narrationId}`);
      check((s.narrationIds??[]).includes(b.narrationId),`${b.id} 口播不属于本场景`);
      check(at>=r.start-.025&&at<r.end,`${b.id} 事件越出场景`);
      check(at>=last-.025,`${b.id} 事件顺序倒置`);
      if(n){const nt=active(n,actual);check(at>=nt.start-.3&&at<=nt.end+.1,`${b.id} 不在对应口播时间内`);}
      if(at-last>4)warnings.push(`${s.id} ${last.toFixed(1)}—${at.toFixed(1)}s 超过4秒无新事件，请判断停留是否有意义`);
      check(Boolean(b.action&&b.meaning),`${b.id} 缺变化或语义作用`);last=at;
    }
    if(r.end-last>4)warnings.push(`${s.id} 结尾有 ${(r.end-last).toFixed(1)}s 停留，请核对阅读/反应需要`);
    for(const l of s.layers??[]) {
      register(l.id);check(['cat','image','text','path','shape'].includes(l.kind),`${l.id} 未知图层类型`);
      check(Number.isFinite(l.x)&&Number.isFinite(l.y),`${l.id} 缺位置`);
      check(beats.has(l.showAt),`${l.id} showAt 未知`);if(l.hideAt)check(beats.has(l.hideAt),`${l.id} hideAt 未知`);
      if(l.hideAt&&beats.has(l.showAt)&&beats.has(l.hideAt))check(beatAt(beats.get(l.hideAt),actual)>beatAt(beats.get(l.showAt),actual),`${l.id} 消失时间早于登场`);
      let lastMotion=beats.has(l.showAt)?beatAt(beats.get(l.showAt),actual):-1;
      for(const m of l.motion??[]){check(beats.has(m.at),`${l.id} motion 未知事件 ${m.at}`);if(beats.has(m.at)){const t=beatAt(beats.get(m.at),actual);check(t>lastMotion,`${l.id} motion 时间必须递增`);lastMotion=t;}}
      for(const re of l.reactions??[])check(beats.has(re.at),`${l.id} reaction 未知事件`);
      if(l.sourceRect){const c=l.sourceRect;check(l.kind==='image',`${l.id} 仅图片可指定 sourceRect`);check(['x','y','width','height','sourceWidth','sourceHeight'].every(k=>Number.isFinite(c[k])),`${l.id} sourceRect 缺尺寸`);check(c.x>=0&&c.y>=0&&c.width>0&&c.height>0&&c.sourceWidth>0&&c.sourceHeight>0&&c.x+c.width<=c.sourceWidth&&c.y+c.height<=c.sourceHeight,`${l.id} sourceRect 超出原图`);}
      if(l.kind==='image'&&checkAssets){try{check(fs.existsSync(safeInside(path.join(studio,'public'),l.src??'')),`${l.id} 缺素材 ${l.src}`);}catch(e){errors.push(e.message);}}
      if(l.kind==='cat'){
        const view=l.view??'sit';check(['sit','front','groom','walk'].includes(view),`${l.id} 未知猫姿态 ${view}`);
        const expressions=[l.expression??'neutral',...(l.reactions??[]).map(r=>r.expression)];
        for(const expression of new Set(expressions)){
          check(['neutral','surprised','proud'].includes(expression),`${l.id} 未知猫表情 ${expression}`);
          check(!['front','walk'].includes(view)||expression==='neutral',`${l.id} ${view} 暂无独立表情，请使用支持的姿态`);
          if(checkAssets){const asset=view==='front'?'cat-front-neutral.png':view==='walk'?'cat-walk-back.png':view==='groom'&&expression==='neutral'?'cat-groom.png':`cat-${view}-${expression}.png`;check(fs.existsSync(path.join(studio,'public/ip',asset)),`${l.id} 缺猫素材 ${asset}`);}
        }
        if(l.walk)check(view==='walk'&&[l.walk.durationSeconds,l.walk.distanceX,l.walk.distanceY,l.walk.endScale,l.walk.cycles].every(Number.isFinite)&&l.walk.durationSeconds>0&&l.walk.endScale>0&&l.walk.cycles>0,`${l.id} 行走参数无效`);
      }
    }
  }
  for(const n of ns)check(sceneUse.get(n.id)===1,`${n.id} 必须且只能归属一个场景`);
  check(Math.abs(end-ep.duration)<=1/ep.fps+.001,'场景没有覆盖到视频末尾');
  if(ep.voice&&checkAssets)check(fs.existsSync(safeInside(path.join(studio,'public'),ep.voice)),`缺录音 ${ep.voice}`);
  if(actual&&!ep.voice)errors.push('实际时间稿缺录音');
  if(actual&&ep.alignmentSource){try{
    const src=safeInside(root,ep.alignmentSource.scriptFile);
    check(fs.existsSync(src),'录音对齐的原稿文件缺失');
    if(fs.existsSync(src))check(createHash('sha256').update(fs.readFileSync(src)).digest('hex')===ep.alignmentSource.scriptSha256,'原稿/分镜已修订，请同步并重新对齐，不能沿用旧实际稿');
    const latestFile=path.join(path.dirname(src),'alignment/latest-status.json');
    if(fs.existsSync(latestFile))check(readJson(latestFile).status!=='failed','最近一次录音对齐失败，禁止把旧实际稿当作新录音结果');
    if(ep.voice&&checkAssets){const voice=safeInside(path.join(studio,'public'),ep.voice);if(fs.existsSync(voice))check(createHash('sha256').update(fs.readFileSync(voice)).digest('hex')===ep.alignmentSource.audioSha256,'录音文件已改变，请重新对齐');}
  }catch(e){errors.push(e.message);}}
  return {ok:errors.length===0,errors,warnings};
}

export function captions(ep){const actual=ep.timing==='actual';return ep.narration.map(n=>({text:n.text,startMs:Math.round(active(n,actual).start*1000),endMs:Math.round(active(n,actual).end*1000),timestampMs:null,confidence:null}));}
const stamp=(t)=>{const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
export function srt(ep){return captions(ep).map((c,i)=>`${i+1}\n${stamp(c.startMs/1000)} --> ${stamp(c.endMs/1000)}\n${c.text}\n`).join('\n');}
const md=(s)=>String(s??'').replace(/\|/g,'\\|').replace(/\n/g,'<br>');
const html=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const range=(r)=>r?`${r.start.toFixed(2)}–${r.end.toFixed(2)}s`:'待录音';

export function writeReview(ep,directory){
  fs.mkdirSync(directory,{recursive:true}); const actual=ep.timing==='actual';
  // Static files are generated preview copies; episodes/<id> remains the authored source.
  for(const id of [ep.id,'active']){const d=path.join(studio,'public/episodes',id);fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,'episode.json'),JSON.stringify(ep,null,2));}
  let text=`# ${ep.title}\n\n版本 ${ep.scriptVersion} · ${ep.id} · ${ep.duration.toFixed(2)}秒 · ${actual?'实际录音时间':'预计时间，尚未录音'}\n\n${ep.audioNote??''}\n\n## 完整口播\n\n${ep.narration.map(n=>n.text).join('\n\n')}\n\n## 口播与画面主表\n\n|段落/事件|完整对应口播|预计 / 实际时间|构图与起始状态|分阶段变化及其作用|素材与实现|\n|---|---|---|---|---|---|\n`;
  const rows=[];
  for(const s of ep.scenes){for(const n of ep.narration.filter(n=>s.narrationIds.includes(n.id))){const events=s.beats.filter(b=>b.narrationId===n.id);
    const changes=events.map(b=>`${b.id} ${beatAt(b,actual).toFixed(2)}s：${b.action}；${b.meaning}〔${b.method}〕`).join('\n');
    const layers=s.layers.filter(l=>events.some(b=>b.id===l.showAt)||l.kind==='cat').map(l=>`${l.id}: ${l.src??(l.kind==='cat'?`猫/${l.view??'sit'}`:l.text??l.kind)}${l.reveal?`，${l.reveal}`:''}`).join('\n');
    const row=[n.id+' / '+events.map(x=>x.id).join('、'),n.text,range(n.estimated)+' / '+range(n.actual),s.initialState,changes,layers];rows.push(row);
    text+='|'+row.map(md).join('|')+'|\n';
  }}
  if(ep.sources?.length)text+='\n## 事实来源\n\n'+ep.sources.map(x=>`- ${x.claim}：[来源](${x.url})${x.note?'；'+x.note:''}`).join('\n')+'\n';
  const checks=validate(ep);text+='\n## 审核项\n\n口播是否愿意照着录；画面是否讲清楚；隐喻和反差是否容易读懂；同一猫是否保持一致。\n';
  if(checks.warnings.length)text+='\n自动提醒（需要判断，不是强制剪切）：\n\n'+checks.warnings.map(x=>'- '+x).join('\n')+'\n';
  fs.writeFileSync(path.join(directory,'review.md'),text);
  fs.writeFileSync(path.join(directory,'script.txt'),ep.narration.map(n=>n.text).join('\n\n')+'\n');
  fs.writeFileSync(path.join(directory,actual?'actual.srt':'estimated.srt'),srt(ep));
  fs.writeFileSync(path.join(directory,'captions.json'),JSON.stringify(captions(ep),null,2));
  const images=ep.scenes.map(s=>`<figure><img src="${s.id}.png" alt="${html(s.title)}"><figcaption>${html(s.id+' '+s.title)}</figcaption></figure>`).join('');
  fs.writeFileSync(path.join(directory,'review.html'),`<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><title>${html(ep.title)}</title><style>body{font:18px/1.65 'Microsoft YaHei',sans-serif;color:#292222;background:#fff9f4;margin:40px auto;max-width:1500px;padding:0 25px}h1{font-size:34px}table{width:100%;border-collapse:collapse;font-size:16px}td,th{vertical-align:top;border:1px solid #cfbdba;padding:10px}img{width:100%;max-width:960px}figure{margin:25px 0}figcaption{color:#775066}.script{font-size:23px;line-height:1.85}button{font:inherit}</style><h1>${html(ep.title)}</h1><p>${html(ep.id+' · '+ep.scriptVersion+' · '+(actual?'实际时间':'预计时间，未录音'))}</p><p>${html(ep.audioNote??'')}</p><div class="script">${ep.narration.map(n=>html(n.text)).join('<br>')}</div><h2>关键画面</h2>${images}<h2>一份口播与画面主表</h2><table><tr>${['段落/事件','完整口播','预计 / 实际时间','起始构图','画面变化与作用','素材与实现'].map(x=>'<th>'+x+'</th>').join('')}</tr>${rows.map(r=>'<tr>'+r.map(x=>'<td>'+html(x).replace(/\n/g,'<br>')+'</td>').join('')+'</tr>').join('')}</table><p>预计稿用于整体审阅；实际稿在录音对齐后复核关键动作和包袱时刻。</p></html>`);
  return directory;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [command,arg,...rest]=process.argv.slice(2);
  if(command==='init'){
    if(!/^[A-Za-z0-9_-]{1,32}$/.test(arg??''))throw new Error('提供合法期号，例如 P001');
    const dir=safeInside(path.join(root,'episodes'),arg);fs.mkdirSync(dir,{recursive:true});
    const ep={schemaVersion:1,id:arg,title:rest.join(' ')||'待填写主题',scriptVersion:'1.0',status:'draft',timing:'estimated',fps:30,width:1920,height:1080,duration:120,burnCaptions:true,narration:[],scenes:[],sources:[]};
    fs.writeFileSync(path.join(dir,'episode.json'),JSON.stringify(ep,null,2),{flag:'wx'});
    console.log(`已建立 ${dir}。交给编剧与画面编排技能补全后，再生成审阅稿。`);
  }else if(['validate','review'].includes(command)){
    const file=path.resolve(arg);const ep=readJson(file);const result=validate(ep);console.log(JSON.stringify(result,null,2));
    if(!result.ok)process.exitCode=1;
    else if(command==='review')console.log(writeReview(ep,path.join(path.dirname(file),'review')));
  }else {console.log('episode init <期号> <主题> | validate <episode.json> | review <episode.json>');process.exitCode=command?1:0;}
}
