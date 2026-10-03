"""Read-only reference extraction. Run with overview or detail; no episode rendering."""
import argparse
import hashlib
import json
import math
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
TEMP = ROOT / "tmp/sweat-study-20261002"
VIDEO = ROOT / "study-video/运动到全身流汗代表脂肪在燃烧吗？ [BV1k44y1y7Bs].mkv"
SUBTITLE = VIDEO.with_suffix(".ai-zh.srt")
# Select these only after viewing the full overview. Times refer to the source.
WINDOWS = [
    ("OPEN", 0, 10.5, 4),
    ("SUMMER", 16.3, 23.4, 4),
    ("NIGHT", 27.5, 36.9, 4),
    ("EAT", 38.4, 42.4, 4),
    ("DROP", 52.7, 58.6, 4),
    ("WORK", 74.4, 81.7, 4),
    ("RUN", 83.5, 90.9, 4),
    ("BORROW", 90.9, 98.6, 4),
    ("QUEUE", 128.8, 139.9, 4),
    ("TIRED", 139.9, 155.8, 4),
    ("WEIGHT", 155.8, 166.9, 4),
]


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def ip_contact_sheet():
    files = sorted((ROOT / "IP参考").glob("*.png"))
    canvas = Image.new("RGB", (1350, math.ceil(len(files)/3)*485), "#efedeb")
    draw = ImageDraw.Draw(canvas)
    records = []
    extra = 0
    for i, file in enumerate(files):
        x, y = i % 3 * 450, i // 3 * 485
        with Image.open(file) as im:
            im = im.convert("RGB")
            im.thumbnail((440,440))
            canvas.paste(im, (x+(450-im.width)//2,y))
        if file.stem.startswith("cat_ip"):
            label = file.stem
        else:
            extra += 1
            label = f"extra-{extra}"
        draw.text((x+12,y+455), label, fill="#222")
        records.append({"sheetId":label,"source":file.relative_to(ROOT).as_posix(),"sha256":digest(file)})
    canvas.save(HERE / "IP-POSES.jpg", quality=90)
    (HERE / "ip-inventory.json").write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding="utf-8")


def sequence(ffmpeg, label, start, end, fps):
    folder = TEMP / label
    folder.mkdir(parents=True, exist_ok=True)
    select = f"between(t,{start},{end})*(isnan(prev_selected_t)+gte(t-prev_selected_t,{1/fps}))"
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "info", "-y", "-i", str(VIDEO),
         "-an", "-vf", f"select='{select}',showinfo,scale=960:-1",
         "-fps_mode", "vfr", str(folder / "%04d.jpg")],
        capture_output=True, text=True, encoding="utf-8", errors="replace", check=True)
    stamps = [float(x) for x in re.findall(r"\bn:\s*\d+\s+pts:\s*-?\d+\s+pts_time:([\d.\-]+)", result.stderr)]
    files = [folder / f"{i+1:04d}.jpg" for i in range(len(stamps))]
    pages = []
    for page in range(math.ceil(len(files) / 12)):
        subset = files[page*12:page*12+12]
        canvas = Image.new("RGB", (1440, math.ceil(len(subset)/3)*298), "#e9e7e3")
        draw = ImageDraw.Draw(canvas)
        for j, file in enumerate(subset):
            x, y = j % 3 * 480, j // 3 * 298
            with Image.open(file) as im:
                canvas.paste(im.resize((480,270)), (x,y))
            draw.text((x+10,y+276), f"{stamps[page*12+j]:07.3f}s", fill="#202020")
        name = f"{label}-{page+1:02d}.jpg"
        canvas.save(HERE / name, quality=90)
        pages.append(name)
    return {"label": label, "start": start, "end": end, "targetFps": fps,
            "timestamps": stamps, "frames": len(files), "sheets": pages,
            "filter": select, "timeBasis": "actual selected source video PTS from showinfo"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["overview", "detail"])
    args = parser.parse_args()
    cfg = json.loads((ROOT / "local.config.json").read_text(encoding="utf-8-sig"))
    HERE.mkdir(parents=True, exist_ok=True)
    TEMP.mkdir(parents=True, exist_ok=True)
    manifest = HERE / "extraction.json"
    if args.mode == "overview":
        ip_contact_sheet()
        probe = json.loads(subprocess.check_output(
            [cfg["ffprobe"], "-v", "error", "-show_format", "-show_streams", "-of", "json", str(VIDEO)],
            text=True, encoding="utf-8"))
        metadata = {"studyDate": "2026-10-02", "source": str(VIDEO.relative_to(ROOT)),
                    "sourceSha256": digest(VIDEO), "subtitle": str(SUBTITLE.relative_to(ROOT)),
                    "subtitleSha256": digest(SUBTITLE), "duration": float(probe["format"]["duration"]),
                    "streams": [{k:s.get(k) for k in ["codec_type","codec_name","width","height","r_frame_rate","sample_rate","channels"]} for s in probe["streams"]],
                    "sequences": [sequence(cfg["ffmpeg"], "OVERVIEW", 0, float(probe["format"]["duration"]), 1)],
                    "evidenceLimit": "sampled visuals and supplied ASR subtitles; not author project files or phoneme-level listening"}
        subprocess.run([cfg["ffmpeg"], "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
                        "-map", "0:v:0", "-map", "0:a:0", "-c", "copy", "-movflags", "+faststart", str(TEMP / "reference.mp4")], check=True)
        metadata["playbackCopy"] = {"method":"stream-copy MKV to browser-readable MP4; no picture or audio edits", "sha256":digest(TEMP / "reference.mp4")}
    else:
        metadata = json.loads(manifest.read_text(encoding="utf-8"))
        metadata["sequences"] = [s for s in metadata["sequences"] if s["label"] == "OVERVIEW"]
        metadata["sequences"] += [sequence(cfg["ffmpeg"], label, start, end, fps) for label,start,end,fps in WINDOWS]
    manifest.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"mode":args.mode,"frames":sum(s["frames"] for s in metadata["sequences"]),
                      "sheets":sum(len(s["sheets"]) for s in metadata["sequences"]),
                      "duration":metadata["duration"]}))


if __name__ == "__main__":
    main()
