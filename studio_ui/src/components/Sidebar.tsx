import { type MouseEvent, type ReactNode, useRef, useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  Download,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  LIBRARY_FAMILIES,
  listLibrarySeriesByFamily,
} from "../data/componentCatalog";
import { useEditorStore } from "../store/useEditorStore";
import { buildCircuitManifest } from "../utils/manifest";

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
  const setPendingLibraryItem = useEditorStore((state) => state.setPendingLibraryItem);
  const selectComponent = useEditorStore((state) => state.selectComponent);
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>({});
  const [searchValue, setSearchValue] = useState("");
  const [expandableOnly, setExpandableOnly] = useState(false);
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

  const toggleSeries = (seriesId: string) => {
    setExpandedSeries((current) => ({
      ...current,
      [seriesId]: !current[seriesId],
    }));
  };

  const armLibraryItem = (libraryItemId: string) => {
    setPendingLibraryItem(libraryItemId);
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
  return (
    <aside ref={asideRef} className="studio-rail studio-rail-left studio-rail-library">
      <div className="studio-rail-header border-b border-white px-3 py-3">
        <div className="studio-rail-head-inner">
          <div className="min-w-0">
            <p className="editor-eyebrow">Circuit Studio</p>
            <h1 className="mt-1.5 font-sans text-[0.95rem] font-black uppercase tracking-[0.16em] leading-none text-white">
              Circuit Library
            </h1>
          </div>
          {modeSwitch ? <div className="mt-2">{modeSwitch}</div> : null}
        </div>
      </div>

      <div className="border-b border-white px-3 py-2">
        <div className="studio-rail-body-inner">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-white bg-black px-2 py-1.5">
              <div className="editor-eyebrow">Placed</div>
              <div className="mt-1 font-mono text-[15px] leading-none text-aura-ink">
                {components.length}
              </div>
            </div>
            <div className="rounded-lg border border-white bg-black px-2 py-1.5">
              <div className="editor-eyebrow">Nets</div>
              <div className="mt-1 font-mono text-[15px] leading-none text-aura-ink">
                {connections.length}
              </div>
            </div>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <button
              onClick={downloadManifest}
              className="editor-action-button !px-2 !py-1.5 !text-[11px]"
              title="Export Manifest"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={clearAll}
              className="editor-action-button border-red-400/50 text-red-400 hover:bg-red-400 hover:text-black !px-2 !py-1.5 !text-[11px]"
              title="Clear All"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-white px-3 py-2">
        <div className="studio-rail-body-inner space-y-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-aura-muted" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search components"
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
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-aura-muted">
              {visibleSeriesCount} series
            </span>
          </div>
        </div>
      </div>

      <div
        className="studio-rail-scroll studio-rail-scroll-left px-3 py-3"
        onScroll={hideDescription}
      >
        <div className="studio-rail-body-inner space-y-2.5">
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

          {familyEntries.map(({ family, seriesList }) => (
            <section
              key={family.id}
              className="overflow-hidden rounded-xl border border-white/40 bg-[#0a0a0a] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/15 bg-white/[0.04] px-3 py-2">
                <p className="editor-eyebrow">{family.label}</p>
                <span className="studio-pill">{seriesList.length}</span>
              </div>

              <div className="space-y-1.5 px-2 py-2">
                  {seriesList.map((series) => {
                  const isExpandableGroup = series.items.length > 1;
                  const isExpanded =
                    searchQuery.length > 0 ? true : expandedSeries[series.id] ?? false;
                  const leadItem = series.visibleItems[0];

                  if (!isExpandableGroup) {
                    return (
                      <button
                        key={leadItem.id}
                        type="button"
                        onClick={() => armLibraryItem(leadItem.id)}
                        onMouseEnter={(event) => showDescription(event, leadItem.description)}
                        onMouseLeave={hideDescription}
                        className="group w-full rounded-lg border border-white/25 bg-[#121212] px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-white hover:bg-white hover:text-black"
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
                        <div className="mt-1 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-aura-muted group-hover:text-black/70">
                          <span>{leadItem.package.pins.length} pins</span>
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
                        onClick={() => toggleSeries(series.id)}
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
                                className="group flex w-full items-center justify-between rounded-md border border-white/20 bg-[#080808] px-2.5 py-2 text-left transition hover:border-white hover:bg-white hover:text-black"
                              >
                                <div className="min-w-0">
                                  <div className="font-mono text-[10px] leading-4 text-aura-ink group-hover:text-black">
                                    {item.variantLabel}
                                  </div>
                                  <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-aura-muted group-hover:text-black/70">
                                    {item.package.packageKey}
                                  </div>
                                </div>
                                <div className="ml-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-aura-muted group-hover:text-black/70">
                                  {item.resizeBehavior.mode !== "fixed" ? (
                                    <span className="studio-pill !h-5 !min-w-0 !px-2 !text-[8px]">
                                      Expand
                                    </span>
                                  ) : null}
                                  <span>{item.package.pins.length}</span>
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
            </section>
          ))}
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
