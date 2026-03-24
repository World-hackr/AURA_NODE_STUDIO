# AURA Host V1

Date: 2026-03-14

## Purpose

`AURA Host` is the first concrete subsystem for the final restart.

Its V1 job is to give the user a local hardware interface that can:

- search owned parts
- review simple stock and fit state
- start and stop locate sessions
- stay useful before the phone and node stack are fully expanded

## Host Role In The System

The host is:

- the physical front door to the AURA system
- the source of truth for the currently selected part and active locate session
- the bridge between inventory data, physical storage addresses, and locator nodes

The host is not:

- a full circuit editor
- a simulator
- a replacement for the future phone surface

## V1 Interaction Model

Current input method:

- serial monitor commands

Future physical input target:

- small display
- directional input or encoder
- one select action
- one back or home action

The serial shell exists so the navigation model can be frozen before a display library is chosen.

## Host V1 Screen Set

V1 keeps four primary surfaces:

- `Home`
- `Search`
- `Inventory`
- `Locate`

## Home Screen

Purpose:

- act as the stable landing surface
- show the fastest paths into search, stock review, and locate

Primary actions:

- search for a part
- review inventory state
- jump to active or last locate target

## Search Screen

Purpose:

- find one exact component or value quickly

Data shown:

- current query
- resolved match name
- quantity summary
- storage address
- locate availability

Primary actions:

- change query
- confirm the current match
- move to locate for the selected match
- return home

## Inventory Screen

Purpose:

- answer whether the current need can be satisfied from owned stock

Data shown:

- current part or need summary
- stock fit state
- quantity summary
- optional low-stock warning

Primary actions:

- toggle between fit states during the serial-shell phase
- move to locate when a valid part is selected
- return home

## Locate Screen

Purpose:

- run and control the active physical locate session

Data shown:

- selected part
- storage address
- locate target or node identity
- active or idle status

Primary actions:

- start locate
- stop locate
- return to search
- return home

## Navigation Rules

- `Home` is the stable reset point.
- `Search` chooses the current part context.
- `Inventory` confirms stock or fit status for that context.
- `Locate` acts on the currently selected part and location.
- If part context is lost, the system should fall back to `Home` instead of guessing.

## Thin Slice Example

Example V1 flow:

1. User opens `Home`.
2. User enters `Search`.
3. Host resolves `resistor_220r`.
4. Host shows quantity and location such as `Drawer B2`.
5. User opens `Locate`.
6. Host starts a locate session for the mapped target.
7. User stops the locate session after retrieval.

## Firmware State Implications

The host firmware should keep a small state model for:

- current screen
- current selection
- current part query
- current resolved inventory item
- stock fit state
- locate session state

## Current Scaffold Mapping

The existing firmware shell already matches this structure at a coarse level:

- `src/main.cpp` owns the loop and render cadence
- `app_state.*` owns screen and UI state
- `input_actions.*` owns input-to-action mapping
- `ui_screen.*` owns screen rendering

The next firmware iteration should rename placeholder demo state so it reflects real host concepts instead of generic toggles.
