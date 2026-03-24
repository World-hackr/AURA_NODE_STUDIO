import { PROFILE_OPTIONS, enrichBoard, loadProfileOverrides } from "./board-catalog.js";

const boardGrid = document.querySelector("#boardGrid");
const boardCardTemplate = document.querySelector("#boardCardTemplate");
const summaryStrip = document.querySelector("#summaryStrip");
const snapshotStatus = document.querySelector("#snapshotStatus");
const refreshButton = document.querySelector("#refreshButton");
let openBoardKey = null;
let initializedFromHash = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "No snapshot yet";
  }

  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function isMeaningfulValue(value) {
  if (!value) {
    return false;
  }

  const lowered = String(value).trim().toLowerCase();
  return !["unknown", "not applicable", "unknown mcu"].includes(lowered);
}

function buildSummary(boards) {
  return {
    connected: boards.filter((board) => board.Connected).length,
    disconnected: boards.filter((board) => !board.Connected).length,
    usb: boards.filter((board) => board.ConnectionType === "USB").length,
    bluetooth: boards.filter((board) => board.ConnectionType === "Bluetooth").length,
    total: boards.length,
  };
}

function buildSummaryCards(summary) {
  const items = [
    ["Live", summary.connected],
    ["Remembered", summary.disconnected],
    ["USB", summary.usb],
    ["Bluetooth", summary.bluetooth],
    ["Total", summary.total],
  ];

  summaryStrip.innerHTML = items
    .map(
      ([label, value]) => `
        <article class="summary-card summary-card-compact">
          <p class="summary-label">${escapeHtml(label)}</p>
          <p class="summary-value">${escapeHtml(value)}</p>
        </article>
      `,
    )
    .join("");
}

function buildFactRows(items, limit = Number.POSITIVE_INFINITY) {
  return items
    .filter(([, value]) => isMeaningfulValue(value))
    .slice(0, limit)
    .map(
      ([label, value]) => `
        <div class="fact-row">
          <span class="fact-key">${escapeHtml(label)}</span>
          <span class="fact-value">${escapeHtml(value)}</span>
        </div>
      `,
    )
    .join("");
}

function buildSourceLinks(board) {
  if (!board.Profile.sources?.length) {
    return "";
  }

  return board.Profile.sources
    .map(
      (source) => `
        <a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>
      `,
    )
    .join("");
}

function buildIdentityFacts(board) {
  return [
    ["Detected", board.FriendlyName || board.LikelyBoard || board.Description],
    ["Chip", board.Profile.chip],
    ["Connection", board.ConnectionType],
    ["Bridge", board.BridgeChip],
    ["VID:PID", board.VendorId && board.ProductId ? `${board.VendorId}:${board.ProductId}` : null],
    ["Vendor", board.Vendor],
  ];
}

function buildCapabilityFacts(board) {
  return [
    ["MCU", board.Profile.mcu],
    ["Wireless", board.Profile.wireless],
    ["Memory", board.Profile.memory],
    ["Storage", board.Profile.storage],
    ["I/O", board.Profile.io],
    ["Power", board.Profile.power],
  ];
}

function buildRawFacts(board) {
  return [
    ["Board Guess", board.LikelyBoard],
    ["Revision", board.Revision],
    ["Driver", board.DriverName],
    ["Service", board.Service],
    ["Port State", board.Status],
    ["Location", board.Location],
    ["Serial Id", board.SerialId],
    ["Board Key", board.BoardKey],
    ["Instance Id", board.InstanceId],
    ["Hardware Ids", board.HardwareIds],
  ];
}

function fillProfileSelector(selectElement, board) {
  const options = [
    `<option value="">Auto detect</option>`,
    ...PROFILE_OPTIONS.map(
      (option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`,
    ),
  ];

  selectElement.innerHTML = options.join("");
  selectElement.value = board.ProfileMode === "manual" ? board.ProfileId : "";
}

async function saveProfileOverride(boardKey, profileId) {
  await fetch("/api/profile-overrides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boardKey,
      profileId,
    }),
  });
}

function createBoardCard(board, selectedBoardKey) {
  const fragment = boardCardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".board-card");
  const portBadge = fragment.querySelector(".port-badge");
  const boardTitle = fragment.querySelector(".board-title");
  const boardSubtitle = fragment.querySelector(".board-subtitle");
  const stateBadge = fragment.querySelector(".state-badge");
  const connectionBadge = fragment.querySelector(".connection-badge");
  const profileSelector = fragment.querySelector(".profile-selector");
  const expandToggle = fragment.querySelector(".expand-toggle");
  const profileSummary = fragment.querySelector(".profile-summary");
  const archiveBody = fragment.querySelector(".archive-body");
  const overviewFacts = fragment.querySelector(".overview-facts");
  const capabilityFacts = fragment.querySelector(".capability-facts");
  const imageShell = fragment.querySelector(".mini-image-shell");
  const boardImage = fragment.querySelector(".board-image");
  const imageInput = fragment.querySelector(".image-input");
  const removeImageButton = fragment.querySelector(".remove-image");
  const sourceLinks = fragment.querySelector(".source-links");
  const notesBlock = fragment.querySelector(".notes-block");
  const rawFacts = fragment.querySelector(".raw-facts");

  card.classList.add(board.Connected ? "tone-live" : "tone-remembered");
  card.classList.add(board.ConnectionType === "Bluetooth" ? "tone-bluetooth" : "tone-usb");

  if (selectedBoardKey && selectedBoardKey === board.BoardKey) {
    card.classList.add("board-card-focus");
  }

  portBadge.textContent = board.Port || "No Port";
  connectionBadge.textContent = board.ConnectionType || "Serial";
  connectionBadge.classList.add(board.ConnectionType === "Bluetooth" ? "bluetooth" : "usb");
  stateBadge.textContent = board.Connected ? "Live" : "Remembered";
  stateBadge.classList.add(board.Connected ? "live" : "remembered");
  boardTitle.textContent = board.Profile.label || board.FriendlyName || board.LikelyBoard || "Unknown Board";
  boardSubtitle.textContent = board.FriendlyName || board.LikelyBoard || board.Description || "Detected serial device";
  profileSummary.textContent = `${board.ProfileMode === "manual" ? "Manual profile." : "Auto profile."} ${board.Profile.confidence || ""}`.trim();
  overviewFacts.innerHTML = buildFactRows(buildIdentityFacts(board), 6);
  capabilityFacts.innerHTML = buildFactRows(buildCapabilityFacts(board), 6);
  sourceLinks.innerHTML = buildSourceLinks(board);
  rawFacts.innerHTML = buildFactRows(buildRawFacts(board));
  fillProfileSelector(profileSelector, board);

  const isOpen = openBoardKey === board.BoardKey;
  archiveBody.classList.toggle("hidden", !isOpen);
  card.classList.toggle("archive-card-open", Boolean(isOpen));
  expandToggle.textContent = isOpen ? "Close" : "Open";

  expandToggle.addEventListener("click", async () => {
    const nextKey = openBoardKey === board.BoardKey ? null : board.BoardKey;
    openBoardKey = nextKey;
    await loadBoards();
  });

  if (board.ImagePath) {
    boardImage.src = board.ImagePath;
    boardImage.alt = board.ImageName || `${board.FriendlyName || board.Port} board image`;
    imageShell.classList.remove("hidden");
    removeImageButton.classList.remove("hidden");
  }

  const notes = [board.Profile.notes, board.Notes].filter(Boolean).join(" ");
  if (notes) {
    notesBlock.textContent = notes;
    notesBlock.classList.remove("hidden");
  }

  profileSelector.addEventListener("change", async () => {
    await saveProfileOverride(board.BoardKey, profileSelector.value);
    await loadBoards();
  });

  imageInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    await fetch("/api/import-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardKey: board.BoardKey,
        originalName: file.name,
        dataUrl,
      }),
    });
    await loadBoards();
  });

  removeImageButton.addEventListener("click", async () => {
    await fetch(`/api/import-image?boardKey=${encodeURIComponent(board.BoardKey)}`, {
      method: "DELETE",
    });
    await loadBoards();
  });

  return fragment;
}

async function fetchPayload() {
  try {
    const apiResponse = await fetch("/api/boards?includeDisconnected=true");
    if (!apiResponse.ok) {
      throw new Error("API scan unavailable");
    }
    return await apiResponse.json();
  } catch {
    const snapshotResponse = await fetch(`/data/boards.snapshot.json?ts=${Date.now()}`);
    return await snapshotResponse.json();
  }
}

async function loadBoards() {
  snapshotStatus.textContent = "Loading archive...";

  const [payload, overrides] = await Promise.all([fetchPayload(), loadProfileOverrides()]);
  const selectedBoardKey = decodeURIComponent((window.location.hash || "").replace(/^#/, ""));
  if (!initializedFromHash && selectedBoardKey) {
    openBoardKey = selectedBoardKey;
    initializedFromHash = true;
  }
  const boards = (payload.boards || []).map((board) => enrichBoard(board, overrides));
  const summary = payload.summary || buildSummary(boards);

  buildSummaryCards(summary);
  snapshotStatus.textContent = `Last scan ${formatTimestamp(payload.generatedAt)} | ${summary.total} stored`;

  boardGrid.innerHTML = "";

  if (!boards.length) {
    boardGrid.innerHTML = `
      <article class="panel empty-panel">
        <p class="panel-label">No Stored Boards</p>
        <p class="snapshot-text">No current or remembered board records are available yet.</p>
      </article>
    `;
    return;
  }

  for (const board of boards) {
    boardGrid.append(createBoardCard(board, selectedBoardKey));
  }
}

refreshButton.addEventListener("click", () => {
  loadBoards().catch((error) => {
    snapshotStatus.textContent = `Scan failed: ${error.message}`;
  });
});

loadBoards().catch((error) => {
  snapshotStatus.textContent = `Scan failed: ${error.message}`;
});
