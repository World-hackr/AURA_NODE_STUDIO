# AURA Node Studio Agent Instructions

Updated: 2026-03-14

## Read Order

Before doing substantial work in this folder, read these files in order:
- `README.md`
- `AI_CONTINUITY_LOG.md`

## Project Identity

`AURA Node Studio` is the clean restart workspace for the hardware-first version of AURA.

AURA is a cyber-physical electronics system, not just a circuit editor.
The system combines:
- physical component storage
- host hardware
- locator nodes
- inventory intelligence
- phone/software support
- deterministic circuit assistance

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
- do not collapse AURA back into just a UI app
- use concise, factual updates
- prefer structure and clarity over speculative expansion
- preserve continuity by appending to the log after each reply
- when the user request is ambiguous, partially unclear, or appears based on mistaken wording, ask a concise clarification question before implementing
- in those cases, explain what is unclear, what the current limitation is, and how far the implementation can responsibly go without guessing
- prefer clarification over speculative implementation when a wrong interpretation would cause major redesign, wasted code, or hallucinated behavior

## Product Direction

Current reset direction:
- `AURA Node Studio` is the new final restart workspace
- `AURA Host` is the first build target
- firmware uses `VS Code + PlatformIO`
- firmware and phone UI may live in the same repo if separated clearly
- visual direction should stay restrained, modern, black-and-white, and easy to read
