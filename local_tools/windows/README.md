# Windows Local Tools

This folder holds reusable Windows-side helpers.

Current tools:

- `list_serial_boards.ps1`

## `list_serial_boards.ps1`

Purpose:

- show current serial ports
- distinguish live ports from disconnected remembered ports
- separate Bluetooth virtual ports from USB board ports
- guess likely board family from USB bridge IDs and device names
- show board specs that Windows can expose in one place, including VID, PID, driver, bridge chip, manufacturer, location, and instance ID

Examples:

```powershell
.\local_tools\windows\list_serial_boards.ps1
.\local_tools\windows\list_serial_boards.ps1 -IncludeDisconnected
.\local_tools\windows\list_serial_boards.ps1 -Detailed
.\local_tools\windows\list_serial_boards.ps1 -Port COM11 -Detailed
.\local_tools\windows\list_serial_boards.ps1 -Json
.\local_tools\windows\list_serial_boards.ps1 -Watch
```

This tool is intentionally machine-side. It does not require a firmware project to exist.

Default output is a compact table.

Use `-Detailed` when you want the full Windows-visible spec block for each board.

Current fields include:

- port
- connected or disconnected state
- connection type
- likely board family
- USB bridge chip
- vendor ID and product ID
- driver and service
- friendly name and description
- manufacturer
- physical location string if Windows exposes it
- serial-style instance suffix
- hardware IDs
- PnP instance ID
- notes for generic or Bluetooth devices
