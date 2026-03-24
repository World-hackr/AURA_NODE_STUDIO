# AURA: A Complete Cyber-Physical Prototype for Inventory-Aware AI-Assisted Circuit Creation and Distributed Component Localization

Santosh Kumar
Department of Computer Science and Engineering
HMR Institute of Technology and Management, New Delhi, India
Academic guidance: Dr. Naveen Sharma, Professor
Supervisor: Dr. Naveen Sharma, Professor

## Abstract

Electronics assistance usually splits into two separate problems: deciding what circuit can be built from available parts and physically finding those parts in storage. This paper presents AURA, a complete cyber-physical prototype that addresses both problems within one integrated system. AURA combines value-aware inventory records, a deterministic structured AI-assisted circuit creation layer, an ESP32-based host device with local interface, and distributed ATtiny404 plus nRF24L01 locator nodes with WS2812-based indication. On the design side, the system constrains circuit creation through owned-stock awareness and structured, reviewable outputs instead of unconstrained chat responses. On the physical side, the host resolves exact part locations and activates addressed nodes to highlight stored components for retrieval. The current prototype supports single-part lookup, inventory-constrained circuit proposals, structured review of candidate builds, and node-based localization of accepted parts. By coupling circuit creation and physical retrieval through the same inventory substrate, AURA reduces both design-side and retrieval-side friction while preserving a clear boundary between deterministic logic, assistive AI, and real-world hardware actions.

## Index Terms

cyber-physical systems, AI-assisted circuit creation, electronics inventory, component localization, deterministic circuit assistance, inventory-aware retrieval

## I. INTRODUCTION

Electronics prototyping often fails at two connected stages. The first is design feasibility: users may know the outcome they want, but do not know what circuit can be realistically created from the exact parts they already own. The second is physical retrieval: even after the needed components are identified, users still lose time checking whether those exact values exist in sufficient quantity and where they are physically stored.

Most existing tools address only one side of this problem. Circuit design environments usually assume parts exist. Inventory tools may track stock, but rarely guide physical retrieval. General-purpose AI can propose circuits, but often ignores owned-stock constraints, exact variants, and the practical step of finding the required parts in drawers, bins, or shelves.

AURA is designed so that a reader can understand both contributions at once: it is an inventory-aware AI-assisted circuit creation system and a host-and-node localization system for real component retrieval. The core idea is that both capabilities should operate on the same inventory substrate, so that accepted build suggestions can immediately transition into physically actionable locate operations.

### A. Problem Scope

AURA therefore answers two practical questions together: what can be built from the exact owned parts that are available, and where are the required parts physically located. Build feasibility depends on exact values, quantities, and variants. Retrieval depends on known storage addresses and reliable physical highlighting. Solving only one side still leaves the user blocked by the other.

### B. Contributions

The main contribution of AURA is a complete prototype that unifies inventory-aware AI-assisted circuit creation with addressed physical component localization. The specific contributions are: 1) a structured circuit assistance layer that produces reviewable, inventory-aware candidate circuits; 2) a host-and-node cyber-physical localization prototype for exact part retrieval; 3) a shared inventory model that captures exact values, quantities, and storage addresses; and 4) an integrated workflow in which accepted circuit outputs lead directly to retrieval actions in physical space.

## II. DUAL-CORE SYSTEM ARCHITECTURE

AURA is organized around two equally important operational cores that share one inventory substrate. The first core is an inventory-aware circuit creation path that uses deterministic structure and local rules to keep AI assistance reviewable. The second core is a host-guided localization path that transforms exact-part knowledge into addressed physical highlighting through distributed nodes.

![Fig. 1. Integrated AURA architecture linking inventory-aware circuit creation to host-guided physical localization.](C:/Users/Santo/OneDrive/Desktop/AURA_2/AURA Node Studio/AURA _report/generated_aura_dual_architecture.png)

*Fig. 1. Integrated AURA architecture linking inventory-aware circuit creation to host-guided physical localization.*

### A. Inventory-Aware AI-Assisted Circuit Creation Core

The circuit-creation core accepts user intent, inventory context, and structured constraints. Instead of treating AI output as free-form chat, AURA keeps candidate designs tied to structured circuit state and local deterministic checks. This makes build suggestions inspectable, easier to review, and grounded in owned stock rather than idealized parts.

![Fig. 2. Structured support workspace used for inventory-aware circuit creation, review, and deterministic assistance.](C:/Users/Santo/OneDrive/Desktop/AURA_2/AURA Node Studio/AURA _report/ppt_assets/conference_media/conference_workspace.png)

*Fig. 2. Structured support workspace used for inventory-aware circuit creation, review, and deterministic assistance.*

### B. Host-Guided Component Localization Core

The localization core is driven by an ESP32-class host with a compact local display and joystick interface. The host is responsible for part lookup, stock review, node addressing, and locate activation. Its role is intentionally independent enough that physical retrieval does not require a smartphone in normal use.

![Fig. 3. AURA host prototype used for local lookup, stock review, and locate activation.](C:/Users/Santo/OneDrive/Desktop/AURA_2/AURA Node Studio/AURA _report/ppt_assets/conference_media/image13.png)

*Fig. 3. AURA host prototype used for local lookup, stock review, and locate activation.*

Compact low-power locator nodes based on the ATtiny404 and nRF24L01 provide the distributed actuation layer. With WS2812-based visual indication and optional extensibility to other cues, nodes map digital part selection to physical storage positions. This allows the system to highlight the exact drawer, strip, or zone containing the accepted part.

![Fig. 4. Locator node prototype used for addressed physical highlighting of stored components.](C:/Users/Santo/OneDrive/Desktop/AURA_2/AURA Node Studio/AURA _report/ppt_assets/conference_media/image14.png)

*Fig. 4. Locator node prototype used for addressed physical highlighting of stored components.*

### C. Shared Inventory and Address Layer

Both cores depend on the same inventory layer. Records are intended to capture component family, exact value or variant, quantity, and physical storage address. This shared substrate is what makes AURA more than a pair of disconnected tools. The same inventory knowledge constrains candidate circuits and powers physical retrieval.

## III. INTEGRATED USER WORKFLOW

The practical effect of AURA is best understood through the transition from build intent to physical assembly. A user can begin with an idea, a function, or a component need. AURA then supports circuit creation and retrieval as one continuous flow rather than leaving them in separate tools.

### A. From Build Intent to Candidate Circuit

AURA's assistance layer can propose candidate circuits that remain tied to inventory context and structured review. This is important because users do not merely want any plausible circuit. They need one that is compatible with what they actually own and can inspect before accepting.

### B. From Accepted Circuit to Exact Part Set

Once a candidate circuit is accepted, AURA resolves the required part set against the shared inventory layer. This stage translates the design-side result into exact part identities, exact values, and required quantities. The workflow therefore remains grounded in what is buildable, not merely what is theoretically valid.

### C. From Exact Part Set to Physical Retrieval

After the exact part set is confirmed, the host resolves storage addresses and issues addressed commands to the mapped locator nodes. The relevant outputs then highlight the physical positions associated with the accepted circuit or requested part. This closes the loop between design and assembly in a way that software-only systems do not.

### D. Host-First Operation with Optional Smartphone Support

A smartphone or richer software surface can support tasks such as bulk inventory input, richer naming, and more comfortable project browsing. However, the host remains the primary embedded retrieval interface. This keeps AURA positioned as a real hardware product with software support rather than a phone application with attached electronics.

## IV. CURRENT PROTOTYPE REALIZATION AND EFFECT

The current AURA realization is intended as a complete prototype, not just a concept sketch or isolated demo. The prototype already spans structured circuit assistance, inventory-aware filtering, host-driven lookup, node-addressed localization, and hardware-guided retrieval.

### A. Implemented Prototype Capabilities

The integrated prototype direction supports inventory-constrained circuit proposals, structured review of candidate builds, single-part lookup, exact-value stock checking, addressed locate activation, and multi-part retrieval concepts for accepted builds. These capabilities matter because they demonstrate that circuit creation and physical localization are not being claimed independently, but are being connected through one operational system.

### B. Practical Effect on User Workflow

On the design side, AURA reduces the gap between a vague build idea and a concrete candidate circuit grounded in owned stock. On the retrieval side, it reduces the drawer-by-drawer or shelf-by-shelf search burden that normally follows once the needed parts are identified. The result is a shorter, more inspectable path from intent to assembly.

### C. Prototype Positioning

The novelty of AURA should be understood in the integration itself. The paper does not rely on an unsupported claim that each isolated sub-part is globally unprecedented. Instead, it presents a unified cyber-physical prototype in which inventory-aware circuit assistance and addressed localization reinforce one another through shared system state.

## V. DISCUSSION

AURA should not be evaluated as a claim of universal circuit correctness or full simulator coverage. Its value lies in combining two normally disconnected forms of help: assisting users in identifying a buildable circuit from owned stock, and then guiding them to the real components required to assemble it.

This balanced framing is important. If the paper overemphasizes only the localization side, the assistance layer appears secondary. If it overemphasizes only the circuit-creation side, the system risks being misread as another software tool. The correct interpretation is that AURA is a dual-core cyber-physical system whose practical impact comes from joining both functions through one inventory-aware workflow.

## VI. CONCLUSION

AURA presents a complete prototype in which inventory-aware AI-assisted circuit creation and distributed component localization operate as one integrated electronics assistance system. By grounding candidate circuits in owned stock and then connecting accepted results to addressed physical retrieval, the prototype reduces friction on both the design side and the assembly side of electronics work.

Future work will strengthen validation, broaden storage coverage, refine the embedded hardware, and expand support surfaces without losing the core identity established here. The central result remains stable: AURA treats circuit creation and physical retrieval as two parts of the same problem and implements them together in one cyber-physical prototype.

## REFERENCES

[1] Espressif Systems, "ESP32 Technical Reference Manual," 2023.
[2] Microchip Technology Inc., "tinyAVR 0-series Family Data Sheet," 2024.
[3] Nordic Semiconductor, "nRF24L01+ Single Chip 2.4 GHz Transceiver Product Specification," 2019.
[4] Worldsemi, "WS2812B Intelligent Control LED Integrated Light Source Data Sheet," 2020.
[5] Bluetooth SIG, "Bluetooth Core Specification," Version 5.x.
[6] Arduino, "SPI Communication," Arduino Documentation.
[7] SQLite, "SQLite Documentation," Documentation.
[8] P. Horowitz and W. Hill, The Art of Electronics, 3rd ed. Cambridge, U.K.: Cambridge Univ. Press, 2015.
[9] IETF, "JavaScript Object Notation (JSON) Patch," RFC 6902, 2013.
