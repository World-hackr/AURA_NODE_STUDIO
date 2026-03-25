# Workspace Index

This folder is the directory map for `AURA Node Studio`.

Use it when you want to know:

- what is an active product area
- what is only a helper or utility
- what is shared system data
- what is archive/reference material
- what is only local machine output

## Index Files

- `PRODUCTS.md`
  Main product surfaces and their current status.
- `TOOLS.md`
  Reusable machine-side tools, diagnostics, and helper scripts.
- `DOCS_AND_SHARED.md`
  Planning docs, shared contracts, and component-definition assets.
- `LOCAL_STATE_AND_ARCHIVE.md`
  Build output, editor state, and archive/reference areas that should not be confused with active source.

## Fast Rule

If you are trying to build or change the product, start with:

- `host_remote/`
- `studio_ui/`
- `shared/`
- `docs/`

If you are trying to understand utilities or one-off support tools, check:

- `local_tools/`

If you are looking for papers, presentations, or formal writeups, check:

- `AURA _report/`
