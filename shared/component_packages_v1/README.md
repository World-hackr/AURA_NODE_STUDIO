# Component Packages V1

This folder is reserved for packaged reusable AURA components that combine:

- semantic truth
- visual truth

The target package shape is frozen in:

- `docs/AURA_COMPONENT_PACKAGE_V1.md`

## Target Layout

Minimum package layout:

```text
component_name/
  component.json
  scene.svg
```

## Current Status

The current repo still keeps most semantic examples under:

- `shared/component_definitions_v1/`

Current starter files:

- `component.package.template.json`
- `package_index.json`
- `scene.template.svg`

That folder remains the active semantic library seed.

This `component_packages_v1/` folder exists to make the future package direction explicit and discoverable for fresh sessions.

## Rule

Do not create ad hoc package formats here.

When this folder begins receiving real component packages, they should follow the contract in:

- `docs/AURA_COMPONENT_PACKAGE_V1.md`
