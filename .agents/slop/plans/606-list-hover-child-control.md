# 606 — A List row keeps its hover tint over a child control

**Phase:** F (behaviour truth) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 111, 117, 120, 125, 339, 394, 510,
577, 578; playground plan 335 §1.3.

**Status when written:** open. `TODO.md` → Interlocks records the defect:
hover is per element, so a child control's hover cancels its row's `hover`
style; a `List` row's tint drops while the pointer is over its trailing
control. No consumer has reported it, but the row then reads as two surfaces
instead of one pressable row.

## 1. The measured bug

Playground plan `335-declared-styles-and-text-truncation.md` §1.3 measured, in
the offscreen `TestRenderer` on the 0.10.0 binding:

> A 400 px parent with `hover: { width: 420 }` around a 100 px child with
> `hover: { width: 120 }`: pointer over the parent only → **420 / 100**;
> pointer over the child → **400 / 120**. The child's hover **cancels** the
> parent's.

So a row's declared `style.hover` is not applied while the pointer is over any
descendant that declares hover — including a trailing `Button`, `IconButton`
or input. The row's authored `hover` still sits in `TestElement.style.hover`,
which is why the existing suite (`"tints a hovered row with the accent role"`)
never caught the painted state.

## 2. Measurement before the design (the STOP gate, answered 2026-10-19)

A throwaway `TestRenderer` probe rendered a row with a trailing `Button` and
attached `onMouseEnter`/`onMouseLeave`/`onMouseMove` to the row. Moving the
pointer to the row's content, then to the button's centre, measured:

| Pointer | Row `enter` | Row `leave` | Row `move` | Row background |
| ------- | ----------- | ----------- | ---------- | -------------- |
| row content | 1 | 0 | 1 | `#2E2370` (accent) |
| trailing button | 1 | **1** | **no event** | `undefined` |

Crossing into an interactive descendant delivers a row `leave`, no `enter` and
no `move`. A plain non-interactive child does not (playground plan 335 §1.3's
probe), which is why a row-only script looked plausible. **The ancestor cannot
see the child's hover through its own events.**

**Decision (the TODO's two options):** counter-track the row's children, but
through an internal hover group rather than per-child knowledge in `List`:
`Button` and `IconButton` already own the common trailing control, so they
report their pointer crossings to the enclosing row. A custom interactive child
still owns its hover; `docs/list.mdx` states that limit. Outside a list row the
hook registers nothing.

## 3. Files to create or change

| Action | Path | What |
| ------ | ---- | ---- |
| create | `packages/components/src/internal/hover-group.ts` | `HoverGroupContext`, `useHoverGroupMember` (composes the caller's handlers, leaves on unmount while hovered, inert outside a group) |
| change | `packages/components/src/list.tsx` | `ListItem` keeps `selfHovered` plus a member count, provides the group, and paints `colors.accent` when either holds |
| change | `packages/components/src/internal/button.tsx` | `Button`/`IconButton` join the enclosing group |
| change | `packages/components/src/behaviour/list.test.tsx` | three native cases (§5) |
| change | `packages/components/docs/list.mdx` | Sizing prose and limitation; verification count `59` |
| change | `COMPONENTS.md` | Lists row records the rule; native count `59` |
| change | `TODO.md` | tick the work, resolve the Interlocks hover row |
| change | `.agents/slop/plans/README.md` | index this plan |
| change | `PLAN.md` | D30 records `606` as the next free components number |

No new component, no new public export, no dependency.

## 4. Implementation

`internal/hover-group.ts`:

```ts
export interface HoverGroup {
  readonly enter: () => void;
  readonly leave: () => void;
}
export const HoverGroupContext = createContext<HoverGroup | null>(null);
export const useHoverGroupMember = (
  onMouseEnter?: (event: EventPayload) => void,
  onMouseLeave?: (event: EventPayload) => void,
): { onMouseEnter?: ...; onMouseLeave?: ... } => {
  const group = useContext(HoverGroupContext);
  const entered = useRef(false);
  useEffect(() => () => {
    if (entered.current) group?.leave();
  }, [group]);
  return group === null ? {} : {
    onMouseEnter: (event) => { entered.current = true; group.enter(); onMouseEnter?.(event); },
    onMouseLeave: (event) => {
      if (entered.current) { entered.current = false; group.leave(); }
      onMouseLeave?.(event);
    },
  };
};
```

`ListItem`:

1. `selfHovered` (row crossing) and `memberHovers` (count) states;
   `hovered = !disabled && (selfHovered || memberHovers > 0)`.
2. A stable `HoverGroup` value whose `enter` increments and `leave` decrements
   with a floor of zero.
3. The row's own `onMouseEnter`/`onMouseLeave` set `selfHovered` and compose the
   caller's handlers.
4. `HoverGroupContext.Provider` wraps the row.
5. Base style, after the selected branch:
   `...(hovered && focusable && !disabled ? { backgroundColor: theme.colors.accent } : {})`.

Keep the declared `hover`/`active` refinement: it paints the row when the
pointer is over the row itself and keeps the existing authored-style assertion.

`Button`/`IconButton` call `useHoverGroupMember(onMouseEnter, onMouseLeave)` and
spread its result. The caller's handlers are composed, never replaced. Outside
a row the hook returns the caller's handlers unchanged (implemented after the
first pass returned `{}` and silently dropped them, which a `Button` anywhere
else would have lost), so the control registers nothing on its own account.

The state is local to one `ListItem`, so the per-row mask store and the
1,000-row contract (plan 339) are untouched; a hover crossing repaints one row.

## 5. Test plan

In `src/behaviour/list.test.tsx`, three native cases:

1. **"keeps the row tint while the pointer is over a trailing control"** —
   first row with `trailing={<Button testId="trailing-action">Open</Button>}`;
   `hoverCentreOf(list, "trailing-action")`; assert the row's
   `style.backgroundColor` is `darkTheme.colors.accent`. Old code: `undefined`.
2. **"clears the row tint when the pointer leaves the row"** — same fixture,
   assert accent under the control, move outside the row, assert the row is no
   longer accent. Old code fails the first assertion.
3. **"composes the caller's pointer handlers on a member control"** — the
   trailing `Button` gets caller `onMouseEnter`/`onMouseLeave`; hover it, assert
   the row is accent, leave, assert both handlers ran once. This fails if the
   hook replaces instead of composes, and the accent assertion fails without
   the group.

No pixel or screenshot assertion (D24); the assertion is the row's own authored
style after the event.

## 6. Commands and expected results

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/list.test.tsx
```

Expected: `59` tests, `56` passed, `3` failed — the three known plan-540
binding failures (`hands focus to the tab stop …`, `falls back to the
surviving selection …`, `takes the tab stop and focus off a row that becomes
disabled`). **STOP** if a new case fails or if the failure count differs.

Prove the new cases fail without the fix: remove `{...hoverMember}` from
`Button` (or the provider from `ListItem`), rerun, and confirm cases 1–3 fail.
Restore before continuing. (Recorded: before the wiring all three failed with
`expected undefined to be '#2E2370'` and `expected "vi.fn()" to be called 1
times, but got 0`.)

Then:

```sh
nub run --filter @gpuixui/components test
nub run check-types
nub run lint
nub run fmt
```

Expected: unit suites pass; types, lint and format report no findings.
Finally run the completion gate from the repository root:

```sh
nub run check && nub run lint && nub run test
```

Expected: exit `0` for all three. Record the exact counts in the commit and in
`TODO.md`. The full native suite is the merge gate; run
`nub run --filter @gpuixui/components test:behaviour` once before pushing the
branch.

## 7. Acceptance

- The row's `backgroundColor` is `colors.accent` while the pointer is over its
  trailing `Button`/`IconButton`, and not after the pointer leaves the row.
- Caller pointer handlers on the member control still run.
- A member removed while hovered does not leave the row lit (unmount cleanup).
- `docs/list.mdx` states the behaviour and the custom-child limitation, with
  its real native-test count; `COMPONENTS.md` and the inventory agree.
- `TODO.md` no longer lists the hover row as open.
- The new cases fail without the wiring and pass with it; the three
  pre-existing plan-540 failures are unchanged.

## 8. Results (2026-10-19)

- `src/behaviour/list.test.tsx`: **59 tests, 56 passed, 3 failed** — the three
  failures are the recorded plan-540 row-removal focus cases, unchanged. The
  three new cases pass; they failed before the wiring.
- `src/behaviour/button.test.tsx`: **1 new case** — a `Button` outside a hover
  group still receives the caller's `onMouseEnter`/`onMouseLeave`.
- `nub run --filter @gpuixui/components test`: **44 files, 444 tests passed**.
- `nub run check`: `check:tests`, lint, format and type-check all clean.
- `nub run test` (workspace): every package green; components 444, primitives
  282.
- `nub run --filter @gpuixui/components test:behaviour`: **768 passed, 35
  failed of 803** — the same 35 pre-existing plan-540 binding failures named in
  `PLAN.md` D30/`TODO.md`; no new failure.

