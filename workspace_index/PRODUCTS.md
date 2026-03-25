# Products

## `host_remote/`

Role:
- Main firmware workspace for `AURA Host`

Contains:
- `include/` firmware headers
- `src/` firmware source
- `tests/` standalone hardware smoke tests
- `tools/` host-specific helper scripts
- `README.md` and `START_HERE_UPLOAD.md` for usage

Status:
- Active

## `studio_ui/`

Role:
- Browser-based `AURA Studio`
- Deterministic circuit editor and component authoring environment

Contains:
- `src/` React/Tailwind UI source
- `public/` static assets
- `README.md` for workspace context

Status:
- Active

## `phone_ui/`

Role:
- Future phone-side workspace

Contains:
- `tools/`
- `tests/`
- `README.md`

Status:
- Reserved but light

## Product Surfaces In Plain Terms

- `AURA Host`
  Hardware-first normal-user surface
- `AURA Studio`
  Advanced deterministic authoring surface
- `AURA Phone`
  Future companion surface
