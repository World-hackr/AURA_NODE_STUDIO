# Component Templates V1

This folder contains the first machine-readable AURA component-template layer.

Templates are package-family starters.
They are meant to bridge:

- Wokwi visual reference
- Wokwi direct-import structure where useful
- KiCad physical/package truth
- AURA component definitions
- future AURA component packages

These are not final board assemblies.
They are reusable structured inputs for building the first real component library.

## Current Files

- `template_index.json`
  High-level catalog of the first template families
- `vendor_reference_index.json`
  Exact first-family mapping between AURA templates and current Wokwi/KiCad reference files
- `templates/`
  One file per template family

## First Template Families

- `resistor_smd`
- `capacitor_smd`
- `ic_package`
- `pin_header`
- `usb_connector`

## Current Rule

Use templates to define:

- family structure
- expected inputs
- repeat rules
- renderer-derived finish rules

Do not treat these as the final runtime or simulation layer.
