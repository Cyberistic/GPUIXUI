# Plan 524 — the selection wash on the unavailable control's fill

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
071 (the contrast contract), 081 (the selection wash on every surface a glyph
is selected on), 087 (the wash's own perceivability), 306 (the inactive state is
measured), 307 (the inactive label inside a status panel), 510 (the unavailable
label through the selection wash).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

Plan `510` established that an unavailable label is read *through* the
composited selection wash. It measures `disabledForeground` with
`selectionInactivePairs` over every entry of `inactiveSurfaces`, and that list
begins with the `disabled` fill:

```ts
const inactiveBaseSurfaces = [
  "disabled",
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;
```

The wash's own perceivability is measured by `selectionWashPairs`, and that list
is exactly `selectionSurfaces`:

```ts
export const selectionWashPairs: readonly ContrastPair[] =
  selectionSurfaces.map(
    (surface): ContrastPair => ["selection", surface, "surface"],
  );
```

`selectionSurfaces` is `background`, `card`, `muted`, `hover`, `active`,
`accent`, `popover`, `input` and `selected`. The four soft status fills have
their own wash list (`selectionSoftWashPairs`). **`disabled` is the one surface
where a washed label is measured but the wash itself is not.**

The failure this permits is exact. A theme whose `selection` equals its
`disabled` fill composites the disabled label onto the same colour it was
already measured on, so:

- `selectionInactivePairs` for `disabled` still passes — the label is exactly as
  readable as it was at rest, and it is readable at rest by design;
- every other surface the theme paints can pass;
- `themeContrastFailures` returns no failure for the composition, because no
  pair exists for the wash on that fill.

The highlight is gone and the whole six-check guarantee calls the theme good.
That is the same class of defect plans `087`, `091` and `099` closed for the
plain surfaces, the soft status fills and the modal scrim respectively.

A probe on this branch measures the shipped sets (the pair is added by this
plan, so the numbers below are computed directly with
`compositeOver`/`contrastRatio`):

```
selection on disabled: tightest 1.1248:1  (high-contrast dark)
failures at the declared surface floor: 0 of 24
```

So the new pair is a guard: **no colour moves.** The tightest shipped set is the
high-contrast dark palette, whose wash is a light veil and whose disabled fill is
`#2E2E2E`.

## 2. The rule

Add one pair to `selectionWashPairs`:

```ts
["selection", "disabled", "surface"]
```

The pair keeps the `surface` floor (1.05:1, unchanged at high contrast). The
list becomes ten pairs; the four soft fills stay in their own published list, so
the documentation keeps the "plain surfaces + the disabled fill" /
"soft status fills" split it already uses.

Why this is not in `selectionSurfaces`: that list is the *glyph* list — each
entry maps to the body role the surface's own text uses (`foreground`,
`inputForeground`, …). `disabled` carries `disabledForeground` instead and is
already the first entry of `inactiveSurfaces`. Widening `selectionSurfaces`
would add the wrong roles (`foreground` on `disabled`, status text on
`disabled`) and is explicitly out of scope.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. **`selectionWashPairs` JSDoc** (currently "The surfaces a selection wash must
   stay visible on. Each entry pairs the translucent `selection` role with the
   surface it paints on; …"). Add:

   > The `disabled` fill joins the list because the unavailable label plan `510`
   > measures through the same wash is painted on it: a highlight that matches
   > that fill erases the selection while every text pair still passes.

2. **The list** gains the pair after the mapped plain surfaces:

   ```ts
   export const selectionWashPairs: readonly ContrastPair[] = [
     ...selectionSurfaces.map(
       (surface): ContrastPair => ["selection", surface, "surface"],
     ),
     // The unavailable label is selected with the copy around it (plan 510),
     // so the wash must stay visible on the fill it keeps.
     ["selection", "disabled", "surface"],
   ];
   ```

Do not add `disabled` to `selectionSurfaces`, `selectionPairs` or
`selectionStatusPairs`; do not change any colour value, floor or other list.

### 3.2 `packages/tokens/src/disabled-wash.example.ts` (new)

A complete, executed example (plan `350`'s rule that every `*.example.ts` is
imported by a suite):

```ts
/**
 * An edited theme whose selection wash equals the fill a disabled control
 * keeps. Every text pair still passes — the label is as readable as it was at
 * rest — and the wash pair is the only check that reports the erased highlight.
 */
import { extendTheme, getTheme, themeContrastFailures } from "./index.js";

const light = getTheme("light");

export const invisibleDisabledWash = extendTheme(light, {
  colors: { selection: light.colors.disabled },
});

export const invisibleDisabledWashFailures = themeContrastFailures(
  invisibleDisabledWash,
).filter(
  ({ foreground, background, wash }) =>
    foreground === "selection" && background === "disabled" && wash === "selection",
);
```

### 3.3 `packages/tokens/src/disabled-wash.test.ts` (new)

Header comment states the bug being guarded (plan 524 §1) and names the probe.
Cases:

1. **The pair is published.** `selectionWashPairs` contains
   `["selection", "disabled", "surface"]`; the list is still unique (the
   existing uniqueness guard in `contrast.test.ts` covers the list, but assert
   the content here so the file states its own contract).
2. **Every shipped set clears it.** Map `shippedThemes`, composite
   `theme.colors.selection` over `theme.colors.disabled`, compare with
   `theme.colors.disabled`, and assert `>= contrastFloors[theme.contrast].surface`
   with `theme.name` as the message. (The tightest is 1.1248:1.)
3. **The regression.** Run `invisibleDisabledWashFailures` from the example:
   - exactly one entry, `pairClass: "surface"`, `floor: 1.05`, `ratio` ≈ 1;
   - **no** failure has `foreground: "disabledForeground"` and
     `background: "disabled"` — the text pair cannot see the erased highlight;
   - the failure also survives the total check: `themeFailures(invisibleDisabledWash)`
     contains `{ kind: "contrast", … }` with the same `foreground`/`background`.
4. **The pair is not a false positive.** A theme whose `selection` is the
   shipped value passes the pair, and a theme with a *different* visible wash
   over `disabled` passes too (e.g. the identity `selection` on a light theme is
   1.30:1 there; assert `>= 1.05`).

### 3.4 Existing tests

- `packages/tokens/src/contrast.test.ts` — the list-count case:
  `expect(selectionWashPairs.length).toBe(9)` → `10`.
- `packages/tokens/src/selection-secondary.test.ts`:
  - "documents one perceivability pair per surface" compares
    `selectionWashPairs` with `selectionSurfaces.map(…)`; change the expected
    list to `[...selectionSurfaces.map(…), ["selection", "disabled", "surface"]]`
    (or `[...selectionSurfaces, "disabled"].map(…)`).
  - "reports a wash that is too faint to see" expects
    `[...selectionSurfaces, ...selectionSoftWashPairs backgrounds]`; insert
    `"disabled"` after the plain surfaces, before the soft fills, to match the
    order `themeContrastFailures` emits.
- No other suite hardcodes the wash count (the `inventory.test.ts` count is
  derived from the list).

### 3.5 Documentation

- **`docs/tokens.md`** — the selection paragraph around "The wash itself is
  compared with each surface it paints on … `selectionWashPairs` is that list."
  Add:

  > It also holds the `disabled` fill: plan `510` measures the unavailable label
  > through this wash on the fill it keeps, so a highlight that matches that fill
  > would erase the selection while every text pair still passed. Every shipped
  > set already clears the floor, so no colour moves.

  In §"Text selection" (the paragraph beginning "Text selection is measured in
  both directions") change "on each" to name the disabled fill in one clause,
  e.g. "on each plain surface and on the `disabled` fill an unavailable label
  keeps".

- **`docs/design-system.md` §8** — the `text selection` row already says "the
  wash itself stays perceivable"; add "including on the `disabled` fill an
  unavailable label keeps" after that clause. (The floor table in §9 names the
  text list, not the wash list, so it does not change.)

- **`COMPONENTS.md`** — the **Theme contrast check** row: `9 wash pairs` →
  `10 wash pairs`, and add "the wash on the `disabled` fill an unavailable label
  keeps (plan 524)" beside the existing "9 wash pairs" phrase. Keep the derived
  count consistent with `selectionWashPairs.length`; `inventory.test.ts` reads
  both the phrase and the list.

- **`packages/tokens/README.md`** — no count is quoted, but the selection
  paragraph says the wash is held "against each surface"; append "and on the
  `disabled` fill an unavailable label keeps" so the front door matches the
  reference. The `readme.test.ts` floor phrase stays true unchanged.

- **`docs.test.ts`** — add one case slicing the selection paragraph: it must
  name `disabled` and `selectionWashPairs`. Guard the design-system row's new
  clause similarly (its §8 rows are already derived/held, so read the row from
  the file and assert the phrase).

### 3.6 Plan index and `TODO.md`

- `.agents/slop/plans/README.md`: add the plan 524 row to the tokens table and
  a short paragraph in the 500-series prose, naming the gap and the one-pair
  contract growth (9 → 10 wash pairs; `contrastPairs` stays 396).
- `TODO.md`: add and tick, under "Design tokens and theming":

  > `[x]` Hold the selection wash on the unavailable control's fill — plan `510`
  > measures `disabledForeground` through the paint on the `disabled` fill, but
  > `selectionWashPairs` measured the wash only on the nine `selectionSurfaces`
  > and the four soft fills, so a theme whose `selection` equalled its `disabled`
  > returned `[]` for the composition while the highlight was gone; the pair
  > joins the list (9 → 10 wash pairs) and every shipped set already clears the
  > 1.05:1 floor (1.125:1 at the tightest, high-contrast dark), so no colour
  > moves (plan 524).

  Bump the section's progress count (`188/250` → `189/251`).

## 4. Commands and expected results

Run from `packages/tokens` (or with `--filter @gpuixui/tokens`):

| Command | Expected |
| ------- | -------- |
| `nub exec vitest run src/disabled-wash.test.ts` | 1 file, all cases pass |
| `nub exec vitest run src/selection-secondary.test.ts src/contrast.test.ts` | the updated counts pass |
| `nub run --filter @gpuixui/tokens test` | 117 files pass, 0 failures |
| `nub run --filter @gpuixui/tokens check-types` | exits 0 |
| `nub run lint` (repo root) | exits 0 |
| `nub run fmt` (repo root) | "All matched files use the correct format." |
| `nub run check:tests` (repo root) | exits 0 (the new test asserts real values) |

Prove the guard can fail: temporarily remove the added pair from
`selectionWashPairs` and re-run `disabled-wash.test.ts`; it must fail on the
published-pair case, the regression case and the total-check case. Restore the
pair and re-run; it must pass. Record both directions in the commit message.

Then, from the repo root: `nub run --filter @gpuixui/tokens build` (exits 0).

## 5. STOP conditions

Stop and report instead of improvising if:

- any **shipped** theme, platform variant or recipe fails the new pair (no
  shipped value may move; if one does, report the set, the role and the ratio
  before changing a colour);
- the regression theme produces a failure with `foreground:
  "disabledForeground"` and `background: "disabled"` (that would mean the text
  pair — not the wash pair — is what the case is measuring; re-read the probe);
- `inventory.test.ts`, `docs.test.ts` or `readme.test.ts` fails for a reason
  other than the count or sentence this plan changes — do not edit an unrelated
  claim to make the suite green;
- the change needs a file outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md` and
  `TODO.md` (the plan index is the only other file).

## 6. Test plan — what it must catch

The regression is *"a selection wash can be invisible on the disabled fill while
the check calls the theme good"*. The suite must fail if:

1. the pair is removed from `selectionWashPairs` → the new regression and the
   published-pair case fail;
2. the pair is attached to a different surface or class → the failure's
   `background`/`pairClass`/`floor` assertions fail;
3. the shipped-theme case reads a hardcoded floor instead of the theme's
   declared level → a high-contrast theme (floor 1.05 is unchanged, but the
   message and loop shape make a wrong lookup visible) or a future level change
   fails;
4. the docs sentence drifts → the new `docs.test.ts` case fails.

The two-direction check is §4's remove-and-run.

## 7. Acceptance

- [ ] `selectionWashPairs` publishes the `disabled` fill, and
      `themeContrastFailures` reports a theme whose wash matches that fill.
- [ ] Every shipped set still passes all six checks; no token value moves.
- [ ] `disabled-wash.test.ts` and `disabled-wash.example.ts` exist, the example
      is imported by the suite, and the test demonstrably fails without the
      pair.
- [ ] `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`
      and the `COMPONENTS.md` row state the addition; the new claims are
      guarded.
- [ ] `TODO.md` carries the ticked row; the section's progress count is current;
      the plan index lists 524.
- [ ] All commands in §4 pass; the branch is committed and pushed.
