# AURA: A Complete Cyber-Physical Prototype for Inventory-Aware Circuit Creation and Physical Component Retrieval

Santosh Kumar
Department of Computer Science and Engineering
HMR Institute of Technology and Management, New Delhi, India
Academic guidance: Dr. Naveen Sharma, Professor
Supervisor: Dr. Naveen Sharma, Professor

## Abstract

Electronics workbench software and physical storage systems are usually disconnected. When a user wants to build a circuit, two bottlenecks appear immediately: determining what can be created from the exact parts already owned, and physically retrieving those parts from drawers, bins, or racks once the design has been chosen. This paper presents AURA, a complete cyber-physical prototype that addresses both bottlenecks within one inventory-aware system. AURA combines structured AI-assisted circuit creation, exact-part inventory records, an ESP32-based host with a compact screen and joystick interface, and distributed locator nodes built around the ATtiny404, nRF24L01, and WS2812-based indication. On the design side, AURA grounds candidate circuits in owned-stock awareness and structured review rather than unconstrained chat output. On the physical side, the host resolves exact storage locations and activates addressed nodes to highlight stored components for retrieval. The current prototype direction supports inventory-constrained circuit assistance, single-part lookup, host-side stock review, node-addressed localization, and compact local control without requiring a phone during retrieval. The goal of AURA is to reduce both design-side uncertainty and search-side friction, so that a user can move more directly from build intent to physically assembled hardware. The paper frames AURA as a complete prototype and argues that its core practical contribution lies in unifying circuit creation, inventory fit, and real-world component retrieval within one inspectable workflow.

## Index Terms

cyber-physical systems, electronics inventory, AI-assisted circuit creation, component retrieval, distributed locator nodes, inventory-aware workflow

## I. INTRODUCTION

Electronics assistance usually breaks down exactly where real work begins. A user may know the function they want, such as a timer, a flasher, a motor driver, or a simple control circuit, but still face two immediate barriers. First, it is unclear what can be built from the exact parts already owned. Second, even after the required parts are identified, it is still unclear where those parts are physically stored and how quickly they can be gathered for assembly.

This double bottleneck is more serious than it first appears. Circuit tools often assume ideal availability. Inventory tools often stop at record keeping. General-purpose AI may produce plausible circuit ideas, but usually does not remain grounded in exact stock, exact quantities, and physical storage reality. As a result, users are forced to jump between design thinking, stock checking, and manual search inside the real storage environment.

AURA is proposed as a direct answer to this fragmentation. Its goal is not only to help the user think about a circuit, and not only to help the user find a part. Its goal is to connect both tasks through one inventory-aware cyber-physical workflow so that build intent can become a reviewable circuit direction, an accepted part set, and finally a successful real-world retrieval path.

![Fig. 1. AURA targets two linked bottlenecks at once: inventory-aware circuit creation and physical component retrieval.](C:/Users/Santo/OneDrive/Desktop/AURA_2/AURA Node Studio/AURA _report/generated_aura_problem_goal.png)

*Fig. 1. AURA targets two linked bottlenecks at once: inventory-aware circuit creation and physical component retrieval.*

### A. Paper Goal

The central goal of the paper is to make the reader understand AURA's purpose without ambiguity. AURA is a hardware-first electronics assistance system that helps users 1) decide what can be built from owned stock, 2) verify whether enough quantity exists, 3) map accepted needs to exact storage locations, and 4) retrieve those parts through a host-and-node localization system.

### B. Main Contributions

The main contribution of AURA is the integration itself. The system brings together an inventory-aware circuit-creation path, a compact embedded host, distributed locator nodes, and exact-part storage mapping within one complete prototype direction. More specifically, the paper contributes 1) a structured circuit-assistance layer grounded in owned inventory, 2) a physical retrieval layer that highlights exact storage positions through addressed nodes, 3) a shared inventory model for exact values, quantities, and locations, and 4) an end-to-end workflow from build intent to physically retrieved parts.

## II. SYSTEM GOALS AND OVERVIEW

AURA should be understood as a system with clearly bounded goals. It must reduce design-side uncertainty, reduce search-side friction, keep AI assistance grounded in structured inventory knowledge, and preserve a practical host-first retrieval experience. These goals define the product more accurately than labels such as editor, simulator, or inventory app.

The system is built around one shared inventory substrate. That inventory layer holds exact component identity, value or variant, quantity, storage address, and node-output mapping. From that common substrate, one branch supports circuit-oriented assistance and another branch supports host-guided localization. This shared base is what keeps AURA from becoming two disconnected tools.

![Fig. 2. Professional overview of the current AURA system direction, showing how shared inventory supports both circuit creation and physical retrieval.](C:/Users/Santo/OneDrive/Desktop/AURA_2/AURA Node Studio/AURA _report/generated_aura_system_overview.png)

*Fig. 2. Professional overview of the current AURA system direction, showing how shared inventory supports both circuit creation and physical retrieval.*

### A. Circuit-Creation Goal

On the design side, AURA should help the user move from intent toward a candidate circuit that is not only plausible, but grounded in the parts actually available. This means the system must reason over exact values and quantities rather than abstract families alone. AURA is not intended to replace engineering judgment or claim universal electrical correctness. Instead, it should provide structured assistance that keeps the design state inspectable and constrained.

### B. Retrieval Goal

On the physical side, AURA should do more than report that a part is owned somewhere. It should resolve the exact storage location and activate an addressed output that guides the user to the correct drawer, strip, or storage zone. This makes retrieval a first-class system function instead of an external manual step.

### C. Host-First Goal with Software Support

AURA does include phone and software support, but these remain support surfaces rather than the primary product identity. The host device must remain sufficient for local lookup, stock review, and locate actions. Richer software may assist with bulk input, project organization, and broader search, but the system should still function as a real hardware product even when the user is standing near storage with only the host in hand.

## III. COMPLETE PROTOTYPE ARCHITECTURE

### A. Inventory-Aware Circuit Assistance Layer

The circuit-assistance layer accepts build intent and inventory context and returns structured candidate results rather than opaque free-form responses. Its purpose is not to present AI as unquestionable authority, but to keep proposals reviewable, comparable, and tied to owned stock. This is the design-side half of AURA's contribution.

### B. Host Device Layer

The host prototype is based on an ESP32-class controller with a 1.8 inch local display and joystick-driven input. It acts as the embedded control surface for part lookup, stock review, node test, setup actions, and live locate sessions. The host should remain understandable and useful without long text entry or complex on-device editing.

![Fig. 3. Current AURA host prototype with compact display and joystick-driven local interaction.](C:/Users/Santo/OneDrive/Desktop/AURA_2/AURA Node Studio/AURA _report/ppt_assets/conference_media/image13.png)

*Fig. 3. Current AURA host prototype with compact display and joystick-driven local interaction.*

### C. Distributed Locator Node Layer

The node layer uses compact low-power units built around the ATtiny404 and nRF24L01, combined with WS2812-based visual indication. A node can cover one dense row, one rack segment, or another mapped physical zone. This layer provides the actuation path that turns storage metadata into visible retrieval guidance.

![Fig. 4. Current locator node prototype for addressed visual highlighting of stored components.](C:/Users/Santo/OneDrive/Desktop/AURA_2/AURA Node Studio/AURA _report/ppt_assets/conference_media/image14.png)

*Fig. 4. Current locator node prototype for addressed visual highlighting of stored components.*

### D. Current Interaction Surfaces

The current AURA direction intentionally separates rich support surfaces from compact retrieval surfaces. The phone or support app handles deeper search, inventory intake, project grouping, and richer review tasks. The host focuses on fast local control. This split is important because it lets the paper present a realistic cyber-physical system instead of pretending that all tasks belong equally on the same tiny display.

![Fig. 5. Conceptual support surfaces aligned to the current AURA restart: phone-side deep workflows and host-side retrieval control.](C:/Users/Santo/OneDrive/Desktop/AURA_2/AURA Node Studio/AURA _report/generated_aura_surfaces.png)

*Fig. 5. Conceptual support surfaces aligned to the current AURA restart: phone-side deep workflows and host-side retrieval control.*

## IV. END-TO-END WORKFLOW AND EFFECT

AURA is most meaningful when read as one continuous operational flow. The user begins with build intent or with a known part need. The system then moves through inventory-aware circuit assistance, exact-part resolution, stock fit, accepted part selection, and finally physical retrieval through addressed highlighting.

![Fig. 6. End-to-end AURA workflow from build intent to inventory-aware decision and finally to physical retrieval.](C:/Users/Santo/OneDrive/Desktop/AURA_2/AURA Node Studio/AURA _report/generated_aura_workflow.png)

*Fig. 6. End-to-end AURA workflow from build intent to inventory-aware decision and finally to physical retrieval.*

### A. Build Intent to Candidate Circuit

The first effect of AURA is that it shortens the path from vague intent to a concrete candidate circuit. Instead of forcing the user to start with a theoretically ideal design and then discover missing parts later, AURA keeps the early design process linked to what is actually available.

### B. Candidate Circuit to Exact Part Set

Once a candidate circuit is accepted, AURA turns that structured result into a required part set grounded in exact values and quantities. This stage is critical because it bridges the software-side decision with the physical-side action. Without this step, design assistance and retrieval would remain disconnected.

### C. Exact Part Set to Physical Retrieval

After the required part set is known, the host resolves storage addresses and activates the mapped locator outputs. The user is then guided toward the correct storage position rather than performing a manual room-scale search. This is where AURA's cyber-physical nature becomes most visible.

### D. Practical User Effect

The practical effect is that AURA reduces two forms of friction at once. It reduces design-side uncertainty by grounding circuit assistance in owned stock, and it reduces search-side friction by making physical retrieval explicit and guided. This dual reduction is the strongest reader-facing argument for why the system matters.

## V. CURRENT PROTOTYPE STATUS AND VALIDATION DIRECTION

The paper frames AURA as a complete prototype direction because the system is defined as one integrated product rather than as disconnected ideas. The host, locator node concept, inventory model, workflow, and interaction surfaces already form one coherent operational target. In that sense, the work is not positioned as an isolated algorithm or a detached UI concept, but as a prototype system whose remaining effort is primarily refinement, implementation completion, and validation.

### A. Current Prototype Scope

The current scope includes host-guided part lookup, stock-aware reasoning, mapped node-based localization, compact local UI design, and support-surface planning for richer workflows. It also includes a clear contract that circuit assistance should remain inventory-aware and physically actionable rather than floating as a separate virtual tool.

### B. Validation Direction

Prototype validation should focus on realistic operational scenarios: single-part retrieval, inventory-constrained candidate-circuit review, accepted-part-list to locate transition, host-only operation near storage, and node mapping or remapping tasks. These validation paths matter more to AURA than traditional software-only benchmark claims because the system's value is inherently cyber-physical.

### C. Claim Discipline

The paper should speak confidently about the integration and the product goal, but it should avoid casual global claims such as 'first in the world' unless they are explicitly defended through prior-art analysis. The safer and stronger position is that AURA offers a rare and highly practical unification of inventory-aware circuit creation and physical component retrieval.

## VI. CONCLUSION

AURA is best understood as a complete cyber-physical prototype whose problem statement is simple and practical: help the user decide what can be built from owned parts and then help the user retrieve those parts in physical space. By joining structured circuit assistance, inventory awareness, host-guided lookup, and node-based highlighting, the system turns what are normally separate activities into one inspectable workflow.

This is the paper's central message and should remain visible from the title through the conclusion. AURA is not merely a circuit editor, not merely an inventory tool, and not merely a locator network. It is a unified electronics assistance system that connects design intent, inventory reality, and physical retrieval.

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
