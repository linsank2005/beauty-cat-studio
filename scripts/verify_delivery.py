"""Outcome checks: decode real exports, sample alpha, and compare template expression pixels."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
cfg=json.loads((ROOT/'local.config.json').read_text(encoding='utf-8-sig'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def probe(p):
    result=subprocess.run([cfg['ffprobe'],'-v','error','-show_streams','-show_format','-of','json',str(p)],capture_output=True,text=True,check=True)
    data=json.loads(result.stdout)
    return {'duration':float(data['format']['duration']),'streams':[{k:s[k] for k in ['codec_type','codec_name','width','height','pix_fmt','avg_frame_rate','duration','sample_rate','channels','tags'] if k in s} for s in data['streams']]}
def alpha_frame(p,decoder=None):
    command=[cfg['ffmpeg'],'-hide_banner','-loglevel','error']
    if decoder:command+=['-c:v',decoder]
    command+=['-ss','2.7','-i',str(p),'-frames:v','1','-pix_fmt','rgba','-f','rawvideo','pipe:1']
    raw=subprocess.run(command,capture_output=True,check=True).stdout
    array=np.frombuffer(raw,dtype=np.uint8).reshape(1080,1080,4)
    a=array[:,:,3]
    assert a[0,0]==0 and a.max()==255 and (a==0).mean()>.25, f'{p.name}: missing alpha'
    return {'corner_alpha':int(a[0,0]),'max_alpha':int(a.max()),'transparent_fraction':round(float((a==0).mean()),4)}

def main():
    movies=[ROOT/'exports/DEMO/DEMO_无声.mp4',ROOT/'exports/DEMO/DEMO_无声_无字幕.mp4',ROOT/'exports/templates/猫猫_模板与表情预览.mp4',ROOT/'exports/templates/cat-reveal-alpha.webm',ROOT/'exports/templates/cat-reveal-alpha.mov']
    qa=ROOT/'exports/qa/QA-TIMING_带口播.mp4'
    if qa.exists():movies.append(qa)
    media=[]
    for p in movies:
        info=probe(p)
        subprocess.run([cfg['ffmpeg'],'-hide_banner','-loglevel','error','-i',str(p),'-f','null','-'],capture_output=True,check=True)
        item={'file':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p),'full_decode':'PASS',**info}
        video=next(s for s in info['streams'] if s['codec_type']=='video')
        assert video['avg_frame_rate']=='30/1'
        if 'alpha' in p.name:
            assert video['width']==video['height']==1080 and abs(info['duration']-3.2)<.06
            item['alpha_sample']=alpha_frame(p,'libvpx-vp9' if p.suffix=='.webm' else None)
        elif p.parent.name.lower()=='demo':
            assert video['width']==1920 and video['height']==1080 and abs(info['duration']-32)<.06
            assert not any(s['codec_type']=='audio' for s in info['streams']), 'Original demo must stay silent'
        elif p==qa:
            assert any(s['codec_name']=='aac' and s['codec_type']=='audio' for s in info['streams'])
            assert abs(info['duration']-13)<.08
            item['use']='internal supplied-reference audio test, excluded from production archive'
        media.append(item)
    pngs=[]
    for p in sorted((ROOT/'studio/public/ip').glob('*.png'))+sorted((ROOT/'exports/templates').glob('0*.png')):
        im=Image.open(p)
        assert im.mode=='RGBA'
        a=np.asarray(im)[:,:,3]
        assert a[0,0]==0 and a.max()==255 and (a==0).mean()>.2
        visible=Image.fromarray((a>8).astype(np.uint8)*255).getbbox()
        assert visible and visible[0]>0 and visible[1]>0 and visible[2]<im.width and visible[3]<im.height
        pngs.append({'file':p.relative_to(ROOT).as_posix(),'size':im.size,'mode':im.mode,'visible_bounds_alpha_gt_8':visible,'transparent_fraction':round(float((a==0).mean()),4),'sha256':digest(p)})
    base=np.asarray(Image.open(ROOT/'exports/templates/06-complete.png'))
    state_results=[]
    # The tested rectangle surrounds only the face clip. All other pixels must be identical.
    outside=np.ones((1080,1080),dtype=bool);outside[388:640,508:908]=False
    for name in ['07-surprised.png','08-proud.png']:
        other=np.asarray(Image.open(ROOT/'exports/templates'/name))
        changed=np.any(base!=other,axis=2)
        assert changed.sum()>100 and not np.any(changed[outside]), f'{name}: face-only compositing failed'
        state_results.append({'file':name,'changed_pixels':int(changed.sum()),'changed_pixels_outside_face_bounds':int(changed[outside].sum())})
    captions=(ROOT/'exports/DEMO/DEMO.srt').read_text(encoding='utf-8')
    assert captions.count(' --> ')==8 and '00:00:32,000' in captions
    report={'date':'2026-10-01','media':media,'pngs':pngs,'expression_stability':state_results,'demo_subtitle_cues':8,'limits':'Full decoding is a technical integrity check. Key frames and playback were reviewed separately; original demo uses estimated time and has no user recording.'}
    dest=ROOT/'docs/verification/media-verification.json';dest.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'ok':True,'videos':len(media),'transparent_pngs':len(pngs),'face_only_states':len(state_results),'report':str(dest)},ensure_ascii=False))

if __name__=='__main__':main()
