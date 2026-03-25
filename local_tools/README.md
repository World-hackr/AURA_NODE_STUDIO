# Local Tools

This folder is for reusable machine-side tools that are not tied to one app.

Use this area for utilities that can help across projects, such as:

- serial port detection
- board identification
- upload helpers
- log capture
- quick hardware diagnostics

Keep these tools:

- reusable
- short
- documented
- independent from one project whenever possible

Current tools:

- `board_data/` - local board-data tool with a browser UI for board, port, and spec inspection
- `aura_host_diagnostics/` - standalone ESP32 on-device diagnostics tool for the current host hardware, including TFT, joystick, touch IRQ, and nRF24 status
- `windows/list_serial_boards.ps1` - low-level Windows board and serial inspection script used directly and also reused by `board_data/`
