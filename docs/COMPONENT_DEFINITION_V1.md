# Component Definition V1

Date: 2026-03-24

## Purpose

This document defines the deterministic component-authoring format used by `Component Lab`.

The goal is simple:

- users can build a component visually
- export it as JSON
- edit the JSON directly if needed
- import it back without hidden creator-only state

This is the bridge between manual authoring and future AI-assisted component generation.

## Schema

Current schema id:

- `aura.component_definition.v1`

This format is intentionally authoring-focused.

It captures:

- component name
- base package choice or blank board
- child parts
- custom 2D detail layers
- persistent sketch dimensions
- one behavior draft and its compiled behavior entry

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

## Authoring Rule

The correct mental model is:

- start from a known package when possible
- use child parts for onboard details
- use shape layers for labels, outlines, notches, silkscreen, pads, and simple visual detail
- use behavior only after geometry is correct

This keeps the system deterministic and teachable.

## Why This Matters

This format is one of the key product foundations.

If component authoring is deterministic:

- users around the world can contribute reusable components
- the library can expand without hand-coded one-off logic
- AI systems can generate component definitions as JSON
- the UI can reconstruct components exactly from text

That is the path toward AI-generated circuits that are still inspectable and controlled.

## Current UI Support

`Component Lab` now supports:

- loading the current component definition into a JSON editor
- applying edited JSON back into the authoring workspace
- copying exported JSON
- exporting the definition as a `.component.json` file
- importing a saved definition file back into the workspace
- loading built-in example definitions
- previewing the compiled behavior entry beside the raw behavior draft

Repo-backed starter artifacts now also exist under:

- `shared/component_definitions_v1/`
- `shared/component_definitions_v1/examples/`

## Current Limit

V1 still supports only one active behavior draft per component definition.

That is acceptable for now because the main product need is a stable deterministic authoring contract, not a full behavior orchestration system.

## Next Step

Now that file import/export and repo-backed examples exist, the next useful step is:

1. validate definition files automatically during CI or local checks
2. add reviewed contributor submissions under `shared/component_definitions_v1/`
3. connect this format to a future shared library ingestion path
