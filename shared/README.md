# Shared

This folder is reserved for contracts shared across firmware, phone UI, and supporting studio tooling.

The current source-of-truth planning doc for those contracts is:

- `docs/DATA_CONTRACTS_V1.md`

The current machine-readable contract artifacts live in:

- `shared/contracts_v1/`
- `shared/component_definitions_v1/`
- `shared/component_packages_v1/`
- `shared/component_templates_v1/`
- `shared/behavior_models_v1/`
- `shared/wokwi_models_v1/`

Examples:
- inventory item schema
- storage location schema
- host-to-node command schema
- part lookup result shape
- build-required-parts payloads

The first frozen V1 contract set is:

- `InventoryItem`
- `StorageLocation`
- `LocateTarget`
- `LocateSession`
- `PartLookupResult`

The first machine-readable schemas now exist under `shared/contracts_v1/`. Add stricter validation or code generation only after host and phone begin consuming these exact shapes directly.

Repo-backed deterministic component-definition examples and starter artifacts now live under `shared/component_definitions_v1/`. Treat that folder as the seed of the reviewed reusable-part library for `Component Lab`, especially for imported and corrected parts that have been normalized into AURA-owned definitions.

The next package layer now has an explicit home under `shared/component_packages_v1/`. Treat that folder as the home for paired `component.json + scene.svg` reusable component packages and starter package templates.

The first package-family template layer now lives under `shared/component_templates_v1/`. Treat that folder as the bridge between vendor reference sources and final AURA component definitions.

The first concrete cross-source family mapping also now exists under `shared/component_templates_v1/vendor_reference_index.json`.

The first explicit runtime-state profile set now lives under `shared/behavior_models_v1/`. Treat that folder as the bridge between visual components and future editable simulation/runtime behavior.

The first machine-readable Wokwi-backed visual bridge now lives under `shared/wokwi_models_v1/`. Treat that folder as the deterministic source for Wokwi tag names, vendor pin order reference, render sizing, and runtime-to-element bindings used by the direct-import Wokwi trial in `AURA Studio`.
