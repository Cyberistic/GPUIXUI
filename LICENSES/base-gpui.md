# `base-gpui` — design reference

- Repository: <https://github.com/LukeTandjung/base-gpui>
- Commit read: `64b2233` (2026-08-17)
- Licence: MIT — `Copyright (c) 2026 Luke Tandjung`
- What we read: `docs/component-architecture.md` and the 37 guides under
  `docs/components/` (`accordion.md` … `tooltip.md`)

## What we use

The **compound-part API contract** in `docs/component-api.md` and the per-part
names in its parts tables. Those are design decisions translated into React;
the components' implementations are our own over GPUix 0.10.0 host elements.

## What we do not use

No Rust source is copied or transcribed, no crate is vendored, and no `base-gpui`
logo or trademark is used. The repository ships no `NOTICE` file; the MIT
copyright line above is the required attribution.

The contract is recorded as ADR `0004` and plan `200`.
