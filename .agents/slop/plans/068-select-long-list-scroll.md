# 068 — `Select`'s list runs off the window instead of scrolling

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `062`, `066`, `156` |
| Status | planned |

Self-contained: §1 measurement, §2 the rule, §3 files, §4 tests, §5 STOP list.

---

## 1. The bug, measured

The wrapper caps nothing: the list's height is however many options it has. A
30-option select measured on this host (GPUix 0.10.0, `TestRenderer`,
1280×800):

| Quantity | Value |
| -------- | ----- |
| list (`<anchored>`'s content div) | `x 12, y 8, w 83, h 908` |
| last option's text | `y 888.5` — outside the 800 px window |
| `getScrollOffset(list)` | `null` — not a scroll container |

The layer is clamped to the top margin and its bottom half is clipped: options
past roughly the 26th are painted outside the window and cannot be reached with
the pointer, the wheel or (since the list is not a focus owner) the keyboard.

**Probe of the fix.** With `maxHeight: 400; overflowY: "scroll"` on the content
div: list `y 44, h 400`, a wheel at the list centre moves the scroll offset to
`-176`, and the last option's text moves to `y 424` — inside the list. The
runtime does scroll a capped floating layer.

## 2. The rule

- The list keeps its natural height while it fits the space on its side.
- When it does not, `maxHeight` is that space (the trigger edge to the window
  margin) and the list becomes a scroll container.
- The space is the same number the side decision used, so the capped layer sits
  exactly at the clamp boundary instead of being re-snapped.
- An explicit `side` still caps: a consumer forcing `bottom` on a long list gets
  a scrollable list, not one running off the window.

`availableOn(request, side)` (pure, beside `decideVerticalSide`) is the one
place that turns a box into "pixels between the trigger and the margin".

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/floating.ts` | add `availableOn(request, side)` |
| `packages/primitives/src/core/index.ts` | export it |
| `packages/primitives/src/components/Select.tsx` | `selectContentStyle` takes an optional `maxHeight` and then sets `maxHeight` + `overflowY: "scroll"`; `SelectPlacement` carries it; the wrapper derives it from the measured box, the side and `availableOn` |
| `packages/primitives/src/core/floating.test.ts` | two `availableOn` cases (below and above) |
| `packages/primitives/src/components/Select.test.tsx` | capped and uncapped `selectContentStyle` |
| `packages/primitives/runtime/fields.runtime.test.tsx` | a 30-option select: capped, scrollable, last option reachable |
| `packages/primitives/docs/select.mdx` | placement/limitations/verification |
| `packages/primitives/README.md` | capability row |
| `COMPONENTS.md` | `Selects` row + runtime count |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan as **done** with the outcome |

Notes:

- `selectContentStyle(theme, minWidth?, maxHeight?)`: when `maxHeight` is absent
  neither `maxHeight` nor `overflowY` is set, so a short list is unchanged.
- The wrapper computes `maxHeight` from the *same* measurement that chooses the
  side, so it must run after the trigger's box is known; before that, nothing is
  capped (the first open is measured anyway, like the side).
- `overflowY: "scroll"` is the runtime's scroller idiom (`scrollStyle`); the
  scrollbar is platform-themed (no tint in 0.10.0 — already documented).

## 4. Test plan and commands

Offline:

1. `availableOn` returns the space below and above for a known box.
2. `selectContentStyle(testTheme)` has neither `maxHeight` nor `overflowY`;
   `selectContentStyle(testTheme, 100, 300)` has `maxHeight: 300` and
   `overflowY: "scroll"`.

Runtime:

3. **long list** — 30 options, opened: the list's painted bottom is inside the
   window margin (`y + height <= 800 - 8`); the list is a scroller
   (`getScrollOffset` is not `null`); a wheel at the list centre moves the
   offset; after scrolling to the end the last option's text is inside the
   list. Without the cap the list is 908 px tall and the last option sits at
   `y 888.5`.

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
```

Expected: offline +4; runtime **161** (160 + 1).

**Two-direction proof:** drop the `maxHeight`/`overflowY` pair, run test 3,
record the exact failure in §6, restore.

## 5. STOP conditions

- Stop if the capped list stops opening at all (the layer may require a
  measured height before positioning) — report, do not fight the layer.
- Stop if a wheel over the capped list does not move `getScrollOffset`; the
  content div may not be the scroller. Do not add a second wrapper without
  evidence.
- Stop if capping changes the list's width (the `minWidth` measurement must be
  unaffected); report the measured pair.

## 6. Outcome

Executed on this host, 2026-10-17.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 29 files, **337 tests green** (334 + `availableOn`, capped style, non-shrinking row) |
| `nub run --filter @gpuixui/primitives test:runtime` | 15 files, **161 tests green** (160 + the long list) |
| 30 options, before | list `y 8, h 908`; last option text `y 888.5`; `getScrollOffset` `null` |
| 30 options, after | list `y 44, h 748`; scroller; wheel to `-158`; last option text `y 766.5` inside the list |
| row height | 28 px kept (without `flexShrink: 0` the rows squashed so the last row ended at `784`, inside the uncapped list) |

**Three-direction proof** (each restored after measuring):

| Removed change | Failure |
| -------------- | ------- |
| the `maxHeight`/`overflowY` pair | `expected 916 to be less than or equal to 792` |
| `overflowY` only (cap kept) | `expected null not to be null` — not a scroller |
| `flexShrink: 0` on the row | `expected 784 to be greater than 792` — rows squashed, no overflow |

The execution also found a limitation the plan did not anticipate, now recorded
in `docs/select.mdx` and `COMPONENTS.md`: **GPUix owns the highlight and exposes
no active-index signal**, so the capped list does not scroll when the arrows
move past the fold. Measured: 29 Down presses moved the highlight to
"Option 28" and Enter committed it with the list still at offset `0`. The wheel
and pointer reach every option; a long list still wants a combobox.

