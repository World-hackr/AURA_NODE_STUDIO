# AURA Component Package V1

Date: 2026-03-26
## Purpose

This document freezes the minimum artifact contract for reusable AURA components.

The goal is to make imported Wokwi parts and native AURA-edited parts converge into one deterministic package shape.

That package should be easy to:

- author
- inspect
- validate
- round-trip through `AURA Studio`
- generate from future AI systems without hidden repair logic

## Core Rule

An AURA component package is not only a JSON file and not only an SVG file.

It is both:

- `component.json`
  Canonical semantic truth
- `scene.svg`
  Canonical visual truth

The two files belong together.

## Why Two Files

### `component.json`

This file stores meaning:

- metadata
- pins
- runtime props
- bindings
- node ids
- child-part hierarchy
- source/provenance
- authoring-safe structure

### `scene.svg`

This file stores the final visual scene:

- body geometry
- labels
- pads
- outlines
- silkscreen
- named visual nodes that bindings can target

This split avoids a bad failure mode:

- SVG alone is too weak as the only semantic source for native AURA parts
- JSON alone is too weak as the only visual source for deterministic import/export and compatibility

## V1 Package Layout

Minimum package shape:

```text
component_name/
  component.json
  scene.svg
```

Future optional additions may include:

- `source.json`
- `preview.png`
- `notes.md`

But these are not required for the V1 contract.

## Canonical Truth Rule

For native AURA-edited parts:

- `component.json` is canonical for semantics
- `scene.svg` is canonical for visuals

For imported Wokwi parts:

- vendor scene/code is the input
- AURA extraction generates the package
- resulting `component.json + scene.svg` becomes the AURA-owned package

So the practical split is:

- Wokwi import = parse-first
- native AURA editing = author-first, parse-verified

## Shared Extractor Contract

The same extractor pipeline should work on:

- vendor Wokwi scene/runtime sources
- native AURA-exported `scene.svg`

Its job is to produce normalized extracted data such as:

- scene bounds
- node ids
- pin anchors
- snap points
- render size
- runtime target surfaces

For Wokwi imports, this extractor is the main ingestion step.

For native AURA parts, this extractor is a deterministic validation and normalization step.

## Runtime Model

The runtime model should not split into one system for Wokwi and another for AURA.

Instead, both should use the same conceptual structure:

1. runtime props
   Examples:
   - `value`
   - `angle`
   - `brightness`
   - `state`
2. visual targets
   Examples:
   - Wokwi element prop like `angle`
   - native scene node like `shaft`
3. bindings
   Examples:
   - rotation
   - translation
   - opacity
   - color
   - visibility

So the only difference is the binding backend:

- Wokwi-backed component -> bind to vendor element props
- native AURA component -> bind to named SVG scene nodes

## Pin Rule

Pins must be deterministic and extractable.

V1 rule:

- pins are stored in `component.json`
- their anchor positions must also be verifiable from `scene.svg`
- imported parts should derive pins from vendor truth where available
- native parts should define pins explicitly in the editor, then export them into the same structure

## Native Editing Flow

Correct native flow:

1. user builds the visual part from named visual pieces
2. user names dynamic nodes such as `shaft`, `knob`, `handle`, `light_core`
3. user defines pins and labels
4. user defines runtime props and bindings
5. editor exports:
   - `component.json`
   - `scene.svg`
6. extractor validates/normalizes the exported scene

## Wokwi Import Flow

Correct Wokwi flow:

1. inspect vendor component source
2. extract visual/runtime/pin structure
3. normalize that into:
   - `component.json`
   - `scene.svg`
4. allow post-import editing inside `Component Lab`

Current import surface now includes:

- vendor-backed Wokwi sources
- standalone SVG scene import into editable SVG-backed layers
- explode/edit flow for imported SVG-backed layers when whole-block markup editing is not enough

## Determinism Rules

- No hidden editor-only repair state
- No manual per-instance visual patching after export
- No semantic meaning that exists only in the UI and not in `component.json`
- No snap-point logic that cannot be derived or validated from package artifacts
- No separate “special” behavior system just for imported Wokwi parts

## Current Practical Meaning

Today, `shared/component_definitions_v1/` still holds the semantic JSON side as the main repo-backed artifact set.

This document freezes the direction that those definitions are moving toward:

- semantic `component.json`
- visual `scene.svg`
- shared extractor pipeline

Current practical priority inside `Component Lab` is:

1. import or load a real source when possible
2. correct pins, naming, and runtime mappings
3. export an AURA-owned package
4. use blank/native starts only when import is not the better path

## Current Status

The first implementation layer is now present:

1. shared package folder reserved under `shared/component_packages_v1/`
2. `Component Lab` can export paired `component.json + scene.svg` files
3. a first local extractor scaffold exists under `local_tools/component_import/scripts/extract_component_package_scene.mjs`

## Next Step

The next implementation step after this first package layer is:

1. normalize Wokwi imports into the same package contract
2. validate native exported packages automatically
3. add scene-aware package import back into `Component Lab`
