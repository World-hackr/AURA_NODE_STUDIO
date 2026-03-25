# Tools

## `local_tools/`

Role:
- Reusable utilities that are not tied to only one product surface

Current important entries:
- `aura_host_diagnostics/`
  Standalone on-device diagnostics firmware for TFT, joystick, touch IRQ, and nRF24 checks
- `board_data/`
  Local browser-oriented board and serial inspection helper
- `windows/`
  Windows-specific scripts such as serial/board inspection helpers
- `README.md`
  Entry point for the folder

## `host_remote/tests/`

Role:
- Focused firmware smoke tests for individual hardware paths

Current examples:
- `display_st7735_smoke/`
- `display_st7789_smoke/`
- `nrf24_pin_smoke/`
- `nrf24_arduino_ide_smoke/`

## Root-Level Helper State

These are tooling/editor support areas, not product folders:

- `.qodo/`
- `.vscode/`

Treat them as machine/editor support, not as core product modules.
