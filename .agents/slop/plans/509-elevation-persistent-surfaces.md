# Plan 509 — The elevation shadow over the persistent selected row and the field a drop-up opens over

**Status:** done · **Workstream:** `tokens-theme` · **Phase:** F
**Depends on:** 085 (a level is geometry plus an alpha over the `shadow` tint),
099/359 (the persistent surfaces the scrim covers), 505 (the shadow became a
measured composition), 507 (a dialog's shadow is measured through its face).
**Owns:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/contrast.test.ts`,
`packages/tokens/src/elevation-contrast.test.ts`,
`packages/tokens/src/docs.test.ts`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`.

---

## 1. The defect

`elevationSurfaces` names four surfaces a raised element floats over —
`background`, `card`, `muted`, `popover`. Plan 359 established that two more
page surfaces are *persistent*: `selected` is the fill a table, list or tree
keeps while something opens over it, and `input` is the fill of a field a
floating surface is anchored to. The scrim was given both; the elevation
contract never was.

Two shipped desktop compositions therefore have no elevation pair:

- a **context menu or preview card opened over a selected row** — right-click a
  chosen row, or hover a preview card on it. The raised surface's shadow lands
  on the `selected` fill, which persists while the menu is open.
- a **popover flipped above its trigger** — `usePlacement` flips once when the
  snapped surface would cover its trigger, so a drop-up's shadow (offset
  downward) lands on the `input` fill. The field keeps its fill while the
  popover is open.

A theme whose `shadow` tint composites to `selected` or to `input` ships a
raised element with no shadow over that surface while
`themeContrastFailures`/`themeFailures` return `[]` — the defect plan 505 fixed
one surface over.

### Measured

Across all 24 shipped sets, both new surfaces already clear the 1.05:1
`surface` floor. The tightest new pair is **1.109:1** (macOS dark, `sm` on
`input`); the tightest on `selected` is **1.166:1** (identity light, `sm`). The
overall contract tightest (identity dark, `sm` on `background`, **1.061:1**) and
the AAA dark tightest (**1.207:1**) do not move. So **no colour moves**; this
plan closes a coverage gap.

## 2. What to change

### 2.1 `packages/tokens/src/contrast.ts`

`layoutSurfaces` (near line 1396) is already the six persistent page surfaces
and is declared before `elevationSurfaces` (near line 1490). Derive the public
list from it instead of repeating it, so the scrim and the elevation cannot
drift:

```ts
/**
 * The surfaces a raised element's shadow is painted over: the six persistent
 * page surfaces a modal also covers (`layoutSurfaces`) — the canvas, a card,
 * the quiet panel, the field fill a flipped popover opens over, the
 * persistent `selected` fill a context menu or preview card opens over, and a
 * floating surface. ... (keep the existing dialog exception paragraph)
 */
export const elevationSurfaces = layoutSurfaces;
```

Keep the rest of the JSDoc: the dialog exception (its `lg` shadow lands on the
scrim, measured by `dialogSurfacePairs`), the pointer-wash exclusion and the
reserved empty `overlay`. Add one sentence naming why `selected` and `input`
are included: a raised surface opens over them and they persist while it is
open. Do **not** add `hover`/`active`/`accent` or the filled families'
`xHover`/`xActive` steps — they are transient pointer states.

### 2.2 `packages/tokens/src/contrast.test.ts`

1. Extend the header with plan 509: the two persistent surfaces the elevation
   list omitted, the measured tightest 1.109:1, and that no colour moves.
2. Update the literal at `names the surfaces a raised element floats over` to
   the six, in `layoutSurfaces` order:

   ```ts
   expect(elevationSurfaces).toEqual([
     "background",
     "card",
     "muted",
     "input",
     "selected",
     "popover",
   ]);
   ```

3. The `reports a collapsed alpha on every surface the level paints over` case
   already derives from `elevationSurfaces`; it needs no edit.
4. The regression case lives in `elevation-contrast.test.ts` (§2.3) because that
   suite owns the painted-shadow guarantee; `contrast.test.ts` keeps the list
   assertion.

### 2.3 `packages/tokens/src/elevation-contrast.test.ts`
The suite carries a hand-typed `const surfaces = ["background", "card",
"muted", "popover"]`, which is why it would not see the new surfaces. Replace
it with the public list:

```ts
import { elevationSurfaces } from "./index.js";
...
// remove `const surfaces = ...`
```

and use `elevationSurfaces` in the two places `surfaces` was read. This is also
the suite that proves the shipped sets pass, so it now covers the new pair.
Add the regression case here: for `selected`, use the new `quietShadowTheme`
example below; for `input`, extend the light theme with
`colors: { shadow: theme.colors.input }`. Each reports exactly `sm`, `md` and
`lg` at ratio 1 for that surface (empty on the pre-change tree). Extend the
suite header with plan 509 (one short paragraph) and keep the plan-505 cases
unchanged.

### 2.3b `packages/tokens/src/contrast.example.ts`

Add a runnable, copyable example beside `quietPressTheme`:

```ts
/**
 * A theme whose elevation tint is the selected row: a context menu or preview
 * card opened over a chosen row paints a shadow that composites to that row, so
 * it has no shadow there. Plan 509's `selected` elevation surface is what
 * reports it — the fill persists while the raised surface is open, exactly like
 * the scrim over the same row.
 */
export const quietShadowTheme = extendTheme(getTheme("light"), {
  name: "Quiet shadow",
  colors: { shadow: getTheme("light").colors.selected },
});

/** The three elevation levels the quiet shadow erases on the selected row. */
export const quietShadowFailures = themeContrastFailures(quietShadowTheme);
```

The example is imported by `elevation-contrast.test.ts`, so `examples.test.ts`
(plan 350) holds it to "a suite must import every example".

### 2.4 `docs/tokens.md`

- The elevation paragraph after the elevation table: "the four surfaces" →
  "the six persistent page surfaces", and name them (`background`, `card`,
  `muted`, `input`, `selected`, `popover`). The quoted tightest **1.061:1**
  (identity dark `sm` on `background`) and AAA **1.207:1** are unchanged.
- The Verification paragraph for elevation (near line 1616): replace
  "`background`, `card`, `muted` and `popover`, the surfaces a raised card,
  menu or popover floats over" with the six and the reason (`selected`
  persists under a context menu or preview card; `input` is the fill a flipped
  popover opens over).
- In the verification history after plan 508, add one step:

  > Plan `509` adds the two persistent surfaces the elevation list omitted —
  > `selected` (a context menu or preview card over a chosen row) and `input`
  > (a popover flipped above its trigger) — taking the walk from four to six
  > surfaces; every shipped set clears 1.05:1 (1.109:1 at the tightest, macOS
  > dark `sm` on `input`), so no colour moves and `contrastPairs` stays **394**.

### 2.5 `docs/design-system.md`

- §7: "the four surfaces" → "the six persistent page surfaces" and the six
  names. Keep the two quoted figures.
- §7 "A raised element normally floats over the page, which
  `elevationSurfaces` names." Add the two compositions in one clause.
- §9 floor table row: build/name
  `background`/`card`/`muted`/`input`/`selected`/`popover`.
- §9 explanation: "the four surfaces a raised card, menu or popover floats
  over" → "the six persistent page surfaces a raised card, menu, popover or
  preview card floats over".
- §8 interaction table / §9 other mentions of elevation: no other count changes.

### 2.6 `packages/tokens/README.md`

`elevationSurfaces` is "the four surfaces the contrast check composites each
defined level over" → "the six persistent page surfaces ..." and name them.

### 2.7 `COMPONENTS.md`

- **Design tokens** row: "held to the 1.05:1 elevation floor on the four
  surfaces `elevationSurfaces` names (plan 505)" → "on the six persistent page
  surfaces `elevationSurfaces` names (plans 505 and 509)".
- **Theme contrast check** row: add one clause after the plan 505 sentence:
  "Plan 509 gives the elevation walk the two persistent surfaces plan 359
  added to the scrim — `selected` and `input` — so a context menu over a
  chosen row or a popover flipped above its trigger cannot ship with no
  shadow; every shipped set passes (1.109:1 at the tightest, macOS dark `sm` on
  `input`), so no colour moves and `contrastPairs` stays 394."
- No count word in the row ("394 contrast pairs", "18 scrim pairs") changes.

### 2.8 `packages/tokens/src/docs.test.ts`

- The §9 floor row at the big `rows` literal is currently hand-typed. Build it
  from the public list so it cannot drift:

  ```ts
  `| elevation shadow (each defined level of \`sm\`/\`md\`/\`lg\` — the reserved
  \`overlay\` is empty — painted on
  ${elevationSurfaces.map((surface) => `\`${surface}\``).join("/")}, the
  surfaces \`elevationSurfaces\` names) | ...`,
  ```

  (one line, matching the other derived rows).
- The existing `names every surface in the elevation shadow's floor row` case
  already iterates `elevationSurfaces`; it passes once the row names them.
- No `countWord` change: the elevation walk has no count word.

### 2.9 Indexes

- `.agents/slop/plans/README.md`: add the 509 row and a closing paragraph after
  plan 508's.
- `TODO.md`: add and tick the row; bump the Design tokens section count
  (174/228 → 175/228 if that is still the current numerator; re-read it first).

## 3. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test   # 105 files green; the new case and example
nub run check                            # green
nub run lint                             # green
nub run test                             # green
nub scripts/check-tests.ts               # green
```

Both directions, manually (the repo is git, so `verify-two-directions.sh`'s
`jj` path does not apply):

1. With §2.1 applied and the new tests written, temporarily change
   `elevationSurfaces` back to the four-surface literal.
2. `nub run --filter @gpuixui/tokens test` → the new cases and the literal
   case fail (0 failures on `selected`/`input`, 6 surfaces expected vs 4).
3. Restore §2.1 → all green.

## 4. STOP conditions

- Any shipped set fails 1.05:1 on `selected` or `input` (the measured minimum is
  1.109:1). Do not move a colour; report.
- `contrastPairs` changes from 394 (it must not; the elevation walk is not a
  pair list).
- A docs guard fails for a reason other than the changed surface names, the
  count word or the new history step.
- A test fails because `layoutSurfaces` is not in scope where
  `elevationSurfaces` is declared (it is at line ~1396, before ~1490; if an
  earlier refactor moved it, STOP and report rather than reordering the file).

## 5. Acceptance

- `elevationSurfaces` is the six persistent page surfaces, derived from
  `layoutSurfaces`, with the JSDoc naming the two new compositions.
- `themeContrastFailures`/`themeFailures` report a shadow that composites to
  `selected` or `input`; the regression case fails without the change and
  passes with it.
- The elevation suite reads the public list, not a fourth copy.
- Both pages, the README and the two ledger rows state the six surfaces from
  the implementation.
- All gates in §3 are green, the plan is indexed, the TODO row is ticked.
