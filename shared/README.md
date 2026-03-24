# Shared

This folder is reserved for contracts shared across firmware, phone UI, and supporting studio tooling.

The current source-of-truth planning doc for those contracts is:

- `docs/DATA_CONTRACTS_V1.md`

The current machine-readable contract artifacts live in:

- `shared/contracts_v1/`
- `shared/component_definitions_v1/`

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

Repo-backed deterministic component-definition examples and starter artifacts now live under `shared/component_definitions_v1/`. Treat that folder as the seed of the reusable part-definition library for `Component Lab`.
