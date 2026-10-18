# 383 — A `Text` in a row paints outside it

| Field | Value |
| ----- | ----- |
| Phase | F (containment polish) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `059`, `082`, `097`, `365` |
| Status | done |

Self-contained: §0 the measured starting point, §1 the decision, §2 the rule,
§3 the files, §4 the commands, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 0. What is true before this plan (measured 2026-10-18)

`Text` renders the runtime's `<text>` host with the type role, the tone and the
alignment (`textStyle`). It sets no layout fact of its own, so as a flex item it
keeps CSS's automatic content floor: `min-width: auto` is the longest word, and
the item grows to its **max-content** width instead of wrapping.

Measured on this host with the real `TestRenderer`, a 220 px row holding a
sentence and a 40 px box:

| Element | Box | Result |
| ------- | --- | ------ |
| row | `x 12…232` | the bounded parent |
| text | `x 12…451`, `w 439`, `h 20` | **231 px past the row**, one line |
| box | `x 451…491` | the sibling is painted **outside the row** |

This is the class D40 names ("a text run is a flex item the runtime never
shrinks, so containment has to be a layout rule"), but D40 only fixed the
*controls* that own a label (`Button`, `CheckboxGroup`, a `Select` trigger,
`Label`) by clipping or wrapping inside a bounded control. The standalone `Text`
primitive had no rule, and nothing in the suite placed one in a bounded row — the
`runtime/text.runtime.test.tsx` cases are clamp, alignment, decoration and
semantics, all with the full surface width.

Passing `style={{ minWidth: 0 }}` in the same scene was measured to fix it: the
text paints `180` wide and `54` high (wrapped), and the box lands at `192…232`,
inside the row.

## 1. The decision

**A text run may shrink below its max-content width.** `textStyle` gains:

```ts
minWidth: 0,
```

- It removes the automatic content floor; the flex item's default shrink then
  applies, and the runtime wraps the run at the width it is given.
- It is inert where the text already had a bounded width: a column stretches its
  children, and a control that clips its label keeps its own rule. A `Text` that
  is the only child of a column paints exactly as before.
- `truncate` becomes honest: a one-line ellipsis needs a width to truncate
  against, and this is what lets a bounded row give it one.
- The caller's `style` still merges last, so `minWidth` can be raised back or a
  fixed width set.

The alternative — documenting "add `minWidth: 0` in a row" — was rejected: the
defect is that the primitive is the only library element that refuses to
contain itself, and every row that mixes text with a control would have to know
a flexbox detail the library exists to absorb.

## 2. Why the fix is in `textStyle`

`textStyle` is the one resolver every text role uses, and `mergeStyle` already
applies the caller's style after it. A component-level fix would leave
`renderText` (and the `Label`/`Separator` captions that compose it) on the old
behaviour.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | `textStyle` adds `minWidth: 0`, with the measured reason |
| `packages/primitives/src/components/presentational.test.tsx` | the text case asserts `minWidth` is `0` |
| `packages/primitives/runtime/text-overflow.runtime.test.tsx` | new suite: a bounded row wraps the text and keeps the sibling inside; a column is unchanged; `truncate` ellipsizes within a bounded row |
| `packages/primitives/docs/text.mdx` | the containment paragraph: a text run shrinks and wraps in a row, and `truncate`/`clamp` now get their bounded width from the row |
| `COMPONENTS.md` | the text/typography row records the measurement and the fix |
| `TODO.md` | add and tick the task; primitives count `127/127` → `128/128` |
| `.agents/slop/plans/README.md` | index this plan after `382` |

No public API changes.

## 4. Commands and expected results

From `packages/primitives`:

```sh
nub run test                                                  # 46 files, 671 → 672 tests, green
nub run check-types                                           # no output
nub run test:runtime runtime/text-overflow.runtime.test.tsx    # green (scoped: this is the evidence)
nub run test:runtime runtime/text.runtime.test.tsx             # green (clamp/alignment unchanged)
```

From the repo root:

```sh
nub run check    # green
nub run lint     # green
nub run test     # green
```

The full live suite needs a fresh session on this host (plan `379` §6 records the
window-accumulation degradation); the scoped files above are this change's live
evidence. Re-run the full suite before merging.

## 5. Test plan and the two-direction proof

**Element tree** (`src/components/presentational.test.tsx`): `renderText` for
every role resolves `minWidth: 0`, and a caller's `style={{ minWidth: 120 }}`
still wins. Fails by missing property without the fix.

**Runtime** (`runtime/text-overflow.runtime.test.tsx`):

1. **Row containment** — a 220 px row with a long sentence and a 40 px box: the
   text's right edge is inside the row, its height is greater than one line, and
   the box is inside the row. This is §0's scene.
2. **Column unchanged** — the same sentence as the only child of a column paints
   its full width and one line (or the natural wrap), proving the property is
   inert on the cross axis.
3. **Truncate** — a `truncate` text in a bounded row is one line and its width is
   the row's content width (it truncated rather than overflowed).

Failure directions to run before marking done:

| Mutation | Expected failure |
| -------- | ---------------- |
| `minWidth` removed | runtime 1: the text's right edge (`451`) is past the row (`232`); element case: `minWidth` is `None` |
| `minWidth` set on the column case only | runtime 1 unchanged — proves the row is the case that matters |
| `whiteSpace: nowrap` left on a `truncate` text | runtime 3: the width equals the max-content width, not the row's |

## 6. STOP conditions

- **A control's label or a `Label` row changes size.** Those already own their
  shrink/clip rules (plans `368`, `369`); the property must be inert there. Stop
  and report the measured box instead of shipping a regression.
- **A column's text wraps where it did not before.** The property is leaking to
  the cross axis; stop.
- **The row grows in width instead of the text wrapping.** `minWidth: 0` is not
  being applied to the text host; stop and report.

## 7. Measured results

Implemented and run on this host, 2026-10-18:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **46 files, 672 tests**, green (671 before) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run --filter @gpuixui/primitives test:runtime runtime/text-overflow.runtime.test.tsx` | **3 passed** (scoped) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/text.runtime.test.tsx` | **green** |
| `nub run check` | green |
| `nub run lint` | green |
| `nub run test` | green |

Before → after, in the 220 px row of §0:

| Measurement | Before | After |
| ----------- | ------ | ----- |
| text box | `w 439`, `h 20` | `w 180`, `h 54` (wrapped) |
| sibling box | `x 451…491` (outside) | `x 192…232` (inside) |
| row height | `20` | `54` |

Mutation outcomes:

| Mutation | Observed failure |
| -------- | ---------------- |
| `minWidth` removed | `runtime/text-overflow.runtime.test.tsx`: **2 failed** — "wraps a long sentence inside a bounded row" (`expected false to be true`) and "truncates a one-line run against the row's width" (`expected 439 to be 180`) |
| `minWidth` removed | `presentational.test.tsx`: **1 failed** — "may shrink below its own content width" (the resolved `minWidth` is `None`) |

`runtime/overflow.runtime.test.tsx`'s "still hugs a short option list" case fails
by 2 px in this session (`216` vs `218`) **with and without** the change — the
same line removed still fails — so it is the host's degraded frame (plan `379`
§6), not this property. The rest of that file and `runtime/text.runtime.test.tsx`
pass alongside the new suite (8/8 across the two text files).

The full live suite is re-run from a fresh session before merging (plan `379`
§6); the scoped files above are the evidence.

## 8. Acceptance

1. A long `Text` in a bounded row wraps and keeps its siblings inside the row.
2. A column's text and a control's label are unchanged.
3. `truncate` truncates within a bounded row.
4. The element and runtime guards fail when `minWidth` is removed.
5. `docs/text.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index record the
   change.
6. Every package and repo gate is green (the scoped live cases here; the full
   live suite before merge).
