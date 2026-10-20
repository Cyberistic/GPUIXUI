# 780 — `Progress` cannot announce the quantity it measures

| Field | Value |
| ----- | ----- |
| Owner | `primitives` workstream |
| Phase | F (integration and polish) |
| Paths | `packages/primitives/` plus the `Progress` row in `COMPONENTS.md`, `TODO.md` and the plan index |
| Depends on | 020, 026, 041, 053, 328, 580, 637, 755 |
| Status | planned |

## 1. The defect

A determinate `Progress` has exactly one accessibility channel. GPUix 0.10.0 has
no `aria-valuenow` (`docs/gpuix-capabilities.md` §2), so the bar's value reaches
assistive technology only through `aria-valuetext`, and `renderProgress` always
writes `progressValueText(value)` — the clamped percentage, `"42%"`.

That is the right default for "a task is 42 % done". It is the wrong *only*
option when the bar stands for a quantity. A caller uploading 4.2 of 10 MB, or
copying 3 of 10 files, can say `label="Uploading"` but cannot say **what** 42 %
means; the only channel that carries the value is fixed to a percentage. The
same data in `Meter` announces `"4.2 MB of 10 MB"` because `Meter` has a
`formatValue`. `Slider`, `RangeSlider` and `NumberField` have it too. `Progress`
is the one value-bearing part without the seam, so the library contradicts its
own rule that a value control announces what it measures.

The announced sentence is not cosmetic: a screen-reader user hears the
announcement instead of reading the fill, and a percentage alone cannot answer
"how many files are left".

## 2. The change

### 2.1 `packages/primitives/src/core/style.ts`

`progressValueText` gains an optional formatted sentence, using the package's
blank-string rule (`usableText` from `./text.js`, the same predicate
`valueText`, `ariaName` and `optionText` use):

```ts
export const progressValueText = (
  value: number,
  formatted?: string,
): string =>
  Option.getOrElse(usableText(formatted), () => `${Math.round(progressPercent(value))}%`);
```

- The default is byte-identical to today.
- A real sentence is returned verbatim (padding is the caller's, like `valueText`
  in `core/value.ts` — plans 580/593).
- A blank or whitespace-only sentence falls back to the percentage, so a
  computed missing unit cannot silence the bar (plans 026, 580).
- `value` is still clamped through `progressPercent`, so an out-of-range or
  non-finite value announces its bound (plan 755).

### 2.2 `packages/primitives/src/components/Progress.tsx`

`ProgressProps` gains:

```ts
/**
 * How the value is announced, e.g. `"3 of 10 files"`. Receives the clamped
 * percentage (the fill's value), not the caller's raw quantity — close over
 * your own numbers for a unit. Defaults to the whole percentage; a blank
 * result falls back to it. Indeterminate bars always announce `"loading"`.
 */
readonly formatValue?: (value: number) => string;
```

`renderProgress` computes the clamped percent once and resolves the sentence:

```ts
const percent = value === undefined ? undefined : progressPercent(value);
const announcement =
  percent === undefined
    ? "loading"
    : progressValueText(percent, formatValue?.(percent));
```

- A determinate bar calls `formatValue` with the **clamped** percent, matching
  `Meter`'s clamped `formatValue(value)` and `Slider`'s clamped value.
- An indeterminate bar never calls it: `"loading"` is the state, not a value.
- The fill, track, tone, timer and `style` merge are untouched.

Also correct the stale plan reference in this file's header: the whole-percent
rule landed in plan `755`, not `754` (the spinner-contrast plan). The same stale
reference is in `src/components/Progress.test.tsx`'s header.

### 2.3 Tests

1. **`src/core/style.test.ts`** (inside the existing `describe("progress")`):
   - `progressValueText(42, "3 of 10 files")` is `"3 of 10 files"`.
   - `progressValueText(100 / 3, "a third")` returns the sentence verbatim, not
     a rounded percentage.
   - `progressValueText(42, "   ")` falls back to `"42%"`.
   - The existing default cases (fraction, clamp, `NaN`, infinities) stay
     unchanged — the default path must not move.
2. **`src/components/Progress.test.tsx`**: the rendered bar's `aria-valuetext`
   is the formatter's sentence for a determinate bar; an indeterminate bar with
   a formatter still announces `"loading"`; a blank formatter announces
   `"42%"`. Assert the fill width is unchanged in the formatted case (the
   announcement is not geometry).
3. **`runtime/progress-announcement.runtime.test.tsx`**: a native case mounts
   `<Progress value={42} label="Copying files" formatValue={() => "3 of 10 files"} />`
   and requires the AccessKit value `"3 of 10 files"` plus an unchanged
   one-third-paint check for the existing fractional case. Update the file
   header to name both rules (755 and 780).

**Both directions.** With the prop passed but ignored (the old render), the
element and runtime cases report `"42%"` and fail by name. With the blank
fallback removed, the blank-formatter case fails. With the paint derived from
the sentence, the unchanged fill-width assertion fails.

### 2.4 Docs, example, inventory, TODO

- **`docs/progress.mdx`**: add the `formatValue` API row; one usage snippet with
  a file-count formatter; the Accessibility section states the default, the
  formatter's clamped input, the blank fallback and that `"loading"` ignores it;
  the Limitations section states that the formatter receives the percentage (a
  byte/file count is closed over, not passed).
- **`examples/form.example.tsx`**: the saving `Progress` passes a formatter, so
  the mounted example exercises the prop:
  `<Progress label="Creating project" value={60} tone="success" formatValue={() => "Step 3 of 5"} />`.
  The examples runtime suite mounts it in both palettes.
- **`COMPONENTS.md`** Progress row: one sentence with plan `780`, the measured
  sentence and the fallback rule.
- **`TODO.md`**: one `[x]` row under the primitives section with the measured
  counts.
- **`.agents/slop/plans/README.md`**: index this plan.
- README current file counts do not change (no new test file; the runtime case
  joins an existing suite). `src/docs-counts.test.ts` must stay green.

## 3. Commands and expected results

```sh
# 1. Offline: the new core and element cases plus the whole package suite.
nub run --filter @gpuixui/primitives test
# expected: 71 files, 989 + 6 tests, 0 failed (baseline measured 2026-10-20:
# 71 files / 989 tests green on this tree)

# 2. Types.
nub run --filter @gpuixui/primitives check-types
# expected: exit 0

# 3. The scoped runtime file, then the examples suite the changed example mounts.
nub run --filter @gpuixui/primitives test:runtime runtime/progress-announcement.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/examples.runtime.test.tsx
# expected: 2/2 in the first file, every case green in the second

# 4. The docs/contract guards that read props and pages.
nub run --filter @gpuixui/primitives test src/contract.test.ts src/docs-counts.test.ts src/docs-coverage.test.ts
# expected: green (the API table must name formatValue)

# 5. Package gates.
nub run --filter @gpuixui/primitives lint
nub run check:tests
# expected: exit 0
```

`nub run check` still stops at `nub run fmt` on
`apps/docs/src/components/docs/demos.tsx` (another workstream's unformatted
file, recorded in `TODO.md`). Run the package commands above and every earlier
stage; do **not** reformat that file.

**Scenario ids:** this change touches no playground scenario; the native proof
is the package's own `test:runtime` file above. Record that no `--only` id was
needed.

## 4. STOP conditions

- **STOP** if `progressValueText(value)` without a sentence changes any existing
  announcement: the default must be byte-identical.
- **STOP** if `Meter`'s announcement or `valueText`'s blank rule would have to
  change; this plan reuses them, it does not rewrite them.
- **STOP** if the fill width, tone, timer count or `style` merge changes; the
  announcement is not geometry.
- **STOP** if the example needs a new file or the examples registry changes; the
  existing form example is the one to update.
- **STOP** if the runtime's AccessKit value for the formatted bar does not equal
  the sentence: report the dump rather than relaxing the assertion.

## 5. Acceptance

- `Progress` accepts `formatValue`; a determinate bar announces its sentence, a
  blank one falls back to the percentage, and an indeterminate bar stays
  `"loading"`.
- The core, element and runtime cases fail against the old render and pass with
  the change; the fill-width assertion holds in both directions.
- `docs/progress.mdx`, the example, `COMPONENTS.md`, `TODO.md` and the plan index
  tell the truth about the seam and its limits.
- The offline suite, `check-types`, the scoped runtime files, `lint` and
  `check:tests` are green; the run counts are recorded in `TODO.md`.

## 6. Outcome

_Landed 2026-10-20._

- `progressValueText` takes an optional caller sentence and falls back through
  `usableText`, so the percentage default is byte-identical; `Progress` gains
  `formatValue`, receives the clamped percent, and an indeterminate bar never
  calls it.
- **Both directions measured.** With the old render (the formatter passed and
  ignored) the element case fails `expected '42%' to be '3 of 10 files'` and the
  scoped runtime case fails by the same AccessKit value. With the blank
  fallback replaced by `formatted ?? …`, the core and element blank cases fail
  `expected '   ' to be '42%'`. Restored, the fill-width assertions in both the
  element and runtime cases still pass, so the sentence did not move the paint.
- The form example's busy bar now announces `"Step 3 of 5"`; its runtime case
  (the form example's save) asserts that sentence.
- Offline **71 files / 994 tests**, scoped runtime
  `progress-announcement` + `examples` **2 files / 22 tests**, `check-types`,
  `lint` and `check:tests` green. `nub run fmt` reports only
  `apps/docs/src/components/docs/demos.tsx`, the pre-existing file owned by the
  docs-site workstream (recorded in `TODO.md`); every touched file is
  format-clean.
- No playground scenario id was needed: the native proof is the package's own
  `test:runtime` file. The stale plan references in `Progress.tsx` and
  `Progress.test.tsx` now name `755` (the fractional-announcement plan) instead
  of the spinner-contrast plan `754`.
