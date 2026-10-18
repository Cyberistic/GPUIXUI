# 341 — A slot trigger: `Button`, `IconButton` and `Toggle` must forward the handlers a tooltip injects

**Phase:** F (docs truth / composition)
**Owner:** primitives workstream (`packages/primitives`)
**Depends on:** 030, 040, 041, 047, 058, 071, 073, 085, 086, 090, 093, 340
**Status:** planned (implementation in this plan)
**Estimated scope:** one shared prop type + helper, two renderers, one new
runtime suite, three docs pages, one inventory line, `PLAN.md` D35.

## 0. The bug, measured

`packages/primitives/docs/tooltip.mdx` opens with this example:

```tsx
<Tooltip content="Delete this file" side="bottom">
  <Button label="Delete">Delete</Button>
</Tooltip>
```

It does not work. GPUix's `TooltipTrigger` uses `renderSlot({ asChild: true, … })`
(`@gpuix/react@0.10.0`, `dist/components/floating.js`): it **clones** the child
element with `onMouseEnter`, `onMouseLeave`, `onMouseDown`, `onClick`, `onFocus`,
`onBlur`, `onKeyDown` and `aria-description` (the last from this package's own
`renderTooltip`). Our `Button` accepts neither the events nor the description,
so the cloned props are dropped by the component boundary:

```
$ cd packages/primitives
$ ./node_modules/.bin/vitest run --config vitest.runtime.config.ts \
    runtime/probe-tooltip-button.runtime.test.tsx
 × opens on hover   → expected [ 'Delete' ] to include 'A hint'
 × opens on focus   → expected [ 'Delete' ] to include 'A hint'
```

Both directions of the documented trigger are dead: hover never schedules the
open, and focus never does either. A raw `<div tabIndex={0}>` (every existing
Tooltip test) works only because the runtime clones real host props. `InfoTip`
works because it hands the tooltip a raw `div`, which is also why this was never
caught: `runtime/fields.runtime.test.tsx` and `runtime/info-tip.runtime.test.tsx`
only ever mount a raw host element or `InfoTip` as the trigger.

The same defect applies to `Toggle` (a toolbar's tooltip target) and to
`IconButton` (which composes `Button`, so the fix reaches it for free).

**STOP if** the failing probe does not reproduce: re-read §0's command and the
installed `dist/components/floating.js` `renderSlot`; do not implement a fix
for a bug that is not measured.

## 1. The contract to establish

> A component that can be an overlay trigger accepts the runtime's injected
> interaction handlers and `aria-description`, forwards them to its single host
> element, and **composes** the handlers it already owns (focus, blur, key down,
> key up, click) with the injected ones instead of replacing them.

This is the component half of the runtime's slot contract. It stays in one
place so every future overlay (`Popover`, `DropdownMenu`) can clone onto these
parts after the components workstream replaces its local button stand-in.

The prop set is the runtime's own `Pick<Props, …>` — no local lookalike:

```ts
onMouseEnter, onMouseLeave, onMouseMove, onMouseDown, onMouseUp,
onMouseDownOutside, onAuxClick, onScroll, onFocus, onBlur, onKeyDown, onKeyUp
```

`onClick` is already public on `Button`/`Toggle` with the activation contract
(plan 085) and `aria-description` is added as its own optional string. `style`
already merges last.

Rules:

1. **Passive handlers are forwarded verbatim** (`onMouseEnter`, `onMouseLeave`,
   `onMouseMove`, `onMouseDown`, `onMouseUp`, `onMouseDownOutside`,
   `onAuxClick`, `onScroll`).
2. **`onFocus`/`onBlur` compose**: the component still updates its own focus
   state (the ring) *and* calls the injected handler with the event.
3. **`onKeyDown`/`onKeyUp` compose**: the activation rule runs first (that is
   the order the components workstream's `DropdownMenuTrigger` already relies
   on), then the injected handler runs — so the tooltip's Escape dismissal
   reaches the trigger.
4. **`aria-description` is forwarded**; a busy button keeps the runtime's one
   description field truthful by joining `"Loading"` and the injected text
   with `". "` (the host has no `aria-describedby`, plan 071).
5. **`disabled` still wins**: a disabled button is not a tab stop, but it can
   still be a tooltip target — hover handlers are forwarded unconditionally,
   and `onClick` stays behind the activation guard.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/internal.ts` | add `TriggerHandlers` (`Pick<Props, …>`), `passiveTriggerHandlers(props)` (one spreadable object), and `composeHandler(first, second)`; import `Props` as a type |
| `packages/primitives/src/components/Button.tsx` | `ButtonProps extends TriggerHandlers`; add `"aria-description"?: string`; forward the passive set, compose focus/blur/keys, join the description; update the docstring |
| `packages/primitives/src/components/Toggle.tsx` | `ToggleProps extends TriggerHandlers`; same forwarding/composition on its host `div` |
| `packages/primitives/src/components/IconButton.tsx` | no logic change (it spreads `ButtonProps` into `Button`); add one docstring sentence that the trigger contract is inherited |
| `packages/primitives/src/components/Button.test.tsx` | element-tree tests: every injected handler reaches the host, focus/blur/keys compose, description joins with `Loading` |
| `packages/primitives/src/components/Toggle.test.tsx` | element-tree test: handlers reach the host and keys compose |
| `packages/primitives/runtime/overlay-trigger.runtime.test.tsx` | **new**: the real renderer proof (see §3) |
| `packages/primitives/docs/button.mdx` | API rows + an "As an overlay trigger" section; keyboard note for Escape |
| `packages/primitives/docs/toggle.mdx` | the same short section, pointing at the shared contract |
| `packages/primitives/docs/icon-button.mdx` | "inherits the button's trigger contract" |
| `packages/primitives/docs/tooltip.mdx` | the Usage note must say which parts are valid triggers and why a `Box` is not |
| `COMPONENTS.md` | append plan 341 to the Button, Toggle, Icon-only button and Tooltips rows |
| `TODO.md` | tick a new primitives task after plan 340 |
| `PLAN.md` | D35 records the slot-trigger contract |
| `.agents/slop/plans/README.md` | index this plan |

Do **not** touch `packages/components`, `examples/basic-app`, `apps/docs`, or
`docs/component-api.md`; record cross-team follow-ups in `TODO.md` instead.

## 3. Test plan

### 3.1 Element tree (offline, `src/components/*.test.tsx`)

Read the host element with the existing harness (`hostHandler`, `hostProp`):

1. `Button` forwards `onMouseEnter`, `onMouseLeave`, `onMouseMove`,
   `onMouseDown`, `onMouseUp`, `onMouseDownOutside`, `onAuxClick` and
   `onScroll` — a call to each host handler calls the caller's function once.
2. `Button`'s focus handler sets the ring **and** calls the caller's `onFocus`;
   blur clears the ring and calls `onBlur`.
3. `Enter` down activates and then calls the injected `onKeyDown`; `Escape`
   calls only the injected handler (no activation).
4. `Button` forwards `aria-description`; `loading` yields
   `"Loading. A hint"`, and an idle button yields `"A hint"`.
5. `Toggle` forwards the passive set and composes `onKeyDown` the same way.

Each assertion must fail if the forwarding line is deleted; the runtime suite is
the primary regression guard, the element tests name the property.

### 3.2 Real runtime (`runtime/overlay-trigger.runtime.test.tsx`)

Mount `Surface` + `Tooltip content="A hint" side="bottom"` around each part:

1. **`Button` opens on hover** — `runtime.allText()` does not contain `"A hint"`
   before `runtime.hover("target")`, does after.
2. **`Button` opens on focus** — `runtime.renderer.focusElement(target.id)`,
   then the tip text is painted.
3. **`Button` click closes** — hover open, `runtime.click("target")`, tip gone
   (proves the injected `onClick` reaches the activation path).
4. **`IconButton` opens on hover** with a required `label` (proves the fix is
   inherited, not duplicated).
5. **`Toggle` opens on hover**.
6. **The trigger is described**: the a11y node for the button has
   `aria.description === "A hint"` while closed, and the open tip is a
   `Tooltip` node named `"A hint"` (the plan-071 contract now reaches a
   component trigger).

Use the existing helpers: `openWindow`, `Surface`, `a11yNode`, `Option.getOrElse`.

### 3.3 Two-direction proof

- Run the new suite **before** the fix: cases 1–6 fail (the probe in §0
  already measured 1 and 2).
- Re-run after: all pass.
- Delete `{...passiveTriggerHandlers(props)}` → cases 1, 4 and 5 fail by name.
- Delete the `aria-description` wiring → case 6 fails.
- `enters`/`leaves` composition: delete the caller call in the focus handler →
  the element-tree test 2 fails.

Record the commands and outputs in §8 when done.

## 4. Implementation steps

1. `internal.ts`: import `Props` as a type from `@gpuix/react`; add

   ```ts
   export type TriggerHandlers = Pick<Props, …the twelve above…>;

   export const passiveTriggerHandlers = (
     props: TriggerHandlers,
   ): TriggerHandlers => ({
     onMouseEnter: props.onMouseEnter,
     onMouseLeave: props.onMouseLeave,
     onMouseMove: props.onMouseMove,
     onMouseDown: props.onMouseDown,
     onMouseUp: props.onMouseUp,
     onMouseDownOutside: props.onMouseDownOutside,
     onAuxClick: props.onAuxClick,
     onScroll: props.onScroll,
   });

   export const composeHandler = <Event>(
     first: ((event: Event) => void) | undefined,
     second: ((event: Event) => void) | undefined,
   ): ((event: Event) => void) | undefined =>
     first === undefined || second === undefined
       ? (first ?? second)
       : (event) => { first(event); second(event); };
   ```

2. `Button.tsx`:
   - `export interface ButtonProps extends TriggerHandlers { … readonly "aria-description"?: string; … }`.
   - `const description = …join("Loading", props["aria-description"])…` (only
     when loading; otherwise the prop or `undefined`).
   - host `div`: `{...passiveTriggerHandlers(props)}` first, then
     `onClick={activate}`, `onFocus={composeHandler(focus.onFocus, props.onFocus)}`,
     `onBlur=…`, `onKeyDown`/`onKeyUp` handlers that call `activate` then
     `props.onKeyDown`/`props.onKeyUp` via `composeHandler`.
   - `aria-description={description}`.
   - Keep `tabIndex`, name, roles and every existing contract untouched.
3. `Toggle.tsx`: the same `extends TriggerHandlers` and host wiring.
4. `IconButton.tsx`: docstring only.
5. Write the tests, then the docs, the inventory rows, `PLAN.md`, `TODO.md`
   and the plan index.
6. Run the gates (§5) and commit.

**LOC discipline.** The helper exists once; each renderer gains at most one
spread, four composed handlers and one description expression. No per-component
copy of the twelve-prop list.

## 5. Commands and expected results

```sh
# focused suites while developing
cd packages/primitives
./node_modules/.bin/vitest run src/components/Button.test.tsx src/components/Toggle.test.tsx
./node_modules/.bin/vitest run --config vitest.runtime.config.ts \
  runtime/overlay-trigger.runtime.test.tsx

# gates, from the worktree root
nub run --filter @gpuixui/primitives test          # 41+ files, all pass
nub run --filter @gpuixui/primitives test:runtime  # 22→23 files, all pass
nub run check                                      # check:tests + lint + fmt + types
nub run lint
nub run test
```

Expected: the new runtime file (6 cases) green; the offline suite grows by the
element cases; `nub run check` prints "All matched files use the correct
format." and every workspace `check-types: Done`; `nub run test` reports the
same suites as before plus the new file.

## 6. Docs to change (truth, not decoration)

- `docs/button.mdx`: add the injected-handler row to the API table (one row for
  the passive set, one for `aria-description`), a short **As an overlay trigger**
  section with the `Tooltip` composition, and one line in Keyboard: Escape is
  the trigger's handler and arrives after the activation rule.
- `docs/toggle.mdx`: the same section, one paragraph, linking the contract.
- `docs/icon-button.mdx`: one sentence — it inherits `Button`'s trigger contract.
- `docs/tooltip.mdx`: replace "a component that does not forward those props
  (including this package's `Box`) will not open the tip" with the accurate
  list: `Button`, `IconButton` and `Toggle` accept the slot; `Box` and the
  data-driven groups do not, so wrap them in a raw host element or `InfoTip`.
  The Usage example stays a `Button` because it now works.
- `COMPONENTS.md`: append to the Button row — "**Trigger (341):** forwards the
  slot's mouse/focus/key handlers and `aria-description`; a `Tooltip` wrapping a
  `Button` now opens on hover and focus and is described." Same for Toggle and
  Tooltips; one sentence for IconButton.

## 7. STOP conditions

- The §0 probe passes (the bug is not real) — stop and report.
- `@gpuix/react` 0.10.0 does not export `Props` or the `onMouseEnter` host props
  — stop; the capability map is wrong and plan 341 must be re-planned.
- A fix requires changing GPUix's `renderSlot`, `TooltipTrigger` or any file
  outside `packages/primitives` — stop and record the cross-team need instead.
- More than two existing runtime tests fail for reasons other than the new
  contract — stop and report the failing names; do not rewrite their contracts.
- `nub run check` / `nub run lint` / `nub run test` cannot be made green without
  editing another workstream's paths — stop and report.

## 8. Outcome (filled in on completion)

Measured, in order:

1. **Pre-fix probe:** both cases fail —
   `expected [ 'Delete' ] to include 'A hint'` for hover and for focus.
2. **Post-fix focused runtime suite:** `runtime/overlay-trigger.runtime.test.tsx`
   6/6 green (hover, focus, click-close, `IconButton`, `Toggle`, description).
3. **Element-tree additions:** `Button` 12→16 tests and `Toggle` 9→11; the
   package's offline suite is 553 tests in 41 files (was 547).
4. **Runtime suite:** 381 tests in 23 files (was 375 in 22).
5. **Two-direction proofs, measured:**
   - deleting `{...passiveTriggerHandlers(props)}` from both renderers → 4 of 6
     runtime cases fail (Button hover, Button click-close, IconButton, Toggle;
     focus still passes because the focus composition is separate);
   - replacing the forwarded description with `undefined` → the description case
     fails (`toBe("A hint")`, received `undefined`) and the other 5 pass;
   - replacing `onFocus={composeHandler(focus.onFocus, props.onFocus)}` with the
     internal handler alone → the element test "composes focus and blur with the
     slot's handlers" fails (caller handler 0 calls).
6. **Gates:** `nub run check`, `nub run lint` and `nub run test` were run and are
   green; the primitives runtime suite is 23 files / 381 tests. Recorded in
   `COMPONENTS.md`'s runtime paragraph.

## 9. Acceptance

- A `Tooltip` wrapping a `Button`, `IconButton` or `Toggle` opens on hover and
  on keyboard focus, closes on click/Escape, and exposes the tip as the
  trigger's `aria-description` — measured in the real `TestRenderer`.
- The forwarding is one shared contract (`TriggerHandlers` +
  `passiveTriggerHandlers` + `composeHandler`), not per-component copies.
- Every other Button/Toggle contract (activation, busy, tab order, ring, style
  order, names, plan 340) is unchanged and green.
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index agree with the
  code.
