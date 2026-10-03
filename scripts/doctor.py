"""Check rendering independently from the optional speech model."""
from pathlib import Path
import argparse, importlib.util, json, shutil, sys

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--require-model', action='store_true')
args = parser.parse_args()
cfg = json.loads((ROOT / 'local.config.json').read_text(encoding='utf-8-sig'))

def resolve(value):
    p = Path(value)
    if p.is_absolute():
        return p
    local = ROOT / p
    return local if local.exists() else Path(shutil.which(value) or local)

checks = {}
for name in ('node', 'ffmpeg', 'ffprobe', 'chrome'):
    p = resolve(cfg.get(name, 'missing'))
    checks[name] = {'path': str(p), 'exists': p.is_file(), 'required': True}
checks['node_modules'] = {'exists': (ROOT / 'studio/node_modules/remotion/package.json').is_file(), 'required': True}
checks['Pillow'] = {'exists': importlib.util.find_spec('PIL') is not None, 'required': True}
checks['faster_whisper'] = {'exists': importlib.util.find_spec('faster_whisper') is not None, 'required': args.require_model}
model = resolve(cfg.get('whisperModel', '.cache/models/faster-whisper-small'))
checks['whisperModel'] = {'path': str(model), 'exists': all((model / f).is_file() for f in ('model.bin', 'config.json', 'tokenizer.json')), 'required': args.require_model}
assets = ['cat-sit-neutral.png', 'cat-sit-surprised.png', 'cat-sit-proud.png', 'cat-front-neutral.png', 'cat-groom.png', 'cat-groom-surprised.png', 'cat-groom-proud.png', 'cat-walk-back.png']
checks['cat_assets'] = {'exists': all((ROOT / 'studio/public/ip' / x).is_file() for x in assets), 'count': len(assets), 'required': True}
ok = all(v['exists'] for v in checks.values() if v['required'])
result = {'ok': ok, 'python': sys.version.split()[0], 'checks': checks}
if not checks['whisperModel']['exists']:
    result['note'] = '旁白识别模型未安装；分镜、预览和导出不受影响。需要对齐新录音时运行 Start-Cat.ps1 -Action setup -InstallModel。'
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(0 if ok else 1)
