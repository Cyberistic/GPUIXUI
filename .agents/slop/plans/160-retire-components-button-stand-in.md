# 160 — Retire the components package's local Button stand-in

**Owner:** components · **Size:** multi-phase (≈2 sessions) · **Status:** ready, with
two hard prerequisites (R1/R2 below) that are **not** in this workstream.

## Why

`packages/components/src/internal/button.tsx` is a **222-LOC second button
implementation**: its own `role`/`tabIndex`, its own Enter-on-down / Space-on-up
contract, its own variant paint, its own disabled geometry, and its own
`IconButton`. It exists because `@gpuixui/primitives` had no `Button` when Tier 2
started (plan 110 §7). That package now ships `Button` with the same activation
rule (`primitives/src/core/keyboard.ts`), the parts contract
(`StateStyle<ButtonState>`), `loading`, `square` and the `@gpuixui/tw` recipe — and
the components package still does not depend on it at all
(`packages/components/package.json` has no `@gpuixui/primitives`).

Two implementations mean two activation contracts and two paint paths for the
same control. The file's own header says it "stays until the Tier 2 parts are
migrated onto it (plan 110 §7 and `TODO.md` → Interlocks)". `TODO.md` row
"`@gpuixui/primitives` exports in plan 110 §7" is that task.

## Hard prerequisites — do not start Phase 2 until both pass

**R1 — primitives' filled hover/press must be opaque.** The stand-in paints
`filledHover`/`filledPressed` (commit `90f98987`), guarded by
`src/behaviour/button.test.tsx`'s `paints an opaque derived hover and press on a
filled action`. Both are now opaque on the primitive's side: `filled()` in
`packages/primitives/src/core/variants.ts` derives `filledHover`/`filledPressed`,
and `buttonClass` in `packages/primitives/src/recipe/index.ts` asks for
`hover:fill-<action>` / `active:fill-<action>-pressed`.

Check the **Button's** half only. `core/variants.ts` also holds the Toggle's
`accent` on-state, which still lifts its alpha (`hover:bg-accent/90`,
`active: bg-accent/80`) — a different control with its own tracked row
(`COMPONENTS.md` → Action fills, `TODO.md` → Interlocks), not a Button
regression. `packages/tw/src/recipes.ts`'s own `button` recipe still carries
`hover:bg-primary/90`, but `Button` no longer compiles it.

```sh
# expected: matches inside `filled()`, no `backgroundColor: alpha(` in it
grep -n "hover: (theme) => ({ backgroundColor: filledHover" packages/primitives/src/core/variants.ts
# expected: no alpha lift in the Button recipe
grep -n "hover:bg-primary/" packages/primitives/src/recipe/index.ts   # expected: no match
# expected: every action asks for the derived fill
grep -n "hover:fill-" packages/primitives/src/recipe/index.ts
```

**R2 — primitives' `outline` edge must paint `borderStrong`.** `outline` in
`packages/primitives/src/core/variants.ts` painted `theme.colors.border` (the
primitives half of `TODO.md` row 1243); it now paints the measured boundary role.
The stand-in's `secondary` look carries a measured 3:1 edge (commit `d54b24e2`),
so the migration must not land on a decorative border.

```sh
grep -n "border: (theme) => theme.colors.borderStrong" packages/primitives/src/core/variants.ts  # expected: a match in outline
```

Both prerequisites were re-measured against this tree (2026-10-22) and pass. If
either command gives the wrong answer: **STOP**, report which prerequisite
failed and leave this plan active. Do not adjust primitives from this workstream.

## The API delta (measured, 0.11.0 workspace)

| Concern | Stand-in (`internal/button.tsx`) | `@gpuixui/primitives` `Button` |
| ------- | -------------------------------- | ------------------------------ |
| variants | `primary` `secondary` `ghost` `danger` | `primary` `secondary` `outline` `ghost` `destructive` `link` |
| sizes | `sm` `md` `lg` | `ControlSize` from `@gpuixui/tokens` (`controlSizes`) |
| icon-only | separate `IconButton`, required `label`, always square | `square` + `label` on `Button` |
| activation | host `onClick` (the stand-in synthesises it from Enter/Space) | `onActivate` (click **or** activating key) beside host `onClick` |
| style | `Props["style"]` (`StyleDesc`) | `StateStyle<ButtonState>` (a plain `StyleDesc` still fits) |
| arbitrary host props | `Props` spread (`testId`, `aria-*`, handlers) | an explicit field set (`testId`, `className`, handlers); **no `Props` spread** |
| disabled | `tabIndex -1`, handlers dropped, `opacity: 0.5` | recipe `disabled:opacity-50`, out of the tab order, activation refused |

The stand-in's `secondary` look is `secondary` fill **plus** a `borderStrong`
edge. primitives' `secondary` has no border and its `outline` has no fill, so the
mapping that preserves the current look is `variant="secondary"` **plus**
`className="border border-strong"` (`@gpuixui/tw` has both utilities). Verify the
painted border colour in `src/behaviour/button.test.tsx`'s existing case.

## Phase 0 — baseline (10 min)

```sh
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test              # 449 at the time of writing
nub run --filter @gpuixui/components test:behaviour    # 585 at the time of writing
```

Record the counts **you** measure in the commit message; the two above are what
this tree printed on 2026-10-22, and other workstreams add cases, so a higher
count is not a failure — a **red** suite is. **STOP** if any is red before you
change anything.

## Phase 1 — inventory the 25 import sites (30 min)

```sh
grep -rl "internal/button" packages/components/src
grep -rn "<Button\|<IconButton" packages/components/src --include=*.tsx | grep -v behaviour/
```

Expected: 17 source call sites in `alert`, `carousel`, `confirm-dialog`,
`date-picker`, `dialog`, `drawer`, `dropdown-menu`, `message-scroller`,
`navigation-menu`, `pagination`, `popover`, `preview-card`, `toast/viewport`, plus
12 behaviour suites. For each site record: variant, size, extra host props,
`style`/`className`, `label`, children shape. Two **public** prop types extend
the stand-in's `ButtonProps` and must move in Phase 3:

- `DatePickerTriggerProps` (`src/date-picker.tsx:239`),
- `NavigationMenuLinkProps` (`src/navigation-menu.tsx:612`).

A site that passes a host prop the primitive cannot express is a **STOP**:
record it in this plan and do not invent a wrapper prop.

## Phase 2 — the adapter (one commit)

Add `"@gpuixui/primitives": "workspace:*"` to `packages/components/package.json`
(components may depend on primitives; the boundary rule allows it). Rewrite
`internal/button.tsx` as a thin adapter that **keeps both exports and their current
props**, so no trigger API changes:

- `mapVariant`: `primary → primary`, `secondary → secondary` + `className="border border-strong"`,
  `ghost → ghost`, `danger → destructive`.
- `Button` renders primitives' `Button`, forwarding `size`, `disabled`, `testId`,
  the composed handlers, `style` and `className`; `onClick` maps to `onActivate`
  unless a test proves passing both runs the handler twice (assert **once**).
- `IconButton` renders `<Button square label={label} …>` and keeps the stand-in's
  glyph tint (`mutedForeground`, `foreground` on hover) through `style`.
- Delete the stand-in's `variantStyle`, `controlStyle`, `disabledStyle` and
  `activation`; the primitive owns them.

Test plan for this phase:

1. No suite above changes; `test:behaviour` must stay at the Phase 0 count.
2. Prove the adapter is load-bearing: drop the `danger → destructive` mapping and
   run `--config vitest.behaviour.config.ts src/behaviour/confirm-dialog.test.tsx`
   — it must fail on the confirm action's paint. Restore it.
3. Add one case to `src/behaviour/button.test.tsx`: a click and an `Enter` each run
   the handler **once** through the adapter (the double-fire guard).

## Phase 3 — migrate the two public prop types (one commit)

`DatePickerTriggerProps` and `NavigationMenuLinkProps` currently extend the
stand-in's `ButtonProps`. Base them on primitives' `ButtonProps`, keep their own
narrowing (`Omit<…, "children">`, `Omit<…, "variant">`), and map a caller's
`onClick` to `onActivate` with `onClick` deprecated in JSDoc (the repo's existing
alias rule, `docs/component-api.md` §2). Update both docs pages' API tables and the
`docs/component-api.md` sentence that names the stand-in.

## Phase 4 — delete the adapter

- Rewrite the 17 call sites to import `Button` from `@gpuixui/primitives`.
- Delete `internal/button.tsx` and `src/behaviour/button.test.tsx`; its contract
  now lives in primitives' `Button.test.tsx` + `runtime/controls.runtime.test.tsx`,
  and each trigger keeps its own interaction case in its suite.
- `grep -rn "internal/button" packages/components` → no match.
- Update `COMPONENTS.md`'s trigger notes that say "the local button stand-in"
  (`Rows`, `Dialogs`, `Dropdown menus`, `Context menus`, `Command menus`) and
  `docs/component-api.md` §7.

## Commands and expected results

```sh
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # your Phase 0 count (plus the new case)
nub run --filter @gpuixui/components test:behaviour   # same count as Phase 0 (plus the new case)
nub run check && nub run lint && nub run test         # gates, at the end
```

## STOP conditions

- R1 or R2 fails.
- A call site needs a host prop primitives' `Button` cannot express.
- A `style` callback at a call site depends on a field the stand-in's state type
  had and `ButtonState` does not.
- The behaviour suite count drops without a recorded deletion of a case.

## Acceptance

One button implementation in the workspace; `packages/components` imports
`Button` from `@gpuixui/primitives`; no `internal/button.tsx`; the two public
prop types migrated with their docs; every trigger's existing interaction case
still green in both themes; gates pass; `TODO.md` interlock row closed.
