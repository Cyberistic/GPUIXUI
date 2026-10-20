# 0006 — Components adopt shadcn's fixed metrics

- Status: accepted
- Date: 2026-10-21
- Deciders: the `@gpuixui/tw` components wave
- Related: ADR 0004 (compound-part API), the `tw-primitives` migration in `TODO.md`

## Context

`@gpuixui/tw` compiles Tailwind class strings to GPUix `StyleDesc` through a
registry. The primitives chose a **density-driven** registry: their recipes name
scale steps (`h-md`, `gap-sm`, `type-label`) and the registry resolves them
against the active theme's `density`, `spacing` and `typography` scales.

The Tier 2 components had two options: reuse that density registry, or compile
against the built-in **default** registry, whose table holds shadcn's fixed
metrics (`h-9` = 36, `px-4` = 16, `rounded-xl` = 12, `text-sm` = 14/20). The
owner asked for "the shadcn defaults".

## Decision

Components compile their recipes through `@gpuixui/tw`'s **default registry**
(shadcn's fixed metrics); primitives keep the density-driven registry. A recipe
string is the single source of truth for a component's resting appearance, the
caller's `className` is joined after it via `cn` (so it wins conflicts), and the
caller's `style` is merged last (so it wins outright).

One class of metric deliberately keeps density: **control geometry** — a list
row's height (`theme.density.rowHeight`) and a control's height/side
(`controlHeight`, and `controlPaddingX` where a control exposes it) — because a
control must stay aligned with the density-driven controls beside it. This
covers the stepper marker's side, the accordion trigger's height, the field /
search / mention / tag input heights, the inline-edit display and input heights,
and the hotkey-recorder's min-height. The off-grid `label` type role (13/18) has
no Tailwind size, so it adopts `text-sm font-medium` (14/20) — the nearest fixed
metric.

## Consequences

- Components read fixed pixels, so a density override no longer resizes them;
  a consumer who wants density still reaches it through `className`/`style`.
- A recipe diff against shadcn stays meaningful, exactly as the primitives'
  recipes diff against their resolvers.
- The control-geometry density exceptions are pinned in
  `packages/components/README.md` (§Styling) so a future agent does not "fix"
  them back onto the fixed scale.
