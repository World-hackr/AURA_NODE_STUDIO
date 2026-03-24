# Component Definitions V1

This folder holds repo-native component-definition artifacts for `Component Lab`.

These files are the first shared source of truth for contributor-authored reusable parts.

## Purpose

Use this folder when a component should exist outside one browser session:

- example parts for new contributors
- starter templates
- future reviewed library submissions
- machine-readable inputs for validation or ingestion

## Current Contents

- `component_definition.template.json` - minimal valid starter definition
- `component_definition_index.json` - index of template and shipped examples
- `examples/*.component.json` - real example component definitions

## Contribution Rules

- Keep the schema as `aura.component_definition.v1`.
- Definitions must round-trip through `Component Lab` without hidden repair steps.
- Stay black-and-white, 2D, and deterministic.
- Use child parts for real onboard component detail.
- Use shape layers for silkscreen, outline, marker, pad, or housing detail.
- Keep `compiledBehavior` aligned with `behaviorDraft`.

## Naming

Use lowercase snake case for file names and end them with `.component.json`.
