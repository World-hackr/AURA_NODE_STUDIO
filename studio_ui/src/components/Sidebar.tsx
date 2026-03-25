import { type MouseEvent, type ReactNode, useRef, useState } from "react";

import {
  Cable,
  ChevronDown,
  ChevronRight,
  Download,
  Microchip,
  PackageCheck,
  Plus,
  Power,
  Search,
  ToggleLeft,
  Trash2,
  X,
} from "lucide-react";

import {
  LIBRARY_FAMILIES,
  getLibraryItem,
  listLibrarySeriesByFamily,
  type LibraryItem,
  type PackageKind,
} from "../data/componentCatalog";
import { useEditorStore } from "../store/useEditorStore";
import { buildCircuitManifest } from "../utils/manifest";
import { HoverHint } from "./HoverHint";

function getFamilyAccentClass(familyId: string) {
  switch (familyId) {
    case "integrated":
      return "studio-family-card-integrated";
    case "connectors":
      return "studio-family-card-connectors";
    case "power":
      return "studio-family-card-power";
    case "discretes":
      return "studio-family-card-discretes";
    case "controls":
      return "studio-family-card-controls";
    default:
      return "";
  }
}

function getFamilyBadgeLabel(familyId: string) {
  switch (familyId) {
    case "integrated":
      return "logic";
    case "connectors":
      return "entry";
    case "power":
      return "rail";
    case "discretes":
      return "support";
    case "controls":
      return "input";
    default:
      return "family";
  }
}

function getFamilyIcon(familyId: string) {
  switch (familyId) {
    case "integrated":
      return Microchip;
    case "connectors":
      return Cable;
    case "power":
      return Power;
    case "discretes":
      return PackageCheck;
    case "controls":
      return ToggleLeft;
    default:
      return PackageCheck;
  }
}

function getPackageKindLabel(kind: PackageKind) {
  switch (kind) {
    case "dip":
      return "dip";
    case "soic":
      return "soic";
    case "qfp":
      return "qfp";
    case "sot23":
      return "sot23";
    case "chip2":
      return "chip";
    case "header":
      return "header";
    case "to220":
      return "to220";
    case "led":
      return "led";
    case "resistor":
      return "resistor";
    case "capacitor":
      return "capacitor";
    case "button":
      return "button";
    default:
      return "pkg";
  }
}

function getResizeLabel(item: LibraryItem) {
  switch (item.resizeBehavior.mode) {
    case "fixed":
      return "fixed";
    case "dip-step":
      return "pin steps";
    case "linear-pin-step":
      if (item.resizeBehavior.fixedRowCount != null) {
        return "add pins";
      }
      if (item.resizeBehavior.fixedColumnCount != null) {
        return "add rows";
      }
      return "rows cols";
    case "mapped-pin-step":
      return "size steps";
    default:
      return "sized";
  }
}

function getItemCue(item: LibraryItem) {
  const pinCount = item.package.pins.length;

  switch (item.package.kind) {
    case "dip":
      return `${pinCount} pin through-hole part`;
    case "soic":
    case "qfp":
    case "sot23":
      return `${pinCount} pin smd part`;
    case "header":
      return `${pinCount} contact connector grid`;
    case "chip2":
      return `two-terminal smd support part`;
    case "to220":
      return `${pinCount} lead power part`;
    case "led":
      return `${pinCount} lead indicator part`;
    case "resistor":
    case "capacitor":
      return `${pinCount} terminal support part`;
    case "button":
      return `${pinCount} contact input part`;
    default:
      return `${pinCount} pin part`;
  }
}

function downloadManifest() {
  const state = useEditorStore.getState();
  const manifest = buildCircuitManifest({
    components: state.components,
    junctions: state.junctions,
    connections: state.connections,
  });

  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "aura_circuit_manifest_v2.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function Sidebar({ modeSwitch }: { modeSwitch?: ReactNode }) {
  const asideRef = useRef<HTMLElement>(null);
  const clearAll = useEditorStore((state) => state.clearAll);
  const components = useEditorStore((state) => state.components);
  const connections = useEditorStore((state) => state.connections);
  const componentDrafts = useEditorStore((state) => state.componentDrafts);
  const pendingLibraryItemId = useEditorStore((state) => state.pendingLibraryItemId);
  const pendingDraftId = useEditorStore((state) => state.pendingDraftId);
  const setPendingLibraryItem = useEditorStore((state) => state.setPendingLibraryItem);
  const setPendingDraft = useEditorStore((state) => state.setPendingDraft);
  const selectComponent = useEditorStore((state) => state.selectComponent);
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
  const [expandedSeriesByFamily, setExpandedSeriesByFamily] = useState<Record<string, string | null>>({});
  const [searchValue, setSearchValue] = useState("");
  const [expandableOnly, setExpandableOnly] = useState(false);
  const [railTab, setRailTab] = useState<"library" | "tools">("library");
  const [hoveredDescription, setHoveredDescription] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);

  const showDescription = (
    event: MouseEvent<HTMLButtonElement>,
    description: string,
  ) => {
    const aside = asideRef.current;
    if (!aside) {
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const asideRect = aside.getBoundingClientRect();

    setHoveredDescription({
      text: description,
      top: buttonRect.top - asideRect.top,
      left: buttonRect.right - asideRect.left + 10,
    });
  };

  const hideDescription = () => {
    setHoveredDescription(null);
  };

  const clearArmedPlacement = () => {
    setPendingLibraryItem(null);
    setPendingDraft(null);
  };

  const toggleFamily = (familyId: string) => {
    setExpandedFamilyId((current) => (current === familyId ? null : familyId));
  };

  const toggleSeries = (familyId: string, seriesId: string) => {
    setExpandedSeriesByFamily((current) => ({
      ...current,
      [familyId]: current[familyId] === seriesId ? null : seriesId,
    }));
  };

  const armLibraryItem = (libraryItemId: string) => {
    setPendingLibraryItem(libraryItemId);
    selectComponent(null);
  };
  const armDraft = (draftId: string) => {
    setPendingDraft(draftId);
    selectComponent(null);
  };

  const searchQuery = searchValue.trim().toLowerCase();
  const familyEntries = LIBRARY_FAMILIES.map((family) => {
    const seriesList = listLibrarySeriesByFamily(family.id)
      .map((series) => {
        const scalableItems = expandableOnly
          ? series.items.filter((item) => item.resizeBehavior.mode !== "fixed")
          : series.items;

        if (scalableItems.length === 0) {
          return null;
        }

        const seriesMatches =
          searchQuery.length === 0 ||
          [family.label, series.label, series.description, series.referencePrefix]
            .join(" ")
            .toLowerCase()
            .includes(searchQuery);

        const matchingItems = scalableItems.filter((item) =>
          [
            item.title,
            item.seriesLabel,
            item.variantLabel,
            item.package.packageKey,
            item.referencePrefix,
            item.description,
          ]
            .join(" ")
            .toLowerCase()
            .includes(searchQuery),
        );

        const visibleItems =
          searchQuery.length === 0 ? scalableItems : seriesMatches ? scalableItems : matchingItems;

        if (visibleItems.length === 0) {
          return null;
        }

        return {
          ...series,
          scalable: series.items.some((item) => item.resizeBehavior.mode !== "fixed"),
          visibleItems,
        };
      })
      .filter((series): series is NonNullable<typeof series> => series != null);

    return {
      family,
      seriesList,
    };
  }).filter((entry) => entry.seriesList.length > 0);

  const visibleSeriesCount = familyEntries.reduce(
    (count, entry) => count + entry.seriesList.length,
    0,
  );
  const searchActive = searchQuery.length > 0;
  const defaultExpandedFamilyId =
    familyEntries.length === 1 ? familyEntries[0].family.id : familyEntries[0]?.family.id ?? null;
  const activeFamilyId = searchActive ? null : expandedFamilyId ?? defaultExpandedFamilyId;
  const pendingDraft = pendingDraftId
    ? componentDrafts.find((draft) => draft.id === pendingDraftId) ?? null
    : null;
  const starterItemIds = [
    "dip_body",
    "qfp_ic",
    "header_strip",
    "jst_ph",
    "resistor_0603",
    "button_tact_6mm",
  ] as const;
  const starterItems = starterItemIds.map((itemId) => getLibraryItem(itemId));
  const stageUsedItems = Array.from(
    new Map(
      components.map((component) => {
        const item = getLibraryItem(component.libraryItemId);
        return [
          component.libraryItemId,
          {
            id: item.id,
            title: item.title,
            packageKey: item.package.packageKey,
            referencePrefix: item.referencePrefix,
          },
        ];
      }),
    ).values(),
  ).slice(0, 6);
  const recentDrafts = [...componentDrafts]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);
  const armedTitle = pendingDraft
    ? pendingDraft.title
    : pendingLibraryItemId
      ? getLibraryItem(pendingLibraryItemId).title
      : null;
  return (
    <aside ref={asideRef} className="studio-rail studio-rail-left studio-rail-library">
      <div className="studio-rail-header border-b border-white px-3 py-3">
        <div className="studio-rail-head-inner">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="editor-eyebrow">Left Rail</p>
              <div className="mt-1.5 flex items-center gap-2">
                <h1 className="font-sans text-[0.95rem] font-black uppercase tracking-[0.16em] leading-none text-white">
                  Parts And Tools
                </h1>
                <HoverHint text="Use Library for choosing parts and Tools for quick actions, saved items, and export." />
              </div>
            </div>
            {modeSwitch ? <div>{modeSwitch}</div> : null}
          </div>

          <div className="studio-compact-status mt-3">
            <span className="studio-compact-status-chip">{components.length} parts</span>
            <span className="studio-compact-status-chip">{connections.length} wires</span>
            <span className="studio-compact-status-chip">{visibleSeriesCount} series</span>
          </div>
        </div>
      </div>

      <div className="studio-rail-tabbar">
        <button
          type="button"
          onClick={() => setRailTab("library")}
          className={`studio-rail-tab ${railTab === "library" ? "studio-rail-tab-active" : ""}`}
        >
          Library
        </button>
        <button
          type="button"
          onClick={() => setRailTab("tools")}
          className={`studio-rail-tab ${railTab === "tools" ? "studio-rail-tab-active" : ""}`}
        >
          Tools
        </button>
      </div>

      {railTab === "library" ? (
      <div className="border-b border-white px-3 py-2">
        <div className="studio-rail-body-inner space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <p className="editor-eyebrow">Part Library</p>
              <HoverHint text="Search by family, series, package name, description, or reference prefix." />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-aura-muted">
              {visibleSeriesCount} series
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-aura-muted" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search parts"
              className="editor-input !py-1.5 !pl-8 !pr-8 !text-[11px]"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => setSearchValue("")}
                className="absolute right-2 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md border border-white/15 bg-black text-aura-muted transition hover:border-white hover:text-white"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setExpandableOnly((value) => !value)}
              className={`inline-flex h-6 items-center justify-center rounded-full border px-2.5 font-mono text-[9px] uppercase tracking-[0.14em] transition ${
                expandableOnly
                  ? "border-white bg-white text-black"
                  : "border-white/35 bg-black text-aura-muted hover:border-white hover:text-white"
              }`}
            >
              Expandable
            </button>
            <HoverHint text="Expandable shows part families that can grow by pins, rows, columns, or size steps." />
          </div>

          {(pendingDraftId || pendingLibraryItemId) && armedTitle ? (
            <div className="rounded-xl border border-white/20 bg-white/[0.03] px-2.5 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="editor-eyebrow">Ready To Place</div>
                  <div className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-white">
                    {armedTitle}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearArmedPlacement}
                  className="inline-flex h-6 items-center justify-center rounded-md border border-white/20 px-2 font-mono text-[8px] uppercase tracking-[0.14em] text-aura-muted transition hover:border-white hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}

      <div
        className="studio-rail-scroll px-3 py-3"
        onScroll={hideDescription}
      >
        <div className="studio-rail-body-inner space-y-2.5">
          {railTab === "library" ? (
            <>
          {familyEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/25 bg-black/60 px-3 py-4 text-center">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white">
                No matches
              </div>
              <div className="mt-1 text-[11px] leading-4 text-aura-muted">
                Try a broader search or turn off the expandable filter.
              </div>
            </div>
          ) : null}

          {familyEntries.map(({ family, seriesList }) => {
            const familyExpanded = searchActive || activeFamilyId === family.id;

            return (
              <section
                key={family.id}
                className={`studio-family-card ${getFamilyAccentClass(family.id)}`.trim()}
              >
                <button
                  type="button"
                  onClick={() => toggleFamily(family.id)}
                  className="studio-family-card-head studio-family-card-head-button"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="studio-family-icon">
                      {(() => {
                        const FamilyIcon = getFamilyIcon(family.id);
                        return <FamilyIcon className="h-4 w-4" />;
                      })()}
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="editor-eyebrow">{family.label}</p>
                      <p className="mt-1 text-[10px] leading-4 text-aura-muted">
                        {family.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="flex flex-col items-end gap-1">
                      <span className="studio-pill">{seriesList.length}</span>
                      <span className="studio-family-badge">{getFamilyBadgeLabel(family.id)}</span>
                    </div>
                    <span className="studio-family-chevron">
                      {familyExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>
                </button>

                {familyExpanded ? (
                  <div className="space-y-1.5 px-2 py-2">
                    {seriesList.map((series) => {
                  const isExpandableGroup = series.items.length > 1;
                  const isExpanded =
                    searchActive ? true : expandedSeriesByFamily[family.id] === series.id;
                  const leadItem = series.visibleItems[0];

                  if (!isExpandableGroup) {
                    return (
                      <button
                        key={leadItem.id}
                        type="button"
                        onClick={() => armLibraryItem(leadItem.id)}
                        onMouseEnter={(event) => showDescription(event, leadItem.description)}
                        onMouseLeave={hideDescription}
                        className="studio-item-card group"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="min-w-0">
                            <div className="truncate font-mono text-[11px] leading-4 text-aura-ink group-hover:text-black">
                              {leadItem.seriesLabel}
                            </div>
                            <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white group-hover:text-black/70">
                              {leadItem.variantLabel}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {leadItem.resizeBehavior.mode !== "fixed" ? (
                              <span className="studio-pill !h-5 !min-w-0 !px-2 !text-[8px]">
                                Expand
                              </span>
                            ) : null}
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white bg-black text-aura-ink transition group-hover:border-black group-hover:bg-black group-hover:text-white">
                              <Plus className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                        <div className="studio-item-badges">
                          <span className="studio-item-badge">{getPackageKindLabel(leadItem.package.kind)}</span>
                          <span className="studio-item-badge">{leadItem.package.pins.length} pins</span>
                          <span className="studio-item-badge">{getResizeLabel(leadItem)}</span>
                        </div>
                        <div className="studio-item-cue">
                          <span>{getItemCue(leadItem)}</span>
                          <span>{leadItem.referencePrefix} prefix</span>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={series.id}
                      className="rounded-lg border border-white/25 bg-[#121212] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                      onMouseLeave={hideDescription}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSeries(family.id, series.id)}
                        onMouseEnter={(event) => showDescription(event, series.description)}
                        className="group flex w-full items-start justify-between gap-2.5 bg-white/[0.03] px-2.5 py-2 text-left transition hover:bg-white hover:text-black"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px] leading-4 text-aura-ink group-hover:text-black">
                            {series.label}
                          </div>
                          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white group-hover:text-black/70">
                            {series.visibleItems.length === series.items.length
                              ? `${series.items.length} variants`
                              : `${series.visibleItems.length} matches`}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="studio-item-badge">{getPackageKindLabel(leadItem.package.kind)}</span>
                            <span className="studio-item-badge">{leadItem.package.pins.length} pins</span>
                            <span className="studio-item-badge">{getResizeLabel(leadItem)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {series.scalable ? (
                            <span className="studio-pill !h-5 !min-w-0 !px-2 !text-[8px]">
                              Expand
                            </span>
                          ) : null}
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-aura-muted group-hover:text-black/70">
                            {series.referencePrefix}
                          </span>
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white bg-black text-aura-ink transition group-hover:border-black group-hover:bg-black group-hover:text-white">
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </span>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="border-t border-white/15 bg-black/45 px-2 py-1.5">
                          <div className="space-y-1.5">
                            {series.visibleItems.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => armLibraryItem(item.id)}
                                onMouseEnter={(event) => showDescription(event, item.description)}
                                className="studio-item-card group"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-mono text-[10px] leading-4 text-aura-ink group-hover:text-black">
                                    {item.variantLabel}
                                  </div>
                                  <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-aura-muted group-hover:text-black/70">
                                    {item.package.packageKey}
                                  </div>
                                  <div className="studio-item-badges">
                                    <span className="studio-item-badge">{getPackageKindLabel(item.package.kind)}</span>
                                    <span className="studio-item-badge">{item.package.pins.length} pins</span>
                                    <span className="studio-item-badge">{getResizeLabel(item)}</span>
                                  </div>
                                  <div className="studio-item-cue">
                                    <span>{getItemCue(item)}</span>
                                  </div>
                                </div>
                                <div className="ml-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-aura-muted group-hover:text-black/70">
                                  <span>{item.referencePrefix}</span>
                                  <Plus className="h-3 w-3" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
            </>
          ) : (
            <>
              <section className="studio-section-card">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <p className="editor-eyebrow">Stage Tools</p>
                    <HoverHint text="Quick actions for export, reset, and reusable picks." />
                  </div>
                  <span className="studio-pill">tools</span>
                </div>
                <div className="studio-compact-action-grid">
                  <button
                    onClick={downloadManifest}
                    className="editor-action-button editor-action-button-success !px-2 !py-1.5 !text-[11px]"
                    title="Export JSON"
                  >
                    <Download className="h-3.5 w-3.5" /> JSON
                  </button>
                  <button
                    onClick={clearAll}
                    className="editor-action-button editor-action-button-danger !px-2 !py-1.5 !text-[11px]"
                    title="Clear All"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </button>
                </div>
              </section>
            </>
          )}

          {railTab === "tools" ? (
          <details className="studio-disclosure studio-utility-disclosure" open>
            <summary className="studio-disclosure-summary">
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-aura-muted">
                Quick Access
              </span>
              <span className="studio-pill !h-5 !px-2">tools</span>
            </summary>

            <div className="mt-3 space-y-2.5">
              <section className="studio-section-card">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <p className="editor-eyebrow">Starter Picks</p>
                    <HoverHint text="Common entry points for boards, connectors, and support parts." />
                  </div>
                  <span className="studio-pill">start</span>
                </div>

                <div className="space-y-1.5">
                  {starterItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => armLibraryItem(item.id)}
                      onMouseEnter={(event) => showDescription(event, item.description)}
                      onMouseLeave={hideDescription}
                      className="studio-quick-row"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[10px] leading-4 text-aura-ink">
                          {item.title}
                        </div>
                        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-aura-muted">
                          {item.package.packageKey}
                        </div>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-aura-muted">
                          {item.referencePrefix}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {stageUsedItems.length > 0 ? (
                <section className="studio-section-card">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <p className="editor-eyebrow">Reuse On This Stage</p>
                      <HoverHint text="Quick-place parts already present in the current layout." />
                    </div>
                    <span className="studio-pill">reuse</span>
                  </div>

                  <div className="space-y-1.5">
                    {stageUsedItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => armLibraryItem(item.id)}
                        className="studio-quick-row"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[10px] leading-4 text-aura-ink">
                            {item.title}
                          </div>
                          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-aura-muted">
                            {item.packageKey}
                          </div>
                        </div>
                        <div className="ml-3 shrink-0 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-aura-muted">
                          {item.referencePrefix}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {recentDrafts.length > 0 ? (
                <section className="studio-section-card">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <p className="editor-eyebrow">Saved Drafts</p>
                      <HoverHint text="Bring reusable custom parts back onto the stage quickly." />
                    </div>
                    <span className="studio-pill">drafts</span>
                  </div>

                  <div className="space-y-1.5">
                    {recentDrafts.map((draft) => {
                      const item = getLibraryItem(draft.libraryItemId);

                      return (
                        <button
                          key={draft.id}
                          type="button"
                          onClick={() => armDraft(draft.id)}
                          className="studio-quick-row"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-mono text-[10px] leading-4 text-aura-ink">
                              {draft.title}
                            </div>
                            <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-aura-muted">
                              {item.package.packageKey}
                            </div>
                          </div>
                          <div className="ml-3 shrink-0 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-aura-muted">
                            draft
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>
          </details>
          ) : null}
        </div>
      </div>

      {hoveredDescription ? (
        <div
          className="pointer-events-none absolute z-[80] w-[260px] rounded-md border border-white/70 bg-black/78 px-3 py-1 text-[10px] leading-[1.25] text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm"
          style={{
            top: hoveredDescription.top,
            left: hoveredDescription.left,
          }}
        >
          {hoveredDescription.text}
        </div>
      ) : null}
    </aside>
  );
}
