# 600 — A multiple `ToggleGroup`'s tab stop ignores a click on the pinned runtime

**Phase:** F (verification truth) — **implementation**
**Depends on:** `056`, `089`, `354`, `359`, `583`, `590`
**Owns:** `packages/primitives` (`ToggleGroup`, its runtime suite and page),
`COMPONENTS.md`, `README.md`, `.agents/slop/plans/README.md`, `TODO.md`. No
other workstream's paths.

## 1. The evidence

`ToggleGroup` documents one tab stop: the selected item in `single` mode, the
item that **last held focus** in `multiple` (source docstring, `docs/toggle-group.mdx`
§ Keyboard). The multiple-mode index is React state (`multipleIndex`) written by
`markFocused`, which today runs from the item's `onFocus` handler and from the
group's own arrow path.

The pinned 0.10.0 release build dispatches **no `onFocus`/`onBlur`** (plan
`583`, measured again in `docs/gpuix-capabilities.md#focus-events`). A real click
therefore moves native focus without telling `ToggleGroup`, and the tab stop
never leaves its initial value.

Measured 2026-10-19 in the real `TestRenderer` (1280 × 800, the store's
release-tag build), with `Stack` = `Button before`, a multiple `ToggleGroup`
(`format`: Bold/Italic/Underline), `Button after`:

| Step | Native focus | Group tab stop index |
| --- | --- | --- |
| mount | — | `0` (`tg-bold`, the first enabled item) |
| click `tg-underline` | `tg-underline` (measured) | `0` — **stale** |
| click `before`, then `focusNext()` | `tg-bold` | `0` |

So a keyboard user who clicked a formatting item and later Tab returns to the
group enters at the **first** item, not the one they used. The failure is
observable without any internal state: `runtime.focused()` after `focusNext()`
is `tg-bold`, where the documented contract says `tg-underline`.

`single` mode is unaffected: its tab stop derives from the value, the click
changes the value, and the value is the stop.

## 2. The rule

**A press that the group accepts also records the item as the keyboard's return
point.** The item is already the one that holds native focus after the click
(measured), so the group writes the fact it cannot hear as an event.

In `renderToggleGroup`'s item `onClick`:

```tsx
onClick={() => {
  if (disabled) return;
  focus.onFocus(index);        // pointer focus, recorded where no focus event runs
  handlers.onPress(option.value);
}}
```

- `focus.onFocus` is the same state transition the `onFocus` handler runs
  (`markFocused`), so `single` keeps its ring behaviour and `multiple` updates
  `multipleIndex`.
- A disabled item never records focus: its click is already refused, and a
  disabled option must never be the tab stop (plan `056`/`089`).
- The arrow path is unchanged (it already calls `markFocused` through
  `onFocusMove`, plan `359`).
- No state is derived from the native-focus tracker: the tracker only paints
  the ring, and a tab stop is a durable "where the keyboard was", not a sample.
  Programmatic `renderer.focusElement` is not a user path and is out of scope.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/components/ToggleGroup.tsx` | record `focus.onFocus(index)` in the accepted item click, with the measured reason |
| `packages/primitives/runtime/toggle-group.runtime.test.tsx` | one case: multiple group, click the third item, leave the group, `focusNext()` lands on it; plus a disabled click leaves the first enabled item as the stop |
| `packages/primitives/docs/toggle-group.mdx` | § Keyboard and the release-runtime note: a click moves the tab stop, and why it is recorded directly |
| `packages/primitives/README.md` | the release-runtime paragraph names the tab-stop rule |
| `COMPONENTS.md` | Toggle Group row records plan `600` |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/600-toggle-group-tab-stop-after-click.md` | this file |
| `TODO.md` | one ticked row under the primitives workstream |

## 4. Test plan

**Runtime — `runtime/toggle-group.runtime.test.tsx`.**

1. *A click moves the multiple tab stop* (`moves the multiple tab stop to an
   item that was clicked`). Mount `Button before` + a multiple `ToggleGroup`
   (`format`) + `Button after`. Click `tg-underline` (native focus lands there
   and the item presses), `settleFocus()`, click `before`, `focusNext()` →
   `runtime.focused()` is `tg-underline`. Then `focusNext()` → `after` (one
   stop, not three).
2. *A disabled item never becomes the stop* (`keeps a disabled item out of the
   multiple tab stop`). Same layout with
   `options={[bold, {...italic, disabled: true}, underline]}`; click the
   disabled `tg-italic`; leave and Tab back → `tg-bold` (the first enabled
   item), and the value set is unchanged.

**Both directions.**

- Revert the `focus.onFocus(index)` line: case 1 fails with `tg-bold`
  (measured before the fix).
- Case 2 pins the *contract* (a disabled item is never the stop), not this one
  line: moving the record above the `disabled` guard still passes, because
  `initialActiveIndex` already refuses a disabled value (plan `056`). It fails
  if that filter is lost, which is the regression it guards.
- Plan `601` clears the recorded event focus when the tracker's sample names
  none of the group's items; without it, the click record would leave a stale
  ring after focus leaves. Plan `601`'s suite is the guard for that half.

**Existing suites.** `runtime/toggle-group.runtime.test.tsx` (all cases),
`runtime/tab-order.runtime.test.tsx`, `runtime/activation.runtime.test.tsx`,
`runtime/roving-arrows.runtime.test.tsx`, `runtime/focus-ring.runtime.test.tsx`
and the offline `ToggleGroup` element-tree suite stay green.

## 5. Commands and expected results

```sh
cd packages/primitives

# the new case, before and after the fix
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/toggle-group.runtime.test.tsx -t "tab stop"
# before: fails "a click moves the multiple tab stop" (focused tg-bold)
# after:  passes

# the affected suites
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/toggle-group.runtime.test.tsx \
  runtime/tab-order.runtime.test.tsx \
  runtime/activation.runtime.test.tsx \
  runtime/roving-arrows.runtime.test.tsx \
  runtime/focus-ring.runtime.test.tsx
# expect: all pass

nub run --filter @gpuixui/primitives test     # offline suite, unchanged count
nub run check
```

## 6. STOP conditions

- Stop if a real click does **not** move native focus to the item on this
  runtime: then the click-recording rule would paint a ring the runtime does not
  have, and the tab stop would need the derived-value rule instead. Report the
  measurement.
- Stop if either existing single-mode tab-stop case changes meaning: in
  `single` the stop must remain the selected item.
- Do not derive the multiple tab stop from the 50 ms tracker: the sample is
  cleared as soon as focus leaves the group, so the stop would snap back to the
  first item a tick after Tab. If a future change needs programmatic focus, that
  is a separate plan with its own probe.
- Do not touch `RadioGroup`/`Rating`/`CheckboxGroup`: their stops are
  value-derived or every-row, and no measured defect exists there.

## 7. Acceptance

- A measured runtime case proves a click moves the multiple tab stop, and fails
  without the one-line transition.
- A disabled item still cannot become the tab stop.
- `docs/toggle-group.mdx`, the README and the inventory agree with the measured
  contract.
- `nub run check`, the offline suite and the scoped runtime suites are green.

## 8. Result (2026-10-19)

- Measured before the fix: click `tg-underline` moved native focus there, then
  leave and `focusNext()` landed on `tg-bold`.
- With `focus.onFocus(index)` in the accepted click: the same steps land on
  `tg-underline`; the next Tab leaves the group. A click on a disabled item
  records nothing and leaves the first enabled item as the stop.
- Reverting the record failed the new case with `tg-bold`; both new cases pass
  with it.
- Plan `601` adds the missing clear for the recorded event focus, so the click
  record cannot leave a stale ring. Offline suite 59 files / 820 tests; the
  scoped runtime suites (toggle-group, focus-loss, focus-ring, disabled,
  tab-order, roving-arrows, rating, checkbox-group) are green; the full runtime
  suite is 53 files / 742 tests (plan `601` §8).
