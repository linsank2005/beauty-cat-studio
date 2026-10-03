# Beauty Cat · 粉猫短视频工作室

[公开仓库：linsank2005/beauty-cat-studio](https://github.com/linsank2005/beauty-cat-studio)

面向成人女性的中文插画短视频工程。固定粉猫 IP，采用已确认的 3.0 成人日常漫画画风；支持 16:9、1080p / 2K、30fps、三分钟以内的作品。统一使用 `Start-Cat.ps1`，由当前 Codex Agent 顺序承担编剧、分镜和制作，不默认启动多个代理。

## 换一台电脑使用

当前启动入口支持 **Windows x64**。先安装并加入 PATH：

- [Node.js](https://nodejs.org/en/download)：推荐 24 LTS，包含 npm。
- [Python](https://www.python.org/downloads/windows/)：推荐 3.12 x64。
- [FFmpeg / ffprobe](https://ffmpeg.org/download.html)：两个可执行程序都须能在终端找到。

安装后重新打开 PowerShell，下载仓库（也可点 GitHub 的 Code → Download ZIP 并解压）：

```powershell
git clone https://github.com/linsank2005/beauty-cat-studio.git
cd beauty-cat-studio
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-Cat.ps1 -Action setup
```

首次 `setup` 自动识别工具、生成不入库的 `local.config.json`，安装锁定的 Python / Node 依赖，下载渲染浏览器，并准备预览副本。已有配置不覆盖。首次安装需要联网；依赖安装在项目内。

随后选择入口：

```powershell
# 看当前 P001 的一分钟分镜，打开终端显示的地址
.\Start-Cat.ps1 -Action board -Episode P001

# 检查工程并打开动画工作台
.\Start-Cat.ps1 -Action check -Episode P001
.\Start-Cat.ps1 -Action preview -Episode STYLE12
```

分镜页也能直接打开 [episodes/P001/review/index.html](episodes/P001/review/index.html)；已导出样片可直接打开 [exports/index.html](exports/index.html)。`board` 默认端口 3370，占用时加 `-Port 3371`；终端用 Ctrl+C 停止。

**需要对齐新旁白时，再安装识别模型：**

```powershell
.\Start-Cat.ps1 -Action setup -InstallModel
.\Start-Cat.ps1 -Action doctor -RequireModel
```

模型下载到本机 `.cache/models/faster-whisper-small/`；不需要 GPU，不上传 GitHub。已有配置指向完整模型时直接复用。没有模型时仍可看分镜、预览动画、导出已编排的视频。工具不在 PATH 时，可按 [配置示例](local.config.example.json)填写本机绝对路径后运行 `setup`。

## 当前有哪些内容

| 内容 | 状态与入口 |
|---|---|
| P001：紧张时为什么又想去洗手间 | 开头预计 60 秒，16 段口播、8 组分镜、45 张 2K 状态图；[审阅页](episodes/P001/review/index.html)。尚未通过分镜验收，未制作视频。 |
| STYLE12 | 已确认 3.0 画风的 [12 秒无声小样](exports/STYLE12/STYLE12_无声_无字幕.mp4)。 |
| DEMO_V3_2K | 根据用户旁白重排的 [约 25 秒 2K 样片](exports/DEMO_V3_2K/DEMO_V3_2K_带口播.mp4)，含表情变化与扭胯出门；[制作说明](episodes/DEMO_V3_2K/制作说明.md)。实际主表和合并旁白均包含，可复现。 |
| DEMO | [32 秒旧风格无声样片](exports/DEMO/DEMO_无声.mp4)，保留为历史参考。 |
| 猫猫模板 | [绘出与表情预览](exports/templates/猫猫_模板与表情预览.mp4)、[IP 总览](exports/templates/IP基准总览.png)，以及 8 张正式姿态／表情源 PNG。 |

P001 的线稿与填色属于分镜示意；逐笔路径、透明分层和连续动作在分镜验收后制作。现有动画模板覆盖坐姿绘出、脸区表情、关键姿态和背身程序化步态，复杂动作仍按镜头补素材。

## 正常制作流程

1. 给主题，先制作完整可录口播、对应分镜、预计时间和关键画面，供整体审核。
2. 用户验收后提供旁白；保留预计稿，另建实际时间稿，调整句段、关键词与视觉事件。
3. 审核实际编排后，渲染 MP4、独立 SRT、主表快照与可编辑源文件。配音、配乐与音效由用户负责。

唯一作者主表是 `episodes/<期号>/episode.json`；实际时间另存 `episode.aligned.json`，预览副本与审阅稿均由主表派生。示例：

```powershell
.\Start-Cat.ps1 -Action align -Episode P001 -Audio 'D:\录音\P001.wav'
.\Start-Cat.ps1 -Action check -Episode P001 -Actual
.\Start-Cat.ps1 -Action render -Episode P001 -Actual
```

`draft` 不可直接导出视频；口播／分镜先设为已审核，录音对齐后仍须复核实际编排。`-Silent` 出纯画面，`-Clean` 去烧录字幕，独立 SRT 保留；修订已有输出加 `-Overwrite`。输出统一在 `exports/<期号>/`。

工作台中的 `DemoVoice2K` 是已完成带口播样片，`StylePilot12` 是无声画风小样，`CatReveal` / `TemplateGallery` 是模板，`Episode` 是当前选中主表。预览准备不会改写 P001 的手工审阅页或作者主表。

## 目录与规范

| 目录 | 内容 |
|---|---|
| `.agents/skills/` | 口播、分镜、素材与动画制作三个职责 |
| `episodes/` | 每期主表、录音实际稿与审阅包 |
| `studio/` | Remotion 源码与正式素材 |
| `IP参考/` | 用户提供的原始猫猫参考 |
| `docs/` | 已确认风格、学习总结、素材来源与检查记录 |
| `scripts/` | 环境、识别、检查与打包工具 |
| `exports/` | 可播放样片和导出内容 |

从 [AGENTS.md](AGENTS.md)、[IP 与风格规范](docs/IP与风格规范.md)开始；编排同时看 [参考机制复学](docs/learning-v2/参考机制复学.md)和 [汗液视频复学与应用](docs/learning-v2/汗液视频复学与应用.md)。当前 [画风基准](docs/style-v3/画风确认与小样.md)保持有效，V1 / V2 文档供历史参考。

公开仓库包含生产源码、原始 IP、正式素材、全部当前主表与分镜、已选样片及其复现所需配音。第三方参考视频与抽帧、原始录音、机器配置、密钥、已安装运行时、模型缓存及重复的历史大导出留在本机；学习分析和取样时间记录保留。参考视频相关链接需在自备原片后复现。旧仓库与本地 Git 历史保留，不作为这个公开快照的历史父版本。
