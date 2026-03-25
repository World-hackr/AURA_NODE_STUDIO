#include <Arduino.h>
#include <SPI.h>

#include "display_test_config.h"

namespace display_test {
namespace {

constexpr uint8_t kCmdSwReset = 0x01;
constexpr uint8_t kCmdSleepOut = 0x11;
constexpr uint8_t kCmdNormalDisplayOn = 0x13;
constexpr uint8_t kCmdInversionOff = 0x20;
constexpr uint8_t kCmdInversionOn = 0x21;
constexpr uint8_t kCmdDisplayOn = 0x29;
constexpr uint8_t kCmdColumnAddressSet = 0x2A;
constexpr uint8_t kCmdRowAddressSet = 0x2B;
constexpr uint8_t kCmdMemoryWrite = 0x2C;
constexpr uint8_t kCmdMadCtl = 0x36;
constexpr uint8_t kCmdColorMode = 0x3A;

constexpr uint8_t kMadCtlMy = 0x80;
constexpr uint8_t kMadCtlMx = 0x40;
constexpr uint8_t kMadCtlMv = 0x20;
constexpr uint8_t kMadCtlBgr = 0x08;

const SPISettings kSpiSettings(8000000, MSBFIRST, SPI_MODE0);

constexpr uint16_t color565(uint8_t red, uint8_t green, uint8_t blue) {
  return static_cast<uint16_t>(((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3));
}

constexpr uint16_t kColorBlack = color565(0, 0, 0);
constexpr uint16_t kColorWhite = color565(255, 255, 255);
constexpr uint16_t kColorRed = color565(255, 0, 0);
constexpr uint16_t kColorGreen = color565(0, 255, 0);
constexpr uint16_t kColorBlue = color565(0, 80, 255);
constexpr uint16_t kColorCyan = color565(0, 255, 255);
constexpr uint16_t kColorMagenta = color565(255, 0, 255);
constexpr uint16_t kColorYellow = color565(255, 255, 0);
constexpr uint16_t kColorOrange = color565(255, 120, 0);

class St7789Panel {
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
      digitalWrite(kPinTftBacklight, LOW);
    }

    SPI.begin(kSpiSck, kSpiMiso, kSpiMosi, kPinTftCs);

    hardReset();
    initializeRegisters();
    setRotation(kRotation);
    fillScreen(kColorBlack);

    if (kPinTftBacklight >= 0) {
      digitalWrite(kPinTftBacklight, HIGH);
    }
  }

  uint16_t width() const {
    return width_;
  }

  uint16_t height() const {
    return height_;
  }

  void fillScreen(uint16_t color) {
    fillRect(0, 0, static_cast<int16_t>(width_), static_cast<int16_t>(height_), color);
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

    beginWrite();
    setAddressWindowRaw(
        static_cast<uint16_t>(x),
        static_cast<uint16_t>(y),
        static_cast<uint16_t>(x + width - 1),
        static_cast<uint16_t>(y + height - 1));
    streamColorRaw(color, static_cast<uint32_t>(width) * static_cast<uint32_t>(height));
    endWrite();
  }

  void drawHorizontalLine(int16_t x, int16_t y, int16_t width, uint16_t color) {
    fillRect(x, y, width, 1, color);
  }

  void drawVerticalLine(int16_t x, int16_t y, int16_t height, uint16_t color) {
    fillRect(x, y, 1, height, color);
  }

  void drawFrame(uint16_t color) {
    drawHorizontalLine(0, 0, static_cast<int16_t>(width_), color);
    drawHorizontalLine(0, static_cast<int16_t>(height_ - 1), static_cast<int16_t>(width_), color);
    drawVerticalLine(0, 0, static_cast<int16_t>(height_), color);
    drawVerticalLine(static_cast<int16_t>(width_ - 1), 0, static_cast<int16_t>(height_), color);
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

 private:
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
    static const uint8_t kColorMode16Bit[] = {0x55};
    static const uint8_t kPorchControl[] = {0x0C, 0x0C, 0x00, 0x33, 0x33};
    static const uint8_t kGateControl[] = {0x35};
    static const uint8_t kVcomSetting[] = {0x19};
    static const uint8_t kLcmControl[] = {0x2C};
    static const uint8_t kVdvVrhEnable[] = {0x01, 0xFF};
    static const uint8_t kVrhSet[] = {0x12};
    static const uint8_t kVdvSet[] = {0x20};
    static const uint8_t kFrameRateControl[] = {0x0F};
    static const uint8_t kPowerControl1[] = {0xA4, 0xA1};

    writeCommand(kCmdSwReset);
    delay(150);
    writeCommand(kCmdSleepOut);
    delay(120);
    writeCommandWithData(0x3A, kColorMode16Bit, sizeof(kColorMode16Bit));
    writeCommandWithData(0xB2, kPorchControl, sizeof(kPorchControl));
    writeCommandWithData(0xB7, kGateControl, sizeof(kGateControl));
    writeCommandWithData(0xBB, kVcomSetting, sizeof(kVcomSetting));
    writeCommandWithData(0xC0, kLcmControl, sizeof(kLcmControl));
    writeCommandWithData(0xC2, kVdvVrhEnable, sizeof(kVdvVrhEnable));
    writeCommandWithData(0xC3, kVrhSet, sizeof(kVrhSet));
    writeCommandWithData(0xC4, kVdvSet, sizeof(kVdvSet));
    writeCommandWithData(0xC6, kFrameRateControl, sizeof(kFrameRateControl));
    writeCommandWithData(0xD0, kPowerControl1, sizeof(kPowerControl1));
    writeCommand(kInvertColors ? kCmdInversionOn : kCmdInversionOff);
    writeCommand(kCmdNormalDisplayOn);
    delay(10);
    writeCommand(kCmdDisplayOn);
    delay(120);
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

  void streamColorRaw(uint16_t color, uint32_t pixelCount) {
    const uint8_t highByte = static_cast<uint8_t>(color >> 8);
    const uint8_t lowByte = static_cast<uint8_t>(color & 0xFF);

    while (pixelCount-- > 0) {
      SPI.transfer(highByte);
      SPI.transfer(lowByte);
    }
  }

  uint16_t width_ = kPanelWidth;
  uint16_t height_ = kPanelHeight;
  uint8_t rotation_ = 0;
};

St7789Panel panel;
uint8_t activeStageIndex = 0;
unsigned long lastStageAt = 0;
constexpr unsigned long kStageHoldMs = 1800;

void drawSolid(uint16_t color, const __FlashStringHelper* label) {
  Serial.print(F("Stage: "));
  Serial.println(label);
  panel.fillScreen(color);
}

void drawColorBars() {
  Serial.println(F("Stage: color bars"));

  static const uint16_t kBars[] = {
      kColorRed,
      kColorOrange,
      kColorYellow,
      kColorGreen,
      kColorCyan,
      kColorBlue,
      kColorMagenta,
      kColorWhite,
  };

  panel.fillScreen(kColorBlack);

  const uint16_t barWidth = static_cast<uint16_t>(panel.width() / (sizeof(kBars) / sizeof(kBars[0])));
  for (size_t index = 0; index < (sizeof(kBars) / sizeof(kBars[0])); ++index) {
    const int16_t x = static_cast<int16_t>(index * barWidth);
    const int16_t width =
        (index == ((sizeof(kBars) / sizeof(kBars[0])) - 1))
            ? static_cast<int16_t>(panel.width() - x)
            : static_cast<int16_t>(barWidth);
    panel.fillRect(x, 0, width, static_cast<int16_t>(panel.height()), kBars[index]);
  }

  panel.drawFrame(kColorBlack);
}

void drawOrientationPattern() {
  Serial.println(F("Stage: orientation pattern"));

  const int16_t marker = 28;
  const int16_t centerX = static_cast<int16_t>(panel.width() / 2);
  const int16_t centerY = static_cast<int16_t>(panel.height() / 2);

  panel.fillScreen(kColorBlack);
  panel.fillRect(0, 0, marker, marker, kColorRed);
  panel.fillRect(static_cast<int16_t>(panel.width() - marker), 0, marker, marker, kColorGreen);
  panel.fillRect(0, static_cast<int16_t>(panel.height() - marker), marker, marker, kColorBlue);
  panel.fillRect(static_cast<int16_t>(panel.width() - marker), static_cast<int16_t>(panel.height() - marker), marker,
                 marker, kColorWhite);

  panel.drawHorizontalLine(0, centerY, static_cast<int16_t>(panel.width()), kColorYellow);
  panel.drawVerticalLine(centerX, 0, static_cast<int16_t>(panel.height()), kColorYellow);
  panel.fillRect(centerX - 10, centerY - 10, 20, 20, kColorMagenta);
  panel.drawFrame(kColorCyan);
}

void renderStage(uint8_t stageIndex) {
  switch (stageIndex % 7) {
    case 0:
      drawSolid(kColorBlack, F("solid black"));
      break;
    case 1:
      drawSolid(kColorWhite, F("solid white"));
      break;
    case 2:
      drawSolid(kColorRed, F("solid red"));
      break;
    case 3:
      drawSolid(kColorGreen, F("solid green"));
      break;
    case 4:
      drawSolid(kColorBlue, F("solid blue"));
      break;
    case 5:
      drawColorBars();
      break;
    default:
      drawOrientationPattern();
      break;
  }
}

void initializeDemo() {
  Serial.begin(115200);
  delay(250);

  Serial.println();
  Serial.println(F("AURA Host LCD smoke test"));
  Serial.println(F("Assumed panel: 2.8 inch SPI TFT using ST7789 controller"));
  Serial.println(F("Disconnect radio if you still see noise while testing pure display bring-up."));

  panel.begin();
  renderStage(0);
  activeStageIndex = 0;
  lastStageAt = millis();
}

void tickDemo() {
  const unsigned long now = millis();
  if ((now - lastStageAt) >= kStageHoldMs) {
    activeStageIndex = static_cast<uint8_t>(activeStageIndex + 1);
    renderStage(activeStageIndex);
    lastStageAt = now;
  }
}

}  // namespace
}  // namespace display_test

void setup() {
  display_test::initializeDemo();
}

void loop() {
  display_test::tickDemo();
}
