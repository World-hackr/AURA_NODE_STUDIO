#pragma once

#include <Arduino.h>

namespace aura_host {
namespace remote_config {

// Shared SPI bus used by both the TFT and the nRF24L01 radio.
constexpr int8_t kSpiSck = 18;
constexpr int8_t kSpiMiso = 19;
constexpr int8_t kSpiMosi = 23;

// nRF24L01 control pins.
constexpr int8_t kPinRadioCe = 4;
constexpr int8_t kPinRadioCsn = 16;
constexpr int8_t kPinRadioIrq = -1;

// 2-axis joystick plus center push switch.
constexpr int8_t kPinJoystickX = 33;
constexpr int8_t kPinJoystickY = 32;
constexpr int8_t kPinJoystickSwitch = 25;
constexpr bool kJoystickSwitchActiveLow = true;
constexpr bool kJoystickUpIsLow = true;
constexpr bool kJoystickLeftIsLow = true;
constexpr int16_t kJoystickLowThreshold = 1400;
constexpr int16_t kJoystickHighThreshold = 2700;
constexpr uint16_t kJoystickInitialRepeatMs = 240;
constexpr uint16_t kJoystickRepeatMs = 140;
constexpr uint16_t kJoystickLongPressMs = 700;
constexpr uint16_t kJoystickDebounceMs = 30;

}  // namespace remote_config
}  // namespace aura_host
