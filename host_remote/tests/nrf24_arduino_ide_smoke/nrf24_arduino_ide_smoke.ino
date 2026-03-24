#include <SPI.h>

// Current AURA remote pin plan for the attached nRF24L01.
static const int PIN_NRF_CE = 4;
static const int PIN_NRF_CSN = 16;
static const int PIN_SPI_SCK = 18;
static const int PIN_SPI_MISO = 19;
static const int PIN_SPI_MOSI = 23;

const SPISettings RADIO_SPI(4000000, MSBFIRST, SPI_MODE0);

static const uint8_t CMD_READ_REGISTER = 0x00;
static const uint8_t CMD_WRITE_REGISTER = 0x20;
static const uint8_t CMD_FLUSH_TX = 0xE1;
static const uint8_t CMD_FLUSH_RX = 0xE2;
static const uint8_t CMD_WRITE_TX_PAYLOAD = 0xA0;
static const uint8_t CMD_NOP = 0xFF;

static const uint8_t REG_CONFIG = 0x00;
static const uint8_t REG_EN_AA = 0x01;
static const uint8_t REG_EN_RXADDR = 0x02;
static const uint8_t REG_SETUP_AW = 0x03;
static const uint8_t REG_SETUP_RETR = 0x04;
static const uint8_t REG_RF_CH = 0x05;
static const uint8_t REG_RF_SETUP = 0x06;
static const uint8_t REG_STATUS = 0x07;
static const uint8_t REG_OBSERVE_TX = 0x08;
static const uint8_t REG_RX_ADDR_P0 = 0x0A;
static const uint8_t REG_TX_ADDR = 0x10;

static const uint8_t MASK_RX_DR = 0x40;
static const uint8_t MASK_TX_DS = 0x20;
static const uint8_t MASK_MAX_RT = 0x10;

static const uint8_t CONFIG_POWER_UP_TX = 0x0A;
static const uint8_t SETUP_ADDRESS_WIDTH_5 = 0x03;
static const uint8_t SETUP_RETRIES_SHORT = 0x13;
static const uint8_t RF_CHANNEL = 0x4C;
static const uint8_t RF_SETUP_1MBPS_0DBM = 0x06;

static const uint8_t TEST_ADDRESS[5] = {'A', 'U', 'R', 'A', '1'};
static const uint8_t TEST_PAYLOAD[8] = {'P', 'I', 'N', '-', 'T', 'E', 'S', 'T'};

struct TestResult {
  bool spiLooksAlive;
  bool writeReadbackPass;
  bool ceTriggerPass;
  bool txDone;
  bool maxRetry;
  bool timeout;
  uint8_t status;
  uint8_t config;
  uint8_t setupAw;
  uint8_t rfCh;
  uint8_t rfSetup;
  uint8_t observeTx;
};

void csnHigh() {
  digitalWrite(PIN_NRF_CSN, HIGH);
}

void csnLow() {
  digitalWrite(PIN_NRF_CSN, LOW);
}

void ceHigh() {
  digitalWrite(PIN_NRF_CE, HIGH);
}

void ceLow() {
  digitalWrite(PIN_NRF_CE, LOW);
}

uint8_t transferByte(uint8_t value) {
  return SPI.transfer(value);
}

uint8_t executeSingleByteCommand(uint8_t command) {
  SPI.beginTransaction(RADIO_SPI);
  csnLow();
  uint8_t status = transferByte(command);
  csnHigh();
  SPI.endTransaction();
  return status;
}

uint8_t readRegister(uint8_t reg) {
  SPI.beginTransaction(RADIO_SPI);
  csnLow();
  transferByte(CMD_READ_REGISTER | (reg & 0x1F));
  uint8_t value = transferByte(0xFF);
  csnHigh();
  SPI.endTransaction();
  return value;
}

uint8_t writeRegister(uint8_t reg, uint8_t value) {
  SPI.beginTransaction(RADIO_SPI);
  csnLow();
  uint8_t status = transferByte(CMD_WRITE_REGISTER | (reg & 0x1F));
  transferByte(value);
  csnHigh();
  SPI.endTransaction();
  return status;
}

void writeRegisterBuffer(uint8_t reg, const uint8_t* data, size_t length) {
  SPI.beginTransaction(RADIO_SPI);
  csnLow();
  transferByte(CMD_WRITE_REGISTER | (reg & 0x1F));
  for (size_t i = 0; i < length; ++i) {
    transferByte(data[i]);
  }
  csnHigh();
  SPI.endTransaction();
}

void writePayload(const uint8_t* data, size_t length) {
  SPI.beginTransaction(RADIO_SPI);
  csnLow();
  transferByte(CMD_WRITE_TX_PAYLOAD);
  for (size_t i = 0; i < length; ++i) {
    transferByte(data[i]);
  }
  csnHigh();
  SPI.endTransaction();
}

void clearIrqFlags() {
  writeRegister(REG_STATUS, MASK_RX_DR | MASK_TX_DS | MASK_MAX_RT);
}

void flushFifos() {
  executeSingleByteCommand(CMD_FLUSH_TX);
  executeSingleByteCommand(CMD_FLUSH_RX);
}

bool registerValuesLookAlive(uint8_t config, uint8_t setupAw, uint8_t rfSetup, uint8_t status) {
  bool allZero = (config == 0x00) && (setupAw == 0x00) && (rfSetup == 0x00) && (status == 0x00);
  bool allOnes = (config == 0xFF) && (setupAw == 0xFF) && (rfSetup == 0xFF) && (status == 0xFF);

  if (allZero || allOnes) {
    return false;
  }

  return setupAw == SETUP_ADDRESS_WIDTH_5;
}

bool runWriteReadbackTest() {
  uint8_t original = readRegister(REG_RF_CH);
  uint8_t testValue = (original == 0x2A) ? 0x4C : 0x2A;
  writeRegister(REG_RF_CH, testValue);
  uint8_t readBack = readRegister(REG_RF_CH);
  writeRegister(REG_RF_CH, original);
  return readBack == testValue;
}

void configureForTransmitAttempt() {
  ceLow();
  flushFifos();
  clearIrqFlags();

  writeRegister(REG_CONFIG, CONFIG_POWER_UP_TX);
  writeRegister(REG_EN_AA, 0x01);
  writeRegister(REG_EN_RXADDR, 0x01);
  writeRegister(REG_SETUP_AW, SETUP_ADDRESS_WIDTH_5);
  writeRegister(REG_SETUP_RETR, SETUP_RETRIES_SHORT);
  writeRegister(REG_RF_CH, RF_CHANNEL);
  writeRegister(REG_RF_SETUP, RF_SETUP_1MBPS_0DBM);
  writeRegisterBuffer(REG_TX_ADDR, TEST_ADDRESS, sizeof(TEST_ADDRESS));
  writeRegisterBuffer(REG_RX_ADDR_P0, TEST_ADDRESS, sizeof(TEST_ADDRESS));

  delay(5);
}

TestResult runPinSmokeTest() {
  TestResult result;
  result.spiLooksAlive = false;
  result.writeReadbackPass = false;
  result.ceTriggerPass = false;
  result.txDone = false;
  result.maxRetry = false;
  result.timeout = false;
  result.status = 0x00;
  result.config = 0x00;
  result.setupAw = 0x00;
  result.rfCh = 0x00;
  result.rfSetup = 0x00;
  result.observeTx = 0x00;

  result.status = executeSingleByteCommand(CMD_NOP);
  result.config = readRegister(REG_CONFIG);
  result.setupAw = readRegister(REG_SETUP_AW);
  result.rfCh = readRegister(REG_RF_CH);
  result.rfSetup = readRegister(REG_RF_SETUP);

  result.spiLooksAlive = registerValuesLookAlive(result.config, result.setupAw, result.rfSetup, result.status);
  result.writeReadbackPass = runWriteReadbackTest();

  configureForTransmitAttempt();
  writePayload(TEST_PAYLOAD, sizeof(TEST_PAYLOAD));

  ceHigh();
  delayMicroseconds(20);
  ceLow();

  unsigned long startedAt = millis();
  while ((millis() - startedAt) < 30) {
    result.status = executeSingleByteCommand(CMD_NOP);

    if ((result.status & MASK_TX_DS) != 0) {
      result.txDone = true;
      result.ceTriggerPass = true;
      break;
    }

    if ((result.status & MASK_MAX_RT) != 0) {
      result.maxRetry = true;
      result.ceTriggerPass = true;
      break;
    }

    delay(1);
  }

  if (!result.ceTriggerPass) {
    result.timeout = true;
  }

  result.observeTx = readRegister(REG_OBSERVE_TX);
  clearIrqFlags();
  flushFifos();
  return result;
}

void printHexByte(const char* label, uint8_t value) {
  Serial.print(label);
  Serial.print(": 0x");
  if (value < 0x10) {
    Serial.print('0');
  }
  Serial.println(value, HEX);
}

void printSummary(const TestResult& result) {
  Serial.println();
  Serial.println("nRF24 Arduino IDE smoke test");
  Serial.println("---------------------------");
  Serial.print("SPI alive: ");
  Serial.println(result.spiLooksAlive ? "PASS" : "FAIL");
  Serial.print("Write/read-back: ");
  Serial.println(result.writeReadbackPass ? "PASS" : "FAIL");
  Serial.print("CE trigger: ");
  Serial.println(result.ceTriggerPass ? "PASS" : "FAIL");

  if (result.txDone) {
    Serial.println("Transmit result: TX_DS");
  } else if (result.maxRetry) {
    Serial.println("Transmit result: MAX_RT");
  } else if (result.timeout) {
    Serial.println("Transmit result: TIMEOUT");
  }

  printHexByte("STATUS", result.status);
  printHexByte("CONFIG", result.config);
  printHexByte("SETUP_AW", result.setupAw);
  printHexByte("RF_CH", result.rfCh);
  printHexByte("RF_SETUP", result.rfSetup);
  printHexByte("OBSERVE_TX", result.observeTx);

  if (result.spiLooksAlive && result.writeReadbackPass && result.ceTriggerPass) {
    Serial.println("Overall: PASS");
    Serial.println("Meaning: SPI pins and CE wiring look correct.");
  } else if (!result.spiLooksAlive || !result.writeReadbackPass) {
    Serial.println("Overall: FAIL");
    Serial.println("Likely issue: VCC, GND, SCK, MOSI, MISO, or CSN.");
  } else {
    Serial.println("Overall: PARTIAL");
    Serial.println("Likely issue: CE wiring or unstable radio power.");
  }

  Serial.println();
}

unsigned long lastRunAt = 0;

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_NRF_CE, OUTPUT);
  pinMode(PIN_NRF_CSN, OUTPUT);
  ceLow();
  csnHigh();

  SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, -1);

  Serial.println();
  Serial.println("AURA nRF24 Arduino IDE smoke test");
  Serial.println("Pins:");
  Serial.print("CE   = ");
  Serial.println(PIN_NRF_CE);
  Serial.print("CSN  = ");
  Serial.println(PIN_NRF_CSN);
  Serial.print("SCK  = ");
  Serial.println(PIN_SPI_SCK);
  Serial.print("MISO = ");
  Serial.println(PIN_SPI_MISO);
  Serial.print("MOSI = ");
  Serial.println(PIN_SPI_MOSI);
}

void loop() {
  unsigned long now = millis();
  if (lastRunAt == 0 || (now - lastRunAt) >= 3000) {
    lastRunAt = now;
    TestResult result = runPinSmokeTest();
    printSummary(result);
  }
}
