param(
  [switch]$IncludeDisconnected,
  [switch]$Json,
  [switch]$Detailed,
  [switch]$Watch,
  [string]$Port,
  [int]$RefreshSeconds = 2
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Normalize-PortFilter([string]$RequestedPort) {
  if ([string]::IsNullOrWhiteSpace($RequestedPort)) {
    return $null
  }

  $value = $RequestedPort.Trim().ToUpperInvariant()
  if ($value -match "^\d+$") {
    return "COM$value"
  }

  return $value
}

function Get-ConnectedPortNames {
  try {
    return [System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object -Unique
  } catch {
    return @()
  }
}

function Get-PnpUtilPortBlocks {
  $rawLines = & pnputil /enum-devices /class Ports 2>$null
  if (-not $rawLines) {
    return @()
  }

  $blocks = New-Object System.Collections.Generic.List[object]
  $current = [ordered]@{}

  foreach ($line in $rawLines) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      if ($current.Count -gt 0) {
        $blocks.Add([pscustomobject]$current)
        $current = [ordered]@{}
      }
      continue
    }

    if ($line -match "^\s*([^:]+):\s*(.*)$") {
      $key = $matches[1].Trim()
      $value = $matches[2].Trim()
      $current[$key] = $value
    }
  }

  if ($current.Count -gt 0) {
    $blocks.Add([pscustomobject]$current)
  }

  return $blocks
}

function Get-PortFromDescription([string]$description) {
  if ($description -match "\((COM\d+)\)") {
    return $matches[1]
  }

  return $null
}

function Get-SerialId([string]$InstanceId) {
  if ([string]::IsNullOrWhiteSpace($InstanceId)) {
    return $null
  }

  $parts = $InstanceId -split "\\"
  if ($parts.Count -gt 0) {
    return $parts[-1]
  }

  return $null
}

function Get-OptionalPropertyValue {
  param(
    [object]$InputObject,
    [string]$PropertyName
  )

  if ($null -eq $InputObject) {
    return $null
  }

  if ($InputObject.PSObject.Properties.Name -contains $PropertyName) {
    return $InputObject.$PropertyName
  }

  return $null
}

function Get-RegistryDeviceInfo([string]$InstanceId) {
  if ([string]::IsNullOrWhiteSpace($InstanceId)) {
    return $null
  }

  $rootPath = Join-Path "HKLM:\SYSTEM\CurrentControlSet\Enum" $InstanceId
  $deviceParamsPath = Join-Path $rootPath "Device Parameters"

  $rootProps = Get-ItemProperty $rootPath -ErrorAction SilentlyContinue
  $deviceParams = Get-ItemProperty $deviceParamsPath -ErrorAction SilentlyContinue

  if (-not $rootProps -and -not $deviceParams) {
    return $null
  }

  $hardwareIds = @()
  if ($rootProps -and $rootProps.PSObject.Properties.Name -contains "HardwareID") {
    $hardwareIds = @($rootProps.HardwareID)
  }

  return [pscustomobject]@{
    FriendlyName = [string](Get-OptionalPropertyValue -InputObject $rootProps -PropertyName "FriendlyName")
    HardwareIds = $hardwareIds
    HardwareIdText = ($hardwareIds | Where-Object { $_ }) -join " | "
    Manufacturer = [string](Get-OptionalPropertyValue -InputObject $rootProps -PropertyName "Mfg")
    Service = [string](Get-OptionalPropertyValue -InputObject $rootProps -PropertyName "Service")
    DeviceDesc = [string](Get-OptionalPropertyValue -InputObject $rootProps -PropertyName "DeviceDesc")
    BusReportedDeviceDesc = [string](Get-OptionalPropertyValue -InputObject $rootProps -PropertyName "BusReportedDeviceDesc")
    LocationInformation = [string](Get-OptionalPropertyValue -InputObject $rootProps -PropertyName "LocationInformation")
    PortName = [string](Get-OptionalPropertyValue -InputObject $deviceParams -PropertyName "PortName")
    SymbolicName = [string](Get-OptionalPropertyValue -InputObject $deviceParams -PropertyName "SymbolicName")
  }
}

function Get-UsbIdData {
  param(
    [string[]]$SourceText
  )

  $text = ($SourceText | Where-Object { $_ }) -join " "

  $vendorId = $null
  $productId = $null
  $revision = $null

  if ($text -match "VID_([0-9A-Fa-f]{4})") {
    $vendorId = $matches[1].ToUpperInvariant()
  }

  if ($text -match "PID_([0-9A-Fa-f]{4})") {
    $productId = $matches[1].ToUpperInvariant()
  }

  if ($text -match "REV_([0-9A-Fa-f]{4})") {
    $revision = $matches[1].ToUpperInvariant()
  }

  [pscustomobject]@{
    VendorId = $vendorId
    ProductId = $productId
    Revision = $revision
  }
}

function Get-VendorGuess {
  param(
    [string]$VendorId,
    [string]$Manufacturer
  )

  switch ($VendorId) {
    "303A" { return "Espressif" }
    "2341" { return "Arduino" }
    "2A03" { return "Arduino" }
    "10C4" { return "Silicon Labs" }
    "1A86" { return "QinHeng/WCH" }
    "0403" { return "FTDI" }
  }

  if ([string]::IsNullOrWhiteSpace($Manufacturer)) {
    return $null
  }

  $cleanManufacturer = $Manufacturer -replace "^@[^;]+;", ""
  return $cleanManufacturer
}

function Get-BridgeChip {
  param(
    [string]$Description,
    [string]$InstanceId,
    [string]$HardwareIdText,
    [string]$Service
  )

  $text = @($Description, $InstanceId, $HardwareIdText, $Service) -join " "

  if ($text -match "BTHENUM|Bluetooth") {
    return "Bluetooth SPP"
  }

  if ($text -match "VID_303A") {
    return "Espressif native USB"
  }

  if ($text -match "VID_2341|VID_2A03|Arduino Uno") {
    return "Official Arduino USB serial"
  }

  if ($text -match "VID_10C4|CP210") {
    return "CP210x"
  }

  if ($text -match "VID_1A86&PID_7523|CH340") {
    return "CH340"
  }

  if ($text -match "VID_1A86&PID_55D4") {
    return "CH9102/CH910x"
  }

  if ($text -match "VID_0403|FTDI") {
    return "FTDI"
  }

  if ($text -match "usbser") {
    return "Generic USB CDC"
  }

  return "Unknown"
}

function Get-BoardGuess {
  param(
    [string]$Description,
    [string]$InstanceId,
    [string]$Manufacturer,
    [string]$BridgeChip,
    [string]$VendorId,
    [string]$ProductId
  )

  $text = @($Description, $InstanceId, $Manufacturer, $BridgeChip, $VendorId, $ProductId) -join " "

  if ($text -match "BTHENUM|Bluetooth") {
    return "Bluetooth serial link"
  }

  if ($text -match "VID_303A") {
    return "ESP32 family board with native USB"
  }

  if ($text -match "VID_2341|VID_2A03|Arduino Uno") {
    return "Arduino board"
  }

  if ($BridgeChip -eq "CP210x") {
    return "Likely ESP32 or ESP8266 via CP210x"
  }

  if ($BridgeChip -eq "CH340") {
    return "Likely ESP32, ESP8266, or Arduino clone via CH340"
  }

  if ($BridgeChip -eq "CH9102/CH910x") {
    return "Likely ESP32 or ESP8266 via CH9102/CH910x"
  }

  if ($BridgeChip -eq "FTDI") {
    return "Likely FTDI-based board"
  }

  if ($text -match "USB Serial Device") {
    return "Generic USB serial board, verify by unplug/replug"
  }

  return "Unknown board family"
}

function Get-ConnectionType {
  param(
    [string]$Description,
    [string]$InstanceId
  )

  $text = @($Description, $InstanceId) -join " "

  if ($text -match "BTHENUM|Bluetooth") {
    return "Bluetooth"
  }

  if ($text -match "^USB\\|USB Serial|USB-SERIAL|Arduino Uno") {
    return "USB"
  }

  return "Other"
}

function Get-Notes {
  param(
    [string]$ConnectionType,
    [string]$BridgeChip,
    [string]$LikelyBoard,
    [bool]$Connected
  )

  if ($ConnectionType -eq "Bluetooth") {
    return "Virtual Bluetooth serial link, not a direct USB dev board."
  }

  if (-not $Connected) {
    return "Known remembered port, but the device is not currently connected."
  }

  if ($LikelyBoard -match "Generic USB serial board") {
    return "Use unplug/replug or -Watch to confirm the exact physical board."
  }

  if ($BridgeChip -eq "Espressif native USB") {
    return "Native USB ESP32-family board; board family is stronger than exact module name."
  }

  return $null
}

function Get-SerialBoardInventory {
  $requestedPort = Normalize-PortFilter $Port
  $connectedPortNames = Get-ConnectedPortNames
  $devices = Get-PnpUtilPortBlocks

  if (-not $devices -or $devices.Count -eq 0) {
    $fallback = $connectedPortNames | Sort-Object | ForEach-Object {
      [pscustomobject]@{
        Port = $_
        Connected = $true
        ConnectionType = "Unknown"
        LikelyBoard = "Port detected, device metadata unavailable"
        BridgeChip = "Unknown"
        Vendor = $null
        VendorId = $null
        ProductId = $null
        Revision = $null
        DriverName = $null
        Service = $null
        FriendlyName = $_
        Description = $null
        BusReportedName = $null
        Manufacturer = $null
        Location = $null
        SerialId = $null
        HardwareIds = $null
        Status = "Started"
        InstanceId = $null
        Notes = "Fallback mode because detailed device metadata was unavailable."
      }
    }

    if ($requestedPort) {
      $fallback = $fallback | Where-Object { $_.Port -eq $requestedPort }
    }

    return @($fallback)
  }

  $results = foreach ($device in $devices) {
    $description = if ($device.PSObject.Properties.Name -contains "Device Description") {
      [string]$device."Device Description"
    } else {
      ""
    }

    $instanceId = if ($device.PSObject.Properties.Name -contains "Instance ID") {
      [string]$device."Instance ID"
    } else {
      ""
    }

    $manufacturer = if ($device.PSObject.Properties.Name -contains "Manufacturer Name") {
      [string]$device."Manufacturer Name"
    } else {
      ""
    }

    $status = if ($device.PSObject.Properties.Name -contains "Status") {
      [string]$device.Status
    } else {
      ""
    }

    $driverName = if ($device.PSObject.Properties.Name -contains "Driver Name") {
      [string]$device."Driver Name"
    } else {
      ""
    }

    $registryInfo = Get-RegistryDeviceInfo $instanceId
    $port = if ($registryInfo -and $registryInfo.PortName) {
      [string]$registryInfo.PortName
    } else {
      Get-PortFromDescription $description
    }

    $registryHardwareIdText = if ($registryInfo) { $registryInfo.HardwareIdText } else { $null }
    $registryService = if ($registryInfo) { $registryInfo.Service } else { $null }
    $registryManufacturer = if ($registryInfo) { $registryInfo.Manufacturer } else { $manufacturer }
    $registryFriendlyName = if ($registryInfo -and $registryInfo.FriendlyName) { $registryInfo.FriendlyName } else { $description }
    $registryBusReportedName = if ($registryInfo) { $registryInfo.BusReportedDeviceDesc } else { $null }
    $registryLocation = if ($registryInfo) { $registryInfo.LocationInformation } else { $null }
    $registryHardwareIds = if ($registryInfo) { $registryInfo.HardwareIdText } else { $null }

    $usbIds = Get-UsbIdData @(
      $instanceId
      $registryHardwareIdText
      $description
    )

    $bridgeChip = Get-BridgeChip `
      -Description $description `
      -InstanceId $instanceId `
      -HardwareIdText $registryHardwareIdText `
      -Service $registryService

    $likelyBoard = Get-BoardGuess `
      -Description $description `
      -InstanceId $instanceId `
      -Manufacturer $manufacturer `
      -BridgeChip $bridgeChip `
      -VendorId $usbIds.VendorId `
      -ProductId $usbIds.ProductId

    $connected = $false

    if ($port) {
      $connected = ($connectedPortNames -contains $port) -or ($status -eq "Started")
    }

    $vendor = Get-VendorGuess -VendorId $usbIds.VendorId -Manufacturer $registryManufacturer

    [pscustomobject]@{
      Port = $port
      Connected = $connected
      ConnectionType = Get-ConnectionType -Description $description -InstanceId $instanceId
      LikelyBoard = $likelyBoard
      BridgeChip = $bridgeChip
      Vendor = $vendor
      VendorId = $usbIds.VendorId
      ProductId = $usbIds.ProductId
      Revision = $usbIds.Revision
      DriverName = $driverName
      Service = $registryService
      FriendlyName = $registryFriendlyName
      Description = $description
      BusReportedName = $registryBusReportedName
      Manufacturer = $registryManufacturer
      Location = $registryLocation
      SerialId = Get-SerialId $instanceId
      HardwareIds = $registryHardwareIds
      Status = $status
      InstanceId = $instanceId
      Notes = Get-Notes `
        -ConnectionType (Get-ConnectionType -Description $description -InstanceId $instanceId) `
        -BridgeChip $bridgeChip `
        -LikelyBoard $likelyBoard `
        -Connected $connected
    }
  }

  $filtered = $results |
    Where-Object { $_.Port } |
    Sort-Object @{ Expression = "Connected"; Descending = $true }, @{ Expression = "ConnectionType"; Descending = $false }, Port

  if ($requestedPort) {
    $filtered = $filtered | Where-Object { $_.Port -eq $requestedPort }
  }

  if (-not $IncludeDisconnected) {
    $filtered = $filtered | Where-Object { $_.Connected }
  }

  return @($filtered)
}

function Show-SerialBoards {
  $inventory = @(Get-SerialBoardInventory)

  if ($Json) {
    ConvertTo-Json -InputObject ([object[]]$inventory) -Depth 4
    return
  }

  if (-not $inventory -or $inventory.Count -eq 0) {
    if ($Port) {
      Write-Host ("No serial device matched " + (Normalize-PortFilter $Port) + ".")
    } else {
      Write-Host "No connected serial ports were found."
    }
    return
  }

  if ($Detailed) {
    $inventory |
      Select-Object Port, Connected, ConnectionType, LikelyBoard, BridgeChip, Vendor, VendorId, ProductId, Revision, DriverName, Service, FriendlyName, Description, BusReportedName, Manufacturer, Location, SerialId, HardwareIds, Status, InstanceId, Notes |
      Format-List
    return
  }

  $inventory |
    Select-Object Port, Connected, ConnectionType, LikelyBoard, BridgeChip, VendorId, ProductId, DriverName, FriendlyName |
    Format-Table -AutoSize
}

if ($Watch) {
  while ($true) {
    Clear-Host
    Write-Host ("Serial board scan at " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
    Write-Host ""
    Show-SerialBoards
    Start-Sleep -Seconds $RefreshSeconds
  }
} else {
  Show-SerialBoards
}
