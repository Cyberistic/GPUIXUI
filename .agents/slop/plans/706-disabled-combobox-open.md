# 706 — A disabled combobox is inert, even when it is open

**Owner:** components workstream · **Phase:** F (interaction consistency) ·
**Depends on:** 110, 112, 116, 138, 302, 323, 340, 388, 394, 398, 516, 523,
527, 541, 565, 583, 602, 612, 666, 672, 680, 696

**Numbering:** `704` is this branch's highest and `705` is claimed by the
tokens-theme worktree (`705-caret-fill-figures.md`), so `706` is the first free
number checked across every worktree on 2026-10-20. Recorded in `PLAN.md` D30.

## 1. What is measured today

`Combobox` passes `disabled` to GPUix's headless root and to the trigger, but it
passes the **raw** open state to the popup, the search field and the context:

- `src/combobox.tsx:403-410` pushes a dismiss layer whenever `open` is true.
- `src/combobox.tsx:314-317` reports `onQueryChange("")` whenever `open` flips
  true, so a `defaultOpen` popup reports its opening query even while disabled.
- `src/combobox.tsx:451-516` passes `open={open}` to `HeadlessCombobox`.
- `src/combobox.tsx:418` exposes the same `open` to every part.
- GPUix's `ComboboxContent` returns `null` only when **its** context `open` is
  false (`@gpuix/react/dist/components/combobox.js`), and its
  `ComboboxInput` hard-codes `autoFocus: context.open`. So while the root is
  disabled and open, the popup is painted **and** its input takes native focus.
- The headless trigger already drops to `tabIndex -1` when disabled, and its
  `selectItem` refuses a disabled root; the leak is the popup, not selection.

Measured on 2026-10-20 with a temporary probe
(`src/behaviour/scratch-disabled-combobox.test.tsx`, deleted by this plan) on
`<Combobox options disabled defaultOpen>`:

```text
content true  input true  input tabIndex undefined  focused Some("combobox-input")
onValueChange calls []
after focusNext Some("combobox-input")
```

The popup paints, the search field is focused on mount, and `focusNext()` from
the button before the combobox lands on `combobox-input`. Selection is already
refused by GPUix, and Escape closes the popup, so this is specifically an
**open + focus + tab-order** defect.

The repository already treats a disabled surface as inert: plan 394 removed
hover, press, ring and tab stop from disabled controls; plan 612 made an open,
disabled date picker stay painted but take no focus and leave the tab order. A
combobox cannot use that shape as-is, because the runtime hard-codes
`autoFocus: context.open` on the field and gives the part no way to opt out
while the popup is painted. The honest fix is therefore to hide the popup while
disabled, not to paint a surface with a focused, tabbable field inside it.

## 2. The decision

**`disabled` wins over `open` for everything the user can see or focus.** Derive
one value in the root:

```ts
const visibleOpen = open && !disabled;
```

Everything the popup and its parts observe — the dismiss layer, the query
report, focus restoration, the context `open`, and the headless root's `open` —
uses `visibleOpen`. The controlled `open` prop is still authoritative for the
caller's state: disabling does **not** call `onOpenChange(false)` and does not
rewrite the caller's `open`. When the control is re-enabled, an `open` that the
caller never withdrew paints the popup again.

Because the search session is hidden while disabled, disabling also drops a
pending debounced query and clears the field, exactly like an accepted close
does. Re-enabling therefore reports the opening query once and shows the full
list, instead of showing stale filtered rows while reporting `""`.

## 3. Exact changes

### 3.1 `packages/components/src/combobox.tsx`

In `Combobox`, immediately after the controlled `open` state:

```ts
// A disabled combobox paints no popup and takes no focus, but the caller's
// open state is theirs: disabling never asks them to close. Hiding the surface
// is what makes the runtime's hard-coded `autoFocus: context.open` unreachable.
const visibleOpen = open && !disabled;
```

Then replace the raw `open` in these five places (and nowhere else):

1. **Opening query report** (`:314-317`):
   ```ts
   if (visibleOpen && !reportedOpen.current) reportQuery("", true);
   reportedOpen.current = visibleOpen;
   ```
   Dependencies become `[visibleOpen, reportQuery]`.

2. **Focus restoration** (`:379-386`): use `visibleOpen` for the transition and
   the reset:
   ```ts
   if (wasOpen.current && !visibleOpen && restoreFocus.current) { ... }
   if (!visibleOpen) restoreFocus.current = false;
   wasOpen.current = visibleOpen;
   ```
   Dependencies become `[visibleOpen, renderer]`.

3. **Dismiss layer** (`:403-410`): `if (!visibleOpen) return;` and the effect
   dependency becomes `[visibleOpen]`.

4. **Context** (`:418`): `open: visibleOpen`.

5. **Headless root** (`:490`): `open={visibleOpen}`. Keep `onOpenChange` as-is:
   a request from a visible popup still reaches the caller.

Also add, beside the close path, a disable effect:

```ts
// A disable ends the visible search session: no pending report for text the
// user can no longer see, and no stale filter when the popup is shown again.
useLayoutEffect(() => {
  if (!disabled) return;
  cancelPendingQuery();
  setQuery("");
}, [disabled, cancelPendingQuery]);
```

Do **not** call `noteQueryChange`/`reportQuery` from this effect: it is not a
user query change.

Every other `open` read in the file stays: the caller's state is still the
source (`onInputValueChange` should keep writing the query only while
`visibleOpen`; the headless input is unmounted while hidden anyway, so change
it for consistency), and the trigger's `aria-expanded` now reflects the painted
state through the context.

### 3.2 `packages/components/src/behaviour/combobox.test.tsx` (write first)

Extend the `Picker` fixture with `readonly disabled?: boolean` and pass
`disabled={disabled}` to `Combobox`. Add four cases, each stating the defect in
its name/comment:

1. **paints nothing, reports nothing and takes no focus while disabled and open**
   — `<Picker disabled defaultOpen onQueryChange>`: `combobox-content` and
   `combobox-input` are `undefined`; `onQueryChange` was never called;
   `focusedTestId` is not `Some("combobox-input")`.
2. **keeps a controlled open popup hidden and reports no close** —
   `<Picker disabled open onOpenChange>`: content `undefined`, and
   `onOpenChange` never called (the caller's `open` was not withdrawn).
3. **a disabled combobox never joins the tab order** — a `before-picker`
   `Button` before `<Picker disabled defaultOpen>`; focus the button,
   `focusNext()`, and assert focus is still the button.
4. **disabling hides an open popup, and re-enabling repaints it with a fresh
   query** — uncontrolled `defaultOpen` with `onQueryChange`; type `"ca"` so the
   list is filtered; rerender `disabled`; content `undefined` and focus not the
   field; rerender enabled; content defined, every option visible again, and
   `onQueryChange` was called twice, each time with `""`.

Use `settle()` after every render that can run effects, and `finishMotion` only
where an exit animation is involved (the popup itself has none).

### 3.3 Docs, inventory and counts

- `packages/components/docs/combobox.mdx` — Verification `(55 tests)` → `(59
  tests)` and one sentence in `## Open state`: a disabled combobox paints no
  popup, reports no opening query and takes no focus, even when it is open or
  `defaultOpen`; disabling does not ask the caller to close, and re-enabling
  paints the popup again with a fresh empty query (plan 706).
- `COMPONENTS.md` — the Comboboxes row: `55 native behaviour tests` → `59`, plus
  the disabled-open clause in the open-state sentence.
- `TODO.md` — one ticked Tier 2 hardening entry naming the defect.
- `.agents/slop/plans/README.md` — index this plan under the components table.
- `PLAN.md` D30 — record `706` and the numbering check.
- `packages/components/src/inventory.ts` — no change: the record carries no test
  count and the docs verification line is the count's home.

## 4. Test plan

- **Can the tests fail?** Yes: all four new cases must be run at `HEAD` first.
  Cases 1 and 3 fail because the content and input are painted and the input
  receives focus; case 2 fails because the content is painted; case 4 fails at
  the first disable rerender (content still defined). Record the exact failures.
  A case that passes at `HEAD` is measuring the wrong thing — stop and report.
- **Both-direction proof:** after the fix, revert `visibleOpen` to `open` in one
  place at a time — the dismiss layer/context pair, then the query report — and
  confirm the cases that name that behaviour fail; restore.
- **No regression:** the suite's existing 55 cases stay green, including
  `defaultOpen`'s one opening report, the controlled close contract (a refused
  close stays painted, an accepted close focuses the trigger), Escape, outside
  presses, held trigger presses, grouping, create, debounce and scroll.
- **Binding pins:** the known plan-540 failures in the full suite are unchanged.
  This plan adds no position or focus-event assertion; the focus assertion uses
  `focusedTestId`, which the binding reports.

## 5. Commands and expected results

From `packages/components`:

```sh
# first, at HEAD, with the four cases written
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/combobox.test.tsx --disableConsoleIntercept --reporter=verbose
# before: 4 new cases fail for the reasons in §3.2; the file's pre-existing
# plan-540 reds are the only other failures
# after: 59 passed

nub run check-types
nub run check        # docs verification count (59) and inventory rows hold
nub run lint
nub run test         # unit suite, no native binding needed
```

Then the end-of-task native run from the repo root or the package:

```sh
nub run --filter @gpuixui/components test:behaviour
# 866 passed / 31 failed of 897 (the same plan-540 failures, +4 over 893)
```

The exact totals must be read from the run, not copied from this plan.

## 6. STOP conditions

- `visibleOpen` cannot gate the headless root without changing the controlled
  contract (for example the popup stays painted): stop and report; do not edit
  files in `node_modules`.
- A disabled combobox still focuses its input with `visibleOpen` in place:
  stop and record which surface focused it; do not add a second focus workaround
  before the cause is known.
- A new case passes at `HEAD`: stop and report the measured tree — the test is
  not pressing the path under test.
- Disabling while open reports `onOpenChange(false)` or loses the caller's
  `open`: stop; the plan must not invent a close request.
- An existing accepted-close or `defaultOpen` case changes result: stop; this
  plan changes only the disabled path.

## 7. Acceptance

- `<Combobox disabled defaultOpen>` and `<Combobox disabled open>` paint no
  popup, take no focus, expose no popup search field to the tab order, and
  report no opening query.
- Disabling an open combobox hides it without a close request; re-enabling
  paints it again with an empty query and reports `""` once.
- Four new native cases fail at `HEAD` and pass after; docs, `COMPONENTS.md`,
  `TODO.md`, the plan index and `PLAN.md` D30 agree with the code and the new
  count (Combobox 59).
