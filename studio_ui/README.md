# AURA Studio UI

`studio_ui/` is the current browser-side shell for the deterministic circuit studio.

This is not meant to be a generic sketch pad. V1 is intentionally narrow:
- fixed package library
- fixed 2.54 mm grid
- explicit pin-to-pin nets
- export-first circuit state

## Current Structure

- `src/data/componentCatalog.ts` - fixed package catalog and library metadata
- `src/store/useEditorStore.ts` - editor state, placement, selection, and wiring actions
- `src/components/Sidebar.tsx` - deterministic library browser and export controls
- `src/components/Canvas.tsx` - placement canvas, pan/zoom, drag, and wiring interactions
- `src/components/PropertiesPanel.tsx` - selected-part inspector and manifest preview
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

Future work should preserve that bias instead of drifting back into a neon concept demo.
