# 714 — The caret pair's quoted tightest figure

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (docs truth).
**Depends on:** 557 (the caret is ink), 563 (the caret inside the mark list),
590/698 (the light platform inks that moved afterwards), 705/706/710 (the
figure-drift series this belongs to).

## 1. The defect

`docs/tokens.md`'s verification history says, of the caret pair:

> Every shipped set clears the new pair (**7.831:1** at the tightest, Linux dark),
> so no colour moves.

Both halves are false today, and **no shipped set measures anywhere near
7.831**:

| Pair | Named set in the page | Actual tightest | Ratio |
| ---- | --------------------- | --------------- | ----- |
| `primaryText` on `input` (`caretPairs`) | `Linux dark` | `Light` | **8.204** |

Measured on 2026-10-20 with the public `contrastRatio` over all 24
`shippedThemes`; the five lowest sets are Light 8.204, Dark · Windows 8.250,
Dark · Windows XP 8.250, Dark · Windows 7 8.250, Dark · Linux 8.674. Nothing
rounds to 7.831, so the sentence was measured before a palette move and never
re-derived. The same paragraph was edited by plans 705 and 706 for neighbouring
figures, and plan 710 found the same class one sentence over — this is the last
present-tense ratio in the caret paragraph with no owner.

The pair is `caretPairs` (`["primaryText", "input", "mark"]`), published inside
`markPairs`; `figures.ts` does not register it, so `figures.test.ts` never reads
the sentence. The caret JSDoc separately quotes **5.587:1** for the nine-surface
text floor (Windows dark on `active`), which is correct and is not this claim —
the `input` pair is a mark, not one of the nine text surfaces.

## 2. Exact changes

### 2.1 `packages/tokens/src/figures.ts`

Add beside `rowPressFillFigure` (after it, before `trackRejectedRoleFigures` is
spread):

```ts
/**
 * The native field's caret on its own `input` fill. `caretPairs` publishes the
 * pair, and `docs/tokens.md` quotes its tightest set — which drifted: the page
 * said **7.831:1** on Linux dark, measured before the light platform inks moved,
 * while no shipped set measures near it and `Light` is the tightest at
 * **8.204:1**. The entry derives both the figure and the set, so the sentence
 * cannot survive another palette move.
 */
const caretPairFigure: DocumentedFigure = {
  document: "docs/tokens.md",
  name: "the native field's caret on its input fill",
  pairs: [["primaryText", "input", "mark"]],
  kind: "plain",
  claim: "tightest",
  provenance: identityTheme("light", "default"),
  decimals: 3,
  sentence:
    "Every shipped set clears the new pair (**{figure}:1** at the tightest, `Light`)",
};
```

Register it in `documentedFigures` after `rowPressFillFigure`:

```ts
  trackSelectedFigure,
  rowPressFillFigure,
  caretPairFigure,
  ...trackRejectedRoleFigures,
```

### 2.2 `docs/tokens.md`

At the sentence (line ~3725), replace only the figure and the set name:

```
Every shipped set clears the new pair (**8.204:1** at the tightest, `Light`)
```

The wrapping may change; `quotesFigure` collapses whitespace. Keep the rest of
the paragraph verbatim.

The table's size sentence (line ~4101) moves **32** → **33**:

```
state — `documentedFigures` and `documentedTierFigures`, **33** entries across
```

### 2.3 `TODO.md`

Add a ticked row after the plan-713 row and move the fraction 323/400 →
324/401:

```
`[x]` Hold the caret pair's quoted tightest figure — the catalogue said every
shipped set clears `primaryText` on the `input` fill at **7.831:1**, tightest in
Linux dark, but no set measures near it: the measured tightest is **8.204:1** on
`Light` (then Dark · Windows at 8.250), stale since a light platform ink moved
after plan 557 wrote the sentence. `figures.ts` registers the pair as a
`tightest` figure, so `figures.test.ts` derives both the ratio and the set, and
the catalogue quotes the derived value. No token value, pair, floor, metric or
shipped set moves (plan 714)
```

### 2.4 `.agents/slop/plans/README.md`

Add after row `713`:

```
| [714](./714-caret-pair-figure.md) | The caret pair's quoted tightest figure | F | 557, 563, 590, 698, 705, 706, 710 | done |
```

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Guard first, sentence untouched** — apply §2.1 only, then:

   ```sh
   cd packages/tokens && nub exec vitest run src/figures.test.ts src/docs.test.ts
   ```

   Expected: two failures.
   - `figures.test.ts` — the new entry's case: the page does not quote
     `8.204` (it still says 7.831).
   - `docs.test.ts` — the table-size case: the page says **32**, the table now
     holds 33.

2. **Apply §2.2**, rerun: green.

3. **Full suite:**

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: 194 files, **6832** cases (each `documentedFigures` entry is its own
   case), all passing.

4. **Gates:**

   ```sh
   nub run --filter @gpuixui/tokens check-types
   nub run check
   nub run lint
   nub run fmt
   ```

   Expected: clean.

5. **No scenario runs.** A test-only figure entry and two prose numerals: no
   token value, pair, floor, metric, platform style, recipe, provider or runtime
   path.

## 4. STOP conditions

Stop and report instead of improvising if:

- `primaryText` on `input` across `shippedThemes` does not have `Light` as its
  minimum at **8.204** (three decimals), or another set ties it. Re-measure and
  report the new minimum and set instead of editing the numeral or the
  provenance.
- More than one set ties the minimum: change the `claim` to `"value"` with the
  one the page names, and say why in §7; do not pick arbitrarily.
- The sentence cannot be matched by `quotesFigure` after the edit — re-locate
  it; do not shorten the template to a fragment, because the figure must stay
  tied to the set it names.
- `documentedFigures.length + documentedTierFigures.length` is not 33 after
  §2.1.
- Another worktree owns `714`. At the time of writing `712` is `components`',
  `713` is ours, and `714`/`715` are free:

```sh
find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/71[3-5]-*"
```

## 5. Test plan

**The bug the case guards.** A ratio written once by hand outlives the palette it
measured. This exact sentence named a set that is not the tightest and a number
no shipped theme produces, while every suite stayed green — the failure mode
plans 336, 377, 536, 705, 706 and 710 each found once in this package. The caret
pair is the last current ratio in its paragraph without a derived owner.

**Both directions.**

- Leaving the page at 7.831 after §2.1 fails the new entry, because
  `quotesFigure` demands `8.204`.
- Naming the wrong set with the right number fails too: `claim: "tightest"`
  compares the entry's provenance with `tightestProvenance`, so `Linux dark`
  fails even if the sentence quoted 8.674 for it.
- The figure is derived, not asserted back: `deriveFigure` computes the ratio
  through `measure("plain", …)` from `shippedThemes`; planting an `input` fill
  that makes `Light` unreadable changes the required figure and fails the page.

## 6. Acceptance

- `figures.ts` carries `caretPairFigure` with `claim: "tightest"` and the
  `Light` identity provenance, and `figures.test.ts` derives **8.204**.
- `docs/tokens.md` quotes **8.204:1** on `Light` and states **33** entries.
- The pre-fix failures and the post-fix run are recorded verbatim in §7.
- `nub run check`, `nub run lint`, `nub run fmt` and the tokens suite are green.
- `TODO.md` and the plan index carry the change.
- One commit on `agent/tokens-theme`, pushed to `origin`.

## 7. Execution notes (2026-10-20)

1. **Guard first, sentence untouched** — with §2.1 applied and the page still at
   7.831, the two predicted failures appeared:

   ```
   FAIL  src/figures.test.ts > … > derives the native field's caret on its input fill
   AssertionError: the native field's caret on its input fill: docs/tokens.md must
   quote 8.204:1: expected false to be true

   FAIL  src/docs.test.ts > … > names both suites that hold its figures, and the table's size
   AssertionError: expected '`packages/tokens/src/figures.ts` hold…' to contain '**33**'
   ```

2. **§2.2 applied** — both files green: 258 cases.

3. **The wrong-set direction** — changing the entry's provenance to
   `platformTheme("linux", "dark", "default")` while the page still quotes
   **8.204** on `Light` failed the entry on the `claim: "tightest"` comparison
   (line 86, `sameProvenance(derived.provenance, tightestProvenance(entry))`).
   Restored; `figures.ts` carries only the new entry in the commit.

4. **Full suite** — 194 files, **6832 cases**, all green in 21.36 s. The count is
   6831 + 1: each `documentedFigures` entry is its own `it`, so §3.3's claim that
   the entry adds no case was wrong.

5. **Gates** — `check-types`, `nub run check` (check:tests, lint, fmt, types) and
   `nub run fmt` are clean.

6. **No scenario ran, deliberately.** A test-only figure entry and two prose
   numerals: no token value, pair, floor, metric, platform style, recipe,
   provider or runtime path.

### Divergences from the plan

- Case count is 6832, not 6831 (§3.3); the entry is a new `it`, not an extra
  assertion inside an existing one.
- The added sentence now wraps after “so”, which `quotesFigure` handles by
  collapsing whitespace; no reflow of the paragraph was needed beyond that.
