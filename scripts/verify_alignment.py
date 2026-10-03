"""Integration evidence using a real supplied reference clip, never presented as the user's episode voice."""
from pathlib import Path
import json, subprocess, sys, copy
ROOT=Path(__file__).resolve().parents[1]
cfg=json.loads((ROOT/'local.config.json').read_text(encoding='utf-8-sig'))
dest=ROOT/'tmp/qa-alignment';dest.mkdir(parents=True,exist_ok=True)
source=next((ROOT/'study-video').glob('*BV1UFge6qEty*.mkv'))
audio=dest/'reference-only-13s.wav'
subprocess.run([cfg['ffmpeg'],'-hide_banner','-loglevel','error','-y','-i',str(source),'-t','13','-vn','-ac','1','-ar','16000',str(audio)],check=True)
phrases=['这就是你搭的窝也太潦草了吧','已经好几根树枝了','你还要怎样','而且又不是不能用','你看怎么放都没有问题的哦','啊怪不得现在全网都在耻笑我们']
expected_ranges=[(0,5),(5,7.5),(7.5,9.5),(9.5,12),(12,15),(15,18)]
known_ranges=[(.14,2.989),(2.989,4.669),(4.669,5.709),(5.709,6.849),(6.849,9.009),(9.009,12.42)]
ns=[{'id':f'QN{i+1}','text':text,'estimated':{'start':r[0],'end':r[1]}} for i,(text,r) in enumerate(zip(phrases,expected_ranges))]
bs=[{'id':f'QE{i+1}','narrationId':n['id'],'at':n['estimated']['start'],'anchor':phrases[i][:4],'action':'验证按句段移动画面事件','meaning':'内部技术测试，非生产创意','method':'direct'} for i,n in enumerate(ns)]
ep={'schemaVersion':1,'id':'QA-TIMING','title':'参考音频对齐内部验证','scriptVersion':'qa-1','status':'approved','timing':'estimated','fps':30,'width':1920,'height':1080,'duration':18,'burnCaptions':True,'narration':ns,'sources':[],
    'audioNote':'仅使用用户已经提供的参考视频前13秒做 ASR 与时间线测试。此音频不用于新 IP 样片。',
    'scenes':[{'id':'QS01','title':'逐句对齐测试','narrationIds':[n['id'] for n in ns],'estimated':{'start':0,'end':18},'background':'#fff8f1','initialState':'固定猫，按实际说话时间改变表情','beats':bs,'layers':[{'id':'qa-cat','kind':'cat','x':510,'y':130,'width':900,'showAt':'QE1','reveal':'draw','revealSeconds':2.4,'reactions':[{'at':'QE3','expression':'surprised'},{'at':'QE6','expression':'proud'}]}]}]}
file=dest/'episode.json';file.write_text(json.dumps(ep,ensure_ascii=False,indent=2),encoding='utf-8')
subprocess.run([sys.executable,str(ROOT/'scripts/align_voice.py'),'--episode',str(file),'--audio',str(audio),'--overwrite'],check=True)
aligned=json.loads((dest/'episode.aligned.json').read_text(encoding='utf-8'))
subprocess.run([cfg['node'],str(ROOT/'studio/scripts/episode.mjs'),'validate',str(dest/'episode.aligned.json')],check=True)
report=json.loads((dest/'alignment/alignment-report.json').read_text(encoding='utf-8'))
comparison=[{'id':n['id'],'estimated':n['estimated'],'actual':n['actual'],'reference_ai_subtitle':{'start':k[0],'end':k[1]},'difference_from_reference_start':round(n['actual']['start']-k[0],3),'difference_from_reference_end':round(n['actual']['end']-k[1],3)} for n,k in zip(aligned['narration'],known_ranges)]
# Negative test reuses the same audio-backed ASR: a completely missing sentence must halt alignment.
bad=copy.deepcopy(ep);bad['id']='QA-MISSING';bad['narration'][-1]['text']='这句话根本没有出现在这个录音里面';bad_dir=dest/'missing-case';bad_dir.mkdir(exist_ok=True);bad_file=bad_dir/'episode.json';bad_file.write_text(json.dumps(bad,ensure_ascii=False,indent=2),encoding='utf-8')
negative=subprocess.run([sys.executable,str(ROOT/'scripts/align_voice.py'),'--episode',str(bad_file),'--audio',str(audio),'--asr-json',str(dest/'alignment/raw-asr.json'),'--overwrite'],capture_output=True,text=True,encoding='utf-8')
if negative.returncode!=2:raise RuntimeError('缺句保护没有生效: '+negative.stdout+negative.stderr)
if (bad_dir/'episode.aligned.json').exists():raise RuntimeError('缺句时不应输出实际稿')
out=ROOT/'docs/verification';out.mkdir(exist_ok=True)
evidence={'test':'real supplied reference audio; timing pipeline, not new episode audio','source':str(source.relative_to(ROOT)),'clip':[0,13],'similarity':report['similarity'],'recognized_text':report['recognized_text'],'comparison':comparison,'missing_sentence_test':'PASS: exit 2 and no trustworthy time assignment','limits':'Reference AI subtitles are an independent rough comparison, not phoneme-level truth. Audio word timestamps need human playback review. Original estimated fields preserved.','actual_beats':aligned['scenes'][0]['beats']}
(out/'audio-alignment-test.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'ok':True,'similarity':report['similarity'],'comparison':comparison,'negative_test':'PASS','evidence':str(out/'audio-alignment-test.json')},ensure_ascii=False,indent=2))
