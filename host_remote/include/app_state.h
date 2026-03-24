#pragma once

#include <Arduino.h>

enum class HostScreen : uint8_t {
  Home = 0,
  LocateList = 1,
  LocateSession = 2,
  InventoryList = 3,
  InventoryAdjust = 4,
  NodesList = 5,
  NodeDetail = 6,
  PhoneSync = 7,
  Setup = 8,
  Radio = 9,
};

enum class LocateSessionState : uint8_t {
  Idle = 0,
  AwaitingRemote = 1,
  NeedsRadioCheck = 2,
  NodeOffline = 3,
  NoTarget = 4,
};

struct RadioSelfTestState {
  bool hasRun;
  bool spiLooksAlive;
  bool writeReadbackPass;
  bool ceTriggerPass;
  bool txDone;
  bool maxRetry;
  bool timeout;
  uint8_t status;
  uint8_t config;
  uint8_t setupAw;
  uint8_t rfCh;
  uint8_t rfSetup;
  uint8_t observeTx;
  uint16_t runCount;
};

struct InventoryPart {
  const char* shortLabel;
  const char* detailLabel;
  const char* familyLabel;
  const char* locationLabel;
  uint16_t quantity;
  uint8_t neededQuantity;
  int8_t nodeIndex;
};

struct NodeRecord {
  const char* idLabel;
  const char* zoneLabel;
  const char* lastSeenLabel;
  uint8_t outputs;
  bool online;
};

struct AppState {
  HostScreen screen;
  HostScreen radioReturnScreen;
  uint8_t selectionIndex;
  uint8_t selectedPartIndex;
  uint8_t selectedNodeIndex;
  uint8_t batteryPercent;
  bool needsRender;
  bool phoneLinked;
  bool cacheFresh;
  bool locateSessionActive;
  int16_t pendingInventoryDelta;
  uint16_t locateAttemptCount;
  LocateSessionState locateState;
  InventoryPart parts[4];
  NodeRecord nodes[3];
  RadioSelfTestState radioTest;
};

constexpr uint8_t kPartCount = 4;
constexpr uint8_t kNodeCount = 3;

void initializeAppState(AppState& state);
void setScreen(AppState& state, HostScreen screen);
void moveSelection(AppState& state, int delta);
void goHome(AppState& state);

uint8_t menuItemCount(const AppState& state);
bool radioLooksHealthy(const AppState& state);
const InventoryPart& selectedPart(const AppState& state);
InventoryPart& selectedPart(AppState& state);
const NodeRecord& selectedNode(const AppState& state);
NodeRecord& selectedNode(AppState& state);
int16_t effectiveSelectedPartQuantity(const AppState& state);
const char* locateStateLabel(const AppState& state);
