#include <Arduino.h>
#include <SPI.h>

#include "display_test_config.h"

namespace display_test {
namespace {

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

constexpr SPISettings kSpiSettings(16000000, MSBFIRST, SPI_MODE0);

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
    fillRect(0, 0, width_, height_, color);
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
    drawHorizontalLine(0, 0, width_, color);
    drawHorizontalLine(0, height_ - 1, width_, color);
    drawVerticalLine(0, 0, height_, color);
    drawVerticalLine(width_ - 1, 0, height_, color);
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

St7735Panel panel;
uint8_t activeStageIndex = 0;
unsigned long lastStageAt = 0;
static constexpr unsigned long kStageHoldMs = 1500;

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

  const uint16_t barWidth = panel.width() / (sizeof(kBars) / sizeof(kBars[0]));
  for (size_t index = 0; index < (sizeof(kBars) / sizeof(kBars[0])); ++index) {
    const int16_t x = static_cast<int16_t>(index * barWidth);
    const int16_t width =
        (index == ((sizeof(kBars) / sizeof(kBars[0])) - 1))
            ? static_cast<int16_t>(panel.width() - x)
            : static_cast<int16_t>(barWidth);
    panel.fillRect(x, 0, width, panel.height(), kBars[index]);
  }

  panel.drawFrame(kColorBlack);
}

void drawOrientationPattern() {
  Serial.println(F("Stage: orientation pattern"));

  const int16_t marker = 18;
  const int16_t centerX = static_cast<int16_t>(panel.width() / 2);
  const int16_t centerY = static_cast<int16_t>(panel.height() / 2);

  panel.fillScreen(kColorBlack);
  panel.fillRect(0, 0, marker, marker, kColorRed);
  panel.fillRect(panel.width() - marker, 0, marker, marker, kColorGreen);
  panel.fillRect(0, panel.height() - marker, marker, marker, kColorBlue);
  panel.fillRect(panel.width() - marker, panel.height() - marker, marker, marker, kColorWhite);

  panel.drawHorizontalLine(0, centerY, panel.width(), kColorYellow);
  panel.drawVerticalLine(centerX, 0, panel.height(), kColorYellow);
  panel.fillRect(centerX - 6, centerY - 6, 12, 12, kColorMagenta);
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
  Serial.println(F("Assumed panel: 1.8 inch SPI TFT using ST7735 controller family"));
  Serial.println(F("If the panel is blank, re-check power, CS/DC/RST pins, and the backlight pin."));

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
