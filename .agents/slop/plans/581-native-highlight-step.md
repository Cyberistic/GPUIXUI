# Plan 581 — The active find match must be a perceivable step

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
573 (`nativeHighlight`, `nativeHighlightStep`, `themeHighlightFailures`),
342 (the published step floor), 381 (`selected`'s step past `accent`).

**Status:** planned.

---

## 1. The measured gap

`nativeHighlight(theme)` (plan 573) returns the `selection` role for every
match and the same RGB `nativeHighlightStep` (0.1) stronger for the active
match. `docs/tokens.md`, the package README and the function's JSDoc all state
the promise: *the active match is a perceivable step above the match*.

The promise is only kept for the shipped themes. `nativeHighlightStep` is an
absolute **alpha** step, so once `selection` is nearly opaque the two washes
paint the same colour:

```ts
const planted = extendTheme(lightTheme, {
  colors: { selection: "#DCE7FFFC" }, // 98.8% alpha
});

nativeHighlight(planted);
// { color: "#DCE7FFFC", activeColor: "#DCE7FFFF" }

themeHighlightFailures(planted); // []
themeFailures(planted); // []
```

Both washes composite to `#DCE7FF` over the card, so every text pair passes
(foreground is 13.60:1 there) while `active` and `match` measure **1.000:1**.
A find bar with this theme paints every match identically; the reader cannot
tell which match Return will jump to, and the library's one total check says
the theme is fine.

The shipped suite already measures the step — `native-highlight.test.ts`,
“makes the active match a perceivable step above the match” — but that case
iterates `shippedThemes` only. Plan 342 faced the same split for the filled
families and published the floor through `themeContrastFailures`
(`stateStepPairs`); plan 381 did it for `selected` past `accent`
(`selectionStepPairs`). This plan does the same for the find bar.

## 2. Decision

1. **Publish the step through the existing check.** `themeHighlightFailures`
   reports a second kind of failure beside unreadable text: an active wash that
   is not `contrastFloors[level].step` (1.05:1 both levels) above the match on
   the surface it paints on.
2. **Discriminate the two arms.** `HighlightFailure` becomes a union with a
   `pairClass` discriminant:
   - `"secondary"` — the existing text failure (`wash`, `surface`,
     `foreground`, `floor`, `ratio`);
   - `"step"` — the new failure (`surface`, `floor`, `ratio`).
   The discriminant is the same vocabulary `ContrastFailure` uses, and it lets
   `themeFailures` keep tagging both arms `kind: "highlight"` without a second
   check kind.
3. **No shipped value, pair count or floor changes.** Every shipped set
   already clears 1.05:1 (the suite measures 1.08:1 at the weakest), so the
   check reports only an edited theme. `contrastPairs`, `nativeSyntaxPairs`,
   `themeChecks` (eight) and every colour stay exactly as they are.
4. **The step is measured per surface.** The composite of two different alphas
   depends on the surface underneath, so the check reports the surfaces where
   the step collapses, like the text arm does. It is not a new pair list: the
   two washes are not roles.
5. **Name the migration.** `.wash` and `.foreground` now require narrowing on
   `pairClass === "secondary"`. No consumer in this repo reads
   `HighlightFailure`; the docs type index and the JSDoc state the union.

### Alternatives rejected

- **Report the step through a separate `themeHighlightStepFailures`.** It keeps
  `HighlightFailure` unchanged, but the advertised one-call check
  (`themeHighlightFailures`) would still return `[]` for a collapsed active
  match — the exact failure mode plan 383 removed when it composed checks into
  `themeFailures`.
- **Keep one interface with optional `wash`/`foreground`.** An arm whose
  identity fields are absent makes every consumer test for `undefined` instead
  of narrowing one discriminant; the package already publishes
  `ContrastFailure.pairClass` for this shape.
- **Make `nativeHighlight` clamp the active alpha to a maximum (for example
  0.9).** It would change the active wash of every shipped theme whose selection
  is already above that, and it silently discards the caller's edit instead of
  reporting it. The value is a design decision; the check is the guarantee.
- **Hold the step in the suite only.** The suite covers the library's own
  themes; a consumer copying a platform style is exactly who the public check
  exists for (plan 071), and the near-opaque wash is a plausible edit.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/highlight.ts`

1. Replace the `HighlightFailure` interface with a documented union:

```ts
/** A find-highlight pair that misses its floor. */
export type HighlightFailure =
  | {
      /** Highlighted text misses the `secondary` floor through the wash. */
      readonly pairClass: "secondary";
      /** Which of the two washes was painted. */
      readonly wash: "match" | "active";
      /** The surface the document paints on. */
      readonly surface: keyof ThemeColors;
      /** The text role the wash sat behind. */
      readonly foreground: keyof ThemeColors;
      /** The floor the pair missed. */
      readonly floor: number;
      /** The measured ratio; `NaN` when a role is not a colour the maths parses. */
      readonly ratio: number;
    }
  | {
      /** The active match is not a perceivable step above the match. */
      readonly pairClass: "step";
      /** The surface the two washes were composited over. */
      readonly surface: keyof ThemeColors;
      /** The `step` floor for the theme's declared contrast level. */
      readonly floor: number;
      /** The measured ratio between the two painted washes. */
      readonly ratio: number;
    };
```

2. In `themeHighlightFailures`, tag each text failure with
   `pairClass: "secondary"` and append the step walk:

```ts
const stepFailures = nativeTextSurfaces.flatMap((surface) => {
  const ratio = contrastRatio(
    painted(highlight.activeColor, surface, theme),
    painted(highlight.color, surface, theme),
  );
  return ratio >= floors.step
    ? []
    : [
        {
          pairClass: "step" as const,
          surface,
          floor: floors.step,
          ratio,
        },
      ];
});
return [...failures, ...stepFailures];
```

`floors` is `contrastFloors[contrast]` (the function currently reads
`contrastFloors[contrast].secondary`; rename that local so both arms share it).

3. Update the function's JSDoc: the check now reports two arms — a text role
   under the secondary floor through either wash, and an active wash that is
   not one `step` above the match on a surface. Keep the existing reasoning for
   the secondary floor, and state that the step is measured per surface because
   the two alphas composite differently there.

### 3.2 `packages/tokens/src/theme-check.ts`

1. In the `ThemeFailure` JSDoc's `highlight` clause, change “a find highlight
   that erases its own text” to “a find highlight that erases its own text or
   whose active match is not a perceivable step above the match”.
2. No structural change: `ThemeFailure` already spreads `HighlightFailure` and
   tags it `kind: "highlight"`, so both arms compose unchanged. Verify the
   spread order stays `{ kind: "highlight", ...failure }` (the failure has no
   `kind` field).

### 3.3 `packages/tokens/src/native-highlight.test.ts`

Header: add the plan-581 bug — the step promise was held on the shipped sets
only, and `selection: "#DCE7FFFC"` leaves both washes at **1.000:1** while
`themeHighlightFailures` and `themeFailures` return `[]`.

Changes:

1. Update the existing “reports an edited selection whose highlight is
   unreadable” case to narrow first:
   ```ts
   const failure = themeHighlightFailures(planted).find(
     (item) => item.pairClass === "secondary" && item.wash === "active",
   );
   ```
2. New case **“reports an active match that is not a step above the match”**:
   - build `planted` with `selection: "#DCE7FFFC"`;
   - assert `themeContrastFailures(planted)` returns `[]` (the text pairs and
     the wash's own visibility all pass — this is why the old check missed it);
   - find the `pairClass === "step"` failure, assert `ratio` is `1` (to three
     decimals) and `floor` is `contrastFloors.default.step`;
   - assert `themeFailures(planted)` contains a failure with
     `kind: "highlight"` and `pairClass: "step"`.
   This case fails before §3.1: `themeHighlightFailures` returns `[]`.
3. In “makes the active match a perceivable step above the match”, keep the
   shipped loop and add:
   ```ts
   expect(
     themeHighlightFailures(theme).some(
       (failure) => failure.pairClass === "step",
     ),
     theme.name,
   ).toBe(false);
   ```
   so the shipped sets prove the published check and the local walk agree.
4. Add `"pairClass"` to the named-export list only if the reference names it
   (it will not; it is a field, not an export).

### 3.4 `docs/tokens.md`

1. **Type index** — the `HighlightFailure` row becomes: “A find-highlight pair
   that misses its floor: a text role under the secondary floor through a wash,
   or an active match that is not a perceivable step above the match.”
2. **Find highlighting** — after the paragraph that names
   `themeHighlightFailures`, add one sentence: the check also reports an active
   match that is not `contrastFloors[level].step` above the match on the
   surface it paints on, so an edited `selection` close to opaque — either wash
   then paints the same colour — fails even though every text pair passes.
   State the regression with the shipped value (`#123456`/`#DCE7FFFC` style
   edit) and no new figure.
3. **One total check** — in the list of what a theme whose only defect escapes
   the contrast check can carry, add “a find highlight that erases its own text
   **or collapses the active match into the match**”; in the paragraph that
   describes the `HighlightFailure` payload, say it is either arm.
4. Do not restate counts, pair totals or floor tables; no pair list changes.

### 3.5 `docs/design-system.md`

In §10's native text paragraph, the sentence that names `nativeHighlightStep`
gains a clause: the check also holds the active match one `step` above the
match, so an edited near-opaque `selection` is reported. No figure.

### 3.6 `packages/tokens/README.md`

In *Native text documents*, the find-highlight paragraph states that
`themeHighlightFailures` holds both the highlighted text and the active match's
step above the match. One sentence; no new figures.

### 3.7 `COMPONENTS.md`

- **Theme contrast check** row: in the find-highlight sentence, add that
  `themeHighlightFailures` also reports an active match that is not one `step`
  above the match, after a near-opaque `selection` collapsed both washes to
  **1.000:1** while every text pair passed (plan 581). Do not change any pair
  count.
- **Design tokens** row: the `nativeHighlight` sentence gains the same clause
  in one short phrase.

### 3.8 `TODO.md` and the plan index

- Add a completed row under *Design tokens and theming* after the plan-574 row:
  `[x] Publish the find bar's active-match step — ... (plan 581)`.
- Add the plan row to `.agents/slop/plans/README.md` after 574 and one sentence
  to the block's closing paragraph. The status flips to `done` in the
  implementation commit.

## 4. Commands and expected results

Run from the worktree root:

```sh
nub run --filter @gpuixui/tokens check-types
# expect: Done, no diagnostics (the union narrows in the suite and in
# theme-check.ts).

nub run --filter @gpuixui/tokens test -- native-highlight
# expect: native-highlight.test.ts passes, including the new step case.

nub run --filter @gpuixui/tokens test
# expect: all 147 files and 5778+ tests pass; every shipped set still returns
# [] from themeFailures.

nub run check
# expect: check-tests, lint, fmt and check-types pass.

nub run test
# expect: the workspace suites pass.
```

### Two-direction proof (AGENTS §3)

`scripts/verify-two-directions.sh` is written against `jj` (TODO harness row),
so record the manual run in the commit message:

1. With the fix: `nub run --filter @gpuixui/tokens test -- native-highlight` is
   green, and `themeHighlightFailures` on the near-opaque theme reports a
   `step` failure at **1.000:1**.
2. Revert only the step walk in `themeHighlightFailures` (keep the union and
   the suite); re-run. Expect the new case to fail because no `step` failure is
   returned.
3. Restore; expect green.

## 5. STOP conditions

- **STOP** if any shipped set reports a `step` failure. Report the theme, the
  surface and the ratio. The suite measures 1.08:1 at the weakest; a shipped
  set under 1.05:1 is a palette defect this plan does not name.
- **STOP** if the union breaks `themeFailures`' `kind` tag or the
  `themeChecks` count. The check count stays eight; only the payload widens.
- **STOP** if a new public type export is required. The union is inline inside
  `HighlightFailure`, so `public-types.test.ts` and the docs type index stay at
  their current names.
- **STOP** if `themeContrastFailures(planted)` is not `[]` for
  `selection: "#DCE7FFFC"`. The case exists to prove the old check passed; pick
  another near-opaque pale wash and record its measured text ratios instead of
  weakening the assertion.

## 6. Acceptance

- `themeHighlightFailures` reports both arms, discriminated by `pairClass`;
  `themeFailures` tags both `kind: "highlight"`.
- An edited `selection` at 98.8% alpha produces a step failure at **1.000:1**
  while the contrast check stays empty; the test fails without the step walk.
- Every shipped set still returns `[]` from `themeFailures`; no colour, pair,
  floor or check count changes.
- `docs/tokens.md`, `docs/design-system.md`, the package README and
  `COMPONENTS.md` state the same contract; the type index describes both arms.
- `nub run check`, `nub run lint` and `nub run test` pass.
