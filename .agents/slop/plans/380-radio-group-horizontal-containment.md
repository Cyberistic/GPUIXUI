# 380 — A horizontal `RadioGroup` lets its options escape the group

| Field | Value |
| ----- | ----- |
| Phase | F (containment polish) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `055`, `061`, `079`, `084`, `089`, `097`, `355`, `359`, `368` |
| Status | done |

Self-contained: §0 the measured starting point, §1 the decision, §2 the rule,
§3 the files, §4 the commands, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 0. What is true before this plan (measured 2026-10-18)

Plan `368` established the containment rule for controls that own a label
(`PLAN.md` D40): a long label shrinks and wraps inside the control instead of
painting past it. It fixed the **vertical** radio group by giving the option
label and description `shrinkLayoutStyle` (`flexShrink: 1`, `minWidth: 0`).
That is enough while the group is a column: each option row is stretched to the
group's width, so the text has a bounded width to wrap in.

The options also accept `orientation="horizontal"`, which the docs describe as
"layout and the arrow axis". In that mode each option row is a **flex item of a
row**, and the row itself carries neither `flexShrink` nor `minWidth`, so its
base width is the max-content width of its label. Nothing shrinks it.

Measured on this host with the real `TestRenderer`, a 220 px frame holding a
horizontal `RadioGroup` whose two labels are 58 characters:

| Element | Box | Result |
| ------- | --- | ------ |
| frame | `x 12…232` | the bounded parent |
| group | `x 12…232`, `h 17` | the group is bounded, and one line tall |
| option `a` row | `x 12…365`, `h 17` | **133 px past the group's right edge** |
| option `b` row | `x 371…724`, `h 17` | **492 px past the group's right edge** |
| option `a` text | `x 34…365`, `h 17` | 331 px wide, unwrapped |

The two labels therefore paint over whatever sits to the right of the group and
the group itself stays 17 px high. The same test with a horizontal
`CheckboxGroup` paints both rows inside `x 12…232` at `h 85` (the labels wrap),
so the two groups disagree about a rule the docs state as universal:

> A long option label **wraps** inside the row rather than widening it, so the
> text stays inside the group (plan `368`).
> — `packages/primitives/docs/radio-group.mdx` §Limitations

The claim is false for the horizontal orientation. This is the same defect class
as `368` (containment) and `369`/`096`/`344` (a group must contain its children),
and no test renders a horizontal `RadioGroup` at all, so nothing caught it.

Passing `optionStyle={{ flexShrink: 1, minWidth: 0 }}` in the probe made the two
rows paint at `x 12…119` and `x 125…232` with the labels wrapped, which proves
the row is the element that needs the rule — not the text, and not the group.

## 1. The decision

**A selection row contains its own content in either orientation.** The rule is
added once to `selectionRowStyle` (`core/selection.ts`), the one resolver
`RadioGroup` and `CheckboxGroup` share, rather than to the radio component:

```ts
minWidth: 0,
```

- A row is a flex item, so it already shrinks when the group is narrower than
  its content. What stopped it was the **automatic minimum size** a flex item
  takes from its content: the row stayed at the label's max-content width even
  though it was allowed to shrink.
- `minWidth: 0` removes that floor. The row's default shrink then applies, it
  shares the horizontal group's width, the text has a bounded width, and it
  wraps. (`shrinkLayoutStyle` sets both `flexShrink` and `minWidth` because text
  can sit in any parent; a row is already a flex item of the group, so the
  missing fact is the floor, not the shrink.)
- A vertical group is unaffected: its rows are already stretched to the group's
  width, so the floor was never reached and the measured boxes do not change.
- The caller's `optionStyle`/`rowStyle` is merged last, so a consumer can still
  set a deliberate minimum on a row.

The docs' limitation line becomes true for both orientations and says so; it is
not deleted.

## 2. Why the fix is in the shared resolver, not `RadioGroup`

`selectionRowStyle` is already the one owner of "the row that owns the name, the
tab stop and both handlers" (plan `355`). Both data-driven groups paint through
it. A second copy in `RadioGroup` would be the drift plan `099` exists to
prevent. `CheckboxGroup` happens to shrink today because its label sits in a
nested column whose width can collapse; that is an accident of its child tree,
not a rule, so the shared resolver is also the honest place to state it.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/selection.ts` | `selectionRowStyle` adds `minWidth: 0`, with the D40 reference |
| `packages/primitives/src/components/selection.test.tsx` | element-tree case: every option row of a horizontal group removes the content floor |
| `packages/primitives/runtime/controls.runtime.test.tsx` | runtime case: a bounded horizontal group paints both rows inside the group, and both labels are taller than one line |
| `packages/primitives/docs/radio-group.mdx` | the limitation names both orientations; the theming note states the row's shrink rule |
| `packages/primitives/runtime/row-feedback.runtime.test.tsx` | no change (its vertical case stays the control) |
| `COMPONENTS.md` | Radio groups row records the fix, the measurement and the new runtime count |
| `TODO.md` | add and tick the task; primitives count `124/124` → `125/125` |
| `.agents/slop/plans/README.md` | index this plan after `379` |

No public API changes: the property is internal layout of an element the
component already owns.

## 4. Commands and expected results

From `packages/primitives`:

```sh
nub run test                 # 46 files, 669 → 670 tests, green
nub run check-types          # no output
nub run test:runtime runtime/controls.runtime.test.tsx -t "contains its options in a horizontal group"   # 1 passed
nub run test:runtime runtime/row-feedback.runtime.test.tsx     # green (the vertical row is unchanged)
```

From the repo root:

```sh
nub run check                # green
nub run lint                 # green
nub run test                 # green
```

The full live suite needs a fresh session on this host (plan `379` §6 records the
window-accumulation degradation); the scoped runtime cases above are the
evidence for this change. Re-run the full suite before merging.

## 5. Test plan and the two-direction proof

**Element tree** (`src/components/selection.test.tsx`): render
`<RadioGroup orientation="horizontal" … />` through `renderRadioGroup` with the
element-tree harness and decode the option rows. Assert each row's style has
`minWidth === 0`. This is the offline guard: it fails by missing property when
the floor is removed, and it does not need a window.

**Runtime** (`runtime/controls.runtime.test.tsx`): mount a horizontal
`RadioGroup` with `style={{ width: 220 }}` and two 58-character labels. Measure
the group and both rows (`runtime.bounds`):

- each row's `x ≥ group.x` and `x + width ≤ group.x + group.width`;
- each row's height is greater than one body line (`testTheme.typography.body.lineHeight`),
  proving the label wrapped rather than overflowed;
- the group's height is at least the row height (it contains them).

The failure directions:

| Mutation | Observed failure |
| -------- | ---------------- |
| Remove `minWidth` from `selectionRowStyle` | runtime case: `expected 365 to be less than or equal to 232`; element case: `minWidth` is `undefined` |
| Keep `flexShrink: 1` but remove `minWidth` | the same runtime failure: the automatic content floor still holds the row at max-content |

Both directions were run before marking done; §7 records them. `flexShrink: 1`
was tried and is **not** part of the fix: the runtime's flex items already
shrink, so the mutation that removes only that line leaves both cases green and
the property was dropped rather than shipped as decoration.

## 6. STOP conditions

- **The rows fit but the labels are clipped instead of wrapped.** Stop: the row
  shrank but the text did not; measure the `<text>` height and width, and do not
  accept a clipped label as containment.
- **The vertical group's row width or height changes.** The shared resolver is
  affecting the cross axis; stop and move the rule into the horizontal branch of
  the group instead of shipping a regression.
- **`CheckboxGroup`'s measured row boxes change.** Same as above: the rule must
  be inert for a group that already fits.
- **The group's height stays one line while the rows are contained.** The
  parent has a fixed height from the caller; that is a caller style, not this
  fix, and must be reported rather than overridden.

## 7. Measured results

Implemented and run on this host, 2026-10-18:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **46 files, 670 tests**, green (669 before) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run --filter @gpuixui/primitives test:runtime runtime/controls.runtime.test.tsx -t "contains its options in a horizontal group"` | **1 passed** |
| `nub run check` | green |
| `nub run lint` | green |
| `nub run test` | green |

The live suite collects **621 tests in 33 files** (620 before). The runtime
boxes after the fix, in the same 220 px frame as §0: the group is
`x 12…232`, `h 85`; option rows are `x 12…119` and `x 125…232`, both `h 85`;
each 58-character label paints 85 px wide and 85 px high (wrapped). The
`CheckboxGroup` control is byte-identical to §0 (rows 107 wide, group `h 85`).

Mutation outcomes:

| Mutation | Failing case | Failure |
| -------- | ------------ | ------- |
| `minWidth` removed | runtime "contains its options in a horizontal group" | `expected 365 to be less than or equal to 232` |
| `minWidth` removed | element "shrinks its rows so a horizontal group contains a long label" | `minWidth` is `undefined` |
| `flexShrink: 1` added without `minWidth` | runtime case, same numbers | `expected 365 to be less than or equal to 232` |

The full live suite was not re-run green in this session: plan `379` §6 records
the host's window-accumulation degradation after repeated suite runs. The whole
`controls.runtime.test.tsx` file shows the same shape here — 6 focus/motion
cases fail (an attached group's ring, a separated group's ring, the switch
slide, the switch's mount rest, and two focus rings). With the one-line fix
removed and the same command re-run, the same cases still fail, so it is the
host and not this change; the targeted horizontal case passes in isolation, and
the vertical row-feedback suite is 5/5. The scoped cases above are this change's
live evidence; the full suite is re-run before merging.

## 8. Acceptance

1. A horizontal `RadioGroup` in a bounded frame paints every option row inside
   the group and wraps each label.
2. The vertical `RadioGroup`, the `CheckboxGroup` and the row's hover/active
   wash are unchanged, proven by the existing suites.
3. The offline and runtime guards fail when the content floor is removed.
4. `docs/radio-group.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index record
   the change.
5. Every package and repo gate is green (the scoped live cases here; the full
   live suite before merge).
