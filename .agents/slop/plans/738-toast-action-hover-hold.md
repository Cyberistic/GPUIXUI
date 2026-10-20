# 738 — A toast holds its clock over its own controls

**Phase:** F (behaviour truth) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 110, 115, 117, 123, 124, 322, 370,
525, 548, 592, 606, 677.

**Status: done** (2026-10-20) — Toast 23/23, three mutation proofs, full native
suite 922 passed / 28 failed of 950 (the recorded plan-540 classes), all three
gates green.

**Status when written:** open. `docs/toast.mdx` promises that "the viewport
holds a card's clock while the pointer is on it **or** focus is inside it, and
resumes only when both have left". Measured on this host: the clock resumes as
soon as the pointer moves from the card body onto the card's **action** control
(`Undo`), so a toast can auto-dismiss while the user is reaching for its action.

## 1. The measured bug

A throwaway `TestRenderer` probe (2026-10-20) rendered the shipped toast
harness with `defaultDuration` 2 s, pushed an action toast, then read the
progress bar's authored width before and after resting the pointer on a control
for 400 ms:

| Pointer rests on | Bar width, first → second | Clock |
| ---------------- | ------------------------- | ----- |
| the card body (`toast-1`) | `365 → 365` | held |
| the card's action (`toast-action`, an internal `Button`) | `380 → 304` | **running** |
| the card's dismiss (`toast-dismiss`, an internal `IconButton`) | `369 → 369` | held |

The action's bounds (`x 1081, y 704, w 49, h 26`) are inside the card
(`x 805, w 378`), so the pointer is visually on the toast. GPUix hover is per
element: entering an interactive descendant delivers the card `onMouseLeave`
and never `onMouseEnter`, so `setHover(false)` resumes the store's clock
(the rule measured for `List` in plan 606 §2). `ToastCard` reads only its own
crossing, so a control's hover is invisible to it.

The dismiss control holds by accident, not by design (its crossing happens to
reach the card in this layout); the action is the control a user actually aims
at, and losing the hold there dismisses the toast mid-reach.

**Not a store or timing bug.** `toast/store.ts`, `toast/timing.ts` and the
provider publish and freeze correctly; only the card's hover input is wrong.

## 2. Decision

Reuse the hover group that plan 606 built for `List` instead of adding
per-control knowledge to the card:

- `internal/hover-group.ts` gains an optional `register`; a surface that only
  needs crossings (the toast card) does not have to fake a host-id registry,
  and `List` keeps using it.
- `ToastCard` owns `selfHovered` and `memberHovers`, derived from its own
  `onMouseEnter`/`onMouseLeave` plus the members' reports, and provides the
  group to its controls. `Button` and `IconButton` already join an enclosing
  group.
- The hold is one derived boolean (`self || members > 0 || focus > 0`) published
  to the store only on change, from the same event that crossed the boundary, so
  the existing pause/resume contract, its remaining-time arithmetic and the
  prompt freeze the progress bar test measures are untouched. (A state-and-effect
  version published one render late and let a 100 ms bar tick slip in, which the
  existing card-body bar case caught; the ref keeps the original timing.)

No public API, no new export, no dependency.

## 3. Files to create or change

| Action | Path | What |
| ------ | ---- | ---- |
| change | `packages/components/src/internal/hover-group.ts` | `register` becomes optional; `useHoverGroupMember` registers only when the group offers one |
| change | `packages/components/src/toast/viewport.tsx` | `ToastCard` tracks self hover, member hovers and focus in one synchronous hold, publishes transitions once, and provides `HoverGroupContext` |
| change | `packages/components/src/behaviour/toast.test.tsx` | three native cases (§5) |
| change | `packages/components/docs/toast.mdx` | hold rule names the card's controls; verification count 20 → 23 |
| change | `COMPONENTS.md` | Toast row states the measured rule; native count 20 → 23 |
| change | `TODO.md` | tick the work under Tier 2 hardening |
| change | `.agents/slop/plans/README.md` | index this plan |
| change | `PLAN.md` | D30 records `738` as the components workstream's next number |

No change to `toast/store.ts`, `toast/timing.ts`, `toast/provider.tsx` or the
public `toast.tsx` surface.

## 4. Implementation

### 4a. `internal/hover-group.ts`

```ts
export interface HoverGroup {
  readonly enter: () => void;
  readonly leave: () => void;
  /** Register a focusable member's host id; surfaces that need no ids omit it. */
  readonly register?: (id: number) => () => void;
}
```

`useHoverGroupMember`'s layout effect returns early when `group.register` is
undefined. `List`'s `hoverGroup` is unchanged and still supplies it.

### 4b. `toast/viewport.tsx` — `ToastCard`

Widen the synchronous hold the card already had:

```tsx
const held = useRef({ self: false, members: 0, focus: 0, paused: false });
const syncHold = useCallback((): void => {
  const { self, members, focus } = held.current;
  const after = self || members > 0 || focus > 0;
  if (after === held.current.paused) return;
  held.current.paused = after;
  if (after) pause(toast.id);
  else resume(toast.id);
}, [pause, resume, toast.id]);
const hoverGroup = useMemo<HoverGroup>(
  () => ({
    enter: () => {
      held.current.members += 1;
      syncHold();
    },
    leave: () => {
      held.current.members = Math.max(0, held.current.members - 1);
      syncHold();
    },
  }),
  [syncHold],
);
```

- `selfHover` sets `held.current.self`; the root's `onMouseEnter`/`onMouseLeave`
  call it.
- `setFocus(true|false)` keeps the existing signed count, now part of `syncHold`
  rather than a separate `paused` field.
- The root is wrapped in `HoverGroupContext.Provider`; the card itself keeps its
  own handlers.

Mounting publishes no hold (`held.paused` starts `false`); a card that mounts
with the pointer over it is handled by the first crossing, as before.

## 5. Test plan

Add to `src/behaviour/toast.test.tsx` (harness already has `push-action`,
`progressWidth`, `hoverCentreOf`, `finishExit`):

1. **`holds the auto-dismiss clock while the pointer is on the action`** — 2 s
   duration, push the action toast, hover `toast-1`, then `toast-action`; read the
   bar, wait 400 ms, read again and require equality. **Fails at `HEAD`**
   (measured `380 → 304`).
2. **`holds the auto-dismiss clock while the pointer is on the dismiss control`**
   — the same shape with `toast-dismiss`. Passes at `HEAD`; this is the pin that
   fails if the group wiring or the card's own crossing regresses.
3. **`resumes the clock after the pointer leaves the action control`** — hold on
   `toast-action`, then hover `elsewhere`, wait 400 ms and require the bar to be
   smaller. Guards the counter against sticking paused forever.

Both-direction proof: run case 1 before the change (observed failure
`380 → 304`), then after it (equality). Removing the `HoverGroupContext.Provider`
must fail case 1 again; removing the `memberHovers` term from `hovered` must also
fail case 1. Mutation-check the resume case by never calling `resume`.

## 6. Commands and expected results

```sh
# 1. The failing test at HEAD (before the fix)
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/toast.test.tsx -t "holds the auto-dismiss clock"
# expected after the fix: 3 passed; case 1 fails before it

# 2. The whole toast suite
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/toast.test.tsx
# expected: 23 passed

# 3. The list hover suite (the shared group changed)
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/list.test.tsx
# expected: 65 passed, including the four hover-group cases

# 4. Gates
nub run check
nub run lint
nub run test
# expected: exit 0 each
```

Do not run the full behaviour suite while iterating; the end-of-task check is
`nub exec vitest run --config vitest.behaviour.config.ts`, whose only red cases
are the recorded plan-540 binding defects (28 at `HEAD`).

## 7. STOP conditions

- STOP if the action probe at `HEAD` does **not** resume (`380 → 304` is the
  measurement this plan is based on). Re-measure before changing code and report
  the new numbers.
- STOP if `Button`/`IconButton` stop joining an enclosing hover group; the fix
  depends on that wiring (plan 606).
- STOP if making `register` optional requires touching more than
  `internal/hover-group.ts` and `list.tsx`'s existing group value.
- STOP if the store's published timing changes shape; this plan must not need a
  store change.

## 8. Acceptance criteria

- The action and dismiss controls both hold the card's clock; leaving the card
  resumes it with the remaining time.
- The three new native cases pass; case 1 is proven to fail at `HEAD`.
- `TOAST` native total is 23 and every page/row that states it agrees.
- `docs/toast.mdx` states the rule the code now keeps.
- `nub run check`, `nub run lint`, `nub run test` exit 0.
