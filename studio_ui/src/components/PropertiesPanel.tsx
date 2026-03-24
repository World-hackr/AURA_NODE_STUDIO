import { Box, FileJson, Package2, RotateCcw, RotateCw, Trash2 } from "lucide-react";

import {
  getLibraryItem,
  resolvePackageByItemId,
} from "../data/componentCatalog";
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
  const selectedComponentId = useEditorStore((state) => state.selectedComponentId);
  const selectedJunctionId = useEditorStore((state) => state.selectedJunctionId);
  const selectedConnectionId = useEditorStore((state) => state.selectedConnectionId);
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

  const selectedComponent =
    components.find((component) => component.id === selectedComponentId) ?? null;
  const selectedJunction = selectedJunctionId
    ? junctions.find((junction) => junction.id === selectedJunctionId) ?? null
    : null;
  const selectedConnection = selectedConnectionId
    ? connections.find((connection) => connection.id === selectedConnectionId) ?? null
    : null;
  if (!selectedComponent) {
    if (selectedConnection) {
      const fromDetails = getEndpointDetails(selectedConnection.from, components);
      const toDetails = getEndpointDetails(selectedConnection.to, components);

      return (
        <aside className="studio-rail">
          <div className="studio-rail-header border-b border-white px-3 py-3">
            <div className="studio-rail-head-inner flex items-start justify-between gap-3">
              <div>
                <p className="editor-eyebrow">Inspector</p>
                <h2 className="mt-1.5 font-sans text-[1rem] font-black uppercase tracking-[0.16em] text-white">
                  Net
                </h2>
              </div>
              <UnitToggle displayUnit={displayUnit} onChange={setDisplayUnit} />
            </div>
          </div>

          <div className="studio-rail-scroll px-3 py-3">
            <div className="studio-rail-body-inner space-y-3">
              <div className="studio-section-card">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="editor-eyebrow">Selected Net</p>
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
                Delete net
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
        <aside className="studio-rail">
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

    return (
      <aside className="studio-rail">
        <div className="studio-rail-header border-b border-white px-3 py-3">
            <div className="studio-rail-head-inner flex items-start justify-between gap-3">
            <div>
              <p className="editor-eyebrow">Inspector</p>
              <h2 className="mt-1.5 font-sans text-[1rem] font-black uppercase tracking-[0.16em] text-white">
                Workspace Summary
              </h2>
            </div>
            <UnitToggle displayUnit={displayUnit} onChange={setDisplayUnit} />
          </div>
        </div>

        <div className="studio-rail-scroll px-3 py-3">
            <div className="studio-rail-body-inner space-y-3">
            <div className="studio-stat-grid">
              <SummaryCard label="Components" value={components.length} />
              <SummaryCard label="Junctions" value={junctions.length} />
              <SummaryCard label="Connections" value={connections.length} />
              <SummaryCard
                label="Used Library"
                value={manifest.used_library_items.length}
              />
              <SummaryCard
                label="Grid"
                value={formatUmForDisplay(manifest.grid_unit_um, displayUnit)}
                secondaryValue={formatUmForDisplay(
                  manifest.grid_unit_um,
                  alternateDisplayUnit,
                )}
              />
            </div>

            <div className="studio-section-card">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-aura-muted">
                <FileJson className="h-4 w-4" />
                Manifest Preview
              </div>
              <textarea
                readOnly
                value={JSON.stringify(manifest, null, 2)}
                className="mt-3 h-[min(50vh,540px)] w-full resize-none rounded-lg border border-white bg-black px-2.5 py-2.5 font-mono text-[10px] leading-4 text-aura-ink outline-none"
              />
            </div>
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

  return (
    <aside className="studio-rail">
      <div className="studio-rail-header border-b border-white px-3 py-3">
        <div className="studio-rail-head-inner">
          <div className="flex items-start justify-between gap-3">
            <p className="editor-eyebrow">Inspector</p>
            <UnitToggle displayUnit={displayUnit} onChange={setDisplayUnit} />
          </div>
          <div className="mt-1.5 rounded-xl border border-white bg-black p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
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
            <p className="mt-1.5 text-[10px] leading-4 text-aura-muted">
              {libraryItem.description}
            </p>
          </div>
        </div>
      </div>

      <div className="studio-rail-scroll px-3 py-3">
        <div className="studio-rail-body-inner space-y-3">
          <div className="studio-section-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="editor-eyebrow">Placement</p>
              </div>
              <span className="studio-pill">{connectionCount} nets</span>
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
              <p className="editor-eyebrow">Package</p>
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
                    Drag the corner to step through package sizes.
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-white bg-black px-2.5 py-2.5 text-[11px] leading-4 text-aura-muted">
                    Drag south edge to extend strip.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white bg-black px-2.5 py-2.5 text-[11px] leading-4 text-aura-muted">
                Fixed-size package.
              </div>
            )}
          </div>

          <div className="studio-stat-grid">
            <SummaryCard label="Pins" value={resolvedPackage.pins.length} />
            <SummaryCard label="Nets" value={connectionCount} />
            <SummaryCard
              label="Body"
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

          <div className="studio-section-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-aura-muted">
              <Box className="h-4 w-4" />
              Pin Map
            </div>
            <div className="mt-3 max-h-[36vh] space-y-1.5 overflow-y-auto pr-1">
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
          </div>

          <button
            type="button"
            onClick={() => removeComponent(selectedComponent.id)}
            className="editor-action-button"
          >
            <Trash2 className="h-4 w-4" />
            Delete component
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
