import { Grid3X3, Image as ImageIcon, LocateFixed, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  getDefaultPackageState,
  getLibraryItem,
  GRID_UM,
  isResizableLibraryItem,
  ROUTING_GRID_UM,
  resolvePackageByItemId,
  type PackageDefinition,
  type ResizeHandle,
  UM_TO_PX,
} from "../data/componentCatalog";
import type {
  CircuitComponent,
  CircuitJunction,
  WireEndpoint,
} from "../store/useEditorStore";
import { useEditorStore } from "../store/useEditorStore";
import {
  getEditableBendPoints,
  getConnectionInteriorRoutePoints,
  getOrthogonalPath,
  getOrthogonalRoutePoints,
  getPolylinePath,
  insertRoutePointOnSegment,
  removeRoutePointAtIndex,
  type RoutingDirection,
  type RoutingPoint,
  type RoutingRect,
} from "../utils/routing";
import { computeLayoutHealth } from "../utils/layoutHealth";
import { formatUmPair } from "../utils/units";

interface CanvasPointer {
  xPx: number;
  yPx: number;
  xUm: number;
  yUm: number;
}

interface DragState {
  componentId: string;
  startXUm: number;
  startYUm: number;
  startPointerXUm: number;
  startPointerYUm: number;
}

interface ResizeState {
  componentId: string;
  handle: ResizeHandle;
}

interface PanState {
  mode: "viewport" | "texture";
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
}

interface RouteDragState {
  connectionId: string;
  bendIndex: number;
  routePointsUm: Array<{ xUm: number; yUm: number }>;
  fullRoutePointsUm: Array<{ xUm: number; yUm: number }>;
}

interface JunctionDragState {
  junctionId: string;
  startXUm: number;
  startYUm: number;
  startPointerXUm: number;
  startPointerYUm: number;
}

interface PinPoint {
  xPx: number;
  yPx: number;
  label: string;
}

interface AlignmentGuides {
  x: number | null;
  y: number | null;
}

interface BoundsPx {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

const TEXTURE_KEYS = ["texture1", "texture2", "texture3", "texture4"] as const;
const GRID_PX = GRID_UM * UM_TO_PX;
const STAGE_HALF_EXTENT_PX = 50000;
const PACKAGE_OUTLINE = "#111111";
const PACKAGE_BODY_FILL = "#d8d8d8";
const PACKAGE_BODY_FILL_DARK = "#c6c6c6";
const PACKAGE_METAL = "#8f8f8f";
const PACKAGE_METAL_LIGHT = "#b7b7b7";
const PACKAGE_DETAIL = "#3a3a3a";
const PACKAGE_SOCKET_FILL = "#2a2a2a";
const STAGE_GRID_COLOR = "#ffffff";
const STAGE_AXIS_COLOR = "#ffffff";
const STAGE_SELECTION_COLOR = "#ffffff";
const STAGE_SELECTION_SOFT = "#ffffff";
const STAGE_LABEL_COLOR = "#f1f4f8";
const STAGE_WIRE_COLOR = "#9098a1";
const STAGE_WIRE_RELATED = "#dfe8f5";
const STAGE_WIRE_SELECTED = "#ffffff";
const STAGE_WIRE_GLOW = "#9fd3ff";
const STAGE_HANDLE_FILL = "#ffffff";
const STAGE_HANDLE_STROKE = "#111111";
const STAGE_GUIDE_COLOR = "#9fd3ff";
const STAGE_PIN_RING = "#cde8ff";
const STAGE_SELECTION_FILL = "#8fcfff";
const STAGE_WARNING_OVERLAP = "#ffd5cc";
const STAGE_WARNING_CROWDED = "#ffe5a8";

function snapToGrid(valueUm: number) {
  return Math.round(valueUm / GRID_UM) * GRID_UM;
}

function snapToRoutingGrid(valueUm: number) {
  return Math.round(valueUm / ROUTING_GRID_UM) * ROUTING_GRID_UM;
}

function pointerToCanvasUnits(
  event: MouseEvent | React.MouseEvent,
  container: HTMLDivElement,
  viewportX: number,
  viewportY: number,
  zoom: number,
): CanvasPointer {
  const rect = container.getBoundingClientRect();
  const canvasX = (event.clientX - rect.left - viewportX) / zoom;
  const canvasY = (event.clientY - rect.top - viewportY) / zoom;

  return {
    xPx: canvasX,
    yPx: canvasY,
    xUm: canvasX / UM_TO_PX,
    yUm: canvasY / UM_TO_PX,
  };
}

function getComponentBoundsPx(
  component: CircuitComponent,
  packageDef: PackageDefinition,
): BoundsPx {
  const rotationDeg = normalizeRotationDeg(component.rotationDeg);
  const left = component.xUm * UM_TO_PX;
  const top = component.yUm * UM_TO_PX;
  const baseWidth = packageDef.bodyWidthUm * UM_TO_PX;
  const baseHeight = packageDef.bodyHeightUm * UM_TO_PX;
  const swapAxes = rotationDeg === 90 || rotationDeg === 270;
  const width = swapAxes ? baseHeight : baseWidth;
  const height = swapAxes ? baseWidth : baseHeight;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

function normalizeRotationDeg(rotationDeg: number | undefined): number {
  const normalized = ((rotationDeg ?? 0) % 360 + 360) % 360;
  const snapped = Math.round(normalized / 90) * 90;
  return snapped === 360 ? 0 : snapped;
}

function getLocalPackageBoundsPx(
  component: CircuitComponent,
  packageDef: PackageDefinition,
): BoundsPx {
  const bounds = getComponentBoundsPx(component, packageDef);
  const width = packageDef.bodyWidthUm * UM_TO_PX;
  const height = packageDef.bodyHeightUm * UM_TO_PX;
  const left = bounds.centerX - width / 2;
  const top = bounds.centerY - height / 2;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    centerX: bounds.centerX,
    centerY: bounds.centerY,
  };
}

function rotatePoint(point: PinPoint, centerX: number, centerY: number, rotationDeg: number): PinPoint {
  const normalizedRotation = normalizeRotationDeg(rotationDeg);

  if (normalizedRotation === 0) {
    return point;
  }

  const dx = point.xPx - centerX;
  const dy = point.yPx - centerY;

  if (normalizedRotation === 90) {
    return { ...point, xPx: centerX - dy, yPx: centerY + dx };
  }

  if (normalizedRotation === 180) {
    return { ...point, xPx: centerX - dx, yPx: centerY - dy };
  }

  return { ...point, xPx: centerX + dy, yPx: centerY - dx };
}

function getResizeCursor(handle: ResizeHandle): string {
  if (handle === "east") {
    return "ew-resize";
  }
  if (handle === "south") {
    return "ns-resize";
  }
  return "nwse-resize";
}

function getResizeZone(
  component: CircuitComponent,
  packageDef: PackageDefinition,
  pointerX: number,
  pointerY: number,
): ResizeHandle | null {
  const libraryItem = getLibraryItem(component.libraryItemId);
  if (!isResizableLibraryItem(component.libraryItemId)) {
    return null;
  }

  const bounds = getComponentBoundsPx(component, packageDef);
  const edgeTolerance = 12;
  const cornerTolerance = 16;
  const hasEastResize =
    libraryItem.resizeBehavior.mode === "mapped-pin-step" ||
    (libraryItem.resizeBehavior.mode === "linear-pin-step"
      ? libraryItem.resizeBehavior.fixedColumnCount == null
      : true);
  const hasSouthResize =
    libraryItem.resizeBehavior.mode === "linear-pin-step"
      ? libraryItem.resizeBehavior.fixedRowCount == null
      : libraryItem.resizeBehavior.mode !== "mapped-pin-step";

  if (Math.hypot(pointerX - bounds.right, pointerY - bounds.bottom) <= cornerTolerance) {
    return "corner";
  }

  if (libraryItem.resizeBehavior.mode === "mapped-pin-step") {
    return null;
  }

  const nearEast =
    hasEastResize &&
    Math.abs(pointerX - bounds.right) <= edgeTolerance &&
    pointerY >= bounds.top - edgeTolerance &&
    pointerY <= bounds.bottom + edgeTolerance;
  if (nearEast) {
    return "east";
  }

  const nearSouth =
    hasSouthResize &&
    Math.abs(pointerY - bounds.bottom) <= edgeTolerance &&
    pointerX >= bounds.left - edgeTolerance &&
    pointerX <= bounds.right + edgeTolerance;
  if (nearSouth) {
    return "south";
  }

  return null;
}

function isConnectionAttachedToComponent(connection: { from: WireEndpoint; to: WireEndpoint }, componentId: string) {
  return (
    (connection.from.kind === "pin" && connection.from.componentId === componentId) ||
    (connection.to.kind === "pin" && connection.to.componentId === componentId)
  );
}

function isConnectionAttachedToJunction(connection: { from: WireEndpoint; to: WireEndpoint }, junctionId: string) {
  return (
    (connection.from.kind === "junction" && connection.from.junctionId === junctionId) ||
    (connection.to.kind === "junction" && connection.to.junctionId === junctionId)
  );
}

function estimateStageLabelWidth(label: string) {
  return Math.max(44, label.length * 6.6 + 18);
}

function getRouteMidpoint(routePoints: RoutingPoint[]) {
  if (routePoints.length === 0) {
    return { x: 0, y: 0 };
  }

  return routePoints[Math.floor(routePoints.length / 2)];
}

function getBasePinPoint(
  bounds: BoundsPx,
  packageDef: PackageDefinition,
  pinId: string,
): PinPoint {
  const pitchPx = packageDef.pinPitchUm * UM_TO_PX;
  const pin = packageDef.pins.find((entry) => entry.id === pinId) ?? packageDef.pins[0];
  const index = packageDef.pins.findIndex((entry) => entry.id === pinId);
  const leadLengthPx = 12;

  if (packageDef.kind === "dip" || packageDef.kind === "soic") {
    const rowPins = packageDef.pins.length / 2;
    if (index < rowPins) {
      return {
        xPx: bounds.left - leadLengthPx,
        yPx: bounds.top + index * pitchPx + pitchPx / 2,
        label: pin.label,
      };
    }

    const mirroredIndex = packageDef.pins.length - 1 - index;
    return {
      xPx: bounds.right + leadLengthPx,
      yPx: bounds.top + mirroredIndex * pitchPx + pitchPx / 2,
      label: pin.label,
    };
  }

  if (packageDef.kind === "header") {
    const columnCount = Math.max(1, Math.round(packageDef.bodyWidthUm / packageDef.pinPitchUm));
    const columnIndex = index % columnCount;
    const rowIndex = Math.floor(index / columnCount);
    return {
      xPx: bounds.left + columnIndex * pitchPx + pitchPx / 2,
      yPx: bounds.top + rowIndex * pitchPx + pitchPx / 2,
      label: pin.label,
    };
  }

  if (packageDef.kind === "qfp") {
    const sideCount = Math.max(1, Math.floor(packageDef.pins.length / 4));
    const verticalStep = bounds.height / sideCount;
    const horizontalStep = bounds.width / sideCount;
    const sideOffset = 8;

    if (index < sideCount) {
      return {
        xPx: bounds.left - sideOffset,
        yPx: bounds.top + verticalStep * (index + 0.5),
        label: pin.label,
      };
    }

    if (index < sideCount * 2) {
      const bottomIndex = index - sideCount;
      return {
        xPx: bounds.left + horizontalStep * (bottomIndex + 0.5),
        yPx: bounds.bottom + sideOffset,
        label: pin.label,
      };
    }

    if (index < sideCount * 3) {
      const rightIndex = index - sideCount * 2;
      return {
        xPx: bounds.right + sideOffset,
        yPx: bounds.bottom - verticalStep * (rightIndex + 0.5),
        label: pin.label,
      };
    }

    const topIndex = index - sideCount * 3;
    return {
      xPx: bounds.right - horizontalStep * (topIndex + 0.5),
      yPx: bounds.top - sideOffset,
      label: pin.label,
    };
  }

  if (packageDef.kind === "sot23") {
    const leftPins = Math.ceil(packageDef.pins.length / 2);
    const rightPins = Math.max(1, packageDef.pins.length - leftPins);

    if (index < leftPins) {
      const leftStep = bounds.height / (leftPins + 1);
      return {
        xPx: bounds.left - leadLengthPx * 0.7,
        yPx: bounds.top + leftStep * (index + 1),
        label: pin.label,
      };
    }

    const rightIndex = index - leftPins;
    const rightStep = bounds.height / (rightPins + 1);
    return {
      xPx: bounds.right + leadLengthPx * 0.7,
      yPx: bounds.top + rightStep * (rightIndex + 1),
      label: pin.label,
    };
  }

  if (packageDef.kind === "chip2") {
    return {
      xPx: index === 0 ? bounds.left - 6 : bounds.right + 6,
      yPx: bounds.centerY,
      label: pin.label,
    };
  }

  if (packageDef.kind === "to220") {
    return {
      xPx: bounds.centerX + (index - 1) * pitchPx,
      yPx: bounds.bottom + leadLengthPx,
      label: pin.label,
    };
  }

  if (packageDef.kind === "resistor") {
    return {
      xPx: index === 0 ? bounds.left - leadLengthPx : bounds.right + leadLengthPx,
      yPx: bounds.centerY,
      label: pin.label,
    };
  }

  if (packageDef.kind === "led" || packageDef.kind === "capacitor") {
    const pinOffset = bounds.width / 4;
    return {
      xPx: index === 0 ? bounds.left + pinOffset : bounds.right - pinOffset,
      yPx: bounds.bottom + leadLengthPx,
      label: pin.label,
    };
  }

  const leftX = bounds.left - leadLengthPx;
  const rightX = bounds.right + leadLengthPx;
  const topY = bounds.top + bounds.height * 0.3;
  const bottomY = bounds.top + bounds.height * 0.7;
  const points: PinPoint[] = [
    { xPx: leftX, yPx: topY, label: packageDef.pins[0].label },
    { xPx: leftX, yPx: bottomY, label: packageDef.pins[1].label },
    { xPx: rightX, yPx: topY, label: packageDef.pins[2].label },
    { xPx: rightX, yPx: bottomY, label: packageDef.pins[3].label },
  ];
  return points[index] ?? points[0];
}

function getPinPoint(
  component: CircuitComponent,
  packageDef: PackageDefinition,
  pinId: string,
): PinPoint {
  const localBounds = getLocalPackageBoundsPx(component, packageDef);
  const basePoint = getBasePinPoint(localBounds, packageDef, pinId);

  return rotatePoint(
    basePoint,
    localBounds.centerX,
    localBounds.centerY,
    component.rotationDeg,
  );
}

function getPinDirection(
  component: CircuitComponent,
  packageDef: PackageDefinition,
  pinId: string,
): RoutingDirection {
  const point = getPinPoint(component, packageDef, pinId);
  const bounds = getComponentBoundsPx(component, packageDef);
  const distances = [
    { direction: "left" as const, value: Math.abs(point.xPx - bounds.left) },
    { direction: "right" as const, value: Math.abs(point.xPx - bounds.right) },
    { direction: "up" as const, value: Math.abs(point.yPx - bounds.top) },
    { direction: "down" as const, value: Math.abs(point.yPx - bounds.bottom) },
  ];

  return distances.reduce((closest, current) =>
    current.value < closest.value ? current : closest,
  ).direction;
}

function getRoutingObstacles(
  components: CircuitComponent[],
  excludeComponentIds: string[],
): RoutingRect[] {
  const exclusionSet = new Set(excludeComponentIds);
  const clearance = 10;

  return components
    .filter((component) => !exclusionSet.has(component.id))
    .map((component) => {
      const packageDef = resolvePackageByItemId(
        component.libraryItemId,
        component.packageState,
      );
      const bounds = getComponentBoundsPx(component, packageDef);

      return {
        left: bounds.left - clearance,
        top: bounds.top - clearance,
        right: bounds.right + clearance,
        bottom: bounds.bottom + clearance,
      };
    });
}

function routePointsUmToPx(points: Array<{ xUm: number; yUm: number }> | undefined): RoutingPoint[] {
  return (points ?? []).map((point) => ({
    x: point.xUm * UM_TO_PX,
    y: point.yUm * UM_TO_PX,
  }));
}

function routePointsPxToUm(points: RoutingPoint[]) {
  return points.map((point) => ({
    xUm: point.x / UM_TO_PX,
    yUm: point.y / UM_TO_PX,
  }));
}

function getJunctionPoint(junction: CircuitJunction): PinPoint {
  return {
    xPx: junction.xUm * UM_TO_PX,
    yPx: junction.yUm * UM_TO_PX,
    label: junction.id,
  };
}

function getEndpointPoint(
  endpoint: WireEndpoint,
  components: CircuitComponent[],
  junctions: CircuitJunction[],
): PinPoint | null {
  if (endpoint.kind === "junction") {
    const junction = junctions.find((entry) => entry.id === endpoint.junctionId);
    return junction ? getJunctionPoint(junction) : null;
  }

  const component = components.find((entry) => entry.id === endpoint.componentId);
  if (!component) {
    return null;
  }

  const packageDef = resolvePackageByItemId(component.libraryItemId, component.packageState);
  return getPinPoint(component, packageDef, endpoint.pinId);
}

function getEndpointDirection(
  endpoint: WireEndpoint,
  components: CircuitComponent[],
): RoutingDirection | undefined {
  if (endpoint.kind === "junction") {
    return undefined;
  }

  const component = components.find((entry) => entry.id === endpoint.componentId);
  if (!component) {
    return undefined;
  }

  const packageDef = resolvePackageByItemId(component.libraryItemId, component.packageState);
  return getPinDirection(component, packageDef, endpoint.pinId);
}

function getConnectionExcludedComponentIds(connection: {
  from: WireEndpoint;
  to: WireEndpoint;
}) {
  const ids = new Set<string>();
  if (connection.from.kind === "pin") {
    ids.add(connection.from.componentId);
  }
  if (connection.to.kind === "pin") {
    ids.add(connection.to.componentId);
  }
  return Array.from(ids);
}

function findNearestDraftEndpointPoint(
  pointer: RoutingPoint,
  components: CircuitComponent[],
  junctions: CircuitJunction[],
  maxDistancePx = 12,
): (PinPoint & (
  | { kind: "pin"; componentId: string; pinId: string }
  | { kind: "junction"; junctionId: string }
)) | null {
  let best: (PinPoint & (
    | { kind: "pin"; componentId: string; pinId: string }
    | { kind: "junction"; junctionId: string }
  )) | null = null;
  let bestDistance = maxDistancePx;

  components.forEach((component) => {
    const packageDef = resolvePackageByItemId(component.libraryItemId, component.packageState);
    packageDef.pins.forEach((pin) => {
      const point = getPinPoint(component, packageDef, pin.id);
      const distance = Math.hypot(point.xPx - pointer.x, point.yPx - pointer.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { ...point, kind: "pin", componentId: component.id, pinId: pin.id };
      }
    });
  });

  junctions.forEach((junction) => {
    const point = getJunctionPoint(junction);
    const distance = Math.hypot(point.xPx - pointer.x, point.yPx - pointer.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { ...point, kind: "junction", junctionId: junction.id };
    }
  });

  return best;
}

function findNearestAlignmentValue(
  current: number,
  candidates: number[],
  tolerancePx = 8,
) {
  let best: number | null = null;
  let bestDistance = tolerancePx;

  candidates.forEach((candidate) => {
    const distance = Math.abs(candidate - current);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  });

  return best;
}

function getDistanceToBounds(pointer: RoutingPoint, bounds: BoundsPx) {
  const dx =
    pointer.x < bounds.left
      ? bounds.left - pointer.x
      : pointer.x > bounds.right
        ? pointer.x - bounds.right
        : 0;
  const dy =
    pointer.y < bounds.top
      ? bounds.top - pointer.y
      : pointer.y > bounds.bottom
        ? pointer.y - bounds.bottom
        : 0;

  return Math.hypot(dx, dy);
}

function getMagneticToleranceUm(zoom: number) {
  return (12 / zoom) / UM_TO_PX;
}

function applyOrthogonalAssist(
  pointUm: { xUm: number; yUm: number },
  anchorPointsUm: Array<{ xUm: number; yUm: number }>,
  toleranceUm: number,
) {
  let nextXUm = pointUm.xUm;
  let nextYUm = pointUm.yUm;
  let bestXDistance = toleranceUm;
  let bestYDistance = toleranceUm;

  anchorPointsUm.forEach((anchor) => {
    const xDistance = Math.abs(anchor.xUm - pointUm.xUm);
    if (xDistance < bestXDistance) {
      bestXDistance = xDistance;
      nextXUm = anchor.xUm;
    }

    const yDistance = Math.abs(anchor.yUm - pointUm.yUm);
    if (yDistance < bestYDistance) {
      bestYDistance = yDistance;
      nextYUm = anchor.yUm;
    }
  });

  return {
    xUm: nextXUm,
    yUm: nextYUm,
  };
}

function collectGeometryAlignmentCandidates(
  components: CircuitComponent[],
  junctions: CircuitJunction[],
  excludeComponentIds: string[] = [],
) {
  const excluded = new Set(excludeComponentIds);
  const xValues = new Set<number>();
  const yValues = new Set<number>();

  components.forEach((component) => {
    if (excluded.has(component.id)) {
      return;
    }

    const packageDef = resolvePackageByItemId(component.libraryItemId, component.packageState);
    const bounds = getComponentBoundsPx(component, packageDef);
    [bounds.left, bounds.centerX, bounds.right].forEach((value) =>
      xValues.add(Number(value.toFixed(2))),
    );
    [bounds.top, bounds.centerY, bounds.bottom].forEach((value) =>
      yValues.add(Number(value.toFixed(2))),
    );

    packageDef.pins.forEach((pin) => {
      const point = getPinPoint(component, packageDef, pin.id);
      xValues.add(Number(point.xPx.toFixed(2)));
      yValues.add(Number(point.yPx.toFixed(2)));
    });
  });

  junctions.forEach((junction) => {
    const point = getJunctionPoint(junction);
    xValues.add(Number(point.xPx.toFixed(2)));
    yValues.add(Number(point.yPx.toFixed(2)));
  });

  return {
    xValues: Array.from(xValues),
    yValues: Array.from(yValues),
  };
}

function getPlacementAssist(
  component: CircuitComponent,
  components: CircuitComponent[],
  junctions: CircuitJunction[],
  zoom: number,
  excludeComponentIds: string[] = [],
) {
  interface PlacementGuideMatch {
    guide: number;
    deltaPx: number;
  }

  const packageDef = resolvePackageByItemId(component.libraryItemId, component.packageState);
  const bounds = getComponentBoundsPx(component, packageDef);
  const { xValues, yValues } = collectGeometryAlignmentCandidates(
    components,
    junctions,
    excludeComponentIds,
  );
  const tolerancePx = 8 / zoom;
  const xAnchors = [bounds.left, bounds.centerX, bounds.right];
  const yAnchors = [bounds.top, bounds.centerY, bounds.bottom];
  let bestX: PlacementGuideMatch | null = null;
  let bestY: PlacementGuideMatch | null = null;

  for (const anchor of xAnchors) {
    const guide = findNearestAlignmentValue(anchor, xValues, tolerancePx);
    if (guide == null) {
      continue;
    }
    const deltaPx = guide - anchor;
    if (!bestX || Math.abs(deltaPx) < Math.abs(bestX.deltaPx)) {
      bestX = { guide, deltaPx };
    }
  }

  for (const anchor of yAnchors) {
    const guide = findNearestAlignmentValue(anchor, yValues, tolerancePx);
    if (guide == null) {
      continue;
    }
    const deltaPx = guide - anchor;
    if (!bestY || Math.abs(deltaPx) < Math.abs(bestY.deltaPx)) {
      bestY = { guide, deltaPx };
    }
  }

  return {
    xUm: component.xUm + (bestX?.deltaPx ?? 0) / UM_TO_PX,
    yUm: component.yUm + (bestY?.deltaPx ?? 0) / UM_TO_PX,
    guideX: bestX?.guide ?? null,
    guideY: bestY?.guide ?? null,
  };
}

function collectWireAlignmentCandidates(
  startPoint: { xPx: number; yPx: number } | null,
  routePointsPx: RoutingPoint[],
  components: CircuitComponent[],
  junctions: CircuitJunction[],
) {
  const { xValues, yValues } = collectGeometryAlignmentCandidates(components, junctions);
  const nextXValues = new Set(xValues);
  const nextYValues = new Set(yValues);
  const addCandidate = (x: number, y: number) => {
    nextXValues.add(Number(x.toFixed(2)));
    nextYValues.add(Number(y.toFixed(2)));
  };

  if (startPoint) {
    addCandidate(startPoint.xPx, startPoint.yPx);
  }

  routePointsPx.forEach((point) => addCandidate(point.x, point.y));

  return {
    xValues: Array.from(nextXValues),
    yValues: Array.from(nextYValues),
  };
}

function getPriorityWireAlignmentCandidates(
  pointer: RoutingPoint,
  components: CircuitComponent[],
  junctions: CircuitJunction[],
  zoom: number,
) {
  interface NearestComponentMatch {
    component: CircuitComponent;
    packageDef: PackageDefinition;
    distance: number;
  }

  const activationDistancePx = 44 / zoom;
  let nearestComponent: NearestComponentMatch | null = null;

  for (const component of components) {
    const packageDef = resolvePackageByItemId(component.libraryItemId, component.packageState);
    const bounds = getComponentBoundsPx(component, packageDef);
    const distance = getDistanceToBounds(pointer, bounds);

    if (distance > activationDistancePx) {
      continue;
    }

    if (!nearestComponent || distance < nearestComponent.distance) {
      nearestComponent = { component, packageDef, distance };
    }
  }

  const xValues = new Set<number>();
  const yValues = new Set<number>();

  if (nearestComponent) {
    const { component, packageDef } = nearestComponent;
    const bounds = getComponentBoundsPx(component, packageDef);
    [bounds.left, bounds.centerX, bounds.right].forEach((value) =>
      xValues.add(Number(value.toFixed(2))),
    );
    [bounds.top, bounds.centerY, bounds.bottom].forEach((value) =>
      yValues.add(Number(value.toFixed(2))),
    );

    packageDef.pins.forEach((pin) => {
      const point = getPinPoint(component, packageDef, pin.id);
      xValues.add(Number(point.xPx.toFixed(2)));
      yValues.add(Number(point.yPx.toFixed(2)));
    });
  }

  junctions.forEach((junction) => {
    const point = getJunctionPoint(junction);
    if (Math.hypot(point.xPx - pointer.x, point.yPx - pointer.y) <= activationDistancePx) {
      xValues.add(Number(point.xPx.toFixed(2)));
      yValues.add(Number(point.yPx.toFixed(2)));
    }
  });

  return {
    xValues: Array.from(xValues),
    yValues: Array.from(yValues),
  };
}

function getAssistedWirePointPx(
  pointerUm: { xUm: number; yUm: number },
  pointerPx: RoutingPoint,
  anchorPointsUm: Array<{ xUm: number; yUm: number }>,
  guideCandidates: { xValues: number[]; yValues: number[] },
  priorityCandidates: { xValues: number[]; yValues: number[] },
  zoom: number,
) {
  const assistedPointUm = applyOrthogonalAssist(
    pointerUm,
    anchorPointsUm,
    getMagneticToleranceUm(zoom),
  );
  const assistedXPx = assistedPointUm.xUm * UM_TO_PX;
  const assistedYPx = assistedPointUm.yUm * UM_TO_PX;
  const priorityGuideX = findNearestAlignmentValue(
    pointerPx.x,
    priorityCandidates.xValues,
    12 / zoom,
  );
  const priorityGuideY = findNearestAlignmentValue(
    pointerPx.y,
    priorityCandidates.yValues,
    12 / zoom,
  );
  const guideX = findNearestAlignmentValue(
    priorityGuideX ?? assistedXPx,
    guideCandidates.xValues,
    8 / zoom,
  );
  const guideY = findNearestAlignmentValue(
    priorityGuideY ?? assistedYPx,
    guideCandidates.yValues,
    8 / zoom,
  );

  return {
    xPx: priorityGuideX ?? guideX ?? assistedXPx,
    yPx: priorityGuideY ?? guideY ?? assistedYPx,
    xUm: (priorityGuideX ?? guideX ?? assistedXPx) / UM_TO_PX,
    yUm: (priorityGuideY ?? guideY ?? assistedYPx) / UM_TO_PX,
    guideX: priorityGuideX ?? guideX ?? null,
    guideY: priorityGuideY ?? guideY ?? null,
  };
}

function getNearestSegmentInsertion(routePoints: RoutingPoint[], pointer: RoutingPoint) {
  let best:
    | { segmentIndex: number; point: RoutingPoint; distance: number }
    | null = null;

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const start = routePoints[index];
    const end = routePoints[index + 1];
    const isVertical = Math.abs(start.x - end.x) < 0.01;
    const projected = isVertical
      ? {
          x: start.x,
          y: Math.min(Math.max(pointer.y, Math.min(start.y, end.y)), Math.max(start.y, end.y)),
        }
      : {
          x: Math.min(Math.max(pointer.x, Math.min(start.x, end.x)), Math.max(start.x, end.x)),
          y: start.y,
        };
    const distance = Math.hypot(projected.x - pointer.x, projected.y - pointer.y);

    if (!best || distance < best.distance) {
      best = { segmentIndex: index, point: projected, distance };
    }
  }

  return best;
}

function renderPinHotspot(
  packageDef: PackageDefinition,
  componentId: string,
  pinId: string,
  point: PinPoint,
  emphasized: boolean,
  onPinMouseDown: (
    event: React.MouseEvent<SVGCircleElement>,
    componentId: string,
    pinId: string,
  ) => void,
) {
  const isFemaleHeader = packageDef.kind === "header" && packageDef.connectorStyle === "female-header";
  const visualRadius =
    packageDef.kind === "chip2"
      ? 1.7
      : packageDef.kind === "sot23"
        ? 1.9
        : packageDef.kind === "soic"
          ? 2.1
          : packageDef.kind === "qfp"
            ? 2.2
            : packageDef.kind === "header"
              ? 3
              : 2.7;
  const hitRadius =
    packageDef.kind === "chip2" || packageDef.kind === "sot23" || packageDef.kind === "soic"
      ? 6
      : 7;

  return (
    <g key={`${componentId}_${pinId}`}>
      {emphasized ? (
        <circle
          cx={point.xPx}
          cy={point.yPx}
          r={hitRadius - 1}
          fill="none"
          stroke={STAGE_PIN_RING}
          strokeWidth={0.9}
          opacity={0.46}
          pointerEvents="none"
        />
      ) : null}
      <circle
        cx={point.xPx}
        cy={point.yPx}
        r={visualRadius}
        fill={isFemaleHeader ? "#f4f4f4" : "#000000"}
        stroke={isFemaleHeader ? "#1a1a1a" : "#ffffff"}
        strokeWidth={0.95}
      />
      <circle
        cx={point.xPx}
        cy={point.yPx}
        r={hitRadius}
        fill="transparent"
        className="cursor-crosshair"
        onMouseDown={(event) => onPinMouseDown(event, componentId, pinId)}
      />
    </g>
  );
}

function renderComponentShape(
  component: CircuitComponent,
  packageDef: PackageDefinition,
  selected: boolean,
) {
  const stageBounds = getComponentBoundsPx(component, packageDef);
  const bounds = getLocalPackageBoundsPx(component, packageDef);
  const rotationDeg = normalizeRotationDeg(component.rotationDeg);
  const stroke = PACKAGE_OUTLINE;
  const strokeWidth = selected ? 1.8 : 1.4;
  const leadStroke = PACKAGE_METAL;
  const fill = PACKAGE_BODY_FILL;
  const pinPoints = packageDef.pins.map((pin) => getBasePinPoint(bounds, packageDef, pin.id));

  const shape = (() => {
    switch (packageDef.kind) {
      case "dip":
        return (
        <>
          <rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} rx={6} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <path
            d={`M ${bounds.centerX - 7} ${bounds.top} A 7 7 0 0 0 ${bounds.centerX + 7} ${bounds.top}`}
            fill="none"
            stroke={PACKAGE_DETAIL}
            strokeWidth={strokeWidth}
          />
          {pinPoints.map((point, index) => (
            <line
              key={`${component.id}_lead_${index}`}
              x1={index < packageDef.pins.length / 2 ? bounds.left : bounds.right}
              y1={point.yPx}
              x2={point.xPx}
              y2={point.yPx}
              stroke={leadStroke}
              strokeWidth={1.1}
            />
          ))}
        </>
        );

      case "soic":
        return (
        <>
          <rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} rx={4} fill={PACKAGE_BODY_FILL_DARK} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={bounds.left + 5} cy={bounds.top + 5} r={2.2} fill={PACKAGE_DETAIL} />
          {pinPoints.map((point, index) => (
            <line
              key={`${component.id}_lead_${index}`}
              x1={index < packageDef.pins.length / 2 ? bounds.left : bounds.right}
              y1={point.yPx}
              x2={point.xPx}
              y2={point.yPx}
              stroke={leadStroke}
              strokeWidth={1}
            />
          ))}
        </>
        );

      case "qfp":
        return (
        <>
          <rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} rx={5} fill={PACKAGE_BODY_FILL_DARK} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={bounds.left + 6} cy={bounds.top + 6} r={2.4} fill={PACKAGE_DETAIL} />
          {pinPoints.map((point, index) => {
            const anchorX =
              point.xPx < bounds.left
                ? bounds.left
                : point.xPx > bounds.right
                  ? bounds.right
                  : point.xPx;
            const anchorY =
              point.yPx < bounds.top
                ? bounds.top
                : point.yPx > bounds.bottom
                  ? bounds.bottom
                  : point.yPx;

            return (
              <line
                key={`${component.id}_lead_${index}`}
                x1={anchorX}
                y1={anchorY}
                x2={point.xPx}
                y2={point.yPx}
                stroke={leadStroke}
                strokeWidth={1}
              />
            );
          })}
        </>
        );

      case "sot23": {
        const leftPins = Math.ceil(packageDef.pins.length / 2);
        return (
        <>
          <rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} rx={3} fill={PACKAGE_BODY_FILL_DARK} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={bounds.left + 4} cy={bounds.top + 4} r={1.8} fill={PACKAGE_DETAIL} />
          {pinPoints.map((point, index) => (
            <line
              key={`${component.id}_lead_${index}`}
              x1={index < leftPins ? bounds.left : bounds.right}
              y1={point.yPx}
              x2={point.xPx}
              y2={point.yPx}
              stroke={leadStroke}
              strokeWidth={1}
            />
          ))}
        </>
        );
      }

      case "chip2": {
        const padWidth = Math.max(3, bounds.width * 0.18);
        const padHeight = Math.max(5, bounds.height * 0.86);
        return (
        <>
          <rect
            x={bounds.left + padWidth * 0.55}
            y={bounds.top}
            width={bounds.width - padWidth * 1.1}
            height={bounds.height}
            rx={Math.max(2, bounds.height * 0.2)}
            fill={PACKAGE_BODY_FILL}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <rect
            x={bounds.left - 2}
            y={bounds.centerY - padHeight / 2}
            width={padWidth}
            height={padHeight}
            rx={2}
            fill={PACKAGE_METAL}
            stroke={PACKAGE_OUTLINE}
            strokeWidth={0.9}
          />
          <rect
            x={bounds.right - padWidth + 2}
            y={bounds.centerY - padHeight / 2}
            width={padWidth}
            height={padHeight}
            rx={2}
            fill={PACKAGE_METAL}
            stroke={PACKAGE_OUTLINE}
            strokeWidth={0.9}
          />
        </>
        );
      }

      case "header":
        switch (packageDef.connectorStyle) {
          case "female-header":
            return (
            <>
              <rect
                x={bounds.left}
                y={bounds.top}
                width={bounds.width}
                height={bounds.height}
                rx={4}
                fill={PACKAGE_SOCKET_FILL}
                stroke="#f4f4f4"
                strokeWidth={strokeWidth}
              />
              {pinPoints.map((point) => (
                <g key={`${component.id}_${point.label}_socket`}>
                  <rect
                    x={point.xPx - 4.2}
                    y={point.yPx - 4.2}
                    width={8.4}
                    height={8.4}
                    rx={1.6}
                    fill="#424242"
                    stroke="#d8d8d8"
                    strokeWidth={0.75}
                  />
                  <circle
                    cx={point.xPx}
                    cy={point.yPx}
                    r={1.9}
                    fill="#f4f4f4"
                    stroke="#111111"
                    strokeWidth={0.65}
                  />
                </g>
              ))}
            </>
            );

          case "jst-ph":
            return (
            <>
              <rect
                x={bounds.left}
                y={bounds.top}
                width={bounds.width}
                height={bounds.height}
                rx={5}
                fill={PACKAGE_BODY_FILL}
                stroke="#111111"
                strokeWidth={strokeWidth}
              />
              <rect
                x={bounds.left + bounds.width * 0.12}
                y={bounds.top + bounds.height * 0.22}
                width={bounds.width * 0.76}
                height={bounds.height * 0.26}
                rx={3}
                fill={PACKAGE_METAL_LIGHT}
                stroke="#111111"
                strokeWidth={0.75}
              />
              {pinPoints.map((point) => (
                <g key={`${component.id}_${point.label}_jst`}>
                  <rect
                    x={point.xPx - 2.6}
                    y={point.yPx - 3.6}
                    width={5.2}
                    height={7.2}
                    rx={1.1}
                    fill={PACKAGE_SOCKET_FILL}
                    stroke="#ffffff"
                    strokeWidth={0.6}
                  />
                  <line
                    x1={point.xPx}
                    y1={point.yPx + 3.6}
                    x2={point.xPx}
                    y2={point.yPx + 8}
                    stroke="#ffffff"
                    strokeWidth={0.9}
                  />
                </g>
              ))}
            </>
            );

          case "terminal-block":
            return (
            <>
              <rect
                x={bounds.left}
                y={bounds.top}
                width={bounds.width}
                height={bounds.height}
                rx={4}
                fill="#757575"
                stroke="#111111"
                strokeWidth={strokeWidth}
              />
              {pinPoints.map((point) => (
                <g key={`${component.id}_${point.label}_terminal`}>
                  <circle
                    cx={point.xPx}
                    cy={bounds.top + bounds.height * 0.34}
                    r={3.5}
                    fill="#dcdcdc"
                    stroke="#111111"
                    strokeWidth={0.75}
                  />
                  <line
                    x1={point.xPx - 1.8}
                    y1={bounds.top + bounds.height * 0.34}
                    x2={point.xPx + 1.8}
                    y2={bounds.top + bounds.height * 0.34}
                    stroke="#111111"
                    strokeWidth={0.75}
                  />
                  <rect
                    x={point.xPx - 3.5}
                    y={bounds.top + bounds.height * 0.58}
                    width={7}
                    height={4.6}
                    rx={1}
                    fill={PACKAGE_SOCKET_FILL}
                    stroke="#f2f2f2"
                    strokeWidth={0.55}
                  />
                </g>
              ))}
            </>
            );

          case "idc-box":
            return (
            <>
              <rect
                x={bounds.left}
                y={bounds.top}
                width={bounds.width}
                height={bounds.height}
                rx={4}
                fill={PACKAGE_BODY_FILL}
                stroke="#111111"
                strokeWidth={strokeWidth}
              />
              <rect
                x={bounds.left + 3}
                y={bounds.top + 3}
                width={bounds.width - 6}
                height={bounds.height - 6}
                rx={3}
                fill={PACKAGE_METAL_LIGHT}
                stroke="#111111"
                strokeWidth={0.75}
              />
              <rect
                x={bounds.centerX - bounds.width * 0.16}
                y={bounds.top - 2}
                width={bounds.width * 0.32}
                height={4}
                rx={1}
                fill="#111111"
              />
              {pinPoints.map((point) => (
                <rect
                  key={`${component.id}_${point.label}_idc`}
                  x={point.xPx - 2.3}
                  y={point.yPx - 2.3}
                  width={4.6}
                  height={4.6}
                  rx={0.9}
                  fill={PACKAGE_SOCKET_FILL}
                  stroke={STAGE_GUIDE_COLOR}
                  strokeWidth={0.55}
                />
              ))}
            </>
            );

          case "pin-header":
          default:
            return (
            <>
              <rect
                x={bounds.left}
                y={bounds.top}
                width={bounds.width}
                height={bounds.height}
                rx={4}
                fill={PACKAGE_SOCKET_FILL}
                stroke="#f4f4f4"
                strokeWidth={strokeWidth}
              />
              {pinPoints.map((point) => (
                <g key={`${component.id}_${point.label}_pin`}>
                  <rect
                    x={point.xPx - 3.4}
                    y={point.yPx - 3.4}
                    width={6.8}
                    height={6.8}
                    rx={1.1}
                    fill="#e6e6e6"
                    stroke="#111111"
                    strokeWidth={0.65}
                  />
                  <rect
                    x={point.xPx - 1}
                    y={point.yPx - 6.5}
                    width={2}
                    height={4}
                    rx={0.6}
                    fill={PACKAGE_METAL_LIGHT}
                    stroke="#111111"
                    strokeWidth={0.45}
                  />
                </g>
              ))}
            </>
            );
        }

      case "to220":
        return (
        <>
          <rect
            x={bounds.left}
            y={bounds.top - bounds.height * 0.35}
            width={bounds.width}
            height={bounds.height * 0.35}
            rx={4}
            fill={PACKAGE_METAL_LIGHT}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <circle cx={bounds.centerX} cy={bounds.top - bounds.height * 0.17} r={4} fill="none" stroke={PACKAGE_DETAIL} strokeWidth={1} />
          <rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} rx={6} fill={PACKAGE_BODY_FILL_DARK} stroke={stroke} strokeWidth={strokeWidth} />
          {pinPoints.map((point, index) => (
            <line
              key={`${component.id}_lead_${index}`}
              x1={point.xPx}
              y1={bounds.bottom}
              x2={point.xPx}
              y2={point.yPx}
              stroke={leadStroke}
              strokeWidth={1.1}
            />
          ))}
        </>
        );

      case "led":
        return (
        <>
          <circle cx={bounds.centerX} cy={bounds.centerY} r={bounds.width / 2} fill={PACKAGE_BODY_FILL} stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={bounds.left + bounds.width * 0.25} y1={bounds.bottom} x2={pinPoints[0].xPx} y2={pinPoints[0].yPx} stroke={leadStroke} strokeWidth={1.1} />
          <line x1={bounds.left + bounds.width * 0.75} y1={bounds.bottom} x2={pinPoints[1].xPx} y2={pinPoints[1].yPx} stroke={leadStroke} strokeWidth={1.1} />
          <line x1={bounds.left + bounds.width * 0.28} y1={bounds.top + 2} x2={bounds.left + bounds.width * 0.28} y2={bounds.bottom - 2} stroke={PACKAGE_DETAIL} strokeWidth={1} />
        </>
        );

      case "resistor":
        return (
        <>
          <line x1={pinPoints[0].xPx} y1={pinPoints[0].yPx} x2={bounds.left} y2={bounds.centerY} stroke={leadStroke} strokeWidth={1.1} />
          <line x1={bounds.right} y1={bounds.centerY} x2={pinPoints[1].xPx} y2={pinPoints[1].yPx} stroke={leadStroke} strokeWidth={1.1} />
          <rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} rx={bounds.height / 2} fill={PACKAGE_BODY_FILL} stroke={stroke} strokeWidth={strokeWidth} />
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
            <line
              key={`${component.id}_band_${ratio}`}
              x1={bounds.left + bounds.width * ratio}
              y1={bounds.top + 1.5}
              x2={bounds.left + bounds.width * ratio}
              y2={bounds.bottom - 1.5}
              stroke={PACKAGE_DETAIL}
              strokeWidth={1.1}
            />
          ))}
        </>
        );

      case "capacitor":
        return (
        <>
          <circle cx={bounds.centerX} cy={bounds.centerY} r={bounds.width / 2} fill={PACKAGE_BODY_FILL_DARK} stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={bounds.left + bounds.width * 0.25} y1={bounds.bottom} x2={pinPoints[0].xPx} y2={pinPoints[0].yPx} stroke={leadStroke} strokeWidth={1.1} />
          <line x1={bounds.left + bounds.width * 0.75} y1={bounds.bottom} x2={pinPoints[1].xPx} y2={pinPoints[1].yPx} stroke={leadStroke} strokeWidth={1.1} />
          <line x1={bounds.left + bounds.width * 0.32} y1={bounds.top + bounds.height * 0.18} x2={bounds.left + bounds.width * 0.32} y2={bounds.top + bounds.height * 0.82} stroke={PACKAGE_DETAIL} strokeWidth={1} />
        </>
        );

      case "button":
        return (
        <>
          <rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} rx={6} fill={PACKAGE_BODY_FILL_DARK} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={bounds.centerX} cy={bounds.centerY} r={bounds.width * 0.24} fill={PACKAGE_METAL_LIGHT} stroke={stroke} strokeWidth={1} />
          {pinPoints.map((point, index) => (
            <line
              key={`${component.id}_lead_${index}`}
              x1={index < 2 ? bounds.left : bounds.right}
              y1={point.yPx}
              x2={point.xPx}
              y2={point.yPx}
              stroke={leadStroke}
              strokeWidth={1.1}
            />
          ))}
        </>
        );
    }
  })();

  if (rotationDeg === 0) {
    return shape;
  }

  return (
    <g transform={`rotate(${rotationDeg} ${stageBounds.centerX} ${stageBounds.centerY})`}>
      {shape}
    </g>
  );
}

function renderResizeAffordance(
  component: CircuitComponent,
  packageDef: PackageDefinition,
  selected: boolean,
) {
  if (!isResizableLibraryItem(component.libraryItemId) || !selected) {
    return null;
  }

  const bounds = getComponentBoundsPx(component, packageDef);
  const resizeMode = getLibraryItem(component.libraryItemId).resizeBehavior.mode;
  const resizeBehavior = getLibraryItem(component.libraryItemId).resizeBehavior;
  const showEastHandle =
    resizeMode === "mapped-pin-step" ||
    (resizeMode === "linear-pin-step" ? resizeBehavior.fixedColumnCount == null : true);
  const showSouthHandle =
    resizeMode === "linear-pin-step" ? resizeBehavior.fixedRowCount == null : resizeMode !== "mapped-pin-step";

  if (resizeMode === "mapped-pin-step") {
    return (
      <circle
        cx={bounds.right}
        cy={bounds.bottom}
        r={4.5}
        fill={STAGE_HANDLE_FILL}
      />
    );
  }

  return (
    <>
      <path
        d={`M ${bounds.right - 12} ${bounds.bottom} L ${bounds.right} ${bounds.bottom} L ${bounds.right} ${bounds.bottom - 12}`}
        fill="none"
        stroke={STAGE_SELECTION_COLOR}
        strokeWidth={1.4}
        opacity={selected ? 0.95 : 0.45}
      />
      {selected ? (
        <>
          {showEastHandle ? <circle cx={bounds.right} cy={bounds.centerY} r={3.5} fill={STAGE_HANDLE_FILL} stroke={STAGE_HANDLE_STROKE} strokeWidth={1} /> : null}
          {showSouthHandle ? <circle cx={bounds.centerX} cy={bounds.bottom} r={3.5} fill={STAGE_HANDLE_FILL} stroke={STAGE_HANDLE_STROKE} strokeWidth={1} /> : null}
          <circle cx={bounds.right} cy={bounds.bottom} r={4.5} fill={STAGE_HANDLE_FILL} stroke={STAGE_HANDLE_STROKE} strokeWidth={1} />
        </>
      ) : null}
    </>
  );
}

function RenderComponent({
  component,
  selected,
  emphasizedPins,
  readabilityIssue,
  onComponentMouseDown,
  onPinMouseDown,
}: {
  component: CircuitComponent;
  selected: boolean;
  emphasizedPins: boolean;
  readabilityIssue: "overlap" | "crowded" | null;
  onComponentMouseDown: (event: React.MouseEvent<SVGGElement>, componentId: string) => void;
  onPinMouseDown: (
    event: React.MouseEvent<SVGCircleElement>,
    componentId: string,
    pinId: string,
  ) => void;
}) {
  const packageDef = resolvePackageByItemId(component.libraryItemId, component.packageState);
  const bounds = getComponentBoundsPx(component, packageDef);
  const pinPoints = packageDef.pins.map((pin) => getPinPoint(component, packageDef, pin.id));
  const labelWidth = estimateStageLabelWidth(component.reference);

  return (
    <g onMouseDown={(event) => onComponentMouseDown(event, component.id)}>
      {!selected && readabilityIssue === "overlap" ? (
        <rect
          x={bounds.left - 12}
          y={bounds.top - 12}
          width={bounds.width + 24}
          height={bounds.height + 24}
          rx={12}
          fill={STAGE_WARNING_OVERLAP}
          opacity={0.06}
          pointerEvents="none"
        />
      ) : null}
      {!selected && readabilityIssue === "crowded" ? (
        <rect
          x={bounds.left - 10}
          y={bounds.top - 10}
          width={bounds.width + 20}
          height={bounds.height + 20}
          rx={10}
          fill={STAGE_WARNING_CROWDED}
          opacity={0.04}
          pointerEvents="none"
        />
      ) : null}
      {selected ? (
        <>
          <rect
            x={bounds.left - 14}
            y={bounds.top - 14}
            width={bounds.width + 28}
            height={bounds.height + 28}
            rx={14}
            fill={STAGE_SELECTION_FILL}
            opacity={0.06}
            pointerEvents="none"
          />
          <rect
            x={bounds.left - 10}
            y={bounds.top - 10}
            width={bounds.width + 20}
            height={bounds.height + 20}
            rx={10}
            fill="none"
            stroke={STAGE_SELECTION_COLOR}
            strokeWidth={1.1}
            opacity={0.9}
          />
        </>
      ) : null}

      {renderComponentShape(component, packageDef, selected)}
      {renderResizeAffordance(component, packageDef, selected)}

      {pinPoints.map((point, index) =>
        renderPinHotspot(
          packageDef,
          component.id,
          packageDef.pins[index].id,
          point,
          emphasizedPins,
          onPinMouseDown,
        ),
      )}

      <g pointerEvents="none">
        <rect
          x={bounds.centerX - labelWidth / 2}
          y={bounds.top - 27}
          width={labelWidth}
          height={16}
          rx={8}
          fill={selected ? "#ffffff" : "#000000"}
          opacity={selected ? 1 : 0.88}
          stroke={selected ? "#ffffff" : "#ffffff"}
          strokeWidth={selected ? 0 : 0.6}
        />
        <text
          x={bounds.centerX}
          y={bounds.top - 15}
          textAnchor="middle"
          className="font-mono text-[11px]"
          fill={selected ? "#000000" : STAGE_LABEL_COLOR}
        >
          {component.reference}
        </text>
      </g>
    </g>
  );
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedViewportRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const routeDragRef = useRef<RouteDragState | null>(null);
  const junctionDragRef = useRef<JunctionDragState | null>(null);

  const components = useEditorStore((state) => state.components);
  const junctions = useEditorStore((state) => state.junctions);
  const connections = useEditorStore((state) => state.connections);
  const selectedComponentId = useEditorStore((state) => state.selectedComponentId);
  const selectedJunctionId = useEditorStore((state) => state.selectedJunctionId);
  const selectedConnectionId = useEditorStore((state) => state.selectedConnectionId);
  const viewport = useEditorStore((state) => state.viewport);
  const activeWire = useEditorStore((state) => state.activeWire);
  const displayUnit = useEditorStore((state) => state.displayUnit);
  const pendingLibraryItemId = useEditorStore((state) => state.pendingLibraryItemId);
  const pendingDraftId = useEditorStore((state) => state.pendingDraftId);
  const componentDrafts = useEditorStore((state) => state.componentDrafts);
  const selectComponent = useEditorStore((state) => state.selectComponent);
  const selectJunction = useEditorStore((state) => state.selectJunction);
  const selectConnection = useEditorStore((state) => state.selectConnection);
  const addComponentAt = useEditorStore((state) => state.addComponentAt);
  const addDraftComponentAt = useEditorStore((state) => state.addDraftComponentAt);
  const updateComponent = useEditorStore((state) => state.updateComponent);
  const rotateComponent = useEditorStore((state) => state.rotateComponent);
  const resizeComponent = useEditorStore((state) => state.resizeComponent);
  const setViewport = useEditorStore((state) => state.setViewport);
  const setCanvasFrame = useEditorStore((state) => state.setCanvasFrame);
  const addJunctionAt = useEditorStore((state) => state.addJunctionAt);
  const updateJunction = useEditorStore((state) => state.updateJunction);
  const startWire = useEditorStore((state) => state.startWire);
  const addActiveWireRoutePoint = useEditorStore((state) => state.addActiveWireRoutePoint);
  const completeWire = useEditorStore((state) => state.completeWire);
  const cancelWire = useEditorStore((state) => state.cancelWire);
  const removeComponent = useEditorStore((state) => state.removeComponent);
  const removeJunction = useEditorStore((state) => state.removeJunction);
  const removeConnection = useEditorStore((state) => state.removeConnection);
  const setConnectionRoutePoints = useEditorStore((state) => state.setConnectionRoutePoints);
  const setPendingLibraryItem = useEditorStore((state) => state.setPendingLibraryItem);
  const setPendingDraft = useEditorStore((state) => state.setPendingDraft);

  const [cursor, setCursor] = useState("default");
  const [hoverPointer, setHoverPointer] = useState<CanvasPointer>({
    xPx: 0,
    yPx: 0,
    xUm: 0,
    yUm: 0,
  });
  const [wirePointer, setWirePointer] = useState<CanvasPointer>({
    xPx: 0,
    yPx: 0,
    xUm: 0,
    yUm: 0,
  });
  const [dragPlacementGuides, setDragPlacementGuides] = useState<AlignmentGuides>({
    x: null,
    y: null,
  });
  const [routeDragGuides, setRouteDragGuides] = useState<AlignmentGuides>({
    x: null,
    y: null,
  });
  const [gridVisible, setGridVisible] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.4);
  const [clarityMode, setClarityMode] = useState(true);
  const [textureVisible, setTextureVisible] = useState(true);
  const [textureKey, setTextureKey] = useState<'texture1' | 'texture2' | 'texture3' | 'texture4'>('texture2');
  const [textureEditMode, setTextureEditMode] = useState(false);
  const [junctionEditMode, setJunctionEditMode] = useState(false);
  const [textureViewport, setTextureViewport] = useState({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const stopCanvasGesturePropagation = (
    event:
      | React.MouseEvent<HTMLElement>
      | React.PointerEvent<HTMLElement>
      | React.WheelEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
  };

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setCanvasFrame(entry.contentRect.width, entry.contentRect.height);

      if (!initializedViewportRef.current) {
        initializedViewportRef.current = true;
        const state = useEditorStore.getState();
        if (
          state.viewport.x === 120 &&
          state.viewport.y === 80 &&
          state.viewport.zoom === 1
        ) {
          setViewport({
            x: 0,
            y: entry.contentRect.height,
            zoom: 1,
          });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [setCanvasFrame, setViewport]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      if (textureEditMode) {
        setTextureViewport((current) => {
          const nextZoom = Math.max(
            0.25,
            Math.min(6, current.zoom * (event.deltaY < 0 ? 1.1 : 0.9)),
          );
          const scale = nextZoom / current.zoom;

          return {
            zoom: nextZoom,
            x: mouseX - (mouseX - current.x) * scale,
            y: mouseY - (mouseY - current.y) * scale,
          };
        });
        return;
      }

      const currentViewport = useEditorStore.getState().viewport;
      const nextZoom = Math.max(
        0.1,
        Math.min(12, currentViewport.zoom * (event.deltaY < 0 ? 1.1 : 0.9)),
      );
      const scale = nextZoom / currentViewport.zoom;

      setViewport({
        zoom: nextZoom,
        x: mouseX - (mouseX - currentViewport.x) * scale,
        y: mouseY - (mouseY - currentViewport.y) * scale,
      });
    };

    container.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleNativeWheel);
  }, [setViewport, textureEditMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === "Escape") {
        if (pendingLibraryItemId) {
          setPendingLibraryItem(null);
        }
        if (pendingDraftId) {
          setPendingDraft(null);
        }
        if (activeWire) {
          cancelWire();
          setCursor(textureEditMode ? "move" : "default");
        }
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && !activeWire) {
        if (selectedConnectionId) {
          event.preventDefault();
          removeConnection(selectedConnectionId);
          return;
        }

        if (selectedJunctionId) {
          event.preventDefault();
          removeJunction(selectedJunctionId);
          return;
        }

        if (selectedComponentId) {
          event.preventDefault();
          removeComponent(selectedComponentId);
          return;
        }
      }

      if (event.key.toLowerCase() === "r" && selectedComponentId) {
        event.preventDefault();
        rotateComponent(selectedComponentId, event.shiftKey ? -90 : 90);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeWire,
    cancelWire,
    pendingDraftId,
    pendingLibraryItemId,
    removeComponent,
    removeJunction,
    removeConnection,
    rotateComponent,
    selectedConnectionId,
    selectedComponentId,
    selectedJunctionId,
    setPendingDraft,
    setPendingLibraryItem,
    textureEditMode,
  ]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const state = useEditorStore.getState();
      const pointer = pointerToCanvasUnits(
        event,
        container,
        state.viewport.x,
        state.viewport.y,
        state.viewport.zoom,
      );
      setHoverPointer(pointer);

      if (state.activeWire) {
        setWirePointer(pointer);
      }

      if (panRef.current) {
        if (panRef.current.mode === "texture") {
          setTextureViewport((current) => ({
            ...current,
            x: panRef.current!.startX + (event.clientX - panRef.current!.startClientX),
            y: panRef.current!.startY + (event.clientY - panRef.current!.startClientY),
          }));
        } else {
          setViewport({
            x: panRef.current.startX + (event.clientX - panRef.current.startClientX),
            y: panRef.current.startY + (event.clientY - panRef.current.startClientY),
          });
        }
        return;
      }

      if (routeDragRef.current) {
        const fullPointIndex = routeDragRef.current.bendIndex + 1;
        const adjacentAnchors = routeDragRef.current.fullRoutePointsUm.filter(
          (_, index) => index === fullPointIndex - 1 || index === fullPointIndex + 1,
        );
        const guideCandidates = collectWireAlignmentCandidates(
          null,
          routePointsUmToPx(routeDragRef.current.routePointsUm),
          state.components,
          state.junctions,
        );
        const priorityCandidates = getPriorityWireAlignmentCandidates(
          { x: pointer.xPx, y: pointer.yPx },
          state.components,
          state.junctions,
          state.viewport.zoom,
        );
        const assistedPointUm = getAssistedWirePointPx(
          {
            xUm: snapToRoutingGrid(pointer.xUm),
            yUm: snapToRoutingGrid(pointer.yUm),
          },
          { x: pointer.xPx, y: pointer.yPx },
          adjacentAnchors,
          guideCandidates,
          priorityCandidates,
          state.viewport.zoom,
        );
        setRouteDragGuides({
          x: assistedPointUm.guideX,
          y: assistedPointUm.guideY,
        });
        const nextRoutePointsUm = routeDragRef.current.routePointsUm.map((point, index) =>
          index === routeDragRef.current!.bendIndex
            ? {
                xUm: assistedPointUm.xUm,
                yUm: assistedPointUm.yUm,
              }
            : point,
        );
        setConnectionRoutePoints(routeDragRef.current.connectionId, nextRoutePointsUm);
        return;
      }

      if (junctionDragRef.current) {
        const deltaXUm = pointer.xUm - junctionDragRef.current.startPointerXUm;
        const deltaYUm = pointer.yUm - junctionDragRef.current.startPointerYUm;
        updateJunction(junctionDragRef.current.junctionId, {
          xUm: junctionDragRef.current.startXUm + deltaXUm,
          yUm: junctionDragRef.current.startYUm + deltaYUm,
        });
        return;
      }

      if (resizeRef.current) {
        resizeComponent(
          resizeRef.current.componentId,
          resizeRef.current.handle,
          snapToGrid(pointer.xUm),
          snapToGrid(pointer.yUm),
        );
        return;
      }

      if (dragRef.current) {
        const deltaXUm = pointer.xUm - dragRef.current.startPointerXUm;
        const deltaYUm = pointer.yUm - dragRef.current.startPointerYUm;
        const draggedComponent = state.components.find(
          (component) => component.id === dragRef.current?.componentId,
        );
        if (!draggedComponent) {
          return;
        }

        const assistedPlacement = getPlacementAssist(
          {
            ...draggedComponent,
            xUm: dragRef.current.startXUm + deltaXUm,
            yUm: dragRef.current.startYUm + deltaYUm,
          },
          state.components,
          state.junctions,
          state.viewport.zoom,
          [dragRef.current.componentId],
        );
        setDragPlacementGuides({
          x: assistedPlacement.guideX,
          y: assistedPlacement.guideY,
        });
        updateComponent(dragRef.current.componentId, {
          xUm: assistedPlacement.xUm,
          yUm: assistedPlacement.yUm,
        });
        return;
      }

      const selectedComponent = state.components.find(
        (component) => component.id === state.selectedComponentId,
      );
      if (selectedComponent) {
        const packageDef = resolvePackageByItemId(
          selectedComponent.libraryItemId,
          selectedComponent.packageState,
        );
        const bounds = getComponentBoundsPx(selectedComponent, packageDef);
        const resizeZone = getResizeZone(
          selectedComponent,
          packageDef,
          pointer.xPx,
          pointer.yPx,
        );

        const nextCursor = resizeZone
          ? getResizeCursor(resizeZone)
          : pointer.xPx >= bounds.left - 10 &&
              pointer.xPx <= bounds.right + 10 &&
              pointer.yPx >= bounds.top - 10 &&
              pointer.yPx <= bounds.bottom + 10
            ? "grab"
            : state.activeWire
              ? "crosshair"
              : "default";

        setCursor((current) => (current === nextCursor ? current : nextCursor));
        return;
      }

      const nextCursor = state.activeWire
        ? "crosshair"
        : state.pendingLibraryItemId || state.pendingDraftId
          ? "crosshair"
        : junctionEditMode
          ? "crosshair"
        : textureEditMode
            ? "move"
            : "default";
      setDragPlacementGuides({ x: null, y: null });
      setRouteDragGuides({ x: null, y: null });
      setCursor((current) => (current === nextCursor ? current : nextCursor));
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        const state = useEditorStore.getState();
        const component = state.components.find((c) => c.id === dragRef.current?.componentId);
        if (component) {
          updateComponent(component.id, {
            xUm: snapToGrid(component.xUm),
            yUm: snapToGrid(component.yUm),
          });
        }
      }

      dragRef.current = null;
      resizeRef.current = null;
      panRef.current = null;
      routeDragRef.current = null;
      junctionDragRef.current = null;
      setDragPlacementGuides({ x: null, y: null });
      setRouteDragGuides({ x: null, y: null });
      setCursor(
        useEditorStore.getState().activeWire
          ? "crosshair"
          : useEditorStore.getState().pendingLibraryItemId || useEditorStore.getState().pendingDraftId
            ? "crosshair"
          : junctionEditMode
            ? "crosshair"
          : textureEditMode
            ? "move"
            : "default",
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    junctionEditMode,
    resizeComponent,
    setConnectionRoutePoints,
    setViewport,
    textureEditMode,
    updateComponent,
    updateJunction,
  ]);

  const handleBackgroundMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 2) {
      event.preventDefault();
      if (pendingLibraryItemId) {
        setPendingLibraryItem(null);
        setCursor(textureEditMode ? "move" : "default");
        return;
      }
      if (pendingDraftId) {
        setPendingDraft(null);
        setCursor(textureEditMode ? "move" : "default");
        return;
      }
      if (activeWire) {
        cancelWire();
        setCursor(textureEditMode ? "move" : "default");
      }
      return;
    }

    if (activeWire && event.button === 0 && containerRef.current) {
      event.preventDefault();
      const routePointUm = activeWireSnapPoint
        ? {
            xUm: activeWireSnapPoint.x / UM_TO_PX,
            yUm: activeWireSnapPoint.y / UM_TO_PX,
          }
        : (() => {
            const pointer = pointerToCanvasUnits(
              event,
              containerRef.current,
              viewport.x,
              viewport.y,
              viewport.zoom,
            );
            return {
              xUm: pointer.xUm,
              yUm: pointer.yUm,
            };
          })();
      addActiveWireRoutePoint(routePointUm.xUm, routePointUm.yUm);
      setCursor("crosshair");
      return;
    }

    if ((pendingLibraryItemId || pendingDraftId) && event.button === 0 && containerRef.current) {
      event.preventDefault();
      const pointer = pointerToCanvasUnits(
        event,
        containerRef.current,
        viewport.x,
        viewport.y,
        viewport.zoom,
      );
      const placementXUm = pendingPlacementComponent?.xUm ?? pointer.xUm;
      const placementYUm = pendingPlacementComponent?.yUm ?? pointer.yUm;
      const nextComponent = pendingDraftId
        ? addDraftComponentAt(
            pendingDraftId,
            placementXUm,
            placementYUm,
          )
        : pendingLibraryItemId
          ? addComponentAt(
              pendingLibraryItemId,
              placementXUm,
              placementYUm,
            )
          : null;
      if (!nextComponent) {
        return;
      }
      dragRef.current = {
        componentId: nextComponent.id,
        startXUm: nextComponent.xUm,
        startYUm: nextComponent.yUm,
        startPointerXUm: pointer.xUm,
        startPointerYUm: pointer.yUm,
      };
      setCursor("grabbing");
      return;
    }

    if (junctionEditMode && event.button === 0 && containerRef.current) {
      event.preventDefault();
      const pointer = pointerToCanvasUnits(
        event,
        containerRef.current,
        viewport.x,
        viewport.y,
        viewport.zoom,
      );
      addJunctionAt(pointer.xUm, pointer.yUm);
      setCursor("crosshair");
      return;
    }

    if (event.button === 0 || event.button === 1) {
      event.preventDefault();
      panRef.current = {
        mode: textureEditMode ? "texture" : "viewport",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: textureEditMode ? textureViewport.x : viewport.x,
        startY: textureEditMode ? textureViewport.y : viewport.y,
      };
      selectComponent(null);
      selectJunction(null);
      setCursor(textureEditMode ? "move" : "grabbing");
      return;
    }
  };

  const handleConnectionMouseDown = (
    event: React.MouseEvent<SVGPathElement>,
    connectionId: string,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    selectConnection(connectionId);
    setCursor("default");
  };

  const handleConnectionBendMouseDown = (
    event: React.MouseEvent<SVGCircleElement>,
    connectionId: string,
    bendIndex: number,
    routePoints: RoutingPoint[],
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    selectConnection(connectionId);
    routeDragRef.current = {
      connectionId,
      bendIndex,
      routePointsUm: routePointsPxToUm(getConnectionInteriorRoutePoints(routePoints)),
      fullRoutePointsUm: routePointsPxToUm(routePoints),
    };
    setRouteDragGuides({ x: null, y: null });
    setCursor("move");
  };

  const handleConnectionPathDoubleClick = (
    event: React.MouseEvent<SVGPathElement>,
    connectionId: string,
    routePoints: RoutingPoint[],
  ) => {
    if (!containerRef.current) {
      return;
    }

    event.stopPropagation();
    const pointer = pointerToCanvasUnits(
      event,
      containerRef.current,
      viewport.x,
      viewport.y,
      viewport.zoom,
    );
    const nearestSegment = getNearestSegmentInsertion(routePoints, {
      x: pointer.xPx,
      y: pointer.yPx,
    });

    if (!nearestSegment || nearestSegment.distance > 14) {
      selectConnection(connectionId);
      return;
    }

    const anchorPointsUm = routePointsPxToUm([
      routePoints[nearestSegment.segmentIndex],
      routePoints[nearestSegment.segmentIndex + 1],
    ]);
    const guideCandidates = collectWireAlignmentCandidates(
      null,
      routePoints,
      components,
      junctions,
    );
    const priorityCandidates = getPriorityWireAlignmentCandidates(
      { x: pointer.xPx, y: pointer.yPx },
      components,
      junctions,
      viewport.zoom,
    );
    const assistedPoint = getAssistedWirePointPx(
      {
        xUm: snapToRoutingGrid(nearestSegment.point.x / UM_TO_PX),
        yUm: snapToRoutingGrid(nearestSegment.point.y / UM_TO_PX),
      },
      { x: pointer.xPx, y: pointer.yPx },
      anchorPointsUm,
      guideCandidates,
      priorityCandidates,
      viewport.zoom,
    );
    const insertedRoutePoints = insertRoutePointOnSegment(routePoints, nearestSegment.segmentIndex, {
      x: assistedPoint.xPx,
      y: assistedPoint.yPx,
    });

    setConnectionRoutePoints(connectionId, routePointsPxToUm(insertedRoutePoints));
    selectConnection(connectionId);
  };

  const handleConnectionBendDoubleClick = (
    event: React.MouseEvent<SVGCircleElement>,
    connectionId: string,
    bendIndex: number,
    routePoints: RoutingPoint[],
  ) => {
    event.stopPropagation();
    const nextRoutePoints = removeRoutePointAtIndex(routePoints, bendIndex);
    setConnectionRoutePoints(connectionId, routePointsPxToUm(nextRoutePoints));
    selectConnection(connectionId);
  };

  const handleComponentMouseDown = (
    event: React.MouseEvent<SVGGElement>,
    componentId: string,
  ) => {
    if (event.button !== 0 || !containerRef.current) {
      return;
    }

    event.stopPropagation();
    selectComponent(componentId);

    const component = useEditorStore
      .getState()
      .components.find((entry) => entry.id === componentId);
    if (!component) {
      return;
    }

    const pointer = pointerToCanvasUnits(
      event,
      containerRef.current,
      viewport.x,
      viewport.y,
      viewport.zoom,
    );
    const packageDef = resolvePackageByItemId(
      component.libraryItemId,
      component.packageState,
    );
    const resizeZone = getResizeZone(component, packageDef, pointer.xPx, pointer.yPx);

    if (resizeZone) {
      resizeRef.current = {
        componentId,
        handle: resizeZone,
      };
      setCursor(getResizeCursor(resizeZone));
      return;
    }

    dragRef.current = {
      componentId,
      startXUm: component.xUm,
      startYUm: component.yUm,
      startPointerXUm: pointer.xUm,
      startPointerYUm: pointer.yUm,
    };
    setCursor("grabbing");
  };

  const handlePinMouseDown = (
    event: React.MouseEvent<SVGCircleElement>,
    componentId: string,
    pinId: string,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (activeWire) {
      completeWire({ kind: "pin", componentId, pinId });
      setCursor(
        useEditorStore.getState().activeWire
          ? "crosshair"
          : textureEditMode
            ? "move"
            : "default",
      );
      return;
    }

    startWire({ kind: "pin", componentId, pinId });
    setCursor("crosshair");
  };

  const handleJunctionMouseDown = (
    event: React.MouseEvent<SVGCircleElement>,
    junctionId: string,
  ) => {
    if (event.button !== 0 || !containerRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (junctionEditMode) {
      const junction = junctions.find((entry) => entry.id === junctionId);
      if (!junction) {
        return;
      }

      const pointer = pointerToCanvasUnits(
        event,
        containerRef.current,
        viewport.x,
        viewport.y,
        viewport.zoom,
      );
      selectJunction(junctionId);
      junctionDragRef.current = {
        junctionId,
        startXUm: junction.xUm,
        startYUm: junction.yUm,
        startPointerXUm: pointer.xUm,
        startPointerYUm: pointer.yUm,
      };
      setCursor("move");
      return;
    }

    if (activeWire) {
      completeWire({ kind: "junction", junctionId });
      setCursor(
        useEditorStore.getState().activeWire
          ? "crosshair"
          : textureEditMode
            ? "move"
            : "default",
      );
      return;
    }

    startWire({ kind: "junction", junctionId });
    setCursor("crosshair");
  };

  const activeWireStart = activeWire
    ? getEndpointPoint(activeWire.from, components, junctions)
    : null;
  const activeWireRoutePointsPx = activeWire
    ? routePointsUmToPx(activeWire.routePointsUm)
    : [];
  const activeWireGuideCandidates = activeWire
    ? collectWireAlignmentCandidates(activeWireStart, activeWireRoutePointsPx, components, junctions)
    : { xValues: [], yValues: [] };
  const priorityWireGuideCandidates = activeWire
    ? getPriorityWireAlignmentCandidates(
        { x: wirePointer.xPx, y: wirePointer.yPx },
        components,
        junctions,
        viewport.zoom,
      )
    : { xValues: [], yValues: [] };
  const activeWireSnapPoint = activeWire
    ? (() => {
        const snappedPointUm = {
          xUm: snapToRoutingGrid(wirePointer.xUm),
          yUm: snapToRoutingGrid(wirePointer.yUm),
        };
        const endpointPoint = findNearestDraftEndpointPoint(
          { x: wirePointer.xPx, y: wirePointer.yPx },
          components,
          junctions,
        );
        return endpointPoint
          ? endpointPoint.kind === "pin"
            ? {
                x: endpointPoint.xPx,
                y: endpointPoint.yPx,
                kind: endpointPoint.kind,
                componentId: endpointPoint.componentId,
                pinId: endpointPoint.pinId,
              }
            : {
                x: endpointPoint.xPx,
                y: endpointPoint.yPx,
                kind: endpointPoint.kind,
                junctionId: endpointPoint.junctionId,
              }
          : (() => {
              const anchorPointsUm = [
                ...(activeWireStart
                  ? [
                      {
                        xUm: activeWireStart.xPx / UM_TO_PX,
                        yUm: activeWireStart.yPx / UM_TO_PX,
                      },
                    ]
                  : []),
                ...activeWire.routePointsUm,
              ];
              const assistedPoint = getAssistedWirePointPx(
                snappedPointUm,
                { x: wirePointer.xPx, y: wirePointer.yPx },
                anchorPointsUm,
                activeWireGuideCandidates,
                priorityWireGuideCandidates,
                viewport.zoom,
              );
              return {
                x: assistedPoint.xPx,
                y: assistedPoint.yPx,
                kind: "grid" as const,
              };
            })();
      })()
    : null;
  const activeWireAlignmentGuides = activeWire && activeWireSnapPoint
    ? (() => {
        return {
          x: findNearestAlignmentValue(activeWireSnapPoint.x, activeWireGuideCandidates.xValues),
          y: findNearestAlignmentValue(activeWireSnapPoint.y, activeWireGuideCandidates.yValues),
        };
      })()
    : { x: null, y: null };
  const selectedComponent = selectedComponentId
    ? components.find((component) => component.id === selectedComponentId) ?? null
    : null;
  const selectedConnection = selectedConnectionId
    ? connections.find((connection) => connection.id === selectedConnectionId) ?? null
    : null;
  const selectedJunction = selectedJunctionId
    ? junctions.find((junction) => junction.id === selectedJunctionId) ?? null
    : null;
  const hasFocusedSelection =
    Boolean(selectedComponentId) ||
    Boolean(selectedConnectionId) ||
    Boolean(selectedJunctionId) ||
    Boolean(activeWire);
  const relatedConnectionIds = new Set(
    connections
      .filter((connection) =>
        selectedComponentId
          ? isConnectionAttachedToComponent(connection, selectedComponentId)
          : selectedJunctionId
            ? isConnectionAttachedToJunction(connection, selectedJunctionId)
            : false,
      )
      .map((connection) => connection.id),
  );
  const { issues: readabilityIssues, issueLevelByComponent: readabilityIssueLevelByComponent } =
    computeLayoutHealth(components);
  const junctionPoints = (() => {
    const endpointCounts = new Map<string, number>();

    connections.forEach((connection) => {
      const bumpEndpoint = (endpoint: WireEndpoint) => {
        if (endpoint.kind !== "pin") {
          return;
        }

        const key = `${endpoint.componentId}:${endpoint.pinId}`;
        endpointCounts.set(key, (endpointCounts.get(key) ?? 0) + 1);
      };

      bumpEndpoint(connection.from);
      bumpEndpoint(connection.to);
    });

    return components.flatMap((component) => {
      const packageDef = resolvePackageByItemId(component.libraryItemId, component.packageState);

      return packageDef.pins.flatMap((pin) => {
        const endpointKey = `${component.id}:${pin.id}`;
        if ((endpointCounts.get(endpointKey) ?? 0) < 2) {
          return [];
        }

        const point = getPinPoint(component, packageDef, pin.id);
        return [point];
      });
    });
  })();

  const pendingDraft = pendingDraftId
    ? componentDrafts.find((draft) => draft.id === pendingDraftId) ?? null
    : null;
  const pendingPlacementBaseComponent = pendingDraft
    ? {
        id: "pending-placement-draft",
        libraryItemId: pendingDraft.libraryItemId,
        sourceDraftId: pendingDraft.id,
        reference: `${getLibraryItem(pendingDraft.libraryItemId).referencePrefix}?`,
        xUm: hoverPointer.xUm,
        yUm: hoverPointer.yUm,
        rotationDeg: pendingDraft.rotationDeg,
        packageState: pendingDraft.packageState,
      }
    : pendingLibraryItemId
      ? {
          id: "pending-placement",
          libraryItemId: pendingLibraryItemId,
          reference: `${getLibraryItem(pendingLibraryItemId).referencePrefix}?`,
          xUm: hoverPointer.xUm,
          yUm: hoverPointer.yUm,
          rotationDeg: 0,
          packageState: getDefaultPackageState(pendingLibraryItemId),
        }
      : null;
  const pendingPlacementAssist = pendingPlacementBaseComponent
    ? getPlacementAssist(
        pendingPlacementBaseComponent,
        components,
        junctions,
        viewport.zoom,
      )
    : null;
  const pendingPlacementComponent = pendingPlacementBaseComponent && pendingPlacementAssist
    ? {
        ...pendingPlacementBaseComponent,
        xUm: pendingPlacementAssist.xUm,
        yUm: pendingPlacementAssist.yUm,
      }
    : pendingPlacementBaseComponent;
  const pendingPlacementPackage = pendingPlacementComponent
    ? resolvePackageByItemId(
        pendingPlacementComponent.libraryItemId,
        pendingPlacementComponent.packageState,
      )
    : null;
  const pendingPlacementBounds = pendingPlacementComponent && pendingPlacementPackage
    ? getComponentBoundsPx(pendingPlacementComponent, pendingPlacementPackage)
    : null;
  const placementAlignmentGuides = dragPlacementGuides.x != null || dragPlacementGuides.y != null
    ? dragPlacementGuides
    : pendingPlacementAssist
      ? {
          x: pendingPlacementAssist.guideX,
          y: pendingPlacementAssist.guideY,
        }
      : { x: null, y: null };

  const resetFrame = () => {
    if (!containerRef.current) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }

    setViewport({ x: 0, y: containerRef.current.clientHeight, zoom: 1 });
  };
  const screenGridStep = GRID_PX * viewport.zoom;
  const showFineGrid = screenGridStep > 5;
  const pointerLabel = formatUmPair(hoverPointer.xUm, hoverPointer.yUm, displayUnit);
  const liveMode = pendingDraft
    ? {
        label: "Place Draft",
        detail: pendingDraft.title,
        toneClass: "canvas-mode-banner-active",
      }
    : pendingLibraryItemId
      ? {
          label: "Place Part",
          detail: getLibraryItem(pendingLibraryItemId).title,
          toneClass: "canvas-mode-banner-active",
        }
        : activeWire
        ? {
            label: "Wire",
            detail: "Choose destination endpoint",
            toneClass: "canvas-mode-banner-active",
          }
        : junctionEditMode
          ? {
              label: "Junction Mode",
              detail: "Click stage to add a junction",
              toneClass: "canvas-mode-banner-active",
            }
          : textureEditMode
            ? {
                label: "Align Texture",
                detail: "Drag and zoom background",
                toneClass: "canvas-mode-banner-neutral",
              }
            : selectedConnection
                ? {
                    label: "Edit Wire",
                    detail: selectedConnection.id.toUpperCase(),
                    toneClass: "canvas-mode-banner-neutral",
                  }
              : selectedJunction
                ? {
                    label: "Edit Junction",
                    detail: selectedJunction.id,
                    toneClass: "canvas-mode-banner-neutral",
                  }
                : selectedComponent
                  ? {
                      label: "Edit Part",
                      detail: selectedComponent.reference,
                      toneClass: "canvas-mode-banner-neutral",
                    }
                  : components.length === 0
                    ? {
                        label: "Start Layout",
                        detail: "Pick the first part",
                        toneClass: "canvas-mode-banner-neutral",
                      }
                    : {
                        label: "Stage Ready",
                        detail: "Select, place, or wire",
                        toneClass: "canvas-mode-banner-neutral",
                      };
  const stageHintText = pendingDraftId
    ? "Click to place the draft on the stage."
    : pendingLibraryItemId
      ? "Click to place the selected part."
      : activeWire
        ? "Finish the wire on a pin or junction."
        : junctionEditMode
          ? "Click empty stage to place a junction."
          : textureEditMode
            ? "Drag and zoom to align the texture."
            : null;
  const firstPlacementTitle = pendingDraft
    ? pendingDraft.title
    : pendingLibraryItemId
      ? getLibraryItem(pendingLibraryItemId).title
      : "Selected part";

  return (
    <main
      ref={containerRef}
      className="relative min-h-0 overflow-hidden rounded-[24px] border border-white bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#0a0a0a_100%)]"
      onMouseDown={handleBackgroundMouseDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="absolute inset-x-3 top-3 z-20 flex flex-wrap items-start justify-between gap-2"
        onMouseDown={stopCanvasGesturePropagation}
        onPointerDown={stopCanvasGesturePropagation}
        onWheel={stopCanvasGesturePropagation}
      >
        <div className="flex min-w-0 max-w-full flex-wrap items-start gap-2">
          <div className="canvas-toolgroup">
            <span className="canvas-toolgroup-label">View</span>
            <div className="px-2.5 flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(gridOpacity * 100)}
                onChange={(event) => setGridOpacity(Number(event.target.value) / 100)}
                className="canvas-slider"
                title="Grid opacity"
              />
            </div>
            <button
              type="button"
              onClick={() => setGridVisible((value) => !value)}
              className={`canvas-icon-button ${gridVisible ? "canvas-control-active" : ""}`}
              title="Toggle grid visibility"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <div className="canvas-sep" />
            <button
              type="button"
              onClick={resetFrame}
              className="canvas-icon-button"
              title="Snap to origin"
            >
              <LocateFixed className="h-4 w-4" />
            </button>
          </div>

          <div className="canvas-toolgroup">
            <span className="canvas-toolgroup-label">Edit</span>
            <button
              type="button"
              onClick={() => {
                if (selectedComponentId) {
                  rotateComponent(selectedComponentId, 90);
                }
              }}
              disabled={!selectedComponentId}
              className={`canvas-icon-button ${selectedComponentId ? "" : "opacity-40"}`}
              title="Rotate selected component 90 degrees"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setJunctionEditMode((value) => !value)}
              className={`canvas-text-button ${junctionEditMode ? "canvas-control-active" : ""}`}
              title="Place and move junctions"
            >
              Junction
            </button>
            <button
              type="button"
              onClick={() => setClarityMode((value) => !value)}
              className={`canvas-text-button ${clarityMode ? "canvas-control-active" : ""}`}
              title="Show readability warnings for dense layouts"
            >
              Clarity
            </button>
          </div>

          <div className="canvas-toolgroup">
            <span className="canvas-toolgroup-label">Background</span>
            <button
              type="button"
              onClick={() => setTextureEditMode((value) => !value)}
              className={`canvas-text-button ${textureEditMode ? "canvas-control-active" : ""}`}
              title="Align background"
            >
              Align
            </button>
            <button
              type="button"
              onClick={() => setTextureVisible((value) => !value)}
              className={`canvas-icon-button ${textureVisible ? "canvas-control-active" : ""}`}
              title="Toggle texture"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          </div>

          {textureVisible || textureEditMode ? (
            <div className="canvas-toolgroup">
              <span className="canvas-toolgroup-label">Texture</span>
              {TEXTURE_KEYS.map((key, index) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTextureVisible(true);
                    setTextureKey(key);
                  }}
                  className={`canvas-text-button ${textureKey === key ? "canvas-control-active" : ""}`}
                  title={`Use texture ${index + 1}`}
                >
                  T{index + 1}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          <div className={`canvas-mode-banner ${liveMode.toneClass}`}>
            <span className="canvas-mode-banner-label">{liveMode.label}</span>
            <span className="canvas-mode-banner-detail">{liveMode.detail}</span>
          </div>

          <div className="canvas-toolgroup">
            <span className="canvas-toolgroup-label">Stage</span>
            <div className="canvas-text-chip">
              <span className="text-aura-muted">Parts</span>
              <span>{components.length}</span>
            </div>
            <div className="canvas-text-chip">
              <span className="text-aura-muted">Wires</span>
              <span>{connections.length}</span>
            </div>
            <div className="canvas-text-chip">
              <span className="text-aura-muted">Pointer</span>
              <span>{pointerLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {stageHintText ? (
        <div className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-md">
          <div className="canvas-chip text-aura-muted">{stageHintText}</div>
        </div>
      ) : null}

      {components.length === 0 && !pendingLibraryItemId && !pendingDraftId ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="max-w-[30rem] rounded-2xl border border-white bg-black px-8 py-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-sm">
            <p className="editor-eyebrow">Empty Stage</p>
            <h3 className="mt-2 font-mono text-xl text-white">
              Start with one part
            </h3>
            <p className="mt-3 text-sm leading-6 text-aura-muted">
              Choose one part from the left library, place it on the stage, then connect from its pins.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-left">
              <div className="canvas-empty-step">
                <div className="canvas-empty-step-label">1. Choose</div>
                <div className="canvas-empty-step-detail">
                  Use Quick Access for a fast start, or open a family and choose one part.
                </div>
              </div>
              <div className="canvas-empty-step">
                <div className="canvas-empty-step-label">2. Place</div>
                <div className="canvas-empty-step-detail">
                  That click readies placement. Then click the stage to drop the first part with guides.
                </div>
              </div>
              <div className="canvas-empty-step">
                <div className="canvas-empty-step-label">3. Connect</div>
                <div className="canvas-empty-step-detail">
                  After the part is down, start the first wire by clicking one pin and then another.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {components.length === 0 && (pendingLibraryItemId || pendingDraftId) ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="max-w-[28rem] rounded-2xl border border-white bg-black px-7 py-7 text-center shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-sm">
            <p className="editor-eyebrow">Placement Ready</p>
            <h3 className="mt-2 font-mono text-xl text-white">{firstPlacementTitle}</h3>
            <p className="mt-3 text-sm leading-6 text-aura-muted">
              The part is ready. The next click on the stage places it, then you can adjust it or start the first wire.
            </p>
            <div className="mt-5 grid gap-3 text-left">
              <div className="canvas-empty-step">
                <div className="canvas-empty-step-label">1. Move onto the stage</div>
                <div className="canvas-empty-step-detail">
                  The preview follows the pointer so you can judge the first position before drop.
                </div>
              </div>
              <div className="canvas-empty-step">
                <div className="canvas-empty-step-label">2. Click to place</div>
                <div className="canvas-empty-step-detail">
                  Alignment guides appear near edges, centers, and pins to help the first drop land cleanly.
                </div>
              </div>
              <div className="canvas-empty-step">
                <div className="canvas-empty-step-label">3. Continue with wiring</div>
                <div className="canvas-empty-step-detail">
                  After placement, inspect the part or start the first wire directly from its pins.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {textureVisible ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(/textures/${textureKey}.jpg)`,
              backgroundPosition: "top left",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              opacity: 0.28,
              transform: `translate(${textureViewport.x}px, ${textureViewport.y}px) scale(${textureViewport.zoom})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      ) : null}

      <svg width="100%" height="100%" className="absolute inset-0" style={{ cursor }}>
        <defs>
          <pattern
            id="aura-stage-grid-fine"
            x="0"
            y="0"
            width={GRID_PX}
            height={GRID_PX}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_PX} 0 L 0 0 0 ${GRID_PX}`}
              fill="none"
              stroke={STAGE_GRID_COLOR}
              strokeWidth="0.8"
            />
          </pattern>
          <pattern
            id="aura-stage-grid-major"
            x="0"
            y="0"
            width={GRID_PX * 8}
            height={GRID_PX * 8}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_PX * 8} 0 L 0 0 0 ${GRID_PX * 8}`}
              fill="none"
              stroke={STAGE_GRID_COLOR}
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
          {gridVisible ? (
            <>
              {showFineGrid ? (
                <rect
                  x={-STAGE_HALF_EXTENT_PX}
                  y={-STAGE_HALF_EXTENT_PX}
                  width={STAGE_HALF_EXTENT_PX * 2}
                  height={STAGE_HALF_EXTENT_PX * 2}
                  fill="url(#aura-stage-grid-fine)"
                  opacity={gridOpacity * 0.15}
                />
              ) : null}
              <rect
                x={-STAGE_HALF_EXTENT_PX}
                y={-STAGE_HALF_EXTENT_PX}
                width={STAGE_HALF_EXTENT_PX * 2}
                height={STAGE_HALF_EXTENT_PX * 2}
                fill="url(#aura-stage-grid-major)"
                opacity={Math.min(1, gridOpacity * 0.4)}
              />
              <line
                x1={0}
                y1={-STAGE_HALF_EXTENT_PX}
                x2={0}
                y2={STAGE_HALF_EXTENT_PX}
                stroke={STAGE_AXIS_COLOR}
                strokeWidth={1.1}
                opacity={gridOpacity}
              />
              <line
                x1={-STAGE_HALF_EXTENT_PX}
                y1={0}
                x2={STAGE_HALF_EXTENT_PX}
                y2={0}
                stroke={STAGE_AXIS_COLOR}
                strokeWidth={1.1}
                opacity={gridOpacity}
              />
            </>
          ) : null}

          {connections.map((connection) => {
            const start = getEndpointPoint(connection.from, components, junctions);
            const end = getEndpointPoint(connection.to, components, junctions);
            if (!start || !end) {
              return null;
            }

            const startDirection = getEndpointDirection(connection.from, components);
            const endDirection = getEndpointDirection(connection.to, components);
            const routeObstacles = getRoutingObstacles(
              components,
              getConnectionExcludedComponentIds(connection),
            );
            const selected = connection.id === selectedConnectionId;
            const related = relatedConnectionIds.has(connection.id);
            const routeState = selected ? "selected" : related ? "related" : "idle";
            const routeStroke =
              routeState === "selected"
                ? STAGE_WIRE_SELECTED
                : routeState === "related"
                  ? STAGE_WIRE_RELATED
                  : STAGE_WIRE_COLOR;
            const routeStrokeWidth =
              routeState === "selected" ? 3.1 : routeState === "related" ? 2.55 : 1.7;
            const routeOpacity =
              routeState === "selected"
                ? 1
                : routeState === "related"
                  ? 0.95
                  : hasFocusedSelection
                    ? 0.34
                    : 0.78;
            const routePoints = getOrthogonalRoutePoints(
              start.xPx,
              start.yPx,
              end.xPx,
              end.yPx,
              startDirection,
              endDirection,
              routeObstacles,
              routePointsUmToPx(connection.routePointsUm),
            );
            const bendPoints = selected ? getEditableBendPoints(routePoints) : [];
            const routeMidpoint = getRouteMidpoint(routePoints);
            const routeLabel = connection.id.toUpperCase();
            const routeLabelWidth = estimateStageLabelWidth(routeLabel);

            return (
              <g key={connection.id}>
                <path
                  d={getOrthogonalPath(
                    start.xPx,
                    start.yPx,
                    end.xPx,
                    end.yPx,
                    startDirection,
                    endDirection,
                    routeObstacles,
                    routePointsUmToPx(connection.routePointsUm),
                  )}
                  fill="none"
                  stroke={routeStroke}
                  strokeWidth={routeStrokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={routeOpacity}
                  className={`cursor-pointer transition ${selected ? "opacity-100" : "hover:opacity-100"}`}
                  onMouseDown={(event) => handleConnectionMouseDown(event, connection.id)}
                  onDoubleClick={(event) =>
                    handleConnectionPathDoubleClick(event, connection.id, routePoints)
                  }
                />
                {selected || related ? (
                  <path
                    d={getOrthogonalPath(
                      start.xPx,
                      start.yPx,
                      end.xPx,
                      end.yPx,
                      startDirection,
                      endDirection,
                      routeObstacles,
                      routePointsUmToPx(connection.routePointsUm),
                    )}
                    fill="none"
                    stroke={selected ? STAGE_WIRE_GLOW : STAGE_WIRE_RELATED}
                    strokeWidth={selected ? 9 : 6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={selected ? 0.18 : 0.08}
                    pointerEvents="none"
                  />
                ) : null}
                {selected ? (
                  <g pointerEvents="none">
                    <rect
                      x={routeMidpoint.x - routeLabelWidth / 2}
                      y={routeMidpoint.y - 18}
                      width={routeLabelWidth}
                      height={14}
                      rx={7}
                      fill="#ffffff"
                    />
                    <text
                      x={routeMidpoint.x}
                      y={routeMidpoint.y - 8}
                      textAnchor="middle"
                      className="font-mono text-[10px]"
                      fill="#000000"
                    >
                      {routeLabel}
                    </text>
                  </g>
                ) : null}
                {bendPoints.map((bendPoint) => (
                  <circle
                    key={`${connection.id}_bend_${bendPoint.index}`}
                    cx={bendPoint.point.x}
                    cy={bendPoint.point.y}
                    r={4.8}
                    fill={STAGE_HANDLE_FILL}
                    stroke={STAGE_HANDLE_STROKE}
                    strokeWidth={1.2}
                    className="cursor-move"
                    onMouseDown={(event) =>
                      handleConnectionBendMouseDown(
                        event,
                        connection.id,
                        bendPoint.index - 1,
                        routePoints,
                      )
                    }
                    onDoubleClick={(event) =>
                      handleConnectionBendDoubleClick(
                        event,
                        connection.id,
                        bendPoint.index,
                        routePoints,
                      )
                    }
                  />
                ))}
              </g>
            );
          })}

          {junctionPoints.map((point, index) => (
            <circle
              key={`junction_${index}`}
              cx={point.xPx}
              cy={point.yPx}
              r={2.4}
              fill={STAGE_HANDLE_FILL}
              stroke={STAGE_HANDLE_STROKE}
              strokeWidth={0.9}
              pointerEvents="none"
            />
          ))}

          {junctions.map((junction) => {
            const point = getJunctionPoint(junction);
            const selected = junction.id === selectedJunctionId;

            return (
              <g key={junction.id}>
                {selected ? (
                  <circle
                    cx={point.xPx}
                    cy={point.yPx}
                    r={10}
                    fill={STAGE_SELECTION_FILL}
                    opacity={0.12}
                    pointerEvents="none"
                  />
                ) : null}
                <circle
                  cx={point.xPx}
                  cy={point.yPx}
                  r={selected ? 5.8 : 4.8}
                  fill={selected ? STAGE_SELECTION_COLOR : STAGE_HANDLE_FILL}
                  stroke={selected ? STAGE_SELECTION_SOFT : STAGE_HANDLE_STROKE}
                  strokeWidth={selected ? 1.6 : 1.1}
                  className={junctionEditMode || activeWire ? "cursor-crosshair" : "cursor-pointer"}
                  onMouseDown={(event) => handleJunctionMouseDown(event, junction.id)}
                />
              </g>
            );
          })}

          {activeWire && activeWireStart ? (
            <>
              {activeWireAlignmentGuides.x != null ? (
                <line
                  x1={activeWireAlignmentGuides.x}
                  y1={-STAGE_HALF_EXTENT_PX}
                  x2={activeWireAlignmentGuides.x}
                  y2={STAGE_HALF_EXTENT_PX}
                  stroke={STAGE_GUIDE_COLOR}
                  strokeWidth={0.9}
                  strokeDasharray="8 6"
                  opacity={0.4}
                  pointerEvents="none"
                />
              ) : null}
              {activeWireAlignmentGuides.y != null ? (
                <line
                  x1={-STAGE_HALF_EXTENT_PX}
                  y1={activeWireAlignmentGuides.y}
                  x2={STAGE_HALF_EXTENT_PX}
                  y2={activeWireAlignmentGuides.y}
                  stroke={STAGE_GUIDE_COLOR}
                  strokeWidth={0.9}
                  strokeDasharray="8 6"
                  opacity={0.4}
                  pointerEvents="none"
                />
              ) : null}
              <path
                d={getPolylinePath([
                  { x: activeWireStart.xPx, y: activeWireStart.yPx },
                  ...activeWireRoutePointsPx,
                  {
                    x: activeWireSnapPoint?.x ?? wirePointer.xPx,
                    y: activeWireSnapPoint?.y ?? wirePointer.yPx,
                  },
                ])}
                fill="none"
                stroke={STAGE_WIRE_SELECTED}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                opacity={0.86}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {activeWireRoutePointsPx.map((point, index) => (
                <circle
                  key={`draft_route_${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill={STAGE_HANDLE_FILL}
                  stroke={STAGE_HANDLE_STROKE}
                  strokeWidth={1}
                  pointerEvents="none"
                />
              ))}
              <g pointerEvents="none">
                {activeWireSnapPoint?.kind === "pin" || activeWireSnapPoint?.kind === "junction" ? (
                  <>
                    <circle
                      cx={activeWireSnapPoint.x}
                      cy={activeWireSnapPoint.y}
                      r={10.5}
                      fill={STAGE_WIRE_GLOW}
                      opacity={0.12}
                    />
                    <circle
                      cx={activeWireSnapPoint.x}
                      cy={activeWireSnapPoint.y}
                      r={8.4}
                      fill="none"
                      stroke={STAGE_GUIDE_COLOR}
                      strokeWidth={1}
                      opacity={0.4}
                    />
                  </>
                ) : null}
                <circle
                  cx={activeWireSnapPoint?.x ?? wirePointer.xPx}
                  cy={activeWireSnapPoint?.y ?? wirePointer.yPx}
                  r={activeWireSnapPoint?.kind === "grid" ? 5.2 : 7}
                  fill="none"
                  stroke={STAGE_WIRE_SELECTED}
                  strokeWidth={1.2}
                  opacity={0.92}
                />
                <circle
                  cx={activeWireSnapPoint?.x ?? wirePointer.xPx}
                  cy={activeWireSnapPoint?.y ?? wirePointer.yPx}
                  r={2.2}
                  fill={STAGE_SELECTION_COLOR}
                  opacity={0.96}
                />
                <line
                  x1={(activeWireSnapPoint?.x ?? wirePointer.xPx) - 8}
                  y1={activeWireSnapPoint?.y ?? wirePointer.yPx}
                  x2={(activeWireSnapPoint?.x ?? wirePointer.xPx) + 8}
                  y2={activeWireSnapPoint?.y ?? wirePointer.yPx}
                  stroke={STAGE_GUIDE_COLOR}
                  strokeWidth={0.85}
                  opacity={0.55}
                />
                <line
                  x1={activeWireSnapPoint?.x ?? wirePointer.xPx}
                  y1={(activeWireSnapPoint?.y ?? wirePointer.yPx) - 8}
                  x2={activeWireSnapPoint?.x ?? wirePointer.xPx}
                  y2={(activeWireSnapPoint?.y ?? wirePointer.yPx) + 8}
                  stroke={STAGE_GUIDE_COLOR}
                  strokeWidth={0.85}
                  opacity={0.55}
                />
              </g>
            </>
          ) : null}

          {!activeWire && (placementAlignmentGuides.x != null || placementAlignmentGuides.y != null) ? (
            <>
              {placementAlignmentGuides.x != null ? (
                <line
                  x1={placementAlignmentGuides.x}
                  y1={-STAGE_HALF_EXTENT_PX}
                  x2={placementAlignmentGuides.x}
                  y2={STAGE_HALF_EXTENT_PX}
                  stroke={STAGE_GUIDE_COLOR}
                  strokeWidth={0.9}
                  strokeDasharray="8 6"
                  opacity={0.32}
                  pointerEvents="none"
                />
              ) : null}
              {placementAlignmentGuides.y != null ? (
                <line
                  x1={-STAGE_HALF_EXTENT_PX}
                  y1={placementAlignmentGuides.y}
                  x2={STAGE_HALF_EXTENT_PX}
                  y2={placementAlignmentGuides.y}
                  stroke={STAGE_GUIDE_COLOR}
                  strokeWidth={0.9}
                  strokeDasharray="8 6"
                  opacity={0.32}
                  pointerEvents="none"
                />
              ) : null}
            </>
          ) : null}

          {!activeWire && (routeDragGuides.x != null || routeDragGuides.y != null) ? (
            <>
              {routeDragGuides.x != null ? (
                <line
                  x1={routeDragGuides.x}
                  y1={-STAGE_HALF_EXTENT_PX}
                  x2={routeDragGuides.x}
                  y2={STAGE_HALF_EXTENT_PX}
                  stroke={STAGE_GUIDE_COLOR}
                  strokeWidth={0.9}
                  strokeDasharray="8 6"
                  opacity={0.38}
                  pointerEvents="none"
                />
              ) : null}
              {routeDragGuides.y != null ? (
                <line
                  x1={-STAGE_HALF_EXTENT_PX}
                  y1={routeDragGuides.y}
                  x2={STAGE_HALF_EXTENT_PX}
                  y2={routeDragGuides.y}
                  stroke={STAGE_GUIDE_COLOR}
                  strokeWidth={0.9}
                  strokeDasharray="8 6"
                  opacity={0.38}
                  pointerEvents="none"
                />
              ) : null}
            </>
          ) : null}

          {clarityMode ? (
            <g pointerEvents="none">
              {readabilityIssues.map((issue, index) => {
                const stroke = issue.kind === "overlap" ? STAGE_WARNING_OVERLAP : STAGE_WARNING_CROWDED;
                const label = issue.kind === "overlap" ? "Overlap" : "Crowded";
                const labelWidth = estimateStageLabelWidth(label);

                return (
                  <g key={`${issue.kind}_${issue.componentIds.join("_")}_${index}`}>
                    <rect
                      x={issue.box.left - 6}
                      y={issue.box.top - 6}
                      width={Math.max(12, issue.box.width + 12)}
                      height={Math.max(12, issue.box.height + 12)}
                      rx={10}
                      fill={stroke}
                      opacity={issue.kind === "overlap" ? 0.08 : 0.04}
                      stroke={stroke}
                      strokeWidth={1}
                      strokeDasharray={issue.kind === "overlap" ? "none" : "8 6"}
                    />
                    <rect
                      x={issue.box.centerX - labelWidth / 2}
                      y={issue.box.top - 18}
                      width={labelWidth}
                      height={14}
                      rx={7}
                      fill={stroke}
                      opacity={0.92}
                    />
                    <text
                      x={issue.box.centerX}
                      y={issue.box.top - 8}
                      textAnchor="middle"
                      className="font-mono text-[10px]"
                      fill="#000000"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </g>
          ) : null}

          {pendingPlacementComponent && pendingPlacementPackage && pendingPlacementBounds ? (
            <g opacity={0.62}>
              {renderComponentShape(
                pendingPlacementComponent,
                pendingPlacementPackage,
                false,
              )}
              <text
                x={pendingPlacementBounds.centerX}
                y={pendingPlacementBounds.top - 14}
                textAnchor="middle"
                className="pointer-events-none font-mono text-[11px] fill-[#f1f4f8]"
              >
                {pendingPlacementComponent.reference}
              </text>
            </g>
          ) : null}

          {components.map((component) => (
            <RenderComponent
              key={component.id}
              component={component}
              selected={component.id === selectedComponentId}
              emphasizedPins={component.id === selectedComponentId || activeWire != null}
              readabilityIssue={clarityMode ? readabilityIssueLevelByComponent.get(component.id) ?? null : null}
              onComponentMouseDown={handleComponentMouseDown}
              onPinMouseDown={handlePinMouseDown}
            />
          ))}
        </g>
      </svg>
    </main>
  );
}
