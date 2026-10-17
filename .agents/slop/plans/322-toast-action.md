# 322 — Toast actions: one labelled action per toast, owned by the viewport

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 115 (toast store/provider/viewport), 125/124 (pause/resume)
- **Status:** done, 2026-10-18. 3 unit tests (296 → 299), 4 native tests
  (Toast 10 → 14, behaviour 441 → 445), an undo example, docs and inventory
  synced. Proof in §12.

`COMPONENTS.md` records "no action" only implicitly: a toast is title,
description, tone, a dismiss control and an auto-dismiss timer. The reference
shape (`docs/component-api.md` §8, base-gpui's `ToastAction`) has an action, and
the production use is the undo notice — "Message archived · Undo". This plan adds
one action per toast without turning the queue into a render-prop portal:

- the **label** is data: it decodes with the rest of `ToastInput`, so an empty
  label is rejected at the boundary like an empty title;
- the **handler** is UI state: it lives in the provider, keyed by the toast id the
  store returns, because a function cannot cross a `Schema` boundary.

An action label with no handler renders no action control (never a dead button);
`push` documents that the two travel together.

---

## 1. Files

```
src/toast/model.ts                 # + ToastAction; action on ToastInput and Toast
src/toast/store.ts                 # carry the decoded action into the queued Toast
src/toast/store.test.ts            # + 3 decode cases
src/toast/provider.tsx             # push options, the id -> handler map, actionFor
src/toast/viewport.tsx             # the action control, focus-hold counter
src/behaviour/toast.test.tsx       # + 4 native tests (10 -> 14)
examples/toast.example.tsx         # + an undo toast
docs/toast.mdx                     # action section, verification count
COMPONENTS.md                      # Toast row gains the action
src/inventory.ts                   # limitation list: drop "no action"? (it has none)
TODO.md, .agents/slop/plans/README.md
```

## 2. Model — `src/toast/model.ts`

```ts
/** One labelled action a toast may offer, e.g. Undo. */
export class ToastAction extends Schema.Class<ToastAction>("ToastAction")({
  label: Schema.NonEmptyString,
}) {}

// ToastInput gains:
action: Schema.OptionFromOptionalKey(ToastAction),

// Toast gains the same field, so the queue and the viewport agree.
action: Schema.OptionFromOptionalKey(ToastAction),
```

`ToastDraft` stays `typeof ToastInput.Encoded`, so the public push shape is
`action?: { label: string }` and an empty label fails `push` exactly where an
empty title does.

## 3. Store — `src/toast/store.ts`

In `push`, construct the queued toast with `action: input.action`. No other
change: the action is data, not a timer.

## 4. Provider — `src/toast/provider.tsx`

```ts
/** The UI half of a toast action. The label is in `ToastDraft.action`. */
export interface ToastPushOptions {
  /** Runs when the action control is pressed; the toast then dismisses. */
  readonly onAction?: () => void;
}

export interface ToastApi {
  readonly push: (draft: ToastDraft, options?: ToastPushOptions) => void;
  /** The handler for a queued action, keyed by the toast id. */
  readonly actionFor: (id: string) => (() => void) | undefined;
  // …existing members unchanged
}
```

- State: `const [actions, setActions] = useState(HashMap.empty<string, () => void>())`
  (Effect `HashMap`, not a native `Map`).
- `push` taps the store's returned `Toast` and inserts `HashMap.set(actions, toast.id, onAction)`
  only when a handler was supplied.
- `actionFor` reads `HashMap.get` and converts the `Option` with
  `Option.getOrUndefined` (never `getOrThrow`).
- Prune on every queue change: an effect filters the map to the ids still in
  `toasts`, so an auto-dismissed action toast cannot leak its closure.
- `dismiss`/`dismissAll` do not need to touch the map eagerly; the prune effect
  owns that.

## 5. Viewport — `src/toast/viewport.tsx`

- Read `actionFor` beside `dismiss`/`pause`/`resume`.
- After the text column and before the dismiss control, render the action **only**
  when `toast.action` is `Some` **and** `actionFor(toast.id)` is defined:
  `Button size="sm" variant="secondary" testId="toast-action"`, label from the
  decoded `ToastAction`.
- Pressing it runs the handler once, then `dismiss(toast.id)` — the same contract
  as Radix/shadcn: an action consumes the toast.
- **Focus hold:** convert `held.current.focus` from a boolean to a count so two
  focusable controls (action, dismiss) cannot resume the timer just by moving
  focus between them. Track `paused` in the same ref to keep the
  before/after transition check; every control's `onFocus` increments and
  `onBlur` decrements (clamped at zero), then calls `syncHold`.
- The card surface stays `pointerEvents: "auto"`; the viewport stays
  `"none"`. No new colour literal: the local `Button` owns its palette.

## 6. Tests — `src/toast/store.test.ts`

1. A draft with `action: { label: "Undo" }` decodes to a queued toast whose
   `action` is `Some(ToastAction("Undo"))`.
2. A draft with `action: { label: "" }` fails with a `SchemaError` and queues
   nothing.
3. A draft without `action` queues a toast whose `action` is `None`.

## 7. Tests — `src/behaviour/toast.test.tsx` (real renderer)

Update the header comment to name the bugs: an action that rendered without a
handler, ran twice, left the toast behind, or let the toast auto-dismiss while
its action held keyboard focus.

1. **"renders the labelled action and runs it once, then dismisses"** — push with
   `action: { label: "Undo" }` and `{ onAction }`; assert the label is painted;
   `clickCentreOf("toast-action")`; handler once; toast gone.
2. **"renders no action control without a handler"** — same draft, no options:
   no node with `testId="toast-action"`, text still has the label? No — the label
   only exists inside the control, so assert the toast text and the missing
   control. This is the "never a dead button" guard.
3. **"renders no action control for a toast without one"** — the plain push: no
   `toast-action` node.
4. **"pauses auto-dismiss while the action holds keyboard focus"** — duration
   600 ms, focus `toast-action`, wait 900 ms, toast still there; focus
   `elsewhere`, wait 900 ms, toast gone. Uses the existing real-timer pattern.

## 8. Example, docs, inventory

- `examples/toast.example.tsx`: add an "Archive + undo" push button that shows
  `{ title: "Message archived", action: { label: "Undo" } }` and, on action,
  pushes a success toast ("Restored"). Keep the existing plain/error buttons.
- `docs/toast.mdx`: a "Actions" section with the push shape and the rule that a
  label without a handler draws nothing and that pressing dismisses; update the
  Verification count (10 → 14) and list the four cases; note the single-action
  limit (the reference allows one action; a second is a composition decision, not
  a hidden array).
- `src/inventory.ts` + `COMPONENTS.md`: Toast notes gain "one labelled action
  with a provider-owned handler, pause-on-focus shared with dismiss"; keep "no
  progress indicator" and the text glyph limitation. Test count 10 → 14.
- `TODO.md`: add and tick the task under Tier 2 hardening.

## 9. Commands and expected results

```sh
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 296 -> 299 unit tests
nub run --filter @gpuixui/components test:behaviour   # Toast 10 -> 14, behaviour 441 -> 445
nub run check                                         # exit 0
nub run lint                                          # exit 0
```

## 10. STOP conditions

1. `Option.getOrUndefined` does not exist in the installed Effect v4 build →
   STOP and use `Option.match` at the call site; do not import a v3 helper.
2. The provider's prune effect loops (setState in an effect whose dependency it
   rewrites) → STOP; return the identical `HashMap` when nothing was removed so
   React can bail out.
3. Focusing `toast-action` blurs the dismiss control and the timer resumes
   between the two events, dismissing a 0 ms toast in a test → STOP and report
   the measured sequence; do not add a `setTimeout` workaround without recording
   it as a deviation.
4. `Toast` construction with a new `Option` field breaks an existing store test
   for an unrelated reason → STOP and report which assertion moved; the timer
   and queue behaviour must not change.
5. A second action request appears during implementation (e.g. multiple actions)
   → STOP: this plan is one action by contract; record the request in `TODO.md`
   instead of growing an array.

## 11. Acceptance criteria

- [x] Model, store, provider and viewport carry one action end to end.
- [x] Empty labels rejected; a label without a handler draws nothing.
- [x] Action press runs once and dismisses; focus pauses the timer.
- [x] Three store tests, four native tests; both-direction proof recorded in §12.
- [x] Example, docs, inventory, `COMPONENTS.md`, `TODO.md` updated in the commit.
- [x] Gate commands in §9 pass.

## 12. Deviations, recorded during implementation (2026-10-18)

1. **`actionFor` returns `Option<() => void>` rather than `(() => void) | undefined`.**
   The effect-enforcer flagged the union; `HashMap.get` already produces an
   `Option`, so the provider returns it unchanged. The viewport consumes it with
   `Option.flatMap` and never unwraps with a null check.
2. **The handler map is React state (`HashMap`), not a ref.** A registration
   re-render guarantees the action control sees its handler on the same commit as
   the queued toast. A prune effect filters the map to the ids still in `toasts`
   and returns the identical `HashMap` when nothing was removed, so an
   auto-dismissed action cannot leak its closure or loop the effect.
3. **The focus hold is a count, not a boolean.** Two focusable controls (action,
   dismiss) meant moving focus from one to the other briefly resumed the timer.
   `held.focus` now increments/decrements and a separate `paused` flag keeps the
   before/after transition check, so the two controls share one hold.
4. **The action is a draft field plus a push option, not a part.** A queue-owned
   card cannot be composed by the consumer, so `ToastAction` is data and the
   handler is provider state; `docs/component-api.md` §8 says so.
5. **Both-direction evidence:**
   - remove `dismiss(toast.id)` after the handler → "runs it once and dismisses"
     fails because `toast-1` is still mounted;
   - remove the action control's `onFocus`/`onBlur` → the focus-hold test fails
     after 900 ms;
   - render the action whenever the label is `Some` regardless of a handler →
     "no action control when the label has no handler" fails;
   - weaken the label to `Schema.String` → the empty-label store test fails.
   All four were restored; the suites are 299 unit / 445 behaviour.
6. **The action control is `Button variant="secondary" size="sm"`,** placed
   between the text column and the dismiss control. No new colour literal; the
   local stand-in owns the palette and will be replaced with primitives.
