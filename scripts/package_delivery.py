"""Package authored source and usable outputs; verify every archived byte against its manifest."""
from pathlib import Path
import argparse,datetime,hashlib,json,zipfile
from public_manifest import public_files

ROOT=Path(__file__).resolve().parents[1]
def sha_bytes(data):return hashlib.sha256(data).hexdigest()
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--overwrite',action='store_true');ap.add_argument('--version',choices=['V2','V3'],default='V2');ap.add_argument('--date',default=datetime.date.today().isoformat());args=ap.parse_args()
    dest=ROOT/f'exports/粉猫_可生产交付_{args.version}.zip'
    if dest.exists() and not args.overwrite:raise FileExistsError(f'{dest} 已存在；修订归档请加 --overwrite')
    files=set(public_files())
    files={p for p in files if p.name!='delivery-package.json'}
    ordered=sorted(files,key=lambda p:p.relative_to(ROOT).as_posix())
    entries=[]
    for p in ordered:
        rel=p.relative_to(ROOT).as_posix()
        assert not any(x in p.parts for x in ['node_modules','.venv','.remotion','tmp','QA-TIMING','qa'])
        assert p.name!='local.config.json'
        assert not p.name.startswith('voice-') or rel=='studio/public/episodes/DEMO_V3_2K/voice-fc7b21e7.wav'
        data=p.read_bytes();entries.append({'file':rel,'bytes':len(data),'sha256':sha_bytes(data)})
    manifest={'date':args.date,'version':args.version,'kind':'source, assets, review and rendered outputs; current machine runtime stays installed','file_count':len(entries),'files':entries}
    manifest_data=json.dumps(manifest,ensure_ascii=False,indent=2).encode('utf-8')
    with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        for p,e in zip(ordered,entries):archive.write(p,e['file'])
        archive.writestr('交付清单.json',manifest_data)
    with zipfile.ZipFile(dest) as archive:
        assert archive.testzip() is None
        assert len(archive.namelist())==len(entries)+1
        for e in entries:assert sha_bytes(archive.read(e['file']))==e['sha256'],e['file']
    result={'ok':True,'file':dest.relative_to(ROOT).as_posix(),'files_including_manifest':len(entries)+1,'bytes':dest.stat().st_size,'sha256':sha_bytes(dest.read_bytes()),'crc_and_content_hashes':'PASS','excluded':['installed runtimes/dependencies','shared model','original reference videos','internal reference-audio tests','temporary analysis files']}
    (ROOT/'docs/verification/delivery-package.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
