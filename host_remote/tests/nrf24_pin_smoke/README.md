# nRF24L01 Pin Smoke Test

This is a standalone PlatformIO test project for checking whether the currently wired `nRF24L01` module is connected correctly to the `ESP32` host.

It does not modify the main `host_remote/` firmware.

## What This Test Proves

With only one radio module connected, this test checks:

- power and ground are present
- `SCK`, `MOSI`, `MISO`, and `CSN` are working over SPI
- the radio answers with sane register values
- a register write/read-back cycle works
- the `CE` pin can trigger a transmit attempt

The transmit trigger test does not require a second radio. It intentionally sends a packet and looks for:

- `MAX_RT` if no receiver exists
- or `TX_DS` if another matching receiver happens to be present

Either result proves the `CE` line is actually driving the radio state machine.

## Assumed Wiring

This test uses the current remote pin plan:

- `nRF VCC -> 3.3V from MCP1702T-3302E`
- `nRF GND -> common GND`
- `nRF SCK -> ESP32 GPIO18`
- `nRF MOSI -> ESP32 GPIO23`
- `nRF MISO -> ESP32 GPIO19`
- `nRF CE -> ESP32 GPIO4`
- `nRF CSN -> ESP32 GPIO16`

Optional but strongly recommended near the radio:

- `10uF to 47uF` capacitor across `VCC` and `GND`
- `0.1uF` ceramic capacitor across `VCC` and `GND`

## What To Expect

Open the serial monitor at `115200`.

Good SPI wiring usually shows:

- sane defaults for `CONFIG`, `SETUP_AW`, `RF_CH`, `RF_SETUP`, and `STATUS`
- register write/read-back passes

Good `CE` wiring usually shows:

- `MAX_RT` after the transmit attempt if there is no receiver
- or `TX_DS` if a matching receiver is present

## Interpreting Failure

- `All reads are 0x00 or 0xFF`
  Likely `VCC`, `GND`, `SCK`, `MOSI`, `MISO`, or `CSN` problem.
- `Register write/read-back fails`
  Likely SPI wiring problem.
- `SPI tests pass but transmit trigger times out`
  Likely `CE` wiring problem, unstable radio power, or a badly seated module.

## Run

Simplest way:

- double-click `UPLOAD_NRF24_PIN_SMOKE.bat`
- then double-click `OPEN_NRF24_PIN_MONITOR.bat`

Or do both in one step:

- double-click `UPLOAD_AND_MONITOR_NRF24_PIN_SMOKE.bat`

If you open this folder itself in VS Code, you can also use:

- `Ctrl+Shift+P`
- `Tasks: Run Task`
- `nRF24 Pin Smoke: Upload And Open Monitor`

Manual PlatformIO commands from the repo root:

```powershell
pio run -d host_remote\tests\nrf24_pin_smoke
pio run -d host_remote\tests\nrf24_pin_smoke -t upload
pio device monitor -b 115200
```
