import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
  BEHAVIOR_PRESETS,
  createDefaultBehaviorDraftState,
  getBehaviorPreset,
  getCompatibleBehaviorTargets,
  type BehaviorDraftState,
} from "../data/behaviorLibrary";
import {
  getDefaultPackageState,
  getLibraryItem,
  isResizableLibraryItem,
  LIBRARY_ITEMS,
  resizePackageStateForHandle,
  resolvePackageByItemId,
  type ComponentPackageState,
  type PackageDefinition,
} from "../data/componentCatalog";

const STAGE_WIDTH = 700;
const STAGE_HEIGHT = 460;
const NO_BASE_ID = "__no_base__";
const BLANK_BOARD_ID = "__blank_board__";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };
type Viewport = { x: number; y: number; zoom: number };
type ShapeTool = "select" | "rect" | "ellipse" | "line" | "arc" | "text" | "hole" | "trim" | "split" | "measure";
type BuiltInLayerId = "body_primary" | "pins_primary" | "label_primary";
type LayerSelection = { kind: "base"; id: BuiltInLayerId } | { kind: "shape"; id: string } | { kind: "child"; id: string } | null;
type PreviewPin = { id: string; label: string; x: number; y: number };
type BlankBoardState = { widthUm: number; heightUm: number; cornerUm: number };
type MeasureAxis = "free" | "horizontal" | "vertical";
type BaseBodyForm = "package" | "rect" | "capsule" | "circle";
type LineConstraintMode = "free" | "horizontal" | "vertical";
type AspectConstraintMode = "free" | "equal";
type LineRelationMode = "free" | "parallel" | "perpendicular";
type ShapeRelationMode = "free" | "same_x" | "same_y" | "same_center";
type DimensionKind = "width" | "height" | "length" | "dx" | "dy";
type SketchConstraintState = {
  locked?: boolean;
  axis?: LineConstraintMode;
  aspect?: AspectConstraintMode;
  lineRelation?: { mode: LineRelationMode; targetId?: string };
  shapeRelation?: { mode: ShapeRelationMode; targetId?: string };
};
type BaseOverride = { widthUm?: number; heightUm?: number; cornerUm?: number; form?: BaseBodyForm; fill?: string; stroke?: string };
type PinOverride = { label?: string; dxUm?: number; dyUm?: number };
type ChildInstance = {
  id: string;
  itemId: string;
  title: string;
  anchor: Point;
  packageState: ComponentPackageState;
  override?: BaseOverride;
  pinOverrides?: Record<string, PinOverride>;
  customLayers?: ShapeLayer[];
};

type ChildEditSession = {
  childId: string;
  snapshot: ChildInstance;
  layerIds: string[];
  anchor: Point;
};

type PersistentDimension = {
  id: string;
  shapeId: string;
  kind: DimensionKind;
};

type ShapeLayer =
  | {
      id: string;
      name: string;
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
      fill: string;
      stroke: string;
      strokeWidth: number;
      construction?: boolean;
      constraints?: SketchConstraintState;
    }
  | {
      id: string;
      name: string;
      kind: "ellipse";
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
      stroke: string;
      strokeWidth: number;
      construction?: boolean;
      constraints?: SketchConstraintState;
    }
  | {
      id: string;
      name: string;
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      strokeWidth: number;
      construction?: boolean;
      constraints?: SketchConstraintState;
    }
  | {
      id: string;
      name: string;
      kind: "arc";
      x: number;
      y: number;
      width: number;
      height: number;
      startAngle: number;
      endAngle: number;
      stroke: string;
      strokeWidth: number;
      construction?: boolean;
      constraints?: SketchConstraintState;
    }
  | {
      id: string;
      name: string;
      kind: "text";
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
      fill: string;
      fontSize: number;
      construction?: boolean;
      constraints?: SketchConstraintState;
    }
  | {
      id: string;
      name: string;
      kind: "hole";
      x: number;
      y: number;
      width: number;
      height: number;
      stroke: string;
      strokeWidth: number;
      construction?: boolean;
      constraints?: SketchConstraintState;
    };

type PointerState =
  | null
  | { mode: "draw"; tool: Exclude<ShapeTool, "select">; origin: Point; current: Point }
  | { mode: "move-shape"; shapeId: string; origin: Point; initialShape: ShapeLayer }
  | { mode: "move-base"; origin: Point; initialOffset: Point }
  | { mode: "move-child"; childId: string; origin: Point; initialAnchor: Point }
  | { mode: "pan-viewport"; origin: Point; initialViewport: Viewport }
  | { mode: "resize-shape"; shapeId: string; handle: string; initialShape: ShapeLayer }
  | { mode: "move-pin"; owner: "base" | "child"; childId?: string; pinId: string; origin: Point; initialOverride: PinOverride }
  | {
      mode: "resize-base";
      handle: "east" | "south" | "corner";
      initialRect: Rect;
      initialBlankBoard: BlankBoardState;
      initialPackageState: ComponentPackageState;
    };

type BaseLayout = {
  bodyRect: Rect;
  bodyWidthUm: number;
  bodyHeightUm: number;
  cornerRadius: number;
  previewPins: PreviewPin[];
  umPerUnit: number;
};

type PreviewShape =
  | { kind: "rect"; x: number; y: number; width: number; height: number; rx: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "pinGroup"; pins: PreviewPin[]; r: number };

const TOOL_OPTIONS: { id: ShapeTool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "rect", label: "Rect" },
  { id: "ellipse", label: "Ellipse" },
  { id: "line", label: "Line" },
  { id: "arc", label: "Arc" },
  { id: "text", label: "Text" },
  { id: "hole", label: "Hole" },
  { id: "trim", label: "Trim" },
  { id: "split", label: "Split" },
  { id: "measure", label: "Measure" },
];

const TOOL_GROUPS: { title: string; tools: ShapeTool[] }[] = [
  { title: "Inspect", tools: ["select", "measure"] },
  { title: "Create", tools: ["rect", "ellipse", "line", "arc", "text", "hole"] },
  { title: "Modify", tools: ["trim", "split"] },
];

function CreatorSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: string | number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="studio-section-card space-y-0">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <p className="editor-eyebrow">{title}</p>
          {count != null ? <span className="studio-pill">{count}</span> : null}
        </div>
        <span className="studio-panel-toggle">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>
      {open ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function formatMm(valueUm: number) {
  return `${(valueUm / 1000).toFixed(2)} mm`;
}

function constrainMeasurePoint(start: Point, point: Point, axis: MeasureAxis): Point {
  if (axis === "horizontal") {
    return { x: point.x, y: start.y };
  }
  if (axis === "vertical") {
    return { x: start.x, y: point.y };
  }
  return point;
}

function getMeasureSummary(start: Point, end: Point, umPerUnit: number) {
  const dxUm = (end.x - start.x) * umPerUnit;
  const dyUm = (end.y - start.y) * umPerUnit;
  const distanceUm = distance(start, end) * umPerUnit;
  return {
    dxUm,
    dyUm,
    distanceUm,
  };
}

function distance(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.max(1, Math.abs(b.x - a.x)),
    height: Math.max(1, Math.abs(b.y - a.y)),
  };
}

function nextShapeId(shapeLayers: ShapeLayer[], kind: string) {
  return `${kind}_${shapeLayers.filter((shape) => shape.kind === kind).length + 1}`;
}

function getSvgViewPoint(event: ReactPointerEvent<SVGSVGElement> | ReactWheelEvent<SVGSVGElement>, svg: SVGSVGElement | null): Point {
  if (!svg) {
    return { x: 0, y: 0 };
  }

  const bounds = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * STAGE_WIDTH,
    y: ((event.clientY - bounds.top) / bounds.height) * STAGE_HEIGHT,
  };
}

function getStagePoint(
  event: ReactPointerEvent<SVGSVGElement> | ReactWheelEvent<SVGSVGElement>,
  svg: SVGSVGElement | null,
  viewport: Viewport,
): Point {
  const point = getSvgViewPoint(event, svg);
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
}

function reorderById<T extends { id: string }>(items: T[], id: string, action: "front" | "back" | "forward" | "backward") {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) {
    return items;
  }

  const next = [...items];
  const [target] = next.splice(index, 1);
  if (!target) {
    return items;
  }

  if (action === "front") {
    next.push(target);
    return next;
  }
  if (action === "back") {
    next.unshift(target);
    return next;
  }
  if (action === "forward") {
    next.splice(Math.min(next.length, index + 1), 0, target);
    return next;
  }

  next.splice(Math.max(0, index - 1), 0, target);
  return next;
}

function getShapeBounds(shape: ShapeLayer): Rect {
  if (shape.kind === "line") {
    return {
      x: Math.min(shape.x1, shape.x2),
      y: Math.min(shape.y1, shape.y2),
      width: Math.max(1, Math.abs(shape.x2 - shape.x1)),
      height: Math.max(1, Math.abs(shape.y2 - shape.y1)),
    };
  }

  return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
}

function getShapeCenter(shape: ShapeLayer): Point {
  const bounds = getShapeBounds(shape);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

function getRectSnapPoints(rect: Rect): Point[] {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: cx, y: rect.y },
    { x: cx, y: rect.y + rect.height },
    { x: rect.x, y: cy },
    { x: rect.x + rect.width, y: cy },
    { x: cx, y: cy },
  ];
}

function distancePointToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return distance(point, a);
  }
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1);
  const projected = { x: a.x + t * dx, y: a.y + t * dy };
  return distance(point, projected);
}

function projectPointToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return a;
  }
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1);
  return { x: a.x + t * dx, y: a.y + t * dy };
}

function tryTrimShape(shape: ShapeLayer, point: Point): ShapeLayer | null {
  if (shape.kind === "line") {
    const projected = projectPointToSegment(point, { x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 });
    const toStart = distance(projected, { x: shape.x1, y: shape.y1 });
    const toEnd = distance(projected, { x: shape.x2, y: shape.y2 });
    if (toStart < 8 || toEnd < 8) {
      return null;
    }
    return toStart < toEnd ? { ...shape, x1: projected.x, y1: projected.y } : { ...shape, x2: projected.x, y2: projected.y };
  }

  if (shape.kind === "arc") {
    const rx = Math.max(1, shape.width / 2);
    const ry = Math.max(1, shape.height / 2);
    const cx = shape.x + rx;
    const cy = shape.y + ry;
    const angle = ((Math.atan2(point.y - cy, point.x - cx) * 180) / Math.PI + 360) % 360;
    const startGap = Math.abs(angle - shape.startAngle);
    const endGap = Math.abs(angle - shape.endAngle);
    return startGap < endGap ? { ...shape, startAngle: angle } : { ...shape, endAngle: angle };
  }

  return null;
}

function trySplitShape(shape: ShapeLayer, point: Point, nextId: string): ShapeLayer[] | null {
  if (shape.kind === "line") {
    const projected = projectPointToSegment(point, { x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 });
    if (distance(projected, { x: shape.x1, y: shape.y1 }) < 8 || distance(projected, { x: shape.x2, y: shape.y2 }) < 8) {
      return null;
    }
    return [
      { ...shape, x2: projected.x, y2: projected.y },
      { ...shape, id: nextId, name: `${shape.name} Part 2`, x1: projected.x, y1: projected.y },
    ];
  }

  if (shape.kind === "arc") {
    const rx = Math.max(1, shape.width / 2);
    const ry = Math.max(1, shape.height / 2);
    const cx = shape.x + rx;
    const cy = shape.y + ry;
    const angle = ((Math.atan2(point.y - cy, point.x - cx) * 180) / Math.PI + 360) % 360;
    return [
      { ...shape, endAngle: angle },
      { ...shape, id: nextId, name: `${shape.name} Part 2`, startAngle: angle },
    ];
  }

  return null;
}

function getShapeSnapPoints(shape: ShapeLayer): Point[] {
  if (shape.kind === "line") {
    return [
      { x: shape.x1, y: shape.y1 },
      { x: shape.x2, y: shape.y2 },
      { x: (shape.x1 + shape.x2) / 2, y: (shape.y1 + shape.y2) / 2 },
    ];
  }

  return getRectSnapPoints(getShapeBounds(shape));
}

function getSnappedPoint(point: Point, candidates: Point[], threshold = 10): Point {
  let best: Point | null = null;
  let bestDistance = threshold;

  for (const candidate of candidates) {
    const nextDistance = distance(point, candidate);
    if (nextDistance <= bestDistance) {
      bestDistance = nextDistance;
      best = candidate;
    }
  }

  return best ? { x: round(best.x), y: round(best.y) } : { x: round(point.x), y: round(point.y) };
}

function applyLineRelation(shape: Extract<ShapeLayer, { kind: "line" }>, allShapes: ShapeLayer[]) {
  const relation = shape.constraints?.lineRelation;
  if (!relation || relation.mode === "free" || !relation.targetId) {
    return shape;
  }
  const target = allShapes.find((candidate) => candidate.id === relation.targetId && candidate.kind === "line");
  if (!target || target.kind !== "line") {
    return shape;
  }

  const tx = target.x2 - target.x1;
  const ty = target.y2 - target.y1;
  const targetLength = Math.sqrt(tx * tx + ty * ty);
  if (targetLength < 0.001) {
    return shape;
  }

  const ux = tx / targetLength;
  const uy = ty / targetLength;
  const currentDx = shape.x2 - shape.x1;
  const currentDy = shape.y2 - shape.y1;
  const currentLength = Math.max(1, Math.sqrt(currentDx * currentDx + currentDy * currentDy));
  const candidates =
    relation.mode === "parallel"
      ? [
          { dx: ux * currentLength, dy: uy * currentLength },
          { dx: -ux * currentLength, dy: -uy * currentLength },
        ]
      : [
          { dx: -uy * currentLength, dy: ux * currentLength },
          { dx: uy * currentLength, dy: -ux * currentLength },
        ];

  const preferred =
    Math.abs(currentDx - candidates[0].dx) + Math.abs(currentDy - candidates[0].dy) <=
    Math.abs(currentDx - candidates[1].dx) + Math.abs(currentDy - candidates[1].dy)
      ? candidates[0]
      : candidates[1];

  return {
    ...shape,
    x2: shape.x1 + preferred.dx,
    y2: shape.y1 + preferred.dy,
  };
}

function applyShapeRelation(shape: Exclude<ShapeLayer, { kind: "line" }>, allShapes: ShapeLayer[]) {
  const relation = shape.constraints?.shapeRelation;
  if (!relation || relation.mode === "free" || !relation.targetId) {
    return shape;
  }
  const target = allShapes.find((candidate) => candidate.id === relation.targetId);
  if (!target) {
    return shape;
  }

  const targetCenter = getShapeCenter(target);
  const currentCenter = getShapeCenter(shape);
  const deltaX = targetCenter.x - currentCenter.x;
  const deltaY = targetCenter.y - currentCenter.y;

  if (relation.mode === "same_center") {
    return { ...shape, x: shape.x + deltaX, y: shape.y + deltaY };
  }
  if (relation.mode === "same_x") {
    return { ...shape, x: shape.x + deltaX };
  }
  if (relation.mode === "same_y") {
    return { ...shape, y: shape.y + deltaY };
  }

  return shape;
}

function createShapeFromTool(
  tool: Exclude<ShapeTool, "select">,
  origin: Point,
  current: Point,
  id: string,
): ShapeLayer | null {
  if (tool === "rect") {
    const rect = normalizeRect(origin, current);
    return { id, name: "Rect", kind: "rect", ...rect, radius: 0, fill: "#d0d0d0", stroke: "#ffffff", strokeWidth: 1.8, construction: false };
  }
  if (tool === "ellipse") {
    const rect = normalizeRect(origin, current);
    return { id, name: "Ellipse", kind: "ellipse", ...rect, fill: "#bcbcbc", stroke: "#ffffff", strokeWidth: 1.6, construction: false };
  }
  if (tool === "line") {
    return { id, name: "Line", kind: "line", x1: origin.x, y1: origin.y, x2: current.x, y2: current.y, stroke: "#ffffff", strokeWidth: 2, construction: false };
  }
  if (tool === "arc") {
    const rect = normalizeRect(origin, current);
    return { id, name: "Arc", kind: "arc", ...rect, startAngle: 210, endAngle: 330, stroke: "#ffffff", strokeWidth: 2, construction: false };
  }
  if (tool === "text") {
    const rect = normalizeRect(origin, current);
    return {
      id,
      name: "Text",
      kind: "text",
      x: rect.x,
      y: rect.y,
      width: Math.max(72, rect.width),
      height: Math.max(24, rect.height),
      text: "LABEL",
      fill: "#ffffff",
      fontSize: Math.max(12, Math.min(28, rect.height * 0.65)),
      construction: false,
    };
  }
  if (tool === "hole") {
    const rect = normalizeRect(origin, current);
    return {
      id,
      name: "Hole",
      kind: "hole",
      x: rect.x,
      y: rect.y,
      width: Math.max(16, rect.width),
      height: Math.max(16, rect.height),
      stroke: "#ffffff",
      strokeWidth: 1.8,
      construction: false,
    };
  }
  return null;
}

function hasMeaningfulDrawGesture(
  tool: Exclude<ShapeTool, "select">,
  origin: Point,
  current: Point,
) {
  const dx = Math.abs(current.x - origin.x);
  const dy = Math.abs(current.y - origin.y);
  if (tool === "line") {
    return distance(origin, current) >= 8;
  }
  return dx >= 8 || dy >= 8;
}

function applyShapeConstraints(shape: ShapeLayer, allShapes: ShapeLayer[] = []): ShapeLayer {
  if (shape.kind === "line") {
    const relatedShape = applyLineRelation(shape, allShapes);
    const axis = relatedShape.constraints?.axis ?? "free";
    if (axis === "horizontal") {
      return { ...relatedShape, y2: relatedShape.y1 };
    }
    if (axis === "vertical") {
      return { ...relatedShape, x2: relatedShape.x1 };
    }
    return relatedShape;
  }

  const relatedShape = applyShapeRelation(shape, allShapes);

  if (
    (relatedShape.kind === "rect" || relatedShape.kind === "ellipse" || relatedShape.kind === "hole") &&
    relatedShape.constraints?.aspect === "equal"
  ) {
    const size = Math.max(relatedShape.width, relatedShape.height);
    return { ...relatedShape, width: size, height: size };
  }

  return relatedShape;
}

function resolveShapeConstraints(shapes: ShapeLayer[]) {
  let next = [...shapes];
  for (let pass = 0; pass < 2; pass += 1) {
    next = next.map((shape) => applyShapeConstraints(shape, next));
  }
  return next;
}

function moveShape(shape: ShapeLayer, dx: number, dy: number, allShapes: ShapeLayer[] = []): ShapeLayer {
  if (shape.constraints?.locked) {
    return shape;
  }
  if (shape.kind === "line") {
    return applyShapeConstraints({ ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy }, allShapes);
  }
  return applyShapeConstraints({ ...shape, x: shape.x + dx, y: shape.y + dy }, allShapes);
}

function resizeShape(shape: ShapeLayer, handle: string, point: Point, allShapes: ShapeLayer[] = []): ShapeLayer {
  if (shape.constraints?.locked) {
    return shape;
  }
  if (shape.kind === "line") {
    const next = handle === "start" ? { ...shape, x1: point.x, y1: point.y } : { ...shape, x2: point.x, y2: point.y };
    return applyShapeConstraints(next, allShapes);
  }

  const left = handle.includes("w") ? point.x : shape.x;
  const right = handle.includes("e") ? point.x : shape.x + shape.width;
  const top = handle.includes("n") ? point.y : shape.y;
  const bottom = handle.includes("s") ? point.y : shape.y + shape.height;
  const rect = normalizeRect({ x: left, y: top }, { x: right, y: bottom });

  if ((shape.kind === "rect" || shape.kind === "ellipse" || shape.kind === "hole") && shape.constraints?.aspect === "equal") {
    const size = Math.max(rect.width, rect.height);
    const x = handle.includes("w") ? right - size : left;
    const y = handle.includes("n") ? bottom - size : top;
    return applyShapeConstraints({ ...shape, x: Math.min(x, right), y: Math.min(y, bottom), width: size, height: size }, allShapes);
  }

  return applyShapeConstraints({ ...shape, ...rect }, allShapes);
}

function createOffsetShape(shape: ShapeLayer, offset: number, nextId: string): ShapeLayer | null {
  if (shape.kind === "line") {
    const dx = shape.x2 - shape.x1;
    const dy = shape.y2 - shape.y1;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    return {
      ...shape,
      id: nextId,
      name: `${shape.name} Offset`,
      x1: shape.x1 + nx * offset,
      y1: shape.y1 + ny * offset,
      x2: shape.x2 + nx * offset,
      y2: shape.y2 + ny * offset,
    };
  }

  if (shape.kind === "text") {
    return {
      ...shape,
      id: nextId,
      name: `${shape.name} Offset`,
      x: shape.x + offset,
      y: shape.y + offset,
    };
  }

  return {
    ...shape,
    id: nextId,
    name: `${shape.name} Offset`,
    x: shape.x - offset,
    y: shape.y - offset,
    width: Math.max(8, shape.width + offset * 2),
    height: Math.max(8, shape.height + offset * 2),
  };
}

function createGeneratedComponentDetails(packageDef: PackageDefinition | null, baseLayout: BaseLayout): ShapeLayer[] {
  if (!packageDef || baseLayout.bodyRect.width <= 0 || baseLayout.bodyRect.height <= 0) {
    return [];
  }

  const rect = baseLayout.bodyRect;
  const layers: ShapeLayer[] = [];
  let nextId = 1;
  const id = (kind: ShapeLayer["kind"]) => `generated_${packageDef.packageKey.toLowerCase()}_${kind}_${nextId++}`;

  const addRect = (name: string, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke: string, strokeWidth = 1.4) => {
    layers.push({ id: id("rect"), name, kind: "rect", x, y, width, height, radius, fill, stroke, strokeWidth, construction: false });
  };
  const addEllipse = (name: string, x: number, y: number, width: number, height: number, fill: string, stroke: string, strokeWidth = 1.2) => {
    layers.push({ id: id("ellipse"), name, kind: "ellipse", x, y, width, height, fill, stroke, strokeWidth, construction: false });
  };
  const addLine = (name: string, x1: number, y1: number, x2: number, y2: number, stroke: string, strokeWidth = 1.8) => {
    layers.push({ id: id("line"), name, kind: "line", x1, y1, x2, y2, stroke, strokeWidth, construction: false });
  };
  const addArc = (name: string, x: number, y: number, width: number, height: number, startAngle: number, endAngle: number, stroke: string, strokeWidth = 1.8) => {
    layers.push({ id: id("arc"), name, kind: "arc", x, y, width, height, startAngle, endAngle, stroke, strokeWidth, construction: false });
  };

  if (packageDef.kind === "dip") {
    addArc("Package Notch", rect.x + rect.width * 0.34, rect.y + 6, rect.width * 0.32, rect.height * 0.14, 160, 20, "#3b3b3b", 2.2);
    addEllipse("Pin 1 Mark", rect.x + rect.width * 0.14, rect.y + rect.height * 0.16, 10, 10, "#2f2f2f", "#111111", 1);
    addRect("Body Inset", rect.x + rect.width * 0.14, rect.y + rect.height * 0.2, rect.width * 0.72, rect.height * 0.58, 10, "rgba(255,255,255,0.06)", "#2c2c2c", 1.1);
    return layers;
  }

  if (packageDef.kind === "soic") {
    addEllipse("Pin 1 Mark", rect.x + rect.width * 0.12, rect.y + rect.height * 0.14, 10, 10, "#2f2f2f", "#111111", 1);
    addRect("Body Inset", rect.x + rect.width * 0.14, rect.y + rect.height * 0.2, rect.width * 0.72, rect.height * 0.58, 8, "rgba(255,255,255,0.05)", "#2c2c2c", 1.1);
    return layers;
  }

  if (packageDef.kind === "qfp") {
    addRect("Body Inset", rect.x + rect.width * 0.12, rect.y + rect.height * 0.12, rect.width * 0.76, rect.height * 0.76, 10, "rgba(255,255,255,0.05)", "#2d2d2d", 1.1);
    addEllipse("Pin 1 Mark", rect.x + rect.width * 0.18, rect.y + rect.height * 0.18, 10, 10, "#303030", "#111111", 1);
    return layers;
  }

  if (packageDef.kind === "led") {
    addLine("Cathode Flat", rect.x + rect.width * 0.28, rect.y + rect.height * 0.24, rect.x + rect.width * 0.28, rect.y + rect.height * 0.76, "#2e2e2e", 2);
    addEllipse("Lens Highlight", rect.x + rect.width * 0.2, rect.y + rect.height * 0.16, rect.width * 0.2, rect.height * 0.2, "rgba(255,255,255,0.2)", "#8a8a8a", 0.8);
    addArc("Lens Rim", rect.x + rect.width * 0.12, rect.y + rect.height * 0.12, rect.width * 0.76, rect.height * 0.76, 210, 345, "#bdbdbd", 1.2);
    return layers;
  }

  if (packageDef.kind === "header") {
    const connectorStyle = packageDef.connectorStyle ?? "pin-header";
    if (connectorStyle === "female-header") {
      for (const pin of baseLayout.previewPins) {
        addRect("Socket", pin.x - 7, pin.y - 7, 14, 14, 3, "#252525", "#bdbdbd", 1);
        addEllipse("Socket Core", pin.x - 2.6, pin.y - 2.6, 5.2, 5.2, "#fafafa", "#111111", 1);
      }
      return layers;
    }

    if (connectorStyle === "pin-header") {
      for (const pin of baseLayout.previewPins) {
        addRect("Pin Base", pin.x - 5, pin.y - 5, 10, 10, 2, "#1f1f1f", "#d4d4d4", 1);
      }
      addRect("Plastic Strip", rect.x + rect.width * 0.12, rect.y + rect.height * 0.06, rect.width * 0.76, rect.height * 0.88, 6, "rgba(255,255,255,0.06)", "#2e2e2e", 1.1);
      return layers;
    }

    if (connectorStyle === "jst-ph") {
      addRect("Shroud", rect.x + rect.width * 0.08, rect.y + rect.height * 0.12, rect.width * 0.84, rect.height * 0.72, 6, "rgba(255,255,255,0.05)", "#2c2c2c", 1.2);
      addRect("Mouth", rect.x + rect.width * 0.18, rect.y + rect.height * 0.22, rect.width * 0.64, rect.height * 0.2, 4, "#191919", "#666666", 1);
      for (const pin of baseLayout.previewPins) {
        addLine("Terminal", pin.x, rect.y + rect.height * 0.42, pin.x, rect.y + rect.height * 0.76, "#cecece", 1.4);
      }
      return layers;
    }

    if (connectorStyle === "terminal-block") {
      for (const pin of baseLayout.previewPins) {
        addEllipse("Screw", pin.x - 5, rect.y + rect.height * 0.22, 10, 10, "#2c2c2c", "#cfcfcf", 1);
        addLine("Screw Slot", pin.x - 3.5, rect.y + rect.height * 0.22 + 5, pin.x + 3.5, rect.y + rect.height * 0.22 + 5, "#d8d8d8", 1.1);
      }
      addRect("Wire Entry", rect.x + rect.width * 0.1, rect.y + rect.height * 0.54, rect.width * 0.8, rect.height * 0.18, 4, "#171717", "#6a6a6a", 1);
      return layers;
    }

    if (connectorStyle === "idc-box") {
      addRect("Box Shroud", rect.x + rect.width * 0.08, rect.y + rect.height * 0.08, rect.width * 0.84, rect.height * 0.84, 6, "rgba(255,255,255,0.04)", "#2a2a2a", 1.2);
      addRect("Key Slot", rect.x + rect.width * 0.4, rect.y + rect.height * 0.14, rect.width * 0.2, rect.height * 0.12, 3, "#151515", "#888888", 1);
      return layers;
    }
  }

  if (packageDef.kind === "button") {
    addRect("Plunger", rect.x + rect.width * 0.18, rect.y + rect.height * 0.16, rect.width * 0.64, rect.height * 0.68, Math.max(8, baseLayout.cornerRadius * 0.7), "#a7a7a7", "#2d2d2d", 1.8);
    addRect("Cap Highlight", rect.x + rect.width * 0.26, rect.y + rect.height * 0.24, rect.width * 0.48, rect.height * 0.16, 6, "rgba(255,255,255,0.2)", "rgba(255,255,255,0.08)", 0.8);
    return layers;
  }

  if (packageDef.kind === "to220") {
    addEllipse("Mount Hole", rect.x + rect.width * 0.4, rect.y + rect.height * 0.1, rect.width * 0.2, rect.width * 0.2, "#121212", "#9c9c9c", 1.1);
    addLine("Tab Split", rect.x + rect.width * 0.18, rect.y + rect.height * 0.36, rect.x + rect.width * 0.82, rect.y + rect.height * 0.36, "#3c3c3c", 1.4);
    return layers;
  }

  if (packageDef.kind === "resistor") {
    addLine("Band 1", rect.x + rect.width * 0.34, rect.y + rect.height * 0.18, rect.x + rect.width * 0.34, rect.y + rect.height * 0.82, "#222222", 2);
    addLine("Band 2", rect.x + rect.width * 0.5, rect.y + rect.height * 0.18, rect.x + rect.width * 0.5, rect.y + rect.height * 0.82, "#444444", 2);
    addLine("Band 3", rect.x + rect.width * 0.66, rect.y + rect.height * 0.18, rect.x + rect.width * 0.66, rect.y + rect.height * 0.82, "#777777", 2);
    return layers;
  }

  if (packageDef.kind === "capacitor") {
    addLine("Polarity Mark", rect.x + rect.width * 0.26, rect.y + rect.height * 0.16, rect.x + rect.width * 0.26, rect.y + rect.height * 0.84, "#dcdcdc", 1.8);
    addArc("Top Rim", rect.x + rect.width * 0.12, rect.y + rect.height * 0.08, rect.width * 0.76, rect.height * 0.26, 200, 340, "#888888", 1.2);
    return layers;
  }

  return layers;
}

function translateShape(shape: ShapeLayer, dx: number, dy: number, id: string, name: string): ShapeLayer {
  if (shape.kind === "line") {
    return { ...shape, id, name, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy };
  }
  return { ...shape, id, name, x: shape.x + dx, y: shape.y + dy };
}

function createExplodedChildLayers(child: ChildInstance, packageDef: PackageDefinition, baseLayout: BaseLayout, anchor: Point): ShapeLayer[] {
  const bodyShape = getBodyPreviewShape(packageDef, baseLayout, child.override);
  const bodyCenter = {
    x: baseLayout.bodyRect.x + baseLayout.bodyRect.width / 2,
    y: baseLayout.bodyRect.y + baseLayout.bodyRect.height / 2,
  };
  const dx = anchor.x - bodyCenter.x;
  const dy = anchor.y - bodyCenter.y;
  const layers: ShapeLayer[] = [];
  const details = createGeneratedComponentDetails(packageDef, baseLayout);

  if (bodyShape.kind === "circle") {
    layers.push({
      id: `${child.id}_body`,
      name: `${child.title} Body`,
      kind: "ellipse",
      x: bodyShape.cx - bodyShape.r + dx,
      y: bodyShape.cy - bodyShape.r + dy,
      width: bodyShape.r * 2,
      height: bodyShape.r * 2,
      fill: child.override?.fill ?? "#d4d4d4",
      stroke: child.override?.stroke ?? "#111111",
      strokeWidth: 2,
      construction: false,
    });
  } else {
    layers.push({
      id: `${child.id}_body`,
      name: `${child.title} Body`,
      kind: "rect",
      x: bodyShape.x + dx,
      y: bodyShape.y + dy,
      width: bodyShape.width,
      height: bodyShape.height,
      radius: bodyShape.rx,
      fill: child.override?.fill ?? "#d4d4d4",
      stroke: child.override?.stroke ?? "#111111",
      strokeWidth: 2,
      construction: false,
    });
  }

  for (const pin of baseLayout.previewPins) {
    const clampX = pin.x < baseLayout.bodyRect.x ? baseLayout.bodyRect.x : pin.x > baseLayout.bodyRect.x + baseLayout.bodyRect.width ? baseLayout.bodyRect.x + baseLayout.bodyRect.width : pin.x;
    const clampY = pin.y < baseLayout.bodyRect.y ? baseLayout.bodyRect.y : pin.y > baseLayout.bodyRect.y + baseLayout.bodyRect.height ? baseLayout.bodyRect.y + baseLayout.bodyRect.height : pin.y;
    layers.push({
      id: `${child.id}_pinlead_${pin.id}`,
      name: `${child.title} Lead ${pin.label}`,
      kind: "line",
      x1: clampX + dx,
      y1: clampY + dy,
      x2: pin.x + dx,
      y2: pin.y + dy,
      stroke: "#a3a3a3",
      strokeWidth: packageDef.kind === "qfp" ? 2.4 : 3,
      construction: false,
    });
    layers.push({
      id: `${child.id}_pin_${pin.id}`,
      name: `${child.title} Pin ${pin.label}`,
      kind: "ellipse",
      x: pin.x - 4 + dx,
      y: pin.y - 4 + dy,
      width: 8,
      height: 8,
      fill: packageDef.connectorStyle === "female-header" ? "#ffffff" : "#000000",
      stroke: "#ffffff",
      strokeWidth: 1.1,
      construction: false,
    });
  }

  details.forEach((shape, index) => {
    layers.push(
      translateShape(shape, dx, dy, `${child.id}_detail_${index + 1}`, `${child.title} ${shape.name}`),
    );
  });

  return layers;
}

function createEditableBaseLayers(
  packageDef: PackageDefinition,
  baseLayout: BaseLayout,
  componentName: string,
  override?: BaseOverride,
): ShapeLayer[] {
  const bodyShape = getBodyPreviewShape(packageDef, baseLayout, override);
  const layers: ShapeLayer[] = [];
  const details = createGeneratedComponentDetails(packageDef, baseLayout);

  if (bodyShape.kind === "circle") {
    layers.push({
      id: "base_edit_body",
      name: `${componentName} Body`,
      kind: "ellipse",
      x: bodyShape.cx - bodyShape.r,
      y: bodyShape.cy - bodyShape.r,
      width: bodyShape.r * 2,
      height: bodyShape.r * 2,
      fill: override?.fill ?? "#d4d4d4",
      stroke: override?.stroke ?? "#111111",
      strokeWidth: 2,
      construction: false,
    });
  } else {
    layers.push({
      id: "base_edit_body",
      name: `${componentName} Body`,
      kind: "rect",
      x: bodyShape.x,
      y: bodyShape.y,
      width: bodyShape.width,
      height: bodyShape.height,
      radius: bodyShape.rx,
      fill: override?.fill ?? "#d4d4d4",
      stroke: override?.stroke ?? "#111111",
      strokeWidth: 2,
      construction: false,
    });
  }

  for (const pin of baseLayout.previewPins) {
    const clampX = pin.x < baseLayout.bodyRect.x ? baseLayout.bodyRect.x : pin.x > baseLayout.bodyRect.x + baseLayout.bodyRect.width ? baseLayout.bodyRect.x + baseLayout.bodyRect.width : pin.x;
    const clampY = pin.y < baseLayout.bodyRect.y ? baseLayout.bodyRect.y : pin.y > baseLayout.bodyRect.y + baseLayout.bodyRect.height ? baseLayout.bodyRect.y + baseLayout.bodyRect.height : pin.y;
    layers.push({
      id: `base_edit_pinlead_${pin.id}`,
      name: `${componentName} Lead ${pin.label}`,
      kind: "line",
      x1: clampX,
      y1: clampY,
      x2: pin.x,
      y2: pin.y,
      stroke: "#a3a3a3",
      strokeWidth: packageDef.kind === "qfp" ? 2.4 : 3,
      construction: false,
    });
    layers.push({
      id: `base_edit_pin_${pin.id}`,
      name: `${componentName} Pin ${pin.label}`,
      kind: "ellipse",
      x: pin.x - 4,
      y: pin.y - 4,
      width: 8,
      height: 8,
      fill: packageDef.connectorStyle === "female-header" ? "#ffffff" : "#000000",
      stroke: "#ffffff",
      strokeWidth: 1.1,
      construction: false,
    });
  }

  details.forEach((shape, index) => {
    layers.push(
      translateShape(shape, 0, 0, `base_edit_detail_${index + 1}`, `${componentName} ${shape.name}`),
    );
  });

  return layers;
}

function getRenderedChildLayers(child: ChildInstance, anchor: Point): ShapeLayer[] {
  if (child.customLayers && child.customLayers.length > 0) {
    return child.customLayers.map((shape) => translateShape(shape, anchor.x, anchor.y, shape.id, shape.name));
  }

  const resolved = getChildLayout(child);
  if (!resolved) {
    return [];
  }

  return createExplodedChildLayers(child, resolved.packageDef, resolved.baseLayout, anchor);
}

function getUnionBounds(shapes: ShapeLayer[]): Rect | null {
  if (shapes.length === 0) {
    return null;
  }

  const bounds = shapes.map(getShapeBounds);
  const minX = Math.min(...bounds.map((bound) => bound.x));
  const minY = Math.min(...bounds.map((bound) => bound.y));
  const maxX = Math.max(...bounds.map((bound) => bound.x + bound.width));
  const maxY = Math.max(...bounds.map((bound) => bound.y + bound.height));

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function localizeShape(shape: ShapeLayer, anchor: Point): ShapeLayer {
  if (shape.kind === "line") {
    return {
      ...shape,
      x1: shape.x1 - anchor.x,
      y1: shape.y1 - anchor.y,
      x2: shape.x2 - anchor.x,
      y2: shape.y2 - anchor.y,
    };
  }

  return {
    ...shape,
    x: shape.x - anchor.x,
    y: shape.y - anchor.y,
  };
}

function getShapeResizeHandles(shape: ShapeLayer) {
  if (shape.kind === "line") {
    return [
      { id: "start", x: shape.x1, y: shape.y1 },
      { id: "end", x: shape.x2, y: shape.y2 },
    ];
  }

  return [
    { id: "nw", x: shape.x, y: shape.y },
    { id: "ne", x: shape.x + shape.width, y: shape.y },
    { id: "sw", x: shape.x, y: shape.y + shape.height },
    { id: "se", x: shape.x + shape.width, y: shape.y + shape.height },
  ];
}

function getArcPath(shape: Extract<ShapeLayer, { kind: "arc" }>) {
  const rx = Math.max(1, shape.width / 2);
  const ry = Math.max(1, shape.height / 2);
  const cx = shape.x + rx;
  const cy = shape.y + ry;
  const start = (shape.startAngle * Math.PI) / 180;
  const end = (shape.endAngle * Math.PI) / 180;
  const x1 = cx + rx * Math.cos(start);
  const y1 = cy + ry * Math.sin(start);
  const x2 = cx + rx * Math.cos(end);
  const y2 = cy + ry * Math.sin(end);
  let delta = shape.endAngle - shape.startAngle;
  if (delta === 0) {
    delta = 360;
  }
  const normalizedSpan = Math.abs(delta) % 360 || 360;
  const largeArcFlag = normalizedSpan > 180 ? 1 : 0;
  const sweepFlag = delta > 0 ? 1 : 0;
  return `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`;
}

function getArcPolylinePoints(shape: Extract<ShapeLayer, { kind: "arc" }>, steps = 24): Point[] {
  const rx = Math.max(1, shape.width / 2);
  const ry = Math.max(1, shape.height / 2);
  const cx = shape.x + rx;
  const cy = shape.y + ry;
  let span = shape.endAngle - shape.startAngle;
  if (span <= 0) {
    span += 360;
  }

  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = ((shape.startAngle + (span * index) / steps) * Math.PI) / 180;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  });
}

function getEditableShapeDistance(shape: ShapeLayer, point: Point) {
  if (shape.kind === "line") {
    return distancePointToSegment(point, { x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 });
  }

  if (shape.kind === "arc") {
    const samples = getArcPolylinePoints(shape);
    let best = Number.POSITIVE_INFINITY;
    for (let index = 0; index < samples.length - 1; index += 1) {
      best = Math.min(best, distancePointToSegment(point, samples[index], samples[index + 1]));
    }
    return best;
  }

  return Number.POSITIVE_INFINITY;
}

function renderShapeLayer(shape: ShapeLayer, selected: boolean, hidden: boolean) {
  if (hidden) {
    return null;
  }

  const stroke = "stroke" in shape ? (shape.construction ? "#b8b8b8" : shape.stroke) : "#b8b8b8";
  const fill = shape.construction ? "none" : "fill" in shape ? shape.fill : "none";
  const dash = shape.construction ? "8 5" : undefined;

  if (shape.kind === "rect") {
    return (
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        rx={shape.radius}
        fill={fill}
        fillOpacity={selected ? 0.92 : 0.74}
        stroke={stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={dash}
      />
    );
  }

  if (shape.kind === "ellipse") {
    return (
      <ellipse
        cx={shape.x + shape.width / 2}
        cy={shape.y + shape.height / 2}
        rx={shape.width / 2}
        ry={shape.height / 2}
        fill={fill}
        fillOpacity={selected ? 0.92 : 0.74}
        stroke={stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={dash}
      />
    );
  }

  if (shape.kind === "line") {
    return (
      <line
        x1={shape.x1}
        y1={shape.y1}
        x2={shape.x2}
        y2={shape.y2}
        stroke={stroke}
        strokeWidth={shape.strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    );
  }

  if (shape.kind === "text") {
    return (
      <g>
        {selected ? (
          <rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            rx={6}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.4}
            strokeDasharray="6 4"
          />
        ) : null}
        <text
          x={shape.x + 4}
          y={shape.y + shape.height * 0.72}
          fill={shape.construction ? "#b8b8b8" : shape.fill}
          fontFamily="IBM Plex Mono, monospace"
          fontSize={shape.fontSize}
          letterSpacing="0.08em"
        >
          {shape.text}
        </text>
      </g>
    );
  }

  if (shape.kind === "hole") {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    const rx = shape.width / 2;
    const ry = shape.height / 2;
    return (
      <g>
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={stroke}
          strokeWidth={shape.strokeWidth}
          strokeDasharray={dash}
        />
        <line x1={cx - rx * 0.45} y1={cy} x2={cx + rx * 0.45} y2={cy} stroke={stroke} strokeWidth={1} strokeDasharray={dash} />
        <line x1={cx} y1={cy - ry * 0.45} x2={cx} y2={cy + ry * 0.45} stroke={stroke} strokeWidth={1} strokeDasharray={dash} />
      </g>
    );
  }

  return (
    <path
      d={getArcPath(shape)}
      fill="none"
      stroke={stroke}
      strokeWidth={shape.strokeWidth}
      strokeLinecap="round"
      strokeDasharray={dash}
    />
  );
}

function shapeToPreviewShape(shape: ShapeLayer): PreviewShape {
  if (shape.kind === "rect") {
    return { kind: "rect", x: shape.x, y: shape.y, width: shape.width, height: shape.height, rx: shape.radius };
  }
  if (shape.kind === "ellipse") {
    return { kind: "circle", cx: shape.x + shape.width / 2, cy: shape.y + shape.height / 2, r: Math.min(shape.width, shape.height) / 2 };
  }
  const bounds = getShapeBounds(shape);
  return { kind: "rect", x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, rx: 10 };
}

function getPreviewPins(
  packageDef: PackageDefinition,
  bodyRect: Rect,
  umPerUnit: number,
  pinOverrides: Record<string, PinOverride> = {},
): PreviewPin[] {
  const pins = packageDef.pins;
  if (pins.length === 0) {
    return [];
  }

  const pitch = packageDef.pinPitchUm / umPerUnit;
  const leadLength = 12;
  const applyOverride = (pin: PreviewPin): PreviewPin => ({
    ...pin,
    label: pinOverrides[pin.id]?.label ?? pin.label,
    x: pin.x + (pinOverrides[pin.id]?.dxUm ?? 0) / umPerUnit,
    y: pin.y + (pinOverrides[pin.id]?.dyUm ?? 0) / umPerUnit,
  });

  if (packageDef.kind === "dip" || packageDef.kind === "soic") {
    const rowPins = Math.ceil(pins.length / 2);
    return pins
      .map((pin, index) => {
        if (index < rowPins) {
          return {
            id: pin.id,
            label: pin.label,
            x: bodyRect.x - leadLength,
            y: bodyRect.y + index * pitch + pitch / 2,
          };
        }

        const mirroredIndex = pins.length - 1 - index;
        return {
          id: pin.id,
          label: pin.label,
          x: bodyRect.x + bodyRect.width + leadLength,
          y: bodyRect.y + mirroredIndex * pitch + pitch / 2,
        };
      })
      .map(applyOverride);
  }

  if (packageDef.kind === "qfp") {
    const sideCount = Math.max(1, Math.floor(pins.length / 4));
    const verticalStep = bodyRect.height / sideCount;
    const horizontalStep = bodyRect.width / sideCount;
    const sideOffset = 8;
    return pins
      .map((pin, index) => {
        if (index < sideCount) {
          return {
            id: pin.id,
            label: pin.label,
            x: bodyRect.x - sideOffset,
            y: bodyRect.y + verticalStep * (index + 0.5),
          };
        }
        if (index < sideCount * 2) {
          const bottomIndex = index - sideCount;
          return {
            id: pin.id,
            label: pin.label,
            x: bodyRect.x + horizontalStep * (bottomIndex + 0.5),
            y: bodyRect.y + bodyRect.height + sideOffset,
          };
        }
        if (index < sideCount * 3) {
          const rightIndex = index - sideCount * 2;
          return {
            id: pin.id,
            label: pin.label,
            x: bodyRect.x + bodyRect.width + sideOffset,
            y: bodyRect.y + bodyRect.height - verticalStep * (rightIndex + 0.5),
          };
        }
        const topIndex = index - sideCount * 3;
        return {
          id: pin.id,
          label: pin.label,
          x: bodyRect.x + bodyRect.width - horizontalStep * (topIndex + 0.5),
          y: bodyRect.y - sideOffset,
        };
      })
      .map(applyOverride);
  }

  if (packageDef.kind === "header") {
    const columnCount = Math.max(1, Math.round(packageDef.bodyWidthUm / packageDef.pinPitchUm));
    return pins
      .map((pin, index) => {
        const columnIndex = index % columnCount;
        const rowIndex = Math.floor(index / columnCount);
        return {
          id: pin.id,
          label: pin.label,
          x: bodyRect.x + columnIndex * pitch + pitch / 2,
          y: bodyRect.y + rowIndex * pitch + pitch / 2,
        };
      })
      .map(applyOverride);
  }

  if (packageDef.kind === "sot23") {
    const leftPins = Math.ceil(pins.length / 2);
    const rightPins = Math.max(1, pins.length - leftPins);
    return pins
      .map((pin, index) => {
        if (index < leftPins) {
          const leftStep = bodyRect.height / (leftPins + 1);
          return {
            id: pin.id,
            label: pin.label,
            x: bodyRect.x - leadLength * 0.7,
            y: bodyRect.y + leftStep * (index + 1),
          };
        }
        const rightIndex = index - leftPins;
        const rightStep = bodyRect.height / (rightPins + 1);
        return {
          id: pin.id,
          label: pin.label,
          x: bodyRect.x + bodyRect.width + leadLength * 0.7,
          y: bodyRect.y + rightStep * (rightIndex + 1),
        };
      })
      .map(applyOverride);
  }

  if (packageDef.kind === "chip2") {
    return pins
      .map((pin, index) => ({
        id: pin.id,
        label: pin.label,
        x: index === 0 ? bodyRect.x - 6 : bodyRect.x + bodyRect.width + 6,
        y: bodyRect.y + bodyRect.height / 2,
      }))
      .map(applyOverride);
  }

  if (packageDef.kind === "to220") {
    const centerX = bodyRect.x + bodyRect.width / 2;
    const bottomY = bodyRect.y + bodyRect.height + leadLength;
    return pins
      .map((pin, index) => ({
        id: pin.id,
        label: pin.label,
        x: centerX + (index - 1) * pitch,
        y: bottomY,
      }))
      .map(applyOverride);
  }

  if (packageDef.kind === "button") {
    return pins
      .map((pin, index) => ({
        id: pin.id,
        label: pin.label,
        x: index < 2 ? bodyRect.x - leadLength : bodyRect.x + bodyRect.width + leadLength,
        y: index % 2 === 0 ? bodyRect.y + bodyRect.height * 0.28 : bodyRect.y + bodyRect.height * 0.72,
      }))
      .map(applyOverride);
  }

  if (packageDef.kind === "resistor") {
    return pins
      .map((pin, index) => ({
        id: pin.id,
        label: pin.label,
        x: index === 0 ? bodyRect.x - leadLength : bodyRect.x + bodyRect.width + leadLength,
        y: bodyRect.y + bodyRect.height / 2,
      }))
      .map(applyOverride);
  }

  if (packageDef.kind === "led" || packageDef.kind === "capacitor") {
    const pinOffset = bodyRect.width / 4;
    const bottomY = bodyRect.y + bodyRect.height + leadLength;
    return pins
      .map((pin, index) => ({
        id: pin.id,
        label: pin.label,
        x: index === 0 ? bodyRect.x + pinOffset : bodyRect.x + bodyRect.width - pinOffset,
        y: bottomY,
      }))
      .map(applyOverride);
  }

  const leftX = bodyRect.x - leadLength;
  const rightX = bodyRect.x + bodyRect.width + leadLength;
  const topY = bodyRect.y + bodyRect.height * 0.3;
  const bottomY = bodyRect.y + bodyRect.height * 0.7;
  const basePins = [
    { id: pins[0]?.id ?? "1", label: pins[0]?.label ?? "1", x: leftX, y: topY },
    { id: pins[1]?.id ?? "2", label: pins[1]?.label ?? "2", x: leftX, y: bottomY },
    { id: pins[2]?.id ?? "3", label: pins[2]?.label ?? "3", x: rightX, y: topY },
    { id: pins[3]?.id ?? "4", label: pins[3]?.label ?? "4", x: rightX, y: bottomY },
  ];

  return basePins.slice(0, pins.length).map(applyOverride);
}

function getBaseLayout(
  packageDef: PackageDefinition | null,
  blankBoard: BlankBoardState,
  blank: boolean,
  override?: BaseOverride,
  offset: Point = { x: 0, y: 0 },
  pinOverrides: Record<string, PinOverride> = {},
): BaseLayout {
  if (!blank && !packageDef) {
    return {
      bodyRect: { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2, width: 0, height: 0 },
      bodyWidthUm: 0,
      bodyHeightUm: 0,
      cornerRadius: 0,
      previewPins: [],
      umPerUnit: 1,
    };
  }

  const bodyWidthUm = override?.widthUm ?? (blank ? blankBoard.widthUm : packageDef?.bodyWidthUm ?? 10000);
  const bodyHeightUm = override?.heightUm ?? (blank ? blankBoard.heightUm : packageDef?.bodyHeightUm ?? 6000);
  const scale = Math.min(320 / bodyWidthUm, 240 / bodyHeightUm);
  const width = bodyWidthUm * scale;
  const height = bodyHeightUm * scale;
  const bodyRect = {
    x: (STAGE_WIDTH - width) / 2 + offset.x,
    y: (STAGE_HEIGHT - height) / 2 + offset.y,
    width,
    height,
  };

  return {
    bodyRect,
    bodyWidthUm,
    bodyHeightUm,
    cornerRadius:
      override?.cornerUm != null
        ? Math.max(4, override.cornerUm * scale)
        : blank
          ? Math.max(6, blankBoard.cornerUm * scale)
          : Math.max(10, Math.min(width, height) * 0.1),
    previewPins: packageDef ? getPreviewPins(packageDef, bodyRect, 1 / scale, pinOverrides) : [],
    umPerUnit: 1 / scale,
  };
}

function getBodyPreviewShape(packageDef: PackageDefinition | null, baseLayout: BaseLayout, baseOverride?: BaseOverride): Extract<PreviewShape, { kind: "rect" | "circle" }> {
  if (baseOverride?.form === "circle" || packageDef?.kind === "led") {
    return {
      kind: "circle",
      cx: baseLayout.bodyRect.x + baseLayout.bodyRect.width / 2,
      cy: baseLayout.bodyRect.y + baseLayout.bodyRect.height / 2,
      r: Math.min(baseLayout.bodyRect.width, baseLayout.bodyRect.height) / 2,
    };
  }

  return {
    kind: "rect",
    x: baseLayout.bodyRect.x,
    y: baseLayout.bodyRect.y,
    width: baseLayout.bodyRect.width,
    height: baseLayout.bodyRect.height,
    rx: baseOverride?.form === "capsule" ? baseLayout.bodyRect.height / 2 : baseLayout.cornerRadius,
  };
}

function getBuiltInShape(layerId: BuiltInLayerId, baseLayout: BaseLayout, packageDef: PackageDefinition | null, baseOverride?: BaseOverride): PreviewShape {
  if (layerId === "pins_primary") {
    return { kind: "pinGroup", pins: baseLayout.previewPins, r: 6 };
  }
  if (layerId === "label_primary") {
    return {
      kind: "rect",
      x: baseLayout.bodyRect.x + baseLayout.bodyRect.width * 0.18,
      y: baseLayout.bodyRect.y + baseLayout.bodyRect.height + 14,
      width: baseLayout.bodyRect.width * 0.64,
      height: 18,
      rx: 8,
    };
  }
  return getBodyPreviewShape(packageDef, baseLayout, baseOverride);
}

function getTranslatedPreviewShape(shape: PreviewShape, dx: number, dy: number): PreviewShape {
  if (shape.kind === "circle") {
    return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
  }
  if (shape.kind === "pinGroup") {
    return {
      ...shape,
      pins: shape.pins.map((pin) => ({ ...pin, x: pin.x + dx, y: pin.y + dy })),
    };
  }
  return { ...shape, x: shape.x + dx, y: shape.y + dy };
}

function getChildAnchorOrigin(baseLayout: BaseLayout, hasBase: boolean): Point {
  return hasBase
    ? { x: baseLayout.bodyRect.x, y: baseLayout.bodyRect.y }
    : { x: 0, y: 0 };
}

function getChildAnchorPosition(anchorOrigin: Point, child: ChildInstance): Point {
  return {
    x: anchorOrigin.x + child.anchor.x,
    y: anchorOrigin.y + child.anchor.y,
  };
}

function getChildLayout(child: ChildInstance): { packageDef: PackageDefinition; baseLayout: BaseLayout } | null {
  const item = getLibraryItem(child.itemId);
  if (!item) {
    return null;
  }

  const packageDef = resolvePackageByItemId(child.itemId, child.packageState ?? getDefaultPackageState(child.itemId));
  return {
    packageDef,
    baseLayout: getBaseLayout(packageDef, { widthUm: 0, heightUm: 0, cornerUm: 0 }, false, child.override, { x: 0, y: 0 }, child.pinOverrides ?? {}),
  };
}

function getChildBodyShape(child: ChildInstance): PreviewShape | null {
  if (child.customLayers && child.customLayers.length > 0) {
    const bounds = getUnionBounds(child.customLayers);
    if (!bounds) {
      return null;
    }
    return {
      kind: "rect",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rx: 10,
    };
  }

  const resolved = getChildLayout(child);
  if (!resolved) {
    return null;
  }
  return getBodyPreviewShape(resolved.packageDef, resolved.baseLayout, child.override);
}

function getPreviewShapeRect(shape: PreviewShape): Rect {
  if (shape.kind === "circle") {
    return {
      x: shape.cx - shape.r,
      y: shape.cy - shape.r,
      width: shape.r * 2,
      height: shape.r * 2,
    };
  }
  if (shape.kind === "pinGroup") {
    const minX = Math.min(...shape.pins.map((pin) => pin.x - shape.r));
    const minY = Math.min(...shape.pins.map((pin) => pin.y - shape.r));
    const maxX = Math.max(...shape.pins.map((pin) => pin.x + shape.r));
    const maxY = Math.max(...shape.pins.map((pin) => pin.y + shape.r));
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  return {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  };
}

function getChildStagePins(anchorOrigin: Point, child: ChildInstance): PreviewPin[] {
  const resolved = getChildLayout(child);
  if (!resolved) {
    return [];
  }
  const anchor = getChildAnchorPosition(anchorOrigin, child);
  const bodyCenter = {
    x: resolved.baseLayout.bodyRect.x + resolved.baseLayout.bodyRect.width / 2,
    y: resolved.baseLayout.bodyRect.y + resolved.baseLayout.bodyRect.height / 2,
  };
  const dx = anchor.x - bodyCenter.x;
  const dy = anchor.y - bodyCenter.y;
  return resolved.baseLayout.previewPins.map((pin) => ({
    ...pin,
    x: pin.x + dx,
    y: pin.y + dy,
  }));
}

function getChildStageBodyRect(anchorOrigin: Point, child: ChildInstance): Rect | null {
  const shape = getChildBodyShape(child);
  if (!shape) {
    return null;
  }
  const anchor = getChildAnchorPosition(anchorOrigin, child);
  const resolved = getChildLayout(child);

  if (resolved) {
    const bodyCenter = {
      x: resolved.baseLayout.bodyRect.x + resolved.baseLayout.bodyRect.width / 2,
      y: resolved.baseLayout.bodyRect.y + resolved.baseLayout.bodyRect.height / 2,
    };
    const dx = anchor.x - bodyCenter.x;
    const dy = anchor.y - bodyCenter.y;
    const rect = getPreviewShapeRect(shape);
    return {
      x: rect.x + dx,
      y: rect.y + dy,
      width: rect.width,
      height: rect.height,
    };
  }

  const rect = getPreviewShapeRect(shape);
  return {
    x: rect.x + anchor.x,
    y: rect.y + anchor.y,
    width: rect.width,
    height: rect.height,
  };
}

function renderPreviewShape(shape: PreviewShape, fill: string, opacity = 1, stroke = "none", strokeWidth = 0, dash?: string) {
  if (shape.kind === "circle") {
    return <circle cx={shape.cx} cy={shape.cy} r={shape.r} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} />;
  }
  if (shape.kind === "pinGroup") {
    return (
      <g opacity={opacity}>
        {shape.pins.map((pin) => (
          <circle key={pin.id} cx={pin.x} cy={pin.y} r={shape.r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} />
        ))}
      </g>
    );
  }
  return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} />;
}

function renderBehaviorPreview(draft: BehaviorDraftState, shape: PreviewShape | null) {
  if (!shape) {
    return null;
  }

  const preset = getBehaviorPreset(draft.presetId);
  if (preset.id === "light_emitter") {
    return (
      <g pointerEvents="none">
        {draft.glowEnabled && shape.kind !== "pinGroup"
          ? [0.18, 0.09, 0.04].map((opacity, index) => {
              if (shape.kind === "circle") {
                return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r + draft.glowRadius * (0.3 + index * 0.3)} fill={draft.baseColor} opacity={opacity} />;
              }
              return (
                <rect
                  key={index}
                  x={shape.x - draft.glowRadius * (0.3 + index * 0.3)}
                  y={shape.y - draft.glowRadius * (0.3 + index * 0.3)}
                  width={shape.width + draft.glowRadius * (0.6 + index * 0.6)}
                  height={shape.height + draft.glowRadius * (0.6 + index * 0.6)}
                  rx={shape.rx + 6}
                  fill={draft.baseColor}
                  opacity={opacity}
                />
              );
            })
          : null}
        {renderPreviewShape(shape, draft.baseColor, clamp(Math.max(draft.opacityMin, draft.opacityMax), 0.08, 1))}
      </g>
    );
  }

  if (preset.id === "translate_actor" || preset.id === "linear_slider") {
    const rect =
      shape.kind === "circle"
        ? { x: shape.cx - shape.r, y: shape.cy - shape.r, width: shape.r * 2, height: shape.r * 2 }
        : shape.kind === "rect"
          ? shape
          : {
              x: Math.min(...shape.pins.map((pin) => pin.x)) - 12,
              y: Math.min(...shape.pins.map((pin) => pin.y)) - 12,
              width: Math.max(...shape.pins.map((pin) => pin.x)) - Math.min(...shape.pins.map((pin) => pin.x)) + 24,
              height: Math.max(...shape.pins.map((pin) => pin.y)) - Math.min(...shape.pins.map((pin) => pin.y)) + 24,
            };
    const horizontal = draft.axis === "x";
    return (
      <g pointerEvents="none">
        {horizontal ? (
          <line x1={rect.x - 30} y1={rect.y + rect.height / 2} x2={rect.x + rect.width + 30} y2={rect.y + rect.height / 2} stroke="#ffffff" strokeWidth={2} strokeDasharray="7 5" />
        ) : (
          <line x1={rect.x + rect.width / 2} y1={rect.y - 30} x2={rect.x + rect.width / 2} y2={rect.y + rect.height + 30} stroke="#ffffff" strokeWidth={2} strokeDasharray="7 5" />
        )}
      </g>
    );
  }

  return <g pointerEvents="none">{renderPreviewShape(shape, "none", 1, "#ffffff", 2, "6 5")}</g>;
}

function renderDimensionGuides(selection: LayerSelection, shape: ShapeLayer | null, baseLayout: BaseLayout) {
  if (!selection) {
    return null;
  }

  if (selection.kind === "base" && selection.id === "body_primary") {
    const rect = baseLayout.bodyRect;
    const bottom = rect.y + rect.height + 42;
    const left = rect.x - 32;
    return (
      <g pointerEvents="none">
        <line x1={rect.x} y1={bottom} x2={rect.x + rect.width} y2={bottom} stroke="#8f8f8f" strokeWidth={1.2} />
        <line x1={left} y1={rect.y} x2={left} y2={rect.y + rect.height} stroke="#8f8f8f" strokeWidth={1.2} />
        <rect x={rect.x + rect.width / 2 - 36} y={bottom - 12} width={72} height={18} rx={9} fill="#000000" stroke="#5e5e5e" strokeWidth={1} />
        <text x={rect.x + rect.width / 2} y={bottom + 1} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">{formatMm(baseLayout.bodyWidthUm)}</text>
        <rect x={left - 34} y={rect.y + rect.height / 2 - 9} width={68} height={18} rx={9} fill="#000000" stroke="#5e5e5e" strokeWidth={1} />
        <text x={left} y={rect.y + rect.height / 2 + 3} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">{formatMm(baseLayout.bodyHeightUm)}</text>
      </g>
    );
  }

  if (selection.kind === "shape" && shape) {
    const bounds = getShapeBounds(shape);
    const bottom = bounds.y + bounds.height + 32;
    const left = bounds.x - 24;
    return (
      <g pointerEvents="none">
        <line x1={bounds.x} y1={bottom} x2={bounds.x + bounds.width} y2={bottom} stroke="#8f8f8f" strokeWidth={1.2} />
        <line x1={left} y1={bounds.y} x2={left} y2={bounds.y + bounds.height} stroke="#8f8f8f" strokeWidth={1.2} />
        <rect x={bounds.x + bounds.width / 2 - 34} y={bottom - 12} width={68} height={18} rx={9} fill="#000000" stroke="#5e5e5e" strokeWidth={1} />
        <text x={bounds.x + bounds.width / 2} y={bottom + 1} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">{round(bounds.width)}</text>
        <rect x={left - 34} y={bounds.y + bounds.height / 2 - 9} width={68} height={18} rx={9} fill="#000000" stroke="#5e5e5e" strokeWidth={1} />
        <text x={left} y={bounds.y + bounds.height / 2 + 3} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">{round(bounds.height)}</text>
      </g>
    );
  }

  return null;
}

function getShapeDimensionSummary(shape: ShapeLayer, umPerUnit: number) {
  if (shape.kind === "line") {
    const lengthUm = distance({ x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 }) * umPerUnit;
    const dxUm = Math.abs(shape.x2 - shape.x1) * umPerUnit;
    const dyUm = Math.abs(shape.y2 - shape.y1) * umPerUnit;
    return {
      primary: `Length ${formatMm(lengthUm)}`,
      secondary: `DX ${formatMm(dxUm)} | DY ${formatMm(dyUm)}`,
    };
  }

  const widthUm = shape.width * umPerUnit;
  const heightUm = shape.height * umPerUnit;
  if (shape.kind === "ellipse" || shape.kind === "hole") {
    return {
      primary: `W ${formatMm(widthUm)} | H ${formatMm(heightUm)}`,
      secondary:
        Math.abs(shape.width - shape.height) < 0.1
          ? `Diameter ${formatMm(widthUm)}`
          : `Ellipse`,
    };
  }

  if (shape.kind === "arc") {
    const spanDeg = ((shape.endAngle - shape.startAngle) % 360 + 360) % 360 || 360;
    return {
      primary: `W ${formatMm(widthUm)} | H ${formatMm(heightUm)}`,
      secondary: `Sweep ${round(spanDeg, 0)} deg`,
    };
  }

  if (shape.kind === "text") {
    return {
      primary: `W ${formatMm(widthUm)} | H ${formatMm(heightUm)}`,
      secondary: `Font ${round(shape.fontSize, 0)} px`,
    };
  }

  return {
    primary: `W ${formatMm(widthUm)} | H ${formatMm(heightUm)}`,
    secondary:
      shape.constraints?.aspect === "equal"
        ? `Equal aspect`
        : `Rect`,
  };
}

function getDimensionLabel(shape: ShapeLayer, kind: DimensionKind, umPerUnit: number) {
  if (shape.kind === "line") {
    const dxUm = Math.abs(shape.x2 - shape.x1) * umPerUnit;
    const dyUm = Math.abs(shape.y2 - shape.y1) * umPerUnit;
    const lengthUm = distance({ x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 }) * umPerUnit;
    if (kind === "dx") {
      return `DX ${formatMm(dxUm)}`;
    }
    if (kind === "dy") {
      return `DY ${formatMm(dyUm)}`;
    }
    return `L ${formatMm(lengthUm)}`;
  }

  if (kind === "height") {
    return `H ${formatMm(shape.height * umPerUnit)}`;
  }
  return `W ${formatMm(shape.width * umPerUnit)}`;
}

function renderPersistentDimension(
  dimension: PersistentDimension,
  shape: ShapeLayer,
  umPerUnit: number,
  index: number,
) {
  const color = "#8f8f8f";
  const label = getDimensionLabel(shape, dimension.kind, umPerUnit);
  const stackOffset = index * 24;

  if (shape.kind === "line") {
    const start = { x: shape.x1, y: shape.y1 };
    const end = { x: shape.x2, y: shape.y2 };
    if (dimension.kind === "dx") {
      const y = Math.min(start.y, end.y) - 18 - stackOffset;
      return (
        <g key={dimension.id} pointerEvents="none">
          <line x1={start.x} y1={y} x2={end.x} y2={y} stroke={color} strokeWidth={1.2} strokeDasharray="6 4" />
          <rect x={(start.x + end.x) / 2 - 34} y={y - 12} width={68} height={18} rx={9} fill="#000000" stroke="#5e5e5e" strokeWidth={1} />
          <text x={(start.x + end.x) / 2} y={y + 1} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">{label}</text>
        </g>
      );
    }
    if (dimension.kind === "dy") {
      const x = Math.min(start.x, end.x) - 20 - stackOffset;
      return (
        <g key={dimension.id} pointerEvents="none">
          <line x1={x} y1={start.y} x2={x} y2={end.y} stroke={color} strokeWidth={1.2} strokeDasharray="6 4" />
          <rect x={x - 34} y={(start.y + end.y) / 2 - 9} width={68} height={18} rx={9} fill="#000000" stroke="#5e5e5e" strokeWidth={1} />
          <text x={x} y={(start.y + end.y) / 2 + 3} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">{label}</text>
        </g>
      );
    }

    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const nx = -dy / length;
    const ny = dx / length;
    const offset = 16 + stackOffset;
    return (
      <g key={dimension.id} pointerEvents="none">
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={1.2} strokeDasharray="6 4" />
        <rect x={mid.x + nx * offset - 34} y={mid.y + ny * offset - 9} width={68} height={18} rx={9} fill="#000000" stroke="#5e5e5e" strokeWidth={1} />
        <text x={mid.x + nx * offset} y={mid.y + ny * offset + 3} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">{label}</text>
      </g>
    );
  }

  const bounds = getShapeBounds(shape);
  if (dimension.kind === "height") {
    const x = bounds.x - 24 - stackOffset;
    return (
      <g key={dimension.id} pointerEvents="none">
        <line x1={x} y1={bounds.y} x2={x} y2={bounds.y + bounds.height} stroke={color} strokeWidth={1.2} />
        <rect x={x - 34} y={bounds.y + bounds.height / 2 - 9} width={68} height={18} rx={9} fill="#000000" stroke="#5e5e5e" strokeWidth={1} />
        <text x={x} y={bounds.y + bounds.height / 2 + 3} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">{label}</text>
      </g>
    );
  }

  const y = bounds.y + bounds.height + 32 + stackOffset;
  return (
    <g key={dimension.id} pointerEvents="none">
      <line x1={bounds.x} y1={y} x2={bounds.x + bounds.width} y2={y} stroke={color} strokeWidth={1.2} />
      <rect x={bounds.x + bounds.width / 2 - 34} y={y - 12} width={68} height={18} rx={9} fill="#000000" stroke="#5e5e5e" strokeWidth={1} />
      <text x={bounds.x + bounds.width / 2} y={y + 1} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">{label}</text>
    </g>
  );
}

function renderBasePackage(
  packageDef: PackageDefinition | null,
  baseLayout: BaseLayout,
  componentName: string,
  selectedLayer: LayerSelection,
  hideBody: boolean,
  hidePins: boolean,
  hideLabel: boolean,
  baseOverride?: BaseOverride,
) {
  const bodySelected = selectedLayer?.kind === "base" && selectedLayer.id === "body_primary";
  const pinsSelected = selectedLayer?.kind === "base" && selectedLayer.id === "pins_primary";
  const labelSelected = selectedLayer?.kind === "base" && selectedLayer.id === "label_primary";
  const rect = baseLayout.bodyRect;
  const blankBoardBase = !packageDef;

  return (
    <g>
      {!hidePins ? (
        <g>
          {baseLayout.previewPins.map((pin) => (
            <g key={pin.id}>
              {packageDef?.kind !== "header" ? (
                <line
                  x1={pin.x < rect.x ? rect.x : pin.x > rect.x + rect.width ? rect.x + rect.width : pin.x}
                  y1={pin.y < rect.y ? rect.y : pin.y > rect.y + rect.height ? rect.y + rect.height : pin.y}
                  x2={pin.x}
                  y2={pin.y}
                  stroke="#a3a3a3"
                  strokeWidth={packageDef?.kind === "qfp" ? 3 : 4}
                  strokeLinecap="round"
                />
              ) : null}
              {packageDef?.connectorStyle === "female-header" ? (
                <>
                  <rect x={pin.x - 8} y={pin.y - 8} width={16} height={16} rx={4} fill="#2a2a2a" stroke="#bbbbbb" strokeWidth={1} />
                  <circle cx={pin.x} cy={pin.y} r={pinsSelected ? 4.6 : 3.8} fill="#ffffff" stroke="#111111" strokeWidth={1.2} />
                </>
              ) : (
                <circle cx={pin.x} cy={pin.y} r={pinsSelected ? 4.8 : 4} fill="#000000" stroke="#ffffff" strokeWidth={pinsSelected ? 1.6 : 1} />
              )}
            </g>
          ))}
        </g>
      ) : null}

      {!hideBody ? (
        <g filter={blankBoardBase ? undefined : "url(#creator-soft-shadow)"}>
          {blankBoardBase ? (
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx={baseOverride?.form === "capsule" ? rect.height / 2 : baseLayout.cornerRadius}
              fill={baseOverride?.fill ?? "rgba(255,255,255,0.02)"}
              stroke={bodySelected ? "#ffffff" : baseOverride?.stroke ?? "rgba(255,255,255,0.5)"}
              strokeWidth={bodySelected ? 2.6 : 1.6}
            />
          ) : baseOverride?.form === "circle" || packageDef?.kind === "led" ? (
            <circle
              cx={rect.x + rect.width / 2}
              cy={rect.y + rect.height / 2}
              r={Math.min(rect.width, rect.height) / 2}
              fill={baseOverride?.fill ?? "#d4d4d4"}
              stroke={bodySelected ? "#ffffff" : baseOverride?.stroke ?? "#111111"}
              strokeWidth={bodySelected ? 3.2 : 2.8}
            />
          ) : (
            <>
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx={baseOverride?.form === "capsule" ? rect.height / 2 : baseLayout.cornerRadius}
                fill={baseOverride?.fill ?? "#d4d4d4"}
                stroke={bodySelected ? "#ffffff" : baseOverride?.stroke ?? "#111111"}
                strokeWidth={bodySelected ? 3.2 : 2.8}
              />
              <rect
                x={rect.x + 10}
                y={rect.y + 10}
                width={Math.max(10, rect.width - 20)}
                height={Math.max(10, rect.height - 20)}
                rx={baseOverride?.form === "capsule" ? Math.max(8, rect.height / 2 - 6) : Math.max(6, baseLayout.cornerRadius - 4)}
                fill="#ffffff"
                opacity={0.08}
              />
            </>
          )}
        </g>
      ) : null}

      {!hideLabel && packageDef ? (
        <g>
          <text x={rect.x + rect.width / 2} y={rect.y + rect.height + 26} textAnchor="middle" fill={labelSelected ? "#ffffff" : "rgba(255,255,255,0.78)"} fontFamily="IBM Plex Mono, monospace" fontSize="11" letterSpacing="0.18em">
            {componentName.toUpperCase()}
          </text>
          <text x={rect.x + rect.width / 2} y={rect.y + rect.height + 42} textAnchor="middle" fill="rgba(255,255,255,0.48)" fontFamily="IBM Plex Mono, monospace" fontSize="9" letterSpacing="0.16em">
            {packageDef?.packageKey ?? "BLANK-BOARD"}
          </text>
        </g>
      ) : null}
    </g>
  );
}

export function ComponentCreatorWorkspace({ modeSwitch }: { modeSwitch?: ReactNode }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const stagePanelRef = useRef<HTMLDivElement | null>(null);
  const [componentName, setComponentName] = useState("Custom Component");
  const [childQuery, setChildQuery] = useState("");
  const [selectedBaseId, setSelectedBaseId] = useState(NO_BASE_ID);
  const [blankBoard, setBlankBoard] = useState<BlankBoardState>({ widthUm: 18000, heightUm: 42000, cornerUm: 1200 });
  const [packageStates, setPackageStates] = useState<Record<string, ComponentPackageState>>({});
  const [baseOverrides, setBaseOverrides] = useState<Record<string, BaseOverride>>({});
  const [baseOffsets, setBaseOffsets] = useState<Record<string, Point>>({});
  const [pinOverrides, setPinOverrides] = useState<Record<string, Record<string, PinOverride>>>({});
  const [children, setChildren] = useState<ChildInstance[]>([]);
  const [childEditSession, setChildEditSession] = useState<ChildEditSession | null>(null);
  const [pendingChildItemId, setPendingChildItemId] = useState<string | null>(null);
  const [shapeTool, setShapeTool] = useState<ShapeTool>("select");
  const [shapeLayers, setShapeLayers] = useState<ShapeLayer[]>([]);
  const [persistentDimensions, setPersistentDimensions] = useState<PersistentDimension[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<LayerSelection>({ kind: "base", id: "body_primary" });
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedChildPinId, setSelectedChildPinId] = useState<string | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<Record<string, boolean>>({});
  const [overlayState, setOverlayState] = useState({ pins: false, snaps: false, behavior: false, dimensions: true });
  const [pointerState, setPointerState] = useState<PointerState>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [activeSnapPoint, setActiveSnapPoint] = useState<Point | null>(null);
  const [measureAxis, setMeasureAxis] = useState<MeasureAxis>("free");
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
  const [offsetDistance, setOffsetDistance] = useState(12);
  const [draft, setDraft] = useState<BehaviorDraftState>(() => createDefaultBehaviorDraftState());
  const [leftSections, setLeftSections] = useState({
    component: true,
    library: true,
    stack: true,
  });
  const [rightSections, setRightSections] = useState({
    selection: true,
    behaviors: false,
  });

  const hasBase = selectedBaseId !== NO_BASE_ID;
  const blankBase = selectedBaseId === BLANK_BOARD_ID;
  const selectedBaseItem = useMemo(() => (selectedBaseId === BLANK_BOARD_ID || selectedBaseId === NO_BASE_ID ? null : getLibraryItem(selectedBaseId)), [selectedBaseId]);
  const packageState = useMemo(() => (selectedBaseItem ? packageStates[selectedBaseId] ?? getDefaultPackageState(selectedBaseId) : {}), [packageStates, selectedBaseId, selectedBaseItem]);
  const selectedPackage = useMemo(() => (selectedBaseItem ? resolvePackageByItemId(selectedBaseId, packageState) : null), [packageState, selectedBaseId, selectedBaseItem]);
  const baseOverride = useMemo(() => baseOverrides[selectedBaseId] ?? {}, [baseOverrides, selectedBaseId]);
  const baseOffset = useMemo(() => baseOffsets[selectedBaseId] ?? { x: 0, y: 0 }, [baseOffsets, selectedBaseId]);
  const selectedPinOverrides = useMemo(() => pinOverrides[selectedBaseId] ?? {}, [pinOverrides, selectedBaseId]);
  const baseLayout = useMemo(() => getBaseLayout(selectedPackage, blankBoard, blankBase, baseOverride, baseOffset, selectedPinOverrides), [baseOffset, baseOverride, blankBase, blankBoard, selectedPackage, selectedPinOverrides]);
  const selectedShape = useMemo(() => (selectedLayer?.kind === "shape" ? shapeLayers.find((shape) => shape.id === selectedLayer.id) ?? null : null), [selectedLayer, shapeLayers]);
  const selectedChild = useMemo(() => (selectedLayer?.kind === "child" ? children.find((child) => child.id === selectedLayer.id) ?? null : null), [children, selectedLayer]);
  const selectedShapeDimensions = useMemo(
    () => (selectedShape ? persistentDimensions.filter((dimension) => dimension.shapeId === selectedShape.id) : []),
    [persistentDimensions, selectedShape],
  );
  const relationTargetOptions = useMemo(
    () => shapeLayers.filter((shape) => !selectedShape || shape.id !== selectedShape.id),
    [selectedShape, shapeLayers],
  );
  const selectedPin = useMemo(() => (selectedPinId ? baseLayout.previewPins.find((pin) => pin.id === selectedPinId) ?? null : null), [baseLayout.previewPins, selectedPinId]);
  const selectedPreset = useMemo(() => getBehaviorPreset(draft.presetId), [draft.presetId]);
  const compatibleTargets = useMemo(() => getCompatibleBehaviorTargets(draft.presetId), [draft.presetId]);
  const childAnchorOrigin = useMemo(() => getChildAnchorOrigin(baseLayout, hasBase), [baseLayout, hasBase]);
  const selectedChildPins = useMemo(() => (selectedChild ? getChildStagePins(childAnchorOrigin, selectedChild) : []), [childAnchorOrigin, selectedChild]);
  const selectedChildPin = useMemo(() => (selectedChildPinId ? selectedChildPins.find((pin) => pin.id === selectedChildPinId) ?? null : null), [selectedChildPinId, selectedChildPins]);
  const targetShape = useMemo(() => {
    if (selectedLayer?.kind === "shape" && selectedShape) {
      return shapeToPreviewShape(selectedShape);
    }
    if (selectedLayer?.kind === "child" && selectedChild) {
      const shape = getChildBodyShape(selectedChild);
      if (shape) {
        const anchor = getChildAnchorPosition(childAnchorOrigin, selectedChild);
        const resolved = getChildLayout(selectedChild);
        if (resolved) {
          const bodyCenter = {
            x: resolved.baseLayout.bodyRect.x + resolved.baseLayout.bodyRect.width / 2,
            y: resolved.baseLayout.bodyRect.y + resolved.baseLayout.bodyRect.height / 2,
          };
          return getTranslatedPreviewShape(shape, anchor.x - bodyCenter.x, anchor.y - bodyCenter.y);
        }
      }
    }
    const targetId = selectedLayer?.kind === "base" ? selectedLayer.id : draft.targetId;
    return getBuiltInShape((compatibleTargets.find((target) => target.id === targetId)?.id as BuiltInLayerId) ?? "body_primary", baseLayout, selectedPackage, baseOverride);
  }, [baseLayout, baseOverride, childAnchorOrigin, compatibleTargets, draft.targetId, selectedChild, selectedLayer, selectedPackage, selectedShape]);

  const snapCandidates = useMemo(() => {
    const candidates = hasBase && baseLayout.bodyRect.width > 0 && baseLayout.bodyRect.height > 0 ? [...getRectSnapPoints(baseLayout.bodyRect), ...baseLayout.previewPins] : [...baseLayout.previewPins];
    for (const child of children) {
      const childBodyRect = getChildStageBodyRect(childAnchorOrigin, child);
      if (childBodyRect) {
        candidates.push(...getRectSnapPoints(childBodyRect));
      }
      candidates.push(...getChildStagePins(childAnchorOrigin, child));
    }
    for (const shape of shapeLayers) {
      candidates.push(...getShapeSnapPoints(shape));
    }
    return candidates;
  }, [baseLayout, childAnchorOrigin, children, hasBase, shapeLayers]);

  const commitShapeLayerUpdate = useCallback((updater: (current: ShapeLayer[]) => ShapeLayer[]) => {
    setShapeLayers((current) => resolveShapeConstraints(updater(current)));
  }, [setShapeLayers]);

  const addPersistentDimension = useCallback((shapeId: string, kind: DimensionKind) => {
    setPersistentDimensions((current) => {
      if (current.some((dimension) => dimension.shapeId === shapeId && dimension.kind === kind)) {
        return current;
      }
      return [...current, { id: `${shapeId}_${kind}`, shapeId, kind }];
    });
  }, [setPersistentDimensions]);

  const updateSelectedShape = useCallback(
    (updater: (shape: ShapeLayer) => ShapeLayer) => {
      if (!selectedShape) {
        return;
      }
      commitShapeLayerUpdate((current) =>
        current.map((shape) => (shape.id === selectedShape.id ? updater(shape) : shape)),
      );
    },
    [commitShapeLayerUpdate, selectedShape],
  );

  const findEditableShapeAtPoint = (point: Point) => {
    const preferred =
      selectedLayer?.kind === "shape" &&
      selectedShape &&
      (selectedShape.kind === "line" || selectedShape.kind === "arc")
        ? selectedShape
        : null;

    if (preferred && getEditableShapeDistance(preferred, point) <= 14) {
      return preferred;
    }

    let best: ShapeLayer | null = null;
    let bestDistance = 14;
    for (const shape of shapeLayers) {
      if (shape.kind !== "line" && shape.kind !== "arc") {
        continue;
      }
      const nextDistance = getEditableShapeDistance(shape, point);
      if (nextDistance <= bestDistance) {
        bestDistance = nextDistance;
        best = shape;
      }
    }

    return best;
  };

  const getSnappedStagePoint = (event: ReactPointerEvent<SVGSVGElement>, excludePin?: { owner: "base" | "child"; childId?: string; pinId: string }) => {
    const point = getStagePoint(event, svgRef.current, viewport);
    if (!excludePin) {
      return getSnappedPoint(point, snapCandidates);
    }

    const candidates = [
      ...(hasBase && baseLayout.bodyRect.width > 0 && baseLayout.bodyRect.height > 0 ? getRectSnapPoints(baseLayout.bodyRect) : []),
      ...baseLayout.previewPins.filter((pin) => !(excludePin.owner === "base" && pin.id === excludePin.pinId)),
    ];
    for (const child of children) {
      const childBodyRect = getChildStageBodyRect(childAnchorOrigin, child);
      if (childBodyRect) {
        candidates.push(...getRectSnapPoints(childBodyRect));
      }
      candidates.push(
        ...getChildStagePins(childAnchorOrigin, child).filter(
          (pin) => !(excludePin.owner === "child" && excludePin.childId === child.id && pin.id === excludePin.pinId),
        ),
      );
    }
    for (const shape of shapeLayers) {
      candidates.push(...getShapeSnapPoints(shape));
    }
    return getSnappedPoint(point, candidates);
  };

  const resetViewport = () => setViewport({ x: 0, y: 0, zoom: 1 });

  const handleStageWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const cursor = getSvgViewPoint(event, svgRef.current);
    setViewport((current) => {
      const nextZoom = Math.max(0.35, Math.min(8, current.zoom * (event.deltaY < 0 ? 1.1 : 0.9)));
      const scale = nextZoom / current.zoom;
      return {
        zoom: nextZoom,
        x: cursor.x - (cursor.x - current.x) * scale,
        y: cursor.y - (cursor.y - current.y) * scale,
      };
    });
  };

  useEffect(() => {
    if (!stagePanelRef.current) {
      return;
    }
    const node = stagePanelRef.current;
    const handleNativeWheel = (event: WheelEvent) => event.preventDefault();
    node.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleNativeWheel);
  }, []);

  const baseOptions = useMemo(() => [
    { id: NO_BASE_ID, title: "Empty Canvas", variantLabel: "None", description: "No fixed base. Use the parts browser to place real components manually." },
  ], []);

  const childOptions = useMemo(() => {
    const lowered = childQuery.trim().toLowerCase();
    return LIBRARY_ITEMS.filter((item) => item.id !== selectedBaseId)
      .filter((item) => !lowered || item.title.toLowerCase().includes(lowered) || item.seriesLabel.toLowerCase().includes(lowered) || item.package.packageKey.toLowerCase().includes(lowered));
  }, [childQuery, selectedBaseId]);

  const stackItems: Array<{
    key: string;
    label: string;
    meta: string;
    active: boolean;
    onSelect: () => void;
    visibilityKey?: string;
  }> = [];

  if (hasBase) {
    stackItems.push(
      {
        key: "base:body_primary",
        label: "Body",
        meta: selectedPackage?.packageKey ?? "ROOT",
        active: selectedLayer?.kind === "base" && selectedLayer.id === "body_primary",
        onSelect: () => {
          setSelectedLayer({ kind: "base", id: "body_primary" });
          setSelectedPinId(null);
          setSelectedChildPinId(null);
        },
        visibilityKey: "base:body_primary",
      },
      {
        key: "base:pins_primary",
        label: "Pins / Pads",
        meta: `${baseLayout.previewPins.length} pins`,
        active: selectedLayer?.kind === "base" && selectedLayer.id === "pins_primary",
        onSelect: () => {
          setSelectedLayer({ kind: "base", id: "pins_primary" });
          setSelectedChildPinId(null);
        },
        visibilityKey: "base:pins_primary",
      },
      {
        key: "base:label_primary",
        label: "Marking",
        meta: "label",
        active: selectedLayer?.kind === "base" && selectedLayer.id === "label_primary",
        onSelect: () => {
          setSelectedLayer({ kind: "base", id: "label_primary" });
          setSelectedPinId(null);
          setSelectedChildPinId(null);
        },
        visibilityKey: "base:label_primary",
      },
    );
  }

  for (const child of children) {
    stackItems.push({
      key: `child:${child.id}`,
      label: child.title,
      meta: "part",
      active: selectedLayer?.kind === "child" && selectedLayer.id === child.id,
      onSelect: () => {
        setSelectedLayer({ kind: "child", id: child.id });
        setSelectedPinId(null);
        setSelectedChildPinId(null);
      },
    });
  }

  for (const shape of shapeLayers) {
    stackItems.push({
      key: `shape:${shape.id}`,
      label: shape.name,
      meta: `${shape.kind}${shape.construction ? " | construction" : ""}`,
      active: selectedLayer?.kind === "shape" && selectedLayer.id === shape.id,
      onSelect: () => {
        setSelectedLayer({ kind: "shape", id: shape.id });
        setSelectedPinId(null);
        setSelectedChildPinId(null);
      },
      visibilityKey: shape.id,
    });
  }

  const loadBaseSelection = (nextBaseId: string) => {
    const previousOrigin = getChildAnchorOrigin(baseLayout, hasBase);
    setSelectedBaseId(nextBaseId);
    setSelectedPinId(null);
    setSelectedChildPinId(null);
    setPendingChildItemId(null);
    setChildEditSession(null);

    if (nextBaseId === NO_BASE_ID) {
      setChildren((current) =>
        current.map((child) => {
          const absoluteAnchor = getChildAnchorPosition(previousOrigin, child);
          return {
            ...child,
            anchor: absoluteAnchor,
          };
        }),
      );
      setShapeLayers((current) => current.filter((shape) => !shape.id.startsWith("generated_")));
      setSelectedLayer(null);
      return;
    }

    if (nextBaseId === BLANK_BOARD_ID) {
      const nextLayout = getBaseLayout(null, blankBoard, true, baseOverrides[nextBaseId] ?? {}, baseOffsets[nextBaseId] ?? { x: 0, y: 0 }, {});
      const nextOrigin = getChildAnchorOrigin(nextLayout, true);
      setChildren((current) =>
        current.map((child) => {
          const absoluteAnchor = getChildAnchorPosition(previousOrigin, child);
          return {
            ...child,
            anchor: {
              x: absoluteAnchor.x - nextOrigin.x,
              y: absoluteAnchor.y - nextOrigin.y,
            },
          };
        }),
      );
      setShapeLayers((current) => current.filter((shape) => !shape.id.startsWith("generated_")));
      setSelectedLayer({ kind: "base", id: "body_primary" });
      return;
    }

    const nextPackageState = packageStates[nextBaseId] ?? getDefaultPackageState(nextBaseId);
    const nextPackage = resolvePackageByItemId(nextBaseId, nextPackageState);
    const nextOverride = baseOverrides[nextBaseId] ?? {};
    const nextOffset = baseOffsets[nextBaseId] ?? { x: 0, y: 0 };
    const nextPinOverrides = pinOverrides[nextBaseId] ?? {};
    const nextLayout = getBaseLayout(nextPackage, blankBoard, false, nextOverride, nextOffset, nextPinOverrides);
    const nextOrigin = getChildAnchorOrigin(nextLayout, true);

    setChildren((current) =>
      current.map((child) => {
        const absoluteAnchor = getChildAnchorPosition(previousOrigin, child);
        return {
          ...child,
          anchor: {
            x: absoluteAnchor.x - nextOrigin.x,
            y: absoluteAnchor.y - nextOrigin.y,
          },
        };
      }),
    );
    setShapeLayers((current) => [
      ...current.filter((shape) => !shape.id.startsWith("generated_")),
      ...createGeneratedComponentDetails(nextPackage, nextLayout),
    ]);
    setSelectedLayer({ kind: "base", id: "body_primary" });
  };

  const handleStagePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button === 1) {
      event.preventDefault();
      setPointerState({
        mode: "pan-viewport",
        origin: getSvgViewPoint(event, svgRef.current),
        initialViewport: viewport,
      });
      return;
    }

    const rawPoint = getStagePoint(event, svgRef.current, viewport);
    const point = getSnappedStagePoint(event);
    if (pendingChildItemId && shapeTool === "select") {
      const item = getLibraryItem(pendingChildItemId);
      if (item) {
        const anchor = hasBase
          ? { x: point.x - baseLayout.bodyRect.x, y: point.y - baseLayout.bodyRect.y }
          : point;
        const childId = `child_${children.length + 1}`;
        setChildren((current) => [
          ...current,
          {
            id: childId,
            itemId: item.id,
            title: item.title,
            anchor,
            packageState: getDefaultPackageState(item.id),
            override: {},
            pinOverrides: {},
          },
        ]);
        setSelectedLayer({ kind: "child", id: childId });
        setSelectedChildPinId(null);
        setPendingChildItemId(null);
        setActiveSnapPoint(point);
      }
      return;
    }
    if (shapeTool === "measure") {
      if (!measureStart || measureEnd) {
        setMeasureStart(point);
        setMeasureEnd(null);
      } else {
        setMeasureEnd(constrainMeasurePoint(measureStart, point, measureAxis));
      }
      setActiveSnapPoint(point);
      return;
    }
    if (shapeTool === "trim") {
      const target = findEditableShapeAtPoint(rawPoint);
      if (!target) {
        setSelectedLayer(null);
        setSelectedPinId(null);
        setSelectedChildPinId(null);
        setActiveSnapPoint(point);
        return;
      }
      const trimmed = tryTrimShape(target, rawPoint);
      if (!trimmed) {
        return;
      }
      commitShapeLayerUpdate((current) => current.map((shape) => (shape.id === target.id ? trimmed : shape)));
      setSelectedLayer({ kind: "shape", id: target.id });
      setSelectedPinId(null);
      setSelectedChildPinId(null);
      setActiveSnapPoint(null);
      return;
    }
    if (shapeTool === "split") {
      const target = findEditableShapeAtPoint(rawPoint);
      if (!target) {
        setSelectedLayer(null);
        setSelectedPinId(null);
        setSelectedChildPinId(null);
        setActiveSnapPoint(point);
        return;
      }
      const splitShapes = trySplitShape(target, rawPoint, nextShapeId(shapeLayers, target.kind));
      if (!splitShapes) {
        return;
      }
      commitShapeLayerUpdate((current) => [
        ...current.filter((shape) => shape.id !== target.id),
        ...splitShapes,
      ]);
      setSelectedLayer({ kind: "shape", id: splitShapes[1].id });
      setSelectedPinId(null);
      setSelectedChildPinId(null);
      setActiveSnapPoint(null);
      return;
    }
    if (shapeTool !== "select") {
      setSelectedLayer(null);
      setSelectedPinId(null);
      setSelectedChildPinId(null);
      setPointerState({ mode: "draw", tool: shapeTool, origin: point, current: point });
      setActiveSnapPoint(point);
      return;
    }
    setSelectedLayer(null);
    setSelectedPinId(null);
    setSelectedChildPinId(null);
    setActiveSnapPoint(point);
  };

  const handleStagePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point =
      pointerState?.mode === "move-pin"
        ? getSnappedStagePoint(event, { owner: pointerState.owner, childId: pointerState.childId, pinId: pointerState.pinId })
        : getSnappedStagePoint(event);
    setActiveSnapPoint(point);
    if (!pointerState) {
      return;
    }
    if (pointerState.mode === "draw") {
      setPointerState({ ...pointerState, current: point });
      return;
    }
    if (pointerState.mode === "move-shape") {
      const dx = point.x - pointerState.origin.x;
      const dy = point.y - pointerState.origin.y;
      commitShapeLayerUpdate((current) =>
        current.map((shape) => (shape.id === pointerState.shapeId ? moveShape(pointerState.initialShape, dx, dy, current) : shape)),
      );
      return;
    }
    if (pointerState.mode === "pan-viewport") {
      const currentViewPoint = getSvgViewPoint(event, svgRef.current);
      setViewport({
        ...pointerState.initialViewport,
        x: pointerState.initialViewport.x + (currentViewPoint.x - pointerState.origin.x),
        y: pointerState.initialViewport.y + (currentViewPoint.y - pointerState.origin.y),
      });
      setActiveSnapPoint(null);
      return;
    }
    if (pointerState.mode === "move-base") {
      const rawPoint = getStagePoint(event, svgRef.current, viewport);
      const dx = rawPoint.x - pointerState.origin.x;
      const dy = rawPoint.y - pointerState.origin.y;
      setBaseOffsets((current) => ({
        ...current,
        [selectedBaseId]: {
          x: pointerState.initialOffset.x + dx,
          y: pointerState.initialOffset.y + dy,
        },
      }));
      setActiveSnapPoint(null);
      return;
    }
    if (pointerState.mode === "move-child") {
      const rawPoint = getStagePoint(event, svgRef.current, viewport);
      const dx = rawPoint.x - pointerState.origin.x;
      const dy = rawPoint.y - pointerState.origin.y;
      setChildren((current) =>
        current.map((child) =>
          child.id === pointerState.childId
            ? {
                ...child,
                anchor: {
                  x: pointerState.initialAnchor.x + dx,
                  y: pointerState.initialAnchor.y + dy,
                },
              }
            : child,
        ),
      );
      setActiveSnapPoint(null);
      return;
    }
    if (pointerState.mode === "resize-shape") {
      commitShapeLayerUpdate((current) =>
        current.map((shape) =>
          shape.id === pointerState.shapeId ? resizeShape(pointerState.initialShape, pointerState.handle, point, current) : shape,
        ),
      );
      return;
    }
    if (pointerState.mode === "move-pin") {
      const dxUm = Math.round((point.x - pointerState.origin.x) * baseLayout.umPerUnit + (pointerState.initialOverride.dxUm ?? 0));
      const dyUm = Math.round((point.y - pointerState.origin.y) * baseLayout.umPerUnit + (pointerState.initialOverride.dyUm ?? 0));
      if (pointerState.owner === "base") {
        setPinOverrides((current) => ({
          ...current,
          [selectedBaseId]: {
            ...current[selectedBaseId],
            [pointerState.pinId]: {
              ...pointerState.initialOverride,
              dxUm,
              dyUm,
            },
          },
        }));
      } else if (pointerState.childId) {
        setChildren((current) =>
          current.map((child) =>
            child.id === pointerState.childId
              ? {
                  ...child,
                  pinOverrides: {
                    ...(child.pinOverrides ?? {}),
                    [pointerState.pinId]: {
                      ...pointerState.initialOverride,
                      dxUm,
                      dyUm,
                    },
                  },
                }
              : child,
          ),
        );
      }
      return;
    }
    if (pointerState.mode === "resize-base") {
      const nextRect =
        pointerState.handle === "east"
          ? normalizeRect({ x: pointerState.initialRect.x, y: pointerState.initialRect.y }, { x: point.x, y: pointerState.initialRect.y + pointerState.initialRect.height })
          : pointerState.handle === "south"
            ? normalizeRect({ x: pointerState.initialRect.x, y: pointerState.initialRect.y }, { x: pointerState.initialRect.x + pointerState.initialRect.width, y: point.y })
            : normalizeRect({ x: pointerState.initialRect.x, y: pointerState.initialRect.y }, point);
      if (selectedBaseItem == null) {
        setBlankBoard((current) => ({ ...current, widthUm: Math.max(4000, Math.round(nextRect.width * baseLayout.umPerUnit)), heightUm: Math.max(4000, Math.round(nextRect.height * baseLayout.umPerUnit)) }));
      } else {
        setBaseOverrides((current) => ({
          ...current,
          [selectedBaseId]: {
            ...current[selectedBaseId],
            widthUm: Math.max(3000, Math.round(nextRect.width * baseLayout.umPerUnit)),
            heightUm: Math.max(3000, Math.round(nextRect.height * baseLayout.umPerUnit)),
          },
        }));
      }
      if (selectedBaseItem != null && isResizableLibraryItem(selectedBaseId)) {
        setPackageStates((current) => ({
          ...current,
          [selectedBaseId]: resizePackageStateForHandle(selectedBaseId, pointerState.initialPackageState, pointerState.handle, Math.round(nextRect.width * baseLayout.umPerUnit), Math.round(nextRect.height * baseLayout.umPerUnit)),
        }));
      }
    }
  };

  const handleStagePointerUp = () => {
    if (pointerState?.mode === "draw") {
      const canCommit = hasMeaningfulDrawGesture(pointerState.tool, pointerState.origin, pointerState.current);
      const nextShape = canCommit
        ? createShapeFromTool(pointerState.tool, pointerState.origin, pointerState.current, nextShapeId(shapeLayers, pointerState.tool === "ellipse" ? "ellipse" : pointerState.tool))
        : null;
      if (nextShape) {
        commitShapeLayerUpdate((current) => [...current, nextShape]);
        setSelectedLayer({ kind: "shape", id: nextShape.id });
      }
    }
    setPointerState(null);
  };

  const draftShape = pointerState?.mode === "draw" ? createShapeFromTool(pointerState.tool, pointerState.origin, pointerState.current, "draft") : null;
  const bodyHidden = !hasBase || (hiddenLayers["base:body_primary"] ?? false);
  const pinsHidden = !hasBase || (hiddenLayers["base:pins_primary"] ?? false) || (!overlayState.pins && !(selectedLayer?.kind === "base" && selectedLayer.id === "pins_primary"));
  const labelHidden = !hasBase || (hiddenLayers["base:label_primary"] ?? false);
  const selectedBaseResizable = hasBase && selectedLayer?.kind === "base" && selectedLayer.id === "body_primary";
  const selectionLabel = selectedLayer == null ? "Nothing selected" : selectedLayer.kind === "shape" ? selectedShape?.name ?? "Shape" : selectedLayer.kind === "child" ? selectedChildPin ? `Pin ${selectedChildPin.label}` : selectedChild?.title ?? "Child Component" : selectedLayer.id === "body_primary" ? "Body" : selectedLayer.id === "pins_primary" ? selectedPin ? `Pin ${selectedPin.label}` : "Pins / Pads" : "Marking";
  const selectedChildPinOverride = selectedChild && selectedChildPinId ? selectedChild.pinOverrides?.[selectedChildPinId] ?? {} : {};
  const selectedShapeDimensionSummary = selectedShape ? getShapeDimensionSummary(selectedShape, baseLayout.umPerUnit) : null;
  const liveMeasureEnd = shapeTool === "measure" && measureStart && !measureEnd && activeSnapPoint ? constrainMeasurePoint(measureStart, activeSnapPoint, measureAxis) : null;
  const resolvedMeasureEnd = measureEnd ?? liveMeasureEnd;
  const measureSummary = measureStart && resolvedMeasureEnd ? getMeasureSummary(measureStart, resolvedMeasureEnd, baseLayout.umPerUnit) : null;
  const activeChildEditLayers = childEditSession ? shapeLayers.filter((shape) => childEditSession.layerIds.includes(shape.id)) : [];
  const activeChildEditLabel = childEditSession?.snapshot.title ?? "Child Component";

  const startChildEditSession = (child: ChildInstance) => {
    if (childEditSession) {
      return;
    }
    const anchor = getChildAnchorPosition(childAnchorOrigin, child);
    const editableLayers =
      child.customLayers && child.customLayers.length > 0
        ? child.customLayers.map((shape, index) =>
            translateShape(shape, anchor.x, anchor.y, `${child.id}_edit_${index + 1}`, shape.name),
          )
        : (() => {
            const resolved = getChildLayout(child);
            if (!resolved) {
              return [];
            }
            return createExplodedChildLayers(child, resolved.packageDef, resolved.baseLayout, anchor);
          })();

    if (editableLayers.length === 0) {
      return;
    }

    setShapeLayers((current) => [...current, ...editableLayers]);
    setChildren((current) => current.filter((entry) => entry.id !== child.id));
    setSelectedLayer({ kind: "shape", id: editableLayers[0].id });
    setSelectedPinId(null);
    setSelectedChildPinId(null);
    setChildEditSession({
      childId: child.id,
      snapshot: child,
      layerIds: editableLayers.map((shape) => shape.id),
      anchor,
    });
  };

  const cancelChildEditSession = () => {
    if (!childEditSession) {
      return;
    }
    setShapeLayers((current) => current.filter((shape) => !childEditSession.layerIds.includes(shape.id)));
    setChildren((current) => [...current, childEditSession.snapshot]);
    setSelectedLayer({ kind: "child", id: childEditSession.snapshot.id });
    setSelectedChildPinId(null);
    setChildEditSession(null);
  };

  const applyChildEditSession = () => {
    if (!childEditSession) {
      return;
    }
    const editedLayers = shapeLayers.filter((shape) => childEditSession.layerIds.includes(shape.id));
    const localizedLayers = editedLayers.map((shape) => localizeShape(shape, childEditSession.anchor));
    setChildren((current) => [
      ...current,
      {
        ...childEditSession.snapshot,
        customLayers: localizedLayers,
      },
    ]);
    setShapeLayers((current) => current.filter((shape) => !childEditSession.layerIds.includes(shape.id)));
    setSelectedLayer({ kind: "child", id: childEditSession.snapshot.id });
    setSelectedChildPinId(null);
    setChildEditSession(null);
  };

  return (
    <div className="creator-shell h-full min-h-0">
      <aside className="studio-rail">
        <div className="studio-rail-header border-b border-white px-3 py-3">
          <div className="studio-rail-head-inner flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="editor-eyebrow">Component Creator</p>
              <h2 className="mt-1.5 truncate font-sans text-[0.95rem] font-black uppercase tracking-[0.16em] text-white">Component Editor</h2>
            </div>
            {modeSwitch ? <div className="shrink-0">{modeSwitch}</div> : null}
          </div>
        </div>
        <div className="studio-rail-scroll px-3 py-3">
          <div className="studio-rail-body-inner space-y-3">
            <CreatorSection
              title="Component"
              count={selectedBaseId === NO_BASE_ID ? "none" : 1}
              open={leftSections.component}
              onToggle={() => setLeftSections((current) => ({ ...current, component: !current.component }))}
            >
              <div>
                <label className="editor-label">Component Name</label>
                <input value={componentName} onChange={(event) => setComponentName(event.target.value)} className="editor-input" />
              </div>
              <div className="space-y-1.5">
                {baseOptions.map((option) => (
                  <button key={option.id} type="button" onClick={() => loadBaseSelection(option.id)} className={`creator-list-row w-full ${selectedBaseId === option.id ? "creator-list-row-active" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em]">{option.title}</span>
                      <span className="creator-stack-meta">{option.variantLabel}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="studio-muted-note">Start empty, place real parts, then edit geometry directly.</div>
            </CreatorSection>

            <CreatorSection
              title="Library"
              count={pendingChildItemId ? "armed" : childOptions.length}
              open={leftSections.library}
              onToggle={() => setLeftSections((current) => ({ ...current, library: !current.library }))}
            >
              <div>
                <label className="editor-label">Search Parts</label>
                <input value={childQuery} onChange={(event) => setChildQuery(event.target.value)} className="editor-input" placeholder="Search reusable parts" />
              </div>
              <div className="max-h-[12rem] space-y-1.5 overflow-y-auto pr-1">
                {childOptions.slice(0, 18).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPendingChildItemId(item.id);
                      setShapeTool("select");
                    }}
                    className={`creator-list-row w-full ${pendingChildItemId === item.id ? "creator-list-row-active" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em]">{item.title}</span>
                      <span className="creator-stack-meta">{item.package.packageKey}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="studio-muted-note">Choose a part here, then click on the stage to place it.</div>
            </CreatorSection>

            <CreatorSection
              title="Stack"
              count={stackItems.length}
              open={leftSections.stack}
              onToggle={() => setLeftSections((current) => ({ ...current, stack: !current.stack }))}
            >
              {stackItems.map((item) => (
                <div key={item.key} className={`creator-list-row ${item.active ? "creator-list-row-active" : ""}`}>
                  <button type="button" onClick={item.onSelect} className="min-w-0 flex-1 text-left">
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em]">{item.label}</div>
                    <div className="creator-stack-meta">{item.meta}</div>
                  </button>
                  {item.visibilityKey ? (
                    <button type="button" onClick={() => setHiddenLayers((current) => ({ ...current, [item.visibilityKey!]: !current[item.visibilityKey!] }))} className="rounded-lg border border-current px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em]">
                      {hiddenLayers[item.visibilityKey] ? "Show" : "Hide"}
                    </button>
                  ) : null}
                </div>
              ))}
              {stackItems.length === 0 ? <div className="studio-muted-note">Draw directly or place a real part to start building the stack.</div> : null}
            </CreatorSection>
          </div>
        </div>
      </aside>

      <main className="creator-stage">
        <div className="creator-stage-panel">
          <div className="creator-stage-head">
            <div className="min-w-0">
              <p className="editor-eyebrow">SVG Component Editor</p>
              <h2 className="mt-1.5 truncate font-sans text-[1rem] font-black uppercase tracking-[0.16em] text-white">{componentName}</h2>
              <p className="mt-1.5 text-[10px] leading-4 text-aura-muted">Middle mouse pans. Wheel zooms. Place real parts, then reshape or explode them into editable layers.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="creator-preset-chip">{selectedBaseId === NO_BASE_ID ? "EMPTY" : selectedPackage?.packageKey ?? "BLANK-BOARD"}</span>
              {hasBase ? <span className="creator-preset-chip">{formatMm(baseLayout.bodyWidthUm)} x {formatMm(baseLayout.bodyHeightUm)}</span> : null}
            </div>
          </div>

          <div className="creator-stage-toolbar">
            {TOOL_GROUPS.map((group) => (
              <div key={group.title} className="creator-toolbar-group">
                {group.tools.map((toolId) => {
                  const tool = TOOL_OPTIONS.find((entry) => entry.id === toolId);
                  if (!tool) {
                    return null;
                  }
                  return (
                    <button key={tool.id} type="button" onClick={() => setShapeTool(tool.id)} className={`creator-choice-button ${shapeTool === tool.id ? "creator-choice-button-active" : ""}`}>
                      {tool.label}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="creator-toolbar-group">
              <button type="button" onClick={resetViewport} className="creator-choice-button">Reset View</button>
            </div>
          </div>

          {shapeTool === "measure" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(["free", "horizontal", "vertical"] as const).map((axis) => (
                <button
                  key={axis}
                  type="button"
                  onClick={() => setMeasureAxis(axis)}
                  className={`canvas-text-button ${measureAxis === axis ? "canvas-control-active" : ""}`}
                >
                  {axis === "free" ? "Free" : axis === "horizontal" ? "Hor" : "Ver"}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMeasureStart(null);
                  setMeasureEnd(null);
                }}
                className="canvas-text-button"
              >
                Clear
              </button>
              {measureSummary ? (
                <span className="canvas-status">
                  <span>DX {formatMm(Math.abs(measureSummary.dxUm))}</span>
                  <span>DY {formatMm(Math.abs(measureSummary.dyUm))}</span>
                  <span>D {formatMm(measureSummary.distanceUm)}</span>
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              { key: "pins", label: "Pins" },
              { key: "snaps", label: "Snap" },
              { key: "behavior", label: "Behavior" },
              { key: "dimensions", label: "Dims" },
            ].map((overlay) => (
              <button key={overlay.key} type="button" onClick={() => setOverlayState((current) => ({ ...current, [overlay.key]: !current[overlay.key as keyof typeof current] }))} className={`canvas-text-button ${overlayState[overlay.key as keyof typeof overlayState] ? "canvas-control-active" : ""}`}>{overlay.label}</button>
            ))}
          </div>

          <div ref={stagePanelRef} className="creator-preview-card">
            <svg ref={svgRef} viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`} className="h-full w-full" onPointerDown={handleStagePointerDown} onPointerMove={handleStagePointerMove} onPointerUp={handleStagePointerUp} onWheel={handleStageWheel}>
              <defs>
                <pattern id="creator-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                </pattern>
                <filter id="creator-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
                </filter>
              </defs>
              <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
              <rect width={STAGE_WIDTH} height={STAGE_HEIGHT} fill="url(#creator-grid)" />
              {!hasBase && shapeLayers.length === 0 ? (
                <g pointerEvents="none">
                  <rect x={STAGE_WIDTH / 2 - 140} y={STAGE_HEIGHT / 2 - 34} width={280} height={68} rx={14} fill="rgba(0,0,0,0.72)" stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
                  <text x={STAGE_WIDTH / 2} y={STAGE_HEIGHT / 2 - 6} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="12" letterSpacing="0.12em">
                    EMPTY CREATOR STAGE
                  </text>
                  <text x={STAGE_WIDTH / 2} y={STAGE_HEIGHT / 2 + 14} textAnchor="middle" fill="rgba(255,255,255,0.62)" fontFamily="IBM Plex Mono, monospace" fontSize="10">
                    Place a real part or draw directly to start editing.
                  </text>
                </g>
              ) : null}

              {hasBase ? renderBasePackage(selectedPackage, baseLayout, componentName, selectedLayer, bodyHidden, pinsHidden, labelHidden, baseOverride) : null}
              {children.map((child) => {
                const anchor = getChildAnchorPosition(childAnchorOrigin, child);
                const selected = selectedLayer?.kind === "child" && selectedLayer.id === child.id;
                const renderedLayers = getRenderedChildLayers(child, anchor);
                if (renderedLayers.length === 0) {
                  return null;
                }
                const renderedBounds = getUnionBounds(renderedLayers);

                return (
                  <g
                    key={child.id}
                    onPointerDown={(event) => {
                      if (shapeTool !== "select" || pendingChildItemId) {
                        return;
                      }
                      event.stopPropagation();
                      setSelectedLayer({ kind: "child", id: child.id });
                      setSelectedPinId(null);
                      setSelectedChildPinId(null);
                      setPointerState({ mode: "move-child", childId: child.id, origin: getStagePoint(event as unknown as ReactPointerEvent<SVGSVGElement>, svgRef.current, viewport), initialAnchor: child.anchor });
                    }}
                  >
                    {renderedLayers.map((shape) => (
                      <g key={shape.id}>{renderShapeLayer(shape, false, false)}</g>
                    ))}
                    {selected && renderedBounds
                      ? renderPreviewShape({ kind: "rect", x: renderedBounds.x, y: renderedBounds.y, width: renderedBounds.width, height: renderedBounds.height, rx: 10 }, "none", 1, "#ffffff", 2, "6 5")
                      : null}
                  </g>
                );
              })}
              {selectedLayer?.kind === "child" && selectedChild && shapeTool === "select" ? (
                <g>
                  {selectedChildPins.map((pin) => {
                    const selected = pin.id === selectedChildPinId;
                    return (
                      <g key={`child-pin-edit-${selectedChild.id}-${pin.id}`}>
                        <circle
                          cx={pin.x}
                          cy={pin.y}
                          r={selected ? 8.4 : 7.2}
                          fill={selected ? "#ffffff" : "rgba(255,255,255,0.9)"}
                          stroke="#000000"
                          strokeWidth={1.6}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setSelectedLayer({ kind: "child", id: selectedChild.id });
                            setSelectedPinId(null);
                            setSelectedChildPinId(pin.id);
                            setPointerState({
                              mode: "move-pin",
                              owner: "child",
                              childId: selectedChild.id,
                              pinId: pin.id,
                              origin: { x: pin.x, y: pin.y },
                              initialOverride: selectedChild.pinOverrides?.[pin.id] ?? {},
                            });
                          }}
                        />
                        <text
                          x={pin.x}
                          y={pin.y - 12}
                          textAnchor="middle"
                          fill={selected ? "#ffffff" : "rgba(255,255,255,0.72)"}
                          fontFamily="IBM Plex Mono, monospace"
                          fontSize="9"
                          letterSpacing="0.1em"
                          pointerEvents="none"
                        >
                          {pin.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              ) : null}
              {hasBase && shapeTool === "select" ? (
                <g>
                  {!bodyHidden ? (
                    <g
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedLayer({ kind: "base", id: "body_primary" });
                        setSelectedPinId(null);
                        setSelectedChildPinId(null);
                        setPointerState({
                          mode: "move-base",
                          origin: getStagePoint(event as unknown as ReactPointerEvent<SVGSVGElement>, svgRef.current, viewport),
                          initialOffset: baseOffset,
                        });
                      }}
                    >
                      {renderPreviewShape(getBodyPreviewShape(selectedPackage, baseLayout, baseOverride), "transparent", 1)}
                    </g>
                  ) : null}
                  {!pinsHidden
                    ? baseLayout.previewPins.map((pin) => (
                        <circle
                          key={`select-pin-${pin.id}`}
                          cx={pin.x}
                          cy={pin.y}
                          r={11}
                          fill="transparent"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setSelectedLayer({ kind: "base", id: "pins_primary" });
                            setSelectedPinId(pin.id);
                            setSelectedChildPinId(null);
                          }}
                        />
                      ))
                    : null}
                  {!labelHidden ? (
                    <rect
                      x={baseLayout.bodyRect.x + baseLayout.bodyRect.width * 0.12}
                      y={baseLayout.bodyRect.y + baseLayout.bodyRect.height + 10}
                      width={baseLayout.bodyRect.width * 0.76}
                      height={36}
                      fill="transparent"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedLayer({ kind: "base", id: "label_primary" });
                        setSelectedPinId(null);
                        setSelectedChildPinId(null);
                      }}
                    />
                  ) : null}
                </g>
              ) : null}
              {shapeLayers.map((shape) => (
                <g key={shape.id} onPointerDown={(event) => { if (shapeTool !== "select") return; event.stopPropagation(); setSelectedLayer({ kind: "shape", id: shape.id }); setSelectedPinId(null); setSelectedChildPinId(null); setPointerState({ mode: "move-shape", shapeId: shape.id, origin: getStagePoint(event as unknown as ReactPointerEvent<SVGSVGElement>, svgRef.current, viewport), initialShape: shape }); }}>
                  {renderShapeLayer(shape, selectedLayer?.kind === "shape" && selectedLayer.id === shape.id, hiddenLayers[shape.id] ?? false)}
                </g>
              ))}
              {draftShape ? renderShapeLayer(draftShape, true, false) : null}
              {pendingChildItemId && activeSnapPoint ? (() => {
                const item = getLibraryItem(pendingChildItemId);
                if (!item) {
                  return null;
                }
                const previewChild: ChildInstance = {
                  id: "__preview__",
                  itemId: item.id,
                  title: item.title,
                  anchor: activeSnapPoint,
                  packageState: getDefaultPackageState(item.id),
                };
                const previewLayers = getRenderedChildLayers(previewChild, activeSnapPoint);
                return (
                  <g opacity={0.58} pointerEvents="none">
                    {previewLayers.map((shape) => (
                      <g key={shape.id}>{renderShapeLayer(shape, false, false)}</g>
                    ))}
                  </g>
                );
              })() : null}
              {overlayState.behavior ? renderBehaviorPreview(draft, targetShape) : null}
              {selectedLayer ? <g pointerEvents="none">{renderPreviewShape(selectedLayer.kind === "shape" && selectedShape ? shapeToPreviewShape(selectedShape) : getBuiltInShape(selectedLayer.id as BuiltInLayerId, baseLayout, selectedPackage, baseOverride), "none", 1, "#ffffff", 2, "6 5")}</g> : null}
              {overlayState.dimensions
                ? persistentDimensions.map((dimension, index) => {
                    const shape = shapeLayers.find((candidate) => candidate.id === dimension.shapeId);
                    return shape ? renderPersistentDimension(dimension, shape, baseLayout.umPerUnit, index) : null;
                  })
                : null}
              {overlayState.dimensions ? renderDimensionGuides(selectedLayer, selectedShape, baseLayout) : null}
              {overlayState.snaps ? <g pointerEvents="none">{snapCandidates.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={2.8} fill="#ffffff" opacity={0.35} />)}</g> : null}
              {measureStart && resolvedMeasureEnd ? (
                <g pointerEvents="none">
                  <line x1={measureStart.x} y1={measureStart.y} x2={resolvedMeasureEnd.x} y2={resolvedMeasureEnd.y} stroke="#ffffff" strokeWidth={2} strokeDasharray="8 5" />
                  <circle cx={measureStart.x} cy={measureStart.y} r={5.5} fill="#000000" stroke="#ffffff" strokeWidth={1.6} />
                  <circle cx={resolvedMeasureEnd.x} cy={resolvedMeasureEnd.y} r={5.5} fill="#000000" stroke="#ffffff" strokeWidth={1.6} />
                  {measureSummary ? (
                    <>
                      <rect
                        x={(measureStart.x + resolvedMeasureEnd.x) / 2 - 54}
                        y={(measureStart.y + resolvedMeasureEnd.y) / 2 - 26}
                        width={108}
                        height={36}
                        rx={10}
                        fill="#000000"
                        stroke="#5e5e5e"
                        strokeWidth={1}
                      />
                      <text x={(measureStart.x + resolvedMeasureEnd.x) / 2} y={(measureStart.y + resolvedMeasureEnd.y) / 2 - 8} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">
                        DX {formatMm(Math.abs(measureSummary.dxUm))}
                      </text>
                      <text x={(measureStart.x + resolvedMeasureEnd.x) / 2} y={(measureStart.y + resolvedMeasureEnd.y) / 2 + 6} textAnchor="middle" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="10">
                        DY {formatMm(Math.abs(measureSummary.dyUm))} | D {formatMm(measureSummary.distanceUm)}
                      </text>
                    </>
                  ) : null}
                </g>
              ) : null}
              {selectedLayer?.kind === "shape" && selectedShape && shapeTool === "select" ? getShapeResizeHandles(selectedShape).map((handle) => <circle key={handle.id} cx={handle.x} cy={handle.y} r={5.6} fill="#ffffff" stroke="#000000" strokeWidth={1.6} onPointerDown={(event) => { event.stopPropagation(); setPointerState({ mode: "resize-shape", shapeId: selectedShape.id, handle: handle.id, initialShape: selectedShape }); }} />) : null}
              {selectedLayer?.kind === "base" && selectedLayer.id === "pins_primary" && shapeTool === "select" && !pinsHidden ? (
                <g>
                  {baseLayout.previewPins.map((pin) => {
                    const selected = pin.id === selectedPinId;
                    return (
                      <g key={`pin-edit-${pin.id}`}>
                        <circle
                          cx={pin.x}
                          cy={pin.y}
                          r={selected ? 8.4 : 7.2}
                          fill={selected ? "#ffffff" : "rgba(255,255,255,0.9)"}
                          stroke="#000000"
                          strokeWidth={1.6}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setSelectedLayer({ kind: "base", id: "pins_primary" });
                            setSelectedPinId(pin.id);
                            setSelectedChildPinId(null);
                            setPointerState({
                              mode: "move-pin",
                              owner: "base",
                              pinId: pin.id,
                              origin: { x: pin.x, y: pin.y },
                              initialOverride: selectedPinOverrides[pin.id] ?? {},
                            });
                          }}
                        />
                        <text
                          x={pin.x}
                          y={pin.y - 12}
                          textAnchor="middle"
                          fill={selected ? "#ffffff" : "rgba(255,255,255,0.72)"}
                          fontFamily="IBM Plex Mono, monospace"
                          fontSize="9"
                          letterSpacing="0.1em"
                          pointerEvents="none"
                        >
                          {pin.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              ) : null}
              {selectedBaseResizable && shapeTool === "select" ? [
                { id: "east" as const, x: baseLayout.bodyRect.x + baseLayout.bodyRect.width, y: baseLayout.bodyRect.y + baseLayout.bodyRect.height / 2 },
                { id: "south" as const, x: baseLayout.bodyRect.x + baseLayout.bodyRect.width / 2, y: baseLayout.bodyRect.y + baseLayout.bodyRect.height },
                { id: "corner" as const, x: baseLayout.bodyRect.x + baseLayout.bodyRect.width, y: baseLayout.bodyRect.y + baseLayout.bodyRect.height },
              ].map((handle) => <circle key={handle.id} cx={handle.x} cy={handle.y} r={5.6} fill="#ffffff" stroke="#000000" strokeWidth={1.6} onPointerDown={(event) => { event.stopPropagation(); setSelectedPinId(null); setPointerState({ mode: "resize-base", handle: handle.id, initialRect: baseLayout.bodyRect, initialBlankBoard: blankBoard, initialPackageState: packageState }); }} />) : null}
              {activeSnapPoint ? (
                <g pointerEvents="none">
                  <line x1={activeSnapPoint.x} y1={0} x2={activeSnapPoint.x} y2={STAGE_HEIGHT} stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="7 6" />
                  <line x1={0} y1={activeSnapPoint.y} x2={STAGE_WIDTH} y2={activeSnapPoint.y} stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="7 6" />
                  <circle cx={activeSnapPoint.x} cy={activeSnapPoint.y} r={7.2} fill="none" stroke="#ffffff" strokeWidth={1.4} />
                  <circle cx={activeSnapPoint.x} cy={activeSnapPoint.y} r={2.2} fill="#ffffff" />
                </g>
              ) : null}
              </g>
            </svg>
          </div>
        </div>
      </main>

      <aside className="studio-rail">
        <div className="studio-rail-header border-b border-white px-3 py-3">
          <div className="studio-rail-head-inner flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="editor-eyebrow">Inspector</p>
              <h2 className="mt-1.5 truncate font-sans text-[0.95rem] font-black uppercase tracking-[0.16em] text-white">{selectionLabel}</h2>
            </div>
            <span className="studio-pill">{selectedLayer?.kind ?? "none"}</span>
          </div>
        </div>
        <div className="studio-rail-scroll px-3 py-3">
          <div className="studio-rail-body-inner space-y-3">
            <CreatorSection
              title="Selection"
              count={selectedLayer?.kind ?? "none"}
              open={rightSections.selection}
              onToggle={() => setRightSections((current) => ({ ...current, selection: !current.selection }))}
            >
              {childEditSession ? (
                <div className="rounded-xl border border-white bg-black px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="editor-label !mb-1">Child Edit Session</div>
                      <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-white">{activeChildEditLabel}</div>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400">{activeChildEditLayers.length} layers</div>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-neutral-400">Editing this child as real sketch layers. Apply to save it back into the grouped child, or cancel to restore the original instance.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={applyChildEditSession} className="editor-action-button">
                      Apply Child Edit
                    </button>
                    <button type="button" onClick={cancelChildEditSession} className="editor-action-button">
                      Cancel Child Edit
                    </button>
                  </div>
                </div>
              ) : null}
              {selectedLayer?.kind === "base" && selectedLayer.id === "body_primary" ? (
                <>
                  <div className="studio-stat-grid">
                    <div className="studio-stat-card"><div className="editor-label !mb-1">Width</div><div className="font-mono text-[12px] text-white">{formatMm(baseLayout.bodyWidthUm)}</div></div>
                    <div className="studio-stat-card"><div className="editor-label !mb-1">Height</div><div className="font-mono text-[12px] text-white">{formatMm(baseLayout.bodyHeightUm)}</div></div>
                  </div>
                  <div className="studio-stat-grid">
                    <div>
                      <label className="editor-label">Body Width</label>
                      <input
                        type="number"
                        value={Number((baseLayout.bodyWidthUm / 1000).toFixed(2))}
                        onChange={(event) =>
                          selectedBaseItem == null
                            ? setBlankBoard((current) => ({ ...current, widthUm: Math.max(3000, Math.round(Number(event.target.value) * 1000)) }))
                            : setBaseOverrides((current) => ({
                                ...current,
                                [selectedBaseId]: { ...current[selectedBaseId], widthUm: Math.max(3000, Math.round(Number(event.target.value) * 1000)) },
                              }))
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Body Height</label>
                      <input
                        type="number"
                        value={Number((baseLayout.bodyHeightUm / 1000).toFixed(2))}
                        onChange={(event) =>
                          selectedBaseItem == null
                            ? setBlankBoard((current) => ({ ...current, heightUm: Math.max(3000, Math.round(Number(event.target.value) * 1000)) }))
                            : setBaseOverrides((current) => ({
                                ...current,
                                [selectedBaseId]: { ...current[selectedBaseId], heightUm: Math.max(3000, Math.round(Number(event.target.value) * 1000)) },
                              }))
                        }
                        className="editor-input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="editor-label">Body Form</label>
                    <div className="creator-choice-grid creator-choice-grid-tight">
                      {(["package", "rect", "capsule", "circle"] as const).map((form) => (
                        <button
                          key={form}
                          type="button"
                          onClick={() =>
                            setBaseOverrides((current) => ({
                              ...current,
                              [selectedBaseId]: { ...current[selectedBaseId], form },
                            }))
                          }
                          className={`creator-choice-button ${(baseOverride.form ?? "package") === form ? "creator-choice-button-active" : ""}`}
                        >
                          {form}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="studio-stat-grid">
                    <div>
                      <label className="editor-label">Fill</label>
                      <input
                        type="color"
                        value={baseOverride.fill ?? (selectedBaseItem ? "#d4d4d4" : "#141414")}
                        onChange={(event) =>
                          setBaseOverrides((current) => ({
                            ...current,
                            [selectedBaseId]: { ...current[selectedBaseId], fill: event.target.value },
                          }))
                        }
                        className="editor-color-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Stroke</label>
                      <input
                        type="color"
                        value={baseOverride.stroke ?? "#111111"}
                        onChange={(event) =>
                          setBaseOverrides((current) => ({
                            ...current,
                            [selectedBaseId]: { ...current[selectedBaseId], stroke: event.target.value },
                          }))
                        }
                        className="editor-color-input"
                      />
                    </div>
                  </div>
                  {selectedBaseItem == null ? (
                    <div>
                      <label className="editor-label">Corner Radius</label>
                      <input
                        type="range"
                        min="0"
                        max="6000"
                        step="50"
                        value={baseOverride.cornerUm ?? blankBoard.cornerUm}
                        onChange={(event) =>
                          setBlankBoard((current) => ({ ...current, cornerUm: Number(event.target.value) }))
                        }
                        className="editor-slider"
                      />
                    </div>
                  ) : null}
                  {selectedBaseItem != null && isResizableLibraryItem(selectedBaseId) ? (
                    <div><label className="editor-label">Pin Count</label><input type="number" value={packageState.pinCount ?? selectedPackage?.pins.length ?? 0} onChange={(event) => setPackageStates((current) => ({ ...current, [selectedBaseId]: { ...packageState, pinCount: Number(event.target.value) } }))} className="editor-input" /></div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={resetViewport} className="editor-action-button">Reset View</button>
                    {selectedPackage ? (
                      <button
                        type="button"
                        onClick={() => {
                          const editableLayers = createEditableBaseLayers(selectedPackage, baseLayout, componentName, baseOverride);
                          if (editableLayers.length === 0) {
                            return;
                          }
                          setShapeLayers((current) => [...current.filter((shape) => !shape.id.startsWith("base_edit_")), ...editableLayers]);
                          setSelectedBaseId(NO_BASE_ID);
                          setSelectedLayer({ kind: "shape", id: editableLayers[0].id });
                          setSelectedPinId(null);
                          setSelectedChildPinId(null);
                        }}
                        className="editor-action-button"
                      >
                        Make Editable
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
              {selectedLayer?.kind === "base" && selectedLayer.id === "pins_primary" ? (
                <>
                  <div className="studio-stat-grid">
                    <div className="studio-stat-card"><div className="editor-label !mb-1">Pins</div><div className="font-mono text-[12px] text-white">{baseLayout.previewPins.length}</div></div>
                    <div className="studio-stat-card"><div className="editor-label !mb-1">Selected</div><div className="font-mono text-[12px] text-white">{selectedPin?.label ?? "None"}</div></div>
                  </div>
                  <div className="rounded-xl border border-white/12 px-3 py-3 text-[11px] leading-5 text-aura-muted">
                    Drag pin handles on the stage to reposition them, or edit labels and offsets here for exact package cleanup.
                  </div>
                  <div className="space-y-2">
                    {baseLayout.previewPins.map((pin) => {
                      const override = selectedPinOverrides[pin.id] ?? {};
                      const selected = selectedPinId === pin.id;
                      return (
                        <div
                          key={pin.id}
                          className={`rounded-xl border px-3 py-3 ${selected ? "border-white bg-white text-black" : "border-white/16 bg-black text-white"}`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedPinId(pin.id)}
                            className="mb-3 flex w-full items-center justify-between gap-3 text-left"
                          >
                            <span className="font-mono text-[11px] uppercase tracking-[0.12em]">{pin.id}</span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
                              {(pin.x * baseLayout.umPerUnit / 1000).toFixed(1)} / {(pin.y * baseLayout.umPerUnit / 1000).toFixed(1)} mm
                            </span>
                          </button>
                          <div className="space-y-2">
                            <div>
                              <label className="editor-label">Label</label>
                              <input
                                value={override.label ?? pin.label}
                                onChange={(event) =>
                                  setPinOverrides((current) => ({
                                    ...current,
                                    [selectedBaseId]: {
                                      ...current[selectedBaseId],
                                      [pin.id]: {
                                        ...current[selectedBaseId]?.[pin.id],
                                        label: event.target.value,
                                      },
                                    },
                                  }))
                                }
                                className="editor-input"
                              />
                            </div>
                            <div className="studio-stat-grid">
                              <div>
                                <label className="editor-label">Offset X</label>
                                <input
                                  type="number"
                                  value={Number(((override.dxUm ?? 0) / 1000).toFixed(2))}
                                  onChange={(event) =>
                                    setPinOverrides((current) => ({
                                      ...current,
                                      [selectedBaseId]: {
                                        ...current[selectedBaseId],
                                        [pin.id]: {
                                          ...current[selectedBaseId]?.[pin.id],
                                          dxUm: Math.round(Number(event.target.value) * 1000),
                                        },
                                      },
                                    }))
                                  }
                                  className="editor-input"
                                />
                              </div>
                              <div>
                                <label className="editor-label">Offset Y</label>
                                <input
                                  type="number"
                                  value={Number(((override.dyUm ?? 0) / 1000).toFixed(2))}
                                  onChange={(event) =>
                                    setPinOverrides((current) => ({
                                      ...current,
                                      [selectedBaseId]: {
                                        ...current[selectedBaseId],
                                        [pin.id]: {
                                          ...current[selectedBaseId]?.[pin.id],
                                          dyUm: Math.round(Number(event.target.value) * 1000),
                                        },
                                      },
                                    }))
                                  }
                                  className="editor-input"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setPinOverrides((current) => ({
                                  ...current,
                                  [selectedBaseId]: {
                                    ...current[selectedBaseId],
                                    [pin.id]: {},
                                  },
                                }))
                              }
                              className="editor-action-button"
                            >
                              Reset Pin
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPinOverrides((current) => ({
                        ...current,
                        [selectedBaseId]: {},
                      }))
                    }
                    className="editor-action-button"
                  >
                    Reset All Pins
                  </button>
                </>
              ) : null}
              {selectedLayer?.kind === "base" && selectedLayer.id === "label_primary" ? <div><label className="editor-label">Shown Label</label><input value={componentName} onChange={(event) => setComponentName(event.target.value)} className="editor-input" /></div> : null}
              {selectedLayer?.kind === "child" && selectedChild ? (
                <>
                  <div className="studio-stat-grid">
                    <div className="studio-stat-card"><div className="editor-label !mb-1">X</div><div className="font-mono text-[12px] text-white">{selectedChild.anchor.x.toFixed(1)}</div></div>
                    <div className="studio-stat-card"><div className="editor-label !mb-1">Y</div><div className="font-mono text-[12px] text-white">{selectedChild.anchor.y.toFixed(1)}</div></div>
                  </div>
                  <div className="studio-stat-grid">
                    <div>
                      <label className="editor-label">Child X</label>
                      <input
                        type="number"
                        value={Number(selectedChild.anchor.x.toFixed(1))}
                        onChange={(event) =>
                          setChildren((current) =>
                            current.map((child) =>
                              child.id === selectedChild.id
                                ? { ...child, anchor: { ...child.anchor, x: Number(event.target.value) } }
                                : child,
                            ),
                          )
                        }
                        className="editor-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Child Y</label>
                      <input
                        type="number"
                        value={Number(selectedChild.anchor.y.toFixed(1))}
                        onChange={(event) =>
                          setChildren((current) =>
                            current.map((child) =>
                              child.id === selectedChild.id
                                ? { ...child, anchor: { ...child.anchor, y: Number(event.target.value) } }
                                : child,
                            ),
                          )
                        }
                        className="editor-input"
                      />
                    </div>
                  </div>
                  {isResizableLibraryItem(selectedChild.itemId) ? (
                    <div>
                      <label className="editor-label">Pin Count</label>
                      <input
                        type="number"
                        value={selectedChild.packageState.pinCount ?? getDefaultPackageState(selectedChild.itemId).pinCount ?? 0}
                        onChange={(event) =>
                          setChildren((current) =>
                            current.map((child) =>
                              child.id === selectedChild.id
                                ? {
                                    ...child,
                                    packageState: {
                                      ...child.packageState,
                                      pinCount: Number(event.target.value),
                                    },
                                  }
                                : child,
                            ),
                          )
                        }
                        className="editor-input"
                      />
                    </div>
                  ) : null}
                  <div className="studio-stat-grid">
                    <div>
                      <label className="editor-label">Fill</label>
                      <input
                        type="color"
                        value={selectedChild.override?.fill ?? "#d4d4d4"}
                        onChange={(event) =>
                          setChildren((current) =>
                            current.map((child) =>
                              child.id === selectedChild.id
                                ? { ...child, override: { ...child.override, fill: event.target.value } }
                                : child,
                            ),
                          )
                        }
                        className="editor-color-input"
                      />
                    </div>
                    <div>
                      <label className="editor-label">Stroke</label>
                      <input
                        type="color"
                        value={selectedChild.override?.stroke ?? "#111111"}
                        onChange={(event) =>
                          setChildren((current) =>
                            current.map((child) =>
                              child.id === selectedChild.id
                                ? { ...child, override: { ...child.override, stroke: event.target.value } }
                                : child,
                            ),
                          )
                        }
                        className="editor-color-input"
                      />
                    </div>
                  </div>
                  {selectedChildPins.length > 0 ? (
                    <>
                      <div className="studio-stat-grid">
                        <div className="studio-stat-card"><div className="editor-label !mb-1">Pins</div><div className="font-mono text-[12px] text-white">{selectedChildPins.length}</div></div>
                        <div className="studio-stat-card"><div className="editor-label !mb-1">Selected</div><div className="font-mono text-[12px] text-white">{selectedChildPin?.label ?? "None"}</div></div>
                      </div>
                      <div className="max-h-[12rem] space-y-2 overflow-y-auto pr-1">
                        {selectedChildPins.map((pin) => {
                          const selected = selectedChildPinId === pin.id;
                          const override = selectedChild.pinOverrides?.[pin.id] ?? {};
                          return (
                            <button
                              key={`child-inspector-pin-${pin.id}`}
                              type="button"
                              onClick={() => {
                                setSelectedLayer({ kind: "child", id: selectedChild.id });
                                setSelectedPinId(null);
                                setSelectedChildPinId(pin.id);
                              }}
                              className={`w-full rounded-xl border px-3 py-2 text-left transition ${selected ? "border-white bg-white text-black" : "border-white bg-black text-white"}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-mono text-[11px] uppercase tracking-[0.12em]">{pin.label}</span>
                                <span className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">{formatMm(override.dxUm ?? 0)} / {formatMm(override.dyUm ?? 0)}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {selectedChildPin ? (
                        <>
                          <div className="studio-stat-grid">
                            <div>
                              <label className="editor-label">Pin Label</label>
                              <input
                                value={selectedChildPinOverride.label ?? selectedChildPin.label}
                                onChange={(event) =>
                                  setChildren((current) =>
                                    current.map((child) =>
                                      child.id === selectedChild.id
                                        ? {
                                            ...child,
                                            pinOverrides: {
                                              ...(child.pinOverrides ?? {}),
                                              [selectedChildPin.id]: {
                                                ...(child.pinOverrides?.[selectedChildPin.id] ?? {}),
                                                label: event.target.value,
                                              },
                                            },
                                          }
                                        : child,
                                    ),
                                  )
                                }
                                className="editor-input"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setChildren((current) =>
                                    current.map((child) =>
                                      child.id === selectedChild.id
                                        ? {
                                            ...child,
                                            pinOverrides: {
                                              ...(child.pinOverrides ?? {}),
                                              [selectedChildPin.id]: {},
                                            },
                                          }
                                        : child,
                                    ),
                                  )
                                }
                                className="editor-action-button w-full"
                              >
                                Reset Pin
                              </button>
                            </div>
                          </div>
                          <div className="studio-stat-grid">
                            <div>
                              <label className="editor-label">Pin X</label>
                              <input
                                type="number"
                                value={Number(((selectedChildPinOverride.dxUm ?? 0) / 1000).toFixed(2))}
                                onChange={(event) =>
                                  setChildren((current) =>
                                    current.map((child) =>
                                      child.id === selectedChild.id
                                        ? {
                                            ...child,
                                            pinOverrides: {
                                              ...(child.pinOverrides ?? {}),
                                              [selectedChildPin.id]: {
                                                ...(child.pinOverrides?.[selectedChildPin.id] ?? {}),
                                                dxUm: Math.round(Number(event.target.value) * 1000),
                                              },
                                            },
                                          }
                                        : child,
                                    ),
                                  )
                                }
                                className="editor-input"
                              />
                            </div>
                            <div>
                              <label className="editor-label">Pin Y</label>
                              <input
                                type="number"
                                value={Number(((selectedChildPinOverride.dyUm ?? 0) / 1000).toFixed(2))}
                                onChange={(event) =>
                                  setChildren((current) =>
                                    current.map((child) =>
                                      child.id === selectedChild.id
                                        ? {
                                            ...child,
                                            pinOverrides: {
                                              ...(child.pinOverrides ?? {}),
                                              [selectedChildPin.id]: {
                                                ...(child.pinOverrides?.[selectedChildPin.id] ?? {}),
                                                dyUm: Math.round(Number(event.target.value) * 1000),
                                              },
                                            },
                                          }
                                        : child,
                                    ),
                                  )
                                }
                                className="editor-input"
                              />
                            </div>
                          </div>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          setChildren((current) =>
                            current.map((child) =>
                              child.id === selectedChild.id
                                ? {
                                    ...child,
                                    pinOverrides: {},
                                  }
                                : child,
                            ),
                          )
                        }
                        className="editor-action-button"
                      >
                        Reset All Child Pins
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startChildEditSession(selectedChild)}
                    className="editor-action-button"
                  >
                    Edit Child In Place
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setChildren((current) => reorderById(current, selectedChild.id, "front"))} className="editor-action-button">Bring Front</button>
                    <button type="button" onClick={() => setChildren((current) => reorderById(current, selectedChild.id, "forward"))} className="editor-action-button">Forward</button>
                    <button type="button" onClick={() => setChildren((current) => reorderById(current, selectedChild.id, "backward"))} className="editor-action-button">Backward</button>
                    <button type="button" onClick={() => setChildren((current) => reorderById(current, selectedChild.id, "back"))} className="editor-action-button">Send Back</button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const resolved = getChildLayout(selectedChild);
                      if (!resolved) {
                        return;
                      }
                      const anchor = getChildAnchorPosition(childAnchorOrigin, selectedChild);
                      const exploded = createExplodedChildLayers(selectedChild, resolved.packageDef, resolved.baseLayout, anchor);
                      if (exploded.length === 0) {
                        return;
                      }
                      setShapeLayers((current) => [...current, ...exploded]);
                      setChildren((current) => current.filter((child) => child.id !== selectedChild.id));
                      setSelectedLayer({ kind: "shape", id: exploded[0].id });
                      setSelectedPinId(null);
                      setSelectedChildPinId(null);
                    }}
                    className="editor-action-button"
                  >
                    Explode To Independent Layers
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChildren((current) => current.filter((child) => child.id !== selectedChild.id));
                      setSelectedLayer(hasBase ? { kind: "base", id: "body_primary" } : null);
                      setSelectedChildPinId(null);
                    }}
                    className="editor-action-button"
                  >
                    Delete Child
                  </button>
                </>
              ) : null}
              {selectedLayer?.kind === "shape" && selectedShape ? (
                <>
                  <div><label className="editor-label">Layer Name</label><input value={selectedShape.name} onChange={(event) => updateSelectedShape((shape) => ({ ...shape, name: event.target.value }))} className="editor-input" /></div>
                  {selectedShapeDimensionSummary ? (
                    <div className="studio-stat-card space-y-3">
                      <div className="editor-label !mb-1">Dimensions</div>
                      <div className="font-mono text-[12px] text-white">{selectedShapeDimensionSummary.primary}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-aura-muted">{selectedShapeDimensionSummary.secondary}</div>
                      <div className="flex flex-wrap gap-2">
                        {(selectedShape.kind === "line" ? (["length", "dx", "dy"] as const) : (["width", "height"] as const)).map((kind) => {
                          const exists = selectedShapeDimensions.some((dimension) => dimension.kind === kind);
                          return (
                            <button
                              key={kind}
                              type="button"
                              onClick={() => addPersistentDimension(selectedShape.id, kind)}
                              className={`editor-action-button ${exists ? "canvas-control-active" : ""}`}
                            >
                              {exists ? `${kind} saved` : `Save ${kind}`}
                            </button>
                          );
                        })}
                      </div>
                      {selectedShapeDimensions.length > 0 ? (
                        <div className="space-y-2">
                          <div className="editor-label !mb-1">Saved Guides</div>
                          {selectedShapeDimensions.map((dimension) => (
                            <div key={dimension.id} className="flex items-center justify-between rounded-lg border border-white/10 px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-aura-muted">
                              <span>{dimension.kind}</span>
                              <button
                                type="button"
                                onClick={() => setPersistentDimensions((current) => current.filter((item) => item.id !== dimension.id))}
                                className="canvas-text-button"
                              >
                                remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {selectedShape.kind === "line" ? (
                    <div className="studio-stat-grid">
                      <div>
                        <label className="editor-label">Start X</label>
                        <input
                          type="number"
                          value={Number(((selectedShape.x1 * baseLayout.umPerUnit) / 1000).toFixed(2))}
                          onChange={(event) =>
                            updateSelectedShape((shape) =>
                              shape.kind === "line"
                                ? { ...shape, x1: (Number(event.target.value) * 1000) / baseLayout.umPerUnit }
                                : shape,
                            )
                          }
                          className="editor-input"
                        />
                      </div>
                      <div>
                        <label className="editor-label">Start Y</label>
                        <input
                          type="number"
                          value={Number(((selectedShape.y1 * baseLayout.umPerUnit) / 1000).toFixed(2))}
                          onChange={(event) =>
                            updateSelectedShape((shape) =>
                              shape.kind === "line"
                                ? { ...shape, y1: (Number(event.target.value) * 1000) / baseLayout.umPerUnit }
                                : shape,
                            )
                          }
                          className="editor-input"
                        />
                      </div>
                      <div>
                        <label className="editor-label">End X</label>
                        <input
                          type="number"
                          value={Number(((selectedShape.x2 * baseLayout.umPerUnit) / 1000).toFixed(2))}
                          onChange={(event) =>
                            updateSelectedShape((shape) =>
                              shape.kind === "line"
                                ? { ...shape, x2: (Number(event.target.value) * 1000) / baseLayout.umPerUnit }
                                : shape,
                            )
                          }
                          className="editor-input"
                        />
                      </div>
                      <div>
                        <label className="editor-label">End Y</label>
                        <input
                          type="number"
                          value={Number(((selectedShape.y2 * baseLayout.umPerUnit) / 1000).toFixed(2))}
                          onChange={(event) =>
                            updateSelectedShape((shape) =>
                              shape.kind === "line"
                                ? { ...shape, y2: (Number(event.target.value) * 1000) / baseLayout.umPerUnit }
                                : shape,
                            )
                          }
                          className="editor-input"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="studio-stat-grid">
                      <div>
                        <label className="editor-label">X</label>
                        <input
                          type="number"
                          value={Number(((selectedShape.x * baseLayout.umPerUnit) / 1000).toFixed(2))}
                          onChange={(event) =>
                            updateSelectedShape((shape) =>
                              shape.kind !== "line"
                                ? { ...shape, x: (Number(event.target.value) * 1000) / baseLayout.umPerUnit }
                                : shape,
                            )
                          }
                          className="editor-input"
                        />
                      </div>
                      <div>
                        <label className="editor-label">Y</label>
                        <input
                          type="number"
                          value={Number(((selectedShape.y * baseLayout.umPerUnit) / 1000).toFixed(2))}
                          onChange={(event) =>
                            updateSelectedShape((shape) =>
                              shape.kind !== "line"
                                ? { ...shape, y: (Number(event.target.value) * 1000) / baseLayout.umPerUnit }
                                : shape,
                            )
                          }
                          className="editor-input"
                        />
                      </div>
                      <div>
                        <label className="editor-label">Width</label>
                        <input
                          type="number"
                          value={Number(((selectedShape.width * baseLayout.umPerUnit) / 1000).toFixed(2))}
                          onChange={(event) =>
                            updateSelectedShape((shape) =>
                              shape.kind !== "line"
                                ? { ...shape, width: Math.max(1, (Number(event.target.value) * 1000) / baseLayout.umPerUnit) }
                                : shape,
                            )
                          }
                          className="editor-input"
                        />
                      </div>
                      <div>
                        <label className="editor-label">Height</label>
                        <input
                          type="number"
                          value={Number(((selectedShape.height * baseLayout.umPerUnit) / 1000).toFixed(2))}
                          onChange={(event) =>
                            updateSelectedShape((shape) =>
                              shape.kind !== "line"
                                ? { ...shape, height: Math.max(1, (Number(event.target.value) * 1000) / baseLayout.umPerUnit) }
                                : shape,
                            )
                          }
                          className="editor-input"
                        />
                      </div>
                    </div>
                  )}
                  {selectedShape.kind === "arc" ? (
                    <div className="studio-stat-grid">
                      <div>
                        <label className="editor-label">Start Angle</label>
                        <input
                          type="number"
                          value={Number(selectedShape.startAngle.toFixed(0))}
                          onChange={(event) => updateSelectedShape((shape) => (shape.kind === "arc" ? { ...shape, startAngle: Number(event.target.value) } : shape))}
                          className="editor-input"
                        />
                      </div>
                      <div>
                        <label className="editor-label">End Angle</label>
                        <input
                          type="number"
                          value={Number(selectedShape.endAngle.toFixed(0))}
                          onChange={(event) => updateSelectedShape((shape) => (shape.kind === "arc" ? { ...shape, endAngle: Number(event.target.value) } : shape))}
                          className="editor-input"
                        />
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <label className="editor-label">Lock</label>
                    <div className="editor-segmented">
                      {[false, true].map((value) => (
                        <button
                          key={String(value)}
                          type="button"
                          onClick={() => updateSelectedShape((shape) => ({ ...shape, constraints: { ...shape.constraints, locked: value } }))}
                          className={`editor-segment-button ${Boolean(selectedShape.constraints?.locked) === value ? "editor-segment-button-active" : ""}`}
                        >
                          {value ? "locked" : "free"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedShape.kind === "line" ? (
                    <div>
                      <label className="editor-label">Orientation</label>
                      <div className="editor-segmented">
                        {(["free", "horizontal", "vertical"] as const).map((axis) => (
                          <button
                            key={axis}
                            type="button"
                            onClick={() => updateSelectedShape((shape) => (shape.kind === "line" ? { ...shape, constraints: { ...shape.constraints, axis } } : shape))}
                            className={`editor-segment-button ${(selectedShape.constraints?.axis ?? "free") === axis ? "editor-segment-button-active" : ""}`}
                          >
                            {axis === "horizontal" ? "hor" : axis === "vertical" ? "ver" : "free"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {(selectedShape.kind === "rect" || selectedShape.kind === "ellipse" || selectedShape.kind === "hole") ? (
                    <div>
                      <label className="editor-label">Proportion</label>
                      <div className="editor-segmented">
                        {(["free", "equal"] as const).map((aspect) => (
                          <button
                            key={aspect}
                            type="button"
                            onClick={() =>
                              updateSelectedShape((shape) =>
                                shape.kind === "rect" || shape.kind === "ellipse" || shape.kind === "hole"
                                  ? { ...shape, constraints: { ...shape.constraints, aspect } }
                                  : shape,
                              )
                            }
                            className={`editor-segment-button ${(selectedShape.constraints?.aspect ?? "free") === aspect ? "editor-segment-button-active" : ""}`}
                          >
                            {aspect === "equal" ? "equal" : "free"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {relationTargetOptions.length > 0 ? (
                    <div className="space-y-3">
                      <div className="editor-label !mb-0">Relations</div>
                      <div>
                        <label className="editor-label">Target</label>
                        <select
                          value={
                            selectedShape.kind === "line"
                              ? selectedShape.constraints?.lineRelation?.targetId ?? ""
                              : selectedShape.constraints?.shapeRelation?.targetId ?? ""
                          }
                          onChange={(event) =>
                            updateSelectedShape((shape) =>
                              shape.kind === "line"
                                ? {
                                    ...shape,
                                    constraints: {
                                      ...shape.constraints,
                                      lineRelation: {
                                        mode: shape.constraints?.lineRelation?.mode ?? "free",
                                        targetId: event.target.value || undefined,
                                      },
                                    },
                                  }
                                : {
                                    ...shape,
                                    constraints: {
                                      ...shape.constraints,
                                      shapeRelation: {
                                        mode: shape.constraints?.shapeRelation?.mode ?? "free",
                                        targetId: event.target.value || undefined,
                                      },
                                    },
                                  },
                            )
                          }
                          className="editor-input"
                        >
                          <option value="">None</option>
                          {relationTargetOptions
                            .filter((shape) => (selectedShape.kind === "line" ? shape.kind === "line" : shape.kind !== "line"))
                            .map((shape) => (
                              <option key={shape.id} value={shape.id}>
                                {shape.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      {selectedShape.kind === "line" ? (
                        <div>
                          <label className="editor-label">Line Relation</label>
                          <div className="editor-segmented">
                            {(["free", "parallel", "perpendicular"] as const).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() =>
                                  updateSelectedShape((shape) =>
                                    shape.kind === "line"
                                      ? {
                                          ...shape,
                                          constraints: {
                                            ...shape.constraints,
                                            lineRelation: {
                                              mode,
                                              targetId: shape.constraints?.lineRelation?.targetId,
                                            },
                                          },
                                        }
                                      : shape,
                                  )
                                }
                                className={`editor-segment-button ${(selectedShape.constraints?.lineRelation?.mode ?? "free") === mode ? "editor-segment-button-active" : ""}`}
                              >
                                {mode === "perpendicular" ? "perp" : mode}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="editor-label">Shape Relation</label>
                          <div className="editor-segmented">
                            {(["free", "same_x", "same_y", "same_center"] as const).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() =>
                                  updateSelectedShape((shape) =>
                                    shape.kind !== "line"
                                      ? {
                                          ...shape,
                                          constraints: {
                                            ...shape.constraints,
                                            shapeRelation: {
                                              mode,
                                              targetId: shape.constraints?.shapeRelation?.targetId,
                                            },
                                          },
                                        }
                                      : shape,
                                  )
                                }
                                className={`editor-segment-button ${(selectedShape.constraints?.shapeRelation?.mode ?? "free") === mode ? "editor-segment-button-active" : ""}`}
                              >
                                {mode === "same_center" ? "center" : mode === "same_x" ? "same x" : mode === "same_y" ? "same y" : "free"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                  <div className="studio-stat-grid">
                    {"fill" in selectedShape ? <div><label className="editor-label">Fill</label><input type="color" value={selectedShape.fill} onChange={(event) => updateSelectedShape((shape) => ("fill" in shape ? { ...shape, fill: event.target.value } : shape))} className="editor-color-input" /></div> : null}
                    {"stroke" in selectedShape ? <div><label className="editor-label">Stroke</label><input type="color" value={selectedShape.stroke} onChange={(event) => updateSelectedShape((shape) => ("stroke" in shape ? { ...shape, stroke: event.target.value } : shape))} className="editor-color-input" /></div> : null}
                  </div>
                  {"strokeWidth" in selectedShape ? <div><label className="editor-label">Stroke Width</label><input type="range" min="1" max="8" step="0.2" value={selectedShape.strokeWidth} onChange={(event) => updateSelectedShape((shape) => ("strokeWidth" in shape ? { ...shape, strokeWidth: Number(event.target.value) } : shape))} className="editor-slider" /></div> : null}
                  <div>
                    <label className="editor-label">Construction</label>
                    <div className="editor-segmented">
                      {[true, false].map((value) => (
                        <button
                          key={String(value)}
                          type="button"
                          onClick={() => updateSelectedShape((shape) => ({ ...shape, construction: value }))}
                          className={`editor-segment-button ${Boolean(selectedShape.construction) === value ? "editor-segment-button-active" : ""}`}
                        >
                          {value ? "on" : "off"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedShape.kind === "rect" ? <div><label className="editor-label">Corner Radius</label><input type="range" min="0" max="60" step="1" value={selectedShape.radius} onChange={(event) => updateSelectedShape((shape) => (shape.kind === "rect" ? { ...shape, radius: Number(event.target.value) } : shape))} className="editor-slider" /></div> : null}
                  {selectedShape.kind === "text" ? (
                    <>
                      <div>
                        <label className="editor-label">Text</label>
                        <input
                          value={selectedShape.text}
                          onChange={(event) =>
                            updateSelectedShape((shape) => (shape.kind === "text" ? { ...shape, text: event.target.value } : shape))
                          }
                          className="editor-input"
                        />
                      </div>
                      <div>
                        <label className="editor-label">Font Size</label>
                        <input
                          type="range"
                          min="10"
                          max="42"
                          step="1"
                          value={selectedShape.fontSize}
                          onChange={(event) =>
                            updateSelectedShape((shape) => (shape.kind === "text" ? { ...shape, fontSize: Number(event.target.value) } : shape))
                          }
                          className="editor-slider"
                        />
                      </div>
                    </>
                  ) : null}
                  {(selectedShape.kind === "hole" || selectedShape.kind === "ellipse" || selectedShape.kind === "arc" || selectedShape.kind === "rect" || selectedShape.kind === "line" || selectedShape.kind === "text") ? (
                    <>
                      <div>
                        <label className="editor-label">Offset Copy</label>
                        <input
                          type="range"
                          min="-40"
                          max="40"
                          step="1"
                          value={offsetDistance}
                          onChange={(event) => setOffsetDistance(Number(event.target.value))}
                          className="editor-slider"
                        />
                        <div className="mt-1 font-mono text-[11px] text-aura-muted">{offsetDistance}px</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = createOffsetShape(selectedShape, offsetDistance, nextShapeId(shapeLayers, selectedShape.kind));
                          if (!next) {
                            return;
                          }
                          commitShapeLayerUpdate((current) => [...current, next]);
                          setSelectedLayer({ kind: "shape", id: next.id });
                        }}
                        className="editor-action-button"
                      >
                        Create Offset Copy
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      const duplicate = selectedShape.kind === "line"
                        ? { ...selectedShape, id: nextShapeId(shapeLayers, selectedShape.kind), name: `${selectedShape.name} Copy`, x1: selectedShape.x1 + 14, y1: selectedShape.y1 + 14, x2: selectedShape.x2 + 14, y2: selectedShape.y2 + 14 }
                        : { ...selectedShape, id: nextShapeId(shapeLayers, selectedShape.kind), name: `${selectedShape.name} Copy`, x: selectedShape.x + 14, y: selectedShape.y + 14 };
                      commitShapeLayerUpdate((current) => [...current, duplicate as ShapeLayer]);
                      setSelectedLayer({ kind: "shape", id: duplicate.id });
                    }}
                    className="editor-action-button"
                  >
                    Duplicate Layer
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setShapeLayers((current) => reorderById(current, selectedShape.id, "front"))} className="editor-action-button">Bring Front</button>
                    <button type="button" onClick={() => setShapeLayers((current) => reorderById(current, selectedShape.id, "forward"))} className="editor-action-button">Forward</button>
                    <button type="button" onClick={() => setShapeLayers((current) => reorderById(current, selectedShape.id, "backward"))} className="editor-action-button">Backward</button>
                    <button type="button" onClick={() => setShapeLayers((current) => reorderById(current, selectedShape.id, "back"))} className="editor-action-button">Send Back</button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPersistentDimensions((current) => current.filter((dimension) => dimension.shapeId !== selectedShape.id));
                      commitShapeLayerUpdate((current) =>
                        current
                          .filter((shape) => shape.id !== selectedShape.id)
                          .map((shape) => {
                            if (shape.kind === "line" && shape.constraints?.lineRelation?.targetId === selectedShape.id) {
                              return {
                                ...shape,
                                constraints: {
                                  ...shape.constraints,
                                  lineRelation: { ...shape.constraints.lineRelation, mode: "free", targetId: undefined },
                                },
                              };
                            }
                            if (shape.kind !== "line" && shape.constraints?.shapeRelation?.targetId === selectedShape.id) {
                              return {
                                ...shape,
                                constraints: {
                                  ...shape.constraints,
                                  shapeRelation: { ...shape.constraints.shapeRelation, mode: "free", targetId: undefined },
                                },
                              };
                            }
                            return shape;
                          }),
                      );
                      setSelectedLayer({ kind: "base", id: "body_primary" });
                    }}
                    className="editor-action-button"
                  >
                    Delete Layer
                  </button>
                </>
              ) : null}
              {selectedLayer == null ? <div className="rounded-xl border border-dashed border-white/20 px-3 py-3 text-[10px] leading-4 text-aura-muted">Select the body, pins, a marking, child part, or a custom drawn shape to edit it.</div> : null}
            </CreatorSection>

            <CreatorSection
              title="Advanced Behavior"
              count={selectedPreset.short}
              open={rightSections.behaviors}
              onToggle={() => setRightSections((current) => ({ ...current, behaviors: !current.behaviors }))}
            >
              <div className="creator-choice-grid">
                {BEHAVIOR_PRESETS.map((preset) => (
                  <button key={preset.id} type="button" onClick={() => { const nextTarget = getCompatibleBehaviorTargets(preset.id)[0]; setDraft((current) => ({ ...current, presetId: preset.id, targetId: nextTarget?.id ?? current.targetId, property: preset.defaultProperty })); }} className={`creator-choice-button ${draft.presetId === preset.id ? "creator-choice-button-active" : ""}`}>{preset.label}</button>
                ))}
              </div>
              <div className="studio-stat-card">
                <div className="editor-label !mb-1">Target Layer</div>
                <div className="font-mono text-[12px] text-white">{selectionLabel}</div>
                <p className="mt-2 text-[11px] leading-5 text-aura-muted">Use this only after the component geometry is right. The selected visible layer becomes the behavior target.</p>
              </div>
              <div><label className="editor-label">Signal Name</label><input value={draft.property} onChange={(event) => setDraft((current) => ({ ...current, property: event.target.value }))} className="editor-input" /></div>
              {selectedPreset.id === "light_emitter" ? (
                <>
                  <div><label className="editor-label">Light Color</label><input type="color" value={draft.baseColor} onChange={(event) => setDraft((current) => ({ ...current, baseColor: event.target.value }))} className="editor-color-input" /></div>
                  <div className="studio-stat-grid">
                    <div><label className="editor-label">Dim Level</label><input type="range" min="0" max="1" step="0.01" value={draft.opacityMin} onChange={(event) => setDraft((current) => ({ ...current, opacityMin: Number(event.target.value) }))} className="editor-slider" /></div>
                    <div><label className="editor-label">Bright Level</label><input type="range" min="0" max="1" step="0.01" value={draft.opacityMax} onChange={(event) => setDraft((current) => ({ ...current, opacityMax: Number(event.target.value) }))} className="editor-slider" /></div>
                  </div>
                </>
              ) : null}
              {(selectedPreset.id === "translate_actor" || selectedPreset.id === "linear_slider") ? <div><label className="editor-label">Axis</label><div className="editor-segmented">{(["x", "y"] as const).map((axis) => <button key={axis} type="button" onClick={() => setDraft((current) => ({ ...current, axis }))} className={`editor-segment-button ${draft.axis === axis ? "editor-segment-button-active" : ""}`}>{axis}</button>)}</div></div> : null}
            </CreatorSection>
          </div>
        </div>
      </aside>
    </div>
  );
}
