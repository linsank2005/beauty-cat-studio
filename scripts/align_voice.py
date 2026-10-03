"""Local Chinese ASR and script-aware timing; never silently replace the approved script."""
from pathlib import Path
import argparse, difflib, hashlib, json, os, re, shutil, subprocess, unicodedata

ROOT=Path(__file__).resolve().parents[1]
def read_json(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def normalized(s):return ''.join(c.lower() for c in unicodedata.normalize('NFKC',s) if c.isalnum())
def dump(p,data):Path(p).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--episode',required=True);ap.add_argument('--audio',required=True)
    ap.add_argument('--asr-json');ap.add_argument('--overwrite',action='store_true');args=ap.parse_args()
    ep_path=Path(args.episode).resolve();audio=Path(args.audio).resolve();ep=read_json(ep_path)
    if not ep_path.is_relative_to(ROOT):raise ValueError('episode.json 必须在本项目内')
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,32}',ep['id']):raise ValueError('期号无效')
    if not audio.is_file():raise FileNotFoundError(audio)
    if ep.get('status') not in ('approved','aligned'):raise ValueError('先审核口播与分镜，再对齐正式录音')
    out=ep_path.with_name(ep_path.stem+'.aligned.json')
    if out.exists() and not args.overwrite:raise FileExistsError(f'{out} 已存在；修订请加 --overwrite')
    config=read_json(ROOT/'local.config.json')
    probe=subprocess.run([config['ffprobe'],'-v','error','-show_entries','format=duration','-of','json',str(audio)],capture_output=True,text=True,check=True)
    duration=float(json.loads(probe.stdout)['format']['duration'])
    if not 0<duration<=180:raise ValueError('录音时长必须在 0—180 秒')
    adir=ep_path.parent/'alignment';adir.mkdir(exist_ok=True)
    source_record={'scriptFile':ep_path.relative_to(ROOT).as_posix(),'scriptSha256':sha(ep_path),'audioSha256':sha(audio)}
    expected=''.join(normalized(n['text']) for n in ep['narration'])
    if not expected:raise ValueError('口播为空')
    audio_sha=sha(audio)
    if args.asr_json:
        raw=read_json(args.asr_json)
        if raw.get('audio_sha256')!=audio_sha:raise ValueError('ASR 文件对应的录音哈希不同，禁止套用其他录音时间')
    else:
        from faster_whisper import WhisperModel
        model_path=Path(config['whisperModel'])
        if not model_path.is_absolute():model_path=ROOT/model_path
        if not model_path.is_dir():raise FileNotFoundError(f'本地模型缺失: {model_path}')
        print('使用本地 small 模型，CPU/int8；开始识别真实录音...',flush=True)
        model=WhisperModel(str(model_path),device='cpu',compute_type='int8',cpu_threads=min(4,os.cpu_count() or 1),local_files_only=True)
        # Decode with the project's verified FFmpeg. PyAV 19 removed metadata_errors;
        # passing PCM avoids that API mismatch and keeps all supported audio formats consistent.
        import numpy as np
        pcm=subprocess.run([config['ffmpeg'],'-hide_banner','-loglevel','error','-i',str(audio),'-vn','-ac','1','-ar','16000','-f','f32le','pipe:1'],capture_output=True,check=True).stdout
        samples=np.frombuffer(pcm,dtype=np.float32)
        # Episodes are <=3 minutes. Keep all audio: VAD can discard pitched character dialogue.
        segments,info=model.transcribe(samples,language='zh',beam_size=5,word_timestamps=True,vad_filter=False,
            initial_prompt='请用简体中文转录，保留数字与单位。')
        raw={'audio_sha256':audio_sha,'audio_duration':duration,'engine':'faster-whisper 1.2.1 / small / cpu int8','language':info.language,'segments':[]}
        for seg in segments:
            raw['segments'].append({'start':seg.start,'end':seg.end,'text':seg.text,'words':[{'text':w.word,'start':w.start,'end':w.end,'probability':w.probability} for w in (seg.words or [])]})
        dump(adir/'raw-asr.json',raw)
    recognized=[];times=[];fallback=False
    for seg in raw['segments']:
        words=seg.get('words') or [{'text':seg['text'],'start':seg['start'],'end':seg['end'],'probability':None}]
        if not seg.get('words'):fallback=True
        for w in words:
            chars=normalized(w['text'])
            for i,c in enumerate(chars):
                recognized.append(c);a=w['start']+(w['end']-w['start'])*i/max(1,len(chars));b=w['start']+(w['end']-w['start'])*(i+1)/max(1,len(chars))
                times.append((a,b))
    got=''.join(recognized)
    matcher=difflib.SequenceMatcher(None,expected,got,autojunk=False)
    mapping={a+k:b+k for a,b,length in matcher.get_matching_blocks() for k in range(length)}
    boundaries={};offset=0;units=[];failures=[]
    for n in ep['narration']:
        chars=normalized(n['text']);a=offset;b=a+len(chars);offset=b
        matched=[i for i in range(a,b) if i in mapping]
        coverage=len(matched)/max(1,len(chars))
        item={'id':n['id'],'expected':n['text'],'matched_characters':len(matched),'characters':len(chars),'coverage':round(coverage,4)}
        if matched:
            # Only mapped real audio times can establish a utterance boundary.
            start=times[mapping[matched[0]]][0];end=times[mapping[matched[-1]]][1]
            item.update(start=round(start,3),end=round(end,3));boundaries[n['id']]={'offset':a,'length':len(chars),'start':start,'end':end,'text':chars}
        if coverage<.75 or not matched:failures.append(f"{n['id']} 匹配率 {coverage:.0%}；可能改说、漏录或识别错误")
        units.append(item)
    ratio=matcher.ratio()
    if ratio<.72:failures.append(f'全稿相似度 {ratio:.0%}，不宜自动沿用原稿')
    report={'episode_id':ep['id'],'audio_sha256':audio_sha,'duration':duration,'script_version':ep['scriptVersion'],'method':'ASR word timestamps + normalized script character matching; character times inside multi-character words are estimated','similarity':round(ratio,4),'recognized_text':got,'units':units,'errors':failures,'warnings':[],'review_required':True}
    for item in units:
        if item['coverage']<1:report['warnings'].append(f"{item['id']} 存在识别差异；核对原稿、实际说法及句首/句尾，避免边界缩短")
    if fallback:report['warnings'].append('有段落缺逐词时间，采用段内估计；需人工核对')
    if failures:
        dump(adir/'alignment-report.json',report);dump(adir/'latest-status.json',{'status':'failed','episodeId':ep['id'],**source_record});print(json.dumps(report,ensure_ascii=False,indent=2));print('已保留识别和差异报告，未生成实际时间稿。请核对改说/漏录或修正原稿后重跑。');return 2
    prev=0
    for n in ep['narration']:
        v=boundaries[n['id']];start=max(prev,v['start']);end=min(duration,max(start+.033,v['end']))
        n['actual']={'start':round(start,3),'end':round(end,3)};prev=end
    for scene in ep['scenes']:
        last=-1
        for beat in scene['beats']:
            n=next(n for n in ep['narration'] if n['id']==beat['narrationId']);v=boundaries[n['id']]
            anchor=normalized(beat.get('anchor',''));index=v['text'].find(anchor) if anchor else -1
            if index>=0 and v['offset']+index in mapping:
                when=times[mapping[v['offset']+index]][0];method='keyword-word-timestamp'
            else:
                e=n['estimated'];fraction=max(0,min(.98,(beat['at']-e['start'])/(e['end']-e['start'])))
                when=n['actual']['start']+(n['actual']['end']-n['actual']['start'])*fraction;method='estimated-within-utterance'
                report['warnings'].append(f"{beat['id']} 未提供或未匹配关键词，按本句实际时长估计；复核语义时刻")
            # A forced order adjustment is surfaced, never hidden.
            if when<last:
                report['warnings'].append(f"{beat['id']} 关键词时间早于前事件，保留语义顺序并标记待复核")
                when=last+.033
            when=min(max(n['actual']['start'],when),n['actual']['end']-.01)
            beat['actualAt']=round(when,3);beat['actualMethod']=method;last=when
    for i,scene in enumerate(ep['scenes']):
        first=next(n for n in ep['narration'] if n['id']==scene['narrationIds'][0])
        start=0 if i==0 else first['actual']['start']
        if i+1<len(ep['scenes']):
            nid=ep['scenes'][i+1]['narrationIds'][0];end=next(n for n in ep['narration'] if n['id']==nid)['actual']['start']
        else:end=duration
        scene['actual']={'start':round(start,3),'end':round(end,3)}
    vdir=ROOT/'studio/public/episodes'/ep['id'];vdir.mkdir(parents=True,exist_ok=True)
    voice=vdir/f'voice-{audio_sha[:8]}{audio.suffix.lower()}'
    if not voice.exists():shutil.copy2(audio,voice)
    ep['voice']=voice.relative_to(ROOT/'studio/public').as_posix();ep['duration']=round(duration,3);ep['timing']='actual';ep['status']='aligned';ep['silenceDemo']=False
    ep['alignmentReview']='pending';ep['audioNote']='时间基于真实录音；原口播与预计时间均保留。请播放核对关键动作、停顿和包袱；逐字时刻不是音素强制对齐。'
    ep['alignmentSource']=source_record
    dump(out,ep);dump(adir/'alignment-report.json',report);dump(adir/'latest-status.json',{'status':'aligned','episodeId':ep['id'],**source_record})
    print(json.dumps({'output':str(out),'similarity':round(ratio,4),'utterances':len(units),'warnings':len(report['warnings']),'duration':duration},ensure_ascii=False));return 0

if __name__=='__main__':raise SystemExit(main())
