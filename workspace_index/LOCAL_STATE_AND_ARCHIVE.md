# Local State And Archive

## Archive And Reference

### `AURA _report/`

Role:
- Papers, reports, presentation assets, and formal writeups

Rule:
- Keep as archive/reference
- Do not treat it as active product source

## Generated Or Machine-Local State

These exist because of builds, editor tooling, or local development:

- `host_remote/.pio/`
- `host_remote/.qodo/`
- `host_remote/.vscode/`
- `studio_ui/node_modules/`
- `studio_ui/dist/`
- `.qodo/`
- `.vscode/`

## Why This Matters

Without this distinction, the repo looks busier than it really is.

The active product source is mainly:

- `host_remote/`
- `studio_ui/`
- `shared/`
- `docs/`
- `local_tools/`
