# 525 — The first motion slice: Toast, Dialog and Popover

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening; first `@gpuixui/tw` integration) |
| Owner | components workstream |
| Depends on | `110`, `112`, `115`, `117`, `323`, `366`, `398`, `524` |
| Status | done — `AnimatePresence` + keyed `motion.div`: Toast 500 ms, Dialog 100 ms fade, Popover 100 ms fade + side slide; 6 new native cases (Toast 16, Dialog 16, Popover 19; behaviour 694). Entry props and exit presence pinned; the exit ghost is inert. Live: both scenarios pass with the scratch copy once its stale `bounds(toast-5) === null` assertion waits for the 500 ms exit; the canonical scenario still needs that wait (playground) |
| Number | `525` — `524` is the `tw` conformance plan; `525` is the next free number |

This plan is self-contained. Facts marked **measured** were reproduced on this
host (Intel macOS, the locally built `darwin-x64` binding from plan `140`).

---

## 1. Goal

`origin/master` now ships `@gpuixui/tw` (plan `524`): shadcn class recipes
compiled to GPUix `StyleDesc`, including `toastMotion(theme)`, `dialogMotion(theme)`
and `motionFromClasses`. This plan wires the first motion slice into the three
Tier 2 surfaces that shadcn animates:

| Surface | Recipe | Motion |
| ------- | ------ | ------ |
| Toast | Base UI toast | 500 ms, `cubic-bezier(0.22,1,0.36,1)`, fade |
| Dialog | shadcn dialog | 100 ms fade; `zoom-*` stays unsupported (GPUI has no transform) |
| Popover | shadcn popover | 100 ms fade + a side-specific `slide-in-from-*` offset |

`zoom-in-95` / `zoom-out-95` are **not** faked: GPUI has no transform, so the
recipe keeps them in `unsupported` and the surfaces animate opacity + top/left.

## 2. Measured facts this design rests on

- `motion.div` is a real GPUix host with `MotionProps`; `customProps.motion`
  exposes `initial`, `animate`, `exit`, `transition`, `isExit` and `generation`
  in the test renderer (probe).
- `motion.div` has no typed `testId`/`role`/`aria-*`; the semantic node stays the
  existing inner `div`, and the suite finds the animated wrapper through
  `customProps.motion`.
- `AnimatePresence` retains a removed keyed child until every nested
  `motion.div` calls `safeToRemove`; `TestRenderer.clockFastForward(ms)` +
  `dispatchNativeEvents()` completes the animation (the same mechanism
  `internal/reveal.tsx` uses).
- `FloatingLayer` measures its inner div; wrapping it in a `motion.div` keeps the
  position measured and lets the wrapper fade/slide.
- The current Toast tests assert a card is absent immediately after a dismiss;
  the Dialog and Popover suites do the same. They must advance the exit clock
  before asserting absence (see §6).
- The live scenarios are in the playground worktree, not this branch
  (`apps/playground/src/live/scenarios.tsx`), so the focused live run uses a
  scratch copy of its built `dist` (see §7).

## 3. Package

Add to `packages/components/package.json`:

```json
"@gpuixui/tw": "workspace:*",
```

Then `nub install`. The package exports source (`src/index.ts`), which this
workspace's toolchain already loads.

## 4. Implementation

### 4.1 `src/internal/motion.ts` (new)

`TwMotion` extends `MotionProps` plus `unsupported`. Do not spread the
bookkeeping onto the host:

```ts
import type { MotionProps } from "@gpuix/react";
import type { TwMotion } from "@gpuixui/tw";

/** The runtime motion props from a tw recipe, without its `unsupported` list. */
export const motionProps = (motion: TwMotion): MotionProps => ({
  ...(motion.initial === undefined ? {} : { initial: motion.initial }),
  animate: motion.animate,
  ...(motion.exit === undefined ? {} : { exit: motion.exit }),
  ...(motion.transition === undefined ? {} : { transition: motion.transition }),
});
```

### 4.2 `src/toast/viewport.tsx`

- Import `AnimatePresence, motion` from `@gpuix/react`, `toastMotion` from
  `@gpuixui/tw`, and `motionProps`.
- Replace the direct map with:

```tsx
<AnimatePresence initial={false}>
  {Arr.map(toasts, (toast) => (
    <motion.div key={toast.id} {...motionProps(toastMotion(theme))}>
      <ToastCard toast={toast} />
    </motion.div>
  ))}
</AnimatePresence>
```

- Keep `ToastCard` exactly as it is (status role, testId, pause/focus logic).
  The wrapper is layout-neutral; the viewport's `alignItems: "flex-end"` still
  sizes the card.

### 4.3 `src/dialog.tsx`

Split `DialogContent` into a small wrapper and the existing surface:

```tsx
export const DialogContent = (props: DialogContentProps) => {
  const { open } = useDialogContext();
  return (
    <AnimatePresence initial={false}>
      {open ? <DialogSurface key="dialog" {...props} /> : null}
    </AnimatePresence>
  );
};

const DialogSurface = (props: DialogContentProps) => {
  // the current DialogContent body, with the theme and context reads
  // `useModalFocus(open ? contentId : undefined, initialFocus)`
  // return <motion.div {...motionProps(dialogMotion(theme))} style={{ pointerEvents: open ? undefined : "none" }}> <anchored>…</anchored> </motion.div>
};
```

- Behaviour stays as it is: the root's `useModalState` owns the dismiss layer;
  `useModalFocus` gets `undefined` once `open` is false, so focus returns at
  close rather than after the exit.
- The surface is inert while exiting (`pointerEvents: none`), so the 100 ms
  ghost cannot be clicked.
- `DialogSurface` is module-local (not exported, not in the parts contract).

### 4.4 `src/popover.tsx`

Same split: `PopoverContent` becomes `AnimatePresence` + keyed
`PopoverSurface`. The surface keeps the current placement/focus/dismiss code and
renders:

```tsx
<motion.div
  {...motionProps(
    motionFromClasses(
      cn(
        "data-open:animate-in data-closed:animate-out",
        "data-open:fade-in-0 data-closed:fade-out-0",
        SLIDE[placement.side],
        "duration-100",
      ),
      theme,
    ),
  )}
  style={{ pointerEvents: open ? undefined : "none" }}
>
  <FloatingLayer …>{children}</FloatingLayer>
</motion.div>
```

`SLIDE` maps the resolved side: bottom → `data-open:slide-in-from-top-2`, top →
`data-open:slide-in-from-bottom-2`, left → `data-open:slide-in-from-right-2`,
right → `data-open:slide-in-from-left-2`. No `zoom-*` class is added.

The placement hook gets `open: true` inside `PopoverSurface` (the surface is
mounted only while open or exiting), so a flipped surface does not jump back to
its requested side during the exit.

Behaviour remains: the surface pushes/pops its dismiss layer while `open`;
Escape/Tab return focus before the exit; `pointerEvents: none` makes the ghost
inert.

## 5. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/components/package.json` | add `@gpuixui/tw` |
| `src/internal/motion.ts` | new helper |
| `src/toast/viewport.tsx` | `AnimatePresence` + keyed `motion.div` cards |
| `src/dialog.tsx` | wrapper/surface split, `dialogMotion` |
| `src/popover.tsx` | wrapper/surface split, `motionFromClasses` + side slide |
| `src/behaviour/toast.test.tsx` | exit helper; enter/exit cases |
| `src/behaviour/dialog.test.tsx` | exit helper; enter/exit cases |
| `src/behaviour/popover.test.tsx` | exit helper; enter/exit cases |
| `docs/toast.mdx`, `docs/dialog.mdx`, `docs/popover.mdx` | motion section + counts |
| `COMPONENTS.md` | the three rows gain the motion recipe and the `zoom-*` limitation |
| `TODO.md` | tick the slice |
| `.agents/slop/plans/README.md` | index this plan |

## 6. Test plan

### 6.1 Exit helper

In each suite:

```ts
/** Complete the exit motion and paint the result. */
const finishExit = (root: ComponentTestRoot): void => {
  root.renderer.clockFastForward(500); // 100 for Dialog/Popover
  root.renderer.dispatchNativeEvents();
  root.renderer.flush();
};
```

Call it after the store/state `settle` and before every assertion that a card,
panel or dialog is absent. Assertions that only check text inside a still-open
surface stay unchanged.

### 6.2 New cases

**Toast**

1. **enters with the 500 ms recipe** — push; settle; find the `div` whose
   `customProps.motion` has `transition.duration === 0.5` and `ease` equal to
   `[0.22, 1, 0.36, 1]`; assert its `initial.opacity` 0 and `animate.opacity` 1.
2. **stays mounted for the exit and then leaves** — push, settle, dismiss,
   settle; the card is still present (`toast-1` defined); `finishExit(page)`;
   the card is gone. This fails without `AnimatePresence`.

**Dialog**

3. **enters with the 100 ms dialog recipe** — open; settle; the animated wrapper
   has `transition.duration === 0.1` and `initial.opacity === 0`.
4. **remains for the exit, then unmounts** — close; settle; `dialog-content` is
   still defined; `finishExit(dialog)`; it is undefined.

**Popover**

5. **enters with the 100 ms fade and a side slide** — open with
   `side="bottom"`; settle; the animated wrapper has `initial.top === -8` and
   `animate.top === 0`, `duration === 0.1`.
6. **remains for the exit, then unmounts** — Escape; settle; `panel` is still
   defined; `finishExit(popover)`; it is undefined.

The wrapper lookup is:

```ts
const animated = root.renderer
  .findByType("div")
  .filter((element) => element.customProps?.motion !== undefined);
```

(`customProps.motion` exposes the runtime description; no private API.)

### 6.3 Mutation proof

- Remove `AnimatePresence` from Toast: case 2 fails (the card is gone at the
  first assertion).
- Remove `AnimatePresence` from Dialog: case 4 fails.
- Remove the popover slide class: case 5 fails (`initial.top` undefined).

## 7. Focused live evidence

The live runner lives in the playground worktree. Run it against **this**
worktree's source with a scratch copy (not committed):

```sh
mkdir -p packages/components/.live-check
cp -R /Users/cyberistic/GPUIXUI/workspaces/playground/apps/playground/dist \
  packages/components/.live-check/dist
mkdir -p packages/components/.live-check/node_modules/@gpuixui
ln -sfn "$PWD/packages/components" \
  packages/components/.live-check/node_modules/@gpuixui/components
ln -sfn /Users/cyberistic/GPUIXUI/workspaces/playground/packages/testing \
  packages/components/.live-check/node_modules/@gpuixui/testing
ln -sfn "$PWD/packages/tokens" \
  packages/components/.live-check/node_modules/@gpuixui/tokens
ln -sfn "$PWD/packages/config" \
  packages/components/.live-check/node_modules/@gpuixui/config
nub packages/components/.live-check/dist/live/run.js \
  --only live-tier2-toast --only live-tier2-dialog
```

**Measured 2026-10-18.** The runner needs the playground's newer
`@gpuixui/testing` (`Smoke.runAsyncScenarios`), so the scratch linked that
worktree's testing package; the components and vendor output came from this
branch. Results:

- `live-tier2-dialog` passes unchanged (surface centring, focus, Tab trap,
  Escape and focus return).
- `live-tier2-toast` fails only its final assertion: it checks
  `bounds("toast-5") === null` immediately after the readout reports
  `count=2`, but the new exit keeps the card painted for 500 ms by design.
  Adding `Effect.sleep(Duration.millis(650))` to the scratch scenario makes it
  pass; both scenarios then report `2/2 · tier2=verified`.
- The canonical scenario must take the same wait. It is the playground
  workstream's file; recorded as an interlock in `TODO.md`, not edited here.

Expected after the playground fix: both scenarios pass unchanged. If the runner
reports `exit 2` (no window), record that honestly; do not claim live evidence.
Remove `packages/components/.live-check` afterwards.

## 8. Commands and expected results

```sh
nub install
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour \
  src/behaviour/toast.test.tsx \
  src/behaviour/dialog.test.tsx \
  src/behaviour/popover.test.tsx
nub run check
nub run lint
nub run test
```

Expected: unit suite unchanged (404 + any helper test); the three focused
suites pass with the new cases; the gates exit 0. Then run the focused live
command above.

## 9. STOP conditions

- If `motion.div` does not expose `customProps.motion` on this host, stop and
  report; do not test a style proxy.
- If `clockFastForward` + `dispatchNativeEvents()` does not complete an exit
  animation, stop: a production surface that never unmounts is a leak, not a
  passing animation.
- If keeping the surface mounted for the exit changes focus, Tab or dismissal
  behaviour in an existing case, stop and report the case; the exit children
  must be inert (`pointerEvents: none`) and behaviour must end at close.
- If the live runner opens no window, report `exit 2`; do not substitute the
  headless suite as live evidence.

## 10. Acceptance

- Toast uses `toastMotion(theme)` with `AnimatePresence` and keyed cards.
- Dialog uses `dialogMotion(theme)`; Popover uses `motionFromClasses` with the
  side slide; `zoom-*` is recorded unsupported and never faked.
- Existing focus/dismiss behaviour is unchanged; the exit ghost is inert.
- Enter and exit are covered by real native cases, with a mutation proof.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and the focused live run are
  in sync.
