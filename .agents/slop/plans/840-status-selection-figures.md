# 840 — The status label through a text selection, in the ledger and the task list

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `083`, `366`,
`528`, `574`, `582`, `611`, `717`, `831` and `833`.

## 1. The defect

`selectionStatusPairs` is the list plan `366` published: the four status text
roles (`infoText`, `successText`, `warningText`, `destructiveText`) through the
composited `selection` wash on the nine surfaces a row's label is dragged over —
36 pairs. Three documents state its shipped minimum. They do not agree, and two
of them state a figure and a pair the palette stopped producing when plan `582`
moved Aero light's `successText` one designed step (`#0E5135`) and plan `574`
moved the light platform status inks:

| Document | Says today | Measures today |
| -------- | ---------- | -------------- |
| `docs/tokens.md` §*Text selection* | tightest **4.891:1** (Linux light `infoText` on `active`), AAA **7.370:1** | **4.891:1** (Light · Linux, `infoText` on `active`) — correct |
| `docs/tokens.md` §*Verification* | the same **4.891:1** / **7.370:1** | correct |
| `COMPONENTS.md` Design tokens row | tightest **4.827:1** (Aero light `successText` on `selected`) | that pair measures **7.158:1** |
| `TODO.md` plan `366` row | **4.661:1** (XP light `infoText` on `active`) | that pair measures **5.615:1** |

So a consumer reading the ledger is told the tightest status label is a pair that
now clears the secondary floor by 2.6 points, and the task-list row names a
different, equally stale pair. The *conclusion* in every passage still stands —
the four tones are the role for a status label in a selectable row and the
selection wash is measured on them — and no colour, pair, floor, metric, role or
shipped theme is wrong. Only the two rows' figures and named pairs are.

No suite reads either figure: mutating `4.827`, `4.661`, `4.891` or `7.370` in
place leaves the whole package green (228 files / 7219 tests), because
`figures.ts` owns the figures the *catalogue* states and neither row is an entry.

This is the class plans `536`, `717`, `760`, `831` and `833` closed one document
at a time: a present-tense figure about the shipped package with no owner.

## 2. What the package produces today

Measured on this tree from `shippedThemes` (24 sets) with
`contrastRatio(role, compositeOver(theme.colors.selection, surface))`, the
checker's own composition:

```
selectionStatusPairs, default-contrast sets (12)
  tightest  4.890 705…  Light · Linux    infoText on active
  next      4.924 596…  Light · Linux    warningText on active
            4.928 545…  Light · Windows  successText on selected
            4.962 516…  Light · macOS    successText on active

selectionStatusPairs, high-contrast sets (12)
  tightest  7.369 852…  Light (high)     warningText on active

the two pairs the stale rows name
  Aero light   successText on selected   7.158 431…
  XP light     infoText on active        5.615 036…
```

At the three-decimal precision the documents quote: **4.891:1** and **7.370:1**.
The pair the ledger names measures **7.158:1**; the pair the task list names
measures **5.615:1**. Neither is the minimum of anything.

## 3. Decisions

1. **Correct the present-tense claims, keep the history.** A projection into the
   present ("the tightest pair is") is a claim about today's package and must be
   true; a sentence that records what a plan measured when it landed stays as
   written. The two rows are present tense, so they move to today's figures and
   today's pair.
2. **Both rows get the same sentence shape.** The catalogue's wording —
   `` `4.891:1` (Linux light `infoText` on `active`) `` — is already the correct
   and specific one, so the ledger and the task list copy it instead of inventing
   a third phrasing. One fact, one wording, three documents.
3. **One purpose-named guard**, like `815`, `817`, `821`, `828`, `831` and `833`:
   `status-selection-figures.test.ts` derives the two minima, the two named
   pairs, and the set and surface each row names, then reads the four passages.
   It also derives the AAA entry from the top of the list rather than restating
   the float.
4. **The guard proves it can fail.** A case plants a theme whose `infoText`
   equals its `active`, derives the minimum again and shows the figure collapses
   to `1.000`, so the derivation is a measurement and not a constant.
5. **No value moves.** Only `COMPONENTS.md`, one ticked `TODO.md` row, two
   clauses of `docs/tokens.md` **if** they are not already exact (they are),
   the new test and the plan index change. `contrastPairs` stays **472**,
   `selectionStatusPairs` stays **36** and every shipped colour is untouched.

## 4. Files to change

1. `.agents/slop/plans/840-status-selection-figures.md` — **this file**.
2. `.agents/slop/plans/README.md` — the plan row and a closing paragraph.
3. `packages/tokens/src/status-selection-figures.test.ts` — **create**.
4. `COMPONENTS.md` — the Design tokens row's one sentence.
5. `TODO.md` — the plan `366` row's parenthetical, and the new row for this plan.

`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and every
module under `packages/tokens/src/` except the new test keep their content: the
catalogue is already right, and the README states only the AAA figure, which is
right too.

## 5. Step 1 — the ledger row

In `COMPONENTS.md`, in the `Design tokens` row, replace

```
so the six light status roles move one half-step and the tightest pair is 4.827:1 (Aero light `successText` on `selected`; 7.370:1 at AAA), with the plain 338 pairs unchanged.
```

with

```
so the six light status roles move one half-step and the tightest pair is 4.891:1 (Linux light `infoText` on `active`; 7.370:1 at AAA), with the plain 338 pairs unchanged.
```

Keep the leading clause (`XP light successText measured 3.671:1 on active and
every high-contrast light tone 6.12–6.72:1 under 7:1`) — those are the plan's
pre-fix evidence and they are still true of the values that moved.

## 6. Step 2 — the task-list row

In `TODO.md`, in the plan `366` row (the row beginning
`` `[x]` Hold the status label through a text selection ``), replace

```
every shipped set passes (4.661:1 XP light `infoText` on `active`,
7.370:1 at AAA)
```

with

```
every shipped set passes (4.891:1 Linux light `infoText` on `active`,
7.370:1 at AAA)
```

and keep the rest of the row: the three pre-fix figures, the 36-pair count and
the "plain 338 pairs" clause are the plan's record and stay.

## 7. Step 3 — `packages/tokens/src/status-selection-figures.test.ts`

Header: state the bug — the ledger and the task list state the
`selectionStatusPairs` minimum as 4.827 (Aero light `successText` on `selected`)
and 4.661 (XP light `infoText` on `active`) while the list's minimum is 4.891
(Light · Linux `infoText` on `active`), which the catalogue states twice; plan
`582` moved Aero's ink and plan `574` moved the XP ink after both rows were
written, and no suite read either.

Imports, following the neighbouring figure suites
(`skeleton-pulse-claims.test.ts`, `ledger-figure-claims.test.ts`):

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastRatio,
  getPlatformRecipeTheme,
  getTheme,
  selectionStatusPairs,
  shippedThemes,
  type ContrastPair,
  type Theme,
} from "./index.js";
```

Helpers:

```ts
/** A document read as one line, so a reflowed paragraph still matches. */
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8")
    .replaceAll(/\s+/g, " ")
    .trim();

const catalogue = prose("../../../docs/tokens.md");
const ledger = prose("../../../COMPONENTS.md");
const tasks = prose("../../../TODO.md");
const readme = prose("../README.md");

/** The wash the runtime inherits into a selected label. */
const washed = (theme: Theme, [role, on]: ContrastPair): number =>
  contrastRatio(
    theme.colors[role],
    compositeOver(theme.colors.selection, theme.colors[on]),
  );

/** One set's lowest pair in the list, with the pair it came from. */
const lowest = (theme: Theme) =>
  selectionStatusPairs
    .map((pair) => ({ pair, ratio: washed(theme, pair) }))
    .reduce((best, row) => (row.ratio < best.ratio ? row : best));

/** The lowest row across one contrast level, with the set it belongs to. */
const minimum = (contrast: Theme["contrast"]) =>
  shippedThemes
    .filter((entry) => entry.theme.contrast === contrast)
    .map((entry) => ({ name: entry.theme.name, ...lowest(entry.theme) }))
    .reduce((best, row) => (row.ratio < best.ratio ? row : best));
```

Cases:

1. **"derives the tightest default pair"** — `minimum("default")`: assert the
   ratio is `4.890705…` (`toBeCloseTo(4.891, 3)`), `name` is `"Light · Linux"`,
   and the pair is `["infoText", "active"]`. Assert the rendered figure
   `ratio.toFixed(3) + ":1"` is `"4.891:1"`.
2. **"derives the tightest high-contrast pair"** — `minimum("high")`: ratio
   close to `7.370`, name `"Light"`, pair `["warningText", "active"]`, figure
   `"7.370:1"`.
3. **"does not produce the figures the stale rows name"** — derive
   `getPlatformRecipeTheme("aero", "light")` with `successText` on `selected`
   (assert close to `7.158`, and greater than the list minimum by more than 2)
   and `getPlatformRecipeTheme("xp", "light")` with `infoText` on `active`
   (close to `5.615`, greater than the minimum). This is what makes the two old
   figures falsifiable rather than merely absent.
4. **"reads the catalogue's two passages"** — assert `catalogue` contains the
   exact sentence `the tightest shipped pair is **4.891:1** (Linux light
   `infoText` on `active`)` and `the tightest pair is **4.891:1** (Linux light
   `infoText` on `active`) and **7.370:1** at AAA`; build both from the derived
   figure strings (`${figure}`) rather than retyping `4.891`. Assert the page
   does not contain `4.827` or `4.661`.
5. **"reads the ledger and the task list"** — assert `ledger` contains
   `` the tightest pair is 4.891:1 (Linux light `infoText` on `active`; 7.370:1
   at AAA) `` and `tasks` contains `` every shipped set passes (4.891:1 Linux
   light `infoText` on `active`, 7.370:1 at AAA) ``, both interpolated from
   `minimum("default")` and `minimum("high")`; assert neither document contains
   `4.827:1 (Aero light` or `4.661:1 XP light`.
6. **"reads the AAA sentence the README states"** — the README quotes only the
   AAA pair; assert it contains the derived `` the AAA tightest is 7.370:1
   (identity light high `warningText` on `active`) `` and that the figure comes
   from `minimum("high")`, not a literal.
7. **"can fail on a moved role"** — plant
   `extendTheme(getTheme("light"), { colors: { infoText: getTheme("light").colors.active } })`,
   assert its `infoText` on `active` measures `1` and that its `lowest` row is
   `["infoText", "active"]` with a figure of `"1.000:1"`, so a palette edit that
   collapsed the role would change what every row must say.

Every expected figure is derived; the only literals are the prose the documents
must contain. Keep the case count at seven so `check-tests` sees assertions in
each.

## 8. Step 4 — the plan index

Add to the `tokens-theme` table in `.agents/slop/plans/README.md`, after `838`:

```
| [840](./840-status-selection-figures.md) | The status label through a text selection, in the ledger and the task list | F | 083, 366, 528, 574, 582, 611, 717, 831, 833 | done |
```

and a closing paragraph naming the two stale rows, the two figures they carried
(`4.827` Aero light, `4.661` XP light) and the figure and pair that replace them
(`4.891`, Light · Linux `infoText` on `active`), with the note that no colour,
pair, floor, metric, role or shipped theme moves.

Also add one `[x]` row to `TODO.md` under *Design tokens and theming* describing
the fix in the same present-tense terms, and move the progress counter
`385/460` → `386/461`.

## 9. Test plan and commands

From the worktree root:

```sh
nub run --filter @gpuixui/tokens test status-selection-figures.test.ts
nub run --filter @gpuixui/tokens test
nub run check
```

Expected: the new file passes with seven cases; the package is green with one
more file and seven more tests (228 files / 7219 → 229 files / 7226); `nub run
check` (tests, lint, format, types) is clean.

Both directions — run the new file **before** editing the two rows:

1. **Fails before the fix.** With the current `COMPONENTS.md` and `TODO.md`,
   cases 5 fails on the two stale clauses; case 1–3 pass because the derivation
   is already right. Record the failure text in the commit message.
2. **Fails on a moved palette.** Temporarily set Aero light's `successText` in
   `platform-recipes.ts` to `"#0E5135"`'s predecessor, or set the identity
   light `infoText` to its `active`, run the file, and expect cases 1, 3 and 7
   to fail. Restore; never commit the change.
3. **Passes after the fix.** Re-run; all seven pass.

**Native scenarios.** None. This change edits two prose figures, one test and
the plan index. `nub apps/playground/dist/smoke/run.js --only <id>` is not built
in this worktree (no `apps/playground/dist`), and no token value moves, so no
scenario can change. Record "no scenario ran: no token value, pair or shipped
theme moves" in the commit message.

## 10. STOP conditions

- Stop if `minimum("default")` is not Light · Linux `infoText` on `active` at
  `4.890…`: another plan moved a role. Re-derive, record the new figure in the
  plan's §2 table and the commit message, and correct the three rows with
  today's numbers **without** weakening the conclusion.
- Stop if the catalogue's two passages do not already state the derived figure.
  That would mean the page drifted too; correct it in this plan and say so,
  because then the plan is a docs fix and not only a ledger fix.
- Stop if `TODO.md` or `COMPONENTS.md` moved under a concurrent writer so the
  start strings cannot be found: re-read the files and re-anchor on the row's
  own opening words. Never widen the match to the whole document.
- Stop if any test outside the new file fails. No source module changes; a
  failure is another writer's work in progress, not this plan's.
- Do not add a pair or a colour to make a figure "nicer". The point is that the
  two rows were wrong, not that the palette was.

## 11. Acceptance

- `COMPONENTS.md` and the `TODO.md` plan-366 row state `4.891:1` on Light ·
  Linux `infoText` on `active`, beside the unchanged AAA `7.370:1`.
- `status-selection-figures.test.ts` derives both minima, the two pairs the old
  rows named, and reads all four passages; it fails on the pre-fix rows and on a
  moved role.
- No colour, pair, floor, metric, role, platform style or shipped theme moves:
  `selectionStatusPairs` stays 36 and `contrastPairs` stays 472.
- The package and root gates pass.

## 12. Not changed

- `docs/tokens.md` and `docs/design-system.md`: already exact.
- `packages/tokens/README.md`: states only the AAA figure, which is right.
- `packages/tokens/src/contrast.ts` and every other module: the pair list, the
  floors and the composite are correct.
- Every other live cross-team row: plans `831` and `833` own those figures.

## 13. Outcome

Executed. `COMPONENTS.md` and the `TODO.md` plan-366 row now state the list's
true minimum, and `status-selection-figures.test.ts` adds seven cases.

- `nub run --filter @gpuixui/tokens test`: **229 files, 7226 tests passed**
  (was 228 / 7219).
- `nub run check` (check:tests + lint + fmt + check-types) and `nub run lint`
  green; `nub run fmt` reformatted only the new file before the final run.
- Both directions: **before** the two row edits, "reads the ledger and the task
  list" failed (`expected false to be true` on the corrected clause) while the
  other six passed; with a temporary Linux light `infoText: "#1C71D8"` planted
  in `platform-styles/linux.ts`, three cases failed —
  `derives the tightest default pair` (2.7697 against 4.891), the catalogue case
  and the ledger case; reverted with `git checkout`, the suite is green.
- The stale pairs measure **7.158:1** (Aero light `successText` on `selected`)
  and **5.615:1** (XP light `infoText` on `active`), which case 3 pins so the old
  figures stay falsifiable.
- **Native scenarios: none ran.** No colour, pair, floor, metric or shipped theme
  moves, and this worktree has no built `apps/playground/dist`; `--only` ids:
  none.

