param(
  [switch]$IncludeDisconnected
)

$ErrorActionPreference = "Stop"

function Get-BoardKey([psobject]$Board) {
  $fingerprint = $Board.InstanceId
  if (-not $fingerprint) {
    $parts = @($Board.VendorId, $Board.ProductId, $Board.SerialId, $Board.Port) | Where-Object { $_ }
    $fingerprint = ($parts -join ":")
  }

  if (-not $fingerprint) {
    $fingerprint = $Board.FriendlyName
  }

  if (-not $fingerprint) {
    $fingerprint = "unknown-board"
  }

  $sha1 = [System.Security.Cryptography.SHA1]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($fingerprint)
    $hash = $sha1.ComputeHash($bytes)
    return ([System.BitConverter]::ToString($hash).Replace("-", "").ToLowerInvariant()).Substring(0, 16)
  } finally {
    $sha1.Dispose()
  }
}

$toolRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$sourceScript = Resolve-Path (Join-Path $toolRoot "..\windows\list_serial_boards.ps1")
$snapshotPath = Join-Path $toolRoot "data\boards.snapshot.json"

$args = @(
  "-ExecutionPolicy", "Bypass",
  "-File", $sourceScript,
  "-Json"
)

if ($IncludeDisconnected) {
  $args += "-IncludeDisconnected"
}

$json = & powershell.exe @args
$boards = $json | ConvertFrom-Json

if ($boards -isnot [System.Collections.IEnumerable] -or $boards -is [string]) {
  $boards = @($boards)
}

$boardList = @($boards | ForEach-Object {
  $_ | Add-Member -NotePropertyName BoardKey -NotePropertyValue (Get-BoardKey $_) -Force
  $_
})

$payload = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  includeDisconnected = [bool]$IncludeDisconnected
  summary = [ordered]@{
    total = $boardList.Count
    connected = @($boardList | Where-Object { $_.Connected }).Count
    disconnected = @($boardList | Where-Object { -not $_.Connected }).Count
    usb = @($boardList | Where-Object { $_.ConnectionType -eq "USB" }).Count
    bluetooth = @($boardList | Where-Object { $_.ConnectionType -eq "Bluetooth" }).Count
  }
  boards = $boardList
}

Set-Content -Path $snapshotPath -Value (ConvertTo-Json -InputObject ([pscustomobject]$payload) -Depth 6) -Encoding UTF8
Write-Host ("Board snapshot written to " + $snapshotPath)
