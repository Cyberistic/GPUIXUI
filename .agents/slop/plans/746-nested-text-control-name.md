# 746 — A control's name must come from the text it paints, nested or not

| Field | Value |
| ----- | ----- |
| Phase | F — the accessible-name class (plans `058`, `093`, `573`, `589`, `743`) |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Buttons/Toggle/Checkboxes/Switches rows in `COMPONENTS.md`, `docs/gpuix-capabilities.md`, `TODO.md`, the plan index) |
| Depends on | `058` (the text-child name rule), `093` (name matrix), `573`/`743`/`744` (non-text content), `589` (option text fallback), `740` (labelled selection rows) |
| Status | **done** — the name rule now walks text leaves inside element children, so a mixed or nested visible label names the control it paints; an element with no text still invents nothing. 5 element assertions + 2 element cases + 6 scoped runtime cases, all three directions measured |

## 0. Why

Plan `058` fixed the first half of this class: GPUix does not derive a control's
accessible name from painted text, so `Button`/`Toggle`/`Checkbox`/`Switch`
write their own `aria-label` from their children. The rule it shipped
(`textOf` in `src/components/internal.ts`) requires **every** child to be a raw
string or number:

```ts
const textOnly = Arr.every(parts, (part) => P.isString(part) || P.isNumber(part));
if (!textOnly || Arr.isReadonlyArrayEmpty(parts)) return Option.none();
```

That rejects the two most natural rich labels, even though the component paints
their text. Measured on this host (2026-10-20, 1280 × 800, release-tag binding),
`painted` is the frame's own text and `name` is the AccessKit label:

| Rendered | Painted | AccessKit name |
| -------- | ------- | -------------- |
| `<Button>Save</Button>` | `Save` | `Save` |
| `<Button><Icon name="plus"/> Add</Button>` | ` Add` | **none** |
| `<Button><Text>Nested</Text></Button>` | `Nested` | **none** |
| `<Toggle><Icon name="grid"/> Grid</Toggle>` | ` Grid` | **none** |
| `<Checkbox><Text>Accept</Text></Checkbox>` | `Accept` | **none** |
| `<Switch><Text>Pause</Text></Switch>` | `Pause` | **none** |

So an icon beside a word, or a `Text` child used to control the run's
typography, produces a **focusable control with no name** — the exact class
plans `093` (`TextArea`, `NumberField`, `Switch` were unnamed), `573`
(`InfoTip`), `589` (data options) and `743` (a blank label) each closed for
their own surface. The docs inherit the false claim: the Button page says "a
text-only child becomes the name", which reads as "wrap your label in `Text` and
the name follows" — it does not.

The rule that is actually true and useful: **a control's name is the text it
paints.** A string child contributes its text; an element child contributes the
text inside it; an element with no text contributes nothing. An icon-only button
stays unnamed (plan `058`'s real rule — the library must not invent a name from
an image), and an explicit `label` still wins.

## 1. The contract

1. `textOf` walks the children recursively and returns the **text leaves** —
   strings and numbers inside strings, elements and fragments — in paint order.
2. Each leaf is trimmed; blank leaves are dropped; the remaining leaves are
   joined with one space. A single string child behaves exactly as before
   (`"Save changes"` → `"Save changes"`, `"  Save  "` → `"Save"`).
3. An element child with no text leaves (`<Icon/>`, `<div/>`, an empty `<Text/>`)
   contributes nothing, so an icon-only control is still unnamed unless `label`
   is supplied.
4. An explicit `label` wins when it says something; a blank `label` falls back
   to the text (the `controlName`/`usableLabel` rule, plans `396`).
5. `paintsContent` (row gating for `Checkbox`/`Switch`) is unchanged: any element
   still paints content. This plan only changes the **name**, not whether a row
   exists. An icon-only labelled row therefore stays unnamed, exactly like an
   icon-only button; pass `label`.
6. The name must not read an element's own `aria-label`/`label` prop (an
   `<Icon label="Add"/>` names the icon, not its parent), nor a `Text` mark seam
   (`Text.label` is an image name, not text).

## 2. Files to change

### 2.1 `packages/primitives/src/components/internal.ts`

Replace `textOf` with a recursive collector. Import `isValidElement` from
`react` (add it to the existing import list — do not import React's default).

```ts
/**
 * The text leaves of a child list, in paint order.
 *
 * A control paints its children, so its name is the text inside them: a string
 * or number is a leaf, an element contributes its own children, and an element
 * with no text contributes nothing. This is why an icon beside a word names the
 * control and a bare icon does not (plans 058, 746).
 */
const textLeaves = (children: ReactNode): ReadonlyArray<string> =>
  Arr.flatMap(Children.toArray(children), (part) =>
    isValidElement<{ children?: ReactNode }>(part)
      ? textLeaves(part.props.children)
      : P.isString(part) || P.isNumber(part)
        ? [`${part}`]
        : [],
  );

/**
 * The accessible name a child list gives a control.
 *
 * GPUix does not derive a button's name from painted text (measured: plan `058`
 * §0), so `Button`/`Toggle`/`Checkbox`/`Switch` must carry the name themselves.
 * The honest source is the text they paint, whatever element wraps it; an
 * element with no text (an icon) returns `None`, so the library invents
 * nothing and the caller keeps `label`.
 */
export const textOf = (children: ReactNode): Option.Option<string> =>
  pipe(
    Arr.map(textLeaves(children), Str.trim),
    Arr.filter(Str.isNonEmpty),
    Arr.join(" "),
    (name) => (Str.isEmpty(name) ? Option.none() : Option.some(name)),
  );
```

`Children.toArray` already flattens fragments and arrays, so the recursion only
has to unwrap elements. `Arr.filter`/`Arr.join` are Effect's, matching the
module's style.

Update `controlName`'s doc line "The fallback is the rule `Button`/`Toggle`
already document" to name all four controls and the nested-text rule.

### 2.2 `packages/primitives/src/components/Button.test.tsx`

Extend the existing `names itself from text children, and refuses to guess at
non-text` case (do not add a file):

- `<Icon name="plus" size="sm"/>` + `" Add"` → `"Add"`;
- `<Text>Nested</Text>` → `"Nested"`;
- `<Text>Save</Text>` + `" changes"` → `"Save changes"`;
- `<div/>` → `none` (existing);
- `<Icon/>` alone → `none` (a new assertion, the "invents nothing" half).

The file already imports `renderButton`; import `Icon` from `@gpuixui/icons` and
`Text` from `./Text.js`.

### 2.3 `packages/primitives/src/components/selection.test.tsx`

In the Checkbox and Switch name cases (search for `"does not paint an empty row
for a blank text child"` and the plan-`740` labelled cases), add:

- `<Checkbox><Text>Accept</Text></Checkbox>` → `aria-label` `"Accept"`;
- `<Switch><Text>Pause</Text></Switch>` → `aria-label` `"Pause"`;
- `<Checkbox><Icon name="star" size="sm"/></Checkbox>` → no `aria-label`
  (the icon-only control is still unnamed and still asks for `label`);
- an explicit `label` beside a nested `Text` still wins.

### 2.4 `packages/primitives/runtime/name.runtime.test.tsx`

Add one `it` beside the existing matrices (the file is the package's
accessible-name guard; this keeps the runtime file count true):

> `"names a control from the text inside its children"`

Mount, in one window, a frame like:

```tsx
<Button testId="mixed"><Icon name="plus" size="sm" /> Add</Button>
<Button testId="nested"><Text>Nested</Text></Button>
<Toggle testId="toggle"><Icon name="grid" size="sm" /> Grid</Toggle>
<Checkbox testId="check"><Text>Accept</Text></Checkbox>
<Switch testId="switch"><Text>Pause</Text></Switch>
<Button testId="icon-only"><Icon name="plus" size="sm" /></Button>
```

Assert from `runtime.a11y()`:

| testId | role | label |
| ------ | ---- | ----- |
| `mixed` | `Button` | `Add` |
| `nested` | `Button` | `Nested` |
| `toggle` | `Button` | `Grid` |
| `check` | `CheckBox` | `Accept` |
| `switch` | `Switch` | `Pause` |
| `icon-only` | `Button` | no `label` |

Use the file's existing `a11yNodes`/label helper shape, not a new one. Also click
the labelled checkbox row once and assert `onValueChange(true)` — the row is
already the hit area (plan `740`); this only proves the name change did not move
it.

### 2.5 Docs (in-package) and the inventory

| File | Change |
| ---- | ------ |
| `packages/primitives/docs/button.mdx` | The naming paragraph: a text child names the button, **including text nested in an element** (an icon plus a word, or a `Text` run); an icon-only child is unnamed, so pass `label`. |
| `packages/primitives/docs/toggle.mdx` | Same sentence, scoped to `Toggle`. |
| `packages/primitives/docs/checkbox.mdx` | Same for the visible-label row; name the icon-only exception. |
| `packages/primitives/docs/switch.mdx` | Same for the visible-label row. |
| `packages/primitives/README.md` | The `aria-labelledby` row: "written from its `label` prop **or the text it paints, nested text included**". |
| `docs/gpuix-capabilities.md` | The "text does not name an interactive ancestor" bullet: text **children**, nested included, name a control in component code; an icon-only child does not. |
| `COMPONENTS.md` | Buttons, Toggle, Checkboxes and Switches rows: add the one-line rule and the plan number. |

Do **not** change `paintsContent`, a row's existence, `IconButton` (it requires
`label`), `docs/component-api.md` (shared contract, other workstream) or any
component outside the four.

### 2.6 `TODO.md` and the plan index

- `TODO.md` → primitives section: one `[x]` row describing the fix and the two
  directions; adjust the primitives count.
- `.agents/slop/plans/README.md` → index `746` in the `primitives, icons and
  Tier 1` table.

## 3. Commands and expected results

Run from `workspaces/primitives`:

```sh
nub run --filter @gpuixui/primitives test src/components/Button.test.tsx src/components/selection.test.tsx
# Expected: 2 files passed. The new assertions fail before the fix ("Add",
# "Nested", "Accept", "Pause" report None) and pass after.

nub run --filter @gpuixui/primitives test:runtime runtime/name.runtime.test.tsx
# Expected: 1 file passed, all cases green. Before the fix the new case fails
# with five "(unnamed)" labels and the icon-only control passing.

nub run --filter @gpuixui/primitives test
# Expected: the same 70 files, all green (no test file added).

nub run check
nub run lint
nub run test
```

The scoped live file is the only runtime run while iterating. The full live
suite is the merge gate and is not run for this fix.

## 4. Test plan and the two directions

The bug being guarded: **a control whose visible label is nested in an element
publishes no accessible name.** Both directions must be measured:

1. **Fails without the fix.** Revert `textOf` to the old `textOnly` rule and run
   §3 commands 1 and 2: the new Button/Checkbox/Switch assertions report
   `Option.none()` and the runtime case reports five unnamed nodes. Record the
   exact output in §7.
2. **Passes with the fix.** Restore it; both commands green.
3. **Over-broad direction.** Make the collector return a leaf's *element name*
   or read `aria-label` — `icon-only` becomes named, and the Button unit case
   (`<div/>` → `none`) fails. Record it.

The icon-only case is the regression guard against "every child names a
control"; the mixed/nested cases are the fix.

## 5. STOP conditions

Stop and report rather than improvise if:

- `Children.toArray` does **not** flatten a fragment on this React version (a
  fragment child would recurse as an element; that is fine, but a test that
  renders a fragment must confirm it). Do not add a second flattener.
- A runtime `role` in §2.4 differs from the table (`CheckBox` vs `Checkbox`):
  use the measured role the existing `name.runtime.test.tsx` already records and
  update the plan's table rather than changing a component.
- Any **existing** name test changes behaviour. The rule must be strictly
  additive: direct strings, blank strings, `<div/>`-only and labelled controls
  behave exactly as they do today. If one moves, stop and re-read plan `058`.
- A nested `Text` inside a `Text` host paints nothing on this runtime. The probe
  above painted `Accept`/`Nested`/`Pause`, so this would mean a different
  composition than the one measured; stop before designing around it.

## 6. Acceptance

- A Button, Toggle, Checkbox and Switch with a mixed/nested visible label
  publishes that text as its AccessKit name in the real runtime.
- An icon-only child still publishes no name, and an explicit `label` still
  wins; direct string children are unchanged.
- The four pages, the package README, the capability table and the inventory
  state the rule; no page claims "text-only children" any more.
- `nub run check`, `nub run lint` and `nub run test` are green.
- `TODO.md` carries the ticked row and the plan index links this file.

## 7. Outcome

Implemented 2026-10-20.

- `textOf` now collects text leaves recursively (`isValidElement` unwrap), trims
  each run, drops blanks and joins with one space. `paintsContent`, the row
  gating, `controlName`'s precedence and every component but the four name
  readers are unchanged.
- Offline: `Button.test.tsx` gained five assertions (mixed, nested, two runs,
  icon-only, an icon's own label not leaking) and `selection.test.tsx` gained
  two cases (the nested `Checkbox`/`Switch` names with the icon-only negative,
  and explicit-label precedence). The two files are 90 tests; the package is 70
  files / **961** tests.
- Runtime: `runtime/name.runtime.test.tsx` gained one six-control case
  (`mixed`, `nested`, `toggle`, `check`, `switch`, `icon-only`) plus the row
  click. Measured before the fix: the five labelled controls reported no
  `label`; after: `Add`, `Nested`, `Grid`, `Accept`, `Pause`, and `icon-only`
  still none. The file is **34/34**.
- Docs: `button.mdx`, `toggle.mdx`, `checkbox.mdx`, `switch.mdx`, the package
  README, `docs/gpuix-capabilities.md` §4 and the four `COMPONENTS.md` rows now
  say "the text it paints, nested text included; an icon-only child is
  unnamed".
- Commands: `nub run --filter @gpuixui/primitives test` → **70 files, 961
  tests**; scoped runtime `runtime/name.runtime.test.tsx` → **34/34**;
  `nub run check-types`, `nub run lint` and `nub run test` green. The root
  `nub run fmt` still reports the pre-existing, out-of-paths
  `apps/docs/src/components/docs/demos.tsx` (recorded in `TODO.md`); every file
  this plan touched is formatted.
- Directions measured: reverting `textOf` to the plan-`058` rule failed 3
  offline tests (`Button` naming, both new selection cases) and the new runtime
  case by name. Reading a child element's own `label` instead of its text leaves
  failed the icon-only negative in both the unit and runtime case. Both restored
  green.
