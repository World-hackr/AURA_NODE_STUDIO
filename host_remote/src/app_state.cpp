#include "app_state.h"

#include <algorithm>

namespace {

RadioSelfTestState makeDefaultRadioSelfTestState() {
  return RadioSelfTestState{
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0,
  };
}

void initializeDemoParts(AppState& state) {
  state.parts[0] = InventoryPart{"220R RES", "220R 1/4W", "RESISTOR", "DRAWER A3", 43, 8, 0};
  state.parts[1] = InventoryPart{"LED 5MM", "RED DIFFUSED", "LED", "BIN C1", 26, 6, 1};
  state.parts[2] = InventoryPart{"ESP32 DEV", "DEVKIT V1", "MCU", "TRAY B2", 5, 2, 2};
  state.parts[3] = InventoryPart{"100NF CAP", "CERAMIC", "CAPACITOR", "DRAWER D4", 71, 10, -1};
}

void initializeDemoNodes(AppState& state) {
  state.nodes[0] = NodeRecord{"N01", "DRAWER BANK", "LAST 4S", 16, true};
  state.nodes[1] = NodeRecord{"N02", "SMALL PARTS", "LAST 9S", 16, true};
  state.nodes[2] = NodeRecord{"N03", "MCU TRAY", "LAST 3M", 8, false};
}

}  // namespace

void initializeAppState(AppState& state) {
  state.screen = HostScreen::Home;
  state.radioReturnScreen = HostScreen::Setup;
  state.selectionIndex = 0;
  state.selectedPartIndex = 0;
  state.selectedNodeIndex = 0;
  state.batteryPercent = 82;
  state.needsRender = true;
  state.phoneLinked = false;
  state.cacheFresh = true;
  state.locateSessionActive = false;
  state.pendingInventoryDelta = 0;
  state.locateAttemptCount = 0;
  state.locateState = LocateSessionState::Idle;
  initializeDemoParts(state);
  initializeDemoNodes(state);
  state.radioTest = makeDefaultRadioSelfTestState();
}

void setScreen(AppState& state, HostScreen screen) {
  state.screen = screen;

  switch (screen) {
    case HostScreen::LocateList:
      state.selectionIndex = state.selectedPartIndex;
      break;
    case HostScreen::InventoryList:
      state.selectionIndex = state.selectedPartIndex;
      break;
    case HostScreen::NodesList:
      state.selectionIndex = state.selectedNodeIndex;
      break;
    default:
      state.selectionIndex = 0;
      break;
  }

  state.needsRender = true;
}

void moveSelection(AppState& state, int delta) {
  const uint8_t itemCount = menuItemCount(state);
  if (itemCount == 0) {
    return;
  }

  int next = static_cast<int>(state.selectionIndex) + delta;
  while (next < 0) {
    next += itemCount;
  }

  state.selectionIndex = static_cast<uint8_t>(next % itemCount);
  state.needsRender = true;
}

void goHome(AppState& state) {
  state.screen = HostScreen::Home;
  state.selectionIndex = 0;
  state.pendingInventoryDelta = 0;
  state.needsRender = true;
}

uint8_t menuItemCount(const AppState& state) {
  switch (state.screen) {
    case HostScreen::Home:
      return 4;
    case HostScreen::LocateList:
      return kPartCount;
    case HostScreen::LocateSession:
      return 1;
    case HostScreen::InventoryList:
      return kPartCount;
    case HostScreen::InventoryAdjust:
      return 1;
    case HostScreen::NodesList:
      return kNodeCount;
    case HostScreen::NodeDetail:
      return 2;
    case HostScreen::PhoneSync:
      return 3;
    case HostScreen::Setup:
      return 4;
    case HostScreen::Radio:
      return 2;
  }

  return 0;
}

bool radioLooksHealthy(const AppState& state) {
  return state.radioTest.hasRun && state.radioTest.spiLooksAlive && state.radioTest.writeReadbackPass &&
         state.radioTest.ceTriggerPass;
}

const InventoryPart& selectedPart(const AppState& state) {
  return state.parts[state.selectedPartIndex];
}

InventoryPart& selectedPart(AppState& state) {
  return state.parts[state.selectedPartIndex];
}

const NodeRecord& selectedNode(const AppState& state) {
  return state.nodes[state.selectedNodeIndex];
}

NodeRecord& selectedNode(AppState& state) {
  return state.nodes[state.selectedNodeIndex];
}

int16_t effectiveSelectedPartQuantity(const AppState& state) {
  const int32_t adjusted =
      static_cast<int32_t>(selectedPart(state).quantity) + static_cast<int32_t>(state.pendingInventoryDelta);
  return static_cast<int16_t>(std::max<int32_t>(0, adjusted));
}

const char* locateStateLabel(const AppState& state) {
  switch (state.locateState) {
    case LocateSessionState::Idle:
      return "READY";
    case LocateSessionState::AwaitingRemote:
      return "AWAIT ACK";
    case LocateSessionState::NeedsRadioCheck:
      return "CHECK RF";
    case LocateSessionState::NodeOffline:
      return "NODE OFF";
    case LocateSessionState::NoTarget:
      return "NO TARGET";
  }

  return "READY";
}
