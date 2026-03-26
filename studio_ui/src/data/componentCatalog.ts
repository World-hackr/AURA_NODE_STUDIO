export const GRID_UM = 2540;
export const PLACEMENT_GRID_UM = 635;
export const ROUTING_GRID_UM = 10;
export const UM_TO_PX = 0.01;

import { getWokwiPinLabels, WOKWI_MODELS } from "../wokwi/wokwiCatalog";

export type LibraryFamilyId =
  | "integrated"
  | "connectors"
  | "power"
  | "discretes"
  | "controls";

export type LibrarySurfaceId = "circuit_studio" | "component_lab";
export type CircuitCategoryId =
  | "wokwi"
  | "symbols"
  | "boards"
  | "microcontrollers"
  | "timers_logic"
  | "passives"
  | "indicators"
  | "displays"
  | "sensors"
  | "modules"
  | "power"
  | "actuators"
  | "connectors"
  | "switches";

export type PackageKind =
  | "dip"
  | "soic"
  | "qfp"
  | "sot23"
  | "chip2"
  | "header"
  | "to220"
  | "led"
  | "resistor"
  | "capacitor"
  | "button"
  | "potentiometer"
  | "slide_switch"
  | "toggle_switch"
  | "servo";

export type ResizeHandle = "east" | "south" | "corner";

export interface PinDefinition {
  id: string;
  label: string;
}

export interface PackageDefinition {
  kind: PackageKind;
  packageKey: string;
  packagePrefix?: string;
  bodyWidthUm: number;
  bodyHeightUm: number;
  pinPitchUm: number;
  rowSpacingUm?: number;
  connectorStyle?:
    | "pin-header"
    | "female-header"
    | "jst-ph"
    | "terminal-block"
    | "idc-box"
    | "usb-shell"
    | "power-gnd"
    | "power-vcc"
    | "power-3v3"
    | "power-5v";
  pins: PinDefinition[];
  defaultColor?: string;
}

export interface ComponentPackageState {
  pinCount?: number;
  widthMode?: "narrow" | "wide";
  widthUm?: number;
  columnCount?: number;
}

export interface ResizeBehavior {
  mode: "fixed" | "dip-step" | "linear-pin-step" | "mapped-pin-step";
  minPins?: number;
  maxPins?: number;
  pinStep?: number;
  allowWide?: boolean;
  fixedColumnCount?: number;
  fixedRowCount?: number;
  allowedPinCounts?: number[];
  pinSizeMap?: Record<number, {
    packageKey: string;
    bodyWidthUm: number;
    bodyHeightUm: number;
    pinPitchUm?: number;
  }>;
}

export interface LibraryItem {
  id: string;
  family: LibraryFamilyId;
  seriesId: string;
  seriesLabel: string;
  variantLabel: string;
  title: string;
  description: string;
  referencePrefix: string;
  package: PackageDefinition;
  resizeBehavior: ResizeBehavior;
  surfaces?: LibrarySurfaceId[];
  circuitCategory?: CircuitCategoryId;
  source?: "native" | "wokwi" | "kicad" | "blend";
  keywords?: string[];
}

export interface LibraryFamily {
  id: LibraryFamilyId;
  label: string;
  description: string;
}

export interface LibrarySeries {
  id: string;
  family: LibraryFamilyId;
  label: string;
  description: string;
  referencePrefix: string;
  items: LibraryItem[];
}

export interface CircuitCategory {
  id: CircuitCategoryId;
  label: string;
  shortLabel: string;
  description: string;
}

function numericPins(count: number): PinDefinition[] {
  return Array.from({ length: count }, (_, index) => {
    const label = String(index + 1);
    return { id: label, label };
  });
}

function namedPins(labels: string[]): PinDefinition[] {
  return labels.map((label) => ({ id: label, label }));
}

function fixedLibraryItem(
  item: Omit<LibraryItem, "resizeBehavior"> & { resizeBehavior?: ResizeBehavior },
): LibraryItem {
  return {
    ...item,
    resizeBehavior: item.resizeBehavior ?? {
      mode: "fixed",
    },
    surfaces: item.surfaces ?? ["circuit_studio", "component_lab"],
    source: item.source ?? "native",
    keywords: item.keywords ?? [],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export const LIBRARY_FAMILIES: LibraryFamily[] = [
  {
    id: "integrated",
    label: "Integrated",
    description: "Through-hole and SMD IC package bodies for logic, control, and MCU placement.",
  },
  {
    id: "connectors",
    label: "Connectors",
    description: "Headers, board connectors, and terminal entry points.",
  },
  {
    id: "power",
    label: "Power",
    description: "Regulators, transistor packages, and power-stage placeholders.",
  },
  {
    id: "discretes",
    label: "Discretes",
    description: "Passive support parts, LEDs, diodes, and small two-terminal SMD bodies.",
  },
  {
    id: "controls",
    label: "Controls",
    description: "Basic tactile interaction parts.",
  },
];

export const CIRCUIT_CATEGORIES: CircuitCategory[] = [
  {
    id: "symbols",
    label: "Symbols",
    shortLabel: "nets",
    description: "Power and rail symbols for cleaner circuit layouts.",
  },
  {
    id: "boards",
    label: "Boards",
    shortLabel: "board",
    description: "Complete dev boards and controller carrier boards from the Wokwi reference set.",
  },
  {
    id: "microcontrollers",
    label: "Microcontrollers",
    shortLabel: "mcu",
    description: "Concrete MCU packages used directly in real circuits.",
  },
  {
    id: "timers_logic",
    label: "Timers And Logic",
    shortLabel: "logic",
    description: "Concrete timers, shift registers, and logic ICs.",
  },
  {
    id: "passives",
    label: "Passives",
    shortLabel: "passive",
    description: "Resistors, capacitors, ferrites, and other support parts.",
  },
  {
    id: "indicators",
    label: "Indicators",
    shortLabel: "led",
    description: "LEDs and diodes for feedback and simple protection.",
  },
  {
    id: "displays",
    label: "Displays",
    shortLabel: "display",
    description: "Character, OLED, TFT, segmented, and matrix display surfaces.",
  },
  {
    id: "sensors",
    label: "Sensors",
    shortLabel: "sense",
    description: "Analog, motion, distance, and environment sensor modules.",
  },
  {
    id: "modules",
    label: "Modules",
    shortLabel: "module",
    description: "Peripheral and utility modules such as clocks, storage, and interface boards.",
  },
  {
    id: "power",
    label: "Power",
    shortLabel: "rail",
    description: "Power-stage packages, regulators, and switching parts.",
  },
  {
    id: "actuators",
    label: "Actuators",
    shortLabel: "move",
    description: "Motors, servos, and motion-output parts used to test editable behaviors.",
  },
  {
    id: "connectors",
    label: "Connectors",
    shortLabel: "io",
    description: "Headers, JST, USB, and terminal entry parts.",
  },
  {
    id: "switches",
    label: "Switches",
    shortLabel: "input",
    description: "Buttons and human-input control parts.",
  },
];

const CIRCUIT_LIBRARY_HIDDEN_ITEM_IDS = new Set<string>([
  "led_0603",
  "resistor_0805",
  "capacitor_radial_01",
  "capacitor_0805",
  "ferrite_0805",
  "inductor_1210",
  "diode_sod123",
  "button_tact_6mm",
  "button_tact_smd",
  "toggle_switch_spdt",
  "to220_3",
  "sot23_pkg",
  "idc_box",
]);

const MANUAL_WOKWI_LIBRARY_ITEM_IDS = new Set<string>([
  "led_5mm",
  "resistor_axial_030",
  "potentiometer_knob",
  "slide_switch_spdt",
  "servo_micro",
]);

const WOKWI_BOARD_IDS = new Set<string>([
  "arduino_mega",
  "arduino_nano",
  "arduino_uno",
  "esp32_devkit_v1",
  "franzininho",
  "nano_rp2040_connect",
]);

const WOKWI_DISPLAY_IDS = new Set<string>([
  "7segment",
  "ili9341",
  "lcd1602",
  "lcd2004",
  "ssd1306",
  "led_bar_graph",
  "led_ring",
  "neopixel_matrix",
]);

const WOKWI_SENSOR_IDS = new Set<string>([
  "big_sound_sensor",
  "dht22",
  "flame_sensor",
  "gas_sensor",
  "hc_sr04",
  "heart_beat_sensor",
  "ir_receiver",
  "ntc_temperature_sensor",
  "photoresistor_sensor",
  "pir_motion_sensor",
  "small_sound_sensor",
  "tilt_switch",
]);

const WOKWI_MODULE_IDS = new Set<string>([
  "ds1307",
  "hx711",
  "microsd_card",
  "mpu6050",
]);

function estimateWokwiPinPitchUm(pinAnchors: Array<{ x: number; y: number }>) {
  if (pinAnchors.length < 2) {
    return GRID_UM;
  }

  const deltas = new Set<number>();
  const xs = [...new Set(pinAnchors.map((anchor) => anchor.x).sort((a, b) => a - b))];
  const ys = [...new Set(pinAnchors.map((anchor) => anchor.y).sort((a, b) => a - b))];

  for (let index = 1; index < xs.length; index += 1) {
    const delta = Math.round(Math.abs(xs[index] - xs[index - 1]) * 100);
    if (delta > 0) {
      deltas.add(delta);
    }
  }

  for (let index = 1; index < ys.length; index += 1) {
    const delta = Math.round(Math.abs(ys[index] - ys[index - 1]) * 100);
    if (delta > 0) {
      deltas.add(delta);
    }
  }

  return [...deltas].sort((left, right) => left - right)[0] ?? GRID_UM;
}

function getWokwiCircuitCategory(libraryItemId: string): CircuitCategoryId {
  if (WOKWI_BOARD_IDS.has(libraryItemId)) {
    return "boards";
  }
  if (WOKWI_DISPLAY_IDS.has(libraryItemId)) {
    return "displays";
  }
  if (WOKWI_SENSOR_IDS.has(libraryItemId)) {
    return "sensors";
  }
  if (WOKWI_MODULE_IDS.has(libraryItemId)) {
    return "modules";
  }
  if (
    libraryItemId.includes("pushbutton") ||
    libraryItemId.includes("switch") ||
    libraryItemId.includes("joystick") ||
    libraryItemId.includes("keypad") ||
    libraryItemId.includes("rotary") ||
    libraryItemId.includes("potentiometer") ||
    libraryItemId === "ky_040"
  ) {
    return "switches";
  }
  if (
    libraryItemId.includes("servo") ||
    libraryItemId.includes("stepper") ||
    libraryItemId.includes("buzzer") ||
    libraryItemId.includes("ks2e")
  ) {
    return "actuators";
  }
  if (
    libraryItemId.includes("led") ||
    libraryItemId.includes("neopixel")
  ) {
    return "indicators";
  }
  if (libraryItemId.includes("resistor")) {
    return "passives";
  }
  return "modules";
}

function getWokwiFamily(categoryId: CircuitCategoryId): LibraryFamilyId {
  switch (categoryId) {
    case "connectors":
      return "connectors";
    case "power":
      return "power";
    case "passives":
    case "indicators":
      return "discretes";
    case "switches":
    case "actuators":
      return "controls";
    default:
      return "integrated";
  }
}

function getWokwiPackageKind(libraryItemId: string): PackageKind {
  if (libraryItemId.includes("led") || libraryItemId.includes("neopixel")) {
    return "led";
  }
  if (libraryItemId.includes("resistor")) {
    return "resistor";
  }
  if (libraryItemId.includes("pushbutton")) {
    return "button";
  }
  if (libraryItemId.includes("potentiometer")) {
    return "potentiometer";
  }
  if (libraryItemId.includes("slide_switch")) {
    return "slide_switch";
  }
  if (libraryItemId.includes("servo")) {
    return "servo";
  }
  return "header";
}

function getWokwiReferencePrefix(categoryId: CircuitCategoryId, packageKind: PackageKind) {
  if (packageKind === "led") {
    return "D";
  }
  if (packageKind === "resistor") {
    return "R";
  }
  if (
    packageKind === "button" ||
    packageKind === "potentiometer" ||
    packageKind === "slide_switch" ||
    packageKind === "toggle_switch"
  ) {
    return "SW";
  }
  if (packageKind === "servo") {
    return "M";
  }
  if (categoryId === "displays") {
    return "DS";
  }
  if (categoryId === "sensors") {
    return "S";
  }
  return "U";
}

function getWokwiVariantLabel(status: "implemented" | "placeholder" | "static") {
  if (status === "implemented") {
    return "Runtime Ready";
  }
  if (status === "placeholder") {
    return "Behavior Pending";
  }
  return "Visual Ready";
}

function createGeneratedWokwiLibraryItems(): LibraryItem[] {
  return WOKWI_MODELS.filter(
    (model) => !MANUAL_WOKWI_LIBRARY_ITEM_IDS.has(model.libraryItemId),
  ).map((model) => {
    const categoryId = getWokwiCircuitCategory(model.libraryItemId);
    const packageKind = getWokwiPackageKind(model.libraryItemId);
    const pinPitchUm = estimateWokwiPinPitchUm(model.pins.anchors);
    const bodyWidthUm = Math.max(1600, Math.round(model.wokwi.naturalSizePx.width / UM_TO_PX));
    const bodyHeightUm = Math.max(1600, Math.round(model.wokwi.naturalSizePx.height / UM_TO_PX));
    const behaviorSuffix =
      model.behaviorSupport.status === "implemented"
        ? "Editable runtime preview is available."
        : model.behaviorSupport.status === "placeholder"
          ? `Behavior placeholder tracked: ${model.behaviorSupport.summary}`
          : model.behaviorSupport.summary;

    return fixedLibraryItem({
      id: model.libraryItemId,
      family: getWokwiFamily(categoryId),
      seriesId: `wokwi_${categoryId}`,
      seriesLabel: `Wokwi ${CIRCUIT_CATEGORIES.find((category) => category.id === categoryId)?.label ?? "Parts"}`,
      variantLabel: getWokwiVariantLabel(model.behaviorSupport.status),
      title: model.title,
      description: `${model.title} imported from the local Wokwi reference set. ${behaviorSuffix}`,
      referencePrefix: getWokwiReferencePrefix(categoryId, packageKind),
      surfaces: ["circuit_studio"],
      circuitCategory: categoryId,
      source: "wokwi",
      keywords: [
        model.libraryItemId,
        model.wokwi.tagName,
        ...model.behaviorSupport.capabilities,
        model.sourceKind,
      ],
      package: {
        kind: packageKind,
        packageKey: `WOKWI-${model.libraryItemId.toUpperCase().replace(/_/g, "-")}`,
        bodyWidthUm,
        bodyHeightUm,
        pinPitchUm,
        pins: namedPins(getWokwiPinLabels(model.libraryItemId)),
      },
    });
  });
}

const GENERATED_WOKWI_LIBRARY_ITEMS = createGeneratedWokwiLibraryItems();

export const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: "dip_body",
    family: "integrated",
    seriesId: "dip_th",
    seriesLabel: "DIP Through-Hole",
    variantLabel: "Resizable",
    title: "DIP Body",
    description: "Start as DIP-8 and drag the south or corner edge to step through pin counts.",
    referencePrefix: "U",
    resizeBehavior: {
      mode: "dip-step",
      minPins: 4,
      maxPins: 40,
      pinStep: 2,
      allowWide: true,
    },
    surfaces: ["component_lab"],
    source: "kicad",
    keywords: ["generic", "package", "dip", "authoring"],
    package: {
      kind: "dip",
      packageKey: "DIP-8_W0.3",
      bodyWidthUm: 7620,
      bodyHeightUm: GRID_UM * 4,
      pinPitchUm: GRID_UM,
      rowSpacingUm: 7620,
      pins: numericPins(8),
    },
  },
  {
    id: "header_strip",
    family: "connectors",
    seriesId: "header_grid",
    seriesLabel: "Male Header",
    variantLabel: "Resizable",
    title: "Male Header",
    description: "Pin header grid. Drag south to add rows and east to add columns.",
    referencePrefix: "J",
    resizeBehavior: {
      mode: "linear-pin-step",
      minPins: 2,
      maxPins: 40,
      pinStep: 1,
    },
    circuitCategory: "connectors",
    source: "kicad",
    keywords: ["header", "male", "pin", "2.54mm"],
    package: {
      kind: "header",
      packagePrefix: "HDR",
      packageKey: "HDR-1x4",
      bodyWidthUm: GRID_UM,
      bodyHeightUm: GRID_UM * 4,
      pinPitchUm: GRID_UM,
      connectorStyle: "pin-header",
      pins: numericPins(4),
    },
  },
  {
    id: "female_header",
    family: "connectors",
    seriesId: "female_header",
    seriesLabel: "Female Header",
    variantLabel: "Resizable",
    title: "Female Header",
    description: "Socket header grid. Drag south to add rows and east to add columns.",
    referencePrefix: "J",
    resizeBehavior: {
      mode: "linear-pin-step",
      minPins: 2,
      maxPins: 40,
      pinStep: 1,
    },
    circuitCategory: "connectors",
    source: "kicad",
    keywords: ["header", "female", "socket", "2.54mm"],
    package: {
      kind: "header",
      packagePrefix: "FHDR",
      packageKey: "FHDR-1x4",
      bodyWidthUm: GRID_UM,
      bodyHeightUm: GRID_UM * 4,
      pinPitchUm: GRID_UM,
      connectorStyle: "female-header",
      pins: numericPins(4),
    },
  },
  fixedLibraryItem({
    id: "soic_ic",
    family: "integrated",
    seriesId: "soic",
    seriesLabel: "SOIC",
    variantLabel: "Resizable",
    title: "SOIC IC",
    description: "Start as SOIC-8, then drag the corner to step through SOIC-14 and SOIC-16 sizes.",
    referencePrefix: "U",
    surfaces: ["component_lab"],
    source: "kicad",
    keywords: ["generic", "package", "soic", "authoring"],
    resizeBehavior: {
      mode: "mapped-pin-step",
      minPins: 8,
      maxPins: 16,
      allowedPinCounts: [8, 14, 16],
      pinSizeMap: {
        8: { packageKey: "SOIC-8", bodyWidthUm: 3900, bodyHeightUm: 5200, pinPitchUm: 1270 },
        14: { packageKey: "SOIC-14", bodyWidthUm: 3900, bodyHeightUm: 9000, pinPitchUm: 1270 },
        16: { packageKey: "SOIC-16", bodyWidthUm: 3900, bodyHeightUm: 10300, pinPitchUm: 1270 },
      },
    },
    package: {
      kind: "soic",
      packageKey: "SOIC",
      bodyWidthUm: 3900,
      bodyHeightUm: 5200,
      pinPitchUm: 1270,
      pins: numericPins(8),
    },
  }),
  fixedLibraryItem({
    id: "tssop_ic",
    family: "integrated",
    seriesId: "tssop",
    seriesLabel: "TSSOP",
    variantLabel: "Resizable",
    title: "TSSOP IC",
    description: "Start as TSSOP-20, then drag the corner to step up to TSSOP-28.",
    referencePrefix: "U",
    surfaces: ["component_lab"],
    source: "kicad",
    keywords: ["generic", "package", "tssop", "authoring"],
    resizeBehavior: {
      mode: "mapped-pin-step",
      minPins: 20,
      maxPins: 28,
      allowedPinCounts: [20, 28],
      pinSizeMap: {
        20: { packageKey: "TSSOP-20", bodyWidthUm: 4400, bodyHeightUm: 6500, pinPitchUm: 650 },
        28: { packageKey: "TSSOP-28", bodyWidthUm: 4400, bodyHeightUm: 9700, pinPitchUm: 650 },
      },
    },
    package: {
      kind: "soic",
      packageKey: "TSSOP",
      bodyWidthUm: 4400,
      bodyHeightUm: 6500,
      pinPitchUm: 650,
      pins: numericPins(20),
    },
  }),
  fixedLibraryItem({
    id: "qfp_ic",
    family: "integrated",
    seriesId: "qfp",
    seriesLabel: "QFP",
    variantLabel: "Resizable",
    title: "QFP MCU",
    description: "Start as QFP-32, then drag the corner to step up through QFP-48 and QFP-64.",
    referencePrefix: "U",
    surfaces: ["component_lab"],
    source: "kicad",
    keywords: ["generic", "package", "qfp", "authoring"],
    resizeBehavior: {
      mode: "mapped-pin-step",
      minPins: 32,
      maxPins: 64,
      allowedPinCounts: [32, 48, 64],
      pinSizeMap: {
        32: { packageKey: "QFP-32", bodyWidthUm: 7000, bodyHeightUm: 7000, pinPitchUm: 800 },
        48: { packageKey: "QFP-48", bodyWidthUm: 9000, bodyHeightUm: 9000, pinPitchUm: 650 },
        64: { packageKey: "QFP-64", bodyWidthUm: 12000, bodyHeightUm: 12000, pinPitchUm: 650 },
      },
    },
    package: {
      kind: "qfp",
      packageKey: "QFP",
      bodyWidthUm: 7000,
      bodyHeightUm: 7000,
      pinPitchUm: 800,
      pins: numericPins(32),
    },
  }),
  fixedLibraryItem({
    id: "gnd_symbol",
    family: "power",
    seriesId: "power_symbols",
    seriesLabel: "Power Symbols",
    variantLabel: "GND",
    title: "Ground",
    description: "Ground symbol for cleaner circuit layouts without routing the return rail everywhere.",
    referencePrefix: "GND",
    circuitCategory: "symbols",
    source: "native",
    keywords: ["ground", "gnd", "symbol", "net"],
    package: {
      kind: "header",
      packagePrefix: "SYM",
      packageKey: "GND",
      bodyWidthUm: 3000,
      bodyHeightUm: 2600,
      pinPitchUm: 2000,
      connectorStyle: "power-gnd",
      pins: namedPins(["GND"]),
    },
  }),
  fixedLibraryItem({
    id: "vcc_symbol",
    family: "power",
    seriesId: "power_symbols",
    seriesLabel: "Power Symbols",
    variantLabel: "VCC",
    title: "VCC",
    description: "Generic VCC power symbol for clean rail distribution.",
    referencePrefix: "VCC",
    circuitCategory: "symbols",
    source: "native",
    keywords: ["vcc", "symbol", "power", "net"],
    package: {
      kind: "header",
      packagePrefix: "SYM",
      packageKey: "VCC",
      bodyWidthUm: 3000,
      bodyHeightUm: 2800,
      pinPitchUm: 2000,
      connectorStyle: "power-vcc",
      pins: namedPins(["VCC"]),
    },
  }),
  fixedLibraryItem({
    id: "power_3v3_symbol",
    family: "power",
    seriesId: "power_symbols",
    seriesLabel: "Power Symbols",
    variantLabel: "3V3",
    title: "3.3V",
    description: "3.3V rail symbol for sensor and logic supply distribution.",
    referencePrefix: "3V3",
    circuitCategory: "symbols",
    source: "native",
    keywords: ["3v3", "3.3v", "symbol", "power", "net"],
    package: {
      kind: "header",
      packagePrefix: "SYM",
      packageKey: "3V3",
      bodyWidthUm: 3200,
      bodyHeightUm: 2800,
      pinPitchUm: 2000,
      connectorStyle: "power-3v3",
      pins: namedPins(["3V3"]),
    },
  }),
  fixedLibraryItem({
    id: "power_5v_symbol",
    family: "power",
    seriesId: "power_symbols",
    seriesLabel: "Power Symbols",
    variantLabel: "5V",
    title: "5V",
    description: "5V rail symbol for USB and common logic supply distribution.",
    referencePrefix: "5V",
    circuitCategory: "symbols",
    source: "native",
    keywords: ["5v", "symbol", "power", "net"],
    package: {
      kind: "header",
      packagePrefix: "SYM",
      packageKey: "5V",
      bodyWidthUm: 2800,
      bodyHeightUm: 2800,
      pinPitchUm: 2000,
      connectorStyle: "power-5v",
      pins: namedPins(["5V"]),
    },
  }),
  fixedLibraryItem({
    id: "ne555_dip8",
    family: "integrated",
    seriesId: "timers_real",
    seriesLabel: "Timer ICs",
    variantLabel: "NE555 DIP-8",
    title: "NE555 Timer",
    description: "Concrete NE555 timer in DIP-8 form for pulse, oscillator, and timing circuits.",
    referencePrefix: "U",
    circuitCategory: "timers_logic",
    source: "kicad",
    keywords: ["ne555", "timer", "dip8", "oscillator", "monostable", "astable"],
    package: {
      kind: "dip",
      packageKey: "NE555-DIP8",
      bodyWidthUm: 7620,
      bodyHeightUm: GRID_UM * 4,
      pinPitchUm: GRID_UM,
      rowSpacingUm: 7620,
      pins: namedPins(["GND", "TRIG", "OUT", "RESET", "CTRL", "THR", "DIS", "VCC"]),
    },
  }),
  fixedLibraryItem({
    id: "atmega328p_pu",
    family: "integrated",
    seriesId: "avr_real",
    seriesLabel: "AVR MCU",
    variantLabel: "ATmega328P-PU",
    title: "ATmega328P DIP-28",
    description: "Concrete DIP-28 AVR MCU for breadboard and Uno-style circuits.",
    referencePrefix: "U",
    circuitCategory: "microcontrollers",
    source: "kicad",
    keywords: ["atmega328p", "avr", "dip28", "arduino"],
    package: {
      kind: "dip",
      packageKey: "ATMEGA328P-PU",
      bodyWidthUm: 7620,
      bodyHeightUm: GRID_UM * 14,
      pinPitchUm: GRID_UM,
      rowSpacingUm: 7620,
      pins: namedPins([
        "PC6", "PD0", "PD1", "PD2", "PD3", "PD4", "VCC", "GND",
        "PB6", "PB7", "PD5", "PD6", "PD7", "PB0", "PB1", "PB2",
        "PB3", "PB4", "PB5", "AVCC", "AREF", "GND", "PC0", "PC1",
        "PC2", "PC3", "PC4", "PC5",
      ]),
    },
  }),
  fixedLibraryItem({
    id: "atmega328p_au",
    family: "integrated",
    seriesId: "avr_real",
    seriesLabel: "AVR MCU",
    variantLabel: "ATmega328P-AU",
    title: "ATmega328P TQFP-32",
    description: "Concrete TQFP-32 AVR MCU for Nano-style and compact board layouts.",
    referencePrefix: "U",
    circuitCategory: "microcontrollers",
    source: "kicad",
    keywords: ["atmega328p", "avr", "tqfp32", "arduino", "nano"],
    package: {
      kind: "qfp",
      packageKey: "ATMEGA328P-AU",
      bodyWidthUm: 7000,
      bodyHeightUm: 7000,
      pinPitchUm: 800,
      pins: numericPins(32),
    },
  }),
  fixedLibraryItem({
    id: "sn74hc595_dip16",
    family: "integrated",
    seriesId: "logic_real",
    seriesLabel: "Logic ICs",
    variantLabel: "74HC595 DIP-16",
    title: "74HC595 Shift Register",
    description: "Concrete 74HC595 shift register for LED driving, output expansion, and latch logic.",
    referencePrefix: "U",
    circuitCategory: "timers_logic",
    source: "kicad",
    keywords: ["74hc595", "shift register", "logic", "dip16"],
    package: {
      kind: "dip",
      packageKey: "74HC595-DIP16",
      bodyWidthUm: 7620,
      bodyHeightUm: GRID_UM * 8,
      pinPitchUm: GRID_UM,
      rowSpacingUm: 7620,
      pins: namedPins(["QB", "QC", "QD", "QE", "QF", "QG", "QH", "GND", "QH'", "SRCLR", "SRCLK", "RCLK", "OE", "SER", "QA", "VCC"]),
    },
  }),
  fixedLibraryItem({
    id: "jst_ph",
    family: "connectors",
    seriesId: "jst_ph",
    seriesLabel: "JST-PH",
    variantLabel: "Resizable",
    title: "JST-PH",
    description: "Start as 2-pin JST-PH, then drag east or the corner to extend the housing.",
    referencePrefix: "J",
    circuitCategory: "connectors",
    source: "kicad",
    keywords: ["jst", "connector", "ph", "battery"],
    resizeBehavior: {
      mode: "linear-pin-step",
      minPins: 2,
      maxPins: 8,
      pinStep: 1,
      fixedRowCount: 1,
    },
    package: {
      kind: "header",
      packagePrefix: "JST-PH",
      packageKey: "JST-PH-2",
      bodyWidthUm: GRID_UM * 2,
      bodyHeightUm: GRID_UM * 2,
      pinPitchUm: GRID_UM,
      connectorStyle: "jst-ph",
      pins: numericPins(2),
    },
  }),
  fixedLibraryItem({
    id: "usb_micro_b",
    family: "connectors",
    seriesId: "usb_connector",
    seriesLabel: "USB Connector",
    variantLabel: "Micro-B",
    title: "USB Micro-B",
    description: "Compact board-edge USB connector body for dev boards and modules.",
    referencePrefix: "J",
    circuitCategory: "connectors",
    source: "blend",
    keywords: ["usb", "micro-b", "connector", "power", "serial"],
    package: {
      kind: "header",
      packagePrefix: "USB-MICRO",
      packageKey: "USB-MICRO-B",
      bodyWidthUm: 6500,
      bodyHeightUm: 2800,
      pinPitchUm: 1300,
      connectorStyle: "usb-shell",
      pins: namedPins(["VBUS", "D-", "D+", "ID", "GND"]),
    },
  }),
  fixedLibraryItem({
    id: "terminal_block",
    family: "connectors",
    seriesId: "terminal_block",
    seriesLabel: "Terminal Block",
    variantLabel: "Resizable",
    title: "Terminal Block",
    description: "Start as 2-position terminal block, then drag east or the corner to add positions.",
    referencePrefix: "J",
    circuitCategory: "connectors",
    source: "kicad",
    keywords: ["terminal block", "connector", "screw"],
    resizeBehavior: {
      mode: "linear-pin-step",
      minPins: 2,
      maxPins: 8,
      pinStep: 1,
      fixedRowCount: 1,
    },
    package: {
      kind: "header",
      packagePrefix: "TERM",
      packageKey: "TERM-2P",
      bodyWidthUm: GRID_UM * 2,
      bodyHeightUm: GRID_UM * 2,
      pinPitchUm: GRID_UM,
      connectorStyle: "terminal-block",
      pins: namedPins(["1", "2"]),
    },
  }),
  fixedLibraryItem({
    id: "idc_box",
    family: "connectors",
    seriesId: "idc_box",
    seriesLabel: "IDC Box Header",
    variantLabel: "Resizable",
    title: "IDC Box Header",
    description: "Start as 2x2 boxed header, then drag south or the corner to add rows.",
    referencePrefix: "J",
    circuitCategory: "connectors",
    source: "kicad",
    keywords: ["idc", "box header", "connector"],
    resizeBehavior: {
      mode: "linear-pin-step",
      minPins: 4,
      maxPins: 20,
      pinStep: 1,
      fixedColumnCount: 2,
    },
    package: {
      kind: "header",
      packagePrefix: "IDC",
      packageKey: "IDC-2x2",
      bodyWidthUm: GRID_UM * 2,
      bodyHeightUm: GRID_UM * 2,
      pinPitchUm: GRID_UM,
      connectorStyle: "idc-box",
      pins: numericPins(4),
    },
  }),
  {
    id: "to220_3",
    family: "power",
    seriesId: "to220",
    seriesLabel: "TO-220",
    variantLabel: "3 pins",
    title: "TO-220-3",
    description: "Three-pin through-hole power package with mounting tab.",
    referencePrefix: "Q",
    circuitCategory: "power",
    source: "kicad",
    keywords: ["to220", "transistor", "regulator", "power"],
    resizeBehavior: {
      mode: "fixed",
    },
    package: {
      kind: "to220",
      packageKey: "TO-220-3",
      bodyWidthUm: 10160,
      bodyHeightUm: 7620,
      pinPitchUm: GRID_UM,
      pins: namedPins(["1", "2", "3"]),
    },
  },
  fixedLibraryItem({
    id: "sot23_pkg",
    family: "power",
    seriesId: "sot23",
    seriesLabel: "SOT-23",
    variantLabel: "Resizable",
    title: "SOT-23 Package",
    description: "Start as 3-pin SOT-23, then drag the corner to step up to 5 pins.",
    referencePrefix: "U",
    circuitCategory: "power",
    source: "kicad",
    keywords: ["sot23", "transistor", "regulator", "small signal"],
    resizeBehavior: {
      mode: "mapped-pin-step",
      minPins: 3,
      maxPins: 5,
      allowedPinCounts: [3, 5],
      pinSizeMap: {
        3: { packageKey: "SOT-23-3", bodyWidthUm: 3000, bodyHeightUm: 1600, pinPitchUm: 950 },
        5: { packageKey: "SOT-23-5", bodyWidthUm: 3200, bodyHeightUm: 2200, pinPitchUm: 950 },
      },
    },
    package: {
      kind: "sot23",
      packageKey: "SOT-23",
      bodyWidthUm: 3000,
      bodyHeightUm: 1600,
      pinPitchUm: 950,
      pins: numericPins(3),
    },
  }),
  fixedLibraryItem({
    id: "led_5mm",
    family: "discretes",
    seriesId: "led_th",
    seriesLabel: "LED Through-Hole",
    variantLabel: "5 mm",
    title: "LED 5 mm",
    description: "Simple through-hole LED footprint with fixed lead spacing.",
    referencePrefix: "D",
    circuitCategory: "indicators",
    source: "wokwi",
    keywords: ["led", "indicator", "5mm", "through-hole"],
    resizeBehavior: {
      mode: "fixed",
    },
    package: {
      kind: "led",
      packageKey: "LED-TH-5mm",
      bodyWidthUm: 5000,
      bodyHeightUm: 5000,
      pinPitchUm: GRID_UM,
      pins: namedPins(getWokwiPinLabels("led_5mm")),
      defaultColor: "#ff5252",
    },
  }),
  fixedLibraryItem({
    id: "led_0603",
    family: "discretes",
    seriesId: "led_smd",
    seriesLabel: "LED SMD",
    variantLabel: "0603",
    title: "LED 0603",
    description: "Two-pad SMD indicator LED footprint for dense status and UI feedback layouts.",
    referencePrefix: "D",
    circuitCategory: "indicators",
    source: "blend",
    keywords: ["led", "indicator", "0603", "smd"],
    package: {
      kind: "chip2",
      packageKey: "LED-0603",
      bodyWidthUm: 1600,
      bodyHeightUm: 800,
      pinPitchUm: 1600,
      pins: namedPins(["A", "K"]),
      defaultColor: "#41e37a",
    },
  }),
  {
    id: "resistor_axial_030",
    family: "discretes",
    seriesId: "resistor_axial",
    seriesLabel: "Resistor Axial",
    variantLabel: "0.3 in",
    title: "Resistor Axial",
    description: "0.3 inch axial body placeholder for deterministic placement.",
    referencePrefix: "R",
    circuitCategory: "passives",
    source: "wokwi",
    keywords: ["resistor", "axial", "through-hole"],
    resizeBehavior: {
      mode: "fixed",
    },
    package: {
      kind: "resistor",
      packageKey: "RES-AXIAL-0.3",
      bodyWidthUm: 7620,
      bodyHeightUm: GRID_UM,
      pinPitchUm: GRID_UM,
      pins: namedPins(getWokwiPinLabels("resistor_axial_030")),
    },
  },
  fixedLibraryItem({
    id: "resistor_0603",
    family: "discretes",
    seriesId: "resistor_chip",
    seriesLabel: "Resistor Chip",
    variantLabel: "0603",
    title: "Resistor 0603",
    description: "Standard two-pad 0603 resistor body for pull-ups, dividers, and signal conditioning.",
    referencePrefix: "R",
    circuitCategory: "passives",
    source: "blend",
    keywords: ["resistor", "0603", "smd", "pull-up"],
    package: {
      kind: "chip2",
      packageKey: "R-0603",
      bodyWidthUm: 1600,
      bodyHeightUm: 800,
      pinPitchUm: 1600,
      pins: namedPins(["1", "2"]),
    },
  }),
  fixedLibraryItem({
    id: "resistor_0805",
    family: "discretes",
    seriesId: "resistor_chip",
    seriesLabel: "Resistor Chip",
    variantLabel: "0805",
    title: "Resistor 0805",
    description: "Larger two-pad resistor footprint for general support networks and easier hand assembly.",
    referencePrefix: "R",
    circuitCategory: "passives",
    source: "kicad",
    keywords: ["resistor", "0805", "smd"],
    package: {
      kind: "chip2",
      packageKey: "R-0805",
      bodyWidthUm: 2000,
      bodyHeightUm: 1250,
      pinPitchUm: 2000,
      pins: namedPins(["1", "2"]),
    },
  }),
  {
    id: "capacitor_radial_01",
    family: "discretes",
    seriesId: "capacitor_radial",
    seriesLabel: "Capacitor Radial",
    variantLabel: "0.1 in pitch",
    title: "Capacitor Radial",
    description: "Radial capacitor body with fixed 0.1 inch lead spacing.",
    referencePrefix: "C",
    circuitCategory: "passives",
    source: "kicad",
    keywords: ["capacitor", "radial", "through-hole"],
    resizeBehavior: {
      mode: "fixed",
    },
    package: {
      kind: "capacitor",
      packageKey: "CAP-RADIAL-0.1",
      bodyWidthUm: 5080,
      bodyHeightUm: 5080,
      pinPitchUm: GRID_UM,
      pins: namedPins(["1", "2"]),
    },
  },
  fixedLibraryItem({
    id: "capacitor_0603",
    family: "discretes",
    seriesId: "capacitor_chip",
    seriesLabel: "Capacitor Chip",
    variantLabel: "0603",
    title: "Capacitor 0603",
    description: "Compact ceramic decoupling placeholder for local IC supply support.",
    referencePrefix: "C",
    circuitCategory: "passives",
    source: "blend",
    keywords: ["capacitor", "0603", "ceramic", "decoupling"],
    package: {
      kind: "chip2",
      packageKey: "C-0603",
      bodyWidthUm: 1600,
      bodyHeightUm: 800,
      pinPitchUm: 1600,
      pins: namedPins(["1", "2"]),
    },
  }),
  fixedLibraryItem({
    id: "capacitor_0805",
    family: "discretes",
    seriesId: "capacitor_chip",
    seriesLabel: "Capacitor Chip",
    variantLabel: "0805",
    title: "Capacitor 0805",
    description: "General-purpose two-pad ceramic capacitor for supply filtering and timing support.",
    referencePrefix: "C",
    circuitCategory: "passives",
    source: "kicad",
    keywords: ["capacitor", "0805", "ceramic"],
    package: {
      kind: "chip2",
      packageKey: "C-0805",
      bodyWidthUm: 2000,
      bodyHeightUm: 1250,
      pinPitchUm: 2000,
      pins: namedPins(["1", "2"]),
    },
  }),
  fixedLibraryItem({
    id: "ferrite_0805",
    family: "discretes",
    seriesId: "ferrite_chip",
    seriesLabel: "Ferrite Chip",
    variantLabel: "0805",
    title: "Ferrite 0805",
    description: "Two-terminal ferrite bead placeholder for power-entry and local rail cleanup.",
    referencePrefix: "FB",
    circuitCategory: "passives",
    source: "kicad",
    keywords: ["ferrite", "0805", "bead", "emi"],
    package: {
      kind: "chip2",
      packageKey: "FB-0805",
      bodyWidthUm: 2000,
      bodyHeightUm: 1250,
      pinPitchUm: 2000,
      pins: namedPins(["1", "2"]),
    },
  }),
  fixedLibraryItem({
    id: "inductor_1210",
    family: "discretes",
    seriesId: "inductor_chip",
    seriesLabel: "Inductor Chip",
    variantLabel: "1210",
    title: "Inductor 1210",
    description: "Two-pad SMD inductor body for compact buck, boost, and filtering support stages.",
    referencePrefix: "L",
    circuitCategory: "power",
    source: "kicad",
    keywords: ["inductor", "1210", "buck", "boost"],
    package: {
      kind: "chip2",
      packageKey: "L-1210",
      bodyWidthUm: 3200,
      bodyHeightUm: 2500,
      pinPitchUm: 3200,
      pins: namedPins(["1", "2"]),
    },
  }),
  fixedLibraryItem({
    id: "diode_sod123",
    family: "discretes",
    seriesId: "diode_sod",
    seriesLabel: "Diode SMD",
    variantLabel: "SOD-123",
    title: "Diode SOD-123",
    description: "Small two-pad SMD diode footprint for clamp, rectification, and reverse-protection use.",
    referencePrefix: "D",
    circuitCategory: "indicators",
    source: "kicad",
    keywords: ["diode", "sod123", "rectifier", "protection"],
    package: {
      kind: "chip2",
      packageKey: "SOD-123",
      bodyWidthUm: 3700,
      bodyHeightUm: 1800,
      pinPitchUm: 3700,
      pins: namedPins(["A", "K"]),
    },
  }),
  {
    id: "button_tact_6mm",
    family: "controls",
    seriesId: "tact_switch",
    seriesLabel: "Tact Switch",
    variantLabel: "6 mm TH",
    title: "Tact Button 6 mm",
    description: "Four-pin tactile button placeholder with fixed footprint.",
    referencePrefix: "SW",
    circuitCategory: "switches",
    source: "native",
    keywords: ["button", "switch", "tactile", "through-hole"],
    resizeBehavior: {
      mode: "fixed",
    },
    package: {
      kind: "button",
      packageKey: "TACT-6x6",
      bodyWidthUm: 6000,
      bodyHeightUm: 6000,
      pinPitchUm: GRID_UM,
      pins: namedPins(["1", "2", "3", "4"]),
    },
  },
  fixedLibraryItem({
    id: "button_tact_smd",
    family: "controls",
    seriesId: "tact_switch",
    seriesLabel: "Tact Switch",
    variantLabel: "SMD",
    title: "Tact Switch SMD",
    description: "Low-profile four-pin SMD tactile switch placeholder for reset and UI input surfaces.",
    referencePrefix: "SW",
    circuitCategory: "switches",
    source: "native",
    keywords: ["button", "switch", "tactile", "smd", "reset"],
    package: {
      kind: "button",
      packageKey: "TACT-SMD",
      bodyWidthUm: 4500,
      bodyHeightUm: 3500,
      pinPitchUm: GRID_UM,
      pins: namedPins(["1", "2", "3", "4"]),
    },
  }),
  fixedLibraryItem({
    id: "potentiometer_knob",
    family: "controls",
    seriesId: "variable_controls",
    seriesLabel: "Variable Controls",
    variantLabel: "Knob Potentiometer",
    title: "Potentiometer",
    description: "Three-pin rotary potentiometer for analog behavior mapping and adjustable controls.",
    referencePrefix: "RV",
    surfaces: ["circuit_studio"],
    circuitCategory: "switches",
    source: "wokwi",
    keywords: ["potentiometer", "analog", "knob", "variable resistor", "input"],
    package: {
      kind: "potentiometer",
      packageKey: "POT-KNOB",
      bodyWidthUm: 8000,
      bodyHeightUm: 8000,
      pinPitchUm: 2540,
      pins: namedPins(getWokwiPinLabels("potentiometer_knob")),
      defaultColor: "#045881",
    },
  }),
  fixedLibraryItem({
    id: "slide_switch_spdt",
    family: "controls",
    seriesId: "state_switches",
    seriesLabel: "State Switches",
    variantLabel: "Slide SPDT",
    title: "Slide Switch",
    description: "Three-pin slide switch for binary state editing and discrete behavior tests.",
    referencePrefix: "SW",
    surfaces: ["circuit_studio"],
    circuitCategory: "switches",
    source: "wokwi",
    keywords: ["slide switch", "spdt", "binary", "state", "toggle"],
    package: {
      kind: "slide_switch",
      packageKey: "SLIDE-SPDT",
      bodyWidthUm: 5500,
      bodyHeightUm: 2800,
      pinPitchUm: 1900,
      pins: namedPins(getWokwiPinLabels("slide_switch_spdt")),
    },
  }),
  fixedLibraryItem({
    id: "toggle_switch_spdt",
    family: "controls",
    seriesId: "state_switches",
    seriesLabel: "State Switches",
    variantLabel: "Toggle SPDT",
    title: "Toggle Switch",
    description: "Three-pin lever switch for on-off behavior editing and stateful interaction experiments.",
    referencePrefix: "SW",
    surfaces: ["circuit_studio"],
    circuitCategory: "switches",
    source: "blend",
    keywords: ["toggle switch", "spdt", "lever", "on off", "state"],
    package: {
      kind: "toggle_switch",
      packageKey: "TOGGLE-SPDT",
      bodyWidthUm: 6000,
      bodyHeightUm: 5200,
      pinPitchUm: 2200,
      pins: namedPins(["1", "2", "3"]),
    },
  }),
  fixedLibraryItem({
    id: "servo_micro",
    family: "power",
    seriesId: "motion_outputs",
    seriesLabel: "Motion Outputs",
    variantLabel: "Micro Servo",
    title: "Servo Motor",
    description: "Three-wire servo actuator for angle-driven behavior definitions and motion output experiments.",
    referencePrefix: "M",
    surfaces: ["circuit_studio"],
    circuitCategory: "actuators",
    source: "wokwi",
    keywords: ["servo", "motor", "pwm", "actuator", "motion"],
    package: {
      kind: "servo",
      packageKey: "SERVO-MICRO",
      bodyWidthUm: 12000,
      bodyHeightUm: 8000,
      pinPitchUm: 2200,
      pins: namedPins(getWokwiPinLabels("servo_micro")),
      defaultColor: "#345f9e",
    },
  }),
  ...GENERATED_WOKWI_LIBRARY_ITEMS,
];

export const LIBRARY_ITEMS_BY_ID = Object.fromEntries(
  LIBRARY_ITEMS.map((item) => [item.id, item]),
) as Record<string, LibraryItem>;

export function getLibraryItem(libraryItemId: string): LibraryItem {
  return LIBRARY_ITEMS_BY_ID[libraryItemId];
}

export function listLibraryItemsByFamily(familyId: LibraryFamilyId): LibraryItem[] {
  return LIBRARY_ITEMS.filter((item) => item.family === familyId);
}

export function listLibrarySeriesByFamily(familyId: LibraryFamilyId): LibrarySeries[] {
  const seriesMap = new Map<string, LibrarySeries>();

  for (const item of LIBRARY_ITEMS) {
    if (item.family !== familyId) {
      continue;
    }

    const existingSeries = seriesMap.get(item.seriesId);
    if (existingSeries) {
      existingSeries.items.push(item);
      continue;
    }

    seriesMap.set(item.seriesId, {
      id: item.seriesId,
      family: item.family,
      label: item.seriesLabel,
      description: item.description,
      referencePrefix: item.referencePrefix,
      items: [item],
    });
  }

  return Array.from(seriesMap.values());
}

export function isLibraryItemAvailableOnSurface(
  item: LibraryItem,
  surface: LibrarySurfaceId,
) {
  const surfaces = item.surfaces ?? ["circuit_studio", "component_lab"];
  return surfaces.includes(surface);
}

export function listCircuitLibraryItems() {
  return LIBRARY_ITEMS.filter(
    (item) =>
      isLibraryItemAvailableOnSurface(item, "circuit_studio") &&
      item.circuitCategory != null &&
      !CIRCUIT_LIBRARY_HIDDEN_ITEM_IDS.has(item.id),
  );
}

export function listCircuitLibraryItemsByCategory(categoryId: CircuitCategoryId) {
  return listCircuitLibraryItems().filter((item) => item.circuitCategory === categoryId);
}

export function listComponentLabLibraryItems() {
  return LIBRARY_ITEMS.filter((item) =>
    isLibraryItemAvailableOnSurface(item, "component_lab"),
  );
}

export function isResizableLibraryItem(libraryItemId: string): boolean {
  return getLibraryItem(libraryItemId).resizeBehavior.mode !== "fixed";
}

export function normalizePackageState(
  libraryItemId: string,
  packageState: ComponentPackageState = {},
): ComponentPackageState {
  const item = getLibraryItem(libraryItemId);
  const behavior = item.resizeBehavior;

  if (behavior.mode === "dip-step") {
    const rawPinCount = Number(packageState.pinCount ?? item.package.pins.length);
    const widthMode = behavior.allowWide && packageState.widthMode === "wide" ? "wide" : "narrow";

    const DIP_NARROW_PINS = [4, 6, 8, 14, 16, 18, 20, 24, 28];
    const DIP_WIDE_PINS = [24, 28, 32, 40, 48, 64];
    
    const allowedPins = widthMode === "wide" ? DIP_WIDE_PINS : DIP_NARROW_PINS;
    const pinCount = allowedPins.reduce((prev, curr) => 
      Math.abs(curr - rawPinCount) < Math.abs(prev - rawPinCount) ? curr : prev
    );

    return {
      pinCount,
      widthMode,
    };
  }

  if (behavior.mode === "linear-pin-step") {
    const minPins = behavior.minPins ?? 1;
    const maxPins = behavior.maxPins ?? 40;
    const pinStep = behavior.pinStep ?? 1;
    const fixedColumnCount = behavior.fixedColumnCount;
    const fixedRowCount = behavior.fixedRowCount;
    const rawPinCount = Number(packageState.pinCount ?? item.package.pins.length);

    if (fixedColumnCount != null) {
      const columnCount = fixedColumnCount;
      const estimatedRows = Math.max(1, Math.round(rawPinCount / columnCount));
      const maxRows = Math.max(1, Math.floor(maxPins / columnCount));
      const rowCount = clamp(
        snapToStep(Number.isFinite(estimatedRows) ? estimatedRows : 1, pinStep),
        1,
        maxRows,
      );

      return {
        pinCount: clamp(rowCount * columnCount, minPins, maxPins),
        columnCount,
        widthUm: columnCount * GRID_UM,
      };
    }

    if (fixedRowCount != null) {
      const rowCount = fixedRowCount;
      const rawColumnCount = Number(
        packageState.columnCount ??
          Math.max(1, Math.round(rawPinCount / rowCount)),
      );
      const maxColumns = Math.max(1, Math.floor(maxPins / rowCount));
      const columnCount = clamp(
        snapToStep(Number.isFinite(rawColumnCount) ? rawColumnCount : 1, 1),
        1,
        maxColumns,
      );

      return {
        pinCount: clamp(rowCount * columnCount, minPins, maxPins),
        columnCount,
        widthUm: columnCount * GRID_UM,
      };
    }

    const rawColumnCount = Number(
      packageState.columnCount ??
        Math.max(1, Math.round(Number(packageState.widthUm ?? item.package.bodyWidthUm) / GRID_UM)),
    );
    const columnCount = clamp(
      snapToStep(Number.isFinite(rawColumnCount) ? rawColumnCount : 1, 1),
      1,
      8,
    );
    const estimatedRows = Math.max(1, Math.round(rawPinCount / columnCount));
    const maxRows = Math.max(1, Math.floor(maxPins / columnCount));
    const rowCount = clamp(
      snapToStep(
        Number.isFinite(estimatedRows) ? estimatedRows : Math.max(1, item.package.pins.length),
        pinStep,
      ),
      1,
      maxRows,
    );

    return {
      pinCount: clamp(rowCount * columnCount, minPins, maxPins),
      columnCount,
      widthUm: columnCount * GRID_UM,
    };
  }

  if (behavior.mode === "mapped-pin-step") {
    const allowedPinCounts = behavior.allowedPinCounts ?? [item.package.pins.length];
    const rawPinCount = Number(packageState.pinCount ?? item.package.pins.length);
    const pinCount = allowedPinCounts.reduce((previous, current) =>
      Math.abs(current - rawPinCount) < Math.abs(previous - rawPinCount) ? current : previous,
    );

    return {
      pinCount,
    };
  }

  return {};
}

export function getDefaultPackageState(libraryItemId: string): ComponentPackageState {
  return normalizePackageState(libraryItemId, {});
}

export function resolvePackageByItemId(
  libraryItemId: string,
  packageState: ComponentPackageState = {},
): PackageDefinition {
  const item = getLibraryItem(libraryItemId);
  const normalizedState = normalizePackageState(libraryItemId, packageState);
  const behavior = item.resizeBehavior;

  if (behavior.mode === "dip-step") {
    const pinCount = normalizedState.pinCount ?? item.package.pins.length;
    const rowPins = pinCount / 2;
    const widthMode = normalizedState.widthMode === "wide" ? "wide" : "narrow";
    const bodyWidthUm = widthMode === "wide" ? 15240 : 7620;

    return {
      ...item.package,
      packageKey: `DIP-${pinCount}_${widthMode === "wide" ? "W0.6" : "W0.3"}`,
      bodyWidthUm,
      bodyHeightUm: rowPins * GRID_UM,
      rowSpacingUm: bodyWidthUm,
      pins: numericPins(pinCount),
    };
  }

  if (behavior.mode === "linear-pin-step") {
    const pinCount = normalizedState.pinCount ?? item.package.pins.length;
    const columnCount = normalizedState.columnCount ?? 1;
    const rowCount = Math.max(1, Math.round(pinCount / columnCount));
    const widthUm = columnCount * GRID_UM;
    const packagePrefix = item.package.packagePrefix ?? "HDR";
    const packageKey =
      item.package.connectorStyle === "jst-ph"
        ? `${packagePrefix}-${columnCount}`
        : item.package.connectorStyle === "terminal-block"
          ? `${packagePrefix}-${columnCount}P`
          : item.package.connectorStyle === "idc-box"
            ? `${packagePrefix}-2x${rowCount}`
            : `${packagePrefix}-${columnCount}x${rowCount}`;

    return {
      ...item.package,
      packageKey,
      bodyWidthUm: widthUm,
      bodyHeightUm: rowCount * GRID_UM,
      pins: numericPins(pinCount),
    };
  }

  if (behavior.mode === "mapped-pin-step") {
    const pinCount = normalizedState.pinCount ?? item.package.pins.length;
    const sizeSpec = behavior.pinSizeMap?.[pinCount];

    if (!sizeSpec) {
      return {
        ...item.package,
        pins: numericPins(pinCount),
      };
    }

    return {
      ...item.package,
      packageKey: sizeSpec.packageKey,
      bodyWidthUm: sizeSpec.bodyWidthUm,
      bodyHeightUm: sizeSpec.bodyHeightUm,
      pinPitchUm: sizeSpec.pinPitchUm ?? item.package.pinPitchUm,
      pins: numericPins(pinCount),
    };
  }

  return item.package;
}

export function resizePackageStateForHandle(
  libraryItemId: string,
  packageState: ComponentPackageState,
  handle: ResizeHandle,
  targetWidthUm: number,
  targetHeightUm: number,
): ComponentPackageState {
  const item = getLibraryItem(libraryItemId);
  const currentState = normalizePackageState(libraryItemId, packageState);

  if (item.resizeBehavior.mode === "dip-step") {
    const nextState: ComponentPackageState = { ...currentState };

    if (handle === "south" || handle === "corner") {
      const rowPins = clamp(
        Math.round(targetHeightUm / GRID_UM),
        (item.resizeBehavior.minPins ?? 4) / 2,
        (item.resizeBehavior.maxPins ?? 40) / 2,
      );
      nextState.pinCount = rowPins * 2;
    }

    if (item.resizeBehavior.allowWide && (handle === "east" || handle === "corner")) {
      nextState.widthMode = targetWidthUm >= 12000 ? "wide" : "narrow";
    }

    return normalizePackageState(libraryItemId, nextState);
  }

  if (item.resizeBehavior.mode === "linear-pin-step") {
    const nextState: ComponentPackageState = { ...currentState };
    const fixedColumnCount = item.resizeBehavior.fixedColumnCount;
    const fixedRowCount = item.resizeBehavior.fixedRowCount;
    const currentColumns = currentState.columnCount ?? 1;
    const currentRows = Math.max(
      1,
      Math.round((currentState.pinCount ?? item.package.pins.length) / currentColumns),
    );

    const nextColumns =
      fixedColumnCount != null
        ? fixedColumnCount
        : handle === "east" || handle === "corner"
        ? Math.max(1, Math.round(targetWidthUm / GRID_UM))
        : currentColumns;
    const nextRows =
      fixedRowCount != null
        ? fixedRowCount
        : handle === "south" || handle === "corner"
        ? Math.max(1, Math.round(targetHeightUm / GRID_UM))
        : currentRows;

    nextState.columnCount = nextColumns;
    nextState.widthUm = nextColumns * GRID_UM;
    nextState.pinCount = nextRows * nextColumns;

    return normalizePackageState(libraryItemId, nextState);
  }

  if (item.resizeBehavior.mode === "mapped-pin-step") {
    const allowedPinCounts = item.resizeBehavior.allowedPinCounts ?? [item.package.pins.length];
    const pinSizeMap = item.resizeBehavior.pinSizeMap ?? {};
    const targetMetric =
      item.package.kind === "qfp"
        ? Math.max(targetWidthUm, targetHeightUm)
        : targetHeightUm;
    const nextPinCount = allowedPinCounts.reduce((previous, current) => {
      const previousSize = pinSizeMap[previous];
      const currentSize = pinSizeMap[current];
      const previousMetric =
        item.package.kind === "qfp"
          ? Math.max(previousSize?.bodyWidthUm ?? 0, previousSize?.bodyHeightUm ?? 0)
          : previousSize?.bodyHeightUm ?? 0;
      const currentMetric =
        item.package.kind === "qfp"
          ? Math.max(currentSize?.bodyWidthUm ?? 0, currentSize?.bodyHeightUm ?? 0)
          : currentSize?.bodyHeightUm ?? 0;

      return Math.abs(currentMetric - targetMetric) < Math.abs(previousMetric - targetMetric)
        ? current
        : previous;
    });

    return normalizePackageState(libraryItemId, {
      ...currentState,
      pinCount: nextPinCount,
    });
  }

  return currentState;
}
