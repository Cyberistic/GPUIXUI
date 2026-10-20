# 755 — The last ring owners follow native focus, not React's events

**Phase:** F (integration and polish, Tier 2 hardening)
**Owner:** `components` workstream (`packages/components`)
**Depends on:** 110, 117, 200, 201, 326, 388, 394, 522, 536, 540, 608, 680, 748,
752, 754
**Number:** `755` is the first free number across every worktree — the highest
claimed anywhere is `754` (this workstream, `playground` and `tokens-theme`).

**Status: planned** — implement from §3; fill §9 when done.

---

## 1. The defect

Plans 748, 752 and 754 moved every *reviewed* ring owner onto the renderer's
focused host. Eight focusable parts were missed, and three of them were recorded
as a limitation instead of being fixed. All eight paint a ring (or drive one)
from React `onFocus`/`onBlur`, which `@gpuix/native@0.10.0` **never delivers for
a native focus move** (plans 536/540, re-measured by 613, 659, 672, 748, 752,
754). Measured on this host, 2026-10-20, with the scratch probe
`nub run test:behaviour zz-probe` (10 cases, all red):

| family | ring owner | at `HEAD` |
| ------ | ---------- | --------- |
| Breadcrumb | `BreadcrumbLink` (`tabIndex 0`, `role="link"`) | `focusElement` leaves `boxShadow: undefined`; a seeded `autoFocus` ring survives when focus moves elsewhere |
| Chat | `ChatComposer` textarea | `focusElement` leaves `boxShadow: undefined` (plan 595 shipped the `autoFocus` seed only) |
| Inline edit | the display (`role="button"`) | `focusElement` leaves `boxShadow: undefined` |
| Context menu | `ContextMenuTrigger` | `focusElement` leaves `boxShadow: undefined` |
| Command menu | `CommandMenuInput` | the ring is seeded `true` for the life of the palette and never clears when native focus leaves the input |
| Tag / token input | the root group ring | `focusElement` on the field leaves the group `boxShadow: undefined` |
| Mention input | the root group ring | `focusElement` on the field leaves the group `boxShadow: undefined` |
| Time picker | the root group ring | `focusElement` on a segment leaves the group `boxShadow: undefined` |

The behaviour suites' existing `autoFocus` cases pass because they read the seed;
a user who reaches any of these parts by `Tab`, a programmatic focus or a pointer
press gets no (or a stale) focus cue. This is the same defect class as 748/752,
not a new design.

**Considered and excluded — `DatePicker` day/month cells.** Measured: after
`defaultOpen`, `focusElement(day-2026-10-18)` leaves the new day ringless and the
old day ringing. The cell ring is the grid's **keyboard cursor**, not a focus
cue: the grid moves native focus in lockstep through its own `focusElement`
(`date-picker.tsx`), a pointer press selects and closes, and `Tab` enters on the
cursor cell. Fixing the external-focus case would add 42 sampled consumers or a
second cursor authority; that trade is not justified. Record the measurement in
`COMPONENTS.md`'s Date pickers row instead of changing the component.

## 2. The rule (unchanged from 748/752/754)

A ring-owning part samples `renderer.getFocusedElementId()` through
`useNativeFocusId` while it is enabled (`src/internal/native-focus.ts`, 50 ms)
and paints only while **its own host** is the focused host. `useFocusState`
(`src/internal/focus.ts`) already implements this and keeps the `autoFocus` seed
only until a host is reported. A disabled part neither samples nor paints.

Two shapes are enough:

1. **One part, one host id** — `useFocusState(autoFocus, disabled, hostId)`, with
   the instance held in state and the caller's `ref` merged through
   `useMergedRef` (`src/internal/ref.ts`). This is the `TabsTrigger` shape.
2. **A group of hosts, one sample** — the root calls `useNativeFocusId(!disabled)`
   once and compares the reported id with the ids its children register
   (`CarouselIndicators` is the shipped precedent).

Do not add a new hook. Do not synthesise a React focus event (plan 754's recorded
non-goal), and do not move a ring to a wrapper.

## 3. Exact changes

All paths are relative to `packages/components`.

### 3.1 `src/breadcrumb.tsx` — `BreadcrumbLink`

- Destructure `ref` from the props; import `PublicInstance` from `@gpuix/react`,
  `useCallback`, `useState` (already imported) and `useMergedRef` from
  `./internal/ref.js`; import `useFocusState` from `./internal/focus.js`.
- Hold `instance` in state, attach it with a stable `useCallback`, and merge the
  caller's `ref` through `useMergedRef`.
- Replace `const [focused, setFocused] = useState(autoFocus)` with
  `const [focused, setFocused] = useFocusState(autoFocus, false, instance?.id)`.
- Pass `ref={setElement}` on the link `div`; the existing `onFocus`/`onBlur`
  handlers stay (they still call the caller's handlers).

### 3.2 `src/chat.tsx` — `ChatComposer`

- Destructure `ref`; hold the textarea `instance` in state with a stable attach
  callback; render `ref={setComposer}` on the `<textarea>` (merge the caller's
  ref with `useMergedRef`).
- Replace `const [focused, setFocused] = useState(autoFocus)` with
  `const [focused, setFocused] = useFocusState(autoFocus, false, instance?.id)`.
- Keep the composed `onFocus`/`onBlur` handlers.

### 3.3 `src/inline-edit.tsx` — the display

- `attachDisplay` already receives the `PublicInstance`; also store
  `displayInstance` state there (a second setter in the same stable callback).
- Change `useFocusState(autoFocus, disabled)` to
  `useFocusState(autoFocus, disabled, displayInstance?.id)`.

### 3.4 `src/context-menu.tsx` — `ContextMenuTrigger`

- `instance` state and `setElement` already exist.
- Replace `const [focused, setFocused] = useState(autoFocus && !disabled)` with
  `const [focused, setFocused] = useFocusState(autoFocus, disabled, instance?.id)`.
- Keep the composed handlers; `setElement` already merges the caller's ref.

### 3.5 `src/command-menu.tsx` — `CommandMenuInput`

- Import `PublicInstance`, `useCallback`, `useState`, `useMergedRef` (not needed —
  the field has no caller ref), and `useFocusState`.
- Hold `instance` in state; wrap the context's `registerInput`:
  ```tsx
  const attach = useCallback(
    (next: PublicInstance | null) => {
      setInstance(next ?? undefined);
      registerInput(next);
    },
    [registerInput],
  );
  ```
- Replace `const [focused, setFocused] = useState(true)` with
  `const [focused] = useFocusState(true, false, instance?.id)` and use
  `ref={attach}`. Delete the `onFocus`/`onBlur` handlers: the sample replaces
  them and there is no caller handler to compose. The `true` seed is intentional —
  the dialog's `initialFocus` focuses the field after React's effects (plan 589),
  and `useFocusState` keeps the seed only until a host is reported.
- Update the comment above the field to name the sample.

### 3.6 `src/tag-input.tsx` — the group ring

- Context: keep `setFocused` (the `autoFocus` seed) and add
  `registerField: (instance: PublicInstance | null) => void`.
- Root: `const [qualifiedFieldId, setFieldId] = useState<number | null>(null)`,
  `const focusedId = useNativeFocusId(!disabled)`, and derive the ring:
  ```tsx
  const groupFocused =
    !disabled && (focusedId === null ? focused : focusedId === fieldId);
  ```
  (`focused` is the existing seed state set by the field's `autoFocus` layout
  effect; keep that effect so the seeded case stays synchronous.)
- `TagInputField`: destructure `ref`, hold its own `instance`, and register it:
  `const setField = useMergedRef(attachField, ref)` where `attachField` sets the
  instance and calls the context's `registerField`; pass `ref={setField}`.
  Remove the `setFocused(...)` calls from its focus/blur handlers (the seed is
  the only thing that state is for now); keep calling the caller's handlers.

### 3.7 `src/mention-input.tsx` — the group ring

- Destructure `ref` from `MentionInputProps`; hold the input `instance` in state
  and merge the caller's ref with `useMergedRef`; pass it as the input's `ref`.
- Replace `const [focused, setFocused] = useState(autoFocus && !disabled)` with
  `const [focused, setFocused] = useFocusState(autoFocus, disabled, instance?.id)`.
- Remove the `setFocused(...)` calls in the field's focus/blur handlers; keep the
  caller's handler calls. The `autoFocus` case stays synchronous through the
  seed.

### 3.8 `src/time-picker.tsx` — the root group ring and a segment's public state

- Context: replace `setFocused` with
  `registerSegment: (segment: TimeSegment, instance: PublicInstance | null) => void`.
- Root: keep a ref `segmentIds = useRef<{ hours?: number; minutes?: number }>({})`,
  call `const focusedId = useNativeFocusId(!disabled)` once, and derive
  ```tsx
  const focused =
    !disabled &&
    focusedId !== null &&
    (focusedId === segmentIds.current.hours ||
      focusedId === segmentIds.current.minutes);
  ```
  Remove the `focused` state and the `setFocused` calls.
- `TimePickerSegment`: hold `instance` state; a stable ref callback sets it and
  calls `registerSegment(segment, next)`; pass `ref` in the `InputProps` object;
  replace `const [focused, setFocusedSegment] = useState(false)` with
  `const [focused] = useFocusState(false, disabled, instance?.id)`. Keep
  `normalize()` in `onBlur` and delete the two `setFocused(...)` calls.
- `TimePickerClear` is unchanged (plan 754).

## 4. Test plan

Every test lives beside its suite; add the case to the existing file and extend
that file's header comment with the bug it guards. Use `until` from
`./internal/interaction.js` whenever the assertion follows a sampled read.

| file | new case | count |
| ---- | -------- | ----- |
| `src/behaviour/breadcrumb.test.tsx` | `paints the focus ring on a natively focused link` — `focusElement(projects)`, `until` ring defined, equal `focusRing(darkTheme).boxShadow` | 13 → 14 |
| `src/behaviour/breadcrumb.test.tsx` | `clears a seeded link ring when focus moves elsewhere` — `autoFocus` link + sibling `elsewhere`; `focusElement(elsewhere)`, `until` ring `undefined` | 14 → 15 |
| `src/behaviour/chat.test.tsx` | `paints the ring when native focus reaches the composer` — no `autoFocus`; `focusElement(composer)`, `until` ring defined | 12 → 13 |
| `src/behaviour/inline-edit.test.tsx` | `paints the display's ring on native focus` — no `autoFocus`; `focusElement(name)`, `until` ring defined | 19 → 20 |
| `src/behaviour/context-menu.test.tsx` | `paints the trigger's ring on native focus` — `focusElement(trigger)`, `until` ring defined | 24 → 25 |
| `src/behaviour/command-menu.test.tsx` | `drops the input's ring when native focus leaves` — render a sibling `elsewhere` beside an open palette in one container `div`; `focusElement(elsewhere)`, `until` `command-input` ring `undefined` | 25 → 26 |
| `src/behaviour/tag-input.test.tsx` | `paints the group ring when native focus reaches the field` — no `autoFocus`; `focusElement(tag-field)`, `until` `tags` ring defined | 16 → 17 |
| `src/behaviour/mention-input.test.tsx` | `paints the group ring when native focus reaches the field` — no `autoFocus`; `focusElement(mention)`, `until` `mention-group` ring defined | 18 → 19 |
| `src/behaviour/time-picker.test.tsx` | `paints the group ring on a natively focused segment` — `focusElement(time-picker-hours)`, `until` `time-picker` ring defined; then `focusElement(minutes)` still defined; then a sibling `elsewhere` clears it | 14 → 15 |

Rules for the fixtures:

- One root per test; wrap sibling roots in a container `div` (the renderer keeps
  one root child).
- Locate elements by `testId`, never by index.
- `CommandMenu` is controlled: `open actions={[ ]} onOpenChange={() => {}}`; it
  has no `defaultOpen`.
- `DatePicker` needs `<DatePickerCalendar />` inside `<DatePickerContent>`; not
  used by these tests.

### Both-direction proof

After the source changes and the tests pass:

```sh
git stash push -- src/breadcrumb.tsx src/chat.tsx src/inline-edit.tsx \
  src/context-menu.tsx src/command-menu.tsx src/tag-input.tsx \
  src/mention-input.tsx src/time-picker.tsx
nub run test:behaviour breadcrumb chat inline-edit context-menu command-menu tag-input mention-input time-picker
git stash pop
```

Expected before the fix: the nine new cases fail (the seeded-ring case is the
second breadcrumb case); every other case in those eight files passes, except the
recorded `mention-input > composes the caller's field handlers` plan-540 red.
Expected after: eight files green apart from that one recorded red.

## 5. Docs, inventory and records

- `packages/components/docs/{breadcrumb,chat,inline-edit,context-menu,command-menu,tag-input,mention-input,time-picker}.mdx`:
  - update the `## Verification` count to the number in §4;
  - replace the stale sentence "… then follows React `focus`/`blur`, so a ring may
    not paint when focus moves by code" with the shipped rule (the part samples
    the renderer's focused host while enabled; the `autoFocus` seed stands only
    until a host is reported);
  - for `tag-input.mdx`, `mention-input.mdx` and `time-picker.mdx`, delete the
    "group may not ring when focus reaches the field" limitation.
- `COMPONENTS.md`: update the eight Tier 2 rows' test counts and their focus
  notes; extend the "A focus ring needs a focus signal" paragraph (lines 88–114)
  with the new parts; add the measured DatePicker external-focus note to the
  Date pickers row.
- `docs/component-api.md` §5: add `BreadcrumbLink`, the Chat composer, the
  InlineEdit display, `CommandMenuInput`, `ContextMenuTrigger` and the three
  group rings to the sampled list; delete the claim that any ring owner still
  relies on React focus alone.
- `TODO.md` → Tier 2 hardening: tick a line for plan 755 with the measured
  numbers.
- `PLAN.md` D30: append `755` as this workstream's next claimed number.
- `.agents/slop/plans/README.md`: add the 755 row (status `done`) and remove the
  limitation sentence from plan 754's row only if it is still accurate for 754's
  own scope — it is, so leave 754's text alone; 755's row records the closing
  change.

## 6. Commands and expected results

Run from `packages/components` unless stated:

| command | expected |
| ------- | -------- |
| `nub run test:behaviour zz-probe` (scratch, before deleting) | 10 failed — the measurement in §1 |
| `nub run test:behaviour breadcrumb chat inline-edit context-menu command-menu tag-input mention-input time-picker` | all new cases fail at `HEAD` for their recorded reason; after the fix, green apart from the recorded mention handler case |
| `git stash push -- <the eight sources>` then the same scoped run, then `git stash pop` | the nine new cases fail without the fix (both directions) |
| `nub run check` | exit 0 (inventory/doc-count checks included) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0; unit count grows by no test (no pure logic changes) |
| `nub run test:behaviour` (end-of-task, cross-cutting) | record passed/failed/total; every failure must be one of the recorded plan-540 classes; expected total 973 with 20 failures, 953 passing (964 + 9), unless a recorded red is also fixed |
| `rm src/behaviour/zz-probe.test.tsx` | the scratch probe never reaches a commit |

## 7. STOP conditions

Stop and report with evidence if any of these happen:

- `getFocusedElementId()` does not report a part's host after `focusElement` —
  report the binding; do not fake the ring.
- A part's host id changes every render, so the comparison never holds — the
  ref callback is unstable; fix the callback, do not move the ring to a wrapper.
- A group registration arrives after the first sample and never re-renders the
  root — report it; the sample must re-render every 50 ms while enabled.
- The `autoFocus` seed no longer paints synchronously in the tag, mention, chat
  or inline-edit suites — keep the seed; do not weaken those tests to `until`.
- A previously green case outside these eight files turns red.
- A new case cannot be made to fail at `HEAD` — a test that cannot fail is not a
  test.

## 8. Acceptance

- All eight parts paint a ring when native focus reaches them and clear it when
  focus leaves; the Command menu input no longer keeps a stale ring; the three
  group rings follow the focused field/segment.
- Nine new native cases, proven to fail without the source change.
- Docs, `COMPONENTS.md`, `docs/component-api.md`, `TODO.md`, `PLAN.md` D30 and the
  plan index are synced; every stated count is the suite's real count.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the full native
  suite shows no new failure class.
- Committed on `agent/components` and pushed (never to `master`).

## 9. Result (filled when done)

_Not started._
