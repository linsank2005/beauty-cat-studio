import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {root, studio, readJson, validate, safeInside} from './episode.mjs';

/** This template has one user-supplied voice track at time zero, with no generated music/SFX. */
export function muxUserVoice(ep, videoFile) {
  if (!ep.voice) throw new Error('缺少用户口播');
  const video = safeInside(path.join(root, 'exports'), path.relative(path.join(root, 'exports'), path.resolve(videoFile)));
  const voice = safeInside(path.join(studio, 'public'), ep.voice);
  if (!fs.existsSync(video) || !fs.existsSync(voice)) throw new Error('视频或口播文件缺失');
  const config = readJson(path.join(root, 'local.config.json'));
  const duration = Math.ceil(ep.duration * ep.fps) / ep.fps;
  const temporary = video.replace(/\.mp4$/i, '.voice-' + Date.now() + '.mp4');
  if (temporary === video || fs.existsSync(temporary)) throw new Error('口播合成临时路径无效');
  const result = spawnSync(config.ffmpeg, [
    '-v', 'error', '-xerror', '-i', video, '-i', voice,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-af', 'apad=whole_dur=' + duration + ',atrim=end=' + duration + ',asetpts=PTS-STARTPTS',
    '-t', String(duration), '-movflags', '+faststart', temporary
  ], {encoding:'utf8', windowsHide:true});
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || 'FFmpeg 合入口播失败');
  // Rename only the newly generated deliverable, never the supplied source recording.
  fs.renameSync(temporary, video);
  console.log('VOICE 原始录音从0秒合入，保持原速/电平：' + video);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const [episodeFile, videoFile] = process.argv.slice(2);
  if (!episodeFile || !videoFile) throw new Error('mux-voice <episode.json> <exports/...mp4>');
  const ep = readJson(path.resolve(episodeFile));
  const check = validate(ep);
  if (!check.ok) throw new Error(check.errors.join('\n'));
  muxUserVoice(ep, videoFile);
}

