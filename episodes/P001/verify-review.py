"""Verify this static storyboard package; never produce video or change the script."""
from pathlib import Path
from collections import Counter
from hashlib import sha256
from html.parser import HTMLParser
import json
from PIL import Image, ImageDraw, ImageFont, ImageStat

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
REVIEW = HERE / 'review'
EVIDENCE = REVIEW / 'evidence'
digest = lambda p: sha256(p.read_bytes()).hexdigest()
read_json = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
ep = read_json(HERE / 'episode.json')
manifest = read_json(EVIDENCE / 'state-manifest.json')
checks = {}
def check(name, condition):
    checks[name] = bool(condition)
    if not condition:
        raise AssertionError(name)

source = ROOT / ep['reviewScope']['originalScript']
lines = [s.strip() for s in source.read_text(encoding='utf-8-sig').splitlines() if s.strip()]
check('original_script_hash', digest(source) == ep['reviewScope']['sourceSha256'])
check('exact_script_prefix', ''.join(n['text'] for n in ep['narration']) == ''.join(lines[:23]))
check('draft_estimated_60s_no_voice', ep['status'] == 'draft' and ep['timing'] == 'estimated' and ep['duration'] == 60 and not ep.get('voice'))
check('approval_pending', ep['reviewScope']['approval'] == 'pending' and not ep['reviewScope']['wordingSuggestion']['applied'])
check('narration_continuous', ep['narration'][0]['estimated']['start'] == 0 and ep['narration'][-1]['estimated']['end'] == 60 and all(a['estimated']['end'] == b['estimated']['start'] for a,b in zip(ep['narration'],ep['narration'][1:])))
check('scene_continuous', ep['scenes'][0]['estimated']['start'] == 0 and ep['scenes'][-1]['estimated']['end'] == 60 and all(a['estimated']['end'] == b['estimated']['start'] for a,b in zip(ep['scenes'],ep['scenes'][1:])))
check('narration_scene_coverage', Counter(i for s in ep['scenes'] for i in s['narrationIds']) == Counter(n['id'] for n in ep['narration']))
narration = {n['id']:n for n in ep['narration']}
events = [(s,b,l) for s in ep['scenes'] for b,l in zip(s['beats'],s['layers'])]
check('45_unique_events_and_layers', len(events) == 45 and len({b['id'] for _,b,_ in events}) == 45 and all(len(s['beats']) == len(s['layers']) for s in ep['scenes']))
check('chronological_events', all(a[1]['at'] < b[1]['at'] for a,b in zip(events,events[1:])))
for s,b,l in events:
    n = narration[b['narrationId']]
    check(b['id']+'_references', b['narrationId'] in s['narrationIds'] and l['showAt'] == b['id'] and n['estimated']['start'] <= b['at'] < n['estimated']['end'] and s['estimated']['start'] <= b['at'] < s['estimated']['end'])
    check(b['id']+'_anchor', b['anchor'] in n['text'] if b['anchor'] else b['id'] in {'E40','E42'})
check('manifest_current_author_table', manifest['episodeSha256'] == digest(HERE / 'episode.json'))
check('manifest_event_coverage', [m['event'] for m in manifest['states']] == [b['id'] for _,b,_ in events])
check('native_author_copy', digest(HERE / 'episode.json') == digest(ROOT / 'studio/public/episodes/P001/episode.json'))
image_checks = []
for (s,b,l),m in zip(events,manifest['states']):
    p = REVIEW / m['file']
    check(b['id']+'_manifest', m['at'] == b['at'] and m['narration'] == b['narrationId'] and m['scene'] == s['id'] and m['phase'] == l['reviewBuild']['phase'] and m['sha256'] == digest(p))
    check(b['id']+'_native_copy', digest(p) == digest(ROOT / 'studio/public' / l['src']))
    with Image.open(p) as im:
        im.load()
        spread = ImageStat.Stat(im.convert('L').resize((320,180))).stddev[0]
        check(b['id']+'_2K_decodes_not_blank', im.size == (2560,1440) and spread > 3)
        image_checks.append({'event':b['id'],'size':list(im.size),'lumaStddev':round(spread,2)})
check('45_distinct_visual_states', len({m['sha256'] for m in manifest['states']}) == 45)
for name,expected in manifest['artHashes'].items():
    check(name+'_master_and_copy', digest(REVIEW / 'art' / name) == expected == digest(ROOT / 'studio/public/episodes/P001/art' / name))
sealed = read_json(ROOT / 'docs/learning-v2/sweat-study/update-verification.json')['preservedFiles']
# Historical runtime hashes are provenance, not a prohibition on later tool maintenance.
# Check the original IP/style assets shipped here; source videos remain local.
protected = {p:h for p,h in sealed.items() if p.startswith(('IP参考/', 'studio/public/ip/', 'docs/style-v3/approved/'))}
check('sealed_IP_and_style_assets_unchanged', all(digest(ROOT / p) == expected.lower() for p,expected in protected.items()))
captions = read_json(REVIEW / 'captions.json')
check('16_estimated_captions', len(captions) == 16 and captions[0]['startMs'] == 0 and captions[-1]['endMs'] == 60000 and all(c['timestampMs'] is None for c in captions))
check('srt_end_time', '00:01:00,000' in (REVIEW / 'estimated.srt').read_text(encoding='utf-8'))
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        check('no_video_audio_elements', tag not in {'video','audio'})
        for key,value in attrs:
            if key in {'src','href'} and value and not value.startswith(('http:','https:','data:','#')):
                check('review_link_'+value, (REVIEW / value).is_file())
Links().feed((REVIEW / 'index.html').read_text(encoding='utf-8'))
check('no_video_output_in_episode', not any(p.suffix.lower() in {'.mp4','.mov','.mkv','.webm'} for base in [HERE,ROOT/'studio/public/episodes/P001'] for p in base.rglob('*') if p.is_file()))

try:
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
except OSError:
    font = ImageFont.load_default()
for batch in range(3):
    sheet = Image.new('RGB',(1536,1580),'#ece5d7')
    draw = ImageDraw.Draw(sheet)
    for i,(s,b,l) in enumerate(events[batch*15:(batch+1)*15]):
        x,y = (i%3)*512,(i//3)*316
        with Image.open(REVIEW/'states'/(b['id']+'.png')) as im:
            sheet.paste(im.convert('RGB').resize((512,288)),(x,y))
        draw.text((x+10,y+289),f"{b['id']} / {b['at']:.1f}s / {l['reviewBuild']['phase']}",fill='#17212d',font=font)
    sheet.save(EVIDENCE/f'states-contact-{batch+1:02}.jpg',quality=92)

report = {'date':'2026-10-02','scope':'P001 opening 60-second static storyboard; no video','ok':all(checks.values()),'checks':checks,'counts':{'narration':len(ep['narration']),'scenes':len(ep['scenes']),'events':len(events),'characters':len(''.join(n['text'] for n in ep['narration'])),'protectedFiles':len(protected)},'sourceSha256':digest(source),'episodeSha256':digest(HERE/'episode.json'),'imageChecks':image_checks,'limits':['Still states verify composition, phase differences and references only.','Continuous animation, voice timing and audio have not been produced or verified.'],'uiVerificationFile':'ui-verification.json'}
(EVIDENCE/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'ok':report['ok'],'counts':report['counts'],'checkCount':len(checks)},ensure_ascii=False))
