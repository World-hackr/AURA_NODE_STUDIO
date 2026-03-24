# Shared

This folder is reserved for contracts shared across firmware, phone UI, and supporting studio tooling.

The current source-of-truth planning doc for those contracts is:

- `docs/DATA_CONTRACTS_V1.md`

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

Machine-readable shared contract files can be added here later once the V1 shapes stop moving.
