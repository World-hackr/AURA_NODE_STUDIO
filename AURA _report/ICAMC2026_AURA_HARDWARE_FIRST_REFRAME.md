# ICAMC 2026 - AURA Hardware-First Reframe

## Purpose

This file is the corrected framing draft for the ICAMC conference paper.

It is written to prevent AURA from being misread as:

- only a circuit editor
- only an AI circuit generator
- only a UI workspace
- only an inventory app

Instead, the paper should read first as:

`a complete cyber-physical prototype for inventory-aware electronics component localization and retrieval`

Circuit assistance should remain in the paper, but as a supporting capability, not the headline identity.

---

## Recommended Paper Identity

### Final recommended title

`AURA: A Complete Cyber-Physical Prototype for Inventory-Aware Electronics Component Localization and Retrieval`

### Strong alternative title

`AURA: An Inventory-Aware Cyber-Physical Electronics Assistance System for Distributed Component Localization`

### If you want to keep circuit assistance visible but secondary

`AURA: A Complete Cyber-Physical Prototype for Inventory-Aware Component Localization with Deterministic Circuit Assistance`

### Recommended short expansion of AURA

`AURA - Autonomous User Realization and Retrieval Assistant`

This version fits the real hardware-first product better than "Assembly" in the paper context because:

- retrieval is central
- physical location is central
- inventory and search are central
- it sounds like a real product system instead of a design-only tool

---

## What The Paper Must Communicate On Page 1

### Reviewer should understand this immediately

- AURA deals with real physical electronics components
- AURA knows exact part values, quantities, and storage locations
- AURA can physically guide the user to those parts through addressed nodes
- AURA is a complete prototype, not only a concept
- circuit assistance exists, but it is constrained by inventory and physical retrieval

### Reviewer must not conclude this too early

- "this is just another circuit editor"
- "this is mainly an AI circuit generator"
- "this is mostly a UI/workspace paper"
- "the hardware is only a side feature"

---

## Core Framing Sentence

Use this sentence early in the abstract and introduction:

`AURA is a complete cyber-physical prototype that connects exact-part inventory records, distributed locator nodes, and a host device so users can determine whether required electronics components are owned and then retrieve them from physical storage with reduced search time and uncertainty.`

---

## Recommended Abstract

`Abstract - Electronics prototyping often breaks down not at ideation but at retrieval: users may know what they want to build, yet still lose time checking whether the exact owned components exist, whether enough quantity is available, and where those parts are physically stored. This paper presents AURA, a complete cyber-physical prototype for inventory-aware electronics component localization and retrieval. The system combines an ESP32-based host device, low-power ATtiny404 plus nRF24L01 locator nodes, WS2812-based visual indication, and value-aware inventory records that track exact part identity, quantity, and storage address. AURA supports single-part lookup, quantity-aware stock review, addressed activation of distributed locator nodes, and multi-part retrieval workflows for accepted builds. A supporting deterministic circuit assistance layer can operate on structured circuit data and local rules so that build suggestions remain auditable and tied to owned stock rather than unconstrained chat output. In this prototype, physical retrieval remains the primary system function and software assistance remains subordinate to the hardware-centered workflow. The result is a practical electronics assistance system that reduces part-search friction while preserving an inspectable boundary between inventory, circuit reasoning, and real-world retrieval actions.`

---

## Recommended Index Terms

`Index Terms - cyber-physical systems, electronics inventory, component localization, distributed locator nodes, inventory-aware retrieval, electronics prototyping`

Do not foreground:

- AI circuit generation
- workspace UI
- circuit editor

Those can appear later, but not in the index terms.

---

## Recommended Contribution Statement

Put this near the end of the introduction.

`The main contribution of AURA is not a simulator or editor alone, but a complete prototype that closes the gap between knowing what to build and physically retrieving the exact owned components required to build it.`

Then list contributions like this:

1. `A complete host-and-node cyber-physical prototype for addressed component localization`
2. `An inventory model that distinguishes exact values, quantities, and physical storage addresses`
3. `A retrieval workflow that links part lookup, stock review, and physical highlighting`
4. `A deterministic assistance boundary that keeps software support inspectable and subordinate to the hardware workflow`

---

## Recommended Section Structure

### I. Introduction

Focus on:

- real prototyping bottleneck
- exact value and quantity problem
- physical retrieval problem
- fragmentation between inventory, circuit planning, and retrieval

Do not lead with:

- workspace modes
- JSON model
- AI revision flow

### Suggested opening paragraph

`Electronics prototyping frequently slows down at the point where digital intent meets physical storage. A user may know the circuit they want to assemble, yet still spend disproportionate time determining whether the exact resistor value, transistor variant, sensor module, or timer IC is actually owned, whether enough quantity is available, and where those parts are physically located. This gap between planning and retrieval is rarely treated as a single systems problem.`

### Suggested second paragraph

`Most existing tools address only fragments of this workflow. Circuit design environments typically assume parts are available. Inventory tools may record stock but do not usually guide physical retrieval. AI-based circuit suggestion tools may generate plausible designs, but often ignore exact owned values, quantity constraints, and the real-world step of locating the required components in storage.`

### Suggested third paragraph

`AURA addresses this gap through a complete cyber-physical prototype that couples an inventory-aware host device with distributed locator nodes and a structured assistance layer. The prototype is designed so that physical retrieval remains the primary function, while software support improves feasibility checking, guidance, and circuit-oriented assistance without replacing the hardware-centered workflow.`

---

### II. System Architecture

Keep the structure hardware-first.

Recommended order:

1. `Host device`
2. `Distributed locator nodes`
3. `Inventory and storage addressing`
4. `Optional phone support`
5. `Deterministic circuit assistance layer`

Important rule:

Do not put the circuit assistance layer before the host-node-inventory system.

### Better section naming

- `A. Host Device and Control Layer`
- `B. Distributed Locator Node Layer`
- `C. Inventory and Storage Address Layer`
- `D. Support Software and Deterministic Assistance Layer`

This ordering makes the paper read like a product system, not a software stack.

---

### III. Prototype Workflow

This section should read as a real product flow:

1. user searches for an exact part or build need
2. system checks exact inventory fit
3. system identifies physical storage locations
4. host triggers addressed node outputs
5. user retrieves parts
6. software assistance may help with build planning afterward or alongside retrieval

Use phrases like:

- `physical storage`
- `owned stock`
- `exact value`
- `storage address`
- `retrieve`
- `highlight`
- `locate`

Avoid letting this section drift into:

- editor layout explanations
- large UI descriptions
- left panel / right panel walkthroughs

That material should be reduced.

---

### IV. Prototype Realization and Validation

This section is where you can frame it as a complete prototype.

Use wording like:

`AURA has been realized as a complete prototype spanning host control, addressed locator nodes, inventory representation, and retrieval workflow integration.`

But then support that with evidence.

Minimum evidence you should include before submission:

- host prototype photo
- node prototype photo
- example storage setup photo
- example retrieval workflow figure
- one validation table

Good validation categories:

- single-part locate success
- multi-part retrieval scenario
- node activation response
- inventory lookup correctness
- storage mapping workflow

---

## Recommended Figure Strategy

Do not let the first visuals make the paper look like a software workspace paper.

### Best figure order

#### Fig. 1

`AURA complete prototype overview: host device, locator node hardware, and physical storage environment`

This should be a real hardware-first photo or composite.

This is the most important figure.

#### Fig. 2

`System architecture showing host, inventory records, distributed nodes, and physical storage mapping`

Use a clean block diagram.

#### Fig. 3

`End-to-end retrieval workflow from exact-part query to physical highlighting`

This should show the real cyber-physical loop.

#### Fig. 4

`Host device interface used for part lookup and locate activation`

Show the host UI here, not earlier than the hardware.

#### Fig. 5

`Optional software support surface for inventory review and deterministic circuit assistance`

This is where workspace-related visuals belong.

### Image rule

If you place the workspace screenshot too early or too prominently, reviewers may misclassify the paper.

Hardware images must dominate the first half of the paper.

---

## Recommended Visual Balance

Use approximately this emphasis:

- `50%` hardware and physical workflow
- `25%` inventory and address logic
- `15%` host interaction
- `10%` circuit assistance

Not the other way around.

---

## Wording To Prefer

Use these phrases often:

- `real components`
- `physical storage`
- `exact owned parts`
- `value-aware inventory`
- `quantity-aware retrieval`
- `distributed locator nodes`
- `addressed highlighting`
- `component localization`
- `inventory-aware retrieval`
- `host-controlled physical guidance`
- `complete prototype`

---

## Wording To Reduce

Reduce or move later:

- `workspace`
- `canvas`
- `editor`
- `circuit composition`
- `AI-assisted circuit creation`
- `JSON-first workspace`
- `proposal review surface`
- `left panel / right panel`

These are not wrong, but they should not dominate the paper.

---

## Better Positioning For Circuit Assistance

This is the correct framing:

`AURA primarily solves the physical problem of knowing whether exact components are owned and where they are stored. Deterministic circuit assistance is included as a supporting capability that helps connect build intent to owned inventory without displacing the system's hardware-centered retrieval role.`

This keeps the circuit layer valuable without letting it hijack the paper identity.

---

## Recommended "Prototype Complete" Language

Since you want to frame AURA as a complete prototype, use language like this:

`The presented system is a complete prototype intended to demonstrate the integrated host, node, inventory, and retrieval workflow in operational form rather than as an isolated concept or software mockup.`

`In its current realization, AURA already supports end-to-end prototype operation across part lookup, stock awareness, node-addressed physical localization, and hardware-guided retrieval.`

This sounds complete, but still academically safe.

Avoid phrases like:

- `fully solved`
- `universal`
- `guaranteed correctness`
- `complete production system`

---

## Risks Still Present If You Do Not Reframe

If you submit the old framing, a reviewer may think:

- the contribution is too broad
- the hardware contribution is weak
- the work is mostly a UI or software workspace
- the claimed prototype is not focused enough
- the novelty is unclear

The reframed version should instead make them think:

- this solves a real overlooked bottleneck
- this is a tangible cyber-physical prototype
- this has a clear primary contribution
- the software support is secondary and disciplined

---

## Suggested First-Page Flow

Page 1 should feel like this:

1. `practical physical problem`
2. `why existing tools miss it`
3. `AURA as complete cyber-physical prototype`
4. `main contributions`
5. `hardware-first figure`

Not:

1. AI
2. workspace
3. JSON
4. preview
5. later mention hardware

---

## Best One-Sentence Summary For Judges

Use this in presentation or synopsis material too:

`AURA is a complete prototype that helps users verify whether they own the exact electronics parts they need and then physically guides them to those parts through an addressed host-and-node localization system.`

---

## If You Want A Stronger Conference-Friendly Closing

`AURA demonstrates that electronics assistance should not end at digital recommendation. By treating exact-part inventory, physical storage, and component retrieval as first-class system concerns, the prototype closes a practical gap between planning a build and physically assembling it.`

---

## Next Rewrite Targets

If you continue from this file, rewrite these parts of the current conference draft first:

1. `Title`
2. `Abstract`
3. `Introduction opening`
4. `Contribution statement`
5. `System architecture ordering`
6. `Workspace-heavy interpretation section`
7. `Conclusion`

---

## Practical Note

You can absolutely frame this as a complete prototype if, by submission time, the paper includes evidence that the prototype exists and works as an integrated system.

That means the paper should visibly show:

- host hardware
- node hardware
- storage mapping or retrieval setup
- operational workflow
- at least minimal validation outcomes

Without that evidence, the phrase `complete prototype` becomes vulnerable.

With that evidence, it becomes one of the paper's strengths.
