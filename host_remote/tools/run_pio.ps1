param(
    [ValidateSet("build", "upload", "monitor", "upload-monitor", "ports")]
    [string]$Action = "upload",
    [string]$Port,
    [string]$Environment = "aura_host_esp32dev"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RepoRoot = Split-Path -Parent $ProjectRoot
$BoardDetectorScript = Join-Path $RepoRoot "local_tools\windows\list_serial_boards.ps1"

function Get-PlatformIoExecutable {
    $explicitCandidate = Join-Path $env:USERPROFILE ".platformio\penv\Scripts\platformio.exe"
    if (Test-Path $explicitCandidate) {
        return $explicitCandidate
    }

    $pioCommand = Get-Command pio -ErrorAction SilentlyContinue
    if ($pioCommand) {
        return $pioCommand.Source
    }

    $platformIoCommand = Get-Command platformio -ErrorAction SilentlyContinue
    if ($platformIoCommand) {
        return $platformIoCommand.Source
    }

    throw "PlatformIO was not found. Install the PlatformIO IDE extension in VS Code, reopen host_remote, then try again."
}

function Get-BoardRecords {
    if (Test-Path $BoardDetectorScript) {
        $rawJson = & $BoardDetectorScript -Json
        if ($rawJson) {
            return @($rawJson | ConvertFrom-Json)
        }
    }

    return @(
        Get-CimInstance Win32_SerialPort | ForEach-Object {
            [PSCustomObject]@{
                Port           = $_.DeviceID
                Connected      = $true
                ConnectionType = "USB"
                LikelyBoard    = $_.Description
                FriendlyName   = $_.Name
                BridgeChip     = ""
                Location       = ""
                Notes          = ""
            }
        }
    )
}

function Get-ConnectedUploadCandidates {
    return @(
        Get-BoardRecords |
            Where-Object {
                $_.Connected -and $_.Port
            } |
            Sort-Object Port
    )
}

function Show-Candidates([array]$Candidates) {
    if (-not $Candidates -or $Candidates.Count -eq 0) {
        Write-Host "No connected USB serial boards were found." -ForegroundColor Yellow
        return
    }

    Write-Host "Detected serial ports:" -ForegroundColor Cyan
    foreach ($candidate in $Candidates) {
        $headline = "{0}  {1}" -f $candidate.Port, $candidate.LikelyBoard
        Write-Host ("- " + $headline) -ForegroundColor White

        $details = @()
        if ($candidate.BridgeChip) {
            $details += "bridge: $($candidate.BridgeChip)"
        }
        if ($candidate.FriendlyName -and $candidate.FriendlyName -ne $candidate.LikelyBoard) {
            $details += "name: $($candidate.FriendlyName)"
        }
        if ($candidate.Location) {
            $details += "location: $($candidate.Location)"
        }

        if ($details.Count -gt 0) {
            Write-Host ("  " + ($details -join " | ")) -ForegroundColor DarkGray
        }
    }
}

function Resolve-UploadPort([string]$RequestedPort) {
    if ($RequestedPort) {
        return $RequestedPort.ToUpperInvariant()
    }

    $candidates = Get-ConnectedUploadCandidates
    if (-not $candidates -or $candidates.Count -eq 0) {
        throw "No connected USB serial board was found. Plug the ESP32 in, wait a moment, then run this again."
    }

    $preferred = @(
        $candidates |
            Where-Object {
                ("{0} {1} {2}" -f $_.LikelyBoard, $_.FriendlyName, $_.BridgeChip) -match "ESP32|ESP8266|CH910|CH340|CP210|USB Serial"
            }
    )

    if ($preferred.Count -eq 1) {
        return $preferred[0].Port
    }

    if ($candidates.Count -eq 1) {
        return $candidates[0].Port
    }

    Write-Host ""
    Write-Host "More than one possible board is connected." -ForegroundColor Yellow
    Show-Candidates $candidates
    throw "Run again with -Port COMx."
}

function Format-Command([string[]]$Arguments) {
    return ($Arguments | ForEach-Object {
        if ($_ -match "\s") {
            '"' + $_ + '"'
        } else {
            $_
        }
    }) -join " "
}

function Invoke-PlatformIo([string[]]$Arguments) {
    $pioExecutable = Get-PlatformIoExecutable

    Push-Location $ProjectRoot
    try {
        Write-Host ("PlatformIO: " + $pioExecutable) -ForegroundColor DarkGray
        Write-Host ("Project:    " + $ProjectRoot) -ForegroundColor DarkGray
        Write-Host ("Command:    " + (Format-Command $Arguments)) -ForegroundColor DarkGray
        Write-Host ""

        & $pioExecutable @Arguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        exit $exitCode
    }
}

switch ($Action) {
    "ports" {
        Show-Candidates (Get-ConnectedUploadCandidates)
        break
    }
    "build" {
        Invoke-PlatformIo @("run", "-e", $Environment)
        break
    }
    "upload" {
        $resolvedPort = Resolve-UploadPort $Port
        Write-Host ("Uploading to " + $resolvedPort) -ForegroundColor Green
        Write-Host ""
        Invoke-PlatformIo @("run", "-e", $Environment, "-t", "upload", "--upload-port", $resolvedPort)
        break
    }
    "monitor" {
        $resolvedPort = Resolve-UploadPort $Port
        Write-Host ("Opening serial monitor on " + $resolvedPort) -ForegroundColor Green
        Write-Host ""
        Invoke-PlatformIo @("device", "monitor", "-b", "115200", "--port", $resolvedPort)
        break
    }
    "upload-monitor" {
        $resolvedPort = Resolve-UploadPort $Port
        Write-Host ("Uploading to " + $resolvedPort) -ForegroundColor Green
        Write-Host ""
        Invoke-PlatformIo @("run", "-e", $Environment, "-t", "upload", "--upload-port", $resolvedPort)
        Write-Host ""
        Write-Host ("Opening serial monitor on " + $resolvedPort) -ForegroundColor Green
        Write-Host ""
        Invoke-PlatformIo @("device", "monitor", "-b", "115200", "--port", $resolvedPort)
        break
    }
}
