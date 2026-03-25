# AURA Host Diagnostics

This is a standalone on-device diagnostics tool for the current AURA Host hardware.

It is intentionally stored under `local_tools/` because its purpose is broader than the main host app:

- verify TFT bring-up
- verify joystick movement and switch state
- verify nRF24L01 SPI health
- expose touch IRQ state without requiring touch UI support

## What It Shows

On the TFT it renders:

- current display/controller label
- live joystick position inside a circle
- joystick raw `X` and `Y`
- joystick interpreted direction
- joystick switch state
- touch IRQ idle/active state
- nRF24L01 self-test summary and register values

The radio test is re-run periodically so the screen updates without needing serial logs.

## Build

From the repo root:

```powershell
C:\Users\Santo\.platformio\penv\Scripts\platformio.exe run -d local_tools\aura_host_diagnostics
C:\Users\Santo\.platformio\penv\Scripts\platformio.exe run -d local_tools\aura_host_diagnostics -t upload
```

## If The Screen Is Wrong

The first values to tune are in:

- `include/diagnostics_config.h`

Adjust:

- `kRotation`
- `kColumnOffset`
- `kRowOffset`
- `kUseBgrColorOrder`
- `kInvertColors`
