# Data Contracts V1

Date: 2026-03-24

## Purpose

This document freezes the minimum shared contracts needed for the hardware-first AURA restart.

These contracts exist so:

- `AURA Host` can stay honest and deterministic
- `AURA Phone` can be added later without redefining core terms
- `AURA Studio` can export or reference stable product data instead of inventing parallel state

## Contract Priority

The first thin slice does not need every future schema.

The minimum stable contracts are:

1. `InventoryItem`
2. `StorageLocation`
3. `LocateTarget`
4. `LocateSession`
5. `PartLookupResult`

These are the contracts that support the V1 workflow:

`exact part search -> stock and location summary -> locate action -> physical retrieval`

## 1. InventoryItem

This is the source-of-truth record for one exact owned part variant.

Required fields:

- `id`
- `part_number`
- `display_name`
- `category`
- `value_label`
- `package_key`
- `quantity_on_hand`
- `storage_location_id`
- `locate_target_id`
- `status`

Suggested shape:

```json
{
  "id": "inv_res_220r_0603",
  "part_number": "RC0603FR-07220RL",
  "display_name": "Resistor 220R 0603 1%",
  "category": "resistor",
  "value_label": "220R",
  "package_key": "R0603",
  "quantity_on_hand": 148,
  "storage_location_id": "drawer_b2_cell_04",
  "locate_target_id": "node_drawer_b2",
  "status": "active"
}
```

Notes:

- `InventoryItem` is an exact owned thing, not a fuzzy family idea.
- `quantity_on_hand` is integer inventory, not an estimate.
- `status` should stay simple in V1: `active`, `empty`, `archived`.

## 2. StorageLocation

This defines the physical storage address shown to the user.

Required fields:

- `id`
- `label`
- `zone`
- `container`
- `slot`
- `human_path`

Suggested shape:

```json
{
  "id": "drawer_b2_cell_04",
  "label": "Drawer B2 / Cell 04",
  "zone": "Shelf A",
  "container": "Drawer B2",
  "slot": "Cell 04",
  "human_path": "Shelf A > Drawer B2 > Cell 04"
}
```

Notes:

- This contract answers `where is it physically stored?`
- `human_path` is what host and phone should show directly.

## 3. LocateTarget

This maps inventory storage to a real physical locator endpoint.

Required fields:

- `id`
- `location_id`
- `node_id`
- `channel`
- `capability`
- `online`

Suggested shape:

```json
{
  "id": "node_drawer_b2",
  "location_id": "drawer_b2_cell_04",
  "node_id": "locator_017",
  "channel": 17,
  "capability": "rgb_blink",
  "online": true
}
```

Notes:

- `location_id` links the physical storage address to the hardware node.
- `online` must reflect current ability honestly. No guessing.

## 4. LocateSession

This describes the current active or recent locate action.

Required fields:

- `id`
- `inventory_item_id`
- `locate_target_id`
- `state`
- `started_at`

Suggested shape:

```json
{
  "id": "locate_20260324_001",
  "inventory_item_id": "inv_res_220r_0603",
  "locate_target_id": "node_drawer_b2",
  "state": "active",
  "started_at": "2026-03-24T11:20:00Z"
}
```

Optional later fields:

- `stopped_at`
- `requested_by`
- `stop_reason`

V1 states:

- `idle`
- `active`
- `completed`
- `failed`

## 5. PartLookupResult

This is the deterministic answer returned to host or phone after a search.

Required fields:

- `query`
- `match_state`
- `inventory_item_id`
- `quantity_on_hand`
- `storage_location_id`
- `locate_target_id`

Suggested shape:

```json
{
  "query": "220r",
  "match_state": "exact",
  "inventory_item_id": "inv_res_220r_0603",
  "quantity_on_hand": 148,
  "storage_location_id": "drawer_b2_cell_04",
  "locate_target_id": "node_drawer_b2"
}
```

V1 `match_state` values:

- `exact`
- `family_only`
- `not_found`

## Failure Rules

The system must keep these failure states explicit:

- exact part not found
- family match found but exact value not found
- part found but quantity insufficient
- location known but no locate target mapped
- locate target mapped but offline

Those should be represented by contract data, not inferred from UI wording.

## Surface Responsibilities

### AURA Host

Reads:

- `PartLookupResult`
- `InventoryItem`
- `StorageLocation`
- `LocateTarget`
- `LocateSession`

Writes:

- `LocateSession`

### AURA Phone

Reads:

- all V1 contracts

Writes later:

- richer inventory edits
- notes
- images

### AURA Studio

V1 studio work should not become the source of truth for inventory and locate state.

Studio may export deterministic circuit/component data, but inventory and locate remain defined by the contracts above.

## Relationship To Circuit Manifest

The existing `studio_ui` manifest is a separate contract:

- it describes deterministic circuit placement and pin connectivity
- it does not replace `InventoryItem`, `StorageLocation`, or `LocateSession`

This distinction matters because AURA is a cyber-physical inventory-and-locate system first.

## Decision

These five contracts are the minimum stable vocabulary for the restart.

If a new feature cannot explain itself using these contracts, it is probably too early or too vague for V1.
