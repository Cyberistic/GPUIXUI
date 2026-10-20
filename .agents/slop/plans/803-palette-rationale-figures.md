# 803 — The palette's inline rationale figures have no owner

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `528`, `729`,
`737`, `504`, `800`.

## 1. The defect

`packages/tokens/src/color.ts` carries four inline `//` rationales on individual
palette entries. Each quotes a figure a reader uses to judge the value, and **no
suite reads any of them**:

1. `darkColors.disabled` (line 538):
   > Neutral-850 is the `muted` panel and the `popover`, so an unavailable
   > control had no fill on either; the next ramp step is the fill's own neutral
   > and clears both at **1.131:1** (plan 737).

2. `highContrastLightColors` on the four panel inks (lines 596–601):
   > The four panel inks sit one step below the ramp's 950 stop: the AAA caption
   > (`mutedForeground` `#1F1F1F`) is far above its 7:1 floor, so the 950 values
   > left a caption and the panel's own ink **1.003–1.042:1** apart. These keep a
   > **1.109–1.133:1** step on every tint (plan 729).

3. `highContrastDarkColors.softAction` (lines 714–717):
   > One step darker than the identity dark fill: the AAA white label keeps its
   > 7:1 floor through the inverse selection veil (**7.165:1**) and the raised
   > action still clears 1.05:1 on every AAA soft tint (**1.071:1** at the
   > tightest).

The suites that look like they own these numbers do not:

- `disabled-fill-claims.test.ts` reads the `lightColors` **doc block** and the
  `ThemeColors.disabled` **JSDoc** (plans 747 and 750), never an inline comment,
  and never derives a ratio.
- `soft-panel-caption-tier.test.ts` derives the **current** step on every
  shipped set and pins the *document's* minima, but it never reads the comment at
  `color.ts:596`, so both ranges in it — and the quoted `#1F1F1F` — are unowned.
- `platform-claims.test.ts` owns the figures in `platform-styles/**` (plans 535,
  799, 800), not the palette.

The failure mode is the one plans `785`, `798`, `799` and `800` closed for other
comments: a palette edit that keeps every pair list above its floor (so
`themeFailures` stays `[]`) changes the margin these sentences quote, and the
suite stays green while the file a consumer copies and edits states a number the
package no longer produces. The historical defects the same file also quotes —
`2.983:1` (plan 516) and `5.376:1` (plan 528) — **are** owned: `ring-track.test.ts`
and `selection-link.test.ts` plant their pre-fix hexes and assert the exact
ratio, so they are out of scope.

## 2. What the figures are today

All values below were computed through `contrastRatio` / `compositeOver` on the
shipped palette (see §7 for the commands that re-derive them):

```
Identity dark (#2A303B disabled, #222730 muted = popover = neutral-850):
  disabled on muted    1.1309715 → 1.131
  disabled on popover  1.1309715 → 1.131
  disabled is neutral-800, muted and popover are neutral-850

High-contrast light panel inks, ink/caption step on each Soft fill:
  950 stop planted as the ink   1.0031 – 1.0421 → 1.003–1.042
  shipped inks (plan 729)       1.1095 – 1.1326 → 1.109–1.133
  mutedForeground               #1F1F1F
  floors.high.body              7

High-contrast dark raised action (#343B47, softActionForeground #FFFFFF):
  label through the 15% inverse veil on softAction   7.1647279 → 7.165
  softAction on the four Soft tints, tightest        1.0714 (warningSoft) → 1.071
  floors.high.step                                   1.05
```

No shipped value is wrong. The fix is the guard, not the palette.

## 3. Decision

Add one suite, `packages/tokens/src/palette-rationale-figures.test.ts`, that is
the owner of every **current** figure quoted inside the palette object. It:

1. reads `color.ts` and joins only its `//` comment lines into one collapsed
   string, so a sentence split across three lines is still matchable;
2. derives each figure from the shipped palette through the public maths —
   `contrastRatio`, `compositeOver`, `contrastFloors`;
3. derives the **pre-729** range without dead hexes: the comment itself says the
   old inks were "the ramp's 950 stop", so the suite plants
   `palette[toneRamp][950]` on the shipped AAA light fills;
4. asserts the whole sentence, so a retyped digit, a stale floor word, a moved
   surface name or a palette edit fails until the prose follows.

The suite does not read the whole `color.ts` as one string: it anchors on each
sentence's own leading words so a figure cannot be satisfied from a neighbouring
comment.

## 4. Files to change

1. **create** `packages/tokens/src/palette-rationale-figures.test.ts` (new suite,
   ~90 lines).
2. `.agents/slop/plans/README.md` — plan row `803` and a closing paragraph.
3. `TODO.md` — a ticked row in the tokens section.

No file under `packages/tokens/src/` other than the new test changes. No colour,
pair, floor, metric, role, platform style, recipe or shipped theme moves.

## 5. Step 1 — the file, imports and helpers

```ts
/**
 * Guards the figures the palette's own inline rationales state. Plans 737, 729
 * and 504 shipped the pairs and the values, but the comments beside the entries
 * were never read: `disabled-fill-claims.test.ts` reads the `lightColors` doc
 * block and the role JSDoc, `soft-panel-caption-tier.test.ts` derives the current
 * step, and neither sees a `//` line. A palette edit that stays above every floor
 * therefore leaves the file a consumer copies quoting a margin the package no
 * longer produces — the class plans 785, 798, 799 and 800 closed for the platform
 * and recipe files.
 *
 * The pre-729 range needs no dead hexes: its own sentence names "the ramp's 950
 * stop", so the suite plants `palette[ramp][950]` on the shipped AAA light fills
 * and recomputes the caption/ink step.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  palette,
} from "./color.js";
import { compositeOver, contrastFloors, contrastRatio } from "./contrast.js";
import { statusTones } from "./styles.js";

const source = readFileSync(new URL("./color.ts", import.meta.url), "utf8");

/** Only the `//` lines, collapsed, so a multi-line sentence is one string. */
const comments = source
  .split("\n")
  .filter((line) => line.trimStart().startsWith("//"))
  .map((line) => line.trimStart().slice(2).trim())
  .join(" ")
  .replaceAll(/\s+/g, " ");

const fixed = (value: number, digits: number): string => value.toFixed(digits);

/** The en-dash range a rationale prints, at its own precision. */
const range = (ratios: ReadonlyArray<number>, digits: number): string =>
  `${fixed(Math.min(...ratios), digits)}–${fixed(Math.max(...ratios), digits)}`;

/** The ramp each status family's soft tint was mixed from. */
const rampOf = {
  info: "blue",
  success: "green",
  warning: "amber",
  destructive: "red",
} as const;

/** The soft fill a status panel paints, per tone. */
const softFill = (tone: (typeof statusTones)[number]) =>
  `${tone}Soft` as const;

/** The panel ink a status panel paints on its own tint, per tone. */
const softInk = (tone: (typeof statusTones)[number]) =>
  `${tone}SoftForeground` as const;
```

Type note: `softFill`/`softInk` must return a key of `ThemeColors`. The template
literal type narrows to `` `${StatusTone}Soft` `` / `` `${StatusTone}SoftForeground` ``,
which are members of `ThemeColors`; if `check-types` disagrees, inline
`theme.colors[\`${tone}Soft\`]` in the `map` instead of adding a cast (see §8).

## 6. Step 2 — the three cases

```ts
describe("the palette's inline rationale figures", () => {
  it("holds the disabled fill's step off the panel it sits near", () => {
    const surfaces = ["muted", "popover"] as const;
    const steps = surfaces.map((surface) =>
      contrastRatio(darkColors.disabled, darkColors[surface]),
    );

    expect(fixed(Math.min(...steps), 3)).toBe(
      fixed(Math.max(...steps), 3),
      "muted and popover are one value, so 'both' needs one figure",
    );
    expect(darkColors.disabled).toBe(palette.neutral[800]);
    expect(darkColors.muted).toBe(palette.neutral[850]);
    expect(darkColors.popover).toBe(palette.neutral[850]);

    expect(comments).toContain(
      "Neutral-850 is the `muted` panel and the `popover`, so an unavailable " +
        "control had no fill on either; the next ramp step is the fill's own " +
        `neutral and clears both at ${fixed(steps[0] ?? Number.NaN, 3)}:1 ` +
        "(plan 737).",
    );
  });

  it("holds the AAA light panel inks to both steps they quote", () => {
    const colors = highContrastLightColors;
    const step = (ink: string): ReadonlyArray<number> =>
      statusTones.map(
        (tone) =>
          contrastRatio(ink === "950" ? palette[rampOf[tone]][950] : colors[softInk(tone)], colors[softFill(tone)]) /
          contrastRatio(colors.mutedForeground, colors[softFill(tone)]),
      );

    const before = step("950");
    const after = statusTones.map(
      (tone) =>
        contrastRatio(colors[softInk(tone)], colors[softFill(tone)]) /
        contrastRatio(colors.mutedForeground, colors[softFill(tone)]),
    );

    expect(range(before, 3)).toBe("1.003–1.042");
    expect(range(after, 3)).toBe("1.109–1.133");

    expect(comments).toContain(
      "The four panel inks sit one step below the ramp's 950 stop: the AAA " +
        `caption (\`mutedForeground\` \`${colors.mutedForeground}\`) is far ` +
        `above its ${contrastFloors.high.body}:1 floor, so the 950 values left ` +
        `a caption and the panel's own ink ${range(before, 3)}:1 apart. These ` +
        `keep a ${range(after, 3)}:1 step on every tint (plan 729).`,
    );
  });

  it("holds the AAA raised action and its label through the inverse veil", () => {
    const colors = highContrastDarkColors;
    const throughVeil = contrastRatio(
      colors.softActionForeground,
      compositeOver(colors.selectionOnFill, colors.softAction),
    );
    const tightestFill = Math.min(
      ...statusTones.map((tone) =>
        contrastRatio(colors.softAction, colors[softFill(tone)]),
      ),
    );

    expect(fixed(throughVeil, 3)).toBe("7.165");
    expect(fixed(tightestFill, 3)).toBe("1.071");

    expect(comments).toContain(
      "One step darker than the identity dark fill: the AAA white label keeps " +
        `its ${contrastFloors.high.body}:1 floor through the inverse selection ` +
        `veil (${fixed(throughVeil, 3)}:1) and the raised action still clears ` +
        `${contrastFloors.high.step}:1 on every AAA soft tint ` +
        `(${fixed(tightestFill, 3)}:1 at the tightest).`,
    );
  });
});
```

The `ink === "950"` sentinel in the second case is awkward; prefer two explicit
arrays with no branch:

```ts
const before = statusTones.map(
  (tone) =>
    contrastRatio(palette[rampOf[tone]][950], colors[softFill(tone)]) /
    contrastRatio(colors.mutedForeground, colors[softFill(tone)]),
);
const after = statusTones.map(
  (tone) =>
    contrastRatio(colors[softInk(tone)], colors[softFill(tone)]) /
    contrastRatio(colors.mutedForeground, colors[softFill(tone)]),
);
```

## 7. Test plan

From `packages/tokens`:

```sh
nub exec vitest run src/palette-rationale-figures.test.ts
nub run check-types
```

Expected: three new cases green; type check clean.

**Prove every case can fail** (revert each mutation afterwards):

1. `color.ts`: `1.131:1` → `1.130:1` → case 1 fails on the sentence.
2. `color.ts`: `disabled: palette.neutral[800]` → `palette.neutral[750]` → case 1
   fails on the ramp assertion (and the derived figure changes).
3. `color.ts`: `1.003–1.042` → `1.004–1.042` → case 2 fails.
4. `color.ts`: `1.109–1.133` → `1.110–1.133` → case 2 fails.
5. `color.ts`: `softAction: "#343B47"` → `"#353C48"` → case 3 fails on both the
   veil figure and the tint step until the sentence follows.
6. `color.ts`: the **AAA dark** `selectionOnFill` (`#FFFFFF26` directly under
   `selection: "#4C39B54D"`; the same literal appears in three palettes, so
   target that pair) → `"#FFFFFF33"` → case 3 fails with the veil figure at
   `6.124` (the pair lists still pass, which is the point).
7. `color.ts`: `#1F1F1F` is generated from `colors.mutedForeground`, so changing
   the AAA light `mutedForeground` fails case 2 until the comment follows.

Then the workstream gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: `212 + 1` files green; `check` and `lint` clean.

## 8. STOP conditions

- Stop if a shipped token has to move: this plan guards figures, it changes no
  palette.
- Stop if a case needs a cast, `any`, a hand-typed ratio or a second file-reading
  helper: every number comes from `contrastRatio`/`compositeOver`/
  `contrastFloors`, and the only file read is `color.ts`.
- Do not widen this plan to the `2.983:1` and `5.376:1` historical figures
  (`ring-track.test.ts` and `selection-link.test.ts` own them), to the
  `lightColors` doc block (`disabled-fill-claims.test.ts` owns it), or to the
  platform and recipe files (`platform-claims.test.ts`, plans `535`/`800`).
- If a derived figure differs from §2, stop and record the discovery — do not
  tune the test to the sentence or the sentence to the test.

## 9. Acceptance

- The suite derives all six current figures (`1.131`, `1.003`, `1.042`, `1.109`,
  `1.133`, `7.165`, `1.071`) and the quoted hex `#1F1F1F`, and holds the three
  sentences; each case fails under its §7 mutation and passes when reverted.
- `nub run --filter @gpuixui/tokens test` is green and
  `nub run --filter @gpuixui/tokens check-types` is clean.
- `TODO.md` ticks the row, and the plan index lists `803`.
