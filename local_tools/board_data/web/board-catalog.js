export const BOARD_PROFILES = {
  auto: {
    id: "auto",
    label: "Auto detect",
    category: "system",
    summary: "Use the tool's best family guess from the detected board data.",
  },
  esp32_generic_dev: {
    id: "esp32_generic_dev",
    label: "ESP32 Dev Board",
    category: "mcu",
    chip: "ESP32",
    mcu: "Dual-core Xtensa LX6 up to 240 MHz",
    wireless: "2.4 GHz Wi-Fi 802.11 b/g/n + Bluetooth 4.2 BR/EDR + BLE",
    memory: "520 KB SRAM + 16 KB RTC SRAM",
    storage: "Commonly 4 MB SPI flash on dev boards; varies by module",
    io: "Up to 34 GPIOs on the ESP32 family, board exposure varies",
    power: "3.0 to 3.6 V chip domain; most dev boards use USB plus onboard regulation",
    confidence: "Likely profile when the detected board looks like a common ESP32 dev board.",
    notes: "Exact flash, PSRAM, and exposed GPIOs depend on the actual module and board design.",
    sources: [
      {
        label: "Espressif ESP32 Datasheet",
        url: "https://documentation.espressif.com/esp32_datasheet_en.html",
      },
      {
        label: "ESP32-WROOM-32 Datasheet",
        url: "https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf",
      },
    ],
  },
  arduino_uno_rev3: {
    id: "arduino_uno_rev3",
    label: "Arduino Uno Rev3",
    category: "mcu",
    chip: "ATmega328P",
    mcu: "8-bit AVR at 16 MHz",
    wireless: "No built-in Wi-Fi or Bluetooth",
    memory: "2 KB SRAM + 1 KB EEPROM",
    storage: "32 KB flash, 0.5 KB used by bootloader",
    io: "14 digital I/O, 6 PWM, 6 analog inputs",
    power: "5 V operating voltage, 7 to 12 V recommended input",
    confidence: "Strong profile match when Windows identifies the board as Arduino Uno.",
    notes: "This profile is specific to the Uno Rev3 hardware family.",
    sources: [
      {
        label: "Arduino Uno Rev3 Tech Specs",
        url: "https://store.arduino.cc/products/arduino-uno-rev3",
      },
    ],
  },
  generic_ch340_serial_board: {
    id: "generic_ch340_serial_board",
    label: "Generic CH340 Serial Board",
    category: "bridge",
    chip: "Unknown MCU",
    mcu: "Not identifiable from the CH340 bridge alone",
    wireless: "Unknown until the actual board family is assigned",
    memory: "Unknown",
    storage: "Unknown",
    io: "Unknown",
    power: "Depends on the real board behind the CH340 USB bridge",
    confidence: "Safe fallback when the USB bridge is known but the actual MCU board is not.",
    notes: "CH340 only identifies the USB-to-serial bridge. Use the profile selector if you know the real board.",
    sources: [],
  },
  bluetooth_serial_link: {
    id: "bluetooth_serial_link",
    label: "Bluetooth Serial Link",
    category: "virtual",
    chip: "Virtual serial port",
    mcu: "No direct board profile",
    wireless: "Bluetooth serial profile only",
    memory: "Not applicable",
    storage: "Not applicable",
    io: "Not applicable",
    power: "Not applicable",
    confidence: "Virtual Windows port, not a direct USB dev board.",
    notes: "This entry represents a serial link endpoint rather than a hardware dev board.",
    sources: [],
  },
  unknown_usb_serial_board: {
    id: "unknown_usb_serial_board",
    label: "Unknown USB Serial Board",
    category: "unknown",
    chip: "Unknown MCU",
    mcu: "Not enough data to identify the board family",
    wireless: "Unknown",
    memory: "Unknown",
    storage: "Unknown",
    io: "Unknown",
    power: "Unknown",
    confidence: "Fallback profile when only generic USB serial metadata is visible.",
    notes: "Add a board image and set a manual profile if you know which board this really is.",
    sources: [],
  },
};

export const PROFILE_OPTIONS = Object.values(BOARD_PROFILES)
  .filter((profile) => profile.id !== "auto")
  .map((profile) => ({
    id: profile.id,
    label: profile.label,
  }));

export function inferProfileId(board) {
  const text = [
    board.LikelyBoard,
    board.FriendlyName,
    board.Description,
    board.BridgeChip,
    board.ConnectionType,
    board.VendorId,
    board.ProductId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("bluetooth")) {
    return "bluetooth_serial_link";
  }

  if (text.includes("arduino uno") || (board.VendorId === "2341" && board.ProductId === "0043")) {
    return "arduino_uno_rev3";
  }

  if (
    text.includes("esp32") ||
    text.includes("ch9102") ||
    text.includes("cp210x") ||
    board.VendorId === "303A"
  ) {
    return "esp32_generic_dev";
  }

  if (text.includes("ch340")) {
    return "generic_ch340_serial_board";
  }

  if (board.ConnectionType === "USB") {
    return "unknown_usb_serial_board";
  }

  return "unknown_usb_serial_board";
}

export async function loadProfileOverrides() {
  try {
    const response = await fetch("/api/profile-overrides");
    if (!response.ok) {
      throw new Error("Profile overrides unavailable");
    }

    const payload = await response.json();
    return payload.overrides || {};
  } catch {
    const fallback = await fetch(`/data/board_overrides.json?ts=${Date.now()}`);
    return await fallback.json();
  }
}

export function enrichBoard(board, overrides = {}) {
  const overrideId = overrides[board.BoardKey];
  const inferredId = inferProfileId(board);
  const profileId = overrideId && BOARD_PROFILES[overrideId] ? overrideId : inferredId;
  const profile = BOARD_PROFILES[profileId] || BOARD_PROFILES.unknown_usb_serial_board;

  return {
    ...board,
    ProfileId: profile.id,
    Profile: profile,
    ProfileMode: overrideId ? "manual" : "auto",
  };
}
