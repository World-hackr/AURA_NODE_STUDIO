# Normal User Product Model

Date: 2026-03-24

## Problem

`AURA Node Studio` has started to drift because it is mixing three different jobs into one mental model:

- normal user retrieval flow
- circuit planning flow
- internal component authoring flow

When those are blended together, the product becomes vague:

- normal users do not know where to start
- internal authoring tools look like primary product features
- non-deterministic ideas creep in because the surface is no longer tied to one job

## Correct Product Shape

The product should be understood as three separate surfaces with clear ownership.

### 1. AURA Host

This is the primary normal-user surface in V1.

Its job is simple:

- search owned parts
- confirm quantity
- show storage location
- trigger physical locate

This is the hardware-first front door.

### 2. AURA Phone

This is the richer secondary user surface.

Its later job is:

- deeper search
- saved builds and required-part lists
- notes, images, and richer review
- sync with host and inventory data

It is important, but it is not the first proof point.

### 3. AURA Studio

This is not the primary end-user product.

It is an internal or advanced tool for:

- deterministic circuit assembly
- reusable component definition
- package and pin review
- exportable part/circuit data

Studio should support the system, not redefine the whole product around a generic canvas.

## User Types

There are three real user types and each needs a different surface.

### Operator

The operator wants one answer quickly:

- do I have the part
- where is it
- can the system show it now

This user starts on `AURA Host`, not in `studio_ui/`.

### Planner

The planner wants to review a circuit or parts list against owned inventory.

This user can use the phone later, and may use the deterministic circuit stage if that stage stays narrow and data-first.

### Author

The author defines reusable parts, package geometry, pin metadata, and deterministic behaviors.

This is an advanced workflow and should be labeled clearly as authoring, not as the default product.

## Studio Rules

`studio_ui/` should stay, but with stricter scope.

### Circuit Studio

This is the primary browser-side workspace.

It should do only a few deterministic jobs:

- place known parts
- connect known pins
- inspect exact geometry and nets
- export canonical circuit data

It should not pretend to be an open-ended AI ideation canvas.

### Component Lab

This is the internal authoring workspace.

It should do only authoring jobs:

- start from a known package family
- adjust exact geometry
- define reusable part drafts
- convert package-backed structure into editable deterministic layers when necessary

It should not be framed as the main surface a normal user sees first.

## What Should Be Cut Or Contained

The following patterns are the main source of drift and should be treated as suspect:

- vague `creator` or `editor` language without role context
- features that do not map to a real user workflow
- behavior systems that are not tied to stable data contracts
- generic sketch-tool expansion when it does not improve deterministic reusable part authoring
- any framing that makes `studio_ui` look like the primary user-facing AURA product

## Repo Implications

The repo should present the product in this order:

1. `host_remote/` as the active V1 product surface
2. `docs/` as the frozen workflow and contract direction
3. `studio_ui/` as a supporting deterministic browser tool
4. `phone_ui/` and `shared/` as planned next layers

## Recommended Next Build Order

1. Freeze `AURA Host` around exact search, stock summary, and locate.
2. Define shared contracts for inventory item, storage location, locate target, and session state.
3. Keep `studio_ui/` focused on deterministic circuit data and reusable component authoring only.
4. Build the first real phone-side surface after the contracts stop drifting.

## Decision

The project should stop acting like one giant undefined app.

The correct model is:

- `AURA Host` for normal users now
- `AURA Phone` for richer user workflows later
- `AURA Studio` for deterministic circuit and component authoring

That separation is what keeps the product understandable and prevents another discard cycle.
