#include <Arduino.h>
#include <SPI.h>
#include <ctype.h>
#include <stdio.h>

#include "diagnostics_config.h"

namespace aura_diag {
namespace {

using namespace config;

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

constexpr uint8_t kCmdReadRegister = 0x00;
constexpr uint8_t kCmdWriteRegister = 0x20;
constexpr uint8_t kCmdFlushTx = 0xE1;
constexpr uint8_t kCmdFlushRx = 0xE2;
constexpr uint8_t kCmdWriteTxPayload = 0xA0;
constexpr uint8_t kCmdNop = 0xFF;

constexpr uint8_t kRegConfig = 0x00;
constexpr uint8_t kRegEnAa = 0x01;
constexpr uint8_t kRegEnRxAddr = 0x02;
constexpr uint8_t kRegSetupAw = 0x03;
constexpr uint8_t kRegSetupRetr = 0x04;
constexpr uint8_t kRegRfCh = 0x05;
constexpr uint8_t kRegRfSetup = 0x06;
constexpr uint8_t kRegStatus = 0x07;
constexpr uint8_t kRegObserveTx = 0x08;
constexpr uint8_t kRegRxAddrP0 = 0x0A;
constexpr uint8_t kRegTxAddr = 0x10;

constexpr uint8_t kMaskRxDr = 0x40;
constexpr uint8_t kMaskTxDs = 0x20;
constexpr uint8_t kMaskMaxRt = 0x10;

constexpr uint8_t kConfigPowerUpTx = 0x0A;
constexpr uint8_t kSetupAddressWidth5Bytes = 0x03;
constexpr uint8_t kSetupRetriesShort = 0x13;
constexpr uint8_t kRfChannel = 0x4C;
constexpr uint8_t kRfSetup1Mbps0dBm = 0x06;

constexpr uint8_t kTestAddress[5] = {'A', 'U', 'R', 'A', '1'};
constexpr uint8_t kTestPayload[8] = {'D', 'I', 'A', 'G', '-', 'R', 'F', '1'};

const SPISettings kTftSpiSettings(kTftSpiHz, MSBFIRST, SPI_MODE0);
const SPISettings kRadioSpiSettings(4000000, MSBFIRST, SPI_MODE0);

constexpr uint16_t color565(uint8_t red, uint8_t green, uint8_t blue) {
  return static_cast<uint16_t>(((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3));
}

constexpr uint16_t kColorBackground = color565(8, 8, 10);
constexpr uint16_t kColorPanel = color565(18, 20, 24);
constexpr uint16_t kColorPanelAlt = color565(24, 28, 34);
constexpr uint16_t kColorBorder = color565(68, 74, 86);
constexpr uint16_t kColorInk = color565(246, 247, 250);
constexpr uint16_t kColorMuted = color565(150, 158, 170);
constexpr uint16_t kColorAccent = color565(92, 208, 214);
constexpr uint16_t kColorGood = color565(98, 208, 125);
constexpr uint16_t kColorWarn = color565(242, 184, 82);
constexpr uint16_t kColorFail = color565(228, 88, 88);
constexpr uint16_t kColorCrosshair = color565(90, 98, 110);
constexpr uint16_t kColorDot = color565(255, 255, 255);
constexpr uint16_t kColorJoyRing = color565(112, 120, 136);

struct Glyph5x7 {
  char symbol;
  uint8_t rows[7];
};

constexpr Glyph5x7 kGlyphs[] = {
    {' ', {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}},
    {'-', {0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00}},
    {':', {0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00}},
    {'.', {0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00}},
    {'/', {0x01, 0x02, 0x04, 0x04, 0x08, 0x10, 0x00}},
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
    {'R', {0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11}},
    {'S', {0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E}},
    {'T', {0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04}},
    {'U', {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E}},
    {'V', {0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04}},
    {'W', {0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A}},
    {'X', {0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11}},
    {'Y', {0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04}},
};

struct JoystickSnapshot {
  int16_t rawX = 0;
  int16_t rawY = 0;
  int8_t normX = 0;
  int8_t normY = 0;
  int8_t displayX = 0;
  int8_t displayY = 0;
  bool switchPressed = false;
  const char* direction = "CENTER";
};

struct RadioSnapshot {
  bool hasRun = false;
  bool spiLooksAlive = false;
  bool writeReadbackPass = false;
  bool ceTriggerPass = false;
  bool txDone = false;
  bool maxRetry = false;
  bool timeout = false;
  uint8_t status = 0x00;
  uint8_t config = 0x00;
  uint8_t rfCh = 0x00;
  uint8_t rfSetup = 0x00;
  uint8_t observeTx = 0x00;
  unsigned long lastRunAt = 0;
};

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
    parkSharedSpiPeers();

    if (kPinTftBacklight >= 0) {
      pinMode(kPinTftBacklight, OUTPUT);
      setBacklightEnabled(false);
    }

    SPI.begin(kSpiSck, kSpiMiso, kSpiMosi, kPinTftCs);
    hardReset();
    initializeRegisters();
    setRotation(kRotation);
    fillScreen(kColorBackground);

    if (kPinTftBacklight >= 0) {
      setBacklightEnabled(true);
    }
  }

  uint16_t width() const { return width_; }
  uint16_t height() const { return height_; }

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

  void drawPixel(int16_t x, int16_t y, uint16_t color) {
    if ((x < 0) || (y < 0) || (x >= static_cast<int16_t>(width_)) || (y >= static_cast<int16_t>(height_))) {
      return;
    }
    beginWrite();
    setAddressWindowRaw(static_cast<uint16_t>(x), static_cast<uint16_t>(y), static_cast<uint16_t>(x),
                        static_cast<uint16_t>(y));
    writeDataWordRaw(color);
    endWrite();
  }

  void drawHorizontalLine(int16_t x, int16_t y, int16_t width, uint16_t color) { fillRect(x, y, width, 1, color); }
  void drawVerticalLine(int16_t x, int16_t y, int16_t height, uint16_t color) { fillRect(x, y, 1, height, color); }

  void drawRect(int16_t x, int16_t y, int16_t width, int16_t height, uint16_t color) {
    drawHorizontalLine(x, y, width, color);
    drawHorizontalLine(x, y + height - 1, width, color);
    drawVerticalLine(x, y, height, color);
    drawVerticalLine(x + width - 1, y, height, color);
  }

  void drawLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint16_t color);
  void drawCircle(int16_t x0, int16_t y0, int16_t radius, uint16_t color);
  void fillCircle(int16_t x0, int16_t y0, int16_t radius, uint16_t color);
  void setRotation(uint8_t rotation);

 private:
  void parkSharedSpiPeers();
  void setBacklightEnabled(bool enabled);
  void hardReset();
  void initializeRegisters();
  void beginWrite();
  void endWrite();
  void writeCommand(uint8_t command);
  void writeCommandWithData(uint8_t command, const uint8_t* data, size_t length);
  void writeCommandRaw(uint8_t command);
  void writeDataByteRaw(uint8_t value);
  void writeDataWordRaw(uint16_t value);
  void setAddressWindowRaw(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1);
  void streamColorRaw(uint16_t color, uint32_t pixelCount);

  uint16_t width_ = kPanelWidth;
  uint16_t height_ = kPanelHeight;
  uint8_t rotation_ = 0;
};

St7789Panel panel;
RadioSnapshot radioSnapshot;
RadioSnapshot displayedRadioSnapshot;
unsigned long lastRenderAt = 0;
unsigned long lastRadioRunAt = 0;
bool hasPreviousJoystickSnapshot = false;
bool hasDisplayedRadioSnapshot = false;
JoystickSnapshot previousJoystickSnapshot{};
int16_t previousJoyDotX = 0;
int16_t previousJoyDotY = 0;
bool previousTouchIrqActive = false;
bool hasRenderedInputsPanel = false;
bool hasFilteredJoystick = false;
int16_t filteredJoystickX = kJoystickCenter;
int16_t filteredJoystickY = kJoystickCenter;
int16_t runtimeJoystickCenterX = kJoystickCenter;
int16_t runtimeJoystickCenterY = kJoystickCenter;
bool calibrationHoldLatched = false;
unsigned long calibrationPressedAt = 0;
const char* calibrationStatus = "HOLD SW";
const char* previousCalibrationStatus = "";

const Glyph5x7* findGlyph(char value) {
  const char upper = static_cast<char>(toupper(static_cast<unsigned char>(value)));
  for (const auto& glyph : kGlyphs) {
    if (glyph.symbol == upper) {
      return &glyph;
    }
  }
  return &kGlyphs[0];
}

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
  for (uint8_t row = 0; row < 7; ++row) {
    const uint8_t rowBits = glyph->rows[row];
    for (uint8_t col = 0; col < 5; ++col) {
      if ((rowBits & (1 << (4 - col))) == 0) {
        continue;
      }
      panel.fillRect(static_cast<int16_t>(x + (col * scale)), static_cast<int16_t>(y + (row * scale)), scale, scale,
                     color);
    }
  }
}

void drawText(int16_t x, int16_t y, const char* text, uint16_t color, uint8_t scale) {
  if (text == nullptr) {
    return;
  }
  int16_t cursorX = x;
  for (size_t index = 0; text[index] != '\0'; ++index) {
    drawChar(cursorX, y, text[index], color, scale);
    cursorX = static_cast<int16_t>(cursorX + (6 * scale));
  }
}

void deselectTft() {
  if (kPinTftCs >= 0) {
    digitalWrite(kPinTftCs, HIGH);
  }
}

void deselectTouch() {
  if (kPinTouchCs >= 0) {
    digitalWrite(kPinTouchCs, HIGH);
  }
}

void csnHigh() { digitalWrite(kPinRadioCsn, HIGH); }
void csnLow() { digitalWrite(kPinRadioCsn, LOW); }
void ceHigh() { digitalWrite(kPinRadioCe, HIGH); }
void ceLow() { digitalWrite(kPinRadioCe, LOW); }

uint8_t transferByte(uint8_t value) {
  return SPI.transfer(value);
}

uint8_t executeSingleByteCommand(uint8_t command) {
  deselectTft();
  deselectTouch();
  SPI.beginTransaction(kRadioSpiSettings);
  csnLow();
  const uint8_t status = transferByte(command);
  csnHigh();
  SPI.endTransaction();
  return status;
}

uint8_t readRegister(uint8_t reg) {
  deselectTft();
  deselectTouch();
  SPI.beginTransaction(kRadioSpiSettings);
  csnLow();
  transferByte(kCmdReadRegister | (reg & 0x1F));
  const uint8_t value = transferByte(0xFF);
  csnHigh();
  SPI.endTransaction();
  return value;
}

uint8_t writeRegister(uint8_t reg, uint8_t value) {
  deselectTft();
  deselectTouch();
  SPI.beginTransaction(kRadioSpiSettings);
  csnLow();
  const uint8_t status = transferByte(kCmdWriteRegister | (reg & 0x1F));
  transferByte(value);
  csnHigh();
  SPI.endTransaction();
  return status;
}

void writeRegisterBuffer(uint8_t reg, const uint8_t* data, size_t length) {
  deselectTft();
  deselectTouch();
  SPI.beginTransaction(kRadioSpiSettings);
  csnLow();
  transferByte(kCmdWriteRegister | (reg & 0x1F));
  for (size_t index = 0; index < length; ++index) {
    transferByte(data[index]);
  }
  csnHigh();
  SPI.endTransaction();
}

void writePayload(const uint8_t* data, size_t length) {
  deselectTft();
  deselectTouch();
  SPI.beginTransaction(kRadioSpiSettings);
  csnLow();
  transferByte(kCmdWriteTxPayload);
  for (size_t index = 0; index < length; ++index) {
    transferByte(data[index]);
  }
  csnHigh();
  SPI.endTransaction();
}

void clearIrqFlags() {
  writeRegister(kRegStatus, kMaskRxDr | kMaskTxDs | kMaskMaxRt);
}

void flushFifos() {
  executeSingleByteCommand(kCmdFlushTx);
  executeSingleByteCommand(kCmdFlushRx);
}

bool registerValuesLookAlive(uint8_t configValue, uint8_t rfSetupValue, uint8_t statusValue) {
  const bool allZero = (configValue == 0x00) && (rfSetupValue == 0x00) && (statusValue == 0x00);
  const bool allOnes = (configValue == 0xFF) && (rfSetupValue == 0xFF) && (statusValue == 0xFF);
  return !(allZero || allOnes);
}

bool runWriteReadbackTest() {
  const uint8_t original = readRegister(kRegRfCh);
  const uint8_t testValue = static_cast<uint8_t>((original == 0x2A) ? 0x4C : 0x2A);
  writeRegister(kRegRfCh, testValue);
  const uint8_t readBack = readRegister(kRegRfCh);
  writeRegister(kRegRfCh, original);
  return readBack == testValue;
}

void configureForTransmitAttempt() {
  ceLow();
  flushFifos();
  clearIrqFlags();

  writeRegister(kRegConfig, kConfigPowerUpTx);
  writeRegister(kRegEnAa, 0x01);
  writeRegister(kRegEnRxAddr, 0x01);
  writeRegister(kRegSetupAw, kSetupAddressWidth5Bytes);
  writeRegister(kRegSetupRetr, kSetupRetriesShort);
  writeRegister(kRegRfCh, kRfChannel);
  writeRegister(kRegRfSetup, kRfSetup1Mbps0dBm);
  writeRegisterBuffer(kRegTxAddr, kTestAddress, sizeof(kTestAddress));
  writeRegisterBuffer(kRegRxAddrP0, kTestAddress, sizeof(kTestAddress));
  delay(5);
}

void initializeRadio() {
  pinMode(kPinRadioCe, OUTPUT);
  pinMode(kPinRadioCsn, OUTPUT);
  ceLow();
  csnHigh();
}

RadioSnapshot runRadioSnapshot() {
  RadioSnapshot snapshot{};
  snapshot.hasRun = true;
  snapshot.lastRunAt = millis();

  snapshot.status = executeSingleByteCommand(kCmdNop);
  snapshot.config = readRegister(kRegConfig);
  snapshot.rfCh = readRegister(kRegRfCh);
  snapshot.rfSetup = readRegister(kRegRfSetup);
  snapshot.spiLooksAlive = registerValuesLookAlive(snapshot.config, snapshot.rfSetup, snapshot.status);
  snapshot.writeReadbackPass = runWriteReadbackTest();

  configureForTransmitAttempt();
  writePayload(kTestPayload, sizeof(kTestPayload));
  ceHigh();
  delayMicroseconds(20);
  ceLow();

  const unsigned long startedAt = millis();
  while ((millis() - startedAt) < 30) {
    snapshot.status = executeSingleByteCommand(kCmdNop);
    if ((snapshot.status & kMaskTxDs) != 0) {
      snapshot.txDone = true;
      snapshot.ceTriggerPass = true;
      break;
    }
    if ((snapshot.status & kMaskMaxRt) != 0) {
      snapshot.maxRetry = true;
      snapshot.ceTriggerPass = true;
      break;
    }
    delay(1);
  }

  if (!snapshot.ceTriggerPass) {
    snapshot.timeout = true;
  }

  snapshot.observeTx = readRegister(kRegObserveTx);
  clearIrqFlags();
  flushFifos();
  return snapshot;
}

int8_t normalizeAxis(int16_t raw, int16_t center, bool invert = false) {
  int32_t centered = static_cast<int32_t>(raw) - static_cast<int32_t>(center);
  if (invert) {
    centered = -centered;
  }
  const int32_t scaled = (centered * 100) / kJoystickSpan;
  if (scaled > 100) {
    return 100;
  }
  if (scaled < -100) {
    return -100;
  }
  return static_cast<int8_t>(scaled);
}

int8_t stabilizeDisplayedAxis(int8_t value) {
  const int16_t magnitude = abs(value);
  if (magnitude <= kJoystickDisplayDeadband) {
    return 0;
  }

  int16_t quantized = static_cast<int16_t>(((magnitude + (kJoystickDisplayStep / 2)) / kJoystickDisplayStep) *
                                           kJoystickDisplayStep);
  if (quantized > 100) {
    quantized = 100;
  }
  return static_cast<int8_t>(value < 0 ? -quantized : quantized);
}

int16_t updateFilteredAxis(int16_t raw, int16_t& filtered) {
  if (abs(raw - filtered) <= 2) {
    return filtered;
  }

  filtered = static_cast<int16_t>((filtered + raw) / 2);
  return filtered;
}

JoystickSnapshot sampleJoystick() {
  JoystickSnapshot snapshot{};
  const int16_t rawX = static_cast<int16_t>(analogRead(kPinJoystickX));
  const int16_t rawY = static_cast<int16_t>(analogRead(kPinJoystickY));

  if (!hasFilteredJoystick) {
    filteredJoystickX = rawX;
    filteredJoystickY = rawY;
    hasFilteredJoystick = true;
  } else {
    updateFilteredAxis(rawX, filteredJoystickX);
    updateFilteredAxis(rawY, filteredJoystickY);
  }

  snapshot.rawX = filteredJoystickX;
  snapshot.rawY = filteredJoystickY;
  snapshot.normX = normalizeAxis(snapshot.rawX, runtimeJoystickCenterX, !kJoystickLeftIsLow);
  snapshot.normY = normalizeAxis(snapshot.rawY, runtimeJoystickCenterY, false);
  snapshot.displayX = stabilizeDisplayedAxis(snapshot.normX);
  snapshot.displayY = stabilizeDisplayedAxis(snapshot.normY);
  snapshot.switchPressed = kJoystickSwitchActiveLow ? (digitalRead(kPinJoystickSwitch) == LOW)
                                                    : (digitalRead(kPinJoystickSwitch) == HIGH);

  const int16_t centeredX = static_cast<int16_t>(snapshot.rawX - runtimeJoystickCenterX);
  const int16_t centeredY = static_cast<int16_t>(snapshot.rawY - runtimeJoystickCenterY);
  const bool xLow = centeredX < -kJoystickDirectionThreshold;
  const bool xHigh = centeredX > kJoystickDirectionThreshold;
  const bool yLow = centeredY < -kJoystickDirectionThreshold;
  const bool yHigh = centeredY > kJoystickDirectionThreshold;

  snapshot.direction = "CENTER";
  if (kJoystickUpIsLow) {
    if (yLow) {
      snapshot.direction = "UP";
    } else if (yHigh) {
      snapshot.direction = "DOWN";
    }
  } else if (yHigh) {
    snapshot.direction = "UP";
  } else if (yLow) {
    snapshot.direction = "DOWN";
  }

  if (kJoystickLeftIsLow) {
    if (xLow) {
      snapshot.direction = "LEFT";
    } else if (xHigh) {
      snapshot.direction = "RIGHT";
    }
  } else if (xHigh) {
    snapshot.direction = "LEFT";
  } else if (xLow) {
    snapshot.direction = "RIGHT";
  }

  return snapshot;
}

bool radioSnapshotsEqual(const RadioSnapshot& left, const RadioSnapshot& right) {
  return left.hasRun == right.hasRun && left.spiLooksAlive == right.spiLooksAlive &&
         left.writeReadbackPass == right.writeReadbackPass && left.ceTriggerPass == right.ceTriggerPass &&
         left.txDone == right.txDone && left.maxRetry == right.maxRetry && left.timeout == right.timeout &&
         left.status == right.status && left.rfCh == right.rfCh && left.observeTx == right.observeTx;
}

bool joystickNeedsRedraw(const JoystickSnapshot& joystick) {
  const int16_t joyCenterX = 92;
  const int16_t joyCenterY = 150;
  const int16_t joyRadius = 50;
  const int16_t joyDotX = static_cast<int16_t>(joyCenterX + ((joystick.displayX * joyRadius) / 100));
  const int16_t joyDotY = static_cast<int16_t>(joyCenterY + ((joystick.displayY * joyRadius) / 100));

  if (!hasPreviousJoystickSnapshot) {
    return true;
  }

  return joyDotX != previousJoyDotX || joyDotY != previousJoyDotY ||
         joystick.displayX != previousJoystickSnapshot.displayX ||
         joystick.displayY != previousJoystickSnapshot.displayY ||
         joystick.switchPressed != previousJoystickSnapshot.switchPressed ||
         joystick.direction != previousJoystickSnapshot.direction || calibrationStatus != previousCalibrationStatus;
}

void updateJoystickCalibration(const JoystickSnapshot& joystick, unsigned long now) {
  if (!joystick.switchPressed) {
    calibrationPressedAt = 0;
    calibrationHoldLatched = false;
    calibrationStatus = "HOLD SW";
    return;
  }

  if (calibrationPressedAt == 0) {
    calibrationPressedAt = now;
    calibrationStatus = "HOLD SW";
    return;
  }

  if (!calibrationHoldLatched && ((now - calibrationPressedAt) >= kJoystickCenterHoldMs)) {
    runtimeJoystickCenterX = joystick.rawX;
    runtimeJoystickCenterY = joystick.rawY;
    filteredJoystickX = joystick.rawX;
    filteredJoystickY = joystick.rawY;
    hasPreviousJoystickSnapshot = false;
    calibrationHoldLatched = true;
    calibrationStatus = "CENTERED";
    return;
  }

  calibrationStatus = calibrationHoldLatched ? "CENTERED" : "HOLD SW";
}

uint16_t radioStatusColor(const RadioSnapshot& snapshot) {
  if (!snapshot.hasRun) {
    return kColorWarn;
  }
  if (snapshot.spiLooksAlive && snapshot.writeReadbackPass && snapshot.ceTriggerPass) {
    return kColorGood;
  }
  if (!snapshot.spiLooksAlive || !snapshot.writeReadbackPass) {
    return kColorFail;
  }
  return kColorWarn;
}

const char* radioStatusLabel(const RadioSnapshot& snapshot) {
  if (!snapshot.hasRun) {
    return "WAIT";
  }
  if (snapshot.spiLooksAlive && snapshot.writeReadbackPass && snapshot.ceTriggerPass) {
    return "PASS";
  }
  if (!snapshot.spiLooksAlive || !snapshot.writeReadbackPass) {
    return "FAIL";
  }
  return "WARN";
}

void drawSectionTitle(int16_t x, int16_t y, const char* title, uint16_t color) {
  drawText(x, y, title, color, 1);
}

void drawLabeledValue(int16_t x, int16_t y, const char* label, const char* value, uint16_t valueColor = kColorInk) {
  drawText(x, y, label, kColorMuted, 1);
  drawText(static_cast<int16_t>(x + textWidth(label, 1) + 6), y, value, valueColor, 1);
}

void drawValueField(
    int16_t x,
    int16_t y,
    int16_t width,
    const char* value,
    uint16_t valueColor,
    uint16_t background = kColorPanel) {
  panel.fillRect(x, static_cast<int16_t>(y - 1), width, 9, background);
  if (value != nullptr) {
    drawText(x, y, value, valueColor, 1);
  }
}

void St7789Panel::drawLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint16_t color) {
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

void St7789Panel::drawCircle(int16_t x0, int16_t y0, int16_t radius, uint16_t color) {
  int16_t f = 1 - radius;
  int16_t ddF_x = 1;
  int16_t ddF_y = -2 * radius;
  int16_t x = 0;
  int16_t y = radius;

  drawPixel(x0, y0 + radius, color);
  drawPixel(x0, y0 - radius, color);
  drawPixel(x0 + radius, y0, color);
  drawPixel(x0 - radius, y0, color);

  while (x < y) {
    if (f >= 0) {
      y--;
      ddF_y += 2;
      f += ddF_y;
    }
    x++;
    ddF_x += 2;
    f += ddF_x;

    drawPixel(x0 + x, y0 + y, color);
    drawPixel(x0 - x, y0 + y, color);
    drawPixel(x0 + x, y0 - y, color);
    drawPixel(x0 - x, y0 - y, color);
    drawPixel(x0 + y, y0 + x, color);
    drawPixel(x0 - y, y0 + x, color);
    drawPixel(x0 + y, y0 - x, color);
    drawPixel(x0 - y, y0 - x, color);
  }
}

void St7789Panel::fillCircle(int16_t x0, int16_t y0, int16_t radius, uint16_t color) {
  for (int16_t y = -radius; y <= radius; ++y) {
    for (int16_t x = -radius; x <= radius; ++x) {
      if ((x * x + y * y) <= (radius * radius)) {
        drawPixel(static_cast<int16_t>(x0 + x), static_cast<int16_t>(y0 + y), color);
      }
    }
  }
}

void St7789Panel::setRotation(uint8_t rotation) {
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

void St7789Panel::parkSharedSpiPeers() {
  if (kPinRadioCe >= 0) {
    pinMode(kPinRadioCe, OUTPUT);
    digitalWrite(kPinRadioCe, LOW);
  }
  if (kPinRadioCsn >= 0) {
    pinMode(kPinRadioCsn, OUTPUT);
    digitalWrite(kPinRadioCsn, HIGH);
  }
  if (kPinTouchCs >= 0) {
    pinMode(kPinTouchCs, OUTPUT);
    digitalWrite(kPinTouchCs, HIGH);
  }
  if (kPinTouchIrq >= 0) {
    pinMode(kPinTouchIrq, INPUT_PULLUP);
  }
}

void St7789Panel::setBacklightEnabled(bool enabled) {
  const bool driveHigh = kBacklightActiveLow ? !enabled : enabled;
  digitalWrite(kPinTftBacklight, driveHigh ? HIGH : LOW);
}

void St7789Panel::hardReset() {
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

void St7789Panel::initializeRegisters() {
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
  writeCommandWithData(kCmdColorMode, kColorMode16Bit, sizeof(kColorMode16Bit));
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

void St7789Panel::beginWrite() {
  SPI.beginTransaction(kTftSpiSettings);
  digitalWrite(kPinTftCs, LOW);
}

void St7789Panel::endWrite() {
  digitalWrite(kPinTftCs, HIGH);
  SPI.endTransaction();
}

void St7789Panel::writeCommand(uint8_t command) {
  beginWrite();
  writeCommandRaw(command);
  endWrite();
}

void St7789Panel::writeCommandWithData(uint8_t command, const uint8_t* data, size_t length) {
  beginWrite();
  writeCommandRaw(command);
  for (size_t index = 0; index < length; ++index) {
    writeDataByteRaw(data[index]);
  }
  endWrite();
}

void St7789Panel::writeCommandRaw(uint8_t command) {
  digitalWrite(kPinTftDc, LOW);
  SPI.transfer(command);
  digitalWrite(kPinTftDc, HIGH);
}

void St7789Panel::writeDataByteRaw(uint8_t value) {
  SPI.transfer(value);
}

void St7789Panel::writeDataWordRaw(uint16_t value) {
  SPI.transfer(static_cast<uint8_t>(value >> 8));
  SPI.transfer(static_cast<uint8_t>(value & 0xFF));
}

void St7789Panel::setAddressWindowRaw(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1) {
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

void St7789Panel::streamColorRaw(uint16_t color, uint32_t pixelCount) {
  const uint8_t highByte = static_cast<uint8_t>(color >> 8);
  const uint8_t lowByte = static_cast<uint8_t>(color & 0xFF);
  while (pixelCount-- > 0) {
    SPI.transfer(highByte);
    SPI.transfer(lowByte);
  }
}

void renderStaticShell() {
  const uint16_t screenW = panel.width();
  const uint16_t screenH = panel.height();
  const int16_t joyCenterX = 92;
  const int16_t joyCenterY = 150;
  const int16_t joyRadius = 58;

  panel.fillScreen(kColorBackground);
  panel.fillRect(0, 0, static_cast<int16_t>(screenW), 22, kColorPanelAlt);
  drawText(8, 7, "AURA HOST DIAGNOSTICS", kColorInk, 1);
  drawText(static_cast<int16_t>(screenW - 74), 7, "ST7789", kColorAccent, 1);

  panel.fillRect(8, 30, 168, 202, kColorPanel);
  panel.drawRect(8, 30, 168, 202, kColorBorder);
  drawSectionTitle(16, 38, "JOYSTICK", kColorAccent);
  drawText(18, 86, "DIR", kColorMuted, 1);
  drawText(18, 98, "SW", kColorMuted, 1);
  drawText(18, 110, "CAL", kColorMuted, 1);
  drawText(18, 214, "X", kColorMuted, 1);
  drawText(92, 214, "Y", kColorMuted, 1);
  panel.drawCircle(joyCenterX, joyCenterY, joyRadius, kColorJoyRing);
  panel.drawCircle(joyCenterX, joyCenterY, static_cast<int16_t>(joyRadius - 1), kColorJoyRing);
  panel.drawHorizontalLine(
      static_cast<int16_t>(joyCenterX - joyRadius),
      joyCenterY,
      static_cast<int16_t>(joyRadius * 2),
      kColorCrosshair);
  panel.drawVerticalLine(
      joyCenterX,
      static_cast<int16_t>(joyCenterY - joyRadius),
      static_cast<int16_t>(joyRadius * 2),
      kColorCrosshair);

  panel.fillRect(186, 30, static_cast<int16_t>(screenW - 194), 95, kColorPanel);
  panel.drawRect(186, 30, static_cast<int16_t>(screenW - 194), 95, kColorBorder);
  drawSectionTitle(194, 38, "RADIO", kColorAccent);
  drawText(194, 54, "STATE", kColorMuted, 1);
  drawText(194, 66, "SPI", kColorMuted, 1);
  drawText(194, 78, "REG", kColorMuted, 1);
  drawText(194, 90, "CE", kColorMuted, 1);
  drawText(194, 102, "STAT", kColorMuted, 1);
  drawText(268, 102, "CH", kColorMuted, 1);
  drawText(194, 114, "OBS", kColorMuted, 1);

  panel.fillRect(186, 134, static_cast<int16_t>(screenW - 194), 98, kColorPanel);
  panel.drawRect(186, 134, static_cast<int16_t>(screenW - 194), 98, kColorBorder);
  drawSectionTitle(194, 142, "INPUTS", kColorAccent);
  drawText(194, 158, "TOUCH IRQ", kColorMuted, 1);
  drawText(194, 170, "ROT", kColorMuted, 1);
  drawText(194, 182, "W", kColorMuted, 1);
  drawText(250, 182, "H", kColorMuted, 1);
  drawText(194, 194, "BL", kColorMuted, 1);
  drawText(194, 206, "MODE", kColorMuted, 1);
  drawText(218, 170, "3", kColorInk, 1);
  {
    char line[16];
    snprintf(line, sizeof(line), "%u", static_cast<unsigned>(screenW));
    drawText(206, 182, line, kColorInk, 1);
    snprintf(line, sizeof(line), "%u", static_cast<unsigned>(screenH));
    drawText(262, 182, line, kColorInk, 1);
  }
  drawText(212, 194, "ON", kColorGood, 1);
  drawText(230, 206, "LIVE", kColorInk, 1);

  panel.fillRect(8, 238, static_cast<int16_t>(screenW - 16), static_cast<int16_t>(screenH - 246), kColorPanelAlt);
  panel.drawRect(8, 238, static_cast<int16_t>(screenW - 16), static_cast<int16_t>(screenH - 246), kColorBorder);
  drawText(14, 247, "MOVE JOYSTICK   PRESS SWITCH   WATCH RADIO PANEL", kColorMuted, 1);
}

void renderJoystickPanel(const JoystickSnapshot& joystick) {
  char line[32];
  const int16_t joyCenterX = 92;
  const int16_t joyCenterY = 150;
  const int16_t joyRadius = 58;
  const int16_t joyTravelRadius = static_cast<int16_t>(joyRadius - 8);
  const int16_t joyDotX = static_cast<int16_t>(joyCenterX + ((joystick.displayX * joyTravelRadius) / 100));
  const int16_t joyDotY = static_cast<int16_t>(joyCenterY + ((joystick.displayY * joyTravelRadius) / 100));

  if (hasPreviousJoystickSnapshot) {
    panel.fillRect(static_cast<int16_t>(previousJoyDotX - 4), static_cast<int16_t>(previousJoyDotY - 4), 9, 9, kColorPanel);
    panel.drawHorizontalLine(
        static_cast<int16_t>(joyCenterX - joyRadius),
        joyCenterY,
        static_cast<int16_t>(joyRadius * 2),
        kColorCrosshair);
    panel.drawVerticalLine(
        joyCenterX,
        static_cast<int16_t>(joyCenterY - joyRadius),
        static_cast<int16_t>(joyRadius * 2),
        kColorCrosshair);
  }

  panel.fillRect(static_cast<int16_t>(joyDotX - 4), static_cast<int16_t>(joyDotY - 4), 9, 9, kColorDot);

  if (!hasPreviousJoystickSnapshot || joystick.displayX != previousJoystickSnapshot.displayX) {
    snprintf(line, sizeof(line), "%+d", static_cast<int>(joystick.displayX));
    drawValueField(30, 214, 46, line, kColorInk);
  }
  if (!hasPreviousJoystickSnapshot || joystick.displayY != previousJoystickSnapshot.displayY) {
    snprintf(line, sizeof(line), "%+d", static_cast<int>(joystick.displayY));
    drawValueField(104, 214, 46, line, kColorInk);
  }
  if (!hasPreviousJoystickSnapshot || joystick.direction != previousJoystickSnapshot.direction) {
    drawValueField(42, 86, 54, joystick.direction, kColorInk);
  }
  if (!hasPreviousJoystickSnapshot || joystick.switchPressed != previousJoystickSnapshot.switchPressed) {
    drawValueField(
        36,
        98,
        66,
        joystick.switchPressed ? "PRESSED" : "OPEN",
        joystick.switchPressed ? kColorGood : kColorMuted);
  }
  if (!hasPreviousJoystickSnapshot || calibrationStatus != previousCalibrationStatus) {
    drawValueField(42, 110, 72, calibrationStatus, kColorAccent);
    previousCalibrationStatus = calibrationStatus;
  }

  previousJoystickSnapshot = joystick;
  previousJoyDotX = joyDotX;
  previousJoyDotY = joyDotY;
  hasPreviousJoystickSnapshot = true;
}

void renderRadioPanel() {
  char line[32];
  drawValueField(230, 54, 44, radioStatusLabel(radioSnapshot), radioStatusColor(radioSnapshot));
  drawValueField(218, 66, 56, radioSnapshot.spiLooksAlive ? "ALIVE" : "DEAD",
                 radioSnapshot.spiLooksAlive ? kColorGood : kColorFail);
  drawValueField(218, 78, 56, radioSnapshot.writeReadbackPass ? "PASS" : "FAIL",
                 radioSnapshot.writeReadbackPass ? kColorGood : kColorFail);
  drawValueField(212, 90, 62, radioSnapshot.ceTriggerPass ? "TRIG" : "MISS",
                 radioSnapshot.ceTriggerPass ? kColorGood : kColorWarn);
  snprintf(line, sizeof(line), "%02X", radioSnapshot.status);
  drawValueField(224, 102, 24, line, kColorInk);
  snprintf(line, sizeof(line), "%02X", radioSnapshot.rfCh);
  drawValueField(286, 102, 20, line, kColorInk);
  snprintf(line, sizeof(line), "%02X", radioSnapshot.observeTx);
  drawValueField(218, 114, 24, line, kColorInk);
}

void renderInputsPanel() {
  const bool touchIrqActive = (kPinTouchIrq >= 0 && digitalRead(kPinTouchIrq) == LOW);

  if (!hasRenderedInputsPanel || touchIrqActive != previousTouchIrqActive) {
    drawValueField(254, 158, 48, touchIrqActive ? "ACTIVE" : "IDLE", touchIrqActive ? kColorWarn : kColorMuted);
    previousTouchIrqActive = touchIrqActive;
  }
  hasRenderedInputsPanel = true;
}

void initializeHardware() {
  Serial.begin(115200);
  delay(250);

  pinMode(kPinJoystickSwitch, kJoystickSwitchActiveLow ? INPUT_PULLUP : INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(kPinJoystickX, ADC_11db);
  analogSetPinAttenuation(kPinJoystickY, ADC_11db);

  if (kPinTouchIrq >= 0) {
    pinMode(kPinTouchIrq, INPUT_PULLUP);
  }
  if (kPinTouchCs >= 0) {
    pinMode(kPinTouchCs, OUTPUT);
    digitalWrite(kPinTouchCs, HIGH);
  }

  panel.begin();
  initializeRadio();
  renderStaticShell();
  radioSnapshot = runRadioSnapshot();
  displayedRadioSnapshot = radioSnapshot;
  hasDisplayedRadioSnapshot = true;
  renderJoystickPanel(sampleJoystick());
  renderRadioPanel();
  renderInputsPanel();
  lastRadioRunAt = millis();
  lastRenderAt = 0;
}

void tickDiagnostics() {
  const unsigned long now = millis();
  if ((now - lastRadioRunAt) >= kRadioRetestMs) {
    const RadioSnapshot nextRadioSnapshot = runRadioSnapshot();
    if (!hasDisplayedRadioSnapshot || !radioSnapshotsEqual(nextRadioSnapshot, displayedRadioSnapshot)) {
      radioSnapshot = nextRadioSnapshot;
      displayedRadioSnapshot = nextRadioSnapshot;
      hasDisplayedRadioSnapshot = true;
      renderRadioPanel();
    } else {
      radioSnapshot = nextRadioSnapshot;
    }
    lastRadioRunAt = now;
  }

  if ((now - lastRenderAt) >= kRenderIntervalMs) {
    const JoystickSnapshot joystick = sampleJoystick();
    updateJoystickCalibration(joystick, now);
    if (joystickNeedsRedraw(joystick)) {
      renderJoystickPanel(joystick);
    }
    renderInputsPanel();
    lastRenderAt = now;
  }
}

}  // namespace
}  // namespace aura_diag

void setup() {
  aura_diag::initializeHardware();
}

void loop() {
  aura_diag::tickDiagnostics();
}
