# Component Definitions V1

This folder holds repo-native component-definition artifacts for `Component Lab`.

These files are the first shared source of truth for contributor-authored reusable parts.
They are the semantic half of the future packaged component contract.

## Purpose

Use this folder when a component should exist outside one browser session:

- example parts for new contributors
- starter templates
- future reviewed library submissions
- machine-readable inputs for validation or ingestion

The current package direction is:

- semantic truth in `component.json`
- visual truth in `scene.svg`

Until package export is fully implemented, this folder remains the active semantic source area.

## Current Contents

- `component_definition.template.json` - minimal valid starter definition
- `component_definition_index.json` - index of template and shipped examples
- `examples/*.component.json` - real example component definitions

Current generated examples:

- `examples/resistor_0603.component.json` - first KiCad-backed passive example
- `examples/capacitor_0603.component.json` - first KiCad-backed passive example

Generation helper:

- `local_tools/component_import/scripts/generate_first_passives_from_kicad.mjs`

## Contribution Rules

- Keep the schema as `aura.component_definition.v1`.
- Definitions must round-trip through `Component Lab` without hidden repair steps.
- Stay flat, deterministic, and 2D.
- Restrained color is allowed when it is semantically useful or when preserving imported Wokwi part appearance.
- Use child parts for real onboard component detail.
- Use shape layers for silkscreen, outline, marker, pad, or housing detail.
- Keep `runtimeProfile` aligned with `compiledRuntime`.
- Keep `compiledBehavior` aligned with `behaviorDraft`.

## Naming

Use lowercase snake case for file names and end them with `.component.json`.
