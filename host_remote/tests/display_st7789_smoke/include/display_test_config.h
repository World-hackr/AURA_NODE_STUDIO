#pragma once

#include <Arduino.h>

namespace display_test {

constexpr int8_t kPinTftCs = 5;
constexpr int8_t kPinTftDc = 27;
constexpr int8_t kPinTftRst = 26;
constexpr int8_t kPinTftBacklight = -1;

constexpr int8_t kSpiSck = 18;
constexpr int8_t kSpiMiso = -1;
constexpr int8_t kSpiMosi = 23;

constexpr uint16_t kPanelWidth = 240;
constexpr uint16_t kPanelHeight = 320;

constexpr uint8_t kRotation = 1;
constexpr uint16_t kColumnOffset = 0;
constexpr uint16_t kRowOffset = 0;

constexpr bool kUseBgrColorOrder = true;
constexpr bool kInvertColors = false;

}  // namespace display_test
