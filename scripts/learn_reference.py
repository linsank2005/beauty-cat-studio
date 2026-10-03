"""Extract reference evidence; source files are never changed. Contact sheets are inspection aids."""
import json, subprocess, hashlib, math, argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CFG = json.loads((ROOT / 'local.config.json').read_text(encoding='utf-8-sig'))
OUT = ROOT / 'docs/learning-v2'
FRAME = ROOT / 'tmp/learning-v2'
CLIPS = {
    'NAVEL': ('BV19YohBnECC', 37.0, 7.5),
    'SLEEP': ('BV1sLPWzNEmy', 133.5, 5.0),
    'SKIN': ('BV1Yptj6zEEG', 198.5, 6.0),
    'MOSQUITO': ('BV1mkg36zEfX', 15.0, 4.5),
    'FALCON_OPEN': ('BV1UFge6qEty', 0.0, 13.0),
    'FALCON_COMPARE': ('BV1UFge6qEty', 74.5, 23.0),
    'FALCON_DRAW': ('BV1UFge6qEty', 96.0, 7.0),
}

def sheet(files, stamps, dest, columns=5, tile=(384,216)):
    w,h=tile; rows=math.ceil(len(files)/columns)
    canvas=Image.new('RGB',(columns*w,rows*(h+28)), '#eee9e0')
    draw=ImageDraw.Draw(canvas)
    for i,(p,t) in enumerate(zip(files,stamps)):
        x=(i%columns)*w; y=(i//columns)*(h+28)
        im=Image.open(p).convert('RGB'); im.thumbnail((w,h))
        canvas.paste(im,(x,y)); draw.text((x+8,y+h+4),f'{t:07.2f}s',fill='#222')
    canvas.save(dest,quality=92)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--only',choices=list(CLIPS));args=ap.parse_args()
    OUT.mkdir(parents=True,exist_ok=True); FRAME.mkdir(parents=True,exist_ok=True)
    records=[]
    for key,(bid,start,duration) in CLIPS.items():
        if args.only and key!=args.only:continue
        src=next((ROOT/'study-video').glob(f'*{bid}*.mkv'))
        dest=FRAME/key; dest.mkdir(exist_ok=True)
        fps=4 if not key.startswith('FALCON') or key=='FALCON_DRAW' else 2
        subprocess.run([CFG['ffmpeg'],'-hide_banner','-loglevel','error','-y','-ss',str(start),'-i',str(src),'-t',str(duration),'-vf',f'fps={fps},scale=768:-1',str(dest/'%04d.jpg')],check=True)
        files=sorted(dest.glob('*.jpg')); stamps=[start+i/fps for i in range(len(files))]
        # Several manageable sheets retain each inspected frame and readable timestamps.
        for page in range(math.ceil(len(files)/20)):
            a=page*20; sheet(files[a:a+20],stamps[a:a+20],OUT/f'{key}-{page+1:02d}.jpg')
        records.append({'id':key,'source':str(src.relative_to(ROOT)),'start':start,'end':start+duration,'fps':fps,'frames':len(files),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'time_note':'FFmpeg sample timestamps, dense samples give approx 1/fps boundary resolution'})
    if args.only:
        previous=json.loads((OUT/'extraction.json').read_text(encoding='utf-8')) if (OUT/'extraction.json').exists() else []
        records=[x for x in previous if x['id']!=args.only]+records
        (OUT/'extraction.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'sequences':len(records),'frames':sum(x['frames'] for x in records),'added':args.only}));return
    src=next((ROOT/'study-video').glob('*BV1UFge6qEty*.mkv'))
    dest=FRAME/'FALCON_OVERVIEW'; dest.mkdir(exist_ok=True)
    subprocess.run([CFG['ffmpeg'],'-hide_banner','-loglevel','error','-y','-i',str(src),'-vf','fps=1/6,scale=768:-1',str(dest/'%04d.jpg')],check=True)
    files=sorted(dest.glob('*.jpg')); stamps=[i*6 for i in range(len(files))]
    for page in range(math.ceil(len(files)/20)):
        a=page*20; sheet(files[a:a+20],stamps[a:a+20],OUT/f'FALCON_OVERVIEW-{page+1:02d}.jpg')
    records.append({'id':'FALCON_OVERVIEW','source':str(src.relative_to(ROOT)),'fps':1/6,'frames':len(files),'coverage':'whole-video sampled visuals plus supplied AI subtitle text; not frame-by-frame or audio verification','timestamp_uncertainty':'overview sample is a window cue, do not use as exact animation boundary'})
    (OUT/'extraction.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'sequences':len(records),'frames':sum(x['frames'] for x in records),'evidence':str(OUT)},ensure_ascii=False))

if __name__=='__main__': main()
