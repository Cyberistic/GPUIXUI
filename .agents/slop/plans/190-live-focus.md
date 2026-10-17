# 190 — Focus in a real window: the live host can read it

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §7) |
| Phase | B (foundation) → F (release evidence) |
| Owner | playground workstream |
| Depends on | `100`, `155`, `176`, `182`, `189` |
| Feeds | the `focus` and `modal` rows in `COMPONENTS.md`, the docs' native evidence, Phase G |

## 1. Goal

Plan `189` recorded a limitation that is **not true of this harness**: "the
automation protocol has neither a focus query nor a `focusNext` call", so "the
focus verdict stays with the headless suite". The protocol indeed has no
`getFocusedElement` method, but the live runner **owns the renderer object** it
creates with `createRenderer()`, and `GpuixRenderer.getFocusedElementId()`
exists on it (`@gpuix/native` 0.10.0). The modal probe already calls
`renderer.focusNextWithin` from its own `onKeyDown`, exactly as the component
will, so a synthetic `tab` reaches that component code even though the runtime
does not traverse by itself.

This plan makes the live suite observe focus and proves the modal trap **in a
real window**:

- focus enters the modal when it opens, and returns to the trigger on close;
- Tab and Shift-Tab stay inside the surface and wrap;
- a nested popover's Escape closes only the popover and focus returns to its
  opener.

This removes a false limitation rather than adding a second opinion on the
`TestRenderer`.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | Add `focused: () => Effect<string \| null, SmokeHostError>` to `AsyncSmokeHost`; correct the doc comment that says a live host has no focus query |
| `packages/testing/src/test-support.ts` | `nullAsyncHost.focused = () => Effect.succeed(null)` |
| `packages/testing/README.md` | Correct "no focus query" to "no style report, accessibility dump or list anchor; focus is read from the in-process renderer" |
| `apps/playground/src/live/focus.ts` | **New** pure helper `testIdOf(tree, elementId): Option<string>` — walks the automation tree to the node with that host id and returns its `testId` |
| `apps/playground/src/live/focus.test.ts` | **New** unit tests: nested hit, no-`testId` node → `None`, unknown id → `None`, null tree → `None` |
| `apps/playground/src/live/host.ts` | `createHost(app, renderer)`; implement `focused` with `renderer.getFocusedElementId()` and `app.call("getTree", {})` + `testIdOf` |
| `apps/playground/src/live/run.ts` | Pass `renderer` to `createHost` |
| `apps/playground/src/scenarios/modal.tsx` | Export the focusable id list (`MODAL_FOCUS_IDS`) so the live scenario checks containment without a second copy |
| `apps/playground/src/live/scenarios.tsx` | Add the `live-focus` scenario (view = `modalScenario.view`, capability `focus`) |
| `apps/playground/README.md` | Add `live-focus` to the live table; correct the "what it cannot assert" paragraph |
| `COMPONENTS.md` | Add `live-focus` to the `focus` row of the capability table; correct the live-run limitation paragraph and the live scenario count |
| `TODO.md` | Add and tick the plan-190 task in the playground section |
| `PLAN.md` | Add decision D35: the live host reads focus from the renderer it owns; the protocol having no focus query is not the same as the harness having none |
| `.agents/slop/plans/README.md` | Add plan `190` to the playground table; note `100–190` is used |
| `.agents/slop/plans/189-real-window-smoke.md` | §9: mark the "no focus query" sentence superseded by `190` |

Do **not** touch any path outside `apps/playground` and `packages/testing` except
the four planning/inventory files listed above (`README.md`s at the repo root are
shared state and are expected to change for an inventory row).

## 3. Implementation

### 3.1 The async host gains `focused`

In `packages/testing/src/smoke.ts`, inside `AsyncSmokeHost`:

```ts
  /** The `testId` of the natively focused element, or `null` when none has focus. */
  readonly focused: () => Effect.Effect<string | null, SmokeHostError>;
```

Keep every other verb unchanged. The sync host already has `focused`.

`nullAsyncHost` in `test-support.ts` answers `Effect.succeed(null)`.

### 3.2 The id lookup is a pure, tested function

`apps/playground/src/live/focus.ts`:

```ts
import type { TreeNode } from "@gpuix/native/automation";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The `testId` of the node with `elementId`, or `None` when it has none. */
export const testIdOf = (
  tree: TreeNode | null,
  elementId: number,
): Option.Option<string> =>
  Option.match(Option.fromNullishOr(tree), {
    onNone: () => Option.none(),
    onSome: (node) => find(node, elementId),
  });

const find = (node: TreeNode, elementId: number): Option.Option<string> =>
  node.id === elementId
    ? Option.fromNullishOr(node.testId)
    : Option.firstSomeOf(
        Arr.map(node.children ?? [], (child) => find(child, elementId)),
      );
```

The tree is runtime data, so `?? []` is the boundary default; do not invent a
second schema for it — `@gpuix/native/automation` already decodes it.

### 3.3 The live host answers it

`apps/playground/src/live/host.ts`:

```ts
import type { GpuixRenderer } from "@gpuix/native";
import type { App, Locator, TreeNode } from "@gpuix/native/automation";
import { testIdOf } from "./focus.js";

export const createHost = (
  app: App,
  renderer: Pick<GpuixRenderer, "getFocusedElementId">,
): Smoke.AsyncSmokeHost => ({
  // ...existing verbs...
  focused: () =>
    Effect.gen(function* () {
      const id = yield* Effect.try({
        try: () => renderer.getFocusedElementId(),
        catch: (cause) => new Smoke.SmokeHostError({ verb: "focused", cause }),
      });
      return yield* Option.match(Option.fromNullishOr(id), {
        onNone: () => Effect.succeed(null),
        onSome: (elementId) =>
          Effect.map(
            verb("focused tree", () =>
              app
                .call("getTree", {})
                .then((result) => testIdOf(result.tree, elementId)),
            ),
            Option.getOrNull,
          ),
      });
    }),
});
```

`renderer` is passed by `run.ts` at the same place `stopFrameLoop` is owned, so
no new lifecycle is introduced.

### 3.4 The live focus scenario

In `apps/playground/src/scenarios/modal.tsx`, rename the private
`MODAL_IDS`/`focusWithinModal` pair to exported `MODAL_FOCUS_IDS` and a
`focusWithinModal` that stays private; the sync `walk` uses the same constant.

In `apps/playground/src/live/scenarios.tsx` add:

```ts
const focus: LiveScenario = {
  id: "live-focus",
  title: "Live focus: entry, the modal Tab trap and focus return",
  capability: "focus",
  view: modalScenario.view,
  ready: "modal-trigger",
  steps: (ctx) => /* see below */,
};
```

Steps (async, each check named):

1. click `modal-trigger`; wait for `modal-content`; `settle`.
2. readout contains `open=true`; `focused()` is `modal-content`.
3. **Tab walk**: repeat 4 times — `key("tab")`, `settle`, read `focused()`.
   - at least two distinct ids were visited;
   - every visited id is in `MODAL_FOCUS_IDS`;
   - a fifth `tab` returns `modal-content` (the trap wraps).
4. **Shift-Tab walk**: repeat 4 times with `shift-tab`; all inside the modal;
   one more returns `modal-content`.
5. `key("escape")`; readout is `open=false popover=false last=escape`;
   `focused()` is `modal-trigger` (focus returned).
6. reopen, click `modal-open-popover`, wait for `nested-content`, `settle`;
   `focused()` is `nested-content`.
7. `key("escape")`; readout is `open=true popover=false last=popover-escape`
   (only the popover closed); `focused()` is `modal-open-popover`.
8. `key("escape")`; readout contains `open=false`.
9. screenshot `apps/playground/.artifacts/live/live-focus.png`.

A small async `walk` helper mirrors the sync one and returns the visited ids;
read the focused id after each key because the component moves focus in its
`onKeyDown`, not because the runtime traverses.

### 3.5 Wire it in

Add `focus` to `liveScenarios` after `overlay` (the view is the same modal probe,
so the order is irrelevant, but grouping it with the overlay reads correctly).

## 4. Commands and expected results

Run from the repo root.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/testing test` | 4 files, 42 tests pass |
| `nub run --filter playground test` | 8 files (was 7), 54 + new focus tests pass |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `56/56 scenarios passed`, exit `0` (unchanged) |
| `nub apps/playground/dist/live/run.js` | `9/9 scenarios passed`, exit `0`; `live-focus` reports its checks; `apps/playground/.artifacts/live/live-focus.png` exists |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |

The live run needs a desktop session and the locally built binding (plan `140`);
exit `2` means no evidence and is **not** a pass.

## 5. STOP conditions

- **STOP** if the live run exits `2` (no window). Record the exact output; do not
  report the checks as passing and do not change the exit code.
- **STOP** if `focused()` returns an id that is not in the automation tree for a
  focused element that has a `testId`. The mapping assumption is then wrong;
  report the dump and do not replace it with a positional guess.
- **STOP** if `key("tab")` does not reach the modal's `onKeyDown` in a live
  window (the focus id does not move at all after 4 tabs). Record it as a measured
  limitation of live key delivery; keep the scenario's focus-entry/return checks
  only if they pass, and update the docs to say the trap is `TestRenderer`-only.
- **STOP** if the window steals focus or the process does not exit; kill it and
  record the hang rather than adding a timeout that hides it.

## 6. Test plan

### 6.1 Unit tests that can fail

`apps/playground/src/live/focus.test.ts`:

- a nested node three levels deep returns its `testId` (a root-only walk fails);
- a node with no `testId` returns `None` (coercing `undefined` to a string would
  pass a containment check against the wrong element);
- an unknown id returns `None` (a fallback to the root would report focus on a
  container);
- a `null` tree returns `None`.

Header comment states the bug guarded: a mapping that returns the wrong element
makes every focus assertion a tautology.

### 6.2 Live two-direction proof (must be recorded in this plan's §7 after it runs)

1. **Remove the focus move**: in `modal.tsx`'s `handleContentKey`, replace the
   `focusNextWithin`/`focusPreviousWithin` calls with `return;` (keep Escape).
   Rebuild, run the live suite. Expect exit `1` and a failing check naming the
   Tab walk (`moved focus` or `stayed inside the modal`). Restore the calls.
2. **Remove the focus return**: delete the `renderer?.focusElement?.(previous)`
   call in the modal's first layout-effect cleanup. Expect exit `1` on
   *focus returned to the trigger* (and on the nested return). Restore.
3. Re-run green and record both outputs here.

### 6.3 What is still not live

Style, the AccessKit dump, virtual-list anchors and highlight washes have no
automation channel; they stay `TestRenderer`-only. This plan does not change
that.

## 7. Measured results

Run on this host (Intel macOS, locally built `@gpuix/native@0.10.0`, ADR 0003),
2026-10-18.

**Green run** — `nub apps/playground/dist/live/run.js` exits `0`, `9/9 scenarios
passed`, capabilities `layout input focus overlay scroll panel table docking
components = verified`. `live-focus` (2.2 s) records 18 checks:

```
modal-readout is painted
the trigger opened the modal
focus entered the modal
Tab moved focus [modal-a,modal-b,modal-open-popover,modal-close]
Tab stayed inside the modal [modal-a,modal-b,modal-open-popover,modal-close]
Tab wrapped back to the content
Shift-Tab moved focus [modal-close,modal-open-popover,modal-b,modal-a]
Shift-Tab stayed inside the modal [modal-close,modal-open-popover,modal-b,modal-a]
Shift-Tab wrapped back to the content
Escape closed the modal
focus returned to the trigger
focus entered the nested popover
Escape closed only the popover
focus returned from the popover
the second Escape closed the modal
```

The walk starts from `modal-content` (the surface focuses itself on open), and
the runtime delivers the synthetic Tab to the content's own `onKeyDown`, which
calls `focusNextWithin`/`focusPreviousWithin` — the fact plan `189` assumed was
unobservable. `focused()` maps `getFocusedElementId()` through the automation
tree; a focused node with no `testId` is `None`, never a container.

**Two-direction proofs**

| Mutation | Result |
| -------- | ------ |
| remove both `focusNextWithin`/`focusPreviousWithin` calls from the modal's `onKeyDown` | exit `1`: `Tab moved focus [modal-content,modal-content,modal-content,modal-content]: expected true, got false`; capability `focus=failed` |
| remove only `focusPreviousWithin` | exit `1`: `Shift-Tab moved focus [modal-content,modal-content,modal-content,modal-content]: expected true, got false` — the Shift-Tab branch is guarded independently, not by the Tab walk |
| remove the `renderer.focusElement(previous)` call from the modal cleanup | exit `1`: `focus returned to the trigger: expected "modal-trigger", got "none"`; capability `focus=failed` |
| `testIdOf` reduced to the root's own `testId` (no recursion) | `nub run --filter playground test` exit `1`: nested lookup and unknown-id cases fail (`some("root")` where `none()` is required) |

Each mutation was reverted and the suite re-ran green. The screenshot artefact
is `apps/playground/.artifacts/live/live-focus.png`.

## 8. Acceptance

- `AsyncSmokeHost` exposes `focused`; the live host answers it through the
  renderer it owns; the pure lookup has a failing-without-the-fix unit test.
- `live-focus` passes in a real window and fails (`exit 1`) when the trap or the
  focus return is removed; both directions are recorded in §7.
- `apps/playground/README.md`, `COMPONENTS.md`, `packages/testing/README.md`,
  `TODO.md`, `PLAN.md` and the plan index state the new evidence and no longer
  claim live focus is impossible.
