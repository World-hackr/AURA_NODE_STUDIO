import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const wokwiSrcDir = path.join(repoRoot, "vendor_reference", "wokwi-elements", "src");
const outputDir = path.join(repoRoot, "shared", "wokwi_models_v1", "generated");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function extractBalancedBlock(text, startIndex, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let stringChar = "";
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    const prev = text[index - 1];
    if ((char === '"' || char === "'" || char === "`") && prev !== "\\") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (stringChar === char) {
        inString = false;
        stringChar = "";
      }
    }
    if (inString) {
      continue;
    }
    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }
  return null;
}

function extractPinInfoArray(text) {
  const readonlyMatch = /readonly\s+pinInfo\s*:\s*ElementPin\[\]\s*=\s*\[/m.exec(text);
  if (readonlyMatch) {
    const equalsIndex = text.indexOf("=", readonlyMatch.index);
    const bracketIndex = equalsIndex === -1 ? -1 : text.indexOf("[", equalsIndex);
    if (bracketIndex !== -1) {
      const block = extractBalancedBlock(text, bracketIndex, "[", "]");
      if (block) {
        return block;
      }
    }
  }

  const getterStartMatch = /get\s+pinInfo\(\)\s*(?::\s*ElementPin\[\])?\s*\{/m.exec(text);
  if (getterStartMatch) {
    const getterBodyStart = text.indexOf("{", getterStartMatch.index);
    if (getterBodyStart !== -1) {
      const getterBody = extractBalancedBlock(text, getterBodyStart, "{", "}");
      if (getterBody) {
        const returnIndex = getterBody.indexOf("return [");
        if (returnIndex !== -1) {
          const bracketIndex = getterBody.indexOf("[", returnIndex);
          if (bracketIndex !== -1) {
            return extractBalancedBlock(getterBody, bracketIndex, "[", "]");
          }
        }
      }
    }
  }

  return null;
}

function extractPins(pinArrayText) {
  if (!pinArrayText) {
    return { status: "missing", pins: [] };
  }

  const pins = [];
  const objectMatches = [];
  for (let index = 0; index < pinArrayText.length; index += 1) {
    if (pinArrayText[index] !== "{") {
      continue;
    }
    const block = extractBalancedBlock(pinArrayText, index, "{", "}");
    if (!block) {
      continue;
    }
    objectMatches.push(block);
    index += block.length - 1;
  }

  for (const objectText of objectMatches) {
    const nameMatch = objectText.match(/name\s*:\s*['"]([^'"]+)['"]/);
    const xMatch = objectText.match(/x\s*:\s*([^,\n}]+)/);
    const yMatch = objectText.match(/y\s*:\s*([^,\n}]+)/);
    const numberMatch = objectText.match(/number\s*:\s*([^,\n}]+)/);
    if (!nameMatch || !xMatch || !yMatch) {
      continue;
    }
    const xRaw = xMatch[1].trim();
    const yRaw = yMatch[1].trim();
    const numberRaw = numberMatch ? numberMatch[1].trim() : null;
    const xNumeric = Number(xRaw);
    const yNumeric = Number(yRaw);
    const numberNumeric = numberRaw != null ? Number(numberRaw) : null;
    pins.push({
      name: nameMatch[1],
      ...(Number.isFinite(xNumeric) ? { x: xNumeric } : { xExpression: xRaw }),
      ...(Number.isFinite(yNumeric) ? { y: yNumeric } : { yExpression: yRaw }),
      ...(numberRaw != null ? (Number.isFinite(numberNumeric) ? { number: numberNumeric } : { numberExpression: numberRaw }) : {}),
    });
  }

  return {
    status: pins.length > 0 ? "parsed" : "unparsed",
    pins,
  };
}

function extractProperties(text) {
  const pattern =
    /@property(?:\(([\s\S]*?)\))?\s*(?:private\s+|protected\s+|public\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[^=;\n]+)?(?:=\s*([^;\n]+))?;/g;
  const properties = [];
  let match;
  while ((match = pattern.exec(text))) {
    properties.push({
      name: match[2],
      ...(match[1] && match[1].trim().length > 0 ? { decorator: match[1].trim() } : {}),
      ...(match[3] ? { defaultRaw: match[3].trim() } : {}),
    });
  }
  return properties;
}

function extractSvgMetrics(text) {
  const widthMatch = text.match(/width="([^"]+)"/);
  const heightMatch = text.match(/height="([^"]+)"/);
  const viewBoxMatch = text.match(/viewBox="([^"]+)"/);
  return {
    width: widthMatch ? widthMatch[1] : null,
    height: heightMatch ? heightMatch[1] : null,
    viewBox: viewBoxMatch ? viewBoxMatch[1] : null,
  };
}

function extractTagName(text) {
  const match = text.match(/@customElement\(['"]([^'"]+)['"]\)/);
  return match ? match[1] : null;
}

function extractClassName(text) {
  const match = text.match(/export\s+class\s+([A-Za-z0-9_]+)/);
  return match ? match[1] : null;
}

function sanitizeId(value) {
  return value
    .replace(/^wokwi-/, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function extractComponent(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const tagName = extractTagName(text);
  const className = extractClassName(text);
  if (!tagName) {
    return null;
  }

  const pinArrayText = extractPinInfoArray(text);
  const pinInfo = extractPins(pinArrayText);
  const metrics = extractSvgMetrics(text);
  const properties = extractProperties(text);
  const fileName = path.basename(filePath);

  return {
    schema: "aura.wokwi_source_extract.v1",
    id: sanitizeId(tagName),
    tagName,
    className,
    sourceFile: fileName,
    metrics,
    pinInfo: {
      status: pinInfo.status,
      count: pinInfo.pins.length,
      pins: pinInfo.pins,
    },
    properties,
  };
}

ensureDir(outputDir);

const files = fs
  .readdirSync(wokwiSrcDir)
  .filter((entry) => entry.endsWith("-element.ts"))
  .sort((a, b) => a.localeCompare(b));

const components = [];
for (const file of files) {
  const extracted = extractComponent(path.join(wokwiSrcDir, file));
  if (!extracted) {
    continue;
  }
  components.push(extracted);
  fs.writeFileSync(
    path.join(outputDir, `${extracted.id}.wokwi.extract.json`),
    `${JSON.stringify(extracted, null, 2)}\n`,
  );
}

const index = {
  schema: "aura.wokwi_source_extract_index.v1",
  generatedFrom: "vendor_reference/wokwi-elements/src/*.ts",
  componentCount: components.length,
  components: components.map((component) => ({
    id: component.id,
    tagName: component.tagName,
    sourceFile: component.sourceFile,
    pinCount: component.pinInfo.count,
    path: `generated/${component.id}.wokwi.extract.json`,
  })),
};

fs.writeFileSync(path.join(outputDir, "generated_index.json"), `${JSON.stringify(index, null, 2)}\n`);

process.stdout.write(
  `${JSON.stringify(
    {
      generatedCount: components.length,
      outputDir: path.relative(repoRoot, outputDir),
    },
    null,
    2,
  )}\n`,
);
