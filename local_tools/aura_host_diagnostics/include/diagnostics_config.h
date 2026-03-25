#pragma once

#include <Arduino.h>

namespace aura_diag {
namespace config {

constexpr int8_t kPinTftCs = 5;
constexpr int8_t kPinTftDc = 27;
constexpr int8_t kPinTftRst = 26;
constexpr int8_t kPinTftBacklight = 21;
constexpr bool kBacklightActiveLow = true;

constexpr int8_t kSpiSck = 18;
constexpr int8_t kSpiMiso = 19;
constexpr int8_t kSpiMosi = 23;

constexpr int8_t kPinRadioCe = 4;
constexpr int8_t kPinRadioCsn = 16;
constexpr int8_t kPinTouchCs = 22;
constexpr int8_t kPinTouchIrq = 17;

constexpr int8_t kPinJoystickX = 33;
constexpr int8_t kPinJoystickY = 32;
constexpr int8_t kPinJoystickSwitch = 25;
constexpr bool kJoystickSwitchActiveLow = true;
constexpr bool kJoystickUpIsLow = true;
constexpr bool kJoystickLeftIsLow = false;
constexpr int16_t kJoystickCenter = 2048;
constexpr int16_t kJoystickSpan = 1100;
constexpr int16_t kJoystickDirectionThreshold = 280;
constexpr int8_t kJoystickDisplayDeadband = 4;
constexpr int8_t kJoystickDisplayStep = 2;
constexpr uint32_t kJoystickCenterHoldMs = 800;

constexpr uint16_t kPanelWidth = 240;
constexpr uint16_t kPanelHeight = 320;
constexpr uint8_t kRotation = 3;
constexpr uint16_t kColumnOffset = 0;
constexpr uint16_t kRowOffset = 0;
constexpr bool kUseBgrColorOrder = true;
constexpr bool kInvertColors = false;
constexpr uint32_t kTftSpiHz = 20000000;

constexpr uint32_t kRenderIntervalMs = 12;
constexpr uint32_t kRadioRetestMs = 500;

}  // namespace config
}  // namespace aura_diag
