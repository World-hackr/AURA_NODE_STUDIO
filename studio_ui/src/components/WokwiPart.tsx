import { createElement, useCallback, useEffect, useRef, useState } from "react";

import type { RuntimeProfileState } from "../data/runtimeProfiles";
import { ensureWokwiElementsRegistered } from "../wokwi/registerWokwiElements";
import { getWokwiModel } from "../wokwi/wokwiModels";

type WokwiMeasuredPin = {
  id: string;
  label: string;
  x: number;
  y: number;
};

type WokwiMeasuredLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  pins: WokwiMeasuredPin[];
};

function getScaleToFit(
  targetWidth: number,
  targetHeight: number,
  naturalWidth: number,
  naturalHeight: number,
) {
  return Math.min(targetWidth / naturalWidth, targetHeight / naturalHeight);
}

function rotateLocalPoint(
  point: { x: number; y: number },
  center: { x: number; y: number },
  rotationDeg: number,
) {
  const radians = (rotationDeg * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: center.y + dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}

function applyRuntimeTransform(
  runtimeProfile: RuntimeProfileState | null,
  sourceKey: string,
  transform: string,
) {
  const sourceValue = runtimeProfile?.[sourceKey as keyof RuntimeProfileState];

  switch (transform) {
    case "boolean_gt_0.5":
      return Number(sourceValue ?? 0) > 0.5;
    case "binary_0_1":
      return Number(sourceValue ?? 0) >= 0.5 ? 1 : 0;
    case "color_name_or_hex":
      return sourceValue ?? "red";
    case "direct":
    default:
      return sourceValue ?? null;
  }
}

function applyRuntimeProps(
  element: HTMLElement,
  model: ReturnType<typeof getWokwiModel>,
  runtimeProfile: RuntimeProfileState | null,
) {
  if (!model) {
    return;
  }

  for (const [propKey, value] of Object.entries(model.runtime.staticProps)) {
    (element as HTMLElement & Record<string, unknown>)[propKey] = value;
  }

  for (const binding of model.runtime.propBindings) {
    (element as HTMLElement & Record<string, unknown>)[binding.elementProp] = applyRuntimeTransform(
      runtimeProfile,
      binding.from,
      binding.transform,
    );
  }
}

function getModelPinPoint(
  libraryItemId: string,
  pin: { x: number; y: number },
  modelAnchor: { x: number; y: number } | null,
  offsetX: number,
  offsetY: number,
  scale: number,
) {
  if (libraryItemId === "resistor_axial_030") {
    return {
      x: offsetX + (modelAnchor?.x ?? pin.x) * scale,
      y: offsetY + (modelAnchor?.y ?? pin.y) * scale,
    };
  }

  return {
    x: offsetX + pin.x * scale,
    y: offsetY + pin.y * scale,
  };
}

export function WokwiPart({
  componentId,
  libraryItemId,
  runtimeProfile,
  x,
  y,
  width,
  height,
  rotationDeg,
  opacity = 1,
  onLayoutChange,
  onNativeMouseDown,
}: {
  componentId: string;
  libraryItemId: string;
  runtimeProfile: RuntimeProfileState | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  opacity?: number;
  onLayoutChange?: (componentId: string, layout: WokwiMeasuredLayout | null) => void;
  onNativeMouseDown?: (event: MouseEvent) => void;
}) {
  const model = getWokwiModel(libraryItemId);
  const spec = model
    ? {
        tagName: model.wokwi.tagName,
        naturalWidth: model.wokwi.naturalSizePx.width,
        naturalHeight: model.wokwi.naturalSizePx.height,
      }
    : null;
  const [hostElement, setHostElement] = useState<HTMLElement | null>(null);
  const interactionOverlayRef = useRef<HTMLDivElement | null>(null);
  const lastLayoutSignatureRef = useRef<string>("");
  const handleHostRef = useCallback((node: Element | null) => {
    setHostElement(node as HTMLElement | null);
  }, []);

  useEffect(() => {
    ensureWokwiElementsRegistered();
  }, []);

  useEffect(() => {
    if (!hostElement) {
      return;
    }

    applyRuntimeProps(hostElement, model, runtimeProfile);
  }, [hostElement, model, runtimeProfile]);

  useEffect(() => {
    if (!onLayoutChange || !hostElement) {
      return;
    }

    const baseWidth = spec?.naturalWidth ?? width;
    const baseHeight = spec?.naturalHeight ?? height;
    const scale = getScaleToFit(width, height, baseWidth, baseHeight);
    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;
    const localCenter = { x: width / 2, y: height / 2 };
    const measurePins = () =>
      ((hostElement as HTMLElement & { pinInfo?: Array<{ name: string; x: number; y: number }> }).pinInfo ?? [])
        .filter((pin) => typeof pin.x === "number" && typeof pin.y === "number")
        .map((pin) => {
          const modelAnchor =
            model?.pins.anchors.find((anchor) => anchor.id === pin.name) ?? null;
          const mappedPoint = getModelPinPoint(
            libraryItemId,
            pin,
            modelAnchor,
            offsetX,
            offsetY,
            scale,
          );
          const localPoint = rotateLocalPoint(
            mappedPoint,
            localCenter,
            rotationDeg,
          );
          return {
            id: pin.name,
            label: pin.name,
            x: x + localPoint.x,
            y: y + localPoint.y,
          };
        });
    const emitLayout = () => {
      const pinInfo = measurePins();
      const layout: WokwiMeasuredLayout = {
        left: x,
        top: y,
        width,
        height,
        centerX: x + width / 2,
        centerY: y + height / 2,
        pins: pinInfo,
      };
      const signature = JSON.stringify({
        x,
        y,
        width,
        height,
        rotationDeg,
        baseWidth,
        baseHeight,
        pins: layout.pins,
      });

      if (signature !== lastLayoutSignatureRef.current) {
        lastLayoutSignatureRef.current = signature;
        onLayoutChange(componentId, layout);
      }
    };

    let frameA = 0;
    let frameB = 0;
    let observer: ResizeObserver | null = null;
    const scheduleEmit = () => {
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
      frameA = requestAnimationFrame(() => {
        frameB = requestAnimationFrame(emitLayout);
      });
    };

    scheduleEmit();
    hostElement.addEventListener("pininfo-change", scheduleEmit as EventListener);
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => scheduleEmit());
      observer.observe(hostElement);
    }

    return () => {
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
      hostElement.removeEventListener("pininfo-change", scheduleEmit as EventListener);
      observer?.disconnect();
    };
  }, [componentId, hostElement, libraryItemId, model?.pins.anchors, onLayoutChange, rotationDeg, spec?.naturalHeight, spec?.naturalWidth, width, height, x, y]);

  useEffect(() => {
    return () => {
      onLayoutChange?.(componentId, null);
    };
  }, [componentId, onLayoutChange]);

  useEffect(() => {
    const overlay = interactionOverlayRef.current;
    if (!overlay || !onNativeMouseDown) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      onNativeMouseDown(event);
    };
    const preventDragStart = (event: DragEvent) => {
      event.preventDefault();
    };

    overlay.addEventListener("mousedown", handleMouseDown);
    overlay.addEventListener("dragstart", preventDragStart);

    return () => {
      overlay.removeEventListener("mousedown", handleMouseDown);
      overlay.removeEventListener("dragstart", preventDragStart);
    };
  }, [onNativeMouseDown]);

  if (!spec) {
    return null;
  }

  const scale = getScaleToFit(width, height, spec.naturalWidth, spec.naturalHeight);
  const scaledWidth = spec.naturalWidth * scale;
  const scaledHeight = spec.naturalHeight * scale;
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;

  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      opacity={opacity}
      style={{ overflow: "visible", pointerEvents: onNativeMouseDown ? "auto" : "none" }}
    >
      <div
        style={{
          position: "relative",
          width: `${width}px`,
          height: `${height}px`,
          overflow: "visible",
          pointerEvents: onNativeMouseDown ? "auto" : "none",
        }}
      >
        {onNativeMouseDown ? (
          <div
            ref={interactionOverlayRef}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.001)",
              cursor: "grab",
              pointerEvents: "auto",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `rotate(${rotationDeg}deg)`,
            transformOrigin: "center center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: offsetX,
              top: offsetY,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "none",
            }}
          >
            {createElement(spec.tagName, {
              ref: handleHostRef,
              style: {
                display: "block",
                width: `${spec.naturalWidth}px`,
                height: `${spec.naturalHeight}px`,
                pointerEvents: "none",
              },
            })}
          </div>
        </div>
      </div>
    </foreignObject>
  );
}
