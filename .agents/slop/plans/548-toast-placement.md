# 548 — Toast: the caller names the viewport corner

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `115`, `117`, `123`, `124`, `322`, `370`, `525` |
| Status | done — 2 native cases (Toast 18), both-direction proof |
| Blocker | none — assertions read the authored `style` the renderer reports (plan `150`), not bounds or focus events, so the two plan-540 binding defects stay out of scope |

This plan is self-contained. A weaker executor must be able to run it without
reading any other file first.

---

## 1. Why

`ToastViewport` hard-codes `position: "absolute"; right: …; bottom: …`. A desktop
app that puts its status bar or its primary action rail at the bottom-right has
nowhere to put notifications: the caller can pass `style` only by fighting the
component's own rules, and the docs call the result "the bottom-right stack".
shadcn's `Toaster` makes the same choice a prop (`position`), and the mission
requires a predictable, typed API rather than scattered literals.

Scope of this plan:

- add `position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"`
  (default `"bottom-right"`) to `ToastViewport`;
- derive the two pinned edges with one exhaustive `Match`, so a new corner is a
  compile error until it is handled;
- export the `ToastPosition` type from `@gpuixui/components/toast`;
- prove the painted `top`/`bottom`/`left`/`right` in the real renderer;
- sync the example, docs page, `COMPONENTS.md`, `TODO.md` and the plan index.

**Out of scope** (do not add): top/bottom **centre** positions (the runtime has
no transform to centre without a measured width), a per-toast position, a
`side`/`align` pair, animation changes, reduced-motion handling, a
`ToastProvider` position (the viewport owns its layout), or a new part.

## 2. What exists today (read these first)

- `packages/components/src/toast/viewport.tsx`:
  - the module doc says "a paint-order stack in the bottom-right corner";
  - `ToastCard` owns the card, its pause/resume holds and its status name;
  - `ToastViewportProps extends Props` has only `children`;
  - `ToastViewport` merges `{ position: "absolute", right: theme.spacing.xl,
    bottom: theme.spacing.xl, … }` with the caller's `style`.
- `packages/components/src/toast.tsx` re-exports `ToastViewport`,
  `ToastViewportProps` and `toastMeta` from `./toast/viewport.js`.
- `packages/components/src/behaviour/toast.test.tsx` — 16 native cases; the
  `Harness` mounts `<ToastProvider><Controls/><ToastViewport/></ToastProvider>`
  inside one `div`. `renderComponent` allows one native root at a time, so a
  multi-corner test must `unmount()` between renders.
- `packages/components/docs/toast.mdx` — anatomy, behaviour, API, theming,
  accessibility and the canonical verification line `(16 tests)`.
- `packages/components/examples/toast.example.tsx` — a 900 × 520 demo with the
  viewport as the last child.
- `COMPONENTS.md` → Tier 2 → Toasts / notifications; `src/inventory.ts` →
  `toastMeta`.

The native renderer reports the **authored** style values verbatim (plan `150`
D24), so `renderer.findByTestId("toast-viewport")?.style.top` is the token value
the component wrote — no measurement needed.

## 3. Design

### 3.1 The type and the corner rule (`toast/viewport.tsx`)

```ts
/** Where the stack sits in the app root. */
export type ToastPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/** The two edges a corner pins, as token offsets from the app root. */
const corner = (
  theme: Theme,
  position: ToastPosition,
): {
  readonly top?: number;
  readonly bottom?: number;
  readonly left?: number;
  readonly right?: number;
} =>
  Match.value(position).pipe(
    Match.when("top-left", () => ({
      top: theme.spacing.xl,
      left: theme.spacing.xl,
    })),
    Match.when("top-right", () => ({
      top: theme.spacing.xl,
      right: theme.spacing.xl,
    })),
    Match.when("bottom-left", () => ({
      bottom: theme.spacing.xl,
      left: theme.spacing.xl,
    })),
    Match.when("bottom-right", () => ({
      bottom: theme.spacing.xl,
      right: theme.spacing.xl,
    }),
    Match.exhaustive,
  );
```

`Match` is already imported in the module. Add the `Theme` type to the existing
`internal/theme.js` import.

Props:

```ts
export interface ToastViewportProps extends Props {
  /** The corner the stack grows from. Default `"bottom-right"`. */
  readonly position?: ToastPosition;
  /** An optional element before the toasts, e.g. a "dismiss all" action. */
  readonly children?: ReactNode;
}
```

The component destructures `position = "bottom-right"` and spreads
`...corner(theme, position)` into its own style object **before** the layout
rules, so the caller's `style` still wins (the existing `mergeStyles` order).
`alignItems` follows the horizontal side (`flex-start` on a left corner,
`flex-end` on a right one), so a narrower optional child stacks on the same side
as the cards.

The stack's column order does not change: the oldest toast is first in the
queue and therefore topmost on screen in every corner; a bottom corner pins the
container's bottom edge and it grows upward, a top corner pins the top edge and
it grows downward.

### 3.2 Public surface (`toast.tsx`)

```ts
export type { ToastPosition, ToastViewportProps } from "./toast/viewport.js";
```

### 3.3 Boundaries and permissions

- Touch only `packages/components/**`, `COMPONENTS.md`, `TODO.md` and
  `.agents/slop/plans/README.md`.
- No new dependency, no `any`, no second style path; the corner rule is the only
  new logic and it is exhaustive.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/toast/viewport.tsx` | `ToastPosition`, the `corner` rule, the `position` prop and its doc comment; update the module and part doc comments |
| `packages/components/src/toast.tsx` | re-export `ToastPosition` |
| `packages/components/src/behaviour/toast.test.tsx` | two native cases (§5.1) and the guarded-bug header line |
| `packages/components/examples/toast.example.tsx` | mount `<ToastViewport position="top-right" />` so the example exercises the prop |
| `packages/components/docs/toast.mdx` | anatomy, behaviour, API, theming and the verification count |
| `COMPONENTS.md` | the Toasts row: placement, `16` → `18` native tests |
| `TODO.md` | add and tick the Phase C hardening row (§7) |
| `.agents/slop/plans/README.md` | index this plan as done with the measured counts |

## 5. Test plan

Extend the suite header comment with the guarded bug: **a viewport ignores the
corner it is given and always paints bottom-right**.

### 5.1 Native (`src/behaviour/toast.test.tsx`, real `TestRenderer`)

1. **The default is bottom-right** — render the existing `Harness`, push one
   toast, read `renderer.findByTestId("toast-viewport")?.style`; `bottom` and
   `right` are `darkTheme.spacing.xl`, while `top` and `left` are `undefined`.
2. **The caller's corner wins on both axes** — for each of `top-left`,
   `top-right` and `bottom-left`, render `Harness` with a `position` prop,
   read the four offsets and `alignItems`, then `unmount()`. Collect
   `[top, bottom, left, right, alignItems]` per corner and assert the whole
   array: `top-left → [xl, undefined, xl, undefined, flex-start]`,
   `top-right → [xl, undefined, undefined, xl, flex-end]`,
   `bottom-left → [undefined, xl, xl, undefined, flex-start]`.
   Render one corner at a time because `renderComponent` enforces one native
   root.

Expected: the suite grows from 16 to 18 passing cases. No bounds, focus or
animation assertion is added.

### 5.2 Both directions (AGENTS §3)

1. Delete the `...corner(theme, position)` spread (or hard-code the old
   `right`/`bottom`) and confirm **both** new cases fail: the default case keeps
   passing only if the fallback is bottom-right, so mutate the helper instead —
   return the bottom-right offsets for every input and confirm case 2 fails with
   `top !== xl`; remove the spread and confirm case 1 fails with `bottom
   undefined`.
2. Record the exact failure counts in the commit message.

### 5.3 Regression

- the 16 existing toast cases still pass unchanged;
- `src/behaviour/examples.test.tsx` still mounts the updated example (it is not
  interactive beyond the existing buttons);
- `nub run --filter @gpuixui/components test` passes with the updated inventory
  and docs counts;
- `nub run check` and `nub run lint` pass.

## 6. Commands and expected results

Run from `workspaces/components`:

```sh
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/toast.test.tsx
                                                          # 18 passed
nub run --filter @gpuixui/components test                 # unit suite passes (no new unit case)
nub run --filter @gpuixui/components check-types          # exit 0
nub run check                                             # exit 0
nub run lint                                              # exit 0
```

The package `test` suite includes `src/inventory.test.ts`, which checks the
`COMPONENTS.md` and docs counts against the suite — update both counts in the
same commit.

## 7. Docs, inventory and TODO

- `docs/toast.mdx`:
  - anatomy: `ToastViewport` is "the stack in `position`'s corner (default
    bottom-right)";
  - behaviour table: add `placement | position picks one of four corners;
    bottom-right by default`;
  - API row: `position?: "top-left" | "top-right" | "bottom-left" |
    "bottom-right"` (default `bottom-right`);
  - theming: replace "the bottom-right stack" with the corner sentence;
  - verification line: `(18 tests)`.
- `COMPONENTS.md` Toasts row: mention the four corners, change
  `16 native behaviour tests` to `18 native behaviour tests`; do not remove any
  existing limitation (zIndex, progress, reduced motion, portal).
- `TODO.md` → Phase C → "Tier 2 hardening after the inventory closed": add and
  tick `Toast viewport placement — plan 548; four corners, two native tests
  (Toast 18), both-direction proof; docs, example, COMPONENTS.md and inventory
  synced`.
- Plan index: add plan 548 after 547 with the measured counts and the honest
  note that the plan-540 binding failures are pre-existing and untouched.
- `src/inventory.ts` `toastMeta.limitations` needs no change: placement is no
  longer a gap, and the remaining limitations are unchanged.

## 8. STOP conditions

Stop and report instead of improvising when:

- the renderer reports the viewport's `style` without the token offsets (then
  the authored-style assumption in §2 is wrong; do not switch to a bounds
  assertion — the binding's box convention is unsettled, plan `540`);
- `ToastPosition` collides with an existing export from `@gpuixui/components`
  (rename nothing silently; check `src/index.ts` first);
- a corner is visually wrong because the container's width stops hugging the
  cards (the cards are fixed at 380 px; if a runtime change makes `alignItems`
  matter, stop rather than adding a measured width);
- an existing toast case fails for a reason other than the intended change
  (name the case and stop);
- the inventory count check fails because a docs or row count was not updated
  (fix the count, not the check).

## 9. Acceptance

- `<ToastViewport />` still paints bottom-right.
- `<ToastViewport position="top-left" />`, `"top-right"` and `"bottom-left"`
  each pin exactly their two edges at `spacing.xl`.
- Two new native cases pass; the 16 existing ones still pass; unit, inventory,
  type, lint and format gates pass.
- The example exercises `position`, and the docs page, `COMPONENTS.md`,
  `TODO.md` and the plan index agree with the measured counts.
