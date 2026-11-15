# 一键：把自己的 fork 建好、把 ios13/ui-glass 分支推上去、触发 macOS 构建、把未签名 IPA 拉到本地
# 前置：安装 GitHub CLI（winget install GitHub.cli），然后 gh auth login
# 用法：powershell -ExecutionPolicy Bypass -File scripts/build-ipa.ps1

$ErrorActionPreference = 'Stop'
$Branch = 'ios13/ui-glass'
$Workflow = 'Build iOS 13.4 IPA'
$Artifact = 'CyMusic-ios13.4-unsigned-ipa'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Assert-Gh {
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $gh) {
        throw 'gh 没装。先跑：winget install --id GitHub.cli -e，然后重开一个终端。'
    }
    gh auth status 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw 'gh 未登录。先跑：gh auth login（选 GitHub.com -> HTTPS -> 浏览器登录）。'
    }
}

Assert-Gh

Write-Host '[1/5] 建立或复用 fork ...'
$login = (gh api user --jq .login).Trim()
$fork = "$login/Cymusic"
gh repo view $fork 2>$null
if ($LASTEXITCODE -ne 0) {
    gh repo fork gyc-12/Cymusic --clone=false
}
if (-not (git remote | Select-String -Quiet '^fork$')) {
    git remote add fork "https://github.com/$fork.git"
}

Write-Host "[2/5] 推送分支 $Branch -> $fork ..."
git push fork "${Branch}:${Branch}" --force-with-lease

Write-Host "[3/5] 触发 macOS 构建 ..."
gh workflow run $Workflow --repo $fork --ref $Branch
Start-Sleep -Seconds 6

$runId = ''
for ($i = 0; $i -lt 20; $i++) {
    $runId = (gh run list --repo $fork --workflow $Workflow --branch $Branch --limit 1 --json databaseId --jq '.[0].databaseId').Trim()
    if ($runId) { break }
    Start-Sleep -Seconds 5
}
if (-not $runId) { throw '没拿到 run id，去 Actions 页面看一眼。' }

Write-Host "[4/5] 等待构建完成（run $runId，约 15-25 分钟）..."
gh run watch $runId --repo $fork --exit-status

Write-Host '[5/5] 下载产物 ...'
$outDir = Join-Path $RepoRoot 'ipa-out'
Remove-Item $outDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $outDir | Out-Null
gh run download $runId --repo $fork -n $Artifact -D $outDir

$ipa = Get-ChildItem -Path $outDir -Filter *.ipa -Recurse | Select-Object -First 1
if (-not $ipa) { throw '产物里没有 .ipa，检查 workflow 日志。' }

$final = Join-Path $RepoRoot 'CyMusic-ios13.4-glass.ipa'
Move-Item $ipa.FullName $final -Force
$hash = (Get-FileHash $final -Algorithm SHA256).Hash.ToLower()
$size = (Get-Item $final).Length

Write-Host ''
Write-Host "IPA: $final"
Write-Host "大小: $size 字节"
Write-Host "SHA256: $hash"
Write-Host '下一步：Sideloadly 拖进去签名安装（免费 Apple ID 7 天有效）。'
