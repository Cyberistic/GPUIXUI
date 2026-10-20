# 694 — `ScrollArea` drops the caller's `onKeyUp`, and nothing checks slot-handler parity

**Owner:** `primitives` workstream · **Phase:** F · **Depends on:** 030, 041,
047, 072, 090, 093, 341, 345, 362, 399b, 596, 605

## 1. The bug

`ScrollAreaProps` extends `TriggerHandlers` (minus `onScroll`/`ref`, both
re-declared), so it advertises the whole slot contract: `ref`, the seven passive
mouse/scroll handlers, and `onFocus`/`onBlur`/`onKeyDown`/`onKeyUp`. The wrapper
passes `{ ...props, onScroll }` to `renderScrollArea`, so every prop is available
to the pure renderer. `renderScrollArea` spreads `passiveTriggerHandlers(props)`
and sets `onFocus`/`onBlur`/`onKeyDown` explicitly — **but never writes
`onKeyUp`**. The prop reaches the component boundary and stops there.

Measured with the packaged element-tree harness (2026-10-20):

```ts
const area = renderScrollArea(
  { axis: "vertical", label: "Properties", onKeyUp },
  testTheme,
);
hostProp(area, "onKeyUp"); // none
```

Every other single-root trigger forwards it:

| Part | How `onKeyUp` is forwarded |
| ---- | -------------------------- |
| `Button`, `Toggle`, `Checkbox`, `Switch` | composed with the activation rule (`onKey(keyUp)`) |
| `Input`, `TextArea`, `NumberField` | `fieldHostProps` → host (`onKeyUp: props.onKeyUp`) |
| `Slider`, `RangeSlider` | the track's `onKeyUp={props.onKeyUp}` |
| `Select` | the trigger's `onKeyUp` (passed through the headless part) |
| `ScrollArea` | **dropped** |

This is the class plan `362` fixed on `NumberField` ("the caller's `onKeyUp`
never reached the input, while every sibling forwards it") and plan `596` fixed
for `ref`. It stayed invisible because the only cross-control guards — `084`
(focus ring), `089` (tab order), `093` (names), `354` (activation), `361`
(pointer feedback) — each hold one behaviour, and no guard holds **"every slot
handler reaches an element and calls the caller's function"**.

### Why it matters

- A consumer's `onKeyUp` on a `ScrollArea` is silently dead, although its type
  and the slot contract (documented on the Tooltip page: "the hover, focus, key
  and description props the runtime's slot injects") say it is accepted.
- The slot contract is the mechanism `Tooltip` uses; a handler that a future
  slot injects on key up would be lost on this one trigger, and the page would
  still claim parity.

### What this is not

- Not a keyboard-scroll defect: the region's own scroll rule runs on key **down**
  and is unchanged (plan `072`).
- Not a runtime defect: `HostProps.onKeyUp` is published and delivered (the
  activation suite drives key-up on a `div` today).

## 2. The fix

**Rule:** every prop in `TriggerHandlers` that a single-root trigger advertises
reaches a painted element, and invoking that element's handler invokes the
caller's function. A handler a component composes runs its own rule first and
then the caller's; a handler it does not compose is passed through unchanged.

**Files to change**

1. `packages/primitives/src/components/ScrollArea.tsx` — in `renderScrollArea`,
   add `onKeyUp={props.onKeyUp}` beside the composed `onKeyDown`. No new handler
   parameter: the wrapper already forwards `onKeyUp` through `{ ...props }`, and
   the region has no key-up rule of its own, so there is nothing to compose.
   Update the component JSDoc's keyboard paragraph with one sentence: the slot
   handlers are forwarded, and only `onKeyUp` is passed through because the
   scroll rule is a key-down rule.
2. `packages/primitives/src/components/slot-handlers.test.tsx` — **new**, the
   cross-control guard. A table of every single-root trigger, reusing the
   element-tree builders from `src/components/style-order.test.tsx`:

   | Case | Built by |
   | ---- | -------- |
   | `Button` | `renderButton({}, theme, idle)` |
   | `IconButton` | `renderIconButton({ icon: "x", label: "Close" }, theme)` |
   | `Toggle` | `renderToggle({}, theme, booleanState(false), idle, vi.fn())` |
   | `Checkbox` | `renderCheckbox({}, theme, booleanState(false), idle, vi.fn())` |
   | `Switch` | `renderSwitch({}, theme, booleanState(false), idle, vi.fn())` |
   | `Input` | `renderInput({}, theme, textState(""), idle, vi.fn())` |
   | `TextArea` | `renderTextArea({}, theme, textState(""), idle, vi.fn())` |
   | `NumberField` | `renderNumberField({}, theme, numberState(2), "2", idle, numberHandlers())` |
   | `Slider` | `renderSlider({}, theme, numberState(50), idle, sliderHandlers())` |
   | `Select` | `renderSelect({ options: [] }, theme, textState(""), false, idle, selectHandlers())` |
   | `ScrollArea` (labelled) | `renderScrollArea({ label: "Properties" }, theme)` |

   For each case and each of the twelve non-`ref` keys of `TriggerHandlers`:
   walk the returned element tree (the element plus its `children`), require at
   least one element to carry that prop, and invoke it with a decoded event
   (`keyEvent("up")` for key handlers, a scroll payload for `onScroll`, a plain
   object otherwise) and assert the caller's `vi.fn()` ran. For `ref`, require
   at least one element to carry a `ref` prop and invoke it with a `PublicInstance`
   stub, then assert the caller's ref object received that stub.

   The table lives in this one file so a new trigger is one row; a component that
   stops forwarding a handler fails by `case · handler`.

   Do **not** add a `range` row: `RangeSlider` is a roving composite, not a
   single-root trigger (the Tooltip page's table records this).

3. `packages/primitives/docs/scroll-area.mdx` — the API table gains the slot
   line: the region forwards the slot contract's handlers (passive mouse/scroll
   handlers, `ref`, `onFocus`/`onBlur`/`onKeyDown` composed with its scroll rule,
   and `onKeyUp` unchanged), with the existing note that only a labelled area is
   a trigger. The keyboard section keeps its contract table.
4. `COMPONENTS.md` — the ScrollArea row gains one sentence recording the fix and
   the guard, in the row's existing style.

## 3. STOP conditions

- STOP if the guard fails on a part for a reason other than `ScrollArea ·
  onKeyUp`. That is a second, unreported drop: record every failing
  `case · handler` pair in this plan's §5 before touching that component, then
  fix only what the evidence names.
- STOP if `Select`'s handlers do not appear anywhere in its element tree: the
  headless parts may receive them in a shape the walker does not reach. Then the
  guard must assert on `SelectTrigger`'s props with `elementProp` rather than
  walking, and the plan's §2.2 table entry becomes that adapter.
- STOP if any part's tree requires a real renderer (a hook that cannot run under
  `render*`). The whole point is a runtime-free guard; a part that cannot be
  built purely is excluded **by name with a reason** and recorded in §5.
- Do not change any component's behaviour other than `ScrollArea.onKeyUp`.

## 4. Test plan

1. **Failing direction first.** Write `slot-handlers.test.tsx` and run:
   ```sh
   cd packages/primitives
   nub exec vitest run src/components/slot-handlers.test.tsx
   ```
   Expected before the fix: exactly one failure, `ScrollArea · onKeyUp`
   ("no element carries onKeyUp"). Every other case passes.
2. Apply the `renderScrollArea` change and re-run: 11 cases × 13 handler
   assertions green.
3. **Guard the guard.** Remove `onKeyUp={props.onKeyUp}` from `Button` and from
   `Input` in turn, re-run, and confirm each fails by its own name; restore.
4. Existing suites:
   ```sh
   nub run --filter @gpuixui/primitives test
   ```
   Expected: 63 files, all green (was 62 files / 869 tests; the new file adds
   the matrix).
5. Type check and repo gates: `nub run check`, `nub run lint`, `nub run test`
   from the repo root.
6. Runtime, scoped to the touched surface (the forwarding contract is proven in
   the tree; this run proves the region still behaves):
   ```sh
   nub run --filter @gpuixui/primitives test:runtime -- runtime/layout.runtime.test.tsx runtime/scroll-area-trigger.runtime.test.tsx
   ```
   Expected: both files green. Record the exact command and result in §5.

## 5. Results (executor, 2026-10-20, this host)

- **Recon:** `renderScrollArea({ label, onKeyUp }, theme)` carried no
  `onKeyUp`; every other trigger's tree did (Button/Toggle/Checkbox/Switch
  composed, Input/TextArea/NumberField through `fieldHostProps`, Slider/Select
  on their host). `ScrollArea` was the only drop.
- **Guard, failing direction:** `src/components/slot-handlers.test.tsx` failed
  with exactly `ScrollArea drops onKeyUp: no element carries it as a handler`
  (20/21 cases passed; the other ten parts and the ten ref cases were green).
- **Fix:** one line in `renderScrollArea` (`onKeyUp={props.onKeyUp}`), plus the
  component JSDoc sentence.
- **Guard, after the fix:** 21/21. **Guard the guard:** removing
  `onKeyUp` from `Button` and from `fieldHostProps` failed by name —
  `Button drops onKeyUp`, `Input drops onKeyUp`, `TextArea drops onKeyUp`
  (TextArea shares the field path) — and both were restored.
- **Offline:** `nub run --filter @gpuixui/primitives test` → **63 files / 890
  tests, 0 failed** (was 62 / 869). `docs-counts` caught the README's file count
  and it was updated with the new guard's line.
- **Runtime, scoped:**
  `nub exec vitest run --config vitest.runtime.config.ts runtime/layout.runtime.test.tsx runtime/scroll-area-trigger.runtime.test.tsx`
  → **2 files / 37 tests, 0 failed**.
- **Repo gates:** `nub run check` and `nub run test` both exit `0`
  (primitives 63/890; components 32/308; icons 4/27; tokens 10/196; tw 9/103;
  testing 3/19; docs 1/7; playground 2/20).
- **Docs:** `docs/scroll-area.mdx` gains the slot-contract paragraph, the
  `COMPONENTS.md` ScrollArea row records the fix and the guard, and the plan is
  indexed as `694`.
