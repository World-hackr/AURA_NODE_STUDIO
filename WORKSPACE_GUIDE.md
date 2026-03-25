# Workspace Guide

This file is the fastest way to understand what lives in this repo and where to go next.

## Main Product Areas

- `host_remote/`
  ESP32 host firmware, hardware tests, and upload helpers for `AURA Host`.
- `studio_ui/`
  Browser-based `AURA Studio` workspace for circuit editing and component authoring.
- `phone_ui/`
  Reserved phone-side workspace. Still light.
- `shared/`
  Shared contracts and reusable component-definition assets.
- `docs/`
  Product, workflow, and authoring documents for the current restart.
- `local_tools/`
  Small reusable tools, diagnostics, and machine-side helpers.

## Reference And Archive

- `AURA _report/`
  Reports, papers, presentations, and other archive/reference material.
  This is intentionally separate from active product work.

## Local Machine State

These are not the product source of truth:

- `.qodo/`
- `.vscode/`
- `host_remote/.pio/`
- `host_remote/.qodo/`
- `host_remote/.vscode/`
- `studio_ui/node_modules/`
- `studio_ui/dist/`

## Where To Read Next

1. `README.md`
2. `docs/WORKSPACE_AUDIT_2026-03-20.md`
3. `workspace_index/README.md`
4. `host_remote/README.md`
5. `studio_ui/README.md`

## Workspace Index Folder

For a categorized inventory of products, tools, docs, and local-state areas, see:

- `workspace_index/README.md`
- `workspace_index/PRODUCTS.md`
- `workspace_index/TOOLS.md`
- `workspace_index/DOCS_AND_SHARED.md`
- `workspace_index/LOCAL_STATE_AND_ARCHIVE.md`
