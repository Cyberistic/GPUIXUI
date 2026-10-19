# 602 — Date picker and combobox expose their open state

**Phase:** F (integration and polish) · **Owner:** components workstream
(`packages/components`) · **Status:** in progress
**Depends on:** 110 (package), 112 (overlays), 116 (combobox), 119 (date
picker), 303 (date/time parts), 388 (`autoFocus` seeds focus state), 398
(combobox dismiss stack), 517 (the controlled-state no-op rule), 523 (overlay
field rings), 583 (a trigger press closes once), 597 (animated surfaces).
**Number:** `602` — `598`–`601` were claimed by the tokens and playground
worktrees; this is the next free number (`PLAN.md` D30).

## 1. Why this plan exists

`Popover` and `ContextMenu` expose one controlled-state pair
(`open`/`defaultOpen`/`onOpenChange`). Two later overlays do not:

| Component | Today | Consequence |
| --------- | ----- | ----------- |
| `DatePicker` | `const [open, setOpen] = useState(false)` (`date-picker.tsx:199`) | A consumer cannot open the calendar from a custom control, keep it open while editing, or observe it closing. The docs-site plan `457` recorded this as the reason a Date Picker live scene had to be driven by a real trigger click. |
| `Combobox` | `const [open, setOpen] = useState(false)` (`combobox.tsx:254`) | The same. The docs-site plan `458` recorded the missing `defaultOpen` as the smallest honest API fix for a scene that mounts an open picker. |

Both wrappers already own the state; the gap is the public API, not the
behaviour. The contract in `docs/component-api.md` §2 says the root part owns
the controlled-state props, so the fix is one `useControllableState` pair per
root, the same hook `Popover`, `ContextMenu` and every other stateful part use.

This is **not** a request to change dismissal, ranking, selection or focus
rules. A controlled `open` is authoritative for the painted surface; a request
to close that the caller ignores leaves the surface open, exactly like every
other controlled part.

## 2. Decisions

1. **The trio is the Popover trio.** `open?: boolean`,
   `defaultOpen?: boolean`, `onOpenChange?: (open: boolean) => void`. No new
   names, no `isOpen`, no `onToggle`.
2. **`useControllableState<boolean>` is the only implementation.** No parallel
   `useState` fallback. The hook already enforces the no-op rule (plan `517`).
3. **A close action reports even when the caller ignores it, but focus follows
   the accepted close.** `DatePicker`'s select/clear path currently focuses the
   trigger immediately. It will instead mark a restore and let a layout effect
   focus the trigger when `open` actually becomes `false`. In uncontrolled mode
   that is the same frame as today; in controlled mode the caller decides.
   `Combobox` already uses this pattern (`wasOpen` + `restoreFocus`), so only
   its open source changes.
4. **`defaultOpen` on Combobox reports the opening query once.** The existing
   contract says `onQueryChange("")` fires when the popup opens (plan `116`).
   Moving that report from the headless `onOpenChange(true)` branch to one
   false→true layout effect keeps a user open reported once and makes an
   initially-open popup obey the same contract.
5. **No `point` prop in this plan.** `ContextMenu.point` is a separate placement
   API, not open state; it stays a recorded cross-team ask rather than growing
   this change.

## 3. Exact edits

All paths are relative to `/Users/cyberistic/GPUIXUI/workspaces/components`.

### 3.1 `packages/components/src/date-picker.tsx`

Add to `DatePickerProps`, after `onValueChange`:

```ts
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  /** The uncontrolled starting state. Default `false`. */
  readonly defaultOpen?: boolean;
  /** Called with every open or close request, in both modes. */
  readonly onOpenChange?: (open: boolean) => void;
```

Destructure them in `DatePicker`:

```ts
export const DatePicker = ({
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...
```

Replace the open state and the close path:

```ts
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const trigger = useRef<PublicInstance | null>(null);
  const restoreFocus = useRef(false);
  const wasOpen = useRef(open);

  useLayoutEffect(() => {
    if (wasOpen.current && !open && restoreFocus.current) {
      const instance = trigger.current;
      if (instance !== null) renderer?.focusElement?.(instance.id);
    }
    if (!open) restoreFocus.current = false;
    wasOpen.current = open;
  }, [open, renderer]);

  /** Request a close; focus returns to the trigger when the close is accepted. */
  const closeToTrigger = useCallback((): void => {
    restoreFocus.current = true;
    setOpen(false);
  }, [setOpen]);
```

`choose` and `clear` keep calling `closeToTrigger`. Remove the now-unused
`useState` import if the root no longer uses it (the calendar parts still do;
check the import list before editing).

The existing `<Popover open={open} onOpenChange={setOpen}>` stays. The
header comment's "The root owns the value, the bounds and the open state" gains
"the open state is controlled or uncontrolled through the standard trio".

### 3.2 `packages/components/src/combobox.tsx`

Add to `ComboboxProps`, after `onValueChange`:

```ts
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  /** The uncontrolled starting state. Default `false`. */
  readonly defaultOpen?: boolean;
  /** Called with every open or close request, in both modes. */
  readonly onOpenChange?: (open: boolean) => void;
```

Destructure them in `Combobox` and replace `const [open, setOpen] =
useState(false)` with:

```ts
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
```

Move the opening query report out of the headless callback. In
`onOpenChange(true)` remove `reportQuery("", true)`; the branch keeps
`restoreFocus.current = false; setQuery(""); setOpen(true);`.

Add one layout effect after `reportQuery` is defined:

```ts
  // "Opening reports an empty query" is a transition rule, so it also holds for
  // a popup mounted with `defaultOpen`; a user open still reports exactly once.
  const reportedOpen = useRef(false);
  useLayoutEffect(() => {
    if (open && !reportedOpen.current) reportQuery("", true);
    reportedOpen.current = open;
  }, [open, reportQuery]);
```

The existing `wasOpen`/`restoreFocus` effect is unchanged. A controlled close
request reports through `setOpen(false)`; when the caller accepts it the effect
returns focus to the trigger, and when the caller refuses it the popup stays
open with focus where it was.

### 3.3 `packages/components/examples/date-picker.example.tsx`

Extend the existing example, do not add a second example module (the registry
is one example per component). Add a controlled-open field beside the two
existing fields:

- `const [open, setOpen] = useState(false);`
- a `DateField` prop `open?: boolean` / `onOpenChange?: (open: boolean) => void`
  threaded to `DatePicker`.
- the first field ("Due date") passes `open={open}` and `onOpenChange={setOpen}`;
  the caption names the new contract: "The due-date surface is controlled here:
  the app owns `open` and `onOpenChange`; selection still reports the ISO day."
- keep the existing `value` control on that field. The visual behaviour is
  unchanged; the example now demonstrates the API.

### 3.4 `packages/components/examples/combobox.example.tsx`

Extend the first (`reviewer`) picker only:

- `const [reviewerOpen, setReviewerOpen] = useState(false);`
- `Picker` gains `open?: boolean` / `onOpenChange?: (open: boolean) => void`,
  passed to `Combobox`.
- the reviewer picker passes both; the example caption states that the popup's
  open state is the caller's while the selection and the ranking stay the
  component's.
- no `defaultOpen` in the example: an example that mounts an open popup over the
  page is a poor copy target.

### 3.5 `packages/components/docs/date-picker.mdx`

Add `## Open state` after `## Value format`:

```md
## Open state

The popover is uncontrolled by default. `open` makes it controlled and
`onOpenChange` reports every request; `defaultOpen` is the uncontrolled initial
state. The calendar still reports the chosen ISO day through `onValueChange`, and
a controlled close the caller ignores leaves the surface open.

```tsx
const [open, setOpen] = useState(false);

<DatePicker
  open={open}
  onOpenChange={setOpen}
  value={due}
  onValueChange={setDue}
>
  <DatePickerTrigger label="Due date" />
  <DatePickerContent>
    <DatePickerCalendar />
  </DatePickerContent>
</DatePicker>;
```

A controlled close that is refused is a real state, not an error: the surface
stays painted and focus stays where it was. The trigger's `aria-expanded`
follows the resolved state in both modes.
```

Update the Verification paragraph: `31 tests` becomes the new count after the
suite runs (expected 34) and add "the controlled/default-open contract" to the
list. Keep the count derived from the real suite, never a guess.

### 3.6 `packages/components/docs/combobox.mdx`

Add `## Open state` after `## Values, not labels` with the same trio table and a
short controlled example. State two facts specific to this component:

- `defaultOpen` mounts the popup open and reports `onQueryChange("")` once, like
  a user open;
- an accepted controlled close returns focus to the trigger; a refused close
  leaves the popup and focus alone.

Update the Verification paragraph with the new native count (expected 48) and
name the open-state cases.

### 3.7 `COMPONENTS.md`

- **Date pickers** row: after the compound-parts sentence, add "the popover is
  controlled/uncontrolled through `open`/`defaultOpen`/`onOpenChange`, and a
  refused controlled close leaves the surface open; N native tests".
- **Comboboxes** row: add "the popup is controlled/uncontrolled through
  `open`/`defaultOpen`/`onOpenChange`, a `defaultOpen` popup reports the empty
  query once, and an accepted close returns focus to the trigger; N native
  tests".
- Update the two test counts in those rows. Do not touch other rows.

### 3.8 `TODO.md`

Add one row under "Tier 2 hardening after the inventory closed (plans 120+)",
ticked when the plan is done:

```md
- [x] The date picker and combobox expose their open state — plan 602; both
  roots now use the same `open`/`defaultOpen`/`onOpenChange` trio as Popover and
  ContextMenu. `DatePicker` restores focus only when the close is accepted, and a
  `defaultOpen` combobox reports the empty opening query once; 3 native cases
  each, docs, examples and `COMPONENTS.md` synced
```

### 3.9 `.agents/slop/plans/README.md` and `PLAN.md`

- Add the plan row to the components table.
- Append to `PLAN.md` D30: "`598`–`601` went to tokens and playground, so the
  overlay open-state plan takes `602`."

## 4. Test plan

All native cases live in the existing suites, so the per-component test counts in
`COMPONENTS.md` and the docs pages stay derivable.

### DatePicker — `packages/components/src/behaviour/date-picker.test.tsx`

Extend the local `Picker` fixture with `open`, `defaultOpen` and
`onOpenChange`. Three cases:

1. **`defaultOpen` paints the grid without a trigger press** — render with
   `defaultOpen`, expect `date-picker-content` painted and a day focused (the
   selected day when given, else the clamped today).
   *Fails on the old code:* the old root ignores `defaultOpen`.
2. **A controlled `open={false}` reports the trigger request and stays closed** —
   click the trigger, expect `onOpenChange(true)` once and no
   `date-picker-content`; rerender with `open`, expect the grid painted.
   *Fails on the old code:* `open` is not a prop.
3. **A controlled open close is the caller's** — render `open` with a spy,
   press Escape, expect `onOpenChange(false)` and the grid still painted while
   the prop stays `true`; rerender with `open={false}` and expect the grid gone
   and focus on the trigger. *Fails on the old code:* the private state closes
   immediately.

Use `finishMotion` before asserting absence, like the existing cases.

### Combobox — `packages/components/src/behaviour/combobox.test.tsx`

Extend the local `Picker` fixture with the same three props. Three cases:

1. **`defaultOpen` paints the popup and reports the empty query once** — render
   with `defaultOpen`, expect `combobox-content`, at least one option, and
   `onQueryChange` called once with `""`; rerender and expect no second call.
   *Fails on the old code:* the root ignores `defaultOpen` and never reports the
   mount query.
2. **A controlled `open={false}` reports the trigger request and stays closed** —
   click the trigger, expect `onOpenChange(true)` and no `combobox-content`;
   rerender with `open`, expect the popup.
3. **A controlled open close is the caller's** — render `open`, press Escape,
   expect `onOpenChange(false)` and the popup still painted; rerender with
   `open={false}`, `finishMotion`, expect it gone and focus on the trigger.

### Both-direction proof

For each case, revert only the relevant line and re-run the file:

- DatePicker case 1: remove `defaultOpen` from the hook call → fails.
- DatePicker case 2/3: put back `useState(false)` → fails.
- Combobox case 1: remove the reporting effect → `onQueryChange` assertion
  fails.
- Combobox case 2/3: put back `useState(false)` → fails.

Record the command and the observed failures in §7 when the plan runs.

## 5. Commands and expected results

```sh
# from /Users/cyberistic/GPUIXUI/workspaces/components
nub run --filter @gpuixui/components check-types
# exit 0

nub run --filter @gpuixui/components test
# exit 0; the unit count is unchanged (the new cases are native)

nub run --filter @gpuixui/components test:behaviour -- -t "open"
# exit 0 for the new cases; at HEAD the suite is 758 passing / 35 pre-existing
# plan-540 binding failures of 793. The new cases must all pass; the 35 stay red.

nub run --filter @gpuixui/components test:behaviour
# expected: 764 passing / 35 pre-existing failures of 799 (six new cases)

nub run check && nub run lint && nub run test
# exit 0. `nub run check` includes check:tests, so every new case must assert.
```

If `test:behaviour -- -t "open"` matches unrelated existing tests, run the two
files directly:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/date-picker.test.tsx src/behaviour/combobox.test.tsx
```

## 6. STOP conditions

Stop and report rather than improvise if:

- `useControllableState` cannot run at the root because a part re-mounts the
  provider (it does not today; if it does, record the measured cause);
- the headless `Combobox` refuses a controlled `open` (measure with a minimal
  case and record the exact prop it ignores);
- `defaultOpen` on DatePicker paints no grid because the open effect requires a
  transition (fix the effect, not the test);
- a new case is red only because of the known plan-540 binding defects (no
  `onFocus`/`onBlur` for a native focus change or a shifted box). The cases above
  assert tree presence, callback payloads and focus ids — not pixel positions —
  so a red case means the component, not the binding. If it is a binding
  measurement, record it and do not weaken the assertion;
- the existing 35 failures change count for an unrelated reason: stop, name the
  extra failure, and do not call the task done.

## 7. Acceptance

- Both roots accept `open`/`defaultOpen`/`onOpenChange` through the shared hook;
  no private open `useState` remains.
- `DatePicker` focuses the trigger when a close is accepted, in both modes.
- A `defaultOpen` combobox reports `onQueryChange("")` exactly once.
- Six new native cases pass; both-direction proof recorded in this plan.
- The two examples demonstrate the controlled state, both docs pages carry an
  `## Open state` section and their real counts, and both `COMPONENTS.md` rows
  agree with the suites.
- `nub run check`, `nub run lint` and `nub run test` pass. The native suite's 35
  pre-existing plan-540 failures are unchanged and named as such.
