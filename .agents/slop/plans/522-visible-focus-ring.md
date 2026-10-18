# 522 — every focusable part paints the focus ring

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) — keyboard focus must be visible |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `117`, `200`, `201`, `305`, `315`, `318`, `314`, `132`, `316`, `319`, `332`, `388`, `394`, `391` |
| Status | done — 9 new native cases across six suites (behaviour 686), 7 mutation proofs; docs, `COMPONENTS.md` and the inventory synced |
| Evidence | §1 — measured in the real `TestRenderer` on this host, 2026-10-18 |

This plan is self-contained. Run every command; do not claim a test passed
unless it ran.

---

## 1. Why — the bug, measured

`@gpuix/native@0.10.0` paints no default focus indication: a part shows focus
only because it paints the token ring (`focusRing(theme)`, a spread `boxShadow`)
from its own focus state. `COMPONENTS.md` records that as the design system's
"Focus state" row, and plans `388` and `394` swept the parts that already owned
a ring.

Seven focusable controls were never made ring-owning. A keyboard user can tab to
them and sees nothing. Measured with this probe, in the real renderer:

```tsx
// focus each control, then re-read the element (the renderer repaints it)
const report = (root, testId) => {
  const before = root.renderer.findByTestId(testId);
  root.renderer.focusElement(before?.id ?? -1);
  const after = root.renderer.findByTestId(testId);
  console.log(testId, root.renderer.getFocusedElementId() === before?.id,
    after?.style.boxShadow);
};
```

```text
carousel                 focused=true  shadow=undefined   // root, arrow keys
carousel-indicator-0     focused=true  shadow=undefined   // dot, role=button
picker-swatch-0          focused=true  shadow=undefined   // swatch, role=button
chip-remove              focused=true  shadow=undefined   // chip remove, role=button
time-clear               focused=true  shadow=undefined   // clear, role=button
hotkey-clear             focused=true  shadow=undefined   // clear, role=button
row-alice                focused=true  shadow=undefined   // mention row, role=button
```

All seven take native focus (`getFocusedElementId` matches) and paint no ring.
Two more consequences of the same gap:

- `Carousel`'s root is the keyboard surface for arrows/Home/End and is
  `tabIndex={0}`, so the only way to know it has focus is the ring it lacks.
- `MentionInputItem` paints a highlight only from the component's `highlighted`
  state. A row focused with `Tab` is not necessarily the highlighted row, so the
  focused row can be invisible.

`autoFocus` also lands on two of these parts' fields without lighting the ring:
`MentionInput` forwards `autoFocus` to its `<input>` and `TagInputField` to its
own `<input>`, and the ring lives on the group. That is the same measurement as
plan `388`: the runtime focuses after React's effects, so `onFocus` never runs.

## 2. Root cause

Each of these parts paints an inline style with no `focused` state, or paints
the ring from a state only their sibling field sets:

| File | Part | Why the ring is missing |
| --- | --- | --- |
| `src/carousel.tsx` | `Carousel` root | no focus state at all |
| `src/carousel.tsx` | `CarouselIndicators` dot | no focus state at all |
| `src/color-picker.tsx` | swatch | no focus state at all |
| `src/mention-input.tsx` | `MentionInputItem` row | highlight state only |
| `src/tag-input.tsx` | `TagInputChip` remove control | no focus state at all |
| `src/time-picker.tsx` | `TimePickerClear` | no focus state at all |
| `src/hotkey-recorder.tsx` | clear control | no focus state at all |

## 3. Fix

Local `focused` state per part, seeded from `autoFocus` where the part forwards
it to a focusable host node, and the ring merged **before** any caller
`style`/`StateStyle` so a consumer still wins. No new module: this is the idiom
the other fifteen ring-owning parts already use.

### 3.1 `src/carousel.tsx` — root

- Destructure `autoFocus = false`, `onFocus`, `onBlur` from `CarouselProps`.
- `const [focused, setFocused] = useState(autoFocus === true)`.
- Pass `autoFocus={autoFocus}` to the root `div` (it can no longer ride in
  `...rest`), compose `onFocus`/`onBlur`, and set the state in both.
- Add `...(focused ? focusRing(theme) : {})` to the root style object, before
  `mergeStyles`'s caller `style` argument.
- Import `focusRing` from `./internal/theme.js` (currently only `useTheme`).

### 3.2 `src/carousel.tsx` — indicators

- `const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(Option.none())`
  (`Option` is already imported in this file; if not, add
  `import * as Option from "effect/Option"`).
- On each dot: `onFocus={() => setFocusedIndex(Option.some(index))}` and
  `onBlur={() => setFocusedIndex(Option.none())}`.
- In the dot's base style: `...(Option.contains(focusedIndex, index) ? focusRing(theme) : {})`,
  placed before `resolveStyle(indicatorStyle, state)`.

### 3.3 `src/color-picker.tsx` — swatches

- `const [focusedSwatch, setFocusedSwatch] = useState<Option.Option<number>>(Option.none())`
  (`Option` is already imported).
- Each swatch gets `onFocus`/`onBlur` as in 3.2, and the same ring expression in
  its inline style (before the caller's `style`).

### 3.4 `src/mention-input.tsx` — field and row

- `MentionInput`: destructure `autoFocus = false`; initialise
  `useState(autoFocus && !disabled)`; pass `autoFocus={autoFocus}` to the
  `<input>`; the existing `onFocus`/`onBlur` already set the group ring. The
  group `div` gains `testId={`${testId}-group`}` (when a `testId` is given) so a
  harness can measure the surface that paints the ring — the input keeps the
  caller's `testId`, the same derived-id pattern as a chip's `<testId>-remove`.
- `MentionInputItem`: destructure `autoFocus = false`, `onFocus`, `onBlur`;
  `const [focused, setFocused] = useState(autoFocus === true)`; pass
  `autoFocus={autoFocus}` to the row `div`; compose the caller handlers. Ring:
  `...(focused ? focusRing(theme) : {})` in the base style, after the highlight
  `backgroundColor`/`color` so the ring wins over the highlight, before the
  caller `style`.

### 3.5 `src/tag-input.tsx` — chip removal control

- Inside `TagInputChip`'s remove `div`: `const [focused, setFocused] = useState(false)`
  at the top of `TagInputChip` (one control per chip), `onFocus`/`onBlur`, and
  `...(focused ? focusRing(theme) : {})` in the control's style.

### 3.6 `src/tag-input.tsx` — `autoFocus` seeds the group ring

`TagInputField` forwards `autoFocus` to the `<input>`, and the ring lives in
`TagInput`. Seed it once on mount, because the runtime's own focus arrives after
React's effects (plan `388`):

```ts
const { draft, disabled, editDraft, addDraft, setFocused } = useTagInput();
const seeded = useRef(false);
useLayoutEffect(() => {
  if (seeded.current) return;
  seeded.current = true;
  if (autoFocus && !disabled) setFocused(true);
}, [autoFocus, disabled, setFocused]);
```

Destructure `autoFocus = false` from the field props and pass it to the
`<input>`. `useLayoutEffect`/`useRef` must be imported from `react`.

### 3.7 `src/time-picker.tsx` — clear control

- `const [focused, setFocused] = useState(false)` in `TimePickerClear`,
  `onFocus`/`onBlur`, and the ring in its style (before nothing else — there is
  no caller style).

### 3.8 `src/hotkey-recorder.tsx` — clear control

- Same as 3.7 inside the clear `div` (the component already imports
  `focusRing`).

Placement rule for every style: the ring is part of the base object; the
caller's `style`/`style` callback is merged **after** it, so a consumer can
still override.

## 4. Tests

One native case per component suite, each able to fail: focus the part with
`renderer.focusElement`, re-read it (`findByTestId` after focus — the element
object returned before focus is a stale snapshot), and assert `boxShadow` is
defined. Assert a sibling that did not take focus has `boxShadow` undefined, so
the case cannot pass by painting every part.

| File | Case | Assertion |
| --- | --- | --- |
| `src/behaviour/carousel.test.tsx` | "paints the focus ring on the group and the focused dot" | root focused → ring; indicator 0 focused → ring, indicator 1 → `undefined` |
| `src/behaviour/color-picker.test.tsx` | "paints the focus ring on a focused swatch" | swatch 0 focused → ring; swatch 1 → `undefined` |
| `src/behaviour/tag-input.test.tsx` | "paints the focus ring on a chip's removal control" | `chip-remove` focused → ring |
| `src/behaviour/time-picker.test.tsx` | "paints the focus ring on the clear control" | `time-clear` focused → ring |
| `src/behaviour/hotkey-recorder.test.tsx` | "paints the focus ring on the clear control" | `hotkey-clear` focused → ring |
| `src/behaviour/mention-input.test.tsx` | "paints the focus ring on a focused row" | row `alice` focused → ring, row `alex` → `undefined` |

`autoFocus` cases: add one case each that mounts with `autoFocus` and asserts
the ring with no interaction:

- `src/behaviour/carousel.test.tsx`: `Carousel autoFocus` → group ring defined.
- `src/behaviour/mention-input.test.tsx`: `MentionInput autoFocus` → group
  `boxShadow` defined.
- `src/behaviour/tag-input.test.tsx`: `TagInputField autoFocus` → group
  `boxShadow` defined.

### Both-direction proof

After the suite is green, revert the production edits one at a time (keep a copy
of the file, remove the change, run the one suite, restore) and confirm the
matching cases fail:

| Mutation | Cases that must fail |
| --- | --- |
| remove the ring line from the `Carousel` root | carousel ring + carousel `autoFocus` |
| remove the ring line from the `Carousel` dot base style | carousel ring |
| remove the ring line from a color swatch | color-picker ring |
| remove the ring line from the chip removal control | tag chip ring |
| remove the field's seeding effect | tag group `autoFocus` |
| remove the ring line from `MentionInputItem` | mention row ring |
| `useState(autoFocus && !disabled)` → `useState(false)` in `MentionInput` | mention group `autoFocus` |
| remove the ring line from `TimePickerClear` | time-picker ring |
| remove the ring line from the hotkey clear control | hotkey ring |

Record the observed failures (case name + assertion) in this plan's status line
and in `TODO.md`. Measured 2026-10-18: every row failed exactly the cases listed
and no others.

## 5. Docs, inventory and comments

1. Update the stated native-test counts (the `## Verification` line and the
   `COMPONENTS.md` row) for the six suites that gain a case:
   Carousel 15 → 16, Color picker 8 → 9, Tag / token input 11 → 12,
   Time pickers 12 → 13, Hotkey-recorder 13 → 14, Mention input 13 → 14.
   The count is checked by `src/inventory.test.ts` against `it(` in the suite;
   run it and fix any drift it names.
2. Add one sentence to each affected component page stating the rule, in that
   page's existing focus/keyboard section: every focusable part paints the token
   focus ring, and `autoFocus` seeds it. Pages:
   `docs/carousel.mdx`, `docs/color-picker.mdx`, `docs/tag-input.mdx`,
   `docs/time-picker.mdx`, `docs/hotkey-recorder.mdx`, `docs/mention-input.mdx`.
3. `COMPONENTS.md`: in the six Tier 2 notes cells, add "every focusable part
   paints the token focus ring (plan 522)" (keep each cell grammatical; do not
   rewrite unrelated text).
4. Do not touch `packages/tokens`, `packages/primitives` or the docs site.

## 6. Commands and expected results

```sh
cd packages/components
nub run --filter @gpuixui/components test:behaviour   # all behaviour suites green, 6 more cases than before
nub run --filter @gpuixui/components test             # unit suites + inventory count checks green
nub run --filter @gpuixui/components check-types      # clean
cd ../.. && nub run check && nub run lint && nub run test   # the §7 gate
```

Expected: the behaviour total rises from 677 to 686 (6 focus cases + 3
`autoFocus` cases; re-count with the suite's own output and use the real number
in the docs), unit total unchanged except the inventory count expectations the
plan updates. A non-zero exit is a failure to fix, not to explain.

## 7. STOP conditions

Stop and report rather than improvise if:

- `renderer.focusElement` no longer paints a repaint (the case reads the stale
  element and sees `undefined` for a part that does have a ring) — re-fetch
  after focus; if it still fails, the runtime changed and the whole focus model
  needs a new plan.
- Any of the six parts turns out to be un-focusable in the runtime (no
  `getFocusedElementId` match) — that is a different defect and gets its own
  plan.
- A `StateStyle`/public type change would be required to paint the ring — the
  ring is internal, so this means the part exposes its state publicly and the
  design should be decided in a separate plan.
- The inventory count check and the docs disagree after two corrections —
  report the files and the mismatch instead of loosening the check.

## 8. Acceptance

- The seven controls paint the token ring on real focus, and `MentionInput` /
  `TagInput` paint it on an `autoFocus` mount with no interaction.
- Six native suites (nine new cases) fail without the fix and pass with it; the
  three recorded mutations reproduce the failures.
- Counts in the six docs pages, their inventory records and `COMPONENTS.md`
  match the suites.
- `nub run check`, `nub run lint` and `nub run test` exit 0.
