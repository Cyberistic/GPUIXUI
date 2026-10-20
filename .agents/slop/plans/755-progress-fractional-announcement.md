# 755 — A fractional `Progress` announces a raw float

**Status:** done · **Phase:** C/F · **Owner:** primitives
**Depends on:** `041`, `053`, `328`, `580`, `588`, `641`

## 1. The defect

`Progress`'s only accessibility channel is `aria-valuetext` (0.10.0 has no
`aria-valuenow`, plan `020` §1.4). `renderProgress` builds it as
`` `${progressPercent(value)}%` `` and `progressPercent` clamps without
rounding, so a bar fed a **computed** percentage — the normal case, e.g.
`value={(bytesLoaded / bytesTotal) * 100}` — announces the raw binary float.

Measured through the element tree (`renderProgress({ value: 100 / 3 }, …)`):

```
aria-valuetext: "33.333333333333336%"
```

Nineteen characters of float on a progress bar, spoken by a screen reader on
every re-render while a download advances. The fill is correct — a `width` of
`33.333333333333336%` is exactly one third of the track — but the **announced
value** is not a number a person says.

The paint must stay exact; only the sentence changes. That is the same split the
package already makes between a painted value and its text (`valueText`,
`numberDisplay`, plans `580`, `593`).

## 2. Approach

One pure rule in `core/style.ts`, beside `progressPercent`:

```ts
/** The whole percentage a progress bar announces; the paint stays exact. */
export const progressValueText = (value: number): string =>
  `${Math.round(progressPercent(value))}%`;
```

- `Math.round`, not truncation: `99.6` reads `100%`, matching what the eye sees.
- Clamping stays `progressPercent`'s, so `140.5` → `100%`, `-0.4` → `0%`,
  `NaN` → `0%`, `±Infinity` → the bound on its side (plan `637`).
- Indeterminate stays the component's `"loading"`; the helper is total over a
  number and does not invent an absence.

`renderProgress` uses it for the determinate branch and keeps
`progressFillStyle`'s exact width untouched.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | Add `progressValueText` with a TSDoc summary (exported values are guarded by `src/tsdoc.test.ts`, plan `349`). |
| `packages/primitives/src/core/index.ts` | Export it beside `progressPercent`, in the same alphabetical list. |
| `packages/primitives/src/components/Progress.tsx` | Import `progressValueText`; `aria-valuetext={determinate ? progressValueText(value) : "loading"}`. (`progressPercent` then leaves this file.) |
| `packages/primitives/src/components/Progress.test.tsx` | Two cases: a fractional value announces `"33%"`; the same bar's fill still paints `33.333333333333336%` wide. |
| `packages/primitives/runtime/progress-announcement.runtime.test.tsx` | New scoped file: a third-filled bar's AccessKit value is `"33%"`, and its painted fill is a third of the track (the announcement is not the paint). It is a separate file because a concurrent session owns `loading.runtime.test.tsx` in this tree; the runtime-hygiene guard requires the header comment. |
| `packages/primitives/docs/progress.mdx` | State the rule in the Accessibility section and in the value row: the announced percentage is a whole number while the fill is exact. |
| `COMPONENTS.md` | Extend the Progress row with the rule and the plan number. |
| `TODO.md` | Add and tick the task under the primitives section. |
| `.agents/slop/plans/README.md` | Add the row in the primitives table after `753`. |

No new public component, no change to any prop, no change to the paint.

## 4. Commands and expected results

Run in `workspaces/primitives`:

```sh
nub run --filter @gpuixui/primitives test src/components/Progress.test.tsx
# expected: all Progress cases pass, including the two new ones

nub run --filter @gpuixui/primitives test src/core/style.test.ts
# expected: the new core case passes

nub run --filter @gpuixui/primitives test:runtime runtime/progress-announcement.runtime.test.tsx
# expected: 1 case passes

nub run --filter @gpuixui/primitives check-types
# expected: exit 0

nub run --filter @gpuixui/primitives test
# expected: every offline suite green (the end-of-task check)
```

The repo-wide `nub run check` also runs `fmt`; `apps/docs/src/components/docs/demos.tsx`
is unformatted on the branch and is **outside this workstream** (already recorded
in `TODO.md` as a docs-site row). Run `nub run check:tests`, `nub run lint` and
`nub run check-types` here; report the external `fmt` failure rather than fixing
another workstream's file.

## 5. Test plan, both directions

The new cases are the *fix* direction; prove the *old* direction by temporarily
reverting `progressValueText` to the raw interpolation.

1. **Core (offline).** `progressValueText(100 / 3)` is `"33%"`;
   `progressValueText(42)` is `"42%"`; `progressValueText(140.5)` is `"100%"`;
   `progressValueText(-0.4)` is `"0%"`; `progressValueText(Number.NaN)` is `"0%"`;
   `progressValueText(Number.POSITIVE_INFINITY)` is `"100%"`.
   With the raw expression, the fractional case fails by name
   (`"33.333333333333336%"`), every other case still passes — the guard is
   specifically the float.
2. **Element tree.** The rendered bar's `aria-valuetext` is `"33%"` while its
   fill's `width` is `"33.333333333333336%"`; reverting the announcement fails
   the first assertion, rounding the fill fails the second. This is the
   both-directions pair: a fix that rounds the paint is not the fix.
3. **Runtime.** The AccessKit value of a `value={100 / 3}` bar is `"33%"`, and
   the painted fill is a third of the track within 1 px. Removing the fix fails
   the announcement; the fill assertion keeps the paint honest.
4. **Regression sweep.** `Progress`'s existing cases (clamp at 140 / −5,
   indeterminate `"loading"`, integer `"42%"`, tone, blank label) stay unchanged
   and green.

`src/check-tests.ts` (through `nub run check:tests`) must accept all of them —
each asserts a computed value against a distinct expected value, so none is
vacuous.

## 6. STOP conditions

- **STOP** if `progressValueText` cannot live in `core/style.ts` without
  importing React or a theme (it must stay pure; it takes a number only).
- **STOP** if the runtime's AccessKit value for the fractional bar reports the
  painted width rather than `aria-valuetext` — that would mean the channel is
  not the one the package documents, and the plan's premise is wrong. Report the
  dump instead of changing the assertion.
- **STOP** if any existing `Progress` case changes result, or if the fill's
  width assertion needs a different number than `33.333333333333336%` (the paint
  must not be touched).
- **STOP** if `check-types` fails in a way not caused by these files.

## 7. Acceptance

- A computed `value` announces a whole percentage, and the fill is still exact.
- The core, element and runtime cases fail with the raw expression and pass
  with it.
- `docs/progress.mdx`, `COMPONENTS.md` and `TODO.md` state the measured rule.
- The plan is indexed; the offline suite, `check:tests`, `lint` and
  `check-types` are green locally.
