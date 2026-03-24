#include "joystick_input.h"

#include "remote_peripheral_config.h"

namespace {

using namespace aura_host::remote_config;

enum class HeldDirection : uint8_t {
  None = 0,
  Up = 1,
  Down = 2,
  Left = 3,
  Right = 4,
};

HeldDirection heldDirection = HeldDirection::None;
unsigned long nextRepeatAt = 0;

bool switchPressed = false;
bool longPressFired = false;
unsigned long switchChangedAt = 0;
unsigned long switchPressedAt = 0;

int16_t readAxis(int8_t pin) {
  return static_cast<int16_t>(analogRead(pin));
}

HeldDirection readDirectionalHold() {
  const int16_t rawX = readAxis(kPinJoystickX);
  const int16_t rawY = readAxis(kPinJoystickY);

  const bool xLow = rawX < kJoystickLowThreshold;
  const bool xHigh = rawX > kJoystickHighThreshold;
  const bool yLow = rawY < kJoystickLowThreshold;
  const bool yHigh = rawY > kJoystickHighThreshold;

  if (kJoystickUpIsLow) {
    if (yLow) {
      return HeldDirection::Up;
    }
    if (yHigh) {
      return HeldDirection::Down;
    }
  } else {
    if (yHigh) {
      return HeldDirection::Up;
    }
    if (yLow) {
      return HeldDirection::Down;
    }
  }

  if (kJoystickLeftIsLow) {
    if (xLow) {
      return HeldDirection::Left;
    }
    if (xHigh) {
      return HeldDirection::Right;
    }
  } else {
    if (xHigh) {
      return HeldDirection::Left;
    }
    if (xLow) {
      return HeldDirection::Right;
    }
  }

  return HeldDirection::None;
}

JoystickAction actionFromHeldDirection(HeldDirection direction) {
  switch (direction) {
    case HeldDirection::Up:
      return JoystickAction::Up;
    case HeldDirection::Down:
      return JoystickAction::Down;
    case HeldDirection::Left:
      return JoystickAction::Left;
    case HeldDirection::Right:
      return JoystickAction::Right;
    case HeldDirection::None:
      return JoystickAction::None;
  }

  return JoystickAction::None;
}

JoystickAction pollDirectionalAction() {
  const unsigned long now = millis();
  const HeldDirection currentDirection = readDirectionalHold();

  if (currentDirection == HeldDirection::None) {
    heldDirection = HeldDirection::None;
    nextRepeatAt = 0;
    return JoystickAction::None;
  }

  if (currentDirection != heldDirection) {
    heldDirection = currentDirection;
    nextRepeatAt = now + kJoystickInitialRepeatMs;
    return actionFromHeldDirection(currentDirection);
  }

  if ((nextRepeatAt > 0) && (now >= nextRepeatAt)) {
    nextRepeatAt = now + kJoystickRepeatMs;
    return actionFromHeldDirection(currentDirection);
  }

  return JoystickAction::None;
}

bool rawSwitchPressed() {
  const int raw = digitalRead(kPinJoystickSwitch);
  return kJoystickSwitchActiveLow ? (raw == LOW) : (raw == HIGH);
}

JoystickAction pollSwitchAction() {
  const unsigned long now = millis();
  const bool currentPressed = rawSwitchPressed();

  if (currentPressed != switchPressed) {
    if ((now - switchChangedAt) < kJoystickDebounceMs) {
      return JoystickAction::None;
    }

    switchPressed = currentPressed;
    switchChangedAt = now;

    if (switchPressed) {
      switchPressedAt = now;
      longPressFired = false;
    } else {
      if (!longPressFired) {
        return JoystickAction::Select;
      }
    }
  }

  if (switchPressed && !longPressFired && ((now - switchPressedAt) >= kJoystickLongPressMs)) {
    longPressFired = true;
    return JoystickAction::Home;
  }

  return JoystickAction::None;
}

}  // namespace

void initializeJoystickInput() {
  pinMode(kPinJoystickSwitch, kJoystickSwitchActiveLow ? INPUT_PULLUP : INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(kPinJoystickX, ADC_11db);
  analogSetPinAttenuation(kPinJoystickY, ADC_11db);
  heldDirection = HeldDirection::None;
  nextRepeatAt = 0;
  switchPressed = rawSwitchPressed();
  longPressFired = false;
  switchChangedAt = millis();
  switchPressedAt = switchChangedAt;
}

JoystickAction pollJoystickAction() {
  JoystickAction switchAction = pollSwitchAction();
  if (switchAction != JoystickAction::None) {
    return switchAction;
  }

  return pollDirectionalAction();
}
