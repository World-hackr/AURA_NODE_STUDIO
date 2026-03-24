param(
  [int]$Port = 8844,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

$toolRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverScript = Join-Path $toolRoot "server\server.mjs"
$refreshScript = Join-Path $toolRoot "scripts\refresh_board_snapshot.ps1"
$url = "http://127.0.0.1:$Port/"

& powershell.exe -ExecutionPolicy Bypass -File $refreshScript -IncludeDisconnected | Out-Null

$refreshJob = Start-Job -ScriptBlock {
  param($RefreshScriptPath)
  while ($true) {
    & powershell.exe -ExecutionPolicy Bypass -File $RefreshScriptPath -IncludeDisconnected | Out-Null
    Start-Sleep -Seconds 4
  }
} -ArgumentList $refreshScript

if ($OpenBrowser) {
  Start-Job -ScriptBlock {
    param($LaunchUrl)
    Start-Sleep -Seconds 1
    Start-Process $LaunchUrl | Out-Null
  } -ArgumentList $url | Out-Null
}

$env:BOARD_DATA_PORT = "$Port"
try {
  node $serverScript
} finally {
  Stop-Job $refreshJob -ErrorAction SilentlyContinue | Out-Null
  Remove-Job $refreshJob -ErrorAction SilentlyContinue | Out-Null
}
