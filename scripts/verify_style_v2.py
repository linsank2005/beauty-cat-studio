"""Check the actual restyle exports and preservation of the approved opening/story."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))

def main():
    baseline=read(ROOT/'episodes/DEMO/revisions/style-v1/episode.json')
    current=read(ROOT/'episodes/DEMO/episode.json')
    assert baseline['narration']==current['narration']
    assert baseline['duration']==current['duration']==32
    event_times=lambda ep:[(b['id'],b['narrationId'],b['at']) for s in ep['scenes'] for b in s['beats']]
    assert event_times(baseline)==event_times(current)
    assert baseline['scenes'][0]['layers'][0]==current['scenes'][0]['layers'][0]
    hashes={
        'studio/src/Cat.tsx':'662baed08f525bffb035fcbcf2676b7655771b409ed82cd20401a9cdd6b05fdf',
        'studio/public/ip/cat-sit-neutral.png':'040fb18c2036e402bbf6f790ee29fabebc12d7c8709d828af81c32a2e6623496',
    }
    for rel,digest in hashes.items(): assert sha(ROOT/rel)==digest,rel
    opening=[]
    for frame in [15,45,60]:
        rel=f'frame-{frame:04d}.png'
        before=np.array(Image.open(ROOT/'docs/style-v2/intro-before'/rel))
        after=np.array(Image.open(ROOT/'docs/style-v2/intro-after'/rel))
        changed=int(np.any(before!=after,axis=2).sum())
        assert changed==0,rel
        opening.append({'frame':frame,'seconds':frame/30,'changed_pixels':changed})
    assets=[]
    for p in sorted((ROOT/'studio/public/props/style-v2').glob('*.png')):
        im=Image.open(p);assert im.mode=='RGBA'
        a=np.array(im)[:,:,3];bounds=Image.fromarray((a>16).astype(np.uint8)*255).getbbox()
        assert a[0,0]==0 and a.max()==255 and (a==0).mean()>.2
        assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<im.width and bounds[3]<im.height
        assets.append({'file':p.relative_to(ROOT).as_posix(),'size':im.size,'alpha_bounds':bounds,'transparent_fraction':round(float((a==0).mean()),4),'sha256':sha(p)})
    cfg=read(ROOT/'local.config.json');media=[]
    for name in ['DEMO_无声.mp4','DEMO_无声_无字幕.mp4']:
        p=ROOT/'exports/DEMO'/name
        info=json.loads(subprocess.run([cfg['ffprobe'],'-v','error','-show_streams','-show_format','-of','json',str(p)],capture_output=True,text=True,check=True).stdout)
        v=next(s for s in info['streams'] if s['codec_type']=='video')
        assert len(info['streams'])==1 and v['codec_name']=='h264' and v['width']==1920 and v['height']==1080 and v['avg_frame_rate']=='30/1'
        assert abs(float(info['format']['duration'])-32)<.05 and int(v['nb_frames'])==960
        subprocess.run([cfg['ffmpeg'],'-hide_banner','-loglevel','error','-i',str(p),'-f','null','-'],capture_output=True,check=True)
        media.append({'file':p.relative_to(ROOT).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size,'duration':float(info['format']['duration']),'frames':int(v['nb_frames']),'size':[v['width'],v['height']],'fps':v['avg_frame_rate'],'audio_streams':0,'full_decode':'PASS'})
    assert (ROOT/'exports/DEMO/DEMO.srt').read_bytes()==(ROOT/'exports/DEMO/history/style-v1/DEMO.srt').read_bytes()
    assert read(ROOT/'exports/DEMO/episode.snapshot.json')==current
    assert read(ROOT/'studio/public/episodes/DEMO/episode.json')==current
    report={'date':'2026-10-02','visual_version':current['visualVersion'],'story_and_event_times':'unchanged','event_count':len(event_times(current)),'cat_component_and_master_hashes':hashes,'opening_sample_comparisons':opening,'transparent_assets':assets,'rendered_media':media,'srt':'identical to baseline','source_and_preview_snapshot':'matches author table','limits':'Opening comparisons are native rendered samples at 0.5, 1.5, and 2 seconds. Technical checks do not measure subjective style quality. Playback and key states are reviewed separately. Demo is silent with estimated timing.'}
    dest=ROOT/'docs/style-v2/verification.json';dest.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'ok':True,'report':str(dest),'videos':len(media),'opening_unchanged_samples':len(opening),'assets':len(assets)},ensure_ascii=False))

if __name__=='__main__': main()
