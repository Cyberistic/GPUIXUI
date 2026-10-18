# 369 — A horizontal `ButtonGroup` must share its width between its buttons

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / layout truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `078`, `096`, `097`, `368` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, real `TestRenderer`)

A `ButtonGroup` given a 220 px width, with a long first label and a short second
button, was measured in both modes:

| Mode | Group box | First button | Second button | Result |
| ---- | --------- | ------------ | ------------- | ------ |
| `attached` | `x 12…232` | `x 12…413` (401 px) | `x 413…463` (50 px) | the first button escapes the group and the **second is entirely clipped away** by the group's `overflow: hidden` |
| `separated` | `x 12…232` | `x 12…413` | `x 419…469` | both buttons paint **outside** the group |
| `attached`, `vertical` | `x 12…232` | `x 12…232`, `y 12…44` | `x 12…232`, `y 44…76` | correct: a vertical group stretches its buttons |

The cause is the same one plan `368` fixed one level down: a text run is a flex
item the runtime never shrinks, so the first button's intrinsic width is its
label's width (the label itself is now contained inside the 401 px button, which
is why plan `368`'s matrix passes for a `Button`). The group then lays the second
button after it, outside the group's own box.

A `ToggleGroup` given a width does not have this defect because its items take
`shrinkLayoutStyle` (plan `368`).

## 1. The decision

**A horizontal group shares its width between its buttons.** The buttons become
shrinkable flex items (`flexShrink: 1`, `minWidth: 0`), so a constrained group
gives them the space it has and each label truncates through plan `368`'s
containment item. A group with room is unchanged: `flexShrink` only acts when
the container is too small, so the buttons keep their intrinsic widths.

A **vertical** group does not shrink: it already stretches each button to the
group's width (plan `096`), and `flexShrink` on a column would squash the
buttons' height instead.

The contract travels through `GroupShapeContext`, which already gives attached
groups their shared radius (`078`): a `Button` outside a group never shrinks.

Alternatives rejected:

- **A `shrink` prop on `Button`** exposes the group's internal problem to every
  caller, and a consumer who forgets it recreates the bug.
- **Cloning the children** to add a style is the mechanism the package avoided
  for the radius (context is React's own composition).
- **`flexShrink` on every button** would change how a standalone button behaves
  in an ordinary row.

## 2. The rule

```ts
// group-shape.ts
export interface GroupShape {
  /** The radius the group supplies; empty for a separated group. */
  readonly radius: Option.Option<RadiusStep>;
  /** Whether the group shares its width between its buttons. */
  readonly shrink: boolean;
}
export const GroupShapeContext =
  createContext<Option.Option<GroupShape>>(Option.none());
```

`ButtonGroup` provides `{ radius, shrink: orientation === "horizontal" }`.
`Button` reads it, passes `{ clipped, shrink }` to `renderButton`, and the chrome
takes `shrinkLayoutStyle` when `shrink` is true. `IconButton` composes `Button`,
so it inherits the contract.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/group-shape.ts` | `GroupShape` replaces the bare radius |
| `packages/primitives/src/components/ButtonGroup.tsx` | provide the shape for the current mode and axis |
| `packages/primitives/src/components/Button.tsx` | read the shape, pass `{ clipped, shrink }`, merge the shrink style |
| `packages/primitives/src/components/Button.test.tsx` | the two `clipped` calls move to the options object; a shrink case |
| `packages/primitives/runtime/overflow.runtime.test.tsx` | one group case: both buttons and the long label stay inside the group |
| `packages/primitives/docs/button-group.mdx` | the width-sharing rule in Limitations/Behaviour |
| `COMPONENTS.md` | the Button groups row records it |
| `TODO.md` | add and tick the task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/components/Button.test.tsx` | the updated and new cases pass |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 43 files / 615 tests) |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 31 files / 600 tests) |
| `nub run check`, `nub run lint`, `nub run test` | exit 0 |

## 5. Test plan

### 5.1 Element tree (`Button.test.tsx`)

1. **"shrinks inside a horizontal group"** — `renderButton(props, theme, focus,
   { shrink: true })` has `flexShrink: 1` and `minWidth: 0` in the chrome; the
   same render without the flag has neither. Before: no such option existed.

### 5.2 Runtime (`overflow.runtime.test.tsx`)

2. **"shares a constrained group's width"** — a `ButtonGroup` at 220 px with a
   long first button and a short second: both buttons' boxes are inside the
   group's box, and the painted long label is inside the group too. Before: the
   first button was 401 px wide and the second sat at `x 413…463`, entirely
   outside a group at `12…232`.
3. A vertical group at the same width keeps both buttons at the group's width
   (regression for the no-shrink decision): measured `x 12…232` for both, one
   above the other.

### 5.3 Two-direction proof

- Record the new group case failing on the unmodified tree (§0).
- Apply the fix; all green.
- Remove the provider's `shrink` flag → the group case fails by name.
- Green suites, then `nub run check`, `nub run lint`, `nub run test`.

## 6. STOP conditions

1. Sharing the width changes a standalone button's layout (context leak) — check
   the existing button geometry cases; a failure there means the flag is read
   outside a group.
2. A vertical group starts squashing under the shrink flag — then the flag must
   be horizontal-only (it is), and the vertical regression case proves it.
3. The group's own `style` width is ignored — that would be a plan `097`
   problem; stop and report instead of widening this plan.
4. A gate fails for an unrelated reason — report it.

## 7. Outcome

Implemented.

- `GroupShape` (`radius` + `shrink`) replaces the bare radius in the context;
  `ButtonGroup` provides `shrink: orientation === "horizontal"`, and `Button`
  merges `shrinkLayoutStyle` into its chrome only when the group asks.
- Measured after: in a 220 px attached group the two buttons are `x 12…222` and
  `x 12…222`-ish segments of the group (both inside `12…232`), and the long
  label stays inside the group; the vertical group still paints both buttons at
  the group's width.
- The new group case fails in the old direction (first button 401 px, second at
  `413…463`) and when the provider's `shrink` flag is removed.
- One correction while implementing: `clipped` is its own field on `GroupShape`.
  Inferring it from "is in a group" made a **separated** group paint the inset
  ring, which the existing `controls.runtime` case caught; the group now supplies
  `clipped: attached` explicitly.
- Docs, inventory, `TODO.md` and the index record it. Offline **43 files / 616
  tests**, runtime **31 files / 602 tests**; `nub run check`, `nub run lint` and
  `nub run test` pass.

## 8. Acceptance

- [x] A constrained horizontal `ButtonGroup` never paints a button outside itself.
- [x] The long label truncates inside the shared button (plan `368`).
- [x] A vertical group is unchanged.
- [x] A `Button` outside a group keeps its intrinsic width.
- [x] The new case fails in the old direction.
- [x] Docs, inventory, `TODO.md`, the index and the gates.
