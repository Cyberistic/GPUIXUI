# 334 — The remaining button-shaped parts activate Space on release

**Phase:** F · **Owner:** components workstream (`packages/components`) ·
**Depends on:** 110, 117, 200, 201, 332, 333.

**Status when written:** plan 332 split activation into Enter-on-key-down and
Space-on-key-**up** and built `internal/activate.ts`, but only four call sites
adopted it (the `Button`/`IconButton` stand-in and the two clear affordances).
`docs/component-api.md` §4 and `TODO.md` record the remaining seven parts as a
follow-up. Each still reacts to Space on key down through `isActivation`, so a
user cannot move focus away before releasing Space.

## 1. The defect (measured on `agent/components`, 2026-10-18)

These seven button-shaped controls run their action on Space **key down**:

| Part | File | Trigger |
| ---- | ---- | ------- |
| `AccordionTrigger` | `src/accordion.tsx` | `isActivation(event)` in `handleKeyDown` |
| `CollapsibleTrigger` | `src/collapsible.tsx` | `isActivation(event)` in `onKeyDown` |
| `TabsTrigger` (via `TabsList`) | `src/tabs.tsx` | `isActivation` → `selectActive` on the list |
| `BreadcrumbLink` | `src/breadcrumb.tsx` | `isActivation(event)` in `onKeyDown` |
| `HotkeyRecorder` **and** its clear control | `src/hotkey-recorder.tsx` | `isActivation` in both handlers |
| `InlineEdit` display | `src/inline-edit.tsx` | `isActivation(event)` in `onKeyDown` |
| `TagInputChip` removal control | `src/tag-input.tsx` | `isActivation(event)` in `onKeyDown` |

Two of these already have a latent nested-event bug that the move exposes:

1. **The hotkey recorder's clear control bubbles into the recorder.** Keyboard
   activation of the clear control (`Space`/`Enter`) clears the value *and* the
   event continues to the recorder root, whose `isActivation` starts recording.
   There is no keyboard test for the clear control, so it is unproven today.
2. **Space is not cancellable.** On every listed part, releasing focus before
   Space is released still performs the action.

## 2. The rule

> Every **button-shaped** control activates Enter on key down and Space on key
> **release**, through `internal/activate.ts`. A key-repeat event never
> activates. A nested button-shaped control claims the key it handles so its
> enclosing button does not also act on it.
>
> The **composite row/cell** rule is unchanged: `List` rows, menu rows, grid
> and calendar cells keep Space as a **selection** key on key down
> (`isActivation`), because that is the ARIA listbox/grid meaning.
>
> `TabsTrigger` is a tab, but its Space action is *activation* of the focused
> tab, not selection of a row in a listbox, so it moves to the button-shaped
> rule. The list keeps ownership of the arrow/Home/End roving gesture.

## 3. Exact changes

All paths are relative to `packages/components/`.

### 3.1 `src/accordion.tsx` — `AccordionTrigger`

- Destructure `onKeyUp` from props.
- Keep the arrow/Home/End handler, renamed `navigate`, and drop
  `Match.when(isActivation, flip)`:
  ```ts
  const navigate = (event: EventPayload): void => {
    if (disabled) return;
    Match.value(event).pipe(
      Match.when(isDown, () => moveFrom(value, 1)),
      Match.when(isUp, () => moveFrom(value, -1)),
      Match.when(isFirst, () => jumpTo("first")),
      Match.when(isLast, () => jumpTo("last")),
      Match.orElse(() => undefined),
    );
  };

  const keyHandlers = activationHandlers(flip, {
    disabled,
    onKeyDown: (event) => {
      navigate(event);
      onKeyDown?.(event);
    },
    onKeyUp,
  });
  ```
- Set `{...keyHandlers}` on the header element instead of the inline
  `onKeyDown`.
- Remove the `isActivation` import; add `activationHandlers`.
- The click path is unchanged (`onClick` then `flip`, disabled drops both).

### 3.2 `src/collapsible.tsx` — `CollapsibleTrigger`

- Destructure `onKeyUp`.
- Replace the inline `onKeyDown` with
  `{...activationHandlers(toggle, { onKeyDown, onKeyUp })}`.
- Remove the `isActivation` import, add `activationHandlers`.

### 3.3 `src/tabs.tsx` — activation moves to `TabsTrigger`

- `TabsList`: remove `selectActive` from the destructure and remove
  `Match.when(isActivation, selectActive)` from `handleKeyDown`; the list now
  owns only Home/End/direction. Remove the `isActivation` import.
- `TabsContextValue` / context: delete `selectActive` (no other reader).
  Delete the `selectActive` callback and its `useMemo` dependency. The list no
  longer needs a key-up handler.
- `TabsTrigger`: destructure `onKeyUp`; spread
  `activationHandlers(() => select(value), { disabled, onKeyDown, onKeyUp })`.
  `select` already refuses disabled rows. The trigger keeps `onClick` →
  `select(value)`.
- Update the module header comment: the **list owns the roving keys**, each
  trigger owns its own activation.

### 3.4 `src/breadcrumb.tsx` — `BreadcrumbLink`

- Destructure `onKeyUp`.
- Replace the inline `onKeyDown` with
  `{...activationHandlers(() => onSelect?.(), { onKeyDown, onKeyUp })}`.
  The click path stays unchanged.
- Remove the `isActivation` import; add `activationHandlers`. `EventPayload`
  is still needed only if another handler uses it — remove the type import if
  it becomes unused.

### 3.5 `src/hotkey-recorder.tsx` — the recorder and its clear control

The recorder has a compound key contract (recording capture), so it spells the
split out rather than using `activationHandlers` for the root. The clear
control uses the helper and **claims** the key.

- Imports: add `activationHandlers`, `claimEvent`, `isEventClaimed`,
  `isEnter`, `isSpaceRelease`; remove `isActivation`.
- Add `const consumed = useRef(false);` — set when a key-down is consumed while
  recording, so its key-up cannot start a new recording (Space is a valid
  chord: `acceleratorOf` returns `Some("space")`).
- Root `onKeyDown`:
  ```ts
  onKeyDown={(event: EventPayload) => {
    onKeyDown?.(event);
    if (disabled || isEventClaimed(event)) return;
    if (recording) {
      consumed.current = true;
      if (isDismiss(event)) {
        setRecording(false);
        return;
      }
      Option.match(acceleratorOf(event, currentPlatform), {
        onNone: () => undefined,
        onSome: (chord) => {
          onChange(chord);
          setRecording(false);
        },
      });
      return;
    }
    if (isEnter(event)) start();
  }}
  ```
- Root `onKeyUp` (new):
  ```ts
  onKeyUp={(event: EventPayload) => {
    onKeyUp?.(event);
    if (disabled || isEventClaimed(event)) return;
    if (consumed.current) {
      consumed.current = false;
      return;
    }
    if (!recording && isSpaceRelease(event)) start();
  }}
  ```
  Destructure `onKeyUp` from props (it is currently swept into `...rest`).
- Clear control:
  ```tsx
  onClick={clear}
  {...activationHandlers((event) => {
    claimEvent(event);
    clear();
  })}
  ```
  Remove its inline `onKeyDown`. `clear()` still sets `skipStart` for the
  pointer path.
- JSDoc on the split: why the root does not use the helper (capture consumes
  the key) and why the clear control claims (the root is an enclosing button).

### 3.6 `src/inline-edit.tsx` — the display control

- Destructure `onKeyUp`.
- Display element: replace the inline `onKeyDown` with
  `{...activationHandlers(start, { disabled, onKeyDown, onKeyUp })}`.
- The editing input keeps `handleInputKeyDown` (Escape/Enter) and passes the
  caller's `onKeyUp` through explicitly (`onKeyUp={onKeyUp}`), because the
  destructure removed it from `...rest`.
- Remove the `isActivation` import; add `activationHandlers`.

### 3.7 `src/tag-input.tsx` — the chip removal control

- Replace its inline `onKeyDown` with
  `{...activationHandlers(() => remove(value))}` next to `onClick`.
- Remove the `isActivation` import; `isEnter` stays for the field.
- Remove the now-unused `EventPayload` import if nothing else uses it.

### 3.8 Not changed

`List` rows, menu rows, grid/calendar cells, `MentionInput` rows,
`TagInputField` (Enter-to-commit), the `SearchInput`/`TimePicker` clear
controls, and the `Button`/`IconButton` stand-in keep their current behaviour.

## 4. Tests (each must fail before the fix)

Add one focused case per family; keep the existing suite green.

1. `src/behaviour/accordion.test.tsx` — **“toggles Space on release, not on
   press”**: focus `trigger-two`; `nativeSimulateKeyDown(id, "space")` leaves
   `content-two` absent; `nativeSimulateKeyUp(id, "space")` opens it.
   Today the key-down opens it, so the first assertion fails.
2. `src/behaviour/collapsible.test.tsx` — same shape on `trigger`; the existing
   `simulateKeystrokes("space")` case stays (it sends down + up) and must keep
   passing.
3. `src/behaviour/tabs.test.tsx` — **manual activation**: focus `tab-profile`,
   ArrowRight to `tab-danger`; key-down Space leaves `panel-profile` selected;
   key-up Space selects `panel-danger`. Today the key-down selects.
4. `src/behaviour/breadcrumb.test.tsx` — focus `projects`; key-down Space does
   not call `onSelect`; key-up calls it once.
5. `src/behaviour/hotkey-recorder.test.tsx`:
   - **“starts recording on Space release”**: focus the recorder, key-down
     Space does not show `Press keys…`, key-up shows it.
   - **“captures Space without reopening the recorder”**: click to record, then
     key-down + key-up Space; `onChange` receives `"space"` and the text is not
     `Press keys…` again. Without the `consumed` ref the key-up restarts.
   - **“clears from the keyboard without starting a recording”**: focus
     `recorder-clear`; key-down Space leaves the value; key-up clears it, text
     is `Click to record`, and it is **not** `Press keys…` (the claim).
6. `src/behaviour/inline-edit.test.tsx` — focus `name` (display); key-down
   Space leaves no `<input>`; key-up renders the input and focuses it.
7. `src/behaviour/tag-input.test.tsx` — focus the chip's removal control (use
   the existing `removeControlOf` helper to read its id); key-down Space keeps
   both tokens; key-up removes the chip.

Every new case states the bug it guards in the file header comment (extend the
existing header sentence).

## 5. Docs, inventory and examples

All paths relative to the repository root unless stated.

- `docs/component-api.md` §4: delete the “remaining button-shaped parts …
  migrating them is the follow-up” sentence. State that every button-shaped
  control uses `internal/activate.ts`; list the seven migrated parts; keep the
  composite row/cell exception and add that a nested button claims its key.
- `packages/components/docs/accordion.mdx`: keyboard table — `Enter` toggles on
  press, `Space` on release.
- `packages/components/docs/collapsible.mdx`: add the same note to its Keyboard
  section (create one if absent, above Verification).
- `packages/components/docs/tabs.mdx`: keyboard table — `Enter` selects on
  press, `Space` on release.
- `packages/components/docs/breadcrumb.mdx`: “Enter fires on press, Space on
  release.”
- `packages/components/docs/hotkey-recorder.mdx`: “Enter starts on press, Space
  on release”; the clear control’s keyboard path does not start a recording.
- `packages/components/docs/inline-edit.mdx`: the display starts editing on
  Enter press / Space release.
- `packages/components/docs/tag-input.mdx`: “pressing Enter, or releasing
  Space, on the removal control removes the chip.”
- Update every stated test count:
  - `COMPONENTS.md`: Accordions 14 → 15, Collapsible sections 4 → 5, Tabs
    14 → 15, Breadcrumbs 5 → 6, Hotkey-recorder input 8 → 11, Inline edit
    10 → 11, Tag / token input 8 → 9.
  - Docs Verification lines: accordion (15), collapsible (5), tabs (15),
    breadcrumb (6), inline-edit (11); hotkey-recorder and tag-input use their
    prose form (`(11 native tests)`, `(9 native tests)`).
- No new example: this is keyboard-only; `src/behaviour/examples.test.tsx`
  must stay green.

## 6. Commands and expected results

Run from `packages/components/` unless stated.

1. **Probe key-up bubbling once** (the hotkey claim depends on it):
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/hotkey-recorder.test.tsx`
   with the keyboard-clear test added but the source change stashed.
   Expected: the test fails on the clear/record behaviour, not because the
   event never arrives. If key-up never reaches the root from the clear
   control, STOP (see §7).
2. **Before the fix**, with the seven source files stashed and all new tests
   kept:
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/accordion.test.tsx src/behaviour/collapsible.test.tsx src/behaviour/tabs.test.tsx src/behaviour/breadcrumb.test.tsx src/behaviour/hotkey-recorder.test.tsx src/behaviour/inline-edit.test.tsx src/behaviour/tag-input.test.tsx`
   Expected: every new case fails naming the early activation (7 failures, or
   8 if the hotkey file contributes three). If a new case passes before the
   fix, it does not test the defect — STOP and rewrite it.
3. After the fix, same command: green.
4. `nub run --filter @gpuixui/components test`
   Expected: green (334 unit tests, unchanged).
5. `nub run --filter @gpuixui/components test:behaviour`
   Expected: green, **517** behaviour tests (508 + 9). Record the exact number
   and correct §5 and this plan if it differs.
6. From the repository root:
   `nub run check`, `nub run lint`, `nub run test`
   Expected: all green; `check:tests` accepts the new cases and the inventory
   counts match.

## 7. STOP conditions

- Key-up events do not reach an enclosing element from a focused child on this
  host — STOP, record the measured payload, and do not fake the claim. Report
  which of the seven parts can still be migrated and which cannot.
- `nativeSimulateKeyUp` does not dispatch to the focused element — STOP and
  report; do not fall back to key-down.
- Moving Tabs activation to the trigger breaks roving focus or double-selects
  (e.g. a bubbled key fires both the list and the trigger) — STOP and report
  the call path; keep the list as the owner if that is the only measured
  correct shape.
- A component needs Space on key down for a reason its docs state — STOP, leave
  it on `isActivation`, and amend §3.8 and `TODO.md`.
- A type error requires an `any`, a cast or an omitted prop — STOP.

## 8. Acceptance

- Every listed button-shaped control activates Enter on press and Space on
  release; a held key never activates twice.
- The hotkey recorder captures Space as a chord without reopening, and its
  clear control clears without starting a recording, from the keyboard.
- Composite rows/cells are unchanged (`List`, menus, grid/calendar cells).
- `docs/component-api.md` §4 matches the code; every docs page and
  `COMPONENTS.md` count matches its suite; the three repo gates pass.

## 9. Outcome

Landed on `agent/components` (2026-10-18).

**Measured correction:** `simulateKeystrokes("space")` does **not** deliver a
key-up. The existing collapsible case that used it to close the section failed
after the fix; it now sends `nativeSimulateKeyDown` + `nativeSimulateKeyUp`
explicitly. Every new Space case uses those two calls too.

**Both-direction proof:** with the seven source files stashed and the nine new
cases kept, the targeted run reported **8 failed / 64 passed**. The failing
cases were the seven migration cases plus the hotkey clear-control case (the
latent nested-event bug). The ninth case — “captures Space without reopening the
recorder” — passes before the migration because the regression it guards is
introduced *by* the migration; it was proven in the other direction by removing
the `consumed` ref (the recorder reopened after capturing Space).

After the fix: **behaviour 517** (was 508; nine new cases), **unit 335**
(unchanged), both green. `nub run check`, `nub run lint` and `nub run test`
pass. Counts synced in `COMPONENTS.md` and the six docs Verification sections;
`docs/component-api.md` §4 now states the button-shaped rule without a
follow-up caveat.

Scope: `TabsTrigger` owns its activation and `TabsList` keeps the roving keys;
`TabsContextValue` lost `selectActive`. The hotkey recorder spells out its own
split (capture consumes the key) and its clear control claims the key through
`internal/event-claim.ts`, which also fixes the pre-existing “keyboard clear
starts a recording” bug.
