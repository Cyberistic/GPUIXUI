# Base UI — behaviour and parts model

- Repository: <https://github.com/mui/base-ui>
- Tag read: `v1.6.0` (read 2026-10-22); toast suite read at `v1.9.0` (2026-10-25)
- Licence: MIT — `Copyright (c) 2019 Material-UI SAS`

## What we use

The behaviour and parts model — compound parts, controlled state and focus
management — as a decomposition reference for the library's own part APIs
(recorded in `packages/tw/PROVENANCE.md` as the reference for the next slice).

The toast suite's **observable model** was read at `v1.9.0` for the 2026-10-25
rebuild: a bounded visible stack, one card that moves through loading/success/
error for a promise, one action that closes its toast, a dismiss control, and a
horizontal swipe whose release decides between dismissal and a spring-back. The
implementation is ours — the stack is GPUix's flow-plus-height (the runtime has
no `transform`), the timers are Effect `Clock`, and the gesture lives in
`packages/components/src/toast/swipe.ts`. No Base UI source is copied or
adapted; the threshold and velocity numbers are this library's, not theirs.

## What we do not use

Reference-only, no code copied. No Base UI source file is copied or adapted,
and no MUI or Base UI logo or trademark is used.
