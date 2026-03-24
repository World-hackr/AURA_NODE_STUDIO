# Arduino Nano Simple Node

This is a temporary prototype node for:
- `Arduino Nano`
- `nRF24L01`
- `WS2812` LED strip

It is intentionally simple.

The goal is only to prove:
- radio reception works
- the node can react to a few short commands
- the LED strip can show a clear "find me" effect

## Wiring

### nRF24L01

- `VCC -> 3.3V` from a stable external regulator
- `GND -> GND`
- `CE -> D9`
- `CSN -> D10`
- `SCK -> D13`
- `MOSI -> D11`
- `MISO -> D12`
- `IRQ -> not used`

Important:
- do not connect `nRF24 VCC` to `5V`
- add `10uF to 47uF` and `0.1uF` capacitors close to the radio module

### WS2812

- `DIN -> D6` through a `330 ohm` resistor
- `5V -> 5V supply`
- `GND -> GND`

Recommended:
- add `470uF to 1000uF` across the strip `5V` and `GND`
- all grounds must be shared: Nano, radio, and strip

## Libraries For Arduino IDE

Install these libraries:
- `RF24` by TMRh20
- `Adafruit NeoPixel`

## What This Sketch Does

The sketch listens for very small text commands over `nRF24`.

Supported commands:
- `FIND` -> blinking orange alert effect
- `STOP` -> LEDs off
- `IDLE` -> dim blue idle state
- `OK` -> solid green
- `ERR` -> solid red

It also prints received commands to the serial monitor at `115200`.

## Radio Pipe

This test sketch listens on:
- pipe address: `"AURA1"`

Keep the host sender on the same address.

## LED Count

Change this line in the sketch if needed:

```cpp
constexpr uint8_t kLedCount = 8;
```

## Notes

- This is not the final AURA node protocol.
- It is a small bring-up sketch for hardware validation.
- Once this works, the next step is to replace text commands with a very small binary packet format.
