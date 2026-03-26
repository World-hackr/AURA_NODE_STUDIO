import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const STAGE_WIDTH = 700;
const STAGE_HEIGHT = 460;

const defaultBehaviorDraft = {
  presetId: "light_emitter",
  targetId: "body_primary",
  property: "brightness",
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

const defaultCompiledBehavior = {
  kind: "behaviorHelper",
  entry: {
    id: "body_primary_light",
    type: "light_emitter",
    property: "brightness",
    source: {
      type: "target_slot",
      target: "body_primary",
    },
    range: [0, 100],
    baseColor: "#ff5a5a",
    opacityRange: [0.08, 0.94],
    glow: {
      enabled: true,
      color: "#ff5a5a",
      reachRange: [8.1, 25.2],
      blur: 12,
      opacityRange: [0.02, 0.68],
    },
  },
};

const passiveProfiles = [
  {
    footprintPath: "vendor_reference/kicad-footprints/Resistor_SMD.pretty/R_0603_1608Metric.kicad_mod",
    outputPath: "shared/component_definitions_v1/examples/resistor_0603.component.json",
    metadata: {
      name: "Resistor 0603 Base",
      description: "KiCad-backed 0603 resistor base using exact footprint pads and synthesized AURA finish rules.",
      tags: ["example", "resistor", "0603", "base_component", "kicad_backed"],
    },
    base: {
      kind: "library_item",
      itemId: "resistor_0603",
      override: {
        fill: "#dddddd",
        stroke: "#111111",
      },
    },
    bodyWidthUm: 1600,
    bodyHeightUm: 800,
    buildLayers(footprint) {
      const layers = [];
      layers.push(...createPadLayers(footprint, footprint.pads, { fill: "#c8c8c8", stroke: "#888888" }));
      layers.push(
        createRectLayer(footprint, "res_body_shell", "Resistor Body", footprint.fabRect, {
          fill: "#dddddd",
          stroke: "#111111",
          strokeWidth: 1.3,
          radiusScale: 0.1,
        }),
      );
      layers.push(
        createInsetRectLayer(footprint, "res_body_inset", "Body Inset", footprint.fabRect, 0.12, {
          fill: "rgba(255,255,255,0.22)",
          stroke: "#7c7c7c",
          strokeWidth: 0.9,
          radiusScale: 0.12,
        }),
      );
      layers.push(
        createVerticalBand(footprint, "res_band_primary", "Band 1", footprint.fabRect, 0.42, 0.12, {
          fill: "#161616",
          stroke: "#161616",
          strokeWidth: 0,
        }),
      );
      layers.push(
        createVerticalBand(footprint, "res_band_secondary", "Band 2", footprint.fabRect, 0.58, 0.08, {
          fill: "#4b4b4b",
          stroke: "#4b4b4b",
          strokeWidth: 0,
        }),
      );
      layers.push(...createSilkLayers(footprint, footprint.silkLines, "res"));
      return layers;
    },
  },
  {
    footprintPath: "vendor_reference/kicad-footprints/Capacitor_SMD.pretty/C_0603_1608Metric.kicad_mod",
    outputPath: "shared/component_definitions_v1/examples/capacitor_0603.component.json",
    metadata: {
      name: "Capacitor 0603 Base",
      description: "KiCad-backed 0603 capacitor base using exact footprint pads and synthesized ceramic finish rules.",
      tags: ["example", "capacitor", "0603", "base_component", "kicad_backed"],
    },
    base: {
      kind: "library_item",
      itemId: "capacitor_0603",
      override: {
        fill: "#f2f2f2",
        stroke: "#111111",
      },
    },
    bodyWidthUm: 1600,
    bodyHeightUm: 800,
    buildLayers(footprint) {
      const layers = [];
      layers.push(...createPadLayers(footprint, footprint.pads, { fill: "#d4d4d4", stroke: "#8e8e8e" }));
      layers.push(
        createRectLayer(footprint, "cap_body_shell", "Capacitor Body", footprint.fabRect, {
          fill: "#fbfbfb",
          stroke: "#8c8c8c",
          strokeWidth: 1.2,
          radiusScale: 0.08,
        }),
      );
      layers.push(
        createInsetRectLayer(footprint, "cap_body_glaze", "Ceramic Glaze", footprint.fabRect, 0.15, {
          fill: "rgba(255,255,255,0.28)",
          stroke: "#cfcfcf",
          strokeWidth: 0.7,
          radiusScale: 0.12,
        }),
      );
      layers.push(
        createEdgeBand(footprint, "cap_left_cap", "End Cap Left", footprint.fabRect, "left", 0.12, {
          fill: "#dddddd",
          stroke: "#9a9a9a",
          strokeWidth: 0.6,
        }),
      );
      layers.push(
        createEdgeBand(footprint, "cap_right_cap", "End Cap Right", footprint.fabRect, "right", 0.12, {
          fill: "#dddddd",
          stroke: "#9a9a9a",
          strokeWidth: 0.6,
        }),
      );
      layers.push(...createSilkLayers(footprint, footprint.silkLines, "cap"));
      return layers;
    },
  },
];

function parseFootprint(text, bodyWidthUm, bodyHeightUm) {
  const scale = Math.min(320 / bodyWidthUm, 240 / bodyHeightUm);
  const pxPerMm = scale * 1000;
  const centerX = STAGE_WIDTH / 2;
  const centerY = STAGE_HEIGHT / 2;

  const fabRect = extractFabRect(text);
  if (!fabRect) {
    throw new Error("Missing F.Fab rect in footprint.");
  }

  const silkLines = extractBlocks(text, "fp_line")
    .filter((block) => block.includes('(layer "F.SilkS")'))
    .map((block) => {
      const match = block.match(/\(start\s+([-\d.]+)\s+([-\d.]+)\)\s*\(end\s+([-\d.]+)\s+([-\d.]+)\)/);
      if (!match) {
        throw new Error("Invalid F.SilkS line block.");
      }
      return {
        start: { x: Number(match[1]), y: Number(match[2]) },
        end: { x: Number(match[3]), y: Number(match[4]) },
      };
    });

  const pads = extractBlocks(text, "pad").map((block) => {
    const match = block.match(/\(pad\s+"([^"]+)"\s+smd\s+(\w+)\s*\(at\s+([-\d.]+)\s+([-\d.]+)(?:\s+[-\d.]+)?\)\s*\(size\s+([-\d.]+)\s+([-\d.]+)\)/);
    if (!match) {
      throw new Error("Invalid pad block.");
    }
    const ratioMatch = block.match(/\(roundrect_rratio\s+([-\d.]+)\)/);
    return {
      id: match[1],
      shape: match[2],
      at: { x: Number(match[3]), y: Number(match[4]) },
      size: { width: Number(match[5]), height: Number(match[6]) },
      roundrectRatio: ratioMatch ? Number(ratioMatch[1]) : 0,
    };
  });

  return {
    pxPerMm,
    centerX,
    centerY,
    fabRect,
    silkLines,
    pads,
  };
}

function extractFabRect(text) {
  for (const block of extractBlocks(text, "fp_rect")) {
    if (!block.includes('(layer "F.Fab")')) {
      continue;
    }
    const match = block.match(/\(start\s+([-\d.]+)\s+([-\d.]+)\)\s*\(end\s+([-\d.]+)\s+([-\d.]+)\)/);
    if (!match) {
      continue;
    }
    return normalizeRect({
      start: { x: Number(match[1]), y: Number(match[2]) },
      end: { x: Number(match[3]), y: Number(match[4]) },
    });
  }
  return null;
}

function extractBlocks(text, head) {
  const blocks = [];
  const token = `(${head}`;
  let start = text.indexOf(token);
  while (start !== -1) {
    let depth = 0;
    let inString = false;
    let end = start;
    for (; end < text.length; end += 1) {
      const char = text[end];
      if (char === '"' && text[end - 1] !== "\\") {
        inString = !inString;
      }
      if (inString) {
        continue;
      }
      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          blocks.push(text.slice(start, end + 1));
          break;
        }
      }
    }
    start = text.indexOf(token, end + 1);
  }
  return blocks;
}

function normalizeRect(rect) {
  return {
    x: Math.min(rect.start.x, rect.end.x),
    y: Math.min(rect.start.y, rect.end.y),
    width: Math.abs(rect.end.x - rect.start.x),
    height: Math.abs(rect.end.y - rect.start.y),
  };
}

function toStageRect(footprint, rect) {
  return {
    x: round(footprint.centerX + rect.x * footprint.pxPerMm),
    y: round(footprint.centerY + rect.y * footprint.pxPerMm),
    width: round(rect.width * footprint.pxPerMm),
    height: round(rect.height * footprint.pxPerMm),
  };
}

function createRectLayer(footprint, id, name, sourceRect, style) {
  const rect = toStageRect(footprint, sourceRect);
  return createRectLayerFromStageRect(id, name, rect, style);
}

function createRectLayerFromStageRect(id, name, rect, style) {
  return {
    id,
    name,
    kind: "rect",
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    radius: round(Math.max(4, Math.min(rect.width, rect.height) * (style.radiusScale ?? 0.08))),
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
  };
}

function createPadLayers(footprint, pads, style) {
  return pads.map((pad, index) => {
    const rect = {
      x: round(footprint.centerX + (pad.at.x - pad.size.width / 2) * footprint.pxPerMm),
      y: round(footprint.centerY + (pad.at.y - pad.size.height / 2) * footprint.pxPerMm),
      width: round(pad.size.width * footprint.pxPerMm),
      height: round(pad.size.height * footprint.pxPerMm),
    };
    return {
      id: `pad_${index + 1}`,
      name: `Pad ${pad.id}`,
      kind: "rect",
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      radius: round(Math.max(6, Math.min(rect.width, rect.height) * Math.max(0.12, pad.roundrectRatio || 0.12))),
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: 1,
    };
  });
}

function createInsetRectLayer(footprint, id, name, sourceRect, insetRatio, style) {
  const rect = toStageRect(footprint, sourceRect);
  const insetX = rect.width * insetRatio;
  const insetY = rect.height * insetRatio;
  return createRectLayerFromStageRect(
    id,
    name,
    {
      x: round(rect.x + insetX),
      y: round(rect.y + insetY),
      width: round(rect.width - insetX * 2),
      height: round(rect.height - insetY * 2),
    },
    style,
  );
}

function createVerticalBand(footprint, id, name, sourceRect, centerRatio, widthRatio, style) {
  const rect = toStageRect(footprint, sourceRect);
  const width = rect.width * widthRatio;
  return createRectLayerFromStageRect(
    id,
    name,
    {
      x: round(rect.x + rect.width * centerRatio - width / 2),
      y: round(rect.y + rect.height * 0.12),
      width: round(width),
      height: round(rect.height * 0.76),
    },
    { ...style, radiusScale: 0.04 },
  );
}

function createEdgeBand(footprint, id, name, sourceRect, side, widthRatio, style) {
  const rect = toStageRect(footprint, sourceRect);
  const width = rect.width * widthRatio;
  const x = side === "left" ? rect.x + rect.width * 0.08 : rect.x + rect.width - rect.width * 0.08 - width;
  return createRectLayerFromStageRect(
    id,
    name,
    {
      x: round(x),
      y: round(rect.y + rect.height * 0.14),
      width: round(width),
      height: round(rect.height * 0.72),
    },
    { ...style, radiusScale: 0.05 },
  );
}

function createSilkLayers(footprint, lines, prefix) {
  return lines.map((line, index) => ({
    id: `${prefix}_silk_${index + 1}`,
    name: `Silk ${index + 1}`,
    kind: "line",
    x1: round(footprint.centerX + line.start.x * footprint.pxPerMm),
    y1: round(footprint.centerY + line.start.y * footprint.pxPerMm),
    x2: round(footprint.centerX + line.end.x * footprint.pxPerMm),
    y2: round(footprint.centerY + line.end.y * footprint.pxPerMm),
    stroke: "#1a1a1a",
    strokeWidth: 1.6,
  }));
}

function round(value) {
  return Number(value.toFixed(1));
}

for (const profile of passiveProfiles) {
  const footprintText = fs.readFileSync(path.join(repoRoot, profile.footprintPath), "utf8");
  const footprint = parseFootprint(footprintText, profile.bodyWidthUm, profile.bodyHeightUm);
  const definition = {
    schema: "aura.component_definition.v1",
    metadata: profile.metadata,
    base: profile.base,
    children: [],
    shapeLayers: profile.buildLayers(footprint),
    persistentDimensions: [],
    behaviorDraft: defaultBehaviorDraft,
    compiledBehavior: defaultCompiledBehavior,
  };
  fs.writeFileSync(path.join(repoRoot, profile.outputPath), `${JSON.stringify(definition, null, 2)}\n`, "utf8");
  console.log(`Generated ${profile.outputPath}`);
}
