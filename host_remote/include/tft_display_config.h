#pragma once

#include <Arduino.h>

namespace aura_host {
namespace display_config {

enum class PanelController : uint8_t {
  St7735 = 0,
  Ili9341 = 1,
};

constexpr int8_t kPinTftCs = 5;
constexpr int8_t kPinTftDc = 27;
constexpr int8_t kPinTftRst = 26;
constexpr int8_t kPinTftBacklight = 21;
constexpr bool kBacklightActiveLow = true;

constexpr int8_t kSpiSck = 18;
constexpr int8_t kSpiMiso = 19;
constexpr int8_t kSpiMosi = 23;

constexpr PanelController kPanelController = PanelController::Ili9341;

// Physical panel resolution before rotation is applied.
constexpr uint16_t kPanelWidth = 240;
constexpr uint16_t kPanelHeight = 320;

// Keep the current host UI at the proven 160x128 logical canvas for now.
// The firmware currently anchors this canvas at the top-left while the
// new panel bring-up is stabilized on real hardware.
constexpr uint16_t kUiWidth = 160;
constexpr uint16_t kUiHeight = 128;
constexpr uint16_t kUiOriginX = 0;
constexpr uint16_t kUiOriginY = 0;

constexpr uint8_t kRotation = 1;
constexpr uint8_t kColumnOffset = 0;
constexpr uint8_t kRowOffset = 0;

constexpr bool kUseBgrColorOrder = true;
constexpr bool kInvertColors = false;

}  // namespace display_config
}  // namespace aura_host
