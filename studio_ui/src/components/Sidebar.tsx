import { type MouseEvent, type ReactNode, useMemo, useRef, useState } from "react";

import {
  Cable,
  ChevronRight,
  Cpu,
  Download,
  Lightbulb,
  Microchip,
  PlugZap,
  Power,
  RotateCw,
  Search,
  ToggleLeft,
  Trash2,
  Waypoints,
  X,
} from "lucide-react";

import {
  CIRCUIT_CATEGORIES,
  getLibraryItem,
  listCircuitLibraryItemsByCategory,
  type CircuitCategoryId,
  type LibraryItem,
} from "../data/componentCatalog";
import { useEditorStore } from "../store/useEditorStore";
import { buildCircuitManifest } from "../utils/manifest";
import { HoverHint } from "./HoverHint";

function getCategoryIcon(categoryId: CircuitCategoryId) {
  switch (categoryId) {
    case "symbols":
      return Waypoints;
    case "boards":
      return Cpu;
    case "microcontrollers":
      return Cpu;
    case "timers_logic":
      return Microchip;
    case "passives":
      return PlugZap;
    case "indicators":
      return Lightbulb;
    case "displays":
      return Lightbulb;
    case "sensors":
      return Waypoints;
    case "modules":
      return PlugZap;
    case "power":
      return Power;
    case "actuators":
      return RotateCw;
    case "connectors":
      return Cable;
    case "switches":
      return ToggleLeft;
    default:
      return Microchip;
  }
}

function getSourceLabel(item: LibraryItem) {
  switch (item.source) {
    case "wokwi":
      return "wokwi";
    case "kicad":
      return "kicad";
    case "blend":
      return "blend";
    default:
      return "aura";
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
  if (item.circuitCategory === "symbols") {
    return "net symbol for cleaner routing";
  }
  if (item.circuitCategory === "boards") {
    return `${pinCount} exposed board pins`;
  }
  if (item.circuitCategory === "microcontrollers") {
    return `${pinCount} pin concrete controller`;
  }
  if (item.circuitCategory === "timers_logic") {
    return `${pinCount} pin concrete logic/timer part`;
  }
  if (item.circuitCategory === "connectors") {
    return `${pinCount} contact board connector`;
  }
  if (item.circuitCategory === "switches") {
    return `${pinCount} contact input part`;
  }
  if (item.circuitCategory === "power") {
    return `${pinCount} terminal power-stage part`;
  }
  if (item.circuitCategory === "actuators") {
    return `${pinCount} terminal motion or output part`;
  }
  if (item.circuitCategory === "indicators") {
    return `${pinCount} terminal indicator or diode`;
  }
  if (item.circuitCategory === "displays") {
    return `${pinCount} display/module pins`;
  }
  if (item.circuitCategory === "sensors") {
    return `${pinCount} sensor/module pins`;
  }
  if (item.circuitCategory === "modules") {
    return `${pinCount} peripheral/module pins`;
  }
  return `${pinCount} terminal support part`;
}

function matchesCircuitSearch(item: LibraryItem, searchQuery: string) {
  if (!searchQuery) {
    return true;
  }

  return [
    item.title,
    item.seriesLabel,
    item.variantLabel,
    item.package.packageKey,
    item.referencePrefix,
    item.description,
    ...(item.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .includes(searchQuery);
}

function groupItemsBySeries(items: LibraryItem[]) {
  const groups = new Map<string, { label: string; items: LibraryItem[] }>();

  for (const item of items) {
    const existing = groups.get(item.seriesId);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(item.seriesId, {
      label: item.seriesLabel,
      items: [item],
    });
  }

  return Array.from(groups.values());
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
  const [searchValue, setSearchValue] = useState("");
  const [railTab, setRailTab] = useState<"library" | "tools">("library");
  const [activeCategoryId, setActiveCategoryId] = useState<CircuitCategoryId>("boards");
  const [hoveredDescription, setHoveredDescription] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);

  const showDescription = (event: MouseEvent<HTMLButtonElement>, description: string) => {
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

  const armLibraryItem = (libraryItemId: string) => {
    setPendingLibraryItem(libraryItemId);
    selectComponent(null);
  };

  const armDraft = (draftId: string) => {
    setPendingDraft(draftId);
    selectComponent(null);
  };

  const searchQuery = searchValue.trim().toLowerCase();
  const activeCategory =
    CIRCUIT_CATEGORIES.find((category) => category.id === activeCategoryId) ?? CIRCUIT_CATEGORIES[0];

  const visibleCategorySections = useMemo(() => {
    if (searchQuery) {
      return CIRCUIT_CATEGORIES.map((category) => {
        const items = listCircuitLibraryItemsByCategory(category.id).filter((item) =>
          matchesCircuitSearch(item, searchQuery),
        );
        return { category, items };
      }).filter((entry) => entry.items.length > 0);
    }

    return [
      {
        category: activeCategory,
        items: listCircuitLibraryItemsByCategory(activeCategory.id),
      },
    ];
  }, [activeCategory, searchQuery]);

  const visibleItemCount = visibleCategorySections.reduce(
    (count, section) => count + section.items.length,
    0,
  );

  const pendingDraft = pendingDraftId
    ? componentDrafts.find((draft) => draft.id === pendingDraftId) ?? null
    : null;

  const starterItemIds = [
    "gnd_symbol",
    "power_5v_symbol",
    "arduino_nano",
    "arduino_uno",
    "ne555_dip8",
    "potentiometer_knob",
    "slide_switch_spdt",
    "servo_micro",
    "lcd1602",
    "ssd1306",
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
            source: getSourceLabel(item),
          },
        ];
      }),
    ).values(),
  ).slice(0, 8);

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
                  Circuit Library
                </h1>
                <HoverHint text="Circuit Studio now prefers real parts and power symbols over generic package bodies." />
              </div>
            </div>
            {modeSwitch ? <div>{modeSwitch}</div> : null}
          </div>

          <div className="studio-compact-status mt-3">
            <span className="studio-compact-status-chip">{components.length} parts</span>
            <span className="studio-compact-status-chip">{connections.length} wires</span>
            <span className="studio-compact-status-chip">{visibleItemCount} visible</span>
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
          <div className="studio-rail-body-inner space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <p className="editor-eyebrow">Choose Parts</p>
                <HoverHint text="Browse by function first. Search spans titles, package keys, descriptions, and keywords." />
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-aura-muted">
                {searchQuery ? "search" : activeCategory.shortLabel}
              </span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-aura-muted" />
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search real parts and symbols"
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

            <div className="studio-category-strip">
              {CIRCUIT_CATEGORIES.map((category) => {
                const CategoryIcon = getCategoryIcon(category.id);
                const active = !searchQuery && activeCategory.id === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategoryId(category.id)}
                    className={`studio-category-tab ${active ? "studio-category-tab-active" : ""}`}
                    title={category.label}
                  >
                    {CategoryIcon ? (
                      <CategoryIcon className="h-4 w-4" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="studio-inline-note">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="editor-eyebrow">
                    {searchQuery ? "Search Results" : activeCategory.label}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-aura-muted">
                    {searchQuery
                      ? `Showing matches across the circuit library.`
                      : activeCategory.description}
                  </p>
                </div>
                <span className="studio-pill">{visibleItemCount}</span>
              </div>
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

      <div className="studio-rail-scroll px-3 py-3" onScroll={hideDescription}>
        <div className="studio-rail-body-inner space-y-3">
          {railTab === "library" ? (
            <>
              {visibleCategorySections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/25 bg-black/60 px-3 py-4 text-center">
                  <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white">
                    No matches
                  </div>
                  <div className="mt-1 text-[11px] leading-4 text-aura-muted">
                    Try a broader search or switch back to category browsing.
                  </div>
                </div>
              ) : null}

              {visibleCategorySections.map(({ category, items }) => (
                <section key={category.id} className="studio-section-card">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="studio-family-icon">
                        {(() => {
                          const CategoryIcon = getCategoryIcon(category.id);
                          return CategoryIcon ? <CategoryIcon className="h-4 w-4" /> : null;
                        })()}
                      </div>
                      <div>
                        <p className="editor-eyebrow">{category.label}</p>
                        <p className="mt-1 text-[10px] leading-4 text-aura-muted">
                          {searchQuery ? `${items.length} matching part${items.length === 1 ? "" : "s"}.` : category.description}
                        </p>
                      </div>
                    </div>
                    <span className="studio-pill">{items.length}</span>
                  </div>

                  <div className="space-y-2">
                    {groupItemsBySeries(items).map((group) => (
                      <div key={`${category.id}-${group.label}`} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 px-1">
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                            {group.label}
                          </p>
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-aura-muted">
                            {group.items.length}
                          </span>
                        </div>

                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => armLibraryItem(item.id)}
                            onMouseEnter={(event) => showDescription(event, item.description)}
                            onMouseLeave={hideDescription}
                            className="studio-item-card group"
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="min-w-0">
                                <div className="truncate font-mono text-[11px] leading-4 text-aura-ink group-hover:text-black">
                                  {item.title}
                                </div>
                                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white group-hover:text-black/70">
                                  {item.variantLabel}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <span className="studio-pill !h-5 !min-w-0 !px-2 !text-[8px]">
                                  {getSourceLabel(item)}
                                </span>
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white bg-black text-aura-ink transition group-hover:border-black group-hover:bg-black group-hover:text-white">
                                  <ChevronRight className="h-3 w-3" />
                                </span>
                              </div>
                            </div>
                            <div className="studio-item-badges">
                              <span className="studio-item-badge">{item.package.packageKey}</span>
                              <span className="studio-item-badge">{item.package.pins.length} pins</span>
                              <span className="studio-item-badge">{getResizeLabel(item)}</span>
                            </div>
                            <div className="studio-item-cue">
                              <span>{getItemCue(item)}</span>
                              <span>{item.referencePrefix} prefix</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
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

              <section className="studio-section-card">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <p className="editor-eyebrow">Starter Picks</p>
                    <HoverHint text="Real parts and symbols that match the new circuit-first library direction." />
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
                          {getSourceLabel(item)}
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
                          {item.source}
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
            </>
          )}
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
