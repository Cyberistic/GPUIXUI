# 539 — GPUix 0.11.0: terminal support and the landing example

Upgrade the pinned GPUix from 0.10.0 to 0.11.0, adopt the release's terminal
surface (`isTerminal()`, headless Dialog, Tab navigation), and showcase it on the
landing page with a "Run it in your terminal" section.

## Files to change

### 1. Upgrade

- `package.json` — catalog: bump `@gpuix/react` 0.10.0 → 0.11.0, add
  `@gpuix/native` 0.11.0.
- `packages/tw/package.json` — `@gpuix/react` `0.10.0` → `catalog:`.
- `packages/components/package.json` — `@gpuix/react` `0.10.0` → `catalog:`.
- `apps/playground/package.json` — `@gpuix/native` + `@gpuix/react` `0.10.0` →
  `catalog:`.

Commands: `nub install`, then `nub run check` and `nub run test` across packages.

### 2. Terminal awareness

- `packages/primitives/src/…` / `packages/components/src/…` — components that
  reserve macOS traffic-light space must drop it when `isTerminal()` is true.
- `README.md` — "Run in a terminal" section.

### 3. Landing

- `apps/docs/src/components/landing/landing.tsx` — add the terminal section.
- `apps/docs/src/components/landing/` + CSS — terminal window + code + caption.

### 4. Docs / inventory

- `apps/docs/content/docs/installation.mdx` (or theming) — terminal subsection.
- `TODO.md`, `COMPONENTS.md`, plan index — tick and record.

## STOP conditions

- The upgrade cascades beyond a reasonable slice (dozens of unrelated failures).
  Revert the bump, keep the work on a branch, report the blockers.
- `@gpuix/native` 0.11.0 lacks a published darwin-arm64 binding for this box.
- Any gate command fails without a legitimate, documented cause.

## Test plan

- `nub run check` (tests-can-fail + lint + fmt + check-types) green.
- Full repo test gate green.
- `nub run --filter @gpuixui/docs build` green.
- Screenshots at 1440×900 light/dark and 390.

## Acceptance

- Terminal section live at <https://gpuixui.sudokw.com/> returning 200.
- `isTerminal()` used, pattern documented; landing shows the terminal composition.
