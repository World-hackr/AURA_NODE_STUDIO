# Workspace Guide

This file is the fastest way to understand what lives in this repo and where to go next.

## Main Product Areas

- `host_remote/`
  ESP32 host firmware, hardware tests, and upload helpers for `AURA Host`.
- `studio_ui/`
  Browser-based `AURA Studio` workspace for circuit editing and component import/correction.
- `phone_ui/`
  Reserved phone-side workspace. Still light.
- `shared/`
  Shared contracts and reusable component-definition assets.
  Important current subfolders include `contracts_v1/`, `component_templates_v1/`, `component_definitions_v1/`, `component_packages_v1/`, `behavior_models_v1/`, and `wokwi_models_v1/`.
- `docs/`
  Product, workflow, and authoring documents for the current restart.
- `local_tools/`
  Small reusable tools, diagnostics, and machine-side helpers.
  Important current subtools include `aura_host_diagnostics/`, `board_data/`, and `component_import/`.

## Reference And Archive

- `AURA _report/`
  Reports, papers, presentations, and other archive/reference material.
  This is intentionally separate from active product work.

## External Reference Sources

These are consolidated under:

- `vendor_reference/`

This folder holds the offline Wokwi and KiCad reference repos used for study, import planning, and future conversion into AURA-owned definitions.

- `IMAGES/`
  Shared visual communication folder for screenshots, issue references, and layout discussion.

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
4. `docs/AURA_COMPONENT_PACKAGE_V1.md`
5. `host_remote/README.md`
6. `studio_ui/README.md`
7. `workspace_index/VENDOR_REFERENCES.md`

## Workspace Index Folder

For a categorized inventory of products, tools, docs, and local-state areas, see:

- `workspace_index/README.md`
- `workspace_index/PRODUCTS.md`
- `workspace_index/TOOLS.md`
- `workspace_index/DOCS_AND_SHARED.md`
- `workspace_index/LOCAL_STATE_AND_ARCHIVE.md`
- `workspace_index/VENDOR_REFERENCES.md`
