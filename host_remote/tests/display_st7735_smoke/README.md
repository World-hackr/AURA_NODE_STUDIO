# ST7735 LCD Smoke Test

This is a standalone PlatformIO test project for the common 1.8 inch SPI TFT module usually based on the `ST7735` controller.

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
- color order and screen orientation are close to correct

## Assumed Wiring

This test assumes an `ESP32 DevKit` style board and a common SPI TFT module with labels similar to:

- `VCC`
- `GND`
- `SCL` or `CLK`
- `SDA` or `MOSI`
- `RES` or `RST`
- `DC` or `A0`
- `CS`
- `LED` or `BLK`

Connections used by this test:

- `TFT VCC -> ESP32 3V3`
- `TFT GND -> ESP32 GND`
- `TFT SCL/CLK -> ESP32 GPIO18`
- `TFT SDA/MOSI -> ESP32 GPIO23`
- `TFT CS -> ESP32 GPIO5`
- `TFT DC/A0 -> ESP32 GPIO27`
- `TFT RES/RST -> ESP32 GPIO26`
- `TFT LED/BLK -> ESP32 3V3`

Notes:

- `SDA` on this module is `SPI MOSI`, not I2C data.
- `MISO` is not needed for this smoke test.
- Keep the display on `3.3V` logic with the ESP32.
- If your module has a different controller like `ST7789`, this exact test is the wrong starting point.

## Run

From the repo root:

```powershell
pio run -d host_remote\tests\display_st7735_smoke
pio run -d host_remote\tests\display_st7735_smoke -t upload
pio device monitor -b 115200
```

Or open `host_remote/tests/display_st7735_smoke/` directly in VS Code as a small PlatformIO project.

If `pio` is not on `PATH`, use:

```powershell
C:\Users\Santo\.platformio\penv\Scripts\pio.exe run -d host_remote\tests\display_st7735_smoke
```

## Fast Adjustments

If the screen lights but shows shifted graphics or odd colors, edit:

- `include/display_test_config.h`

The main adjustment points are:

- `kRotation`
- `kColumnOffset`
- `kRowOffset`
- `kUseBgrColorOrder`
- `kInvertColors`
