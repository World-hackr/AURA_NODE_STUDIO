#include "radio_self_test.h"

#include <Arduino.h>
#include <SPI.h>

#include "remote_peripheral_config.h"
#include "tft_display_config.h"

namespace {

using namespace aura_host::display_config;
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

bool radioInitialized = false;

void deselectTft() {
  if (kPinTftCs >= 0) {
    digitalWrite(kPinTftCs, HIGH);
  }
}

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
  deselectTft();
  SPI.beginTransaction(kRadioSpiSettings);
  csnLow();
  const uint8_t status = transferByte(command);
  csnHigh();
  SPI.endTransaction();
  return status;
}

uint8_t readRegister(uint8_t reg) {
  deselectTft();
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

}  // namespace

void initializeRadioSelfTest() {
  pinMode(kPinRadioCe, OUTPUT);
  pinMode(kPinRadioCsn, OUTPUT);
  ceLow();
  csnHigh();
  deselectTft();
  SPI.begin(
      aura_host::remote_config::kSpiSck,
      aura_host::remote_config::kSpiMiso,
      aura_host::remote_config::kSpiMosi,
      -1);
  radioInitialized = true;
}

RadioSelfTestState runRadioSelfTest() {
  if (!radioInitialized) {
    initializeRadioSelfTest();
  }

  RadioSelfTestState result{
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0,
  };

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
