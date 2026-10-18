# 550 — The strong border may not be thinner than the thin one

**Workstream:** `tokens-theme`. **Phase:** F (contract completeness).
**Depends on:** 017 (`focusRing`), 358 (the numeric contract), 360 / 372 / 523
(the same rule-by-rule family), 533 (the same documentation-truth class).
**Files:** `packages/tokens/src/metrics.ts`,
`packages/tokens/src/border-width-ladder.test.ts` (new),
`packages/tokens/src/docs.test.ts` (one guard case),
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md`, this plan.

## 1. The defect

`themeMetricFailures` governs the two border roles separately:

```ts
...finiteGroup("borderWidth", borderWidth),
...nonNegative("borderWidth", "thin", borderWidth.thin),
...positive("borderWidth", "strong", borderWidth.strong),
```

`thin` is a decorative divider / default control border; `strong` is the
emphasis border **and the spread of the focus ring**
(`packages/tokens/src/styles.ts` `focusRing`). Nothing compares them.

Probe on the current branch:

```ts
const theme = extendTheme(getTheme("light"), {
  borderWidth: { thin: 1, strong: 0.5 },
});
themeFailures(theme); // []
```

Every shipped surface keeps the split (`thin` 1, `strong` 2), so no colour,
pair, floor or metric moves. The defect is only reachable in a copied or brand
theme — exactly the audit surface `themeMetricFailures` exists for.

Why it matters:

- In GPUix 0.10.0 there is no `outline*` and no `focusVisible`; the only focus
  indicator is the zero-offset, zero-blur `boxShadow` whose spread is
  `borderWidth.strong`.
- A `strong` below `thin` makes that indicator thinner than the decorative
  border it surrounds, inverting the two named roles ("emphasis and focus
  outlines" versus "decorative dividers and default control borders" in
  `scale.ts`). At `0.5` the ring is a sub-pixel spread: the runtime may round it
  away, and the theme that removed focus reports `[]` — the exact failure plan
  358 cited when it held `strong` positive, one relation short.
- The documents already promise a *ladder* discipline for every other two-role
  scale (`radius`, `spacing`, `iconSize`, `avatarSize`, `controlHeight`,
  `controlPaddingX`, motion, elevation feather) and omit border widths from the
  list.

## 2. The rule to state

**`borderWidth.strong` is at least `borderWidth.thin`.** Equality is a design —
a flat theme may draw the ring the same weight as a border — but the emphasis
role may never be thinner than the default role. This is an `at-least` bound,
not a new ladder entry, because `ladder` would re-emit the existing
`non-negative` / `positive` diagnostics and break the "one defect, one report"
property of plans 532 and 540.

## 3. Exact changes

### 3.1 `packages/tokens/src/metrics.ts`

1. In `themeMetricFailures`, after
   `...positive("borderWidth", "strong", borderWidth.strong),` add:

```ts
    // `strong` is the emphasis border and the spread of the only focus
    // indicator the runtime paints, so it may equal the default border but
    // never be thinner than it.
    ...atLeast("borderWidth", "strong", borderWidth.strong, borderWidth.thin),
```

2. In the function's JSDoc rule list (§ "borderWidth"), replace the bullet with:

```
 * - **borderWidth**: `strong` is the focus ring's spread, and the ring is the
 *   only focus indicator the runtime can draw, so it may not be zero and may
 *   not be thinner than `thin` — a focus ring below a decorative border has
 *   inverted the two roles and can round away; `thin` may be zero in a
 *   borderless theme, so it is only non-negative.
```

### 3.2 `packages/tokens/src/border-width-ladder.test.ts` (new)

Header comment names the defect:

```
/**
 * Guards the defect plan 550 fixes: `themeMetricFailures` held each border role
 * on its own — `thin` non-negative, `strong` positive — and never compared
 * them, so `extendTheme(light, { borderWidth: { thin: 1, strong: 0.5 } })`
 * returned `[]` from all seven checks while every focus ring painted a
 * sub-pixel spread thinner than a decorative border. `strong` is emphasis and
 * the only focus indicator GPUix 0.10.0 can draw (`focusRing`).
 */
```

Cases (import from `./index.js`, `./shipped-themes.js`):

1. `reports a strong border thinner than the thin one` —
   `themeFailures(extendTheme(getTheme("light"), { borderWidth: { thin: 1, strong: 0.5 } }))`
   equals exactly
   `[{ kind: "metric", group: "borderWidth", member: "strong", rule: "at-least", actual: 0.5, bound: 1 }]`.
   (The failure object's field order does not matter to `toEqual`.)
2. `allows a flat pair` — `{ thin: 1, strong: 1 }` keeps
   `themeMetricFailures` `[]`; equality is a design, not a defect.
3. `holds a copied style across both modes` — `extendTheme(getTheme("dark"), …)`
   reports the same one failure, so the rule is not light-only.
4. `passes every shipped theme` — every `shippedThemes` entry has
   `borderWidth.strong >= borderWidth.thin` and `themeMetricFailures(theme)` is
   `[]`.
5. `states the rule in both documents` — read `docs/tokens.md` and
   `docs/design-system.md` with `node:fs` (the convention `docs.test.ts` uses)
   and require the phrase the plan adds ("the two border widths" in the
   catalogue's ladder sentence, "at least `thin`" in the design system).
6. `keeps the metric rule index total` — `metricMembers.borderWidth` is
   `["thin", "strong"]`; the rule reuses `at-least`, so `metricRules` does not
   grow.

### 3.3 `packages/tokens/src/docs.test.ts`

Add one case beside "states the elevation feather ladder":

```ts
it("states the border-width ladder", () => {
  const edited = extendTheme(getTheme("light"), {
    borderWidth: { thin: 1, strong: 0.5 },
  });
  expect(themeMetricFailures(edited)).toEqual([
    {
      group: "borderWidth",
      member: "strong",
      rule: "at-least",
      actual: 0.5,
      bound: 1,
    },
  ]);
  expect(markdown).toContain("the two border widths");
  expect(designSystem).toContain("at least `thin`");
});
```

(If `themeMetricFailures` is not already imported in that file, add it to the
existing metrics import.)

### 3.4 `docs/tokens.md`

At the metric-contract paragraph (currently "every named ladder — `spacing`,
`radius`, `iconSize`, `avatarSize`, `controlHeight`, `controlPaddingX`, the
motion timings and the elevation feather — must not step backwards"), change the
list to include **the two border widths** and add the reason in one clause:
the focus ring may equal the default border but never be thinner, or the only
focus indicator is less prominent than a divider.

### 3.5 `docs/design-system.md`

In §7 ("Radii, borders and elevation"), after the `borderStrong` bullet, add:
"The numeric contract holds `borderWidth.strong` at least `thin`: the focus ring
may match the default border but never be thinner than a divider, or the only
focus indicator is less prominent than the decoration it surrounds."

### 3.6 `packages/tokens/README.md`

In the metric-check paragraph ("The same edit path can …"), add "shrink
`strong` below `thin` (a focus ring thinner than a divider)" to the list of
defects the check reports.

### 3.7 `COMPONENTS.md`

In the **Theme metric check** row, extend the existing border clause: after
"a zero `borderWidth.strong` removed the focus ring", add "and a `strong`
thinner than `thin` inverted the emphasis and focus role". Keep the row within
its existing style; no counts change.

### 3.8 `TODO.md` and the plan index

- Add one `[x]` row to the tokens section naming plan 550 and the probe, and
  correct the section header to the derived count (215/281).
- Add plan 550 to `.agents/slop/plans/README.md`.
- Record the repo-tooling finding as a cross-team row: `scripts/verify-two-directions.sh`
  is written against `jj` (`jj workspace root`, `jj diff`, `jj restore`) while
  this repo uses git (PLAN.md D1), so the mandated both-directions check cannot
  run; verification for this plan was done manually (test fails unfixed, passes
  fixed) and the script needs a git implementation by its owner.

## 4. Commands and expected results

```sh
# 1. The new test fails on the unfixed source.
cd packages/tokens && nub run test -- src/border-width-ladder.test.ts
# → 1 failed: `borderWidth/strong` is missing; the 0.5 theme returns [].

# 2. Apply the metrics rule, then the same test passes.
cd packages/tokens && nub run test -- src/border-width-ladder.test.ts
# → 1 file passed.

# 3. The documents and the rest of the contract.
cd packages/tokens && nub run test -- src/docs.test.ts src/metrics.test.ts
# → passed.

# 4. The package's own gate.
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
# → passed.
```

Then the repo gates from the repository root:

```sh
nub run check:tests
nub run lint
nub run fmt
```

## 5. STOP conditions

- **STOP** if any shipped theme fails the new rule. That means a value must
  move; do not change a shipped border. Report the theme and the pair instead —
  the plan is guard-only.
- **STOP** if the rule produces more than one diagnostic for a single defect
  (for example a `strong: -1` theme reporting both `positive` and `at-least`).
  `atLeast` already skips a non-finite side; a finite negative `strong` must
  keep only the `positive` report, so check the emitted list.
- **STOP** if `metricRules` has to grow. The rule reuses `at-least`; a tenth
  rule is a different plan.
- **STOP** if a docs guard asserts a sentence this change would contradict.
  Report the guard instead of weakening it.
- **STOP** if `nub` is unavailable or the suite fails for an unrelated,
  pre-existing reason; record the exact output and do not claim a pass.

## 6. Two-direction proof

The repo's `scripts/verify-two-directions.sh` is jj-based and cannot run on this
git worktree (see §3.8). Prove it manually:

1. With only the test and the document edits in the tree, run
   `nub run test -- src/border-width-ladder.test.ts` → **fails** with the
   missing `at-least` failure.
2. Add the metrics rule, run the same command → **passes**.
3. Revert only the metrics line and run again → **fails**; re-apply it →
   **passes**. Record both outputs in the commit message.

## 7. Acceptance

- A theme with `borderWidth.strong < borderWidth.thin` returns exactly one
  `borderWidth/strong` `at-least` failure from `themeFailures`.
- Equality and every shipped set still return `[]`.
- `docs/tokens.md`, `docs/design-system.md`, the package README and
  `COMPONENTS.md` state the rule, and the new test holds the two documents.
- `nub run --filter @gpuixui/tokens test`, `check-types`, and the repo's
  `check:tests`, `lint`, `fmt` pass.
