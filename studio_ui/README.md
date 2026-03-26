# AURA Studio UI

`studio_ui/` is the current browser-side shell for `AURA Studio`.

It contains two distinct advanced workflows:

- `Circuit Studio` - deterministic circuit assembly from known parts
- `Component Lab` - reusable component import, correction, and package export

Neither surface is the primary normal-user entry point for AURA. That role belongs to `AURA Host`.

This is not meant to be a generic sketch pad. The current implementation direction is:
- deterministic circuit state
- explicit pin-to-pin nets
- concrete circuit-side libraries instead of vague adjustable shells
- direct Wokwi-backed part rendering where it improves realism and clarity
- Wokwi-backed source import in `Component Lab` for visual pin/snap correction and deterministic correction export
- import-first component editing, with blank/native starts treated as fallback tools rather than the default workflow
- arbitrary SVG import in `Component Lab`, converted into editable SVG-backed stage layers with geometry, ordering, raw-markup editing, node inspection, explode-to-sublayers, and package export
- paired `component.json + scene.svg` export from `Component Lab` after source cleanup and normalization

## Current Structure

- `src/data/componentCatalog.ts` - fixed package catalog and library metadata
- `src/store/useEditorStore.ts` - editor state, placement, selection, and wiring actions
- `src/components/Sidebar.tsx` - library browser and workspace-side controls
- `src/components/Canvas.tsx` - circuit-stage placement canvas, pan/zoom, drag, and wiring interactions
- `src/components/PropertiesPanel.tsx` - selected-part inspector and manifest preview
- `src/components/ComponentCreatorWorkspace.tsx` - advanced component import/correction surface used by `Component Lab`
- `src/components/WokwiPart.tsx` - Wokwi-backed stage part renderer
- `src/utils/manifest.ts` - canonical JSON export builder
- `src/wokwi/` - local Wokwi registration, model loading, and Wokwi-backed catalog helpers

## Commands

From `studio_ui/`:

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Direction

The UI direction for this restart is restrained and tool-like:
- readable inspection panels
- deterministic data over visual effects
- hardware-like 2D part rendering
- direct vendor-backed visuals where they are good enough
- native AURA parts that should eventually author/export the same kind of deterministic scene/runtime package

Future work should preserve that bias and should also preserve clear role separation:

- normal-user retrieval belongs to `AURA Host`
- browser-side circuit review belongs to `Circuit Studio`
- reusable part import, correction, and package export belong to `Component Lab`

Future work should not drift back into a generic sketch demo or vague AI-first canvas.

When working on component architecture, read:

- `docs/AURA_COMPONENT_PACKAGE_V1.md`
- `docs/COMPONENT_DEFINITION_V1.md`
- `docs/EDITABLE_BEHAVIOR_MODEL_V1.md`
