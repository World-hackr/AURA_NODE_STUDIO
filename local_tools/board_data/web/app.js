import { enrichBoard, loadProfileOverrides } from "./board-catalog.js";

const state = {
  autoRefresh: true,
  refreshMs: 4000,
  timerId: null,
};

const boardGrid = document.querySelector("#boardGrid");
const boardCardTemplate = document.querySelector("#boardCardTemplate");
const summaryStrip = document.querySelector("#summaryStrip");
const snapshotStatus = document.querySelector("#snapshotStatus");
const refreshButton = document.querySelector("#refreshButton");
const autoRefreshToggle = document.querySelector("#autoRefreshToggle");

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

function isMeaningfulValue(value) {
  if (!value) {
    return false;
  }

  const lowered = String(value).trim().toLowerCase();
  return !["unknown", "not applicable", "unknown mcu"].includes(lowered);
}

function buildSummary(boards) {
  return {
    live: boards.length,
    usb: boards.filter((board) => board.ConnectionType === "USB").length,
    bluetooth: boards.filter((board) => board.ConnectionType === "Bluetooth").length,
  };
}

function renderSummary(summary) {
  const items = [
    ["Live", summary.live],
    ["USB", summary.usb],
    ["Bluetooth", summary.bluetooth],
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

function buildFactRows(items, limit = 4) {
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

function buildSignalChips(board) {
  const chips = [
    { label: board.ProfileMode === "manual" ? "Manual profile" : "Auto profile", tone: board.ProfileMode === "manual" ? "manual" : "auto" },
  ];

  if (isMeaningfulValue(board.BridgeChip) && board.ConnectionType === "USB") {
    chips.push({ label: board.BridgeChip, tone: "bridge" });
  }

  if (board.ImagePath) {
    chips.push({ label: "PNG", tone: "asset" });
  }

  return chips
    .map(
      (chip) => `
        <span class="signal-chip ${escapeHtml(chip.tone)}">${escapeHtml(chip.label)}</span>
      `,
    )
    .join("");
}

function buildLiveFacts(board) {
  return [
    ["Chip", board.Profile.chip],
    ["Wireless", board.Profile.wireless],
    ["Memory", board.Profile.memory],
    ["Storage", board.Profile.storage],
    ["Bridge", board.BridgeChip],
  ];
}

function buildContextNote(board) {
  const prefix = board.ProfileMode === "manual" ? "Manual profile." : "Auto profile.";
  if (!board.Profile.confidence) {
    return prefix;
  }

  return `${prefix} ${board.Profile.confidence}`;
}

function getTone(board) {
  return board.ConnectionType === "Bluetooth" ? "tone-bluetooth" : "tone-usb";
}

function createBoardCard(board) {
  const fragment = boardCardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".board-card");
  const portBadge = fragment.querySelector(".port-badge");
  const boardTitle = fragment.querySelector(".board-title");
  const boardSubtitle = fragment.querySelector(".board-subtitle");
  const connectionBadge = fragment.querySelector(".connection-badge");
  const signalStrip = fragment.querySelector(".signal-strip");
  const liveFacts = fragment.querySelector(".live-facts");
  const contextNote = fragment.querySelector(".context-note");
  const detailLink = fragment.querySelector(".detail-link");

  card.classList.add(getTone(board), "tone-live");
  portBadge.textContent = board.Port || "No Port";
  connectionBadge.textContent = board.ConnectionType || "Serial";
  connectionBadge.classList.add(board.ConnectionType === "Bluetooth" ? "bluetooth" : "usb");
  boardTitle.textContent = board.Profile.label || board.FriendlyName || board.LikelyBoard || "Unknown Board";
  boardSubtitle.textContent = board.FriendlyName || board.LikelyBoard || board.Description || "Detected serial device";
  signalStrip.innerHTML = buildSignalChips(board);
  liveFacts.innerHTML = buildFactRows(buildLiveFacts(board), 4);
  contextNote.textContent = buildContextNote(board);
  detailLink.href = `./archive.html#${encodeURIComponent(board.BoardKey)}`;

  return fragment;
}

async function fetchPayload() {
  try {
    const apiResponse = await fetch("/api/boards?includeDisconnected=false");
    if (!apiResponse.ok) {
      throw new Error("API scan unavailable");
    }
    return await apiResponse.json();
  } catch {
    const snapshotResponse = await fetch(`/data/boards.snapshot.json?ts=${Date.now()}`);
    const payload = await snapshotResponse.json();
    payload.boards = (payload.boards || []).filter((board) => board.Connected);
    return payload;
  }
}

async function loadBoards() {
  snapshotStatus.textContent = "Scanning live ports...";

  const [payload, overrides] = await Promise.all([fetchPayload(), loadProfileOverrides()]);
  const boards = (payload.boards || [])
    .filter((board) => board.Connected)
    .map((board) => enrichBoard(board, overrides));
  const summary = buildSummary(boards);

  renderSummary(summary);
  snapshotStatus.textContent = `Last scan ${formatTimestamp(payload.generatedAt)} | ${summary.live} live`;

  boardGrid.innerHTML = "";

  if (!boards.length) {
    boardGrid.innerHTML = `
      <article class="panel empty-panel">
        <p class="panel-label">No Live Boards</p>
        <p class="snapshot-text">No online serial boards are visible right now.</p>
      </article>
    `;
    return;
  }

  for (const board of boards) {
    boardGrid.append(createBoardCard(board));
  }
}

function syncAutoRefresh() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  if (state.autoRefresh) {
    state.timerId = setInterval(() => {
      loadBoards().catch((error) => {
        snapshotStatus.textContent = `Scan failed: ${error.message}`;
      });
    }, state.refreshMs);
  }
}

refreshButton.addEventListener("click", () => {
  loadBoards().catch((error) => {
    snapshotStatus.textContent = `Scan failed: ${error.message}`;
  });
});

autoRefreshToggle.addEventListener("change", () => {
  state.autoRefresh = autoRefreshToggle.checked;
  syncAutoRefresh();
});

syncAutoRefresh();
loadBoards().catch((error) => {
  snapshotStatus.textContent = `Scan failed: ${error.message}`;
});
