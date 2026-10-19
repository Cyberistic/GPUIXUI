# 596 — a tooltip opens on keyboard focus for every slot trigger

**Phase:** F (behaviour truth)
**Depends on:** `341`, `345`, `347`, `399b`, `583`, `590`, `595`
**Owns:** `packages/primitives` only.

## 1. The bug

Plan `595` made `InfoTip` open on keyboard focus by driving its controlled
`open` from the tracker. Every other documented tooltip trigger still cannot:
the headless `Tooltip` opens from `onFocus`, which published 0.10.0 never
dispatches (plan `583`), so `Tooltip` around a `Button`, `Checkbox`, `Switch`,
`Input`, `TextArea`, `NumberField`, `Select` or `Slider` is **hover-only** on a
consumer install. That is the remaining tooltip failure family: 8
`overlay-trigger` cases plus one `examples` case.

The wrapper cannot know its trigger's host id today, so it cannot compare it
with the tracker's sample. It *can* receive it: `TooltipTrigger` is a
`forwardRef` and `renderSlot` merges the slot's ref into the child's `ref` prop
(`@gpuix/react` `floating.js`). Our components declare `TriggerHandlers` (a
`Pick<Props, …>`), but **not `ref`**, so the boundary drops it — the same class
as plan `341`'s handlers. Hoisting the ref through the slot contract gives the
wrapper the id it needs, for every single-root trigger at once.

## 2. The fix

### 2.1 `ref` joins the slot contract, `components/internal.ts`

- Add `"ref"` to the `TriggerHandlers` pick.
- Add a `composeRef` helper (dual refs: the caller's and the component's own):

```ts
/** Assign a host instance to every ref, for a component with its own ref. */
export const composeRef = <Instance>(
  ...refs: ReadonlyArray<Ref<Instance> | undefined>
): Ref<Instance> =>
  (instance) => {
    Arr.forEach(refs, (ref) => {
      if (ref === undefined || ref === null) return;
      if (typeof ref === "function") ref(instance);
      else ref.current = instance;
    });
  };
```

No `any`, no assertion: `Ref<Instance>` narrows to `RefObject<Instance>` after
the function case.

### 2.2 Every single-root trigger forwards it

Compose the caller's ref with the ref the component already owns, on the **host
that takes focus**:

| Component | Host |
| --- | --- |
| `Button` (and `IconButton` via it) | root div |
| `Toggle` | root div |
| `Checkbox` | root div |
| `Switch` | root div |
| `Input` / `TextArea` | `fieldHostProps`' `ref` |
| `NumberField` | the inner `<input>` (`registerInput`) |
| `Select` | the trigger (`registerTrigger`) |
| `Slider` | the track |
| `ScrollArea` | **excluded** — its public `ref` is the imperative `ScrollAreaHandle`, so the slot's ref cannot also be a host ref. The area stays a hover/description trigger, and the limitation is stated on both pages |

The roving composites (`RadioGroup`, `ToggleGroup`, `CheckboxGroup`, `Rating`,
`RangeSlider`, `OTPField`) stay documented non-triggers: they have no single
focus host, which is exactly why the contract excludes them.

### 2.3 `Tooltip` derives focus-open from the tracked id

`TooltipHandlers` gains `triggerRef?: Ref<PublicInstance>`; `renderTooltip`
passes it to `TooltipTrigger` (the slot merges it onto the child).

`Tooltip` keeps a `trigger` ref, reads `useNativeFocus()`, and computes:

```ts
const triggerFocused = isTrackedFocus(sample?.focused, trigger.current?.id);
const [focusOpen, setFocusOpen] = useState(false);
const dismissed = useRef(false);

useEffect(() => {
  if (triggerFocused) setFocusOpen(true);
  else {
    setFocusOpen(false);
    dismissed.current = false;
  }
}, [triggerFocused]);

const focusedOpen =
  props.open === undefined && focusOpen && !dismissed.current;
const open = openState.value.current || focusedOpen;
```

- `props.open` present means the caller owns open; the tracker does not override
  it (plan `347`'s contract).
- A click or Escape on the trigger sets `dismissed.current = true` **while
  focused**, so an explicit dismissal is not undone by the focus that follows
  the click. The slot already closes on those gestures; our handlers only record
  the reason.
- `onOpenChange` sets the state as before and does **not** treat a hover-leave
  as a dismissal: a pointer leaving a focused trigger must keep the tip open.
- Focus loss resets the dismissal, so refocusing opens again.

```tsx
<TooltipTrigger
  asChild
  ref={handlers.triggerRef}
  onClick={() => { dismissed.current = true; }}
  onKeyDown={(event) => {
    if (event.key === "escape") dismissed.current = true;
  }}
  aria-description={description}
>
```

(These compose with the child's own handlers through `renderSlot`.)

### 2.4 `InfoTip` returns to the generic path

Its local `hoverOpen || focus.focused` wiring (plan `595`) is now the wrapper's
job. Revert `InfoTip` to `renderInfoTip(props, theme, useFocus())`, delete
`InfoTipHandlers`, the `useState` and the element-tree seam test. Keep the plan
`595` runtime cases as the proof that the generic path opens and closes on
focus. This is the hoist rule: the second consumer is the trigger family, so
the logic belongs in `Tooltip`.

## 3. Tests

- `runtime/overlay-trigger.runtime.test.tsx`: each focus case adds
  `runtime.flush(); await settleFocus();` before asserting (the tracker sample;
  plan `592`). Keep every existing hover/click/description case; add:
  - `closes a focus-opened tip on Escape` — focus a `Button`, settle, assert the
    tip, send Escape, assert it is gone while the button keeps focus;
  - `closes a focus-opened tip on click`;
  - `re-opens after focus leaves and returns` — focus, settle, Tip; focusNext to
    a sentinel, settle, no tip; focusNext back? (use `renderer.focusElement`),
    settle, Tip.
- `runtime/tooltip-side-cap`/placement suites: they wrap raw divs; the slot ref
  is now attached but the data path is unchanged. Run scoped.
- Element-tree: assert `TriggerHandlers` includes `ref` (a type-level compile
  case is enough), and one `renderButton` tree forwards a `ref` prop to the root
  div. Add a case per slot trigger? A compile-time table in
  `src/components/slot-trigger.test.tsx` that assigns each component to a
  variable of `ComponentType<TriggerHandlers>`; the ref prop then cannot be
  dropped silently.

## 4. Verification

1. `nubx vitest run --config vitest.runtime.config.ts runtime/overlay-trigger.runtime.test.tsx`
   — expected all pass (8 focus cases fixed, plus the three new ones).
2. `nubx vitest run --config vitest.runtime.config.ts runtime/info-tip.runtime.test.tsx`
   — still 7/7 through the generic path.
3. `runtime/fields.runtime.test.tsx`, `runtime/controls.runtime.test.tsx`,
   `runtime/slider`-related files, `runtime/scroll-area-trigger` — no new
   failures; the raw hover/click paths are unchanged.
4. `nub run test`, `nub run check-types`, `nub run check`, `nub run lint` —
   green.
5. Whole runtime suite: at most 39 failures (47 − 8), no new case.

### Both directions

- Remove `"ref"` from `TriggerHandlers` (or one component's forwarding) → that
  trigger's focus case fails; the others still pass.
- Remove the `focusedOpen` term → every focus case fails and the hover/click
  cases pass.
- Remove the dismissal handlers → the Escape/click cases fail (the tip stays
  open while focused).
- Remove the focus-loss reset → the re-open case fails.

## 5. STOP conditions

- The slot's ref does not reach the child host (the id stays undefined): STOP
  and report `renderSlot`'s merge for a React component child; do not add a
  wrapper div (it would change the anchor and the tab order).
- A primitive's own ref stops working (focus rings, number input targeting,
  slider drag): STOP; compose both refs, never replace the internal one.
- A hover/click case regresses: STOP; the dismissal rule is wrong.
- `InfoTip` cannot be reverted without losing a case: keep its local wiring,
  document the duplication, and report.

## 6. Acceptance

- Every single-root trigger opens on keyboard focus on the release-tag build;
  Escape/click close it; refocusing reopens it.
- `InfoTip` uses the generic path; no duplicate open logic.
- The raw div tooltip, hover, click and description cases are unchanged.
- All gates green; plan indexed; TODO row ticked.

## 7. Result

Measured on this host, release-tag build, 2026-10-19.

- `runtime/overlay-trigger.runtime.test.tsx` → **23 passed / 0 failed** (was 18
  tests with 8 failures): all ten focus cases (the eight reported plus `Toggle`
  and `IconButton`), the three new dismissal/reopen cases, and every existing
  hover/click/description case.
- `runtime/info-tip.runtime.test.tsx` → **7 passed** through the generic path;
  its local `hoverOpen` wiring is deleted.
- Whole runtime suite: **50 files / 729 tests — 692 passed / 37 failed**, 8
  failing files (was 677 / 47 / 9). Ten focus cases left the list (the eight
  reported plus `Toggle`/`IconButton`) and none appeared; two more
  (`fields > opens a Tooltip when its trigger takes keyboard focus` and the
  feedback example) also needed the tracker settle and now pass.
- `nub run --filter @gpuixui/primitives test` → **57 files / 808 tests**;
  `check-types`, `check` and `lint` green.

**The remaining 37** are the published box model (plan `597`); the `ScrollArea`
tooltip hover limit is documented but has no failing case.

**Both directions (all restored unless stated):**

- `open` without `focusedOpen` → all ten focus cases fail, the hover/click cases
  pass;
- removing `onDismiss` → the Escape and click cases fail;
- removing the focus-loss reset → the re-open case fails;
- reverting `Button`'s root to `focus.ref` → the Button and IconButton focus
  cases fail while `Toggle` still passes (the ref is per component, not a
  wrapper-only effect).

