import modelIndexText from "../../../shared/wokwi_models_v1/model_index.json?raw";
import correctionsText from "../../../shared/wokwi_models_v1/corrections.json?raw";
import led5mmText from "../../../shared/wokwi_models_v1/models/led_5mm.wokwi.json?raw";
import potentiometerText from "../../../shared/wokwi_models_v1/models/potentiometer_knob.wokwi.json?raw";
import resistorAxialText from "../../../shared/wokwi_models_v1/models/resistor_axial_030.wokwi.json?raw";
import servoText from "../../../shared/wokwi_models_v1/models/servo_micro.wokwi.json?raw";
import slideSwitchText from "../../../shared/wokwi_models_v1/models/slide_switch_spdt.wokwi.json?raw";

type RuntimeProfileId =
  | "none"
  | "light_output"
  | "push_button"
  | "potentiometer"
  | "slide_switch"
  | "toggle_switch"
  | "servo_angle";

type RuntimeDefaults = {
  profileId: RuntimeProfileId;
  signalName?: string;
  targetId?: string;
  valueMin?: number;
  valueMax?: number;
  defaultValue?: number;
  angleMin?: number;
  angleMax?: number;
  travelAxis?: "x" | "y";
  travelMin?: number;
  travelMax?: number;
  lowVisual?: number;
  highVisual?: number;
  detentCount?: number;
  autoReset?: boolean;
  offLabel?: string;
  onLabel?: string;
  lightColor?: string;
} | null;

type WokwiBindingTransform =
  | "direct"
  | "boolean_gt_0.5"
  | "binary_0_1"
  | "color_name_or_hex";

type WokwiBehaviorSupportStatus = "implemented" | "placeholder" | "static";

interface WokwiSourceExtractPin {
  name: string;
  x?: number;
  y?: number;
}

interface WokwiSourceExtractProperty {
  name: string;
  defaultRaw?: string;
}

interface WokwiSourceExtract {
  schema: string;
  id: string;
  tagName: string;
  className: string;
  sourceFile: string;
  metrics: {
    width: string | null;
    height: string | null;
    viewBox: string | null;
  };
  pinInfo: {
    status: string;
    count: number;
    pins: WokwiSourceExtractPin[];
  };
  properties: WokwiSourceExtractProperty[];
}

export interface WokwiPropertyBinding {
  elementProp: string;
  from: string;
  transform: WokwiBindingTransform;
}

export interface WokwiBehaviorSupport {
  status: WokwiBehaviorSupportStatus;
  summary: string;
  capabilities: string[];
}

export interface WokwiPartModel {
  schema: string;
  libraryItemId: string;
  title: string;
  sourceKind: "curated" | "generated";
  wokwi: {
    tagName: string;
    modulePath: string;
    naturalSizePx: {
      width: number;
      height: number;
    };
    allowOuterRotation: boolean;
  };
  pins: {
    labels: string[];
    anchors: Array<{
      id: string;
      x: number;
      y: number;
    }>;
  };
  runtime: {
    defaults: RuntimeDefaults;
    staticProps: Record<string, string | number | boolean | null>;
    propBindings: WokwiPropertyBinding[];
  };
  behaviorSupport: WokwiBehaviorSupport;
}

interface WokwiPartCorrection {
  notes?: string;
  pinAnchorOverrides?: Record<string, { x?: number; y?: number }>;
  pinLabelOverrides?: Record<string, string>;
}

const GENERATED_MODEL_TEXTS = import.meta.glob(
  "../../../shared/wokwi_models_v1/generated/*.wokwi.extract.json",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

const CURATED_MODEL_TEXTS = [
  led5mmText,
  resistorAxialText,
  potentiometerText,
  slideSwitchText,
  servoText,
];

const CURATED_ID_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  led: "led_5mm",
  resistor: "resistor_axial_030",
  potentiometer: "potentiometer_knob",
  slide_switch: "slide_switch_spdt",
  servo: "servo_micro",
});

const parsedIndex = JSON.parse(modelIndexText) as {
  schema: string;
  version: number;
  models: string[];
};

const parsedCorrections = JSON.parse(correctionsText) as {
  schema: string;
  version: number;
  parts: Record<string, WokwiPartCorrection>;
};

const curatedModels = CURATED_MODEL_TEXTS.map((text) => JSON.parse(text) as WokwiPartModel);

if (parsedIndex.models.length !== curatedModels.length) {
  throw new Error("Wokwi model index and loaded curated model files are out of sync.");
}

function titleCasePart(part: string) {
  if (/^\d+$/.test(part)) {
    return part;
  }

  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

function formatModelTitle(id: string) {
  return id
    .split("_")
    .map((part) => {
      const upper = part.toUpperCase();
      if (["LCD", "SSD", "ILI", "IR", "ESP32", "DHT22", "HC", "SR04", "MPU6050", "DS1307", "HX711", "RGB", "RP2040"].includes(upper)) {
        return upper;
      }
      if (part === "3v3") {
        return "3V3";
      }
      return titleCasePart(part);
    })
    .join(" ");
}

function parsePrimitiveDefault(defaultRaw: string | undefined) {
  if (!defaultRaw) {
    return undefined;
  }

  const trimmed = defaultRaw.trim();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (/^['"].*['"]$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  if (trimmed === "null") {
    return null;
  }
  return undefined;
}

function parseCssLengthToPx(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const mmMatch = /^(-?\d+(?:\.\d+)?)mm$/i.exec(trimmed);
  if (mmMatch) {
    return Number(mmMatch[1]) * 3.7795275591;
  }

  const pxMatch = /^(-?\d+(?:\.\d+)?)px$/i.exec(trimmed);
  if (pxMatch) {
    return Number(pxMatch[1]);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return null;
}

function parseViewBoxSize(viewBox: string | null) {
  if (!viewBox) {
    return null;
  }

  const parts = viewBox
    .trim()
    .split(/[,\s]+/)
    .map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  return {
    width: Math.abs(parts[2]),
    height: Math.abs(parts[3]),
  };
}

function deriveNaturalSizePx(extract: WokwiSourceExtract) {
  const widthFromCss = parseCssLengthToPx(extract.metrics.width);
  const heightFromCss = parseCssLengthToPx(extract.metrics.height);
  const viewBoxSize = parseViewBoxSize(extract.metrics.viewBox);
  const pinXs = extract.pinInfo.pins
    .map((pin) => pin.x)
    .filter((value): value is number => typeof value === "number");
  const pinYs = extract.pinInfo.pins
    .map((pin) => pin.y)
    .filter((value): value is number => typeof value === "number");
  const pinWidth =
    pinXs.length > 0 ? Math.max(...pinXs) - Math.min(...pinXs) + 12 : 0;
  const pinHeight =
    pinYs.length > 0 ? Math.max(...pinYs) - Math.min(...pinYs) + 12 : 0;

  const width = Math.max(
    16,
    widthFromCss ?? 0,
    viewBoxSize?.width ?? 0,
    pinWidth,
  );
  const height = Math.max(
    16,
    heightFromCss ?? 0,
    viewBoxSize?.height ?? 0,
    pinHeight,
  );

  return {
    width: Number(width.toFixed(2)),
    height: Number(height.toFixed(2)),
  };
}

function deriveRuntimeSupport(
  extract: WokwiSourceExtract,
): Pick<WokwiPartModel, "runtime" | "behaviorSupport"> {
  const propertyNames = extract.properties.map((property) => property.name);
  const propertySet = new Set(propertyNames);
  const staticProps = Object.fromEntries(
    extract.properties
      .map((property) => [property.name, parsePrimitiveDefault(property.defaultRaw)] as const)
      .filter((entry) => entry[1] !== undefined),
  ) as Record<string, string | number | boolean | null>;

  if (propertySet.has("pressed")) {
    return {
      runtime: {
        defaults: {
          profileId: "push_button",
          signalName: "press",
          targetId: "handle_primary",
          valueMin: 0,
          valueMax: 1,
          defaultValue: 0,
          travelAxis: "y",
          travelMin: 0,
          travelMax: 2.8,
          autoReset: true,
          offLabel: "up",
          onLabel: "down",
        },
        staticProps,
        propBindings: [
          {
            elementProp: "pressed",
            from: "defaultValue",
            transform: "boolean_gt_0.5",
          },
        ],
      },
      behaviorSupport: {
        status: "implemented",
        summary: "Momentary press state is editable.",
        capabilities: propertyNames,
      },
    };
  }

  if (propertySet.has("characters") || propertySet.has("imageData")) {
    return {
      runtime: {
        defaults: null,
        staticProps,
        propBindings: [],
      },
      behaviorSupport: {
        status: "placeholder",
        summary: "Display content/runtime hooks exist but need a dedicated text/image display profile.",
        capabilities: propertyNames,
      },
    };
  }

  if (
    propertyNames.some((name) => name.startsWith("led")) ||
    extract.id.includes("neopixel") ||
    extract.id.includes("led_ring") ||
    extract.id.includes("led_bar_graph")
  ) {
    return {
      runtime: {
        defaults: null,
        staticProps,
        propBindings: [],
      },
      behaviorSupport: {
        status: "placeholder",
        summary: "Light-output properties exist but need multi-channel or array-light runtime profiles.",
        capabilities: propertyNames,
      },
    };
  }

  if (propertyNames.includes("angle") || extract.id.includes("stepper")) {
    return {
      runtime: {
        defaults: null,
        staticProps,
        propBindings: [],
      },
      behaviorSupport: {
        status: "placeholder",
        summary: "Motion-related properties exist and should later map into a richer actuator runtime profile.",
        capabilities: propertyNames,
      },
    };
  }

  if (propertyNames.length > 0) {
    return {
      runtime: {
        defaults: null,
        staticProps,
        propBindings: [],
      },
      behaviorSupport: {
        status: "placeholder",
        summary: `Vendor runtime hooks detected: ${propertyNames.join(", ")}.`,
        capabilities: propertyNames,
      },
    };
  }

  return {
    runtime: {
      defaults: null,
      staticProps,
      propBindings: [],
    },
    behaviorSupport: {
      status: "static",
      summary: "No explicit editable runtime hooks were extracted from the vendor element.",
      capabilities: [],
    },
  };
}

function createGeneratedModel(extract: WokwiSourceExtract): WokwiPartModel {
  const libraryItemId = CURATED_ID_ALIASES[extract.id] ?? extract.id;
  const naturalSizePx = deriveNaturalSizePx(extract);
  const derived = deriveRuntimeSupport(extract);

  return {
    schema: "aura.wokwi_model.v1",
    libraryItemId,
    title: formatModelTitle(extract.id),
    sourceKind: "generated",
    wokwi: {
      tagName: extract.tagName,
      modulePath: `vendor_reference/wokwi-elements/src/${extract.sourceFile}`,
      naturalSizePx,
      allowOuterRotation: true,
    },
    pins: {
      labels: extract.pinInfo.pins.map((pin) => pin.name),
      anchors: extract.pinInfo.pins
        .filter((pin) => typeof pin.x === "number" && typeof pin.y === "number")
        .map((pin) => ({
          id: pin.name,
          x: pin.x as number,
          y: pin.y as number,
        })),
    },
    runtime: derived.runtime,
    behaviorSupport: derived.behaviorSupport,
  };
}

function applyWokwiCorrection(model: WokwiPartModel): WokwiPartModel {
  const correction =
    parsedCorrections.parts[model.libraryItemId] ?? parsedCorrections.parts[model.wokwi.tagName.replace(/^wokwi-/, "").replace(/-/g, "_")];
  if (!correction) {
    return model;
  }

  return {
    ...model,
    pins: {
      labels: model.pins.labels.map((label) => correction.pinLabelOverrides?.[label] ?? label),
      anchors: model.pins.anchors.map((anchor) => {
        const override = correction.pinAnchorOverrides?.[anchor.id];
        const nextId = correction.pinLabelOverrides?.[anchor.id] ?? anchor.id;

        return {
          ...anchor,
          id: nextId,
          x: override?.x ?? anchor.x,
          y: override?.y ?? anchor.y,
        };
      }),
    },
    behaviorSupport: correction.notes
      ? {
          ...model.behaviorSupport,
          summary: `${model.behaviorSupport.summary} ${correction.notes}`.trim(),
        }
      : model.behaviorSupport,
  };
}

const curatedModelMap = new Map<string, WokwiPartModel>(
  curatedModels.map((model) => [
    model.libraryItemId,
    {
      ...model,
      sourceKind: "curated" as const,
      behaviorSupport: {
        status: (model.runtime.defaults ? "implemented" : "static") as WokwiBehaviorSupportStatus,
        summary: model.runtime.defaults
          ? "Editable runtime support is implemented."
          : "No editable runtime support is defined yet.",
        capabilities: model.runtime.propBindings.map((binding) => binding.elementProp),
      },
    },
  ]),
);

const generatedModels = Object.values(GENERATED_MODEL_TEXTS)
  .map((text) => JSON.parse(text) as WokwiSourceExtract)
  .sort((left, right) => left.id.localeCompare(right.id))
  .map(createGeneratedModel)
  .filter((model) => !curatedModelMap.has(model.libraryItemId));

export const WOKWI_MODELS = [...curatedModelMap.values(), ...generatedModels].map(applyWokwiCorrection);

export const WOKWI_MODEL_MAP = Object.freeze(
  Object.fromEntries(WOKWI_MODELS.map((model) => [model.libraryItemId, model])),
) as Record<string, WokwiPartModel>;

export function getWokwiModel(libraryItemId: string) {
  return WOKWI_MODEL_MAP[libraryItemId] ?? null;
}

export function hasWokwiModel(libraryItemId: string) {
  return getWokwiModel(libraryItemId) != null;
}

export function getWokwiPinLabels(libraryItemId: string) {
  return getWokwiModel(libraryItemId)?.pins.labels ?? [];
}

export function getWokwiRuntimeDefaults(libraryItemId: string) {
  return getWokwiModel(libraryItemId)?.runtime.defaults ?? null;
}

export function getWokwiBehaviorSupport(libraryItemId: string) {
  return getWokwiModel(libraryItemId)?.behaviorSupport ?? null;
}
