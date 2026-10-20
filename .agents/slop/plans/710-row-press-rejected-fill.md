# 710 — The row press's rejected fill

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (docs truth).
**Depends on:** 332 (the mark class), 502 (the direction check), 619 (the row
press), 622 (the row-press ladder), 651 (`selectedActive`), 698 (the macOS dark
accent move), 705, 706 (the figures that drifted after 698).

## 1. The defect

`docs/tokens.md` rejects `accentActive` as a selectable row's press with a
figure:

> The row keeps `active` rather than `accentActive`: that role is a filled
> control's press, and on macOS dark a row label measures **6.677:1** on it,
> under the 7:1 body floor.

The figure is correct today (`foreground` on `accentActive` in
`getPlatformTheme("darwin", "dark")` is **6.677:1**), but **no test derives it**:
the literal `6.677` appears only in that sentence, and no suite measures
`foreground` on `accentActive` at all.

The premise is fragile, not hypothetical:

- Plan `698` moved macOS dark's whole accent family one designed step
  (`#0A84FF` → `#2E93FF`) so a selected option's check clears the mark floor on
  `selected`. `accentActive` is part of that family.
- Plan `706` found the **neighbouring paragraph** still quoting the pre-698
  `2.84:1` for `primary` on macOS dark's `active` wash, and a figure belonging
  to another role — after 705 had fixed the caret's figures in the same section.
- The sentence's argument has two halves, and only one is a ratio: *macOS dark
  misses the body floor on `accentActive`* **and** *no shipped set misses it on
  `active`*, the role the row keeps. Nothing measures either half as a premise,
  so a palette move that made `accentActive` readable — or `active` unreadable —
  would leave the rejection justified by a failure that no longer exists.

**Measured today** (`shippedThemes`, body floor `contrastFloors.default.body` =
7):

| Pair | Sets under 7:1 | Tightest |
| ---- | -------------- | -------- |
| `foreground` on `accentActive` | **1** — `Dark · macOS` | 6.677 (`Dark · macOS`) |
| `foreground` on `active` | **0** | 9.131 (`Dark · macOS`) |

`Dark · macOS` is the only set whose row label fails on `accentActive`, which is
why the sentence names that set; and it is also the set where the kept role is
*closest* to the floor (9.131), so naming it is the sharpest test of both halves.

## 2. Exact changes

### 2.1 `packages/tokens/src/figures.ts`

Add beside `trackSelectedFigure` (before it is registered at line ~690):

```ts
/**
 * The fill `docs/tokens.md` rejects as a selectable row's press, and the figure
 * the rejection rests on. `accentActive` is the accent *family's* pressed fill —
 * a filled control's press, not a row wash — and on macOS dark a row label on it
 * measures 6.677:1, under the 7:1 body floor. The row keeps `active` instead.
 * Plan 698 moved the macOS dark accent family one step after this sentence was
 * written, so the figure is derived rather than trusted; the sibling premise
 * (every set clears the floor on `active`) lives in
 * `row-press-direction.test.ts`.
 */
const rowPressFillFigure: DocumentedFigure = {
  document: "docs/tokens.md",
  name: "the row label on the pressed accent fill",
  pairs: [["foreground", "accentActive", "body"]],
  kind: "plain",
  claim: "value",
  provenance: platformTheme("darwin", "dark", "default"),
  decimals: 3,
  sentence:
    "on macOS dark a row label measures **{figure}:1** on it, under the 7:1 body floor",
};
```

Register it in `documentedFigures` after `trackSelectedFigure`:

```ts
  trackSurfaceFigure,
  trackSelectedFigure,
  rowPressFillFigure,
  ...trackRejectedRoleFigures,
  ...ringFigures,
```

### 2.2 `docs/tokens.md`

The catalogue paragraph that states the table's size (`documentedFigures` and
`documentedTierFigures`, currently **31** entries) becomes **32**. Change only
the numeral; `docs.test.ts` derives it (`countWord` is not used for this one).

### 2.3 `packages/tokens/src/row-press-direction.test.ts`

Add a case at the end of the `describe`:

```ts
  /**
   * The sentence that keeps a row's press on `active` rather than `accentActive`
   * rests on two measurements: on macOS dark a row label on the accent family's
   * pressed fill misses the 7:1 body floor, and no shipped set misses it on the
   * role the row keeps. Plan 698 moved that family one step after the sentence
   * was written, so both halves are derived here — a palette move that makes the
   * rejected fill readable, or the kept one unreadable, fails instead of leaving
   * a rationale the shipped sets no longer support.
   */
  it("keeps the row's press on the fill that clears the body floor", () => {
    const floor = contrastFloors.default.body;
    const label = (fill: "active" | "accentActive") =>
      shippedThemes.map(({ theme }) => ({
        name: theme.name,
        ratio: contrastRatio(theme.colors.foreground, theme.colors[fill]),
      }));

    const rejected = label("accentActive");
    const short = rejected.filter(({ ratio }) => ratio < floor);
    expect(short.map(({ name }) => name)).toEqual(["Dark · macOS"]);

    const worst = rejected.reduce((current, next) =>
      next.ratio < current.ratio ? next : current,
    );
    expect(worst.name).toBe("Dark · macOS");
    expect(Number(worst.ratio.toFixed(3))).toBe(6.677);

    label("active").forEach(({ name, ratio }) =>
      expect(ratio, name).toBeGreaterThanOrEqual(floor),
    );
  });
```

`contrastFloors`, `contrastRatio` and `shippedThemes` are already imported by the
file. No new import is needed.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Guard first, documents untouched** — apply §2.1 and §2.3 only, then:

   ```sh
   nub run --filter @gpuixui/tokens test -- figures.test.ts row-press-direction.test.ts docs.test.ts
   ```

   Expected: two failures.
   - `figures.test.ts` — `derives the row label on the pressed accent fill`
     fails on the catalogue's size:
     `expected '…' to contain '**32**'` (the entry is registered but §2.2 is not
     applied). The `quotesFigure` assertion for the new entry passes, because
     the sentence is already in the page.
   - `docs.test.ts` — `names both suites that hold its figures, and the table's
     size` fails for the same reason.
   - The new `row-press-direction.test.ts` case **passes** at the branch point:
     the figure and both premises are true today. Record this in §7 — this entry
     is a drift guard, not a repair, and the plan does not pretend otherwise.

2. **Apply §2.2**, then the same command.

   Expected: every case green.

3. **Package suite**:

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: 193 files, 6794 cases (6793 at the branch point plus the derived
   figure case; the premise case joins an existing file).

4. **Gates**:

   ```sh
   nub run --filter @gpuixui/tokens check-types
   nub run check
   nub run lint
   nub run fmt
   ```

   Expected: clean.

5. **No scenario runs.** The change touches one test-only table entry, one test
   case, one catalogue numeral and the ledger: no token value, pair, floor,
   metric, platform style, provider or runtime path. The smoke and live
   playground suites are not scoped in, and the commit says so rather than
   implying a native check.

## 4. STOP conditions

Stop and report instead of improvising if:

- `foreground` on `accentActive` in `getPlatformTheme("darwin", "dark")` is not
  **6.677**, or more than one shipped set measures under
  `contrastFloors.default.body` on that fill, or any shipped set measures under
  it on `active`. The palette has moved since this plan; re-measure and report
  the new premise instead of editing the numeral in §2.1 or the case.
- The sentence is not found with `quotesFigure`'s whitespace-normalised match —
  re-locate it in `docs/tokens.md`; do not shorten the `sentence` template to a
  fragment, because the figure must stay tied to the set it names.
- `documentedFigures.length + documentedTierFigures.length` is not 32 after §2.1.
  Derive the numeral from the suites instead of guessing.
- Another worktree owns `710` (checked below). At the time of writing `706`,
  `707` and `708` are taken and `709` was claimed by this workstream; `710` and
  `711` are free.

```sh
find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/71[0-2]-*"
```

## 5. Test plan

**The bug the case guards.** A figure that justifies a design decision is
quoted once, the palette moves underneath it, and the sentence keeps an argument
that is no longer true. This is the failure mode plans 336, 377, 536, 705 and
706 each found once in this package; this sentence is the last present-tense
ratio in the row-press section with no derivation, and its own paragraph was
written in the same session that plan 698 moved the fill.

**Both directions.**

- The derived figure: without §2.2, the new entry fails the catalogue's size;
  with it, the entry's own case asserts the page quotes exactly the ratio the
  shipped set produces (`deriveFigure` + `quotesFigure`), and `claim: "value"`
  means naming the wrong set fails even when the number is right.
- The premise case: planting `accentActive: "#6E7787"` on the identity dark theme
  (a fill a row label reads at under 7:1) makes `short` name two sets, so the
  `["Dark · macOS"]` assertion fails; planting a readable `accentActive` on
  macOS dark (for example the accent family's `accentForeground` on
  `accentActive`) empties `short` and fails the same assertion. Planting
  `active` to equal `foreground` breaks the kept half.
- The case does not assert presence only: it reads the two ratios, the floor and
  the set names.

## 6. Acceptance

- `documentedFigures` carries the figure, and `figures.test.ts` derives
  **6.677** for `Dark · macOS` and holds `docs/tokens.md` to it.
- `row-press-direction.test.ts` proves macOS dark is the only set under the body
  floor on `accentActive` and that every set clears it on `active`.
- The catalogue states **32** entries.
- `nub run check`, `nub run lint` and the tokens suite are green, with the
  pre-fix failures recorded verbatim in §7.
- `TODO.md` and the plan index carry the change.
- One commit on `agent/tokens-theme`, pushed to `origin`.

## 7. Execution notes (2026-10-20)

Ran from this worktree on `agent/tokens-theme`.

1. **Guard first, catalogue numeral untouched** — with §2.1 and §2.3 applied,
   the suite failed exactly once, on the derived size:

   ```
   FAIL  src/docs.test.ts > docs/tokens.md quoted tightest figures > names both suites that hold its figures, and the table's size
   AssertionError: expected '`packages/tokens/src/figures.ts` hold…' to contain '**32**'
   ```

   As §3.1 predicted, the new entry's own `quotesFigure` assertion passed (the
   sentence is already in the page) and the new premise case passed: this entry
   is a drift guard, not a repair of a wrong number.

2. **§2.2 applied** — green: 193 files, 6795 cases.

3. **Both-directions checks, on a copy that was reverted afterwards**:

   - The figure guard: changing the page to `**6.678:1**` failed the derived
     case with `the row label on the pressed accent fill: docs/tokens.md must
     quote 6.677:1: expected false to be true`.
   - The premise guard: planting `accentActive: "#C7CBFF"` on the identity dark
     palette (a fill the dark `foreground` reads at about 1.2:1) failed the case
     with two sets named instead of one. The plant also fails every shipped-set
     case in the package, which is the point of a shipped palette: the case is
     the one that names *why* the fill is rejected.

4. **Gates** — `nub run --filter @gpuixui/tokens check-types`, `nub run check`,
   `nub run lint` and `nub run fmt` are clean.

5. **No scenario ran, deliberately.** The change touches a test-only figure
   table entry, one test case, one catalogue numeral and the ledger: no token
   value, pair, floor, metric, platform style, provider or runtime path.

### Divergences from the plan

- The pre-fix failure count is one, not two as §3.1 estimated: the new figure's
  `quotesFigure` assertion passes before §2.2, because the sentence already
  quotes the derived value — only the catalogue's size changes.
- The vitest invocation in §3 (`-- figures.test.ts …`) does not filter files in
  this package: the positional args filter *test names*, so the whole suite runs.
  Every count above is therefore a full-suite count.
