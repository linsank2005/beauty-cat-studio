"""Download only the optional speech model; do not replace shared existing weights."""
from pathlib import Path
import json
from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[1]
config = json.loads((ROOT / 'local.config.json').read_text(encoding='utf-8-sig'))
model = Path(config['whisperModel'])
if not model.is_absolute():
    model = ROOT / model
required = ('model.bin', 'config.json', 'tokenizer.json')
if not all((model / f).is_file() for f in required):
    print('下载 faster-whisper small 中文旁白识别模型；仅用于本机。', flush=True)
    snapshot_download('Systran/faster-whisper-small', local_dir=model, allow_patterns=['config.json', 'model.bin', 'tokenizer.json', 'vocabulary.*'])
if not all((model / f).is_file() for f in required):
    raise RuntimeError('模型下载不完整；请重新运行 setup -InstallModel。')
print('旁白识别模型已就绪。')
