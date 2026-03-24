# nRF24 Arduino IDE Smoke Test

This is a plain Arduino IDE sketch version of the nRF24L01 wiring test.

Main sketch:

- `nrf24_arduino_ide_smoke.ino`

## Wiring

Use the current AURA remote pin plan:

- `nRF VCC -> 3.3V`
- `nRF GND -> GND`
- `nRF SCK -> GPIO18`
- `nRF MOSI -> GPIO23`
- `nRF MISO -> GPIO19`
- `nRF CE -> GPIO4`
- `nRF CSN -> GPIO16`

Strongly recommended near the radio:

- `10uF to 47uF` capacitor across `VCC` and `GND`
- `0.1uF` ceramic capacitor across `VCC` and `GND`

## Arduino IDE Upload

1. Open `nrf24_arduino_ide_smoke.ino` in Arduino IDE.
2. Select board: `ESP32 Dev Module`
3. Select the correct port.
4. Upload.
5. Open Serial Monitor at `115200`.

## What Pass Looks Like

Good wiring usually shows:

- `SPI alive: PASS`
- `Write/read-back: PASS`
- `CE trigger: PASS`

With only one radio attached, `Transmit result: MAX_RT` is still acceptable.
It means the radio accepted the transmit attempt, but no receiver answered.

## Failure Meaning

- `Overall: FAIL`
  Likely `VCC`, `GND`, `SCK`, `MOSI`, `MISO`, or `CSN`
- `Overall: PARTIAL`
  Likely `CE` or radio power stability
