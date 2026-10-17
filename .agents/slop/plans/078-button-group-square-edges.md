# 078 — `ButtonGroup`'s attached mode leaves every button rounded

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 visual/API correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `048` |
| Status | **done** |

Self-contained: §1 the gap, §2 the shape, §3 exact files, §4 tests, §5 commands,
§6 STOP conditions, §7 acceptance and outcome.

---

## 1. The gap

`ButtonGroup`'s `attached` mode sets `gap: 0`, `borderRadius: radius.md` and
`overflow: "hidden"` on the **group**. Each `Button` still paints
`borderRadius: radius.md` (`core/style.ts` `controlStyle`).

The clip rounds the group's *outer* boundary, so the first and last buttons look
right. The buttons in between keep their own four rounded corners at the shared
edges, so two adjacent buttons meet with a lens-shaped notch of background
between their corners. `docs/button-group.mdx` claims "the middle buttons' own
radii are hidden by the clip" — they are not: the clip is at the group's
boundary, and an interior corner is nowhere near it. The source comment also
tells the reader to "pass `square`/`radius` to the buttons", but **`Button` has
no `radius` prop**, so that advice does not typecheck.

Measured with the runtime probe added to `runtime/controls.runtime.test.tsx`
before the fix: the painted `borderRadius` of every button inside an attached
group is `6` (`radius.md`), and the three buttons are contiguous
(`gap 0`, measured by the existing suite).

## 2. The shape

**An attached group gives its buttons a square edge; the group supplies the
rounded ends.**

- `Button` gains a public `radius?: RadiusStep` prop (`"none" | "sm" | "md" |
  "lg" | "xl" | "full"`), defaulting to `md` — the value it always painted.
- `controlStyle` takes `ControlSpec.radius` and resolves
  `theme.radius[spec.radius ?? "md"]`.
- `ButtonGroup` provides a **shaping context** with `"none"` in attached mode
  (and `undefined` in separated mode). `Button` reads it and uses
  `props.radius ?? shape`.
- Context is React's own composition mechanism: no child cloning, no
  `:first-child` (the runtime has none), and a consumer can still override a
  single button with `radius`.

New file `src/components/group-shape.ts`:

```ts
import { createContext, useContext } from "react";
import type { RadiusStep } from "../core/theme.js";

/** The corner shape an attached group asks its buttons to wear. */
export const GroupShapeContext = createContext<RadiusStep | undefined>(undefined);

export const useGroupShape = (): RadiusStep | undefined =>
  useContext(GroupShapeContext);
```

`renderButtonGroup` keeps its current pure signature and returned tree (the
existing element-tree tests read the host div), so the provider is added in the
`ButtonGroup` **component** around that tree:

```tsx
export const ButtonGroup = (props: ButtonGroupProps): ReactElement => {
  const theme = useTheme();
  return (
    <GroupShapeContext.Provider
      value={props.mode === "separated" ? undefined : "none"}
    >
      {renderButtonGroup(props, theme)}
    </GroupShapeContext.Provider>
  );
};
```

Nested groups: the nearest provider wins, which is what a nested layout wants.

Only `Button` consumes the shape. A `Toggle` inside a `ButtonGroup` is not the
group's contract (a pressed set is `ToggleGroup`); the docs say so instead of
pretending otherwise.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | `ControlSpec.radius`; resolve `theme.radius[radius ?? "md"]` |
| `packages/primitives/src/components/group-shape.ts` | **new** — the context and `useGroupShape` |
| `packages/primitives/src/components/Button.tsx` | `radius` prop; read the group shape; document |
| `packages/primitives/src/components/ButtonGroup.tsx` | provide the shape; correct the false comment |
| `packages/primitives/src/components/Button.test.tsx` | `renderButton`'s `radius` resolution |
| `packages/primitives/runtime/controls.runtime.test.tsx` | the runtime case in §4 |
| `packages/primitives/docs/button-group.mdx` | correct the clip claim, state the shape rule |
| `packages/primitives/docs/button.mdx` | the `radius` API row |
| `COMPONENTS.md` | the Button and Button groups rows |
| `TODO.md` | tick the task added for this plan |
| `.agents/slop/plans/README.md` | index this plan and its status |

Implementation notes:

- `Button` calls `useGroupShape()` unconditionally (hook order), then passes
  `props.radius ?? shape` into its existing spec.
- `renderButton` stays pure: the radius is a prop, not a hook call, so every
  element-tree test keeps working.
- Do not change `Toggle`, `ToggleGroup`, `Input` or `Select`; this plan is the
  group's shape only.
- `core/style.ts` keeps `md` as the default, so every existing control paints
  exactly what it painted before.
- No new export from `src/components/index.ts`: `group-shape.ts` is internal and
  `RadiusStep` is already public from `core`.

## 4. Tests — each able to fail

**Element tree (`src/components/Button.test.tsx`)**

1. `renderButton({ radius: "none" })` paints `borderRadius: 0`, and the default
   still paints `testTheme.radius.md` (guards the resolver and the default).

**Runtime (`runtime/controls.runtime.test.tsx`)**

2. An **attached** group of three buttons: every button's painted
   `borderRadius` is `0`, the group's own is `testTheme.radius.md`, and its
   `overflow` is `hidden`. A **separated** group: every button keeps
   `testTheme.radius.md`. Before the fix, the attached buttons paint `6`.
3. An explicit `radius="sm"` on one button inside an attached group wins
   (the context is a default, not an override the consumer cannot escape).

**Two-direction proof**

- Remove the provider's `value` (`undefined`) and re-run test 2: the attached
  buttons paint `6` and the assertion fails (§7 records it). Keep the existing
  attached/separated gap test and the a11y name test green.

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
```

- offline suite gains case 1 and passes;
- runtime suite grows from 182 to 184 tests, 16 files, exit `0` (refresh the
  counts in `COMPONENTS.md` and `packages/primitives/README.md`);
- `check` green (tests, lint, format, types).

## 6. STOP conditions

Stop and report instead of improvising if:

- a `Button` inside an attached group paints no `borderRadius` at all (then the
  clip is already doing something different from what §1 describes — record the
  measurement before choosing a fix);
- the context reaches buttons outside the group (e.g. a portal) in a way that
  changes another component's default;
- the change needs a new prop on any component other than `Button`.

## 7. Acceptance and outcome

Accepted when: an attached group has square inner edges, the ends are rounded by
the group's clip, separated mode is unchanged, a per-button `radius` still wins,
the docs no longer claim the clip hides inner radii, and §5 is green.

**Outcome (2026-10-17).**

- Added `ControlSpec.radius`, `Button.radius`, the internal `GroupShapeContext`,
  and the provider in `ButtonGroup`. Attached buttons now paint `borderRadius: 0`
  under the group's clipped `radius.md`; separated mode and standalone buttons
  still paint `radius.md`.
- Offline: 1 `renderButton` test asserting explicit `none`, the `md` default and
  an explicit `lg`.
- Runtime: 2 tests — attached paints `0` on every button with the group at `md`,
  and an explicit `radius="sm"` still wins. Suite **16 files / 184 tests**, exit
  `0`.
- Two directions: with the provider's value removed, the attached assertion fails
  with `6` (the legacy paint); restored, green.
- `docs/button-group.mdx` no longer claims the clip hides inner radii and states
  the shape rule; `docs/button.mdx` documents `radius`; both inventory rows and
  the counts are refreshed.
