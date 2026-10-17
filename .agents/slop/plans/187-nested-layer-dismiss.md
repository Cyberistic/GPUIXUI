# 187 — Nested overlay layers: payload identity, the dismiss stack and the submenu press

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | B (feasibility) → feeds C (Dropdown/Context menus, Popover, Dialog) |
| Owner | playground workstream |
| Depends on | `110`, `120`, `140`, `155`, `156`, `164` |
| Feeds | `@gpuixui/components` `internal/dismiss-layer.ts`, `internal/event-claim.ts`, `menu/sub.tsx` |

## 1. Goal

The components workstream ships a dismiss stack and an event-claim module that
rest on **two opposite claims** about one runtime:

- `internal/dismiss-layer.ts` keys consumption on the **identity** of the
  `EventPayload` object (`new WeakSet<EventPayload>()`): "the event itself is
  the unit of consumption", so the second layer to see one Escape must be a
  no-op.
- `internal/event-claim.ts` says the opposite: "the runtime delivers one payload
  copy per handler, so object identity cannot carry a claim across levels".

One of them is wrong for 0.10.0. The submenu (`menu/sub.tsx`) adds a third
assumption: a press inside the submenu fires the **parent** surface's
`onMouseDownOutside`, and the parent's handler can tell it landed inside the
submenu because `event.x`/`event.y` are populated and comparable to the
submenu's `getElementBounds` box.

None of this has a native verdict. `modal-focus-trap` measured nested Escape,
but its nested layer was a **sibling** of the dialog in the React tree, so the
key never bubbled from one layer's handler to the other. The shipped components
nest the submenu **inside** the parent surface, which is a different event path.

The probe answers, with numbers:

1. Does one key event reach **both** an inner and an enclosing `onKeyDown`?
2. Do they receive the **same payload object** (WeakSet) or different copies?
3. Does one Escape close exactly **one** layer under a topmost-only stack?
4. Does a press inside an inner anchored layer fire the outer layer's
   `onMouseDownOutside`, and does the payload carry `x`/`y` inside the inner
   box (so containment is computable)?
5. Is an `<anchored position={point}>` placed from a row's
   `getElementBounds` exact when it is nested inside the layer that owns the
   row?

## 2. Scenario `nested-layer-dismiss` (capability `layers`)

New view `apps/playground/src/scenarios/layers.tsx`. New capability `layers` in
`Smoke.CAPABILITIES`; the registry's core/probe lists do not change (only the
capability union grows), so the suite goes **54 → 55**.

### 2.1 Dismiss stack (local, mirrors the shipped rules)

Kept in the view, not module scope, so a remount starts clean:

```ts
type Dismiss = (event: EventPayload) => void;

const stack = useRef<ReadonlyArray<Dismiss>>([]);
const handled = useRef(new WeakSet<EventPayload>());

const push = (dismiss: Dismiss): (() => void) => {
  stack.current = Arr.append(stack.current, dismiss);
  return () => {
    stack.current = Arr.filter(stack.current, (each) => each !== dismiss);
  };
};

const dismissTop = (event: EventPayload): void => {
  if (handled.current.has(event)) return;
  const top = Arr.last(stack.current);
  Option.match(top, {
    onNone: () => {},
    onSome: (dismiss) => {
      handled.current.add(event);
      dismiss(event);
    },
  });
};
```

### 2.2 Tree

```
<div column width=560>                                   testId="layers-root"
  <div role=button tabIndex=0 onClick=openParent>        testId="layers-trigger"
  <Readout testId="layers-readout">
    parent=<0|1> sub=<0|1> outsideParent=<n> outsideSub=<n>
    parentClicks=<n> subClicks=<n> last=<text>
    keyHandlers=<n> keyObjects=<n>
</div>
```

When `parent` is open:

```
<anchored side="bottom" align="start" sideOffset={4}>
  <div testId="layers-parent" role="menu" aria-label="Parent" tabIndex={-1}
       onMouseDownOutside={parentOutside} onKeyDown={parentKey}>
    <div testId="layers-row-one" role="menuitem" onClick={parentClick}>One</div>
    <div testId="layers-row-more" role="menuitem" ref={moreRef}
         onClick={openSub}>More</div>
    <div testId="layers-row-two" role="menuitem" onClick={parentClick}>Two</div>
    {sub ? (
      <anchored position={point} fit="snap" priority={1}>
        <div testId="layers-sub" role="menu" aria-label="Sub" tabIndex={-1}
             autoFocus ref={subRef}
             onMouseDownOutside={subOutside} onKeyDown={subKey}>
          <div testId="layers-sub-a" role="menuitem" onClick={subClick}>Sub A</div>
          <div testId="layers-sub-b" role="menuitem" onClick={subClick}>Sub B</div>
        </div>
      </anchored>
    ) : null}
    <div testId="layers-identity-outer" onKeyDown={noteKey}>
      <div testId="layers-identity-inner" tabIndex={0} onKeyDown={noteKey} />
    </div>
  </div>
</anchored>
```

The identity pair is a separate, inert control inside the parent surface: a
focused inner div and its enclosing div, both `noteKey`. They measure facts 1–2
without a dismissal changing the tree mid-event. `noteKey` records, for the key
`x` only:

```ts
const gesture = useRef<{ objects: ReadonlyArray<EventPayload>; handlers: number }>({
  objects: [],
  handlers: 0,
});
const noteKey = (event: EventPayload) => {
  if (event.key !== "x") return;
  // Identity, not structural equality, is the measurement.
  const known = Arr.findFirst(gesture.current.objects, (each) => each === event);
  const objects = Option.isSome(known)
    ? gesture.current.objects
    : Arr.append(gesture.current.objects, event);
  gesture.current = { objects, handlers: gesture.current.handlers + 1 };
  setKeyStats({ handlers: gesture.current.handlers, objects: Arr.length(objects) });
};
```

`point` is computed when the submenu opens:

```ts
const point = Option.flatMap(moreId, (id) =>
  Option.map(
    Option.fromNullishOr(renderer?.getElementBounds?.(id)),
    (box) => ({ x: box.x + box.width + SUBMENU_GAP, y: box.y }),
  ),
);
```

`SUBMENU_GAP = 4`. The submenu renders only when `point` is `Some`.

Handlers:

- `parentOutside(event)`: `outsideParent++`; `dismissTop(event)`.
- `subOutside(event)`: `outsideSub++`; `dismissTop(event)`.
- `parentKey(event)` / `subKey(event)`: on `escape`, `dismissTop(event)`.
- Each layer pushes a dismiss handler when it opens (release on close/unmount):
  - parent: `() => closeParent("escape" | "outside")`.
  - sub: `(event) => { if (event.eventType === "mouseDownOutside" && insideSub(event)) return; closeSub("escape" | "outside"); }`.
- `insideSub(event)` mirrors the shipped containment test: `event.x`/`event.y`
  inside the sub's `getElementBounds` box, `false` when either is absent.
- Row clicks: `parentClick` sets `parentClicks++` and closes both; `subClick`
  sets `subClicks++` and closes both (the activation policy the shipped submenu
  uses).

### 2.3 Steps and checks

Every value is read from the readout or `bounds`; no screenshots.

1. **Open and place.** Click `layers-trigger`; `parent=1 sub=0`. The parent
   layer's box is painted and its `x` is the trigger's `x` ± 1 (`align="start"`
   already measured; this is a control, not the target).
2. **Submenu opens on the row.** Click `layers-row-more`; `sub=1`; the More row
   is painted. Assert the submenu's `x` is the More row's right edge + 4 ± 1
   and its `y` equals the row's `y` ± 1 — component-code placement from
   `getElementBounds` inside the parent layer.
3. **A press in the inner layer reaches the outer layer's outside handler.**
   `ctx.host.click("layers-sub-a")`; the readout shows `outsideParent=1`
   (the runtime fired the parent's handler although the press is inside its
   React descendant), `outsideSub=0` (an inside press is not "outside" the
   inner layer), `subClicks=1`, and both layers closed by activation
   (`parent=0 sub=0`, `last=activate`).
4. **The containment test is computable.** The same step records
   `coords=yes` when `layers-sub-a`'s press carried `x`/`y` inside the submenu;
   the submenu must still have been open when the row's click landed (the
   `subClicks=1` check is the consequence). If `coords=no`, the probe records
   the decisive negative and step 3's expectation becomes "the inner layer
   closes on the press and the row never activates" — record whichever holds
   in §8; never assert a behaviour the runtime lacks.
5. **One Escape closes one layer.** Re-open parent and sub (click trigger,
   click More); the submenu auto-focuses. `ctx.host.key("escape")`; assert
   `sub=0`, `parent=1`, `last=escape`, and the stack was asked once.
6. **A second Escape closes the parent.** `ctx.host.key("escape")`; `parent=0`.
7. **Payload identity.** Re-open parent, click `layers-identity-inner` (focus),
   press `x`. Assert `keyHandlers=2` (the key reached both the inner and the
   enclosing handler) and `keyObjects=1` (they received the **same object** —
   or `2`, the opposite; the measured value decides which module is correct and
   is recorded in §8).
8. **Outside press dismisses topmost first.** Re-open parent + sub, then
   `ctx.host.clickWindow(540, 660)` (outside both): `sub=0`, `parent=1`. A
   second outside click: `parent=0`. Record `outsideParent`/`outsideSub` for
   each press.

## 3. Files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/187-nested-layer-dismiss.md` | this plan; append §8 after implementation |
| `apps/playground/src/scenarios/layers.tsx` | **new** — the probe |
| `apps/playground/src/scenarios/index.ts` | import + append after `contextMenuScenario` |
| `packages/testing/src/smoke.ts` | add `"layers"` to `CAPABILITIES` |
| `COMPONENTS.md` | capability row `layers`; Dropdown/Context menus/Popover rows gain the measured stack facts; suite `54 → 55` |
| `TODO.md` | tick the task; one cross-team task for `@gpuixui/components` if §8 contradicts a module |
| `PLAN.md` | a decision row if the identity verdict is load-bearing |
| `.agents/slop/plans/README.md` | index row for `187` |

`apps/playground/README.md` gains a `## Nested layers (plan \`187\`)` section and
the new count.

## 4. Commands and expected results

```sh
nub run --filter playground build
# expect: exit 0

nub apps/playground/dist/smoke/run.js --only nested-layer-dismiss
# expect: exit 0; the checks above; capabilities: layers=verified
```

Then the mutation runs (§5), each followed by restoring the file and rebuilding
**in a later second or with `--force`** — tsc's incremental build can miss a
same-second edit (plan `186` hit this):

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js --only nested-layer-dismiss
# expect: exit 1, the named check failing
```

Full suite and gates:

```sh
nub apps/playground/dist/smoke/run.js          # 55/55, exit 0
nub run check
nub run test
```

## 5. Two-direction proof

| # | Mutation | Must fail |
| - | -------- | --------- |
| M1 | delete the `handled.has(event)` guard from `dismissTop` | step 5 (one Escape closes the parent too) |
| M2 | `dismissTop` uses `stack.current[0]` instead of the last layer | step 5 (Escape closes the parent, not the submenu) |
| M3 | compute `point` from the parent layer's box instead of the More row | step 2 (submenu x/y) |
| M4 | make `insideSub` always `false` | step 3 (`subClicks=0`, the press closed the submenu first) — if the runtime already reports `coords=no`, swap this for "remove the containment branch" and record that instead |

## 6. STOP conditions

- The binding cannot mount (exit `2`): report the preflight output; do not mark
  the plan landed.
- `onMouseDownOutside` never fires for a press inside a React descendant
  (step 3 reads `outsideParent=0`): record it — the shipped containment branch
  is dead code on 0.10.0, and the submenu needs a different guard (the parent's
  own `onMouseDown`/click path). Do not add a guard to make the check pass.
- `event.x`/`event.y` are absent on `mouseDownOutside` (step 4 reads
  `coords=no`): record it and assert the *consequence* (the submenu closes on
  the press, or the row still activates if the runtime's ordering allows it).
- The nested `<anchored position>` is not placed in window coordinates (step 2
  is off by the parent's offset): record the offset and use it in the probe,
  naming the rule in §8.

## 7. Test plan

The scenario is the test. Each check can fail, and §5 records four mutation
proofs with the exact failing check. `nub run check` and `nub run test` stay
green; the full suite proves the new mount did not disturb the keyed isolation
(plan `182`).

## 8. Acceptance criteria

- `--only nested-layer-dismiss` exits `0`; the full suite is 55/55.
- §8 (below) records with numbers: the payload-identity verdict, the
  one-Escape-one-layer verdict, whether the outer layer sees a press inside the
  inner layer, whether the outside payload carries coordinates, the submenu's
  placement error, and each mutation's failing check.
- `COMPONENTS.md`, `TODO.md` and the playground README are updated, with a
  cross-team task only if the verdict contradicts `dismiss-layer.ts` or
  `event-claim.ts`.
