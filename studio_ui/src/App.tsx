import { useState, type ReactNode } from "react";

import { Canvas } from "./components/Canvas";
import { ComponentCreatorWorkspace } from "./components/ComponentCreatorWorkspace";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Sidebar } from "./components/Sidebar";

function App() {
  const [workspaceMode, setWorkspaceMode] = useState<"creator" | "editor">("editor");
  const modeSwitch: ReactNode = (
    <div className="studio-inline-switch" role="tablist" aria-label="Primary workspaces">
      <button
        type="button"
        role="tab"
        aria-selected={workspaceMode === "creator"}
        onClick={() => setWorkspaceMode("creator")}
        className={`mode-switch-button ${workspaceMode === "creator" ? "mode-switch-button-active" : ""}`}
      >
        Creator
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={workspaceMode === "editor"}
        onClick={() => setWorkspaceMode("editor")}
        className={`mode-switch-button ${workspaceMode === "editor" ? "mode-switch-button-active" : ""}`}
      >
        Editor
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
            <div className="studio-shell">
              <Sidebar modeSwitch={modeSwitch} workspaceMode={workspaceMode} />
              <Canvas workspaceMode={workspaceMode} />
              <PropertiesPanel workspaceMode={workspaceMode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
