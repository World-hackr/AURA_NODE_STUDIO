# AURA Host

This folder contains the first firmware-side UI shell for the ESP32 host.

The current goal is to start clean with a professional PlatformIO firmware layout while freezing the host workflow for the first real hardware slice.

## Current Approach

The host state is now rendered to the `2.8 inch SPI TFT` module wired as an `ILI9341-class` panel and controlled from the wired joystick.

That means:
- the remote is usable directly from the device, without depending on the serial monitor for navigation
- the UI now follows a simplified feature-phone style model with icon-first navigation and short-code lists
- serial output remains available only as a debug mirror of the on-device state
- the current firmware keeps the proven `160x128` host UI as a centered logical canvas while the larger panel is brought up cleanly first

## V1 Host Intent

`AURA Host` should answer three hardware-first questions:

- do I own this exact part?
- do I own enough?
- where is it physically?

The first thin slice is:

`search part -> review stock/location -> trigger locate`

## PlatformIO Layout

This app now uses the standard PlatformIO structure:

- `platformio.ini` - board and framework configuration
- `src/` - firmware source files
- `include/` - shared headers
- `tests/` - standalone hardware bring-up projects kept separate from the main host firmware

## Current Screens

- `Home`
- `Locate`
- `Active Locate`
- `Inventory`
- `Adjust Stock`
- `Phone Sync`
- `Setup`
- `Radio Check`

## Controls

Use the joystick:
- `up / down` move the current selection
- `left` goes back
- `right` selects the current item
- `press switch` also selects the current item
- `hold switch` returns to `Home`

On `Adjust Stock`, the control mode changes for faster editing:
- `up / down` change the current part
- `left / right` decrease or increase quantity
- `press switch` saves and returns to the inventory list

If the joystick direction is flipped on your specific module, adjust the joystick constants in `host_remote/include/remote_peripheral_config.h`.

## Current Display Wiring

The main host firmware currently assumes the new `2.8 inch SPI TFT + resistive touch` module with the TFT side wired like this:

- `VCC -> 3V3`
- `GND -> GND`
- `SCL/CLK -> GPIO18`
- `SDI/MOSI -> GPIO23`
- `SDO/MISO -> leave disconnected for now`
- `CS -> GPIO5`
- `DC -> GPIO27`
- `RES/RST -> GPIO26`
- `LED/BLK -> AO3407 drain`

Touch is wired on the same SPI bus:

- `T_CLK -> GPIO18`
- `T_DIN -> GPIO23`
- `T_DO -> GPIO19`
- `T_CS -> GPIO22`
- `T_IRQ -> GPIO17`

Touch is electrically parked in firmware so it does not interfere with the shared SPI bus, but touch interaction is not implemented yet. The host still uses the joystick for navigation.

If the panel variant differs, adjust `host_remote/include/tft_display_config.h`.

## Current Remote Wiring

The current hardware plan for the full remote is:

### TFT display

- `VCC -> 3V3`
- `GND -> GND`
- `SCL / CLK -> GPIO18`
- `SDI / MOSI -> GPIO23`
- `SDO / MISO -> leave disconnected for now`
- `CS -> GPIO5`
- `DC -> GPIO27`
- `RST / RES -> GPIO26`
- `LED / BLK -> AO3407 drain`

### Touch controller

- `T_CLK -> GPIO18`
- `T_DIN -> GPIO23`
- `T_DO -> GPIO19`
- `T_CS -> GPIO22`
- `T_IRQ -> GPIO17`

The touch controller shares the SPI bus with the TFT and nRF24L01. Firmware currently keeps `T_CS` high unless touch support is added.

### Backlight switch

- `AO3407 source -> 3V3`
- `AO3407 gate -> GPIO21`
- `150 ohm` in series between `GPIO21` and the gate
- `100k` from gate to source

This backlight path is active-low in firmware because the `AO3407` is a P-channel high-side switch.

### nRF24L01

- `VCC -> 3.3V from MCP1702T-3302E`
- `GND -> common GND`
- `SCK -> GPIO18`
- `MOSI -> GPIO23`
- `MISO -> GPIO19`
- `CE -> GPIO4`
- `CSN -> GPIO16`
- `IRQ -> not used for now`

Add a `10uF to 47uF` capacitor and a `0.1uF` capacitor near the radio module.

The built-in `Radio Check` screen in the main host firmware uses this wiring to run an on-device nRF24 self-test over the shared SPI bus.

### Joystick

- `VCC -> 3V3`
- `GND -> GND`
- `VRx -> GPIO33`
- `VRy -> GPIO32`
- `SW -> GPIO25`

These pin choices avoid wasting the shared SPI pins, keep the joystick on ADC-capable inputs, and leave the more problematic boot strap pins unused for the new peripherals.

## Current UI Shape

The remote now follows this hardware-first navigation spine:

- `Home` -> four-tile launcher for `Locate`, `Inventory`, `Phone Sync`, and `Settings`
- `Locate` -> browse locally cached parts with short labels and a selected-detail strip
- `Active Locate` -> a simple locate action screen focused on start, stop, or RF check
- `Inventory` -> choose a part for stock adjustment
- `Adjust Stock` -> quick quantity editing with `left/right` adjustment and `press to save`
- `Phone Sync` -> phone link state and local cache refresh actions
- `Setup` -> compact tile-based system actions
- `Radio Check` -> direct nRF24L01 local diagnostics

The `Locate` flow is honest about current capability. It now shows:

- mapped storage target
- mapped node
- local radio health
- whether the system is waiting for remote confirmation

The full host-to-node locate command protocol is still the next firmware layer beyond this UI pass.

## PlatformIO Setup Direction

The clean workflow from now on is:

- install the `PlatformIO IDE` extension in VS Code
- open `host_remote/` in VS Code when doing firmware work
- treat `host_remote/` as the PlatformIO project root
- use the simplified VS Code tasks or helper scripts instead of navigating the full PlatformIO side menu

This app now recommends the PlatformIO extension through `host_remote/.vscode/extensions.json`.

## Simplified Upload Flow

This project now includes a simpler upload path for day-to-day use:

- `host_remote/.vscode/tasks.json` - named VS Code tasks for build, upload, and serial monitor
- `host_remote/tools/run_pio.ps1` - helper that finds PlatformIO and auto-detects the likely ESP32 `COM` port
- `host_remote/UPLOAD_AURA_HOST.bat` - double-click upload launcher
- `host_remote/OPEN_SERIAL_MONITOR.bat` - double-click serial monitor launcher
- `host_remote/UPLOAD_AND_MONITOR_AURA_HOST.bat` - one-step upload then monitor
- `host_remote/START_HERE_UPLOAD.md` - short step-by-step usage guide

For the simplest path inside VS Code:

- press `Ctrl+Shift+P`
- run `Tasks: Run Task`
- choose `AURA Host: Upload Firmware`

## PlatformIO Commands

From `host_remote/`, the common commands are:

Build:

```powershell
pio run
```

Upload:

```powershell
pio run -t upload
```

Monitor:

```powershell
pio device monitor -b 115200
```

If the upload port needs to be pinned later, it should be added to `platformio.ini` instead of scattered across ad hoc commands.

## Hardware Bring-Up Tests

Display and other hardware experiments should go in `host_remote/tests/` as small standalone PlatformIO projects.

The first test project is:

- `host_remote/tests/display_st7735_smoke/` - legacy smoke test for the earlier 1.8 inch SPI TFT display in the `ST7735` family
