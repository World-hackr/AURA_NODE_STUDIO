# Docs And Shared Assets

## `docs/`

Role:
- Main planning and system-definition folder

Key documents:
- `AURA_HOST_V1.md`
- `SYSTEM_WORKFLOW_V1.md`
- `NORMAL_USER_PRODUCT_MODEL_2026-03-24.md`
- `AURA_COMPONENT_PACKAGE_V1.md`
- `COMPONENT_DEFINITION_V1.md`
- `EDITABLE_BEHAVIOR_MODEL_V1.md`
- `COMPONENT_TEMPLATE_SYSTEM_V1.md`
- `COMPONENT_LAB_AUTHORING_RULES.md`
- `DATA_CONTRACTS_V1.md`
- `WORKSPACE_AUDIT_2026-03-20.md`

Subfolders:
- `ui/`
- `node_prototypes/`
- `visual_examples/`

## `shared/`

Role:
- Machine-readable shared system artifacts

Current important entries:
- `contracts_v1/`
  Shared schemas and contract index
- `component_definitions_v1/`
  Reusable component-definition examples, template, and index
- `component_packages_v1/`
  Paired `component.json + scene.svg` package area, including the current starter template and package index
- `component_templates_v1/`
  Machine-readable template-family layer for the first AURA package classes
- `behavior_models_v1/`
  Machine-readable runtime-state profiles for light, potentiometer, switch, and servo behavior
- `wokwi_models_v1/`
  Machine-readable Wokwi import bridge for tag names, pins, sizing, and runtime bindings
- `README.md`

## Practical Split

- If it explains the system in prose, it belongs in `docs/`
- If it is a reusable machine-readable artifact, it belongs in `shared/`
