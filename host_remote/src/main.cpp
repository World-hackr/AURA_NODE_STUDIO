#include <Arduino.h>

#include "app_state.h"
#include "input_actions.h"
#include "radio_self_test.h"
#include "tft_ui.h"
#include "ui_screen.h"

AppState appState;
unsigned long lastRenderAt = 0;

static constexpr unsigned long kHeartbeatRenderMs = 0;

void setup() {
  Serial.begin(115200);
  delay(200);

  initializeTftUi();
  initializeRadioSelfTest();
  initializeInputActions();
  initializeAppState(appState);
  renderScreen(appState);
  renderTftUi(appState);
  appState.needsRender = false;
  lastRenderAt = millis();
}

void loop() {
  pollInputActions(appState);

  const unsigned long now = millis();
  if (appState.needsRender || ((kHeartbeatRenderMs > 0) && ((now - lastRenderAt) >= kHeartbeatRenderMs))) {
    renderScreen(appState);
    renderTftUi(appState);
    appState.needsRender = false;
    lastRenderAt = now;
  }
}
