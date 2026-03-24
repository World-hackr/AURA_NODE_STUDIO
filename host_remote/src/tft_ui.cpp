#include "tft_ui.h"

#include <Arduino.h>
#include <SPI.h>
#include <ctype.h>
#include <cstring>
#include <stdio.h>

#include "tft_display_config.h"

namespace {

using namespace aura_host::display_config;

constexpr uint8_t kCmdSwReset = 0x01;
constexpr uint8_t kCmdSleepOut = 0x11;
constexpr uint8_t kCmdDisplayOn = 0x29;
constexpr uint8_t kCmdNormalDisplayOn = 0x13;
constexpr uint8_t kCmdInversionOff = 0x20;
constexpr uint8_t kCmdInversionOn = 0x21;
constexpr uint8_t kCmdColumnAddressSet = 0x2A;
constexpr uint8_t kCmdRowAddressSet = 0x2B;
constexpr uint8_t kCmdMemoryWrite = 0x2C;
constexpr uint8_t kCmdMadCtl = 0x36;
constexpr uint8_t kCmdColorMode = 0x3A;

constexpr uint8_t kMadCtlMy = 0x80;
constexpr uint8_t kMadCtlMx = 0x40;
constexpr uint8_t kMadCtlMv = 0x20;
constexpr uint8_t kMadCtlBgr = 0x08;

const SPISettings kSpiSettings(16000000, MSBFIRST, SPI_MODE0);

constexpr uint16_t color565(uint8_t red, uint8_t green, uint8_t blue) {
  return static_cast<uint16_t>(((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3));
}

constexpr uint16_t kColorBackground = color565(10, 13, 17);
constexpr uint16_t kColorSurface = color565(28, 34, 42);
constexpr uint16_t kColorSurfaceAlt = color565(39, 46, 58);
constexpr uint16_t kColorBorder = color565(72, 80, 92);
constexpr uint16_t kColorInk = color565(246, 248, 252);
constexpr uint16_t kColorMuted = color565(164, 174, 186);
constexpr uint16_t kColorAccent = color565(93, 214, 212);
constexpr uint16_t kColorGood = color565(108, 212, 131);
constexpr uint16_t kColorWarn = color565(242, 186, 92);
constexpr uint16_t kColorFail = color565(228, 92, 92);
constexpr uint16_t kColorLocate = color565(88, 170, 255);
constexpr uint16_t kColorInventory = color565(255, 180, 72);
constexpr uint16_t kColorSync = color565(86, 212, 143);
constexpr uint16_t kColorSettings = color565(180, 190, 205);
constexpr uint16_t kColorHighlightFill = color565(244, 247, 252);
constexpr uint16_t kColorHighlightText = color565(12, 14, 18);

constexpr int16_t kScreenWidth = 160;
constexpr int16_t kScreenHeight = 128;
constexpr int16_t kHeaderLineY = 18;
constexpr int16_t kBodyTopY = 19;
constexpr int16_t kBodyHeight = 97;
constexpr int16_t kFooterLineY = 116;
constexpr int16_t kFooterTopY = 117;
constexpr int16_t kFooterHeight = kScreenHeight - kFooterTopY;
constexpr int16_t kHomeCardY[] = {36, 56, 76, 96};
constexpr int16_t kActionRowY[] = {64, 81, 98};
constexpr int16_t kRadioActionRowY[] = {88, 97, 106};

enum class HomeIcon : uint8_t {
  Search,
  Inventory,
  Locate,
  Radio,
};

struct Glyph5x7 {
  char symbol;
  uint8_t rows[7];
};

constexpr Glyph5x7 kGlyphs[] = {
    {' ', {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}},
    {'-', {0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00}},
    {'_', {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F}},
    {':', {0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00}},
    {'.', {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00}},
    {'/', {0x01, 0x02, 0x04, 0x04, 0x08, 0x10, 0x00}},
    {'>', {0x10, 0x08, 0x04, 0x02, 0x04, 0x08, 0x10}},
    {'?', {0x0E, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04}},
    {'+', {0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00}},
    {'0', {0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E}},
    {'1', {0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E}},
    {'2', {0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F}},
    {'3', {0x1E, 0x01, 0x01, 0x0E, 0x01, 0x01, 0x1E}},
    {'4', {0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02}},
    {'5', {0x1F, 0x10, 0x10, 0x1E, 0x01, 0x01, 0x1E}},
    {'6', {0x0E, 0x10, 0x10, 0x1E, 0x11, 0x11, 0x0E}},
    {'7', {0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08}},
    {'8', {0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E}},
    {'9', {0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E}},
    {'A', {0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}},
    {'B', {0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E}},
    {'C', {0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E}},
    {'D', {0x1C, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1C}},
    {'E', {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F}},
    {'F', {0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10}},
    {'G', {0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0E}},
    {'H', {0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11}},
    {'I', {0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x1F}},
    {'J', {0x01, 0x01, 0x01, 0x01, 0x11, 0x11, 0x0E}},
    {'K', {0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11}},
    {'L', {0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F}},
    {'M', {0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11}},
    {'N', {0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11}},
    {'O', {0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}},
    {'P', {0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10}},
    {'Q', {0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D}},
    {'R', {0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11}},
    {'S', {0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E}},
    {'T', {0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04}},
    {'U', {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}},
    {'V', {0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04}},
    {'W', {0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A}},
    {'X', {0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11}},
    {'Y', {0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04}},
    {'Z', {0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F}},
};

const Glyph5x7* findGlyph(char value) {
  const char upper = static_cast<char>(toupper(static_cast<unsigned char>(value)));
  for (const auto& glyph : kGlyphs) {
    if (glyph.symbol == upper) {
      return &glyph;
    }
  }

  for (const auto& glyph : kGlyphs) {
    if (glyph.symbol == '?') {
      return &glyph;
    }
  }

  return nullptr;
}

class St7735Panel {
 public:
  void begin() {
    pinMode(kPinTftCs, OUTPUT);
    pinMode(kPinTftDc, OUTPUT);
    if (kPinTftRst >= 0) {
      pinMode(kPinTftRst, OUTPUT);
      digitalWrite(kPinTftRst, HIGH);
    }

    digitalWrite(kPinTftCs, HIGH);
    digitalWrite(kPinTftDc, HIGH);

    if (kPinTftBacklight >= 0) {
      pinMode(kPinTftBacklight, OUTPUT);
      setBacklightEnabled(false);
    }

    SPI.begin(kSpiSck, kSpiMiso, kSpiMosi, kPinTftCs);

    hardReset();
    initializeRegisters();
    setRotation(kRotation);
    clearBuffer(kColorBackground);
    present();

    if (kPinTftBacklight >= 0) {
      setBacklightEnabled(true);
    }
  }

  uint16_t width() const {
    return width_;
  }

  uint16_t height() const {
    return height_;
  }

  void fillScreen(uint16_t color) {
    fillRect(0, 0, width_, height_, color);
  }

  void drawPixel(int16_t x, int16_t y, uint16_t color) {
    if ((x < 0) || (y < 0) || (x >= static_cast<int16_t>(width_)) || (y >= static_cast<int16_t>(height_))) {
      return;
    }

    frameBuffer_[bufferIndex(x, y)] = color;
    markDirty(x, y, 1, 1);
  }

  void fillRect(int16_t x, int16_t y, int16_t width, int16_t height, uint16_t color) {
    if ((width <= 0) || (height <= 0) || (x >= static_cast<int16_t>(width_)) ||
        (y >= static_cast<int16_t>(height_))) {
      return;
    }

    if (x < 0) {
      width += x;
      x = 0;
    }

    if (y < 0) {
      height += y;
      y = 0;
    }

    if ((x + width) > static_cast<int16_t>(width_)) {
      width = static_cast<int16_t>(width_) - x;
    }

    if ((y + height) > static_cast<int16_t>(height_)) {
      height = static_cast<int16_t>(height_) - y;
    }

    if ((width <= 0) || (height <= 0)) {
      return;
    }

    for (int16_t row = 0; row < height; ++row) {
      uint16_t* destination = &frameBuffer_[bufferIndex(x, static_cast<int16_t>(y + row))];
      for (int16_t col = 0; col < width; ++col) {
        destination[col] = color;
      }
    }

    markDirty(x, y, width, height);
  }

  void drawRect(int16_t x, int16_t y, int16_t width, int16_t height, uint16_t color) {
    drawHorizontalLine(x, y, width, color);
    drawHorizontalLine(x, y + height - 1, width, color);
    drawVerticalLine(x, y, height, color);
    drawVerticalLine(x + width - 1, y, height, color);
  }

  void drawHorizontalLine(int16_t x, int16_t y, int16_t width, uint16_t color) {
    fillRect(x, y, width, 1, color);
  }

  void drawVerticalLine(int16_t x, int16_t y, int16_t height, uint16_t color) {
    fillRect(x, y, 1, height, color);
  }

  void drawLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint16_t color) {
    int16_t dx = abs(x1 - x0);
    int16_t sx = x0 < x1 ? 1 : -1;
    int16_t dy = -abs(y1 - y0);
    int16_t sy = y0 < y1 ? 1 : -1;
    int16_t err = dx + dy;

    while (true) {
      drawPixel(x0, y0, color);
      if ((x0 == x1) && (y0 == y1)) {
        break;
      }

      const int16_t twiceErr = static_cast<int16_t>(2 * err);
      if (twiceErr >= dy) {
        err = static_cast<int16_t>(err + dy);
        x0 = static_cast<int16_t>(x0 + sx);
      }
      if (twiceErr <= dx) {
        err = static_cast<int16_t>(err + dx);
        y0 = static_cast<int16_t>(y0 + sy);
      }
    }
  }

  void setRotation(uint8_t rotation) {
    rotation_ = rotation & 0x03;

    uint8_t madctl = 0;
    switch (rotation_) {
      case 0:
        madctl = kMadCtlMx | kMadCtlMy;
        width_ = kPanelWidth;
        height_ = kPanelHeight;
        break;
      case 1:
        madctl = kMadCtlMy | kMadCtlMv;
        width_ = kPanelHeight;
        height_ = kPanelWidth;
        break;
      case 2:
        madctl = 0x00;
        width_ = kPanelWidth;
        height_ = kPanelHeight;
        break;
      default:
        madctl = kMadCtlMx | kMadCtlMv;
        width_ = kPanelHeight;
        height_ = kPanelWidth;
        break;
    }

    if (kUseBgrColorOrder) {
      madctl |= kMadCtlBgr;
    }

    beginWrite();
    writeCommandRaw(kCmdMadCtl);
    writeDataByteRaw(madctl);
    endWrite();
  }

  void present() {
    presentRect(0, 0, static_cast<int16_t>(width_), static_cast<int16_t>(height_));
  }

  void presentDirty() {
    if (!dirty_) {
      return;
    }

    presentRect(
        dirtyX0_,
        dirtyY0_,
        static_cast<int16_t>(dirtyX1_ - dirtyX0_ + 1),
        static_cast<int16_t>(dirtyY1_ - dirtyY0_ + 1));
  }

 private:
  void setBacklightEnabled(bool enabled) {
    const bool driveHigh = kBacklightActiveLow ? !enabled : enabled;
    digitalWrite(kPinTftBacklight, driveHigh ? HIGH : LOW);
  }

  size_t bufferIndex(int16_t x, int16_t y) const {
    return static_cast<size_t>(y) * static_cast<size_t>(width_) + static_cast<size_t>(x);
  }

  void clearBuffer(uint16_t color) {
    for (uint16_t y = 0; y < height_; ++y) {
      uint16_t* row = &frameBuffer_[static_cast<size_t>(y) * static_cast<size_t>(width_)];
      for (uint16_t x = 0; x < width_; ++x) {
        row[x] = color;
      }
    }

    dirty_ = true;
    dirtyX0_ = 0;
    dirtyY0_ = 0;
    dirtyX1_ = static_cast<int16_t>(width_ - 1);
    dirtyY1_ = static_cast<int16_t>(height_ - 1);
  }

  void markDirty(int16_t x, int16_t y, int16_t width, int16_t height) {
    if ((width <= 0) || (height <= 0)) {
      return;
    }

    const int16_t x0 = x;
    const int16_t y0 = y;
    const int16_t x1 = static_cast<int16_t>(x + width - 1);
    const int16_t y1 = static_cast<int16_t>(y + height - 1);

    if (!dirty_) {
      dirty_ = true;
      dirtyX0_ = x0;
      dirtyY0_ = y0;
      dirtyX1_ = x1;
      dirtyY1_ = y1;
      return;
    }

    if (x0 < dirtyX0_) {
      dirtyX0_ = x0;
    }
    if (y0 < dirtyY0_) {
      dirtyY0_ = y0;
    }
    if (x1 > dirtyX1_) {
      dirtyX1_ = x1;
    }
    if (y1 > dirtyY1_) {
      dirtyY1_ = y1;
    }
  }

  void clearDirty() {
    dirty_ = false;
    dirtyX0_ = 0;
    dirtyY0_ = 0;
    dirtyX1_ = 0;
    dirtyY1_ = 0;
  }

  void presentRect(int16_t x, int16_t y, int16_t width, int16_t height) {
    if ((width <= 0) || (height <= 0)) {
      clearDirty();
      return;
    }

    if (x < 0) {
      width += x;
      x = 0;
    }

    if (y < 0) {
      height += y;
      y = 0;
    }

    if ((x + width) > static_cast<int16_t>(width_)) {
      width = static_cast<int16_t>(width_) - x;
    }

    if ((y + height) > static_cast<int16_t>(height_)) {
      height = static_cast<int16_t>(height_) - y;
    }

    if ((width <= 0) || (height <= 0)) {
      clearDirty();
      return;
    }

    beginWrite();
    setAddressWindowRaw(
        static_cast<uint16_t>(x),
        static_cast<uint16_t>(y),
        static_cast<uint16_t>(x + width - 1),
        static_cast<uint16_t>(y + height - 1));

    for (int16_t row = 0; row < height; ++row) {
      const uint16_t* source = &frameBuffer_[bufferIndex(x, static_cast<int16_t>(y + row))];
      for (int16_t col = 0; col < width; ++col) {
        writeDataWordRaw(source[col]);
      }
    }

    endWrite();
    clearDirty();
  }

  void hardReset() {
    if (kPinTftRst < 0) {
      delay(150);
      return;
    }

    digitalWrite(kPinTftRst, HIGH);
    delay(20);
    digitalWrite(kPinTftRst, LOW);
    delay(20);
    digitalWrite(kPinTftRst, HIGH);
    delay(150);
  }

  void initializeRegisters() {
    static const uint8_t kFrameRateNormal[] = {0x01, 0x2C, 0x2D};
    static const uint8_t kFrameRateIdle[] = {0x01, 0x2C, 0x2D};
    static const uint8_t kFrameRatePartial[] = {0x01, 0x2C, 0x2D, 0x01, 0x2C, 0x2D};
    static const uint8_t kDisplayInversionControl[] = {0x07};
    static const uint8_t kPowerControl1[] = {0xA2, 0x02, 0x84};
    static const uint8_t kPowerControl2[] = {0xC5};
    static const uint8_t kPowerControl3[] = {0x0A, 0x00};
    static const uint8_t kPowerControl4[] = {0x8A, 0x2A};
    static const uint8_t kPowerControl5[] = {0x8A, 0xEE};
    static const uint8_t kVcomControl[] = {0x0E};
    static const uint8_t kColorMode16Bit[] = {0x05};
    static const uint8_t kGammaPositive[] = {
        0x02, 0x1C, 0x07, 0x12, 0x37, 0x32, 0x29, 0x2D,
        0x29, 0x25, 0x2B, 0x39, 0x00, 0x01, 0x03, 0x10};
    static const uint8_t kGammaNegative[] = {
        0x03, 0x1D, 0x07, 0x06, 0x2E, 0x2C, 0x29, 0x2D,
        0x2E, 0x2E, 0x37, 0x3F, 0x00, 0x00, 0x02, 0x10};

    writeCommand(kCmdSwReset);
    delay(150);
    writeCommand(kCmdSleepOut);
    delay(150);

    writeCommandWithData(0xB1, kFrameRateNormal, sizeof(kFrameRateNormal));
    writeCommandWithData(0xB2, kFrameRateIdle, sizeof(kFrameRateIdle));
    writeCommandWithData(0xB3, kFrameRatePartial, sizeof(kFrameRatePartial));
    writeCommandWithData(0xB4, kDisplayInversionControl, sizeof(kDisplayInversionControl));
    writeCommandWithData(0xC0, kPowerControl1, sizeof(kPowerControl1));
    writeCommandWithData(0xC1, kPowerControl2, sizeof(kPowerControl2));
    writeCommandWithData(0xC2, kPowerControl3, sizeof(kPowerControl3));
    writeCommandWithData(0xC3, kPowerControl4, sizeof(kPowerControl4));
    writeCommandWithData(0xC4, kPowerControl5, sizeof(kPowerControl5));
    writeCommandWithData(0xC5, kVcomControl, sizeof(kVcomControl));
    writeCommandWithData(kCmdColorMode, kColorMode16Bit, sizeof(kColorMode16Bit));
    writeCommandWithData(0xE0, kGammaPositive, sizeof(kGammaPositive));
    writeCommandWithData(0xE1, kGammaNegative, sizeof(kGammaNegative));

    writeCommand(kInvertColors ? kCmdInversionOn : kCmdInversionOff);
    writeCommand(kCmdNormalDisplayOn);
    delay(10);
    writeCommand(kCmdDisplayOn);
    delay(100);
  }

  void writeCommand(uint8_t command) {
    beginWrite();
    writeCommandRaw(command);
    endWrite();
  }

  void writeCommandWithData(uint8_t command, const uint8_t* data, size_t length) {
    beginWrite();
    writeCommandRaw(command);
    for (size_t index = 0; index < length; ++index) {
      writeDataByteRaw(data[index]);
    }
    endWrite();
  }

  void beginWrite() {
    SPI.beginTransaction(kSpiSettings);
    digitalWrite(kPinTftCs, LOW);
  }

  void endWrite() {
    digitalWrite(kPinTftCs, HIGH);
    SPI.endTransaction();
  }

  void writeCommandRaw(uint8_t command) {
    digitalWrite(kPinTftDc, LOW);
    SPI.transfer(command);
    digitalWrite(kPinTftDc, HIGH);
  }

  void writeDataByteRaw(uint8_t value) {
    SPI.transfer(value);
  }

  void writeDataWordRaw(uint16_t value) {
    SPI.transfer(static_cast<uint8_t>(value >> 8));
    SPI.transfer(static_cast<uint8_t>(value & 0xFF));
  }

  void setAddressWindowRaw(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1) {
    x0 = static_cast<uint16_t>(x0 + kColumnOffset);
    x1 = static_cast<uint16_t>(x1 + kColumnOffset);
    y0 = static_cast<uint16_t>(y0 + kRowOffset);
    y1 = static_cast<uint16_t>(y1 + kRowOffset);

    writeCommandRaw(kCmdColumnAddressSet);
    writeDataWordRaw(x0);
    writeDataWordRaw(x1);

    writeCommandRaw(kCmdRowAddressSet);
    writeDataWordRaw(y0);
    writeDataWordRaw(y1);

    writeCommandRaw(kCmdMemoryWrite);
  }

  uint16_t width_ = kPanelWidth;
  uint16_t height_ = kPanelHeight;
  uint8_t rotation_ = 0;
  bool dirty_ = false;
  int16_t dirtyX0_ = 0;
  int16_t dirtyY0_ = 0;
  int16_t dirtyX1_ = 0;
  int16_t dirtyY1_ = 0;
  uint16_t frameBuffer_[static_cast<size_t>(kPanelWidth) * static_cast<size_t>(kPanelHeight)] = {};
};

St7735Panel panel;
bool displayReady = false;
AppState lastRenderedState{};
bool hasLastRenderedState = false;

int16_t textWidth(const char* text, uint8_t scale) {
  if (text == nullptr) {
    return 0;
  }

  int16_t width = 0;
  for (size_t index = 0; text[index] != '\0'; ++index) {
    width = static_cast<int16_t>(width + (6 * scale));
  }

  return width > 0 ? static_cast<int16_t>(width - scale) : 0;
}

void drawChar(int16_t x, int16_t y, char value, uint16_t color, uint8_t scale) {
  const Glyph5x7* glyph = findGlyph(value);
  if (glyph == nullptr) {
    return;
  }

  for (uint8_t row = 0; row < 7; ++row) {
    const uint8_t rowBits = glyph->rows[row];
    for (uint8_t col = 0; col < 5; ++col) {
      if ((rowBits & (1 << (4 - col))) == 0) {
        continue;
      }

      panel.fillRect(
          static_cast<int16_t>(x + (col * scale)),
          static_cast<int16_t>(y + (row * scale)),
          scale,
          scale,
          color);
    }
  }
}

void drawText(int16_t x, int16_t y, const char* text, uint16_t color, uint8_t scale, int16_t maxWidth = -1) {
  if (text == nullptr) {
    return;
  }

  int16_t cursorX = x;
  for (size_t index = 0; text[index] != '\0'; ++index) {
    const int16_t nextWidth = static_cast<int16_t>(cursorX - x + (5 * scale));
    if ((maxWidth > 0) && (nextWidth > maxWidth)) {
      break;
    }

    drawChar(cursorX, y, text[index], color, scale);
    cursorX = static_cast<int16_t>(cursorX + (6 * scale));
  }
}

constexpr int16_t kStatusBottomY = 14;
constexpr int16_t kTitleTopY = 17;
constexpr int16_t kDetailTopY = 36;
constexpr int16_t kDetailHeight = 22;
constexpr int16_t kListRowY[] = {64, 75, 86, 97, 108};

const char* radioOverallLabel(const RadioSelfTestState& radioTest) {
  if (!radioTest.hasRun) {
    return "CHECK";
  }

  if (radioTest.spiLooksAlive && radioTest.writeReadbackPass && radioTest.ceTriggerPass) {
    return "PASS";
  }

  if (!radioTest.spiLooksAlive || !radioTest.writeReadbackPass) {
    return "FAIL";
  }

  return "WARN";
}

uint16_t radioOverallColor(const RadioSelfTestState& radioTest) {
  if (!radioTest.hasRun) {
    return kColorWarn;
  }

  if (radioTest.spiLooksAlive && radioTest.writeReadbackPass && radioTest.ceTriggerPass) {
    return kColorGood;
  }

  if (!radioTest.spiLooksAlive || !radioTest.writeReadbackPass) {
    return kColorFail;
  }

  return kColorWarn;
}

const char* screenTitle(HostScreen screen) {
  switch (screen) {
    case HostScreen::Home:
      return "AURA";
    case HostScreen::LocateList:
      return "LOCATE";
    case HostScreen::LocateSession:
      return "LOCATING";
    case HostScreen::InventoryList:
      return "INVENTORY";
    case HostScreen::InventoryAdjust:
      return "EDIT STOCK";
    case HostScreen::NodesList:
      return "NODES";
    case HostScreen::NodeDetail:
      return "NODE DETAIL";
    case HostScreen::PhoneSync:
      return "PHONE SYNC";
    case HostScreen::Setup:
      return "SETTINGS";
    case HostScreen::Radio:
      return "RADIO";
  }

  return "AURA";
}

const char* locateActionLabel(const AppState& state) {
  if (state.locateState == LocateSessionState::NeedsRadioCheck) {
    return "CHECK RF";
  }

  if ((state.locateState == LocateSessionState::NoTarget) || (state.locateState == LocateSessionState::NodeOffline)) {
    return "BACK";
  }

  return state.locateSessionActive ? "STOP" : "START";
}

void clearBody() {
  panel.fillRect(0, kBodyTopY, kScreenWidth, kBodyHeight, kColorBackground);
}

void drawStatusBar(const AppState& state) {
  char batteryLabel[12];
  snprintf(batteryLabel, sizeof(batteryLabel), "BAT %u", static_cast<unsigned>(state.batteryPercent));

  panel.fillRect(0, 0, kScreenWidth, 14, kColorSurface);
  panel.drawHorizontalLine(0, kStatusBottomY, kScreenWidth, kColorBorder);
  drawText(4, 4, radioLooksHealthy(state) ? "RF OK" : "RF CK", radioLooksHealthy(state) ? kColorGood : kColorWarn, 1,
           34);
  drawText(44, 4, state.phoneLinked ? "BLE ON" : "LOCAL", state.phoneLinked ? kColorAccent : kColorMuted, 1, 38);
  drawText(kScreenWidth - textWidth(batteryLabel, 1) - 4, 4, batteryLabel, kColorInk, 1);
}

void drawHeader(const char* title) {
  panel.fillRect(0, 15, kScreenWidth, 16, kColorBackground);
  drawText((kScreenWidth - textWidth(title, 2)) / 2, kTitleTopY, title, kColorAccent, 2);
}

void drawFooter(const AppState& state) {
  const char* footerText = "^V MOVE < BACK > OK";
  switch (state.screen) {
    case HostScreen::LocateList:
      footerText = "^V LIST < HOME > OPEN";
      break;
    case HostScreen::LocateSession:
      footerText = "< BACK > ACTION";
      break;
    case HostScreen::InventoryList:
      footerText = "^V PART < HOME > EDIT";
      break;
    case HostScreen::InventoryAdjust:
      footerText = "^V PART < - > + SW SAVE";
      break;
    case HostScreen::PhoneSync:
      footerText = "^V MOVE < HOME > OK";
      break;
    case HostScreen::Setup:
      footerText = "^V MOVE < HOME > OPEN";
      break;
    case HostScreen::Radio:
      footerText = "^V MOVE < BACK > OK";
      break;
    default:
      break;
  }

  panel.fillRect(0, kFooterTopY, kScreenWidth, kFooterHeight, kColorBackground);
  panel.drawHorizontalLine(0, kFooterLineY, kScreenWidth, kColorBorder);
  drawText(6, 119, footerText, kColorMuted, 1, kScreenWidth - 12);
}

void drawDetailCard(const char* /*tag*/, const char* line1, const char* line2, uint16_t accentColor) {
  panel.fillRect(6, kDetailTopY, kScreenWidth - 12, kDetailHeight, kColorSurface);
  panel.drawRect(6, kDetailTopY, kScreenWidth - 12, kDetailHeight, kColorBorder);
  panel.fillRect(8, 38, 4, kDetailHeight - 4, accentColor);
  drawText(16, 41, line1, accentColor, 1, 134);
  drawText(16, 49, line2, kColorInk, 1, 134);
}

void drawMenuRow(int16_t y, const char* label, bool selected) {
  const int16_t x = 6;
  const int16_t width = kScreenWidth - 12;
  const int16_t height = 9;
  const uint16_t fillColor = selected ? kColorHighlightFill : kColorSurfaceAlt;
  const uint16_t borderColor = selected ? kColorHighlightFill : kColorBorder;
  const uint16_t textColor = selected ? kColorHighlightText : kColorInk;

  panel.fillRect(x, y, width, height, fillColor);
  panel.drawRect(x, y, width, height, borderColor);
  if (!selected) {
    panel.fillRect(x + 4, y + 2, 2, height - 4, kColorAccent);
  }
  drawText(x + 10, y + 1, label, textColor, 1, width - 16);
}

void drawTile(int16_t x, int16_t y, int16_t width, int16_t height, const char* label, uint16_t accentColor,
              bool selected) {
  const uint16_t fillColor = selected ? accentColor : kColorSurfaceAlt;
  const uint16_t borderColor = selected ? accentColor : kColorBorder;
  const uint16_t textColor = selected ? kColorHighlightText : kColorInk;

  panel.fillRect(x, y, width, height, fillColor);
  panel.drawRect(x, y, width, height, borderColor);
  if (!selected) {
    panel.fillRect(x + 3, y + 3, width - 6, 2, accentColor);
  }
  drawText(x + ((width - textWidth(label, 1)) / 2), y + height - 7, label, textColor, 1, width - 8);
}

void drawMagnifierIcon(int16_t x, int16_t y, uint16_t color) {
  panel.drawRect(x + 2, y + 1, 10, 10, color);
  panel.drawLine(x + 11, y + 10, x + 18, y + 17, color);
  panel.drawLine(x + 11, y + 12, x + 16, y + 17, color);
  panel.fillRect(x + 5, y + 4, 4, 4, color);
}

void drawBoxIcon(int16_t x, int16_t y, uint16_t color) {
  panel.drawRect(x + 2, y + 6, 16, 10, color);
  panel.drawHorizontalLine(x + 2, y + 10, 16, color);
  panel.drawVerticalLine(x + 10, y + 6, 2, color);
  panel.drawRect(x + 5, y + 2, 10, 4, color);
}

void drawPhoneIcon(int16_t x, int16_t y, uint16_t color) {
  panel.drawRect(x + 6, y, 10, 18, color);
  panel.fillRect(x + 8, y + 2, 6, 2, color);
  panel.fillRect(x + 10, y + 14, 2, 2, color);
  panel.drawLine(x + 1, y + 7, x + 5, y + 7, color);
  panel.drawLine(x + 16, y + 11, x + 20, y + 11, color);
}

void drawGearIcon(int16_t x, int16_t y, uint16_t color) {
  panel.drawRect(x + 5, y + 4, 10, 10, color);
  panel.fillRect(x + 8, y + 7, 4, 4, color);
  panel.fillRect(x + 8, y + 1, 4, 3, color);
  panel.fillRect(x + 8, y + 14, 4, 3, color);
  panel.fillRect(x + 2, y + 7, 3, 4, color);
  panel.fillRect(x + 15, y + 7, 3, 4, color);
  panel.fillRect(x + 4, y + 3, 2, 2, color);
  panel.fillRect(x + 13, y + 3, 2, 2, color);
}

void drawSignalBars(int16_t x, int16_t y, uint16_t color) {
  panel.fillRect(x + 2, y + 10, 3, 6, color);
  panel.fillRect(x + 7, y + 7, 3, 9, color);
  panel.fillRect(x + 12, y + 4, 3, 12, color);
  panel.fillRect(x + 17, y + 1, 3, 15, color);
}

void drawStackIcon(int16_t x, int16_t y, uint16_t color) {
  panel.drawRect(x + 3, y + 2, 14, 3, color);
  panel.drawRect(x + 1, y + 8, 18, 3, color);
  panel.drawRect(x + 3, y + 14, 14, 3, color);
}

void drawLinkIcon(int16_t x, int16_t y, uint16_t color) {
  panel.drawRect(x + 1, y + 6, 8, 6, color);
  panel.drawRect(x + 11, y + 6, 8, 6, color);
  panel.fillRect(x + 7, y + 8, 6, 2, color);
}

void drawHomeIcon(int16_t x, int16_t y, uint16_t color) {
  panel.drawLine(x + 1, y + 8, x + 10, y + 1, color);
  panel.drawLine(x + 10, y + 1, x + 19, y + 8, color);
  panel.drawRect(x + 4, y + 8, 12, 9, color);
  panel.fillRect(x + 8, y + 11, 4, 6, color);
}

void drawHomeTile(int16_t x, int16_t y, const char* label, uint8_t iconIndex, bool selected) {
  uint16_t accentColor = kColorAccent;
  switch (iconIndex) {
    case 0:
      accentColor = kColorLocate;
      break;
    case 1:
      accentColor = kColorInventory;
      break;
    case 2:
      accentColor = kColorSync;
      break;
    default:
      accentColor = kColorSettings;
      break;
  }

  drawTile(x, y, 64, 24, label, accentColor, selected);
  const uint16_t iconColor = selected ? kColorHighlightText : accentColor;
  switch (iconIndex) {
    case 0:
      drawMagnifierIcon(x + 21, y + 4, iconColor);
      break;
    case 1:
      drawBoxIcon(x + 20, y + 4, iconColor);
      break;
    case 2:
      drawPhoneIcon(x + 21, y + 3, iconColor);
      break;
    default:
      drawGearIcon(x + 22, y + 4, iconColor);
      break;
  }
}

void drawSettingsTile(int16_t x, int16_t y, const char* label, uint8_t iconIndex, bool selected) {
  uint16_t accentColor = kColorSettings;
  switch (iconIndex) {
    case 0:
      accentColor = kColorLocate;
      break;
    case 1:
      accentColor = kColorInventory;
      break;
    case 2:
      accentColor = kColorSync;
      break;
    default:
      accentColor = kColorSettings;
      break;
  }

  drawTile(x, y, 64, 24, label, accentColor, selected);
  const uint16_t iconColor = selected ? kColorHighlightText : accentColor;
  switch (iconIndex) {
    case 0:
      drawSignalBars(x + 21, y + 4, iconColor);
      break;
    case 1:
      drawStackIcon(x + 22, y + 4, iconColor);
      break;
    case 2:
      drawLinkIcon(x + 22, y + 4, iconColor);
      break;
    default:
      drawHomeIcon(x + 22, y + 4, iconColor);
      break;
  }
}

void drawBottomInfo(const char* line1, const char* line2, uint16_t accentColor) {
  panel.fillRect(6, 90, kScreenWidth - 12, 22, kColorSurface);
  panel.drawRect(6, 90, kScreenWidth - 12, 22, kColorBorder);
  panel.fillRect(8, 92, 4, 18, accentColor);
  drawText(16, 94, line1, accentColor, 1, 134);
  drawText(16, 102, line2, kColorInk, 1, 134);
}

void drawHomeSelectionCard(uint8_t index, bool selected) {
  switch (index) {
    case 0:
      drawMenuRow(kListRowY[0], "LOCATE PARTS", selected);
      break;
    case 1:
      drawMenuRow(kListRowY[1], "INVENTORY", selected);
      break;
    case 2:
      drawMenuRow(kListRowY[2], "NODES", selected);
      break;
    case 3:
      drawMenuRow(kListRowY[3], "SETUP", selected);
      break;
    default:
      break;
  }
}

void drawPartMenuRow(const InventoryPart& part, int16_t y, bool selected) {
  char label[24];
  snprintf(label, sizeof(label), "%s Q%u", part.shortLabel, static_cast<unsigned>(part.quantity));
  drawMenuRow(y, label, selected);
}

void drawNodeMenuRow(const NodeRecord& node, int16_t y, bool selected) {
  char label[24];
  snprintf(label, sizeof(label), "%s %s", node.idLabel, node.online ? "ONLINE" : "OFFLINE");
  drawMenuRow(y, label, selected);
}

void formatLocateDetail(const AppState& state, char* line1, size_t line1Size, char* line2, size_t line2Size,
                        uint16_t* accentColor) {
  const InventoryPart& part = selectedPart(state);
  snprintf(line1, line1Size, "%s", part.detailLabel);
  if (part.nodeIndex < 0) {
    snprintf(line2, line2Size, "%s  NO TARGET", part.locationLabel);
    *accentColor = kColorWarn;
    return;
  }

  const NodeRecord& node = state.nodes[part.nodeIndex];
  snprintf(line2, line2Size, "%s  %s", part.locationLabel, node.idLabel);
  *accentColor = node.online ? kColorAccent : kColorWarn;
}

void formatInventoryDetail(const AppState& state, char* line1, size_t line1Size, char* line2, size_t line2Size,
                           uint16_t* accentColor) {
  const InventoryPart& part = selectedPart(state);
  snprintf(line1, line1Size, "%s", part.detailLabel);
  snprintf(
      line2,
      line2Size,
      "QTY %u NEED %u",
      static_cast<unsigned>(part.quantity),
      static_cast<unsigned>(part.neededQuantity));
  *accentColor = (part.quantity >= part.neededQuantity) ? kColorGood : kColorWarn;
}

void formatAdjustDetail(const AppState& state, char* line1, size_t line1Size, char* line2, size_t line2Size,
                        uint16_t* accentColor) {
  const InventoryPart& part = selectedPart(state);
  const int16_t finalQuantity = effectiveSelectedPartQuantity(state);
  snprintf(line1, line1Size, "%s", part.detailLabel);
  snprintf(
      line2,
      line2Size,
      "NOW %u NEW %u",
      static_cast<unsigned>(part.quantity),
      static_cast<unsigned>(finalQuantity));
  *accentColor = (finalQuantity >= static_cast<int16_t>(part.neededQuantity)) ? kColorGood : kColorWarn;
}

void formatNodeDetail(const NodeRecord& node, char* line1, size_t line1Size, char* line2, size_t line2Size,
                      uint16_t* accentColor) {
  snprintf(line1, line1Size, "%s  %s", node.idLabel, node.zoneLabel);
  snprintf(line2, line2Size, "OUT %u  %s", static_cast<unsigned>(node.outputs), node.lastSeenLabel);
  *accentColor = node.online ? kColorGood : kColorWarn;
}

void formatSetupDetail(const AppState& state, char* line1, size_t line1Size, char* line2, size_t line2Size,
                       uint16_t* accentColor) {
  snprintf(line1, line1Size, "%s", state.phoneLinked ? "PHONE LINK ON" : "LOCAL ONLY");
  snprintf(line2, line2Size, "%s", state.cacheFresh ? "CACHE READY" : "CACHE STALE");
  *accentColor = state.cacheFresh ? kColorGood : kColorWarn;
}

void formatRadioDetail(const AppState& state, char* line1, size_t line1Size, char* line2, size_t line2Size,
                       uint16_t* accentColor) {
  const RadioSelfTestState& radioTest = state.radioTest;
  if (!radioTest.hasRun) {
    snprintf(line1, line1Size, "RUN SELF TEST");
    snprintf(line2, line2Size, "TO VERIFY NRF24");
    *accentColor = kColorWarn;
    return;
  }

  snprintf(
      line1,
      line1Size,
      "SPI %s REG %s",
      radioTest.spiLooksAlive ? "PASS" : "FAIL",
      radioTest.writeReadbackPass ? "PASS" : "FAIL");
  snprintf(
      line2,
      line2Size,
      "CE %s RUN %u",
      radioTest.ceTriggerPass ? "PASS" : "FAIL",
      static_cast<unsigned>(radioTest.runCount));
  *accentColor = radioOverallColor(radioTest);
}

void drawShell(const AppState& state, const char* tag, const char* line1, const char* line2, uint16_t accentColor) {
  clearBody();
  drawStatusBar(state);
  drawHeader(screenTitle(state.screen));
  drawDetailCard(tag, line1, line2, accentColor);
}

void renderHome(const AppState& state) {
  const char* detail1 = "LOCATE PARTS";
  const char* detail2 = state.phoneLinked ? "PHONE READY" : "LOCAL READY";
  uint16_t accentColor = kColorLocate;

  switch (state.selectionIndex) {
    case 0:
      detail1 = "LOCATE PARTS";
      detail2 = "FIND STORED ITEM";
      accentColor = kColorLocate;
      break;
    case 1:
      detail1 = "STOCK EDIT";
      detail2 = "ADJUST QUANTITY";
      accentColor = kColorInventory;
      break;
    case 2:
      detail1 = "PHONE SYNC";
      detail2 = state.phoneLinked ? "SYNC AVAILABLE" : "CONNECT PHONE";
      accentColor = kColorSync;
      break;
    case 3:
      detail1 = "SETTINGS";
      detail2 = "RADIO CACHE LINK";
      accentColor = kColorSettings;
      break;
  }

  clearBody();
  drawStatusBar(state);
  drawHeader(screenTitle(state.screen));
  drawHomeTile(12, 34, "LOC", 0, state.selectionIndex == 0);
  drawHomeTile(84, 34, "INV", 1, state.selectionIndex == 1);
  drawHomeTile(12, 62, "SYNC", 2, state.selectionIndex == 2);
  drawHomeTile(84, 62, "SET", 3, state.selectionIndex == 3);
  drawBottomInfo(detail1, detail2, accentColor);
}

void renderLocateList(const AppState& state) {
  char line1[24];
  char line2[24];
  uint16_t accentColor = kColorAccent;
  formatLocateDetail(state, line1, sizeof(line1), line2, sizeof(line2), &accentColor);
  drawShell(state, "SELECT PART", line1, line2, accentColor);

  for (uint8_t index = 0; index < kPartCount; ++index) {
    drawPartMenuRow(state.parts[index], kListRowY[index], state.selectionIndex == index);
  }
}

void renderLocateSession(const AppState& state) {
  const InventoryPart& part = selectedPart(state);
  char line1[24];
  char line2[24];
  snprintf(line1, sizeof(line1), "%s", part.detailLabel);
  snprintf(line2, sizeof(line2), "%s  %s", locateStateLabel(state), part.locationLabel);

  uint16_t accentColor = kColorAccent;
  if (state.locateState == LocateSessionState::AwaitingRemote) {
    accentColor = kColorGood;
  } else if ((state.locateState == LocateSessionState::NeedsRadioCheck) ||
             (state.locateState == LocateSessionState::NoTarget)) {
    accentColor = kColorWarn;
  } else if (state.locateState == LocateSessionState::NodeOffline) {
    accentColor = kColorFail;
  }

  clearBody();
  drawStatusBar(state);
  drawHeader(screenTitle(state.screen));
  panel.drawRect(52, 34, 56, 40, accentColor);
  panel.drawRect(60, 42, 40, 24, accentColor);
  panel.fillRect(77, 51, 6, 6, accentColor);
  drawBottomInfo(line1, line2, accentColor);
  drawMenuRow(72, locateStateLabel(state), false);
  drawMenuRow(84, locateActionLabel(state), true);
}

void renderInventoryList(const AppState& state) {
  char line1[24];
  char line2[24];
  uint16_t accentColor = kColorAccent;
  formatInventoryDetail(state, line1, sizeof(line1), line2, sizeof(line2), &accentColor);
  drawShell(state, "PICK STOCK ITEM", line1, line2, accentColor);

  for (uint8_t index = 0; index < kPartCount; ++index) {
    drawPartMenuRow(state.parts[index], kListRowY[index], state.selectionIndex == index);
  }
}

void renderInventoryAdjust(const AppState& state) {
  const InventoryPart& part = selectedPart(state);
  const int16_t finalQuantity = effectiveSelectedPartQuantity(state);
  char quantityLabel[12];
  char deltaLabel[12];
  char line1[24];
  char line2[24];
  snprintf(quantityLabel, sizeof(quantityLabel), "%d", finalQuantity);
  snprintf(deltaLabel, sizeof(deltaLabel), "%+d", static_cast<int>(state.pendingInventoryDelta));
  snprintf(line1, sizeof(line1), "%s", part.detailLabel);
  snprintf(line2, sizeof(line2), "NOW %u NEW %u", static_cast<unsigned>(part.quantity), static_cast<unsigned>(finalQuantity));

  const uint16_t accentColor =
      (finalQuantity >= static_cast<int16_t>(part.neededQuantity)) ? kColorGood : kColorWarn;

  clearBody();
  drawStatusBar(state);
  drawHeader(screenTitle(state.screen));
  drawText((kScreenWidth - textWidth(part.shortLabel, 2)) / 2, 32, part.shortLabel, kColorAccent, 2);
  panel.fillRect(20, 58, 18, 14, kColorSurfaceAlt);
  panel.drawRect(20, 58, 18, 14, kColorBorder);
  drawText(26, 61, "-", kColorInk, 2);
  panel.fillRect(122, 58, 18, 14, kColorSurfaceAlt);
  panel.drawRect(122, 58, 18, 14, kColorBorder);
  drawText(128, 61, "+", kColorInk, 2);
  panel.fillRect(48, 54, 64, 22, kColorSurface);
  panel.drawRect(48, 54, 64, 22, kColorBorder);
  drawText(48 + ((64 - textWidth(quantityLabel, 2)) / 2), 59, quantityLabel, kColorInk, 2);
  drawText((kScreenWidth - textWidth(deltaLabel, 1)) / 2, 78, deltaLabel, accentColor, 1);
  drawBottomInfo(line1, line2, accentColor);
}

void renderNodesList(const AppState& state) {
  char line1[24];
  char line2[24];
  uint16_t accentColor = kColorAccent;
  formatNodeDetail(selectedNode(state), line1, sizeof(line1), line2, sizeof(line2), &accentColor);
  drawShell(state, "KNOWN NODES", line1, line2, accentColor);

  for (uint8_t index = 0; index < kNodeCount; ++index) {
    drawNodeMenuRow(state.nodes[index], kListRowY[index], state.selectionIndex == index);
  }
}

void renderNodeDetail(const AppState& state) {
  char line1[24];
  char line2[24];
  uint16_t accentColor = kColorAccent;
  formatNodeDetail(selectedNode(state), line1, sizeof(line1), line2, sizeof(line2), &accentColor);
  drawShell(state, "NODE MAINT", line1, line2, accentColor);
  drawMenuRow(kListRowY[0], "OPEN RADIO CHECK", state.selectionIndex == 0);
  drawMenuRow(kListRowY[1], "BACK", state.selectionIndex == 1);
}

void renderPhoneSync(const AppState& state) {
  clearBody();
  drawStatusBar(state);
  drawHeader(screenTitle(state.screen));
  drawPhoneIcon(69, 30, state.phoneLinked ? kColorGood : kColorMuted);
  if (state.phoneLinked) {
    panel.drawLine(58, 42, 66, 42, kColorGood);
    panel.drawLine(94, 42, 102, 42, kColorGood);
  }

  drawMenuRow(kListRowY[2], state.phoneLinked ? "DISCONNECT PHONE" : "CONNECT PHONE", state.selectionIndex == 0);
  drawMenuRow(kListRowY[3], "SYNC CACHE", state.selectionIndex == 1);
  drawMenuRow(kListRowY[4], "BACK HOME", state.selectionIndex == 2);
  drawBottomInfo(state.phoneLinked ? "PHONE CONNECTED" : "WAITING FOR PHONE",
                 state.cacheFresh ? "CACHE READY" : "CACHE STALE",
                 state.phoneLinked ? kColorGood : kColorWarn);
}

void renderSetup(const AppState& state) {
  const char* line1 = "RADIO CHECK";
  uint16_t accentColor = kColorLocate;
  switch (state.selectionIndex) {
    case 0:
      line1 = "RADIO CHECK";
      accentColor = kColorLocate;
      break;
    case 1:
      line1 = "REFRESH CACHE";
      accentColor = kColorInventory;
      break;
    case 2:
      line1 = state.phoneLinked ? "PHONE LINK OFF" : "PHONE LINK ON";
      accentColor = kColorSync;
      break;
    case 3:
      line1 = "BACK HOME";
      accentColor = kColorSettings;
      break;
  }

  clearBody();
  drawStatusBar(state);
  drawHeader(screenTitle(state.screen));
  drawSettingsTile(12, 34, "RAD", 0, state.selectionIndex == 0);
  drawSettingsTile(84, 34, "CACHE", 1, state.selectionIndex == 1);
  drawSettingsTile(12, 62, "LINK", 2, state.selectionIndex == 2);
  drawSettingsTile(84, 62, "HOME", 3, state.selectionIndex == 3);
  drawBottomInfo(line1, state.phoneLinked ? "BLE ON" : "LOCAL ONLY", accentColor);
}

void renderRadio(const AppState& state) {
  char line1[24];
  char line2[24];
  uint16_t accentColor = kColorAccent;
  formatRadioDetail(state, line1, sizeof(line1), line2, sizeof(line2), &accentColor);
  clearBody();
  drawStatusBar(state);
  drawHeader(screenTitle(state.screen));
  drawSignalBars(68, 34, accentColor);
  drawBottomInfo(line1, line2, accentColor);
  drawMenuRow(kListRowY[2], "RUN SELF TEST", state.selectionIndex == 0);
  drawMenuRow(kListRowY[3], "BACK", state.selectionIndex == 1);
}

void renderFullScreen(const AppState& state) {
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

  drawFooter(state);
  panel.present();
}

}  // namespace

void initializeTftUi() {
  panel.begin();
  displayReady = true;
  hasLastRenderedState = false;
}

void renderTftUi(const AppState& state) {
  if (!displayReady) {
    return;
  }

  renderFullScreen(state);
  lastRenderedState = state;
  hasLastRenderedState = true;
}
