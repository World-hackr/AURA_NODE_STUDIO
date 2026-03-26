# Vendor Reference Strategy

Date: 2026-03-26

## Purpose

This file freezes how AURA should use the downloaded Wokwi and KiCad reference repos.

The goal is not to clone another tool.
The goal is to extract the useful layers and turn them into AURA's own deterministic component system.

## Current Reference Sources

- `vendor_reference/wokwi-elements/`
- `vendor_reference/wokwi-docs/`
- `vendor_reference/kicad-footprints/`
- `vendor_reference/kicad-symbols/`
- `vendor_reference/kicad-packages3D/`
- `vendor_reference/kicad-packages3D-source/`
- `vendor_reference/kicad-templates/`

## What Each Source Is For

### Wokwi

Use Wokwi for:

- 2D visual language reference
- part-level rendering structure
- examples of stateful visual components
- examples of strict project data driving the canvas
- direct imported part rendering where vendor parts are already good enough

Do not use Wokwi as AURA's final schema.
Do use it as a real import/runtime backend where that reduces duplicated work.

### KiCad Footprints

Use KiCad footprints for:

- physical package dimensions
- pin pitch
- pad placement
- connector spacing
- body outline references

This is the main dimensional truth source.

### KiCad Symbols

Use KiCad symbols for:

- logical pin naming
- grouped pin metadata
- future definition enrichment

This is secondary to footprints for the current visual-authoring phase.

### KiCad 3D Packages

Use KiCad 3D assets only as optional deeper reference.

They are not required for the current AURA flat 2D rendering direction.

## AURA Split

The current target split is:

1. imported truth
   From KiCad and other references
2. AURA component package
   `component.json + scene.svg`
3. AURA renderer and binding rules
   Runtime bindings for either imported Wokwi props or native scene nodes
4. optional behavior
   Only when the author explicitly defines it

## First Target Package Set

Before large boards like Arduino Uno/Nano, the system should prove itself on a small reusable set:

- `R_0603`
- `C_0603`
- one `SOIC`
- one `QFP` or `TQFP`
- one `Pin Header`
- one `USB connector`

If these work well, larger board assemblies can be built from them.

## Repeatable Package Rule

Many packages should support expansion instead of forcing one-off copies:

- DIP families
- SOIC/TSSOP/QFP families
- header strips
- female headers

The author should define the package family once and adjust growth parameters such as:

- pin count
- column count
- width mode
- mapped package size

## Practical Next Step

The next implementation phase should:

1. normalize Wokwi part import into the shared package contract
2. inspect matching KiCad package families for dimensions
3. validate native AURA exports against the same extractor path
4. expose the package and provenance clearly inside `Component Lab`
