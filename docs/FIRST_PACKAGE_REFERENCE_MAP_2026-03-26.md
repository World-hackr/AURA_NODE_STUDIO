# First Package Reference Map

Date: 2026-03-26

## Purpose

This file freezes the first concrete cross-source mapping for the initial AURA base component set.

It answers three questions for each family:

1. what Wokwi gives us directly
2. what KiCad gives us directly
3. what AURA still has to synthesize itself

## Important Truth

Wokwi does **not** cover every low-level package family directly.

It is strongest at:

- board-level visual components
- interactive/stateful parts
- clean 2D presentation language

KiCad is strongest at:

- real package geometry
- pad placement
- pin pitch
- connector layout

So the current AURA rule is:

- use Wokwi whenever there is a direct visual/state reference
- use KiCad as dimensional truth
- let AURA fill the missing package-level visual families where Wokwi has no direct element

## Family Map

### `R_0603`

- Wokwi direct reference:
  - `vendor_reference/wokwi-elements/src/resistor-element.ts`
- KiCad direct reference:
  - `vendor_reference/kicad-footprints/Resistor_SMD.pretty/R_0603_1608Metric.kicad_mod`
- AURA responsibility:
  - final flat package look
  - exact finish rules
  - deterministic family output

### `C_0603`

- Wokwi direct reference:
  - no dedicated capacitor element found in `wokwi-elements/`
- KiCad direct reference:
  - `vendor_reference/kicad-footprints/Capacitor_SMD.pretty/C_0603_1608Metric.kicad_mod`
- AURA responsibility:
  - capacitor-specific 2D body treatment
  - package finish rules
  - deterministic family output

### `SOIC-16`

- Wokwi direct reference:
  - no generic SOIC package element found in `wokwi-elements/`
- KiCad direct reference:
  - `vendor_reference/kicad-footprints/Package_SO.pretty/SOIC-16_3.9x9.9mm_P1.27mm.kicad_mod`
- AURA responsibility:
  - direct package drawing
  - pin-1 treatment
  - top-mark zone
  - repeat/growth family behavior

### `Header 1x8`

- Wokwi direct reference:
  - `vendor_reference/wokwi-elements/src/patterns/pins-female.ts`
  - `vendor_reference/wokwi-elements/src/utils/show-pins-element.ts`
- KiCad direct reference:
  - `vendor_reference/kicad-footprints/Connector_PinHeader_2.54mm.pretty/PinHeader_1x08_P2.54mm_Vertical.kicad_mod`
- AURA responsibility:
  - male/female visual distinction in one family
  - repeat/grid-growth behavior
  - pin-number readability rules

### `USB Micro-B`

- Wokwi direct reference:
  - no standalone USB Micro-B element found in `wokwi-elements/`
  - board-level references exist inside:
    - `vendor_reference/wokwi-elements/src/arduino-nano-element.ts`
    - `vendor_reference/wokwi-elements/src/arduino-uno-element.ts`
- KiCad direct reference:
  - `vendor_reference/kicad-footprints/Connector_USB.pretty/USB_Micro-B_Molex_105017-0001.kicad_mod`
- AURA responsibility:
  - standalone connector-family drawing
  - shell/opening/mount-tab treatment
  - reusable board-edge connector family output

## Current Conclusion

The first package pass will be mixed-source, not fully vendor-derived:

- `R_0603` gets both direct Wokwi and KiCad help
- `C_0603` is mostly KiCad + AURA
- `SOIC-16` is mostly KiCad + AURA
- `Header 1x8` is KiCad + partial Wokwi pattern reference + AURA
- `USB Micro-B` is KiCad + indirect Wokwi board reference + AURA

That is acceptable.

The goal is not to force Wokwi to provide everything.
The goal is to use Wokwi where it is strong and let AURA own the missing families.
