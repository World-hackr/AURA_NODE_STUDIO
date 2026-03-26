import { Grid3X3, Image as ImageIcon, LocateFixed, RotateCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Canvas } from "./components/Canvas";
import { ComponentCreatorWorkspace } from "./components/ComponentCreatorWorkspace";
import { HoverHint } from "./components/HoverHint";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Sidebar } from "./components/Sidebar";
import { useEditorStore } from "./store/useEditorStore";
import { computeLayoutHealth } from "./utils/layoutHealth";

const STAGE_TEXTURE_KEYS = ["texture1", "texture2", "texture3", "texture4"] as const;

function EditorWorkspaceShell({ modeSwitch }: { modeSwitch: ReactNode }) {
  const components = useEditorStore((state) => state.components);
  const connections = useEditorStore((state) => state.connections);
  const pendingLibraryItemId = useEditorStore((state) => state.pendingLibraryItemId);
  const pendingDraftId = useEditorStore((state) => state.pendingDraftId);
  const selectedComponentId = useEditorStore((state) => state.selectedComponentId);
  const selectedConnectionId = useEditorStore((state) => state.selectedConnectionId);
  const selectedJunctionId = useEditorStore((state) => state.selectedJunctionId);
  const gridVisible = useEditorStore((state) => state.gridVisible);
  const gridOpacity = useEditorStore((state) => state.gridOpacity);
  const clarityMode = useEditorStore((state) => state.clarityMode);
  const textureVisible = useEditorStore((state) => state.textureVisible);
  const textureKey = useEditorStore((state) => state.textureKey);
  const textureEditMode = useEditorStore((state) => state.textureEditMode);
  const junctionEditMode = useEditorStore((state) => state.junctionEditMode);
  const rotateComponent = useEditorStore((state) => state.rotateComponent);
  const resetViewport = useEditorStore((state) => state.resetViewport);
  const setGridVisible = useEditorStore((state) => state.setGridVisible);
  const setGridOpacity = useEditorStore((state) => state.setGridOpacity);
  const setClarityMode = useEditorStore((state) => state.setClarityMode);
  const setTextureVisible = useEditorStore((state) => state.setTextureVisible);
  const setTextureKey = useEditorStore((state) => state.setTextureKey);
  const setTextureEditMode = useEditorStore((state) => state.setTextureEditMode);
  const setJunctionEditMode = useEditorStore((state) => state.setJunctionEditMode);
  const { overlapCount, crowdedCount } = computeLayoutHealth(components);

  const currentStage =
    pendingDraftId || pendingLibraryItemId
      ? "placing"
      : components.length === 0
        ? "start"
        : connections.length === 0
          ? "wiring"
          : selectedComponentId || selectedConnectionId || selectedJunctionId
            ? "editing"
            : "ready";

  return (
    <div className="editor-workspace">
      <div className="workspace-banner">
        <div className="workspace-banner-main">
          <div className="min-w-0">
            <p className="editor-eyebrow">AURA Node Studio</p>
            <div className="workspace-title-row">
              <h1 className="workspace-title">Circuit Studio</h1>
              <HoverHint text="Choose parts from the library, place them cleanly on the stage, and edit only what matters." />
            </div>
          </div>

          <div className="workspace-meta-strip">
            <span>{components.length} parts</span>
            <span>{connections.length} wires</span>
            <span>{currentStage}</span>
            {overlapCount > 0 ? <span className="workspace-meta-pill-alert">{overlapCount} overlap</span> : null}
            {crowdedCount > 0 ? <span className="workspace-meta-pill-warn">{crowdedCount} crowded</span> : null}
            {overlapCount === 0 && crowdedCount === 0 ? <span className="workspace-meta-pill-clean">layout clean</span> : null}
          </div>
        </div>
        <div className="workspace-banner-center">
          <div className="workspace-toolbar-main">
            <div className="canvas-toolgroup">
              <span className="canvas-toolgroup-label">View</span>
              <div className="flex items-center px-2.5">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(gridOpacity * 100)}
                  onChange={(event) => setGridOpacity(Number(event.target.value) / 100)}
                  className="canvas-slider"
                  title="Grid opacity"
                />
              </div>
              <button
                type="button"
                onClick={() => setGridVisible(!gridVisible)}
                className={`canvas-icon-button ${gridVisible ? "canvas-control-active" : ""}`}
                title="Toggle grid visibility"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <div className="canvas-sep" />
              <button
                type="button"
                onClick={resetViewport}
                className="canvas-icon-button"
                title="Snap to origin"
              >
                <LocateFixed className="h-4 w-4" />
              </button>
            </div>

            <div className="canvas-toolgroup">
              <span className="canvas-toolgroup-label">Edit</span>
              <button
                type="button"
                onClick={() => {
                  if (selectedComponentId) {
                    rotateComponent(selectedComponentId, 90);
                  }
                }}
                disabled={!selectedComponentId}
                className={`canvas-icon-button ${selectedComponentId ? "" : "opacity-40"}`}
                title="Rotate selected component 90 degrees"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setJunctionEditMode(!junctionEditMode)}
                className={`canvas-text-button ${junctionEditMode ? "canvas-control-active" : ""}`}
                title="Place and move junctions"
              >
                Junction
              </button>
              <button
                type="button"
                onClick={() => setClarityMode(!clarityMode)}
                className={`canvas-text-button ${clarityMode ? "canvas-control-active" : ""}`}
                title="Show readability warnings for dense layouts"
              >
                Clarity
              </button>
            </div>

            <div className="canvas-toolgroup">
              <span className="canvas-toolgroup-label">Backdrop</span>
              <button
                type="button"
                onClick={() => setTextureEditMode(!textureEditMode)}
                className={`canvas-text-button ${textureEditMode ? "canvas-control-active" : ""}`}
                title="Align background"
              >
                Align
              </button>
              <button
                type="button"
                onClick={() => setTextureVisible(!textureVisible)}
                className={`canvas-icon-button ${textureVisible ? "canvas-control-active" : ""}`}
                title="Toggle texture"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>

            {textureVisible || textureEditMode ? (
              <div className="canvas-toolgroup">
                <span className="canvas-toolgroup-label">Texture</span>
                {STAGE_TEXTURE_KEYS.map((key, index) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTextureVisible(true);
                      setTextureKey(key);
                    }}
                    className={`canvas-text-button ${textureKey === key ? "canvas-control-active" : ""}`}
                    title={`Use texture ${index + 1}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
            ) : null}
          </div>
        </div>
        <div className="workspace-banner-side">
          <div className="workspace-banner-switch">{modeSwitch}</div>
        </div>
      </div>

      <div className="studio-shell">
        <Sidebar />
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  );
}

function App() {
  const [workspaceMode, setWorkspaceMode] = useState<"creator" | "editor">("editor");
  const modeSwitch: ReactNode = (
    <div className="studio-inline-switch" role="tablist" aria-label="Studio workspaces">
      <button
        type="button"
        role="tab"
        aria-selected={workspaceMode === "editor"}
        onClick={() => setWorkspaceMode("editor")}
        className={`mode-switch-button ${workspaceMode === "editor" ? "mode-switch-button-active" : ""}`}
      >
        Circuit Studio
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={workspaceMode === "creator"}
        onClick={() => setWorkspaceMode("creator")}
        className={`mode-switch-button ${workspaceMode === "creator" ? "mode-switch-button-active" : ""}`}
      >
        Component Lab
      </button>
    </div>
  );

  return (
    <div className="box-border h-screen w-screen overflow-hidden bg-aura-bg p-2 font-sans text-aura-ink md:p-2.5">
      <div className="studio-app-frame">
        <div className="h-full min-h-0">
          {workspaceMode === "creator" ? (
            <ComponentCreatorWorkspace modeSwitch={modeSwitch} />
          ) : (
            <EditorWorkspaceShell modeSwitch={modeSwitch} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
