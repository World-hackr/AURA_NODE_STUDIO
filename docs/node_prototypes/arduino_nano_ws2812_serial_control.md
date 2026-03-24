# Arduino Nano WS2812 Serial Control

This is a standalone Nano test sketch for a `WS2812` strip on `D6`.

No `nRF24` is used here.

## Wiring

- `WS2812 DIN -> D6` through a `330 ohm` resistor
- `WS2812 5V -> 5V supply`
- `WS2812 GND -> GND`

Recommended:

- add `470uF to 1000uF` across the strip `5V` and `GND`
- keep Nano ground and strip ground shared

## Library

Install:

- `Adafruit NeoPixel`

## Main Sketch

- `arduino_nano_ws2812_serial_control.ino`

## Default Assumptions

- serial speed: `115200`
- LED data pin: `D6`
- LED count: `8`

If your strip length is different, change:

```cpp
constexpr uint16_t kLedCount = 8;
```

## Serial Commands

- `HELP`
- `STATUS`
- `OFF`
- `ON`
- `BRIGHT 64`
- `FILL 255 0 0`
- `PIXEL 0 0 255 0`
- `BLINK 255 80 0 300`
- `CHASE 0 0 255 80`
- `RAINBOW 25`

`PIXEL` uses zero-based indexing.

## Notes

- `ON` returns to the current solid color
- `OFF` clears the strip
- `FILL` changes the saved solid color
- `BLINK`, `CHASE`, and `RAINBOW` are non-blocking effects driven from `loop()`
