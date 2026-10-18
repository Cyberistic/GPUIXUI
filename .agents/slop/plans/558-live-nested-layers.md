# 558 — Nested layers and the dismiss stack in a real window

| Field | Value |
| ----- | ----- |
| Workstream | playground |
| Phase | F (native evidence) |
| Depends on | `100`, `110`, `140`, `155`, `164`, `187`, `189`, `190`, `193`, `529` |
| Owns | `apps/playground/src/live/scenarios.tsx`, `apps/playground/src/scenarios/layers.tsx` (read only), the `layers` row of `COMPONENTS.md`, the playground `TODO.md` row |
| Feeds | the cross-team `dismiss-layer.ts` defect — its evidence becomes live, not headless-only |

## 1. Why this exists

Plan `187` measured the runtime's event model for nested overlays in the
`TestRenderer`: one key reaches a nested layer **and** its parent as **two
distinct payload objects**, so an identity-keyed claim (`WeakSet<EventPayload>`)
cannot dedupe and one Escape closes every open layer; the field-keyed claim
(`event-claim.ts`) closes exactly one. It also measured that a press inside a
submenu fires the **parent's** `onMouseDownOutside` with `x`/`y`, so bounds
containment is load-bearing.

The cross-team fix in `@gpuixui/components` rests on that headless measurement.
A real window could deliver the same event differently (the live `onFocus`
lesson, plan `390`), so the claim needs a live twin before the components
workstream rewrites its dismiss stack on it.

**Goal:** add `live-layers` (capability `layers`) mounting the shipped
`nested-layer-dismiss` view, and measure the payload count, the one-layer-per-
Escape rule, the inside-submenu press and the outside dismissal in a window.

## 2. What is already measured

| Fact | Source |
| ---- | ------ |
| Two handlers receive two payload objects for one key | `nested-layer-dismiss`, plan `187` |
| The field claim closes one layer; the identity premise closes both | `nested-layer-dismiss`, plan `187` |
| A press inside the submenu fires the parent's outside handler with `x`/`y` | `nested-layer-dismiss` |
| A right click / outside press / Escape dismisses a live layer | `live-context-menu` (plan `193`) |
| A live key reaches the focused element, its ancestors and the window | `live-key-routing` (plan `345`) |
| `getElementBounds` is available to component code in a live surface | `live-docking` (plan `184`) |

## 3. The live scenario

`live-layers`, capability `layers`, `view: nestedLayerScenario.view`,
`ready: "layers-root"`. Every read is `waitForText` on the readout (the live
suite's rule: the protocol has no frame boundary), then `textOf`.

```
 1. click("layers-trigger")                 → parent=1
 2. click("layers-row-more")                → sub=1, depth=2
 3. click("layers-sub-a")                   → subClicks=1, outsideParent=1,
                                              outsideSub=0, coords=yes,
                                              last=activate, parent=0 sub=0
 4. click trigger, click row-more, key escape
                                            → sub=0 parent=1 last=sub-escape
 5. key escape                              → parent=0 last=parent-escape
 6. click trigger, click identity-inner, key "x"
                                            → keyHandlers=2 keyObjects=2
 7. click row-more                          → depth=2
 8. clickWindow(520, 640)                   → sub=0 parent=1
 9. settle, clickWindow(520, 640) again     → parent=0 depth=0
10. screenshot
```

Steps 4 and 5 are the core: **one** Escape must close only the submenu, and the
next must close the parent. Step 6 is the payload measurement. Step 3 is the
containment contract.

A live click sends one press at the element centre, so step 3 also proves that
the parent's outside handler sees the inside press in the window (a real click
is not suppressed by the runtime). The live point in step 8 is inside the
1100×720 window and below the probe; the headless `(1200, 700)` point is not.

## 4. Files to change

1. `apps/playground/src/live/scenarios.tsx` — import `nestedLayerScenario`, add
   the entry and put it in `liveScenarios` after `live-truncation`.
2. `apps/playground/src/scenarios/layers.tsx` — **comment only**: name the live
   twin and what stays headless (there is nothing style-dependent; the live
   tree simply cannot read bounds for a layer exactly like the headless one
   can).
3. `COMPONENTS.md` — the `layers` measured row gains `live-layers`; the
   `nested-layer-dismiss` paragraph gains one live sentence.
4. `apps/playground/README.md` — one live-table row and the registry count.
5. `TODO.md` — add and tick the task; bump the counter.
6. `.agents/slop/plans/README.md` — index this plan.
7. `PLAN.md` — `D73`.

## 5. Commands and expected results

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only live-layers       # 1/1, exit 0
nub apps/playground/dist/smoke/run.js --only nested-layer-dismiss  # control
nub run --filter playground test
nub run check
nub run lint
```

Run `live-layers` three times. The readout after a click and the key that
follows may need `settle`; step 9 needs one task boundary between the two
outside presses (plan `187`: two presses in one tick are indistinguishable).

## 6. STOP conditions

Stop and report rather than weakening the check if:

- `keyObjects` is `1` live — then the runtime **does** share the payload object
  in a window and the field-claim premise is a `TestRenderer` fact. Record it;
  the cross-team fix decision changes;
- one Escape closes both layers — confirm whether the field claim is even
  loaded in the live tree (it is the probe's own code) and record the measured
  readout; do not add a second Escape to make it pass;
- the inside press does not reach the parent's outside handler — the
  containment guard would be unnecessary in a window; record it and keep the
  headless claim separate;
- the two outside presses cannot be separated by the live runner (no task
  boundary between them) — keep the first outside press as the assertion and
  record the second as not-live-measurable; do not send them in one frame.

## 7. Test plan

Mutation proofs (apply, run, restore; each must exit `1`):

- **M1** invert the `insideSub(event)` guard (`!insideSub`): an outside press
  is then treated as inside and the submenu never closes (measured
  `parent=1 sub=1 … last=sub-open`).
- **M2** skip the claim (`if (false && consumeClaim(event))`): the same Escape
  reaches two handlers with two payload copies, so the first closes the
  submenu and the second closes the parent — step 4 reads `parent=0` and
  `last=parent-escape` instead of `parent=1`/`sub-escape`.

The headless `nested-layer-dismiss` is the control and must stay green.

## 8. Acceptance

- `live-layers` is `1/1`, exit `0`, three consecutive runs, with a screenshot.
- The live registry grows by one (`59 → 60`); the headless registry stays
  `101` and the control stays green.
- M1 and M2 fail in the documented direction and are restored.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md`, the plan index and the playground
  README are current.
- `nub run --filter playground test`, `nub run check`, `nub run lint` pass.

## 9. Measured result

`nub run --filter playground build`, then three consecutive focused runs:

```
ok  layers  live-layers  ~1.8 s  Live nested layers: payload copies, one Escape per layer and the submenu press
1/1 scenarios passed · capabilities: layers=verified
```

**1/1 each run, exit `0`, 41 checks**, one screenshot. The live registry is
`59 → 60`; the headless control stays `1/1`.

### The finding that changed the probe

The first live run closed **both** layers on one Escape
(`parent=0 sub=0 depth=0 last=parent-escape`), while the probe implements the
field claim and the headless run closes only one. Focus was on the submenu
(a check proves it), so both handlers ran. The claim was cleared between them:
the probe reset it in a **microtask**, and a real window dispatches a nested
layer's handler and its parent's across a microtask boundary. The same failure
happened on the first outside press (`outsideParent=2 outsideSub=1`,
`last=parent-outside`, both closed).

Measured correction: a claim must live **one task**, not one microtask. With
`setTimeout(…, 0)`:

- the live window closes exactly one layer per Escape and per outside press;
- the headless run also passes, but its two synthetic outside presses were
  separated by `Effect.yieldNow` (a microtask) and were therefore deduped by the
  longer claim. That separation is a harness artefact — a real second click is
  a new task — so the headless scenario now separates them with
  `Effect.sleep("1 millis")`.

This is the contract the components fix should implement: field-keyed claim,
**task-long lifetime**, not `WeakSet` identity and not a microtask reset.

### Measured facts

| Fact | Live result |
| ---- | ----------- |
| A live click opens the parent | `parent=1` |
| A live row opens the submenu on the stack | `sub=1 depth=2` |
| The submenu takes focus when it opens | focus `layers-sub` |
| A press inside the submenu activates its row | `subClicks=1 last=activate` |
| The press reaches the parent's outside handler with coordinates | `outsideParent=1 outsideSub=0 coords=yes` |
| One live key reaches two handlers as two payload copies | `keyHandlers=2 keyObjects=2` |
| One live Escape closes only the submenu | `sub=0 parent=1 last=sub-escape` |
| The next closes the parent | `parent=0 last=parent-escape` |
| One live outside press closes one layer | `sub=0 parent=1`, then `parent=0 depth=0` |

### Mutation proofs (applied, run, restored; exit `1`)

| Lever | Observed failure |
| ----- | ---------------- |
| **M1** invert the `insideSub` guard (`!insideSub`) | `a live outside press closes the topmost layer: expected "sub=0", got "parent=1 sub=1 depth=2 … last=sub-open"` |
| **M2** skip the claim (`if (false && consumeClaim(event))`) | `one live Escape closes the submenu: expected "last=sub-escape", got "… parent=0 sub=0 depth=0 … last=parent-escape"` |

The headless scenario is the control and stays green with the task-long claim
and the task-boundary separation.

**Transferable finding:** the payload-copy rule is live (`keyObjects=2`) and the
containment guard is live, but the claim's **lifetime** was a harness
assumption. A window can deliver the two handlers of one propagation across a
microtask, so an identity set or a microtask reset cannot dedupe it; one task
can. Any component dismissing nested layers must scope its claim to the task.
