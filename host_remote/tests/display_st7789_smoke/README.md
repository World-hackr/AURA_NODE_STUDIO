# ST7789 LCD Smoke Test

This is a standalone PlatformIO test project for the new `2.8 inch SPI TFT` module using the `ST7789` controller.

It does not modify the main `host_remote/` firmware.

## What This Test Does

After boot it cycles through:

- solid black
- solid white
- solid red
- solid green
- solid blue
- vertical color bars
- an orientation screen with colored corners and a center target

This is enough to confirm:

- power is correct
- the backlight is on
- SPI wiring is correct
- the panel is accepting commands
- color order is correct or close
- screen orientation is correct or close
- full-screen fills are stable without random noisy regions

## Assumed Wiring

This test assumes the TFT is the only active display on the bus and uses:

- `TFT VCC -> ESP32 3V3`
- `TFT GND -> ESP32 GND`
- `TFT SCK -> ESP32 GPIO18`
- `TFT SDI/MOSI -> ESP32 GPIO23`
- `TFT CS -> ESP32 GPIO5`
- `TFT DC -> ESP32 GPIO27`
- `TFT RESET -> ESP32 GPIO26`
- `TFT LED/BLK -> ESP32 3V3` or your existing backlight path

For this smoke test:

- leave `TFT SDO/MISO` disconnected
- do not depend on touch
- preferably disconnect `nRF24L01` while testing

## Run

From the repo root:

```powershell
C:\Users\Santo\.platformio\penv\Scripts\platformio.exe run -d host_remote\tests\display_st7789_smoke
C:\Users\Santo\.platformio\penv\Scripts\platformio.exe run -d host_remote\tests\display_st7789_smoke -t upload
```

Or open `host_remote/tests/display_st7789_smoke/` directly in VS Code as a small PlatformIO project.

## Fast Adjustments

If the screen lights but still shows wrong orientation or offsets, edit:

- `include/display_test_config.h`

The first adjustment points are:

- `kRotation`
- `kColumnOffset`
- `kRowOffset`
- `kUseBgrColorOrder`
- `kInvertColors`
