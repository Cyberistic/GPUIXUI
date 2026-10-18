# 535 — A highlighted combobox option is scrolled into the list's viewport

**Phase:** F · **Owner:** components workstream · **Depends on:** 110, 112, 116,
138, 200, 201, 302, 323, 328, 340, 395, 398, 523, 530.

## 1. Why

Plan 530 fixed the command palette: its highlighted row is revealed with
`renderer.scrollIntoView`. It recorded a follow-up for `Combobox` — the same
measurement with 30 options left option 21 outside the popup, and
`scrollIntoView` moved the offset by only 9 px because the option is nested
inside listbox/group wrappers, so the renderer scrolls the wrapper, not the row.
The real fix is a measured `scrollTo`.

Two more defects surfaced while measuring the same fixture (30 options, a 360 px
column, 24 `ArrowDown` presses after opening) on this host, 2026-10-18, `0.10.0`:

```
content: { x: 40, y: 76,  width: 348, height: 280 }   // the popup
input:   { x: 46, y: 82,  width: 336, height: 0   }   // the search field
list:    { x: 45, y: 85,  width: 338, height: 840 }   // every row
row 25:  { x: 45, y: 757, width: 338, height: 28  }   // the highlight
offset:  [0, 0]                                       // nothing scrolled
```

1. **The search field is squeezed to zero height.** `ComboboxContent` is a flex
   column with `maxHeight: 280` and the list is taller than it, so the default
   `flexShrink: 1` shrinks the input until it has no height. The field is
   focused and editable but invisible.
2. **The popup content is the scroll container**, so it holds the input and the
   list in one scroll flow. Revealing row 25 with `scrollTo(content, 0, -442)`
   moved the input to `y: -360` — the search field scrolls out of the popup.
   Measured:

```
content after: { x: 40, y: 76,   width: 348, height: 280 }
input after:   { x: 46, y: -360, width: 336, height: 0   }
row after:     { x: 45, y: 315,  width: 338, height: 28  }
```

3. **A reveal must follow the highlight**, and GPUix's headless combobox keeps
   `activeIndex` internal (`dist/components/combobox.js`): only `style` and a
   function child receive `ComboboxItemState`. Our row must observe
   `state.highlighted` through the supported children-as-function API and reveal
   in a layout effect, not duplicate the runtime's `moveActive` rules (the file
   header already forbids a second copy of arrow handling).

The shape that fixes 1 and 2 was measured with public props only (a scratch
probe): `content { style: overflow: hidden }` plus
`list { flexGrow: 1, minHeight: 0, overflowY: scroll }` gives

```
content: { x: 40, y: 76, width: 348, height: 280 }
input:   { x: 46, y: 82, width: 336, height: 8  }    // still shrunk: no flexShrink
list:    { x: 45, y: 93, width: 338, height: 258 }   // the scroll viewport
row 25:  { x: 45, y: 765, width: 338, height: 28 }
offset:  [0, 0]
```

`scrollTo(list.id, 0, -429)` then moves `row 25` to `y: 336` and leaves the
input at `y: 82`: the list scrolls, the search field does not. The remaining
8 px input height is the missing `flexShrink: 0`, which §2.2 adds (a 28 px
control).

`NativeRenderer.scrollTo(elementId, x, y)` sets the offset of the scrollable
element itself (x/y are negative downwards — `renderer.rs`, `scroll_to`), so the
list must be the element carrying the scroll handle.

## 2. What changes

### 2.1 New `src/internal/scroll.ts` (+ `src/internal/scroll.test.ts`)

The arithmetic is pure and testable; the component only supplies measurements.
This is the same split as `internal/placement.ts`.

```ts
/**
 * Keep a highlighted row inside a scroll viewport.
 *
 * `renderer.scrollIntoView` scrolls to the nearest scroll parent's direct child,
 * which is a listbox/group wrapper for a combobox option, so it under-scrolls.
 * These helpers take the row's and the viewport's painted bounds and return the
 * offset that brings the row inside — measured, not guessed (plan 535).
 */

import { pipe } from "effect";
import * as Option from "effect/Option";

/** The slice of a painted box a reveal needs. */
export interface RevealBounds {
  readonly y: number;
  readonly height: number;
}

/**
 * The scroll offset that brings `row` inside `viewport`, or `None` when it is
 * already visible. Offsets are zero at the top and negative downwards.
 */
export const revealOffset: (
  row: Option.Option<RevealBounds>,
  viewport: Option.Option<RevealBounds>,
  offsetY: Option.Option<number>,
) => Option.Option<number> = (row, viewport, offsetY) =>
  pipe(
    Option.all({ row, viewport, offsetY }),
    Option.flatMap(({ row, viewport, offsetY }) => {
      const above = viewport.y - row.y;
      const below = row.y + row.height - viewport.y - viewport.height;
      if (above > 0) return Option.some(Math.min(0, offsetY + above));
      if (below > 0) return Option.some(Math.min(0, offsetY - below));
      return Option.none();
    }),
  );

/** What the renderer measured for one reveal; any gap means "do nothing". */
export interface RevealMeasure {
  readonly row: RevealBounds | null | undefined;
  readonly viewport: RevealBounds | null | undefined;
  readonly offsetY: number | null | undefined;
}

/** Scroll the row into the viewport through `scroll`, when it is outside. */
export const scrollRowIntoView = (
  measure: RevealMeasure,
  scroll: (offsetY: number) => void,
): void => {
  Option.match(
    revealOffset(
      Option.fromNullishOr(measure.row),
      Option.fromNullishOr(measure.viewport),
      Option.fromNullishOr(measure.offsetY),
    ),
    { onNone: () => undefined, onSome: scroll },
  );
};
```

`src/internal/scroll.test.ts` — four cases (`Option.getOrNull`):
row below the viewport (`offset 0`, row bottom 300, viewport bottom 100 →
`Some(-200)`), row above (`offset -400`, row top 10, viewport top 60 →
`Some(-350)`), an already visible row → `None`, and an upward correction that
would pass zero clamps to `Some(0)`.

### 2.2 `src/combobox.tsx`

Additions, in file order:

1. **Context** (`ComboboxContextValue`): `readonly registerList: (instance:
   PublicInstance | null) => void;` and
   `readonly revealRow: (row: PublicInstance) => void;`.
2. **Root** (`Combobox`):
   - `const list = useRef<PublicInstance | null>(null);`
   - after `trigger`/`registerTrigger`, add
     `const revealRow = useCallback((row: PublicInstance) => { const listId = list.current?.id; if (listId === undefined) return; scrollRowIntoView({ row: renderer?.getElementBounds?.(row.id), viewport: renderer?.getElementBounds?.(listId), offsetY: renderer?.getScrollOffset?.(listId)?.[1] }, (offsetY) => renderer?.scrollTo?.(listId, 0, offsetY)); }, [renderer]);`
   - pass `registerList: (instance) => { list.current = instance; }` and
     `revealRow` through the provider.
3. **`ComboboxContent`**: replace `overflowY: "scroll"` with
   `overflow: "hidden"`; `maxHeight: 280` stays.
4. **`ComboboxInput`**: add `flexShrink: 0` to the field style.
5. **`ComboboxList`**:
   - `testId = "combobox-list"` in the destructured props with a doc comment
     (`/** Default \`"combobox-list"\`. */`);
   - destructure `ref`, `const setList = useMergedRef<PublicInstance | null>(
     registerList, ref)` (plan 128 rule: a part that owns a ref composes the
     caller's);
   - `<HeadlessList ref={setList} testId={testId} …>`;
   - base style becomes `{ display: "flex", flexDirection: "column", flexGrow:
     1, minHeight: 0, overflowY: "scroll" }` (caller `style` still wins).
6. **`ComboboxItem`**:
   - props gain `readonly ref?: Ref<PublicInstance>`; destructure `ref`;
   - `const row = useRef<PublicInstance | null>(null);`
     `const setRow = useMergedRef<PublicInstance | null>(row, ref);`
     `const { revealRow } = useCombobox();`
     `const onHighlight = useCallback(() => { const instance = row.current; if
     (instance !== null) revealRow(instance); }, [revealRow]);`
   - `ref={setRow}` on `HeadlessItem`, and the children become a function:

```tsx
<HeadlessItem … ref={setRow} style={…}>
  {(state) => (
    <RowBody highlighted={state.highlighted} onHighlight={onHighlight}>
      {body}
    </RowBody>
  )}
</HeadlessItem>
```

   where `body` is the existing JSX (label/description block + check icon) and
   `RowBody` is a small file-local component:

```tsx
/** Run `onHighlight` on the flip to highlighted; a stable state is a no-op. */
const RowBody = ({
  highlighted,
  onHighlight,
  children,
}: {
  readonly highlighted: boolean;
  readonly onHighlight: () => void;
  readonly children: ReactNode;
}) => {
  const was = useRef(false);
  useLayoutEffect(() => {
    if (highlighted && !was.current) onHighlight();
    was.current = highlighted;
  }, [highlighted, onHighlight]);
  return <>{children}</>;
};
```

   `ComboboxItem` re-renders when the headless item does not (it consumes no
   headless context), so the observation **must** ride the children function;
   an effect in `ComboboxItem` would never run on an arrow press.
7. **`comboboxMeta.limitations`**: add `"the popup keeps a fixed search field and
   scrolls only the list; the highlighted option is scrolled into that list"`
   only if it reads as a limitation — it does not, so instead leave the record
   unchanged and note the behaviour in the docs.

### 2.3 `src/behaviour/combobox.test.tsx` — two native cases

Add a 30-option fixture (`option-1…option-30`, `Option 1…`) and an
`OverflowPicker` using it. Reuse `open`, `settle`, `requireBounds`.

1. **"keeps the highlighted option inside the list viewport"** — open, press
   `ArrowDown` 24 times, `flush`, then:
   - `combobox-option-option-25` is inside `combobox-list`
     (`row.y >= list.y`, `row.y + row.height <= list.y + list.height`);
   - the list's scroll offset y is negative;
   - the input still sits inside `combobox-content` and above the list (the
     fixed-field half of the fix).
2. **"returns the list to the top when the highlight moves back up"** — from
   the scrolled state, `renderer.scrollTo(list.id, 0, -600)` to overshoot as a
   wheel scroll would, then 24 `ArrowUp` presses; assert
   `combobox-option-option-1` is inside the list and the offset is `0`.

Both fail on today's code (case 1: row bottom 785 against a content bottom 356;
case 2: no reveal at all, first row above the viewport).

### 2.4 `docs/combobox.mdx`

- Raise the canonical native count 37 → **39** in the `## Verification` line and
  describe the two new cases (highlight reveal, return to the top).
- Under keyboard behaviour, state that the list scrolls the highlighted option
  into view while the search field stays fixed.
- Mention the fixed-field/scrollable-list shape under limitations only if the
  caller can see it as one; otherwise in the keyboard section.

### 2.5 `COMPONENTS.md` and `src/inventory.ts`

- `COMPONENTS.md` Comboboxes row: 37 → **39** native tests and the reveal
  sentence.
- No `inventory.ts` count field exists for Combobox; only its `limitations`
  array would change if the shape becomes a limitation. It does not.

No example change: the existing example already shows the popup; scrolling is a
behaviour, not an API.

## 3. Commands and expected results

```sh
# from packages/components
./node_modules/.bin/vitest run --config vitest.behaviour.config.ts \
  src/behaviour/combobox.test.tsx      # 1 file, 39 tests
./node_modules/.bin/vitest run src/internal/scroll.test.ts   # 4 tests
nub run --filter @gpuixui/components test                       # unit suite, +4
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test:behaviour             # full suite, +2
nub run check
nub run lint
nub run test
```

Baseline before the change: behaviour **710** across 44 files, unit **405**.
After: behaviour **712**, unit **409** (the four reveal cases). Record the real
numbers from the run in §7.

## 4. STOP conditions

- `scrollTo(list.id, …)` does not move the offset or moves the whole window
  instead: stop and measure which element owns the scroll handle; do not
  replace the mechanism without the measurement.
- The list registers a scroll handle only when a caller passes a `style`:
  stop — the base style must carry it.
- The reveal runs when the highlight is stable (for example on every render):
  stop; it may only run on the flip to highlighted.
- The children-as-function observation re-renders the row on every keystroke and
  changes its identity (the item loses focus/selection state): stop and report;
  do not poll the renderer from a timer or a key handler.
- A grouped-options case shows the wrong row: stop — group wrappers must not be
  part of the measurement.
- Any docs/inventory count check disagrees: stop and report the page and the
  suite count; do not edit the check.
- `nub run check` finds a test that asserts nothing: stop; the two cases above
  must each fail without the reveal.

## 5. Test plan and both-direction proof

1. Write `src/internal/scroll.test.ts` first; the four cases pass against the
   pure helper.
2. Add the two native cases; on unmodified `combobox.tsx` case 1 fails with the
   row below the viewport, and case 2 fails with the first row above it.
3. Add §2.2; both cases pass, the input stays visible, offset negative after
   down and `0` after up.
4. **Mutation proof:** replace the reveal call with a no-op
   (`void instance.id`) → both native cases fail (record row/viewport numbers).
   Restore. Separately, remove `flexShrink: 0` → the input-in-viewport
   assertion in case 1 fails with `height: 0`.
5. The other 37 combobox cases stay green (grouping, dismissal, async, create).

## 6. Acceptance

- A 30-option popup keeps the highlighted option inside the list after 24 arrow
  presses and returns to the top on the way back.
- The search field never leaves the popup while the list scrolls, and it is
  26 px tall with a long list.
- Both native cases have a recorded failure without the reveal; the unit helper
  has its own four cases.
- Docs count, `COMPONENTS.md`, `TODO.md` and the plan index agree;
  `nub run check`, `nub run lint` and `nub run test` exit 0.

## 7. Results (2026-10-18, this host, `0.10.0`)

**Measurements before the fix** (30 options, 24 `ArrowDown`, 360 px column):

```
content: { y: 76,  height: 280 }
input:   { y: 82,  height: 0   }   // flex-shrunk to nothing
list:    { y: 85,  height: 840 }   // not the scroll container
row 24:  { y: 755, height: 28  }   // the actual highlight
offset:  [0, 0]
```

The popup content was the scroll container, so revealing the row with
`scrollTo(content, 0, -442)` moved the input to `y: -360`.

**What landed**

- `src/internal/scroll.ts`: `revealOffset` works in the list's **content space**
  (`row.y - viewport.y` plus the live offset). GPUix reports a scroll
  container's own painted box already translated by its offset, so a
  window-space rule stays "outside" after every scroll and scrolls again on
  every key — measured before the content-space rule: 24 presses produced
  `offset -600` instead of `-432`.
- `ComboboxContent` is a fixed-height column with `overflow: hidden`;
  `ComboboxInput` is `flexShrink: 0`; `ComboboxList` is the scroll viewport
  (`flexGrow: 1`, `minHeight: 0`, `overflowY: scroll`) and registers its host
  instance (default `testId="combobox-list"`).
- `ComboboxItem` observes `state.highlighted` through GPUix's
  children-as-function API and reveals in a layout effect only on the flip to
  highlighted. The row's instance is held in **state**, not a ref: the headless
  row rebuilds its ref callback each render, so a ref is null while the row's
  layout effects run (the same reason `MenuItem` uses state). The first attempt
  with a ref silently never revealed.
- Options are measured from the row's painted bounds, so group wrappers do not
  affect the offset (plan 530's `scrollIntoView` moved only 9 px because the
  wrapper was the target).

**Verified**

- `combobox.test.tsx` is **39 tests**; the two new cases pass:
  - 24 presses put `option-24` inside the popup (`y 323…351` against a content
    box of `81…359`) with list offset `-432`, the input still at `82…108`, and
    its 26 px control height intact;
  - a 12-option list scrolls to the end on the first `ArrowUp` (wrap) and
    returns to offset `0` with `option-1` visible after 11 more presses.
- **Mutation proofs:** with the reveal replaced by `void instance`, case 1 fails
  with the row's bottom at `783` against the content's `356`, and case 2 fails
  with `0 < 0` (no scroll at all). With `flexShrink: 0` removed, the input's
  height collapses and case 1's height assertion fails.
- Unit suite: 411 tests (+6 in `internal/scroll.test.ts`).

**Environment caveat — two pre-existing failures under the current binding.**
While this plan was being executed another worktree (`gpuix-zindex`) rebuilt the
shared store's `@gpuix/native` binding in place (mtime swapped at 21:47 and
again at 22:00; md5 `c0e554b…`). With that build, `combobox.test.tsx`'s
pre-existing **"centres a requested popup on its trigger"** fails by 4 px and
**"paints the focus ring on the search field"** keeps the ring after focus
moves. Both fail at `HEAD` (no changes from this plan) with the same binding
hash; they passed on the 21:47 build. The trigger's measured box also moved from
`{x: 540, width: 740}` to `{x: 549, width: 738}` on the same tree, so the cause
is the binding's bounds/anchoring behaviour, not this change. Recorded in
`TODO.md` → Interlocks for the binding owner.

