#include "ui_screen.h"

#include <stdio.h>

namespace {

const char* screenLabel(HostScreen screen) {
  switch (screen) {
    case HostScreen::Home:
      return "Home";
    case HostScreen::LocateList:
      return "Locate";
    case HostScreen::LocateSession:
      return "Locate Session";
    case HostScreen::InventoryList:
      return "Inventory";
    case HostScreen::InventoryAdjust:
      return "Adjust Stock";
    case HostScreen::NodesList:
      return "Nodes";
    case HostScreen::NodeDetail:
      return "Node Detail";
    case HostScreen::PhoneSync:
      return "Phone Sync";
    case HostScreen::Setup:
      return "Setup";
    case HostScreen::Radio:
      return "Radio Check";
  }

  return "Unknown";
}

const char* radioOverallLabel(const RadioSelfTestState& radioTest) {
  if (!radioTest.hasRun) {
    return "NOT RUN";
  }

  if (radioTest.spiLooksAlive && radioTest.writeReadbackPass && radioTest.ceTriggerPass) {
    return "PASS";
  }

  if (!radioTest.spiLooksAlive || !radioTest.writeReadbackPass) {
    return "FAIL";
  }

  return "PARTIAL";
}

void printItem(bool selected, const __FlashStringHelper* label) {
  Serial.print(selected ? F("> ") : F("  "));
  Serial.println(label);
}

void printPartSelection(const AppState& state, uint8_t index) {
  const InventoryPart& part = state.parts[index];
  Serial.print(state.selectionIndex == index ? F("> ") : F("  "));
  Serial.print(part.shortLabel);
  Serial.print(F("  QTY "));
  Serial.println(part.quantity);
}

void printNodeSelection(const AppState& state, uint8_t index) {
  const NodeRecord& node = state.nodes[index];
  Serial.print(state.selectionIndex == index ? F("> ") : F("  "));
  Serial.print(node.idLabel);
  Serial.print(' ');
  Serial.println(node.online ? F("ONLINE") : F("OFFLINE"));
}

void renderHome(const AppState& state) {
  printItem(state.selectionIndex == 0, F("Locate"));
  printItem(state.selectionIndex == 1, F("Inventory"));
  printItem(state.selectionIndex == 2, F("Phone Sync"));
  printItem(state.selectionIndex == 3, F("Setup"));
}

void renderLocateList(const AppState& state) {
  const InventoryPart& part = selectedPart(state);
  Serial.print(F("Selected: "));
  Serial.print(part.detailLabel);
  Serial.print(F("  @ "));
  Serial.println(part.locationLabel);
  for (uint8_t index = 0; index < kPartCount; ++index) {
    printPartSelection(state, index);
  }
}

void renderLocateSession(const AppState& state) {
  const InventoryPart& part = selectedPart(state);
  Serial.print(F("Part: "));
  Serial.println(part.detailLabel);
  Serial.print(F("Locate state: "));
  Serial.println(locateStateLabel(state));
  Serial.print(F("Attempts: "));
  Serial.println(state.locateAttemptCount);
  if (state.locateState == LocateSessionState::NeedsRadioCheck) {
    printItem(true, F("Check RF"));
  } else if ((state.locateState == LocateSessionState::NoTarget) ||
             (state.locateState == LocateSessionState::NodeOffline)) {
    printItem(true, F("Back"));
  } else if (state.locateSessionActive) {
    printItem(true, F("Stop"));
  } else {
    printItem(true, F("Start Locate"));
  }
}

void renderInventoryList(const AppState& state) {
  const InventoryPart& part = selectedPart(state);
  Serial.print(F("Selected: "));
  Serial.print(part.detailLabel);
  Serial.print(F("  Need "));
  Serial.println(part.neededQuantity);
  for (uint8_t index = 0; index < kPartCount; ++index) {
    printPartSelection(state, index);
  }
}

void renderInventoryAdjust(const AppState& state) {
  const InventoryPart& part = selectedPart(state);
  Serial.print(F("Part: "));
  Serial.println(part.detailLabel);
  Serial.print(F("Base qty: "));
  Serial.println(part.quantity);
  Serial.print(F("Pending delta: "));
  Serial.println(state.pendingInventoryDelta);
  Serial.print(F("Final qty: "));
  Serial.println(effectiveSelectedPartQuantity(state));
  Serial.println(F("UP/DN = Change Part"));
  Serial.println(F("LEFT/RIGHT = -/+"));
  Serial.println(F("PRESS = Save"));
}

void renderNodesList(const AppState& state) {
  const NodeRecord& node = selectedNode(state);
  Serial.print(F("Node detail: "));
  Serial.print(node.idLabel);
  Serial.print(' ');
  Serial.println(node.zoneLabel);
  for (uint8_t index = 0; index < kNodeCount; ++index) {
    printNodeSelection(state, index);
  }
}

void renderNodeDetail(const AppState& state) {
  const NodeRecord& node = selectedNode(state);
  Serial.print(F("Node: "));
  Serial.println(node.idLabel);
  Serial.print(F("Zone: "));
  Serial.println(node.zoneLabel);
  Serial.print(F("Status: "));
  Serial.println(node.online ? F("ONLINE") : F("OFFLINE"));
  Serial.print(F("Outputs: "));
  Serial.println(node.outputs);
  printItem(state.selectionIndex == 0, F("Open Radio Check"));
  printItem(state.selectionIndex == 1, F("Back"));
}

void renderSetup(const AppState& state) {
  Serial.print(F("Phone link: "));
  Serial.println(state.phoneLinked ? F("ON") : F("OFF"));
  Serial.print(F("Local cache: "));
  Serial.println(state.cacheFresh ? F("READY") : F("STALE"));
  printItem(state.selectionIndex == 0, F("Radio Check"));
  printItem(state.selectionIndex == 1, F("Refresh Cache"));
  printItem(state.selectionIndex == 2, state.phoneLinked ? F("Phone Link Off") : F("Phone Link On"));
  printItem(state.selectionIndex == 3, F("Back Home"));
}

void renderPhoneSync(const AppState& state) {
  Serial.print(F("Phone link: "));
  Serial.println(state.phoneLinked ? F("ON") : F("OFF"));
  Serial.print(F("Local cache: "));
  Serial.println(state.cacheFresh ? F("READY") : F("STALE"));
  printItem(state.selectionIndex == 0, state.phoneLinked ? F("Disconnect Phone") : F("Connect Phone"));
  printItem(state.selectionIndex == 1, F("Sync Cache"));
  printItem(state.selectionIndex == 2, F("Back Home"));
}

void renderRadio(const AppState& state) {
  const RadioSelfTestState& radioTest = state.radioTest;
  Serial.print(F("Overall: "));
  Serial.println(radioOverallLabel(radioTest));
  Serial.print(F("Runs: "));
  Serial.println(radioTest.runCount);
  if (radioTest.hasRun) {
    Serial.print(F("SPI: "));
    Serial.println(radioTest.spiLooksAlive ? F("PASS") : F("FAIL"));
    Serial.print(F("REG: "));
    Serial.println(radioTest.writeReadbackPass ? F("PASS") : F("FAIL"));
    Serial.print(F("CE: "));
    Serial.println(radioTest.ceTriggerPass ? F("PASS") : F("FAIL"));
  }
  printItem(state.selectionIndex == 0, F("Run Self Test"));
  printItem(state.selectionIndex == 1, F("Back"));
}

void printControls() {
  Serial.println();
  Serial.println(F("Joystick: UP/DN move  LEFT back  RIGHT or PRESS select  HOLD PRESS home"));
  Serial.println(F("Inventory Edit: UP/DN part  LEFT/RIGHT qty  PRESS save"));
}

}  // namespace

void renderScreen(const AppState& state) {
  Serial.println();
  Serial.println(F("========================================"));
  Serial.print(F("AURA Host :: "));
  Serial.println(screenLabel(state.screen));
  Serial.println(F("========================================"));

  switch (state.screen) {
    case HostScreen::Home:
      renderHome(state);
      break;
    case HostScreen::LocateList:
      renderLocateList(state);
      break;
    case HostScreen::LocateSession:
      renderLocateSession(state);
      break;
    case HostScreen::InventoryList:
      renderInventoryList(state);
      break;
    case HostScreen::InventoryAdjust:
      renderInventoryAdjust(state);
      break;
    case HostScreen::NodesList:
      renderNodesList(state);
      break;
    case HostScreen::NodeDetail:
      renderNodeDetail(state);
      break;
    case HostScreen::PhoneSync:
      renderPhoneSync(state);
      break;
    case HostScreen::Setup:
      renderSetup(state);
      break;
    case HostScreen::Radio:
      renderRadio(state);
      break;
  }

  printControls();
}
