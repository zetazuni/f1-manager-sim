# Build the desktop game and put a one-click "Zetrace" icon on the desktop and Start menu.
#   powershell -ExecutionPolicy Bypass -File tools/install-desktop.ps1
#   -SkipBuild      reuse the exe from the last build
#   -InstallDir X   where the game is copied (default: "Zetrace App" at the root of this drive)
#   -PackDir X      private season pack: season.js and faces/ (default: "Zetrace Private Pack"
#                   at the root of this drive, when it exists)
#   -NoPack         build the fictional game even when a pack exists
param(
    [string]$InstallDir,
    [string]$PackDir,
    [switch]$NoPack,
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'

$webUi = Join-Path $PSScriptRoot '..\src\web-ui' | Resolve-Path
$drive = Split-Path -Qualifier $webUi.Path
if (-not $InstallDir) { $InstallDir = Join-Path $drive '\Zetrace App' }
if (-not $PackDir) { $PackDir = Join-Path $drive '\Zetrace Private Pack' }
$built = Join-Path $webUi 'src-tauri\target\release\zetrace.exe'

if (-not $SkipBuild) {
    # both folders are git-ignored and only ever hold a copy of the private pack
    $localData = Join-Path $webUi 'src\data\local'
    $localFiles = Join-Path $webUi 'public\local'
    foreach ($dir in $localData, $localFiles) { if (Test-Path $dir) { Remove-Item $dir -Recurse -Force } }
    $season = Join-Path $PackDir 'season.js'
    if (-not $NoPack -and (Test-Path $season)) {
        New-Item -ItemType Directory -Force $localData, $localFiles | Out-Null
        Copy-Item $season $localData
        $faces = Join-Path $PackDir 'faces'
        if (Test-Path $faces) { Copy-Item $faces $localFiles -Recurse }
        Write-Host "Using the private season pack in $PackDir"
    }
    Push-Location $webUi
    try {
        if (-not (Test-Path 'node_modules')) { npm install; if ($LASTEXITCODE) { throw 'npm install failed' } }
        npx tauri build --no-bundle
        if ($LASTEXITCODE) { throw 'tauri build failed' }
    } finally {
        Pop-Location
        # leave no private files behind: tests expect the fictional season
        foreach ($dir in $localData, $localFiles, (Join-Path $webUi 'dist\local')) { if (Test-Path $dir) { Remove-Item $dir -Recurse -Force } }
    }
}
if (-not (Test-Path $built)) { throw "No build found at $built" }

New-Item -ItemType Directory -Force $InstallDir | Out-Null
$exe = Join-Path $InstallDir 'Zetrace.exe'
try { Copy-Item $built $exe -Force }
catch { throw "Could not replace $exe. Close the game and run this again. ($_)" }

$shell = New-Object -ComObject WScript.Shell
foreach ($folder in 'Desktop', 'Programs') {
    $link = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath($folder)) 'Zetrace.lnk'))
    $link.TargetPath = $exe
    $link.WorkingDirectory = $InstallDir
    $link.Description = 'Zetrace F1 Manager'
    $link.Save()
    Write-Host "Shortcut: $($link.FullName)"
}
Write-Host "Installed: $exe"
