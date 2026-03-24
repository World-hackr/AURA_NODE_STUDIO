#include <Arduino.h>
#include <SPI.h>

#include "remote_peripheral_config.h"

namespace {

using namespace aura_host::remote_config;

const SPISettings kRadioSpiSettings(4000000, MSBFIRST, SPI_MODE0);

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
constexpr uint8_t kTestPayload[8] = {'P', 'I', 'N', '-', 'T', 'E', 'S', 'T'};

struct TestResult {
  bool spiLooksAlive = false;
  bool writeReadbackPass = false;
  bool ceTriggerPass = false;
  bool txDone = false;
  bool maxRetry = false;
  bool timeout = false;
  uint8_t status = 0x00;
  uint8_t config = 0x00;
  uint8_t setupAw = 0x00;
  uint8_t rfCh = 0x00;
  uint8_t rfSetup = 0x00;
  uint8_t observeTx = 0x00;
};

void csnHigh() {
  digitalWrite(kPinRadioCsn, HIGH);
}

void csnLow() {
  digitalWrite(kPinRadioCsn, LOW);
}

void ceHigh() {
  digitalWrite(kPinRadioCe, HIGH);
}

void ceLow() {
  digitalWrite(kPinRadioCe, LOW);
}

uint8_t transferByte(uint8_t value) {
  return SPI.transfer(value);
}

uint8_t executeSingleByteCommand(uint8_t command) {
  SPI.beginTransaction(kRadioSpiSettings);
  csnLow();
  const uint8_t status = transferByte(command);
  csnHigh();
  SPI.endTransaction();
  return status;
}

uint8_t readRegister(uint8_t reg) {
  SPI.beginTransaction(kRadioSpiSettings);
  csnLow();
  transferByte(kCmdReadRegister | (reg & 0x1F));
  const uint8_t value = transferByte(0xFF);
  csnHigh();
  SPI.endTransaction();
  return value;
}

void readRegisterBuffer(uint8_t reg, uint8_t* buffer, size_t length) {
  SPI.beginTransaction(kRadioSpiSettings);
  csnLow();
  transferByte(kCmdReadRegister | (reg & 0x1F));
  for (size_t index = 0; index < length; ++index) {
    buffer[index] = transferByte(0xFF);
  }
  csnHigh();
  SPI.endTransaction();
}

uint8_t writeRegister(uint8_t reg, uint8_t value) {
  SPI.beginTransaction(kRadioSpiSettings);
  csnLow();
  const uint8_t status = transferByte(kCmdWriteRegister | (reg & 0x1F));
  transferByte(value);
  csnHigh();
  SPI.endTransaction();
  return status;
}

void writeRegisterBuffer(uint8_t reg, const uint8_t* data, size_t length) {
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

bool registerValuesLookAlive(uint8_t config, uint8_t setupAw, uint8_t rfSetup, uint8_t status) {
  const bool allZero = (config == 0x00) && (setupAw == 0x00) && (rfSetup == 0x00) && (status == 0x00);
  const bool allOnes = (config == 0xFF) && (setupAw == 0xFF) && (rfSetup == 0xFF) && (status == 0xFF);
  if (allZero || allOnes) {
    return false;
  }

  return setupAw == kSetupAddressWidth5Bytes;
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

TestResult runPinSmokeTest() {
  TestResult result;

  result.status = executeSingleByteCommand(kCmdNop);
  result.config = readRegister(kRegConfig);
  result.setupAw = readRegister(kRegSetupAw);
  result.rfCh = readRegister(kRegRfCh);
  result.rfSetup = readRegister(kRegRfSetup);
  result.spiLooksAlive = registerValuesLookAlive(result.config, result.setupAw, result.rfSetup, result.status);
  result.writeReadbackPass = runWriteReadbackTest();

  configureForTransmitAttempt();
  writePayload(kTestPayload, sizeof(kTestPayload));

  ceHigh();
  delayMicroseconds(20);
  ceLow();

  const unsigned long startedAt = millis();
  while ((millis() - startedAt) < 30) {
    result.status = executeSingleByteCommand(kCmdNop);
    if ((result.status & kMaskTxDs) != 0) {
      result.txDone = true;
      result.ceTriggerPass = true;
      break;
    }

    if ((result.status & kMaskMaxRt) != 0) {
      result.maxRetry = true;
      result.ceTriggerPass = true;
      break;
    }

    delay(1);
  }

  if (!result.ceTriggerPass) {
    result.timeout = true;
  }

  result.observeTx = readRegister(kRegObserveTx);
  clearIrqFlags();
  flushFifos();
  return result;
}

void printHexByte(const char* label, uint8_t value) {
  Serial.print(label);
  Serial.print(F(": 0x"));
  if (value < 0x10) {
    Serial.print('0');
  }
  Serial.println(value, HEX);
}

void printSummary(const TestResult& result) {
  Serial.println();
  Serial.println(F("nRF24 pin smoke test"));
  Serial.println(F("--------------------"));
  Serial.print(F("SPI alive: "));
  Serial.println(result.spiLooksAlive ? F("PASS") : F("FAIL"));
  Serial.print(F("Write/read-back: "));
  Serial.println(result.writeReadbackPass ? F("PASS") : F("FAIL"));
  Serial.print(F("CE trigger: "));
  Serial.println(result.ceTriggerPass ? F("PASS") : F("FAIL"));

  if (result.txDone) {
    Serial.println(F("Transmit result: TX_DS set"));
  } else if (result.maxRetry) {
    Serial.println(F("Transmit result: MAX_RT set"));
  } else if (result.timeout) {
    Serial.println(F("Transmit result: TIMEOUT"));
  }

  printHexByte("STATUS", result.status);
  printHexByte("CONFIG", result.config);
  printHexByte("SETUP_AW", result.setupAw);
  printHexByte("RF_CH", result.rfCh);
  printHexByte("RF_SETUP", result.rfSetup);
  printHexByte("OBSERVE_TX", result.observeTx);

  if (result.spiLooksAlive && result.writeReadbackPass && result.ceTriggerPass) {
    Serial.println(F("Overall: PASS"));
    Serial.println(F("Meaning: SPI pins and CE wiring look correct for a single-radio smoke test."));
  } else if (!result.spiLooksAlive || !result.writeReadbackPass) {
    Serial.println(F("Overall: FAIL"));
    Serial.println(F("Likely issue: VCC, GND, SCK, MOSI, MISO, or CSN wiring."));
  } else {
    Serial.println(F("Overall: PARTIAL"));
    Serial.println(F("Likely issue: CE wiring or unstable radio power."));
  }

  Serial.println();
}

unsigned long lastRunAt = 0;

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(kPinRadioCe, OUTPUT);
  pinMode(kPinRadioCsn, OUTPUT);
  ceLow();
  csnHigh();

  SPI.begin(kSpiSck, kSpiMiso, kSpiMosi, kPinRadioCsn);

  Serial.println();
  Serial.println(F("AURA nRF24 pin smoke test"));
  Serial.print(F("CE pin: "));
  Serial.println(kPinRadioCe);
  Serial.print(F("CSN pin: "));
  Serial.println(kPinRadioCsn);
  Serial.print(F("SCK pin: "));
  Serial.println(kSpiSck);
  Serial.print(F("MISO pin: "));
  Serial.println(kSpiMiso);
  Serial.print(F("MOSI pin: "));
  Serial.println(kSpiMosi);
}

void loop() {
  const unsigned long now = millis();
  if ((lastRunAt == 0) || ((now - lastRunAt) >= 3000)) {
    lastRunAt = now;
    const TestResult result = runPinSmokeTest();
    printSummary(result);
  }
}
