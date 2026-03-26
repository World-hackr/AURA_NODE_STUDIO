## Component Import Tools

This folder holds local generation/import helpers for converting vendor reference
data into deterministic AURA component artifacts.

Current focus:

- KiCad footprint to AURA example generation for the first package families
- small, auditable import scripts before broader automation

Current script:

- `scripts/generate_first_passives_from_kicad.mjs`
- `scripts/extract_component_package_scene.mjs`
- `scripts/extract_wokwi_source_models.mjs`

That script reads the exact KiCad footprint files for:

- `R_0603_1608Metric`
- `C_0603_1608Metric`

and regenerates the matching AURA example definitions under:

- `shared/component_definitions_v1/examples/resistor_0603.component.json`
- `shared/component_definitions_v1/examples/capacitor_0603.component.json`

Run from the repo root:

```powershell
node local_tools/component_import/scripts/generate_first_passives_from_kicad.mjs
```

This is intentionally a first narrow import path, not a final universal KiCad
ingester.

The first package/extractor scaffold also now exists:

- `scripts/extract_component_package_scene.mjs`

That script reads:

- an exported `scene.svg`
- optionally an exported `component.json`

and emits a normalized summary of:

- scene viewBox and size
- detected `data-aura-node-id` entries
- detected pin anchors from `data-pin-*` attributes

Run from the repo root:

```powershell
node local_tools/component_import/scripts/extract_component_package_scene.mjs scene.svg component.json
```

The first Wokwi source-wide extractor also now exists:

- `scripts/extract_wokwi_source_models.mjs`

That script parses the local offline Wokwi source tree under:

- `vendor_reference/wokwi-elements/src/`

and generates machine-readable extracts under:

- `shared/wokwi_models_v1/generated/`

Run from the repo root:

```powershell
node local_tools/component_import/scripts/extract_wokwi_source_models.mjs
```
