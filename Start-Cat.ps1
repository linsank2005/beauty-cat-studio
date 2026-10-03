param(
  [ValidateSet('doctor','setup','init','check','board','review','align','render','templates','preview')][string]$Action='doctor',
  [string]$Episode='DEMO', [string]$Topic='', [string]$Audio='',
  [switch]$Actual, [switch]$Silent, [switch]$Clean, [switch]$Overwrite,
  [switch]$InstallModel, [switch]$RequireModel,
  [ValidateRange(1024,65535)][int]$Port=3370
)
$ErrorActionPreference='Stop'
$ProjectRoot=$PSScriptRoot
$ConfigFile=Join-Path $ProjectRoot 'local.config.json'
function Find-Tool([string]$Name) {
  $Tool=Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if(-not $Tool){throw "未找到 $Name；先按 README 安装 Node.js、Python 和 FFmpeg，并重新打开终端。"}
  return $Tool.Source
}
function Resolve-Tool([string]$Value) {
  if([string]::IsNullOrWhiteSpace($Value)){throw '本机配置中有空工具路径，请核对 local.config.json。'}
  if([IO.Path]::IsPathRooted($Value)){return $Value}
  $Local=Join-Path $ProjectRoot $Value
  if(Test-Path -LiteralPath $Local){return $Local}
  return Find-Tool $Value
}
if(-not (Test-Path -LiteralPath $ConfigFile)) {
  if($Action -ne 'setup'){throw '首次使用请运行 .\Start-Cat.ps1 -Action setup；工具和本机配置会自动准备，见 README。'}
  $Initial=[ordered]@{
    node=(Find-Tool 'node.exe'); ffmpeg=(Find-Tool 'ffmpeg.exe'); ffprobe=(Find-Tool 'ffprobe.exe')
    whisperModel='.cache/models/faster-whisper-small'; chrome=''; pythonBootstrap=(Find-Tool 'python.exe')
  }
  [IO.File]::WriteAllText($ConfigFile,($Initial | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
  Write-Host '已自动生成 local.config.json；本机配置不上传 Git。'
}
$Settings=Get-Content -LiteralPath $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
$NodeExecutable=Resolve-Tool $Settings.node
$PythonExecutable=Join-Path $ProjectRoot '.venv\Scripts\python.exe'
$StudioDirectory=Join-Path $ProjectRoot 'studio'
if($Episode -notmatch '^[A-Za-z0-9_-]{1,32}$'){throw '期号请用英文、数字、下划线或短横线，例如 P001。'}
if($InstallModel -and $Action -ne 'setup'){throw '-InstallModel 与 -Action setup 一起使用。'}
$EpisodeDirectory=Join-Path $ProjectRoot "episodes\$Episode"
$EpisodeFile=Join-Path $EpisodeDirectory $(if($Actual){'episode.aligned.json'}else{'episode.json'})
function Invoke-Node([string[]]$Arguments){ & $NodeExecutable @Arguments; if($LASTEXITCODE -ne 0){throw "Node 执行失败：$LASTEXITCODE"} }
function Invoke-Python([string[]]$Arguments) {
  if(-not (Test-Path -LiteralPath $PythonExecutable)){throw 'Python 项目环境尚未安装，请先运行 -Action setup。'}
  & $PythonExecutable @Arguments; if($LASTEXITCODE -ne 0){throw "Python 执行失败：$LASTEXITCODE；见上面的具体缺失项。"}
}
Push-Location -LiteralPath $ProjectRoot
try {
  switch($Action){
    'doctor' {
      $DoctorArguments=@('scripts/doctor.py'); if($RequireModel){$DoctorArguments+='--require-model'}
      Invoke-Python $DoctorArguments
    }
    'setup' {
      if(-not (Test-Path -LiteralPath $PythonExecutable)){
        $Bootstrap=Resolve-Tool $Settings.pythonBootstrap
        & $Bootstrap -m venv .venv; if($LASTEXITCODE -ne 0){throw 'venv 创建失败'}
      }
      Invoke-Python @('-m','pip','install','-r','requirements.lock.txt','--disable-pip-version-check')
      Push-Location -LiteralPath $StudioDirectory
      try{
        $NpmExecutable=Join-Path (Split-Path $NodeExecutable) 'npm.cmd'
        if(-not (Test-Path -LiteralPath $NpmExecutable)){$NpmExecutable=Find-Tool 'npm.cmd'}
        & $NpmExecutable ci --no-audit --no-fund
        if($LASTEXITCODE -ne 0){throw 'Node 依赖安装失败'}
        Invoke-Node @('scripts/prepare-browser.mjs')
      }finally{Pop-Location}
      if($InstallModel){Invoke-Python @('scripts/prepare_model.py')}
      # Preparing Studio must keep the authored table and custom review page intact.
      Invoke-Node @('studio/scripts/prepare-preview.mjs',$EpisodeFile)
      $DoctorArguments=@('scripts/doctor.py'); if($InstallModel -or $RequireModel){$DoctorArguments+='--require-model'}
      Invoke-Python $DoctorArguments
    }
    'init' { Invoke-Node @('studio/scripts/episode.mjs','init',$Episode,$Topic) }
    'check' {
      Push-Location -LiteralPath $StudioDirectory
      try{ Invoke-Node @('node_modules/typescript/bin/tsc','--noEmit') }finally{Pop-Location}
      Invoke-Node @('studio/scripts/episode.mjs','validate',$EpisodeFile)
    }
    'board' {Invoke-Node @('studio/scripts/serve-board.mjs',$Episode,[string]$Port)}
    'preview' {
      Invoke-Node @('studio/scripts/prepare-preview.mjs',$EpisodeFile)
      Push-Location -LiteralPath $StudioDirectory
      try{ Invoke-Node @('node_modules/@remotion/cli/remotion-cli.js','studio','src/index.ts','--no-open') }finally{Pop-Location}
    }
    'review' { $RenderArguments=@('studio/scripts/render.mjs','--episode',$EpisodeFile,'--review','--out',(Join-Path $ProjectRoot "exports\$Episode"));if($Overwrite){$RenderArguments+='--overwrite'};Invoke-Node $RenderArguments }
    'align' {
      if([string]::IsNullOrWhiteSpace($Audio)){throw '提供 -Audio 录音文件路径'}
      $AlignArguments=@('scripts/align_voice.py','--episode',(Join-Path $EpisodeDirectory 'episode.json'),'--audio',$Audio);if($Overwrite){$AlignArguments+='--overwrite'}
      Invoke-Python $AlignArguments
      Invoke-Node @('studio/scripts/episode.mjs','review',(Join-Path $EpisodeDirectory 'episode.aligned.json'))
    }
    'render' { $RenderArguments=@('studio/scripts/render.mjs','--episode',$EpisodeFile,'--out',(Join-Path $ProjectRoot "exports\$Episode"));if($Silent){$RenderArguments+='--silent'};if($Clean){$RenderArguments+='--no-captions'};if($Overwrite){$RenderArguments+='--overwrite'};Invoke-Node $RenderArguments }
    'templates' { $RenderArguments=@('studio/scripts/render.mjs','--templates','--out',(Join-Path $ProjectRoot 'exports\templates'));if($Overwrite){$RenderArguments+='--overwrite'};Invoke-Node $RenderArguments }
  }
} finally{Pop-Location}
