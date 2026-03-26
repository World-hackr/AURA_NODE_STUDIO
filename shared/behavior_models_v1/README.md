# Behavior Models V1

This folder holds the first explicit runtime-state profiles for AURA components.

These files do not replace visual geometry.
They describe the editable runtime meaning of a component after its geometry is already correct.

## Purpose

Use these profiles when a component needs a clear state model such as:

- brightness-driven output
- momentary push input
- analog rotary input
- binary switch input
- angle-driven actuator output

## Current Profiles

- `light_output.profile.json`
- `push_button.profile.json`
- `potentiometer.profile.json`
- `slide_switch.profile.json`
- `toggle_switch.profile.json`
- `servo_angle.profile.json`

## Rule

Geometry still lives in component definitions.
Runtime profiles describe only:

- signal names
- state/value range
- target layer
- motion or display range
- default state

They should stay deterministic and easy for AI or validation tools to emit later.
