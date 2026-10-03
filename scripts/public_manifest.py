"""List and check the public snapshot without inheriting ignored historical files."""
from pathlib import Path
from hashlib import sha256
import argparse, json, re, shutil, subprocess

ROOT = Path(__file__).resolve().parents[1]

def public_files(root=ROOT):
    listing = subprocess.run(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=root, capture_output=True, check=True).stdout
    # --no-index also applies the current ignore rules to files tracked in an old commit.
    ignored = subprocess.run(['git', 'check-ignore', '--no-index', '-z', '--stdin'], cwd=root, input=listing, capture_output=True)
    if ignored.returncode not in (0, 1):
        raise RuntimeError('无法读取公开文件规则。')
    skip = set(ignored.stdout.decode('utf-8').split('\0'))
    names = sorted(set(listing.decode('utf-8').split('\0')) - skip - {''})
    return [root / n for n in names if (root / n).is_file()]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--copy-to')
    parser.add_argument('--date', default='2026-10-03')
    args = parser.parse_args()
    target = ROOT / 'docs/verification/public-files.json'
    files = public_files()
    entries, errors = [], []
    secrets = re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)')
    for p in files:
        if p.is_symlink() or not p.resolve().is_relative_to(ROOT):
            errors.append(p.relative_to(ROOT).as_posix() + ': outside source or symlink')
            continue
        data = p.read_bytes()
        rel = p.relative_to(ROOT).as_posix()
        if len(data) >= 100 * 2**20:
            errors.append(rel + ': exceeds single-file limit')
        if p.suffix.lower() in {'.json','.txt','.md','.py','.mjs','.ts','.tsx','.ps1','.html','.yml','.yaml'} and secrets.search(data):
            errors.append(rel + ': possible credential; content withheld')
        if p != target:
            entries.append({'file':rel, 'bytes':len(data), 'sha256':sha256(data).hexdigest()})
    if errors:
        raise RuntimeError('\n'.join(errors))
    blobs = {e['sha256']:e['bytes'] for e in entries}
    report = {'date':args.date, 'kind':'public runnable source and authored assets', 'hashScope':'source bytes before Git text newline normalization; authored episode tables and the P001 source script preserve exact bytes', 'fileCount':len(entries), 'bytes':sum(e['bytes'] for e in entries), 'uniqueBlobBytes':sum(blobs.values()), 'credentialsDetected':False, 'excluded':['machine settings and secrets','installed dependencies and model caches','third-party source media and extracted screenshots','raw narration recordings except the published demo track','temporary analyses and redundant large exports'], 'files':entries}
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    if args.copy_to:
        destination = (ROOT / args.copy_to).resolve()
        if not destination.is_relative_to(ROOT / 'tmp') or destination.exists():
            raise ValueError('验证副本必须是项目 tmp 下尚不存在的新目录。')
        for e in entries + [{'file':target.relative_to(ROOT).as_posix()}]:
            out = destination / e['file']
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / e['file'], out)
    print(json.dumps({k:v for k,v in report.items() if k != 'files'}, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
