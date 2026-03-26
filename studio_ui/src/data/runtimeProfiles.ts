import {
  createDefaultBehaviorDraftState,
  type BehaviorDraftState,
  type BehaviorTargetSlot,
} from "./behaviorLibrary";
import { getLibraryItem } from "./componentCatalog";
import { getWokwiRuntimeDefaults } from "../wokwi/wokwiCatalog";

export type RuntimeProfileId =
  | "none"
  | "light_output"
  | "push_button"
  | "potentiometer"
  | "slide_switch"
  | "toggle_switch"
  | "servo_angle";

export type RuntimeProfileFamily = "display" | "input" | "output";

export interface RuntimeProfileDefinition {
  id: RuntimeProfileId;
  label: string;
  short: string;
  family: RuntimeProfileFamily;
  description: string;
  defaultTargetId: BehaviorTargetSlot["id"];
}

export interface RuntimeProfileState {
  profileId: RuntimeProfileId;
  signalName: string;
  targetId: BehaviorTargetSlot["id"];
  valueMin: number;
  valueMax: number;
  defaultValue: number;
  angleMin: number;
  angleMax: number;
  travelAxis: "x" | "y";
  travelMin: number;
  travelMax: number;
  lowVisual: number;
  highVisual: number;
  detentCount: number;
  autoReset: boolean;
  offLabel: string;
  onLabel: string;
  lightColor: string;
}

export const RUNTIME_PROFILE_DEFINITIONS: RuntimeProfileDefinition[] = [
  {
    id: "none",
    label: "No Runtime",
    short: "None",
    family: "display",
    description: "Visual-only component with no editable runtime state attached yet.",
    defaultTargetId: "body_primary",
  },
  {
    id: "light_output",
    label: "Light Output",
    short: "Light",
    family: "display",
    description: "Brightness-driven indicator output for LEDs, lenses, and light surfaces.",
    defaultTargetId: "indicator_primary",
  },
  {
    id: "push_button",
    label: "Push Button",
    short: "Button",
    family: "input",
    description: "Momentary push input with press travel, state labels, and optional auto-return.",
    defaultTargetId: "handle_primary",
  },
  {
    id: "potentiometer",
    label: "Potentiometer",
    short: "Pot",
    family: "input",
    description: "Rotary analog input with a value range, angle sweep, and optional detents.",
    defaultTargetId: "handle_primary",
  },
  {
    id: "slide_switch",
    label: "Slide Switch",
    short: "Slide",
    family: "input",
    description: "Binary sliding input that moves a handle along one axis.",
    defaultTargetId: "handle_primary",
  },
  {
    id: "toggle_switch",
    label: "Toggle Switch",
    short: "Toggle",
    family: "input",
    description: "Latched two-state lever input with clear off/on naming.",
    defaultTargetId: "handle_primary",
  },
  {
    id: "servo_angle",
    label: "Servo Angle",
    short: "Servo",
    family: "output",
    description: "Angle-driven actuator output with a bounded motion range.",
    defaultTargetId: "body_primary",
  },
];

const RUNTIME_PROFILE_MAP = Object.freeze(
  Object.fromEntries(RUNTIME_PROFILE_DEFINITIONS.map((profile) => [profile.id, profile])),
);

function roundTo(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function normalizePair(minValue: number, maxValue: number) {
  return minValue <= maxValue
    ? [roundTo(minValue), roundTo(maxValue)]
    : [roundTo(maxValue), roundTo(minValue)];
}

export function getRuntimeProfileDefinition(profileId: RuntimeProfileId | string) {
  return RUNTIME_PROFILE_MAP[profileId as RuntimeProfileId] ?? RUNTIME_PROFILE_DEFINITIONS[0];
}

export function createDefaultRuntimeProfileState(): RuntimeProfileState {
  return {
    profileId: "none",
    signalName: "value",
    targetId: "body_primary",
    valueMin: 0,
    valueMax: 100,
    defaultValue: 0,
    angleMin: -120,
    angleMax: 120,
    travelAxis: "x",
    travelMin: -14,
    travelMax: 14,
    lowVisual: 0.1,
    highVisual: 0.95,
    detentCount: 12,
    autoReset: false,
    offLabel: "off",
    onLabel: "on",
    lightColor: "#ff5a5a",
  };
}

export function normalizeRuntimeProfileState(
  profile: Partial<RuntimeProfileState> | RuntimeProfileState | null | undefined,
) {
  return {
    ...createDefaultRuntimeProfileState(),
    ...(profile ?? {}),
  };
}

export function getDefaultRuntimeProfileForLibraryItem(libraryItemId: string): RuntimeProfileState | null {
  const base = createDefaultRuntimeProfileState();
  const wokwiDefaults = getWokwiRuntimeDefaults(libraryItemId);
  const libraryItem = getLibraryItem(libraryItemId);

  if (wokwiDefaults) {
    return {
      ...base,
      ...wokwiDefaults,
    };
  }

  switch (libraryItem.package.kind) {
    case "led":
      return {
        ...base,
        profileId: "light_output",
        signalName: "brightness",
        targetId: "indicator_primary",
        valueMin: 0,
        valueMax: 100,
        defaultValue: 0,
        lightColor: libraryItemId === "led_0603" ? "#41e37a" : "#ff5252",
      };
    case "button":
      return {
        ...base,
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
      };
    case "potentiometer":
      return {
        ...base,
        profileId: "potentiometer",
        signalName: "value",
        targetId: "handle_primary",
        valueMin: 0,
        valueMax: 1023,
        defaultValue: 512,
        angleMin: -135,
        angleMax: 135,
        detentCount: 24,
      };
    case "slide_switch":
      return {
        ...base,
        profileId: "slide_switch",
        signalName: "state",
        targetId: "handle_primary",
        valueMin: 0,
        valueMax: 1,
        defaultValue: 0,
        travelAxis: "x",
        travelMin: -18,
        travelMax: 18,
        offLabel: "left",
        onLabel: "right",
      };
    case "toggle_switch":
      return {
        ...base,
        profileId: "toggle_switch",
        signalName: "state",
        targetId: "handle_primary",
        valueMin: 0,
        valueMax: 1,
        defaultValue: 0,
        angleMin: -22,
        angleMax: 22,
        offLabel: "off",
        onLabel: "on",
      };
    case "servo":
      return {
        ...base,
        profileId: "servo_angle",
        signalName: "angle",
        targetId: "body_primary",
        valueMin: 0,
        valueMax: 180,
        defaultValue: 90,
        angleMin: 0,
        angleMax: 180,
      };
    default:
      break;
  }

  switch (libraryItemId) {
    default:
      return null;
  }
}

export function createRuntimeProfileStateFromBehaviorDraft(
  draft: Partial<BehaviorDraftState> | null | undefined,
): RuntimeProfileState {
  const base = createDefaultRuntimeProfileState();
  if (!draft || typeof draft !== "object") {
    return base;
  }

  const presetId = draft.presetId ?? base.profileId;
  if (presetId === "light_emitter") {
    return {
      ...base,
      profileId: "light_output",
      signalName: draft.property ?? "brightness",
      targetId: (draft.targetId as BehaviorTargetSlot["id"]) ?? "indicator_primary",
      valueMin: draft.valueMin ?? 0,
      valueMax: draft.valueMax ?? 100,
      lowVisual: draft.opacityMin ?? base.lowVisual,
      highVisual: draft.opacityMax ?? base.highVisual,
      lightColor: draft.baseColor ?? base.lightColor,
      defaultValue: draft.valueMin ?? 0,
    };
  }

  if (presetId === "linear_slider" || presetId === "translate_actor") {
    return {
      ...base,
      profileId: "slide_switch",
      signalName: draft.property ?? "state",
      targetId: (draft.targetId as BehaviorTargetSlot["id"]) ?? "handle_primary",
      travelAxis: draft.axis ?? "x",
      travelMin: draft.distanceMin ?? base.travelMin,
      travelMax: draft.distanceMax ?? base.travelMax,
      valueMin: draft.valueMin ?? 0,
      valueMax: draft.valueMax ?? 1,
      defaultValue: draft.valueMin ?? 0,
      autoReset: draft.autoReset ?? false,
      offLabel: "left",
      onLabel: "right",
    };
  }

  if (presetId === "press_button") {
    return {
      ...base,
      profileId: "push_button",
      signalName: draft.property ?? "press",
      targetId: (draft.targetId as BehaviorTargetSlot["id"]) ?? "handle_primary",
      travelAxis: "y",
      travelMin: 0,
      travelMax: draft.pressDepth ?? 2.8,
      valueMin: draft.valueMin ?? 0,
      valueMax: draft.valueMax ?? 1,
      defaultValue: draft.valueMin ?? 0,
      autoReset: draft.autoReset ?? true,
      offLabel: "up",
      onLabel: "down",
    };
  }

  if (presetId === "toggle_button") {
    return {
      ...base,
      profileId: "toggle_switch",
      signalName: draft.property ?? "state",
      targetId: (draft.targetId as BehaviorTargetSlot["id"]) ?? "handle_primary",
      valueMin: 0,
      valueMax: 1,
      defaultValue: 0,
      angleMin: draft.angleMin ?? -18,
      angleMax: draft.angleMax ?? 18,
      offLabel: "off",
      onLabel: "on",
    };
  }

  if (presetId === "snap_rotation") {
    return {
      ...base,
      profileId: "potentiometer",
      signalName: draft.property ?? "value",
      targetId: (draft.targetId as BehaviorTargetSlot["id"]) ?? "handle_primary",
      valueMin: draft.valueMin ?? 0,
      valueMax: draft.valueMax ?? 100,
      defaultValue: draft.valueMin ?? 0,
      angleMin: draft.angleMin ?? base.angleMin,
      angleMax: draft.angleMax ?? base.angleMax,
      detentCount: draft.detentCount ?? base.detentCount,
    };
  }

  if (presetId === "rotate_actor") {
    return {
      ...base,
      profileId: "servo_angle",
      signalName: draft.property ?? "angle",
      targetId: (draft.targetId as BehaviorTargetSlot["id"]) ?? "body_primary",
      valueMin: draft.valueMin ?? 0,
      valueMax: draft.valueMax ?? 180,
      defaultValue: draft.valueMin ?? 90,
      angleMin: draft.angleMin ?? 0,
      angleMax: draft.angleMax ?? 180,
    };
  }

  return base;
}

export function createBehaviorDraftFromRuntimeProfile(
  profile: RuntimeProfileState,
  previousDraft?: BehaviorDraftState,
): BehaviorDraftState {
  const nextDraft = {
    ...createDefaultBehaviorDraftState(),
    ...(previousDraft ?? {}),
  };

  if (profile.profileId === "none") {
    return {
      ...nextDraft,
      presetId: "light_emitter",
      targetId: "body_primary",
      property: profile.signalName,
      opacityMin: 0.08,
      opacityMax: 0.22,
      glowEnabled: false,
      baseColor: "#ffffff",
    };
  }

  if (profile.profileId === "light_output") {
    return {
      ...nextDraft,
      presetId: "light_emitter",
      targetId: profile.targetId,
      property: profile.signalName,
      valueMin: profile.valueMin,
      valueMax: profile.valueMax,
      baseColor: profile.lightColor,
      glowColor: profile.lightColor,
      opacityMin: profile.lowVisual,
      opacityMax: profile.highVisual,
      glowEnabled: true,
    };
  }

  if (profile.profileId === "potentiometer") {
    return {
      ...nextDraft,
      presetId: "snap_rotation",
      targetId: profile.targetId,
      property: profile.signalName,
      valueMin: profile.valueMin,
      valueMax: profile.valueMax,
      angleMin: profile.angleMin,
      angleMax: profile.angleMax,
      detentCount: profile.detentCount,
      autoReset: false,
    };
  }

  if (profile.profileId === "slide_switch") {
    return {
      ...nextDraft,
      presetId: "linear_slider",
      targetId: profile.targetId,
      property: profile.signalName,
      axis: profile.travelAxis,
      valueMin: profile.valueMin,
      valueMax: profile.valueMax,
      distanceMin: profile.travelMin,
      distanceMax: profile.travelMax,
      autoReset: profile.autoReset,
    };
  }

  if (profile.profileId === "push_button") {
    return {
      ...nextDraft,
      presetId: "press_button",
      targetId: profile.targetId,
      property: profile.signalName,
      valueMin: profile.valueMin,
      valueMax: profile.valueMax,
      pressDepth: Math.max(
        Math.abs(profile.travelMin),
        Math.abs(profile.travelMax),
      ),
      autoReset: profile.autoReset,
    };
  }

  if (profile.profileId === "toggle_switch") {
    return {
      ...nextDraft,
      presetId: "snap_rotation",
      targetId: profile.targetId,
      property: profile.signalName,
      valueMin: 0,
      valueMax: 1,
      angleMin: profile.angleMin,
      angleMax: profile.angleMax,
      detentCount: 2,
      autoReset: false,
    };
  }

  return {
    ...nextDraft,
    presetId: "rotate_actor",
    targetId: profile.targetId,
    property: profile.signalName,
    valueMin: profile.valueMin,
    valueMax: profile.valueMax,
    angleMin: profile.angleMin,
    angleMax: profile.angleMax,
    autoReset: false,
  };
}

export function createCompiledRuntimeProfile(profile: RuntimeProfileState) {
  if (profile.profileId === "none") {
    return {
      kind: "none" as const,
      entry: {
        type: "none",
        signal: null,
      },
    };
  }

  if (profile.profileId === "light_output") {
    return {
      kind: "display" as const,
      entry: {
        type: "light_output",
        signal: profile.signalName,
        target: profile.targetId,
        range: normalizePair(profile.valueMin, profile.valueMax),
        defaultValue: roundTo(profile.defaultValue),
        color: profile.lightColor,
        opacityRange: normalizePair(profile.lowVisual, profile.highVisual),
      },
    };
  }

  if (profile.profileId === "push_button") {
    return {
      kind: "input" as const,
      entry: {
        type: "push_button",
        signal: profile.signalName,
        target: profile.targetId,
        states: [profile.offLabel, profile.onLabel],
        defaultState: roundTo(profile.defaultValue, 0),
        axis: profile.travelAxis,
        translateRange: normalizePair(profile.travelMin, profile.travelMax),
        valueRange: normalizePair(profile.valueMin, profile.valueMax),
        autoReset: profile.autoReset,
      },
    };
  }

  if (profile.profileId === "potentiometer") {
    return {
      kind: "input" as const,
      entry: {
        type: "potentiometer",
        signal: profile.signalName,
        target: profile.targetId,
        range: normalizePair(profile.valueMin, profile.valueMax),
        defaultValue: roundTo(profile.defaultValue),
        angleRange: normalizePair(profile.angleMin, profile.angleMax),
        detents: Math.max(0, Math.round(profile.detentCount)),
      },
    };
  }

  if (profile.profileId === "slide_switch") {
    return {
      kind: "input" as const,
      entry: {
        type: "slide_switch",
        signal: profile.signalName,
        target: profile.targetId,
        states: [profile.offLabel, profile.onLabel],
        defaultState: roundTo(profile.defaultValue, 0),
        axis: profile.travelAxis,
        translateRange: normalizePair(profile.travelMin, profile.travelMax),
        valueRange: normalizePair(profile.valueMin, profile.valueMax),
        autoReset: profile.autoReset,
      },
    };
  }

  if (profile.profileId === "toggle_switch") {
    return {
      kind: "input" as const,
      entry: {
        type: "toggle_switch",
        signal: profile.signalName,
        target: profile.targetId,
        states: [profile.offLabel, profile.onLabel],
        defaultState: roundTo(profile.defaultValue, 0),
        angleRange: normalizePair(profile.angleMin, profile.angleMax),
      },
    };
  }

  return {
    kind: "output" as const,
    entry: {
      type: "servo_angle",
      signal: profile.signalName,
      target: profile.targetId,
      range: normalizePair(profile.valueMin, profile.valueMax),
      defaultValue: roundTo(profile.defaultValue),
      angleRange: normalizePair(profile.angleMin, profile.angleMax),
    },
  };
}
