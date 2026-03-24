export const GRID_UM = 2540;
export const ROUTING_GRID_UM = 10;
export const UM_TO_PX = 0.01;

export type LibraryFamilyId =
  | "integrated"
  | "connectors"
  | "power"
  | "discretes"
  | "controls";

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
  | "button";

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
  connectorStyle?: "pin-header" | "female-header" | "jst-ph" | "terminal-block" | "idc-box";
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
    id: "jst_ph",
    family: "connectors",
    seriesId: "jst_ph",
    seriesLabel: "JST-PH",
    variantLabel: "Resizable",
    title: "JST-PH",
    description: "Start as 2-pin JST-PH, then drag east or the corner to extend the housing.",
    referencePrefix: "J",
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
    id: "terminal_block",
    family: "connectors",
    seriesId: "terminal_block",
    seriesLabel: "Terminal Block",
    variantLabel: "Resizable",
    title: "Terminal Block",
    description: "Start as 2-position terminal block, then drag east or the corner to add positions.",
    referencePrefix: "J",
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
    resizeBehavior: {
      mode: "fixed",
    },
    package: {
      kind: "led",
      packageKey: "LED-TH-5mm",
      bodyWidthUm: 5000,
      bodyHeightUm: 5000,
      pinPitchUm: GRID_UM,
      pins: namedPins(["A", "K"]),
      defaultColor: "#ffffff",
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
    package: {
      kind: "chip2",
      packageKey: "LED-0603",
      bodyWidthUm: 1600,
      bodyHeightUm: 800,
      pinPitchUm: 1600,
      pins: namedPins(["A", "K"]),
      defaultColor: "#ffffff",
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
    resizeBehavior: {
      mode: "fixed",
    },
    package: {
      kind: "resistor",
      packageKey: "RES-AXIAL-0.3",
      bodyWidthUm: 7620,
      bodyHeightUm: GRID_UM,
      pinPitchUm: GRID_UM,
      pins: namedPins(["1", "2"]),
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
    package: {
      kind: "button",
      packageKey: "TACT-SMD",
      bodyWidthUm: 4500,
      bodyHeightUm: 3500,
      pinPitchUm: GRID_UM,
      pins: namedPins(["1", "2", "3", "4"]),
    },
  }),
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
