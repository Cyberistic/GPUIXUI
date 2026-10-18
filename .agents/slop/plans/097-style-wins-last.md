# 097 — The caller's `style` must win last, and nothing guards it

| Field | Value |
| ----- | ----- |
| Phase | F (consistency) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `047`, `079`, `080`, `081`, `090` |
| Status | done |

Self-contained: §1 the gap, §2 the rule, §3 the files, §4 commands and expected
results, §5 the test plan and the two-direction proof, §6 STOP conditions, §7
outcome, §8 acceptance.

---

## 1. The gap

Two written promises say a caller's `style` wins over a part's own rules:

- `COMPONENTS.md`, the Boxes row: *"Every primitive merges a caller's `style`
  last"*;
- `docs/component-api.md` §3: *"`resolveStyle` resolves it and the result merges
  after the part's own rules"*.

Two components break it, each by re-applying layout **after** the merge:

1. `src/components/Progress.tsx` (the `track` constant):

   ```ts
   const track = mergeStyle(progressTrackStyle(spec, theme), {
     ...style,
     display: "flex",
     flexDirection: "row",
   });
   ```

   The indeterminate bar needs the row, but the caller's `display` and
   `flexDirection` lose to it. `style={{ flexDirection: "column" }}` is silently
   ignored.

2. `src/components/TextArea.tsx`:

   ```ts
   const style: StyleDesc = {
     ...fieldChrome(props, theme, focus.focused),
     height: undefined,
     paddingTop: vertical,
     paddingBottom: vertical,
   };
   ```

   `fieldChrome` has already resolved the caller's `style` (object or
   `StateStyle` callback) and applied it last; the textarea then overrides
   `height`, `paddingTop` and `paddingBottom` on top. A fixed-height composer —
   `style={{ height: 120 }}` — paints one row. The re-base itself is right (a
   textarea's height is rows, not a control height); only its **position in the
   merge** is wrong.

No test crosses the package for this rule, so both survived the state-style
plans (`079`–`081`), which asserted each part's own properties but never that the
caller's survive.

## 2. The rule

**On every public part that takes `style`, a property the caller sets reaches the
painted element unchanged.**

1. `Progress`: build the forced row layout into the base and merge the caller's
   style last:

   ```ts
   const base = mergeStyle(progressTrackStyle(spec, theme), {
     display: "flex",
     flexDirection: "row",
   });
   const track = mergeStyle(base, style);
   ```

   The indeterminate spacer/segment children are unchanged; a caller who sets
   `display: "block"` owns the consequence (it is their override, not a defect).
2. `TextArea`: keep the re-based defaults as the base and resolve the caller's
   style **after** them, through the one resolver the package already uses:

   ```ts
   const base: StyleDesc = {
     ...fieldChrome(props, theme, focus.focused), // caller style applied here today
     height: undefined,
     paddingTop: vertical,
     paddingBottom: vertical,
   };
   ```
   Re-resolve `props.style` over `base` with `resolvePartStyle` and the same
   `FieldState` (`disabled`, `focused`, `invalid`). A `StateStyle` callback is
   pure, so resolving it twice is safe; the second application is the one that
   counts. The explicit `height: undefined` stays the default, so a caller who
   sets nothing still gets rows.
3. One guard for the whole package: `src/components/style-order.test.tsx` walks
   the element tree every `render*` returns and asserts a sentinel property
   survives on at least one painted element. That covers the package rather than
   the two files, so the next re-base cannot hide.
4. `IconButton`, `InfoTip` and `Tooltip` are out of scope and must be named as
   such in the guard's comment: they compose a part and take no `style` prop
   (`Tooltip` styles its content from the theme, `IconButton` forwards to
   `Button`'s own contract).

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/Progress.tsx` | move the forced row into the base, merge `style` last |
| `packages/primitives/src/components/TextArea.tsx` | re-resolve `props.style` after the row re-base |
| `packages/primitives/src/components/style-order.test.tsx` | new: the sentinel guard over every `render*` that takes `style` |
| `packages/primitives/src/components/presentational.test.tsx` | optional: move the existing per-component style assertion here if the guard duplicates it |
| `packages/primitives/docs/progress.mdx` | state that `style` wins last, including `display` |
| `packages/primitives/docs/textarea.mdx` | state that `style.height` and padding win over the row re-base |
| `COMPONENTS.md` | Text areas + Progress rows: the merge rule is measured by the guard |
| `packages/primitives/README.md` | test counts after the run |
| `TODO.md` | tick the recorded task |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/097-style-wins-last.md` | §7 after the run |

Do **not** edit `packages/components`, `packages/tokens`, `packages/icons` or
`apps/*`.

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/components/style-order.test.tsx` | the guard fails on `Progress` and `TextArea` before the fix and passes after |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 38 files / 445 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx` | the textarea's rows and the input's height are unchanged |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/loading.runtime.test.tsx` | the indeterminate bar still moves and stays inside its track |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 21 files / 303 tests) |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test must be able to fail. Write them first, run against the unwired code,
and record the failing assertions in §7.

### 5.1 The guard (`src/components/style-order.test.tsx`)

A table of `{ name, render }` covering every `render*` that takes `style`:
`renderBox`, `renderStack`, `renderGrid`, `renderSeparator` (plain and
labelled), `renderSpacer`, `renderScrollArea`, `renderText`, `renderButton`,
`renderButtonGroup`, `renderCheckbox`, `renderCheckboxGroup`, `renderRadioGroup`,
`renderSwitch`, `renderInput`, `renderTextArea`, `renderNumberField`,
`renderOTPField`, `renderSelect` (its trigger), `renderProgress`, `renderMeter`,
`renderSkeleton`, `renderSpinner`, `renderSlider`, `renderRangeSlider`,
`renderRating`, `renderToggle`, `renderToggleGroup`, `renderLabel`.

1. **"a caller's style survives on every part"** — each case renders with its own
   sentinel style and the walker collects every element's `style` in the returned
   tree, asserting at least one element carries each sentinel property unchanged.
   The universal sentinels are `backgroundColor: "#010203"` and `height: 77`; the
   `Progress` case adds `display: "block"` and `flexDirection: "column"` because
   those are the two properties it re-applies today. A case may declare extra
   sentinels; it may not drop the universal pair.
2. **"the sentinel is not the base value"** — assert the base does not already
   paint the sentinel (a literal guard so the test cannot pass by coincidence).
3. **"a vertical textarea keeps its own height"** — `renderTextArea` with
   `style={{ height: 120 }}` resolves `height: 120`; without a caller height it
   still resolves `height: undefined` (rows own it).

### 5.2 The behaviours that must not move

4. **`Progress` indeterminate** — the existing loading runtime case still finds
   the spacer/segment in a row and inside the track (no new test; it must pass).
5. **`TextArea` rows** — the existing fields runtime case still proves the height
   follows `rows` and grows; a fixed `style.height` is the caller's own choice.

### 5.3 Two-direction proof (required before "done")

- Revert only `Progress`'s merge order: case 1 fails on `display`.
- Revert only `TextArea`'s re-resolve: case 1 fails on `height`, case 3 fails.
- Restore; every suite is green.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. A part consumes a `style` property into a different shape rather than painting
   it (e.g. a wrapper that applies it to an inner element). Record the shape;
   the guard may assert "reaches an inner element", but never silently skip it.
3. Letting a caller override a layout property breaks a measured behaviour (the
   indeterminate bar leaving its track, a textarea collapsing). Report the
   measurement and propose the documented restriction instead of forcing it.
4. A gate (`check`, `lint`, `test`) fails for a reason unrelated to this change.
   Report the output instead of masking it.

## 7. Outcome

Both exceptions are gone and the guard holds the whole package.

- **`Progress`** now builds its indeterminate row into the base and merges the
  caller's style last. Reverting only that line failed
  `Progress paints every caller property` with
  `display did not survive: expected ['flex'] to include 'block'`.
- **`TextArea`** builds the row re-base first (with `fieldChrome` resolving the
  chrome, then `height: undefined` and the density padding) and resolves the
  caller's `style` over it with `resolvePartStyle` and the same `FieldState`.
  The caller's callback runs once, not twice. Reverting it failed two cases:
  `TextArea paints every caller property` (`height did not survive: expected []
  to include 77`) and `honours a caller's height over the row model`.
- **The guard** (`src/components/style-order.test.tsx`) covers 29 `render*`
  functions: every part that takes a `style` prop, plus plain and labelled
  separators. 58 table cases (one "survives" and one "is not a base value" per
  part) plus two TextArea cases. `Arr.filterMap` in Effect v4 takes a `Result`,
  not an `Option`, so the collector maps to `Option` and uses `Arr.getSomes`.
- **Runtime measurement** (`runtime/fields.runtime.test.tsx`): a `TextArea` with
  `style={{ height: 60 }}` and one with `style={{ height: 120 }}` paint heights
  that differ by 60 ± 1 px (the 2 px inset is the runtime's box model). In the
  old direction both painted the one-row height and the case failed.
- Counts after the change: **offline 39 files / 505 tests**, **runtime 21 files /
  304 tests**, both green. `Progress`'s indeterminate row and `TextArea`'s rows
  are unchanged, proven by the loading and fields runtime suites.

## 8. Acceptance

- [x] Every public part that takes `style` paints a caller's property unchanged,
      proven by one guard.
- [x] `Progress` still paints its row and the indeterminate bar still moves
      inside its track.
- [x] `TextArea` still derives its height from rows when the caller sets none,
      and honours a caller's `height` and padding when they do.
- [x] The guard fails in two independent directions before the fix.
- [x] Docs, `COMPONENTS.md`, `README.md`, `TODO.md` and the index record it.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
