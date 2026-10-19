# 686 — A stale density keeps the theme's preset; it does not empty the metrics

**Workstream:** `tokens-theme` · **Phase:** F (documentation truth) · **Block:** `500–699`
**Depends on:** 068 (`isDensityName`), 089/534 (density merge), 380 (stored choice),
685 (the inverse diff, same section)

## 1. The defect

`docs/tokens.md` § *Density* tells the reader:

> A persisted density is `unknown`; narrow it before it reaches `extendTheme`,
> or a stale setting becomes a theme with no metrics.

The consequence is false in both readings:

- a stale **string** (`"dense"`, `"spacious "`) is not a `DensityName`, so
  `mergeDensity` falls through to the object path, finds no `preset`, and returns
  the base density — a valid theme with the base's metrics, not an empty one;
- the documented boundary helper already does the right thing:
  `themeWithDensity(theme, stored)` returns the theme unchanged for an unknown
  value (`packages/tokens/src/persisted-choices.example.ts`), and
  `resolveThemeChoice` keeps the resolved preset (both executed and guarded in
  `guards.test.ts` and `theme-choice.test.ts`).

A reader following the page is told to fear a failure the library does not have,
and the safe, tested helper the page should teach is not named in that paragraph.

## 2. The decision

Correct the paragraph and hold it to the behaviour already tested. No code,
colour, pair, floor, metric or shipped theme changes.

The paragraph becomes:

```
`densityNames` lists the three presets in documentation order, and `DensityName`
derives from it, so a preset cannot exist without a table row or a value in
`densityPresets`. A persisted density is `unknown`; narrow it with
`isDensityName` before it reaches `extendTheme` — `themeWithDensity` in
[`src/persisted-choices.example.ts`](../packages/tokens/src/persisted-choices.example.ts)
returns the theme unchanged for a value the library does not ship, and
`resolveThemeChoice` applies the same rule:
```

The snippet that follows (`resolveDensity`) is unchanged.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `docs/tokens.md` | the paragraph above; no other section |
| `packages/tokens/src/docs.test.ts` | one case in the density describe: the paragraph names `isDensityName` and `themeWithDensity`, and the false "no metrics" claim is gone |
| `TODO.md` | add and tick the task; progress bar follows the new total |
| `.agents/slop/plans/README.md` | table row `686` and a short summary paragraph |

`packages/tokens/README.md` does not repeat the claim (checked), so it does not
change.

## 4. Test plan (can fail)

In the existing density describe of `docs.test.ts`:

```ts
it("sends a stored density through the guard, not into extendTheme raw", () => {
  expect(markdownProse).toContain(
    "A persisted density is `unknown`; narrow it with",
  );
  expect(markdownProse).toContain("`themeWithDensity`");
  expect(markdownProse).not.toContain("a theme with no metrics");
});
```

Reverting the paragraph makes the first two assertions fail and the third fail.
The behaviour the sentence now states is already guarded by
`guards.test.ts` (`themeWithDensity(lightTheme, "dense").density` equals the
base) and `theme-choice.test.ts` (a stale stored density keeps `compact`).

## 5. Commands and expected results

```bash
nub run --filter @gpuixui/tokens test
nub run check
nub run test
```

All must pass. `check` re-runs the formatting gate after the Markdown edit.

## 6. STOP conditions

- If `markdownProse` is not in scope in that describe, add the case to the
  nearest describe that already uses it; do not change the guard's helper.
- If another document repeats the false claim, add it to the same case rather
  than widening the change.

## 7. Acceptance

The paragraph teaches the guarded path and states no false consequence; the
docs case passes and fails when reverted; gates are green; the task is ticked
and indexed.
