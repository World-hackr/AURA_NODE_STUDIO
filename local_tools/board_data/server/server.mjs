import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolRoot = normalize(join(__dirname, ".."));
const projectRoot = normalize(join(toolRoot, "..", ".."));
const webRoot = join(toolRoot, "web");
const dataRoot = join(toolRoot, "data");
const importedRoot = join(toolRoot, "assets", "imported");
const imageManifestPath = join(dataRoot, "board_images.json");
const profileOverridesPath = join(dataRoot, "board_overrides.json");
const snapshotPath = join(dataRoot, "boards.snapshot.json");
const detectorScript = join(projectRoot, "local_tools", "windows", "list_serial_boards.ps1");
const host = "127.0.0.1";
const port = Number(process.env.BOARD_DATA_PORT || 8844);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendError(response, statusCode, message) {
  json(response, statusCode, { ok: false, message });
}

function boardKeyFor(board) {
  const fingerprint =
    board.InstanceId ||
    [board.VendorId, board.ProductId, board.SerialId, board.Port].filter(Boolean).join(":") ||
    board.Port ||
    board.FriendlyName ||
    "unknown-board";

  return createHash("sha1").update(fingerprint).digest("hex").slice(0, 16);
}

function safeImportedFileName(boardKey, originalName, mimeType) {
  const lowerName = (originalName || "").toLowerCase();
  let extension = ".png";

  if (mimeType === "image/jpeg" || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    extension = ".jpg";
  } else if (mimeType === "image/webp" || lowerName.endsWith(".webp")) {
    extension = ".webp";
  }

  return `${boardKey}${extension}`;
}

async function ensureToolFolders() {
  await mkdir(dataRoot, { recursive: true });
  await mkdir(importedRoot, { recursive: true });

  try {
    await access(imageManifestPath);
  } catch {
    await writeFile(imageManifestPath, "{}\n", "utf8");
  }

  try {
    await access(profileOverridesPath);
  } catch {
    await writeFile(profileOverridesPath, "{}\n", "utf8");
  }

  try {
    await access(snapshotPath);
  } catch {
    await writeFile(snapshotPath, '{"generatedAt":null,"includeDisconnected":true,"summary":{"total":0,"connected":0,"disconnected":0,"usb":0,"bluetooth":0},"boards":[]}\n', "utf8");
  }
}

async function loadImageManifest() {
  try {
    const raw = await readFile(imageManifestPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveImageManifest(manifest) {
  await writeFile(imageManifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

async function loadProfileOverrides() {
  try {
    const raw = await readFile(profileOverridesPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveProfileOverrides(overrides) {
  await writeFile(profileOverridesPath, JSON.stringify(overrides, null, 2) + "\n", "utf8");
}

function runBoardScan(includeDisconnected) {
  return new Promise((resolve, reject) => {
    const args = ["-ExecutionPolicy", "Bypass", "-File", detectorScript, "-Json"];
    if (includeDisconnected) {
      args.push("-IncludeDisconnected");
    }

    const child = spawn("powershell.exe", args, {
      cwd: projectRoot,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Board scan failed with exit code ${code}.`));
        return;
      }

      const trimmed = stdout.trim();
      if (!trimmed) {
        resolve([]);
        return;
      }

      const parsed = JSON.parse(trimmed);
      resolve(Array.isArray(parsed) ? parsed : [parsed]);
    });
  });
}

async function buildBoardPayload(includeDisconnected) {
  const manifest = await loadImageManifest();
  const boardsRaw = await runBoardScan(includeDisconnected);

  const boards = boardsRaw.map((board) => {
    const boardKey = boardKeyFor(board);
    const image = manifest[boardKey] || null;

    return {
      ...board,
      BoardKey: boardKey,
      ImagePath: image?.path || null,
      ImageName: image?.originalName || null,
    };
  });

  const summary = {
    total: boards.length,
    connected: boards.filter((board) => board.Connected).length,
    disconnected: boards.filter((board) => !board.Connected).length,
    usb: boards.filter((board) => board.ConnectionType === "USB").length,
    bluetooth: boards.filter((board) => board.ConnectionType === "Bluetooth").length,
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    includeDisconnected,
    summary,
    boards,
  };

  await writeFile(snapshotPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return payload;
}

async function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const maxBytes = 10 * 1024 * 1024;

    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Request body too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    request.on("error", (error) => {
      reject(error);
    });
  });
}

async function importBoardImage(request, response) {
  let payload;
  try {
    payload = JSON.parse(await readRequestBody(request));
  } catch {
    sendError(response, 400, "Invalid JSON body.");
    return;
  }

  const boardKey = String(payload.boardKey || "").trim();
  const originalName = String(payload.originalName || "board-image.png").trim();
  const dataUrl = String(payload.dataUrl || "").trim();
  const match = dataUrl.match(/^data:(image\/png|image\/jpeg|image\/webp);base64,(.+)$/);

  if (!boardKey || !match) {
    sendError(response, 400, "A valid board key and PNG/JPEG/WEBP data URL are required.");
    return;
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const fileName = safeImportedFileName(boardKey, originalName, mimeType);
  const filePath = join(importedRoot, fileName);
  const publicPath = `/assets/imported/${fileName}`;

  try {
    await writeFile(filePath, Buffer.from(base64Data, "base64"));
    const manifest = await loadImageManifest();
    manifest[boardKey] = {
      originalName,
      path: publicPath,
      updatedAt: new Date().toISOString(),
    };
    await saveImageManifest(manifest);
  } catch (error) {
    sendError(response, 500, error.message);
    return;
  }

  json(response, 200, { ok: true, path: publicPath });
}

async function removeBoardImage(response, url) {
  const boardKey = String(url.searchParams.get("boardKey") || "").trim();
  if (!boardKey) {
    sendError(response, 400, "A boardKey query parameter is required.");
    return;
  }

  const manifest = await loadImageManifest();
  const entry = manifest[boardKey];
  if (!entry) {
    sendError(response, 404, "No image is stored for that board.");
    return;
  }

  const relativePath = String(entry.path || "").replace(/^\/+/, "");
  const filePath = join(toolRoot, relativePath);

  delete manifest[boardKey];
  await saveImageManifest(manifest);

  try {
    await rm(filePath, { force: true });
  } catch {
  }

  json(response, 200, { ok: true });
}

async function getProfileOverrides(response) {
  const overrides = await loadProfileOverrides();
  json(response, 200, { ok: true, overrides });
}

async function updateProfileOverride(request, response) {
  let payload;
  try {
    payload = JSON.parse(await readRequestBody(request));
  } catch {
    sendError(response, 400, "Invalid JSON body.");
    return;
  }

  const boardKey = String(payload.boardKey || "").trim();
  const profileId = String(payload.profileId || "").trim();
  if (!boardKey) {
    sendError(response, 400, "A boardKey is required.");
    return;
  }

  const overrides = await loadProfileOverrides();
  if (profileId) {
    overrides[boardKey] = profileId;
  } else {
    delete overrides[boardKey];
  }

  await saveProfileOverrides(overrides);
  json(response, 200, { ok: true, overrides });
}

function getStaticFilePath(urlPath) {
  if (urlPath === "/") {
    return join(webRoot, "index.html");
  }

  if (urlPath.startsWith("/data/")) {
    return join(toolRoot, urlPath.replace(/^\/+/, ""));
  }

  if (urlPath.startsWith("/assets/")) {
    return join(toolRoot, urlPath.replace(/^\/+/, ""));
  }

  if (urlPath.startsWith("/assets/imported/")) {
    return join(toolRoot, urlPath.replace(/^\/+/, ""));
  }

  return join(webRoot, urlPath.replace(/^\/+/, ""));
}

async function serveFile(response, filePath) {
  const normalizedPath = normalize(filePath);
  if (
    !normalizedPath.startsWith(webRoot) &&
    !normalizedPath.startsWith(importedRoot) &&
    !normalizedPath.startsWith(dataRoot)
  ) {
    sendError(response, 403, "Forbidden path.");
    return;
  }

  try {
    await access(normalizedPath);
  } catch {
    sendError(response, 404, "File not found.");
    return;
  }

  const contentType = contentTypes[extname(normalizedPath).toLowerCase()] || "application/octet-stream";
  const stream = createReadStream(normalizedPath);

  stream.on("error", () => {
    if (!response.headersSent) {
      sendError(response, 404, "File not found.");
    } else {
      response.end();
    }
  });

  response.writeHead(200, { "Content-Type": contentType });
  stream.pipe(response);
}

await ensureToolFolders();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/boards") {
      const includeDisconnected = url.searchParams.get("includeDisconnected") !== "false";
      const payload = await buildBoardPayload(includeDisconnected);
      json(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/import-image") {
      await importBoardImage(request, response);
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/import-image") {
      await removeBoardImage(response, url);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/profile-overrides") {
      await getProfileOverrides(response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/profile-overrides") {
      await updateProfileOverride(request, response);
      return;
    }

    if (request.method === "GET") {
      await serveFile(response, getStaticFilePath(url.pathname));
      return;
    }

    sendError(response, 405, "Method not allowed.");
  } catch (error) {
    console.error(error);
    sendError(response, 500, error.message);
  }
});

server.listen(port, host, () => {
  console.log(`Board Data Tool running at http://${host}:${port}`);
});
