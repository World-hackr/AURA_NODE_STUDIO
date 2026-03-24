# AURA Phone

This folder will hold the phone-side UI later.

It is intentionally light for now because the first restart slice is the host remote firmware UI.

Planned organization:

- `tests/` - phone-side isolated checks and future UI/dev harnesses
- `tools/` - phone-side helper scripts if the phone workspace later needs them

Keep phone-specific files here instead of mixing them into the host remote firmware area.

The active implementation work is still in `host_remote/`.
