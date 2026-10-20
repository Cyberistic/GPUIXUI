# 695 — `InfoTip` gains the state-aware `style` seam (the last interactive part without one)

**Phase:** F (Tier 1 consistency / API contract) · **Owner:** primitives
(`packages/primitives`) · **Depends on:** `073` (InfoTip), `079`/`080`/`081`
(state-aware style), `090` (contract), `097` (style order), `357` (the same
defect on `Icon`), `573` (blank label) · **Status:** done

## 0. The defect

`InfoTip` is the **only interactive public part in the package that takes no
`style` prop at all**:

```tsx
// packages/primitives/src/components/InfoTip.tsx
export interface InfoTipProps {
  readonly content: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly side?: FloatingSide;
  readonly testId?: string;
  readonly tipTestId?: string;
}
```

Two written rules say it should have one, and both are currently false for it:

1. **The package-wide merge rule.** *A caller's `style` is merged last on every
   primitive* — `docs/component-api.md` §3, `COMPONENTS.md`'s Box row, and
   `src/components/style-order.test.tsx` (plan `097`), which walks every
   `render*` that takes one. Its own header excludes `InfoTip` with the reason
   *"style their content from the theme"*. That reason holds for `Tooltip`
   (whose tip is the theme's popover surface) but **not** for `InfoTip`: it owns
   a trigger with its own chrome (`infoTipTriggerStyle`), so there is no caller
   seam on the one element it draws.
2. **The state-aware rule.** *A part is styled from a public state object;
   every interactive part exports a `<Part>State`* (`docs/component-api.md` §3,
   plans `079`–`081`). Every focusable control reports `focused`
   (`ButtonState`, `ToggleState`, `CheckboxState`, `SwitchState`, `FieldState`,
   `ScrollAreaState`, …). `InfoTip` already **tracks** focus — it paints the
   ring from `useFocus` — but does not publish it, so its `contract.test.ts`
   row is `states: []`.

The consequences a consumer hits:

- an info icon beside a heading cannot be nudged onto the optical baseline
  without wrapping it in a `Box` — the exact ergonomic gap plan `357` closed for
  `Icon` (`Icon` took no `style`, so "an icon could not be nudged onto a
  baseline without a `Box` wrapper");
- a caller cannot dim, recolour or reposition the trigger while it holds focus,
  which is the one state the component has;
- the component's page is the **only visual component page without a `style`
  row** (verified: every other page carries one; `theme-provider` is exempt
  because it renders no element),
- and the style-order guard's own stated exclusion is wrong, so the rule it
  protects has a silent hole.

## 1. Decisions

- **D1 — the seam is on the trigger.** `InfoTip` owns the trigger; the tip is
  `Tooltip`'s paint (the popover surface), and `Tooltip.style` is the anchoring
  **root**, not the tip (documented on the Tooltip page, plan `345`). A `style`
  here therefore merges onto the trigger, which is the element the component
  draws and the caller positions. The page states this.
- **D2 — the state is `{ focused }`,** the only state the trigger has. It is the
  contract's allowed vocabulary (§3) and the same field `ScrollAreaState` uses
  for the same reason (a labelled, focusable region with no value).
- **D3 — merge order is the package's one rule:** base chrome plus the ring
  first, the caller's object or callback last, through `resolvePartStyle` (the
  single merge point, plans `079`–`081`). A callback's result therefore wins
  exactly where an object wins, and an object style keeps painting as before. A
  caller who returns `boxShadow` replaces the ring — the same trade every other
  part makes; the docs say the ring is part of the base.
- **D4 — no other prop changes.** `role="img"`, the name, `tabIndex`, the slot
  description and the tip's behaviour come from props/`Tooltip`, never from
  `style`. A `style` cannot rename or unfocus the trigger.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/InfoTip.tsx` | add `InfoTipState`, `style?: StateStyle<InfoTipState>`; resolve base + ring then the caller last |
| `packages/primitives/src/components/index.ts` | export the new state type |
| `packages/primitives/src/components/InfoTip.test.tsx` | object style survives; callback receives both states; role/name unchanged; ring still in the base |
| `packages/primitives/src/components/state-style.test.tsx` | one case: the callback receives `{ focused }` and paints |
| `packages/primitives/src/components/style-order.test.tsx` | add `InfoTip` to the guard table; correct the header's false exclusion |
| `packages/primitives/runtime/info-tip.runtime.test.tsx` | two native cases: focus reaches the public state; a caller's margin moves the painted trigger |
| `packages/primitives/src/contract.test.ts` | `InfoTip` row `states: ["InfoTipState"]` |
| `packages/primitives/docs/info-tip.mdx` | `style` API row, a `## Style by state` section, a Theming sentence, a limitation about the tip's own surface |
| `packages/primitives/README.md` | add `InfoTipState` to the state-type list |
| `COMPONENTS.md` | one sentence in the Tooltips row (which owns InfoTip) |
| `.agents/slop/plans/README.md`, `TODO.md` | index this plan; record the task |

## 3. Implementation

### 3.1 `InfoTip.tsx`

```ts
import { focusRing } from "@gpuixui/tokens";
import {
  ariaNameOr,
  mergeStyle,
  resolvePartStyle,
  useFocus,
  type FocusState,
  type StateStyle,
} from "./internal.js";

/** The public state an `InfoTip` style callback receives. */
export interface InfoTipState {
  /** Whether the trigger holds native focus. */
  readonly focused: boolean;
}

export interface InfoTipProps {
  // …unchanged
  /**
   * An object, or a callback over the trigger's public state. Merged last on
   * the trigger — the element this component draws; the tip's surface belongs
   * to `Tooltip`.
   */
  readonly style?: StateStyle<InfoTipState>;
}
```

In `renderInfoTip`, replace the existing `mergeStyle(...)` with the one merge
point:

```ts
style={resolvePartStyle(
  mergeStyle(infoTipTriggerStyle(theme), focus.focused ? focusRing(theme) : undefined),
  style,
  { focused: focus.focused },
)}
```

`focused` is already on the `FocusState` parameter (defaulted for element-tree
renders), so the renderer stays pure and no new hook is needed.

### 3.2 `components/index.ts`

```ts
export type { InfoTipProps, InfoTipState } from "./InfoTip.js";
```

### 3.3 The guards

- `contract.test.ts`: `{ name: "InfoTip", page: "info-tip", states: ["InfoTipState"] }`
  — the existing cases then require the declaration (§2.1) and that
  `info-tip.mdx` names it (§2.2), and the page's API-table case requires the
  `style` row.
- `style-order.test.tsx`: add
  `{ name: "InfoTip", render: (style) => renderInfoTip({ content: "Hint", label: "More", style }, testTheme, idle) }`
  and rewrite the header's exclusion to name only the parts that genuinely take
  no `style` (`IconButton` forwards to `Button`; `Tooltip.style` is the root).
- `state-style.test.tsx`: one `describe("InfoTip")` case using the existing
  `recorder` helper, with `idle` and `focused`.

## 4. Test plan

Offline (`nub run --filter @gpuixui/primitives test`):

1. **state payload** — the callback receives `{ focused: false }` and
   `{ focused: true }`, in that order, from the same `renderInfoTip` shape.
2. **callback wins** — its `backgroundColor` is the trigger's resolved value
   (`state-style`).
3. **object style still works** — `style={{ marginLeft: 12 }}` paints `12` on
   the trigger; the old form is unchanged.
4. **role/name/tabIndex unchanged** — the existing assertions still pass while
   a style is supplied.
5. **the ring is in the base** — a focused trigger with an unrelated caller
   style still carries `boxShadow`; a caller that returns `boxShadow: undefined`
   wins (merge-last proof).
6. **style-order** — the two `it.each` cases over `GUARDS` now include
   `InfoTip` (caller sentinels survive; no sentinel is a base value).

Runtime (`nub run --filter @gpuixui/primitives test:runtime runtime/info-tip.runtime.test.tsx`):

7. **focus reaches the public state on the pinned release build** — mount an
   `InfoTip` whose `style` callback paints `opacity: focused ? 0.5 : 1`; `Tab`
   to the trigger; assert the painted opacity is `0.5`, then leave and assert it
   returns to `1`. This proves the tracked focus (plans `583`, `590`) drives the
   public state, not only the internal ring.
8. **a caller's margin moves the painted mark** — mount an un-styled and a
   `style={{ marginLeft: 12 }}` `InfoTip` side by side; the second trigger's
   painted left edge is `12` px further right, and its a11y name is unchanged.

Both directions (plan `047` §6's rule):

- **old direction A:** remove the `{ focused }` state argument (pass a literal
  `false`) → case 1's focused rendering and case 7 fail (measured: 2 offline
  cases, and the runtime case times out waiting for `0.5`).
- **old direction B:** merge the caller's style **before** the ring → the
  merge-order case fails because `boxShadow` stays `focusRing` (measured).
- **old direction C:** drop `style` from the renderer → the new cases do not
  compile (and the old `InfoTip.test` still passes, which is why the guard
  matters).

## 5. Commands and expected results

```sh
# 1. types
nub run --filter @gpuixui/primitives check-types
# expected: exit 0, no output

# 2. offline suite
nub run --filter @gpuixui/primitives test
# expected: 63 files, 890 tests before; the same 63 files, more tests, all pass

# 3. the scoped native file (opens a real window)
nub run --filter @gpuixui/primitives test:runtime runtime/info-tip.runtime.test.tsx
# expected: 1 file, 10 tests (8 existing + 2 new), all pass

# 4. the gates
nub run check && nub run lint
# expected: both exit 0

# 5. the whole repo's tests
nub run test
# expected: exit 0
```

The full runtime suite is **not** run for this change: the edit is confined to
one component's prop and two test files, and the release gate runs it before a
merge (AGENTS.md §3).

## 6. STOP conditions

- **STOP** if `renderInfoTip`'s caller style cannot reach the trigger without
  cloning: it must land on the trigger the component already renders; a
  `Box` wrapper is not the fix.
- **STOP** if the contract suite requires a page section the new `style` row
  cannot satisfy without inventing a second convention.
- **STOP** if the runtime case paints no opacity change after `Tab` *and* the
  focused-ring case already passes: that would mean the `FocusState` passed to
  the renderer and the tracker disagree, which is a different defect; record it
  instead of re-baselining the assertion.
- **STOP** if a `style` callback can change the trigger's role or name; the
  merge must stay on `style` only.

## 7. Acceptance criteria

- `InfoTip` takes `style?: StateStyle<InfoTipState>`, exports `InfoTipState`,
  and merges the caller's contribution last on the trigger.
- The four new offline cases, the two `style-order` cases and the two runtime
  cases pass, and each named mutation above fails in the old direction.
- `info-tip.mdx` has the `style` API row and a `## Style by state` section; it
  names `InfoTipState`; the README lists it; `contract.test.ts` records it.
- `check-types`, `check`, `lint` and the offline suite are green.
- `TODO.md`, `COMPONENTS.md` and the plan index record the work.

## 8. Result (measured on this host, 2026-10-20)

- `check-types`: exit `0`.
- Offline: **63 files / 896 tests** (was 63 / 890), all passing. The six new
  cases: one `InfoTip` state-style case, three `InfoTip.test` cases (caller
  style on the trigger; the callback's two states and its win; the ring in the
  base vs a caller's `boxShadow`), and the two `it.each` rows the 30-entry
  `style-order` guard now runs for `InfoTip`.
- Scoped native (`runtime/info-tip.runtime.test.tsx`): **10/10** in 1 file
  (3.3 s). The two new cases prove the tracker's focus reaches the callback's
  paint (`opacity 1 → 0.5 → 1`, focused by `focusNext` and left for a `Button`)
  and that `style={{ marginLeft: 12 }}` moves the painted trigger exactly 12 px
  while the `Image` node keeps its name.
- Old directions measured: passing a literal `{ focused: false }` to the state
  resolver failed 2 offline cases and the runtime opacity case (timed out
  waiting for `0.5`); merging the caller's style before the ring failed the
  merge-order case (`boxShadow` stayed `Some(focusRing)`), and restoring the
  code brought all three green.
- `nub run check` and `nub run lint`: exit `0`.
