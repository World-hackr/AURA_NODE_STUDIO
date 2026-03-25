# AURA Host Tests

This folder is for isolated hardware bring-up work.

Each test should live in its own subfolder with its own `platformio.ini` so experiments do not disturb the main `host_remote/` firmware.

Current test projects:

- `display_st7735_smoke/` - first-pass smoke test for a common 1.8 inch SPI TFT display based on the `ST7735` controller family
- `display_st7789_smoke/` - dedicated smoke test for the new 2.8 inch SPI TFT module using the `ST7789` controller
- `nrf24_pin_smoke/` - single-radio smoke test that checks `SPI` wiring and proves the `CE` line by forcing a transmit attempt
- `nrf24_arduino_ide_smoke/` - plain Arduino IDE sketch for quickly testing nRF24L01 wiring without PlatformIO

Shared helper:

- `tools/run_test_pio.ps1` - reusable test runner for build, upload, monitor, and serial-port detection across isolated hardware test projects

Use this area for:

- display bring-up
- input device bring-up
- node communication probes
- sensor and storage validation

Keep these tests short, direct, and hardware-focused.
