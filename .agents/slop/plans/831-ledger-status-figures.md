# 831 — The live cross-team rows quote figures the palette no longer produces

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `079`, `366`,
`528`, `574`, `582`, `611`, `737` and `828`.

## 1. The defect

`TODO.md` carries live `[ ]` cross-team rows as the instruction the next
workstream follows: what a consumer paints today, what it should paint, and the
measured cost of the defect. Three of those rows are **evidence**, and their
figures are prose no test reads, so every palette plan that moves a role leaves
them behind. Plans `821`–`828` fixed that class one row at a time; the audit
that follows `828` finds three more.

Measured on this tree with the shipped sets:

| Row | Says today | Measures today |
| --- | ---------- | -------------- |
| `message.tsx` status word | `successText`/`infoText`/`destructiveText` on the identity light `card` are **6.63:1, 8.42:1 and 7.21:1** | **8.60:1, 8.42:1 and 8.70:1** |
| `destructiveText` error signal | solid `destructive` is **4.04–4.28:1** on the hover wash and **3.29–3.86:1** on the active wash; `destructiveText` clears every wash at **≥5.28:1** | **3.81–4.50:1** and **3.36–4.04:1**; `destructiveText` at **≥6.37:1** |
| ColorPicker ring | `foreground` on the six swatches measures **1.000:1** on the `foreground` swatch, and **1.56–2.98:1** on `primary`/`destructive` "in most sets" | `foreground` on `foreground` is 1.000 in all 24; **1.57–3.59:1** on `primary` (under 3:1 in **21 of 24**) and **1.97–3.48:1** on `destructive` (**18 of 24**) |

`2.98`, `6.63`, `7.21` and `5.28` are not compositions the current palette
produces at all: they predate the status-text moves (`366`, `528`, `574`,
`582`) and the disabled-fill and mark audits (`737`, `828`). A consumer reading
the ColorPicker row is also told every `primary`/`destructive` set is under the
mark floor, while three `primary` sets now clear it.

The **conclusions** in all three rows still stand: the status word belongs on
`xText`, the error signal belongs on `destructiveText`, and no single palette
role can guarantee a ring against a user-supplied swatch. Only the figures and
the one over-broad "most sets" claim are wrong.

No colour, pair, floor, metric, role, platform style or shipped theme is wrong.

## 2. What the package produces today

Derived from `shippedThemes` (24 sets: identity × 2 modes × 2 contrasts, three
platform variants × 2 × 2, two recipes × 2 × 2) with the same
`contrastRatio` the checker uses:

```
identity light, on card
  success        4.540   (row says 4.540 — correct)
  successText    8.603   (row says 6.63)
  infoText       8.422   (row says 8.42 — correct)
  destructiveText 8.701  (row says 7.21)

default light sets (six), destructive as text on a wash
  hover   3.812 (XP) .. 4.502 (identity only set at/over the floor)
  active  3.357 (XP) .. 4.036 (identity)
  destructiveText      ≥ 6.372 (tightest)

ColorPicker, `foreground` ring on a swatch, all 24 sets
  foreground  1.000 every set
  primary     1.565 .. 3.595   under 3:1 in 21
  destructive 1.974 .. 3.480   under 3:1 in 18
  contrastRing(theme) tightest sqrt(contrast(foreground, background)) = 3.70
```

## 3. Decisions

1. **Correct the live rows, not the history.** Ticked rows and plan narratives
   that record a pre-move figure stay as written; they state what was measured
   then. Only the three live `[ ]` rows get today's numbers.
2. **Say the shape of the range, not only its ends.** The ColorPicker row's
   "in most sets" hid a 3:1-clearing minority; the corrected sentence names the
   counts (`21 of the 24`, `18 of 24`) so a reader can see how far the ring is
   from the floor.
3. **Do not weaken any conclusion.** All three migrations remain correct:
   `xText` on a status word, `destructiveText` on error text, and
   `contrastRing` (or a `primaryForeground` glyph) on a user-supplied swatch.
4. **One purpose-named guard**, matching `815`, `817`, `818`, `821`, `823` and
   `828`: `ledger-status-figures.test.ts` derives every figure from
   `shippedThemes` and reads the three live rows. It also derives the
   ColorPicker's two counts and the `contrastRing` tightest figure, so a palette
   move cannot leave the argument behind.
5. **No value moves.** Only `TODO.md`, the test and the plan index change.

## 4. Files to change

1. `TODO.md` — the three live rows; one ticked row for this plan; the
   workstream counter `379/454` → `380/455`.
2. `packages/tokens/src/ledger-status-figures.test.ts` — **create**.
3. `.agents/slop/plans/README.md` — the plan row and its closing paragraph.

No source module, no document under `docs/`, no `COMPONENTS.md` row: the
figures live only in the ledger.

## 5. Step 1 — the three ledger rows

### 5.1 `message.tsx` status word (the row beginning `Cross-team: `components` uses `statusTone(...).text``)

Replace the last sentence

```
`successText`/`infoText`/`destructiveText` are the roles held on
`card` (6.63:1, 8.42:1 and 7.21:1 in the identity light set).
```

with

```
`successText`/`infoText`/`destructiveText` are the roles held on
`card` (8.60:1, 8.42:1 and 8.70:1 in the identity light set).
```

Keep the leading `success` figure (4.540:1, "clearing the 4.5:1 floor by 0.04")
and the sentence that an edited theme can erase a "done" label: both are still
true, and the 0.04 margin is why the migration matters.

### 5.2 `destructiveText` error signal (the row beginning `Cross-team: `components` uses `destructiveText` for every error signal`)

Replace

```
item label (`menu/item.tsx`). The solid `destructive` is a fill: it measures 4.04–4.28:1
on the hover wash and 3.29–3.86:1 on the active wash across the shipped light
sets, under the 4.5:1 secondary floor, while `destructiveText` clears every
wash (≥5.28:1).
```

with

```
item label (`menu/item.tsx`). The solid `destructive` is a fill: it measures 3.81–4.50:1
on the hover wash — only the identity light set reaches the floor, at 4.502:1 —
and 3.36–4.04:1 on the active wash, under the 4.5:1 secondary floor in all six
default light sets, while `destructiveText` clears every wash (≥6.37:1).
```

### 5.3 The ColorPicker ring (the row beginning `Cross-team: `components` gives the ColorPicker's selected swatch`)

Replace

```
**1.000:1** on the `foreground` swatch in every theme and 1.56–2.98:1 on
`primary`/`destructive` in most sets, under the 3:1 mark floor.
```

with

```
**1.000:1** on the `foreground` swatch in every theme, 1.57–3.59:1 on `primary`
(under the 3:1 mark floor in 21 of the 24 shipped sets) and 1.97–3.48:1 on
`destructive` (18 of 24).
```

Keep `contrastRing`'s "3.70:1 at the tightest shipped set" and the sentence that
no single palette role can guarantee contrast with a user-supplied colour.

## 6. Step 2 — `packages/tokens/src/ledger-status-figures.test.ts`

Header: state the bug — the three live cross-team rows quote figures the
status-text moves and the mark audits left behind, and a live row is the
instruction the next workstream follows.

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from
`vitest`; `contrastRatio`, `contrastRing`, `extendTheme`, `lightTheme` and
`shippedThemes` from `./index.js` (follow the neighbouring suites' import
style; `contrastRing` is exported from `./ring.js` or re-exported from the
entry — check `src/index.ts` first).

Helpers:

```ts
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replaceAll(/\s+/g, " ").trim();

const ledger = prose("../../../TODO.md");

/** One live cross-team row: from its start to the next live row. */
const liveRow = (start: string): string => {
  const from = ledger.indexOf(start);
  expect(from, start).toBeGreaterThanOrEqual(0);
  const to = ledger.indexOf("`[ ]` Cross-team", from + start.length);
  expect(to, start).toBeGreaterThan(from);
  return ledger.slice(from, to);
};

const ratio = (a: string, b: string): number => contrastRatio(a, b);
const fixed = (value: number): string => value.toFixed(2);
const defaultLight = shippedThemes.filter(
  (s) => s.theme.mode === "light" && s.theme.contrast === "default",
);
```

Cases:

1. **"states the status inks on the identity light card"** — find
   `shippedThemes.find((s) => s.theme.name === "Light")`; assert
   `contrastRatio(theme.colors.successText, theme.colors.card)` is close to
   `8.603`, `infoText` to `8.422`, `destructiveText` to `8.701`. Read the row
   starting `Cross-team: `components` uses `statusTone(...).text`` and assert it
   contains `` `8.60:1, 8.42:1 and 8.70:1` ``, still contains `4.540:1`, and does
   not contain `6.63:1` or `7.21:1`.
2. **"states the destructive fill on the two washes it is painted as text on"**
   — across `defaultLight`, derive the minimum and maximum of
   `contrastRatio(theme.colors.destructive, theme.colors.hover)` and of
   `...active`. Assert `3.812` / `4.502` / `3.357` / `4.036` (closeTo 3), that
   exactly one hover ratio is `>= 4.5` (the identity), and that every active
   ratio is `< 4.5`. Read the row starting
   `Cross-team: `components` uses `destructiveText`` and assert it contains
   `3.81–4.50:1`, `3.36–4.04:1` and `≥6.37:1`, and does not contain
   `4.04–4.28`, `3.29–3.86` or `5.28`.
3. **"states the error ink's own floor"** — derive the minimum of
   `destructiveText` on `hover` and on `active` across `defaultLight`; assert it
   is close to `6.372` and that the same row names `≥6.37:1`. (Case 2 covers the
   row, so this case holds the derivation itself and the rounding.)
4. **"states the ColorPicker ring's real range and counts"** — over all 24
   `shippedThemes`, derive `foreground` on `foreground`, `primary` and
   `destructive`; assert the first is exactly `1` in every set, the `primary`
   range is `1.565`–`3.595` with `21` values under `3`, and `destructive` is
   `1.974`–`3.480` with `18` under `3`. Assert the tightest
   `Math.sqrt(contrastRatio(theme.colors.foreground,
   theme.colors.background))` is `3.7016` (closeTo 3) and equals the figure
   `contrastRing`'s own doc claims. Read the row starting
   `Cross-team: `components` gives the ColorPicker` and assert it contains
   `1.57–3.59:1`, `21 of the 24`, `1.97–3.48:1`, `18 of 24` and `3.70:1`, and
   does not contain `2.98`.
5. **"can fail on a moved role"** — the proof that the derivation is not a
   restatement: build
   `const moved = extendTheme(lightTheme, { colors: { successText: "#000000" } })`
   and assert `contrastRatio(moved.colors.successText, moved.colors.card)` is
   below `3` and differs from `8.603`, so a palette edit that moved the ink
   would change the figure the row must carry.

Use `–` (en dash) in the expected range strings, matching the rows, and derive
the range strings from the figures rather than typing them twice where the two
ends are asserted anyway.

## 7. Step 3 — the plan index

Add to the `tokens-theme` table, after `828`:

```
| [831](./831-ledger-status-figures.md) | The live cross-team rows quote figures the palette no longer produces | F | 079, 366, 528, 574, 582, 611, 737, 828 | done |
```

and a closing paragraph naming the three rows and the figures.

## 8. Test plan and commands

From the worktree root:

```sh
nub run --filter @gpuixui/tokens test ledger-status-figures.test.ts
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
```

Expected: the new file passes with **six** cases; the package is green with one
more file and six more tests (226 files / 7184 → 227 files / 7190); types clean.

Both directions:

1. **Fails before the row edits.** Run the new file against the current
   `TODO.md`: cases 1–4 fail on the stale figures. That is the proof the guard
   reads the rows, not its own constants.
2. **Fails on a moved palette.** Temporarily change the identity light
   `successText` to `"#000000"` in `color.ts`, run the new file, expect cases 1
   and 5 to fail; restore. (Do not commit the change.)
3. **Passes after the row edits.** Re-run; all six pass.

Then the root gates (`nub run check`, `nub run lint`, `nub run test`); all green.

**Native scenarios.** None. The change edits the ledger, one test and the plan
index; no colour, metric or shipped theme moves, so no playground scenario
changes. Record "no scenario ran" in the commit message.

## 9. STOP conditions

- Stop if the derived status-text figures are not `8.603` / `8.422` / `8.701`:
  another plan moved a role, and the plan's table is wrong — re-derive and
  correct the row with today's numbers, then record the changed figures in the
  commit message.
- Stop if a shipped set's `foreground`-on-`foreground` is not exactly `1`. That
  means a role is aliased in a way the plan does not expect; report it instead of
  relaxing the case.
- Stop if `liveRow` cannot find a row or its next live row: the ledger moved
  under the concurrent writer, so re-read `TODO.md` and re-anchor the start
  strings. Never widen `liveRow` to the whole file — that would let a historical
  row satisfy a claim.
- Stop if any test outside the new file fails. The change touches no source; a
  failure is another writer's work in progress, not this plan's.
- Stop if the root `nub run check` reports a test that asserts nothing. Use the
  derivation cases; do not add a literal-versus-literal assertion.

## 10. Acceptance

- The three live rows state today's figures, and each keeps its conclusion.
- `ledger-status-figures.test.ts` derives the status inks, the two destructive
  ranges, the error ink's floor, the three ColorPicker ranges and the two
  counts, and fails on any of the old figures.
- The package and root gates pass; `ledger-status-figures.test.ts` has six
  cases; no colour, pair, floor, metric, role, platform style or shipped theme
  moves.

## 11. Not changed

- `packages/tokens/src/*.ts` except the new test file; every `Theme` value,
  `contrastFloors`, pair list, metric, role and shipped theme.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and
  `COMPONENTS.md`: these figures are ledger-only.
- The historical `[x]` rows and plan narratives that quote a pre-move figure.
- Every consumer path (`packages/components`, `packages/primitives`, `apps/*`);
  the three migrations stay cross-team rows.
