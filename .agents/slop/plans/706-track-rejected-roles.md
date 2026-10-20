# 706 — The value groove's rejected roles

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (docs truth).
**Depends on:** 309 (the interactive-fill ladder), 332 (the mark class), 347
(the `track` role), 503 (the groove's surface list), 698 (the macOS dark accent
move), 705 (the caret's figures after 698).

## 1. The defect

`docs/tokens.md` justifies the `track` role by rejecting the two roles a value
indicator used to borrow. Both figures in that clause are wrong today, and both
are stated in the present tense:

| Sentence, `docs/tokens.md:3875`                                   | Shipped today |
| ----------------------------------------------------------------- | ------------- |
| "`primary` measures 1.432:1 on the AAA divider"                    | `primary` on the AAA **light** divider is **1.657:1**; **1.432:1** is `success` on the same divider |
| "`primary` measures 2.84:1 on macOS dark" (a pressed wash)         | **3.317:1** since plan 698 moved macOS dark's `primary` from `#0A84FF` to `#2E93FF` |

The second one is load-bearing prose, not just a numeral: the sentence used the
pre-698 figure **under** the 3:1 mark floor as the reason `active` cannot be a
groove. The shipped ratio is now **above** it (3.317:1), so the argument as
written is false. The real objection is direction, not contrast: a groove must
be visible at rest, while `active` is the pressed step and exists only under the
pointer.

The first one misattributes a ratio between two roles: 1.4324 is `success`'s,
not `primary`'s. The decisive figure for "`border` cannot carry the
`PROGRESS_TONES`" is the tightest of the four on any divider — `destructive` on
the AAA **dark** divider at **1.324:1**, under the 4.5:1 mark floor the AAA sets
demand (and the AAA light divider still fails at `success` 1.432:1).

| Pair | Set | Ratio |
| ---- | --- | ----- |
| `primary` on `border` | identity light, high | 1.657 |
| `success` on `border` | identity light, high | 1.432 |
| `destructive` on `border` | identity dark, high | **1.324** (tightest of the four tones) |
| `primary` on `active` | macOS dark, default | **3.317** |
| `primary` on `active` | identity dark, high | 6.939 |

`active` carries the marks comfortably in every set (5.5–11.3), which is exactly
why the old contrast argument cannot be repaired by a numeral: it has to be
replaced by the state argument.

**Why no test caught it.** `figures.ts` guards the two figures in the same
paragraph that plan 536/705 added (the tightest groove surface pair, the
groove-on-`selected` pair), and `track-contrast.test.ts` proves the groove's own
contract, but nothing derives the ratios the *rejection* rests on.
`docs.test.ts` only checks that the page names `trackMarkPairs` and
`trackSurfacePairs`.

## 2. Exact changes

### 2.1 `docs/tokens.md`

In the value-indicator paragraph, replace (lines 3874–3877):

```
on a dark card, and a slider's unfilled span had no shape. `muted` cannot become
a fill — plan `309` tuned it as the panel ladder — `border` is a line role
(`primary` measures 1.432:1 on the AAA divider) and `active` is a pressed wash
(`primary` measures 2.84:1 on macOS dark), so `track` is a designed neutral step
```

with:

```
on a dark card, and a slider's unfilled span had no shape. `muted` cannot become
a fill — plan `309` tuned it as the panel ladder — `border` is a line role, and
the tightest of the four `PROGRESS_TONES` on the AAA dark divider measures
**1.324:1**, under the 4.5:1 mark floor; `active` is a pressed wash (`primary`
measures **3.317:1** on macOS dark's pressed wash, over the 3:1 mark floor, so
the objection is direction, not contrast: a groove must be there at rest, while
a press exists only under the pointer). So `track` is a designed neutral step
```

The rest of the paragraph (the palette values, `trackSurfacePairs`,
`trackMarkPairs`, XP's green, the tightest shipped pairs) is unchanged.

### 2.2 `packages/tokens/src/figures.ts`

Add the two figures the rewritten clause states, beside `trackSelectedFigure`
(after line 520), and register them in `documentedFigures` after
`trackSelectedFigure`:

```ts
/**
 * The two roles `docs/tokens.md` rejects as a groove, and the figures the
 * rejection rests on. `border` is a line role: as a groove it would have to
 * carry the four `PROGRESS_TONES` as marks, and the tightest of them measures
 * 1.324:1 on the AAA dark divider, under the 4.5:1 the mark class demands.
 * `active` is a pressed wash, and its ratio is *not* the objection — `primary`
 * measures 3.317:1 on macOS dark's, over the 3:1 mark floor — because a press
 * exists only under the pointer while a groove must be there at rest. Plan 347
 * had quoted 1.432:1 for `primary` on the AAA divider (that is `success`'s
 * figure) and the pre-698 2.84:1 for macOS dark's pressed wash.
 */
const trackRejectedRoleFigures: ReadonlyArray<DocumentedFigure> = [
  {
    document: "docs/tokens.md",
    name: "the tightest progress tone on the divider",
    pairs: [
      ["primary", "border", "mark"],
      ["success", "border", "mark"],
      ["destructive", "border", "mark"],
      ["mutedForeground", "border", "mark"],
    ],
    kind: "plain",
    claim: "tightest",
    provenance: identityTheme("dark", "high"),
    decimals: 3,
    sentence:
      "the tightest of the four `PROGRESS_TONES` on the AAA dark divider measures **{figure}:1**",
  },
  {
    document: "docs/tokens.md",
    name: "the pressed wash's primary mark",
    pairs: [["primary", "active", "mark"]],
    kind: "plain",
    claim: "value",
    provenance: platformTheme("darwin", "dark", "default"),
    decimals: 3,
    sentence: "`primary` measures **{figure}:1** on macOS dark's pressed wash",
  },
];
```

### 2.3 `packages/tokens/src/figures.ts`

In `documentedFigures`, after `trackSelectedFigure`:

```ts
  trackSurfaceFigure,
  trackSelectedFigure,
  ...trackRejectedRoleFigures,
  ...ringFigures,
```

### 2.4 `docs/tokens.md`

The catalogue paragraph at line 4095 states the table's size. Change
`**29** entries` to `**31** entries`. (`docs.test.ts` derives the number; the
count word table ends at `twenty-five`, so a numeral is the established form.)

### 2.5 `packages/tokens/src/track-contrast.test.ts`

`progressMarks` already lists the four tones. Append this case inside
`describe("the value indicator's track")`:

```ts
  /**
   * Plan 347 rejected `border` and `active` as the groove, and the sentence that
   * said why quoted 1.432:1 for `primary` on the AAA divider — that is
   * `success`'s figure, and `primary` measures 1.657:1 — and macOS dark's
   * pre-698 2.84:1 on the pressed wash. Plan 698 moved that wash to 3.317:1,
   * over the 3:1 mark floor, so the old contrast argument is false.
   *
   * These are the premises the rewritten sentence states: `border` cannot carry
   * the marks at AAA (the tightest tone is under the 4.5:1 floor), while
   * `active` clears the default mark floor and is rejected for direction. A
   * palette move that flips either premise fails here instead of leaving the
   * page with a rationale the shipped sets no longer support.
   */
  it("rejects the two roles its rationale names, for the stated reasons", () => {
    const tightestTone = shippedThemes
      .flatMap(({ theme }) =>
        progressMarks.map((role) => ({
          theme,
          role,
          ratio: contrastRatio(theme.colors[role], theme.colors.border),
        })),
      )
      .reduce((worst, current) =>
        current.ratio < worst.ratio ? current : worst,
      );

    expect(tightestTone.theme.contrast).toBe("high");
    expect(tightestTone.ratio).toBeLessThan(
      contrastFloors[tightestTone.theme.contrast].mark,
    );

    const macOSDark = getPlatformTheme("darwin", "dark");
    expect(
      contrastRatio(macOSDark.colors.primary, macOSDark.colors.active),
    ).toBeGreaterThanOrEqual(contrastFloors.default.mark);

    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replaceAll(/\s+/g, " ");
    expect(page).not.toContain("`primary` measures 1.432:1 on the AAA divider");
    expect(page).not.toContain("`primary` measures 2.84:1 on macOS dark");
  });
```

Add the import:

```ts
import { readFileSync } from "node:fs";
```

`shippedThemes`, `contrastFloors`, `contrastRatio`, `getPlatformTheme` and
`progressMarks` are already in the file.

### 2.6 `TODO.md`

Under *Design tokens and theming (`tokens-theme`)*, append a ticked row after
plan 705's and move the progress bar from `318/395` to `319/396`:

```
`[x]` Hold the value groove's rejected-role rationale to the shipped figures —
the sentence that rejected `border` and `active` as a groove said "`primary`
measures 1.432:1 on the AAA divider" (that is `success`'s figure; `primary` is
1.657:1) and "`primary` measures 2.84:1 on macOS dark" (pre-698; plan 698 moved
it to **3.317:1**, over the 3:1 mark floor, so the contrast argument was
false); the clause now states the tightest tone on the AAA dark divider
(**1.324:1**, under the 4.5:1 mark floor) and rejects `active` for direction —
a press exists only under the pointer — and two `documentedFigures` entries plus
a premise case derive both ratios from `shippedThemes`; no colour, pair, floor,
metric or shipped set moves (plan 706)
```

### 2.7 `.agents/slop/plans/README.md`

Add the row to the `tokens-theme` table after plan 705:

```
| [706](./706-track-rejected-roles.md) | The value groove's rejected roles | F | 309, 332, 347, 503, 698, 705 | done |
```

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Guard first, documents untouched** — apply §2.2, §2.3 and §2.5 only, then:

   ```sh
   nub run --filter @gpuixui/tokens test -- figures.test.ts track-contrast.test.ts
   ```

   Expected: the two new `figures.test.ts` cases fail with
   `docs/tokens.md must quote 1.324:1` / `3.317:1`; the new
   `track-contrast.test.ts` case fails on
   `expect(page).not.toContain("`primary` measures 1.432:1 on the AAA divider")`.
   Every other case stays green. Record the exact failures in §7.

2. **Apply §2.1 and §2.4**, then re-run the same command.

   Expected: all four files' cases pass. If `docs.test.ts`'s "names both suites
   that hold its figures, and the table's size" fails, §2.4 was not applied.

3. **Package suite**:

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: every test file green (193 files / 6792 cases: the 6790 at the
   branch point plus the two derived figure cases; the premise case lives in an
   existing file).

4. **Type check, lint, format, full gate**:

   ```sh
   nub run --filter @gpuixui/tokens check-types
   nub run lint
   nub run fmt
   nub run check
   ```

   Expected: clean. No `any`, no assertions, no native sort, no console.

5. **No scenario runs.** The change touches two documents, one test table entry,
   one test case and the ledger row: no token value, pair, floor, metric,
   platform style or runtime path. The smoke and live playground suites are not
   scoped in, and the commit says so rather than implying a native check.

## 4. STOP conditions

Stop and report instead of improvising if:

- `contrastRatio(primary, border)` on identity high light is not 1.657, or
  `success` on it is not 1.432, or the tightest `PROGRESS_TONE` on `border` is
  not `destructive` on identity high dark at 1.324. The palette has moved since
  this plan; re-audit rather than editing numerals.
- `contrastRatio(primary, active)` on `getPlatformTheme("darwin", "dark")` is not
  3.317, or it is below `contrastFloors.default.mark`. Then the direction
  argument still holds but the sentence's "over the 3:1 mark floor" clause must
  be revisited with evidence.
- The paragraph no longer contains the anchors "`muted` cannot become a fill",
  "`border` is a line role" or "so `track` is a designed neutral step".
  Re-locate it; do not delete an assertion.
- `documentedFigures.length + documentedTierFigures.length` is not 31 after §2.2
  and §2.3. Re-derive the number in §2.4 from the suites instead of guessing.
- Another worktree already owns `706-` (checked with the command below). Take
  the next free number and record it.

```sh
find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/70[6-9]-*"
```

At the time of writing `706` and `707` are free; `705` is the latest global plan.

## 5. Test plan

**The bug the case guards.** A role's rejection is justified with a ratio that
belongs to another role, and a later palette move turns the second ratio from a
failure into a pass, so the page keeps a false argument while every suite is
green. The pre-fix paragraph is the failing fixture: the new figure cases cannot
find their derived sentences in it, and the premise case finds both stale
clauses.

**Both directions.**

- Without §2.1/§2.4: the two derived figure cases fail (no `1.324:1` /
  `3.317:1` sentence), and the premise case fails on the stale `1.432` clause.
- With them: all pass. The premise case still derives its floor comparison from
  `contrastFloors` and its roles from `progressMarks`, so a future palette move
  that makes `border` viable at AAA, or drops `active` under the mark floor,
  fails instead of silently validating the page.

**What the case must not do.** It must not treat the absence of the stale string
as the whole guard: the two `documentedFigures` entries derive the replacement
figures from `shippedThemes` and assert the named set, so the page cannot quote a
right number for the wrong palette.

## 6. Acceptance

- The paragraph states `border`'s failure with the tightest `PROGRESS_TONE`
  (1.324:1 on the AAA dark divider, under the 4.5:1 mark floor) and rejects
  `active` for direction at the shipped 3.317:1.
- No stale `1.432:1 for primary` or `2.84:1 on macOS dark` clause remains.
- Two derived figure cases and one premise case, with the pre-fix failures
  recorded verbatim in §7.
- `nub run check`, `nub run lint`, `nub run fmt` and the tokens suite are green.
- `TODO.md` and the plan index carry the change.
- One commit on `agent/tokens-theme`, pushed to `origin`.

## 7. Execution notes (2026-10-20)

Ran from this worktree on `agent/tokens-theme`.

1. **Guard first, documents untouched** — with §2.2, §2.3 and §2.5 applied and
   the page unchanged, four cases failed:

   ```
   FAIL  src/docs.test.ts > docs/tokens.md quoted tightest figures > names both suites that hold its figures, and the table's size
   FAIL  src/figures.test.ts > figures the catalogue states in the present tense > derives the tightest progress tone on the divider
   FAIL  src/figures.test.ts > figures the catalogue states in the present tense > derives the pressed wash's primary mark
   FAIL  src/track-contrast.test.ts > the value indicator's track > rejects the two roles its rationale names, for the stated reasons
   ```

   The docs case failed with
   `expected '`packages/tokens/src/figures.ts` hold…' to contain '**31**'`,
   because the two new entries make 31; the figure cases failed on the missing
   sentence; the premise case failed on the stale
   "`primary` measures 1.432:1 on the AAA divider" clause. The rest of the suite
   stayed green.

2. **§2.1 and §2.4 applied, same command** — `193 passed (193)`,
   `6793 passed (6793)`.

3. **Package suite** — `nub run --filter @gpuixui/tokens test`: 193 files,
   6793 cases, green (6791 at the branch point plus the two derived figure
   cases; the premise case joined an existing file).

4. **`nub run check`, `nub run lint`, `nub run fmt`** — `check:tests`
   ("every test asserts something, and nothing asserts itself"), `oxlint`,
   `oxfmt` (284 files) and `tsc` on `packages/tokens` and `packages/deploy` are
   clean.

5. **No scenario ran, deliberately.** The change touches two documents, two
   table entries, one test case and the ledger row: no token value, metric,
   pair, platform style, provider or runtime path. The smoke and live playground
   suites are therefore not scoped in, and the commit says so rather than
   implying a native check.

### Divergences from the plan

- The suite total is 6793, not the 6792 estimated in §3.3; the branch point
  carried 6791 cases, not 6790.
- No other file quoted the stale figures: a repository-wide search found them
  only in `docs/tokens.md` and the historical plan `347`.

