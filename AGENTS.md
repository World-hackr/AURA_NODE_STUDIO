# AURA Node Studio Agent Instructions

Updated: 2026-03-26

## Read Order

Before doing substantial work in this folder, read these files in order:

1. `README.md`
2. `WORKSPACE_GUIDE.md`
3. `workspace_index/README.md`
4. `AI_CONTINUITY_LOG.md`

Then read the most relevant surface-specific readme for the task:

- `host_remote/README.md`
- `studio_ui/README.md`
- `local_tools/README.md`
- `shared/README.md`
- `docs/README.md`

## Project Identity

`AURA Node Studio` is the clean restart workspace for the hardware-first version of AURA.

AURA is a cyber-physical electronics system, not just a circuit editor.
The full product combines:

- physical component storage
- host hardware
- locator nodes
- inventory intelligence
- phone/software support
- deterministic circuit assistance
- reusable component and board definitions

Do not collapse the repo back into "just a UI project".

## Product Surfaces

Read the workspace as three product surfaces plus shared support layers:

- `AURA Host`
  The first normal-user proof point. This is the hardware-first ESP32 host interface.
- `AURA Studio`
  The advanced browser tool for deterministic circuit editing and component import/correction.
- `AURA Phone`
  The future companion surface for deeper search and workflow support.
- `shared/` and `docs/`
  Shared schemas, component-definition assets, and product/system documentation.

Current practical priority:

1. `AURA Host`
2. `AURA Studio` as the deterministic import/correction environment
3. `AURA Phone` later

## Workspace Map

The root is intentionally structured as a small monorepo.
Use these root folders as the source of truth:

- `host_remote/`
  Active PlatformIO firmware project for the host hardware.
- `studio_ui/`
  Active browser-based circuit editor and component lab.
- `local_tools/`
  Reusable diagnostics, board helpers, and machine-side utilities.
- `shared/`
  Machine-readable contracts and reusable component-definition artifacts.
- `docs/`
  Product/system docs, workflow docs, authoring rules, and workspace audits.
- `vendor_reference/`
  Offline Wokwi and KiCad reference repos, plus cached public example-project references.
- `phone_ui/`
  Reserved but currently light.
- `AURA _report/`
  Archive/reference only. Do not treat it as the active product source.

Use these root guide files when orienting yourself:

- `WORKSPACE_GUIDE.md`
- `workspace_index/PRODUCTS.md`
- `workspace_index/TOOLS.md`
- `workspace_index/DOCS_AND_SHARED.md`
- `workspace_index/LOCAL_STATE_AND_ARCHIVE.md`
- `workspace_index/VENDOR_REFERENCES.md`

## Current Design Direction

The current product/design direction is:

- hardware-first
- deterministic
- restrained and readable
- black-first visual language with semantic color used sparingly
- component-first import/correction instead of tool-first speculation

For `AURA Studio`, the current UI direction is:

- optimize for normal users first, not developer explanation
- prioritize library, stage, and editing controls over helper text
- keep explanations compact or on hover where possible
- preserve room at the top for future tools instead of filling it with static guidance
- use semantic color only for meaning:
  - danger/destructive
  - success/apply/export
  - selected/accent states when genuinely useful

The current component/render direction is now slightly more specific:

- use Wokwi directly where vendor parts already solve the visual/runtime problem well
- keep native AURA parts deterministic and editable
- converge both imported and native parts into one AURA-owned package model

## Current Component Strategy

The current system direction for parts and boards is:

- build real visual components first
- use those real targets to drive tool design
- do not design complex import/correction systems in abstraction before real component work exposes the repeated needs

The current component model is intentionally layered:

1. visual truth
   Components and boards can be built from real visible child parts, including passives, chips, connectors, crystals, regulators, and board-level details.
2. pin truth
   Pins/connectors can be defined where needed, but are not forced on every child part.
3. behavior truth
   Behavior is optional and should only be defined when the author explicitly wants it.

Important rule:

- visual child parts may be purely visual by default inside `Component Lab`
- behavior must not be forced just because something exists visually

## Rendering Direction For Components

The visual standard for future component work is:

- primarily restrained 2D rendering with deterministic structure
- detail through silhouette, line weight, spacing, markings, pads, pins, labels, and layering
- no fake 3D rendering
- subtle 2D highlight/shadow bands are acceptable if they remain flat
- restrained color may be used where it improves meaning or preserves a strong imported vendor look, such as LED lenses, board substrate hints, polarity, warnings, or action semantics

Critical rule:

- users should not manually author polish details like shadow bands or tint layers for every part
- the system should eventually derive those from component type/style rules

## External Reference Direction

KiCad is currently treated as a reference/import source for dimensional and package truth, not as the final AURA visual style.

Useful KiCad inputs include:

- `.kicad_mod`
- `.kicad_pcb`
- `.kicad_sym`
- footprint libraries
- optional linked 3D references such as STEP/WRL when useful as reference

Planned direction:

- parse external package/board reference data into AURA definitions
- parse or normalize imported scene/runtime structures into AURA-owned component packages
- keep AURA's own schema and renderer as the final product source of truth
- preserve post-import editing inside `AURA Studio`

## Component Package Direction

The current package direction is:

- reusable parts should converge toward:
  - `component.json`
  - `scene.svg`
- native AURA parts keep JSON as canonical semantic truth
- imported Wokwi parts are normalized into the same package model
- a shared extractor/normalizer should work across both Wokwi imports and AURA-exported scenes

Do not frame future work as:

- Wokwi parts using one behavior system
- native AURA parts using another

The target is one runtime/binding model with different backends:

- vendor element props for imported Wokwi parts
- named scene nodes for native AURA parts

## Continuity Rule

This workspace uses an append-only continuity ledger at `AI_CONTINUITY_LOG.md`.

For every single assistant reply in this workspace:

- append a new entry to `AI_CONTINUITY_LOG.md`
- never delete old entries
- never rewrite prior entries unless the user explicitly asks
- preserve the running project history even if it becomes large
- include direct reference points to changed or discussed files and logic so future sessions can locate work quickly

Each appended entry should include:

- date/time
- user intent for that turn
- what was discussed
- what was changed or created
- what files were touched
- reference points for important files, logic blocks, screens, functions, modules, or generated structures
- decisions made
- disagreements or corrections from the user
- next recommended step

If no files were changed, state that explicitly.

When large code or file generation happens:

- record the main generated files explicitly
- record what each file is responsible for
- record where key logic lives inside the generated structure
- prefer concise file references over vague summaries

## Working Style

- keep the product hardware-first in framing
- do not reduce AURA to a generic circuit editor
- prefer practical structure over speculative theory
- use concise, factual updates
- preserve continuity by appending to the log after every reply
- when a user request is ambiguous in a way that would cause major redesign or hallucinated behavior, ask a concise clarification question before implementing
- otherwise, move the work forward without unnecessary back-and-forth

## Git And Change Management

- do not push to the remote on every iteration by default
- keep design exploration local unless the user asks to push or the state is clearly ready
- do not delete or revert unrelated user changes
- do not treat generated local folders as core product source

## Current Important Files

When orienting a fresh session, these files currently matter most:

- `README.md`
- `WORKSPACE_GUIDE.md`
- `workspace_index/README.md`
- `docs/NORMAL_USER_PRODUCT_MODEL_2026-03-24.md`
- `docs/AURA_COMPONENT_PACKAGE_V1.md`
- `docs/COMPONENT_DEFINITION_V1.md`
- `docs/COMPONENT_LAB_AUTHORING_RULES.md`
- `docs/COMPONENT_TEMPLATE_SYSTEM_V1.md`
- `docs/VENDOR_REFERENCE_STRATEGY.md`
- `docs/DATA_CONTRACTS_V1.md`
- `host_remote/README.md`
- `host_remote/START_HERE_UPLOAD.md`
- `local_tools/README.md`
- `vendor_reference/README.md`
- `studio_ui/README.md`
- `shared/README.md`
- `AI_CONTINUITY_LOG.md`

## Immediate Working Baseline

As of the current workspace state:

- `host_remote/` contains the active host firmware and display/radio bring-up work
- `local_tools/aura_host_diagnostics/` exists as the standalone host diagnostics firmware tool
- `host_remote/tests/display_st7789_smoke/` exists for isolated TFT bring-up
- `studio_ui/` has had a major user-first layout cleanup for both circuit editing and component lab
- `shared/component_definitions_v1/` and `shared/contracts_v1/` hold the current machine-readable foundation
- `shared/component_packages_v1/` is reserved for the paired `component.json + scene.svg` package direction
- `shared/component_packages_v1/` now holds the starter package template/index for the paired `component.json + scene.svg` direction
- `shared/component_templates_v1/` holds the first machine-readable package-template layer
- `shared/wokwi_models_v1/` holds the current Wokwi import bridge for tag names, sizing, pins, and runtime bindings
- `vendor_reference/` holds offline Wokwi/KiCad sources and cached Wokwi public-project references

## Next Recommended Direction

The current recommended next phase is:

1. normalize imported Wokwi/KiCad reference data into AURA-owned package artifacts
2. validate and refine native AURA package export/import around that same model
3. let repeated import/correction pain points drive the next generation of tools
4. keep the root structure, workspace guides, package contract, and continuity log updated as the system grows
