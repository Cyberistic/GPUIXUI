# 636 — The Toast's tone bar is a token the card holds

**Phase:** B (component dimensions) · **Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the metric contract), 620
(fixed-surface chrome), 627 (the content-box rule), 631 (the dismiss control) ·
**Number block:** 500–699 (`tokens-theme` overflow; 630 is in use by
`components`, 633 by `playground`, 635 by `primitives`, so 636 is the next free
number in every worktree) ·
**Status:** planned

## 1. The defect

Plan 631 gave the Toast card's width bound its dismiss control and explicitly
left the card's **3px tone bar** out of both the bound and the token set:

```ts
// plan 631's decision, recorded in docs/tokens.md
// … "with the 3px tone bar and the optional action left to consumer chrome"
```

But `packages/components/src/toast/viewport.tsx` paints the bar itself, as a
sibling of the content row **inside** the card:

```tsx
<div style={{ width: CARD_WIDTH, display: "flex", flexDirection: "row",
              borderWidth: theme.borderWidth.thin, overflow: "hidden", … }}>
  <div style={{ width: 3, alignSelf: "stretch", backgroundColor: palette.fg }} />
  <div style={{ flexGrow: 1, padding: theme.spacing.lg, gap: theme.spacing.lg, … }}>
    …icon, title column, optional action, square `sm` dismiss…
  </div>
</div>
```

So the card's content row gets `toastWidth - 2 * borderWidth.thin - 3`, and two
defects follow:

1. **The bound is 3px short.** The shipped `toastWidth` 380 hides it, but a
   copied theme at the planned bound (108) passes while the title glyph needs
   111: `overflow: "hidden"` clips the last three pixels of the title column.
2. **The bar is a hardcoded literal** in component source while every other
   fixed mark — the unread dot (6), the carousel marks (8/18), the timeline
   marker (8) — is a `theme.dimensions` member. A brand cannot make the bar
   4px, and plan 353's obligation ("the fixed surface metrics components still
   hardcode") is unmet for it.

### The probe

At the shipped metrics the old bound is `24 + 16 + 12 + 14 + 12 + 28 + 2 = 108`.
A theme at 110 passes today while the card needs `111`:

```ts
const clipped = extendTheme(getTheme("light"), {
  dimensions: { toastWidth: 110 },
});
```

`themeMetricFailures(clipped)` and `themeFailures(clipped)` both return `[]`.
The bar is also unowned: `getTheme("light").dimensions.toastToneBarWidth` does
not exist, so a brand cannot widen or narrow it.

The shipped identity (`380`) clears the corrected `111` at `3.42×`, so **no
colour, pair, floor, or shipped theme value moves**; the only public API change
is one new dimension a theme may now edit.

## 2. Decision

Ship `dimensions.toastToneBarWidth` (default **3**) and charge it in the Toast
card bound after the card's padding:

```ts
toastWidth ≥
  2 * spacing.lg +            // card padding
  toastToneBarWidth +         // the tone bar inside the card
  iconSize.md +
  spacing.lg +
  typography.bodyStrong.fontSize +
  spacing.lg +
  density.controlHeight.sm +
  2 * borderWidth.thin
```

Identity bound: `24 + 3 + 16 + 12 + 14 + 12 + 28 + 2 = 111`.

Not changed:

- **the bar's colour** — it is the tone's `xSoftForeground` today and stays so;
  plan 348's pair holds it until the components colour migration lands.
- **the optional action** — its label is consumer content and the title column
  flexes, so it is still outside the bound.
- **`toastWidth` itself** — 380 ships unchanged.
- **the countdown groove's 2px height** — it paints along the bottom edge and
  consumes no horizontal chrome; a future plan may token it if a bound needs it.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/scale.ts` | add `toastToneBarWidth` to `Dimensions` and `dimensions` |
| `packages/tokens/src/metrics.ts` | charge it in the `toastWidth` bound; name it in the **dimensions** JSDoc bullet |
| `packages/tokens/src/toast-chrome-fit.test.ts` | header, `toastBound`, figures 108 → 111 / 128 → 131 / 156 → 159; add the literal-ownership and bar-tier cases |
| `packages/tokens/src/fixed-surface-fit.test.ts` | `toastBound`, 108 → 111, 156 → 159, headroom 380/111 |
| `packages/tokens/src/surface-border-fit.test.ts` | `toastBound`, 108 → 111 and the identity-bounds/headroom cases |
| `packages/tokens/src/docs.test.ts` | the derived Toast bound in "states the fixed-surface chrome fits" |
| `docs/tokens.md` | the new table row; the `toastWidth` row; the fixed-surface prose and its 3.52× figure |
| `docs/design-system.md` | the §… fixed-surface sentence names the bar; no figure changes |
| `COMPONENTS.md` | the metric row's Toast sentence and its 108/3.52× figures |
| `TODO.md` | add and tick the row; bump the count; extend the cross-team `theme.dimensions` migration row with the new member |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-636.md` | the audit note |

No other file. Do **not** edit `packages/components`: its migration to
`theme.dimensions` is already a cross-team row (plan 353), and this plan only
extends that row with the new member.

## 4. `packages/tokens/src/scale.ts`

In `Dimensions`, after `toastWidth`:

```ts
  /** 3px — the tone bar the Toast paints down its leading edge. */
  readonly toastToneBarWidth: number;
```

In `dimensions`:

```ts
  toastToneBarWidth: 3,
```

Keep the member next to `toastWidth` so a reader sees the card and its bar
together.

## 5. `packages/tokens/src/metrics.ts`

In the `toastWidth` bound, insert the bar after the card padding:

```ts
        2 * spacing.lg +
          dimensions.toastToneBarWidth +
          iconSize.md +
          spacing.lg +
          typography.bodyStrong.fontSize +
          spacing.lg +
          density.controlHeight.sm +
          2 * borderWidth.thin,
```

Update the comment above it: the bar is `toastToneBarWidth`, painted inside the
card as a sibling of the content row, so it is charged like every other piece of
non-wrapping chrome (plan 636); the optional action remains content.

In the `themeMetricFailures` JSDoc's **dimensions** bullet, change the Toast
clause to name the bar, e.g. "the Toast card counting its `toastToneBarWidth`
tone bar and the square `sm` dismiss control it always paints after one
`spacing.lg` gap". Keep the sentence's other members.

## 6. `packages/tokens/src/toast-chrome-fit.test.ts`

Header: keep the plan-631 context and add the plan-636 defect — the card paints
a 3px tone bar inside its width, the token set did not own it, and the bound
left it out, so a theme at 110 passed while the content row needed 111.

`toastBound` becomes:

```ts
const toastBound = (theme: Theme): number =>
  2 * theme.spacing.lg +
  theme.dimensions.toastToneBarWidth +
  theme.iconSize.md +
  theme.spacing.lg +
  theme.typography.bodyStrong.fontSize +
  theme.spacing.lg +
  theme.density.controlHeight.sm +
  2 * theme.borderWidth.thin;
```

Update every shipped figure: `380 / 108` → `380 / 111`; the stated bound 108 →
111; the 100px plant's bound 108 → 111; "is a minimum" at 111 passes and 110
fails; the lifted fixture 128 → 131 (with 131 passing, 130 failing); the roomy
spacing fixture 156 → 159; the total-check bound 108 → 111.

Add:

1. **Owns the bar as a dimension.** `getTheme("light").dimensions.toastToneBarWidth`
   is `3`, and `Object.keys(dimensions)` contains it (import `dimensions`). This
   is the case that fails on the pre-fix tree because the member does not exist.
2. **Reads the bar from the theme.** A theme with
   `toastToneBarWidth: 6` and `toastWidth: 111` fails at `bound: 114`; at
   `toastWidth: 114` it passes. On the pre-fix tree the bound is 111 for both
   and neither case reports — the ownership case above already fails.
3. **Keeps the shipped headroom.** The shipped `380` clears `111` at `3.42×`
   (`toBeCloseTo(380 / 111, 4)`).

### Proving both directions

1. On the pre-fix tree (`git stash push -- packages/tokens/src/scale.ts
   packages/tokens/src/metrics.ts`), run
   `cd packages/tokens && nub x vitest run src/toast-chrome-fit.test.ts`:
   the ownership case throws on the missing member, and the shipped/lifted/roomy
   figures report 108/128/156 instead of 111/131/159 — five failures.
2. With the fix: all cases pass.
3. `nub run --filter @gpuixui/tokens test` → all suites green.

## 7. Documentation

### `docs/tokens.md`

- New row after `toastWidth`:
  `| dimensions.toastToneBarWidth | 3 | the tone bar the Toast paints down its leading edge; charged inside toastWidth |`
- The `toastWidth` row names the bar: "holds its padding, its
  `toastToneBarWidth` tone bar, tone icon, two `lg` gaps, the square `sm`
  dismiss control and one `bodyStrong` title inside its two borders".
- The fixed-surface prose: the expression gains
  `+ toastToneBarWidth` after `2 * spacing.lg`; the words become "with the
  optional action left to consumer content and the bar charged as
  `toastToneBarWidth`". The headroom sentence moves from
  `3.52× / 6.15× / 3.27×` to `3.42× / 6.15× / 3.27×`.
- The dimensions intro sentence ("a toast its card width") stays.

### `docs/design-system.md`

The fixed-surface sentence (§… "a toast card, a notification inbox and an
overlay minimum each need their padding, icon, gap and one title or label glyph
— and a toast card its square `sm` dismiss control"): add the bar, e.g. "— and a
toast card its `toastToneBarWidth` tone bar and square `sm` dismiss control".
No figure changes.

### `packages/tokens/src/docs.test.ts`

The `toastBound` expression in "states the fixed-surface chrome fits" gains
`dimensions.toastToneBarWidth` after `2 * spacing.lg`; the derived sentence then
prints `3.42×` by itself. No hand-written number changes in the test.

### `COMPONENTS.md`

In the **Theme metric check** row: the Toast clause names the tone bar through
`toastToneBarWidth`, and the three-surface figure sentence moves from
`the shipped 380/320/180 clear the 108/52/55 bounds at 3.52×/6.15×/3.27×` to
`… clear the 111/52/55 bounds at 3.42×/6.15×/3.27×`.

### `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Own the Toast's tone bar and hold the card to it — `toastWidth`'s bound
left out the 3px tone bar `ToastCard` paints inside the card as a sibling of
its content row, calling it consumer chrome, so a copied theme at 110 returned
`[]` while the content row needed 111 under `overflow: "hidden"`, and the bar
was the last fixed mark in the dimensions group with no token; `toastToneBarWidth`
(3) now ships beside `toastWidth`, the bound charges it, every shipped set
passes (380 against 111) and no colour, pair, floor or other metric moves
(plan 636)
```

Bump `273/346` → `274/347`, keeping the bar at `[████████░░]`.

In the cross-team row "`components` reads `theme.dimensions` …", add
`toastToneBarWidth` to the list of members it should read.

### `.agents/slop/plans/README.md`

Add the table row after 634 and a summary paragraph.

## 8. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/toast-chrome-fit.test.ts src/fixed-surface-fit.test.ts src/surface-border-fit.test.ts src/docs.test.ts`
   → every case passes.
3. `nub run --filter @gpuixui/tokens test` → all suites green; no new test file.
4. `nub run check` → exit 0.
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 9. STOP conditions

Stop and report, do not improvise, if:

- a shipped theme fails the corrected bound — an identity or platform
  `toastWidth`, spacing, icon, density or border metric disagrees with the
  arithmetic; that is a design decision;
- `ToastCard` no longer paints a 3px bar inside its own width (it moved outside,
  became a border, or its width is theme-derived already) — re-read the evidence
  from the components worktree before shipping the token;
- a docs test enumerates the dimension table and fails on a duplicate or an
  unexpected row shape — fix the row, not the guard;
- `COMPONENTS.md` or `docs/design-system.md` has another figure this plan did
  not name — derive it from the bound, do not retype a new number.

## 10. Acceptance

- `dimensions.toastToneBarWidth` is a public dimension (3), documented in the
  catalogue, and read by the Toast bound from the theme.
- Every shipped identity theme, platform variant and recipe passes; no colour,
  pair, floor or other metric moves, and `toastWidth` stays 380.
- The ownership and bar-tier cases fail on the pre-fix tree and pass after it.
- The catalogue, design system, inventory and JSDoc name the bar; the plan,
  audit note and README index are current.
- `nub run check`, `nub run lint` and `nub run test` pass.
