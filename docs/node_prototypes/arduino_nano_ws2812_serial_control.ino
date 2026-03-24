#include <Adafruit_NeoPixel.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

constexpr uint8_t kLedPin = 6;
constexpr uint16_t kLedCount = 8;
constexpr uint8_t kDefaultBrightness = 48;
constexpr uint16_t kDefaultBlinkMs = 400;
constexpr uint16_t kDefaultChaseMs = 100;
constexpr uint16_t kDefaultRainbowMs = 40;
constexpr size_t kInputBufferSize = 64;

enum class RenderMode : uint8_t {
  Off = 0,
  Solid = 1,
  Blink = 2,
  Chase = 3,
  Rainbow = 4,
  Manual = 5,
};

Adafruit_NeoPixel strip(kLedCount, kLedPin, NEO_GRB + NEO_KHZ800);

RenderMode currentMode = RenderMode::Solid;
uint8_t brightness = kDefaultBrightness;
uint8_t solidR = 40;
uint8_t solidG = 40;
uint8_t solidB = 40;
uint16_t effectDelayMs = kDefaultBlinkMs;
unsigned long lastFrameAt = 0;
bool blinkOn = true;
uint16_t chaseIndex = 0;
uint16_t rainbowOffset = 0;

char inputBuffer[kInputBufferSize];
size_t inputLength = 0;

void showStrip() {
  strip.setBrightness(brightness);
  strip.show();
}

void fillAll(uint8_t r, uint8_t g, uint8_t b) {
  for (uint16_t i = 0; i < kLedCount; ++i) {
    strip.setPixelColor(i, strip.Color(r, g, b));
  }
  showStrip();
}

void clearStrip() {
  strip.clear();
  showStrip();
}

void setMode(RenderMode mode) {
  currentMode = mode;
  lastFrameAt = millis();

  if (mode == RenderMode::Off) {
    clearStrip();
    return;
  }

  if (mode == RenderMode::Solid) {
    fillAll(solidR, solidG, solidB);
    return;
  }

  if (mode == RenderMode::Blink) {
    blinkOn = true;
    fillAll(solidR, solidG, solidB);
    return;
  }

  if (mode == RenderMode::Chase) {
    chaseIndex = 0;
    return;
  }

  if (mode == RenderMode::Rainbow) {
    rainbowOffset = 0;
  }
}

uint8_t clampByte(int value) {
  if (value < 0) {
    return 0;
  }
  if (value > 255) {
    return 255;
  }
  return static_cast<uint8_t>(value);
}

uint16_t clampDelay(int value, uint16_t fallbackValue) {
  if (value < 10) {
    return fallbackValue;
  }
  if (value > 5000) {
    return 5000;
  }
  return static_cast<uint16_t>(value);
}

uint32_t wheel(uint8_t pos) {
  pos = 255 - pos;
  if (pos < 85) {
    return strip.Color(255 - pos * 3, 0, pos * 3);
  }
  if (pos < 170) {
    pos -= 85;
    return strip.Color(0, pos * 3, 255 - pos * 3);
  }
  pos -= 170;
  return strip.Color(pos * 3, 255 - pos * 3, 0);
}

void printHelp() {
  Serial.println(F("Commands:"));
  Serial.println(F("  HELP"));
  Serial.println(F("  STATUS"));
  Serial.println(F("  OFF"));
  Serial.println(F("  ON"));
  Serial.println(F("  BRIGHT <0-255>"));
  Serial.println(F("  FILL <r> <g> <b>"));
  Serial.println(F("  PIXEL <index> <r> <g> <b>"));
  Serial.println(F("  CLEAR"));
  Serial.println(F("  BLINK <r> <g> <b> <ms>"));
  Serial.println(F("  CHASE <r> <g> <b> <ms>"));
  Serial.println(F("  RAINBOW <ms>"));
}

void printStatus() {
  Serial.print(F("mode="));
  switch (currentMode) {
    case RenderMode::Off:
      Serial.print(F("OFF"));
      break;
    case RenderMode::Solid:
      Serial.print(F("SOLID"));
      break;
    case RenderMode::Blink:
      Serial.print(F("BLINK"));
      break;
    case RenderMode::Chase:
      Serial.print(F("CHASE"));
      break;
    case RenderMode::Rainbow:
      Serial.print(F("RAINBOW"));
      break;
    case RenderMode::Manual:
      Serial.print(F("MANUAL"));
      break;
  }

  Serial.print(F(" brightness="));
  Serial.print(brightness);
  Serial.print(F(" color="));
  Serial.print(solidR);
  Serial.print(',');
  Serial.print(solidG);
  Serial.print(',');
  Serial.print(solidB);
  Serial.print(F(" delayMs="));
  Serial.println(effectDelayMs);
}

void runBlinkFrame() {
  blinkOn = !blinkOn;
  if (blinkOn) {
    fillAll(solidR, solidG, solidB);
  } else {
    clearStrip();
  }
}

void runChaseFrame() {
  strip.clear();
  strip.setPixelColor(chaseIndex % kLedCount, strip.Color(solidR, solidG, solidB));
  showStrip();
  chaseIndex = (chaseIndex + 1) % kLedCount;
}

void runRainbowFrame() {
  for (uint16_t i = 0; i < kLedCount; ++i) {
    uint8_t colorIndex = static_cast<uint8_t>((i * 256 / kLedCount + rainbowOffset) & 0xFF);
    strip.setPixelColor(i, wheel(colorIndex));
  }
  showStrip();
  rainbowOffset = (rainbowOffset + 1) & 0xFF;
}

bool readIntToken(char*& cursor, int& outValue) {
  char* token = strtok(cursor, " ");
  cursor = nullptr;
  if (token == nullptr) {
    return false;
  }

  outValue = atoi(token);
  return true;
}

void handleLine(char* line) {
  char* command = strtok(line, " ");
  if (command == nullptr) {
    return;
  }

  if (strcmp(command, "HELP") == 0) {
    printHelp();
    return;
  }

  if (strcmp(command, "STATUS") == 0) {
    printStatus();
    return;
  }

  if (strcmp(command, "OFF") == 0 || strcmp(command, "CLEAR") == 0) {
    setMode(RenderMode::Off);
    Serial.println(F("OK"));
    return;
  }

  if (strcmp(command, "ON") == 0) {
    setMode(RenderMode::Solid);
    Serial.println(F("OK"));
    return;
  }

  char* cursor = nullptr;
  int a = 0;
  int b = 0;
  int c = 0;
  int d = 0;

  if (strcmp(command, "BRIGHT") == 0) {
    if (!readIntToken(cursor, a)) {
      Serial.println(F("ERR expected: BRIGHT <0-255>"));
      return;
    }
    brightness = clampByte(a);
    showStrip();
    Serial.println(F("OK"));
    return;
  }

  if (strcmp(command, "FILL") == 0) {
    if (!readIntToken(cursor, a) || !readIntToken(cursor, b) || !readIntToken(cursor, c)) {
      Serial.println(F("ERR expected: FILL <r> <g> <b>"));
      return;
    }
    solidR = clampByte(a);
    solidG = clampByte(b);
    solidB = clampByte(c);
    setMode(RenderMode::Solid);
    Serial.println(F("OK"));
    return;
  }

  if (strcmp(command, "PIXEL") == 0) {
    if (!readIntToken(cursor, a) || !readIntToken(cursor, b) || !readIntToken(cursor, c) || !readIntToken(cursor, d)) {
      Serial.println(F("ERR expected: PIXEL <index> <r> <g> <b>"));
      return;
    }
    if (a < 0 || a >= kLedCount) {
      Serial.println(F("ERR pixel index out of range"));
      return;
    }
    currentMode = RenderMode::Manual;
    strip.clear();
    strip.setPixelColor(static_cast<uint16_t>(a), strip.Color(clampByte(b), clampByte(c), clampByte(d)));
    showStrip();
    Serial.println(F("OK"));
    return;
  }

  if (strcmp(command, "BLINK") == 0) {
    if (!readIntToken(cursor, a) || !readIntToken(cursor, b) || !readIntToken(cursor, c) || !readIntToken(cursor, d)) {
      Serial.println(F("ERR expected: BLINK <r> <g> <b> <ms>"));
      return;
    }
    solidR = clampByte(a);
    solidG = clampByte(b);
    solidB = clampByte(c);
    effectDelayMs = clampDelay(d, kDefaultBlinkMs);
    setMode(RenderMode::Blink);
    Serial.println(F("OK"));
    return;
  }

  if (strcmp(command, "CHASE") == 0) {
    if (!readIntToken(cursor, a) || !readIntToken(cursor, b) || !readIntToken(cursor, c) || !readIntToken(cursor, d)) {
      Serial.println(F("ERR expected: CHASE <r> <g> <b> <ms>"));
      return;
    }
    solidR = clampByte(a);
    solidG = clampByte(b);
    solidB = clampByte(c);
    effectDelayMs = clampDelay(d, kDefaultChaseMs);
    setMode(RenderMode::Chase);
    Serial.println(F("OK"));
    return;
  }

  if (strcmp(command, "RAINBOW") == 0) {
    if (readIntToken(cursor, a)) {
      effectDelayMs = clampDelay(a, kDefaultRainbowMs);
    } else {
      effectDelayMs = kDefaultRainbowMs;
    }
    setMode(RenderMode::Rainbow);
    Serial.println(F("OK"));
    return;
  }

  Serial.println(F("ERR unknown command"));
}

void readSerialInput() {
  while (Serial.available() > 0) {
    char ch = static_cast<char>(Serial.read());
    if (ch == '\r') {
      continue;
    }

    if (ch == '\n') {
      inputBuffer[inputLength] = '\0';
      handleLine(inputBuffer);
      inputLength = 0;
      continue;
    }

    if (inputLength < (kInputBufferSize - 1)) {
      inputBuffer[inputLength++] = ch;
    }
  }
}

void updateEffects() {
  const unsigned long now = millis();
  if (currentMode == RenderMode::Solid || currentMode == RenderMode::Off || currentMode == RenderMode::Manual) {
    return;
  }

  if ((now - lastFrameAt) < effectDelayMs) {
    return;
  }

  lastFrameAt = now;

  switch (currentMode) {
    case RenderMode::Blink:
      runBlinkFrame();
      break;
    case RenderMode::Chase:
      runChaseFrame();
      break;
    case RenderMode::Rainbow:
      runRainbowFrame();
      break;
    case RenderMode::Off:
    case RenderMode::Manual:
    case RenderMode::Solid:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  strip.begin();
  clearStrip();
  setMode(RenderMode::Solid);

  Serial.println(F("Nano WS2812 serial control ready"));
  Serial.println(F("Pin: D6"));
  Serial.println(F("Open Serial Monitor at 115200 and send HELP"));
  printStatus();
}

void loop() {
  readSerialInput();
  updateEffects();
}
