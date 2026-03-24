export type BehaviorPresetFamily = "visual" | "motion" | "interaction" | "snap";
export type BehaviorDraftKind = "behaviorHelper" | "interactive";
export type BehaviorTargetRole = "body" | "overlay" | "indicator" | "handle" | "label" | "pins";
export type LightTargetSourceMode = "existingTarget" | "helperShape";
export type HelperShapeKind = "circle" | "rect";

export interface BehaviorTargetSlot {
  id: string;
  label: string;
  role: BehaviorTargetRole;
  description: string;
}

export interface BehaviorPreset {
  id: string;
  label: string;
  short: string;
  family: BehaviorPresetFamily;
  kind: BehaviorDraftKind;
  description: string;
  targetRoles: BehaviorTargetRole[];
  defaultProperty: string;
}

export interface BehaviorDraftState {
  presetId: string;
  targetId: string;
  property: string;
  valueMin: number;
  valueMax: number;
  angleMin: number;
  angleMax: number;
  axis: "x" | "y";
  distanceMin: number;
  distanceMax: number;
  originX: number;
  originY: number;
  glowX: number;
  glowY: number;
  glowRadius: number;
  glowBlur: number;
  glowColor: string;
  baseColor: string;
  opacityMin: number;
  opacityMax: number;
  blinkPeriodMs: number;
  blinkDutyCycle: number;
  pressDepth: number;
  detentCount: number;
  autoReset: boolean;
  lightTargetSourceMode: LightTargetSourceMode;
  helperShapeKind: HelperShapeKind;
  helperX: number;
  helperY: number;
  helperWidth: number;
  helperHeight: number;
  helperRadius: number;
  glowEnabled: boolean;
}

export const COMPONENT_CREATOR_TARGETS: BehaviorTargetSlot[] = [
  {
    id: "body_primary",
    label: "Primary Body",
    role: "body",
    description: "Main package body, lens, cap, or actuator shell.",
  },
  {
    id: "indicator_primary",
    label: "Indicator",
    role: "indicator",
    description: "LED lens, marker, notch, or visual state element.",
  },
  {
    id: "overlay_primary",
    label: "Overlay Layer",
    role: "overlay",
    description: "Synthetic glow, highlight, aura, or visibility helper layer.",
  },
  {
    id: "handle_primary",
    label: "Interactive Handle",
    role: "handle",
    description: "Rotary shaft, slider thumb, push surface, or switch lever.",
  },
  {
    id: "label_primary",
    label: "Label Layer",
    role: "label",
    description: "Dynamic text, scale marks, or visible state labels.",
  },
  {
    id: "pins_primary",
    label: "Pin Group",
    role: "pins",
    description: "Pin strip or exposed connection group for blinking or state cues.",
  },
];

export const BEHAVIOR_PRESETS: BehaviorPreset[] = [
  {
    id: "light_emitter",
    label: "Light Emitter",
    short: "Light",
    family: "visual",
    kind: "behaviorHelper",
    description: "Uses an existing target or helper shape as a lit surface with brightness and glow.",
    targetRoles: ["body", "indicator", "overlay"],
    defaultProperty: "brightness",
  },
  {
    id: "glow_overlay",
    label: "Glow Overlay",
    short: "Glow",
    family: "visual",
    kind: "behaviorHelper",
    description: "Adds a blurred halo that tracks brightness or status on an LED or indicator.",
    targetRoles: ["overlay", "indicator"],
    defaultProperty: "brightness",
  },
  {
    id: "blink_output",
    label: "Blink Output",
    short: "Blink",
    family: "visual",
    kind: "behaviorHelper",
    description: "Generates a timed blink envelope for indicators, overlays, or visible outputs.",
    targetRoles: ["overlay", "indicator", "pins"],
    defaultProperty: "state",
  },
  {
    id: "rotate_actor",
    label: "Rotate Actor",
    short: "Rotate",
    family: "motion",
    kind: "interactive",
    description: "Rotates a target around a chosen pivot from one value range to another.",
    targetRoles: ["body", "handle", "indicator"],
    defaultProperty: "value",
  },
  {
    id: "translate_actor",
    label: "Translate Actor",
    short: "Translate",
    family: "motion",
    kind: "interactive",
    description: "Slides a target along one axis for faders, switches, and travel-based parts.",
    targetRoles: ["body", "handle", "indicator", "label"],
    defaultProperty: "position",
  },
  {
    id: "press_button",
    label: "Press Action",
    short: "Press",
    family: "interaction",
    kind: "interactive",
    description: "Defines press travel and optional auto-return for buttons and tactile controls.",
    targetRoles: ["body", "handle", "indicator"],
    defaultProperty: "press",
  },
  {
    id: "toggle_button",
    label: "Toggle Action",
    short: "Toggle",
    family: "interaction",
    kind: "interactive",
    description: "Defines a latched on/off control with two stable visual states.",
    targetRoles: ["body", "handle", "indicator", "label"],
    defaultProperty: "toggle",
  },
  {
    id: "linear_slider",
    label: "Linear Slider",
    short: "Slider",
    family: "interaction",
    kind: "interactive",
    description: "Maps a slider handle or thumb across a travel range.",
    targetRoles: ["handle", "body", "label"],
    defaultProperty: "position",
  },
  {
    id: "snap_rotation",
    label: "Snap Rotation",
    short: "Detent",
    family: "snap",
    kind: "interactive",
    description: "Adds rotary detents or indexed snapping for knobs and selectors.",
    targetRoles: ["handle", "indicator", "label"],
    defaultProperty: "index",
  },
];

const PRESET_MAP = Object.freeze(
  Object.fromEntries(BEHAVIOR_PRESETS.map((preset) => [preset.id, preset])),
);

function sanitizeIdPart(value: string, fallback: string) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function roundTo(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function normalizePair(minValue: number, maxValue: number) {
  return minValue <= maxValue
    ? [roundTo(minValue), roundTo(maxValue)]
    : [roundTo(maxValue), roundTo(minValue)];
}

function createEmitterSource(draft: BehaviorDraftState) {
  if (draft.lightTargetSourceMode === "helperShape") {
    return {
      type: "helper_shape",
      shape: {
        kind: draft.helperShapeKind,
        center: [roundTo(draft.helperX), roundTo(draft.helperY)],
        size: [
          roundTo(Math.max(8, draft.helperWidth)),
          roundTo(Math.max(8, draft.helperHeight)),
        ],
        cornerRadius: roundTo(Math.max(0, draft.helperRadius)),
      },
    };
  }

  return {
    type: "target_slot",
    target: sanitizeIdPart(draft.targetId, "target"),
  };
}

export function getBehaviorPreset(presetId: string) {
  return PRESET_MAP[presetId] ?? BEHAVIOR_PRESETS[0];
}

export function getCompatibleBehaviorTargets(presetId: string) {
  const preset = getBehaviorPreset(presetId);
  return COMPONENT_CREATOR_TARGETS.filter((slot) => preset.targetRoles.includes(slot.role));
}

export function createDefaultBehaviorDraftState(): BehaviorDraftState {
  const defaultPreset = BEHAVIOR_PRESETS[0];
  const defaultTarget = getCompatibleBehaviorTargets(defaultPreset.id)[0];

  return {
    presetId: defaultPreset.id,
    targetId: defaultTarget?.id ?? COMPONENT_CREATOR_TARGETS[0].id,
    property: defaultPreset.defaultProperty,
    valueMin: 0,
    valueMax: 100,
    angleMin: -135,
    angleMax: 135,
    axis: "x",
    distanceMin: -12,
    distanceMax: 12,
    originX: 0,
    originY: 0,
    glowX: 0,
    glowY: 0,
    glowRadius: 18,
    glowBlur: 12,
    glowColor: "#ff5a5a",
    baseColor: "#ff5a5a",
    opacityMin: 0.08,
    opacityMax: 0.94,
    blinkPeriodMs: 420,
    blinkDutyCycle: 50,
    pressDepth: 2.4,
    detentCount: 12,
    autoReset: true,
    lightTargetSourceMode: "existingTarget",
    helperShapeKind: "circle",
    helperX: 0,
    helperY: 0,
    helperWidth: 56,
    helperHeight: 56,
    helperRadius: 14,
    glowEnabled: true,
  };
}

export function createBehaviorDraftEntry(draft: BehaviorDraftState) {
  const preset = getBehaviorPreset(draft.presetId);
  const target = sanitizeIdPart(draft.targetId, "target");

  if (preset.id === "light_emitter") {
    const glowReachStart = Math.max(4, draft.glowRadius * 0.45);
    const glowReachEnd = Math.max(glowReachStart + 2, draft.glowRadius + draft.glowBlur * 0.6);

    return {
      kind: "behaviorHelper" as const,
      entry: {
        id: `${target}_light`,
        type: "light_emitter",
        property: draft.property,
        source: createEmitterSource(draft),
        range: normalizePair(draft.valueMin, draft.valueMax),
        baseColor: draft.baseColor,
        opacityRange: normalizePair(draft.opacityMin, draft.opacityMax),
        glow: {
          enabled: draft.glowEnabled,
          color: draft.baseColor,
          reachRange: normalizePair(glowReachStart, glowReachEnd),
          blur: roundTo(Math.max(0, draft.glowBlur)),
          opacityRange: normalizePair(
            Math.max(0.02, draft.opacityMin * 0.3),
            Math.min(1, draft.opacityMax * 0.72),
          ),
        },
      },
    };
  }

  if (preset.id === "glow_overlay") {
    return {
      kind: "behaviorHelper" as const,
      entry: {
        id: `${target}_glow`,
        type: "glow_overlay",
        property: draft.property,
        target,
        center: [roundTo(draft.glowX), roundTo(draft.glowY)],
        radius: roundTo(Math.max(1, draft.glowRadius)),
        blur: roundTo(Math.max(0, draft.glowBlur)),
        color: draft.glowColor,
        range: normalizePair(draft.valueMin, draft.valueMax),
        opacityRange: normalizePair(draft.opacityMin, draft.opacityMax),
      },
    };
  }

  if (preset.id === "blink_output") {
    return {
      kind: "behaviorHelper" as const,
      entry: {
        id: `${target}_blink`,
        type: "blink_overlay",
        property: draft.property,
        target,
        range: normalizePair(draft.valueMin, draft.valueMax),
        periodMs: roundTo(Math.max(60, draft.blinkPeriodMs), 0),
        dutyCycle: roundTo(Math.min(95, Math.max(5, draft.blinkDutyCycle)), 0),
        color: draft.glowColor,
        opacityRange: normalizePair(draft.opacityMin, draft.opacityMax),
      },
    };
  }

  if (preset.id === "rotate_actor") {
    return {
      kind: "interactive" as const,
      entry: {
        id: `${target}_rotate`,
        type: "rotate",
        target,
        property: draft.property,
        match: "exact",
        range: normalizePair(draft.valueMin, draft.valueMax),
        angleRange: normalizePair(draft.angleMin, draft.angleMax),
        transformOrigin: [roundTo(draft.originX), roundTo(draft.originY)],
      },
    };
  }

  if (preset.id === "translate_actor" || preset.id === "linear_slider") {
    return {
      kind: "interactive" as const,
      entry: {
        id: `${target}_${draft.axis}_translate`,
        type: preset.id === "linear_slider" ? "linear" : "translate",
        target,
        property: draft.property,
        match: "exact",
        axis: draft.axis,
        range: normalizePair(draft.valueMin, draft.valueMax),
        translateRange: normalizePair(draft.distanceMin, draft.distanceMax),
        autoReset: preset.id === "linear_slider" ? false : draft.autoReset,
      },
    };
  }

  if (preset.id === "press_button") {
    return {
      kind: "interactive" as const,
      entry: {
        id: `${target}_press`,
        type: "press",
        target,
        property: draft.property,
        match: "exact",
        range: normalizePair(draft.valueMin, draft.valueMax),
        pressDepth: roundTo(Math.max(0.2, draft.pressDepth)),
        autoReset: draft.autoReset,
      },
    };
  }

  if (preset.id === "toggle_button") {
    return {
      kind: "interactive" as const,
      entry: {
        id: `${target}_toggle`,
        type: "toggle",
        target,
        property: draft.property,
        match: "exact",
        states: [0, 1],
        labels: ["off", "on"],
      },
    };
  }

  return {
    kind: "interactive" as const,
    entry: {
      id: `${target}_snap_rotation`,
      type: "angle_to_value",
      target,
      property: draft.property,
      match: "exact",
      range: normalizePair(draft.valueMin, draft.valueMax),
      angleRange: normalizePair(draft.angleMin, draft.angleMax),
      detents: roundTo(Math.max(2, draft.detentCount), 0),
      transformOrigin: [roundTo(draft.originX), roundTo(draft.originY)],
    },
  };
}
