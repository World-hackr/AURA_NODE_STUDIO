import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("Usage: node local_tools/component_import/scripts/extract_component_package_scene.mjs <scene.svg> [component.json] [--out output.json]");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  usage();
}

let outPath = null;
const positional = [];
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--out") {
    outPath = args[index + 1] ?? null;
    index += 1;
  } else {
    positional.push(args[index]);
  }
}

const scenePath = positional[0];
const componentPath = positional[1] ?? null;
if (!scenePath) {
  usage();
}

const sceneSvg = fs.readFileSync(scenePath, "utf8");
const componentJson = componentPath ? JSON.parse(fs.readFileSync(componentPath, "utf8")) : null;

const viewBoxMatch = sceneSvg.match(/viewBox="([^"]+)"/);
const widthMatch = sceneSvg.match(/width="([^"]+)"/);
const heightMatch = sceneSvg.match(/height="([^"]+)"/);

const ids = Array.from(sceneSvg.matchAll(/\sid="([^"]+)"/g)).map((match) => match[1]);
const nodeIds = Array.from(sceneSvg.matchAll(/data-aura-node-id="([^"]+)"/g)).map((match) => match[1]);
const pins = Array.from(
  sceneSvg.matchAll(
    /data-pin-id="([^"]+)"[^>]*data-pin-label="([^"]*)"[^>]*data-pin-owner="([^"]+)"[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"/g,
  ),
).map((match) => ({
  id: match[1],
  label: match[2],
  owner: match[3],
  x: Number(match[4]),
  y: Number(match[5]),
}));

const summary = {
  schema: "aura.scene_extract_summary.v1",
  source: {
    scene_path: path.resolve(scenePath),
    ...(componentPath ? { component_path: path.resolve(componentPath) } : {}),
  },
  svg: {
    width: widthMatch ? widthMatch[1] : null,
    height: heightMatch ? heightMatch[1] : null,
    viewBox: viewBoxMatch ? viewBoxMatch[1] : null,
    id_count: ids.length,
    node_id_count: nodeIds.length,
    pin_count: pins.length,
  },
  node_ids: nodeIds,
  pins,
  ...(componentJson
    ? {
        component: {
          schema: componentJson.schema ?? null,
          name: componentJson.metadata?.name ?? componentJson.definition?.metadata?.name ?? null,
          slug: componentJson.metadata?.slug ?? null,
        },
      }
    : {}),
};

const text = JSON.stringify(summary, null, 2);
if (outPath) {
  fs.writeFileSync(outPath, `${text}\n`);
  console.error(`Wrote ${outPath}`);
} else {
  process.stdout.write(`${text}\n`);
}
