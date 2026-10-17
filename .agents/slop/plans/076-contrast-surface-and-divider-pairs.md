# 076 — The soft surfaces and dividers the contrast contract never checked

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `013` (high contrast), `014` (status tones), `056`–`059` (catalogue guards), `063` (platform styles), `071`–`075` (contrast contract) |
| Status | done |

This plan is self-contained. A weaker executor can follow it in order.

---

## 1. Why

`themeContrastFailures` is documented as **the library's guarantee in one
assertion**: `COMPONENTS.md` says it returns "the same 48 pairs and floor table
that `color.test.ts` and `platforms.test.ts` enforce", and `docs/tokens.md` says
it measures every documented pair. An audit against the suites found two checks
that the public contract never ran:

1. **Soft status surfaces are never checked against the canvas.** `color.test.ts`
   asserts every `xSoft` role is perceivable (≥ 1.05:1) against `background` and
   `card`; `contrastPairs` has no such pair. A brand theme or a copied platform
   style can set `successSoft` equal to `background` — an Alert that is invisible —
   and `themeContrastFailures` returns `[]`.
2. **The high-contrast decorative border is never checked.** `color.test.ts`
   asserts `border` on `background` reaches 3:1 at high contrast; the public
   contract has no `border` pair at all, so a high-contrast brand theme can ship
   invisible dividers and still pass.

The audit also found a **real defect in the shipped themes**, hidden by the same
gap. Platform styles override `background`/`card` but inherit the identity's
soft status tints, and the platforms suite never checked the soft pairs:

| Variant | Pair | Measured |
| ------- | ---- | -------- |
| Linux dark | `destructiveSoft` on `card` | **1.005:1** |
| Linux dark | `successSoft` on `card` | 1.035:1 |
| Linux dark | `infoSoft` on `card` | 1.037:1 |
| macOS light | `successSoft` on `background` | 1.022:1 |
| macOS light | `warningSoft` on `background` | 1.022:1 |
| Linux light | `successSoft`/`warningSoft` on `background` | 1.047:1 |
| Windows light | `successSoft`/`warningSoft` on `background` | 1.028:1 |

Every one is below the 1.05 floor the library says it enforces, and the identity
passes only because its canvas happens to sit far enough from the tint. The
design-system page states the 1.05 floor as a property of **every shipped colour
set**; today that is false for nine platform pairs.

## 2. Design decisions (do not re-litigate)

1. **Fix the shared soft tier, not each platform.** The soft status pair is a
   semantic surface, and the design system says status roles stay put across
   platform variants. Tuning five identity values makes one status palette valid
   on every shipped canvas; overriding status colours per platform would fork
   "reserved for status" into four palettes and contradict §5 of the
   design system.
2. **Tint harder where the canvas moved.** The five new values sit between two
   palette steps so the surface stays a tint rather than a fill, and each clears
   the strictest shipped canvas with margin: light `successSoft`/`warningSoft`
   target the macOS canvas (`#F2F2F7`), dark `infoSoft`/`successSoft`/
   `destructiveSoft` target the Linux card (`#303030`).
3. **The soft pair belongs in the public pair list.** It is a pair of roles with
   a floor, exactly like a text pair, so it joins `contrastPairs` under a new
   `surface` class. The alternative — a second list and a second loop — would
   recreate the drift this plan removes.
4. **A decorative border gets its own class.** `border` is deliberately subtle,
   so it belongs in no text class. It joins as `divider`: 1.05:1 at default (a
   divider must be perceivable) and 3:1 at high contrast (the check the suite
   already ran), which is stricter than today at default and identical at high.
5. **Surfaces the contract names are the surfaces the docs name.** Soft surfaces
   and dividers are measured on `background`, `card` and `popover`, because an
   Alert, Badge, Toast or divider can sit inside a dialog, popover or toast —
   the same reasoning as plan `074` for `xText` and `borderStrong`.
6. **No new export.** `contrastPairs`, `contrastFloors` and
   `themeContrastFailures` already carry the contract; this plan widens their
   data and updates the two documents that describe it.
7. **The suite keeps one description.** `color.test.ts`'s bespoke soft-surface
   and high-contrast-border blocks are deleted, because the generic loop over
   `contrastPairs` now covers them. Two descriptions of one floor is exactly how
   the gap appeared.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/076-contrast-surface-and-divider-pairs.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its explanatory paragraph |
| `packages/tokens/src/color.ts` | five soft-role values in `lightColors` / `darkColors` |
| `packages/tokens/src/contrast.ts` | two pair classes, 15 pairs, two floor rows, the JSDoc that defines them |
| `packages/tokens/src/color.test.ts` | delete the duplicated soft-surface and high-contrast-border blocks |
| `packages/tokens/src/contrast.test.ts` | new floor literal, pair count, and two failure tests |
| `packages/tokens/src/platforms.test.ts` | header comment names the defect the suite now guards |
| `packages/tokens/src/docs.test.ts` | guard the new floor rows and the soft-surface prose |
| `docs/tokens.md` | five table values, the pair count/prose, the floors example, the verification paragraph |
| `docs/design-system.md` | the soft-surface row names `popover`; add the divider row; state that platform variants are covered |
| `packages/tokens/README.md` | name the surface/divider pairs in the contrast section |
| `COMPONENTS.md` | Token, status-tone and contrast rows: the new pair count and the platform fix |
| `TODO.md` | one ticked row and the progress bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's paths.

## 4. Exact changes

### 4.1 `packages/tokens/src/color.ts`

In `lightColors`:

```diff
-  successSoft: palette.green[100],
+  successSoft: "#C2F4D6",
-  warningSoft: palette.amber[100],
+  warningSoft: "#FFE3A3",
```

In `darkColors`:

```diff
-  infoSoft: palette.blue[900],
+  infoSoft: "#16356F",
-  successSoft: palette.green[900],
+  successSoft: "#0C452D",
-  destructiveSoft: palette.red[900],
+  destructiveSoft: "#6B1A1D",
```

Why these five and not the palette steps: each is between the ramp step the
identity used and the next one, so the tint stays soft. Measured floors (the
probe that produced them is plan §6):

| Value | Strictest canvas | Ratio | `xSoftForeground` on it |
| ----- | ---------------- | ----- | ----------------------- |
| `#C2F4D6` | macOS light `#F2F2F7` | 1.094 | `#0E5135` 7.66:1 |
| `#FFE3A3` | macOS light `#F2F2F7` | 1.122 | `#4B3100` 9.65:1 |
| `#16356F` | Linux dark card `#303030` | 1.114 | `#DEE9FF` 9.70:1 |
| `#0C452D` | Linux dark card `#303030` | 1.197 | `#D3F9E2` 9.67:1 |
| `#6B1A1D` | Linux dark card `#303030` | 1.125 | `#FFE0E0` 9.49:1 |

`infoSoft` and `destructiveSoft` in light, and `warningSoft` in dark, already
clear every shipped canvas and do **not** move.

### 4.2 `packages/tokens/src/contrast.ts`

1. Extend the class union:

```ts
export type ContrastPairClass =
  | "body"
  | "secondary"
  | "boundary"
  | "surface"
  | "divider";
```

and its JSDoc: `surface` is the perceivability of one surface against another,
`divider` the perceivability of a decorative border.

2. Add these pairs at the end of `contrastPairs` (15 new, in this order):

```ts
  ...softSurfacePairs,
  ["border", "background", "divider"],
  ["border", "card", "divider"],
  ["border", "popover", "divider"],
```

where `statusToneSoftPairs` is a local literal:

```ts
const softSurfaceRoles = [
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const softSurfacePairs: readonly ContrastPair[] = softSurfaceRoles.flatMap(
  (role) =>
    (["background", "card", "popover"] as const).map(
      (background): ContrastPair => [role, background, "surface"],
    ),
);
```

`contrastPairs` is declared after these constants; keep the exported array a
literal so a reader sees the order, and spread the generated block. Expand the
array's JSDoc to say it also holds surface and divider pairs.

3. Extend `contrastFloors`:

```ts
export const contrastFloors: Readonly<
  Record<ThemeContrast, Readonly<Record<ContrastPairClass, number>>>
> = {
  default: { body: 7, secondary: 4.5, boundary: 3, surface: 1.05, divider: 1.05 },
  high: { body: 7, secondary: 7, boundary: 4.5, surface: 1.05, divider: 3 },
};
```

4. Update the JSDoc of `ContrastPair` and `ContrastFailure` so `foreground`
reads: "the role carrying text, or the surface being perceived". No shape
change.

5. Update `themeContrastFailures`'s JSDoc: "every documented pair — text,
status, selection, surface and divider".

### 4.3 `packages/tokens/src/color.test.ts`

Delete the `softRoles` constant and the `"soft status surfaces"` block
(lines 105–127), and the `"high-contrast boundaries"` block (lines 63–81). The
generic `contrastPairs` loop above them now covers both at the shipped floors.
Keep the text-selection block: the contract represents the wash as a
`ContrastFailure` with `wash: "selection"`, not as a `contrastPairs` row.

### 4.4 `packages/tokens/src/contrast.test.ts`

- Header comment: add the defect — the contract promised "every documented
  pair" while the suites checked soft status surfaces and the high-contrast
  divider outside it, and nine platform pairs were below the soft floor.
- `contrastFloors` test literal gains the two new classes.
- `covers every documented pair`: `48` → `63`.
- New test:

```ts
it("reports a soft status surface that vanishes into its canvas", () => {
  const invisible = extendTheme(getTheme("light"), {
    colors: { successSoft: getTheme("light").colors.background },
  });
  const failures = themeContrastFailures(invisible).filter(
    ({ pairClass }) => pairClass === "surface",
  );
  expect(failures.map(({ foreground, background }) => [foreground, background])).toEqual([
    ["successSoft", "background"],
    ["successSoft", "card"],
    ["successSoft", "popover"],
  ]);
  expect(failures.every(({ floor, ratio }) => floor === 1.05 && ratio === 1)).toBe(true);
});
```

- New test:

```ts
it("reports an invisible divider at the level it declares", () => {
  const invisible = extendTheme(getTheme("light", "high"), {
    colors: { border: getTheme("light", "high").colors.background },
  });
  const failures = themeContrastFailures(invisible).filter(
    ({ pairClass }) => pairClass === "divider",
  );
  expect(failures.map(({ background }) => background)).toEqual([
    "background",
    "card",
    "popover",
  ]);
  expect(failures.every(({ floor, ratio }) => floor === 3 && ratio === 1)).toBe(true);
});
```

### 4.5 `packages/tokens/src/platforms.test.ts`

Its generic `contrastPairs` loop and `clears the documented contract on every
variant` test already become the regression guard once §4.2 lands. Update the
file's header comment to name the bug: *"Plan 076: platform styles changed the
canvas but inherited the identity's soft status tints; Linux dark's
`destructiveSoft` measured 1.005:1 on its card. The contract now includes the
soft surfaces, so every variant is checked on its own canvas."* No new test
body — a second copy of the loop would be a second description.

### 4.6 `docs/tokens.md`

- Default colour table: five value cells, from `lightColors`/`darkColors`.
- Status tones prose: mention the soft surface is held to 1.05:1 on
  `background`, `card` and `popover` by the public contract.
- `### Checking a theme`: state that the pair list holds text, status,
  selection, surface and divider pairs; update the floors example to
  `{ body: 7, secondary: 4.5, boundary: 3, surface: 1.05, divider: 1.05 }` and
  the high line to include both new classes; replace "naming the foreground,
  background" with "naming the two roles".
- `## Verification`: say the suites now check the surface and divider pairs
  through the contract, and that platform variants are held to them on their own
  canvases.
- Any "48 pairs" figure becomes "63 pairs".

### 4.7 `docs/design-system.md`

- §9 table: the soft row becomes
  `| soft status surface (`xSoft`) on `background`/`card`/`popover` | 1.05:1 | 1.05:1 |`
  and gains
  `| decorative dividers (`border`) on `background`/`card`/`popover` | 1.05:1 | 3:1 |`.
- The sentence "The test runs for every shipped colour set" becomes "every
  shipped colour set, platform variants included".
- §7's "border is decorative … intentionally subtle" stays; add that it is
  held to the perceivability floor, so subtle never means invisible.

### 4.8 `packages/tokens/README.md`

The contrast paragraph names the surface and divider pairs and says every
shipped theme, platform variants included, passes the same list.

### 4.9 `COMPONENTS.md`

- `Design tokens` row: the role set is unchanged (53), the soft values moved;
  say the soft status surfaces are now perceivable on every platform canvas.
- `Status tones` row: say the soft pair is measured on `background`, `card` and
  `popover` at 1.05:1 by the contract.
- `Theme contrast check` row: `48` → `63` pairs, floor table
  `7 / 4.5 / 3 / 1.05 / 1.05` default and `7 / 7 / 4.5 / 1.05 / 3` high, and
  name the platform defect this plan fixed.
- `Platform style variants` row: say each variant's soft surfaces are checked on
  its own canvas.

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test          # exit 0; 745 → 881 tests
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run fmt                                    # exit 0
nub run test                                   # exit 0
```

The net is +136 tests: the contract loop grows by 15 pairs × 4 colour sets in
`color.test.ts` (+60) and 15 × 6 platform sets in `platforms.test.ts` (+90), two
new tests in `contrast.test.ts`, one new prose guard in `docs.test.ts`, and 18
bespoke `it` cases leave `color.test.ts` with their duplicated blocks. Read the
actual totals and record them in the commit message: the important number is
**zero failures**.

## 6. Test plan and both directions

The defect must be demonstrable in both directions:

1. **Before the value fix**, with §4.2 applied, run the tokens suite: the
   generic contract loop and `clears the documented contract on every variant`
   fail for the nine platform pairs in §1. Record the output. Apply §4.1; they
   pass. This is the regression proof for the shipped defect.
2. **Before the pair-list fix**, the new `contrast.test.ts` tests fail because
   no `surface`/`divider` failures are produced. With §4.2 they pass.
3. Prove the floor is not decorative: temporarily set
   `contrastFloors.default.surface` to `1` (do not commit). The
   `vanishes into its canvas` test fails on `floor`; restore.
4. Prove the divider class is level-aware: temporarily set
   `contrastFloors.high.divider` to `1.05`. The `invisible divider` test fails
   on `floor`; restore.
5. Prove the docs are derived, not retyped: change one soft value in
   `color.ts` without the document; `docs.test.ts` fails on the colour table.
   Restore.

## 7. STOP conditions

Stop and report if:

- a new value does not clear 1.05 on **every** shipped canvas or its
  `xSoftForeground` drops below 7:1 — do not lower a floor to fit a colour; pick
  a stronger tint and state the measurements;
- a shipped theme still fails a pair after the update for a reason not covered
  by §4.1 — that is a second defect; report the pair and its ratio rather than
  adding an override;
- adding the pairs changes `quietBrandFailures`, `quietHighContrastFailures` or
  `quietRingFailures` in `contrast.example.ts` — those examples isolate one
  defect each; report rather than editing their expectations blindly;
- a document cannot be guarded from the implementation (a hand-written count
  with no derivation) — add the derivation, do not assert a literal back to
  itself (`scripts/check-tests.ts` rejects it);
- `themeContrastFailures` would need to change its public shape to carry a
  surface pair — it should not: the pair shape already expresses it; stop and
  report if the type forces a breaking change;
- any command in §5 fails for a reason unrelated to these files — report it.

## 8. Acceptance criteria

- Every shipped colour set — identity, high contrast and all twelve
  platform/mode variants — passes `themeContrastFailures` with **no** surface or
  divider omission, and a theme that breaks one is named by the checker.
- `contrastPairs` holds 63 pairs and `contrastFloors` states `surface` and
  `divider` for both levels; `color.test.ts` and `platforms.test.ts` read the
  same list.
- The five soft values are documented in both colour tables and the design
  system's floor table; no document states the old values or the old pair count.
- `packages/tokens/README.md`, `COMPONENTS.md` and `TODO.md` match the shipped
  contract and name the fixed defect.
- The plan is indexed in `.agents/slop/plans/README.md` with its paragraph.
- `nub run check`, `nub run lint`, `nub run fmt` and `nub run test` exit 0.

## 9. Verification record

- `nub run --filter @gpuixui/tokens test`: 16 files, **881 tests pass**.
- `nub run check`, `nub run lint`, `nub run fmt`, `nub run test`: exit 0.
- Two directions, observed on this branch:
  1. Reverting light `successSoft` to `palette.green[100]` fails five tests —
     `darwin`/`linux`/`win32 light: successSoft on background meets 1.05:1`,
     `clears the documented contract on every variant`, and the colour-table
     guard. Restored.
  2. Removing `...softSurfacePairs` fails `covers every documented pair`
     (51 ≠ 63), `reports a soft status surface that vanishes into its canvas`
     (`[]`), and the prose guard. Restored.
  3. Lowering `contrastFloors.high.divider` to `1.05` fails four tests,
     including `reports an invisible divider at the level it declares` and both
     floor-table guards. Restored.
- The five soft values were checked against every shipped canvas by the probe in
  §4.1: the strictest light surface is macOS `#F2F2F7`, the strictest dark
  surface the Linux card `#303030`; every `xSoftForeground` pair stays above
  7:1.
