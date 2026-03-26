# Component Lab Import And Correction Rules

Date: 2026-03-24

## Purpose

These rules define how `Component Lab` should feel when it is used as an import, correction, and packaging workspace for reusable components.

The goal is not a flashy drawing toy.

The goal is a deterministic edit-and-package system that:

- students can understand quickly
- children can read without fear or clutter
- professionals can trust for exact reconstruction
- future AI systems can generate through JSON without guesswork

## Product Stance

`Component Lab` is a flat 2D correction tool with high contrast and exact structure.

That means:

- black, white, and restrained grays are the default visual language
- parts should read clearly at a glance
- detail is allowed, but perspective is not
- depth cues may come from thin highlight or shadow layers, not fake 3D rendering
- every visible decision should still serialize into a stable definition

## Audience Rules

### Students

- they need clear grouping and obvious labels
- they should not be forced to understand hidden internal state
- examples must be copyable and easy to mutate

### Children and beginners

- parts should feel legible before they feel powerful
- symbols, labels, and outline contrast matter more than feature density
- the default workspace should not look intimidating

### Professionals

- package geometry must stay stable
- detail should help recognition, not add visual noise
- JSON export must be trustworthy enough for review and automation

## Visual Rules

- Stay 2D.
- Use pure outline, fill, label, and shadow logic.
- Never use perspective, bevel-heavy surfaces, or photo-like rendering.
- Use subtle shadow only to separate stacked features or housing cuts.
- Keep pin rows, ports, switches, and indicators readable in monochrome.
- Prefer one strong silhouette plus clear internal labels over decorative texture.

## Composition Rules

- Import a real source when possible.
- Start from a known package when no good source exists or when a clean AURA-native base is genuinely faster.
- Use `blank_board` only when the component is truly a board-style aggregate.
- Use child parts for onboard LEDs, headers, ICs, regulators, connectors, and buttons.
- Use shape layers for silk labels, slot outlines, cutouts, markers, shields, and panel graphics.
- Save persistent dimensions only for relationships contributors must preserve.
- Treat pin correction, naming cleanup, and runtime cleanup as first-class work, not as optional polish.

## Determinism Rules

- A component must be reconstructable from JSON alone.
- No hidden creator-only state should be required to reopen or edit a definition.
- `behaviorDraft` must describe the editable intent.
- `compiledBehavior` must describe the deterministic exported behavior output.
- File names should use lowercase snake case and end with `.component.json`.

## Definition Of Done

A reusable component is ready when:

- its silhouette is recognizable in black and white
- its internal detail improves recognition instead of cluttering the part
- imported or vendor-derived pins have been checked and corrected where needed
- the JSON round-trips through `Component Lab`
- the behavior block is either correct or intentionally minimal
- another contributor can open the definition and understand the structure quickly

## Current Repo Path

Shared component-definition artifacts now live under:

- `shared/component_definitions_v1/`

That folder should grow into the reviewed reusable-part library for early contributors.
