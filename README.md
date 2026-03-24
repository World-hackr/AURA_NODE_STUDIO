# AURA Node Studio

Date: 2026-03-14

`AURA Node Studio` is the clean restart workspace for the hardware-first version of AURA.

This folder is intentionally structured as a small monorepo.

That is professional if the boundaries are clear:
- host remote firmware lives in its own root-level product folder
- browser-side studio tooling lives in its own root-level product folder
- phone UI lives in its own root-level product folder
- shared contracts live in one place
- docs explain the system instead of letting the root become ambiguous

## Structure

- `host_remote/` - ESP32 host remote firmware, host-specific tests, and host-specific helper scripts
- `studio_ui/` - browser-side deterministic circuit and component authoring tool for advanced/internal workflows
- `phone_ui/` - future phone UI workspace, plus phone-side placeholder organization for tests and tools
- `shared/` - shared models and contracts
- `docs/` - system planning docs for this restart
- `local_tools/` - reusable machine-side utilities and hardware bring-up helpers that can be reused across projects
- `AURA _report/` - archive/reference material for academic reports, presentations, and earlier formal writeups

## What Is Active Right Now

The active implementation center is:

- `host_remote/`
- `docs/`
- `local_tools/`
- `studio_ui/`

`phone_ui/` and `shared/` are intentionally reserved but still light.

`AURA _report/` should be treated as archive/reference, not as the main product workspace.

## Generated Local State

This workspace may generate machine-local state such as:

- `.platformio_local/`
- `host_remote/.pio/`
- `host_remote/tests/*/.pio/`
- `.qodo/`
- `.vscode/`

Those directories are rebuildable local state, not the real product source of truth.

For the current repo audit and classification, see:

- `docs/WORKSPACE_AUDIT_2026-03-20.md`

## Why This Structure

The product is one system, not separate unrelated projects.

Keeping firmware and phone UI in the same repo is the right move if:
- they belong to one product
- they share naming and contracts
- you want one place for the final architecture

What is not professional is mixing all source files together in one flat folder.

## Current Start Point

The first implementation slice starts in `host_remote/`.

That slice focuses on:
- host navigation flow
- simple UI state
- search, inventory, and locate surfaces
- PlatformIO based development in VS Code

`host_remote/` should be treated as a standalone PlatformIO firmware project during host development sessions.

## Surface Roles

The product should be read as three distinct surfaces:

- `AURA Host` - the primary normal-user interface for search, stock review, and physical locate
- `AURA Phone` - the later richer user interface for deeper search and workflow support
- `AURA Studio` - the supporting deterministic browser tool for circuit review and reusable part authoring

The browser studio is important, but it is not the first user-facing proof point. The hardware host remains the front door for V1.
