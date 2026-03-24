#include "input_actions.h"

#include <algorithm>

#include "joystick_input.h"
#include "radio_self_test.h"

namespace {

void storeRadioTestResult(AppState& state, RadioSelfTestState result) {
  result.runCount = static_cast<uint16_t>(state.radioTest.runCount + 1);
  state.radioTest = result;
  state.needsRender = true;
}

void openRadioScreen(AppState& state) {
  state.radioReturnScreen = state.screen;
  setScreen(state, HostScreen::Radio);
  if (!state.radioTest.hasRun) {
    storeRadioTestResult(state, runRadioSelfTest());
  }
}

void updateLocateStateFromCurrentPart(AppState& state, bool sendingRequested) {
  const InventoryPart& part = selectedPart(state);

  if (part.nodeIndex < 0) {
    state.locateState = LocateSessionState::NoTarget;
    state.locateSessionActive = false;
    state.needsRender = true;
    return;
  }

  const NodeRecord& node = state.nodes[part.nodeIndex];
  if (!node.online) {
    state.locateState = LocateSessionState::NodeOffline;
    state.locateSessionActive = false;
    state.needsRender = true;
    return;
  }

  if (!radioLooksHealthy(state)) {
    state.locateState = LocateSessionState::NeedsRadioCheck;
    state.locateSessionActive = false;
    state.needsRender = true;
    return;
  }

  state.locateState = sendingRequested ? LocateSessionState::AwaitingRemote : LocateSessionState::Idle;
  state.locateSessionActive = sendingRequested;
  state.needsRender = true;
}

void openLocateSession(AppState& state) {
  setScreen(state, HostScreen::LocateSession);
  updateLocateStateFromCurrentPart(state, false);
}

void openInventoryAdjust(AppState& state) {
  state.pendingInventoryDelta = 0;
  setScreen(state, HostScreen::InventoryAdjust);
}

void openPhoneSync(AppState& state) {
  setScreen(state, HostScreen::PhoneSync);
}

void openNodeDetail(AppState& state) {
  setScreen(state, HostScreen::NodeDetail);
}

void adjustInventoryDelta(AppState& state, int delta) {
  const int32_t currentQuantity = static_cast<int32_t>(selectedPart(state).quantity);
  const int32_t nextDelta = static_cast<int32_t>(state.pendingInventoryDelta) + static_cast<int32_t>(delta);
  const int32_t nextQuantity = currentQuantity + nextDelta;
  if (nextQuantity < 0) {
    state.pendingInventoryDelta = static_cast<int16_t>(-currentQuantity);
  } else {
    state.pendingInventoryDelta = static_cast<int16_t>(nextDelta);
  }
  state.needsRender = true;
}

void saveInventoryDelta(AppState& state) {
  InventoryPart& part = selectedPart(state);
  const int32_t savedQuantity =
      std::max<int32_t>(0, static_cast<int32_t>(part.quantity) + static_cast<int32_t>(state.pendingInventoryDelta));
  part.quantity = static_cast<uint16_t>(savedQuantity);
  state.pendingInventoryDelta = 0;
  setScreen(state, HostScreen::InventoryList);
}

void refreshPhoneCache(AppState& state) {
  state.phoneLinked = true;
  state.cacheFresh = true;
  state.needsRender = true;
}

void selectCurrentItem(AppState& state) {
  switch (state.screen) {
    case HostScreen::Home:
      if (state.selectionIndex == 0) {
        setScreen(state, HostScreen::LocateList);
      } else if (state.selectionIndex == 1) {
        setScreen(state, HostScreen::InventoryList);
      } else if (state.selectionIndex == 2) {
        openPhoneSync(state);
      } else {
        setScreen(state, HostScreen::Setup);
      }
      break;

    case HostScreen::LocateList:
      state.selectedPartIndex = state.selectionIndex;
      openLocateSession(state);
      break;

    case HostScreen::LocateSession:
      if (state.locateState == LocateSessionState::NeedsRadioCheck) {
        openRadioScreen(state);
      } else if ((state.locateState == LocateSessionState::NoTarget) ||
                 (state.locateState == LocateSessionState::NodeOffline)) {
        setScreen(state, HostScreen::LocateList);
      } else if (state.locateSessionActive) {
        state.locateSessionActive = false;
        state.locateState = LocateSessionState::Idle;
        state.needsRender = true;
      } else {
        state.locateAttemptCount = static_cast<uint16_t>(state.locateAttemptCount + 1);
        updateLocateStateFromCurrentPart(state, true);
      }
      break;

    case HostScreen::InventoryList:
      state.selectedPartIndex = state.selectionIndex;
      openInventoryAdjust(state);
      break;

    case HostScreen::InventoryAdjust:
      saveInventoryDelta(state);
      break;

    case HostScreen::NodesList:
      state.selectedNodeIndex = state.selectionIndex;
      openNodeDetail(state);
      break;

    case HostScreen::NodeDetail:
      if (state.selectionIndex == 0) {
        openRadioScreen(state);
      } else {
        setScreen(state, HostScreen::NodesList);
      }
      break;

    case HostScreen::PhoneSync:
      if (state.selectionIndex == 0) {
        state.phoneLinked = !state.phoneLinked;
        if (!state.phoneLinked) {
          state.cacheFresh = false;
        }
        state.needsRender = true;
      } else if (state.selectionIndex == 1) {
        refreshPhoneCache(state);
      } else {
        goHome(state);
      }
      break;

    case HostScreen::Setup:
      if (state.selectionIndex == 0) {
        openRadioScreen(state);
      } else if (state.selectionIndex == 1) {
        state.cacheFresh = true;
        state.needsRender = true;
      } else if (state.selectionIndex == 2) {
        state.phoneLinked = !state.phoneLinked;
        if (!state.phoneLinked) {
          state.cacheFresh = false;
        }
        state.needsRender = true;
      } else {
        goHome(state);
      }
      break;

    case HostScreen::Radio:
      if (state.selectionIndex == 0) {
        storeRadioTestResult(state, runRadioSelfTest());
      } else {
        setScreen(state, state.radioReturnScreen);
      }
      break;
  }
}

void goBack(AppState& state) {
  switch (state.screen) {
    case HostScreen::Home:
      break;
    case HostScreen::LocateList:
    case HostScreen::InventoryList:
    case HostScreen::PhoneSync:
    case HostScreen::NodesList:
    case HostScreen::Setup:
      goHome(state);
      break;
    case HostScreen::LocateSession:
      state.locateSessionActive = false;
      state.locateState = LocateSessionState::Idle;
      setScreen(state, HostScreen::LocateList);
      break;
    case HostScreen::InventoryAdjust:
      state.pendingInventoryDelta = 0;
      setScreen(state, HostScreen::InventoryList);
      break;
    case HostScreen::NodeDetail:
      setScreen(state, HostScreen::NodesList);
      break;
    case HostScreen::Radio:
      setScreen(state, state.radioReturnScreen);
      break;
  }
}

void handleAction(AppState& state, JoystickAction action) {
  if (state.screen == HostScreen::InventoryAdjust) {
    switch (action) {
      case JoystickAction::Up:
        state.selectedPartIndex = static_cast<uint8_t>((state.selectedPartIndex + kPartCount - 1) % kPartCount);
        state.pendingInventoryDelta = 0;
        state.needsRender = true;
        break;
      case JoystickAction::Down:
        state.selectedPartIndex = static_cast<uint8_t>((state.selectedPartIndex + 1) % kPartCount);
        state.pendingInventoryDelta = 0;
        state.needsRender = true;
        break;
      case JoystickAction::Left:
        adjustInventoryDelta(state, -1);
        break;
      case JoystickAction::Right:
        adjustInventoryDelta(state, 1);
        break;
      case JoystickAction::Select:
        saveInventoryDelta(state);
        break;
      case JoystickAction::Home:
        goHome(state);
        break;
      case JoystickAction::None:
        break;
    }
    return;
  }

  switch (action) {
    case JoystickAction::Up:
      moveSelection(state, -1);
      if (state.screen == HostScreen::LocateList || state.screen == HostScreen::InventoryList) {
        state.selectedPartIndex = state.selectionIndex;
      } else if (state.screen == HostScreen::NodesList) {
        state.selectedNodeIndex = state.selectionIndex;
      }
      break;
    case JoystickAction::Down:
      moveSelection(state, 1);
      if (state.screen == HostScreen::LocateList || state.screen == HostScreen::InventoryList) {
        state.selectedPartIndex = state.selectionIndex;
      } else if (state.screen == HostScreen::NodesList) {
        state.selectedNodeIndex = state.selectionIndex;
      }
      break;
    case JoystickAction::Left:
      goBack(state);
      break;
    case JoystickAction::Right:
    case JoystickAction::Select:
      selectCurrentItem(state);
      break;
    case JoystickAction::Home:
      goHome(state);
      break;
    case JoystickAction::None:
      break;
  }
}

}  // namespace

void initializeInputActions() {
  initializeJoystickInput();
}

void pollInputActions(AppState& state) {
  const JoystickAction action = pollJoystickAction();
  if (action != JoystickAction::None) {
    handleAction(state, action);
  }
}
