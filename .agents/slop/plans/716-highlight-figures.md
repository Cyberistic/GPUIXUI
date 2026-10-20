# 716 — The find-highlight JSDoc figures no test derives

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (docs truth / native-text contract).
**Depends on:** 573, 574, 581, 590, 649 (the native-text and find-highlight
contract), 710/714 (the figure-drift series).

## 1. The defect

`src/highlight.ts` quotes seven current ratios across two JSDoc blocks. No test
reads either block, and **five are stale**:

| Claim | Quoted | Measured today |
| ----- | ------ | -------------- |
| `nativeHighlightPairs`: plain-tone role minimum, match | 5.59:1 | **5.77:1** |
| `nativeHighlightPairs`: plain-tone role minimum, active | 4.80:1 | **4.99:1** |
| `nativeHighlightPairs`: painted-ink role minimum, match | 5.21:1 | **5.38:1** |
| `nativeHighlightPairs`: painted-ink role minimum, active | 4.51:1 | **4.64:1** |
| `nativeHighlightPairs`: syntax through the neutral `hover` wash | 6.30:1 | **6.74:1** |
| `nativeHighlightStep`: the step's own weakest | “1.28:1 at the weakest, against the match's 1.17:1” | **1.06:1** step; 1.28/1.17 are the washes' *plain-tone* ratios, not the step |

The JSDoc's other figures are true: body text 9.65/8.03 plain and 8.93/7.31
painted, the `hover` wash's own 1.06:1, and the 14–33% selection range.

**How it drifted.** Plan 574 moved eight light platform text roles one designed
step (XP/Aero `infoText`, XP `successText`/`warningText`/`destructiveText`, Aero
`warningText`) and plans 590/649 moved the Aero inks. The plain and painted
role minima are measured *over those roles*, so 5.59/4.80 and 5.21/4.51 predate
574, and the 6.30 through the hover wash is the same move. The catalogue page
was updated; the module JSDoc was not.

**The page is already derived, the JSDoc is not.** `native-highlight.test.ts`
(“derives every figure the reference quotes”) computes all fourteen page
figures — including 1.08/1.28 for the plain step and wash-on-tone, and
1.06/1.25 for the painted ones — and requires each to appear **somewhere** in
`docs/tokens.md`. Its presence check is why the page stayed current, but it
cannot tell which sentence a figure belongs to. This plan leaves the page's
values alone and adds the missing sentence-level hold.

**Measured 2026-10-20** (`shippedThemes`, `toFixed(2)`):

| Measurement | Min | Set · where |
| ----------- | --- | ----------- |
| match wash, plain role min | 5.77 | Light · `primaryText` / `background` |
| active wash, plain role min | 4.99 | Light · Windows · `successText` / `background` |
| match wash, ink role min | 5.38 | Light · `primaryText` / `background` |
| active wash, ink role min | 4.64 | Light · Windows · `successText` / `background` |
| body, plain (match / active) | 9.65 / 8.03 | Dark · Windows / Dark |
| body, ink (match / active) | 8.93 / 7.31 | Dark · Linux / Dark |
| step, plain | 1.08 | High contrast dark · `background` |
| step, ink | 1.06 | High contrast dark · `muted` |
| match wash vs plain tone | 1.17 | High contrast dark · `background` |
| active wash vs plain tone | 1.28 | High contrast dark · `background` |
| active wash vs ink | 1.25 | High contrast dark · `muted` |
| `hover` vs tone | 1.06 | Light · `background` |
| syntax role on `hover` | 6.74 | Dark · macOS · `mutedForeground` / `background` |

## 2. Exact changes

### 2.1 `packages/tokens/src/highlight.ts`

`nativeHighlightStep` JSDoc — replace:

```
 * active wash is 24–43%; the step keeps it a perceivable step above the match
 * (1.28:1 at the weakest, against the match's 1.17:1) while every highlighted
 * text role keeps the secondary floor.
```

with:

```
 * active wash is 24–43%; the step keeps the active match a measured step above
 * the match (1.06:1 at the weakest on a painted surface), while the two washes
 * clear a plain tone by 1.17:1 (match) or 1.28:1 (active) and every
 * highlighted text role keeps the secondary floor.
```

`nativeHighlightPairs` JSDoc — change five tokens in place:

```
 * weakest and still leaves syntax at 6.74:1; on the plain tone the selection
 * wash keeps every shipped role at 5.77:1 (match) and 4.99:1 (active), and on
 * the code block's painted ink surface at 5.38:1 and 4.64:1. Body text itself
 * stays above the body floor (9.65:1 match, 8.03:1 active; 8.93:1 and 7.31:1
 * painted).
```

### 2.2 `packages/tokens/src/highlight-figures.test.ts` (new)

One pass over `shippedThemes` mirroring the composition in
`themeHighlightFailures` — the four `nativeTextSurfaces`, the two washes, the
ink paint and (for the step) the two diff tints — recording the minima named in
§1. Three cases:

1. **“are the ones the shipped sets produce”** pins all fourteen figures
   (5.77, 4.99, 5.38, 4.64, 9.65, 8.03, 8.93, 7.31, 1.08, 1.06, 1.17, 1.28,
   1.25, 1.06 step, 6.74), so a palette edit fails here with the set and
   composition named.
2. **“holds the module JSDoc to them”** asserts the changed source sentences
   with the derived values interpolated.
3. **“holds the catalogue paragraph to them”** asserts the page's sentences —
   including `1.08`/`1.28` (plain) and `1.06`/`1.25` (painted) — closing the
   presence-only gap in `native-highlight.test.ts` without changing any page
   value.

`node:fs`'s `readFileSync` is deliberate and documented at the top of
`native-highlight.test.ts`: the tokens package ships zero runtime dependencies
and has no Effect `FileSystem` to borrow for a tree-local docs guard.

### 2.3 `TODO.md`

Add a ticked row after plan 714 and move the fraction 324/401 → 325/402:

```
`[x]` Hold the find-highlight JSDoc to the shipped sets — `highlight.ts` quoted
seven current ratios and no test read either block, so five were stale after
plan 574 moved eight light platform text roles and plans 590/649 moved the Aero
inks: the plain minima said 5.59/4.80 (now **5.77/4.99**), the ink minima
5.21/4.51 (now **5.38/4.64**), and syntax through the hover wash 6.30 (now
**6.74**); the step JSDoc printed the washes' own plain-tone ratios (1.28/1.17)
as if they were the step, which is **1.06** on a painted surface.
`highlight-figures.test.ts` derives every figure and holds both the JSDoc and
the page's sentences; the page's values were already derived by
`native-highlight.test.ts`, whose presence check could not tell which sentence a
figure belonged to. No token, pair, floor or metric moves (plan 716)
```

### 2.4 `.agents/slop/plans/README.md`

Add after row 714:

```
| [716](./716-highlight-figures.md) | The find-highlight JSDoc figures no test derives | F | 573, 574, 581, 590, 649, 710, 714 | done |
```

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Guard first, JSDoc untouched** — apply §2.2 with its assertions written for
   the corrected numbers. Expected: the measurement case passes; the JSDoc case
   fails on `5.77` (the source still says 5.59) and the others it names.
2. **Apply §2.1**, rerun the file: green.
3. **Full suite:**

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: 195 files, **6835** cases (6832 at the branch point + 3), all
   passing.
4. **Gates:** `check-types`, `nub run check`, `nub run lint`, `nub run fmt`.
5. **No scenario runs.** Two JSDoc blocks and one test file: no token value,
   pair, floor, metric, platform style, recipe, provider or runtime path.

## 4. STOP conditions

Stop and report instead of improvising if:

- Any measurement differs from §1 by more than rounding. Re-measure and report;
  do not edit the document to match the JSDoc.
- `docs/tokens.md` no longer contains the 1.08/1.28/1.06/1.25 sentences — do not
  change a page value to satisfy the new test; re-locate the sentence.
- `nativeSyntaxTints`/`nativeTextRoles` no longer export the shape the pass
  reads — mirror `highlight.ts`'s `surfacePaints`/`paintSurface` instead of
  approximating.
- Another worktree owns `716`. At the time of writing `712` and `715` are
  `components`', `713`/`714` are ours, and `716`/`717` are free:

```sh
find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/71[5-7]-*"
```

## 5. Test plan

**The bug the file protects.** A ratio measured once by hand outlives the palette
it measured, and no test notices. The catalogue page stayed current because an
existing case derives its figures; the module JSDoc was never read, so five
numbers and a whole sentence's meaning drifted. The step sentence is the worst:
its numbers are true of the washes' plain-tone visibility, not of the step the
contract enforces, so a reader implementing a find bar would take 1.28 as the
step floor and draw a wash the check rejects.

**Both directions.**

- Leave `5.59` in the JSDoc after §2.2: the JSDoc case fails on the derived
  `5.77` (evidence in §7).
- Move a page figure to the wrong sentence: the page case fails, where the
  existing presence-only case would still pass.
- The measurement case names the tightest set and composition, so a palette move
  fails with the cause instead of a bare mismatch.

## 6. Acceptance

- `highlight.ts`'s two JSDoc blocks quote only derived values, with the step's
  own 1.06 separated from the washes' plain-tone 1.17/1.28.
- `highlight-figures.test.ts` derives all fourteen figures and reads both the
  module and the page sentences.
- The pre-fix failures and the post-fix run are recorded verbatim in §7.
- `nub run check`, `nub run lint`, `nub run fmt` and the tokens suite are green.
- `TODO.md` and the plan index carry the change.
- One commit on `agent/tokens-theme`, pushed to `origin`.

## 7. Execution notes (2026-10-20)

### The narrowed scope

The first cut also edited the page's two step/wash figures (1.08 → 1.06 and
1.25 → 1.23), on the reading that they were stale. The full suite rejected it:

```
FAIL  src/native-highlight.test.ts > the native find-highlight contract
      > derives every figure the reference quotes
AssertionError: 1.084: expected '# Token catalogue…' to contain '1.08:1'
```

The page **is** derived — `native-highlight.test.ts` computes all fourteen
figures, including 1.08/1.28 for the plain step and wash-on-tone and 1.06/1.25
for the ink ones — but it only requires each number to appear *somewhere*. So
the page was correct and the module JSDoc was the unguarded block. The page edits
were reverted and §1 was narrowed to the JSDoc; the new file still pins the
page's sentences, which the presence check cannot do.

### Both directions

1. **Stale JSDoc** — restoring `5.59`/`4.80` in `nativeHighlightPairs` fails
   `holds the module JSDoc to them` on the derived `5.77`. Restored.
2. **Wrong page sentence** — changing the page's `1.08` to `1.23` fails
   `holds the catalogue paragraph to them`, while the existing presence check
   still passes (the number appears elsewhere). Restored; `docs/tokens.md` is
   untouched in the commit.

### Runs

- `highlight-figures.test.ts`: 3 cases green.
- Full suite: 195 files, **6835 cases**, all green in 19.70 s.
- `check-types`, `nub run check` (check:tests, lint, fmt, types) and
  `nub run fmt` clean.
- No scenario ran, deliberately: two JSDoc blocks and one test file.
