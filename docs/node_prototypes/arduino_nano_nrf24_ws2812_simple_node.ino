#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <Adafruit_NeoPixel.h>
#include <string.h>

constexpr uint8_t kPinRadioCe = 9;
constexpr uint8_t kPinRadioCsn = 10;
constexpr uint8_t kPinLedData = 6;
constexpr uint8_t kLedCount = 8;

RF24 radio(kPinRadioCe, kPinRadioCsn);
Adafruit_NeoPixel strip(kLedCount, kPinLedData, NEO_GRB + NEO_KHZ800);

const byte kRadioAddress[6] = "AURA1";

enum class NodeMode : uint8_t {
  Idle = 0,
  Find = 1,
  Ok = 2,
  Error = 3,
  Off = 4,
};

NodeMode nodeMode = NodeMode::Idle;
unsigned long lastAnimAt = 0;
bool blinkState = false;

void fillAll(uint32_t color) {
  for (uint8_t i = 0; i < kLedCount; ++i) {
    strip.setPixelColor(i, color);
  }
  strip.show();
}

void renderIdle() {
  fillAll(strip.Color(0, 0, 18));
}

void renderOk() {
  fillAll(strip.Color(0, 40, 0));
}

void renderError() {
  fillAll(strip.Color(45, 0, 0));
}

void renderOff() {
  fillAll(0);
}

void renderFindFrame() {
  blinkState = !blinkState;
  if (blinkState) {
    fillAll(strip.Color(50, 14, 0));
  } else {
    fillAll(0);
  }
}

void applyMode(NodeMode mode) {
  nodeMode = mode;
  switch (nodeMode) {
    case NodeMode::Idle:
      renderIdle();
      break;
    case NodeMode::Find:
      renderFindFrame();
      break;
    case NodeMode::Ok:
      renderOk();
      break;
    case NodeMode::Error:
      renderError();
      break;
    case NodeMode::Off:
      renderOff();
      break;
  }
}

void handleCommand(const char* command) {
  if (strcmp(command, "FIND") == 0) {
    applyMode(NodeMode::Find);
  } else if (strcmp(command, "STOP") == 0) {
    applyMode(NodeMode::Off);
  } else if (strcmp(command, "IDLE") == 0) {
    applyMode(NodeMode::Idle);
  } else if (strcmp(command, "OK") == 0) {
    applyMode(NodeMode::Ok);
  } else if (strcmp(command, "ERR") == 0) {
    applyMode(NodeMode::Error);
  }
}

void pollRadio() {
  if (!radio.available()) {
    return;
  }

  char payload[32] = {};
  radio.read(&payload, sizeof(payload));
  payload[31] = '\0';

  Serial.print(F("RX: "));
  Serial.println(payload);

  handleCommand(payload);
}

void updateAnimation() {
  const unsigned long now = millis();
  if (nodeMode != NodeMode::Find) {
    return;
  }

  if ((now - lastAnimAt) >= 220) {
    lastAnimAt = now;
    renderFindFrame();
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  strip.begin();
  strip.show();
  renderOff();

  if (!radio.begin()) {
    Serial.println(F("nRF24 not responding"));
    applyMode(NodeMode::Error);
    return;
  }

  radio.setPALevel(RF24_PA_LOW);
  radio.setDataRate(RF24_1MBPS);
  radio.setChannel(108);
  radio.setAutoAck(false);
  radio.openReadingPipe(1, kRadioAddress);
  radio.startListening();

  Serial.println(F("Nano node ready"));
  Serial.println(F("Listening on pipe AURA1"));
  applyMode(NodeMode::Idle);
}

void loop() {
  pollRadio();
  updateAnimation();
}
