import {
  resolvePackageByItemId,
  UM_TO_PX,
} from "../data/componentCatalog";
import type { CircuitComponent } from "../store/useEditorStore";

export interface HealthBoundsPx {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ReadabilityIssue {
  kind: "overlap" | "crowded";
  componentIds: [string, string];
  box: HealthBoundsPx;
}

export interface LayoutHealthReport {
  issues: ReadabilityIssue[];
  overlapCount: number;
  crowdedCount: number;
  issueLevelByComponent: Map<string, "overlap" | "crowded">;
}

function normalizeRotationDeg(rotationDeg: number | undefined): number {
  const normalized = ((rotationDeg ?? 0) % 360 + 360) % 360;
  const snapped = Math.round(normalized / 90) * 90;
  return snapped === 360 ? 0 : snapped;
}

function getComponentBoundsPx(component: CircuitComponent): HealthBoundsPx {
  const packageDef = resolvePackageByItemId(component.libraryItemId, component.packageState);
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

function inflateBounds(bounds: HealthBoundsPx, padding: number): HealthBoundsPx {
  return {
    left: bounds.left - padding,
    top: bounds.top - padding,
    right: bounds.right + padding,
    bottom: bounds.bottom + padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
    centerX: bounds.centerX,
    centerY: bounds.centerY,
  };
}

function doBoundsOverlap(a: HealthBoundsPx, b: HealthBoundsPx) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function getOverlapBox(a: HealthBoundsPx, b: HealthBoundsPx): HealthBoundsPx {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

function getUnionBox(a: HealthBoundsPx, b: HealthBoundsPx): HealthBoundsPx {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);
  const width = right - left;
  const height = bottom - top;

  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

export function computeLayoutHealth(components: CircuitComponent[]): LayoutHealthReport {
  const componentLayout = components.map((component) => ({
    component,
    bounds: getComponentBoundsPx(component),
  }));
  const issues: ReadabilityIssue[] = [];

  for (let index = 0; index < componentLayout.length; index += 1) {
    const left = componentLayout[index];

    for (let innerIndex = index + 1; innerIndex < componentLayout.length; innerIndex += 1) {
      const right = componentLayout[innerIndex];

      if (doBoundsOverlap(left.bounds, right.bounds)) {
        issues.push({
          kind: "overlap",
          componentIds: [left.component.id, right.component.id],
          box: getOverlapBox(left.bounds, right.bounds),
        });
        continue;
      }

      const leftExpanded = inflateBounds(left.bounds, 26);
      const rightExpanded = inflateBounds(right.bounds, 26);

      if (doBoundsOverlap(leftExpanded, rightExpanded)) {
        issues.push({
          kind: "crowded",
          componentIds: [left.component.id, right.component.id],
          box: getUnionBox(leftExpanded, rightExpanded),
        });
      }
    }
  }

  const overlapCount = issues.filter((issue) => issue.kind === "overlap").length;
  const crowdedCount = issues.filter((issue) => issue.kind === "crowded").length;
  const issueLevelByComponent = new Map<string, "overlap" | "crowded">();

  issues.forEach((issue) => {
    issue.componentIds.forEach((componentId) => {
      const current = issueLevelByComponent.get(componentId);
      if (current === "overlap" || issue.kind === current) {
        return;
      }
      issueLevelByComponent.set(componentId, issue.kind);
    });
  });

  return {
    issues,
    overlapCount,
    crowdedCount,
    issueLevelByComponent,
  };
}
