# Component Definition V1

Date: 2026-03-24

## Purpose

This document defines the deterministic component editing format used by `Component Lab`.

The goal is simple:

- users can import or build a component visually
- export it as JSON
- edit the JSON directly if needed
- import it back without hidden creator-only state

The current package direction adds an explicit visual companion:

- `component.json` for semantic truth
- `scene.svg` for visual truth

This document focuses on the JSON half of that package.

This is the bridge between deterministic source correction and future AI-assisted component generation.

## Schema

Current schema id:

- `aura.component_definition.v1`

This format is intentionally editor-focused.

It captures:

- component name
- base package choice or blank board
- child parts
- custom 2D detail layers
- persistent sketch dimensions
- one explicit runtime profile and its compiled runtime output
- one behavior draft and its compiled behavior entry

It is not intended to be the only final artifact forever.
It is the semantic companion of the future packaged scene contract described in:

- `docs/AURA_COMPONENT_PACKAGE_V1.md`

It does not try to capture temporary UI state such as:

- panel open/closed state
- selection history
- current viewport
- measurement gesture state
- transient hidden-layer experiments

## Shape

High-level structure:

```json
{
  "schema": "aura.component_definition.v1",
  "metadata": {
    "name": "Example Component",
    "description": "Optional human description",
    "tags": ["example", "module"]
  },
  "base": {
    "kind": "library_item"
  },
  "children": [],
  "shapeLayers": [],
  "persistentDimensions": [],
  "runtimeProfile": {},
  "compiledRuntime": {},
  "behaviorDraft": {},
  "compiledBehavior": {}
}
```

## Base Modes

The `base` block has three deterministic modes.

### 1. `none`

Use when the component is made entirely from custom layers and child parts.

### 2. `blank_board`

Use when the component starts from a plain board-like plate.

This is useful for:

- dev boards
- modules
- adapters
- custom boards with onboard detail

### 3. `library_item`

Use when the component starts from a known package in the shared library.

This is useful for:

- IC packages
- headers
- LEDs
- connectors
- resistors, capacitors, and other small parts

## Edit Rule

The correct mental model is:

- import a real source when possible
- start from a known package when no good source exists
- use child parts for onboard details
- use shape layers for labels, outlines, notches, silkscreen, pads, and simple visual detail
- use behavior only after geometry and pin truth are correct

This keeps the system deterministic and teachable.

## Why This Matters

This format is one of the key product foundations.

If component editing is deterministic:

- users around the world can contribute reusable components
- the library can expand without hand-coded one-off logic
- AI systems can generate component definitions as JSON
- the UI can reconstruct components exactly from text

That is the path toward AI-generated circuits that are still inspectable and controlled.

## Current UI Support

`Component Lab` now supports:

- loading Wokwi-backed sources onto the stage for correction
- importing standalone SVG files into editable SVG-backed shape layers
- exploding imported SVG-backed layers into independent SVG sublayers for deeper editing
- loading the current component definition into a JSON editor
- applying edited JSON back into the editing workspace
- copying exported JSON
- exporting the definition as a `.component.json` file
- importing a saved definition file back into the workspace
- loading built-in example definitions
- previewing the compiled behavior entry beside the raw behavior draft
- editing the first explicit runtime profiles for light, push button, potentiometer, slide switch, toggle switch, and servo parts

Repo-backed starter artifacts now also exist under:

- `shared/component_definitions_v1/`
- `shared/component_definitions_v1/examples/`
- `shared/behavior_models_v1/`

## Current Limit

V1 still supports only one active behavior draft per component definition.

That is acceptable for now because the main product need is a stable deterministic editing contract, not a full behavior orchestration system.

## Next Step

Now that file import/export and repo-backed examples exist, the next useful step is:

1. validate definition files automatically during CI or local checks
2. validate the paired package export against `scene.svg`
3. connect this format to the shared package and extractor path
