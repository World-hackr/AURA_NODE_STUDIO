# Wokwi Models V1

This folder holds the first machine-readable bridge between offline Wokwi part visuals and AURA-owned circuit metadata.

Use it for:

- Wokwi tag and module reference
- natural Wokwi render size
- pin order and vendor pin anchor reference
- runtime default state
- deterministic property bindings from AURA runtime state into Wokwi web components

These files are not the final AURA component-definition source of truth.
They are the vendor-backed reference layer that makes Wokwi-backed rendering deterministic inside `AURA Studio`.

Current first-pass models:

- `led_5mm`
- `resistor_axial_030`
- `potentiometer_knob`
- `slide_switch_spdt`
- `servo_micro`

Corrections:

- `corrections.json` holds AURA-side deterministic fixes for vendor issues such as pin anchor misalignment or naming cleanup.
- Keep vendor-derived model files as the base reference layer and apply AURA corrections on top instead of rewriting vendor truth directly.
- `Component Lab` can now load Wokwi-backed parts onto the creator stage, let the user edit pin anchors visually, and export a correction artifact back into this schema shape.

Generated source-wide extracts now also live under:

- `generated/`

Use those generated files to inspect all local Wokwi components without overwriting the smaller curated model set.
