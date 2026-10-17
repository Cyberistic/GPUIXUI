# 202 — Reconcile `adabraka-ui`'s `ThemeTokens` with `@gpuixui/tokens`

| Field | Value |
| ----- | ----- |
| Phase | B (foundation) — the token contract, after the `tokens-theme` workstream's package landed |
| Owner | **tokens-theme workstream** — it owns `packages/tokens`. Do not execute this in another tree without handing it over. |
| Depends on | plans `010–014` (`@gpuixui/tokens` landed on `agent/tokens-theme`), `020-gpuix-runtime-capability.md` §1.2 (what GPUix can paint) |
| Status | done for the tokens scope; `LICENSES/adabraka-ui.md` is open with the licensing owner (recorded in `TODO.md`) |
| Source | `references/adabraka-ui/src/theme/tokens.rs` and `src/theme/mod.rs` (MIT, `Copyright (c) 2025 Adabraka Team`), commit `e158684` |

This plan is self-contained. It is a **reconciliation**, not a new token system:
it adds only what `@gpuixui/tokens` does not already have, and it refuses the
parts that would be a lie on GPUix.

---

## 1. What already exists — do not duplicate

`@gpuixui/tokens` (branch `agent/tokens-theme`) already ships, and this plan must
**not** re-add:

- `ThemeColors` — the shadcn-compatible semantic roles (`background`,
  `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`,
  `destructive`, `border`, `input`, `ring`) **plus** status tones (`success`,
  `warning`, `info` and their `*Soft` variants), interaction states (`hover`,
  `active`, `selected`, `disabled`, `overlay`, `selection`) and `skeleton`,
  `scrollbar`, `shadow`.
- `Typography` — `sans`, `mono`, and the text roles `display`, `h1–h3`, `body`,
  `bodyStrong`, `label`, `caption`, `code`, `codeBlock`.
- `spacing` (`xs`…`xl`), `radius` (`none`, `sm`, `md`, `lg`, `xl`, `full`),
  `borderWidth` (`thin`, `strong`), `iconSize` (`xs`…`xl`), `density`
  (`compact` | `comfortable` | `spacious`, with `controlHeight`,
  `controlPaddingX`, `rowHeight`), `elevation` (`sm`, `md`, `lg`, `overlay`).
- `lightTheme` / `darkTheme` / `highContrastLightTheme` / `highContrastDarkTheme`,
  `getTheme`, `extendTheme`, `createTheme`, `alpha`.

`adabraka`'s field list maps onto these almost one-to-one: its
`radius_{sm,md,lg,xl}`, `shadow_{sm,md,lg}`, `font_family`/`font_mono` and its
semantic colours are **already covered** — do not add parallel names. Its
`spacing_{1,2,…,16}` is a 10-step numeric scale where we have a 5-step `xs…xl`
scale; keep ours, and only widen `Spacing` if a landed component needs a step it
lacks (never add a second scale).

## 2. What is genuinely new — the only additions

### 2.1 `focusRing` — ring geometry (new)

`adabraka` has `ring_offset`; we have the `ring` **colour** but no geometry, and
GPUix paints focus through `outlineWidth` / `outlineColor` / `outlineOffset`
(verified, plan `020` §1.2). Add:

```ts
export interface FocusRing {
  readonly width: number;   // outlineWidth
  readonly offset: number;  // outlineOffset
}
export const focusRing: FocusRing = { width: 2, offset: 2 };
```

Thread it through `Theme`, `ThemeOverrides` and `extendTheme`. Every focusable
component reads `theme.focusRing` and the `ring` colour — no literal outline.

### 2.2 `motion` — durations (new)

`adabraka` has `transition_{fast,base,slow}` and `duration_{fastest…slowest}`. We
have none. GPUix's `motion` transition takes **seconds** (verified), so the token
must be seconds, not milliseconds:

```ts
export interface Motion {
  readonly fast: number;   // 0.12
  readonly base: number;   // 0.2
  readonly slow: number;   // 0.3
}
export const motion: Motion = { fast: 0.12, base: 0.2, slow: 0.3 };
```

`adabraka`'s seven durations are more than any component here needs; three is the
honest minimum. Do not add a duration a component does not use.

### 2.3 `layers` — a documented model, **not** a numeric `z` scale

`adabraka` has `z_{dropdown,sticky,modal,popover,tooltip}`. **Do not add a
numeric z scale.** GPUix has no `z-index`: "tree order is paint order"
(verified). A `z` token would be unenforceable. Instead add a short
`docs/tokens.md` section — `## Layering` — recording the real model:

- paint order **is** tree order; there is no numeric stacking;
- overlays mount through `createPortal` and position with `FloatingLayer` +
  `<anchored>` (occludes by default — verified);
- exit animations use `AnimatePresence`;
- the documented order (dropdown → popover → tooltip → modal → toast) is a
  **mounting rule**, not a token.

### 2.4 Deliberate omissions (record them, do not add them)

- **Breakpoints** — `adabraka`'s own gap list asks for them. Responsiveness here
  is app-level (`useWindowSize`, `useWindowInsets` — verified). Record as a
  deliberate omission in `docs/tokens.md`.
- **`shadow_xs` / `shadow_xl`** — our four-level `elevation` covers the shipped
  surfaces; adding unused levels is dead data.
- **A second spacing scale, a second radius scale, a parallel colour name for any
  role** — covered above.

## 3. Files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `packages/tokens/src/focus.ts` | **create** — `FocusRing`, `focusRing` |
| `packages/tokens/src/motion.ts` | **create** — `Motion`, `motion` |
| `packages/tokens/src/theme.ts` | add `focusRing` + `motion` to `Theme`, `ThemeOverrides`, `extendTheme`, `lightTheme`, `darkTheme`, the two high-contrast themes |
| `packages/tokens/src/index.ts` | re-export the new modules |
| `packages/tokens/src/theme.test.ts` | extend: an override of `focusRing.width` / `motion.base` is applied and the base is not mutated |
| `packages/tokens/README.md` | document the two new groups and the layering rule |
| `docs/tokens.md` | **create** (the Phase B doc already planned) — the public token catalogue, `## Layering`, and the deliberate omissions |
| `docs/README.md` | `tokens.md` row (already planned for Phase B) |
| `LICENSES/adabraka-ui.md` | MIT + `Copyright (c) 2025 Adabraka Team`; **token *structure* referenced, no asset or source copied** |

**Do not touch** `packages/tokens/src/color.ts`, `typography.ts`, `scale.ts` or
`elevation.ts` beyond re-exporting — they are landed and tested.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test      # expected: exit 0 (existing + new tests)
nub run --filter @gpuixui/tokens check-types  # expected: exit 0
grep -rn "zIndex\|z-index\|zIndexToken" packages/tokens/src   # expected: no matches
grep -c "focusRing\|motion" packages/tokens/src/theme.ts      # expected: >= 4
nub run check                               # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- `packages/tokens` does not yet contain the fields §1 lists (the branch moved —
  re-read `src/color.ts`, `src/scale.ts`, `src/theme.ts` before adding anything);
- a component needs a `z-index` to work — that is a GPUix capability gap, not a
  token gap; record it in `COMPONENTS.md` and `docs/gpuix-capabilities.md`;
- you are about to copy anything from `references/adabraka-ui/assets/` — **never
  copy its assets**: 3,274 icon files (1,637 SVG + 1,637 JSON, Lucide geometry),
  `Inter-*.ttf` / `JetBrainsMono-*.ttf`, and `assets/audio/sample.mp3` ship with
  **no licence file**; Lucide is ISC and Inter/JetBrains Mono are OFL-1.1, both
  requiring the licence text to travel with the files;
- adding `motion` or `focusRing` would duplicate an existing field under a
  different name.

## 6. Test plan

- `theme.test.ts`: `extendTheme(darkTheme, { motion: { base: 0.5 } })` returns
  `motion.base === 0.5`, keeps `motion.fast` from the base, and leaves
  `darkTheme.motion.base` unchanged (immutability).
- `theme.test.ts`: the same for `focusRing.width`.
- **Able to fail:** deleting the `motion` merge from `extendTheme` must fail the
  first assertion. Prove both directions with `scripts/verify-two-directions.sh`.
- A `grep`-based check that no `zIndex` token exists — asserted in the test file
  as a read of `theme.ts`, so a future agent adding one fails the suite.

## 7. Acceptance criteria

- `focusRing` and `motion` exist, are exported, are overridable and are tested.
- `docs/tokens.md` documents every public token, the layering model and the
  deliberate omissions (breakpoints, extra shadows, `z`).
- No duplicate group, no `z` scale, no asset copied.
- `LICENSES/adabraka-ui.md` records the MIT line and "structure referenced, no
  assets copied".

## Execution note — 2026-10-17, tokens-theme workstream

§5's STOP condition ("adding `motion` or `focusRing` would duplicate an existing
field under a different name") applies, so this plan is executed as follows
rather than verbatim:

| Section | Outcome |
| ------- | ------- |
| §2.1 `focusRing` geometry | **Refused on evidence.** Published `@gpuix/native` 0.10.0 has no `outlineWidth`/`outlineColor`/`outlineOffset` and no `focusVisible`; those are unreleased `main`. The ring is a zero-offset, zero-blur `boxShadow` with `spreadRadius = borderWidth.strong`, shipped as `focusRing(theme)` by plan 017. A `ring_offset` gap is not expressible with one shadow, so it is not shipped. |
| §2.2 `motion` | **Delivered, differently.** Plan 019 stores milliseconds in `theme.motion` (`none`, `step`, `fast`, `normal`, `slow`, `pulse`) and converts through `motionTransition(theme, level, phase)`. Milliseconds are what `setInterval` takes (the three `primitives` call sites holding `120`/`700` as literals) and the helper produces the runtime's seconds; a seconds-only token would have been wrong for the indicators. Easings are `standard`/`enter`/`exit`/`linear`. |
| §2.3 `layering` | **Delivered by plan 050**, with one correction: 0.10.0 has no `createPortal` (unreleased changeset), so the section documents tree order plus the no-portal limitation rather than a portal. |
| §2.4 omissions | **Delivered by plan 050** — breakpoints, `shadowXs`/`shadowXl`, a second spacing/radius scale and a `z` scale are recorded as deliberate omissions. |
| §3 `focus.ts` | Not created; `focusRing` lives in `styles.ts` beside `textStyle`/`statusTone`, where it reads `theme.borderWidth` and `theme.colors`. |
| §3 `LICENSES/adabraka-ui.md` | Not this workstream's path; recorded as a TODO item for the licensing owner. |
