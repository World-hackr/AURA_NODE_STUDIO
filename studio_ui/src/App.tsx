import { useState, type ReactNode } from "react";

import { Canvas } from "./components/Canvas";
import { ComponentCreatorWorkspace } from "./components/ComponentCreatorWorkspace";
import { HoverHint } from "./components/HoverHint";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Sidebar } from "./components/Sidebar";
import { useEditorStore } from "./store/useEditorStore";
import { computeLayoutHealth } from "./utils/layoutHealth";

function EditorWorkspaceShell({ modeSwitch }: { modeSwitch: ReactNode }) {
  const components = useEditorStore((state) => state.components);
  const connections = useEditorStore((state) => state.connections);
  const pendingLibraryItemId = useEditorStore((state) => state.pendingLibraryItemId);
  const pendingDraftId = useEditorStore((state) => state.pendingDraftId);
  const selectedComponentId = useEditorStore((state) => state.selectedComponentId);
  const selectedConnectionId = useEditorStore((state) => state.selectedConnectionId);
  const selectedJunctionId = useEditorStore((state) => state.selectedJunctionId);
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
