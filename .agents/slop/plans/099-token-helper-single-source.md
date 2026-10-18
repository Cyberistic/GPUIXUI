# 099 — The focus ring has one owner, and `selection.ts` kept a copy

| Field | Value |
| ----- | ----- |
| Phase | F (consistency) |
| Owner | primitives workstream |
| Depends on | `011`, `017`, `021`, `030`, `041`, `084` |
| Status | done |

Self-contained: §1 the gap, §2 the rule, §3 the files, §4 commands and expected
results, §5 the test plan and the two-direction proof, §6 STOP conditions, §7
outcome (filled after the run), §8 acceptance.

---

## 1. The gap

`PLAN.md` D17 and plan `021` say the tokens package owns the runtime-shaped
helpers and the primitives package's copies were deleted:

> `primitives` imports `@gpuixui/tokens` directly; the `PrimitiveTheme` port, the
> local focus-ring geometry and the first-shadow helper are deleted.

`src/core/style.ts`, `InfoTip.tsx` and `ScrollArea.tsx` do import
`focusRing`/`elevationShadow`. `src/core/selection.ts` does not:

```ts
/** The ring a focused selection control paints: no offset, no blur, a spread. */
const focusRing = (
  theme: PrimitiveTheme,
): NonNullable<StyleDesc["boxShadow"]> => ({
  offsetX: 0,
  offsetY: 0,
  blurRadius: 0,
  spreadRadius: theme.borderWidth.strong,
  color: theme.colors.ring,
});
```

It is byte-for-byte the current value of tokens' helper, so nothing is visibly
wrong today. Two things are still true:

1. the library has **two declarations** of the focus ring, and a future change to
   tokens' helper (an offset, a second shadow, a different colour role) must be
   mirrored by hand in `selection.ts`;
2. nothing in the package forbids the third copy. The focus-ring matrix
   (plan `084`) compares each control's paint to tokens' `focusRing(theme)`, so a
   drift would fail a *runtime* test — but only on a host with a binding, and
   only after someone changes the helper.

The package's rule should be structural, not remembered.

## 2. The rule

**A shadow's geometry is tokens'. A component names the helper; it never builds
the value.** `focusRing` and `elevationShadow` are the only sources of a
`boxShadow`, and a local copy fails a source guard by file and line.

1. `core/selection.ts` imports `focusRing` from `@gpuixui/tokens` and assigns
   `style.boxShadow = focusRing(theme).boxShadow`, exactly as `core/style.ts`
   already does for the field chrome.
2. A new guard, `src/core/token-helpers.test.ts`, reads every non-test source
   file under `src/` (excluding `core/testing/`, which is a theme fixture) and
   fails when it finds a hand-built shadow geometry (`spreadRadius`,
   `blurRadius`, `offsetX` or `offsetY` on a shadow). The failure names the file
   and line and says to use the tokens helper.
3. The theme fixture keeps its literals: it is the one place that *declares* a
   theme, and the guard's allowlist names it explicitly rather than skipping the
   directory silently.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/selection.ts` | delete the local `focusRing`; import tokens' helper and use `.boxShadow` |
| `packages/primitives/src/core/token-helpers.test.ts` | new: the source guard |
| `packages/primitives/README.md` | the theme section says the ring geometry has one owner; count |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/099-token-helper-single-source.md` | §7 after the run |

No component behaviour changes, so no docs page changes. Do **not** edit
`packages/tokens` or `packages/components`.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/token-helpers.test.ts` | fails on `core/selection.ts` before the fix, passes after |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 39 files / 510 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/focus-ring.runtime.test.tsx` | the 17-control matrix still paints exactly one token ring each |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 21 files / 307 tests) |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

## 5. Test plan

1. **"a component never builds a shadow"** — walk `src/**/*.{ts,tsx}` (tests and
   `core/testing/` excluded), collect every line matching a shadow-geometry key,
   and assert the list is empty. On the unfixed tree it reports
   `core/selection.ts:<line>`.
2. **"the fixture is the only shadow literal"** — assert the guard actually sees
   the fixture (so a broken walker cannot pass by finding nothing), i.e. the
   unfiltered walk matches at least one allowed file. This is the liveness half:
   a guard that reads no files must not pass.
3. **Behaviour unchanged** — the focus-ring matrix and the theme runtime suites
   must stay green; no new runtime test is needed because none of the painted
   values change.

Two-direction proof: the guard fails before the fix; after the fix, re-adding a
local ring literal to `selection.ts` makes it fail again; restoring it keeps
every suite green.

## 6. STOP conditions

1. A legitimate component needs a shadow that is neither the focus ring nor an
   elevation level. Report it and add a named helper to tokens instead of
   widening the guard.
2. The source walk cannot read the package root under the test runner. Use the
   same `FileSystem`/`Path` pattern as `src/exports.test.ts`, not a relative
   `fs` import.
3. A gate fails for a reason unrelated to this change. Report the output.

## 7. Outcome

The copy is gone and the rule is structural.

- `core/selection.ts` imports `focusRing` from `@gpuixui/tokens` and paints
  `focusRing(theme).boxShadow` at both focus sites, exactly like `core/style.ts`.
  The 11-line local builder is deleted.
- `src/core/token-helpers.test.ts` walks every non-test source file under `src/`
  (skipping `core/testing/`) and reports any line that assigns a shadow geometry.
  On the unfixed tree it failed with the four exact lines:
  `src/core/selection.ts: offsetX: 0`, `offsetY: 0`, `blurRadius: 0`,
  `spreadRadius: theme.borderWidth.strong`. Re-adding the same literal to one
  site failed it again; restoring the helper kept it green.
- **Liveness:** the walk asserts it read more than 20 files and found
  `src/index.ts`; a second case reads the theme fixture directly and requires at
  least one match, so a broken pattern cannot pass by matching nothing.
- The two effectful readers carry `PlatformError` in the error channel — the walk
  is a real filesystem effect, not a swallowed failure.
- **Counts:** offline **40 files / 512 tests** (was 39 / 510); runtime unchanged
  at **21 files / 307 tests** (the focus-ring matrix 17/17 still paints exactly
  one token ring per control; no painted value changed). `nub run check`,
  `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] `core/selection.ts` names tokens' `focusRing`; no local geometry remains.
- [x] The guard fails on the unfixed tree and on a reintroduced literal, and
      proves it reads real files.
- [x] The focus-ring matrix and both theme suites are still green.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
