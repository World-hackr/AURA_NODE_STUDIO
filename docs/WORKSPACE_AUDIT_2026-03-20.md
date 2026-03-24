# Workspace Audit

Date: 2026-03-20

## Purpose

This file explains what currently exists in `AURA Node Studio`, what appears active, and what is mostly historical or generated noise.

## Active Product Areas

- `host_remote/`
  Main active firmware workspace for `AURA Host`. This is where the real product code currently lives.
- `docs/`
  Current planning, host workflow definition, UI plans, and node prototypes for the hardware-first restart.
- `local_tools/`
  Reusable machine-side helpers, especially serial-board inspection and the `board_data/` browser tool.

## Reserved But Light Areas

- `phone_ui/`
  Placeholder structure only. No substantial phone implementation is present yet.
- `shared/`
  Reserved for future shared schemas and contracts. It is still mostly empty.

## Archive And Reference Material

- `AURA _report/`
  Academic, presentation, and report-oriented material. Useful as background/reference, but not part of the active firmware/tooling implementation path.

## Generated Local State

These are the main classes of generated local state this workspace can produce:

- `.platformio_local/`
  Large local PlatformIO package/cache state.
- `host_remote/.pio/`
  Generated build output for the main firmware project.
- `host_remote/tests/*/.pio/`
  Generated build output for standalone hardware smoke tests.
- `.qodo/` and `host_remote/.qodo/`
  Tool metadata folders.
- `.vscode/` and `host_remote/.vscode/`
  Editor configuration and generated IntelliSense state.

The heavy generated folders were removed during the 2026-03-20 cleanup pass so the workspace stays focused on source and docs.

## Repetition And Low-Value Noise Found

- `AURA _report/ppt_assets/report_media/`
  This was a duplicate copy of the same `image1` through `image14` set already present in `conference_media/` and was removed in the cleanup pass.
- `AURA _report/ppt_assets/presentation_build/ui_alt.png`
  This was byte-identical to `ui_full.png` and was removed in the cleanup pass.
- `AURA _report/`
  Contains multiple export variants of similar report/presentation content across `.md`, `.docx`, `.pdf`, and `.pptx`.
- `AURA _report/~$*`
  Hidden Word lock/temp files. These were removed in the cleanup pass.
- `AI_CONTINUITY_LOG.md`
  Contains a malformed historical section near the end that looks like mixed encoding. It should be preserved as history, but treated carefully.

## Practical Reading Order

If you want the fastest path through the repo:

1. `README.md`
2. `docs/WORKSPACE_AUDIT_2026-03-20.md`
3. `host_remote/README.md`
4. `docs/AURA_HOST_V1.md`
5. `docs/SYSTEM_WORKFLOW_V1.md`
6. `local_tools/board_data/README.md`

## Current Organization Decision

The workspace already has a mostly-correct top-level shape.

The real issue is not top-level chaos. The real issue is that generated local state and archive/report material visually compete with the active firmware and planning work.

After the cleanup pass, the direction should remain:

- keep the current top-level product folders
- treat `AURA _report/` as archive/reference
- keep generated local build state out of project-facing discussions unless it is actively needed
- continue growing `docs/`, `host_remote/`, and `local_tools/` as the active system areas
