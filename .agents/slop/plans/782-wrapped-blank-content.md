# 782 — A `Text` run that says nothing is not content

| Field | Value |
| ----- | ----- |
| Phase | F — the blank-content rule reaches the wrappers |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Checkboxes, Switches and Tooltips rows in `COMPONENTS.md`) |
| Depends on | `026` (blank label), `041` (runtime suite), `093` (name matrix), `573` (blank string tip), `743` (blank text child), `744` (absent node tip), `746` (nested text names a control), `748` (labelled row description) |
| Status | done — 3 offline + 2 scoped runtime cases, both directions measured (§5) |

## 0. The defect, in one sentence

The rule "blank text is absent" stops at a raw string: `paintsContent` treats
**any element** as content, so a computed label wrapped for typography —
`<Checkbox><Text>{label}</Text></Checkbox>`, `<Switch><Text>{label}</Text></Switch>`,
`<Tooltip content={<Text>{hint}</Text>}>` — paints an empty labelled row or
opens an empty anchored layer when `label`/`hint` trims to nothing, although the
components document that "a blank text child is not a visible label" and that a
tip which paints nothing is no tip.

## 1. Measured evidence (2026-10-20, offline element tree)

A throwaway probe (deleted after measuring) rendered the three surfaces with a
blank `Text` child and printed the decoded tree. The probe's own assertions
failed with these values:

```
renderCheckbox({ children: <Text>{""}</Text> })      → { children: 2, label: undefined }
renderSwitch({ children: <Text>{"   "}</Text> })     → { children: 2, label: undefined }
renderTooltip({ content: <Text>{"   "}</Text>, … })  → { fragment: false, children: 2 }
renderTooltip({ content: <Box><Text>{""}</Text></Box>, … })
                                                     → { fragment: false, children: 2 }
```

A bare `Checkbox` is a host with **0** children; a labelled row is **2** (box +
label). A bare `Switch` is **1** (track); a labelled row is **2**. A tip that
paints nothing is the caller's child alone (`<Fragment>` with one child), not a
two-child wrapper. So every line above paints the thing the docs say it does
not, and `label: undefined` on both controls is the unnamed focus stop the
blank-label plans (`073`, `396`, `573`, `743`) exist to prevent.

Why the existing guards miss it:

- `selection.test.tsx`'s blank-child cases pass a **raw** string (`"   "`), so
  they never reach the element branch of `paintsContent`;
- `selection.test.tsx`'s nested-label case (`746`) passes a `Text` with **real**
  text, so it only proves the yes-direction;
- `Tooltip.test.tsx` covers `null`, `undefined`, `false`, `true`, `"   "` and
  `[]` — every falsy/empty shape **except** an element whose own children are
  blank, which is the shape a computed label actually takes.

## 2. The contract

1. A `Text` run paints exactly its children, so the probe looks **through** it:
   `<Text>{""}</Text>`, `<Text>{"   "}</Text>` and `<Text>{undefined}</Text>`
   paint nothing.
2. A `Fragment` is transparent for the same reason: an empty fragment paints
   nothing; a fragment's children are probed.
3. Any other element is content, because the component cannot know what its
   chrome paints — this keeps the documented shapes: an `Icon` child still makes
   a labelled row (plan `743` §3), and a rich tip (`<Spinner/>`, a `Surface`)
   still opens.
4. A blank wrapped label therefore leaves the bare control, named by `label`
   when it is supplied — the plan `743` shape, one wrapper later.
5. A blank wrapped tip is no tip: the caller's child renders unchanged with no
   description and no layer — the plan `744` shape, one wrapper later.
6. No public prop, role, name or key contract changes.

## 3. Files to change (exact)

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/content.ts` | **new.** `paintsContent`, moved here from `internal.ts`, plus the `Text`/`Fragment` transparency rule and the docstring that states it |
| `packages/primitives/src/components/internal.ts` | delete `paintsContent` and its now-unused imports (`Children`, `isValidElement`, `Str` if nothing else uses them — verify before deleting) |
| `packages/primitives/src/components/Checkbox.tsx` | import `paintsContent` from `./content.js` |
| `packages/primitives/src/components/Switch.tsx` | same |
| `packages/primitives/src/components/Tooltip.tsx` | same, and its docstring's "an element always counts" sentence becomes "a `Text` run or a fragment is looked through" |
| `packages/primitives/src/components/selection.test.tsx` | one Checkbox case and one Switch case for a wrapped blank label, the `label`-names-the-bare-box half, the real-wrapped-label pass direction, and an `Icon`-child guard (a row still exists) |
| `packages/primitives/src/components/Tooltip.test.tsx` | wrapped-blank (`<Text>`) tip renders the child alone; a real `<Text>` tip still opens; a `<div>` wrapper is still content (the over-broad guard); update the header comment |
| `packages/primitives/runtime/labelled-selection.runtime.test.tsx` | wrapped-blank Checkbox (`childCount` 0) and Switch (1), named by `label`; a real wrapped label still makes the row and toggles |
| `packages/primitives/runtime/overlay-trigger.runtime.test.tsx` | a `Tooltip` around a `Button` whose content is `<Text>{"   "}</Text>` paints no tip, publishes no description, and leaves the trigger intact |
| `packages/primitives/docs/checkbox.mdx`, `docs/switch.mdx` | the children/`label` rows say a blank wrapped run is not a label |
| `packages/primitives/docs/tooltip.mdx` | the content gate says a `Text` run is looked through, any other element counts |
| `COMPONENTS.md` | one `**Wrapped blank (782):**` clause on the Checkboxes, Switches and Tooltips rows |
| `TODO.md` | one ticked row under the primitives workstream |
| `.agents/slop/plans/README.md` | index row for this plan |

## 4. Implementation

### 4.1 The one rule

```ts
// components/content.ts
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import * as Arr from "effect/Array";
import * as P from "effect/Predicate";
import * as Str from "effect/String";
import { Text } from "./Text.js";

/**
 * Whether a child list paints anything.
 *
 * `Children.toArray` already drops `null`, `undefined` and booleans, so what
 * remains is text/numbers — meaningful only when they say something — or an
 * element. An element counts unless it is transparent: a `Text` run paints
 * exactly its children, and a fragment paints its children, so the probe looks
 * through both. That is what makes a blank label wrapped for typography absent
 * (plans `743`, `782`) while an icon or a rich node still counts (plans `744`,
 * `746`).
 */
export const paintsContent = (children: ReactNode): boolean =>
  Arr.some(Children.toArray(children), (part) =>
    P.isString(part) || P.isNumber(part)
      ? Str.isNonEmpty(Str.trim(`${part}`))
      : isValidElement<{ children?: ReactNode }>(part)
        ? part.type === Text || part.type === Fragment
          ? paintsContent(part.props.children)
          : true
        : false,
  );
```

`Text` is imported for identity only. The module does not import `internal.ts`,
so there is no cycle: `Text → internal`, `content → Text`, and the three
consumers import both.

### 4.2 Steps

1. Create `content.ts` with the rule above, move the docstring's reasoning from
   `internal.ts`, and delete the old helper there. Run `check-types` to find the
   imports that became unused.
2. Point `Checkbox`, `Switch` and `Tooltip` at `./content.js`; no other change
   inside them (the gates are already `paintsContent(...)`).
3. Update the Tooltip docstring sentence and the three pages.
4. Add the tests in §5, run them against the **old** rule first and record the
   failures, then land the rule.
5. Update `COMPONENTS.md`, `TODO.md` and this index.

## 5. Test plan (both directions)

**Offline — `src/components/selection.test.tsx`**

- Checkbox, new case: `<Text>{""}</Text>` → `elementChildren(tree)` length 0,
  no `aria-label`; with `label="Alerts"` → length 0 and the name `"Alerts"`;
  `<Text>Email me</Text>` → length 2 and the name `"Email me"`; an `Icon` child
  → length 2 (the over-broad guard: plan `743` §3 is preserved).
- Switch, the same four assertions against its 1-vs-2 child shape.

**Offline — `src/components/Tooltip.test.tsx`**

- `isChildAlone(<Text>{""}</Text>)` and `isChildAlone(<Text>{"   "}</Text>, "Billing cycle")` are `true`.
- `isChildAlone(<Text>Real tip</Text>)` and `isChildAlone(<div><Text>{""}</Text></div>)` are `false`
  (a real tip, and an element with chrome of its own, still count).

**Runtime — `runtime/labelled-selection.runtime.test.tsx`**

- `<Checkbox testId="c" label="Alerts"><Text>{""}</Text></Checkbox>` →
  `childCount(runtime, "c")` is 0, `announced(runtime, "Alerts")` is
  `"unchecked"`.
- `<Switch testId="s" label="Wi-Fi"><Text>{"   "}</Text></Switch>` →
  `childCount` is 1, announced `"unchecked"`.
- The pass direction: `<Checkbox><Text>Email notifications</Text></Checkbox>` →
  `childCount` 2, announced `"Email notifications"`, and a click toggles.

**Runtime — `runtime/overlay-trigger.runtime.test.tsx`**

- `<Tooltip content={<Text>{"   "}</Text>} label="Hint" testId="tip"><Button testId="target" label="Delete">…`:
  after `hover("target")`, `runtime.bounds("tip")` is `None` and the `Button`
  node's `aria.description` is `undefined`; the `Button` node still exists.

Both directions:

- **Old direction:** with the moved rule reverted to the current
  `paintsContent`, the two new selection cases fail (`expected 2 to be 0` /
  `expected 2 to be 1`), the Tooltip wrapped-blank case fails
  (`expected false to be true` / `expected 2 to be 1`), and the runtime cases
  fail with childCount 2/2 and a painted tip. The pass-direction cases and the
  `Icon`-child guard must pass in **both** directions — that is what proves the
  rule is not simply over-broad.
- **New direction:** every case above green, and the existing `743`/`744`/`746`
  cases unchanged.

## 6. Commands and expected results

```sh
# old direction (tests added, rule not yet changed)
nub run --filter @gpuixui/primitives test src/components/selection.test.tsx
# the two new cases fail (2/2 children, no name); the rest green

nub run --filter @gpuixui/primitives test src/components/Tooltip.test.tsx
# the wrapped-blank case fails; the pass directions green

nub run --filter @gpuixui/primitives test:runtime runtime/labelled-selection.runtime.test.tsx
# the two wrapped-blank cases fail (childCount 2/2); the pass case green

nub run --filter @gpuixui/primitives test:runtime runtime/overlay-trigger.runtime.test.tsx
# the new blank-tip case fails (the tip paints and the description is set)

# new direction
nub run --filter @gpuixui/primitives test
# 71 files, 0 failed (995 + the new cases)

nub run --filter @gpuixui/primitives test:runtime runtime/labelled-selection.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/overlay-trigger.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/info-tip.runtime.test.tsx
# all green (InfoTip inherits the Tooltip gate)

nub run --filter @gpuixui/primitives check-types
nub run lint
nub run check:tests
```

The full live suite is a merge/release gate and is **not** run while iterating;
the scoped files above are the proof for this change. `nub run fmt` repo-wide
still reports the recorded cross-team file
(`apps/docs/src/components/docs/demos.tsx`); only this change's files are
formatted.

Measured results (2026-10-20):

- Old direction — offline `selection.test.tsx` + `Tooltip.test.tsx`:
  `3 failed | 76 passed` (`expected [2 elements] to have a length of 0`,
  `… of 1 but got 2`, and `expected false to be true` for the wrapped blank tip).
- Old direction — `test:runtime` on `labelled-selection` + `overlay-trigger`:
  `2 failed | 34 passed` (`expected 2 to be +0` for the Checkbox row, and the
  blank tip's bounds assertion, `expected false to be true`).
- New direction — full offline suite **71 files / 998 tests, 0 failed** (995
  before). Scoped runtime on `labelled-selection`, `overlay-trigger` and
  `info-tip`: **3 files / 46 tests, 0 failed**. `check-types`,
  `nub run lint` and `nub run check:tests` are green.
- The pass-direction cases (a real `Text` label, a real `Text` tip, an icon
  child) pass in **both** directions — the proof the rule is not over-broad.

## 7. STOP conditions

Stop and report instead of improvising if:

- comparing against `Text` creates an import cycle (it must not: `Text` imports
  `internal`, not `content`) or the `Text` identity differs between the ESM and
  test builds (then report and use the marker approach instead of guessing);
- the `Icon` child stops making a row, or a rich tip (`<Spinner/>`, `<Surface/>`)
  stops opening — the rule has become over-broad;
- an existing `743`/`744`/`746` case fails for a reason other than a shape that
  the new rule legitimately changes (do not re-baseline an assertion);
- a runtime locator or helper is missing (use the documented `testId`s and
  record the gap rather than inventing one).

## 8. Acceptance criteria

- A blank `Text`/fragment child paints no labelled row on `Checkbox` or
  `Switch`; a real wrapped label still does, and an element with its own chrome
  still counts.
- A blank `Text`/fragment tip opens nothing, publishes no description and
  leaves the trigger intact; a real tip still opens.
- One owner for the rule (`components/content.ts`), no second copy.
- The pages and the inventory record the rule; `TODO.md`, this plan and the
  index are current; `check-types`, `lint`, `check:tests` and the offline suite
  are green.
