# Board Data Tool

`board_data` is the first feature-oriented local tool under `local_tools/`.

It gives a simple local website for:

- connected board detection
- COM port mapping
- board-family guesses
- board-profile based specs such as MCU family, wireless stack, memory, and storage
- USB bridge and VID/PID details
- disconnected remembered-port history
- optional board PNG images

Default flow:

- main page shows only live ports
- archive page shows remembered boards and full technical data

It reuses the lower-level Windows detector at:

- `..\windows\list_serial_boards.ps1`

## Structure

- `server/server.mjs` - local Node server and API
- `web/` - pure HTML, CSS, and JavaScript UI
- `scripts/start_board_data.ps1` - starts the local server
- `scripts/refresh_board_snapshot.ps1` - writes a fresh JSON snapshot without opening the site
- `launch_board_data.bat` - easy launcher for double-click use
- `data/board_images.json` - image mapping written by the import flow
- `data/board_overrides.json` - manual board-profile assignments for boards Windows cannot identify precisely
- `data/boards.snapshot.json` - latest board-data snapshot written by the server
- `assets/imported/` - imported board PNG files

## Run

From the repo root:

```powershell
.\local_tools\board_data\launch_board_data.bat
```

Or:

```powershell
powershell -ExecutionPolicy Bypass -File .\local_tools\board_data\scripts\start_board_data.ps1 -OpenBrowser
```

Default local URL:

- `http://127.0.0.1:8844`

Main pages:

- `http://127.0.0.1:8844/` - live ports only
- `http://127.0.0.1:8844/archive.html` - full archive and full specs

In the archive page, you can manually assign a board profile if the detector only sees a generic USB serial bridge. That manual profile is stored in `data/board_overrides.json`.

`start_board_data.ps1` also keeps `data/boards.snapshot.json` fresh in the background, and the UI can fall back to that snapshot if the live API path is unavailable.

## PNG Images

Each board card in the UI has an `Import PNG` action.

That import is stored locally in:

- `assets/imported/`
- `data/board_images.json`

The mapping is tied to a stable board key derived from the board instance data so the image can reappear later.
