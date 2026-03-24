# UI

This folder holds the actual UI design artifacts for `AURA Node Studio`.

Current files:

- `aura_host_remote_software_layout.drawio`
- `aura_host_remote_screen_boards.drawio`
- `aura_host_remote_display_mockups.drawio`
- `aura_host_remote_display_mockups.km`
- `aura_host_remote_software_layout.km`
- `host_remote_tft_ui_plan_v1.md`
- `host_remote_tft_all_pages_v1.drawio`
- `host_remote_tft_simple_icon_ui_v2.drawio`
- `host_remote_tft_simple_icon_ui_v3.drawio`

Use:

- `aura_host_remote_display_mockups.km` for screen-by-screen remote content and compact display copy.
- `aura_host_remote_software_layout.km` for overall host behavior, flow structure, and system states.
- `host_remote_tft_ui_plan_v1.md` as the current implementation blueprint for the `160x128` TFT screen, including screen layout, icon usage, and explicit arrow-based interaction flow.
- `host_remote_tft_all_pages_v1.drawio` for a full-page visual board of all major TFT screens using exact `160x128` ratio blocks (scaled 2x) and explicit transition arrows.
- `host_remote_tft_simple_icon_ui_v2.drawio` for the simplified feature-phone style UX: icon-first home, minimal text, and only essential operational pages.
- `host_remote_tft_simple_icon_ui_v3.drawio` as the stronger feature-phone direction: blocky icon tiles, full use of the screen, short item codes in lists, and full names shown only in the selected detail strip.
- `.drawio` files for visual board-style layout work after the logic tree is clear.
