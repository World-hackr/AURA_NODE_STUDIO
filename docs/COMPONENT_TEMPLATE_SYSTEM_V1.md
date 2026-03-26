# Component Template System V1

Date: 2026-03-26

## Purpose

This document defines the first AURA component-template layer.

Templates are not final components.
They are reusable package families that give the UI and importer a stable starting structure.

The first goal is not to cover everything.
The first goal is to make a small, correct, reusable package set that can later compose real boards.

## First Template Families

The first template set is:

- `resistor_smd`
- `capacitor_smd`
- `ic_package`
- `pin_header`
- `usb_connector`

These should be enough to prove:

- Wokwi visual reference intake
- KiCad geometry intake
- repeatable package family behavior
- AURA definition output

## Template Rule

Each template must define:

1. what inputs it needs
2. what can repeat or expand
3. what the renderer auto-generates
4. what the author can still override

## Input Split

### Wokwi-informed visual inputs

Use these to guide:

- silhouette style
- 2D detail treatment
- stateful visual hooks where relevant
- restrained accent usage

### KiCad-informed geometry inputs

Use these to guide:

- body size
- pad position
- pad count
- pitch
- connector spacing
- package family dimensions

### AURA-owned template outputs

Each template must output AURA-owned data:

- package family id
- package class
- base dimensions
- pins or pads
- repeat rules
- style tags
- optional runtime hook surface

## Repeat Rules

Templates should absorb repetition whenever possible.

Important repeatable families:

- IC families
- headers

Examples:

- `SOIC-8`, `SOIC-14`, `SOIC-16` should come from one family
- `1x4`, `1x8`, `2x10` headers should come from one family

## Renderer Rule

The template should not ask the user to manually draw finish details every time.

The renderer should derive:

- body contrast
- lead/pad contrast
- highlight/shadow bands
- label styling
- optional restrained semantic accents

## Template Scope V1

V1 templates should focus on:

- package truth
- visual truth
- repeatability

They should not try to solve full simulation behavior yet.

## Immediate Next Step

Back this document with machine-readable template artifacts under:

- `shared/component_templates_v1/`
