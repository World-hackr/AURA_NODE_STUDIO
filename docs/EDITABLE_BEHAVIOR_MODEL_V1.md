# Editable Behavior Model V1

Date: 2026-03-26

## Purpose

This document defines the first explicit runtime-state layer for AURA components.

The goal is not full simulation yet.
The goal is to stop treating behavior as vague helper logic and start describing the real editable state of a part.

## Why This Exists

The old `behaviorDraft` layer was useful for early visual experiments, but it was too generic for parts such as:

- push buttons
- potentiometers
- slide switches
- toggle switches
- servos

Those parts need a clearer contract:

- what signal they expose
- what range or states they use
- what visible target they affect
- what default state they start in

## V1 Runtime Profiles

Current explicit profiles:

- `light_output`
- `push_button`
- `potentiometer`
- `slide_switch`
- `toggle_switch`
- `servo_angle`

These are stored as machine-readable reference files under:

- `shared/behavior_models_v1/`

## Split Of Responsibility

The correct split is:

- component definition = geometry, child parts, labels, pads, and visual detail
- runtime profile = editable state meaning
- compiled runtime = deterministic exported runtime contract
  - for Wokwi-backed parts, this can target vendor element props
  - for native AURA parts, this should target named scene nodes in `scene.svg`

This keeps the product teachable and AI-friendly.

## Current Authoring Rule

When building a component in `Component Lab`:

1. finish the geometry first
2. choose the correct runtime profile
3. set value/state ranges and labels
4. let the tool derive the visual hook preview from that profile

## Current Export Shape

`aura.component_definition.v1` now supports these additional blocks:

```json
{
  "runtimeProfile": {},
  "compiledRuntime": {}
}
```

These sit beside the existing:

```json
{
  "behaviorDraft": {},
  "compiledBehavior": {}
}
```

That means V1 can move forward without breaking older definitions immediately.

## Design Decision

For now:

- `runtimeProfile` is the clearer user-facing authoring model
- `behaviorDraft` remains as the lower-level derived visual hook layer

That is intentional.
It lets the UI become easier to understand before the full simulation layer exists.

This also keeps imported Wokwi parts and native AURA parts inside one runtime model instead of splitting behavior into two separate systems.

## Next Step

The next useful move after this is:

1. add repo-backed component examples that use these profiles directly
2. validate `runtimeProfile` values automatically
3. connect circuit-side inspectors to the same explicit runtime profiles
