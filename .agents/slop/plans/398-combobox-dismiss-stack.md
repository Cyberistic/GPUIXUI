# Plan 398 — Combobox joins the dismiss stack: one event closes one surface

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 completion) / F (consistency) |
| Owner | components workstream |
| Depends on | `110`, `112`, `114`, `116`, `200`, `201`, `302`, `323`, `328`, `340`, `366`, `395` |
| Status | done — the popup is a dismiss layer: one Escape or backdrop press closes it and leaves the enclosing dialog open, and a trigger press no longer re-opens it; 3 native cases (Combobox 36, behaviour 629), both-direction proof (the 3 new cases fail without the wrapper change); docs, `COMPONENTS.md` and inventory synced |
| Number | First free number in the `300–399` block (last landed: `397`) |

This plan is self-contained. A weaker executor can run every step without reading
another plan. Facts marked **measured** were reproduced on this host (Intel
macOS, the locally built `darwin-x64` binding from plan `140`).

---

## 1. Goal

The defect is real and measured: the **Combobox is the one popup that does not
participate in `internal/dismiss-layer.ts`**. Its sibling surfaces
(`Popover`, `PreviewCard`, `NavigationMenu`, `DropdownMenu`, `ContextMenu`,
`Dialog`, `Drawer`) push a dismiss layer, so one Escape or one outside press
closes exactly one surface. The Combobox relies on GPUix's own `Combobox`
handlers instead, which close it without claiming the event. Three measured
consequences:

1. **A Combobox inside a Dialog closes both on one Escape.** GPUix's input
   handler closes the popup and the event continues to the dialog's
   `handleModalKeyDown`, which closes the dialog too.
2. **A press on the dialog backdrop closes both.** The Combobox's
   `onMouseDownOutside` closes the popup and the dialog's backdrop handler closes
   the dialog, because nothing claimed the press.
3. **Pressing the Combobox trigger to close it reopens it.** The press closes the
   popup, then the click toggles it back open — exactly the press/click race
   `Popover` already solves with `dismissedByOutsidePress`.

Probes (measured 2026-10-18, this host, scratch behaviour suite removed after
the measurement):

| Probe | Before the fix |
| ----- | -------------- |
| `Dialog > Combobox`, open the popup, press `Escape` | popup **and** dialog gone |
| `Dialog > Combobox`, open the popup, press the backdrop | popup **and** dialog gone |
| `Combobox`, open the popup, press the trigger again | popup **still open** |

After the fix:

- one Escape closes the popup and leaves the dialog open; the next Escape closes
  the dialog;
- one backdrop press closes the popup and leaves the dialog open; the next press
  closes the dialog;
- pressing the trigger while the popup is open closes it and leaves it closed;
- a standalone Combobox keeps every current behaviour (Escape, outside press,
  focus return, controlled `open`).

## 2. Facts this design rests on

- `internal/dismiss-layer.ts` is the package's single answer to "which surface
  closes": a module-level stack, `pushDismissLayer` while open, and
  `dismissTopLayer(event)` from every handler that sees a dismiss key or an
  outside press. `event-claim.ts` carries consumption across the runtime's
  payload copies (measured, plan `187` §9; hardened in plan `366`).
- `PopoverContent` is the working template: it pushes a layer while `open`,
  closes on `keyDown` and returns focus to its trigger, and marks a press so the
  following click cannot re-open the surface (`src/popover.tsx`, lines 192–216
  and 121–143).
- GPUix's headless `Combobox` (published 0.10.0) closes itself in its input's
  `onKeyDown` (Escape), in its content's `onMouseDownOutside`, and its trigger
  toggles `open` on every click. It has no dismiss stack, so it cannot claim the
  event for an enclosing surface. Our wrapper controls `open`, `value` and
  `inputValue`, so the wrapper can add the missing coordination without
  reimplementing the popup.
- `ComboboxContent` is a `HeadlessContent` (a `FloatingLayer`); its
  `onMouseDownOutside` is the one place the wrapper sees a press outside the
  popup.
- The root owns `open`, `query`, `trigger` and `restoreFocus`; the dismiss layer
  needs a stable close callback that reads the latest state (a ref), because
  re-pushing a layer on every render would move it above a surface opened later
  (the same rule `useModalState` records).
- **Baseline (measured 2026-10-18 before the change):** `nub run --filter
  @gpuixui/components test` → 395 unit tests green; `test:behaviour` → 626
  native tests across 49 files green; Combobox 33 native tests.

## 3. Design

### 3.1 One dismiss layer while the popup is open

In the `Combobox` root, next to the existing `restoreFocus` / `wasOpen` refs:

```ts
const dismissedByOutsidePress = useRef(false);
const close = useRef<() => void>(() => undefined);

useLayoutEffect(() => {
  close.current = () => {
    setOpen(false);
    setQuery("");
  };
});

useLayoutEffect(() => {
  if (!open) return;
  return pushDismissLayer((event) => {
    close.current();
    if (event.eventType === "keyDown") {
      restoreFocus.current = true;
      return;
    }
    // The press already moved focus; the click that follows it must not re-open.
    dismissedByOutsidePress.current = true;
    queueMicrotask(() => {
      dismissedByOutsidePress.current = false;
    });
  });
}, [open]);
```

The layer is pushed whenever the popup is open, standalone or nested. It is
removed when the popup closes (the effect cleanup).

### 3.2 Escape and a press are offered to the stack

Escape already reaches `dismissTopLayer` through every enclosing surface's key
handler (`handleModalKeyDown`, `FloatingLayer` in `PopoverContent`, the menus).
The new layer being on top is enough for the dialog to stay open; no key-handling
code changes.

The outside press needs one line: `ComboboxContent`'s `onMouseDownOutside` must
offer the event to the stack after recording that focus must not be restored:

```ts
onMouseDownOutside={(event) => {
  noteOutsidePress();
  dismissTopLayer(event);
  onMouseDownOutside?.(event);
}}
```

If the Combobox is the top layer, it closes and claims the event, so an enclosing
dialog's backdrop handler sees the claim and stays open. If a surface opened
above it, that surface closes instead — the stack's normal rule.

### 3.3 The trigger press must not re-open the dismissed popup

`HeadlessTrigger` toggles on `onClick` regardless of what the press did. The
wrapper therefore filters a re-open that belongs to the dismissing gesture in its
own `onOpenChange`:

```ts
onOpenChange={(next) => {
  if (next) {
    if (dismissedByOutsidePress.current) {
      dismissedByOutsidePress.current = false;
      return;
    }
    restoreFocus.current = false;
    setQuery("");
    onQueryChange?.("");
    setOpen(true);
    return;
  }
  close.current();
}}
```

This is the `Popover` guard expressed at the controlled boundary: whether the
click arrives before or after React re-renders the closed popup, the popup stays
closed, and the next, separate click opens it normally.

`noteEscape` stays: a standalone Combobox is closed by GPUix's own input handler
(no enclosing surface offers the event to the stack), so the input must still
mark the focus return. Inside a surface, the layer marks it as well; setting the
same ref twice is harmless.

### 3.4 What does not change

- The value, ranking, grouping, create row, async query and focus payload are
  untouched.
- `open` is still internal to the wrapper (no new controlled prop).
- The popup markup, `testId`s and parts contract are unchanged.
- One new import (`dismissTopLayer`, `pushDismissLayer`) and no new dependency.

## 4. Files to create or change

| Path | Action |
| ---- | ------ |
| `src/combobox.tsx` | push the layer while open; claim an outside press; ignore the dismissing gesture's re-open; module header records the rule |
| `src/behaviour/combobox.test.tsx` | three new native tests (§6): trigger press, Escape in a dialog, backdrop press in a dialog |
| `docs/combobox.mdx` | keyboard table + a nesting sentence; Verification count 33 → 36 and the new coverage sentence |
| `src/combobox.tsx` (`comboboxMeta`) | record the nesting rule in the limitations/notes if the row needs it |
| `COMPONENTS.md` | Comboboxes row: the one-event/one-surface rule and 36 native tests |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | add and tick the task under the Tier 2 hardening list |

No example change: `examples/combobox.example.tsx` already opens the popup; the
dialog nesting is a test-side composition.

## 5. Steps

1. Add the two refs and the two layout effects from §3.1 to `Combobox`.
2. Route the root's `onOpenChange` through the guard and `close.current` from
   §3.3.
3. Change `ComboboxContent.onMouseDownOutside` per §3.2 and import
   `dismissTopLayer`.
4. Update the module header: the Combobox is a dismiss layer like every other
   popup, and a press it dismissed cannot re-open it.
5. Add the three behaviour tests in §6 to `src/behaviour/combobox.test.tsx`.
6. Run the suites (§7). Recount: Combobox should move 33 → 36, behaviour 626 →
   629, unit unchanged at 395. If a number differs, record what the run printed —
   never edit a count to satisfy a check.
7. Update `docs/combobox.mdx`:
   - Keyboard: `Escape` closes the popup and returns focus to the trigger,
     including inside a dialog (one Escape per surface).
   - A sentence under behaviour/anatomy: the popup is a dismiss layer, so an
     enclosing dialog stays open on the Escape or outside press that closes it.
   - Verification: the real count and a sentence for the nested cases.
8. Update `comboboxMeta` if a limitation or note now needs the nesting rule, the
   `COMPONENTS.md` row, the plan index status and the `TODO.md` task.

## 6. Test plan

### Native (`src/behaviour/combobox.test.tsx`)

Header comments must name the bug each test guards.

1. **The trigger closes an open popup, once** — render a standalone `Picker`
   (existing fixture), open it, `clickCentreOf(trigger)`, `await settle()`;
   expect `combobox-content` gone and `onOpenChange`'s observable state closed.
   This fails before the fix (the click re-opens the popup).
2. **One Escape closes the popup, not the enclosing dialog** — a `Dialog` with
   `defaultOpen` containing a Combobox; open the popup; `simulateKeystrokes
   ("escape")`; expect the popup gone and the dialog still mounted; a second
   Escape then closes the dialog. Fails before the fix on the dialog being gone
   after the first Escape.
3. **One backdrop press closes the popup, not the enclosing dialog** — same tree;
   `nativeSimulateClick(12, 12)`; expect the popup gone and the dialog mounted; a
   second press closes the dialog. Fails before the fix on the dialog being gone.

Both-direction proof: keep the three tests and revert only the `combobox.tsx`
change (`git stash` or a temporary copy); confirm 3 failures; restore and confirm
3 passes. Record the command and the counts in the commit body.

### Existing suites

- `src/behaviour/combobox.test.tsx`'s 33 tests must all stay green: Escape focus
  return, outside press, pointer selection, create row, groups, async options.
- `dialog.test.tsx`'s nested popover Escape case must stay green (the two layers
  share the stack).
- `nub run check` must typecheck the new imports; `nub run check:tests` must
  accept the new assertions.

## 7. Commands and expected results

```sh
cd packages/components
nub run test                          # expected: all unit files green, 395 tests
nub run test:behaviour                # expected: 49 files, 629 native tests
nub run check-types                   # expected: exit 0
cd ../..
nub run check                         # expected: check-tests, lint, fmt and types green
nub run test                          # expected: every workspace package green
```

Counts are **measured after the change**, not assumed.

## 8. STOP conditions

Stop and report with evidence if:

- the trigger's click still re-opens the popup after the guard (then the runtime
  delivers the click in a later task than the press and the microtask clear is
  wrong; do not enlarge the guard without measuring the live order);
- the new layer makes a standalone Combobox consume an Escape that should reach
  an enclosing surface (a layer must close only its own popup);
- an enclosing dialog closes on the same Escape or press as the popup, i.e. the
  event claim does not cross the runtime's payload copies in this composition
  (plan `366` says it does for popovers; measure before changing the claim);
- the existing 33 Combobox tests fail for a reason other than the new
  interaction; do not weaken an assertion to get green.

## 9. Acceptance criteria

- A Combobox open inside a Dialog: one Escape or one backdrop press closes the
  popup and leaves the dialog open; the second closes the dialog.
- Pressing the trigger while the popup is open closes it and leaves it closed.
- A standalone Combobox keeps its current Escape, outside-press and focus-return
  behaviour, and its value/query contract is unchanged.
- The three new native tests fail on the pre-change source and pass after it.
- `docs/combobox.mdx`, `comboboxMeta`, the `COMPONENTS.md` row and the plan index
  match the implementation and the real test counts.
- `nub run check`, `nub run test` and `nub run lint` are green.
