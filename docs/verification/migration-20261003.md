# 公开仓库迁移检查 · 2026-10-03

已在同一台 Windows 电脑的全新项目目录验证安装与运行，不复用原项目的配置、虚拟环境、Node 依赖、模型或渲染浏览器。尚未在第二台实体电脑验证。

| 检查 | 结果 |
|---|---|
| Windows PowerShell 5.1 执行 `Start-Cat.ps1 -Action setup` | 通过：识别 PATH 工具，生成本机配置，安装锁定依赖并下载渲染浏览器 |
| `Start-Cat.cmd` 启动包装 | 在执行策略为 Restricted 的父 PowerShell 中调用成功，系统执行策略未修改 |
| TypeScript 与 P001／DEMO_V3_2K 实际主表检查 | 通过 |
| `episodes/P001/verify-review.py` | 302 项检查通过；原稿、分镜关系、2K 状态图和 23 项固定 IP／画风素材通过 |
| 新目录分镜页 | 正常打开；“下一步”从 E01 切到 E02，当前 2K 图和可见缩略图加载正常 |
| `studio/scripts/smoke-render.mjs` | 已审样片前一秒实际渲染：2560×1440、30fps、AAC 音轨，FFmpeg 完整解码通过 |
| faster-whisper | 新安装的 Python 包可导入；模型属于可选下载，本次未测试下载和新音频识别 |

一秒导出用于检查安装、素材寻址、浏览器、渲染与旁白合并链路，不是新视频小样，也不代表全片动作或音画同步复审。P001 保持待验收，口播与画面未因此修改。

另一台电脑按 README 安装 Node.js、Python 和 FFmpeg 后执行 `setup`。本机配置、运行时和模型不随仓库迁移；需要新录音对齐时执行 `setup -InstallModel`。

公开文件清单见 [public-files.json](public-files.json)。其中 SHA-256 记录本地源文件字节；Git 的文本换行规范可能改变普通文档的工作副本字节。口播原稿和作者主表设为不转换换行，以保留来源及录音对齐的字节校验。
