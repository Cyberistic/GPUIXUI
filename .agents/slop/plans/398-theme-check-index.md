# Plan 398 — the check count and the composition suites' subset

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
071 (the contrast contract), 358–364 (the metric contract), 371 (colour
format), 383 (the total check), 385 (typeface), 392 (text hierarchy), 396 (the
type index's claims).

**Status:** executed on `agent/tokens-theme` (2026-10-18).

---

## 1. The measured gap

`themeFailures` has composed five checks since plan 392: colour format,
typeface form, contrast, text hierarchy and numeric metrics. Three suites still
run a hand-built subset and call it the guarantee, and one document repeats the
subset as if it were the whole:

| site | checks it runs | checks that exist |
| ---- | -------------- | ----------------- |
| `applied-palette.test.ts:35` “all three checks” | contrast, metric, colour | 5 |
| `theme-choice.test.ts:42` `failuresOf` “all three” | contrast, metric, colour | 5 |
| `platform-composition.test.ts:42` `failuresOf` “all four” | contrast, metric, colour, typeface | 5 |
| `docs/tokens.md:735` “all four checks (`platform-composition.test.ts`)” | — | 5 |
| `COMPONENTS.md:30` “to all four checks (plan 374)” | — | 5 |

The consequence is silent: a composed theme whose only defect is a CSS family
stack (plan 385) or an inverted text tier (plan 392) passes `theme-choice` and
`applied-palette`, because neither suite calls the check that sees it. This is
the same class of gap plan 383 closed for consumers, one layer inside the
package: the guarantee exists, and three suites describe a subset with the
guarantee's name.

The count itself is retyped. `theme-check.test.ts` writes the five kinds twice
(and `"five"` in a title); `docs.test.ts:1481` hardcodes the guarantee sentence;
`docs/design-system.md:689` says “The five parts”; `packages/tokens/README.md`
says “one of five checks”, “composes all five”. Plan 396 fixed the same defect
for the type index's role count — `colorRoles` became the owner. The check set
has no owner: `ThemeFailure` is a union of five literal tags with no ordered
index, unlike every other union in the package (`platformNames`, `statusTones`,
`controlSizes`, `themeModes`, `themeContrasts`, `densityNames`, `metricGroups`,
`metricRules`, `typefaceRoles`, `typefaceRules`).

## 2. Decision

1. **`themeChecks` owns the set and the order.** Export `themeChecks` as the
   ordered index (`color`, `typeface`, `contrast`, `hierarchy`, `metric`) and
   derive `ThemeFailureKind` from it, exactly like `metricGroups`/`MetricRule`.
2. **Derive `ThemeFailure` from the index.** Keep each kind's payload precise
   with one mapped type keyed by `ThemeFailureKind`, so adding a check without a
   payload is a type error rather than a sixth literal in a union.
3. **The three suites run `themeFailures`.** Delete their hand-built
   `failuresOf` unions and inline check lists; a future sixth check reaches every
   composition suite because the suite asks the total check.
4. **Counts come from the index.** The docs and README say the count and the
   order from `themeChecks`; no document or test title retypes `five`.
5. **A guard that can fail.** `theme-check.test.ts` proves the composition emits
   exactly `themeChecks` in index order; `docs.test.ts` and `readme.test.ts`
   build the guarantee sentence from `themeChecks.length`; a focused case fails
   on “all three checks” / “all four checks”, the phrase that let the subset pass
   as the guarantee.

Rejected alternatives:

- **Only fix the prose.** The suites would still pass a typeface-only or
  hierarchy-only defect, and the next check would be omitted the same way.
- **Keep three local helpers and add the two missing calls to each.** Five
  hand-written lists across three files is the defect; the total check already
  exists and is tested.
- **Add a sixth exported “guarantee count” constant.** `themeChecks.length` is
  the count; a second constant can disagree with the list.

## 3. Exact edits

### 3.1 `packages/tokens/src/theme-check.ts`

After the imports, add:

```ts
/**
 * The checks {@link themeFailures} composes, in diagnostic order.
 *
 * A report, a settings screen or a CI summary can iterate this index instead of
 * retyping the kinds, and `ThemeFailureKind` is the union it derives. The list
 * is the source of truth for the count: a check is added here and composed
 * below, and a kind without a payload does not type-check.
 */
export const themeChecks = [
  "color",
  "typeface",
  "contrast",
  "hierarchy",
  "metric",
] as const;

/** The check that found a failure — one member of {@link themeChecks}. */
export type ThemeFailureKind = (typeof themeChecks)[number];
```

Replace the `ThemeFailure` union with a payload map so the index owns the kinds:

```ts
/** The failure each check returns, keyed by the kind that tags it. */
type FailurePayload = {
  readonly color: ColorFailure;
  readonly typeface: TypefaceFailure;
  readonly contrast: ContrastFailure;
  readonly hierarchy: TextTierFailure;
  readonly metric: MetricFailure;
};

export type ThemeFailure = {
  readonly [Kind in ThemeFailureKind]: FailurePayload[Kind] & {
    readonly kind: Kind;
  };
}[ThemeFailureKind];
```

Keep the existing `ThemeFailure` JSDoc above the new type (it already describes
each kind). Leave `themeFailures`' body unchanged; its five literal tags are
checked against the index by the test in §3.2.

### 3.2 `packages/tokens/src/theme-check.test.ts`

- Import `themeChecks` from `./index.js`.
- Replace both hardcoded kind arrays (`new Set(["color", "typeface",
  "contrast", "hierarchy", "metric"])`) with `new Set(themeChecks)`.
- Rename `it("returns exactly the five checks' failures, tagged and grouped")`
  to a derived title: ``it(`returns exactly the ${themeChecks.length} checks'
  failures, tagged and grouped`)``.
- Add one case:

```ts
it("emits the index's kinds, in its order", () => {
  expect([...new Set(kinds(brokenFailures))]).toEqual([...themeChecks]);
});
```

- Update the file's header comment: it currently narrates 383 → 385 → 392 as
  three additions; add one paragraph saying plan 398 makes `themeChecks` the
  owner of that set and the order.

### 3.3 `packages/tokens/src/applied-palette.test.ts`

- Drop `themeColorFailures`, `themeContrastFailures`, `themeMetricFailures` from
  the import; import `themeChecks` and `themeFailures`.
- In `it("passes all three checks for every shipped style")`, derive the title
  (`` `passes all ${themeChecks.length} checks for every shipped style` ``) and
  replace the three expectations with one:

```ts
expect(themeFailures(theme), `${mode}/${platform}`).toEqual([]);
```

### 3.4 `packages/tokens/src/platform-composition.test.ts`

- Drop the `themeColorFailures`/`themeContrastFailures`/`themeTypefaceFailures`
  imports and the `themeMetricFailures` import; import `themeFailures`,
  `themeChecks` and `type ThemeFailure` from `./index.js` (or the modules they
  already come from).
- Replace the four-list `failuresOf` helper with:

```ts
/** Every check a theme must pass, so a composition is held to all of them. */
const failuresOf = (theme: Theme): ReadonlyArray<ThemeFailure> =>
  themeFailures(theme);
```

- The caller already interpolates each failure; keep its labelling but render a
  failure readably, for example:

```ts
return failuresOf(applyPlatformStyle(base, style, level)).map(
  (failure) => `${label}: ${failure.kind} ${JSON.stringify(failure)}`,
);
```

- Derive the title:
  `` `holds every shipped base and applied style to all ${themeChecks.length}
  checks` ``.

### 3.5 `packages/tokens/src/theme-choice.test.ts`

- Drop `themeColorFailures`/`themeContrastFailures`/`themeMetricFailures`; import
  `themeFailures`, `themeChecks` and `type ThemeFailure`.
- Replace the three-list `failuresOf` with:

```ts
/** Every check a resolved theme must pass, named for the failing axis. */
const failuresOf = (theme: Theme, where: string): ReadonlyArray<string> =>
  themeFailures(theme).map(
    (failure) => `${where}: ${failure.kind} ${JSON.stringify(failure)}`,
  );
```

- Derive the title: `` `resolves every shipped axis combination to a theme all
  ${themeChecks.length} checks accept` ``.
- Update the header comment's "three wrong branches" paragraph only if it claims
  a check count; it does not.

### 3.6 `docs/tokens.md`

- Line ~735: “holds each result to all four checks (plan `374`)” → “holds each
  result to every check (plan `374`)”. A count-free sentence cannot be a subset.
- In *One check* (~1788), after “`hierarchy`, then `metric`.” add:

> `themeChecks` is that order as a list and `ThemeFailureKind` is the union it
> derives, so a report or a settings screen names each check without retyping
> the five, and adding a check is one edit at the index.

- In the `## Types` table, after the `ThemeFailure` row (~129), add:

```
| `ThemeFailureKind` | The check that found a `ThemeFailure`; one member of `themeChecks`. |
```

- Leave the guarantee sentence at ~1432 intact; §3.9 derives it.

### 3.7 `docs/design-system.md`

- §11 (~670): “holds each result to all five checks (`platform-composition.test.ts`…)” → “holds each result to every check (`platform-composition.test.ts`…)”.
- ~689: “The five parts are available on their own” → “Each part is available on its own”.
- ~696: “reports a stack or an empty name that the other four checks cannot see” → “reports a stack or an empty name that no other check can see”.
- Optionally name `themeChecks` once beside the paragraph: “`themeChecks` is the ordered index of those parts.”

### 3.8 `packages/tokens/README.md`

- “That is one of five checks” → “That is one of the five checks” may stay if it
  is derived; prefer the derived form used by §3.10. Keep the sentence but let
  the test build it from `themeChecks.length`.
- “`themeFailures(theme, contrast = theme.contrast)` composes all five” stays;
  §3.10 derives the word.
- “The other three checks are available on their own.” → “Every check is also
  available on its own.” — the sentence is followed by the remaining checks in
  no particular order, and a count there is neither the total nor a meaningful
  subset.
- Add `themeChecks` to the order paragraph: “`themeChecks` is that order as a
  list.”

### 3.9 `packages/tokens/src/docs.test.ts`

- Import `themeChecks` and `type ThemeFailureKind`.
- Replace the hardcoded guarantee assertion in “states the size of the guarantee
  in both documents” with a sentence built from the index:

```ts
const checkNames = {
  color: "colour format",
  typeface: "typeface form",
  contrast: "contrast",
  hierarchy: "text hierarchy",
  metric: "numeric metrics",
} as const satisfies Record<ThemeFailureKind, string>;

const countWords = [
  "zero", "one", "two", "three", "four", "five", "six",
] as const;

expect(markdownProse).toContain(
  `The guarantee is ${countWords[themeChecks.length]} checks — ${sentenceList(
    themeChecks.map((kind) => checkNames[kind]),
  )}`,
);
expect(designSystem).toContain("Each part is available on its own");
expect(designSystem).toContain("`themeTypefaceFailures`");
```

(`sentenceList` already exists in this file; reuse it. If the helper is local to
`readme.test.ts`, copy it — the two files are separate suites.)

- Add a case that fails on a subset described as the guarantee:

```ts
it("does not describe a subset as the guarantee", () => {
  [markdown, designSystem].forEach((document) => {
    expect(document).not.toMatch(/\ball (?:three|four) checks\b/);
  });
});
```

- The public-value guard picks up `themeChecks` from the new sentence; the type
  guard picks up `ThemeFailureKind` from the new `## Types` row.

### 3.10 `packages/tokens/src/readme.test.ts`

- Import `themeChecks`.
- Add a case deriving the README's count statements:

```ts
it("states the number of checks from the index", () => {
  const countWords = [
    "zero", "one", "two", "three", "four", "five", "six",
  ] as const;
  const count = countWords[themeChecks.length];
  expect(readme).toContain(`That is one of ${count} checks`);
  expect(readme).toContain(`composes all ${count}`);
});
```

- Add the same negative phrase guard over the README:
  `expect(readme).not.toMatch(/\ball (?:three|four) checks\b/);`.

### 3.11 `COMPONENTS.md`

- **Total theme check** row: add one clause naming the index — “`themeChecks` is
  the ordered index of those five kinds and `ThemeFailureKind` the union it
  derives; every composition suite (`applied-palette`, `theme-choice`,
  `platform-composition`) asks the total check rather than a local subset.”
- **Platform style variants** row (~line 30): “to all four checks (plan 374)” →
  “to every check (plan 374)” — the same stale subset claim as
  `docs/tokens.md:735`.
- `packages/tokens/src/inventory.test.ts`: one case holds the Total theme check
  row to `themeChecks`/`ThemeFailureKind` and fails on “all three/four checks”
  anywhere in the ledger.

### 3.12 `TODO.md`

- Add a ticked row under `tokens-theme`:

> `[x]` Give the five checks an owner — `themeChecks` indexes the kinds and
> `ThemeFailureKind` derives from it; the three composition suites that ran
> three or four of the five (`applied-palette`, `theme-choice`,
> `platform-composition`) now call `themeFailures`, and the documents build the
> guarantee's count from the index instead of retyping “five” (plan 398)

- Bump the section header `163/220` → `164/221`.

### 3.13 `.agents/slop/plans/README.md`

- Add the `[398](./398-theme-check-index.md)` row after 397, status `done`.
- Add a closing paragraph with the measurement: three suites ran 3/5, 3/5 and
  4/5 of the guarantee; no token, pair, colour or floor moves.

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme

# Baseline before any edit (must be green).
nub run --filter @gpuixui/tokens test
# EXPECT: every test file passes.

# After the edits.
nub run --filter @gpuixui/tokens test
# EXPECT: the same suite count, plus the `themeChecks` order case, the
# docs count case and the README count case; all pass.
```

Two directions — the negative phrase guard must fail on the unfixed document:

```sh
git stash push -- docs/tokens.md
(cd packages/tokens && ./node_modules/.bin/vitest run src/docs.test.ts)
# EXPECT: "does not describe a subset as the guarantee" fails on
# "all four checks" at docs/tokens.md:735.
git stash pop

(cd packages/tokens && ./node_modules/.bin/vitest run src/docs.test.ts)
# EXPECT: pass.
```

Two directions — the type/kind tie must be real:

```sh
# Temporarily remove "metric" from themeChecks and run the order case.
(cd packages/tokens && ./node_modules/.bin/vitest run src/theme-check.test.ts)
# EXPECT: the order case fails (the composition still emits `metric`), and
# TypeScript rejects the payload map only if the payload key is removed too.
# Restore themeChecks before continuing.
```

Then the gate:

```sh
nub run check
nub run lint
nub run test
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe fails `themeFailures` after a
  composition suite is migrated — quote the set and the failure; no colour, pair
  or metric value is authorised to move;
- `themeChecks` cannot be introduced without a circular import between
  `theme-check.ts` and `contrast.ts`/`metrics.ts` — report the cycle;
- a document sentence that is true today (for example “the five fields” of
  `BoxShadow`) is caught by the negative phrase guard — narrow the guard to
  “checks”, never change a true sentence;
- a gate fails for a reason outside the files this plan names.

## 6. Acceptance criteria

- `themeChecks` is exported and `ThemeFailureKind` derives from it;
  `ThemeFailure` is a mapped type over the index.
- `applied-palette.test.ts`, `theme-choice.test.ts` and
  `platform-composition.test.ts` hold their compositions to `themeFailures`, and
  their titles state a count derived from `themeChecks.length`.
- `docs/tokens.md`, `docs/design-system.md` and `packages/tokens/README.md`
  state the guarantee and its count from the index; no document calls a subset
  the guarantee.
- The new order case fails if `themeFailures` emits a kind outside the index or
  in a different order.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Cross-team

None. No token value, colour, pair, floor or platform style changes, so no
consumer migration follows. The new exports are additive; `primitives`,
`components` and `docs-site` may use `themeChecks` to render a theme report, but
nothing requires it.
