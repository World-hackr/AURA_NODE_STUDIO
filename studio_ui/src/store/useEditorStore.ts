import { create } from "zustand";

import {
  type ComponentPackageState,
  getDefaultPackageState,
  getLibraryItem,
  GRID_UM,
  ROUTING_GRID_UM,
  normalizePackageState,
  resizePackageStateForHandle,
  resolvePackageByItemId,
  type ResizeHandle,
  UM_TO_PX,
} from "../data/componentCatalog";
import type { DisplayUnit } from "../utils/units";

export interface CircuitComponent {
  id: string;
  libraryItemId: string;
  sourceDraftId?: string;
  reference: string;
  xUm: number;
  yUm: number;
  rotationDeg: number;
  packageState: ComponentPackageState;
}

export interface ComponentDraft {
  id: string;
  title: string;
  libraryItemId: string;
  packageState: ComponentPackageState;
  rotationDeg: number;
  updatedAt: string;
}

export interface CircuitJunction {
  id: string;
  xUm: number;
  yUm: number;
}

export type WireEndpoint =
  | { kind: "pin"; componentId: string; pinId: string }
  | { kind: "junction"; junctionId: string };

export interface CircuitConnection {
  id: string;
  from: WireEndpoint;
  to: WireEndpoint;
  routePointsUm?: Array<{ xUm: number; yUm: number }>;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface CanvasFrame {
  widthPx: number;
  heightPx: number;
}

interface ActiveWire {
  from: WireEndpoint;
  routePointsUm: Array<{ xUm: number; yUm: number }>;
}

interface EditorState {
  components: CircuitComponent[];
  componentDrafts: ComponentDraft[];
  junctions: CircuitJunction[];
  connections: CircuitConnection[];
  selectedComponentId: string | null;
  selectedJunctionId: string | null;
  selectedConnectionId: string | null;
  displayUnit: DisplayUnit;
  viewport: Viewport;
  canvasFrame: CanvasFrame;
  activeWire: ActiveWire | null;
  pendingLibraryItemId: string | null;
  pendingDraftId: string | null;
  addComponent: (libraryItemId: string) => void;
  addComponentAt: (libraryItemId: string, xUm: number, yUm: number) => CircuitComponent;
  addDraftComponentAt: (draftId: string, xUm: number, yUm: number) => CircuitComponent | null;
  setPendingLibraryItem: (libraryItemId: string | null) => void;
  setPendingDraft: (draftId: string | null) => void;
  saveDraftFromComponent: (componentId: string, title: string, draftId?: string) => ComponentDraft | null;
  deleteDraft: (draftId: string) => void;
  setDisplayUnit: (displayUnit: DisplayUnit) => void;
  selectComponent: (id: string | null) => void;
  selectJunction: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  updateComponent: (id: string, updates: Partial<CircuitComponent>) => void;
  rotateComponent: (id: string, deltaDeg?: number) => void;
  resizeComponent: (
    id: string,
    handle: ResizeHandle,
    pointerXUm: number,
    pointerYUm: number,
  ) => void;
  removeComponent: (id: string) => void;
  setViewport: (updates: Partial<Viewport>) => void;
  setCanvasFrame: (widthPx: number, heightPx: number) => void;
  addJunctionAt: (xUm: number, yUm: number) => CircuitJunction;
  updateJunction: (id: string, updates: Partial<CircuitJunction>) => void;
  removeJunction: (id: string) => void;
  startWire: (endpoint: WireEndpoint) => void;
  addActiveWireRoutePoint: (xUm: number, yUm: number) => void;
  completeWire: (endpoint: WireEndpoint) => void;
  cancelWire: () => void;
  setConnectionRoutePoints: (
    id: string,
    routePointsUm: Array<{ xUm: number; yUm: number }>,
  ) => void;
  clearConnectionRoutePoints: (id: string) => void;
  removeConnection: (id: string) => void;
  clearAll: () => void;
}

function snapToGrid(valueUm: number): number {
  return Math.round(valueUm / GRID_UM) * GRID_UM;
}

function snapToRoutingGrid(valueUm: number): number {
  return Math.round(valueUm / ROUTING_GRID_UM) * ROUTING_GRID_UM;
}

function normalizeRotationDeg(rotationDeg: number | undefined): number {
  const normalized = ((rotationDeg ?? 0) % 360 + 360) % 360;
  const snapped = Math.round(normalized / 90) * 90;
  return snapped === 360 ? 0 : snapped;
}

function getRotatedSizeUm(widthUm: number, heightUm: number, rotationDeg: number) {
  const normalizedRotation = normalizeRotationDeg(rotationDeg);
  const swapAxes = normalizedRotation === 90 || normalizedRotation === 270;

  return {
    widthUm: swapAxes ? heightUm : widthUm,
    heightUm: swapAxes ? widthUm : heightUm,
  };
}

function normalizeComponent(component: CircuitComponent): CircuitComponent {
  return {
    ...component,
    xUm: snapToGrid(component.xUm),
    yUm: snapToGrid(component.yUm),
    rotationDeg: normalizeRotationDeg(component.rotationDeg),
    packageState: normalizePackageState(component.libraryItemId, component.packageState),
  };
}

function normalizeJunction(junction: CircuitJunction): CircuitJunction {
  return {
    ...junction,
    xUm: snapToRoutingGrid(junction.xUm),
    yUm: snapToRoutingGrid(junction.yUm),
  };
}

function endpointKey(endpoint: WireEndpoint) {
  return endpoint.kind === "junction"
    ? `junction:${endpoint.junctionId}`
    : `pin:${endpoint.componentId}:${endpoint.pinId}`;
}

function isEndpointEqual(left: WireEndpoint, right: WireEndpoint) {
  return endpointKey(left) === endpointKey(right);
}

function filterValidConnections(
  components: CircuitComponent[],
  junctions: CircuitJunction[],
  connections: CircuitConnection[],
): CircuitConnection[] {
  const pinSets = new Map(
    components.map((component) => [
      component.id,
      new Set(
        resolvePackageByItemId(component.libraryItemId, component.packageState).pins.map(
          (pin) => pin.id,
        ),
      ),
    ]),
  );
  const junctionIds = new Set(junctions.map((junction) => junction.id));

  const isValidEndpoint = (endpoint: WireEndpoint) =>
    endpoint.kind === "junction"
      ? junctionIds.has(endpoint.junctionId)
      : pinSets.get(endpoint.componentId)?.has(endpoint.pinId) === true;

  return connections.filter(
    (connection) => isValidEndpoint(connection.from) && isValidEndpoint(connection.to),
  );
}

function resolveSelectedConnectionId(
  selectedConnectionId: string | null,
  connections: CircuitConnection[],
) {
  if (!selectedConnectionId) {
    return null;
  }

  return connections.some((connection) => connection.id === selectedConnectionId)
    ? selectedConnectionId
    : null;
}

function normalizeConnection(connection: CircuitConnection): CircuitConnection {
  const routePointsUm = connection.routePointsUm?.map((point) => ({
    xUm: snapToRoutingGrid(point.xUm),
    yUm: snapToRoutingGrid(point.yUm),
  }));

  return {
    ...connection,
    routePointsUm: routePointsUm && routePointsUm.length > 0 ? routePointsUm : undefined,
  };
}

function nextReference(components: CircuitComponent[], prefix: string): string {
  let index = 1;
  while (components.some((component) => component.reference === `${prefix}${index}`)) {
    index += 1;
  }
  return `${prefix}${index}`;
}

function nextConnectionId(connections: CircuitConnection[]): string {
  let index = 1;
  while (connections.some((connection) => connection.id === `net_${index}`)) {
    index += 1;
  }
  return `net_${index}`;
}

function nextJunctionId(junctions: CircuitJunction[]): string {
  let index = 1;
  while (junctions.some((junction) => junction.id === `junction_${index}`)) {
    index += 1;
  }
  return `junction_${index}`;
}

function getViewportCenterUm(viewport: Viewport, canvasFrame: CanvasFrame) {
  const widthPx = canvasFrame.widthPx || 1280;
  const heightPx = canvasFrame.heightPx || 720;

  return {
    xUm: snapToGrid(((-viewport.x + widthPx / 2) / viewport.zoom) / UM_TO_PX),
    yUm: snapToGrid(((-viewport.y + heightPx / 2) / viewport.zoom) / UM_TO_PX),
  };
}

const DRAFT_STORAGE_KEY = "aura-node-studio-component-drafts";

function loadComponentDrafts(): ComponentDraft[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ComponentDraft[];
    return Array.isArray(parsed)
      ? parsed.map((draft) => ({
          ...draft,
          packageState: normalizePackageState(draft.libraryItemId, draft.packageState),
          rotationDeg: normalizeRotationDeg(draft.rotationDeg),
        }))
      : [];
  } catch {
    return [];
  }
}

function persistComponentDrafts(drafts: ComponentDraft[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

export const useEditorStore = create<EditorState>((set) => ({
  components: [],
  componentDrafts: loadComponentDrafts(),
  junctions: [],
  connections: [],
  selectedComponentId: null,
  selectedJunctionId: null,
  selectedConnectionId: null,
  displayUnit: "mm",
  viewport: { x: 120, y: 80, zoom: 1 },
  canvasFrame: { widthPx: 1280, heightPx: 720 },
  activeWire: null,
  pendingLibraryItemId: null,
  pendingDraftId: null,

  addComponent: (libraryItemId) =>
    set((state) => {
      const item = getLibraryItem(libraryItemId);
      const reference = nextReference(state.components, item.referencePrefix);
      const center = getViewportCenterUm(state.viewport, state.canvasFrame);
      const nextComponent = normalizeComponent({
        id: reference.toLowerCase(),
        libraryItemId,
        reference,
        xUm: center.xUm,
        yUm: center.yUm,
        rotationDeg: 0,
        packageState: getDefaultPackageState(libraryItemId),
      });

      return {
        components: [...state.components, nextComponent],
        selectedComponentId: nextComponent.id,
        selectedJunctionId: null,
        selectedConnectionId: null,
        pendingLibraryItemId: null,
        pendingDraftId: null,
      };
    }),

  addComponentAt: (libraryItemId, xUm, yUm) => {
    const item = getLibraryItem(libraryItemId);
    let nextComponent!: CircuitComponent;

    set((state) => {
      const reference = nextReference(state.components, item.referencePrefix);
      nextComponent = normalizeComponent({
        id: reference.toLowerCase(),
        libraryItemId,
        reference,
        xUm,
        yUm,
        rotationDeg: 0,
        packageState: getDefaultPackageState(libraryItemId),
      });

      return {
        components: [...state.components, nextComponent],
        selectedComponentId: nextComponent.id,
        selectedJunctionId: null,
        selectedConnectionId: null,
        pendingLibraryItemId: null,
        pendingDraftId: null,
      };
    });

    return nextComponent;
  },

  addDraftComponentAt: (draftId, xUm, yUm) => {
    let nextComponent: CircuitComponent | null = null;

    set((state) => {
      const draft = state.componentDrafts.find((entry) => entry.id === draftId);
      if (!draft) {
        return state;
      }

      const libraryItem = getLibraryItem(draft.libraryItemId);
      const reference = nextReference(state.components, libraryItem.referencePrefix);
      nextComponent = normalizeComponent({
        id: reference.toLowerCase(),
        libraryItemId: draft.libraryItemId,
        sourceDraftId: draft.id,
        reference,
        xUm,
        yUm,
        rotationDeg: draft.rotationDeg,
        packageState: draft.packageState,
      });

      return {
        components: [...state.components, nextComponent],
        selectedComponentId: nextComponent.id,
        selectedJunctionId: null,
        selectedConnectionId: null,
        pendingLibraryItemId: null,
        pendingDraftId: null,
      };
    });

    return nextComponent;
  },

  setPendingLibraryItem: (libraryItemId) =>
    set({ pendingLibraryItemId: libraryItemId, pendingDraftId: null }),

  setPendingDraft: (draftId) =>
    set({ pendingDraftId: draftId, pendingLibraryItemId: null }),

  saveDraftFromComponent: (componentId, title, draftId) => {
    let savedDraft: ComponentDraft | null = null;

    set((state) => {
      const component = state.components.find((entry) => entry.id === componentId);
      if (!component) {
        return state;
      }

      const resolvedDraftId = draftId ?? component.sourceDraftId ?? `draft_${Date.now()}`;
      const nextDraft: ComponentDraft = {
        id: resolvedDraftId,
        title: title.trim() || component.reference,
        libraryItemId: component.libraryItemId,
        packageState: normalizePackageState(component.libraryItemId, component.packageState),
        rotationDeg: normalizeRotationDeg(component.rotationDeg),
        updatedAt: new Date().toISOString(),
      };
      savedDraft = nextDraft;

      const nextDrafts = state.componentDrafts.some((entry) => entry.id === resolvedDraftId)
        ? state.componentDrafts.map((entry) => (entry.id === resolvedDraftId ? nextDraft : entry))
        : [nextDraft, ...state.componentDrafts];

      persistComponentDrafts(nextDrafts);

      return {
        componentDrafts: nextDrafts,
        components: state.components.map((entry) =>
          entry.id === componentId ? { ...entry, sourceDraftId: resolvedDraftId } : entry,
        ),
      };
    });

    return savedDraft;
  },

  deleteDraft: (draftId) =>
    set((state) => {
      const nextDrafts = state.componentDrafts.filter((entry) => entry.id !== draftId);
      persistComponentDrafts(nextDrafts);

      return {
        componentDrafts: nextDrafts,
        pendingDraftId: state.pendingDraftId === draftId ? null : state.pendingDraftId,
        components: state.components.map((component) =>
          component.sourceDraftId === draftId
            ? { ...component, sourceDraftId: undefined }
            : component,
        ),
      };
    }),

  setDisplayUnit: (displayUnit) => set({ displayUnit }),

  selectComponent: (id) =>
    set({ selectedComponentId: id, selectedJunctionId: null, selectedConnectionId: null }),

  selectJunction: (id) =>
    set({ selectedComponentId: null, selectedJunctionId: id, selectedConnectionId: null }),

  selectConnection: (id) =>
    set({ selectedConnectionId: id, selectedComponentId: null, selectedJunctionId: null }),

  updateComponent: (id, updates) =>
    set((state) => {
      const nextComponents = state.components.map((component) => {
        if (component.id !== id) {
          return component;
        }

        return normalizeComponent({
          ...component,
          ...updates,
          packageState:
            updates.packageState != null
              ? { ...component.packageState, ...updates.packageState }
              : component.packageState,
        });
      });
      const nextConnections = filterValidConnections(
        nextComponents,
        state.junctions,
        state.connections,
      );

      return {
        components: nextComponents,
        connections: nextConnections,
        selectedConnectionId: resolveSelectedConnectionId(
          state.selectedConnectionId,
          nextConnections,
        ),
      };
    }),

  rotateComponent: (id, deltaDeg = 90) =>
    set((state) => {
      const nextComponents = state.components.map((component) => {
        if (component.id !== id) {
          return component;
        }

        const resolvedPackage = resolvePackageByItemId(
          component.libraryItemId,
          component.packageState,
        );
        const nextRotationDeg = normalizeRotationDeg(component.rotationDeg + deltaDeg);
        const currentSize = getRotatedSizeUm(
          resolvedPackage.bodyWidthUm,
          resolvedPackage.bodyHeightUm,
          component.rotationDeg,
        );
        const nextSize = getRotatedSizeUm(
          resolvedPackage.bodyWidthUm,
          resolvedPackage.bodyHeightUm,
          nextRotationDeg,
        );
        const centerXUm = component.xUm + currentSize.widthUm / 2;
        const centerYUm = component.yUm + currentSize.heightUm / 2;

        return normalizeComponent({
          ...component,
          rotationDeg: nextRotationDeg,
          xUm: centerXUm - nextSize.widthUm / 2,
          yUm: centerYUm - nextSize.heightUm / 2,
        });
      });
      const nextConnections = filterValidConnections(
        nextComponents,
        state.junctions,
        state.connections,
      );

      return {
        components: nextComponents,
        connections: nextConnections,
        selectedConnectionId: resolveSelectedConnectionId(
          state.selectedConnectionId,
          nextConnections,
        ),
      };
    }),

  resizeComponent: (id, handle, pointerXUm, pointerYUm) =>
    set((state) => {
      const nextComponents = state.components.map((component) => {
        if (component.id !== id) {
          return component;
        }

        const nextPackageState = resizePackageStateForHandle(
          component.libraryItemId,
          component.packageState,
          handle,
          Math.max(GRID_UM * 2, pointerXUm - component.xUm),
          Math.max(GRID_UM * 2, pointerYUm - component.yUm),
        );

        return normalizeComponent({
          ...component,
          packageState: nextPackageState,
        });
      });
      const nextConnections = filterValidConnections(
        nextComponents,
        state.junctions,
        state.connections,
      );

      return {
        components: nextComponents,
        connections: nextConnections,
        selectedConnectionId: resolveSelectedConnectionId(
          state.selectedConnectionId,
          nextConnections,
        ),
      };
    }),

  removeComponent: (id) =>
    set((state) => ({
      components: state.components.filter((component) => component.id !== id),
      connections: state.connections.filter(
        (connection) =>
          !(connection.from.kind === "pin" && connection.from.componentId === id) &&
          !(connection.to.kind === "pin" && connection.to.componentId === id),
      ),
      selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
      selectedJunctionId: state.selectedJunctionId,
      selectedConnectionId:
        state.selectedConnectionId != null &&
        state.connections.some(
          (connection) =>
            connection.id === state.selectedConnectionId &&
            ((connection.from.kind === "pin" && connection.from.componentId === id) ||
              (connection.to.kind === "pin" && connection.to.componentId === id)),
        )
          ? null
          : state.selectedConnectionId,
      activeWire:
        state.activeWire?.from.kind === "pin" && state.activeWire.from.componentId === id
          ? null
          : state.activeWire,
    })),

  setViewport: (updates) =>
    set((state) => ({
      viewport: { ...state.viewport, ...updates },
    })),

  setCanvasFrame: (widthPx, heightPx) => set({ canvasFrame: { widthPx, heightPx } }),

  addJunctionAt: (xUm, yUm) => {
    const nextJunction = normalizeJunction({
      id: nextJunctionId(useEditorStore.getState().junctions),
      xUm,
      yUm,
    });

    set((state) => ({
      junctions: [...state.junctions, nextJunction],
      selectedComponentId: null,
      selectedJunctionId: nextJunction.id,
      selectedConnectionId: null,
    }));

    return nextJunction;
  },

  updateJunction: (id, updates) =>
    set((state) => ({
      junctions: state.junctions.map((junction) =>
        junction.id === id
          ? normalizeJunction({
              ...junction,
              ...updates,
            })
          : junction,
      ),
    })),

  removeJunction: (id) =>
    set((state) => {
      const nextConnections = state.connections.filter(
        (connection) =>
          !(connection.from.kind === "junction" && connection.from.junctionId === id) &&
          !(connection.to.kind === "junction" && connection.to.junctionId === id),
      );

      return {
        junctions: state.junctions.filter((junction) => junction.id !== id),
        connections: nextConnections,
        selectedJunctionId: state.selectedJunctionId === id ? null : state.selectedJunctionId,
        selectedConnectionId: resolveSelectedConnectionId(
          state.selectedConnectionId,
          nextConnections,
        ),
        activeWire:
          state.activeWire?.from.kind === "junction" && state.activeWire.from.junctionId === id
            ? null
            : state.activeWire,
      };
    }),

  startWire: (endpoint) =>
    set({
      activeWire: { from: endpoint, routePointsUm: [] },
      selectedComponentId: endpoint.kind === "pin" ? endpoint.componentId : null,
      selectedJunctionId: endpoint.kind === "junction" ? endpoint.junctionId : null,
      selectedConnectionId: null,
    }),

  addActiveWireRoutePoint: (xUm, yUm) =>
    set((state) => {
      if (!state.activeWire) {
        return state;
      }

      const nextPoint = {
        xUm: snapToRoutingGrid(xUm),
        yUm: snapToRoutingGrid(yUm),
      };
      const previousPoint =
        state.activeWire.routePointsUm[state.activeWire.routePointsUm.length - 1];

      if (
        previousPoint &&
        previousPoint.xUm === nextPoint.xUm &&
        previousPoint.yUm === nextPoint.yUm
      ) {
        return state;
      }

      return {
        activeWire: {
          ...state.activeWire,
          routePointsUm: [...state.activeWire.routePointsUm, nextPoint],
        },
      };
    }),

  completeWire: (endpoint) =>
    set((state) => {
      if (!state.activeWire) {
        return state;
      }

      if (isEndpointEqual(state.activeWire.from, endpoint)) {
        return { activeWire: null };
      }

      const duplicate = state.connections.some((connection) => {
        const forward =
          isEndpointEqual(connection.from, state.activeWire!.from) &&
          isEndpointEqual(connection.to, endpoint);
        const reverse =
          isEndpointEqual(connection.from, endpoint) &&
          isEndpointEqual(connection.to, state.activeWire!.from);

        return forward || reverse;
      });

      if (duplicate) {
        return {
          activeWire: null,
          selectedComponentId: null,
          selectedJunctionId: null,
        };
      }

      const connectionId = nextConnectionId(state.connections);

      return {
        connections: [
          ...state.connections,
          normalizeConnection({
            id: connectionId,
            from: state.activeWire.from,
            to: endpoint,
            routePointsUm: state.activeWire.routePointsUm,
          }),
        ],
        activeWire: null,
        selectedConnectionId: connectionId,
        selectedComponentId: null,
        selectedJunctionId: null,
      };
    }),

  cancelWire: () => set({ activeWire: null }),

  setConnectionRoutePoints: (id, routePointsUm) =>
    set((state) => ({
      connections: state.connections.map((connection) =>
        connection.id === id
          ? normalizeConnection({
              ...connection,
              routePointsUm,
            })
          : connection,
      ),
    })),

  clearConnectionRoutePoints: (id) =>
    set((state) => ({
      connections: state.connections.map((connection) =>
        connection.id === id
          ? {
              ...connection,
              routePointsUm: undefined,
            }
          : connection,
      ),
    })),

  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((connection) => connection.id !== id),
      selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
    })),

  clearAll: () =>
    set((state) => ({
      components: [],
      junctions: [],
      connections: [],
      selectedComponentId: null,
      selectedJunctionId: null,
      selectedConnectionId: null,
      activeWire: null,
      pendingLibraryItemId: null,
      pendingDraftId: null,
      viewport: state.viewport,
      canvasFrame: state.canvasFrame,
    })),
}));
