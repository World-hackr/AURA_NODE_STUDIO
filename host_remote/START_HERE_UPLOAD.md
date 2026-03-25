# AURA Host Upload

Ignore the large PlatformIO menu for now.

Use one of these two simple paths instead.

## Option 1: VS Code Task

Keep `host_remote` open in VS Code.

1. Press `Ctrl+Shift+P`
2. Type `Tasks: Run Task`
3. Choose `AURA Host: Upload Firmware`

After upload finishes:

1. Press `Ctrl+Shift+P`
2. Type `Tasks: Run Task`
3. Choose `AURA Host: Open Serial Monitor`

If you want both in one step, choose:

- `AURA Host: Upload And Open Monitor`

## Option 2: Double-Click File

From the `host_remote` folder, double-click:

- `UPLOAD_AURA_HOST.bat`

After upload finishes, double-click:

- `OPEN_SERIAL_MONITOR.bat`

Or use:

- `UPLOAD_AND_MONITOR_AURA_HOST.bat`

## What The Helper Does

The helper script automatically:

- finds the PlatformIO executable
- checks the currently connected USB serial boards
- chooses the ESP32 upload port when there is only one likely board
- passes the detected `COM` port into the upload command

If more than one USB serial board is connected, it will stop and tell you to run with a specific `COM` port.

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run_pio.ps1 -Action upload -Port COM11
```

## If Upload Fails

Try this once:

1. Hold the `BOOT` button on the ESP32
2. Start `AURA Host: Upload Firmware`
3. Release `BOOT` when the terminal shows `Connecting`

Also make sure:

- the USB cable supports data, not only power
- the serial monitor is closed before upload
- only one likely ESP32 board is plugged in

## Current TFT Wiring

- `VCC -> 3V3`
- `GND -> GND`
- `SCL / CLK -> GPIO18`
- `SDI / MOSI -> GPIO23`
- `CS -> GPIO5`
- `DC -> GPIO27`
- `RST / RES -> GPIO26`
- `LED / BLK -> AO3407 drain`

If you wired the new `2.8 inch TFT + touch` module, also connect:

- `T_CLK -> GPIO18`
- `T_DIN -> GPIO23`
- `T_DO -> GPIO19`
- `T_CS -> GPIO22`
- `T_IRQ -> GPIO17`

Current firmware still uses the joystick for navigation. Touch is only parked on the SPI bus for now so it does not interfere with the display or radio.
