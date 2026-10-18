# 526 — Drawer motion: fade the veil, slide the edge surface

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening; the second `@gpuixui/tw` motion slice) |
| Owner | components workstream |
| Depends on | `309` (Drawer), `525` (the motion slice and `internal/motion.ts`), `524` (`@gpuixui/tw`) |
| Status | done — 14 native cases (behaviour 698); two mutation proofs |
| Number | `526` — `525` landed on 2026-10-18; `526` is the next free number |

This plan is self-contained. Facts marked **measured** were reproduced on this
host (Intel macOS, the locally built `darwin-x64` binding from plan `140`).

---

## 1. Goal

Plan `525` gave Toast, Dialog and Popover their shadcn motion. The Drawer is the
one Tier 2 overlay still missing it: `DrawerContent` unmounts the instant `open`
turns false and the surface appears with no transition. Its recorded limitation
says *"no slide animation (`motion` has no transform; animating width/left would
reflow the content)"* — the second half is no longer true.

Measured while writing this plan: a `motion.div` with `initial={{ top: -8 }}` /
`animate={{ top: 0 }}` moves the panel it wraps by 7–8 painted pixels; `top` and
`left` are relative offsets in GPUix's motion, not layout properties, so a slide
does **not** reflow the content. The Popover's `slide-in-from-*-2` already
proves this (measured: panel `y` 71 → 78 across the 100 ms enter).

So this plan removes the limitation with the mechanism the runtime actually has:

| Surface | Motion |
| ------- | ------ |
| Veil | 100 ms fade (`dialogMotion(theme)`, the same recipe as Dialog) |
| Edge surface | 300 ms fade + a side-specific `slide-in-from-*` offset (shadcn `sheet.tsx`) |

`zoom-*`, `transform` and a swipe gesture stay unavailable and stay recorded.

## 2. Measured facts this design rests on

- **A relative offset animates the painted box.** The probe above moved the
  Popover panel 7 px between the first paint and the settled paint.
- **Two nested `motion.div`s both register with `AnimatePresence`.** The
  presence child removes only after every registered motion reports completion;
  the Dialog's single wrapper is not enough for a veil-plus-surface pair, so the
  veil and the surface each own one.
- **`motion.div` has no typed `testId`, `role` or `aria-*`.** The semantic node
  stays a plain inner `div`; the existing test ids and roles do not move.
- **Exit completion needs the native pumps.** `clockFastForward(ms)` alone does
  not finish: the suites' `finishMotion` helper (plan `525`, in
  `internal/interaction.ts`) already does clock + events + paint and is reused.
- **The existing Drawer suite asserts absence immediately after close** (Escape,
  backdrop press). Those cases gain `finishMotion`; every other case keeps
  asserting while the drawer is open and is unaffected.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/components/src/drawer.tsx` | wrapper/surface split, veil motion, edge slide, inert exit |
| `packages/components/src/behaviour/drawer.test.tsx` | `finishMotion` on the two close cases; 3 new native cases |
| `packages/components/docs/drawer.mdx` | remove the slide limitation, add the motion section and the new count |
| `COMPONENTS.md` | Drawer row: motion recipe, durations, remaining gaps |
| `TODO.md` | the plan-526 row, ticked |
| `.agents/slop/plans/README.md` | index this plan |

No new dependency: `@gpuixui/tw` is already a dependency from plan `525`.

## 4. Implementation

### 4.1 `src/drawer.tsx`

Split `DrawerContent` exactly as plan `525` split `DialogContent`:

```tsx
export const DrawerContent = (props: DrawerContentProps) => {
  const { open } = useDrawerContext();
  return (
    <AnimatePresence initial={false}>
      {open ? <DrawerSurface key="drawer" {...props} /> : null}
    </AnimatePresence>
  );
};

const DrawerSurface = ({ ... }: DrawerContentProps) => {
  // the current DrawerContent body (theme, window, refs, modal rules)
  useModalFocus(open ? contentId : undefined, initialFocus);
  ...
};
```

`DrawerSurface` renders two motions:

```tsx
const SLIDE: Readonly<Record<DrawerSide, string>> = {
  right: "data-open:slide-in-from-right",
  left: "data-open:slide-in-from-left",
  bottom: "data-open:slide-in-from-bottom",
};

const surfaceMotion = motionProps(
  motionFromClasses(
    `data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 ${SLIDE[side]} duration-300`,
    theme,
  ),
);
```

and the tree:

```tsx
<anchored position={{ x: 0, y: 0 }} occlude style={{ position: "absolute" }}>
  <motion.div
    {...motionProps(dialogMotion(theme))}
    style={{
      width: window.width,
      height: window.height,
      pointerEvents: open ? "auto" : "none",
      backgroundColor: theme.colors.overlay,
    }}
  >
    <div
      testId="drawer-backdrop"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: isVertical(side) ? "column" : "row",
        alignItems: "stretch",
        justifyContent: side === "left" ? "flex-start" : "flex-end",
      }}
    >
      <motion.div {...surfaceMotion}>
        <div role="dialog" ...>…</div>
      </motion.div>
    </div>
  </motion.div>
</anchored>
```

Rules:

- The **semantic surface** (`role="dialog"`, `aria-label`, `testId`, ref,
  handlers) stays the plain `div`; only its visual style moves nowhere.
- The **slide wrapper** is sized by the surface; it carries no background.
- `pointerEvents: none` on the veil once `open` is false, so the 300 ms ghost
  cannot be clicked; focus already returned when the state changed.
- The dismiss layer, `useModalState`, Tab trap and focus return are untouched:
  the surface is mounted only while open or exiting, and `useModalFocus` gets
  `undefined` at close, exactly as Dialog does.
- Import `AnimatePresence`, `motion`, `dialogMotion`, `motionFromClasses` and
  `motionProps` exactly as Dialog/Popover do.

### 4.2 Test helper

Reuse `finishMotion` from `internal/interaction.ts` (already exported by plan
`525`; do not add a second copy). After an Escape or a backdrop press:

```ts
drawer.renderer.simulateKeystrokes("escape");
finishMotion(drawer);
expect(drawer.renderer.findByTestId("drawer")).toBeUndefined();
```

## 5. Test plan

All cases are native (`test:behaviour`). The header comment of the suite gains
the new guarded bugs: *a drawer that snaps instead of sliding, and a closing
drawer that leaves a clickable ghost*.

1. **Enters with the veil fade and the edge slide** — open `side="right"`;
   one animated div carries `transition.duration === 0.1` (the veil) and one
   carries `transition.duration === 0.3` with `initial.left === 8` and
   `animate.left === 0` (the surface). Assert on `customProps.motion`.
2. **The slide is real, not only a prop** — open; read `requireBounds("drawer")`
   before finishing the motion; `finishMotion`; read again. The early `x` must
   be greater than the settled `x` (right drawer), by at most 8 px. This fails
   if the offset never reaches layout.
3. **Keeps the surface for its exit, then unmounts it** — open, Escape: the
   surface is still defined while focus is already back on the trigger;
   `finishMotion`; it is undefined. This fails without `AnimatePresence`.
4. **A bottom drawer slides on the vertical axis** — open `side="bottom"`;
   the surface wrapper's `initial.top === 8` and `animate.top === 0`. (One
   extra case; the spec's three edges share one rule, but the axis differs.)

Mutation proofs (record the failing cases in the plan/TODO):

- Remove `AnimatePresence` around `DrawerSurface` → case 3 fails.
- Remove `${SLIDE[side]}` from the class string → cases 1, 2 and 4 fail.

Commands:

```sh
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/drawer.test.tsx
nub run --filter @gpuixui/components test
nub run check
nub run lint
nub run test
```

Expected: Drawer 14/14 (10 existing + 4), unit 404 unchanged, behaviour 698,
all gates exit 0.

## 6. STOP conditions

- If the two nested `motion.div`s leave the drawer mounted forever in the
  renderer, stop: a surface that never unmounts is a leak, not an animation.
- If the slide changes the settled box (width, height or final edge), stop and
  report: the surface must land exactly where it does today.
- If a backdrop press during the exit reaches the veil, stop: the ghost must be
  inert (`pointerEvents: none`).
- If a focus, Tab or dismissal case changes, stop and report the case; the exit
  must not alter behaviour that ends at close.

## 7. Acceptance

- The veil fades in 100 ms; the surface fades and slides in 300 ms from its own
  edge, using `@gpuixui/tw` recipes (`dialogMotion` + `motionFromClasses`).
- The closing drawer is inert and unmounts after its exit; focus and the Tab
  trap are unchanged.
- Four native cases pin entry, painted movement, bottom-axis and exit, with the
  mutation proofs above.
- `docs/drawer.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index are in sync;
  the removed limitation is replaced by the real recipe and the remaining gaps
  (`zoom-*`, swipe, `aria-modal`).

## 8. Results (2026-10-18)

- `DrawerContent` now splits into the `AnimatePresence` wrapper and
  `DrawerSurface`; the veil is a `dialogMotion(theme)` fade and the surface is
  `motionFromClasses` with `slide-in-from-{right,left,bottom}` and
  `duration-300`.
- Both close paths (Escape, backdrop press) and the geometry test wait for the
  motion through `finishMotion(root, 300)`; no other case changed.
- 4 new native cases: entry props for veil + surface, the painted slide
  (early `x` > settled `x`, difference ≤ 8 px), the bottom-axis prop pair, and
  the inert exit ghost.
- Mutation proofs, run on this host:
  - removing `AnimatePresence` fails exactly "keeps the surface for its exit,
    then unmounts it";
  - removing `${SLIDE[side]}` fails the three slide cases (entry props, painted
    slide, bottom axis).
- Suites: Drawer 14/14, unit 404, behaviour 698. `nub run check`, `nub run lint`
  and `nub run test` exit 0.
- The Enter/Exit slide is a measured painted offset, not only a prop: a
  `motion.div`'s `top`/`left` are relative offsets in GPUix 0.10.0, so the
  content does not reflow. `zoom-*` and transform stay unsupported.
- Not run: a live window run for this slice (the plan's live runner is the
  playground worktree's; plan `525` recorded the scratch-run procedure and the
  one stale toast assertion). The native behaviour suite is the evidence used
  here; no live claim is made.
