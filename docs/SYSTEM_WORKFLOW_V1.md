# AURA System Workflow V1

Date: 2026-03-14

## Purpose

This document freezes the first end-to-end workflow for the hardware-first restart.

It exists to keep AURA centered on the physical inventory-and-locate problem before expanding software scope.

## V1 Goal

V1 should prove that AURA can do one useful real-world job end to end:

1. identify an exact owned component
2. confirm quantity or fit
3. show where it physically lives
4. trigger a physical locate action

## Core Workflow

The intended system flow for AURA remains:

`intent -> inventory fit -> circuit proposal/review -> accepted part list -> physical locate`

For the first thin slice, we narrow that to:

`exact part search -> stock and location summary -> locate action -> physical retrieval`

## Thin Vertical Slice

The first slice to prove in `AURA Node Studio` is:

1. User stands near storage and uses `AURA Host`.
2. User searches for an exact part or value.
3. Host resolves the best local inventory match.
4. Host shows quantity, location, and locate availability.
5. User starts a locate session.
6. Host issues a locate command for the mapped storage target.
7. The target node highlights the real storage position.
8. User stops locate after retrieval and returns to the host home flow.

## System Surfaces

### AURA Host

- primary local interaction surface
- inventory lookup and locate trigger surface
- should remain usable even without the phone connected

### AURA Node

- physical locator endpoint
- receives a locate command from the host
- drives an LED, addressable light, buzzer, or similar indicator

### AURA Phone

- secondary richer interface
- later handles deeper search, notes, images, AI help, and build flows
- not required for the first thin slice to be valid

## Required Answers

V1 must be able to answer these questions clearly:

- Do I own this exact part or value?
- Do I own enough for the immediate need?
- Where is it physically stored?
- Can the system highlight that location right now?

## Minimal Data Needed For This Workflow

The first slice depends on a small stable contract set:

- inventory item identity
- exact variant or value
- quantity
- storage address
- mapped locate target
- locate session state

## Failure States

The host must handle these cases explicitly:

- exact part not found
- family match found but exact value not found
- quantity insufficient
- location known but no locate target is mapped
- locate target mapped but offline or unavailable

## V1 Scope Guardrails

In scope:

- exact inventory lookup
- simple inventory fit decision
- single-part locate flow
- honest system state labels

Out of scope:

- broad AI circuit generation on the host itself
- full circuit editing on the host
- advanced simulation
- complex node provisioning flows
- large phone-first UI work before contracts are frozen

## Current Repo Implication

The current `host_remote/` firmware shell should be treated as the first implementation of this thin slice, not as a separate generic menu demo.
