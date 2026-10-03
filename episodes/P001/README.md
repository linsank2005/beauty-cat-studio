# P001 开场一分钟分镜

已按原稿前 23 个非空行制作，预计 60 秒，止于“让身体进入‘战斗或逃跑’模式”。原稿在 [口播稿.txt](../../P001/口播稿.txt)，文字未修改。

打开 [分镜审阅页](review/index.html)，可逐步查看 45 个状态、按 8 个镜头跳转，并核对对应口播与预计时间。[八镜总览](review/overview.png)和[文字分镜表](review/review.md)也可单独查看。图片为 2560×1440，16:9。

`episode.json` 是唯一作者主表；审阅页、状态图和预计字幕均由它派生。当前为 `draft`，时间为 `estimated`；本轮没有制作视频或配音。

线稿与填色图用于确认建立顺序。正式逐笔路径、透明素材分层和连续动作须在分镜验收后制作；收到旁白后再对齐实际时间。

在项目根目录运行以下命令可重建审阅包、检查主表并打开本地页面：

```powershell
node episodes\P001\build-review.mjs
.\Start-Cat.ps1 -Action check -Episode P001
.\Start-Cat.ps1 -Action board -Episode P001
```

浏览器地址以终端显示为准，默认 <http://127.0.0.1:3370/review/index.html>。本页仍停在分镜验收阶段。
