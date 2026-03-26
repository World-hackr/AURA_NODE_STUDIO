import { Box, FileJson, Package2, RotateCcw, RotateCw, Trash2 } from "lucide-react";

import { HoverHint } from "./HoverHint";
import {
  getLibraryItem,
  resolvePackageByItemId,
} from "../data/componentCatalog";
import {
  getRuntimeProfileDefinition,
  RUNTIME_PROFILE_DEFINITIONS,
} from "../data/runtimeProfiles";
import { useEditorStore } from "../store/useEditorStore";
import {
  formatUmForDisplay,
  formatUmForInput,
  formatUmPair,
  getAlternateDisplayUnit,
  getDisplayUnitLabel,
  type DisplayUnit,
  parseDisplayValueToUm,
} from "../utils/units";
import { buildCircuitManifest } from "../utils/manifest";
import { computeLayoutHealth } from "../utils/layoutHealth";
import { getWokwiBehaviorSupport } from "../wokwi/wokwiCatalog";

function getEndpointDetails(
  endpoint: { kind: "pin"; componentId: string; pinId: string } | { kind: "junction"; junctionId: string },
  components: Array<{ id: string; reference: string }>,
) {
  if (endpoint.kind === "junction") {
    return {
      title: endpoint.junctionId,
      detail: "Explicit junction",
    };
  }

  const component = components.find((entry) => entry.id === endpoint.componentId);
  return {
    title: component?.reference ?? endpoint.componentId,
    detail: `Pin ${endpoint.pinId}`,
  };
}

export function PropertiesPanel() {
  const components = useEditorStore((state) => state.components);
  const junctions = useEditorStore((state) => state.junctions);
  const connections = useEditorStore((state) => state.connections);
  const componentDrafts = useEditorStore((state) => state.componentDrafts);
  const selectedComponentId = useEditorStore((state) => state.selectedComponentId);
  const selectedJunctionId = useEditorStore((state) => state.selectedJunctionId);
  const selectedConnectionId = useEditorStore((state) => state.selectedConnectionId);
  const pendingLibraryItemId = useEditorStore((state) => state.pendingLibraryItemId);
  const pendingDraftId = useEditorStore((state) => state.pendingDraftId);
  const displayUnit = useEditorStore((state) => state.displayUnit);
  const setDisplayUnit = useEditorStore((state) => state.setDisplayUnit);
  const updateComponent = useEditorStore((state) => state.updateComponent);
  const updateJunction = useEditorStore((state) => state.updateJunction);
  const rotateComponent = useEditorStore((state) => state.rotateComponent);
  const removeComponent = useEditorStore((state) => state.removeComponent);
  const removeJunction = useEditorStore((state) => state.removeJunction);
  const removeConnection = useEditorStore((state) => state.removeConnection);
  const clearConnectionRoutePoints = useEditorStore((state) => state.clearConnectionRoutePoints);
  const alternateDisplayUnit = getAlternateDisplayUnit(displayUnit);
  const layoutHealth = computeLayoutHealth(components);

  const selectedComponent =
    components.find((component) => component.id === selectedComponentId) ?? null;
  const selectedJunction = selectedJunctionId
    ? junctions.find((junction) => junction.id === selectedJunctionId) ?? null
    : null;
  const selectedConnection = selectedConnectionId
    ? connections.find((connection) => connection.id === selectedConnectionId) ?? null
    : null;
  const pendingDraft = pendingDraftId
    ? componentDrafts.find((draft) => draft.id === pendingDraftId) ?? null
    : null;
  if (!selectedComponent) {
    if (selectedConnection) {
      const fromDetails = getEndpointDetails(selectedConnection.from, components);
      const toDetails = getEndpointDetails(selectedConnection.to, components);

      return (
        <aside className="studio-rail studio-rail-inspector">
          <div className="studio-rail-header border-b border-white px-3 py-3">
            <div className="studio-rail-head-inner flex items-start justify-between gap-3">
              <div>
                <p className="editor-eyebrow">Inspector</p>
                <h2 className="mt-1.5 font-sans text-[1rem] font-black uppercase tracking-[0.16em] text-white">
                  Wire
                </h2>
              </div>
              <UnitToggle displayUnit={displayUnit} onChange={setDisplayUnit} />
            </div>
          </div>

          <div className="studio-rail-scroll px-3 py-3">
            <div className="studio-rail-body-inner space-y-3">
              <div className="studio-section-card">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="editor-eyebrow">Selected Wire</p>
                  <span className="studio-pill">{selectedConnection.id}</span>
                </div>

                <div className="space-y-2">
                  <div className="rounded-lg border border-white bg-black px-2.5 py-2">
                    <div className="editor-label !mb-1">From</div>
                    <div className="font-mono text-[12px] text-aura-ink">
                      {fromDetails.title}
                    </div>
                    <div className="mt-1 text-[11px] text-aura-muted">
                      {fromDetails.detail}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white bg-black px-2.5 py-2">
                    <div className="editor-label !mb-1">To</div>
                    <div className="font-mono text-[12px] text-aura-ink">
                      {toDetails.title}
                    </div>
                    <div className="mt-1 text-[11px] text-aura-muted">
                      {toDetails.detail}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-dashed border-white bg-black px-2.5 py-2.5 text-[11px] leading-4 text-aura-muted">
                  {selectedConnection.routePointsUm?.length
                    ? `${selectedConnection.routePointsUm.length} custom route points stored. Manual bends move freely with nearby-geometry snap.`
                    : "Automatic route. Double-click the wire on canvas to insert aligned bends."}
                </div>
              </div>

              <button
                type="button"
                onClick={() => clearConnectionRoutePoints(selectedConnection.id)}
                className="editor-action-button"
              >
                Reset route
              </button>

              <button
                type="button"
                onClick={() => removeConnection(selectedConnection.id)}
                className="editor-action-button"
              >
                <Trash2 className="h-4 w-4" />
                Delete wire
              </button>
            </div>
          </div>
        </aside>
      );
    }

    if (selectedJunction) {
      const attachedConnections = connections.filter(
        (connection) =>
          (connection.from.kind === "junction" &&
            connection.from.junctionId === selectedJunction.id) ||
          (connection.to.kind === "junction" && connection.to.junctionId === selectedJunction.id),
      );

      return (
        <aside className="studio-rail studio-rail-inspector">
          <div className="studio-rail-header border-b border-white px-3 py-3">
            <div className="studio-rail-head-inner flex items-start justify-between gap-3">
              <div>
                <p className="editor-eyebrow">Inspector</p>
                <h2 className="mt-1.5 font-sans text-[1rem] font-black uppercase tracking-[0.16em] text-white">
                  Junction
                </h2>
              </div>
              <UnitToggle displayUnit={displayUnit} onChange={setDisplayUnit} />
            </div>
          </div>

          <div className="studio-rail-scroll px-3 py-3">
            <div className="studio-rail-body-inner space-y-3">
              <div className="studio-section-card">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="editor-eyebrow">Selected Junction</p>
                  <span className="studio-pill">{selectedJunction.id}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="editor-label">X ({getDisplayUnitLabel(displayUnit)})</label>
                    <input
                      type="number"
                      step="any"
                      value={formatUmForInput(selectedJunction.xUm, displayUnit)}
                      onChange={(event) =>
                        updateJunction(selectedJunction.id, {
                          xUm: parseDisplayValueToUm(event.target.value, displayUnit),
                        })
                      }
                      className="editor-input"
                    />
                  </div>
                  <div>
                    <label className="editor-label">Y ({getDisplayUnitLabel(displayUnit)})</label>
                    <input
                      type="number"
                      step="any"
                      value={formatUmForInput(selectedJunction.yUm, displayUnit)}
                      onChange={(event) =>
                        updateJunction(selectedJunction.id, {
                          yUm: parseDisplayValueToUm(event.target.value, displayUnit),
                        })
                      }
                      className="editor-input"
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-dashed border-white bg-black px-2.5 py-2.5 text-[11px] leading-4 text-aura-muted">
                  {attachedConnections.length} attached connection
                  {attachedConnections.length === 1 ? "" : "s"}.
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeJunction(selectedJunction.id)}
                className="editor-action-button"
              >
                <Trash2 className="h-4 w-4" />
                Delete junction
              </button>
            </div>
          </div>
        </aside>
      );
    }

    const manifest = buildCircuitManifest({ components, junctions, connections });
    const workspaceGuidance =
      pendingDraft || pendingLibraryItemId
        ? {
            title: "Place the selected part",
            detail: `Click the stage to place ${pendingDraft?.title ?? "the selected part"}, then use this side to fine-tune it.`,
            state: "place",
          }
        : components.length === 0
          ? {
              title: "Nothing on stage yet",
              detail: "Choose the first part from the left library, place it, then start wiring from its pins.",
              state: "pick",
            }
          : connections.length === 0
            ? {
                title: "Ready for the first wire",
                detail: "Click one pin and then another to make the first connection, or click the part to rename or rotate it first.",
                state: "wire",
              }
            : {
                title: "Edit what is selected",
                detail: "Choose a part, wire, or junction on the stage to change it here without cluttering the layout.",
                state: "inspect",
              };
    return (
      <aside className="studio-rail studio-rail-inspector">
        <div className="studio-rail-header border-b border-white px-3 py-3">
          <div className="studio-rail-head-inner flex items-start justify-between gap-3">
            <div>
              <p className="editor-eyebrow">Inspector</p>
              <h2 className="mt-1.5 font-sans text-[1rem] font-black uppercase tracking-[0.16em] text-white">
                Next Step
              </h2>
            </div>
            <UnitToggle displayUnit={displayUnit} onChange={setDisplayUnit} />
          </div>
        </div>

        <div className="studio-rail-scroll px-3 py-3">
          <div className="studio-rail-body-inner space-y-3">
            <div className="studio-inline-note">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="editor-eyebrow">Stage Status</p>
                  <h3 className="mt-1 font-sans text-[0.9rem] font-black uppercase tracking-[0.14em] text-white">
                    {workspaceGuidance.title}
                  </h3>
                </div>
                <span className="studio-pill">{workspaceGuidance.state}</span>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-aura-muted">
                {workspaceGuidance.detail}
              </p>
            </div>

            <div className="studio-stat-grid">
              <SummaryCard label="Parts" value={components.length} />
              <SummaryCard label="Junctions" value={junctions.length} />
              <SummaryCard label="Wires" value={connections.length} />
              <SummaryCard label="Part Types" value={manifest.used_library_items.length} />
              <SummaryCard
                label="Grid"
                value={formatUmForDisplay(manifest.grid_unit_um, displayUnit)}
                secondaryValue={formatUmForDisplay(
                  manifest.grid_unit_um,
                  alternateDisplayUnit,
                )}
              />
              <SummaryCard label="Overlap" value={layoutHealth.overlapCount} />
              <SummaryCard label="Crowded" value={layoutHealth.crowdedCount} />
            </div>

            <details className="studio-disclosure">
              <summary className="studio-disclosure-summary">
                <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-aura-muted">
                  Layout Check
                  <HoverHint text="Tracks overlap and crowding so the stage stays readable before export." />
                </span>
                <span className="studio-pill !h-5 !px-2">
                  {layoutHealth.overlapCount > 0
                    ? "alert"
                    : layoutHealth.crowdedCount > 0
                      ? "warn"
                      : "clean"}
                </span>
              </summary>
              <div className="mt-3">
                {layoutHealth.overlapCount === 0 && layoutHealth.crowdedCount === 0 ? (
                  <div className="studio-list-note">
                    The current layout reads cleanly. Keep parts spaced enough that labels and wires can stay simple.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {layoutHealth.overlapCount > 0 ? (
                      <div className="studio-list-note">
                        {layoutHealth.overlapCount} overlap zone
                        {layoutHealth.overlapCount === 1 ? "" : "s"} detected. Parts are physically colliding on the stage.
                      </div>
                    ) : null}
                    {layoutHealth.crowdedCount > 0 ? (
                      <div className="studio-list-note">
                        {layoutHealth.crowdedCount} crowded zone
                        {layoutHealth.crowdedCount === 1 ? "" : "s"} detected. The stage is still readable, but spacing is getting tight.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </details>

            <details className="studio-disclosure">
              <summary className="studio-disclosure-summary">
                <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-aura-muted">
                  <FileJson className="h-4 w-4" />
                  Circuit JSON
                </span>
                <span className="studio-pill !h-5 !px-2">JSON</span>
              </summary>
              <textarea
                readOnly
                value={JSON.stringify(manifest, null, 2)}
                className="mt-3 h-[min(44vh,460px)] w-full resize-none rounded-lg border border-white bg-black px-2.5 py-2.5 font-mono text-[10px] leading-4 text-aura-ink outline-none"
              />
            </details>
          </div>
        </div>
      </aside>
    );
  }

  const libraryItem = getLibraryItem(selectedComponent.libraryItemId);
  const resolvedPackage = resolvePackageByItemId(
    selectedComponent.libraryItemId,
    selectedComponent.packageState,
  );
  const resizeBehavior = libraryItem.resizeBehavior;
  const resolvedColumnCount =
    selectedComponent.packageState.columnCount ??
    Math.max(1, Math.round(resolvedPackage.bodyWidthUm / 2540));
  const resolvedRowCount = Math.max(
    1,
    Math.round(resolvedPackage.pins.length / resolvedColumnCount),
  );
  const connectionCount = connections.filter(
    (connection) =>
      (connection.from.kind === "pin" && connection.from.componentId === selectedComponent.id) ||
      (connection.to.kind === "pin" && connection.to.componentId === selectedComponent.id),
  ).length;
  const selectedDraft = selectedComponent.sourceDraftId
    ? componentDrafts.find((draft) => draft.id === selectedComponent.sourceDraftId) ?? null
    : null;
  const pinPreview = resolvedPackage.pins.slice(0, 6);
  const remainingPinCount = Math.max(0, resolvedPackage.pins.length - pinPreview.length);
  const selectedComponentHealth = layoutHealth.issueLevelByComponent.get(selectedComponent.id) ?? null;
  const selectedRuntimeProfile = selectedComponent.runtimeProfile;
  const selectedRuntimeDefinition = selectedRuntimeProfile
    ? getRuntimeProfileDefinition(selectedRuntimeProfile.profileId)
    : null;
  const selectedWokwiBehavior = getWokwiBehaviorSupport(selectedComponent.libraryItemId);

  return (
    <aside className="studio-rail studio-rail-inspector">
      <div className="studio-rail-header border-b border-white px-3 py-3">
        <div className="studio-rail-head-inner">
          <div className="flex items-start justify-between gap-3">
            <p className="editor-eyebrow">Inspector</p>
            <UnitToggle displayUnit={displayUnit} onChange={setDisplayUnit} />
          </div>
          <div className="mt-1.5 rounded-xl border border-white bg-black p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="editor-eyebrow">Selected Part</p>
                  <HoverHint text={libraryItem.description} />
                </div>
                <h2 className="font-sans text-[0.95rem] font-black tracking-[0.12em] text-white">
                  {selectedComponent.reference}
                </h2>
                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                  {resolvedPackage.packageKey}
                </div>
              </div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white bg-black text-aura-ink">
                <Package2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-aura-muted">
              <span className="rounded-full border border-white/20 px-2 py-1">{libraryItem.seriesLabel}</span>
              <span className="rounded-full border border-white/20 px-2 py-1">{libraryItem.variantLabel}</span>
              <span className="rounded-full border border-white/20 px-2 py-1">{resolvedPackage.pins.length} pins</span>
              {libraryItem.circuitCategory ? (
                <span className="rounded-full border border-white/20 px-2 py-1">{libraryItem.circuitCategory}</span>
              ) : null}
              {libraryItem.source ? (
                <span className="rounded-full border border-white/20 px-2 py-1">{libraryItem.source}</span>
              ) : null}
              {selectedDraft ? (
                <span className="rounded-full border border-white/20 px-2 py-1">from draft</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="studio-rail-scroll px-3 py-3">
        <div className="studio-rail-body-inner space-y-3">
          <div className="studio-stat-grid">
            <SummaryCard label="Pins" value={resolvedPackage.pins.length} />
            <SummaryCard label="Wires" value={connectionCount} />
            <SummaryCard
              label="Size"
              value={formatUmPair(
                resolvedPackage.bodyWidthUm,
                resolvedPackage.bodyHeightUm,
                displayUnit,
              )}
              secondaryValue={formatUmPair(
                resolvedPackage.bodyWidthUm,
                resolvedPackage.bodyHeightUm,
                alternateDisplayUnit,
              )}
              className="col-span-2"
            />
          </div>

          {selectedComponentHealth ? (
            <div className="studio-inline-note">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="editor-eyebrow">Layout Warning</p>
                  <p className="mt-1 text-[10px] leading-4 text-aura-muted">
                    {selectedComponentHealth === "overlap"
                      ? "This part overlaps another part. Move it before trusting the layout."
                      : "This part sits in a crowded zone. Add spacing so labels and wires stay readable."}
                  </p>
                </div>
                <span className="studio-pill">
                  {selectedComponentHealth === "overlap" ? "alert" : "warn"}
                </span>
              </div>
            </div>
          ) : null}

          {selectedWokwiBehavior && selectedWokwiBehavior.status !== "static" ? (
            <div className="studio-inline-note">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="editor-eyebrow">Vendor Runtime</p>
                  <p className="mt-1 text-[10px] leading-4 text-aura-muted">
                    {selectedWokwiBehavior.summary}
                  </p>
                </div>
                <span className="studio-pill">
                  {selectedWokwiBehavior.status === "implemented" ? "ready" : "placeholder"}
                </span>
              </div>
            </div>
          ) : null}

          <div className="studio-section-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="editor-eyebrow">Name And Position</p>
              </div>
              <span className="studio-pill">{connectionCount} wires</span>
            </div>

            <label className="editor-label">Reference</label>
            <input
              type="text"
              value={selectedComponent.reference}
              onChange={(event) =>
                updateComponent(selectedComponent.id, {
                  reference: event.target.value.toUpperCase(),
                })
              }
              className="editor-input"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="editor-label">X ({getDisplayUnitLabel(displayUnit)})</label>
                <input
                  type="number"
                  step="any"
                  value={formatUmForInput(selectedComponent.xUm, displayUnit)}
                  onChange={(event) =>
                    updateComponent(selectedComponent.id, {
                      xUm: parseDisplayValueToUm(event.target.value, displayUnit),
                    })
                  }
                  className="editor-input"
                />
              </div>
              <div>
                <label className="editor-label">Y ({getDisplayUnitLabel(displayUnit)})</label>
                <input
                  type="number"
                  step="any"
                  value={formatUmForInput(selectedComponent.yUm, displayUnit)}
                  onChange={(event) =>
                    updateComponent(selectedComponent.id, {
                      yUm: parseDisplayValueToUm(event.target.value, displayUnit),
                    })
                  }
                  className="editor-input"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-1.5">
              <div>
                <label className="editor-label">Rotation</label>
                <div className="editor-input flex items-center justify-between !py-1.5">
                  <span>{selectedComponent.rotationDeg} deg</span>
                  <span className="text-[9px] uppercase tracking-[0.14em] text-aura-muted">
                    90 deg
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => rotateComponent(selectedComponent.id, -90)}
                className="inline-flex h-[34px] w-[34px] items-center justify-center self-end rounded-lg border border-white bg-black text-white transition hover:bg-white hover:text-black"
                title="Rotate left 90 degrees"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => rotateComponent(selectedComponent.id, 90)}
                className="inline-flex h-[34px] w-[34px] items-center justify-center self-end rounded-lg border border-white bg-black text-white transition hover:bg-white hover:text-black"
                title="Rotate right 90 degrees"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="studio-section-card">
            <div className="mb-3">
              <div className="flex items-center gap-1.5">
                <p className="editor-eyebrow">Size And Pins</p>
                <HoverHint text="Match the visible part to the real package instead of stretching it freely." />
              </div>
            </div>

            {libraryItem.resizeBehavior.mode !== "fixed" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="editor-label">
                    {resizeBehavior.mode === "linear-pin-step"
                      ? resizeBehavior.fixedRowCount != null
                        ? "Pins"
                        : "Rows"
                      : "Pins"}
                  </label>
                  <input
                    type="number"
                    step={resizeBehavior.pinStep ?? 1}
                    min={resizeBehavior.minPins ?? 1}
                    max={resizeBehavior.maxPins ?? 64}
                    value={
                      resizeBehavior.mode === "linear-pin-step"
                        ? resizeBehavior.fixedRowCount != null
                          ? resolvedPackage.pins.length
                          : resolvedRowCount
                        : selectedComponent.packageState.pinCount ?? resolvedPackage.pins.length
                    }
                    onChange={(event) => {
                      if (resizeBehavior.mode === "linear-pin-step") {
                        if (resizeBehavior.fixedRowCount != null) {
                          updateComponent(selectedComponent.id, {
                            packageState: {
                              ...selectedComponent.packageState,
                              pinCount: Math.max(1, Number(event.target.value) || 1),
                            },
                          });
                          return;
                        }

                        const rowCount = Math.max(1, Number(event.target.value) || 1);

                        updateComponent(selectedComponent.id, {
                          packageState: {
                            ...selectedComponent.packageState,
                            pinCount: rowCount * resolvedColumnCount,
                          },
                        });
                        return;
                      }

                      updateComponent(selectedComponent.id, {
                        packageState: {
                          ...selectedComponent.packageState,
                          pinCount: Number(event.target.value) || resolvedPackage.pins.length,
                        },
                      });
                    }}
                    className="editor-input"
                  />
                </div>

                {resizeBehavior.mode === "dip-step" ? (
                  <div>
                    <label className="editor-label">Width</label>
                    <select
                      value={selectedComponent.packageState.widthMode ?? "narrow"}
                      onChange={(event) =>
                        updateComponent(selectedComponent.id, {
                          packageState: {
                            ...selectedComponent.packageState,
                            widthMode:
                              event.target.value === "wide" ? "wide" : "narrow",
                          },
                        })
                      }
                      className="editor-input"
                    >
                      <option value="narrow">Narrow</option>
                      <option value="wide">Wide</option>
                    </select>
                  </div>
                ) : resizeBehavior.mode === "linear-pin-step" ? (
                  resizeBehavior.fixedRowCount != null ? (
                    <div className="rounded-lg border border-dashed border-white bg-black px-2.5 py-2.5 text-[11px] leading-4 text-aura-muted">
                      Single-row connector. Drag east or the corner to add positions.
                    </div>
                  ) : resizeBehavior.fixedColumnCount != null ? (
                    <div className="rounded-lg border border-dashed border-white bg-black px-2.5 py-2.5 text-[11px] leading-4 text-aura-muted">
                      {resizeBehavior.fixedColumnCount} columns fixed. Drag south or the corner to add rows.
                    </div>
                  ) : (
                    <div>
                      <label className="editor-label">Columns</label>
                      <input
                        type="number"
                        step={1}
                        min={1}
                        max={8}
                        value={resolvedColumnCount}
                        onChange={(event) => {
                          const nextColumns = Math.max(1, Number(event.target.value) || 1);

                          updateComponent(selectedComponent.id, {
                            packageState: {
                              ...selectedComponent.packageState,
                              columnCount: nextColumns,
                              widthUm: nextColumns * 2540,
                              pinCount: resolvedRowCount * nextColumns,
                            },
                          });
                        }}
                        className="editor-input"
                      />
                    </div>
                  )
                ) : resizeBehavior.mode === "mapped-pin-step" ? (
                  <div className="rounded-lg border border-dashed border-white bg-black px-2.5 py-2.5 text-[11px] leading-4 text-aura-muted">
                    Drag the corner to step through part sizes.
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-white bg-black px-2.5 py-2.5 text-[11px] leading-4 text-aura-muted">
                    Drag south edge to extend strip.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white bg-black px-2.5 py-2.5 text-[11px] leading-4 text-aura-muted">
                Fixed-size part.
              </div>
            )}
          </div>

          {selectedRuntimeProfile && selectedRuntimeDefinition ? (
            <div className="studio-section-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <p className="editor-eyebrow">Runtime State</p>
                  <HoverHint text="This is the part's editable state contract in Circuit Studio. It changes visible preview only for now, not full simulation." />
                </div>
                <span className="studio-pill">{selectedRuntimeDefinition.short}</span>
              </div>

              <label className="editor-label">Runtime Type</label>
              <select
                value={selectedRuntimeProfile.profileId}
                onChange={(event) =>
                  updateComponent(selectedComponent.id, {
                    runtimeProfile: {
                      ...selectedRuntimeProfile,
                      profileId: event.target.value as typeof selectedRuntimeProfile.profileId,
                    },
                  })
                }
                className="editor-input"
              >
                {RUNTIME_PROFILE_DEFINITIONS.filter((profile) => profile.id !== "none").map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>

              <div className="mt-3">
                <label className="editor-label">Signal Name</label>
                <input
                  type="text"
                  value={selectedRuntimeProfile.signalName}
                  onChange={(event) =>
                    updateComponent(selectedComponent.id, {
                      runtimeProfile: { ...selectedRuntimeProfile, signalName: event.target.value },
                    })
                  }
                  className="editor-input"
                />
              </div>

              {selectedRuntimeProfile.profileId === "light_output" ? (
                <>
                  <div className="mt-3">
                    <label className="editor-label">Light Color</label>
                    <input
                      type="color"
                      value={selectedRuntimeProfile.lightColor}
                      onChange={(event) =>
                        updateComponent(selectedComponent.id, {
                          runtimeProfile: { ...selectedRuntimeProfile, lightColor: event.target.value },
                        })
                      }
                      className="editor-color-input"
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="editor-label">Dim Level</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={selectedRuntimeProfile.lowVisual}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: {
                              ...selectedRuntimeProfile,
                              lowVisual: Number(event.target.value),
                            },
                          })
                        }
                        className="editor-slider"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Bright Level</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={selectedRuntimeProfile.highVisual}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: {
                              ...selectedRuntimeProfile,
                              highVisual: Number(event.target.value),
                            },
                          })
                        }
                        className="editor-slider"
                      />
                    </div>
                  </div>
                </>
              ) : null}

              {(selectedRuntimeProfile.profileId === "potentiometer" ||
                selectedRuntimeProfile.profileId === "servo_angle") ? (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <label className="editor-label">Min</label>
                      <input
                        type="number"
                        value={selectedRuntimeProfile.valueMin}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, valueMin: Number(event.target.value) },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Max</label>
                      <input
                        type="number"
                        value={selectedRuntimeProfile.valueMax}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, valueMax: Number(event.target.value) },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Current</label>
                      <input
                        type="number"
                        value={selectedRuntimeProfile.defaultValue}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, defaultValue: Number(event.target.value) },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <label className="editor-label">Angle Min</label>
                      <input
                        type="number"
                        value={selectedRuntimeProfile.angleMin}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, angleMin: Number(event.target.value) },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Angle Max</label>
                      <input
                        type="number"
                        value={selectedRuntimeProfile.angleMax}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, angleMax: Number(event.target.value) },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    {selectedRuntimeProfile.profileId === "potentiometer" ? (
                      <div>
                        <label className="editor-label">Detents</label>
                        <input
                          type="number"
                          min="0"
                          value={selectedRuntimeProfile.detentCount}
                          onChange={(event) =>
                            updateComponent(selectedComponent.id, {
                              runtimeProfile: {
                                ...selectedRuntimeProfile,
                                detentCount: Number(event.target.value),
                              },
                            })
                          }
                          className="editor-input"
                        />
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {(selectedRuntimeProfile.profileId === "slide_switch" ||
                selectedRuntimeProfile.profileId === "push_button") ? (
                <>
                  <div className="mt-3">
                    <label className="editor-label">Axis</label>
                    <div className="editor-segmented">
                      {(["x", "y"] as const).map((axis) => (
                        <button
                          key={axis}
                          type="button"
                          onClick={() =>
                            updateComponent(selectedComponent.id, {
                              runtimeProfile: { ...selectedRuntimeProfile, travelAxis: axis },
                            })
                          }
                          className={`editor-segment-button ${selectedRuntimeProfile.travelAxis === axis ? "editor-segment-button-active" : ""}`}
                        >
                          {axis}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <label className="editor-label">Travel Min</label>
                      <input
                        type="number"
                        value={selectedRuntimeProfile.travelMin}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, travelMin: Number(event.target.value) },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Travel Max</label>
                      <input
                        type="number"
                        value={selectedRuntimeProfile.travelMax}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, travelMax: Number(event.target.value) },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">
                        {selectedRuntimeProfile.profileId === "push_button" ? "Current State" : "Current"}
                      </label>
                      <div className="editor-segmented">
                        {[0, 1].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              updateComponent(selectedComponent.id, {
                                runtimeProfile: { ...selectedRuntimeProfile, defaultValue: value },
                              })
                            }
                            className={`editor-segment-button ${selectedRuntimeProfile.defaultValue === value ? "editor-segment-button-active" : ""}`}
                          >
                            {value === 0 ? selectedRuntimeProfile.offLabel : selectedRuntimeProfile.onLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <label className="editor-label">
                        {selectedRuntimeProfile.profileId === "push_button" ? "Idle Label" : "Off Label"}
                      </label>
                      <input
                        type="text"
                        value={selectedRuntimeProfile.offLabel}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, offLabel: event.target.value },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">
                        {selectedRuntimeProfile.profileId === "push_button" ? "Pressed Label" : "On Label"}
                      </label>
                      <input
                        type="text"
                        value={selectedRuntimeProfile.onLabel}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, onLabel: event.target.value },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">
                        {selectedRuntimeProfile.profileId === "push_button" ? "Release" : "Return"}
                      </label>
                      <div className="editor-segmented">
                        <button
                          type="button"
                          onClick={() =>
                            updateComponent(selectedComponent.id, {
                              runtimeProfile: { ...selectedRuntimeProfile, autoReset: false },
                            })
                          }
                          className={`editor-segment-button ${selectedRuntimeProfile.autoReset ? "" : "editor-segment-button-active"}`}
                        >
                          Latched
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateComponent(selectedComponent.id, {
                              runtimeProfile: { ...selectedRuntimeProfile, autoReset: true },
                            })
                          }
                          className={`editor-segment-button ${selectedRuntimeProfile.autoReset ? "editor-segment-button-active" : ""}`}
                        >
                          Spring
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              {selectedRuntimeProfile.profileId === "toggle_switch" ? (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <label className="editor-label">Off Label</label>
                      <input
                        type="text"
                        value={selectedRuntimeProfile.offLabel}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, offLabel: event.target.value },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">On Label</label>
                      <input
                        type="text"
                        value={selectedRuntimeProfile.onLabel}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, onLabel: event.target.value },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Current</label>
                      <div className="editor-segmented">
                        {[0, 1].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              updateComponent(selectedComponent.id, {
                                runtimeProfile: { ...selectedRuntimeProfile, defaultValue: value },
                              })
                            }
                            className={`editor-segment-button ${selectedRuntimeProfile.defaultValue === value ? "editor-segment-button-active" : ""}`}
                          >
                            {value === 0 ? selectedRuntimeProfile.offLabel : selectedRuntimeProfile.onLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="editor-label">Angle Min</label>
                      <input
                        type="number"
                        value={selectedRuntimeProfile.angleMin}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, angleMin: Number(event.target.value) },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Angle Max</label>
                      <input
                        type="number"
                        value={selectedRuntimeProfile.angleMax}
                        onChange={(event) =>
                          updateComponent(selectedComponent.id, {
                            runtimeProfile: { ...selectedRuntimeProfile, angleMax: Number(event.target.value) },
                          })
                        }
                        className="editor-input"
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <details className="studio-disclosure">
            <summary className="studio-disclosure-summary">
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-aura-muted">
                <Box className="h-4 w-4" />
                Pin Map
              </span>
              <span className="studio-pill !h-5 !px-2">{resolvedPackage.pins.length}</span>
            </summary>

            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {pinPreview.map((pin) => (
                  <div
                    key={pin.id}
                    className="flex items-center justify-between rounded-lg border border-white bg-black px-2.5 py-2 font-mono text-[11px] text-aura-ink"
                  >
                    <span>{pin.id}</span>
                    <span className="text-aura-muted">{pin.label}</span>
                  </div>
                ))}
              </div>

              {remainingPinCount > 0 ? (
                <div className="rounded-lg border border-dashed border-white/25 bg-black px-2.5 py-2 text-[10px] leading-4 text-aura-muted">
                  {remainingPinCount} more pins are available below. Open the full list only when
                  you need exact pin labels.
                </div>
              ) : null}

              <details className="studio-subdisclosure">
                <summary className="studio-subdisclosure-summary">
                  <span>Full pin list</span>
                  <span className="studio-pill !h-5 !px-2">expand</span>
                </summary>
                <div className="mt-2 max-h-[30vh] space-y-1.5 overflow-y-auto pr-1">
                  {resolvedPackage.pins.map((pin) => (
                    <div
                      key={pin.id}
                      className="flex items-center justify-between rounded-lg border border-white bg-black px-2.5 py-2 font-mono text-[11px] text-aura-ink"
                    >
                      <span>{pin.id}</span>
                      <span className="text-aura-muted">{pin.label}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </details>

          <button
            type="button"
            onClick={() => removeComponent(selectedComponent.id)}
            className="editor-action-button"
          >
            <Trash2 className="h-4 w-4" />
            Delete part
          </button>
        </div>
      </div>
    </aside>
  );
}

function UnitToggle({
  displayUnit,
  onChange,
}: {
  displayUnit: DisplayUnit;
  onChange: (displayUnit: DisplayUnit) => void;
}) {
  return (
    <div className="editor-segmented">
      <button
        type="button"
        onClick={() => onChange("mm")}
        className={`editor-segment-button ${displayUnit === "mm" ? "editor-segment-button-active" : ""}`.trim()}
      >
        mm
      </button>
      <button
        type="button"
        onClick={() => onChange("in")}
        className={`editor-segment-button ${displayUnit === "in" ? "editor-segment-button-active" : ""}`.trim()}
      >
        in
      </button>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  secondaryValue,
  className = "",
}: {
  label: string;
  value: number | string;
  secondaryValue?: string;
  className?: string;
}) {
  return (
    <div className={`studio-stat-card ${className}`.trim()}>
      <div className="editor-eyebrow">{label}</div>
      <div className="mt-1 font-mono text-[13px] leading-4 text-aura-ink">{value}</div>
      {secondaryValue ? (
        <div className="mt-1 font-mono text-[9px] leading-4 text-aura-muted">
          {secondaryValue}
        </div>
      ) : null}
    </div>
  );
}
