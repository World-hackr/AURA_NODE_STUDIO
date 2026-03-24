#pragma once

#include <Arduino.h>

namespace aura_host {
namespace display_config {

constexpr int8_t kPinTftCs = 5;
constexpr int8_t kPinTftDc = 27;
constexpr int8_t kPinTftRst = 26;
constexpr int8_t kPinTftBacklight = 21;
constexpr bool kBacklightActiveLow = true;

constexpr int8_t kSpiSck = 18;
constexpr int8_t kSpiMiso = 19;
constexpr int8_t kSpiMosi = 23;

constexpr uint16_t kPanelWidth = 128;
constexpr uint16_t kPanelHeight = 160;

constexpr uint8_t kRotation = 1;
constexpr uint8_t kColumnOffset = 0;
constexpr uint8_t kRowOffset = 0;

constexpr bool kUseBgrColorOrder = true;
constexpr bool kInvertColors = false;

}  // namespace display_config
}  // namespace aura_host
