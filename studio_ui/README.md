# AURA Studio UI

`studio_ui/` is the current browser-side shell for `AURA Studio`.

It contains two distinct advanced workflows:

- `Circuit Studio` - deterministic circuit assembly from known parts
- `Component Lab` - reusable component and package authoring

Neither surface is the primary normal-user entry point for AURA. That role belongs to `AURA Host`.

This is not meant to be a generic sketch pad. V1 is intentionally narrow:
- fixed package library
- fixed 2.54 mm grid
- explicit pin-to-pin nets
- export-first circuit state

## Current Structure

- `src/data/componentCatalog.ts` - fixed package catalog and library metadata
- `src/store/useEditorStore.ts` - editor state, placement, selection, and wiring actions
- `src/components/Sidebar.tsx` - library browser and workspace-side controls
- `src/components/Canvas.tsx` - circuit-stage placement canvas, pan/zoom, drag, and wiring interactions
- `src/components/PropertiesPanel.tsx` - selected-part inspector and manifest preview
- `src/components/ComponentCreatorWorkspace.tsx` - advanced component authoring surface used by `Component Lab`
- `src/utils/manifest.ts` - canonical JSON export builder

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
- monochrome or near-monochrome surfaces
- simple package rendering
- readable inspection panels
- deterministic data over visual effects

Future work should preserve that bias and should also preserve clear role separation:

- normal-user retrieval belongs to `AURA Host`
- browser-side circuit review belongs to `Circuit Studio`
- reusable part authoring belongs to `Component Lab`

Future work should not drift back into a generic sketch demo or vague AI-first canvas.
