import { getLibraryItem, GRID_UM, resolvePackageByItemId } from "../data/componentCatalog";
import type {
  CircuitConnection,
  CircuitComponent,
  CircuitJunction,
  WireEndpoint,
} from "../store/useEditorStore";

export interface CircuitManifest {
  schema: "aura.circuit.v2";
  grid_unit_um: number;
  used_library_items: Array<{
    id: string;
    title: string;
    reference_prefix: string;
    resize_mode: string;
  }>;
  components: Array<{
    id: string;
    reference: string;
    library_item_id: string;
    package_key: string;
    x_um: number;
    y_um: number;
    rotation_deg?: number;
    package_state?: {
      pin_count?: number;
      width_mode?: string;
    };
  }>;
  junctions: Array<{
    id: string;
    x_um: number;
    y_um: number;
  }>;
  connections: Array<{
    id: string;
    from: ManifestEndpoint;
    to: ManifestEndpoint;
    route_points_um?: Array<{
      x_um: number;
      y_um: number;
    }>;
  }>;
}

interface Snapshot {
  components: CircuitComponent[];
  junctions: CircuitJunction[];
  connections: CircuitConnection[];
}

type ManifestEndpoint =
  | {
      kind: "pin";
      component_id: string;
      pin_id: string;
    }
  | {
      kind: "junction";
      junction_id: string;
    };

function toManifestEndpoint(endpoint: WireEndpoint): ManifestEndpoint {
  return endpoint.kind === "junction"
    ? {
        kind: "junction",
        junction_id: endpoint.junctionId,
      }
    : {
        kind: "pin",
        component_id: endpoint.componentId,
        pin_id: endpoint.pinId,
      };
}

export function buildCircuitManifest(snapshot: Snapshot): CircuitManifest {
  const usedLibraryIds = Array.from(
    new Set(snapshot.components.map((component) => component.libraryItemId)),
  );

  return {
    schema: "aura.circuit.v2",
    grid_unit_um: GRID_UM,
    used_library_items: usedLibraryIds.map((libraryItemId) => {
      const item = getLibraryItem(libraryItemId);
      return {
        id: item.id,
        title: item.title,
        reference_prefix: item.referencePrefix,
        resize_mode: item.resizeBehavior.mode,
      };
    }),
    components: snapshot.components.map((component) => {
      const resolvedPackage = resolvePackageByItemId(
        component.libraryItemId,
        component.packageState,
      );

      return {
        id: component.id,
        reference: component.reference,
        library_item_id: component.libraryItemId,
        package_key: resolvedPackage.packageKey,
        x_um: component.xUm,
        y_um: component.yUm,
        ...(component.rotationDeg !== 0 ? { rotation_deg: component.rotationDeg } : {}),
        ...(Object.keys(component.packageState).length > 0
          ? {
              package_state: {
                ...(component.packageState.pinCount != null
                  ? { pin_count: component.packageState.pinCount }
                  : {}),
                ...(component.packageState.widthMode
                  ? { width_mode: component.packageState.widthMode }
                  : {}),
              },
            }
          : {}),
      };
    }),
    junctions: snapshot.junctions.map((junction) => ({
      id: junction.id,
      x_um: junction.xUm,
      y_um: junction.yUm,
    })),
    connections: snapshot.connections.map((connection) => ({
      id: connection.id,
      from: toManifestEndpoint(connection.from),
      to: toManifestEndpoint(connection.to),
      ...(connection.routePointsUm && connection.routePointsUm.length > 0
        ? {
            route_points_um: connection.routePointsUm.map((point) => ({
              x_um: point.xUm,
              y_um: point.yUm,
            })),
          }
        : {}),
    })),
  };
}
