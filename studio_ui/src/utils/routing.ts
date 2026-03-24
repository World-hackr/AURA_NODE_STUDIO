export type RoutingDirection = "left" | "right" | "up" | "down";

export interface RoutingRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface RoutingPoint {
  x: number;
  y: number;
}

function nudgePoint(
  point: RoutingPoint,
  direction: RoutingDirection,
  distance: number,
): RoutingPoint {
  switch (direction) {
    case "left":
      return { x: point.x - distance, y: point.y };
    case "right":
      return { x: point.x + distance, y: point.y };
    case "up":
      return { x: point.x, y: point.y - distance };
    case "down":
      return { x: point.x, y: point.y + distance };
  }
}

function pointKey(point: RoutingPoint) {
  return `${point.x.toFixed(2)}:${point.y.toFixed(2)}`;
}

function pointInsideRect(point: RoutingPoint, rect: RoutingRect) {
  return (
    point.x > rect.left &&
    point.x < rect.right &&
    point.y > rect.top &&
    point.y < rect.bottom
  );
}

function segmentIntersectsRect(
  start: RoutingPoint,
  end: RoutingPoint,
  rect: RoutingRect,
): boolean {
  if (Math.abs(start.x - end.x) < 0.01) {
    const x = start.x;
    const top = Math.min(start.y, end.y);
    const bottom = Math.max(start.y, end.y);
    return x > rect.left && x < rect.right && bottom > rect.top && top < rect.bottom;
  }

  if (Math.abs(start.y - end.y) < 0.01) {
    const y = start.y;
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x);
    return y > rect.top && y < rect.bottom && right > rect.left && left < rect.right;
  }

  return false;
}

function dedupeNumbers(values: number[]) {
  return Array.from(new Set(values.map((value) => Number(value.toFixed(2))))).sort((a, b) => a - b);
}

function dedupePoints(points: RoutingPoint[]) {
  const seen = new Set<string>();
  return points.filter((point) => {
    const key = pointKey(point);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function pointsToPath(points: RoutingPoint[]) {
  const deduped = points.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const previous = points[index - 1];
    return Math.abs(previous.x - point.x) > 0.01 || Math.abs(previous.y - point.y) > 0.01;
  });

  return deduped
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function getPolylinePath(points: RoutingPoint[]) {
  return pointsToPath(points);
}

function dedupeSequentialPoints(points: RoutingPoint[]) {
  return points.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const previous = points[index - 1];
    return Math.abs(previous.x - point.x) > 0.01 || Math.abs(previous.y - point.y) > 0.01;
  });
}

function getFallbackRoutePoints(
  start: RoutingPoint,
  end: RoutingPoint,
  startDirection?: RoutingDirection,
  endDirection?: RoutingDirection,
) {
  if (!startDirection && !endDirection) {
    const midX = start.x + (end.x - start.x) / 2;
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  const stubLength = 14;
  const startStub = startDirection ? nudgePoint(start, startDirection, stubLength) : start;
  const endStub = endDirection ? nudgePoint(end, endDirection, stubLength) : end;
  const horizontalStart =
    startDirection === "left" || startDirection === "right" || startDirection == null;
  const horizontalEnd =
    endDirection === "left" || endDirection === "right" || endDirection == null;

  if (horizontalStart && horizontalEnd) {
    const midX = startStub.x + (endStub.x - startStub.x) / 2;
    return [
      start,
      startStub,
      { x: midX, y: startStub.y },
      { x: midX, y: endStub.y },
      endStub,
      end,
    ];
  }

  if (!horizontalStart && !horizontalEnd) {
    const midY = startStub.y + (endStub.y - startStub.y) / 2;
    return [
      start,
      startStub,
      { x: startStub.x, y: midY },
      { x: endStub.x, y: midY },
      endStub,
      end,
    ];
  }

  if (horizontalStart) {
    return [start, startStub, { x: endStub.x, y: startStub.y }, endStub, end];
  }

  return [start, startStub, { x: startStub.x, y: endStub.y }, endStub, end];
}

export function getOrthogonalRoutePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  startDirection?: RoutingDirection,
  endDirection?: RoutingDirection,
  obstacles: RoutingRect[] = [],
  lockedRoutePoints: RoutingPoint[] = [],
): RoutingPoint[] {
  const start = { x: x1, y: y1 };
  const end = { x: x2, y: y2 };

  if (lockedRoutePoints.length > 0) {
    return dedupeSequentialPoints([start, ...lockedRoutePoints, end]);
  }

  if (obstacles.length === 0) {
    return getFallbackRoutePoints(start, end, startDirection, endDirection);
  }

  const stubLength = 16;
  const startStub = startDirection ? nudgePoint(start, startDirection, stubLength) : start;
  const endStub = endDirection ? nudgePoint(end, endDirection, stubLength) : end;
  const usableObstacles = obstacles.filter(
    (rect) =>
      !pointInsideRect(start, rect) &&
      !pointInsideRect(startStub, rect) &&
      !pointInsideRect(endStub, rect) &&
      !pointInsideRect(end, rect),
  );

  const xs = dedupeNumbers([
    start.x,
    startStub.x,
    endStub.x,
    end.x,
    ...usableObstacles.flatMap((rect) => [rect.left, rect.right]),
  ]);
  const ys = dedupeNumbers([
    start.y,
    startStub.y,
    endStub.y,
    end.y,
    ...usableObstacles.flatMap((rect) => [rect.top, rect.bottom]),
  ]);

  const points = dedupePoints([
    start,
    startStub,
    endStub,
    end,
    ...xs.flatMap((x) =>
      ys.map((y) => ({ x, y })).filter(
        (point) => !usableObstacles.some((rect) => pointInsideRect(point, rect)),
      ),
    ),
  ]);
  const indexByKey = new Map(points.map((point, index) => [pointKey(point), index]));
  const adjacency = new Map<number, Array<{ to: number; distance: number; axis: "h" | "v" }>>();

  const connect = (
    first: RoutingPoint,
    second: RoutingPoint,
    axis: "h" | "v",
  ) => {
    if (usableObstacles.some((rect) => segmentIntersectsRect(first, second, rect))) {
      return;
    }

    const firstIndex = indexByKey.get(pointKey(first));
    const secondIndex = indexByKey.get(pointKey(second));
    if (firstIndex == null || secondIndex == null || firstIndex === secondIndex) {
      return;
    }

    const distance = Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
    const firstEdges = adjacency.get(firstIndex) ?? [];
    const secondEdges = adjacency.get(secondIndex) ?? [];
    firstEdges.push({ to: secondIndex, distance, axis });
    secondEdges.push({ to: firstIndex, distance, axis });
    adjacency.set(firstIndex, firstEdges);
    adjacency.set(secondIndex, secondEdges);
  };

  xs.forEach((x) => {
    const linePoints = points
      .filter((point) => Math.abs(point.x - x) < 0.01)
      .sort((a, b) => a.y - b.y);
    for (let index = 0; index < linePoints.length - 1; index += 1) {
      connect(linePoints[index], linePoints[index + 1], "v");
    }
  });

  ys.forEach((y) => {
    const linePoints = points
      .filter((point) => Math.abs(point.y - y) < 0.01)
      .sort((a, b) => a.x - b.x);
    for (let index = 0; index < linePoints.length - 1; index += 1) {
      connect(linePoints[index], linePoints[index + 1], "h");
    }
  });

  const startIndex = indexByKey.get(pointKey(start));
  const endIndex = indexByKey.get(pointKey(end));
  if (startIndex == null || endIndex == null) {
    return getFallbackRoutePoints(start, end, startDirection, endDirection);
  }

  const queue: Array<{ node: number; axis: "h" | "v" | null; cost: number }> = [
    { node: startIndex, axis: null, cost: 0 },
  ];
  const best = new Map<string, number>([[`${startIndex}:none`, 0]]);
  const parent = new Map<string, { previousKey: string | null; node: number }>([
    [`${startIndex}:none`, { previousKey: null, node: startIndex }],
  ]);
  const bendPenalty = 24;

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (!current) {
      break;
    }

    const currentAxisKey = current.axis ?? "none";
    const currentKey = `${current.node}:${currentAxisKey}`;
    const currentBest = best.get(currentKey);
    if (currentBest == null || current.cost > currentBest) {
      continue;
    }

    if (current.node === endIndex) {
      const route: RoutingPoint[] = [];
      let walkerKey: string | null = currentKey;
      while (walkerKey) {
        const walker = parent.get(walkerKey);
        if (!walker) {
          break;
        }
        route.push(points[walker.node]);
        walkerKey = walker.previousKey;
      }

      return route.reverse();
    }

    const edges = adjacency.get(current.node) ?? [];
    edges.forEach((edge) => {
      const axisPenalty = current.axis != null && current.axis !== edge.axis ? bendPenalty : 0;
      const nextCost = current.cost + edge.distance + axisPenalty;
      const nextKey = `${edge.to}:${edge.axis}`;
      const existingCost = best.get(nextKey);

      if (existingCost != null && existingCost <= nextCost) {
        return;
      }

      best.set(nextKey, nextCost);
      parent.set(nextKey, { previousKey: currentKey, node: edge.to });
      queue.push({ node: edge.to, axis: edge.axis, cost: nextCost });
    });
  }

  return getFallbackRoutePoints(start, end, startDirection, endDirection);
}

export function getOrthogonalPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  startDirection?: RoutingDirection,
  endDirection?: RoutingDirection,
  obstacles: RoutingRect[] = [],
  lockedRoutePoints: RoutingPoint[] = [],
) {
  return pointsToPath(
    getOrthogonalRoutePoints(
      x1,
      y1,
      x2,
      y2,
      startDirection,
      endDirection,
      obstacles,
      lockedRoutePoints,
    ),
  );
}

export function getEditableBendPoints(routePoints: RoutingPoint[]) {
  return routePoints.slice(1, -1).map((point, index) => ({
    index: index + 1,
    point,
  }));
}

export function getConnectionInteriorRoutePoints(routePoints: RoutingPoint[]) {
  return dedupeSequentialPoints(routePoints).slice(1, -1);
}

export function removeRoutePointAtIndex(routePoints: RoutingPoint[], pointIndex: number) {
  const nextPoints = routePoints.filter((_, index) => index !== pointIndex);
  return getConnectionInteriorRoutePoints(nextPoints);
}

export function insertRoutePointOnSegment(
  routePoints: RoutingPoint[],
  segmentIndex: number,
  point: RoutingPoint,
) {
  const nextPoints = [
    ...routePoints.slice(0, segmentIndex + 1),
    point,
    ...routePoints.slice(segmentIndex + 1),
  ];

  return getConnectionInteriorRoutePoints(nextPoints);
}
