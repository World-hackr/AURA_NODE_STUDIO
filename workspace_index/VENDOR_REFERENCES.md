# Vendor References

This file explains the external reference sources currently grouped under `vendor_reference/`.

These are not AURA's own final source of truth.
They are offline reference inputs for visual study, dimensional import, and schema planning.

## Wokwi

### `vendor_reference/wokwi-elements/`

Role:
- 2D visual component reference
- stateful part rendering reference

Useful for:
- how boards and parts are drawn cleanly in 2D
- how a component exposes visual state such as LED on/off or servo angle
- how restrained accent color can support readability without turning the whole UI colorful
- direct vendor-backed part rendering trials inside `AURA Studio`

### `vendor_reference/wokwi-docs/`

Role:
- offline docs reference for Wokwi project structure

Useful for:
- `diagram.json` structure
- chip/custom-part structure
- understanding the split between static part data and runtime-driven visual state

### `vendor_reference/wokwi-projects/`

Role:
- cached public example-project reference set

Useful for:
- studying many public Wokwi projects offline
- finding concrete example circuits and patterns
- collecting future import/reference candidates

## KiCad

### `vendor_reference/kicad-footprints/`

Role:
- package and footprint geometry reference

Useful for:
- pad placement
- pin pitch
- package size
- connector spacing
- physical arrangement truth

### `vendor_reference/kicad-symbols/`

Role:
- logical symbol and pin metadata reference

Useful for:
- logical names
- grouped pin information
- future metadata import

### `vendor_reference/kicad-packages3D/`

Role:
- optional geometry enrichment reference

Useful for:
- future study only
- not required for the current flat 2D AURA renderer

### `vendor_reference/kicad-packages3D-source/`

Role:
- source assets for KiCad 3D models

Useful for:
- deeper reference work if AURA later needs more physical form study

### `vendor_reference/kicad-templates/`

Role:
- supporting project/template reference

Useful for:
- overall KiCad project conventions

## Visual Communication

### `IMAGES/`

Role:
- screenshot and issue-reference folder for human communication

Useful for:
- UI/layout bug reports
- visual comparisons
- feature references

## AURA Rule

Use these folders to learn from and import from.
Do not let them replace AURA's own schema, definitions, or renderer rules.
