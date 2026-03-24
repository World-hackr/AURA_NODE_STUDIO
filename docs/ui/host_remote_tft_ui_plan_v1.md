# AURA Host Remote TFT UI Plan V1

Date: 2026-03-18

This plan is for the current `1.8 inch 160x128` color TFT only.
It is designed for joystick control and fast operational use.

## 1) Screen Budget (Use Full Display)

Canvas: `160 x 128` landscape.

- `Top Status Bar` (`y=0..11`, 12 px)
  - RF state icon + text
  - Phone/BLE icon + text
  - Battery icon + percent
- `Title Bar` (`y=12..27`, 16 px)
  - Screen icon
  - Screen title
- `Detail Card` (`y=28..55`, 28 px)
  - Selected item summary
  - Current state/value line
- `List Zone` (`y=56..115`, 60 px)
  - `5 rows x 12 px` each
  - highlighted selected row
- `Footer Hint` (`y=116..127`, 12 px)
  - compact joystick hint

This layout fully uses the display while keeping text legible.

## 2) Visual Direction

Feature-phone style, high utility, no wasted blocks.

- Use color for state, not decoration.
- Keep row structure stable across all screens.
- Keep each row short and scannable.
- Use consistent icons so users learn quickly.

### Color Roles

- `Background`: deep dark blue/gray
- `Surface`: medium dark panel
- `Text`: near-white
- `Muted`: gray-blue
- `Accent`: cyan (navigation/highlight)
- `Good`: green
- `Warn`: amber
- `Fail`: red

## 3) Icon Set (Small, Reusable)

Use compact 10x10 or 12x12 bitmap icons.

- `Home`
- `Locate`
- `Inventory`
- `Node`
- `Setup`
- `Radio`
- `Phone/BLE`
- `Battery`
- `RF`
- `Back`
- `Confirm`
- `Warning`

All top-level screens must show one icon in the title bar.

## 4) Control Rules

- `Up/Down`: move row selection
- `Right or Press`: open/confirm selected row
- `Left`: back
- `Long Press`: jump Home

No dead-end screen allowed. Every screen must support `Left -> Back`.

## 5) Top-Level Screens

Home menu rows:

- `Locate Parts`
- `Inventory`
- `Nodes`
- `Setup`
- `Radio Check`

Detail card changes with selected row so user sees intent before entering.

## 6) Screen-by-Screen Content

### Home

- Status: `RF`, `BLE`, `BAT`
- Title: `HOME`
- Detail card: context for selected row
- List: 5 top-level actions

### Locate List

- Title: `LOCATE`
- Detail card:
  - selected part name
  - location + mapped node
- List:
  - recent/favorite/searchable local items (5 visible rows)

### Locate Session

- Title: `ACTIVE LOCATE`
- Detail card:
  - selected part + location
  - state (`Sent`, `Ack`, `Confirmed`, `Retrying`, `Failed`)
- List:
  - `Start Locate`
  - `Retry`
  - `Stop`
  - `Node Detail`
  - `Back`

### Inventory List

- Title: `INVENTORY`
- Detail card:
  - selected item
  - current qty and required qty status
- List:
  - local inventory items

### Inventory Adjust

- Title: `ADJUST QTY`
- Detail card:
  - current qty
  - pending change
  - resulting qty preview
- List:
  - `-5`
  - `-1`
  - `+1`
  - `+5`
  - `Save`

### Nodes List

- Title: `NODES`
- Detail card:
  - selected node id
  - online/offline + last seen
- List:
  - node entries with status icon

### Node Detail

- Title: `NODE DETAIL`
- Detail card:
  - node zone
  - outputs + health
- List:
  - `Test Node`
  - `Test Output`
  - `Back`

### Setup

- Title: `SETUP`
- Detail card:
  - phone link status
  - cache/sync status
- List:
  - `Phone Link`
  - `Sync`
  - `Display`
  - `Back Home`
  - `Expert`

### Radio Check

- Title: `RADIO CHECK`
- Detail card:
  - overall pass/fail
  - quick SPI/REG/CE summary
- List:
  - `Run Self Test`
  - `Clear Result`
  - `Back`

## 7) Clear Arrow Flow (Page-to-Page)

### Primary Navigation

- `Home` ->(Select Locate Parts)-> `Locate List`
- `Home` ->(Select Inventory)-> `Inventory List`
- `Home` ->(Select Nodes)-> `Nodes List`
- `Home` ->(Select Setup)-> `Setup`
- `Home` ->(Select Radio Check)-> `Radio Check`

### Locate Flow

- `Locate List` ->(Select Item)-> `Locate Session`
- `Locate Session` ->(Select Node Detail)-> `Node Detail`
- `Locate Session` ->(Left)-> `Locate List`
- `Locate List` ->(Left)-> `Home`

### Inventory Flow

- `Inventory List` ->(Select Item)-> `Inventory Adjust`
- `Inventory Adjust` ->(Save)-> `Inventory List`
- `Inventory Adjust` ->(Left)-> `Inventory List`
- `Inventory List` ->(Left)-> `Home`

### Node Flow

- `Nodes List` ->(Select Node)-> `Node Detail`
- `Node Detail` ->(Left)-> `Nodes List`
- `Nodes List` ->(Left)-> `Home`

### Setup/Radio Flow

- `Setup` ->(Select Radio)-> `Radio Check`
- `Radio Check` ->(Back)-> `Setup`
- `Setup` ->(Left)-> `Home`

### Global Escape

- `Any Screen` ->(Long Press)-> `Home`

## 8) Micro-UX Rules

- Highlight row instantly on move.
- Keep one-line row labels; truncate hard if needed.
- State colors must be deterministic:
  - `Good=Green`
  - `Warn=Amber`
  - `Fail=Red`
- Avoid modal popups unless required.
- Show "next action" in footer when selection changes.

## 9) What Not To Put On 1.8" Screen

- Long text paragraphs
- Keyboard/text entry
- Dense settings forms
- Multi-step schema editors

Those stay on smartphone.

## 10) Implementation Order

1. Freeze shared shell (`status/title/detail/list/footer`) for all screens.
2. Replace each current screen with the fixed row-based format.
3. Add small icon bitmaps and icon mapping table.
4. Add per-screen arrow flow checks (`back`, `home`, `next`) in interaction tests.
5. Tune colors and spacing on real hardware for readability.
