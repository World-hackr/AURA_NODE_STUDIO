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
    runtime_profile?: {
      profile_id: string;
      signal_name: string;
      target_id: string;
      value_min: number;
      value_max: number;
      default_value: number;
      angle_min: number;
      angle_max: number;
      travel_axis: string;
      travel_min: number;
      travel_max: number;
      low_visual: number;
      high_visual: number;
      detent_count: number;
      auto_reset: boolean;
      off_label: string;
      on_label: string;
      light_color: string;
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
        ...(component.runtimeProfile
          ? {
              runtime_profile: {
                profile_id: component.runtimeProfile.profileId,
                signal_name: component.runtimeProfile.signalName,
                target_id: component.runtimeProfile.targetId,
                value_min: component.runtimeProfile.valueMin,
                value_max: component.runtimeProfile.valueMax,
                default_value: component.runtimeProfile.defaultValue,
                angle_min: component.runtimeProfile.angleMin,
                angle_max: component.runtimeProfile.angleMax,
                travel_axis: component.runtimeProfile.travelAxis,
                travel_min: component.runtimeProfile.travelMin,
                travel_max: component.runtimeProfile.travelMax,
                low_visual: component.runtimeProfile.lowVisual,
                high_visual: component.runtimeProfile.highVisual,
                detent_count: component.runtimeProfile.detentCount,
                auto_reset: component.runtimeProfile.autoReset,
                off_label: component.runtimeProfile.offLabel,
                on_label: component.runtimeProfile.onLabel,
                light_color: component.runtimeProfile.lightColor,
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
