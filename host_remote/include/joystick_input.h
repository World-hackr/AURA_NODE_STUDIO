#pragma once

#include <Arduino.h>

enum class JoystickAction : uint8_t {
  None = 0,
  Up = 1,
  Down = 2,
  Left = 3,
  Right = 4,
  Select = 5,
  Home = 6,
};

void initializeJoystickInput();
JoystickAction pollJoystickAction();
